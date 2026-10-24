import { mkdir } from 'node:fs/promises';
import { createStarcraftTmgHostedOpponentRuntimeV2 } from '../packages/online-agent-session/hosted-opponent-runtime-v2.mjs';
import { createStarcraftTmgPlayerSpatialObservationV1 } from '../packages/online-agent-session/player-spatial-observation-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { createSqliteStarcraftTmgHostedBotSeatStoreV1 } from '../packages/online-agent-session/sqlite-hosted-bot-seat-store-v1.mjs';
import { createSqliteStarcraftTmgMatchDecisionJournalV1 } from '../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs';
import { createSqliteStarcraftTmgLiveDecisionStoreV1, decodeStarcraftTmgLiveDecisionRecordV1 } from '../packages/online-agent-session/sqlite-live-decision-store-v1.mjs';
import { createStarcraftTmgLiveOpponentProviderStackV1 } from '../packages/online-agent-session/live-opponent-provider-stack-v1.mjs';
import { STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1 } from '../content/provider/ticket-23-live-provider-profiles-v1.mjs';
// Performance observation, not a new rules gate or a live-game continuation.
// Restore an actual accepted action's signed pre-state in an isolated encrypted WAL store.
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

const [root, matrixPath, groupId, outputDirectory, remainingBudgetText,
  verifiedPrestatePath, startBarrierPath] = process.argv.slice(2);
const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
const group = matrix.groups.find(value => value.groupId === groupId);
if (!group) throw new Error('PERFORMANCE_GROUP_REQUIRED');
const sourceDirectory = group.source;
const postRevision = group.authority.stateRevision + 1;
const remainingBudgetCnyMicros = Number(remainingBudgetText);
if (!(remainingBudgetCnyMicros > 0)) throw new Error('AUTHORIZED_LANE_BUDGET_EXHAUSTED');
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
const database = new DatabaseSync(path.join(outputDirectory, 'isolated-room.sqlite'));
const codec = createStarcraftTmgPrivatePayloadCodec({ key: privateState.storeEncryptionKeyBase64,
  keyId: JSON.parse(rows.sc_rooms[0].aggregate_cipher).keyId });
