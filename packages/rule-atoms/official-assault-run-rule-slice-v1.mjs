import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_ASSAULT_RUN_ACTION_TYPE,
  OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
  OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
  OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS,
  OFFICIAL_ASSAULT_RUN_PARAMETER_KIND,
  OFFICIAL_ASSAULT_RUN_TRANSITION_SCHEMA,
} from "./official-assault-run-executor-v1.mjs";
import { createOfficialAssaultRunRelationshipExtensionV1 } from
  "./official-assault-run-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { OFFICIAL_STANDARD_MOVE_EXECUTOR_ID } from
  "./official-standard-move-executor-v1.mjs";
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

const SLICE_SCHEMA = "starcraft_tmg_official_assault_run_rule_slice_v1";
const PREVIOUS_SCHEMA = "starcraft_tmg_official_impact_after_charge_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "8bf3fbf687742378962d1942eed19cc80cf769c63e6cbe9c14645fc5d52ba812";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "a936ba79c9e3160b31bef967ccf9c9a07e4e222454431b94d63232118fbcb9df";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "729f1c8310863f88a5af4a8a1389acbeab1242e2a3bfaddc91350bd355809f27";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "d360825a4cf01c7ffbcbe3aae83af0a4ec928275db28c1e5a71af7b61e3d543f";
const EXPECTED_SLICE_HASH =
  "01bde989318c5641849c737f88e4a8635b718068d3da7bb8c2a0c7041bcb7293";
const EXPECTED_CATALOGUE_HASH =
  "45ab1dfde093421722ba3103b88cca3d869cea5cf0f81bcd5b38a428b5932716";
const EXPECTED_RUNTIME_HASH =
  "f5ee9e1257369765fc33979491904eecb5f8dd41e67fedd413c8ff8c8973bad0";
const EXPECTED_GRAPH_HASH =
  "9611e56d98e60c118b8df0398857525af2c2caf96e1fb6cab94c6b7cde76fce2";

const REJECTION_CODES = Object.freeze([
  "ASSAULT_RUN_ACTION_INVALID",
  "ASSAULT_RUN_ACTION_STALE",
  "ASSAULT_RUN_INITIATIVE_UNRESOLVED",
  "ASSAULT_RUN_NOT_ACTIVE_SIDE",
  "ASSAULT_RUN_PARAMETER_DOMAIN_INVALID",
  "ASSAULT_RUN_PARAMETER_DOMAIN_STALE",
  "ASSAULT_RUN_SIDE_PASSED",
  "ASSAULT_RUN_SOURCE_LOCK_BINDING_INVALID",
  "ASSAULT_RUN_WRONG_PHASE",
  "MOVE_BASE_OVERLAP",
  "MOVE_COHERENCY_LINK_BLOCKED",
  "MOVE_ENEMY_ENGAGEMENT_RANGE",
  "MOVE_PATH_COLLISION",
  "MOVE_PATH_EXCEEDS_SPEED",
  "MOVE_PATH_OUTSIDE_BATTLEFIELD",
  "MOVE_UNIT_ENGAGED",
]);
const EVIDENCE_CACHE = new Map();

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function sliceBody(value) { return without(value, ["sliceHash"]); }

