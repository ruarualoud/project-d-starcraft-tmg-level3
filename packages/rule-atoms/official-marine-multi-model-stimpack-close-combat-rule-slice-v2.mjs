import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatPrecisionKernelV2,
} from "./official-marine-multi-model-close-combat-precision-kernel-v2.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
} from "./official-marine-multi-model-stimpack-active-executor-v3.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
} from "./official-marine-multi-model-stimpack-close-combat-executor-v2.mjs";
import {
  createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2,
} from "./official-marine-multi-model-stimpack-close-combat-relationship-contract-v2.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
} from "./official-marine-stimpack-active-executor-v1.mjs";
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
  "starcraft_tmg_official_marine_multi_model_stimpack_close_combat_rule_slice_v2";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_denominator_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "0a5c8cc51b1369b13666aa1efbe1ccbe056c4b457f980979036b8833468e60ab";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc";
const EXPECTED_CATALOGUE_HASH =
  "89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b";
const EXPECTED_RUNTIME_HASH =
  "5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441";
const EXPECTED_RELATIONSHIP_GRAPH_HASH =
  "2af2fd17b7e444ff49f789897177fb104c62f19a9f2a6c427316f2c81837b4c5";
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
    fail("MARINE_MULTI_MODEL_STIMPACK_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("MARINE_MULTI_MODEL_STIMPACK_PREVIOUS_RELEASE_DRIFT");
  }
}

function createCatalogue(previousSlice) {
  const base = previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push(
    {
      executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE],
      transitionSchema: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_TRANSITION_SCHEMA,
    },
    {
      executorId:
        OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
      executorVersion:
        OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
      actionTypes: [
        OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
        OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
      ].sort(),
      transitionSchema:
        OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA,
    },
  );
  return createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion:
      "0.45.0-official-marine-multi-model-stimpack-close-combat",
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
    fail("MARINE_MULTI_MODEL_STIMPACK_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension:
      createOfficialMarineMultiModelStimpackCloseCombatRelationshipExtensionV2({
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
    || relationshipAudit.counts.executors !== 39
    || relationshipAudit.counts.nodes !== 5138
    || relationshipAudit.counts.edges !== 19927
    || relationshipAudit.counts.declaredStateContractExecutors !== 5
    || relationshipAudit.counts.stateContractMissingExecutors !== 34
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0) {
    fail("MARINE_MULTI_MODEL_STIMPACK_RELATIONSHIP_AUDIT_INVALID");
  }
  const part9Impact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "official_document:rules-v48.part9.unit-wide-replacement",
    targetNodeIds: [
      "derived_value:marine.unitWideCloseCombatLoadout",
      "derived_value:marine.multiModelCloseCombatAttackPool",
      "derived_value:marine.multiModelCloseCombatResolutionV2",
      "judge_test:marine-multi-model-ordinary-strike-bayonet-pools",
    ],
    relationships: ["defines", "constrains", "derives", "verified_by"],
    maxDepth: 6,
  });
  const staleImpact = queryRuleRelationshipImpactV1(graph, {
    startNodeId: "state_event:casualty_model_destroyed",
    targetNodeIds: [
      "derived_value:marine.modelLedger",
      "parameter_domain:marine.multiModelCloseCombatPrecision.failedDiceSubsetsV2",
      "judge_test:marine-multi-model-casualty-stale-action",
    ],
    relationships: ["invalidates", "verified_by"],
    maxDepth: 4,
  });
  if (part9Impact.reachedNodeIds.length !== 4
    || staleImpact.reachedNodeIds.length !== 3) {
    fail("MARINE_MULTI_MODEL_STIMPACK_RELATIONSHIP_IMPACT_MISSING");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    relationshipImpacts: { part9Impact, staleImpact },
  };
}

