import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {prepareRosterTeachModelCallV1} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const saved=draft.teachFramework.state;
const pending=saved.pendingModelCall;
const next={...structuredClone(pending.request),roundKind:'teach_framework_investigate',contextHash:'next-proof-step',promptNodes:[]};
const invoke=state=>prepareRosterTeachModelCallV1({state,request:next,sourceHash:pending.sourceHash,planHash:pending.planHash,
  retainedPublicOutputs:[],retainedDispatches:draft.providerDispatches});
const state=structuredClone(saved);
const result=invoke(state);
assert.equal(result.request.roundKind,'teach_framework_investigate');
assert.equal(state.retiredCorrectionRequests.at(-1).contextHash,pending.request.contextHash);
assert.equal(state.retiredCorrectionRequests.at(-1).newProviderCalls,0);
const unresolved=structuredClone(saved);
unresolved.replyCorrections.forEach(row=>{if(row.status==='resolved_by_current_validator')row.status='pending';});
assert.throws(()=>invoke(unresolved),/PENDING_CALL_SOURCE_CHANGED/);
const uncertain=structuredClone(saved);
assert.throws(()=>prepareRosterTeachModelCallV1({state:uncertain,request:next,sourceHash:pending.sourceHash,planHash:pending.planHash,
  retainedDispatches:[...draft.providerDispatches,{contextHash:pending.request.contextHash,status:'sent'}]}),/DISPATCH_RECONCILIATION_REQUIRED/);
assert.deepEqual(uncertain.pendingModelCall,pending);
console.log(JSON.stringify({passed:true,paid190Retained:true,unsent191Retired:true,uncertainDispatchPreserved:true,providerCalls:0}));
