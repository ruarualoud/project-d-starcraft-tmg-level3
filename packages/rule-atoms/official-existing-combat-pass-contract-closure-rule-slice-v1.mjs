import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCombatPassRelationshipExtensionV1,
} from "./official-combat-pass-relationship-contract-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
} from "./official-combat-pass-executor-v2.mjs";
import {
  OFFICIAL_COMBAT_PASS_V3_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_PASS_V3_TRANSITION_SCHEMA,
} from "./official-combat-pass-executor-v3.mjs";
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
  "starcraft_tmg_official_existing_combat_pass_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_assault_hold_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "8afa8a3085562d61adda4469ef1e160a363828e6a6f9d9bcb561e4921dc6e404";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a";
const EXPECTED_SLICE_HASH =
  "e87649721f78720ced43ea3792dcbcd7514a4fe187c63222ecac1ba1eacca90f";
const EXPECTED_CATALOGUE_HASH =
  "eea6d9c0395db9e442f9606b3a9c97196aa949b7a0e29c69590c5717b246922d";
const EXPECTED_RUNTIME_HASH =
  "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c";
const EXPECTED_GRAPH_HASH =
  "1847bcd8d6446cecdea3c20b2ca07b35383052e288b69037ed7c7c97208dc590";

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
    fail("COMBAT_PASS_CONTRACT_PREVIOUS_SLICE_INVALID");
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
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("COMBAT_PASS_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "combat-pass-v3:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:exact-mandatory-pass-and-handoff`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-action-choice-and-engagement-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:engagement-graph-phase-choice-and-active-seat`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:two-pass-combat-to-cleanup`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v2-to-exact-v3-migration`],
  };
}

