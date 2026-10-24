// Actual v803 author chose a candidate, but its read prerequisite was charged
// as a semantic failure and the suggested pointer addressed the view, not source.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolveRosterWorkflowBudgetSelectionV1} from '../packages/roster-strategist/roster-workflow-budget-selection-v1.mjs';
import {projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const started=performance.now();let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const stopped=state.work.find(w=>w.status==='needs_repair'&&w.operationState?.correction?.originalReplyRef==='1d5fc120b23f17596681b43a3756d2a7e92b669d40a7a49221f6650af4811dfe');
assert.ok(stopped);const last=stopped.operationState.calls.at(-1);
const request=await get(last.requestRef),reply=await get(last.replyRef),original=JSON.stringify(reply);
const projected=projectRosterStrategyRepairOutputV1({request,output:reply.output});assert.deepEqual(projected.errors,[]);
const decision=projected.output.decisions[0],draftRef=state.draftRef,draft=await get(draftRef);
let error;try{await resolveRosterWorkflowBudgetSelectionV1({decision,draft,state,work:stopped,store:{get}});}catch(e){error=e;}
assert.equal(error?.code,'ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED');
assert.equal(error.detail.read.evidenceNumber,471,'candidate source pointer must address the immutable ORIGINAL, not its view 472');
assert.equal(error.detail.read.pointer,'/request/candidateInput');
const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work:stopped,reply,request});
assert.equal(recovery?.repairKind,'selected_candidate_read_handoff');
assert.equal(recovery.providerReplayed,false);
const modern={...request,promptNodes:[...request.promptNodes,{kind:'selected_candidate_read_contract',version:1}]};
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work:stopped,reply,request:modern}),null);
const first=await get(stopped.operationState.calls[0].requestRef),delivered=first.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const memory=new Map();let calls=0,captured;
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v804-candidate-source-fixture',
  deliberation:{deliberate:async q=>{calls++;captured=q;return {output:reply.output,receipt:{fixture:true}};}}});
const graph=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>execute({...assignment,inputs:structuredClone(delivered)},control)});
await graph.dispatch({type:'revalidate_role_reply',workId:stopped.id,reason:'concrete selected-candidate read source repair'});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
let after=state.work.find(w=>w.id===stopped.id),result=(await store.get(after.resultRef)).value;
assert.equal(calls,0,'reuse the saved selected command without rebuying it');
assert.equal(after.status,'needs_model_choice',JSON.stringify({failure:after.failure,errors:after.operationState.correction?.errors}));
assert.equal(result.status,'evidence_reads_pending_recheck');
assert.equal(result.conclusionAccepted,false);assert.equal(result.readCount,1);
const row=after.operationState.reads.findLast(r=>r.evidenceId===state.evidence[470].id&&r.pointer==='/request/candidateInput');
assert.ok(row);const fetched=await store.get(row.resultRef),source=await get(state.evidence[470].artifactRef);
assert.equal(fetched.status,'read');assert.deepEqual(fetched.value,source.request.candidateInput);
assert.equal(state.draftRef,draftRef);
await graph.dispatch({type:'continue_work',workId:stopped.id});
await graph.dispatch({type:'run_ready',workIds:[stopped.id],concurrency:1});
after=state.work.find(w=>w.id===stopped.id);result=(await store.get(after.resultRef)).value;
assert.equal(calls,1);assert.ok(captured.responseFormat.schema.properties.action.enum.includes('decide'));
assert.equal(after.status,'evidence_ready',JSON.stringify({failure:after.failure,errors:after.operationState.correction?.errors}));
assert.equal(result.decisions[0].disposition,'revise');
const selected=await resolveRosterWorkflowBudgetSelectionV1({decision:result.decisions[0],draft,state,work:after,store});
assert.deepEqual(selected.candidateInput,source.request.candidateInput);
assert.equal(selected.receipt.builderRecheckRequired,true);assert.equal(selected.receipt.strategyApprovalGranted,false);
assert.equal(state.draftRef,draftRef);assert.equal(state.acceptanceGranted,false);assert.equal(JSON.stringify(reply),original);
console.log(JSON.stringify({pass:true,savedReplyReused:true,originalCandidateRead:true,authorConfirmationRequired:true,
  candidateUnchanged:true,builderRecheckStillRequired:true,sharedExecutor:true,realProviderCalls:0,nativeCalls:0,productionWrites:0,
  elapsedMs:Math.round(performance.now()-started)}));
