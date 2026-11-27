import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { projectOfficialChargeSpeedDebuffV1, OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID } from '../packages/rule-atoms/official-charge-speed-debuff-policy-v1.mjs';

const base='build/ticket-28-wave3-human-lobby-v1/remaining-six';
const source=await read(base+'/openings/marauder-2.90.0.public.json');
assert.equal(source.admitted,true);
const ref=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json');
const roomId='standard-marauder-concussive-unengaged', dir=base+'/'+roomId;
const scene={positions:{marauder:[12,8],marine:[23,8]},
  formationOffsets:{marine:[[0,0],[-1,-1],[0,-1],[1,-1],[-1,0],[1,0]]},
  condition:'First-round Assault, Marine declares against Marauder.'};
const reference={...ref,recipes:source.recipes,total:source.definitions.length,manifestHash:source.manifestHash};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:source.version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:source.version,scenario:scene});
const native=bound.open();
let revision;
try {
  let start=initial;
  if (!await native.store.loadRoom(roomId)) {
    const open=bound.runtime.enumerate(initial).candidates.find(c=>c.isEnabled&&c.actionType==='resolve_mission_start_of_round');
    assert(open);
    start=structuredClone(bound.runtime.apply(initial,open,{sideKey:initial.activeSideKey}).state);
    Object.assign(start,{phase:'assault',stage:'activation_phases',activeSideKey:'player2'});
    delete start.currentProductMatchLifecycle;
    start.phaseFirstActorByRound??={};
    start.phaseFirstActorByRound[start.round+':assault']={round:start.round,phase:'assault',chosenFirstActorSideKey:'player2',markerHolderSideKey:start.firstPlayerSideKey};
    initializeOfficialMatchRoundSupplyV1(start,true);
  }
  const authority=bound.authorityFor(start,scene);
  const seats=await native.create(roomId,authority);
  for(;;) {
    const head=(await native.store.loadRoom(roomId)).envelope,state=head.state;
    revision=head.stateRevision;
    const side=state.activeSideKey, credential=seats[side];
    const menu=(await native.room.legalSpace({roomId,seatToken:credential.seatToken})).legalSpace;
    const marine=state.pieces.find(p=>p.id==='marine');
    const marauder=state.pieces.find(p=>p.id==='marauder');
    if(revision===0){
      const parameters={leadingModelId:marine.models[0].id,targets:[{unitId:marauder.id,modelId:marauder.models[0].id}]};
      await native.commit({roomId,credential,operationKey:'charge',select:d=>d.actionType==='charge'&&d.pieceId===marine.id,parameters:()=>parameters});
    }else if(revision===1){
      assert.equal(side,'player1');
      assert.equal(state.pendingOfficialChargeDeclaration.stage,'reaction');
      await native.commit({roomId,credential,operationKey:'react',select:d=>d.abilityName==='Concussive Shells',
        parameters:d=>({paymentCardInstanceIds:d.sourceDomain.parameterSchema.paymentCardInstanceIds.const})});
    }else if(revision===2){
      assert.equal(projectOfficialChargeSpeedDebuffV1(state,marine).speedPenalty,2);
      assert.equal(state.pendingOfficialChargeDeclaration.stage,'ready');
      await native.commit({roomId,credential,operationKey:'roll',kind:'finite',choice:{actionType:'roll_declared_charge'}});
    }else{
      assert.equal(revision,3);
      const pending=state.pendingAction;
      const debuff=projectOfficialChargeSpeedDebuffV1(state,marine);
      assert.equal(debuff.speedPenalty,2);
      assert(marine.officialAbilityEffects.some(e=>e.sourceDefinitionId===OFFICIAL_CONCUSSIVE_SHELLS_DEFINITION_ID));
      assert.equal(pending.stage,'resolve_charge_after_roll');
      assert.equal(pending.chargePlan.speedInches,2);
      assert.equal(pending.maxDistanceMilliInches,(pending.chargePlan.speedInches+pending.chargeRoll)*1000);
      assert(menu.parameterDomains.some(d=>d.actionType==='resolve_charge'));
      const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head);
      await save(dir+'/result.public.json',{roomId,version:source.version,revision,actions,penalty:debuff.speedPenalty,
        speedAfter:pending.chargePlan.speedInches,roll:pending.chargeRoll,maxDistanceMilliInches:pending.maxDistanceMilliInches,
        successor:'resolve_charge',coldExact:true,stateHash:head.stateHash,providerCalls:0});
      break;
    }
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,reason:error.message});throw error;}
finally{native.close();}
