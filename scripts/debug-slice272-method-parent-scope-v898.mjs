// Actual A: top-level syntax repair ancestors were orphaned by Plan-only edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterLocalMethodScopeRepairsV1} from '../packages/roster-strategist/roster-workflow-local-method-scope-v1.mjs';
const [root,out]=process.argv.slice(2),copy=structuredClone;
const original=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const goalId='product:strategy-hypothesis:v1:3621f50797e05ed31755:purpose:v2:study';
const ids=[goalId+':order-repair0',goalId+':order-repair0:order-repair0'];
let state=copy(original);const memory=new Map();
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const report={pass:false,checks:[],providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const fixes=await projectRosterLocalMethodScopeRepairsV1({state,readArtifact:get});
  assert.ok(ids.every(id=>fixes.some(f=>f.workId===id)),'completed method ancestors must survive a Plan-only edit');
  await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('no execution');}});
  for(const id of ids){
    const before=original.work.find(w=>w.id===id),after=state.work.find(w=>w.id===id);
    assert.equal(after.status,'evidence_ready');assert.equal(after.inputs.draft.scopeUsage,'historical_reference');
    assert.equal(after.resultRef,before.resultRef);assert.deepEqual(after.operationState,before.operationState);
  }
  // Follow the actual caller's batch dependency path, without executing it.
  async function summaries(work){
    assert.equal(work.status,'evidence_ready');const result=await get(work.resultRef);
    if(result.value.experimentConclusion)return [work.id];
    const found=(result.value.workOrders??[]).map((_,i)=>work.returnedOrders?.[i]?.summaryId??`${work.id}:order${i}:summary`);
    assert.ok(found.every(id=>state.work.find(w=>w.id===id)?.status==='evidence_ready'));
    for(const [i]of (result.value.failedWorkOrders??[]).entries())found.push(...await summaries(state.work.find(w=>w.id===`${work.id}:order-repair${i}`)));
    return found;
  }
  const completed=await summaries(state.work.find(w=>w.id===goalId));assert.ok(completed.length);
  assert.equal(state.draftRef,original.draftRef);
  assert.deepEqual(state.work.filter(w=>w.role==='roster_workflow_tool'),original.work.filter(w=>w.role==='roster_workflow_tool'));
  report.checks.push({name:'paid-ancestors-and-actual-summary-path-preserved',pass:true,restored:ids,completedSummaries:completed});
  for(const kind of ['changed_army','explicit_retirement','plan_bound_method']){
    const bad=copy(original);
    if(kind==='changed_army')bad.scope.army=hash('different-army');
    else if(kind==='explicit_retirement')bad.work.find(w=>w.id===goalId).supersededByGoalId='replacement-goal';
    else for(const id of ids)bad.work.find(w=>w.id===id).bindings.plan='explicit-plan-dependency';
    const rejected=await projectRosterLocalMethodScopeRepairsV1({state:bad,readArtifact:get});
    assert.ok(ids.every(id=>!rejected.some(f=>f.workId===id)),kind);
  }
  assert.equal((await projectRosterLocalMethodScopeRepairsV1({state,readArtifact:get})).length,0);
  report.checks.push({name:'fact-changes-or-explicit-authority-not-revived',pass:true,negativeCases:3,idempotent:true});
  report.pass=true;
}catch(error){report.error={message:error.message,code:error.code,stack:error.stack?.split('\n').slice(0,5)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
