import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { projectStarcraftTmgThreatActionWindowV1 } from
  "./tactical-relationship-graph-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "./tactical-relationship-graph-v1.mjs";
import { projectStarcraftTmgIncomingStationaryFireEstimateV1 } from
  "./legal-formation-search-v1.mjs";
import { projectOfficialOmegaWormPieceV1 } from
  "../product-composition/official-selected-roster-ability-runtime-v1.mjs";
import { getOfficialBattlefieldAssetComponentFootprintV1 } from
  "../source-data/official-battlefield-asset-component-profile-v1.mjs";
import { createOwnedOfficialBattlefieldAssetInstantiationStateV1 } from
  "../product-composition/official-battlefield-asset-family-adapter-v1.mjs";

export const STARCRAFT_TMG_LEGAL_ASSET_PLACEMENT_SEARCH_VERSION =
  "starcraft_tmg_legal_asset_placement_search_v1";
export const STARCRAFT_TMG_ENTRY_EDGE_UTILITY_VERSION =
  "starcraft_tmg_entry_edge_utility_v1";
export const STARCRAFT_TMG_OMEGA_RISK_PROJECTION_VERSION =
  "starcraft_tmg_omega_risk_projection_v1";

const DEFAULT_MAX_ATTEMPTS = 1_024;
const DEFAULT_MAX_OPTIONS = 4;
const DEFAULT_STRATEGIC_CANDIDATE_POOL = 96;
const DIRECTIONS = Object.freeze(Array.from({ length: 16 }, (_, index) => {
  const radians = (Math.PI * 2 * index) / 16;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}));

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

function milliInchesFromMillimeters(value) {
  const millimeters = Number(value);
  return Number.isFinite(millimeters) && millimeters > 0
    ? Math.round((millimeters / 25.4) * 1_000) : 0;
}

function tokenHalfExtents(profile) {
  const value = object(profile) ? profile : {};
  const milliWidth = Number(value.baseWidthMilliInches
    ?? value.widthMilliInches);
  const milliDepth = Number(value.baseDepthMilliInches
    ?? value.depthMilliInches);
  const inchWidth = Number(value.baseWidthInches ?? value.widthInches);
  const inchDepth = Number(value.baseDepthInches ?? value.depthInches);
  const diameter = milliInchesFromMillimeters(value.baseDiameterMm
    ?? value.baseWidthMm ?? value.widthMillimeters);
  const width = milliInchesFromMillimeters(value.baseWidthMm
    ?? value.widthMillimeters ?? value.baseDiameterMm);
  const depth = milliInchesFromMillimeters(value.baseDepthMm
    ?? value.depthMillimeters ?? value.baseDiameterMm);
  const round = String(value.baseShape || value.shape || "round") === "round";
  return {
    x: Math.max(1, Math.round((Number.isFinite(milliWidth) && milliWidth > 0
      ? milliWidth : Number.isFinite(inchWidth) && inchWidth > 0
        ? inchWidth * 1_000 : round ? diameter || width : width) / 2)),
    y: Math.max(1, Math.round((Number.isFinite(milliDepth) && milliDepth > 0
      ? milliDepth : Number.isFinite(inchDepth) && inchDepth > 0
        ? inchDepth * 1_000 : round ? diameter || depth : depth) / 2)),
  };
}

function pointDistance(left, right) {
  return Math.hypot(Number(left.xMilliInches) - Number(right.xMilliInches),
    Number(left.yMilliInches) - Number(right.yMilliInches));
}

function roundFootprint(point, radius) {
  return { shape: "round", point, radius };
}

function rectangleFootprint(point, halfWidth, halfDepth) {
  return { shape: "axis_aligned_rectangle", point, halfWidth, halfDepth };
}

function footprintGap(left, right) {
  if (left.shape === "round" && right.shape === "round") {
    return Math.max(0, pointDistance(left.point, right.point)
      - left.radius - right.radius);
  }
  if (left.shape === "axis_aligned_rectangle"
    && right.shape === "axis_aligned_rectangle") {
    const dx = Math.max(0, Math.abs(left.point.xMilliInches
      - right.point.xMilliInches) - left.halfWidth - right.halfWidth);
    const dy = Math.max(0, Math.abs(left.point.yMilliInches
      - right.point.yMilliInches) - left.halfDepth - right.halfDepth);
    return Math.hypot(dx, dy);
  }
  const circle = left.shape === "round" ? left : right;
  const rectangle = left.shape === "axis_aligned_rectangle" ? left : right;
  const dx = Math.max(0, Math.abs(circle.point.xMilliInches
    - rectangle.point.xMilliInches) - rectangle.halfWidth);
  const dy = Math.max(0, Math.abs(circle.point.yMilliInches
    - rectangle.point.yMilliInches) - rectangle.halfDepth);
  return Math.max(0, Math.hypot(dx, dy) - circle.radius);
}

function footprintForProfile(coordinate, profile) {
  if (!object(profile)) return null;
  const extent = tokenHalfExtents(profile);
  if (String(profile.baseShape || profile.shape || "round") === "square") {
    return rectangleFootprint(coordinate, extent.x, extent.y);
  }
  return roundFootprint(coordinate, Math.max(extent.x, extent.y));
}

function modelFootprint(model) {
  const point = worldPoint(model);
  const halfWidth = Math.round(Number(model?.baseWidthInches || 0) * 500);
  const halfDepth = Math.round(Number(model?.baseDepthInches
    || model?.baseWidthInches || 0) * 500);
  if (!point || halfWidth <= 0 || halfDepth <= 0) return null;
  return new Set(["square", "rectangle", "rectangular"])
    .has(String(model?.baseShape || "round").toLowerCase())
    ? rectangleFootprint(point, halfWidth, halfDepth)
    : roundFootprint(point, Math.max(halfWidth, halfDepth));
}

