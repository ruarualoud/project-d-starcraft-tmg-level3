import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAcademyMedicV2RelationshipExtensionV1 } from
  "./official-academy-medic-v2-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import { createOfficialLifeSupportV2RelationshipExtensionV1 } from
  "./official-life-support-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID,
} from "./official-medic-life-support-reaction-executor-v1.mjs";
import {
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_LIFE_SUPPORT_V2_TRANSITION_SCHEMA,
  OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
  OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
} from "./official-medic-life-support-reaction-executor-v2.mjs";
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
  "starcraft_tmg_official_existing_life_support_v2_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_academy_medic_v2_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "18d162941b3f83c7efed2e52c4dea1b3ec57854878139ed34e3e55723f77efca";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "4043ad65b05c9f5c8742a7bfffeea36404575f58b10d9c5a51081cd06cfcbf8a";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "c4aacd18eef0e9d4ed63ef1925eaf84f75af7b728df59cf3a04f152aa82a21e4";
const EXPECTED_SLICE_HASH =
  "f40b9709b700518a15eebaa5594a8620d7d6fc77ee07ea7c27aa6ac4725d7971";
const EXPECTED_CATALOGUE_HASH =
  "48f9f27cf603ce6f183e16ee66d4e7cc4b2d0108c4352302ec13eadf6c49a4b7";
const EXPECTED_RUNTIME_HASH =
  "fd1c0889ac76848f3d20ebe943f8467e363c0cf6139697ba72046c7968fa05c8";
const EXPECTED_GRAPH_HASH =
  "9c6060ead883517424891970a4f8071525691f6f85b49dc5f2519ee7decfe766";

export const OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MEDIC_LIFE_SUPPORT_V2_NEW_ATOM_IDS,
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
    fail("LIFE_SUPPORT_V2_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("LIFE_SUPPORT_V2_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialAcademyMedicV2RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("LIFE_SUPPORT_V2_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function reboundAtom(atom) {
  const slug = atom.atomId.replace(/^rule-atom:/u, "life-support-v2:");
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
      transitionSchema: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_TRANSITION_SCHEMA,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "LIFE_SUPPORT_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
      "LIFE_SUPPORT_DATA_ADAPTER_V2_RECEIPT_INVALID",
      "LIFE_SUPPORT_V2_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: {
      positiveFixtureIds: [...atom.evidence.positiveFixtureIds,
        `${slug}:latest-official-use-and-pass-success`],
      negativeFixtureIds: [...atom.evidence.negativeFixtureIds,
        `${slug}:stale-action-source-and-adapter-tamper-rejection`],
      interactionFixtureIds: [...atom.evidence.interactionFixtureIds,
        `${slug}:optical-ranged-total-damage-reaction-composition`],
      lifecycleFixtureIds: [...atom.evidence.lifecycleFixtureIds,
        `${slug}:payment-usage-damage-and-settlement-lifecycle`],
      replayFixtureIds: [...atom.evidence.replayFixtureIds,
        `${slug}:authority-ed25519-replay-after-hmac-rotation`],
      sourceDriftFixtureIds: [...atom.evidence.sourceDriftFixtureIds,
        `${slug}:frozen-v1-and-live-official-71-69-48`],
    },
  };
}

function createCurrentCatalogue(previousCatalogue) {
  if (OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS.length !== 7) {
    fail("LIFE_SUPPORT_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const targetIds = new Set(OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS);
  const observed = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID) {
      fail("LIFE_SUPPORT_V2_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return reboundAtom(atom);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targetIds].sort())) {
    fail("LIFE_SUPPORT_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => entry.executorId !== OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID)
    .map(clone);
  executorManifest.push({
    executorId: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION,
    actionTypes: [
      OFFICIAL_PASS_LIFE_SUPPORT_REACTION_ACTION_TYPE,
      OFFICIAL_USE_LIFE_SUPPORT_REACTION_ACTION_TYPE,
    ],
    transitionSchema: OFFICIAL_MEDIC_LIFE_SUPPORT_V2_TRANSITION_SCHEMA,
  });
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.63.0-official-current-life-support-v2",
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
    extension: createOfficialLifeSupportV2RelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 35
    || relationshipAudit.counts.stateContractMissingExecutors !== 7
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 379,
      partialContractAtoms: 4,
      noContractAtoms: 38,
      executors: 42,
      declaredStateContractExecutors: 35,
      missingStateContractExecutors: 7,
    })) {
    fail("LIFE_SUPPORT_V2_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingLifeSupportV2ContractClosureRuleSliceV1(
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
    versionReassignedRuleAtomIds: [...OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: [OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID],
    executableScope: "current_medic_life_support_reaction_v2",
    existingExecutorContractClosureProgress: {
      contractId:
        `${OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_VERSION}`,
      frozenV1ExecutorSourceChanged: false,
      latestUnifiedOfficialDataRequired: true,
      explicitCurrentToFrozenSemanticKernelAdapterRequired: true,
      baselineLifeSupportOneCommandPointProjectedExplicitly: true,
      stabilizerRequiresExplicitSelection: true,
      stationaryStatusProjectionReceiptRequired: true,
      exactLegalSpaceAndActionDeclared: true,
      paymentDamageUsageAndSettlementWritesDeclared: true,
      supplyMissionScoreStatusAndTerminalWritesProtected: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 372,
      strictCompleteAtomCountAfter: 379,
      partialContractAtomCountBefore: 4,
      partialContractAtomCountAfter: 4,
      noContractAtomCountBefore: 45,
      noContractAtomCountAfter: 38,
      declaredStateContractExecutorCountBefore: 34,
      declaredStateContractExecutorCountAfter: 35,
      stateContractMissingExecutorCountBefore: 8,
      stateContractMissingExecutorCountAfter: 7,
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
      lifeSupportV2ContractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 379,
      partialContractAtomCount: 4,
      noContractAtomCount: 38,
      nonStrictAtomCount: 42,
      declaredStateContractExecutorCount: 35,
      stateContractMissingExecutorCount: 7,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 69,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 68,
      completedAfterThisSlice: 69,
      migratedExistingAtomCount: 7,
      newlyStrictAtomCount: 7,
      existingNonStrictAtomsBeforeThisSlice: 49,
      existingNonStrictAtomsAfterThisSlice: 42,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 8,
      stateContractMissingExecutorsAfterThisSlice: 7,
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
      frozenExecutorIds: [OFFICIAL_MEDIC_LIFE_SUPPORT_EXECUTOR_ID],
      replacementExecutorIds: [OFFICIAL_MEDIC_LIFE_SUPPORT_V2_EXECUTOR_ID],
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
        "current_life_support_v2_plus_frozen_v1_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_seven_executor_contracts_open",
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
        "life_support_v2_cross_seat_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_current_source_use_pass_payment_reduction_and_exact_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_source_adapter_payment_geometry_or_exact_action_drift_quarantines_v2",
        "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "Defender sees one Life Support choice per eligible Medic plus Pass",
        "Life Support reduces Total Damage before casualty allocation",
        "Stabilizer adds one model only when explicitly selected",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "seven_existing_executor_contracts_remain",
      "forty_two_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("LIFE_SUPPORT_V2_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingLifeSupportV2ContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("LIFE_SUPPORT_V2_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingLifeSupportV2ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      slice.versionReassignedRuleAtomIds,
      [...OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS],
    )) {
    fail("LIFE_SUPPORT_V2_CONTRACT_CONTENT_INVALID");
  }
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_life_support_v2_contract_closure_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_SLICE_69_MIGRATED_ATOM_IDS.length,
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
