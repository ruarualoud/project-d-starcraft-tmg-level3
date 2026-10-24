// Actual26 requested evidence reads with finish. The existing read-handoff was
// masked by an empty-work-order check; actual28 used the output-field tag alias.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const originalState=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(originalState);
const memory=new Map(),get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(state),save:async()=>{},get,put:async value=>{const key='proof-'+memory.size;memory.set(key,structuredClone(value));return key;}};
const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('read only');}});
const directory=(await reader.inspect()).evidence;
for(const number of [26,28]){
  const original=JSON.parse(await fs.readFile(path.join(run,number+'.reply.json'),'utf8'));
  const request=JSON.parse(await fs.readFile(path.join(run,number+'.request.json'),'utf8')).request;
  const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  let checkpoint;const reads=[];
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'actual-read-proof',deliberation:{deliberate:async()=>original}});
  const result=await execute({...assignment,evidenceDirectory:directory},{operationState:{version:1,turn:0,reads:[],calls:[],consecutiveCorrections:0},
    checkpointOperation:async value=>{checkpoint=structuredClone(value);},readEvidence:async(evidenceId,pointer)=>{
      const value=await reader.dispatch({type:'read_evidence',consumer:'proof',evidenceId,pointer});reads.push(value);return value;}});
  if(number===26){
    assert.equal(result.value.status,'evidence_reads_pending_recheck','requested reads are not an empty final experiment');
    assert.equal(result.value.readCount,4);assert.equal(checkpoint.consecutiveCorrections,0);
    assert.equal(reads[2].status,'read');assert.equal(reads[2].value.schema,'roster_workflow_state_ref_v1');
  }else{
    assert.equal(result.value.workOrders.length,1,'workOrders tag is a transport alias, not a new strategy');
    assert.equal(result.value.failedWorkOrders.length,0);
    assert.ok(result.value.outputProjection.some(p=>p.rule==='role_output_field_discriminator_alias_v1'));
  }
  assert.deepEqual((await get(checkpoint.calls[0].replyRef)).output,original.output,'paid reply unchanged');
}
assert.equal(await fs.readFile(path.join(base,'workflow.json'),'utf8'),originalState);
console.log(JSON.stringify({pass:true,explicitReadsFetchedWithoutEmptyProposalLoop:true,stateReferenceReadAlias:true,fieldTagAliasPreservesWorkOrder:true,providerCalls:0,productionWrites:0}));
