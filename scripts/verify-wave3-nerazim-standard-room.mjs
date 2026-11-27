import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import {
  assertWave3StandardRoomColdReplayV1, bindWave3StandardActionRoom, restoreOrPreparePositionedStandardOpening,
} from './support/wave3-standard-action-room-v1.mjs';

const version = '2.81.0';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'nerazim-standard-hidden-loss-2.81';
const dir = base + '/' + roomId;
const reference = await read(base + '/nerazim-standard-' + version + '/coverage.json');
const might = 'card:nerazim/might-of-the-nerazim-any@1';
const vision = 'unit:zeratul/prophetic-vision-any-phase@1';
const scene = {
  deploymentConditioned: true, providerCalls: 0,
  positions: { watchers2: [12,4], zeratul1: [26,4] },
  formationOffsets: { watchers2: [[0,0],[1,0],[0,1],[-1,0]] },
  shadeCenter: {xMilliInches:18000, yMilliInches:4000}, moveEnd: {xMilliInches:24000, yMilliInches:4000},
};
const record = (key,data) => save(dir + '/' + key + '.json',data);
function payment(domain) {
  const schema = domain.parameterSchema;
  const field = schema.paymentCardInstanceIds ?? schema.properties?.paymentCardInstanceIds;
  const cards = field?.const ?? (field?.choices ?? field?.enum)?.find(selected => selected.length);
  assert(Array.isArray(cards), 'public menu must provide a payable selection');
  return cards;
}
let stage = 'formal-opening', revision;
try {
  assert.equal(reference.total,reference.exact);
  const initial = await restoreOrPreparePositionedStandardOpening({dir,roomId,reference,candidateVersion:version,scene});
  stage = 'bind-match';
  const bound = await bindWave3StandardActionRoom({manifestRef:reference.manifestRef,initial,dir,candidateVersion:version,scenario:scene});
  const room = bound.open();
  try {
    const seats = await room.create(roomId,bound.authority);
    for (;;) {
      const head = await room.store.loadRoom(roomId);
      const state = head.envelope.state, side = state.activeSideKey;
      revision = head.stateRevision;
      const events = state.log.flatMap(entry => entry.events ?? []);
      const loss = events.find(e => e.type === 'nerazim_farsight_hidden_lost');
      const shade = events.find(e => e.type === 'psionic_transfer_shade_set');
      const resolution = events.filter(e => e.type === 'reaction_ability_resolved' && e.definitionId === might);
      const window = state.selectedRosterActivationWindow;
      if (resolution.length && !state.pendingOfficialReactionWindow && !window) {
        stage = 'verify-effects-and-cold-replay';
        assert.equal(side,'player2');
        assert.equal(resolution.length,1);
        assert.equal(resolution[0].sideKey,'player1');
        assert.equal(shade.pieceId,'watchers2');
        assert.equal(shade.resourceCost,1);
        assert.equal(loss.targetPieceId,'zeratul1');
        assert.equal(loss.sourcePieceId,'watchers2');
        assert.equal(loss.tokenId,shade.tokenId);
        assert.equal(state.pieces.find(p => p.id === 'zeratul1').models[0].xInches,24);
        assert(!events.some(e => e.type === 'reaction_ability_resolved' && e.definitionId === vision));
        assert.equal(state.cardResources.player1.find(c=>c.officialCardRecordKey==='tactical_cards:nerazim').readiness,'exhausted');
        const actions = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope);
        await record('result',{version,revision,round:state.round,phase:state.phase,nextSeat:side,actions,
          shade,loss,might:resolution[0],stateHash:head.envelope.stateHash,coldExact:true,providerCalls:0});
        console.log('verified signed Shade, Hidden loss and Might',revision);
        break;
      }
      stage = 'public-menu-r' + revision;
      const response = await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
      assert(response.ok,response.message);
      const {parameterDomains:domains,finiteActions:finite} = response.legalSpace;
      let row = finite.find(f => f.action.actionType==='resolve_mission_start_of_round'
        || f.action.actionType==='choose_first_actor' && f.action.chosenFirstActorSideKey==='player2');
      let params = {};
      if (!row && state.pendingOfficialReactionWindow) {
        assert.equal(state.pendingOfficialReactionWindow.triggerKind,'hidden_lost');
        if (side==='player1' && !resolution.length) {
          row = domains.find(d=>d.actionType==='resolve_reaction_family_ability' && d.definitionId===might);
          assert(row,'Might must be available after losing Hidden');
          params = {paymentCardInstanceIds:payment(row)};
        } else row = domains.find(d=>d.actionType==='pass_reaction_family_window');
      } else if (!row && window && (shade?.pieceId===window.pieceId || loss?.targetPieceId===window.pieceId)) {
        row = domains.find(d=>d.actionType==='finish_activation' && d.pieceId===window.pieceId);
      } else if (!row && !shade) {
        assert.equal(side,'player2');
        row = domains.find(d=>d.actionType==='set_psionic_transfer_shade' && d.pieceId==='watchers2');
        assert(row,'Watchers must have their own Shade menu');
        params = {coordinate:scene.shadeCenter,paymentCardInstanceIds:payment(row)};
      } else if (!row && !loss) {
        assert.equal(side,'player1');
        row = domains.find(d=>d.actionType==='move' && d.pieceId==='zeratul1');
        params = {leadingModelId:state.pieces.find(p=>p.id==='zeratul1').leadingModelId,path:[scene.moveEnd],placements:[]};
      }
      assert(row && revision < 13, JSON.stringify({side,revision,window:window?.stage,domains:domains.map(d=>[d.actionType,d.pieceId,d.definitionId]).slice(0,14)}));
      const action = (row.action ?? row).actionType;
      stage = action + '-r' + revision;
      await room.commit({roomId,credential:seats[side],operationKey:stage,...(row.domainId
        ? {select:d=>d.domainId===row.domainId,parameters:()=>params}
        : {kind:'finite',select:f=>f.actionKey===row.actionKey})});
      const next = await room.store.loadRoom(roomId);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+next.stateRevision,{action,side,stateHash:next.envelope.stateHash});
      console.log('signed',next.stateRevision,action);
    }
  } finally { room.close(); }
} catch(error) {
  await record('stop-'+Date.now(),{stage,revision,reason:error.message,stack:error.stack?.split('\n').slice(1,5)});
  throw error;
}
