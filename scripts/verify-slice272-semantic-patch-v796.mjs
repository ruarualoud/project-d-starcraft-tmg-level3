// Reproduce actual e5643 through run_ready and the shared role executor.
// Synthetic patch is a transport/validation fixture, NOT a strategic verdict.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=structuredClone(state.work.find(w=>w.status==='needs_repair'&&w.role==='roster_workflow_strategy_decision'));
assert.ok(stopped);
const request=await get('076e016822f63a3ce8ccc277430150998931214b1b29b6d1b56b5db907e39d82');
const reply=await get('a8075feaf2c402cfd46b8671500688b3927f4e0a93c0a0088d87dd3e1f17dc07');
const full=await get('b165f296efb174291eaa4a351b036fe9d2fefeb3ae1a121d9f34bdb18997668b');
const assignment=full.promptNodes.find(n=>n.kind==='workflow_role_assignment');
if(process.argv.includes('--remaining')){
  const {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1}=await import('../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs');
  const patched=prepareRosterStrategyRepairRequestV1(request);
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request:patched}),null);
  const wire={action:'repair',publicReason:'Fixture',reads:[],catalogueQueries:[],
    questionRepairs:[{questionNumber:4,classification:'authored_choice',publicReason:'Fixture declaration',evidenceNumbers:[523]}],
    decisionPublicReason:null,alternatives:null,replacementDecision:null};
  for(const edits of [[{...wire.questionRepairs[0],questionNumber:999}],[...wire.questionRepairs,...wire.questionRepairs]])
    assert.ok(projectRosterStrategyRepairOutputV1({request:patched,output:{...wire,questionRepairs:edits}}).errors.length);
  assert.ok(projectRosterStrategyRepairOutputV1({request:patched,output:reply.output}).errors.length);
  console.log(JSON.stringify({remainingGatePass:true,currentProtocolCannotRenew:true,invalidPatchesRejected:3,
    alreadyPassedWorkflowNotRerun:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
  process.exit(0);
}
const before=JSON.stringify(reply),draftRef=state.draftRef,memory=new Map();
let captured,calls=0;
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async v=>{const ref=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(ref,structuredClone(v));return ref;}};
const wire={action:'repair',publicReason:'Fixture: retain the declared Plan choice, not a pending author handoff.',
  reads:[],catalogueQueries:[],questionRepairs:[{questionNumber:4,classification:'authored_choice',
    publicReason:'The current Plan componentPurposes/2 retains goliath-1 in its counter role; this is declared intent, not future victory.',evidenceNumbers:[523]}],
  decisionPublicReason:null,alternatives:null,replacementDecision:null};
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v796-real-stop-protocol',
  deliberation:{deliberate:async q=>{captured=structuredClone(q);calls++;
    return q.promptNodes.some(n=>n.kind==='strategy_semantic_repair')?{output:structuredClone(wire),receipt:{fixture:true}}:structuredClone(reply);}}});
const graph=await createRosterDecisionWorkflowV1({store,execute:(a,c)=>executor({...a,inputs:structuredClone(assignment.inputs)},c)});
await graph.dispatch({type:'resume_role_correction',workId:stopped.id,reason:'isolated concrete structured-repair reproduction'});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
assert.equal(calls,1,JSON.stringify(state.work.find(w=>w.id===stopped.id).failure));
assert.ok(captured.promptNodes.some(n=>n.kind==='strategy_semantic_repair'),'semantic failure must use explicit localized operations, not copy the rejected full decision');
assert.match(projectRosterProviderInstructionsV1({request:captured}),/SEMANTIC REPAIR/);
const after=state.work.find(w=>w.id===stopped.id);
assert.notEqual(after.status,'needs_repair');
const result=(await store.get(after.resultRef)).value;
assert.equal(result.decisions[0].dataQuestions[3].classification,'authored_choice');
assert.equal(result.decisions[0].dataQuestions[3].question,reply.output.decisions[0].dataQuestions[3].question);
assert.equal(result.decisions[0].dataQuestions.length,reply.output.decisions[0].dataQuestions.length);
assert.deepEqual(result.decisions[0].dataQuestions[0],reply.output.decisions[0].dataQuestions[0]);
assert.ok(result.outputProjection.some(p=>p.rule==='model_authored_semantic_patch_v1'));
assert.equal(JSON.stringify(reply),before);assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request}).repairKind,'typed_semantic_repair');
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request:captured}),null);
const {projectRosterStrategyRepairOutputV1}=await import('../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs');
for(const edits of [[{...wire.questionRepairs[0],questionNumber:999}], [...wire.questionRepairs,...wire.questionRepairs]]){
  assert.ok(projectRosterStrategyRepairOutputV1({request:captured,output:{...wire,questionRepairs:edits}}).errors.length);
}
assert.ok(projectRosterStrategyRepairOutputV1({request:captured,output:reply.output}).errors.length,'old full reply is not silently accepted as a patch');
console.log(JSON.stringify({pass:true,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  capturedProviderCalls:calls,rawReplyPreserved:true,originalQuestionsPreserved:true,
  finalAcceptance:false,strategyQualityProven:false}));
