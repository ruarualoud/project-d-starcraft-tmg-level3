import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialDetermineInitiativeRelationshipExtensionV1,
} from "./official-determine-initiative-relationship-contract-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
} from "./official-determine-initiative-executor-v1.mjs";
import {
  OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
  OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
  OFFICIAL_DETERMINE_INITIATIVE_V2_TRANSITION_SCHEMA,
} from "./official-determine-initiative-executor-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
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
  "starcraft_tmg_official_existing_determine_initiative_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_cleanup_refresh_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d";
const EXPECTED_SLICE_HASH =
  "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448";
const EXPECTED_CATALOGUE_HASH =
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38";
const EXPECTED_RUNTIME_HASH =
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";
const EXPECTED_GRAPH_HASH =
  "25fbf95e92e6be04ebaad41a1b7a2edf77423ddb885f21d8134ddb18969b07e8";

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

function nextMajor(version) {
  const major = Number(String(version || "").split(".")[0]);
  if (!Number.isSafeInteger(major) || major < 1) {
    fail("DETERMINE_INITIATIVE_CONTRACT_ATOM_VERSION_INVALID");
  }
  return `${major + 1}.0.0`;
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previousSlice.catalogue?.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("DETERMINE_INITIATIVE_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("DETERMINE_INITIATIVE_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "determine-initiative-v2:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:lower-vp-and-tied-current-cleanup-v5`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-stale-source-and-cleanup-history-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:cleanup-v5-to-initiative-v2-to-start-round`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:fresh-hidden-rolloff-attempt-until-winner`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-chance-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-to-current-cleanup-v5-v2`],
  };
}

function reboundAtom(atom) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_DETERMINE_INITIATIVE_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "DETERMINE_INITIATIVE_V2_ACTION_INVALID",
      "DETERMINE_INITIATIVE_V2_ACTION_MISMATCH",
      "DETERMINE_INITIATIVE_V2_CLEANUP_HISTORY_INVALID",
      "DETERMINE_INITIATIVE_V2_LATEST_OFFICIAL_DATA_REQUIRED",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createDetermineInitiativeV2Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID) {
      fail("DETERMINE_INITIATIVE_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS].sort(),
  )) {
    fail("DETERMINE_INITIATIVE_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const previousEntries = previousCatalogue.executorManifest.filter((entry) => (
    entry.executorId === OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID
  ));
  if (previousEntries.length !== 1) {
    fail("DETERMINE_INITIATIVE_CONTRACT_V1_MANIFEST_INVALID");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_DETERMINE_INITIATIVE_V2_ACTION_TYPE],
    transitionSchema: OFFICIAL_DETERMINE_INITIATIVE_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.55.0-official-determine-initiative-current-cleanup-v5-v2",
    rulesVersion: previousCatalogue.rulesVersion,
    sourceDenominatorStatus: previousCatalogue.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(previousCatalogue.sourceDenominatorBinding),
    sourceSnapshots: clone(previousCatalogue.sourceSnapshots),
    sourceClauses: clone(previousCatalogue.sourceClauses),
    atoms,
    executorManifest,
  });
}

