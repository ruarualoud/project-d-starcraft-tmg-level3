import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAssaultHoldRelationshipExtensionV1 } from
  "./official-assault-hold-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_assault_hold_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_movement_hold_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "cc1b7bc338f60c59af0c3644f5a2d2dfeea7494c706972871e3d6b15c21d8458";
const EXPECTED_SLICE_HASH =
  "8afa8a3085562d61adda4469ef1e160a363828e6a6f9d9bcb561e4921dc6e404";
const EXPECTED_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const EXPECTED_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const EXPECTED_GRAPH_HASH =
  "1cb7fd5e189e751feb0d5a7405244ffdbe5df53a62d717f9266a351d4cfd2a60";

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
    || previousSlice.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || previousSlice.catalogue?.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("ASSAULT_HOLD_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (audit.counts.byDisposition.executable !== 421
    || audit.counts.byDisposition.review_required !== 491
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("ASSAULT_HOLD_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function buildEvidence(catalogue) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const extension = createOfficialAssaultHoldRelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_GRAPH_HASH
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 13
    || relationshipAudit.counts.stateContractMissingExecutors !== 29
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 95,
      partialContractAtoms: 103,
      noContractAtoms: 223,
      executors: 42,
      declaredStateContractExecutors: 13,
      missingStateContractExecutors: 29,
    })) {
    fail("ASSAULT_HOLD_CONTRACT_EVIDENCE_INVALID");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    stateContractCoverage,
  };
}

export function createOfficialExistingAssaultHoldContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = clone(previous.catalogue);
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
    versionReassignedRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [],
    executableScope:
      "frozen_assault_hold_v2_executor_explicit_state_and_restriction_contract_without_rules_mutation",
    existingExecutorContractClosureProgress: {
      contractId: "authority.assault-hold-v2@2.0.0",
      frozenExecutorSourceChanged: false,
      exactActiveOnFieldLiveUnactivatedPieceDenominatorDeclared: true,
      protectedBoardScoreResourcePositionStatusAndDamageStateDeclared: true,
      postDisengageRestrictionHashRoundAndTruthValidationDeclared: true,
      validRestrictionConsumptionHistoryDeclared: true,
      invalidOrStaleRestrictionFailsClosed: true,
      activationAndEligibleSeatHandoffDeclared: true,
      lastHoldAfterOpponentPassCompletesAssaultDeclared: true,
      freshPhaseFirstActorChoiceGateDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationPassed: true,
      strictCompleteAtomCountBefore: 92,
      strictCompleteAtomCountAfter: 95,
      partialContractAtomCountBefore: 103,
      partialContractAtomCountAfter: 103,
      noContractAtomCountBefore: 226,
      noContractAtomCountAfter: 223,
      declaredStateContractExecutorCountBefore: 12,
      declaredStateContractExecutorCountAfter: 13,
      stateContractMissingExecutorCountBefore: 30,
      stateContractMissingExecutorCountAfter: 29,
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
      frozenAssaultHoldReadsWritesInvalidationsAndTestsComplete: true,
      postDisengageRestrictionLifecycleDeclared: true,
      strictCompleteAtomCount: 95,
      partialContractAtomCount: 103,
      noContractAtomCount: 223,
      declaredStateContractExecutorCount: 13,
      stateContractMissingExecutorCount: 29,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 52,
      completedAfterThisSlice: 53,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 30,
      stateContractMissingExecutorsAfterThisSlice: 29,
      atomPromotionSlice: false,
      contractClosureSlice: true,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v17",
      previousActionSchemaVersion: "hybrid_legal_space_v17",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "frozen_421_strict_partial_none_baseline",
        "assault_hold_exact_piece_denominator",
        "assault_hold_protected_state_no_op",
        "assault_hold_post_disengage_restriction_consumption",
        "assault_hold_invalid_or_stale_restriction_fails_closed",
        "assault_hold_phase_first_actor_gate",
        "assault_hold_last_activation_combat_handoff",
        "assault_hold_relationship_negative_gap",
        "assault_hold_ed25519_replay_after_hmac_rotation",
        "live_official_71_69_48_revalidation",
      ],
      crossTimeReplayResult:
        "slice52_runtime_remains_exact_while_assault_hold_contract_is_appended",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-contract-slice",
        "29-existing-executors-still-lack-declared-state-contracts",
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
        "confirm_action",
        "apply_action_after_user_confirmation",
        "replay_room",
        "query_rule_relationship_impact",
      ],
      uiTraceEvidence: ["assault-hold-hidden-until-fresh-phase-first-actor-choice"],
      agentDecisionEvidence: [
        "exact-active-unactivated-piece-hold-denominator",
        "post-disengage-restriction-fails-closed-and-consumes-on-hold",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "missing-state-invalidation-or-judge-edge-removes-contract",
        "receipt-replay-or-signature-failure-removes-contract",
      ],
      userVisibleChecks: [
        "assault-hold-restriction-consumption-and-automatic-combat-handoff",
      ],
    },
    blocks: [
      "29-existing-executors-still-require-explicit-state-contracts",
      "491-actionable-rule-atoms-remain-review-required",
      "production-and-training-gates-remain-closed",
    ],
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("ASSAULT_HOLD_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingAssaultHoldContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash
    || !isDeepStrictEqual(slice.catalogue, input.previousSlice.catalogue)
    || slice.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || slice.previousSliceHash !== input.previousSlice.sliceHash
    || slice.previousCatalogueHash !== input.previousSlice.catalogueHash
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || slice.versionReassignedRuleAtomIds.length !== 0
    || slice.executorIds.length !== 0) {
    fail("ASSAULT_HOLD_CONTRACT_SLICE_INVALID");
  }
  const evidence = buildEvidence(slice.catalogue);
  if (slice.ruleRelationshipGraphBinding.graphHash !== evidence.graph.graphHash
    || slice.ruleRelationshipGraphBinding.nodeCount !== evidence.graph.nodes.length
    || slice.ruleRelationshipGraphBinding.edgeCount !== evidence.graph.edges.length
    || slice.existingExecutorContractClosureProgress.frozenExecutorSourceChanged
      !== false
    || slice.historicalCompatibility.rulesRuntimeChanged !== false
    || slice.historicalCompatibility.historicalRulesDisplayRetained !== true
    || slice.historicalCompatibility.silentCompatibilityAllowed !== false
    || slice.rulesEligible !== false
    || slice.productionRoomEligible !== false
    || slice.trainingTruth !== false) {
    fail("ASSAULT_HOLD_CONTRACT_SLICE_EVIDENCE_MISMATCH");
  }
  const counts = {
    executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
    reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
    displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors:
      evidence.relationshipAudit.counts.declaredStateContractExecutors,
    stateContractMissingExecutors:
      evidence.relationshipAudit.counts.stateContractMissingExecutors,
    strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
    partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
    noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
  };
  if (!isDeepStrictEqual(counts, {
    executableRuleAtoms: 421,
    reviewRequiredRuleAtoms: 491,
    displayOnlyRuleAtoms: 114,
    changedAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 0,
    declaredStateContractExecutors: 13,
    stateContractMissingExecutors: 29,
    strictCompleteAtoms: 95,
    partialContractAtoms: 103,
    noContractAtoms: 223,
  })) {
    fail("ASSAULT_HOLD_CONTRACT_COUNTS_INVALID");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_assault_hold_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    counts,
    changedAtomIds: [],
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    rulesTruth:
      "frozen_assault_hold_v2_executor_with_explicit_state_and_restriction_contract",
    trainingTruth: false,
  });
}
