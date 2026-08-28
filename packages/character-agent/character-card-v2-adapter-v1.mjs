import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import {
  assertStarcraftTmgCharacterContract,
  createCharacterPackage,
  exportStarcraftTmgCharacterContract,
  importStarcraftTmgCharacterContract,
} from "./contracts-v1.mjs";

export const STARCRAFT_TMG_CHARACTER_CARD_ADAPTER_VERSION = "starcraft_tmg_character_card_v2_adapter_v1";

const KNOWN_DATA_FIELDS = new Set([
  "name",
  "description",
  "personality",
  "scenario",
  "first_mes",
  "mes_example",
  "creator_notes",
  "system_prompt",
  "post_history_instructions",
  "alternate_greetings",
  "tags",
  "creator",
  "character_version",
  "extensions",
  "character_book",
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

function safeString(value, maxLength = 12000) {
  return String(value || "").slice(0, maxLength);
}

function safeStringArray(value, maxEntries = 64, maxLength = 4000) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxEntries).map((entry) => safeString(entry, maxLength)).filter(Boolean);
}

function parseCard(input) {
  const parsed = typeof input === "string" ? JSON.parse(input) : clone(input);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Character Card must be an object");
  if (parsed.spec !== "chara_card_v2") throw new Error("only chara_card_v2 JSON is supported");
  if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) throw new Error("Character Card data is required");
  return parsed;
}

