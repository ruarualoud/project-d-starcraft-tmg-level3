import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialSkirmish500ReleaseOpeningV2} from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';

const scale=process.argv[2];
assert(['Skirmish','Standard'].includes(scale));
const setups=await read('content/wave3-human-match-setups-v1.json');
const setup=setups.find(s=>s.scale===scale),small=scale==='Skirmish',version='2.88.0';
const roomId='t28-entry-'+scale.toLowerCase(),dir='build/ticket-28-wave3-human-lobby-v1/incremental-pass/'+roomId;
const source=await read(setup.releaseRef);
assert.equal(source.manifestHash,setup.sourceHash);
const context=await resolveWave3StandardContext(source,'area_ability_inputs');
const unit=(unitInstanceId,recordKey,compositionKind)=>({unitInstanceId,recordKey:'army_units:'+recordKey,compositionKind,upgradeNames:[]});
const recipes={player1:{factionRecordKey:'tactical_cards:templar_caste',tacticalCardRecordKeys:['tactical_cards:templar_archives'],
  units:[unit('twilight','twilight_templar__high_templar_','small'),unit('templar','high_templar','small'),
    {...unit('sentry','sentry','small'),upgradeNames:['Solid-Field Projectors']}]},player2:setups.find(s=>s.scale==='Skirmish').presets[1].recipe};
