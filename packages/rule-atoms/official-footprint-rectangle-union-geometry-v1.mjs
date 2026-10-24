// Exact physical rectangle-union geometry shared by native terrain and Rules.
// Moved unchanged from the existing logical-surface geometry; no height,
// access permission, source inference or state mutation is decided here.
const TOLERANCE = 1;
const fail = (code, detail = "") => { throw new Error(`${code}${detail ? `:${detail}` : ""}`); };
function bounds(base) {
  if (base.shape === "round") return { minX: base.center.xMilliInches - base.radiusMilliInches,
    maxX: base.center.xMilliInches + base.radiusMilliInches,
    minY: base.center.yMilliInches - base.radiusMilliInches,
    maxY: base.center.yMilliInches + base.radiusMilliInches };
  if (base.shape !== "rectangle" || base.vertices?.length !== 4) fail("LOGICAL_SURFACE_BASE_UNSUPPORTED");
  return { minX: Math.min(...base.vertices.map(p => p.xMilliInches)),
    maxX: Math.max(...base.vertices.map(p => p.xMilliInches)),
    minY: Math.min(...base.vertices.map(p => p.yMilliInches)),
    maxY: Math.max(...base.vertices.map(p => p.yMilliInches)) };
}
function rectangle(row) {
  const r = row.footprint;
  if (r?.shape !== "axis_aligned_rectangle" || ![r.minXMilliInches, r.maxXMilliInches,
    r.minYMilliInches, r.maxYMilliInches].every(Number.isSafeInteger)
    || r.minXMilliInches >= r.maxXMilliInches || r.minYMilliInches >= r.maxYMilliInches) {
    fail("LOGICAL_SURFACE_RECTANGLE_INVALID", row.id);
  }
  return { minX: r.minXMilliInches, maxX: r.maxXMilliInches,
    minY: r.minYMilliInches, maxY: r.maxYMilliInches };
}
function complement(rects) {
  const box = { minX: Math.min(...rects.map(r => r.minX)), maxX: Math.max(...rects.map(r => r.maxX)),
    minY: Math.min(...rects.map(r => r.minY)), maxY: Math.max(...rects.map(r => r.maxY)) };
  const xs = [...new Set(rects.flatMap(r => [r.minX, r.maxX]))].sort((a, b) => a - b);
  const voids = [];
  for (let i = 1; i < xs.length; i += 1) {
    const minX = xs[i - 1]; const maxX = xs[i]; const middle = (minX + maxX) / 2;
    const intervals = rects.filter(r => r.minX < middle && r.maxX > middle)
      .map(r => [r.minY, r.maxY]).sort((a, b) => a[0] - b[0]);
    let y = box.minY;
    for (const [minY, maxY] of intervals) {
      if (minY > y) voids.push({ minX, maxX, minY: y, maxY: minY });
      y = Math.max(y, maxY);
    }
    if (y < box.maxY) voids.push({ minX, maxX, minY: y, maxY: box.maxY });
  }
  return { box, voids };
}
const pointRectDistance = (p, r) => Math.hypot(Math.max(r.minX - p.xMilliInches, 0, p.xMilliInches - r.maxX),
  Math.max(r.minY - p.yMilliInches, 0, p.yMilliInches - r.maxY));
