import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  createOfficialEndOfRoundEffectsRelationshipExtensionV1,
} from "./official-end-of-round-effects-relationship-contract-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE,
  OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
} from "./official-end-of-round-effects-executor-v2.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
} from "./official-optical-flare-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
} from "./official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
  OFFICIAL_END_OF_ROUND_EFFECTS_V5_TRANSITION_SCHEMA,
} from "./official-end-of-round-effects-executor-v5.mjs";
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
  "starcraft_tmg_official_existing_end_of_round_effects_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_hold_position_end_game_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "d74733ad2a030e7e2b5ab7aabcd05f9af5a4129102b8cf951640876972835b21";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64";
const EXPECTED_SLICE_HASH =
  "4b23af8627bed2e3b8f3820e84dea2c0ab710d2085e2a16defbe84584a6da014";
const EXPECTED_CATALOGUE_HASH =
  "47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9";
const EXPECTED_RUNTIME_HASH =
  "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089";
const EXPECTED_GRAPH_HASH =
  "52f9ad4f03f3249149693f243a0f1e789864634d030cd3ff432a2ea8fb6baff1";

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
  if (!Number.isSafeInteger(major) || major < 1) fail("END_OF_ROUND_ATOM_VERSION_INVALID");
  return `${major + 1}.0.0`;
}

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== PREVIOUS_SLICE_SCHEMA
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || previousSlice.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || previousSlice.catalogue?.catalogueHash !== EXPECTED_PREVIOUS_CATALOGUE_HASH
    || hashStarcraftTmgContract(sliceBody(previousSlice)) !== previousSlice.sliceHash) {
    fail("END_OF_ROUND_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
}

function verifyPreviousRelease(previousSlice) {
  const audit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  if (audit.counts.byDisposition.executable !== 421
    || audit.counts.byDisposition.review_required !== 491
    || audit.counts.byDisposition.display_only !== 114
    || audit.executableContractGaps.length !== 0
    || audit.evidenceGaps.length !== 0
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH) {
    fail("END_OF_ROUND_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId) {
  const slug = atomId.replace(/^rule-atom:/u, "end-of-round-v5:");
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:empty-optical-flare-and-stimpack-current-branches`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:forged-lineage-extra-field-and-stale-proof-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:scoring-prefix-status-marker-damage-and-cleanup-handoff`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:persistent-until-cleanup-not-end-of-round-removal`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v2-v3-v4-to-exact-public-v5`],
  };
}

function reboundAtom(atom) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "END_OF_ROUND_V5_ACTION_INVALID",
      "END_OF_ROUND_V5_ACTION_MISMATCH",
      "END_OF_ROUND_V5_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId),
  };
}

