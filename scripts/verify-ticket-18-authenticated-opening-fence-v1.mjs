import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { prepareFactionReviewDecompositionV1, createFactionReviewFragmentCapsuleV1,
  FACTION_REVIEW_DECOMPOSITION_BINDING_V1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { createFactionWireRecoveryEnvironmentV2, inspectFactionWireKeyHelperV2 } from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { createStructuredRuntimeWithWireRecoveryV2 } from '../packages/structured-generation/structured-runtime-selection-v2.mjs';
import { createStarcraftTmgContextCapsuleRegistryV1 } from '../packages/structured-generation/context-capsule-v1.mjs';
import { createStarcraftTmgOutputContractRegistryV1 } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { classifyStarcraftTmgStructuredFailureV2 } from '../packages/structured-generation/failure-classifier-v2.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createMacOsRawQuarantineKeyProviderV1 } from '../packages/secure-provider-runtime/raw-quarantine-key-provider-v1.mjs';
import { createEncryptedRawQuarantineV1 } from '../packages/structured-generation/encrypted-raw-quarantine-v1.mjs';
import { authenticateOpeningFenceRecoveryV1, materializeOpeningFenceRecoveryV1, verifyOpeningFenceRecoveryRecordV1,
  AUTHENTICATED_OPENING_FENCE_RECOVERY_BINDING_V1 as binding } from '../packages/structured-generation/authenticated-opening-fence-recovery-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6d345a142fa24636bab7';
const attemptId = 'structured-cf543e3f34ea6ee7e94966ddf63814727db2a0cfc46a77b0';
const json = async file => verifySeal(JSON.parse(await readFile(base + file, 'utf8')));
const db = new DatabaseSync(filename, { readOnly: true });
const ledger = () => db.prepare('SELECT * FROM attempts ORDER BY run,id').all();
assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const beforeHash = hash(ledger());
const readArtifact = id => {
  const r = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id);
  return r && verifySeal(JSON.parse(r.artifact)).value;
};
const issue = verifySeal(readArtifact(attemptId + '.wire-issue-v2'));
const diagnosis = await json('terran-wire-context-diagnosis-v2.json');
const input = await json(runId + '/terran_armed_forces-input.json');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const plan = prepareFactionReviewDecompositionV1(args);
const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan, jobId: 'target.0' });
assert.equal(prepared.capsule.hash, issue.invocation.contextManifestRef.hash);
const capabilities = await json(runId + '/active-capabilities.json');
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const egressBinding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const forbidden = () => assert.fail('No production write, Provider request, or repricing is allowed in this verifier');
let injectedPayment = false;
const sourceStore = { summary: () => ({ runId }), artifact: readArtifact,
  globalSummary: () => ({ attempts: [...db.prepare("SELECT code FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").all(),
    ...(injectedPayment ? [{ code: 'PROVIDER_PAYMENT_REQUIRED' }] : [])] }),
  acquire: forbidden, finish: forbidden, release: forbidden, reserve: forbidden, settle: forbidden };
const helperRef = await inspectFactionWireKeyHelperV2();
const environment = await createFactionWireRecoveryEnvironmentV2({ filename, runId, helperRef,
  providers: [{ egressBinding, send: forbidden }] });
const createWire = (extra = {}) => createStructuredRuntimeWithWireRecoveryV2({ store: sourceStore,
  providerAdapter: environment.adapters.get(egressBinding.providerProfileRef.hash), wireRecovery: environment,
  egressBinding, priceUsage: forbidden, classifyFailure: classifyStarcraftTmgStructuredFailureV2,
  contextManifestRegistry: createStarcraftTmgContextCapsuleRegistryV1({ entries: [prepared.capsule] }),
  outputContractRegistry: createStarcraftTmgOutputContractRegistryV1({ entries: [prepared.contract] }),
  executionPolicyRegistry: { resolve: q => hash(q.executionPolicyRef) === hash(issue.invocation.executionPolicyRef)
    && hash(q.roleRef) === hash(prepared.roleRef) && hash(q.outputContractRef) === hash(issue.outputContractRef)
    ? { ok: true, executionPolicy: FACTION_REVIEW_DECOMPOSITION_BINDING_V1.executionPolicy } : { ok: false } },
  capabilityReceiptRegistry: { resolve: () => ({ ok: true, capabilityReceipt: capabilities.reviewFragments.target }) }, ...extra });
