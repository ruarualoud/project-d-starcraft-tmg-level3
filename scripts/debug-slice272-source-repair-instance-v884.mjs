// Actual product instance must not shadow the shared v3 repair with old v2.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1,projectRosterWorkflowToolRepairV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {projectRosterWorkflowRoleSourceInputsV1}
  from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.resultRef==='2a379a667b7cf9547e7048bbb7bddb5f721e21e29285a6d2a7b13d1634bfd874');
const failed=await get(work.resultRef),before=JSON.stringify(failed);
const store={get,load:async()=>clone(state)};
const executor=createRosterWorkflowLaboratoryExecutorV1({store,
  laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source})}});
let error=null,repair,delivered;
try{
  repair=executor.projectRepair(failed.value);
  assert.equal(repair.repairContractVersion,3,'real product tool instance shadows shared source repair');
  assert.deepEqual(repair,projectRosterWorkflowToolRepairV1(failed.value));
  const assignment={workId:work.experimentOwnerId,role:'roster_workflow_experiment_planner',
    inputs:{task:{source:'literal',value:{failure:clone(failed.value)}}}};
  delivered=await projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get,
    projectToolRepair:executor.projectRepair});
  assert.deepEqual(delivered.task.value.failure.queryRepair,repair);
  assert.deepEqual(delivered.task.value.failure.request,failed.value.request);
  assert.equal(delivered.task.value.currentRepairContract.originalFailureUnchanged,true);
  assert.equal(JSON.stringify(failed),before);
}catch(e){error=e.message;}
await fs.writeFile(out,JSON.stringify({pass:!error,error,repair,
  deliveredRepair:delivered?.task?.value?.failure?.queryRepair,actualProviderCalls:0,nativeCalls:0,
  productionWrites:0,originalFailureUnchanged:JSON.stringify(failed)===before},null,2));
console.log(JSON.stringify({pass:!error,error,repairVersion:repair?.repairContractVersion,
  deliveredVersion:delivered?.task?.value?.failure?.queryRepair?.repairContractVersion}));process.exitCode=error?1:0;
