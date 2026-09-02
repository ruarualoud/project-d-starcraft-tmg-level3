export const STARCRAFT_TMG_PROJECTION_STORE_VERSION = "starcraft_tmg_projection_store_v1";

function safeKey(value) {
  const key = String(value || "");
  if (!/^[a-f0-9]{64}$/.test(key)) throw new TypeError("projection cache key must be a SHA-256 hash");
  return key;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function utf8Length(value) {
  let bytes = 0;
  for (const character of String(value)) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export function assertStarcraftTmgProjectionStorePort(port) {
  for (const method of ["load", "save", "remove"]) {
    if (!port || typeof port[method] !== "function") throw new TypeError(`ProjectionStorePort.${method} is required`);
  }
  return port;
}

export function createInMemoryStarcraftTmgProjectionStoreAdapter(options = {}) {
  const backingMap = options.backingMap || new Map();
  async function load(key) {
    const record = backingMap.get(safeKey(key));
    return record === undefined ? null : clone(record);
  }
  async function save(key, record) {
    backingMap.set(safeKey(key), clone(record));
  }
  async function remove(key) {
    backingMap.delete(safeKey(key));
  }
  return Object.freeze({ load, save, remove });
}

export function createAsyncStorageStarcraftTmgProjectionStoreAdapter(options = {}) {
  const storage = options.asyncStorage;
  for (const method of ["getItem", "setItem", "removeItem"]) {
    if (!storage || typeof storage[method] !== "function") throw new TypeError(`asyncStorage.${method} is required`);
  }
  const namespace = String(options.namespace || "@project-d/starcraft-tmg/client-projection/v1");
  const maxBytes = Math.max(1024, Number(options.maxBytes || 4 * 1024 * 1024));
  const storageKey = (key) => `${namespace}/${safeKey(key)}`;
  async function load(key) {
    const serialized = await storage.getItem(storageKey(key));
    if (serialized === null || serialized === undefined) return null;
    if (utf8Length(serialized) > maxBytes) throw new Error("PROJECTION_CACHE_TOO_LARGE");
    try {
      return JSON.parse(serialized);
    } catch {
      throw new Error("PROJECTION_CACHE_CORRUPT");
    }
  }
  async function save(key, record) {
    const serialized = JSON.stringify(record);
    if (utf8Length(serialized) > maxBytes) throw new Error("PROJECTION_CACHE_TOO_LARGE");
    await storage.setItem(storageKey(key), serialized);
  }
  async function remove(key) {
    await storage.removeItem(storageKey(key));
  }
  return Object.freeze({ load, save, remove });
}