function existingTokenFootprint(token) {
  const point = worldPoint(token?.coordinate || token);
  if (!point) return null;
  const shape = String(token?.baseShape || "round");
  if (shape === "square") {
    const halfWidth = Math.round(Number(token.baseWidthInches || 0) * 500);
    const halfDepth = Math.round(Number(token.baseDepthInches || 0) * 500);
    return halfWidth > 0 && halfDepth > 0
      ? rectangleFootprint(point, halfWidth, halfDepth) : null;
  }
  const radius = Math.round(Number(token.baseDiameterInches
    || token.baseWidthInches || 0) * 500);
  return radius > 0 ? roundFootprint(point, radius) : null;
}

function terrainFootprint(terrain) {
  const value = terrain?.footprint || terrain;
  const minX = Number(value?.xMin ?? value?.minX);
  const maxX = Number(value?.xMax ?? value?.maxX);
  const minY = Number(value?.yMin ?? value?.minY);
  const maxY = Number(value?.yMax ?? value?.maxY);
  if (![minX, maxX, minY, maxY].every(Number.isFinite)
    || maxX <= minX || maxY <= minY) return null;
  return rectangleFootprint({
    xMilliInches: Math.round((minX + maxX) * 500),
    yMilliInches: Math.round((minY + maxY) * 500),
  }, Math.round((maxX - minX) * 500), Math.round((maxY - minY) * 500));
}

function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function normalizedName(value) {
  return String(value || "").trim().toLowerCase();
}

function targetTagsForPlacement(state, source) {
  if (source.effectKind !== "omega_network") return [];
  const template = state.officialSelectedRosterAbilitySourceBundle
    ?.omegaWormTemplate;
  return (template?.combatTags || ["ground"]).map(normalizedName);
}

function equippedWeaponProfiles(state, piece) {
  const equipped = new Set((piece?.equipment || []).map((entry) =>
    normalizedName(entry.equipmentName)));
  return (state.officialAttackProfileCatalogueV2?.profiles || [])
    .filter((profile) => profile.recordKey === piece.officialUnitRecordKey
      && equipped.has(normalizedName(profile.weaponName)))
    .map((profile) => {
      const longRange = Math.max(0, ...(profile.effects || [])
        .map((entry) => Number(entry.parameters?.maximumRangeInches || 0)));
      const normal = Number(profile.range?.normalRangeInches || 0);
      return {
        profileKey: profile.profileKey,
        weaponName: profile.weaponName,
        phase: profile.phase,
        rangeMilliInches: profile.range?.kind === "engagement"
          ? 1_000 : Math.round(Math.max(normal, longRange) * 1_000),
        targetTags: clone(profile.targetTags || []),
      };
    });
}

function currentSpeedMilliInches(state, piece) {
  const profile = state.officialActionRouteCatalogue?.units?.find((entry) =>
    entry.pieceId === piece.id)?.movementProfile;
  const speed = Number(piece.currentModels) === 1
    ? Number(profile?.singleModelSpeedInches)
    : Number(profile?.multiModelSpeedInches);
  return Number.isFinite(speed) ? Math.round(speed * 1_000) : 0;
}

function profileCanTarget(profile, targetTags) {
  const tags = new Set(targetTags);
  return (profile.targetTags || []).some((tag) => {
    const normalized = normalizedName(tag);
    return normalized === "all" || tags.has(normalized);
  });
}

function markerCoordinate(marker) {
  return worldPoint(marker?.coordinate || marker);
}

function entryEdgeUtility(state, source, placedFootprint, markers) {
  if (source.effectKind !== "omega_network") return null;
  const segments = state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer?.[source.sideKey]?.segments || [];
  const normalizedSegments = segments.map((segment) => ({
    start: worldPoint(segment.startCoordinate || segment.start),
    end: worldPoint(segment.endCoordinate || segment.end),
  })).filter((segment) => segment.start && segment.end);
  if (!placedFootprint || normalizedSegments.length < 1
    || markers.length < 1) return null;
  const objectiveComparisons = markers.map((marker) => {
    const originalEntryEdgeDistanceMilliInches = Math.round(Math.min(
      ...normalizedSegments.map((segment) => pointSegmentDistance(
        marker.coordinate, segment.start, segment.end)),
    ));
    const candidateEntryEdgeDistanceMilliInches = Math.round(footprintGap(
      placedFootprint, roundFootprint(marker.coordinate, 0)));
    return {
      markerId: marker.markerId,
      originalEntryEdgeDistanceMilliInches,
      candidateEntryEdgeDistanceMilliInches,
      approachGainMilliInches: originalEntryEdgeDistanceMilliInches
        - candidateEntryEdgeDistanceMilliInches,
    };
  }).sort((left, right) => right.approachGainMilliInches
    - left.approachGainMilliInches || left.markerId.localeCompare(
      right.markerId));
  const gains = objectiveComparisons.map((entry) =>
    entry.approachGainMilliInches);
  return {
    schemaVersion: STARCRAFT_TMG_ENTRY_EDGE_UTILITY_VERSION,
    baselineKind: "official_player_entry_edge",
    candidateKind: "omega_worm_base_entry_edge",
    originalEntryEdgeSegmentCount: normalizedSegments.length,
    maximumObjectiveApproachGainMilliInches: Math.max(...gains),
    minimumObjectiveApproachGainMilliInches: Math.min(...gains),
    improvedObjectiveCount: gains.filter((value) => value > 0).length,
    worsenedObjectiveCount: gains.filter((value) => value < 0).length,
    unchangedObjectiveCount: gains.filter((value) => value === 0).length,
    objectiveComparisons,
    pathAndFutureDeployLegalityEvaluated: false,
    precision:
      "exact_linear_base_edge_comparison;terrain_path_zone_and_future_deploy_legality_advisory",
    rulesAuthority: false,
    trainingTruth: false,
  };
}

