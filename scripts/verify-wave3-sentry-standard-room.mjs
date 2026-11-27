import assert from 'node:assert/strict';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const version = '2.72.0', id = 'sentry-field-standard-2.72', dir = base + '/' + id;
const reference = await read(base + '/templar-standard-' + version + '/coverage.json');
const scene = { conditioned: 'Small Sentry on field at (12,4), normal first-round initiative; other units in reserve.',
  fullDeploymentPlayed: false, providerCalls: 0 };
const unit = name => ({ unitInstanceId: name, recordKey: 'army_units:' + name, compositionKind: 'small', upgradeNames: [] });
const recipes = {player1:{factionRecordKey:'tactical_cards:daelaam',tacticalCardRecordKeys:['tactical_cards:templar_archives'],units:[unit('sentry'),unit('zealot')]},
  player2:{factionRecordKey:'tactical_cards:daelaam',tacticalCardRecordKeys:[],units:[{...unit('zealot'),unitInstanceId:'opposing-zealots'}]}};
const guardian = 'unit:sentry/guardian-shield-movement-phase@1', field = 'unit:sentry/force-field-movement-phase@1';
const record = (name, data) => save(dir + '/' + name + '.json', data);
async function originalOpening() {
  const directory=path.join(root,dir);
  if (await access(path.join(directory,'room.sqlite')).then(()=>true,error=>{if(error.code!=='ENOENT') throw error; return false;})) {
    const store=openWave3EngineeringStoreV1({directory,filename:'room.sqlite',readOnly:true});
    try {const replay=await store.loadReplayBundle(id); if(replay?.initialEnvelope) return replay.initialEnvelope.state;} finally {store.close();}
  }
  const context=await resolveWave3StandardContext(await read(reference.manifestRef),'area_ability_inputs');
  const opening=prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:version,releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,recipes,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:reference.mission,deploymentRecordKey:reference.deployment});
  assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
  const state=structuredClone(opening.state), sentry=state.pieces.find(p=>p.id==='sentry');
  Object.assign(sentry,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',
    leadingModelId:sentry.models[0].id,xInches:12,yInches:4});
  const spacing=sentry.models[0].baseWidthInches+0.15;
  for(const [i,m] of sentry.models.entries()) Object.assign(m,{isOnField:true,xInches:12+spacing*i,yInches:4});
  state.reserveManifestBySide.player1.find(r=>r.pieceId==='sentry').deploymentStatus='deployed';
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:id+'-'});
  await record('opening',{version,recipes,scene,coverage:opening.openingRosterCoverage.definitions.map(r=>r.definitionId),
    nativePending:opening.pendingNativeDefinitionIds});
  return state;
}
let revision, stage='opening';
try {
  const initial=await originalOpening(); stage='formal-match-binding';
  const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  const room=bound.open();
  try {
    const seats=await room.create(id,bound.authority);
    for (;;) {
      const head=await room.store.loadRoom(id), state=head.envelope.state;
      revision=head.stateRevision; stage='menu-r'+revision;
      const guard=state.characteristicStatusAbilityHistory?.find(r=>r.definitionId===guardian);
      const placed=state.officialBattlefieldAssetBindings?.find(r=>r.sourceDefinitionId===field || r.assetKind==='force_field');
      if(placed && !state.selectedRosterActivationWindow) {
        assert(guard); assert.equal(state.activeSideKey,'player2');
        const token=state.board.tokens.find(t=>t.tokenId===placed.assetId);
        assert.equal(token.baseDiameterMm,80);assert.deepEqual(token.coordinate,{x:12,y:9});
        const payments=state.log.flatMap(r=>r.events||[]).filter(e=>e.type==='ability_resource_paid');
        assert.deepEqual(payments.map(e=>[e.resourceType,e.resourceCost]),[['PE',1],['PE',1]]);
        stage='cold-replay';
        const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,id,head.envelope);
        await record('result',{version,revision,stateHash:head.envelope.stateHash,scene,payments,token,nextSeat:state.activeSideKey,actions,coldExact:true});
        console.log('verified Sentry field, shield, payment and cold replay',revision);break;
      }
      assert(revision<8);
      const side=state.activeSideKey, input={roomId:id,seatToken:seats[side].seatToken};
      const menu=await room.room.legalSpace(input);assert(menu.ok,menu.reason);
      const {finiteActions,parameterDomains}=menu.legalSpace;
      let row,parameters={};
      if(state.phase==='start_of_round') row=finiteActions.find(r=>r.action.actionType==='resolve_mission_start_of_round');
      else if(finiteActions.some(r=>r.action.actionType==='choose_first_actor')) row=finiteActions.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1');
      else if(!guard || !placed) {
        const def=guard?field:guardian, type=guard?'resolve_battlefield_asset_ability':'resolve_characteristic_status_ability';
        row=parameterDomains.find(r=>r.actionType===type&&r.definitionId===def&&r.pieceId==='sentry');
        assert(row, 'missing '+def);
        const schema=row.parameterSchema, paymentGroups=schema.paymentCardInstanceIdsByChoice?.default ?? schema.paymentCardInstanceIds?.enum;
        const pay=paymentGroups.find(ids=>ids.length===1);assert(pay);
        parameters={activeUnitId:'sentry',paymentCardInstanceIds:pay};
        if(def===guardian) assert.equal(schema.targetUnitId,null,'Guardian Shield is a caster aura');
        else {
          parameters.coordinate={xMilliInches:12000,yMilliInches:9000};
          stage='reject-overlap-r'+revision;
          const bad=await room.room.previewAction({...input,expectedStateRevision:revision,expectedStateHash:head.envelope.stateHash,
            expectedMatchBindingHash:head.envelope.matchBindingHash,expectedLegalSpaceHash:menu.legalSpace.legalSpaceHash,
            proposal:{kind:'parameterized',domainId:row.domainId,parameters:{...parameters,coordinate:{xMilliInches:12000,yMilliInches:4000}}}});
          assert.equal(bad.ok,false);assert(JSON.stringify(bad).includes('BATTLEFIELD_ASSET_FORCE_FIELD_POSITION_OCCUPIED'),JSON.stringify(bad));
          assert.equal((await room.store.loadRoom(id)).envelope.stateHash,head.envelope.stateHash);
          await record('rejected-overlap',{revision,stateHash:head.envelope.stateHash,reason:bad.reason,message:bad.message});
        }
      } else row=parameterDomains.find(r=>r.actionType==='finish_activation'&&r.pieceId==='sentry');
      assert(row,stage);stage=(row.action||row).actionType+'-r'+revision;
      const result=await room.commit({roomId:id,credential:seats[side],operationKey:stage,...(row.domainId
        ? {select:d=>d.domainId===row.domainId,parameters:()=>parameters}
        : {kind:'finite',select:r=>r.actionKey===row.actionKey})});
      const next=await room.store.loadRoom(id);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+next.stateRevision,{stage,postStateHash:next.envelope.stateHash,actionType:result.preview.core.action.actionType});
      console.log('signed',next.stateRevision,stage);
    }
  }finally{room.close();}
}catch(e){await record('stop-'+Date.now(),{stage,revision,reason:e.message,code:e.code,kind:e.failureKind,cause:e.cause?.message,detail:e.detail,stack:e.stack?.split('\n').slice(1,6)});throw e;}
