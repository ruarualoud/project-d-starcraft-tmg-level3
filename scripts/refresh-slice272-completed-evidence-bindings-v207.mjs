// Apply the existing workbench's zero-Provider completed-Teach refresh. This
// maintenance operation never edits raw model output or invokes synthesis.
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRosterPlanningProductModuleV1 }
  from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { hashStarcraftTmgContract as hash }
  from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [base, arm, previousProgressPath, reportPath] = process.argv.slice(2);
if (!base || !['A', 'B'].includes(arm) || !previousProgressPath || !reportPath) throw Error('EXPLICIT_REFRESH_TARGET_REQUIRED');
const config = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = config.rows.find(row => row.arm === arm);
const previous = JSON.parse(await fs.readFile(previousProgressPath, 'utf8'));
if (!row || previous.arm !== arm || previous.status !== 'completed') throw Error('COMPLETED_PRIOR_HANDLE_REQUIRED');
const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
const read = async () => JSON.parse(await fs.readFile(filename, 'utf8'));
const before = await read();
if (before.status !== 'planned' || before.progress.activeRoundKind
  || before.teachFramework.status !== 'completed' || before.teachFramework.state.phase !== 'completed'
  || before.planReview?.status === 'running'
  || before.providerDispatches.some(dispatch => ['reserved', 'sending', 'sent', 'ambiguous'].includes(dispatch.status)
    && !before.publicOutputs.some(output => output.contextHash === dispatch.contextHash))) {
  throw Error('IDLE_RECONCILED_WORKSPACE_REQUIRED');
}
const invariant = draft => hash({ plan: draft.planSerialized, usage: draft.usage,
  publicOutputs: draft.publicOutputs, dispatches: draft.providerDispatches,
  synthesisRaw: draft.teachFramework.state.synthesisRaw,
  evidence: draft.teachFramework.state.evidence,
  investigation: draft.teachFramework.state.investigation,
  recovery: draft.teachFramework.state.queryRecovery,
  history: draft.teachFramework.state.synthesisHistory });
const beforeHash = invariant(before);
const reportHandle = await fs.open(reportPath, 'wx', 0o600);
const report = { arm, startedAt: new Date().toISOString(), status: 'starting_offline_refresh',
  providerAttached: false, roomLaunchAttached: false, providerCalls: 0, nativeQueryReplay: false,
  originalPlanVersion: JSON.parse(before.planSerialized).planVersion,
  previousBindingVersion: before.teachFramework.state.evidenceBindingVersion,
  oldOwnedHostPid: previous.hostPid || null };
try {
  // Avoid two writers: stop only the exact known idle host for this draft.
  if (previous.hostPid) {
    let command = '';
    try { command = execFileSync('/bin/ps', ['-p', String(previous.hostPid), '-o', 'command='], { encoding: 'utf8' }); }
    catch (error) { if (error.status !== 1) throw error; }
    if (command.trim()) {
      if (!command.includes('serve-ticket-27-slice-271-roster-workspace-v1.mjs')
        || !command.includes('--data-directory=' + row.dataDirectory)) throw Error('OWNED_HOST_IDENTITY_CHANGED');
      process.kill(previous.hostPid, 'SIGTERM');
      for (let count = 0; ; count++) {
        try { process.kill(previous.hostPid, 0); } catch (error) { if (error.code === 'ESRCH') break; throw error; }
        if (count >= 30) throw Error('OWNED_IDLE_HOST_DID_NOT_EXIT');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  if (invariant(await read()) !== beforeHash) throw Error('SOURCE_CHANGED_BEFORE_REFRESH');
  const module = await createRosterPlanningProductModuleV1({ root: config.worktree,
    fixtureRoot: config.fixtureRoot, dataDirectory: row.dataDirectory,
    mapConfiguration: JSON.parse(await fs.readFile(config.mapConfigurationFile, 'utf8')),
    deliberationFactory: null, roomLaunchPort: null, enableIterativeDraft: false });
  report.status = 'refreshing_completed_teach';
  const oldBindingHash = hash(before.teachFramework.state.synthesis);
  await module.service.teachPlanFramework(row.sessionId,
    { expectedPlanHash: JSON.parse(before.planSerialized).planHash });
  const after = await read(), state = after.teachFramework.state;
  if (invariant(after) !== beforeHash) throw Error('REFRESH_CHANGED_PLAN_LEDGER_OR_SOURCE_EVIDENCE');
  if (state.evidenceBindingVersion === report.previousBindingVersion) throw Error('BINDING_NOT_REFRESHED');
  if (hash(state.evidenceBindingHistory.at(-1).synthesis) !== oldBindingHash) throw Error('PRIOR_BINDING_NOT_PRESERVED');
  const citations = state.synthesis.answers.flatMap(a => [...a.quantitativeEvidence, ...a.qualitativeEvidence]);
  Object.assign(report, { status: 'completed', currentBindingVersion: state.evidenceBindingVersion,
    calls: after.usage.calls, units: after.usage.totalUnits, newCalls: after.usage.calls - before.usage.calls,
    unknown: citations.filter(c => c.status === 'unknown').length,
    quantitative: state.synthesis.answers.flatMap(a => a.quantitativeEvidence).length,
    qualitative: state.synthesis.answers.flatMap(a => a.qualitativeEvidence).length,
    protectedStateUnchanged: true, previousQualifiedHistoryPreserved: true,
    automaticPlanApplication: false, runtimeHostLeftRunning: false });
} catch (error) { report.status = 'needs_inspection_no_retry'; report.failure = error.message; process.exitCode = 1; }
report.finishedAt = new Date().toISOString();
await reportHandle.writeFile(JSON.stringify(report, null, 2));
await reportHandle.close();
console.log(JSON.stringify(report));