function buildEvidence(catalogue, { freezeGraph = true } = {}) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const extension = createOfficialDetermineInitiativeRelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || (freezeGraph && graph.graphHash !== EXPECTED_GRAPH_HASH)
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 24
    || relationshipAudit.counts.stateContractMissingExecutors !== 18
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 173,
      partialContractAtoms: 78,
      noContractAtoms: 170,
      executors: 42,
      declaredStateContractExecutors: 24,
      missingStateContractExecutors: 18,
    })) {
    fail("DETERMINE_INITIATIVE_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
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

export function createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createDetermineInitiativeV2Catalogue(previous.catalogue);
  const evidence = buildEvidence(catalogue, {
    freezeGraph: EXPECTED_GRAPH_HASH !== "FREEZE_AFTER_GRAPH",
  });
  const carried = without(clone(previous), [
    "schema",
    "sliceHash",
    "previousSliceHash",
    "previousCatalogueHash",
    "catalogue",
    "catalogueHash",
    "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds",
    "contractEvidenceReboundRuleAtomIds",
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
    versionReassignedRuleAtomIds: [...OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [
      ...OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS,
    ],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID],
    executableScope:
      "current_cleanup_v5_to_determine_initiative_v2_lower_vp_and_hidden_tied_rolloff",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      currentV2StrictCleanupV5AdapterAdded: true,
      exactFirstPlayerOnlyActionDeclared: true,
      lowerVictoryPointMarkerAssignmentDeclared: true,
      tiedTwoD6HiddenChanceTicketDeclared: true,
      freshChanceTicketAfterEveryTieDeclared: true,
      cleanupV5PrefixAndCurrentOfficialBindingDeclared: true,
      forgedStaleSourceRuntimeAndHistoryFailsClosed: true,
      tieAndWinningWriteSetsDeclaredSeparately: true,
      protectedBoardPieceScoreCardAndMissionStateDeclared: true,
      nextRoundStopsAtClosedStartOfRoundWindow: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ChanceReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 167,
      strictCompleteAtomCountAfter: 173,
      partialContractAtomCountBefore: 78,
      partialContractAtomCountAfter: 78,
      noContractAtomCountBefore: 176,
      noContractAtomCountAfter: 170,
      declaredStateContractExecutorCountBefore: 23,
      declaredStateContractExecutorCountAfter: 24,
      stateContractMissingExecutorCountBefore: 19,
      stateContractMissingExecutorCountAfter: 18,
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
      determineInitiativeV2ReadsWritesInvalidationsChanceAndTestsComplete: true,
      historicalV1FrozenAndSuperseded: true,
      strictCompleteAtomCount: 173,
      partialContractAtomCount: 78,
      noContractAtomCount: 170,
      nonStrictAtomCount: 248,
      declaredStateContractExecutorCount: 24,
      stateContractMissingExecutorCount: 18,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 60,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 59,
      completedAfterThisSlice: 60,
      existingNonStrictAtomsBeforeThisSlice: 254,
      existingNonStrictAtomsAfterThisSlice: 248,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 19,
      stateContractMissingExecutorsAfterThisSlice: 18,
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
      frozenExecutorId: OFFICIAL_DETERMINE_INITIATIVE_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v19",
      previousActionSchemaVersion: "hybrid_legal_space_v19",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 14,
      crossTimeReplayResult:
        "current_v2_cleanup_v5_chain_plus_frozen_v1_runtime_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_eighteen_executor_contracts_open",
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
      uiTraceEvidence:
        "authority_initiative_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_lower_vp_or_hidden_tied_two_d6_initiative_domain",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "cleanup-v5 history source score progress or exact-action drift quarantines v2",
        "chance receipt replay signature or historical-display failure demotes runtime",
      ],
      userVisibleChecks: [
        "preview hides tied Roll-Off outcomes until confirmed apply",
        "apply records initiative and keeps Start-of-Round effects pending",
        "history retains frozen v1 rules beside current v2",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "eighteen_existing_executor_contracts_remain",
      "two_hundred_forty_eight_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "start_of_round_and_remaining_trigger_priority_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (EXPECTED_SLICE_HASH !== "FREEZE_AFTER_GRAPH"
    && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("DETERMINE_INITIATIVE_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingDetermineInitiativeContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || (EXPECTED_SLICE_HASH !== "FREEZE_AFTER_GRAPH"
      && slice.sliceHash !== EXPECTED_SLICE_HASH)
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("DETERMINE_INITIATIVE_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingDetermineInitiativeContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("DETERMINE_INITIATIVE_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue, {
    freezeGraph: EXPECTED_GRAPH_HASH !== "FREEZE_AFTER_GRAPH",
  });
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS].sort(),
    )) {
    fail("DETERMINE_INITIATIVE_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_determine_initiative_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms:
        OFFICIAL_DETERMINE_INITIATIVE_V2_EXECUTOR_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth:
      "determine_initiative_v2_current_cleanup_v5_exact_action_and_state_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
