// Captured v200 input has a stale payment-unresolved assumption even though
// the same question now has a Native payment success. Verify the production
// role seam separates original hypotheses/history from scoped observations.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { projectRosterTeachRolePromptV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [draftPath, reportPath] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(draftPath, 'utf8'));
const s = d.teachFramework.state, q = 'q-timing-synergy-enabling-order';
const evidence = [...s.evidence, ...s.investigation.evidence,
  ...(s.queryRecovery?.operations.filter(o => o.result).map(o => o.result) || [])];
const nodes = [
  { kind: 'current_plan_and_context', plan: JSON.parse(d.planSerialized), context: d.teachFramework.context },
  { kind: 'framework_and_questions', framework: s.framework, agenda: s.agenda },
  { kind: 'actual_tool_results', evidence, investigation: {
    rounds: s.investigation.rounds.map(r => ({ publicReason: r.output.publicReason, unresolved: r.output.unresolved })),
    operations: s.investigation.operations } },
];
const report = { providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0,
  modelOutcomeValidated: false, checks: [] };
// Resolve only lossless same-prompt references. Do not expand archived receipt
// bodies, and do not format huge object diffs on a failed assertion.
function expand(value, root) {
  if (!value || typeof value !== 'object') return value;
  if (value.kind === 'same_prompt_evidence_reference_v1') {
    const target = value.targetJsonPointer.split('/').slice(1).reduce((v, k) =>
      v[k.replaceAll('~1', '/').replaceAll('~0', '~')], root);
    return expand(target, root);
  }
  return Array.isArray(value) ? value.map(v => expand(v, root))
    : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, expand(v, root)]));
}
try {
  const originalQuestion = s.agenda.questions.find(x => x.questionId === q);
  assert(originalQuestion.scenarioAssumptions.some(x => x.includes('CP payment coverage')));
  assert(evidence.some(e => e.challengeId === q + '-orders-native-action-movement'
    && e.sourceReceipt?.nativeEvents?.some(event => event.type === 'ability_resource_paid')));
  report.checks.push('captured_stale_assumption_and_new_native_payment_coexist');
  const before = hash(nodes), archive = new Map();
  const projected = projectRosterTeachRolePromptV1('teach_framework_synthesis', nodes, archive);
  const rawPacket = projected.find(n => n.kind === 'question_evidence_reconciliation');
  assert(rawPacket, 'Production synthesis must reconcile question hypotheses against their scoped receipts, not resend an unclassified historical unresolved list');
  const packet = expand(rawPacket, projected);
  const question = packet.questions.find(x => x.questionId === q);
  assert.equal(hash(question.originalQuestion), hash(originalQuestion));
  assert.equal(question.originalQuestionAuthority, 'model_hypotheses_not_observed_facts');
  assert.equal(packet.modelOwnsStrategicDisposition, true);
  assert.equal(packet.hostAutoAnswersQuestions, false);
  const payment = question.evidence.find(e => e.challengeId === q + '-orders-native-action-movement');
  const native = payment.nativeActionEvidence[0];
  assert.equal(native.nativeEvents.find(e => e.type === 'ability_resource_paid').resourceCost, 1);
  assert.equal(native.conditionalOnParent, true);
  assert.equal(native.provenArrivalHistory, false);
  assert(question.evidence.some(e => e.challengeId === q + '-orders-native-action-assault'
    && e.status === 'unknown'), 'Wrong-phase rejection must remain visible alongside valid payment');
  assert(question.evidence.every(e => (e.questionId || e.challengeId) === q));
  report.checks.push('same_question_current_success_and_phase_rejection_remain_scoped');
  const historical = projected.find(n => n.kind === 'historical_investigation_claims');
  assert.equal(historical.authority, 'past_model_claims_not_current_tool_truth');
  assert.equal(hash(expand(historical.rounds, projected)), hash(nodes[2].investigation.rounds));
  assert.equal(packet.evidenceCount, evidence.length);
  assert.equal(packet.questions.reduce((n, x) => n + x.evidence.length, 0)
    + packet.unassignedEvidence.length, evidence.length);
  assert.equal(packet.questions.reduce((n, x) => n + x.executedQueries.length, 0)
    + packet.unassignedQueries.length, s.investigation.operations.length);
  assert.equal(hash(nodes), before);
  assert(projected.some(n => n.kind === 'current_plan_and_context'), 'Strategic Plan/context remain available');
  report.checks.push('all_questions_queries_history_and_plan_preserved_without_auto_acceptance');
  report.questionCount = packet.questions.length;
  report.evidenceCount = packet.evidenceCount;
  report.projectedBytes = Buffer.byteLength(JSON.stringify(projected));
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
