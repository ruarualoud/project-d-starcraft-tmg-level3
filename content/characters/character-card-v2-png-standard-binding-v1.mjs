import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/transition-v1.mjs";

const unsigned = {
  schemaVersion: "starcraft_tmg_character_card_v2_png_standard_binding_v1",
  bindingId: "character-card-v2-png-carriage-2026-09-02",
  researchedAt: "2026-09-02T23:30:00.000Z",
  sources: [
    {
      sourceId: "character-card-v2-public-spec",
      publisher: "malfoyslastname/character-card-spec-v2",
      url: "https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md",
      claim: "V2 uses spec=chara_card_v2, spec_version=2.0 and a data object while extending the V1 embedded JSON.",
    },
    {
      sourceId: "character-card-v1-png-carriage",
      publisher: "malfoyslastname/character-card-spec-v2",
      url: "https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md",
      claim: "PNG/APNG carriage stores the JSON UTF-8 string as base64 in the Chara metadata field.",
    },
    {
      sourceId: "unified-character-card-png-clarification",
      publisher: "BasedInn/Unified-CharacterCard-Specification",
      url: "https://github.com/BasedInn/Unified-CharacterCard-Specification",
      claim: "The interoperable PNG representation is one tEXt chunk with lowercase keyword chara and base64-encoded UTF-8 JSON.",
    },
    {
      sourceId: "png-1.2-text-chunk",
      publisher: "PNG Development Group",
      url: "https://libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.tEXt",
      claim: "A PNG tEXt chunk is a Latin-1 keyword, null separator and textual value protected by the ordinary PNG chunk CRC.",
    },
  ],
  adoptedContract: {
    carrier: "PNG",
    chunkType: "tEXt",
    keyword: "chara",
    valueEncoding: "base64_of_utf8_character_card_json",
    cardSpec: "chara_card_v2",
    cardSpecVersion: "2.0",
  },
  projectDStrictness: {
    exactlyOneCharaChunk: true,
    canonicalBase64Only: true,
    fatalUtf8Decoding: true,
    verifyEveryChunkCrc: true,
    boundedInputChunkPayloadAndDimensions: true,
    preserveUnknownAncillaryChunks: true,
    externalPromptsRemainQuarantined: true,
    sealedProjectDCardRequiresTransportBindingV2: true,
    oldV1JsonAdapterRemainsFrozen: true,
  },
  authority: {
    changesOfficialGameData: false,
    changesRules: false,
    canMutateRoom: false,
    canCreateTrainingTruth: false,
  },
};

export const CHARACTER_CARD_V2_PNG_STANDARD_BINDING_V1 = Object.freeze({
  ...unsigned,
  bindingHash: hashStarcraftTmgContract(unsigned),
});
