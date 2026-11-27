import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {deploymentOptions} from './support/wave3-single-model-redeployment.mjs';
import {resolveWave3StandardContext,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialSkirmish500ReleaseOpeningV2} from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import {wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const version='2.88.0',roomId='t28-personal-transport-skirmish';
const dir='build/ticket-28-wave3-human-lobby-v1/incremental-pass/'+roomId;
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Skirmish');
const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
const recipes={player1:{factionRecordKey:'tactical_cards:nerazim',tacticalCardRecordKeys:['tactical_cards:void_seeker'],
  units:[{unitInstanceId:'zeratul',recordKey:'army_units:zeratul',compositionKind:'small',upgradeNames:[]},
    {unitInstanceId:'stalker',recordKey:'army_units:stalker',compositionKind:'large',upgradeNames:[]}]},player2:setup.presets[1].recipe};
let revision,stage='opening';
try{
  const opening=prepareOfficialSkirmish500ReleaseOpeningV2({releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,
    roomId,recipes,missionRecordKey:setup.missionRecordKey,deploymentRecordKey:setup.deploymentRecordKey,mapConfiguration:wave3HumanMapConfiguration(setup)});
  assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
  const initial=structuredClone(opening.state),actor=initial.pieces.find(p=>p.id==='zeratul');
  assert.equal(actor.models.length,1);
  Object.assign(actor,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',xInches:4,yInches:3,leadingModelId:actor.models[0].id});
  Object.assign(actor.models[0],{isOnField:true,xInches:4,yInches:3});
  initial.reserveManifestBySide.player1.find(p=>p.pieceId===actor.id).deploymentStatus='deployed';
  declareWave3EngineeringCoherencyV1(initial,{planIdPrefix:roomId});
  if(initial.officialRoundSupplyState)initial.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:initial});
  const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,candidateVersion:version,scenario:'Zeratul on field, other units in reserves'});
  const room=bound.open();
  try{
    const seats=await room.create(roomId,bound.authority);
    for(;;){
      const head=(await room.store.loadRoom(roomId)).envelope,state=head.state,side=state.activeSideKey;
      revision=head.stateRevision;stage='menu-r'+revision;
      const {legalSpace}=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      const latest=state.personalTransportHistory?.at(-1);
      if(latest&&side==='player2'){
        assert.equal(latest.pieceId,actor.id);
        assert.equal(latest.releasedSupply,actor.currentSupply);
        assert.equal(latest.supplyAfterReturn.onTableSupplyBySide.player1,0);
        assert.equal(latest.supplyAfterDeploy.onTableSupplyBySide.player1,actor.currentSupply);
        const after=state.pieces.find(p=>p.id===actor.id);
        const coords=[after.models[0].xInches,after.models[0].yInches];
        assert.notDeepEqual(coords,[4,3]);assert(after.isOnField&&!after.isInReserves);
        assert.equal(state.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:void_seeker').readiness,'exhausted');
        const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
        await save(dir+'/result.public.json',{roomId,version,revision,actions,round:state.round,budget:500,actor:actor.id,origin:[4,3],destination:coords,
          releasedSupply:latest.releasedSupply,restoredSupply:latest.supplyAfterDeploy.onTableSupplyBySide.player1,nextSeat:side,coldExact:true,stateHash:head.stateHash,providerCalls:0});
        break;
      }
      assert(revision<6);assert.equal(side,'player1');
      const finite=legalSpace.finiteActions.find(f=>f.action.actionType==='resolve_mission_start_of_round'||f.action.actionType==='choose_first_actor'&&(f.action.chosenFirstActorSideKey??f.action.sourceAction?.chosenFirstActorSideKey)==='player1');
      if(finite){await room.commit({roomId,credential:seats[side],operationKey:stage,kind:'finite',select:f=>f.actionKey===finite.actionKey});continue;}
      const type=latest?'finish_activation':'resolve_personal_transport';
      const domain=legalSpace.parameterDomains.find(d=>d.actionType===type&&d.pieceId===actor.id);
      assert(domain,type);let params={};
      if(!latest){
        const native=bound.runtime.queryPersonalTransport(state,actor.id).result.parameterDomains.find(d=>d.domainId===domain.sourceDomain.domainId);
        assert(native);
        const options=deploymentOptions(native.sourceDomain.deploymentDomain,actor);
        params=options.find(candidate=>{
          try{bound.runtime.queryPersonalTransport(state,actor.id,candidate);return true;}
          catch(e){if(!/TERRAIN|COLLISION|OBSTACLE|OVERLAP|MODEL_BASE/.test(e.message))throw e;return false;}
        });
        assert(params,'sampled edge entries unavailable');
      }
      await room.commit({roomId,credential:seats[side],operationKey:stage,select:d=>d.domainId===domain.domainId,parameters:()=>params});
    }
  }finally{room.close();}
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,reason:e.message});throw e;}
