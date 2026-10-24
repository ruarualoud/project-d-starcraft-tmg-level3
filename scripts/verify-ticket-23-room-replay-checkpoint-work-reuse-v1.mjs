// Concrete bug: formal Room replay normalizes the same checkpoint twice.
// Copy original encrypted rows to RAM; never create/reinitialize the source Room.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../packages/room-store/room-store-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from
  '../packages/room-store/sqlite-room-store-v1.mjs';
import { createTicket20HumanAgentDemoFixtureV1 } from
  './support/ticket20-human-agent-demo-fixture-v1.mjs';
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [worktreeRoot, sourceDirectory, baselinePath] = process.argv.slice(2);
assert(worktreeRoot && sourceDirectory && baselinePath);
const privateState = JSON.parse(await readFile(path.join(sourceDirectory,
  'runner-private.json'), 'utf8'));
const roomId = privateState.roomId;
const sourceDb = new DatabaseSync(path.join(sourceDirectory, 'room.sqlite'),
  { readOnly: true });
const copiedRows = {};
try {
  sourceDb.exec('BEGIN');
  copiedRows.sc_rooms = sourceDb.prepare('SELECT * FROM sc_rooms WHERE room_id = ?').all(roomId);
  copiedRows.sc_private_journal = sourceDb.prepare(
    'SELECT * FROM sc_private_journal WHERE room_id = ? ORDER BY sequence').all(roomId);
  copiedRows.sc_checkpoints = sourceDb.prepare(
    'SELECT * FROM sc_checkpoints WHERE room_id = ? ORDER BY state_revision DESC LIMIT 1').all(roomId);
  assert.equal(sourceDb.prepare('SELECT total_changes() AS n').get().n, 0);
  sourceDb.exec('COMMIT');
} finally { sourceDb.close(); }
assert.equal(copiedRows.sc_rooms.length, 1);
assert.equal(copiedRows.sc_checkpoints.length, 1, 'actual saved checkpoint required');
const copiedRowsHash = hash(copiedRows);
const memoryDb = new DatabaseSync(':memory:');
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: JSON.parse(copiedRows.sc_rooms[0].aggregate_cipher).keyId,
});
const store = createSqliteStarcraftTmgRoomStore({ database: memoryDb,
  privatePayloadCodec: codec });
for (const [table, rows] of Object.entries(copiedRows)) {
  const columns = Object.keys(rows[0] || {});
  if (!columns.length) continue;
  const insert = memoryDb.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  for (const row of rows) insert.run(...columns.map(column => row[column]));
}
const sourceAggregate = await store.loadRoom(roomId);
const originalAggregateHash = hash(sourceAggregate);
assert.equal(sourceAggregate.envelope.state.board.terrain.length, 1804);
const originalBundle = await store.loadReplayBundle(roomId);
const originalBundleHash = hash(originalBundle);
const crypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: sourceAggregate.envelope.matchBinding.refereeKeyId,
  trustLevel: 'development_persistent',
});
const checkpointStates = new WeakSet();
let writeAttempts = 0;
let checkpointSignatureChecks = 0;
let measured = false;
const noWrite = async () => { writeAttempts += 1; throw new Error('DIAGNOSTIC_ROOM_WRITES_FORBIDDEN'); };
const roomStore = Object.freeze({ ...store, createRoom: noWrite, commit: noWrite,
  async loadReplayBundle(id) {
    const bundle = await store.loadReplayBundle(id);
    if (bundle?.latestCheckpoint?.state) checkpointStates.add(bundle.latestCheckpoint.state);
    return bundle;
  },
});
const cryptoObserver = Object.freeze({ ...crypto,
  verify(payload, signature, kind) {
    if (measured && kind === 'checkpoint') checkpointSignatureChecks += 1;
    return crypto.verify(payload, signature, kind);
  },
});
const setupStarted = performance.now();
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root: worktreeRoot }),
  roomId, roomProfile: 'standard_2000_live',
  mapConfiguration: privateState.mapConfiguration,
  ...(privateState.currentProductRuntimeVariant ? {
    currentProductRuntimeVariant: privateState.currentProductRuntimeVariant,
  } : {}),
  resumeRoom: true, resumeCredentials: privateState.resumeCredentials,
  roomStore, refereeCrypto: cryptoObserver,
  attachBot: false, autoDrive: false, issueHumanRecovery: false,
  botDecisionPort: { async decide() { throw new Error('PROVIDER_FORBIDDEN'); } },
});
assert.equal(fixture.createdRoom.resumed, true);
assert.equal(fixture.coverage.productionRoomEligible, true);
const setupElapsedMs = performance.now() - setupStarted;
const nativeStringify = JSON.stringify;
let checkpointStateCopies = 0;
JSON.stringify = function(value, ...rest) {
  if (value && checkpointStates.has(value)) checkpointStateCopies += 1;
  return Reflect.apply(nativeStringify, JSON, [value, ...rest]);
};
let response;
const started = performance.now();
try {
  measured = true;
  response = await fixture.roomRuntime.replayRoom({ roomId,
    seatToken: privateState.resumeCredentials.human.seatToken });
} finally { measured = false; JSON.stringify = nativeStringify; }
const elapsedMs = performance.now() - started;
assert.equal(response.ok, true, response.reason);
assert.equal(response.matchesCurrent, true);
assert.equal(hash(await store.loadRoom(roomId)), originalAggregateHash);
assert.equal(hash(await store.loadReplayBundle(roomId)), originalBundleHash);
assert.equal(hash(copiedRows), copiedRowsHash);
assert.equal(writeAttempts, 0);

