import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4SourceCandidate, WAVE4_SOURCE_DIRECTORY, WAVE4_CANDIDATE_REF }
  from './compile-wave4-source-candidate.mjs';
import { createOfficialReleaseResolverV2, officialReleaseQueryScopeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { replayStarcraftTmgSourceImportLedgerV4 }
  from '../packages/source-data/official-source-import-workflow-v4.mjs';
import { createCommandCenterDataSnapshot, createCommandCenterSnapshot }
  from '../packages/rule-atoms/official-live-source-snapshots-v1.mjs';
import { getOfficialCurrentProductRecord } from '../packages/source-data/official-command-center-adapter-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftProductRoomHostV1, PRODUCT_PREFIX } from './support/starcraft-product-room-host-v1.mjs';
import { loadWave3HumanMatchSetupsV1, wave3HumanMapConfiguration }
  from '../packages/product-composition/wave3-human-match-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build/wave4-web/candidate-release');
await fs.mkdir(output, { recursive: true });
const runDirectory = await fs.mkdtemp(path.join(output, 'run-'));
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const candidate = await compileWave4SourceCandidate({ root });
const manifest = await read(WAVE4_CANDIDATE_REF);
assert.deepEqual(manifest, candidate.manifest);
for (const [file, value] of Object.entries({ 'snapshot.json': candidate.snapshot, 'dataset.json': candidate.dataset,
  'source-revision.json': candidate.revision, 'catalogue-scope.json': candidate.catalogue,
  'semantic-diff.json': candidate.diff, 'adapter-audit.json': candidate.audit, 'import-ledger.json': candidate.ledger })) {
  assert.deepEqual(await read(`${WAVE4_SOURCE_DIRECTORY}/${file}`), value, 'REPRODUCIBLE_CAPTURE:' + file);
}
const ledgerReplay = replayStarcraftTmgSourceImportLedgerV4(candidate.ledger);
assert.equal(ledgerReplay.pointerEventCount, 0);
assert.equal(ledgerReplay.currentRevisionHash, candidate.baseline.source.sourceRevisionHash);
assert.equal(candidate.snapshot.shellCaptured, false);
assert.equal(candidate.snapshot.productVersion, null);
assert.equal(candidate.snapshot.shellHash, null);
assert.deepEqual(candidate.snapshot.staticAssets, []);
const negativeChecks = [];
await assert.rejects(compileWave4SourceCandidate({ root, readBytes: async ref => {
  const bytes = await fs.readFile(path.join(root, ref));
  if (ref.endsWith('/raw/army_units.json')) bytes[0] ^= 1;
  return bytes;
} }), /WAVE4_SOURCE_HASH:army_units/);
negativeChecks.push('modified captured bytes rejected before normalization');
const firestorePayloads = Object.fromEntries(await Promise.all(
  ['army_units', 'tactical_cards', 'faction_cards', 'rules_sections'].map(async id =>
    [id, await read(`${WAVE4_SOURCE_DIRECTORY}/raw/${id}.json`)])));
const snapshotInput = { ...candidate.index, firestorePayloads,
  versionsPayload: await read(`${WAVE4_SOURCE_DIRECTORY}/raw/system_metadata_versions.json`) };
assert.throws(() => createCommandCenterDataSnapshot({ ...snapshotInput, firestorePayloads: {
  ...firestorePayloads, army_units: { ...firestorePayloads.army_units, nextPageToken: 'unread-page' },
} }), /paginated_firestore_collection_not_complete/);
negativeChecks.push('unread Firestore page rejected');
const foreignPayloads = structuredClone(firestorePayloads);
foreignPayloads.army_units.documents[0].name = foreignPayloads.army_units.documents[0].name
  .replace('projects/starcrafttmgbeta/', 'projects/another/');
assert.throws(() => createCommandCenterDataSnapshot({ ...snapshotInput, firestorePayloads: foreignPayloads }),
  /firestore_document_source_mismatch/);
negativeChecks.push('foreign project document rejected');
assert.throws(() => createCommandCenterSnapshot(snapshotInput), /command_center_shell_required/);
negativeChecks.push('original full-shell snapshot contract retained');
for (const key of candidate.catalogue.communityRecordKeys) {
  assert.throws(() => getOfficialCurrentProductRecord(candidate.dataset, key), /official_current_product_record_required/);
}
negativeChecks.push('all community records rejected by official product lookup');

