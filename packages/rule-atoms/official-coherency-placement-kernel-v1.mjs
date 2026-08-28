import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_COHERENCY_PLACEMENT_KERNEL_SCHEMA =
  "starcraft_tmg_official_coherency_placement_kernel_v1";

const CONTACT_TOLERANCE_MILLI_INCHES = 1;
const COHERENCY_RANGE_MILLI_INCHES = 3000;
const MAX_EXACT_GRID_POINTS = 2_000_000;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function milli(value, code = "CLOSE_RANKS_MODEL_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function canonicalPoint(value) {
  if (!object(value)
    || !Number.isSafeInteger(Number(value.xMilliInches))
    || !Number.isSafeInteger(Number(value.yMilliInches))) {
    fail("CLOSE_RANKS_PLACEMENT_POINT_INVALID");
  }
  return {
    xMilliInches: Number(value.xMilliInches),
    yMilliInches: Number(value.yMilliInches),
  };
}

function point(model) {
  return {
    xMilliInches: milli(model.xInches),
    yMilliInches: milli(model.yInches),
  };
}

function roundRadius(model) {
  const shape = String(model?.baseShape || "").toLowerCase();
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  if (shape !== "round" || width <= 0 || Math.abs(width - depth) > 1) {
    fail("CLOSE_RANKS_GEOMETRY_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return Math.round(width / 2);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function distance(left, right) {
  return Math.hypot(
    right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches,
  );
}

function pointToSegmentDistance(target, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  const lengthSquared = (dx * dx) + (dy * dy);
  if (lengthSquared === 0) return distance(target, start);
  const ratio = Math.max(0, Math.min(1, (
    ((target.xMilliInches - start.xMilliInches) * dx)
      + ((target.yMilliInches - start.yMilliInches) * dy)
  ) / lengthSquared));
  return Math.hypot(
    target.xMilliInches - (start.xMilliInches + (ratio * dx)),
    target.yMilliInches - (start.yMilliInches + (ratio * dy)),
  );
}

function basesOverlapAt(leftPoint, leftRadius, rightPoint, rightRadius) {
  return distance(leftPoint, rightPoint)
    < leftRadius + rightRadius - CONTACT_TOLERANCE_MILLI_INCHES;
}

function basesTouchAt(leftPoint, leftRadius, rightPoint, rightRadius) {
  return Math.abs(distance(leftPoint, rightPoint) - leftRadius - rightRadius)
    <= CONTACT_TOLERANCE_MILLI_INCHES;
}

function endpointInsideBoard(state, endpoint, radius) {
  const maxX = milli(state.board?.widthInches);
  const maxY = milli(state.board?.heightInches);
  return endpoint.xMilliInches >= radius
    && endpoint.xMilliInches <= maxX - radius
    && endpoint.yMilliInches >= radius
    && endpoint.yMilliInches <= maxY - radius;
}

function modelRecords(state) {
  return (state.pieces || []).filter(activePiece).flatMap((piece) => (
    activeModels(piece).map((model) => ({
      unitId: piece.id,
      sideKey: piece.sideKey,
      modelId: model.id,
      model,
      point: point(model),
      radius: roundRadius(model),
    }))
  ));
}

function forEachContactCandidate(anchor, movingRadius, visit) {
  const contactDistance = anchor.radius + movingRadius;
  const inner = Math.max(0, contactDistance - CONTACT_TOLERANCE_MILLI_INCHES);
  const outer = contactDistance + CONTACT_TOLERANCE_MILLI_INCHES;
  const innerSquared = inner * inner;
  const outerSquared = outer * outer;
  for (let dx = -outer; dx <= outer; dx += 1) {
    const maxSquaredY = outerSquared - (dx * dx);
    if (maxSquaredY < 0) continue;
    const maxAbsY = Math.floor(Math.sqrt(maxSquaredY));
    const minSquaredY = Math.max(0, innerSquared - (dx * dx));
    const minAbsY = Math.ceil(Math.sqrt(minSquaredY));
    for (let absY = minAbsY; absY <= maxAbsY; absY += 1) {
      if (visit({
        xMilliInches: anchor.point.xMilliInches + dx,
        yMilliInches: anchor.point.yMilliInches + absY,
      }) === true) return true;
      if (absY > 0 && visit({
        xMilliInches: anchor.point.xMilliInches + dx,
        yMilliInches: anchor.point.yMilliInches - absY,
      }) === true) return true;
    }
  }
  return false;
}

function placementContext(input) {
  if (!object(input?.state)) fail("CLOSE_RANKS_COHERENCY_KERNEL_INPUT_INVALID");
  const state = input.state;
  const piece = (state.pieces || []).find((entry) => entry.id === input.unitId);
  if (!activePiece(piece)) fail("CLOSE_RANKS_UNIT_UNAVAILABLE", String(input.unitId || ""));
  const movingModel = (piece.models || []).find((entry) => entry.id === input.movingModelId);
  const leadingModel = activeModels(piece).find((entry) => entry.id === input.leadingModelId);
  if (!movingModel || !leadingModel || movingModel.id === leadingModel.id) {
    fail("CLOSE_RANKS_COHERENCY_KERNEL_INPUT_INVALID");
  }
  const records = modelRecords(state);
  const byModelId = new Map(records.map((entry) => [entry.modelId, entry]));
  const movingRadius = roundRadius(movingModel);
  const leadingRadius = roundRadius(leadingModel);
  const leadingPoint = point(leadingModel);
  const ignoredEnemyUnitIds = new Set(
    (input.phaseStartEngagedEnemyUnitIds || []).map((entry) => String(entry)),
  );
  const blockers = records.filter((entry) => (
    entry.unitId !== piece.id && !ignoredEnemyUnitIds.has(entry.unitId)
  ));
  const ownRecords = records.filter((entry) => entry.unitId === piece.id);

  function edgeClear(leftPoint, rightPoint) {
    return blockers.every((blocker) => (
      pointToSegmentDistance(blocker.point, leftPoint, rightPoint)
        >= leadingRadius + blocker.radius - CONTACT_TOLERANCE_MILLI_INCHES
    ));
  }

  const adjacency = new Map(ownRecords.map((entry) => [entry.modelId, []]));
  for (let leftIndex = 0; leftIndex < ownRecords.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ownRecords.length; rightIndex += 1) {
      const left = ownRecords[leftIndex];
      const right = ownRecords[rightIndex];
      if (!edgeClear(left.point, right.point)) continue;
      adjacency.get(left.modelId).push(right.modelId);
      adjacency.get(right.modelId).push(left.modelId);
    }
  }
  const connected = new Set([leadingModel.id]);
  const queue = [leadingModel.id];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (connected.has(next)) continue;
      connected.add(next);
      queue.push(next);
    }
  }
  const connectedAnchors = ownRecords.filter((entry) => connected.has(entry.modelId));
  if (connectedAnchors.length === 0) fail("CLOSE_RANKS_COHERENCY_LINK_REQUIRED");

  function physicalLegal(endpoint) {
    return endpointInsideBoard(state, endpoint, movingRadius)
      && records.every((entry) => !basesOverlapAt(
        endpoint,
        movingRadius,
        entry.point,
        entry.radius,
      ));
  }

  function linked(endpoint) {
    return connectedAnchors.some((anchor) => edgeClear(endpoint, anchor.point));
  }

  function withinThree(endpoint) {
    return distance(endpoint, leadingPoint) + movingRadius
      <= COHERENCY_RANGE_MILLI_INCHES + leadingRadius + CONTACT_TOLERANCE_MILLI_INCHES;
  }

  const graphBody = {
    schema: "starcraft_tmg_coherency_link_graph_v1",
    unitId: piece.id,
    leadingModelId: leadingModel.id,
    connectedModelIds: [...connected].sort((left, right) => left.localeCompare(right)),
    disconnectedModelIds: ownRecords.map((entry) => entry.modelId)
      .filter((modelId) => !connected.has(modelId))
      .sort((left, right) => left.localeCompare(right)),
    blockingUnitIds: [...new Set(blockers.map((entry) => entry.unitId))]
      .sort((left, right) => left.localeCompare(right)),
    ignoredEngagedEnemyUnitIds: [...ignoredEnemyUnitIds].sort((left, right) => left.localeCompare(right)),
    leadingRadiusMilliInches: leadingRadius,
  };
  return {
    state,
    piece,
    movingModel,
    movingRadius,
    leadingModel,
    leadingRadius,
    leadingPoint,
    records,
    byModelId,
    physicalLegal,
    linked,
    withinThree,
    linkGraph: { ...graphBody, linkGraphHash: hashStarcraftTmgContract(graphBody) },
  };
}

