import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_MODE_CAPABILITY_VERSION = "starcraft_tmg_mode_capability_v1";

const SHARED_READ_TOOLS = Object.freeze([
  "read_board_state",
  "read_rules_skills",
  "report_ui_or_rules_issue",
]);

const PROFILES = Object.freeze({
  tutor: {
    promptPack: "novice_teacher_prompt",
    visibilityPolicy: "seat_scoped_player_view_v0",
    tools: [...SHARED_READ_TOOLS, "list_legal_actions"],
    outputChannels: ["speech", "teaching"],
    memoryNamespaces: ["room_memory", "teaching_memory", "battle_public_events", "rule_fact"],
    maySelectDecision: false,
    mayPreview: false,
    mayApply: false,
  },
  opponent: {
    promptPack: "opponent_prompt",
    visibilityPolicy: "bound_seat_view_v0",
    tools: [...SHARED_READ_TOOLS, "list_legal_actions", "preview_action"],
    outputChannels: ["decision", "speech"],
    memoryNamespaces: ["room_memory", "episode_memory", "strategy_memory", "battle_public_events", "rule_fact"],
    maySelectDecision: true,
    mayPreview: true,
    mayApply: false,
  },
  commentator: {
    promptPack: "referee_prompt",
    visibilityPolicy: "public_events_only_v0",
    tools: [...SHARED_READ_TOOLS, "read_public_events"],
    outputChannels: ["speech"],
    memoryNamespaces: ["room_memory", "battle_public_events", "rule_fact"],
    maySelectDecision: false,
    mayPreview: false,
    mayApply: false,
  },
  companion: {
    promptPack: "sparring_coach_prompt",
    visibilityPolicy: "seat_scoped_player_view_v0",
    tools: [...SHARED_READ_TOOLS],
    outputChannels: ["speech", "teaching"],
    memoryNamespaces: ["room_memory", "user_character_relation", "conversation_history", "conversation_summary", "battle_public_events"],
    maySelectDecision: false,
    mayPreview: false,
    mayApply: false,
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getStarcraftTmgModeCapability(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  const profile = PROFILES[normalized];
  if (!profile) throw new Error(`unsupported character Agent mode: ${normalized}`);
  const unsigned = {
    schemaVersion: STARCRAFT_TMG_MODE_CAPABILITY_VERSION,
    capabilityProfileId: `starcraft-tmg.${normalized}.capability.v1`,
    mode: normalized,
    ...clone(profile),
    confirmationPolicy: normalized === "opponent" ? "human_confirmation_required" : "mutation_forbidden",
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  };
  return Object.freeze({ ...unsigned, integrityHash: hashStarcraftTmgContract(unsigned) });
}

export function listStarcraftTmgModeCapabilities() {
  return Object.freeze(Object.keys(PROFILES).map((mode) => getStarcraftTmgModeCapability(mode)));
}

export function assertStarcraftTmgModeToolAllowed(mode, toolName) {
  const capability = getStarcraftTmgModeCapability(mode);
  if (!capability.tools.includes(toolName)) throw new Error(`${toolName} is not allowed for ${mode}`);
  return capability;
}

export function validateStarcraftTmgMemoryRefs(mode, memoryRefs = []) {
  const capability = getStarcraftTmgModeCapability(mode);
  if (!Array.isArray(memoryRefs)) throw new Error("memoryRefs must be an array");
  return memoryRefs.map((memoryRef, index) => {
    if (!memoryRef || typeof memoryRef !== "object") throw new Error(`memoryRefs[${index}] must be an object`);
    const namespace = String(memoryRef.namespace || "");
    if (!capability.memoryNamespaces.includes(namespace)) throw new Error(`memory namespace ${namespace} is forbidden for ${mode}`);
    const refId = String(memoryRef.refId || "").trim();
    const version = String(memoryRef.version || "").trim();
    if (!refId || !version) throw new Error(`memoryRefs[${index}] requires refId and version`);
    return Object.freeze({ namespace, refId, version, hash: memoryRef.hash || null });
  });
}
