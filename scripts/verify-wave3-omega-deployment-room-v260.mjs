import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId = 'omega-network-deployment-v261';
const dir = base + '/' + roomId;
const ready = await read(dir + '/prepared.json');
const { hydralisk, queen, scenario } = ready;
const proof = await read(scenario.formationRef);
assert.equal(proof.formationProofHash, ready.formationProofHash);
const recipe = await read(scenario.rosterRecipeRef);
const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
const { state: originalRoster } = prepareOfficialStandardReleaseOpeningV2({
  releaseMatchVersion: ready.version, releaseContext: context, dataset: context.dataset, snapshot: context.snapshot,
  recipes: recipe.recipes, missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
});
const bound = await bindWave3StandardActionRoom({ manifestRef: recipe.manifestRef, initial: originalRoster,
  dir, candidateVersion: ready.version, scenario, frozenRuntimeRef: scenario.frozenRuntimeRef });
const room = bound.open();
let stage = 'restore_prepared_room';
try {
  const original = (await room.store.loadReplayBundle(roomId)).initialEnvelope;
  assert.equal(original.stateHash, ready.stateHash);
  assert.equal(original.matchBindingHash, ready.matchBindingHash);
  const authority = bound.authorityFor(original.state, scenario);
  const seats = await room.create(roomId, authority);
  const head = () => room.store.loadRoom(roomId);
  async function menu(side) {
    const result = await room.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(result.ok, result.reason);
    return result.legalSpace;
  }
  let current = await head();
  stage = 'deploy_original_formation';
  if (current.stateRevision === 0) {
    await room.commit({ roomId, credential: seats.player2, operationKey: 'omega-hydralisks',
      select: domain => domain.domainId === hydralisk.domainId, parameters: () => proof.parameters });
    current = await head();
  }
  const event = current.envelope.state.spatialActionHistory.find(e =>
    e.round === 2 && e.actionType === 'deploy' && e.pieceId === hydralisk.pieceId)?.event;
  assert.equal(event?.type, 'unit_deploy_resolved');
  const consumed = event.entrySource;
  for (const key of ['sourcePieceId', 'sourceModelId', 'definitionId', 'sourceRouteHash', 'sourceFootprintHash'])
    assert.equal(consumed[key], hydralisk.entry[key], key);
  assert.equal(consumed.committedSupply, hydralisk.requestedSupply);
  assert.equal(consumed.remainingSupplyBefore, consumed.committedSupply);
  const after = current.envelope.state;
  const unit = after.pieces.find(p => p.id === hydralisk.pieceId);
  assert(unit.isOnField && !unit.isInReserves);
  const expectedPoses = [{modelId: proof.parameters.leadingModelId, ...proof.parameters.path.at(-1)}, ...proof.parameters.placements];
  assert.equal(unit.models.length, expectedPoses.length);
  for (const expected of expectedPoses) {
    const actual = unit.models.find(m => m.id === expected.modelId);
    assert(actual.isOnField);
    assert.equal(Math.round(actual.xInches * 1000), expected.xMilliInches);
    assert.equal(Math.round(actual.yInches * 1000), expected.yMilliInches);
  }
  assert.equal(after.reserveManifestBySide.player2.find(r => r.pieceId === unit.id).deploymentStatus, 'deployed');
  assert.equal(after.officialRoundSupplyState.onTableSupplyBySide.player2, ready.onTable + hydralisk.requestedSupply);
  await save(dir + '/deployment.json', { event, expectedPoses, occupancy: after.officialRoundSupplyState.onTableSupplyBySide.player2 });
  stage = 'hand_back_movement';
  if (current.envelope.state.selectedRosterActivationWindow?.pieceId === hydralisk.pieceId ||
      (current.envelope.state.activeSideKey === 'player2' && current.stateRevision === 1)) {
    const space = await menu('player2');
    const finish = space.parameterDomains.find(d => d.actionType === 'finish_activation' && d.pieceId === hydralisk.pieceId);
    if (finish) {
      await room.commit({ roomId, credential: seats.player2, operationKey: 'finish-hydralisks',
        select: d => d.domainId === finish.domainId, parameters: () => ({}) });
      current = await head();
    }
  }
  if (current.envelope.state.activeSideKey === 'player1') {
    await room.commit({ roomId, credential: seats.player1, operationKey: 'terran-pass',
      kind: 'finite', choice: { actionType: 'pass' } });
    current = await head();
  }
  stage = 'deny_same_round_extra_supply';
  const final = current.envelope.state;
  assert.equal(final.round, 2);
  assert.equal(final.phase, 'movement');
  assert.equal(final.activeSideKey, 'player2');
  const remainingGlobal = final.officialRoundSupplyState.availableSupplyBySide.player2;
  assert(remainingGlobal >= queen.requestedSupply);
  const space = await menu('player2');
  const ordinary = space.parameterDomains.find(d => d.actionType === 'deploy' && d.pieceId === queen.pieceId);
  assert(ordinary?.constraints.entrySegments.some(e => ['top','bottom','left','right'].includes(e.side)));
  assert(!ordinary.constraints.entrySegments.some(e => e.segmentId === hydralisk.entry.segmentId));
  assert.equal(ordinary.constraints.modelProfiles.length, 1);
  const previous = await read(dir + '/extra-entry.json').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous) {
    assert.equal(previous.stateHash, current.envelope.stateHash);
    assert.equal(previous.legalSpaceHash, space.legalSpaceHash);
  }
  const rejected = previous?.refusal ?? await room.room.previewAction({ roomId, seatToken: seats.player2.seatToken,
    expectedStateRevision: current.stateRevision, expectedStateHash: current.envelope.stateHash,
    expectedMatchBindingHash: current.envelope.matchBindingHash, expectedLegalSpaceHash: space.legalSpaceHash,
    proposal: { kind: 'parameterized', domainId: ordinary.domainId, parameters: { ...proof.parameters,
      leadingModelId: ordinary.constraints.modelProfiles[0].modelId, placements: [] } } });
  assert.equal(rejected.ok, false);
  assert.match(JSON.stringify(rejected), /SELECTED_SPATIAL_ENTRY_SEGMENT_INVALID/);
  assert.equal((await head()).envelope.stateHash, current.envelope.stateHash);
  if (!previous) await save(dir + '/extra-entry.json', { stateHash: current.envelope.stateHash, legalSpaceHash: space.legalSpaceHash,
    queen: queen.pieceId, remainingGlobal, ordinaryEdgeAvailable: true,
    wormRemainingSupply: consumed.remainingSupplyBefore - consumed.committedSupply, refusal: rejected });
  stage = 'cold_replay';
  const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, current.envelope);
  await save(dir + '/result.json', { roomId, version: ready.version, round: final.round, actions, remainingGlobal,
    sourcePiece: consumed.sourcePieceId, committedSupply: consumed.committedSupply, extraEntryRejected: true,
    stateHash: current.envelope.stateHash, revision: current.stateRevision, coldExact: true, modelCalls: 0 });
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { stage, message: error.message });
  throw error;
} finally { room.close(); }
