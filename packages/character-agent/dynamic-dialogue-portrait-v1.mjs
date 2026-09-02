import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION =
  "starcraft_tmg_dynamic_dialogue_portrait_v1";

export const STARCRAFT_TMG_DIALOGUE_PORTRAIT_MODES = Object.freeze([
  "tutor",
  "opponent",
  "commentator",
  "companion",
]);

export const STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES = Object.freeze([
  "idle",
  "listening",
  "thinking",
  "speaking",
  "waiting_confirmation",
  "error",
]);

export const STARCRAFT_TMG_DIALOGUE_VISUAL_CUES = Object.freeze([
  "neutral",
  "explain",
  "challenge",
  "announce",
  "reflect",
  "warning",
  "approve",
]);

const MODE_SET = new Set(STARCRAFT_TMG_DIALOGUE_PORTRAIT_MODES);
const PHASE_SET = new Set(STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES);
const CUE_SET = new Set(STARCRAFT_TMG_DIALOGUE_VISUAL_CUES);
const FRAME_ROLES = Object.freeze(["neutral", "blink", "speaking", "warning", "reflect"]);

const CUES_BY_MODE = Object.freeze({
  tutor: Object.freeze(["neutral", "explain", "reflect", "warning", "approve"]),
  opponent: Object.freeze(["neutral", "challenge", "warning", "approve"]),
  commentator: Object.freeze(["neutral", "announce", "reflect", "warning"]),
  companion: Object.freeze(["neutral", "explain", "reflect", "warning", "approve"]),
});

const FRAME_BY_CUE = Object.freeze({
  neutral: "neutral",
  explain: "speaking",
  challenge: "warning",
  announce: "speaking",
  reflect: "reflect",
  warning: "warning",
  approve: "reflect",
});

const MODE_PRESENTATION = Object.freeze({
  tutor: Object.freeze({ frameTone: "muted_command_green", accent: "cool_gray_green", intensity: "calm" }),
  opponent: Object.freeze({ frameTone: "zerg_amber_green", accent: "burnt_amber", intensity: "severe" }),
  commentator: Object.freeze({ frameTone: "neutral_radar_green", accent: "desaturated_amber", intensity: "measured" }),
  companion: Object.freeze({ frameTone: "dim_olive_green", accent: "soft_amber", intensity: "restrained" }),
});

const PHASE_ANIMATION = Object.freeze({
  idle: Object.freeze({
    tokens: Object.freeze(["analog_breath", "natural_double_blink", "rare_eye_glow_flicker", "slow_crt_scan"]),
    frameIntervalMs: 90,
    loop: true,
  }),
  listening: Object.freeze({
    tokens: Object.freeze(["focus_hold", "natural_blink", "single_scan_sweep", "subtle_noise_gate"]),
    frameIntervalMs: 100,
    loop: true,
  }),
  thinking: Object.freeze({
    tokens: Object.freeze(["reflective_gaze_hold", "amber_eye_pulse", "slow_sync_drift", "diagnostic_noise"]),
    frameIntervalMs: 900,
    loop: true,
  }),
  speaking: Object.freeze({
    tokens: Object.freeze(["two_frame_phoneme_cycle", "voice_level_micro_jitter", "analog_breath", "crt_roll"]),
    frameIntervalMs: 180,
    loop: true,
  }),
  waiting_confirmation: Object.freeze({
    tokens: Object.freeze(["confirmation_double_flash", "held_warning_frame", "slow_crt_scan"]),
    frameIntervalMs: 800,
    loop: true,
  }),
  error: Object.freeze({
    tokens: Object.freeze(["horizontal_sync_loss", "brief_signal_dropout", "warning_hold"]),
    frameIntervalMs: 240,
    loop: true,
  }),
});

const EVENT_PHASE = Object.freeze({
  session_created: "idle",
  user_message_received: "listening",
  planning_started: "thinking",
  provider_output_accepted: "speaking",
  confirmation_requested: "waiting_confirmation",
  response_finished: "idle",
  provider_failed: "error",
  reset: "idle",
});

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function sha256(value, field) {
  const normalized = requiredString(value, field).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error(`${field} must be a SHA-256 hex digest`);
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) throw new Error(`${field} must be a positive safe integer`);
  return normalized;
}

function normalizeMode(value) {
  const normalized = requiredString(value, "mode").toLowerCase();
  if (!MODE_SET.has(normalized)) throw new Error(`unsupported dialogue portrait mode: ${normalized}`);
  return normalized;
}

