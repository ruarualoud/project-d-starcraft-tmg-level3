import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1 } from
  "../../packages/structured-generation/output-contract-registry-v1.mjs";

const shortText = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 400,
});

const sourceSlots = Object.freeze({
  type: "array",
  items: { type: "integer", minimum: 0, maximum: 511 },
  minItems: 1,
  maxItems: 8,
  uniqueItems: true,
});

export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "starcraft-tmg.faction-target-review",
    version: "2026.09.06.1",
    schemaName: "faction_target_review_v1",
    providerSchema: {
      type: "object",
      properties: {
        verdicts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              targetSlot: { type: "integer", minimum: 0, maximum: 1 },
              focus: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    path: { type: "string", minLength: 1, maxLength: 100 },
                    quote: { type: "string", minLength: 8, maxLength: 240 },
                  },
                  required: ["path", "quote"],
                  additionalProperties: false,
                },
                minItems: 1,
                maxItems: 16,
              },
              verdict: {
                type: "string",
                minLength: 9,
                maxLength: 11,
                enum: ["supported", "unsupported", "uncertain"],
              },
              reason: shortText,
              sourceSlots,
            },
            required: [
              "targetSlot", "focus", "verdict", "reason", "sourceSlots",
            ],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 2,
        },
        coverage: {
          type: "array",
          items: {
            type: "object",
            properties: {
              coverageSlot: { type: "integer", minimum: 0, maximum: 4 },
              verdict: {
                type: "string",
                minLength: 7,
                maxLength: 9,
                enum: ["covered", "omitted", "uncertain"],
              },
              recommendationIndices: {
                type: "array",
                items: { type: "integer", minimum: 0, maximum: 7 },
                minItems: 0,
                maxItems: 8,
                uniqueItems: true,
              },
              reason: shortText,
            },
            required: [
              "coverageSlot", "verdict", "recommendationIndices", "reason",
            ],
            additionalProperties: false,
          },
          minItems: 0,
          maxItems: 5,
        },
      },
      required: ["verdicts", "coverage"],
      additionalProperties: false,
    },
    modelOwnedFields: ["verdicts", "coverage"],
    hostOwnedFields: [
      "targetId", "title", "sourceRef", "sourceCatalogue",
      "coverageSourceCatalogue", "acceptanceStatus", "publicationStatus",
    ],
    mapperRef: {
      id: "faction_target_review_host_identity_materialization",
      version: "v1",
      hash: hashStarcraftTmgContract(
        "faction_target_review_host_identity_materialization_v1"),
    },
    semanticValidatorRef: {
      id: "validateTargetedFactionReviewV1",
      version: "v1",
      hash: hashStarcraftTmgContract(
        "validateTargetedFactionReviewV1-after-host-slot-materialization-v1"),
    },
    description: "One or two target-bound faction verdicts; target/source identities remain host-owned slots and semantic acceptance remains downstream.",
  });

export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1);
