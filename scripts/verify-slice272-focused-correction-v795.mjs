// Actual v794 semantic stop: local correction was sent 185425 input units.
// Isolated workflow copy, captured Provider request, no paid calls or disk writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=structuredClone(state.work.find(w=>w.status==='needs_repair'&&w.role==='roster_workflow_strategy_decision'));
assert.ok(stopped);
const savedRequest=await get('d897a24308a69a9161a0a23b033cc755cfa770f874516eb917e590220294cb88');
const savedReply=await get('ba12cb0034758f9df773f8b549e308b60f647496f7136070d4d8504d12117f1d');
const fullAssignment=savedRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const originalReply=JSON.stringify(savedReply),draftRef=state.draftRef;
const memory=new Map();let captured,calls=0,hasPublicationControl=false;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v795-real-stop-input',
  deliberation:{deliberate:async request=>{captured=structuredClone(request);calls++;return structuredClone(savedReply);}}});
const graph=await createRosterDecisionWorkflowV1({store,execute:async(assignment,control)=>{
  hasPublicationControl=typeof control.publishContext==='function';
  return executor({...assignment,inputs:structuredClone(fullAssignment.inputs)},control);
}});
await graph.dispatch({type:'resume_role_correction',workId:stopped.id,reason:'isolated concrete local-input reproduction'});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
assert.equal(calls,1,'one captured fake Provider call');
const focus=captured.promptNodes.find(n=>n.kind==='local_correction_context');
assert.ok(focus,'local correction must not resend the entire experiment context');
assert.equal(hasPublicationControl,true,'same workflow must expose the deferred context, not an experiment-only reader');
const current=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.deepEqual(current.inputs.wholeDraft,fullAssignment.inputs.wholeDraft);
assert.deepEqual(current.inputs.currentArmyAuthority,fullAssignment.inputs.currentArmyAuthority);
assert.deepEqual(current.inputs.requirements,fullAssignment.inputs.requirements);
assert.deepEqual(current.scope,fullAssignment.scope);
assert.deepEqual(captured.responseFormat,savedRequest.responseFormat,'same output schema, not weaker acceptance');
assert.ok(JSON.stringify(captured).length<JSON.stringify(savedRequest).length*0.6,'measured fixture reduction, not a production capacity limit');
assert.ok(focus.deferred.length>0);
const entry=state.evidence[focus.source.evidenceNumber-1];
assert.equal(entry.id,focus.source.evidenceId);
const source=await store.get(entry.artifactRef);
for(const item of focus.deferred){
  const read=await graph.dispatch({type:'read_evidence',consumer:stopped.id,evidenceId:entry.id,pointer:item.pointer});
  assert.equal(read.status,'read',item.pointer);
  const expected=item.pointer.split('/').slice(1).reduce((v,k)=>v[k.replaceAll('~1','/').replaceAll('~0','~')],source);
  assert.deepEqual(read.value,expected,'deferred content is exact, not a summary or missing');
}
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
assert.equal(JSON.stringify(savedReply),originalReply);
const after=state.work.find(w=>w.id===stopped.id);
assert.equal(after.status,'needs_repair','the original bad semantic answer must still fail');
assert.ok(after.operationState.correction.errors.some(e=>e.code==='author_choice_requires_author_action'));
const repair=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply:savedReply,request:savedRequest});
assert.equal(repair.repairKind,'scoped_semantic_correction_context');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply:savedReply,request:captured}),null,'current contract cannot grant endless recovery');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...stopped,operationState:{...stopped.operationState,pending:{}}},reply:savedReply,request:savedRequest}),null);
console.log(JSON.stringify({pass:true,oldCharacters:JSON.stringify(savedRequest).length,newCharacters:JSON.stringify(captured).length,
  exactDeferredReads:focus.deferred.length,fixtureReplyUses:calls,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  currentDraftPreserved:true,originalSemanticErrorStillRejected:true}));
