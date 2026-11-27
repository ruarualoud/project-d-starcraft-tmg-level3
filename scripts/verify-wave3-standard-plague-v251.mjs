import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir=base+'/standard-plague-v251';
const version='2.51.0', target='spec_ops_marauder__marauder_', caster='defiler', other='ally';
const sacrifice=process.argv.includes('--sacrifice');
const branch=sacrifice?'sacrifice':'card', out=dir+'/'+branch, roomId='standard-plague-v251-'+branch;
const coordinate={xMilliInches:20000,yMilliInches:8000};
const bm=sacrifice?3:1;
const plagueId='unit:defiler/plague-assault-phase@1';
async function opening() {
  try {return await read(dir+'/opening.json');} catch(e){if(e.code!=='ENOENT') throw e;}
  const parent=await read(base+'/standard-defiler-mound-v249/opening.json');
  const context=await resolveWave3StandardContext(await read(parent.manifestRef),'area_ability_inputs');
  const recipes=structuredClone(parent.recipes);
  recipes.player2.units.find(p=>p.unitInstanceId===caster).upgradeNames.push('Plague');
  const {state}=prepareOfficialStandardReleaseOpeningV2({releaseContext:context,releaseMatchVersion:version,
    snapshot:context.snapshot,dataset:context.dataset,recipes,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:parent.mission,deploymentRecordKey:parent.deployment});
  assert(state.officialConsumePaymentPolicy.activeAbilityPayment);
  assert.equal(state.officialBlastTemplateGeometryAsset.assetHash,context.manifest.components.blastTemplateGeometry.integrity.value);
  assert(!state.officialSiegeModeDataBundle);
  const record={version,manifestRef:parent.manifestRef,recipes,state};
  await save(dir+'/opening.json',record);
  return record;
}
function arrange(state) {
  for(const [id,coords] of Object.entries({[caster]:[[12,8]],[other]:[[16.65,8]],[target]:[[20.2,8],[22.25,8]]})){
    const p=state.pieces.find(p=>p.id===id);
    assert.equal(coords.length,p.models.length);
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',
      leadingModelId:p.models[0].id,xInches:coords[0][0],yInches:coords[0][1]});
    coords.forEach(([xInches,yInches],i)=>Object.assign(p.models[i],{isOnField:true,xInches,yInches}));
    state.reserveManifestBySide[p.sideKey].find(r=>r.pieceId===id).deploymentStatus='deployed';
  }
  Object.assign(state,{stage:'activation_phases',phase:'assault',activeSideKey:'player2',firstPlayerSideKey:'player2'});
  state.phaseFirstActorByRound['1:assault']={round:1,phase:'assault',chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'standard-plague-v251'});
  state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
}

