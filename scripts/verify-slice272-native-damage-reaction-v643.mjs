// Concrete P3 regression: the current ranged action must offer the same
// damage-received reaction that its own source-owned reaction adapter permits.
// Frozen local data only; no Provider, room, network, RNG or source writes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {resolveOfficialDevelopmentTrancheFixtureRootV1,
  loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialUnitCompositionUpgradeDataBundleV1} from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialReactionFamilyAdapterV1,
  openOfficialReactionFamilyWindowV1} from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import {hashStarcraftTmgContract} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'build/slice272-projection-owner-v565-inlKbk/workspace/laboratory-sources/e53764ac557e7a1a25d8d346db53d9a6c9f97ace76e4eb00a627fbe22599dfba.json.gz');
const frozenState=JSON.parse(gunzipSync(await readFile(file))).authority.state;
const frozenHash=hashStarcraftTmgContract(frozenState);
// Runtime construction composes its private state; never lend it the original.
const sourceState=structuredClone(frozenState);
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root:await resolveOfficialDevelopmentTrancheFixtureRootV1({root})});
const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:sourceState})});
const sourceHash=hashStarcraftTmgContract(sourceState);
let state;
const observingRuntime={...runtime,enumerate(current,options){
  state=structuredClone(current);return runtime.enumerate(current,options);
}};
const lab=createPregameSceneLaboratoryV1({laboratoryId:'native-damage-reaction-regression-v643',
  sourceState,rulesRuntime:observingRuntime,armyBuilderPort:createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle:createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})})});
const positions=(id,xy)=>sourceState.pieces.find(p=>p.id===id).models.filter(m=>!m.isDestroyed)
  .map((m,i)=>({modelId:m.id,xInches:xy[i][0],yInches:xy[i][1]}));
const scene=lab.runScenarioBranch({branchId:'conditional-local-exchange',spec:{
  kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player2',clearTerrain:true,
  isolateToPlacedPieces:true,placements:[
    {pieceId:'player2-queen',xInches:14,yInches:14},
    {pieceId:'u_marine_1',xInches:19.5,yInches:15.5,modelPositions:positions('u_marine_1',
      [[19.5,15.5],[18,14],[19.5,14],[21,14],[18,15.5],[21,15.5]])},
    {pieceId:'u_medic_1',xInches:19.5,yInches:18,modelPositions:positions('u_medic_1',
      [[19.5,18],[18,18],[21,18]])},
  ]}});
assert.equal(scene.resultStatus,'ok');
assert(scene.hypotheticalPlacementAssessment.units.every(p=>
  p.staticGeometry.nativeStaticGeometryStatus==='passed'));
lab.describeQueryContext({base:{kind:'branch',branchStateHash:scene.branchStateHash},seatKey:'player2'});
const domain=runtime.enumerate(state,{sideKey:'player2'}).parameterDomains.find(d=>
  d.parameterKind==='official_selected_roster_ranged_target_v1'
    && d.pieceId==='player2-queen' && d.weaponName==='Talons');
assert(domain,'conditional local attack must be currently legal');
const action=runtime.instantiate(state,domain,{targetUnitId:'u_marine_1'}).action;
const sourceActionHash=hashStarcraftTmgContract(action);
const adapter=createOfficialReactionFamilyAdapterV1(state.officialReactionFamilySourceBundle);
const opened=openOfficialReactionFamilyWindowV1(state.officialReactionFamilySourceBundle,state,{
  triggerKind:'damage_received',activeSideKey:'player2',phase:'assault',
  activationId:'1:assault:player2:player2-queen',sourceActionHash,
  context:{attackerPieceId:'player2-queen',actorPieceId:'player2-queen',targetPieceId:'u_marine_1',
    affectedPieceId:'u_marine_1',validTargetUnitIds:['u_marine_1'],enemyReactionAllowed:true}});
const pass=adapter.legalSpace(opened.state,{sideKey:'player2'}).parameterDomains.find(d=>
  d.actionType==='pass_reaction_family_window');
const afterPass=adapter.apply(opened.state,{action:adapter.preview(opened.state,{domain:pass,parameters:{}}).action});
const expected=adapter.legalSpace(afterPass.state,{sideKey:'player1'}).parameterDomains.filter(d=>
  d.abilityName==='Life Support');
