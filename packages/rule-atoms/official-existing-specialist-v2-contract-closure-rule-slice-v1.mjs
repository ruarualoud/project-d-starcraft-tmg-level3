import {
  createOfficialExistingExecutorContractClosureSliceV1,
  verifyOfficialExistingExecutorContractClosureSliceV1,
} from "./official-existing-executor-contract-closure-factory-v1.mjs";
import { createOfficialSidearmPinpointV2RelationshipExtensionV1 } from
  "./official-sidearm-pinpoint-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
} from "./official-specialist-loadout-executor-v1.mjs";
import {
  OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_LOADOUT_V2_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_V2_TRANSITION_SCHEMA,
} from "./official-specialist-loadout-executor-v2.mjs";
import {
  OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
} from "./official-specialist-ranged-batch-executor-v1.mjs";
import {
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_RANGED_BATCH_V2_TRANSITION_SCHEMA,
} from "./official-specialist-ranged-batch-executor-v2.mjs";
import { createOfficialSpecialistV2RelationshipExtensionV1 } from
  "./official-specialist-v2-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  codePrefix: "SPECIALIST_V2_CONTRACT",
  sliceSchema:
    "starcraft_tmg_official_existing_specialist_v2_contract_closure_rule_slice_v1",
  auditSchema:
    "starcraft_tmg_official_existing_specialist_v2_contract_closure_audit_v1",
  previousSliceSchema:
    "starcraft_tmg_official_existing_sidearm_pinpoint_v2_contract_closure_rule_slice_v1",
  previousSliceHash:
    "fb46708820b09e553b29bde671f1bf72c09758b6be398d0b910239bc4e8b98d7",
  previousCatalogueHash:
    "f23e886978170925d2861a3362c9bc1e0b21904c5072ed154d9d803a81033768",
  previousRuntimeHash:
    "7a5431f81b5a2917d26d1f8646ab5c9253063d0562ab4b27f7909f0ae4a39b0e",
  previousGraphHash:
    "897770f75295da341cfa732df49011a093a681e523f8df5ff942e006a4037349",
  expectedSliceHash:
    "c2e48a0d54a443abe47f0a29f95ef7d2496b220b4ed6c3542855bb2c6d2364d0",
  expectedCatalogueHash:
    "aaf2e78b1da4677a41b08192a88a2afe03038a1d8f7be15778323fc7578a7ff7",
  expectedRuntimeHash:
    "1ca94b751948b8ae21a46f519177433327b1b18cd1065ef14323b38ffbbaa6e6",
  expectedGraphHash:
    "dd3ada1f3c9066dc7110b6220d386464a2d4cc748287b273197460e0def992f0",
  previousRelationshipExtension: createOfficialSidearmPinpointV2RelationshipExtensionV1,
  currentRelationshipExtension: createOfficialSpecialistV2RelationshipExtensionV1,
  catalogueVersion: "0.67.0-official-current-specialist-v2",
  executableScope: "current_specialist_loadout_and_sequential_ranged_batch_v2",
  contractGroup: "specialist_loadout_and_ranged_batch_v2",
  expectedMigratedAtomCount: 10,
  migrations: Object.freeze([
    Object.freeze({
      fromExecutorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
      toExecutorId: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID,
      toExecutorVersion: OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION,
      actionTypes: Object.freeze([OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE]),
      transitionSchema: OFFICIAL_SPECIALIST_LOADOUT_V2_TRANSITION_SCHEMA,
      atomIds: OFFICIAL_SPECIALIST_LOADOUT_V2_NEW_ATOM_IDS,
      evidenceSlug: "specialist-loadout-v2",
      rejectionCodes: Object.freeze([
        "SPECIALIST_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
        "SPECIALIST_LOADOUT_V2_PARAMETER_DOMAIN_STALE",
        "SPECIALIST_LOADOUT_V2_ACTION_STALE",
      ]),
    }),
    Object.freeze({
      fromExecutorId: OFFICIAL_SPECIALIST_RANGED_BATCH_EXECUTOR_ID,
      toExecutorId: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID,
      toExecutorVersion: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION,
      actionTypes: Object.freeze([OFFICIAL_SPECIALIST_RANGED_BATCH_ACTION_TYPE]),
      transitionSchema: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_TRANSITION_SCHEMA,
      atomIds: OFFICIAL_SPECIALIST_RANGED_BATCH_V2_NEW_ATOM_IDS,
      evidenceSlug: "specialist-ranged-batch-v2",
      rejectionCodes: Object.freeze([
        "SPECIALIST_DATA_ADAPTER_V2_RECEIPT_INVALID",
        "SPECIALIST_RANGED_BATCH_V2_ACTION_STALE",
      ]),
    }),
  ]),
  expectedCoverage: Object.freeze({
    strictCompleteAtoms: 417,
    partialContractAtoms: 4,
    noContractAtoms: 0,
    declaredStateContractExecutors: 40,
    missingStateContractExecutors: 2,
  }),
  contractProgress: Object.freeze({
    contractIds: Object.freeze([
      `${OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID}@${OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_VERSION}`,
      `${OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID}@${OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_VERSION}`,
    ]),
    frozenV1ExecutorSourcesChanged: false,
    latestUnifiedOfficialDataRequired: true,
    explicitLoadoutSealTranslationRequired: true,
    parameterDomainAndFourCandidateBattleContractRequired: true,
    pendingSequenceLoadoutSealConsistencyRequired: true,
    judgeAndNegativeGapEvidenceDeclared: true,
    ed25519ReplayAfterHmacRotationRequired: true,
    strictCompleteAtomCountBefore: 407,
    strictCompleteAtomCountAfter: 417,
    partialContractAtomCountBefore: 9,
    partialContractAtomCountAfter: 4,
    noContractAtomCountBefore: 5,
    noContractAtomCountAfter: 0,
    declaredStateContractExecutorCountBefore: 38,
    declaredStateContractExecutorCountAfter: 40,
    stateContractMissingExecutorCountBefore: 4,
    stateContractMissingExecutorCountAfter: 2,
  }),
  sliceForecast: Object.freeze({
    repairBatchOrdinal: 73,
    repairBatchOrdinalIsAtomIndex: false,
    completedBeforeThisSlice: 72,
    completedAfterThisSlice: 73,
    migratedExistingAtomCount: 10,
    newlyStrictAtomCount: 10,
    existingNonStrictAtomsBeforeThisSlice: 14,
    existingNonStrictAtomsAfterThisSlice: 4,
    remainingActionableAtomsBeforeThisSlice: 491,
    remainingActionableAtomsAfterThisSlice: 491,
    stateContractMissingExecutorsBeforeThisSlice: 4,
    stateContractMissingExecutorsAfterThisSlice: 2,
    atomPromotionSlice: false,
    executorVersionCorrectionSlice: true,
    contractClosureSlice: true,
    atomDenominatorIsAuthoritative: true,
  }),
  judgeTestsRun: 12,
  crossTimeReplayResult: "current_specialist_v2_plus_frozen_v1_history_required",
  uiTraceEvidence:
    "specialist_v2_authority_trace_only_browser_and_device_ui_pending",
  agentDecisionEvidence:
    "rules_owned_specialist_assignment_profile_batch_target_and_sequence",
  rollbackOrDemotionRules: Object.freeze([
    "official_source_adapter_loadout_seal_or_exact_action_drift_quarantines_v2",
    "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
  ]),
  userVisibleChecks: Object.freeze([
    "Marine Specialist assignments are sealed against the current official bundle",
    "C-14 and AGG-12 resolve as separate sequential batches",
    "pending sequence retains an exact loadout seal across the adapter boundary",
  ]),
});

export const OFFICIAL_SLICE_73_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_SPECIALIST_LOADOUT_V2_NEW_ATOM_IDS,
  ...OFFICIAL_SPECIALIST_RANGED_BATCH_V2_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

export function createOfficialExistingSpecialistV2ContractClosureRuleSliceV1(
  input = {},
) {
  return createOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}

export function verifyOfficialExistingSpecialistV2ContractClosureRuleSliceV1(
  input = {},
) {
  return verifyOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}