function verifyPrevious(previous) {
  if (!object(previous)
    || previous.schema !== PREVIOUS_SCHEMA
    || previous.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previous.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previous.sliceHash !== hashStarcraftTmgContract(sliceBody(previous))) {
    fail("ASSAULT_RUN_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previous.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previous.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: previous.catalogue,
    extension: (awaitPreviousExtension())({
      catalogueHash: previous.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (audit.counts.byDisposition.executable !== 451
    || audit.counts.byDisposition.review_required !== 461
    || audit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("ASSAULT_RUN_PREVIOUS_RELEASE_DRIFT");
  }
}

// Kept local to make the previous graph authority explicit without widening exports.
import { createOfficialImpactAfterChargeRelationshipExtensionV1 } from
  "./official-impact-after-charge-relationship-contract-v1.mjs";
function awaitPreviousExtension() {
  return createOfficialImpactAfterChargeRelationshipExtensionV1;
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((id) => clauseById.get(id)?.sourceSnapshotId))];
  if (ids.some((id) => !id)) fail("ASSAULT_RUN_SOURCE_CLAUSE_MISSING", atom.atomId);
  return ids;
}
function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "assault-run-v1:");
  return {
    positiveFixtureIds: [`${slug}:movement-marker-run-path-and-coherency`],
    negativeFixtureIds: [`${slug}:engaged-unmoved-stale-and-over-speed-rejected`],
    interactionFixtureIds: [`${slug}:run-hold-charge-ranged-choice-visible`],
    lifecycleFixtureIds: [`${slug}:movement-side-to-assault-side-marker-and-alternation`],
    replayFixtureIds: [`${slug}:ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:pinned-core-run-and-quick-reference`],
  };
}
function executableAtom(atom, clauseById, rulesVersion) {
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_seat" },
    timing: { phase: "assault", window: "unit_activation_action_choice", priority: 177 },
    preconditions: [{
      predicateId: "assault.run_current_unengaged_unit_has_movement_side_marker",
      inputSchema: "starcraft_tmg_state_v0",
      failureCode: "ASSAULT_RUN_PARAMETER_DOMAIN_STALE",
    }, {
      predicateId: "assault.run_uses_pinned_official_source_lock",
      inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
      failureCode: "ASSAULT_RUN_SOURCE_LOCK_BINDING_INVALID",
    }],
    legalSpace: {
      kind: "parameter_domain",
      actionType: OFFICIAL_ASSAULT_RUN_ACTION_TYPE,
      parameterSchema: OFFICIAL_ASSAULT_RUN_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
      transitionSchema: OFFICIAL_ASSAULT_RUN_TRANSITION_SCHEMA,
    },
    chance: { kind: "none" },
    rejectionCodes: [...REJECTION_CODES],
    dependencies: {
      rulesVersion,
      sourceSnapshotIds: sourceSnapshotIds(atom, clauseById),
      atomIds: [],
    },
    evidence: evidence(atom.atomId),
  };
}

