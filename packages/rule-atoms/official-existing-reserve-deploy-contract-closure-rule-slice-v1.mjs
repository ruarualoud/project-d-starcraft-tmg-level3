import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS,
} from "./official-reserve-deploy-executor-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_V2_TRANSITION_SCHEMA,
} from "./official-reserve-deploy-executor-v2.mjs";
import { createOfficialReserveDeployRelationshipExtensionV1 } from
  "./official-reserve-deploy-relationship-contract-v1.mjs";
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
  "starcraft_tmg_official_existing_reserve_deploy_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_start_of_round_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99";
const EXPECTED_SLICE_HASH =
  "95d7d170e04ea331949f75dc50709c3e7e4da42a166f71a6096794299967f378";
const EXPECTED_CATALOGUE_HASH =
  "702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1";
const EXPECTED_RUNTIME_HASH =
  "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c";
const EXPECTED_GRAPH_HASH =
  "afd540544a397b5c1a55c305477d57a2c2bf713fcadb8fd6834e5e1358e9a2f8";

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
    fail("RESERVE_DEPLOY_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("RESERVE_DEPLOY_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("RESERVE_DEPLOY_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "reserve-deploy-v2:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:current-start-phase-deploy-success`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-start-phase-supply-and-action-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:start-v2-phase-v1-movement-supply-lineage`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:reserve-to-field-activation-and-alternation`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-to-current-v2-source-and-runtime`],
  };
}

function reboundAtom(atom) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_RESERVE_DEPLOY_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "RESERVE_DEPLOY_V2_ACTION_INVALID",
      "RESERVE_DEPLOY_V2_ACTION_MISMATCH",
      "RESERVE_DEPLOY_V2_PARAMETER_DOMAIN_INVALID",
      "RESERVE_DEPLOY_V2_PARAMETER_DOMAIN_STALE",
      "RESERVE_DEPLOY_V2_START_OF_ROUND_HANDOFF_INVALID",
      "RESERVE_DEPLOY_V2_PHASE_HANDOFF_INVALID",
      "RESERVE_DEPLOY_V2_SUPPLY_LINEAGE_INVALID",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createReserveDeployV2Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_RESERVE_DEPLOY_NEW_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID) {
      fail("RESERVE_DEPLOY_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS].sort(),
  )) {
    fail("RESERVE_DEPLOY_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const previousEntries = previousCatalogue.executorManifest.filter((entry) => (
    entry.executorId === OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID
  ));
  if (previousEntries.length !== 1) fail("RESERVE_DEPLOY_CONTRACT_V1_MANIFEST_INVALID");
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION,
    actionTypes: ["deploy"],
    transitionSchema: OFFICIAL_RESERVE_DEPLOY_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.57.0-official-reserve-deploy-current-handoffs-v2",
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
  const extension = createOfficialReserveDeployRelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 26
    || relationshipAudit.counts.stateContractMissingExecutors !== 16
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 216,
      partialContractAtoms: 67,
      noContractAtoms: 138,
      executors: 42,
      declaredStateContractExecutors: 26,
      missingStateContractExecutors: 16,
    })) {
    fail("RESERVE_DEPLOY_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingReserveDeployContractClosureRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createReserveDeployV2Catalogue(previous.catalogue);
  const evidence = buildEvidence(catalogue, {
    freezeGraph: true,
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
    versionReassignedRuleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID],
    executableScope:
      "current_start_v2_phase_v1_supply_lineage_gauntlet_marine_reserve_deploy_v2",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      currentV2StartAndPhaseHandoffsAdded: true,
      roundSupplyMutationLineageDeclared: true,
      exactParameterDomainAndActionDeclared: true,
      sourceBoundGauntletMarineGeometryDeclared: true,
      speedOverlapEngagementZoneAndCoherencyDeclared: true,
      stationaryActivationSupplyAndAlternationDeclared: true,
      forgedStartPhaseSupplyDomainAndActionFailClosed: true,
      protectedMissionBoardScoreAndHistoryDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 186,
      strictCompleteAtomCountAfter: 216,
      partialContractAtomCountBefore: 78,
      partialContractAtomCountAfter: 67,
      noContractAtomCountBefore: 157,
      noContractAtomCountAfter: 138,
      declaredStateContractExecutorCountBefore: 25,
      declaredStateContractExecutorCountAfter: 26,
      stateContractMissingExecutorCountBefore: 17,
      stateContractMissingExecutorCountAfter: 16,
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
      reserveDeployV2ReadsWritesInvalidationsHandoffsSupplyGeometryAndTestsComplete: true,
      historicalV1FrozenAndSuperseded: true,
      strictCompleteAtomCount: 216,
      partialContractAtomCount: 67,
      noContractAtomCount: 138,
      nonStrictAtomCount: 205,
      declaredStateContractExecutorCount: 26,
      stateContractMissingExecutorCount: 16,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 62,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 61,
      completedAfterThisSlice: 62,
      existingNonStrictAtomsBeforeThisSlice: 235,
      existingNonStrictAtomsAfterThisSlice: 205,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 17,
      stateContractMissingExecutorsAfterThisSlice: 16,
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
      frozenExecutorId: OFFICIAL_RESERVE_DEPLOY_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v20",
      previousActionSchemaVersion: "hybrid_legal_space_v19",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 12,
      crossTimeReplayResult:
        "current_v2_handoff_supply_lineage_plus_frozen_v1_runtime_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_sixteen_executor_contracts_open",
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
      uiTraceEvidence: "authority_deploy_domain_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_start_phase_supply_geometry_domain_and_exact_deploy_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "start phase supply source geometry or exact-action drift quarantines v2",
        "replay signature relationship or historical-display failure demotes runtime",
      ],
      userVisibleChecks: [
        "legal space exposes entry edge speed supply and exact model placement domain",
        "preview shows path placement supply and Stationary removal",
        "forged handoff supply geometry or public action is rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "sixteen_existing_executor_contracts_remain",
      "two_hundred_five_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "remaining_movement_attack_trigger_priority_and_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("RESERVE_DEPLOY_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingReserveDeployContractClosureRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("RESERVE_DEPLOY_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingReserveDeployContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("RESERVE_DEPLOY_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue, {
    freezeGraph: true,
  });
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS].sort(),
    )) {
    fail("RESERVE_DEPLOY_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_reserve_deploy_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "reserve_deploy_v2_current_handoff_supply_geometry_exact_state_contract",
    productionTruth: false,
    trainingTruth: false,
  });
}
