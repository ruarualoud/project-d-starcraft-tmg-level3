// Actual call030: unchanged army/Skills/task facts reopened early Teach solely
// because the scoring receipt's laboratory delivery version changed.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createIterativeRosterDraftTeachV1} from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
const [sessionFile,outputFile]=process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try {
  const original=JSON.parse(await fs.readFile(sessionFile,'utf8')).value;
  const previous=original.draftTeachSnapshots.findLast(r=>r.status==='completed');
  const pending=original.draftTeachSnapshots.at(-1);
  assert(previous && pending.status!=='completed');
  const before=JSON.stringify(previous);
  let nativeCreates=0;
  const run=missionEvidence=>createIterativeRosterDraftTeachV1({
    selectSkillGuidance:()=>structuredClone(pending.context.skillGuidance),
    missionEvidence,createSceneLaboratory:()=>{nativeCreates++;throw Error('UNEXPECTED_REDUNDANT_TEACH');},
    deliberationFactory:{createForRun:()=>{report.providerCalls++;throw Error('UNEXPECTED_PROVIDER');}}
  });
  await run(pending.context.mission)(original,async()=>{});
  assert.equal(nativeCreates,0,'metadata-only scoring change must not rebuild the same-army early inquiry');
  assert.equal(report.providerCalls,0);
  assert.equal(original.draftTeachReuse.sourceSnapshotId,previous.snapshotId);
  assert.equal(original.draftTeachReuse.finalAcceptance,false);
  assert.equal(JSON.stringify(previous),before,'old receipt/context must not be rewritten');
  assert.equal(pending.status,'superseded_before_dispatch');
  report.checks.push('actual_metadata_only_change_reuses_completed_advice_and_preserves_unsent_snapshot_without_provider');
  await run(pending.context.mission)(original,async()=>{});
  assert.equal(nativeCreates,0,'restart must not resurrect superseded unsent inquiry');
  report.checks.push('same_session_restart_retains_reuse_without_reopening_superseded_snapshot');
  const changed=JSON.parse(await fs.readFile(sessionFile,'utf8')).value;
  changed.draftTeachSnapshots=[structuredClone(previous)];
  const changedMission=structuredClone(pending.context.mission);
  changedMission.scoring.missionScoringProfile={...changedMission.scoring.missionScoringProfile,regressionChangedFact:true};
  await assert.rejects(()=>run(changedMission)(changed,async()=>{}),/UNEXPECTED_REDUNDANT_TEACH/);
  report.checks.push('actual_scoring_fact_change_still_requires_new_inquiry');
  const paid=JSON.parse(await fs.readFile(sessionFile,'utf8')).value;
  paid.draftTeachSnapshots.at(-1).dispatches=[{requestId:'actual_sent_fixture',status:'sending'}];
  await assert.rejects(()=>run(pending.context.mission)(paid,async()=>{}));
  assert.notEqual(paid.draftTeachSnapshots.at(-1).status,'superseded_before_dispatch');
  report.checks.push('sent_or_paid_inquiry_is_not_discarded_as_unstarted');
  report.ok=true;
} catch(error) {report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
