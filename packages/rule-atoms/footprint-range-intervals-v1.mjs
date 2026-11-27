export const fullTurn = 2 * Math.PI;
export const arithmeticSlack = 1e-7;

export function transverseRoots(projection, perpendicular, radius) {
  if (Math.abs(perpendicular) > radius + arithmeticSlack) return [];
  const delta = Math.sqrt(Math.max(0, (radius - Math.abs(perpendicular)) * (radius + Math.abs(perpendicular))));
  return [projection - delta, projection + delta];
}

export function cosineOffsets(value) {
  if (Math.abs(value) > 1 + 1e-12) return [];
  const angle = Math.acos(Math.max(-1, Math.min(1, value)));
  return [angle, -angle];
}

export function coversIntervals(events, last, at, covered) {
  const boundaries = [0, ...events.filter(t => t > 0 && t < last).sort((a, b) => a - b), last];
  return boundaries.every((t, index) => covered(at(t))
    && (!index || covered(at((boundaries[index - 1] + t) / 2))));
}
