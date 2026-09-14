import assert from 'node:assert/strict';
import { hash, seal } from '../../packages/skill-production/common.mjs';
import { openProductionStore } from '../../packages/skill-production/store.mjs';
import { runDirectLoop } from '../../packages/skill-production/loops.mjs';
import { createFactionNativeProductionRuntimeV1, prepareFactionNativeProductionRoleV1 } from '../../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { applyFactionNativeOutputCapacityV2 } from '../../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 } from '../../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../../content/skill-generation/offline-provider-profile-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRefStarcraftTmgV1 } from '../../packages/structured-generation/output-contract-registry-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../../packages/skill-evaluation/faction-structured-replay-v1.mjs';

export async function verifyFactionDraftEnvelopeCurrentFaultsV2({ samples, recipe, binding, dsh }) {
  const capacity = recipe.nativeOutputCapacityBinding, contract = FACTION_NATIVE_PRODUCTION_CONTRACTS_V1.items;
  const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
    .resolveEgressBinding({ profileRef: capacity.profileRef }).egressBinding;
  const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: capacity.profileRef,
    endpointPath: '/responses', endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
    capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
    outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('injected-draft-envelope-probe'),
    probeOutputHash: hash('injected-draft-envelope-response'), probeResult: 'accepted_schema_valid',
    usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true, physicalAttempts: 1,
    probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
  let checks = 0, actualDshSessions = 0;
  for (const mode of ['terran_refs', 'zerg_empty', 'unknown_source', 'empty_procedure', 'too_many_refs', 'incomplete', 'payment_required']) {
    const sample = samples[mode === 'zerg_empty' ? 1 : 0], { input, request, original } = sample;
    const runId = 'draft-envelope-current-' + mode, attempts = new Map();
    const store = openProductionStore(':memory:', { runId, recipeHash: hash(mode), maxCalls: 3,
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
    const output = structuredClone(sample.output);
    if (mode === 'unknown_source') output.items[0].value.sourceRefs = ['source:invented'];
    if (mode === 'empty_procedure') output.items[0].value.procedure = [];
    if (mode === 'too_many_refs') output.items[1].value.sourceRefs = input.frozenSources.prompt.sources.slice(0, 129).map(s => s.ref);
    const step = mode === 'incomplete' ? { kind: 'incomplete' }
      : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: 'success', output };
    const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
    const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
    let evidence, reads = 0;
    const runtime = createFactionNativeProductionRuntimeV1({ input, store: journal,
      executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity,
      runtime: { role: () => assert.fail('No legacy fallback') }, proposerBatchBinding: recipe.proposerBatchBinding,
      proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
      targetReconstructionBinding: recipe.nativeTargetReconstructionBinding, draftEnvelopeBinding: binding,
      providerAdapter, egressBinding, capabilities: { items: capability }, priceUsage: u => u.totalUnits,
      dsh: { binding: dsh.binding, run(args) {
        if (args.task.startsWith('Import ')) { actualDshSessions++; return dsh.run(args); }
        return runDirectLoop(args);
      } },
      readReferenceSetFailure({ prepared, failureReceiptHash }) {
        reads++;
        const attempt = [...attempts.values()].find(a => a.state === 'failed');
        const issue = store.artifact(attempt.id + '.issue'), rejected = store.artifact(attempt.id + '.rejected-candidate');
        assert.equal(issue.safeReceiptHash, failureReceiptHash);
        assert.equal(rejected.roleRef.id, prepared.fullRoleId); evidence = { attempt, issue, rejected }; return evidence;
      } });
    const actualRequest = applyFactionNativeOutputCapacityV2(request, capacity);
    try {
      if (['terran_refs', 'zerg_empty'].includes(mode)) {
        const artifact = await runtime.role(actualRequest);
        assert.deepEqual(artifact.output, sample.output); checks++;
        assert.equal((await runtime.role(actualRequest)).hash, artifact.hash); checks++;
        assert.equal(store.summary().attempts[0].state, 'failed'); checks++;
        const prepared = prepareFactionNativeProductionRoleV1({ input, request: actualRequest,
          executionPolicy: capacity.executionPolicy, outputCapacityBinding: capacity,
          proposerBatchBinding: recipe.proposerBatchBinding, proposerAuxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding,
          targetReconstructionBinding: recipe.nativeTargetReconstructionBinding });
        const proof = verifyFactionStructuredRoleReplayV1({ value: artifact, input, request, roleInput: prepared.roleInput,
          recipe: { ...recipe, draftEnvelopeBinding: binding }, resolveTeachFailureEvidence: () => evidence,
          resolveArtifact: h => { assert.equal(h, original.hash); return original; } });
        assert.deepEqual(proof.providerReceiptHashes, [evidence.issue.safeReceiptHash]); checks++;
      } else {
        await assert.rejects(runtime.role(actualRequest), { code: {
          unknown_source: 'FACTION_DRAFT_ENVELOPE_UNKNOWN_SOURCE', empty_procedure: 'STRUCTURED_PROVIDER_SCHEMA_INVALID',
          too_many_refs: 'FACTION_DRAFT_ENVELOPE_HOST_SCHEMA_INVALID', incomplete: 'STRUCTURED_PROVIDER_INCOMPLETE',
          payment_required: 'PROVIDER_PAYMENT_REQUIRED',
        }[mode] }); checks++;
      }
      assert.equal(fault.inspect().calls.length, 1); checks++;
      assert.equal(reads, ['incomplete', 'payment_required'].includes(mode) ? 0 : mode === 'empty_procedure' ? 2 : 1); checks++;
      assert.equal(store.summary().steps.filter(s => s.state === 'running').length, 0); checks++;
    } finally { store.close(); }
  }
  return { passed: true, checks, actualDshSessions, injectedProviderCalls: 7, providerCalls: 0 };
}
