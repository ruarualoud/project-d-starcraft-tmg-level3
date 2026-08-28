import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV1,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1,
} from "./official-marine-multi-model-close-combat-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
  queryRuleRelationshipImpactV1,
} from "./rule-relationship-graph-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_denominator_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_stimpack_close_combat_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "e722cc2e5335e26442fb27c2e068c1ca6dcbf97fbbfbab977dd7832c83c9a3a6";
const EXPECTED_CATALOGUE_HASH =
  "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649";
const EXPECTED_RUNTIME_HASH =
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc";
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
    || previousSlice.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash
    || previousSlice.catalogue?.catalogueHash !== previousSlice.catalogueHash) {
    fail("MARINE_MULTI_MODEL_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("MARINE_MULTI_MODEL_PREVIOUS_RELEASE_DRIFT");
  }
}

function buildEvidence(catalogue) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMarineMultiModelCloseCombatRelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.nodes !== 5118
    || relationshipAudit.counts.edges !== 19710
    || relationshipAudit.counts.executors !== 37
    || relationshipAudit.counts.declaredStateContractExecutors !== 3
    || relationshipAudit.counts.stateContractMissingExecutors !== 34
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0) {
    fail("MARINE_MULTI_MODEL_RELATIONSHIP_AUDIT_INVALID");
  }
  const unitWideImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_document:rules-v48.part9.unit-wide-replacement",
    targetNodeIds: [
      "derived_value:marine.unitWideCloseCombatLoadout",
      "derived_value:marine.unitWideBayonetCarrierSet",
      "judge_test:marine-bayonet-unit-wide-replacement-pool",
      "forbidden_state:marine.mixedStrikeBayonetCarriers",
      "judge_test:marine-mixed-strike-bayonet-carrier-forbidden",
    ],
    relationships: ["defines", "derives", "invalidates", "verified_by"],
    maxDepth: 5,
  });
  const rankImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_document:rules-v48.part8.close-combat-ranks",
    targetNodeIds: [
      "derived_value:marine.closeCombatFightingRank",
      "derived_value:marine.closeCombatSupportingRank",
      "derived_value:marine.closeCombatEligibleModelIds",
      "derived_value:marine.multiModelCloseCombatAttackPool",
      "judge_test:marine-multi-model-strike-rank-pool",
    ],
    relationships: ["defines", "derives", "verified_by"],
    maxDepth: 6,
  });
  const casualtyImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "derived_value:marine.modelLedger",
    targetNodeIds: [
      "derived_value:marine.activeModelIds",
      "derived_value:marine.multiModelCloseCombatAttackPool",
      "parameter_domain:stimpack.closeCombatPrecision.failedDiceSubsets",
      "judge_test:marine-casualty-rederives-rank-pool-and-supply",
    ],
    relationships: ["derives", "invalidates", "constrains", "verified_by"],
    maxDepth: 5,
  });
  if (unitWideImpact.reachedNodeIds.length !== 5
    || rankImpact.reachedNodeIds.length !== 5
    || casualtyImpact.reachedNodeIds.length !== 4) {
    fail("MARINE_MULTI_MODEL_RELATIONSHIP_IMPACT_PATH_MISSING");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    relationshipImpacts: {
      unitWideImpact,
      rankImpact,
      casualtyImpact,
    },
  };
}

