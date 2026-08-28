import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
} from "./official-academy-medic-ability-executor-v1.mjs";
import {
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_NEW_ATOM_IDS,
  OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_TRANSITION_SCHEMA,
} from "./official-academy-medic-ability-executor-v2.mjs";
import { createOfficialAcademyMedicV2RelationshipExtensionV1 } from
  "./official-academy-medic-v2-relationship-contract-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "./official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
} from "./official-medic-restoration-reaction-executor-v1.mjs";
import {
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
  OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
  OFFICIAL_MEDIC_RESTORATION_V2_NEW_ATOM_IDS,
  OFFICIAL_MEDIC_RESTORATION_V2_TRANSITION_SCHEMA,
} from "./official-medic-restoration-reaction-executor-v2.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
} from "./official-optical-flare-ranged-consumer-executor-v1.mjs";
import {
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_TYPE,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
  OFFICIAL_OPTICAL_FLARE_RANGED_V2_TRANSITION_SCHEMA,
} from "./official-optical-flare-ranged-consumer-executor-v2.mjs";
import { createOfficialRangedAttackV6RelationshipExtensionV1 } from
  "./official-ranged-attack-v6-relationship-contract-v1.mjs";
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
  "starcraft_tmg_official_existing_academy_medic_v2_contract_closure_rule_slice_v1";
const PREVIOUS_SLICE_SCHEMA =
  "starcraft_tmg_official_existing_ranged_attack_v6_contract_closure_rule_slice_v1";
const EXPECTED_PREVIOUS_SLICE_HASH =
  "17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07";
const EXPECTED_PREVIOUS_CATALOGUE_HASH =
  "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b";
const EXPECTED_PREVIOUS_RUNTIME_HASH =
  "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41";
const EXPECTED_PREVIOUS_GRAPH_HASH =
  "306ec6a496ff0201f13a155e02872c0305b726853e59e92c7364421b30f7f363";
const EXPECTED_SLICE_HASH =
  "18d162941b3f83c7efed2e52c4dea1b3ec57854878139ed34e3e55723f77efca";
const EXPECTED_CATALOGUE_HASH =
  "4043ad65b05c9f5c8742a7bfffeea36404575f58b10d9c5a51081cd06cfcbf8a";
const EXPECTED_RUNTIME_HASH =
  "0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e";
const EXPECTED_GRAPH_HASH =
  "c4aacd18eef0e9d4ed63ef1925eaf84f75af7b728df59cf3a04f152aa82a21e4";

const MIGRATIONS = Object.freeze([
  Object.freeze({
    oldExecutorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_EXECUTOR_ID,
    newExecutorId: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_TRANSITION_SCHEMA,
    atomIds: OFFICIAL_ACADEMY_MEDIC_ABILITY_V2_NEW_ATOM_IDS,
    actionTypes: Object.freeze([
      "declare_ability",
      "pass_ability_reaction",
      "resolve_ability",
      "use_ability_reaction",
    ]),
    slug: "academy-medic-ability-v2",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_MEDIC_RESTORATION_EXECUTOR_ID,
    newExecutorId: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_MEDIC_RESTORATION_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_MEDIC_RESTORATION_V2_TRANSITION_SCHEMA,
    atomIds: OFFICIAL_MEDIC_RESTORATION_V2_NEW_ATOM_IDS,
    actionTypes: Object.freeze([
      "pass_restoration_reaction",
      "use_restoration_reaction",
    ]),
    slug: "medic-restoration-v2",
  }),
  Object.freeze({
    oldExecutorId: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
    newExecutorId: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_ID,
    newExecutorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_V2_EXECUTOR_VERSION,
    transitionSchema: OFFICIAL_OPTICAL_FLARE_RANGED_V2_TRANSITION_SCHEMA,
    atomIds: Object.freeze([]),
    actionTypes: Object.freeze([OFFICIAL_OPTICAL_FLARE_RANGED_V2_ACTION_TYPE]),
    slug: "optical-flare-ranged-v2",
  }),
]);
const MIGRATION_BY_ATOM_ID = new Map(MIGRATIONS.flatMap((migration) => (
  migration.atomIds.map((atomId) => [atomId, migration])
)));
export const OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS = Object.freeze([
  ...MIGRATION_BY_ATOM_ID.keys(),
].sort());

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
    fail("ACADEMY_MEDIC_V2_CONTRACT_ATOM_VERSION_INVALID");
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
    fail("ACADEMY_MEDIC_V2_CONTRACT_PREVIOUS_SLICE_INVALID");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(previousSlice.catalogue);
  const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: previousSlice.catalogue });
  const previousGraph = createRuleRelationshipGraphV1({
    catalogue: previousSlice.catalogue,
    extension: createOfficialRangedAttackV6RelationshipExtensionV1({
      catalogueHash: previousSlice.catalogueHash,
      runtimeHash: runtime.descriptor.runtimeHash,
    }),
  });
  if (catalogueAudit.counts.byDisposition.executable !== 421
    || runtime.descriptor.runtimeHash !== EXPECTED_PREVIOUS_RUNTIME_HASH
    || previousGraph.graphHash !== EXPECTED_PREVIOUS_GRAPH_HASH) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_PREVIOUS_RELEASE_DRIFT");
  }
}

