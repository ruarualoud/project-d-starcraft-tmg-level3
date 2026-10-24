// Real stopped r21 Native deployment + saved role input. No external model,
// new Native query, new room or production-state mutation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import {compileRosterWorkflowExperimentV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowToolReturnWorkV1} from '../packages/roster-strategist/roster-workflow-tool-return-v1.mjs';
import {projectRosterDelegatedToolPresentationV1,rosterToolContractDirectoryV1} from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';
const directory=process.argv[2],memory=new Map(),copy=structuredClone;
const get=async ref=>memory.has(ref)?copy(memory.get(ref)):JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const assignment=await get('58bdcdaa41793b09dfd244f0d20568406bca75c480a76d28f9ba28c3ceacd495');
const contract=rosterWorkflowChoiceContractV1({state,workId:assignment.workId});
const remaining=process.argv.includes('--remaining'),checks=[];
if(!remaining){
assert.ok(contract.preliminarySpatialQueryKinds.includes('space.solve_formation'),
  'Native repair advice requires an action-domain solver but delegated permission exposes only static geometry');
checks.push('actual_graph_allows_native_domain_solver_for_native_action_only');
}
const before=hash(state),assignmentBefore=hash(assignment);
const full=assignment.inputs.tools.value;
if(!remaining){
for(const descriptor of [full,rosterToolContractDirectoryV1(full,{evidenceId:'offline-tools',evidenceNumber:1})]){
  const delivered=projectRosterDelegatedToolPresentationV1(descriptor,contract);
  const spatial=delivered.operations.find(o=>o.operation==='spatial');
  const kinds=spatial.queries?.map(q=>q.queryKind)??Object.keys(spatial.queryContracts??{});
  assert.ok(kinds.includes('space.solve_formation'));assert.ok(kinds.includes('legal_formation_options'));
}
checks.push('full_and_directory_permission_projection');
}
let captured;const sentinel=Error('captured-before-provider');
const execute=createRosterWorkflowReadRoleExecutorV1({sessionId:'offline-v957',store:{load:async()=>state,get,
  put:async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;}},deliberation:{deliberate:async request=>{captured=request;throw sentinel;}}});
try{await execute(copy(assignment),{checkpointOperation:async()=>{},
  readEvidence:async(id,pointer)=>{
    const saved=state.work.find(w=>w.id===assignment.workId)?.operationState?.reads
      ?.find(r=>r.evidenceId===id&&r.pointer===pointer);
    assert.ok(saved,'Only exact already-retained source reads are allowed in this fixture');
    return get(saved.resultRef);
  },
  publishContext:async()=>assert.fail('Unexpected context publication in scoped prompt capture')});}
catch(error){if(error!==sentinel)throw error;}
const tools=captured.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.tools.value;
assert.ok(tools.operations.find(o=>o.operation==='spatial').queries.some(q=>q.queryKind==='space.solve_formation'));
checks.push('actual_role_prompt_and_full_directory_expose_the_same_query_permission');
const original=assignment.inputs.task.value.originalWork;
const domain=assignment.inputs.task.value.failure.queryRepair.parameterContract.domainId;
const order={orderId:'offline-v957',purpose:original.purpose,scenarioAssumptions:original.scenarioAssumptions,
  experimentScope:original.experimentScope,stopAndReturnToModelWhen:original.stopAndReturnToModelWhen,completionStepId:'',
  steps:[{stepId:'formation',operation:'spatial',argumentsJson:JSON.stringify({queryKind:'space.solve_formation',
    queryArguments:{domainId:domain,preferredAnchor:{xMilliInches:12000,yMilliInches:33000}},
    base:assignment.inputs.task.value.failure.request.base}),bindings:[],guards:[],publicReason:'Same saved parent/domain prerequisite, no action execution.'}]};
const compile=(o,c=contract)=>compileRosterWorkflowExperimentV1({order:o,scope:assignment.scope,namespace:'offline-v957',
  evidenceDirectory:assignment.evidenceDirectory,choiceContract:c});
assert.equal(compile(order)[0].inputs.request.value.args.queryKind,'space.solve_formation');
const other=copy(order);other.steps[0].operation='probability';
assert.throws(()=>compile(other),/ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED/);
assert.throws(()=>compile(order,{...contract,operation:'probability',allowedOperations:['inspect','spatial','probability'],
  preliminarySpatialQueryKinds:['space.solve_static_formation']}),/ROSTER_WORKFLOW_CHOICE_SCOPE_EXCEEDED/);
checks.push('same_compiler_accepts_prerequisite_not_unrelated_combat_or_other_role_permission');
const target=state.work.find(w=>w.resultRef==='531ffc005adebddada89b110aeb7f8696f339b24d291cb3a2848afeed8dda3ac');
assert.ok(target);const failure=(await get(target.resultRef)).value;
const args={state,work:target,failure,queryRepair:failure.queryRepair,toolDescriptor:full,sourceInputs:{}};
const recovery=createRosterWorkflowToolReturnWorkV1(args);
assert.ok(recovery,'concrete new delegation fix permits exactly one named recovery after the stopped third repair');
assert.equal(recovery.controlledRecovery.engineeringChangeId,'native_action_formation_delegation_v957');
assert.equal(recovery.controlledRecovery.additionalConfirmationLimit,1);
assert.equal(recovery.controlledRecovery.historyReset,false);assert.equal(recovery.repairGeneration,4);
assert.equal(createRosterWorkflowToolReturnWorkV1({...args,state:{...state,work:[...state.work,recovery]}}),null);
const next={...copy(target),id:'offline-next-failed-native',experimentOwnerId:recovery.id,repairGeneration:4};
assert.equal(createRosterWorkflowToolReturnWorkV1({...args,work:next,state:{...state,work:[...state.work,recovery,next]}}),null);
assert.equal(createRosterWorkflowToolReturnWorkV1({...args,queryRepair:{...failure.queryRepair,sourceContract:'unrelated'}}),null);
checks.push('one_saved_recovery_no_counter_reset_no_cold_duplicate_no_second_extra_or_unrelated_revival');
assert.equal(hash(state),before);assert.equal(hash(assignment),assignmentBefore);
console.log(JSON.stringify({pass:true,checks,providerCalls:0,nativeCalls:0,productionWrites:0,
  scope:'Actual delegation, role prompt, compiler and one recovery; live solver/choice/Native success still required.'}));