function analyzePlacementSpace(context) {
  const minX = context.movingRadius;
  const maxX = milli(context.state.board.widthInches) - context.movingRadius;
  const minY = context.movingRadius;
  const maxY = milli(context.state.board.heightInches) - context.movingRadius;
  const exactGridPointCount = (maxX - minX + 1) * (maxY - minY + 1);
  if (!Number.isSafeInteger(exactGridPointCount)
    || exactGridPointCount <= 0
    || exactGridPointCount > MAX_EXACT_GRID_POINTS) {
    fail("CLOSE_RANKS_COHERENCY_EXACT_SEARCH_SCOPE_UNSUPPORTED", String(exactGridPointCount));
  }
  let physicalCandidateCount = 0;
  let linkedCandidateCount = 0;
  let withinThreeLinkedCandidateCount = 0;
  let minimumCenterDistanceMilliInches = Number.POSITIVE_INFINITY;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const endpoint = { xMilliInches: x, yMilliInches: y };
      if (!context.physicalLegal(endpoint)) continue;
      physicalCandidateCount += 1;
      if (!context.linked(endpoint)) continue;
      linkedCandidateCount += 1;
      const centerDistance = distance(endpoint, context.leadingPoint);
      minimumCenterDistanceMilliInches = Math.min(
        minimumCenterDistanceMilliInches,
        centerDistance,
      );
      if (context.withinThree(endpoint)) withinThreeLinkedCandidateCount += 1;
    }
  }

  const body = {
    schema: OFFICIAL_COHERENCY_PLACEMENT_KERNEL_SCHEMA,
    proofMode: "complete_bounded_integer_lattice_search_v1",
    coordinateUnit: "milli-inch",
    contactToleranceMilliInches: CONTACT_TOLERANCE_MILLI_INCHES,
    linkGraphHash: context.linkGraph.linkGraphHash,
    exactGridPointCount,
    exactGridPointLimit: MAX_EXACT_GRID_POINTS,
    physicalCandidateCount,
    linkedCandidateCount,
    withinThreeLinkedCandidateCount,
    linkedPlacementExists: linkedCandidateCount > 0,
    withinThreeLinkedPlacementExists: withinThreeLinkedCandidateCount > 0,
    minimumCenterDistanceMilliInches: Number.isFinite(minimumCenterDistanceMilliInches)
      ? Number(minimumCenterDistanceMilliInches.toFixed(3))
      : null,
  };
  return { ...body, searchReceiptHash: hashStarcraftTmgContract(body) };
}