export function createOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCatalogue(previous);
  const evidence = buildEvidence(catalogue);
  const precision = createOfficialMarineMultiModelCloseCombatPrecisionKernelV2();
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
    marineMultiModelCloseCombatPrecisionKernel: clone(precision.descriptor),
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    ].sort(),
    executableScope:
      "marine_six_or_nine_roster_current_live_subset_stimpack_active_and_single_remaining_marine_target_close_combat",
    marineMultiModelStimpackCloseCombatProgress: {
      initialCompositionOptions: [6, 9],
      currentLiveModelCounts: "1..chosen_initial_composition",
      unitWideLoadouts: ["Strike", "Bayonet_replaces_Strike"],
      mixedPerModelStrikeBayonetAllowed: false,
      fightingAndSupportingRanksExecutable: true,
      attackPoolFormula:
        "(fighting_rank_count + supporting_rank_count) * unit_wide_weapon_roa",
      ordinaryResolutionExecutable: true,
      stimpackPrecisionValue: 3,
      precisionCompleteSubsetDomainExecutable: true,
      targetScope: "exactly_one_remaining_marine_model",
      casualtyAndSupplyWritebackExecutable: true,
      staleLedgerGeometryLoadoutStatusMarkerHistoryRejected: true,
      authorityActionSchemaVersion: "hybrid_legal_space_v14",
      broaderDefenderCasualtyChoicePending: true,
      runtimeExecutorsPromoted: true,
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
      part8RankToAttackPoolPrecisionResolutionPathComplete: true,
      part9UnitWideReplacementToAttackPoolResolutionPathComplete: true,
      casualtyAndGeometryToStaleDomainTestPathsComplete: true,
      mixedCarrierForbiddenPathComplete: true,
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
      completedBeforeThisSlice: 45,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 46,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 46).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 54,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      compositionOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousEffectDenominatorHash: previous.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      previousPrecisionKernelMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v14",
      previousActionSchemaVersion: "hybrid_legal_space_v13",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "multi_model_stimpack_activation_ledger_loadout",
        "ordinary_strike_and_bayonet_rank_pools",
        "precision_complete_failed_hit_subset_domain",
        "casualty_rederives_supply_pool_and_rejects_stale_action",
        "geometry_rejects_stale_pending_choice",
        "mixed_per_model_carrier_fails_closed",
        "authority_v14_two_stage_two_seat_replay",
        "relationship_gap_gate",
      ],
      crossTimeReplayResult:
        "slice45_runtime_and_denominator_remain_exact_while_slice46_adds_opt_in_executors",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-executor-slice",
        "34-executors-still-lack-declared-state-read-write-contracts",
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
        "apply_action_after_user_confirmation",
        "replay_room",
        "query_rule_relationship_impact",
      ],
      uiTraceEvidence: [
        "fighting-and-supporting-models-and-derived-attack-dice-are-visible",
        "unit-wide-strike-or-bayonet-loadout-is-visible",
        "precision-screen-shows-the-complete-post-hit-choice-domain",
      ],
      agentDecisionEvidence: [
        "harness-requeries-after-ledger-geometry-loadout-status-marker-or-history-change",
        "harness-selects-only-authority-enumerated-precision-subsets",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-units71-cards69-rules48-binding-drift-invalidates-slice46",
        "missing-source-consumer-state-test-or-version-relationship-invalidates-slice46",
        "stale-action-pending-choice-or-authority-replay-failure-invalidates-slice46",
      ],
      userVisibleChecks: [
        "six-or-nine-roster-shows-current-live-model-count-and-supply",
        "strike-and-bayonet-show-unit-wide-roa-one-and-two",
        "casualty-or-geometry-change-removes-stale-actions",
        "mixed-per-model-strike-bayonet-loadout-is-rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "broader-defender-casualty-choice-domain-pending",
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "other-units-upgrades-terrain-access-elevation-and-flying-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("MARINE_MULTI_MODEL_STIMPACK_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2(
  input = {},
) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("MARINE_MULTI_MODEL_STIMPACK_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineMultiModelStimpackCloseCombatRuleSliceV2(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("MARINE_MULTI_MODEL_STIMPACK_SLICE_CONTENT_MISMATCH");
  }
  const evidence = buildEvidence(input.slice.catalogue);
  return freezeDeep({
    valid: true,
    schema:
      "starcraft_tmg_official_marine_multi_model_stimpack_close_combat_rule_slice_audit_v2",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    precisionKernelHash:
      input.slice.marineMultiModelCloseCombatPrecisionKernel.kernelHash,
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
    rulesTruth:
      "official_current_marine_multi_model_stimpack_close_combat_and_relationship_gate_frozen",
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
