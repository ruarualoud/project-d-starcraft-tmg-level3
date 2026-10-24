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
import { createTicket20HumanAgentDemoFixtureV1 } from './support/ticket20-human-agent-demo-fixture-v1.mjs';
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
if (observationMode === 'same_state_enumeration_reuse') {
  // Concrete public-call bug: the SAME complete verified input rebuilds all
  // ranged geometry instead of reusing its immutable native enumeration.
  // The second object is a full independent copy, as real Store decoding is.
  const originalInputHash = hash(restored.envelope.state);
  const startedFirst = performance.now();
  const first = enumerateOfficialSelectedRosterRangedActionsV1(restored.envelope.state,
    { sideKey: targetReceipt.applyingSeatKey, includeDisabled: true });
  const firstElapsedMs = performance.now() - startedFirst;
  const secondState = structuredClone(restored.envelope.state);
  const secondWasFrozen = Object.isFrozen(secondState);
  const startedSecond = performance.now();
  const second = enumerateOfficialSelectedRosterRangedActionsV1(secondState,
    { sideKey: targetReceipt.applyingSeatKey, includeDisabled: true });
  const secondElapsedMs = performance.now() - startedSecond;
  const originalInputUnchanged = hash(restored.envelope.state) === originalInputHash
    && hash(secondState) === originalInputHash;
  const callerOwnershipUnchanged = Object.isFrozen(secondState) === secondWasFrozen;
  const entireResultSame = isDeepStrictEqual(first, second);
  const entireOriginalBaselineSame = originalBaselinePath
    ? isDeepStrictEqual(first, JSON.parse(await readFile(originalBaselinePath, 'utf8'))) : null;
  const nativeImmutableResultReused = first === second && Object.isFrozen(second);
  const result = { ...report, observationMode, firstElapsedMs, secondElapsedMs,
    originalInputHash, originalInputUnchanged, callerOwnershipUnchanged, entireResultSame,
    entireOriginalBaselineSame,
    nativeImmutableResultReused, nativeResultHash: hash(first), providerCalls: 0,
    originalRoomWrites: 0, ramCommits: 0, completedAt: new Date().toISOString() };
  result.status = nativeImmutableResultReused && entireResultSame && originalInputUnchanged
    && callerOwnershipUnchanged && entireOriginalBaselineSame !== false
    ? 'same_complete_native_enumeration_reused'
    : 'SAME_VERIFIED_STATE_REBUILDS_RANGED_ENUMERATION';
  await writeFile(path.join(outputDirectory, 'native-enumeration-baseline.private.json'),
    JSON.stringify(first), { mode: 0o600 });
  await writeFile(path.join(outputDirectory, 'report.private.json'),
    JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ event: 'same_state_reuse_observation_complete', ...result }));
  database.close();
  process.exit(result.status === 'same_complete_native_enumeration_reused' ? 0 : 1);
}
// This is a diagnostic branch only. Audit/control history remains the original
// full aggregate; only its Rules envelope and accepted-count cursor are rewound.
const shadowAggregate = { ...originalAggregate, stateRevision: preRevision,
  acceptedReceiptCount: preRevision, envelope: restored.envelope };
database.prepare('UPDATE sc_rooms SET state_revision = ?, aggregate_cipher = ? WHERE room_id = ?')
  .run(preRevision, codec.encode(shadowAggregate, `room:${roomId}:aggregate`), roomId);
report.setupElapsedMs = performance.now() - setupStarted;
console.log(JSON.stringify({ event: 'setup_complete', setupElapsedMs: report.setupElapsedMs,
  restoreElapsedMs: report.restoreElapsedMs, preRevision }));
const credential = privateState.resumeCredentials[targetReceipt.applyingSeatKey === 'player1' ? 'human' : 'bot'];
const base = { roomId, seatToken: credential.seatToken };
const session = new Session(); session.connect();
const post = (method, args = {}) => new Promise((resolve, reject) =>
  session.post(method, args, (error, response) => error ? reject(error) : resolve(response)));
await post('Profiler.enable'); await post('Profiler.start');
const operationStarted = performance.now();
async function observe(name, input) {
  stage = name;
  console.log(JSON.stringify({ event: 'operation_started', operation: name, startedAt: new Date().toISOString() }));
  const t = performance.now();
  const response = await fixture.roomRuntime[name](input);
  const step = { operation: name, elapsedMs: performance.now() - t,
    ok: response.ok, reason: response.reason || null, matchesCurrent: response.matchesCurrent ?? null };
  report.steps.push(step);
  await writeFile(path.join(outputDirectory, name + '.private.json'), JSON.stringify(response), { mode: 0o600 });
  await appendFile(path.join(outputDirectory, 'progress.ndjson'), JSON.stringify(step) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ event: 'operation_complete', ...step }));
  if (!response.ok) throw new Error(`${name}:${response.reason}`);
  return response;
}
try {
  const read = await observe('readRoom', base);
  if (read.projection.viewer.seatKey !== targetReceipt.applyingSeatKey) throw new Error('ORIGINAL_SEAT_MISMATCH');
  const legal = await observe('legalSpace', base);
  report.originalLegalSpaceIdentitySame = legal.legalSpace.legalSpaceHash === targetReceipt.legalSpaceHash;
  const lease = await observe('claimControl', { ...base, sessionId: 'isolated-native-action-latency-observation' });
  const preview = await observe('previewAction', { ...base, proposal: targetReceipt.proposal,
    expectedMatchBindingHash: restored.envelope.matchBindingHash,
    expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
    expectedStateRevision: preRevision, expectedStateHash: restored.envelope.stateHash });
  let confirmation;
  if (preview.confirmationRequired) confirmation = await observe('confirmPreview', { ...base,
    previewId: preview.preview.previewId, previewToken: preview.preview.previewToken,
    previewContentHash: preview.preview.previewSeal.contentHash });
  const applied = await observe('applyAction', { ...base,
    previewId: preview.preview.previewId, confirmationId: confirmation?.confirmation?.confirmationId,
    leaseId: lease.controlLease.leaseId, leaseFence: lease.controlLease.leaseFence,
    expectedStateRevision: preRevision, idempotencyKey: `isolated-latency-${postRevision}` });
  report.originalPostStateHashSame = applied.receipt.postStateHash === targetReceipt.postStateHash;
  report.originalChanceRevealSame = isDeepStrictEqual(applied.receipt.chanceReveal, targetReceipt.chanceReveal);
  report.originalEventsSame = isDeepStrictEqual(applied.receipt.events, targetReceipt.events);
  report.originalProposalSame = isDeepStrictEqual(applied.receipt.proposal, targetReceipt.proposal);
  const replay = await observe('replayRoom', base);
  report.replayMatchesRamCurrent = replay.matchesCurrent;
  report.status = report.originalPostStateHashSame && report.originalChanceRevealSame
    && report.originalEventsSame && report.originalProposalSame && replay.matchesCurrent
    ? 'native_backend_complete_original_effects_same' : 'native_backend_effect_difference';
} catch (error) { report.status = 'observation_failed'; report.failure = error.message; process.exitCode = 1; }
finally {
  report.operationChainElapsedMs = performance.now() - operationStarted;
  const { profile } = await post('Profiler.stop'); session.disconnect();
  await writeFile(path.join(outputDirectory, 'cpu-profile.private.json'), JSON.stringify(profile), { mode: 0o600 });
  report.storeTimings = storeTimings; report.ramCommits = ramCommits;
  report.completedAt = new Date().toISOString();
  await writeFile(path.join(outputDirectory, 'report.private.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ event: 'observation_complete', ...report, storeTimings: undefined }));
  database.close();
}
