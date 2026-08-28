import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialVictoryPointScoringRelationshipExtensionV1,
} from "./official-victory-point-scoring-relationship-contract-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
} from "./official-victory-point-scoring-executor-v1.mjs";
import {
  OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE,
  OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
  OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
  OFFICIAL_VICTORY_POINT_SCORING_V2_TRANSITION_SCHEMA,
} from "./official-victory-point-scoring-executor-v2.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_victory_point_scoring_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_mission_marker_control_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "fdb44c36f5c418954b0524a3943cccf09fe3bc44b3e34e0533be9b73235d6662";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "d7ebb1f60f861544a31711362077927dde00271faf91e44350b5000ed06ff908";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55";
const EXPECTED_SLICE_HASH =
  "d29118ef53324b6c15f9b61d048db20f79ad3e0a82a9239941ddfdd87dcaba2c";
const EXPECTED_CATALOGUE_HASH =
  "23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a";
const EXPECTED_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";
const EXPECTED_GRAPH_HASH =
  "383a9fdb67aa5454efa536b4a8c77964e00c3f7edbde6932e187b638c9724844";

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
    || previousSlice.catalogue?.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("VP_SCORING_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
}

function verifyPreviousRelease(previousSlice) {
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (audit.counts.byDisposition.executable !== 421
    || audit.counts.byDisposition.review_required !== 491
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("VP_SCORING_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "victory-point-scoring-v2:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:exact-affinity-breakdown-and-simultaneous-score`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-action-source-ledger-and-lifecycle-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:marker-control-affinity-zero-supply-and-score-composition`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:marker-control-to-score-to-end-game-check`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-to-exact-v2-migration`],
  };
}

function victoryPointScoringV2Atom(atom) {
  return {
    ...clone(atom),
    atomVersion: "2.0.0",
    effect: {
      executorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_VICTORY_POINT_SCORING_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "VP_SCORING_V2_ACTION_INVALID",
      "VP_SCORING_V2_ACTION_MISMATCH",
      "VP_SCORING_V2_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createVictoryPointScoringV2Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID) {
      fail("VP_SCORING_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return victoryPointScoringV2Atom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS].sort(),
  )) {
    fail("VP_SCORING_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_VICTORY_POINT_SCORING_V2_ACTION_TYPE],
    transitionSchema: OFFICIAL_VICTORY_POINT_SCORING_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.51.0-official-victory-point-scoring-exact-action-v2",
    rulesVersion: previousCatalogue.rulesVersion,
    sourceDenominatorStatus: previousCatalogue.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(previousCatalogue.sourceDenominatorBinding),
    sourceSnapshots: clone(previousCatalogue.sourceSnapshots),
    sourceClauses: clone(previousCatalogue.sourceClauses),
    atoms,
    executorManifest,
  });
}

function buildEvidence(catalogue) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const extension = createOfficialVictoryPointScoringRelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_GRAPH_HASH
    || catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 16
    || relationshipAudit.counts.stateContractMissingExecutors !== 26
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 156,
      partialContractAtoms: 80,
      noContractAtoms: 185,
      executors: 42,
      declaredStateContractExecutors: 16,
      missingStateContractExecutors: 26,
    })) {
    fail("VP_SCORING_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogue: catalogueAudit.counts.byDisposition,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
    }));
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    stateContractCoverage,
  };
}

export function createOfficialExistingVictoryPointScoringContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  verifyPreviousRelease(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createVictoryPointScoringV2Catalogue(previous.catalogue);
  const evidence = buildEvidence(catalogue);
  const carried = without(clone(previous), [
    "schema",
    "sliceHash",
    "previousSliceHash",
    "previousCatalogueHash",
    "catalogue",
    "catalogueHash",
    "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds",
    "executorIds",
    "executableScope",
    "existingExecutorContractClosureProgress",
    "ruleRelationshipGraphBinding",
    "ruleRelationshipProgress",
    "sliceForecast",
    "historicalCompatibility",
    "ctx2skill",
    "harness",
    "blocks",
  ]);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID],
    executableScope:
      "victory_point_scoring_v2_exact_public_action_official_binding_zero_supply_affinity_simultaneous_commit_and_replay_contract",
    existingExecutorContractClosureProgress: {
      contractId:
        `${OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      exactPublicEnumerateApplyContractDeclared: true,
      forgedLineageResolutionDiagnosticsAndExtraFieldsRejected: true,
      officialLatestDataMissionSetupAndRuntimeBindingDeclared: true,
      zeroSupplyLossLedgerScopeDeclared: true,
      fiveMarkerAffinityBreakdownsDeclared: true,
      simultaneousBothPlayerScoreCommitDeclared: true,
      cleanupSeatOrderAndSingleResolutionLifecycleDeclared: true,
      protectedStateWritesDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationPassed: true,
      strictCompleteAtomCountBefore: 144,
      strictCompleteAtomCountAfter: 156,
      partialContractAtomCountBefore: 80,
      partialContractAtomCountAfter: 80,
      noContractAtomCountBefore: 197,
      noContractAtomCountAfter: 185,
      declaredStateContractExecutorCountBefore: 15,
      declaredStateContractExecutorCountAfter: 16,
      stateContractMissingExecutorCountBefore: 27,
      stateContractMissingExecutorCountAfter: 26,
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
      victoryPointScoringV2ReadsWritesInvalidationsAndTestsComplete: true,
      v1HistoricalExecutorFrozenAndSuperseded: true,
      strictCompleteAtomCount: 156,
      partialContractAtomCount: 80,
      noContractAtomCount: 185,
      declaredStateContractExecutorCount: 16,
      stateContractMissingExecutorCount: 26,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 55,
      completedAfterThisSlice: 56,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 27,
      stateContractMissingExecutorsAfterThisSlice: 26,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousExecutorId: OFFICIAL_VICTORY_POINT_SCORING_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_VICTORY_POINT_SCORING_V2_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v17",
      previousActionSchemaVersion: "hybrid_legal_space_v17",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 11,
      crossTimeReplayResult:
        "exact_v2_scoring_and_frozen_v1_replay_passed_without_skill_promotion",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "nonzero_supply_attribution_remains_fail_closed",
        "remaining_491_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: [
        "read_board_state",
        "list_legal_actions",
        "preview_action",
        "apply_action_after_user_confirmation",
        "replay_room",
      ],
      uiTraceEvidence: "authority_scoring_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_exact_affinity_breakdown_and_simultaneous_score_commit",
      memoryTraceEvidence: {
        refs: [],
        promotionAttempted: false,
      },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official source setup ledger or marker drift quarantines the scoring contract",
        "exact action Judge signature or replay failure demotes the current runtime",
      ],
      userVisibleChecks: [
        "preview shows both players per-marker affinity and VP breakdown",
        "accepted action updates both scores and advances to end-game check",
        "forged or stale action is visibly rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "twenty_six_existing_executor_contracts_remain",
      "two_hundred_sixty_five_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "nonzero_supply_attribution_final_scoring_and_other_missions_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("VP_SCORING_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingVictoryPointScoringContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("VP_SCORING_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingVictoryPointScoringContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("VP_SCORING_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue);
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS].sort(),
    )) {
    fail("VP_SCORING_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_victory_point_scoring_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    graphNodes: evidence.graph.nodes.length,
    graphEdges: evidence.graph.edges.length,
    counts: {
      executableRuleAtoms: audit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: audit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: audit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_VICTORY_POINT_SCORING_V2_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "victory_point_scoring_v2_exact_public_action_and_state_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
