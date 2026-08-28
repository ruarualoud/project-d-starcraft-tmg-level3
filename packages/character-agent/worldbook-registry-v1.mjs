import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from "./contracts-v1.mjs";

export const STARCRAFT_TMG_WORLDBOOK_REGISTRY_VERSION = "starcraft_tmg_worldbook_registry_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function rejection(reason, details = {}) {
  return deepFreeze({ ok: false, schemaVersion: `${STARCRAFT_TMG_WORLDBOOK_REGISTRY_VERSION}.rejection`, reason, ...clone(details) });
}

function normalizedRequestedIds(characterPackage, requestedWorldbookIds) {
  const ids = requestedWorldbookIds === undefined
    ? characterPackage.defaultWorldbookIds
    : requestedWorldbookIds;
  if (!Array.isArray(ids)) throw new Error("requestedWorldbookIds must be an array");
  const normalized = ids.map((entry) => String(entry || "").trim()).filter(Boolean);
  if (new Set(normalized).size !== normalized.length) throw new Error("requestedWorldbookIds must not contain duplicates");
  return normalized;
}

function activationMatches(entry, context) {
  const modes = Array.isArray(entry.activation?.modes) ? entry.activation.modes : [];
  if (modes.length && !modes.includes(context.mode)) return false;
  if (entry.activation?.always === true) return true;
  const keywords = Array.isArray(entry.activation?.keywords) ? entry.activation.keywords : [];
  const normalizedMessage = String(context.userMessage || "").toLocaleLowerCase();
  return keywords.some((keyword) => normalizedMessage.includes(String(keyword).toLocaleLowerCase()));
}

