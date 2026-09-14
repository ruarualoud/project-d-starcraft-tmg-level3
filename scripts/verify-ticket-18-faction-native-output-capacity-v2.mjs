import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop, runDirectLoop } from '../packages/skill-production/loops.mjs';
import { factionRoleWorkspaceV1, createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionNativeProductionRuntimeV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { FACTION_NATIVE_OUTPUT_CAPACITY_BINDING_V2 as binding } from '../packages/skill-production-v3/faction-native-output-capacity-v2.mjs';
import { FACTION_NATIVE_PRODUCTION_BINDING_V1 as nativeBinding, FACTION_NATIVE_PRODUCTION_PROBE_SAMPLES_V1 as samples } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as profile } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { createFactionReplayRuntimeStackV1, loadFactionStructuredReplayDependenciesV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { renewFactionCapabilityV1 } from '../packages/skill-production-v3/faction-parallel-v1.mjs';
import { FACTION_NATIVE_PRODUCTION_CONTRACTS_V1 as contracts } from '../content/skill-generation/ticket-18-faction-native-production-contracts-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const input = verifySeal(JSON.parse(await readFile(base + 'zerg_swarm-input.json', 'utf8')));
const diagnosis = verifySeal(JSON.parse(await readFile(base + 'native-output-capacity-diagnosis.json', 'utf8')));
assert.equal(diagnosis.passed, true); assert.equal(diagnosis.inputHash, input.hash);
assert.equal(diagnosis.actualRequestRebuilt, true); assert.equal(diagnosis.actualOutputUnits, 4096);
const request = diagnosis.request;
const originalRecipe = verifySeal(JSON.parse(await readFile(base + diagnosis.originRunId + '/recipe.json', 'utf8')));
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root: process.cwd(), recipe: originalRecipe });
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }] })
  .resolveEgressBinding({ profileRef: binding.profileRef }).egressBinding;
const now = Date.now(), capability = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.profileRef,
  endpointPath: egressBinding.endpoint.path, endpointDialect: egressBinding.endpointDialect, model: egressBinding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: nativeBinding.contracts.notes, probeInputHash: hash('INJECTED'), probeOutputHash: hash('INJECTED OUTPUT'),
  probeResult: 'accepted_schema_valid', usage: { inputUnits: 10, outputUnits: 10, totalUnits: 20 }, usageKnown: true,
  physicalAttempts: 1, probedAt: new Date(now).toISOString(), expiresAt: new Date(now + 3600000).toISOString() });
