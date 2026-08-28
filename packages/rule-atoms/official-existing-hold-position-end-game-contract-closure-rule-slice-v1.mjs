import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialHoldPositionEndGameRelationshipExtensionV1,
} from "./official-hold-position-end-game-relationship-contract-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
} from "./official-hold-position-end-game-executor-v1.mjs";
import {
  OFFICIAL_HOLD_POSITION_END_GAME_V2_ACTION_TYPE,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION,
  OFFICIAL_HOLD_POSITION_END_GAME_V2_TRANSITION_SCHEMA,
} from "./official-hold-position-end-game-executor-v2.mjs";
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
  "starcraft_tmg_official_existing_hold_position_end_game_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_victory_point_scoring_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "d29118ef53324b6c15f9b61d048db20f79ad3e0a82a9239941ddfdd87dcaba2c";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe";
const EXPECTED_SLICE_HASH =
  "d74733ad2a030e7e2b5ab7aabcd05f9af5a4129102b8cf951640876972835b21";
const EXPECTED_CATALOGUE_HASH =
  "87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181";
const EXPECTED_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";
const EXPECTED_GRAPH_HASH =
  "db04b18a101271f21e93a5f4ed1ea7bb5c14e5f389bd1117b2625aa74f356b57";

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
    fail("END_GAME_CONTRACT_PREVIOUS_SLICE_INVALID");
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
    fail("END_GAME_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "hold-position-end-game-v2:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:lead-ten-either-seat-and-lead-nine-continue`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-action-source-history-army-and-lifecycle-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:current-scoring-prefix-to-terminal-or-eor-handoff`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:single-end-game-check-and-post-terminal-empty-legal-space`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-to-exact-v2-migration`],
  };
}

function endGameV2Atom(atom) {
  return {
    ...clone(atom),
    atomVersion: "2.0.0",
    effect: {
      executorId: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_HOLD_POSITION_END_GAME_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "END_GAME_V2_ACTION_INVALID",
      "END_GAME_V2_ACTION_MISMATCH",
      "END_GAME_V2_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createEndGameV2Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID) {
      fail("END_GAME_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return endGameV2Atom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS].sort(),
  )) {
    fail("END_GAME_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_HOLD_POSITION_END_GAME_V2_ACTION_TYPE],
    transitionSchema: OFFICIAL_HOLD_POSITION_END_GAME_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.52.0-official-hold-position-end-game-exact-action-v2",
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
  const extension = createOfficialHoldPositionEndGameRelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 17
    || relationshipAudit.counts.stateContractMissingExecutors !== 25
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 158,
      partialContractAtoms: 80,
      noContractAtoms: 183,
      executors: 42,
      declaredStateContractExecutors: 17,
      missingStateContractExecutors: 25,
    })) {
    fail("END_GAME_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  verifyPreviousRelease(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createEndGameV2Catalogue(previous.catalogue);
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
    versionReassignedRuleAtomIds: [...OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID],
    executableScope:
      "hold_position_rounds_two_to_four_exact_special_lead_terminal_or_end_of_round_handoff_v2",
    existingExecutorContractClosureProgress: {
      contractId:
        `${OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      exactPublicEnumerateApplyContractDeclared: true,
      forgedLineageDiagnosticsAndExtraFieldsRejected: true,
      currentScoringPrefixAndMatchBindingDeclared: true,
      bothLiveArmyWitnessesDeclared: true,
      leadNineContinueAndLeadTenTerminalDeclared: true,
      eitherSeatSpecialWinDeclared: true,
      unresolvedArmyEliminationAndFinalRoundFailClosed: true,
      protectedStateWritesDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationPassed: true,
      strictCompleteAtomCountBefore: 156,
      strictCompleteAtomCountAfter: 158,
      partialContractAtomCountBefore: 80,
      partialContractAtomCountAfter: 80,
      noContractAtomCountBefore: 185,
      noContractAtomCountAfter: 183,
      declaredStateContractExecutorCountBefore: 16,
      declaredStateContractExecutorCountAfter: 17,
      stateContractMissingExecutorCountBefore: 26,
      stateContractMissingExecutorCountAfter: 25,
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
      holdPositionEndGameV2ReadsWritesInvalidationsAndTestsComplete: true,
      v1HistoricalExecutorFrozenAndSuperseded: true,
      strictCompleteAtomCount: 158,
      partialContractAtomCount: 80,
      noContractAtomCount: 183,
      declaredStateContractExecutorCount: 17,
      stateContractMissingExecutorCount: 25,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 57,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 56,
      completedAfterThisSlice: 57,
      existingNonStrictAtomsBeforeThisSlice: 265,
      existingNonStrictAtomsAfterThisSlice: 263,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 26,
      stateContractMissingExecutorsAfterThisSlice: 25,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      nextSlicePlanningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousExecutorId: OFFICIAL_HOLD_POSITION_END_GAME_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_HOLD_POSITION_END_GAME_V2_EXECUTOR_ID,
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
      judgeTestsRun: 12,
      crossTimeReplayResult:
        "exact_v2_terminal_and_nonterminal_paths_plus_frozen_v1_replay_passed",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "army_elimination_round_limit_final_scoring_and_trigger_priority_remain_fail_closed",
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
      uiTraceEvidence: "authority_terminal_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_exact_special-win-terminal-or-end-of-round-handoff",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official source scoring prefix or live-army witness drift quarantines end-game v2",
        "exact action Judge signature terminal summary or replay failure demotes current runtime",
      ],
      userVisibleChecks: [
        "preview shows threshold scores outcome and excluded terminal checks",
        "terminal apply exposes winner reason and no post-terminal legal actions",
        "nonterminal apply hands off to end-of-round effects",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "twenty_five_existing_executor_contracts_remain",
      "two_hundred_sixty_three_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "army_elimination_final_scoring_other_missions_and_trigger_priority_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("END_GAME_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("END_GAME_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingHoldPositionEndGameContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("END_GAME_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue);
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS].sort(),
    )) {
    fail("END_GAME_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_hold_position_end_game_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_HOLD_POSITION_END_GAME_V2_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "hold_position_end_game_v2_exact_public_action_and_state_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
