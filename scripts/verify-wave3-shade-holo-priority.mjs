import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir='build/ticket-28-wave3-release-wide-phases/shade-holo/outside-entry-zone';
const roomId='shade-holo-current-release',version='2.99.2';
const reference=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
const nova=(await read(base+'/raven-seeker-standard-v229/nova-rosters.json')).find(r=>r.mode==='nova_assault_mode').player1;
const adept=reference.recipes.player1;
reference.recipes={player1:nova,player2:adept};
reference.compareReadOnlyAdmission=true;
const scene={condition:'legal isolated movement positions, two opposing optional effects tested in initiative order',
  positions:{nova_assault_mode:[10,10],adept:[24,4]},providerCalls:0};
let stage='factory',revision=0,room;
try {
  const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
  const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  room=bound.open();
  const seats=await room.create(roomId,bound.authority);
  let trace=[];
  try{trace=await read(dir+'/trace.public.json');}catch(e){if(e.code!=='ENOENT')throw e;}
  for(;;){
    const current=(await room.store.loadRoom(roomId)).envelope,state=current.state;
    revision=current.stateRevision;
    if(state.currentProductMatchLifecycle?.step==='determine_initiative' && revision>3){
      assert(trace.some(r=>r.type==='choose_holo_surprise'&&r.side==='player1'));
      const removed=trace.findIndex(r=>r.type==='resolve_unit_timed_life'&&r.side==='player1');
      const shade=trace.findIndex(r=>r.type==='choose_psionic_transfer_round_end'&&r.side==='player2');
      assert(removed>=0&&shade>removed);
      assert(!state.board.tokens.some(t=>t.createdByPieceId==='adept'));
      const decoy=state.pieces.find(p=>p.officialUnitRecordKey==='army_units:holo_decoy');
      assert(decoy && (!decoy.isOnField||decoy.isDestroyed||decoy.currentModels===0));
      const {latestCheckpoint}=await room.store.loadReplayBundle(roomId);
      await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,current,latestCheckpoint);
      await save(dir+'/result.public.json',{roomId,version,revision,status:'passed',trace,stateHash:current.stateHash,
        coldExact:true,providerCalls:0});break;
    }
    let side=state.activeSideKey,menu;
    for(const key of (seats[side]?[side]:Object.keys(seats))){
      const v=await room.room.legalSpace({roomId,seatToken:seats[key].seatToken});assert(v.ok,v.message);
      if(v.legalSpace.finiteActions.length||v.legalSpace.parameterDomains.length){menu=v.legalSpace;side=key;break;}
    }
    assert(menu,'missing actionable seat');
    const domains=menu.parameterDomains,finite=menu.finiteActions;
    const pick=kind=>finite.find(r=>r.action.actionType===kind);
    const choose=finite.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
    const cardCost=domain=>{const schema=domain.parameterSchema.properties??domain.parameterSchema,payment=schema.paymentCardInstanceIds;
      return payment.const??(payment.choices??payment.enum)[0];};
    let row=pick('resolve_mission_start_of_round')??choose,parameters={};
    if(!row && state.phase==='movement'&&!trace.some(r=>r.definitionId==='unit:nova_assault_mode/holo-decoy-movement-phase@1')){
      row=domains.find(r=>r.definitionId==='unit:nova_assault_mode/holo-decoy-movement-phase@1');
      if(row){
        const actor=state.pieces.find(p=>p.id===row.pieceId||p.id==='nova_assault_mode');
        const model=actor.models[0],base=state.officialModelBaseGeometryDataBundle.profiles.find(p=>p.recordKey==='army_units:holo_decoy');
        parameters={activeUnitId:actor.id,paymentCardInstanceIds:cardCost(row),
          coordinate:{xMilliInches:Math.round(model.xInches*1000+(model.baseWidthInches*1000+base.baseWidthMilliInches)/2),
            yMilliInches:Math.round(model.yInches*1000)}};
      }
    }
    if(!row && state.phase==='movement'&&!trace.some(r=>r.type==='set_psionic_transfer_shade')){
      row=domains.find(r=>r.actionType==='set_psionic_transfer_shade'&&r.pieceId==='adept');
      if(row)parameters={coordinate:{xMilliInches:29000,yMilliInches:4000},paymentCardInstanceIds:cardCost(row)};
    }
    if(!row&&state.currentProductMatchLifecycle?.step==='round_end_choices'){
      const holo=domains.find(r=>r.actionType==='choose_holo_surprise');
      const shade=domains.find(r=>r.actionType==='choose_psionic_transfer_round_end');
      if(holo||shade){row=holo??shade;parameters={choice:'skip'};}
      else row=pick('resolve_unit_timed_life')??pick('begin_psionic_transfer_round_end')??pick('complete_psionic_transfer_round_end');
    }
    if(!row)row=pick('decline_summoned_move')??domains.find(d=>d.actionType==='pass_reaction_family_window')
      ??domains.find(d=>d.actionType==='finish_activation')??pick('pass')??pick('pass_phase')??(finite.length===1?finite[0]:null);
    if(!row||revision>=40)throw Error(JSON.stringify({side,phase:state.phase,step:state.currentProductMatchLifecycle?.step,
      domains:domains.slice(0,15).map(d=>[d.actionType,d.pieceId]),finite:finite.slice(0,12).map(f=>f.action.actionType)}));
    stage=(row.action??row).actionType;
    await room.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...(row.domainId
      ?{select:d=>d.domainId===row.domainId,parameters:()=>parameters}:{kind:'finite',select:f=>f.actionKey===row.actionKey})});
    trace.push({revision:revision+1,side,type:stage,definitionId:row.definitionId??null});
    await save(dir+'/trace.public.json',trace);
    console.log('signed',revision+1,side,stage);
  }
}catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,reason:error.message.slice(0,900)});throw error;}
finally{room?.close();}
