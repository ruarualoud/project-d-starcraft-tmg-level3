// Actual v784 continuation still received the old scheduled diagnostic despite
// the source adapter already exposing precise unsupported-field feedback.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const event=state.events.find(e=>e.sequence===5244),work=state.work.find(w=>w.id===event.workId);
const assignment={role:work.role,inputs:{task:structuredClone(work.inputs.task)}},before=structuredClone(assignment);
const lab={labDescriptor:()=>({sourceStateHash:state.scope.source})};
const tool=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store:{load:async()=>state}});
const projected=await projectRosterWorkflowRoleSourceInputsV1({assignment,state:{evidence:[],draftRevision:3},
  readArtifact:()=>{throw Error('no reads required');},projectToolRepair:value=>tool.projectRepair(value)});
assert.equal(projected.task.value.failure.queryRepair.inputProblem?.reason,'unsupported_fields');
assert.deepEqual(projected.task.value.failure.queryRepair.inputProblem.fields,
  ['preservePositions','clearTerrain','isolateToPlacedPieces','reassessAllOnField']);
assert.equal(projected.task.value.currentRepairContract.originalFailureUnchanged,true);
assert.deepEqual(projected.task.value.failure.detail,before.inputs.task.value.failure.detail);
assert.deepEqual(projected.task.value.originalWork,before.inputs.task.value.originalWork);
assert.deepEqual(assignment,before);
console.log(JSON.stringify({pass:true,actualSavedWork:event.workId,sourceContractReused:true,
  originalFailureAndRequestPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
