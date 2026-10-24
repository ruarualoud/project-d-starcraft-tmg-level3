// r3 comparison must rebuild a full army to change one upgrade, and queried
// a new setup source instead of the selected combat scene. The current draft
// actually has five selections/1490 minerals, not its prose's historical 2000.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterWorkflowCandidateContextsV1} from '../packages/roster-strategist/roster-workflow-candidate-context-v1.mjs';
import {projectRosterWorkflowStateReferenceV1} from '../packages/roster-strategist/roster-workflow-state-reference-v1.mjs';
import {projectRosterWorkflowReceiptViewV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {rosterToolProofScopeV1} from '../packages/roster-strategist/roster-tool-proof-scope-v1.mjs';
const root=path.resolve(process.argv[2]),before=await fs.readFile(path.join(root,'workflow.json'),'utf8');
const state=JSON.parse(before),read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const draft=await read(state.draftRef),candidate=draft.candidateInput;
assert.equal(draft.revision,3);
assert.equal(candidate.units.flatMap(u=>u.upgrades).length,5);
assert.equal((await read(draft.builderVerdictRef)).summary.mineralSpent,1490);
const original=structuredClone(candidate),audited=[],projected=[],restored=[];
const parent={sourceStateHash:'a'.repeat(64),version:'test'},alternative={sourceStateHash:'b'.repeat(64),version:'test'};
const scene={referenceStateRef:{schema:'roster_workflow_state_ref_v1',contextRef:null,
  sourceStateHash:'a'.repeat(64),stateHash:'c'.repeat(64)},changedUnits:[],unlistedUnits:'off_table'};
const contexts=createRosterWorkflowCandidateContextsV1({
  laboratory:{labDescriptor:()=>parent},getCandidateInput:async()=>candidate,
  builderPort:{evaluateRosterCandidate:value=>{
    audited.push(structuredClone(value));
    return {schema:'starcraft_tmg_army_builder_roster_verdict_v1',status:'legal'};
  }},
  createCandidateLaboratory:async()=>({labDescriptor:()=>alternative,
    restoreProjectedScenarioBranch:({receipt})=>restored.push(receipt)}),
  projectCandidateScene:async({laboratory,args,contextRef})=>{
    assert.deepEqual(laboratory.labDescriptor(),alternative);
    projected.push({args,contextRef});
    return {branchStateHash:'d'.repeat(64),sourceStateHash:'b'.repeat(64),
      resultStatus:'ok',sceneProjection:{hostSelectedReferenceOrAdaptation:false}};
  }
});
const failures=[];
async function check(name,run){try{await run();}catch(e){failures.push({name,error:e.message});}}
let receipt;
await check('small-explicit-upgrade-delta-preserves-all-other-native-input',async()=>{
  receipt=await contexts.create({candidateEdits:{unitUpgradeEdits:[{unitInstanceId:'goliath-1',
    remove:[{upgradeName:'Ares-Class Targeting System'}],add:[{upgradeName:'Haywire Missiles'}]}]}});
  const expected=structuredClone(original),g=expected.units.find(u=>u.unitInstanceId==='goliath-1');
  const i=g.upgrades.findIndex(u=>u.upgradeName==='Ares-Class Targeting System');
  assert(i>=0);
  g.upgrades.splice(i,1);
  g.upgrades.push({upgradeName:'Haywire Missiles'});
  assert.deepEqual(audited.at(-1),expected);
  assert.deepEqual(candidate,original);
  assert.equal(receipt.mutatesFormalDraft,false);
});
await check('explicit-scene-projects-on-created-candidate-not-setup-source',async()=>{
  receipt=await contexts.create({candidateEdits:{unitUpgradeEdits:[{unitInstanceId:'goliath-1',
    remove:[{upgradeName:'Ares-Class Targeting System'}],add:[{upgradeName:'Haywire Missiles'}]}]},
    comparisonScene:scene,branchId:'test-projection',executionScope:{kind:'firepower_comparison'}});
  assert.deepEqual(projected.at(-1).args.referenceStateRef,scene.referenceStateRef);
  assert.deepEqual(projected.at(-1).args.changedUnits,[]);
  const ref=projectRosterWorkflowStateReferenceV1({operation:'candidate_context',receipt});
  assert.equal(ref.contextRef,receipt.contextRef);
  assert.equal(ref.stateHash,'d'.repeat(64));
  const value={operation:'candidate_context',receipt,
    toolProofScope:rosterToolProofScopeV1('candidate_context',{comparisonScene:scene})};
  const view=projectRosterWorkflowReceiptViewV1({evidenceId:'test',value});
  assert.equal(view.stateRef.stateHash,'d'.repeat(64));
  assert.equal(view.sceneComparison.pointer,'/receipt/sceneProjectionReceipt/sceneProjection');
  assert.equal(view.toolProofScope.precision,'conditional_scene');
  await contexts.restore(receipt);
  assert.equal(restored.length,1);
});
await check('no-silent-upgrade-removal-or-competing-authority',async()=>{
  await assert.rejects(contexts.create({candidateInput:candidate,candidateEdits:{}}));
  await assert.rejects(contexts.create({candidateEdits:{unitUpgradeEdits:[{unitInstanceId:'goliath-1',
    remove:[{upgradeName:'not-owned'}],add:[]}]}}));
  await assert.rejects(contexts.create({candidateEdits:{unitUpgradeEdits:[{unitInstanceId:'missing-unit',
    remove:[],add:[]}]}}));
});
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),before);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,realNativeCalls:0,
  productionWrites:0,scope:'actual saved army through candidate interface; injected Builder/projection, not legality or strategy proof'}));
if(failures.length)process.exitCode=1;