function tacticalPlacementProjection(state, source, contract, candidate) {
  const placedFootprint = footprintForProfile(candidate.coordinate,
    contract.physicalProfile);
  const targetTags = targetTagsForPlacement(state, source);
  const unitAttackBandsAvailable = targetTags.length > 0
    && placedFootprint !== null;
  const subject = {
    kind: "hypothetical_placed_asset",
    sourceActorUnitId: source.pieceId,
    effectKind: source.effectKind,
    coordinate: clone(candidate.coordinate),
    physicalProfileAvailable: placedFootprint !== null,
    attackProjectionStatus: unitAttackBandsAvailable
      ? "advisory_unit_attack_bands" : "not_evaluated_for_this_asset_type",
    futureDeployedUnitExposureEvaluated: false,
  };
  const precision = unitAttackBandsAvailable
    ? "exact_base_edge_and_printed_range;line_of_sight_and_action_availability_advisory"
    : "exact_reference_point_geometry;base_edge_requires_physical_profile;asset_and_future_unit_attack_not_evaluated";
  const relationships = [];
  for (const enemy of (state.pieces || []).filter((entry) =>
    activePiece(entry) && entry.sideKey !== source.sideKey)) {
    const enemyFootprints = liveModelFootprints(enemy);
    if (enemyFootprints.length < 1) continue;
    const referenceDistance = Math.round(Math.min(...enemyFootprints.map((entry) =>
      footprintGap(roundFootprint(candidate.coordinate, 0), entry))));
    const distance = placedFootprint
      ? Math.round(Math.min(...enemyFootprints.map((entry) =>
        footprintGap(placedFootprint, entry)))) : null;
    const speed = currentSpeedMilliInches(state, enemy);
    const actionWindow = projectStarcraftTmgThreatActionWindowV1(state, enemy);
    const eligible = unitAttackBandsAvailable
      ? equippedWeaponProfiles(state, enemy).filter((profile) =>
        profileCanTarget(profile, targetTags)) : [];
    const stationary = eligible.filter((profile) =>
      distance <= profile.rangeMilliInches);
    const moving = eligible.filter((profile) =>
      distance <= profile.rangeMilliInches + speed);
    const attackAvailable = (profile) => profile.phase === "combat"
      ? actionWindow.combatCurrentRoundAvailable
      : actionWindow.assaultCurrentRoundAvailable;
    const currentRoundStationary = stationary.filter(attackAvailable);
    const currentRoundMoving = moving.filter((profile) =>
      actionWindow.movementCurrentRoundAvailable && attackAvailable(profile));
    const count = (rows) => unitAttackBandsAvailable ? rows.length : null;
    const keys = (rows) => unitAttackBandsAvailable
      ? rows.map((entry) => entry.profileKey) : null;
    relationships.push({
      targetId: source.effectKind === "omega_network"
        ? source.sideKey + "-omega-worm"
        : "hypothetical-asset:" + source.sideKey + ":" + source.effectKind,
      enemyUnitId: enemy.id,
      minimumBaseEdgeDistanceMilliInches: distance,
      referencePointToEnemyBaseDistanceMilliInches: referenceDistance,
      attackProjectionStatus: subject.attackProjectionStatus,
      enemyStationaryThreatProfileCount: count(stationary),
      enemyStationaryThreatProfileKeys: keys(stationary),
      enemyCurrentRoundStationaryThreatProfileCount: count(currentRoundStationary),
      enemyCurrentRoundStationaryThreatProfileKeys: keys(currentRoundStationary),
      enemyMoveThenFireProfileCount: count(moving),
      enemyMoveThenFireProfileKeys: keys(moving),
      enemyCurrentRoundMoveThenFireProfileCount: count(currentRoundMoving),
      enemyCurrentRoundMoveThenFireProfileKeys: keys(currentRoundMoving),
      enemyThreatActionWindow: actionWindow,
      enemySpeedMilliInches: speed,
      lineOfSightStatus: "not_certified_for_hypothetical_placement",
      precision,
    });
  }
  const markers = [...(state.board?.missionMarkers || []),
    ...(state.board?.markers || [])].filter((entry) => entry?.isRemoved !== true)
    .map((entry) => ({ markerId: String(entry.id || ""),
      coordinate: markerCoordinate(entry) })).filter((entry) =>
      entry.markerId && entry.coordinate).map((entry) => ({
      markerId: entry.markerId,
      coordinate: entry.coordinate,
      centerDistanceMilliInches: Math.round(pointDistance(
        candidate.coordinate, entry.coordinate)),
      baseEdgeToObjectiveCenterDistanceMilliInches: placedFootprint
        ? Math.round(footprintGap(placedFootprint,
          roundFootprint(entry.coordinate, 0))) : null,
    })).sort((left, right) => left.centerDistanceMilliInches
      - right.centerDistanceMilliInches || left.markerId.localeCompare(
        right.markerId));
  const sum = (key) => unitAttackBandsAvailable
    ? relationships.reduce((total, entry) => total + entry[key], 0) : null;
  const nearestEnemy = placedFootprint && relationships.length
    ? Math.min(...relationships.map((entry) =>
      entry.minimumBaseEdgeDistanceMilliInches)) : null;
  const marginalEntryEdgeUtility = placedFootprint
    ? entryEdgeUtility(state, source, placedFootprint, markers) : null;
  return {
    relationshipComparison: {
      subject, relationships, hypotheticalPlacement: true,
      rulesAuthority: false, trainingTruth: false,
    },
    tacticalMetrics: {
      incomingStationaryProfileCount: sum("enemyStationaryThreatProfileCount"),
      incomingMoveThenFireProfileCount: sum("enemyMoveThenFireProfileCount"),
      incomingCurrentRoundStationaryProfileCount:
        sum("enemyCurrentRoundStationaryThreatProfileCount"),
      incomingCurrentRoundMoveThenFireProfileCount:
        sum("enemyCurrentRoundMoveThenFireProfileCount"),
      nearestEnemyBaseEdgeDistanceMilliInches: nearestEnemy,
      nearestEnemyReferencePointToBaseDistanceMilliInches: relationships.length
        ? Math.min(...relationships.map((entry) =>
          entry.referencePointToEnemyBaseDistanceMilliInches)) : null,
      nearestObjectiveId: markers[0]?.markerId || null,
      nearestObjectiveCenterDistanceMilliInches:
        markers[0]?.centerDistanceMilliInches ?? null,
      objectiveDistances: markers,
      currentStationaryExposureKnown: unitAttackBandsAvailable
        && relationships.length > 0,
      attackProjectionStatus: subject.attackProjectionStatus,
      futureDeployedUnitExposureEvaluated: false,
      lineOfSightCertified: false,
      ...(marginalEntryEdgeUtility
        ? { entryEdgeUtility: marginalEntryEdgeUtility } : {}),
      precision, trainingTruth: false,
    },
  };
}

