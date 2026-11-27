import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir='build/ticket-28-wave3-rapid-reinforcements-turret',roomId='wave3-reinforcement-turret',version='2.99.3';
const original=await read(base+'/raven-standard-v228/factory-state.json');
const unit=(id,upgrades=[])=>({unitInstanceId:id,recordKey:'army_units:'+id,compositionKind:'small',upgradeNames:upgrades});
const raider='raynor_s_raider__marine_',rapid='Rapid Reinforcements';
const ref={manifestRef:base+'/tabletop-raven-m01-v1/manifest.json',mission:original.officialMissionSetupBinding.missionRecordKey,
  deployment:original.officialDeploymentGeometryBinding.deploymentRecordKey,compareReadOnlyAdmission:true,
  recipes:{player1:{factionRecordKey:'tactical_cards:raynor_s_raiders',units:[unit('raven',['Internal Tech Module']),unit(raider)],tacticalCardRecordKeys:[]},
    player2:{factionRecordKey:'tactical_cards:zerg_swarm',units:[unit('zergling')],tacticalCardRecordKeys:['tactical_cards:accelerating_creep']}}};
const scene={positions:{raven:[8.5,10]},providerCalls:0};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference:ref,candidateVersion:version,scene});
const bound=await bindWave3StandardActionRoom({manifestRef:ref.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
const app=bound.open();
let stage='room',revision;
try{
  const seats=await app.create(roomId,bound.authority);
  for(;;){
    const head=(await app.store.loadRoom(roomId)).envelope,state=head.state,side=state.activeSideKey;
    revision=head.stateRevision;
    const troop=state.pieces.find(p=>p.id===raider),turret=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:auto_turret');
    if(troop.isOnField){
      assert(troop.activatedPhases.movement);assert.equal(troop.models.filter(m=>m.isOnField&&!m.isDestroyed).length,6);
      const journal=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
      await save(dir+'/result.public.json',{version,revision,source:'raven',invalidSource:turret.id,sixArrived:true,activationEnded:true,journal,cold:true,providerCalls:0});break;
    }
    const menu=await app.room.legalSpace({roomId,seatToken:seats[side].seatToken});assert(menu.ok,menu.message);
    const ds=menu.legalSpace.parameterDomains,fs=menu.legalSpace.finiteActions;
    const first=fs.find(r=>r.action.actionType==='resolve_mission_start_of_round')??fs.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
    let row=first,params={};
    if(!row&&!turret){
      row=ds.find(d=>d.definitionId==='unit:raven/deploy-auto-turret-movement-phase@1'&&d.pieceId==='raven');
      assert(row,'Raven must receive native paid deployment');
      params={activeUnitId:'raven',paymentCardInstanceIds:['faction:player1'],coordinate:{xMilliInches:13000,yMilliInches:10000}};
    }else if(!row){
      const move=ds.find(d=>d.abilityName===rapid&&d.pieceId===raider);
      if(move){
        const schema=move.parameterSchema,allowed=schema.anchorPieceId.enum;
        assert(turret.isStructure&&turret.sideKey===troop.sideKey&&turret.isOnField);assert(allowed.includes('raven'));assert(!allowed.includes(turret.id));
        const raw=bound.runtime.enumerate(state,{sideKey:side}).parameterDomains.find(d=>d.domainId===move.domainId);
        const offsets=[[0,0],[1400,0],[700,1212],[-700,1212],[-1400,0],[-700,-1212]],ids=schema.placements.exactModelIds;
        assert.equal(ids.length,offsets.length);
        params={leadingModelId:ids[0],anchorPieceId:'raven',anchorModelId:'raven-model-1',placements:ids.map((id,i)=>({modelId:id,
          xMilliInches:7000+offsets[i][0],yMilliInches:14500+offsets[i][1],elevation:'ground',supportTerrainIds:[],rotationDegrees:0}))};
        let refusal;try{bound.runtime.instantiate(state,raw,{...params,anchorPieceId:turret.id,anchorModelId:turret.models[0].id},{sideKey:side});}catch(e){refusal=e.message;}
        assert(refusal&&/ANCHOR|PARAMETER/.test(refusal),refusal);
        const distant = params.placements.map(p => ({...p, yMilliInches: p.yMilliInches + 14000}));
        assert.throws(() => bound.runtime.instantiate(state,raw,{...params,placements:distant},{sideKey:side}),
          /RELOCATION_FRIENDLY_ANCHOR_DISTANCE_EXCEEDED/);
        await save(dir+'/origins.public.json',{revision,raider,validOrigins:allowed,wrongStructure:turret.id,refusal,
          distantRejected:'RELOCATION_FRIENDLY_ANCHOR_DISTANCE_EXCEEDED',rangeMilliInches:raw.constraints.maxDistanceMilliInches});
        row=move;
      }else row=ds.find(d=>d.pieceId==='raven'&&d.actionType==='finish_activation')??fs.find(r=>r.action.actionType==='pass'&&side==='player2');
    }
    assert(row,'No requested native action: '+JSON.stringify([revision,side,ds.map(d=>[d.actionType,d.abilityName,d.pieceId]),fs.map(r=>r.action.actionType)]));
    stage=(row.action??row).actionType;
    await app.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...(row.domainId?{select:d=>d.domainId===row.domainId,parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===row.actionKey})});
    assert(revision<10);
  }
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,message:e.message});throw e;}
finally{app.close();}
