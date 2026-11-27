import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialCommandCenterDataset } from './official-command-center-adapter-v1.mjs';
import { readOfficialReviewedDeploymentGeometryV1 } from './official-reviewed-deployment-geometry-v1.mjs';
import { verifyStarcraftTmgSourceRevisionManifestV4 } from './official-source-import-workflow-v4.mjs';

const areaAbilityInputs = ['armyBuilder', 'geometry', 'unitCharacteristics', 'abilityIdentities', 'battlefieldAssets'];
const requiredComponents = {
  catalogue: [],
  mission_source: ['missionSource'],
  army_building: ['armyBuilder'],
  geometry: ['geometry'],
  wave3_community_geometry: ['wave3CommunityGeometry'],
  battlefield_assets: ['geometry', 'battlefieldAssets'],
  unit_characteristics: ['armyBuilder', 'geometry', 'unitCharacteristics'],
  ability_component: ['armyBuilder', 'geometry', 'unitCharacteristics', 'abilityIdentities', 'rulesRuntime'],
  area_ability_inputs: areaAbilityInputs,
  area_ability_component: [...areaAbilityInputs, 'rulesRuntime'],
  planning: ['armyBuilder', 'roomFactory', 'rulesRuntime', 'geometry', 'missions', 'abilityIdentities', 'strategySkills'],
  battle: ['rulesRuntime', 'geometry', 'missions', 'abilityIdentities'],
};
function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function fail(code, detail) {
  throw Object.assign(new Error(code + (detail ? ':' + detail : '')), { code, detail });
}
function seal(body) {
  return freeze({ ...body, manifestHash: hashStarcraftTmgContract(body) });
}

export function createOfficialReleaseManifestV2({ releaseId, status = 'candidate',
  snapshot, dataset, snapshotRef, datasetRef, sourceRevisionRef, sourceRevision, referenceSources, components = {}, sourcePolicy }) {
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  if (sourceRevision) {
    verifyStarcraftTmgSourceRevisionManifestV4(sourceRevision);
    if (sourceRevision.normalizedDatasetHash !== dataset.datasetHash
      || sourceRevision.sourceSnapshotHash !== snapshot.snapshotHash) fail('OFFICIAL_RELEASE_SOURCE_MISMATCH');
  }
  return verifyOfficialReleaseManifestV2(seal({
    schema: 'starcraft_tmg_release_manifest_v2', releaseId, status,
    source: { snapshotRef, datasetRef, sourceRevisionRef,
      ...(sourceRevision ? { sourceRevisionHash: sourceRevision.revisionHash } : {}),
      ...(referenceSources ? { references: referenceSources } : {}),
      snapshotHash: snapshot.snapshotHash, datasetHash: dataset.datasetHash,
      versions: { ...dataset.dataVersions }, policy: sourcePolicy },
    components,
  }));
}

export function verifyOfficialReleaseManifestV2(manifest) {
  const { manifestHash, ...body } = manifest || {};
  if (manifest?.schema !== 'starcraft_tmg_release_manifest_v2'
    || !manifest.releaseId || !['candidate', 'available', 'retired'].includes(manifest.status)
    || !manifest.source?.snapshotRef || !manifest.source?.datasetRef
    || !manifest.source?.sourceRevisionRef
    || !manifest.source?.snapshotHash || !manifest.source?.datasetHash
    || !manifest.source?.policy || !manifest.components
    || manifestHash !== hashStarcraftTmgContract(body)) fail('OFFICIAL_RELEASE_MANIFEST_INVALID');
  for (const key of ['unitsVersion', 'cardsVersion', 'rulesVersion']) {
    if (!/^\d+$/u.test(String(manifest.source.versions?.[key]))) fail('OFFICIAL_RELEASE_VERSION_INVALID', key);
  }
  for (const [name, component] of Object.entries(manifest.components)) {
    if (component !== null && (!component.ref || !component.version)) {
      fail('OFFICIAL_RELEASE_COMPONENT_INVALID', name);
    }
  }
  if (manifest.status === 'available') {
    const missing = requiredComponents.battle.filter(key => !manifest.components[key]);
    if (missing.length) fail('OFFICIAL_RELEASE_COMPONENTS_MISSING', missing);
  }
  return freeze(manifest);
}

