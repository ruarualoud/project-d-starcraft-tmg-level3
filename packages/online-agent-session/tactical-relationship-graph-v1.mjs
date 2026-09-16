import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1,
  evaluateOfficialWithinWhollyWithinV1,
} from "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import { evaluateOfficialTerrainLineOfSightV1 } from
  "../rule-atoms/official-terrain-los-rules-kernel-v1.mjs";
import { certifyOfficialSpecialTerrainPlanV1 } from
  "../rule-atoms/official-special-terrain-rules-kernel-v1.mjs";

export const STARCRAFT_TMG_TACTICAL_RELATIONSHIP_GRAPH_VERSION =
  "starcraft_tmg_tactical_relationship_graph_v1";
export const STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND =
  "space.inspect_relationships";

const INTENTS = new Set([
  "overview", "engage", "avoid_threat", "control_objective",
  "surround_target", "screen", "preserve_lane", "focus_fire",
  "fire_zone_exchange", "retreat",
]);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function seal(value, field) {
  const body = clone(value);
  return freeze({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) =>
    model?.isOnField !== false && model?.isDestroyed !== true);
}

function sideRelation(piece, seatKey, state) {
  if (piece.sideKey === seatKey) return "own";
  const teams = state.rosterRegistryResolution?.teamMembershipByPlayer || {};
  if (teams[seatKey] && teams[seatKey] === teams[piece.sideKey]) return "allied";
  return "opponent";
}

function footprintCenter(footprint) {
  if (footprint?.center) return clone(footprint.center);
  const vertices = footprint?.vertices || [];
  if (!vertices.length) return null;
  return {
    xMilliInches: Math.round(vertices.reduce((sum, entry) =>
      sum + entry.xMilliInches, 0) / vertices.length),
    yMilliInches: Math.round(vertices.reduce((sum, entry) =>
      sum + entry.yMilliInches, 0) / vertices.length),
  };
}

function footprintBounds(footprint) {
  if (footprint.shape === "round") return {
    minXMilliInches: footprint.center.xMilliInches - footprint.radiusMilliInches,
    maxXMilliInches: footprint.center.xMilliInches + footprint.radiusMilliInches,
    minYMilliInches: footprint.center.yMilliInches - footprint.radiusMilliInches,
    maxYMilliInches: footprint.center.yMilliInches + footprint.radiusMilliInches,
  };
  return {
    minXMilliInches: Math.min(...footprint.vertices.map((entry) =>
      entry.xMilliInches)),
    maxXMilliInches: Math.max(...footprint.vertices.map((entry) =>
      entry.xMilliInches)),
    minYMilliInches: Math.min(...footprint.vertices.map((entry) =>
      entry.yMilliInches)),
    maxYMilliInches: Math.max(...footprint.vertices.map((entry) =>
      entry.yMilliInches)),
  };
}

function terrainFootprint(entry) {
  const raw = entry?.footprint || {};
  const minX = Number(raw.minXMilliInches);
  const maxX = Number(raw.maxXMilliInches);
  const minY = Number(raw.minYMilliInches);
  const maxY = Number(raw.maxYMilliInches);
  if (![minX, maxX, minY, maxY].every(Number.isSafeInteger)
    || minX >= maxX || minY >= maxY) return null;
  return createOfficialPhysicalFootprintV1({
    objectId: String(entry.id || entry.terrainId),
    kind: "terrain_piece",
    shape: "rectangle",
    center: {
      xMilliInches: Math.round((minX + maxX) / 2),
      yMilliInches: Math.round((minY + maxY) / 2),
    },
    widthMilliInches: maxX - minX,
    depthMilliInches: maxY - minY,
    rotationDegrees: 0,
  });
}

function markerFootprint(marker) {
  const xMilliInches = Math.round(Number(marker.xInches) * 1000);
  const yMilliInches = Math.round(Number(marker.yInches) * 1000);
  const diameter = Number(marker.diameterMillimeters || 32) / 25.4;
  if (![xMilliInches, yMilliInches].every(Number.isSafeInteger)
    || !Number.isFinite(diameter) || diameter <= 0) return null;
  const size = Math.round(diameter * 1000);
  return createOfficialPhysicalFootprintV1({
    objectId: String(marker.id),
    kind: "mission_marker",
    shape: "round",
    center: { xMilliInches, yMilliInches },
    widthMilliInches: size,
    depthMilliInches: size,
    rotationDegrees: 0,
  });
}