function appendEvidence(evidence, atomId, migration) {
  const slug = atomId.replace(/^rule-atom:/u, `${migration.slug}:`);
  return {
    positiveFixtureIds: [...evidence.positiveFixtureIds,
      `${slug}:latest-official-legal-space-apply-success`],
    negativeFixtureIds: [...evidence.negativeFixtureIds,
      `${slug}:stale-action-source-drift-and-adapter-tamper-rejection`],
    interactionFixtureIds: [...evidence.interactionFixtureIds,
      `${slug}:academy-restoration-optical-ranged-composition`],
    lifecycleFixtureIds: [...evidence.lifecycleFixtureIds,
      `${slug}:status-marker-payment-usage-and-activation-lifecycle`],
    replayFixtureIds: [...evidence.replayFixtureIds,
      `${slug}:authority-ed25519-replay-after-hmac-rotation`],
    sourceDriftFixtureIds: [...evidence.sourceDriftFixtureIds,
      `${slug}:frozen-v1-and-live-official-71-69-48`],
  };
}

function reboundAtom(atom, migration) {
  return {
    ...clone(atom),
    atomVersion: nextMajor(atom.atomVersion),
    effect: {
      ...clone(atom.effect),
      executorId: migration.newExecutorId,
      transitionSchema: migration.transitionSchema,
    },
    rejectionCodes: [...new Set([
      ...atom.rejectionCodes,
      "ACADEMY_MEDIC_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
      "ACADEMY_MEDIC_DATA_ADAPTER_V2_RECEIPT_INVALID",
      "ACADEMY_MEDIC_V2_ACTION_STALE",
      "RESTORATION_V2_ACTION_STALE",
      "OPTICAL_FLARE_RANGED_V2_ACTION_STALE",
    ])].sort((left, right) => left.localeCompare(right)),
    evidence: appendEvidence(atom.evidence, atom.atomId, migration),
  };
}

