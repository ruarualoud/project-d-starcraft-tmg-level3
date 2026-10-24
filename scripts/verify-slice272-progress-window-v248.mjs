import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { rosterTeachInvestigationWindowV1 } from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const state = { investigationPolicyVersion: 'evidence_led_issue_progress_v1',
  agenda: { questions: [{ questionId: 'route' }] },
  investigation: { rounds: [], operations: [], evidence: [] } };
const append = (id, value, unknown = false) => {
  state.investigation.rounds.push({ completed: true, output: { queries: [{ queryId: id, questionId: 'route' }] } });
  state.investigation.operations.push({ queryId: id, completed: true,
    request: { kind: 'math', toolRequest: { inputs: [value] } } });
  state.investigation.evidence.push({ challengeId: id, questionId: 'route',
    status: unknown ? 'unknown' : 'advisory',
    ...(unknown ? { unknownReasonCode: 'CAPABILITY_NOT_IMPLEMENTED' } : { sourceReceipt: { result: value } }) });
};
const checks = [], failures = [];
const check = (name, fn) => { try { fn(); checks.push(name); } catch(e) { failures.push({ name, message: e.message }); } };
append('one', 1); append('two', 2); append('three', 3);
check('third new fact permits a dependent fourth batch', () => assert.equal(rosterTeachInvestigationWindowV1(state).limit, 4));
append('same_fact_renamed', 3); append('same_fact_renamed_again', 3);
check('renamed identical results do not manufacture progress', () => assert.equal(rosterTeachInvestigationWindowV1(state).limit, 5));
state.investigation.rounds = []; state.investigation.operations = []; state.investigation.evidence = [];
append('missing_one', 9, true); append('missing_two', 10, true);
check('capability failures stop investigation and remain visible', () => {
  const window = rosterTeachInvestigationWindowV1(state);
  assert.equal(window.limit, 2); assert.equal(window.progress.capabilityGaps.length, 2);
});
const result = { status: failures.length ? 'fail' : 'pass', checks, failures, providerCalls: 0 };
await fs.writeFile(process.argv[2] + `/progress-window-v248-${result.status}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result)); process.exitCode = failures.length ? 1 : 0;