const store = createSqliteStarcraftTmgRoomStore({ database, privatePayloadCodec: codec });
for (const [table, entries] of Object.entries(rows)) {
  const columns = Object.keys(entries[0] || {});
  if (!columns.length) continue;
  const insert = database.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  // A historical branch must not inherit checkpoints from its discarded future.
  // The C71 observation reproduced UNIQUE(room_id,state_revision) at new revision72.
  // Preserve the complete aggregate/journal overhead, but only prefix checkpoints.
  for (const entry of entries) {
    if (table === 'sc_checkpoints' && Number(entry.state_revision) > group.authority.stateRevision) continue;
    insert.run(...columns.map(k => entry[k]));
  }
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
  async loadOwnedRoom(id) {
    const t = performance.now();
    try { return await store.loadOwnedRoom(id); }
    finally { storeTimings.push({ stage, operation: 'store.loadOwnedRoom', elapsedMs: performance.now() - t }); }
  },
  async commit(...args) {
    const t = performance.now();
    try { const result = await store.commit(...args); ramCommits++; return result; }
    finally { storeTimings.push({ stage, operation: 'store.commit.isolatedWal', elapsedMs: performance.now() - t }); }
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
  async loadOwnedReplayBundle(id) {
    const t = performance.now();
    try {
      const bundle = await store.loadOwnedReplayBundle(id);
      return { ...bundle, latestCheckpoint: checkpoint,
        privateJournal: bundle.privateJournal.filter(e =>
          e.sequence > sourceMaxSequence || e.payload.type !== 'accepted_transition'
          || e.payload.payload.receipt.postStateRevision <= preRevision) };
    } finally { storeTimings.push({ stage,
      operation: 'store.loadOwnedReplayBundle', elapsedMs: performance.now() - t }); }
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
  historicalEnvelopeRestore: true, freshModel: true, groupId, lane: group.lane, historicalSamples: group.cases, webRenderingMeasured: false, backendOnly: false, originalRoomWrites: 0,
  measurementConcurrency: process.env.STARCRAFT_TMG_MEASUREMENT_CONCURRENCY || 'single_action_queue',
  providerCalls: 0, trainingTruth: false, functionalGatesRepeated: false, steps: [] };
console.log(JSON.stringify({ event: 'setup_started', ...report, steps: undefined }));
const setupStarted = performance.now();
const events = [];
let measurementPhase = 'setup';
let timelineOrigin = performance.now();
let eventTail = Promise.resolve();
function observeStage(event) {
  const row = { ...event, groupId, measurementPhase, offsetMs: performance.now() - timelineOrigin };
  events.push(row);
  eventTail = eventTail.then(() => appendFile(path.join(outputDirectory, 'stage-timings.ndjson'), JSON.stringify(row) + '\n', { mode: 0o600 }));
}
const memoryDb = new DatabaseSync(path.join(outputDirectory, 'match-memory.sqlite'));
const memoryJournal = createSqliteStarcraftTmgMatchDecisionJournalV1({ database: memoryDb });
const memorySourceDb = new DatabaseSync(path.join(sourceDirectory, 'seats', group.authority.seatKey, 'match-memory.sqlite'), { readOnly: true });
let memoryPrefix;
try {
  memoryPrefix = memorySourceDb.prepare('SELECT * FROM sc_match_decision_journal ORDER BY sequence').all()
    .filter(row => JSON.parse(row.record_json).authority.stateRevision < group.authority.stateRevision);
  const insertMemory = memoryDb.prepare('INSERT INTO sc_match_decision_journal (scope_key,sequence,record_hash,record_json,occurred_at) VALUES (?,?,?,?,?)');
  for (const row of memoryPrefix) insertMemory.run(row.scope_key,row.sequence,row.record_hash,row.record_json,row.occurred_at);
} finally { memorySourceDb.close(); }
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }), roomId,
  roomProfile: 'standard_2000_live', mapConfiguration: privateState.mapConfiguration,
  standard2000Recipes: recipes,
  ...(privateState.plannedSessionId ? { armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } : {}),
  ...(privateState.currentProductRuntimeVariant ? { currentProductRuntimeVariant: privateState.currentProductRuntimeVariant } : {}),
  resumeRoom: true, resumeCredentials: privateState.resumeCredentials, roomStore,
  refereeCrypto: crypto, attachBot: false, autoDrive: false, issueHumanRecovery: false,
  botDecisionPort: { async decide() { throw new Error('UNATTACHED_FIXTURE_BOT_FORBIDDEN'); } },
  matchDecisionJournal: memoryJournal, observeBotStage: observeStage,
});
const restoreStarted = performance.now();
// Historical fixture restoration belongs to setup, not action latency. Always
// warm the engine through its native verified history: merely reading a saved
// Envelope shifts that work into the measured first-action Replay. An optional
// old artifact is a complete-result consistency reference, never a memo import.
const restored = fixture.authorityEngine.replay({ initialEnvelope: originalBundle.initialEnvelope,
  ...(checkpoint ? { checkpoint } : {}), journal: accepted.map(e => e.payload.payload.receipt)
    .filter(r => r.postStateRevision > (checkpoint?.stateRevision || 0) && r.postStateRevision <= preRevision) });
if (!restored.ok || restored.envelope.stateHash !== targetReceipt.preStateHash) throw new Error('SIGNED_PRESTATE_RESTORE_FAILED');
if (verifiedPrestatePath && !isDeepStrictEqual(restored.envelope,
  JSON.parse(await readFile(verifiedPrestatePath, 'utf8')))) {
  throw new Error('SAVED_PRESTATE_COMPLETE_RESULT_MISMATCH');
}
report.restoreElapsedMs = performance.now() - restoreStarted;
report.restoreMethod = 'authority_engine_history_replay';
report.savedPrestateUsedAsConsistencyReference = Boolean(verifiedPrestatePath);
report.restoreReplayRepeated = true;
report.measurementReplayState = 'native_history_restore_completed';
report.restorationIsMeasuredActionWork = false;
report.restoredCompleteEnvelopeHash = hash(restored.envelope);
await writeFile(path.join(outputDirectory, 'signed-prestate.private.json'),
  JSON.stringify(restored.envelope), { mode: 0o600 });

