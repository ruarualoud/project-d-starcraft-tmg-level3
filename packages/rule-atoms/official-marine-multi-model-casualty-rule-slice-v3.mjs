import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE,
} from "./official-marine-multi-model-casualty-close-combat-executor-v3.mjs";
import {
  createOfficialMarineMultiModelCasualtyRelationshipExtensionV3,
} from "./official-marine-multi-model-casualty-relationship-contract-v3.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV2,
} from "./official-marine-multi-model-close-combat-denominator-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatPrecisionKernelV3,
} from "./official-marine-multi-model-close-combat-precision-kernel-v3.mjs";
import {
  createOfficialMultiModelCasualtyResolutionKernelV1,
} from "./official-multi-model-casualty-resolution-kernel-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "./rule-relationship-graph-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_casualty_rule_slice_v3";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_stimpack_close_combat_rule_slice_v2";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "2d6214ab7962db7d89a96af8ef3fba8484cafa2956e3430b81c0a1a5539b2454";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441";
const EXPECTED_CATALOGUE_HASH =
  "cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac";
const EXPECTED_RUNTIME_HASH =
  "e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7";
const EXPECTED_RELATIONSHIP_GRAPH_HASH =
  "761ce316ce328224aa21d3f4f3d49eceb2a30b595a75409d97f50a6934c321e0";
const EXPECTED_EXECUTABLE_COUNT = 421;
const EXPECTED_REVIEW_COUNT = 491;
const EXPECTED_DISPLAY_COUNT = 114;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function sliceBody(slice) {
  return without(slice, ["sliceHash"]);
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PREVIOUS_RELEASE_DRIFT");
  }
}

function createCatalogue(previousSlice) {
  const base = previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE,
    ].sort(),
    transitionSchema:
      OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.46.0-official-marine-multi-model-casualty-resolution",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: base.sourceDenominatorBinding,
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms: clone(base.atoms),
    executorManifest,
  });
}

function buildEvidence(catalogue) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0) {
    fail("MARINE_MULTI_MODEL_CASUALTY_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMarineMultiModelCasualtyRelationshipExtensionV3({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_RELATIONSHIP_GRAPH_HASH
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 40
    || relationshipAudit.counts.declaredStateContractExecutors !== 7
    || relationshipAudit.counts.stateContractMissingExecutors !== 33
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0) {
    fail("MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_AUDIT_INVALID");
  }
  const sourceImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_document:rules-v48.part8.damage-and-casualty-priority",
    targetNodeIds: [
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
      "derived_value:marine.multiModelCasualtyResolutionV1",
      "derived_value:marine.postCasualtyOfficialEngagementGraphV2",
      "judge_test:marine-multi-model-defender-casualty-priority-and-writeback",
    ],
    relationships: [
      "defines", "constrains", "parameterized_by", "derives", "verified_by",
    ],
    maxDepth: 7,
  });
  const staleImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "state_field:pieces[].models[].position",
    targetNodeIds: [
      "derived_value:officialEngagementGraphV2",
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
      "judge_test:marine-multi-model-casualty-ledger-geometry-stale-domain",
    ],
    relationships: ["invalidates", "verified_by"],
    maxDepth: 5,
  });
  if (sourceImpact.reachedNodeIds.length !== 4
    || staleImpact.reachedNodeIds.length !== 3) {
    fail("MARINE_MULTI_MODEL_CASUALTY_RELATIONSHIP_IMPACT_MISSING");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    relationshipImpacts: { sourceImpact, staleImpact },
  };
}