function createEndOfRoundV5Catalogue(previousCatalogue) {
  const targetIds = new Set(OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS);
  const observedIds = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    observedIds.push(atom.atomId);
    if (atom.disposition !== "executable") {
      fail("END_OF_ROUND_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(
    observedIds.sort(),
    [...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS].sort(),
  )) {
    fail("END_OF_ROUND_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const previousV4 = previousCatalogue.executorManifest.filter((entry) => (
    entry.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
  ));
  if (previousV4.length !== 1) fail("END_OF_ROUND_CONTRACT_V4_MANIFEST_INVALID");
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION,
    actionTypes: [OFFICIAL_END_OF_ROUND_EFFECTS_ACTION_TYPE],
    transitionSchema: OFFICIAL_END_OF_ROUND_EFFECTS_V5_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.53.0-official-end-of-round-effects-exact-action-v5",
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
  const extension = createOfficialEndOfRoundEffectsRelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 20
    || relationshipAudit.counts.stateContractMissingExecutors !== 22
    || relationshipAudit.counts.remainingActionableRuleAtoms !== 491
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 160,
      partialContractAtoms: 81,
      noContractAtoms: 180,
      executors: 42,
      declaredStateContractExecutors: 20,
      missingStateContractExecutors: 22,
    })) {
    fail("END_OF_ROUND_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
      catalogue: catalogueAudit.counts.byDisposition,
      relationship: relationshipAudit.counts,
      gaps: relationshipAudit.gaps,
      coverage: stateContractCoverage.counts,
      catalogueHash: catalogue.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
      graphHash: graph.graphHash,
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

export function createOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1(
  input = {},
) {
  verifyPreviousSlice(input.previousSlice);
  verifyPreviousRelease(input.previousSlice);
  const previous = input.previousSlice;
  const catalogue = createEndOfRoundV5Catalogue(previous.catalogue);
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
    versionReassignedRuleAtomIds: [
      ...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
    ],
    contractEvidenceReboundRuleAtomIds: [
      ...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS,
    ],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [
      OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
      OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
    ],
    executableScope:
      "end_of_round_empty_queue_optical_flare_and_stimpack_persistence_exact_public_v5",
    existingExecutorContractClosureProgress: {
      contractIds: [
        `${OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID}@2.0.0`,
        `${OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID}@3.0.0`,
        `${OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID}`
          + `@${OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_VERSION}`,
      ],
      frozenV2V3V4ExecutorSourcesChanged: false,
      exactPublicEnumerateApplyContractDeclared: true,
      dynamicLineageForEmptyOpticalAndStimpackDeclared: true,
      forgedLineageDiagnosticsAndExtraFieldsRejected: true,
      currentScoringPrefixSourceProofAndMatchBindingDeclared: true,
      firstPlayerOnlyDeclared: true,
      opticalFlareAndStimpackPersistenceDeclared: true,
      damageMarkerRetentionDeclared: true,
      cleanupHandoffDeclared: true,
      protectedStateWritesDeclared: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 158,
      strictCompleteAtomCountAfter: 160,
      partialContractAtomCountBefore: 80,
      partialContractAtomCountAfter: 81,
      noContractAtomCountBefore: 183,
      noContractAtomCountAfter: 180,
      declaredStateContractExecutorCountBefore: 17,
      declaredStateContractExecutorCountAfter: 20,
      stateContractMissingExecutorCountBefore: 25,
      stateContractMissingExecutorCountAfter: 22,
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
      endOfRoundV2V3V5ReadsWritesInvalidationsAndTestsComplete: true,
      v4HistoricalExecutorFrozenAndSuperseded: true,
      v2AndV3InternalVersionPathsRetained: true,
      strictCompleteAtomCount: 160,
      partialContractAtomCount: 81,
      noContractAtomCount: 180,
      declaredStateContractExecutorCount: 20,
      stateContractMissingExecutorCount: 22,
      missingStateOrJudgeEdgeBlocksFreeze: true,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 58,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 57,
      completedAfterThisSlice: 58,
      existingNonStrictAtomsBeforeThisSlice: 263,
      existingNonStrictAtomsAfterThisSlice: 261,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 25,
      stateContractMissingExecutorsAfterThisSlice: 22,
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
      frozenExecutorIds: [
        OFFICIAL_END_OF_ROUND_EFFECTS_V2_EXECUTOR_ID,
        OFFICIAL_END_OF_ROUND_EFFECTS_V3_EXECUTOR_ID,
        OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
      ],
      replacementExecutorId: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ID,
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v18",
      previousActionSchemaVersion: "hybrid_legal_space_v17",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 13,
      crossTimeReplayResult:
        "exact_v5_three_branch_paths_plus_frozen_v2_v3_v4_replay_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "cleanup_refresh_v3_v4_contracts_remain_open",
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
      uiTraceEvidence: "authority_cleanup_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_exact_empty-optical-stimpack-end-of-round-domain",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official source progress status marker or damage drift quarantines v5",
        "exact action Authority signature replay or historical-display failure demotes current runtime",
      ],
      userVisibleChecks: [
        "preview identifies exact queue proof and persistence branch",
        "apply preserves status marker and damage until cleanup",
        "history shows frozen v2 v3 v4 rules beside current v5",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "twenty_two_existing_executor_contracts_remain",
      "two_hundred_sixty_one_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "cleanup_refresh_and_remaining_trigger_priority_contracts_pending",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("END_OF_ROUND_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("END_OF_ROUND_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingEndOfRoundEffectsContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)) {
    fail("END_OF_ROUND_CONTRACT_SLICE_CONTENT_MISMATCH");
  }
  const audit = verifyRuleAtomCatalogue(slice.catalogue);
  const previousById = new Map(input.previousSlice.catalogue.atoms.map((atom) => [
    atom.atomId,
    atom,
  ]));
  const targetIds = new Set(OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS);
  const changedNonTargetAtoms = slice.catalogue.atoms.filter((atom) => (
    !targetIds.has(atom.atomId)
      && !isDeepStrictEqual(atom, previousById.get(atom.atomId))
  )).length;
  const evidence = buildEvidence(slice.catalogue);
  if (changedNonTargetAtoms !== 0
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      [...slice.versionReassignedRuleAtomIds].sort(),
      [...OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS].sort(),
    )) {
    fail("END_OF_ROUND_CONTRACT_NON_TARGET_MUTATION");
  }
  return freezeDeep({
    schema: "starcraft_tmg_existing_end_of_round_effects_contract_closure_audit_v1",
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
      changedAtoms: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS.length,
      changedNonTargetAtoms,
      newlyExecutableRuleAtoms: 0,
      versionReassignedRuleAtoms: OFFICIAL_END_OF_ROUND_EFFECTS_V5_EXECUTOR_ATOM_IDS.length,
      declaredStateContractExecutors:
        evidence.stateContractCoverage.counts.declaredStateContractExecutors,
      stateContractMissingExecutors:
        evidence.stateContractCoverage.counts.missingStateContractExecutors,
      strictCompleteAtoms: evidence.stateContractCoverage.counts.strictCompleteAtoms,
      partialContractAtoms: evidence.stateContractCoverage.counts.partialContractAtoms,
      noContractAtoms: evidence.stateContractCoverage.counts.noContractAtoms,
    },
    rulesTruth: "end_of_round_effects_v5_exact_public_action_and_v2_v3_v5_state_contracts",
    productionTruth: false,
    trainingTruth: false,
  });
}