const warp='unit:twilight_templar__high_templar_/warp-in-movement-phase@1',ambush='unit:corpser__roach_/burrow-ambush-movement-phase@1';
const factory=small?prepareOfficialSkirmish500ReleaseOpeningV2:prepareOfficialStandardReleaseOpeningV2;
const scene={condition:'Twilight already deployed, other units in native reserves',scale,recipes,version,mission:setup.missionRecordKey,deployment:setup.deploymentRecordKey};
let stage='opening',revision;
async function run(){
  const opening=factory({releaseContext:context,releaseMatchVersion:version,dataset:context.dataset,snapshot:context.snapshot,
    roomId,recipes,missionRecordKey:scene.mission,deploymentRecordKey:scene.deployment,mapConfiguration:wave3HumanMapConfiguration(setup),
    ...(small?{}:{armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY})});
  assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
  const start=structuredClone(opening.state),actor=start.pieces.find(p=>p.id==='twilight');
  let positioned=false;
  for(const y of [3,6,10,16]){for(const x of [4,8,12,18]){
    Object.assign(actor,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',xInches:x,yInches:y,leadingModelId:actor.models[0].id});
    actor.models.forEach((m,i)=>Object.assign(m,{isOnField:true,xInches:x+2*i,yInches:y}));
    try {declareWave3EngineeringCoherencyV1(start,{planIdPrefix:roomId});positioned=true;break;}
    catch(e){if(e.failureStage!=='scene_geometry')throw e;}
  }if(positioned)break;}
  assert(positioned,'no legal origin in sampled positions');
  start.reserveManifestBySide.player1.find(p=>p.pieceId==='twilight').deploymentStatus='deployed';
  if(start.officialRoundSupplyState)start.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:start,expectedRulesRuntimeHash:start.supplyLossLedger.rulesRuntimeHash});
  const bound=await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial:start,dir,candidateVersion:version,scenario:scene});
  const native=bound.open();
  try{
    const seats=await native.create(roomId,bound.authority);
    for(;;){
      const head=(await native.store.loadRoom(roomId)).envelope,state=head.state,side=state.activeSideKey;
      revision=head.stateRevision;stage='menu-r'+revision;
      const legal=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(legal.ok,legal.reason);
      const ds=legal.legalSpace.parameterDomains,fs=legal.legalSpace.finiteActions;
      const events=state.log.flatMap(r=>r.events??[]);
      const warped=events.some(e=>e.type==='relocation_ability_resolved'&&e.definitionId===warp);
      const entered=state.pieces.find(p=>p.id==='player2-corpser').isOnField;
      if(warped&&(small?entered:side==='player2')){
        const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
        const results=events.filter(e=>['relocation_ability_resolved','relocation_resource_paid'].includes(e.type));
        assert(results.some(e=>e.resourceCost===1));
        const units=state.pieces.filter(p=>['twilight','player2-corpser'].includes(p.id)).map(p=>({id:p.id,supply:p.currentSupply,inReserves:p.isInReserves,models:p.models.map(m=>[m.id,m.xInches,m.yInches])}));
        await save(dir+'/result.public.json',{roomId,scene,revision,round:state.round,actualBudget:state.armyCompositionUpgradeAuditsBySide.player1.armyResourceBudgetResult.mineralBudget,actions,results,units,nextSeat:side,successorCount:ds.length+fs.length,coldExact:true,stateHash:head.stateHash,providerCalls:0});
        console.log(scale,revision,actions);break;
      }
      let domain,finite,params;
      if(!revision||state.phase==='start_of_round'){
        finite=fs.find(f=>f.action.actionType==='resolve_mission_start_of_round')??fs.find(f=>f.action.actionType==='choose_first_actor'&&f.action.chosenFirstActorSideKey==='player1');
      }
      if(!finite&&fs.some(f=>f.action.actionType==='choose_first_actor'))finite=fs.find(f=>f.action.actionType==='choose_first_actor'&&(f.action.chosenFirstActorSideKey??f.action.sourceAction?.chosenFirstActorSideKey)==='player1');
      if(!finite){
        const ability=side==='player2'?ambush:warp;
        if(!warped||side==='player2'){
          domain=ds.find(d=>d.definitionId===ability);
          assert(domain,'missing '+ability+' '+JSON.stringify(ds.map(d=>[d.actionType,d.pieceId,d.definitionId]).slice(0,50)));
          const raw=bound.runtime.enumerate(state,{sideKey:side}).parameterDomains.find(d=>d.domainId===domain.domainId);
          const p=state.pieces.find(p=>p.id===domain.pieceId);
          const candidates=[];
          if(ability===warp){
            for(const [dx,dy] of [[2,0],[0,2],[-2,0],[0,-2],[3,1],[1,3]]){
              candidates.push({paymentCardInstanceIds:domain.parameterSchema.paymentCardInstanceIds.enum[0],leadingModelId:p.models[0].id,
                placements:p.models.map(m=>({modelId:m.id,xMilliInches:Math.round((m.xInches+dx)*1000),yMilliInches:Math.round((m.yInches+dy)*1000),elevation:'ground',rotationDegrees:0,supportTerrainIds:[]}))});
            }
          }else{
            for(const edge of state.officialDeploymentGeometryBinding.entryEdgesByPlayer[side].segments.filter(e=>domain.parameterSchema.entrySegmentId.enum.includes(e.segmentId))){
              const horizontal=['top','bottom'].includes(edge.side);
              for(const fraction of [.5,.25,.75])for(const depth of [3,7,11,15]){
                const along=edge.startInches+fraction*(edge.endInches-edge.startInches);
                const x=horizontal?along:edge.side==='left'?depth:state.board.widthInches-depth;
                const y=!horizontal?along:edge.side==='bottom'?depth:state.board.heightInches-depth;
                const gap=p.models[0].baseWidthInches+.15;
                candidates.push({leadingModelId:p.models[0].id,entrySegmentId:edge.segmentId,
                  placements:p.models.map((m,i)=>({modelId:m.id,xMilliInches:Math.round((x+(i%2)*gap)*1000),yMilliInches:Math.round((y+Math.floor(i/2)*gap)*1000),elevation:'ground'}))});
              }
            }
          }
          const errors=new Set();
          for(const arg of candidates){
            try{bound.runtime.instantiate(state,raw,arg,{sideKey:side});params=arg;break;}
            catch(e){if(!/GEOMETRY|OVERLAP|OUTSIDE|OUT_OF_BOUNDS|DISTANCE_EXCEEDED|ENTRY_SEGMENT_EXCEEDED/.test(e.message))throw e;errors.add(e.message);}
          }
          assert(params,'sampled endpoints lacked a legal placement: '+[...errors].join(', '));
          await save(dir+'/'+(ability===warp?'warp':'ambush')+'.public.json',{revision,side,ability,params,constraints:domain.constraints});
        }else{domain=ds.find(d=>d.actionType==='finish_activation'&&d.pieceId==='twilight');params={};}
      }
      assert(domain||finite,'unexpected phase '+state.phase+' '+side);
      stage=domain?.actionType??finite.action.actionType;
      assert(revision<10,'outside one movement window');
      await native.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...(domain?{select:r=>r.domainId===domain.domainId,parameters:()=>params}:{kind:'finite',select:r=>r.actionKey===finite.actionKey})});
      console.log(scale,revision+1,stage);
    }
  }finally{native.close();}
}
try{await run();}catch(e){await save(dir+'/stop-'+Date.now()+'.public.json',{revision,stage,reason:e.message});throw e;}
