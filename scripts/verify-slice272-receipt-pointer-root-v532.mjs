// Actual209 used the address printed by the receipt reader. The compiler
// prepended receipt again, creating a nonexistent /value/receipt/receipt path.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const run=path.resolve(process.argv[2]);
const raw=await fs.readFile(path.join(run,'209.reply.json'),'utf8');
const order=JSON.parse(raw).output.workOrders[0];
const compiled=compileRosterWorkflowExperimentV1({order,scope:{},namespace:'actual209'});
const expected='/value/receipt/branchStateHash';
assert.equal(compiled.find(w=>w.id==='actual209:inspect-scene').inputs.binding0.pointer,expected);
assert.equal(compiled.find(w=>w.id==='actual209:combat-exchange').inputs.binding0.pointer,expected);
for(const pointer of ['/branchStateHash','/receipt/branchStateHash','/value/receipt/branchStateHash']){
 const variant=structuredClone(order);variant.steps[1].bindings[0].resultPointer=pointer;
 assert.equal(compileRosterWorkflowExperimentV1({order:variant,scope:{},namespace:'variant'})[1].inputs.binding0.pointer,expected);
}
assert.equal(await fs.readFile(path.join(run,'209.reply.json'),'utf8'),raw);
const base=path.join(run,'workspace/decision-workflows/p4-from-empty');
let state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
 get:async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'))};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NO_EXECUTION');}});
const repaired=await workflow.dispatch({type:'reconcile_receipt_pointer_roots'});
assert.equal(repaired.rebound.length,2,'only the two actual unissued duplicated-prefix failures are eligible');
for(const id of repaired.rebound){
 const w=(await workflow.inspect()).work.find(w=>w.id===id);
 assert.equal(w.status,'ready');assert.ok(w.inputHistory.at(-1).resultRef);
}
assert.equal((await workflow.dispatch({type:'reconcile_receipt_pointer_roots'})).rebound.length,0);
console.log(JSON.stringify({pass:true,checks:10,providerCalls:0,nativeExecutions:0,productionWrites:0}));
