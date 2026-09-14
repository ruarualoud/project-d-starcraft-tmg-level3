import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createFactionStructuredReviewRuntimeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { readFactionStructuredSuccessEvidenceV1 } from '../packages/skill-evaluation/faction-structured-success-evidence-v1.mjs';
import { FACTION_DUAL_COORDINATE_REVIEW_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-dual-coordinate-review-binding-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V5 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';

// Real saved-output recovery, isolated journals, no Provider or credential port.
// Timings are observations, never a Skill acceptance or an automatic retry permit.
const [mode] = process.argv.slice(2);
assert.equal(process.argv.length, 3);
assert.ok(['--single', '--parallel', '--reuse', '--phased-single', '--phased-parallel'].includes(mode));
const sessionPolicy = mode.startsWith('--phased-') ? 'phased-v1' : 'legacy-v1';
const parallel = mode.endsWith('parallel');
const base = 'build/ticket-18-faction-production-v1/';
const originRunId = 'faction-v1-6d345a142fa24636bab7';
const failedRunId = 'faction-v1-27ef94cd6f32462ec36a';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name, 'utf8')));
const source = new DatabaseSync(filename, { readOnly: true });
const attempts = () => source.prepare('SELECT * FROM attempts ORDER BY run,id').all();
const beforeHash = hash(attempts());
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
assert.equal(source.prepare("SELECT count(*) n FROM attempts WHERE state='intent'").get().n, 0);
const diagnosis = await json(originRunId + '/actual-resume-diagnosis-7fb9531534ff84cd30f0.json');
const input = await json(originRunId + '/zerg_swarm-input.json');
const capabilities = await json(originRunId + '/active-capabilities.json');
const evidence = readFactionStructuredSuccessEvidenceV1({ filename, runId: originRunId, attemptId: diagnosis.zerg.attemptId });
assert.equal(evidence.candidate.hash, diagnosis.zerg.originalCandidateHash);
const originalRequest = diagnosis.zerg.request;
const canonicalFullRoleId = originalRequest.packet.id + '.' + originalRequest.roleId;
const failedSteps = source.prepare('SELECT id,input_hash FROM steps WHERE run=? AND id LIKE ?')
  .all(failedRunId, canonicalFullRoleId + '.source-evidence-v1.%');
