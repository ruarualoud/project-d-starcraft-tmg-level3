import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V1_EXECUTOR_ARTIFACT_HASH,
  OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE,
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
  OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS,
  OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_V2_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE,
} from "./official-marine-charge-executor-v2.mjs";
import { createOfficialMarineChargeV2RelationshipExtensionV1 } from
  "./official-marine-charge-v2-relationship-contract-v1.mjs";
import { createOfficialStimpackCurrentV2RelationshipExtensionV1 } from
  "./official-stimpack-current-v2-relationship-contract-v1.mjs";
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

const SLICE_SCHEMA = "starcraft_tmg_official_marine_charge_v2_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_stimpack_current_v2_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "0e2be19c977a0bb9c71a66c79bb1876d9d004c15a2fdceb2ebea5136a0b54671";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "ae8062993105f2fa421e6495343145151104fafb1c35618d7819e03fc2d1b1a3";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "5365803f73cc500f3c39089fdeae592e620cdd980e3c59b38134cb28ea87a33d";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "90f30593ecce682155649e7eabe467449afa81324c0dd481c13629edeb8503ff";
const EXPECTED_SLICE_HASH =
  "e85b759217d748fd1701441317037a664cdd0bdb348726b9ec9c8904d042af9e";
const EXPECTED_CATALOGUE_HASH =
  "f64ec51e5c15a34d290bd764cc4f0c9b0f4579b7a03fae505380126781f94aed";
const EXPECTED_RUNTIME_HASH =
  "0d794f82236ed4486a7c8405a3eb46775a84299ce36d2d8dc2a7a4b164562161";
const EXPECTED_GRAPH_HASH =
  "730a0f55f17c16a46a4dc2f8ac955a42a80c8889485bc802bbd488055f5e568e";

const RESOLUTION_MARKERS = Object.freeze([
  "success",
  "failure",
  "distance-step",
  "contact-position",
  "path-measurement",
  "placement",
  "coherency",
  "execute-charge-leader",
  "endpoint-overlap",
  "no-undeclared-end-engagement",
  "all-target-engagement",
  "following-model",
  "leading-model-movement",
  "undeclared-enemy-success",
]);
const REJECTION_CODES = Object.freeze([
  "CHARGE_V2_ACTION_INVALID",
  "CHARGE_V2_ACTION_STALE",
  "CHARGE_V2_FAILURE_NOT_PROVEN",
  "CHARGE_V2_FAILURE_PROOF_INVALID",
  "CHARGE_V2_PENDING_INVALID",
  "CHARGE_V2_SOURCE_LOCK_BINDING_INVALID",
  "CHARGE_ALL_DECLARED_TARGETS_NOT_ENGAGED",
  "CHARGE_BASE_OVERLAP",
  "CHARGE_PATH_COLLISION",
  "CHARGE_PATH_EXCEEDS_ROLL_DISTANCE",
  "CHARGE_PLACEMENT_PRIORITY_UNSUPPORTED",
  "CHARGE_UNDECLARED_ENEMY_ENGAGEMENT",
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
function sliceBody(slice) { return without(slice, ["sliceHash"]); }

function verifyPrevious(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("MARINE_CHARGE_V2_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialStimpackCurrentV2RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("MARINE_CHARGE_V2_PREVIOUS_RELEASE_DRIFT");
  }
}

function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((clauseId) => (
    clauseById.get(clauseId)?.sourceSnapshotId
  )))];
  if (ids.some((entry) => !entry)) {
    fail("MARINE_CHARGE_V2_SOURCE_CLAUSE_MISSING", atom.atomId);
  }
  return ids;
}

function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "charge-v2:");
  return {
    positiveFixtureIds: [`${slug}:single-multi-and-arbitrary-target-success`],
    negativeFixtureIds: [`${slug}:distance-collision-overlap-flying-and-stale-rejects`],
    interactionFixtureIds: [`${slug}:speed-roll-path-placement-coherency-and-alternation`],
    lifecycleFixtureIds: [`${slug}:success-and-proven-failure-end-assault-activation`],
    replayFixtureIds: [`${slug}:ed25519-two-stage-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:pinned-71-69-48-source-lock-and-frozen-v1`],
  };
}

