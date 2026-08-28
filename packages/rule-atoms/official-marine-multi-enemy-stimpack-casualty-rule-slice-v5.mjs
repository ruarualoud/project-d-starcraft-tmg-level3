import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_ATTACK_ACTION_TYPE,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_CASUALTIES_ACTION_TYPE,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_ACTION_TYPE,
} from "./official-marine-multi-enemy-stimpack-casualty-close-combat-executor-v5.mjs";
import {
  createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5,
} from "./official-marine-multi-enemy-stimpack-casualty-relationship-contract-v5.mjs";
import {
  createOfficialMarineMultiEnemyStimpackCloseCombatDenominatorV4,
} from "./official-marine-multi-enemy-stimpack-close-combat-denominator-v4.mjs";
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
  "starcraft_tmg_official_marine_multi_enemy_stimpack_casualty_rule_slice_v5";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_enemy_casualty_rule_slice_v4";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "69452cbf2adbf5c067f6996c09f748ac739bd0c606a0226c01b1184e13ed4211";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6";
const EXPECTED_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const EXPECTED_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const EXPECTED_RELATIONSHIP_GRAPH_HASH =
  "23168b8a038438cf68c34d0510c950e86519473049fe58ad18ddb245de06953d";
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
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_PREVIOUS_RELEASE_DRIFT");
  }
}

function createCatalogue(previousSlice) {
  const base = previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_CASUALTIES_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_STIMPACK_PRECISION_ACTION_TYPE,
    ].sort(),
    transitionSchema:
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.48.0-official-marine-multi-enemy-stimpack-casualty",
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
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5({
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
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 9
    || relationshipAudit.counts.stateContractMissingExecutors !== 33
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_AUDIT_INVALID");
  }
  const sourceImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_characteristic:Marine.Stimpack.closeCombatPrecision3",
    targetNodeIds: [
      "parameter_domain:marine.multiEnemyStimpack.closeCombatPlanV4",
      "state_field:pendingAction.marineMultiEnemyStimpackPrecisionV3",
      "judge_test:marine-multi-enemy-stimpack-precision-casualty-three-stage",
    ],
    relationships: ["defines", "derives", "parameterized_by", "writes", "verified_by"],
    maxDepth: 7,
  });
  const staleImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "state_field:pieces[].models[].position",
    targetNodeIds: [
      "parameter_domain:marine.multiEnemyStimpack.closeCombatPlanV4",
      "judge_test:marine-multi-enemy-stimpack-status-marker-history-geometry-stale",
    ],
    relationships: ["invalidates", "verified_by"],
    maxDepth: 3,
  });
  if (sourceImpact.reachedNodeIds.length !== 3
    || staleImpact.reachedNodeIds.length !== 2) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_RELATIONSHIP_IMPACT_MISSING");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    relationshipImpacts: { sourceImpact, staleImpact },
  };
}