assert.equal(failedSteps.length, 1, 'Resolve the unique actual source-epoch role');
const failedStep = failedSteps[0];
assert.match(failedStep.id.slice(canonicalFullRoleId.length), /^\.source-evidence-v1\.[a-f0-9]{20}$/u);
const fullRoleId = failedStep.id;
const request = { ...originalRequest, roleId: fullRoleId.slice(originalRequest.packet.id.length + 1) };
const directory = await mkdtemp(base + 'dsh-recovery-timing-');
const started = performance.now();
const emit = row => console.log(JSON.stringify({ event: 'dsh-recovery-timing', ...row }));
emit({ phase: 'prepare_start', mode, providerCalls: 0, outputDirectory: directory });
const nativeDsh = await prepareDshLoop(process.cwd(), { sessionPolicy });
const preparationMs = Math.round(performance.now() - started);
emit({ phase: 'prepare_complete', preparationMs });
let repeatedPreparationMs = null;
if (mode === '--reuse') {
  const repeatedStarted = performance.now();
  const repeated = await prepareDshLoop(process.cwd());
  repeatedPreparationMs = Math.round(performance.now() - repeatedStarted);
  assert.equal(repeated, nativeDsh, 'Content-identical preparation must reuse the actual runtime');
  assert.ok(Object.isFrozen(repeated), 'Shared runtime interface cannot be mutated by a caller');
  emit({ phase: 'repeat_prepare_complete', repeatedPreparationMs, sameRuntime: true });
}
const forbidden = () => assert.fail('Diagnostic must never call a Provider or bill an attempt');
async function recover(lane) {
  const journal = openProductionStore(':memory:', { runId: 'timing-' + lane, recipeHash: hash({ mode, lane, binding }) });
  const trace = { lane, bridges: [], actualInputMatched: false };
  let loopStart;
  const dsh = { ...nativeDsh, async run(q) {
    loopStart = performance.now();
    trace.maxWallMs = q.limits.maxWallMs;
    emit({ phase: 'loop_start', lane, maxWallMs: trace.maxWallMs });
    try {
      const result = await nativeDsh.run({ ...q, async callModel(...args) {
        const entered = performance.now();
        const event = { beforeBridgeMs: Math.round(entered - loopStart) };
        trace.bridges.push(event);
        emit({ phase: 'saved_output_bridge_enter', lane, ...event });
        const result = await q.callModel(...args);
        event.bridgeMs = Math.round(performance.now() - entered);
        return result;
      } });
      if (sessionPolicy === 'phased-v1') {
        assert.equal(result.lifecycle.policyHash, nativeDsh.sessionPolicy.hash);
        assert.equal(result.lifecycle.finalCommandObserved, true);
        assert.equal(result.lifecycle.status, 'completed');
        trace.lifecycle = result.lifecycle;
      }
      return result;
    } catch (error) {
      if (error.lifecycle) trace.lifecycle = error.lifecycle;
      throw error;
    } finally {
      trace.loopMs = Math.round(performance.now() - loopStart);
      const last = trace.bridges.at(-1);
      trace.afterBridgeMs = last ? trace.loopMs - last.beforeBridgeMs - last.bridgeMs : null;
    }
  } };
  const store = { acquire(id, body) {
    assert.equal(id, fullRoleId);
    assert.equal(hash(body), failedStep.input_hash, 'Actual production input must match');
    trace.actualInputMatched = true;
    return journal.acquire(id, body);
  }, finish: (lease, value) => journal.finish(lease, value), release: lease => journal.release(lease) };
  try {
    const runtime = createFactionStructuredReviewRuntimeV1({ input, store, dsh, outputContract: contract,
      executionPolicy: { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
        allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
        encryptedRawQuarantineAvailable: false },
      runtime: { role: forbidden }, providerAdapter: { complete: forbidden }, priceUsage: forbidden, egressBinding: {},
      capabilityReceipt: capabilities.catalogueReview, includeSharedScenarioSources: true,
      completeReviewImports: [evidence], coverageAddressBinding: binding.coverageAddress,
      completeReviewImportBinding: binding.reviewImport });
    const result = await runtime.role(request);
    assert.deepEqual(result.output.coverage.map(row => row.recommendationIndices), [[5], [5]]);
    assert.equal(result.completeReviewImportProof.providerCalls, 0);
    trace.status = 'recovered';
    trace.outputHash = result.hash;
  } catch (error) {
    trace.status = 'failed';
    trace.code = error.code || (error instanceof assert.AssertionError ? 'DIAGNOSTIC_ASSERTION_FAILED' : 'DIAGNOSTIC_FAILURE');
    trace.stackFrames = String(error.stack).split('\n').slice(1, 7).map(line => line.replaceAll(process.cwd(), '<root>'));
  } finally {
    assert.equal(journal.summary().calls, 0);
    journal.close();
  }
  emit({ phase: 'loop_complete', ...trace });
  return trace;
}
const lanes = parallel ? await Promise.all([recover(0), recover(1)]) : [await recover(0)];
assert.equal(hash(attempts()), beforeHash); source.close();
const report = seal({ schema: 'actual_dsh_recovery_timing_diagnosis_v1', mode, sessionPolicy, originRunId, failedRunId,
  originAttemptId: evidence.attempt.id, originalCandidateHash: evidence.candidate.hash,
  actualRoleInputHash: failedStep.input_hash, dshBindingHash: nativeDsh.binding.hash,
  preparationMs, repeatedPreparationMs, totalMs: Math.round(performance.now() - started), lanes,
  parallelUsesTwoCopiesOfSameActualZergRecovery: parallel,
  exactOriginalTerranZergPairReplayed: false, providerCalls: 0, originalAttemptsUnchanged: true,
  runtimeAccepted: false, trainingTruth: false });
await writeFile(directory + '/report.json', JSON.stringify(report, null, 2), { flag: 'wx' });
emit({ phase: 'report', reportPath: directory + '/report.json', hash: report.hash,
  observations: lanes.map(({ lane, status, code, loopMs }) => ({ lane, status, code, loopMs })), providerCalls: 0 });
if (lanes.some(row => row.code === 'DIAGNOSTIC_ASSERTION_FAILED' || !row.actualInputMatched)) process.exitCode = 1;