function normalizePhase(value) {
  const normalized = requiredString(value, "phase").toLowerCase();
  if (!PHASE_SET.has(normalized)) throw new Error(`unsupported dialogue portrait phase: ${normalized}`);
  return normalized;
}

function safeAssetPath(value, field) {
  const normalized = requiredString(value, field).replaceAll("\\", "/");
  if (!normalized.startsWith("assets/characters/") || normalized.includes("../") || normalized.startsWith("/")) {
    throw new Error(`${field} must stay below assets/characters`);
  }
  return normalized;
}

function unsignedManifest(value = {}) {
  const { manifestHash: _manifestHash, ...unsigned } = clone(value);
  return unsigned;
}

function unsignedState(value = {}) {
  const { stateHash: _stateHash, ...unsigned } = clone(value);
  return unsigned;
}

export function listStarcraftTmgDialogueVisualCuesV1(modeInput) {
  const mode = normalizeMode(modeInput);
  return CUES_BY_MODE[mode];
}

export function validateStarcraftTmgDialogueVisualCueV1(modeInput, cueInput = "neutral") {
  const mode = normalizeMode(modeInput);
  const cue = requiredString(cueInput || "neutral", "visualCue").toLowerCase();
  if (!CUE_SET.has(cue)) throw new Error(`unsupported visualCue: ${cue}`);
  if (!CUES_BY_MODE[mode].includes(cue)) throw new Error(`visualCue ${cue} is forbidden for ${mode}`);
  return cue;
}

export function createStarcraftTmgDynamicDialoguePortraitManifestV1(input = {}) {
  const characterId = requiredString(input.characterId, "characterId");
  const planHash = sha256(input.planHash, "planHash");
  const frames = (input.frames || []).map((frame, index) => ({
    frameId: requiredString(frame.frameId, `frames[${index}].frameId`),
    role: requiredString(frame.role, `frames[${index}].role`),
    outputPath: safeAssetPath(frame.outputPath, `frames[${index}].outputPath`),
    contentHash: sha256(frame.contentHash, `frames[${index}].contentHash`),
    generationReceiptHash: sha256(frame.generationReceiptHash, `frames[${index}].generationReceiptHash`),
    byteLength: positiveInteger(frame.byteLength, `frames[${index}].byteLength`),
    width: positiveInteger(frame.width, `frames[${index}].width`),
    height: positiveInteger(frame.height, `frames[${index}].height`),
    mimeType: requiredString(frame.mimeType || "image/png", `frames[${index}].mimeType`),
    developmentDisplayAllowed: frame.developmentDisplayAllowed === true,
    publicReleaseAllowed: frame.publicReleaseAllowed === true,
  }));
  if (frames.length !== FRAME_ROLES.length) throw new Error(`frames must contain exactly ${FRAME_ROLES.length} roles`);
  if (new Set(frames.map((frame) => frame.frameId)).size !== frames.length) throw new Error("frames must not repeat frameId");
  for (const role of FRAME_ROLES) {
    const matches = frames.filter((frame) => frame.role === role);
    if (matches.length !== 1) throw new Error(`frames must contain exactly one ${role} frame`);
  }
  for (const frame of frames) {
    if (!FRAME_ROLES.includes(frame.role)) throw new Error(`unsupported frame role: ${frame.role}`);
    if (frame.width !== frame.height) throw new Error(`${frame.frameId} must be square`);
    if (frame.publicReleaseAllowed) throw new Error(`${frame.frameId} cannot be public before independent rights review`);
  }
  const logicalResolution = positiveInteger(input.logicalResolution || 640, "logicalResolution");
  if (logicalResolution < 320 || logicalResolution > 1024) {
    throw new Error("logicalResolution must preserve a high-resolution 2D portrait between 320 and 1024 CSS pixels");
  }
  const manifest = {
    schemaVersion: STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION,
    manifestId: requiredString(input.manifestId, "manifestId"),
    version: requiredString(input.version, "version"),
    characterId,
    createdAt: new Date(input.createdAt).toISOString(),
    planHash,
    styleProfileId: requiredString(input.styleProfileId, "styleProfileId"),
    sourceEvidence: clone(input.sourceEvidence || {}),
    rendering: {
      logicalResolution,
      scaling: "high_quality_cover",
      cssImageRendering: "auto",
      appResizeMode: "cover_with_analog_transmission_overlay",
      requiredOverlays: ["fine_crt_scanline", "low_amplitude_noise", "edge_vignette", "subtle_luma_roll"],
      forbiddenOverlays: ["pixel_block_upscale", "anime_bloom", "purple_neon_relight", "skin_beautification", "modern_hud_chrome"],
      reducedMotion: "single_frame_with_static_scanlines",
    },
    frames,
    cuePolicy: clone(CUES_BY_MODE),
    modePresentation: clone(MODE_PRESENTATION),
    phaseAnimation: clone(PHASE_ANIMATION),
    fallback: clone(input.fallback || {
      missingFrameBehavior: "show_labeled_portrait_unavailable",
      publicBehavior: "use_project_d_original_adjutant",
    }),
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
  return deepFreeze({ ...manifest, manifestHash: hashStarcraftTmgContract(manifest) });
}

export function assertStarcraftTmgDynamicDialoguePortraitManifestV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("dialogue portrait manifest must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION) {
    throw new Error("dialogue portrait manifest schemaVersion mismatch");
  }
  const recreated = createStarcraftTmgDynamicDialoguePortraitManifestV1(unsignedManifest(value));
  if (recreated.manifestHash !== value.manifestHash) throw new Error("dialogue portrait manifest integrity mismatch");
  return value;
}

