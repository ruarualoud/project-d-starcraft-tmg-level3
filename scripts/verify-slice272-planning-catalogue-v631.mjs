// Actual1191 ordinary requestDecision still injected the full current+historical
// catalogue (~1M chars), unlike investigation-frontier decisions. Teach too.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const bytes=await fs.readFile(path.join(run,'1191.request.json'),'utf8'),saved=JSON.parse(bytes),request=saved.request;
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),live=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const oldEntries=[...request.promptNodes.find(n=>n.kind==='available_evidence_directory').entries,
  ...request.promptNodes.find(n=>n.kind==='historical_evidence_directory').entries];
const publicByNumber=new Map(oldEntries.map(e=>[e.number,e])),maximum=Math.max(...publicByNumber.keys());
const directory=live.evidence.slice(0,maximum).map((e,i)=>({...e,...publicByNumber.get(i+1),number:i+1}));
let state={schema:live.schema,scope:assignment.scope,evidence:directory,work:[],reads:[],events:[],acceptanceGranted:false};const memory=new Map();
const store={load:async()=>state,save:async v=>{state=structuredClone(v);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const marker=Error('CAPTURE_SCOPED_REQUEST');let captured;
const capture=async(role,operationState)=>{
  const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v631',
    deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async value=>{captured=value;throw marker;}});
  await assert.rejects(()=>executor({...assignment,role,evidenceDirectory:directory},
    {operationState,checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
  return captured;
};
const next=await capture('roster_workflow_strategy_decision');
assert(next.responseFormat.schema.properties.catalogueQueries,'BUG: ordinary product decisions have no on-demand catalogue and get the entire directory');
assert(next.responseFormat.schema.properties.action.enum.includes('catalogue'));
const directorySize=value=>value.promptNodes.filter(n=>['available_evidence_directory','historical_evidence_directory'].includes(n.kind))
  .reduce((n,item)=>n+JSON.stringify(item).length,0);
const beforeDirectory=directorySize(request),afterDirectory=directorySize(next);
assert(afterDirectory<beforeDirectory*0.15,'full history metadata must not remain in ordinary planning');
assert.deepEqual(next.promptNodes[0].inputs,assignment.inputs,'actual question/whole-draft/source bodies cannot be discarded to shrink the prompt');
assert(next.promptNodes.some(n=>n.kind==='evidence_catalogue_search'));
const teach=await capture('roster_workflow_local_teach');assert(teach.responseFormat.schema.properties.catalogueQueries);
assert(directorySize(teach)<beforeDirectory*0.15);assert.deepEqual(teach.promptNodes[0].inputs,assignment.inputs);
const catalogueRef=await store.put({output:{action:'catalogue'}});
const preparationRequestRef=await store.put(next);
const prepared={version:1,turn:3,reads:[],calls:Array.from({length:3},()=>({requestRef:preparationRequestRef,replyRef:catalogueRef})),correction:null,consecutiveCorrections:0};
for(const role of ['roster_workflow_strategy_decision','roster_workflow_local_teach']){
  const synth=await capture(role,prepared);assert.deepEqual(synth.responseFormat.schema.properties.action.enum,['finish']);
  assert(synth.promptNodes.some(n=>['decision_evidence_window','teach_evidence_window'].includes(n.kind)&&n.usedReadBatches===3&&n.phase==='synthesize'));
}
// Exact old saved transport contract must not receive the newly added field.
const oldRef=await store.put(request),pending={version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0,
  pending:{requestRef:oldRef,contextHash:request.contextHash},retryProviderDispatch:{contextHash:request.contextHash}};
let retryCount=0,retried;const oldPaid=JSON.parse(await fs.readFile(path.join(run,'1191.reply.json'),'utf8'));
const reader=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('UNEXPECTED_EXECUTION');}});
const retry=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v631',deliberation:{
  deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');},retry:async value=>{retryCount++;retried=value;return oldPaid;}}});
const result=await retry({...assignment,evidenceDirectory:directory},{operationState:pending,checkpointOperation:async()=>{},
  readEvidence:(evidenceId,pointer)=>reader.dispatch({type:'read_evidence',consumer:'isolated-old-transport',evidenceId,pointer})});
assert.equal(retryCount,1);assert.deepEqual(retried,request);
assert(!result.value.errors?.some(e=>e.code==='schema'),'a frozen old response must not fail because of new catalogue syntax');
assert.equal(await fs.readFile(path.join(run,'1191.request.json'),'utf8'),bytes);
const encoded=encodeRosterProviderInputV1(next,'same_request_evidence_v1');
console.log(JSON.stringify({passed:true,ordinaryDecisionAndTeachScoped:true,oldDirectoryCharacters:beforeDirectory,
  newDirectoryCharacters:afterDirectory,newEncodedCharacters:encoded.afterCharacters,actualAssignedBodiesPreserved:true,
  exactOldTransportContractRetained:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0,
  actualStrategyEquivalenceNotYetProven:true}));
