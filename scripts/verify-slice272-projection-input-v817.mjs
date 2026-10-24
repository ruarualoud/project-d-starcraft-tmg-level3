// Concrete e7184 regression: malformed changedUnits reached expensive candidate
// construction before Native rejected it. No Provider, game, or production writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterWorkflowCandidateContextsV1,ROSTER_CANDIDATE_CONTEXT_INPUT_V1}
  from '../packages/roster-strategist/roster-workflow-candidate-context-v1.mjs';
import {compilePregameSceneProjectionV1}
  from '../packages/roster-strategist/pregame-scene-projection-v1.mjs';
const root=process.argv[2];
const failure=JSON.parse(await fs.readFile(root+'/artifacts/2d302f0cd7d56be0ad3809032ef878f83b6621751f97df043332580274b4808e.json','utf8')).value;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const draft=JSON.parse(await fs.readFile(root+'/artifacts/'+state.draftRef+'.json','utf8'));
const input=structuredClone(failure.request),saved=structuredClone(input);
const calls={current:0,builder:0,construction:0,projection:0};
const descriptor={schema:'test',laboratoryId:'test',sourceStateHash:'source',sourceRoomRef:'test',builderBundleHash:'builder',portDescriptorHash:'port',rulesRuntimeHash:'rules'};
const unit={unitId:'goliath-1',sideKey:'player1',officialUnitRecordKey:'army_units:goliath',onTable:true,
  livingModelCount:1,modelFootprints:[{modelId:'goliath-1-model-1',diameter:1}],modelPositions:[{modelId:'goliath-1-model-1',xInches:8,yInches:6}]};
const reference={boardHash:'board',builderBundleHash:'builder',round:1,rulesContract:{version:'test'},
  units:[unit],geometryFailures:[],phase:'assault',activeSideKey:'player1',sourceStateHash:'source',baseStateHash:'branch'};
let actualCandidate;
const contexts=createRosterWorkflowCandidateContextsV1({
  laboratory:{labDescriptor:()=>descriptor},
  getCandidateInput:async()=>{calls.current++;return structuredClone(draft.candidateInput);},
  builderPort:{evaluateRosterCandidate:async candidate=>{calls.builder++;actualCandidate=structuredClone(candidate);return {schema:'starcraft_tmg_army_builder_roster_verdict_v1',status:'legal'};}},
  createCandidateLaboratory:async()=>{calls.construction++;return {labDescriptor:()=>descriptor};},
  projectCandidateScene:async({args})=>{calls.projection++;return compilePregameSceneProjectionV1({reference,target:reference,...args});},
});
let rejected;
try{await contexts.create(input);}catch(error){rejected=error;}
assert.equal(rejected?.code,'PREGAME_LAB_SCENE_PROJECTION_INPUT_INVALID');
assert.deepEqual(calls,{current:0,builder:0,construction:0,projection:0},'bad nested input must return before candidate construction');
assert.deepEqual(input,saved,'never repair model parameters in place');
assert.match(rejected.queryRepair.inputContract.changedUnits,/repack_at_reference_anchor/);
assert.match(rejected.queryRepair.inputContract.changedUnits,/\[\] when/);
assert.match(ROSTER_CANDIDATE_CONTEXT_INPUT_V1.comparisonScene,/repack_at_reference_anchor/);
// The same Native boundary still rejects strings. A caller-authored exact-layout
// request remains valid; this fixture is not a production/model answer rewrite.
assert.throws(()=>compilePregameSceneProjectionV1({reference,target:reference,...input.comparisonScene}),
  error=>error.code===rejected.code&&assert.deepEqual(error.queryRepair.inputContract,rejected.queryRepair.inputContract)===undefined);
const valid=structuredClone(input);valid.comparisonScene.changedUnits=[];
const result=await contexts.create(valid);
assert.deepEqual(calls,{current:1,builder:1,construction:1,projection:1});
assert.deepEqual(actualCandidate,failure.detail.candidateReceipt.candidateInput);
assert.deepEqual(result.sceneProjectionReceipt.proof.exactUnits,['goliath-1']);
assert.deepEqual(result.sceneProjectionReceipt.proof.adaptedUnits,[]);
assert.deepEqual(result.sceneProjectionReceipt.spec.placements[0].modelPositions,unit.modelPositions);
assert.deepEqual(input,saved);
console.log(JSON.stringify({pass:true,actualFailure:'e7184',earlyRejection:true,sharedNativeContract:true,
  exactLayoutPreserved:true,modelInputUnchanged:true,providerCalls:0,productionWrites:0,strategyProven:false}));
