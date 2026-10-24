// Reproduce the missing PRODUCT call-site, using an actual B task in memory.
// Capture the real core/role request, then deliberately stop the injected Provider.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [directory,output,remainingOnly]=process.argv.slice(2),copy=structuredClone;
const report={schema:'slice272_owner_entry_v922',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const original=await fs.readFile(directory+'/workflow.json','utf8'),saved=JSON.parse(original);
  const id='product:strategy-hypothesis:v1:3d74cf4d181443d17c20:purpose:v2:study:plan-revision-return:r8:strategy-frontier';
  let state=copy(saved);const job=state.work.find(w=>w.id===id);
  assert.ok(job);
  // Production advanced while stopping. Restore ONLY this in-memory fixture
  // from its genuine commit/assignment, never rewind the persisted workflow.
  const originalAssignment=JSON.parse(await fs.readFile(`${directory}/artifacts/${job.inputRef}.json`,'utf8'));
  const commit=saved.events.find(e=>e.type==='draft_committed'&&e.revision===8);
  assert.ok(commit);assert.deepEqual(commit.scope,originalAssignment.scope);
  state.scope=copy(commit.scope);state.draftRevision=8;state.draftRef=commit.draftRef;
  report.fixture={productionRevision:saved.draftRevision,isolatedRevision:8,commitRef:commit.receiptRef};
  job.status='ready';job.operationState=null;job.failure=null;job.resultRef=null;job.inputRef=null;
  delete job.draftOutcomeRef;
  const local=new Map(),cache=new Map(),requests=[];
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    put:async value=>{const ref=hash(value);local.set(ref,copy(value));return ref;},
    get:async ref=>{if(local.has(ref))return copy(local.get(ref));if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(`${directory}/artifacts/${ref}.json`,'utf8')));return copy(cache.get(ref));}};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'capture-v922',deliberation:{deliberate:async request=>{
    requests.push(copy(request));throw Object.assign(Error('INJECTED_CAPTURE_STOP'),{dispatchOutcome:'not_dispatched'});
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  report.dispatch=await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
  if(!remainingOnly)assert.equal(requests.length,1,'The actual product role must construct the request');
  const request=requests[0],nodes=request.promptNodes;
  if(!remainingOnly)assert.ok(nodes.some(n=>n.kind==='strategy_owner_assignment'&&n.returnKind==='source_interpretation_challenge'));
  const context=nodes.find(n=>n.kind==='strategy_owner_context');
  if(!remainingOnly)assert.ok(context,'Actual role entry skipped the owner context projector');
  const inputs=nodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  if(!remainingOnly){
    assert.equal(inputs.batchFacts0.source,'evidence','Current returned facts remain inline');
    assert.equal(inputs.wholeDraft.source,'literal','Current whole Plan remains inline');
  }else report.previouslyPassed='slice272-owner-entry-v922-green.json: actual entry, typed return, current facts and whole Plan';
  assert.equal(inputs.questionEvidenceDirectory.source,'deferred_context');
  const entry=state.evidence.find(e=>e.id===context.source.evidenceId);
  assert.ok(entry,'Deferred context published by the real core control, not a mock publication');
  const source=await store.get(entry.artifactRef);
  assert.ok(source,'Saved exact context is readable');
  report.publishedContext={evidenceId:entry.id,artifactRef:entry.artifactRef};
  report.checked=['actual core/role entry','typed source dispute','current facts and Plan retained','background exact context published'];
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