export function createOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = previous.catalogue;
  const denominator = createOfficialMarineMultiModelCloseCombatDenominatorV1();
  const evidence = buildEvidence(catalogue);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    catalogue: clone(catalogue),
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
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [],
    executableScope:
      "none_denominator_and_relationship_audit_only_runtime_promotion_deferred",
    marineMultiModelCloseCombatProgress: {
      initialCompositionOptions: [6, 9],
      supportedLiveModelCounts: "1..chosen_initial_composition",
      supplyTiers: ["1-3:0", "4-6:1", "7-9:2"],
      fightingRankDerivedFromCurrentEngagementGraph: true,
      supportingRankRequiresBaseContactWithLiveFightingRankModel: true,
      attackPoolFormula:
        "(fighting_rank_count + supporting_rank_count) * unit_wide_weapon_roa",
      strikeRateOfAttack: 1,
      bayonetRateOfAttack: 2,
      bayonetReplacesStrikeForEveryModel: true,
      bayonetSpecialist: false,
      mixedStrikeBayonetCarrierStateAllowed: false,
      casualtyRebindsModelLedgerSupplyRanksAndPool: true,
      geometryRebindsEngagementRanksAndPool: true,
      stalePlanRejected: true,
      boundedTargetScope: "exactly_one_remaining_marine_model",
      broaderDefenderCasualtyChoicePending: true,
      runtimeExecutorPromoted: false,
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
      sourceClauseToAtomCoverageComplete: true,
      executableAtomToConsumerCoverageComplete: true,
      executableAtomSixKindEvidenceCoverageComplete: true,
      compositionExecutorLineageCoverageComplete: true,
      part9ToUnitWideBayonetCarrierAndForbiddenMixedCarrierPathsComplete: true,
      part8ToFightingSupportingRankAndAttackPoolPathsComplete: true,
      casualtyToLedgerSupplyRankPoolAndStaleDomainPathsComplete: true,
      derivedAuditIsRulesAuthority: false,
      declaredStateContractExecutorCount:
        evidence.relationshipAudit.counts.declaredStateContractExecutors,
      stateContractMissingExecutorCount:
        evidence.relationshipAudit.counts.stateContractMissingExecutors,
      globalRelationshipCoverageComplete: false,
      productionEligible: false,
    },
    officialDataPolicy: clone(previous.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 44,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 45,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 45).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 53,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      compositionOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousEffectDenominatorHash: previous.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      previousPrecisionKernelMutationAllowed: false,
      rulesRuntimeChanged: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v13",
      previousActionSchemaVersion: "hybrid_legal_space_v13",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "six_and_nine_model_composition_denominator",
        "strike_fighting_and_supporting_rank_pool",
        "bayonet_unit_wide_replacement_pool",
        "mixed_strike_bayonet_carrier_forbidden",
        "casualty_rederives_supply_rank_pool_and_stale_plan",
        "geometry_rederives_rank_pool_and_stale_plan",
        "stimpack_status_marker_history_chain",
        "live_official_source_binding",
        "runtime_promotion_remains_blocked",
      ],
      crossTimeReplayResult:
        "slice44_catalogue_runtime_and_single_model_authority_remain_exact",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-denominator-slice",
        "multi-model-authority-executor-and-precision-consumer-not-yet-promoted",
        "34-executors-still-lack-declared-state-read-write-contracts",
        "remaining-491-actionable-rule-atoms-not-executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt"],
      harnessToolsCalled: ["relationship_impact_query", "verify_rule_denominator"],
      uiTraceEvidence: [],
      agentDecisionEvidence: [
        "harness_must_not_treat_bayonet_as_a_per_model_or_specialist_choice",
        "harness_must_requery_after_casualty_geometry_loadout_or_status_change",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_units71_cards69_rules48_or_part8_part9_part12_hash_drift_invalidates_slice45",
        "unit-wide-loadout-rank-pool-stale-plan-or-forbidden-path-failure-invalidates-slice45",
      ],
      userVisibleChecks: [
        "six-and-nine-model-rosters-display-current-live-count-and-supply-separately",
        "strike-and-bayonet-display-unit-wide-roa-one-and-two",
        "casualty-or-geometry-change-recalculates-eligible-models-and-attack-dice",
        "mixed-per-model-strike-bayonet-configuration-is-rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "multi-model-stimpack-activation-and-close-combat-authority-executors-pending",
      "multi-model-precision-pending-choice-and-resolution-pending",
      "broader-defender-casualty-choice-domain-pending",
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("MARINE_MULTI_MODEL_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1(
  input = {},
) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_MULTI_MODEL_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineMultiModelCloseCombatDenominatorRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("MARINE_MULTI_MODEL_SLICE_CONTENT_MISMATCH");
  }
  const evidence = buildEvidence(input.slice.catalogue);
  return freezeDeep({
    valid: true,
    schema:
      "starcraft_tmg_official_marine_multi_model_close_combat_denominator_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    denominatorHash:
      input.slice.marineMultiModelCloseCombatDenominator.denominatorHash,
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
      relationshipNodes: evidence.relationshipAudit.counts.nodes,
      relationshipEdges: evidence.relationshipAudit.counts.edges,
      relationshipBlockingGaps: evidence.relationshipAudit.counts.blockingGaps,
      stateContractMissingExecutors:
        evidence.relationshipAudit.counts.stateContractMissingExecutors,
    },
    runtimePromotion: false,
    rulesTruth:
      "official_current_marine_multi_model_close_combat_denominator_and_relationships_frozen",
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
