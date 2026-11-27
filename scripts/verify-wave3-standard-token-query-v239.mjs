import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { registerHooks } from 'node:module';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const current = base + '/zagara-standard-admission-v239';
const kind = process.argv[2], red = process.argv.includes('--expect-unavailable');
assert(['dark-swarm', 'legacy-creep'].includes(kind));
const legacy = kind === 'legacy-creep';
const parent = legacy ? base + '/wave3-creep-displacement-v222-hatchery-signed-v1' : current + '/swarm';
const dir = current + '/shared-query-' + kind;
let adapterModule = new URL('../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs', import.meta.url);
let hook;
if (red) {
  const snapshot = await fs.readFile(path.join(root, dir, 'room-adapter-before-fix.source'), 'utf8');
  adapterModule.search = 'archived-before-fix';
  hook = registerHooks({ load(url, context, next) {
    return url === adapterModule.href ? { format: 'module', source: snapshot, shortCircuit: true } : next(url, context);
  } });
}
let createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1;
try { ({ createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } = await import(adapterModule.href)); }
finally { hook?.deregister(); }
const originalId = legacy ? 'wave3-creep-displacement-v222-hatchery' : 'zagara-standard-swarm';
const manifestRef = legacy ? parent + '/manifest.json' : base + '/tabletop-raven-m01-v1/manifest.json';
let initial;
if (legacy) initial = (await read(parent + '/authority.json')).state;
else {
  const store = openWave3EngineeringStoreV1({ directory: path.join(root, parent), filename: 'room.sqlite' });
  try { initial = (await store.loadReplayBundle(originalId)).initialEnvelope.state; } finally { store.close(); }
}
const operations = [];
for (const file of await fs.readdir(path.join(root, parent))) {
  if (file.startsWith('operation-') && file.endsWith('.json')) operations.push((await read(parent + '/' + file)).preview.core);
}
const start = operations.find(op => op.expectedStateRevision === 0);
const move = operations.find(op => op.expectedStateRevision === 1 && op.action.actionType === 'move');
assert(start && move);
const { rulesRuntime, open, authority } = await bindWave3StandardActionRoom({ manifestRef, initial, dir,
  candidateVersion: legacy ? '2.22.0' : '2.39.0', scenario: { originalId, kind } });
assert.equal(start.result.postStateHash, move.preStateHash);
const roomId = 'shared-token-query-' + kind;

const native = open();
try {
  const seats = await native.create(roomId, authority), side = move.seatKey;
  const prefix = start.proposal.kind === 'finite'
    ? { kind: 'finite', select: d => d.action.actionType === start.action.actionType }
    : { select: d => d.domainId === start.proposal.domainId, parameters: () => start.proposal.parameters };
  await native.commit({ roomId, credential: seats[start.seatKey], operationKey: 'signed-prefix', ...prefix });
  const before = await native.store.loadRoom(roomId);
  assert.equal(before.stateRevision, 1);
  assert.equal(before.envelope.stateHash, move.preStateHash);
  const input = { roomId, seatToken: seats[side].seatToken };
  const { projection } = await native.room.readRoom(input), { legalSpace } = await native.room.legalSpace(input);
  const { domainId } = move.proposal;
  assert(legalSpace.parameterDomains.some(row => row.domainId === domainId));
  const { tokenDisplacements, ...parameters } = move.proposal.parameters;
  const [{ tokenId, coordinate }] = tokenDisplacements;
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({ roomStore: native.store, rulesRuntime, seatKey: side });
  const service = createStarcraftTmgSpatialActionQueryRuntimeV1({ rulesQuery: request => adapter.query(request) });
  const query = args => service.query({ roomProjection: projection, legalSpace,
    request: { queryKind: 'battlefield_token_displacement', arguments: args } });
  const args = { domainId, parameters, tokenId, coordinate };
  if (!legacy) args.precedingDisplacements = [];
  const receipt = await query(args);
  if (red) {
    assert.equal(receipt.reason, 'BATTLEFIELD_DISPLACEMENT_QUERY_NOT_AVAILABLE_FOR_RELEASE');
    await save(dir + '/blocked-before-fix.json', { reason: receipt.reason, stateHash: receipt.authority.stateHash,
      currentDomain: domainId, tokenId, movementAlreadySigned: true });
  } else {
    assert.equal(receipt.status, 'exact', JSON.stringify({ reason: receipt.reason, failureStage: receipt.failureStage }));
    assert.equal(receipt.mayApply, false);
    assert.equal(receipt.result.stateHash, move.preStateHash);
    assert.deepEqual(receipt.result.coordinateVerdict.coordinate, coordinate);
    assert.equal(receipt.result.coordinateVerdict.displacementConditionSatisfied, true);
    if (legacy) {
      const previous = await read(parent + '/shared-query.public.json');
      assert.deepEqual(receipt.result, previous.result);
    } else {
      const applied = await read(parent + '/result.json');
      assert.equal(receipt.result.solution.resultHash, applied.geometryResultHash);
      const duplicate = await query({ ...args, precedingDisplacements: [{ tokenId, coordinate }] });
      assert.equal(duplicate.reason, 'PSIONIC_DISPLACEMENT_QUERY_TOKEN_ALREADY_SELECTED');
    }
    const unchanged = await native.store.loadRoom(roomId);
    assert.equal(unchanged.stateRevision, 1);
    assert.equal(unchanged.envelope.stateHash, move.preStateHash);
    await save(dir + '/result.json', { kind, originalId, originalRevision: 1, originalHash: move.preStateHash,
      status: receipt.status, sourceGeometry: receipt.result.solution.resultHash, tokenId, coordinate,
      legacyResultIdentical: legacy, priorChoiceRejectionChecked: !legacy, mutated: false, modelCalls: 0 });
  }
} finally { native.close(); }
