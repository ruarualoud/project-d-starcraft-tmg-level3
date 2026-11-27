import { createStarcraftTmgSceneQueryServiceV1 } from '../online-agent-session/scene-query-service-v1.mjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createSqliteOfficialReleaseStoreV1 } from '../source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2, verifyOfficialReleaseManifestV2 }
  from '../source-data/official-release-context-v2.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from './official-current-product-match-runtime-v1.mjs';
import {createOfficialRoomRosterDisclosureDataBundleV1} from '../source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { buildOfficialRoomArmyAuditV1, prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from './official-standard-room-factory-v1.mjs';
import { prepareOfficialSkirmish500ReleaseOpeningV2 } from './official-skirmish-500-room-factory-v1.mjs';
import { createOfficialPremadeMapConfiguratorV1 } from './official-premade-map-configurator-v1.mjs';
import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgAuthoritativeEngine } from '../authoritative-engine/transition-v1.mjs';
import { createStarcraftTmgRoomRuntime } from '../room-runtime/in-memory-room-v1.mjs';

async function resolveRelease(manifest, loadArtifact, purpose) {
  const store = createSqliteOfficialReleaseStoreV1({filename: ':memory:'});
  try {
    const resolver = createOfficialReleaseResolverV2({store, loadArtifact});
    resolver.register(manifest);
    const [context, mission] = await Promise.all([purpose, 'mission_source'].map(
      p => resolver.resolve({releaseId: manifest.releaseId, purpose: p})));
    return {...context, resources: {...context.resources, ...mission.resources}};
  } finally { store.close(); }
}

// Preserve the IDs and release bindings of the two original lobby presets.
export async function loadWave3HumanMatchSetupsV1(root) {
  const read = async ref => JSON.parse(await readFile(path.join(root, ref), 'utf8'));
  const releaseRef = 'content/source-releases/wave3-20261126-human-match-v2.json';
  const [original, rawManifest] = await Promise.all([
    read('content/wave3-human-match-setups-v1.json'), read(releaseRef),
  ]);
  const manifest = verifyOfficialReleaseManifestV2(rawManifest);
  async function cardsFor(component) {
    const source = await read(component.ref);
    const {bundleHash, ...body} = source;
    if (bundleHash !== component.integrity.value || bundleHash !== hashStarcraftTmgContract(body)) {
      throw Error('PRODUCT_SETUP_CARD_SOURCE_MISMATCH');
    }
    return source;
  }
  const [sources, geometry] = await Promise.all([
    cardsFor(manifest.components.missionSource), cardsFor(manifest.components.deploymentCardGeometry),
  ]);
  const setups = [...original];
  for (const base of original) {
    for (const {family, profile} of sources.missions) {
      if (profile.engagementScale !== base.scale) continue;
      // Standard Gather is an older mission outside this rollout.
      if (base.scale === 'Standard' && family === 'gather_the_resources') continue;
      for (const deployment of sources.deploymentSources) {
        if (deployment.engagementScale !== base.scale) continue;
        if (!geometry.cards.some(card => card.recordKey === deployment.recordKey)) {
          throw Error('PRODUCT_SETUP_CARD_GEOMETRY_MISSING:' + deployment.recordKey);
        }
        if (profile.recordKey === base.missionRecordKey && deployment.recordKey === base.deploymentRecordKey) continue;
        const cardId = deployment.recordKey.split(':')[1];
        setups.push({...base, id:base.id + '-' + family + '-' + cardId, releaseRef,
          sourceHash:manifest.manifestHash, missionRecordKey:profile.recordKey, mission:profile.name,
          deploymentRecordKey:deployment.recordKey,
          deployment:deployment.recordKey === base.deploymentRecordKey ? base.deployment : deployment.name});
      }
    }
  }
  return setups;
}

export function wave3HumanMapConfiguration(setup) {
  const {recommendedTerrainSetup} = createOfficialPremadeMapConfiguratorV1().preview({seedId: setup.seedId});
  if (recommendedTerrainSetup.pendingSurfaceInstanceIds.length) throw Error('PRODUCT_MAP_SURFACE_INPUT_REQUIRED');
  return {seedId: setup.seedId, terrainSetup: {valuesByInstance: recommendedTerrainSetup.valuesByInstance}};
}

