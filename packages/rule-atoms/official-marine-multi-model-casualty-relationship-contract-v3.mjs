import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION,
} from "./official-close-combat-attack-executor-v8.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
} from "./official-marine-multi-model-casualty-close-combat-executor-v3.mjs";
import {
  createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2,
} from "./official-marine-multi-model-stimpack-close-combat-relationship-contract-v2.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-47-marine-multi-model-casualty-resolution";

const SLICE_46_CATALOGUE_HASH =
  "89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b";
const SLICE_46_RUNTIME_HASH =
  "5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code) {
  throw new Error(code);
}

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialMarineMultiModelCasualtyRelationshipExtensionV3(
  input = {},
) {
  const catalogueHash = String(input.catalogueHash || "").trim();
  const runtimeHash = String(input.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(catalogueHash) || !HASH_PATTERN.test(runtimeHash)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_RELEASE_HASH_REQUIRED");
  }
  const previous = createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2({
    catalogueHash: SLICE_46_CATALOGUE_HASH,
    runtimeHash: SLICE_46_RUNTIME_HASH,
  });
  const id = {
    part8Casualty:
      "official_document:rules-v48.part8.damage-and-casualty-priority",
    part12Casualty:
      "official_document:rules-v48.part12.casualty-engagement-preservation",
    currentModels: "state_field:pieces[].currentModels",
    currentSupply: "state_field:pieces[].currentSupply",
    destroyedModelIds: "state_field:pieces[].destroyedModelIds",
    damageMarker: "state_field:pieces[].damageMarker",
    modelPositions: "state_field:pieces[].models[].position",
    combatActivation: "state_field:pieces[].activatedPhases.combat",
    activeSide: "state_field:activeSideKey",
    modelLedger: "derived_value:marine.modelLedger",
    engagementGraph: "derived_value:officialEngagementGraphV2",
    visibilityDomain: "derived_value:marine.targetVisibleModelIdsV1",
    totalDamage: "derived_value:marine.multiModelTotalDamageV1",
    casualtyDomain:
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
    casualtySelection: "derived_value:marine.multiModelCasualtySelectionV1",
    casualtyPending: "state_field:pendingAction.marineMultiModelCasualtyV1",
    casualtyResolution: "derived_value:marine.multiModelCasualtyResolutionV1",
    postEngagementGraph:
      "derived_value:marine.postCasualtyOfficialEngagementGraphV2",
    casualtyTest:
      "judge_test:marine-multi-model-defender-casualty-priority-and-writeback",
    staleTest:
      "judge_test:marine-multi-model-casualty-ledger-geometry-stale-domain",
    twoSeatReplayTest:
      "judge_test:marine-multi-model-authority-v15-three-stage-two-seat-replay",
    relationshipGapTest:
      "judge_test:marine-multi-model-casualty-relationship-negative-gap-gate",
    previousSliceRelease:
      "slice_release:slice-46-marine-multi-model-stimpack-close-combat-v2",
    currentSliceRelease:
      "slice_release:slice-47-marine-multi-model-casualty-resolution-v3",
    previousCatalogueRelease:
      `catalogue_release:slice-46@${SLICE_46_CATALOGUE_HASH}`,
    currentCatalogueRelease: `catalogue_release:slice-47@${catalogueHash}`,
    previousRuntimeRelease: `runtime_release:slice-46@${SLICE_46_RUNTIME_HASH}`,
    currentRuntimeRelease: `runtime_release:slice-47@${runtimeHash}`,
  };
  const executor =
    `executor:${OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID}`
      + `@${OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION}`;
  const closeCombatV8Executor =
    `executor:${OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID}`
      + `@${OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_VERSION}`;
  const tests = [
    id.casualtyTest,
    id.staleTest,
    id.twoSeatReplayTest,
    id.relationshipGapTest,
  ];
  const nodes = [
    node(id.part8Casualty, "official_characteristic",
      "Part 8 total damage, visibility cap, and engaged casualty priority"),
    node(id.part12Casualty, "official_characteristic",
      "Part 12 specific enemy engagement preservation"),
    node(id.activeSide, "state_field", "Current authority action seat"),
    node(id.visibilityDomain, "derived_value", "Visible active target models"),
    node(id.totalDamage, "derived_value", "Prior marker plus incoming damage"),
    node(id.casualtyDomain, "parameter_domain", "Ordered legal casualty selections"),
    node(id.casualtySelection, "derived_value", "Hash-bound defender casualty selection"),
    node(id.casualtyPending, "state_field", "Defender-owned casualty pending action"),
    node(id.casualtyResolution, "derived_value", "Applied casualty and damage resolution"),
    node(id.postEngagementGraph, "derived_value", "Post-casualty engagement graph"),
    node(id.casualtyTest, "judge_test", "Priority, choice ownership, ledger and Supply writeback"),
    node(id.staleTest, "judge_test", "Ledger or geometry drift rejects pending casualty choice"),
    node(id.twoSeatReplayTest, "judge_test", "Authority v15 two-seat signed replay"),
    node(id.relationshipGapTest, "judge_test", "Missing casualty relationship blocks freeze"),
    node(id.currentSliceRelease, "slice_release", "Slice 47 casualty resolution release"),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 47 catalogue ${catalogueHash}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 47 runtime ${runtimeHash}`),
  ];
  const relations = [
    edge(executor, "reads", id.modelLedger, "casualty_v3_state_contract"),
    edge(executor, "reads", id.engagementGraph, "casualty_v3_state_contract"),
    edge(executor, "reads", id.visibilityDomain, "casualty_v3_state_contract"),
    edge(executor, "reads", id.damageMarker, "casualty_v3_state_contract"),
    edge(executor, "reads", id.modelPositions, "casualty_v3_state_contract"),
    edge(executor, "writes", id.casualtyPending, "casualty_v3_state_contract"),
    edge(executor, "writes", id.activeSide, "casualty_v3_state_contract"),
    edge(executor, "writes", id.currentModels, "casualty_v3_state_contract"),
    edge(executor, "writes", id.currentSupply, "casualty_v3_state_contract"),
    edge(executor, "writes", id.destroyedModelIds, "casualty_v3_state_contract"),
    edge(executor, "writes", id.damageMarker, "casualty_v3_state_contract"),
    edge(executor, "writes", id.combatActivation, "casualty_v3_state_contract"),
    edge(closeCombatV8Executor, "reads", id.modelPositions, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "reads", id.engagementGraph, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "reads", id.damageMarker, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "writes", id.damageMarker, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "writes", id.currentModels, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "writes", id.destroyedModelIds, "close_combat_v8_state_contract"),
    edge(closeCombatV8Executor, "writes", id.combatActivation, "close_combat_v8_state_contract"),
    edge(id.part8Casualty, "defines", id.totalDamage, "official_part8_damage_source"),
    edge(id.part8Casualty, "defines", id.visibilityDomain, "official_part8_visibility_source"),
    edge(id.part8Casualty, "defines", id.casualtyDomain, "official_part8_priority_source"),
    edge(id.part12Casualty, "constrains", id.casualtyDomain,
      "official_part12_engagement_preservation"),
    edge(id.totalDamage, "parameterized_by", id.casualtyDomain, "casualty_count_formula"),
    edge(id.visibilityDomain, "constrains", id.casualtyDomain, "unengaged_visibility_cap"),
    edge(id.engagementGraph, "constrains", id.casualtyDomain, "engaged_priority_tiers"),
    edge(id.modelLedger, "constrains", id.casualtyDomain, "active_target_ledger"),
    edge(id.casualtyDomain, "writes", id.casualtyPending, "defender_choice_open"),
    edge(id.casualtyDomain, "parameterized_by", id.casualtySelection,
      "ordered_selection_choice"),
    edge(id.casualtySelection, "derives", id.casualtyResolution,
      "hash_bound_casualty_apply"),
    edge(id.casualtyResolution, "writes", id.currentModels, "casualty_ledger_writeback"),
    edge(id.casualtyResolution, "writes", id.currentSupply, "supply_tier_writeback"),
    edge(id.casualtyResolution, "writes", id.destroyedModelIds, "destroyed_ledger_writeback"),
    edge(id.casualtyResolution, "writes", id.damageMarker, "residual_damage_writeback"),
    edge(id.casualtyResolution, "derives", id.postEngagementGraph,
      "post_casualty_engagement_rederive"),
    edge(id.modelLedger, "invalidates", id.casualtyDomain, "casualty_ledger_stale_domain"),
    edge(id.modelPositions, "invalidates", id.engagementGraph, "casualty_geometry_stale_domain"),
    edge(id.engagementGraph, "invalidates", id.casualtyDomain,
      "casualty_geometry_stale_domain"),
    edge(id.casualtyDomain, "verified_by", id.casualtyTest, "slice47_judge_test"),
    edge(id.modelLedger, "verified_by", id.staleTest, "slice47_judge_test"),
    edge(id.modelPositions, "verified_by", id.staleTest, "slice47_judge_test"),
    edge(id.casualtyResolution, "verified_by", id.twoSeatReplayTest, "slice47_judge_test"),
    edge(id.currentSliceRelease, "verified_by", id.relationshipGapTest, "slice47_judge_test"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease,
      "slice47_version_ancestry"),
    edge(id.previousCatalogueRelease, "superseded_by", id.currentCatalogueRelease,
      "slice47_catalogue_ancestry"),
    edge(id.previousRuntimeRelease, "superseded_by", id.currentRuntimeRelease,
      "slice47_runtime_ancestry"),
  ];
  const requiredEdges = relations.filter((relation) => [
    "official_part8_damage_source",
    "official_part8_visibility_source",
    "official_part8_priority_source",
    "official_part12_engagement_preservation",
    "casualty_count_formula",
    "unengaged_visibility_cap",
    "engaged_priority_tiers",
    "active_target_ledger",
    "defender_choice_open",
    "ordered_selection_choice",
    "hash_bound_casualty_apply",
    "casualty_ledger_writeback",
    "supply_tier_writeback",
    "destroyed_ledger_writeback",
    "residual_damage_writeback",
    "post_casualty_engagement_rederive",
    "casualty_ledger_stale_domain",
    "casualty_geometry_stale_domain",
    "slice47_version_ancestry",
    "slice47_catalogue_ancestry",
    "slice47_runtime_ancestry",
  ].includes(relation.provenance));
  return {
    nodes: [...previous.nodes, ...nodes],
    edges: [...previous.edges, ...relations],
    executorLineages: [
      ...previous.executorLineages,
      {
        executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        ruleAtomIds: [
          ...OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
        ],
        provenance: "runtime_action_lineage:marine_multi_model_casualty_close_combat_v3",
      },
    ],
    declaredStateContractExecutorIds: [
      ...previous.declaredStateContractExecutorIds,
      OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ID,
      OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    coverageScopes: [
      ...previous.coverageScopes,
      {
        scopeId: `${OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_SCOPE_ID}:combat-v3`,
        executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
        requiredNodeIds: [
          id.part8Casualty,
          id.part12Casualty,
          id.modelLedger,
          id.engagementGraph,
          id.casualtyDomain,
          id.casualtySelection,
          id.casualtyResolution,
          id.postEngagementGraph,
          ...tests,
        ],
        requiredEdges,
        requiredPaths: [
          {
            from: id.part8Casualty,
            to: id.casualtyTest,
            relationships: ["defines", "constrains", "parameterized_by", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.part12Casualty,
            to: id.twoSeatReplayTest,
            relationships: ["constrains", "parameterized_by", "derives", "verified_by"],
            maxDepth: 5,
          },
          {
            from: id.modelPositions,
            to: id.staleTest,
            relationships: ["invalidates", "verified_by"],
            maxDepth: 4,
          },
          {
            from: id.casualtyResolution,
            to: id.postEngagementGraph,
            relationships: ["derives"],
            maxDepth: 1,
          },
        ],
        forbiddenPaths: [],
        evidenceTestNodeIds: tests,
      },
    ],
  };
}
