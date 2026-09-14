import assert from 'node:assert/strict';
import { hash, seal } from '../../packages/skill-production/common.mjs';
import { openProductionStore } from '../../packages/skill-production/store.mjs';
import { runDirectLoop } from '../../packages/skill-production/loops.mjs';
import { createFactionNativeProductionRuntimeV1, prepareFactionNativeProductionRoleV1 } from '../../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as batchBinding, FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract } from '../../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { FACTION_PROPOSER_AUXILIARY_CAPACITY_BINDING_V1 as defaultBinding } from '../../packages/skill-production-v3/faction-proposer-auxiliary-capacity-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../../packages/skill-evaluation/faction-structured-replay-v1.mjs';

export async function verifyFactionProposerAuxiliaryCurrentFaultsV1({ input, request, actualOutput, executionPolicy, recipe, dsh, binding = defaultBinding }) {
  const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
    .resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
  const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
    endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
    capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
    outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('injected-auxiliary-probe'),
    probeOutputHash: hash('injected-auxiliary-response'), probeResult: 'accepted_schema_valid',
    usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
    probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
  let checks = 0, actualDshSessions = 0;
  for (const mode of ['overflow', 'foreign_source', 'excessive_auxiliary', 'incomplete', 'payment_required']) {
    const runId = 'auxiliary-current-' + mode, attempts = new Map();
    const store = openProductionStore(':memory:', { runId, recipeHash: hash(mode), maxCalls: 4,
      maxCostMicros: 5000000, maxTokens: 3000000 });
    const journal = { ...store,
      reserve(id, requestBody, ...rest) {
        const result = store.reserve(id, requestBody, ...rest);
        attempts.set(id, { run: runId, id, request_hash: hash(requestBody), state: 'intent' }); return result;
      },
      settle(id, value) {
        const result = store.settle(id, value), saved = store.summary().attempts.find(a => a.id === id);
        attempts.set(id, { ...attempts.get(id), ...saved,
          usage: JSON.stringify(seal({ value: value.usage })), response: JSON.stringify(seal({ value: value.failureReceipt })) });
        return result;
      } };
    const output = structuredClone(actualOutput);
    if (mode === 'foreign_source') output.plans[0].sourceRefs = ['source:invented'];
    if (mode === 'excessive_auxiliary') output.uncertainties = Array(129).fill('Bounded safety test.');
    const step = mode === 'incomplete' ? { kind: 'incomplete' }
      : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: 'success', output };
    const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
    const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
    let observedEvidence, reads = 0;
    const runtime = createFactionNativeProductionRuntimeV1({ input, store: journal, executionPolicy,
      runtime: { role: () => assert.fail('No legacy retry') }, proposerBatchBinding: batchBinding,
      proposerAuxiliaryCapacityBinding: binding, providerAdapter, egressBinding,
      capabilities: { proposer_batch: capability }, priceUsage: u => u.totalUnits,
      dsh: { binding: dsh.binding, run(args) {
        if (args.task.startsWith('Import ')) { actualDshSessions++; return dsh.run(args); }
        return runDirectLoop(args); // Fault injection, not an actual DSH session.
      } },
      readProposerAuxiliaryFailure({ prepared, failureReceiptHash }) {
        reads++;
        const attempt = [...attempts.values()].find(a => a.state === 'failed');
        const issue = store.artifact(attempt.id + '.issue'), rejected = store.artifact(attempt.id + '.rejected-candidate');
        assert.equal(issue.safeReceiptHash, failureReceiptHash);
        assert.equal(rejected.roleRef.id, prepared.fullRoleId);
        observedEvidence = { attempt, issue, rejected }; return observedEvidence;
      } });
    try {
      if (mode === 'overflow') {
        const artifact = await runtime.role(request);
        assert.deepEqual(artifact.output, actualOutput); checks++;
        assert.equal((await runtime.role(request)).hash, artifact.hash); checks++;
        assert.equal(store.summary().attempts[0].state, 'failed'); checks++;
        const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy,
          proposerBatchBinding: batchBinding, proposerAuxiliaryCapacityBinding: binding });
        const proof = verifyFactionStructuredRoleReplayV1({ value: artifact, input, request, roleInput: prepared.roleInput,
          recipe: { ...recipe, proposerAuxiliaryCapacityBinding: binding }, resolveTeachFailureEvidence: () => observedEvidence });
        assert.deepEqual(proof.providerReceiptHashes, [observedEvidence.issue.safeReceiptHash]); checks++;
      } else {
        const code = { foreign_source: 'FACTION_PROPOSER_BATCH_SOURCE_INVALID',
          excessive_auxiliary: 'FACTION_PROPOSER_AUXILIARY_HOST_SCHEMA_INVALID',
          incomplete: 'STRUCTURED_PROVIDER_INCOMPLETE', payment_required: 'PROVIDER_PAYMENT_REQUIRED' }[mode];
        await assert.rejects(runtime.role(request), { code }); checks++;
      }
      assert.equal(fault.inspect().calls.length, 1); checks++;
      assert.equal(reads, ['incomplete', 'payment_required'].includes(mode) ? 0 : 1); checks++;
      assert.equal(store.summary().steps.filter(s => s.state === 'running').length, 0); checks++;
    } finally { store.close(); }
  }
  return { passed: true, checks, actualDshSessions, injectedProviderCalls: 5, providerCalls: 0 };
}