export function createOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCatalogue(previous);
  const evidence = buildEvidence(catalogue);
  const denominator = createOfficialMarineMultiEnemyStimpackCloseCombatDenominatorV4();
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
    marineMultiModelCloseCombatDenominator:
      clone(previous.marineMultiModelCloseCombatDenominator),
    marineMultiModelCloseCombatPrecisionKernel:
      clone(previous.marineMultiModelCloseCombatPrecisionKernel),
    marineMultiModelCasualtyKernel: clone(previous.marineMultiModelCasualtyKernel),
    marineMultiModelCasualtyProgress: clone(previous.marineMultiModelCasualtyProgress),
    marineMultiEnemyCloseCombatDenominator:
      clone(previous.marineMultiEnemyCloseCombatDenominator),
    marineMultiEnemyCasualtyProgress: clone(previous.marineMultiEnemyCasualtyProgress),
    marineMultiEnemyStimpackCloseCombatDenominator: clone(denominator.descriptor),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    ],
    executableScope:
      "three_current_marine_units_selected_stimpacked_attacker_clean_coengager_precision_then_defender_casualty",
    marineMultiEnemyStimpackCasualtyProgress: {
      exactThreeMarineUnitScope: true,
      selectedAttackerStimpackStateMarkerAndHistoryBound: true,
      cleanCoEngagerProjectionDoesNotInheritStimpack: true,
      selectedAttackerRankAndPoolIsolationExecutable: true,
      targetEngagedByTwoSpecificEnemyUnits: true,
      strikeAndBayonetStimpackLoadoutsExecutable: true,
      postHitPrecisionEmptyAndEveryFailedSubsetUpToThreeExecutable: true,
      attackingPlayerOwnsPrecisionChoice: true,
      defendingPlayerOwnsCasualtyChoice: true,
      threeStageFightPrecisionCasualtySequenceExecutable: true,
      eachSpecificEnemyUnitEngagementPreservedWhenAlternativeExists: true,
      fullThreeUnitPostCasualtyEngagementRederived: true,
      selectedAttackerActivationOnly: true,
      coEngagerRemainsUnactivated: true,
      staleGeometryStatusMarkerOrHistoryRejected: true,
      authorityActionSchemaVersion: "hybrid_legal_space_v17",
      runtimeExecutorPromoted: true,
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
      slice49StimpackSourcePlanPrecisionCasualtyStateAndTestPathsComplete: true,
      missingSourceConsumerStateOrTestPathBlocksFreeze: true,
      selectedAndCoEngagerPairProjectionRelationshipExplicit: true,
      precisionToDefenderCasualtyOwnershipTransitionExplicit: true,
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
      completedBeforeThisSlice: 48,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 49,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 49).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 58,
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
      previousCasualtyKernelMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v17",
      previousActionSchemaVersion: "hybrid_legal_space_v16",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "selected_stimpack_and_clean_coengager_projection_isolation",
        "three_stage_fight_precision_defender_casualty",
        "zero_and_three_precision_conversion_domains",
        "geometry_status_marker_history_stale_rejection",
        "authority_v17_three_receipt_two_seat_signed_replay",
        "relationship_negative_gap_gate",
      ],
      crossTimeReplayResult:
        "slice48_runtime_remains_exact_while_slice49_adds_opt_in_stimpack_executor",
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
        "attacker-sees-exact-post-hit-precision-subsets-before-armour",
        "defender-sees-only-casualties-preserving-both-specific-enemy-engagements",
        "coengager-remains-visible-and-unactivated-after-selected-attacker-settles",
      ],
      agentDecisionEvidence: [
        "opponent-cannot-apply-defender-casualty-before-attacker-precision-choice",
        "harness-requeries-after-geometry-status-marker-history-or-ledger-change",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-units71-cards69-rules48-binding-drift-invalidates-slice49",
        "missing-stimpack-source-plan-precision-casualty-path-invalidates-slice49",
        "stale-choice-or-authority-three-receipt-replay-failure-invalidates-slice49",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "more-than-two-enemy-units-and-other-profiles-pending",
      "other-units-upgrades-terrain-access-elevation-and-flying-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineMultiEnemyStimpackCasualtyRuleSliceV5(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("MARINE_MULTI_ENEMY_STIMPACK_CASUALTY_SLICE_CONTENT_MISMATCH");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: input.slice.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: input.slice.catalogue,
    extension: createOfficialMarineMultiEnemyStimpackCasualtyRelationshipExtensionV5({
      catalogueHash: input.slice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  return freezeDeep({
    schema:
      "starcraft_tmg_official_marine_multi_enemy_stimpack_casualty_rule_slice_audit_v5",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
    graphHash: graph.graphHash,
    denominatorHash:
      input.slice.marineMultiEnemyStimpackCloseCombatDenominator.denominatorHash,
    counts: {
      sourceClauses: catalogueAudit.counts.sourceClauses,
      ruleAtoms: catalogueAudit.counts.atoms,
      executableRuleAtoms: catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: catalogueAudit.counts.byDisposition.display_only,
      executors: relationshipAudit.counts.executors,
      declaredStateContractExecutors:
        relationshipAudit.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        relationshipAudit.counts.stateContractMissingExecutors,
      blockingRelationshipGaps: relationshipAudit.counts.blockingGaps,
    },
    rulesTruth:
      "official_current_multi_enemy_stimpack_precision_casualty_runtime_and_relationship_gate_frozen",
    trainingTruth: false,
  });
}
