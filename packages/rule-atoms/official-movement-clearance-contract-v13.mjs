import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13 = Object.freeze({
  schema: 'starcraft_tmg_official_model_gap_transit_policy_v1',
  version: '1.0.0',
  sourceFaqByteHash: '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213',
  sourceCoreByteHash: '27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54',
  scope: 'host_derived_round_model_gap_leading_transit',
  fullPhysicalEndpointRequired: true,
  ruleAtomId: 'rule-atom:singleton:core-4-6-clearance-versus-placement:26e711f2f791',
});

export const OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 = Object.freeze({
  ...OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13,
  version: '2.0.0',
  scope: 'ground_level_size_clearance_sweep',
  smallSizeMaximum: 2,
  smallClearanceDiameterMilliInches: 1000,
  largeClearanceDiameterMilliInches: 3000,
  clearanceShape: 'round',
  endpointShape: 'actual_complete_base',
});

export const OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_official_large_terrain_removal_policy_v1',
  version: '1.0.0', ruleAtomId: 'rule-atom:siege-tank-large-terrain-removal-v1',
  scope: 'source_bound_large_leading_path_and_all_final_bases',
  terrainKind: 'impassable', terrainSizes: [0, 1], tokensExcluded: true,
});

export function hasOfficialLargeTerrainRemovalPolicyV1(state) {
  if (state?.officialLargeTerrainRemovalPolicy === undefined) return false;
  if (!isDeepStrictEqual(state.officialLargeTerrainRemovalPolicy, OFFICIAL_LARGE_TERRAIN_REMOVAL_POLICY_V1)) {
    throw Error('LARGE_TERRAIN_REMOVAL_POLICY_MISMATCH');
  }
  return true;
}

function acceptedPolicy(policy) {
  return isDeepStrictEqual(policy, OFFICIAL_MODEL_GAP_TRANSIT_POLICY_V13)
    || isDeepStrictEqual(policy, OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13);
}

export function hasOfficialModelGapTransitPolicyV13(state) {
  if (state?.officialModelGapTransitPolicy === undefined) return false;
  if (!acceptedPolicy(state.officialModelGapTransitPolicy)) {
    throw new Error('MODEL_GAP_TRANSIT_POLICY_MISMATCH');
  }
  return true;
}

export function projectOfficialModelGapTransitStateV13(state, policy) {
  if (!acceptedPolicy(policy)) {
    throw new Error('MODEL_GAP_TRANSIT_POLICY_REQUIRED');
  }
  if (hasOfficialModelGapTransitPolicyV13(state)) {
    if (!isDeepStrictEqual(state.officialModelGapTransitPolicy, policy)) {
      throw new Error('MODEL_GAP_TRANSIT_POLICY_VERSION_BINDING_MISMATCH');
    }
    return state;
  }
  return { ...state, officialModelGapTransitPolicy: structuredClone(policy) };
}

export function usesOfficialGroundSizeClearanceV13(state, path) {
  return hasOfficialModelGapTransitPolicyV13(state)
    && state.officialModelGapTransitPolicy.version === '2.0.0'
    && path.points.every(point => point.elevation === 'ground');
}

export function getOfficialGroundSizeClearanceDiameterV13(piece) {
  const size = Number(piece?.sizeCharacteristic);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('MODEL_GAP_TRANSIT_SIZE_REQUIRED');
  const policy = OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13;
  const trait = piece?.officialLargeMovementTrait;
  if (trait !== undefined) {
    if (trait.minimumGapMilliInches !== 3000 || trait.sourceRecordHash !== piece.sourceRecordHash
      || trait.payloadHash !== piece.officialPayloadHash || !/^[a-f0-9]{64}$/u.test(trait.sourceFeatureHash)) {
      throw new Error('MODEL_GAP_TRANSIT_LARGE_SOURCE_MISMATCH');
    }
    return policy.largeClearanceDiameterMilliInches;
  }
  return size <= policy.smallSizeMaximum ? policy.smallClearanceDiameterMilliInches
    : policy.largeClearanceDiameterMilliInches;
}

