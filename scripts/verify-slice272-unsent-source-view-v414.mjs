import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterTeachModelCallV1} from '../packages/roster-strategist/roster-teach-call-checkpoint-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const state=structuredClone(d.teachFramework.state),pending=state.pendingModelCall;
assert.equal(pending.kind,'teach_framework_citation_patch');
assert(!(d.providerDispatches||[]).some(row=>row.contextHash===pending.request.contextHash),'Actual202 is not sent');
const request={...structuredClone(pending.request),contextHash:'current-typed-source-view',
  promptNodes:[...pending.request.promptNodes,{kind:'test_only_current_source_fact_directory'}]};
const args={state,request,sourceHash:pending.sourceHash,planHash:pending.planHash,
  retainedPublicOutputs:d.publicOutputs||[],retainedDispatches:d.providerDispatches||[]};
const result=prepareRosterTeachModelCallV1(args);
assert.equal(result.request.contextHash,request.contextHash,'Actual unsent202 must use the repaired source directory, not buy a correction against an obsolete view');
assert.equal(state.supersededUnsentModelCalls.length,1);
const paidState=structuredClone(d.teachFramework.state);
const protectedResult=prepareRosterTeachModelCallV1({...args,state:paidState,
  retainedDispatches:[...args.retainedDispatches,{contextHash:pending.request.contextHash,status:'sending'}]});
assert.equal(protectedResult.request.contextHash,pending.request.contextHash,'Any dispatched/uncertain call retains its exact original request');
console.log(JSON.stringify({passed:true,actualUnsentBoundary:202,unsentRefresh:true,dispatchedUnchanged:true,providerCalls:0}));
