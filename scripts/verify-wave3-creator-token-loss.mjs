import assert from 'node:assert/strict';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';
import {base,manifestRef,savedRoom,signedBranch,savedPosition} from './support/wave3-faq-room-v1.mjs';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext,restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {prepareOfficialReleaseRoomNativeActionsV2,officialReleaseRosterIncrementOptionsV2} from '../packages/product-composition/official-release-room-native-actions-v2.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {inspectOfficialCreatedTokensV1} from '../packages/rule-atoms/official-created-token-disposition-v1.mjs';
import {settleOfficialCreatedTokensV1} from '../packages/product-composition/official-created-token-settlement-v1.mjs';
import {projectOfficialDestroyedSourceTokenIdsV1} from '../packages/rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import {conditionWave3Casualties as casualties} from './support/wave3-condition-casualties-v1.mjs';

import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const version='2.99.7', out='build/ticket-28-wave3-creator-token-loss';
const z='build/ticket-28-zerg-wave3-20261117-v1/', both='build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287';
const remove='remove_on_destruction', retain='retain_stay_in_play', delayed='retain_delayed_effect', replace='replace_before_removal';
const room=(path,id)=>async()=>(await savedRoom(path,id)).head.state;
const checkpoint=path=>async()=>{const x=await read(path);return (x.envelope??x).state??x;};
const roomAt=(d,id)=>room(base+'/'+d,id);
const sentry=roomAt('sentry-field-standard-2.72','sentry-field-standard-2.72');
const swarm=checkpoint(z+'gestate-dark-swarm/checkpoint-r1.json');
const storms=room(both,'formal-storm-gale-order-287');
const tumors=checkpoint(base+'/creep-card-placement-assault-checkpoint.json');
const cases=[
 ['sentry',sentry,'unit:sentry/force-field-movement-phase@1',remove],
 ['adept',roomAt('adept-own-shade-standard-2.84','adept-own-shade-standard-2.84'),'unit:adept/psionic-transfer-movement-phase@1',remove],
 ['watchers',roomAt('nerazim-standard-hidden-loss-2.81','nerazim-standard-hidden-loss-2.81'),'unit:nerazim_watchers__adept_/psionic-transfer-movement-phase@1',remove],
 ['burrow',roomAt('ravager-deep-tunnel-v242/movement','ravager-tunnel-direct-movement'),'unit:ravager/deep-tunnel-movement-phase@1',remove],
 ['walls',checkpoint('build/ticket-28-protoss-wave3-20261120-v1/force-wall-cast/checkpoint-r1.json'),'unit:tassadar/force-wall-movement-phase@1',remove],
 ['dark-swarm',swarm,'unit:defiler/gestate-dark-swarm-movement-phase@1',remove],
 ['bomb',checkpoint(z+'bombard/removal-lifecycle/source-destroyed/movement/checkpoint-r1.json'),'unit:bile_launcher/bombard-movement-phase@1',replace],
 ['bomb-tumor',checkpoint(z+'bombard/removal-lifecycle/source-destroyed/removal/checkpoint-r2.json'),'unit:bile_launcher/bombard-movement-phase@1',retain],
 ['storm',storms,'unit:high_templar/psionic-storm-movement-phase@1',delayed],
 ['gale',storms,'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1',delayed],
 ['bile',checkpoint('build/ticket-28-wave2-capabilities-20261113-v1/corrosive-bile-producer/small/checkpoint-r1.json'),'unit:ravager/corrosive-bile-movement-phase@1',delayed],
 ['queen',checkpoint(base+'/queen-creep-placement-checkpoint.json'),'unit:queen/spawn-creep-tumor-any-phase@1',retain],
 ['hatchery',tumors,'card:hatchery/creep-spread-any@1',retain],
 ['overlord',tumors,'card:overlord/excrete-creep-any@1',retain],
];

