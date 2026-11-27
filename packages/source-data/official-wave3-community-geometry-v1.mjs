import { createOfficialPhysicalFootprintV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
export { createOfficialWave3CommunityGeometryV1, getOfficialReleaseWave3CommunityGeometryV1 }
  from './official-wave3-community-geometry-profile-v1.mjs';

const milliInches = value => Math.round(value * 1000 / 25.4);

export function describeOfficialWave3StormGeometryV1(profile, componentKind) {
  const { stormBlast, stormMarker } = profile.settings;
  if (componentKind === 'psionic_storm') {
    return { diameterMm: stormMarker.diameterMm, sourceUrls: stormMarker.sourceUrls };
  }
  if (componentKind === 'psionic_storm_blast_template') {
    return { diameterMm: stormBlast.diametersMm[stormBlast.selected], sourceUrls: stormBlast.sourceUrls };
  }
  throw Error('WAVE3_COMMUNITY_STORM_COMPONENT_INVALID');
}

export function createOfficialWave3StormCommunityFootprintV1({ profile, componentKind, center }) {
  const { diameterMm } = describeOfficialWave3StormGeometryV1(profile, componentKind);
  if (diameterMm === null) throw Error('WAVE3_COMMUNITY_STORM_MARKER_DIAMETER_REQUIRED');
  const widthMilliInches = milliInches(diameterMm);
  return createOfficialPhysicalFootprintV1({ objectId: componentKind, kind: componentKind === 'psionic_storm'
    ? 'battlefield_token' : 'weapon_template', shape: 'round', center, widthMilliInches, depthMilliInches: widthMilliInches });
}

export function createOfficialWave3RavenCommunityFootprintV1({ profile, objectId, center, rotationDegrees = 0 }) {
  const raven = profile.settings.raven;
  if (raven.measurement?.shape === 'measured_contour') {
    return createOfficialPhysicalFootprintV1({ objectId, kind: 'model_base', shape: 'measured_contour', center, rotationDegrees,
      widthMilliInches: milliInches(raven.widthMm), depthMilliInches: milliInches(raven.depthMm),
      localVerticesMilliInches: raven.localVerticesMilliInches });
  }
  if (raven.horizontalArmDepthMm === null || raven.verticalArmWidthMm === null) {
    throw Error('WAVE3_COMMUNITY_RAVEN_ARM_DIMENSIONS_REQUIRED');
  }
  return createOfficialPhysicalFootprintV1({ objectId, kind: 'model_base', shape: 'orthogonal_cross', center, rotationDegrees,
    widthMilliInches: milliInches(raven.widthMm), depthMilliInches: milliInches(raven.depthMm),
    horizontalArmDepthMilliInches: milliInches(raven.horizontalArmDepthMm),
    verticalArmWidthMilliInches: milliInches(raven.verticalArmWidthMm) });
}
