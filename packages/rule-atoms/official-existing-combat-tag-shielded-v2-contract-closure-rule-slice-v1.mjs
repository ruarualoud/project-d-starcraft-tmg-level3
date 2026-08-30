import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID,
} from "./official-combat-tag-shielded-ranged-executor-v1.mjs";
import {
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_NEW_ATOM_IDS,
  OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_TRANSITION_SCHEMA,
} from "./official-combat-tag-shielded-ranged-executor-v2.mjs";
import { createOfficialCombatTagShieldedV2RelationshipExtensionV1 } from
  "./official-combat-tag-shielded-v2-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialExistingGoliathScatterV2ContractClosureRuleSliceV1 } from
  "./official-existing-goliath-scatter-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialGoliathScatterV2RelationshipExtensionV1 } from
  "./official-goliath-scatter-v2-relationship-contract-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
  createRuleRelationshipGraphV1,
} from "./rule-relationship-graph-v1.mjs";
import { auditExecutableAtomStateContractCoverageV1 } from
  "./rule-executor-state-contract-coverage-v1.mjs";
import { createRuleAtomCatalogue, verifyRuleAtomCatalogue } from
  "./rule-atom-catalogue-v1.mjs";

const SLICE_SCHEMA =
  "starcraft_tmg_official_existing_combat_tag_shielded_v2_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_goliath_scatter_v2_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "32597443e0c9e6ef31ea2097f47c01e7d7e98ace48ee341d8d120c833097a54f";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "bb6df07837fb7a56a420a541292c41d1b05efb8c37ebf55afa0f34851bfef0d7";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "3694d34c2e8c7df4b87cdb9a3dafb6222552f577731b86fa786c24c5a9fb619e";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "a93a88de4648711176b341e117da8123e0a164e955e57de9a5dfb50831a80e73";
const EXPECTED_SLICE_HASH =
  "4d162039d5d33d453b89cb487e4b0b7372fb2a92e374c821534d3a744165b711";
const EXPECTED_CATALOGUE_HASH =
  "f6684fd9e57801970677a4885488abba0faaa65b5d0d0b3ffa79794f932a5b08";
const EXPECTED_RUNTIME_HASH =
  "fe8427b55b74ebb99bd40ab6517f35ff85e2194040f76e4049c4d8116f673b00";
const EXPECTED_GRAPH_HASH =
  "816589172c143eb495b946fe5d3265ada700f00541f87cd2b4500d70386581a5";

export const OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

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
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialGoliathScatterV2RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function reboundAtom(atom) {
  const slug = atom.atomId.replace(/^rule-atom:/u, "combat-tag-shielded-v2:");
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
      "COMBAT_TAG_SHIELDED_DATA_ADAPTER_V2_RECEIPT_INVALID",
      "COMBAT_TAG_SHIELDED_V2_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: {
      positiveFixtureIds: [...atom.evidence.positiveFixtureIds,
        `${slug}:latest-official-tag-and-shielded-success`],
      negativeFixtureIds: [...atom.evidence.negativeFixtureIds,
        `${slug}:stale-source-adapter-and-action-rejection`],
      interactionFixtureIds: [...atom.evidence.interactionFixtureIds,
        `${slug}:tag-surge-shield-threshold-interaction`],
      lifecycleFixtureIds: [...atom.evidence.lifecycleFixtureIds,
        `${slug}:shield-loss-and-preserved-hit-points-lifecycle`],
      replayFixtureIds: [...atom.evidence.replayFixtureIds,
        `${slug}:authority-ed25519-replay-after-hmac-rotation`],
      sourceDriftFixtureIds: [...atom.evidence.sourceDriftFixtureIds,
        `${slug}:frozen-v1-and-live-official-71-69-48`],
    },
  };
}

function createCurrentCatalogue(previousCatalogue) {
  if (OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS.length !== 10) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const targetIds = new Set(OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS);
  const observed = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID) {
      fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targetIds].sort())) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_ACTION_TYPE],
    transitionSchema: OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.65.0-official-current-combat-tag-shielded-v2",
    rulesVersion: previousCatalogue.rulesVersion,
    sourceDenominatorStatus: previousCatalogue.sourceDenominatorStatus,
    sourceDenominatorBinding: clone(previousCatalogue.sourceDenominatorBinding),
    sourceSnapshots: clone(previousCatalogue.sourceSnapshots),
    sourceClauses: clone(previousCatalogue.sourceClauses),
    atoms,
    executorManifest,
  });
}

