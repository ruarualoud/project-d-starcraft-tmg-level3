import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_TRANSITION_SCHEMA,
} from "./official-marine-stimpack-active-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";
import {
  createOfficialStimpackCloseCombatRelationshipExtensionV1,
} from "./official-stimpack-close-combat-relationship-contract-v1.mjs";
import {
  OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA,
} from "./official-stimpack-close-combat-consumer-executor-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_stimpack_close_combat_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_rule_relationship_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "910f289b54b73dfcd5b69b52a6d9ad500af68a4e531d311fa3c9d5b0a456fd23";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c";
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

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
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
    fail("STIMPACK_CLOSE_COMBAT_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  if (audit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || audit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || audit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0) {
    fail("STIMPACK_CLOSE_COMBAT_PREVIOUS_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("STIMPACK_CLOSE_COMBAT_PREVIOUS_RUNTIME_DRIFT");
  }
}

function createCatalogue(previousSlice) {
  const base = previousSlice.catalogue;
  const executorManifest = clone(base.executorManifest);
  executorManifest.push(
    {
      executorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
      executorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_VERSION,
      actionTypes: [OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE],
      transitionSchema: OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_TRANSITION_SCHEMA,
    },
    {
      executorId: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
      executorVersion: OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
      actionTypes: [
        OFFICIAL_RESOLVE_STIMPACK_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
        OFFICIAL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      ].sort(),
      transitionSchema: OFFICIAL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA,
    },
  );
  return createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.43.0-official-stimpack-close-combat-precision",
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
    fail("STIMPACK_CLOSE_COMBAT_CATALOGUE_INVALID");
  }
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialStimpackCloseCombatRelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  if (!relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 37
    || relationshipAudit.counts.declaredStateContractExecutors !== 3
    || relationshipAudit.counts.stateContractMissingExecutors !== 34
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0
    || relationshipAudit.gaps.executorConsumerGaps.length !== 0) {
    fail("STIMPACK_CLOSE_COMBAT_RELATIONSHIP_AUDIT_INVALID");
  }
  return { catalogueAudit, runtime: runtime.descriptor, graph, relationshipAudit };
}

export function createOfficialStimpackCloseCombatRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCatalogue(previous);
  const { runtime, graph, relationshipAudit } = buildEvidence(catalogue);
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
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_MARINE_STIMPACK_ACTIVE_V2_EXECUTOR_ID,
      OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    ].sort(),
    executableScope:
      "current_single_model_marine_stimpack_strike_and_bayonet_close_combat_precision_post_hit_complete_choice_domain",
    stimpackCloseCombatProgress: {
      sourceUnit: "Marine",
      sourceAbility: "Stimpack",
      precision: 3,
      supportedCloseCombatWeapons: [
        { weaponName: "Strike", replacementOf: null, rateOfAttack: 1 },
        { weaponName: "Bayonet", replacementOf: "Strike", rateOfAttack: 2 },
      ],
      bayonetStimpackActivationReachable: true,
      ordinaryCloseCombatPrecisionAvailable: false,
      precisionChoiceTiming: "after_hit_roll_before_armour_pool",
      precisionLegalSpace:
        "all_subsets_of_failed_hit_die_indices_up_to_three_including_empty",
      convertedDiceAreHitsForAllPurposes: true,
      cleanupInvalidatesOldPrecisionDomain: true,
      unknownWeaponStatusMarkerHistoryPolicy: "fail_closed",
      historicalStimpackActiveV1Frozen: true,
      historicalRangedPrecisionKernelV6Frozen: true,
    },
    ruleRelationshipGraphBinding: {
      graphSchema: graph.schema,
      graphHash: graph.graphHash,
      relationshipAuthority: graph.relationshipAuthority,
      rulesAuthority: false,
      catalogueHash: graph.catalogueHash,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      coverageScopeCount: graph.coverageScopes.length,
      declaredStateContractExecutorCount:
        graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      sourceClauseToAtomCoverageComplete: true,
      executableAtomToConsumerCoverageComplete: true,
      executableAtomSixKindEvidenceCoverageComplete: true,
      compositionExecutorLineageCoverageComplete: true,
      stimpackStatusToAllCurrentMarineCloseCombatWeaponConsumersComplete: true,
      bayonetReplacementReachabilityComplete: true,
      cleanupPrecisionDomainInvalidationComplete: true,
      declaredStateContractExecutorCount:
        relationshipAudit.counts.declaredStateContractExecutors,
      stateContractMissingExecutorCount:
        relationshipAudit.counts.stateContractMissingExecutors,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    officialDataPolicy: clone(previous.officialDataPolicy),
    sliceForecast: {
      completedBeforeThisSlice: 43,
      remainingActionableAtomsBeforeThisSlice: 491,
      completedAfterThisSlice: 44,
      averageAtomsPerSliceAfterThisSlice: Number((421 / 44).toFixed(3)),
      remainingActionableAtomsAfterThisSlice: 491,
      forecastRemainingSlicesAfterThisSlice: 51,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
      compositionOnlySlice: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: runtime.runtimeHash,
      previousEffectDenominatorHash: previous.combatEffectDenominatorHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      previousPrecisionKernelMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v13",
      previousActionSchemaVersion: "hybrid_legal_space_v12",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "bayonet_stimpack_authority_reachability",
        "ordinary_close_combat_has_no_precision_domain",
        "strike_post_hit_precision_complete_choice_domain",
        "bayonet_post_hit_precision_complete_choice_domain",
        "cleanup_invalidates_old_close_combat_precision_domain",
        "unknown_weapon_status_marker_or_history_fails_closed",
        "two_seat_authority_preview_confirm_and_replay",
        "slice43_catalogue_runtime_and_rules_display_cross_time_freeze",
      ],
      crossTimeReplayResult:
        "slice43_runtime_remains_exact_and_slice44_replay_is_deterministic",
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
      ],
      uiTraceEvidence: [
        "strike-and-bayonet-show-distinct-committed-hit-pool-sizes",
        "post-hit-screen-shows-every-failed-die-subset-up-to-three",
        "ordinary-and-cleaned-up-marine-show-no-precision-choice-domain",
      ],
      agentDecisionEvidence: [
        "rules-own-hit-reveal-and-agent-selects-only-enumerated-failed-die-subsets",
        "harness-never-infers-precision-for-ordinary-or-unknown-close-combat-material",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official-marine-close-combat-profile-or-stimpack-source-drift-invalidates-slice-44",
        "reachability-choice-domain-cleanup-fail-closed-or-replay-failure-invalidates-slice-44",
      ],
      userVisibleChecks: [
        "stimpack-plus-bayonet-can-be-activated-without-dropping-the-replacement-loadout",
        "strike-uses-one-hit-die-and-bayonet-uses-two-before-precision-choice",
        "ordinary-close-combat-never-receives-stimpack-precision",
        "cleanup-or-material-drift-removes-the-old-choice-domain",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "global-rule-atom-denominator-remains-incomplete",
      "global-executor-state-relationship-coverage-remains-partial",
      "other-units-upgrades-terrain-access-elevation-and-flying-pending",
      "production-complete-legal-space-pending",
      "browser-device-ui-and-training-promotion-pending",
    ],
  };
  const slice = freezeDeep({ ...body, sliceHash: hashStarcraftTmgContract(body) });
  const changedAtoms = slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    previous.catalogue.atoms.find((previousAtom) => previousAtom.atomId === atom.atomId),
  )).length;
  if (changedAtoms !== 0) fail("STIMPACK_CLOSE_COMBAT_ATOM_MUTATION");
  return slice;
}

export function verifyOfficialStimpackCloseCombatRuleSliceV1(input = {}) {
  if (!object(input.slice)
    || input.slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(input.slice)) !== input.slice.sliceHash) {
    fail("STIMPACK_CLOSE_COMBAT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialStimpackCloseCombatRuleSliceV1(input);
  if (!isDeepStrictEqual(input.slice, expected)) {
    fail("STIMPACK_CLOSE_COMBAT_SLICE_CONTENT_MISMATCH");
  }
  const { catalogueAudit, runtime, graph, relationshipAudit } = buildEvidence(
    input.slice.catalogue,
  );
  const changedAtoms = input.slice.catalogue.atoms.filter((atom) => !isDeepStrictEqual(
    atom,
    input.previousSlice.catalogue.atoms.find((previousAtom) => (
      previousAtom.atomId === atom.atomId
    )),
  )).length;
  return freezeDeep({
    valid: true,
    schema: "starcraft_tmg_official_stimpack_close_combat_rule_slice_audit_v1",
    sliceHash: input.slice.sliceHash,
    catalogueHash: input.slice.catalogueHash,
    runtimeHash: runtime.runtimeHash,
    graphHash: graph.graphHash,
    relationshipGraphAudit: clone(relationshipAudit),
    counts: {
      sourceClauses: catalogueAudit.counts.sourceClauses,
      ruleAtoms: catalogueAudit.counts.atoms,
      executableRuleAtoms: catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: catalogueAudit.counts.byDisposition.display_only,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: 0,
      changedAtoms,
      executableContractGaps: catalogueAudit.executableContractGaps.length,
      evidenceGaps: catalogueAudit.evidenceGaps.length,
      relationshipBlockingGaps: relationshipAudit.counts.blockingGaps,
      stateContractMissingExecutors:
        relationshipAudit.counts.stateContractMissingExecutors,
    },
    rulesTruth:
      "official_current_stimpack_close_combat_precision_composition_exact_subset",
    productionRoomEligible: false,
    trainingTruth: false,
  });
}
