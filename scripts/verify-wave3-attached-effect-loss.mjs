import assert from 'node:assert/strict';
import {base,manifestRef,signedBranch,savedRoom} from './support/wave3-faq-room-v1.mjs';
import {read} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext,restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {conditionWave3Casualties} from './support/wave3-condition-casualties-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {prepareOfficialReleaseRoomNativeActionsV2,officialReleaseRosterIncrementOptionsV2} from '../packages/product-composition/official-release-room-native-actions-v2.mjs';

const version='2.99.11', out='build/ticket-28-wave3-attached-effect-loss';
const caster='medic',target='sentry',definition='unit:medic/optical-flare-movement-phase@1';
async function lookup(ctx,unitId) {
  const h=await ctx.head(),seatKey=h.state.activeSideKey??h.state.firstPlayerSideKey;
  const {projection}=await ctx.app.room.readRoom({roomId:h.roomId,seatToken:ctx.seats[seatKey].seatToken});
  const service=createStarcraftTmgSceneQueryServiceV1({seatKey,roomStore:ctx.app.store,rulesRuntime:ctx.bound.rulesRuntime});
  const receipt=await service.query({roomProjection:projection,legalSpace:await ctx.menu(),request:{queryKind:'unit.status_loss',arguments:{unitId}}});
  assert.equal(receipt.status,'exact',receipt.reason);
  return {receiptHash:receipt.queryReceiptHash,stateHash:h.stateHash,...receipt.result};
}
const scope=s=>({effects:[...(s.pieces.find(p=>p.id===target).statuses??[]),...(s.pieces.find(p=>p.id===target).officialAbilityEffects??[])]
  .filter(e=>e.sourceDefinitionId===definition).map(e=>e.statusEffectHash??e.effectHash).sort(),
  markers:s.board.effectMarkers.filter(m=>m.targetPieceId===target && m.sourceDefinitionId===definition).map(m=>m.id).sort()});
