import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1 } from
  "../../packages/structured-generation/output-contract-registry-v1.mjs";

const boundedText = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 1600,
});

const boundedTextList = Object.freeze({
  type: "array",
  items: boundedText,
  minItems: 1,
  maxItems: 16,
});

export const STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "starcraft-tmg.faction-advice-editor",
    version: "2026.09.06.1",
    schemaName: "faction_advice_editor_v1",
    providerSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1, maxLength: 200 },
        when: boundedTextList,
        procedure: boundedTextList,
        alternatives: boundedTextList,
        risk: boundedText,
        reviseIf: boundedTextList,
        sourceRefs: {
          type: "array",
          items: { type: "string", minLength: 1, maxLength: 200 },
          minItems: 1,
          maxItems: 8,
          uniqueItems: true,
        },
        unproven: boundedTextList,
      },
      required: [
        "title", "when", "procedure", "alternatives", "risk", "reviseIf",
        "sourceRefs", "unproven",
      ],
      additionalProperties: false,
    },
    modelOwnedFields: [
      "title", "when", "procedure", "alternatives", "risk", "reviseIf",
      "sourceRefs", "unproven",
    ],
    hostOwnedFields: [
      "index", "parentHash", "issueRoute", "replacements", "additions",
      "revision", "acceptanceStatus", "publicationStatus",
    ],
    mapperRef: {
      id: "faction_local_editor_host_scope_materialization",
      version: "v1",
      hash: hashStarcraftTmgContract(
        "faction_local_editor_host_scope_materialization_v1"),
    },
    semanticValidatorRef: {
      id: "validateFactionDraftV1.single-advice",
      version: "v1",
      hash: hashStarcraftTmgContract(
        "validateFactionDraftV1-single-advice-source-bound-v1"),
    },
    description: "One model-authored faction advice body; all workflow control fields remain host-owned.",
  });

export const STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1);