function pointSegmentDistance(p, a, b) {
  const dx = b.xMilliInches - a.xMilliInches; const dy = b.yMilliInches - a.yMilliInches;
  const t = Math.max(0, Math.min(1, ((p.xMilliInches - a.xMilliInches) * dx
    + (p.yMilliInches - a.yMilliInches) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.xMilliInches - a.xMilliInches - t * dx, p.yMilliInches - a.yMilliInches - t * dy);
}
function segmentRectDistance(a, b, r) {
  const dx = b.xMilliInches - a.xMilliInches; const dy = b.yMilliInches - a.yMilliInches;
  let lo = 0; let hi = 1;
  let intersects = true;
  for (const [direction, offset] of [[-dx, a.xMilliInches - r.minX], [dx, r.maxX - a.xMilliInches],
    [-dy, a.yMilliInches - r.minY], [dy, r.maxY - a.yMilliInches]]) {
    if (direction === 0) { if (offset < 0) intersects = false; continue; }
    const ratio = offset / direction;
    if (direction < 0) lo = Math.max(lo, ratio); else hi = Math.min(hi, ratio);
    if (lo > hi) intersects = false;
  }
  if (intersects) return 0;
  return Math.min(pointRectDistance(a, r), pointRectDistance(b, r),
    ...[[r.minX, r.minY], [r.maxX, r.minY], [r.maxX, r.maxY], [r.minX, r.maxY]]
      .map(([xMilliInches, yMilliInches]) => pointSegmentDistance({ xMilliInches, yMilliInches }, a, b)));
}
function hull(points) {
  const ordered = [...new Map(points.map(p => [`${p.xMilliInches}:${p.yMilliInches}`, p])).values()]
    .sort((a, b) => a.xMilliInches - b.xMilliInches || a.yMilliInches - b.yMilliInches);
  const cross = (o, a, b) => (a.xMilliInches - o.xMilliInches) * (b.yMilliInches - o.yMilliInches)
    - (a.yMilliInches - o.yMilliInches) * (b.xMilliInches - o.xMilliInches);
  const half = rows => { const out = []; for (const p of rows) {
    while (out.length >= 2 && cross(out.at(-2), out.at(-1), p) <= 0) out.pop(); out.push(p);
  } return out; };
  return [...half(ordered).slice(0, -1), ...half([...ordered].reverse()).slice(0, -1)];
}
function polygonOverlapsRect(vertices, r) {
  const corners = [[r.minX, r.minY], [r.maxX, r.minY], [r.maxX, r.maxY], [r.minX, r.maxY]]
    .map(([xMilliInches, yMilliInches]) => ({ xMilliInches, yMilliInches }));
  const axes = [[1, 0], [0, 1], ...vertices.map((p, i) => {
    const q = vertices[(i + 1) % vertices.length]; return [-(q.yMilliInches - p.yMilliInches), q.xMilliInches - p.xMilliInches];
  })];
  return axes.every(([x, y]) => {
    const length = Math.hypot(x, y); if (!length) return true;
    const a = vertices.map(p => (p.xMilliInches * x + p.yMilliInches * y) / length);
    const b = corners.map(p => (p.xMilliInches * x + p.yMilliInches * y) / length);
    return Math.min(Math.max(...a), Math.max(...b)) - Math.max(Math.min(...a), Math.min(...b)) > TOLERANCE;
  });
}
function coversPath(rects, bases, prepared = complement(rects)) {
  const { box, voids } = prepared;
  if (bases.some(base => { const b = bounds(base); return b.minX < box.minX - TOLERANCE
    || b.maxX > box.maxX + TOLERANCE || b.minY < box.minY - TOLERANCE || b.maxY > box.maxY + TOLERANCE; })) return false;
  const pairs = bases.length === 1 ? [[bases[0], bases[0]]] : bases.slice(1).map((b, i) => [bases[i], b]);
  return pairs.every(([a, b]) => {
    if (a.shape !== b.shape || a.widthMilliInches !== b.widthMilliInches || a.depthMilliInches !== b.depthMilliInches
      || a.shape === "rectangle" && a.rotationDegrees !== b.rotationDegrees) fail("LOGICAL_SURFACE_RIGID_SWEEP_REQUIRED");
    return a.shape === "round" ? voids.every(r => segmentRectDistance(a.center, b.center, r) >= a.radiusMilliInches - TOLERANCE)
      : voids.every(r => !polygonOverlapsRect(hull([...a.vertices, ...b.vertices]), r));
  });
}


export function officialRectangleUnionCoversBasesV1(cells, bases) {
  return coversPath(cells.map(footprint => rectangle({ footprint })), bases);
}

// Prepare one union for many queries without changing its exact predicate.
export function createOfficialRectangleUnionCoverageV1(cells) {
  const rects = cells.map(footprint => rectangle({ footprint }));
  if (!rects.length) fail("TERRAIN_UNION_CELLS_REQUIRED");
  const prepared = complement(rects);
  return Object.freeze({ coversBases: bases => coversPath(rects, bases, prepared) });
}

export function normalizeOfficialRectangleUnionFootprintCellsV1(cells, envelope) {
  if (!Array.isArray(cells) || !cells.length) fail("TERRAIN_UNION_CELLS_REQUIRED");
  const parsed = cells.map(footprint => {
    const r = rectangle({ footprint });
    return { shape: "axis_aligned_rectangle", minXMilliInches: r.minX, maxXMilliInches: r.maxX,
      minYMilliInches: r.minY, maxYMilliInches: r.maxY };
  }).sort((a,b) => a.minXMilliInches-b.minXMilliInches || a.minYMilliInches-b.minYMilliInches
    || a.maxXMilliInches-b.maxXMilliInches || a.maxYMilliInches-b.maxYMilliInches);
  const actual = { minXMilliInches: Math.min(...parsed.map(r=>r.minXMilliInches)),
    maxXMilliInches: Math.max(...parsed.map(r=>r.maxXMilliInches)),
    minYMilliInches: Math.min(...parsed.map(r=>r.minYMilliInches)),
    maxYMilliInches: Math.max(...parsed.map(r=>r.maxYMilliInches)) };
  if (Object.keys(actual).some(k=>actual[k]!==envelope[k])) fail("TERRAIN_UNION_ENVELOPE_MISMATCH");
  for (let i=0;i<parsed.length;i+=1) for(let j=i+1;j<parsed.length
    && parsed[j].minXMilliInches<parsed[i].maxXMilliInches;j+=1) {
    if(parsed[j].minYMilliInches<parsed[i].maxYMilliInches
      && parsed[j].maxYMilliInches>parsed[i].minYMilliInches) fail("TERRAIN_UNION_CELL_INTERIOR_OVERLAP");
  }
  return parsed;
}
