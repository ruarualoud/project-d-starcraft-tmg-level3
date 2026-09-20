import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { projectOfficialCharacteristicStatusFamilyModifiersV1 } from
  "../product-composition/official-characteristic-status-family-adapter-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "./tactical-relationship-graph-v1.mjs";

export const STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION =
  "starcraft_tmg_legal_formation_search_v1";

export const STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME =
  "space.solve_formation";

export const STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS = Object.freeze([
  "balanced",
  "advance",
  "compact",
  "disperse",
  "maximize_engagement",
  "surround_target",
  "avoid_threat",
  "control_objective",
  "screen",
  "preserve_lane",
]);

const SUPPORTED_ACTION_TYPES = new Set([
  "deploy", "move", "run", "disengage", "resolve_charge",
  "resolve_relocation_ability",
  "resolve_unit_lifecycle_ability", "resolve_unit_lifecycle_consumer",
]);
const RELOCATION_FORMATION_EFFECTS = new Set([
  "entry_edge_place", "extra_move", "direct_place",
  "friendly_anchor_place", "non_entry_edge_deploy",
]);
const LIFECYCLE_ABILITY_FORMATION_EFFECTS = new Set([
  "phase_prism_swap", "summon_roachling", "respawn_models",
]);
const LIFECYCLE_CONSUMER_FORMATION_EFFECTS = new Set([
  "omega_network_deploy", "pylon_warp_conduit_deploy",
  "reserve_indicator_deploy", "shade_round_end_place",
]);
export const STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1 = Object.freeze({
  standardSpatialActionTypes: Object.freeze([
    "deploy", "move", "run", "disengage",
  ]),
  chargeResolutionActionTypes: Object.freeze(["resolve_charge"]),
  relocationEffects: Object.freeze([...RELOCATION_FORMATION_EFFECTS]),
  lifecycleAbilityEffects:
    Object.freeze([...LIFECYCLE_ABILITY_FORMATION_EFFECTS]),
  lifecycleConsumerEffects:
    Object.freeze([...LIFECYCLE_CONSUMER_FORMATION_EFFECTS]),
  forcedRelocationParameterizedDomainCount: 0,
});
const DEFAULT_MAX_ATTEMPTS = 4_096;
const DEFAULT_MAX_OPTIONS = 4;
const PHYSICAL_DISTANCE_TOLERANCE_MILLI_INCHES = 1;
const FORMATION_OBJECTIVE_KIND_SET = new Set(
  STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS,
);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function sourceDomain(domain) {
  return object(domain?.sourceDomain) ? domain.sourceDomain : domain;
}

function dimension(profile, field, fallback) {
  const value = Number(profile?.[field] ?? profile?.[fallback]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`LEGAL_FORMATION_MODEL_${field.toUpperCase()}_INVALID`);
  }
  return value;
}

function baseSignature(profile) {
  return [String(profile?.baseShape || profile?.shape || "round"),
    dimension(profile, "baseWidthMilliInches", "widthMilliInches"),
    dimension(profile, "baseDepthMilliInches", "depthMilliInches")].join(":");
}

function formationOffsets(profiles, gap, transform) {
  const xStep = Math.max(...profiles.map((entry) =>
    dimension(entry, "baseWidthMilliInches", "widthMilliInches"))) + gap;
  const yStep = Math.max(...profiles.map((entry) =>
    dimension(entry, "baseDepthMilliInches", "depthMilliInches"))) + gap;
  const points = [{ x: 0, y: 0 }];
  for (let ring = 1; points.length < profiles.length; ring += 1) {
    for (let y = -ring; y <= ring; y += 1) {
      for (let x = -ring; x <= ring; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) === ring) {
          points.push({ x: x * xStep, y: y * yStep });
        }
      }
    }
  }
  return points.sort((left, right) =>
    Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y)
      || left.y - right.y || left.x - right.x).slice(0, profiles.length)
    .map((point) => transform(point));
}

const TRANSFORMS = Object.freeze([
  { id: "north", apply: ({ x, y }) => ({ x, y }) },
  { id: "east", apply: ({ x, y }) => ({ x: -y, y: x }) },
  { id: "south", apply: ({ x, y }) => ({ x: -x, y: -y }) },
  { id: "west", apply: ({ x, y }) => ({ x: y, y: -x }) },
]);

function axisSamples(minimum, maximum, preferred, step = 1_000) {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)
    || minimum > maximum) return [];
  const values = [];
  for (let value = Math.ceil(minimum / step) * step;
    value <= maximum; value += step) values.push(value);
  for (const value of [minimum, maximum, Math.round((minimum + maximum) / 2),
    Math.min(maximum, Math.max(minimum, Number(preferred)))]) {
    if (Number.isFinite(value) && value >= minimum && value <= maximum) {
      values.push(Math.round(value));
    }
  }
  return [...new Set(values)];
}

function formationBounds(constraints, profiles, offsets) {
  const halfWidths = profiles.map((entry) => Math.round(
    dimension(entry, "baseWidthMilliInches", "widthMilliInches") / 2));
  const halfDepths = profiles.map((entry) => Math.round(
    dimension(entry, "baseDepthMilliInches", "depthMilliInches") / 2));
  return {
    minimumX: Math.max(...offsets.map((entry, index) =>
      halfWidths[index] - entry.x)),
    maximumX: Number(constraints.battlefieldWidthMilliInches)
      - Math.max(...offsets.map((entry, index) =>
        entry.x + halfWidths[index])),
    minimumY: Math.max(...offsets.map((entry, index) =>
      halfDepths[index] - entry.y)),
    maximumY: Number(constraints.battlefieldHeightMilliInches)
      - Math.max(...offsets.map((entry, index) =>
        entry.y + halfDepths[index])),
    halfWidths,
    halfDepths,
  };
}

function preferredAnchor(request, constraints) {
  const supplied = request?.preferredAnchor;
  const x = Number(supplied?.xMilliInches);
  const y = Number(supplied?.yMilliInches);
  return {
    xMilliInches: Number.isFinite(x) ? x
      : Math.round(Number(constraints.battlefieldWidthMilliInches) / 2),
    yMilliInches: Number.isFinite(y) ? y
      : Math.round(Number(constraints.battlefieldHeightMilliInches) / 2),
  };
}

function rowsAt(profiles, offsets, centerX, centerY) {
  return profiles.map((profile, index) => ({
    modelId: profile.modelId,
    xMilliInches: centerX + offsets[index].x,
    yMilliInches: centerY + offsets[index].y,
  }));
}

function footprintBounds(footprint) {
  if (footprint.shape === "round") {
    return {
      minimumX: footprint.center.xMilliInches - footprint.radiusMilliInches,
      maximumX: footprint.center.xMilliInches + footprint.radiusMilliInches,
      minimumY: footprint.center.yMilliInches - footprint.radiusMilliInches,
      maximumY: footprint.center.yMilliInches + footprint.radiusMilliInches,
    };
  }
  return {
    minimumX: Math.min(...footprint.vertices.map((entry) =>
      entry.xMilliInches)),
    maximumX: Math.max(...footprint.vertices.map((entry) =>
      entry.xMilliInches)),
    minimumY: Math.min(...footprint.vertices.map((entry) =>
      entry.yMilliInches)),
    maximumY: Math.max(...footprint.vertices.map((entry) =>
      entry.yMilliInches)),
  };
}

function boundsMayOverlap(left, right) {
  return left.maximumX >= right.minimumX
    && right.maximumX >= left.minimumX
    && left.maximumY >= right.minimumY
    && right.maximumY >= left.minimumY;
}

function physicalFootprint(input) {
  return createOfficialPhysicalFootprintV1({
    objectId: input.objectId,
    kind: input.kind,
    shape: input.shape,
    center: input.center,
    widthMilliInches: input.widthMilliInches,
    depthMilliInches: input.depthMilliInches,
    rotationDegrees: input.rotationDegrees || 0,
  });
}

function blockingFootprints(state, actorPieceId) {
  const modelBlockers = (state.pieces || []).filter((piece) =>
    piece.id !== actorPieceId && piece.isOnField === true
      && piece.isDestroyed !== true && Number(piece.currentModels || 0) > 0)
    .flatMap((piece) => (piece.models || []).filter((model) =>
      model.isOnField !== false && model.isDestroyed !== true
        && Number.isFinite(Number(model.xInches))
        && Number.isFinite(Number(model.yInches))).map((model) => ({
      sideKey: piece.sideKey,
      pieceId: piece.id,
      modelId: model.id,
      kind: "model",
      footprint: physicalFootprint({
        objectId: model.id,
        kind: "model_base",
        shape: model.baseShape,
        center: {
          xMilliInches: Math.round(Number(model.xInches) * 1000),
          yMilliInches: Math.round(Number(model.yInches) * 1000),
        },
        widthMilliInches: Math.round(Number(model.baseWidthInches) * 1000),
        depthMilliInches: Math.round(Number(model.baseDepthInches) * 1000),
        rotationDegrees: model.baseRotationDegrees || 0,
      }),
    })));
  const terrainBlockers = (state.board?.terrain || []).filter((terrain) =>
    terrain.isRemoved !== true && terrain.isDestroyed !== true
      && terrain.blocksPlacement !== false).flatMap((terrain) => {
    const source = terrain.footprint || terrain;
    if (source.shape === "axis_aligned_rectangle") {
      const minimumX = Number(source.minXMilliInches);
      const maximumX = Number(source.maxXMilliInches);
      const minimumY = Number(source.minYMilliInches);
      const maximumY = Number(source.maxYMilliInches);
      if (![minimumX, maximumX, minimumY, maximumY]
        .every(Number.isSafeInteger)) return [];
      return [{ sideKey: null, pieceId: null, modelId: null,
        objectId: terrain.id, kind: "terrain", footprint: physicalFootprint({
        objectId: terrain.id,
        kind: "terrain",
        shape: "rectangle",
        center: {
          xMilliInches: Math.round((minimumX + maximumX) / 2),
          yMilliInches: Math.round((minimumY + maximumY) / 2),
        },
        widthMilliInches: maximumX - minimumX,
        depthMilliInches: maximumY - minimumY,
        rotationDegrees: 0,
      }) }];
    }
    return [];
  });
  return [...modelBlockers, ...terrainBlockers].map((entry) => ({
    ...entry,
    bounds: footprintBounds(entry.footprint),
  }));
}

function footprintInsideBattlefield(footprint, state) {
  const bounds = footprintBounds(footprint);
  return bounds.minimumX >= 0
    && bounds.minimumY >= 0
    && bounds.maximumX <= Math.round(Number(state.board.widthInches) * 1000)
    && bounds.maximumY <= Math.round(Number(state.board.heightInches) * 1000);
}

function profileRadius(profile) {
  return Math.max(
    dimension(profile, "baseWidthMilliInches", "widthMilliInches"),
    dimension(profile, "baseDepthMilliInches", "depthMilliInches"),
  ) / 2;
}

function horizontalCoherencyRange(state, piece) {
  if (!state.officialCharacteristicStatusFamilySourceBundle || !piece) return 3_000;
  const projectedState = piece.isOnField === true ? state : clone(state);
  if (projectedState !== state) {
    const projectedPiece = projectedState.pieces.find((entry) =>
      entry.id === piece.id);
    projectedPiece.isOnField = true;
    projectedPiece.isInReserves = false;
    projectedPiece.models = projectedPiece.models.map((model) => ({
      ...model,
      isOnField: model.isDestroyed !== true,
    }));
  }
  return Number(projectOfficialCharacteristicStatusFamilyModifiersV1(
    projectedState.officialCharacteristicStatusFamilySourceBundle,
    projectedState,
    { pieceId: piece.id },
  ).horizontalCoherencyMilliInches || 3_000);
}

function footprintAt(profile, point, rotationDegrees = 0) {
  return physicalFootprint({
    objectId: `candidate:${profile.modelId}`,
    kind: "candidate_model_base",
    shape: profile.baseShape || profile.shape,
    center: point,
    widthMilliInches: dimension(profile, "baseWidthMilliInches",
      "widthMilliInches"),
    depthMilliInches: dimension(profile, "baseDepthMilliInches",
      "depthMilliInches"),
    rotationDegrees,
  });
}

function minimumEnemyGapFailure(footprint, blocker, input = {}) {
  const minimumExclusive = Number(
    input.minimumEnemyGapMilliInchesExclusive,
  );
  if (!Number.isFinite(minimumExclusive) || minimumExclusive <= 0
    || blocker.kind !== "model" || !blocker.sideKey
    || blocker.sideKey === input.sideKey) return false;
  const footprintBoundsValue = footprintBounds(footprint);
  const separationX = Math.max(
    blocker.bounds.minimumX - footprintBoundsValue.maximumX,
    footprintBoundsValue.minimumX - blocker.bounds.maximumX,
    0,
  );
  const separationY = Math.max(
    blocker.bounds.minimumY - footprintBoundsValue.maximumY,
    footprintBoundsValue.minimumY - blocker.bounds.maximumY,
    0,
  );
  if (Math.hypot(separationX, separationY)
    > minimumExclusive + PHYSICAL_DISTANCE_TOLERANCE_MILLI_INCHES) {
    return false;
  }
  return evaluateOfficialPhysicalFootprintRelationV1({
    left: footprint,
    right: blocker.footprint,
  }).minimumSeparationMilliInches
    <= minimumExclusive + PHYSICAL_DISTANCE_TOLERANCE_MILLI_INCHES;
}