export function projectStarcraftTmgAssetPlacementMetricsV1({ state, domain,
  coordinate }) {
  const source = sourceDomain(domain);
  const contract = placementContract(source, state);
  return contract && object(coordinate)
    ? tacticalPlacementProjection(state, source, contract, { coordinate }) : null;
}

function knownMetric(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function numberOrMax(value) {
  if (value === null || value === undefined || value === "") {
    return Number.MAX_SAFE_INTEGER;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER;
}

export function selectStarcraftTmgStrategicAssetPlacementOptionsV1(
  candidates = [], maximumOptions = DEFAULT_MAX_OPTIONS, preferred = null,
) {
  if (!Array.isArray(candidates) || candidates.length < 1) return [];
  const limit = Math.max(1, Math.min(8, Number(maximumOptions)
    || DEFAULT_MAX_OPTIONS));
  const preferredDistance = (entry) => preferred
    ? pointDistance(entry.coordinate, preferred) : 0;
  const riskOrder = candidates.filter((entry) =>
    knownMetric(entry.tacticalMetrics?.incomingStationaryProfileCount)
      && knownMetric(entry.tacticalMetrics?.incomingMoveThenFireProfileCount))
    .sort((left, right) =>
    numberOrMax(left.tacticalMetrics?.incomingStationaryProfileCount)
      - numberOrMax(right.tacticalMetrics?.incomingStationaryProfileCount)
    || numberOrMax(left.tacticalMetrics?.incomingMoveThenFireProfileCount)
      - numberOrMax(right.tacticalMetrics?.incomingMoveThenFireProfileCount)
    || numberOrMax(right.tacticalMetrics?.nearestEnemyBaseEdgeDistanceMilliInches)
      - numberOrMax(left.tacticalMetrics?.nearestEnemyBaseEdgeDistanceMilliInches)
    || preferredDistance(left) - preferredDistance(right)
    || left.placementOptionId.localeCompare(right.placementOptionId));
  const anchorOrder = [...candidates].sort((left, right) =>
    preferredDistance(left) - preferredDistance(right)
      || left.placementOptionId.localeCompare(right.placementOptionId));
  const objectiveOrder = candidates.filter((entry) =>
    knownMetric(entry.tacticalMetrics?.nearestObjectiveCenterDistanceMilliInches))
    .sort((left, right) =>
    numberOrMax(left.tacticalMetrics?.nearestObjectiveCenterDistanceMilliInches)
      - numberOrMax(right.tacticalMetrics
        ?.nearestObjectiveCenterDistanceMilliInches)
    || left.placementOptionId.localeCompare(right.placementOptionId));
  const entryEdgeGainOrder = [...candidates].filter((entry) =>
    Number.isFinite(Number(entry.tacticalMetrics?.entryEdgeUtility
      ?.maximumObjectiveApproachGainMilliInches))).sort((left, right) =>
    Number(right.tacticalMetrics.entryEdgeUtility
      .maximumObjectiveApproachGainMilliInches)
      - Number(left.tacticalMetrics.entryEdgeUtility
        .maximumObjectiveApproachGainMilliInches)
    || Number(right.tacticalMetrics.entryEdgeUtility.improvedObjectiveCount)
      - Number(left.tacticalMetrics.entryEdgeUtility.improvedObjectiveCount)
    || preferredDistance(left) - preferredDistance(right)
    || left.placementOptionId.localeCompare(right.placementOptionId));
  const minimumCurrentFireCount = Math.min(...candidates.map((entry) =>
    numberOrMax(entry.tacticalMetrics
      ?.incomingCurrentRoundStationaryProfileCount)
      + numberOrMax(entry.tacticalMetrics
        ?.incomingCurrentRoundMoveThenFireProfileCount)));
  const boundedSafeEntryGainOrder = entryEdgeGainOrder.filter((entry) =>
    numberOrMax(entry.tacticalMetrics
      ?.incomingCurrentRoundStationaryProfileCount)
      + numberOrMax(entry.tacticalMetrics
        ?.incomingCurrentRoundMoveThenFireProfileCount)
      === minimumCurrentFireCount);
  const selected = [];
  const selectedIds = new Set();
  const add = (entry, facet) => {
    if (!entry || selected.length >= limit
      || selectedIds.has(entry.placementOptionId)) return;
    selectedIds.add(entry.placementOptionId);
    selected.push({ ...entry, selectionFacet: facet });
  };
  add(riskOrder[0], "lowest_projected_incoming_fire");
  add(boundedSafeEntryGainOrder[0],
    "largest_observed_entry_edge_gain_at_minimum_current_fire");
  add(entryEdgeGainOrder[0],
    "largest_observed_entry_edge_approach_gain");
  add(anchorOrder[0], "closest_to_preferred_anchor");
  add(objectiveOrder[0], "closest_to_objective");
  for (const entry of riskOrder) add(entry, "risk_ordered_alternative");
  for (const entry of anchorOrder) add(entry,
    "geometry_only_alternative_threat_not_evaluated");
  return selected;
}

function omegaIncomingRiskProjection(state, source, option, estimateCache) {
  if (source.effectKind !== "omega_network") return null;
  try {
    const projected = clone(state);
    const worm = projectOfficialOmegaWormPieceV1(
      projected, source.sideKey, option.coordinate);
    projected.pieces.push(worm);
    const enemyIds = projected.pieces.filter((piece) =>
      activePiece(piece) && piece.sideKey !== source.sideKey)
      .map((piece) => piece.id).sort();
    const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
      state: projected,
      seatKey: source.sideKey,
      hypotheticalProjection: true,
      request: {
        intent: "estimate incoming stationary fire against a hypothetical Omega Worm placement",
        subjectUnitIds: [worm.id],
        targetIds: enemyIds,
        maximumRelations: Math.max(16, enemyIds.length * 2),
        knownMinimumOpponentGapMilliInchesExclusive: 10_000,
      },
    });
    const attackSetKey = hashStarcraftTmgContract((graph.relationships || [])
      .filter((entry) => entry.fromUnitId === worm.id)
      .map((entry) => ({
        enemyUnitId: entry.toUnitId,
        currentRoundStationaryProfileKeys: clone(entry.threats?.toFrom
          ?.currentRoundStationaryProfileKeys || []),
      })).sort((left, right) => left.enemyUnitId.localeCompare(
        right.enemyUnitId)));
    let incomingStationaryFireEstimate = estimateCache.get(attackSetKey);
    const reusedEstimate = Boolean(incomingStationaryFireEstimate);
    if (!incomingStationaryFireEstimate) {
      incomingStationaryFireEstimate =
        projectStarcraftTmgIncomingStationaryFireEstimateV1(
          projected, worm.id, graph, { sampleBudget: 36 });
      estimateCache.set(attackSetKey, clone(incomingStationaryFireEstimate));
    }
    return {
      schemaVersion: STARCRAFT_TMG_OMEGA_RISK_PROJECTION_VERSION,
      hypotheticalUnitId: worm.id,
      hypotheticalCoordinate: clone(option.coordinate),
      incomingStationaryFireEstimate: clone(incomingStationaryFireEstimate),
      incomingEstimateCacheKey: attackSetKey,
      incomingEstimateReused: reusedEstimate,
      synchronousSampleBudgetPerUniqueAttackSet: 36,
      higherPrecisionCounterfactualMayRunAsynchronously: true,
      relationshipGraphHash: graph.relationshipGraphHash,
      lineOfSightEvaluatedByRelationshipGraph: true,
      mutationAuthority: false,
      trainingTruth: false,
    };
  } catch (error) {
    return {
      schemaVersion: STARCRAFT_TMG_OMEGA_RISK_PROJECTION_VERSION,
      status: "unknown",
      reason: String(error?.code || error?.message || error).split(":")[0],
      mutationAuthority: false,
      trainingTruth: false,
    };
  }
}

