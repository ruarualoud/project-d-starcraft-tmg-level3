import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialDeploymentGeometryDataBundleV1 } from
  "../source-data/official-deployment-geometry-data-bundle-v1.mjs";
import { verifyOfficialMissionDeploymentDraftDataBundleV1 } from
  "../source-data/official-mission-deployment-draft-data-bundle-v1.mjs";
import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1,
} from "./official-competitive-map-tabletop-adapter-v1.mjs";
import { compileOfficialCompetitiveMapTwoLayerV1 } from
  "./official-competitive-map-two-layer-compiler-v1.mjs";
import {
  auditOfficialCompetitiveMapSpatialReachabilityV1,
  verifyOfficialCompetitiveMapSpatialReachabilityV1,
} from "./official-competitive-map-spatial-reachability-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_mission_compatibility_matrix_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function quarterTargets(battlefield) {
  return [["south_west", 0.25, 0.25], ["south_east", 0.75, 0.25],
    ["north_west", 0.25, 0.75], ["north_east", 0.75, 0.75]]
    .map(([quarter, x, y]) => ({ targetId: `mission-quarter-${quarter}`,
      targetKind: "mission_quarter", coordinate: {
        x: battlefield.widthInches * x, y: battlefield.heightInches * y },
      accessDistanceInches: 3 }));
}
function topologyPreviewAudit(adapter, compilation) {
  const deploymentZones = adapter.zones.filter((entry) => entry.role === "deployment");
  const entryAnchorsBySide = Object.fromEntries(deploymentZones.map((entry) => (
    [entry.zoneId, entry.centre]
  )));
  const areaTargets = adapter.zones.filter((entry) => (
    ["control", "contest"].includes(entry.role))).map((entry) => ({
    targetId: `topology-zone-${entry.zoneId}`, targetKind: `topology_${entry.role}`,
    coordinate: entry.centre, accessDistanceInches: 3,
  }));
  return auditOfficialCompetitiveMapSpatialReachabilityV1({
    seedId: adapter.seedId, auditAuthority: "map_topology_preview",
    battlefield: adapter.battlefield,
    terrainPieces: compilation.rulesLayer.terrainPieces,
    baseProfiles: adapter.baseProfiles, entryAnchorsBySide, areaTargets,
  });
}
function officialTaskGeometryAudit(adapter, compilation, profile) {
  return auditOfficialCompetitiveMapSpatialReachabilityV1({
    seedId: adapter.seedId, auditAuthority: "official_task_geometry",
    battlefield: profile.battlefield,
    terrainPieces: compilation.rulesLayer.terrainPieces,
    baseProfiles: adapter.baseProfiles,
    entryEdgesBySide: profile.entryEdgesByColour,
    missionMarkers: profile.missionMarkers,
    areaTargets: quarterTargets(profile.battlefield),
  });
}

