import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1 } from
  "./planned-preset-revision-output-v1.mjs";

// The selected Agent-built list and its Rules-checked arrival schedule are
// immutable during a cited final-plan repair. This is a distinct contract
// from the preset-roster arm even though its public revision fields match.
const schema = structuredClone(
  PLANNED_PRESET_REPAIR_OUTPUT_CONTRACT_V1.providerSchema);
schema.description = "Repair a selected Agent-built roster plan against "
  + "cited final-plan findings. Keep the selected roster and every first "
  + "arrival round unchanged; revise only public strategy sections.";

const ref = (name) => Object.freeze({
  id: `agent-scheduled-plan-repair-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(`agent-scheduled-plan-repair-v1:${name}`),
});

export const AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.agent_scheduled.repair.v1",
    version: "1.0.0",
    schemaName: "roster_agent_scheduled_repair_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties),
    hostOwnedFields: [],
    mapperRef: ref("normalize_public_output"),
    semanticValidatorRef: ref("validate_locked_schedule_repair"),
    description: "Cited public plan repair with an immutable selected "
      + "Agent roster and Rules-checked first-arrival schedule.",
  });

assertStarcraftTmgOutputContractV1(
  AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1);

export const AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    AGENT_SCHEDULED_REPAIR_OUTPUT_CONTRACT_V1);