export function exportStarcraftTmgCharacterCardV2(characterPackage, input = {}) {
  const character = assertStarcraftTmgCharacterContract(characterPackage, "character-package");
  const card = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: character.displayName,
      description: character.description,
      personality: JSON.stringify(character.personality),
      scenario: `Project D ${character.productRole}; productRoleIsCanon=${character.productRoleIsCanon}`,
      first_mes: character.firstMessages[0] || "",
      mes_example: "",
      creator_notes: "Rules and match state remain external to this roleplay card.",
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: character.firstMessages.slice(1),
      tags: character.tags,
      creator: input.creator || "Project D",
      character_version: character.version,
      extensions: {
        ...(clone(input.cardExtensions || {})),
        projectD: {
          adapterVersion: STARCRAFT_TMG_CHARACTER_CARD_ADAPTER_VERSION,
          characterPackage: JSON.parse(exportStarcraftTmgCharacterContract(character)),
          rulesAuthority: "external_rules_service",
          matchStateSource: "room_tools_only",
          trainingTruth: false,
        },
      },
      character_book: input.characterBook || undefined,
    },
  };
  const cardHash = hashStarcraftTmgContract(card);
  return deepFreeze({
    card,
    serialized: `${JSON.stringify(card, null, 2)}\n`,
    receipt: {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_ADAPTER_VERSION}.export-receipt`,
      characterPackageHash: character.integrity.hash,
      cardHash,
      jsonSupported: true,
      pngEmbeddingSupported: false,
      trainingTruth: false,
    },
  });
}

export function importStarcraftTmgCharacterCardV2(input, options = {}) {
  const card = parseCard(input);
  const embedded = card.data.extensions?.projectD?.characterPackage;
  if (embedded) {
    const characterPackage = importStarcraftTmgCharacterContract(embedded, "character-package");
    if (safeString(card.data.name, 256) !== characterPackage.displayName) throw new Error("sealed Character Card name does not match embedded CharacterPackage");
    if (safeString(card.data.character_version, 128) !== characterPackage.version) throw new Error("sealed Character Card version does not match embedded CharacterPackage");
    if (safeString(card.data.description) !== characterPackage.description) throw new Error("sealed Character Card description does not match embedded CharacterPackage");
    const unsigned = {
      schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_ADAPTER_VERSION}.import-receipt`,
      importClass: "sealed_project_d_round_trip",
      cardHash: hashStarcraftTmgContract(card),
      characterPackageHash: characterPackage.integrity.hash,
      quarantinedPromptFields: [],
      unknownFieldsPreserved: true,
      productionSelectable: characterPackage.rights?.publicReleaseAllowed === true,
      rulesAuthority: "external_rules_service",
      trainingTruth: false,
    };
    return deepFreeze({ ok: true, characterPackage, receipt: { ...unsigned, receiptHash: hashStarcraftTmgContract(unsigned) } });
  }

  const data = card.data;
  const cardHash = hashStarcraftTmgContract(card);
  const unknownDataFields = Object.fromEntries(Object.entries(data).filter(([key]) => !KNOWN_DATA_FIELDS.has(key)));
  const quarantinedPromptFields = ["system_prompt", "post_history_instructions", "mes_example"]
    .filter((field) => safeString(data[field]).trim())
    .map((field) => ({ field, contentHash: hashStarcraftTmgContract(safeString(data[field])) }));
  const externalId = `external.character-card.${cardHash.slice(0, 24)}`;
  const firstMessages = [safeString(data.first_mes), ...safeStringArray(data.alternate_greetings)].filter(Boolean);
  const characterPackage = createCharacterPackage({
    characterId: externalId,
    slug: externalId.replaceAll(".", "-"),
    displayName: safeString(data.name || "Imported Character", 256),
    aliases: [],
    version: safeString(data.character_version || "imported-v1", 128),
    status: "imported_untrusted_companion_only",
    productRole: "imported_character_companion",
    productRoleIsCanon: false,
    defaultPersonaState: "external.unverified",
    canonPolicy: "external_unverified_user_authored",
    spoilerProfile: { defaultLevel: "user_managed", defaultRank: 0, blocksLaterTimeline: true },
    description: safeString(data.description) || "Imported external character; no description was provided.",
    personality: { externalText: safeString(data.personality), provenanceClass: "external_unverified" },
    speechProfile: { externalScenario: safeString(data.scenario), copiedQuotesAllowed: false, actorVoiceImitationAllowed: false },
    firstMessages,
    rolePromptPackId: "external.quarantined.companion.v1",
    roleSkillPackIds: [],
    worldbookIds: [],
    defaultWorldbookIds: [],
    supportedModes: options.supportedModes || ["companion"],
    authority: {
      rules: "external_rules_service",
      referee: "authoritative_room_receipts",
      matchState: "room_tools_only",
      loreCanOverrideRules: false,
      translationCanOverrideRules: false,
      memoryCanOverrideRules: false,
    },
    channelPolicy: { decision: "forbidden", apply: "forbidden", speech: "companion_only" },
    voicePolicy: "disabled_until_separately_reviewed",
    rights: {
      status: "external_unknown_requires_review",
      publicReleaseAllowed: false,
      copiedDialogueAllowed: false,
      copiedAudioAllowed: false,
      scrapedArtAllowed: false,
    },
    provenance: {
      importClass: "external_character_card_v2_untrusted",
      cardHash,
      creator: safeString(data.creator, 512),
      creatorNotesHash: hashStarcraftTmgContract(safeString(data.creator_notes)),
    },
    tags: safeStringArray(data.tags, 64, 128),
    extensions: {
      characterCardV2: {
        originalSpecVersion: safeString(card.spec_version, 32),
        originalExtensions: clone(data.extensions || {}),
        unknownDataFields,
        quarantinedPromptFields,
        characterBook: clone(data.character_book || null),
      },
    },
  });
  const unsigned = {
    schemaVersion: `${STARCRAFT_TMG_CHARACTER_CARD_ADAPTER_VERSION}.import-receipt`,
    importClass: "external_untrusted_companion_only",
    cardHash,
    characterPackageHash: characterPackage.integrity.hash,
    quarantinedPromptFields,
    unknownFieldsPreserved: true,
    productionSelectable: false,
    rulesAuthority: "external_rules_service",
    trainingTruth: false,
  };
  return deepFreeze({
    ok: true,
    characterPackage,
    receipt: { ...unsigned, receiptHash: hashStarcraftTmgContract(unsigned) },
  });
}
