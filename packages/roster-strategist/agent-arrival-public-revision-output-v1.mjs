import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgOutputContractV1,
  assertStarcraftTmgOutputContractV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1 } from
  "./agent-arrival-schedule-output-v1.mjs";

export const AGENT_ARRIVAL_PUBLIC_REVISION_ROUND_KIND =
  "arrival_public_revision";
const source = AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1.providerSchema;
const schema = {
  type: "object", additionalProperties: false,
  properties: {
    schemaVersion: structuredClone(source.properties.schemaVersion),
    roundKind: { type: "string",
      minLength: AGENT_ARRIVAL_PUBLIC_REVISION_ROUND_KIND.length,
      maxLength: AGENT_ARRIVAL_PUBLIC_REVISION_ROUND_KIND.length,
      enum: [AGENT_ARRIVAL_PUBLIC_REVISION_ROUND_KIND] },
    revisedDeploymentConcept: structuredClone(
      source.properties.revisedDeploymentConcept),
    publicSummaryText: structuredClone(source.properties.publicSummaryText),
  },
  required: ["schemaVersion", "roundKind", "revisedDeploymentConcept",
    "publicSummaryText"],
};
const ref = (name) => ({ id: `agent-arrival-public-revision-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(`agent-arrival-public-revision-v1:${name}`) });
export const AGENT_ARRIVAL_PUBLIC_REVISION_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.agent_arrival_public_revision.v1", version: "1.0.0",
    schemaName: "roster_agent_arrival_public_revision_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties), hostOwnedFields: [],
    mapperRef: ref("public_output"),
    semanticValidatorRef: ref("roster_unit_identity"),
    description: "Correct public deployment prose and unit references "
      + "without resubmitting or changing a Rules-audited arrival schedule.",
  });
assertStarcraftTmgOutputContractV1(
  AGENT_ARRIVAL_PUBLIC_REVISION_OUTPUT_CONTRACT_V1);
