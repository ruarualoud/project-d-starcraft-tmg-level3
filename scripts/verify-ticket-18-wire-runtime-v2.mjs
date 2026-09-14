import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef } from '../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgProviderCapabilityReceiptV1 } from '../packages/structured-generation/provider-capability-receipt-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2 as createAdapter } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v2.mjs';
import { createStarcraftTmgStructuredGenerationRuntimeV1 as createLegacyRuntime } from '../packages/structured-generation/structured-generation-runtime-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 as createLegacyAdapter } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 } from '../packages/structured-generation/structured-generation-runtime-v2.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../packages/structured-generation/structured-runtime-selection-v2.mjs';
import { inspectFactionWireKeyHelperV2, createFactionWireRecoveryEnvironmentV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../packages/structured-generation/failure-classifier-v2.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const global = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
try { assert.equal(global.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0); }
finally { global.close(); }
const helperDir = base + 'raw-quarantine-key-helper-v1/';
const manifest = verifySeal(JSON.parse(await readFile(helperDir + 'manifest.json', 'utf8')));
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({ helperPath: process.cwd() + '/' + helperDir + 'raw-quarantine-keychain-v1', helperHash: manifest.helperHash });
const directory = await mkdtemp(base + 'wire-runtime-v2-'), filename = directory + '/journal.sqlite';
const quarantine = await createEncryptedRawQuarantineV1({ directory: directory + '/encrypted', keyProvider });
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const ref = id => ({ id, version: 'v1', hash: hash(id) });
const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({ providerProfileRef: binding.providerProfileRef,
  endpointPath: binding.endpoint.path, endpointDialect: binding.endpointDialect, model: binding.model, capability: 'responses_json_schema',
  schemaSubsetVersion: contract.schemaSubsetVersion, outputContractRef: contractRef, probeInputHash: hash('injected-probe'),
  probeOutputHash: hash('injected-output'), probeResult: 'accepted_schema_valid', usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 },
  usageKnown: true, physicalAttempts: 1, probedAt: '2026-09-08T00:00:00.000Z', expiresAt: '2026-09-09T00:00:00.000Z' });
const policy = { maxOutputUnits: 256, attemptEstimateMicros: 1000, attemptTokenReserve: 2000 };
let testNow = Date.now();
const runId = 'faction-v1-' + hash(directory).slice(0, 20), storeOptions = { runId, recipeHash: hash('wire-runtime-test'), maxCalls: 30, maxTokens: 100000,
  now: () => testNow };
let store = openProductionStore(filename, storeOptions);
const readAttempt = id => { const d = new DatabaseSync(filename, { readOnly: true });
  try { return d.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id); } finally { d.close(); } };
const inputFor = id => ({ roleRef: ref(id), contextManifestRef: ref('context.' + id), outputContractRef: contractRef,
  executionPolicyRef: ref('policy.' + id), continuationRef: null });