export function createOfficialCompetitiveMapMissionCompatibilityMatrixV1(input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  const geometryBundle = input.deploymentGeometryDataBundle;
  const draftBundle = input.missionDeploymentDraftDataBundle;
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  verifyOfficialDeploymentGeometryDataBundleV1(geometryBundle);
  verifyOfficialMissionDeploymentDraftDataBundleV1(draftBundle);
  if (geometryBundle.missionDeploymentDraftDataBundleHash !== draftBundle.bundleHash) {
    fail("COMPETITIVE_MAP_MISSION_MATRIX_SOURCE_MISMATCH");
  }
  const topologyAudits = [];
  const taskGeometryAudits = [];
  const combinationRows = [];
  const mapReadiness = [];
  for (const adapter of adapterCatalogue.adapters) {
    const compilation = compileOfficialCompetitiveMapTwoLayerV1({
      adapterCatalogue, seedId: adapter.seedId,
    });
    const preview = topologyPreviewAudit(adapter, compilation);
    verifyOfficialCompetitiveMapSpatialReachabilityV1(preview);
    topologyAudits.push(preview);
    const exactCoverage = adapter.currentMissionDeploymentGeometryCoverage
      === "official_exact";
    const geometryProfiles = geometryBundle.geometryProfiles.filter((entry) => (
      entry.engagementScale === adapter.engagementScale));
    const missionProfiles = draftBundle.missionProfiles.filter((entry) => (
      entry.engagementScale === adapter.engagementScale));
    if (!exactCoverage) {
      mapReadiness.push({ seedId: adapter.seedId,
        engagementScale: adapter.engagementScale,
        topologyAuditHash: preview.auditHash,
        topologyReachable: preview.spatialReachabilityCertified,
        officialTaskGeometryStatus: "official_geometry_unavailable",
        formalTaskRoomEligible: false });
      continue;
    }
    if (geometryProfiles.length !== 5 || missionProfiles.length !== 5) {
      fail("COMPETITIVE_MAP_MISSION_MATRIX_SCALE_DENOMINATOR_INVALID",
        adapter.engagementScale);
    }
    const geometryRows = geometryProfiles.map((profile) => {
      const audit = officialTaskGeometryAudit(adapter, compilation, profile);
      verifyOfficialCompetitiveMapSpatialReachabilityV1(audit);
      taskGeometryAudits.push({ seedId: adapter.seedId,
        deploymentRecordKey: profile.recordKey,
        deploymentName: profile.name, engagementScale: profile.engagementScale,
        audit });
      return { profile, audit };
    });
    for (const { profile, audit } of geometryRows) {
      for (const mission of missionProfiles) combinationRows.push({
        seedId: adapter.seedId, engagementScale: adapter.engagementScale,
        missionRecordKey: mission.recordKey, missionName: mission.name,
        deploymentRecordKey: profile.recordKey, deploymentName: profile.name,
        topologyAuditHash: preview.auditHash,
        taskGeometryAuditHash: audit.auditHash,
        requiresQuarterReachability: /^Divide and Conquer/iu.test(mission.name),
        officialTaskGeometryReachable: audit.spatialReachabilityCertified,
        formalTaskRoomEligible: preview.spatialReachabilityCertified
          && audit.spatialReachabilityCertified,
      });
    }
    mapReadiness.push({ seedId: adapter.seedId,
      engagementScale: adapter.engagementScale,
      topologyAuditHash: preview.auditHash,
      topologyReachable: preview.spatialReachabilityCertified,
      officialTaskGeometryStatus: geometryRows.every((entry) => (
        entry.audit.spatialReachabilityCertified)) ? "all_current_combinations_reachable"
        : "topology_repair_required",
      formalTaskRoomEligible: preview.spatialReachabilityCertified
        && geometryRows.every((entry) => entry.audit.spatialReachabilityCertified) });
  }
  const counts = { maps: adapterCatalogue.adapters.length,
    topologyAudits: topologyAudits.length,
    officialExactMaps: mapReadiness.filter((entry) => (
      entry.officialTaskGeometryStatus !== "official_geometry_unavailable")).length,
    grandPreviewOnlyMaps: mapReadiness.filter((entry) => (
      entry.officialTaskGeometryStatus === "official_geometry_unavailable")).length,
    taskGeometryAudits: taskGeometryAudits.length,
    officialMapMissionDeploymentCombinations: combinationRows.length,
    reachableOfficialCombinations: combinationRows.filter((entry) => (
      entry.formalTaskRoomEligible)).length };
  const body = {
    schema: OFFICIAL_COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_V1_SCHEMA,
    version: "1.0.0", adapterCatalogueHash: adapterCatalogue.catalogueHash,
    deploymentGeometryDataBundleHash: geometryBundle.bundleHash,
    missionDeploymentDraftDataBundleHash: draftBundle.bundleHash,
    topologyAudits, taskGeometryAudits, combinationRows, mapReadiness, counts,
    allTwentyMapTopologiesReachable: topologyAudits.every((entry) => (
      entry.spatialReachabilityCertified)),
    allCurrentOfficialCombinationsReachable: combinationRows.every((entry) => (
      entry.formalTaskRoomEligible)),
    grandFormalTaskRoomsBlockedUntilOfficialGeometry: true,
    sourcePixelsUsedAsRulesGeometry: false,
    sourceRefreshPerformed: false,
    rulesTruth: "all_map_topology_and_current_official_task_geometry_matrix",
    trainingTruth: false,
  };
  return deepFreeze({ ...body, matrixHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCompetitiveMapMissionCompatibilityMatrixV1(matrix) {
  if (!object(matrix)
    || matrix.schema !== OFFICIAL_COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_V1_SCHEMA
    || matrix.version !== "1.0.0"
    || matrix.matrixHash !== hashStarcraftTmgContract(without(matrix, ["matrixHash"]))
    || matrix.counts?.maps !== 20 || matrix.counts?.topologyAudits !== 20
    || matrix.counts?.officialExactMaps !== 15
    || matrix.counts?.grandPreviewOnlyMaps !== 5
    || matrix.counts?.taskGeometryAudits !== 75
    || matrix.counts?.officialMapMissionDeploymentCombinations !== 375
    || matrix.topologyAudits?.some((entry) => {
      try { return !verifyOfficialCompetitiveMapSpatialReachabilityV1(entry); }
      catch { return true; }
    })
    || matrix.taskGeometryAudits?.some((entry) => {
      try { return !verifyOfficialCompetitiveMapSpatialReachabilityV1(entry.audit); }
      catch { return true; }
    })
    || matrix.grandFormalTaskRoomsBlockedUntilOfficialGeometry !== true
    || matrix.sourcePixelsUsedAsRulesGeometry !== false
    || matrix.sourceRefreshPerformed !== false || matrix.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_INVALID");
  }
  if (matrix.allTwentyMapTopologiesReachable !== matrix.topologyAudits.every((entry) => (
    entry.spatialReachabilityCertified))
    || matrix.allCurrentOfficialCombinationsReachable
      !== matrix.combinationRows.every((entry) => entry.formalTaskRoomEligible)
    || matrix.counts.reachableOfficialCombinations !== matrix.combinationRows.filter(
      (entry) => entry.formalTaskRoomEligible).length) {
    fail("COMPETITIVE_MAP_MISSION_COMPATIBILITY_MATRIX_DERIVATION_INVALID");
  }
  return true;
}

export function assertOfficialCompetitiveMapMissionCompatibilityReadyV1(matrix) {
  verifyOfficialCompetitiveMapMissionCompatibilityMatrixV1(matrix);
  const failedTopology = matrix.mapReadiness.filter((entry) => (
    !entry.topologyReachable)).map((entry) => entry.seedId);
  const failedOfficial = matrix.combinationRows.filter((entry) => (
    !entry.formalTaskRoomEligible)).slice(0, 10).map((entry) => (
    `${entry.seedId}:${entry.deploymentName}:${entry.missionName}`));
  if (failedTopology.length > 0) {
    fail("COMPETITIVE_MAP_TOPOLOGY_REPAIR_REQUIRED", failedTopology.join(","));
  }
  if (failedOfficial.length > 0) {
    fail("COMPETITIVE_MAP_OFFICIAL_TASK_GEOMETRY_REPAIR_REQUIRED",
      failedOfficial.join(","));
  }
  return true;
}
