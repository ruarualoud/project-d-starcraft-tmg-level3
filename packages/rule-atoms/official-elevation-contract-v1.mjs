const aliases = Object.freeze({
  ground_level: 'ground',
  mid_ground: 'mid',
  high_ground: 'high',
  middle: 'mid',
});

// Preserve unknown values for each caller's existing domain-specific rejection.
// Optional-value defaults remain the responsibility of the consuming contract.
export function normalizeOfficialElevationV1(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return aliases[normalized] || normalized;
}
