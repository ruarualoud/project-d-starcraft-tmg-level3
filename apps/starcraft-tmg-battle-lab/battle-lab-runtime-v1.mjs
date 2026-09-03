import {
  createHttpStarcraftTmgAuthoritativeTransportAdapter,
} from "../../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  projectStarcraftTmgBattleLabObservabilityV1,
} from "../../packages/client-domain/battle-lab-observability-v1.mjs";
import {
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../../packages/client-domain/client-domain-v1.mjs";
import {
  createBrowserStarcraftTmgLifecycleAdapter,
} from "../../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createInMemoryStarcraftTmgProjectionStoreAdapter,
} from "../../packages/client-domain/projection-store-adapters-v1.mjs";

export const STARCRAFT_TMG_BATTLE_LAB_MOUNT_VERSION =
  "starcraft_tmg_battle_lab_mount_v1";

function exactKeys(value, allowed, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error(code), { code });
  }
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw Object.assign(new Error(`${code}:${unknown.sort().join(",")}`), { code });
  }
}

function traceFailureProjection(roomId) {
  return Object.freeze({
    schemaVersion: "starcraft_tmg_agent_trace_projection_v1",
    roomId,
    status: "unavailable:TRACE_PROJECTION_REJECTED",
    generatedAt: null,
    traces: Object.freeze([]),
    trainingTruth: false,
  });
}

/**
 * Mount one browser-only diagnostic surface around the same four-operation
 * Client Domain used by Expo. TraceProjectionPort is optional, read-only, and
 * receives no SeatGrant or Provider credential. Ticket 15 will supply its live
 * room-bound implementation.
 */
export function createStarcraftTmgBattleLabRuntime(options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const windowRef = options.windowRef || globalThis.window;
  const navigatorRef = options.navigatorRef || globalThis.navigator;
  const lifecycle = options.lifecycle || createBrowserStarcraftTmgLifecycleAdapter({
    documentRef,
    windowRef,
    navigatorRef,
  });
  const transport = options.transport || createHttpStarcraftTmgAuthoritativeTransportAdapter({
    baseUrl: String(options.baseUrl || "").replace(/\/+$/u, ""),
    fetchImpl: options.fetchImpl || globalThis.fetch,
    apiPrefix: options.apiPrefix,
    timeoutMs: options.timeoutMs,
  });
  const projectionStore = options.projectionStore
    || createInMemoryStarcraftTmgProjectionStoreAdapter();
  const clientDomain = createStarcraftTmgClientDomain({
    transport,
    projectionStore,
    lifecycle,
    now: options.now,
    createId: options.createId,
  });
  const traceProjectionPort = options.traceProjectionPort || null;
  if (traceProjectionPort && typeof traceProjectionPort.read !== "function") {
    throw new TypeError("TraceProjectionPort.read is required");
  }
  const listeners = new Set();
  let agentTraceProjection = null;
  let surfaceView = projectStarcraftTmgBattleLabObservabilityV1({
    clientView: clientDomain.read(),
  });

  function publish() {
    surfaceView = projectStarcraftTmgBattleLabObservabilityV1({
      clientView: clientDomain.read(),
      agentTraceProjection,
    });
    for (const listener of [...listeners]) {
      try { listener(surfaceView); } catch {
        // Presentation listeners cannot interrupt domain or transport work.
      }
    }
    return surfaceView;
  }

  const unsubscribeDomain = clientDomain.subscribe(() => publish());

  async function refreshTraceProjection() {
    const roomId = clientDomain.read().roomProjection?.room?.roomId || null;
    if (!roomId || !traceProjectionPort) {
      agentTraceProjection = null;
      return publish();
    }
    try {
      // This port deliberately receives a room locator and no credentials.
      // Its server implementation owns access checks and returns safe hashes.
      const candidate = await traceProjectionPort.read({ roomId });
      // Validate before publication. A broken observability Adapter must not
      // turn a successful authoritative operation into a UI-level failure.
      projectStarcraftTmgBattleLabObservabilityV1({
        clientView: clientDomain.read(),
        agentTraceProjection: candidate,
      });
      agentTraceProjection = candidate;
    } catch (error) {
      agentTraceProjection = traceFailureProjection(roomId);
    }
    return publish();
  }

  async function bootstrap(input = {}) {
    try {
      exactKeys(input, ["route", "principal", "locale"], "BATTLE_LAB_BOOTSTRAP_INVALID");
    } catch (error) {
      return Object.freeze({
        ok: false,
        rejection: Object.freeze({
          code: error?.code || "BATTLE_LAB_BOOTSTRAP_INVALID",
          trainingTruth: false,
        }),
        view: read(),
      });
    }
    agentTraceProjection = null;
    const result = await clientDomain.bootstrap({
      route: input.route,
      principal: input.principal || {},
      surface: "battle_lab",
      locale: input.locale || "en",
    });
    await refreshTraceProjection();
    return result;
  }

  function read() {
    return surfaceView;
  }

  async function dispatch(intent) {
    const result = await clientDomain.dispatch(intent);
    await refreshTraceProjection();
    return result;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("listener is required");
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Retain the internal subscription for the runtime lifetime. There is no
  // public destroy method because widening the four-operation surface would
  // fork it from the shared Client Domain contract.
  void unsubscribeDomain;
  const runtime = { bootstrap, read, dispatch, subscribe };
  if (Object.keys(runtime).sort().join("/")
    !== [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort().join("/")) {
    throw new Error("BATTLE_LAB_CLIENT_DOMAIN_INTERFACE_DRIFT");
  }
  return Object.freeze(runtime);
}