function availablePackedFootprint(footprint, state, blockers, selected,
  hardConstraints = {}) {
  if (!footprintInsideBattlefield(footprint, state)) return false;
  for (const blocker of blockers) {
    const relation = evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: blocker.footprint,
    });
    if (relation.overlappingInteriors) return false;
    if (minimumEnemyGapFailure(footprint, blocker, hardConstraints)) {
      return false;
    }
  }
  return selected.every((entry) => (
    !evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: entry.footprint,
    }).overlappingInteriors
  ));
}

function pointAtDistance(origin, angle, distance) {
  return {
    xMilliInches: Math.round(origin.xMilliInches + (Math.cos(angle) * distance)),
    yMilliInches: Math.round(origin.yMilliInches + (Math.sin(angle) * distance)),
  };
}

function contactAnchor(profile, targetFootprint, angle, rotationDegrees = 0) {
  const origin = footprintCenter(targetFootprint);
  if (!origin) return null;
  const targetBounds = footprintBounds(targetFootprint);
  const targetRadius = Math.hypot(
    targetBounds.maximumX - targetBounds.minimumX,
    targetBounds.maximumY - targetBounds.minimumY,
  ) / 2;
  const profileRadiusBound = Math.hypot(
    dimension(profile, "baseWidthMilliInches", "widthMilliInches"),
    dimension(profile, "baseDepthMilliInches", "depthMilliInches"),
  ) / 2;
  let lower = 0;
  let upper = Math.ceil(targetRadius + profileRadiusBound + 2_000);
  let upperFootprint = footprintAt(profile,
    pointAtDistance(origin, angle, upper), rotationDegrees);
  while (evaluateOfficialPhysicalFootprintRelationV1({
    left: upperFootprint,
    right: targetFootprint,
  }).overlappingInteriors && upper < 100_000) {
    upper *= 2;
    upperFootprint = footprintAt(profile,
      pointAtDistance(origin, angle, upper), rotationDegrees);
  }
  if (upper >= 100_000) return null;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    const footprint = footprintAt(profile,
      pointAtDistance(origin, angle, middle), rotationDegrees);
    if (evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: targetFootprint,
    }).overlappingInteriors) lower = middle;
    else upper = middle;
  }
  return pointAtDistance(origin, angle, upper);
}

function normalizeFormationObjectives(request = {}) {
  const source = Array.isArray(request.formationObjectives)
    ? request.formationObjectives
    : Array.isArray(request.formationIntent?.objectives)
      ? request.formationIntent.objectives : [];
  const objectives = [];
  for (const entry of source.slice(0, 8)) {
    const kind = String(entry?.kind || "");
    if (!FORMATION_OBJECTIVE_KIND_SET.has(kind)) continue;
    const weight = Number(entry?.weight);
    objectives.push({
      kind,
      weight: Number.isSafeInteger(weight)
        ? Math.max(1, Math.min(5, weight)) : 3,
      targetIds: [...new Set((entry?.targetIds || []).map(String)
        .filter(Boolean))].slice(0, 24),
    });
  }
  return objectives.length > 0 ? objectives : [{
    kind: "balanced",
    weight: 3,
    targetIds: [],
  }];
}

function formationSolverPolicies(objectives) {
  const requested = clone(objectives);
  const policies = [
    { policyId: "requested-direct", objectives: requested, tieBreaker: 0 },
    { policyId: "requested-left", objectives: requested, tieBreaker: -1 },
    { policyId: "requested-right", objectives: requested, tieBreaker: 1 },
  ];
  for (const objective of objectives) {
    if (objectives.length < 2) break;
    policies.push({
      policyId: `isolate-${objective.kind}`,
      objectives: [clone(objective)],
      tieBreaker: 0,
    });
  }
  if (objectives.length === 1 && objectives[0].kind === "balanced") {
    policies.push({
      policyId: "fallback-compact",
      objectives: [{ kind: "compact", weight: 3, targetIds: [] }],
      tieBreaker: 0,
    }, {
      policyId: "fallback-disperse",
      objectives: [{ kind: "disperse", weight: 3, targetIds: [] }],
      tieBreaker: 0,
    }, {
      policyId: "fallback-advance",
      objectives: [{ kind: "advance", weight: 3, targetIds: [] }],
      tieBreaker: 0,
    });
  }
  return policies;
}

function footprintCenter(footprint) {
  if (object(footprint?.center)) return clone(footprint.center);
  if (Array.isArray(footprint?.vertices) && footprint.vertices.length > 0) {
    return {
      xMilliInches: Math.round(footprint.vertices.reduce((sum, entry) =>
        sum + Number(entry.xMilliInches), 0) / footprint.vertices.length),
      yMilliInches: Math.round(footprint.vertices.reduce((sum, entry) =>
        sum + Number(entry.yMilliInches), 0) / footprint.vertices.length),
    };
  }
  return null;
}

function boardPoint(value) {
  const coordinate = object(value?.coordinate) ? value.coordinate : value;
  const x = coordinate?.xMilliInches !== undefined
    ? Number(coordinate.xMilliInches)
    : Number(coordinate?.xInches ?? coordinate?.x) * 1_000;
  const y = coordinate?.yMilliInches !== undefined
    ? Number(coordinate.yMilliInches)
    : Number(coordinate?.yInches ?? coordinate?.y) * 1_000;
  return Number.isFinite(x) && Number.isFinite(y) ? {
    xMilliInches: Math.round(x),
    yMilliInches: Math.round(y),
  } : null;
}

function positiveMilliInches(...candidates) {
  for (const [value, scale] of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed * scale);
    }
  }
  return null;
}

function boardTargetFootprint(entry, kind, point) {
  const objectId = String(entry.id || entry.markerId || entry.tokenId
    || entry.name || "");
  if (!objectId || !point) return null;
  const diameter = positiveMilliInches(
    [entry.diameterMilliInches, 1],
    [entry.baseDiameterMilliInches, 1],
    [entry.diameterInches, 1_000],
    [entry.baseDiameterInches, 1_000],
    [entry.diameterMillimeters, 1_000 / 25.4],
    [entry.baseDiameterMm, 1_000 / 25.4],
  ) || (kind === "mission_marker" ? Math.round((32 / 25.4) * 1_000) : null);
  if (!diameter) return null;
  return physicalFootprint({
    objectId,
    kind,
    shape: "round",
    center: point,
    widthMilliInches: diameter,
    depthMilliInches: diameter,
    rotationDegrees: 0,
  });
}

function formationIntentTargetIndex(state, blockers) {
  const targets = [];
  for (const blocker of blockers) {
    targets.push({
      ids: [...new Set([blocker.pieceId, blocker.modelId, blocker.objectId,
        blocker.footprint?.objectId].filter(Boolean).map(String))],
      sideKey: blocker.sideKey || null,
      kind: blocker.kind,
      footprint: blocker.footprint,
      point: footprintCenter(blocker.footprint),
    });
  }
  for (const [kind, collection] of [
    ["mission_marker", state.board?.missionMarkers || []],
    ["marker", state.board?.markers || []],
    ["token", state.board?.tokens || []],
  ]) {
    for (const entry of collection) {
      const point = boardPoint(entry);
      const ids = [...new Set([entry.id, entry.markerId, entry.tokenId,
        entry.name].filter(Boolean).map(String))];
      if (point && ids.length > 0) targets.push({
        ids,
        sideKey: entry.sideKey || entry.controlSideKey || null,
        kind,
        footprint: boardTargetFootprint(entry, kind, point),
        point,
      });
    }
  }
  return targets;
}

function targetsForObjective(index, objective, sideKey) {
  const requested = new Set(objective.targetIds || []);
  if (requested.size > 0) {
    return index.filter((entry) => entry.ids.some((id) => requested.has(id)));
  }
  if (new Set(["maximize_engagement", "surround_target", "avoid_threat",
    "screen"]).has(objective.kind)) {
    return index.filter((entry) => entry.kind === "model"
      && entry.sideKey && entry.sideKey !== sideKey);
  }
  if (objective.kind === "control_objective") {
    return index.filter((entry) => entry.kind === "mission_marker");
  }
  return [];
}

function targetEdgeDistance(footprint, target) {
  if (target.footprint) {
    return evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: target.footprint,
    }).minimumSeparationMilliInches;
  }
  const center = footprintCenter(footprint);
  return center && target.point ? Math.hypot(
    center.xMilliInches - target.point.xMilliInches,
    center.yMilliInches - target.point.yMilliInches,
  ) : Infinity;
}

function angleDistance(left, right) {
  const raw = Math.abs(left - right) % (Math.PI * 2);
  return Math.min(raw, (Math.PI * 2) - raw);
}

function pointToSegmentDistance(point, start, end) {
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  if (dx === 0 && dy === 0) return Math.hypot(
    point.xMilliInches - start.xMilliInches,
    point.yMilliInches - start.yMilliInches,
  );
  const fraction = Math.max(0, Math.min(1, (
    ((point.xMilliInches - start.xMilliInches) * dx)
      + ((point.yMilliInches - start.yMilliInches) * dy)
  ) / ((dx * dx) + (dy * dy))));
  return Math.hypot(
    point.xMilliInches - (start.xMilliInches + (fraction * dx)),
    point.yMilliInches - (start.yMilliInches + (fraction * dy)),
  );
}

function placementObjectiveScore(input) {
  const { footprint, point, selected, anchor, outward, policy, targetIndex,
    sideKey, scale } = input;
  const leaderDistance = Math.hypot(
    point.xMilliInches - anchor.xMilliInches,
    point.yMilliInches - anchor.yMilliInches,
  );
  const pairwiseSeparation = selected.length > 0 ? Math.min(...selected.map((entry) =>
    evaluateOfficialPhysicalFootprintRelationV1({
      left: footprint,
      right: entry.footprint,
    }).minimumSeparationMilliInches)) : 0;
  const outwardProjection = ((point.xMilliInches - anchor.xMilliInches)
    * outward.x) + ((point.yMilliInches - anchor.yMilliInches) * outward.y);
  let score = 0;
  for (const objective of policy.objectives) {
    const targets = targetsForObjective(targetIndex, objective, sideKey);
    const targetDistance = targets.length > 0
      ? Math.min(...targets.map((entry) => targetEdgeDistance(footprint, entry)))
      : scale;
    let value = 0;
    if (objective.kind === "balanced") {
      value = (outwardProjection / scale) - (0.2 * leaderDistance / scale)
        + (0.35 * pairwiseSeparation / scale);
    } else if (objective.kind === "advance") {
      value = outwardProjection / scale;
    } else if (objective.kind === "compact") {
      value = -leaderDistance / scale;
    } else if (objective.kind === "disperse") {
      value = pairwiseSeparation / scale;
    } else if (objective.kind === "maximize_engagement") {
      value = -(targetDistance / scale) + (targetDistance <= 1_000 ? 2 : 0);
    } else if (objective.kind === "avoid_threat") {
      value = targetDistance / scale;
    } else if (objective.kind === "control_objective") {
      value = -(targetDistance / scale) + (targetDistance <= 3_000 ? 1 : 0);
    } else if (objective.kind === "surround_target") {
      const target = targets[0]?.point;
      const candidateAngle = target ? Math.atan2(
        point.yMilliInches - target.yMilliInches,
        point.xMilliInches - target.xMilliInches,
      ) : 0;
      const occupiedAngles = target ? selected.map((entry) => Math.atan2(
        entry.point.yMilliInches - target.yMilliInches,
        entry.point.xMilliInches - target.xMilliInches,
      )) : [];
      const angularNovelty = occupiedAngles.length > 0
        ? Math.min(...occupiedAngles.map((entry) =>
          angleDistance(candidateAngle, entry))) / Math.PI : 1;
      value = angularNovelty - (0.35 * targetDistance / scale);
    } else if (objective.kind === "screen"
      || objective.kind === "preserve_lane") {
      const points = targets.map((entry) => entry.point).filter(Boolean);
      const distance = points.length >= 2
        ? pointToSegmentDistance(point, points[0], points[1]) : targetDistance;
      value = (objective.kind === "screen" ? -distance : distance) / scale;
    }
    score += value * objective.weight;
  }
  const tie = policy.tieBreaker * (
    (-outward.y * (point.xMilliInches - anchor.xMilliInches))
      + (outward.x * (point.yMilliInches - anchor.yMilliInches))
  ) / scale;
  return score + (tie * 0.01);
}