function createCurrentCatalogue(previousCatalogue) {
  if (OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS.length !== 12
    || MIGRATION_BY_ATOM_ID.size !== 12) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const targetIds = new Set(OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS);
  const observed = [];
  const atoms = previousCatalogue.atoms.map((atom) => {
    if (!targetIds.has(atom.atomId)) return clone(atom);
    const migration = MIGRATION_BY_ATOM_ID.get(atom.atomId);
    if (atom.disposition !== "executable"
      || atom.effect?.executorId !== migration.oldExecutorId) {
      fail("ACADEMY_MEDIC_V2_CONTRACT_TARGET_ASSIGNMENT_INVALID", atom.atomId);
    }
    observed.push(atom.atomId);
    return reboundAtom(atom, migration);
  });
  if (!isDeepStrictEqual(observed.sort(), [...targetIds].sort())) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_TARGET_DENOMINATOR_MISMATCH");
  }
  const oldExecutorIds = new Set(MIGRATIONS.map((entry) => entry.oldExecutorId));
  const executorManifest = previousCatalogue.executorManifest
    .filter((entry) => !oldExecutorIds.has(entry.executorId))
    .map(clone);
  executorManifest.push(...MIGRATIONS.map((migration) => ({
    executorId: migration.newExecutorId,
    executorVersion: migration.newExecutorVersion,
    actionTypes: [...migration.actionTypes],
    transitionSchema: migration.transitionSchema,
  })));
  return createRuleAtomCatalogue({
    gameId: previousCatalogue.gameId,
    catalogueVersion: "0.62.0-official-current-academy-medic-v2",
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
    extension: createOfficialAcademyMedicV2RelationshipExtensionV1({
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
    || relationshipAudit.counts.declaredStateContractExecutors !== 34
    || relationshipAudit.counts.stateContractMissingExecutors !== 8
    || relationshipAudit.counts.blockingGaps !== 0
    || !isDeepStrictEqual(stateContractCoverage.counts, {
      executableAtoms: 421,
      strictCompleteAtoms: 372,
      partialContractAtoms: 4,
      noContractAtoms: 45,
      executors: 42,
      declaredStateContractExecutors: 34,
      missingStateContractExecutors: 8,
    })) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_EVIDENCE_INVALID", JSON.stringify({
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

export function createOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1(
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
    versionReassignedRuleAtomIds: [...OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS],
    contractEvidenceReboundRuleAtomIds: [...OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS],
    executableRuleAtomIds: catalogue.atoms
      .filter((atom) => atom.disposition === "executable")
      .map((atom) => atom.atomId),
    executorIds: MIGRATIONS.map((migration) => migration.newExecutorId),
    executableScope:
      "current_academy_medic_ability_restoration_and_optical_flare_ranged_v2",
    existingExecutorContractClosureProgress: {
      contractIds: MIGRATIONS.map((migration) => (
        `${migration.newExecutorId}@${migration.newExecutorVersion}`
      )),
      frozenV1ExecutorSourcesChanged: false,
      latestUnifiedOfficialDataRequired: true,
      explicitCurrentToFrozenSemanticKernelAdapterRequired: true,
      medpackAndOpticalFlareOfficialZeroCostCapabilitiesExposed: true,
      exactLegalSpaceAndActionDeclared: true,
      paymentStatusMarkerReactionDamageAndActivationWritesDeclared: true,
      supplyMissionScoreAndTerminalWritesProtected: true,
      judgeAndNegativeGapEvidenceDeclared: true,
      ed25519ReplayAfterHmacRotationRequired: true,
      strictCompleteAtomCountBefore: 288,
      strictCompleteAtomCountAfter: 372,
      partialContractAtomCountBefore: 79,
      partialContractAtomCountAfter: 4,
      noContractAtomCountBefore: 54,
      noContractAtomCountAfter: 45,
      declaredStateContractExecutorCountBefore: 31,
      declaredStateContractExecutorCountAfter: 34,
      stateContractMissingExecutorCountBefore: 11,
      stateContractMissingExecutorCountAfter: 8,
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
      academyMedicV2ContractComplete: true,
      restorationV2ContractComplete: true,
      opticalFlareRangedV2ContractComplete: true,
      historicalV1RuntimeAndRulesDisplayRetained: true,
      strictCompleteAtomCount: 372,
      partialContractAtomCount: 4,
      noContractAtomCount: 45,
      nonStrictAtomCount: 49,
      declaredStateContractExecutorCount: 34,
      stateContractMissingExecutorCount: 8,
      globalRelationshipCoverageComplete: false,
      derivedAuditIsRulesAuthority: false,
      productionEligible: false,
    },
    sliceForecast: {
      repairBatchOrdinal: 68,
      repairBatchOrdinalIsAtomIndex: false,
      completedBeforeThisSlice: 67,
      completedAfterThisSlice: 68,
      migratedExistingAtomCount: 12,
      newlyStrictAtomCount: 84,
      existingNonStrictAtomsBeforeThisSlice: 133,
      existingNonStrictAtomsAfterThisSlice: 49,
      remainingActionableAtomsBeforeThisSlice: 491,
      remainingActionableAtomsAfterThisSlice: 491,
      stateContractMissingExecutorsBeforeThisSlice: 11,
      stateContractMissingExecutorsAfterThisSlice: 8,
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
      frozenExecutorIds: MIGRATIONS.map((migration) => migration.oldExecutorId),
      replacementExecutorIds: MIGRATIONS.map((migration) => migration.newExecutorId),
      previousCatalogueMutationAllowed: false,
      previousExecutorSourceMutationAllowed: false,
      rulesRuntimeChanged: true,
      silentCompatibilityAllowed: false,
      historicalRuntimeStillSupported: true,
      historicalRulesDisplayRetained: true,
      actionSchemaVersion: "hybrid_legal_space_v25",
      previousActionSchemaVersion: "hybrid_legal_space_v24",
    },
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 8,
      crossTimeReplayResult:
        "current_academy_restoration_optical_v2_plus_frozen_v1_history_required",
      promotions: [],
      blocks: [
        "no_skill_generation_or_promotion_in_rule_executor_contract_slice",
        "remaining_eight_executor_contracts_open",
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
        "academy_restoration_optical_v2_authority_trace_only_browser_and_device_ui_pending",
      agentDecisionEvidence:
        "rules_owned_current_source_reaction_payment_status_range_damage_and_exact_action",
      memoryTraceEvidence: { refs: [], promotionAttempted: false },
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "official_source_adapter_payment_status_or_exact_action_drift_quarantines_v2",
        "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
      ],
      userVisibleChecks: [
        "Academy reaction reduces current Medic active ability CP without exhausting itself",
        "Restoration removes the exact Optical Flare debuff through a reaction window",
        "Optical Flare reduces Marine range to eight and disables long range",
      ],
    },
    rulesEligible: false,
    productionRoomEligible: false,
    trainingTruth: false,
    blocks: [
      "eight_existing_executor_contracts_remain",
      "forty_nine_existing_atoms_remain_non_strict",
      "four_hundred_ninety_one_actionable_atoms_remain_non_executable",
      "browser_device_agent_skill_selfplay_muzero_and_production_gates_pending",
    ],
  };
  const slice = { ...body, sliceHash: hashStarcraftTmgContract(body) };
  if (freezeRelease && slice.sliceHash !== EXPECTED_SLICE_HASH) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_SLICE_HASH_DRIFT", slice.sliceHash);
  }
  return freezeDeep(slice);
}

