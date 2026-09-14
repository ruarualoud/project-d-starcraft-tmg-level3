import { seal, verifySeal, hash, fail } from '../skill-production/common.mjs';
import { createAccountedModel } from '../skill-production/model.mjs';
import { openReadOnlyProductionReplayV1 } from './read-only-production-replay-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacyProfile }
  from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { factionProfileRefV1, estimateFactionBetaUsageCnyMicrosV1,
  factionProviderModelIdentityMatchesV1, FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1 }
  from '../skill-production-v3/faction-execution-model-v1.mjs';
import { selectFactionExecutionModelV1, FACTION_MODEL_LIFECYCLE_BINDING_V1 }
  from '../skill-production-v3/faction-model-lifecycle-v1.mjs';
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 } from '../secure-provider-runtime/provider-pricing-v1.mjs';

const version = 'faction_consumer_execution_binding_v1';
const invalid = suffix => fail('FACTION_CONSUMER_EXECUTION_' + suffix);

// Selection is frozen in the consumer recipe. Later readers reconstruct that
// selection at its recorded time, never reinterpret an old receipt as today's
// preferred model. This covers the declared local beta cutoff; authenticated
// provider retirement needs a separately journaled transition, not a 403 retry.
export function selectFactionConsumerExecutionV1({ now = new Date().toISOString() } = {}) {
  const selected = selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
    legacyProfileRef: factionProfileRefV1(legacyProfile), now });
  return { profile: selected.profile, binding: seal({ version,
    lifecycleBindingHash: FACTION_MODEL_LIFECYCLE_BINDING_V1.hash,
    modelIdentityBindingHash: FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1.hash,
    decision: selected.decision, profileRef: factionProfileRefV1(selected.profile),
    fullConsumerRequestPreserved: true, automaticTransportRetries: 0,
    outputQualityDoesNotSelectModel: true, trainingTruth: false }) };
}

export function factionConsumerExecutionOptionsV1(recipe) {
  verifySeal(recipe);
  if (!recipe.consumerExecutionBinding) {
    if (recipe.modelHash !== legacyProfile.integrity.hash) invalid('UNBOUND_MODEL');
    return { profile: legacyProfile, modelOptions: {} };
  }
  const binding = verifySeal(recipe.consumerExecutionBinding);
  const cutoff = Date.parse(FACTION_MODEL_LIFECYCLE_BINDING_V1.localStop);
  // Stable across restarts within a model window; wall-clock instants must not
  // create a new paid recipe every time --preflight/--live is run.
  const selected = selectFactionConsumerExecutionV1({ now: new Date(binding.decision.selection === 'beta' ? cutoff - 1 : cutoff).toISOString() });
  const { hash: ignoredSelectedHash, modelIdentityBindingHash: ignoredIdentityHash, ...selectedWithoutIdentity } = selected.binding;
  const legacyBinding = seal(selectedWithoutIdentity);
  if (![selected.binding.hash, legacyBinding.hash].includes(binding.hash)
    || binding.modelIdentityBindingHash && binding.modelIdentityBindingHash !== FACTION_PROVIDER_MODEL_IDENTITY_BINDING_V1.hash
    || recipe.modelHash !== selected.profile.integrity.hash) invalid('BINDING');
  const validateModelReceipt = receipt => {
    const { receiptHash, ...body } = receipt || {};
    if (receiptHash !== hash(body) || receipt.status !== 200
      || hash(receipt.providerProfileRef) !== hash(binding.profileRef)
      || !factionProviderModelIdentityMatchesV1(receipt, selected.profile.model)
      || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
      || !Number.isFinite(Date.parse(receipt.startedAt)))
      invalid('RECEIPT');
    if (binding.decision.selection === 'beta'
      && Date.parse(receipt.startedAt) >= Date.parse(FACTION_MODEL_LIFECYCLE_BINDING_V1.localStop)) invalid('BETA_WINDOW');
    if (binding.decision.selection === 'stable_fallback' && Date.parse(receipt.startedAt) < cutoff) invalid('FALLBACK_WINDOW');
  };
  const priceUsage = (usage, receipt) => {
    if (!factionProviderModelIdentityMatchesV1(receipt, selected.profile.model)) return null;
    if (binding.decision.selection === 'beta') return estimateFactionBetaUsageCnyMicrosV1(usage);
    try {
      // Pricing selects the requested public SKU; the raw provider deployment
      // alias remains unchanged in the durable transport receipt.
      const result = priceStarcraftTmgDeepSeekV4FlashUsageV1({ providerId: 'deepseek-openai-compatible-direct',
        requestedModel: receipt.requestedModel, reportedModel: selected.profile.model,
        startedAt: receipt.startedAt || receipt.receivedAt, usage });
      return Math.ceil(result.calculatedCostNanoUsd * 8 / 1000);
    } catch { return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1320) * 8 / 1000); }
  };
  const beforeNewSend = (now = new Date().toISOString()) => {
    if (binding.decision.selection === 'beta' && Date.parse(now) >= Date.parse(FACTION_MODEL_LIFECYCLE_BINDING_V1.localStop)) {
      const error = new Error('Consumer beta window closed before dispatch'); error.code = 'FACTION_CONSUMER_EXECUTION_BETA_WINDOW';
      error.safeReceipt = { requestDefinitelyNotSent: true, requestMayHaveBeenSent: false, physicalAttempts: 0 };
      throw error;
    }
  };
  return { profile: selected.profile, modelOptions: { validateModelReceipt, priceUsage }, beforeNewSend };
}

export function openFactionConsumerExecutionReplayV1({ filename, runId, recipe }) {
  // Legacy V1 replay keeps its original recipe/receipt contract unchanged.
  if (!recipe.consumerExecutionBinding) return openReadOnlyProductionReplayV1({ filename, runId, recipe });
  const options = factionConsumerExecutionOptionsV1(recipe);
  const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe });
  return Object.freeze({ ...replay, model: createAccountedModel({ store: replay.store,
    commandPolicy: 'finish_only', maxInputBytes: recipe.limits.maxInputBytes, outputRecoveryLimit: 4096,
    ...options.modelOptions, complete() { fail('FACTION_CONSUMER_EXECUTION_READ_ONLY'); } }) });
}
