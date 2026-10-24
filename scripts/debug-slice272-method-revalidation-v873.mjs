// Current A's paid local orders: narrower evidence scope is not a new identity,
// and an obsolete compiler error must not become the next current instruction.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import * as runModule from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterWorkflowHypothesisContextV1} from '../packages/roster-strategist/roster-workflow-hypothesis-context-v1.mjs';
const [root,out,previous,snapshotMode]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
let snapshotBytes='';
if(snapshotMode==='--snapshot-stdin')for await(const chunk of process.stdin)snapshotBytes+=chunk;
const saved=JSON.parse(snapshotBytes||await fs.readFile(root+'/workflow.json','utf8'));
const work=saved.work.findLast(w=>w.id.includes(':s3:observed-choice')&&w.status==='evidence_ready'&&w.orderRepairGeneration===4);
assert.ok(work);const result=await get(work.resultRef),order=result.value.failedWorkOrders[0].order;
const context=await runModule.prepareRosterWorkflowMethodCompilationV1({state:saved,work,result,readArtifact:get});
const compile=(o=order,c=context)=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,
  namespace:'v873-offline',evidenceDirectory:saved.evidence,...c});
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:{code:e.code,message:e.message}});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');console.log(JSON.stringify(checks.at(-1)));
}
await check('same-purpose-narrower-proof-scope-compiles-not-approved',()=>{
  const before=JSON.stringify(order),jobs=compile(),b=jobs[0].inputs.request.value.comparisonBinding;
  assert.equal(b.stage,'prerequisite');assert.equal(b.role,'supporting_step');assert.deepEqual(b.observationStepIds,[]);
  assert.equal(b.endpointReached,null);assert.equal(b.sourceApproved,false);
  assert.equal(b.arm,context.choiceContract.delegatedComparison.binding.arm);
  assert.equal(JSON.stringify(order),before);return {paidOrderUnchanged:true,measurementNotProven:true};
});
await check('different-identity-or-expanded-proof-is-still-rejected',()=>{
  const o=copy(order);o.experimentScope.comparisonBinding.arm='alternative';
  assert.throws(()=>compile(o),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
  const c=copy(context);c.choiceContract.delegatedComparison.binding.stage='baseline';
  o.experimentScope.comparisonBinding=copy(context.choiceContract.delegatedComparison.binding);
  o.experimentScope.comparisonBinding={...order.experimentScope.comparisonBinding,stage:'effect_endpoint',observationStepIds:['s1']};
  assert.throws(()=>compile(o,c),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
});
await check('actual-direct-selector-normalizes-without-rechoosing',async()=>{
  const w=saved.work.findLast(w=>w.id.includes(':s4:observed-choice')&&w.status==='evidence_ready');
  const r=await get(w.resultRef),o=r.value.failedWorkOrders[0].order;
  const c=await runModule.prepareRosterWorkflowMethodCompilationV1({state:saved,work:w,result:r,readArtifact:get});
  const jobs=compileRosterWorkflowExperimentV1({order:o,scope:w.bindings,namespace:'v873-selector',evidenceDirectory:saved.evidence,...c});
  assert.deepEqual(jobs[0].inputs.request.value.args.selections,[{sourceEvidenceNumber:157,optionIndex:0}]);
  assert.equal(jobs[0].inputs.request.value.args.sourceEvidenceNumber,undefined);
});
await check('fixed-contract-does-not-deliver-old-error-as-current',()=>{
  assert.equal(typeof runModule.projectRosterOrderCorrectionTaskV1,'function');
  const failure={order:copy(order),error:{code:'OLD',detail:{instruction:'Obsolete requirement'}}};
  const recovery={instruction:'Confirm the same order',contractRecovery:{kind:'unissued_order_contract_revalidated_v1'}};
  const t=runModule.projectRosterOrderCorrectionTaskV1({failure,recovery});
  assert.equal(t.error,null);assert.deepEqual(t.historicalError,failure.error);
  assert.equal(t.currentOrderValidation.status,'valid_not_executed');
  const remaining={code:'CURRENT',detail:{instruction:'Still invalid'}};
  const t2=runModule.projectRosterOrderCorrectionTaskV1({failure,recovery:{...recovery,contractRecovery:{remainingInputError:remaining}}});
  assert.deepEqual(t2.error,remaining);assert.deepEqual(t2.historicalError,failure.error);
  assert.equal(t2.currentOrderValidation.status,'needs_input_repair');
});
await check('paid-method-revalidates-through-role-without-provider-or-repeated-grant',async()=>{
  const derived=await runModule.createRosterCompletionRevalidationV1({state:saved,work,result,readArtifact:get});
  assert.ok(derived,'Exact paid method now executable must be revalidated through its original role');
  let state=copy(saved),providerCalls=0;const memory=new Map();
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get:async ref=>memory.has(ref)?copy(memory.get(ref)):get(ref),
    put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
  const paid=await get(result.value.originalReplyRef);
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v873-paid-method',
    deliberation:{deliberate:async request=>{
      providerCalls++;assert.equal(providerCalls,1,'Only the scripted author confirmation is allowed');
      const output=copy(paid.output);
      return {output,receipt:{fixture:true,contextHash:request.contextHash,roundKind:request.roundKind,
        sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(output)}};
    }}});
  // The product Run enriches role assignments with this shared projection.
  // Calling the raw executor without it is not the product's method seam.
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async(assignment,control)=>{
    const hypotheses=await projectRosterWorkflowHypothesisContextV1({state,workId:assignment.workId,readArtifact:store.get});
    return executor({...assignment,inputs:{...assignment.inputs,
      ...(hypotheses?{activeHypothesisTests:{source:'literal',value:hypotheses.context},...hypotheses.sourceInputs}:{})}},control);
  }});
  await workflow.dispatch({type:'enqueue',work:[derived]});
  await workflow.dispatch({type:'run_ready',workIds:[derived.id],concurrency:1});
  const waiting=state.work.find(w=>w.id===derived.id),waitingResult=await store.get(waiting.resultRef);
  assert.equal(waiting.status,'needs_model_choice',JSON.stringify(waiting.failure));
  assert.ok(['reads_completed','evidence_reads_pending_recheck'].includes(waitingResult.value.status));
  assert.equal(waiting.operationState.sourceRevalidation.authorConfirmation.phase,'awaiting_author_confirmation');
  assert.equal(providerCalls,0,'Saved-answer revalidation must not buy the original reply again');
  assert.equal(waiting.operationState.calls.length,work.operationState.calls.length);
  await workflow.dispatch({type:'continue_work',workId:derived.id});
  await workflow.dispatch({type:'run_ready',workIds:[derived.id],concurrency:1});
  const after=state.work.find(w=>w.id===derived.id),accepted=await store.get(after.resultRef);
  assert.equal(after.status,'evidence_ready',JSON.stringify({failure:after.failure,correction:after.operationState.correction,result:accepted.value.status}));
  assert.equal(accepted.value.failedWorkOrders.length,0,JSON.stringify(accepted.value.failedWorkOrders.map(f=>f.error)));
  assert.equal(accepted.value.workOrders.length,1);
  assert.equal(providerCalls,1);assert.equal(after.operationState.calls.length,work.operationState.calls.length+1);
  assert.equal(after.operationState.sourceRevalidation.authorConfirmation.phase,'submitted_for_review');
  assert.equal(state.draftRef,saved.draftRef);assert.equal(state.acceptanceGranted,false);
  assert.equal(await runModule.createRosterCompletionRevalidationV1({state,work,result,readArtifact:store.get}),null);
  return {actualProviderCalls:0,scriptedAuthorConfirmationCalls:providerCalls,paidMethodRetained:true,
    noRepeatedGrant:true,readHandoffNotApproval:true,executionStillPending:true};
});
await check('narrowed-metric-subset-never-removes-parent-obligations',()=>{
  const before=JSON.stringify(context.choiceContract.delegatedComparison.binding);
  const b=compile()[0].inputs.request.value.comparisonBinding;
  assert.deepEqual(b.measurements.map(x=>x.number),[1]);assert.equal(b.parentMeasurementStillUnproven,true);
  assert.equal(context.choiceContract.delegatedComparison.binding.measurements.length,3);
  const o=copy(order);o.experimentScope.comparisonBinding.measurementNumbers=[4];
  assert.throws(()=>compile(o),e=>e.code==='ROSTER_COMPARISON_BINDING_INVALID');
  assert.equal(JSON.stringify(context.choiceContract.delegatedComparison.binding),before);
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(x=>x.pass),complete:true,checks,
  source:{root,workId:work.id,resultRef:work.resultRef},providerCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(x=>x.pass)?0:1;