export function createOfficialReleaseResolverV2({ store, loadArtifact }) {
  if (!store || typeof loadArtifact !== 'function') fail('OFFICIAL_RELEASE_RESOLVER_PORTS_REQUIRED');
  const sources = new Map();

  async function resolve({ releaseId, purpose = 'catalogue', binding } = {}) {
    if (!Object.hasOwn(requiredComponents, purpose)) fail('OFFICIAL_RELEASE_PURPOSE_INVALID', purpose);
    const selectedId = binding?.releaseId || releaseId || store.readDefault(purpose).releaseId;
    if (!selectedId) fail('OFFICIAL_RELEASE_SELECTION_MISSING', purpose);
    if (binding && (binding.purpose !== purpose || (releaseId && releaseId !== binding.releaseId))) {
      fail('OFFICIAL_RELEASE_BINDING_CONFLICT');
    }
    const manifest = verifyOfficialReleaseManifestV2(store.readRelease(selectedId));
    if (binding && binding.manifestHash !== manifest.manifestHash) fail('OFFICIAL_RELEASE_BINDING_CONFLICT');
    if (!binding && manifest.status === 'retired') fail('OFFICIAL_RELEASE_RETIRED', selectedId);
    const missing = requiredComponents[purpose].filter(key => !manifest.components[key]);
    if (missing.length) fail('OFFICIAL_RELEASE_COMPONENTS_MISSING', missing);
    if (purpose === 'battle' && manifest.status !== 'available') fail('OFFICIAL_RELEASE_NOT_AVAILABLE', selectedId);
    let source = sources.get(manifest.manifestHash);
    if (!source) {
      const [snapshot, dataset, revision] = await Promise.all([
        loadArtifact(manifest.source.snapshotRef), loadArtifact(manifest.source.datasetRef),
        loadArtifact(manifest.source.sourceRevisionRef),
      ]);
      verifyOfficialCommandCenterDataset({ snapshot, dataset });
      verifyStarcraftTmgSourceRevisionManifestV4(revision);
      if (snapshot.snapshotHash !== manifest.source.snapshotHash
        || dataset.datasetHash !== manifest.source.datasetHash
        || revision.normalizedDatasetHash !== dataset.datasetHash
        || revision.sourceSnapshotHash !== snapshot.snapshotHash
        || (manifest.source.sourceRevisionHash && revision.revisionHash !== manifest.source.sourceRevisionHash)
        || Object.keys(dataset.dataVersions).some(key => String(dataset.dataVersions[key])
          !== String(manifest.source.versions[key]))) fail('OFFICIAL_RELEASE_SOURCE_MISMATCH', selectedId);
      source = freeze({ snapshot, dataset });
      sources.set(manifest.manifestHash, source);
    }
    const resources = {};
    const resourceNames = requiredComponents[purpose];
    // The executable mission component and its reviewed card source have
    // separate identities. Supply both to a room when the release binds them.
    const hasRoomMissionSource = (purpose === 'planning' || purpose === 'battle') && manifest.components.missionSource;
    const hasRavenGeometry = resourceNames.includes('geometry')
      && ['2.1.0', '2.2.0'].includes(manifest.components.geometry.version);
    const areaAbility = purpose === 'area_ability_component' || purpose === 'area_ability_inputs';
    const hasCommunityGeometry = hasRavenGeometry
      || (areaAbility && manifest.components.wave3CommunityGeometry);
    if (hasCommunityGeometry && !manifest.components.wave3CommunityGeometry) {
      fail('OFFICIAL_RELEASE_COMPONENTS_MISSING', 'wave3CommunityGeometry');
    }
    const hasBlastTemplateGeometry = (areaAbility || purpose === 'planning' || purpose === 'battle')
      && manifest.components.blastTemplateGeometry;
    const hasDeploymentCardGeometry = (areaAbility || ['mission_source', 'planning', 'battle'].includes(purpose))
      && manifest.components.deploymentCardGeometry;
    const optionalNames = [hasRoomMissionSource && 'missionSource', hasCommunityGeometry && 'wave3CommunityGeometry',
      hasBlastTemplateGeometry && 'blastTemplateGeometry', hasDeploymentCardGeometry && 'deploymentCardGeometry'].filter(Boolean);
    // A release-bound board laboratory must load the same frozen physical inputs as a room.
    if (purpose === 'planning' || purpose === 'battle') {
      for (const key of ['armyBuilder', 'unitCharacteristics', 'battlefieldAssets']) {
        if (manifest.components[key]) optionalNames.push(key);
      }
    }
    for (const name of new Set([...resourceNames, ...optionalNames])) {
      const component = manifest.components[name];
      try { resources[name] = await loadArtifact(component.ref); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        fail('OFFICIAL_RELEASE_ARTIFACT_MISSING', { component: name, ref: component.ref });
      }
      if (component.integrity && resources[name]?.[component.integrity.field] !== component.integrity.value) {
        fail('OFFICIAL_RELEASE_COMPONENT_CONTENT_MISMATCH', name);
      }
    }
    const context = { manifest, ...source, resources };
    if (hasRavenGeometry) {
      const { getOfficialReleaseModelBaseGeometryBundleV2 } = await import('./official-model-base-geometry-data-bundle-v1.mjs');
      getOfficialReleaseModelBaseGeometryBundleV2(context);
    }
    if (hasDeploymentCardGeometry) {
      readOfficialReviewedDeploymentGeometryV1({ dataset: source.dataset, releaseContext: context });
    }
    return freeze(context);
  }

  return Object.freeze({
    register: manifest => store.registerRelease(verifyOfficialReleaseManifestV2(manifest)),
    setDefault({ releaseId, purpose = 'catalogue', expectedGeneration }) {
      const manifest = verifyOfficialReleaseManifestV2(store.readRelease(releaseId));
      if (!Object.hasOwn(requiredComponents, purpose)) fail('OFFICIAL_RELEASE_PURPOSE_INVALID', purpose);
      const missing = requiredComponents[purpose].filter(key => !manifest.components[key]);
      if (missing.length) fail('OFFICIAL_RELEASE_COMPONENTS_MISSING', missing);
      if (manifest.status === 'retired' || (purpose === 'battle' && manifest.status !== 'available')) {
        fail('OFFICIAL_RELEASE_NOT_AVAILABLE', releaseId);
      }
      return store.writeDefault({ releaseId, purpose, expectedGeneration });
    },
    resolve,
    async resolveHistoricalSource({ snapshotHash, datasetHash, purpose = 'catalogue' }) {
      const matches = store.listReleases().filter(item => item.source.snapshotHash === snapshotHash
        && item.source.datasetHash === datasetHash);
      if (matches.length !== 1) fail('OFFICIAL_RELEASE_HISTORICAL_SOURCE_UNRESOLVED');
      return resolve({ releaseId: matches[0].releaseId, purpose });
    },
    async bind({ subjectKind, subjectId, releaseId, purpose = 'catalogue' }) {
      const { manifest } = await resolve({ releaseId, purpose });
      return store.bindSubject({ subjectKind, subjectId, releaseId: manifest.releaseId,
        manifestHash: manifest.manifestHash, purpose });
    },
    async resolveSubject({ subjectKind, subjectId }) {
      const binding = store.readBinding({ subjectKind, subjectId });
      return { binding, ...await resolve({ binding, purpose: binding.purpose }) };
    },
  });
}

