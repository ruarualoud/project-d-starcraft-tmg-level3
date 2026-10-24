// Actual31 knew the saved scene; its invalid-order child (actual32) lost that
// dependency and invented a truncated hash. Exercise the real role seam.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original),memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(state),save:async()=>{},get,put:async value=>{const key='proof-'+memory.size;memory.set(key,structuredClone(value));return key;}};
const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('READ_ONLY_PROOF');}});
const fixtureNumber=Number(process.argv[3]??32);
const req=JSON.parse(await fs.readFile(path.join(run,fixtureNumber+'.request.json'),'utf8')).request;
const assignment=req.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const paid=JSON.parse(await fs.readFile(path.join(run,'30.reply.json'),'utf8'));
let calls=0,checkpoint;const reads=[];
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'repair-dependency-proof',deliberation:{deliberate:async request=>{
  calls++;
  const inherited=request.promptNodes.find(n=>n.kind==='inherited_experiment_dependencies');
  assert.ok(inherited,'invalid-order repair must retain the executed parent binding, not only failedOrder');
  const scene=inherited.bindings.find(row=>row.argumentPointer==='/stateRef'&&row.evidenceNumber===116);
  assert.ok(scene,'exact current evidence116 should be mechanically inherited from the parent dependency');
  assert.equal(scene.resultPointer,'/stateRef');
  assert.equal(scene.status,'read');
  assert.equal(scene.value.stateHash,'dca5b88ea70b2c3f72f3bbb961c9938e789ba0052e62f4b9fc904a105755ba9e');
  assert.ok(scene.value.contextRef.startsWith('candidate:'));
  assert.ok(request.promptNodes.find(n=>n.kind==='citation_access').directlyReadEvidenceNumbers.includes(116));
  assert.ok(!inherited.bindings.some(row=>row.evidenceNumber===118),'unselected setup source must not replace the selected assault scene');
  return paid;
}}});
const result=await execute({...assignment,evidenceDirectory:(await reader.inspect()).evidence},{operationState:{version:1,turn:0,reads:[],calls:[],consecutiveCorrections:0},
  checkpointOperation:async value=>{checkpoint=structuredClone(value);},readEvidence:async(evidenceId,pointer)=>{
    const value=await reader.dispatch({type:'read_evidence',consumer:'proof',evidenceId,pointer});reads.push(value);return value;}});
assert.equal(calls,1);assert.equal(result.value.failedWorkOrders.length,0);
assert.equal(result.value.workOrders[0].steps[0].bindings[0].fromEvidenceNumber,116);
assert.ok(reads.some(row=>row.evidenceId===state.evidence[115].id&&row.value?.schema==='roster_workflow_state_ref_v1'));
assert.deepEqual((await get(checkpoint.calls[0].replyRef)).output,paid.output,'saved model reply remains unchanged');
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),original);
console.log(JSON.stringify({pass:true,fixtureNumber,repairDependencyDelivered:true,selectedSceneNotSetup:true,exactReadRecorded:true,providerCalls:0,productionWrites:0}));