function liveModelFootprints(piece) {
  return (piece?.models || [])
    .filter((model) => model?.isDestroyed !== true && model?.isOnField !== false)
    .map(modelFootprint).filter(Boolean);
}

function pointSegmentDistance(point, startValue, endValue) {
  const start = worldPoint(startValue);
  const end = worldPoint(endValue);
  if (!start || !end) return Number.POSITIVE_INFINITY;
  const dx = end.xMilliInches - start.xMilliInches;
  const dy = end.yMilliInches - start.yMilliInches;
  if (dx === 0 && dy === 0) return pointDistance(point, start);
  const ratio = Math.max(0, Math.min(1,
    (((point.xMilliInches - start.xMilliInches) * dx)
      + ((point.yMilliInches - start.yMilliInches) * dy))
      / ((dx * dx) + (dy * dy))));
  return pointDistance(point, {
    xMilliInches: start.xMilliInches + (ratio * dx),
    yMilliInches: start.yMilliInches + (ratio * dy),
  });
}

function candidatePrefilterFailure(state, source, contract, candidate) {
  const footprint = footprintForProfile(candidate.coordinate,
    contract.physicalProfile);
  if (!footprint) return null;
  const width = Number(state.board?.widthInches) * 1_000;
  const height = Number(state.board?.heightInches) * 1_000;
  const halfWidth = footprint.shape === "round"
    ? footprint.radius : footprint.halfWidth;
  const halfDepth = footprint.shape === "round"
    ? footprint.radius : footprint.halfDepth;
  if (footprint.point.xMilliInches - halfWidth < 0
    || footprint.point.yMilliInches - halfDepth < 0
    || footprint.point.xMilliInches + halfWidth > width
    || footprint.point.yMilliInches + halfDepth > height) {
    return "BATTLEFIELD_ASSET_FULL_BASE_OUTSIDE_BATTLEFIELD";
  }
  if (["creep_token_place", "force_field_place", "shade_token_place",
    "spawn_creep_tumor"]
    .includes(source.effectKind)) {
    // Contact abilities require a zero parent gap. footprintGap deliberately
    // clamps penetration and contact to zero, so it cannot reject collisions
    // for this manifold. The unchanged lifecycle Rules own contact tolerance
    // AND collisions with every parent/other model/token for each survivor.
    if (!contract.parentBaseContactRequired) {
      for (const piece of (state.pieces || []).filter(activePiece)) {
        if (liveModelFootprints(piece).some((entry) =>
          footprintGap(footprint, entry) < 1)) {
          return "BATTLEFIELD_ASSET_TOKEN_OVERLAPS_MODEL";
        }
      }
      for (const token of state.board?.tokens || []) {
        if (token?.isRemoved === true) continue;
        const other = existingTokenFootprint(token);
        if (other && footprintGap(footprint, other) < 1) {
          return "BATTLEFIELD_ASSET_TOKEN_OVERLAPS_TOKEN";
        }
      }
    }
    for (const terrain of state.board?.terrain || []) {
      if (terrain?.isRemoved === true || terrain?.blocksPlacement === false) continue;
      const other = terrainFootprint(terrain);
      if (other && footprintGap(footprint, other) < 1) {
        return "BATTLEFIELD_ASSET_TOKEN_OVERLAPS_TERRAIN";
      }
    }
  }
  const range = Number(source.constraints?.geometry?.rangeInches) * 1_000;
  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  if (source.effectKind === "creep_token_place" && Number.isFinite(range)) {
    const segments = state.officialDeploymentGeometryBinding
      ?.entryEdgesByPlayer?.[source.sideKey]?.segments || [];
    const extent = footprint.shape === "round" ? footprint.radius
      : Math.hypot(footprint.halfWidth, footprint.halfDepth);
    const entryWithin = segments.some((segment) => Math.max(0,
      pointSegmentDistance(footprint.point, segment.startCoordinate,
        segment.endCoordinate) - extent) <= range + 1);
    const bindingByAssetId = new Map((state.officialBattlefieldAssetBindings || [])
      .map((entry) => [String(entry.assetId || ""), entry]));
    const tumorWithin = (state.board?.tokens || []).some((token) => {
      if (token?.isRemoved === true) return false;
      const binding = bindingByAssetId.get(String(token.tokenId || token.id || ""));
      const other = existingTokenFootprint(token);
      return binding?.sideKey === source.sideKey
        && binding?.assetKind === "creep_tumor" && other
        && footprintGap(footprint, other) <= range + 1;
    });
    if (!entryWithin && !tumorWithin) {
      return "BATTLEFIELD_ASSET_CREEP_SOURCE_RANGE_REQUIRED";
    }
  }
  if (source.effectKind === "force_field_place" && actor
    && Number.isFinite(range)
    && !liveModelFootprints(actor).some((entry) =>
      footprintGap(footprint, entry) <= range + 1)) {
    return "BATTLEFIELD_ASSET_FORCE_FIELD_RANGE_REQUIRED";
  }
  if (source.effectKind === "shade_token_place" && actor
    && footprint.shape === "round" && Number.isFinite(range)
    && !liveModelFootprints(actor).some((entry) =>
      pointDistance(footprint.point, entry.point) - entry.radius
        + footprint.radius <= range + 1)) {
    return "BATTLEFIELD_ASSET_SHADE_WHOLE_BASE_RANGE_REQUIRED";
  }
  return null;
}