if (restored.envelope.stateRevision !== group.authority.stateRevision || restored.envelope.stateHash !== group.authority.stateHash) throw new Error('PERFORMANCE_ORIGINAL_SIGNED_INPUT_MISMATCH');
const shadowAggregate = { ...originalAggregate, stateRevision: preRevision, acceptedReceiptCount: preRevision, envelope: restored.envelope };
database.prepare('UPDATE sc_rooms SET state_revision = ?, aggregate_cipher = ? WHERE room_id = ?')
  .run(preRevision, codec.encode(shadowAggregate, 'room:' + roomId + ':aggregate'), roomId);
const seatKey = group.authority.seatKey;
const originalProviderDb = new DatabaseSync(path.join(sourceDirectory, 'seats', seatKey, 'provider/live-decisions.sqlite'), { readOnly: true });
let originalLive;
try { const row = originalProviderDb.prepare('SELECT record_json FROM sc_live_decision_records').get(); originalLive = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json); }
finally { originalProviderDb.close(); }
const ownOriginalSpent = Number(originalLive.usage.estimatedCostCnyMicros || 0);
const ownOriginalCalls = Number(originalLive.usage.providerCalls || 0);
const providerDirectory = path.join(outputDirectory, 'provider');
await mkdir(providerDirectory, { recursive: true, mode: 0o700 });
const seedDb = new DatabaseSync(path.join(providerDirectory, 'live-decisions.sqlite'));
const seedAdapter = createSqliteStarcraftTmgLiveDecisionStoreV1({ database: seedDb });
const seedLive = structuredClone(originalLive);
seedLive.decisions = Object.fromEntries(Object.entries(seedLive.decisions).filter(([, choice]) => choice.authority.stateRevision < preRevision));
seedLive.lifecycle = 'open'; seedLive.closedAt = null;
seedDb.prepare('INSERT INTO sc_live_decision_records (scope_key,revision,record_json,updated_at) VALUES (?,?,?,?)')
  .run(seedLive.scope.scopeKey, seedLive.revision, JSON.stringify(seedLive), seedLive.updatedAt);
seedDb.close();
const botDb = new DatabaseSync(path.join(outputDirectory, 'bot-seat.sqlite'));
const botStore = createSqliteStarcraftTmgHostedBotSeatStoreV1({ database: botDb });
const originalBotDb = new DatabaseSync(path.join(sourceDirectory, 'seats', seatKey, 'bot-seat.sqlite'), { readOnly: true });
let oldBot;
try { oldBot = JSON.parse(originalBotDb.prepare('SELECT record_json FROM sc_hosted_bot_seat_records').get().record_json); }
finally { originalBotDb.close(); }
const oldTraceCount = oldBot.traces.length;
oldBot.traces = oldBot.traces.filter(trace => trace.postStateRevision <= preRevision);
oldBot.actionCount -= oldTraceCount - oldBot.traces.length;
oldBot.replayVerifiedCount = oldBot.actionCount;
oldBot.inflight = null; oldBot.closedAt = null; oldBot.lifecycle = 'active'; oldBot.driveStatus = 'historical_performance_branch';
oldBot.lastAttemptedStateHash = null; oldBot.lastPreviewFailure = null; oldBot.preexecutionDeferralStateHash = null;
oldBot.lastObservedStateRevision = preRevision; oldBot.lastObservedStateHash = restored.envelope.stateHash;
oldBot.lastAppliedStateRevision = oldBot.traces.at(-1)?.postStateRevision ?? null;
oldBot.lastDecision = null;
oldBot.lastReceiptHash = oldBot.traces.at(-1)?.applyReceiptHash ?? null;
oldBot.lastReplayMatchesCurrent = true;
const originalChoice = Object.values(originalLive.decisions).find(choice => choice.authority.stateRevision === preRevision);
oldBot.issues = oldBot.issues.filter(issue => !issue.occurredAt || issue.occurredAt < (originalChoice?.createdAt || '1970-01-01'));
botDb.prepare('INSERT INTO sc_hosted_bot_seat_records (scope_key,revision,record_json,updated_at) VALUES (?,?,?,?)')
  .run(oldBot.scope.scopeKey, oldBot.revision, JSON.stringify(oldBot), oldBot.updatedAt);
