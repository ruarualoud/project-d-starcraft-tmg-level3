export const STARCRAFT_TMG_CLIENT_LIFECYCLE_VERSION = "starcraft_tmg_client_lifecycle_v1";

const VISIBILITY = new Set(["active", "inactive", "background"]);

function normalizedSnapshot(input = {}) {
  const visibility = VISIBILITY.has(input.visibility) ? input.visibility : "active";
  return Object.freeze({
    schemaVersion: STARCRAFT_TMG_CLIENT_LIFECYCLE_VERSION,
    online: input.online !== false,
    visibility,
  });
}

export function assertStarcraftTmgLifecyclePort(port) {
  for (const method of ["read", "subscribe"]) {
    if (!port || typeof port[method] !== "function") throw new TypeError(`LifecyclePort.${method} is required`);
  }
  return port;
}

export function createInMemoryStarcraftTmgLifecycleAdapter(initial = {}) {
  let snapshot = normalizedSnapshot(initial);
  const listeners = new Set();
  function read() {
    return snapshot;
  }
  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("lifecycle listener must be a function");
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function emit(next = {}) {
    snapshot = normalizedSnapshot({ ...snapshot, ...next });
    for (const listener of [...listeners]) listener(snapshot);
    return snapshot;
  }
  return Object.freeze({ read, subscribe, emit });
}

export function createBrowserStarcraftTmgLifecycleAdapter(options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const windowRef = options.windowRef || globalThis.window;
  const navigatorRef = options.navigatorRef || globalThis.navigator;
  if (!documentRef || !windowRef) throw new TypeError("browser document and window are required");
  const read = () => normalizedSnapshot({
    online: navigatorRef?.onLine !== false,
    visibility: documentRef.visibilityState === "hidden" ? "background" : "active",
  });
  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("lifecycle listener must be a function");
    const emit = () => listener(read());
    documentRef.addEventListener("visibilitychange", emit);
    windowRef.addEventListener("online", emit);
    windowRef.addEventListener("offline", emit);
    return () => {
      documentRef.removeEventListener("visibilitychange", emit);
      windowRef.removeEventListener("online", emit);
      windowRef.removeEventListener("offline", emit);
    };
  }
  return Object.freeze({ read, subscribe });
}

export function createExpoStarcraftTmgLifecycleAdapter(options = {}) {
  const appState = options.appState;
  if (!appState || typeof appState.addEventListener !== "function") throw new TypeError("Expo AppState adapter is required");
  const readOnline = typeof options.readOnline === "function" ? options.readOnline : () => true;
  const subscribeOnline = typeof options.subscribeOnline === "function" ? options.subscribeOnline : null;
  const read = () => normalizedSnapshot({
    online: readOnline() !== false,
    visibility: appState.currentState === "active"
      ? "active"
      : appState.currentState === "inactive" ? "inactive" : "background",
  });
  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("lifecycle listener must be a function");
    const appStateSubscription = appState.addEventListener("change", () => listener(read()));
    const networkUnsubscribe = subscribeOnline ? subscribeOnline(() => listener(read())) : null;
    return () => {
      appStateSubscription?.remove?.();
      networkUnsubscribe?.();
    };
  }
  return Object.freeze({ read, subscribe });
}
