// One separately authorized A/B recovery each. Existing drafts, current failed
// physical request and original prompt; no new investigation quota or games.
import { readFile, writeFile, rename, open } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [base, arm, mode] = process.argv.slice(2);
if (!base || !['A', 'B'].includes(arm)) throw Error('EXPLICIT_BASE_AND_ARM_REQUIRED');
if (mode !== undefined && mode !== '--resume-preflight') throw Error('UNKNOWN_RECOVERY_MODE');
const dest = base + '/common-v217-' + arm + '-offline-recovery-progress.private.json';
let preflight;
if (mode === '--resume-preflight') {
  preflight = JSON.parse(await readFile(dest, 'utf8'));
  if (preflight.status !== 'needs_inspection_no_blind_retry'
    || preflight.failure !== 'SECOND_WORKSPACE_HOST_EXISTS' || preflight.hostPid) {
    throw Error('ONLY_UNSENT_HOST_PREFLIGHT_CAN_RESUME');
  }
} else await (await open(dest, 'wx', 0o600)).close();
const cfg = JSON.parse(await readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === arm);
const status = { version: 217, arm, pid: process.pid, startedAt: new Date().toISOString(),
  status: 'checking_exact_stop', timeoutMs: 600000, maximumPhysicalRetries: 1,
  noAutomaticRetry: true, noGameLaunch: true, noNewInvestigationQuota: true, historyReset: false };
