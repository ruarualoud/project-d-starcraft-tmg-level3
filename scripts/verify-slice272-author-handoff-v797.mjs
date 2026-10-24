// Concrete e5652 reproduction. Fixtures prove ownership/transport, not strategy.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=structuredClone(state.work.find(w=>w.status==='needs_repair'&&w.role==='roster_workflow_strategy_decision'));
assert.ok(stopped);assert.equal(stopped.operationState.turn,8);
const draftRef=state.draftRef,before=JSON.stringify(stopped.operationState),memory=new Map();
const oldReply=await get(stopped.operationState.correction.originalReplyRef);
const full=await get('b165f296efb174291eaa4a351b036fe9d2fefeb3ae1a121d9f34bdb18997668b');
const assignment=full.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const baseline=await get('a8075feaf2c402cfd46b8671500688b3927f4e0a93c0a0088d87dd3e1f17dc07');
const output=structuredClone(baseline.output);
output.decisions[0].dataQuestions[3]={...output.decisions[0].dataQuestions[3],classification:'decided_here',
  publicReason:'FIXTURE ONLY: I choose to retain the existing counter role under the cited local scenario, not delegate this choice. This is not proof of future control or a finished roster.',evidenceNumbers:[523,1017,1050]};
for(const i of [2,4])output.decisions[0].dataQuestions[i]={...output.decisions[0].dataQuestions[i],
  classification:'answered_fact',publicReason:'FIXTURE: current committed roster is 1490, remaining 510; the 2000 candidate is unadopted.',evidenceNumbers:[524]};
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async v=>{const ref=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(ref,structuredClone(v));return ref;}};
let calls=0,captured;
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v797-real-stop-handoff',deliberation:{deliberate:async q=>{
  calls++;captured=structuredClone(q);return {output:structuredClone(output),receipt:{fixture:true}};}}});
const open=()=>createRosterDecisionWorkflowV1({store,execute:(a,c)=>executor({...a,inputs:structuredClone(assignment.inputs)},c)});
let graph=await open();
await graph.dispatch({type:'handoff_strategy_author',workId:stopped.id});
const moved=state.work.find(w=>w.id===stopped.id);
assert.equal(calls,0);assert.equal(moved.status,'ready');assert.equal(moved.operationState.correction,null);
assert.deepEqual(moved.operationState.calls,stopped.operationState.calls);
assert.deepEqual(moved.operationState.reads,stopped.operationState.reads);
assert.deepEqual(moved.operationState.authorDecisionHandoff.previousCorrection,stopped.operationState.correction);
assert.equal(moved.operationState.authorDecisionHandoff.previousCounters.consecutiveCorrections,1);
assert.equal(moved.operationState.authorDecisionHandoff.questions.length,7);
assert.equal(JSON.stringify(stopped.operationState),before);assert.equal(state.draftRef,draftRef);
graph=await open(); // cold restore retains the new owner phase
await assert.rejects(graph.dispatch({type:'handoff_strategy_author',workId:stopped.id}),/AUTHOR_HANDOFF_INVALID/);
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
assert.equal(calls,1);
assert.ok(captured.promptNodes.some(n=>n.kind==='strategy_author_handoff'));
assert.ok(!captured.promptNodes.some(n=>['strategy_semantic_repair','local_contract_feedback'].includes(n.kind)));
assert.match(projectRosterProviderInstructionsV1({request:captured}),/YOU are the strategic owner/);
assert.equal(captured.promptNodes.find(n=>n.kind==='decision_evidence_window').usedReadBatches,0);
const after=state.work.find(w=>w.id===stopped.id);
assert.notEqual(after.status,'needs_repair',JSON.stringify(after.operationState.correction));
const result=(await store.get(after.resultRef)).value;
assert.equal(result.decisions[0].decidedHere.length,1);
assert.equal(result.decisions[0].dataQuestions.length,7);
assert.equal(result.acceptanceGranted,false);assert.equal(state.draftRef,draftRef);
assert.equal(after.operationState.authorDecisionHandoff.phase,'submitted_for_review');
assert.deepEqual(await get(stopped.operationState.correction.originalReplyRef),oldReply);
const {projectRosterAuthorDecisionHandoffV1}=await import('../packages/roster-strategist/roster-workflow-author-handoff-v1.mjs');
const mixed=structuredClone(stopped);mixed.operationState.correction.errors.push({code:'schema'});
assert.equal(await projectRosterAuthorDecisionHandoffV1({role:mixed.role,operation:mixed.operationState,store}),null);
assert.equal(await projectRosterAuthorDecisionHandoffV1({role:stopped.role,operation:after.operationState,store}),null);
const {rosterDecidedHereErrorsV1}=await import('../packages/roster-strategist/roster-workflow-author-handoff-v1.mjs');
assert.ok(rosterDecidedHereErrorsV1({...output.decisions[0],disposition:'record_facts'}).length);
const pending=structuredClone(output.decisions[0]);pending.dataQuestions[3].classification='author_decision';
const {projectRosterReviewDataQuestionsV1}=await import('../packages/roster-strategist/roster-review-data-questions-v1.mjs');
assert.equal(projectRosterReviewDataQuestionsV1(pending,{allowDecidedHere:true}).requiredDecisions.length,1);
assert.throws(()=>projectRosterReviewDataQuestionsV1(output.decisions[0]),/QUESTION_INVALID/);
console.log(JSON.stringify({pass:true,actualStop:'e5652',providerCalls:0,nativeCalls:0,productionWrites:0,
  oneTypedHandoff:true,coldRestore:true,questionsPreserved:7,priorCallsAndErrorsPreserved:true,
  finalAcceptance:false,strategyQualityProven:false}));