const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const dsh = await prepareDshLoop(process.cwd());
let checks = 0;
for (const mode of ['new', 'frozen', 'incomplete', 'payment_required']) {
  const store = openProductionStore(':memory:', { runId: 'native-capacity-' + mode, recipeHash: hash(mode),
    maxCalls: 2, maxCostMicros: 4000000, maxTokens: 1000000 });
  const artifacts = new Map(), responses = new Map(); let capturedInput;
  const journal = { ...store, acquire(id, value) { if (id === request.packet.id + '.' + request.roleId) capturedInput = value;
    return store.acquire(id, value); },
    finish(lease, value) { const saved = store.finish(lease, value); artifacts.set(saved.hash, saved); return saved; },
    settle(id, result) { const saved = store.settle(id, result); if (result.response?.usageReceipt)
      responses.set(result.response.usageReceipt.receiptHash, { response: result.response }); return saved; } };
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [mode === 'incomplete' ? { kind: 'incomplete' }
    : mode === 'payment_required' ? { kind: 'failed', status: 402 } : { kind: 'success', output: samples.notes }] });
  const sent = [], adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async args => {
    sent.push(args); const response = structuredClone(await fault.send(args));
    const { receiptHash: ignored, ...body } = response.transportReceipt;
    body.startedAt = new Date(now).toISOString();
    response.transportReceipt = { ...body, receiptHash: hash(body) }; return response;
  } });
  const frozenRoleIds = mode === 'frozen' ? [request.packet.id + '.' + request.roleId] : [];
  const options = { input, runtime: { role: () => assert.fail('No fallback') }, store: journal,
    dsh: mode === 'new' ? dsh : { run: runDirectLoop }, executionPolicy: policy,
    providerAdapter: adapter, egressBinding, capabilities: { notes: capability }, priceUsage: usage => usage.totalUnits,
    outputCapacity: { binding, frozenRoleIds, providerAdapter: adapter, egressBinding, capabilities: { notes: capability } } };
  try {
    const runtime = createFactionNativeProductionRuntimeV1(options);
    if (['incomplete', 'payment_required'].includes(mode)) {
      await assert.rejects(runtime.role(request), { code: mode === 'incomplete' ? 'STRUCTURED_PROVIDER_INCOMPLETE' : 'PROVIDER_PAYMENT_REQUIRED' });
      await assert.rejects(runtime.role(request));
      assert.equal(sent.length, 1); checks += 3;
    } else {
      const value = await runtime.role(request);
      assert.equal(sent[0].body.max_output_tokens, mode === 'new' ? 8192 : 4096); checks++;
      assert.deepEqual(JSON.parse(sent[0].body.input).workspace, request.workspace); checks++;
      assert.deepEqual(JSON.parse(sent[0].body.input).fullFrozenSources, input.frozenSources.prompt); checks++;
      assert.equal((await runtime.role(request)).hash, value.hash); checks++;
      assert.equal(sent.length, 1); checks++;
      if (mode === 'new') {
        const recipe = { ...originalRecipe, nativeProductionBinding: nativeBinding, nativeOutputCapacityBinding: binding,
          nativeOutputCapacityFrozenRoleIds: [], dshBindingHash: dsh.binding.hash };
        const args = { value, request, input, roleInput: capturedInput, recipe,
          resolveArtifact: h => artifacts.get(h), resolveResponse: h => responses.get(h),
          resolveCapabilityReceipt: h => h === capability.receiptHash ? capability : null };
        assert.equal(verifyFactionStructuredRoleReplayV1(args).providerReceiptHashes.length, 1); checks++;
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, recipe: { ...recipe, nativeOutputCapacityBinding: null } })); checks++;
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args,
          recipe: { ...recipe, nativeOutputCapacityFrozenRoleIds: [value.roleId] } })); checks++;
        assert.equal(value.outputCapacityBindingHash, binding.hash); checks++;
        assert.equal(value.semanticAcceptance, false); checks++;
        assert.throws(() => verifyFactionStructuredRoleReplayV1({ ...args, resolveCapabilityReceipt: () => null }),
          { code: 'FACTION_NATIVE_OUTPUT_CAPACITY_CONSUMER_CAPABILITY_MISSING' }); checks++;
        const replay = { store: journal, bindRoleRequest() {}, readRoleSteps: () => [{ id: value.roleId,
          inputHash: hash(capturedInput), artifact: value }] };
        const stack = await createFactionReplayRuntimeStackV1({ root: process.cwd(), runId: diagnosis.originRunId,
          recipe, input, replay, runtime: { role: () => assert.fail('No legacy replay') }, dependencies });
        assert.equal((await stack.runtime.role(request)).hash, value.hash); checks++;
        assert.equal(sent.length, 1); checks++;
      } else assert.equal(value.outputCapacityBindingHash, undefined);
    }
  } finally { store.close(); }
}
// Schema support is probed with a tiny output under the V2 profile. The real
// role boundary above, not this 512-token probe, proves the 8192 wire request.
// A V2 probe cannot alias the V1 renewal request identity.
{
  const store = openProductionStore(':memory:', { runId: 'capacity-probe', recipeHash: hash('capacity-probe'),
    maxCalls: 1, maxCostMicros: 2000000, maxTokens: 50000 });
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success', output: samples.notes }] });
  let sent;
  const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ maxProbeOutputUnits: 512,
    send: args => { sent = args; return fault.send(args); } });
  const oldCapabilities = verifySeal(JSON.parse(await readFile(base + diagnosis.originRunId + '/active-capabilities.json', 'utf8')));
  try {
    const options = { store, adapter, binding: egressBinding, contract: contracts.notes,
      prior: oldCapabilities.nativeProduction.notes, priceUsage: usage => usage.totalUnits, probeSample: samples.notes,
      bindingScopedIdentity: true, probeMaxOutputUnits: 512 };
    const value = await renewFactionCapabilityV1(options);
    assert.equal(sent.body.max_output_tokens, 512); checks++;
    assert.deepEqual(value.providerProfileRef, binding.profileRef); checks++;
    assert.equal((await renewFactionCapabilityV1(options)).receiptHash, value.receiptHash); checks++;
    assert.equal(fault.inspect().calls.length, 1); checks++;
    await assert.rejects(renewFactionCapabilityV1({ ...options, probeMaxOutputUnits: 8192 }),
      { code: 'FACTION_CAPABILITY_PROBE_CAPACITY_INVALID' }); checks++;
  } finally { store.close(); }
}
const files = ['packages/skill-production-v3/faction-native-output-capacity-v2.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs', 'scripts/verify-ticket-18-faction-native-output-capacity-v2.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs', 'packages/skill-production-v3/faction-parallel-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/diagnose-ticket-18-faction-native-output-capacity-v2.mjs', 'content/skill-generation/offline-provider-profile-v2.mjs',
  'packages/skill-production-v3/faction-output-capacity-policy-v2.mjs'];
const report = seal({ passed: true, checks, binding, actualDshSessions: 1, providerCalls: 0,
  originRunId: diagnosis.originRunId, originAttemptId: diagnosis.originAttemptId, inputHash: input.hash,
  originalReceiptHash: diagnosis.originalReceiptHash, originalIssueHash: diagnosis.originalIssueHash,
  originalInvocationHash: diagnosis.invocationHash, actualRequestRebuilt: true, diagnosisHash: diagnosis.hash,
  injectedProvider: true, actualPaid8192CallVerified: false, fullSourcesPreserved: true, oldV1RolePreserved: true,
  consumerReplayPassed: true, outerReplayRouterPassed: true, profileScopedProbePassed: true,
  automaticRetryForbidden: true, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'native-output-capacity-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0, hash: report.hash }));
