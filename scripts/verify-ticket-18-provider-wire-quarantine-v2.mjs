import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2 as createAdapter } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v2.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0); }
finally { db.close(); }
const helperDirectory = base + 'raw-quarantine-key-helper-v1/';
const manifest = verifySeal(JSON.parse(await readFile(helperDirectory + 'manifest.json', 'utf8')));
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({ helperPath: process.cwd() + '/' + helperDirectory + 'raw-quarantine-keychain-v1',
  helperHash: manifest.helperHash });
const directory = await mkdtemp(base + 'provider-wire-quarantine-');
const quarantine = await createEncryptedRawQuarantineV1({ directory, keyProvider });
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version,
  hash: profile.integrity.hash } }).egressBinding;
const ref = id => ({ id, version: 'v1', hash: hash(id) });
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model,
  capability: 'responses_json_schema', schemaSubsetVersion: contract.schemaSubsetVersion, outputContractRef: contractRef,
  probeInputHash: hash('injected-probe'), probeOutputHash: hash('injected-probe-output'), probeResult: 'accepted_schema_valid',
  usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 }, usageKnown: true, physicalAttempts: 1,
  probedAt: '2026-09-08T00:00:00.000Z', expiresAt: '2026-09-09T00:00:00.000Z' });
const now = () => '2026-09-08T01:00:00.000Z';
function inputFor(id) {
  const roleRef = ref(id), instructions = 'Injected bounded transport regression, not game advice.';
  const input = 'All frozen source context would be bound here in production. Injected fixture.';
  const invocation = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', roleRef,
    contextManifestRef: ref('context.' + id), outputContractRef: contractRef, executionPolicyRef: ref('policy.' + id),
    continuationRef: null, contextPayloadHash: hash({ instructions, input }), capabilityReceiptHash: capabilityReceipt.receiptHash,
    trainingTruth: false };
  return { scope: { runId: 'provider-quarantine-injected', invocation }, input: { egressBinding: binding, capabilityReceipt,
    outputContract: contract, providerRequest: { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
      requestId: 'structured-' + hash(invocation).slice(0, 48), roleRef, instructions, input,
      outputContractRef: contractRef, maxOutputUnits: 256 } } };
}
const raw = '{not-json: "injected raw only", 中文';
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw }] });
const adapter = createAdapter({ send: fault.send, now, quarantine });
const sample = inputFor('wire-fixture-a');
let failure;
await assert.rejects(adapter.complete(sample.input, sample.scope), error => { failure = error; return error.code === 'STRUCTURED_PROVIDER_SCHEMA_INVALID'; });
assert(failure.rawQuarantineEvidence, 'Actual adapter failure must carry a bound encrypted record, not only hashes.');
assert.equal(failure.rawQuarantineEvidence.status, 'persisted');
const ev = failure.rawQuarantineEvidence;
const recoveredHash = await quarantine.consume({ receipt: ev.receipt, binding: ev.binding, purpose: 'quarantine_regression',
  consumer: bytes => hash(bytes.toString('utf8')) });
assert.equal(recoveredHash, hash(raw));
assert.equal(fault.inspect().calls.length, 1);
assert.equal(ev.binding.contextHash, sample.scope.invocation.contextManifestRef.hash);
assert.equal(ev.binding.outputContractHash, contractRef.hash);
assert.equal(ev.binding.attemptId, sample.input.providerRequest.requestId);
assert.equal(JSON.stringify(failure).includes(raw), false);
let checks = 10;
const priorFault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw }] });
let original;
await assert.rejects(createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: priorFault.send, now }).complete(sample.input),
  error => { original = error; return error.code === failure.code; });
assert.deepEqual(failure.safeReceipt, original.safeReceipt); checks++;
const reopened = await createEncryptedRawQuarantineV1({ directory, keyProvider: await createMacOsRawQuarantineKeyProviderV1({
  helperPath: process.cwd() + '/' + helperDirectory + 'raw-quarantine-keychain-v1', helperHash: manifest.helperHash }) });
assert.equal(await reopened.consume({ receipt: ev.receipt, binding: ev.binding, purpose: 'quarantine_regression',
  consumer: bytes => hash(bytes.toString('utf8')) }), hash(raw)); checks++;