if (preflight) status.preflightHistory = [preflight];
const pause = ms => new Promise(r => setTimeout(r, ms));
const read = async () => JSON.parse(await readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
const save = async () => { status.updatedAt = new Date().toISOString();
  await writeFile(dest + '.tmp', JSON.stringify(status, null, 2), { mode: 0o600 }); await rename(dest + '.tmp', dest); };
function command(pid) {
  try { return execFileSync('/bin/ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }); }
  catch (error) { if (error.status === 1) return ''; throw error; }
}
async function stopOwnedHost(pid) {
  const cmd = command(pid); if (!cmd.trim()) return;
  if (!cmd.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
    || !cmd.includes('--data-directory=' + row.dataDirectory)) throw Error('HOST_IDENTITY_CHANGED');
  process.kill(pid, 'SIGTERM');
  for (let i = 0; ; i++) {
    try { process.kill(pid, 0); } catch (error) { if (error.code === 'ESRCH') return; throw error; }
    if (i >= 60) throw Error('OWNED_HOST_DID_NOT_EXIT'); await pause(500);
  }
}
try {
  const gate = JSON.parse(await readFile(base + '/common-v217-explicit-recovery-green.private.json', 'utf8'));
  if (!gate.ok) throw Error('SCOPED_GATE_NOT_PASSED');
  const priorFile = arm === 'A' ? '/common-v215-A-teach-network-resume-progress.private.json'
    : '/common-v212-B-plan-revision-progress.private.json';
  const prior = JSON.parse(await readFile(base + priorFile, 'utf8'));
  const before = await read(), plan = JSON.parse(before.planSerialized), failed = before.providerDispatches.at(-1);
  const expected = arm === 'A' ? 'roster-teach-framework-7049a529-ab8d-4642-8407-09c570410db6'
    : 'roster-revision-d4b34333-db84-4147-8b1c-279e507a2064';
  assert.equal(failed.requestId, expected); assert.equal(failed.planHash, plan.planHash);
  assert.equal(failed.status, arm === 'A' ? 'response_rejected' : 'ambiguous');
  if (arm === 'A') { assert.equal(failed.rejection.httpStatus, 503); assert.equal(before.teachFramework.status, 'failed'); }
  else assert.equal(before.status, 'failed');
  if (before.progress.activeRoundKind || before.planReview?.status === 'running'
    || before.providerDispatches.some(d => d.retryOfRequestId === failed.requestId)
    || before.publicOutputs.some(o => o.contextHash === failed.contextHash)) throw Error('STOP_ALREADY_ADVANCED');
  Object.assign(status, { originalRequestId: failed.requestId, originalCostStatus: failed.costStatus,
    originalContextHash: failed.contextHash, originalRequestBodyHash: failed.requestBodyHash,
    baselinePlanHash: plan.planHash, baselinePlanVersion: plan.planVersion,
    baselineUsage: { calls: before.usage.calls, units: before.usage.totalUnits },
    previousHostPid: prior.hostPid }); await save();
  // Only terminal workspaces may be replaced; never kill a slow active request.
  if (command(prior.hostPid).trim()) {
    const r = await fetch(prior.origin + prior.apiPrefix + '/sessions/' + row.sessionId, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error('PRIOR_HOST_UNAVAILABLE');
    const s = (await r.json()).session;
    if (s.status === 'running' || s.teachFramework?.status === 'running' || s.progress?.activeRoundKind) throw Error('PRIOR_HOST_NOT_IDLE');
    await stopOwnedHost(prior.hostPid);
  }
  const lines = execFileSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n');
  if (lines.some(l => l.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
    && l.includes('--data-directory=' + row.dataDirectory))) throw Error('SECOND_WORKSPACE_HOST_EXISTS');
  const log = base + '/' + arm + '/workspace-host-v217-offline-recovery';
  const out = await open(log + '.stdout.private.log', 'wx', 0o600), err = await open(log + '.stderr.private.log', 'wx', 0o600);
  const host = spawn('/usr/local/bin/node', ['scripts/serve-ticket-27-slice-271-roster-workspace-v1.mjs',
    '--data-directory=' + row.dataDirectory, '--fixture-root=' + cfg.fixtureRoot, '--web-root=' + cfg.webRoot,
    '--map-configuration-file=' + cfg.mapConfigurationFile, '--enable-roster-flash', '--offline-recovery-600s'],
  { cwd: cfg.worktree, detached: true, stdio: ['ignore', out.fd, err.fd] });
  await new Promise((resolve, reject) => { host.once('spawn', resolve); host.once('error', reject); });
  host.unref(); await out.close(); await err.close(); status.hostPid = host.pid; status.status = 'starting_offline_host'; await save();
  let entry;
  for (let i = 0; !entry; i++) {
    process.kill(host.pid, 0); if (i > 180) throw Error('HOST_START_OBSERVATION_TIMEOUT');
    entry = (await readFile(log + '.stdout.private.log', 'utf8')).split('\n').flatMap(l => {
      try { const v = JSON.parse(l); return v.schemaVersion === 'ticket27_slice271_roster_workspace_server_entry_v1' ? [v] : []; }
      catch { return []; }
    }).at(-1); if (!entry) await pause(1000);
  }
  assert.equal(entry.liveRoomLaunchAttached, false); assert.equal(entry.offlineRecovery600s, true);
  assert.equal(entry.dataDirectory, row.dataDirectory);
  Object.assign(status, { origin: entry.origin, apiPrefix: entry.apiPrefix });
  const request = { ...(arm === 'B' ? JSON.parse(await readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8')) : {}),
    expectedPlanHash: plan.planHash, expectedRequestId: failed.requestId,
    authorizeOneAdditionalDispatchRetry: true, automaticNetworkRecovery: false };
  await writeFile(base + '/' + arm + '/v217-offline-recovery-request.private.json', JSON.stringify(request, null, 2), { flag: 'wx', mode: 0o600 });
  status.status = 'submitted_once'; await save();
  try {
    const r = await fetch(entry.origin + entry.apiPrefix + '/sessions/' + row.sessionId
      + (arm === 'A' ? '/teach-framework' : '/revise'), { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw Error('HTTP_' + r.status + ':' + (await r.text()).slice(0, 700));
    await r.body?.cancel();
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    status.observationTimeout = true; await save(); // observe only; never resubmit
  }
  for (;;) {
    process.kill(host.pid, 0);
    const current = await read(), updated = JSON.parse(current.planSerialized), teach = current.teachFramework;
    const retries = current.providerDispatches.filter(d => d.retryOfRequestId === failed.requestId);
    const added = current.providerDispatches.slice(before.providerDispatches.length);
    Object.assign(status, { status: 'observing_existing_operation', workspaceStatus: current.status,
      teachStatus: teach.status, teachPhase: teach.state.phase, planVersion: updated.planVersion, planHash: updated.planHash,
      newCalls: current.usage.calls - before.usage.calls, newUnits: current.usage.totalUnits - before.usage.totalUnits,
      cumulativeUsage: { calls: current.usage.calls, units: current.usage.totalUnits },
      retryDispatch: retries.map(d => ({ requestId: d.requestId, status: d.status, costStatus: d.costStatus,
        contextUnchanged: d.contextHash === failed.contextHash, requestBodyUnchanged: d.requestBodyHash === failed.requestBodyHash })),
      newDispatches: added.map(d => ({ requestId: d.requestId, kind: d.roundKind, status: d.status,
        costStatus: d.costStatus, usage: d.usage, rejection: d.rejection, transportFailure: d.transportFailure })),
      unresolved: teach.state.synthesis?.answers.filter(a => a.disposition === 'unresolved').map(a => a.questionId),
      investigationRounds: teach.state.investigation?.rounds.length });
    const terminal = arm === 'A' ? ['completed', 'failed', 'cancelled'].includes(teach.status)
      : ['planned', 'failed', 'cancelled'].includes(current.status);
    if (terminal) {
      assert.deepEqual(current.providerDispatches.slice(0, before.providerDispatches.length), before.providerDispatches);
      assert.deepEqual(updated.rosterCandidate, plan.rosterCandidate);
      assert.deepEqual(updated.openingDeploymentSchedule, plan.openingDeploymentSchedule);
      Object.assign(status, { status: arm === 'A' ? teach.status : current.status,
        failure: arm === 'A' ? teach.failure : current.failure, oldDispatchesAndFeesPreserved: true,
        rosterAndScheduleUnchanged: true, finishedAt: new Date().toISOString() });
      await save(); await stopOwnedHost(host.pid); status.runtimeHostLeftRunning = false; await save(); break;
    }
    await save(); await pause(20000);
  }
} catch (error) {
  status.status = 'needs_inspection_no_blind_retry'; status.failure = String(error.message).slice(0, 1000); await save();
}
