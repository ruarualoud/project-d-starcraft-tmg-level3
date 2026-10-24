// Replay real historical queries with current production code. No model calls,
// no source Room writes, no synthetic positions, no reduced search/sample scope.
import assert from 'node:assert/strict';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Session } from 'node:inspector';
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from '../packages/room-store/room-store-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../packages/room-store/sqlite-room-store-v1.mjs';
import { createTicket20HumanAgentDemoFixtureV1 } from './support/ticket20-human-agent-demo-fixture-v1.mjs';
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createStarcraftTmgPlayerSpatialObservationV1 } from '../packages/online-agent-session/player-spatial-observation-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  '../packages/online-agent-session/tactical-relationship-graph-v1.mjs';
import { createStarcraftTmgFireExchangeWorkV1 } from
  '../packages/online-agent-session/combat-estimation-runtime-v1.mjs';

const [root, manifestPath, outputDirectory, onlyCase, referenceArtifactPath, verificationMode,
  graphEvidenceDirectory] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const referenceArtifact = referenceArtifactPath
  ? JSON.parse(await readFile(referenceArtifactPath, 'utf8')) : null;
const runtimeSourceHashes = {};
for (const file of ['packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs',
  'packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs',
   'packages/room-store/sqlite-room-store-v1.mjs',
   'packages/room-runtime/in-memory-room-v1.mjs',
   'packages/online-agent-session/combat-estimation-runtime-v1.mjs',
   'packages/online-agent-session/legal-asset-placement-search-v1.mjs',
   'packages/source-data/official-card-build-payment-data-bundle-v1.mjs',
   'packages/online-agent-session/tactical-relationship-graph-v1.mjs',
   'packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs',
   'packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs',
   'packages/online-agent-session/tactical-los-pair-row-v1.mjs',
   'packages/online-agent-session/native-special-terrain-los-projection-v1.mjs',
   'packages/online-agent-session/native-special-terrain-los-worker-v1.mjs',
   'packages/online-agent-session/native-special-terrain-los-worker-batch-v1.mjs',
  'packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs',
  'packages/online-agent-session/legal-formation-search-v1.mjs',
  'packages/online-agent-session/formation-comparison-worker-batch-v1.mjs',
  'packages/online-agent-session/formation-comparison-worker-v1.mjs',
  'packages/online-agent-session/readonly-query-worker-v1.mjs',
  'packages/online-agent-session/readonly-query-worker-batch-v1.mjs']) {
  runtimeSourceHashes[file] = hash(await readFile(path.join(root, file), 'utf8'));
}
const privateState = JSON.parse(await readFile(path.join(manifest.sourceDirectory,
  'runner-private.json'), 'utf8'));
