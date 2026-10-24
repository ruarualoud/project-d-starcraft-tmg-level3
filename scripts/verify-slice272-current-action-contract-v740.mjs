// The real counterfire request supplied unit filters to a current-action
// query. Runtime rejected it, but discovery/compilation did not state or enforce
// the shared reference requirement. No actual Rules query is replayed here.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as contracts from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]);
const original=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(original);
const work=state.work.find(w=>w.id.endsWith(':order0:threat-kerrigan-vs-goliath')&&w.resultRef);
assert(work,'actual failure required');
const saved=JSON.parse(await fs.readFile(path.join(root,'artifacts',work.resultRef+'.json'),'utf8'));
assert.equal(saved.value.receipt.unknownReason,'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
const proposed=work.inputs.request.value;
const order={orderId:'source-reference-proof',purpose:proposed.purpose,
  scenarioAssumptions:proposed.scenarioAssumptions,
  experimentScope:{...structuredClone(proposed.experimentScope),comparisonBinding:null},
  stopAndReturnToModelWhen:proposed.stopAndReturnToModelWhen,completionStepId:'query',
  steps:[{stepId:'query',operation:'spatial',argumentsJson:JSON.stringify(proposed.args),
    bindings:[],guards:[],publicReason:proposed.publicReason}]};
const compile=value=>compileRosterWorkflowExperimentV1({order:value,scope:work.bindings,namespace:'v740'});
const failures=[];
function check(name,run){try{run();}catch(error){failures.push({name,error:error.code??error.message});}}
check('all-domain-queries-discover-the-same-reference-contract',()=>{
  for(const row of Object.values(contracts.STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1)){
    if(row.domain!==true)continue;
    assert.equal(row.domainReferenceContract?.referenceRequired,true);
    assert.equal(row.domainReferenceContract?.currentSeatOnly,true);
    assert.equal(row.domainReferenceContract?.unitFiltersSelectAction,false);
  }
});
check('actual-invalid-order-rejected-before-native',()=>{
  assert.throws(()=>compile(order),e=>e.code==='ROSTER_WORKFLOW_CURRENT_ACTION_REFERENCE_INVALID'
    &&e.detail.reason==='CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
});
check('reference-aliases-and-conflicts-preserve-native-semantics',()=>{
  const inspect=contracts.inspectStarcraftTmgCurrentActionReferenceV1;
  assert.equal(typeof inspect,'function');
  assert.deepEqual(inspect({candidateId:'selected'}),{domainId:'selected',issue:null});
  assert.deepEqual(inspect({proposal:{domainId:'selected'}}),{domainId:'selected',issue:null});
  assert.equal(inspect({domainId:'a',candidateId:'b'}).issue.reason,'CURRENT_ACTION_QUERY_DOMAIN_REFERENCES_CONFLICT');
  assert.equal(inspect({domainId:''}).issue.reason,'CURRENT_ACTION_QUERY_DOMAIN_REFERENCE_REQUIRED');
  const selected=structuredClone(order);
  selected.steps[0].argumentsJson=JSON.stringify({queryKind:'action_specific_threat',
    queryArguments:{candidateId:'explicit-observed-id',parameters:{targetUnitId:'unit-b'}}});
  assert.equal(compile(selected)[0].inputs.request.value.args.queryArguments.candidateId,'explicit-observed-id');
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({passed:failures.length===0,failures,actualResultRef:work.resultRef,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
