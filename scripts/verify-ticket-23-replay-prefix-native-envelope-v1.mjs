// Performance observation, not a new rules gate or a live-game continuation.
// Restore an actual accepted action's signed pre-state in an encrypted RAM store.
// Keep the original full aggregate history overhead; source SQLite is read-only.
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Session } from 'node:inspector';
import { isDeepStrictEqual } from 'node:util';
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from '../packages/room-store/room-store-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../packages/room-store/sqlite-room-store-v1.mjs';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
// Instrument only the native owner seam; preserve all official runtime code.
const engineUrl = new URL('../packages/authoritative-engine/transition-v1.mjs', import.meta.url);
let engineSource = await readFile(engineUrl, 'utf8');
engineSource = engineSource.replace('function clone(value) {',
  'function clone(value) {\n if (value?.schemaVersion === \"starcraft_tmg_authority_v2.envelope\" && value.state?.board?.terrain?.length === 1804) __copyCounts.completeEnvelopeCopies++;');
engineSource = engineSource.replace('function normalizeAuthorityState(input, stateRevision = 0) {',
  'function normalizeAuthorityState(input, stateRevision = 0) {\n __copyCounts.normalizations++;');
engineSource = engineSource.replace('  return Object.freeze({\n    createMatchBinding,',
  '  return Object.freeze({\n    __perfValidateEnvelope: validateEnvelope,\n    createMatchBinding,');
