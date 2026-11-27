import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialPhysicalFootprintV1, createOfficialModelBaseFootprintV1,
  createOfficialBattlefieldTokenPhysicalFootprintV1,
   evaluateOfficialPhysicalFootprintRelationV1, officialTerrainBlocksModelPlacementV1, createOfficialTerrainCellFootprintsV1,
  OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 as collisionTolerance }
  from './official-model-base-geometry-rules-kernel-v1.mjs';
import { verifyOfficialBattlefieldTokenV1 } from './official-battlefield-token-marker-rules-kernel-v1.mjs';

const version = '1.0.0';
const tolerance = 1;
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const active = piece => piece.isOnField === true && piece.isDestroyed !== true;
const live = model => model.isDestroyed !== true && model.isOnField !== false;

export { getOfficialDisplacementMovementGeometryV1 } from './official-displacement-movement-geometry-v1.mjs';

export function validateOfficialDisplacementChoicesV1(value) {
  if (!Array.isArray(value) || value.some(row => !row || Object.keys(row).sort().join(',') !== 'coordinate,tokenId'
    || typeof row.tokenId !== 'string' || !row.coordinate
    || Object.keys(row.coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
    || !Number.isSafeInteger(row.coordinate.xMilliInches) || !Number.isSafeInteger(row.coordinate.yMilliInches))
    || new Set(value.map(row => row.tokenId)).size !== value.length) throw Error('PSIONIC_DISPLACEMENT_CHOICES_INVALID');
  return structuredClone(value);
}

export function createOfficialDisplacementTokenFootprintV1(token, coordinate = token.coordinate) {
  return createOfficialBattlefieldTokenPhysicalFootprintV1({ ...token, coordinate });
}

export function createOfficialTokenDisplacementSceneV1({ state, pieceId, movementGeometry, tokenId, policyHash }) {
  const actor = state.pieces.find(piece => piece.id === pieceId);
  const token = state.board.tokens.find(row => row.tokenId === tokenId);
  if (!actor || !movementGeometry?.leadingModelId || !Array.isArray(movementGeometry.finalModelPositions)
    || !token || token.baseShape !== 'round' || !policyHash) throw Error('TOKEN_DISPLACEMENT_SCENE_INVALID');
  verifyOfficialBattlefieldTokenV1(token, state.officialBattlefieldTokenMarkerRegistry);
  const positions = new Map(movementGeometry.finalModelPositions.map(row => [row.modelId, row]));
  if (positions.size !== movementGeometry.finalModelPositions.length) throw Error('TOKEN_DISPLACEMENT_DUPLICATE_MODEL');
  const modelObstacles = state.pieces.filter(piece => active(piece) || piece.id === pieceId).flatMap(piece =>
    piece.models.filter(model => live(model) || piece.id === pieceId && positions.has(model.id)).map(model => {
      const position = piece.id === pieceId ? positions.get(model.id) : undefined;
      if (piece.id === pieceId && !position) throw Error('TOKEN_DISPLACEMENT_ALL_MODELS_REQUIRED');
      return createOfficialModelBaseFootprintV1({ piece, model, position, dataBundle: state.officialModelBaseGeometryDataBundle });
    }));
  const leading = modelObstacles.find(row => row.unitId === pieceId && row.objectId === movementGeometry.leadingModelId);
  if (!leading) throw Error('TOKEN_DISPLACEMENT_LEADING_MODEL_REQUIRED');
  if (!evaluateOfficialPhysicalFootprintRelationV1({ left: leading, right: createOfficialDisplacementTokenFootprintV1(token) }).overlappingInteriors) {
    throw Error('TOKEN_DISPLACEMENT_LEADING_OVERLAP_REQUIRED');
  }
  const tokenObstacles = state.board.tokens.filter(row => !row.isRemoved && row.tokenId !== tokenId).map(row => {
    verifyOfficialBattlefieldTokenV1(row, state.officialBattlefieldTokenMarkerRegistry);
    return createOfficialDisplacementTokenFootprintV1(row);
  });
  const terrainObstacles = state.board.terrain.filter(row => !row.isRemoved && officialTerrainBlocksModelPlacementV1(row)).flatMap(row => {
    const rectangle = row.footprint;
    if (rectangle?.shape !== 'axis_aligned_rectangle') throw Error('TOKEN_DISPLACEMENT_TERRAIN_GEOMETRY_UNSUPPORTED');
    return createOfficialTerrainCellFootprintsV1(row);
  });
  return seal({ schema: 'starcraft_tmg_token_displacement_scene_v1', version, policyHash,
    coordinateQuantumMilliInches: 1, widthMilliInches: Math.round(state.board.widthInches * 1000),
    heightMilliInches: Math.round(state.board.heightInches * 1000),
    token: createOfficialDisplacementTokenFootprintV1(token), leading,
    obstacles: [...modelObstacles, ...tokenObstacles, ...terrainObstacles].sort((a, b) => a.objectId.localeCompare(b.objectId)),
    originalTokenHash: token.tokenHash, pieceId, trainingTruth: false }, 'sceneHash');
}

function bounds(footprint) {
  const { center, radiusMilliInches: radius } = footprint;
  return footprint.shape === 'round' ? {
    minX: center.xMilliInches - radius, maxX: center.xMilliInches + radius,
    minY: center.yMilliInches - radius, maxY: center.yMilliInches + radius,
  } : { minX: Math.min(...footprint.vertices.map(p => p.xMilliInches)), maxX: Math.max(...footprint.vertices.map(p => p.xMilliInches)),
    minY: Math.min(...footprint.vertices.map(p => p.yMilliInches)), maxY: Math.max(...footprint.vertices.map(p => p.yMilliInches)) };
}
function pointDistance(point, footprint) {
  const x = point.xMilliInches;
  const y = point.yMilliInches;
  if (footprint.shape === 'round') return Math.max(0, Math.hypot(x - footprint.center.xMilliInches, y - footprint.center.yMilliInches) - footprint.radiusMilliInches);
  let minimum = Infinity;
  let positive = false;
  let negative = false;
  const vertices = footprint.vertices;
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    const dx = b.xMilliInches - a.xMilliInches;
    const dy = b.yMilliInches - a.yMilliInches;
    const cross = dx * (y - a.yMilliInches) - dy * (x - a.xMilliInches);
    positive ||= cross > 0;
    negative ||= cross < 0;
    const projection = Math.max(0, Math.min(1, ((x - a.xMilliInches) * dx + (y - a.yMilliInches) * dy) / (dx * dx + dy * dy)));
    minimum = Math.min(minimum, Math.hypot(x - a.xMilliInches - projection * dx, y - a.yMilliInches - projection * dy));
  }
  return positive && negative ? minimum : 0;
}
function containsBox(obstacle, box, radius) {
  return [[box.minX, box.minY], [box.minX, box.maxY], [box.maxX, box.minY], [box.maxX, box.maxY]]
    .every(([xMilliInches, yMilliInches]) => pointDistance({ xMilliInches, yMilliInches }, obstacle) < radius - collisionTolerance);
}
function rank(left, right) {
  return left.lowerBound - right.lowerBound
    || (left.maxX - left.minX + left.maxY - left.minY) - (right.maxX - right.minX + right.maxY - right.minY)
    || left.minX - right.minX || left.minY - right.minY;
}
function push(queue, value) {
  queue.push(value);
  let index = queue.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (rank(queue[parent], value) <= 0) break;
    queue[index] = queue[parent];
    index = parent;
  }
  queue[index] = value;
}
function pop(queue) {
  const result = queue[0];
  const last = queue.pop();
  if (!queue.length) return result;
  let index = 0;
  while (index * 2 + 1 < queue.length) {
    let child = index * 2 + 1;
    if (child + 1 < queue.length && rank(queue[child + 1], queue[child]) < 0) child++;
    if (rank(last, queue[child]) <= 0) break;
    queue[index] = queue[child];
    index = child;
  }
  queue[index] = last;
  return result;
}
function verifyScene(scene) {
  const { sceneHash, ...body } = scene;
  if (scene.schema !== 'starcraft_tmg_token_displacement_scene_v1' || sceneHash !== hash(body)
    || scene.token.shape !== 'round' || scene.coordinateQuantumMilliInches !== 1) throw Error('TOKEN_DISPLACEMENT_SCENE_BINDING_INVALID');
}