const noSend = createAdapter({ send: () => assert.fail('No send for bad scope'), now, quarantine });
for (const scope of [undefined, { ...sample.scope, runId: '' },
  { ...sample.scope, invocation: { ...sample.scope.invocation, contextManifestRef: ref('foreign') } },
  { ...sample.scope, invocation: { ...sample.scope.invocation, contextPayloadHash: hash('different') } }]) {
  await assert.rejects(noSend.complete(sample.input, scope), { code: 'RAW_QUARANTINE_INVOCATION_BINDING_INVALID' }); checks++;
}
const diskFault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw }] });
const diskAdapter = createAdapter({ send: diskFault.send, now, quarantine: { persist() { throw new Error('INJECTED PRIVATE RAW MUST NOT BE LOGGED'); } } });
await assert.rejects(diskAdapter.complete(sample.input, sample.scope), error => {
  assert.deepEqual(error.safeReceipt, original.safeReceipt);
  assert.equal(error.rawQuarantineEvidence.status, 'unavailable');
  assert.equal(error.rawQuarantineEvidence.failureCode, 'RAW_QUARANTINE_PERSIST_FAILED');
  assert(!JSON.stringify(error.rawQuarantineEvidence).includes('INJECTED PRIVATE')); return error.code === failure.code;
}); checks++;
const kinds = [
  { kind: 'invalid_schema' }, { kind: 'refusal' }, { kind: 'incomplete' },
  { kind: 'ambiguous_send' }, { kind: 'invalid_json', text: raw, status: 402 },
];
for (const [i, step] of kinds.entries()) {
  const f = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [step] });
  const a = createAdapter({ send: f.send, now, quarantine: { persist() { assert.fail('This failure class must not capture raw'); } } });
  const s = inputFor('non-wire-' + i);
  await assert.rejects(a.complete(s.input, s.scope), error => {
    assert.equal(error.rawQuarantineEvidence, undefined);
    if (step.status === 402) assert.equal(error.code, 'PROVIDER_PAYMENT_REQUIRED');
    return true;
  }); checks++;
}
// Complete the second lane first; each encrypted record must still bind to
// that lane's full invocation and original plaintext hash.
const a = inputFor('parallel-a'), b = inputFor('parallel-b');
const rawA = raw + ' lane-A', rawB = raw + ' lane-B';
let releaseA;
const barrier = new Promise(resolve => { releaseA = resolve; });
const fa = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: rawA }] });
const fb = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: rawB }] });
const parallel = createAdapter({ now, quarantine, send: async r => {
  if (r.requestId === a.input.providerRequest.requestId) { await barrier; return fa.send(r); }
  try { return await fb.send(r); } finally { releaseA(); }
} });
const errors = await Promise.all([a, b].map(s => parallel.complete(s.input, s.scope).then(() => assert.fail('Invalid JSON'), e => e)));
for (const [i, s] of [a, b].entries()) {
  const x = errors[i].rawQuarantineEvidence;
  assert.equal(x.binding.contextHash, s.scope.invocation.contextManifestRef.hash);
  assert.equal(await quarantine.consume({ receipt: x.receipt, binding: x.binding, purpose: 'quarantine_regression',
    consumer: bytes => hash(bytes.toString('utf8')) }), hash(i === 0 ? rawA : rawB)); checks++;
}
const report = seal({ version: 'provider_wire_quarantine_component_v2', passed: true, checks,
  actualOsKeychainUsed: true, originalFailureAndUsagePreserved: true, parallelIsolationPassed: true,
  restartDecryptPassed: true, plaintextLogged: false, allPayloadsInjected: true,
  actualLostTerranPayloadRecovered: false, providerCalls: 0, structuredRuntimeJournalWired: false,
  formalProductionWired: false, directory, quarantineReceiptHashes: [ev.receipt.hash, ...errors.map(e => e.rawQuarantineEvidence.receipt.hash)],
  trainingTruth: false, codeHashes: await Promise.all([
    'packages/structured-generation/adapters/deepseek-responses-json-schema-v2.mjs',
    'packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs',
    'packages/structured-generation/encrypted-raw-quarantine-v1.mjs',
    'packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs',
    'scripts/verify-ticket-18-provider-wire-quarantine-v2.mjs',
  ].map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'provider-wire-quarantine-component-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualOsKeychainUsed: true, providerCalls: 0,
  structuredRuntimeJournalWired: false, formalProductionWired: false, hash: report.hash }));