let native, revision;
try{
  const start=await opening(), scenario={declaredPositionsAndAssault:true,branch,twoHumanSeats:true};
  const bound=await bindWave3StandardActionRoom({manifestRef:start.manifestRef,initial:start.state,dir:out,candidateVersion:version,scenario});
  const root=structuredClone(start.state);
  arrange(root);
  const auth=bound.authorityFor(root,scenario);
  native=bound.open();
  const seats=await native.create(roomId,auth);
  for(;;){
    const {envelope,stateRevision}=await native.store.loadRoom(roomId);
    revision=stateRevision;
    assert(revision<=3);
    const state=envelope.state,side=state.activeSideKey;
    const menu=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.message);
    const domains=menu.legalSpace.parameterDomains, finite=menu.legalSpace.finiteActions;
    const history=state.officialPlagueUseHistory??[];
    const casts=domains.filter(d=>d.actionType==='cast_plague');
    await save(out+'/menu-r'+revision+'.json',{revision,stateHash:envelope.stateHash,side,phase:state.phase,
      domains:domains.map(d=>({type:d.actionType,weapon:d.weaponName,piece:d.pieceId,id:d.definitionId})),finite:finite.map(c=>c.action.actionType)});
    if(!history.length){
      assert.deepEqual(casts.map(d=>d.pieceId),[caster]);
      assert.throws(()=>bound.runtime.queryPlagueCoverage(state,other,coordinate,bm),/ABILITY_NOT_SELECTED/);
      assert.throws(()=>bound.runtime.queryPlagueCoverage(state,caster,coordinate,4),/BIOMASS_CHOICE/);
      const coverage=bound.runtime.queryPlagueCoverage(state,caster,coordinate,bm);
      assert(!coverage.mutationAuthority&&!coverage.paymentCommitted);
      assert.deepEqual(coverage.batches.map(b=>b.targetPieceId).sort(),[other,target].sort());
      const cards=sacrifice?coverage.payment.consumeCardPayments[0]:coverage.payment.cardOnlyPayments[0];
      assert(cards,'a legal source-bound payment must be available');
      const parameters={coordinate,biomassToSpend:bm,paymentCardInstanceIds:cards.cardInstanceIds};
      if(sacrifice){
        const victim=coverage.payment.sacrifices.find(v=>v.pieceId===caster);
        assert(victim);
        Object.assign(parameters,{sacrificePieceId:caster,sacrificeModelId:victim.modelIds[0]});
      }
      assert.throws(()=>bound.runtime.queryPlagueCast(state,caster,{coordinate,biomassToSpend:bm,paymentCardInstanceIds:['absent-card']}),/PAYMENT/);
      const preview=bound.runtime.queryPlagueCast(state,caster,parameters);
      assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,envelope.stateHash);
      await save(out+'/coverage-and-payment.json',{revision,coverage,parameters,previewHash:preview.queryReceiptHash});
      const applied=await native.commit({roomId,credential:seats[side],operationKey:'cast',select:d=>d.domainId===casts[0].domainId,parameters:()=>parameters});
      assert.deepEqual(applied.preview.core.action.sourceAction,preview.result.action);
      continue;
    }
    assert.equal(history.length,1);
    const [use]=history;
    assert.equal(use.biomassToSpend,bm);
    assert.equal(use.sourceDefinitionId,plagueId);
    assert.equal(use.sourceDestroyedByPayment,sacrifice);
    assert(!casts.length);
    const paid=await read(out+'/coverage-and-payment.json');
    for(const id of paid.parameters.paymentCardInstanceIds){
      assert.equal(state.cardResources.player2.find(c=>c.cardInstanceId===id).readiness,'exhausted');
    }
    const hits=use.resolutions.map(r=>{
      const current=state.pieces.find(p=>p.id===r.targetPieceId);
      assert.equal(current.currentModels,root.pieces.find(p=>p.id===r.targetPieceId).currentModels);
      assert.equal(current.damageMarker,r.nonLethal.postDamageMarker);
      assert.equal(r.hitThreshold,6-bm);
      return {piece:r.targetPieceId,dice:r.dice,hits:r.hits,evaded:r.evaded,damage:current.damageMarker};
    });
    assert.deepEqual(hits.map(h=>h.piece).sort(),[other,target].sort());
    if(side==='player2'){
      const finish=domains.find(d=>d.actionType==='finish_activation')??finite.find(c=>c.action.actionType==='finish_activation');
      assert(finish,'caster must be able to close its own activation');
      const input=finish.actionKey?{kind:'finite',select:c=>c.actionKey===finish.actionKey}:{select:d=>d.domainId===finish.domainId,parameters:()=>({})};
      await native.commit({roomId,credential:seats[side],operationKey:'finish-caster',...input});
      continue;
    }
    assert.equal(side,'player1');
    assert(domains.length||finite.length);
    const cold=bound.open();
    try{
      await cold.restoreDependencies(roomId,auth);
      const journal=await cold.store.loadReplayBundle(roomId);
      const receipts=journal.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
      const replay=cold.engine.replay({initialEnvelope:journal.initialEnvelope,journal:receipts});
      assert(replay.ok,replay.reason);
      assert.deepEqual(replay.envelope,envelope);
      assert.equal(receipts.length,revision);
      await save(out+'/result.json',{roomId,branch,bm,hits,sourceDestroyedByPayment:use.sourceDestroyedByPayment,
        sourcePlanHash:use.sourcePlanHash,successorSide:side,receipts:receipts.length,coldExact:true,modelCalls:0});
    }finally{cold.close();}
    break;
  }
}catch(error){
  await save(out+'/stop-'+Date.now()+'.json',{revision,code:error.code,message:error.message,stack:error.stack?.split('\n').slice(0,4)});
  throw error;
}finally{native?.close();}
