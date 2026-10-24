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
  ...(privateState.currentProductRuntimeVariant ? { currentProductRuntimeVariant: privateState.currentProductRuntimeVariant } : {}),
  resumeRoom: true, resumeCredentials: privateState.resumeCredentials, roomStore,
  refereeCrypto: crypto, attachBot: false, autoDrive: false, issueHumanRecovery: false,
  botDecisionPort: { async decide() { throw new Error('PERFORMANCE_PROVIDER_FORBIDDEN'); } },
});
assert.equal(fixture.createdRoom.resumed, true);
const setupElapsedMs = performance.now() - setupStarted;

// Concrete native asset bug, not a broad performance gate or another game.
const entry = manifest.cases.find(c => c.caseId === 'legal_asset_placement_options-short-69');
assert(entry);
const report = {};
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

const moduleUrl = new URL('../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs', import.meta.url);
let source = await readFile(moduleUrl, 'utf8');
source = source.replaceAll('hashStarcraftTmgContract(state)', '__observeStateHash(state)');
source = source.replace(/(from\s+)(["'])(\.{1,2}\/[^"']+)\2/g,
  (_, prefix, quote, specifier) => prefix + quote + new URL(specifier, moduleUrl).href + quote);
source = 'export const __stateHashCounts = { fullStateHashes: 0 };\n'
  + 'function __observeStateHash(state) { __stateHashCounts.fullStateHashes++; return hashStarcraftTmgContract(state); }\n'
  + source;
const native = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const originalStateHash = hash(restored.envelope.state);
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
native.__stateHashCounts.fullStateHashes = 0;
const owned = typeof native.createOwnedOfficialBattlefieldAssetInstantiationStateV1 === 'function'
  ? native.createOwnedOfficialBattlefieldAssetInstantiationStateV1(restored.envelope.state)
  : freeze(structuredClone(restored.envelope.state));
assert.equal(hash(owned), originalStateHash);
const adapter = native.createOfficialBattlefieldAssetFamilyAdapterV1(
  owned.officialBattlefieldAssetFamilySourceBundle);
const priorResult = JSON.parse(await readFile(referenceArtifactPath, 'utf8')).response.result;
const domains = adapter.legalSpace(owned, { sideKey: entry.originalAuthority.seatKey,
  includeDisabled: true }).parameterDomains.filter(d => d.effectKind === priorResult.effectKind
    && d.pieceId === priorResult.pieceId);
assert.equal(domains.length, 1);
const domain = domains[0];
const placements = priorResult.placementOptions.slice(0, 2);
assert.equal(placements.length, 2);
assert.notDeepEqual(placements[0].canonicalParameters.coordinate,
  placements[1].canonicalParameters.coordinate);
const results = placements.map(option => adapter.query(owned, {
  queryKind: 'instantiate_parameterized_action', sideKey: entry.originalAuthority.seatKey,
  domainId: domain.domainId, parameters: option.canonicalParameters }));
const completeStateHashCount = native.__stateHashCounts.fullStateHashes;
for (const result of results) {
  assert.equal(result.result.action.battlefieldAssetPlan.stateHashBefore, originalStateHash);
}
const baselinePath = path.join(outputDirectory, '../asset-placement-state-hash-baseline.private.json');
let baseline;
try { baseline = JSON.parse(await readFile(baselinePath, 'utf8')); }
catch (e) {
  if (e.code !== 'ENOENT') throw e;
  baseline = { originalStateHash, completeNativeResults: results, completeStateHashCount };
  await writeFile(baselinePath, JSON.stringify(baseline), { mode: 0o600 });
}
assert.equal(baseline.originalStateHash, originalStateHash);
assert.deepEqual(results, baseline.completeNativeResults,
  'ENTIRE native plans/actions/geometry/payment/source/receipt hashes must stay identical');
const external = structuredClone(owned);
const beforeExternal = native.__stateHashCounts.fullStateHashes;
placements.forEach(option => adapter.query(external, {
  queryKind: 'instantiate_parameterized_action', sideKey: entry.originalAuthority.seatKey,
  domainId: domain.domainId, parameters: option.canonicalParameters }));
assert.equal(native.__stateHashCounts.fullStateHashes - beforeExternal, 2,
  'decoded external state cannot inherit private cached hash');
const invalidParameters = structuredClone(placements[0].canonicalParameters);
invalidParameters.coordinate = { xMilliInches: -9999, yMilliInches: -9999 };
assert.throws(() => adapter.query(owned, {
  queryKind: 'instantiate_parameterized_action', sideKey: entry.originalAuthority.seatKey,
  domainId: domain.domainId, parameters: invalidParameters }),
  /BATTLEFIELD_ASSET_FULL_BASE_OUTSIDE_BATTLEFIELD/);
assert.equal(hash(restored.envelope.state), originalStateHash);
const output = { ticket: 23, slice: 248, stateRevision: revision,
  terrainRows: owned.board.terrain.length, actualDistinctPlacements: 2,
  completeStateHashCount, originalCompleteStateHashCount: baseline.completeStateHashCount,
  completeNativeResultsSame: true, exactOriginalStateHashSame: true,
  externalDecodedStateStillFullyHashed: true, invalidFullBasePlacementRejected: true,
  originalRoomWrites: attemptedWrites, providerCalls: 0, newExperiments: 0,
  wholeActionAccepted: false,
  status: completeStateHashCount === 1 ? 'native_owned_asset_state_hash_reused'
    : 'ASSET_PLACEMENT_REHASHES_SAME_COMPLETE_STATE', completedAt: new Date().toISOString() };
await writeFile(path.join(outputDirectory, 'report.private.json'), JSON.stringify(output, null, 2), { mode: 0o600 });
console.log(JSON.stringify(output));
memoryDb.close();
assert.equal(completeStateHashCount, 1, 'same owned state must be hashed once including setup');
