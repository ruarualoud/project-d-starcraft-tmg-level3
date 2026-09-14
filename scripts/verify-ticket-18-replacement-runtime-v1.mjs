import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { authenticateFactionAmbiguousFragmentV1, prepareFactionAmbiguousReplacementV1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { FACTION_MODEL_LIFECYCLE_BINDING_V1, selectFactionExecutionModelV1 } from '../packages/skill-production-v3/faction-model-lifecycle-v1.mjs';
import { factionProfileRefV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createFactionReplacementFragmentRuntimeV1, verifyFactionReplacementFragmentV1,
  readFactionReplacementDispatchChoiceV1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1 } from '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { createStarcraftTmgInMemoryStructuredFaultAdapterV1 } from '../packages/structured-generation/adapters/in-memory-fault-injection-v1.mjs';

const cli = process.argv.slice(2);
assert(cli.length === 0 || cli.length === 1 && cli[0] === '--dsh');
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const parentRunId = 'faction-v1-5fdab77171f213a6e7c9', parentRecipe = await json(parentRunId + '/recipe');
const diagnosis = await json('terran-wire-context-diagnosis-v2');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const quarantine = parentRecipe.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0];
const authArgs = { filename, parentRunId, parentRecipe, args, quarantine };
const authenticated = authenticateFactionAmbiguousFragmentV1(authArgs), now = new Date().toISOString();
const { decision: selection } = selectFactionExecutionModelV1({ selectedBinding: FACTION_MODEL_LIFECYCLE_BINDING_V1,
  legacyProfileRef: factionProfileRefV1(legacy), now });
assert.equal(selection.selection, 'beta', 'This pre-retirement fixture must use an actual paid beta capability');
const caps = await json(parentRunId + '/active-capabilities'), capability = caps.reviewFragments.target;
const source = new DatabaseSync(filename, { readOnly: true });
const original = source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId);
const readCapabilityReceipt = id => {
  const rows = source.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?").all(id);
  assert.equal(rows.length, 1); return verifySeal(JSON.parse(rows[0].response)).value.capabilityReceipt;
};
assert.deepEqual(readCapabilityReceipt(capability.receiptHash), capability);
const authenticateReplacement = () => prepareFactionAmbiguousReplacementV1({ authenticated,
  authenticateOrigin: () => authenticateFactionAmbiguousFragmentV1(authArgs), selection,
  legacyProfileRef: factionProfileRefV1(legacy), capability, now });
const replacement = authenticateReplacement();
const directory = await mkdtemp(base + 'replacement-runtime-'), testFile = directory + '/journal.sqlite';
const runId = 'faction-v1-' + hash(directory + '/owner').slice(0, 20), nextId = 'faction-v1-' + hash(directory + '/successor').slice(0, 20);
const storeOptions = { runId, recipeHash: hash(runId), maxCalls: 4, maxCostMicros: 4000000, maxTokens: 2000000 };
let journal = openProductionStore(testFile, storeOptions), store = withProductionExecutionPolicyV1(journal, parentRecipe.executionPolicyBinding);
const prior = await json('field-recovery-runtime-v1');
let calls = 0, dshCalls = 0, interrupted = false, checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const fault = createStarcraftTmgInMemoryStructuredFaultAdapterV1({ steps: [{ kind: 'success',
  output: { focusPaths: ['risk'], verdict: 'uncertain', reason: 'Injected mechanism proof; not an actual strategy assessment.', sourceSlots: [0] } }] });
let wire;
const providerAdapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async q => {
  calls++; wire = q.body;
  const result = await fault.send(q), { receiptHash: ignored, ...body } = result.transportReceipt;
  const timed = { ...body, startedAt: now };
  return { ...result, transportReceipt: { ...timed, receiptHash: hash(timed) } };
} });
const native = cli.includes('--dsh') ? await prepareDshLoop(process.cwd(), { sessionPolicy: 'phased-v1' }) : {
  binding: prior.value.loop.runtimeBinding, async run(q) {
    const r = await q.callModel();
    return seal({ runtimeBinding: this.binding, sandboxReceipt: { injected: true }, lifecycle: prior.value.loop.lifecycle,
      deadline: prior.value.loop.deadline, lifecycleFixtureCopied: true, calls: 1, directNetworkUsed: false, trainingTruth: false,
      final: r.command.content, toolTrace: [], transcript: [{ call: 1, receiptHash: r.receiptHash,
        commandHash: sha256(JSON.stringify(r.command)) }] });
  } };
