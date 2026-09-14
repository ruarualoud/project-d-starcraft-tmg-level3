import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { createProviderProfile } from '../character-agent/contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacyBase } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as legacyCapacity } from '../../content/skill-generation/offline-provider-profile-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V3 as betaCapacity,
  DEEPSEEK_V41_FLASH_BETA_LOCAL_STOP_V1 as localStop, assertDeepSeekV41BetaWindowV1 } from '../../content/skill-generation/offline-provider-profile-v3.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../secure-provider-runtime/provider-profile-registry-v2.mjs';
import { verifyStarcraftTmgProviderCapabilityCurrentV1 } from '../structured-generation/provider-capability-receipt-v1.mjs';
import { seal, hash, verifySeal, fail } from '../skill-production/common.mjs';

const profileFields = ['provider', 'baseUrl', 'model', 'thinkingMode', 'reasoningEffort',
  'temperature', 'topP', 'contextBudget', 'toolSupport', 'timeoutMs', 'retryPolicy', 'fallbackPolicy'];
export const FACTION_BETA_BASE_PROFILE_V1 = createProviderProfile({
  ...Object.fromEntries(profileFields.map(key => [key, betaCapacity[key]])),
  providerProfileId: 'starcraft-tmg.offline-skill.deepseek-v4.1-flash-beta.base-v1',
  version: '2026.09.09-beta-base-4096.1', outputBudget: 4096,
});
export const factionProfileRefV1 = profile => ({id:profile.providerProfileId, version:profile.version, hash:profile.integrity.hash});
const pairs = [[legacyBase, FACTION_BETA_BASE_PROFILE_V1], [legacyCapacity, betaCapacity]];

// DeepSeek's Responses endpoint currently accepts the pinned public request
// name `deepseek-v4-flash` while returning the shorter canonical deployment
// name `deepseek-flash` in payload.model. Keep the raw reported value in every
// receipt, but compare it through this explicit, closed allowlist. A response
// can never choose its own alias and the retired beta keeps exact identity.
export const FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1 = seal({
  version: 'faction_provider_model_identity_v1',
  provider: 'deepseek-openai-compatible-direct',
  identities: [
    { requestedModel: legacyBase.model, reportedModels: [legacyBase.model, 'deepseek-flash'] },
    { requestedModel: betaCapacity.model, reportedModels: [betaCapacity.model] },
  ],
  rawReportedModelPreserved: true,
  unknownAliasesFailClosed: true,
  automaticAliasDiscovery: false,
  semanticAcceptanceInherited: false,
  trainingTruth: false,
});

export function factionProviderModelIdentityMatchesV1(receipt, expectedModel) {
  const identity = FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1.identities
    .find(row => row.requestedModel === expectedModel);
  return Boolean(identity && receipt?.requestedModel === expectedModel
    && identity.reportedModels.includes(receipt?.reportedModel));
}

// The recipe's original modelHash and capacity profile refs remain *legacy*
// context/lease anchors. This explicit execution policy governs NEW attempts.
// Old paid output is evaluated using its actual origin recipe, never this one.
export const FACTION_EXECUTION_MODEL_BINDING_V1 = seal({
  version: 'faction_execution_model_cutover_v1',
  source: 'explicit_user_request_2026_09_08_deepseek_v41_beta',
  model: betaCapacity.model, localStop,
  replacements: pairs.map(([before, after]) => ({before:factionProfileRefV1(before), after:factionProfileRefV1(after)})),
  legacyContextModelHashPreserved: true, legacyRoleInputBytesPreserved: true,
  newAttemptsUseReplacementOnly: true, inheritedArtifactsRequireActualOriginRecipe: true,
  capabilityReceiptMustMatchReplacement: true, ambiguousDeliveryRemainsIsolated: true,
  accountingReset: false, automaticRetry: false, silentFallback: false,
  semanticAcceptanceInherited: false, trainingTruth: false,
});

export function assertFactionExecutionModelBindingV1(binding) {
  if (verifySeal(binding).hash !== FACTION_EXECUTION_MODEL_BINDING_V1.hash) fail('FACTION_EXECUTION_MODEL_BINDING_INVALID');
  return binding;
}

export function factionExecutionProfileV1({ binding = null, legacyProfileRef = factionProfileRefV1(legacyBase) }) {
  const pair = pairs.find(([before]) => hash(factionProfileRefV1(before)) === hash(legacyProfileRef));
  if (!pair) fail('FACTION_EXECUTION_MODEL_LEGACY_PROFILE_UNKNOWN');
  if (binding) assertFactionExecutionModelBindingV1(binding);
  return binding ? pair[1] : pair[0];
}

export function factionExecutionEgressV1(profile) {
  return createStarcraftTmgProviderProfileRegistryV2({entries:[{providerProfile:profile,responsePath:'/responses'}]})
    .resolveEgressBinding({profileRef:factionProfileRefV1(profile)}).egressBinding;
}

export function assertFactionExecutionEgressV1({binding, legacyProfileRef, egressBinding}) {
  const profile = factionExecutionProfileV1({binding,legacyProfileRef});
  if (hash(egressBinding) !== hash(factionExecutionEgressV1(profile))) fail('FACTION_EXECUTION_MODEL_EGRESS_MISMATCH');
  return profile;
}

