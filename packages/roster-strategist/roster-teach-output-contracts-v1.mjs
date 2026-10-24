import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "./roster-strategist-output-schemas-v1.mjs";

export const ROSTER_TEACH_GENERATION_SCHEMA =
  "starcraft_tmg_roster_teach_generation_v1";

const str = (minLength = 1, maxLength = 65_536) => ({
  type: "string", minLength, maxLength,
});
const id = () => str(1, 200);
const closed = (properties) => ({ type: "object", properties,
  required: Object.keys(properties), additionalProperties: false });
const choice = (values) => ({ type: "string",
  minLength: Math.min(...values.map((value) => value.length)),
  maxLength: Math.max(...values.map((value) => value.length)), enum: values });
const constant = (value) => choice([value]);
const envelope = (kind) => ({
  schemaVersion: constant(ROSTER_TEACH_GENERATION_SCHEMA),
  roundKind: constant(kind),
});

const foundationSchema = rosterStrategistRoundOutputContractV1(
  "strategy_foundation").providerSchema;
const toolRequestSchema = foundationSchema.properties.informationNeeds
  .items.properties.toolRequest;

const schemas = {
  teach_challenge: closed({
    ...envelope("teach_challenge"),
    challenges: { type: "array", minItems: 1, maxItems: 4,
      items: closed({
        challengeId: id(),
        targetKind: choice(["score_route", "opponent_hypothesis",
          "counter_response", "invalidation_trigger"]),
        targetId: id(),
        claimText: str(),
        questionText: str(),
        falsificationText: str(),
        evidenceRequest: closed({
          kind: choice(["probability", "spatial", "map_route", "math",
            "threat_exchange", "scenario"]),
          toolRequest: toolRequestSchema,
        }),
      }),
    },
  }),
  teach_revision: closed({
    ...envelope("teach_revision"),
    revisedFoundation: foundationSchema,
    answers: { type: "array", minItems: 1, maxItems: 4,
      items: closed({
        challengeId: id(),
        disposition: choice(["retain", "revise", "unresolved"]),
        publicReason: str(),
        evidenceRefs: { type: "array", minItems: 0, maxItems: 16,
          items: str(64, 64) },
        replanTrigger: str(0),
        revisedClaimText: str(0),
      }),
    },
  }),
};

const componentRef = (kind, part) => Object.freeze({
  id: `ticket27.roster_teach.${kind}.${part}.v1`,
  version: "1.0.4",
  hash: hashStarcraftTmgContract(
    `ticket27.roster_teach.${kind}.${part}.v1`),
});
const contracts = Object.fromEntries(Object.entries(schemas).map(
  ([kind, providerSchema]) => [kind, createStarcraftTmgOutputContractV1({
    id: `ticket27.roster_teach.${kind}.v1`,
    version: "1.0.4",
    schemaName: `roster_${kind}_v1`,
    providerSchema,
    modelOwnedFields: Object.keys(providerSchema.properties),
    hostOwnedFields: [],
    mapperRef: componentRef(kind, "decode"),
    semanticValidatorRef: componentRef(kind, "verify"),
    description: `Strict public ${kind} generation fields; semantic and `
      + "Rules checks remain separate and authoritative.",
  })]));

export function rosterTeachOutputContractV1(kind) {
  const contract = contracts[kind];
  if (!contract) throw new Error("ROSTER_TEACH_OUTPUT_KIND_UNKNOWN");
  return contract;
}

export function rosterTeachOutputContractRefV1(kind) {
  return outputContractRefStarcraftTmgV1(rosterTeachOutputContractV1(kind));
}
