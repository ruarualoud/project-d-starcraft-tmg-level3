import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { projectStarcraftTmgViewerStateShapeV3 } from
  "../client-domain/viewer-projection-v3.mjs";
import { createOfficialModelBaseFootprintV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

export const STARCRAFT_TMG_PLAYER_SPATIAL_OBSERVATION_VERSION =
  "starcraft_tmg_player_spatial_observation_v1";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function milliFromInches(value) {
  const parsed = finite(value);
  return parsed === null ? null : Math.round(parsed * 1000);
}

function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) =>
    model?.isOnField !== false && model?.isDestroyed !== true);
}

function safeReason(error) {
  const message = String(error?.message || error || "geometry unavailable");
  const code = message.split(":")[0];
  return /^[A-Z0-9_]{1,120}$/u.test(code) ? code : "GEOMETRY_UNAVAILABLE";
}

function relationFor(piece, seatKey, state) {
  if (piece.sideKey === seatKey) return "own";
  const teams = state.rosterRegistryResolution?.teamMembershipByPlayer || {};
  if (teams[seatKey] && teams[seatKey] === teams[piece.sideKey]) return "allied";
  return "opponent";
}

function footprintBounds(footprint) {
  if (footprint.shape === "round") {
    return {
      minXMilliInches: footprint.center.xMilliInches - footprint.radiusMilliInches,
      maxXMilliInches: footprint.center.xMilliInches + footprint.radiusMilliInches,
      minYMilliInches: footprint.center.yMilliInches - footprint.radiusMilliInches,
      maxYMilliInches: footprint.center.yMilliInches + footprint.radiusMilliInches,
    };
  }
  if (!Array.isArray(footprint.vertices) || !footprint.vertices.length) return null;
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

function insideBoard(bounds, board) {
  if (!bounds || board.widthMilliInches === null
    || board.heightMilliInches === null) return null;
  return bounds.minXMilliInches >= 0
    && bounds.maxXMilliInches <= board.widthMilliInches
    && bounds.minYMilliInches >= 0
    && bounds.maxYMilliInches <= board.heightMilliInches;
}

function modelObservation(piece, model, dataBundle, board, seatKey, state) {
  const base = {
    unitId: String(piece.id || ""),
    modelId: String(model.id || ""),
    unitName: piece.unitName || piece.name || null,
    sideKey: piece.sideKey || null,
    sideRelation: relationFor(piece, seatKey, state),
    position: {
      xMilliInches: milliFromInches(model.xInches),
      yMilliInches: milliFromInches(model.yInches),
      rotationDegrees: finite(model.baseRotationDegrees) || 0,
    },
    elevation: model.elevation ?? piece.elevation ?? 0,
    status: {
      activatedPhases: clone(piece.activatedPhases || {}),
      combatEngaged: piece.combatEngaged === true,
      statuses: clone(model.statuses || piece.statuses || []),
    },
  };
  try {
    const footprint = createOfficialModelBaseFootprintV1({
      piece,
      model,
      dataBundle,
    });
    const bounds = footprintBounds(footprint);
    return {
      ...base,
      position: clone(footprint.center),
      footprint,
      footprintBounds: bounds,
      fullyInsideBattlefield: insideBoard(bounds, board),
      boundaryMeasurement: "complete_physical_base_footprint_not_model_center",
      geometryStatus: "exact_rules_profile",
      geometryIssue: null,
    };
  } catch (error) {
    return {
      ...base,
      footprint: null,
      footprintBounds: null,
      fullyInsideBattlefield: null,
      boundaryMeasurement: "unknown_until_exact_base_profile_available",
      geometryStatus: "unknown",
      geometryIssue: safeReason(error),
    };
  }
}

function formationEnvelope(models) {
  const bounds = models.map((entry) => entry.footprintBounds).filter(Boolean);
  if (bounds.length !== models.length || !bounds.length) return null;
  return {
    minXMilliInches: Math.min(...bounds.map((entry) => entry.minXMilliInches)),
    maxXMilliInches: Math.max(...bounds.map((entry) => entry.maxXMilliInches)),
    minYMilliInches: Math.min(...bounds.map((entry) => entry.minYMilliInches)),
    maxYMilliInches: Math.max(...bounds.map((entry) => entry.maxYMilliInches)),
    includesCompletePhysicalBases: true,
  };
}

function unitObservation(piece, models, seatKey, state) {
  const envelope = formationEnvelope(models);
  return {
    unitId: String(piece.id || ""),
    unitName: piece.unitName || piece.name || null,
    officialUnitRecordKey: piece.officialUnitRecordKey || null,
    sideKey: piece.sideKey || null,
    sideRelation: relationFor(piece, seatKey, state),
    currentModels: Number(piece.currentModels || models.length),
    modelIds: models.map((entry) => entry.modelId),
    leadingModelId: piece.leadingModelId || piece.lastLeadingModelId || null,
    formationEnvelope: envelope,
    formationGeometryStatus: envelope ? "exact_visible_footprints"
      : "unknown_incomplete_footprints",
    printedCoherencyState: {
      inCoherency: piece.inCoherency ?? null,
      coherencyStatus: piece.coherencyStatus || null,
    },
    physicalPlacementIsPerModel: true,
    unitCenterIsNotPlacementAuthority: true,
    repositionProcedure: {
      leadingModelUsesPhysicalPath: true,
      remainingModelsArePlacedByCoherencyLinks: true,
      agentChoosesFormationIntentAndCompleteSolvedLayout: true,
      hostMaySolveMultipleCompleteLayoutsFromAgentIntent: true,
      agentNeedNotAuthorEveryCoordinate: true,
      unreviewedAutomaticFinalPlacementAllowed: false,
    },
  };
}

function axisRectangle(value, id, kind) {
  const source = object(value.footprint) ? value.footprint : value;
  const minX = finite(source.minXMilliInches);
  const maxX = finite(source.maxXMilliInches);
  const minY = finite(source.minYMilliInches);
  const maxY = finite(source.maxYMilliInches);
  if ([minX, maxX, minY, maxY].every((entry) => entry !== null)
    && minX < maxX && minY < maxY) {
    return {
      objectId: id,
      kind,
      shape: "axis_aligned_rectangle",
      minXMilliInches: minX,
      maxXMilliInches: maxX,
      minYMilliInches: minY,
      maxYMilliInches: maxY,
    };
  }
  const coordinate = object(source.coordinate) ? source.coordinate : source;
  const x = source.xMilliInches ?? milliFromInches(
    source.xInches ?? coordinate.x);
  const y = source.yMilliInches ?? milliFromInches(
    source.yInches ?? coordinate.y);
  const width = source.widthMilliInches ?? milliFromInches(source.widthInches);
  const depth = source.depthMilliInches ?? milliFromInches(source.depthInches);
  if ([x, y, width, depth].every((entry) => finite(entry) !== null)
    && Number(width) > 0 && Number(depth) > 0) {
    return {
      objectId: id,
      kind,
      shape: "axis_aligned_rectangle",
      minXMilliInches: Math.round(Number(x) - (Number(width) / 2)),
      maxXMilliInches: Math.round(Number(x) + (Number(width) / 2)),
      minYMilliInches: Math.round(Number(y) - (Number(depth) / 2)),
      maxYMilliInches: Math.round(Number(y) + (Number(depth) / 2)),
    };
  }
  return null;
}

function roundFootprint(value, id, kind) {
  const source = object(value.footprint) ? value.footprint : value;
  const center = object(source.center) ? source.center
    : object(source.coordinate) ? source.coordinate : source;
  const x = finite(center.xMilliInches
    ?? milliFromInches(center.xInches ?? center.x));
  const y = finite(center.yMilliInches
    ?? milliFromInches(center.yInches ?? center.y));
  let radius = finite(source.radiusMilliInches);
  if (radius === null) radius = milliFromInches(source.radiusInches);
  if (radius === null) {
    const diameter = finite(source.diameterMilliInches)
      ?? milliFromInches(source.diameterInches)
      ?? (finite(source.diameterMillimeters) === null ? null
        : Math.round((Number(source.diameterMillimeters) / 25.4) * 1000));
    radius = diameter === null ? null : Math.round(diameter / 2);
  }
  if (x === null || y === null || radius === null || radius <= 0) return null;
  return {
    objectId: id,
    kind,
    shape: "round",
    center: { xMilliInches: x, yMilliInches: y },
    radiusMilliInches: radius,
  };
}

function boardObject(value, kind, board) {
  const id = String(value.id || value.terrainId || value.markerId
    || value.tokenId || (value.number === undefined ? ""
      : `${kind}-${value.number}`));
  const declaredShape = String(value.footprint?.shape || value.shape || "")
    .toLowerCase();
  const footprint = declaredShape === "round" || value.radiusInches !== undefined
    || value.diameterInches !== undefined || value.diameterMillimeters !== undefined
    ? roundFootprint(value, id, kind) : axisRectangle(value, id, kind);
  const bounds = footprint?.shape === "round" ? {
    minXMilliInches: footprint.center.xMilliInches - footprint.radiusMilliInches,
    maxXMilliInches: footprint.center.xMilliInches + footprint.radiusMilliInches,
    minYMilliInches: footprint.center.yMilliInches - footprint.radiusMilliInches,
    maxYMilliInches: footprint.center.yMilliInches + footprint.radiusMilliInches,
  } : footprint;
  return {
    objectId: id,
    kind,
    label: value.name || value.label || value.terrainKind || value.markerKind
      || value.tokenKind || null,
    footprint,
    fullyInsideBattlefield: footprint ? insideBoard(bounds, board) : null,
    geometryStatus: footprint ? "rules_projected" : "unknown",
    elevation: value.elevation ?? value.effectiveSize ?? null,
    blocksLineOfSight: value.blocksLineOfSight ?? null,
    blocksPlacement: value.blocksPlacement ?? null,
    impassable: value.impassable ?? null,
    controlSideKey: value.controlSideKey || null,
    source: clone(value),
  };
}

function uniqueBoardObjects(collections) {
  const result = [];
  const seen = new Set();
  for (const entry of collections.flat()) {
    const key = `${entry.kind}:${entry.objectId}`;
    if (!entry.objectId || seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

export function createStarcraftTmgPlayerSpatialObservationV1(input = {}) {
  const projection = input.roomProjection;
  if (!object(projection) || !object(projection.room)
    || !object(projection.matchBinding) || !object(projection.viewer)) {
    throw new TypeError("viewer-scoped Room Projection is required");
  }
  const state = projectStarcraftTmgViewerStateShapeV3(projection.state || {});
  const sourceWasExactViewerShape = JSON.stringify(state)
    === JSON.stringify(projection.state || {});
  const seatKey = String(projection.viewer.seatKey || "");
  if (!seatKey) throw new TypeError("spatial observation requires a player seat");
  const battlefield = state.officialDeploymentGeometryBinding?.battlefield || {};
  const board = {
    widthMilliInches: milliFromInches(
      state.board?.widthInches ?? battlefield.widthInches),
    heightMilliInches: milliFromInches(
      state.board?.heightInches ?? battlefield.heightInches),
    scenarioMapId: state.board?.scenarioMapId || null,
    scenarioMapName: state.board?.scenarioMapName || null,
    competitiveMap: state.board?.battlefieldMapManifest ? {
      seedId: state.board.battlefieldMapManifest.mapSeedId || null,
      displayName: state.board.battlefieldMapManifest.mapDisplayName || null,
      gameEra: state.board.battlefieldMapManifest.mapGameEra || null,
      engagementScale:
        state.board.battlefieldMapManifest.engagementScale || null,
      compilationHash:
        state.board.battlefieldMapManifest.mapCompilationHash || null,
      roomFreezeHash:
        state.board.battlefieldMapManifest.mapRoomFreezeHash || null,
      missionSpatialReachabilityAuditHash:
        state.board.battlefieldMapManifest
          .missionSpatialReachabilityAuditHash || null,
      mutationAfterRoomCreationAllowed:
        state.board?.competitiveMapRoomFreezeSummary
          ?.mutationAfterRoomCreationAllowed === true,
      backgroundRulesAuthority: false,
      authoritativeTerrainLayer: true,
    } : null,
    coordinateUnit: "milli-inch",
    origin: "battlefield_bottom_left",
    xAxis: "right",
    yAxis: "up",
    boundaryRule: "complete_physical_footprint_must_remain_inside",
  };
  const dataBundle = state.officialModelBaseGeometryDataBundle;
  const pieces = (state.pieces || []).filter(activePiece);
  const models = pieces.flatMap((piece) => activeModels(piece).map((model) =>
    modelObservation(piece, model, dataBundle, board, seatKey, state)));
  const units = pieces.map((piece) => unitObservation(piece,
    models.filter((entry) => entry.unitId === piece.id), seatKey, state));
  const offTableUnits = (state.pieces || []).filter((piece) => !activePiece(piece))
    .map((piece) => ({
      unitId: String(piece.id || ""),
      unitName: piece.unitName || piece.name || null,
      sideKey: piece.sideKey || null,
      sideRelation: relationFor(piece, seatKey, state),
      isInReserves: piece.isInReserves === true,
      isDestroyed: piece.isDestroyed === true,
      currentModels: Number(piece.currentModels || 0),
      positionAvailable: false,
    }));
  const terrain = (state.board?.terrain || []).map((entry) =>
    boardObject(entry, "terrain", board));
  const tokens = uniqueBoardObjects([
    (state.board?.tokens || []).map((entry) => boardObject(entry, "token", board)),
    (state.officialBattlefieldTokens || []).map((entry) =>
      boardObject(entry, "token", board)),
  ]);
  const markers = uniqueBoardObjects([
    (state.board?.missionMarkers || []).map((entry) =>
      boardObject(entry, "mission_marker", board)),
    (state.board?.markers || []).map((entry) => boardObject(entry, "marker", board)),
    (state.officialBattlefieldMarkers || []).map((entry) =>
      boardObject(entry, "marker", board)),
    (state.officialMissionMarkerPlacement?.missionMarkers || []).map((entry) =>
      boardObject(entry, "mission_marker", board)),
  ]);
  const exactModels = models.filter((entry) =>
    entry.geometryStatus === "exact_rules_profile");
  const geometryIssues = models.filter((entry) => entry.geometryIssue).map((entry) => ({
    unitId: entry.unitId,
    modelId: entry.modelId,
    code: entry.geometryIssue,
  }));
  const legalSpace = input.legalSpace || null;
  if (legalSpace && (legalSpace.roomId !== projection.room.roomId
    || legalSpace.matchBindingHash !== projection.matchBinding.bindingHash
    || legalSpace.stateRevision !== projection.room.stateRevision
    || legalSpace.stateHash !== projection.room.stateHash)) {
    throw new TypeError("LegalSpace does not match spatial observation snapshot");
  }
  return seal({
    schemaVersion: STARCRAFT_TMG_PLAYER_SPATIAL_OBSERVATION_VERSION,
    gameId: "starcraft-tmg",
    roomId: projection.room.roomId,
    matchBindingHash: projection.matchBinding.bindingHash,
    stateRevision: projection.room.stateRevision,
    stateHash: projection.room.stateHash,
    legalSpaceHash: legalSpace?.legalSpaceHash || null,
    viewer: {
      seatKey,
      visibilityScope: projection.viewer.visibilityScope,
      sourceWasExactViewerShape,
      unreviewedSourceFieldsDiscarded: sourceWasExactViewerShape ? 0 : 1,
    },
    board,
    units,
    models,
    offTableUnits,
    terrain,
    tokens,
    markers,
    objectiveState: {
      mission: clone(state.selectedMission || state.mission || null),
      scores: clone(state.scores || {}),
      markerCount: markers.filter((entry) =>
        entry.kind === "mission_marker").length,
    },
    coverage: {
      visibleModelCount: models.length,
      exactFootprintCount: exactModels.length,
      unknownFootprintCount: models.length - exactModels.length,
      everyVisiblePhysicalBaseExact:
        models.length > 0 && exactModels.length === models.length,
      boardDimensionsExact: board.widthMilliInches !== null
        && board.heightMilliInches !== null,
      terrainFootprintsProjected: terrain.filter((entry) =>
        entry.footprint).length,
      markerAndTokenFootprintsProjected: [...markers, ...tokens].filter((entry) =>
        entry.footprint).length,
      geometryIssues,
    },
    queryCapabilities: {
      exactFromObservation: [
        "frozen_competitive_map_identity_and_geometry_audit",
        "visible_world_positions",
        "official_model_base_footprints_when_geometry_status_exact",
        "complete_base_battlefield_containment_when_not_null",
        "visible_formation_envelopes_when_geometry_status_exact",
        "visible_terrain_marker_and_token_footprints_when_projected",
      ],
      rulesQueryRequired: [
        "base_edge_distance",
        "within_and_wholly_within",
        "legal_full_path_movement",
        "coherency_after_candidate_placement",
        "intervening_model_or_terrain_blocking",
        "line_of_sight_cover_and_elevation",
        "stationary_move_attack_charge_and_weapon_specific_threat",
        "one_to_many_many_to_one_and_fire_zone_exchange",
        "objective_score_after_candidate_action",
      ],
      unsupportedMustReturnUnknown: true,
    },
    coordinateSeparation: {
      rulesWorldCoordinates: "milli-inch",
      displayCoordinatesIncluded: false,
      cssPixelsIncluded: false,
      cameraPanZoomRotationIncluded: false,
      invariantUnderUiPanZoom: true,
    },
    unitRepositionSemantics: {
      leadingModelPhysicalPathOnly: true,
      remainingModelsArePlacedAfterLeadingModelPath: true,
      agentMustChooseFormationIntentAndOneCompleteLegalLayout: true,
      hostMaySolveCoordinatesFromWeightedTacticalObjectives: true,
      agentNeedNotAuthorEveryRemainingCoordinate: true,
      remainingModelTransitPathsAreNotRulesFacts: true,
      completeFinalFormationUsesPerModelPhysicalBaseGeometry: true,
      unreviewedAutomaticFinalPlacementAllowed: false,
    },
    rulesAuthority: "external_rules_service",
    mayMutateRoom: false,
    eligibleForTraining: false,
    trainingTruth: false,
  }, "observationHash");
}
