// Actual858–862 counted section indices incorrectly and read metadata instead
// of the two already-saved payloads. Check the real reader with old raw views.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/projection-owner');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),snapshot=JSON.stringify(original);
let saved=structuredClone(original);const memory=new Map();
const get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(saved),save:async value=>{saved=structuredClone(value);},get,
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('EXECUTION_FORBIDDEN');}});
const consumer='v613-address-only-proof';const read=(number,pointer)=>workflow.dispatch({type:'read_evidence',consumer,
  evidenceId:original.evidence[number-1].id,pointer});
const view=await get(original.evidence[1515-1].artifactRef);assert.equal(view.sections[13].pointer,'/receipt/baseStateHash');
assert.equal(view.sections[18].pointer,'/receipt/queryReceipt');
const whole=await read(1515,'');
assert(whole.value.receiptReadNavigation,'old immutable view must expose stable semantic read handles, not require counting array indices');
const handle=whole.value.receiptReadNavigation.handles.find(h=>h.sectionPointer==='/receipt/queryReceipt');
assert.deepEqual(handle.read,{evidenceNumber:1515,pointer:'/receipt/queryReceipt'});
assert.equal(handle.sectionIndex,18);assert.equal(handle.valueType,'object');
const wrong=await read(1515,'/sections/13/value');
assert.equal(wrong.status,'read');assert.equal(wrong.value,view.sections[13].value,'never silently substitute another section');
assert.equal(wrong.resolvedPointer,'/receipt/baseStateHash');
assert.equal(wrong.receiptReadNavigation.selectedSectionPointer,'/receipt/baseStateHash');
assert.equal(wrong.receiptReadNavigation.selectedValueType,'string');
assert(wrong.receiptReadNavigation.handles.some(h=>h.read.pointer==='/receipt/queryReceipt'));
assert(!(await workflow.inspect()).work.some(w=>w.role==='roster_workflow_tool'&&w.id===consumer));
const afterWrong=await workflow.inspect();assert(!afterWrong.events.some(e=>e.type==='evidence_read'&&e.consumer===consumer&&e.pointer==='/receipt/queryReceipt'),
  'address metadata is not a read of the offered payload');
const actual=await read(handle.read.evidenceNumber,handle.read.pointer);
assert.equal(actual.status,'read');assert(Array.isArray(actual.value.result.markerResults));
const source=await get(original.evidence.find(e=>e.id===view.evidenceId).artifactRef);
assert.deepEqual(actual.value,source.receipt.queryReceipt,'the stable handle must return the complete exact Native section');
const geometryView=await read(1513,'');const geometryHandle=geometryView.value.receiptReadNavigation.handles
  .find(h=>h.sectionPointer==='/receipt/hypotheticalPlacementAssessment');
assert.equal(geometryHandle.sectionIndex,24);const geometry=await read(1513,geometryHandle.read.pointer);
assert.equal(geometry.status,'read');assert.equal(geometry.value.units.length,9);
assert.equal(JSON.stringify(original),snapshot);assert.deepEqual(await get(original.evidence[1515-1].artifactRef),view);
console.log(JSON.stringify({status:'passed',actualWrongIndexExplained:true,stableReadHandles:true,
  allNativeMarkerResultsDelivered:actual.value.result.markerResults.length,geometryUnitsDelivered:geometry.value.units.length,
  noSemanticReadSubstitution:true,oldArtifactsUnchanged:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
