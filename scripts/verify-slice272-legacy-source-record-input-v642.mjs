// Actual1399 was already queued with immutable v3 source views. Fixing only
// NEW projection production does not deliver official fields to that consumer.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const state=await read(path.join(base,'workflow.json')),requestPath=path.join(run,'1399.request.json');
const originalBytes=await fs.readFile(requestPath,'utf8'),original=JSON.parse(originalBytes).request;
const inputs=original.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const source=state.evidence.find(e=>e.kind==='official_source'&&e.id.startsWith('unit-source:army_units:medic:'));
assert(source);
const oldView=Object.values(inputs).find(i=>i.value?.schema==='roster_experiment_source_facts_v1'
  &&i.value.sourceEvidenceId===source.id);
assert(oldView&&!oldView.value.sourceRecord,'fixture must be the real incomplete legacy input');
const memory=new Map(),store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):read(path.join(base,'artifacts',ref+'.json')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
let captured;const marker=Error('CAPTURE_ONLY');
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v642',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},
  onRequest:async value=>{captured=value;throw marker;}});
await assert.rejects(()=>execute({workId:'isolated-v642-legacy-source',role:'roster_workflow_final_review',
  scope:state.scope,evidenceDirectory:state.evidence,inputs},
  {operationState:{version:1,turn:0,reads:[],calls:[],correction:null,consecutiveCorrections:0},
    checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
const supplemental=captured.promptNodes.find(n=>n.kind==='registered_source_record_supplements')?.sources
  ?.find(s=>s.sourceEvidenceId===source.id);
assert(supplemental,'BUG: real legacy official source is still delivered without its record body');
assert.deepEqual(supplemental.projection.sourceRecord,await store.get(source.artifactRef));
assert.equal(supplemental.projection.sourceKind,'official_source');
assert.deepEqual(captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs,inputs);
assert.equal(await fs.readFile(requestPath,'utf8'),originalBytes);
console.log(JSON.stringify({passed:true,actualRequest:1399,realRoleInputCaptured:true,
  sourceBodyDelivered:true,oldViewAndPaidRequestUnchanged:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,realModelConsumptionStillPending:true}));
