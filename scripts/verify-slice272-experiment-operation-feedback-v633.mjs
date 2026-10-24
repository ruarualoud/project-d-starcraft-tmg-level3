// Actual1238/1241/1245: finish + workOrders + strategy_required conclusion.
// The product rejected it three times but supplied only an error code.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/projection-owner');
const saved=JSON.parse(await fs.readFile(path.join(run,'1245.request.json'),'utf8')).request;
const paidBytes=await fs.readFile(path.join(run,'1245.reply.json'),'utf8'),paid=JSON.parse(paidBytes);
const assignment=saved.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.id===assignment.workId),directory=state.evidence.map((e,i)=>({...e,number:i+1}));
const memory=new Map();const store={load:async()=>structuredClone(state),
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const marker=Error('CAPTURE_ONLY');let request;
const capture=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v633',
  deliberation:{deliberate:async()=>{throw Error('UNEXPECTED_PROVIDER');}},onRequest:async value=>{request=value;throw marker;}});
await assert.rejects(()=>capture({...assignment,evidenceDirectory:directory},
  {operationState:structuredClone(work.operationState),checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}}),e=>e===marker);
const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
const issue=feedback.errors.find(e=>e.code==='experiment_conclusion_requires_conclude_action');
assert.equal(issue?.field,'/conclusion','BUG: actual three-round failure supplies a bare code, not the conflicting field or valid next operations');
assert.equal(issue.observedAction,'finish');assert.equal(issue.observedConclusionStatus,'strategy_required');
assert.equal(issue.alternatives.length,2);assert(issue.instruction.includes('null'));
assert(issue.instruction.includes('publicReason'),'partial findings must survive, not disappear to satisfy syntax');
assert.deepEqual(feedback.originalOutput,paid.output,'Host must not hand-edit paid semantics');
assert(request.responseFormat.schema.properties.conclusion.anyOf[0].properties.status.description.includes('null'));
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v633',deliberation:{deliberate:async()=>paid}});
const outcome=await execute({...assignment,evidenceDirectory:directory},
  {operationState:{...structuredClone(work.operationState),consecutiveCorrections:0,correctionLimit:3},
    checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
assert.equal(outcome.value.status,'needs_local_correction');
assert(outcome.value.errors.some(e=>e.code===issue.code&&e.field==='/conclusion'&&e.instruction.includes('null')));
assert.equal(await fs.readFile(path.join(run,'1245.reply.json'),'utf8'),paidBytes);
console.log(JSON.stringify({passed:true,actualPaidReply:1245,legacyAndNewFeedbackPrecise:true,invalidMixStillRejected:true,
  originalOutputAndUnknownsPreserved:true,newProviderCalls:0,newNativeCalls:0,productionWrites:0}));
