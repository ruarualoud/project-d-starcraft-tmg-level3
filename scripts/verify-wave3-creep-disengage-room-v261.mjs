import assert from 'node:assert/strict';
import path from 'node:path';
import {root, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1, declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {enumerateOfficialSelectedRosterRangedActionsV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {enumerateOfficialSelectedRosterMeleeActionsV1} from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {createStarcraftTmgSpatialActionQueryRuntimeV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parentId = 'creep-standard-entry-v261';
const parentDir = base + '/' + parentId;
const id = 'creep-disengage-v261';
const dir = base + '/' + id;
const mover = 'nova_stealth_mode';
const endpoint = {xMilliInches: 19425, yMilliInches: 2425};
const record = (name, value) => save(dir + '/' + name + '.json', value);
async function saved(name) {
  try { return await read(dir + '/' + name + '.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
const piece = (state, key) => state.pieces.find(p => p.id === key);
const edges = state => deriveOfficialEngagementGraphV2(state).modelEdges.filter(e => [e.leftUnitId, e.rightUnitId].includes(mover));

async function loadParent() {
  const certificate = await read(parentDir + '/handoff.json');
  const store = openWave3EngineeringStoreV1({directory: path.join(root, parentDir), filename: 'room.sqlite'});
  try {
    const {envelope} = await store.loadRoom(parentId);
    assert.equal(envelope.stateHash, certificate.stateHash);
    assert.equal(envelope.stateRevision, 2);
    assert.equal(certificate.coldExact, true);
    return envelope;
  } finally { store.close(); }
}

function composeScene(parent) {
  // Only the opponent's reserve placement is a declared scenario condition.
  // Turn, surviving tumor, its signed coordinate and Queen's activation come from the parent.
  const state = structuredClone(parent.state);
  const nova = piece(state, mover);
  assert(nova.isInReserves && nova.models.length === 1);
  const position = {isOnField: true, xInches: 17.9, yInches: 4.055};
  Object.assign(nova.models[0], position);
  Object.assign(nova, position, {isInReserves: false, deploymentStatus: 'deployed', leadingModelId: nova.models[0].id});
  state.reserveManifestBySide.player1.find(row => row.pieceId === mover).deploymentStatus = 'deployed';
  declareWave3EngineeringCoherencyV1(state, {planIdPrefix: id});
  state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state});
  assert.equal(state.activeSideKey, 'player1');
  assert.equal(state.round, 2);
  const engaged = edges(state);
  assert.equal(engaged.length, 1);
  assert([engaged[0].leftUnitId, engaged[0].rightUnitId].includes('queen'));
  return state;
}

async function verifyAssault(room, bound, authority, seats) {
  const outcome = await read(dir + '/outcome.json');
  const entry = await read(dir + '/result.json');
  assert(entry.coldExact && entry.stateHash === outcome.stateHash);
  const start = await room.store.loadReplayBundle(id);
  const first = start.privateJournal.find(e => e.payload.type === 'accepted_transition').payload.payload.receipt;
  assert.equal(first.postStateHash, entry.stateHash);
  assert.equal(first.action.actionType, 'disengage');
  // Finish the active unit, pass once per seat and choose Terran to act first.
  // Every step is selected from that seat's actual menu and saved individually.
  while (true) {
    const head = await room.store.loadRoom(id);
    const state = head.envelope.state;
    assert.equal(state.round, 2);
    assert(['movement','assault'].includes(state.phase));
    const side = state.activeSideKey;
    const menu = await room.room.legalSpace({roomId: id, seatToken: seats[side].seatToken});
    assert(menu.ok, menu.reason);
    const {finiteActions, parameterDomains} = menu.legalSpace;
    if (state.phase === 'assault' && state.phaseFirstActorByRound?.['2:assault']) {
      assert.equal(side, 'player1');
      const actor = piece(state, mover);
      assert.equal(actor.disengageAssaultRestriction.restrictionHash, outcome.restriction.restrictionHash);
      const own = [...finiteActions.map(row => row.action), ...parameterDomains].filter(row => row.pieceId === mover);
      const legal = [...new Set(own.map(row => row.actionType))];
      assert(legal.includes('run'), 'Nova should retain the option to Run');
      assert(!legal.includes('ranged_attack') && !legal.includes('charge'));
      const reasons = {};
      for (const [action, enumerate, expected] of [
        ['ranged_attack', enumerateOfficialSelectedRosterRangedActionsV1, 'SELECTED_RANGED_POST_DISENGAGE_PROHIBITED'],
        ['charge', enumerateOfficialSelectedRosterMeleeActionsV1, 'SELECTED_MELEE_POST_DISENGAGE_CHARGE_PROHIBITED'],
      ]) {
        const {candidates} = enumerate(state, {sideKey: side, includeDisabled: true});
        reasons[action] = [...new Set(candidates.filter(row => row.pieceId === mover && row.actionType === action)
          .map(row => row.disabledReason))];
        assert(reasons[action].includes(expected), action + ': ' + reasons[action]);
      }
      const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, id, head.envelope);
      await record('assault', {roomId: id, revision: head.stateRevision, stateHash: head.envelope.stateHash, round: state.round,
        phase: state.phase, side, restrictionHash: actor.disengageAssaultRestriction.restrictionHash, legal, reasons,
        actions, coldExact: true, providerCalls: 0});
      console.log('verified assault menu', head.stateRevision, legal, reasons);
      return;
    }
    assert(head.stateRevision < entry.revision + 4, 'declared turn path exceeded its four actions');
    const finish = parameterDomains.find(row => row.actionType === 'finish_activation' && row.pieceId === mover);
    const step = state.phase === 'movement' ? (finish || finiteActions.find(row => row.action.actionType === 'pass'))
      : finiteActions.find(row => row.action.actionType === 'choose_first_actor' && row.action.chosenFirstActorSideKey === 'player1');
    const options = [...finiteActions.map(row => row.action.actionType), ...parameterDomains.map(row => row.actionType)];
    assert(step, 'missing phase successor: ' + side + ' ' + state.phase + ' ' + [...new Set(options)].join(', '));
    const request = step.domainId ? {select: row => row.domainId === step.domainId, parameters: () => ({})}
      : {kind: 'finite', select: row => row.actionKey === step.actionKey};
    const action = step.action || step;
    const key = 'assault-followup-r' + head.stateRevision + '-' + action.actionType;
    const {result} = await room.commit({roomId: id, credential: seats[side], operationKey: key, ...request});
    const next = await room.store.loadRoom(id);
    assert.equal(next.stateRevision, head.stateRevision + 1);
    await record(key, {side, action: action.actionType, preStateHash: head.envelope.stateHash, revision: next.stateRevision,
      postStateHash: next.envelope.stateHash, phase: next.envelope.state.phase, nextSeat: next.envelope.state.activeSideKey,
      applied: result.ok});
  }
}

let room, stage = 'frozen_parent';
try {
  const parent = await loadParent();
  const scene = composeScene(parent);
  const tumor = scene.board.tokens.find(t => t.tokenKind === 'creep_tumor');
  assert.deepEqual(tumor.coordinate, {x: 18.126, y: 2.425});
  const binding = scene.officialBattlefieldAssetBindings.find(b => b.assetId === tumor.tokenId);
  assert.equal(binding.sourceDefinitionId, 'card:hatchery/creep-spread-any@1');
  assert.equal(binding.assetHash, tumor.tokenHash);
  const scenario = {parentId, parentRevision: 2, parentHash: parent.stateHash, conditionedPiece: mover,
    declaredPositionInches: [17.9, 4.055], sourceTokenId: tumor.tokenId, endpoint};
  const recipe = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  stage = 'runtime';
  const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial: parent.state, dir,
    candidateVersion: '2.61.0', frozenRuntimeRef: parentDir + '/runtime.json', scenario});
  const authority = bound.authorityFor(scene, scenario);
  room = bound.open();
  const seats = await room.create(id, authority);
  const assaultRequested = process.argv.includes('--assault');
  const previous = await saved(assaultRequested ? 'assault' : 'result');
  if (previous) {
    const replay = await room.store.loadReplayBundle(id);
    const receipts = replay.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
    assert.equal(previous.roomId, id);
    assert.equal(previous.coldExact, true);
    assert.deepEqual(receipts.slice(0, previous.revision).map(r => r.action.actionType), previous.actions);
    assert.equal(receipts[previous.revision - 1].postStateHash, previous.stateHash);
    console.log('retained signed checkpoint', id, previous.revision);
  } else if (assaultRequested) {
    stage = 'assault_followup';
    await verifyAssault(room, bound, authority, seats);
  } else {
    const input = {roomId: id, seatToken: seats.player1.seatToken};
    let head = await room.store.loadRoom(id);
    if (head.stateRevision === 0) {
      stage = 'disengage_menu';
      const menu = await room.room.legalSpace(input);
      assert(menu.ok, menu.reason);
      const options = menu.legalSpace.parameterDomains.filter(d => d.pieceId === mover);
      const domain = options.find(d => d.actionType === 'disengage');
      assert(domain, 'engaged Nova must have a disengage action');
      assert(!options.some(d => d.actionType === 'move'));
      assert.deepEqual(domain.constraints.engagedEnemyUnitIds, ['queen']);
      const parameters = {leadingModelId: piece(scene, mover).models[0].id, path: [endpoint], placements: []};
      const identity = {stateHash: head.envelope.stateHash, domainId: domain.domainId, tokenId: tumor.tokenId};
      await record('menu', {...identity, scenario, actions: options.map(d => d.actionType),
        gapMilliInches: edges(scene)[0].horizontalBaseGapMilliInches, speedMilliInches: domain.constraints.maxDistanceMilliInches});
      if (!(await saved('missing-choice'))) {
        stage = 'omitted_token';
        const rejected = await room.room.previewAction({...input, expectedStateRevision: 0, expectedStateHash: identity.stateHash,
          expectedMatchBindingHash: head.envelope.matchBindingHash, expectedLegalSpaceHash: menu.legalSpace.legalSpaceHash,
          proposal: {kind: 'parameterized', domainId: domain.domainId, parameters}});
        assert.equal(rejected.ok, false);
        const reason = rejected.rulesReason || rejected.message || rejected.reason;
        assert.equal(reason, 'PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED');
        assert.equal((await room.store.loadRoom(id)).stateRevision, 0);
        await record('missing-choice', {...identity, reason, unchangedRevision: 0});
      }
      let choice = await saved('choice');
      if (!choice) {
        stage = 'spatial_query';
        const {projection} = await room.room.readRoom(input);
        const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore: room.store, rulesRuntime: bound.rulesRuntime, seatKey: 'player1'});
        const tool = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery: q => adapter.query(q)});
        const query = await tool.query({roomProjection: projection, legalSpace: menu.legalSpace,
          request: {queryKind: 'battlefield_token_displacement', arguments: {domainId: domain.domainId, parameters, tokenId: tumor.tokenId}}});
        await record('query', query);
        assert.equal(query.status, 'exact', query.reason);
        for (const [key, value] of Object.entries(identity)) assert.equal(query.result[key], value);
        assert.equal(query.result.solution.bestWitness.baseContact, true);
        assert.equal(query.mayApply, false);
        choice = {...identity, coordinate: query.result.solution.bestWitness.coordinate, receiptHash: query.queryReceiptHash};
        await record('choice', choice);
      }
      for (const [key, value] of Object.entries(identity)) assert.equal(choice[key], value);
      stage = 'signed_disengage';
      await room.commit({roomId: id, credential: seats.player1, operationKey: 'leave-queen-on-creep',
        select: d => d.domainId === domain.domainId, parameters: () => ({...parameters,
          tokenDisplacements: [{tokenId: tumor.tokenId, coordinate: choice.coordinate}]})});
      head = await room.store.loadRoom(id);
    }
    stage = 'signed_outcome';
    assert.equal(head.stateRevision, 1);
    const state = head.envelope.state;
    const actor = piece(state, mover);
    assert.equal(edges(state).length, 0);
    assert.deepEqual([actor.models[0].xInches, actor.models[0].yInches], [19.425, 2.425]);
    const restriction = actor.disengageAssaultRestriction;
    assert.deepEqual(restriction.engagedEnemyUnitIds, ['queen']);
    assert.equal(restriction.ownEffectiveSupply, 1);
    assert.equal(restriction.combinedEnemyEffectiveSupply, 1);
    assert.equal(restriction.rangedAttackProhibited, true);
    assert.equal(restriction.chargeProhibited, true);
    const replay = await room.store.loadReplayBundle(id);
    const receipt = replay.privateJournal.find(e => e.payload.type === 'accepted_transition').payload.payload.receipt;
    const events = receipt.events;
    const ordered = events.filter(e => ['unit_disengage_resolved','battlefield_token_displaced','creep_tumor_removed'].includes(e.type));
    assert.deepEqual(ordered.map(e => e.type), ['unit_disengage_resolved','battlefield_token_displaced','creep_tumor_removed']);
    assert(ordered.slice(1).every(e => e.tokenId === tumor.tokenId));
    assert.equal(ordered[2].triggeringActionType, 'disengage');
    assert(!state.board.tokens.some(t => t.tokenId === tumor.tokenId));
    assert.deepEqual(state.officialRoundSupplyState.onTableSupplyBySide, scene.officialRoundSupplyState.onTableSupplyBySide);
    const side = state.activeSideKey;
    const successor = await room.room.legalSpace({roomId: id, seatToken: seats[side].seatToken});
    assert(successor.ok, successor.reason);
    const actions = [...new Set([...successor.legalSpace.finiteActions.map(r => r.action), ...successor.legalSpace.parameterDomains]
      .filter(d => d.sideKey === side).map(d => d.actionType))];
    assert(actions.length);
    await record('outcome', {roomId: id, parentHash: parent.stateHash, stateHash: head.envelope.stateHash, revision: 1,
      scenario, movementDistance: ordered[0].distanceTravelledInches, events: ordered, restriction, nextSeat: side, nextActions: actions});
    stage = 'cold_replay';
    const signed = await assertWave3StandardRoomColdReplayV1(bound, authority, id, head.envelope);
    assert.deepEqual(signed, ['disengage']);
    await record('result', {roomId: id, revision: 1, stateHash: head.envelope.stateHash, actions: signed, coldExact: true, providerCalls: 0});
    console.log('verified', id, signed, side, actions);
  }
} catch (error) {
  await record('stop-' + Date.now(), {stage, reason: error.message, cause: error.cause?.message});
  throw error;
} finally { room?.close(); }