function sealState(input = {}) {
  const state = {
    schemaVersion: `${STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION}.state`,
    characterId: requiredString(input.characterId, "characterId"),
    manifestHash: sha256(input.manifestHash, "manifestHash"),
    mode: normalizeMode(input.mode),
    phase: normalizePhase(input.phase),
    visualCue: validateStarcraftTmgDialogueVisualCueV1(input.mode, input.visualCue || "neutral"),
    revision: Number(input.revision),
    lastEvent: requiredString(input.lastEvent, "lastEvent"),
    updatedAt: new Date(input.updatedAt).toISOString(),
    authority: {
      modeOwner: "server_session_binding",
      phaseOwner: "server_harness",
      cueOwner: input.lastEvent === "provider_output_accepted" ? "validated_model_suggestion" : "server_harness",
      rulesAuthority: false,
      roomMutationAuthority: false,
      trainingTruth: false,
    },
  };
  if (!Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("revision must be a non-negative safe integer");
  return deepFreeze({ ...state, stateHash: hashStarcraftTmgContract(state) });
}

export function assertStarcraftTmgDynamicDialoguePortraitStateV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("dialogue portrait state must be an object");
  if (value.schemaVersion !== `${STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION}.state`) {
    throw new Error("dialogue portrait state schemaVersion mismatch");
  }
  const recreated = sealState(unsignedState(value));
  if (recreated.stateHash !== value.stateHash) throw new Error("dialogue portrait state integrity mismatch");
  return value;
}

export function createStarcraftTmgDynamicDialoguePortraitStateV1(manifestInput, input = {}) {
  const manifest = assertStarcraftTmgDynamicDialoguePortraitManifestV1(manifestInput);
  const mode = normalizeMode(input.mode);
  return sealState({
    characterId: manifest.characterId,
    manifestHash: manifest.manifestHash,
    mode,
    phase: "idle",
    visualCue: "neutral",
    revision: 0,
    lastEvent: "session_created",
    updatedAt: input.updatedAt,
  });
}

export function reduceStarcraftTmgDynamicDialoguePortraitStateV1(manifestInput, stateInput, event = {}) {
  const manifest = assertStarcraftTmgDynamicDialoguePortraitManifestV1(manifestInput);
  const state = assertStarcraftTmgDynamicDialoguePortraitStateV1(stateInput);
  if (state.manifestHash !== manifest.manifestHash || state.characterId !== manifest.characterId) {
    throw new Error("dialogue portrait state does not belong to manifest");
  }
  const eventType = requiredString(event.type, "event.type");
  const phase = EVENT_PHASE[eventType];
  if (!phase) throw new Error(`unsupported dialogue portrait event: ${eventType}`);
  if (event.mode !== undefined && normalizeMode(event.mode) !== state.mode) {
    throw new Error("event cannot change the server-owned dialogue portrait mode");
  }
  let visualCue = state.visualCue;
  if (["session_created", "user_message_received", "planning_started", "response_finished", "reset"].includes(eventType)) {
    visualCue = "neutral";
  } else if (eventType === "provider_failed") {
    visualCue = CUES_BY_MODE[state.mode].includes("warning") ? "warning" : "neutral";
  } else if (eventType === "provider_output_accepted") {
    visualCue = validateStarcraftTmgDialogueVisualCueV1(state.mode, event.visualCue || "neutral");
  }
  return sealState({
    characterId: state.characterId,
    manifestHash: state.manifestHash,
    mode: state.mode,
    phase,
    visualCue,
    revision: state.revision + 1,
    lastEvent: eventType,
    updatedAt: event.occurredAt,
  });
}