function formationSolverMetrics(selected, input, solverScore) {
  const pairwise = [];
  for (let left = 0; left < selected.length; left += 1) {
    for (let right = left + 1; right < selected.length; right += 1) {
      pairwise.push(evaluateOfficialPhysicalFootprintRelationV1({
        left: selected[left].footprint,
        right: selected[right].footprint,
      }).minimumSeparationMilliInches);
    }
  }
  const enemy = input.targetIndex.filter((entry) => entry.kind === "model"
    && entry.sideKey && entry.sideKey !== input.sideKey);
  const enemyDistances = selected.flatMap((entry) => enemy.map((target) =>
    targetEdgeDistance(entry.footprint, target)));
  const bounds = selected.map((entry) => footprintBounds(entry.footprint));
  const envelope = {
    minimumX: Math.min(...bounds.map((entry) => entry.minimumX)),
    maximumX: Math.max(...bounds.map((entry) => entry.maximumX)),
    minimumY: Math.min(...bounds.map((entry) => entry.minimumY)),
    maximumY: Math.max(...bounds.map((entry) => entry.maximumY)),
  };
  const objectiveMetrics = input.policy.objectives.map((objective) => {
    const targets = targetsForObjective(input.targetIndex, objective,
      input.sideKey);
    const distances = selected.flatMap((entry) => targets.map((target) =>
      targetEdgeDistance(entry.footprint, target)));
    return {
      kind: objective.kind,
      weight: objective.weight,
      targetIds: clone(objective.targetIds),
      resolvedTargetCount: targets.length,
      minimumTargetBaseEdgeDistanceMilliInches:
        distances.length > 0 ? Math.round(Math.min(...distances)) : null,
      modelsWithinOneInchOfTarget: distances.filter((entry) => entry <= 1_000).length,
      modelsWithinThreeInchesOfTarget: distances.filter((entry) => entry <= 3_000).length,
      threatMetricPrecision: objective.kind === "avoid_threat"
        ? "advisory_visible_source_clearance_not_exact_attack_legality"
        : "not_applicable",
    };
  });
  return {
    solverScore: Number(solverScore.toFixed(6)),
    modelCount: selected.length,
    minimumPairwiseBaseSeparationMilliInches:
      pairwise.length > 0 ? Math.round(Math.min(...pairwise)) : null,
    maximumLeaderCenterDistanceMilliInches: Math.round(Math.max(...selected.map(
      (entry) => Math.hypot(
        entry.point.xMilliInches - input.anchor.xMilliInches,
        entry.point.yMilliInches - input.anchor.yMilliInches,
      )))),
    formationEnvelopeMilliInches: envelope,
    formationEnvelopeAreaSquareMilliInches:
      (envelope.maximumX - envelope.minimumX)
        * (envelope.maximumY - envelope.minimumY),
    minimumVisibleEnemyBaseEdgeDistanceMilliInches:
      enemyDistances.length > 0 ? Math.round(Math.min(...enemyDistances)) : null,
    objectiveMetrics,
    physicalGeometryMetricsExact: true,
    tacticalOutcomeIsAdvisoryUntilPreviewAndOpponentResponse: true,
  };
}

function finiteOrFloor(value) {
  if (value === null || value === undefined) return -Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : -Number.MAX_SAFE_INTEGER;
}

function negativeFiniteOrFloor(value) {
  if (value === null || value === undefined) return -Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? -parsed : -Number.MAX_SAFE_INTEGER;
}

function paretoVector(option) {
  const metrics = option.tacticalMetrics || {};
  const axes = [{ name: "weighted_solver_score", maximize: true,
    value: finiteOrFloor(metrics.solverScore) }];
  const objectives = option.formationObjectives || [];
  for (const objective of objectives) {
    const metric = (metrics.objectiveMetrics || []).find((entry) =>
      entry.kind === objective.kind
        && hashStarcraftTmgContract(entry.targetIds || [])
          === hashStarcraftTmgContract(objective.targetIds || []));
    const prefix = `${objective.kind}:${(objective.targetIds || []).join("+")}`;
    if (new Set(["control_objective", "advance", "maximize_engagement",
      "surround_target", "screen"]).has(objective.kind)) {
      axes.push({ name: `${prefix}:models_within_three_inches`, maximize: true,
        value: finiteOrFloor(metric?.modelsWithinThreeInchesOfTarget) });
      axes.push({ name: `${prefix}:negative_target_distance`, maximize: true,
        value: negativeFiniteOrFloor(
          metric?.minimumTargetBaseEdgeDistanceMilliInches) });
    } else if (new Set(["avoid_threat", "preserve_lane"])
      .has(objective.kind)) {
      axes.push({ name: `${prefix}:target_clearance`, maximize: true,
        value: finiteOrFloor(
          metric?.minimumTargetBaseEdgeDistanceMilliInches) });
    } else if (objective.kind === "compact") {
      axes.push({ name: `${prefix}:negative_envelope_area`, maximize: true,
        value: negativeFiniteOrFloor(
          metrics.formationEnvelopeAreaSquareMilliInches) });
    } else if (objective.kind === "disperse") {
      axes.push({ name: `${prefix}:pairwise_clearance`, maximize: true,
        value: finiteOrFloor(
          metrics.minimumPairwiseBaseSeparationMilliInches) });
      axes.push({ name: `${prefix}:envelope_area`, maximize: true,
        value: finiteOrFloor(metrics.formationEnvelopeAreaSquareMilliInches) });
    }
  }
  return axes;
}

function vectorDominates(left, right) {
  if (left.length !== right.length
    || left.some((entry, index) => entry.name !== right[index].name)) {
    return false;
  }
  return left.every((entry, index) => entry.value >= right[index].value)
    && left.some((entry, index) => entry.value > right[index].value);
}

function formationParetoDiversity(options) {
  const groups = new Map();
  for (const option of options) {
    const signature = hashStarcraftTmgContract(
      option.formationObjectives || []);
    const rows = groups.get(signature) || [];
    rows.push({ option, vector: paretoVector(option) });
    groups.set(signature, rows);
  }
  const frontierOptionIds = [];
  const dominatedOptionIds = [];
  const objectiveGroups = [];
  for (const [objectiveSignature, rows] of groups.entries()) {
    const frontier = rows.filter((candidate, index) => !rows.some(
      (other, otherIndex) => otherIndex !== index
        && vectorDominates(other.vector, candidate.vector),
    ));
    const frontierIds = frontier.map((entry) => entry.option.formationOptionId);
    const dominatedIds = rows.map((entry) => entry.option.formationOptionId)
      .filter((optionId) => !frontierIds.includes(optionId));
    frontierOptionIds.push(...frontierIds);
    dominatedOptionIds.push(...dominatedIds);
    objectiveGroups.push({
      objectiveSignature,
      formationObjectives: clone(rows[0]?.option.formationObjectives || []),
      comparedOptionCount: rows.length,
      frontierOptionIds: frontierIds,
      dominatedOptionIds: dominatedIds,
      axisNames: (rows[0]?.vector || []).map((entry) => entry.name),
    });
  }
  return {
    schemaVersion: "starcraft_tmg_formation_pareto_diversity_v1",
    frontierOptionIds,
    dominatedOptionIds,
    objectiveGroups,
    onlySameObjectiveContractsCompared: true,
    exactOptionsHiddenByParetoAnalysis: 0,
    agentMaySelectAnyExposedExactOption: true,
    rulesAuthority: false,
    trainingTruth: false,
  };
}

function solveIntentFormationRows(input) {
  const { state, profiles, anchor, angle, coherencyRangeMilliInches,
    excludedPieceId, sideKey, policy } = input;
  const blockers = Array.isArray(input.blockers)
    ? input.blockers : blockingFootprints(state, excludedPieceId);
  const targetIndex = Array.isArray(input.targetIndex)
    ? input.targetIndex : formationIntentTargetIndex(state, blockers);
  const leaderProfile = profiles[0];
  const leaderPoint = { xMilliInches: anchor.xMilliInches,
    yMilliInches: anchor.yMilliInches };
  const leaderFootprint = footprintAt(leaderProfile, leaderPoint);
  const hardConstraints = {
    sideKey,
    minimumEnemyGapMilliInchesExclusive:
      input.minimumEnemyGapMilliInchesExclusive,
  };
  if (!availablePackedFootprint(leaderFootprint, state, blockers, [],
    hardConstraints)) {
    return null;
  }
  const selected = [{ profile: leaderProfile, footprint: leaderFootprint,
    point: leaderPoint, rotationDegrees: 0 }];
  const spacing = Math.max(200, Math.round(Math.max(...profiles.flatMap((entry) => [
    dimension(entry, "baseWidthMilliInches", "widthMilliInches"),
    dimension(entry, "baseDepthMilliInches", "depthMilliInches"),
  ])) + 20));
  const maximumRing = Math.max(1,
    Math.ceil(coherencyRangeMilliInches / spacing) + 1);
  const rotation = angle + (policy.tieBreaker * Math.PI / 24);
  const outward = { x: Math.cos(angle), y: Math.sin(angle) };
  const lateral = { x: -outward.y, y: outward.x };
  const points = [];
  for (let q = -maximumRing; q <= maximumRing; q += 1) {
    for (let r = -maximumRing; r <= maximumRing; r += 1) {
      if (q === 0 && r === 0) continue;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
      if (ring > maximumRing) continue;
      const localX = spacing * (q + (r / 2));
      const localY = spacing * (Math.sqrt(3) / 2) * r;
      const x = (localX * Math.cos(rotation)) - (localY * Math.sin(rotation));
      const y = (localX * Math.sin(rotation)) + (localY * Math.cos(rotation));
      const distance = Math.hypot(x, y);
      points.push({
        point: {
          xMilliInches: Math.round(anchor.xMilliInches + x),
          yMilliInches: Math.round(anchor.yMilliInches + y),
        },
        ring,
        distance,
        outwardProjection: (x * outward.x) + (y * outward.y),
        lateralProjection: (x * lateral.x) + (y * lateral.y),
      });
    }
  }
  points.sort((left, right) => left.point.xMilliInches - right.point.xMilliInches
    || left.point.yMilliInches - right.point.yMilliInches);
  const used = new Set();
  let solverScore = 0;
  for (const profile of profiles.slice(1).sort((left, right) => (
    dimension(right, "baseWidthMilliInches", "widthMilliInches")
      * dimension(right, "baseDepthMilliInches", "depthMilliInches")
  ) - (
    dimension(left, "baseWidthMilliInches", "widthMilliInches")
      * dimension(left, "baseDepthMilliInches", "depthMilliInches")
  ) || left.modelId.localeCompare(right.modelId))) {
    const maximumCenterDistance = coherencyRangeMilliInches
      + profileRadius(leaderProfile) - profileRadius(profile);
    const rotations = String(profile.baseShape || profile.shape) === "round"
      ? [0] : [0, 45, 90, 135];
    const candidates = [];
    for (const [index, entry] of points.entries()) {
      if (used.has(index) || entry.distance > maximumCenterDistance + 1) continue;
      for (const rotationDegrees of rotations) {
        const footprint = footprintAt(profile, entry.point, rotationDegrees);
        if (!availablePackedFootprint(footprint, state, blockers, selected,
          hardConstraints)) {
          continue;
        }
        candidates.push({
          ...entry,
          index,
          rotationDegrees,
          footprint,
          score: placementObjectiveScore({
            footprint,
            point: entry.point,
            selected,
            anchor,
            outward,
            policy,
            targetIndex,
            sideKey,
            scale: Math.max(1, coherencyRangeMilliInches),
          }),
        });
      }
    }
    candidates.sort((left, right) => right.score - left.score
      || left.ring - right.ring
      || left.rotationDegrees - right.rotationDegrees
      || left.point.xMilliInches - right.point.xMilliInches
      || left.point.yMilliInches - right.point.yMilliInches);
    const candidate = candidates[0];
    if (!candidate) return null;
    used.add(candidate.index);
    solverScore += candidate.score;
    selected.push({ profile, footprint: candidate.footprint, point: candidate.point,
      rotationDegrees: candidate.rotationDegrees });
  }
  const rows = selected.map((entry) => ({
    modelId: entry.profile.modelId,
    xMilliInches: entry.point.xMilliInches,
    yMilliInches: entry.point.yMilliInches,
    rotationDegrees: entry.rotationDegrees,
  }));
  return {
    rows,
    policyId: policy.policyId,
    objectives: clone(policy.objectives),
    metrics: formationSolverMetrics(selected, {
      anchor,
      policy,
      targetIndex,
      sideKey,
    }, solverScore),
  };
}

function candidatePlacementRows(candidate) {
  const parameters = candidate.parameters;
  const plan = object(parameters.placementPlan)
    ? parameters.placementPlan : parameters;
  const endpoint = Array.isArray(plan.path) ? plan.path.at(-1) : null;
  const placements = Array.isArray(plan.placements) ? plan.placements : [];
  if (endpoint) {
    return [{ modelId: plan.leadingModelId || candidate.leadingModelId,
      ...endpoint }, ...placements];
  }
  return placements;
}

function candidatePlacementPrefilterFailure(candidate, profiles, blockers,
  input = {}) {
  const profileById = new Map(profiles.map((profile) =>
    [profile.modelId, profile]));
  for (const position of candidatePlacementRows(candidate)) {
    const profile = profileById.get(position.modelId);
    if (!profile) continue;
    const footprint = physicalFootprint({
      objectId: `candidate:${position.modelId}`,
      kind: "candidate_model_base",
      shape: profile.baseShape || profile.shape,
      center: {
        xMilliInches: Number(position.xMilliInches),
        yMilliInches: Number(position.yMilliInches),
      },
      widthMilliInches: dimension(profile, "baseWidthMilliInches",
        "widthMilliInches"),
      depthMilliInches: dimension(profile, "baseDepthMilliInches",
        "depthMilliInches"),
      rotationDegrees: position.rotationDegrees || 0,
    });
    const bounds = footprintBounds(footprint);
    for (const blocker of blockers) {
      if (boundsMayOverlap(bounds, blocker.bounds)
        && evaluateOfficialPhysicalFootprintRelationV1({
          left: footprint,
          right: blocker.footprint,
        }).overlappingInteriors) return "MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP";
      if (minimumEnemyGapFailure(footprint, blocker, input)) {
        return "RELOCATION_ENEMY_GAP_REQUIRED";
      }
    }
  }
  return null;
}

