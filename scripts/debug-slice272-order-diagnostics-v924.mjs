// Concrete A bug: fail-fast hid the independently invalid second selector.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1 as compile} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1,projectRosterUnissuedOrderRecoveryV1,projectRosterOrderCorrectionTaskV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const report={schema:'slice272_order_diagnostics_v924',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const original=await fs.readFile(directory+'/workflow.json','utf8'),state=JSON.parse(original);
  const ref='12973d6fa14384c566776a10d73507eb4718a36af65d4483d1d52f74a56dc051';
  const work=state.work.find(w=>w.resultRef===ref);assert.ok(work);
  const readArtifact=async ref=>JSON.parse(await fs.readFile(`${directory}/artifacts/${ref}.json`,'utf8'));
  const result=await readArtifact(ref),failure=result.value.failedWorkOrders[0];
  const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact});
  const options={scope:work.bindings,namespace:'diagnostics-v924',evidenceDirectory:state.evidence,...context};
  const validateOrder=order=>compile({...options,order});
  const fail=order=>{try{validateOrder(order);assert.fail('Expected invalid input');}catch(error){return error;}};
  const error=fail(copy(failure.order)),diagnostics=error.detail?.workOrderDiagnostics;
  assert.ok(diagnostics,'Same order must deliver both independently known step errors');
  assert.equal(error.code,failure.error.code);
  assert.equal(diagnostics.nativeExecuted,false);assert.equal(diagnostics.completeValidation,false);
  assert.deepEqual(diagnostics.steps.map(s=>[s.stepId,s.code]),[
    ['s1','ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID'],['s2','ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT']]);
  assert.deepEqual(error.detail.receivedEnvelope,failure.error.detail.receivedEnvelope);
  // Explicit synthetic corrected proposal, NOT a modification of production or
  // an automatic Host choice. A future option still has a normal choice gate.
  const fixed=copy(failure.order),args=JSON.parse(fixed.steps[0].argumentsJson);
  args.base=args.queryArguments.base;delete args.queryArguments.base;
  fixed.steps[0].argumentsJson=JSON.stringify(args);
  const selection=JSON.parse(fixed.steps[1].argumentsJson);
  selection.selections=[{fromStepId:'s1',optionIndex:0}];
  fixed.steps[1].argumentsJson=JSON.stringify(selection);fixed.steps[1].bindings=[];
  const jobs=validateOrder(fixed);assert.equal(jobs.length,2);
  assert.ok(jobs[1].inputs.request.value.modelChoiceSources?.length);
  assert.deepEqual(jobs[0].inputs.request.value.args.base,args.base);
  const one=copy(fixed);one.steps[1]=copy(failure.order.steps[1]);
  const oneError=fail(one);assert.equal(oneError.code,'ROSTER_WORKFLOW_FORMATION_SELECTOR_CONTRACT');
  assert.equal(oneError.detail.workOrderDiagnostics,undefined,'Single error keeps the existing contract');
  const recover=(overrides={})=>projectRosterUnissuedOrderRecoveryV1({state,work,failure,index:0,
    limit:work.orderRepairLimit,validateOrder,...overrides});
  const recovery=recover();assert.ok(recovery,'New second-step diagnostic gets one bounded author correction');
  assert.equal(recovery.limit,work.orderRepairGeneration+1);
  assert.equal(recovery.contractRecovery.additionalConfirmationLimit,1);
  assert.equal(recovery.contractRecovery.historyReset,false);
  const task=projectRosterOrderCorrectionTaskV1({failure,recovery});
  assert.deepEqual(task.failedOrder,failure.order);assert.deepEqual(task.historicalError,failure.error);
  assert.deepEqual(task.error.detail.workOrderDiagnostics,diagnostics);
  const paid=copy(state),paidWork=paid.work.find(w=>w.id===work.id);paidWork.contractRecovery=copy(recovery.contractRecovery);
  assert.equal(recover({state:paid,work:paidWork}),null);
  assert.equal(recover({failure:{...copy(failure),error:copy(task.error)}}),null);
  assert.equal(recover({work:{...work,operationState:{pending:{requestRef:'unknown'}}}}),null);
  assert.equal(recover({validateOrder:()=>{throw Object.assign(Error('network'),{code:'NETWORK_ERROR'});}}),null);
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  report.pass=true;report.checked=['two exact step errors from real compiler','original error and request unchanged',
    'synthetic corrected proposal retains source and future choice gate','single error contract preserved',
    'one source-diagnostic recovery; repeat/pending/unrelated cases rejected'];
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
