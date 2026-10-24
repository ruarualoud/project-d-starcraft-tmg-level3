// Reproduce the actual new-Run read handoff, without Provider/tool execution or
// writes to the production Run. Only this concrete defect is covered.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]);
const directory=path.join(run,'workspace/decision-workflows/p4-from-empty');
let state=JSON.parse(await fs.readFile(path.join(directory,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id==='decision-after-teach:r5');
const saved=new Map();let serial=0;
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
  get:async ref=>saved.has(ref)?structuredClone(saved.get(ref)):JSON.parse(await fs.readFile(path.join(directory,'artifacts',ref+'.json'),'utf8')),
  put:async v=>{const ref='temporary-'+(++serial);saved.set(ref,structuredClone(v));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NO_TOOL_EXECUTION');}});
const read=(id,pointer)=>workflow.dispatch({type:'read_evidence',consumer:work.id,evidenceId:id,pointer});
const view=await read('tool-view:discovery:r5:budget','/receipt/branches');
assert.equal(view.status,'read','advertised receipt pointer must resolve from its view');
const raw=await read('tool:discovery:r5:budget','/receipt/branches');
assert.deepEqual(view.value,raw.value,'view must return exact original, not a summary');
assert.equal(view.resolvedEvidenceId,'tool:discovery:r5:budget');
const missing=await read('tool-view:discovery:r5:budget','/receipt/definitely_missing');
assert.equal(missing.status,'path_missing','real missing fields remain missing');
const assignment=await store.get(work.inputRef);
let captured,operation=structuredClone(work.operationState);
const stop=Error('CAPTURE_ONLY');
const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v517-offline',
  deliberation:{deliberate:async request=>{captured=request;throw stop;}}});
try{await executor(assignment,{operationState:operation,readEvidence:read,checkpointOperation:async v=>{operation=structuredClone(v);}});}
catch(error){if(error!==stop)throw error;}
assert.ok(captured);
const feedback=captured.promptNodes.find(n=>n.kind==='local_contract_feedback');
assert.ok(feedback.instruction.includes(work.operationState.correction.instruction),'specific correction must survive prompt assembly');
const results=captured.promptNodes.find(n=>n.kind==='exact_read_results').results;
const budget=results.find(r=>r.evidenceId==='tool-view:discovery:r5:budget'&&r.pointer==='/receipt/branches');
assert.equal(budget.status,'read','previous failed view read is reconciled from exact saved source');
assert.deepEqual(budget.value,raw.value);
for(const r of results)assert.equal(assignment.evidenceDirectory[r.evidenceNumber-1].id,r.evidenceId);
assert.ok(operation.readReconciliations.length>=1,'original failed read refs must remain in trace');
assert.equal(state.draftRevision,5,'no army or Plan mutation');
console.log(JSON.stringify({pass:true,checks:7,providerCalls:0,toolExecutions:0,productionWrites:0,branches:raw.value.length}));
