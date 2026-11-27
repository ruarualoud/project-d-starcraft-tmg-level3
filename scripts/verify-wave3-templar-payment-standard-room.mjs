import assert from 'node:assert/strict';
import path from 'node:path';
import { access } from 'node:fs/promises';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const version = '2.66.0';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
// Keep the study identity and its saved attempts across the 2.65 → 2.66 source fix.
const id = 'templar-payment-v265';
const dir = base + '/' + id;
const record = (name, data) => save(dir + '/' + name + '.json', data);
const reference = await read(base + '/templar-standard-2.65.0/coverage.json');
const caster = 'large-templar', target = 'small-templar';
const farsight = 'unit:high_templar/farsight-movement-phase@1';
const feedback = 'unit:high_templar/feedback-movement-phase@1';
const scene = { conditioned: 'two deployed Psionic units on opposing seats before the round-start action',
  firstRound: 1, mapMissionSource: reference.mission, deploymentSource: reference.deployment,
  deploymentsPlayed: false, largeOrigin: [12, 4], smallOrigin: [17, 4] };
const piece = (state, pieceId) => state.pieces.find(p => p.id === pieceId);
function army(side, compositionKind, unitInstanceId) {
  return { factionRecordKey: 'tactical_cards:daelaam', tacticalCardRecordKeys: compositionKind==='large' ? ['tactical_cards:templar_archives'] : [], units: [
    {unitInstanceId, recordKey:'army_units:high_templar', compositionKind, upgradeNames:['Farsight']},
    {unitInstanceId:side + '-zealot', recordKey:'army_units:zealot', compositionKind:'small', upgradeNames:[]},
  ] };
}
async function initialState() {
  const location = path.join(root,dir);
  if (await access(path.join(location,'room.sqlite')).then(()=>true, e=>{if(e.code!=='ENOENT') throw e; return false;})) {
    const store = openWave3EngineeringStoreV1({directory:location,filename:'room.sqlite',readOnly:true});
    try {
      const bundle = await store.loadReplayBundle(id);
      if (bundle?.initialEnvelope) return bundle.initialEnvelope.state;
    } finally {store.close();}
  }
  const context = await resolveWave3StandardContext(await read(reference.manifestRef),'area_ability_inputs');
  const recipes = {player1:army('p1','large',caster), player2:army('p2','small',target)};
  const opening = prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:version, releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,recipes,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:reference.mission,deploymentRecordKey:reference.deployment});
  const state = structuredClone(opening.state);
  assert.equal(state.phase, 'start_of_round');
  for (const [who,origin,models,supply] of [[caster,scene.largeOrigin,4,2],[target,scene.smallOrigin,2,1]]) {
    const p = piece(state,who);
    assert.equal(p.currentSupply,supply);
    assert.equal(p.models.length,models);
    Object.assign(p,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',
      leadingModelId:p.models[0].id,xInches:origin[0],yInches:origin[1]});
    for (const [i,m] of p.models.entries()) Object.assign(m,{isOnField:true,xInches:origin[0]+1.6*(i%2),yInches:origin[1]+1.6*Math.floor(i/2)});
    state.reserveManifestBySide[p.sideKey].find(row=>row.pieceId===who).deploymentStatus='deployed';
  }
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:id+'-'});
  await record('opening',{version,recipes,scene,units:state.pieces.map(p=>({id:p.id,side:p.sideKey,supply:p.currentSupply,models:p.currentModels})),
    pendingNativeDefinitionIds:opening.pendingNativeDefinitionIds,providerCalls:0});
  assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
  return state;
}
let stage='opening', revision;
try {
  const initial = await initialState();
  stage='match-binding';
  const bound=await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  const room=bound.open();
  try {
    const seats=await room.create(id,bound.authority);
    for (;;) {
      const head=await room.store.loadRoom(id), state=head.envelope.state;
      // Turn cleanup belongs to the first player after both activation seats have passed.
      const side=state.activeSideKey ?? (state.phase==='cleanup' ? state.firstPlayerSideKey : null);
      assert(seats[side], 'no authorized seat for ' + state.phase + ' at r' + head.stateRevision);
      revision=head.stateRevision;stage='legal-r'+revision;
      const input={roomId:id,seatToken:seats[side].seatToken};
      const menu=await room.room.legalSpace(input);
      assert(menu.ok,menu.reason);
      const {finiteActions,parameterDomains}=menu.legalSpace;
      const finite=finiteActions.map(r=>r.action.actionType);
      const slim={revision,side,round:state.round,phase:state.phase,stage:state.stage, lifecycle:state.currentProductMatchLifecycle?.step,
        stateHash:head.envelope.stateHash,finite:[...new Set(finite)],domains:parameterDomains.map(d=>({action:d.actionType,actor:d.pieceId,id:d.definitionId,
          ...(d.definitionId===farsight||d.definitionId===feedback?{cost:d.constraints.resourceCostsByChoice?.default?.effectiveResourceCost,
            targets:d.parameterSchema.targetUnitId?.enum,payments:d.parameterSchema.paymentCardInstanceIds?.enum}: {})}))};
      await record('menu-r'+revision,slim);
      const history = state.characteristicStatusAbilityHistory || [];
      const cast = (round, actor, definitionId) => history.find(h=>h.round===round && h.pieceId===actor && h.definitionId===definitionId);
      const paid = h => h?.events.find(e=>e.type==='ability_resource_paid')?.resourceCost;
      const archiveId = 'card:templar_archives/ancestral-wisdom-any@1';
      const archive = state.cardResources.player1.find(card=>card.officialCardRecordKey==='tactical_cards:templar_archives');
      const act = 'resolve_characteristic_status_ability', intent = 'request_ancestral_wisdom_payment';
      const domain = (type,actor,def) => parameterDomains.find(d=>d.actionType===type
        && (!actor || d.pieceId===actor) && (!def || d.definitionId===def));
      let choice, parameters = {}, step;
      function selectCast(actor, def, cost, type=act) {
        choice=domain(type,actor,def);
        assert(choice, 'missing ' + type + '/' + actor + '/' + def + ' at r' + revision);
        assert.equal(choice.constraints.resourceCostsByChoice.default.effectiveResourceCost,cost);
        const group=choice.parameterSchema.paymentCardInstanceIds.enum.find(ids=>ids.length===cost && !ids.includes(archive?.cardInstanceId));
        assert(group,'missing exact PE payment');
        parameters={activeUnitId:actor,targetUnitId:def===feedback?target:actor,paymentCardInstanceIds:group};
        step=type+'_'+actor+'_'+def.split('/')[1].split('@')[0];
      }
      const priority=finiteActions.find(r=>r.action.actionType==='choose_first_actor' && r.action.chosenFirstActorSideKey==='player1');
      const eligibleReply = state.pendingOfficialReactionWindow;
      if(state.round===2 && cast(2,caster,feedback) && !state.selectedRosterActivationWindow) {
        const allEvents=state.log.flatMap(r=>r.events||[]);
        assert.equal(paid(cast(1,caster,farsight)),0);
        assert.equal(paid(cast(1,caster,feedback)),1);
        assert.equal(paid(cast(1,target,farsight)),1);
        assert.equal(paid(cast(2,caster,farsight)),0);
        assert.equal(paid(cast(2,caster,feedback)),0);
        const hits=allEvents.filter(e=>e.type==='feedback_non_lethal_damage');
        assert.equal(hits.length,1);
        assert.equal(hits[0].targetPieceId,target);
        assert.equal(hits[0].resolution.nonLethalDamage,3);
        assert.deepEqual(hits[0].resolution.casualtyModelIds,[]);
        assert.equal(piece(state,target).currentModels,2);
        const redeemed=allEvents.filter(e=>e.type==='ancestral_wisdom_payment_consumed');
        assert.equal(redeemed.length,1);
        assert.equal(redeemed[0].sourceCardInstanceId,archive.cardInstanceId);
        assert.equal(archive.readiness,'ready');
        assert.equal(side,'player2');
        stage='cold-replay';
        const actions=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,id,head.envelope);
        await record('result',{version,scene,round:state.round,phase:state.phase,revision,stateHash:head.envelope.stateHash,
          supply:{large:piece(state,caster).currentSupply,small:piece(state,target).currentSupply},
          payments:history.map(h=>({round:h.round,actor:h.pieceId,definitionId:h.definitionId,paidPE:paid(h)})),
          feedback:{target,nonLethal:3,modelsAfter:piece(state,target).currentModels},archiveRemainsReady:true,
          nextSeat:side,actions,coldExact:true,providerCalls:0});
        console.log('verified two-round payment, Feedback, Archives, and cold replay', revision);
        break;
      }
      if(state.phase==='start_of_round'||state.phase==='cleanup'){
        assert.equal(finiteActions.length,1,'expected a single system successor '+finite);
        choice=finiteActions[0];
      } else if(priority) {
        choice=priority;
      } else if(eligibleReply && state.pendingOfficialAncestralWisdomPayment) {
        if(side==='player1' && !(state.officialReactionHistory||[]).some(h=>h.round===state.round && h.definitionId===archiveId)) {
          choice=domain('resolve_reaction_family_ability',null,archiveId);
          parameters={paymentCardInstanceIds:[]};
        } else choice=domain('pass_reaction_family_window');
      } else if(state.phase==='movement' && side==='player1' && !cast(state.round,caster,farsight)) {
        if(state.round===2) assert.equal(state.officialOurMindsFirstAbilityByUnit?.[caster],undefined);
        selectCast(caster,farsight,0);
      } else if(state.phase==='movement' && side==='player1' && !cast(state.round,caster,feedback)){
        if(state.round===1){
          assert(domain(intent,caster,feedback),'Archives option alongside ordinary cost');
          selectCast(caster,feedback,1);
        }else if(state.pendingOfficialAncestralWisdomPayment?.stage==='authorized'){
          selectCast(caster,feedback,0);
        }else{
          assert.equal(domain(act,caster,feedback)?.constraints.resourceCostsByChoice.default.effectiveResourceCost,1);
          selectCast(caster,feedback,0,intent);
        }
      } else if(state.round===1 && state.phase==='movement' && side==='player2' && !cast(1,target,farsight)){
        assert(cast(1,caster,feedback),'target must already be marked');
        selectCast(target,farsight,1);
      } else if(state.selectedRosterActivationWindow) {
        choice=domain('finish_activation',state.selectedRosterActivationWindow.pieceId);
      } else {
        choice=finiteActions.find(r=>r.action.actionType==='pass');
      }
      assert(choice && revision<40,'unexpected successor ' + JSON.stringify([revision,side,state.phase,finite]));
      step??=(choice.action||choice).actionType;
      stage=step+'-r'+revision;
      const submit=choice.domainId?{select:d=>d.domainId===choice.domainId,parameters:()=>parameters}
        :{kind:'finite',select:r=>r.actionKey===choice.actionKey};
      await room.commit({roomId:id,credential:seats[side],operationKey:stage,...submit});
      const next=await room.store.loadRoom(id);
      assert.equal(next.stateRevision,revision+1);
      const events=next.envelope.state.log.at(-1)?.events || [];
      await record('r'+next.stateRevision,{step,side,round:state.round,phase:state.phase,pre:head.envelope.stateHash,
        post:next.envelope.stateHash,events:events.map(e=>e.type),payments:events.filter(e=>e.type==='ability_resource_paid').map(e=>e.resourceCost)});
      console.log('signed',next.stateRevision,step);
    }
  } finally {room.close();}
} catch(e){await record('stop-'+Date.now(),{stage,revision,reason:e.message,detail:e.detail,stack:e.stack?.split('\n').slice(1,6)});throw e;}