function buildEvidence(catalogue) {
  if (EVIDENCE_CACHE.has(catalogue.catalogueHash)) return EVIDENCE_CACHE.get(catalogue.catalogueHash);
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialAssaultRunRelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const graphAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogueAudit.counts.byDisposition.executable !== 457
    || catalogueAudit.counts.byDisposition.review_required !== 455
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || graphAudit.valid !== true
    || graphAudit.declaredScopesValid !== true
    || graphAudit.counts.blockingGaps !== 0
    || graphAudit.counts.executors !== 46
    || graphAudit.counts.declaredStateContractExecutors !== 46
    || graphAudit.counts.stateContractMissingExecutors !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 457,
      strictCompleteAtoms: 457,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      executors: 46,
      declaredStateContractExecutors: 46,
      missingStateContractExecutors: 0,
    })) {
    fail("ASSAULT_RUN_EVIDENCE_INVALID", JSON.stringify({
      catalogue: catalogueAudit.counts,
      graph: graphAudit.counts,
      gaps: graphAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  const value = { catalogueAudit, runtime: runtime.descriptor, graph, graphAudit, stateContractCoverage };
  EVIDENCE_CACHE.set(catalogue.catalogueHash, value);
  return value;
}

export function createOfficialAssaultRunRuleSliceV1(input = {}) {
  verifyPrevious(input.previousSlice);
  const previous = input.previousSlice;
  const base = previous.catalogue;
  const clauseById = new Map(base.sourceClauses.map((entry) => [entry.clauseId, entry]));
  const targets = new Set(OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS);
  const observed = [];
  const atoms = base.atoms.map((atom) => {
    if (!targets.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "review_required") {
      fail("ASSAULT_RUN_TARGET_DISPOSITION_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targets].sort())) {
    fail("ASSAULT_RUN_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
    executorVersion: OFFICIAL_ASSAULT_RUN_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_ASSAULT_RUN_ACTION_TYPE],
    transitionSchema: OFFICIAL_ASSAULT_RUN_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.77.0-official-assault-run",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(base.sourceDenominatorBinding),
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const proof = buildEvidence(catalogue);
  const carried = without(clone(previous), [
    "schema", "sliceHash", "previousSliceHash", "previousCatalogueHash",
    "catalogue", "catalogueHash", "newlyExecutableRuleAtomIds",
    "versionReassignedRuleAtomIds", "contractEvidenceReboundRuleAtomIds",
    "executorIds", "executableScope", "ruleRelationshipGraphBinding",
    "ruleRelationshipProgress", "sliceForecast", "historicalCompatibility",
    "ctx2skill", "harness", "blocks",
  ]);
  const body = {
    schema: SLICE_SCHEMA,
    previousSliceHash: previous.sliceHash,
    previousCatalogueHash: previous.catalogueHash,
    ...carried,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    newlyExecutableRuleAtomIds: [...OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [],
    contractEvidenceReboundRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_ASSAULT_RUN_EXECUTOR_ID],
    executableScope:
      "official_current_marine_unengaged_assault_run_via_frozen_standard_move_no_terrain",
    assaultRunProgress: {
      promotedAtomCount: 6,
      fourActionAssaultChoiceExecutable: true,
      movementSideMarkerRequired: true,
      assaultSideMarkerWritten: true,
      standardMoveProcedureDelegated: true,
      standardMoveRestrictionsDelegated: true,
      arbitrarySupportedMarineModelCount: true,
      splitSpeedUsesLiveModelCount: true,
      sourceRefreshPerformed: false,
      repositoryFallbackUsed: false,
    },
    ruleRelationshipGraphBinding: {
      graphSchema: proof.graph.schema,
      graphHash: proof.graph.graphHash,
      relationshipAuthority: proof.graph.relationshipAuthority,
      rulesAuthority: false,
      catalogueHash: proof.graph.catalogueHash,
      nodeCount: proof.graph.nodes.length,
      edgeCount: proof.graph.edges.length,
      coverageScopeCount: proof.graph.coverageScopes.length,
      declaredStateContractExecutorCount: proof.graph.declaredStateContractExecutorIds.length,
    },
    ruleRelationshipProgress: {
      contractGroup: "assault_run_v1",
      contractComplete: true,
      strictCompleteAtomCount: 457,
      partialContractAtomCount: 0,
      noContractAtomCount: 0,
      declaredStateContractExecutorCount: 46,
      stateContractMissingExecutorCount: 0,
      globalRelationshipCoverageComplete: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 77,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 76,
      completedAfterThisSlice: 77,
      promotedAtomCount: 6,
      remainingActionableAtomsBeforeThisSlice: 461,
      remainingActionableAtomsAfterThisSlice: 455,
      remainingPlannedSlicesBeforeThisSlice: 35,
      remainingPlannedSlicesAfterThisSlice: 34,
      atomPromotionSlice: true,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: proof.runtime.runtimeHash,
      frozenExecutorIds: [OFFICIAL_STANDARD_MOVE_EXECUTOR_ID],
      frozenExecutorArtifactHashes: [
        "e7c349f74524883e8205502d3afbe586737c0c938ce644fd3113916f86dfe56f",
      ],
      addedExecutorIds: [OFFICIAL_ASSAULT_RUN_EXECUTOR_ID],
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v25",
      previousActionSchemaVersion: "hybrid_legal_space_v25",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 13,
      crossTimeReplayResult: "pass_without_skill_generation",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "remaining_455_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 455,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["rule_skill_builder_prompt"],
      harnessToolsCalled: [
        "read_board_state", "list_legal_actions", "preview_action",
        "apply_action_after_user_confirmation", "replay_room",
      ],
      uiTraceEvidence: "authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence: "rules_owned_run_path_and_assault_action_choice",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_marker_geometry_choice_or_replay_drift_quarantines_slice_77",
      ],
      userVisibleChecks: ["run_action_is_separate_from_move_and_charge"],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "four_hundred_fifty_five_actionable_atoms_remain_non_executable",
      "template_attack_pool_close_combat_geometry_ui_agent_skill_selfplay_muzero_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (input.freezeRelease !== false && (
    slice.sliceHash !== EXPECTED_SLICE_HASH
      || catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
      || proof.runtime.runtimeHash !== EXPECTED_RUNTIME_HASH
      || proof.graph.graphHash !== EXPECTED_GRAPH_HASH
  )) {
    fail("ASSAULT_RUN_RELEASE_HASH_DRIFT", JSON.stringify({
      sliceHash: slice.sliceHash,
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: proof.runtime.runtimeHash,
      graphHash: proof.graph.graphHash,
    }));
  }
  return freezeDeep(slice);
}

export function verifyOfficialAssaultRunRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== hashStarcraftTmgContract(sliceBody(slice))) {
    fail("ASSAULT_RUN_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialAssaultRunRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) fail("ASSAULT_RUN_SLICE_CONTENT_MISMATCH");
  const proof = buildEvidence(slice.catalogue);
  return freezeDeep({
    schema: "starcraft_tmg_official_assault_run_rule_slice_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: 457,
      newlyExecutableRuleAtoms: 6,
      reviewRequiredRuleAtoms: 455,
      displayOnlyRuleAtoms: 114,
      strictCompleteAtoms: 457,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      declaredStateContractExecutors: 46,
      missingStateContractExecutors: 0,
    },
    catalogueHash: slice.catalogueHash,
    runtimeHash: proof.runtime.runtimeHash,
    graphHash: proof.graph.graphHash,
    graph: proof.graph,
    graphAudit: proof.graphAudit,
    stateContractCoverage: proof.stateContractCoverage,
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionEligible: false,
    trainingTruth: false,
  });
}
