import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";

/**
 * Artanis dynamic communication-portrait STATE CONTRACT (presentation-only)
 * — Ticket 26 / Slice 265 SS-3. Same discipline and shape as the Raynor
 * contract; raster frames are PENDING_CODEX_GENERATION with exact briefs in
 * `docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md`.
 */

const CHARACTER_ID = "starcraft.artanis";
const VERSION = "1.0.0-presentation.1";

const STYLE_PROFILE = Object.freeze({
  styleProfileId: "starcraft-artanis-sc1-comms-highres-2d-v1",
  modelAnchor: "Protoss hierarch: elongated hairless head, glowing cyan eyes, gold-accented ceremonial armor collar",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "dignified Protoss facial structure with luminous cyan eyes and psionic glow restraint",
    "gold and deep-blue ceremonial armor collar silhouette",
    "deep blue, burnished gold, bone, and cyan palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "anime or manga facial design",
    "low-resolution pixel blocking",
    "modern glossy AI concept-art finish",
    "human facial anatomy on the Protoss head",
    "purple-magenta neon, text, logo, watermark, or copied franchise UI chrome",
  ],
});

const STATES = Object.freeze([
  {
    stateId: "idle",
    frameRole: "neutral",
    phase: "idle",
    trigger: "no active utterance; default resting state",
    reducedMotion: "single neutral frame with static scanline overlay; eye glow held constant",
    deterministicFallback: "original_neutral_adjutant_placeholder_with_protoss_chrome",
  },
  {
    stateId: "speaking",
    frameRole: "speaking",
    phase: "speaking",
    trigger: "companion message is being rendered",
    reducedMotion: "static speaking frame; no phoneme cycle",
    deterministicFallback: "neutral frame with speaking phase label",
  },
  {
    stateId: "listening",
    frameRole: "blink",
    phase: "listening",
    trigger: "human is composing or a room event is streaming",
    reducedMotion: "static neutral frame; blink cycle disabled",
    deterministicFallback: "neutral frame with listening phase label",
  },
  {
    stateId: "alert_combat",
    frameRole: "warning",
    phase: "waiting_confirmation",
    trigger: "pending human confirmation or a threat-overlay escalation is visible",
    reducedMotion: "static warning frame; no double flash",
    deterministicFallback: "neutral frame with warning border chrome",
  },
  {
    stateId: "damaged_concerned",
    frameRole: "warning",
    phase: "error",
    trigger: "own-side setback visible in the player-visible projection, or session error state",
    reducedMotion: "static frame; no sync-loss animation",
    deterministicFallback: "neutral frame with subdued luma chrome",
  },
  {
    stateId: "reflective",
    frameRole: "reflect",
    phase: "thinking",
    trigger: "reflect intent turn in progress",
    reducedMotion: "static reflect frame; no gaze pulse",
    deterministicFallback: "neutral frame with reflective phase label",
  },
]);

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.artanis.portrait-states.v1",
  characterId: CHARACTER_ID,
  version: VERSION,
  presentationOnly: true,
  styleProfile: STYLE_PROFILE,
  states: STATES,
  frameBindings: STATES.map((state) => ({
    stateId: state.stateId,
    frameRole: state.frameRole,
    assetRef: "PENDING_CODEX_GENERATION",
    contentHash: null,
    generationReceiptHash: null,
    generationBriefId: `artanis.${state.stateId}.frame-brief`,
    briefDocument: "docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md",
  })),
  reducedMotionPolicy: "single_frame_with_static_scanlines_for_every_state",
  fallbackPolicy: {
    missingFrameBehavior: "show_labeled_portrait_unavailable_never_substitute_another_character",
    publicBehavior: "use_project_d_original_adjutant",
  },
  authority: {
    modelMaySuggestVisualCueOnly: true,
    modelMaySelectMode: false,
    modelMaySelectPhase: false,
    modelMaySelectAssetPath: false,
    canOverrideRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const ARTANIS_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
