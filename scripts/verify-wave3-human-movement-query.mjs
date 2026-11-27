import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, stat, rename } from 'node:fs/promises';
import { DatabaseSync, backup } from 'node:sqlite';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { selectWave3FunctionalAction } from './support/wave3-two-scale-entries.mjs';

const scale = process.argv[2];
assert(['standard', 'skirmish'].includes(scale));
const parent = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/' + scale;
const dir = 'build/ticket-28-wave3-human-lobby-v1/signed-movement/' + scale;
const roomId = 't28-w3-m23-' + scale;
const expected = await read(parent + '/ordinary-movement.public.json');
const credentials = await read(parent + '/' + roomId + '.seats.private.json');
const source = openWave3EngineeringStoreV1({directory:path.join(root, parent), filename:'room.sqlite', readOnly:true});
let initial, checkpoint;
try {
  checkpoint = (await source.loadRoom(roomId)).envelope;
  initial = (await source.loadReplayBundle(roomId)).initialEnvelope.state;
  assert.equal(checkpoint.stateHash, expected.sourceHash);
  assert.equal(checkpoint.stateRevision, expected.sourceRevision);
} finally { source.close(); }
await mkdir(path.join(root, dir), {recursive:true});
const branchFile = path.join(root, dir, 'room.sqlite');
if (!await stat(branchFile).then(() => true, e => { if (e.code !== 'ENOENT') throw e; return false; })) {
  const db = new DatabaseSync(path.join(root, parent, 'room.sqlite'), {readOnly:true});
  try { await backup(db, branchFile + '.pending'); } finally { db.close(); }
  await rename(branchFile + '.pending', branchFile);
}
const bound = await bindWave3StandardActionRoom({manifestRef:parent + '/room-source-manifest.json', initial, dir,
  candidateVersion:'2.84.0', scenario:'unconditioned two-human official map and deployment', frozenRuntimeRef:parent + '/runtime.json'});
