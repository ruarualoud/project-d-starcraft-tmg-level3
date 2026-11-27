import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { createOfficialBattlefieldTokenV1, measureOfficialClosestTokenBaseEdgeV1,
  verifyOfficialBattlefieldTokenV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialBattlefieldTokenPhysicalFootprintV1, createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1, evaluateOfficialPhysicalFootprintRelationV1,
  evaluateOfficialSweptPhysicalFootprintCollisionV1, isOfficialPhysicalFootprintWhollyWithinRangeV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { OFFICIAL_FORCE_WALL_REFERENCE_SCHEMA_V1, extendOfficialBattlefieldAssetComponentProfileWithForceWallV2,
  getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../packages/source-data/official-battlefield-asset-component-profile-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1,
  openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const releaseRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const baseRef = 'build/ticket-28-wave3-release-context-20261112-v1/native-authority.json';
const mapRef = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/claws-first/checkpoint-r0.json';
const assessment = 'build/ticket-28-protoss-wave3-20261120-v1/';
const sourceRef = assessment + 'force-wall-source/source.json';
const out = assessment + 'force-wall-geometry/';
const referenceRef = 'content/source-releases/wave3-20261121-force-wall-assembly-reference-v1.json';
const profileRef = 'content/source-releases/wave3-20261121-battlefield-components-v4.json';
const geometryReleaseRef = 'content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (ref, data) => atomicWrite(path.join(root, ref), JSON.stringify(data, null, 2) + '\n');
const scope = 'oval_token_geometry_query_and_cold_read';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });

export async function verifyWave3ForceWallGeometryV1() {
  const [observed, seed, map, original] = await Promise.all([read(sourceRef), read(baseRef), read(mapRef), read(releaseRef)]);
  const manual = await fs.readFile(path.join(root, observed.source.ref));
  assert.equal(manual.length, observed.source.byteLength);
  assert.equal(createHash('sha256').update(manual).digest('hex'), observed.source.byteHash);
  const releases = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  const artifacts = new Map();
  const resolver = createOfficialReleaseResolverV2({ store: releases, loadArtifact: ref => artifacts.get(ref) ?? read(ref) });
  try {
    resolver.register(original);
    const context = await resolver.resolve({ releaseId: original.releaseId, purpose: 'area_ability_component' });
    const referenceBody = { schema: OFFICIAL_FORCE_WALL_REFERENCE_SCHEMA_V1,
      normalizedDatasetHash: context.dataset.datasetHash, sourceSnapshotHash: context.snapshot.snapshotHash,
      recordKey: observed.recordKey, abilityName: 'Force Wall', sourceRef: observed.source.ref,
      sourceUrl: observed.source.url, sourceContentHash: observed.source.byteHash, sourceByteLength: manual.length,
      dimensionPage: 3, assemblyPage: 10, baseShape: observed.baseShape,
      baseWidthMm: observed.baseWidthMm, baseDepthMm: observed.baseDepthMm,
    };
    const reference = { ...referenceBody, referenceHash: hash(referenceBody) };
    const oldProfile = getOfficialReleaseBattlefieldAssetComponentProfileV2(context);
    const profile = extendOfficialBattlefieldAssetComponentProfileWithForceWallV2({ context, profile: oldProfile, reference });
    const dimensions = getOfficialBattlefieldAssetComponentFootprintV1(profile, 'force_wall');
    assert.deepEqual([dimensions.baseShape, dimensions.baseWidthMm, dimensions.baseDepthMm], ['oval', 100, 40]);
    assert.deepEqual(getOfficialBattlefieldAssetComponentFootprintV1(profile, 'force_field'),
      getOfficialBattlefieldAssetComponentFootprintV1(oldProfile, 'force_field'));
    assert.equal(getOfficialBattlefieldAssetComponentFootprintV1(profile, 'force_field').baseDiameterMm, 80);
    for (const [key, row] of Object.entries(oldProfile.componentEvidence)) assert.deepEqual(profile.componentEvidence[key], row);

    const revision = await read(original.source.sourceRevisionRef);
    const manifestFor = (releaseId, components) => createOfficialReleaseManifestV2({ releaseId, status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: revision,
      snapshotRef: original.source.snapshotRef, datasetRef: original.source.datasetRef,
      sourceRevisionRef: original.source.sourceRevisionRef, sourcePolicy: original.source.policy,
      referenceSources: { ...original.source.references, forceWallAssembly: {
        ref: observed.source.ref, byteHash: observed.source.byteHash, role: 'reference', version: 'frozen-byte-version' } },
      components,
    });
    const components = { ...original.components, battlefieldAssets: { ref: profileRef, version: profile.semanticVersion,
      integrity: { field: 'profileHash', value: profile.profileHash } } };
    const candidate = manifestFor('wave3-u83-c84-r50-force-wall-geometry-v1', components);
    artifacts.set(profileRef, profile);
    resolver.register(candidate);
    const assetContext = await resolver.resolve({ releaseId: candidate.releaseId, purpose: 'area_ability_component' });
    assert.deepEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(assetContext), profile);

    const roster = createOfficialReleaseRosterStateV2({ context: assetContext,
      legacyDisclosurePolicy: seed.state.officialRosterDisclosureDataBundle,
      rangedWeaponDefinitionIds: ['unit:tassadar/resonance-beam-assault-phase@1'],
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:templar_caste', tacticalCardRecordKeys: ['tactical_cards:templar_archives'],
          units: [unit('tassadar', 'army_units:tassadar')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
          units: [unit('target', 'army_units:goliath')] },
      },
    });
    const shared = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy',
      'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile',
      'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
      'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(shared.map(key => [key, structuredClone(map.envelope.state[key])])),
      ...roster.state, phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1',
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } }, log: [] };
    const caster = state.pieces.find(row => row.id === 'tassadar');
    Object.assign(caster, { isOnField: true, isInReserves: false, xInches: 20, yInches: 25 });
    const model = caster.models[0];
    Object.assign(model, { isOnField: true, xInches: 20, yInches: 25 });
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-wall-geometry' });
    const registry = state.officialBattlefieldTokenMarkerRegistry;
    const token = (tokenId, x, y, baseRotationDegrees) => createOfficialBattlefieldTokenV1({
      tokenId, tokenKind: 'force_wall', registry, baseShape: dimensions.baseShape,
      baseWidthMm: dimensions.baseWidthMm, baseDepthMm: dimensions.baseDepthMm,
      coordinate: { x, y }, baseRotationDegrees, createdByPieceId: caster.id, createdRound: 1,
    });
    assert.throws(() => token('edge-invalid', 1, 5, 0), /BATTLEFIELD_TOKEN_COORDINATE_INVALID/);
    assert(verifyOfficialBattlefieldTokenV1(token('edge-valid', 1, 5, 90), registry));
    assert.throws(() => token('rotation-invalid', 20, 5, Number.POSITIVE_INFINITY), /BATTLEFIELD_TOKEN_ROTATION_INVALID/);
    const horizontal = token('force-wall-horizontal', 23, 25, 0);
    const vertical = token('force-wall-vertical', 17, 25, 90);
    state.board.tokens = [...(state.board.tokens ?? []), horizontal, vertical];
    const dataBundle = state.officialModelBaseGeometryDataBundle;
    const casterBase = createOfficialModelBaseFootprintV1({ piece: caster, model, dataBundle });
    const measured = [horizontal, vertical].map(row => {
      const base = createOfficialBattlefieldTokenPhysicalFootprintV1(row);
      return evaluateOfficialPhysicalFootprintRelationV1({ left: casterBase, right: base }).minimumSeparationMilliInches;
    });
    const expectedGap = axisMm => Math.round(3000 - Math.round(axisMm / 25.4 * 1000) / 2 - casterBase.radiusMilliInches);
    assert.deepEqual(measured, [expectedGap(100), expectedGap(40)]);
    const isWhollyWithin = wall => isOfficialPhysicalFootprintWhollyWithinRangeV1({ source: casterBase,
      target: createOfficialBattlefieldTokenPhysicalFootprintV1(wall), rangeMilliInches: 8000 });
    assert.equal(isWhollyWithin(token('range-horizontal', 27, 25, 0)), false);
    assert.equal(isWhollyWithin(token('range-vertical', 27, 25, 90)), true);
    const probe = (x, y) => createOfficialPhysicalFootprintV1({ objectId: 'crossing-probe', shape: 'round',
      center: { xMilliInches: x, yMilliInches: y }, widthMilliInches: 1181, depthMilliInches: 1181 });
    const blocker = createOfficialBattlefieldTokenPhysicalFootprintV1(vertical);
    const sweep = (a, b) => evaluateOfficialSweptPhysicalFootprintCollisionV1({ movingStart: a, movingEnd: b, blocker });
    assert.equal(sweep(probe(14000, 25000), probe(20000, 25000)).collides, true);
    assert.equal(sweep(probe(14000, 28000), probe(20000, 28000)).collides, false);
    const measure = target => measureOfficialClosestTokenBaseEdgeV1({ registry, token: target,
      originCoordinate: { x: 20, y: 25 }, originBaseDiameterMm: casterBase.officialBaseProfile.baseWidthMillimetres });
    assert.deepEqual([measure(horizontal).distanceInches, measure(vertical).distanceInches], measured.map(v => v / 1000));

    const buildRuntime = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: [], includeRanged: true });
    const runtime = buildRuntime(assetContext);
    const runtimeRef = out + 'runtime.json';
    artifacts.set(runtimeRef, runtime.descriptor);
    const roomId = 'wave3-force-wall-geometry';
    resolver.register(manifestFor(roomId, { ...components, rulesRuntime: {
      ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
      integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash },
    } }));
    const bound = await resolver.resolve({ releaseId: roomId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { scope, sourceRef, geometrySeededFromRelease: true, modelCalls: 0 } });
    const directory = path.join(root, out);
    await fs.mkdir(directory, { recursive: true });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: buildRuntime(bound) }) });
    async function readDistances(product, credential) {
      const view = await product.room.readRoom({ roomId, seatToken: credential.seatToken });
      const legal = await product.room.legalSpace({ roomId, seatToken: credential.seatToken });
      assert.equal(view.ok, true);
      assert.equal(legal.ok, true);
      const runtime = createStarcraftTmgSpatialActionQueryRuntimeV1();
      return Promise.all([horizontal, vertical].map(async target => {
        const receipt = await runtime.query({ roomProjection: view.projection, legalSpace: legal.legalSpace,
          request: { queryKind: 'base_edge_distance', arguments: {
            source: { kind: 'model', unitId: caster.id, modelId: model.id }, target: { kind: 'token', id: target.tokenId },
          } } });
        assert.equal(receipt.status, 'exact', JSON.stringify(receipt));
        return receipt;
      }));
    }
    const product = open();
    let credentials, startingEnvelope, receipts;
    try {
      credentials = await product.create(roomId, authority);
      startingEnvelope = (await product.store.loadRoom(roomId)).envelope;
      receipts = await readDistances(product, credentials.player1);
      assert.deepEqual(receipts.map(row => row.result.distanceMilliInches), measured);
      assert.deepEqual((await product.store.loadRoom(roomId)).envelope, startingEnvelope);
    } finally { product.close(); }
    const reopened = open();
    try {
      await reopened.restoreDependencies(roomId, authority);
      assert.deepEqual((await reopened.store.loadRoom(roomId)).envelope, startingEnvelope);
      const restored = await readDistances(reopened, credentials.player1);
      assert.deepEqual(restored.map(row => row.result), receipts.map(row => row.result));
    } finally { reopened.close(); }

    const report = { status: 'passed', scope, releaseId: candidate.releaseId, profileHash: profile.profileHash,
      previousProfileHash: oldProfile.profileHash, referenceHash: reference.referenceHash, definitionIncrement: 0,
      measuredMilliInches: measured, rotationBoardBoundaryVerified: true, whollyWithin8Verified: true,
      modelBaseSweepVerified: true, publicRoomReadVerified: true, coldReadVerified: true,
      roomRevision: 0, signedActions: 0, geometrySeededFromRelease: true, modelCalls: 0 };
    await save(referenceRef, reference);
    await save(profileRef, profile);
    await save(geometryReleaseRef, candidate);
    await save(runtimeRef, runtime.descriptor);
    await save(out + 'query-receipts.json', receipts);
    await save(out + 'result.json', report);
    return report;
  } finally { releases.close(); }
}