function normalizeIntent(request) {
  const value = String(request?.intent || "overview");
  return INTENTS.has(value) ? value : "overview";
}

function normalizeIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(String)
    .filter(Boolean))].slice(0, 64);
}

function maximumRelations(request) {
  const value = Number(request?.maximumRelations || 64);
  return Number.isSafeInteger(value) && value > 0
    ? Math.min(value, 256) : 64;
}

function movementProfile(state, piece) {
  const route = state.officialActionRouteCatalogue?.units?.find((entry) =>
    entry.pieceId === piece.id);
  const profile = route?.movementProfile;
  if (!profile) return null;
  const speed = Number(piece.currentModels) === 1
    ? Number(profile.singleModelSpeedInches)
    : Number(profile.multiModelSpeedInches);
  return Number.isFinite(speed) ? {
    speedMilliInches: Math.round(speed * 1000),
    printedSourceValue: profile.sourceValue || null,
    modelCountBranch: Number(piece.currentModels) === 1
      ? "single_model" : "multi_model",
    coherencyRangeMilliInches:
      Math.round(Number(profile.horizontalCoherencyInches || 3) * 1000),
    precision: "exact_printed_branch_dynamic_modifiers_not_assumed",
  } : null;
}

function modelIndex(state) {
  const dataBundle = state.officialModelBaseGeometryDataBundle;
  const rows = [];
  for (const piece of (state.pieces || []).filter(activePiece)) {
    for (const model of activeModels(piece)) {
      const footprint = createOfficialModelBaseFootprintV1({
        piece, model, dataBundle,
      });
      rows.push({ piece, model, footprint, bounds: footprintBounds(footprint) });
    }
  }
  return rows;
}

function unitNode(state, piece, rows, seatKey) {
  const bounds = rows.map((entry) => entry.bounds);
  const movement = movementProfile(state, piece);
  const leaderId = piece.lastLeadingModelId || piece.leadingModelId
    || rows[0]?.model.id || null;
  let coherency = null;
  if (leaderId) {
    try {
      const measured = evaluateOfficialWithinWhollyWithinV1({
        state,
        dataBundle: state.officialModelBaseGeometryDataBundle,
        source: { kind: "model", unitId: piece.id, modelId: leaderId },
        targetUnitId: piece.id,
        rangeMilliInches: movement?.coherencyRangeMilliInches || 3000,
      });
      coherency = {
        status: clone(piece.coherencyStatus || null),
        leaderModelId: leaderId,
        rangeMilliInches: measured.rangeMilliInches,
        everyModelWhollyWithinLeader: measured.unitWhollyWithin,
        assessments: measured.assessments.map((entry) => ({
          modelId: entry.modelId,
          minimumBaseEdgeDistanceMilliInches:
            entry.minimumDistanceMilliInches,
          whollyWithinLeader: entry.whollyWithin,
        })),
        resultHash: measured.resultHash,
        precision: "exact_current_geometry",
      };
    } catch (error) {
      coherency = {
        status: clone(piece.coherencyStatus || null),
        leaderModelId: leaderId,
        precision: "unknown",
        reason: String(error?.message || error).split(":")[0],
      };
    }
  }
  return {
    nodeId: piece.id,
    nodeKind: "unit",
    unitName: piece.unitName || piece.name || null,
    sideKey: piece.sideKey,
    sideRelation: sideRelation(piece, seatKey, state),
    currentModels: Number(piece.currentModels),
    currentSupply: Number(piece.currentSupply),
    combatTags: clone(piece.combatTags || []),
    modelIds: rows.map((entry) => entry.model.id).sort(),
    movement,
    coherency,
    envelope: bounds.length ? {
      minXMilliInches: Math.min(...bounds.map((entry) => entry.minXMilliInches)),
      maxXMilliInches: Math.max(...bounds.map((entry) => entry.maxXMilliInches)),
      minYMilliInches: Math.min(...bounds.map((entry) => entry.minYMilliInches)),
      maxYMilliInches: Math.max(...bounds.map((entry) => entry.maxYMilliInches)),
      completePhysicalBases: true,
    } : null,
  };
}

