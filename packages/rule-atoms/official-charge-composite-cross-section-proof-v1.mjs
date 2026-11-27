import { projectOfficialRaptorStrainTerrainPermissionV13 } from './official-movement-clearance-contract-v13.mjs';
import { createOfficialGroundEngagementShadowCoverV2 } from './official-engagement-graph-v2.mjs';
// Sufficient Rules proof, not a finite formation search. Every continuous ground
// path crosses a certified occupied horizontal interval. A complete integer
// endpoint cover excludes every target-engaging endpoint on the start side.
// Shrink blockers / enlarge engagement; omitted constraints only enlarge paths.
import { evaluateOfficialChargeMultiCutDistanceProofV1 } from
  './official-charge-multi-cut-distance-proof-v1.mjs';
const SAFETY = 2;
const MAX_COVER_CELLS = 200000;
const ALGORITHM = "flat_composite_cross_section_v2";
const milli = value => Math.round(Number(value) * 1000);
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true;
const models = piece => (piece?.models || []).filter(model =>
  model.isOnField !== false && model.isDestroyed !== true);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function round(model) {
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches ?? model?.baseWidthInches);
  const x = milli(model?.xInches), y = milli(model?.yInches);
  return model?.baseShape === "round" && model.elevation === "ground"
    && [width, depth, x, y].every(Number.isSafeInteger) && width > 0 && width === depth
    ? { id: model.id, x, y, radiusFloor: Math.floor(width / 2), radiusCeil: Math.ceil(width / 2) }
    : null;
}
function rectDistance(x, y, r) {
  return Math.hypot(Math.max(r.minX - x, x - r.maxX, 0),
    Math.max(r.minY - y, y - r.maxY, 0));
}
function nearestDistance(point, cell) { return rectDistance(point.x, point.y, cell); }
function farthestDistance(point, cell) {
  return Math.hypot(Math.max(Math.abs(cell.minX - point.x), Math.abs(cell.maxX - point.x)),
    Math.max(Math.abs(cell.minY - point.y), Math.abs(cell.maxY - point.y)));
}
function terrainBlockers(state, leader, unconditionalOnly = false) {
  return (state.board?.terrain || []).filter(t => t.isRemoved !== true && t.isDestroyed !== true
    && (unconditionalOnly ? t.terrainKind === "impassable"
      : t.terrainKind === "ordinary" && Number(t.size) >= 2)
    && t.standableHorizontalSurface !== true && !(t.openings || []).length
    && !(t.setupAgreement?.openings || []).length && !(t.accessPoints || []).length)
    .flatMap(t => {
      const f = t.footprint;
      if (f?.shape !== "axis_aligned_rectangle") return [];
      const r = { minX: f.minXMilliInches, maxX: f.maxXMilliInches,
        minY: f.minYMilliInches, maxY: f.maxYMilliInches };
      if (!Object.values(r).every(Number.isSafeInteger) || r.minX >= r.maxX || r.minY >= r.maxY) return [];
      return [{ id: t.id, rectangle: r, clearance: leader.radiusFloor - SAFETY }];
    });
}
function cutIntervals(blockers, y) {
  const intervals = blockers.flatMap(b => {
    const dy = b.rectangle ? Math.max(b.rectangle.minY - y, y - b.rectangle.maxY, 0)
      : Math.abs(b.center.y - y);
    if (b.clearance <= 0 || dy >= b.clearance) return [];
    const dx = Math.sqrt(b.clearance ** 2 - dy ** 2);
    // Rounding inward preserves a subset of the strictly forbidden interval.
    const left = Math.ceil((b.rectangle ? b.rectangle.minX : b.center.x) - dx);
    const right = Math.floor((b.rectangle ? b.rectangle.maxX : b.center.x) + dx);
    return left < right ? [{ left, right, ids: [b.id] }] : [];
  }).sort((a, b) => a.left - b.left || a.right - b.right);
  const union = [];
  for (const interval of intervals) {
    const last = union.at(-1);
    // Require strict overlap: two open blockers touching do not seal a passage.
    if (!last || interval.left >= last.right) union.push(interval);
    else { last.right = Math.max(last.right, interval.right); last.ids.push(...interval.ids); }
  }
  return union;
}
function cellBlocked(cell, blockers) {
  for (const b of blockers) {
    const bound = b.rectangle
      ? Math.max(...[cell.minX, cell.maxX].flatMap(x => [cell.minY, cell.maxY]
        .map(y => rectDistance(x, y, b.rectangle))))
      : farthestDistance(b.center, cell);
    if (bound < b.clearance - 0.1) return true;
  }
  return false;
}
function coverStartSide(target, radius, y, above, blockers, movement = null, shadowCover = null) {
  const initial = { minX: Math.floor(target.x - radius), maxX: Math.ceil(target.x + radius),
    minY: Math.floor(target.y - radius), maxY: Math.ceil(target.y + radius) };
  if (Number.isFinite(y)) {
    if (above) initial.minY = Math.max(initial.minY, y);
    else initial.maxY = Math.min(initial.maxY, y);
  }
  if (initial.minY > initial.maxY) return { complete: true, examinedCells: 0 };
  const nearby = blockers.filter(b => b.rectangle
    ? !(b.rectangle.maxX + b.clearance < initial.minX || b.rectangle.minX - b.clearance > initial.maxX
      || b.rectangle.maxY + b.clearance < initial.minY || b.rectangle.minY - b.clearance > initial.maxY)
    : nearestDistance(b.center, initial) <= b.clearance);
  const queue = [initial];
  let examinedCells = 0;
  const engagementOccluderIds = new Set();
  while (queue.length && examinedCells < MAX_COVER_CELLS) {
    const cell = queue.pop(); examinedCells++;
    if (nearestDistance(target, cell) > radius + 0.1
      || (movement && nearestDistance(movement.start, cell) > movement.limit)
      || cellBlocked(cell, nearby)) continue;
    const occluder = shadowCover?.(cell);
    if (occluder) { engagementOccluderIds.add(occluder); continue; }
    if (cell.minX === cell.maxX && cell.minY === cell.maxY) return { complete: false, examinedCells };
    const axis = cell.maxX - cell.minX >= cell.maxY - cell.minY ? "X" : "Y";
    const middle = Math.floor((cell[`min${axis}`] + cell[`max${axis}`]) / 2);
    queue.push({ ...cell, [`min${axis}`]: middle + 1 }, { ...cell, [`max${axis}`]: middle });
  }
  return { complete: queue.length === 0, examinedCells, engagementOccluderIds: [...engagementOccluderIds].sort() };
}