export function createOfficialMarineMultiModelCasualtyRuleSliceV3(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCatalogue(previous);
  const evidence = buildEvidence(catalogue);
  const denominator = createOfficialMarineMultiModelCloseCombatDenominatorV2();
  const precision = createOfficialMarineMultiModelCloseCombatPrecisionKernelV3();
  const casualtyKernel = createOfficialMultiModelCasualtyResolutionKernelV1();
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    combatEffectDenominator: clone(previous.combatEffectDenominator),
    combatEffectDenominatorHash: previous.combatEffectDenominatorHash,
    combatEffectCorrectionReceiptHash: previous.combatEffectCorrectionReceiptHash,
    effectKernel: clone(previous.effectKernel),
    healResolutionKernel: clone(previous.healResolutionKernel),
    totalDamageReactionKernel: clone(previous.totalDamageReactionKernel),
    medpackProgress: clone(previous.medpackProgress),
    academyOpticalFlareProgress: clone(previous.academyOpticalFlareProgress),
    restorationRangeProgress: clone(previous.restorationRangeProgress),
    lifeSupportProgress: clone(previous.lifeSupportProgress),
    marineStimpackKernel: clone(previous.marineStimpackKernel),
    characteristicStatusKernelV2: clone(previous.characteristicStatusKernelV2),
    marineMoveGeometryKernelV2: clone(previous.marineMoveGeometryKernelV2),
    optionalStimpackMoveProgress: clone(previous.optionalStimpackMoveProgress),
    stimpackCloseCombatProgress: clone(previous.stimpackCloseCombatProgress),
    marineMultiModelCloseCombatDenominator: clone(denominator.descriptor),
    marineMultiModelCloseCombatPrecisionKernel: clone(precision.descriptor),
    marineMultiModelCasualtyKernel: clone(casualtyKernel.descriptor),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID],
    executableScope:
      "marine_six_or_nine_current_live_rosters_exact_pair_close_combat_with_defender_casualty_choice",
    marineMultiModelCasualtyProgress: {
      initialCompositionOptions: [6, 9],
      currentLiveModelCounts: "1..chosen_initial_composition_for_both_sides",
      ordinaryAndStimpackPrecisionAttackResolutionExecutable: true,
      totalDamageIncludesPriorDamageMarker: true,
      unengagedVisibleModelCasualtyCapExecutable: true,
      engagedPriorityTiersExecutable: true,
      specificEnemyUnitEngagementPreservationExecutable: true,
      defenderOwnedOrderedCasualtyChoiceExecutable: true,
      residualDamageAndOverflowDiscardExecutable: true,
      currentModelsSupplyDestroyedLedgerWritebackExecutable: true,
      postCasualtyEngagementGraphRederived: true,
      staleLedgerDamageGeometryAndSelectionRejected: true,
      authorityActionSchemaVersion: "hybrid_legal_space_v15",
      runtimeExecutorPromoted: true,
      runtimeTargetScope: "exact_two_marine_units_single_enemy_unit_engagement",
      pureKernelEngagementScope: "arbitrary_current_enemy_unit_edges",
    },
    ruleRelationshipGraphBinding: {
      graphSchema: evidence.graph.schema,
      graphHash: evidence.graph.graphHash,
      relationshipAuthority: evidence.graph.relationshipAuthority,
      rulesAuthority: false,
      catalogueHash: evidence.graph.catalogueHash,
      nodeCount: evidence.graph.nodes.length,
      edgeCount: evidence.graph.edges.length,
      coverageScopeCount: evidence.graph.coverageScopes.length,
      declaredStateContractExecutorCount:
        evidence.graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      slice47CasualtySourceDomainStateAndTestPathsComplete: true,
      closeCombatV8StateContractDeclared: true,
      missingSourceConsumerStateOrTestPathBlocksFreeze: true,
      declaredStateContractExecutorCount:
        evidence.relationshipAudit.counts.declaredStateContractExecutors,
      stateContractMissingExecutorCount:
        evidence.relationshipAudit.counts.stateContractMissingExecutors,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    officialDataPolicy: clone(previous.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 46,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 47,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 47).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 55,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      compositionOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      previousEffectDenominatorHash: previous.combatEffectDenominatorHash,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      previousPrecisionKernelMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v15",
      previousActionSchemaVersion: "hybrid_legal_space_v14",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "official_engaged_priority_example",
        "unengaged_visibility_cap_and_overflow_discard",
        "defender_owned_casualty_choice_and_writeback",
        "casualty_ledger_geometry_stale_rejection",
        "authority_v15_three_stage_two_seat_replay",
        "relationship_negative_gap_gate",
      ],
      crossTimeReplayResult:
        "slice46_runtime_remains_exact_while_slice47_adds_opt_in_casualty_executor",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "33-executors-still-lack-declared-state-read-write-contracts",
        "remaining-491-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt"],
      harnessToolsCalled: [
        "list_legal_actions",
        "preview_action",
        "confirm_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "query_rule_relationship_impact",
      ],
      uiTraceEvidence: [
        "defender-sees-only-authority-enumerated-ordered-casualty-selections",
        "casualty-priority-engagement-preservation-and-post-supply-are-visible",
      ],
      agentDecisionEvidence: [
        "harness-requeries-after-target-ledger-damage-or-geometry-change",
        "harness-never-invents-casualty-selection-outside-authority-domain",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-units71-cards69-rules48-binding-drift-invalidates-slice47",
        "missing-casualty-source-domain-state-test-or-version-path-invalidates-slice47",
        "stale-choice-or-authority-replay-failure-invalidates-slice47",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "multi-enemy-unit-end-to-end-runtime-pending",
      "other-units-upgrades-terrain-access-elevation-and-flying-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("MARINE_MULTI_MODEL_CASUALTY_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineMultiModelCasualtyRuleSliceV3(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_MULTI_MODEL_CASUALTY_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineMultiModelCasualtyRuleSliceV3(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_SLICE_CONTENT_MISMATCH");
  }
  const evidence = buildEvidence(input.slice.catalogue);
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_marine_multi_model_casualty_rule_slice_audit_v3",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    casualtyKernelHash: input.slice.marineMultiModelCasualtyKernel.kernelHash,
    relationshipGraphAudit: clone(evidence.relationshipAudit),
    relationshipImpacts: clone(evidence.relationshipImpacts),
    counts: {
      sourceClauses: evidence.catalogueAudit.counts.sourceClauses,
      ruleAtoms: evidence.catalogueAudit.counts.atoms,
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: 0,
      changedAtoms: 0,
      executors: evidence.relationshipAudit.counts.executors,
      relationshipNodes: evidence.relationshipAudit.counts.nodes,
      relationshipEdges: evidence.relationshipAudit.counts.edges,
      relationshipBlockingGaps: evidence.relationshipAudit.counts.blockingGaps,
      declaredStateContractExecutors:
        evidence.relationshipAudit.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.relationshipAudit.counts.stateContractMissingExecutors,
    },
    runtimePromotion: true,
    rulesTruth: "official_current_multi_model_casualty_runtime_and_relationship_gate_frozen",
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