function deployCandidates(domain, request) {
  const source = sourceDomain(domain);
  const constraints = source.constraints;
  const profiles = constraints.modelProfiles;
  const preferred = preferredAnchor(request, constraints);
  const candidates = [];
  for (const segment of constraints.entrySegments || []) {
    for (const gap of [20, 60, 100]) {
      for (const transform of TRANSFORMS) {
        const offsets = formationOffsets(profiles, gap, transform.apply);
        const bounds = formationBounds(constraints, profiles, offsets);
        const segmentMinimum = Math.round(Number(segment.startInches) * 1000);
        const segmentMaximum = Math.round(Number(segment.endInches) * 1000);
        const maxDistance = Number(constraints.maxDistanceMilliInches);
        if (new Set(["top", "bottom"]).has(segment.side)) {
          bounds.minimumX = Math.max(bounds.minimumX,
            segmentMinimum + bounds.halfWidths[0]);
          bounds.maximumX = Math.min(bounds.maximumX,
            segmentMaximum - bounds.halfWidths[0]);
          if (segment.side === "bottom") {
            bounds.maximumY = Math.min(bounds.maximumY,
              -bounds.halfDepths[0] + maxDistance);
          } else {
            bounds.minimumY = Math.max(bounds.minimumY,
              Number(constraints.battlefieldHeightMilliInches)
                + bounds.halfDepths[0] - maxDistance);
          }
        } else {
          bounds.minimumY = Math.max(bounds.minimumY,
            segmentMinimum + bounds.halfDepths[0]);
          bounds.maximumY = Math.min(bounds.maximumY,
            segmentMaximum - bounds.halfDepths[0]);
          if (segment.side === "left") {
            bounds.maximumX = Math.min(bounds.maximumX,
              -bounds.halfWidths[0] + maxDistance);
          } else {
            bounds.minimumX = Math.max(bounds.minimumX,
              Number(constraints.battlefieldWidthMilliInches)
                + bounds.halfWidths[0] - maxDistance);
          }
        }
        const xs = axisSamples(bounds.minimumX, bounds.maximumX,
          preferred.xMilliInches);
        const ys = axisSamples(bounds.minimumY, bounds.maximumY,
          preferred.yMilliInches);
        for (const centerX of xs) {
          for (const centerY of ys) {
            const rows = rowsAt(profiles, offsets, centerX, centerY);
            candidates.push({
              parameters: {
                leadingModelId: rows[0].modelId,
                entrySegmentId: segment.segmentId,
                entryAlongEdgeMilliInches:
                  new Set(["top", "bottom"]).has(segment.side)
                    ? centerX : centerY,
                path: [rows[0]],
                placements: rows.slice(1),
              },
              patternId: `${transform.id}-gap-${gap}`,
              anchor: { xMilliInches: centerX, yMilliInches: centerY },
            });
          }
        }
      }
    }
  }
  return candidates.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
}

function relocationModelProfiles(state, domain) {
  const source = sourceDomain(domain);
  const piece = (state.pieces || []).find((entry) =>
    entry.id === source.pieceId);
  if (!piece) throw new TypeError("LEGAL_FORMATION_RELOCATION_PIECE_MISSING");
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, piece.officialUnitRecordKey);
  return (piece.models || []).filter((model) =>
    model.isDestroyed !== true
      && (piece.isOnField !== true || model.isOnField !== false))
    .map((model) => {
      const fielded = piece.isOnField === true
        && model.isOnField !== false
        && Number.isFinite(Number(model.xInches))
        && Number.isFinite(Number(model.yInches));
      const width = Number(model.baseWidthInches) * 1000;
      const depth = Number(model.baseDepthInches) * 1000;
      return {
        modelId: model.id,
        baseShape: String(model.baseShape || geometry.baseShape),
        baseWidthMilliInches: Number.isFinite(width) && width > 0
          ? Math.round(width) : geometry.baseWidthMilliInches,
        baseDepthMilliInches: Number.isFinite(depth) && depth > 0
          ? Math.round(depth) : geometry.baseDepthMilliInches,
        startPoint: fielded ? {
          xMilliInches: Math.round(Number(model.xInches) * 1000),
          yMilliInches: Math.round(Number(model.yInches) * 1000),
        } : null,
        startElevation: String(model.elevation || "ground"),
        supportTerrainIds: [...new Set((model.supportTerrainIds || [])
          .map(String))].sort(),
      };
    }).sort((left, right) => left.modelId.localeCompare(right.modelId));
}

function entryEdgeRelocationCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const constraints = {
    ...source.constraints,
    modelProfiles: relocationModelProfiles(state, domain),
    battlefieldWidthMilliInches:
      Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches:
      Math.round(Number(state.board.heightInches) * 1000),
    entrySegments: clone(state.officialDeploymentGeometryBinding
      ?.entryEdgesByPlayer?.[source.sideKey]?.segments || []),
  };
  const profiles = constraints.modelProfiles;
  const preferred = preferredAnchor(request, constraints);
  const candidates = [];
  for (const segment of constraints.entrySegments || []) {
    for (const gap of [20, 60, 100]) {
      for (const transform of TRANSFORMS) {
        const offsets = formationOffsets(profiles, gap, transform.apply);
        const bounds = formationBounds(constraints, profiles, offsets);
        const segmentMinimum = Math.round(Number(segment.startInches) * 1000);
        const segmentMaximum = Math.round(Number(segment.endInches) * 1000);
        const maxDistance = Number(constraints.maxDistanceMilliInches);
        if (new Set(["top", "bottom"]).has(segment.side)) {
          bounds.minimumX = Math.max(bounds.minimumX,
            segmentMinimum + bounds.halfWidths[0]);
          bounds.maximumX = Math.min(bounds.maximumX,
            segmentMaximum - bounds.halfWidths[0]);
          if (segment.side === "bottom") {
            bounds.maximumY = Math.min(bounds.maximumY,
              -bounds.halfDepths[0] + maxDistance);
          } else {
            bounds.minimumY = Math.max(bounds.minimumY,
              Number(constraints.battlefieldHeightMilliInches)
                + bounds.halfDepths[0] - maxDistance);
          }
        } else {
          bounds.minimumY = Math.max(bounds.minimumY,
            segmentMinimum + bounds.halfDepths[0]);
          bounds.maximumY = Math.min(bounds.maximumY,
            segmentMaximum - bounds.halfDepths[0]);
          if (segment.side === "left") {
            bounds.maximumX = Math.min(bounds.maximumX,
              -bounds.halfWidths[0] + maxDistance);
          } else {
            bounds.minimumX = Math.max(bounds.minimumX,
              Number(constraints.battlefieldWidthMilliInches)
                + bounds.halfWidths[0] - maxDistance);
          }
        }
        const xs = axisSamples(bounds.minimumX, bounds.maximumX,
          preferred.xMilliInches);
        const ys = axisSamples(bounds.minimumY, bounds.maximumY,
          preferred.yMilliInches);
        for (const centerX of xs) {
          for (const centerY of ys) {
            const rows = rowsAt(profiles, offsets, centerX, centerY);
            candidates.push({
              parameters: {
                leadingModelId: rows[0].modelId,
                entrySegmentId: segment.segmentId,
                placements: rows,
              },
              patternId: `entry-${segment.side}-${transform.id}-gap-${gap}`,
              anchor: { xMilliInches: centerX, yMilliInches: centerY },
              modelProfiles: profiles,
            });
          }
        }
      }
    }
  }
  return candidates.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
}

function relocationAbilityConstraints(state, domain) {
  const source = sourceDomain(domain);
  return {
    ...source.constraints,
    modelProfiles: relocationModelProfiles(state, domain),
    battlefieldWidthMilliInches:
      Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches:
      Math.round(Number(state.board.heightInches) * 1000),
  };
}

function boundedRelocationAbilityCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const constraints = relocationAbilityConstraints(state, domain);
  return relocationCandidates({ ...source, constraints }, request).map((entry) => ({
    ...entry,
    parameters: {
      leadingModelId: entry.parameters.leadingModelId,
      ...(source.effectKind === "extra_move"
        ? { path: clone(entry.parameters.path) } : {}),
      placements: [
        { modelId: entry.parameters.leadingModelId,
          ...clone(entry.parameters.path.at(-1)) },
        ...clone(entry.parameters.placements),
      ],
    },
    modelProfiles: constraints.modelProfiles,
  }));
}

function friendlyAnchorRelocationCandidates(state, domain) {
  const source = sourceDomain(domain);
  const profiles = relocationModelProfiles(state, domain);
  const leading = profiles[0];
  const anchors = blockingFootprints(state, source.pieceId).filter((entry) =>
    entry.kind === "model" && entry.sideKey === source.sideKey);
  const angles = Array.from({ length: 24 }, (_, index) =>
    (Math.PI * 2 * index) / 24);
  return anchors.flatMap((entry) => angles.flatMap((angle) => {
    const anchor = contactAnchor(leading, entry.footprint, angle);
    if (!anchor) return [];
    return [{
      parameters: {
        leadingModelId: leading.modelId,
        anchorPieceId: entry.pieceId,
        anchorModelId: entry.modelId,
        placements: [{ modelId: leading.modelId, ...anchor }],
      },
      patternId: `friendly-anchor:${entry.pieceId}:${entry.modelId}`,
      anchor,
      modelProfiles: profiles,
    }];
  }));
}

function nonEntryEdgeRelocationCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const constraints = relocationAbilityConstraints(state, domain);
  const profiles = constraints.modelProfiles;
  const leading = profiles[0];
  const preferred = preferredAnchor(request, constraints);
  const sides = source.parameterSchema?.edgeSide?.enum || [];
  const maximum = Number(constraints.maxDistanceMilliInches);
  const halfWidth = dimension(leading, "baseWidthMilliInches", "widthMilliInches") / 2;
  const halfDepth = dimension(leading, "baseDepthMilliInches", "depthMilliInches") / 2;
  const acrossX = axisSamples(halfWidth,
    constraints.battlefieldWidthMilliInches - halfWidth,
    preferred.xMilliInches, 2_000);
  const acrossY = axisSamples(halfDepth,
    constraints.battlefieldHeightMilliInches - halfDepth,
    preferred.yMilliInches, 2_000);
  const candidates = [];
  for (const edgeSide of sides) {
    const anchors = new Set();
    if (edgeSide === "left" || edgeSide === "right") {
      const inward = [halfWidth, Math.max(halfWidth, maximum - halfWidth)];
      for (const yMilliInches of acrossY) for (const distance of inward) {
        const xMilliInches = edgeSide === "left" ? distance
          : constraints.battlefieldWidthMilliInches - distance;
        anchors.add(`${Math.round(xMilliInches)}:${Math.round(yMilliInches)}`);
      }
    } else {
      const inward = [halfDepth, Math.max(halfDepth, maximum - halfDepth)];
      for (const xMilliInches of acrossX) for (const distance of inward) {
        const yMilliInches = edgeSide === "bottom" ? distance
          : constraints.battlefieldHeightMilliInches - distance;
        anchors.add(`${Math.round(xMilliInches)}:${Math.round(yMilliInches)}`);
      }
    }
    for (const value of anchors) {
      const [xMilliInches, yMilliInches] = value.split(":").map(Number);
      candidates.push({
        parameters: {
          leadingModelId: leading.modelId,
          edgeSide,
          placements: [{ modelId: leading.modelId,
            xMilliInches, yMilliInches }],
        },
        patternId: `non-entry-edge:${edgeSide}`,
        anchor: { xMilliInches, yMilliInches },
        modelProfiles: profiles,
      });
    }
  }
  return candidates;
}

function relocationAbilityCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  if (!RELOCATION_FORMATION_EFFECTS.has(source.effectKind)) {
    throw new TypeError("LEGAL_FORMATION_RELOCATION_EFFECT_UNSUPPORTED");
  }
  if (source.effectKind === "entry_edge_place") {
    return entryEdgeRelocationCandidates(state, domain, request);
  }
  if (new Set(["extra_move", "direct_place"]).has(source.effectKind)) {
    return boundedRelocationAbilityCandidates(state, domain, request);
  }
  if (source.effectKind === "friendly_anchor_place") {
    return friendlyAnchorRelocationCandidates(state, domain);
  }
  if (source.effectKind === "non_entry_edge_deploy") {
    return nonEntryEdgeRelocationCandidates(state, domain, request);
  }
  throw new TypeError("LEGAL_FORMATION_RELOCATION_EFFECT_UNSUPPORTED");
}

function relocationCandidates(domain, request) {
  const source = sourceDomain(domain);
  const constraints = source.constraints;
  const profiles = constraints.modelProfiles;
  const preferred = preferredAnchor(request, constraints);
  const start = profiles[0]?.startPoint;
  if (!object(start)) return [];
  const maximum = Number(constraints.maxDistanceMilliInches);
  const candidates = [];
  for (const gap of [20, 60, 100]) {
    for (const transform of TRANSFORMS) {
      const offsets = formationOffsets(profiles, gap, transform.apply);
      const bounds = formationBounds(constraints, profiles, offsets);
      const xs = axisSamples(Math.max(bounds.minimumX,
        Number(start.xMilliInches) - maximum), Math.min(bounds.maximumX,
      Number(start.xMilliInches) + maximum), preferred.xMilliInches);
      const ys = axisSamples(Math.max(bounds.minimumY,
        Number(start.yMilliInches) - maximum), Math.min(bounds.maximumY,
      Number(start.yMilliInches) + maximum), preferred.yMilliInches);
      for (const centerX of xs) {
        for (const centerY of ys) {
          const travelled = Math.hypot(centerX - Number(start.xMilliInches),
            centerY - Number(start.yMilliInches));
          if (travelled <= 1 || travelled > maximum) continue;
          const rows = rowsAt(profiles, offsets, centerX, centerY);
          candidates.push({
            parameters: {
              leadingModelId: rows[0].modelId,
              path: [rows[0]],
              placements: rows.slice(1),
            },
            patternId: `${transform.id}-gap-${gap}`,
            anchor: { xMilliInches: centerX, yMilliInches: centerY },
          });
        }
      }
    }
  }
  return candidates.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
}

function chargeResolutionCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const constraints = source.constraints;
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  if (!actor) throw new TypeError("LEGAL_FORMATION_CHARGE_PIECE_MISSING");
  const leadingModelId = String(constraints.leadingModelId || "");
  const allProfiles = relocationModelProfiles(state, domain);
  const leadingProfile = allProfiles.find((entry) =>
    entry.modelId === leadingModelId);
  if (!leadingProfile || !object(leadingProfile.startPoint)) {
    throw new TypeError("LEGAL_FORMATION_CHARGE_LEADING_MODEL_MISSING");
  }
  const profiles = [leadingProfile, ...allProfiles.filter((entry) =>
    entry.modelId !== leadingModelId)];
  const blockers = blockingFootprints(state, source.pieceId);
  const declaredTargets = (constraints.declaredTargets || []).map((target) => {
    const blocker = blockers.find((entry) => entry.kind === "model"
      && entry.pieceId === target.unitId && entry.modelId === target.modelId);
    if (!blocker) {
      throw new TypeError("LEGAL_FORMATION_CHARGE_TARGET_MISSING");
    }
    return { ...clone(target), blocker };
  });
  if (declaredTargets.length < 1) {
    throw new TypeError("LEGAL_FORMATION_CHARGE_TARGET_MISSING");
  }
  const targetIds = [...new Set(declaredTargets.flatMap((entry) =>
    [String(entry.unitId), String(entry.modelId)]))];
  const requiredSpatialConstraints = {
    declaredTargets: clone(constraints.declaredTargets || []),
    allDeclaredTargetsMustBeEngaged:
      constraints.allDeclaredTargetsMustBeEngaged === true,
    undeclaredEnemyEngagementProhibited:
      constraints.undeclaredEnemyEngagementProhibited === true,
    closestPositionRequiredUnlessBaseToBase: true,
    remainingPlacementPriority:
      clone(constraints.remainingPlacementPriority || []),
  };
  const leadingStartFootprint = footprintAt(leadingProfile,
    leadingProfile.startPoint);
  const impossibleTargets = declaredTargets.filter((entry) => {
    const gap = evaluateOfficialPhysicalFootprintRelationV1({
      left: leadingStartFootprint,
      right: entry.blocker.footprint,
    }).minimumSeparationMilliInches;
    return Math.max(0, gap - 1_000)
      > Number(constraints.maxDistanceMilliInches) + 1;
  });
  if (impossibleTargets.length > 0) {
    return [{
      parameters: {
        outcome: "failure",
        failureProof: { kind: "distance_shortfall" },
      },
      patternId: "charge-failure:distance-shortfall",
      solverPolicyId: "rules-proven-distance-shortfall",
      formationObjectives: normalizeFormationObjectives(request),
      tacticalMetrics: {
        outcome: "failure",
        proofKind: "distance_shortfall",
        impossibleTargetIds: impossibleTargets.map((entry) => entry.modelId),
        physicalGeometryMetricsExact: true,
        tacticalOutcomeIsAdvisoryUntilPreviewAndOpponentResponse: false,
      },
      anchor: clone(leadingProfile.startPoint),
      modelProfiles: profiles,
      leadingModelId,
      requiredSpatialConstraints,
      sameAnchorAlternativesMeaningful: false,
    }];
  }
  const requestedObjectives = normalizeFormationObjectives(request);
  const requiredEngagementObjective = {
    kind: "maximize_engagement",
    weight: 5,
    targetIds,
  };
  const policies = formationSolverPolicies([
    requiredEngagementObjective,
    ...requestedObjectives.filter((entry) => entry.kind !== "maximize_engagement"
      || entry.targetIds.join("\u0000") !== targetIds.join("\u0000")),
  ]);
  const angles = Array.from({ length: 48 }, (_, index) =>
    (Math.PI * 2 * index) / 48);
  const rotations = String(leadingProfile.baseShape || leadingProfile.shape)
    === "round" ? [0] : [0, 45, 90, 135];
  const candidates = [];
  const generationLimit = Math.max(24, Math.min(192,
    Number(request.maximumOptions || DEFAULT_MAX_OPTIONS) * 24));
  for (const target of declaredTargets) {
    const targetPoint = footprintCenter(target.blocker.footprint);
    for (const rotationDegrees of rotations) {
      const contactSeeds = angles.map((angle) => ({
        kind: "base_contact",
        anchor: contactAnchor(leadingProfile, target.blocker.footprint,
          angle, rotationDegrees),
      }));
      const directAngle = Math.atan2(
        targetPoint.yMilliInches - leadingProfile.startPoint.yMilliInches,
        targetPoint.xMilliInches - leadingProfile.startPoint.xMilliInches,
      );
      const closestPositionSeeds = [-12, -9, -6, -3, 0, 3, 6, 9, 12]
        .map((offsetDegrees) => ({
          kind: "maximum_distance_closest_position",
          anchor: pointAtDistance(leadingProfile.startPoint,
            directAngle + ((offsetDegrees * Math.PI) / 180),
            Number(constraints.maxDistanceMilliInches)),
        }));
      const seenAnchors = new Set();
      for (const seed of [...contactSeeds, ...closestPositionSeeds]) {
        const anchor = seed.anchor;
        if (!anchor) continue;
        const anchorKey = `${anchor.xMilliInches}:${anchor.yMilliInches}`;
        if (seenAnchors.has(anchorKey)) continue;
        seenAnchors.add(anchorKey);
        const travelled = Math.hypot(
          anchor.xMilliInches - leadingProfile.startPoint.xMilliInches,
          anchor.yMilliInches - leadingProfile.startPoint.yMilliInches,
        );
        if (travelled <= 1
          || travelled > Number(constraints.maxDistanceMilliInches) + 1) continue;
        const movementAngle = Math.atan2(
          anchor.yMilliInches - leadingProfile.startPoint.yMilliInches,
          anchor.xMilliInches - leadingProfile.startPoint.xMilliInches,
        );
        for (const policy of policies) {
          const solved = solveIntentFormationRows({
            state,
            profiles,
            anchor,
            angle: movementAngle,
            coherencyRangeMilliInches:
              Number(constraints.coherencyRangeMilliInches),
            excludedPieceId: source.pieceId,
            sideKey: source.sideKey || actor.sideKey,
            policy,
          });
          if (!solved) continue;
          const rows = solved.rows;
          const pathEndpoint = Object.fromEntries(Object.entries(rows[0])
            .filter(([key]) => key !== "modelId"));
          candidates.push({
            parameters: {
              outcome: "success",
              path: [pathEndpoint],
              placements: rows.slice(1),
            },
            patternId: `intent-solver:${solved.policyId}`,
            solverPolicyId: solved.policyId,
            formationObjectives: solved.objectives,
            tacticalMetrics: solved.metrics,
            anchor,
            modelProfiles: profiles,
            leadingModelId,
            requiredSpatialConstraints,
            targetAnchor: {
              unitId: target.unitId,
              modelId: target.modelId,
              point: targetPoint,
              seedKind: seed.kind,
            },
            sameAnchorAlternativesMeaningful: true,
          });
          if (candidates.length >= generationLimit) return candidates;
        }
      }
    }
  }
  return candidates;
}

function summonedUnitProfiles(state, source) {
  const recordKey = String(source.constraints?.createdUnitRecordKey || "");
  const combat = state.officialCombatProfileBundle?.profilesByRecordKey?.[recordKey]
    || state.officialGameplayDataBundle?.combatProfileBundle
      ?.profilesByRecordKey?.[recordKey];
  const tier = combat?.squadProfile?.find((entry) =>
    Number.isSafeInteger(Number(entry.maximumModels))
      && Number(entry.maximumModels) > 0);
  if (!tier) throw new TypeError("LEGAL_FORMATION_SUMMON_PROFILE_MISSING");
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, recordKey);
  const ordinal = (state.pieces || []).filter((entry) =>
    entry.isSummoned === true).length + 1;
  const pieceId = `summoned:${state.round}:roachling:${ordinal}`;
  return Array.from({ length: Number(tier.maximumModels) }, (_, index) => ({
    modelId: `${pieceId}-model-${index + 1}`,
    baseShape: geometry.baseShape,
    baseWidthMilliInches: geometry.baseWidthMilliInches,
    baseDepthMilliInches: geometry.baseDepthMilliInches,
  }));
}

function firstPaymentSelection(source) {
  const options = [...(source.parameterSchema
    ?.paymentCardInstanceIds?.enum || [])].sort((left, right) =>
    left.length - right.length || left.join("|").localeCompare(right.join("|")));
  return clone(options[0] || []);
}

function summonCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  if (source.effectKind !== "summon_roachling") {
    throw new TypeError("LEGAL_FORMATION_LIFECYCLE_EFFECT_UNSUPPORTED");
  }
  const actor = (state.pieces || []).find((entry) =>
    entry.id === source.pieceId);
  const parentModels = (actor?.models || []).filter((entry) =>
    entry.isOnField !== false && entry.isDestroyed !== true
      && Number.isFinite(Number(entry.xInches))
      && Number.isFinite(Number(entry.yInches)));
  if (!actor || parentModels.length < 1) {
    throw new TypeError("LEGAL_FORMATION_SUMMON_PARENT_MISSING");
  }
  const profiles = summonedUnitProfiles(state, source);
  const preferred = preferredAnchor(request, {
    battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
  });
  const paymentCardInstanceIds = firstPaymentSelection(source);
  const objectives = normalizeFormationObjectives(request);
  const policies = formationSolverPolicies(objectives);
  const generationLimit = Math.max(8, Math.min(32,
    Number(request.maximumOptions || DEFAULT_MAX_OPTIONS) * 3));
  const leadingRadius = Math.max(
    dimension(profiles[0], "baseWidthMilliInches", "widthMilliInches"),
    dimension(profiles[0], "baseDepthMilliInches", "depthMilliInches"),
  ) / 2;
  const candidates = [];
  const angles = Array.from({ length: 16 }, (_, index) =>
    (Math.PI * 2 * index) / 16);
  for (const parent of parentModels) {
    const parentRadius = Math.max(Number(parent.baseWidthInches || 0),
      Number(parent.baseDepthInches || 0)) * 500;
    const contactDistance = parentRadius + leadingRadius;
    for (const angle of angles) {
      const anchor = {
        xMilliInches: Math.round(Number(parent.xInches) * 1000
          + Math.cos(angle) * contactDistance),
        yMilliInches: Math.round(Number(parent.yInches) * 1000
          + Math.sin(angle) * contactDistance),
      };
      for (const policy of policies) {
          const solved = solveIntentFormationRows({
            state,
            profiles,
            anchor,
            angle,
            coherencyRangeMilliInches: 3_000,
            excludedPieceId: null,
            sideKey: actor.sideKey,
            policy,
          });
          if (!solved) continue;
          const rows = solved.rows;
          candidates.push({
            parameters: {
              activeUnitId: source.pieceId,
              paymentCardInstanceIds,
              parentContactModelId: parent.id,
              placementPlan: {
                leadingModelId: rows[0].modelId,
                placements: rows,
              },
            },
            patternId: `intent-solver:${solved.policyId}`,
            solverPolicyId: solved.policyId,
            formationObjectives: solved.objectives,
            tacticalMetrics: solved.metrics,
            anchor,
            modelProfiles: profiles,
            parentContactModelId: parent.id,
            sameAnchorAlternativesMeaningful: true,
          });
          if (candidates.length >= generationLimit) {
            return candidates.sort((left, right) => Math.hypot(
              left.anchor.xMilliInches - preferred.xMilliInches,
              left.anchor.yMilliInches - preferred.yMilliInches,
            ) - Math.hypot(
              right.anchor.xMilliInches - preferred.xMilliInches,
              right.anchor.yMilliInches - preferred.yMilliInches,
            ) || left.patternId.localeCompare(right.patternId));
          }
      }
    }
  }
  return candidates.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
}

function phasePrismCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  if (!actor) throw new TypeError("LEGAL_FORMATION_PHASE_PRISM_ACTOR_MISSING");
  const profiles = reservePieceProfiles(actor);
  const objectives = normalizeFormationObjectives(request);
  const policies = formationSolverPolicies(objectives);
  const paymentCardInstanceIds = firstPaymentSelection(source);
  const targetIds = source.parameterSchema?.targetUnitId?.enum || [];
  const targets = (state.pieces || []).filter((entry) =>
    targetIds.includes(entry.id) && entry.isOnField === true)
    .flatMap((piece) => (piece.models || []).filter((model) =>
      model.isDestroyed !== true && model.isOnField !== false)
      .map((model) => ({ piece, model, blocker: blockingFootprints(
        state, source.pieceId).find((entry) => entry.modelId === model.id) }))
      .filter((entry) => entry.blocker));
  const angles = Array.from({ length: 24 }, (_, index) =>
    (Math.PI * 2 * index) / 24);
  const candidates = [];
  const limit = Math.max(12, Math.min(64,
    Number(request.maximumOptions || DEFAULT_MAX_OPTIONS) * 8));
  for (const target of targets) {
    for (const angle of angles) {
      const anchor = contactAnchor(profiles[0], target.blocker.footprint, angle);
      if (!anchor) continue;
      for (const policy of policies) {
        const solved = solveIntentFormationRows({
          state,
          profiles,
          anchor,
          angle,
          coherencyRangeMilliInches: horizontalCoherencyRange(state, actor),
          excludedPieceId: source.pieceId,
          sideKey: source.sideKey || actor.sideKey,
          policy,
        });
        if (!solved) continue;
        candidates.push({
          parameters: {
            activeUnitId: source.pieceId,
            paymentCardInstanceIds,
            targetUnitId: target.piece.id,
            targetContactModelId: target.model.id,
            placementPlan: {
              leadingModelId: solved.rows[0].modelId,
              placements: solved.rows,
            },
          },
          patternId: `intent-solver:${solved.policyId}`,
          solverPolicyId: solved.policyId,
          formationObjectives: solved.objectives,
          tacticalMetrics: solved.metrics,
          anchor,
          modelProfiles: profiles,
          parentContactModelId: target.model.id,
          sameAnchorAlternativesMeaningful: true,
        });
        if (candidates.length >= limit) return candidates;
      }
    }
  }
  return candidates;
}

function profilesForPieceModels(state, piece, models) {
  const geometry = getOfficialModelBaseGeometryProfileV1(
    state.officialModelBaseGeometryDataBundle, piece.officialUnitRecordKey);
  return models.map((model) => {
    const width = Number(model.baseWidthInches) * 1000;
    const depth = Number(model.baseDepthInches) * 1000;
    return {
      modelId: model.id,
      baseShape: String(model.baseShape || geometry.baseShape),
      baseWidthMilliInches: Number.isFinite(width) && width > 0
        ? Math.round(width) : geometry.baseWidthMilliInches,
      baseDepthMilliInches: Number.isFinite(depth) && depth > 0
        ? Math.round(depth) : geometry.baseDepthMilliInches,
    };
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
}

function respawnRowsForPolicy(input) {
  const { state, actor, profiles, activeModels, policy } = input;
  const otherBlockers = blockingFootprints(state, actor.id);
  const ownBlockers = activeModels.map((model) => {
    const footprint = physicalFootprint({
      objectId: model.id,
      kind: "model_base",
      shape: model.baseShape,
      center: {
        xMilliInches: Math.round(Number(model.xInches) * 1000),
        yMilliInches: Math.round(Number(model.yInches) * 1000),
      },
      widthMilliInches: Math.round(Number(model.baseWidthInches) * 1000),
      depthMilliInches: Math.round(Number(model.baseDepthInches) * 1000),
      rotationDegrees: model.baseRotationDegrees || 0,
    });
    return { pieceId: actor.id, modelId: model.id, sideKey: actor.sideKey,
      kind: "model", footprint, bounds: footprintBounds(footprint) };
  });
  const blockers = [...otherBlockers, ...ownBlockers];
  const targetIndex = formationIntentTargetIndex(state, otherBlockers);
  const selected = [];
  const rows = [];
  const angles = Array.from({ length: 24 }, (_, index) =>
    (Math.PI * 2 * index) / 24);
  const actorCenter = {
    xMilliInches: Math.round(activeModels.reduce((sum, model) =>
      sum + Number(model.xInches) * 1000, 0) / activeModels.length),
    yMilliInches: Math.round(activeModels.reduce((sum, model) =>
      sum + Number(model.yInches) * 1000, 0) / activeModels.length),
  };
  for (const profile of profiles) {
    const options = [];
    for (const own of ownBlockers) {
      const ownPoint = footprintCenter(own.footprint);
      for (const angle of angles) {
        const point = contactAnchor(profile, own.footprint, angle);
        if (!point) continue;
        const footprint = footprintAt(profile, point);
        if (!availablePackedFootprint(footprint, state, blockers, selected)) continue;
        const outwardAngle = Math.atan2(
          ownPoint.yMilliInches - actorCenter.yMilliInches,
          ownPoint.xMilliInches - actorCenter.xMilliInches,
        );
        options.push({
          point,
          footprint,
          contactModelId: own.modelId,
          score: placementObjectiveScore({
            footprint,
            point,
            selected,
            anchor: actorCenter,
            outward: { x: Math.cos(outwardAngle), y: Math.sin(outwardAngle) },
            policy,
            targetIndex,
            sideKey: actor.sideKey,
            scale: 3_000,
          }),
        });
      }
    }
    options.sort((left, right) => right.score - left.score
      || left.contactModelId.localeCompare(right.contactModelId)
      || left.point.xMilliInches - right.point.xMilliInches
      || left.point.yMilliInches - right.point.yMilliInches);
    const chosen = options[0];
    if (!chosen) return null;
    selected.push({ profile, footprint: chosen.footprint, point: chosen.point,
      rotationDegrees: 0 });
    rows.push({ modelId: profile.modelId,
      xMilliInches: chosen.point.xMilliInches,
      yMilliInches: chosen.point.yMilliInches,
      rotationDegrees: 0,
      contactModelId: chosen.contactModelId });
  }
  return { rows, selected, actorCenter };
}

function respawnCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  const active = (actor?.models || []).filter((model) =>
    model.isDestroyed !== true && model.isOnField !== false);
  const destroyed = (actor?.models || []).filter((model) =>
    model.isDestroyed === true && model.isOnField === false
      && (actor.destroyedModelIds || []).includes(model.id));
  if (!actor || active.length < 1 || destroyed.length < 1) {
    throw new TypeError("LEGAL_FORMATION_RESPAWN_DENOMINATOR_MISSING");
  }
  const carrier = state.officialRespawnMorphDataBundle
    ?.currentRespawnCarriers?.find((entry) =>
      entry.recordKey === actor.officialUnitRecordKey);
  const maximumReturn = Math.min(destroyed.length, Math.max(
    Number(carrier?.baseRespawnValue || 1),
    Number(carrier?.onCreepRespawnValue || 1),
  ));
  const policies = formationSolverPolicies(normalizeFormationObjectives(request));
  const candidates = [];
  for (let count = maximumReturn; count >= 1; count -= 1) {
    const profiles = profilesForPieceModels(state, actor, destroyed.slice(0, count));
    for (const policy of policies) {
      const solved = respawnRowsForPolicy({
        state, actor, profiles, activeModels: active, policy,
      });
      if (!solved) continue;
      candidates.push({
        parameters: {
          activeUnitId: source.pieceId,
          paymentCardInstanceIds: firstPaymentSelection(source),
          placementPlan: {
            leadingModelId: solved.rows[0].modelId,
            placements: solved.rows,
          },
        },
        patternId: `intent-solver:${policy.policyId}:respawn-${count}`,
        solverPolicyId: policy.policyId,
        formationObjectives: clone(policy.objectives),
        tacticalMetrics: formationSolverMetrics(solved.selected, {
          anchor: solved.actorCenter,
          policy,
          targetIndex: formationIntentTargetIndex(state,
            blockingFootprints(state, actor.id)),
          sideKey: actor.sideKey,
        }, 0),
        anchor: solved.actorCenter,
        modelProfiles: profiles,
        sameAnchorAlternativesMeaningful: true,
      });
    }
  }
  return candidates;
}

function lifecycleAbilityCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  if (!LIFECYCLE_ABILITY_FORMATION_EFFECTS.has(source.effectKind)) {
    throw new TypeError("LEGAL_FORMATION_LIFECYCLE_EFFECT_UNSUPPORTED");
  }
  if (source.effectKind === "summon_roachling") {
    return summonCandidates(state, domain, request);
  }
  if (source.effectKind === "phase_prism_swap") {
    return phasePrismCandidates(state, domain, request);
  }
  if (source.effectKind === "respawn_models") {
    return respawnCandidates(state, domain, request);
  }
  throw new TypeError("LEGAL_FORMATION_LIFECYCLE_EFFECT_UNSUPPORTED");
}

function reservePieceProfiles(piece) {
  const profiles = (piece?.models || []).filter((entry) =>
    entry.isDestroyed !== true).map((entry) => ({
    modelId: String(entry.id),
    baseShape: String(entry.baseShape || "round"),
    baseWidthMilliInches: Math.round(Number(entry.baseWidthInches) * 1000),
    baseDepthMilliInches: Math.round(Number(entry.baseDepthInches) * 1000),
  }));
  if (profiles.length < 1 || profiles.some((entry) =>
    !entry.modelId || !Number.isSafeInteger(entry.baseWidthMilliInches)
      || entry.baseWidthMilliInches <= 0
      || !Number.isSafeInteger(entry.baseDepthMilliInches)
      || entry.baseDepthMilliInches <= 0)) {
    throw new TypeError("LEGAL_FORMATION_RESERVE_PROFILE_MISSING");
  }
  return profiles;
}

function lifecycleConsumerCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  const effectKind = String(source.effectKind || "");
  if (!LIFECYCLE_CONSUMER_FORMATION_EFFECTS.has(effectKind)) {
    throw new TypeError("LEGAL_FORMATION_LIFECYCLE_CONSUMER_UNSUPPORTED");
  }
  const target = (state.pieces || []).find((entry) =>
    entry.id === source.pieceId);
  if (!target) throw new TypeError("LEGAL_FORMATION_RESERVE_TARGET_MISSING");
  const profiles = reservePieceProfiles(target);
  const coherencyRangeMilliInches = horizontalCoherencyRange(state, target);
  const objectives = normalizeFormationObjectives(request);
  const policies = formationSolverPolicies(objectives);
  const generationLimit = Math.max(8, Math.min(32,
    Number(request.maximumOptions || DEFAULT_MAX_OPTIONS) * 3));
  if (effectKind === "shade_round_end_place") {
    const token = (state.board?.tokens || []).find((entry) =>
      String(entry.tokenId || entry.id) === String(source.sourceInstanceId));
    const point = boardPoint(token);
    const diameter = Number(token?.baseDiameterInches
      || token?.baseWidthInches
      || (Number(token?.baseDiameterMm) / 25.4));
    if (!token || !point || !Number.isFinite(diameter) || diameter <= 0) {
      throw new TypeError("LEGAL_FORMATION_SHADE_TOKEN_MISSING");
    }
    const leaderRadius = profileRadius(profiles[0]);
    const tokenRadius = Math.round(diameter * 500);
    const anchors = [{ point, angle: 0, gap: "token_center" }];
    for (const gapMilliInches of [0, 1_500, 3_000]) {
      for (let index = 0; index < 24; index += 1) {
        const angle = (Math.PI * 2 * index) / 24;
        anchors.push({
          point: pointAtDistance(point, angle,
            tokenRadius + leaderRadius + gapMilliInches),
          angle,
          gap: `${gapMilliInches}`,
        });
      }
    }
    const candidates = [];
    for (const anchor of anchors) {
      for (const policy of policies) {
        const solved = solveIntentFormationRows({
          state,
          profiles,
          anchor: anchor.point,
          angle: anchor.angle,
          coherencyRangeMilliInches,
          excludedPieceId: target.id,
          sideKey: target.sideKey,
          policy,
        });
        if (!solved) continue;
        candidates.push({
          parameters: {
            activeUnitId: source.pieceId,
            placementPlan: {
              leadingModelId: solved.rows[0].modelId,
              placements: solved.rows,
            },
          },
          patternId: `intent-solver:${solved.policyId}:shade-gap-${anchor.gap}`,
          solverPolicyId: solved.policyId,
          formationObjectives: solved.objectives,
          tacticalMetrics: solved.metrics,
          anchor: anchor.point,
          modelProfiles: profiles,
          sameAnchorAlternativesMeaningful: true,
        });
        if (candidates.length >= generationLimit) return candidates;
      }
    }
    return candidates;
  }
  if (effectKind === "reserve_indicator_deploy") {
    const marker = (state.board?.markers || []).find((entry) => (
      String(entry.markerId || entry.id) === String(source.sourceInstanceId)));
    if (!marker || !Number.isFinite(Number(marker.coordinate?.x))
      || !Number.isFinite(Number(marker.coordinate?.y))) {
      throw new TypeError("LEGAL_FORMATION_RESERVE_INDICATOR_MISSING");
    }
    const anchor = {
      xMilliInches: Math.round(Number(marker.coordinate.x) * 1000),
      yMilliInches: Math.round(Number(marker.coordinate.y) * 1000),
    };
    const candidates = [];
    const angles = Array.from({ length: 16 }, (_, index) =>
      (Math.PI * 2 * index) / 16);
    for (const angle of angles) {
      for (const policy of policies) {
            const solved = solveIntentFormationRows({
              state,
              profiles,
              anchor,
              angle,
              coherencyRangeMilliInches,
              excludedPieceId: target.id,
              sideKey: target.sideKey,
              policy,
            });
            if (!solved) continue;
            const rows = solved.rows;
            candidates.push({
              parameters: {
                activeUnitId: source.pieceId,
                placementPlan: {
                  leadingModelId: rows[0].modelId,
                  placements: rows,
                },
              },
              patternId: `intent-solver:${solved.policyId}`,
              solverPolicyId: solved.policyId,
              formationObjectives: solved.objectives,
              tacticalMetrics: solved.metrics,
              anchor,
              modelProfiles: profiles,
              sameAnchorAlternativesMeaningful: true,
            });
            if (candidates.length >= generationLimit) return candidates;
      }
    }
    return candidates;
  }
  const entrySource = (state.pieces || []).find((entry) =>
    entry.id === source.constraints.sourcePieceId);
  const sourceModels = (entrySource?.models || []).filter((entry) =>
    entry.isOnField !== false && entry.isDestroyed !== true
      && Number.isFinite(Number(entry.xInches))
      && Number.isFinite(Number(entry.yInches)));
  if (!target || !entrySource || sourceModels.length < 1) {
    throw new TypeError("LEGAL_FORMATION_ENTRY_SOURCE_MISSING");
  }
  const preferred = preferredAnchor(request, {
    battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
  });
  const leadingRadius = Math.max(
    dimension(profiles[0], "baseWidthMilliInches", "widthMilliInches"),
    dimension(profiles[0], "baseDepthMilliInches", "depthMilliInches"),
  ) / 2;
  const candidates = [];
  const angles = Array.from({ length: 16 }, (_, index) =>
    (Math.PI * 2 * index) / 16);
  for (const entryModel of sourceModels) {
    const entryRadius = Math.max(Number(entryModel.baseWidthInches || 0),
      Number(entryModel.baseDepthInches || 0)) * 500;
    const contactDistance = entryRadius + leadingRadius;
    for (const angle of angles) {
      const anchor = {
        xMilliInches: Math.round(Number(entryModel.xInches) * 1000
          + Math.cos(angle) * contactDistance),
        yMilliInches: Math.round(Number(entryModel.yInches) * 1000
          + Math.sin(angle) * contactDistance),
      };
      for (const policy of policies) {
          const solved = solveIntentFormationRows({
            state,
            profiles,
            anchor,
            angle,
            coherencyRangeMilliInches,
            excludedPieceId: target.id,
            sideKey: target.sideKey,
            policy,
          });
          if (!solved) continue;
          const rows = solved.rows;
          candidates.push({
            parameters: {
              activeUnitId: source.pieceId,
              sourceContactModelId: entryModel.id,
              placementPlan: {
                leadingModelId: rows[0].modelId,
                placements: rows,
              },
            },
            patternId: `intent-solver:${solved.policyId}`,
            solverPolicyId: solved.policyId,
            formationObjectives: solved.objectives,
            tacticalMetrics: solved.metrics,
            anchor,
            modelProfiles: profiles,
            sourceContactModelId: entryModel.id,
            sameAnchorAlternativesMeaningful: true,
          });
          if (candidates.length >= generationLimit) {
            return candidates.sort((left, right) => Math.hypot(
              left.anchor.xMilliInches - preferred.xMilliInches,
              left.anchor.yMilliInches - preferred.yMilliInches,
            ) - Math.hypot(
              right.anchor.xMilliInches - preferred.xMilliInches,
              right.anchor.yMilliInches - preferred.yMilliInches,
            ) || left.patternId.localeCompare(right.patternId));
          }
      }
    }
  }
  return candidates.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
}

