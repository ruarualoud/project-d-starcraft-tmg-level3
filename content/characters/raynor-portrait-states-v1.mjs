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
 * six communication states required by the Slice 265 brief. Raster frames
 * are NOT generated here: every frame binding is `PENDING_CODEX_GENERATION`
 * with an exact brief in
 * `docs/ticket-26-slice-265-k3-portrait-generation-briefs-v1-2026-09-21.md`.
 * Until Codex's image tool produces receipted frames, the UI renders the
 * deterministic neutral-fallback presentation — never a fabricated asset.
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

const unsigned = {
  schemaVersion: "starcraft_tmg_companion_portrait_state_contract_v1",
  contractId: "starcraft-tmg.raynor.portrait-states.v1",
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
    generationBriefId: `raynor.${state.stateId}.frame-brief`,
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

export const RAYNOR_PORTRAIT_STATE_CONTRACT_V1 = Object.freeze({
  ...unsigned,
  stateContractHash: hashStarcraftTmgClientContract(unsigned),
});