export function inspectOfficialTokenDisplacementCoordinateV1({ scene, coordinate }) {
  verifyScene(scene);
  return inspectCoordinate(scene, coordinate);
}
function inspectCoordinate(scene, coordinate) {
  if (!coordinate || Object.keys(coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
    || !Number.isSafeInteger(coordinate.xMilliInches) || !Number.isSafeInteger(coordinate.yMilliInches)) {
    throw Error('TOKEN_DISPLACEMENT_COORDINATE_INVALID');
  }
  const radius = scene.token.radiusMilliInches;
  if (coordinate.xMilliInches < radius || coordinate.yMilliInches < radius
    || coordinate.xMilliInches > scene.widthMilliInches - radius || coordinate.yMilliInches > scene.heightMilliInches - radius) {
    return { legal: false, reason: 'full_base_outside_board' };
  }
  const token = createOfficialPhysicalFootprintV1({ objectId: scene.token.objectId, kind: 'battlefield_token', shape: 'round',
    center: coordinate, widthMilliInches: scene.token.widthMilliInches, depthMilliInches: scene.token.depthMilliInches });
  for (const obstacle of scene.obstacles) {
    const box = bounds(obstacle);
    if (coordinate.xMilliInches + radius <= box.minX || coordinate.xMilliInches - radius >= box.maxX
      || coordinate.yMilliInches + radius <= box.minY || coordinate.yMilliInches - radius >= box.maxY) continue;
    if (evaluateOfficialPhysicalFootprintRelationV1({ left: token, right: obstacle }).overlappingInteriors) {
      return { legal: false, reason: 'footprint_overlap', obstacleId: obstacle.objectId };
    }
  }
  const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: token, right: scene.leading });
  return { legal: true, coordinate: { ...coordinate }, gapMilliInches: Math.max(0, relation.minimumSeparationMilliInches),
    baseContact: relation.minimumSeparationMilliInches <= tolerance, relationHash: relation.relationHash };
}

