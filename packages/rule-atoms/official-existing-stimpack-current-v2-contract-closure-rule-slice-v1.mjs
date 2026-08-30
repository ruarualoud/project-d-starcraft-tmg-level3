import {
  createOfficialExistingExecutorContractClosureSliceV1,
  verifyOfficialExistingExecutorContractClosureSliceV1,
} from "./official-existing-executor-contract-closure-factory-v1.mjs";
import { createOfficialSpecialistV2RelationshipExtensionV1 } from
  "./official-specialist-v2-relationship-contract-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
} from "./official-marine-stimpack-active-executor-v1.mjs";
import {
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_OWNED_ATOM_IDS,
  OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_TRANSITION_SCHEMA,
} from "./official-marine-stimpack-active-executor-v3.mjs";
import {
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
} from "./official-stimpack-ranged-consumer-executor-v1.mjs";
import {
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
  OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_RANGED_V2_OWNED_ATOM_IDS,
  OFFICIAL_STIMPACK_RANGED_V2_TRANSITION_SCHEMA,
} from "./official-stimpack-ranged-consumer-executor-v2.mjs";
import { createOfficialStimpackCurrentV2RelationshipExtensionV1 } from
  "./official-stimpack-current-v2-relationship-contract-v1.mjs";

const CONFIG = Object.freeze({
  codePrefix: "STIMPACK_CURRENT_V2_CONTRACT",
  sliceSchema: "starcraft_tmg_official_existing_stimpack_current_v2_contract_closure_rule_slice_v1",
  auditSchema: "starcraft_tmg_official_existing_stimpack_current_v2_contract_closure_audit_v1",
  previousSliceSchema: "starcraft_tmg_official_existing_specialist_v2_contract_closure_rule_slice_v1",
  previousSliceHash: "c2e48a0d54a443abe47f0a29f95ef7d2496b220b4ed6c3542855bb2c6d2364d0",
  previousCatalogueHash: "aaf2e78b1da4677a41b08192a88a2afe03038a1d8f7be15778323fc7578a7ff7",
  previousRuntimeHash: "1ca94b751948b8ae21a46f519177433327b1b18cd1065ef14323b38ffbbaa6e6",
  previousGraphHash: "dd3ada1f3c9066dc7110b6220d386464a2d4cc748287b273197460e0def992f0",
  expectedSliceHash: "0e2be19c977a0bb9c71a66c79bb1876d9d004c15a2fdceb2ebea5136a0b54671",
  expectedCatalogueHash: "ae8062993105f2fa421e6495343145151104fafb1c35618d7819e03fc2d1b1a3",
  expectedRuntimeHash: "5365803f73cc500f3c39089fdeae592e620cdd980e3c59b38134cb28ea87a33d",
  expectedGraphHash: "90f30593ecce682155649e7eabe467449afa81324c0dd481c13629edeb8503ff",
  previousRelationshipExtension: createOfficialSpecialistV2RelationshipExtensionV1,
  currentRelationshipExtension: createOfficialStimpackCurrentV2RelationshipExtensionV1,
  catalogueVersion: "0.68.0-official-current-stimpack-v2",
  executableScope: "current_stimpack_active_precision_and_later_standard_damage",
  contractGroup: "stimpack_active_and_ranged_current_v2",
  expectedMigratedAtomCount: 4,
  migrations: Object.freeze([
    Object.freeze({
      fromExecutorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_EXECUTOR_ID,
      toExecutorId: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID,
      toExecutorVersion: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION,
      actionTypes: Object.freeze([OFFICIAL_MARINE_STIMPACK_ACTIVE_ACTION_TYPE]),
      transitionSchema: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_TRANSITION_SCHEMA,
      atomIds: OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_OWNED_ATOM_IDS,
      evidenceSlug: "stimpack-active-v3",
      rejectionCodes: Object.freeze([
        "STIMPACK_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED",
        "STIMPACK_ACTIVE_V3_ACTION_STALE",
      ]),
    }),
    Object.freeze({
      fromExecutorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
      toExecutorId: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID,
      toExecutorVersion: OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION,
      actionTypes: Object.freeze([
        OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
        OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
      ].sort()),
      transitionSchema: OFFICIAL_STIMPACK_RANGED_V2_TRANSITION_SCHEMA,
      atomIds: OFFICIAL_STIMPACK_RANGED_V2_OWNED_ATOM_IDS,
      evidenceSlug: "stimpack-ranged-v2",
      rejectionCodes: Object.freeze([
        "STIMPACK_DATA_ADAPTER_V2_RECEIPT_INVALID",
        "STIMPACK_RANGED_V2_ACTION_STALE",
      ]),
    }),
  ]),
  expectedCoverage: Object.freeze({ strictCompleteAtoms: 421,
    partialContractAtoms: 0, noContractAtoms: 0,
    declaredStateContractExecutors: 42, missingStateContractExecutors: 0 }),
  contractProgress: Object.freeze({
    contractIds: Object.freeze([
      `${OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_ID}@${OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_EXECUTOR_VERSION}`,
      `${OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_ID}@${OFFICIAL_STIMPACK_RANGED_V2_EXECUTOR_VERSION}`,
    ]),
    frozenV1ExecutorSourcesChanged: false,
    latestUnifiedOfficialDataRequired: true,
    activeBeforeAndAfterWindowsRequired: true,
    precisionPendingAndLaterStandardDamageRequired: true,
    ed25519ReplayAfterHmacRotationRequired: true,
    strictCompleteAtomCountBefore: 417,
    strictCompleteAtomCountAfter: 421,
    partialContractAtomCountBefore: 4,
    partialContractAtomCountAfter: 0,
    noContractAtomCountBefore: 0,
    noContractAtomCountAfter: 0,
    declaredStateContractExecutorCountBefore: 40,
    declaredStateContractExecutorCountAfter: 42,
    stateContractMissingExecutorCountBefore: 2,
    stateContractMissingExecutorCountAfter: 0,
  }),
  sliceForecast: Object.freeze({ repairBatchOrdinal: 74,
    repairBatchOrdinalIsAtomIndex: false, completedBeforeThisSlice: 73,
    completedAfterThisSlice: 74, migratedExistingAtomCount: 4,
    newlyStrictAtomCount: 4, existingNonStrictAtomsBeforeThisSlice: 4,
    existingNonStrictAtomsAfterThisSlice: 0,
    remainingActionableAtomsBeforeThisSlice: 491,
    remainingActionableAtomsAfterThisSlice: 491,
    stateContractMissingExecutorsBeforeThisSlice: 2,
    stateContractMissingExecutorsAfterThisSlice: 0,
    atomPromotionSlice: false, executorVersionCorrectionSlice: true,
    contractClosureSlice: true, atomDenominatorIsAuthoritative: true }),
  judgeTestsRun: 12,
  crossTimeReplayResult: "current_stimpack_v2_plus_frozen_v1_history_required",
  uiTraceEvidence: "stimpack_current_authority_trace_only_browser_and_device_ui_pending",
  agentDecisionEvidence: "rules_owned_active_window_precision_choice_and_damage_lifecycle",
  rollbackOrDemotionRules: Object.freeze([
    "official_source_adapter_status_damage_or_exact_action_drift_quarantines_current_stimpack",
    "replay_signature_relationship_or_historical_display_failure_demotes_runtime",
  ]),
  userVisibleChecks: Object.freeze([
    "Stimpack may be used before or after the Movement Hold action",
    "Precision exposes every legal failed-die conversion subset",
    "later positive standard damage combines with prior non-lethal damage",
  ]),
});

export const OFFICIAL_SLICE_74_MIGRATED_ATOM_IDS = Object.freeze([
  ...OFFICIAL_MARINE_STIMPACK_ACTIVE_V3_OWNED_ATOM_IDS,
  ...OFFICIAL_STIMPACK_RANGED_V2_OWNED_ATOM_IDS,
].sort((left, right) => left.localeCompare(right)));
export function createOfficialExistingStimpackCurrentV2ContractClosureRuleSliceV1(input = {}) {
  return createOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}
export function verifyOfficialExistingStimpackCurrentV2ContractClosureRuleSliceV1(input = {}) {
  return verifyOfficialExistingExecutorContractClosureSliceV1(CONFIG, input);
}