// Match the real Web host: resumed versioned rooms select their runtime from
// the original fork receipt, not the nullable ancestor runner metadata.
const originalForkReceipt = await readFile(path.join(manifest.sourceDirectory,
  'fork-receipt.json'), 'utf8').then(JSON.parse, error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
const resumeRuntimeVariant = originalForkReceipt?.targetRulesRuntimeVariant
  || privateState.currentProductRuntimeVariant;
const roomId = privateState.roomId;
const sourceDb = new DatabaseSync(path.join(manifest.sourceDirectory, 'room.sqlite'), { readOnly: true });
const rows = {};
try {
  sourceDb.exec('BEGIN');
  for (const table of ['sc_rooms', 'sc_private_journal', 'sc_checkpoints']) rows[table] =
    sourceDb.prepare(`SELECT * FROM ${table} WHERE room_id = ?`).all(roomId);
  assert.equal(sourceDb.prepare('SELECT total_changes() AS n').get().n, 0);
  sourceDb.exec('COMMIT');
} finally { sourceDb.close(); }
const sourceRowsHash = hash(rows);
const memoryDb = new DatabaseSync(':memory:');
const codec = createStarcraftTmgPrivatePayloadCodec({ key: privateState.storeEncryptionKeyBase64,
  keyId: JSON.parse(rows.sc_rooms[0].aggregate_cipher).keyId });
const store = createSqliteStarcraftTmgRoomStore({ database: memoryDb, privatePayloadCodec: codec });
for (const [table, entries] of Object.entries(rows)) {
  const columns = Object.keys(entries[0] || {});
  if (!columns.length) continue;
  const insert = memoryDb.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  for (const entry of entries) insert.run(...columns.map(k => entry[k]));
}
const originalAggregate = await store.loadRoom(roomId);
const originalBundle = await store.loadReplayBundle(roomId);
// Resume the same selected data profiles as the real Web host. In particular,
// the generated B roster contains Marauders, not the fixed recipe's Raynor.
// The frozen initial state is the source of both armies, never a guessed list
// or a regenerated Plan. The native host uses unspent-lost for planned recipes.
const originalRecipes = originalBundle.initialEnvelope.state.armyBuildingConfigurationBySide;
assert.ok(originalRecipes?.player1?.units && originalRecipes?.player2?.units,
  'original formal Room army recipes must be present');
const allReceipts = originalBundle.privateJournal.filter(e => e.payload.type === 'accepted_transition')
  .map(e => e.payload.payload.receipt);
let activeAggregate = originalAggregate;
let attemptedWrites = 0;
const forbidWrite = async () => { attemptedWrites++; throw new Error('PERFORMANCE_SOURCE_WRITES_FORBIDDEN'); };
const roomStore = Object.freeze({ ...store, loadRoom: async () => activeAggregate,
  createRoom: forbidWrite, commit: forbidWrite });
const crypto = createStarcraftTmgRefereeCrypto({ privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem, hmacSecret: privateState.refereeHmacSecret,
  keyId: originalAggregate.envelope.matchBinding.refereeKeyId, trustLevel: 'development_persistent' });
const setupStarted = performance.now();
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }), roomId,
  roomProfile: 'standard_2000_live', mapConfiguration: privateState.mapConfiguration,
  standard2000Recipes: originalRecipes,
  ...(privateState.plannedSessionId ? { armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } : {}),
  ...(resumeRuntimeVariant ? { currentProductRuntimeVariant: resumeRuntimeVariant } : {}),
  resumeRoom: true, resumeCredentials: privateState.resumeCredentials, roomStore,
  refereeCrypto: crypto, attachBot: false, autoDrive: false, issueHumanRecovery: false,
  botDecisionPort: { async decide() { throw new Error('PERFORMANCE_PROVIDER_FORBIDDEN'); } },
});
assert.equal(fixture.createdRoom.resumed, true);
const setupElapsedMs = performance.now() - setupStarted;
console.log(JSON.stringify({ event: 'original_frozen_runtime_resumed',
  runtimeVariant: resumeRuntimeVariant || 'legacy_v1',
  runtimeSelectionSource: originalForkReceipt?.targetRulesRuntimeVariant
    ? 'original_fork_receipt' : 'original_runner_metadata',
  setupElapsedMs, providerCalls: 0, originalRoomWrites: 0 }));
const progressPath = path.join(outputDirectory, 'real-per-type-performance-progress.ndjson');
const existingResults = new Set();
try { for (const line of (await readFile(progressPath, 'utf8')).trim().split('\n')) {
  if (line) existingResults.add(JSON.parse(line).caseId);
} } catch (e) { if (e.code !== 'ENOENT') throw e; }
const selected = manifest.cases.filter(c => (!onlyCase || c.caseId === onlyCase)
  && !existingResults.has(c.caseId)).sort((a, b) => {
    if (a.kind === 'fire_zone_exchange') return -1;
    if (b.kind === 'fire_zone_exchange') return 1;
    return a.timing.elapsedMs - b.timing.elapsedMs;
  });
