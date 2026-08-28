import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
} from "./official-disengage-casualty-executor-v1.mjs";
import {
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_V3_TRANSITION_SCHEMA,
} from "./official-disengage-executor-v3.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementV3RelationshipExtensionV1 } from
  "./official-movement-v3-relationship-contract-v1.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
} from "./official-reserve-deploy-executor-v2.mjs";
import {
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION,
  OFFICIAL_RESERVE_DEPLOY_V3_TRANSITION_SCHEMA,
} from "./official-reserve-deploy-executor-v3.mjs";
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
import {
  OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
} from "./official-standard-move-executor-v2.mjs";
import {
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION,
  OFFICIAL_STANDARD_MOVE_V3_TRANSITION_SCHEMA,
} from "./official-standard-move-executor-v3.mjs";
import {
  OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
} from "./official-start-of-round-executor-v2.mjs";
import {
  OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
  OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
  OFFICIAL_START_OF_ROUND_V3_TRANSITION_SCHEMA,
} from "./official-start-of-round-executor-v3.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_movement_v3_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_standard_move_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "0ec04b98321c58eaac23bca4b2383090d666e450876cc4e8b2d9cd61408bddea";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "c437d7ef4f9776cbea688f9a082d7d64110d817b763c0092fcdcb25114ed9733";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "9df3c61f7b271067ad41b8dabdb228c98341e23fe999c17052eb974d06d61a33";
const EXPECTED_SLICE_HASH =
  "78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3";
const EXPECTED_CATALOGUE_HASH =
  "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25";
const EXPECTED_RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";
const EXPECTED_GRAPH_HASH =
  "37055400db59c426f8bd5fb20fc23a8e416b9ed7804255c3bf1bc7b6e77d731a";

const MIGRATIONS = Object.freeze([
  Object.freeze({
    slug: "start-of-round-v3",
    atomIds: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ATOM_IDS,
    previousExecutorId: OFFICIAL_START_OF_ROUND_V2_EXECUTOR_ID,
    executorId: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_START_OF_ROUND_V3_EXECUTOR_VERSION,
    actionTypes: Object.freeze([OFFICIAL_START_OF_ROUND_V3_ACTION_TYPE]),
    transitionSchema: OFFICIAL_START_OF_ROUND_V3_TRANSITION_SCHEMA,
    rejectionCodes: Object.freeze([
      "START_OF_ROUND_V3_ACTION_INVALID",
      "START_OF_ROUND_V3_ACTION_MISMATCH",
      "START_OF_ROUND_V3_RUNTIME_BINDING_REQUIRED",
    ]),
  }),
  Object.freeze({
    slug: "reserve-deploy-v3",
    atomIds: OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ATOM_IDS,
    previousExecutorId: OFFICIAL_RESERVE_DEPLOY_V2_EXECUTOR_ID,
    executorId: OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_RESERVE_DEPLOY_V3_EXECUTOR_VERSION,
    actionTypes: Object.freeze(["deploy"]),
    transitionSchema: OFFICIAL_RESERVE_DEPLOY_V3_TRANSITION_SCHEMA,
    rejectionCodes: Object.freeze([
      "RESERVE_DEPLOY_V3_ACTION_INVALID",
      "RESERVE_DEPLOY_V3_ACTION_MISMATCH",
      "RESERVE_DEPLOY_V3_PARAMETER_DOMAIN_INVALID",
      "RESERVE_DEPLOY_V3_PARAMETER_DOMAIN_STALE",
      "RESERVE_DEPLOY_V3_SUPPLY_LINEAGE_INVALID",
    ]),
  }),
  Object.freeze({
    slug: "standard-move-v3",
    atomIds: OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ATOM_IDS,
    previousExecutorId: OFFICIAL_STANDARD_MOVE_V2_EXECUTOR_ID,
    executorId: OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_STANDARD_MOVE_V3_EXECUTOR_VERSION,
    actionTypes: Object.freeze(["move"]),
    transitionSchema: OFFICIAL_STANDARD_MOVE_V3_TRANSITION_SCHEMA,
    rejectionCodes: Object.freeze([
      "STANDARD_MOVE_V3_ACTION_INVALID",
      "STANDARD_MOVE_V3_ACTION_MISMATCH",
      "STANDARD_MOVE_V3_PARAMETER_DOMAIN_INVALID",
      "STANDARD_MOVE_V3_PARAMETER_DOMAIN_STALE",
      "STANDARD_MOVE_V3_SUPPLY_LINEAGE_INVALID",
    ]),
  }),
  Object.freeze({
    slug: "disengage-v3",
    atomIds: OFFICIAL_DISENGAGE_V3_EXECUTOR_ATOM_IDS,
    previousExecutorId: OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
    executorId: OFFICIAL_DISENGAGE_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_DISENGAGE_V3_EXECUTOR_VERSION,
    actionTypes: Object.freeze(["disengage"]),
    transitionSchema: OFFICIAL_DISENGAGE_V3_TRANSITION_SCHEMA,
    rejectionCodes: Object.freeze([
      "DISENGAGE_V3_ACTION_INVALID",
      "DISENGAGE_V3_ACTION_MISMATCH",
      "DISENGAGE_V3_PARAMETER_DOMAIN_INVALID",
      "DISENGAGE_V3_PARAMETER_DOMAIN_STALE",
      "DISENGAGE_V3_RUNTIME_BINDING_REQUIRED",
      "DISENGAGE_V3_SUPPLY_LINEAGE_INVALID",
    ]),
  }),
]);

