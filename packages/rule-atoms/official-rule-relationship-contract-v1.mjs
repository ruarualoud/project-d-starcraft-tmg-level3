import {
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
} from "./official-marine-optional-stimpack-move-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
} from "./official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
} from "./official-stimpack-lifecycle-executors-v1.mjs";

export const OFFICIAL_RULE_RELATIONSHIP_SCOPE_ID =
  "ticket-11-slice-43-marine-scale-aware-optional-stimpack-move";

const PREVIOUS_SLICE_HASH =
  "b9e6fc60ba92f75dc1b0467e9599c2b392dfb28da1b07f23a4ece794f4fa3434";
const CURRENT_CATALOGUE_HASH =
  "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede";
const CURRENT_RUNTIME_HASH =
  "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c";

export const OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1 = Object.freeze({
  casualty: "state_event:casualty_model_destroyed",
  currentModels: "state_field:pieces[].currentModels",
  maxModels: "state_field:pieces[].maxModels",
  destroyedModelIds: "state_field:pieces[].destroyedModelIds",
  modelPositions: "state_field:pieces[].models[].position",
  baseSize: "official_characteristic:baseSize",
  printedSize: "official_characteristic:Size",
  printedSplitSpeed: "official_characteristic:Speed.4/7",
  splitSpeedSelection: "derived_value:marine.splitSpeedSelection",
  geometryFootprint: "derived_value:marine.roundBaseMovementGeometry",
  visibilityHeight: "semantic_projection:effectiveSizeForVisibilityAndHeight",
  paymentCardReadiness: "state_field:cardResources[].readiness",
  paymentCardResource: "state_field:cardResources[].resource",
  damageMarker: "state_field:pieces[].damageMarker",
  statuses: "state_field:pieces[].statuses",
  effectMarkers: "state_field:board.effectMarkers",
  abilityHistory: "state_field:activeAbilityUseHistory",
  movementActivation: "state_field:pieces[].activatedPhases.movement",
  inCoherency: "state_field:pieces[].inCoherency",
  lastLeadingModelId: "state_field:pieces[].lastLeadingModelId",
  lastMovePlanHash: "state_field:pieces[].lastMovePlanHash",
  baseVariant: "action_variant:marine.base_move",
  stimpackVariant: "action_variant:marine.stimpack_move",
  moveDomain: `parameter_domain:${OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND}`,
  sizeAtom: "rule_atom:rule-atom:singleton:core-5-1-size:181a08680a53",
  effectiveSizeAtom:
    "rule_atom:rule-atom:singleton:core-11-effective-size-formula:b6981ada2b47",
  multiModelGridTest: "judge_test:marine-multi-model-base-four-stimpack-seven",
  initialSingleGridTest: "judge_test:marine-initial-single-base-seven-stimpack-ten",
  reducedSingleGridTest: "judge_test:marine-reduced-single-rederives-seven-ten",
  casualtyStaleGridTest: "judge_test:marine-casualty-invalidates-old-move-domain",
  previousSliceRelease: `slice_release:slice-42@${PREVIOUS_SLICE_HASH}`,
  currentSliceRelease: "slice_release:slice-43-rule-relationship-v1",
  previousCatalogueRelease: `catalogue_release:slice-42@${CURRENT_CATALOGUE_HASH}`,
  currentCatalogueRelease: `catalogue_release:slice-43@${CURRENT_CATALOGUE_HASH}`,
  previousRuntimeRelease: `runtime_release:slice-42@${CURRENT_RUNTIME_HASH}`,
  currentRuntimeRelease: `runtime_release:slice-43@${CURRENT_RUNTIME_HASH}`,
});

function node(nodeId, kind, label) {
  return {
    nodeId,
    kind,
    label,
    provenance: OFFICIAL_RULE_RELATIONSHIP_SCOPE_ID,
  };
}

function edge(from, relationship, to, provenance) {
  return {
    from,
    relationship,
    to,
    scopeId: OFFICIAL_RULE_RELATIONSHIP_SCOPE_ID,
    provenance,
  };
}