function createChargeProofGeometry(state, pending, unconditionalOnly, endpointOnly = false) {
  const unresolved = reason => ({ ok: false, reason });
  if (pending?.stage !== "resolve_charge_after_roll" || pending.chargePlan?.targets?.length !== 1)
    return unresolved("unsupported_pending_or_target_count");
  const actor = (state.pieces || []).find(p => p.id === pending.pieceId);
  const enemy = (state.pieces || []).find(p => p.id === pending.chargePlan.targets[0].unitId);
  const leader = round(models(actor).find(m => m.id === pending.chargePlan.leadingModelId));
  const maximum = pending.maxDistanceMilliInches;
  if (!active(actor) || !active(enemy) || actor.sideKey === enemy.sideKey || !leader
    || !Number.isSafeInteger(maximum) || maximum <= 0
    || (actor.combatTags || []).some(t => String(t).toLowerCase() === "flying"))
    return unresolved("unsupported_leader_or_distance");
  // This proof is only for a flat no-port board. A route over/through a surface
  // must not be falsely excluded by its ground projection.
  // Raptor Strain crosses IMPASSABLE terrain and changes elevation without an
  // access point. Neither is excluded here: terrainBlockers admits only ordinary
  // non-standable terrain, and the guard below rejects alternate elevations.
  // Excluding Raptor by name therefore hid valid flat-board proofs from both
  // pre-declaration queries and the identical post-roll resolution evaluator.
  if (!unconditionalOnly && ((state.board?.accessPoints || []).length || (state.board?.surfaces || []).length
    || (state.board?.terrain || []).some(t => t.isRemoved !== true && t.isDestroyed !== true
      && (t.standableHorizontalSurface === true || (t.accessPoints || []).length))))
    return unresolved("alternate_elevation_routes_not_covered");
  // Native specialTerrainResult always rejects a swept impassable footprint,
  // at every elevation, except Raptor Strain. Omit ALL ordinary terrain and
  // access restrictions here: their removal only enlarges the path domain.
  // This is a distinct relaxed cover, not permission to flatten a high surface.
  if (unconditionalOnly && !endpointOnly && projectOfficialRaptorStrainTerrainPermissionV13(state, actor))
    return unresolved("impassable_crossing_ability_not_covered");
  const targets = models(enemy).map(round);
  if (!targets.length || targets.some(t => !t)) return unresolved("unsupported_target_geometry");
  const blockers = (state.pieces || []).filter(p => p.id !== actor.id && active(p)
    && !(p.combatTags || []).some(t => String(t).toLowerCase() === "flying"))
    .flatMap(models).map(round).filter(Boolean).map(m => ({ id: m.id, center: m,
      clearance: leader.radiusFloor + m.radiusFloor - SAFETY }))
    .concat(terrainBlockers(state, leader, unconditionalOnly)
      // A composite contour's outer rectangle may contain passable holes; a
      // logical surface can support endpoints across member cells. Omit those
      // terrains in the endpoint-only relaxation, never turn their hull into
      // a collision fact. Individual native rectangles remain exact blockers.
      .filter(b => !endpointOnly || !(state.board?.terrain || []).some(t =>
        t.id === b.id && ((t.footprintCells || []).length || t.terrainGroupId))));
  return {ok:true,actor,enemy,leader,maximum,targets,blockers,pending};
}

