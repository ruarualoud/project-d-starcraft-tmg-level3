// Reproduce the P3 production query silently ignoring an explicit reaction
// policy. Real frozen data, real scene service, real Rules; no model or room.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveOfficialDevelopmentTrancheFixtureRootV1,
  loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {hashStarcraftTmgContract} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'build/slice272-projection-owner-v565-inlKbk/workspace/laboratory-sources/e53764ac557e7a1a25d8d346db53d9a6c9f97ace76e4eb00a627fbe22599dfba.json.gz');
const original=JSON.parse(gunzipSync(await readFile(file))).authority.state;
const originalHash=hashStarcraftTmgContract(original);
const state=structuredClone(original);
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root:await resolveOfficialDevelopmentTrancheFixtureRootV1({root})});
const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state})});
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const lab=createPregameSceneLaboratoryV1({laboratoryId:'probability-reaction-policy-v644',
  sourceState:state,rulesRuntime:runtime,armyBuilderPort:builder});
const positions=(id,xy)=>state.pieces.find(p=>p.id===id).models.filter(m=>!m.isDestroyed)
  .map((m,i)=>({modelId:m.id,xInches:xy[i][0],yInches:xy[i][1]}));
const scene=lab.runScenarioBranch({branchId:'local-policy-comparison',spec:{
  kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player2',clearTerrain:true,
  isolateToPlacedPieces:true,placements:[{pieceId:'player2-queen',xInches:14,yInches:14},
    {pieceId:'u_marine_1',xInches:19.5,yInches:15.5,modelPositions:positions('u_marine_1',
      [[19.5,15.5],[18,14],[19.5,14],[21,14],[18,15.5],[21,15.5]])},
    {pieceId:'u_medic_1',xInches:19.5,yInches:18,modelPositions:positions('u_medic_1',
      [[19.5,18],[18,18],[21,18]])}]}});
assert(scene.hypotheticalPlacementAssessment.units.every(p=>
  p.staticGeometry.nativeStaticGeometryStatus==='passed'));
const base={kind:'branch',branchStateHash:scene.branchStateHash};
const menu=lab.describeQueryContext({base,seatKey:'player2'});
const domain=menu.actionSpace.parameterDomains.find(d=>d.pieceId==='player2-queen'&&d.weaponName==='Talons');
assert(domain);
const definitionId=state.officialReactionFamilySourceBundle.routes.find(r=>
  r.abilityName==='Life Support'&&r.recordKey==='army_units:medic').definitionId;
const pass=sideKey=>({sideKey,choiceKind:'pass',definitionId:null,sourceInstanceId:null,paymentCardInstanceIds:[]});
const choices=[pass('player2'),{sideKey:'player1',choiceKind:'reaction',definitionId,
  sourceInstanceId:'u_medic_1',paymentCardInstanceIds:['faction:player1']}];
const args={base,attackerUnitId:'player2-queen',targetUnitId:'u_marine_1',domainId:domain.domainId,sampleBudget:36};
const selected=await lab.queryProbability({...args,queryId:'selected-policy',damageReactionChoices:choices});
console.log(JSON.stringify({stage:'selected_policy',status:selected.resultStatus,
  reason:selected.unknownReason,policy:selected.estimate?.damageReactionPolicy??null,
  expectedCasualties:selected.estimate?.outcomes.expectedCasualties}));
assert.equal(selected.resultStatus,'ok');
assert.equal(selected.estimate.damageReactionPolicy?.status,'native_explicit_policy_applied',
  'the production probability query silently ignored the requested Life Support policy');
const baseline=await lab.queryProbability({...args,queryId:'baseline-policy',
  damageReactionChoices:[pass('player2'),pass('player1')]});
assert.equal(baseline.resultStatus,'ok');
assert.equal(selected.estimate.outcomeSampleHash,baseline.estimate.outcomeSampleHash,
  'policy comparisons must retain identical raw dice samples');
assert(selected.estimate.outcomes.expectedCasualties<baseline.estimate.outcomes.expectedCasualties);
assert(selected.estimate.damageReactionPolicy.expectedResourcePayments.some(r=>
  r.sideKey==='player1'&&r.resourceType==='CP'&&r.expectedCost>0));
const unavailable=await lab.queryProbability({...args,queryId:'unavailable-policy',
  damageReactionChoices:[choices[0],{...choices[1],sourceInstanceId:'not-a-current-unit'}]});
assert.equal(unavailable.resultStatus,'unknown','invalid source cannot become zero support benefit');
assert.match(unavailable.unknownReason,/DAMAGE_REACTION_CHOICE_NOT_IN_CURRENT_OPPORTUNITIES/);
const after=lab.describeQueryContext({base,seatKey:'player2'});
assert.deepEqual(after.cardResources,menu.cardResources,'queries must not spend real source cards');
assert.deepEqual(after.availableUnits,menu.availableUnits,'queries must not apply casualties to the scene');
assert.equal(hashStarcraftTmgContract(original),originalHash);
console.log(JSON.stringify({status:'passed',baseline:baseline.estimate.outcomes,
  withSupport:selected.estimate.outcomes,policy:selected.estimate.damageReactionPolicy,
  sameRawSamples:true,sourceUnchanged:true,providerCalls:0,liveRoomMutations:0,
  strategicPurchaseSuperiorityProven:false,trainingTruth:false}));
