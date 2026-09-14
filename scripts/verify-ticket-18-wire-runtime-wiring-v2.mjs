import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v2.mjs';
import { STRUCTURED_WIRE_RUNTIME_BINDING_V2 as binding } from '../packages/structured-generation/structured-generation-runtime-v2.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { validateFactionWireRuntimeMigrationV2 } from '../packages/skill-production-v3/faction-wire-runtime-migration-v2.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';

const base = 'build/ticket-18-faction-production-v1/', productionFile = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async p => verifySeal(JSON.parse(await readFile(p, 'utf8')));
const diagnosis = await json(base + 'terran-wire-context-diagnosis-v2.json');
const component = await json(base + 'wire-runtime-component-v2.json');
assert(component.passed && component.partialJournalCrashRecoveryPassed && diagnosis.actualContextAndInvocationRebuilt);
for (const c of component.codeHashes) assert.equal(sha256(await readFile(c.file)), c.hash, c.file);
assert.equal(diagnosis.codeHash, sha256(await readFile('scripts/diagnose-ticket-18-terran-wire-context-v2.mjs')));
const recipe = await json(base + diagnosis.originRunId + '/recipe.json');
const input = await json(base + diagnosis.originRunId + '/terran_armed_forces-input.json');
const capabilities = await json(base + diagnosis.originRunId + '/active-capabilities.json');
assert.equal(input.hash, diagnosis.inputHash);
const db = new DatabaseSync(productionFile, { readOnly: true });
let attempt, originalIssue;
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(diagnosis.originRunId, diagnosis.originAttemptId);
  originalIssue = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get(diagnosis.originRunId, diagnosis.originAttemptId + '.issue').artifact)).value;
} finally { db.close(); }
const receipt = verifySeal(JSON.parse(attempt.response)).value;
assert.equal(hash(diagnosis.providerRequest), attempt.request_hash);
assert.equal(hash(diagnosis.invocation), originalIssue.invocationHash);
assert.equal(receipt.receiptHash, diagnosis.originalReceiptHash);
const helperRef = await inspectFactionWireKeyHelperV2();
const directory = await mkdtemp(base + 'actual-wire-replay-'), filename = directory + '/replay.sqlite';
const store = openProductionStore(filename, { runId: diagnosis.originRunId, recipeHash: recipe.hash, ...recipe.limits });
const put = (id, body, value) => { const l = store.acquire(id, body); return store.finish(l, value); };
store.reserve(attempt.id, diagnosis.providerRequest, attempt.reserve, attempt.token_reserve);
store.settle(attempt.id, { usage: receipt.usage, costMicros: attempt.settled, failureReceipt: receipt, code: attempt.code });
put(attempt.id + '.issue', { issueHash: originalIssue.hash }, originalIssue);
const readAttempt = id => { const d = new DatabaseSync(filename, { readOnly: true });
  try { return d.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(diagnosis.originRunId, id); } finally { d.close(); } };
const keyProvider = await createMacOsRawQuarantineKeyProviderV1({ helperPath: process.cwd() + '/' + base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helperRef.helperHash });
const quarantine = await createEncryptedRawQuarantineV1({ directory: directory + '/encrypted', keyProvider });
const providerRegistry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = providerRegistry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV2({ quarantine, send: () => assert.fail('Original paid failure must not be resampled') });
const wireRecovery = { binding, runId: diagnosis.originRunId, quarantine, readAttempt,
  adapters: new Map([[egressBinding.providerProfileRef.hash, adapter]]) };
