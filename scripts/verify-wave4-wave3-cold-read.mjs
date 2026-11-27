import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createStarcraftProductRoomHostV1 } from './support/starcraft-product-room-host-v1.mjs';
import { loadWave3HumanMatchSetupsV1, wave3HumanMapConfiguration }
  from '../packages/product-composition/wave3-human-match-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.ok(process.argv[2], 'Supply the isolated W4-01 compatibility host directory');
const dataDirectory = path.resolve(root, process.argv[2]);
assert.ok(dataDirectory.startsWith(path.join(root, 'build/wave4-web/host') + path.sep));
const baseline = JSON.parse(await fs.readFile(path.join(root, 'docs/development/wave4/evidence/candidate-compatibility.public.json')));
const setups = await loadWave3HumanMatchSetupsV1(root);
let providerCalls = 0;
const host = await createStarcraftProductRoomHostV1({ root, fixtureRoot: root, dataDirectory,
  liveEnabled: false, offlineWave3MatchVersion: '2.99.12',
  mapConfiguration: wave3HumanMapConfiguration(setups.find(row => row.scale === 'Standard')),
  providerFactory() { providerCalls++; throw Error('PROVIDER_FORBIDDEN'); },
  companionProviderFactory() { providerCalls++; throw Error('PROVIDER_FORBIDDEN'); } });
const proofs = [];
try {
  for (const expected of baseline.scales) {
    const metadataFile = path.join(dataDirectory, 'rooms', expected.roomId, 'room.private.json');
    const metadataBefore = await fs.readFile(metadataFile);
    const item = await host.get(expected.roomId);
    const saved = await item.roomStore.loadRoom(expected.roomId);
    assert.equal(saved.envelope.stateHash, expected.stateHash);
    assert.equal(saved.envelope.matchBindingHash, expected.bindingHash);
    assert.equal(hash(await item.roomStore.loadReplayBundle(expected.roomId)), expected.replayHash);
    const replay = await item.fixture.roomRuntime.replayRoom({ roomId: expected.roomId,
      seatToken: item.record.credentials.human.seatToken });
    assert.equal(replay.ok, true); assert.equal(replay.matchesCurrent, true);
    assert.deepEqual(await fs.readFile(metadataFile), metadataBefore);
    proofs.push({ minerals: expected.minerals, roomId: expected.roomId, stateRevision: saved.stateRevision,
      stateHash: expected.stateHash, bindingHash: expected.bindingHash, replayHash: expected.replayHash,
      metadataBytesUnchanged: true, nativeReplayMatches: true, committedNewActions: 0,
      releaseBinding: item.fixture.rulesRuntime.releaseBinding });
    console.log('cold Wave3 ' + expected.minerals + ' point room preserved');
  }
} finally { await host.close(); }
assert.equal(providerCalls, 0);
const report = { status: 'passed', scope: 'existing isolated W4-01 compatibility rooms; Wave3 player service on 5483 untouched',
  proofs, modelCalls: providerCalls, trainingTruth: false };
await atomicWrite(path.join(root, 'build/wave4-web/ability-diff/wave3-cold-read.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/ability-wave3-cold-read.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, preservedRooms: proofs.length, modelCalls: 0 }));
