import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";

/**
 * Zagara dynamic communication-portrait STATE CONTRACT (presentation-only)
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

const CHARACTER_ID = "starcraft.zagara";
const VERSION = "1.0.0-presentation.1";
const AUDIT_REF = "docs/ticket-26-slice-266-official-companion-visual-audit-v1-2026-09-21.md";

const STYLE_PROFILE = Object.freeze({
  styleProfileId: "starcraft-zagara-sc1-comms-highres-2d-v1",
  modelAnchor: "Zerg broodmother: central blade crown, bilateral fan head plates, shoulder projections, segmented tendrils and existing mandibles",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "central blade crown with bilateral fan head plates and shoulder armor projections",
    "segmented tendrils and the existing mandible topology (never added or removed)",
    "chitin purples, bone and amber palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "human lips, teeth or phoneme mouthparts",
    "new wounds, stains or equipment between states",
    "anime or manga facial design",
    "low-resolution pixel blocking or glossy AI concept-art finish",
    "text, logo, watermark, or copied franchise UI chrome",
  ],
});

const STATES = Object.freeze([
  {
    stateId: "idle",
    frameRole: "neutral",
    phase: "idle",
    trigger: "no active utterance; default resting state",
    reducedMotion: "single neutral frame with static scanline overlay; no breath cycle",
    deterministicFallback: "original_neutral_adjutant_placeholder_with_zerg_chrome",
  },
  {
    stateId: "speaking",
    frameRole: "speaking",
    phase: "speaking",
    trigger: "companion message is being rendered",
    reducedMotion: "static speaking frame; existing mandibles only, no phoneme cycle",
    deterministicFallback: "neutral frame with speaking phase label",
  },
  {
    stateId: "listening",
    frameRole: "blink",
    phase: "listening",
    trigger: "human is composing or a room event is streaming",
    reducedMotion: "static turned-head frame; no tendril sway loop",
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
    reducedMotion: "static lowered-head frame; no gaze pulse",
    deterministicFallback: "neutral frame with reflective phase label",
  },
]);

const FRAME_FILES = Object.freeze({
  idle: { file: "idle-v2.png", contentHash: "909339fa55bde0d4a2ce256bbddfb519baf7eacd814a0deab5bb19f96aabc36e" },
  speaking: { file: "speaking-v3.png", contentHash: "511b8531935efff11bc828cb154d9609fe248e66ddb7b7330319d90c6ed4e9f0" },
  listening: { file: "listening-v3.png", contentHash: "e2b83b61a45fc148549efb902be5843e3868662408c73c4f118f06c156e624a1" },
  alert_combat: { file: "alert-combat-v3.png", contentHash: "c40a4f2a1a901acdd6368d3ac0cb5fd832ffc73fc8cdf6db65e6f4242072ad00" },
  damaged_concerned: { file: "damaged-concerned-v3.png", contentHash: "b239e87268f4cc00ae32f5eba31211e0367458f6287e4f6fe62cc49d146b8f88" },
  reflective: { file: "reflective-v3.png", contentHash: "2dbe9b192ba91168037804447e804e3dd051cb3cf27ada0d8e11a7e63479a3db" },
});

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.zagara.portrait-states.v1",
  characterId: CHARACTER_ID,
  version: VERSION,
  presentationOnly: true,
  styleProfile: STYLE_PROFILE,
  states: STATES,
  animationStatus: "keyframe_only_continuous_animation_not_proven",
  frameBindings: STATES.map((state) => ({
    stateId: state.stateId,
    frameRole: state.frameRole,
    assetRef: `assets/characters/zagara-adjutant/${FRAME_FILES[state.stateId].file}`,
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

export const ZAGARA_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
