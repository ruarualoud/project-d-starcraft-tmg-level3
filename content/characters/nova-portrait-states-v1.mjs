import { hashStarcraftTmgClientContract } from
  "../../packages/client-domain/portable-contract-hash-v1.mjs";

/**
 * Nova dynamic communication-portrait STATE CONTRACT (presentation-only)
 * — Ticket 26 / Slice 266b SS-1.
 *
 * Same six-state shape as the Raynor/Artanis contracts, but the frame
 * bindings are REAL: the committed audit-admitted v1 keyframes recorded in
 * `docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md` (every
 * contentHash below was re-verified against the on-disk file on 2026-09-22).
 * Admission covers one static keyframe per state; continuous animation is NOT
 * proven and this contract must never be consumed as a playable sequence.
 */

const CHARACTER_ID = "starcraft.nova_terra";
const VERSION = "1.0.0-presentation.1";
const AUDIT_REF = "docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md";

const STYLE_PROFILE = Object.freeze({
  styleProfileId: "starcraft-nova-sc1-comms-highres-2d-v1",
  modelAnchor: "elite Terran ghost operative: blonde ponytail with front fringe, cold eyes, ear-side comm device, fitted Ghost-style combat suit",
  communicationAnchor: "StarCraft 1998 / Remastered portrait crop, palette, hard light, and analog transmission mood",
  medium: "high-resolution Western science-fiction 2D painted portrait",
  preserve: [
    "blonde ponytail, front fringe, cold eyes and ear-side comm device",
    "fitted Ghost-style combat suit with segmented chest plates, straps and shoulder armor",
    "gunmetal, graphite, faded blue and cold amber palette",
    "controlled brush texture plus fine scanline, noise, vignette, and luma-roll presentation",
  ],
  reject: [
    "anime or manga facial design",
    "low-resolution pixel blocking",
    "modern glossy AI concept-art finish",
    "new wounds, scars, tattoos or equipment changes between states",
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
  idle: { file: "idle-v1.png", contentHash: "b2ac717e1dce78bd95dc1ed22d2a24522e46754047b5890e46ca65bb335cc477" },
  speaking: { file: "speaking-v1.png", contentHash: "cae2e9474306d4e88af98c25eeaee37e9c8aa11d2d8fc9d8d9fb756a3432ea6a" },
  listening: { file: "listening-v1.png", contentHash: "5a72890e1f6c2d5931036cbd498c939ab15d6a36fb3443030d774c583a284633" },
  alert_combat: { file: "alert-combat-v1.png", contentHash: "ab1b267bccef3faa030425ff0f85978186d0f80271a4e9a8e61596839efc5644" },
  damaged_concerned: { file: "damaged-concerned-v1.png", contentHash: "831c968de1649959e3691a053b1ec1404f26195c4744276805d98d45ca2bf5ba" },
  reflective: { file: "reflective-v1.png", contentHash: "30b1a0559a187f2aee68a6938872d69fdad04f79a98c66c0fa08aa05a78686f6" },
});

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.nova.portrait-states.v1",
  characterId: CHARACTER_ID,
  version: VERSION,
  presentationOnly: true,
  styleProfile: STYLE_PROFILE,
  states: STATES,
  animationStatus: "keyframe_only_continuous_animation_not_proven",
  frameBindings: STATES.map((state) => ({
    stateId: state.stateId,
    frameRole: state.frameRole,
    assetRef: `assets/characters/nova-adjutant/${FRAME_FILES[state.stateId].file}`,
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

export const NOVA_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
