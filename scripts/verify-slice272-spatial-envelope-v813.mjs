// Replay the actual query that nested its intended parent inside Native fields.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1,projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {prepareRosterWorkflowMethodCompilationV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterWorkflowToolReturnWorkV1} from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef==='32e740be7e62a06d2d3f64b4520af57c4d6f276d84a3977b7354960413db3670');
assert.ok(work);const failure=(await get(work.resultRef)).value,original=JSON.stringify(failure);
const owner=state.work.find(w=>w.id===work.experimentOwnerId),result=await get(owner.resultRef);
const order=result.value.workOrders.find(o=>o.orderId===work.inputs.request.value.orderId);
assert.ok(order);const frozen=JSON.stringify(order);
const context=await prepareRosterWorkflowMethodCompilationV1({state,work:owner,result,readArtifact:get});
const compile=o=>compileRosterWorkflowExperimentV1({order:o,scope:work.bindings,namespace:'v813-fixture',evidenceDirectory:state.evidence,...context});
let error;try{compile(order);}catch(e){error=e;}
assert.equal(error?.code,'ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID','parent identity must be rejected before a query defaults to the source root');
assert.deepEqual(error.detail.misplacedEnvelopeFields,['stateRef']);
assert.equal(error.detail.sourceContract,'roster_spatial_envelope_v2');
// Fixture-only correction; the production model must make this choice itself.
const fixed=structuredClone(order),args=JSON.parse(fixed.steps[0].argumentsJson);
args.stateRef=args.queryArguments.stateRef;delete args.queryArguments.stateRef;
fixed.steps[0].argumentsJson=JSON.stringify(args);
const jobs=compile(fixed);assert.deepEqual(jobs[0].inputs.request.value.args.stateRef,args.stateRef);
assert.deepEqual(jobs[0].inputs.request.value.args.queryArguments,args.queryArguments);
// No extra gate on an intentional root-source query, and no automatic relocation.
const rootOrder=structuredClone(fixed),rootArgs=JSON.parse(rootOrder.steps[0].argumentsJson);
delete rootArgs.stateRef;rootOrder.steps[0].argumentsJson=JSON.stringify(rootArgs);assert.equal(compile(rootOrder).length,1);
const repair=projectRosterWorkflowToolRepairV1(failure);
assert.equal(repair.sourceContract,'roster_spatial_envelope_v2');
assert.deepEqual(repair.misplacedEnvelopeFields,['stateRef']);assert.equal(repair.originalQueryNotAnswered,true);
assert.deepEqual(repair.receivedEnvelope.stateRef,args.stateRef);
const make=(s,w=work)=>createRosterWorkflowToolReturnWorkV1({state:s,work:w,failure,queryRepair:repair,toolDescriptor:{},sourceInputs:{}});
const returned=make(state);assert.ok(returned,'the exact newly corrected source contract earns one recovery without resetting history');
assert.equal(returned.controlledRecovery.engineeringChangeId,'spatial_envelope_v813');
assert.equal(returned.controlledRecovery.historyReset,false);assert.equal(returned.repairGeneration,4);
assert.equal(make({...state,work:[...state.work,returned]}),null);
assert.equal(make(state,{...work,controlledRecovery:returned.controlledRecovery}),null);
const ordinary=createRosterWorkflowToolReturnWorkV1({state,work,failure,queryRepair:{correctable:true,sourceContract:'unrelated'},toolDescriptor:{},sourceInputs:{}});
assert.equal(ordinary,null,'other exhausted errors do not receive a new window');
assert.equal(JSON.stringify(order),frozen);assert.equal(JSON.stringify(failure),original);
console.log(JSON.stringify({pass:true,actualNativeFailure:true,compilerRejectsBeforeDispatch:true,
  sameParentAndNativeFieldsPreserved:true,sameDiagnosticForSavedFailure:true,oneNamedRecovery:true,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
