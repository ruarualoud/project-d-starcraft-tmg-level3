import assert from 'node:assert/strict';
import {createOfficialSupplyLossLedgerV1} from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import {loadWave3HumanMatchSetupsV1,wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';

import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
const dir='build/ticket-28-wave3-faq58-current/matched-deployment',roomId='faq58-adept-standard-matched',version='2.99.2';
const signedClaim=await read('build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt/result.public.json');
const setup=(await loadWave3HumanMatchSetupsV1(process.cwd())).find(row=>row.scale===signedClaim.size&&
  row.missionRecordKey===signedClaim.mission&&row.deploymentRecordKey===signedClaim.deployment&&row.seedId===signedClaim.seed);
assert(setup,'archived claim requires its own deployment and map');
const recipes=Object.fromEntries(setup.presets.map((r,i)=>['player'+(i+1),r.recipe]));
const reference={recipes,mission:setup.missionRecordKey,deployment:setup.deploymentRecordKey,
  manifestRef:setup.releaseRef,manifestHash:setup.sourceHash,compareReadOnlyAdmission:true};
const scene={positions:{},condition:'Round two; one friendly Adept at the recorded neutral objective, no enemy in the area. No intervening movement history asserted.'};
const state0=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene,mapConfiguration:wave3HumanMapConfiguration(setup)});
const actor=state0.pieces.find(p=>p.id==='adept');
const pose=state=>state.pieces.find(p=>p.id==='adept').models.map(m=>({modelId:m.id,xMilliInches:Math.round(m.xInches*1000),yMilliInches:Math.round(m.yInches*1000)}));
Object.assign(actor,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',leadingModelId:actor.models[0].id,
  xInches:signedClaim.coordinates[0][0],yInches:signedClaim.coordinates[0][1]});