export async function loadWave3MatchBoardFactoryV1({root, setup}) {
  const load = async ref => JSON.parse(await readFile(path.join(root, ref), 'utf8'));
  const source = await load(setup.releaseRef);
  if (source.manifestHash !== setup.sourceHash) throw Error('PRODUCT_ROOM_RELEASE_SOURCE_CHANGED');
  const context = await resolveRelease(source, load, 'area_ability_inputs');
  const sourceRevision = await load(source.source.sourceRevisionRef);
  function prepare({roomId, recipes, mapConfiguration}) {
    const standard = setup.scale === 'Standard';
    const buildOpening = standard ? prepareOfficialStandardReleaseOpeningV2 : prepareOfficialSkirmish500ReleaseOpeningV2;
    return buildOpening({releaseContext: context, releaseMatchVersion: setup.version, dataset: context.dataset,
      snapshot: context.snapshot, roomId, recipes, mapConfiguration,
      missionRecordKey: setup.missionRecordKey, deploymentRecordKey: setup.deploymentRecordKey,
      ...(standard ? {armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} : {})});
  }
  let rosterBundle;
  function auditArmy(side,recipe) {
    rosterBundle ??= createOfficialRoomRosterDisclosureDataBundleV1({
      dataset:context.dataset,snapshot:context.snapshot,releaseContext:context});
    return buildOfficialRoomArmyAuditV1(rosterBundle.unitCompositionUpgradeDataBundle,side,recipe,{
      releaseContext:context,dataset:context.dataset,scaleId:setup.scale,mineralBudget:setup.minerals,
      ...(setup.scale==='Standard'?{armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY}:{})});
  }
  function bind(state) {
    const runtime = createOfficialReleaseMatchRuntimeV2({context, state, candidateVersion: setup.version});
    const descriptor = runtime.descriptor;
    const ref = 'room-runtime/' + descriptor.runtimeHash;
    const manifest = createOfficialReleaseManifestV2({releaseId: source.releaseId, dataset: context.dataset,
      snapshot: context.snapshot, datasetRef: source.source.datasetRef, snapshotRef: source.source.snapshotRef,
      sourceRevisionRef: source.source.sourceRevisionRef, sourceRevision,
      sourcePolicy: source.source.policy, referenceSources: source.source.references,
      components: {...source.components, rulesRuntime: {ref, version: descriptor.runtimeVersion,
        integrity: {field: 'runtimeHash', value: descriptor.runtimeHash}}}});
    // All source components were resolved above. Only the freshly computed runtime is added.
    const releaseContext = {...context, manifest};
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({context: releaseContext, runtime});
    return {releaseContext, rulesRuntime};
  }
  return {prepare, bind, auditArmy, datasetHash: context.dataset.datasetHash, snapshotHash: context.snapshot.snapshotHash};
}

// Reopening uses the saved, signed initial envelope. Later turns must never become a new opening.
export async function openWave3HumanMatch({root, record, roomStore, refereeCrypto}) {
  const factory = await loadWave3MatchBoardFactoryV1({root, setup: record.releaseSetup});
  const prior = await roomStore.loadRoom(record.roomId);
  if (Boolean(prior) !== Boolean(record.credentials)) throw Error('PRODUCT_ROOM_SAVED_IDENTITY_MISMATCH');
  const state = prior ? (await roomStore.loadReplayBundle(record.roomId)).initialEnvelope.state
    : factory.prepare(record).state;
  const {releaseContext: context, rulesRuntime} = factory.bind(state);
  const {manifest} = context;
  const engine = createStarcraftTmgAuthoritativeEngine({rulesRuntime, refereeCrypto});
  const roomRuntime = createStarcraftTmgRoomRuntime({authorityEngine: engine, roomStore, checkpointInterval: 8,
    characterReleaseChannel: 'development_internal'});
  const serverSeatPlan = [{label: 'human', seatKey: 'player1', principalType: 'human', roleMode: 'player'}];
  if(record.lineupId) serverSeatPlan.push({label:'guest',seatKey:'player2',principalType:'human',roleMode:'player'});
  const {unitsVersion, cardsVersion, rulesVersion} = context.dataset.dataVersions;
  const dataVersion = [unitsVersion, cardsVersion, rulesVersion].join('/');
  const dependencies = {
    sourceSnapshot: {artifactId: 'wave3-command-center', content: context.snapshot},
    dataSnapshot: {artifactId: 'wave3-room-rules-data', content: {manifest, normalizedDatasetHash: context.dataset.datasetHash,
      combat: state.officialCombatProfileBundle, supply: state.officialUnitCardSupplyDataBundle,
      cards: state.officialCardBuildPaymentDataBundle}},
    geometryArtifact: {artifactId: 'wave3-room-geometry', content: {bases: state.officialModelBaseGeometryDataBundle,
      map: state.officialCompetitiveMapRoomFreeze, deployment: state.officialDeploymentGeometryBinding}}
  };
  let createdRoom;
  if (prior) {
    const binding = prior.envelope.matchBinding;
    const restored = engine.createMatchBinding({roomId: record.roomId, matchId: binding.matchId,
      gameId: binding.gameId, dataVersion, dependencies, rngSchemeId: binding.rngSchemeId});
    if (restored.bindingHash !== binding.bindingHash) throw Error('PRODUCT_ROOM_SAVED_BINDING_MISMATCH');
    createdRoom = {ok: true, credentials: record.credentials, matchBinding: binding};
  } else {
    const body = {source: 'server_factory', releaseId: manifest.releaseId, releaseManifestHash: manifest.manifestHash,
      dataVersion, dependencies, state, serverSeatPlan, trainingTruth: false};
    const initialStateAuthority = {...body, receiptHash: hashStarcraftTmgContract(body)};
    createdRoom = await roomRuntime.createRoom({gameId: 'starcraft-tmg', roomId: record.roomId, title: record.title,
      surfaceMode: record.matchMode, serverSeatPlan, initialStateAuthority});
    if (!createdRoom.ok) throw Error(createdRoom.reason);
  }
  const queryFor = seatKey => createStarcraftTmgSceneQueryServiceV1({roomStore, rulesRuntime, seatKey});
  const player1SceneQuery = queryFor('player1');
  return {createdRoom, roomRuntime, rulesRuntime, authorityEngine: engine,
    spatialRuntime:queryFor('player2'), player1SceneQuery, player1SpatialRuntime:player1SceneQuery};
}
