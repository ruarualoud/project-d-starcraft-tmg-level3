// Actual saved investigation/recovery records through the production synthesis
// projection. No model, Rules query, invented strategic verdict or new room.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { reconcileRosterTeachSynthesisNodesV1 } from '../packages/roster-strategist/roster-teach-fact-probe-v1.mjs';

const [baseArg, mode = 'actual'] = process.argv.slice(2);
assert(['actual', 'ambiguity', 'recovery'].includes(mode));
const base = path.resolve(baseArg), sourceFile = path.join(base,
  'A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json');
const before = await fs.stat(sourceFile), source = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const state = source.teachFramework.state, output = await fs.mkdtemp(path.join(base, 'question-evidence-v318-'));
const questions = state.agenda.questions, ids = new Set(questions.map(q => q.questionId));
const originals = state.evidence, later = state.investigation.evidence;
const operations = state.investigation.operations;
const recoveries = state.queryRecovery.operations.filter(op => op.result);
const baseNodes = [
  { kind: 'framework_and_questions', framework: state.framework, agenda: state.agenda },
  { kind: 'actual_tool_results', evidence: [...originals, ...later, ...recoveries.map(op => op.result)],
    investigation: { operations, rounds: state.investigation.rounds },
    queryRecovery: { operations: recoveries } },
];
const report = { mode, pass: false, output, providerCalls: 0, nativeActions: 0,
  finalAdmission: false, strategyImprovementProved: false, cases: [] };
try {
  const beforeHash = hash(baseNodes);
  if (mode === 'actual') {
    const projected = reconcileRosterTeachSynthesisNodesV1(baseNodes);
    const view = projected.find(n => n.kind === 'question_evidence_reconciliation');
    const missed = [];
    for (const receipt of later) {
      const matching = operations.filter(op => op.queryId === receipt.challengeId && ids.has(op.questionId));
      if (new Set(matching.map(op => op.questionId)).size !== 1) continue;
      const q = view.questions.find(q => q.questionId === matching[0].questionId);
      if (!q.evidence.includes(receipt)) missed.push({ questionId: q.questionId,
        queryId: receipt.challengeId, status: receipt.status,
        sourceStatus: receipt.sourceReceipt?.resultStatus || null,
        wasUnassigned: view.unassignedEvidence.includes(receipt) });
    }
    report.misplaced = missed;
    assert.equal(missed.length, 0, 'Executed query receipts must reach their actual owning question, not unassigned history');
    for (const q of view.questions) {
      const original = originals.find(e => e.challengeId === q.questionId);
      if (original) assert(q.evidence.includes(original), 'Later success must not erase historical failure');
      report.cases.push({ questionId: q.questionId, receiptCount: q.evidence.length,
        successful: q.evidence.filter(e => ['ok', 'advisory'].includes(e.status) || e.sourceReceipt?.resultStatus === 'ok').length });
    }
  } else if (mode === 'recovery') {
    const view = reconcileRosterTeachSynthesisNodesV1(baseNodes).find(n => n.kind === 'question_evidence_reconciliation');
    for (const op of recoveries.filter(op => ids.has(op.questionId))) {
      const q = view.questions.find(q => q.questionId === op.questionId);
      assert(q.evidence.includes(op.result), `Recovered receipt lost its owning question: ${op.queryId}`);
      assert(q.executedQueries.includes(op), 'The exact recovery request and limitations must remain attached');
      report.cases.push({ questionId: q.questionId, queryId: op.queryId, status: op.result.status });
    }
  } else {
    const selected = questions.slice(0, 2);
    const receipts = [
      { challengeId: 'ambiguous-id', status: 'advisory' },
      { challengeId: 'query-unassigned', status: 'unknown' },
      { challengeId: 'owned-query', questionId: 'explicit-unknown-question', status: 'ok' },
      { challengeId: 'owned-query', status: 'advisory' },
      { challengeId: selected[0].questionId, status: 'unknown' },
    ];
    const ops = [
      { queryId: 'ambiguous-id', questionId: selected[0].questionId },
      { queryId: 'ambiguous-id', questionId: selected[1].questionId },
      { queryId: 'owned-query', questionId: selected[0].questionId },
    ];
    const view = reconcileRosterTeachSynthesisNodesV1([
      { kind: 'framework_and_questions', agenda: { questions: selected, coverage: [] } },
      { kind: 'actual_tool_results', evidence: receipts, investigation: { operations: ops, rounds: [] } },
    ]).find(n => n.kind === 'question_evidence_reconciliation');
    for (const receipt of receipts.slice(0, 3)) assert(view.unassignedEvidence.includes(receipt));
    const first = view.questions.find(q => q.questionId === selected[0].questionId);
    assert(first.evidence.includes(receipts[3])); assert(first.evidence.includes(receipts[4]));
    assert.equal(view.hostAutoAnswersQuestions, false);
    report.cases = ['ambiguous_id_not_guessed', 'unknown_id_not_guessed',
      'explicit_invalid_owner_not_reinterpreted', 'later_success_and_original_failure_both_retained'];
  }
  assert.equal(hash(baseNodes), beforeHash, 'Projection cannot rewrite original receipts or their identity');
  report.pass = true;
} catch (error) { report.error = String(error.message).slice(0, 2000); report.code = error.code || null; }
assert.equal((await fs.stat(sourceFile)).mtimeMs, before.mtimeMs);
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report)); process.exitCode = report.pass ? 0 : 1;
