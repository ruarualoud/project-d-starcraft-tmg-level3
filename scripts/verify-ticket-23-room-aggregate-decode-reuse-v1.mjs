#!/usr/bin/env node
// Concrete repeated-decryption bug through ordinary RoomRuntime.readRoom ->
// real SQLite RoomStore -> native AES-GCM codec. All DB writes are isolated
// in memory; imported Rule state, original room and Provider remain untouched.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { Decipheriv, randomBytes } from "node:crypto";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [capturePath, baselinePath, bugMode, outputPath] = process.argv.slice(2);
assert(capturePath && baselinePath);
if (bugMode === 'native_commit_copy') {
  // Actual full-aggregate commit repeats JSON serialization at its return seam.
  // Count only this submitted object, not unrelated normalization/diagnostics.
  const credentials = JSON.parse(await readFile(capturePath + '/runner-private.json', 'utf8'));
  const originalDb = new DatabaseSync(capturePath + '/room.sqlite', { readOnly: true });
  const row = originalDb.prepare('SELECT * FROM sc_rooms WHERE room_id = ?').get(credentials.roomId);
  assert.equal(originalDb.prepare('SELECT total_changes() AS n').get().n, 0);
  originalDb.close();
  const aad = `room:${credentials.roomId}:aggregate`;
  const codec = createStarcraftTmgPrivatePayloadCodec({ key: credentials.storeEncryptionKeyBase64,
    keyId: JSON.parse(row.aggregate_cipher).keyId });
  const original = codec.decode(row.aggregate_cipher, aad);
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  assert.deepEqual(original, baseline);
  assert.equal(original.stateRevision, 132);
  assert.equal(original.envelope.state.board.terrain.length, 1804);
  const database = new DatabaseSync(':memory:');
  const store = createSqliteStarcraftTmgRoomStore({ database, privatePayloadCodec: codec });
  const columns = Object.keys(row);
  database.prepare(`INSERT INTO sc_rooms (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
    .run(...columns.map(column => row[column]));
  const next = structuredClone(original);
  next.roomRevision++;
  const expectedNext = JSON.parse(JSON.stringify(next));
  let aggregateSerializations = 0;
  const originalStringify = JSON.stringify;
  JSON.stringify = function(value, ...args) {
    if (value === next) aggregateSerializations++;
    return Reflect.apply(originalStringify, JSON, [value, ...args]);
  };
  let returned;
  const started = performance.now();
  try {
    returned = await store.commit(credentials.roomId,
      { roomRevision: original.roomRevision, stateRevision: original.stateRevision },
      { nextAggregate: next, privateEvents: [], publicEvents: [], recoveryUpdates: [] });
  } finally {
    JSON.stringify = originalStringify;
  }
  const commitMs = performance.now() - started;
  assert.deepEqual(returned, expectedNext);
  assert.deepEqual(next, expectedNext);
  returned.envelope.state.scores.player1 = -999;
  assert.deepEqual(await store.loadRoom(credentials.roomId), expectedNext);
  const persistedCipher = database.prepare('SELECT aggregate_cipher FROM sc_rooms WHERE room_id = ?')
    .get(credentials.roomId).aggregate_cipher;
  const independentReader = createStarcraftTmgPrivatePayloadCodec({ key: credentials.storeEncryptionKeyBase64,
    keyId: codec.descriptor.keyId, cacheAggregatePayloads: false });
  assert.deepEqual(independentReader.decode(persistedCipher, aad), expectedNext);
  store.close();
  const report = { schemaVersion: 'starcraft_tmg_native_commit_duplicate_serialization_bug_v1',
    bugMode, sourceRevision: 132, terrainCount: 1804, aggregateSerializations, commitMs,
    entireReturnAndPersistedAggregateSame: true, independentAESReaderSame: true,
    callerMutationIsolated: true, submittedValueUnchanged: true,
    originalRoomWrites: 0, isolatedMetadataCommits: 1, newRulesActions: 0,
    providerCalls: 0, fullActionPerformanceCertification: false, trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(aggregateSerializations, 1, 'COMMITTED_AGGREGATE_SERIALIZED_TWICE');
  process.exit(0);
}
if (bugMode === 'native_encode') {
  // Actual producer -> SQLite -> next load seam, not the previously passed
  // repeated-external-cipher read gate. The original SQLite is read-only.
  const credentials = JSON.parse(await readFile(capturePath + '/runner-private.json', 'utf8'));
  const originalDb = new DatabaseSync(capturePath + '/room.sqlite', { readOnly: true });
  const row = originalDb.prepare('SELECT * FROM sc_rooms WHERE room_id = ?').get(credentials.roomId);
  assert(row);
  assert.equal(originalDb.prepare('SELECT total_changes() AS n').get().n, 0);
  originalDb.close();
  const aad = `room:${credentials.roomId}:aggregate`;
  const metadata = JSON.parse(row.aggregate_cipher);
  const codec = createStarcraftTmgPrivatePayloadCodec({ key: credentials.storeEncryptionKeyBase64,
    keyId: metadata.keyId });
  const original = codec.decode(row.aggregate_cipher, aad);
  assert.equal(original.stateRevision, 132);
  assert.equal(original.envelope.state.board.terrain.length, 1804);
  let baseline;
  try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    baseline = original;
    await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
  }
  assert.deepEqual(original, baseline, 'COMPLETE_ORIGINAL_AGGREGATE_REQUIRED');
  const database = new DatabaseSync(':memory:');
  const store = createSqliteStarcraftTmgRoomStore({ database, privatePayloadCodec: codec });
  let decryptions = 0;
  const originalSetAAD = Decipheriv.prototype.setAAD;
  Decipheriv.prototype.setAAD = function(value, ...args) {
    if (value.toString('utf8') === aad) decryptions++;
    return Reflect.apply(originalSetAAD, this, [value, ...args]);
  };
  let ownProducerDecryptions, encodeMs, readMs, cipherChars;
  try {
    const encodeStarted = performance.now();
    const encoded = codec.encode(original, aad);
    encodeMs = performance.now() - encodeStarted;
    cipherChars = encoded.length;
    const columns = Object.keys(row);
    database.prepare(`INSERT INTO sc_rooms (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
      .run(...columns.map(column => column === 'aggregate_cipher' ? encoded : row[column]));
    const readStarted = performance.now();
    const fresh = await store.loadRoom(credentials.roomId);
    readMs = performance.now() - readStarted;
    ownProducerDecryptions = decryptions;
    assert.deepEqual(fresh, baseline);
    fresh.envelope.state.scores.player1 = -999;
    assert.deepEqual(await store.loadRoom(credentials.roomId), baseline,
      'NATIVE_ENCODE_REUSE_MUST_KEEP_CALLER_MUTATIONS_ISOLATED');
    const tampered = JSON.parse(encoded);
    const tag = Buffer.from(tampered.tag, 'base64url'); tag[0] ^= 1;
    tampered.tag = tag.toString('base64url');
    assert.throws(() => codec.decode(JSON.stringify(tampered), aad), /auth|authenticate|Unsupported state/i);
    assert.throws(() => codec.decode(encoded, `room:other-room:aggregate`), /auth|authenticate|Unsupported state/i);
    const stranger = createStarcraftTmgPrivatePayloadCodec({ key: randomBytes(32), keyId: metadata.keyId });
    assert.throws(() => stranger.decode(encoded, aad), /auth|authenticate|Unsupported state/i);
    const externalReader = createStarcraftTmgPrivatePayloadCodec({ key: credentials.storeEncryptionKeyBase64,
      keyId: metadata.keyId });
    const beforeExternal = decryptions;
    assert.deepEqual(externalReader.decode(encoded, aad), baseline);
    assert.equal(decryptions - beforeExternal, 1, 'ANOTHER_CODEC_MUST_AUTHENTICATE_EXTERNAL_CIPHER');
    const disabled = createStarcraftTmgPrivatePayloadCodec({ key: credentials.storeEncryptionKeyBase64,
      keyId: metadata.keyId, cacheAggregatePayloads: false });
    const disabledEncoded = disabled.encode(original, aad);
    const beforeDisabled = decryptions;
    assert.deepEqual(disabled.decode(disabledEncoded, aad), baseline);
    assert.equal(decryptions - beforeDisabled, 1, 'DISABLED_CACHE_MUST_RETAIN_AES_AUTHENTICATION');
  } finally {
    Decipheriv.prototype.setAAD = originalSetAAD;
    store.close();
  }
  assert.deepEqual(original, baseline);
  const report = { schemaVersion: 'starcraft_tmg_native_encode_redundant_decryption_bug_v1',
    bugMode, sourceRevision: 132, terrainCount: 1804, ownProducerDecryptions,
    encodeMs, readMs, cipherChars, entireOriginalAggregateSame: true,
    callerMutationIsolated: true, tamperedCipherRejected: true, otherAADRejected: true,
    otherKeyRejected: true, externalCodecDecryptsOnce: true, disabledCacheDecryptsOnce: true,
    providerCalls: 0, originalRoomWrites: 0, fullActionPerformanceCertification: false,
    trainingTruth: false };
  await writeFile(outputPath, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  assert.equal(ownProducerDecryptions, 0, 'OWN_AUTHENTICATED_CIPHER_DECRYPTED_AGAIN');
  process.exit(0);
}
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const sourceHash = hash(capture);
const aggregate = structuredClone(capture.aggregate);
assert.equal(aggregate.stateRevision, 82);
assert.equal(aggregate.envelope.state.board.terrain.length, 1804);
const aad = `room:${capture.roomId}:aggregate`;
const key = randomBytes(32);
const codec = createStarcraftTmgPrivatePayloadCodec({ key,
  keyId: "local-room-decode-probe", trustLevel: "development_persistent" });
// Local bearer fixtures select existing frozen seat-view semantics. They are
// NOT an acceptance of original grants, recovery, lease or Apply authority.
const tokens = {};
for (const seatKey of ["player1", "player2"]) {
  const grant = Object.values(aggregate.grants).find(entry =>
    entry.seatKey === seatKey && !entry.revoked
      && entry.authority.capabilities.includes("read_room"));
  assert(grant, `captured readable ${seatKey} grant required`);
  tokens[seatKey] = randomBytes(32).toString("base64url");
  grant.tokenHash = hash({ schemaVersion: "starcraft_tmg_seat_token_digest_v1",
    roomId: capture.roomId, token: tokens[seatKey] });
}
const fixtureHash = hash(aggregate);
const database = new DatabaseSync(":memory:");
const store = createSqliteStarcraftTmgRoomStore({ database, privatePayloadCodec: codec });
// The historical gate measures the first read of externally persisted bytes,
// not a cipher just generated by the reader itself. Preserve that seam.
const initialWriter = createStarcraftTmgPrivatePayloadCodec({ key,
  keyId: codec.descriptor.keyId, cacheAggregatePayloads: false });
const initialCipher = initialWriter.encode(aggregate, aad);
// Import the actual persisted revision into a disposable DB, rather than
// resetting the real room or claiming this is a new-game initialization.
database.prepare(`INSERT INTO sc_rooms (room_id, room_revision, state_revision,
  private_sequence, public_sequence, recovery_revision, aggregate_cipher,
  initial_envelope_cipher, created_at_audit, updated_at_audit)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(capture.roomId,
  aggregate.roomRevision, aggregate.stateRevision, aggregate.privateJournalSequence,
  aggregate.publicJournalSequence, aggregate.seatRecoveryRevision, initialCipher,
  codec.encode(capture.initialEnvelope, `room:${capture.roomId}:initial-envelope`),
  aggregate.createdAtAudit, aggregate.updatedAtAudit);
const runtime = createStarcraftTmgRoomRuntime({ roomStore: store });
let decryptions = 0;
const originalSetAAD = Decipheriv.prototype.setAAD;
Decipheriv.prototype.setAAD = function(value, ...args) {
  if (value.toString("utf8") === aad) decryptions += 1;
  return Reflect.apply(originalSetAAD, this, [value, ...args]);
};
let reads;
let repeatedReadDecryptions;
let sameStateControlChangeObserved;
let changedCipherRejected;
const started = performance.now();
try {
  reads = [];
  for (const seatKey of [null, "player1", "player2"]) {
    const response = await runtime.readRoom({ roomId: capture.roomId,
      ...(seatKey ? { seatToken: tokens[seatKey] } : {}) });
    assert.equal(response.ok, true);
    reads.push(response);
  }
  repeatedReadDecryptions = decryptions;
  assert.equal(reads[0].projection.viewer.visibilityScope, "public");
  assert.equal(reads[1].projection.viewer.seatKey, "player1");
  assert.equal(reads[2].projection.viewer.seatKey, "player2");
  assert.deepEqual(reads[0].projection.state.cardResources, {});
  assert.deepEqual(Object.keys(reads[1].projection.state.cardResources), ["player1"]);
  assert.deepEqual(Object.keys(reads[2].projection.state.cardResources), ["player2"]);
  const callerValue = await store.loadRoom(capture.roomId);
  callerValue.title = "caller-only mutation";
  callerValue.envelope.state.scores.player1 = -999;
  assert.deepEqual(await store.loadRoom(capture.roomId), aggregate,
    "private decode reuse must return a fresh mutable object to every caller");

  // A control/recovery-only update can keep stateRevision/stateHash unchanged.
  // Out-of-Store edits emulate another connection; no local invalidate hook.
  const next = structuredClone(aggregate);
  next.roomRevision += 1;
  next.seatRecoveryRevision += 1;
  const nextCipher = codec.encode(next, aad);
  database.prepare(`UPDATE sc_rooms SET room_revision=?, recovery_revision=?,
    aggregate_cipher=? WHERE room_id=?`).run(next.roomRevision,
    next.seatRecoveryRevision, nextCipher, capture.roomId);
  const nextRead = await store.loadRoom(capture.roomId);
  assert.deepEqual(nextRead, next);
  assert.equal(nextRead.envelope.stateHash, aggregate.envelope.stateHash);
  assert.equal(nextRead.stateRevision, aggregate.stateRevision);
  sameStateControlChangeObserved = nextRead.roomRevision === aggregate.roomRevision + 1;

  const tampered = JSON.parse(nextCipher);
  const tag = Buffer.from(tampered.tag, "base64url"); tag[0] ^= 1;
  tampered.tag = tag.toString("base64url");
  database.prepare("UPDATE sc_rooms SET aggregate_cipher=? WHERE room_id=?")
    .run(JSON.stringify(tampered), capture.roomId);
  await assert.rejects(store.loadRoom(capture.roomId), /auth|authenticate|Unsupported state/i);
  changedCipherRejected = true;
  assert.throws(() => codec.decode(nextCipher, `room:other-room:aggregate`),
    /auth|authenticate|Unsupported state/i);
  const wrongKeyCodec = createStarcraftTmgPrivatePayloadCodec({ key: randomBytes(32),
    keyId: codec.descriptor.keyId });
  assert.throws(() => wrongKeyCodec.decode(nextCipher, aad),
    /auth|authenticate|Unsupported state/i);
  database.prepare("UPDATE sc_rooms SET aggregate_cipher=? WHERE room_id=?")
    .run(nextCipher, capture.roomId);
  assert.deepEqual(await store.loadRoom(capture.roomId), next);
  const replayBundle = await store.loadReplayBundle(capture.roomId);
  replayBundle.currentAggregate.title = "replay-caller-only mutation";
  assert.deepEqual(await store.loadRoom(capture.roomId), next);
  // Disabling only the optimization retains the exact cold-codec semantics.
  const cold = createStarcraftTmgPrivatePayloadCodec({ key,
    keyId: codec.descriptor.keyId, cacheAggregatePayloads: false });
  const beforeCold = decryptions;
  assert.deepEqual(cold.decode(nextCipher, aad), next);
  assert.deepEqual(cold.decode(nextCipher, aad), next);
  assert.equal(decryptions - beforeCold, 2);
} finally {
  Decipheriv.prototype.setAAD = originalSetAAD;
  store.close();
}
assert.equal(hash(capture), sourceHash);
assert.equal(hash(aggregate), fixtureHash);
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, "utf8")); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  baseline = { sourceHash, fixtureStateHash: aggregate.envelope.stateHash,
    repeatedReadDecryptions, reads };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.sourceHash, sourceHash);
assert.equal(baseline.fixtureStateHash, aggregate.envelope.stateHash);
// Ephemeral local bearer fixtures do not change their captured grant IDs,
// public binding, Rules state or any public/private seat projection bytes.
assert.deepEqual(reads, baseline.reads, "entire original three viewer projections unchanged");
console.log(JSON.stringify({ operation: "room_aggregate_decode_reuse",
  revision: 82, terrainRows: 1804, viewerReads: 3,
  originalDecryptions: baseline.repeatedReadDecryptions, repeatedReadDecryptions,
  entireOriginalViewersEqual: true, callerMutationIsolated: true,
  sameStateControlChangeObserved, changedCipherRejected,
  otherRoomAADRejected: true, wrongKeyRejected: true, sourceUnchanged: true,
  elapsedMs: performance.now() - started, fullActionPerformanceCertification: false,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
assert.equal(repeatedReadDecryptions, 1, "UNCHANGED_ROOM_AGGREGATE_REPEATED_AES_DECRYPTION");
