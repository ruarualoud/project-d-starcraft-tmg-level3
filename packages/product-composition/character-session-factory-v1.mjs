import { createKerriganPrimalProductBundleV1 } from "../../content/characters/kerrigan-primal-v1.mjs";
import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from "../../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { createOriginalTacticalAdjutantBundleV1 } from "../../content/characters/original-tactical-adjutant-v1.mjs";
import { createStarcraftTmgWorldbookRegistry } from "../character-agent/worldbook-registry-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_SESSION_FACTORY_VERSION = "starcraft_tmg_character_session_factory_v1";

const MODE_SET = new Set(["tutor", "opponent", "commentator", "companion"]);

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

export function createStarcraftTmgConfiguredCharacterSessionFactory(options = {}) {
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const rulesetVersion = options.rulesetVersion || "starcraft_tmg_rules_v0";
  const allowRightsGatedDemo = options.allowRightsGatedDemo === true;
  const productionMode = options.productionMode === true;
  const resolveSeatCredential = typeof options.resolveSeatCredential === "function"
    ? options.resolveSeatCredential
    : null;
  const kerrigan = options.kerriganBundle || createKerriganPrimalProductBundleV1();
  const fallback = options.fallbackBundle || createOriginalTacticalAdjutantBundleV1();
  const configured = new Map([
    [kerrigan.characterPackage.characterId, {
      bundle: kerrigan,
      registry: createStarcraftTmgWorldbookRegistry({
        characterId: kerrigan.characterPackage.characterId,
        worldbooks: options.kerriganWorldbooks || KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
      }),
    }],
    [fallback.characterPackage.characterId, {
      bundle: fallback,
      registry: createStarcraftTmgWorldbookRegistry({
        characterId: fallback.characterPackage.characterId,
        worldbooks: fallback.worldbooks,
      }),
    }],
  ]);

  function metadata() {
    return Object.freeze({
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_SESSION_FACTORY_VERSION}.metadata`,
      defaultCharacterId: kerrigan.characterPackage.characterId,
      configuredCharacters: Object.freeze([...configured.values()].map(({ bundle }) => Object.freeze({
        characterId: bundle.characterPackage.characterId,
        displayName: bundle.characterPackage.displayName,
        version: bundle.characterPackage.version,
        status: bundle.characterPackage.status,
        rightsStatus: bundle.characterPackage.rights.status,
        productionSelectable: bundle.rightsGate.productionSelectable,
        supportedModes: bundle.characterPackage.supportedModes,
      }))),
      allowRightsGatedDemo,
      productionMode,
      seatCredentialSource: resolveSeatCredential ? "server_resolver" : "not_configured",
      clientSeatCredentialAccepted: false,
      arbitraryCharacterUpload: false,
      trainingTruth: false,
    });
  }

  function sessionInputFactory(input = {}) {
    const characterId = String(input.characterId || kerrigan.characterPackage.characterId);
    const configuredCharacter = configured.get(characterId);
    if (!configuredCharacter) throw new Error(`character is not configured: ${characterId}`);
    const { bundle, registry } = configuredCharacter;
    const mode = requiredString(input.mode, "mode").toLowerCase();
    if (!MODE_SET.has(mode) || !bundle.characterPackage.supportedModes.includes(mode)) throw new Error(`mode is not configured for character: ${mode}`);
    if (productionMode && bundle.rightsGate.productionSelectable !== true) throw new Error(`character is not production selectable: ${characterId}`);
    if (!productionMode && bundle.rightsGate.productionSelectable !== true && !allowRightsGatedDemo) {
      throw new Error(`rights-gated demo requires explicit server authorization: ${characterId}`);
    }
    const requestedWorldbookIds = Array.isArray(input.worldbookIds) && input.worldbookIds.length
      ? input.worldbookIds
      : bundle.characterPackage.defaultWorldbookIds;
    const selection = registry.resolve({
      characterPackage: bundle.characterPackage,
      requestedWorldbookIds,
      spoilerCeilingRank: input.spoilerCeilingRank,
      knowledgeCeilingRank: input.knowledgeCeilingRank,
      allowFanon: input.allowFanon === true,
    });
    if (!selection.ok) throw new Error(`worldbook selection rejected: ${selection.reason}`);
    const sessionId = requiredString(input.sessionId, "sessionId");
    const roomId = requiredString(input.roomId, "roomId");
    const seatId = input.seatId || (mode === "commentator" ? "observer" : "player1");
    const sessionInput = {
      sessionId,
      characterPackage: bundle.characterPackage,
      roleSkillPack: bundle.roleSkillPacks[mode],
      conversationProfile: bundle.conversationProfile,
      providerProfile: bundle.providerProfile,
      worldbooks: selection.worldbooks,
      spoilerCeilingRank: selection.receipt.spoilerCeilingRank,
      knowledgeCeilingRank: selection.receipt.knowledgeCeilingRank,
      allowFanon: selection.receipt.allowFanon,
      mode,
      roomId,
      seatId,
      gameId: "starcraft-tmg",
      rulesetVersion,
      strategySkillSnapshot: { refs: [], canOverrideRules: false },
      memoryRefs: mode === "opponent" ? [{ namespace: "strategy_memory", refId: "empty-strategy-snapshot", version: "v0" }] : [],
      ruleSkillRefs: options.ruleSkillRefs || ["starcraft_tmg_turn_flow_v61", "starcraft_tmg_action_legality_v61"],
      createdBy: input.createdBy || "local-user",
      createdAt: new Date(input.createdAt || now()).toISOString(),
    };
    if (!resolveSeatCredential) return sessionInput;
    const resolved = resolveSeatCredential({
      sessionId,
      characterId,
      mode,
      roomId,
      seatId,
    });
    if (resolved && typeof resolved.then === "function") {
      return resolved.then((seatToken) => ({
        ...sessionInput,
        seatToken: requiredString(seatToken, "resolved seat credential"),
      }));
    }
    return {
      ...sessionInput,
      seatToken: requiredString(resolved, "resolved seat credential"),
    };
  }

  return Object.freeze({ metadata, sessionInputFactory });
}
