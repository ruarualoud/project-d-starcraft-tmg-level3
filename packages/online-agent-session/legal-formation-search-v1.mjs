import {chargeCriticalEndpointCandidatesV1} from './charge-critical-endpoints-v1.mjs';
import {proveOfficialChargeClosestPositionV1} from '../rule-atoms/official-charge-closest-position-proof-v1.mjs';
import {projectOfficialMatchHorizonV1,projectOfficialActionHorizonV1} from '../rule-atoms/official-match-horizon-projection-v1.mjs';
import { projectFormationMetricsForDecisionV1 } from "./formation-decision-facts-v1.mjs";
import { getOfficialDelegatedRosterSpatialDomainV1 } from
  '../product-composition/official-selected-roster-spatial-parameter-contract-v1.mjs';
import { isOfficialNonEntryEdgeGroundDeployDomainV1 } from
  '../product-composition/official-relocation-parameter-contract-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  createOfficialCoherencyLinkEvaluatorV1,
  createOfficialHypotheticalCoherencyLinkEvaluatorV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  isOfficialPhysicalFootprintWhollyWithinRangeV1,
  officialTerrainBlocksModelPlacementV1,
  officialNonEngagedBaseSeparationAllowedV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { deriveOfficialModelSurfacePlacementV2, deriveOfficialEngagementGraphV2,
  OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import { projectOfficialHorizontalCoherencyV1 } from
  "../product-composition/official-characteristic-status-family-adapter-v1.mjs";
import { createOfficialUnitLifecycleFamilyAdapterV1 } from
  "../product-composition/official-unit-lifecycle-family-adapter-v1.mjs";
import {
  projectOfficialSelectedRosterRangedFirepowerV1,
} from
  "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { createStarcraftTmgAttackProbabilityBatchV1 } from
  "./combat-estimation-runtime-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "./tactical-relationship-graph-v1.mjs";
import { createStarcraftTmgModelObstacleRoutePlannerV1 } from
  "./model-obstacle-route-planner-v1.mjs";
import { applyOfficialSelectedRosterSpatialActionV1, checkOfficialSelectedRosterDeployLeaderPathV1,
  resolveOfficialSelectedRosterDeployStartV1,
  OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID } from
  "../product-composition/official-selected-roster-spatial-action-runtime-v1.mjs";
import { STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS,
  normalizeExplicitStaticFormationObjectivesV1 } from './formation-intent-contract-v1.mjs';
export { STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS } from './formation-intent-contract-v1.mjs';

export const STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION =
  "starcraft_tmg_legal_formation_search_v13";

export const STARCRAFT_TMG_FORMATION_SOLVER_TOOL_NAME =
  "space.solve_formation";

const SUPPORTED_ACTION_TYPES = new Set([
  "deploy", "move", "run", "disengage", "resolve_charge",
  "resolve_relocation_ability", "resolve_protoss_unique_ability",
  "resolve_unit_lifecycle_ability", "resolve_unit_lifecycle_consumer",
  "use_active_ability",
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
  protossUniqueEffects: Object.freeze(["non_entry_edge_ground_deploy"]),
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

function declaredDomain(domain) {
  return object(domain?.sourceDomain) ? domain.sourceDomain : domain;
}

function sourceDomain(domain) {
  const declared = declaredDomain(domain);
  if (declared?.actionType !== "resolve_khassar_movement") return declared;
  const native = getOfficialDelegatedRosterSpatialDomainV1(declared);
  if (!native) throw new TypeError("LEGAL_FORMATION_DELEGATION_DOMAIN_INVALID");
  return native;
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

export function terrainBlocksStarcraftTmgFormationPlacementV1(terrain = {}) {
  // The selected-roster spatial adapter also rejects endpoints overlapping
  // ordinary terrain that has no standable surface. Search must not offer a
  // formation that its authority cannot instantiate, even when an older
  // compiled map called that visual cover ``blocksPlacement: false``.
  return officialTerrainBlocksModelPlacementV1(terrain)
    || (String(terrain.terrainKind || "ordinary").toLowerCase() === "ordinary"
      && terrain.standableHorizontalSurface !== true);
}

function surfacePlacementForFootprint(state, footprint) {
  const bounds = footprintBounds(footprint);
  const supportTerrainIds = [];
  let highestSize = 0;
  for (const terrain of state.board?.terrain || []) {
    if (terrain.isRemoved === true || terrain.isDestroyed === true
      || terrain.standableHorizontalSurface !== true) continue;
    const rectangle = terrain.footprint || terrain;
    if (rectangle.shape !== "axis_aligned_rectangle") continue;
    const minX = Number(rectangle.minXMilliInches);
    const maxX = Number(rectangle.maxXMilliInches);
    const minY = Number(rectangle.minYMilliInches);
    const maxY = Number(rectangle.maxYMilliInches);
    if (bounds.maximumX <= minX || bounds.minimumX >= maxX
      || bounds.maximumY <= minY || bounds.minimumY >= maxY) continue;
    if (bounds.minimumX < minX || bounds.maximumX > maxX
      || bounds.minimumY < minY || bounds.maximumY > maxY) return null;
    supportTerrainIds.push(terrain.id);
    highestSize = Math.max(highestSize, Number(terrain.size || 0));
  }
  return { supportTerrainIds: supportTerrainIds.sort(),
    elevation: highestSize >= 3 ? "high"
      : highestSize >= 1 ? "mid" : "ground" };
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
      && terrainBlocksStarcraftTmgFormationPlacementV1(terrain)).flatMap((terrain) => {
    const source = terrain.footprint || terrain;
    if (source.shape === "axis_aligned_rectangle") {
      const minimumX = Number(source.minXMilliInches);
      const maximumX = Number(source.maxXMilliInches);
      const minimumY = Number(source.minYMilliInches);
      const maximumY = Number(source.maxYMilliInches);
      if (![minimumX, maximumX, minimumY, maximumY]
        .every(Number.isSafeInteger)) return [];
      return [{ sideKey: null, pieceId: null, modelId: null,
        objectId: terrain.id, kind: "terrain",
        terrainGroupId: terrain.terrainGroupId || terrain.id,
        footprint: physicalFootprint({
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
  return Number(projectOfficialHorizontalCoherencyV1(
    state.officialCharacteristicStatusFamilySourceBundle,
    state,
    { pieceId: piece.id, assumeDeployed: piece.isOnField !== true },
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
  if (blocker.kind !== "model" || !blocker.sideKey
    || blocker.sideKey === input.sideKey) return false;
  if (input.requireNativeNonEngagedClearance
    && !officialNonEngagedBaseSeparationAllowedV1(footprint, blocker.footprint)) return true;
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
  if (!surfacePlacementForFootprint(state, footprint)) return false;
  const bounds = footprintBounds(footprint);
  for (const blocker of blockers) {
    if (boundsMayOverlap(bounds, blocker.bounds)
      && evaluateOfficialPhysicalFootprintRelationV1({
        left: footprint, right: blocker.footprint,
      }).overlappingInteriors) return false;
    if (minimumEnemyGapFailure(footprint, blocker, hardConstraints)) {
      return false;
    }
  }
  return selected.every((entry) => (
    !boundsMayOverlap(bounds, entry.bounds || footprintBounds(entry.footprint))
    || !evaluateOfficialPhysicalFootprintRelationV1({
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
  // Tool discovery has always allowed a single objective object. Preserve that
  // explicit model intent instead of treating it as omitted and choosing the
  // balanced default. Array/legacy input keeps its existing ordering/weights.
  const source = Array.isArray(request.formationObjectives)
    ? request.formationObjectives
    : request.formationObjectives && typeof request.formationObjectives === "object"
      ? [request.formationObjectives]
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
    { policyId: "requested-direct", objectives: requested, tieBreaker: 0,
      packingProfileId: "balanced_spacing",
      preferredInterBaseGapMilliInches: 160 },
    { policyId: "requested-left", objectives: requested, tieBreaker: -1,
      packingProfileId: "tight_spacing",
      preferredInterBaseGapMilliInches: 20 },
    { policyId: "requested-right", objectives: requested, tieBreaker: 1,
      packingProfileId: "open_spacing",
      preferredInterBaseGapMilliInches: 320 },
  ];
  for (const objective of objectives) {
    if (objectives.length < 2) break;
    const preferredGap = objective.kind === "compact" ? 20
      : objective.kind === "disperse" ? 320 : 160;
    policies.push({
      policyId: `isolate-${objective.kind}`,
      objectives: [clone(objective)],
      tieBreaker: 0,
      packingProfileId: objective.kind === "compact" ? "tight_spacing"
        : objective.kind === "disperse" ? "open_spacing"
          : "balanced_spacing",
      preferredInterBaseGapMilliInches: preferredGap,
    });
  }
  if (objectives.length === 1 && objectives[0].kind === "balanced") {
    policies.push({
      policyId: "fallback-compact",
      objectives: [{ kind: "compact", weight: 3, targetIds: [] }],
      tieBreaker: 0,
      packingProfileId: "tight_spacing",
      preferredInterBaseGapMilliInches: 20,
    }, {
      policyId: "fallback-disperse",
      objectives: [{ kind: "disperse", weight: 3, targetIds: [] }],
      tieBreaker: 0,
      packingProfileId: "open_spacing",
      preferredInterBaseGapMilliInches: 320,
    }, {
      policyId: "fallback-advance",
      objectives: [{ kind: "advance", weight: 3, targetIds: [] }],
      tieBreaker: 0,
      packingProfileId: "balanced_spacing",
      preferredInterBaseGapMilliInches: 160,
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

function formationSolverMetrics(selected, input) {
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
    // An own model contributes once even when it is near several models of
    // the requested Unit. Pair counts overstate engagement/control and also
    // corrupt the models-within-range Pareto axis consumed by the Agent.
    const distancesByModel = selected.map((entry) => targets.map((target) =>
      targetEdgeDistance(entry.footprint, target)));
    const distances = distancesByModel.flat();
    const nearestTargetDistances = distancesByModel.map((entries) =>
      entries.length > 0 ? Math.min(...entries) : Infinity);
    return {
      kind: objective.kind,
      weight: objective.weight,
      targetIds: clone(objective.targetIds),
      resolvedTargetCount: targets.length,
      minimumTargetBaseEdgeDistanceMilliInches:
        distances.length > 0 ? Math.round(Math.min(...distances)) : null,
      modelsWithinOneInchOfTarget: nearestTargetDistances
        .filter((entry) => entry <= 1_000).length,
      modelsWithinThreeInchesOfTarget: nearestTargetDistances
        .filter((entry) => entry <= 3_000).length,
      threatMetricPrecision: objective.kind === "avoid_threat"
        ? "advisory_visible_source_clearance_not_exact_attack_legality"
        : "not_applicable",
    };
  });
  return projectFormationMetricsForDecisionV1({
    modelCount: selected.length,
    packingProfileId: String(input.policy.packingProfileId
      || "legacy_minimum_spacing"),
    preferredInterBaseGapMilliInches: Number(
      input.policy.preferredInterBaseGapMilliInches ?? 20),
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
  });
}

function solveIntentFormationRows(input) {
  const { state, profiles, anchor, angle, coherencyRangeMilliInches,
    excludedPieceId, sideKey, policy } = input;
  const diagnostic = input.diagnostic || null;
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
    requireNativeNonEngagedClearance: input.requireNativeNonEngagedClearance === true,
    minimumEnemyGapMilliInchesExclusive:
      input.minimumEnemyGapMilliInchesExclusive,
  };
  if (!availablePackedFootprint(leaderFootprint, state, blockers, [],
    hardConstraints) || input.placementAllowed?.({ profile: leaderProfile,
      footprint: leaderFootprint, point: leaderPoint, rotationDegrees: 0 }) === false) {
    if (diagnostic) {
      diagnostic.leaderFootprintRejected += 1;
      if (!footprintInsideBattlefield(leaderFootprint, state)) {
        diagnostic.leaderOutOfBounds += 1;
      } else if (!surfacePlacementForFootprint(state, leaderFootprint)) {
        diagnostic.leaderNoSurface += 1;
      } else {
        diagnostic.leaderBlockedByModelOrTerrain += 1;
      }
      // Optional query diagnostics explain the SAME predicate that rejected
      // this fixed anchor. No substitute anchor or global impossibility claim.
      // Keep this work off the ordinary formation-search hot path.
      if (diagnostic.explainAnchorRejection && !diagnostic.anchorRejection) {
        const bounds = footprintBounds(leaderFootprint);
        if (!footprintInsideBattlefield(leaderFootprint, state)) {
          diagnostic.anchorRejection = { reason: 'base_outside_battlefield',
            modelId: leaderProfile.modelId, footprintBoundsMilliInches: bounds,
            battlefieldMilliInches: { width: Math.round(state.board.widthInches * 1000),
              height: Math.round(state.board.heightInches * 1000) } };
        } else if (!surfacePlacementForFootprint(state, leaderFootprint)) {
          diagnostic.anchorRejection = { reason: 'base_not_supported_by_surface',
            modelId: leaderProfile.modelId, footprintBoundsMilliInches: bounds };
        } else {
          const rejectedBy = blockers.filter(blocker =>
            boundsMayOverlap(bounds, blocker.bounds)
              && evaluateOfficialPhysicalFootprintRelationV1({ left: leaderFootprint,
                right: blocker.footprint }).overlappingInteriors
            || minimumEnemyGapFailure(leaderFootprint, blocker, hardConstraints));
          diagnostic.anchorRejection = { reason: 'base_overlaps_blocker',
            modelId: leaderProfile.modelId, footprintBoundsMilliInches: bounds,
            blockers: rejectedBy.map(blocker => ({ kind: blocker.kind,
              objectId: blocker.objectId || blocker.modelId, pieceId: blocker.pieceId,
              modelId: blocker.modelId, terrainGroupId: blocker.terrainGroupId || null,
              footprintBoundsMilliInches: blocker.bounds })) };
        }
      }
    }
    return null;
  }
  const selected = [{ profile: leaderProfile, footprint: leaderFootprint,
    bounds: footprintBounds(leaderFootprint),
    point: leaderPoint, rotationDegrees: 0 }];
  const preferredInterBaseGapMilliInches = Math.max(20, Math.min(800,
    Number(policy.preferredInterBaseGapMilliInches ?? 20)));
  const spacing = Math.max(200, Math.round(Math.max(...profiles.flatMap((entry) => [
    dimension(entry, "baseWidthMilliInches", "widthMilliInches"),
    dimension(entry, "baseDepthMilliInches", "depthMilliInches"),
  ])) + preferredInterBaseGapMilliInches));
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
  // A largest-dimension lattice can miss a legal narrow-base arrangement.
  // Include the unit's actual relative positions as additional samples; these
  // still pass the same footprint/coherency checks and objective comparison.
  // This does not prescribe a formation or claim that a translated path is legal.
  const actorModels = state.pieces?.find(piece => piece.id === excludedPieceId)?.models || [];
  const currentLeader = actorModels.find(model => model.id === leaderProfile.modelId);
  if (currentLeader?.isOnField !== false && Number.isFinite(currentLeader?.xInches)
    && Number.isFinite(currentLeader?.yInches)) {
    const knownPoints = new Set(points.map(entry =>
      JSON.stringify([entry.point.xMilliInches, entry.point.yMilliInches])));
    for (const model of actorModels) {
      if (model.id === leaderProfile.modelId || model.isDestroyed
        || model.isOnField === false || !Number.isFinite(model.xInches)
        || !Number.isFinite(model.yInches)) continue;
      const x = Math.round((model.xInches - currentLeader.xInches) * 1000);
      const y = Math.round((model.yInches - currentLeader.yInches) * 1000);
      const point = { xMilliInches: anchor.xMilliInches + x,
        yMilliInches: anchor.yMilliInches + y };
      const key = JSON.stringify([point.xMilliInches, point.yMilliInches]);
      if (knownPoints.has(key)) continue;
      knownPoints.add(key);
      points.push({ point, ring: Math.max(1, Math.ceil(Math.hypot(x, y) / spacing)),
        distance: Math.hypot(x, y),
        outwardProjection: x * outward.x + y * outward.y,
        lateralProjection: x * lateral.x + y * lateral.y });
    }
  }
  points.sort((left, right) => left.point.xMilliInches - right.point.xMilliInches
    || left.point.yMilliInches - right.point.yMilliInches);
  const used = new Set();
  for (const profile of profiles.slice(1).sort((left, right) => (
    dimension(right, "baseWidthMilliInches", "widthMilliInches")
      * dimension(right, "baseDepthMilliInches", "depthMilliInches")
  ) - (
    dimension(left, "baseWidthMilliInches", "widthMilliInches")
      * dimension(left, "baseDepthMilliInches", "depthMilliInches")
  ) || left.modelId.localeCompare(right.modelId))) {
    const rotations = String(profile.baseShape || profile.shape) === "round"
      ? [0] : [0, 45, 90, 135];
    const candidates = [];
    for (const [index, entry] of points.entries()) {
      if (used.has(index)) continue;
      for (const rotationDegrees of rotations) {
        const footprint = footprintAt(profile, entry.point, rotationDegrees);
        if (!isOfficialPhysicalFootprintWhollyWithinRangeV1({
          source: leaderFootprint, target: footprint,
          rangeMilliInches: coherencyRangeMilliInches,
        })) continue;
        if (!availablePackedFootprint(footprint, state, blockers, selected,
          hardConstraints) || input.placementAllowed?.({ profile, footprint,
            point: entry.point, rotationDegrees }) === false) {
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
    // Keep the model's objective-score ordering, but require each added model
    // to join the already connected formation using the execution predicate.
    const candidate = input.coherencyLinkAllows
      ? candidates.find(entry => selected.some(placed =>
        input.coherencyLinkAllows(placed.footprint, entry.footprint, selected)))
      : candidates[0];
    if (!candidate) {
      if (diagnostic) {
        diagnostic.followerUnplaceable += 1;
        diagnostic.maxFollowersPlaced = Math.max(
          diagnostic.maxFollowersPlaced, selected.length - 1);
      }
      return null;
    }
    used.add(candidate.index);
    selected.push({ profile, footprint: candidate.footprint, point: candidate.point,
      bounds: footprintBounds(candidate.footprint),
      rotationDegrees: candidate.rotationDegrees });
  }
  const rows = selected.map((entry) => ({
    modelId: entry.profile.modelId,
    xMilliInches: entry.point.xMilliInches,
    yMilliInches: entry.point.yMilliInches,
    rotationDegrees: entry.rotationDegrees,
    ...surfacePlacementForFootprint(state, entry.footprint),
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
    }),
  };
}

// Read-only scene construction reuses the live formation geometry primitives,
// but has no action domain and therefore makes NO arrival/path legality claim.
// The caller owns the anchor and objectives; failed packing never moves it.
export function solveStarcraftTmgHypotheticalFormationV1({ state, pieceId,
  anchor, formationObjectives, modelSpreadInches, diagnostic } = {}) {
  let actor = state?.pieces?.find(piece => piece.id === pieceId);
  if (!actor || !Number.isSafeInteger(anchor?.xMilliInches)
    || !Number.isSafeInteger(anchor?.yMilliInches)) {
    throw new TypeError("HYPOTHETICAL_FORMATION_INPUT_INVALID");
  }
  const models = actor.models.filter(model => !model.isDestroyed);
  if (actor.isDestroyed === true || Number(actor.currentModels || 0) <= 0 || !models.length) {
    throw new TypeError("HYPOTHETICAL_FORMATION_EMPTY_UNIT");
  }
  // Static layout is also used before a living reserve unit has entered play.
  // Evaluate that hypothetical presence on a private projection, not by
  // weakening the live Rules predicate or mutating the source room/branch.
  if (actor.isOnField !== true) {
    actor = { ...actor, isOnField: true, models: actor.models.map(model =>
      model.isDestroyed ? model : { ...model, isOnField: true }) };
    state = { ...state, pieces: state.pieces.map(piece => piece.id === pieceId ? actor : piece) };
  }
  const byId = new Map(profilesForPieceModels(state, actor, models)
    .map(profile => [profile.modelId, profile]));
  const profiles = models.map(model => byId.get(model.id));
  const explicitObjectives = normalizeExplicitStaticFormationObjectivesV1(formationObjectives);
  const objectives = explicitObjectives?.length
    ? explicitObjectives
    : [{ kind: "compact", weight: 3, targetIds: [] }];
  const policies = formationSolverPolicies(objectives);
  if (modelSpreadInches !== undefined) {
    const spread = Number(modelSpreadInches) * 1000;
    if (!Number.isFinite(spread) || spread <= 0) {
      throw new TypeError("HYPOTHETICAL_FORMATION_SPREAD_INVALID");
    }
    const diameter = Math.max(...profiles.flatMap(profile => [
      profile.baseWidthMilliInches, profile.baseDepthMilliInches]));
    for (const policy of policies) {
      policy.preferredInterBaseGapMilliInches = Math.max(20, spread - diameter);
    }
  }
  const blockers = blockingFootprints(state, pieceId);
  const targetIndex = formationIntentTargetIndex(state, blockers);
  const coherencyLinkAllows = createOfficialHypotheticalCoherencyLinkEvaluatorV1({
    state, actor, dataBundle: state.officialModelBaseGeometryDataBundle,
  });
  for (const policy of policies) {
    const solved = solveIntentFormationRows({ state, profiles, anchor, angle: 0,
      coherencyRangeMilliInches: horizontalCoherencyRange(state, actor),
      excludedPieceId: pieceId, sideKey: actor.sideKey, policy,
      blockers, targetIndex, coherencyLinkAllows, diagnostic,
      requireNativeNonEngagedClearance: false });
    if (solved) return { ...solved, solverVersion: STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
      anchorPreserved: true, geometryWitnessOnly: true,
      arrivalOrMovementLegalityProven: false, trainingTruth: false };
  }
  return null; // A bounded search miss, not proof no legal formation exists.
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

// Additional search seeds use real footprint boundaries near the entry strip.
// Only Native can certify the complete swept path and final formation.
function deploymentBoundaryAxisSamples(constraints, segment, bounds, blockers) {
  const horizontal = segment.side === "top" || segment.side === "bottom";
  const minimum = horizontal ? bounds.minimumX : bounds.minimumY;
  const maximum = horizontal ? bounds.maximumX : bounds.maximumY;
  const halfAlong = horizontal ? bounds.halfWidths[0] : bounds.halfDepths[0];
  const depth = Number(constraints.maxDistanceMilliInches);
  const boardNormal = horizontal ? constraints.battlefieldHeightMilliInches
    : constraints.battlefieldWidthMilliInches;
  const farEdge = segment.side === "top" || segment.side === "right";
  const values = new Set();
  for (const blocker of blockers) {
    const box = blocker.bounds;
    const lowNormal = horizontal ? box.minimumY : box.minimumX;
    const highNormal = horizontal ? box.maximumY : box.maximumX;
    if (farEdge ? highNormal < boardNormal - depth || lowNormal > boardNormal
      : lowNormal > depth || highNormal < 0) continue;
    const lowAlong = horizontal ? box.minimumX : box.minimumY;
    const highAlong = horizontal ? box.maximumX : box.maximumY;
    for (const value of [Math.floor(lowAlong - halfAlong) - 1,
      Math.ceil(highAlong + halfAlong) + 1]) {
      if (value >= minimum && value <= maximum) values.add(value);
    }
  }
  const edges = [minimum, ...values, maximum].sort((a, b) => a - b);
  for (let i = 1; i < edges.length; i += 1) {
    const midpoint = Math.round((edges[i - 1] + edges[i]) / 2);
    if (midpoint >= minimum && midpoint <= maximum) values.add(midpoint);
  }
  return [...values];
}

function perimeterDeploymentCandidates(domain, segment, preferred) {
  const { constraints } = domain;
  const leader = constraints.modelProfiles[0];
  const { center, radiusMilliInches: radius, maximumAlongEdgeMilliInches: circumference } = segment;
  const allowance = constraints.maxDistanceMilliInches;
  const fullTurn = 2 * Math.PI;
  const towardPreferred = Math.atan2(preferred.yMilliInches - center.yMilliInches,
    preferred.xMilliInches - center.xMilliInches);
  const offsets = new Set(Array.from({ length: 16 }, (_, i) => Math.round(circumference * i / 16)));
  offsets.add(Math.min(circumference, Math.round(((towardPreferred + fullTurn) % fullTurn) * radius)));
  const candidates = [];
  for (const along of offsets) {
    const start = resolveOfficialSelectedRosterDeployStartV1(domain, segment, along, leader);
    const angle = along / radius;
    const anchors = [];
    const distance = Math.hypot(preferred.xMilliInches - start.xMilliInches,
      preferred.yMilliInches - start.yMilliInches);
    if (distance > 1 && distance <= allowance) anchors.push(preferred);
    for (const step of axisSamples(2, allowance, distance)) {
      anchors.push({ xMilliInches: Math.round(start.xMilliInches + Math.cos(angle) * step),
        yMilliInches: Math.round(start.yMilliInches + Math.sin(angle) * step) });
    }
    for (const anchor of anchors) {
      if (anchor.xMilliInches < 0 || anchor.xMilliInches > constraints.battlefieldWidthMilliInches
        || anchor.yMilliInches < 0 || anchor.yMilliInches > constraints.battlefieldHeightMilliInches) continue;
      // The shared formation solver fills every follower before Native checks the candidate.
      candidates.push({ anchor, patternId: 'perimeter-' + along,
        parameters: { leadingModelId: leader.modelId, entrySegmentId: segment.segmentId,
          entryAlongEdgeMilliInches: along, path: [anchor], placements: [] } });
    }
  }
  return candidates;
}

function deployCandidates(domain, request, blockers = []) {
  const source = sourceDomain(domain);
  const constraints = source.constraints;
  const profiles = constraints.modelProfiles;
  const preferred = preferredAnchor(request, constraints);
  const candidates = [];
  const boundaryCandidates = [];
  for (const segment of constraints.entrySegments || []) {
    if (segment.kind === "unit_base_perimeter") {
      candidates.push(...perimeterDeploymentCandidates(source, segment, preferred));
      continue;
    }
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
        const append = (xValues, yValues, output, suffix) => {
        for (const centerX of xValues) {
          for (const centerY of yValues) {
            const rows = rowsAt(profiles, offsets, centerX, centerY);
            output.push({
              parameters: {
                leadingModelId: rows[0].modelId,
                entrySegmentId: segment.segmentId,
                entryAlongEdgeMilliInches:
                  new Set(["top", "bottom"]).has(segment.side)
                    ? centerX : centerY,
                path: [rows[0]],
                placements: rows.slice(1),
              },
              patternId: `${transform.id}-gap-${gap}${suffix}`,
              anchor: { xMilliInches: centerX, yMilliInches: centerY },
            });
          }
        }
        };
        append(xs, ys, candidates, "");
        const boundaryValues = deploymentBoundaryAxisSamples(
          constraints, segment, bounds, blockers);
        if (segment.side === "top" || segment.side === "bottom") {
          append(boundaryValues.filter(x => !xs.includes(x)), ys,
            boundaryCandidates, ":entry-boundary");
        } else {
          append(xs, boundaryValues.filter(y => !ys.includes(y)),
            boundaryCandidates, ":entry-boundary");
        }
      }
    }
  }
  const ordered = entries => entries.sort((left, right) => Math.hypot(
    left.anchor.xMilliInches - preferred.xMilliInches,
    left.anchor.yMilliInches - preferred.yMilliInches,
  ) - Math.hypot(
    right.anchor.xMilliInches - preferred.xMilliInches,
    right.anchor.yMilliInches - preferred.yMilliInches,
  ) || left.patternId.localeCompare(right.patternId));
  return [...ordered(candidates), ...ordered(boundaryCandidates)];
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
    ...(isOfficialNonEntryEdgeGroundDeployDomainV1(source)
      ? source.constraints.geometryDescription : {}),
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

function selfPlaceAbilityCandidates(state, domain, request) {
  const source = sourceDomain(domain);
  if (source.effectContract?.targetKind !== "self_place"
    || !Array.isArray(source.parameterSchema?.placements?.modelIds)) {
    throw new TypeError("LEGAL_FORMATION_ACTIVE_ABILITY_NOT_SELF_PLACE");
  }
  const profiles = relocationModelProfiles(state, domain);
  const expectedModelIds = source.parameterSchema.placements.modelIds;
  if (profiles.length !== expectedModelIds.length
    || profiles.some((profile, index) =>
      profile.modelId !== expectedModelIds[index])) {
    throw new TypeError("LEGAL_FORMATION_ACTIVE_ABILITY_MODELS_STALE");
  }
  const maximum = Number(source.parameterSchema.placements
    .maxDistanceMilliInches);
  if (!Number.isSafeInteger(maximum) || maximum < 1) {
    throw new TypeError("LEGAL_FORMATION_ACTIVE_ABILITY_RANGE_INVALID");
  }
  const payments = source.parameterSchema.paymentCardInstanceIds?.enum;
  if (!Array.isArray(payments) || payments.length < 1) {
    throw new TypeError("LEGAL_FORMATION_ACTIVE_ABILITY_PAYMENT_MISSING");
  }
  const constraints = {
    ...source.constraints,
    modelProfiles: profiles,
    maxDistanceMilliInches: maximum,
    battlefieldWidthMilliInches:
      Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches:
      Math.round(Number(state.board.heightInches) * 1000),
  };
  const representativePayment = firstPaymentSelection(source);
  return relocationCandidates({ ...source, constraints }, request)
    .map((candidate) => ({
      ...candidate,
      patternId: `self-place:${candidate.patternId}`,
      leadingModelId: profiles[0].modelId,
      modelProfiles: profiles,
      parameters: {
        activeUnitId: source.pieceId,
        paymentCardInstanceIds: clone(representativePayment),
        placements: [
          { modelId: candidate.parameters.leadingModelId,
            ...clone(candidate.parameters.path.at(-1)) },
          ...clone(candidate.parameters.placements),
        ],
      },
    }));
}

function selfPlaceSearchRequest(state, domain, request) {
  const supplied = request.preferredAnchor;
  if (Number.isSafeInteger(supplied?.xMilliInches)
    && Number.isSafeInteger(supplied?.yMilliInches)) return request;
  const source = sourceDomain(domain);
  const actor = (state.pieces || []).find((entry) =>
    entry.id === source.pieceId);
  const leading = (actor?.models || []).find((entry) =>
    entry.isDestroyed !== true && entry.isOnField !== false);
  if (!leading || !Number.isFinite(Number(leading.xInches))
    || !Number.isFinite(Number(leading.yInches))) return request;
  const objective = normalizeFormationObjectives(request)
    .filter((entry) => entry.kind === "control_objective")
    .sort((left, right) => right.weight - left.weight)[0];
  if (!objective) return request;
  const requestedIds = new Set(objective.targetIds);
  const markers = (state.board?.missionMarkers || []).filter((entry) =>
    entry.isRemoved !== true
      && (requestedIds.size === 0 || requestedIds.has(entry.id))
      && Number.isFinite(Number(entry.xInches))
      && Number.isFinite(Number(entry.yInches)));
  if (markers.length === 0) return request;
  const target = markers.sort((left, right) => Math.hypot(
    Number(left.xInches) - Number(leading.xInches),
    Number(left.yInches) - Number(leading.yInches)) - Math.hypot(
    Number(right.xInches) - Number(leading.xInches),
    Number(right.yInches) - Number(leading.yInches))
    || String(left.id).localeCompare(String(right.id)))[0];
  return { ...request, preferredAnchor: {
    xMilliInches: Math.round(Number(target.xInches) * 1000),
    yMilliInches: Math.round(Number(target.yInches) * 1000),
  } };
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
          ...(isOfficialNonEntryEdgeGroundDeployDomainV1(source)
            ? { activeUnitId: source.parameterSchema.activeUnitId.const } : {}),
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
  // A coarse board lattice can miss every point in a narrow legal corridor.
  // Add bounded local translations around the real leader; these carry no
  // strategic preference and still require complete packing + Native routing.
  const preferredAngle = Math.atan2(preferred.yMilliInches - start.yMilliInches,
    preferred.xMilliInches - start.xMilliInches);
  const localAnchors = new Set();
  for (const radius of [100, 250, 500, 1000].filter(value => value <= maximum)) {
    for (const angle of [preferredAngle, ...Array.from({ length: 8 },
      (_, index) => index * Math.PI / 4)]) {
      const anchor = {
        xMilliInches: Math.round(start.xMilliInches + Math.cos(angle) * radius),
        yMilliInches: Math.round(start.yMilliInches + Math.sin(angle) * radius),
      };
      const key = anchor.xMilliInches + ':' + anchor.yMilliInches;
      if (localAnchors.has(key)) continue;
      localAnchors.add(key);
      candidates.push({ parameters: { leadingModelId: profiles[0].modelId,
        path: [anchor], placements: [] }, anchor,
        patternId: 'current-position-local-translation-' + key });
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

// A long geometric route guides ONLY the current Native action. Future speed,
// phase availability, formation legality and arrival time are not established
// by this route. Recompute from each actual successor rather than teleporting
// to the goal or assuming that subsequent actions will be legal.
function guidedMovementCandidates(state, source, request, blockers) {
  const horizon = request.routePlanningDistanceMilliInches;
  if (horizon === undefined) return [];
  if (!Number.isSafeInteger(horizon) || horizon < 1) {
    throw new TypeError('LEGAL_FORMATION_ROUTE_PLANNING_DISTANCE_INVALID');
  }
  if (!['move', 'run', 'disengage'].includes(source.actionType)) return [];
  const profiles = source.constraints.modelProfiles;
  const profile = profiles[0], start = profile?.startPoint;
  const maximum = Number(source.constraints.maxDistanceMilliInches);
  const actor = (state.pieces || []).find(p => p.id === source.pieceId);
  const model = actor?.models?.find(m => m.id === profile?.modelId);
  if (!start || !Number.isSafeInteger(maximum) || maximum < 2
    || horizon < maximum
    || String(profile.startElevation || model?.elevation || 'ground') !== 'ground') return [];
  const target = preferredAnchor(request, source.constraints);
  const route = createStarcraftTmgModelObstacleRoutePlannerV1({
    start, movingFootprint: footprintAt(profile, start, Number(model?.baseRotationDegrees || 0)),
    modelBlockers: blockers,
    battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
  }).routeTo({ endpoint: { ...target, elevation: 'ground' }, maxDistanceMilliInches: horizon });
  if (route.status !== 'candidate_found') return [];
  // Integer endpoint rounding must not increase the Native movement allowance.
  let remaining = maximum - 2, previous = start;
  const path = [];
  for (const point of route.path) {
    const length = Math.hypot(point.xMilliInches - previous.xMilliInches,
      point.yMilliInches - previous.yMilliInches);
    if (length < 1) continue;
    if (length <= remaining) {
      path.push(clone(point)); remaining -= length; previous = point;
    } else {
      if (remaining >= 1) path.push({ ...clone(point),
        xMilliInches: Math.round(previous.xMilliInches
          + (point.xMilliInches - previous.xMilliInches) * remaining / length),
        yMilliInches: Math.round(previous.yMilliInches
          + (point.yMilliInches - previous.yMilliInches) * remaining / length) });
      break;
    }
  }
  if (!path.length) return [];
  const endpoint = path.at(-1);
  return [{
    parameters: { leadingModelId: profile.modelId, path, placements: [] },
    anchor: { xMilliInches: endpoint.xMilliInches, yMilliInches: endpoint.yMilliInches },
    patternId: 'bounded-geometric-route-prefix', modelProfiles: profiles,
    routeGuidance: { kind: 'geometric_route_current_action_prefix', target,
      routePlanningDistanceMilliInches: horizon,
      geometricRouteDistanceMilliInches: route.distanceMilliInches,
      geometricPath: clone(route.path), currentActionMaximumDistanceMilliInches: maximum,
      futureActionsProven: false, arrivalRoundProven: false,
      completeFutureFormationChecked: false, trainingTruth: false },
  }];
}

function segmentCrossesAxisAlignedAccessPoint(start, end, footprint) {
  if (footprint?.shape !== "axis_aligned_rectangle") return false;
  let first = 0;
  let last = 1;
  for (const [axis, minimum, maximum] of [
    ["xMilliInches", footprint.minXMilliInches,
      footprint.maxXMilliInches],
    ["yMilliInches", footprint.minYMilliInches,
      footprint.maxYMilliInches],
  ]) {
    const origin = Number(start[axis]);
    const delta = Number(end[axis]) - origin;
    if (![origin, delta, Number(minimum), Number(maximum)]
      .every(Number.isFinite)) return false;
    if (delta === 0) {
      if (origin < minimum || origin > maximum) return false;
      continue;
    }
    const near = (Number(minimum) - origin) / delta;
    const far = (Number(maximum) - origin) / delta;
    first = Math.max(first, Math.min(near, far));
    last = Math.min(last, Math.max(near, far));
    if (first > last) return false;
  }
  return true;
}

function directChargeAccessTransitions(state, leadingProfile, endpoint) {
  const fromElevation = String(leadingProfile.startElevation || "ground");
  const toElevation = String(endpoint.elevation || "ground");
  if (fromElevation === toElevation) return [[]];
  return (state.board?.specialTerrainAgreement?.terrainEntries || [])
    .flatMap((entry) => entry.accessPoints || [])
    .filter((accessPoint) => {
      const connects = new Set(accessPoint.connects || []);
      return connects.has(fromElevation) && connects.has(toElevation)
        && segmentCrossesAxisAlignedAccessPoint(
          leadingProfile.startPoint, endpoint, accessPoint.footprint);
    })
    .map((accessPoint) => [{ segmentIndex: 0,
      accessPointId: accessPoint.accessPointId }]);
}

// Engagement is pairwise in the Native graph. A one-model read-only projection
// can therefore reject an undeclared enemy edge while packing, without a second
// distance/elevation/wall rule or a synthetic action receipt. The complete
// formation and path still have to pass Native instantiate().
function chargePlacementEligibility(state, actor, declaredUnitIds, blockers, diagnostic) {
  const enemies = state.pieces.filter(piece => piece.sideKey !== actor.sideKey
    && !declaredUnitIds.has(piece.id) && piece.isOnField === true
    && piece.isDestroyed !== true && Number(piece.currentModels) > 0);
  if (!enemies.length) return null;
  const enemyIds = new Set(enemies.map(piece => piece.id));
  const enemyBlockers = blockers.filter(blocker => enemyIds.has(blocker.pieceId));
  const models = new Map(actor.models.map(model => [model.id, model]));
  const cache = new Map();
  return ({ profile, footprint, point, rotationDegrees }) => {
    const key = `${profile.modelId}:${point.xMilliInches}:${point.yMilliInches}:${rotationDegrees}`;
    if (!cache.has(key)) {
      const nearby = enemyBlockers.some(blocker => evaluateOfficialPhysicalFootprintRelationV1({
        left: footprint, right: blocker.footprint,
      }).minimumSeparationMilliInches <= OFFICIAL_ENGAGEMENT_RANGE_V2_MILLI_INCHES);
      if (!nearby) cache.set(key, true);
      else {
        const model = { ...models.get(profile.modelId),
          xInches: point.xMilliInches / 1000, yInches: point.yMilliInches / 1000,
          baseRotationDegrees: rotationDegrees };
        const projected = { ...state, pieces: [
          { ...actor, currentModels: 1, models: [model] }, ...enemies,
        ] };
        const surface = deriveOfficialModelSurfacePlacementV2(projected,
          { pieceId: actor.id, modelId: model.id });
        Object.assign(model, { elevation: surface.elevation,
          supportTerrainIds: surface.supportTerrainIds,
          adjacentAccessPointIds: surface.adjacentAccessPointIds });
        const graph = deriveOfficialEngagementGraphV2(projected);
        cache.set(key, !graph.modelEdges.some(edge =>
          edge.leftUnitId === actor.id || edge.rightUnitId === actor.id));
      }
    }
    const allowed = cache.get(key);
    if (!allowed) diagnostic.undeclaredEngagementRejected += 1;
    return allowed;
  };
}

// Contact can require a detour longer than the roll while engagement is still
// reachable by spending the whole roll along that route. Sample that prefix;
// the extra inch is only a route-planning horizon, never a movement allowance.
// Every yielded complete layout still goes through the ordinary Native check.
function* routedChargePrefixCandidates(state, domain, request, progress) {
  const source = sourceDomain(domain);
  const constraints = source.constraints;
  if (source.parameterSchema?.outcome?.length === 1
    && source.parameterSchema.outcome[0] === "failure") return;
  const actor = state.pieces.find(piece => piece.id === source.pieceId);
  const allProfiles = relocationModelProfiles(state, domain);
  const leader = allProfiles.find(profile =>
    profile.modelId === constraints.leadingModelId);
  if (!leader?.startPoint || String(leader.startElevation || "ground") !== "ground") return;
  const profiles = [leader, ...allProfiles.filter(profile => profile !== leader)];
  const blockers = blockingFootprints(state, source.pieceId);
  const declaredTargets = constraints.declaredTargets || [];
  const declaredUnitIds = new Set(declaredTargets.map(target => target.unitId));
  const targetIds = [...new Set(declaredTargets.flatMap(target =>
    [String(target.unitId), String(target.modelId)]))];
  const targets = blockers.filter(blocker => blocker.kind === "model"
    && declaredUnitIds.has(blocker.pieceId));
  const objectives = normalizeFormationObjectives(request);
  const policies = formationSolverPolicies([{kind: "maximize_engagement",
    weight: 5, targetIds}, ...objectives.filter(objective =>
    objective.kind !== "maximize_engagement"
      || objective.targetIds.join("\u0000") !== targetIds.join("\u0000"))]);
  const diagnostic = {leaderFootprintRejected: 0, leaderOutOfBounds: 0,
    leaderNoSurface: 0, leaderBlockedByModelOrTerrain: 0,
    followerUnplaceable: 0, maxFollowersPlaced: 0,
    undeclaredEngagementRejected: 0, routeRequests: 0, routedPrefixes: 0};
  const placementAllowed = constraints.undeclaredEnemyEngagementProhibited === true
    ? chargePlacementEligibility(state, actor, declaredUnitIds, blockers, diagnostic) : null;
  const coherencyLinkAllows = createOfficialCoherencyLinkEvaluatorV1({state, actor,
    dataBundle: state.officialModelBaseGeometryDataBundle, currentlyEngagedEnemyUnitIds: []});
  const targetIndex = formationIntentTargetIndex(state, blockers);
  const model = actor.models.find(entry => entry.id === leader.modelId);
  const router = createStarcraftTmgModelObstacleRoutePlannerV1({
    start: leader.startPoint,
    movingFootprint: footprintAt(leader, leader.startPoint, Number(model?.baseRotationDegrees || 0)),
    modelBlockers: blockers,
    battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
  });
  const angleIndices = [];
  for (const step of [24, 12, 6, 3, 1]) for (let index = 0; index < 48; index += step) {
    if (!angleIndices.includes(index)) angleIndices.push(index);
  }
  const rotations = String(leader.baseShape || leader.shape) === "round" ? [0] : [0, 45, 90, 135];
  const maxDistance = Number(constraints.maxDistanceMilliInches);
  const seenPaths = new Set();
  // A contact ring can be screened by friendly bases or terrain even though
  // the outer engagement band remains reachable. Sample both, with the same
  // full-distance and Native engagement obligations; this is not a new rule.
  for (const engagementOffset of [0, 999, 750, 500, 250])
  for (const target of targets) for (const rotation of rotations) for (const index of angleIndices) {
    const angle = index * Math.PI / 24;
    let endpoint = contactAnchor(leader, target.footprint, angle, rotation);
    if (!endpoint) continue;
    endpoint = {...endpoint,
      xMilliInches: Math.round(endpoint.xMilliInches + Math.cos(angle) * engagementOffset),
      yMilliInches: Math.round(endpoint.yMilliInches + Math.sin(angle) * engagementOffset)};
    const endpointFootprint = footprintAt(leader, endpoint, rotation);
    if (blockers.some(blocker => evaluateOfficialPhysicalFootprintRelationV1({
      left: endpointFootprint, right: blocker.footprint}).overlappingInteriors)) continue;
    diagnostic.routeRequests += 1;
    const route = router.routeTo({endpoint, maxDistanceMilliInches: maxDistance + 1000});
    if (route.status !== "candidate_found" || route.path.length < 2) continue;
    let previous = leader.startPoint;
    let remaining = maxDistance;
    const path = [];
    for (const point of route.path) {
      const distance = Math.hypot(point.xMilliInches - previous.xMilliInches,
        point.yMilliInches - previous.yMilliInches);
      if (distance <= remaining) {
        path.push(point); remaining -= distance; previous = point;
      } else {
        path.push({...point,
          xMilliInches: Math.round(previous.xMilliInches + (point.xMilliInches - previous.xMilliInches) * remaining / distance),
          yMilliInches: Math.round(previous.yMilliInches + (point.yMilliInches - previous.yMilliInches) * remaining / distance)});
        break;
      }
    }
    const key = JSON.stringify(path);
    if (!path.length || seenPaths.has(key)) continue;
    seenPaths.add(key);
    diagnostic.routedPrefixes += 1;
    const anchor = path.at(-1);
    // A short route stopping in the engagement band cannot satisfy Native's
    // closest-position obligation unless it actually reaches base contact.
    if (route.distanceMilliInches < maxDistance - 1) {
      const footprint = footprintAt(leader, anchor, rotation);
      if (!targets.some(entry => evaluateOfficialPhysicalFootprintRelationV1({
        left: footprint, right: entry.footprint}).minimumSeparationMilliInches <= 1)) continue;
    }
    for (const policy of policies) {
      const solved = solveIntentFormationRows({state, profiles, anchor,
        angle: Math.atan2(anchor.yMilliInches - leader.startPoint.yMilliInches,
          anchor.xMilliInches - leader.startPoint.xMilliInches),
        coherencyRangeMilliInches: Number(constraints.coherencyRangeMilliInches),
        excludedPieceId: source.pieceId, sideKey: source.sideKey || actor.sideKey,
        policy, diagnostic, coherencyLinkAllows, blockers, targetIndex, placementAllowed});
      if (!solved) continue;
      yield {parameters: {outcome: "success", path: clone(path), placements: solved.rows.slice(1)},
        patternId: `intent-solver:${solved.policyId}:routed-charge-prefix`,
        solverPolicyId: solved.policyId, formationObjectives: solved.objectives,
        tacticalMetrics: solved.metrics, anchor, modelProfiles: profiles,
        leadingModelId: leader.modelId,
        requiredSpatialConstraints: {declaredTargets: clone(declaredTargets),
          allDeclaredTargetsMustBeEngaged: constraints.allDeclaredTargetsMustBeEngaged === true,
          undeclaredEnemyEngagementProhibited: constraints.undeclaredEnemyEngagementProhibited === true,
          closestPositionRequiredUnlessBaseToBase: true,
          remainingPlacementPriority: clone(constraints.remainingPlacementPriority || [])},
        targetAnchor: {unitId: target.pieceId, modelId: target.modelId,
          point: footprintCenter(target.footprint), seedKind: "routed_maximum_distance_closest_position"},
        sameAnchorAlternativesMeaningful: true};
    }
  }
  progress?.("charge_routed_prefix_diagnostic", diagnostic);
}

function* criticalChargeCandidates(state,domain,request,progress){
  const source=sourceDomain(domain),constraints=source.constraints;
  if(source.parameterSchema?.outcome?.length===1&&source.parameterSchema.outcome[0]==='failure')return;
  const actor=state.pieces.find(p=>p.id===source.pieceId),allProfiles=relocationModelProfiles(state,domain),leader=allProfiles.find(p=>p.modelId===constraints.leadingModelId);
  if(!leader?.startPoint||String(leader.startElevation||'ground')!=='ground')return;
  const profiles=[leader,...allProfiles.filter(p=>p!==leader)],blockers=blockingFootprints(state,actor.id),declared=new Set((constraints.declaredTargets||[]).map(t=>t.unitId)),targets=blockers.filter(b=>b.kind==='model'&&declared.has(b.pieceId));
  const moving=footprintAt(leader,leader.startPoint,0),anchors=chargeCriticalEndpointCandidatesV1(moving,targets,blockers);
  if(!anchors.length)return;
  const router=createStarcraftTmgModelObstacleRoutePlannerV1({start:leader.startPoint,movingFootprint:moving,modelBlockers:blockers,battlefieldWidthMilliInches:Math.round(state.board.widthInches*1000),battlefieldHeightMilliInches:Math.round(state.board.heightInches*1000)});
  const targetIds=[...new Set((constraints.declaredTargets||[]).flatMap(t=>[String(t.unitId),String(t.modelId)]))],objectives=normalizeFormationObjectives(request),policies=formationSolverPolicies([{kind:'maximize_engagement',weight:5,targetIds},...objectives.filter(o=>o.kind!=='maximize_engagement')]);
  const diagnostic={leaderFootprintRejected:0,leaderOutOfBounds:0,leaderNoSurface:0,leaderBlockedByModelOrTerrain:0,followerUnplaceable:0,maxFollowersPlaced:0,undeclaredEngagementRejected:0,anchors:anchors.length,routeRequests:0,closestProven:0};
  const coherencyLinkAllows=createOfficialCoherencyLinkEvaluatorV1({state,actor,dataBundle:state.officialModelBaseGeometryDataBundle,currentlyEngagedEnemyUnitIds:[]}),placementAllowed=chargePlacementEligibility(state,actor,declared,blockers,diagnostic),targetIndex=formationIntentTargetIndex(state,blockers);
  for(const anchor of anchors.slice(0,64)){
    const fp=footprintAt(leader,anchor,0);
    if(blockers.some(b=>evaluateOfficialPhysicalFootprintRelationV1({left:fp,right:b.footprint}).overlappingInteriors))continue;
    diagnostic.routeRequests++;
    const route=router.routeTo({endpoint:anchor,maxDistanceMilliInches:Number(constraints.maxDistanceMilliInches)});
    if(route.status!=='candidate_found')continue;
    const proof=proveOfficialChargeClosestPositionV1(state,anchor);
    if(!proof.closestPositionProven)continue;
    diagnostic.closestProven++;
    for(const policy of policies){
      const solved=solveIntentFormationRows({state,profiles,anchor,angle:Math.atan2(anchor.yMilliInches-leader.startPoint.yMilliInches,anchor.xMilliInches-leader.startPoint.xMilliInches),coherencyRangeMilliInches:Number(constraints.coherencyRangeMilliInches),excludedPieceId:actor.id,sideKey:source.sideKey||actor.sideKey,policy,diagnostic,coherencyLinkAllows,blockers,targetIndex,placementAllowed});
      if(!solved)continue;
      yield {parameters:{outcome:'success',path:clone(route.path),placements:solved.rows.slice(1)},patternId:'intent-solver:'+solved.policyId+':certified-closest-charge',solverPolicyId:solved.policyId,formationObjectives:solved.objectives,tacticalMetrics:solved.metrics,anchor,modelProfiles:profiles,leadingModelId:leader.modelId,requiredSpatialConstraints:{declaredTargets:clone(constraints.declaredTargets),closestPositionProof:proof},sameAnchorAlternativesMeaningful:true};
    }
  }
  progress?.('charge_critical_endpoint_diagnostic',diagnostic);
}

function chargeCandidateStream(state, domain, request, progress) {
  const stream = {length: 0, complete: false, *[Symbol.iterator]() {
    for (const candidate of criticalChargeCandidates(state, domain, request, progress)) {
      stream.length += 1; yield candidate;
    }
    for (const candidate of routedChargePrefixCandidates(state, domain, request, progress)) {
      stream.length += 1; yield candidate;
    }
    for (const candidate of chargeResolutionCandidates(state, domain, request, progress)) {
      stream.length += 1; yield candidate;
    }
    stream.complete = true;
  }};
  return stream;
}

function chargeResolutionCandidates(state, domain, request, progress = null) {
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
  // Rules has already excluded the whole legal endpoint/path domain. Emit its
  // exact typed failure parameters; the ordinary instantiate/apply path still
  // recomputes that certificate. Zero heuristic candidates is never this proof.
  if (source.parameterSchema?.outcome?.length === 1
    && source.parameterSchema.outcome[0] === "failure"
    && source.parameterSchema.failureProofKind
      === "occupied_cross_section_distance_shortfall"
    && constraints.allActiveTargetModelsCovered === true
    && typeof constraints.certificateHash === "string") {
    return [{ parameters: { outcome: "failure", failureProof: {
      kind: source.parameterSchema.failureProofKind } },
      patternId: "charge-failure:occupied-cross-section",
      solverPolicyId: "rules-proven-occupied-cross-section",
      formationObjectives: normalizeFormationObjectives(request),
      tacticalMetrics: { outcome: "failure",
        proofKind: source.parameterSchema.failureProofKind,
        physicalGeometryMetricsExact: true,
        tacticalOutcomeIsAdvisoryUntilPreviewAndOpponentResponse: false },
      anchor: clone(leadingProfile.startPoint),
      modelProfiles: profiles,
      leadingModelId,
      sameAnchorAlternativesMeaningful: false }];
  }
  const coherencyLinkAllows = createOfficialCoherencyLinkEvaluatorV1({
    state, actor, dataBundle: state.officialModelBaseGeometryDataBundle,
    currentlyEngagedEnemyUnitIds: [],
  });
  const blockers = blockingFootprints(state, source.pieceId);
  const leadingModel = (actor.models || []).find(model => model.id === leadingModelId);
  const routePlanner = createStarcraftTmgModelObstacleRoutePlannerV1({
    start: leadingProfile.startPoint,
    movingFootprint: footprintAt(leadingProfile, leadingProfile.startPoint,
      Number(leadingModel?.baseRotationDegrees || 0)),
    modelBlockers: blockers,
    battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
    battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
  });
  const modelRoutesByEndpoint = new Map();
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
  // One synchronous query owns this immutable geometry. Each policy still
  // solves every original anchor; no cross-query/state cache is introduced.
  const intentTargetIndex = formationIntentTargetIndex(state, blockers);
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
  // Visit coarse directions before refining them. A bounded search must cover
  // both sides of a target, rather than spend its budget on adjacent angles.
  const angleIndices = [];
  for (const step of [24, 12, 6, 3, 1]) {
    for (let index = 0; index < 48; index += step) {
      if (!angleIndices.includes(index)) angleIndices.push(index);
    }
  }
  const angles = angleIndices.map(index => (Math.PI * 2 * index) / 48);
  const rotations = String(leadingProfile.baseShape || leadingProfile.shape)
    === "round" ? [0] : [0, 45, 90, 135];
  const candidates = [];
  let originalCandidateCount = 0;
  const diagnostic = { contactSeeds: 0, closestPositionSeeds: 0,
    uniqueAnchors: 0, anchorsOutsideRolledMove: 0,
    intentFormationUnsolved: 0, solvedFormations: 0,
    modelProfiles: profiles.length,
    leaderFootprintRejected: 0, leaderOutOfBounds: 0,
    leaderNoSurface: 0, leaderBlockedByModelOrTerrain: 0,
    followerUnplaceable: 0, maxFollowersPlaced: 0,
    modelObstacleRouteRequests: 0, modelObstacleDetoursFound: 0,
    modelObstacleRoutesUnknown: 0, additionalDetourCandidates: 0,
    undeclaredEngagementRejected: 0 };
  const generationLimit = Math.max(24, Math.min(192,
    Number(request.maximumOptions || DEFAULT_MAX_OPTIONS) * 24));
  // Keep nominated-model seeds first. The execution kernel checks engagement
  // and base contact with each declared *Unit*, not only its nominated model.
  // A screened nomination must not hide contact with another live model of
  // that same Unit. All generated layouts still require full Rules validation;
  // declaration identity, target Units and distance-failure proofs stay intact.
  const declaredUnitIds = new Set(declaredTargets.map(target => target.unitId));
  const placementAllowed = constraints.undeclaredEnemyEngagementProhibited === true
    ? chargePlacementEligibility(state, actor, declaredUnitIds, blockers, diagnostic)
    : null;
  const nominatedModelIds = new Set(declaredTargets.map(target => target.modelId));
  const contactTargets = [...declaredTargets, ...blockers.filter(blocker =>
    blocker.kind === "model" && declaredUnitIds.has(blocker.pieceId)
      && !nominatedModelIds.has(blocker.modelId)).map(blocker => ({
    unitId: blocker.pieceId, modelId: blocker.modelId, blocker,
  }))];
  const perTargetGenerationLimit = Math.ceil(generationLimit / contactTargets.length);
  for (const target of contactTargets) {
    const targetPoint = footprintCenter(target.blocker.footprint);
    let targetCandidateCount = 0;
    targetSeedSearch: for (const rotationDegrees of rotations) {
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
      diagnostic.contactSeeds += contactSeeds.length;
      diagnostic.closestPositionSeeds += closestPositionSeeds.length;
      for (const seed of [...contactSeeds, ...closestPositionSeeds]) {
        const anchor = seed.anchor;
        if (!anchor) continue;
        const anchorKey = `${anchor.xMilliInches}:${anchor.yMilliInches}`;
        if (seenAnchors.has(anchorKey)) continue;
        seenAnchors.add(anchorKey);
        diagnostic.uniqueAnchors += 1;
        const travelled = Math.hypot(
          anchor.xMilliInches - leadingProfile.startPoint.xMilliInches,
          anchor.yMilliInches - leadingProfile.startPoint.yMilliInches,
        );
        if (travelled <= 1
          || travelled > Number(constraints.maxDistanceMilliInches) + 1) {
          diagnostic.anchorsOutsideRolledMove += 1;
          continue;
        }
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
            diagnostic,
            coherencyLinkAllows,
            blockers,
            targetIndex: intentTargetIndex,
            placementAllowed,
          });
          if (!solved) {
            diagnostic.intentFormationUnsolved += 1;
            continue;
          }
          diagnostic.solvedFormations += 1;
          const rows = solved.rows;
          const pathEndpoint = Object.fromEntries(Object.entries(rows[0])
            .filter(([key]) => key !== "modelId"));
          const sameElevation = String(leadingProfile.startElevation || "ground")
            === String(pathEndpoint.elevation || "ground");
          const endpointKey = JSON.stringify(pathEndpoint);
          if (sameElevation && !modelRoutesByEndpoint.has(endpointKey)) {
            diagnostic.modelObstacleRouteRequests += 1;
            const route = routePlanner.routeTo({
              endpoint: pathEndpoint,
              maxDistanceMilliInches: Number(constraints.maxDistanceMilliInches),
            });
            modelRoutesByEndpoint.set(endpointKey, route);
            if (route.status === "unknown") diagnostic.modelObstacleRoutesUnknown += 1;
            else if (route.path.length > 1) diagnostic.modelObstacleDetoursFound += 1;
          }
          const modelRoute = modelRoutesByEndpoint.get(endpointKey);
          for (const elevationTransitions of directChargeAccessTransitions(
            state, leadingProfile, pathEndpoint)) {
            const originalCandidate = {
              parameters: {
                outcome: "success",
                path: [pathEndpoint],
                placements: rows.slice(1),
                ...(elevationTransitions.length ? { elevationTransitions } : {}),
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
            };
            candidates.push(originalCandidate);
            originalCandidateCount += 1;
            targetCandidateCount += 1;
            // Additional geometric candidates do not spend the original
            // formation-generation budget or remove old intent alternatives.
            // Exact terrain/engagement/coherency still run in instantiate().
            if (modelRoute?.status === "candidate_found"
              && modelRoute.path.length > 1) {
              candidates.push({ ...originalCandidate,
                parameters: { ...originalCandidate.parameters,
                  path: clone(modelRoute.path) },
                patternId: `${originalCandidate.patternId}:model-obstacle-route`,
              });
              diagnostic.additionalDetourCandidates += 1;
            }
            if (originalCandidateCount >= generationLimit) {
              progress?.("charge_candidate_generation_diagnostic", diagnostic);
              return candidates;
            }
            if (targetCandidateCount >= perTargetGenerationLimit) {
              break targetSeedSearch;
            }
          }
        }
      }
    }
  }
  progress?.("charge_candidate_generation_diagnostic", diagnostic);
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

function minimumPaymentChoices(source) {
  const choices = source.parameterSchema?.paymentCardInstanceIds?.enum || [];
  return clone(choices.filter((choice) => !choices.some((other) =>
    other.length < choice.length
      && other.every((cardId) => choice.includes(cardId)))));
}

export function projectStarcraftTmgFormationPaymentsV1(parameterSchema,
  formationOptions = []) {
  const declared = parameterSchema?.paymentCardInstanceIds?.enum;
  // New queries use the Rules domain for every formation action family.
  // Retained legacy receipts may have omitted the menu: recover only payment
  // sets already present in complete, Rules-instantiated canonical options.
  const choices = Array.isArray(declared) ? clone(declared)
    : formationOptions.filter((option) =>
      option.rulesAuthority === true
      && option.completeFormationPlacementChecked === true
      && Array.isArray(option.canonicalParameters?.paymentCardInstanceIds))
      .map((option) => clone(option.canonicalParameters.paymentCardInstanceIds));
  const unique = [...new Map(choices.map((choice) => [
    [...choice].sort().join('|'), choice,
  ])).values()];
  return {
    legalPaymentChoices: unique,
    paymentChoicesForDecision: unique.filter((choice) =>
      !unique.some((other) => other.length < choice.length
        && other.every((cardId) => choice.includes(cardId)))),
  };
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
        }),
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

function lifecycleConsumerCandidates(state, domain, request, diagnostic) {
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
    const shadeFootprint = createOfficialPhysicalFootprintV1({ objectId: source.sourceInstanceId,
      shape: "round", center: point, widthMilliInches: Math.round(diameter * 1000),
      depthMilliInches: Math.round(diameter * 1000) });
    const anchors = [{ point, angle: 0, gap: "token_center" }];
    for (const gapMilliInches of [0, 1_500, Math.max(0, coherencyRangeMilliInches - 2 * leaderRadius)]) {
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
          diagnostic,
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
        if (!solved.rows.every(row => {
          const profile = profiles.find(entry => entry.modelId === row.modelId);
          return isOfficialPhysicalFootprintWhollyWithinRangeV1({ source: shadeFootprint,
            target: footprintAt(profile, row, row.rotationDegrees || 0),
            rangeMilliInches: coherencyRangeMilliInches });
        })) { diagnostic.sourceRangeRejected += 1; continue; }
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
          diagnostic,
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
          diagnostic,
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
    ...(candidate.routeGuidance ? { guidedPath: candidate.parameters.path } : {}),
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
    coherencyRangeMilliInches: isOfficialNonEntryEdgeGroundDeployDomainV1(source)
      ? source.constraints.geometryDescription.coherencyRangeMilliInches
      : source.actionType === "resolve_relocation_ability"
        ? source.constraints?.coherencyRangeMilliInches
          ?? horizontalCoherencyRange(state, actor)
        : horizontalCoherencyRange(state, actor),
    excludedPieceId: source.pieceId,
    sideKey: source.sideKey || actor?.sideKey,
    policy,
    blockers: searchContext.blockers,
    targetIndex: searchContext.targetIndex,
    diagnostic: searchContext.diagnostic,
    minimumEnemyGapMilliInchesExclusive:
      source.constraints?.minimumEnemyGapMilliInchesExclusive,
  });
  if (!solved) return null;
  const parameters = clone(candidate.parameters);
  const rows = solved.rows;
  if (object(parameters.placementPlan)) {
    parameters.placementPlan.leadingModelId = rows[0].modelId;
    parameters.placementPlan.placements = rows;
  } else if (source.actionType === "resolve_relocation_ability"
    || isOfficialNonEntryEdgeGroundDeployDomainV1(source)) {
    parameters.leadingModelId = rows[0].modelId;
    parameters.placements = rows;
    if (source.effectKind === "extra_move") parameters.path = [rows[0]];
  } else if (source.actionType === "use_active_ability") {
    parameters.placements = rows.map((row) => ({
      modelId: row.modelId,
      xMilliInches: row.xMilliInches,
      yMilliInches: row.yMilliInches,
    }));
  } else {
    parameters.leadingModelId = rows[0].modelId;
    parameters.path = candidate.routeGuidance
      ? [...parameters.path.slice(0, -1), rows[0]] : [rows[0]];
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
    ? parameters.placementPlan
    : Array.isArray(parameters.placement)
      ? { ...parameters, placements: parameters.placement }
      : parameters;
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
      markerQualification: clone(entry.markerQualification || null),
      precision: entry.precision,
    } : {
      edgeId: entry.edgeId,
      edgeKind: entry.edgeKind,
      targetId: entry.toUnitId,
      fromUnitId: entry.fromUnitId,
      relation: entry.relation,
      minimumBaseEdgeDistanceMilliInches:
        entry.nearestPhysicalEdges?.distanceMilliInches ?? null,
      engaged: entry.engagement?.engaged === true,
      visibleModelPairCount: entry.lineOfSight?.visibleModelPairCount ?? null,
      unknownModelPairCount: entry.lineOfSight?.unknownModelPairCount ?? null,
      stationaryThreatProfileKeys:
        clone(entry.threats?.fromTo?.stationaryProfileKeys || []),
      stationaryThreatProfileCount:
        entry.threats?.fromTo?.stationaryProfileKeys?.length || 0,
      currentRoundStationaryThreatProfileKeys: clone(entry.threats?.fromTo
        ?.currentRoundStationaryProfileKeys || []),
      currentRoundStationaryThreatProfileCount:
        entry.threats?.fromTo?.currentRoundStationaryProfileKeys?.length || 0,
      stationaryThreatUnknownProfileKeys: clone(entry.threats?.fromTo
        ?.stationaryUnknownProfileKeys || []),
      currentRoundStationaryThreatUnknownProfileKeys: clone(entry.threats
        ?.fromTo?.currentRoundStationaryUnknownProfileKeys || []),
      moveThenAttackProfileKeys:
        clone(entry.threats?.fromTo?.moveThenAttackProfileKeys || []),
      currentRoundMoveThenAttackProfileKeys: clone(entry.threats?.fromTo
        ?.currentRoundMoveThenAttackProfileKeys || []),
      futureRoundMoveThenAttackProfileKeys: clone(entry.threats?.fromTo
        ?.futureRoundMoveThenAttackProfileKeys || []),
      outgoingThreatActionWindow:
        clone(entry.threats?.fromTo?.actionWindow || null),
      enemyStationaryThreatProfileKeys:
        clone(entry.threats?.toFrom?.stationaryProfileKeys || []),
      enemyStationaryThreatProfileCount:
        entry.threats?.toFrom?.stationaryProfileKeys?.length || 0,
      enemyCurrentRoundStationaryThreatProfileKeys: clone(entry.threats?.toFrom
        ?.currentRoundStationaryProfileKeys || []),
      enemyCurrentRoundStationaryThreatProfileCount:
        entry.threats?.toFrom?.currentRoundStationaryProfileKeys?.length || 0,
      enemyStationaryThreatUnknownProfileKeys: clone(entry.threats?.toFrom
        ?.stationaryUnknownProfileKeys || []),
      enemyCurrentRoundStationaryThreatUnknownProfileKeys: clone(entry.threats
        ?.toFrom?.currentRoundStationaryUnknownProfileKeys || []),
      enemyMoveThenAttackProfileKeys:
        clone(entry.threats?.toFrom?.moveThenAttackProfileKeys || []),
      enemyCurrentRoundMoveThenAttackProfileKeys: clone(entry.threats?.toFrom
        ?.currentRoundMoveThenAttackProfileKeys || []),
      enemyFutureRoundMoveThenAttackProfileKeys: clone(entry.threats?.toFrom
        ?.futureRoundMoveThenAttackProfileKeys || []),
      enemyThreatActionWindow:
        clone(entry.threats?.toFrom?.actionWindow || null),
      fireZoneExchangeClass: entry.fireZoneExchange?.class || null,
      precision: entry.precision,
    });
}

function otherSide(sideKey) {
  return sideKey === "player1" ? "player2" : "player1";
}

function normalizeProjectedSurfacePlacements(projected) {
  for (const piece of projected.pieces || []) {
    if (piece.isOnField !== true || piece.isDestroyed === true
      || Number(piece.currentModels || 0) <= 0) continue;
    for (const model of piece.models || []) {
      if (model.isOnField === false || model.isDestroyed === true) continue;
      const surface = deriveOfficialModelSurfacePlacementV2(projected, {
        pieceId: piece.id,
        modelId: model.id,
      });
      model.elevation = surface.elevation;
      model.supportTerrainIds = [...surface.supportTerrainIds];
      model.adjacentAccessPointIds = [...surface.adjacentAccessPointIds];
    }
  }
  return projected;
}

export function projectStarcraftTmgIncomingStationaryFireEstimateV1(
  projected, actorId, graph, options = {},
) {
  const actor = (projected.pieces || []).find((entry) => entry.id === actorId);
  if (!actor) return { status: "unknown", reason: "projected_actor_missing" };
  const visibleOpponentIds = (projected.pieces || []).filter((piece) =>
    piece.sideKey !== actor.sideKey
      && piece.isOnField === true
      && piece.isDestroyed !== true
      && Number(piece.currentModels || 0) > 0).map((piece) => piece.id);
  const opponentRelationships = (graph?.relationships || []).filter((entry) =>
    new Set(["unit_spatial_relationship", "unit_relationship"])
      .has(entry.edgeKind)
      && entry.fromUnitId === actorId
      && (projected.pieces || []).some((piece) =>
        piece.id === entry.toUnitId && piece.sideKey !== actor.sideKey));
  const representedOpponentIds = new Set(opponentRelationships
    .map((entry) => entry.toUnitId));
  const completeOpponentCoverage = graph?.scope?.softTruncated === false
    && visibleOpponentIds.length > 0
    && visibleOpponentIds.every((pieceId) => representedOpponentIds.has(pieceId));
  const unknownStationaryRelationships = opponentRelationships.filter((entry) =>
    (entry.threats?.toFrom?.stationaryUnknownProfileKeys || []).length > 0);
  if (unknownStationaryRelationships.length > 0) {
    return {
      status: "unknown_current_position_stationary_attack_domain",
      reason: "stationary_line_of_sight_unknown",
      opponentSideKey: otherSide(actor.sideKey),
      opponentMovementIncluded: false,
      opponentMovementBoundedSeparately: true,
      possibleAttackProfiles: unknownStationaryRelationships.flatMap((entry) =>
        (entry.threats?.toFrom?.stationaryUnknownProfileKeys || []).map(
          (profileKey) => ({
            enemyUnitId: entry.toUnitId,
            profileKey,
            currentRoundPossible: (entry.threats?.toFrom
              ?.currentRoundStationaryUnknownProfileKeys || [])
              .includes(profileKey),
            reason: "line_of_sight_unknown",
          }))),
      unknownNeverPromotedToSafeOrZero: true,
      tacticalProjection: "unknown",
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
  if (completeOpponentCoverage
    && opponentRelationships.every((entry) =>
      (entry.threats?.toFrom?.stationaryProfileKeys || []).length === 0)) {
    return {
      status: "no_current_position_stationary_attack_domain",
      opponentSideKey: otherSide(actor.sideKey),
      opponentMovementIncluded: false,
      opponentMovementBoundedSeparately: true,
      attackEstimateCount: 0,
      currentRoundAttackEstimateCount: 0,
      futureRoundAttackEstimateCount: 0,
      attackEstimates: [],
      disabledAttackDiagnostics: [],
      boundedByTacticalRelationshipGraph: true,
      exactCurrentRangeAndRequiredLineOfSightProof: true,
      rulesMechanicsPerOutcome: "not_required_outside_stationary_band",
      tacticalProjection: "advisory",
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
  try {
    const counterfactual = clone(projected);
    const opponentSideKey = otherSide(actor.sideKey);
    counterfactual.phase = "assault";
    counterfactual.stage = "unit_activation";
    counterfactual.activeSideKey = opponentSideKey;
    counterfactual.selectedRosterActivationWindow = null;
    counterfactual.pendingAction = null;
    counterfactual.pendingReactionWindow = null;
    delete counterfactual.pendingCurrentProductRangedSequence;
    delete counterfactual.pendingCurrentProductRangedCasualtyChoice;
    for (const piece of counterfactual.pieces || []) {
      if (piece.sideKey !== opponentSideKey) continue;
      piece.activatedPhases = {
        movement: false,
        assault: false,
        combat: false,
        ...(piece.activatedPhases || {}),
        assault: false,
      };
    }
    counterfactual.players[opponentSideKey].passedPhases = {
      ...(counterfactual.players[opponentSideKey].passedPhases || {}),
      assault: false,
    };
    const phaseKey = `${Number(counterfactual.round)}:assault`;
    counterfactual.phaseFirstActorByRound = {
      ...(counterfactual.phaseFirstActorByRound || {}),
      [phaseKey]: {
        round: Number(counterfactual.round),
        phase: "assault",
        markerHolderSideKey: counterfactual.firstPlayerSideKey,
        chosenFirstActorSideKey: opponentSideKey,
      },
    };
    const probabilityBatch = createStarcraftTmgAttackProbabilityBatchV1({
      state: counterfactual, sideKey: opponentSideKey,
      observePreparation: options.observePreparation,
    });
    const enumeration = probabilityBatch.enumeration;
    const domains = enumeration.parameterDomains.filter((entry) =>
      entry.parameterSchema?.targetUnitId?.enum?.includes(actorId));
    const currentRoundEnemyIds = new Set((graph?.relationships || [])
      .filter((entry) => entry.fromUnitId === actorId
        && (entry.threats?.toFrom?.currentRoundStationaryProfileKeys || [])
          .length > 0)
      .map((entry) => entry.toUnitId));
    const matchHorizon = projectOfficialMatchHorizonV1(projected);
    const estimates = domains.filter(domain => currentRoundEnemyIds.has(domain.pieceId) || matchHorizon.nextRoundAvailable === true).map((domain) => ({
      ...probabilityBatch.estimate({
        domain,
        parameters: { targetUnitId: actorId },
        sampleBudget: Number(options.sampleBudget || 216),
      }),
      enemyUnitId: domain.pieceId || null,
      earliestHorizon: projectOfficialActionHorizonV1(projected, currentRoundEnemyIds.has(domain.pieceId)),
      currentRoundActionAvailable: currentRoundEnemyIds.has(domain.pieceId),
    })).sort((left, right) =>
      right.outcomes.expectedCasualties - left.outcomes.expectedCasualties
        || right.outcomes.expectedDamage - left.outcomes.expectedDamage);
    const currentRoundEstimateCount = estimates.filter((entry) =>
      entry.currentRoundActionAvailable).length;
    return {
      status: currentRoundEstimateCount > 0
        ? "current_round_stationary_attacks_estimated"
        : estimates.length > 0
          ? "future_round_stationary_attacks_estimated"
        : matchHorizon.nextRoundAvailable === null && domains.length > 0
          ? "unknown_match_horizon" : "no_attack_domain_within_remaining_match",
      matchHorizon,
      timingExcludedDomainCount: domains.length - estimates.length,
      opponentSideKey,
      opponentMovementIncluded: false,
      opponentMovementBoundedSeparately: true,
      attackEstimateCount: estimates.length,
      currentRoundAttackEstimateCount: currentRoundEstimateCount,
      futureRoundAttackEstimateCount:
        estimates.length - currentRoundEstimateCount,
      attackEstimates: estimates,
      disabledAttackDiagnostics: clone((enumeration.candidates || [])
        .filter((entry) => entry.isEnabled === false).map((entry) => ({
          pieceId: entry.pieceId || null,
          weaponName: entry.weaponName || null,
          profileKey: entry.profileKey || null,
          disabledReason: entry.disabledReason || null,
        }))),
      rulesMechanicsPerOutcome: "exact",
      tacticalProjection: "advisory",
      mutationAuthority: false,
      trainingTruth: false,
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
      opponentMovementIncluded: false,
      opponentMovementBoundedSeparately: true,
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
}

function maximumProfileRangeMilliInches(profile) {
  const normal = Number(profile?.range?.normalRangeInches || 0);
  const extended = Math.max(0, ...(profile?.effects || []).map((effect) =>
    Number(effect?.parameters?.maximumRangeInches || 0)));
  return Math.round(Math.max(normal, extended) * 1000);
}

function incomingMoveThenFireEstimate(projected, actorId, graph) {
  const actor = (projected.pieces || []).find((entry) => entry.id === actorId);
  if (!actor) return { status: "unknown", reason: "projected_actor_missing" };
  try {
    const rows = [];
    const matchHorizon = projectOfficialMatchHorizonV1(projected);
    for (const relationship of (graph.relationships || []).filter((entry) =>
      new Set(["unit_spatial_relationship", "unit_relationship"])
        .has(entry.edgeKind) && entry.fromUnitId === actorId)) {
      const enemy = projected.pieces.find((entry) =>
        entry.id === relationship.toUnitId);
      if (!enemy || enemy.sideKey === actor.sideKey) continue;
      const movementRoute = projected.officialActionRouteCatalogue?.units
        ?.find((entry) => entry.pieceId === enemy.id);
      const movementProfile = movementRoute?.movementProfile;
      const printedSpeedInches = Number(enemy.currentModels) === 1
        ? Number(movementProfile?.singleModelSpeedInches)
        : Number(movementProfile?.multiModelSpeedInches);
      const printedSpeedMilliInches = Number.isFinite(printedSpeedInches)
        ? Math.round(printedSpeedInches * 1000) : null;
      const contribution = projectOfficialSelectedRosterRangedFirepowerV1(
        projected, enemy.id);
      const contributionByProfile = new Map(contribution.profiles.map(
        (entry) => [entry.profileKey, entry]));
      const catalogueByProfile = new Map((projected
        .officialAttackProfileCatalogueV2?.profiles || []).map((entry) => [
        entry.profileKey, entry,
      ]));
      const distance = Number(
        relationship.nearestPhysicalEdges?.distanceMilliInches);
      const currentRoundProfileKeys = new Set(relationship.threats?.toFrom
        ?.currentRoundMoveThenAttackProfileKeys || []);
      const actionWindow = relationship.threats?.toFrom?.actionWindow || {};
      for (const profileKey of relationship.threats?.toFrom
        ?.moveThenAttackProfileKeys || []) {
        const profile = catalogueByProfile.get(profileKey);
        const currentContribution = contributionByProfile.get(profileKey);
        const maximumRangeMilliInches = maximumProfileRangeMilliInches(profile);
        const minimumMovementRequiredMilliInches = Math.max(0,
          distance - maximumRangeMilliInches);
        const reachable = printedSpeedMilliInches !== null
          && minimumMovementRequiredMilliInches <= printedSpeedMilliInches;
        const currentRoundReachable = reachable
          && currentRoundProfileKeys.has(profileKey);
        const contributingModelCount = currentContribution
          ?.contributingModelIds?.length || 0;
        const rateOfAttack = Number(
          currentContribution?.printedRateOfAttackPerContributor
            ?? profile?.rateOfAttack ?? 0);
        rows.push({
          enemyUnitId: enemy.id,
          profileKey,
          weaponName: profile?.weaponName
            || currentContribution?.weaponName || null,
          currentBaseEdgeDistanceMilliInches: distance,
          maximumRangeMilliInches,
          minimumMovementRequiredMilliInches,
          printedMovementAllowanceMilliInches: printedSpeedMilliInches,
          printedMovementMarginMilliInches: printedSpeedMilliInches === null
            ? null : printedSpeedMilliInches
              - minimumMovementRequiredMilliInches,
          canEnterMaximumRangeByPrintedMovement: reachable,
          contributingModelIds: clone(
            currentContribution?.contributingModelIds || []),
          printedAttackDiceAtCurrentContributorCount:
            contributingModelCount * rateOfAttack,
          printedHitThreshold: Number(profile?.hitThreshold || 0) || null,
          printedDamagePerConfirmedDie: Number(profile?.damage || 0),
          conditionalDamageRequiresLegalPathPostMoveLosAndAttackInstantiation:
            true,
          legalPathAndPostMoveLosResolved: false,
          currentRoundMovementOpportunity:
            actionWindow.movementCurrentRoundAvailable === true,
          currentRoundAttackOpportunity:
            profile?.phase === "combat"
              ? actionWindow.combatCurrentRoundAvailable === true
              : actionWindow.assaultCurrentRoundAvailable === true,
          earliestHorizon: reachable ? projectOfficialActionHorizonV1(projected, currentRoundReachable) : "outside_printed_move_then_fire_band",
          mustBeTreatedAsLiveThreatWhenReachable: currentRoundReachable,
          mustBeTreatedAsFutureThreatWhenReachable:
            reachable && !currentRoundReachable && matchHorizon.nextRoundAvailable === true,
        });
      }
    }
    rows.sort((left, right) => Number(right.canEnterMaximumRangeByPrintedMovement)
      - Number(left.canEnterMaximumRangeByPrintedMovement)
      || Number(right.printedAttackDiceAtCurrentContributorCount)
        - Number(left.printedAttackDiceAtCurrentContributorCount)
      || left.profileKey.localeCompare(right.profileKey));
    return {
      status: rows.some((entry) =>
        entry.mustBeTreatedAsLiveThreatWhenReachable)
        ? "bounded_current_round_move_then_fire_threats"
        : rows.some((entry) =>
          entry.mustBeTreatedAsFutureThreatWhenReachable)
          ? "bounded_future_round_move_then_fire_threats"
        : "no_printed_move_then_fire_reach",
      opponentMovementRiskIncluded: true,
      matchHorizon,
      exactCurrentDistanceAndPrintedReach: true,
      legalPathAndPostMoveLosResolved: false,
      reachableThreatCount: rows.filter((entry) =>
        entry.mustBeTreatedAsLiveThreatWhenReachable || entry.mustBeTreatedAsFutureThreatWhenReachable).length,
      currentRoundReachableThreatCount: rows.filter((entry) =>
        entry.mustBeTreatedAsLiveThreatWhenReachable).length,
      futureRoundReachableThreatCount: rows.filter((entry) =>
        entry.mustBeTreatedAsFutureThreatWhenReachable).length,
      threats: rows,
      unknownPathOrLosNeverPromotedToSafeOrZero: true,
      mutationAuthority: false,
      trainingTruth: false,
    };
  } catch (error) {
    return {
      status: "unknown",
      reason: String(error?.message || error).split(":")[0],
      opponentMovementRiskIncluded: true,
      unknownPathOrLosNeverPromotedToSafeOrZero: true,
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
}

export function projectStarcraftTmgFormationRelationshipComparisonV1({
  state, source, slots, objectives, baseline, instantiatedAction,
  comparisonObjectives = objectives,
  observeProgress,
  delegatedProjection,
}) {
  if (delegatedProjection && !delegatedProjection.state) {
    return { status: "unknown", reason: delegatedProjection.reason };
  }
  const comparisonStartedAtMs = Date.now();
  const observe = (stage, detail = {}) => {
    try { observeProgress?.({ ...detail, stage, observedAtMs: Date.now(),
      elapsedMs: Date.now() - comparisonStartedAtMs,
      mutationAuthority: false, trainingTruth: false }); } catch { /* Diagnostics only. */ }
  };
  if (!slots.length) return {
    status: "not_applicable",
    reason: "formation_has_no_placement_slots",
  };
  const positions = new Map(slots.map((entry) => [entry.defaultModelId,
    entry.position]));
  try {
    observe("formation_projection_started");
    let projected = clone(delegatedProjection?.state || state);
    const nativeSpatialAction = instantiatedAction?.sourceAction || instantiatedAction;
    const nativeSpatialProjection = Boolean(delegatedProjection?.state || nativeSpatialAction?.spatialPlan);
    if (!delegatedProjection && nativeSpatialProjection) {
      // Use the actual pure transition, including surface/support, statuses,
      // grass and force-field removal. Coordinates alone are not a successor.
      projected = clone(applyOfficialSelectedRosterSpatialActionV1(
        state, nativeSpatialAction).state);
    }
    let subjectUnitId = source.pieceId;
    const createsUnit = source.effectKind === "summon_roachling";
    if (createsUnit) {
      // Placement slots belong to a new Rules-created Unit, not its caster.
      // Reuse the exact, pure Rules transition on a clone: this also retains
      // Supply, model count, loadout and the summon activation lifecycle.
      // A synthetic copy of the caster would silently invent those facts.
      const action = instantiatedAction?.unitLifecyclePlan
        ? instantiatedAction : instantiatedAction?.sourceAction;
      const createdId = action?.unitLifecyclePlan?.canonicalParameters
        ?.createdPieceId;
      if (!createdId || action.pieceId !== source.pieceId
        || action.effectKind !== source.effectKind) {
        throw new TypeError("LEGAL_FORMATION_CREATED_SUBJECT_ACTION_MISSING");
      }
      const adapter = createOfficialUnitLifecycleFamilyAdapterV1(
        state.officialUnitLifecycleFamilySourceBundle);
      projected = clone(adapter.apply(projected, { action }).state);
      subjectUnitId = createdId;
      // The parent did not turn into the summon. There is no pre-existing
      // subject baseline, so parent-to-enemy distances cannot be its deltas.
      baseline = null;
    }
    const projectedActor = projected.pieces.find((entry) =>
      entry.id === subjectUnitId);
    const actorModelIds = new Set((projectedActor?.models || [])
      .map((entry) => entry.id));
    if (!projectedActor || positions.size === 0
      || [...positions.keys()].some((modelId) => !actorModelIds.has(modelId))) {
      return { status: "unknown",
        reason: "placement_slots_do_not_belong_to_current_actor" };
    }
    if (!nativeSpatialProjection) {
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
    normalizeProjectedSurfacePlacements(projected);
    }
    const visibleEnemyUnitIds = (projected.pieces || []).filter((entry) =>
      entry.sideKey !== projectedActor.sideKey
        && entry.isOnField === true
        && entry.isDestroyed !== true
        && Number(entry.currentModels || 0) > 0).map((entry) => entry.id);
    const targetIds = [...new Set([
      // Isolated search objectives change candidate generation/scoring, not
      // the common facts needed to compare it with the Planner's other options.
      ...(comparisonObjectives || []).flatMap((entry) => entry.targetIds || []),
      ...(objectives || []).flatMap((entry) => entry.targetIds || []),
      ...visibleEnemyUnitIds,
    ])];
    observe("formation_graph_started");
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
    observe("formation_graph_completed");
    const beforeRows = relationshipRows(baseline);
    const afterRows = relationshipRows(graph);
    const beforeById = new Map(beforeRows.map((entry) => [entry.edgeId, entry]));
    observe("formation_stationary_fire_started");
    const incomingStationaryFireEstimate = projectStarcraftTmgIncomingStationaryFireEstimateV1(
      projected, projectedActor.id, graph, {
        observePreparation: event => observe(event.stage, event),
      });
    observe("formation_stationary_fire_completed");
    const incomingMoveThenFire = incomingMoveThenFireEstimate(
      projected, projectedActor.id, graph);
    observe("formation_move_then_fire_completed");
    return {
      status: "available",
      hypotheticalProjection: true,
      ...(createsUnit ? { subjectUnitId, sourceActorUnitId: source.pieceId,
        subjectProjectionSource: "official_unit_lifecycle_pure_transition" } : {}),
      ...(delegatedProjection ? { subjectUnitId, sourceActorUnitId: delegatedProjection.actorUnitId,
        subjectProjectionSource: "official_delegated_movement_pure_transition" } : {}),
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
      incomingStationaryFireEstimate,
      incomingMoveThenFireEstimate: incomingMoveThenFire,
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

function searchLegalFormationOptions(input, compareFormation) {
  const domain = input.domain;
  const declared = declaredDomain(domain);
  const source = sourceDomain(domain);
  const delegated = declared?.actionType === "resolve_khassar_movement";
  const actionIdentity = delegated
    ? { actionType: declared.actionType, pieceId: declared.pieceId,
        geometrySubjectUnitId: source.pieceId, geometryActionType: source.actionType }
    : { actionType: source?.actionType, pieceId: source?.pieceId };
  const state = input.state;
  const instantiate = input.instantiate;
  const request = object(input.request) ? input.request : {};
  const searchStartedAt = performance.now();
  const observeProgress = typeof input.observeProgress === "function"
    ? input.observeProgress : null;
  let searchThreadCpuStart;
  if (observeProgress) {
    try { searchThreadCpuStart = process.threadCpuUsage?.(); } catch {}
  }
  const progress = (stage, detail = {}) => {
    if (!observeProgress) return;
    try {
      let threadCpuElapsedMs;
      if (searchThreadCpuStart) {
        const usage = process.threadCpuUsage(searchThreadCpuStart);
        threadCpuElapsedMs = (usage.user + usage.system) / 1000;
      }
      observeProgress({
        schemaVersion: "starcraft_tmg_formation_search_progress_v1",
        stage,
        elapsedMs: Math.round(performance.now() - searchStartedAt),
        ...clone(detail),
        ...(threadCpuElapsedMs !== undefined ? { threadCpuElapsedMs } : {}),
        mutationAuthority: false,
        trainingTruth: false,
      });
    } catch {}
  };
  if (!object(state) || !object(domain) || !object(source?.constraints)
    || typeof instantiate !== "function") {
    throw new TypeError("LEGAL_FORMATION_SEARCH_INPUT_INVALID");
  }
  if (!SUPPORTED_ACTION_TYPES.has(String(source.actionType || ""))
    || source.actionType === "resolve_protoss_unique_ability"
      && !isOfficialNonEntryEdgeGroundDeployDomainV1(source)) {
    throw new TypeError("LEGAL_FORMATION_ACTION_TYPE_UNSUPPORTED");
  }
  if (source.actionType === "use_active_ability"
    && source.effectContract?.targetKind !== "self_place") {
    throw new TypeError("LEGAL_FORMATION_ACTIVE_ABILITY_NOT_SELF_PLACE");
  }
  const requestedOptions = Number(request.maximumOptions
    ?? DEFAULT_MAX_OPTIONS);
  const maximumOptions = Number.isSafeInteger(requestedOptions)
    ? Math.max(1, Math.min(8, requestedOptions)) : DEFAULT_MAX_OPTIONS;
  const requestedAttempts = Number(request.maximumCandidateAttempts
    ?? DEFAULT_MAX_ATTEMPTS);
  const maximumCandidateAttempts = Number.isSafeInteger(requestedAttempts)
    ? Math.max(1, Math.min(20_000, requestedAttempts)) : DEFAULT_MAX_ATTEMPTS;
  const candidateRequest = source.actionType === "use_active_ability"
    ? selfPlaceSearchRequest(state, domain, request) : request;
  const blockers = blockingFootprints(state, source.pieceId);
  const packingDiagnostics = { leaderFootprintRejected: 0, leaderOutOfBounds: 0,
    leaderNoSurface: 0, leaderBlockedByModelOrTerrain: 0, followerUnplaceable: 0,
    maxFollowersPlaced: 0, sourceRangeRejected: 0 };
  const generated = source.actionType === "deploy"
    ? deployCandidates(domain, request, blockers)
    : source.actionType === "resolve_charge"
      ? chargeCandidateStream(state, domain, request, progress)
    : isOfficialNonEntryEdgeGroundDeployDomainV1(source)
      ? nonEntryEdgeRelocationCandidates(state, domain, request)
    : source.actionType === "resolve_relocation_ability"
      ? relocationAbilityCandidates(state, domain, request)
    : source.actionType === "use_active_ability"
      ? selfPlaceAbilityCandidates(state, domain, candidateRequest)
    : source.actionType === "resolve_unit_lifecycle_ability"
      ? lifecycleAbilityCandidates(state, domain, request)
      : source.actionType === "resolve_unit_lifecycle_consumer"
        ? lifecycleConsumerCandidates(state, domain, request, packingDiagnostics)
        : [...guidedMovementCandidates(state, source, request, blockers),
          ...relocationCandidates(domain, request)];
  progress(generated.complete === false ? "candidate_generation_started" : "candidate_generation_complete", {
    generatedCandidateCount: generated.length,
  });
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
  let duplicateExactActionCount = 0;
  const attemptedGeometry = new Set();
  const acceptedActionKeys = new Set();
  const equivalentActionIntents = new Map();
  let examinedGeneratedCandidateCount = 0;
  const generatedIntentKeys = new Set();
  // Query-local cache: a rejected leader entry path cannot be fixed by moving
  // followers. Use Native's exact prefix before expensive full-squad packing.
  const deployPathChecks = new Map();
  let deployPathRejected = 0;

  // Ordinary Move/Run used to try only a straight leader path. Reuse the
  // existing obstacle router after a real path-collision rejection, then send
  // its candidate through the SAME full Rules instantiation. Never replace a
  // valid direct path, infer impossibility, or reinterpret a place as a move.
  const movementRoutePlanners = new Map();
  const movementRouting = { version: 'ordinary-movement-detour-v1',
    directPathRejected: 0, routeRequests: 0, routedCandidates: 0,
    acceptedDetours: 0, unknownReasons: {} };
  function instantiateWithMovementDetour(candidate) {
    attemptedGeometry.add(hashStarcraftTmgContract(candidate.parameters));
    try {
      return { candidate, instantiated: instantiate(state, domain,
        candidate.parameters, clone(input.instantiateOptions || {})) };
    } catch (directError) {
      const code = String(directError?.message || directError).split(':')[0];
      if (!['move', 'run', 'disengage'].includes(source.actionType)
        || !['SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED',
          'SELECTED_SPATIAL_PATH_MODEL_COLLISION'].includes(code)) throw directError;
      movementRouting.directPathRejected += 1;
      const profiles = candidate.modelProfiles || source.constraints.modelProfiles;
      const profile = profiles.find(p => p.modelId === candidate.parameters.leadingModelId);
      const start = profile?.startPoint;
      const endpoint = candidate.parameters.path?.at(-1);
      const model = actor?.models?.find(m => m.id === profile?.modelId);
      if (!start || !endpoint || candidate.parameters.path.length !== 1
        || String(profile.startElevation || model?.elevation || 'ground') !== 'ground'
        || String(endpoint.elevation || 'ground') !== 'ground'
        || candidate.parameters.elevationTransitions?.length
        || instantiatedCandidateCount >= maximumCandidateAttempts) throw directError;
      const rotation = Number(model?.baseRotationDegrees || 0);
      const key = JSON.stringify([profile, rotation]);
      if (!movementRoutePlanners.has(key)) movementRoutePlanners.set(key,
        createStarcraftTmgModelObstacleRoutePlannerV1({
          start, movingFootprint: footprintAt(profile, start, rotation),
          modelBlockers: blockers,
          battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
          battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
        }));
      movementRouting.routeRequests += 1;
      const route = movementRoutePlanners.get(key).routeTo({ endpoint,
        maxDistanceMilliInches: Number(source.constraints.maxDistanceMilliInches) });
      if (route.status !== 'candidate_found' || route.path.length < 2) {
        const reason = route.reason || 'no_additional_detour';
        movementRouting.unknownReasons[reason] = (movementRouting.unknownReasons[reason] || 0) + 1;
        throw directError;
      }
      movementRouting.routedCandidates += 1;
      instantiatedCandidateCount += 1;
      attemptedCandidateCount += 1;
      const routed = { ...candidate,
        parameters: { ...candidate.parameters, path: clone(route.path) },
        patternId: candidate.patternId + ':obstacle-route' };
      attemptedGeometry.add(hashStarcraftTmgContract(routed.parameters));
      const instantiated = instantiate(state, domain, routed.parameters,
        clone(input.instantiateOptions || {}));
      movementRouting.acceptedDetours += 1;
      return { candidate: routed, instantiated };
    }
  }
  const candidateIterator = generated[Symbol.iterator]();
  while (attemptedCandidateCount < maximumCandidateAttempts && options.length < maximumOptions) {
    const next = candidateIterator.next();
    if (next.done) break;
    const generatedCandidate = next.value;
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
    if (source.actionType === "deploy"
      && source.executorId === OFFICIAL_SELECTED_ROSTER_SPATIAL_ACTION_RUNTIME_ID) {
      const p = generatedCandidate.parameters;
      const pathKey = JSON.stringify([p.leadingModelId, p.entrySegmentId,
        p.entryAlongEdgeMilliInches, p.path]);
      if (!deployPathChecks.has(pathKey)) {
        try {
          checkOfficialSelectedRosterDeployLeaderPathV1(state, source, p);
          deployPathChecks.set(pathKey, null);
        } catch (error) {
          deployPathChecks.set(pathKey, String(error?.message || error).split(":")[0]);
        }
      }
      const rejection = deployPathChecks.get(pathKey);
      if (rejection) {
        deployPathRejected += 1;
        failureCounts.set(rejection, Number(failureCounts.get(rejection) || 0) + 1);
        continue;
      }
    }
    let candidate = solveGeneratedCandidateIntent(
      state, source, generatedCandidate, request, {
        blockers,
        targetIndex: intentTargetIndex,
        objectives: normalizedObjectives,
        diagnostic: packingDiagnostics,
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
    if (source.actionType === "use_active_ability"
      && candidate.modelProfiles?.length === 1
      && options.some((entry) => Math.hypot(
        entry.anchor.xMilliInches - candidate.anchor.xMilliInches,
        entry.anchor.yMilliInches - candidate.anchor.yMilliInches,
      ) < 1_000 && JSON.stringify(entry.paymentCardInstanceIds)
        === JSON.stringify(candidate.parameters.paymentCardInstanceIds))) {
      continue;
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
      const accepted = instantiateWithMovementDetour(candidate);
      candidate = accepted.candidate;
      const instantiated = accepted.instantiated;
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
      const actionHash = hashStarcraftTmgContract(instantiated.action);
      // Different policy weights do not make the SAME executable action a new
      // choice. Preserve their advisory intent labels outside the option's
      // sealed identity, without consuming a distinct-action slot.
      const actionKey = actionHash;
      if (acceptedActionKeys.has(actionKey)) {
        duplicateExactActionCount += 1;
        const intent = { solverPolicyId: candidate.solverPolicyId || null,
          formationObjectives: objectives };
        if (!equivalentActionIntents.has(actionHash)) equivalentActionIntents.set(actionHash, new Map());
        equivalentActionIntents.get(actionHash).set(hashStarcraftTmgContract(intent), intent);
        continue;
      }
      const optionSeed = {
        domainId: domain.domainId,
        ...actionIdentity,
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
        actionHash,
        ...(candidate.routeGuidance ? { routeGuidance: {
          ...clone(candidate.routeGuidance), currentNativePath: clone(canonicalParameters.path),
        } } : {}),
        completeFormationPlacementChecked: true,
        abilityName: declared.abilityName || null,
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
      let delegatedProjection;
      if (delegated) {
        try {
          const after = input.projectDelegatedFormation?.(state, instantiated.action);
          delegatedProjection = after ? { state: after, actorUnitId: declared.pieceId }
            : { reason: "delegated_formation_transition_unavailable" };
        } catch (error) {
          delegatedProjection = { reason: String(error?.message || error).split(":")[0] };
        }
      }
      const optionCore = {
        ...optionSeed,
        relationshipComparison: compareFormation({
          state, source, slots: projectedSlots, objectives,
          baseline: baselineRelationshipGraph,
          instantiatedAction: instantiated.action,
          comparisonObjectives: normalizedObjectives,
          ...(delegatedProjection ? { delegatedProjection } : {}),
        }),
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
      acceptedActionKeys.add(actionKey);
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
    ...actionIdentity,
    preferredAnchor: preferredAnchor(candidateRequest, {
      battlefieldWidthMilliInches: Math.round(Number(state.board.widthInches) * 1000),
      battlefieldHeightMilliInches: Math.round(Number(state.board.heightInches) * 1000),
      ...source.constraints,
    }),
    ...projectStarcraftTmgFormationPaymentsV1(source.parameterSchema, options),
    formationOptions: options,
    equivalentActionIntents: [...equivalentActionIntents].map(([actionHash, intents]) => ({
      actionHash, intents: [...intents.values()], distinctExecutableAction: false,
    })),
    optionCount: options.length,
    attemptedCandidateCount,
    instantiatedCandidateCount,
    prefilteredCandidateCount,
    duplicateIntentCandidateCount,
    searchCoverage: {
      // Host telemetry of the ACTUAL Native inputs, independent of prose,
      // policy labels and repeated copies of the same geometry. It is never
      // an exhaustive-domain certificate or evidence of action illegality.
      attemptedGeometrySetHash: attemptedGeometry.size ? hashStarcraftTmgContract({
        solverVersion: STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
        domainId: domain.domainId, parameterHashes: [...attemptedGeometry].sort(),
      }) : null,
      uniqueAttemptedGeometryCount: attemptedGeometry.size,
      generatedCandidateCount: generated.length,
      candidateGenerationComplete: generated.complete !== false,
      examinedGeneratedCandidateCount,
      exactInstantiationCount: instantiatedCandidateCount,
      packingDiagnostics: clone(packingDiagnostics),
      deployPathPrecheck: { uniquePaths: deployPathChecks.size, rejectedCandidates: deployPathRejected },
      maximumCandidateAttempts,
      maximumOptions,
      candidateGenerationDeterministic: true,
      exactInstantiationIsLazy: true,
      movementRouting,
      duplicateExactActionCount,
      greedyPerModelLocalImprovementUsed: true,
      betterOptionMayExist: options.length === 0
        || generated.complete === false || examinedGeneratedCandidateCount < generated.length,
      strategyObjectiveOrTokenBudgetReducedForPerformance: false,
    },
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

export function searchStarcraftTmgLegalFormationOptionsV1(input = {}) {
  return searchLegalFormationOptions(input,
    projectStarcraftTmgFormationRelationshipComparisonV1);
}

export async function searchStarcraftTmgLegalFormationOptionsAsyncV1(
  input = {}, { compareBatch } = {},
) {
  if (typeof compareBatch !== "function") {
    throw new TypeError("LEGAL_FORMATION_COMPARISON_BATCH_REQUIRED");
  }
  const jobs = [];
  // Generation, physical prefilters and Rules instantiation remain identical.
  // Only independent advisory comparisons are deferred, never exposed to the
  // caller or model before the complete ordered batch has finished.
  const collected = searchLegalFormationOptions(input, job => {
    const internalJobIndex = jobs.push(job) - 1;
    return { status: "backend_internal_deferred", internalJobIndex };
  });
  const selectedJobs = collected.formationOptions.map(option =>
    jobs[option.relationshipComparison.internalJobIndex]);
  const comparisons = selectedJobs.length ? await compareBatch(selectedJobs) : [];
  if (!Array.isArray(comparisons) || comparisons.length !== selectedJobs.length
    || comparisons.some(value => !object(value) || typeof value.status !== "string")) {
    throw new TypeError("LEGAL_FORMATION_COMPARISON_BATCH_INVALID");
  }
  const options = collected.formationOptions.map((option, index) => {
    const { formationOptionId: _deferredId, slots, relationshipComparison:
      _deferredComparison, ...seed } = option;
    const core = { ...seed, relationshipComparison: comparisons[index] };
    return { ...core, formationOptionId: hashStarcraftTmgContract(core),
      slots: clone(slots) };
  });
  return freeze({ ...collected, formationOptions: options });
}
