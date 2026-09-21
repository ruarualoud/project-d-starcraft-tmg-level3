import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";

/**
 * Jim Raynor dynamic communication-portrait STATE CONTRACT (presentation-only)
 * — Ticket 26 / Slice 265 SS-3.
 *
 * Mirrors the Kerrigan pack's portrait contract shape (frame roles
 * neutral/blink/speaking/warning/reflect; phases idle/listening/thinking/
 * speaking/waiting_confirmation/error from
 * `packages/character-agent/dynamic-dialogue-portrait-v1.mjs`) and adds the
 * six communication states required by the Slice 265 brief. Slice 266b binds
 * the REAL committed audit-admitted v1 keyframes recorded in
 * `docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md` (every
 * contentHash re-verified against the on-disk file on 2026-09-22). Admission
 * covers one static keyframe per state; continuous animation is NOT proven
 * and this contract must never be consumed as a playable sequence.
 */

const CHARACTER_ID = "starcraft.jim_raynor";
const VERSION = "1.0.0-presentation.1";

const STYLE_PROFILE = Object.freeze({
  styleProfileId: "starcraft-raynor-sc1-comms-highres-2d-v1",
  modelAnchor: "mature Terran field commander: weathered face, short dark hair, light stubble, marine-issue comm collar",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "mature realistic male face with calm resolve, blue-grey eyes, and weathered skin",
    "military field jacket collar and comm hardware silhouette",
    "olive, gunmetal, faded denim blue, and warm amber palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "anime or manga facial design",
    "low-resolution pixel blocking",
    "modern glossy AI concept-art finish",
    "exaggerated power-armor bulk in a communication portrait crop",
    "text, logo, watermark, or copied franchise UI chrome",
  ],
});

const STATES = Object.freeze([
  {
    stateId: "idle",
    frameRole: "neutral",
    phase: "idle",
    trigger: "no active utterance; default resting state",
    reducedMotion: "single neutral frame with static scanline overlay; no breath or blink cycle",
    deterministicFallback: "original_neutral_adjutant_placeholder_with_terran_chrome",
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

const FRAME_FILES = Object.freeze({
  idle: { file: "idle-v1.png", contentHash: "7ccea1bc8e16851c0c990ac1bccb428accde52ff91172c9e0b46aa395b17f012" },
  speaking: { file: "speaking-v1.png", contentHash: "00b6b055e5172882f3e1d1c0c8312cc3f8335caf3ffabd0bc1715f9b5cd3e5f1" },
  listening: { file: "listening-v1.png", contentHash: "046684054fd26db951b639bb7507db14cc9499c7b474ae42031ec29ffd37175e" },
  alert_combat: { file: "alert-combat-v1.png", contentHash: "dc0b59b6f30d09fb715b513e3fbd9e02d94ad51dd20f642c44356f5f6a5629cf" },
  damaged_concerned: { file: "damaged-concerned-v1.png", contentHash: "a31c350799ecf92340b28d3f64bd93954b7057f308fc8e8369030bcb6616243b" },
  reflective: { file: "reflective-v1.png", contentHash: "cff0f1546988f96a17106aad2b1ddee578c1306b591efa000695c605bd830ace" },
});

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.raynor.portrait-states.v1",
  characterId: CHARACTER_ID,
  version: VERSION,
  presentationOnly: true,
  styleProfile: STYLE_PROFILE,
  states: STATES,
  animationStatus: "keyframe_only_continuous_animation_not_proven",
  frameBindings: STATES.map((state) => ({
    stateId: state.stateId,
    frameRole: state.frameRole,
    assetRef: `assets/characters/raynor-adjutant/${FRAME_FILES[state.stateId].file}`,
    contentHash: FRAME_FILES[state.stateId].contentHash,
    admissionClass: "audit_admitted_static_keyframe",
    admissionRef: "docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md",
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

export const RAYNOR_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
