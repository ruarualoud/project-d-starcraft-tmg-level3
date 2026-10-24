// Actual v976 stopped owner: new navigation was present, but the prior proposal
// stayed in current inputs and correction never reached the shared author command.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
const directory=process.argv[2],copy=structuredClone,memory=new Map(),cache=new Map();
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));
  if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8')));
  return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const original=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),originalHash=hash(original);
let state=copy(original);
const work=state.work.find(w=>w.id.endsWith(':capability-delivery-reconsideration:v2'));
assert.equal(work.failure.code,'ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
const first=await get(work.operationState.calls[0].requestRef);
const last=work.operationState.calls.at(-1),reply=await get(last.replyRef),request=await get(last.requestRef);
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},get,put};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('Control only')});
await workflow.dispatch({type:'resume_role_correction',workId:work.id,reason:'Offline injection of verified owner-context repair'});
let operation=copy(state.work.find(w=>w.id===work.id).operationState),captured=null;
const assignment=await get(work.inputRef);
assignment.inputs=copy(first.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs);
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v978',
  deliberation:{deliberate:async q=>{captured=q;throw Error('CAPTURE_ONLY_NO_PROVIDER');}}});
const control={get operationState(){return copy(operation);},checkpointOperation:async op=>{operation=copy(op);},
  readEvidence:async()=>assert.fail('No new query in request construction'),
  publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v978:'+ref;
    let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
    if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
      title:metadata.title??'Test context',kind:metadata.kind??'interpretation',validity:'current',
      bindings:copy(original.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
    return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
      ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
try{await execute(assignment,control);}catch(e){if(e.message!=='CAPTURE_ONLY_NO_PROVIDER')throw e;}
assert(captured);
const owner=captured.promptNodes.find(n=>n.kind==='strategy_owner_assignment');
assert.equal(owner?.returnKind,'capability_delivery_reconsideration',
  'Capability repair must enter the same strategic owner stage, not a generic local correction');
const sent=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(sent.inputs.heldInvestigation,undefined,'Old proposal is historical, not the current answer template');
assert.deepEqual(owner.questions.map(q=>q.question),assignment.inputs.heldInvestigation.value.decisions.flatMap(d=>d.dataQuestions.map(q=>q.question)));
assert.equal(owner.factApprovalGranted,false);assert.equal(owner.planApprovalGranted,false);
assert.equal(owner.deliveryRepairDoesNotProveToolWasUnavailable,true);
const command=captured.promptNodes.find(n=>n.kind==='strategy_semantic_repair'&&n.version===3);
assert(command,'Existing structured author command must apply on this corrected handoff');
assert.deepEqual(captured.strategyRepairState.originalOutput,reply.output);
assert.equal(captured.userMessage.startsWith('AUTHOR DECISION COMMAND:'),true);
const context=captured.promptNodes.find(n=>n.kind==='strategy_owner_context');
assert(context?.deferred.some(d=>d.name==='historical_assignment_context'));
const saved=await get(assignment.evidenceDirectory[context.source.evidenceNumber-1].artifactRef);
assert.deepEqual(saved.promptNodes.find(n=>n.kind==='historical_assignment_context').assignments.heldInvestigation,
  assignment.inputs.heldInvestigation,'Historical proposal remains available byte-for-value');
const recovery=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request,sourceRequest:first});
assert.equal(recovery?.repairKind,'incoming_author_ownership');
assert.equal(recovery.feedbackVersion,978);assert.equal(recovery.additionalInvalidResultLimit,1);
assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:captured,sourceRequest:first}),null,
  'New owner protocol must not grant itself another retry');
const wrong=copy(assignment);wrong.inputs.capabilityDeliveryRepair.value.sourceReplyRef='f'.repeat(64);
assert.equal(projectRosterIncomingAuthorContextV1(wrong),null,'Mismatched saved source cannot claim owner routing');
assert.equal(hash(original),originalHash);
console.log(JSON.stringify({ok:true,checks:['actual_owner_return_not_local_patch','all_questions_and_history_retained',
  'existing_structured_author_command','one_old_protocol_recovery_only','wrong_source_rejected'],
  providerCalls:0,nativeCalls:0,productionWrites:0,planApproved:false}));
