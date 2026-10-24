// Exact B work order rejected before ANY step ran. No model or Native replay.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {validateRosterMeasuredComparisonV1,compareRosterMeasuredObservationsV1} from '../packages/roster-strategist/roster-measured-comparison-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1,projectRosterUnissuedOrderRecoveryV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const ref='bb78062d813a4520abb69834384109ca4106e383236d9d12567ddc53f29dec7d';
const work=state.work.find(w=>w.resultRef===ref),result=await get(ref),order=result.value.failedWorkOrders[0].order;
const context=await prepareRosterWorkflowMethodCompilationV1({state,work,result,readArtifact:get});
const report={pass:false,checks:[],actualProviderCalls:0,nativeCalls:0,productionWrites:0};
try{
  const before=JSON.stringify(order),jobs=compileRosterWorkflowExperimentV1({order,scope:work.bindings,
    namespace:'fixture-v893',evidenceDirectory:state.evidence,...context});
  assert.equal(jobs.length,5);
  const comparison=jobs.at(-1);
  assert.equal(comparison.inputs.observation_left.id,'fixture-v893:goliath-prob');
  assert.equal(comparison.inputs.observation_right.id,'fixture-v893:marauder-prob');
  assert.equal(JSON.stringify(order),before);
  const spec=JSON.parse(order.steps.at(-1).argumentsJson);
  const left=await get('c146b38c312ee42b3fa470e1d8367b346b5fb4a8ab3bed13d1e379cf1916b8a3');
  const right=await get('3c6861f84af37d12fd3913e687e558b5f97d49677f9c8b16a09eacbad6fe7573');
  const receipt=compareRosterMeasuredObservationsV1({spec,sources:{left:{value:left.value},right:{value:right.value}}});
  assert.equal(receipt.resultStatus,'ok');assert(Math.abs(receipt.observation.difference-1.6388888889)<1e-8);
  assert.equal(receipt.strategyApprovalGranted,false);assert.equal(receipt.predicate.satisfied,true);
  const ambiguous=clone(spec);ambiguous.left.fromEvidenceNumber=573;
  assert.throws(()=>validateRosterMeasuredComparisonV1(ambiguous),{code:'ROSTER_MEASUREMENT_ARGUMENT_INVALID'});
  const invented=clone(spec);invented.left.expectedDamage=99;
  assert.throws(()=>validateRosterMeasuredComparisonV1(invented),{code:'ROSTER_MEASUREMENT_ARGUMENT_INVALID'});
  const wrongType=clone(spec);wrongType.left.weaponName=0;
  assert.throws(()=>validateRosterMeasuredComparisonV1(wrongType),{code:'ROSTER_MEASUREMENT_ARGUMENT_INVALID'});
  const unknown=compareRosterMeasuredObservationsV1({spec,sources:{left:{value:{operation:'probability',status:'completed',receipt:{resultStatus:'unknown'}}},right:{value:right.value}}});
  assert.equal(unknown.resultStatus,'unknown');assert.equal(unknown.observation,null);
  const row={attackerUnitId:spec.left.attackerUnitId,targetUnitId:spec.left.targetUnitId,weaponName:'a',outcomes:{expectedDamage:1}};
  const multi=compareRosterMeasuredObservationsV1({spec,sources:{left:{value:{operation:'threat_exchange',status:'completed',
    receipt:{resultStatus:'ok',exchange:{attackEstimates:[row,{...row,weaponName:'b'}]}}}},right:{value:right.value}}});
  assert.equal(multi.unknownReason,'ambiguous_attack_row');assert.equal(multi.observation,null);
  report.checks.push({name:'actual-order-and-observed-arithmetic',pass:true,jobs:5,difference:receipt.observation.difference,negativeCases:5});
  const tail=state.work.find(w=>w.resultRef==='4894d070eed3f2896fc012c38c61b099d1081f59d4c9d3279665245157d9cb32');
  const failed=await get(tail.resultRef),failure=failed.value.failedWorkOrders[0];
  const tailContext=await prepareRosterWorkflowMethodCompilationV1({state,work:tail,result:failed,readArtifact:get});
  const validateOrder=order=>compileRosterWorkflowExperimentV1({order,scope:tail.bindings,
    namespace:'fixture-recovery',evidenceDirectory:state.evidence,...tailContext});
  assert.throws(()=>validateOrder(failure.order),{code:'ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID'},'old scope must NOT become current');
  const recovery=projectRosterUnissuedOrderRecoveryV1({state,work:tail,failure,index:0,limit:3,validateOrder});
  assert.equal(recovery?.contractRecovery?.kind,'measured_selector_union_v2');
  assert.equal(recovery.contractRecovery.additionalConfirmationLimit,1);
  assert.equal(recovery.contractRecovery.remainingInputError.code,'ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID');
  const spent=clone(state);spent.work.find(w=>w.id===tail.id).contractRecovery=recovery.contractRecovery;
  assert.equal(projectRosterUnissuedOrderRecoveryV1({state:spent,work:spent.work.find(w=>w.id===tail.id),failure,index:0,limit:3,validateOrder}),null);
  report.checks.push({name:'one-confirmation-with-stale-source-still-rejected',pass:true});
  report.pass=true;
}catch(error){report.error={code:error.code,message:error.message,detail:error.detail,stack:error.stack?.split('\n').slice(0,4)};process.exitCode=1;}
await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