function stablePolicyIndex(value, denominator) {
  let hash = 0;
  for (const character of String(value || "")) {
    hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  }
  return denominator > 0 ? hash % denominator : 0;
}

function generatedCandidateIntentKey(candidate, request) {
  if (candidate.solverPolicyId || !object(candidate.anchor)) return null;
  const profiles = candidate.modelProfiles;
  if (profiles !== undefined && !Array.isArray(profiles)) return null;
  const policies = formationSolverPolicies(normalizeFormationObjectives(request));
  const policy = policies[stablePolicyIndex(candidate.patternId, policies.length)];
  const nonSpatialParameters = clone(candidate.parameters || {});
  delete nonSpatialParameters.leadingModelId;
  delete nonSpatialParameters.path;
  delete nonSpatialParameters.placements;
  if (object(nonSpatialParameters.placementPlan)) {
    delete nonSpatialParameters.placementPlan.leadingModelId;
    delete nonSpatialParameters.placementPlan.placements;
  }
  return hashStarcraftTmgContract({
    anchor: candidate.anchor,
    policyId: policy.policyId,
    nonSpatialParameters,
  });
}

function solveGeneratedCandidateIntent(state, source, candidate, request,
  searchContext = {}) {
  if (candidate.solverPolicyId) return candidate;
  const profiles = candidate.modelProfiles || source.constraints?.modelProfiles;
  if (!Array.isArray(profiles) || profiles.length < 1 || !object(candidate.anchor)) {
    return candidate;
  }
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  const objectives = searchContext.objectives
    || normalizeFormationObjectives(request);
  const policies = formationSolverPolicies(objectives);
  const policy = policies[stablePolicyIndex(candidate.patternId, policies.length)];
  const start = profiles[0]?.startPoint;
  const boardCenter = {
    xMilliInches: Math.round(Number(state.board.widthInches) * 500),
    yMilliInches: Math.round(Number(state.board.heightInches) * 500),
  };
  const origin = object(start) ? start : boardCenter;
  const dx = Number(candidate.anchor.xMilliInches) - Number(origin.xMilliInches);
  const dy = Number(candidate.anchor.yMilliInches) - Number(origin.yMilliInches);
  const angle = Math.abs(dx) + Math.abs(dy) > 1
    ? Math.atan2(dy, dx)
    : Math.atan2(boardCenter.yMilliInches - candidate.anchor.yMilliInches,
      boardCenter.xMilliInches - candidate.anchor.xMilliInches);
  const solved = solveIntentFormationRows({
    state,
    profiles,
    anchor: candidate.anchor,
    angle,
    coherencyRangeMilliInches: source.actionType === "resolve_relocation_ability"
      ? 3_000 : horizontalCoherencyRange(state, actor),
    excludedPieceId: source.pieceId,
    sideKey: source.sideKey || actor?.sideKey,
    policy,
    blockers: searchContext.blockers,
    targetIndex: searchContext.targetIndex,
    minimumEnemyGapMilliInchesExclusive:
      source.constraints?.minimumEnemyGapMilliInchesExclusive,
  });
  if (!solved) return null;
  const parameters = clone(candidate.parameters);
  const rows = solved.rows;
  if (object(parameters.placementPlan)) {
    parameters.placementPlan.leadingModelId = rows[0].modelId;
    parameters.placementPlan.placements = rows;
  } else if (source.actionType === "resolve_relocation_ability") {
    parameters.leadingModelId = rows[0].modelId;
    parameters.placements = rows;
    if (source.effectKind === "extra_move") parameters.path = [rows[0]];
  } else {
    parameters.leadingModelId = rows[0].modelId;
    parameters.path = [rows[0]];
    parameters.placements = rows.slice(1);
  }
  return {
    ...candidate,
    parameters,
    patternId: `intent-solver:${solved.policyId}`,
    solverPolicyId: solved.policyId,
    formationObjectives: solved.objectives,
    tacticalMetrics: solved.metrics,
    modelProfiles: profiles,
    sameAnchorAlternativesMeaningful: true,
  };
}

function slotsFor(option, profiles) {
  const parameters = option.canonicalParameters;
  if (parameters.outcome === "failure") return [];
  const plan = object(parameters.placementPlan)
    ? parameters.placementPlan : parameters;
  const leadingModelId = plan.leadingModelId || option.fixedLeadingModelId;
  const endpoint = Array.isArray(plan.path) ? plan.path.at(-1) : null;
  const placementsIncludeLeading = (plan.placements || []).some((entry) =>
    entry.modelId === leadingModelId);
  const positions = object(parameters.placementPlan)
    ? (plan.placements || []).map((entry) => ({
      ...clone(entry), isLeading: entry.modelId === leadingModelId,
    }))
    : placementsIncludeLeading
      ? (plan.placements || []).map((entry) => ({
        ...clone(entry), isLeading: entry.modelId === leadingModelId,
      }))
      : [{ modelId: leadingModelId, ...clone(endpoint),
        isLeading: true }, ...(plan.placements || []).map((entry) => ({
        ...clone(entry), isLeading: false,
      }))];
  const profileById = new Map(profiles.map((entry) => [entry.modelId, entry]));
  const allModelIds = profiles.map((entry) => entry.modelId);
  return positions.map((position, index) => {
    const signature = baseSignature(profileById.get(position.modelId));
    const compatibleModelIds = option.fixedLeadingModelId && position.isLeading
      ? [option.fixedLeadingModelId]
      : allModelIds.filter((modelId) =>
        baseSignature(profileById.get(modelId)) === signature);
    return {
      slotId: `slot-${String(index + 1).padStart(2, "0")}`,
      isLeading: position.isLeading,
      defaultModelId: position.modelId,
      compatibleModelIds,
      position: Object.fromEntries(Object.entries(position)
        .filter(([key]) => !new Set(["modelId", "isLeading"]).has(key))),
      baseSignature: signature,
      solverPublicReason: position.isLeading
        ? `Leading slot anchors the ${option.solverPolicyId || "legal"} layout.`
        : `Host solver placed this base for ${(
          option.formationObjectives || []).map((entry) => entry.kind).join("+")
          || "balanced spacing"} while preserving exact physical legality.`,
    };
  });
}

function relationshipIntent(objectives) {
  const highest = [...(objectives || [])].sort((left, right) =>
    Number(right.weight || 0) - Number(left.weight || 0))[0]?.kind;
  return ({
    maximize_engagement: "engage",
    surround_target: "surround_target",
    avoid_threat: "avoid_threat",
    control_objective: "control_objective",
    screen: "screen",
    preserve_lane: "preserve_lane",
  })[highest] || "overview";
}

function relationshipRows(graph) {
  return (graph?.relationships || []).map((entry) => entry.edgeKind
    === "objective_relationship" ? {
      edgeId: entry.edgeId,
      edgeKind: entry.edgeKind,
      targetId: entry.toObjectiveId,
      minimumBaseEdgeDistanceMilliInches:
        entry.minimumBaseEdgeDistanceMilliInches,
      modelsWithinThreeInchesSameElevation:
        entry.modelIdsWithinThreeInchesSameElevation?.length || 0,
      precision: entry.precision,
    } : {
      edgeId: entry.edgeId,
      edgeKind: entry.edgeKind,
      targetId: entry.toUnitId,
      minimumBaseEdgeDistanceMilliInches:
        entry.nearestPhysicalEdges?.distanceMilliInches ?? null,
      engaged: entry.engagement?.engaged === true,
      visibleModelPairCount: entry.lineOfSight?.visibleModelPairCount ?? null,
      stationaryThreatProfileKeys:
        clone(entry.threats?.fromTo?.stationaryProfileKeys || []),
      stationaryThreatProfileCount:
        entry.threats?.fromTo?.stationaryProfileKeys?.length || 0,
      moveThenAttackProfileKeys:
        clone(entry.threats?.fromTo?.moveThenAttackProfileKeys || []),
      enemyStationaryThreatProfileKeys:
        clone(entry.threats?.toFrom?.stationaryProfileKeys || []),
      enemyStationaryThreatProfileCount:
        entry.threats?.toFrom?.stationaryProfileKeys?.length || 0,
      enemyMoveThenAttackProfileKeys:
        clone(entry.threats?.toFrom?.moveThenAttackProfileKeys || []),
      fireZoneExchangeClass: entry.fireZoneExchange?.class || null,
      precision: entry.precision,
    });
}