function placementKind(source) {
  if (source.actionType === "resolve_battlefield_asset_ability"
    && source.parameterSchema?.coordinate?.type
      === "world_point_milli_inches") {
    return "coordinate";
  }
  if (source.actionType === "resolve_unit_lifecycle_ability"
    && source.effectKind === "spawn_creep_tumor"
    && source.parameterSchema?.coordinate?.type === "world_point_milli_inches") {
    return "parent_contact_coordinate";
  }
  if (source.actionType === "use_active_ability"
    && source.effectKind === "omega_network"
    && object(source.parameterSchema?.groundPoint)
    && source.parameterSchema.required?.includes("xMilliInches")
    && source.parameterSchema.required?.includes("yMilliInches")) {
    return "ground_point";
  }
  return null;
}

export function isStarcraftTmgAssetPlacementDomainV1(domain) {
  const source = sourceDomain(domain);
  return object(source) && placementKind(source) !== null;
}

function placementContract(source, state) {
  const kind = placementKind(source);
  if (kind === "parent_contact_coordinate") {
    return { kind: "coordinate", parentBaseContactRequired: true,
      physicalProfile: getOfficialBattlefieldAssetComponentFootprintV1(
        state.officialBattlefieldAssetComponentProfile, "creep_tumor") };
  }
  if (kind === "coordinate") return { kind,
    physicalProfile: source.constraints?.physicalTokenProfile };
  if (kind === "ground_point") return { kind,
    physicalProfile: source.parameterSchema.groundPoint };
  return null;
}

function worldPoint(value) {
  if (!object(value)) return null;
  if (Number.isFinite(Number(value.xMilliInches))
    && Number.isFinite(Number(value.yMilliInches))) {
    return { xMilliInches: Math.round(Number(value.xMilliInches)),
      yMilliInches: Math.round(Number(value.yMilliInches)) };
  }
  if (Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) {
    return { xMilliInches: Math.round(Number(value.x) * 1_000),
      yMilliInches: Math.round(Number(value.y) * 1_000) };
  }
  if (Number.isFinite(Number(value.xInches))
    && Number.isFinite(Number(value.yInches))) {
    return { xMilliInches: Math.round(Number(value.xInches) * 1_000),
      yMilliInches: Math.round(Number(value.yInches) * 1_000) };
  }
  return null;
}

function payments(domain) {
  const rowsByChoice = domain.parameterSchema?.paymentCardInstanceIdsByChoice;
  const rows = Array.isArray(rowsByChoice?.default)
    ? rowsByChoice.default
    : object(rowsByChoice) ? Object.values(rowsByChoice).flat() : [];
  const direct = domain.parameterSchema?.paymentCardInstanceIds?.enum;
  const first = rows.find(Array.isArray)
    || (Array.isArray(direct) ? direct.find(Array.isArray) : null);
  return first ? [...new Set(first.map(String))].sort() : [];
}

function preferredAnchor(request, width, height) {
  const supplied = worldPoint(request?.preferredAnchor);
  return supplied || {
    xMilliInches: Math.round(width / 2),
    yMilliInches: Math.round(height / 2),
  };
}

