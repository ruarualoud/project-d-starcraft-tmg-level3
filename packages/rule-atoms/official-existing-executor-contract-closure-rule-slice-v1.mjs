import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialPhaseInitiativeRelationshipExtensionV1,
} from "./official-phase-initiative-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import {
  auditExecutableAtomStateContractCoverageV1,
} from "./rule-executor-state-contract-coverage-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_executor_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_marine_multi_enemy_stimpack_casualty_rule_slice_v5";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45";
const EXPECTED_SLICE_HASH =
  "3dd146a3d76b8c73a3c8807e709b1526a28bc74074a117dcc863f36442216bff";
const EXPECTED_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const EXPECTED_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const EXPECTED_RELATIONSHIP_GRAPH_HASH =
  "d16524a8971bcb2650e3a2d74be75fbf162496f8aacaac73de8541eeab0daa4b";
const EXPECTED_EXECUTABLE_COUNT = 421;
const EXPECTED_REVIEW_COUNT = 491;
const EXPECTED_DISPLAY_COUNT = 114;

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
    fail("EXISTING_CONTRACT_CLOSURE_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  if (catalogueAudit.counts.byDisposition.executable !== EXPECTED_EXECUTABLE_COUNT
    || catalogueAudit.counts.byDisposition.review_required !== EXPECTED_REVIEW_COUNT
    || catalogueAudit.counts.byDisposition.display_only !== EXPECTED_DISPLAY_COUNT
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH) {
    fail("EXISTING_CONTRACT_CLOSURE_PREVIOUS_RELEASE_DRIFT");
  }
}

function buildEvidence(catalogue) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const extension = createOfficialPhaseInitiativeRelationshipExtensionV1({
    catalogueHash: catalogue.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  });
  const graph = createRuleRelationshipGraphV1({ catalogue, extension });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if (catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || graph.graphHash !== EXPECTED_RELATIONSHIP_GRAPH_HASH
    || !relationshipAudit.valid
    || !relationshipAudit.declaredScopesValid
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 10
    || relationshipAudit.counts.stateContractMissingExecutors !== 32
    || relationshipAudit.counts.remainingActionableRuleAtoms !== EXPECTED_REVIEW_COUNT
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 79,
      partialContractAtoms: 106,
      noContractAtoms: 236,
      executors: 42,
      declaredStateContractExecutors: 10,
      missingStateContractExecutors: 32,
    })) {
    fail("EXISTING_CONTRACT_CLOSURE_EVIDENCE_INVALID");
  }
  return {
    catalogueAudit,
    runtime: runtime.descriptor,
    graph,
    relationshipAudit,
    stateContractCoverage,
  };
}

export function createOfficialExistingExecutorContractClosureRuleSliceV1(input = {}) {
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
      "frozen_phase_initiative_executor_explicit_state_contract_without_rules_mutation",
    existingExecutorContractClosureProgress: {
      contractId: "authority.phase-initiative-v1@1.0.0",
      frozenExecutorSourceChanged: false,
      explicitStateReadsDeclared: true,
      explicitStateWritesDeclared: true,
      stateInvalidationPathsDeclared: true,
      exactChoiceDenominatorDeclared: true,
      markerHolderAuthorityDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationPassed: true,
      strictCompleteAtomCountBefore: 76,
      strictCompleteAtomCountAfter: 79,
      partialContractAtomCount: 106,
      noContractAtomCountBefore: 239,
      noContractAtomCountAfter: 236,
      declaredStateContractExecutorCountBefore: 9,
      declaredStateContractExecutorCountAfter: 10,
      stateContractMissingExecutorCountBefore: 33,
      stateContractMissingExecutorCountAfter: 32,
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
      frozenPhaseInitiativeReadsWritesInvalidationsAndTestsComplete: true,
      strictCompleteAtomCount: 79,
      partialContractAtomCount: 106,
      noContractAtomCount: 236,
      declaredStateContractExecutorCount: 10,
      stateContractMissingExecutorCount: 32,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 49,
      completedAfterThisSlice: 50,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 33,
      stateContractMissingExecutorsAfterThisSlice: 32,
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
        "phase_initiative_marker_holder_two_choice_denominator",
        "phase_initiative_state_write_and_invalidation",
        "phase_initiative_relationship_negative_gap",
        "phase_initiative_ed25519_replay_after_hmac_rotation",
      ],
      crossTimeReplayResult:
        "slice49_runtime_remains_exact_while_phase_initiative_contract_is_appended",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-contract-slice",
        "32-existing-executors-still-lack-declared-state-contracts",
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
      uiTraceEvidence: ["marker-holder-sees-two-exact-first-actor-choices"],
      agentDecisionEvidence: ["non-marker-seat-cannot-choose-first-actor"],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "missing-state-invalidation-or-judge-edge-removes-contract",
        "receipt-replay-or-signature-failure-removes-contract",
      ],
      userVisibleChecks: ["chosen-seat-becomes-active-with-marker-holder-unchanged"],
    },
    blocks: [
      "32-existing-executors-still-require-explicit-state-contracts",
      "491-actionable-rule-atoms-remain-review-required",
      "production-and-training-gates-remain-closed",
    ],
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("EXISTING_CONTRACT_CLOSURE_SLICE_HASH_DRIFT");
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingExecutorContractClosureRuleSliceV1(input = {}) {
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
    fail("EXISTING_CONTRACT_CLOSURE_SLICE_INVALID");
  }
  const evidence = buildEvidence(slice.catalogue);
  if (slice.ruleRelationshipGraphBinding.graphHash !== evidence.graph.graphHash
    || slice.ruleRelationshipGraphBinding.nodeCount !== evidence.graph.nodes.length
    || slice.ruleRelationshipGraphBinding.edgeCount !== evidence.graph.edges.length
    || slice.historicalCompatibility.rulesRuntimeChanged !== false
    || slice.historicalCompatibility.historicalRulesDisplayRetained !== true
    || slice.historicalCompatibility.silentCompatibilityAllowed !== false
    || slice.rulesEligible !== false
    || slice.productionRoomEligible !== false
    || slice.trainingTruth !== false) {
    fail("EXISTING_CONTRACT_CLOSURE_SLICE_EVIDENCE_MISMATCH");
  }
  const counts = {
    executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
    reviewRequiredRuleAtoms:
      evidence.catalogueAudit.counts.byDisposition.review_required,
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
    declaredStateContractExecutors: 10,
    stateContractMissingExecutors: 32,
    strictCompleteAtoms: 79,
    partialContractAtoms: 106,
    noContractAtoms: 236,
  })) {
    fail("EXISTING_CONTRACT_CLOSURE_COUNTS_INVALID");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_executor_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    counts,
    changedAtomIds: [],
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [],
    rulesTruth: "frozen_phase_initiative_executor_with_explicit_state_contract",
    trainingTruth: false,
  });
}
