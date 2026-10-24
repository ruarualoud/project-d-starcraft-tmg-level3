import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as teach from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
  const state = d.teachFramework.state;
  const paid = d.publicOutputs.filter(o => o.roundKind === 'teach_framework_investigate');
  assert.equal(paid.at(-1).outputHash, paid.at(-2).outputHash, 'Actual repeated output is the regression source');
  const ids = state.synthesis.answers.filter(a => a.disposition === 'unresolved').map(a => a.questionId);
  const validate = teach.validateRosterTeachInvestigationProgressV1 || (() => {});
  assert.throws(() => validate(paid.at(-1).sanitizedOutput, state, ids),
    /ROSTER_TEACH_INVESTIGATION_OUTSIDE_PENDING/, 'An identical old batch that queries already answered questions must enter semantic repair before tool execution');
  report.checks.push('actual_A_paid_duplicate_batch_rejected_before_reexecuting_answered_queries');
  const first = state.investigation.operations.find(o => o.questionId === ids[0] && o.completed);
  const duplicate = { queries: [{ questionId: first.questionId, queryId: 'repeated', kind: first.request.kind,
    toolRequestJson: JSON.stringify(first.request.toolRequest) }], unresolved: [] };
  assert.throws(() => validate(duplicate, state, ids), /ROSTER_TEACH_INVESTIGATION_UNCHANGED_QUERY/);
  const next = { queries: [{ questionId: ids[0], queryId: 'inspect-relevant-current-branch', kind: 'inspect',
    toolRequestJson: JSON.stringify({ branchIdRef: first.queryId }) }], unresolved: [] };
  assert.doesNotThrow(() => validate(next, state, ids));
  assert.doesNotThrow(() => validate({ queries: [], unresolved: [{ questionId: ids[1],
    missingEvidence: 'specific unknown', whyNotCurrentlyQueryable: 'explicit remaining limitation' }] }, state, ids));
  const schema = teach.rosterTeachInvestigationContractV1(ids).providerSchema;
  assert.deepEqual(schema.properties.queries.items.properties.questionId.enum, ids);
  assert.deepEqual(schema.properties.unresolved.items.properties.questionId.enum, ids);
  report.checks.push('current_pending_question_schema_and_no_duplicate_execution_preserve_inspection_and_honest_unknown');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
