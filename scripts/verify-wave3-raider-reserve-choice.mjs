import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

import { createOfficialRelocationFamilyAdapterV1 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const roomId='raider-reserve-on-human-map', dir=base+'/'+roomId;
const opening=await read(base+'/openings/raiders-2.91.0.public.json');
assert(opening.admitted);
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const manifest=await read(setup.releaseRef);
const recipes=structuredClone(opening.recipes);
recipes.player1.units.push({...recipes.player2.units[0],unitInstanceId:'anchor'});
const scene={condition:'Round two Movement, a friendly Marine squad on the board, Raiders in reserve.',
  positions:{anchor:[12,8]},formationOffsets:{anchor:[[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0]]}};
const reference={recipes,manifestHash:manifest.manifestHash,manifestRef:setup.releaseRef,total:opening.definitions.length,
  mission:setup.missionRecordKey,deployment:setup.deploymentRecordKey};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:opening.version,scene,mapConfiguration:wave3HumanMapConfiguration(setup)});
const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,candidateVersion:opening.version,scenario:scene});
const native=bound.open();
let revision=0;
try {
  let start=initial;
  if (!await native.store.loadRoom(roomId)) {
    const begin=bound.runtime.enumerate(initial).candidates.find(c=>c.isEnabled&&c.actionType==='resolve_mission_start_of_round');
    start=structuredClone(bound.runtime.apply(initial,begin,{sideKey:initial.activeSideKey}).state);
    Object.assign(start,{round:2,phase:'movement',stage:'activation_phases',activeSideKey:'player1'});
    delete start.currentProductMatchLifecycle;
    start.phaseFirstActorByRound??={};
    start.phaseFirstActorByRound['2:movement']={round:2,phase:'movement',chosenFirstActorSideKey:'player1',markerHolderSideKey:start.firstPlayerSideKey};
    initializeOfficialMatchRoundSupplyV1(start,true);
  }
  const authority=bound.authorityFor(start,scene);
  const seats=await native.create(roomId,authority);
  for (;;) {
    const head=(await native.store.loadRoom(roomId)).envelope, state=head.state;
    revision=head.stateRevision;
    const credential=seats[state.activeSideKey];
    const menu=(await native.room.legalSpace({roomId,seatToken:credential.seatToken})).legalSpace;
    const actor=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:raynor_s_raider__marine_');
    const anchor=state.pieces.find(p=>p.id==='anchor');
    if(revision===0) {
      const stim=menu.parameterDomains.find(d=>d.abilityName==='Stimpack'&&d.pieceId===actor.id);
      assert(stim,'no reserve nomination for Stimpack: '+JSON.stringify(menu.parameterDomains.map(d=>[d.actionType,d.abilityName,d.pieceId])));
      assert(menu.parameterDomains.some(d=>d.abilityName==='Rapid Reinforcements'),'optional deployment without Stimpack');
      await native.commit({roomId,credential,operationKey:'nominate-and-stim',select:d=>d.domainId===stim.domainId,
        parameters:()=>({activeUnitId:actor.id,paymentCardInstanceIds:[]})});
    }else if(revision===1){
      assert.equal(actor.isInReserves,true);assert.equal(state.selectedRosterActivationWindow.pieceId,actor.id);
      const events=state.characteristicStatusAbilityHistory.at(-1).events;
      const cost=events.find(e=>e.type==='ability_resource_paid');
      assert.equal(cost.resourceCost,0);assert.equal(cost.printedResourceCost,1);assert.equal(cost.resourceCostReduction,1);
      assert(events.some(e=>e.type==='stimpack_resolved'));
      assert(!menu.parameterDomains.some(d=>d.abilityName==='Stimpack'));
      const placement=menu.parameterDomains.find(d=>d.abilityName==='Rapid Reinforcements');
      assert(placement,'reserve deployment must remain selectable');
      const src=placement.sourceDomain??placement;
      assert(src.parameterSchema.anchorPieceId.enum.includes(anchor.id));
      const witnessRef=dir+'/placement-at-r1.public.json';
      let witness;
      try { witness=await read(witnessRef); }
      catch(error) {
        if (error.code!=='ENOENT') throw error;
        const adapter=createOfficialRelocationFamilyAdapterV1(state.officialRelocationFamilySourceBundle);
        const request=adapter.legalSpace(state,{sideKey:state.activeSideKey}).parameterDomains.find(d=>d.abilityName==='Rapid Reinforcements');
        const placements=actor.models.map((m,i)=>({modelId:m.id,xMilliInches:8000+i%3*1380,
          yMilliInches:1000+Math.floor(i/3)*1380,rotationDegrees:0}));
        const parameters={leadingModelId:actor.models[1].id,anchorPieceId:anchor.id,anchorModelId:anchor.models[0].id,placements};
        adapter.preview(state,{domain:request,parameters});
        witness={revision,stateHash:head.stateHash,parameters};
        await save(witnessRef,witness);
      }
      assert.equal(witness.revision,revision);
      assert.equal(witness.stateHash,head.stateHash);
      const parameters=witness.parameters;
      await native.commit({roomId,credential,operationKey:'rapid-reinforcements',select:d=>d.domainId===placement.domainId,parameters:()=>parameters});
    }else{
      assert.equal(revision,2);assert.equal(actor.isOnField,true);assert.equal(actor.activatedPhases.movement,true);
      assert.equal(state.activeSideKey,'player2');
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
      await save(dir+'/result.public.json',{roomId,version:opening.version,releaseRef:setup.releaseRef,sourceManifest:manifest.manifestHash,revision,
        actions,spentCp:0,printedCp:1,damageMarker:actor.damageMarker,activationEnded:true,stateHash:head.stateHash,coldExact:true,providerCalls:0});
      break;
    }
  }
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:e.message});throw e;}finally{native.close();}