function relationshipComparison(state, source, slots, objectives, baseline) {
  if (!slots.length) return {
    status: "not_applicable",
    reason: "formation_has_no_placement_slots",
  };
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  const positions = new Map(slots.map((entry) => [entry.defaultModelId,
    entry.position]));
  const actorModelIds = new Set((actor?.models || []).map((entry) => entry.id));
  if (!actor || positions.size === 0
    || [...positions.keys()].some((modelId) => !actorModelIds.has(modelId))) return {
    status: "unknown",
    reason: "placement_slots_do_not_belong_to_current_actor",
  };
  try {
    const projected = clone(state);
    const projectedActor = projected.pieces.find((entry) =>
      entry.id === source.pieceId);
    projectedActor.isOnField = true;
    projectedActor.isInReserves = false;
    projectedActor.inCoherency = true;
    projectedActor.coherencyStatus = {
      schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "in_coherency",
      isOutOfCoherency: false,
    };
    for (const model of projectedActor.models) {
      const position = positions.get(model.id);
      if (!position) continue;
      model.xInches = Number(position.xMilliInches) / 1000;
      model.yInches = Number(position.yMilliInches) / 1000;
      model.baseRotationDegrees = Number(position.rotationDegrees || 0);
      model.isOnField = true;
      model.isDestroyed = false;
    }
    projectedActor.destroyedModelIds = (projectedActor.destroyedModelIds || [])
      .filter((modelId) => !positions.has(modelId));
    projectedActor.currentModels = projectedActor.models.filter((model) =>
      model.isDestroyed !== true && model.isOnField !== false).length;
    const visibleEnemyUnitIds = (projected.pieces || []).filter((entry) =>
      entry.sideKey !== projectedActor.sideKey
        && entry.isOnField === true
        && entry.isDestroyed !== true
        && Number(entry.currentModels || 0) > 0).map((entry) => entry.id);
    const targetIds = [...new Set([
      ...(objectives || []).flatMap((entry) => entry.targetIds || []),
      ...visibleEnemyUnitIds,
    ])];
    const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
      state: projected,
      seatKey: projectedActor.sideKey,
      hypotheticalProjection: true,
      request: {
        intent: relationshipIntent(objectives),
        subjectUnitIds: [projectedActor.id],
        targetIds,
        maximumRelations: 64,
        knownMinimumOpponentGapMilliInchesExclusive:
          source.constraints?.minimumEnemyGapMilliInchesExclusive || null,
      },
    });
    const beforeRows = relationshipRows(baseline);
    const afterRows = relationshipRows(graph);
    const beforeById = new Map(beforeRows.map((entry) => [entry.edgeId, entry]));
    return {
      status: "available",
      hypotheticalProjection: true,
      baselineRelationshipGraphHash:
        baseline?.relationshipGraphHash || null,
      projectedRelationshipGraphHash: graph.relationshipGraphHash,
      intent: graph.intent,
      relationships: afterRows,
      deltas: afterRows.map((entry) => {
        const before = beforeById.get(entry.edgeId);
        return {
          edgeId: entry.edgeId,
          baseEdgeDistanceDeltaMilliInches: before
            && Number.isFinite(before.minimumBaseEdgeDistanceMilliInches)
            && Number.isFinite(entry.minimumBaseEdgeDistanceMilliInches)
            ? entry.minimumBaseEdgeDistanceMilliInches
              - before.minimumBaseEdgeDistanceMilliInches : null,
          engagementChanged: before && "engaged" in entry
            ? before.engaged !== entry.engaged : null,
          visibleModelPairDelta: before
            && Number.isFinite(before.visibleModelPairCount)
            && Number.isFinite(entry.visibleModelPairCount)
            ? entry.visibleModelPairCount - before.visibleModelPairCount : null,
        };
      }),
      clearances: clone(graph.aggregates?.clearances || []),
      precisionPolicy: clone(graph.precisionPolicy),
      sourceReceipts: clone(graph.sourceReceipts),
      rulesInstantiationStillFinalAuthority: true,
      trainingTruth: false,
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
    };
  }
}

export function searchStarcraftTmgLegalFormationOptionsV1(input = {}) {
  const domain = input.domain;
  const source = sourceDomain(domain);
  const state = input.state;
  const instantiate = input.instantiate;
  const request = object(input.request) ? input.request : {};
  const searchStartedAt = performance.now();
  const observeProgress = typeof input.observeProgress === "function"
    ? input.observeProgress : null;
  const progress = (stage, detail = {}) => {
    if (!observeProgress) return;
    try {
      observeProgress({
        schemaVersion: "starcraft_tmg_formation_search_progress_v1",
        stage,
        elapsedMs: Math.round(performance.now() - searchStartedAt),
        ...clone(detail),
        mutationAuthority: false,
        trainingTruth: false,
      });
    } catch {}
  };
  if (!object(state) || !object(domain) || !object(source?.constraints)
    || typeof instantiate !== "function") {
    throw new TypeError("LEGAL_FORMATION_SEARCH_INPUT_INVALID");
  }
  if (!SUPPORTED_ACTION_TYPES.has(String(source.actionType || ""))) {
    throw new TypeError("LEGAL_FORMATION_ACTION_TYPE_UNSUPPORTED");
  }
  const requestedOptions = Number(request.maximumOptions
    ?? DEFAULT_MAX_OPTIONS);
  const maximumOptions = Number.isSafeInteger(requestedOptions)
    ? Math.max(1, Math.min(8, requestedOptions)) : DEFAULT_MAX_OPTIONS;
  const requestedAttempts = Number(request.maximumCandidateAttempts
    ?? DEFAULT_MAX_ATTEMPTS);
  const maximumCandidateAttempts = Number.isSafeInteger(requestedAttempts)
    ? Math.max(1, Math.min(20_000, requestedAttempts)) : DEFAULT_MAX_ATTEMPTS;
  const generated = source.actionType === "deploy"
    ? deployCandidates(domain, request)
    : source.actionType === "resolve_charge"
      ? chargeResolutionCandidates(state, domain, request)
    : source.actionType === "resolve_relocation_ability"
      ? relocationAbilityCandidates(state, domain, request)
    : source.actionType === "resolve_unit_lifecycle_ability"
      ? lifecycleAbilityCandidates(state, domain, request)
      : source.actionType === "resolve_unit_lifecycle_consumer"
        ? lifecycleConsumerCandidates(state, domain, request)
        : relocationCandidates(domain, request);
  progress("candidate_generation_complete", {
    generatedCandidateCount: generated.length,
  });
  const blockers = blockingFootprints(state, source.pieceId);
  const normalizedObjectives = normalizeFormationObjectives(request);
  const intentTargetIndex = formationIntentTargetIndex(state, blockers);
  const options = [];
  const failureCounts = new Map();
  let baselineRelationshipGraph = null;
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  if (actor?.isOnField === true && actor?.isDestroyed !== true
    && Number(actor?.currentModels || 0) > 0) {
    try {
      baselineRelationshipGraph = buildStarcraftTmgTacticalRelationshipGraphV1({
        state,
        seatKey: actor.sideKey,
        request: {
          intent: relationshipIntent(normalizeFormationObjectives(request)),
          subjectUnitIds: [actor.id],
          targetIds: [...new Set(normalizeFormationObjectives(request)
            .flatMap((entry) => entry.targetIds || []))],
          maximumRelations: 64,
        },
      });
    } catch {
      baselineRelationshipGraph = null;
    }
  }
  let attemptedCandidateCount = 0;
  let instantiatedCandidateCount = 0;
  let prefilteredCandidateCount = 0;
  let duplicateIntentCandidateCount = 0;
  let examinedGeneratedCandidateCount = 0;
  const generatedIntentKeys = new Set();
  for (const generatedCandidate of generated) {
    if (attemptedCandidateCount >= maximumCandidateAttempts
      || options.length >= maximumOptions) break;
    examinedGeneratedCandidateCount += 1;
    if (examinedGeneratedCandidateCount <= 5
      || examinedGeneratedCandidateCount % 25 === 0) {
      progress("candidate_started", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length,
        patternId: generatedCandidate.patternId,
      });
    }
    const generatedIntentKey = generatedCandidateIntentKey(
      generatedCandidate, request);
    if (generatedIntentKey && generatedIntentKeys.has(generatedIntentKey)) {
      duplicateIntentCandidateCount += 1;
      continue;
    }
    if (generatedIntentKey) generatedIntentKeys.add(generatedIntentKey);
    const candidate = solveGeneratedCandidateIntent(
      state, source, generatedCandidate, request, {
        blockers,
        targetIndex: intentTargetIndex,
        objectives: normalizedObjectives,
      });
    if (!candidate) continue;
    if (examinedGeneratedCandidateCount <= 5
      || examinedGeneratedCandidateCount % 25 === 0) {
      progress("candidate_intent_solved", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length,
        patternId: candidate.patternId,
      });
    }
    if (candidate.sameAnchorAlternativesMeaningful !== true
      && options.some((entry) => Math.hypot(
      entry.anchor.xMilliInches - candidate.anchor.xMilliInches,
      entry.anchor.yMilliInches - candidate.anchor.yMilliInches,
      ) < 1_000)) continue;
    attemptedCandidateCount += 1;
    const profiles = candidate.modelProfiles || source.constraints.modelProfiles;
    const prefilterFailure = candidatePlacementPrefilterFailure(
      candidate, profiles, blockers, {
        sideKey: source.sideKey || actor?.sideKey,
        minimumEnemyGapMilliInchesExclusive:
          source.constraints?.minimumEnemyGapMilliInchesExclusive,
      });
    if (prefilterFailure) {
      prefilteredCandidateCount += 1;
      failureCounts.set(prefilterFailure,
        Number(failureCounts.get(prefilterFailure) || 0) + 1);
      continue;
    }
    instantiatedCandidateCount += 1;
    progress("rules_instantiation_started", {
      examinedGeneratedCandidateCount,
      attemptedCandidateCount,
      instantiatedCandidateCount,
      optionCount: options.length,
      patternId: candidate.patternId,
    });
    try {
      const instantiated = instantiate(state, domain, candidate.parameters,
        clone(input.instantiateOptions || {}));
      progress("rules_instantiation_completed", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length,
        patternId: candidate.patternId,
      });
      const canonicalParameters = clone(instantiated.canonicalParameters
        || instantiated.action?.sourceAction?.spatialPlan?.canonicalParameters);
      if (!object(canonicalParameters)) continue;
      const objectives = clone(candidate.formationObjectives
        || normalizeFormationObjectives(request));
      const optionSeed = {
        domainId: domain.domainId,
        actionType: source.actionType,
        pieceId: source.pieceId,
        patternId: candidate.patternId,
        solverPolicyId: candidate.solverPolicyId || null,
        formationObjectives: objectives,
        tacticalMetrics: clone(candidate.tacticalMetrics || null),
        fixedLeadingModelId: candidate.leadingModelId
          || source.constraints.leadingModelId || null,
        requiredSpatialConstraints:
          clone(candidate.requiredSpatialConstraints || null),
        anchor: clone(candidate.anchor),
        canonicalParameters,
        actionHash: hashStarcraftTmgContract(instantiated.action),
        completeFormationPlacementChecked: true,
        abilityName: source.abilityName || null,
        effectKind: source.effectKind || null,
        paymentCardInstanceIds:
          clone(canonicalParameters.paymentCardInstanceIds || []),
        parentContactModelId:
          canonicalParameters.parentContactModelId || null,
        rulesAuthority: true,
        trainingTruth: false,
      };
      const projectedSlots = slotsFor(optionSeed, profiles);
      progress("relationship_comparison_started", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length,
        patternId: candidate.patternId,
      });
      const optionCore = {
        ...optionSeed,
        relationshipComparison: relationshipComparison(state, source,
          projectedSlots, objectives, baselineRelationshipGraph),
      };
      progress("relationship_comparison_completed", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length + 1,
        patternId: candidate.patternId,
      });
      const formationOptionId = hashStarcraftTmgContract(optionCore);
      const option = { ...optionCore, formationOptionId };
      option.slots = slotsFor(option,
        profiles);
      options.push(option);
    } catch (error) {
      const code = String(error?.message || error).split(":")[0];
      failureCounts.set(code, Number(failureCounts.get(code) || 0) + 1);
      progress("rules_instantiation_failed", {
        examinedGeneratedCandidateCount,
        attemptedCandidateCount,
        instantiatedCandidateCount,
        optionCount: options.length,
        patternId: candidate.patternId,
        failureCode: code,
      });
    }
  }
  progress("search_completed", {
    generatedCandidateCount: generated.length,
    examinedGeneratedCandidateCount,
    attemptedCandidateCount,
    instantiatedCandidateCount,
    prefilteredCandidateCount,
    duplicateIntentCandidateCount,
    optionCount: options.length,
  });
  return freeze({
    schemaVersion: STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
    toolName: STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME,
    actionFamilyCoverageVersion: "starcraft_tmg_formation_action_family_coverage_v1",
    actionFamilyCoverage: clone(STARCRAFT_TMG_FORMATION_ACTION_FAMILY_COVERAGE_V1),
    domainId: domain.domainId,
    actionType: source.actionType,
    pieceId: source.pieceId,
    preferredAnchor: preferredAnchor(request, {
      battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
      battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
      ...source.constraints,
    }),
    formationOptions: options,
    optionCount: options.length,
    attemptedCandidateCount,
    instantiatedCandidateCount,
    prefilteredCandidateCount,
    duplicateIntentCandidateCount,
    searchCoverage: {
      generatedCandidateCount: generated.length,
      examinedGeneratedCandidateCount,
      exactInstantiationCount: instantiatedCandidateCount,
      maximumCandidateAttempts,
      maximumOptions,
      candidateGenerationDeterministic: true,
      exactInstantiationIsLazy: true,
      greedyPerModelLocalImprovementUsed: true,
      betterOptionMayExist:
        examinedGeneratedCandidateCount < generated.length,
      strategyObjectiveOrTokenBudgetReducedForPerformance: false,
    },
    paretoDiversity: formationParetoDiversity(options),
    failureCounts: Object.fromEntries([...failureCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))),
    assignmentContract: {
      agentChoosesTacticalIntent: true,
      agentSelectsFinalCompleteLayout: true,
      agentSuppliesPublicFormationStrategyReason: true,
      hostSolvesCompletePhysicalLayouts: true,
      internalSamplingIsNotAFormationTemplate: true,
      chooseExactlyOneFormationOption: true,
      hostDefaultAssignmentUsesCanonicalModelIdentity: true,
      optionalAgentAssignmentMustCoverEverySlotAndModelExactlyOnce: true,
      modelMustBeCompatibleWithSlot: true,
      everySlotHasHostSolverPublicReason: true,
      mixingSlotsAcrossOptionsForbidden: true,
      hostReinstantiatesAssignedFormationBeforeApply: true,
      hiddenChainOfThoughtRequested: false,
    },
    formationIntent: {
      tacticalPurpose: String(request.tacticalPurpose || ""),
      objectives: normalizeFormationObjectives(request),
      exactThreatGeometryRequiredForExactThreatClaims: true,
      visibleSourceClearanceAloneIsAdvisory: true,
    },
    bounded: true,
    rulesAuthority: options.length > 0,
    mutationAuthority: false,
    trainingTruth: false,
  });
}
