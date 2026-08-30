import {
  createOfficialExistingExecutorContractClosureSliceV1,
  verifyOfficialExistingExecutorContractClosureSliceV1,
} from "./official-existing-executor-contract-closure-factory-v1.mjs";
import { createOfficialCombatTagShieldedV2RelationshipExtensionV1 } from
  "./official-combat-tag-shielded-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
} from "./official-sidearm-pinpoint-ranged-batch-executor-v1.mjs";
import {
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_NEW_ATOM_IDS,
  OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_TRANSITION_SCHEMA,
} from "./official-sidearm-pinpoint-ranged-batch-executor-v2.mjs";
import { createOfficialSidearmPinpointV2RelationshipExtensionV1 } from
  "./official-sidearm-pinpoint-v2-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  codePrefix: "SIDEARM_PINPOINT_V2_CONTRACT",
  sliceSchema:
    "starcraft_tmg_official_existing_sidearm_pinpoint_v2_contract_closure_rule_slice_v1",
  auditSchema:
    "starcraft_tmg_official_existing_sidearm_pinpoint_v2_contract_closure_audit_v1",
  previousSliceSchema:
    "starcraft_tmg_official_existing_combat_tag_shielded_v2_contract_closure_rule_slice_v1",
  previousSliceHash:
    "4d162039d5d33d453b89cb487e4b0b7372fb2a92e374c821534d3a744165b711",
  previousCatalogueHash:
    "f6684fd9e57801970677a4885488abba0faaa65b5d0d0b3ffa79794f932a5b08",
  previousRuntimeHash:
    "fe8427b55b74ebb99bd40ab6517f35ff85e2194040f76e4049c4d8116f673b00",
  previousGraphHash:
    "816589172c143eb495b946fe5d3265ada700f00541f87cd2b4500d70386581a5",
  expectedSliceHash:
    "fb46708820b09e553b29bde671f1bf72c09758b6be398d0b910239bc4e8b98d7",
  expectedCatalogueHash:
    "f23e886978170925d2861a3362c9bc1e0b21904c5072ed154d9d803a81033768",
  expectedRuntimeHash:
    "7a5431f81b5a2917d26d1f8646ab5c9253063d0562ab4b27f7909f0ae4a39b0e",
  expectedGraphHash:
    "897770f75295da341cfa732df49011a093a681e523f8df5ff942e006a4037349",
  previousRelationshipExtension: createOfficialCombatTagShieldedV2RelationshipExtensionV1,
  currentRelationshipExtension: createOfficialSidearmPinpointV2RelationshipExtensionV1,
  catalogueVersion: "0.66.0-official-current-sidearm-pinpoint-v2",
  executableScope: "current_sidearm_pinpoint_ranged_batch_v2",
  contractGroup: "sidearm_pinpoint_ranged_batch_v2",
  expectedMigratedAtomCount: 6,
  migrations: Object.freeze([Object.freeze({
    fromExecutorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_EXECUTOR_ID,
    toExecutorId: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID,
    toExecutorVersion: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION,
    actionTypes: Object.freeze([OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_ACTION_TYPE]),
    transitionSchema: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_TRANSITION_SCHEMA,
    atomIds: OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_NEW_ATOM_IDS,
    evidenceSlug: "sidearm-pinpoint-v2",
    rejectionCodes: Object.freeze([
      "SIDEARM_PINPOINT_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
      "SIDEARM_PINPOINT_DATA_ADAPTER_V2_RECEIPT_INVALID",
      "SIDEARM_PINPOINT_V2_ACTION_STALE",
    ]),
  })]),
  expectedCoverage: Object.freeze({
    strictCompleteAtoms: 407,
    partialContractAtoms: 9,
    noContractAtoms: 5,
    declaredStateContractExecutors: 38,
    missingStateContractExecutors: 4,
  }),
  contractProgress: Object.freeze({
    contractId:
      `${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_ID}`
        + `@${OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_EXECUTOR_VERSION}`,
    frozenV1ExecutorSourceChanged: false,
    latestUnifiedOfficialDataRequired: true,
    explicitCurrentToFrozenSemanticKernelAdapterRequired: true,
    legalCandidateCount: 20,
    exactSevenProfileSubsetsRequired: true,
    pinpointEngagedTargetOverrideDeclared: true,
    independentSidearmBatchSequenceDeclared: true,
    sourceMissionScoreStatusLoadoutAndTerminalWritesProtected: true,
    judgeAndNegativeGapEvidenceDeclared: true,
    ed25519ReplayAfterHmacRotationRequired: true,
    strictCompleteAtomCountBefore: 401,
    strictCompleteAtomCountAfter: 407,
    partialContractAtomCountBefore: 15,
    partialContractAtomCountAfter: 9,
    noContractAtomCountBefore: 5,
    noContractAtomCountAfter: 5,
    declaredStateContractExecutorCountBefore: 37,
    declaredStateContractExecutorCountAfter: 38,
    stateContractMissingExecutorCountBefore: 5,
    stateContractMissingExecutorCountAfter: 4,
  }),
  sliceForecast: Object.freeze({
    repairBatchOrdinal: 72,
    repairBatchOrdinalIsAtomIndex: false,
    completedBeforeThisSlice: 71,
    completedAfterThisSlice: 72,
    migratedExistingAtomCount: 6,
    newlyStrictAtomCount: 6,
    existingNonStrictAtomsBeforeThisSlice: 20,
    existingNonStrictAtomsAfterThisSlice: 14,
    remainingActionableAtomsBeforeThisSlice: 491,
    remainingActionableAtomsAfterThisSlice: 491,
    stateContractMissingExecutorsBeforeThisSlice: 5,
    stateContractMissingExecutorsAfterThisSlice: 4,
    atomPromotionSlice: false,
    executorVersionCorrectionSlice: true,
    contractClosureSlice: true,
    atomDenominatorIsAuthoritative: true,
  }),
  judgeTestsRun: 8,
  crossTimeReplayResult: "current_sidearm_pinpoint_v2_plus_frozen_v1_history_required",
  uiTraceEvidence:
    "sidearm_pinpoint_v2_authority_trace_only_browser_and_device_ui_pending",
  agentDecisionEvidence:
    "rules_owned_profile_subset_pinpoint_target_and_exact_batch_sequence",
  rollbackOrDemotionRules: Object.freeze([
    "official_source_adapter_targeting_sequence_or_exact_action_drift_quarantines_v2",
    "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
  ]),
  userVisibleChecks: Object.freeze([
    "Goliath exposes 20 exact batches across seven profile subsets",
    "Pinpoint Underbelly targets only the engaged Marine",
    "each Sidearm resolves as an independent batch",
  ]),
});

export const OFFICIAL_SLICE_72_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_SIDEARM_PINPOINT_RANGED_BATCH_V2_NEW_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));

export function createOfficialExistingSidearmPinpointV2ContractClosureRuleSliceV1(
  input = {},
) {
  return createOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}

export function verifyOfficialExistingSidearmPinpointV2ContractClosureRuleSliceV1(
  input = {},
) {
  return verifyOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}
