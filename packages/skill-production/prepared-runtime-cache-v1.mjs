// Process-local cache for already content-attested runtime identities.
// Callers must attest content before lookup. Task/context/outputs are not cached.
export function createPreparedRuntimeCacheV1({ maximumEntries = 4 } = {}) {
  if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1 || maximumEntries > 32)
    throw new TypeError('Prepared runtime cache size is invalid');
  const entries = new Map();
  return Object.freeze({
    async get(identity, prepare) {
      if (typeof identity !== 'string' || !/^[a-f0-9]{64}$/u.test(identity) || typeof prepare !== 'function')
        throw new TypeError('Prepared runtime cache requires a content identity and initializer');
      let entry = entries.get(identity);
      if (entry) {
        entries.delete(identity); entries.set(identity, entry);
        return await entry.promise;
      }
      entry = { settled: false, promise: null };
      entry.promise = Promise.resolve().then(prepare);
      entries.set(identity, entry);
      try {
        const result = await entry.promise;
        entry.settled = true;
        // Never evict an in-flight initialization and create a duplicate of it.
        // At most maximumEntries completed runtimes are retained; active callers
        // keep their own references, so eviction cannot interrupt a session.
        for (const [key, value] of entries) {
          if (entries.size <= maximumEntries) break;
          if (value.settled && key !== identity) entries.delete(key);
        }
        return result;
      } catch (error) {
        if (entries.get(identity) === entry) entries.delete(identity);
        throw error;
      }
    },
  });
}
