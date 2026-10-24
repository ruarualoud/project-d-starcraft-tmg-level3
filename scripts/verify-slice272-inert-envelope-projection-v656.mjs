// Fixed Plan author has ALREADY corrected reinforcement in its actual paid
// mutation. Only an extra empty [] on the decision envelope caused 3 failures.
// Ignore inert envelope placeholders, not unknown executable mutation fields.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowSavedSchemaRevalidationV1}
  from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectRosterWorkflowDraftArgumentsV1} from '../packages/roster-strategist/roster-workflow-draft-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace/decision-workflows/decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34');
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),state=JSON.parse(stateBytes);
const work=state.work.find(w=>w.id==='product:after-teach:r3:subject-v1');assert(work);
assert.equal(work.operationState.consecutiveCorrections,3);
const ref='3578959460a8f8393feeec1837453e6740b3bdfc0411eaebf6874067b4bb9b66';
const paidBytes=await fs.readFile(path.join(base,'artifacts',ref+'.json')),paid=JSON.parse(paidBytes);
const d=paid.output.decisions[0];assert.deepEqual(d.retainedSectionReasons,[]);
assert.equal(d.mutation.retainedSectionReasons.length,2);
assert.match(d.mutation.plan.deploymentConcept.reinforcementPolicyText,/所有单位起始于Reserves/);
const request=await get('970a298f178d12ad041808d92f99748f1e46fb9f87bf4d866513627388925690');
const recovery=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:paid,request});
assert(recovery,'an inert non-executable envelope placeholder must not block the paid valid mutation');
assert.equal(recovery.repairKind,'inert_envelope_projection');
const conflicting=structuredClone(paid);conflicting.output.decisions[0].retainedSectionReasons=[{unexpectedIntent:'must not be discarded'}];
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:conflicting,request}),null);
const commandExtra=structuredClone(paid);commandExtra.output.decisions[0].mutation.unknownCommandArgument=[];
assert.equal(projectRosterWorkflowSavedSchemaRevalidationV1({work,reply:commandExtra,request}),null);
const assignment=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
const memory=new Map(),store={load:async()=>structuredClone(state),get:async r=>memory.has(r)?structuredClone(memory.get(r)):get(r),
  put:async v=>{const r=createHash('sha256').update(JSON.stringify(v)).digest('hex');memory.set(r,structuredClone(v));return r;}};
const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'isolated-v656',
  deliberation:{deliberate:async()=>{throw Error('PROVIDER_FORBIDDEN');}}});
const result=await execute({...assignment,evidenceDirectory:state.evidence},{
  operationState:{...structuredClone(work.operationState),pending:null,correction:null,consecutiveCorrections:0,revalidateReplyRef:ref},
  checkpointOperation:async()=>{},readEvidence:async()=>{throw Error('UNEXPECTED_READ');}});
assert.equal(result.kind,'proposal');
assert(result.value.outputProjection.some(p=>p.rule==='inert_unmapped_envelope_field_v1'&&p.from==='/decisions/0/retainedSectionReasons'));
assert.deepEqual(result.value.decisions[0].mutation,projectRosterWorkflowDraftArgumentsV1(d.mutation).mutation);
assert.deepEqual(result.value.decisions[0].dataQuestions,d.dataQuestions);
assert.equal(result.value.decisions[0].mutation.retainedSectionReasons.length,2);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
assert((await fs.readFile(path.join(base,'artifacts',ref+'.json'))).equals(paidBytes));
console.log(JSON.stringify({status:'passed',emptyEnvelopePlaceholderPreservedInProjection:true,
  realRetainedReasonsAndPlanUnchanged:true,actualReinforcementCorrectionKept:true,
  providerCalls:0,nativeCalls:0,productionWrites:0,actualCommitStillPending:true}));