export function inspectOfficialLargeMovementSourceV1(state, piece) {
  getOfficialGroundSizeClearanceDiameterV13(piece);
  const profile = state.officialRosterDisclosureDataBundle?.unitCardInspectionProfiles
    .find(row => row.recordKey === piece.officialUnitRecordKey);
  const index = profile?.unitCardPayload?.upgrades?.findIndex(feature => feature.name === 'Large');
  const feature = profile?.unitCardPayload?.upgrades?.[index];
  const trait = piece.officialLargeMovementTrait;
  if (!trait || !profile || profile.sourceRecordHash !== piece.sourceRecordHash
    || profile.payloadHash !== piece.officialPayloadHash || !feature
    || hash({ recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash,
      payloadHash: profile.payloadHash, index, feature }) !== trait.sourceFeatureHash
    || !/If the Leading Model's path of travel passes through, or any model in this Unit ends its movement on a Size 0 or Size 1 Impassible Terrain piece \(excluding Tokens\) during any movement action, that terrain piece is immediately removed from the game\./u.test(feature.description)) {
    throw Error('SELECTED_SPATIAL_LARGE_TERRAIN_SOURCE_MISMATCH');
  }
  const route = state.officialCharacteristicStatusFamilySourceBundle?.routes.find(row =>
    row.recordKey === piece.officialUnitRecordKey && row.effectKind === 'large_movement');
  if (route && (route.sourceText !== feature.description || route.minimumGapMilliInches !== trait.minimumGapMilliInches
    || route.terrainKind !== 'impassable' || !isDeepStrictEqual(route.terrainSizes, [0, 1]) || route.tokensExcluded !== true)) {
    throw Error('SELECTED_SPATIAL_LARGE_TERRAIN_SOURCE_MISMATCH');
  }
  return { minimumGapMilliInches: trait.minimumGapMilliInches,
    sourceDefinitionId: route?.definitionId || null, canonicalSourceFeatureHash: route?.sourceFeatureHash || null,
    pieceTraitFeatureHash: trait.sourceFeatureHash, terrainKind: 'impassable', terrainSizes: [0, 1], tokensExcluded: true };
}

// Classify an unassisted ground traversal. Elevation/access-point exceptions
// belong to the caller and never change whether the final base can stand here.
const legacyRaptorStrain = Object.freeze({
  maximumImpassableTerrainSize: 4, mayChangeElevationWithoutAccessPoints: true,
});
const verifiedRaptorBundles = new WeakSet();

export function projectOfficialRaptorStrainTerrainPermissionV13(state, piece) {
  const release = state?.officialRosterDisclosureDataBundle?.sourceBinding;
  if (!release) {
    return piece.officialUnitRecordKey === 'army_units:kerrigan_swarm_raptor__zergling_' ? legacyRaptorStrain : null;
  }
  const bundle = state.officialCharacteristicStatusFamilySourceBundle;
  const route = bundle?.routes?.find(row => row.recordKey === piece.officialUnitRecordKey
    && row.effectKind === 'raptor_terrain_permission');
  if (!route || piece.specialAbilitiesSuppressedUntilRoundEnd === true) return null;
  if (bundle.schema !== 'starcraft_tmg_official_characteristic_status_family_source_bundle_v2'
    || bundle.sourceSnapshotHash !== release.sourceSnapshotHash || bundle.normalizedDatasetHash !== release.normalizedDatasetHash
    || route.activationKind !== 'passive' || route.maximumImpassableTerrainSize !== 4
    || route.mayChangeElevationWithoutAccessPoints !== true) {
    throw Error('OFFICIAL_RAPTOR_STRAIN_SOURCE_INVALID');
  }
  if (!verifiedRaptorBundles.has(bundle)) {
    const { bundleHash, ...body } = bundle;
    if (bundleHash !== hash(body)) throw Error('OFFICIAL_RAPTOR_STRAIN_SOURCE_INVALID');
    if (Object.isFrozen(bundle) && Object.isFrozen(bundle.routes) && bundle.routes.every(Object.isFrozen)) {
      verifiedRaptorBundles.add(bundle);
    }
  }
  return { ...legacyRaptorStrain, sourceDefinitionId: route.definitionId };
}

export function isOfficialGroundTerrainTraversalBlockedV13(
  piece, terrain, raptorStrain = projectOfficialRaptorStrainTerrainPermissionV13(null, piece),
) {
  const kind = String(terrain.terrainKind || 'ordinary').toLowerCase();
  if (kind === 'impassable') return !(raptorStrain && Number(terrain.size) <= raptorStrain.maximumImpassableTerrainSize);
  return kind === 'ordinary' && Number(terrain.size) >= 2;
}