function candidateGenerator(state, domain, request, contract) {
  const source = sourceDomain(domain);
  const width = Math.round(Number(state.board?.widthInches || 0) * 1_000);
  const height = Math.round(Number(state.board?.heightInches || 0) * 1_000);
  if (width <= 0 || height <= 0) {
    throw new TypeError("LEGAL_ASSET_PLACEMENT_BATTLEFIELD_INVALID");
  }
  const physicalTokenProfile = contract.physicalProfile;
  const extent = tokenHalfExtents(physicalTokenProfile);
  const preferred = preferredAnchor(request, width, height);
  const candidates = new Map();
  const add = (point, sourceCandidateKind) => {
    const coordinate = worldPoint(point);
    if (!coordinate) return;
    const key = `${coordinate.xMilliInches}:${coordinate.yMilliInches}`;
    if (!candidates.has(key)) candidates.set(key, { coordinate,
      sourceCandidateKind });
  };
  const ring = (anchor, distances, sourceCandidateKind) => {
    for (const distance of distances) {
      if (distance === 0) add(anchor, sourceCandidateKind);
      else for (const direction of DIRECTIONS) add({
        xMilliInches: anchor.xMilliInches + (direction.x * distance),
        yMilliInches: anchor.yMilliInches + (direction.y * distance),
      }, sourceCandidateKind);
    }
  };

  if (contract.parentBaseContactRequired) {
    // This ability's legal manifold is contact with the parent, not a board
    // lattice or Creep Spread's entry-edge range. Preserve the requested
    // strategic anchor, but solve actual token centers on that contact ring.
    const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
    const tokenRadius = Number(physicalTokenProfile.baseDiameterMm) / 25.4 * 500;
    for (const model of actor?.models || []) {
      if (model.isDestroyed === true || model.isOnField === false) continue;
      const point = worldPoint(model);
      if (!point) continue;
      const parentRadius = Math.max(Number(model.baseWidthInches),
        Number(model.baseDepthInches)) * 500;
      const distance = parentRadius + tokenRadius;
      const preferredDistance = pointDistance(point, preferred);
      if (preferredDistance > 0) add({
        xMilliInches: point.xMilliInches
          + (preferred.xMilliInches - point.xMilliInches) * distance / preferredDistance,
        yMilliInches: point.yMilliInches
          + (preferred.yMilliInches - point.yMilliInches) * distance / preferredDistance,
      }, "parent_base_contact_toward_preferred_anchor");
      ring(point, [distance], "parent_base_contact_ring");
    }
    return { candidates: [...candidates.values()], preferred, width, height,
      extent, physicalTokenProfileAvailable: true };
  }

  ring(preferred, [0, 1_500, 3_000, 6_000], "preferred_anchor_neighborhood");

  const entrySegments = state.officialDeploymentGeometryBinding
    ?.entryEdgesByPlayer?.[source.sideKey]?.segments || [];
  const fallbackSegments = [
    { startCoordinate: { x: 0, y: 0 }, endCoordinate: { x: width / 1_000, y: 0 } },
    { startCoordinate: { x: 0, y: height / 1_000 },
      endCoordinate: { x: width / 1_000, y: height / 1_000 } },
    { startCoordinate: { x: 0, y: 0 }, endCoordinate: { x: 0, y: height / 1_000 } },
    { startCoordinate: { x: width / 1_000, y: 0 },
      endCoordinate: { x: width / 1_000, y: height / 1_000 } },
  ];
  for (const segment of entrySegments.length ? entrySegments : fallbackSegments) {
    const start = worldPoint(segment.startCoordinate || segment.start);
    const end = worldPoint(segment.endCoordinate || segment.end);
    if (!start || !end) continue;
    const dx = end.xMilliInches - start.xMilliInches;
    const dy = end.yMilliInches - start.yMilliInches;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;
    const normal = { x: -dy / length, y: dx / length };
    for (let index = 0; index <= 24; index += 1) {
      const ratio = index / 24;
      const base = { xMilliInches: start.xMilliInches + (dx * ratio),
        yMilliInches: start.yMilliInches + (dy * ratio) };
      for (const distance of [Math.max(extent.x, extent.y) + 25,
        1_500, 3_000, 5_500]) {
        for (const sign of [-1, 1]) add({
          xMilliInches: base.xMilliInches + (normal.x * distance * sign),
          yMilliInches: base.yMilliInches + (normal.y * distance * sign),
        }, "friendly_entry_edge");
      }
    }
  }

  const actor = (state.pieces || []).find((entry) => entry.id === source.pieceId);
  for (const model of actor?.models || []) {
    if (model?.isDestroyed === true || model?.isOnField === false) continue;
    const point = worldPoint(model);
    if (!point) continue;
    const modelRadius = Math.round(Math.max(Number(model.baseWidthInches || 0),
      Number(model.baseDepthInches || model.baseWidthInches || 0)) * 500);
    ring(point, [modelRadius + Math.max(extent.x, extent.y) + 25,
      2_000, 4_000, 6_000, 8_000, 12_000], "active_unit_neighborhood");
  }

  for (const token of state.board?.tokens || []) {
    if (token?.isRemoved === true) continue;
    const point = worldPoint(token.coordinate || token);
    if (point) ring(point, [1_250, 3_000, 6_000],
      "existing_battlefield_asset_neighborhood");
  }
  for (const marker of [...(state.board?.missionMarkers || []),
    ...(state.board?.markers || []), ...(state.board?.effectMarkers || [])]) {
    const point = worldPoint(marker.coordinate || marker);
    if (point) ring(point, [0, 1_500, 3_000], "objective_or_marker_neighborhood");
  }

  const step = 2_000;
  for (let y = extent.y; y <= height - extent.y; y += step) {
    for (let x = extent.x; x <= width - extent.x; x += step) {
      add({ xMilliInches: x, yMilliInches: y }, "bounded_battlefield_lattice");
    }
  }
  return { candidates: [...candidates.values()], preferred, width, height,
    extent, physicalTokenProfileAvailable: object(physicalTokenProfile) };
}