const spatialRulesQuery = seatKey === 'player1' ? fixture.humanSpatialRulesQuery : fixture.spatialRulesQuery;
const spatialRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1({ rulesQuery: spatialRulesQuery.query, rulesQueryBatch: spatialRulesQuery.queryBatch, observeQueryDiagnostic: observeStage });
const queryCalls = [];
function timedQuery(name) { return async input => {
  const start = performance.now();
  const row = { operation: name, startMs: start - timelineOrigin, queryKind: input.query?.kind || input.queryKind || null, measurementPhase };
  if (name === 'queryBatch') row.requestedKinds = (input.queries || input.requests || []).map(q => q.query?.kind || q.queryKind || null);
  try { const result = await spatialRuntime[name](input); row.ok = result.ok ?? (result.results || []).every(r => r.ok !== false); return result; }
  finally { row.endMs = performance.now() - timelineOrigin; row.elapsedMs = performance.now() - start; queryCalls.push(row); }
}; }
const wrappedSpatial = { ...spatialRuntime, query: timedQuery('query'), queryBatch: timedQuery('queryBatch') };
const roomCalls = [];
const appliedResults = [];
const observedRoom = Object.fromEntries(['readRoom','legalSpace','previewAction','confirmPreview','claimControl','applyAction','replayRoom'].map(name => [name, async input => {
  const start = performance.now(); const row = { operation: name, startMs: start - timelineOrigin, measurementPhase };
  try {
    const request = name === 'applyAction' ? { ...input, idempotencyKey: 'performance-' + groupId + '-' + input.idempotencyKey } : input;
    const result = await fixture.roomRuntime[name](request); row.ok = result.ok; row.reason = result.reason || null;
    if (name === 'applyAction' && result.ok) appliedResults.push(result);
    return result;
  } finally { row.endMs = performance.now() - timelineOrigin; row.elapsedMs = performance.now() - start; roomCalls.push(row); }
}]));
const snapshot = originalLive.strategySkillSnapshot;
const strategyEntries = snapshot.skills.map((skill, i) => ({ role: snapshot.skillRefs[i].role, skill,
  factionRecordKey: snapshot.ownFaction, ownFaction: snapshot.ownFaction, opponentFaction: snapshot.opponentFaction }));