function nearestPair(leftRows, rightRows) {
  let nearest = null;
  const pairs = [];
  for (const left of leftRows) {
    for (const right of rightRows) {
      const result = evaluateOfficialPhysicalFootprintRelationV1({
        left: left.footprint, right: right.footprint,
      });
      const row = { left, right, result };
      pairs.push(row);
      if (!nearest || result.minimumSeparationMilliInches
        < nearest.result.minimumSeparationMilliInches) nearest = row;
    }
  }
  return { nearest, pairs };
}

function engagementLookup(state) {
  try {
    const graph = deriveOfficialEngagementGraphV2(state);
    return { graph, edgeKeys: new Set(graph.modelEdges.flatMap((edge) => [
      `${edge.leftModelId}:${edge.rightModelId}`,
      `${edge.rightModelId}:${edge.leftModelId}`,
    ])) };
  } catch (error) {
    return { graph: null, edgeKeys: new Set(),
      reason: String(error?.message || error).split(":")[0] };
  }
}

function lineOfSightPairs(state, leftPiece, rightPiece, pairs) {
  const rows = [];
  for (const pair of pairs) {
    try {
      let result;
      let adapter = "official_terrain_los_rules_kernel_v1";
      try {
        result = evaluateOfficialTerrainLineOfSightV1({
          state,
          attacker: leftPiece,
          attackerModelId: pair.left.model.id,
          target: rightPiece,
          targetModelId: pair.right.model.id,
          dataBundle: state.officialTerrainLosDataBundle,
        });
      } catch (error) {
        if (String(error?.message || error).split(":")[0]
          !== "TERRAIN_LOS_DEFERRED_TERRAIN_KIND") throw error;
        const certified = certifyOfficialSpecialTerrainPlanV1({
          state,
          actor: leftPiece,
          procedureKind: "grass_line_of_sight_check",
          plan: {
            planId: `relationship-los:${leftPiece.id}:${pair.left.model.id}`
              + `:${rightPiece.id}:${pair.right.model.id}`,
            attackerModelId: pair.left.model.id,
            targetUnitId: rightPiece.id,
            targetModelId: pair.right.model.id,
          },
          dataBundle: state.officialTerrainLosDataBundle,
        });
        result = certified.result;
        adapter = "official_special_terrain_grass_los_adapter_v1";
      }
      rows.push({
        attackerModelId: pair.left.model.id,
        targetModelId: pair.right.model.id,
        visible: result.visible,
        baseEdgeDistanceMilliInches: result.modelEdgeDistanceMilliInches,
        blockingTerrainIds: clone(result.blockingTerrainIds),
        coverAssessments: result.assessments.filter((entry) =>
          entry.blockingTerrainTrace || entry.attackerDirectCover
            || entry.targetDirectCover || entry.elevationDeadZoneBlocks)
          .map((entry) => ({
            terrainId: entry.terrainId,
            attackerDirectCover: entry.attackerDirectCover,
            targetDirectCover: entry.targetDirectCover,
            closeQuarters: entry.closeQuarters,
            elevationDeadZoneBlocks: entry.elevationDeadZoneBlocks,
            blocksLineOfSight: entry.blocksLineOfSight,
          })),
        resultHash: result.resultHash,
        adapter,
        precision: "exact_current_geometry",
      });
    } catch (error) {
      rows.push({
        attackerModelId: pair.left.model.id,
        targetModelId: pair.right.model.id,
        visible: null,
        reason: String(error?.message || error).split(":")[0],
        precision: "unknown",
      });
    }
  }
  return rows;
}

function normalizedWeaponName(value) {
  return String(value || "").trim().toLowerCase();
}

