// One opt-in, locked-roster revision round. Existing Agent and initial preset
// output contracts remain readable without adding a field to their replies.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "./roster-strategist-output-schemas-v1.mjs";

const schema = structuredClone(rosterStrategistRoundOutputContractV1(
  "revision").providerSchema);
schema.properties.openingDeploymentSchedule = {
  // The strict transport subset permits 128 rows. Larger legal rosters
  // require a chunked schedule contract; they must not be truncated.
  type: "array", minItems: 1, maxItems: 128,
  description: "One entry for every locked roster Unit, exactly once. "
    + "Choose the first round in which to deploy it. The Rules-owned "
    + "per-round on-table Supply audit will check cumulative feasibility; "
    + "do not claim geometry or path legality here.",
  items: {
    type: "object", additionalProperties: false,
    properties: {
      round: { type: "integer", minimum: 1, maximum: 20 },
      unitInstanceId: { type: "string", minLength: 1, maxLength: 256,
        description: "Copy an existing unitInstanceId from the locked roster." },
      publicReasonText: { type: "string", minLength: 1, maxLength: 10000 },
    },
    required: ["round", "unitInstanceId", "publicReasonText"],
  },
};
schema.required = [...schema.required, "openingDeploymentSchedule"];
schema.description = "Revise public strategy for the immutable preset roster "
  + "and propose a complete round-scoped deployment schedule. The model "
  + "cannot alter the roster or any Rules-owned Supply value.";

const ref = (name) => Object.freeze({
  id: `planned-preset-revision-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(`planned-preset-revision-v1:${name}`),
});

export const PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.planned_preset.revision.v1",
    version: "1.0.0",
    schemaName: "roster_preset_plan_revision_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties),
    hostOwnedFields: [],
    mapperRef: ref("normalize_public_output"),
    semanticValidatorRef: ref("validate_preset_revision_and_supply"),
    description: "Strict public plan revision and complete round-scoped "
      + "deployment choices for one immutable Rules-audited preset roster.",
  });

assertStarcraftTmgOutputContractV1(
  PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1);

export const PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    PLANNED_PRESET_REVISION_OUTPUT_CONTRACT_V1);

// A later repair does not ask the model to choose the already Rules-checked
// arrival schedule again. It may revise public strategy and named component
// purposes while the host preserves the immutable roster and schedule.
const repairSchema = structuredClone(rosterStrategistRoundOutputContractV1(
  "revision").providerSchema);
repairSchema.properties.componentPurposeRevisions = {
  type: "array", minItems: 0, maxItems: 128,
  items: {
    type: "object", additionalProperties: false,
    properties: {
      componentKind: { type: "string", minLength: 4, maxLength: 13,
        enum: ["faction_card", "tactical_card", "unit", "composition",
          "upgrade"] },
      instanceId: { type: "string", minLength: 1, maxLength: 256 },
      publicPurposeText: { type: "string", minLength: 1,
        maxLength: 65536 },
    },
    required: ["componentKind", "instanceId", "publicPurposeText"],
  },
};
repairSchema.required = [...repairSchema.required,
  "componentPurposeRevisions"];
repairSchema.description = "Repair public strategy in an already revised "
  + "locked roster plan. The Rules-owned arrival schedule is immutable and "
  + "does not appear in this model output.";

export const PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.planned_preset.repair.v1",
    version: "1.0.0",
    schemaName: "roster_preset_plan_repair_v1",
    providerSchema: repairSchema,
    modelOwnedFields: Object.keys(repairSchema.properties),
    hostOwnedFields: [],
    mapperRef: ref("repair_public_output"),
    semanticValidatorRef: ref("validate_preset_repair"),
    description: "Public plan-only repair with host-locked roster and "
      + "arrival schedule; model may replace named component prose only.",
  });

assertStarcraftTmgOutputContractV1(
  PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1);

export const PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1);
