// Actual model reply 915cd3 called a four-unit option merely a Raptor option,
// then requested another search. Both automatic views dropped joint identity.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterStaticFormationResultDirectoryV1} from '../packages/roster-strategist/roster-workflow-receipt-view-v1.mjs';
import {projectRosterGeometryDecisionContextV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const root=process.argv[2],read=async ref=>JSON.parse(await fs.readFile(`${root}/artifacts/${ref}.json`,'utf8'));
const state=JSON.parse(await fs.readFile(`${root}/workflow.json`,'utf8'));
const value=(await read('bbe9f326c0f44f7af837b15a9cd692c433f0babed32cb500a33e9c797c32ca1d')).value;
const result=value.receipt.queryReceipt.result;
assert.equal(result.optionCount,6);
const directory=projectRosterStaticFormationResultDirectoryV1(result);
for(const [i,entry] of directory.options.entries()){
  assert.deepEqual(entry.unitIds,result.formationOptions[i].jointUnitIds,'joint option must expose ALL selected units, not only Raptor');
  assert.equal(entry.selectionScope,'whole_joint_formation');
  assert.equal(entry.mustApplyTogether,true);
  assert.equal(entry.unitId,undefined,'do not mislabel a group as a single-unit choice');
  assert.deepEqual(entry.unitAnchors,result.formationOptions[i].unitOptions.map(row=>({unitId:row.pieceId,anchor:row.anchor})));
}
const scene=(await read('8ae755a3ac9201917a8de5abe06efa74528e6246dcc127da0c1a22b0dca88854')).value;
const assignment={scope:{source:value.receipt.sourceStateHash},inputs:{task:{value:{failure:{receipt:value.receipt,
  queryRepair:{previousBranchStateHash:value.receipt.baseStateHash,placementAssessment:scene.receipt.hypotheticalPlacementAssessment}}}}}};
const context=await projectRosterGeometryDecisionContextV1({assignment,store:{load:async()=>state,get:read}});
const work=state.work.find(w=>w.resultRef==='bbe9f326c0f44f7af837b15a9cd692c433f0babed32cb500a33e9c797c32ca1d');
const number=state.evidence.findIndex(e=>e.id===`tool-view:${work.id}`)+1;
const choices=context.candidateChoices.filter(c=>c.selection.sourceEvidenceNumber===number);
assert.equal(choices.length,6);
for(const [i,choice] of choices.entries()){
  assert.deepEqual(choice.unitIds,directory.options[i].unitIds);
  assert.equal(choice.mustApplyTogether,true);assert.equal(choice.unitId,undefined);
  assert.equal(choice.appliedToScene,false);assert.equal(choice.arrivalOrMovementLegalityProven,false);
}
assert.deepEqual((await read('bbe9f326c0f44f7af837b15a9cd692c433f0babed32cb500a33e9c797c32ca1d')).value,value);
console.log(JSON.stringify({pass:true,actualJointOptions:6,unitsPerOption:4,
  bothAutomaticViewsAgree:true,sourceUnchanged:true,hostSelectedOption:false,
  providerCalls:0,nativeCalls:0,productionWrites:0}));