function weaponProfiles(state, piece) {
  const equipped = new Set((piece.equipment || []).map((entry) =>
    normalizedWeaponName(entry.equipmentName)));
  return (state.officialAttackProfileCatalogueV2?.profiles || [])
    .filter((profile) => profile.recordKey === piece.officialUnitRecordKey
      && equipped.has(normalizedWeaponName(profile.weaponName)))
    .map((profile) => {
      const longRange = Math.max(0, ...(profile.effects || [])
        .map((entry) => Number(entry.parameters?.maximumRangeInches || 0)));
      const normal = Number(profile.range?.normalRangeInches || 0);
      const rangeMilliInches = profile.range?.kind === "engagement"
        ? 1000 : Math.round(Math.max(normal, longRange) * 1000);
      return {
        profileKey: profile.profileKey,
        weaponName: profile.weaponName,
        phase: profile.phase,
        rangeKind: profile.range?.kind || null,
        rangeMilliInches,
        targetTags: clone(profile.targetTags || []),
        rateOfAttack: Number(profile.rateOfAttack || 0),
        damage: Number(profile.damage || 0),
        profileHash: profile.profileHash,
      };
    });
}

function targetTagEligible(profile, target) {
  const tags = new Set((target.combatTags || [target.combatTag])
    .map(normalizedWeaponName));
  return profile.targetTags.some((tag) => tag === "all" || tags.has(tag));
}

function threatProjection(state, attacker, target, minimumDistance,
  visiblePairCount) {
  const speed = movementProfile(state, attacker)?.speedMilliInches || 0;
  const profiles = weaponProfiles(state, attacker).map((profile) => {
    const targetEligible = targetTagEligible(profile, target);
    const lineOfSightEligible = profile.rangeKind === "engagement"
      ? true : visiblePairCount > 0;
    return {
      ...profile,
      targetEligible,
      stationarySpatiallyEligible: targetEligible && lineOfSightEligible
        && minimumDistance <= profile.rangeMilliInches,
      moveThenAttackBandEligible: targetEligible
        && minimumDistance <= speed + profile.rangeMilliInches,
      moveThenAttackPathAndPostMoveLosVerified: false,
    };
  });
  const stationary = profiles.filter((entry) => entry.stationarySpatiallyEligible);
  const moving = profiles.filter((entry) => entry.moveThenAttackBandEligible);
  return {
    profiles,
    stationaryProfileKeys: stationary.map((entry) => entry.profileKey),
    moveThenAttackProfileKeys: moving.map((entry) => entry.profileKey),
    chargeBand: {
      minimumBaseEdgeDistanceMilliInches: minimumDistance,
      minimumReachMilliInches: speed + 1000,
      maximumReachMilliInches: speed + 6000,
      withinMaximumBand: minimumDistance <= speed + 6000,
      chanceAndPathUnresolved: true,
    },
    spatialThreatPrecision:
      "exact_current_range_los_and_target_tags; future_move_charge_and_action_availability_advisory",
    currentLegalActionNotImplied: true,
  };
}

