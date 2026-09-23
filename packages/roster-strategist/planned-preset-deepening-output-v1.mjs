import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  assertStarcraftTmgOutputContractV1,
  createStarcraftTmgOutputContractV1,
  outputContractRefStarcraftTmgV1,
} from "../structured-generation/output-contract-registry-v1.mjs";
import { rosterStrategistRoundOutputContractV1 } from
  "./roster-strategist-output-schemas-v1.mjs";

export const PLANNED_PRESET_DEEPENING_ROUND_KIND =
  "preset_plan_deepening";

// The legacy comparison schema is frozen. This opt-in derivative preserves
// its full component/deployment/resource field semantics but removes the
// candidate-selection field altogether. No model response can select a list.
const schema = structuredClone(rosterStrategistRoundOutputContractV1(
  "comparison_selection").providerSchema);
delete schema.properties.comparison;
schema.required = schema.required.filter((key) => key !== "comparison");
schema.properties.roundKind = {
  ...schema.properties.roundKind,
  minLength: PLANNED_PRESET_DEEPENING_ROUND_KIND.length,
  maxLength: PLANNED_PRESET_DEEPENING_ROUND_KIND.length,
  enum: [PLANNED_PRESET_DEEPENING_ROUND_KIND],
};
schema.properties.componentPurposes.items.properties.instanceId.description =
  "Copy the exact instance identity from the sealed fixed roster: "
  + "faction_card -> <sideKey>-faction; tactical_card -> "
  + "<sideKey>-tactical-<n>; unit -> its existing unitInstanceId (not "
  + "agent-unit-<n>); composition -> <unitInstanceId>-composition; "
  + "upgrade -> <unitInstanceId>-upgrade-<n>. Never rename a unit.";
schema.properties.deploymentConcept.properties.activationOrder.items
  .properties.unitInstanceId.description =
  "Copy an existing unitInstanceId from the sealed fixed roster exactly; "
  + "never synthesize an agent-unit-<n> identity.";
schema.properties.resourceUtilization.properties
  .nearCapCandidateAvailable.description =
  "Copy whether the one immutable Rules-verified roster is near-cap. "
  + "There are no alternative candidates in this planning mode.";
schema.properties.resourceUtilization.properties
  .selectedCandidateNearCap.description =
  "Copy the immutable roster near-cap value; no candidate is selected.";
schema.description = "Deepen the plan for one Rules-verified, immutable preset "
  + "roster. No list generation, comparison or candidate selection.";

const ref = (name) => Object.freeze({
  id: `planned-preset-deepening-v1.${name}`,
  version: "1.0.0",
  hash: hashStarcraftTmgContract(`planned-preset-deepening-v1:${name}`),
});

export const PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1 =
  createStarcraftTmgOutputContractV1({
    id: "ticket27.planned_preset.deepening.v1",
    version: "1.0.0",
    schemaName: "roster_preset_plan_deepening_v1",
    providerSchema: schema,
    modelOwnedFields: Object.keys(schema.properties),
    hostOwnedFields: [],
    mapperRef: ref("normalize_public_output"),
    semanticValidatorRef: ref("validate_preset_deepening"),
    description: "Strict public plan deepening for a locked, Rules-verified "
      + "preset roster. The output never chooses or changes models.",
  });

assertStarcraftTmgOutputContractV1(
  PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1);

export const PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_REF_V1 =
  outputContractRefStarcraftTmgV1(
    PLANNED_PRESET_DEEPENING_OUTPUT_CONTRACT_V1);
