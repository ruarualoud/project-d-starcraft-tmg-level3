// Actual Teach r3: map189 was read, then repeat compression kept only the
// marker COUNT. It consequently called already-read coordinates unverified.
// Capture the real role input plus the old registered-index consumer.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowReadContextV1} from '../packages/roster-strategist/roster-workflow-read-context-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const job=state.work.find(w=>w.id==='product:teach:r3:subject-v1');assert(job);
const requestRef='6a4b8771a4376331e7f94ab458f5bf2061b40fbe12a27ea28c87b821bf141c5b';
const requestBytes=await fs.readFile(path.join(base,'artifacts',requestRef+'.json')),oldRequest=JSON.parse(requestBytes);
const oldProjection=oldRequest.promptNodes.find(n=>n.kind==='previously_delivered_source_facts').sources.find(s=>s.evidenceNumber===189).projection;
assert(!oldProjection.receiptStructures);
const entry=state.evidence[188],originalBytes=await fs.readFile(path.join(base,'artifacts',entry.artifactRef+'.json')),original=JSON.parse(originalBytes);
assert.equal(original.receipt.missionMarkers.length,5);assert(original.receipt.terrain.length>1000);
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const assignment=oldRequest.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const marker=Error('CAPTURE_ONLY');let captured;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v658',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}},onRequest:async r=>{captured=r;throw marker;}});
await assert.rejects(()=>execute({...assignment,evidenceDirectory:state.evidence},
  {operationState:{...structuredClone(job.operationState),pending:null},checkpointOperation:async()=>{},
    readEvidence:async()=>{throw Error('UNEXPECTED_NEW_READ');}}),e=>e===marker);
const current=captured.promptNodes.find(n=>n.kind==='previously_delivered_source_facts').sources.find(s=>s.evidenceNumber===189).projection;
assert.deepEqual(current.receiptStructures?.missionMarkers,original.receipt.missionMarkers,'repeat input must retain already-read exact coordinates, not only their count');
assert.deepEqual(current.receiptStructures.battlefield,original.receipt.battlefield);
assert.deepEqual(current.receiptStructures.baseProfileIds,original.receipt.baseProfileIds);
assert(!Object.hasOwn(current.receiptStructures,'terrain'),'large terrain stays indexed, not copied into every request');
assert(current.sectionDirectory.some(s=>s.pointer==='/receipt/terrain'&&s.length===original.receipt.terrain.length));
const alias=await projectRosterWorkflowReadContextV1({collected:[],operation:{calls:[]},
  directory:state.evidence.map((e,i)=>({number:i+1,...e})),store,
  assignmentInputs:{actualOldMapIndex:{source:'literal',value:oldProjection}}});
const supplement=alias.nativeMeasurements?.find(s=>s.sourceEvidenceId===entry.id);assert(supplement);
assert.deepEqual(supplement.projection.receiptStructures.missionMarkers,original.receipt.missionMarkers);
assert.equal(supplement.originalViewUnchanged,true);assert.equal(supplement.acceptanceGranted,false);
assert((await fs.readFile(path.join(base,'artifacts',requestRef+'.json'))).equals(requestBytes));
assert((await fs.readFile(path.join(base,'artifacts',entry.artifactRef+'.json'))).equals(originalBytes));
console.log(JSON.stringify({status:'passed',actualInputCaptured:true,markerCoordinatesRetained:5,
  oldRegisteredIndexConsumerUpgraded:true,largeTerrainRemainsIndexed:true,
  oldRequestAndSourceUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0,realModelEffectStillPending:true}));