function unitRelation(state, left, right, leftRows, rightRows, engagement) {
  const { nearest, pairs } = nearestPair(leftRows, rightRows);
  const los = lineOfSightPairs(state, left, right, pairs);
  const visiblePairCount = los.filter((entry) => entry.visible === true).length;
  const contactPairs = pairs.filter((entry) =>
    entry.result.minimumSeparationMilliInches <= 1);
  const engagementPairs = pairs.filter((entry) => engagement.edgeKeys.has(
    `${entry.left.model.id}:${entry.right.model.id}`));
  const leftThreat = threatProjection(state, left, right,
    nearest.result.minimumSeparationMilliInches, visiblePairCount);
  const reverseLos = los.map((entry) => ({ ...entry,
    attackerModelId: entry.targetModelId,
    targetModelId: entry.attackerModelId }));
  const rightThreat = threatProjection(state, right, left,
    nearest.result.minimumSeparationMilliInches,
    reverseLos.filter((entry) => entry.visible === true).length);
  const leftStationary = leftThreat.stationaryProfileKeys.length > 0;
  const rightStationary = rightThreat.stationaryProfileKeys.length > 0;
  return {
    edgeId: `unit:${left.id}->unit:${right.id}`,
    edgeKind: "unit_spatial_relationship",
    fromUnitId: left.id,
    toUnitId: right.id,
    relation: left.sideKey === right.sideKey ? "friendly" : "opposed",
    nearestPhysicalEdges: {
      distanceMilliInches: nearest.result.minimumSeparationMilliInches,
      fromModelId: nearest.left.model.id,
      toModelId: nearest.right.model.id,
      nearestPointOnFrom: clone(nearest.result.nearestPointOnLeft || null),
      nearestPointOnTo: clone(nearest.result.nearestPointOnRight || null),
      overlappingInteriors: nearest.result.overlappingInteriors,
      precision: "exact_physical_footprints",
    },
    contactArc: {
      contactModelPairCount: contactPairs.length,
      contactModelPairs: contactPairs.map((entry) => ({
        fromModelId: entry.left.model.id,
        toModelId: entry.right.model.id,
      })),
      bearingDegrees: (() => {
        const from = footprintCenter(nearest.left.footprint);
        const to = footprintCenter(nearest.right.footprint);
        return Math.round((Math.atan2(to.yMilliInches - from.yMilliInches,
          to.xMilliInches - from.xMilliInches) * 180 / Math.PI + 360) % 360);
      })(),
      precision: "exact_current_geometry",
    },
    engagement: {
      engaged: engagementPairs.length > 0,
      modelPairCount: engagementPairs.length,
      modelPairs: engagementPairs.map((entry) => ({
        fromModelId: entry.left.model.id,
        toModelId: entry.right.model.id,
      })),
      graphHash: engagement.graph?.graphHash || null,
      precision: engagement.graph ? "exact_rules_graph" : "unknown",
      reason: engagement.reason || null,
    },
    lineOfSight: {
      assessedModelPairCount: los.length,
      visibleModelPairCount: visiblePairCount,
      blockedModelPairCount: los.filter((entry) => entry.visible === false).length,
      unknownModelPairCount: los.filter((entry) => entry.visible === null).length,
      blockingTerrainIds: [...new Set(los.flatMap((entry) =>
        entry.blockingTerrainIds || []))].sort(),
      modelPairs: los,
      precision: los.every((entry) => entry.precision === "exact_current_geometry")
        ? "exact_current_geometry" : "mixed_exact_unknown",
    },
    threats: { fromTo: leftThreat, toFrom: rightThreat },
    fireZoneExchange: {
      class: leftStationary && rightStationary ? "mutual_stationary_fire"
        : leftStationary ? "from_only_stationary_fire"
          : rightStationary ? "to_only_stationary_fire"
            : leftThreat.moveThenAttackProfileKeys.length
              && rightThreat.moveThenAttackProfileKeys.length
              ? "mutual_move_then_fire_band" : "no_mutual_current_fire_band",
      fromStationaryProfileCount: leftThreat.stationaryProfileKeys.length,
      toStationaryProfileCount: rightThreat.stationaryProfileKeys.length,
      fromMoveThenFireProfileCount: leftThreat.moveThenAttackProfileKeys.length,
      toMoveThenFireProfileCount: rightThreat.moveThenAttackProfileKeys.length,
      damageOutcomeRequiresProbabilityQuery: true,
      precision: "mixed_exact_spatial_bands_and_advisory_future_actions",
    },
    precision: "mixed_exact_and_advisory_with_field_level_labels",
  };
}

