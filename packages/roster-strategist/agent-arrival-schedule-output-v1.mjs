import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "./roster-strategist-output-schemas-v1.mjs";
import { PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1 } from
  "./planned-preset-revision-output-v1.mjs";

export const AGENT_ARRIVAL_SCHEDULE_ROUND_KIND = "arrival_schedule";

const revision = rosterStrategistRoundOutputContractV1("revision")
  .providerSchema;
const presetRevision = PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1
  .providerSchema;
const arrivalEntries = structuredClone(
  presetRevision.properties.openingDeploymentSchedule);
arrivalEntries.items.properties.publicReasonText.maxLength = 65_536;
const schema = {
  type: "object", additionalProperties: false,
  description: "Choose a complete first-arrival round for every Unit in the "
    + "already selected Rules-legal Agent roster, then align public "
    + "deployment prose. No roster, Supply or geometry edits.",
  properties: {
    schemaVersion: structuredClone(revision.properties.schemaVersion),
    roundKind: {
      type: "string", minLength: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND.length,
      maxLength: AGENT_ARRIVAL_SCHEDULE_ROUND_KIND.length,
      enum: [AGENT_ARRIVAL_SCHEDULE_ROUND_KIND],
    },
    openingDeploymentSchedule: arrivalEntries,
    revisedDeploymentConcept: structuredClone(
      revision.properties.revisedDeploymentConcept),
    publicSummaryText: structuredClone(
      revision.properties.publicSummaryText),
  },
  required: ["schemaVersion", "roundKind", "openingDeploymentSchedule",
    "revisedDeploymentConcept", "publicSummaryText"],
};

const componentRef = (name) => Object.freeze({
  id: `agent-arrival-schedule-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(`agent-arrival-schedule-v1:${name}`),
});

export const AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.agent_arrival_schedule.v1",
    version: "1.0.0",
    schemaName: "roster_agent_arrival_schedule_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties),
    hostOwnedFields: [],
    mapperRef: componentRef("normalize_public_output"),
    semanticValidatorRef: componentRef("rules_supply_and_plan_alignment"),
    description: "Separate model-chosen round-scoped arrivals for an "
      + "already selected Agent list; Rules own all numeric feasibility.",
  });

assertStarcraftTmgOutputContractV1(
  AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1);

export const AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1);
