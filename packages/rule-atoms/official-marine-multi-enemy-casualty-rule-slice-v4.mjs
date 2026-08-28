import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_CASUALTIES_ACTION_TYPE,
} from "./official-marine-multi-enemy-casualty-close-combat-executor-v4.mjs";
import {
  createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4,
} from "./official-marine-multi-enemy-casualty-relationship-contract-v4.mjs";
import {
  createOfficialMarineMultiEnemyCloseCombatDenominatorV3,
} from "./official-marine-multi-enemy-close-combat-denominator-v3.mjs";
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
  "starcraft_tmg_official_marine_multi_enemy_casualty_rule_slice_v4";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_casualty_rule_slice_v3";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "a52b9b24bcdc8d2626949b2927238bf4ee9f3b9cff9a8d55494d1b6390012778";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7";
const EXPECTED_CATALOGUE_HASH =
  "98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3";
const EXPECTED_RUNTIME_HASH =
  "dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6";
const EXPECTED_RELATIONSHIP_GRAPH_HASH =
  "575e804e7172e1bad1bab42b3058484b46e22952486c4409ef9acb1219691f6b";
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
    fail("MARINE_MULTI_ENEMY_CASUALTY_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_PREVIOUS_RELEASE_DRIFT");
  }
}

function createCatalogue(previousSlice) {
  const base = previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_ENEMY_CASUALTIES_ACTION_TYPE,
    ].sort(),
    transitionSchema:
      OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.47.0-official-marine-multi-enemy-casualty-resolution",
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
    fail("MARINE_MULTI_ENEMY_CASUALTY_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4({
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
    || relationshipAudit.counts.executors !== 41
    || relationshipAudit.counts.declaredStateContractExecutors !== 8
    || relationshipAudit.counts.stateContractMissingExecutors !== 33
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_AUDIT_INVALID");
  }
  const sourceImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_document:rules-v48.part12.casualty-engagement-preservation",
    targetNodeIds: [
      "parameter_domain:marine.multiModelCasualty.orderedLegalSelectionsV1",
      "state_field:pendingAction.marineMultiEnemyCasualtyV2",
      "judge_test:marine-multi-enemy-specific-engagement-preservation-runtime",
    ],
    relationships: ["constrains", "parameterized_by", "writes", "verified_by"],
    maxDepth: 7,
  });
  const staleImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "state_field:pieces[].models[].position",
    targetNodeIds: [
      "parameter_domain:marine.multiEnemy.closeCombatPlanV3",
      "judge_test:marine-multi-enemy-coengager-geometry-stale-domain",
    ],
    relationships: ["derives", "invalidates", "verified_by"],
    maxDepth: 5,
  });
  if (sourceImpact.reachedNodeIds.length !== 3
    || staleImpact.reachedNodeIds.length !== 2) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_RELATIONSHIP_IMPACT_MISSING");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    relationshipImpacts: { sourceImpact, staleImpact },
  };
}

export function createOfficialMarineMultiEnemyCasualtyRuleSliceV4(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCatalogue(previous);
  const evidence = buildEvidence(catalogue);
  const denominator = createOfficialMarineMultiEnemyCloseCombatDenominatorV3();
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
    marineMultiEnemyCloseCombatDenominator: clone(denominator.descriptor),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MARINE_MULTI_ENEMY_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID],
    executableScope:
      "three_current_marine_units_target_engaged_by_two_enemy_units_ordinary_close_combat_casualty_choice",
    marineMultiEnemyCasualtyProgress: {
      exactThreeMarineUnitScope: true,
      targetEngagedByTwoSpecificEnemyUnits: true,
      selectedAttackerRankAndPoolIsolationExecutable: true,
      coEngagerLedgerAndGeometryBound: true,
      defenderOwnedCasualtyChoiceExecutable: true,
      eachSpecificEnemyUnitEngagementPreservedWhenAlternativeExists: true,
      fullThreeUnitPostCasualtyEngagementRederived: true,
      selectedAttackerActivationOnly: true,
      coEngagerRemainsUnactivated: true,
      staleCoEngagerLedgerOrGeometryRejected: true,
      selectedAttackerLoadouts: ["Strike", "Bayonet"],
      stimpackMultiEnemyPathExecutable: false,
      authorityActionSchemaVersion: "hybrid_legal_space_v16",
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
      slice48MultiEnemySourceDomainStateAndTestPathsComplete: true,
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
      completedBeforeThisSlice: 47,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 48,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 48).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 56,
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
      actionSchemaVersion: "hybrid_legal_space_v16",
      previousActionSchemaVersion: "hybrid_legal_space_v15",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "multi_enemy_specific_engagement_preservation",
        "selected_attacker_rank_pool_isolation",
        "coengager_geometry_stale_domain_rejection",
        "authority_v16_two_seat_signed_replay",
        "relationship_negative_gap_gate",
      ],
      crossTimeReplayResult:
        "slice47_runtime_remains_exact_while_slice48_adds_opt_in_multi_enemy_executor",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "multi-enemy-stimpack-precision-path-remains-pending",
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
        "defender-sees-only-casualties-that-preserve-each-specific-enemy-unit-engagement",
        "coengager-identity-and-post-casualty-three-unit-engagement-are-visible",
      ],
      agentDecisionEvidence: [
        "opponent-cannot-remove-the-only-model-preserving-a-second-enemy-unit-engagement",
        "harness-requeries-after-any-coengager-ledger-or-geometry-change",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-units71-cards69-rules48-binding-drift-invalidates-slice48",
        "missing-multi-enemy-source-state-test-or-version-path-invalidates-slice48",
        "stale-choice-or-authority-replay-failure-invalidates-slice48",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "multi-enemy-stimpack-precision-path-pending",
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
  if (changedAtoms !== 0) fail("MARINE_MULTI_ENEMY_CASUALTY_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineMultiEnemyCasualtyRuleSliceV4(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineMultiEnemyCasualtyRuleSliceV4(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("MARINE_MULTI_ENEMY_CASUALTY_SLICE_CONTENT_MISMATCH");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(input.slice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: input.slice.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: input.slice.catalogue,
    extension: createOfficialMarineMultiEnemyCasualtyRelationshipExtensionV4({
      catalogueHash: input.slice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  return freezeDeep({
    schema: "starcraft_tmg_official_marine_multi_enemy_casualty_rule_slice_audit_v4",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
    graphHash: graph.graphHash,
    denominatorHash:
      input.slice.marineMultiEnemyCloseCombatDenominator.denominatorHash,
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
    rulesTruth: "official_current_multi_enemy_casualty_runtime_and_relationship_gate_frozen",
    trainingTruth: false,
  });
}
