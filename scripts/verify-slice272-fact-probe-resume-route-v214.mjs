// Actual A v213: old pending feedback switches an interrupted new fact probe
// back to the legacy investigator. No Provider, Native or source draft writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preserveRosterTeachPendingInvestigationPromptV1 as legacy }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, label] = process.argv.slice(2);
const reportPath = base + '/common-v214-fact-probe-resume-' + label + '.private.json';
const reservation = await fs.open(reportPath, 'wx', 0o600); await reservation.close();
const report = { providerCalls: 0, nativeCalls: 0, sourceWrites: 0, checks: [] };
try {
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const row = cfg.rows.find(r => r.arm === 'A');
  const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const original = await fs.readFile(filename, 'utf8'), draft = JSON.parse(original);
  const state = draft.teachFramework.state, dispatch = draft.providerDispatches.at(-1);
  assert.equal(draft.teachFramework.failure.code, 'ROSTER_WORKSPACE_RETRY_REQUEST_CHANGED');
  assert.equal(dispatch.status, 'ambiguous');
  const old = state.replyCorrections.filter(r => r.kind === 'teach_framework_investigate' && r.status === 'pending');
  assert(old.length > 0 && old.every(r => r.baseContextHash !== dispatch.contextHash));
  assert.equal(draft.dispatchRetryAuthorizations.find(r => r.requestId === dispatch.requestId).status, 'authorized');
  const n = state.investigation.rounds.length;
  assert.equal(n, state.investigation.factProbeContinuation.startRound);
  const scope = { completedBeforeRun: false, initialRoundCount: n, roundIndex: n };
  assert.equal(legacy(state, { ...scope, completedBeforeRun: true }), false);
  assert.equal(legacy(state, scope), false,
    'An interrupted explicit fact probe must retain its original fact route, not inherit an unrelated legacy correction');
  const older = structuredClone(state); delete older.investigation.factProbeContinuation;
  assert.equal(legacy(older, scope), true, 'actual legacy recovery remains available outside an explicit fact trial');
  assert.equal(legacy(state, { ...scope, roundIndex: n + 1 }), false);
  assert.equal(await fs.readFile(filename, 'utf8'), original);
  report.checks.push('actual_A_first_and_resumed_fact_probe_route_identical', 'legacy_recovery_unchanged',
    'original_pending_feedback_and_unused_one_retry_authorization_preserved');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
