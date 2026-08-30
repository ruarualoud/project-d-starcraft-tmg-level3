import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE,
  OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
  OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND,
  OFFICIAL_GOLIATH_CHARGE_TRANSITION_SCHEMA,
  OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE,
} from "./official-goliath-charge-executor-v1.mjs";
import {
  OFFICIAL_IMPACT_ACTION_TYPE,
  OFFICIAL_IMPACT_EXECUTOR_ID,
  OFFICIAL_IMPACT_EXECUTOR_VERSION,
  OFFICIAL_IMPACT_NEW_ATOM_IDS,
  OFFICIAL_IMPACT_PARAMETER_KIND,
  OFFICIAL_IMPACT_TRANSITION_SCHEMA,
} from "./official-impact-executor-v1.mjs";
import { createOfficialImpactAfterChargeRelationshipExtensionV1 } from
  "./official-impact-after-charge-relationship-contract-v1.mjs";
import { createOfficialMarineChargeV2RelationshipExtensionV1 } from
  "./official-marine-charge-v2-relationship-contract-v1.mjs";
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

const SLICE_SCHEMA = "starcraft_tmg_official_impact_after_charge_rule_slice_v1";
const PREVIOUS_SCHEMA = "starcraft_tmg_official_marine_charge_v2_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "e85b759217d748fd1701441317037a664cdd0bdb348726b9ec9c8904d042af9e";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "f64ec51e5c15a34d290bd764cc4f0c9b0f4579b7a03fae505380126781f94aed";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "0d794f82236ed4486a7c8405a3eb46775a84299ce36d2d8dc2a7a4b164562161";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "730a0f55f17c16a46a4dc2f8ac955a42a80c8889485bc802bbd488055f5e568e";
const EXPECTED_SLICE_HASH =
  "8bf3fbf687742378962d1942eed19cc80cf769c63e6cbe9c14645fc5d52ba812";
const EXPECTED_CATALOGUE_HASH =
  "a936ba79c9e3160b31bef967ccf9c9a07e4e222454431b94d63232118fbcb9df";
const EXPECTED_RUNTIME_HASH =
  "729f1c8310863f88a5af4a8a1389acbeab1242e2a3bfaddc91350bd355809f27";
const EXPECTED_GRAPH_HASH =
  "d360825a4cf01c7ffbcbe3aae83af0a4ec928275db28c1e5a71af7b61e3d543f";