const wireRuntime = createWire();
const authenticate = () => authenticateOpeningFenceRecoveryV1({ wireRuntime, issue, contract: prepared.contract, binding });
let checks = 0;
const eq = (a, b) => { assert.equal(a, b); checks++; };
const first = await authenticate(), second = await authenticate();
eq(first.proof.hash, second.proof.hash);
assert.notEqual(first.accessReceiptHash, second.accessReceiptHash); checks++;
eq(first.proof.normalization.removedPrefixUtf16Length, 8);
eq(first.proof.normalization.visibleScalarEdits, 0);
eq(hash(first.proof.providerValue), '007c9f8db12957250f580c8c0ef4706cdcabbf28dccd26937207b157263f578e');
eq(first.proof.localValidation.ok, true);
eq(first.proof.providerValue.verdict, 'supported');
eq(first.proof.providerValue.focusPaths.length, 17);
eq(first.proof.providerValue.sourceSlots.length, 19);
console.log(JSON.stringify({ stage: 'actual_authenticated_decode_passed', checks, providerCalls: 0 }));

const reseal = v => { const { hash: omitted, ...body } = v; return seal(body); };
for (const changedIssue of [reseal({ ...issue, rawPayloadPersisted: false }),
  reseal({ ...issue, providerRequestHash: hash('foreign') }),
  reseal({ ...issue, invocation: { ...issue.invocation, contextManifestRef: { ...issue.invocation.contextManifestRef, hash: hash('foreign') } } })]) {
  await assert.rejects(authenticateOpeningFenceRecoveryV1({ wireRuntime, issue: changedIssue, contract: prepared.contract, binding })); checks++;
}
await assert.rejects(authenticateOpeningFenceRecoveryV1({ wireRuntime: createWire({
  contextManifestRegistry: { resolve: () => ({ ok: true, instructions: prepared.capsule.instructions, input: 'wrong complete input' }) } }),
  issue, contract: prepared.contract, binding }), { code: 'STRUCTURED_WIRE_ATTEMPT_BINDING_INVALID' }); checks++;
await assert.rejects(authenticateOpeningFenceRecoveryV1({ wireRuntime: createWire({ wireRecovery: {
  ...environment, readAttempt: id => ({ ...environment.readAttempt(id), state: 'intent' }) } }), issue, contract: prepared.contract, binding }),
  { code: 'STRUCTURED_WIRE_ATTEMPT_BINDING_INVALID' }); checks++;

// Parser/schema fixtures only; the real authenticated transport is above.
const value = first.proof.providerValue;
const body = JSON.stringify(value);
const fixture = async text => {
  const next = reseal({ ...issue, rawBinding: { ...issue.rawBinding, outputTextHash: hash(text) } });
  return authenticateOpeningFenceRecoveryV1({ issue: next, binding, contract: prepared.contract,
    wireRuntime: { metadata: wireRuntime.metadata, consumeWireFailure: async (q, consumer) => {
      assert.equal(q.issueRef.hash, next.hash); return consumer(Buffer.from(text), { hash: hash('injected-access') });
    } } });
};
for (const text of [body, 'prefix\n```json\n' + body, '```json\n' + body + '\n```', '```json\n' + body.slice(0, -1),
  '```json\n' + body + '{}', '```json\n[]', '```json\nnull', '```json\n' + body.slice(0, -1) + ',"verdict":"unsupported"}',
  '```json\n' + body.slice(0, -1) + ',"\\u0076erdict":"supported"}',
  '```json\n' + JSON.stringify({ ...value, sourceSlots: [] }),
  '```json\n' + JSON.stringify({ ...value, reason: 'x'.repeat(66000) }),
  '```json\n' + '{"x":'.repeat(130) + '1' + '}'.repeat(130),
  '```json\n' + JSON.stringify({ ...value, extra: { a: 1 } })]) {
  await assert.rejects(fixture(text)); checks++;
}
for (const verdict of ['unsupported', 'uncertain']) {
  const negative = { ...value, verdict, reason: 'Preserve this injected negative finding; it is not actual Skill advice.' };
  const result = await fixture('```json\n' + JSON.stringify(negative));
  assert.deepEqual(result.proof.providerValue, negative); checks++;
}

