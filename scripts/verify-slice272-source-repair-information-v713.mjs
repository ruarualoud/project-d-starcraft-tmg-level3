// Replay the actual v712 paid answer (no new Provider call). It claims answered
// using only the same Native receipts that the reviewer found insufficient.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const base=path.resolve(process.argv[2],'workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const work=state.work.find(w=>w.controlledSourceRevision?.engineeringChangeId==='source-review-fact-routing-v712');assert.ok(work);
const assignment=await get(work.inputRef),last=work.operationState.calls.at(-1),paid=await get(last.replyRef);
assert.equal(paid.output.action,'conclude');assert.equal(paid.output.conclusion.status,'answered');assert.equal(paid.output.workOrders.length,0);
const memory=new Map();let next=0,localReplays=0;
const store={load:async()=>state,get:async ref=>memory.has(ref)?memory.get(ref):get(ref),
  put:async value=>{const ref='information-replay-'+(++next);memory.set(ref,structuredClone(value));return ref;}};
const operation=structuredClone(work.operationState);operation.calls=operation.calls.slice(0,-1);operation.turn--;
operation.pending=null;operation.correction=null;operation.consecutiveCorrections=0;
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'saved-information-replay',
  deliberation:{deliberate:async()=>{localReplays++;return structuredClone(paid);}}});
const result=await executor(assignment,{operationState:operation,checkpointOperation:async()=>{},
  readEvidence:async()=>{throw Error('UNEXPECTED_NEW_READ');}});
assert.equal(result.value.status,'needs_local_correction','the actual unchanged-evidence answer must not be accepted as a completed fact repair');
assert.ok(result.value.errors.some(e=>e.code==='necessary_fact_has_no_new_material_evidence'));
assert.equal(localReplays,1);assert.equal(work.operationState.calls.at(-1).replyRef,last.replyRef);
console.log(JSON.stringify({passed:true,actualPaidAnswerReplayed:true,unchangedEvidenceCannotCloseFact:true,
  originalAnswerUnchanged:true,localReplays,providerCalls:0,nativeCalls:0,productionWrites:0,strategyImprovementProven:false}));
