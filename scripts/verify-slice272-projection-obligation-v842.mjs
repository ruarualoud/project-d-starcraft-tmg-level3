// Actual e8865/e8867 selected the candidate setup source, losing the comparison
// scene. Exercise the real scheduler -> executor boundary without Native calls.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {rosterWorkflowChoiceContractV1} from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
import * as laboratoryModule from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
assert.equal(state.work.some(w=>w.status==='running'),false,'Use the saved safe boundary, not an in-flight copy');
const owner=state.work.find(w=>w.id.endsWith('inquiry-v2:order0:exchange-ares-absent:input-repair'));
const child=state.work.find(w=>w.experimentOwnerId===owner.id&&w.role==='roster_workflow_tool');
assert.equal(child.status,'ready');
const mem=new Map(),store={load:async()=>state,save:async()=>{},
  get:async ref=>mem.get(ref)??JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8')),
  put:async value=>{const key=createHash('sha256').update(JSON.stringify(value)).digest('hex');mem.set(key,structuredClone(value));return key;}};
let nativeCalls=0,seen;
const lab={labDescriptor:()=>owner.inputs.tools.value.laboratory,
  queryThreatExchange:async()=>{nativeCalls++;throw Error('Wrong scene must be stopped before Native');}};
const tool=laboratoryModule.createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store});
const workflow=await createRosterDecisionWorkflowV1({store,execute:async(assignment,control)=>{
  seen=assignment;assert.ok(assignment.requiredSceneProjection,'Scheduler must retain the selected scene obligation for this queued correction');
  return tool.execute(assignment,control);
}});
await workflow.dispatch({type:'run_ready',workIds:[child.id],concurrency:1});
assert.ok(seen.requiredSceneProjection,'Actual queued correction lost original scene at the execution boundary');
assert.ok(child.resultRef,JSON.stringify(child.failure));
const result=await store.get(child.resultRef);
assert.equal(result.value.code,'ROSTER_WORKFLOW_COMPARISON_SCENE_REQUIRED');
assert.equal(result.value.nativeSuccess,false);assert.equal(result.continuation,true);
assert.equal(child.status,'needs_model_choice');assert.equal(nativeCalls,0);
assert.deepEqual(result.value.queryRepair.requiredSceneProjection,seen.requiredSceneProjection);
const repair={id:child.id+':repair-proof',role:'roster_workflow_experiment_planner',repairOf:child.id,
  inputs:{task:{source:'literal',value:{failure:result.value}}}};
const contract=rosterWorkflowChoiceContractV1({state:{...state,work:[...state.work,repair]},workId:repair.id});
assert.equal(contract.preparationScope.kind,'selected_candidate_scene_projection');
assert.ok(contract.allowedOperations.includes('project_scene'));
assert.equal(contract.preparationScope.targetContextRef,seen.requiredSceneProjection.targetContextRef);
// Synthetic receipts below test the guard, not actual Native projection success.
const required=seen.requiredSceneProjection;
const projectedRef={schema:'roster_workflow_state_ref_v1',contextRef:required.targetContextRef,
  sourceStateHash:'a'.repeat(64),stateHash:'b'.repeat(64)};
const projected={kind:'tool_receipt',value:{operation:'project_scene',status:'completed',contextRef:required.targetContextRef,
  submittedArguments:{referenceStateRef:required.referenceStateRef,changedUnits:[],unlistedUnits:'off_table'},
  stateRef:projectedRef,receipt:{resultStatus:'ok',sourceStateHash:projectedRef.sourceStateHash,branchStateHash:projectedRef.stateHash}}};
const binding=[{argumentPointer:'/stateRef',sourceResultRef:'injected-projection'}];
const check=source=>laboratoryModule.projectRosterWorkflowComparisonSceneFailureV1({
  required,args:{stateRef:projectedRef},inputBindings:binding,readArtifact:async()=>source});
assert.equal(await check(projected),null,'Explicit exact selected projection can proceed to original Native validation');
for(const mutate of [v=>v.value.operation='candidate_context',v=>v.value.submittedArguments.changedUnits=[{unitId:'changed'}],
  v=>v.value.submittedArguments.referenceStateRef={...required.referenceStateRef,stateHash:'other-scene'},
  v=>v.value.contextRef='candidate:other',v=>v.value.status='returned_to_model']){
  const invalid=structuredClone(projected);mutate(invalid);assert.ok(await check(invalid));
}
console.log(JSON.stringify({pass:true,actualQueuedWork:child.id,sceneObligationSurvivesDispatch:true,
  wrongSetupSourceRejectedBeforeNative:true,nextRepairCanProject:true,exactProjectionProofAccepted:true,
  wrongSourceOrAdaptationRejected:true,providerCalls:0,nativeCalls,productionWrites:0,
  fixtureReceiptsAreSynthetic:true,actualAutomaticRecovery:'not_claimed'}));
