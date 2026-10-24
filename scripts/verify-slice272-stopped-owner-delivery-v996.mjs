// Actual closed return: an explicit, source-proven role delivery repair must
// preserve the stop and original paid decisions, not ordinarily retry them.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {projectRosterIncomingAuthorContextV1} from '../packages/roster-strategist/roster-workflow-strategy-owner-context-v1.mjs';
import * as progress from '../packages/roster-strategist/roster-workflow-control-progress-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map();
let state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),calls=0;
const owner=state.work.find(w=>w.id.endsWith(':frontier-return:2b83f4b15da270fc'));
const stopped=state.work.find(w=>w.investigationOwnerId===owner.id&&w.role==='roster_workflow_strategy_decision');
assert.equal(stopped.status,'ready');
const prior=state.work.find(w=>w.id===owner.inputs.scopedStrategyReturn.value.strategyResponseId);
const originals={owner:copy(owner),prior:copy(prior),draftRef:state.draftRef};
const store={load:async()=>copy(state),save:async value=>{state=value;},
  get:async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')),
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
let delivered;
const workflow=await createRosterDecisionWorkflowV1({store,execute:async assignment=>{
  calls++;delivered=projectRosterIncomingAuthorContextV1(assignment);
  throw Object.assign(Error('END_AT_REPAIRED_ROLE_INPUT'),{dispatchOutcome:'not_dispatched'});
}});
const command={type:'handoff_repeated_inspection',workId:stopped.id,expectedOwnerResultRef:owner.resultRef,
  engineeringChangeId:'v995-no-progress-owner-delivery',reason:'Actual saved author request omitted the now-supported typed owner projection.'};
const returned=await workflow.dispatch(command);
console.log(JSON.stringify({stage:'explicit_delivery_repair',scheduled:!!returned.decisionId,providerCalls:0,nativeCalls:0,productionWrites:0}));
assert.equal(returned.planApproved,false);assert.equal(calls,0);
let after=await workflow.inspect();
const next=after.work.find(w=>w.id===returned.decisionId);
assert(next);assert.equal(next.status,'ready');
assert.equal(next.id,stopped.id);
const saved=await store.get(returned.reportRef);
assert.equal(saved.proof.stop.reason,'closed_method_returns_to_same_owner');
assert.equal(next.ownerDeliveryRepairRef,returned.reportRef);
assert.deepEqual(saved.originalInputs,stopped.inputs);
assert.deepEqual(after.work.find(w=>w.id===owner.id),originals.owner);
assert.deepEqual(after.work.find(w=>w.id===prior.id),originals.prior);
assert.equal(after.draftRef,originals.draftRef);
assert.equal(next.inputs.ownerDeliveryRepair.value.sourceResultRef,prior.resultRef);
const again=await workflow.dispatch(command);assert.equal(again.alreadyHeld,true);
assert.equal((await workflow.inspect()).work.filter(w=>w.id===next.id).length,1);
// A real delivery defect is required, not merely an operator's change label.
const check=progress.projectRosterStoppedOwnerDeliveryRepairV1;
assert.equal(typeof check,'function');
let pristine=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8'));
const args={state:pristine,work:pristine.work.find(w=>w.id===stopped.id),readArtifact:store.get};
assert(await check(args));
const fixedRequestRead=async ref=>{const value=await store.get(ref);
  if(value.promptNodes?.some(n=>n.kind==='workflow_role_assignment'&&n.workId===prior.id))
    value.promptNodes.push({kind:'strategy_owner_assignment',version:4});return value;};
assert.equal(await check({...args,readArtifact:fixedRequestRead}),null);
const busy=copy(pristine);busy.work.find(w=>w.id===stopped.id).operationState={pending:{requestRef:'in-flight'}};
assert.equal(await check({...args,state:busy,work:busy.work.find(w=>w.id===stopped.id)}),null);
await workflow.dispatch({type:'run_ready',workIds:[next.id],concurrency:1});
assert.equal(calls,1);assert(delivered);assert.equal(delivered.node.returnKind,'fact_owner_strategy_required');
assert.deepEqual(delivered.node.noProgressControl,saved.proof.noProgressControl);
assert(delivered.inputs.ownerDeliveryRepair);assert(delivered.history.originalTask);
console.log(JSON.stringify({passed:true,explicitRepairOnce:true,originalPaidRecordsPreserved:true,
  repairedOwnerInputDelivered:true,injectedRoleCalls:calls,providerCalls:0,nativeCalls:0,productionWrites:0}));
