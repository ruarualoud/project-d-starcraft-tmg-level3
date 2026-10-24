// Actual87/88: explicit successor binding collided with a copied parent hash.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=original.work.find(w=>w.failure?.code==='ROSTER_WORKFLOW_TOOL_BINDING_CONFLICT');
assert.ok(work,'actual binding failure retained');
const memory=new Map();let calls=0,seen;
const store={get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref='test-'+memory.size;memory.set(ref,structuredClone(value));return ref;}};
const assignment=await store.get(work.inputRef),unchanged=structuredClone(assignment);
const executor=createRosterWorkflowLaboratoryExecutorV1({store,laboratory:{labDescriptor:()=>({sourceStateHash:original.scope.source}),
  describeQueryContext:async args=>{calls++;seen=args;return {branchStateHash:args.base.branchStateHash};}}});
const control={checkpointOperation:async()=>{}};
const result=await executor.execute(assignment,control);
assert.equal(seen.base.branchStateHash,assignment.inputs.binding0.value,'explicit producer result owns dynamic input');
assert.equal(seen.seatKey,assignment.inputs.request.value.args.seatKey,'unbound model choice preserved');
assert.deepEqual(assignment,unchanged,'paid input stays immutable');
assert.equal(result.value.inputBindings[0].priorValue,assignment.inputs.request.value.args.base.branchStateHash);
assert.equal(result.value.inputBindings[0].sourceResultRef,assignment.inputs.binding0.resultRef);
assert.equal(result.value.inputBindings[0].value,assignment.inputs.binding0.value);
const guarded=structuredClone(assignment);
guarded.inputs.request.value.guards=[{name:'guard0',expected:'different'}];guarded.inputs.guard0={value:'actual'};
assert.equal((await executor.execute(guarded,control)).value.reason,'guard_mismatch');
assert.equal(calls,1,'guard still prevents invocation');
let state=structuredClone(original);
state.work.push({...structuredClone(work),id:'unknown-dispatch-must-remain',failure:{...work.failure,dispatchOutcome:'unknown'}});
const flow=await createRosterDecisionWorkflowV1({store:{...store,load:async()=>state,save:async s=>{state=structuredClone(s);}},execute:async()=>{throw Error('no dispatch');}});
await flow.dispatch({type:'reconcile_unissued_bound_inputs'});
const resumed=(await flow.inspect()).work.find(w=>w.id===work.id);
assert.equal(resumed.status,'ready');assert.deepEqual(resumed.inputs,work.inputs);
assert.equal(resumed.failureHistory.at(-1).failure.code,work.failure.code);
assert.equal(state.work.find(w=>w.id==='unknown-dispatch-must-remain').status,'needs_repair');
assert.deepEqual(JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original);
console.log(JSON.stringify({pass:true,actualBindingResumed:true,immutableInput:true,explicitGuardRetained:true,providerCalls:0,productionWrites:0}));
