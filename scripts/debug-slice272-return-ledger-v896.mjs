// Actual v895 A: a recorded recovery yield was still counted as live work.
// Read-only production inputs, no Provider, Native actions or checkpoint edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {assessRosterWorkflowReadinessV1} from '../packages/roster-strategist/roster-workflow-readiness-v1.mjs';
const [root,out]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const before=JSON.stringify(state),draft=await read(state.draftRef),verdict=await read(draft.builderVerdictRef);
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const owner=state.work.find(w=>w.methodRecoveryYield?.reportRef===w.branchReturnRef&&w.branchReturnRef);
  assert.ok(owner,'actual production recovery yield is required');
  const members=state.work.filter(w=>w.branchReturnRef===owner.branchReturnRef);
  assert.equal(members.length,3);
  assert.ok(members.every(w=>w.status==='returned_to_owner'));
  const graph=createRosterWorkflowGraphV1(state);
  assert.deepEqual(members.filter(w=>graph.isActive(w.id)).map(w=>w.id),[],
    'returned duplicate recovery must not remain active');
  const readiness=assessRosterWorkflowReadinessV1({draft,verdict,work:state.work});
  assert.ok(!readiness.activeWork.some(w=>members.some(m=>m.id===w.id)));
  assert.deepEqual(readiness.mechanicalBlockers.find(b=>b.code==='card_purposes_missing').detail.recordKeys,
    ['tactical_cards:barracks__tech_lab_','tactical_cards:supply_depot','tactical_cards:academy']);
  assert.equal(readiness.acceptanceGranted,false);
  report.checks.push({name:'actual-three-returned-members-settle-shared-readiness',pass:true,
    members:members.map(w=>w.id),missingCardPurposesPreserved:true});
  for(const kind of ['missing_return_record','mismatched_return_record']){
    const bad=structuredClone(state),record=bad.work.find(w=>w.id===owner.id);
    if(kind==='missing_return_record')delete record.methodRecoveryYield;
    else record.methodRecoveryYield.reportRef='not-the-recorded-return';
    const rejected=createRosterWorkflowGraphV1(bad);
    assert.ok(members.every(w=>rejected.isActive(w.id)),kind);
  }
  const running=structuredClone(state);running.work.find(w=>w.id===members[0].id).status='running';
  assert.equal(createRosterWorkflowGraphV1(running).isActive(members[0].id),true);
  assert.equal(JSON.stringify(state),before);
  report.checks.push({name:'unbacked-or-inflight-work-still-blocks',pass:true,negativeCases:3});
  report.pass=true;
}catch(error){report.error={message:error.message,stack:error.stack?.split('\n').slice(0,4)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
