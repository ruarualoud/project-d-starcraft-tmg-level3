// Actual v2 design work received a generic Teach schema, then had no successor.
// Capture the real read-role request and scheduling seam without a Provider.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1}
  from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';

const root=path.resolve(process.argv[2]),memory=new Map();
const read=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
  JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const saved=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const before=JSON.stringify(saved),draft=await read(saved.draftRef);
const work=saved.work.find(w=>w.strategyComparisonDesignCycleId&&w.inputs.comparisonDesignGoal?.value?.version===2);
assert.ok(work?.resultRef);
const original=await read(work.resultRef);
assert.ok(original.value.proposals.length>1&&!original.value.proposals[0].comparisonPurpose);
const lastCall=work.operationState.calls.at(-1),paidRequest=await read(lastCall.requestRef);
assert.equal(paidRequest.responseFormat.schema.properties.proposals.items.properties.comparisonPurpose,undefined);
const assignment=await read(work.inputRef),failures=[];
const put=async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');
  memory.set(ref,structuredClone(value));return ref;};
for(const version of [2,1]){
  let captured;
  const execute=createRosterWorkflowReadRoleExecutorV1({store:{load:async()=>saved,get:read,put},
    sessionId:'design-stage-only',deliberation:{deliberate:()=>{throw Error('NO_PROVIDER_ALLOWED');}},
    onRequest:async request=>{captured=request;throw Error('CAPTURE_ONLY');}});
  const input=structuredClone(assignment);input.inputs.comparisonDesignGoal.value.version=version;
  try{await execute(input,{operationState:structuredClone(work.operationState),checkpointOperation:async()=>{}});}
  catch(error){if(error.message!=='CAPTURE_ONLY')throw error;}
  try{
    assert.ok(captured?.responseFormat.schema.properties.proposals.items.properties.comparisonPurpose);
    assert.equal(captured.responseFormat.schema.properties.proposals.maxItems,1);
    assert.match(captured.userMessage,/experiment PURPOSE\/DESIGN/);
  }catch(error){failures.push({case:'actual-role-version-'+version,error:error.message});}
}
const calls=[],run=new Proxy({}, {get:(_target,name)=>async value=>{calls.push({name,value});}});
const cycle=await assessRosterProductHypothesisCycleV1({state:saved,draft,readArtifact:read});
await progressRosterProductComparisonV1({run,state:saved,draft,cycle});
try{
  assert.equal(calls[0]?.name,'requestStrategicComparisonDesign');
  assert.equal(calls[0].value.contractRepairWorkId,work.id);
  assert.equal(calls[0].value.designRevision,work.designRevision);
  assert.ok(!calls.some(c=>c.name==='requestExperiment'));
}catch(error){failures.push({case:'completed-wrong-contract-return',error:error.message});}
// A model failure under the RIGHT contract must not open a new recovery lane.
const current=structuredClone(saved);
const currentWork=current.work.find(w=>w.id===work.id);
const rightRequest=structuredClone(paidRequest);
rightRequest.responseFormat.schema.properties.proposals.items.properties.comparisonPurpose={type:'object'};
currentWork.operationState.calls.at(-1).requestRef=await put(rightRequest);
calls.length=0;
await progressRosterProductComparisonV1({run,state:current,draft,
  cycle:await assessRosterProductHypothesisCycleV1({state:current,draft,readArtifact:read})});
try{assert.equal(calls.length,0,'no unlimited repair of correct-contract model failures');}
catch(error){failures.push({case:'no-unlimited-recovery',error:error.message});}
assert.equal(JSON.stringify(saved),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