export function solveOfficialTokenDisplacementGeometryV1({ scene, maxVisitedNodes = 50000 }) {
  verifyScene(scene);
  if (!Number.isSafeInteger(maxVisitedNodes) || maxVisitedNodes < 1) throw Error('TOKEN_DISPLACEMENT_SEARCH_BUDGET_INVALID');
  const radius = scene.token.radiusMilliInches;
  const board = { minX: radius, minY: radius, maxX: scene.widthMilliInches - radius, maxY: scene.heightMilliInches - radius };
  const stats = { visitedNodes: 0, obstacleCoveredBoxes: 0, boundPrunedBoxes: 0, testedCoordinates: 0, maxVisitedNodes };
  const witnesses = [];
  const tested = new Set();
  let best = null;
  function test(x, y) {
    const point = { xMilliInches: Math.round(x), yMilliInches: Math.round(y) };
    const key = point.xMilliInches + ',' + point.yMilliInches;
    if (tested.has(key)) return;
    tested.add(key);
    stats.testedCoordinates++;
    const result = inspectCoordinate(scene, point);
    if (!result.legal) return;
    if (!best || result.gapMilliInches < best.gapMilliInches) best = result;
    if (result.baseContact && witnesses.length < 16) witnesses.push(result);
  }
  function result(status, certified, lowerBound) {
    return seal({ schema: 'starcraft_tmg_token_displacement_geometry_result_v1', version,
      sceneHash: scene.sceneHash, status, searchScope: 'entire_canonical_milli_inch_coordinate_grid',
      coordinateQuantumMilliInches: 1, optimalityToleranceMilliInches: tolerance,
      optimalityCertified: certified, baseContactPossible: witnesses.length ? true : certified ? false : null,
      globalLowerBoundMilliInches: lowerBound, bestWitness: best, contactWitnesses: witnesses,
      controllerChoosesCoordinate: true, finiteSeedMissIsNotImpossibility: true,
      stats, mutationAuthority: false, trainingTruth: false }, 'resultHash');
  }
  if (board.minX > board.maxX || board.minY > board.maxY) return result('no_legal_canonical_position', true, null);
  const lead = scene.leading;
  const leadingRadius = lead.radiusMilliInches ?? Math.hypot(lead.widthMilliInches, lead.depthMilliInches) / 2;
  for (let index = 0; index < 32; index++) {
    const angle = index * 2 * Math.PI / 32;
    test(lead.center.xMilliInches + (leadingRadius + radius) * Math.cos(angle),
      lead.center.yMilliInches + (leadingRadius + radius) * Math.sin(angle));
  }
  for (let index = 0; index < lead.vertices.length; index++) {
    const a = lead.vertices[index];
    const b = lead.vertices[(index + 1) % lead.vertices.length];
    const midpoint = { x: (a.xMilliInches + b.xMilliInches) / 2, y: (a.yMilliInches + b.yMilliInches) / 2 };
    let dx = b.yMilliInches - a.yMilliInches;
    let dy = a.xMilliInches - b.xMilliInches;
    if (dx * (midpoint.x - lead.center.xMilliInches) + dy * (midpoint.y - lead.center.yMilliInches) < 0) { dx = -dx; dy = -dy; }
    const length = Math.hypot(dx, dy);
    test(midpoint.x + radius * dx / length, midpoint.y + radius * dy / length);
  }
  if (witnesses.length) return result('base_contact_witness', true, 0);
  for (const [x, y] of [[board.minX, board.minY], [board.minX, board.maxY], [board.maxX, board.minY], [board.maxX, board.maxY]]) test(x, y);
  function lowerBound(box) {
    const footprint = createOfficialPhysicalFootprintV1({ objectId: 'displacement-search-box', kind: 'search_bound', shape: 'rectangle',
      center: { xMilliInches: Math.floor((box.minX + box.maxX) / 2), yMilliInches: Math.floor((box.minY + box.maxY) / 2) },
      widthMilliInches: box.maxX - box.minX + 2, depthMilliInches: box.maxY - box.minY + 2 });
    return Math.max(0, evaluateOfficialPhysicalFootprintRelationV1({ left: footprint, right: lead }).minimumSeparationMilliInches - radius - 2);
  }
  const queue = [];
  push(queue, { ...board, lowerBound: lowerBound(board) });
  while (queue.length && stats.visitedNodes < maxVisitedNodes) {
    if (best && queue[0].lowerBound >= best.gapMilliInches - tolerance && queue[0].lowerBound > tolerance) {
      return result('closest_position_certified', true, Math.min(best.gapMilliInches, queue[0].lowerBound));
    }
    const box = pop(queue);
    stats.visitedNodes++;
    if (scene.obstacles.some(obstacle => containsBox(obstacle, box, radius))) { stats.obstacleCoveredBoxes++; continue; }
    if (box.minX === box.maxX && box.minY === box.maxY) {
      test(box.minX, box.minY);
      if (witnesses.length) return result('base_contact_witness', true, 0);
      continue;
    }
    const horizontal = box.maxX - box.minX >= box.maxY - box.minY;
    const middle = Math.floor(horizontal ? (box.minX + box.maxX) / 2 : (box.minY + box.maxY) / 2);
    const children = horizontal ? [{ ...box, maxX: middle }, { ...box, minX: middle + 1 }]
      : [{ ...box, maxY: middle }, { ...box, minY: middle + 1 }];
    for (const child of children) {
      child.lowerBound = lowerBound(child);
      if (best && child.lowerBound >= best.gapMilliInches - tolerance && child.lowerBound > tolerance) stats.boundPrunedBoxes++;
      else push(queue, child);
    }
  }
  if (!queue.length) return result(best ? 'closest_position_certified' : 'no_legal_canonical_position', true,
    best ? Math.max(0, best.gapMilliInches - tolerance) : null);
  return result('search_exhausted', false, queue[0].lowerBound);
}

export function resolveOfficialTokenDisplacementCoordinateV1({ scene, coordinate, solution }) {
  const { resultHash, ...body } = solution;
  if (solution.sceneHash !== scene.sceneHash || resultHash !== hash(body)) throw Error('TOKEN_DISPLACEMENT_RESULT_BINDING_INVALID');
  const inspected = inspectOfficialTokenDisplacementCoordinateV1({ scene, coordinate });
  return { ...inspected,
    displacementConditionSatisfied: inspected.legal && (inspected.baseContact
      || solution.optimalityCertified && solution.baseContactPossible === false && solution.bestWitness
        && inspected.gapMilliInches <= solution.globalLowerBoundMilliInches + solution.optimalityToleranceMilliInches),
    ...(inspected.legal && !inspected.baseContact && !solution.optimalityCertified ? { needsClosestProof: true } : {}) };
}