function frameScheduleFor(state) {
  const expressionRole = FRAME_BY_CUE[state.visualCue];
  if (state.phase === "idle") {
    return [
      { role: expressionRole, durationMs: 2600 },
      { role: "blink", durationMs: 90 },
      { role: expressionRole, durationMs: 220 },
      { role: "blink", durationMs: 80 },
      { role: expressionRole, durationMs: 4200 },
    ];
  }
  if (state.phase === "listening") {
    return [
      { role: expressionRole, durationMs: 1500 },
      { role: "blink", durationMs: 100 },
      { role: expressionRole, durationMs: 1900 },
    ];
  }
  if (state.phase === "thinking") {
    return [
      { role: "reflect", durationMs: 1600 },
      { role: "blink", durationMs: 90 },
      { role: "reflect", durationMs: 1400 },
      { role: "neutral", durationMs: 700 },
    ];
  }
  if (state.phase === "speaking") {
    const restingRole = expressionRole === "speaking" ? "neutral" : expressionRole;
    return [
      { role: restingRole, durationMs: 190 },
      { role: "speaking", durationMs: 180 },
      { role: restingRole, durationMs: 150 },
      { role: "speaking", durationMs: 190 },
    ];
  }
  if (state.phase === "waiting_confirmation") {
    return [{ role: expressionRole === "neutral" ? "warning" : expressionRole, durationMs: 800 }];
  }
  return [
    { role: "warning", durationMs: 220 },
    { role: "neutral", durationMs: 90 },
    { role: "warning", durationMs: 420 },
  ];
}

export function resolveStarcraftTmgDynamicDialoguePortraitV1(manifestInput, stateInput, input = {}) {
  const manifest = assertStarcraftTmgDynamicDialoguePortraitManifestV1(manifestInput);
  const state = assertStarcraftTmgDynamicDialoguePortraitStateV1(stateInput);
  if (state.manifestHash !== manifest.manifestHash || state.characterId !== manifest.characterId) {
    throw new Error("dialogue portrait state does not belong to manifest");
  }
  const environment = input.environment || "development";
  if (!["development", "public"].includes(environment)) throw new Error(`unsupported environment: ${environment}`);
  const frameSchedule = frameScheduleFor(state);
  const scheduledFrames = frameSchedule.map((entry) => ({
    ...entry,
    frame: manifest.frames.find((frame) => frame.role === entry.role),
  }));
  const displayAllowed = scheduledFrames.every((entry) => environment === "public"
    ? entry.frame.publicReleaseAllowed
    : entry.frame.developmentDisplayAllowed);
  if (!displayAllowed) {
    return deepFreeze({
      ok: false,
      schemaVersion: `${STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION}.view`,
      characterId: state.characterId,
      mode: state.mode,
      phase: state.phase,
      visualCue: state.visualCue,
      environment,
      reason: "portrait_not_releasable_in_environment",
      fallback: clone(manifest.fallback),
      stateHash: state.stateHash,
      manifestHash: manifest.manifestHash,
      trainingTruth: false,
    });
  }
  const animation = manifest.phaseAnimation[state.phase];
  const view = {
    ok: true,
    schemaVersion: `${STARCRAFT_TMG_DYNAMIC_DIALOGUE_PORTRAIT_VERSION}.view`,
    characterId: state.characterId,
    mode: state.mode,
    phase: state.phase,
    visualCue: state.visualCue,
    environment,
    frames: [...new Map(scheduledFrames.map((entry) => [entry.frame.frameId, entry.frame])).values()].map((frame) => clone(frame)),
    frameSequence: frameSchedule.map((entry) => entry.role),
    frameSchedule: scheduledFrames.map((entry) => ({
      role: entry.role,
      durationMs: entry.durationMs,
      frameId: entry.frame.frameId,
      outputPath: entry.frame.outputPath,
      contentHash: entry.frame.contentHash,
    })),
    primaryFrame: clone(manifest.frames.find((frame) => frame.role === FRAME_BY_CUE[state.visualCue])),
    animation: clone(animation),
    presentation: clone(manifest.modePresentation[state.mode]),
    rendering: clone(manifest.rendering),
    accessibility: {
      labelKey: `character.kerrigan.portrait.${state.mode}.${state.visualCue}`,
      liveRegion: state.phase === "speaking" ? "polite" : "off",
      reducedMotionUsesSingleFrame: true,
    },
    stateHash: state.stateHash,
    manifestHash: manifest.manifestHash,
    trainingTruth: false,
  };
  return deepFreeze({ ...view, viewHash: hashStarcraftTmgContract(view) });
}
