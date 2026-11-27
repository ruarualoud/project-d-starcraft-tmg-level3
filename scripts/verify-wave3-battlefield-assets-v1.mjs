import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_BATTLEFIELD_TOKEN_PUBLIC_FIELDS_V1 } from '../packages/client-domain/battlefield-token-public-contract-v1.mjs';
import { projectStarcraftTmgViewerStateShapeV3 } from '../packages/client-domain/viewer-projection-v3.mjs';
import { createOfficialBattlefieldTokenV1, createOfficialBattlefieldMarkerV1,
  measureOfficialClosestTokenBaseEdgeV1, resolveOfficialTokenMovementOverlapV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { evaluateOfficialBaseMeasurementV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialBattlefieldAssetComponentProfileV1, createOfficialBattlefieldAssetComponentProfileV2,
  getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 } from '../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-geometry-20261112-v1/assets');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const referencesRef = 'content/source-releases/wave3-20261112-battlefield-component-references-v1.json';
const profileRef = 'content/source-releases/wave3-20261112-battlefield-components-v2.json';
const manifestRef = 'content/source-releases/wave3-20261112-battlefield-components-release-v2.json';
const releaseId = 'wave3-u83-c84-r50-battlefield-components-v1';
const [references, baseManifest, original, legacyDataset, red] = await Promise.all([
  read(referencesRef), read('content/source-releases/wave3-20261112-geometry-release-v2.json'),
  read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
  read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json'),
  read('build/ticket-28-wave3-geometry-20261112-v1/assets/native-token-query-red.json'),
]);
const state = prepareOfficialCurrentProductFirstRoundV1(original.state);
const queen = state.pieces.find(piece => piece.id === 'player2-queen');
Object.assign(queen, { isOnField: true, isInReserves: false, xInches: 45, yInches: 30 });
Object.assign(queen.models[0], { isOnField: true, xInches: 45, yInches: 30, elevation: 'ground', supportTerrainIds: [] });
const { receiptHash: omitted, releaseId: omittedRelease, releaseManifestHash: omittedManifest, ...source } = original;
const body = { ...source, state, setupId: 't28-native-token-query-conditional' };
const authority = { ...body, receiptHash: hashStarcraftTmgContract(body) };
const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: legacyDataset, state: structuredClone(state) }) });
const roomId = 'native-token-geometry';
function openProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
  resolver.register(baseManifest);
  const product = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime: runtime });
  return { ...product, releases: store, resolver, close() { product.close(); store.close(); } };
}
async function setupAndPlace(product) {
  const credentials = await product.create(roomId, authority);
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'round-start', kind: 'finite',
    select: item => item.action.actionType === 'resolve_mission_start_of_round' });
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'first-actor', kind: 'finite',
    select: item => item.action.actionType === 'choose_first_actor' && item.action.chosenFirstActorSideKey === 'player2' });
  assert.equal(state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player2.segments[0].side, 'bottom');
  await product.commit({ roomId, credential: credentials.player2, operationKey: 'creep-spread',
    select: domain => domain.abilityName === 'Creep Spread' && domain.pieceId === 'player2-queen',
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIdsByChoice.default[0],
      coordinate: { xMilliInches: 27000, yMilliInches: 2000 } }) });
  return credentials;
}
function measurementInput(current, piece, id) {
  return { state: current, dataBundle: current.officialModelBaseGeometryDataBundle,
    source: { kind: 'model', unitId: piece.id, modelId: piece.models[0].id }, target: { kind: 'token', id } };
}
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
  identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
    sourceRef: 'build/ticket-28-wave3-geometry-20261112-v1/assets/native-token-query-red.json', contractVersion: 'T28-W3-06-component-profile-and-native-query-v1' },
  steps: [
    { name: 'read', openProduct, check: async () => {
      assert.match(red.message, /MODEL_BASE_GEOMETRY_REFERENCE_INVALID/);
      assert.equal(createOfficialBattlefieldAssetComponentProfileV1().profileHash, original.state.officialBattlefieldAssetComponentProfile.profileHash);
      const prior = await read('build/ticket-28-wave3-geometry-20261112-v1/assets/legacy-scene-measurement.json');
      const scene = { ...original.state, pieces: [red.sourcePiece], board: { ...original.state.board, tokens: [{
        id: 'legacy-scene-token', baseShape: 'round', baseWidthInches: 28 / 25.4,
        baseDepthInches: 28 / 25.4, xInches: 10, yInches: 10 }] } };
      const legacy = evaluateOfficialBaseMeasurementV1(measurementInput(scene, red.sourcePiece, 'legacy-scene-token'));
      assert.equal(legacy.resultHash, prior.resultHash);
      const evidenceRef = await save('legacy.json', { validSceneMeasurementUnchanged: legacy.resultHash,
        legacyComponentProfileUnchanged: original.state.officialBattlefieldAssetComponentProfile.profileHash, providerCalls: 0 });
      return { evidenceRef, checkpointRef: referencesRef };
    } },
    { name: 'compile', openProduct, check: async product => {
      const context = await product.resolver.resolve({ releaseId: baseManifest.releaseId, purpose: 'geometry' });
      const profile = createOfficialBattlefieldAssetComponentProfileV2({ context,
        legacyProfile: original.state.officialBattlefieldAssetComponentProfile, references });
      assert.equal(profile.knownOfficialFootprintCount, 6);
      assert.equal(profile.unresolvedOfficialFootprintComponentKinds.length, 4);
      for (const row of references.components) assert.equal(getOfficialBattlefieldAssetComponentFootprintV1(profile, row.componentKind).baseDiameterMm, 32);
      for (const kind of profile.unresolvedOfficialFootprintComponentKinds) {
        assert.throws(() => getOfficialBattlefieldAssetComponentFootprintV1(profile, kind), /BATTLEFIELD_ASSET_COMPONENT_FOOTPRINT_SOURCE_MISSING/);
      }
      await atomicWrite(path.join(root, profileRef), JSON.stringify(profile, null, 2) + '\n');
      const revision = await read(baseManifest.source.sourceRevisionRef);
      const manifest = createOfficialReleaseManifestV2({ releaseId, status: 'candidate',
        snapshot: context.snapshot, dataset: context.dataset, sourceRevision: revision,
        snapshotRef: baseManifest.source.snapshotRef, datasetRef: baseManifest.source.datasetRef,
        sourceRevisionRef: baseManifest.source.sourceRevisionRef, referenceSources: baseManifest.source.references,
        sourcePolicy: baseManifest.source.policy, components: { ...baseManifest.components,
          battlefieldAssets: { ref: profileRef, version: profile.semanticVersion, integrity: { field: 'profileHash', value: profile.profileHash } } } });
      await atomicWrite(path.join(root, manifestRef), JSON.stringify(manifest, null, 2) + '\n');
      product.resolver.register(manifest);
      const loaded = await product.resolver.resolve({ releaseId, purpose: 'battlefield_assets' });
      assert.equal(getOfficialReleaseBattlefieldAssetComponentProfileV2(loaded).profileHash, profile.profileHash);
      const evidenceRef = await save('profile.json', { profileHash: profile.profileHash, known: 6,
        unresolved: profile.unresolvedComponentEvidence, releaseLoadedThroughProduct: true, providerCalls: 0 });
      return { evidenceRef, checkpointRef: manifestRef };
    } },
    { name: 'consume', openProduct, check: async product => {
      const credentials = await setupAndPlace(product);
      const before = await product.store.loadRoom(roomId);
      const beforeReplay = await product.store.loadReplayBundle(roomId);
      const token = before.envelope.state.board.tokens.find(item => item.tokenKind === 'creep_tumor');
      assert(token);
      for (const key of Object.keys(token)) assert(OFFICIAL_BATTLEFIELD_TOKEN_PUBLIC_FIELDS_V1.includes(key), 'public token field contract missing ' + key);
      const viewed = await product.room.readRoom({ roomId, seatToken: credentials.player2.seatToken });
      assert.equal(viewed.ok, true);
      const visibleToken = viewed.projection.state.board.tokens.find(item => item.tokenId === token.tokenId);
      assert.deepEqual(visibleToken, token);
      const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
      const queryRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1();
      const receipt = await queryRuntime.query({ roomProjection: viewed.projection, legalSpace: legal.legalSpace,
        request: { queryKind: 'base_edge_distance', arguments: {
          source: { kind: 'model', unitId: queen.id, modelId: queen.models[0].id }, target: { kind: 'token', id: token.tokenId } } } });
      assert.equal(receipt.status, 'exact', JSON.stringify(receipt));
      const independent = measureOfficialClosestTokenBaseEdgeV1({ registry: before.envelope.state.officialBattlefieldTokenMarkerRegistry,
        token, originCoordinate: { x: 45, y: 30 }, originBaseDiameterMm: 80 });
      assert(Math.abs(receipt.result.distanceMilliInches - Math.round(independent.distanceInches * 1000)) <= 1);
      const after = await product.store.loadRoom(roomId);
      assert.equal(hashStarcraftTmgContract(after.envelope), hashStarcraftTmgContract(before.envelope));
      assert.equal(after.stateRevision, before.stateRevision);
      const afterReplay = await product.store.loadReplayBundle(roomId);
      assert.equal(afterReplay.privateJournal.length, beforeReplay.privateJournal.length);
      const projected = projectStarcraftTmgViewerStateShapeV3({ ...before.envelope.state, board: { ...before.envelope.state.board,
        tokens: [{ ...token, privatePlan: 'must-not-project', coordinate: { ...token.coordinate, privateMemo: 'must-not-project' } }] } });
      assert.deepEqual(projected.board.tokens[0], token);
      const evidenceRef = await save('native-query.json', { nativeToken: token, receipt,
        independentMeasurement: independent, publicTokenShapePreserved: true, privateExtraFieldsRemoved: true,
        queryDidNotMutateEnvelopeJournalOrRevision: true, revision: after.stateRevision, stateHash: after.envelope.stateHash, providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'room.sqlite') };
    } },
    { name: 'successor', openProduct, check: async product => {
      const credentials = await product.create(roomId, authority);
      let legal = await product.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
      const finish = legal.legalSpace.parameterDomains.find(domain => domain.actionType === 'finish_activation' && domain.pieceId === queen.id);
      if (finish) await product.commit({ roomId, credential: credentials.player2, operationKey: 'finish-queen',
        select: domain => domain.domainId === finish.domainId, parameters: () => ({}) });
      const current = await product.store.loadRoom(roomId);
      if (current.envelope.state.activeSideKey === 'player2') await product.commit({ roomId, credential: credentials.player2,
        operationKey: 'pass-after-placement', kind: 'finite', select: item => item.action.actionType === 'pass' });
      const after = await product.store.loadRoom(roomId);
      assert.equal(after.envelope.state.activeSideKey, 'player1');
      product.resolver.register(await read(manifestRef));
      const bound = await product.resolver.bind({ subjectKind: 'component_geometry_probe', subjectId: roomId,
        releaseId, purpose: 'battlefield_assets' });
      const context = await product.resolver.resolveSubject({ subjectKind: 'component_geometry_probe', subjectId: roomId });
      const profile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
      const probes = [];
      for (const row of references.components) {
        const component = getOfficialBattlefieldAssetComponentFootprintV1(profile, row.componentKind);
        const token = createOfficialBattlefieldTokenV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
          tokenId: 'geometry-probe-' + row.componentKind, tokenKind: row.componentKind, coordinate: { x: 10, y: 10 },
          baseShape: component.baseShape, baseDiameterMm: component.baseDiameterMm, createdRound: 1 });
        const probe = { ...state, pieces: [red.sourcePiece], board: { ...state.board, tokens: [token] } };
        const measured = evaluateOfficialBaseMeasurementV1(measurementInput(probe, red.sourcePiece, token.tokenId));
        assert.equal(measured.distanceMilliInches, 3740);
        const overlap = resolveOfficialTokenMovementOverlapV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
          token, modelBaseDiameterMm: 32, destination: { x: 10, y: 10 } });
        assert.equal(overlap.mayTraverseThroughToken, true);
        assert.equal(overlap.mayEndAtDestination, false);
        probes.push({ kind: row.componentKind, measured: measured.distanceMilliInches, overlap });
      }
      const square = createOfficialBattlefieldTokenV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
        tokenId: 'engineering-square-probe', tokenKind: 'engineering-square-probe', coordinate: { x: 10, y: 10 },
        baseShape: 'square', baseWidthMm: 28, baseDepthMm: 28 });
      const squareState = projectStarcraftTmgViewerStateShapeV3({ ...state, pieces: [red.sourcePiece], board: { ...state.board, tokens: [square] } });
      assert.deepEqual(squareState.board.tokens[0], square);
      assert.equal(evaluateOfficialBaseMeasurementV1(measurementInput(squareState, red.sourcePiece, square.tokenId)).distanceMilliInches, 3819);
      const marker = createOfficialBattlefieldMarkerV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
        markerId: 'intangible-marker', markerKind: 'mode', coordinate: { x: 10, y: 10 } });
      assert.throws(() => evaluateOfficialBaseMeasurementV1(measurementInput({ ...state, pieces: [red.sourcePiece],
        board: { ...state.board, tokens: [marker] } }, red.sourcePiece, marker.markerId)), /MODEL_BASE_GEOMETRY_REFERENCE_INVALID/);
      const evidenceRef = await save('successor.json', { roomAdvanced: true, revision: after.stateRevision,
        stateHash: after.envelope.stateHash, componentBinding: bound, probes, squareSchemaSupported: true,
        intangibleMarkerNotGivenPhysicalFootprint: true, newAbilityExecutionProven: false, providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'room.sqlite') };
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
      await product.restoreDependencies(roomId, authority);
      const after = await product.store.loadRoom(roomId);
      const successor = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
      assert.equal(after.envelope.stateHash, successor.stateHash);
      assert.equal((await product.room.replayRoom({ roomId })).matchesCurrent, true);
      const context = await product.resolver.resolveSubject({ subjectKind: 'component_geometry_probe', subjectId: roomId });
      const profile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
      assert.equal(profile.knownOfficialFootprintCount, 6);
      const evidenceRef = await save('cold-recovery.json', { nativeRoomStateAndReceiptsPreserved: true,
        componentBinding: context.binding, known: 6, unresolved: 4, providerCalls: 0 });
      return { evidenceRef, checkpointRef: path.join(directory, 'room.sqlite') };
    } },
  ] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), knownComponents: 6, unresolved: 4, providerCalls: 0 }));
