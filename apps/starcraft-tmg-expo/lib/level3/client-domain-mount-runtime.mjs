import {
  createHttpStarcraftTmgAuthoritativeTransportAdapter,
} from "../../../../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../../../../packages/client-domain/client-domain-v1.mjs";
import {
  createBrowserStarcraftTmgLifecycleAdapter,
  createExpoStarcraftTmgLifecycleAdapter,
  createInMemoryStarcraftTmgLifecycleAdapter,
} from "../../../../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createAsyncStorageStarcraftTmgProjectionStoreAdapter,
} from "../../../../packages/client-domain/projection-store-adapters-v1.mjs";

export const STARCRAFT_TMG_EXPO_CLIENT_MOUNT_VERSION =
  "starcraft_tmg_expo_client_mount_v1";

const PHASE_TO_STATUS = Object.freeze({
  unbound: "room_required",
  binding: "connecting",
  exchanging_access: "connecting",
  loading: "connecting",
  ready: "connected",
  applying: "applying",
  recovering: "recovering",
  offline_read_only: "offline_read_only",
  authentication_required: "authentication_required",
  blocked: "blocked",
  unavailable: "unavailable",
});

function normalizedPlatform(value) {
  return value === "web" ? "web" : "native";
}

function nativeLifecycle(options) {
  if (!options.appState) {
    if (options.allowHeadlessFallback === true) {
      return {
        lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({
          online: options.readOnline?.() !== false,
          visibility: "active",
        }),
        lifecycleKind: "headless_verifier",
      };
    }
    throw new TypeError("Expo AppState is required for a native product mount");
  }
  return {
    lifecycle: createExpoStarcraftTmgLifecycleAdapter({
      appState: options.appState,
      readOnline: options.readOnline,
      subscribeOnline: options.subscribeOnline,
    }),
    lifecycleKind: options.subscribeOnline
      ? "expo_app_state_and_network_signal"
      : "expo_app_state_and_transport_recovery",
  };
}

function webLifecycle(options) {
  if (!options.documentRef || !options.windowRef) {
    if (options.allowHeadlessFallback === true) {
      return {
        lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({
          online: options.navigatorRef?.onLine !== false,
          visibility: "active",
        }),
        lifecycleKind: "headless_verifier",
      };
    }
    throw new TypeError("browser document and window are required for a Web product mount");
  }
  return {
    lifecycle: createBrowserStarcraftTmgLifecycleAdapter({
      documentRef: options.documentRef,
      windowRef: options.windowRef,
      navigatorRef: options.navigatorRef,
    }),
    lifecycleKind: "browser_visibility_and_network_events",
  };
}

export function projectStarcraftTmgExpoConnection(view) {
  const phase = String(view?.phase || "unbound");
  const status = PHASE_TO_STATUS[phase] || "unavailable";
  const lifecycleOnline = view?.lifecycle?.online !== false;
  const lifecycleVisible = view?.lifecycle?.visibility === "active";
  const roomId = view?.locator?.roomId || null;
  const core = {
    schemaVersion: `${STARCRAFT_TMG_EXPO_CLIENT_MOUNT_VERSION}.connection`,
    status,
    messageKey: `level3.connection.${status}`,
    roomId,
    stateRevision: Number.isInteger(Number(view?.roomProjection?.room?.stateRevision))
      ? Number(view.roomProjection.room.stateRevision)
      : null,
    online: lifecycleOnline,
    visible: lifecycleVisible,
    readOnly: status !== "connected",
    canRequestAuthoritativeIntent:
      status === "connected" && lifecycleOnline && lifecycleVisible,
    outcomeUncertain:
      view?.recovery?.authoritativeOutcomeUncertain === true,
    rejectionCode: view?.rejection?.code || null,
    trainingTruth: false,
  };
  return Object.freeze(core);
}

export function projectStarcraftTmgExpoMountStatus(input = {}) {
  const surface = String(input.surface || "");
  if (!new Set(["expo_web", "expo_native"]).has(surface)) {
    throw new TypeError("surface must be expo_web or expo_native");
  }
  const roomId = String(input.route?.roomId || "").trim() || null;
  const requestedVisibility = input.lifecycle?.visibility;
  const lifecycle = {
    online: input.lifecycle?.online !== false,
    visibility: requestedVisibility === "inactive"
      ? "inactive"
      : requestedVisibility === "background"
        ? "background"
        : "active",
  };
  const connection = projectStarcraftTmgExpoConnection({
    phase: roomId ? "binding" : "unbound",
    locator: roomId ? { roomId } : null,
    lifecycle,
    roomProjection: null,
    recovery: { authoritativeOutcomeUncertain: false },
    rejection: null,
  });
  return Object.freeze({
    schemaVersion: `${STARCRAFT_TMG_EXPO_CLIENT_MOUNT_VERSION}.status`,
    surface,
    routeRequired: roomId === null,
    clientDomainInterface: Object.freeze([
      ...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
    ]),
    connection,
    authority: Object.freeze({
      clientOwnsRules: false,
      clientOwnsRoomState: false,
      clientCreatesSeatGrant: false,
      projectionCacheIsAuthority: false,
      trainingTruth: false,
    }),
    trainingTruth: false,
  });
}

/**
 * Compose the platform-specific ports around the one shared Client Domain
 * Module. This file has no React or React Native import, so semantic Web/App
 * parity can be verified with injected platform capabilities in Node.
 */
export function createStarcraftTmgExpoClientRuntime(options = {}) {
  const platform = normalizedPlatform(options.platform);
  if (!options.asyncStorage) {
    throw new TypeError("AsyncStorage is required for the Expo product mount");
  }

  const lifecycleMount = platform === "web"
    ? webLifecycle(options)
    : nativeLifecycle(options);
  const baseUrl = String(options.baseUrl || "").replace(/\/+$/, "");
  const sameOriginWeb = platform === "web" && baseUrl === "";
  const transportConfigured = sameOriginWeb || baseUrl !== "";
  const transport = createHttpStarcraftTmgAuthoritativeTransportAdapter({
    baseUrl,
    fetchImpl: options.fetchImpl,
    apiPrefix: options.apiPrefix,
    timeoutMs: options.timeoutMs,
    enableCharacterPresentation: options.enableCharacterPresentation === true,
  });
  const projectionStore = createAsyncStorageStarcraftTmgProjectionStoreAdapter({
    asyncStorage: options.asyncStorage,
    namespace: options.projectionNamespace,
    maxBytes: options.maxProjectionBytes,
  });
  const clientDomain = createStarcraftTmgClientDomain({
    transport,
    projectionStore,
    lifecycle: lifecycleMount.lifecycle,
    enableCharacterPresentation: options.enableCharacterPresentation === true,
    now: options.now,
    createId: options.createId,
  });

  return Object.freeze({
    schemaVersion: STARCRAFT_TMG_EXPO_CLIENT_MOUNT_VERSION,
    platform,
    surface: platform === "web" ? "expo_web" : "expo_native",
    transportConfigured,
    transportKind: sameOriginWeb
      ? "same_origin_authoritative_http"
      : transportConfigured
        ? "configured_authoritative_http"
        : "native_origin_configuration_required",
    projectionStoreKind: "async_storage_viewer_projection_only",
    lifecycleKind: lifecycleMount.lifecycleKind,
    clientDomain,
    trainingTruth: false,
  });
}
