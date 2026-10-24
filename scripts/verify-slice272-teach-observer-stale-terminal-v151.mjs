// Concrete v151 A observation timeout read the old failed draft while the host
// was accepting the new run. No server, Provider or original draft mutation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const [base, reportPath] = process.argv.slice(2);
const progress = JSON.parse(await readFile(base + '/common-v151-A-teach-network-resume-progress.private.json', 'utf8'));
const source = await readFile(new URL('./run-slice272-current-plan-teach-v149.mjs', import.meta.url), 'utf8');
const checks = [];
try {
  assert.equal(progress.observationTimeout, true);
  assert.equal(progress.status, 'failed');
  assert.ok(Date.parse(progress.failure.at) < Date.parse(progress.startedAt));
  // Test the launcher's actual terminal predicate, not a separately restated
  // condition. Its line is deliberately a pure expression.
  const expression = source.match(/if\(([^\n]+)\)break;await pause\(20000\);/u)?.[1];
  assert.ok(expression, 'observer terminal predicate must be found');
  const predicate = new Function('teach', 'current', 'status', 'resumeNetwork', 'terminalObservation', 'return (' + expression + ')');
  const terminalObservation = (await import('./lib/teach-run-observation-v1.mjs').catch(e => {
    if (e.code === 'ERR_MODULE_NOT_FOUND') return { isCurrentTeachTerminalV1: () => false }; throw e;
  })).isCurrentTeachTerminalV1;
  const state = { status: progress.status, failure: progress.failure };
  const observer = { ...progress, baselineFailureAt: progress.failure.at, observedCurrentRun: false };
  assert.equal(predicate(state, { updatedAt: progress.startedAt }, observer, true, terminalObservation), false,
    'previous run failure after a POST observation timeout is not current-run termination');
  const failed = { status: 'failed', failure: { at: new Date(Date.parse(progress.startedAt) + 1000).toISOString() } };
  assert.equal(predicate(failed, { updatedAt: failed.failure.at }, observer, true, terminalObservation), true);
  assert.equal(predicate({ status: 'running' }, {}, observer, true, terminalObservation), false);
  assert.equal(predicate({ status: 'completed' }, { updatedAt: failed.failure.at }, observer, true, terminalObservation), true);
  checks.push('old_failed_record_is_not_terminal_new_failed_or_completed_is_terminal_running_is_not');
  await writeFile(reportPath, JSON.stringify({ ok: true, checks, providerCalls: 0, hostRestarts: 0 }, null, 2), { mode: 0o600 });
  console.log('TEACH_OBSERVER_STALE_TERMINAL_V151_PASS');
} catch(error) {
  await writeFile(reportPath, JSON.stringify({ ok: false, checks, failure: error.message,
    providerCalls: 0, hostRestarts: 0 }, null, 2), { mode: 0o600 }); throw error;
}