function combatPassV3Atom(atom) {
  return {
    ...clone(atom),
    atomVersion: "3.0.0",
    preconditions: [
      ...clone(atom.preconditions),
      {
        predicateId: "combat.fresh_phase_first_actor_choice_exists",
        inputSchema: "starcraft_tmg_state_v0",
        failureCode: "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_REQUIRED",
      },
    ],
    effect: {
      executorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
      transitionSchema: OFFICIAL_COMBAT_PASS_V3_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "COMBAT_PASS_V3_ACTION_INVALID",
      "COMBAT_PASS_V3_ACTION_MISMATCH",
      "COMBAT_PASS_V3_ACTION_STALE",
      "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_INVALID",
      "COMBAT_PASS_V3_PHASE_FIRST_ACTOR_REQUIRED",
    ])],
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createCombatPassV3Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_V3_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID) {
      fail("COMBAT_PASS_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return combatPassV3Atom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS].sort(),
  )) {
    fail("COMBAT_PASS_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION,
    actionTypes: ["pass"],
    transitionSchema: OFFICIAL_COMBAT_PASS_V3_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.49.0-official-combat-pass-exact-action-v3",
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
  const extension = createOfficialCombatPassRelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 14
    || relationshipAudit.counts.stateContractMissingExecutors !== 28
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 122,
      partialContractAtoms: 80,
      noContractAtoms: 219,
      executors: 42,
      declaredStateContractExecutors: 14,
      missingStateContractExecutors: 28,
    })) {
    fail("COMBAT_PASS_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogue: catalogueAudit.counts.byDisposition,
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

export function createOfficialExistingCombatPassContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCombatPassV3Catalogue(previous.catalogue);
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
    versionReassignedRuleAtomIds: [...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID],
    executableScope:
      "combat_pass_v3_exact_public_action_phase_choice_engagement_handoff_cleanup_and_replay_contract",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID}@${OFFICIAL_COMBAT_PASS_V3_EXECUTOR_VERSION}`,
      frozenV2ExecutorSourceChanged: false,
      exactPublicEnumerateApplyContractDeclared: true,
      forgedExecutorVersionLineageAndExtraFieldsRejected: true,
      exactEngagementGraphV2DenominatorDeclared: true,
      freshPhaseFirstActorChoiceGateDeclared: true,
      firstPassOpponentHandoffDeclared: true,
      secondPassCleanupAdvanceDeclared: true,
      protectedBoardPieceScoreResourceMarkerAndChoiceStateDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationPassed: true,
      strictCompleteAtomCountBefore: 95,
      strictCompleteAtomCountAfter: 122,
      partialContractAtomCountBefore: 103,
      partialContractAtomCountAfter: 80,
      noContractAtomCountBefore: 223,
      noContractAtomCountAfter: 219,
      declaredStateContractExecutorCountBefore: 13,
      declaredStateContractExecutorCountAfter: 14,
      stateContractMissingExecutorCountBefore: 29,
      stateContractMissingExecutorCountAfter: 28,
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
      combatPassV3ReadsWritesInvalidationsAndTestsComplete: true,
      v2HistoricalExecutorFrozenAndSuperseded: true,
      strictCompleteAtomCount: 122,
      partialContractAtomCount: 80,
      noContractAtomCount: 219,
      declaredStateContractExecutorCount: 14,
      stateContractMissingExecutorCount: 28,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      completedBeforeThisSlice: 53,
      completedAfterThisSlice: 54,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 29,
      stateContractMissingExecutorsAfterThisSlice: 28,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      planningForecastOnly: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      previousExecutorId: OFFICIAL_COMBAT_PASS_V2_EXECUTOR_ID,
      replacementExecutorId: OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID,
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
      roleRoutes: ["rule_skill_builder", "referee", "opponent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: [
        "combat_pass_v2_public_apply_defect_reproduction",
        "combat_pass_v3_exact_public_action",
        "combat_pass_v3_forged_lineage_rejection",
        "combat_pass_v3_fresh_phase_choice_gate",
        "combat_pass_v3_engagement_gate",
        "combat_pass_v3_first_pass_handoff",
        "combat_pass_v3_second_pass_cleanup",
        "combat_pass_v3_protected_state",
        "combat_pass_v3_relationship_negative_gap",
        "combat_pass_v3_ed25519_replay_after_hmac_rotation",
        "combat_pass_v2_historical_runtime_and_display",
        "live_official_71_69_48_revalidation",
      ],
      crossTimeReplayResult:
        "frozen_v2_runtime_remains_exact_while_v3_receipts_replay_after_hmac_rotation",
      promotions: [],
      blocks: [
        "no-skill-generation-or-promotion-in-rule-contract-slice",
        "28-existing-executors-still-lack-declared-state-contracts",
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
      uiTraceEvidence: ["combat-pass-hidden-until-fresh-phase-first-actor-choice"],
      agentDecisionEvidence: [
        "exact-zero-remaining-engaged-unit-pass-denominator",
        "forged-version-lineage-and-extra-fields-fail-closed",
      ],
      memoryTraceEvidence: "no-memory-write-or-promotion-attempted",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "missing-state-invalidation-or-judge-edge-removes-contract",
        "public-apply-exactness-or-receipt-replay-failure-removes-contract",
      ],
      userVisibleChecks: [
        "first-combat-pass-hands-opponent-and-second-enters-cleanup",
      ],
    },
    blocks: [
      "28-existing-executors-still-require-explicit-state-contracts",
      "491-actionable-rule-atoms-remain-review-required",
      "production-and-training-gates-remain-closed",
    ],
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("COMBAT_PASS_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingCombatPassContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || slice.catalogueHash !== EXPECTED_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash
    || slice.previousSliceHash !== input.previousSlice.sliceHash
    || slice.previousCatalogueHash !== input.previousSlice.catalogueHash
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      slice.versionReassignedRuleAtomIds,
      [...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS],
    )
    || !isDeepStrictEqual(slice.executorIds, [OFFICIAL_COMBAT_PASS_V3_EXECUTOR_ID])) {
    fail("COMBAT_PASS_CONTRACT_SLICE_INVALID");
  }
  const expected = createOfficialExistingCombatPassContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("COMBAT_PASS_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const evidence = buildEvidence(slice.catalogue);
  const targetIds = new Set(OFFICIAL_COMBAT_PASS_V3_ATOM_IDS);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => (
    [atom.atomId, atom]
  )));
  const changedAtomIds = slice.catalogue.atoms.filter((atom) => (
    !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).map((atom) => atom.atomId);
  const changedNonTargetAtomIds = changedAtomIds.filter((atomId) => !targetIds.has(atomId));
  if (!isDeepStrictEqual(changedAtomIds.sort(), [...OFFICIAL_COMBAT_PASS_V3_ATOM_IDS].sort())
    || changedNonTargetAtomIds.length !== 0
    || slice.historicalCompatibility.previousExecutorSourceMutationAllowed !== false
    || slice.historicalCompatibility.silentCompatibilityAllowed !== false
    || slice.historicalCompatibility.historicalRulesDisplayRetained !== true
    || slice.rulesEligible !== false
    || slice.productionRoomEligible !== false
    || slice.trainingTruth !== false) {
    fail("COMBAT_PASS_CONTRACT_SLICE_EVIDENCE_MISMATCH");
  }
  const counts = {
    executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
    reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
    displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
    changedAtoms: changedAtomIds.length,
    changedNonTargetAtoms: changedNonTargetAtomIds.length,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: slice.versionReassignedRuleAtomIds.length,
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
    changedAtoms: 34,
    changedNonTargetAtoms: 0,
    newlyExecutableRuleAtoms: 0,
    versionReassignedRuleAtoms: 34,
    declaredStateContractExecutors: 14,
    stateContractMissingExecutors: 28,
    strictCompleteAtoms: 122,
    partialContractAtoms: 80,
    noContractAtoms: 219,
  })) {
    fail("COMBAT_PASS_CONTRACT_COUNTS_INVALID");
  }
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_combat_pass_contract_closure_audit_v1",
    sliceHash: slice.sliceHash,
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    counts,
    changedAtomIds,
    newlyExecutableRuleAtomIds: [],
    versionReassignedRuleAtomIds: [...slice.versionReassignedRuleAtomIds],
    rulesTruth: "combat_pass_v3_exact_public_action_and_state_contract",
    trainingTruth: false,
  });
}