const relocate = (text, url) => text.replace(/(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
  (_, prefix, quote, specifier) => prefix + quote + new URL(specifier, url).href + quote);
engineSource = 'export const __copyCounts = { completeEnvelopeCopies: 0, normalizations: 0 };\n'
  + relocate(engineSource, engineUrl);
const engineDataUrl = 'data:text/javascript;base64,' + Buffer.from(engineSource).toString('base64');
const { __copyCounts } = await import(engineDataUrl);
const fixtureUrl = new URL('./support/ticket20-human-agent-demo-fixture-v1.mjs', import.meta.url);
let fixtureSource = relocate(await readFile(fixtureUrl, 'utf8'), fixtureUrl);
fixtureSource = fixtureSource.replace(engineUrl.href, engineDataUrl)
  .replaceAll('import.meta.url', JSON.stringify(fixtureUrl.href));
const { createTicket20HumanAgentDemoFixtureV1 } = await import(
  'data:text/javascript;base64,' + Buffer.from(fixtureSource).toString('base64'));

import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { enumerateOfficialSelectedRosterRangedActionsV1 } from
  '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';

const [root, sourceDirectory, outputDirectory, postRevisionText, observationMode, originalBaselinePath] = process.argv.slice(2);
const postRevision = Number(postRevisionText);
if (!root || !sourceDirectory || !outputDirectory || !Number.isSafeInteger(postRevision)) {
  throw new Error('root/source/output/actual accepted post revision required');
}
const privateState = JSON.parse(await readFile(path.join(sourceDirectory, 'runner-private.json'), 'utf8'));
const roomId = privateState.roomId;
const sourceDb = new DatabaseSync(path.join(sourceDirectory, 'room.sqlite'), { readOnly: true });
const rows = {};
try {
  sourceDb.exec('BEGIN');
  for (const table of ['sc_rooms', 'sc_private_journal', 'sc_checkpoints']) {
    rows[table] = sourceDb.prepare(`SELECT * FROM ${table} WHERE room_id = ?`).all(roomId);
  }
  if (sourceDb.prepare('SELECT total_changes() AS n').get().n !== 0) throw new Error('SOURCE_WRITE');
  sourceDb.exec('COMMIT');
} finally { sourceDb.close(); }
const database = new DatabaseSync(':memory:');
const codec = createStarcraftTmgPrivatePayloadCodec({ key: privateState.storeEncryptionKeyBase64,
  keyId: JSON.parse(rows.sc_rooms[0].aggregate_cipher).keyId });
const store = createSqliteStarcraftTmgRoomStore({ database, privatePayloadCodec: codec });
for (const [table, entries] of Object.entries(rows)) {
  const columns = Object.keys(entries[0] || {});
  if (!columns.length) continue;
  const insert = database.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  for (const entry of entries) insert.run(...columns.map(k => entry[k]));
}
const originalAggregate = await store.loadRoom(roomId);
const originalBundle = await store.loadReplayBundle(roomId);
const accepted = originalBundle.privateJournal.filter(e => e.payload.type === 'accepted_transition');
const targetReceipt = accepted.map(e => e.payload.payload.receipt).find(r => r.postStateRevision === postRevision);
if (!targetReceipt) throw new Error('RECORDED_ACCEPTED_ACTION_MISSING');
const preRevision = targetReceipt.preStateRevision;
const checkpointRow = rows.sc_checkpoints.filter(r => r.state_revision <= preRevision)
  .sort((a, b) => b.state_revision - a.state_revision)[0];
const checkpoint = checkpointRow ? codec.decode(checkpointRow.checkpoint_cipher,
  `room:${roomId}:checkpoint:${checkpointRow.state_revision}`) : null;
const sourceMaxSequence = Math.max(...rows.sc_private_journal.map(r => Number(r.sequence)));
let stage = 'setup';
const storeTimings = [];
let ramCommits = 0;
const roomStore = Object.freeze({ ...store,
  async createRoom() { throw new Error('SOURCE_ROOM_REINITIALIZATION_FORBIDDEN'); },
  async loadRoom(id) {
    const t = performance.now();
    try { return await store.loadRoom(id); }
    finally { storeTimings.push({ stage, operation: 'store.loadRoom', elapsedMs: performance.now() - t }); }
  },
  async commit(...args) {
    const t = performance.now();
    try { const result = await store.commit(...args); ramCommits++; return result; }
    finally { storeTimings.push({ stage, operation: 'store.commit.RAM', elapsedMs: performance.now() - t }); }
  },
  async loadReplayBundle(id) {
    const t = performance.now();
    try {
      const bundle = await store.loadReplayBundle(id);
      // Original future receipts belong to another historical continuation.
      // Preserve every receipt through the selected signed pre-state, plus the
      // newly executed RAM receipt; never relabel or rewrite original receipts.
      return { ...bundle, latestCheckpoint: checkpoint, privateJournal: bundle.privateJournal.filter(e =>
        e.sequence > sourceMaxSequence || e.payload.type !== 'accepted_transition'
        || e.payload.payload.receipt.postStateRevision <= preRevision) };
    } finally { storeTimings.push({ stage, operation: 'store.loadReplayBundle', elapsedMs: performance.now() - t }); }
  },
});
const crypto = createStarcraftTmgRefereeCrypto({ privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem, hmacSecret: privateState.refereeHmacSecret,
  keyId: originalAggregate.envelope.matchBinding.refereeKeyId, trustLevel: 'development_persistent' });
const recipes = originalBundle.initialEnvelope.state.armyBuildingConfigurationBySide;
if (!recipes?.player1?.units || !recipes?.player2?.units) throw new Error('ORIGINAL_RECIPES_MISSING');
const report = { schemaVersion: 'starcraft_tmg_formal_room_action_observation_v1',
  startedAt: new Date().toISOString(), roomId, sourceDirectory, preRevision, postRevision,
  sourceStateRevision: originalAggregate.envelope.stateRevision,
  sourceStateHash: originalAggregate.envelope.stateHash,
  actionType: targetReceipt.action.actionType, pieceId: targetReceipt.action.pieceId,
  originalReceiptHash: targetReceipt.journalHash, originalAggregateHistoryRetained: true,
  historicalEnvelopeRestore: true, backendOnly: true, originalRoomWrites: 0,
  providerCalls: 0, trainingTruth: false, functionalGatesRepeated: false, steps: [] };
console.log(JSON.stringify({ event: 'setup_started', ...report, steps: undefined }));
const setupStarted = performance.now();
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }), roomId,
  roomProfile: 'standard_2000_live', mapConfiguration: privateState.mapConfiguration,
  standard2000Recipes: recipes,
  ...(privateState.plannedSessionId ? { armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } : {}),
  ...(privateState.currentProductRuntimeVariant ? { currentProductRuntimeVariant: privateState.currentProductRuntimeVariant } : {}),
  resumeRoom: true, resumeCredentials: privateState.resumeCredentials, roomStore,
  refereeCrypto: crypto, attachBot: false, autoDrive: false, issueHumanRecovery: false,
  botDecisionPort: { async decide() { throw new Error('PROVIDER_FORBIDDEN'); } },
});
const restoreStarted = performance.now();
const restored = fixture.authorityEngine.replay({ initialEnvelope: originalBundle.initialEnvelope,
  ...(checkpoint ? { checkpoint } : {}), journal: accepted.map(e => e.payload.payload.receipt)
    .filter(r => r.postStateRevision > (checkpoint?.stateRevision || 0) && r.postStateRevision <= preRevision) });
