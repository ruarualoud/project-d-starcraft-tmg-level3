// Actual B subject-aware decision failed three times only because selected
// question source84 was not duplicated in its parent list. No strategy/fact
// rewrite: derive the parent review inventory from explicit model selections.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowDraftArgumentsV1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const read=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(stateBytes);
const work=state.work.find(w=>w.id==='product:after-teach:r2:subject-v1');assert(work);
assert.equal(work.operationState.consecutiveCorrections,3);
assert(work.operationState.correction.errors.every(e=>e.code==='question_sources_required_in_parent'));
const ref='769f0e576ffdf9e6e70e5f8195edf161cdcba4a25f6c5c06ad6b04dc9a8b8313';
const paidBytes=await fs.readFile(path.join(base,'artifacts',ref+'.json')),paid=JSON.parse(paidBytes);
assert(!paid.output.decisions[0].evidenceNumbers.includes(84));
assert(paid.output.decisions[0].dataQuestions.some(q=>q.evidenceNumbers.includes(84)));
const request=await read('b373ca43b12fc48dfab6009f3908134ba1612bf2935a2830579517b3a718f1c1');
const plan=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:paid,request});
assert(plan,'a deterministic explicit-source projection must qualify for one saved-reply revalidation');
assert.equal(plan.repairKind,'explicit_question_citation_union');assert.equal(plan.providerReplayed,false);
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
assert.equal(assignment.inputs.menu.status,'read','source84 actually reached this role');
const memory=new Map(),store={load:async()=>structuredClone(state),get:async r=>memory.has(r)?structuredClone(memory.get(r)):read(r),
  put:async v=>{const key=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(key,structuredClone(v));return key;}};
let checkpoint;
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v655',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}}});
const result=await execute({...assignment,evidenceDirectory:state.evidence},
  {operationState:{...structuredClone(work.operationState),pending:null,correction:null,
      consecutiveCorrections:0,revalidateReplyRef:ref},
    checkpointOperation:async o=>{checkpoint=structuredClone(o);},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
assert.equal(result.kind,'proposal');
assert(result.value.decisions[0].evidenceNumbers.includes(84));
assert(result.value.outputProjection.some(p=>p.rule==='explicit_question_source_union_v1'));
assert.deepEqual(result.value.decisions[0].mutation,projectRosterWorkflowDraftArgumentsV1(paid.output.decisions[0].mutation).mutation);
assert.deepEqual(result.value.decisions[0].dataQuestions,paid.output.decisions[0].dataQuestions);
assert.equal(checkpoint.correction,null);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(paidBytes));
console.log(JSON.stringify({status:'passed',explicitSource84DerivedNotInvented:true,paidReplyReused:true,
  mutationAndQuestionsUnchanged:true,sourceReadCheckRetained:true,providerCalls:0,nativeCalls:0,productionWrites:0,
  actualProductRecoveryStillPending:true}));
