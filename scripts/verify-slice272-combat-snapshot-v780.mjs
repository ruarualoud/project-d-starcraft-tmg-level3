// Concrete bug: the hypothetical combat laboratory applies non-engaged MOVE
// clearance to an already positioned combat snapshot. No provider or game run.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {evaluateOfficialCoherencyPlacementV1} from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {findCompletedRosterSpatialObservationV1} from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';

const run=path.resolve(process.argv[2]);
const remainingOnly=process.argv.includes('--remaining-only');
let authority;
for(const f of await fs.readdir(path.join(run,'workspace/laboratory-sources'))){
  if(!f.endsWith('.json.gz'))continue;
  const saved=JSON.parse(gunzipSync(await fs.readFile(path.join(run,'workspace/laboratory-sources',f))));
  if(hash(saved.authority.state)==='a70c5ae3cad610092b9185831193b8f9dfdf7a92977f1273040a9c492b0daef9'){
    authority=saved.authority;break;
  }
}
assert(authority,'same frozen production source required');
const originalHash=hash(authority);
const config=JSON.parse(await fs.readFile('build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json','utf8'));
const fixture=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:config.fixtureRoot});
const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:fixture.dataset,state:structuredClone(authority.state)})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'v780-contact-snapshot',sourceRoomRef:{roomId:'frozen-source',stateRevision:0},
  sourceState:authority.state,matchBinding:authority.matchBinding,rulesRuntime:runtime,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:fixture.dataset})})});
const raptor=authority.state.pieces.find(p=>p.id==='player2-raptor');
const marine=authority.state.pieces.find(p=>p.id==='marine-1');
assert.equal(raptor.models.length,18);assert.equal(marine.models.length,9);
const hex=[];
for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)if(Math.abs(q+r)<=2)hex.push({q,r});
hex.sort((a,b)=>(Math.abs(a.q)+Math.abs(a.r)+Math.abs(a.q+a.r))-(Math.abs(b.q)+Math.abs(b.r)+Math.abs(b.q+b.r)));
// Explicit fixture hypothesis only: complete real units, open field, no route
// or arrival claim. First model is leader; every actual model remains present.
const placements=[{pieceId:raptor.id,modelPositions:raptor.models.map((m,i)=>({modelId:m.id,
  xInches:15+1.3*(hex[i].q+hex[i].r/2),yInches:15+1.3*Math.sqrt(3)/2*hex[i].r}))},
  {pieceId:marine.id,modelPositions:marine.models.map((m,i)=>({modelId:m.id,xInches:19+1.3*(i%3),yInches:15+1.3*Math.floor(i/3)}))}];
const spec={kind:'hypothetical_geometry',phase:'combat',activeSideKey:'player2',clearTerrain:true,isolateToPlacedPieces:true,placements};
const branch=lab.runScenarioBranch({branchId:'contact',spec});
console.log(JSON.stringify({stage:'complete_contact_snapshot',units:branch.hypotheticalPlacementAssessment.units}));
const base={kind:'branch',branchStateHash:branch.branchStateHash};
let probability,formation;
if(!remainingOnly){
assert(branch.hypotheticalPlacementAssessment.units.every(u=>u.resultStatus==='ok'),
  'complete non-overlapping contact snapshot must not require non-engaged movement clearance');
assert.equal(branch.rulesLifecycleTransitionsApplied,0);
assert.equal(branch.hypotheticalPlacementAssessment.placementLegalityProven,false);
const context=lab.describeQueryContext({base,seatKey:'player2'});
const domain=context.actionSpace.parameterDomains.find(d=>d.pieceId===raptor.id&&d.actionType==='fight');
assert(domain,'same product Native must expose a fight for the validated snapshot');
const parameters={closeRanksMode:'decline',allocations:[{targetUnitId:marine.id,dice:domain.constraints.declineCloseRanksAttackDice}],
  ...Object.fromEntries(['surgeTargetUnitId','criticalTargetUnitId'].filter(k=>domain.parameterSchema.required.includes(k)).map(k=>[k,marine.id]))};
probability=await lab.queryProbability({queryId:'one-melee-response',base,attackerUnitId:raptor.id,targetUnitId:marine.id,
  domainId:domain.domainId,parameters,sampleBudget:36});
assert.equal(probability.resultStatus,'ok',JSON.stringify(probability));
assert(probability.estimate.expectedDamage>0&&probability.estimate.lossStateCount>0);
formation=await lab.queryScene({queryId:'contact-formation',base,seatKey:'player1',queryKind:'space.solve_static_formation',
  arguments:{unitId:marine.id,anchors:[{xInches:19,yInches:15}]}});
assert.equal(formation.resultStatus,'ok');
assert(formation.queryReceipt.result.optionCount>0,'static search must support the same contact snapshot semantics');
assert.equal(formation.queryReceipt.result.arrivalOrMovementLegalityProven,false);
}
// v781 minimisation showed the original joint-only test anchor x19 overlapped
// the solver's x17.84 Raptor base by 0.10in. Native correctly rejected it.
// x19.2 is still engaged but non-overlapping. This is a fixture correction,
// not a production anchor chosen by the Host or a relaxed collision rule.
const joint=await lab.queryScene({queryId:'joint-contact-formation',base,seatKey:'player2',queryKind:'space.solve_static_formation',
  arguments:{unitId:raptor.id,anchors:[{xInches:15,yInches:15}],jointUnits:[{unitId:marine.id,anchors:[{xInches:19.2,yInches:15}]}],maximumJointEvaluations:2,maximumJointOptions:1}});