const directory = await mkdtemp(base + 'authenticated-fence-'), testFile = directory + '/journal.sqlite';
const options = { runId: 'opening-fence-fixture-' + hash(directory).slice(0, 16), recipeHash: hash({ binding, proof: first.proof.hash }) };
let store = openProductionStore(testFile, options);
const nativeDsh = await prepareDshLoop(process.cwd());
let dshCalls = 0;
const dsh = { ...nativeDsh, run: q => { dshCalls++; return nativeDsh.run(q); } };
let saved;
try {
  saved = await materializeOpeningFenceRecoveryV1({ authenticate, store, dsh });
  eq(saved.fromCache, false); eq(dshCalls, 1); eq(store.summary().calls, 0);
  const independentlyAuthenticated = (await authenticate()).proof;
  verifyOpeningFenceRecoveryRecordV1({ record: saved.record, authenticated: independentlyAuthenticated, dshBindingHash: dsh.binding.hash }); checks++;
  const forged = reseal({ ...saved.record, proof: reseal({ ...saved.record.proof,
    providerValue: { ...value, verdict: 'unsupported' } }) });
  assert.throws(() => verifyOpeningFenceRecoveryRecordV1({ record: forged, authenticated: independentlyAuthenticated, dshBindingHash: dsh.binding.hash }),
    { code: 'AUTHENTICATED_OPENING_FENCE_RECORD_DRIFT' }); checks++;
  const changedLoop = reseal({ ...saved.record.loop, final: { ...value, verdict: 'unsupported' } });
  assert.throws(() => verifyOpeningFenceRecoveryRecordV1({ record: reseal({ ...saved.record, loop: changedLoop }),
    authenticated: independentlyAuthenticated, dshBindingHash: dsh.binding.hash }), { code: 'AUTHENTICATED_OPENING_FENCE_DSH_DRIFT' }); checks++;
} finally { store.close(); }
store = openProductionStore(testFile, options);
try {
  eq((await materializeOpeningFenceRecoveryV1({ authenticate, store, dsh })).record.hash, saved.record.hash);
  eq(dshCalls, 1); eq(store.summary().calls, 0);
  // Authenticated consumption is still required for a cached durable record.
  const keyProvider = await createMacOsRawQuarantineKeyProviderV1({
    helperPath: base + 'raw-quarantine-key-helper-v1/raw-quarantine-keychain-v1', helperHash: helperRef.helperHash });
  const expired = await createEncryptedRawQuarantineV1({ directory: base + runId + '/encrypted-wire-v2', keyProvider,
    now: () => Date.parse(issue.quarantineReceiptRef.expiresAt) });
  await assert.rejects(materializeOpeningFenceRecoveryV1({ store, dsh,
    authenticate: () => authenticateOpeningFenceRecoveryV1({ wireRuntime: createWire({ wireRecovery: { ...environment, quarantine: expired } }),
      issue, contract: prepared.contract, binding }) }), { code: 'RAW_QUARANTINE_EXPIRED' }); checks++;
  injectedPayment = true;
  try { await assert.rejects(materializeOpeningFenceRecoveryV1({ authenticate, store, dsh }), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' }); checks++; }
  finally { injectedPayment = false; }
  eq(dshCalls, 1);
} finally { store.close(); }
const row = { id: saved.id, inputHash: hash(saved.input), artifact: saved.record };
store = withCheckpointContinuation(openProductionStore(testFile, { ...options, runId: options.runId + '.child' }), {
  manifest: seal({ parentRunId: options.runId, parentRecipeHash: options.recipeHash,
    reusable: [{ id: row.id, inputHash: row.inputHash, artifactHash: hash(row.artifact) }] }), steps: [row] });
try {
  eq((await materializeOpeningFenceRecoveryV1({ authenticate, store, dsh })).record.hash, saved.record.hash);
  eq(dshCalls, 1); eq(store.summary().calls, 0);
} finally { store.close(); }
eq(hash(ledger()), beforeHash); db.close();
const files = ['packages/structured-generation/authenticated-opening-fence-recovery-v1.mjs',
  'packages/structured-generation/adapters/opening-fence-recovery-v1.mjs',
  'packages/structured-generation/structured-generation-runtime-v2.mjs',
  'scripts/verify-ticket-18-authenticated-opening-fence-v1.mjs'];
const report = seal({ version: 'authenticated_opening_fence_component_v1', passed: true, checks, binding,
  actualOriginRunId: runId, actualAttemptId: attemptId, originalWireIssueHash: issue.hash,
  authenticatedProofHash: first.proof.hash, recoveryRecordHash: saved.record.hash,
  actualContextAndFailureRevalidated: true, originalAttemptsUnchanged: true,
  sqliteRestartPassed: true, crossRunRecordContinuationPassed: true, independentRawReplayPassed: true,
  negativeJudgmentsPreserved: true, expiredRawRejectedEvenWhenCached: true, globalPaymentStopPassed: true,
  actualDshSessions: dshCalls, providerCalls: 0, mainProductionWired: false, fragmentRuntimeWired: false,
  semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'authenticated-opening-fence-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: dshCalls, providerCalls: 0, hash: report.hash }));
