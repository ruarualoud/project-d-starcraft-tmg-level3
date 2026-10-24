// e6042: an explicit fact -> author return lost its role boundary on correction.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const started=performance.now();
let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='842d71ae6fb4118992105e36ebe116c256ddc72d9a1e432b801e58994b20481e');
assert.ok(stopped,'actual e6042 stop required');
const first=await get(stopped.operationState.calls[0].requestRef),last=stopped.operationState.calls.at(-1);
const request=await get(last.requestRef),reply=await get(last.replyRef),original=JSON.stringify(reply);
const delivered=first.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const returned=delivered.batchFacts0.value.coordination;
const memory=new Map(),draftRef=state.draftRef;let captured,calls=0;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v802-incoming-owner-fixture',
  deliberation:{deliberate:async q=>{calls++;captured=structuredClone(q);return structuredClone(reply);}}});
const graph=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>execute({
  ...assignment,inputs:structuredClone(delivered)},control)});
await graph.dispatch({type:'resume_role_correction',workId:stopped.id,reason:'isolated e6042 owner-boundary reproduction'});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
assert.equal(calls,1);
const owner=captured.promptNodes.find(n=>n.kind==='strategy_owner_assignment');
assert.ok(owner,'typed incoming author return must remain an explicit CURRENT owner stage, including correction');
assert.deepEqual(owner.questions,returned.questions,'pending author questions and source reasons stay exact');
assert.equal(owner.factApprovalGranted,false);assert.equal(owner.planApprovalGranted,false);
assert.equal(owner.currentWorkId,stopped.id);
const inputs=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
assert.equal(inputs.originalTask,undefined,'fact-only instructions cannot remain operative author inputs');
assert.equal(inputs.originalStrategicDecision,undefined,'old proposal is history, not the current answer template');
assert.equal(inputs.investigationFrontier.value.originalQuestion,undefined);
assert.deepEqual(inputs.wholeDraft,delivered.wholeDraft);
assert.deepEqual(inputs.currentArmyAuthority,delivered.currentArmyAuthority);
assert.ok(captured.promptNodes.some(n=>n.kind==='strategy_owner_context'));
assert.match(projectRosterProviderInstructionsV1({request:captured}),/strategic owner/i);
assert.match(projectRosterProviderInstructionsV1({request:captured}),/fact.role.*histor/i);
assert.equal(captured.promptNodes.some(n=>n.kind==='strategy_semantic_repair'),false);
const after=state.work.find(w=>w.id===stopped.id);
assert.ok(after.operationState.correction.errors.some(e=>e.code==='unchanged_investigation_authorization'),
  'old invalid decision is still rejected; role transfer cannot approve it');
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);
assert.equal(JSON.stringify(reply),original);
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request,sourceRequest:first});
assert.equal(recovery?.repairKind,'incoming_author_ownership');
assert.equal(recovery.additionalInvalidResultLimit,1);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request:captured,sourceRequest:first}),null);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request}),null);
const wrong=structuredClone(first);wrong.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.batchFacts0.value.coordination.originalAssignmentWorkId='unrelated';
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:stopped,reply,request,sourceRequest:wrong}),null);
console.log(JSON.stringify({pass:true,sharedExecutor:true,currentOwnerQuestionsPreserved:true,historicalTaskSeparated:true,
  currentAuthorityUnchanged:true,repeatedInquiryStillRejected:true,oneLegacyRecoveryOnly:true,realProviderCalls:0,nativeCalls:0,
  productionWrites:0,elapsedMs:Math.round(performance.now()-started)}));
