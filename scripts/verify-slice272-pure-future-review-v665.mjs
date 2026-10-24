// Actual reviewer correctly classified a pure future opponent premise, but
// the blanket source-number requirement rejected it four times.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8'));
const id='product:after-teach:r8:subject-v1:followup:r9:strategy-frontier:investigation:strategy-frontier:investigation:strategy-frontier:investigation:source-review:v2:claim:5';
const work=state.work.find(w=>w.id===id);assert(work);
const ref='07a832f5a99c722e630339d3a0dc62db151dc9064fbdd75dcdf380aad4e9ae56';
const bytes=await fs.readFile(path.join(base,'artifacts',ref+'.json')),reply=JSON.parse(bytes);
const request=await get(work.operationState.calls.find(c=>c.replyRef===ref).requestRef);
const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
assert(plan,'a typed pure-future premise must not need a nonexistent realized-opponent receipt');
assert.equal(plan.repairKind,'typed_future_premise_review');
for(const change of [r=>{r.output.checks[0].verdict='supported';},
  r=>{r.output.checks[0].dataQuestions[0].classification='necessary_fact';},
  r=>{r.output.checks[0].conditions=[];}]){
  const other=structuredClone(reply);change(other);
  assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:other,request}),null);
}
const memory=new Map(),store={load:async()=>structuredClone(state),get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
  put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(key,structuredClone(value));return key;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v665',deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}}});
const result=await execute({...request.promptNodes.find(n=>n.kind==='workflow_role_assignment'),evidenceDirectory:state.evidence},{
  operationState:{...structuredClone(work.operationState),pending:null,correction:null,consecutiveCorrections:0,revalidateReplyRef:ref},
  checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
assert.equal(result.kind,'proposal');
assert.equal(result.value.checks[0].verdict,'conditional');
assert.equal(result.value.checks[0].requiredData.length,0);
assert.equal(result.value.checks[0].dataQuestions[0].classification,'future_condition');
assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(bytes));
console.log(JSON.stringify({status:'passed',actualPaidFuturePremiseRetained:true,necessaryFactsStillRequireSources:true,
  noFactualApprovalGranted:true,providerCalls:0,nativeCalls:0,productionWrites:0,actualProductRevalidationStillPending:true}));
