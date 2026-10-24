// Actual B: Native Core capacity rejection was shadowed by the product tool's
// generic candidate-input repair. Exercise the instance and role-input seams.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1}
  from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const [directory,output,mode]=process.argv.slice(2),copy=structuredClone,checks=[];
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const executor=createRosterWorkflowLaboratoryExecutorV1({store:{get,load:async()=>copy(state)},
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source})}});
try{
  if(mode!=='--remaining')for(const ref of ['1c28f4cb1b90742d2efba4bb95bf6f8dc3d88727c841288797580c072a1547c9',
    'e5241aa158f02841d71e0f84ed43316d64afc25ddd4ad91a79287182db866c8a']){
    const saved=await get(ref),failed=saved.value??saved,before=JSON.stringify(failed);
    const repair=executor.projectRepair(failed);
    assert.equal(repair.failureClass,'rules_rejection','actual Native illegal candidate must not become generic input repair');
    assert.equal(repair.controlReturn,true);assert.equal(repair.rulesQuestionAnswered,true);
    assert.equal(repair.combatQuestionAnswered,false);
    assert.deepEqual(repair.nativeRejection,failed.detail.nativeAudit);
    assert.deepEqual(repair,projectRosterWorkflowToolRepairV1(failed));
    const work=state.work.find(w=>w.resultRef===ref);
    const assignment={workId:work.experimentOwnerId,role:'roster_workflow_experiment_planner',
      inputs:{task:{source:'literal',value:{failure:copy(failed)}}}};
    const delivered=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get,
      projectToolRepair:executor.projectRepair});
    assert.deepEqual(delivered.task.value.failure.queryRepair,repair);
    assert.deepEqual(delivered.task.value.failure.request,failed.request);
    assert.equal(delivered.task.value.currentRepairContract.originalFailureUnchanged,true);
    assert.equal(JSON.stringify(failed),before);
    checks.push('actual_candidate_'+ref.slice(0,8)+'_same_rules_rejection_reaches_role');
  }
  const saved=await get('1c28f4cb1b90742d2efba4bb95bf6f8dc3d88727c841288797580c072a1547c9');
  const failure=saved.value??saved,memory=new Map();let auditCalls=0,checkpoint;
  const live=createRosterWorkflowLaboratoryExecutorV1({store:{get,load:async()=>copy(state),
    put:async v=>{const ref=hash(v);memory.set(ref,copy(v));return ref;}},
    laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source})},
    getCandidateInput:async()=>(await get(state.draftRef)).candidateInput,
    builderPort:{evaluateRosterCandidate:async()=>{auditCalls++;return copy(failure.detail.nativeAudit);}},
    createCandidateLaboratory:async()=>{throw Error('ILLEGAL_CANDIDATE_MUST_NOT_CREATE_SOURCE');}});
  const actualRequest=copy(state.work.find(w=>w.resultRef==='1c28f4cb1b90742d2efba4bb95bf6f8dc3d88727c841288797580c072a1547c9').inputs.request.value);
  actualRequest.args=copy(failure.submittedArguments);
  const fresh=await live.execute({workId:'v911-captured-native-rejection',scope:state.scope,
    inputs:{request:{value:actualRequest}}},
    {operationState:{},checkpointOperation:async v=>{checkpoint=copy(v);}});
  assert.equal(auditCalls,1,'replay only the captured Builder reply at the tool boundary');
  assert.equal(fresh.value.queryRepair.failureClass,'rules_rejection');
  assert.equal(fresh.value.queryRepair.rulesQuestionAnswered,true);
  assert.equal(fresh.value.queryRepair.combatQuestionAnswered,false);
  assert.deepEqual(memory.get(checkpoint.failureRef).queryRepair,fresh.value.queryRepair);
  assert.match(fresh.conditions[0],/legality is answered/);
  checks.push('fresh_tool_execution_and_saved_failure_preserve_same_typed_native_outcome');
  for(const [status,rejectionKind,expected,controlReturn]of [
    ['invalid_candidate','candidate_addressing','input_addressing',false],
    ['unknown','unavailable','capability_or_execution',true],
  ]){
    const injected=copy(saved.value??saved);
    injected.detail.nativeAudit={status,rejectionKind,rulesAuthority:null,rulesErrorCode:null};
    const result=executor.projectRepair(injected);
    assert.equal(result.failureClass,expected);assert.equal(result.controlReturn,controlReturn);
    assert.equal(result.rulesQuestionAnswered,false);assert.equal(result.combatQuestionAnswered,false);
    assert.deepEqual(result,projectRosterWorkflowToolRepairV1(injected));
  }
  checks.push('addressing_unknown_and_native_illegal_are_not_merged');
  const report={pass:true,checks,previousPassedGatesNotRerun:mode==='--remaining'?2:0,providerCalls:0,nativeCalls:0,productionWrites:0,
    originalFailuresUnchanged:true,largeCandidateCombatMeasured:false};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){const report={pass:false,checks,error:error.message,stack:error.stack?.split('\n').slice(0,5)};
  await fs.writeFile(output,JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