const dsh = await prepareDshLoop(process.cwd());
let newWireIssue, checks = 6;
try {
  const wrapper = createFactionStructuredReviewRuntimeV1({ input, store, dsh, wireRecovery,
    runtime: { role: () => assert.fail('No legacy model path') }, providerAdapter: adapter,
    egressBinding, capabilityReceipt: capabilities.catalogueReview, outputContract: contract,
    executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
      allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false },
    priceUsage: () => assert.fail('Do not reprice or recharge the historical attempt'), includeSharedScenarioSources: true });
  await assert.rejects(wrapper.role(diagnosis.request), { code: 'STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED' }); checks++;
  newWireIssue = verifySeal(store.artifact(attempt.id + '.wire-issue-v2'));
  assert.equal(newWireIssue.class, 'wire_syntax'); checks++;
  assert.equal(newWireIssue.rawPayloadPersisted, false); checks++;
  assert.equal(newWireIssue.unavailableCode, 'RAW_QUARANTINE_NOT_FOUND'); checks++;
  assert.equal(newWireIssue.originalProviderReceiptHash, receipt.receiptHash); checks++;
  assert.equal(newWireIssue.supersedesLegacyStageIssueHash, originalIssue.hash); checks++;
  assert.equal(store.artifact(attempt.id + '.issue').hash, originalIssue.hash); checks++;
  assert.equal(store.summary().calls, 1); checks++;
  assert.equal(store.summary().knownTokens, receipt.usage.totalUnits); checks++;
  assert.equal(store.summary().reservedOrSettledMicros, attempt.settled); checks++;
  assert.deepEqual(readAttempt(attempt.id), attempt); checks++;
} finally { store.close(); }

const callers = [
  ['packages/skill-production-v3/faction-structured-review-runtime-v1.mjs', 'wireRecovery: options.wireRecovery'],
  ['packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs', 'wireRecovery: options.wireRecovery'],
  ['packages/skill-production-v3/faction-native-production-runtime-v1.mjs', 'wireRecovery: options.wireRecovery'],
  ['packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs', 'wireRecovery,'],
];
for (const [file, text] of callers) {
  const code = await readFile(file, 'utf8');
  assert(code.includes('createStructuredRuntimeWithWireRecoveryV2')); assert(code.includes(text)); checks += 2;
}
const runner = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['createFactionWireRecoveryEnvironmentV2', 'wireRuntimeBinding, wireRuntimeReadinessHash: wireRuntimeReadiness.hash, wireKeyHelperRef',
  'wireRuntime: wireRuntimeReadiness', 'readiness: capacityMigration?.wireRuntime']) {
  const source = text.includes('capacityMigration') ? await readFile('packages/skill-production-v3/faction-continuation-v1.mjs', 'utf8') : runner;
  assert(source.includes(text)); checks++;
}
const actualFailureReplay = seal({ passed: true, originRunId: diagnosis.originRunId, originAttemptId: attempt.id,
  inputHash: input.hash, actualContextAndInvocationRebuilt: true, providerRequest: diagnosis.providerRequest,
  invocation: diagnosis.invocation, originalIssueHash: originalIssue.hash, originalReceiptHash: receipt.receiptHash,
  originalSettledMicros: attempt.settled, newWireIssue, rawPayloadRecovered: false, providerCalls: 0, trainingTruth: false });
const files = [...new Set([...component.codeHashes.map(c => c.file), ...callers.map(c => c[0]),
  'packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs', 'scripts/support/raw-quarantine-keychain-v1.swift',
  'packages/skill-production-v3/faction-wire-runtime-migration-v2.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/diagnose-ticket-18-terran-wire-context-v2.mjs', 'scripts/verify-ticket-18-wire-runtime-wiring-v2.mjs'])];
const report = seal({ version: 'faction_wire_runtime_readiness_v2', passed: true, checks, binding, helperRef, component,
  actualFailureReplay, actualReviewWrapperPassed: true, otherCallersStaticWiringOnly: true,
  callersWired: true, failureObserversPreserved: true, providerCalls: 0, actualDshSessions: 1,
  formalProductionWired: true, actualProductionResumed: false, directory, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
const { hash: oldRecipeHash, ...body } = recipe;
const next = seal({ ...body, wireRuntimeBinding: binding, wireRuntimeReadinessHash: report.hash, wireKeyHelperRef: helperRef,
  codeHashes: [...recipe.codeHashes.filter(c => !files.includes(c.file)), ...report.codeHashes] });
const proof = validateFactionWireRuntimeMigrationV2({ filename: productionFile, parentRunId: diagnosis.originRunId, parent: recipe, next, readiness: report });
assert.equal(proof.accountingReset, false);
await writeFile(base + 'wire-runtime-readiness-v2.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0,
  formalProductionWired: true, actualProductionResumed: false, hash: report.hash }));
