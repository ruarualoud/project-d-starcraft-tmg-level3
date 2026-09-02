export interface StarcraftTmgClientView {
  schemaVersion: string;
  clientRevision: number;
  phase: string;
  locator: { roomId: string } | null;
  surface: string | null;
  locale: string | null;
  lifecycle: { schemaVersion: string; online: boolean; visibility: string };
  roomProjection: Record<string, any> | null;
  legalSpace: Record<string, any> | null;
  pendingPreview: Record<string, any> | null;
  lastReceipt: Record<string, any> | null;
  replay: Record<string, any> | null;
  rejection: { code: string; details?: Record<string, any> } | null;
  recovery: {
    authoritativeOutcomeUncertain: boolean;
    [key: string]: any;
  };
  viewHash: string;
  trainingTruth: false;
}

export type StarcraftTmgClientIntent =
  | { type: "refresh" }
  | { type: "load_legal_space" }
  | { type: "preview_finite"; actionKey: string }
  | {
      type: "preview_parameterized";
      domainId: string;
      parameters: Record<string, unknown>;
    }
  | { type: "confirm_and_apply_preview"; previewId: string }
  | { type: "read_replay" };

export interface StarcraftTmgClientResult {
  ok: boolean;
  outcome?: string;
  rejection?: { code: string; details?: Record<string, unknown> };
  view: StarcraftTmgClientView;
  [key: string]: unknown;
}

export interface StarcraftTmgClientDomain {
  bootstrap(input: {
    route: { roomId: string };
    principal: { seatToken?: string };
    surface: "expo_web" | "expo_native";
    locale: string;
  }): Promise<StarcraftTmgClientResult>;
  read(): StarcraftTmgClientView;
  dispatch(intent: StarcraftTmgClientIntent): Promise<StarcraftTmgClientResult>;
  subscribe(listener: (view: StarcraftTmgClientView) => void): () => void;
}

export interface StarcraftTmgExpoConnection {
  schemaVersion: string;
  status: string;
  messageKey: string;
  roomId: string | null;
  stateRevision: number | null;
  online: boolean;
  visible: boolean;
  readOnly: boolean;
  canRequestAuthoritativeIntent: boolean;
  outcomeUncertain: boolean;
  rejectionCode: string | null;
  trainingTruth: false;
}

export interface StarcraftTmgExpoClientRuntime {
  schemaVersion: string;
  platform: "web" | "native";
  surface: "expo_web" | "expo_native";
  transportConfigured: boolean;
  transportKind: string;
  projectionStoreKind: string;
  lifecycleKind: string;
  clientDomain: StarcraftTmgClientDomain;
  trainingTruth: false;
}

export const STARCRAFT_TMG_EXPO_CLIENT_MOUNT_VERSION: string;

export function projectStarcraftTmgExpoConnection(
  view: StarcraftTmgClientView,
): StarcraftTmgExpoConnection;

export function projectStarcraftTmgExpoMountStatus(input: {
  surface: "expo_web" | "expo_native";
  route?: { roomId?: string };
  lifecycle?: {
    online?: boolean;
    visibility?: "active" | "inactive" | "background";
  };
}): {
  schemaVersion: string;
  surface: "expo_web" | "expo_native";
  routeRequired: boolean;
  clientDomainInterface: readonly [
    "bootstrap",
    "read",
    "dispatch",
    "subscribe",
  ];
  connection: StarcraftTmgExpoConnection;
  authority: {
    clientOwnsRules: false;
    clientOwnsRoomState: false;
    clientCreatesSeatGrant: false;
    projectionCacheIsAuthority: false;
    trainingTruth: false;
  };
  trainingTruth: false;
};

export function createStarcraftTmgExpoClientRuntime(options: {
  platform: "web" | "native";
  asyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  appState?: {
    currentState: string;
    addEventListener(type: "change", listener: (state: string) => void): {
      remove(): void;
    };
  };
  documentRef?: Document;
  windowRef?: Window;
  navigatorRef?: Navigator;
  readOnline?: () => boolean;
  subscribeOnline?: (listener: () => void) => (() => void) | undefined;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  apiPrefix?: string;
  timeoutMs?: number;
  projectionNamespace?: string;
  maxProjectionBytes?: number;
  allowHeadlessFallback?: boolean;
  now?: () => string;
  createId?: (prefix: string) => string;
}): StarcraftTmgExpoClientRuntime;
