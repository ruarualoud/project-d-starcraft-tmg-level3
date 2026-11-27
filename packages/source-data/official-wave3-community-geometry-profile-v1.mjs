import { createHash } from 'node:crypto';
import { types } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { readMeasuredFootprintContourV1 } from '../rule-atoms/measured-footprint-contour-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';

const schema = 'starcraft_tmg_wave3_community_geometry_v1';
const positiveSize = value => Number.isFinite(value) && value >= 1 && value <= 1000;
const sourceHashPattern = /^[a-f0-9]{64}$/u;
const milliInches = value => Math.round(value * 1000 / 25.4);

function validateSettings(settings) {
  const { raven, stormMarker, stormBlast } = settings || {};
  if (!settings?.revision || !raven?.sourceUrls?.length || !stormMarker?.sourceUrls?.length
    || !stormBlast?.sourceUrls?.length || !positiveSize(raven.widthMm) || !positiveSize(raven.depthMm)
    || (raven.horizontalArmDepthMm !== null && (!positiveSize(raven.horizontalArmDepthMm)
      || raven.horizontalArmDepthMm >= raven.depthMm))
    || (raven.verticalArmWidthMm !== null && (!positiveSize(raven.verticalArmWidthMm)
      || raven.verticalArmWidthMm >= raven.widthMm))
    || (stormMarker.diameterMm !== null && !positiveSize(stormMarker.diameterMm))
    || !Object.hasOwn(stormBlast.diametersMm || {}, stormBlast.selected)
    || !Object.values(stormBlast.diametersMm).every(positiveSize)
    || (stormMarker.diameterMm !== null && stormMarker.diameterMm >= stormBlast.diametersMm[stormBlast.selected])) {
    throw Error('WAVE3_COMMUNITY_GEOMETRY_SETTINGS_INVALID');
  }
  if (raven.measurement !== undefined) {
    const { shape, kind, ref, sha256 } = raven.measurement ?? {};
    if (!['orthogonal_cross', 'measured_contour'].includes(shape)
      || !['direct_measurement', 'calibrated_bottom_view', 'engineering_control', 'annotated_assembly_estimate'].includes(kind)
      || (kind === 'annotated_assembly_estimate' && shape !== 'measured_contour')
      || typeof ref !== 'string' || !ref.trim() || !sourceHashPattern.test(sha256)) {
      throw Error('WAVE3_COMMUNITY_RAVEN_OUTLINE_EVIDENCE_INVALID');
    }
    if (shape === 'measured_contour') {
      if (raven.horizontalArmDepthMm !== null || raven.verticalArmWidthMm !== null) {
        throw Error('WAVE3_COMMUNITY_RAVEN_OUTLINE_EVIDENCE_INVALID');
      }
      return readMeasuredFootprintContourV1(raven.localVerticesMilliInches,
        milliInches(raven.widthMm), milliInches(raven.depthMm));
    }
    if (raven.horizontalArmDepthMm === null || raven.verticalArmWidthMm === null) {
      throw Error('WAVE3_COMMUNITY_RAVEN_OUTLINE_EVIDENCE_INVALID');
    }
  }
  if (raven.localVerticesMilliInches !== undefined) {
    throw Error('WAVE3_COMMUNITY_RAVEN_OUTLINE_EVIDENCE_INVALID');
  }
  return null;
}

export function createOfficialWave3CommunityGeometryV1({ context, settings, ravenContourSourceBytes }) {
  assertOfficialReleaseSourceV2(context, context || {});
  const contour = validateSettings(settings);
  const boundSettings = structuredClone(settings);
  if (contour) {
    if (!types.isUint8Array(ravenContourSourceBytes)
      || createHash('sha256').update(ravenContourSourceBytes).digest('hex') !== settings.raven.measurement.sha256) {
      throw Error('WAVE3_COMMUNITY_RAVEN_OUTLINE_SOURCE_MISMATCH');
    }
    boundSettings.raven.localVerticesMilliInches = contour;
  }
  const body = { schema, sourceSnapshotHash: context.snapshot.snapshotHash, sourceDatasetHash: context.dataset.datasetHash,
    authority: 'community_geometry_candidate', settings: boundSettings };
  return { ...body, profileHash: hash(body) };
}

export function getOfficialReleaseWave3CommunityGeometryV1(context) {
  const manifest = assertOfficialReleaseSourceV2(context, context || {});
  const binding = manifest.components.wave3CommunityGeometry;
  if (!binding) return null;
  const { profileHash, ...body } = context.resources?.wave3CommunityGeometry || {};
  if (body.schema !== schema || body.sourceSnapshotHash !== manifest.source.snapshotHash
    || body.sourceDatasetHash !== manifest.source.datasetHash || body.authority !== 'community_geometry_candidate'
    || binding.integrity?.field !== 'profileHash' || profileHash !== binding.integrity.value || profileHash !== hash(body)) {
    throw Error('WAVE3_COMMUNITY_GEOMETRY_RELEASE_MISMATCH');
  }
  validateSettings(body.settings);
  return context.resources.wave3CommunityGeometry;
}
