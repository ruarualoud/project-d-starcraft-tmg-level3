import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { atomicWrite } from './lib/development-context.mjs';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const oldId = 'creep-disengage-v261';
const chargeId = 'creep-charge-v262';
const roomId = 'creep-close-ranks-v262';
const dir = base + '/' + roomId;
const actorId = 'nova_stealth_mode';
const enemyId = 'queen';
const record = (name, value) => save(dir + '/' + name + '.json', value);
const receiptList = bundle => bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
async function checkpoint(name) {
  try { return await read(dir + '/' + name + '.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
async function initialFrom(id) {
  const store = openWave3EngineeringStoreV1({directory: path.join(root, base, id), filename: 'room.sqlite', readOnly: true});
  try {
    const replay = await store.loadReplayBundle(id);
    const initial = replay.initialEnvelope;
    assert.equal(receiptList(replay)[0].preStateHash, initial.stateHash);
    return initial;
  } finally { store.close(); }
}
function fightInput(domain, state) {
  const actor = state.pieces.find(p => p.id === actorId);
  assert.equal(actor.models.length, 1);
  const point = (x, y) => ({ xMilliInches: x, yMilliInches: y, elevation: 'ground', supportTerrainIds: [] });
  const enemy = state.pieces.find(p => p.id === enemyId).models[0];
  assert.equal(enemy.xInches, 16);
  assert.equal(enemy.yInches, 2.425);
  const dice = domain.constraints.declineCloseRanksEffectiveRateOfAttack;
  assert(Number.isSafeInteger(dice) && dice > 0, 'current weapon rate missing');
  const required = domain.parameterSchema.required;
  return {closeRanksMode: 'move', leadingModelId: actor.models[0].id,
    path: [point(18450, 3250), point(18363, 2425)], placements: [], allocations: [{targetUnitId: enemyId, dice}],
    ...(required.includes('surgeTargetUnitId') ? {surgeTargetUnitId: enemyId} : {}),
    ...(required.includes('criticalTargetUnitId') ? {criticalTargetUnitId: enemyId} : {})};
}
async function settleOriginalFight(native, bound, seats) {
  const hit = await read(dir + '/result.json');
  assert(hit.coldExact && hit.attackEvents.includes('melee_hit_pool_rolled'));
  const file = path.join(root,dir,'attack-checkpoint-r'+hit.revision+'.json.gz');
  let checkpoint;
  try {
    checkpoint = JSON.parse(gunzipSync(await readFile(file)).toString());
  } catch(error) {
    if (error.code !== 'ENOENT') throw error;
    const head = await native.store.loadRoom(roomId);
    assert.equal(head.envelope.stateHash,hit.stateHash);
    const result = native.engine.createCheckpoint(head.envelope);
    assert(result.ok,result.reason);
    checkpoint = result.checkpoint;
    await atomicWrite(file,gzipSync(JSON.stringify(checkpoint)));
  }
  assert.equal(checkpoint.stateHash,hit.stateHash);
  assert.equal(checkpoint.stateRevision,hit.revision);
  for (;;) {
    const head = await native.store.loadRoom(roomId);
    const state = head.envelope.state;
    const receipts = receiptList(await native.store.loadReplayBundle(roomId));
    assert.equal(receipts[hit.revision - 1].postStateHash, hit.stateHash);
    const after = receipts.slice(hit.revision);
    if (after.at(-1)?.action.actionType === 'finish_activation') {
      const events = receipts.flatMap(r => r.events);
      assert.equal(events.filter(e => e.type === 'battlefield_token_displaced' && e.tokenId === hit.source.sourceTokenId).length, 1);
      assert(!events.some(e => e.type === 'creep_tumor_removed' && e.tokenId === hit.source.sourceTokenId));
      assert.deepEqual(state.board.tokens.find(t=>t.tokenId===hit.source.sourceTokenId).coordinate,hit.token);
      const attacks = events.filter(e=>e.type==='close_combat_attack' && e.pieceId===actorId);
      assert.equal(attacks.length,1);
      assert.equal(attacks[0].targetId,enemyId);
      assert.equal(state.activeSideKey,'player2');
      assert(!state.pendingAction && !state.pendingOfficialMeleePoolChoice && !state.pendingOfficialDisplacedCloseRanksFight);
      const journal = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,head.envelope,checkpoint);
      await record('fight-settled',{revision:head.stateRevision,stateHash:head.envelope.stateHash,coldExact:true,
        originalHitRevision:hit.revision,signedCheckpointHash:checkpoint.checkpointHash,replayedSuffix:after.map(r=>r.action.actionType),roundActions:journal,attack:attacks[0],
        remainingToken:hit.source.sourceTokenId,nextSeat:state.activeSideKey,providerCalls:0});
      return;
    }
    assert(after.length<12 && state.round===2 && state.phase==='combat');
    const side = state.activeSideKey;
    const m = await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(m.ok,m.reason);
    const {finiteActions,parameterDomains} = m.legalSpace;
    const finish = parameterDomains.find(d=>d.actionType==='finish_activation' && d.pieceId===actorId);
    let selected, parameters;
    if (finish && !state.pendingAction && !state.pendingOfficialMeleePoolChoice) {
      selected=finish;
      parameters={};
    } else if (finiteActions.length===1 && parameterDomains.length===0) {
      selected=finiteActions[0];
    } else {
      selected=parameterDomains.find(d=>d.actionType==='pass_reaction_family_window')
        || parameterDomains.find(d=>d.parameterSchema.required?.includes('casualtySelectionHash'))
        || parameterDomains.find(d=>d.constraints.mayDecline && d.parameterSchema.required?.length===1);
      assert(selected,'unexpected melee menu: '+ [...finiteActions.map(r=>r.action),...parameterDomains].map(r=>r.actionType).join(','));
      const field=selected.parameterSchema.required[0];
      parameters=selected.actionType==='pass_reaction_family_window'?{}:field==='casualtySelectionHash'
        ?{[field]:selected.parameterSchema[field].enum[0]}:{[field]:[]};
    }
    const kind=(selected.action||selected).actionType;
    const selection=selected.domainId?{select:d=>d.domainId===selected.domainId,parameters:()=>parameters}
      :{kind:'finite',select:r=>r.actionKey===selected.actionKey};
    await native.commit({roomId,credential:seats[side],operationKey:'r'+head.stateRevision+'-'+kind,...selection});
    const next=await native.store.loadRoom(roomId);
    assert.equal(next.stateRevision,head.stateRevision+1);
    await record('r'+head.stateRevision+'-'+kind,{side,kind,revision:next.stateRevision,preHash:head.envelope.stateHash,postHash:next.envelope.stateHash});
    console.log('signed',next.stateRevision,state.phase,kind);
  }
}

async function main() {
  let native, stage = 'source', revision;
  try {
    const old = await initialFrom(oldId);
    const release = await initialFrom(chargeId);
    const source = await read(base + '/' + chargeId + '/source.json');
    const recipe = await read(source.rosterRecipeRef);
    const state = structuredClone(old.state);
    assert.deepEqual(state.officialBattlefieldDisplacementSourceBundle, release.state.officialBattlefieldDisplacementSourceBundle);
    const tumor = state.board.tokens.find(t => t.tokenId === source.sourceTokenId);
    assert(tumor && tumor.tokenKind === 'creep_tumor');
    assert.equal(state.officialBattlefieldAssetBindings.find(b => b.assetId === tumor.tokenId).sourceDefinitionId,
      'card:hatchery/creep-spread-any@1');
    const edges = deriveOfficialEngagementGraphV2(state).modelEdges;
    assert(edges.some(e => [e.leftUnitId,e.rightUnitId].includes(actorId)
      && [e.leftUnitId,e.rightUnitId].includes(enemyId) && e.horizontalBaseGapMilliInches > 0));
    state.officialBattlefieldDisplacementPolicy = release.state.officialBattlefieldDisplacementPolicy;
    const scenario = {parentRoom: oldId, parentInitialHash: old.stateHash, versionRoom: chargeId, versionInitialHash: release.stateHash,
      changedStateKeys: ['officialBattlefieldDisplacementPolicy'], sourceTokenId: tumor.tokenId, actorId, enemyId};
    const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial: state, dir,
      candidateVersion: '2.62.0', frozenRuntimeRef: base + '/' + chargeId + '/runtime.json', scenario});
    native = bound.open();
    const seats = await native.create(roomId, bound.authority);
    if (process.argv.includes('--finish-combat')) {
      stage = 'settle-saved-fight';
      return await settleOriginalFight(native, bound, seats);
    }
    const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore: native.store, rulesRuntime: bound.rulesRuntime, seatKey: 'player1'});
    const queryTool = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery: q => adapter.query(q)});
    for (;;) {
      const head = await native.store.loadRoom(roomId);
      const current = head.envelope.state;
      revision = head.stateRevision;
      assert.equal(current.round, 2);
      const side = current.activeSideKey;
      const input = {roomId, seatToken: seats[side].seatToken};
      stage = 'menu-r' + revision;
      const {ok, legalSpace, reason} = await native.room.legalSpace(input);
      assert(ok, reason);
      const finite = kind => legalSpace.finiteActions.find(r => r.action.actionType === kind);
      const domain = kind => legalSpace.parameterDomains.find(r => r.actionType === kind && r.pieceId === actorId);
      const receipts = receiptList(await native.store.loadReplayBundle(roomId));
      const movement = receipts.find(r => r.events.some(e => e.type === 'close_ranks_movement_committed'));
      let selected, parameters;
      if (movement) {
        stage = 'fight-handoff-r' + revision;
        const types = movement.events.map(e => e.type);
        const pushed = movement.events.filter(e => e.type === 'battlefield_token_displaced' && e.tokenId === tumor.tokenId);
        assert.equal(pushed.length, 1);
        assert(types.indexOf('close_ranks_movement_committed') < types.indexOf('battlefield_token_displaced'));
        assert(!types.includes('creep_tumor_removed') && !types.includes('close_combat_attack'));
        const choice = await checkpoint('choice');
        const liveToken = current.board.tokens.find(t => t.tokenId === tumor.tokenId);
        assert.deepEqual(liveToken.coordinate, {x: choice.coordinate.xMilliInches / 1000, y: choice.coordinate.yMilliInches / 1000});
        if (current.pendingOfficialDisplacedCloseRanksFight) {
          selected = finite('fight');
          assert(selected && selected.action.pieceId === actorId);
          if (!(await checkpoint('movement'))) {
            const actions = await assertWave3StandardRoomColdReplayV1(bound, bound.authority, roomId, head.envelope);
            await record('movement', {revision, stateHash: head.envelope.stateHash, movementEvents: types, token: liveToken.coordinate,
              successor: selected.action.actionType, pendingParentHash: current.pendingOfficialDisplacedCloseRanksFight.parentHash, actions, coldExact: true});
          }
        } else {
          const after = receipts[receipts.indexOf(movement) + 1];
          assert.equal(after.action.actionType, 'fight');
          assert.equal(after.action.pieceId, actorId);
          assert.equal(after.preStateHash, movement.postStateHash);
          assert.equal(current.displacedCloseRanksFightHistory.length, 1);
          assert(!after.events.some(e => e.type === 'battlefield_token_displaced'));
          const actions = await assertWave3StandardRoomColdReplayV1(bound, bound.authority, roomId, head.envelope);
          await record('result', {revision, stateHash: head.envelope.stateHash, source: scenario, round: current.round,
            stage: current.phase, roundActions: actions, attackEvents: after.events.map(e => e.type), token: liveToken.coordinate,
            nextActions: [...new Set([...legalSpace.finiteActions.map(r=>r.action), ...legalSpace.parameterDomains].map(r=>r.actionType))],
            coldExact: true, providerCalls: 0});
          return;
        }
      } else if (!current.phaseFirstActorByRound['2:' + current.phase]) {
        selected = legalSpace.finiteActions.find(r => r.action.actionType === 'choose_first_actor' && r.action.chosenFirstActorSideKey === 'player1');
      } else if (current.phase !== 'combat') {
        selected = finite('pass');
      } else {
        stage = 'query-close-ranks-r' + revision;
        assert.equal(side, 'player1');
        selected = domain('fight');
        assert(selected, 'engaged Nova lacks her combat action');
        parameters = fightInput(selected, current);
        const identity = {domainId: selected.domainId, stateHash: head.envelope.stateHash, tokenId: tumor.tokenId};
        let choice = await checkpoint('choice');
        if (!choice) {
          const {projection} = await native.room.readRoom(input);
          const query = await queryTool.query({roomProjection: projection, legalSpace, request: {queryKind: 'battlefield_token_displacement',
            arguments: {domainId: selected.domainId, parameters, tokenId: tumor.tokenId}}});
          await record('query-' + revision + '-' + Date.now(), query);
          assert.equal(query.status, 'exact', query.reason);
          for (const [k,v] of Object.entries(identity)) assert.equal(query.result[k], v);
          choice = {...identity, coordinate: query.result.solution.bestWitness.coordinate, queryReceiptHash: query.queryReceiptHash};
          await record('choice', choice);
        }
        for (const [k,v] of Object.entries(identity)) assert.equal(choice[k], v);
        parameters.tokenDisplacements = [{tokenId: tumor.tokenId, coordinate: choice.coordinate}];
      }
      assert(selected && revision < 12, 'unexpected room menu ' + [current.phase,side,revision].join('/'));
      const kind = (selected.action || selected).actionType;
      stage = 'commit-' + kind + '-r' + revision;
      const selection = selected.domainId ? {select: d => d.domainId === selected.domainId, parameters: () => parameters}
        : {kind: 'finite', select: r => r.actionKey === selected.actionKey};
      await native.commit({roomId, credential: seats[side], operationKey: 'r' + revision + '-' + kind, ...selection});
      const next = await native.store.loadRoom(roomId);
      assert.equal(next.stateRevision, revision + 1);
      await record('r' + revision + '-' + kind, {side, kind, revision: next.stateRevision, preHash: head.envelope.stateHash, postHash: next.envelope.stateHash});
      console.log('signed', next.stateRevision, current.phase, kind);
    }
  } catch(error) {
    await record('stop-' + Date.now(), {stage, revision, reason: error.message});
    throw error;
  } finally { native?.close(); }
}
await main();
