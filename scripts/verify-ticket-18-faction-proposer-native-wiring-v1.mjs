import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_PROPOSER_BATCH_BINDING_V1 as binding, FACTION_PROPOSER_BATCH_CONTRACT_V1 as contract,
  createFactionProposerBatchPlanV1, factionProposerBatchRequestV1, validateFactionProposerBatchRequestV1,
  produceFactionProposerBatchesV1 } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';
import { prepareFactionNativeProductionRoleV1, createFactionNativeProductionRuntimeV1,
  factionNativeProductionKindV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as nativeBinding } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION, outputContractRefStarcraftTmgV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const read = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const input = await read('zerg_swarm-input'), diagnosis = await read('proposer-capacity-diagnosis');
const request = diagnosis.request, plan = createFactionProposerBatchPlanV1({ input, request });
const originalRequestHash = hash(request);
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
  .resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: egressBinding.providerProfileRef,
  endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: outputContractRefStarcraftTmgV1(contract), probeInputHash: hash('injected-plan-probe'), probeOutputHash: hash('injected-plan-response'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true,
  physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
const dsh = await prepareDshLoop(process.cwd());
let checks = 0, actualDshSessions = 0, assemblyHash;
const recipe = { nativeProductionBinding: nativeBinding, proposerBatchBinding: binding, dshBindingHash: dsh.binding.hash };
for (const mode of ['success', 'incomplete', 'missing_plan', 'payment_required']) {
  const store = openProductionStore(':memory:', { runId: 'plan-batches-' + mode, recipeHash: hash(mode),
    maxCalls: 5, maxCostMicros: 5000000, maxTokens: 3000000 });
  const artifacts = new Map(), responses = new Map(), requests = [], roleArtifacts = [];
  const journal = { ...store,
    finish(lease, value) { const saved = store.finish(lease, value); artifacts.set(saved.hash, saved); return saved; },
    settle(id, value) { const saved = store.settle(id, value);
      if (value.response?.usageReceipt) responses.set(value.response.usageReceipt.receiptHash, { response: value.response }); return saved; } };
  const output = indices => ({ plans: indices.map(index => ({ index, text: 'Injected conditional plan ' + index + ', not strategy acceptance.',
    sourceRefs: plan.targets[index].requiredSourceRefs })), uncertainties: ['No observed battle result.'] });
  const steps = mode === 'success' ? plan.batches.map(indices => ({ kind: 'success', output: output(indices) }))
    : mode === 'incomplete' ? [{ kind: 'incomplete' }]
      : mode === 'payment_required' ? [{ kind: 'failed', status: 402 }]
        : [{ kind: 'success', output: { ...output(plan.batches[0]), plans: output(plan.batches[0]).plans.slice(0, 1) } }];
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps });
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: args => fault.send(args) });
  const runtime = createFactionNativeProductionRuntimeV1({ input, runtime: { role: () => assert.fail('No legacy fallback') },
    store: journal, dsh: mode === 'success' ? dsh : { run: runDirectLoop }, providerAdapter: adapter,
    egressBinding, capabilities: { proposer_batch: capability }, executionPolicy, priceUsage: u => u.totalUnits,
    proposerBatchBinding: binding });
  const generate = () => produceFactionProposerBatchesV1({ input, request, store: journal,
    onArtifact: a => roleArtifacts.push(a), role: async r => {
      requests.push(structuredClone(r)); return runtime.role(r);
    } });
  try {
    if (mode === 'success') {
      const result = await generate(); assemblyHash = result.artifact.hash;
      assert.equal(result.value.lesson.length, 6); checks++;
      assert.equal(result.artifact.roleId, undefined); checks++;
      assert.equal(fault.inspect().calls.length, 3); checks++;
      for (const [ordinal, child] of requests.entries()) {
        assert.equal(validateFactionProposerBatchRequestV1({ input, request: child }).hash, plan.hash); checks++;
        const prepared = prepareFactionNativeProductionRoleV1({ input, request: child, executionPolicy, proposerBatchBinding: binding });
        const payload = JSON.parse(prepared.payload), value = artifacts.get(roleArtifacts[ordinal].hash);
        assert.deepEqual(payload.fullFrozenSources, input.frozenSources.prompt); checks++;
        assert.deepEqual(payload.workspace.answers, request.workspace.answers); checks++;
        assert.deepEqual(payload.workspace.judge, request.workspace.judge); checks++;
        assert.equal(payload.workspace.proposerBatch.priorBatches.length, ordinal); checks++;
        const proof = verifyFactionStructuredRoleReplayV1({ input, request: child, roleInput: prepared.roleInput, value, recipe,
          resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h) });
        assert.equal(proof.providerReceiptHashes.length, 1); checks++; actualDshSessions++;
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ input, request: child, roleInput: prepared.roleInput, value,
          recipe: { ...recipe, proposerBatchBinding: null }, resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h) }),
        { code: 'FACTION_NATIVE_PROPOSER_BATCH_BINDING_REQUIRED' }); checks++;
      }
      const again = await generate();
      assert.equal(again.artifact.hash, result.artifact.hash); checks++;
      assert.equal(fault.inspect().calls.length, 3); checks++;
      assert.equal(hash(request), originalRequestHash); checks++;
    } else {
      await assert.rejects(generate, { code: mode === 'incomplete' ? 'STRUCTURED_PROVIDER_INCOMPLETE'
        : mode === 'payment_required' ? 'PROVIDER_PAYMENT_REQUIRED' : 'FACTION_PROPOSER_BATCH_OUTPUT_DENOMINATOR' }); checks++;
      assert.equal(fault.inspect().calls.length, 1); checks++;
      assert.ok([...artifacts.values()].every(a => a.version !== 'faction_proposer_batch_assembly_v1')); checks++;
    }
  } finally { store.close(); }
}
const child = factionProposerBatchRequestV1({ input, request, plan, batchIndex: 0, priorBatches: [] });
for (const mutate of [r => r.workspace.judge.judgments[0].verdict = 'unsupported',
  r => r.workspace.outputRequestAtEnd.targets.pop(), r => r.workspace.questions.pop(),
  r => r.workspace.proposerBatch.plan.targets[0].question = 'changed']) {
  const changed = structuredClone(child); mutate(changed);
  assert.throws(() => validateFactionProposerBatchRequestV1({ input, request: changed })); checks++;
}
assert.equal(factionNativeProductionKindV1(child.roleId), 'proposer_batch'); checks++;
assert.equal(factionNativeProductionKindV1(child.roleId + 'x'), null); checks++;
const files = ['packages/skill-production-v3/faction-proposer-batches-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs', 'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'scripts/verify-ticket-18-faction-proposer-native-wiring-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: diagnosis.originRunId,
  originAttemptId: diagnosis.originAttemptId, originalReceiptHash: diagnosis.originalReceiptHash,
  diagnosisHash: diagnosis.hash, originalRequestHash, assemblyHash, actualDshSessions,
  fullSourceAndAnswerJudgeContextPreserved: true, actualRequestBodyConsumerReplayPassed: true,
  incompleteAndMissingPlansRejected: true, paymentStopTested: true, oldPaidArtifactsOverwritten: false,
  nativeWired: true, productionRunnerWired: false, providerCalls: 0, simulatedProviderOnly: true,
  actualNewFactionSkillsAccepted: 0, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'proposer-native-wiring-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions, providerCalls: 0, hash: report.hash }));
