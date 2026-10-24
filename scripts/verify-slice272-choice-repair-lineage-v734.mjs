// Paid local firepower study repeated geometry after a multi-weapon result.
// Its choice handoff also dropped the existing failed-input repair generation.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowLaboratoryExecutorV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {createRosterWorkflowChoiceObservationV1}
  from '../packages/roster-planning-workspace/roster-workflow-choice-observation-v1.mjs';
import {createRosterWorkflowGraphV1}
  from '../packages/roster-strategist/roster-workflow-graph-v1.mjs';
const root=path.resolve(process.argv[2]);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8')),before=JSON.stringify(state);
const ref='0dc48ea8c4ccd5ca2c05049f5e84b419cc0491013010036a223e0c17ccc4ae9c';
const value=(await read(ref)).value,work=state.work.find(w=>w.resultRef===ref);
assert.ok(work);
assert.equal(value.receipt.unknownReason,'CURRENT_ACTION_QUERY_DOMAIN_AMBIGUOUS');
assert.equal(value.receipt.availableRangedDomains.length,2);
const executor=createRosterWorkflowLaboratoryExecutorV1({
  laboratory:{labDescriptor:()=>({sourceStateHash:value.receipt.sourceStateHash})},
  store:{load:async()=>state,get:read,put:()=>{throw Error('NO_WRITES');}}});
const failures=[],check=(name,fn)=>{try{fn();}catch(e){failures.push({case:name,error:e.message});}};
check('multi-weapon-is-a-choice-not-a-scene-repair',()=>{
  const choice=executor.projectChoice(value);
  assert.ok(choice,'saved native weapon alternatives must be delivered as a choice');
  assert.equal(choice.reason,'native_domain_choice_required');
  assert.equal(choice.operation,'probability');
  assert.deepEqual(choice.availableChoices,value.receipt.availableRangedDomains);
  assert.equal(choice.sourceReads[0].sourceWorkId,work.id);
  const observed=createRosterWorkflowChoiceObservationV1({work,choice});
  assert.equal(observed.observations.length,0,'the exact weapon menu already exists');
  assert.match(observed.inputs.task.value.instruction,/domainId/);
  assert.match(observed.inputs.task.value.instruction,/same.*state/i);
  assert.equal(observed.inputs.observedSource0.id,`choice-source:${work.id}:${work.resultRef}`);
  assert.equal(observed.evidencePublications[0].resultRef,ref);
});
check('choice-handoff-cannot-reset-failed-input-lineage',()=>{
  const graph=createRosterWorkflowGraphV1(state);
  assert.equal(typeof graph.repairGeneration,'function');
  assert.equal(work.repairGeneration??0,0,'actual cold-resumed job lost its counter');
  assert.ok(graph.repairGeneration(work.id)>=2);
  const owner=state.work.find(w=>w.id===work.experimentOwnerId);
  assert.equal(graph.repairGeneration(work.id),graph.repairGeneration(owner.id));
  const rootStudy=state.work.find(w=>w.id==='product:strategy-hypothesis:v1:5c71050505940415351d:purpose:v3:study');
  assert.equal(graph.repairGeneration(rootStudy.id),0,'new independent study is not the failed child');
});
assert.equal(JSON.stringify(state),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
