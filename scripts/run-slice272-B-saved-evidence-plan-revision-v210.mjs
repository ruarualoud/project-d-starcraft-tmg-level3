// One owner-authorized revision through the existing product API. No new
// investigation, review, simulation, roster selection or Room launch.
import { readFile, writeFile, rename, open } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';

const [base, recovery] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
if (recovery !== undefined && recovery !== '--resume-after-context-fix') throw Error('UNKNOWN_RECOVERY_MODE');
const resuming = recovery === '--resume-after-context-fix';
const version = resuming ? 212 : 210;
const cfg = JSON.parse(await readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const dest = base + '/common-v' + version + '-B-plan-revision-progress.private.json';
const reservation = await open(dest, 'wx', 0o600);
await reservation.close();
const status = { version, arm: 'B', pid: process.pid, status: 'checking_saved_evidence',
  startedAt: new Date().toISOString(), noNewInvestigation: true,
  noNewReview: true, noGameLaunch: true, paidHistoryReset: false };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = async () => JSON.parse(await readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
const save = async () => { status.updatedAt = new Date().toISOString();
  await writeFile(dest + '.tmp', JSON.stringify(status, null, 2), { mode: 0o600 });
  await rename(dest + '.tmp', dest); };
try {
  const before = await read(), plan = JSON.parse(before.planSerialized), teach = before.teachFramework;
  const refreshed = JSON.parse(await readFile(base + '/common-v207-B-binding-refresh.private.json', 'utf8'));
  if (refreshed.status !== 'completed' || !refreshed.protectedStateUnchanged
    || refreshed.runtimeHostLeftRunning !== false || before.status !== (resuming ? 'failed' : 'planned')
    || before.progress.activeRoundKind || before.planReview?.status === 'running'
    || plan.planVersion !== 19 || plan.planHash !== '51aa309e1bd986be386a0e84589ea1c3efcdb7f03fd2ef4898c33e3e433a1863'
    || teach.status !== 'completed' || teach.planHash !== plan.planHash
    || teach.state.synthesis.answers.some(answer => answer.disposition === 'unresolved')) {
    throw Error('NOT_EXPECTED_COMPLETED_B_TEACH');
  }
  const pending = before.providerDispatches.filter(d => ['reserved', 'sending', 'sent', 'ambiguous'].includes(d.status)
    && !before.publicOutputs.some(o => o.contextHash === d.contextHash));
  if (pending.length) throw Error('UNRECONCILED_PAID_REQUEST_NO_AUTOMATIC_RETRY');
  if (resuming) {
    const rejected = before.providerDispatches.at(-1);
    const prior = JSON.parse(await readFile(base + '/common-v210-B-plan-revision-progress.private.json', 'utf8'));
    const proof = JSON.parse(await readFile(base + '/common-v211-revision-duplication-green.private.json', 'utf8'));
    if (prior.status !== 'needs_inspection_no_blind_retry'
      || prior.baselinePlanHash !== plan.planHash || !proof.ok
      || before.failure?.code !== 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
      || rejected.status !== 'response_rejected' || rejected.roundKind !== 'revision'
      || rejected.rejection?.contextLengthExceeded !== true
      || before.publicOutputs.some(output => output.contextHash === rejected.contextHash)) throw Error('EXACT_CONTEXT_REJECTION_REQUIRED');
    let command = '';
    try { command = execFileSync('/bin/ps', ['-p', String(prior.hostPid), '-o', 'command='], { encoding: 'utf8' }); }
    catch (error) { if (error.status !== 1) throw error; }
    if (command.trim()) {
      if (!command.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
        || !command.includes('--data-directory=' + row.dataDirectory)) throw Error('OWNED_HOST_IDENTITY_CHANGED');
      process.kill(prior.hostPid, 'SIGTERM');
      for (let n = 0; ; n++) {
        try { process.kill(prior.hostPid, 0); } catch (error) { if (error.code === 'ESRCH') break; throw error; }
        if (n >= 30) throw Error('OWNED_IDLE_HOST_DID_NOT_EXIT');
        await pause(500);
      }
    }
    Object.assign(status, { previousHostPid: prior.hostPid, concreteFix: 'same_prompt_lossless_revision_evidence_v211',
      originalRejectedRequestId: rejected.requestId, originalCostStatus: rejected.costStatus,
      maximumRecoveryRuns: 1, noAutomaticRetryOfThisRecovery: true });
  }
  const processLines = execFileSync('/bin/ps', ['-axo', 'pid=,command='], { encoding: 'utf8' }).split('\n');
  if (processLines.some(line => line.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
    && line.includes('--data-directory=' + row.dataDirectory))) throw Error('EXISTING_WORKSPACE_HOST_REQUIRES_INSPECTION');
  Object.assign(status, { baselinePlanHash: plan.planHash, baselinePlanVersion: plan.planVersion,
    baselineUsage: { calls: before.usage.calls, units: before.usage.totalUnits },
    sourceTeachPlanHash: teach.planHash, maximumSavedEvidenceLookupBatches: 3 });
  await save();
  const logBase = base + '/B/workspace-host-v' + version + '-plan-revision';
  const out = await open(logBase + '.stdout.private.log', 'wx', 0o600);
  const err = await open(logBase + '.stderr.private.log', 'wx', 0o600);
  const host = spawn('/usr/local/bin/node', ['scripts/serve-ticket-27-slice-271-roster-workspace-v1.mjs',
    '--data-directory=' + row.dataDirectory, '--fixture-root=' + cfg.fixtureRoot,
    '--web-root=' + cfg.webRoot, '--map-configuration-file=' + cfg.mapConfigurationFile,
    '--enable-roster-flash'], { cwd: cfg.worktree, detached: true, stdio: ['ignore', out.fd, err.fd] });
  await new Promise((resolve, reject) => { host.once('spawn', resolve); host.once('error', reject); });
  host.unref(); await out.close(); await err.close();
  Object.assign(status, { hostPid: host.pid, status: 'starting_existing_offline_workspace' }); await save();
  let entry;
  while (!entry) {
    process.kill(host.pid, 0);
    entry = (await readFile(logBase + '.stdout.private.log', 'utf8')).split('\n').flatMap(line => {
      try { const value = JSON.parse(line); return value.schemaVersion === 'ticket27_slice271_roster_workspace_server_entry_v1' ? [value] : []; }
      catch { return []; }
    }).at(-1);
    if (!entry) await pause(1000);
  }
  if (entry.liveRoomLaunchAttached !== false || entry.dataDirectory !== row.dataDirectory) throw Error('OFFLINE_BOUNDARY_CHANGED');
  Object.assign(status, { origin: entry.origin, apiPrefix: entry.apiPrefix });
  const targetedClaimPaths = [
    'scoreRoute.routeText', 'scoreRoute.fallbackRouteText', 'publicSummaryText',
    'deploymentConcept.deploymentConceptText', 'deploymentConcept.threatTradeText',
    'deploymentConcept.objectiveControlText', 'deploymentConcept.reinforcementPolicyText',
    'opponentHypotheses.h1-kerrigan-melee-on-2-4.hypothesisText',
    'opponentHypotheses.h1-kerrigan-melee-on-2-4.falsificationText',
    'counterResponses.cr-contest-2-4-with-high-supply.triggerText',
    'counterResponses.cr-contest-2-4-with-high-supply.responseText',
    'counterResponses.cr-soften-chargers-at-range.responseText',
    'counterResponses.cr-goliath-covers-flank.responseText',
    'counterResponses.cr-trade-marker-for-swing.responseText',
    'invalidationTriggers.inv-battlefield-event.revisionRequiredText',
    'invalidationTriggers.inv-loss-budget.revisionRequiredText',
    'componentPurposes.u-marauder-1', 'componentPurposes.u-goliath-1',
  ];
  const originalRequest = { revisionPurpose: 'user_requested_claim_revision_v1', triggerIds: [],
    revisedSectionKeys: ['scoreRoute', 'deploymentConcept', 'componentPurposes', 'opponentHypotheses',
      'counterResponses', 'invalidationTriggers', 'publicSummaryText'], targetedClaimPaths,
    reasonText: '消费当前已完成Teach及原始回执，对相关Plan论证作一次协调修订；不重开调查、不新模拟、不改军表或到场排期。最新Teach有5条修订建议，请逐条采用或基于证据说明保留原策略的理由，不将Teach当规则权威。尤其核对减员场景的起始控制权：该保存场景marker1的previousControl和nextControl均为null，result为no_contest_sticky_control，不能将此场景写成已控制三点的实际历史必然因Marine损失变两点；区分此假设下的控制结果、保持原控制权的规则以及未来需观测的条件。Orders的1CP/faction卡支付仅在对应Movement原生回执的条件下成立，不外推所有时点。35/36和33/36概率属于明确对手和去地形假设下的advisory估计，保留采样条件，不写成此地图保证战果。几何距离/路径见证不等于已验证射击LOS或完整动作。使用新类型化证据中的数值、定性状态与原始上下文；最多3批读取已保存证据，不重新运行工具。策略取舍由你决定，不因unknown强制进攻或退守，不以快照已固定替代选择理由。相关字段应说明用途、备选与切换条件，保留已正确的计分/到场规则，明确实际修订了什么。' };
  const request = resuming ? JSON.parse(await readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8')) : originalRequest;
  await writeFile(base + '/B/v' + version + '-plan-revision-request.private.json', JSON.stringify(request, null, 2), { flag: 'wx', mode: 0o600 });
  status.status = 'revision_submitted_once'; await save();
  try {
    const response = await fetch(entry.origin + entry.apiPrefix + '/sessions/' + row.sessionId + '/revise', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request),
      signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error('HTTP_' + response.status + ':' + (await response.text()).slice(0, 700));
    await response.body?.cancel();
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    status.observationTimeout = true; await save();
  }
  for (;;) {
    process.kill(host.pid, 0);
    const current = await read(), updated = JSON.parse(current.planSerialized);
    Object.assign(status, { workspaceStatus: current.status, phase: current.progress.phase,
      activeRoundKind: current.progress.activeRoundKind, planVersion: updated.planVersion,
      planHash: updated.planHash, newCalls: current.usage.calls - before.usage.calls,
      newUnits: current.usage.totalUnits - before.usage.totalUnits,
      cumulativeUsage: { calls: current.usage.calls, units: current.usage.totalUnits },
      lastDispatch: current.providerDispatches.slice(-1).map(d => ({ kind: d.roundKind, status: d.status })),
      applicationStatus: current.teachFramework.state.applicationStatus });
    if (current.status === 'planned' && updated.planVersion > plan.planVersion) {
      if (JSON.stringify(updated.rosterCandidate) !== JSON.stringify(plan.rosterCandidate)
        || JSON.stringify(updated.openingDeploymentSchedule) !== JSON.stringify(plan.openingDeploymentSchedule)) throw Error('ROSTER_OR_SCHEDULE_CHANGED');
      Object.assign(status, { status: 'revision_completed_pending_review', rosterAndScheduleUnchanged: true,
        previousPlanPreserved: current.planVersionHistory.includes(before.planSerialized),
        coverage: current.claimRepairHistory.at(-1)?.coverage,
        finishedAt: new Date().toISOString() });
      await save(); break;
    }
    if (['failed', 'cancelled'].includes(current.status)) throw Error(current.failure?.detail || current.status);
    status.status = 'observing_single_revision'; await save(); await pause(20000);
  }
} catch (error) {
  status.status = 'needs_inspection_no_blind_retry'; status.failure = String(error.message).slice(0, 1000); await save();
}
