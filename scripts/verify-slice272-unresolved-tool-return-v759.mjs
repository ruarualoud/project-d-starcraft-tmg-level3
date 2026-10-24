// Real e4307 deadlock: three completed read queries have no attack domain/menu,
// but neither choice nor parameter repair can receive the unresolved result.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]);
const original=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(original);
const refs=['37dbf30a104106a00dab82d776c1e4a9c9661944f7aac83bce599cbc2cb48de0',
  'd694d7156f4572d8159c7e448c158da4fb8ae4a25e1a96c37c48c1bcce775aeb',
  'dbafee1f1e5c3064f138cbffe2c14fab0d74f27af1a0b0988fb682a0896238d1'];
const failures=await Promise.all(refs.map(ref=>fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8').then(JSON.parse)));
const first=projectRosterWorkflowToolRepairV1(failures[0].value);
assert.equal(first?.controlReturn,true,'unresolved read must return to a method owner instead of NO_READY_WORK');
const {createRosterWorkflowToolReturnWorkV1}=await import('../packages/roster-strategist/roster-workflow-tool-return-v1.mjs');
for(const [index,ref] of refs.entries()){
  const work=state.work.find(w=>w.resultRef===ref);
  assert.equal(work.status,'needs_model_choice');
  const queryRepair=projectRosterWorkflowToolRepairV1(failures[index].value);
  const job=createRosterWorkflowToolReturnWorkV1({state,work,failure:failures[index].value,queryRepair,
    toolDescriptor:{fixtureOnly:true},sourceInputs:{originalResult:{source:'evidence',id:'tool:'+work.id,pointer:''}}});
  assert(job);
  assert.equal(job.repairOf,work.id);
  assert.equal(job.inputs.task.value.failure.receipt.resultStatus,'unknown');
  assert.equal(job.inputs.task.value.failure.queryRepair.nativeRetryAuthorized,false);
  assert.equal(job.inputs.task.value.failure.queryRepair.factAnswered,false);
  assert.equal(job.inputs.task.value.failure.queryRepair.resolutionRequired,'method_or_scope_decision');
  assert.equal(job.role,'roster_workflow_experiment_planner');
  assert.equal(job.inputs.task.value.instruction,queryRepair.instruction);
  assert.equal(createRosterWorkflowToolReturnWorkV1({state:{...state,work:[...state.work,job]},
    work,failure:failures[index].value,queryRepair,toolDescriptor:{},sourceInputs:{}}),null,
    'synchronizing again cannot create a second owner');
}
assert.equal(projectRosterWorkflowToolRepairV1({...failures[0].value,operation:'native_action'}),null,
  'an action failure does not gain generic read-query recovery');
assert.equal(projectRosterWorkflowToolRepairV1({...failures[0].value,receipt:{
  ...failures[0].value.receipt,resultStatus:'ok'}}),null,'successful results do not enter unresolved routing');
const unsupported=projectRosterWorkflowToolRepairV1({...failures[0].value,receipt:{
  ...failures[0].value.receipt,queryRepair:{correctable:false,reasonCode:'fixture_unsupported'}}});
assert.equal(unsupported?.controlReturn,true);
assert.equal(unsupported?.nativeRetryAuthorized,false,'unsupported query can be explained, not retried as repairable input');
const inputRepair={correctable:true,sourceContract:'actual_input_contract',instruction:'Repair exactly the source field'};
assert.deepEqual(projectRosterWorkflowToolRepairV1({...failures[0].value,queryRepair:inputRepair}),inputRepair,
  'source input repair retains precedence');
assert.deepEqual(state,JSON.parse(original));
for(const [index,ref] of refs.entries())
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8')),failures[index]);
console.log(JSON.stringify({passed:true,actualUnresolvedQueriesReturned:3,noAutomaticNativeRetry:true,
  originalUnknownPreserved:true,duplicateOwnerPrevented:true,providerCalls:0,realNativeCalls:0,productionWrites:0}));