export function verifyFactionLegacyExecutionModelReceiptV1({binding,receipt,verifiedHistoricalOrigin=false}) {
  assertFactionExecutionModelBindingV1(binding);
  const profile = factionExecutionProfileV1({binding:verifiedHistoricalOrigin?null:binding});
  const {receiptHash,...body}=receipt || {};
  if (receiptHash!==hash(body) || receipt.status!==200
    || !factionProviderModelIdentityMatchesV1(receipt, profile.model)
    || hash(receipt.providerProfileRef)!==hash(factionProfileRefV1(profile)))
    fail('FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH');
}

export function estimateFactionBetaUsageCnyMicrosV1(usage) {
  if (!usage || ![usage.inputUnits,usage.outputUnits,usage.totalUnits].every(n=>Number.isSafeInteger(n)&&n>=0)
    || usage.totalUnits<usage.inputUnits+usage.outputUnits) fail('FACTION_EXECUTION_MODEL_USAGE_INVALID');
  // Conservative current Flash peak CNY estimate, not a beta tariff/invoice.
  return Math.ceil(usage.inputUnits*3+usage.outputUnits*9);
}

export const FACTION_EXECUTION_MODEL_FILES_V1 = Object.freeze([
  'content/skill-generation/offline-provider-profile-v3.mjs',
  'packages/skill-production-v3/faction-execution-model-v1.mjs',
  'packages/skill-production-v3/faction-native-output-capacity-v2.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-production-v3/faction-command-envelope-v1.mjs',
  'packages/skill-production/model.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-faction-execution-model-v1.mjs',
  'scripts/verify-ticket-18-faction-model-cutover-wiring-v1.mjs',
]);

export function verifyFactionExecutionModelMigrationV1({parent,next,readiness}) {
  if (!parent.executionModelBinding && !next.executionModelBinding) {
    if (readiness || next.executionModelReadinessHash) fail('FACTION_EXECUTION_MODEL_MIGRATION_UNSCOPED');
    return null;
  }
  assertFactionExecutionModelBindingV1(next.executionModelBinding);
  if(parent.executionModelBinding) assertFactionExecutionModelBindingV1(parent.executionModelBinding);
  verifySeal(readiness);
  if (!readiness.passed || readiness.bindingHash!==next.executionModelBinding.hash
    || readiness.hash!==next.executionModelReadinessHash || readiness.providerCalls!==0
    || readiness.actualDshSessions!==2 || !readiness.independentConsumerPassed
    || !readiness.legacyArtifactBytePreserved || !readiness.legacyBridgeVerified
    || hash(readiness.codeHashes.map(r=>r.file).sort())!==hash([...FACTION_EXECUTION_MODEL_FILES_V1].sort())
    || parent.modelHash!==next.modelHash || parent.contextHash!==next.contextHash
    || parent.dshBindingHash!==next.dshBindingHash || hash(parent.sourceBinding)!==hash(next.sourceBinding)
    || hash(parent.inputHashes)!==hash(next.inputHashes) || !factionLimitsCompatibleV1(parent, next)
    || hash(parent.nativeOutputCapacityBinding)!==hash(next.nativeOutputCapacityBinding))
    fail('FACTION_EXECUTION_MODEL_MIGRATION_INVALID');
  for(const row of readiness.codeHashes) if(next.codeHashes.find(r=>r.file===row.file)?.hash!==row.hash)
    fail('FACTION_EXECUTION_MODEL_MIGRATION_CODE_DRIFT');
  return seal({version:'faction_execution_model_migration_v1',bindingHash:next.executionModelBinding.hash,
    readinessHash:readiness.hash,files:readiness.codeHashes.map(r=>r.file),legacyModelHash:parent.modelHash,
    noAttemptCopy:true,accountingReset:false,trainingTruth:false});
}

export function assertFactionExecutionModelNewSendV1(binding, now) {
  assertFactionExecutionModelBindingV1(binding);
  // Supply a typed definite-not-sent receipt when the local beta window ends.
  try { assertDeepSeekV41BetaWindowV1(now); }
  catch (error) { error.safeReceipt = {requestDefinitelyNotSent:true,requestMayHaveBeenSent:false,physicalAttempts:0}; throw error; }
}

export function verifyFactionExecutionModelReceiptV1({receipt, ownerRecipe, capability = null, legacyProfileRef}) {
  const binding = ownerRecipe?.executionModelBinding || null;
  const profile = factionExecutionProfileV1({binding,legacyProfileRef});
  const {receiptHash, ...body} = receipt || {};
  if (receiptHash !== hash(body) || !factionProviderModelIdentityMatchesV1(receipt, profile.model))
    fail('FACTION_EXECUTION_MODEL_RECEIPT_MISMATCH');
  if (binding) {
    // A receipt is not allowed to select its own model policy. The caller must
    // obtain ownerRecipe from the independently verified paid-attempt lineage.
    verifySeal(ownerRecipe);
    if (!capability || capability.receiptHash !== receipt.capabilityReceiptHash
      || !verifyStarcraftTmgProviderCapabilityCurrentV1({receipt:capability,
        providerProfileRef:factionProfileRefV1(profile), endpointPath:'/responses', endpointDialect:'deepseek_responses_v1',
        model:profile.model, capability:'responses_json_schema', outputContractRef:receipt.outputContractRef,
        now:receipt.startedAt}).ok) fail('FACTION_EXECUTION_MODEL_CAPABILITY_MISMATCH');
    // localStop is an egress policy enforced by
    // assertFactionExecutionModelNewSendV1 before every new physical send.
    // An authenticated historical receipt must remain replayable after that
    // date; otherwise time alone would corrupt frozen production evidence.
  }
  return profile;
}
