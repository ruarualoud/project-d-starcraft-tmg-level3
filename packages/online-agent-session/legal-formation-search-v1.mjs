import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

export const STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION =
  "starcraft_tmg_legal_formation_search_v1";

const SUPPORTED_ACTION_TYPES = new Set([
  "deploy", "move", "run", "disengage",
  "resolve_relocation_ability",
  "resolve_unit_lifecycle_ability", "resolve_unit_lifecycle_consumer",
]);
const DEFAULT_MAX_ATTEMPTS = 4_096;
const DEFAULT_MAX_OPTIONS = 4;

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
        && Number.isFinite(Number(model.yInches))).map((model) =>
      physicalFootprint({
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
      return [physicalFootprint({
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
      })];
    }
    return [];
  });
  return [...modelBlockers, ...terrainBlockers].map((footprint) => ({
    footprint,
    bounds: footprintBounds(footprint),
  }));
}

function candidatePlacementRows(candidate) {
  const parameters = candidate.parameters;
  const plan = object(parameters.placementPlan)
    ? parameters.placementPlan : parameters;
  const endpoint = Array.isArray(plan.path) ? plan.path.at(-1) : null;
  const placements = Array.isArray(plan.placements) ? plan.placements : [];
  if (endpoint) {
    return [{ modelId: plan.leadingModelId, ...endpoint }, ...placements];
  }
  return placements;
}