const native = bound.open();
const saveStep = data => atomicWrite(path.join(root, dir, 'checked-action.public.json'), JSON.stringify(data, null, 2) + '\n');
let end, recoveryCheckpoint;
try {
  await native.restoreDependencies(roomId, bound.authority);
  const signed = native.engine.createCheckpoint(checkpoint);
  assert(signed.ok, signed.reason);
  recoveryCheckpoint = signed.checkpoint;
  let head = (await native.store.loadRoom(roomId)).envelope;
  while (head.stateRevision < checkpoint.stateRevision + expected.preceding.length) {
    const type = expected.preceding[head.stateRevision - checkpoint.stateRevision];
    const side = head.state.activeSideKey;
    await native.commit({roomId, credential:credentials[side], operationKey:'turn-window-r' + head.stateRevision,
      kind:'finite', select:row => row.action.actionType === type && (type !== 'choose_first_actor' || row.action.chosenFirstActorSideKey === 'player1')});
    head = (await native.store.loadRoom(roomId)).envelope;
  }
  if (head.stateRevision === checkpoint.stateRevision + expected.preceding.length) {
    const side = head.state.activeSideKey;
    const input = {roomId, seatToken:credentials[side].seatToken};
    const {legalSpace} = await native.room.legalSpace(input);
    const {projection} = await native.room.readRoom(input);
    const domain = legalSpace.parameterDomains.find(d => d.pieceId === expected.pieceId && d.actionType === expected.action);
    assert(domain, 'recorded action must be offered to the owning seat');
    const unit = head.state.pieces.find(p => p.id === expected.pieceId);
    const living = unit.models.filter(m => m.isOnField !== false && !m.isDestroyed);
    const leader = living.find(m => m.id === unit.leadingModelId) ?? living[0];
    assert.deepEqual([leader.xInches, leader.yInches], expected.from);
    const selected = selectWave3FunctionalAction({legalSpace, state:head.state, runtime:bound.rulesRuntime,
      binding:head.matchBinding, steps:expected.preceding.map(action => ({action}))});
    assert.equal(selected?.proposal.domainId, domain.domainId);
    const {parameters} = selected.proposal;
    const target = parameters.path.at(-1);
    assert.deepEqual([target.xMilliInches, target.yMilliInches], expected.to.map(v => Math.round(v*1000)));
    const dx = expected.to[0] - expected.from[0], dy = expected.to[1] - expected.from[1];
    const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:native.store, rulesRuntime:bound.rulesRuntime, seatKey:side});
    const tools = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q => adapter.query(q)});
    const query = await tools.query({roomProjection:projection, legalSpace, request:{queryKind:'legal_full_path_movement', arguments:{domainId:domain.domainId, parameters}}});
    assert.equal(query.status, 'exact', JSON.stringify({reason:query.reason, details:query.details}));
    assert.equal(query.result.pathQualification.completeNativePathChecked, true);
    assert.equal(query.authority.stateHash, head.stateHash);
    assert.equal(query.mayApply, false);
    const before = living.map(m => ({id:m.id, xy:[m.xInches,m.yInches]}));
    await saveStep({roomId, sourceRevision:head.stateRevision, piece:unit.id, before, movement:[dx,dy], query});
    await native.commit({roomId, credential:credentials[side], operationKey:'verified-player-run', select:d => d.domainId === domain.domainId,
      parameters:() => parameters});
  }
  end = (await native.store.loadRoom(roomId)).envelope;
  const proof = await read(dir + '/checked-action.public.json');
  assert.equal(end.stateRevision, proof.sourceRevision + 1);
  const journal = (await native.store.loadReplayBundle(roomId)).privateJournal;
  const receipt = journal.filter(row => row.payload.type === 'accepted_transition').at(-1).payload.payload.receipt;
  assert.equal(hashStarcraftTmgContract(receipt.action), proof.query.result.actionHash);
  assert.equal(receipt.postStateHash, end.stateHash);
  const models = end.state.pieces.find(p => p.id === proof.piece).models;
  const after = proof.before.map(({id,xy}) => {
    const model = models.find(m => m.id === id);
    const actual = [model.xInches, model.yInches];
    assert.deepEqual(actual, xy.map((v, i) => v + proof.movement[i]));
    return {id, from:xy, to:actual};
  });
  const menu = await native.room.legalSpace({roomId,seatToken:credentials[end.state.activeSideKey].seatToken});
  assert(menu.ok);
  const successor = [...new Set([...menu.legalSpace.finiteActions.map(x=>x.action.actionType), ...menu.legalSpace.parameterDomains.map(d=>d.actionType)])];
  assert(successor.length);
  await save(dir + '/applied.public.json', {scale,roomId,sourceRevision:checkpoint.stateRevision,
    revision:end.stateRevision,phase:end.state.phase,action:receipt.action.actionType,piece:proof.piece,models:after,
    query:proof.query.queryKind,queryReceiptHash:proof.query.queryReceiptHash,actionHash:proof.query.result.actionHash,
    stateHash:end.stateHash,matchBindingHash:end.matchBindingHash,successor});
} finally { native.close(); }
const cold = bound.open();
try {
  await cold.restoreDependencies(roomId, bound.authority);
  const bundle = await cold.store.loadReplayBundle(roomId);
  const receipts = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
  assert.equal(receipts[checkpoint.stateRevision - 1].journalHash, checkpoint.journalHeadHash);
  const suffix = receipts.slice(checkpoint.stateRevision);
  const replay = journal => {
    const result = cold.engine.replay({initialEnvelope:bundle.initialEnvelope, checkpoint:recoveryCheckpoint, journal});
    assert(result.ok, result.reason);
    return result.envelope;
  };
  const choicePoint = replay(suffix.slice(0, -1));
  const receipt = suffix.at(-1);
  const {applyingSeatKey:side} = receipt;
  const menu = cold.engine.legalSpace(choicePoint, {internalServerAuthority:true, sideKey:side});
  assert.equal(menu.legalSpaceHash, receipt.legalSpaceHash);
  const selected = selectWave3FunctionalAction({legalSpace:menu, state:choicePoint.state, runtime:bound.rulesRuntime,
    binding:choicePoint.matchBinding, steps:expected.preceding.map(action => ({action}))});
  assert.deepEqual({...selected.proposal, parameters:selected.canonicalParameters}, receipt.proposal);
  assert.deepEqual(replay(suffix), end);
  await save(dir + '/result.public.json', {...await read(dir + '/applied.public.json'),
    suffix:suffix.map(r=>r.action.actionType), lobbySelectorMatched:true, coldReplay:true});
} finally { cold.close(); }
console.log(scale, end.stateRevision, 'signed movement matches agent query and cold replay');

