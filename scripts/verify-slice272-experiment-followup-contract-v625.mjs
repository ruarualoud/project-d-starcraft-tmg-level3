// Reproduce actual 1095/1100/1108: future strategy uncertainty was placed in
// unresolvedQuestions and received only a bare error code, repeatedly.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1,ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const raw=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(raw),memory=new Map();
const store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const before=state.work.find(w=>w.id==='review-resolution:r6:opponent_and_counters');
assert.equal(before.operationState.correction.errors[0].code,'experiment_answer_has_unresolved_necessary_facts');
const paidRef=before.operationState.correction.originalReplyRef,paid=await store.get(paidRef);
assert.equal(paid.output.action,'conclude');assert.equal(paid.output.conclusion.status,'answered');assert.equal(paid.output.unresolvedQuestions.length,1);
assert.match(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema.properties.unresolvedQuestions.description??'',/necessary current facts/i,
  'BUG: the output schema does not distinguish necessary current facts from future strategy conditions');
assert.match(ROSTER_WORKFLOW_EXPERIMENT_CONTRACT_V1.providerSchema.properties.conclusion.anyOf[0].properties.conditions.description,/future|optional/i);
const assignment={workId:before.id,role:before.role,scope:state.scope,inputs:(await store.get(before.inputRef)).inputs,
  evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))};
const control=op=>({operationState:op,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
const marker=Error('CAPTURE_NEXT_REQUEST');let captured;
const capture=createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-v625',store,
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async request=>{captured=request;throw marker;}});
await assert.rejects(()=>capture(assignment,control(before.operationState)),e=>e===marker);
const feedback=captured.promptNodes.find(n=>n.kind==='local_contract_feedback');
assert.deepEqual(feedback.originalOutput,paid.output);
const err=feedback.errors.find(e=>e.code==='experiment_answer_has_unresolved_necessary_facts');
assert.equal(err.pointer,'/unresolvedQuestions');assert.deepEqual(err.received,paid.output.unresolvedQuestions);
assert.match(err.instruction,/conclusion\.conditions/);assert.match(err.instruction,/do not.*(?:delete|demote)/i);
assert(captured.promptNodes.some(n=>n.kind==='experiment_followup_contract'));
let observed;
const replay=async output=>{
  const ref=await store.put({...paid,output}),op=structuredClone(before.operationState);
  op.revalidateReplyRef=ref;op.consecutiveCorrections=0;op.correctionLimit=3;
  const executor=createRosterWorkflowReadRoleExecutorV1({sessionId:'isolated-v625',store,
    deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}}});
  return executor(assignment,{...control(op),checkpointOperation:async value=>{observed=structuredClone(value);}});
};
const original=await replay(paid.output);assert.equal(original.value.status,'needs_local_correction');
assert.equal(observed.correction.errors[0].pointer,'/unresolvedQuestions');
// Explicit corrected-output fixture, NOT a real model correction or production
// edit. The uncertainty is preserved verbatim and source review is still owed.
const fixture=structuredClone(paid.output),future=fixture.unresolvedQuestions[0];
fixture.unresolvedQuestions=[];fixture.conclusion.conditions.push(future);
const corrected=await replay(fixture);assert.equal(corrected.value.experimentConclusion.status,'answered');
assert(corrected.value.experimentConclusion.conditions.includes(future));assert.equal(corrected.value.acceptanceGranted,false);
assert.deepEqual(corrected.value.outputProjection,[]);
const missing=structuredClone(fixture);missing.unresolvedQuestions=['The adopted deployment path has no Native feasibility result.'];
const blocked=await replay(missing);assert.equal(blocked.value.status,'needs_local_correction');
assert.deepEqual(observed.correction.errors[0].received,missing.unresolvedQuestions);
assert.deepEqual(await store.get(paidRef),paid);assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),raw);
console.log(JSON.stringify({passed:true,actualPaidReplyStillRejected:true,preciseHistoricalFeedback:true,
  explicitFixturePreservesFutureCondition:true,necessaryFactStillBlocks:true,automaticReclassification:false,
  actualModelCorrectionProven:false,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