export function verifyOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1(
  input = {},
) {
  const slice = input.slice;
  if (!object(slice)
    || slice.schema !== SLICE_SCHEMA
    || slice.sliceHash !== EXPECTED_SLICE_HASH
    || hashStarcraftTmgContract(sliceBody(slice)) !== slice.sliceHash) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_SLICE_HASH_MISMATCH");
  }
  const expected = createOfficialExistingAcademyMedicV2ContractClosureRuleSliceV1({
    previousSlice: input.previousSlice,
  });
  if (!isDeepStrictEqual(slice, expected)
    || slice.newlyExecutableRuleAtomIds.length !== 0
    || !isDeepStrictEqual(
      slice.versionReassignedRuleAtomIds,
      [...OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS],
    )) {
    fail("ACADEMY_MEDIC_V2_CONTRACT_CONTENT_INVALID");
  }
  const evidence = buildEvidence(slice.catalogue, { freezeRelease: true });
  return freezeDeep({
    schema: "starcraft_tmg_official_existing_academy_medic_v2_contract_closure_audit_v1",
    valid: true,
    counts: {
      executableRuleAtoms: evidence.catalogueAudit.counts.byDisposition.executable,
      reviewRequiredRuleAtoms: evidence.catalogueAudit.counts.byDisposition.review_required,
      displayOnlyRuleAtoms: evidence.catalogueAudit.counts.byDisposition.display_only,
      changedAtoms: OFFICIAL_SLICE_68_MIGRATED_ATOM_IDS.length,
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