function buildEvidence(catalogue, { freezeRelease = true } = {}) {
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const graph = createRuleRelationshipGraphV1({
    catalogue,
    extension: createOfficialCombatTagShieldedV2RelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 37
    || relationshipAudit.counts.stateContractMissingExecutors !== 5
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 401,
      partialContractAtoms: 15,
      noContractAtoms: 5,
      executors: 42,
      declaredStateContractExecutors: 37,
      missingStateContractExecutors: 5,
    })) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
    }));
  }
  return { catalogueAudit, runtime: runtime.descriptor, graph,
    relationshipAudit, stateContractCoverage };
}

export function createOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createCurrentCatalogue(previous.catalogue);
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
    versionReassignedRuleAtomIds: [...OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID],
    executableScope: "current_combat_tag_shielded_ranged_v2",
    existingExecutorContractClosureProgress: {
      contractId:
        `${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID}`
          + `@${OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      latestUnifiedOfficialDataRequired: true,
      explicitCurrentToFrozenSemanticKernelAdapterRequired: true,
      legalCandidateCount: 5,
      combatTagTargetAuthorizationDeclared: true,
      shieldDamageStatusLifecycleDeclared: true,
      sourceMissionScoreLoadoutAndTerminalWritesProtected: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 391,
      strictCompleteAtomCountAfter: 401,
      partialContractAtomCountBefore: 15,
      partialContractAtomCountAfter: 15,
      noContractAtomCountBefore: 15,
      noContractAtomCountAfter: 5,
      declaredStateContractExecutorCountBefore: 36,
      declaredStateContractExecutorCountAfter: 37,
      stateContractMissingExecutorCountBefore: 6,
      stateContractMissingExecutorCountAfter: 5,
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
      combatTagShieldedV2ContractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 401,
      partialContractAtomCount: 15,
      noContractAtomCount: 5,
      nonStrictAtomCount: 20,
      declaredStateContractExecutorCount: 37,
      stateContractMissingExecutorCount: 5,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 71,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 70,
      completedAfterThisSlice: 71,
      migratedExistingAtomCount: 10,
      newlyStrictAtomCount: 10,
      existingNonStrictAtomsBeforeThisSlice: 30,
      existingNonStrictAtomsAfterThisSlice: 20,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 6,
      stateContractMissingExecutorsAfterThisSlice: 5,
      atomPromotionSlice: false,
      executorVersionCorrectionSlice: true,
      contractClosureSlice: true,
      atomDenominatorIsAuthoritative: true,
    },
    historicalCompatibility: {
      previousSliceHash: previous.sliceHash,
      previousCatalogueHash: previous.catalogueHash,
      previousRuntimeHash: EXPECTED_PREVIOUS_RUNTIME_HASH,
      currentRuntimeHash: evidence.runtime.runtimeHash,
      frozenExecutorIds: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_EXECUTOR_ID],
      replacementExecutorIds: [OFFICIAL_COMBAT_TAG_SHIELDED_RANGED_V2_EXECUTOR_ID],
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
      judgeTestsRun: 8,
      crossTimeReplayResult:
        "current_combat_tag_shielded_v2_plus_frozen_v1_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_five_executor_contracts_open",
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
      uiTraceEvidence:
        "combat_tag_shielded_v2_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_target_tag_shield_threshold_and_exact_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_source_adapter_targeting_shield_or_exact_action_drift_quarantines_v2",
        "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "five exact Goliath and Marine target choices remain visible",
        "Ground targeting rejects the Flying drone",
        "Shielded status follows the strict damage threshold",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "five_existing_executor_contracts_remain",
      "twenty_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingCombatTagShieldedV2ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      slice.versionReassignedRuleAtomIds,
      [...OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS],
    )) {
    fail("COMBAT_TAG_SHIELDED_V2_CONTRACT_CONTENT_INVALID");
  }
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  return freezeDeep({
    schema:
      "starcraft_tmg_official_existing_combat_tag_shielded_v2_contract_closure_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_SLICE_71_MIGRATED_ATOM_IDS.length,
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
    graphAudit: evidence.relationshipAudit,
    stateContractCoverage: evidence.stateContractCoverage,
    relationshipAuthority: "derived_audit_evidence_only",
    rulesAuthority: false,
    productionEligible: false,
    trainingTruth: false,
  });
}
