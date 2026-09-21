import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";

/**
 * Zeratul dynamic communication-portrait STATE CONTRACT (presentation-only)
 * — Ticket 26 / Slice 266b SS-1.
 *
 * Six-state shape shared with the other companion contracts; frame bindings
 * are the REAL committed audit-admitted keyframes (idle-v2 identity baseline
 * plus five v3 state keyframes) recorded in
 * `docs/ticket-26-slice-266-official-companion-visual-audit-v1-2026-09-21.md`
 * (every contentHash re-verified against the on-disk file on 2026-09-22).
 * Admission covers one static keyframe per state; continuous animation is NOT
 * proven and this contract must never be consumed as a playable sequence.
 */

const CHARACTER_ID = "starcraft.zeratul";
const VERSION = "1.0.0-presentation.1";
const AUDIT_REF = "docs/ticket-26-slice-266-official-companion-visual-audit-v1-2026-09-21.md";

const STYLE_PROFILE = Object.freeze({
  styleProfileId: "starcraft-zeratul-sc1-comms-highres-2d-v1",
  modelAnchor: "Nerazim dark prelate: elongated skull, luminous green eyes, purple face mask, metal shoulder armor and nerve cords",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "elongated hairless skull with luminous green eyes and purple face mask",
    "metal shoulder armor silhouette and trailing nerve cords",
    "deep violet, shadow green, bone and cold cyan palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "human mouth, lips or phoneme animation",
    "new wounds, scars or equipment changes between states",
    "anime or manga facial design",
    "low-resolution pixel blocking or glossy AI concept-art finish",
    "purple-magenta neon overflow, text, logo, watermark, or copied franchise UI chrome",
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
    reducedMotion: "static raised-head frame; mask never opens, no phoneme cycle",
    deterministicFallback: "neutral frame with speaking phase label",
  },
  {
    stateId: "listening",
    frameRole: "blink",
    phase: "listening",
    trigger: "human is composing or a room event is streaming",
    reducedMotion: "static inclined-head frame; blink cycle disabled",
    deterministicFallback: "neutral frame with listening phase label",
  },
  {
    stateId: "alert_combat",
    frameRole: "warning",
    phase: "waiting_confirmation",
    trigger: "pending human confirmation or a threat-overlay escalation is visible",
    reducedMotion: "static forward-pressed frame; no double flash",
    deterministicFallback: "neutral frame with warning border chrome",
  },
  {
    stateId: "damaged_concerned",
    frameRole: "warning",
    phase: "error",
    trigger: "own-side setback visible in the player-visible projection, or session error state",
    reducedMotion: "static recoiled frame; no sync-loss animation",
    deterministicFallback: "neutral frame with subdued luma chrome",
  },
  {
    stateId: "reflective",
    frameRole: "reflect",
    phase: "thinking",
    trigger: "reflect intent turn in progress",
    reducedMotion: "static bowed-head frame; no gaze pulse",
    deterministicFallback: "neutral frame with reflective phase label",
  },
]);

const FRAME_FILES = Object.freeze({
  idle: { file: "idle-v2.png", contentHash: "a0a07788bae197979542a5ac02da370a23d09ca5e8bd54d19d7bf56ac47f80ba" },
  speaking: { file: "speaking-v3.png", contentHash: "9470436399bd495060c30cccd4f002470214713ceb980d2ff30bbe52d81a8738" },
  listening: { file: "listening-v3.png", contentHash: "461d86bc3bb602fcef1e3b1c3ed7a251732bb6685429ee1f579f1b0696895a3a" },
  alert_combat: { file: "alert-combat-v3.png", contentHash: "807eece5b0eb4ef37497e2872089cb9857f1e9df58b34b3c4e328d23e074c28e" },
  damaged_concerned: { file: "damaged-concerned-v3.png", contentHash: "f8fdf78c3ec51752f470bf44db2ef31d97d837c33217027c1bd18ea92acd9ed6" },
  reflective: { file: "reflective-v3.png", contentHash: "8f2c3f7754c2182d21d694364459629e5b35ef23f4917bf54dff692b3923738f" },
});

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.zeratul.portrait-states.v1",
  characterId: CHARACTER_ID,
  version: VERSION,
  presentationOnly: true,
  styleProfile: STYLE_PROFILE,
  states: STATES,
  animationStatus: "keyframe_only_continuous_animation_not_proven",
  frameBindings: STATES.map((state) => ({
    stateId: state.stateId,
    frameRole: state.frameRole,
    assetRef: `assets/characters/zeratul-adjutant/${FRAME_FILES[state.stateId].file}`,
    contentHash: FRAME_FILES[state.stateId].contentHash,
    admissionClass: "audit_admitted_static_keyframe",
    admissionRef: AUDIT_REF,
    generationReceiptHash: null,
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

export const ZERATUL_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
