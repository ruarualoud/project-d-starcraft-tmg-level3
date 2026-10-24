import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { applyRosterTeachCandidateParametersV1, recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const op = structuredClone(d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-5af92593ef8720ed363eaabc'));
  const pending = d.teachFramework.state.replyCorrections.findLast(r => r.correction?.code === 'ROSTER_TEACH_CANDIDATE_SCENE_MISMATCH');
  const selection = JSON.parse(pending.correction.previousOutput.toolRequestJson);
  let caught;
  try { applyRosterTeachCandidateParametersV1({ request: op.request, failure: op.currentFailure, selection, inspections: op.inspections }); }
  catch (e) { caught = e; }
  assert.equal(caught?.code, 'ROSTER_TEACH_CANDIDATE_SCENE_MISMATCH');
  assert(caught.message.includes('u-goliath-1') && caught.message.includes('u-marauder-1')
    && caught.message.includes('prerequisite_query'), 'Mismatch feedback must name the requested unit, old option unit and recovery tool step');
  op.completed = false;
  const state = { framework: {}, agenda: { questions: [{ questionId: op.questionId, evidenceRequest: op.originalRequest }] }, evidence: [],
    investigation: { operations: [{ queryId: op.originalQueryId, questionId: op.questionId, request: op.originalRequest }],
      evidence: [{ ...op.currentFailure, challengeId: op.originalQueryId }] }, queryRecovery: { version: 1, operations: [op] } };
  let called = 0;
  await recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, sourceHash: 'a'.repeat(64), completedBeforeRun: false,
    checkpoint: async () => {}, evidencePort: { descriptor: () => ({ descriptorHash: 'b'.repeat(64) }), query: () => { throw Error('NO_QUERY'); } },
    ask: async (_kind, _nodes, _instruction, semantic, options) => {
      called++;
      assert.equal(options.maxAttempts, 3, 'Existing bounded semantic repair must be enabled rather than hardcoded to one reply');
      assert.throws(() => semantic(pending.correction.previousOutput), /SCENE_MISMATCH/);
      return { disposition: 'defer', kind: 'candidate_parameters', toolRequestJson: '{}', edits: [], publicReason: 'Fixture ends after checking repair availability; original question remains unresolved.' };
    } });
  assert.equal(called, 1);
  assert.equal(op.status, 'model_deferred');
  report.checks.push('actual_B_wrong_unit_old_scene_receipt_has_actionable_feedback_and_existing_bounded_semantic_repair_is_enabled_no_native_execution');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
