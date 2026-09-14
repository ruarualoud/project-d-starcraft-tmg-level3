import { randomUUID } from 'node:crypto';
import { createStarcraftTmgProviderProfileRegistryV2 }
  from '../../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgStructuredProviderWorkerPortV1 }
  from '../../packages/secure-provider-runtime/structured-provider-worker-port-v1.mjs';
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 }
  from '../../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs';
import { priceStarcraftTmgDeepSeekV4FlashUsageV1 }
  from '../../packages/secure-provider-runtime/provider-pricing-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 }
  from '../../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacyProfile }
  from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 }
  from '../../packages/skill-production-v3/faction-model-lifecycle-v1.mjs';
import { factionProfileRefV1, factionProviderModelIdentityMatchesV1 }
  from '../../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { fail, hash, seal } from '../../packages/skill-production/common.mjs';

export { ROOT, DB_PATH, BUILD, HISTORY_TOKENS, HISTORY_MICROS, json, safeCode,
  codeHashes, ledgerSnapshot, capabilityProbeSamples }
  from './strategy-live-production-support-v1.mjs';

export function selectStrategyExecutionV2(now = new Date().toISOString()) {
  const selected = selectFactionExecutionModelV1({
    selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
    legacyProfileRef: factionProfileRefV1(legacyProfile),
    now,
  });
  return seal({
    version: 'strategy_execution_selection_v2',
    lifecycleBindingHash: FACTION_MODEL_LIFECYCLE_BINDING_V1.hash,
    decision: selected.decision,
    providerProfile: selected.profile,
    providerProfileRef: factionProfileRefV1(selected.profile),
    rawReportedModelPreserved: true,
    reportedModelMismatchBlocksSemanticAcceptance: false,
    trainingTruth: false,
  });
}

export function providerRegistryV2(execution) {
  if (execution?.version !== 'strategy_execution_selection_v2') fail('STRATEGY_EXECUTION_SELECTION_INVALID');
  const profile = execution.providerProfile;
  const registry = createStarcraftTmgProviderProfileRegistryV2({
    entries: [{ providerProfile: profile, responsePath: '/responses' }],
    allowedProviders: ['deepseek-openai-compatible-direct'],
  });
  const binding = registry.resolveEgressBinding({ profileRef: execution.providerProfileRef }).egressBinding;
  return { registry, binding };
}

export function priceUsageV2(execution, usage, receipt = {}) {
  const profile = execution.providerProfile;
  try {
    if (!factionProviderModelIdentityMatchesV1(receipt, profile.model)) throw new TypeError('model identity outside price normalization');
    const price = priceStarcraftTmgDeepSeekV4FlashUsageV1({
      providerId: 'deepseek-openai-compatible-direct',
      requestedModel: profile.model,
      // The tariff is attached to the requested public SKU. The raw provider
      // alias remains untouched in the Provider receipt used as evidence.
      reportedModel: profile.model,
      startedAt: receipt.startedAt,
      usage,
    });
    return Math.ceil(price.calculatedCostNanoUsd * 8 / 1000);
  } catch {
    return Math.ceil((usage.inputUnits * 440 + usage.outputUnits * 1320) * 8 / 1000);
  }
}

export async function attachProviderV2({ execution, beforeSend = () => {},
  captureWire = null, onModelIdentityAlert = () => {} } = {}) {
  const { registry, binding } = providerRegistryV2(execution);
  const worker = createStarcraftTmgStructuredProviderWorkerPortV1({ providerProfileRegistry: registry });
  let attached;
  try {
    const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
    try {
      attached = await worker.attachCredential({ attachmentId: `strategy-v2-${randomUUID()}`,
        providerProfile: execution.providerProfile, credentialBytes: ingress.credentialBytes });
    } finally { ingress.credentialBytes.fill(0); }
    if (!attached?.ok) fail('PROVIDER_ATTACHMENT_FAILED');
  } catch (error) { await worker.close().catch(() => {}); throw error; }
  const base = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512,
    send: async request => {
      beforeSend();
      const startedAt = new Date().toISOString();
      const response = await worker.send({ workerRef: attached.workerRef, ...request });
      if (captureWire) await captureWire({ request, response, startedAt });
      return response;
    } });
  const inspectIdentity = response => {
    const receipt = response?.usageReceipt;
    if (receipt && !factionProviderModelIdentityMatchesV1(receipt, execution.providerProfile.model)) {
      onModelIdentityAlert(seal({ version: 'strategy_provider_model_identity_alert_v1',
        expectedRequestedModel: execution.providerProfile.model,
        requestedModel: receipt.requestedModel,
        reportedModel: receipt.reportedModel,
        receiptHash: receipt.receiptHash,
        severity: 'important_nonblocking',
        action: 'preserve_raw_receipt_and_continue_semantic_validation',
        trainingTruth: false }));
    }
    return response;
  };
  const adapter = Object.freeze({ ...base,
    async complete(input) { return inspectIdentity(await base.complete(input)); },
  });
  return { binding, adapter, close: async () => {
    await worker.detachCredential({ workerRef: attached.workerRef,
      reason: 'strategy_generation_finished' }).catch(() => {});
    await worker.close().catch(() => {});
  } };
}

export function executionPriceV2(execution) {
  if (execution?.version !== 'strategy_execution_selection_v2'
    || execution.hash !== hash(Object.fromEntries(Object.entries(execution).filter(([key]) => key !== 'hash')))) {
    fail('STRATEGY_EXECUTION_SELECTION_INVALID');
  }
  return (usage, receipt = {}) => priceUsageV2(execution, usage, receipt);
}