assert(expected.length>0,'fixture must have an actual in-range and payable Life Support choice');
const chance=action.chance;
assert(chance?.layout,'Native must supply its own dice contract');
const reveals=Array.from({length:chance.count},(_,i)=>i<chance.layout.hit+chance.layout.surge?6:1);
const result=runtime.apply(state,action,{chanceReveals:reveals});
const proof={sourceHash,branchStateHash:scene.branchStateHash,expectedReactionChoices:expected.length,
  nativeChance:chance,conditionalReveals:reveals,
  nativeEvents:result.events.map(e=>e.type),
  pendingReaction:result.state.pendingOfficialReactionWindow?.triggerKind??null,
  pendingCasualty:!!result.state.pendingCurrentProductRangedCasualtyChoice,
  incomingDamage:result.state.pendingCurrentProductRangedCasualtyChoice?.casualtyDomain?.incomingDamage??null,
  sourceUnchanged:sourceHash===hashStarcraftTmgContract(sourceState),providerCalls:0,
  frozenInputUnchanged:frozenHash===hashStarcraftTmgContract(frozenState),
  liveRoomMutations:0,trainingTruth:false};
console.log(JSON.stringify(proof));
assert.equal(proof.pendingReaction,'damage_received',
  'current Native attack skipped the legal damage reaction before casualty allocation');
assert.equal(proof.pendingCasualty,false,'casualties must await the optional damage reaction');
assert.equal(proof.sourceUnchanged,true);
assert.equal(proof.frozenInputUnchanged,true);

function finishReaction(start,useMedic) {
  let current=structuredClone(start);
  const choices=[];
  while (current.pendingOfficialReactionWindow) {
    const window=current.pendingOfficialReactionWindow;
    const sideKey=window.prioritySideKeys[window.priorityIndex];
    const domains=runtime.enumerate(current,{sideKey}).parameterDomains;
    assert(domains.every(d=>d.sourceDomain?.executorId==='official-reaction-family-adapter-v1'),
      'ordinary movement/attack/ability must not leak into a reaction choice');
    const chosen=sideKey==='player1'&&useMedic
      ? domains.find(d=>d.abilityName==='Life Support'&&d.sourceInstanceId==='u_medic_1'
        && d.parameterSchema.paymentCardInstanceIds.const.join(',')==='faction:player1')
      : domains.find(d=>d.actionType==='pass_reaction_family_window');
    assert(chosen,'each declared choice must be Native legal');
    const parameters=chosen.actionType==='pass_reaction_family_window'?{}
      : {paymentCardInstanceIds:chosen.parameterSchema.paymentCardInstanceIds.const};
    const a=runtime.instantiate(current,chosen,parameters).action;
    const next=runtime.apply(current,a);
    choices.push({sideKey,ability:chosen.abilityName||'pass',events:next.events.map(e=>e.type)});
    // A real cold-storage round trip, including the interrupted attack/dice.
    current=JSON.parse(JSON.stringify(next.state));
  }
  assert(!current.pendingCurrentProductRangedDamageReaction,'closed reaction must resume the saved attack');
  const pending=current.pendingCurrentProductRangedCasualtyChoice;
  assert(pending,'this fixture must still ask the defender which models die');
  const pool=pending.casualtyDomain.damagePoolReduction;
  const d=runtime.enumerate(current,{sideKey:'player1'}).parameterDomains.find(d=>
    d.parameterKind==='official_selected_roster_ranged_casualty_selection_v1');
  assert(d,'casualty selection must be exposed only after reaction closure');
  const parameters={casualtySelectionHash:d.parameterSchema.casualtySelectionHash.enum[0]};
  const settled=runtime.apply(current,runtime.instantiate(current,d,parameters).action);
  assert(!settled.state.pendingOfficialReactionWindow,'casualty selection must not reopen or repay reaction');
  assert.equal(settled.state.officialReactionHistory?.length||0,useMedic?1:0);
  assert.deepEqual(pending.chanceReveals,reveals,'recovery must preserve the original dice');
  return {choices,pool,casualties:pending.casualtyDomain.casualtyCount,
    remainingModels:settled.state.pieces.find(p=>p.id==='u_marine_1').currentModels,
    resourceReadiness:settled.state.cardResources.player1.find(c=>c.cardInstanceId==='faction:player1').readiness,
    eventTypes:settled.events.map(e=>e.type)};
}
const without=finishReaction(result.state,false);
const withMedic=finishReaction(result.state,true);
assert.equal(without.pool.appliedReduction,0);
assert.equal(withMedic.pool.appliedReduction,3,'all three in-range Medic models use Native Life Support');
assert.equal(withMedic.pool.totalDamageAfterReduction,5);
assert(withMedic.remainingModels>without.remainingModels,'the exact same roll must yield a real local survival benefit');
assert.equal(withMedic.resourceReadiness,'exhausted');
assert.equal(without.resourceReadiness,'ready');
console.log(JSON.stringify({status:'passed',without,withMedic,providerCalls:0,liveRoomMutations:0,
  expectedValueOrStrategySuperiorityProven:false,trainingTruth:false}));
