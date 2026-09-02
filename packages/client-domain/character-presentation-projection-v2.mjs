import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_CLIENT_CHARACTER_PROJECTION_VERSION =
  "starcraft_tmg_client_character_projection_v2";

const HASH = /^[a-f0-9]{64}$/u;
const FRAME_ROLES = Object.freeze([
  "neutral",
  "blink",
  "speaking",
  "warning",
  "reflect",
]);
const PHASES = new Set([
  "idle",
  "listening",
  "thinking",
  "speaking",
  "waiting_confirmation",
  "error",
]);
const MODES = new Set(["tutor", "opponent", "commentator", "companion"]);
const RELEASE_CHANNELS = new Set(["development_internal", "public"]);
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]+$/u;
const EXPECTED_TICKET_13_HANDOFF_HASH =
  "4a15b4a2c2f48d28b2233758e88c064719e836a93b8a4d09277d297ac15af9c3";
const EXPECTED_CHARACTER_PACKAGE_HASH =
  "ab238d95ff95c4e69bcabb2abf88cc3daea3edf5a79a732aea30893739cdb246";
const EXPECTED_PERSONA_CATALOGUE_HASH =
  "2e10ae7f977d1d02285753efb6d0cb8bee44e2e80072bd3085ac206f2c58909a";
const EXPECTED_VISUAL_BINDING_V2_HASH =
  "3bf22247a2c4464d3e1e55e6e9eaddc241b1e00be39e0ef501166e9fa41f2ce2";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function fail(code, detail = "") {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function exactKeys(value, expected, path) {
  if (!object(value)) fail("CHARACTER_PROJECTION_INVALID", `${path}_object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join("\u0000") !== wanted.join("\u0000")) {
    fail("CHARACTER_PROJECTION_INVALID", `${path}_keys`);
  }
}

function hash(value, path) {
  if (!HASH.test(String(value || ""))) fail("CHARACTER_PROJECTION_INVALID", path);
  return value;
}

function nonEmpty(value, path) {
  const normalized = String(value || "").trim();
  if (!normalized) fail("CHARACTER_PROJECTION_INVALID", path);
  return normalized;
}

function nonNegativeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("CHARACTER_PROJECTION_INVALID", path);
  }
  return value;
}

function validAssetDelivery(delivery) {
  exactKeys(delivery, [
    "schemaVersion",
    "scheme",
    "routeTemplate",
    "queryParameter",
    "grantToken",
    "issuedAt",
    "expiresAt",
    "contentSetHash",
  ], "portrait.assetDelivery");
  if (delivery.schemaVersion !== "starcraft_tmg_character_asset_delivery_v1"
    || delivery.scheme !== "same_origin_content_hash_opaque_hmac_query"
    || delivery.routeTemplate !== "/starcraft-tmg-level3/assets/v1/character/{contentHash}"
    || delivery.queryParameter !== "grant"
    || String(delivery.grantToken || "").length > 4096) return null;
  const parts = String(delivery.grantToken || "").split(".");
  if (parts.length !== 3
    || !TOKEN_SEGMENT.test(parts[0])
    || parts[0].length < 16
    || parts[0].length > 191
    || !/^[0-9a-z]+$/u.test(parts[1])
    || !TOKEN_SEGMENT.test(parts[2])
    || parts[2].length !== 43) return false;
  const expiresAt = Date.parse(String(delivery.expiresAt || ""));
  return Number.isSafeInteger(expiresAt)
    && Number.parseInt(parts[1], 36) === expiresAt;
}

function validRights(rights, releaseChannel) {
  exactKeys(rights, [
    "schemaVersion",
    "releaseChannel",
    "decisionSource",
    "textIdentityAllowed",
    "derivedVisualAllowed",
    "audioAllowed",
    "imitativeVoiceAllowed",
    "assetDeliveryAllowed",
    "fallbackKind",
    "rightsDecisionHash",
  ], "rights");
  const { rightsDecisionHash, ...core } = rights;
  return rights.schemaVersion === "starcraft_tmg_character_rights_decision_v2"
    && rights.releaseChannel === releaseChannel
    && ["fixed_server_configuration", "fail_closed_default"].includes(rights.decisionSource)
    && [
      "textIdentityAllowed",
      "derivedVisualAllowed",
      "audioAllowed",
      "imitativeVoiceAllowed",
      "assetDeliveryAllowed",
    ].every((field) => typeof rights[field] === "boolean")
    && rights.audioAllowed === false
    && rights.imitativeVoiceAllowed === false
    && nonEmpty(rights.fallbackKind, "rights.fallbackKind")
    && hash(rightsDecisionHash, "rights.rightsDecisionHash")
      === hashStarcraftTmgClientContract(core);
}

function validLockedOption(option, slotIndex) {
  exactKeys(option, [
    "kind",
    "slotIndex",
    "selected",
    "selectable",
    "disabledReason",
    "optionHash",
  ], `selector.options[${slotIndex}]`);
  const { optionHash, ...core } = option;
  return option.kind === "locked"
    && option.slotIndex === slotIndex
    && option.selected === false
    && option.selectable === false
    && option.disabledReason === "spoiler_or_knowledge_ceiling"
    && hash(optionHash, "option.optionHash") === hashStarcraftTmgClientContract(core);
}

function validFrame(frame, expectedRole, path) {
  exactKeys(frame, [
    "frameId",
    "role",
    "contentHash",
    "width",
    "height",
    "mimeType",
  ], path);
  return nonEmpty(frame.frameId, `${path}.frameId`)
    && frame.role === expectedRole
    && hash(frame.contentHash, `${path}.contentHash`)
    && Number.isSafeInteger(frame.width)
    && frame.width >= 320
    && frame.width <= 4096
    && frame.height === frame.width
    && frame.mimeType === "image/png";
}

function validPersonaOption(option, slotIndex) {
  exactKeys(option, [
    "kind",
    "slotIndex",
    "worldbookId",
    "title",
    "personaState",
    "timeline",
    "knowledgeRank",
    "spoilerRank",
    "selected",
    "selectable",
    "disabledReason",
    "thumbnailFrame",
    "optionHash",
  ], `selector.options[${slotIndex}]`);
  exactKeys(option.timeline, ["start", "end"], `selector.options[${slotIndex}].timeline`);
  const { optionHash, ...core } = option;
  return option.kind === "persona"
    && option.slotIndex === slotIndex
    && nonEmpty(option.worldbookId, "option.worldbookId")
    && nonEmpty(option.title, "option.title")
    && nonEmpty(option.personaState, "option.personaState")
    && nonEmpty(option.timeline.start, "option.timeline.start")
    && nonEmpty(option.timeline.end, "option.timeline.end")
    && nonNegativeInteger(option.knowledgeRank, "option.knowledgeRank") >= 0
    && nonNegativeInteger(option.spoilerRank, "option.spoilerRank") >= 0
    && typeof option.selected === "boolean"
    && typeof option.selectable === "boolean"
    && (option.disabledReason === null || typeof option.disabledReason === "string")
    && validFrame(option.thumbnailFrame, "neutral", "option.thumbnailFrame")
    && hash(optionHash, "option.optionHash") === hashStarcraftTmgClientContract(core);
}

function validSelector(selector) {
  exactKeys(selector, [
    "schemaVersion",
    "catalogueHash",
    "stateHash",
    "revision",
    "connectivity",
    "selectionMode",
    "capacityPolicy",
    "spoilerCeilingRank",
    "knowledgeCeilingRank",
    "fullCatalogueRevealed",
    "options",
    "selectedPersonaWorldbookId",
    "selectorViewHash",
  ], "selector");
  if (selector.schemaVersion !== "starcraft_tmg_ceiling_scoped_persona_selector_v2"
    || !Array.isArray(selector.options)
    || selector.options.length < 1
    || selector.selectionMode !== "exactly_one"
    || selector.capacityPolicy !== "unbounded_versioned_catalogue_no_fixed_persona_denominator"
    || !["online", "offline"].includes(selector.connectivity)
    || typeof selector.fullCatalogueRevealed !== "boolean") return false;
  hash(selector.catalogueHash, "selector.catalogueHash");
  hash(selector.stateHash, "selector.stateHash");
  hash(selector.selectorViewHash, "selector.selectorViewHash");
  nonNegativeInteger(selector.revision, "selector.revision");
  nonNegativeInteger(selector.spoilerCeilingRank, "selector.spoilerCeilingRank");
  nonNegativeInteger(selector.knowledgeCeilingRank, "selector.knowledgeCeilingRank");
  const valid = selector.options.every((option, index) => option?.kind === "locked"
    ? validLockedOption(option, index)
    : validPersonaOption(option, index));
  const selected = selector.options.filter((option) => option.kind === "persona" && option.selected);
  const { selectorViewHash, ...selectorCore } = selector;
  return valid
    && selected.length === 1
    && selected[0].worldbookId === selector.selectedPersonaWorldbookId
    && selectorViewHash === hashStarcraftTmgClientContract(selectorCore);
}

function validPortrait(portrait, selector, bindings) {
  exactKeys(portrait, [
    "schemaVersion",
    "kind",
    "mode",
    "phase",
    "visualCue",
    "stateHash",
    "revision",
    "manifestHash",
    "frameRegistry",
    "frameSchedule",
    "scheduleHash",
    "assetDelivery",
    "portraitViewHash",
  ], "portrait");
  if (portrait.schemaVersion !== "starcraft_tmg_character_portrait_projection_v2"
    || portrait.kind !== "dynamic_development"
    || !MODES.has(portrait.mode)
    || !PHASES.has(portrait.phase)
    || portrait.phase !== "idle"
    || !Array.isArray(portrait.frameRegistry)
    || portrait.frameRegistry.length !== FRAME_ROLES.length
    || !Array.isArray(portrait.frameSchedule)
    || portrait.frameSchedule.length < 1) return false;
  hash(portrait.stateHash, "portrait.stateHash");
  hash(portrait.manifestHash, "portrait.manifestHash");
  hash(portrait.scheduleHash, "portrait.scheduleHash");
  hash(portrait.portraitViewHash, "portrait.portraitViewHash");
  nonNegativeInteger(portrait.revision, "portrait.revision");
  if (!validAssetDelivery(portrait.assetDelivery)) return false;
  const registryByRole = new Map();
  for (let index = 0; index < portrait.frameRegistry.length; index += 1) {
    const role = FRAME_ROLES[index];
    const frame = portrait.frameRegistry[index];
    if (!validFrame(frame, role, `portrait.frameRegistry[${index}]`)) return false;
    registryByRole.set(role, frame);
  }
  for (let index = 0; index < portrait.frameSchedule.length; index += 1) {
    const item = portrait.frameSchedule[index];
    exactKeys(item, ["role", "durationMs", "frameId", "contentHash"], `portrait.frameSchedule[${index}]`);
    const frame = registryByRole.get(item.role);
    if (!frame
      || item.frameId !== frame.frameId
      || item.contentHash !== frame.contentHash
      || !Number.isSafeInteger(item.durationMs)
      || item.durationMs < 1
      || item.durationMs > 30_000) return false;
  }
  const { portraitViewHash, ...portraitCore } = portrait;
  return portraitViewHash === hashStarcraftTmgClientContract(portraitCore)
    && portrait.scheduleHash === hashStarcraftTmgClientContract(portrait.frameSchedule)
    && portrait.manifestHash === bindings.manifestHash
    && portrait.stateHash === bindings.portraitStateHash
    && portrait.revision === bindings.portraitRevision
    && selector.selectedPersonaWorldbookId === bindings.selectedPersonaWorldbookId;
}

function validAssetGrantBinding(projection) {
  const delivery = projection.portrait.assetDelivery;
  if (!validAssetDelivery(delivery)) return false;
  const issuedAt = Date.parse(String(delivery.issuedAt || ""));
  const expiresAt = Date.parse(String(delivery.expiresAt || ""));
  const allowedContentHashes = projection.portrait.frameRegistry
    .map((frame) => frame.contentHash)
    .sort();
  return delivery.contentSetHash === hashStarcraftTmgClientContract(allowedContentHashes)
    && Number.isFinite(issuedAt)
    && Number.isFinite(expiresAt)
    && expiresAt > issuedAt
    && expiresAt - issuedAt <= 120_000;
}

function validDevelopmentProjection(projection, expectedPrincipalScopeHash) {
  exactKeys(projection, [
    "schemaVersion",
    "releaseChannel",
    "principalScopeHash",
    "character",
    "selector",
    "portrait",
    "rights",
    "bindings",
    "capabilities",
    "trainingTruth",
    "projectionHash",
  ], "projection");
  exactKeys(projection.character, [
    "characterId",
    "displayName",
    "productRole",
    "productRoleIsCanon",
  ], "character");
  exactKeys(projection.capabilities, [
    "selectPersona",
    "setSpoilerAccess",
    "runProvider",
    "applyRoomAction",
    "generateSkill",
    "createTrainingTruth",
  ], "capabilities");
  exactKeys(projection.bindings, [
    "schemaVersion",
    "ticket13HandoffHash",
    "characterPackageHash",
    "catalogueHash",
    "selectorStateHash",
    "selectorRevision",
    "selectedPersonaWorldbookId",
    "selectedPersonaState",
    "visualBindingHash",
    "manifestHash",
    "portraitStateHash",
    "portraitRevision",
    "rightsDecisionHash",
    "releaseChannel",
    "bindingHash",
  ], "bindings");
  const { bindingHash, ...bindingCore } = projection.bindings;
  const selected = projection.selector?.options?.find(
    (entry) => entry.kind === "persona" && entry.selected,
  );
  return projection.releaseChannel === "development_internal"
    && projection.principalScopeHash === expectedPrincipalScopeHash
    && hash(projection.principalScopeHash, "projection.principalScopeHash")
    && nonEmpty(projection.character.characterId, "character.characterId")
    && nonEmpty(projection.character.displayName, "character.displayName")
    && projection.character.productRole === "tactical_adjutant"
    && projection.character.productRoleIsCanon === false
    && validSelector(projection.selector)
    && validRights(projection.rights, projection.releaseChannel)
    && projection.rights.textIdentityAllowed === true
    && projection.rights.derivedVisualAllowed === true
    && projection.rights.assetDeliveryAllowed === true
    && projection.bindings.schemaVersion === "starcraft_tmg_character_atomic_binding_v2"
    && projection.bindings.ticket13HandoffHash === EXPECTED_TICKET_13_HANDOFF_HASH
    && projection.bindings.characterPackageHash === EXPECTED_CHARACTER_PACKAGE_HASH
    && projection.bindings.catalogueHash === EXPECTED_PERSONA_CATALOGUE_HASH
    && hash(projection.bindings.catalogueHash, "bindings.catalogueHash")
    && hash(projection.bindings.selectorStateHash, "bindings.selectorStateHash")
    && nonNegativeInteger(projection.bindings.selectorRevision, "bindings.selectorRevision") >= 0
    && nonEmpty(projection.bindings.selectedPersonaWorldbookId, "bindings.selectedPersonaWorldbookId")
    && nonEmpty(projection.bindings.selectedPersonaState, "bindings.selectedPersonaState")
    && projection.bindings.visualBindingHash === EXPECTED_VISUAL_BINDING_V2_HASH
    && hash(projection.bindings.manifestHash, "bindings.manifestHash")
    && hash(projection.bindings.portraitStateHash, "bindings.portraitStateHash")
    && nonNegativeInteger(projection.bindings.portraitRevision, "bindings.portraitRevision") >= 0
    && projection.bindings.rightsDecisionHash === projection.rights.rightsDecisionHash
    && projection.bindings.releaseChannel === projection.releaseChannel
    && hash(bindingHash, "bindings.bindingHash") === hashStarcraftTmgClientContract(bindingCore)
    && projection.bindings.catalogueHash === projection.selector.catalogueHash
    && projection.bindings.selectorStateHash === projection.selector.stateHash
    && projection.bindings.selectorRevision === projection.selector.revision
    && projection.bindings.selectedPersonaWorldbookId === projection.selector.selectedPersonaWorldbookId
    && projection.bindings.selectedPersonaState === selected?.personaState
    && validPortrait(projection.portrait, projection.selector, projection.bindings)
    && validAssetGrantBinding(projection)
    && projection.capabilities.selectPersona === true
    && projection.capabilities.setSpoilerAccess === true
    && projection.capabilities.runProvider === false
    && projection.capabilities.applyRoomAction === false
    && projection.capabilities.generateSkill === false
    && projection.capabilities.createTrainingTruth === false
    && projection.trainingTruth === false;
}

function validPublicProjection(projection, expectedPrincipalScopeHash) {
  exactKeys(projection, [
    "schemaVersion",
    "releaseChannel",
    "principalScopeHash",
    "fallback",
    "rights",
    "capabilities",
    "trainingTruth",
    "projectionHash",
  ], "projection");
  exactKeys(projection.fallback, ["kind", "label", "asset", "dynamic"], "fallback");
  exactKeys(projection.capabilities, [
    "selectPersona",
    "setSpoilerAccess",
    "runProvider",
    "applyRoomAction",
    "generateSkill",
    "createTrainingTruth",
  ], "capabilities");
  const serialized = JSON.stringify(projection).toLowerCase();
  return projection.releaseChannel === "public"
    && projection.principalScopeHash === expectedPrincipalScopeHash
    && hash(projection.principalScopeHash, "projection.principalScopeHash")
    && projection.fallback.kind === "asset_free_neutral_adjutant"
    && projection.fallback.label === "Project D Tactical Adjutant"
    && projection.fallback.asset === null
    && projection.fallback.dynamic === false
    && validRights(projection.rights, projection.releaseChannel)
    && projection.rights.textIdentityAllowed === false
    && projection.rights.derivedVisualAllowed === false
    && projection.rights.assetDeliveryAllowed === false
    && Object.values(projection.capabilities).every((value) => value === false)
    && projection.trainingTruth === false
    && !serialized.includes("kerrigan")
    && !serialized.includes("assets/characters")
    && !serialized.includes("character/{contenthash}");
}

export function assertStarcraftTmgClientCharacterProjectionV2(
  value,
  expectedPrincipalScopeHash,
) {
  const projection = clone(value);
  if (!object(projection)
    || projection.schemaVersion !== STARCRAFT_TMG_CLIENT_CHARACTER_PROJECTION_VERSION
    || !RELEASE_CHANNELS.has(projection.releaseChannel)) {
    fail("CHARACTER_PROJECTION_INVALID", "schema_or_release");
  }
  const valid = projection.releaseChannel === "public"
    ? validPublicProjection(projection, expectedPrincipalScopeHash)
    : validDevelopmentProjection(projection, expectedPrincipalScopeHash);
  const { projectionHash, ...core } = projection;
  if (!valid
    || hash(projectionHash, "projection.projectionHash")
      !== hashStarcraftTmgClientContract(core)) {
    fail("CHARACTER_PROJECTION_INVALID", "binding_or_hash");
  }
  return deepFreeze(projection);
}

export function isStarcraftTmgClientCharacterProjectionV2(
  value,
  expectedPrincipalScopeHash,
) {
  try {
    assertStarcraftTmgClientCharacterProjectionV2(value, expectedPrincipalScopeHash);
    return true;
  } catch {
    return false;
  }
}