export function createOfficialRuleRelationshipExtensionV1() {
  const id = OFFICIAL_RULE_RELATIONSHIP_NODE_IDS_V1;
  const nodes = [
    node(id.casualty, "state_event", "A model casualty is committed"),
    node(id.currentModels, "state_field", "Current remaining model count"),
    node(id.maxModels, "state_field", "Starting maximum model count"),
    node(id.destroyedModelIds, "state_field", "Destroyed model identities"),
    node(id.modelPositions, "state_field", "Current model positions"),
    node(id.baseSize, "official_characteristic", "Official physical base size"),
    node(id.printedSize, "official_characteristic", "Printed Size characteristic"),
    node(id.printedSplitSpeed, "official_characteristic", "Printed Marine Speed 4/7"),
    node(id.splitSpeedSelection, "derived_value", "Current split-Speed branch"),
    node(id.geometryFootprint, "derived_value", "Round-base swept movement geometry"),
    node(id.visibilityHeight, "semantic_projection", "Effective Size for visibility/height"),
    node(id.paymentCardReadiness, "state_field", "Faction card readiness"),
    node(id.paymentCardResource, "state_field", "Faction card resource amount"),
    node(id.damageMarker, "state_field", "Unit damage marker"),
    node(id.statuses, "state_field", "Typed Unit statuses"),
    node(id.effectMarkers, "state_field", "Board effect markers"),
    node(id.abilityHistory, "state_field", "Per-round active ability history"),
    node(id.movementActivation, "state_field", "Movement activation marker"),
    node(id.inCoherency, "state_field", "Unit coherency state"),
    node(id.lastLeadingModelId, "state_field", "Last leading model identity"),
    node(id.lastMovePlanHash, "state_field", "Last accepted Move plan hash"),
    node(id.baseVariant, "action_variant", "Base Move branch"),
    node(id.stimpackVariant, "action_variant", "Stimpack Move branch"),
    node(id.moveDomain, "parameter_domain", OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND),
    node(id.multiModelGridTest, "judge_test", "Multi-model: base 4 / Stimpack 7"),
    node(id.initialSingleGridTest, "judge_test", "Initial singleton: base 7 / Stimpack 10"),
    node(id.reducedSingleGridTest, "judge_test", "Reduced singleton rederives 7 / 10"),
    node(id.casualtyStaleGridTest, "judge_test", "Casualty rejects the old Move domain"),
    node(id.previousSliceRelease, "slice_release", `Slice 42 ${PREVIOUS_SLICE_HASH}`),
    node(id.currentSliceRelease, "slice_release", "Slice 43 relationship-audit release"),
    node(id.previousCatalogueRelease, "catalogue_release", `Slice 42 catalogue ${CURRENT_CATALOGUE_HASH}`),
    node(id.currentCatalogueRelease, "catalogue_release", `Slice 43 catalogue ${CURRENT_CATALOGUE_HASH}`),
    node(id.previousRuntimeRelease, "runtime_release", `Slice 42 runtime ${CURRENT_RUNTIME_HASH}`),
    node(id.currentRuntimeRelease, "runtime_release", `Slice 43 runtime ${CURRENT_RUNTIME_HASH}`),
  ];
  const executorId = `executor:${OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID}`
    + `@${OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION}`;
  const relations = [
    edge(id.casualty, "writes", id.destroyedModelIds, "casualty_transition"),
    edge(id.casualty, "writes", id.currentModels, "casualty_transition"),
    edge(id.destroyedModelIds, "derives", id.currentModels, "remaining_model_projection"),
    edge(id.currentModels, "derives", id.splitSpeedSelection, "split_speed_selector"),
    edge(id.maxModels, "derives", id.splitSpeedSelection, "split_speed_selector"),
    edge(id.printedSplitSpeed, "derives", id.splitSpeedSelection, "official_marine_speed"),
    edge(id.splitSpeedSelection, "parameterized_by", id.moveDomain, "move_domain_builder"),
    edge(id.splitSpeedSelection, "invalidates", id.moveDomain, "parameter_domain_state_binding"),
    edge(id.maxModels, "invalidates", id.moveDomain, "parameter_domain_state_binding"),
    edge(id.baseSize, "derives", id.geometryFootprint, "geometry_kernel_v2"),
    edge(id.modelPositions, "derives", id.geometryFootprint, "geometry_kernel_v2"),
    edge(id.geometryFootprint, "constrains", id.moveDomain, "geometry_kernel_v2"),
    edge(id.sizeAtom, "projects_to", id.printedSize, "official_size_characteristic"),
    edge(id.printedSize, "derives", id.visibilityHeight, "effective_size_semantics"),
    edge(id.visibilityHeight, "projects_to", id.effectiveSizeAtom, "effective_size_semantics"),
    edge(executorId, "reads", id.currentModels, "optional_move_executor_v2"),
    edge(executorId, "reads", id.maxModels, "optional_move_executor_v2"),
    edge(executorId, "reads", id.destroyedModelIds, "optional_move_executor_v2"),
    edge(executorId, "reads", id.modelPositions, "optional_move_executor_v2"),
    edge(executorId, "reads", id.paymentCardReadiness, "optional_move_executor_v2"),
    edge(executorId, "reads", id.paymentCardResource, "optional_move_executor_v2"),
    edge(executorId, "exposes", id.baseVariant, "optional_move_executor_v2"),
    edge(executorId, "exposes", id.stimpackVariant, "optional_move_executor_v2"),
    edge(id.paymentCardReadiness, "gates", id.stimpackVariant, "stimpack_payment_gate"),
    edge(id.paymentCardResource, "gates", id.stimpackVariant, "stimpack_payment_gate"),
    edge(id.baseVariant, "includes", id.moveDomain, "base_move_domain"),
    edge(id.stimpackVariant, "includes", id.moveDomain, "stimpack_move_domain"),
    edge(id.baseVariant, "writes", id.modelPositions, "base_move_apply"),
    edge(id.baseVariant, "writes", id.movementActivation, "base_move_apply"),
    edge(id.baseVariant, "writes", id.inCoherency, "base_move_apply"),
    edge(id.baseVariant, "writes", id.lastLeadingModelId, "base_move_apply"),
    edge(id.baseVariant, "writes", id.lastMovePlanHash, "base_move_apply"),
    edge(id.stimpackVariant, "writes", id.paymentCardReadiness, "stimpack_payment_apply"),
    edge(id.stimpackVariant, "writes", id.paymentCardResource, "stimpack_payment_apply"),
    edge(id.stimpackVariant, "writes", id.damageMarker, "stimpack_non_lethal_damage_apply"),
    edge(id.stimpackVariant, "writes", id.statuses, "stimpack_buff_apply"),
    edge(id.stimpackVariant, "writes", id.effectMarkers, "stimpack_buff_apply"),
    edge(id.stimpackVariant, "writes", id.abilityHistory, "stimpack_frequency_apply"),
    edge(id.stimpackVariant, "writes", id.modelPositions, "stimpack_move_apply"),
    edge(id.stimpackVariant, "writes", id.movementActivation, "stimpack_move_apply"),
    edge(id.stimpackVariant, "writes", id.inCoherency, "stimpack_move_apply"),
    edge(id.stimpackVariant, "writes", id.lastLeadingModelId, "stimpack_move_apply"),
    edge(id.stimpackVariant, "writes", id.lastMovePlanHash, "stimpack_move_apply"),
    edge(id.moveDomain, "verified_by", id.multiModelGridTest, "slice42_judge_test"),
    edge(id.moveDomain, "verified_by", id.initialSingleGridTest, "slice42_judge_test"),
    edge(id.moveDomain, "verified_by", id.reducedSingleGridTest, "slice42_judge_test"),
    edge(id.moveDomain, "verified_by", id.casualtyStaleGridTest, "slice42_judge_test"),
    edge(id.previousSliceRelease, "superseded_by", id.currentSliceRelease, "slice_version_ancestry"),
    edge(id.previousCatalogueRelease, "retained_by", id.currentCatalogueRelease, "catalogue_version_ancestry"),
    edge(id.previousRuntimeRelease, "retained_by", id.currentRuntimeRelease, "runtime_version_ancestry"),
  ];
  const requiredEdges = relations.filter((relation) => [
    "casualty_transition",
    "split_speed_selector",
    "parameter_domain_state_binding",
    "geometry_kernel_v2",
    "official_size_characteristic",
    "effective_size_semantics",
    "slice42_judge_test",
    "slice_version_ancestry",
    "catalogue_version_ancestry",
    "runtime_version_ancestry",
  ].includes(relation.provenance));
  const gridTests = [
    id.multiModelGridTest,
    id.initialSingleGridTest,
    id.reducedSingleGridTest,
    id.casualtyStaleGridTest,
  ];
  return {
    nodes,
    edges: relations,
    executorLineages: [
      {
        executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:optional_stimpack_move_v2",
      },
      {
        executorId: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:optical_flare_ranged_consumer_v1",
      },
      {
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:end_of_round_effects_v3",
      },
      {
        executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
        ruleAtomIds: [...OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ATOM_IDS],
        provenance: "runtime_action_lineage:end_of_round_effects_v4",
      },
    ],
    declaredStateContractExecutorIds: [
      OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
    ],
    coverageScopes: [{
      scopeId: OFFICIAL_RULE_RELATIONSHIP_SCOPE_ID,
      executorId: OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
      requiredNodeIds: [
        id.casualty,
        id.currentModels,
        id.splitSpeedSelection,
        id.moveDomain,
        id.baseSize,
        id.geometryFootprint,
        id.printedSize,
        id.visibilityHeight,
        ...gridTests,
        id.previousSliceRelease,
        id.currentSliceRelease,
        id.previousCatalogueRelease,
        id.currentCatalogueRelease,
        id.previousRuntimeRelease,
        id.currentRuntimeRelease,
      ],
      requiredEdges,
      requiredPaths: [
        {
          from: id.casualty,
          to: id.moveDomain,
          relationships: ["writes", "derives", "invalidates"],
          maxDepth: 5,
        },
        ...gridTests.map((testId) => ({
          from: id.casualty,
          to: testId,
          relationships: ["writes", "derives", "invalidates", "verified_by"],
          maxDepth: 6,
        })),
        {
          from: id.baseSize,
          to: id.moveDomain,
          relationships: ["derives", "constrains"],
          maxDepth: 2,
        },
        {
          from: id.printedSize,
          to: id.effectiveSizeAtom,
          relationships: ["derives", "projects_to"],
          maxDepth: 2,
        },
      ],
      forbiddenPaths: [
        {
          from: id.printedSize,
          to: id.splitSpeedSelection,
          relationships: ["derives", "projects_to", "parameterized_by", "constrains"],
          maxDepth: 8,
        },
        {
          from: id.printedSize,
          to: id.moveDomain,
          relationships: ["derives", "projects_to", "parameterized_by", "constrains"],
          maxDepth: 8,
        },
        {
          from: id.baseSize,
          to: id.splitSpeedSelection,
          relationships: ["derives", "projects_to", "parameterized_by", "constrains"],
          maxDepth: 8,
        },
        ...[
          id.paymentCardReadiness,
          id.paymentCardResource,
          id.damageMarker,
          id.statuses,
          id.effectMarkers,
          id.abilityHistory,
        ].map((stateNodeId) => ({
          from: id.baseVariant,
          to: stateNodeId,
          relationships: ["writes"],
          maxDepth: 2,
        })),
        {
          from: id.paymentCardReadiness,
          to: id.baseVariant,
          relationships: ["gates"],
          maxDepth: 2,
        },
      ],
      evidenceTestNodeIds: gridTests,
    }],
  };
}
