import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as guide from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
  const query = d.teachFramework.state.investigation.rounds.at(-1).output.queries
    .find(q => q.kind === 'inspect' && JSON.parse(q.toolRequestJson).queryKind);
  assert(query, 'Use the actual paid B request that was silently treated as inspection');
  const validate = guide.validateRosterTeachInspectionRequestV1 || (() => {});
  assert.throws(() => validate(JSON.parse(query.toolRequestJson)),
    /ROSTER_TEACH_INSPECTION_DOES_NOT_EXECUTE_QUERY/, 'A declared native query must not be silently ignored by inspect');
  assert.doesNotThrow(() => validate({ branchIdRef: 'existing-branch' }));
  assert.doesNotThrow(() => validate({ branchIdRef: '', queryKind: '', argumentsJson: '', subjectUnitIds: [] }));
  assert.throws(() => validate({ branchIdRef: 'existing-branch', spec: { phase: 'movement' } }),
    /ROSTER_TEACH_INSPECTION_DOES_NOT_EXECUTE_QUERY/);
  report.checks.push('actual_B_paid_misrouted_control_query_rejected_before_inspection_empty_legacy_placeholders_supported');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