function withinThreeWitnessSearch(context, endpoint) {
  const centerDistance = distance(endpoint, context.leadingPoint);
  const body = {
    schema: OFFICIAL_COHERENCY_PLACEMENT_KERNEL_SCHEMA,
    proofMode: "proposed_within_three_linked_witness_v1",
    coordinateUnit: "milli-inch",
    contactToleranceMilliInches: CONTACT_TOLERANCE_MILLI_INCHES,
    linkGraphHash: context.linkGraph.linkGraphHash,
    exactGridPointCount: null,
    exactGridPointLimit: MAX_EXACT_GRID_POINTS,
    physicalCandidateCount: 1,
    linkedCandidateCount: 1,
    withinThreeLinkedCandidateCount: 1,
    linkedPlacementExists: true,
    withinThreeLinkedPlacementExists: true,
    minimumCenterDistanceMilliInches: Number(centerDistance.toFixed(3)),
  };
  return { ...body, searchReceiptHash: hashStarcraftTmgContract(body) };
}

function touchesAny(context, endpoint, modelIds) {
  return modelIds.some((modelId) => {
    const anchor = context.byModelId.get(modelId);
    return anchor && basesTouchAt(endpoint, context.movingRadius, anchor.point, anchor.radius);
  });
}

function contactExists(context, search, modelIds) {
  return modelIds.some((modelId) => {
    const anchor = context.byModelId.get(modelId);
    if (!anchor) return false;
    return forEachContactCandidate(anchor, context.movingRadius, (endpoint) => {
      if (!context.physicalLegal(endpoint) || !context.linked(endpoint)) return false;
      if (search.withinThreeLinkedPlacementExists) return context.withinThree(endpoint);
      return Math.abs(
        distance(endpoint, context.leadingPoint) - search.minimumCenterDistanceMilliInches,
      ) <= CONTACT_TOLERANCE_MILLI_INCHES;
    });
  });
}