// Explicit byte-identical aliases make the legacy source proof reproducible in
// a fresh checkout. No legacy manifest or hash is changed to point at Wave4.
const loadArtifact = ref => read(candidate.index.baseline.artifactAliases[ref] || ref);
const registryFile = path.join(runDirectory, 'releases.sqlite');
let store = createSqliteOfficialReleaseStoreV1({ filename: registryFile });
let resolver = createOfficialReleaseResolverV2({ store, loadArtifact });
const old = candidate.baseline;
let oldBinding;
try {
  resolver.register(old); resolver.register(manifest);
  resolver.setDefault({ releaseId: old.releaseId, expectedGeneration: 0 });
  oldBinding = await resolver.bind({ subjectKind: 'room', subjectId: 'wave3-source-compatibility', releaseId: old.releaseId });
  resolver.setDefault({ releaseId: manifest.releaseId, expectedGeneration: 1 });
  const current = await resolver.resolve({});
  assert.equal(current.dataset.datasetHash, candidate.dataset.datasetHash);
  const retained = await resolver.resolveSubject({ subjectKind: 'room', subjectId: 'wave3-source-compatibility' });
  assert.equal(retained.dataset.datasetHash, old.source.datasetHash);
  assert.deepEqual(retained.binding, oldBinding);
  assert.notEqual(officialReleaseQueryScopeV2({ manifest: old, stateRevision: 0, queryKind: 'roster', parameters: {} }),
    officialReleaseQueryScopeV2({ manifest, stateRevision: 0, queryKind: 'roster', parameters: {} }));
  await assert.rejects(resolver.resolve({ releaseId: manifest.releaseId, binding: oldBinding }), /OFFICIAL_RELEASE_BINDING_CONFLICT/);
  await assert.rejects(resolver.bind({ subjectKind: 'room', subjectId: 'wave3-source-compatibility', releaseId: manifest.releaseId }),
    /OFFICIAL_RELEASE_SUBJECT_ALREADY_BOUND/);
  await assert.rejects(resolver.resolve({ releaseId: manifest.releaseId, purpose: 'battle' }), /OFFICIAL_RELEASE_COMPONENTS_MISSING/);
  const conflict = structuredClone(manifest);
  conflict.releaseId += '-wrong-revision'; conflict.source.sourceRevisionHash = '0'.repeat(64);
  const { manifestHash, ...body } = conflict;
  conflict.manifestHash = hash(body);
  resolver.register(conflict);
  await assert.rejects(resolver.resolve({ releaseId: conflict.releaseId }), /OFFICIAL_RELEASE_SOURCE_MISMATCH/);
  negativeChecks.push('cross-release binding, immutable room rebinding, incomplete battle candidate and wrong revision rejected');
} finally { store.close(); }
store = createSqliteOfficialReleaseStoreV1({ filename: registryFile });
resolver = createOfficialReleaseResolverV2({ store, loadArtifact });
try {
  const retained = await resolver.resolveSubject({ subjectKind: 'room', subjectId: 'wave3-source-compatibility' });
  assert.deepEqual(retained.binding, oldBinding);
  assert.equal(retained.dataset.datasetHash, old.source.datasetHash);
  assert.equal((await resolver.resolve({})).manifest.manifestHash, manifest.manifestHash);
  assert.equal((await resolver.resolveHistoricalSource({ snapshotHash: old.source.snapshotHash,
    datasetHash: old.source.datasetHash })).manifest.manifestHash, old.manifestHash);
  resolver.setDefault({ releaseId: old.releaseId, expectedGeneration: 2 });
  assert.equal((await resolver.resolve({})).manifest.manifestHash, old.manifestHash);
} finally { store.close(); }

// Exercise the production lobby handler, compiler, room factory, Apply and
// persisted replay. This is API evidence; the Wave4 browser gate is a later item.
let providerCalls = 0;
const setups = await loadWave3HumanMatchSetupsV1(root);
const dataDirectory = path.join(root, 'build/wave4-web/host', path.basename(runDirectory));
const options = { root, fixtureRoot: root, dataDirectory, liveEnabled: false, offlineWave3MatchVersion: '2.99.12',
  mapConfiguration: wave3HumanMapConfiguration(setups.find(setup => setup.scale === 'Standard')),
  providerFactory() { providerCalls++; throw Error('PROVIDER_CALL_FORBIDDEN'); },
  companionProviderFactory() { providerCalls++; throw Error('PROVIDER_CALL_FORBIDDEN'); } };