function objectiveRelation(piece, rows, marker, footprint) {
  const distances = rows.map((entry) => ({
    modelId: entry.model.id,
    result: evaluateOfficialPhysicalFootprintRelationV1({
      left: entry.footprint, right: footprint,
    }),
    elevation: String(entry.model.elevation || "ground").replace("_level", ""),
  })).sort((left, right) => left.result.minimumSeparationMilliInches
    - right.result.minimumSeparationMilliInches
      || left.modelId.localeCompare(right.modelId));
  const markerElevation = String(marker.elevation || "ground").replace("_level", "");
  const eligible = distances.filter((entry) =>
    entry.result.minimumSeparationMilliInches <= 3000
      && entry.elevation === markerElevation);
  return {
    edgeId: `unit:${piece.id}->objective:${marker.id}`,
    edgeKind: "objective_relationship",
    fromUnitId: piece.id,
    toObjectiveId: marker.id,
    minimumBaseEdgeDistanceMilliInches:
      distances[0]?.result.minimumSeparationMilliInches ?? null,
    nearestModelId: distances[0]?.modelId || null,
    modelIdsWithinThreeInchesSameElevation: eligible.map((entry) => entry.modelId),
    canGeometricallyContestNow: eligible.length > 0,
    unitCoherencyStatus: clone(piece.coherencyStatus || null),
    currentControlSideKey: marker.controlSideKey || null,
    exactControlStillRequiresCurrentMissionEligibilityAndLos: true,
    precision: "exact_base_distance_and_elevation; control_eligibility_not_recomputed",
  };
}

function unitClearance(state, piece, rows, allRows, terrain) {
  const width = Math.round(Number(state.board.widthInches) * 1000);
  const height = Math.round(Number(state.board.heightInches) * 1000);
  const values = rows.map((entry) => {
    const bounds = entry.bounds;
    const boundary = Math.min(bounds.minXMilliInches, bounds.minYMilliInches,
      width - bounds.maxXMilliInches, height - bounds.maxYMilliInches);
    const other = allRows.filter((candidate) => candidate.piece.id !== piece.id)
      .map((candidate) => evaluateOfficialPhysicalFootprintRelationV1({
        left: entry.footprint, right: candidate.footprint,
      }).minimumSeparationMilliInches);
    const obstacles = terrain.map((candidate) =>
      evaluateOfficialPhysicalFootprintRelationV1({
        left: entry.footprint, right: candidate.footprint,
      }).minimumSeparationMilliInches);
    return {
      modelId: entry.model.id,
      boundaryClearanceMilliInches: Math.round(boundary),
      nearestOtherModelClearanceMilliInches:
        other.length ? Math.round(Math.min(...other)) : null,
      nearestTerrainClearanceMilliInches:
        obstacles.length ? Math.round(Math.min(...obstacles)) : null,
    };
  });
  const minimumOther = values.map((entry) =>
    entry.nearestOtherModelClearanceMilliInches).filter(Number.isFinite);
  const minimumTerrain = values.map((entry) =>
    entry.nearestTerrainClearanceMilliInches).filter(Number.isFinite);
  return {
    models: values,
    minimumBoundaryClearanceMilliInches:
      Math.min(...values.map((entry) => entry.boundaryClearanceMilliInches)),
    minimumOtherModelClearanceMilliInches:
      minimumOther.length ? Math.min(...minimumOther) : null,
    minimumTerrainClearanceMilliInches:
      minimumTerrain.length ? Math.min(...minimumTerrain) : null,
    laneAndEscapeInterpretation:
      "clearance_is_exact_at_current_position; future_route_choice_requires_path_or_formation_solve",
    precision: "exact_current_clearance",
  };
}

function relationPriority(edge, intent) {
  if (edge.edgeKind === "objective_relationship") {
    return intent === "control_objective" ? 100000
      - Number(edge.minimumBaseEdgeDistanceMilliInches || 0) : 20;
  }
  const distance = Number(edge.nearestPhysicalEdges?.distanceMilliInches
    || Number.MAX_SAFE_INTEGER);
  if (intent === "focus_fire") {
    return (edge.threats?.fromTo?.stationaryProfileKeys?.length || 0) * 10000
      + (edge.lineOfSight?.visibleModelPairCount || 0) * 100 - distance;
  }
  if (intent === "fire_zone_exchange") {
    return (edge.fireZoneExchange?.fromStationaryProfileCount || 0) * 10000
      + (edge.fireZoneExchange?.toStationaryProfileCount || 0) * 9000
      - distance;
  }
  if (new Set(["engage", "surround_target", "screen"]).has(intent)) {
    return 100000 - distance;
  }
  if (new Set(["avoid_threat", "retreat", "preserve_lane"]).has(intent)) {
    const threatened = edge.threats?.toFrom?.moveThenAttackProfileKeys?.length || 0;
    return threatened * 100000 - distance;
  }
  return 100000 - distance;
}

