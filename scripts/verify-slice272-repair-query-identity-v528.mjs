// Reproduce a geometry receipt closing the actual unresolved combat query.
// The production scheduler is exercised with an in-memory copy, no tool/model.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const base=path.join(path.resolve(process.argv[2]),'workspace/decision-workflows/p4-from-empty');
let state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const prior=state.work.find(w=>w.id.endsWith(':order0:combat-query'));
const replacement=state.work.find(w=>w.id.endsWith(':repair-goliath-formation-2'));
prior.status='needs_model_choice';delete prior.resolvedByWorkId;
const saved=new Map();let writes=0,executions=0;
const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);writes++;},
 get:async ref=>saved.has(ref)?saved.get(ref):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
 put:async v=>{const key='temp-'+saved.size;saved.set(key,v);return key;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:()=>{executions++;throw Error('NOT_ALLOWED');}});
await assert.rejects(workflow.dispatch({type:'resolve_with_work',workId:prior.id,replacementWorkId:replacement.id}),
 /ROSTER_WORKFLOW_REPAIR_QUERY_MISMATCH/,'same spatial operation does not close an unspecified combat query');
assert.equal(writes,0);assert.equal(executions,0);
// A known subtype must also match, even when an author marks completion.
state.work.find(w=>w.id===prior.id).inputs.request.value.args.queryKind='attack_probability';
state.work.find(w=>w.id===replacement.id).repairCompletionExplicit=true;
const known=await createRosterDecisionWorkflowV1({store,execute:()=>{throw Error('NOT_ALLOWED');}});
await assert.rejects(known.dispatch({type:'resolve_with_work',workId:prior.id,replacementWorkId:replacement.id}),
 /ROSTER_WORKFLOW_REPAIR_QUERY_MISMATCH/);
console.log(JSON.stringify({pass:true,checks:4,providerCalls:0,toolExecutions:0,productionWrites:0}));