const REJECTION_CODES = Object.freeze([
  "GOLIATH_CHARGE_ACTION_INVALID",
  "GOLIATH_CHARGE_ACTION_STALE",
  "GOLIATH_CHARGE_UNIT_DENOMINATOR_UNSUPPORTED",
  "IMPACT_ACTION_INVALID",
  "IMPACT_ACTION_STALE",
  "IMPACT_ALLOCATION_DENOMINATOR_INVALID",
  "IMPACT_PENDING_INVALID",
  "IMPACT_SOURCE_LOCK_BINDING_INVALID",
  "IMPACT_UNIT_DENOMINATOR_UNSUPPORTED",
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
    fail("IMPACT_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previous.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previous.catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue: previous.catalogue,
    extension: createOfficialMarineChargeV2RelationshipExtensionV1({
      catalogueHash: previous.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (audit.counts.byDisposition.executable !== 445
    || audit.counts.byDisposition.review_required !== 467
    || audit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("IMPACT_PREVIOUS_RELEASE_DRIFT");
  }
}
function sourceSnapshotIds(atom, clauseById) {
  const ids = [...new Set(atom.clauseIds.map((id) => clauseById.get(id)?.sourceSnapshotId))];
  if (ids.some((id) => !id)) fail("IMPACT_SOURCE_CLAUSE_MISSING", atom.atomId);
  return ids;
}
function evidence(atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "impact-v1:");
  return {
    positiveFixtureIds: [`${slug}:single-and-multiple-target-allocation`],
    negativeFixtureIds: [`${slug}:invalid-allocation-stale-profile-and-unsupported-state`],
    interactionFixtureIds: [`${slug}:successful-charge-trigger-hit-armour-damage`],
    lifecycleFixtureIds: [`${slug}:charge-pending-to-impact-pending-to-alternation`],
    replayFixtureIds: [`${slug}:ed25519-three-stage-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [`${slug}:pinned-71-69-48-goliath-core-and-p2p`],
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
    timing: { phase: "assault", window: "immediately_after_successful_charge", priority: 176 },
    preconditions: [
      {
        predicateId: "assault.impact_is_triggered_by_successful_charge",
        inputSchema: "starcraft_tmg_official_impact_pending_v1",
        failureCode: "IMPACT_PENDING_INVALID",
      },
      {
        predicateId: "assault.impact_current_goliath_source_lock_is_exact",
        inputSchema: "starcraft_tmg_official_impact_profile_v1",
        failureCode: "IMPACT_SOURCE_LOCK_BINDING_INVALID",
      },
    ],
    legalSpace: {
      kind: "parameter_domain",
      actionType: OFFICIAL_IMPACT_ACTION_TYPE,
      parameterSchema: OFFICIAL_IMPACT_PARAMETER_KIND,
    },
    effect: {
      executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
      transitionSchema: OFFICIAL_IMPACT_TRANSITION_SCHEMA,
    },
    chance: { kind: "chance_ticket", ticketSchema: "starcraft_tmg_chance_bundle_v1" },
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
    extension: createOfficialImpactAfterChargeRelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const graphAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogueAudit.counts.byDisposition.executable !== 451
    || catalogueAudit.counts.byDisposition.review_required !== 461
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || graphAudit.valid !== true
    || graphAudit.declaredScopesValid !== true
    || graphAudit.counts.blockingGaps !== 0
    || graphAudit.counts.executors !== 45
    || graphAudit.counts.declaredStateContractExecutors !== 45
    || graphAudit.counts.stateContractMissingExecutors !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 451,
      strictCompleteAtoms: 451,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      executors: 45,
      declaredStateContractExecutors: 45,
      missingStateContractExecutors: 0,
    })) {
    fail("IMPACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialImpactAfterChargeRuleSliceV1(input = {}) {
  verifyPrevious(input.previousSlice);
  const previous = input.previousSlice;
  const base = previous.catalogue;
  const clauseById = new Map(base.sourceClauses.map((entry) => [entry.clauseId, entry]));
  const targets = new Set(OFFICIAL_IMPACT_NEW_ATOM_IDS);
  const observed = [];
  const atoms = base.atoms.map((atom) => {
    if (!targets.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "review_required") {
      fail("IMPACT_TARGET_DISPOSITION_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return executableAtom(atom, clauseById, base.rulesVersion);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targets].sort())) {
    fail("IMPACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = clone(base.executorManifest);
  executorManifest.push({
    executorId: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_GOLIATH_CHARGE_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_GOLIATH_CHARGE_ACTION_TYPE,
      OFFICIAL_RESOLVE_GOLIATH_CHARGE_ACTION_TYPE,
    ].sort(),
    transitionSchema: OFFICIAL_GOLIATH_CHARGE_TRANSITION_SCHEMA,
  });
  executorManifest.push({
    executorId: OFFICIAL_IMPACT_EXECUTOR_ID,
    executorVersion: OFFICIAL_IMPACT_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_IMPACT_ACTION_TYPE],
    transitionSchema: OFFICIAL_IMPACT_TRANSITION_SCHEMA,
  });
  const catalogue = createRuleAtomCatalogue({
    gameId: base.gameId,
    catalogueVersion: "0.76.0-official-impact-after-charge",
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
    newlyExecutableRuleAtomIds: [...OFFICIAL_IMPACT_NEW_ATOM_IDS],
    versionReassignedRuleAtomIds: [],
    contractEvidenceReboundRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID, OFFICIAL_IMPACT_EXECUTOR_ID],
    executableScope:
      "official_single_model_unhurt_goliath_successful_charge_to_impact_single_or_multiple_targets",
    impactProgress: {
      promotedAtomCount: 6,
      officialCarrier: "Goliath",
      successfulChargeReachable: true,
      arbitraryDeclaredChargeTargetUnitCount: true,
      singleTargetForcedAllDice: true,
      multipleTargetAllocationExecutable: true,
      perTargetHitThenArmourExecutable: true,
      noSurgeExecutable: true,
      damageOneExecutable: true,
      hiddenImpactImmunityDeferredAtomId:
        "rule-atom:singleton:core-11-hidden-impact-immunity:6ee45ab3f111",
      sourceRefreshPerformed: false,
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
      contractGroup: "goliath_charge_to_impact_v1",
      contractComplete: true,
      strictCompleteAtomCount: 451,
      partialContractAtomCount: 0,
      noContractAtomCount: 0,
      declaredStateContractExecutorCount: 45,
      stateContractMissingExecutorCount: 0,
      graphCaughtUnreachableImpactBeforeImplementation: true,
      globalRelationshipCoverageComplete: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 76,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 75,
      completedAfterThisSlice: 76,
      promotedAtomCount: 6,
      remainingActionableAtomsBeforeThisSlice: 467,
      remainingActionableAtomsAfterThisSlice: 461,
      remainingPlannedSlicesBeforeThisSlice: 36,
      remainingPlannedSlicesAfterThisSlice: 35,
      atomPromotionSlice: true,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: proof.runtime.runtimeHash,
      frozenExecutorIds: ["authority.marine-charge-v1", "authority.marine-charge-v2"],
      addedExecutorIds: [OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID, OFFICIAL_IMPACT_EXECUTOR_ID],
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
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 14,
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_slice",
        "remaining_461_actionable_rule_atoms_not_executable",
      ],
      remainingRuleGaps: 461,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      harnessToolsCalled: [
        "read_board_state", "list_legal_actions", "preview_action",
        "apply_action_after_user_confirmation", "replay_room",
      ],
      uiTraceEvidence: "authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence: "rules_owned_charge_to_mandatory_impact_allocation",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_profile_pending_geometry_allocation_or_replay_drift_quarantines_slice_76",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "four_hundred_sixty_one_actionable_atoms_remain_non_executable",
      "hidden_impact_immunity_and_broader_carriers_states_casualties_ui_agent_skill_selfplay_muzero_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (input.freezeRelease !== false && (
    slice.sliceHash !== EXPECTED_SLICE_HASH
      || catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
      || proof.runtime.runtimeHash !== EXPECTED_RUNTIME_HASH
      || proof.graph.graphHash !== EXPECTED_GRAPH_HASH
  )) {
    fail("IMPACT_RELEASE_HASH_DRIFT", JSON.stringify({
      sliceHash: slice.sliceHash,
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: proof.runtime.runtimeHash,
      graphHash: proof.graph.graphHash,
    }));
  }
  return freezeDeep(slice);
}

export function verifyOfficialImpactAfterChargeRuleSliceV1(input = {}) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== hashStarcraftTmgContract(sliceBody(slice))) {
    fail("IMPACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialImpactAfterChargeRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) fail("IMPACT_SLICE_CONTENT_MISMATCH");
  const proof = buildEvidence(slice.catalogue);
  return freezeDeep({
    schema: "starcraft_tmg_official_impact_after_charge_rule_slice_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: 451,
      newlyExecutableRuleAtoms: 6,
      reviewRequiredRuleAtoms: 461,
      displayOnlyRuleAtoms: 114,
      strictCompleteAtoms: 451,
      partialContractAtoms: 0,
      noContractAtoms: 0,
      declaredStateContractExecutors: 45,
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