export function searchStarcraftTmgLegalAssetPlacementOptionsV1(input = {}) {
  const domain = input.domain;
  const source = sourceDomain(domain);
  let state = input.state;
  const instantiate = input.instantiate;
  const request = object(input.request) ? input.request : {};
  if (!object(state) || !object(domain) || !object(source?.parameterSchema)
    || typeof instantiate !== "function") {
    throw new TypeError("LEGAL_ASSET_PLACEMENT_SEARCH_INPUT_INVALID");
  }
  // All candidates belong to this one read-only query. Own the complete state
  // once so native source validators can reuse immutable verified data without
  // trusting/fixing/freezing the caller's mutable Room aggregate or old results.
  state = createOwnedOfficialBattlefieldAssetInstantiationStateV1(state);
  const contract = placementContract(source, state);
  if (!contract) {
    throw new TypeError("LEGAL_ASSET_PLACEMENT_DOMAIN_UNSUPPORTED");
  }
  const requestedOptions = Number(request.maximumOptions
    ?? DEFAULT_MAX_OPTIONS);
  const maximumOptions = Number.isSafeInteger(requestedOptions)
    ? Math.max(1, Math.min(8, requestedOptions)) : DEFAULT_MAX_OPTIONS;
  const requestedAttempts = Number(request.maximumCandidateAttempts
    ?? DEFAULT_MAX_ATTEMPTS);
  const maximumCandidateAttempts = Number.isSafeInteger(requestedAttempts)
    ? Math.max(1, Math.min(20_000, requestedAttempts)) : DEFAULT_MAX_ATTEMPTS;
  const generated = candidateGenerator(state, source, request, contract);
  const baseParameters = {
    activeUnitId: String(source.parameterSchema.activeUnitId?.const
      || source.pieceId),
    paymentCardInstanceIds: payments(source),
  };
  const candidatePool = [];
  const failureCounts = new Map();
  let attemptedCandidateCount = 0;
  let prefilteredCandidateCount = 0;
  let instantiatedCandidateCount = 0;
  for (const candidate of generated.candidates) {
    if (attemptedCandidateCount >= maximumCandidateAttempts
      || candidatePool.length >= DEFAULT_STRATEGIC_CANDIDATE_POOL) break;
    attemptedCandidateCount += 1;
    const prefilterFailure = candidatePrefilterFailure(
      state, source, contract, candidate);
    if (prefilterFailure) {
      prefilteredCandidateCount += 1;
      failureCounts.set(prefilterFailure,
        Number(failureCounts.get(prefilterFailure) || 0) + 1);
      continue;
    }
    const parameters = contract.kind === "coordinate"
      ? { ...clone(baseParameters), coordinate: clone(candidate.coordinate) }
      : { ...clone(baseParameters),
        xMilliInches: candidate.coordinate.xMilliInches,
        yMilliInches: candidate.coordinate.yMilliInches };
    try {
      instantiatedCandidateCount += 1;
      const instantiated = instantiate(state, domain, parameters,
        clone(input.instantiateOptions || {}));
      const canonicalParameters = clone(instantiated.canonicalParameters);
      const coordinate = object(canonicalParameters?.coordinate)
        ? canonicalParameters.coordinate : canonicalParameters?.placement;
      if (!object(coordinate)) continue;
      const optionCore = {
        domainId: domain.domainId,
        actionType: source.actionType,
        pieceId: source.pieceId,
        effectKind: source.effectKind || null,
        coordinate: clone(coordinate),
        canonicalParameters,
        actionHash: hashStarcraftTmgContract(instantiated.action),
        sourceCandidateKind: candidate.sourceCandidateKind,
        exactRulesInstantiationPassed: true,
        rulesAuthority: true,
        trainingTruth: false,
      };
      const tactical = projectStarcraftTmgAssetPlacementMetricsV1({
        state, domain, coordinate: candidate.coordinate,
      }) || {};
      candidatePool.push({ ...optionCore,
        placementOptionId: hashStarcraftTmgContract(optionCore),
        relationshipComparison: clone(tactical.relationshipComparison || null),
        tacticalMetrics: clone(tactical.tacticalMetrics || null) });
    } catch (error) {
      const code = String(error?.code || error?.message || error)
        .split(":")[0];
      failureCounts.set(code, Number(failureCounts.get(code) || 0) + 1);
    }
  }
  const selectedOptions = selectStarcraftTmgStrategicAssetPlacementOptionsV1(
    candidatePool, maximumOptions, generated.preferred);
  const omegaEstimateCache = new Map();
  const options = selectedOptions.map((option) => {
    const riskProjection = omegaIncomingRiskProjection(
      state, source, option, omegaEstimateCache);
    return riskProjection ? {
      ...option,
      tacticalMetrics: {
        ...clone(option.tacticalMetrics || {}),
        omegaIncomingRiskProjection: riskProjection,
      },
    } : option;
  });
  return freeze({
    schemaVersion: STARCRAFT_TMG_LEGAL_ASSET_PLACEMENT_SEARCH_VERSION,
    domainId: domain.domainId,
    actionType: source.actionType,
    pieceId: source.pieceId,
    effectKind: source.effectKind || null,
    preferredAnchor: generated.preferred,
    physicalTokenHalfExtentsMilliInches: generated.extent,
    physicalTokenProfileAvailable: generated.physicalTokenProfileAvailable,
    missingPhysicalProfileHandledByExactRulesFiltering:
      !generated.physicalTokenProfileAvailable,
    placementOptions: options,
    optionCount: options.length,
    attemptedCandidateCount,
    prefilteredCandidateCount,
    instantiatedCandidateCount,
    searchCoverage: {
      generatedCandidateCount: generated.candidates.length,
      exactInstantiationCount: instantiatedCandidateCount,
      maximumCandidateAttempts,
      maximumOptions,
      strategicCandidatePoolCount: candidatePool.length,
      candidateGenerationDeterministic: true,
      cheapGeometryPrefilterOnlyRejects: true,
      everySurvivorStillRequiresExactRulesInstantiation: true,
      strategyRequestOrOptionBudgetReducedForPerformance: false,
      betterOptionMayExist:
        attemptedCandidateCount < generated.candidates.length,
      returnedMaximumMeansObservedBoundedCandidatePoolOnly: true,
      globalContinuousMaximumCertified: false,
      returnedOptionsAreStrategicallyDiverse: true,
      minimumCurrentFireEntryGainFrontierIncluded:
        source.effectKind === "omega_network",
      preferredAnchorOrderDoesNotExcludeLowerThreatOptions: true,
      omegaEntryEdgeMarginalUtilityComparedWhenAvailable:
        source.effectKind === "omega_network",
    },
    failureCounts: Object.fromEntries([...failureCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))),
    continuousDomainNotExhaustivelyEnumerated: true,
    boundedCandidateSearch: true,
    selectionContract: {
      chooseExactlyOnePlacementOption: true,
      everyReturnedOptionPassedCurrentRulesInstantiation: true,
      selectedOptionRequiresPublicReason: true,
      hostReinstantiatesSelectedOptionBeforeApply: true,
      handWrittenReplacementCoordinateForbidden: true,
      prefilterNeverCertifiesLegality: true,
      hiddenChainOfThoughtRequested: false,
      omegaEntryEdgeUtilityIsAdvisoryNotSelectionAuthority:
        source.effectKind === "omega_network",
      omegaIncomingRiskProjectionIsAdvisoryNotSelectionAuthority:
        source.effectKind === "omega_network",
    },
    rulesAuthority: options.length > 0,
    mutationAuthority: false,
    trainingTruth: false,
  });
}
