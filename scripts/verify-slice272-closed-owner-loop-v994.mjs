// Replay the actual queued owner edge produced by the paid v993 conclusion.
// Preserve its completed source; stop BEFORE executing the next decision role.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {rosterClosedMethodReturnsControlV1} from '../packages/roster-strategist/roster-workflow-control-progress-v1.mjs';
const dir=process.argv[2],copy=structuredClone,memory=new Map();
let state=JSON.parse(await fs.readFile(dir+'/workflow.json','utf8')),calls=0;
const owner=state.work.find(w=>w.id.endsWith(':frontier-return:2b83f4b15da270fc'));
const task=state.work.find(w=>w.investigationOwnerId===owner.id&&w.role==='roster_workflow_strategy_decision');
assert(task);assert.equal(task.status,'ready');const originalOwner=copy(owner);
const output=JSON.parse(await fs.readFile(dir+'/artifacts/a4eb8898755f6d303afaef784993b306881e6f45be2dca6bc6ac7a1f60ed3b06.json','utf8')).output;
assert.equal(rosterClosedMethodReturnsControlV1({inputs:owner.inputs,output}),true);
assert.equal(rosterClosedMethodReturnsControlV1({inputs:{},output}),false);
assert.equal(rosterClosedMethodReturnsControlV1({inputs:owner.inputs,output:{...output,conclusion:{...output.conclusion,status:'answered'}}}),false);
const store={load:async()=>copy(state),save:async value=>{state=copy(value);},
  get:async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(dir+'/artifacts/'+ref+'.json','utf8')),
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}};
const execute=async()=>{calls++;throw Error('UNEXPECTED_OWNER_DISPATCH');};
const workflow=await createRosterDecisionWorkflowV1({store,execute});
const result=await workflow.dispatch({type:'run_ready',workIds:[task.id],concurrency:1});
const current=(await workflow.inspect()).work.find(w=>w.id===task.id);
console.log(JSON.stringify({result,stop:current.operationState?.noProgressStop,
  realProviderCalls:0,injectedCalls:calls,nativeCalls:0,productionWrites:0}));
assert.equal(current.status,'needs_repair');
assert.equal(current.operationState?.noProgressStop?.reason,'closed_method_returns_to_same_owner');
assert.equal(current.operationState?.noProgressStop?.returnedResultRef,owner.resultRef);
assert.equal(current.operationState?.noProgressStop?.automaticRetry,false);
assert.deepEqual((await workflow.inspect()).work.find(w=>w.id===owner.id),originalOwner);assert.equal(calls,0);
// Cold recovery uses the same persisted stop, not a reset read/repair window.
const cold=await createRosterDecisionWorkflowV1({store,execute});
await assert.rejects(cold.dispatch({type:'run_ready',workIds:[task.id],concurrency:1}),/ROSTER_WORKFLOW_NO_PROGRESS_STOP/u);
assert.equal(calls,0);
console.log(JSON.stringify({passed:true,paidReplyPreserved:true,coldRetryBlocked:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
