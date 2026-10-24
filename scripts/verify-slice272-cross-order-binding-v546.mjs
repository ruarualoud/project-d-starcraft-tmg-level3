// Actual99 tried to bind an already completed inspect-scene from a new order.
// The old contract allowed only same-order steps, pushing reconstruction.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const reply=JSON.parse(await fs.readFile(path.join(run,'99.reply.json'),'utf8'));
const id=original.work.find(w=>w.resultRef==='531d5ab2dd50f797edeef3e3a8015e268fbb41f99af3b6c8b4c641f3cdbded40').id;
const directory=original.evidence.map((e,i)=>({...e,number:i+1,validity:'current'}));
const evidenceNumber=directory.find(e=>e.id==='tool:'+id).number;
const order=structuredClone(reply.output.workOrders[0]);
order.steps[0].bindings[0].fromStepId='';order.steps[0].bindings[0].fromEvidenceNumber=evidenceNumber;
const jobs=compileRosterWorkflowExperimentV1({order,scope:original.scope,namespace:'cross-order-proof',evidenceDirectory:directory});
assert.equal(jobs.length,1,'reuse source without creating another inspect or scene');
assert.equal(jobs[0].inputs.binding0.source,'work');assert.equal(jobs[0].inputs.binding0.id,id);
const parent=structuredClone(original.work.find(w=>w.id===id));
// The saved parent has already executed. This isolated scheduler only reads it.
parent.inputs={};parent.bindings=original.scope;
let state={schema:original.schema,scope:original.scope,work:[parent],evidence:[],reads:[],events:[],acceptanceGranted:false};
const memory=new Map(),get=async ref=>memory.has(ref)?memory.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
let executions=0;
const flow=await createRosterDecisionWorkflowV1({store:{load:async()=>state,save:async s=>{state=structuredClone(s);},get,
  put:async value=>{const ref='memory-'+memory.size;memory.set(ref,structuredClone(value));return ref;}},
  execute:async assignment=>{executions++;assert.equal(assignment.workId,'cross-order-proof:query-combat');
    assert.equal(assignment.inputs.binding0.value,(await get(parent.resultRef)).value.receipt.baseStateHash);
    return {kind:'tool_receipt',value:{bound:true},conditions:['test only']};}});
await flow.dispatch({type:'enqueue',work:jobs});await flow.dispatch({type:'run_ready'});
assert.equal(executions,1,'completed parent not replayed');
const stale=directory.map(e=>e.number===evidenceNumber?{...e,validity:'historical'}:e);
assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:original.scope,namespace:'stale',evidenceDirectory:stale}),e=>e.code==='ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID');
const ambiguous=structuredClone(order);ambiguous.steps[0].bindings[0].fromStepId='also-a-step';
assert.throws(()=>compileRosterWorkflowExperimentV1({order:ambiguous,scope:original.scope,namespace:'ambiguous',evidenceDirectory:directory}),e=>e.code==='ROSTER_WORKFLOW_TOOL_BINDING_SOURCE_AMBIGUOUS');
assert.deepEqual(JSON.parse(await fs.readFile(path.join(run,'99.reply.json'),'utf8')),reply);
assert.deepEqual(JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),original);
console.log(JSON.stringify({pass:true,actualSourceNumber:evidenceNumber,newSteps:jobs.length,completedSourceReplays:0,providerCalls:0,productionWrites:0}));
