// Actual215 left an executable, model-owned choice as a question for "the
// model" and submitted no work. This must remain in the chooser, not finish.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/p4-from-empty');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const request=JSON.parse(await fs.readFile(path.join(run,'215.request.json'),'utf8')).request;
const original=JSON.parse(await fs.readFile(path.join(run,'215.reply.json'),'utf8'));
const node=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const memory=new Map(),get=async ref=>memory.has(ref)?structuredClone(memory.get(ref)):
 JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const store={load:async()=>structuredClone(state),get,put:async v=>{const ref=`test-${memory.size}`;memory.set(ref,structuredClone(v));return ref;}};
let checkpoint;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'actual215-choice-contract',deliberation:{deliberate:async()=>original}});
const result=await execute({...node,evidenceDirectory:state.evidence.map(e=>({...e,validity:'current'}))},
 {operationState:{version:1,turn:0,reads:[],calls:[],consecutiveCorrections:0},checkpointOperation:async v=>{checkpoint=structuredClone(v);},readEvidence:async()=>{throw Error('NOT_REQUESTED');}});
assert.equal(result.continuation,true,'an unsubmitted owned choice is not a finished experiment proposal');
assert.equal(result.value.status,'needs_local_correction');
assert.ok(result.value.errors.some(e=>e.code==='experiment_owner_choice_not_submitted'));
assert.deepEqual((await get(checkpoint.correction.originalReplyRef)).output,original.output);
assert.equal(checkpoint.consecutiveCorrections,1,'ordinary bounded local correction, not resetting the lane');
assert.match(checkpoint.correction.errors[0].instruction,/one/i);
console.log(JSON.stringify({pass:true,actualReplyPreserved:true,unresolvedOwnerChoiceNotCompleted:true,
 boundedCorrectionRetained:true,providerCalls:0,productionWrites:0}));
