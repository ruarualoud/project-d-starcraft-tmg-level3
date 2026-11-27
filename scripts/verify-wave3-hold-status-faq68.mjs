import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';

const legacy=process.argv.includes('--legacy');
const version=legacy?'2.99.3':'2.99.4',id='stalker1';
const dir='build/ticket-28-wave3-hold-faq68/purchased/'+version,roomId='wave3-hold-faq68-purchased-'+version;
const reference=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.81.0/coverage.json');
reference.compareReadOnlyAdmission=true;
reference.recipes.player1.units.find(u=>u.unitInstanceId===id).upgradeNames.push('Path of Shadows');
const scenario={positions:{stalker1:[12,8],watchers2:[36,25]},providerCalls:0};
const initial=await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene:scenario});
const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario});
const app=bound.open();
let stage='menu',revision;
try {
  const seats=await app.create(roomId,bound.authority);
  for(;;){
    const head=(await app.store.loadRoom(roomId)).envelope,state=head.state,side=state.activeSideKey;
    revision=head.stateRevision;
    const unit=state.pieces.find(p=>p.id===id);
    const hidden=unit.statuses.some(s=>(s.statusName??s)==='hidden');
    const end=state.log.flatMap(l=>l.events??[]).find(e=>e.pieceId===id&&e.beforeActionFinishCountedAsHold===true);
    if(end){
      assert.equal(hidden,legacy);
      const expired=state.actionPerformedStatusHistory?.find(e=>e.pieceId===id&&e.cause==='implicit_hold');
      assert.equal(Boolean(expired),!legacy);
      const journal=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head);
      await save(dir+'/result.public.json',{version,roomId,revision,hiddenAfterHold:hidden,event:end,
        expired:expired??null,nextSide:side,journal,cold:true,providerCalls:0});break;
    }
    const response=await app.room.legalSpace({roomId,seatToken:seats[side].seatToken});assert(response.ok,response.message);
    const {parameterDomains,finiteActions}=response.legalSpace;
    const first=finiteActions.find(r=>r.action.actionType==='resolve_mission_start_of_round')??
      finiteActions.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
    const domain=hidden?parameterDomains.find(d=>d.actionType==='finish_activation'&&d.pieceId===id):
      parameterDomains.find(d=>d.definitionId==='unit:stalker/path-of-shadows-any-phase@1'&&d.pieceId===id);
    assert(first||domain,'missing Stalker action at r'+revision+': '+JSON.stringify(parameterDomains.filter(d=>d.pieceId===id).map(d=>[d.actionType,d.definitionId])));
    stage=first?.action.actionType??domain.actionType;
    await app.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+stage,...(first?{
      kind:'finite',select:r=>r.actionKey===first.actionKey
    }:{select:d=>d.domainId===domain.domainId,parameters:()=>hidden?{}:{
      activeUnitId:id,paymentCardInstanceIds:domain.parameterSchema.paymentCardInstanceIds.enum[0]}})});
    assert(revision<8);
  }
} catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,message:error.message});throw error;}
finally{app.close();}
