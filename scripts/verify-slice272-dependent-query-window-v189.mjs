import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as guide from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
const state = structuredClone(draft.teachFramework.state);
const questionId = 'q-timing-synergy-enabling-order';
const report = { providerCalls: 0, roomActions: 0, sourceDraftWrites: 0 };
try {
  assert.equal(state.investigation.capabilityContinuation.maximumAdditionalBatches, 1);
  const before = JSON.stringify({ calls: state.calls, repairs: state.repairs, rounds: state.investigation.rounds,
    evidence: state.investigation.evidence, synthesis: state.synthesis });
  const start = state.investigation.rounds.length;
  if (guide.resumeRosterTeachDependentQueriesV1) guide.resumeRosterTeachDependentQueriesV1(state, [questionId]);
  const window = guide.rosterTeachInvestigationWindowV1?.(state) || {
    limit: state.investigation.capabilityContinuation.startRound + 1 };
  assert.equal(window.limit - start, 3, 'A constructed scene/inspection must have a bounded next turn to use the returned domain, not close after one batch');
  assert.deepEqual(window.questionIds, [questionId]);
  assert.equal(state.investigation.completed, false);
  assert.equal(before, JSON.stringify({ calls: state.calls, repairs: state.repairs, rounds: state.investigation.rounds,
    evidence: state.investigation.evidence, synthesis: state.synthesis }), 'Do not reset or erase paid work');
  assert.equal(state.synthesis.answers.find(a => a.questionId === questionId).disposition, 'unresolved');
  state.investigation.completed = true;
  assert.throws(() => guide.resumeRosterTeachDependentQueriesV1(state, [questionId]), /DEPENDENCY_CONTINUATION_UNAVAILABLE/);
  const bad = structuredClone(draft.teachFramework.state);
  assert.throws(() => guide.resumeRosterTeachDependentQueriesV1(bad, ['q-victory-route-channel-cashability']), /DEPENDENCY_CONTINUATION_UNAVAILABLE/);
  report.ok = true; report.allowedAdditionalBatches = 3; report.oldRoundsPreserved = start;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
