import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialCompetitiveMapRoomFreezeV1 } from
  "../product-composition/official-competitive-map-two-layer-compiler-v1.mjs";

export const PREGAME_MAP_EVIDENCE_PORT_V1 =
  "starcraft_tmg_pregame_map_evidence_port_v1";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function seal(body) {
  return Object.freeze({ ...body,
    receiptHash: hashStarcraftTmgContract(body) });
}

function terrainSummary(piece) {
  return {
    terrainPieceId: piece.terrainPieceId || piece.terrainId || piece.id,
    terrainKind: piece.terrainKind,
    size: piece.size,
    footprint: clone(piece.footprint),
    heightTier: piece.heightTier ?? piece.elevation ?? null,
    standableHorizontalSurface: piece.standableHorizontalSurface === true,
    openings: clone(piece.openings || []),
    accessPointIds: (piece.accessPoints || []).map((point) =>
      point.accessPointId || point.id),
  };
}

export function createPregameMapEvidencePortV1({ sourceState,
  sourceStateHash = null } = {}) {
  if (!sourceState?.board || !Array.isArray(sourceState.board.terrain)) {
    throw new TypeError("PREGAME_MAP_SOURCE_STATE_REQUIRED");
  }
  const board = sourceState.board;
  const freeze = sourceState.officialCompetitiveMapRoomFreeze || null;
  const summary = board.competitiveMapRoomFreezeSummary || null;
  const manifest = board.battlefieldMapManifest || null;
  const sourceHash = sourceStateHash || hashStarcraftTmgContract(sourceState);
  let unknownReason = freeze ? null : "abstract_fixture_no_certified_map";
  if (freeze && (freeze.roomFreezeHash !== summary?.roomFreezeHash
    || freeze.compilationHash !== summary?.compilationHash
    || freeze.seedId !== summary?.seedId
    || freeze.missionSpatialReachabilityAuditHash
      !== summary?.missionSpatialReachabilityAuditHash
    || freeze.seedId !== manifest?.mapSeedId
    || freeze.compilationHash !== manifest?.mapCompilationHash)) {
    unknownReason = "map_variant_mismatch";
  }
  if (freeze && !unknownReason) {
    verifyOfficialCompetitiveMapRoomFreezeV1(freeze, {
      deploymentGeometryBinding:
        sourceState.officialDeploymentGeometryBinding,
      balancedTerrainRulesDataBundle:
        sourceState.officialBalancedTerrainRulesDataBundle,
    });
  }
  const audit = unknownReason ? null
    : freeze.missionSpatialReachabilityAudit;
  const mapBinding = Object.freeze({
    sourceStateHash: sourceHash,
    seedId: freeze?.seedId || null,
    compilationHash: freeze?.compilationHash || null,
    roomFreezeHash: freeze?.roomFreezeHash || null,
    rulesReachabilityAuditHash: audit?.auditHash || null,
    missionRecordKey: sourceState.mission?.recordKey || null,
    deploymentRecordKey: sourceState.board.deploymentId || null,
    officialSourceSnapshotHash:
      sourceState.officialMissionRuntimeState?.sourceSnapshotHash || null,
  });

  function receipt(queryId, queryKind, result) {
    const id = String(queryId || "").trim();
    if (!id) throw new TypeError("PREGAME_MAP_QUERY_ID_REQUIRED");
    return seal({ schemaVersion: PREGAME_MAP_EVIDENCE_PORT_V1,
      queryId: id, queryKind, mapBinding: clone(mapBinding),
      ...result, sourcePixelsUsedAsRulesGeometry: false,
      mutatesRoomState: false, trainingTruth: false });
  }

  function summarizeMap(query = {}) {
    return receipt(query.queryId, "summarize_map", {
      resultStatus: audit ? "certified_map_summary" : "unknown",
      unknownReason,
      battlefield: { widthInches: board.widthInches,
        heightInches: board.heightInches },
      terrain: board.terrain.map(terrainSummary),
      accessPoints: (board.accessPoints || []).map((point) => ({
        accessPointId: point.accessPointId || point.id,
        terrainId: point.terrainId,
        footprint: clone(point.footprint),
        connectsElevations: clone(point.connectsElevations || point.connects),
      })),
      missionMarkers: (board.missionMarkers || []).map((marker) => ({
        targetId: marker.id, coordinate: {
          xInches: marker.xInches, yInches: marker.yInches },
        diameterInches: marker.diameterInches,
        elevation: marker.elevation,
        supportTerrainPieceId: marker.supportTerrainPieceId,
      })),
      baseProfileIds: audit?.baseProfileIds || [],
      entryAndTaskReachabilityCertified:
        audit?.spatialReachabilityCertified === true,
      routeDetailPolicy: "query_per_side_base_and_target; grid_audit_is_not_an_exact_move",
    });
  }

  function routeToObjective(query = {}) {
    const sideId = String(query.sideId || "");
    const baseId = String(query.baseId || "");
    const targetId = String(query.targetId || "");
    const base = audit?.baseProfileAudits?.find((row) => row.baseId === baseId);
    const side = base?.sideAudits?.find((row) => row.sideId === sideId);
    const target = side?.targetAudits?.find((row) => row.targetId === targetId);
    const reason = unknownReason || (!base ? "base_profile_not_audited"
      : !side ? "side_not_audited"
        : !target ? "target_not_audited" : null);
    return receipt(query.queryId, "route_to_objective", {
      resultStatus: reason ? "unknown" : "certified_reachability_audit",
      unknownReason: reason,
      sideId, baseId, targetId,
      reachable: reason ? null : target.reachable,
      failureCode: reason ? null : target.failureCode,
      witness: reason ? null : clone(target.witness),
      blockingTerrainPieceIds: reason ? []
        : clone(target.blockingTerrainPieceIds),
      alternateRoutes: "unknown_not_computed",
      exactMoveOrDeploymentLegality: false,
      routeLengthPrecision: "half_inch_grid_approximation",
    });
  }

  function compareObjectiveAccess(query = {}) {
    const targetId = String(query.targetId || "");
    const baseId = String(query.baseId || "");
    const sides = audit?.sideIds || [];
    const rows = sides.map((sideId) => {
      const receiptValue = routeToObjective({
        queryId: `${query.queryId}:${sideId}`, sideId, baseId, targetId,
      });
      return { sideId, reachable: receiptValue.reachable,
        approximateRouteLengthInches:
          receiptValue.witness?.approximateRouteLengthInches ?? null,
        receiptHash: receiptValue.receiptHash };
    });
    return receipt(query.queryId, "compare_objective_access", {
      resultStatus: unknownReason || rows.length !== 2
        || rows.some((row) => row.reachable === null)
        ? "unknown" : "advisory_map_comparison",
      unknownReason: unknownReason || (rows.length !== 2
        ? "two_side_audit_unavailable" : null),
      baseId, targetId, sides: rows,
      playerSwapDeltaInches: rows.length === 2
        && rows.every((row) => row.approximateRouteLengthInches !== null)
        ? Number((rows[0].approximateRouteLengthInches
          - rows[1].approximateRouteLengthInches).toFixed(3)) : null,
      scoreTimingDerived: false,
      exactMoveOrDeploymentLegality: false,
    });
  }

  function evaluateRosterRoute(query = {}) {
    const sideId = String(query.sideId || "");
    const candidateInput = query.candidateInput;
    if (!Array.isArray(candidateInput?.units)
      || candidateInput.units.length === 0
      || candidateInput.sideKey !== sideId) {
      throw new TypeError("PREGAME_MAP_ROSTER_CANDIDATE_REQUIRED");
    }
    const geometryProfiles = sourceState
      .officialModelBaseGeometryDataBundle?.profiles || [];
    const units = candidateInput.units.map((unit) => {
      const geometry = geometryProfiles.find((profile) =>
        profile.recordKey === unit.recordKey);
      const width = geometry?.baseWidthMillimetres;
      const depth = geometry?.baseDepthMillimetres;
      const baseId = geometry?.baseShape === "round"
        ? `round_${width}mm`
        : geometry?.baseShape === "rectangle"
          ? `rectangle_${width}x${depth}mm` : null;
      return { unitInstanceId: unit.unitInstanceId,
        recordKey: unit.recordKey,
        compositionKind: unit.compositionKind,
        baseId: audit?.baseProfileIds.includes(baseId) ? baseId : null,
        geometrySourceRecordHash: geometry?.sourceRecordHash || null };
    });
    const uniqueBases = [...new Set(units.map((unit) => unit.baseId)
      .filter(Boolean))];
    const targetIds = audit?.targetIds || [];
    const accessByBase = uniqueBases.map((baseId) => {
      const sideAudit = audit.baseProfileAudits
        .find((row) => row.baseId === baseId)?.sideAudits
        .find((row) => row.sideId === sideId);
      return { baseId, targets: targetIds.map((targetId) => {
        const target = sideAudit?.targetAudits.find((row) =>
          row.targetId === targetId);
        return { targetId, reachable: target?.reachable ?? null,
          failureCode: target?.failureCode || null,
          approximateRouteLengthInches:
            target?.witness?.approximateRouteLengthInches ?? null,
          accessPointId: target?.witness?.accessPointId || null,
          witnessCoordinate: clone(target?.witness?.coordinate || null) };
      }) };
    });
    const unresolvedUnits = units.filter((unit) => !unit.baseId)
      .map((unit) => unit.unitInstanceId);
    return receipt(query.queryId, "evaluate_roster_route", {
      resultStatus: unknownReason || unresolvedUnits.length
        ? "unknown" : "certified_base_clearance_audit",
      unknownReason: unknownReason || (unresolvedUnits.length
        ? "unit_base_profile_not_audited" : null),
      sideId,
      candidateInputHash: hashStarcraftTmgContract(candidateInput),
      units,
      accessByBase,
      unresolvedUnits,
      formationCoherencyAndEndingFitChecked: false,
      flyingAndAbilityTransitChecked: false,
      exactMoveOrDeploymentLegality: false,
    });
  }

  return Object.freeze({ mapBinding, summarizeMap, routeToObjective,
    compareObjectiveAccess, evaluateRosterRoute });
}
