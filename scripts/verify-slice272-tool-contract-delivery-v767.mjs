// Reproduce the paid local-method request carrying every execution schema.
// Capture the real role request; no Provider, Native or production writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=process.argv[2];
assert(root);
const read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const original=await fs.readFile(`${root}/workflow.json`,'utf8');
const state=JSON.parse(original);
const paid=await read('e468205efa5670cac8cf20f0baed6ca956a5b1f7a89976bcb57c34721170b908');
const delivered=paid.promptNodes.find(node=>node.kind==='workflow_role_assignment');
const descriptor=delivered.inputs.tools.value;
const work=state.work.find(row=>row.id===delivered.workId);
assert(work);
const scheduled=await read(work.inputRef);
const entry={id:`tool-contract:${hash(descriptor)}`,title:'Executable tool contracts',
  kind:'capability_result',bindings:{},conditions:['Interface only, not an observed game result'],
  artifactRef:hash(descriptor),validity:'current',availability:'available'};
state.evidence.push(entry);
const memory=new Map([[entry.artifactRef,descriptor]]);
let sequence=0,request;
const store={load:async()=>state,get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(ref),
  put:async value=>{const ref='capture-v767-'+(++sequence);memory.set(ref,structuredClone(value));return ref;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v767-capture',deliberation:{},
  onRequest:async value=>{request=value;throw Error('CAPTURE_ONLY');}});
await assert.rejects(execute({...scheduled,inputs:structuredClone(delivered.inputs),
  evidenceDirectory:[...scheduled.evidenceDirectory,entry]},{
  operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
  checkpointOperation:async()=>{}}),/CAPTURE_ONLY/);
const inputs=request.promptNodes.find(node=>node.kind==='workflow_role_assignment').inputs;
const view=inputs.tools.value;
const before=JSON.stringify(descriptor).length,after=JSON.stringify(view).length;
assert(after<before*.6,'local role still receives all unrelated execution-contract bodies');
assert.equal(view.schema,'roster_workflow_tool_directory_v1');
assert.deepEqual(view.operations.map(row=>row.operation),descriptor.operations.map(row=>row.operation));
assert.deepEqual(view.experimentScopeContract,descriptor.experimentScopeContract);
assert.equal(inputs.toolContractSource.status,'available_unread','a directory is not a source read');
assert.equal(inputs.toolContractSource.evidenceId,entry.id);
const at=pointer=>pointer.split('/').slice(1).reduce((v,key)=>v[key.replaceAll('~1','/').replaceAll('~0','~')],descriptor);
for(const [index,row]of view.operations.entries()){
  assert.equal(row.contract.evidenceNumber,scheduled.evidenceDirectory.length+1);
  assert.deepEqual(at(row.contract.pointer),descriptor.operations[index]);
  for(const query of row.queries??[])assert.deepEqual(at(query.contract.pointer),
    descriptor.operations[index].queryContracts[query.queryKind]);
}
for(const section of view.sections)assert.deepEqual(at(section.contract.pointer),descriptor[section.name]);
assert.deepEqual(inputs.task,delivered.inputs.task,'the assigned local purpose must not change');
assert.deepEqual(inputs.comparisonPurpose,delivered.inputs.comparisonPurpose,'comparison scope must remain');
assert(request.promptNodes.some(node=>node.kind==='assigned_evidence_references'
  &&JSON.stringify(node).includes(entry.id)),'existing reader must expose the exact source');
assert.equal(await fs.readFile(`${root}/workflow.json`,'utf8'),original);
console.log(JSON.stringify({passed:true,descriptorCharacters:{before,after},
  allOperationsDiscoverable:true,allContractsAddressable:true,sourceNotMarkedRead:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,strategyEquivalenceProven:false}));