actor.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:signedClaim.coordinates[i][0],yInches:signedClaim.coordinates[i][1]}));
state0.reserveManifestBySide.player1.find(r=>r.pieceId===actor.id).deploymentStatus='deployed';
state0.round=2;
state0.supplyLossLedger=createOfficialSupplyLossLedgerV1({round:2,rulesRuntimeHash:state0.supplyLossLedger.rulesRuntimeHash});
declareWave3EngineeringCoherencyV1(state0,{planIdPrefix:roomId});
const objective=state0.board.missionMarkers.find(m=>m.id===signedClaim.marker);
assert(Math.hypot(actor.xInches-objective.xInches,actor.yInches-objective.yInches)<=3,'conditioned carrier out of range');
const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial:state0,dir,candidateVersion:version,scenario:scene});
const room=bound.open();
let revision,stage;
try{
  const authority=bound.authority;
  const seats=await room.create(roomId,authority);
  while(true){
    const current=(await room.store.loadRoom(roomId)).envelope,s=current.state;
    revision=current.stateRevision;
    assert(revision<40,'unresolved at revision '+revision);
    const marker=s.board.missionMarkers.find(m=>m.id===signedClaim.marker);
    const shade=s.board.tokens.find(t=>t.kind?.includes('shade')||t.createdByPieceId==='adept');
    const received=s.resolvedPsionicTransferRoundEnd?.find(r=>r.sourcePieceId==='adept'&&r.choice==='place');
    if(received&&!s.officialArtefactHuntSuspendedPlace){
      const suspended=await read(dir+'/suspension.public.json');
      assert(!marker.isRemoved);
      assert.notDeepEqual(pose(s),suspended.from);
      assert.deepEqual(pose(s),suspended.to);
      assert(!s.officialArtefactHuntCustody.byMarkerId[marker.id]?.carrierUnitId);
      const {latestCheckpoint}=await room.store.loadReplayBundle(roomId);
      const journal=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,current,latestCheckpoint);
      await save(dir+'/result.public.json',{version,roomId,revision,source:signedClaim.mission,scenario:scene,actions:journal,
        suspended,resolved:pose(s),markerAfter:[marker.xInches,marker.yInches],activeSide:s.activeSideKey,coldExact:true,providerCalls:0});break;
    }
    const side=s.activeSideKey??'player1',seat=seats[side];
    const offered=await room.room.legalSpace({roomId,seatToken:seat.seatToken});
    assert(offered.ok,offered.reason+' '+offered.message);
    const menu=offered.legalSpace;
    const domains=menu.parameterDomains,finite=menu.finiteActions;
    const f=type=>finite.find(r=>r.action.actionType===type);
    let row=f('resolve_mission_start_of_round')??finite.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
    let params={};
    if(!row&&s.phase==='movement'&&!shade){
      row=domains.find(r=>r.actionType==='set_psionic_transfer_shade'&&r.pieceId==='adept');
      if(row){const schema=row.parameterSchema.properties??row.parameterSchema;
        const payment=schema.paymentCardInstanceIds;
        params={coordinate:{xMilliInches:30000,yMilliInches:5000},paymentCardInstanceIds:payment.const??(payment.choices??payment.enum)[0]};}
    }
    if(!row)row=finite.find(r=>r.action.actionType==='claim_artefact_hunt_marker'&&r.action.pieceId==='adept')??f('claim_artefact_hunt_marker');
    if(!row&&s.officialArtefactHuntSuspendedPlace){
      row=domains.find(d=>d.actionType==='place_artefact_hunt_marker');
      assert(row&&side==='player2','opponent must place before teleport');
      const from=pose(s);assert.deepEqual(from,pose(state0));
      const to=s.officialArtefactHuntSuspendedPlace.canonicalParameters.placementPlan.placements;
      await save(dir+'/suspension.public.json',{revision,owner:side,stage:s.phase,from,to,marker:marker.id});
      params={xMilliInches:from[0].xMilliInches,yMilliInches:from[0].yMilliInches};
    }else if(!row){
      row=domains.find(d=>d.actionType==='choose_psionic_transfer_round_end');
      if(row){
        assert.equal(s.officialArtefactHuntCustody.byMarkerId[marker.id]?.carrierUnitId,'adept');
        const token=s.board.tokens.find(t=>t.tokenId===row.constraints.tokenId),models=pose(s);
        const raw=bound.runtime.enumerate(s,{sideKey:side}).parameterDomains.find(d=>d.domainId===row.domainId);
        const refusals=new Set();let chosen;
        const pitch=Math.ceil(actor.models[0].baseWidthInches*1000)+100;
        for(const radius of [0,150,300].map(n=>Math.ceil(pitch/(2*Math.sin(Math.PI/8)))+n)){
          for(const start of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
            const placements=models.map((m,i)=>({modelId:m.modelId,xMilliInches:Math.round(token.coordinate.x*1000+radius*Math.cos(start+i*Math.PI/4)),yMilliInches:Math.round(token.coordinate.y*1000+radius*Math.sin(start+i*Math.PI/4))}));
            const candidate={choice:'place',placementPlan:{leadingModelId:models[0].modelId,placements}};
            try{bound.runtime.instantiate(s,raw,candidate,{sideKey:side});chosen=candidate;break;}
            catch(e){if(!/COHERENCY|GEOMETRY|OVERLAP|COLLISION|PLACEMENT|ENDPOINT/.test(e.message))throw e;refusals.add(e.message);}
          }
          if(chosen)break;
        }
        assert(chosen,'sampled landings rejected: '+[...refusals].join(', '));params=chosen;
      }
    }
    row??=domains.find(d=>d.actionType==='finish_activation')??f('pass')??f('pass_phase')??(finite.length===1?finite[0]:null);
    assert(row,JSON.stringify({revision,side,phase:s.phase,finite:finite.map(r=>r.action.actionType),domains:domains.map(r=>r.actionType)}));
    stage=(row.action??row).actionType;
    await room.commit({roomId,credential:seat,operationKey:'r'+revision+'-'+stage,...(row.domainId?
      {select:d=>d.domainId===row.domainId,parameters:()=>params}:{kind:'finite',select:f=>f.actionKey===row.actionKey})});
    console.log(revision+1,side,stage);
  }
}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,stage,message:e.message});throw e;}
finally{room.close();}
