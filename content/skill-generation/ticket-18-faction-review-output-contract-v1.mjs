import { hashStarcraftTmgContract } from
  "../../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1 } from
  "../../packages/structured-generation/output-contract-registry-v1.mjs";
import { seal } from "../../packages/skill-production/common.mjs";

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

const verdictReasonV2 = Object.freeze({
  type: "string",
  minLength: 1,
  maxLength: 800,
});

// V1 remains immutable for historical replay. V2 relaxes only the reviewer
// verdict explanation envelope after three real 403-character responses
// proved the original 400-character limit to be an artificial boundary. The
// whole response remains bounded by the execution policy, and coverage reasons
// retain the V1 400-character limit.
export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2 =
  createStarcraftTmgOutputContractV1({
    id: "starcraft-tmg.faction-target-review",
    version: "2026.09.07.2",
    schemaName: "faction_target_review_v2",
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
              reason: verdictReasonV2,
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
    description: "V2 target-bound faction verdicts with a realistic bounded verdict explanation; target/source identities remain host-owned and semantic acceptance remains downstream.",
  });

export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V2 =
  outputContractRefStarcraftTmgV1(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2);

function schemaWithVerdictLimit(value, maximum) {
  const copy = structuredClone(value);
  copy.properties.verdicts.items.properties.reason.maxLength = maximum;
  return copy;
}

function stableContractBody(value) {
  const { version, schemaName, providerSchema, description, contractHash,
    ...body } = value;
  return body;
}

if (STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1.hash
    !== "ac4f185c7c8dc7ae13f49036dc771939a5e321687b19ef93506ec76febbef5a8"
  || hashStarcraftTmgContract(stableContractBody(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1))
    !== hashStarcraftTmgContract(stableContractBody(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2))
  || hashStarcraftTmgContract(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V1.providerSchema)
    !== hashStarcraftTmgContract(schemaWithVerdictLimit(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.providerSchema, 400))) {
  throw new TypeError("Faction review V1 to V2 contract migration drift");
}

export const STARCRAFT_TMG_FACTION_REVIEW_CONTRACT_MIGRATION_V1_TO_V2 = seal({
  version: "faction_review_output_contract_migration_v1_to_v2",
  from: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V1,
  to: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V2,
  changes: [{
    path: "$.properties.verdicts.items.properties.reason.maxLength",
    before: 400,
    after: 800,
    kind: "bounded_string_envelope_relaxation",
  }],
  unchangedSchemaHashAfterReset: hashStarcraftTmgContract(
    schemaWithVerdictLimit(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.providerSchema, 400)),
  hostOwnedFieldsChanged: false,
  semanticValidatorChanged: false,
  mapperChanged: false,
  oldContractFrozen: true,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});

// V2 also remains immutable for historical replay. V3 aligns the transport
// envelope with validateFactionReviewV1's existing 1,200-character reason
// boundary after actual complete reasons measured 1,265/1,022/954/854 chars.
// All identity, focus, source, coverage and semantic-validation contracts stay
// unchanged; the 4,096-token response policy remains the outer capacity bound.
export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3 =
  createStarcraftTmgOutputContractV1({
    id: "starcraft-tmg.faction-target-review",
    version: "2026.09.07.3",
    schemaName: "faction_target_review_v3",
    providerSchema: schemaWithVerdictLimit(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.providerSchema, 1_200),
    modelOwnedFields:
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.modelOwnedFields,
    hostOwnedFields:
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.hostOwnedFields,
    mapperRef: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.mapperRef,
    semanticValidatorRef:
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.semanticValidatorRef,
    description: "V3 target-bound faction verdicts aligned to the existing final 1,200-character review-reason boundary; target/source identities remain host-owned and semantic acceptance remains downstream.",
  });

export const STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V3 =
  outputContractRefStarcraftTmgV1(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3);

if (STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V2.hash
    !== "00acc1f9562701e799e4e4056a5f30feb772b30bd34b0b146f815281c4a20315"
  || hashStarcraftTmgContract(stableContractBody(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2))
    !== hashStarcraftTmgContract(stableContractBody(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3))
  || hashStarcraftTmgContract(
    STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V2.providerSchema)
    !== hashStarcraftTmgContract(schemaWithVerdictLimit(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3.providerSchema, 800))) {
  throw new TypeError("Faction review V2 to V3 contract migration drift");
}

export const STARCRAFT_TMG_FACTION_REVIEW_CONTRACT_MIGRATION_V2_TO_V3 = seal({
  version: "faction_review_output_contract_migration_v2_to_v3",
  from: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V2,
  to: STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V3,
  changes: [{
    path: "$.properties.verdicts.items.properties.reason.maxLength",
    before: 800,
    after: 1_200,
    kind: "bounded_string_envelope_alignment",
  }],
  observedCompleteReasonLengths: [1_265, 1_022, 954, 854],
  downstreamReasonMaximum: 1_200,
  unchangedSchemaHashAfterReset: hashStarcraftTmgContract(
    schemaWithVerdictLimit(
      STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V3.providerSchema, 800)),
  hostOwnedFieldsChanged: false,
  semanticValidatorChanged: false,
  mapperChanged: false,
  oldContractFrozen: true,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});
