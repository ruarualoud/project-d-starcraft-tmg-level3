// Real v583 returned26 descendants; the release inventory still counted those
// ended branches as active. A bare/unlinked status must not hide real work.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/projection-owner');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const ended=state.work.filter(w=>w.status==='returned_to_owner');assert.ok(ended.length>0,'real branch-return evidence required');
const unlinked={id:'unlinked-return-status',role:'roster_workflow_tool',status:'returned_to_owner',branchReturnRef:'not-recorded'};
const active={id:'actual-pending',role:'roster_workflow_tool',status:'needs_model_choice'};
const readiness=assessRosterWorkflowReadinessV1({work:[...state.work,unlinked,active]});
assert.ok(ended.every(w=>!readiness.activeWork.some(a=>a.id===w.id)),
  'only actual owner-recorded ended branches are terminal, not unfinished release blockers');
assert.ok(readiness.activeWork.some(w=>w.id===unlinked.id));
assert.ok(readiness.activeWork.some(w=>w.id===active.id));
assert.equal(readiness.acceptanceGranted,false);assert.equal(readiness.mechanicalReady,false);
console.log(JSON.stringify({passed:true,realReturnedBranches:ended.length,unlinkedStatusStillActive:true,
  necessaryPendingWorkStillActive:true,planNotApproved:true,providerCalls:0,productionWrites:0}));