export function createStarcraftTmgWorldbookRegistry(input = {}) {
  const characterId = String(input.characterId || "").trim();
  if (!characterId) throw new Error("characterId is required");
  const byId = new Map();
  for (const candidate of input.worldbooks || []) {
    const worldbook = assertStarcraftTmgCharacterContract(candidate, "worldbook");
    if (worldbook.characterId !== characterId) throw new Error(`worldbook ${worldbook.worldbookId} character mismatch`);
    if (byId.has(worldbook.worldbookId)) throw new Error(`duplicate worldbook: ${worldbook.worldbookId}`);
    byId.set(worldbook.worldbookId, worldbook);
  }

  function list() {
    return deepFreeze([...byId.values()].map((worldbook) => ({
      worldbookId: worldbook.worldbookId,
      version: worldbook.version,
      title: worldbook.title,
      worldbookKind: worldbook.worldbookKind,
      personaState: worldbook.personaState,
      canonStatus: worldbook.canonStatus,
      knowledgeCutoff: worldbook.knowledgeCutoff,
      knowledgeRank: worldbook.knowledgeRank,
      spoilerLevel: worldbook.spoilerLevel,
      spoilerRank: worldbook.spoilerRank,
      integrityHash: worldbook.integrity.hash,
    })));
  }

  function resolve(selection = {}) {
    let characterPackage;
    let requestedIds;
    try {
      characterPackage = assertStarcraftTmgCharacterContract(selection.characterPackage, "character-package");
      if (characterPackage.characterId !== characterId) return rejection("character_mismatch");
      requestedIds = normalizedRequestedIds(characterPackage, selection.requestedWorldbookIds);
    } catch (error) {
      return rejection("invalid_selection", { message: error instanceof Error ? error.message : String(error) });
    }
    const spoilerCeilingRank = Number(selection.spoilerCeilingRank ?? characterPackage.spoilerProfile?.defaultRank ?? 0);
    const knowledgeCeilingRank = Number(selection.knowledgeCeilingRank ?? spoilerCeilingRank);
    if (!Number.isSafeInteger(spoilerCeilingRank) || spoilerCeilingRank < 0) return rejection("invalid_spoiler_ceiling");
    if (!Number.isSafeInteger(knowledgeCeilingRank) || knowledgeCeilingRank < 0) return rejection("invalid_knowledge_ceiling");
    const selected = [];
    for (const worldbookId of requestedIds) {
      if (!characterPackage.worldbookIds.includes(worldbookId)) return rejection("worldbook_not_allowed_by_character", { worldbookId });
      const worldbook = byId.get(worldbookId);
      if (!worldbook) return rejection("worldbook_not_found", { worldbookId });
      if (worldbook.spoilerRank > spoilerCeilingRank) {
        return rejection("spoiler_ceiling_exceeded", { worldbookId, spoilerRank: worldbook.spoilerRank, spoilerCeilingRank });
      }
      if (worldbook.knowledgeRank > knowledgeCeilingRank) {
        return rejection("knowledge_ceiling_exceeded", { worldbookId, knowledgeRank: worldbook.knowledgeRank, knowledgeCeilingRank });
      }
      if (worldbook.canonStatus === "fanon" && selection.allowFanon !== true) return rejection("fanon_requires_explicit_opt_in", { worldbookId });
      selected.push(worldbook);
    }
    const personaEditions = selected.filter((worldbook) => worldbook.worldbookKind === "persona_edition");
    if (personaEditions.length > 1) {
      return rejection("persona_edition_conflict", {
        worldbookIds: personaEditions.map((worldbook) => worldbook.worldbookId),
        personaStates: personaEditions.map((worldbook) => worldbook.personaState),
      });
    }
    if (selection.requirePersonaEdition !== false && personaEditions.length !== 1) return rejection("persona_edition_required");
    const unsigned = {
      schemaVersion: `${STARCRAFT_TMG_WORLDBOOK_REGISTRY_VERSION}.selection`,
      characterRef: {
        id: characterPackage.characterId,
        version: characterPackage.version,
        hash: characterPackage.integrity.hash,
      },
      spoilerCeilingRank,
      knowledgeCeilingRank,
      allowFanon: selection.allowFanon === true,
      selectedRefs: selected.map((worldbook) => ({
        id: worldbook.worldbookId,
        version: worldbook.version,
        hash: worldbook.integrity.hash,
        worldbookKind: worldbook.worldbookKind,
        personaState: worldbook.personaState,
      })),
      personaState: personaEditions[0]?.personaState || null,
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    };
    const receipt = deepFreeze({ ...unsigned, selectionHash: hashStarcraftTmgContract(unsigned) });
    return deepFreeze({ ok: true, worldbooks: clone(selected), receipt });
  }

  function activate(selectionResult, context = {}) {
    if (!selectionResult?.ok || !Array.isArray(selectionResult.worldbooks)) return rejection("valid_selection_required");
    const maxEntries = Number(context.maxEntries ?? 32);
    if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 128) return rejection("invalid_entry_budget");
    const activated = [];
    for (const worldbook of selectionResult.worldbooks) {
      const entries = worldbook.entries.length ? worldbook.entries : worldbook.facts.map((fact, index) => ({
        entryId: `${worldbook.worldbookId}.fact.${index + 1}`,
        priority: 100,
        activation: worldbook.activation,
        content: fact,
      }));
      for (const entry of entries) {
        if (!activationMatches({ ...entry, activation: entry.activation || worldbook.activation }, context)) continue;
        activated.push({
          worldbookId: worldbook.worldbookId,
          worldbookHash: worldbook.integrity.hash,
          entryId: String(entry.entryId || ""),
          priority: Number(entry.priority ?? 0),
          content: clone(entry.content || entry),
        });
      }
    }
    activated.sort((left, right) => right.priority - left.priority
      || left.worldbookId.localeCompare(right.worldbookId)
      || left.entryId.localeCompare(right.entryId));
    const retained = activated.slice(0, maxEntries);
    const unsigned = {
      schemaVersion: `${STARCRAFT_TMG_WORLDBOOK_REGISTRY_VERSION}.activation`,
      selectionHash: selectionResult.receipt.selectionHash,
      mode: String(context.mode || "companion"),
      userMessageHash: hashStarcraftTmgContract(String(context.userMessage || "")),
      maxEntries,
      activatedRefs: retained.map((entry) => ({ worldbookId: entry.worldbookId, worldbookHash: entry.worldbookHash, entryId: entry.entryId })),
      truncatedCount: Math.max(0, activated.length - retained.length),
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    };
    return deepFreeze({
      ok: true,
      entries: retained,
      receipt: { ...unsigned, activationHash: hashStarcraftTmgContract(unsigned) },
    });
  }

  return Object.freeze({ list, resolve, activate });
}