export function buildStarcraftTmgTacticalRelationshipGraphV1(input = {}) {
  const state = input.state;
  const seatKey = String(input.seatKey || "");
  const request = input.request || {};
  if (!state?.board || !Array.isArray(state?.pieces) || !seatKey) {
    throw new TypeError("TACTICAL_RELATIONSHIP_GRAPH_INPUT_INVALID");
  }
  const intent = normalizeIntent(request);
  const requestedSubjects = new Set(normalizeIds(request.subjectUnitIds));
  const requestedTargets = new Set(normalizeIds(request.targetIds));
  const allModelRows = modelIndex(state);
  const pieces = (state.pieces || []).filter(activePiece);
  const rowsByUnit = new Map(pieces.map((piece) => [piece.id,
    allModelRows.filter((entry) => entry.piece.id === piece.id)]));
  const subjects = pieces.filter((piece) => requestedSubjects.size
    ? requestedSubjects.has(piece.id)
    : sideRelation(piece, seatKey, state) === "own");
  const targets = pieces.filter((piece) => !subjects.some((entry) => entry.id === piece.id)
    && (requestedTargets.size
      ? requestedTargets.has(piece.id)
        || activeModels(piece).some((model) => requestedTargets.has(model.id))
      : piece.sideKey !== subjects[0]?.sideKey));
  const engagement = engagementLookup(state);
  const unitEdges = [];
  for (const subject of subjects) {
    for (const target of targets) unitEdges.push(unitRelation(
      state, subject, target, rowsByUnit.get(subject.id), rowsByUnit.get(target.id),
      engagement,
    ));
  }
  const markers = (state.board.missionMarkers || [])
    .filter((entry) => entry.isRemoved !== true)
    .map((marker) => ({ marker, footprint: markerFootprint(marker) }))
    .filter((entry) => entry.footprint)
    .filter((entry) => !requestedTargets.size
      || requestedTargets.has(entry.marker.id)
      || intent === "control_objective");
  const objectiveEdges = subjects.flatMap((piece) => markers.map((entry) =>
    objectiveRelation(piece, rowsByUnit.get(piece.id), entry.marker,
      entry.footprint)));
  const terrain = (state.board.terrain || [])
    .filter((entry) => entry.isRemoved !== true && entry.isDestroyed !== true)
    .map((entry) => ({ entry, footprint: terrainFootprint(entry) }))
    .filter((entry) => entry.footprint);
  const allEdges = [...unitEdges, ...objectiveEdges]
    .sort((left, right) => relationPriority(right, intent)
      - relationPriority(left, intent) || left.edgeId.localeCompare(right.edgeId));
  const limit = maximumRelations(request);
  const selectedEdges = allEdges.slice(0, limit);
  const clearances = subjects.map((piece) => ({
    unitId: piece.id,
    ...unitClearance(state, piece, rowsByUnit.get(piece.id), allModelRows, terrain),
    enemyEngagementEdgeCount: unitEdges.filter((entry) =>
      entry.fromUnitId === piece.id && entry.engagement.engaged).length,
  }));
  const oneToMany = Object.fromEntries(subjects.map((piece) => [piece.id,
    unitEdges.filter((entry) => entry.fromUnitId === piece.id).map((entry) => ({
      targetUnitId: entry.toUnitId,
      distanceMilliInches: entry.nearestPhysicalEdges.distanceMilliInches,
      engaged: entry.engagement.engaged,
      stationaryThreatProfileCount:
        entry.threats.fromTo.stationaryProfileKeys.length,
      moveThenFireProfileCount:
        entry.threats.fromTo.moveThenAttackProfileKeys.length,
    }))]));
  const manyToOne = Object.fromEntries(targets.map((piece) => [piece.id,
    unitEdges.filter((entry) => entry.toUnitId === piece.id).map((entry) => ({
      sourceUnitId: entry.fromUnitId,
      distanceMilliInches: entry.nearestPhysicalEdges.distanceMilliInches,
      engaged: entry.engagement.engaged,
      stationaryThreatProfileCount:
        entry.threats.fromTo.stationaryProfileKeys.length,
      moveThenFireProfileCount:
        entry.threats.fromTo.moveThenAttackProfileKeys.length,
    }))]));
  return seal({
    schemaVersion: STARCRAFT_TMG_TACTICAL_RELATIONSHIP_GRAPH_VERSION,
    queryKind: STARCRAFT_TMG_RELATIONSHIP_QUERY_KIND,
    authority: clone(input.authority || null),
    hypotheticalProjection: input.hypotheticalProjection === true,
    intent,
    seatKey,
    scope: {
      subjectUnitIds: subjects.map((entry) => entry.id),
      targetUnitIds: targets.map((entry) => entry.id),
      requestedTargetIds: [...requestedTargets],
      relationshipDenominator: allEdges.length,
      returnedRelationshipCount: selectedEdges.length,
      softTruncated: selectedEdges.length < allEdges.length,
      noRelationshipWasPromotedFromAdvisoryToExact: true,
    },
    nodes: {
      units: [...new Set([...subjects, ...targets])].map((piece) =>
        unitNode(state, piece, rowsByUnit.get(piece.id), seatKey)),
      objectives: markers.map(({ marker, footprint }) => ({
        nodeId: marker.id,
        nodeKind: "mission_marker",
        number: Number(marker.number),
        controlSideKey: marker.controlSideKey || null,
        elevation: marker.elevation || "ground",
        footprint: clone(footprint),
      })),
      terrain: terrain.map(({ entry, footprint }) => ({
        nodeId: String(entry.id || entry.terrainId),
        nodeKind: "terrain",
        terrainKind: entry.terrainKind || entry.category || null,
        size: Number(entry.size),
        blocksPlacement: entry.blocksPlacement !== false,
        impassable: entry.impassable === true,
        footprint: clone(footprint),
      })),
    },
    relationships: selectedEdges,
    aggregates: {
      oneToMany,
      manyToOne,
      friendlyThreat: unitEdges.filter((entry) =>
        entry.threats.fromTo.stationaryProfileKeys.length
          || entry.threats.fromTo.moveThenAttackProfileKeys.length).map((entry) =>
        `${entry.fromUnitId}->${entry.toUnitId}`),
      enemyThreat: unitEdges.filter((entry) =>
        entry.threats.toFrom.stationaryProfileKeys.length
          || entry.threats.toFrom.moveThenAttackProfileKeys.length).map((entry) =>
        `${entry.toUnitId}->${entry.fromUnitId}`),
      clearances,
    },
    mapReachabilityCertificate: clone(
      state.board.competitiveMapRoomFreezeSummary || null),
    overlay: {
      coordinateUnit: "milli-inch",
      unitEnvelopeNodeIds: subjects.map((entry) => entry.id),
      edgeIds: selectedEdges.map((entry) => entry.edgeId),
      exactPhysicalBaseGeometry: true,
      uiPixelsAreNotRulesAuthority: true,
    },
    precisionPolicy: {
      exact: [
        "current physical base distances/contact", "current engagement graph",
        "current terrain line of sight/cover/elevation",
        "current objective base distance", "current boundary/obstacle clearance",
      ],
      advisory: [
        "future move-then-fire band", "unrolled charge band",
        "lane/escape tactical interpretation", "fire-zone exchange outcome",
      ],
      unknownNeverApproximatedAsExact: true,
    },
    sourceReceipts: {
      engagementGraphHash: engagement.graph?.graphHash || null,
      modelBaseGeometryBundleHash:
        state.officialModelBaseGeometryDataBundle?.bundleHash || null,
      terrainLosBundleHash: state.officialTerrainLosDataBundle?.bundleHash || null,
      attackProfileCatalogueHash:
        state.officialAttackProfileCatalogueV2?.catalogueHash || null,
      mapRoomFreezeHash:
        state.board.battlefieldMapManifest?.mapRoomFreezeHash || null,
    },
    rulesAuthority: false,
    exactFieldsDerivedFromRulesKernels: true,
    currentRoomFact: input.hypotheticalProjection !== true,
    mayMutateRoom: false,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "relationshipGraphHash");
}
