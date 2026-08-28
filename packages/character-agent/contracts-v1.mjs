import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_CONTRACT_VERSION = "starcraft_tmg_character_contract_v1";
export const STARCRAFT_TMG_CHARACTER_MODES = Object.freeze(["tutor", "opponent", "commentator", "companion"]);

const MODE_SET = new Set(STARCRAFT_TMG_CHARACTER_MODES);
const CONTRACT_TYPES = new Set([
  "character-package",
  "worldbook",
  "role-skill-pack",
  "conversation-profile",
  "game-role-binding",
  "provider-profile",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function stringArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((entry, index) => requiredString(entry, `${field}[${index}]`));
}

function mode(value, field = "mode") {
  const normalized = requiredString(value, field).toLowerCase();
  if (!MODE_SET.has(normalized)) throw new Error(`${field} is unsupported: ${normalized}`);
  return normalized;
}

function nonNegativeInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(`${field} must be a non-negative safe integer`);
  return normalized;
}

function boundedNumber(value, field, minimum, maximum) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < minimum || normalized > maximum) {
    throw new Error(`${field} must be between ${minimum} and ${maximum}`);
  }
  return normalized;
}

function positiveInteger(value, field, maximum) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1 || normalized > maximum) {
    throw new Error(`${field} must be a positive safe integer at most ${maximum}`);
  }
  return normalized;
}

function unsignedContract(value = {}) {
  const { integrity: _integrity, ...unsigned } = clone(value);
  return unsigned;
}

function seal(contractType, value) {
  if (!CONTRACT_TYPES.has(contractType)) throw new Error(`unknown contract type: ${contractType}`);
  const unsigned = {
    schemaVersion: STARCRAFT_TMG_CHARACTER_CONTRACT_VERSION,
    contractType,
    ...unsignedContract(value),
  };
  const integrity = {
    algorithm: "sha256",
    hash: hashStarcraftTmgContract(unsigned),
  };
  return deepFreeze({ ...unsigned, integrity });
}

export function assertStarcraftTmgCharacterContract(value, expectedType) {
  if (!object(value)) throw new Error("character contract must be an object");
  if (value.schemaVersion !== STARCRAFT_TMG_CHARACTER_CONTRACT_VERSION) throw new Error("character contract schemaVersion mismatch");
  if (expectedType && value.contractType !== expectedType) throw new Error(`expected ${expectedType}, received ${value.contractType}`);
  if (!CONTRACT_TYPES.has(value.contractType)) throw new Error(`unknown character contract type: ${value.contractType}`);
  if (value.integrity?.algorithm !== "sha256") throw new Error("character contract integrity algorithm mismatch");
  const expectedHash = hashStarcraftTmgContract(unsignedContract(value));
  if (value.integrity?.hash !== expectedHash) throw new Error("character contract integrity mismatch");
  return value;
}

