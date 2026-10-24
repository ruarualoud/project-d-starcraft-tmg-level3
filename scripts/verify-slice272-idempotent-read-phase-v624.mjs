// Actual opponent role read valid r6 texts, asked to confirm them again, and
// stopped after ONE repeat because a prior one-extra correction limit leaked.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8');let state=JSON.parse(raw);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const id='review-resolution:r6:opponent_and_counters',before=structuredClone(state.work.find(w=>w.id===id));
assert.equal(before.failure.code,'ROSTER_WORKFLOW_ROLE_READS_NOT_CONVERGED');assert.equal(before.operationState.correctionLimit,1);
const paidRef=before.operationState.correction.originalReplyRef,paid=await store.get(paidRef);assert(paid.output.reads.length);
const executor=createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-phase',store,
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}}});
const workflow=await createRosterDecisionWorkflowV1({store,execute:executor});
let resumeError;try{await workflow.dispatch({type:'revalidate_role_reply',workId:id,
  reason:'Concrete v624 engineering fix: idempotent reads return to decision preparation; the old extra allowance is scoped to its original failure.'});}catch(error){resumeError=error;}
assert.equal(resumeError,undefined,'BUG: completed no-progress read reply cannot be revalidated through the product seam');
await workflow.dispatch({type:'run_ready',workIds:[id],concurrency:1});
const current=(await workflow.inspect()).work.find(w=>w.id===id);
assert.equal(current.status,'needs_model_choice','repeat should advance preparation phase, not halt or pass the whole question');
assert.equal(current.failure,null);assert(current.operationState.readPreparationReturnRequired);
assert.equal(current.operationState.correctionLimit,3,'one-extra allowance must expire after the corrected reply is processed');
assert.equal(current.operationState.calls.length,before.operationState.calls.length,'paid calls must not be added/reset by revalidation');
assert.equal(current.operationState.completedCorrectionRecoveries.at(-1).validatedReplyRef,paidRef);
assert(current.failureHistory.length>=(before.failureHistory?.length??0)+1);
const result=await store.get(current.resultRef);assert.equal(result.value.preparationReturned,true);
let captured;const marker=Error('CAPTURE_NEXT_PHASE');
const next=createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-phase',store,deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},
  onRequest:async request=>{captured=request;throw marker;}});
const assignment={workId:id,role:current.role,scope:state.scope,inputs:(await store.get(before.inputRef)).inputs,
  evidenceDirectory:(await workflow.inspect()).evidence.map(e=>({...e,validity:'current'}))};
await assert.rejects(()=>next(assignment,{operationState:current.operationState,checkpointOperation:async()=>{},
  readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
assert.deepEqual(captured.responseFormat.schema.properties.action.enum,['finish','conclude']);
assert(captured.promptNodes.some(n=>n.kind==='read_preparation_return'));
assert.deepEqual(await store.get(paidRef),paid);
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actualPaidReplyRevalidated:true,duplicateReadReturnsDecisionPhase:true,
  extraAllowanceDoesNotLeak:true,paidCallsRetained:current.operationState.calls.length,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