export const OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS = Object.freeze(
  MIGRATIONS.flatMap((entry) => [...entry.atomIds]),
);

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
    fail("MOVEMENT_V3_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("MOVEMENT_V3_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("MOVEMENT_V3_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function migrationByAtomId() {
  const result = new Map();
  for (const migration of MIGRATIONS) {
    for (const atomId of migration.atomIds) {
      if (result.has(atomId)) fail("MOVEMENT_V3_CONTRACT_TARGET_OVERLAP", atomId);
      result.set(atomId, migration);
    }
  }
  if (result.size !== 63) fail("MOVEMENT_V3_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  return result;
}

function appendEvidence(evidence, atomId, migration) {
  const slug = atomId.replace(/^rule-atom:/u, `${migration.slug}:`);
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:current-lineage-success`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-or-stale-lineage-rejected`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:start-phase-supply-mutation-chain`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:current-round-ledger-lifecycle`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v2-to-current-v3-runtime-and-data`],
  };
}

function reboundAtom(atom, migration) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: migration.executorId,
      transitionSchema: migration.transitionSchema,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      ...migration.rejectionCodes,
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId, migration),
  };
}

function createMovementV3Catalogue(previousCatalogue) {
  const targetByAtomId = migrationByAtomId();
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    const migration = targetByAtomId.get(atom.atomId);
    if (!migration) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== migration.previousExecutorId) {
      fail("MOVEMENT_V3_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom, migration);
  });
  if (!isDeepStrictEqual(observedIds.sort(), [...targetByAtomId.keys()].sort())) {
    fail("MOVEMENT_V3_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const retiredExecutorIds = new Set(MIGRATIONS.map((entry) => entry.previousExecutorId));
  for (const executorId of retiredExecutorIds) {
    if (previousCatalogue.executorManifest.filter((entry) => (
      entry.executorId === executorId
    )).length !== 1) {
      fail("MOVEMENT_V3_CONTRACT_PREVIOUS_MANIFEST_INVALID", executorId);
    }
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => !retiredExecutorIds.has(entry.executorId))
    .map(clone);
  executorManifest.push(...MIGRATIONS.map((migration) => ({
    executorId: migration.executorId,
    executorVersion: migration.executorVersion,
    actionTypes: [...migration.actionTypes],
    transitionSchema: migration.transitionSchema,
  })));
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.59.0-official-current-movement-authority-lineage-v3",
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
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("MOVEMENT_V3_CONTRACT_RELEASE_HASH_INVALID", JSON.stringify({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }));
  }
  const extension = createOfficialMovementV3RelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if ((freezeGraph && graph.graphHash !== EXPECTED_GRAPH_HASH)
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 28
    || relationshipAudit.counts.stateContractMissingExecutors !== 14
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 235,
      partialContractAtoms: 58,
      noContractAtoms: 128,
      executors: 42,
      declaredStateContractExecutors: 28,
      missingStateContractExecutors: 14,
    })) {
    fail("MOVEMENT_V3_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      graphHash: graph.graphHash,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  return { catalogueAudit, runtime: runtime.descriptor, graph,
    relationshipAudit, stateContractCoverage };
}

export function createOfficialExistingMovementV3ContractClosureRuleSliceV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createMovementV3Catalogue(previous.catalogue);
  const evidence = buildEvidence(catalogue, { freezeGraph: true });
  const carried = without(clone(previous), [
    "schema", "sliceHash", "previousSliceHash", "previousCatalogueHash",
    "catalogue", "catalogueHash", "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds", "contractEvidenceReboundRuleAtomIds",
    "executorIds", "executableScope", "existingExecutorContractClosureProgress",
    "ruleRelationshipGraphBinding", "ruleRelationshipProgress", "sliceForecast",
    "historicalCompatibility", "ctx2skill", "harness", "blocks",
  ]);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [...OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: MIGRATIONS.map((entry) => entry.executorId),
    executableScope:
      "current_start_v3_phase_v1_supply_loss_lineage_reserve_move_disengage_v3",
    existingExecutorContractClosureProgress: {
      contractIds: MIGRATIONS.map((entry) => (
        `${entry.executorId}@${entry.executorVersion}`
      )),
      frozenV2ExecutorSourcesChanged: false,
      currentStartCreatesRuntimeBoundEmptySupplyLossLedger: true,
      currentSupplyMutationsUseOnlyV3ExecutorIdentities: true,
      reserveStandardAndDisengageConsumeSharedLineage: true,
      disengageCasualtiesBindActionAndPreLedgerCausalEvents: true,
      forgedStartPhaseSupplyLedgerAndActionFailClosed: true,
      historicalV2RuntimeAndRulesDisplayRetained: true,
      silentCompatibilityAllowed: false,
      strictCompleteAtomCountBefore: 226,
      strictCompleteAtomCountAfter: 235,
      partialContractAtomCountBefore: 57,
      partialContractAtomCountAfter: 58,
      noContractAtomCountBefore: 138,
      noContractAtomCountAfter: 128,
      declaredStateContractExecutorCountBefore: 27,
      declaredStateContractExecutorCountAfter: 28,
      stateContractMissingExecutorCountBefore: 15,
      stateContractMissingExecutorCountAfter: 14,
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
      movementV3CoordinatedContractsComplete: true,
      historicalV2NodesEdgesAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 235,
      partialContractAtomCount: 58,
      noContractAtomCount: 128,
      nonStrictAtomCount: 186,
      declaredStateContractExecutorCount: 28,
      stateContractMissingExecutorCount: 14,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 64,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 63,
      completedAfterThisSlice: 64,
      migratedExistingAtomCount: 63,
      newlyStrictDisengageAtomCount: 10,
      compatibilityOnlyMigratedAtomCount: 53,
      existingNonStrictAtomsBeforeThisSlice: 195,
      existingNonStrictAtomsAfterThisSlice: 186,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 15,
      stateContractMissingExecutorsAfterThisSlice: 14,
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
      frozenExecutorIds: MIGRATIONS.map((entry) => entry.previousExecutorId),
      replacementExecutorIds: MIGRATIONS.map((entry) => entry.executorId),
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v22",
      previousActionSchemaVersion: "hybrid_legal_space_v21",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 10,
      crossTimeReplayResult:
        "current_v3_supply_loss_lineage_plus_frozen_v2_runtime_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_fourteen_executor_contracts_open",
        "remaining_491_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 491,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt"],
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action",
        "apply_action_after_user_confirmation", "replay_room"],
      uiTraceEvidence: "movement_v3_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_start_phase_supply_loss_reserve_move_disengage_exact_actions",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "start phase supply ledger source geometry or exact-action drift quarantines v3",
        "replay signature relationship or historical-display failure demotes runtime",
      ],
      userVisibleChecks: [
        "legal space exposes only actions bound to the current movement lineage",
        "disengage casualties show their SupplyLossLedger causal receipt",
        "forged or mixed-v2-v3 lineage is rejected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "fourteen_existing_executor_contracts_remain",
      "one_hundred_eighty_six_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "remaining_attack_trigger_priority_and_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("MOVEMENT_V3_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingMovementV3ContractClosureRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("MOVEMENT_V3_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingMovementV3ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("MOVEMENT_V3_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => (
    [atom.atomId, atom]
  )));
  const targetIds = new Set(OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId) && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue, { freezeGraph: true });
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS].sort(),
    )) {
    fail("MOVEMENT_V3_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_movement_v3_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    graphNodes: evidence.graph.nodes.length,
    graphEdges: evidence.graph.edges.length,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_MOVEMENT_V3_MIGRATED_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      compatibilityOnlyMigratedAtoms: 53,
      newlyStrictDisengageAtoms: 10,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "current_movement_v3_shared_supply_loss_authority_lineage",
    productionTruth: false,
    trainingTruth: false,
  });
}