let host = await createStarcraftProductRoomHostV1(options);
const request = async (pathname, body, cookie = '') => {
  const response = await host.handle({ method: body === undefined ? 'GET' : 'POST', pathname, headers: { cookie }, body });
  assert.ok(response, 'HANDLER_REQUIRED');
  return response;
};
const cookieFrom = response => response.headers['set-cookie'].split(';')[0];
const scaleProofs = [];
try {
  for (const setupId of ['wave3-skirmish-v1', 'wave3-standard-v1']) {
    const setup = setups.find(item => item.id === setupId);
    const source = await read(setup.releaseRef), dataset = await read(source.source.datasetRef);
    const created = await request(PRODUCT_PREFIX + '/lineups', { setupId });
    assert.equal(created.status, 201);
    const firstCookie = cookieFrom(created), lineup = created.response.lineup;
    const base = PRODUCT_PREFIX + '/lineups/' + lineup.id;
    const joined = await request(base + '/join', { invite: lineup.invite });
    assert.equal(joined.status, 200);
    const secondCookie = cookieFrom(joined);
    const armies = setup.presets.map((preset, i) => ({ name: 'Wave3 compatibility ' + setup.minerals + ' player' + (i + 1),
      officialDatasetHash: dataset.datasetHash, mineralsLimit: setup.minerals,
      factionCardId: preset.recipe.factionRecordKey.split(':')[1],
      tacticalCardIds: preset.recipe.tacticalCardRecordKeys.map(key => key.split(':')[1]),
      roster: preset.recipe.units.map(unit => {
        const payload = dataset.recordsByKey[unit.recordKey].payload;
        return { unitId: payload.id, size: unit.compositionKind, availableUpgrades: payload.upgrades,
          activeUpgrades: unit.upgradeNames.map(name => payload.upgrades.findIndex(row => row.name === name)) };
      }) }));
    const rejected = await request(base + '/submit', { army: { ...armies[0], officialDatasetHash: candidate.dataset.datasetHash } }, firstCookie);
    assert.equal(rejected.status, 422);
    assert.equal(rejected.response.reason, 'PRODUCT_ROSTER_SELECTION_SOURCE_MISMATCH');
    assert.equal((await request(base, undefined, firstCookie)).response.lineup.submitted, false);
    const first = await request(base + '/submit', { army: armies[0] }, firstCookie);
    assert.equal(first.status, 200); assert.equal(first.response.lineup.ready, false);
    const guestView = (await request(base, undefined, secondCookie)).response.lineup;
    assert.equal(guestView.submitted, false); assert.equal(guestView.otherSubmitted, true);
    assert.ok(!JSON.stringify(guestView).includes(armies[0].name));
    const second = await request(base + '/submit', { army: armies[1] }, secondCookie);
    assert.equal(second.status, 200); assert.equal(second.response.lineup.ready, true);
    const saved = JSON.parse(await fs.readFile(path.join(dataDirectory, 'lineups', lineup.id + '.json'), 'utf8'));
    const item = await host.get(saved.roomId);
    const roomId = saved.roomId;
    for (const side of ['player1', 'player2']) {
      const preset = setup.presets[side === 'player1' ? 0 : 1].recipe;
      const recipe = item.record.recipes[side];
      assert.equal(recipe.factionRecordKey, preset.factionRecordKey);
      assert.deepEqual(recipe.tacticalCardRecordKeys, preset.tacticalCardRecordKeys);
      assert.deepEqual(recipe.units.map(({ recordKey, compositionKind, upgradeNames }) => ({ recordKey, compositionKind, upgradeNames })),
        preset.units.map(({ recordKey, compositionKind, upgradeNames }) => ({ recordKey, compositionKind, upgradeNames })));
    }
    const api = async (op, body, side) => {
      const response = await item.adapter.handle({ method: body === undefined ? 'GET' : 'POST',
        pathname: '/starcraft-tmg-level3/api/v1/rooms/' + roomId + '/' + op,
        headers: { authorization: 'Bearer ' + item.record.credentials[side === 'player1' ? 'human' : 'guest'].seatToken }, body });
      assert.equal(response.status, 200, JSON.stringify(response.response));
      const result = response.response.result || response.response;
      assert.notEqual(result.ok, false, JSON.stringify(result));
      return result;
    };
    const before = await item.roomStore.loadRoom(roomId);
    let selection;
    for (const side of ['player1', 'player2']) {
      const { legalSpace } = await api('legal-space', {}, side);
      const action = legalSpace.finiteActions.find(row => row.action.actionType === 'choose_first_actor') || legalSpace.finiteActions[0];
      if (action) { selection = { side, action }; break; }
    }
    assert.ok(selection, 'SIGNED_LIFECYCLE_ACTION_REQUIRED');
    const { side, action } = selection;
    const preview = await api('preview', { proposal: { kind: 'finite', actionKey: action.actionKey } }, side);
    const pv = preview.preview;
    const confirmation = preview.confirmationRequired ? await api('confirm', { previewId: pv.previewId,
      previewToken: pv.previewToken, previewContentHash: pv.previewSeal.contentHash }, side) : null;
    const { controlLease } = await api('control-lease', { sessionId: 'wave4-compatibility-' + setup.minerals }, side);
    await api('apply', { previewId: pv.previewId, confirmationId: confirmation?.confirmation.confirmationId,
      leaseId: controlLease.leaseId, leaseFence: controlLease.leaseFence,
      expectedStateRevision: before.stateRevision, idempotencyKey: 'wave4-compatibility-first-action' }, side);
    const after = await item.roomStore.loadRoom(roomId);
    assert.equal(after.stateRevision, before.stateRevision + 1);
    const replay = await api('replay', undefined, side);
    assert.equal(replay.matchesCurrent, true);
    const replayHash = hash(await item.roomStore.loadReplayBundle(roomId));
    scaleProofs.push({ minerals: setup.minerals, setupId, roomId,
      wrongReleaseRejected: true, sameReleaseResubmissionAccepted: true, bothSeatsRequired: true,
      rosterContentsMatched: true, action: action.action.actionType, signedRevision: after.stateRevision,
      stateHash: after.envelope.stateHash, bindingHash: after.envelope.matchBindingHash, replayHash });
    console.log('passed ' + setup.minerals + ' point roster rejection, resubmission and signed old-room replay');
  }
} finally { await host.close(); }
host = await createStarcraftProductRoomHostV1(options);
try {
  for (const proof of scaleProofs) {
    const item = await host.get(proof.roomId);
    const room = await item.roomStore.loadRoom(proof.roomId);
    assert.equal(room.envelope.stateHash, proof.stateHash);
    assert.equal(room.envelope.matchBindingHash, proof.bindingHash);
    assert.equal(hash(await item.roomStore.loadReplayBundle(proof.roomId)), proof.replayHash);
    for (const [side, label] of [['player1', 'human'], ['player2', 'guest']]) {
      const result = await item.fixture.roomRuntime.readRoom({ roomId: proof.roomId, seatToken: item.record.credentials[label].seatToken });
      assert.equal(result.ok, true); assert.equal(result.projection.viewer.seatKey, side);
    }
    proof.coldStateReplayAndSeatsMatched = true;
  }
} finally { await host.close(); }
assert.equal(providerCalls, 0);
const report = { schema: 'starcraft_tmg_wave4_candidate_acceptance_v1', status: 'passed',
  wave4: { releaseId: manifest.releaseId, manifestHash: manifest.manifestHash, versions: manifest.source.versions,
    snapshotHash: manifest.source.snapshotHash, datasetHash: manifest.source.datasetHash,
    sourceRevisionHash: manifest.source.sourceRevisionHash, capturedFiles: candidate.index.entries.length,
    counts: candidate.catalogue.counts, reproducibleFromTrackedBytes: true, status: manifest.status },
  wave3: { releaseId: old.releaseId, manifestHash: old.manifestHash, datasetHash: old.source.datasetHash,
    sourceBindingColdRestored: true, exactHistoricalLookup: true, queryCachesSeparated: true, defaultRollbackVerified: true },
  negativeChecks, scales: scaleProofs, modelCalls: providerCalls, trainingTruth: false,
  productionPromoted: false, browserAcceptance: 'pending_wave4_product_wiring',
  scope: 'Wave4 frozen candidate and Wave3 compatibility; Wave4 capabilities/media/browser play remain pending' };
await atomicWrite(path.join(output, 'result.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/candidate-compatibility.public.json'),
  JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