export function createOfficialChargeFlatProofGeometryV1(state, pending = state?.pendingAction) {
  return createChargeProofGeometry(state, pending, false);
}

export function createOfficialChargeUnconditionalProofGeometryV1(state, pending = state?.pendingAction) {
  return createChargeProofGeometry(state, pending, true);
}

// Raptor can CROSS an impassable feature, but Native still rejects an endpoint
// base overlapping an unsupported feature. Prove only the endpoint domain:
// omit every route restriction, ordinary/high surface, elevation cost and LOS.
// If even this enlarged domain is covered, no legal path can finish in range.
export function evaluateOfficialChargeEndpointCoverProofV1(state, pending = state?.pendingAction) {
  const geometry = createChargeProofGeometry(state, pending, true, true);
  if (!geometry.ok) return { allLegalChargePathsExcluded: false, reason: geometry.reason };
  const { enemy, leader, maximum, targets, blockers } = geometry;
  const targetCertificates = [];
  for (const target of targets) {
    const cover = coverStartSide(target, leader.radiusCeil + target.radiusCeil + 1002,
      null, false, blockers, { start: leader, limit: maximum + SAFETY });
    if (!cover.complete) return { allLegalChargePathsExcluded: false,
      reason: `unresolved_endpoint:${target.id}`, examinedEndpointCells: cover.examinedCells };
    targetCertificates.push({ targetModelId: target.id,
      proof: 'occupied_reachable_endpoint_cover',
      lowerBoundMilliInches: maximum + SAFETY,
      reachableEngagementIntegerEndpointCoverComplete: true,
      endpointCoverMoveLimitMilliInches: maximum + SAFETY,
      examinedEndpointCells: cover.examinedCells });
  }
  return { allLegalChargePathsExcluded: true, algorithmVersion: 'endpoint_complete_cover_v1',
    certificateKind: 'occupied_cross_section_distance_shortfall', leadingModelId: leader.id,
    declaredTargetUnitId: enemy.id, declaredTargetModelId: pending.chargePlan.targets[0].modelId,
    allActiveTargetModelsCovered: true, targetCertificates,
    maximumChargeDistanceMilliInches: maximum, integerEndpointContract: true,
    terrainTraversalRestricted: false, omittedConstraintsCanOnlyEnlargeDomain: true,
    rulesTruth: 'official_charge_endpoint_base_collision_and_distance', trainingTruth: false };
}

