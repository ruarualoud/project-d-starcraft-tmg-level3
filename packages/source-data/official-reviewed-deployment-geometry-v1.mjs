import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';

const SCHEMA = 'starcraft_tmg_reviewed_deployment_geometry_v1';
const SHA256 = /^[a-f0-9]{64}$/u;
const scaleDimensions = { Skirmish: [36, 36], Standard: [54, 36] };
const scaleMarkers = { Skirmish: [1, 2, 5], Standard: [1, 2, 3, 4, 5] };

function fail(code, key = '') {
  throw Error(key ? code + ':' + key : code);
}

function validEntryEdges(edges, [width, height]) {
  return Array.isArray(edges) && edges.length > 0 && edges.every(edge => {
    if (!Array.isArray(edge) || edge.length !== 3) return false;
    const [side, start, end] = edge;
    const maximum = side === 'top' || side === 'bottom' ? width
      : side === 'left' || side === 'right' ? height : 0;
    return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end > start && end <= maximum;
  });
}

function validMarkers(markers, expected, [width, height]) {
  if (!Array.isArray(markers) || markers.length !== expected.length) return false;
  const numbers = new Set();
  const positions = new Set();
  for (const marker of markers) {
    if (!Array.isArray(marker) || marker.length !== 3) return false;
    const [number, x, y] = marker;
    if (!expected.includes(number) || !Number.isFinite(x) || !Number.isFinite(y)
      || x < 0 || x > width || y < 0 || y > height) return false;
    numbers.add(number);
    positions.add(x + ',' + y);
  }
  return numbers.size === markers.length && positions.size === markers.length;
}

export function readOfficialReviewedDeploymentGeometryV1({ dataset, releaseContext }) {
  const component = releaseContext?.manifest?.components?.deploymentCardGeometry;
  if (!component) return new Map();
  const { bundleHash, ...body } = releaseContext.resources?.deploymentCardGeometry ?? {};
  if (component.version !== '1.0.0' || component.integrity?.field !== 'bundleHash'
    || !SHA256.test(bundleHash ?? '') || component.integrity.value !== bundleHash
    || bundleHash !== hashStarcraftTmgContract(body)
    || body.schema !== SCHEMA || body.normalizedDatasetHash !== dataset.datasetHash
    || body.sourceSnapshotHash !== dataset.sourceSnapshotHash
    || !Array.isArray(body.cards) || !body.cards.length || body.trainingTruth !== false) {
    fail('DEPLOYMENT_CARD_GEOMETRY_SOURCE_BINDING_INVALID');
  }

  const byKey = new Map();
  for (const entry of body.cards) {
    const key = entry?.recordKey;
    const record = dataset.recordsByKey[key];
    const payload = record?.payload;
    const expectedDimensions = scaleDimensions[entry?.engagementScale];
    const expectedMarkers = scaleMarkers[entry?.engagementScale];
    const { evidence, geometry } = entry ?? {};
    if (!record || byKey.has(key) || record.authorityDisposition !== 'official_current_product_candidate'
      || payload?.type !== 'deployment' || payload?.isManual !== true
      || payload?.gameSize !== entry.engagementScale || record.sourceRecordHash !== entry.sourceRecordHash
      || record.payloadHash !== entry.payloadHash || !expectedDimensions
      || evidence?.frontReference !== payload.frontUrl || !SHA256.test(evidence?.sourceContentHash ?? '')
      || evidence?.method !== 'labelled_dimension_transcription'
      || typeof evidence?.sourceRef !== 'string' || !evidence.sourceRef.trim()
      || evidence?.reviewedOrientation !== 'card_title_upright') {
      fail('DEPLOYMENT_CARD_GEOMETRY_RECORD_INVALID', key);
    }

    if (!Array.isArray(geometry?.dimensions) || geometry.dimensions.length !== 2
      || !expectedDimensions.every((value, index) => geometry.dimensions[index] === value)
      || !validEntryEdges(geometry.red, expectedDimensions) || !validEntryEdges(geometry.blue, expectedDimensions)
      || !validMarkers(geometry.markers, expectedMarkers, expectedDimensions)) {
      fail('DEPLOYMENT_CARD_GEOMETRY_COORDINATES_INVALID', key);
    }
    byKey.set(key, { bundleHash, entryHash: hashStarcraftTmgContract(entry), evidence, geometry });
  }
  return byKey;
}
