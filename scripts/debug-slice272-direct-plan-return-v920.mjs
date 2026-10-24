// Actual r8 direct-owner commit, offline core dispatch; not the passed r7 nested test.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowGraphV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const [directory,output]=process.argv.slice(2);
const report={schema:'slice272_direct_plan_return_v920',passed:false,providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const original=await readFile(directory+'/workflow.json','utf8'),saved=JSON.parse(original);
  assert.equal(saved.draftRevision,8);
  const goal=saved.work.find(w=>w.experimentScopePolicy==='frozen_comparison_v1'&&w.investigationHandoff);
  const frontier=saved.work.find(w=>w.id===goal.investigationHandoff.decisionId);
  const owner=saved.work.find(w=>w.id===frontier.investigationOwnerId);
  const commit=saved.events.findLast(e=>e.type==='draft_committed');
  assert.equal(commit.workId,frontier.id,'This regression is a direct owner commit, not nested');
  assert.equal(owner.status,'superseded');
  assert.equal(owner.inputs.currentDraft.id,'draft:r7:summary');
  const cache=new Map();
  async function read(ref){if(!cache.has(ref))cache.set(ref,JSON.parse(await readFile(`${directory}/artifacts/${ref}.json`,'utf8')));return structuredClone(cache.get(ref));}
  async function harness(input=saved){
    let state=structuredClone(input);const local=new Map(),calls=[];
    const store={load:async()=>structuredClone(state),save:async s=>{state=structuredClone(s);},
      get:async ref=>local.has(ref)?structuredClone(local.get(ref)):read(ref),
      put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');local.set(ref,structuredClone(value));return ref;}};
    const open=()=>createRosterDecisionWorkflowV1({store,execute:async assignment=>{calls.push(assignment);return {kind:'interpretation',value:{injected:true},conditions:['injected receiver, not approval']};}});
    return {workflow:await open(),open,calls};
  }
  const h=await harness(),restored=await h.workflow.dispatch({type:'reconcile_plan_revision_handoffs'});
  assert.equal(restored.length,1,'Direct Plan-only r8 writer must return the same frozen comparison');
  const state=await h.workflow.inspect(),next=state.work.find(w=>w.id===restored[0].workId);
  assert.ok(createRosterWorkflowGraphV1(state).canRun(next.id));
  assert.equal(next.methodContinuationOf,owner.id);
  assert.equal(next.inputs.currentDraft.id,'draft:r8:summary');
  assert.equal(next.inputs.planRevisionReturn.value.factApprovalGranted,false);
  for(const key of ['question','comparisonPurpose','originalNecessaryQuestions','sourceReview','failedSourceClaim0','failedSourceClaim1','rejectedConclusion'])assert.deepEqual(next.inputs[key],owner.inputs[key]);
  for(const old of saved.work){const now=state.work.find(w=>w.id===old.id);assert.equal(now.resultRef,old.resultRef);assert.deepEqual(now.operationState,old.operationState);if(old.id!==goal.id)assert.equal(now.status,old.status);}
  assert.equal(state.acceptanceGranted,false);
  report.checks.push('Actual direct r8 commit produces one fresh reader; questions/failed claims/paid results/counters preserved');
  const cold=await h.open();assert.deepEqual(await cold.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  const done=await cold.dispatch({type:'run_ready',workIds:[next.id],concurrency:1});
  assert.equal(done[0].status,'evidence_ready');assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].inputs.currentDraft.validity,'current');
  report.checks.push('Cold resume is idempotent; actual core delivers current r8 once to injected receiver');
  // A same-parent peer must not become authorized just because direct equality is allowed.
  const peer=structuredClone(saved),fake={...structuredClone(frontier),id:'unrelated-peer',investigationOwnerId:'different-owner'};
  peer.work.push(fake);peer.work.find(w=>w.id===goal.id).investigationHandoff.decisionId=fake.id;
  assert.deepEqual(await (await harness(peer)).workflow.dispatch({type:'reconcile_plan_revision_handoffs'}),[]);
  report.checks.push('Unrelated peer cannot borrow direct-writer authority');
  assert.equal(await readFile(directory+'/workflow.json','utf8'),original);
  report.passed=true;
}catch(error){report.error={message:error.message,stack:error.stack.split('\n').slice(0,5)};process.exitCode=1;}
await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
