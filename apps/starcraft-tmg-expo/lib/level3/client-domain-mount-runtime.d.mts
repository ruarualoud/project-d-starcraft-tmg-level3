import type { StarcraftTmgCharacterProjection } from "./character-presentation-mount-runtime.mjs";

export interface StarcraftTmgClientControlView {
  schemaVersion: string;
  status: "unclaimed" | "claimed" | "fenced" | "cleared";
  claimedAt: string | null;
  roomRevision: number | null;
  trainingTruth: false;
}

export interface StarcraftTmgClientView {
  schemaVersion: string;
  clientRevision: number;
  phase: string;
  locator: { roomId: string } | null;
  surface: string | null;
  locale: string | null;
  lifecycle: { schemaVersion: string; online: boolean; visibility: string };
  roomProjection: Record<string, any> | null;
  characterPresentation: StarcraftTmgCharacterProjection | null;
  characterOfflineSnapshot: {
    schemaVersion: "starcraft_tmg_client_character_offline_snapshot_v1";
    releaseChannel: "development_internal" | "public";
    fallbackLabel: string | null;
    selectedPersona: {
      worldbookId: string;
      title: string;
      personaState: string;
      timeline: { start: string; end: string };
      neutralFrame: {
        frameId: string;
        role: "neutral";
        contentHash: string;
        width: number;
        height: number;
        mimeType: "image/png";
      };
    } | null;
    readOnly: true;
    snapshotHash: string;
    trainingTruth: false;
  } | null;
  characterStatus: {
    schemaVersion: "starcraft_tmg_client_character_status_v2";
    status: string;
    rejectionCode: string | null;
    lastSynchronizedAt: string | null;
    readOnly: boolean;
    trainingTruth: false;
  };
  legalSpace: Record<string, any> | null;
  pendingPreview: Record<string, any> | null;
  lastReceipt: Record<string, any> | null;
  replay: Record<string, any> | null;
  integrity: {
    schemaVersion: "starcraft_tmg_client_replay_integrity_latch_v1";
    replayBlocked: boolean;
    reason: string | null;
    blockedAtStateRevision: number | null;
    recoveryPhase: string;
    trainingTruth: false;
  };
  control: StarcraftTmgClientControlView;
  accessReceipt: Record<string, any> | null;
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
  | { type: "preview_parameterized"; domainId: string; parameters: Record<string, unknown> }
  | { type: "confirm_and_apply_preview"; previewId: string }
  | { type: "claim_control" }
  | { type: "issue_invite" }
  | { type: "issue_recovery" }
  | { type: "read_replay" }
  | { type: "revalidate_authority" }
  | { type: "select_character_persona"; personaWorldbookId: string }
  | { type: "set_character_spoiler_access"; enabled: boolean };

export interface StarcraftTmgClientResult {
  ok: boolean;
  outcome?: string;
  rejection?: { code: string; details?: Record<string, unknown> };
  credential?: {
    schemaVersion: "starcraft_tmg_client_ephemeral_access_credential_v1";
    kind: "invite" | "recovery";
    token: string;
    ephemeral: true;
    persistenceAllowed: false;
    trainingTruth: false;
  };
  view: StarcraftTmgClientView;
  [key: string]: unknown;
}

export interface StarcraftTmgClientDomain {
  bootstrap(input: {
    route: { roomId: string };
    principal:
      | Record<string, never>
      | { seatToken: string }
      | { access: { kind: "invite" | "recovery"; token: string } };
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
export function projectStarcraftTmgExpoConnection(view: StarcraftTmgClientView): StarcraftTmgExpoConnection;
export function projectStarcraftTmgExpoMountStatus(input: {
  surface: "expo_web" | "expo_native";
  route?: { roomId?: string };
  lifecycle?: { online?: boolean; visibility?: "active" | "inactive" | "background" };
}): Record<string, unknown>;
export function createStarcraftTmgExpoClientRuntime(options: {
  platform: "web" | "native";
  asyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  };
  appState?: {
    currentState: string;
    addEventListener(type: "change", listener: (state: string) => void): { remove(): void };
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
  enableCharacterPresentation?: boolean;
  now?: () => string;
  createId?: (prefix: string) => string;
}): StarcraftTmgExpoClientRuntime;