// The optimization may reuse only fully verified content, never supplied labels.
const binding = originalBundle.initialEnvelope.matchBinding;
const checkpoint = structuredClone(originalBundle.latestCheckpoint);
const checkpointSourceHash = hash(checkpoint);
const valid = fixture.authorityEngine.verifyCheckpoint(checkpoint, binding);
assert.equal(valid.ok, true);
const changed = structuredClone(checkpoint);
changed.state.round += 1;
assert.equal(fixture.authorityEngine.verifyCheckpoint(changed, binding).reason, 'SIGNATURE_INVALID');
const badSignature = structuredClone(checkpoint);
badSignature.refereeSignature.signature = 'invalid';
assert.equal(fixture.authorityEngine.verifyCheckpoint(badSignature, binding).reason, 'SIGNATURE_INVALID');
const badBinding = structuredClone(binding);
badBinding.refereeKeyId = 'other-referee';
assert.equal(fixture.authorityEngine.verifyCheckpoint(checkpoint, badBinding).reason, 'SIGNATURE_INVALID');
const resigned = structuredClone(changed);
delete resigned.checkpointHash;
delete resigned.refereeSignature;
resigned.refereeSignature = crypto.sign(resigned, 'checkpoint');
const { refereeSignature, ...resignedCore } = resigned;
resigned.checkpointHash = hash({ checkpoint: resignedCore, refereeSignature });
assert.equal(fixture.authorityEngine.verifyCheckpoint(resigned, binding).reason, 'SIGNATURE_INVALID',
  'valid signature must not hide a wrong normalized-state hash');
assert.deepEqual(fixture.authorityEngine.verifyCheckpoint(checkpoint, binding), valid);
assert.equal(hash(checkpoint), checkpointSourceHash);

// Accessor-bearing input must retain the original uncached validation path.
const accessor = { ...checkpoint };
Object.defineProperty(accessor, 'state', { enumerable: true, get: () => checkpoint.state });
assert.deepEqual(fixture.authorityEngine.verifyCheckpoint(accessor, binding), valid);

let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch(error) {
  if (error.code !== 'ENOENT') throw error;
  baseline = { copiedRowsHash, originalAggregateHash, originalBundleHash,
    response, checkpointStateCopies, checkpointSignatureChecks, setupElapsedMs, elapsedMs };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
for (const key of ['copiedRowsHash', 'originalAggregateHash', 'originalBundleHash']) {
  assert.equal(baseline[key], { copiedRowsHash, originalAggregateHash, originalBundleHash }[key]);
}
assert.deepEqual(response, baseline.response, 'ENTIRE formal Room replay and private viewer projection preserved');
console.log(JSON.stringify({ operation: 'formal_room_replay_checkpoint_work_reuse',
  revision: sourceAggregate.stateRevision, terrainRows: 1804,
  checkpointRevision: originalBundle.latestCheckpoint.stateRevision,
  tailReceipts: response.replayedTailReceiptCount,
  originalCheckpointStateCopies: baseline.checkpointStateCopies, checkpointStateCopies,
  originalCheckpointSignatureChecks: baseline.checkpointSignatureChecks, checkpointSignatureChecks,
  originalElapsedMs: baseline.elapsedMs, elapsedMs, setupElapsedMs,
  entireRoomReplayEqual: true, inputUnchanged: true, tamperAndBindingGuardsPreserved: true,
  originalRoomWrites: 0, sourceRoomReinitialized: false, providerCalls: 0,
  compatibilityRuntimeUsed: false, fullActionOneMinuteCertified: false, trainingTruth: false }));
memoryDb.close();
// Cold replay still restores one checked checkpoint into an owned envelope.
// Keep that copy; only the second validation's normalization is redundant.
assert.equal(checkpointStateCopies, 2, 'FORMAL_ROOM_REPLAY_NORMALIZES_SAME_CHECKPOINT_TWICE');
assert.equal(checkpointSignatureChecks, 1, 'FORMAL_ROOM_REPLAY_VERIFIES_SAME_CHECKPOINT_SIGNATURE_TWICE');