async function place() {
  const ref=await read(base+'/templar-standard-2.73.0/coverage.json');
  const recipes={player1:{factionRecordKey:'tactical_cards:terran_armed_forces',tacticalCardRecordKeys:['tactical_cards:barracks__proxy_'],
    units:['marine','medic'].map(k=>({unitInstanceId:k,recordKey:'army_units:'+k,compositionKind:'small',upgradeNames:[]}))},
    player2:(await read(base+'/sentry-field-standard-2.72/opening.json')).recipes.player1};
  const dir=out+'/cast',id='attached-flare',scene={positions:{medic:[12,8],sentry:[19,8]}};
  const state=await restoreOrPreparePositionedStandardOpening({dir,roomId:id,candidateVersion:version,scene,reference:{...ref,recipes,compareReadOnlyAdmission:true}});
  await signedBranch({dir,id,version,scene,initial:state,state,async perform(ctx) {
    for(;;){
      const h=await ctx.head(),s=h.state;
      const {parameterDomains:d,finiteActions:f}=await ctx.menu();
      const placed=scope(s).effects.length>0;
      if(placed && !s.pendingOfficialReactionWindow && s.activeSideKey==='player2' && !s.selectedRosterActivationWindow)break;
      assert(h.stateRevision<9);
      let row=f.find(r=>r.action.actionType==='resolve_mission_start_of_round')??
        f.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
      let parameters={};
      if(!row && !placed){
        row=d.find(r=>r.definitionId===definition && r.parameterSchema.targetUnitId?.enum.includes(target));
        assert(row,'eligible Optical Flare unavailable: '+d.filter(r=>r.pieceId===caster).map(r=>r.definitionId));
        parameters={activeUnitId:caster,targetUnitId:target,paymentCardInstanceIds:row.parameterSchema.paymentCardInstanceIds.enum[0]};
      } else if(!row){
        row=d.find(r=>r.actionType==='pass_reaction_family_window')??f.find(r=>r.action.actionType==='pass_reaction_family_window')??
          d.find(r=>r.actionType==='finish_activation'&&r.pieceId===caster)??f.find(r=>r.action.actionType==='pass');
        assert(row,JSON.stringify(d.map(r=>[r.actionType,r.parameterSchema.required])));
      }
      await ctx.commit(row,parameters);
    }
  },async verify(h,ctx){
    const real=scope(h.state);assert.equal(real.effects.length,2);assert.equal(real.markers.length,1);
    const receipts={};
    for(const id of [caster,target]){
      const r=await lookup(ctx,id),rows=r.effects.filter(e=>e.definitionId===definition);
      assert.deepEqual(rows.map(e=>e.effectHash).sort(),real.effects);
      assert(rows.every(e=>e.disposition===(id===target?'end_on_recipient_loss':'keep_own_duration')&& e.expiresAt==='cleanup_and_refresh'));
      assert.deepEqual(rows.flatMap(e=>e.markerIds).sort(),real.markers);
      receipts[id]=r;
    }
    return {real,receipts};
  }});
}
async function loss(which) {
  const old=which==='old-target',lost=which==='caster'?caster:target, release=old?'2.99.10':version;
  const paid=(await savedRoom(out+'/cast','attached-flare')).head;
  const context=await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
  const state=structuredClone(prepareOfficialReleaseRoomNativeActionsV2({context,state:paid.state,useEquippedWeapons:true,
    includeReleasePhaseControl:true,...officialReleaseRosterIncrementOptionsV2(release)}).state);
  const before=scope(state);
  conditionWave3Casualties(state,lost,state.pieces.find(p=>p.id===lost).currentModels);
  state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
  const dir=out+'/'+which,id='attached-flare-'+which;
  await signedBranch({dir,id,version:release,scene:{paidHash:paid.stateHash,lost,condition:'last model removed through Native casualty writer'},initial:state,state,
    async perform(ctx){
      if((await ctx.head()).stateRevision)return;
      if(!old) {
        const r=await lookup(ctx,lost);assert(r.unitDestroyed);
        assert.deepEqual(r.effects.filter(e=>e.definitionId===definition).map(e=>e.effectHash).sort(),before.effects);
      }
      await ctx.commit((await ctx.menu()).finiteActions.find(r=>r.action.actionType==='pass'));
    },async verify(h,ctx){
      const after=scope(h.state);
      if(old || lost===caster)assert.deepEqual(after,before);else assert.deepEqual(after,{effects:[],markers:[]});
      let receipt;
      if(!old){
        receipt=await lookup(ctx,lost);
        assert.deepEqual(receipt.effects.filter(e=>e.definitionId===definition).map(e=>e.effectHash).sort(),after.effects);
      }
      return {before,after,receipt,events:h.state.log.at(-1)?.events?.map(e=>e.type),oldRetainedDeadTargetEffects:old};
    }});
}
async function verifyExpiry() {
  const paid=await savedRoom(out+'/caster','attached-flare-caster');
  const state=paid.head.state, dir=out+'/expiry', id='attached-flare-expiry';
  const startRound=state.round, original=scope(state);
  assert.equal(original.effects.length,2);
  await signedBranch({dir,id,version,initial:paid.initial.state,state,scene:{sourceHash:paid.head.stateHash,startRound},
    async perform(ctx) {
      for (;;) {
        const h=await ctx.head();
        if(h.state.round>startRound)break;
        assert(h.stateRevision<30,'round did not advance');
        const {finiteActions,parameterDomains}=await ctx.menu();
        const find=kind=>finiteActions.find(r=>r.action.actionType===kind);
        const row=parameterDomains.find(r=>r.actionType==='pass_reaction_family_window')??
          find('pass_reaction_family_window')??find('choose_first_actor')??find('pass')??(finiteActions.length===1?finiteActions[0]:null);
        assert(row,JSON.stringify(finiteActions.map(r=>r.action.actionType)));
        await ctx.commit(row);
      }
    },async verify(h,ctx) {
      assert.equal(h.state.round,startRound+1);
      assert.deepEqual(scope(h.state),{effects:[],markers:[]});
      const after=await lookup(ctx,caster);
      assert.equal(after.effects.filter(e=>e.definitionId===definition).length,0);
      return {startRound,endRound:h.state.round,before:original,after:scope(h.state),receipt:after};
    }});
}
if(process.argv[2]==='expiry')await verifyExpiry();
else if(process.argv[2]==='cast')await place();
else if(['old-target','target','caster'].includes(process.argv[2]))await loss(process.argv[2]);
else throw Error('Expected cast, old-target, target, caster or expiry');
