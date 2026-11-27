import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';
import { officialAbilitySourceFeatureHashV1 } from './official-ability-effect-ir-v1.mjs';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function normalize(value) {
  return String(value || '').replace(/\s+/gu, ' ').trim().toLowerCase();
}
function locator(recordKey, feature) {
  return JSON.stringify([recordKey, normalize(feature.name), normalize(feature.phase)]);
}
function semanticHash(feature) {
  const behavior = Object.fromEntries(Object.entries(feature)
    .filter(([key]) => !['name', 'costS', 'costL'].includes(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, typeof value === 'string' ? normalize(value) : value]));
  return hashStarcraftTmgContract(behavior);
}
function features(dataset) {
  return dataset.recordIndex.filter(row => ['army_units', 'tactical_cards'].includes(row.collectionId))
    .flatMap(row => {
      const record = dataset.recordsByKey[row.recordKey];
      return (record.payload.upgrades || record.payload.boosts || [])
        .map((feature, sourceIndex) => ({ record, feature, sourceIndex }));
    });
}
function seal(body, field) {
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function verify(value, field, schema) {
  const { [field]: hash, ...body } = value || {};
  if (value?.schema !== schema || hashStarcraftTmgContract(body) !== hash) {
    throw Error('OFFICIAL_ABILITY_IDENTITY_INVALID:' + schema);
  }
}

// Bootstrap once from a reviewed source catalogue, then persist and reuse the explicit registry.
export function createOfficialAbilityIdentityRegistryV2({ dataset, classificationOverrides = [] }) {
  const seen = new Set();
  const entries = features(dataset).map(({ record, feature }) => {
    const scope = record.collectionId === 'army_units' ? 'unit' : 'card';
    const key = normalize(feature.name + '-' + (feature.phase || 'any'))
      .replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
    const semanticId = scope + ':' + record.documentId + '/' + key;
    if (!key || seen.has(semanticId)) throw Error('OFFICIAL_ABILITY_IDENTITY_AMBIGUOUS:' + semanticId);
    seen.add(semanticId);
    const override = classificationOverrides.find(item => item.recordKey === record.recordKey
      && locator(item.recordKey, item) === locator(record.recordKey, feature));
    return {
      semanticId, semanticVersion: 1, recordKey: record.recordKey,
      sourceName: feature.name, sourcePhase: feature.phase || '',
      behaviorHash: semanticHash(feature),
      ...(override ? { activationKind: override.activationKind, classificationReason: override.reason } : {}),
    };
  });
  return seal({ schema: 'starcraft_tmg_ability_identity_registry_v2',
    behaviorHashScheme: 'feature_fields_except_purchase_cost_and_label_v2', entries }, 'registryHash');
}

export function reviseOfficialAbilityIdentityRegistryV2({ registry, semanticId, feature }) {
  verify(registry, 'registryHash', 'starcraft_tmg_ability_identity_registry_v2');
  const previous = registry.entries.find(entry => entry.semanticId === semanticId);
  if (!previous) throw Error('OFFICIAL_ABILITY_REGISTRY_ENTRY_MISSING:' + semanticId);
  const nextHash = semanticHash(feature);
  if (previous.behaviorHash === nextHash) return registry;
  return seal({ schema: registry.schema, behaviorHashScheme: registry.behaviorHashScheme, entries: registry.entries.map(entry => entry !== previous ? entry : {
    ...entry, semanticVersion: entry.semanticVersion + 1,
    sourceName: feature.name, sourcePhase: feature.phase || '', behaviorHash: nextHash,
  }) }, 'registryHash');
}

export function compileOfficialAbilityIdentityCatalogueV2({ dataset, registry, historicalDatasets = [] }) {
  verify(registry, 'registryHash', 'starcraft_tmg_ability_identity_registry_v2');
  if (registry.behaviorHashScheme !== 'feature_fields_except_purchase_cost_and_label_v2') {
    throw Error('OFFICIAL_ABILITY_REGISTRY_HASH_SCHEME_REVIEW_REQUIRED');
  }
  const byLocator = new Map();
  const semanticIds = new Set();
  for (const entry of registry.entries) {
    const key = locator(entry.recordKey, { name: entry.sourceName, phase: entry.sourcePhase });
    if (byLocator.has(key) || semanticIds.has(entry.semanticId)
      || !Number.isSafeInteger(entry.semanticVersion) || entry.semanticVersion < 1) {
      throw Error('OFFICIAL_ABILITY_REGISTRY_ENTRY_INVALID:' + entry.semanticId);
    }
    byLocator.set(key, entry);
    semanticIds.add(entry.semanticId);
  }
  const definitions = features(dataset).map(({ record, feature, sourceIndex }) => {
    const entry = byLocator.get(locator(record.recordKey, feature));
    if (!entry) throw Error('OFFICIAL_ABILITY_REGISTRY_ENTRY_MISSING:' + record.recordKey + ':' + feature.name);
    if (entry.behaviorHash !== semanticHash(feature)) {
      throw Error('OFFICIAL_ABILITY_SEMANTIC_VERSION_REVIEW_REQUIRED:' + entry.semanticId);
    }
    const sourceFeatureHash = officialAbilitySourceFeatureHashV1(record, sourceIndex, feature);
    return {
      semanticId: entry.semanticId, semanticVersion: entry.semanticVersion,
      definitionId: entry.semanticId + '@' + entry.semanticVersion,
      recordKey: record.recordKey, sourceIndex, sourceFeatureHash,
      behaviorHash: entry.behaviorHash,
      ...(entry.activationKind ? { activationKind: entry.activationKind } : {}),
    };
  });
  const currentById = new Map(definitions.map(item => [item.semanticId, item]));
  const aliases = [];
  const aliasKeys = new Set();
  for (const historical of [dataset, ...historicalDatasets]) {
    for (const { record, feature, sourceIndex } of features(historical)) {
      const entry = byLocator.get(locator(record.recordKey, feature));
      const current = entry && currentById.get(entry.semanticId);
      if (!current || entry.behaviorHash !== semanticHash(feature)) continue;
      const sourceFeatureHash = officialAbilitySourceFeatureHashV1(record, sourceIndex, feature);
      const aliasKey = historical.sourceSnapshotHash + ':' + sourceFeatureHash;
      if (aliasKeys.has(aliasKey)) continue;
      aliasKeys.add(aliasKey);
      aliases.push({ sourceSnapshotHash: historical.sourceSnapshotHash,
        legacyDefinitionId: 'ability:' + sourceFeatureHash.slice(0, 24),
        sourceFeatureHash, definitionId: current.definitionId });
    }
  }
  return seal({ schema: 'starcraft_tmg_ability_identity_catalogue_v2',
    registryHash: registry.registryHash,
    normalizedDatasetHash: dataset.datasetHash, sourceSnapshotHash: dataset.sourceSnapshotHash,
    definitions, aliases,
  }, 'identityCatalogueHash');
}

export function resolveOfficialAbilityIdentityV2(catalogue, { definitionId, sourceSnapshotHash }) {
  verify(catalogue, 'identityCatalogueHash', 'starcraft_tmg_ability_identity_catalogue_v2');
  const current = catalogue.definitions.find(item => item.definitionId === definitionId);
  if (current) return current;
  const aliases = catalogue.aliases.filter(item => item.legacyDefinitionId === definitionId
    && item.sourceSnapshotHash === sourceSnapshotHash);
  if (aliases.length !== 1) throw Error('OFFICIAL_ABILITY_ALIAS_UNRESOLVED:' + definitionId);
  return catalogue.definitions.find(item => item.definitionId === aliases[0].definitionId);
}
