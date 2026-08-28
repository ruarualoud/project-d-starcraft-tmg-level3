import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
} from "./official-start-of-round-executor-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v2.mjs";
import { createOfficialStartOfRoundRelationshipExtensionV1 } from
  "./official-start-of-round-relationship-contract-v1.mjs";
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
  "starcraft_tmg_official_existing_start_of_round_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_determine_initiative_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7";
const EXPECTED_SLICE_HASH =
  "3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b";
const EXPECTED_CATALOGUE_HASH =
  "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529";
const EXPECTED_RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";
const EXPECTED_GRAPH_HASH =
  "62e894083bdf2d4e52601f9bc3d17da857d7954b40033ac3d481498dfaa4ee5e";

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
    fail("START_OF_ROUND_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("START_OF_ROUND_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("START_OF_ROUND_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "start-of-round-v2:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:finite-final-supply-stationary-ready`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-history-source-and-exact-action-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:initiative-v2-to-start-v2-to-movement-choice`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:round-three-through-final-round-supply-window`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-to-current-initiative-v2`],
  };
}

function reboundAtom(atom) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "START_OF_ROUND_V2_ACTION_INVALID",
      "START_OF_ROUND_V2_ACTION_MISMATCH",
      "START_OF_ROUND_V2_LATEST_OFFICIAL_DATA_REQUIRED",
      "START_OF_ROUND_V2_CLEANUP_HISTORY_INVALID",
      "START_OF_ROUND_V2_INITIATIVE_HISTORY_INVALID",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createStartOfRoundV2Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_START_OF_ROUND_EXECUTOR_ID) {
      fail("START_OF_ROUND_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS].sort(),
  )) {
    fail("START_OF_ROUND_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const previousEntries = previousCatalogue.executorManifest.filter((entry) => (
    entry.executorId === OFFICIAL_START_OF_ROUND_EXECUTOR_ID
  ));
  if (previousEntries.length !== 1) {
    fail("START_OF_ROUND_CONTRACT_V1_MANIFEST_INVALID");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_START_OF_ROUND_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_START_OF_ROUND_V2_ACTION_TYPE],
    transitionSchema: OFFICIAL_START_OF_ROUND_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.56.0-official-start-of-round-current-initiative-v2",
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
  const extension = createOfficialStartOfRoundRelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 25
    || relationshipAudit.counts.stateContractMissingExecutors !== 17
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 186,
      partialContractAtoms: 78,
      noContractAtoms: 157,
      executors: 42,
      declaredStateContractExecutors: 25,
      missingStateContractExecutors: 17,
    })) {
    fail("START_OF_ROUND_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingStartOfRoundContractClosureRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createStartOfRoundV2Catalogue(previous.catalogue);
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
    versionReassignedRuleAtomIds: [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID],
    executableScope:
      "current_initiative_v2_to_start_of_round_v2_supply_stationary_ready_subset",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_START_OF_ROUND_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      currentV2StrictInitiativeHandoffAdded: true,
      exactFirstPlayerOnlyActionDeclared: true,
      finiteAndFinalRoundSupplyDeclared: true,
      reserveExcludedFromOnTableSupplyDeclared: true,
      stationaryAndReadyCardEffectsDeclared: true,
      firstPlayerThenOpponentEffectOrderDeclared: true,
      cleanupV5AndInitiativeV2PrefixDeclared: true,
      forgedHistorySourceRuntimeAndActionFailClosed: true,
      protectedBoardPieceScoreMissionAndHistoryDeclared: true,
      movementPhaseChoiceRemainsPending: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 173,
      strictCompleteAtomCountAfter: 186,
      partialContractAtomCountBefore: 78,
      partialContractAtomCountAfter: 78,
      noContractAtomCountBefore: 170,
      noContractAtomCountAfter: 157,
      declaredStateContractExecutorCountBefore: 24,
      declaredStateContractExecutorCountAfter: 25,
      stateContractMissingExecutorCountBefore: 18,
      stateContractMissingExecutorCountAfter: 17,
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
      startOfRoundV2ReadsWritesInvalidationsSupplyEffectsAndTestsComplete: true,
      historicalV1FrozenAndSuperseded: true,
      strictCompleteAtomCount: 186,
      partialContractAtomCount: 78,
      noContractAtomCount: 157,
      nonStrictAtomCount: 235,
      declaredStateContractExecutorCount: 25,
      stateContractMissingExecutorCount: 17,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 61,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 60,
      completedAfterThisSlice: 61,
      existingNonStrictAtomsBeforeThisSlice: 248,
      existingNonStrictAtomsAfterThisSlice: 235,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 18,
      stateContractMissingExecutorsAfterThisSlice: 17,
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
      frozenExecutorId: OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
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
      judgeTestsRun: 15,
      crossTimeReplayResult:
        "current_v2_initiative_handoff_plus_frozen_v1_runtime_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_seventeen_executor_contracts_open",
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
      uiTraceEvidence: "authority_start_window_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_supply_effect_order_stationary_and_card_ready_resolution",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "initiative cleanup source supply or exact-action drift quarantines v2",
        "effect order replay signature or historical-display failure demotes runtime",
      ],
      userVisibleChecks: [
        "preview shows supply mode stationary count and ready-card count",
        "apply opens Movement but still requires phase-first-actor choice",
        "history retains frozen v1 rules beside current v2",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "seventeen_existing_executor_contracts_remain",
      "two_hundred_thirty_five_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "movement_attack_trigger_priority_and_remaining_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (EXPECTED_SLICE_HASH !== "FREEZE_AFTER_GRAPH"
    && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("START_OF_ROUND_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingStartOfRoundContractClosureRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || (EXPECTED_SLICE_HASH !== "FREEZE_AFTER_GRAPH"
      && slice.sliceHash !== EXPECTED_SLICE_HASH)
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("START_OF_ROUND_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingStartOfRoundContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("START_OF_ROUND_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS);
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
      [...OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS].sort(),
    )) {
    fail("START_OF_ROUND_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_start_of_round_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "start_of_round_v2_current_initiative_handoff_exact_state_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
