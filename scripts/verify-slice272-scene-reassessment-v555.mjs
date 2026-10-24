// Actual47 moves Marine1 away, but its unselected former collision partner
// retained the parent's failure. Re-evaluate only this actual new scene.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const root=process.cwd(),run=path.resolve(process.argv[2]),base=path.join(run,'workspace/decision-workflows/candidate-capability');
const original=await fs.readFile(path.join(base,'workflow.json'),'utf8'),state=JSON.parse(original);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const values=new Map(),branches=new Map();
for(const work of state.work.filter(w=>w.role==='roster_workflow_tool'&&w.resultRef)){
  const value=(await get(work.resultRef)).value;values.set(work.id,value);
  if(value?.receipt?.branchStateHash)branches.set(value.receipt.branchStateHash,value);
}
const selected=[...values.values()].find(value=>value.receipt?.formationSelection?.selections.length===3
  &&value.receipt.formationSelection.selections.some(row=>row.pieceId==='u_marine_1')
  &&value.receipt.formationSelection.selections.some(row=>row.pieceId==='player2-corpser'));
assert.ok(selected,'actual47 materialized scene exists');const receipt=selected.receipt;
const sourceWork=state.work.find(work=>values.get(work.id)===selected);
const originalTool=await fs.readFile(path.join(base,'artifacts',sourceWork.resultRef+'.json'),'utf8');
assert.ok(receipt.hypotheticalPlacementAssessment.units.find(unit=>unit.pieceId==='u_marine_2').unknownReason.includes('PLACEMENT_OVERLAP'));
let authority;
for(const file of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!file.endsWith('.json.gz'))continue;
  const source=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',file))));
  if(hash(source.authority.state)===receipt.sourceStateHash){authority=source.authority;break;}
}
assert.ok(authority);
const config=JSON.parse(await fs.readFile(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'),'utf8'));
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:receipt.laboratoryId,sourceRoomRef:receipt.sourceRoomRef,
  sourceState:authority.state,matchBinding:authority.matchBinding,armyBuilderPort:builder,
  rulesRuntime:createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})})});
function restore(stateHash){
  if(stateHash===receipt.sourceStateHash)return;
  const value=branches.get(stateHash);assert.ok(value);restore(value.receipt.parentStateHash);
  if(value.receipt.formationSelection)lab.restoreFormationSelectionBranch({receipt:value.receipt,base:value.request.base});
  else lab.restoreHypotheticalBranch({receipt:value.receipt,spec:value.request.spec,base:value.request.base});
}
restore(receipt.parentStateHash);
const result=lab.runFormationSelectionBranch({branchId:'actual47-reassessment-proof',base:selected.request.base,
  selections:selected.request.selections.map(selection=>({receipt:values.get(selection.sourceWorkId).receipt,formationOptionId:selection.formationOptionId}))});
const marine=result.hypotheticalPlacementAssessment.units.find(unit=>unit.pieceId==='u_marine_2');
assert.equal(marine.resultStatus,'ok','unmoved unit must be rechecked after its blocker moves');
assert.equal(result.hypotheticalPlacementAssessment.units.find(unit=>unit.pieceId==='player2-queen').resultStatus,'unknown','incomplete packing must not be promoted');
assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
// The production owner may legitimately advance workflow.json concurrently.
// This diagnostic never writes it; check its actual immutable fixture instead.
assert.equal(hash(await fs.readFile(path.join(base,'artifacts',sourceWork.resultRef+'.json'),'utf8')),hash(originalTool));
console.log(JSON.stringify({pass:true,unselectedMarineReassessed:true,incompleteQueenRetained:true,providerCalls:0,productionWrites:0}));
