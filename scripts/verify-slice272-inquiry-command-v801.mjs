// Concrete e5850: inquiry-control errors bypass the localized correction API.
// An explicit model command is projected, never inferred from prose/old intent.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {rosterDecisionInvestigationErrorV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {projectRosterWorkflowFeedbackRecoveryV1,createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const started=performance.now(),trace=stage=>console.log(JSON.stringify({test:'v801-inquiry-command',stage,elapsedMs:Math.round(performance.now()-started)}));
trace('loading_saved_inputs');
const request=await get('4d0ef49e1f5d2a69be3717f05e0f75855c38cfc1106a0c65dcddb9ca7ab4dd8a');
const reply=await get('8be34b0a8258c7cddd79ed5bc4159771f204abcd00952d093ef1b766c40422f0');
const original=JSON.stringify(reply),prepared=prepareRosterStrategyRepairRequestV1(request);
const remaining=process.argv.includes('--remaining-executor');
if(!remaining){
assert.ok(prepared.responseFormat.schema.properties.action.enum.includes('authorize_inquiry'),
  'actual bounded inquiry failure must enter an explicit localized NEXT-operation API');
}
const feedback=prepared.promptNodes.find(n=>n.kind==='local_contract_feedback');
const wire={action:'authorize_inquiry',publicReason:'Fixture: authorize only the remaining budget question, retaining local comparisons.',
  reads:[],catalogueQueries:[],questionRepairs:[],decisionPublicReason:'Fixture: the current army is 1490; local comparison decisions do not resolve the budget shortfall.',
  alternatives:null,replacementDecision:null,inquiryAuthorization:structuredClone(reply.output.decisions[0].nextInvestigation)};
const projected=projectRosterStrategyRepairOutputV1({request:prepared,output:wire});
if(!remaining){
assert.deepEqual(projected.errors,[]);
assert.equal(projected.output.decisions[0].disposition,'investigate');
assert.deepEqual(projected.output.decisions[0].dataQuestions,feedback.originalOutput.decisions[0].dataQuestions);
assert.equal(rosterDecisionInvestigationErrorV1(projected.output.decisions[0]),null);
assert.equal(projected.output.decisions[0].mutation,null);
assert.ok(projected.projection.some(p=>p.to==='/decisions/0/disposition'&&p.rule==='model_authored_inquiry_command_v2'));
for(const bad of [{...wire,inquiryAuthorization:null},{...wire,decisionPublicReason:null},
  {...wire,action:'repair'},{...wire,reads:[{evidenceNumber:523,pointer:''}]}])
  assert.ok(projectRosterStrategyRepairOutputV1({request:prepared,output:bad}).errors.length);
const wrong=projectRosterStrategyRepairOutputV1({request:prepared,output:{...wire,inquiryAuthorization:{...wire.inquiryAuthorization,questionNumbers:[4]}}});
assert.ok(rosterDecisionInvestigationErrorV1(wrong.output.decisions[0]),'unchanged semantic gate still rejects inquiry on a decided question');
assert.ok(projectRosterStrategyRepairOutputV1({request:prepared,output:reply.output}).errors.length,'no implicit acceptance of old full reply');
}
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=structuredClone(state.work.find(w=>w.status==='needs_repair'&&w.operationState?.correction?.originalReplyRef==='8be34b0a8258c7cddd79ed5bc4159771f204abcd00952d093ef1b766c40422f0'));
assert.ok(stopped);
if(!remaining){
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request}).repairKind,'typed_inquiry_command');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request:prepared}),null);
}
const draftRef=state.draftRef,memory=new Map();let captured,calls=0;
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async v=>{const ref=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(ref,structuredClone(v));return ref;}};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v801-real-stop-local-control',
  deliberation:{deliberate:async q=>{captured=structuredClone(q);calls++;
    return {output:structuredClone(calls===1?wire:projected.output),receipt:{fixture:true}};}}});
// Production workspace decorates the graph assignment with these resolved
// current inputs. A naked graph lacks those delivered citations; reuse the
// exact actual request boundary, not synthetic source approvals.
const delivered=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const graph=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({
  ...assignment,inputs:structuredClone(delivered)},control)});
await graph.dispatch({type:'resume_role_correction',workId:stopped.id,reason:'isolated concrete inquiry command reproduction'});
trace('dispatching_local_command');
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
if(!remaining){
  assert.equal(calls,1);
  assert.match(projectRosterProviderInstructionsV1({request:captured}),/SEMANTIC REPAIR/);
  assert.ok(captured.responseFormat.schema.properties.action.enum.includes('authorize_inquiry'));
}
let after=state.work.find(w=>w.id===stopped.id);
assert.notEqual(after.status,'needs_repair',JSON.stringify(after.failure));
let result=(await store.get(after.resultRef)).value;
// Actual recorded cites 559/1044 were supplied by the workspace supplement,
// not this isolated graph's operation.reads. Do not pretend a read is approval:
// exercise its existing read -> explicit confirmation boundary once.
assert.equal(result.status,'evidence_reads_pending_recheck');
assert.equal(result.readCount,2);assert.equal(result.conclusionAccepted,false);
assert.ok(after.operationState.correction.errors.every(e=>e.code==='confirmation_after_evidence_reads'));
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
assert.equal(after.status,'needs_model_choice');
trace('read_boundary_confirmed');
// Match workspace.advance: continuation is explicit, run_ready alone is a no-op
// for needs_model_choice. Do not mistake an undispatched second call for failure.
await graph.dispatch({type:'continue_work',workId:stopped.id});
trace('dispatching_source_confirmation');
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
after=state.work.find(w=>w.id===stopped.id);
assert.notEqual(after.status,'needs_repair',JSON.stringify(after.failure));
result=(await store.get(after.resultRef)).value;
assert.equal(result.decisions?.[0]?.disposition,'investigate',JSON.stringify(result));
assert.equal(result.decisions[0].dataQuestions.length,reply.output.decisions[0].dataQuestions.length);
assert.deepEqual(result.decisions[0].nextInvestigation.questionNumbers,[3]);
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);assert.equal(JSON.stringify(reply),original);
console.log(JSON.stringify({pass:true,remainingExecutorOnly:remaining,sharedExecutor:true,explicitModelCommand:true,originalQuestionsPreserved:true,
  capturedCalls:calls,sourceReadThenConfirmed:true,rawReplyUnchanged:true,missingFactNotApproved:true,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  elapsedMs:Math.round(performance.now()-started)}));