const dsh = { ...native, async run(q) { dshCalls++; return native.run(q); } };
const readSuccessEvidence = ({ runId: owner, attemptId }) => {
  assert([runId, nextId].includes(owner)); return readFactionStructuredSuccessEvidenceV1({ filename: testFile, runId: owner, attemptId });
};
const factory = extra => createFactionReplacementFragmentRuntimeV1({ filename: testFile, store, dsh,
  providerAdapter, priceUsage: u => u.totalUnits, allowedRunIds: [runId, nextId], readSuccessEvidence, readCapabilityReceipt, ...extra });
let part;
try {
  await assert.rejects(factory({ onProgress: () => {
    if (!interrupted) { interrupted = true; throw Object.assign(new Error('Injected paid-result-before-fragment interruption'), { code: 'INJECTED_AFTER_PAID_RESULT' }); }
  } }).run({ replacement, authenticateReplacement }), { code: 'INJECTED_AFTER_PAID_RESULT' }); checks++;
  eq(calls, 1);
  part = await factory().run({ replacement, authenticateReplacement });
  eq(calls, 1); eq(part.runId, runId); eq(part.originalAttemptId, quarantine.originAttemptId);
  eq(part.originalReserveMicros, original.reserve); eq(part.originalResultReconciled, false);
  eq(part.attemptId !== quarantine.originAttemptId, true);
  eq(wire.input, replacement.request.input); eq(wire.instructions, replacement.request.instructions);
  eq(wire.model, selection.model);
  eq((await factory().run({ replacement, authenticateReplacement })).hash, part.hash); eq(calls, 1);
} finally { journal.close(); }
journal = openProductionStore(testFile, { ...storeOptions, runId: nextId, recipeHash: hash(nextId) });
store = withProductionExecutionPolicyV1(journal, parentRecipe.executionPolicyBinding);
try {
  const next = await factory().run({ replacement, authenticateReplacement });
  eq(next.runId, runId); eq(next.attemptId, part.attemptId); eq(calls, 1); eq(journal.summary().calls, 0);
} finally { journal.close(); }
const verifyArgs = { replacement, authenticateReplacement, readSuccessEvidence, readCapabilityReceipt,
  readDispatchChoice: grant => readFactionReplacementDispatchChoiceV1({ filename: testFile, grant }), dshBindingHash: dsh.binding.hash };
eq(verifyFactionReplacementFragmentV1({ ...verifyArgs, part }).originalResultReconciled, false);
for (const patch of [{ value: { verdict: 'supported' } }, { originalResultReconciled: true }, { originalReserveMicros: 0 },
  { runId: nextId }, { attemptId: quarantine.originAttemptId }, { selectionHash: hash('wrong') }, { semanticAcceptance: true }]) {
  assert.throws(() => verifyFactionReplacementFragmentV1({ ...verifyArgs, part: reseal(part, patch) })); checks++;
}
assert.throws(() => verifyFactionReplacementFragmentV1({ ...verifyArgs, part, readCapabilityReceipt: () => null })); checks++;
eq(hash(source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(quarantine.originRunId, quarantine.originAttemptId)), hash(original));
source.close();
const files = ['packages/skill-production-v3/faction-ambiguous-replacement-runtime-v1.mjs',
  'packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs', 'packages/skill-production-v3/faction-replacement-dispatch-guard-v1.mjs',
  'packages/skill-production-v3/faction-model-lifecycle-v1.mjs', 'scripts/verify-ticket-18-replacement-runtime-v1.mjs'];
const report = seal({ version: 'faction_replacement_fragment_runtime_proof_v1', passed: true, checks,
  actualParentRunId: parentRunId, actualOriginProof: authenticated.proof, actualCapabilityReceiptHash: capability.receiptHash,
  directory, part, providerCalls: 0, injectedProviderCalls: calls,
  actualDshSessions: cli.includes('--dsh') ? dshCalls : 0, dshInjectionUsed: !cli.includes('--dsh'),
  fullSourceContextPreserved: true, restartAfterPaymentNoResend: true, successorKeepsActualPaidOwner: true,
  productionMainWired: false, mixedDecompositionConsumerWired: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + (cli.includes('--dsh') ? 'replacement-runtime-dsh-v1' : 'replacement-runtime-fixture-v1') + '.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, injectedProviderCalls: calls,
  actualDshSessions: report.actualDshSessions, productionMainWired: false }));
