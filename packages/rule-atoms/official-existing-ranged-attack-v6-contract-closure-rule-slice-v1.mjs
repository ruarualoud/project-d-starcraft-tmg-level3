import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementV5MedpackV2RelationshipExtensionV1 } from
  "./official-movement-v5-medpack-v2-relationship-contract-v1.mjs";
import { createOfficialRangedAttackV6RelationshipExtensionV1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v6.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_ranged_attack_v6_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_medic_medpack_v2_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b";
const EXPECTED_CATALOGUE_HASH =
  "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b";
const EXPECTED_RUNTIME_HASH =
  "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "488194f777c1b6c00b601b02d07a7aa28c11537bd4535266e465ee687562d23f";
const EXPECTED_GRAPH_HASH =
  "306ec6a496ff0201f13a155e02872c0305b726853e59e92c7364421b30f7f363";
const EXPECTED_SLICE_HASH =
  "17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07";

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
    fail("RANGED_ATTACK_V6_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousSlice.catalogue,
  });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialMovementV5MedpackV2RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("RANGED_ATTACK_V6_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function buildEvidence(catalogue, { freezeRelease = true } = {}) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialRangedAttackV6RelationshipExtensionV1({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  const relationshipAudit = auditRuleRelationshipGraphV1(graph);
  const stateContractCoverage = auditExecutableAtomStateContractCoverageV1(graph);
  if ((freezeRelease && (
    catalogue.catalogueHash !== EXPECTED_CATALOGUE_HASH
      || runtime.descriptor.runtimeHash !== EXPECTED_RUNTIME_HASH
      || graph.graphHash !== EXPECTED_GRAPH_HASH
  ))
    || catalogueAudit.counts.byDisposition.executable !== 421
    || catalogueAudit.counts.byDisposition.review_required !== 491
    || catalogueAudit.counts.byDisposition.display_only !== 114
    || catalogueAudit.executableContractGaps.length !== 0
    || catalogueAudit.evidenceGaps.length !== 0
    || relationshipAudit.valid !== true
    || relationshipAudit.declaredScopesValid !== true
    || relationshipAudit.globalRelationshipCoverageComplete !== false
    || relationshipAudit.productionEligible !== false
    || relationshipAudit.counts.executors !== 42
    || relationshipAudit.counts.declaredStateContractExecutors !== 31
    || relationshipAudit.counts.stateContractMissingExecutors !== 11
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 288,
      partialContractAtoms: 79,
      noContractAtoms: 54,
      executors: 42,
      declaredStateContractExecutors: 31,
      missingStateContractExecutors: 11,
    })) {
    fail("RANGED_ATTACK_V6_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingRangedAttackV6ContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = clone(previous.catalogue);
  const freezeRelease = input.freezeRelease !== false;
  const evidence = buildEvidence(catalogue, { freezeRelease });
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
    versionReassignedRuleAtomIds: [],
    contractEvidenceReboundRuleAtomIds: [],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID],
    executableScope:
      "existing_ranged_attack_v6_full_v1_through_v6_delegated_state_contract",
    existingExecutorContractClosureProgress: {
      contractId: `${OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID}`
        + `@${OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION}`,
      frozenRangedAttackV1ThroughV6ExecutorSourcesChanged: false,
      latestOfficialDataRequiredWithoutRepositoryFallback: true,
      directCommandoAndDelegatedV1ThroughV5PathsDeclared: true,
      exactLegalSpaceAndActionDeclared: true,
      damageCasualtyActivationSideHandoffAndLogWritesDeclared: true,
      missionScoreSupplySourceAndTerminalWritesProtected: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 265,
      strictCompleteAtomCountAfter: 288,
      partialContractAtomCountBefore: 40,
      partialContractAtomCountAfter: 79,
      noContractAtomCountBefore: 116,
      noContractAtomCountAfter: 54,
      declaredStateContractExecutorCountBefore: 30,
      declaredStateContractExecutorCountAfter: 31,
      stateContractMissingExecutorCountBefore: 12,
      stateContractMissingExecutorCountAfter: 11,
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
      rangedAttackV6ContractComplete: true,
      historicalV1ThroughV6RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 288,
      partialContractAtomCount: 79,
      noContractAtomCount: 54,
      nonStrictAtomCount: 133,
      declaredStateContractExecutorCount: 31,
      stateContractMissingExecutorCount: 11,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 67,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 66,
      completedAfterThisSlice: 67,
      migratedExistingAtomCount: 0,
      newlyStrictAtomCount: 23,
      existingNonStrictAtomsBeforeThisSlice: 156,
      existingNonStrictAtomsAfterThisSlice: 133,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 12,
      stateContractMissingExecutorsAfterThisSlice: 11,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: false,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: [
        "authority.ranged-attack-v1",
        "authority.ranged-attack-v2",
        "authority.ranged-attack-v3",
        "authority.ranged-attack-v4",
        "authority.ranged-attack-v5",
      ],
      currentExecutorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      currentExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: false,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v24",
      previousActionSchemaVersion: "hybrid_legal_space_v24",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 7,
      crossTimeReplayResult:
        "current_ranged_v6_plus_frozen_v1_through_v5_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_eleven_executor_contracts_open",
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
      uiTraceEvidence: "ranged_attack_v6_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_current_profile_loadout_geometry_chance_damage_and_exact_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_profile_loadout_geometry_or_exact_action_drift_quarantines_v6",
        "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "legal space exposes only source-bound in-range unengaged ranged attacks",
        "preview shows exact weapon chance allocation effects target and range",
        "frozen v1 through v5 identities remain available to historical replay only",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "eleven_existing_executor_contracts_remain",
      "one_hundred_thirty_three_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("RANGED_ATTACK_V6_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingRangedAttackV6ContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("RANGED_ATTACK_V6_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingRangedAttackV6ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)
    || !isDeepStrictEqual(slice.catalogue, input.previousSlice.catalogue)
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || slice.versionReassignedRuleAtomIds.length !== 0
    || slice.contractEvidenceReboundRuleAtomIds.length !== 0) {
    fail("RANGED_ATTACK_V6_CONTRACT_CONTENT_OR_CATALOGUE_MUTATION");
  }
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_ranged_attack_v6_contract_closure_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: 0,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      missingStateContractExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
    },
    catalogueHash: slice.catalogueHash,
    runtimeHash: evidence.runtime.runtimeHash,
    graphHash: evidence.graph.graphHash,
    productionEligible: false,
    trainingTruth: false,
  });
}
