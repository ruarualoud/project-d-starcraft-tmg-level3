// A completed real B investigation must be reviewable without replaying any
// scenario/query or discarding the old paid synthesis. Scripted Provider only.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as entry from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';
import { runRosterTeachFrameworkSessionV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [draftPath, reportPath] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0, checks: [] };
const started = Date.now();
const progress = stage => console.log(JSON.stringify({ stage, elapsedMs: Date.now() - started }));
try {
  assert.equal(typeof entry.beginRosterTeachSynthesisReviewV1, 'function',
    'Completed Teach lacks a bounded synthesis-only continuation; do not restart investigation');
  const original = d.teachFramework.state, plan = JSON.parse(d.planSerialized);
  const context = d.teachFramework.context;
  const evidenceHash = hash([original.evidence, original.investigation, original.queryRecovery]);
  const reply = { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
    roundKind: 'teach_framework_synthesis', ...structuredClone(original.synthesisRaw) };
  let dispatches = 0, lastRequest;
  const laboratory = new Proxy({
    describeQueryContext: () => structuredClone(context.queryContext),
    proveMutationZero: () => structuredClone(original.mutationZeroProof),
  }, { get(target, key) {
    if (key in target) return target[key];
    return () => { throw Error('SYNTHESIS_ONLY_EXECUTED_NATIVE_OR_QUERY:' + String(key)); };
  } });
  const input = state => ({ sessionId: d.sessionId, plan, context, state, laboratory,
    deliberation: { async deliberate(request) {
      dispatches++; lastRequest = request;
      assert.equal(request.roundKind, 'teach_framework_synthesis');
      assert(request.promptNodes.some(n => n.kind === 'numeric_citation_repair_context'),
        'The retained wrong control reference needs actual local repair feedback');
      assert(request.promptNodes.some(n => n.kind === 'question_evidence_reconciliation'));
      return { output: structuredClone(reply), receipt: { scripted: true, paidProviderCall: false } };
    } }, onCheckpoint: async () => {} });
  const state = structuredClone(original);
  progress('captured_B_loaded');
  entry.beginRosterTeachSynthesisReviewV1(state);
  assert.equal(hash(state.synthesisRaw), hash(original.synthesisRaw), 'Entry must retain current paid reply');
  assert.equal(state.investigation.completed, true);
  await runRosterTeachFrameworkSessionV1(input(state));
  assert.equal(dispatches, 1);
  assert.equal(state.synthesisReview.status, 'completed');
  assert.equal(hash([state.evidence, state.investigation, state.queryRecovery]), evidenceHash);
  assert.equal(hash(state.synthesisHistory.at(-1).raw), hash(original.synthesisRaw));
  assert.equal(state.applicationStatus, 'proposed_not_applied');
  assert.throws(() => entry.beginRosterTeachSynthesisReviewV1(state), /SYNTHESIS_REVIEW_UNAVAILABLE/);
  report.checks.push('one_scripted_summary_zero_native_queries_old_history_preserved_duplicate_denied');
  progress('one_summary_passed');
  // Simulate a crash after saving the paid result metadata but before the new
  // synthesis is applied. The exact retained output must finish with no resend.
  const interrupted = structuredClone(original);
  entry.beginRosterTeachSynthesisReviewV1(interrupted);
  const run = input(interrupted);
  run.onCheckpoint = async saved => {
    if (saved.calls.length > original.calls.length && saved.synthesisReview.status !== 'completed')
      throw Error('TEST_SAVED_PAID_REPLY_INTERRUPT');
  };
  await assert.rejects(runRosterTeachFrameworkSessionV1(run), /TEST_SAVED_PAID_REPLY_INTERRUPT/);
  assert.equal(dispatches, 2);
  const retainedPublicOutputs = [{ roundKind: 'teach_framework_synthesis',
    contextHash: lastRequest.contextHash, sanitizedOutput: structuredClone(reply) }];
  await runRosterTeachFrameworkSessionV1({ ...input(interrupted), retainedPublicOutputs,
    deliberation: { deliberate: () => { throw Error('RETAINED_REPLY_WAS_RESENT'); } } });
  assert.equal(interrupted.synthesisReview.status, 'completed');
  assert.equal(hash([interrupted.evidence, interrupted.investigation, interrupted.queryRecovery]), evidenceHash);
  report.checks.push('interrupted_paid_reply_reused_with_zero_resend');
  progress('paid_reply_resume_passed');
  // A malformed completed model answer consumes the one review allowance;
  // repeating the service run cannot silently open a fresh correction cycle.
  const invalid = structuredClone(original);
  entry.beginRosterTeachSynthesisReviewV1(invalid);
  let invalidCalls = 0;
  const broken = { ...input(invalid), deliberation: { async deliberate() {
    invalidCalls++; return { output: {}, receipt: { scripted: true } };
  } } };
  await assert.rejects(runRosterTeachFrameworkSessionV1(broken));
  assert.equal(invalidCalls, 1);
  await assert.rejects(runRosterTeachFrameworkSessionV1(broken), /SYNTHESIS_REVIEW_CALL_LIMIT/);
  assert.equal(invalidCalls, 1);
  assert.equal(hash(invalid.synthesisRaw), hash(original.synthesisRaw));
  report.checks.push('malformed_completed_reply_cannot_reset_one_call_limit_or_replace_old_summary');
  report.scriptedProviderCalls = dispatches + invalidCalls;
  report.elapsedMs = Date.now() - started;
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