export function evaluateOfficialChargeCompositeCrossSectionProofV1(state,pending=state?.pendingAction) {
  const geometry=createOfficialChargeFlatProofGeometryV1(state,pending);
  if(!geometry.ok)return {allLegalChargePathsExcluded:false,reason:geometry.reason};
  const {actor,enemy,leader,maximum,targets,blockers}=geometry;
  const unresolved=reason=>({allLegalChargePathsExcluded:false,reason});
  const certificates = [];
  for (const target of targets) {
    const shadowCover = createOfficialGroundEngagementShadowCoverV2(state, target.id);
    const radius = leader.radiusCeil + target.radiusCeil + 1002;
    const direct = Math.floor(distance(leader, target) - radius - SAFETY);
    if (direct > maximum + 2) {
      certificates.push({ targetModelId: target.id, proof: "direct_distance", lowerBoundMilliInches: direct });
      continue;
    }
    let certificate = null;
    // Sampling only chooses a possible CUT, never declares endpoint coverage.
    // Each chosen cut must subsequently prove the entire endpoint domain.
    for (let y = Math.ceil(Math.min(leader.y, target.y) / 1000) * 1000;
      y < Math.max(leader.y, target.y); y += 1000) {
      if (y === leader.y) continue;
      for (const interval of cutIntervals(blockers, y)) {
        if (leader.x < interval.left || leader.x > interval.right
          || target.x < interval.left || target.x > interval.right) continue;
        const at = x => Math.hypot(x - leader.x, y - leader.y)
          + Math.max(0, Math.hypot(x - target.x, y - target.y) - radius);
        const bound = Math.floor(Math.min(at(interval.left), at(interval.right)) - SAFETY);
        if (bound <= maximum + 2) continue;
        const cover = coverStartSide(target, radius, y, leader.y > y, blockers, null, shadowCover);
        if (!cover.complete) continue;
        certificate = { targetModelId: target.id, proof: "composite_occupied_cross_section",
          cutYMilliInches: y, conservativeForbiddenXMilliInches: [interval.left, interval.right],
          blockerIds: [...new Set(interval.ids)].sort(), lowerBoundMilliInches: bound,
          startSideIntegerEndpointCoverComplete: true, examinedEndpointCells: cover.examinedCells,
          engagementOccluderIds: cover.engagementOccluderIds || [] };
        break;
      }
      if (certificate) break;
    }
    if (!certificate) {
      // A reachable engagement lens can be entirely occupied even when no
      // sampled horizontal cut has a sufficient detour lower bound. Cover
      // EVERY integer endpoint, not sampled formation anchors. The generous
      // maximum+2 disk contains every path accepted by rounded max+1 Rules;
      // shrunk blocker interiors and omitted constraints only enlarge it.
      const cover = coverStartSide(target, radius, null, false, blockers,
        { start: leader, limit: maximum + SAFETY }, shadowCover);
      if (cover.complete) {
        certificate = { targetModelId: target.id,
          proof: "occupied_reachable_endpoint_cover",
          lowerBoundMilliInches: maximum + SAFETY,
          reachableEngagementIntegerEndpointCoverComplete: true,
          endpointCoverMoveLimitMilliInches: maximum + SAFETY,
          examinedEndpointCells: cover.examinedCells,
          engagementOccluderIds: cover.engagementOccluderIds || [] };
      } else {
        const multiCut = evaluateOfficialChargeMultiCutDistanceProofV1({
          leader, target, blockers, maximum });
        if (!multiCut) return unresolved(`unresolved_target:${target.id}`);
        certificate = { targetModelId: target.id, ...multiCut };
      }
    }
    certificates.push(certificate);
  }
  return { allLegalChargePathsExcluded: true, algorithmVersion: ALGORITHM,
    certificateKind: "occupied_cross_section_distance_shortfall", leadingModelId: leader.id,
    declaredTargetUnitId: enemy.id, declaredTargetModelId: pending.chargePlan.targets[0].modelId,
    allActiveTargetModelsCovered: true, targetCertificates: certificates,
    maximumChargeDistanceMilliInches: maximum, integerEndpointContract: true,
    omittedConstraintsCanOnlyEnlargeDomain: true,
    rulesTruth: "official_charge_path_length_and_model_base_collision", trainingTruth: false };
}
