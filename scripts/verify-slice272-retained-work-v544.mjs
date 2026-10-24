// Resume must restore compiled work, not recompile its failed input as new.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const failed=state.work.find(w=>w.resultRef==='84a2933912c828e9fada13c22c9233cf72aa80b4b6c4483294102997502c0b39');
const order=JSON.parse(await fs.readFile(path.join(run,'91.reply.json'),'utf8')).output.workOrders[0];
const namespace=failed.id.slice(0,-':solve-formation'.length);
const restored=compileRosterWorkflowExperimentV1({order,scope:failed.bindings,namespace,retainedWork:state.work});
assert.deepEqual(restored,[failed]);
assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:failed.bindings,namespace:'new-order',retainedWork:state.work}),
  e=>e.code==='ROSTER_WORKFLOW_SPATIAL_ARGUMENT_CONTRACT','new work still receives current input validation');
const changed=structuredClone(order);changed.steps[0].operation='inspect';
assert.throws(()=>compileRosterWorkflowExperimentV1({order:changed,scope:failed.bindings,namespace,retainedWork:state.work}),
  e=>e.code==='ROSTER_WORKFLOW_RETAINED_ORDER_MISMATCH');
assert.deepEqual(JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),state);
console.log(JSON.stringify({pass:true,retainedFailureNotRecompiled:true,newInputStillChecked:true,changedOrderRejected:true,providerCalls:0,productionWrites:0}));
