// Actual completed209 was left pending after paid208 became valid on recheck.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterTeachModelCallV1} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const original=draft.teachFramework.state;
const pending=original.pendingModelCall;
const output=draft.publicOutputs.find(o=>o.contextHash===pending.request.contextHash);
assert(output,'Actual209 retained output exists');
const dispatch=draft.providerDispatches.find(d=>d.contextHash===pending.request.contextHash);
assert.equal(dispatch.status,'completed');
const unchanged=hash({output,dispatch});
const state={pendingModelCall:structuredClone(pending),replyCorrections:structuredClone(original.replyCorrections),
  calls:structuredClone(original.calls)};
const request={...pending.request,roundKind:'teach_framework_investigate',contextHash:'next-read-only-investigation',promptNodes:[]};
const args={state,request,sourceHash:pending.sourceHash,planHash:pending.planHash,
  retainedPublicOutputs:draft.publicOutputs,retainedDispatches:draft.providerDispatches};
const next=prepareRosterTeachModelCallV1(args);
assert.equal(next.request.roundKind,'teach_framework_investigate');
assert.equal(state.retiredCorrectionRequests.at(-1).settlement,'completed_paid_correction_superseded');
assert.equal(state.retiredCorrectionRequests.at(-1).completedOutputHash,output.outputHash);
assert.equal(hash({output,dispatch}),unchanged);
const ambiguous={...args,state:{pendingModelCall:structuredClone(pending),replyCorrections:structuredClone(original.replyCorrections)},
  retainedPublicOutputs:[],retainedDispatches:[{...dispatch,status:'sent'}]};
assert.throws(()=>prepareRosterTeachModelCallV1(ambiguous),/DISPATCH_RECONCILIATION_REQUIRED/);
const unbound={...args,state:{pendingModelCall:structuredClone(pending),replyCorrections:structuredClone(original.replyCorrections)},
  retainedDispatches:[{...dispatch,outputHash:'incorrect'}]};
assert.throws(()=>prepareRosterTeachModelCallV1(unbound),/DISPATCH_RECONCILIATION_REQUIRED/);
console.log(JSON.stringify({passed:true,completedCorrectionRetired:true,originalOutputAndFeesPreserved:true,
  ambiguousStillRefused:true,unboundOutputRefused:true,providerCalls:0}));