export function officialReleaseQueryScopeV2({ manifest, stateRevision, sceneRevision = null,
  queryKind, parameters }) {
  verifyOfficialReleaseManifestV2(manifest);
  if (!Number.isSafeInteger(stateRevision) || stateRevision < 0 || !queryKind) {
    fail('OFFICIAL_RELEASE_QUERY_SCOPE_INVALID');
  }
  return hashStarcraftTmgContract({ releaseId: manifest.releaseId,
    manifestHash: manifest.manifestHash, source: manifest.source,
    components: manifest.components, stateRevision, sceneRevision, queryKind, parameters });
}

export function assertOfficialReleaseSourceV2(context, { dataset, snapshot }) {
  const manifest = verifyOfficialReleaseManifestV2(context?.manifest);
  if (manifest.source.datasetHash !== dataset?.datasetHash
    || manifest.source.snapshotHash !== snapshot?.snapshotHash) fail('OFFICIAL_RELEASE_SOURCE_MISMATCH');
  return manifest;
}

export function bindOfficialReleaseRulesRuntimeV2({ context, runtime }) {
  const manifest = assertOfficialReleaseSourceV2(context, context);
  const expectedRuntime = manifest.components.rulesRuntime;
  if (!runtime?.descriptor || expectedRuntime?.version !== runtime.descriptor.runtimeVersion) {
    fail('OFFICIAL_RELEASE_RUNTIME_VERSION_MISMATCH');
  }
  const { runtimeHash, ...runtimeBody } = runtime.descriptor;
  if (expectedRuntime.integrity?.field === 'runtimeHash'
    && (runtimeHash !== expectedRuntime.integrity.value
      || runtimeHash !== hashStarcraftTmgContract(runtimeBody))) {
    fail('OFFICIAL_RELEASE_RUNTIME_HASH_MISMATCH');
  }
  const releaseBinding = freeze({ schema: 'starcraft_tmg_release_binding_v2',
    releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
    sourceSnapshotHash: manifest.source.snapshotHash, normalizedDatasetHash: manifest.source.datasetHash,
    runtimeHash,
  });
  return Object.freeze({ ...runtime, releaseBinding });
}

export function assertOfficialReleaseQueryBindingV2({ expectedBinding, aggregate }) {
  const envelope = aggregate?.envelope;
  const binding = envelope?.matchBinding?.releaseBinding ?? envelope?.releaseBinding ?? null;
  assertSameOfficialQueryReleaseV2(expectedBinding, binding);
  if (envelope?.matchBinding && envelope.releaseBinding) {
    assertSameOfficialQueryReleaseV2(envelope.matchBinding.releaseBinding, envelope.releaseBinding);
  }
  return binding;
}

export function assertSameOfficialQueryReleaseV2(expected, actual) {
  if (expected === actual || (expected == null && actual == null)) return;
  if (hashStarcraftTmgContract(expected ?? null) !== hashStarcraftTmgContract(actual ?? null)) {
    fail('OFFICIAL_RELEASE_QUERY_BINDING_MISMATCH');
  }
}