if (!restored.ok || restored.envelope.stateHash !== targetReceipt.preStateHash) throw new Error('SIGNED_PRESTATE_RESTORE_FAILED');
report.restoreElapsedMs = performance.now() - restoreStarted;
await writeFile(path.join(outputDirectory, 'signed-prestate.private.json'),
  JSON.stringify(restored.envelope), { mode: 0o600 });

// The restore above is the FIRST actual successful signed-prefix replay.
// Reuse precisely that prefix: no room initialization, model or writes.
const replayInput = { initialEnvelope: originalBundle.initialEnvelope,
  ...(checkpoint ? { checkpoint } : {}), journal: accepted.map(e => e.payload.payload.receipt)
    .filter(r => r.postStateRevision > (checkpoint?.stateRevision || 0)
      && r.postStateRevision <= preRevision) };
assert(replayInput.journal.length > 0);
assert.equal(restored.envelope.state.board.terrain.length, 1804);
const originalInputHash = hash(replayInput);
__copyCounts.completeEnvelopeCopies = 0;
const repeatedStarted = performance.now();
const repeated = fixture.authorityEngine.replay(replayInput);
const repeatedElapsedMs = performance.now() - repeatedStarted;
assert.equal(repeated.ok, true);
assert.deepEqual(repeated, restored, 'ENTIRE original replay result must remain identical');
const repeatedCompleteEnvelopeCopies = __copyCounts.completeEnvelopeCopies;
const sameNativeEnvelope = repeated.envelope === restored.envelope;
assert.equal(Object.isFrozen(repeated.envelope.state.board.terrain[0]), true);
__copyCounts.normalizations = 0;
const validatedFirst = fixture.authorityEngine.__perfValidateEnvelope(repeated.envelope);
const afterFirstValidation = __copyCounts.normalizations;
const validatedSecond = fixture.authorityEngine.__perfValidateEnvelope(repeated.envelope);
const repeatedNormalizations = __copyCounts.normalizations - afterFirstValidation;
assert.deepEqual(validatedFirst, validatedSecond);
assert.notEqual(validatedFirst, validatedSecond);
validatedFirst.board.terrain[0].xInches = -999;
assert.notEqual(validatedSecond.board.terrain[0].xInches, -999);
assert.equal(hash(replayInput), originalInputHash);

// New suffix must execute against the original signed prefix, not cached future state.
const extended = fixture.authorityEngine.replay({ ...replayInput,
  journal: [...replayInput.journal, targetReceipt] });
assert.equal(extended.ok, true);
assert.equal(extended.envelope.stateHash, targetReceipt.postStateHash);
assert.equal(extended.envelope.journalHeadHash, targetReceipt.journalHash);
assert.equal(extended.envelope.stateRevision, postRevision);
const tampered = structuredClone(replayInput);
tampered.journal[0].postStateHash = '0'.repeat(64);
const rejectedJournal = fixture.authorityEngine.replay(tampered);
assert.equal(rejectedJournal.ok, false);
assert.equal(rejectedJournal.reason, 'SIGNATURE_INVALID');
const external = structuredClone(repeated.envelope);
__copyCounts.normalizations = 0;
fixture.authorityEngine.__perfValidateEnvelope(external);
fixture.authorityEngine.__perfValidateEnvelope(external);
assert.equal(__copyCounts.normalizations, 2,
  'decoded external envelope must not inherit native private provenance');
assert.equal(hash(replayInput), originalInputHash);
const result = { ...report, observationMode: 'replay_prefix_native_envelope',
  repeatedElapsedMs, repeatedCompleteEnvelopeCopies, sameNativeEnvelope,
  repeatedNormalizations, originalReplayResultSame: true,
  nativeImmutableReturn: true, independentMutableValidationReturns: true,
  originalSignedSuffixSame: true, tamperedJournalRejected: true,
  externalEnvelopeStillFullyValidated: true, originalInputUnchanged: true,
  ramCommits: 0, newExperiments: 0, wholeActionAccepted: false,
  status: repeatedCompleteEnvelopeCopies === 0 && sameNativeEnvelope
    && repeatedNormalizations === 0 ? 'native_replay_prefix_owner_retained'
      : 'NATIVE_REPLAY_PREFIX_OWNER_LOST_TO_FULL_MAP_COPY',
  completedAt: new Date().toISOString() };
await writeFile(path.join(outputDirectory, 'report.private.json'),
  JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result));
database.close();
assert.equal(repeatedCompleteEnvelopeCopies, 0,
  'same verified prefix copied the complete native envelope again');
assert.equal(sameNativeEnvelope, true);
assert.equal(repeatedNormalizations, 0);
