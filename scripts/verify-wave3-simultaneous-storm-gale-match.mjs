import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { restoreOrPreparePositionedStandardOpening, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 }
  from './support/wave3-standard-action-room-v1.mjs';

const version = '2.87.0';
const roomId = 'formal-storm-gale-order-287';
const dir = 'build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287';
const reference = await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.76.0/coverage.json');
const twilight = 'twilight_templar__high_templar_';
const storm = 'high_templar';
const scene = {providerCalls: 0, positions: {[storm]: [16,4], [twilight]: [11,4], marine: [23,4]},
  formationOffsets: {marine: [[0,0],[-1,0],[1,0],[0,1],[-1,1],[1,1]]}};
const recipes = structuredClone(reference.recipes);
recipes.player2.tacticalCardRecordKeys.push('tactical_cards:gateway');
// The original two cards paid 1 PE for Storm and had only 1 PE remaining.
// Gateway adds the third point through the roster factory and one definition.
const qualified = {...reference, recipes, total: reference.total + 1};
function castAtLegalCenter(runtime, state, caster, payment) {
  const centers = caster === storm ? [[20000,4000]] : [
    [18800,6000], [20000,6600], [20000,1300], [18500,1600], [15000,1000],
  ];
  const refusals = [];
  for (const [xMilliInches,yMilliInches] of centers) {
    const coordinate = {xMilliInches,yMilliInches};
    try {
      const preview = runtime.queryPsionicStormCast(state,caster,{coordinate,paymentCardInstanceIds:payment});
      return {preview, refusals};
    } catch(error) {
      if (!/^PSIONIC_STORM_(TOKEN_OVERLAPS_|CAST_OUT_OF_RANGE$|CAST_NO_LINE_OF_SIGHT$)/u.test(error.message)) throw error;
      refusals.push({coordinate, reason:error.message});
    }
  }
  throw Error('Named spell center proposals exhausted: '+JSON.stringify(refusals));
}
let revision;
let stage = 'official product opening';
try {
  const initial = await restoreOrPreparePositionedStandardOpening({dir, roomId, reference: qualified, candidateVersion: version, scene});
  const binding = await bindWave3StandardActionRoom({manifestRef: reference.manifestRef, initial, dir, candidateVersion: version, scenario: scene});
  const native = binding.open();
  try {
    const seats = await native.create(roomId, binding.authority);
    for (;;) {
      const head = (await native.store.loadRoom(roomId)).envelope;
      const state = head.state, side = state.activeSideKey;
      revision = head.stateRevision;
      if (state.phase === 'combat') {
        const order = await read(dir + '/order.public.json');
        const replay = await native.store.loadReplayBundle(roomId);
        const signed = replay.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
        const chosen = signed.map(r=>r.action).filter(a=>a.actionType === 'resolve_psionic_storm_assault_end');
        assert.deepEqual(chosen.map(a=>a.pieceId), [twilight,storm]);
        const receipts = await assertWave3StandardRoomColdReplayV1(binding, binding.authority, roomId, head);
        await save(dir + '/result.public.json',{version,revision,stateHash:head.stateHash, bothOffered: order.choices,
          chosenOrder: chosen.map(a=>a.abilityName), nextPhase: state.phase, receipts, cold: true, providerCalls: 0});
        break;
      }
      assert(revision < 27, 'phase did not close in the expected action range');
      const menu = await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(menu.ok, menu.message);
      const {parameterDomains: domains,finiteActions: actions} = menu.legalSpace;
      const finite = name => actions.find(a=>a.action.actionType === name);
      const anchors = state.officialPsionicStormCenters ?? [];
      const casters = new Set(anchors.map(a=>a.pieceId));
      const nextCaster = [storm, twilight].find(id=>!casters.has(id));
      const finish = domains.find(d=>d.actionType === 'finish_activation' && casters.has(d.pieceId));
      const casualty = domains.find(d=>d.actionType==='choose_direct_ability_damage_casualties');
      const spells = actions.filter(a=>a.action.actionType === 'resolve_psionic_storm_assault_end');
      let domain, choice, parameters = {};
      if (finite('resolve_mission_start_of_round')) choice = finite('resolve_mission_start_of_round');
      else if (finite('choose_first_actor')) choice = actions.find(a=>a.action.chosenFirstActorSideKey==='player2');
      else if (state.pendingOfficialReactionWindow?.triggerKind === 'friendly_supply_reduced') {
        const window = state.pendingOfficialReactionWindow;
        assert.equal(window.prioritySideKeys[window.priorityIndex],side);
        domain = domains.find(d=>d.actionType==='pass_reaction_family_window');
        assert(domain,'expected explicit option to decline the supply-loss reaction');
        await save(dir+'/supply-reaction-r'+revision+'.public.json',{revision,side,stateHash:head.stateHash,
          trigger:window.triggerKind,offered:domains.map(d=>d.definitionId??d.actionType),choice:domain.actionType});
      }
      else if (casualty) {
        domain = casualty;
        const [selection] = domain.parameterSchema.casualtySelectionHash.enum;
        assert(selection);
        parameters = {casualtySelectionHash:selection};
      } else if (spells.length) {
        if (spells.length === 2) {
          assert.equal(side,'player2');
          assert.deepEqual(new Set(spells.map(a=>a.action.pieceId)),new Set([twilight,storm]));
          choice = spells.find(a=>a.action.pieceId===twilight);
          await save(dir + '/order.public.json',{revision,stateHash:head.stateHash,side,choices:spells.map(a=>a.action.abilityName),first:choice.action.abilityName});
        } else {
          assert.equal(spells.length,1);
          assert.equal(spells[0].action.pieceId,storm,'two effects must first be offered together');
          choice = spells[0];
        }
      } else if (finite('resolve_psionic_storm_movement_end')) choice = finite('resolve_psionic_storm_movement_end');
      else if (finite('complete_psionic_storm_assault_phase')) choice = finite('complete_psionic_storm_assault_phase');
      else if (finish) domain = finish;
      else if (state.phase==='movement' && side==='player2' && nextCaster) {
        domain = domains.find(d=>d.pieceId===nextCaster && d.actionType==='cast_psionic_storm');
        assert(domain,'expected legal cast by '+nextCaster);
        const payment = domain.constraints.payments.find(p=>p.length);
        assert(payment,'missing printed payment');
        stage = 'qualify '+nextCaster+' at r'+revision;
        const {preview,refusals} = castAtLegalCenter(binding.runtime,state,nextCaster,payment);
        parameters = preview.result.canonicalParameters;
        await save(dir+'/cast-'+nextCaster+'.public.json',{revision,stateHash:head.stateHash,caster:nextCaster,
          parameters,queryReceipt:preview.queryReceiptHash,refusals});
      } else if (finite('pass') && ['movement','assault'].includes(state.phase)) choice = finite('pass');
      assert(choice || domain, 'unexpected menu '+JSON.stringify([...actions.map(a=>a.action.actionType),...domains.map(d=>d.actionType)]));
      const type = domain?.actionType ?? choice.action.actionType;
      stage = type+' at r'+revision;
      await native.commit({roomId,credential:seats[side],operationKey:'r'+revision+'-'+type,
        ...(domain ? {select:d=>d.domainId===domain.domainId,parameters:()=>parameters} : {kind:'finite',select:a=>a.actionKey===choice.actionKey})});
    }
  } finally {native.close();}
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,reason:error.message});
  throw error;
}
