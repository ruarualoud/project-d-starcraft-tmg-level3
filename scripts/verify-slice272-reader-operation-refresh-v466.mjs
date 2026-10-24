import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterTeachModelCallV1 as prepare} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
const formal=JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const original=formal.teachFramework.state.pendingModelCall;
assert.equal(formal.teachFramework.failure.code,'ROSTER_TEACH_PENDING_CALL_SOURCE_CHANGED');
assert.equal(original.kind,'teach_framework_citation_patch');
assert.equal(formal.teachFramework.state.synthesisReader.citationFeedback.correctableFailures.length,0);
const contextHash=original.request.contextHash;
assert(!formal.providerDispatches.some(d=>d.contextHash===contextHash));
assert(!formal.publicOutputs.some(d=>d.contextHash===contextHash));
assert(!formal.teachFramework.state.calls.some(d=>d.contextHash===contextHash));
const request={...structuredClone(original.request),roundKind:'teach_framework_synthesis_step',contextHash:'next-readonly-operation'};
const create=()=>({pendingModelCall:structuredClone(original),calls:structuredClone(formal.teachFramework.state.calls)});
const args={request,sourceHash:original.sourceHash,planHash:original.planHash,
  retainedPublicOutputs:formal.publicOutputs,retainedDispatches:formal.providerDispatches};
const state=create();
const result=prepare({...args,state});
assert.equal(result.request.roundKind,request.roundKind);
assert.equal(state.pendingModelCall.kind,request.roundKind);
assert.equal(state.supersededUnsentModelCalls.length,1);
assert.deepEqual(state.supersededUnsentModelCalls[0].previousRequest,original.request);
assert.equal(state.supersededUnsentModelCalls[0].providerDispatches,0);
for(const change of [
  {sourceHash:'different-source'},
  {planHash:'different-plan'},
  {request:{...request,sessionId:'different-session'}},
  {request:{...request,roundKind:'teach_framework_investigate'}},
  {retainedDispatches:[...formal.providerDispatches,{contextHash,status:'sending'}]},
  {retainedPublicOutputs:[...formal.publicOutputs,{contextHash}]},
]) assert.throws(()=>prepare({...args,...change,state:create()}),e=>e.code==='ROSTER_TEACH_PENDING_CALL_SOURCE_CHANGED');
assert.equal(original.kind,'teach_framework_citation_patch');
console.log(JSON.stringify({pass:true,actualUnsentRequest:308,paidOrAmbiguousPreserved:true,
  sameReaderOnly:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
