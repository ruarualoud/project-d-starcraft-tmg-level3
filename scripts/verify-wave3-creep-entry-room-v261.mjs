import assert from 'node:assert/strict';
import { resolveOfficialSelectedRosterDeployStartV1 } from '../packages/product-composition/official-selected-roster-spatial-action-runtime-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'creep-standard-entry-v261';
const dir = base + '/' + roomId;
const checkpoint = (name, value) => save(dir + '/' + name + '.json', value);
async function cached(name) {
  try { return await read(dir + '/' + name + '.json'); }
  catch (err) { if (err.code !== 'ENOENT') throw err; return null; }
}
const scenario = { conditionalRound: 2, phase: 'movement', twoHumanSeats: true,
  source: 'Hatchery placed by fielded Kerrigan at (16,4) in the same release',
  subject: 'Queen from ordinary table edge, no worm, beginning of a friendly activation' };

function prepareCardTurn(state) {
  Object.assign(state, {round: 2, stage: 'activation_phases', phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2'});
  state.phaseFirstActorByRound['2:movement'] = {round: 2, phase: 'movement', chosenFirstActorSideKey: 'player2', markerHolderSideKey: 'player2'};
  const source = state.pieces.find(p => p.id === 'kerrigan');
  assert.equal(source.models.length, 1);
  const position = {isOnField: true, xInches: 12, yInches: 4};
  Object.assign(source, position, {isInReserves: false, deploymentStatus: 'deployed', leadingModelId: source.models[0].id});
  Object.assign(source.models[0], position);
  state.reserveManifestBySide.player2.find(row => row.pieceId === source.id).deploymentStatus = 'deployed';
  delete state.selectedRosterActivationWindow;
  declareWave3EngineeringCoherencyV1(state, {planIdPrefix: roomId});
  initializeOfficialMatchRoundSupplyV1(state, true);
}

async function verifySeatHandoff({room, bound, authority, seats, entry}) {
  assert.equal(entry.roomId, roomId);
  assert.equal(entry.nextSeat, 'player2');
  assert(entry.nextActions.includes('finish_activation'));
  let head = await room.store.loadRoom(roomId);
  if (head.stateRevision === entry.revision) {
    assert.equal(head.envelope.stateHash, entry.stateHash);
    await room.commit({roomId, credential: seats.player2, operationKey: 'finish-queen-activation',
      choice: {actionType: 'finish_activation', pieceId: 'queen'}, parameters: () => ({})});
    head = await room.store.loadRoom(roomId);
  }
  assert.equal(head.stateRevision, entry.revision + 1);
  const bundle = await room.store.loadReplayBundle(roomId);
  const receipt = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').at(-1).payload.payload.receipt;
  assert.equal(receipt.preStateHash, entry.stateHash);
  assert.equal(receipt.action.actionType, 'finish_activation');
  assert.equal(receipt.applyingSeatKey, 'player2');
  assert.equal(head.envelope.state.activeSideKey, 'player1');
  assert.equal(head.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player2, entry.afterSupply);
  const menu = await room.room.legalSpace({roomId, seatToken: seats.player1.seatToken});
  assert(menu.ok, menu.reason);
  const nextActions = [...new Set([...menu.legalSpace.finiteActions.map(row => row.action), ...menu.legalSpace.parameterDomains]
    .filter(action => action.sideKey === 'player1').map(action => action.actionType))];
  assert(nextActions.length, 'no legal action for the receiving seat');
  const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, head.envelope);
  assert.deepEqual(actions, ['deploy', 'finish_activation']);
  await checkpoint('handoff', {roomId, revision: head.stateRevision, stateHash: head.envelope.stateHash,
    entryRevision: entry.revision, entryHash: entry.stateHash, submittedBy: receipt.applyingSeatKey,
    nextSeat: head.envelope.state.activeSideKey, nextActions, events: receipt.events.map(e => e.type),
    supply: head.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player2, actions, coldExact: true, providerCalls: 0});
  console.log('verified', roomId, 'handoff', head.stateRevision, nextActions);
}

let stage = 'compose', room;
try {
  const recipe = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
  const version = '2.61.0';
  const {state: opening} = prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion: version,
    releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes: recipe.recipes,
    missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
  const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial: opening,
    dir, candidateVersion: version, scenario, frozenRuntimeRef: (await cached('runtime')) ? dir + '/runtime.json' : undefined});
  room = bound.open();
  stage = 'source';
  const cardRoomId = roomId + '-card';
  const initial = structuredClone(opening);
  prepareCardTurn(initial);
  const cardSeats = await room.create(cardRoomId, bound.authorityFor(initial, {...scenario, subject: 'Hatchery card setup'}));
  if ((await room.store.loadRoom(cardRoomId)).stateRevision === 0) {
    await room.commit({roomId: cardRoomId, credential: cardSeats.player2, operationKey: 'place-creep',
      select: d => d.definitionId === 'card:hatchery/creep-spread-any@1' && d.pieceId === 'kerrigan',
      parameters: () => ({activeUnitId: 'kerrigan', paymentCardInstanceIds: [], coordinate: {xMilliInches: 16000, yMilliInches: 4000}})});
  }
  const parent = await room.store.loadRoom(cardRoomId);
  assert.equal(parent.stateRevision, 1);
  const state = structuredClone(parent.envelope.state);
  const tumor = state.board.tokens.find(t => t.tokenKind === 'creep_tumor');
  assert.deepEqual(tumor.coordinate, {x: 16, y: 4});
  const source = state.officialBattlefieldAssetBindings.find(b => b.assetId === tumor.tokenId);
  assert.equal(source.sourceDefinitionId, 'card:hatchery/creep-spread-any@1');
  assert.equal(source.assetHash, tumor.tokenHash);
  // This fixture starts a separate friendly activation. The token, card payment,
  // geometry, round supply and movement eligibility all come from the signed source room.
  state.activeSideKey = 'player2';
  delete state.selectedRosterActivationWindow;
  const authority = bound.authorityFor(state, {...scenario, signedSourceHash: parent.envelope.stateHash});
  const seats = await room.create(roomId, authority);
  const handoffRequested = process.argv.includes('--handoff');
  const saved = await cached(handoffRequested ? 'handoff' : 'result');
  if (saved) {
    stage = 'read_saved_receipt';
    const bundle = await room.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
      .map(row => row.payload.payload.receipt);
    assert.equal(saved.roomId, roomId);
    assert.equal(saved.coldExact, true);
    const expectedActions = handoffRequested ? ['deploy', 'finish_activation'] : ['deploy'];
    assert.equal(saved.revision, expectedActions.length);
    assert.deepEqual(saved.actions, expectedActions);
    assert.deepEqual(receipts.slice(0, saved.revision).map(row => row.action.actionType), expectedActions);
    assert.equal(receipts[saved.revision - 1].postStateHash, saved.stateHash);
    console.log('retained signed checkpoint', roomId, saved.revision);
  } else if (handoffRequested) {
    stage = 'activation_handoff';
    const entry = await cached('result');
    assert(entry?.coldExact, 'verify and save the signed deployment before exercising handoff');
    await verifySeatHandoff({room, bound, authority, seats, entry});
  } else {
    const input = {roomId, seatToken: seats.player2.seatToken};
    let head = await room.store.loadRoom(roomId);
    const beforeSupply = state.officialRoundSupplyState.onTableSupplyBySide.player2;
    const target = state.pieces.find(p => p.id === 'queen');
    assert.equal(target.isInReserves, true);
    let choice = await cached('choice');
    if (head.stateRevision === 0) {
      stage = 'ordinary_entry_menu';
      const menu = await room.room.legalSpace(input);
      assert(menu.ok, menu.reason);
      const domain = menu.legalSpace.parameterDomains.find(d => d.actionType === 'deploy' && d.pieceId === 'queen');
      assert(domain, 'Queen ordinary deployment absent from player menu');
      const edge = domain.constraints.entrySegments.find(e => e.side === 'bottom');
      assert(edge?.fullTableEdge && domain.parameterSchema.tokenDisplacements);
      assert.equal(domain.constraints.modelProfiles.length, 1);
      const leader = domain.constraints.modelProfiles[0];
      const along = Math.round(tumor.coordinate.x * 1000);
      const origin = resolveOfficialSelectedRosterDeployStartV1(domain, edge, along, leader);
      const budget = domain.constraints.maxDistanceMilliInches;
      const endpoint = {xMilliInches: along,
        yMilliInches: Math.min(Math.round(tumor.coordinate.y * 1000), origin.yMilliInches + budget)};
      await checkpoint('entry-geometry', {origin, endpoint, budget, marker: tumor.coordinate,
        leadModelId: leader.modelId, baseDepthMilliInches: leader.baseDepthMilliInches,
        entrySegmentId: edge.segmentId, stateHash: head.envelope.stateHash});
      const parameters = {entrySegmentId: edge.segmentId, entryAlongEdgeMilliInches: along,
        leadingModelId: leader.modelId, path: [endpoint], placements: []};
      const supplied = {stateHash: head.envelope.stateHash, domainId: domain.domainId, tokenId: tumor.tokenId,
        expectedSupply: domain.constraints.supply.requestedSupply, beforeSupply, parameters};
      if (choice) assert.equal(choice.domainId, domain.domainId);
      if (!(await cached('omitted'))) {
        stage = 'omit_token_choice';
        const rejection = await room.room.previewAction({...input, expectedStateRevision: 0,
          expectedStateHash: head.envelope.stateHash, expectedMatchBindingHash: head.envelope.matchBindingHash,
          expectedLegalSpaceHash: menu.legalSpace.legalSpaceHash, proposal: {kind: 'parameterized', domainId: domain.domainId, parameters}});
        assert.equal(rejection.ok, false);
        assert.match(String(rejection.rulesReason || rejection.message || rejection.reason), /PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED/);
        assert.equal((await room.store.loadRoom(roomId)).stateRevision, 0);
        await checkpoint('omitted', {...supplied, rulesReason: rejection.rulesReason || rejection.message, unchangedRevision: 0});
      }
      if (!choice) {
        stage = 'shared_displacement_query';
        const {projection} = await room.room.readRoom(input);
        const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore: room.store,
          rulesRuntime: bound.rulesRuntime, seatKey: 'player2'});
        const tools = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery: q => adapter.query(q)});
        const query = await tools.query({roomProjection: projection, legalSpace: menu.legalSpace,
          request: {queryKind: 'battlefield_token_displacement', arguments: {domainId: domain.domainId, parameters, tokenId: tumor.tokenId}}});
        await checkpoint('query', query);
        assert.equal(query.status, 'exact', query.reason);
        const evidence = query.result;
        assert.equal(evidence.tokenId, tumor.tokenId);
        assert.equal(evidence.domainId, domain.domainId);
        assert.equal(evidence.stateHash, head.envelope.stateHash);
        assert.equal(query.mayApply, false);
        assert.equal(evidence.solution.bestWitness?.baseContact, true);
        choice = {...supplied, coordinate: evidence.solution.bestWitness.coordinate, sourceQueryReceiptHash: query.queryReceiptHash};
        await checkpoint('choice', choice);
      }
      stage = 'signed_deploy';
      await room.commit({roomId, credential: seats.player2, operationKey: 'ordinary-deploy-on-tumor', select: d => d.domainId === domain.domainId,
        parameters: () => ({...parameters, tokenDisplacements: [{tokenId: tumor.tokenId, coordinate: choice.coordinate}]})});
      head = await room.store.loadRoom(roomId);
    }
    stage = 'successor_and_reopen';
    assert.equal(head.stateRevision, 1);
    const next = head.envelope.state;
    const actor = next.pieces.find(p => p.id === 'queen');
    assert.equal(actor.isOnField, true);
    assert.equal(actor.isInReserves, false);
    assert.equal(next.reserveManifestBySide.player2.find(row => row.pieceId === actor.id).deploymentStatus, 'deployed');
    assert.equal(next.officialRoundSupplyState.onTableSupplyBySide.player2, beforeSupply + choice.expectedSupply);
    const retained = next.board.tokens.find(t => t.tokenId === tumor.tokenId);
    assert.deepEqual(retained.coordinate, {x: choice.coordinate.xMilliInches / 1000, y: choice.coordinate.yMilliInches / 1000});
    const ledger = await room.store.loadReplayBundle(roomId);
    const receipt = ledger.privateJournal.find(e => e.payload.type === 'accepted_transition').payload.payload.receipt;
    const events = receipt.events;
    const movement = events.findIndex(e => e.type === 'unit_deploy_resolved');
    assert(movement >= 0 && events.findIndex(e => e.type === 'battlefield_token_displaced' && e.tokenId === tumor.tokenId) > movement);
    assert(!events.some(e => e.type === 'creep_tumor_removed' && e.tokenId === tumor.tokenId));
    const seat = next.activeSideKey;
    const successor = await room.room.legalSpace({roomId, seatToken: seats[seat].seatToken});
    assert(successor.ok, successor.reason);
    const nextActions = [...new Set([...successor.legalSpace.finiteActions.map(x=>x.action), ...successor.legalSpace.parameterDomains].map(x=>x.actionType))];
    assert(nextActions.length > 0);
    const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, head.envelope);
    await checkpoint('result', {version, scenario, roomId, sourceRoom: cardRoomId, parentHash: parent.envelope.stateHash,
      revision: 1, stateHash: head.envelope.stateHash, actions, eventTypes: events.map(e=>e.type), choice,
      afterSupply: next.officialRoundSupplyState.onTableSupplyBySide.player2, nextSeat: seat, nextActions,
      coldExact: true, providerCalls: 0});
    console.log('verified', roomId, actions, events.map(e=>e.type), nextActions);
  }
} catch (err) {
  await checkpoint('stop-' + Date.now(), {stage, reason: err.message, frames: err.stack?.split('\n').slice(0,4)});
  throw err;
} finally {room?.close();}