const instructions = 'Injected wire-journal test, not generated game advice.';
const faults = [];
const make = (step, extra = {}, legacy = false) => {
  const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: step ? [step] : [] });
  faults.push(fault);
  const adapter = (legacy ? createLegacyAdapter : createAdapter)({ send: fault.send, quarantine, now: () => '2026-09-08T01:00:00.000Z' });
  const runtime = (legacy ? createLegacyRuntime : createStructuredRuntimeWithWireRecoveryV2)({ store, providerAdapter: adapter, egressBinding: binding,
    ...(!legacy ? { wireRecovery: { binding: STRUCTURED_WIRE_RUNTIME_BINDING_V2, runId,
      quarantine: extra.quarantine || quarantine, readAttempt: extra.readAttempt || readAttempt,
      adapters: new Map([[binding.providerProfileRef.hash, extra.providerAdapter || adapter]]) } } : {}),
    runId, quarantine, readAttempt, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
    priceUsage: usage => usage.totalUnits, outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [contract] }),
    contextManifestRegistry: { resolve: q => ({ ok: true, instructions, input: 'Complete injected context for ' + q.roleRef.id }) },
    executionPolicyRegistry: { resolve: () => ({ ok: true, executionPolicy: policy }) },
    capabilityReceiptRegistry: { resolve: () => ({ ok: true, capabilityReceipt }) }, ...extra });
  return { runtime, fault };
};
const raw = '{not-json: "runtime-fixture", 中文';
const sample = inputFor('wire-fixture');
const run = make({ kind: 'invalid_json', text: raw });
let originalResult, originalIssue, originalAttempt, checks = 0;
const consumeArgs = (result, input) => ({ issueRef: result.issueRef, contextManifestRef: input.contextManifestRef, outputContractRef: input.outputContractRef });
try {
  const result = originalResult = await run.runtime.generateStructured(sample);
  const attemptId = store.summary().attempts[0].id;
  const issue = originalIssue = store.artifact(attemptId + '.wire-issue-v2');
  originalAttempt = readAttempt(attemptId);
  assert(issue, 'The caller must receive a durable versioned wire issue, not only a legacy rawPayloadPersisted=false issue.');
  assert.equal(issue.hash, result.issueRef.hash); checks++;
  assert.equal(issue.rawPayloadPersisted, true); checks++;
  assert.equal(result.status, 'quarantined'); checks++;
  assert.equal(result.candidateRef, null); checks++;
  assert.equal(issue.maxAdditionalProviderAttempts, 0); checks++;
  assert.equal(store.summary().calls, 1); checks++;
  assert.equal(store.summary().reservedOrSettledMicros, 160); checks++;
  assert.equal(originalAttempt.code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID'); checks++;
  assert.equal(issue.originalProviderReceiptHash, verifySeal(JSON.parse(originalAttempt.response)).value.receiptHash); checks++;
  assert.equal(store.artifact(attemptId + '.issue').rawPayloadPersisted, false); checks++;
  assert(!JSON.stringify(issue).includes(raw)); checks++;
  assert(!JSON.stringify(issue).includes('keyRef')); checks++;
  assert.equal(await run.runtime.consumeWireFailure(consumeArgs(result, sample), bytes => hash(bytes.toString('utf8'))), hash(raw)); checks++;
} finally { store.close(); }
store = openProductionStore(filename, storeOptions);
try {
  const resumed = make(null);
  assert.deepEqual(await resumed.runtime.generateStructured(sample), originalResult); checks++;
  assert.equal(resumed.fault.inspect().calls.length, 0); checks++;
  assert.deepEqual(readAttempt(originalIssue.attemptId), originalAttempt); checks++;
  assert.equal(await resumed.runtime.consumeWireFailure(consumeArgs(originalResult, sample), bytes => hash(bytes.toString('utf8'))), hash(raw)); checks++;
  await assert.rejects(resumed.runtime.consumeWireFailure({ ...consumeArgs(originalResult, sample), contextManifestRef: ref('foreign') },
    () => assert.fail('Foreign context must not receive plaintext')), { code: 'STRUCTURED_WIRE_CONSUMER_SCOPE_INVALID' }); checks++;
  const changedReader = make(null, { contextManifestRegistry: { resolve: () => ({ ok: true, instructions, input: 'changed context' }) } });
  await assert.rejects(changedReader.runtime.consumeWireFailure(consumeArgs(originalResult, sample), () => assert.fail('Changed context')),
    { code: 'STRUCTURED_WIRE_ATTEMPT_BINDING_INVALID' }); checks++;
  const expired = await createEncryptedRawQuarantineV1({ directory: directory + '/encrypted', keyProvider, now: () => Date.now() + 8 * 86400000 });
  await assert.rejects(make(null, { quarantine: expired }).runtime.consumeWireFailure(consumeArgs(originalResult, sample), () => assert.fail('Expired')),
    { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;

  // Crash after settlement but before the legacy issue, and then after each
  // V2 journal stage. Reopen the actual SQLite file; no request is resampled.
  for (const suffix of ['.issue', '.wire-receipt-v2', '.wire-outcome-v2']) {
    const crashInput = inputFor('crash-' + suffix.replace(/[^a-z0-9]/gu, ''));
    let crashId, injected = false;
    const originalStore = store;
    const crashing = { ...store, finish(lease, value) {
      if (!injected && lease.id.endsWith(suffix)) {
        injected = true; crashId = lease.id.slice(0, -suffix.length);
        // A dead lease is expired below using the test clock on restart;
        // never bypass an active lease in production.
        throw Object.assign(new Error('INJECTED_JOURNAL_INTERRUPTION'), { code: 'INJECTED_JOURNAL_INTERRUPTION' });
      }
      return originalStore.finish(lease, value);
    } };
    const attempt = make({ kind: 'invalid_json', text: raw + suffix }, { store: crashing });
    await assert.rejects(attempt.runtime.generateStructured(crashInput), { code: 'INJECTED_JOURNAL_INTERRUPTION' }); checks++;
    const before = readAttempt(crashId), ledgerBefore = store.summary();
    assert.equal(before.state, 'failed'); checks++;
    assert.equal(before.settled, 160); checks++;
    store.close();
    testNow += 600000;
    store = openProductionStore(filename, storeOptions);
    const next = make(null), result = await next.runtime.generateStructured(crashInput);
    assert.equal(result.status, 'quarantined'); checks++;
    assert.equal(store.artifact(result.issueRef.id).rawPayloadPersisted, true); checks++;
    assert.deepEqual(readAttempt(crashId), before); checks++;
    assert.equal(store.summary().calls, ledgerBefore.calls); checks++;
    assert.equal(store.summary().reservedOrSettledMicros, ledgerBefore.reservedOrSettledMicros); checks++;
    assert.equal(next.fault.inspect().calls.length, 0); checks++;
    assert.equal(await next.runtime.consumeWireFailure(consumeArgs(result, crashInput), bytes => hash(bytes.toString('utf8'))), hash(raw + suffix)); checks++;
  }

  // Historical hash-only wire failures remain unavailable, not "recovered".
  const oldInput = inputFor('legacy-no-raw');
  const old = make({ kind: 'invalid_json', text: raw }, {}, true);
  const oldResult = await old.runtime.generateStructured(oldInput);
  const oldStep = store.summary().steps.filter(s => s.id.endsWith('.issue'))
    .map(s => store.artifact(s.id)).find(s => s?.hash === oldResult.issueRef.hash);
  const oldAttemptId = 'structured-' + oldStep.invocationHash.slice(0, 48);
  const oldRecord = readAttempt(oldAttemptId), fromOld = make(null);
  const oldRecovered = await fromOld.runtime.generateStructured(oldInput);
  assert.equal(store.artifact(oldRecovered.issueRef.id).rawPayloadPersisted, false); checks++;
  assert.equal(store.artifact(oldRecovered.issueRef.id).unavailableCode, 'RAW_QUARANTINE_NOT_FOUND'); checks++;
  assert.deepEqual(readAttempt(oldAttemptId), oldRecord); checks++;
  await assert.rejects(fromOld.runtime.consumeWireFailure(consumeArgs(oldRecovered, oldInput), () => assert.fail('No old raw')),
    { code: 'STRUCTURED_WIRE_RAW_UNAVAILABLE' }); checks++;
  assert.equal(fromOld.fault.inspect().calls.length, 0); checks++;

  const diskInput = inputFor('disk-failure');
  const diskFault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw + 'disk' }] });
  faults.push(diskFault);
  const diskAdapter = createAdapter({ send: diskFault.send, now: () => '2026-09-08T01:00:00.000Z',
    quarantine: { persist() { throw Object.assign(new Error('injected disk error'), { code: 'EIO' }); } } });
  const disk = make(null, { providerAdapter: diskAdapter });
  const diskResult = await disk.runtime.generateStructured(diskInput), diskIssue = store.artifact(diskResult.issueRef.id);
  assert.equal(diskIssue.rawPayloadPersisted, false); checks++;
  assert.equal(readAttempt(diskIssue.attemptId).code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID'); checks++;
  assert.equal(readAttempt(diskIssue.attemptId).settled, 160); checks++;
  assert.equal(diskFault.inspect().calls.length, 1); checks++;

  let observedFailure = null;
  const observerInput = inputFor('observer-preserved');
  const observer = make({ kind: 'invalid_schema' }, { classifyFailure(args) {
    observedFailure = args.error; return classifyStarcraftTmgStructuredFailureV2(args);
  } });
  await observer.runtime.generateStructured(observerInput);
  assert.equal(observedFailure.code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID'); checks++;
  assert(observedFailure.transientCandidate); checks++;

  const helperRef = await inspectFactionWireKeyHelperV2();
  const envFault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw + 'environment' }] });
  faults.push(envFault);
  const environment = await createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef,
    providers: [{ egressBinding: binding, send: envFault.send }], now: () => '2026-09-08T01:00:00.000Z' });
  const envInput = inputFor('environment'), envRuntime = make(null, { wireRecovery: environment });
  const envResult = await envRuntime.runtime.generateStructured(envInput);
  assert.equal(await envRuntime.runtime.consumeWireFailure(consumeArgs(envResult, envInput), bytes => hash(bytes.toString('utf8'))), hash(raw + 'environment')); checks++;
  assert.equal(envFault.inspect().calls.length, 1); checks++;
  assert.equal(environment.helperRef.hash, helperRef.hash); checks++;
  assert.throws(() => make(null, { wireRecovery: { ...environment, adapters: new Map() } }),
    { code: 'STRUCTURED_WIRE_SELECTION_PROFILE_MISSING' }); checks++;
  const { hash: ignoredHelperHash, ...helperBody } = helperRef;
  await assert.rejects(createFactionWireRecoveryEnvironmentV2({ filename, runId,
    helperRef: seal({ ...helperBody, helperHash: '0'.repeat(64) }), providers: [{ egressBinding: binding, send: envFault.send }] }),
    { code: 'FACTION_WIRE_HELPER_REF_DRIFT' }); checks++;

  const advice = { title: 'Injected advice', when: ['fixture'], procedure: ['fixture'], alternatives: ['fixture'],
    risk: 'fixture risk', reviseIf: ['fixture'], sourceRefs: ['core.fixture'], unproven: ['fixture'] };
  const good = make({ kind: 'success', output: advice });
  const accepted = await good.runtime.generateStructured(inputFor('valid-structured'));
  assert.equal(accepted.status, 'accepted'); checks++;
  assert.equal(accepted.usage.total, 160); checks++;
  assert.equal(accepted.issueRef, null); checks++;
  for (const [kind, expected] of [['invalid_schema', 'schema_instance'], ['incomplete', 'output_incomplete'], ['ambiguous_send', 'ambiguous_egress']]) {
    const r = make({ kind }); const result = await r.runtime.generateStructured(inputFor(kind));
    assert.equal(result.issueRef.class, expected); checks++;
    assert.equal(result.issueRef.id, undefined); checks++;
  }

  // Unknown delivery is not settled from ciphertext filenames or reissued.
  const uncertain = inputFor('unknown-intent');
  const pr = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1', roleRef: uncertain.roleRef, instructions,
    input: 'Complete injected context for ' + uncertain.roleRef.id, outputContractRef: contractRef, maxOutputUnits: policy.maxOutputUnits };
  const iv = { schemaVersion: 'starcraft_tmg_structured_generation_runtime_v1.invocation', ...uncertain,
    contextPayloadHash: hash({ instructions, input: pr.input }), capabilityReceiptHash: capabilityReceipt.receiptHash, trainingTruth: false };
  const uncertainId = 'structured-' + hash(iv).slice(0, 48); pr.requestId = uncertainId;
  store.reserve(uncertainId, pr, 1000, 2000);
  const unknown = make(null);
  await assert.rejects(unknown.runtime.generateStructured(uncertain), { code: 'AMBIGUOUS_EGRESS_NO_RETRY' }); checks++;
  assert.equal(readAttempt(uncertainId).state, 'intent'); checks++;
  assert.equal(unknown.fault.inspect().calls.length, 0); checks++;

  // A single instance handles two simultaneous invocations, with the second
  // response deliberately arriving first. Both return their own exact raw.
  const inputs = [inputFor('parallel-a'), inputFor('parallel-b')];
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const ff = inputs.map((_, i) => createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'invalid_json', text: raw + i }] }));
  faults.push(...ff);
  const parallelAdapter = createAdapter({ quarantine, now: () => '2026-09-08T01:00:00.000Z', send: async r => {
    if (r.body.input.endsWith('parallel-a')) { await wait; return ff[0].send(r); }
    try { return await ff[1].send(r); } finally { release(); }
  } });
  const parallel = make(null, { providerAdapter: parallelAdapter });
  const results = await Promise.all(inputs.map(i => parallel.runtime.generateStructured(i)));
  for (const [n, result] of results.entries()) {
    assert.equal(await parallel.runtime.consumeWireFailure(consumeArgs(result, inputs[n]), bytes => hash(bytes.toString('utf8'))), hash(raw + n)); checks++;
    assert.equal(store.artifact(result.issueRef.id).invocation.contextManifestRef.hash, inputs[n].contextManifestRef.hash); checks++;
  }

  // Payment exhaustion is global to the journal, including raw reads and
  // cached failures. This is an injected test DB, never the paid production DB.
  const payment = make({ kind: 'invalid_json', status: 402 });
  assert.equal((await payment.runtime.generateStructured(inputFor('payment-stop'))).status, 'stopped'); checks++;
  const stopped = make(null);
  await assert.rejects(stopped.runtime.generateStructured(sample), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  await assert.rejects(stopped.runtime.consumeWireFailure(consumeArgs(originalResult, sample), () => assert.fail('Payment stop')),
    { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++;
  assert.equal(stopped.fault.inspect().calls.length, 0); checks++;
  const report = seal({ version: 'wire_runtime_component_v2', binding: STRUCTURED_WIRE_RUNTIME_BINDING_V2,
    passed: true, checks, originalIssueHash: originalIssue.hash, originalProviderReceiptHash: originalIssue.originalProviderReceiptHash,
    actualOsKeychainUsed: true, actualSqliteRestartPassed: true, partialJournalCrashRecoveryPassed: true,
    fullContextBindingPassed: true, parallelIsolationPassed: true, globalPaymentStopPassed: true,
    allProviderPayloadsInjected: true, injectedTransportCalls: faults.reduce((n, f) => n + f.inspect().calls.length, 0),
    providerCalls: 0, actualLostTerranPayloadRecovered: false, formalProductionWired: false, trainingTruth: false, directory,
    codeHashes: await Promise.all(['packages/structured-generation/structured-generation-runtime-v2.mjs',
      'packages/structured-generation/structured-generation-runtime-v1.mjs', 'packages/structured-generation/failure-classifier-v2.mjs',
      'packages/structured-generation/adapters/deepseek-responses-json-schema-v2.mjs',
      'packages/structured-generation/encrypted-raw-quarantine-v1.mjs',
      'packages/structured-generation/structured-runtime-selection-v2.mjs',
      'packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs', 'scripts/verify-ticket-18-wire-runtime-v2.mjs']
      .map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
  await writeFile(base + 'wire-runtime-component-v2.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, actualOsKeychainUsed: true,
    formalProductionWired: false, hash: report.hash }));
} finally { store.close(); }
