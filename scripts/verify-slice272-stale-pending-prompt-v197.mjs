import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preserveRosterTeachPendingInvestigationPromptV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
const report = { providerCalls: 0, nativeQueryExecutions: 0, sourceDraftWrites: 0 };
try {
  const state = d.teachFramework.state;
  assert(state.replyCorrections.some(r => r.kind === 'teach_framework_investigate' && r.status === 'pending'));
  assert.equal(state.phase, 'completed');
  const n = state.investigation.rounds.length;
  assert.equal(preserveRosterTeachPendingInvestigationPromptV1(state,
    { completedBeforeRun: true, initialRoundCount: n, roundIndex: n }), false,
  'A historical pending reply must not suppress the current tool catalog in a fresh completed-run continuation');
  assert.equal(preserveRosterTeachPendingInvestigationPromptV1(state,
    { completedBeforeRun: false, initialRoundCount: n, roundIndex: n }), true,
  'An interrupted exact first pending round retains its original prompt for paid-reply revalidation');
  assert.equal(preserveRosterTeachPendingInvestigationPromptV1(state,
    { completedBeforeRun: false, initialRoundCount: n, roundIndex: n + 1 }), false,
  'Later dependent rounds always receive current tool discovery');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
