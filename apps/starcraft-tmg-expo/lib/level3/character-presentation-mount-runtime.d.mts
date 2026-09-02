export interface StarcraftTmgCharacterFrameRef {
  frameId: string;
  role: "neutral" | "blink" | "speaking" | "warning" | "reflect";
  contentHash: string;
  width: number;
  height: number;
  mimeType: "image/png";
}

export interface StarcraftTmgCharacterPersonaOption {
  kind: "persona";
  slotIndex: number;
  worldbookId: string;
  title: string;
  personaState: string;
  timeline: { start: string; end: string };
  knowledgeRank: number;
  spoilerRank: number;
  selected: boolean;
  selectable: boolean;
  disabledReason: string | null;
  thumbnailFrame: StarcraftTmgCharacterFrameRef;
  optionHash: string;
}

export interface StarcraftTmgCharacterLockedOption {
  kind: "locked";
  slotIndex: number;
  selected: false;
  selectable: false;
  disabledReason: "spoiler_or_knowledge_ceiling";
  optionHash: string;
}

export interface StarcraftTmgDevelopmentCharacterProjection {
  schemaVersion: "starcraft_tmg_client_character_projection_v2";
  releaseChannel: "development_internal";
  principalScopeHash: string;
  character: {
    characterId: string;
    displayName: string;
    productRole: "tactical_adjutant";
    productRoleIsCanon: false;
  };
  selector: {
    schemaVersion: string;
    catalogueHash: string;
    stateHash: string;
    revision: number;
    connectivity: "online" | "offline";
    selectionMode: "exactly_one";
    capacityPolicy: string;
    spoilerCeilingRank: number;
    knowledgeCeilingRank: number;
    fullCatalogueRevealed: boolean;
    options: ReadonlyArray<StarcraftTmgCharacterPersonaOption | StarcraftTmgCharacterLockedOption>;
    selectedPersonaWorldbookId: string;
    selectorViewHash: string;
  };
  portrait: {
    schemaVersion: string;
    kind: "dynamic_development";
    mode: "tutor" | "opponent" | "commentator" | "companion";
    phase: "idle" | "listening" | "thinking" | "speaking" | "waiting_confirmation" | "error";
    visualCue: string;
    stateHash: string;
    revision: number;
    manifestHash: string;
    frameRegistry: ReadonlyArray<StarcraftTmgCharacterFrameRef>;
    frameSchedule: ReadonlyArray<{
      role: StarcraftTmgCharacterFrameRef["role"];
      durationMs: number;
      frameId: string;
      contentHash: string;
    }>;
    scheduleHash: string;
    assetDelivery: {
      schemaVersion: "starcraft_tmg_character_asset_delivery_v1";
      scheme: "same_origin_content_hash_opaque_hmac_query";
      routeTemplate: string;
      queryParameter: "grant";
      grantToken: string;
      issuedAt: string;
      expiresAt: string;
      contentSetHash: string;
    };
    portraitViewHash: string;
  };
  rights: Record<string, unknown> & { assetDeliveryAllowed: true };
  bindings: Record<string, unknown> & { bindingHash: string };
  capabilities: {
    selectPersona: true;
    setSpoilerAccess: true;
    runProvider: false;
    applyRoomAction: false;
    generateSkill: false;
    createTrainingTruth: false;
  };
  trainingTruth: false;
  projectionHash: string;
}

export interface StarcraftTmgPublicCharacterProjection {
  schemaVersion: "starcraft_tmg_client_character_projection_v2";
  releaseChannel: "public";
  principalScopeHash: string;
  fallback: {
    kind: "asset_free_neutral_adjutant";
    label: string;
    asset: null;
    dynamic: false;
  };
  rights: Record<string, unknown> & { assetDeliveryAllowed: false };
  capabilities: Record<string, false>;
  trainingTruth: false;
  projectionHash: string;
}

export type StarcraftTmgCharacterProjection =
  | StarcraftTmgDevelopmentCharacterProjection
  | StarcraftTmgPublicCharacterProjection;

export interface StarcraftTmgVisibleCharacterFrame {
  schemaVersion: string;
  kind: "fallback" | "derived_development";
  label: string;
  contentHash: string | null;
  role: StarcraftTmgCharacterFrameRef["role"] | null;
  durationMs: number;
  frameIndex: number;
  frameCount: number;
  shouldAnimate: boolean;
  generationKey: string;
  trainingTruth: false;
}

export const STARCRAFT_TMG_CHARACTER_PRESENTATION_MOUNT_VERSION: string;

export function resolveStarcraftTmgCharacterPortraitAssetUriV2(
  projection: StarcraftTmgCharacterProjection,
  contentHash: string,
  options?: { assetOrigin?: string },
): string | null;

export function projectStarcraftTmgVisibleCharacterFrameV2(input: {
  projection: StarcraftTmgCharacterProjection;
  active?: boolean;
  reducedMotion?: boolean;
  frameIndex?: number;
}): StarcraftTmgVisibleCharacterFrame;

export function createStarcraftTmgVisiblePortraitPlayerV2(options?: {
  setTimeoutImpl?: typeof setTimeout;
  clearTimeoutImpl?: typeof clearTimeout;
}): {
  start(
    input: {
      projection: StarcraftTmgCharacterProjection;
      active?: boolean;
      reducedMotion?: boolean;
    },
    listener: (frame: StarcraftTmgVisibleCharacterFrame) => void,
  ): () => void;
  stop(): void;
  markLoaded(input: { generationKey: string; contentHash: string }): boolean;
  markFailed(input: { generationKey: string; contentHash: string }): boolean;
  read(): {
    schemaVersion: string;
    mounted: boolean;
    timerCount: number;
    generation: number;
    frame: StarcraftTmgVisibleCharacterFrame | null;
    failed: boolean;
    trainingTruth: false;
  };
};
