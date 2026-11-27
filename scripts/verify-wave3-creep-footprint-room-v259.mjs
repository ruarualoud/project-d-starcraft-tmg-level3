import assert from 'node:assert/strict';
import path from 'node:path';
import {root, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1, declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {evaluateOfficialWithinWhollyWithinV1} from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const directory = base + '/creep-footprints-v259';
const parent = base + '/omega-detection-v258';
const version = '2.59.0';
const id = 'hydralisk';
const wormId = 'player2-omega-worm';
const creepId = 'unit:omega_worm/source-of-creep-any-phase@1';
const tumorId = 'card:hatchery/creep-spread-any@1';
const lookup = (s, key) => s.pieces.find(p => p.id === key);

async function saved(file) {
  return read(file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
}

function field(state, key, xMilli) {
  const piece = lookup(state, key);
  assert(piece && piece.models.length >= 1);
  for (const [index, model] of piece.models.entries()) {
    Object.assign(model, { xInches: (xMilli + 2500 * index) / 1000, yInches: 4, isOnField: true });
  }
  Object.assign(piece, { xInches: piece.models[0].xInches, yInches: 4, isOnField: true,
    isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  state.reserveManifestBySide[piece.sideKey].find(row => row.pieceId === key).deploymentStatus = 'deployed';
}

function source(state, branch) {
  if (branch === 'worm') {
    const worm = lookup(state, wormId);
    return { kind: 'model', unitId: worm.id, modelId: worm.models[0].id };
  }
  const token = state.board.tokens.find(t => t.tokenKind === 'creep_tumor');
  assert(token, 'The product must place the tumor first');
  const binding = state.officialBattlefieldAssetBindings.find(b => b.assetId === token.tokenId);
  assert.equal(binding.sourceDefinitionId, tumorId);
  assert.equal(binding.assetHash, token.tokenHash);
  return { kind: 'token', id: token.tokenId };
}

function probe(bound, state, branch, expected) {
  const geometry = evaluateOfficialWithinWhollyWithinV1({ state, dataBundle: state.officialModelBaseGeometryDataBundle,
    source: source(state, branch), targetUnitId: id, rangeMilliInches: 6000 });
  const qu = bound.runtime.queryBattlefieldModifiers(state, id).result;
  assert.equal(geometry.unitWithin, expected);
  assert.equal(qu.onCreep, expected);
  return { gapMilliInches: Math.min(...geometry.assessments.map(a => a.minimumDistanceMilliInches)),
    onCreep: qu.onCreep, geometryHash: geometry.resultHash };
}

async function confirmedWorm() {
  const certificate = await read(parent + '/summon.json');
  const store = openWave3EngineeringStoreV1({ directory: path.join(root, parent, 'sized'), filename: 'room.sqlite' });
  try {
    const head = await store.loadRoom(certificate.roomId);
    assert.equal(head.envelope.stateHash, certificate.stateHash);
    assert(certificate.coldExact);
    return { piece: lookup(head.envelope.state, wormId), hash: certificate.stateHash };
  } finally { store.close(); }
}


async function runBranch(bound, room, opening, original, branch) {
  const out = directory + '/' + branch;
  const roomId = 'creep-footprints-v259-' + branch;
  if (await saved(out + '-result.json')) return;
  const state = structuredClone(opening);
  Object.assign(state, { round: 2, stage: 'activation_phases', phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
  state.phaseFirstActorByRound['2:movement'] = { phase: 'movement', round: 2, chosenFirstActorSideKey: 'player2', markerHolderSideKey: 'player2' };
  delete state.selectedRosterActivationWindow;
  field(state, id, branch === 'worm' ? 14763 : 23740);
  field(state, 'nova_stealth_mode', 34000);
  if (branch === 'worm') state.pieces.push(structuredClone(original.piece));
  else field(state, 'kerrigan', 12000);
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: roomId });
  initializeOfficialMatchRoundSupplyV1(state, true);
  const condition = { branch, twoHumanSeats: true, round: 2, conditionalPositions: true,
    ...(branch === 'worm' ? { summonedPieceStateHash: original.hash } : {}) };
  const authority = bound.authorityFor(state, condition);
  const seats = await room.create(roomId, authority);
  let head = await room.store.loadRoom(roomId);
  let outside;
  if (branch === 'worm') {
    outside = probe(bound, state, branch, false);
    if (!await saved(out + '-before.json')) await save(out + '-before.json', outside);
    if (head.stateRevision === 0) {
      const models = lookup(state, id).models;
      assert.equal(models.length, 2);
      const x = 14163;
      const to = { xMilliInches: x, yMilliInches: 4000, elevation: 'ground' };
      await room.commit({ roomId, credential: seats.player2, operationKey: 'enter-worm-aura',
        choice: { actionType: 'move', pieceId: id }, parameters: () => ({ leadingModelId: models[0].id,
          path: [to], placements: [{ ...to, modelId: models[1].id, xMilliInches: x + 2500, rotationDegrees: 0 }] }) });
    }
  } else if (head.stateRevision === 0) {
    assert.equal(bound.runtime.queryBattlefieldModifiers(state, id).result.onCreep, false);
    await room.commit({ roomId, credential: seats.player2, operationKey: 'place-tumor',
      select: d => d.definitionId === tumorId && d.pieceId === 'kerrigan',
      parameters: () => ({ activeUnitId: 'kerrigan', paymentCardInstanceIds: [], coordinate: { xMilliInches: 16000, yMilliInches: 4000 } }) });
  }
  head = await room.store.loadRoom(roomId);
  assert.equal(head.stateRevision, 1);
  const next = head.envelope.state;
  let inside;
  if (branch === 'worm') {
    inside = probe(bound, next, branch, true);
    assert.equal(lookup(next, id).models[0].xInches, 14.163);
  } else {
    outside = probe(bound, next, branch, false);
    const condition = structuredClone(next);
    field(condition, id, 23140);
    inside = probe(bound, condition, branch, true);
  }
  const menu = await room.room.legalSpace({ roomId, seatToken: seats[next.activeSideKey].seatToken });
  assert(menu.ok, menu.reason);
  const nextTypes = [...new Set([...menu.legalSpace.parameterDomains, ...menu.legalSpace.finiteActions.map(a => a.action)].map(a => a.actionType))];
  assert(nextTypes.length > 0);
  const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, head.envelope);
  await save(out + '-result.json', { version, branch, conditionalStart: condition, beforeOrOutside: outside, inside,
    insideProducedBy: branch === 'worm' ? 'authoritative_move' : 'declared_query_position',
    actions, nextTypes, stateRevision: head.stateRevision, stateHash: head.envelope.stateHash, coldExact: true, modelCalls: 0 });
}

let room, branch = 'composition';
try {
  const selection = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(selection.manifestRef), 'area_ability_inputs');
  const recipes = structuredClone(selection.recipes);
  Object.assign(recipes.player2.units.find(u => u.unitInstanceId === 'queen'), { unitInstanceId: id, recordKey: 'army_units:hydralisk' });
  const { state: opening } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: version, releaseContext: context,
    dataset: context.dataset, snapshot: context.snapshot, recipes, missionRecordKey: selection.mission,
    deploymentRecordKey: selection.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
  const route = opening.officialBattlefieldAssetFamilySourceBundle.routes.find(r => r.definitionId === creepId);
  assert.equal(route?.rangeInches, 6);
  const bound = await bindWave3StandardActionRoom({ manifestRef: selection.manifestRef, initial: opening,
    dir: directory, candidateVersion: version, scenario: { twoHumanSeats: true, comparison: 'creep_range' } });
  const original = await confirmedWorm();
  assert.equal(original.piece.sourceRecordHash, opening.officialSelectedRosterAbilitySourceBundle.omegaWormTemplate.sourceRecordHash);
  room = bound.open();
  for (branch of ['worm', 'tumor']) await runBranch(bound, room, opening, original, branch);
  await save(directory + '/result.json', { version, sourceHash: route.sourceFeatureHash, modelCalls: 0,
    worm: await read(directory + '/worm-result.json'), tumor: await read(directory + '/tumor-result.json') });
} catch (error) {
  await save(directory + '/stop-' + Date.now() + '.json', { branch, error: error.message, code: error.code,
    failureStage: error.failureStage, frames: error.stack?.split('\n').slice(0, 6) });
  throw error;
} finally { room?.close(); }
