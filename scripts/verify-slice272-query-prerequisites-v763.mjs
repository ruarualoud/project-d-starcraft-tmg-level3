// Actual method queued scenario -> inspect -> probability({}) while prose
// promised a later model selection. The incomplete query must not be dispatched.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {rosterComparisonPurposeFromProposalV1} from '../packages/roster-strategist/roster-comparison-purpose-v1.mjs';
import * as native from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]),read=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const scene=state.work.find(w=>/:order0:goliath-scene$/.test(w.id));
const owner=state.work.find(w=>w.id===scene.experimentOwnerId);
const result=await read(owner.resultRef),original=JSON.stringify(result);
const order=result.value.workOrders[0],number=order.experimentScope.comparisonBinding.purposeEvidenceNumber;
const source=state.evidence[number-1];
const comparisonPurpose={source:'evidence',status:'read',evidenceId:source.id,evidenceNumber:number,
  value:rosterComparisonPurposeFromProposalV1({value:await read(source.artifactRef)})};
const compile=(value,extra={})=>compileRosterWorkflowExperimentV1({order:value,scope:owner.bindings,
  namespace:'query-prerequisites-v763',evidenceDirectory:state.evidence,comparisonPurpose,...extra});
let failure;
try{compile(order);}catch(error){failure=error;}
assert.equal(failure?.code,'ROSTER_WORKFLOW_TOOL_ARGUMENT_CONTRACT',
  'new work must reject a probability step with no required participants before Native dispatch');
assert.deepEqual(failure.detail.missingArguments.map(x=>x.argument),['attackerUnitId','targetUnitId']);
assert.equal(failure.dispatchOutcome,'not_dispatched');
assert.equal(failure.detail.stepId,'goliath-melee-prob');
assert.match(failure.detail.instruction,/completionStepId/);
const known=structuredClone(order);
known.steps.at(-1).argumentsJson=JSON.stringify({attackerUnitId:'player2-kerrigan-raptor',targetUnitId:'goliath-1'});
assert.equal(compile(known).length,3,'parameter completeness does not select a weapon or prove a legal scene');
const deferred=structuredClone(order);
deferred.steps.at(-1).bindings.push(...['attackerUnitId','targetUnitId'].map(argument=>({
  argumentPointer:'/'+argument,fromStepId:'goliath-inspect',fromEvidenceNumber:0,resultPointer:'/receipt/availableUnits'})));
assert.equal(compile(deferred).length,3,
  'an explicit value dependency is not a missing model choice; Native still validates its eventual type/value');
const prefix=structuredClone(order);
prefix.steps.pop();prefix.completionStepId='';
prefix.experimentScope.comparisonBinding.stage='prerequisite';
prefix.experimentScope.comparisonBinding.observationStepIds=[];
assert.equal(compile(prefix).length,2,'the model may intentionally stop after a real inspect and choose later');
const retained=compile(order,{namespace:owner.id+':order0',retainedWork:state.work});
assert.deepEqual(retained,state.work.filter(w=>order.steps.some(step=>w.id===owner.id+':order0:'+step.stepId)),
  'saved work remains exact; new validation does not replay or rewrite prior work');
const required=native.describePregameWorkflowInputContractsV1().probability.requiredArguments;
assert.deepEqual(required,['attackerUnitId','targetUnitId']);
assert.deepEqual(native.inspectPregameRequiredArgumentsV1({operation:'probability',args:{}}),
  failure.detail.missingArguments,'compiler and Native use the same required-argument classifier');
assert.deepEqual(native.inspectPregameRequiredArgumentsV1({operation:'probability',
  args:{attackerUnitId:'a',targetUnitId:'b'}}),[]);
assert.equal(JSON.stringify(await read(owner.resultRef)),original);
console.log(JSON.stringify({passed:true,actualEmptyQueryRejectedBeforeDispatch:true,
  explicitBindingsPreserved:true,readThenChooseSupported:true,oldCompiledWorkUnchanged:true,
  sourceOwnedArgumentContract:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
