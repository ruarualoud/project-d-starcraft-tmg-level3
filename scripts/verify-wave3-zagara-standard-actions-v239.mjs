import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out = base + '/zagara-standard-admission-v239';
const arm = process.argv[2];
assert(['drop', 'brood', 'swarm'].includes(arm));
const sourceRef = out + '/factory-state.json', dir = out + '/' + arm, roomId = 'zagara-standard-' + arm;
const side = 'player2', unit = (state, id) => state.pieces.find(p => p.id === id);
const initial = await read(sourceRef);
function setMovement(state, round) {
  state.round = round;
  state.phase = 'movement';
  state.stage = 'activation_phases';
  state.firstPlayerSideKey = state.activeSideKey = side;
  state.phaseFirstActorByRound[round + ':movement'] = { round, phase: 'movement', chosenFirstActorSideKey: side, markerHolderSideKey: side };
}
function setSupply(state) {
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: state.supplyLossLedger.rulesRuntimeHash });
  for (const owner of ['player1', 'player2']) state.players[owner].supply = state.officialRoundSupplyState.supplyPoolBySide[owner];
}
setMovement(initial, 1);
for (const [id, x, y] of [['zagara', 10, 10], ...(arm !== 'drop' ? [['defiler', 25, 10]] : [])]) {
  const piece = unit(initial, id);
  assert.equal(piece.models.length, 1);
  Object.assign(piece, { xInches: x, yInches: y, isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  Object.assign(piece.models[0], { isOnField: true, xInches: x, yInches: y });
  initial.reserveManifestBySide[side].find(row => row.pieceId === id).deploymentStatus = 'deployed';
}
declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
setSupply(initial);
const { open, authority, runtime } = await bindWave3StandardActionRoom({ manifestRef: base + '/tabletop-raven-m01-v1/manifest.json',
  initial, dir, candidateVersion: '2.39.0', scenario: { sourceRef, arm, declaredMovementPhase: true, signedRoomActions: true } });
const local = segment => segment.definitionId === 'unit:zagara/infested-drop-movement-phase@1';
const broodId = 'unit:zagara/broodmother-movement-phase@1';
const native = open();
try {
  const seats = await native.create(roomId, authority);
  const request = { roomId, credential: seats[side], operationKey: arm };
  const original = (await native.store.loadReplayBundle(roomId)).initialEnvelope.state;
  async function finishSwarmMove(applied, geometryQuery = null) {
    const placement = await read(dir + '/placement.json');
    const resolution = applied.preview.core.action.sourceAction.sourceAction;
    const [selection] = resolution.tokenDisplacements;
    const [evidence] = resolution.evidence;
    assert.equal(selection.tokenId, placement.tokenId);
    assert.equal(evidence.tokenId, selection.tokenId);
    assert.equal(applied.preview.core.preStateHash, placement.stateHash);
    const after = await native.store.loadRoom(roomId), done = after.envelope.state;
    const token = done.board.tokens.find(t => t.tokenId === selection.tokenId);
    assert.equal(token.tokenHash, evidence.tokenHash);
    assert.deepEqual(token.coordinate, { x: selection.coordinate.xMilliInches / 1000, y: selection.coordinate.yMilliInches / 1000 });
    assert.notDeepEqual(token.coordinate, placement.coordinate);
    assert(runtime.enumerate(done).parameterDomains.some(d => d.actionType === 'finish_activation' && d.pieceId === 'defiler'));
    await save(dir + '/result.json', { revision: after.stateRevision, tokenId: token.tokenId,
      before: placement.coordinate, after: token.coordinate, geometryResultHash: evidence.resultHash,
      ...(geometryQuery ? { moveQueryReceipt: geometryQuery.queryReceiptHash } : {}),
      geometryBaseContact: evidence.baseContact, followUp: 'finish_activation', signedPreviewMatchesToken: true });
  }
  const resumeMove = arm === 'swarm' && process.argv.includes('--resume-move');
  const menu = resumeMove ? null : runtime.enumerate(original, { sideKey: side });
  if (arm === 'drop') {
    const domain = menu.parameterDomains.find(d => d.actionType === 'deploy' && d.pieceId === 'defiler');
    assert(domain);
    const edge = domain.constraints.entrySegments.find(local);
    assert.equal(edge?.remainingSupply, 1);
    assert.equal(domain.constraints.supply.requestedSupply, 1);
    assert.equal(edge.generatesZoneOfInfluence, false);
    const leader = domain.constraints.modelProfiles[0];
    const parameters = { leadingModelId: leader.modelId, entrySegmentId: edge.segmentId, entryAlongEdgeMilliInches: 0,
      path: [{ xMilliInches: edge.center.xMilliInches + edge.radiusMilliInches + Math.round(leader.baseWidthMilliInches / 2) + 1200,
        yMilliInches: edge.center.yMilliInches, elevation: 'ground' }], placements: [] };
    const preview = runtime.instantiate(original, domain, parameters);
    assert.throws(() => runtime.instantiate(original, domain, { ...parameters,
      path: [{ ...parameters.path[0], xMilliInches: edge.center.xMilliInches }] }), /COLLISION/);
    const accepted = await native.commit({ ...request, choice: { actionType: 'deploy', pieceId: 'defiler' }, parameters: () => parameters });
    assert.deepEqual(accepted.preview.core.action, preview.action);
    const after = await native.store.loadRoom(roomId), done = after.envelope.state;
    const event = done.spatialActionHistory.at(-1).event;
    assert.equal(event.entrySource.sourcePieceId, 'zagara');
    assert.equal(event.entrySource.committedSupply, 1);
    assert.equal(event.movementActivated, true);
    assert.equal(unit(done, 'defiler').isOnField, true);
    await save(dir + '/result.json', { revision: after.stateRevision, source: event.entrySource,
      position: [unit(done, 'defiler').models[0].xInches, unit(done, 'defiler').models[0].yInches], collisionRejected: true,
      previewEqualsApply: true, successor: runtime.enumerate(done).parameterDomains.map(d => d.actionType) });
  } else if (arm === 'brood') {
    const domain = menu.parameterDomains.find(d => d.definitionId === broodId
      && d.constraints.resourceCostsByChoice.default.effectiveResourceCost === 1);
    assert.deepEqual(domain?.parameterSchema.broodmotherEffect.enum, ['impact', 'critical_hit', 'tough']);
    const payment = domain.parameterSchema.paymentCardInstanceIds.enum.find(cards => cards.length === 1);
    assert(payment);
    const parameters = { activeUnitId: 'zagara', broodmotherEffect: 'critical_hit', paymentCardInstanceIds: payment };
    await native.commit({ ...request, select: d => d.domainId === domain.domainId, parameters: () => parameters });
    const after = await native.store.loadRoom(roomId), done = after.envelope.state;
    const events = done.log.at(-1).events, effect = events.find(e => e.type === 'broodmother_effect_applied');
    assert.deepEqual(effect.affectedPieceIds, ['defiler']);
    assert.equal(events.find(e => e.type === 'ability_resource_paid').resourceCost, 1);
    for (const kind of ['ranged', 'close_combat']) {
      const projection = runtime.queryWeaponCharacteristics(done, 'defiler', { attackKind: kind, weaponName: 'Claws' });
      assert.equal(projection.result.criticalHit, 1);
      assert.equal(runtime.queryWeaponCharacteristics(done, 'zagara', { attackKind: kind, weaponName: 'Claws' }).result.criticalHit, 0);
    }
    assert(!runtime.enumerate(done).parameterDomains.some(d => d.definitionId === broodId));
    // Project the next movement phase from the signed use history. No fabricated round transition is committed.
    const later = structuredClone(done);
    delete later.selectedRosterActivationWindow;
    setMovement(later, 2);
    later.supplyLossLedger = createOfficialSupplyLossLedgerV1({ round: 2, rulesRuntimeHash: done.supplyLossLedger.rulesRuntimeHash });
    setSupply(later);
    for (const card of later.cardResources[side]) card.readiness = 'ready';
    const nextChoices = runtime.enumerate(later).parameterDomains.find(d => d.definitionId === broodId)?.parameterSchema.broodmotherEffect.enum;
    assert.deepEqual(nextChoices, ['impact', 'tough']);
    await save(dir + '/result.json', { revision: after.stateRevision, effect, paidBM: 1, alliedDistanceInches: 15,
      actualNextMenu: runtime.enumerate(done).parameterDomains.map(d => d.actionType), projectedRound2Choices: nextChoices });
  } else if (resumeMove) {
    assert.equal((await native.store.loadRoom(roomId)).stateRevision, 2);
    const committed = await native.commit({ ...request, operationKey: 'move-defiler' });
    assert.equal(committed.resumedSavedCommit, true);
    await finishSwarmMove(committed);
  } else {
    const coordinates = { coordinate: { xMilliInches: 29000, yMilliInches: 10000 } };
    const quoted = runtime.queryDarkSwarmPlacement(original, 'defiler', coordinates);
    assert.equal(quoted.mutationAuthority, false);
    assert.throws(() => runtime.queryDarkSwarmPlacement(original, 'defiler',
      { coordinate: { xMilliInches: 25000, yMilliInches: 10000 } }), /TOKEN_OVERLAPS_MODEL/);
    const placement = await native.commit({ ...request, operationKey: 'gestate',
      choice: { actionType: 'set_dark_swarm', pieceId: 'defiler' }, parameters: () => coordinates });
    assert.deepEqual(placement.preview.core.action.sourceAction, quoted.result.action);
    const placed = await native.store.loadRoom(roomId);
    // On an interrupted retry the committed movement can already be in the journal.
    const bundle = await native.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
    const first = placed.stateRevision === 1 ? placed.envelope : native.engine.replay({
      initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, 1) }).envelope;
    const state = first.state, token = state.board.tokens.find(t => t.tokenKind === 'dark_swarm');
    assert.equal(token.baseDiameterMm, 32);
    assert.deepEqual(state.cardResources, original.cardResources);
    assert.equal(state.activeSideKey, side);
    const actions = runtime.enumerate(state).parameterDomains;
    assert(!actions.some(d => d.actionType === 'set_dark_swarm'));
    const move = actions.find(d => d.actionType === 'move' && d.pieceId === 'defiler');
    assert(move);
    await save(dir + '/placement.json', { revision: 1, stateHash: first.stateHash, tokenId: token.tokenId,
      baseDiameterMm: token.baseDiameterMm, coordinate: token.coordinate, paidCards: 0,
      sameRoundReuseExcluded: true, successor: move.actionType, queryEqualsPreview: true });
    const model = unit(state, 'defiler').models[0];
    const parameters = { leadingModelId: model.id, path: [
      { xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) },
      coordinates.coordinate,
    ], placements: [] };
    const question = { parameters, tokenId: token.tokenId, precedingDisplacements: [] };
    const proof = runtime.queryBattlefieldTokenDisplacement(state, move, question);
    assert.equal(proof.mutationAuthority, false);
    assert(proof.solution.bestWitness);
    const witness = proof.solution.bestWitness.coordinate;
    const checked = runtime.queryBattlefieldTokenDisplacement(state, move, { ...question, coordinate: witness });
    assert.equal(checked.coordinateVerdict.displacementConditionSatisfied, true);
    assert.throws(() => runtime.queryBattlefieldTokenDisplacement(state, { ...move, pieceId: 'zagara' }, question),
      /DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE/);
    parameters.tokenDisplacements = [{ tokenId: token.tokenId, coordinate: witness }];
    const projected = runtime.instantiate(state, move, parameters);
    const applied = await native.commit({ ...request, operationKey: 'move-defiler',
      choice: { actionType: 'move', pieceId: 'defiler' }, parameters: () => parameters });
    assert.deepEqual(applied.preview.core.action, projected.action);
    await finishSwarmMove(applied, checked);
  }
} finally { native.close(); }
const cold = open();
try {
  await cold.restoreDependencies(roomId, authority);
  const saved = await cold.store.loadRoom(roomId), bundle = await cold.store.loadReplayBundle(roomId);
  const receipts = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
  assert.equal(receipts.length, arm === 'swarm' ? 2 : 1);
  const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.envelope, saved.envelope);
  await save(dir + '/cold.json', { revision: saved.stateRevision, stateHash: saved.envelope.stateHash, exact: true, receipts: receipts.length });
} finally { cold.close(); }