function executableAtom(atom, clauseById, rulesVersion) {
  const resolution = RESOLUTION_MARKERS.some((marker) => atom.atomId.includes(marker));
  return {
    atomId: atom.atomId,
    atomVersion: "1.0.0",
    canonicalClauseId: atom.canonicalClauseId,
    clauseIds: [...atom.clauseIds],
    disposition: "executable",
    title: atom.title,
    owner: { authority: "rules", actor: "active_seat" },
    timing: { phase: "assault", window: resolution ? "charge_resolution" : "charge_declaration", priority: 175 },
    preconditions: [
      {
        predicateId: "assault.charge_current_source_lock_and_state_are_exact",
        inputSchema: "starcraft_tmg_official_development_tranche_source_lock_audit_v1",
        failureCode: "CHARGE_V2_SOURCE_LOCK_BINDING_INVALID",
      },
      {
        predicateId: "assault.charge_all_targets_declared_before_hidden_d6",
        inputSchema: OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
        failureCode: "CHARGE_V2_ACTION_STALE",
      },
      {
        predicateId: "assault.charge_resolution_success_geometry_or_failure_proof_is_exact",
        inputSchema: OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND,
        failureCode: "CHARGE_V2_FAILURE_NOT_PROVEN",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: resolution
        ? OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE
        : OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE,
      parameterSchema: resolution
        ? OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND
        : OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MARINE_CHARGE_V2_TRANSITION_SCHEMA,
    },
    chance: resolution
      ? { kind: "none" }
      : { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
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
  const cached = EVIDENCE_CACHE.get(catalogue.catalogueHash);
  if (cached) return cached;
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialMarineChargeV2RelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const graphAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogueAudit.counts.byDisposition.executable !== 445
    || catalogueAudit.counts.byDisposition.review_required !== 467
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || graphAudit.valid !== true
    || graphAudit.declaredScopesValid !== true
    || graphAudit.counts.blockingGaps !== 0
    || graphAudit.counts.executors !== 43
    || graphAudit.counts.declaredStateContractExecutors !== 43
    || graphAudit.counts.stateContractMissingExecutors !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 445,
      strictCompleteAtoms: 445,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      executors: 43,
      declaredStateContractExecutors: 43,
      missingStateContractExecutors: 0,
    })) {
    fail("MARINE_CHARGE_V2_EVIDENCE_INVALID", JSON.stringify({
      catalogue: catalogueAudit.counts,
      graph: graphAudit.counts,
      gaps: graphAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  const evidence = {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    graphAudit,
    stateContractCoverage,
  };
  EVIDENCE_CACHE.set(catalogue.catalogueHash, evidence);
  return evidence;
}

export function createOfficialMarineChargeV2RuleSliceV1(input = {}) {
  verifyPrevious(input.previousSlice);
  const previous = input.previousSlice;
  const base = previous.catalogue;
  const clauseById = new Map(base.sourceClauses.map((entry) => [entry.clauseId, entry]));
  const targets = new Set(OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS);
  const observed = [];
  const atoms = base.atoms.map((atom) => {
    if (!targets.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "review_required") {
      fail("MARINE_CHARGE_V2_TARGET_DISPOSITION_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targets].sort())) {
    fail("MARINE_CHARGE_V2_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_MARINE_CHARGE_V2_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_CHARGE_V2_ACTION_TYPE,
    ].sort(),
    transitionSchema: OFFICIAL_MARINE_CHARGE_V2_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.75.0-official-marine-charge-v2",
    rulesVersion: base.rulesVersion,
    sourceDenominatorStatus: base.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(base.sourceDenominatorBinding),
    sourceSnapshots: clone(base.sourceSnapshots),
    sourceClauses: clone(base.sourceClauses),
    atoms,
    executorManifest,
  });
  const evidence = buildEvidence(catalogue);
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
    newlyExecutableRuleAtomIds: [...OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [],
    contractEvidenceReboundRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID],
    executableScope:
      "marine_ground_round_base_no_terrain_charge_declaration_hidden_d6_success_and_proven_failure",
    marineChargeV2Progress: {
      core877AtomCount: 17,
      quickReference124AtomCount: 7,
      promotedAtomCount: 24,
      arbitraryDeclaredTargetUnitCount: true,
      currentModelCountSplitSpeedBound: true,
      declarationBeforeChanceExecutable: true,
      successfulMoveAndPlacementExecutable: true,
      provenFailedChargeSettlementExecutable: true,
      noLineOfSightRequired: true,
      sourceLockPinned: true,
      legacyV1GeometryReusedThroughExplicitAdapter: true,
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
      contractGroup: "marine_charge_v2",
      contractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 445,
      partialContractAtomCount: 0,
      noContractAtomCount: 0,
      nonStrictAtomCount: 0,
      declaredStateContractExecutorCount: 43,
      stateContractMissingExecutorCount: 0,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 75,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 74,
      completedAfterThisSlice: 75,
      promotedAtomCount: 24,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 467,
      remainingPlannedSlicesBeforeThisSlice: 37,
      remainingPlannedSlicesAfterThisSlice: 36,
      atomPromotionSlice: true,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: ["authority.marine-charge-v1"],
      replacementExecutorIds: [OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID],
      frozenV1ExecutorArtifactHash: OFFICIAL_MARINE_CHARGE_V1_EXECUTOR_ARTIFACT_HASH,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v25",
      previousActionSchemaVersion: "hybrid_legal_space_v25",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 18,
      crossTimeReplayResult: "charge_v2_current_plus_frozen_v1_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "remaining_467_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 467,
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
        "charge_v2_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_arbitrary_targets_hidden_roll_success_and_proven_failure",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_lock_geometry_state_or_exact_action_drift_quarantines_charge_v2",
        "replay_signature_relationship_or_frozen_v1_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "Charge declares any number of eligible enemy units before the D6",
        "single-model and multi-model speed values come from the pinned official profile",
        "success moves every model and failure ends the assault activation",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "four_hundred_sixty_seven_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (input.freezeRelease !== false && (
    slice.sliceHash !== EXPECTED_SLICE_HASH
      || catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
      || evidence.runtime.runtimeHash !== EXPECTED_RUNTIME_HASH
      || evidence.graph.graphHash !== EXPECTED_GRAPH_HASH
  )) {
    fail("MARINE_CHARGE_V2_RELEASE_HASH_DRIFT", JSON.stringify({
      sliceHash: slice.sliceHash,
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: evidence.runtime.runtimeHash,
      graphHash: evidence.graph.graphHash,
    }));
  }
  return freezeDeep(slice);
}

export function verifyOfficialMarineChargeV2RuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("MARINE_CHARGE_V2_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialMarineChargeV2RuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) fail("MARINE_CHARGE_V2_SLICE_CONTENT_MISMATCH");
  const evidence = buildEvidence(slice.catalogue);
  return freezeDeep({
    schema: "starcraft_tmg_official_marine_charge_v2_rule_slice_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: 445,
      newlyExecutableRuleAtoms: 24,
      reviewRequiredRuleAtoms: 467,
      displayOnlyRuleAtoms: 114,
      strictCompleteAtoms: 445,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      declaredStateContractExecutors: 43,
      missingStateContractExecutors: 0,
    },
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    graph: evidence.graph,
    graphAudit: evidence.graphAudit,
    stateContractCoverage: evidence.stateContractCoverage,
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionEligible: false,
    trainingTruth: false,
  });
}