for (const entry of selected) {
  const startedAt = new Date().toISOString();
  console.log(JSON.stringify({ event: 'case_started', caseId: entry.caseId, kind: entry.kind,
    oldElapsedMs: entry.timing.elapsedMs, startedAt }));
  const report = { caseId: entry.caseId, kind: entry.kind, bands: entry.bands,
    oldElapsedMs: entry.timing.elapsedMs, originalRecordedAt: entry.timing.recordedAt,
    startedAt, sourceRowsHash, setupElapsedMs, providerCalls: 0, originalRoomWrites: 0,
    runtimeSourceHashes, historicalTimingIsNotControlledAB: true, trainingTruth: false };
  report.recipesFromFrozenInitialState = true;
  try {
    assert.equal(entry.status, 'ready_for_signed_state_restore', entry.status);
    const revision = entry.originalAuthority.stateRevision;
    const checkpointRow = rows.sc_checkpoints.filter(r => r.state_revision <= revision)
      .sort((a, b) => b.state_revision - a.state_revision)[0];
    const checkpoint = checkpointRow ? codec.decode(checkpointRow.checkpoint_cipher,
      `room:${roomId}:checkpoint:${checkpointRow.state_revision}`) : null;
    const journal = allReceipts.filter(r => r.postStateRevision > (checkpoint?.stateRevision || 0)
      && r.postStateRevision <= revision);
    const restoreStarted = performance.now();
    const restored = fixture.authorityEngine.replay({ initialEnvelope: originalBundle.initialEnvelope,
      ...(checkpoint ? { checkpoint } : {}), journal });
    assert.equal(restored.ok, true, restored.reason);
    assert.equal(restored.envelope.stateRevision, revision);
    assert.equal(restored.envelope.stateHash, entry.originalAuthority.stateHash);
    assert.equal(restored.envelope.matchBindingHash, entry.originalAuthority.matchBindingHash);
    activeAggregate = { ...originalAggregate, stateRevision: revision, envelope: restored.envelope };
    report.restoreElapsedMs = performance.now() - restoreStarted;
    report.restoredStateHash = restored.envelope.stateHash;
    console.log(JSON.stringify({ event: 'state_restored', caseId: entry.caseId,
      restoreElapsedMs: report.restoreElapsedMs, revision }));
    const token = privateState.resumeCredentials[entry.originalAuthority.seatKey === 'player1' ? 'human' : 'bot'].seatToken;
    const contextStarted = performance.now();
    const contextProfiler = verificationMode === 'context_cpu_observation' ? new Session() : null;
    const contextProfileCall = (method, params = {}) => new Promise((resolve, reject) =>
      contextProfiler.post(method, params, (error, result) => error ? reject(error) : resolve(result)));
    if (contextProfiler) {
      contextProfiler.connect();
      await contextProfileCall('Profiler.enable');
      await contextProfileCall('Profiler.start');
    }
    const viewStarted = performance.now();
    const view = await fixture.roomRuntime.readRoom({ roomId, seatToken: token });
    const readRoomElapsedMs = performance.now() - viewStarted;
    const legalStarted = performance.now();
    const legal = await fixture.roomRuntime.legalSpace({ roomId, seatToken: token });
    const legalSpaceElapsedMs = performance.now() - legalStarted;
    if (!contextProfiler) {
      assert.equal(view.ok, true, view.reason); assert.equal(legal.ok, true, legal.reason);
      assert.equal(legal.legalSpace.legalSpaceHash, entry.originalAuthority.legalSpaceHash);
    }
    const observationStarted = performance.now();
    const observation = createStarcraftTmgPlayerSpatialObservationV1({
      roomProjection: view.projection, legalSpace: legal.legalSpace });
    const spatialObservationElapsedMs = performance.now() - observationStarted;
    if (!contextProfiler) assert.equal(observation.observationHash, entry.originalAuthority.spatialObservationHash);
    report.contextElapsedMs = performance.now() - contextStarted;
    if (contextProfiler) {
      // Observe the unresolved real context bottleneck only. No query, model,
      // Apply or previously passed ordinary functional gate is run again.
      const { profile } = await contextProfileCall('Profiler.stop');
      contextProfiler.disconnect();
      const contextCpuProfilePath = path.join(outputDirectory, `${entry.caseId}-context.cpuprofile`);
      await writeFile(contextCpuProfilePath, JSON.stringify(profile), { mode: 0o600 });
      Object.assign(report, {
        contextSteps: { readRoomElapsedMs, legalSpaceElapsedMs, spatialObservationElapsedMs },
        legalSpaceIdentityMatchesOriginal: legal.legalSpace?.legalSpaceHash === entry.originalAuthority.legalSpaceHash,
        spatialObservationIdentityMatchesOriginal: observation.observationHash === entry.originalAuthority.spatialObservationHash,
        originalInputSourceSame: hash(rows) === sourceRowsHash,
        contextCpuProfilePath, functionalParityGateRepeated: false,
        queryExecuted: false, status: 'context_only_observation_complete',
        completedAt: new Date().toISOString(),
      });
      await writeFile(path.join(outputDirectory, `real-performance-${entry.caseId}-context.private.json`),
        JSON.stringify(report), { mode: 0o600 });
      await appendFile(progressPath, JSON.stringify(report) + '\n', { mode: 0o600 });
      console.log(JSON.stringify({ event: 'context_only_observation_completed', ...report }));
      continue;
    }
    console.log(JSON.stringify({ event: verificationMode === 'fire_graph_summary_observation'
      ? 'graph_summary_observation_started' : 'query_started', caseId: entry.caseId,
      contextElapsedMs: report.contextElapsedMs }));
    if (verificationMode === 'fire_graph_summary_observation') {
      // A missing independent historical graph must not be guessed. Derive the
      // COMPLETE native graph on the exact signed original state and require its
      // full identity to equal the one already bound by the old fire receipt.
      // No fire estimates, dice or paid model calls are executed again.
      assert.equal(entry.kind, 'fire_zone_exchange');
      assert(graphEvidenceDirectory, 'stored complete fire comparison required');
      const storedPath = path.join(graphEvidenceDirectory,
        `real-performance-${entry.caseId}.private.json`);
      const stored = JSON.parse(await readFile(storedPath, 'utf8'));
      assert.equal(stored.sourceRowsHash, sourceRowsHash);
      assert.deepEqual(stored.originalReceipt, entry.originalReceipt);
      assert.deepEqual(stored.originalRequest, entry.originalRequestCandidates[0]);
      const inputHash = hash(activeAggregate);
      // The manifest's restore authority is the action-space identity, not
      // the native query binding (which also has gameId/visibilityScope and
      // does NOT include spatialActionSpaceHash). Capture the real producer
      // instead of hand-copying a similar, but different, graph input.
      let delegatedGraphRequest;
      const captureRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1({
        rulesQuery: async request => {
          delegatedGraphRequest = request;
          return { ok: false, reason: 'PRIVATE_GRAPH_INPUT_CAPTURE_ONLY' };
        },
      });
      await captureRuntime.query({ roomProjection: view.projection,
        legalSpace: legal.legalSpace, spatialObservation: observation,
        request: entry.originalRequestCandidates[0] });
      assert.ok(delegatedGraphRequest, 'native query delegation must be observed');
      assert.deepEqual(delegatedGraphRequest.authority, entry.originalReceipt.authority,
        'native query binding must equal the original receipt authority');
      // Produce just the independent graph head through the SAME compiler.
      // Its request retains the complete native delegated arguments; no
      // attack domains are dispatched or probability streams reexecuted.
      const graphJobs = createStarcraftTmgFireExchangeWorkV1({
        state: activeAggregate.envelope.state, seatKey: entry.originalAuthority.seatKey,
        authority: delegatedGraphRequest.authority,
        request: delegatedGraphRequest.arguments, currentLegalSpaceDomains: [],
      });
      assert.equal(graphJobs.length, 1);
      assert.equal(graphJobs[0].kind, 'fire_relationships');
      const graphStarted = performance.now();
      const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
        state: activeAggregate.envelope.state, seatKey: graphJobs[0].seatKey,
        authority: graphJobs[0].authority, request: graphJobs[0].request,
      });
      report.nativeGraphObservationElapsedMs = performance.now() - graphStarted;
      report.nativeQueryBindingCaptured = true;
      report.nativeGraphHash = graph.relationshipGraphHash;
      // Retain the complete native result even if a later proof fails.
      await writeFile(path.join(outputDirectory, `native-graph-observation-${entry.caseId}.private.json`),
        JSON.stringify({ ...report, nativeGraph: graph,
          nativeDelegatedRequest: delegatedGraphRequest }), { mode: 0o600 });
      assert.equal(hash(activeAggregate), inputHash);
      assert.equal(graph.relationshipGraphHash,
        entry.originalReceipt.result.currentRelationshipGraphHash,
        'complete derived native graph must equal the graph originally bound by paid fire receipt');
      const relations = graph.relationships.filter(r => r.edgeKind === 'unit_spatial_relationship');
      const sum = key => relations.reduce((total, r) => total + Number(r.fireZoneExchange?.[key] || 0), 0);
      const summary = { relationshipGraphHash: graph.relationshipGraphHash,
        ownStationaryProfileCount: sum('fromStationaryProfileCount'),
        enemyStationaryProfileCount: sum('toStationaryProfileCount'),
        ownMoveThenFireProfileCount: sum('fromMoveThenFireProfileCount'),
        enemyMoveThenFireProfileCount: sum('toMoveThenFireProfileCount'),
        classes: [...new Set(relations.map(r => r.fireZoneExchange?.class).filter(Boolean))].sort(),
        friendlyThreatEdges: structuredClone(graph.aggregates?.friendlyThreat || []),
        enemyThreatEdges: structuredClone(graph.aggregates?.enemyThreat || []) };
      assert.deepEqual(stored.response.result.currentGeometry, summary);
      assert.deepEqual(stored.response.result.attackEstimates, entry.originalReceipt.result.attackEstimates);
      assert.deepEqual(stored.response.result.attackEstimateFailures, entry.originalReceipt.result.attackEstimateFailures);
      // Separate analysis lineage only: never overwrite or re-sign historical
      // receipts. Permit exactly the independently proved summary and its two
      // derived content identities; require every other complete field equal.
      const corrected = structuredClone(entry.originalReceipt);
      corrected.result.currentGeometry = structuredClone(summary);
      for (const alternative of corrected.result.alternatives) {
        if (alternative.currentGeometry) alternative.currentGeometry = structuredClone(summary);
      }
      delete corrected.result.estimateHash;
      corrected.result.estimateHash = hash(corrected.result);
      delete corrected.queryReceiptHash;
      corrected.queryReceiptHash = hash(corrected);
      assert.deepEqual(stored.response, corrected, 'all complete fields outside proved summary must stay identical');
      report.status = 'historical_summary_correction_proven_without_fire_reexecution';
      report.nativeGraphHashEqualsOriginal = true;
      report.completeStoredResponseEqualsProvedCorrection = true;
      report.nativeRelationCount = relations.length;
      report.nativeSummary = summary;
      report.storedQueryElapsedMs = stored.newQueryElapsedMs;
      report.storedQueryUnderOneMinute = stored.newQueryElapsedMs < 60_000;
      report.fireEstimatesReexecuted = false;
      report.historicalReceiptsRewritten = false;
      report.completedAt = new Date().toISOString();
      await writeFile(path.join(outputDirectory, `native-graph-summary-${entry.caseId}.private.json`),
        JSON.stringify({ ...report, originalReceipt: entry.originalReceipt,
          storedComparisonPath: storedPath, nativeGraph: graph,
          separateCorrectedAnalysis: corrected }), { mode: 0o600 });
      await appendFile(progressPath, JSON.stringify(report) + '\n', { mode: 0o600 });
      console.log(JSON.stringify({ event: 'case_completed', ...report }));
      continue;
    }
    const diagnostics = [];
    const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
      roomStore, rulesRuntime: fixture.rulesRuntime, seatKey: entry.originalAuthority.seatKey,
      profileFormationCpu: verificationMode === 'formation_cpu_observation',
      observeQueryBatchDiagnostic: e => diagnostics.push(e) });
    const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1({
      rulesQuery: adapter.query, rulesQueryBatch: adapter.queryBatch,
      observeQueryDiagnostic: e => diagnostics.push(e) });
    const inputHash = hash(activeAggregate);
    // Private observation of an already functionally verified, still slow
    // original query. Never enable the profiler for ordinary requests/Rooms.
    const cpuSession = verificationMode === 'query_cpu_observation'
      || verificationMode === 'special_los_parallelism' ? new Session() : null;
    const cpuPost = cpuSession ? (method) => new Promise((resolve, reject) =>
      cpuSession.post(method, (error, result) => error ? reject(error) : resolve(result))) : null;
    if (cpuSession) {
      cpuSession.connect();
      await cpuPost('Profiler.enable');
      await cpuPost('Profiler.start');
    }
    const queryStarted = performance.now();
    let response;
    try {
      response = await runtime.query({ roomProjection: view.projection,
        legalSpace: legal.legalSpace, spatialObservation: observation,
        request: entry.originalRequestCandidates[0] });
      report.newQueryElapsedMs = performance.now() - queryStarted;
    } finally {
      if (cpuSession) {
        try {
          const { profile } = await cpuPost('Profiler.stop');
          report.cpuProfilePath = path.join(outputDirectory, `${entry.caseId}.cpuprofile`);
          await writeFile(report.cpuProfilePath, JSON.stringify(profile), { mode: 0o600 });
        } finally { cpuSession.disconnect(); }
      }
    }
    report.diagnostics = diagnostics;
    assert.equal(hash(activeAggregate), inputHash, 'complete input immutable');
    report.responseHash = hash(response);
    let expected = entry.originalReceipt;
    if (referenceArtifact) {
      assert.equal(referenceArtifact.sourceRowsHash, sourceRowsHash);
      assert.deepEqual(referenceArtifact.originalRequest, entry.originalRequestCandidates[0]);
      expected = referenceArtifact.response;
      report.referenceArtifactPath = referenceArtifactPath;
      report.referenceQueryElapsedMs = referenceArtifact.newQueryElapsedMs;
      report.historicalReceiptCorrectionIsSeparate = true;
    }
    await writeFile(path.join(outputDirectory, `real-performance-${entry.caseId}.private.json`),
      JSON.stringify({ ...report, originalRequest: entry.originalRequestCandidates[0],
        originalReceipt: entry.originalReceipt, comparisonReference: expected, response }), { mode: 0o600 });
    if (verificationMode === 'formation_phase_observation' || verificationMode === 'formation_cpu_observation'
      || verificationMode === 'query_cpu_observation'
      || verificationMode === 'special_los_parallelism') {
      // The full-output gate already passed for this unchanged computation.
      // This run measures the specific failed latency's missing subphases, not
      // another invocation of that passed functional gate. Retain both hashes.
      report.originalResponseHash = hash(expected);
      report.outputHashMatchesOriginal = report.responseHash === report.originalResponseHash;
      report.functionalParityGateRepeated = false;
      report.formationPhaseObservation = diagnostics.filter(d => d.operation === 'formation_query');
    } else {
      assert.deepEqual(response, expected, 'ENTIRE pre-optimization receipt/result/authority/hash must match');
    }
    if (referenceArtifact) {
      report.constructedContextCount = diagnostics.filter(d => d.stage === 'ranged_preview_context_constructed').length;
      report.reusedContextCount = diagnostics.filter(d => d.stage === 'ranged_preview_context_reused').length;
      report.completeAttackJobCount = diagnostics.filter(d => d.stage === 'query_worker_completed'
        && d.workKind === 'fire_attack').length;
      // The preserved reference owns this case's attack scope; six belonged
      // only to C114, while other original cases have zero or five jobs.
      report.expectedAttackJobCount = expected.result.attackEstimates.length
        + expected.result.attackEstimateFailures.length;
      assert.equal(report.completeAttackJobCount, report.expectedAttackJobCount,
        'real original fire attack scope preserved');
      assert.equal(report.reusedContextCount, report.completeAttackJobCount,
        'each preview must reuse its already constructed native enumeration context');
    }
    if (verificationMode === 'preparation_overlap') {
      const prep = diagnostics.find(d => d.stage === 'query_work_prepared');
      const graph = diagnostics.find(d => d.stage === 'query_worker_completed'
        && d.workKind === 'fire_relationships');
      assert.ok(prep && graph, 'real native work phase evidence required');
      report.preparationElapsedMs = prep.completedAtMs - prep.startedAtMs;
      report.graphElapsedMs = graph.completedAtMs - graph.startedAtMs;
      report.graphStartedBeforePreparationEndedMs = prep.completedAtMs - graph.startedAtMs;
      assert.ok(report.graphStartedBeforePreparationEndedMs > 0,
        'INDEPENDENT_RELATIONSHIP_GRAPH_BLOCKED_BY_RANGED_PREPARATION');
    }
    if (verificationMode === 'chance_context_reuse') {
      const contexts = diagnostics.filter(d => d.stage === 'ranged_chance_context_constructed');
      report.reconstructedChanceContextCount = contexts.length;
      report.reconstructedChanceContextElapsedMs = contexts.map(d => d.completedAtMs - d.startedAtMs);
      assert.equal(contexts.length, 0,
        'PREPARED_FIRE_ATTACK_RECONSTRUCTS_SAME_NATIVE_CHANCE_CONTEXT');
      report.transferredChanceContextCount = diagnostics.filter(d =>
        d.stage === 'ranged_chance_context_reused_from_preview').length;
      assert.equal(report.transferredChanceContextCount, report.completeAttackJobCount,
        'each complete fire attack must consume its same native preview context');
    }
    if (verificationMode === 'special_los_capacity_recovery'
      || verificationMode === 'special_los_capacity_preflight'
      || verificationMode === 'los_result_identity_reuse') {
      assert.equal(entry.kind, 'space.inspect_relationships');
      assert.equal(entry.originalReceipt.result.sourceReceipts.specialTerrainLosBatchFailure,
        'Invalid string length', 'original actual capacity failure required');
      const recovered = diagnostics.find(d =>
        d.stage === 'special_terrain_los_completed_pairs_recovered');
      assert.ok(recovered, 'COMPLETED_NATIVE_LOS_PAIRS_DISCARDED_AFTER_AGGREGATE_CAPACITY_FAILURE');
      const originalPairCount = entry.originalReceipt.result.relationships
        .filter(r => r.edgeKind === 'unit_spatial_relationship')
        .reduce((total, r) => total + r.lineOfSight.modelPairs.length, 0);
      assert.equal(recovered.requestedPairCount, originalPairCount);
      assert.equal(recovered.completedPairCount, originalPairCount);
      assert.equal(recovered.recoveredCompletedPairCount, originalPairCount);
      assert.equal(recovered.scalarFallbackCount, 0,
        'completed native geometry must not be executed again after capacity failure');
      report.specialTerrainLosCapacityRecovery = recovered;
      if (verificationMode === 'special_los_capacity_preflight'
        || verificationMode === 'los_result_identity_reuse') {
        assert.equal(recovered.aggregateSealSkippedForProvenCapacity, true,
          'a provably oversized complete native aggregate must not be materialized');
        assert.ok(recovered.aggregateLowerBoundChars > recovered.maximumStringLength);
        assert.ok(report.newQueryElapsedMs <= 60_000,
          'ACTUAL_RELATIONSHIP_QUERY_STILL_EXCEEDS_ONE_MINUTE_AFTER_NATIVE_COMPLETION_RECOVERY');
      }
      if (verificationMode === 'los_result_identity_reuse') {
        assert.equal(recovered.precomputedScalarIdentityReuseCount, originalPairCount);
        assert.equal(recovered.scalarIdentityRetagCount, 0,
          'scalar recovery must not serialize the same full native assessments again');
      }
    }
    if (verificationMode === 'special_los_parallelism') {
      // Concrete missing-parallelism repro on the complete real C96 request.
      // Do not execute the old passed ordinary functional gate again.
      const groups = diagnostics.filter(d =>
        d.stage === 'special_terrain_los_pair_group_completed');
      report.nativePairGroupCount = groups.length;
      report.nativePairThreadCount = new Set(groups.map(d => d.threadId)).size;
      report.nativePairGroupsOverlapped = groups.some((left, index) =>
        groups.slice(index + 1).some(right =>
          Math.max(left.startedAtMs, right.startedAtMs)
            < Math.min(left.completedAtMs, right.completedAtMs)));
      const recovered = diagnostics.find(d =>
        d.stage === 'special_terrain_los_completed_pairs_recovered');
      report.specialTerrainLosCapacityRecovery = recovered || null;
      assert.ok(report.nativePairThreadCount >= 2,
        'ACTUAL_RELATIONSHIP_LOS_PAIRS_STILL_EXECUTE_SERIAL_IN_ONE_THREAD');
      assert.equal(report.nativePairGroupsOverlapped, true);
      assert.equal(recovered?.completedPairCount, 659);
      assert.equal(recovered?.scalarFallbackCount, 0);
      // New worker transport's complete output identity is directly affected.
      assert.equal(report.outputHashMatchesOriginal, true,
        'PARALLEL_NATIVE_PAIR_TRANSPORT_CHANGED_COMPLETE_ORIGINAL_GRAPH');
    }
    assert.equal(attemptedWrites, 0);
    report.status = verificationMode === 'formation_phase_observation' || verificationMode === 'formation_cpu_observation'
      || verificationMode === 'query_cpu_observation'
      || verificationMode === 'special_los_parallelism'
      ? 'phase_observation_complete' : 'complete_output_parity';
    report.fasterThanHistorical = report.newQueryElapsedMs < report.oldElapsedMs;
    report.underOneMinute = report.newQueryElapsedMs <= 60_000;
    report.historicalDeltaMs = report.newQueryElapsedMs - report.oldElapsedMs;
    report.acceptancePendingCrossTypeReview = true;
  } catch (error) {
    report.status = 'not_accepted';
    report.error = String(error.message).slice(0, 600);
  }
  report.completedAt = new Date().toISOString();
  await appendFile(progressPath, JSON.stringify(report) + '\n', { mode: 0o600 });
  const { diagnostics: savedDiagnostics, ...summary } = report;
  console.log(JSON.stringify({ event: 'case_completed', ...summary,
    diagnosticCount: savedDiagnostics?.length || 0 }));
}
assert.equal(hash(rows), sourceRowsHash);
assert.equal(attemptedWrites, 0);
memoryDb.close();