function candidatePlacementOverlapsBlocker(candidate, profiles, blockers) {
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
      if (!boundsMayOverlap(bounds, blocker.bounds)) continue;
      if (evaluateOfficialPhysicalFootprintRelationV1({
        left: footprint,
        right: blocker.footprint,
      }).overlappingInteriors) return true;
    }
  }
  return false;
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
  const paymentOptions = [...(source.parameterSchema
    ?.paymentCardInstanceIds?.enum || [])].sort((left, right) =>
    left.length - right.length || left.join("|").localeCompare(right.join("|")));
  const paymentCardInstanceIds = clone(paymentOptions[0] || []);
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
      for (const gap of [20, 60, 100]) {
        for (const transform of TRANSFORMS) {
          const offsets = formationOffsets(profiles, gap, transform.apply);
          const rows = rowsAt(profiles, offsets,
            anchor.xMilliInches, anchor.yMilliInches);
          candidates.push({
            parameters: {
              activeUnitId: source.pieceId,
              paymentCardInstanceIds,
              parentContactModelId: parent.id,
              placementPlan: {
                leadingModelId: rows[0].modelId,
                placements: rows.map((entry) => ({
                  ...entry,
                  rotationDegrees: 0,
                })),
              },
            },
            patternId: `summon-contact-${transform.id}-gap-${gap}`,
            anchor,
            modelProfiles: profiles,
            parentContactModelId: parent.id,
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
  if (!new Set(["omega_network_deploy", "pylon_warp_conduit_deploy"])
    .has(String(source.effectKind || ""))) {
    throw new TypeError("LEGAL_FORMATION_LIFECYCLE_CONSUMER_UNSUPPORTED");
  }
  const target = (state.pieces || []).find((entry) =>
    entry.id === source.pieceId);
  const entrySource = (state.pieces || []).find((entry) =>
    entry.id === source.constraints.sourcePieceId);
  const sourceModels = (entrySource?.models || []).filter((entry) =>
    entry.isOnField !== false && entry.isDestroyed !== true
      && Number.isFinite(Number(entry.xInches))
      && Number.isFinite(Number(entry.yInches)));
  if (!target || !entrySource || sourceModels.length < 1) {
    throw new TypeError("LEGAL_FORMATION_ENTRY_SOURCE_MISSING");
  }
  const profiles = reservePieceProfiles(target);
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
      for (const gap of [20, 60, 100]) {
        for (const transform of TRANSFORMS) {
          const offsets = formationOffsets(profiles, gap, transform.apply);
          const rows = rowsAt(profiles, offsets,
            anchor.xMilliInches, anchor.yMilliInches);
          candidates.push({
            parameters: {
              activeUnitId: source.pieceId,
              sourceContactModelId: entryModel.id,
              placementPlan: {
                leadingModelId: rows[0].modelId,
                placements: rows.map((entry) => ({
                  ...entry,
                  rotationDegrees: 0,
                })),
              },
            },
            patternId: `entry-contact-${transform.id}-gap-${gap}`,
            anchor,
            modelProfiles: profiles,
            sourceContactModelId: entryModel.id,
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

function slotsFor(option, profiles) {
  const parameters = option.canonicalParameters;
  const plan = object(parameters.placementPlan)
    ? parameters.placementPlan : parameters;
  const endpoint = Array.isArray(plan.path) ? plan.path.at(-1) : null;
  const placementsIncludeLeading = !endpoint
    && (plan.placements || []).some((entry) =>
      entry.modelId === plan.leadingModelId);
  const positions = object(parameters.placementPlan)
    ? (plan.placements || []).map((entry) => ({
      ...clone(entry), isLeading: entry.modelId === plan.leadingModelId,
    }))
    : placementsIncludeLeading
      ? (plan.placements || []).map((entry) => ({
        ...clone(entry), isLeading: entry.modelId === plan.leadingModelId,
      }))
      : [{ modelId: plan.leadingModelId, ...clone(endpoint),
        isLeading: true }, ...(plan.placements || []).map((entry) => ({
        ...clone(entry), isLeading: false,
      }))];
  const profileById = new Map(profiles.map((entry) => [entry.modelId, entry]));
  const allModelIds = profiles.map((entry) => entry.modelId);
  return positions.map((position, index) => {
    const signature = baseSignature(profileById.get(position.modelId));
    const compatibleModelIds = allModelIds.filter((modelId) =>
      baseSignature(profileById.get(modelId)) === signature);
    return {
      slotId: `slot-${String(index + 1).padStart(2, "0")}`,
      isLeading: position.isLeading,
      defaultModelId: position.modelId,
      compatibleModelIds,
      position: Object.fromEntries(Object.entries(position)
        .filter(([key]) => !new Set(["modelId", "isLeading"]).has(key))),
      baseSignature: signature,
    };
  });
}

export function searchStarcraftTmgLegalFormationOptionsV1(input = {}) {
  const domain = input.domain;
  const source = sourceDomain(domain);
  const state = input.state;
  const instantiate = input.instantiate;
  const request = object(input.request) ? input.request : {};
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
    : source.actionType === "resolve_relocation_ability"
      && source.effectKind === "entry_edge_place"
      ? entryEdgeRelocationCandidates(state, domain, request)
    : source.actionType === "resolve_unit_lifecycle_ability"
      ? summonCandidates(state, domain, request)
      : source.actionType === "resolve_unit_lifecycle_consumer"
        ? lifecycleConsumerCandidates(state, domain, request)
        : relocationCandidates(domain, request);
  const blockers = blockingFootprints(state, source.pieceId);
  const options = [];
  const failureCounts = new Map();
  let attemptedCandidateCount = 0;
  let instantiatedCandidateCount = 0;
  let prefilteredCandidateCount = 0;
  for (const candidate of generated) {
    if (attemptedCandidateCount >= maximumCandidateAttempts
      || options.length >= maximumOptions) break;
    if (options.some((entry) => Math.hypot(
      entry.anchor.xMilliInches - candidate.anchor.xMilliInches,
      entry.anchor.yMilliInches - candidate.anchor.yMilliInches,
    ) < 1_000)) continue;
    attemptedCandidateCount += 1;
    const profiles = candidate.modelProfiles || source.constraints.modelProfiles;
    if (candidatePlacementOverlapsBlocker(candidate, profiles, blockers)) {
      prefilteredCandidateCount += 1;
      const code = "MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP";
      failureCounts.set(code, Number(failureCounts.get(code) || 0) + 1);
      continue;
    }
    instantiatedCandidateCount += 1;
    try {
      const instantiated = instantiate(state, domain, candidate.parameters,
        clone(input.instantiateOptions || {}));
      const canonicalParameters = clone(instantiated.canonicalParameters
        || instantiated.action?.sourceAction?.spatialPlan?.canonicalParameters);
      if (!object(canonicalParameters)) continue;
      const optionCore = {
        domainId: domain.domainId,
        actionType: source.actionType,
        pieceId: source.pieceId,
        patternId: candidate.patternId,
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
      const formationOptionId = hashStarcraftTmgContract(optionCore);
      const option = { ...optionCore, formationOptionId };
      option.slots = slotsFor(option,
        profiles);
      options.push(option);
    } catch (error) {
      const code = String(error?.message || error).split(":")[0];
      failureCounts.set(code, Number(failureCounts.get(code) || 0) + 1);
    }
  }
  return freeze({
    schemaVersion: STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION,
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
    failureCounts: Object.fromEntries([...failureCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))),
    assignmentContract: {
      chooseExactlyOneFormationOption: true,
      assignEverySlotExactlyOnce: true,
      assignEveryModelExactlyOnce: true,
      modelMustBeCompatibleWithSlot: true,
      everySlotRequiresPublicReason: true,
      mixingSlotsAcrossOptionsForbidden: true,
      hostReinstantiatesAssignedFormationBeforeApply: true,
      hiddenChainOfThoughtRequested: false,
    },
    bounded: true,
    rulesAuthority: options.length > 0,
    mutationAuthority: false,
    trainingTruth: false,
  });
}