function facts(s,def){
  for(const unitId of new Set(s.board.tokens.map(t=>t.createdByPieceId))){
    const q=inspectOfficialCreatedTokensV1(s,unitId), tokens=q.tokens.filter(t=>t.definitionId===def);
    if(tokens.length)return {unitId,tokens};
  }
  assert.fail('missing actual production placement: '+def);
}
async function matrix() {
  const rows=[];
  for(const [key,load,def,expected] of cases) {
    const original=await load(), s=structuredClone(original);
    // These individual captures predate the release switch. Keep their real paid effects and placement receipts.
    s.officialCreatorTokenLifecycle=true;
    const {unitId,tokens}=facts(s,def), protection=s.board.tokens.filter(t=>t.createdByPieceId!==unitId).map(t=>t.tokenHash);
    assert(tokens.every(t=>t.disposition===expected && t.sourceFeatureHash),def);
    const p=s.pieces.find(p=>p.id===unitId), partial=p.currentModels>1;
    if(partial){casualties(s,unitId,1);assert(!p.isDestroyed);settleOfficialCreatedTokensV1(s);assert.deepEqual(facts(s,def).tokens,tokens);}
    if(!p.isDestroyed)casualties(s,unitId,p.currentModels);
    assert.equal(p.currentModels,0);
    const legacy=projectOfficialDestroyedSourceTokenIdsV1(s.board.tokens,unitId,'tokenId');
    if(expected===delayed)assert(tokens.every(t=>legacy.removeBoardTokenIds.includes(t.tokenId)));
    settleOfficialCreatedTokensV1(s);
    for(const t of tokens)assert.equal(s.board.tokens.some(x=>x.tokenId===t.tokenId),expected!==remove,def);
    assert.deepEqual(s.board.tokens.filter(t=>t.createdByPieceId!==unitId).map(t=>t.tokenHash),protection);
    assert.deepEqual(settleOfficialCreatedTokensV1(s),[]);
    rows.push({key,definitionId:def,unitId,sourceStateHash:hash(original),tokens,partialLossChecked:partial,
      otherTokensUnchanged:protection.length,legacyWouldRemove:legacy.removeBoardTokenIds,after:s.board.tokens.map(t=>t.tokenId)});
    await save(out+'/matrix-progress.json',{rows,providerCalls:0});
  }
  return rows;
}
const context=await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
function upgrade(state,release=version) {
  return prepareOfficialReleaseRoomNativeActionsV2({context,state,useEquippedWeapons:true,includeReleasePhaseControl:true,
    ...officialReleaseRosterIncrementOptionsV2(release)}).state;
}
async function query(ctx,id){
  const h=await ctx.head(),side=h.state.activeSideKey??h.state.firstPlayerSideKey,seat={roomId:h.roomId,seatToken:ctx.seats[side].seatToken};
  const {projection}=await ctx.app.room.readRoom(seat),legalSpace=await ctx.menu();
  const scene=createStarcraftTmgSceneQueryServiceV1({roomStore:ctx.app.store,rulesRuntime:ctx.bound.rulesRuntime,seatKey:side});
  const r=await scene.query({roomProjection:projection,legalSpace,request:{queryKind:'token.creator_loss',arguments:{unitId:id}}});
  assert.equal(r.status,'exact',JSON.stringify([r.reason,r.details]));return {tokens:r.result.tokens,sourceDestroyed:r.result.sourceDestroyed,
    stateHash:h.stateHash,receiptHash:r.queryReceiptHash};
}
async function signedField(key='sentry'){
  const [,load,definitionId]=cases.find(row=>row[0]===key);
  const original=await load(), state=structuredClone(upgrade(original));
  const {unitId:source,tokens:[field]}=facts(state,definitionId);
  casualties(state,source,state.pieces.find(p=>p.id===source).currentModels);
  state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
  const dir=out+'/'+key,id='creator-loss-'+key;
  const scene={sourceStateHash:hash(original),condition:'all caster models lost via Native casualty domain immediately before current handoff'};
  return signedBranch({initial:state,state,dir,id,version,scene,async perform(ctx){
    const h=await ctx.head();if(h.stateRevision)return;
    const before=await query(ctx,source);assert.deepEqual(before.tokens,[field]);assert(before.sourceDestroyed);
    await save(dir+'/before.public.json',before);
    const menu=await ctx.menu(), pass=menu.finiteActions.find(r=>r.action.actionType==='pass');
    assert(pass,'handoff must be a real phase action');await ctx.commit(pass);
  },async verify(h,ctx){
    const after=await query(ctx,source);assert.deepEqual(after.tokens,[]);
    assert(!h.state.board.tokens.some(t=>t.tokenId===field.tokenId));
    if(field.tokenKind==='force_field'){
      assert(h.state.officialBattlefieldAssetBindings.find(b=>b.assetId===field.tokenId)?.consumed);
      assert(h.state.log.flatMap(l=>l.events??[]).some(e=>e.type==='created_token_removed_on_unit_destruction'&&e.tokenId===field.tokenId));
    } else {
      assert(!h.state.pendingPsionicTransferEffects?.some(e=>e.tokenId===field.tokenId));
    }
    return {field,after};
  }});
}
async function originalStormReproduction() {
  const dir=out+'/storms',id='creator-loss-storms';
  const original={dir:both,id:'formal-storm-gale-order-287',revision:8,version:'2.87.0'};
  const {journal}=await savedRoom(original.dir,original.id);
  const sourceHash=journal[original.revision-1].postStateHash;
  const resumed=await read(dir+'/before.public.json').then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
  const state=resumed ? (await savedRoom(dir,id)).initial.state : structuredClone(upgrade((await savedPosition(original)).state));
  const casters=state.officialPsionicStormCenters.map(c=>c.pieceId);
  const owners=[...new Set(casters)];
  assert.equal(owners.length,2);
  if(!resumed) {
    for(const unitId of owners)casualties(state,unitId,state.pieces.find(p=>p.id===unitId).currentModels);
    state.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state});
  }
  const scene={sourceRoom:original.id,sourceRevision:original.revision,sourceStateHash:sourceHash,
    condition:'Native last-model loss after paid placement; original coordinates, targets and pending effects retained'};
  return signedBranch({initial:state,state,dir,id,version,scene,async perform(ctx){
    for (;;) {
      const h=await ctx.head(), s=h.state;
      if(!h.stateRevision) {
        const receipts=[];
        for(const unitId of owners){
          const r=await query(ctx,unitId);
          assert(r.sourceDestroyed && r.tokens.length && r.tokens.every(t=>t.disposition==='retain_delayed_effect'));
          receipts.push(r);
        }
        await save(dir+'/before.public.json',receipts);
      }
      if(Number(s.round)>Number(state.round))break;
      assert(h.stateRevision<36,'unexpectedly long phase resolution');
      const {finiteActions:f,parameterDomains:d}=await ctx.menu();
      const fin = type => f.find(r=>r.action.actionType===type);
      const casualty=d.find(r=>r.parameterSchema.required?.some(k=>['casualtySelectionHash','casualtyModelIds',
        'convertedFailedArmourDieIndices','convertedFailedEvadeDieIndices'].includes(k)));
      const skip=d.find(r=>r.actionType==='pass_reaction_family_window');
      const effect=f.find(r=>['resolve_psionic_storm_movement_end','resolve_psionic_storm_assault_end','resolve_ordered_corrosive_bile_effect'].includes(r.action.actionType));
      const row=effect??casualty??skip??fin('pass_reaction_family_window')??fin('choose_first_actor')??fin('pass')
        ??(f.length===1?f[0]:null);
      assert(row,JSON.stringify([h.stateRevision,s.phase,f.map(r=>r.action.actionType),d.map(r=>[r.actionType,r.parameterSchema.required])]));
      await ctx.commit(row,casualty===row?poolParameters(casualty):{});
    }
  },async verify(h,ctx){
    const s=h.state, results=[];
    for(const unitId of owners){
      const r=await query(ctx,unitId);assert(r.sourceDestroyed);assert.equal(r.tokens.length,1);results.push(r);
    }
    const history=s.officialPsionicStormPhaseEndHistory.filter(e=>e.round===state.round);
    for(const a of state.officialPsionicStormCenters) for(const phase of ['movement','assault']) {
      assert(history.some(e=>e.anchorHash===a.anchorHash && e.phase===phase));
    }
    return {knownDefect:'both centers survived old round cleanup',results,phase:s.phase,round:s.round,history};
  }});
}
async function stormCleanup() {
  const parent=out+'/storms', oldId='creator-loss-storms', {journal,head}=await savedRoom(parent,oldId);
  const i=journal.findIndex(r=>r.action.actionType==='resolve_current_product_cleanup_refresh');
  assert(i>0 && head.state.board.tokens.filter(t=>t.tokenKind==='psionic_storm').length===2);
  const restore=await savedPosition({dir:parent,id:oldId,version,revision:i});
  const release='2.99.8',s=upgrade(restore.state,release), dir=out+'/storm-cleanup';
  const owners=s.officialPsionicStormCenters.map(a=>a.pieceId);
  const scene={sourceRoom:oldId,revision:i,stateHash:restore.stateHash,oldPostStateHash:journal[i].postStateHash};
  return signedBranch({dir,id:'creator-loss-cleanup',version:release,scene,initial:s,state:s,async perform(ctx){
    if((await ctx.head()).stateRevision)return;
    for(const owner of owners){const r=await query(ctx,owner);assert(r.sourceDestroyed && r.tokens.length===1);}
    const row=(await ctx.menu()).finiteActions.find(r=>r.action.actionType==='resolve_current_product_cleanup_refresh');
    assert(row);await ctx.commit(row);
  },async verify(h,ctx){
    const removed=h.state.officialPsionicStormCleanupHistory.at(-1);
    assert.deepEqual([...removed.removedTokenIds].sort(),s.officialPsionicStormCenters.map(a=>a.id).sort());
    assert.equal(h.state.officialPsionicStormCenters.length,0);
    const receipts=[];
    for(const owner of owners){const r=await query(ctx,owner);assert.deepEqual(r.tokens,[]);receipts.push(r);}
    const settled=s.officialPsionicStormPhaseEndHistory.filter(e=>e.round===s.round);
    for(const a of s.officialPsionicStormCenters)for(const phase of ['movement','assault']){
      assert(settled.some(e=>e.anchorHash===a.anchorHash&&e.phase===phase));
    }
    return {receipts,removed,phaseEffects:settled.map(e=>({phase:e.phase,anchorHash:e.anchorHash})),
      predecessorColdHash:restore.stateHash};
  }});
}
async function projector() {
  const dir=out+'/projectors',id='creator-loss-projectors', def='unit:sentry/solid-field-projectors-movement-phase@1';
  const ref=await read(base+'/templar-storm-gale-standard-2.76.0/coverage.json');
  const {recipes}=await read(base+'/sentry-field-standard-2.72/opening.json');
  recipes.player1.units.find(p=>p.unitInstanceId==='sentry').upgradeNames.push('Solid-Field Projectors');
  const scene={positions:{sentry:[12,4]},purpose:'paid alternative version of Force Field'};
  const state=await restoreOrPreparePositionedStandardOpening({dir,roomId:id,candidateVersion:version,scene,
    reference:{...ref,recipes,compareReadOnlyAdmission:true}});
  await signedBranch({dir,id,version,scene,initial:state,state,async perform(ctx){
    for(;;){
      const h=await ctx.head();
      if(h.state.officialBattlefieldAssetBindings?.some(b=>b.sourceDefinitionId===def)&&h.state.activeSideKey==='player2')break;
      assert(h.stateRevision<6);
      const space=await ctx.menu(),f=space.finiteActions,d=space.parameterDomains;
      const cast=d.find(r=>r.definitionId===def && r.actionType==='resolve_battlefield_asset_ability');
      const row=f.find(r=>r.action.actionType==='resolve_mission_start_of_round')??
        f.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey==='player1')??
        (!h.state.officialBattlefieldAssetBindings?.some(b=>b.sourceDefinitionId===def) && cast)??null;
      const selected=row||d.find(r=>r.actionType==='finish_activation'&&r.pieceId==='sentry');
      assert(selected,JSON.stringify(d.map(r=>r.definitionId)));
      await ctx.commit(selected,selected===cast?{activeUnitId:'sentry',coordinate:{xMilliInches:12000,yMilliInches:9000},
        paymentCardInstanceIds:cast.parameterSchema.paymentCardInstanceIdsByChoice.default[0]}:{});
    }
  },async verify(h,ctx){
    const result=await query(ctx,'sentry');
    assert(result.tokens.some(t=>t.definitionId===def&&t.disposition===remove));
    return {result};
  }});
  const head=(await savedRoom(dir,id)).head,stateAfter=structuredClone(head.state);
  casualties(stateAfter,'sentry',stateAfter.pieces.find(p=>p.id==='sentry').currentModels);
  stateAfter.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:stateAfter});
  await signedBranch({dir:dir+'-loss',id:id+'-loss',version,scene:{source:head.stateHash,condition:'last model lost'},initial:stateAfter,state:stateAfter,
    async perform(ctx){if(!(await ctx.head()).stateRevision)await ctx.commit((await ctx.menu()).finiteActions.find(r=>r.action.actionType==='pass'));},
    async verify(h,ctx){assert(h.state.officialBattlefieldAssetBindings.some(b=>b.sourceDefinitionId===def&&b.consumed));
      const result=await query(ctx,'sentry');assert.deepEqual(result.tokens,[]);return {result};}});
}
async function paidLoss() {
  const dir=out+'/paid-loss',id='creator-token-paid-loss';
  const ref=await read(base+'/templar-storm-gale-standard-2.76.0/coverage.json');
  const recipe=(await read(base+'/standard-plague-v251/opening.json')).recipes;
  const zerg=recipe.player2;
  zerg.tacticalCardRecordKeys=zerg.tacticalCardRecordKeys.map(k=>k==='tactical_cards:hatchery'?'tactical_cards:lair':k);
  zerg.units=zerg.units.filter(p=>p.unitInstanceId!=='ally');
  zerg.units.push({unitInstanceId:'ravager',recordKey:'army_units:ravager',compositionKind:'small',upgradeNames:[]});
  const scene={positions:{spec_ops_marauder__marauder_:[20.2,8],ravager:[16.65,8],defiler:[12,8]},
    purpose:'Lair and Corrosive Bile followed by actual paid Consume and phase-end outcomes'};
  const original=await restoreOrPreparePositionedStandardOpening({dir,roomId:id,candidateVersion:version,scene,
    reference:{...ref,recipes:recipe,compareReadOnlyAdmission:true}});
  const state=structuredClone(original);
  const lair='card:lair/creep-spread-any@1';
  return signedBranch({initial:state,state,dir,id,version,scene,async perform(ctx) {
    for (;;) {
      const h=await ctx.head(),s=h.state,space=await ctx.menu(), f=space.finiteActions,d=space.parameterDomains;
      const has=def=>s.officialBattlefieldAssetBindings?.some(b=>b.sourceDefinitionId===def);
      const assertBile=()=>facts(s,cases.find(c=>c[0]==='bile')[2]);
      const paid=s.officialConsumePaymentHistory?.find(e=>e.sacrificePieceId==='ravager');
      if(paid && s.phase==='combat')break;
      assert(h.stateRevision<40,'unexpectedly long sequence');
      let row,params={};
      const choose=(type,piece,def)=>d.find(r=>r.actionType===type&&(!piece||r.pieceId===piece)&&(!def||r.definitionId===def));
      const fin=type=>f.find(r=>r.action.actionType===type);
      const next='player2';
      row=fin('resolve_mission_start_of_round')??f.find(r=>r.action.actionType==='choose_first_actor' &&
        (r.action.chosenFirstActorSideKey??r.action.sourceAction?.chosenFirstActorSideKey)===next);
      if(!row && s.phase==='movement') {
        const cast=!has(lair)&&choose('resolve_battlefield_asset_ability','ravager',lair);
        const bile=!s.pendingCorrosiveBileEffects?.length && choose('set_corrosive_bile','ravager');
        if(cast) {
          row=cast;const x=row.parameterSchema;
          params={activeUnitId:row.pieceId,paymentCardInstanceIds:(x.paymentCardInstanceIdsByChoice?.default??x.paymentCardInstanceIds?.enum)[0],
            coordinate:{xMilliInches:16000,yMilliInches:4000}};
        }else if(bile) {
          row=bile;const model=s.pieces.find(p=>p.id==='ravager').models[0];
          params={paymentCardInstanceIds:row.parameterSchema.paymentCardInstanceIds.choices[0],
            placements:[{modelId:model.id,xMilliInches:20200,yMilliInches:10000}]};
        } else row=choose('finish_activation')??fin('pass');
      }
      if(!row && s.phase==='assault' && !paid) {
        assert(has(lair));assertBile();
        row=choose('cast_plague','defiler');
        if(row) {
          const coordinate={xMilliInches:20200,yMilliInches:8000},biomassToSpend=1;
          const q=ctx.bound.runtime.queryPlagueCoverage(s,'defiler',coordinate,biomassToSpend);
          const victim=q.payment.sacrifices.find(v=>v.pieceId==='ravager');assert(victim,'Ravager must be a legal payment');
          params={coordinate,biomassToSpend,paymentCardInstanceIds:q.payment.consumeCardPayments[0].cardInstanceIds,
            sacrificePieceId:'ravager',sacrificeModelId:victim.modelIds[0]};
          const receipts=[];
          receipts.push({unitId:'ravager',...await query(ctx,'ravager')});
          await save(dir+'/before-payment.public.json',{revision:h.stateRevision,receipts});
        }
      }
      if(!row) {
        const casualty=d.find(r=>r.parameterSchema.required?.some(k=>['casualtySelectionHash','casualtyModelIds','convertedFailedArmourDieIndices'].includes(k)));
        row=fin('resolve_ordered_corrosive_bile_effect')??casualty??choose('pass_reaction_family_window')??fin('pass_reaction_family_window')
          ??choose('finish_activation')??fin('pass')??(f.length===1?f[0]:null);
        if(row===casualty && casualty)params=poolParameters(row);
      }
      assert(row,JSON.stringify([h.stateRevision,s.phase,s.activeSideKey,f.map(r=>r.action.actionType),d.map(r=>[r.actionType,r.pieceId])]));
      await ctx.commit(row,params);
      if(params.sacrificePieceId) {
        const after=await ctx.head(),r=await query(ctx,'ravager');
        assert(r.sourceDestroyed && r.tokens.some(t=>t.disposition==='retain_delayed_effect'));
        assert(r.tokens.some(t=>t.definitionId===lair && t.disposition==='retain_stay_in_play'));
        assert(after.state.pendingCorrosiveBileEffects.some(e=>e.sourcePieceId==='ravager'));
        await save(dir+'/after-payment.public.json',r);
      }
    }
  },async verify(h,ctx){
    const s=h.state,after={};
    after.ravager=await query(ctx,'ravager');
    assert(after.ravager.sourceDestroyed && after.ravager.tokens.length===1);
    assert(after.ravager.tokens[0].definitionId===lair && after.ravager.tokens[0].stayInPlay);
    const events=s.log.flatMap(l=>l.events??[]);
    assert(events.some(e=>e.type.includes('corrosive_bile')&&e.removedTokenIds?.length));
    assert(s.officialConsumePaymentHistory.some(p=>p.sacrificePieceId==='ravager' && p.unitDestroyed));
    return {after,paidSacrifice:s.officialConsumePaymentHistory.find(e=>e.sacrificePieceId==='ravager').paymentReceiptHash,
      removalEvents:events.filter(e=>e.type==='created_token_removed_on_unit_destruction'||e.removedTokenIds?.length)};
  }});
}
// Use the current released Match constructor, then compare the per-seat result with the signed successor.
async function additionalRoom(key) {
  const release='2.99.8',dir=out+'/current-'+key,id='creator-current-'+key;
  const definition=cases.find(c=>c[0]===key)[2];
  const side='player2';
  const owner=({walls:'tassadar',queen:'player2-queen','dark-swarm':'defiler'})[key]??'ravager';
  const ref=await read(base+'/templar-standard-2.73.0/coverage.json');
  const positions={[owner]:[16,8]};
  let state,initialSource;
  if(key==='burrow') {
    const original=await cases.find(c=>c[0]===key)[1]();
    state=upgrade(original,release);
    initialSource=hash(original);
  } else {
    if(key!=='walls') {
      if(key==='queen'){
        const actual=await cases.find(c=>c[0]==='queen')[1]();
        const original=actual.armyBuildingConfigurationBySide;
        ref.recipes={player1:(await read(out+'/paid-loss/opening.json')).recipes.player1,
          player2:{...original.player2,tacticalCardRecordKeys:['tactical_cards:accelerating_creep','tactical_cards:hatchery'],
            units:original.player2.units.filter(u=>[owner,'player2-kerrigan','player2-roach','player2-swarmling'].includes(u.unitInstanceId))
              .map(u=>({...u,upgradeNames:[]}))}};
      }else{
        ref.recipes=(await read(out+'/paid-loss/opening.json')).recipes;
        const army=ref.recipes.player2;
        army.tacticalCardRecordKeys=army.tacticalCardRecordKeys.map(k=>k==='tactical_cards:lair'?'tactical_cards:hatchery':k);
        if(key==='overlord')army.tacticalCardRecordKeys.push('tactical_cards:overlord');
      }
    }
    state=await restoreOrPreparePositionedStandardOpening({dir,roomId:id,candidateVersion:release,
      scene:{positions},reference:{...ref,compareReadOnlyAdmission:true}});
  }
  const scene={positions,definition,initialSource:initialSource??hash(state)};
  await signedBranch({dir,id,version:release,initial:state,state,scene,async perform(ctx) {
    for(;;) {
      const h=await ctx.head(),s=h.state;
      const existing=inspectOfficialCreatedTokensV1(s,owner).tokens.some(t=>t.definitionId===definition);
      if(existing && s.activeSideKey!==side && !s.selectedRosterActivationWindow)break;
      assert(h.stateRevision<12,'placement did not hand off');
      const {finiteActions:f,parameterDomains:d}=await ctx.menu();
      let row=f.find(r=>r.action.actionType==='resolve_mission_start_of_round')??
        f.find(r=>r.action.actionType==='choose_first_actor'&&r.action.chosenFirstActorSideKey===side);
      let parameters={};
      if(!row && !existing && key==='overlord' && s.phase==='movement')row=f.find(r=>r.action.actionType==='pass');
      if(!row && existing)row=d.find(r=>r.pieceId===owner && r.actionType==='finish_activation')??f.find(r=>r.action.actionType==='pass');
      if(!row) {
        row=d.find(r=>r.pieceId===owner && r.definitionId===definition);
        assert(row,'missing '+definition+' in '+d.filter(r=>r.pieceId===owner).map(r=>r.definitionId).join(','));
        const schema=row.parameterSchema, p=s.pieces.find(u=>u.id===owner);
        const x=Math.round(p.xInches*1000),y=Math.round(p.yInches*1000);
        if(key!=='dark-swarm')parameters={activeUnitId:owner,paymentCardInstanceIds:(schema.paymentCardInstanceIdsByChoice?.default??schema.paymentCardInstanceIds?.enum)[0]};
        if(key==='walls')parameters.positions=[{xMilliInches:x+4000,yMilliInches:y,rotationDegrees:180},
          {xMilliInches:x+2000,yMilliInches:y+3000,rotationDegrees:90}];
        else if(key==='queen'){
          const paid=await cases.find(c=>c[0]==='queen')[1]();
          const t=paid.board.tokens.find(t=>t.createdByPieceId===owner);
          const m=paid.pieces.find(u=>u.id===owner).models[0];
          parameters.coordinate={xMilliInches:x+Math.round((t.coordinate.x-m.xInches)*1000),
            yMilliInches:y+Math.round((t.coordinate.y-m.yInches)*1000)};
        }else parameters.coordinate={xMilliInches:x,yMilliInches:y-4000};
      }
      await ctx.commit(row,parameters);
    }
  },async verify(h,ctx){
    const received=await query(ctx,owner);assert(!received.sourceDestroyed);
    const affected=received.tokens.filter(t=>t.definitionId===definition);
    assert.equal(affected.length,key==='walls'?2:1);return {received};
  }});
  const paid=(await savedRoom(dir,id)).head;
  const s=structuredClone(paid.state),p=s.pieces.find(u=>u.id===owner);
  const expected=inspectOfficialCreatedTokensV1(s,owner).tokens.filter(t=>t.definitionId===definition);
  casualties(s,owner,p.currentModels);s.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:s});
  await signedBranch({dir:dir+'-loss',id:id+'-loss',version:release,initial:s,state:s,scene:{paidRevision:paid.stateRevision,
    sourceStateHash:paid.stateHash,condition:'all creator models lost via native damage before next handoff'},async perform(ctx) {
    if(!(await ctx.head()).stateRevision) {
      const received=await query(ctx,owner);assert(received.sourceDestroyed);
      assert.deepEqual(received.tokens.filter(t=>t.definitionId===definition),expected);
      const pass=(await ctx.menu()).finiteActions.find(r=>r.action.actionType==='pass');
      assert(pass,'actual next seat must be allowed to pass');await ctx.commit(pass);
    }
  },async verify(h,ctx) {
    const after=await query(ctx,owner),retained=expected[0].disposition===retain;
    const ids=expected.map(t=>t.tokenId);
    assert(after.sourceDestroyed);assert.deepEqual(after.tokens.filter(t=>ids.includes(t.tokenId)),retained?expected:[]);
    assert.equal(h.state.board.tokens.filter(t=>ids.includes(t.tokenId)).length,retained?ids.length:0);
    if(key==='burrow')assert(!h.state.pendingPsionicTransferEffects?.some(e=>ids.includes(e.tokenId)));
    if(key==='walls')assert(h.state.officialBattlefieldAssetBindings.filter(b=>ids.includes(b.assetId)).every(b=>b.consumed));
    return {expected,after};
  }});
}
async function bombardBranch() {
  const release='2.99.9',source=base+'/standard-bombard-v247';
  const {head}=await savedRoom(source,'standard-bombard-v247-unused');
  const {head:replacement}=await savedRoom(source,'standard-bombard-v247-unused-agreed');
  const originalToken=head.state.board.tokens.find(t=>t.tokenKind==='bile_bomb');
  const ref=replacement.state.board.tokens.find(t=>t.tokenKind==='creep_tumor');
  assert(originalToken && ref && originalToken.createdByPieceId===ref.createdByPieceId);
  const previous=await savedRoom(out+'/current-bombard','creator-current-bombard');
  const owner=originalToken.createdByPieceId,s=upgrade(previous.initial.state,release);
  assert(s.pieces.find(p=>p.id===owner).isDestroyed);
  assert(!previous.head.state.pendingOfficialBombardReplacement && previous.head.state.board.tokens.some(t=>t.tokenId===originalToken.tokenId));
  const dir=out+'/bombard-replacement',scene={paidPlacement:head.stateHash,source:previous.initial.stateHash,
    oldPostStateHash:previous.head.stateHash,contactSource:replacement.stateHash};
  await signedBranch({dir,id:'creator-bombard-replacement',version:release,initial:s,state:s,scene,async perform(ctx) {
    for(;;) {
      const h=await ctx.head(),before=await query(ctx,owner);
      assert(before.sourceDestroyed);
      if(before.tokens.some(t=>t.disposition===retain))break;
      assert(h.stateRevision<3);assert.equal(before.tokens[0].tokenId,originalToken.tokenId);
      assert.equal(before.tokens[0].disposition,replace);
      await save(dir+'/before-r'+h.stateRevision+'.public.json',before);
      const menu=await ctx.menu(),change=menu.parameterDomains.find(d=>d.actionType==='replace_bile_bomb_with_creep');
      if(change)await ctx.commit(change,{coordinate:{xMilliInches:Math.round(1000*ref.coordinate.x),yMilliInches:Math.round(1000*ref.coordinate.y)}});
      else await ctx.commit(menu.finiteActions.find(r=>r.action.actionType==='pass'));
    }
  },async verify(h,ctx){
    const after=await query(ctx,owner);
    assert.equal(after.tokens.length,1);
    assert.equal(after.tokens[0].tokenKind,'creep_tumor');assert.equal(after.tokens[0].disposition,retain);
    assert.equal(after.tokens[0].definitionId,'unit:bile_launcher/bombard-movement-phase@1');
    const events=h.state.log.at(-1).events.map(e=>e.type);
    assert(events.includes('bombard_creep_tumor_set') && events.indexOf('bile_bomb_token_removed')>events.indexOf('bombard_creep_tumor_set'));
    return {after,events,originalTokenId:originalToken.tokenId};
  }});
}
async function archivedLifecycle() {
  const cases=[
    {dir:'gestate-dark-swarm/lifecycle/source-destroyed', owner:'defiler', expected:[[remove],[],[]]},
    {dir:'bombard/removal-lifecycle/source-destroyed/removal', owner:'bile', expected:[[replace],[replace],[retain],[retain]]},
  ];
  const comparisons=[];
  for(const {dir,owner,expected} of cases) {
    const source=z+dir, first=(await read(source+'/checkpoint-r0.json')).envelope;
    const {journal,head}=await savedRoom(source,first.roomId);
    const snapshots=[];
    for(const [r,dispositions] of expected.entries()) {
      const e=(await read(source+'/checkpoint-r'+r+'.json')).envelope;
      assert.equal(hash(e.state),e.stateHash);
      if(r)assert.equal(e.stateHash,journal[r-1].postStateHash);
      const s={...e.state,officialCreatorTokenLifecycle:true};
      const result=inspectOfficialCreatedTokensV1(s,owner);
      assert(result.sourceDestroyed);assert.deepEqual(result.tokens.map(t=>t.disposition),dispositions);
      const events=e.state.log.at(-1)?.events?.map(x=>x.type)??[];
      if(dir.startsWith('bombard')&&r===2) {
        assert(events.includes('bombard_creep_tumor_set'));
        assert(events.indexOf('bile_bomb_token_removed')>events.indexOf('bombard_creep_tumor_set'));
      }
      snapshots.push({revision:r,stateHash:e.stateHash,tokens:result.tokens,events});
    }
    assert.equal(snapshots.at(-1).stateHash,head.stateHash);
    comparisons.push({roomId:first.roomId,source,snapshots});
  }
  await save(out+'/archived-room-parity.public.json',{comparisons,providerCalls:0});
}
async function evidenceIndex() {
  const records=[];
  const add=(before,proof,source,detail)=>{
    assert(before.definitionId && before.sourceFeatureHash && proof.cold && proof.providerCalls===0);
    records.push({definitionId:before.definitionId,tokenKind:before.tokenKind,disposition:before.disposition,
      lifecycleWindows:before.lifecycleWindows,source,roomId:proof.roomId,revision:proof.revision,stateHash:proof.stateHash,
      version:proof.version,detail});
  };
  const result=key=>read(out+'/'+key+'/result.public.json');
  for(const key of ['sentry','adept','watchers']) {
    const p=await result(key);add(p.field,p,key,'removed at signed handoff');
  }
  add((await result('projectors')).result.tokens[0],await result('projectors-loss'),'projectors-loss','removed at signed handoff');
  for(const key of ['walls','burrow','dark-swarm','queen','hatchery','overlord']){
    const source='current-'+key+'-loss',p=await result(source);
    add(p.expected[0],p,source,p.expected.length+' placed token(s) checked against the successor');
  }
  const storm=await result('storm-cleanup');
  for(const owner of await read(out+'/storms/before.public.json'))add(owner.tokens[0],storm,'storm-cleanup','four combined phase resolutions and two centers cleared at round cleanup');
  const paid=await result('paid-loss');
  for(const t of (await read(out+'/paid-loss/before-payment.public.json')).receipts[0].tokens){
    add(t,paid,'paid-loss','one signed Consume death; both paid tokens retained until the phase effect was resolved');
  }
  const bomb=await result('bombard-replacement');
  add((await read(out+'/bombard-replacement/before-r0.public.json')).tokens[0],bomb,'bombard-replacement','contact placement precedes bomb removal');
  add(bomb.after.tokens[0],bomb,'bombard-replacement','replacement has its own STAY IN PLAY');
  assert.equal(new Set(records.map(r=>r.definitionId)).size,15);assert.equal(records.length,16);
  const matrix=await read(out+'/matrix.public.json');
  return save(out+'/verified-capabilities.public.json',{distinctAbilities:15,situations:records.length,
    partialModelLossControls:matrix.rows.filter(r=>r.partialLossChecked).length,records,providerCalls:0});
}
const mode=process.argv[2];
if(mode==='matrix')await save(out+'/matrix.public.json',{rows:await matrix(),providerCalls:0});
else if(['sentry','adept','watchers'].includes(mode))await signedField(mode);
else if(mode==='paid-loss')await paidLoss();
else if(mode==='projectors')await projector();
else if(mode==='storm-cleanup')await stormCleanup();
else if(mode==='storms')await originalStormReproduction();
else if(mode==='archived')await archivedLifecycle();
else if(mode==='index')await evidenceIndex();
else if(mode==='bombard')await bombardBranch();
else if(['walls','burrow','queen','hatchery','overlord','dark-swarm'].includes(mode))await additionalRoom(mode);
else throw Error('Expected matrix, archived, index, sentry, adept, watchers, projectors, paid-loss, storms, storm-cleanup, walls, burrow, queen, hatchery, overlord, dark-swarm or bombard');
