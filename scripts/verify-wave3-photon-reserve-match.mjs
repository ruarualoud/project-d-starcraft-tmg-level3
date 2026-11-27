import {identifyPhotonReserveEntryV1} from '../packages/product-composition/official-photon-overcharge-entry-v1.mjs';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';
import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

import { createOfficialRelocationFamilyAdapterV1 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const roomId='photon-reserve-on-human-map-299', dir=base+'/'+roomId;
if(process.argv.includes('--entry-kinds')){
  const prefix='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-pylon-native-entry-component';
  const [before,after,receipt]=await Promise.all(['-start.json','-after.json','.public.json'].map(s=>read(prefix+s)));
  const events=receipt.actionEvents;
  const real=identifyPhotonReserveEntryV1(before,{state:after,events},{});
  assert(real && real.event.entrySource.definitionId==='unit:pylon/warp-conduit-movement-phase@1');
  const ordinary=events.map(({entrySource,...e})=>e);
  assert.equal(identifyPhotonReserveEntryV1(before,{state:after,events:ordinary},{}),null);
  assert.equal(identifyPhotonReserveEntryV1(after,{state:after,events},{}),null);
  await save(dir+'/entry-kinds.public.json',{pylonReported:true,entrySource:real.event.entrySource,
    ordinaryEdgeControl:false,alreadyOnFieldControl:false,scope:'original Pylon transition and two isolated negatives',providerCalls:0});
} else {
const opening=await read(base+'/openings/raiders-2.91.0.public.json');
assert(opening.admitted);
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const manifest=await read(setup.releaseRef);
const recipes=structuredClone(opening.recipes);
recipes.player1.units.push({...recipes.player2.units[0],unitInstanceId:'anchor'});
recipes.player2={factionRecordKey:'tactical_cards:khalai',tacticalCardRecordKeys:['tactical_cards:overcharged_nexus'],units:[{unitInstanceId:'zealot',recordKey:'army_units:zealot',compositionKind:'small',upgradeNames:[]}]};
const scene={condition:'Round two Movement, a friendly Marine squad on the board, Raiders in reserve.',
  positions:{anchor:[12,8]},formationOffsets:{anchor:[[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0]]}};
const reference={recipes,manifestHash:manifest.manifestHash,manifestRef:setup.releaseRef,compareReadOnlyAdmission:true,
  mission:setup.missionRecordKey,deployment:setup.deploymentRecordKey};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:'2.99.0',scene,mapConfiguration:wave3HumanMapConfiguration(setup)});
const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,candidateVersion:'2.99.0',scenario:scene});
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
  else start=(await native.store.loadInitialEnvelope(roomId)).state;
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
      const placement=menu.parameterDomains.find(d=>d.abilityName==='Rapid Reinforcements');
      assert(placement,'reserve deployment must remain selectable');
      const src=placement.sourceDomain??placement;
      assert(src.parameterSchema.anchorPieceId.enum.includes(anchor.id));
      const witnessRef=dir+'/placement-at-start.public.json';
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
      const history=state.log.flatMap(r=>r.events??[]);
      const done=history.find(e=>e.type==='automatic_hits_damage' && e.sourceDefinitionId==='card:overcharged_nexus/photon-overcharge-any@1');
      if(done && !state.pendingOfficialPhotonOvercharge) {
        assert.equal(done.targetId,actor.id);
        const receipt=state.officialReactionResolutionHistory.flatMap(r=>r.effects).find(e=>e.definitionId==='card:overcharged_nexus/photon-overcharge-any@1');
        assert.equal(receipt.automaticHits,3);assert.equal(receipt.damagePerHit,1);
        assert.equal(state.activeSideKey,'player2');
        const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
        await save(dir+'/result.public.json',{roomId,revision,actions,target:actor.id,hits:3,damagePerHit:1,damage:done.stages,
          stateHash:head.stateHash,nextSide:state.activeSideKey,coldExact:true,providerCalls:0}); break;
      }
      assert(revision<15,'photon did not settle');
      const ds=menu.parameterDomains;
      const d=ds.find(d=>d.definitionId==='card:overcharged_nexus/photon-overcharge-any@1')
        ?? ds.find(d=>d.actionType==='pass_reaction_family_window')
        ?? ds.find(d=>['choose_automatic_hits_tough_armour','resolve_automatic_hits_evade_pool','choose_automatic_hits_casualties'].includes(d.actionType));
      const f=menu.finiteActions.find(f=>['resolve_automatic_hits','roll_automatic_hits_armour_pool',
        'resolve_automatic_hits_evade_pool','prepare_automatic_hits_armour_pool'].includes(f.action?.actionType));
      assert(d||f,'native hits/reaction successor missing at '+revision+' '+JSON.stringify(menu.finiteActions.map(f=>f.action?.actionType)));
      await native.commit({roomId,credential,operationKey:'photon-'+revision,...(d?{select:q=>q.domainId===d.domainId,
        parameters:()=>poolParameters(d)}
        :{kind:'finite',select:q=>q.actionKey===f.actionKey})});
    }
  }
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:e.message});throw e;}finally{native.close();}
}