export function exportStarcraftTmgCharacterContract(value) {
  assertStarcraftTmgCharacterContract(value);
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function importStarcraftTmgCharacterContract(serialized, expectedType) {
  const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
  assertStarcraftTmgCharacterContract(parsed, expectedType);
  return deepFreeze(parsed);
}

export function createCharacterPackage(input = {}) {
  const supportedModes = stringArray(input.supportedModes || STARCRAFT_TMG_CHARACTER_MODES, "supportedModes").map((entry) => mode(entry, "supportedModes"));
  const worldbookIds = stringArray(input.worldbookIds || [], "worldbookIds");
  const defaultWorldbookIds = stringArray(input.defaultWorldbookIds || worldbookIds, "defaultWorldbookIds");
  if (new Set(supportedModes).size !== supportedModes.length) throw new Error("supportedModes must not contain duplicates");
  if (new Set(worldbookIds).size !== worldbookIds.length) throw new Error("worldbookIds must not contain duplicates");
  if (defaultWorldbookIds.some((worldbookId) => !worldbookIds.includes(worldbookId))) throw new Error("defaultWorldbookIds must be a subset of worldbookIds");
  if (input.productRoleIsCanon !== false) throw new Error("productRoleIsCanon must explicitly be false for product-role framing");
  if (input.authority?.rules !== "external_rules_service") throw new Error("CharacterPackage rules authority must be external_rules_service");
  if (input.authority?.matchState !== "room_tools_only") throw new Error("CharacterPackage match state must come from room_tools_only");
  return seal("character-package", {
    characterId: requiredString(input.characterId, "characterId"),
    slug: requiredString(input.slug, "slug"),
    displayName: requiredString(input.displayName, "displayName"),
    aliases: stringArray(input.aliases || [], "aliases"),
    version: requiredString(input.version, "version"),
    status: requiredString(input.status || "draft", "status"),
    productRole: requiredString(input.productRole, "productRole"),
    productRoleIsCanon: false,
    defaultPersonaState: requiredString(input.defaultPersonaState, "defaultPersonaState"),
    canonPolicy: requiredString(input.canonPolicy, "canonPolicy"),
    spoilerProfile: clone(input.spoilerProfile || {}),
    description: requiredString(input.description, "description"),
    personality: clone(input.personality || {}),
    speechProfile: clone(input.speechProfile || {}),
    firstMessages: stringArray(input.firstMessages || [], "firstMessages"),
    rolePromptPackId: requiredString(input.rolePromptPackId, "rolePromptPackId"),
    roleSkillPackIds: stringArray(input.roleSkillPackIds || [], "roleSkillPackIds"),
    worldbookIds,
    defaultWorldbookIds,
    supportedModes,
    authority: clone(input.authority),
    channelPolicy: clone(input.channelPolicy || {}),
    voicePolicy: requiredString(input.voicePolicy, "voicePolicy"),
    rights: clone(input.rights || {}),
    fallbackCharacterId: input.fallbackCharacterId || null,
    provenance: clone(input.provenance || {}),
    contentRating: input.contentRating || "teen",
    locale: input.locale || "en-US",
    tags: stringArray(input.tags || [], "tags"),
    extensions: clone(input.extensions || {}),
  });
}

export function createWorldbook(input = {}) {
  const canonStatus = requiredString(input.canonStatus, "canonStatus");
  if (!["official_primary_summary", "official_source_context", "platform_framing", "fanon"].includes(canonStatus)) {
    throw new Error(`unsupported worldbook canonStatus: ${canonStatus}`);
  }
  if (input.rulesAuthority !== "external_rules_service") throw new Error("worldbook rulesAuthority must be external_rules_service");
  if (input.matchStateSource !== "room_tools_only") throw new Error("worldbook matchStateSource must be room_tools_only");
  return seal("worldbook", {
    worldbookId: requiredString(input.worldbookId, "worldbookId"),
    characterId: requiredString(input.characterId, "characterId"),
    version: requiredString(input.version, "version"),
    title: requiredString(input.title, "title"),
    worldbookKind: requiredString(input.worldbookKind || "persona_edition", "worldbookKind"),
    personaState: requiredString(input.personaState || input.worldbookId, "personaState"),
    canonStatus,
    timeline: clone(input.timeline || {}),
    knowledgeCutoff: requiredString(input.knowledgeCutoff, "knowledgeCutoff"),
    knowledgeRank: nonNegativeInteger(input.knowledgeRank ?? 0, "knowledgeRank"),
    spoilerLevel: requiredString(input.spoilerLevel, "spoilerLevel"),
    spoilerRank: nonNegativeInteger(input.spoilerRank ?? 0, "spoilerRank"),
    visualIdentity: clone(input.visualIdentity || {}),
    affiliations: clone(input.affiliations || []),
    relationshipEdges: clone(input.relationshipEdges || []),
    controlState: clone(input.controlState || {}),
    facts: clone(input.facts || []),
    entries: clone(input.entries || []),
    activation: clone(input.activation || { always: true, modes: ["tutor", "opponent", "commentator", "companion"] }),
    sourceRefs: clone(input.sourceRefs || []),
    unresolvedContradictions: clone(input.unresolvedContradictions || []),
    rulesAuthority: input.rulesAuthority,
    matchStateSource: input.matchStateSource,
    extensions: clone(input.extensions || {}),
  });
}

export function createRoleSkillPack(input = {}) {
  return seal("role-skill-pack", {
    roleSkillPackId: requiredString(input.roleSkillPackId, "roleSkillPackId"),
    characterId: requiredString(input.characterId, "characterId"),
    version: requiredString(input.version, "version"),
    mode: mode(input.mode),
    speechActs: stringArray(input.speechActs || [], "speechActs"),
    voiceRules: stringArray(input.voiceRules || [], "voiceRules"),
    addressRules: stringArray(input.addressRules || [], "addressRules"),
    narrativePerspective: requiredString(input.narrativePerspective || "first_person", "narrativePerspective"),
    oocPolicy: requiredString(input.oocPolicy || "explicit_only", "oocPolicy"),
    forbiddenClaims: stringArray(input.forbiddenClaims || [], "forbiddenClaims"),
    promptFragments: stringArray(input.promptFragments || [], "promptFragments"),
    evidence: clone(input.evidence || {}),
    extensions: clone(input.extensions || {}),
  });
}

export function createConversationProfile(input = {}) {
  return seal("conversation-profile", {
    conversationProfileId: requiredString(input.conversationProfileId, "conversationProfileId"),
    version: requiredString(input.version, "version"),
    language: input.language || "zh-CN",
    roleplayIntensity: input.roleplayIntensity || "medium",
    explanationDepth: input.explanationDepth || "adaptive",
    responseLength: input.responseLength || "concise",
    oocEnabled: input.oocEnabled !== false,
    memoryPolicy: clone(input.memoryPolicy || { writes: "disabled", userReviewRequired: true }),
    expressionEnabled: Boolean(input.expressionEnabled),
    voiceEnabled: Boolean(input.voiceEnabled),
    commentaryFrequency: input.commentaryFrequency || "event_driven",
    providerProfileRef: requiredString(input.providerProfileRef, "providerProfileRef"),
    extensions: clone(input.extensions || {}),
  });
}

export function createProviderProfile(input = {}) {
  const serialized = JSON.stringify(input).toLowerCase();
  if (/api[_-]?key|authorization|bearer|credential|secret/.test(serialized)) throw new Error("ProviderProfile must not contain credentials");
  const provider = requiredString(input.provider, "provider");
  if (["dsh", "deepseek-harness", "deepseek_ai_harness"].includes(provider.toLowerCase())) {
    throw new Error("DSH is forbidden in online ProviderProfile contracts");
  }
  const retryPolicy = clone(input.retryPolicy || { maxAttempts: 1, owner: "session_supervisor", internalRetry: false });
  if (retryPolicy.internalRetry === true) throw new Error("online ProviderProfile internal retry is forbidden");
  retryPolicy.maxAttempts = positiveInteger(retryPolicy.maxAttempts ?? 1, "retryPolicy.maxAttempts", 8);
  retryPolicy.owner = requiredString(retryPolicy.owner || "session_supervisor", "retryPolicy.owner");
  return seal("provider-profile", {
    providerProfileId: requiredString(input.providerProfileId, "providerProfileId"),
    version: requiredString(input.version, "version"),
    provider,
    baseUrl: requiredString(input.baseUrl, "baseUrl"),
    model: requiredString(input.model, "model"),
    thinkingMode: input.thinkingMode || "provider_default",
    reasoningEffort: input.reasoningEffort || "medium",
    temperature: boundedNumber(input.temperature ?? 0.3, "temperature", 0, 2),
    topP: boundedNumber(input.topP ?? 1, "topP", 0, 1),
    contextBudget: positiveInteger(input.contextBudget || 32768, "contextBudget", 2000000),
    outputBudget: positiveInteger(input.outputBudget || 2048, "outputBudget", 1000000),
    toolSupport: input.toolSupport !== false,
    timeoutMs: positiveInteger(input.timeoutMs || 60000, "timeoutMs", 300000),
    retryPolicy,
    fallbackPolicy: input.fallbackPolicy || "fail_closed",
    credentialPolicy: "session_memory_only_byok",
    extensions: clone(input.extensions || {}),
  });
}

export function createGameRoleBinding(input = {}) {
  const characterPackage = assertStarcraftTmgCharacterContract(input.characterPackage, "character-package");
  const roleSkillPack = assertStarcraftTmgCharacterContract(input.roleSkillPack, "role-skill-pack");
  const conversationProfile = assertStarcraftTmgCharacterContract(input.conversationProfile, "conversation-profile");
  const providerProfile = assertStarcraftTmgCharacterContract(input.providerProfile, "provider-profile");
  const bindingMode = mode(input.mode);
  if (!characterPackage.supportedModes.includes(bindingMode)) throw new Error(`CharacterPackage does not support mode: ${bindingMode}`);
  if (roleSkillPack.mode !== bindingMode) throw new Error("RoleSkillPack mode does not match binding mode");
  if (roleSkillPack.characterId !== characterPackage.characterId) throw new Error("RoleSkillPack character mismatch");
  if (conversationProfile.providerProfileRef !== providerProfile.providerProfileId) throw new Error("ConversationProfile provider reference mismatch");
  return seal("game-role-binding", {
    bindingId: requiredString(input.bindingId, "bindingId"),
    version: requiredString(input.version || "1.0.0", "version"),
    characterPackageRef: { id: characterPackage.characterId, version: characterPackage.version, hash: characterPackage.integrity.hash },
    roleSkillPackRef: { id: roleSkillPack.roleSkillPackId, version: roleSkillPack.version, hash: roleSkillPack.integrity.hash },
    conversationProfileRef: { id: conversationProfile.conversationProfileId, version: conversationProfile.version, hash: conversationProfile.integrity.hash },
    providerProfileRef: { id: providerProfile.providerProfileId, version: providerProfile.version, hash: providerProfile.integrity.hash },
    mode: bindingMode,
    roomId: requiredString(input.roomId, "roomId"),
    seatId: requiredString(input.seatId || "observer", "seatId"),
    gameId: input.gameId || "starcraft-tmg",
    rulesetVersion: requiredString(input.rulesetVersion, "rulesetVersion"),
    visibilityPolicy: requiredString(input.visibilityPolicy, "visibilityPolicy"),
    capabilityProfileId: requiredString(input.capabilityProfileId, "capabilityProfileId"),
    worldbookRefs: clone(input.worldbookRefs || []),
    strategySkillSnapshot: clone(input.strategySkillSnapshot || { refs: [], canOverrideRules: false }),
    memoryScopes: clone(input.memoryScopes || []),
    createdBy: requiredString(input.createdBy || "local-user", "createdBy"),
    createdAt: new Date(input.createdAt).toISOString(),
    extensions: clone(input.extensions || {}),
  });
}