export function resolveOfficialCoherencyPlacementV1(input = {}) {
  const context = placementContext(input);
  const outcome = String(input.proposal?.outcome || "").trim();
  if (outcome === "casualty") {
    const search = analyzePlacementSpace(context);
    if (search.linkedPlacementExists) fail("CLOSE_RANKS_CASUALTY_NOT_REQUIRED", context.movingModel.id);
    return {
      schema: OFFICIAL_COHERENCY_PLACEMENT_KERNEL_SCHEMA,
      modelId: context.movingModel.id,
      outcome,
      endpoint: null,
      prioritySatisfied: "no_legal_coherency_link_casualty",
      withinThree: false,
      outOfCoherency: false,
      linkGraph: context.linkGraph,
      search,
    };
  }
  if (outcome !== "placed") fail("CLOSE_RANKS_PLACEMENT_OUTCOME_INVALID", context.movingModel.id);
  const endpoint = canonicalPoint(input.proposal);
  if (!context.physicalLegal(endpoint)) fail("CLOSE_RANKS_PLACEMENT_ILLEGAL", context.movingModel.id);
  if (!context.linked(endpoint)) fail("CLOSE_RANKS_COHERENCY_LINK_REQUIRED", context.movingModel.id);
  const withinThree = context.withinThree(endpoint);
  const search = withinThree
    ? withinThreeWitnessSearch(context, endpoint)
    : analyzePlacementSpace(context);
  if (search.withinThreeLinkedPlacementExists && !withinThree) {
    fail("CLOSE_RANKS_WITHIN_THREE_REQUIRED", context.movingModel.id);
  }
  if (!search.withinThreeLinkedPlacementExists && Math.abs(
    distance(endpoint, context.leadingPoint) - search.minimumCenterDistanceMilliInches,
  ) > CONTACT_TOLERANCE_MILLI_INCHES) {
    fail("CLOSE_RANKS_NOT_CLOSEST_LEGAL", context.movingModel.id);
  }
  const enemyContactModelIds = [...new Set(input.enemyContactModelIds || [])]
    .sort((left, right) => left.localeCompare(right));
  const friendlyFightingModelIds = [...new Set(input.friendlyFightingModelIds || [])]
    .sort((left, right) => left.localeCompare(right));
  const enemyContactPossible = contactExists(context, search, enemyContactModelIds);
  const enemyContact = touchesAny(context, endpoint, enemyContactModelIds);
  let prioritySatisfied;
  if (enemyContactPossible) {
    if (!enemyContact) fail("CLOSE_RANKS_ENEMY_CONTACT_REQUIRED", context.movingModel.id);
    prioritySatisfied = "enemy_base_contact";
  } else {
    const friendlyContactPossible = contactExists(
      context,
      search,
      friendlyFightingModelIds,
    );
    const friendlyContact = touchesAny(context, endpoint, friendlyFightingModelIds);
    if (friendlyContactPossible && !friendlyContact) {
      fail("CLOSE_RANKS_FRIENDLY_CONTACT_REQUIRED", context.movingModel.id);
    }
    if (friendlyContactPossible) prioritySatisfied = "friendly_fighting_rank_contact";
    else if (withinThree) prioritySatisfied = "coherency_only_within_three";
    else prioritySatisfied = "closest_linked_out_of_coherency";
  }
  return {
    schema: OFFICIAL_COHERENCY_PLACEMENT_KERNEL_SCHEMA,
    modelId: context.movingModel.id,
    outcome,
    endpoint,
    prioritySatisfied,
    withinThree,
    outOfCoherency: !withinThree,
    linkGraph: context.linkGraph,
    search,
  };
}
