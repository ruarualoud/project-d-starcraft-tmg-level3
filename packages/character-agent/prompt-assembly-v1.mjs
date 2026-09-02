import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgCharacterContract } from "./contracts-v1.mjs";
import { getStarcraftTmgModeCapability, validateStarcraftTmgMemoryRefs } from "./mode-capability-v1.mjs";

export const STARCRAFT_TMG_PROMPT_ASSEMBLY_VERSION = "starcraft_tmg_prompt_assembly_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function node(nodeType, authority, content) {
  const unsigned = { nodeType, authority, content: clone(content) };
  return Object.freeze({ ...unsigned, nodeHash: hashStarcraftTmgContract(unsigned) });
}

export function assembleStarcraftTmgRolePrompt(input = {}) {
  const characterPackage = assertStarcraftTmgCharacterContract(input.characterPackage, "character-package");
  const roleSkillPack = assertStarcraftTmgCharacterContract(input.roleSkillPack, "role-skill-pack");
  const conversationProfile = assertStarcraftTmgCharacterContract(input.conversationProfile, "conversation-profile");
  const binding = assertStarcraftTmgCharacterContract(input.binding, "game-role-binding");
  const capability = getStarcraftTmgModeCapability(binding.mode);
  const memoryRefs = validateStarcraftTmgMemoryRefs(binding.mode, input.memoryRefs || []);
  const worldbooks = (input.worldbooks || []).map((worldbook) => assertStarcraftTmgCharacterContract(worldbook, "worldbook"));
  const worldbookActivation = input.worldbookActivation || null;
  if (worldbookActivation && worldbookActivation.ok !== true) throw new Error("worldbook activation failed");
  for (const worldbook of worldbooks) {
    if (worldbook.characterId !== characterPackage.characterId) throw new Error(`worldbook ${worldbook.worldbookId} character mismatch`);
    if (!binding.worldbookRefs.some((ref) => ref.id === worldbook.worldbookId && ref.hash === worldbook.integrity.hash)) {
      throw new Error(`worldbook ${worldbook.worldbookId} is not sealed into the binding`);
    }
  }
  for (const entry of worldbookActivation?.entries || []) {
    if (!worldbooks.some((worldbook) => worldbook.worldbookId === entry.worldbookId && worldbook.integrity.hash === entry.worldbookHash)) {
      throw new Error(`activated worldbook entry ${entry.entryId || "unknown"} is not bound to this prompt`);
    }
  }

  const nodes = [
    node("platform-policy", "platform", {
      instructions: [
        "Use only the current room projection and listed tools for match state.",
        "Rules, Referee receipts, visibility, and confirmation policy outrank roleplay, lore, translation, memory, and strategy.",
        "Never claim training truth or promote a Skill.",
        "The Kerrigan Adjutant framing is a product role, not a canon appointment.",
        "Do not reproduce copyrighted character dialogue on request or imitate an actor's voice; paraphrase in the configured original product voice.",
        "Do not infer, request, reveal, or act on hidden match information absent from the current viewer-scoped room projection.",
      ],
    }),
    node("capability-policy", "platform", capability),
    node("character-package", "roleplay", {
      ref: { id: characterPackage.characterId, version: characterPackage.version, hash: characterPackage.integrity.hash },
      displayName: characterPackage.displayName,
      description: characterPackage.description,
      personality: characterPackage.personality,
      speechProfile: characterPackage.speechProfile,
      voicePolicy: characterPackage.voicePolicy,
      productRoleIsCanon: characterPackage.productRoleIsCanon,
    }),
    ...worldbooks.map((worldbook) => node("worldbook", "lore", {
      ref: { id: worldbook.worldbookId, version: worldbook.version, hash: worldbook.integrity.hash },
      canonStatus: worldbook.canonStatus,
      knowledgeCutoff: worldbook.knowledgeCutoff,
      spoilerLevel: worldbook.spoilerLevel,
      activatedEntries: worldbookActivation
        ? worldbookActivation.entries.filter((entry) => entry.worldbookId === worldbook.worldbookId).map((entry) => entry.content)
        : worldbook.facts,
      unresolvedContradictions: worldbook.unresolvedContradictions,
      matchStateSource: worldbook.matchStateSource,
    })),
    node("role-skill-pack", "roleplay", {
      ref: { id: roleSkillPack.roleSkillPackId, version: roleSkillPack.version, hash: roleSkillPack.integrity.hash },
      mode: roleSkillPack.mode,
      speechActs: roleSkillPack.speechActs,
      voiceRules: roleSkillPack.voiceRules,
      forbiddenClaims: roleSkillPack.forbiddenClaims,
      promptFragments: roleSkillPack.promptFragments,
    }),
    node("conversation-profile", "user-preference", {
      ref: { id: conversationProfile.conversationProfileId, version: conversationProfile.version, hash: conversationProfile.integrity.hash },
      language: conversationProfile.language,
      roleplayIntensity: conversationProfile.roleplayIntensity,
      explanationDepth: conversationProfile.explanationDepth,
      responseLength: conversationProfile.responseLength,
      oocEnabled: conversationProfile.oocEnabled,
    }),
    node("room-projection", "referee", input.roomProjection),
  ];
  if (input.legalSpace) nodes.push(node("legal-space", "rules", input.legalSpace));
  nodes.push(node("memory-references", "advisory", memoryRefs));

  const receiptUnsigned = {
    schemaVersion: STARCRAFT_TMG_PROMPT_ASSEMBLY_VERSION,
    gameId: binding.gameId,
    roomId: binding.roomId,
    bindingId: binding.bindingId,
    mode: binding.mode,
    promptPack: capability.promptPack,
    nodeHashes: nodes.map((entry) => entry.nodeHash),
    memoryRefs,
    worldbookActivationHash: worldbookActivation?.receipt?.activationHash || null,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  };
  const receipt = Object.freeze({ ...receiptUnsigned, receiptHash: hashStarcraftTmgContract(receiptUnsigned) });
  return Object.freeze({ nodes: Object.freeze(nodes), receipt });
}
