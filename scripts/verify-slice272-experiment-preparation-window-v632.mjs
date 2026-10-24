// Concrete P2 regression: actual1229/1232/1235 completed three source-read
// rounds, but the next experiment-planner request still allowed unlimited reads.
// Capture the real product request seam only: no Provider, Native or disk writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const originalBytes=await fs.readFile(path.join(run,'1235.request.json'),'utf8');
const original=JSON.parse(originalBytes).request;
const assignment=original.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const live=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=live.work.find(w=>w.id===assignment.workId);
assert(work,'actual experiment work must remain available');
const directory=live.evidence.map((e,i)=>({...e,number:i+1}));
const memory=new Map();
const store={load:async()=>structuredClone(live),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const calls=work.operationState.calls.slice(0,3);
assert.equal(calls.length,3);
const requested=new Set();
for(const call of calls){const reply=await store.get(call.replyRef);
  assert.equal(reply.output.action,'read','freeze exactly the three actual source reads, not later work');
  for(const row of reply.output.reads)requested.add(directory[row.evidenceNumber-1].id+'\n'+row.pointer);
}
const prepared={version:1,turn:3,reads:work.operationState.reads.filter(row=>requested.has(row.evidenceId+'\n'+row.pointer)),
  calls,correction:null,consecutiveCorrections:0,pending:null};
const marker=Error('CAPTURE_ONLY');let captured;
async function capture(operationState,inputs=assignment.inputs){
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v632',
    deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},
    onRequest:async request=>{captured=request;throw marker;}});
  await assert.rejects(()=>executor({...assignment,inputs,evidenceDirectory:directory},
    {operationState,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_TOOL');}}),e=>e===marker);
  return captured;
}
const next=await capture(prepared);
assert.deepEqual(next.responseFormat.schema.properties.action.enum,['finish','conclude'],
  'BUG: after three actual preparation reads, experiment planner still admits another read/catalogue rather than a scoped workOrder or control return');
const window=next.promptNodes.find(n=>n.kind==='experiment_evidence_window');
assert.equal(window.usedReadBatches,3);assert.equal(window.phase,'synthesize');
assert.deepEqual(next.promptNodes[0].inputs,assignment.inputs,'original obligations and necessary questions survive');
assert.equal(next.responseFormat.schema.properties.conclusion.anyOf[0].properties.status.enum.includes('blocked'),true);
assert(next.userMessage.includes('strategy_required'));
assert(next.userMessage.includes('workOrder'));
assert(!next.userMessage.includes('use action=catalogue'),'synthesis must not invite a forbidden preparation action');
const earlier=await capture({...prepared,calls:calls.slice(0,2),turn:2});
assert(earlier.responseFormat.schema.properties.action.enum.includes('read'),'ordinary necessary preparation is still available');
const configured=await capture(prepared,{...assignment.inputs,decisionEvidenceBudget:{source:'literal',value:{maximumReadBatches:5}}});
assert(configured.responseFormat.schema.properties.action.enum.includes('read'),'configurable cadence is not a global task cap');
const fresh=await capture({version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0});
assert(fresh.responseFormat.schema.properties.action.enum.includes('read'),'a following authorized method may read new details');
const requestRef=await store.put(original);
const retry=await capture({...prepared,pending:{requestRef,contextHash:original.contextHash},retryProviderDispatch:{contextHash:original.contextHash}});
assert.deepEqual(retry,original,'old pending transport is immutable despite the new preparation cadence');
assert.equal(await fs.readFile(path.join(run,'1235.request.json'),'utf8'),originalBytes);
console.log(JSON.stringify({passed:true,actualReadCalls:[1229,1232,1235],experimentPreparationReturnsToChoice:true,
  necessaryQuestionsPreserved:true,normalAndConfiguredPreparationPreserved:true,exactPendingTransportPreserved:true,
  newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