let providerStack = null; let runtime = null; let finalLive = null;
try {
  providerStack = await createStarcraftTmgLiveOpponentProviderStackV1({
    roomId, seatKey, providerProfiles: [STARCRAFT_TMG_TICKET_23_LIVE_FLASH_PROVIDER_PROFILE_V1],
    providerInteractionMode: originalLive.providerInteractionMode,
    matchBinding: fixture.createdRoom.matchBinding, spatialQueryPort: wrappedSpatial, memoryQueryPort: fixture.continuity,
    strategyEntries, ownFaction: snapshot.ownFaction, opponentFaction: snapshot.opponentFaction,
    dataDirectory: providerDirectory, matchMode: originalLive.matchMode,
    budgetLimitCnyMicros: ownOriginalSpent + remainingBudgetCnyMicros, maxProviderCalls: 1024,
  });
  if (providerStack.strategySkillSnapshot.skillSetHash !== snapshot.skillSetHash || providerStack.selectedProfile.model !== 'deepseek-flash') throw new Error('PERFORMANCE_FROZEN_SKILL_OR_FLASH_MISMATCH');
  const notifications = [];
  const actualDecisionPort = { async decide(input) {
    const actual = { stateRevision: input.roomProjection.room.stateRevision, stateHash: input.roomProjection.room.stateHash,
      legalSpaceHash: input.legalSpace.legalSpaceHash, spatialObservationHash: input.spatialObservation.observationHash,
      spatialActionSpaceHash: input.spatialActionSpace.actionSpaceHash };
    report.sameOriginalAuthority = Object.entries(actual).every(([key,value]) => group.authority[key] === value);
    report.decisionInputAuthority = actual;
    if (!report.sameOriginalAuthority) throw new Error('PERFORMANCE_DECISION_INPUT_DRIFT');
    return providerStack.decisionPort.decide(input);
  } };
  runtime = createStarcraftTmgHostedOpponentRuntimeV2({ roomPort: observedRoom, decisionPort: actualDecisionPort, store: botStore,
    decisionContinuity: fixture.continuity, spatialObservationProjector: createStarcraftTmgPlayerSpatialObservationV1,
    spatialActionQueryRuntime: spatialRuntime, turnPlanRuntime: fixture.turnPlanRuntime,
    matchMode: originalLive.matchMode, observeStage,
    notificationPort: { async notify(event) { notifications.push(event); return { ok: true }; } },
  });
  const credential = privateState.resumeCredentials[seatKey === 'player1' ? 'human' : 'bot'];
  const attached = await runtime.attach({ scope: originalLive.scope, seatToken: credential.seatToken,
    automationConsent: { approved: true, approvedBy: 'human', scope: 'current_match_bot_seat', approvedAt: new Date().toISOString() }, autoDrive: false });
  if (!attached.ok) throw new Error('PERFORMANCE_ATTACH_FAILED');
  report.setupElapsedMs = performance.now() - setupStarted;
  report.memoryPrefixRecords = memoryPrefix.length; report.botPrefixTraces = oldBot.traces.length;
  report.sourceRoomIsReadOnly = true; report.shadowUsesSqliteWal = true;
  report.providerCallsAreFresh = true; report.fullCandidateAndStrategyInputPreserved = true;
  report.isolatedIdempotencyNamespace = true;
  if (startBarrierPath) {
    await writeFile(path.join(outputDirectory, 'measurement-ready.private.json'),
      JSON.stringify({ groupId, readyAt: new Date().toISOString(),
        sameOriginalAuthorityExpected: group.authority,
        restoredCompleteEnvelopeHash: report.restoredCompleteEnvelopeHash }),
      { mode: 0o600 });
    const barrierStarted = performance.now();
    for (;;) {
      try { await readFile(startBarrierPath); break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (performance.now() - barrierStarted > 600000) throw new Error('MEASUREMENT_START_BARRIER_EXPIRED');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    report.startBarrierWaitMs = performance.now() - barrierStarted;
  }
  measurementPhase = 'action'; stage = 'action'; timelineOrigin = performance.now();
  console.log(JSON.stringify({ event: 'real_model_action_started', groupId, historicalSamples: group.cases, setupElapsedMs: report.setupElapsedMs }));
  const started = performance.now();
  const result = await runtime.drive({ scope: originalLive.scope, strategySkillSetHash: snapshot.skillSetHash });
  report.completeProductCoreElapsedMs = performance.now() - started;
  report.setupPlusProductCoreElapsedMs = report.setupElapsedMs + report.completeProductCoreElapsedMs;
  report.result = { ok: result.ok, outcome: result.outcome || null, reason: result.reason || null,
    trace: result.trace || null, physicalOperationTask: result.physicalOperationTask || null };
  measurementPhase = 'after_action'; stage = 'after_action';
  const memoryAfter = await memoryJournal.read(originalLive.scope);
  const applied = appliedResults.at(-1);
  report.memoryOutcomeRecorded = Boolean(applied && memoryAfter.records.some(record => record.kind === 'decision_outcome'
    && record.authority.stateRevision === applied.receipt.postStateRevision));
  report.postStateRevision = applied?.receipt?.postStateRevision ?? null;
  report.postStateHash = applied?.receipt?.postStateHash ?? null;
  report.notificationsDelivered = notifications.length;
  report.status = result.ok && result.outcome === 'bot_action_applied' && result.trace?.replayMatchesCurrent === true
    && report.memoryOutcomeRecorded ? 'fresh_model_product_core_measured' : 'product_core_incomplete';
  await writeFile(path.join(outputDirectory, 'drive-result.private.json'), JSON.stringify(result), { mode: 0o600 });
  await writeFile(path.join(outputDirectory, 'memory-after.private.json'), JSON.stringify(memoryAfter), { mode: 0o600 });
} catch (error) {
  report.status = 'observation_failed'; report.failure = String(error.code || error.message).replace(/(?:sk|jsk)-[A-Za-z0-9_-]+/g,'[credential]').slice(0,1000);
  process.exitCode = 1;
} finally {
  measurementPhase = 'cleanup';
  if (runtime) await runtime.close({ scope: originalLive.scope }).catch(() => {});
  if (providerStack) await providerStack.close().catch(() => {});
  const finalDb = new DatabaseSync(path.join(providerDirectory, 'live-decisions.sqlite'), { readOnly: true });
  try { const row = finalDb.prepare('SELECT record_json FROM sc_live_decision_records').get(); if (row) finalLive = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json); }
  finally { finalDb.close(); }
  const choice = Object.values(finalLive?.decisions || {}).find(value => value.authority.stateRevision === preRevision);
  const attempts = Object.values(choice?.attempts || {});
  report.actualNewProviderAttemptCount = Number(finalLive?.usage.providerCalls || ownOriginalCalls) - ownOriginalCalls;
  report.providerCalls = report.actualNewProviderAttemptCount;
  report.newEstimatedCostCnyMicros = Number(finalLive?.usage.estimatedCostCnyMicros || ownOriginalSpent) - ownOriginalSpent;
  report.modelRounds = attempts.map(a => ({ stage:a.stage,round:a.round,status:a.status,startedAt:a.startedAt,completedAt:a.completedAt,
    elapsedMs:a.completedAt ? Date.parse(a.completedAt)-Date.parse(a.startedAt) : null,usage:a.usage,promptByteLength:a.promptByteLength,
    promptNodeByteLengths:a.promptNodeByteLengths,reportedModel:a.reportedModel,failure:a.failure }));
  report.providerRoundElapsedMs = report.modelRounds.reduce((sum,r) => sum + (r.elapsedMs || 0),0);
  report.nonProviderCoreElapsedMs = report.completeProductCoreElapsedMs === undefined ? null : report.completeProductCoreElapsedMs - report.providerRoundElapsedMs;
  report.commitUnknown = attempts.some(a => a.status === 'provider_call_may_have_started');
  report.queriedKinds = [...new Set(events.filter(e => e.measurementPhase === 'action').map(e => e.queryKind).filter(Boolean))];
  report.sampleCoverage = group.cases.map(c => ({...c,kindCalledByFreshModelChain:report.queriedKinds.includes(c.kind)}));
  report.actionStageTimings = events.filter(e => e.measurementPhase === 'action');
  report.roomCalls = roomCalls; report.queryCalls = queryCalls; report.storeTimings = storeTimings;
  report.isolatedRoomCommits = ramCommits; report.originalRoomWrites = 0; report.newGames = 0;
  report.completedAt = new Date().toISOString();
  if (choice) await writeFile(path.join(outputDirectory,'decision.private.json'),JSON.stringify(choice),{mode:0o600});
  await eventTail;
  await writeFile(path.join(outputDirectory,'report.private.json'),JSON.stringify(report,null,2),{mode:0o600});
  console.log(JSON.stringify({event:'real_model_action_completed',groupId,status:report.status,failure:report.failure,
    completeProductCoreElapsedMs:report.completeProductCoreElapsedMs,providerRoundElapsedMs:report.providerRoundElapsedMs,
    nonProviderCoreElapsedMs:report.nonProviderCoreElapsedMs,newEstimatedCostCnyMicros:report.newEstimatedCostCnyMicros,
    actualNewProviderAttemptCount:report.actualNewProviderAttemptCount,sampleCoverage:report.sampleCoverage,commitUnknown:report.commitUnknown}));
  botDb.close(); memoryDb.close(); database.close();
  if (report.status !== 'fresh_model_product_core_measured') process.exitCode = 1;
}