assert.equal(joint.resultStatus,'ok');assert(joint.queryReceipt.result.optionCount>0,JSON.stringify(joint.queryReceipt.result));
assert.equal(joint.queryReceipt.result.formationOptions[0].nativeGeometryResults.length,2);
// Live non-engaged placement remains strict: reconstruct only this negative
// assertion's snapshot; the positive probability path above used public lab APIs.
const projected=structuredClone(authority.state);projected.board.terrain=[];
for(const p of projected.pieces){const placed=placements.find(x=>x.pieceId===p.id);p.isOnField=!!placed;
  for(const m of p.models){m.isOnField=!!placed;if(placed)Object.assign(m,placed.modelPositions.find(x=>x.modelId===m.id));}}
const actor=projected.pieces.find(p=>p.id===marine.id);
assert.throws(()=>evaluateOfficialCoherencyPlacementV1({state:projected,actor,dataBundle:projected.officialModelBaseGeometryDataBundle,
  plan:{planId:'live-placement-remains-strict',leadingModelId:actor.models[0].id,placements:actor.models.map(m=>({modelId:m.id,
    xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)}))}}),/MODEL_BASE_GEOMETRY_ENEMY_SEPARATION_REQUIRED/);
const overlap=structuredClone(spec);Object.assign(overlap.placements[1].modelPositions[0],{xInches:15,yInches:15});
const bad=lab.runScenarioBranch({branchId:'overlap-rejected',spec:overlap});
assert(bad.hypotheticalPlacementAssessment.units.some(u=>u.unknownReason?.startsWith('MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP')));
const outside=structuredClone(spec);outside.placements[1].modelPositions[0].xInches=0;
const off=lab.runScenarioBranch({branchId:'base-edge-rejected',spec:outside});
assert(off.hypotheticalPlacementAssessment.units.some(u=>u.unknownReason==='MODEL_BASE_GEOMETRY_PLACEMENT_OUTSIDE_BATTLEFIELD'));
assert.equal(hash(authority),originalHash);assert.equal(lab.proveMutationZero().sourceStateMutationCount,0);
// Actual old zero-option receipt reproduced a second source defect: identical
// inputs across different lab implementations were treated as the same answer.
const root=path.join(run,'workspace/decision-workflows/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c');
const ref='83ea514d13b7c5c3ecf4c353418a21f53b32ae624d836684272b498fef4bac20';
const artifact=JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const work=state.work.find(w=>w.resultRef===ref),value=artifact.value;
const descriptor={sourceStateHash:value.receipt.sourceStateHash,rulesRuntimeHash:value.receipt.rulesRuntimeHash,
  builderBundleHash:value.receipt.builderBundleHash,version:lab.labDescriptor().version};
const input={store:{load:async()=>({work:[work]}),get:async()=>artifact},descriptor,
  args:value.request,contextRef:value.contextRef,scope:work.bindings};
assert.equal(await findCompletedRosterSpatialObservationV1(input),null,'old implementation result must not shadow a corrected query');
assert(await findCompletedRosterSpatialObservationV1({...input,descriptor:{...descriptor,version:value.receipt.laboratoryVersion}}),
  'same-version immutable evidence is still reusable');
console.log(JSON.stringify({pass:true,remainingOnly,priorPassedAssertionsNotRepeated:remainingOnly,sourceUnchanged:true,models:[18,9],nativeFight:remainingOnly?'passed_in_prior_run_not_repeated':true,
  expectedDamage:probability?.estimate.expectedDamage,lossStates:probability?.estimate.lossStateCount,
  staticFormationOptions:formation?.queryReceipt.result.optionCount,jointFormationOptions:joint.queryReceipt.result.optionCount,
  livePlacementStillStrict:true,oldCachePreservedButNotReusedAcrossVersions:true,
  overlapAndBaseBoundaryStillStrict:true,providerCalls:0,productionWrites:0,actionsApplied:0,
  proofScope:'one conditional combat snapshot; not movement/charge arrival or whole-match simulation'}));
