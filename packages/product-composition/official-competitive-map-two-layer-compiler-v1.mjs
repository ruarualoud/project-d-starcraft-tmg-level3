import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  certifyOfficialBalancedTerrainSetupV1,
  OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
  verifyOfficialBalancedTerrainSetupCertificateV1,
} from "../rule-atoms/official-balanced-terrain-rules-kernel-v1.mjs";
import { verifyOfficialDeploymentGeometryBindingV1 } from
  "../rule-atoms/official-deployment-geometry-rules-kernel-v1.mjs";
import {
  createOfficialCompetitiveMapTabletopAdapterCatalogueV1,
  getOfficialCompetitiveMapTabletopAdapterV1,
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1,
} from "./official-competitive-map-tabletop-adapter-v1.mjs";
import {
  auditOfficialCompetitiveMapSpatialReachabilityV1,
  verifyOfficialCompetitiveMapSpatialReachabilityV1,
} from "./official-competitive-map-spatial-reachability-v1.mjs";

export const OFFICIAL_COMPETITIVE_MAP_TWO_LAYER_COMPILATION_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_two_layer_compilation_v1";
export const OFFICIAL_COMPETITIVE_MAP_ROOM_FREEZE_V1_SCHEMA =
  "starcraft_tmg_official_competitive_map_room_freeze_v1";

const RULES_DISPOSITIONS = new Set(["auto", "enabled", "disabled"]);
const ART_DISPOSITIONS = new Set(["retain", "hide"]);
const PASSAGE_MODES = new Set([
  "preserve_source_clearance", "widen_all_current_bases",
]);
const OFFICIAL_TARGETS = Object.freeze({
  Skirmish: Object.freeze({ total: 7, size1: 2, size2: 4,
    size3Plus: 1, grass: 3 }),
  Standard: Object.freeze({ total: 9, size1: 2, size2: 6,
    size3Plus: 1, grass: 4 }),
  "Grand Offensive": Object.freeze({ total: 13, size1: 3, size2: 8,
    size3Plus: 2, grass: 6 }),
});
const QUADRANTS = Object.freeze([
  "south_west", "south_east", "north_west", "north_east",
]);
const TOLERANCE = 0.001;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function clone(value) { return structuredClone(value); }
function fixed(value) { return Number(Number(value).toFixed(3)); }
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) { return { ...body, [field]: hashStarcraftTmgContract(body) }; }

function modeProfile(mode) {
  if (mode === "cover" || mode === "passable_difficult") {
    return { category: "size1", size: 1, terrainKind: "ordinary",
      heightTier: "ground_level", standableHorizontalSurface: false };
  }
  if (mode === "grass_sight") {
    return { category: "grass", size: 2, terrainKind: "grass",
      heightTier: "ground_level", standableHorizontalSurface: false };
  }
  if (mode === "blocking") {
    return { category: "size2", size: 2, terrainKind: "impassable",
      heightTier: "ground_level", standableHorizontalSurface: false };
  }
  if (mode === "standable_high_ground") {
    return { category: "size3Plus", size: 3, terrainKind: "ordinary",
      heightTier: "high_ground", standableHorizontalSurface: true };
  }
  if (mode === "visual_only") return null;
  fail("COMPETITIVE_MAP_RULES_MODE_UNKNOWN", String(mode || ""));
}

function normalizeSelections(adapter, rawSelections = []) {
  if (!Array.isArray(rawSelections)) fail("COMPETITIVE_MAP_SELECTIONS_INVALID");
  const elementById = new Map(adapter.elements.map((entry) => [entry.elementId, entry]));
  const supplied = new Map();
  for (const raw of rawSelections) {
    const elementId = String(raw?.elementId || "").trim();
    const element = elementById.get(elementId);
    if (!element || supplied.has(elementId)) {
      fail("COMPETITIVE_MAP_ELEMENT_SELECTION_INVALID", elementId);
    }
    const artDisposition = String(raw.artDisposition || "retain");
    const rulesDisposition = String(raw.rulesDisposition || "auto");
    const rulesMode = String(raw.rulesMode || element.recommendedRulesMode);
    if (!ART_DISPOSITIONS.has(artDisposition)
      || !RULES_DISPOSITIONS.has(rulesDisposition)
      || !element.allowedRulesModes.includes(rulesMode)) {
      fail("COMPETITIVE_MAP_ELEMENT_SELECTION_INVALID", elementId);
    }
    supplied.set(elementId, { artDisposition, rulesDisposition, rulesMode });
  }
  return adapter.elements.map((element) => {
    const selected = supplied.get(element.elementId) || {
      artDisposition: element.artRetainByDefault ? "retain" : "hide",
      rulesDisposition: "auto", rulesMode: element.recommendedRulesMode,
    };
    return { elementId: element.elementId, sourceGroupId: element.sourceGroupId,
      artDisposition: selected.artDisposition,
      rulesDisposition: selected.rulesDisposition,
      selectedRulesMode: selected.rulesMode,
      selectionOrigin: supplied.has(element.elementId) ? "user" : "default",
      allowedRulesModes: [...element.allowedRulesModes] };
  });
}

function normalizePassageSelections(adapter, rawSelections = []) {
  if (!Array.isArray(rawSelections)) {
    fail("COMPETITIVE_MAP_PASSAGE_SELECTIONS_INVALID");
  }
  const laneById = new Map(adapter.lanes.map((entry) => [entry.laneId, entry]));
  const supplied = new Map();
  for (const raw of rawSelections) {
    const laneId = String(raw?.laneId || "").trim();
    const lane = laneById.get(laneId);
    const passageMode = String(raw?.passageMode || "").trim();
    if (!lane || supplied.has(laneId) || !PASSAGE_MODES.has(passageMode)
      || !lane.availablePassageModes.includes(passageMode)) {
      fail("COMPETITIVE_MAP_PASSAGE_SELECTION_INVALID", laneId);
    }
    supplied.set(laneId, passageMode);
  }
  return adapter.lanes.map((lane) => ({
    laneId: lane.laneId,
    selectedPassageMode: supplied.get(lane.laneId)
      || lane.defaultPassageMode,
    selectionOrigin: supplied.has(lane.laneId) ? "user" : "default",
    availablePassageModes: [...lane.availablePassageModes],
    displayLayerOnly: false,
    rulesGeometryEffect: true,
  }));
}

function sourceCandidate(adapter, selection) {
  const element = adapter.elements.find((entry) => entry.elementId
    === selection.elementId);
  const profile = modeProfile(selection.selectedRulesMode);
  return profile ? { sourceType: "classic_map_element",
    sourceElementId: element.elementId, sourceGroupId: element.sourceGroupId,
    sourceFeature: element.sourceFeature, selectedRulesMode: selection.selectedRulesMode,
    profile, sourceCentre: clone(element.artFootprint.centre),
    sourceRulesFootprint: clone(element.candidateRulesFootprint),
    rulesSelectionOrigin: selection.selectionOrigin,
    rulesDisposition: selection.rulesDisposition } : null;
}

function compileRuleMembership(adapter, selections, targets) {
  const selected = [];
  const auto = [];
  for (const selection of selections) {
    if (selection.rulesDisposition === "disabled") continue;
    const candidate = sourceCandidate(adapter, selection);
    if (!candidate) continue;
    if (selection.rulesDisposition === "enabled") selected.push(candidate);
    else auto.push(candidate);
  }
  const countCategory = (category) => selected.filter((entry) => (
    entry.profile.category === category)).length;
  for (const category of ["size3Plus", "grass", "size2", "size1"]) {
    const target = category === "size2" ? targets.size2 - targets.grass
      : targets[category];
    const categoryRows = auto.filter((entry) => entry.profile.category === category)
      .sort((left, right) => Number(right.rulesSelectionOrigin === "user")
        - Number(left.rulesSelectionOrigin === "user")
        || left.sourceElementId.localeCompare(right.sourceElementId));
    const open = Math.max(0, target - countCategory(category));
    selected.push(...categoryRows.slice(0, open));
  }
  const compensating = [];
  const addCompensation = (category, count) => {
    for (let index = 0; index < count; index += 1) {
      const mode = category === "grass" ? "grass_sight"
        : category === "size3Plus" ? "standable_high_ground"
          : category === "size1" ? "cover" : "blocking";
      compensating.push({ sourceType: "neutral_tmg_compensation",
        sourceElementId: null, sourceGroupId: null,
        sourceFeature: `neutral ${category} balance compensation`,
        selectedRulesMode: mode, profile: modeProfile(mode), sourceCentre: null,
        sourceRulesFootprint: null, rulesSelectionOrigin: "compiler_compensation",
        rulesDisposition: "enabled", compensationOrdinal: index + 1 });
    }
  };
  addCompensation("size3Plus", Math.max(0, targets.size3Plus
    - countCategory("size3Plus")));
  addCompensation("grass", Math.max(0, targets.grass - countCategory("grass")));
  addCompensation("size2", Math.max(0, targets.size2 - targets.grass
    - countCategory("size2")));
  addCompensation("size1", Math.max(0, targets.size1 - countCategory("size1")));
  return { rows: [...selected, ...compensating], compensating };
}

function deterministicOffset(seedId, ordinal, axis) {
  const hash = hashStarcraftTmgContract({ seedId, ordinal, axis });
  return (Number.parseInt(hash.slice(0, 6), 16) / 0xffffff - 0.5) * 0.012;
}

function slotsFor(category, battlefield, count, seedId) {
  const width = battlefield.widthInches;
  const height = battlefield.heightInches;
  const sizeOneSlots = count >= 3 ? [
    [0.43, 0.19, 1, 1, "south_light_cover"],
    [0.57, 0.81, 1, 1, "north_light_cover"],
    [0.5, 0.28, 1, 1, "south_centre_light_cover"],
    [0.5, 0.72, 1, 1, "north_centre_light_cover"],
    [0.15, 0.5, 1, 1, "west_light_cover"],
    [0.85, 0.5, 1, 1, "east_light_cover"],
  ] : [
    [0.472, 0.125, 1, 1, "south_light_cover"],
    [0.528, 0.875, 1, 1, "north_light_cover"],
    [0.5, 0.19, 1, 1, "south_centre_light_cover"],
    [0.5, 0.81, 1, 1, "north_centre_light_cover"],
    [0.15, 0.5, 1, 1, "west_light_cover"],
    [0.85, 0.5, 1, 1, "east_light_cover"],
  ];
  const base = category === "size3Plus" ? [
    [0.5, 0.5, 2, 2, "centre_anchor"],
    [0.5, 0.105, 3, 2, "secondary_high_ground"],
    [0.5, 0.895, 3, 2, "secondary_high_ground"],
  ] : category === "size2" || category === "grass" ? [
    [0.074, 0.111, 2, 2, "south_west_anchor"],
    [0.926, 0.111, 2, 2, "south_east_anchor"],
    [0.074, 0.889, 2, 2, "north_west_anchor"],
    [0.926, 0.889, 2, 2, "north_east_anchor"],
    [0.25, 0.47, 2, 2, "west_middle"],
    [0.75, 0.53, 2, 2, "east_middle"],
    [0.12, 0.63, 2, 2, "west_flank"],
    [0.88, 0.37, 2, 2, "east_flank"],
    [0.18, 0.82, 2, 2, "north_west_inner"],
    [0.82, 0.18, 2, 2, "south_east_inner"],
  ] : sizeOneSlots;
  if (count > base.length) fail("COMPETITIVE_MAP_LAYOUT_CAPACITY_EXCEEDED", category);
  return base.slice(0, count).map(([xRatio, yRatio, pieceWidth, pieceHeight, role], index) => {
    const fixedAnchor = role === "centre_anchor";
    const x = width * (xRatio + (fixedAnchor ? 0
      : deterministicOffset(seedId, index, `${category}:x`)));
    const y = height * (yRatio + (fixedAnchor ? 0
      : deterministicOffset(seedId, index, `${category}:y`)));
    return { xRatio, yRatio, xInches: fixed(x), yInches: fixed(y),
      widthInches: pieceWidth, heightInches: pieceHeight, role };
  });
}

function squaredDistance(row, slot, battlefield) {
  if (!row.sourceCentre) return Number.MAX_SAFE_INTEGER;
  const dx = row.sourceCentre.xInches / battlefield.widthInches
    - slot.xInches / battlefield.widthInches;
  const dy = row.sourceCentre.yInches / battlefield.heightInches
    - slot.yInches / battlefield.heightInches;
  return dx * dx + dy * dy;
}

function assignSlots(rows, slots, battlefield) {
  const remaining = [...rows];
  return slots.map((slot) => {
    const ranked = remaining.map((row, index) => ({ row, index,
      distance: squaredDistance(row, slot, battlefield) })).sort((left, right) => (
      left.distance - right.distance
        || String(left.row.sourceElementId || left.row.sourceFeature)
          .localeCompare(String(right.row.sourceElementId || right.row.sourceFeature))));
    const picked = ranked[0];
    remaining.splice(picked.index, 1);
    return { row: picked.row, slot };
  });
}

function footprintFor(slot, battlefield) {
  const halfWidth = slot.widthInches / 2;
  const halfHeight = slot.heightInches / 2;
  const centreX = Math.max(halfWidth,
    Math.min(battlefield.widthInches - halfWidth, slot.xInches));
  const centreY = Math.max(halfHeight,
    Math.min(battlefield.heightInches - halfHeight, slot.yInches));
  return { xMin: fixed(centreX - halfWidth), xMax: fixed(centreX + halfWidth),
    yMin: fixed(centreY - halfHeight), yMax: fixed(centreY + halfHeight) };
}

function rectangleDistance(left, right) {
  const dx = Math.max(0, left.xMin - right.xMax, right.xMin - left.xMax);
  const dy = Math.max(0, left.yMin - right.yMax, right.yMin - left.yMax);
  return Math.hypot(dx, dy);
}

function translatedFootprint(source, dx, dy, battlefield) {
  const width = source.xMax - source.xMin;
  const height = source.yMax - source.yMin;
  const xMin = Math.max(0, Math.min(battlefield.widthInches - width,
    source.xMin + dx));
  const yMin = Math.max(0, Math.min(battlefield.heightInches - height,
    source.yMin + dy));
  return { xMin: fixed(xMin), xMax: fixed(xMin + width),
    yMin: fixed(yMin), yMax: fixed(yMin + height) };
}

function majorRow(row) {
  return row.profile.size >= 2 && row.profile.terrainKind !== "grass";
}

function placementClear(row, footprint, placed) {
  return placed.every((entry) => !rectanglesOverlap(footprint, entry.footprint)
    && (!majorRow(row) || !entry.major
      || rectangleDistance(footprint, entry.footprint) >= 3 - TOLERANCE));
}

function resolveSourceFootprint(row, placed, battlefield) {
  const source = clone(row.sourceRulesFootprint);
  if (placementClear(row, source, placed)) {
    return { footprint: source, adjustment: { kind: "none",
      translationInches: { x: 0, y: 0 } } };
  }
  const offsets = [{ x: 0, y: 0 }];
  for (let distance = 0.25; distance <= 4 + TOLERANCE; distance += 0.25) {
    offsets.push({ x: distance, y: 0 }, { x: -distance, y: 0 },
      { x: 0, y: distance }, { x: 0, y: -distance },
      { x: distance, y: distance }, { x: distance, y: -distance },
      { x: -distance, y: distance }, { x: -distance, y: -distance });
  }
  for (const offset of offsets) {
    const candidate = translatedFootprint(source, offset.x, offset.y, battlefield);
    if (!placementClear(row, candidate, placed)) continue;
    return { footprint: candidate, adjustment: {
      kind: "minimum_translation_for_non_overlap_and_balance",
      translationInches: { x: fixed(candidate.xMin - source.xMin),
        y: fixed(candidate.yMin - source.yMin) },
    } };
  }
  fail("COMPETITIVE_MAP_SOURCE_GEOMETRY_CONFLICT_UNRESOLVED",
    row.sourceElementId);
}

function compensationCandidateSlots(row, battlefield, seedId) {
  const category = row.profile.category === "grass" ? "size2"
    : row.profile.category;
  const capacity = category === "size3Plus" ? 3
    : category === "size1" ? 6 : 10;
  const preferred = slotsFor(category, battlefield, capacity, seedId);
  const primary = preferred[(Number(row.compensationOrdinal || 1) - 1)
    % preferred.length];
  const ranked = [...preferred].sort((left, right) => (
    ((left.xInches - primary.xInches) ** 2
      + (left.yInches - primary.yInches) ** 2)
    - ((right.xInches - primary.xInches) ** 2
      + (right.yInches - primary.yInches) ** 2)
      || left.role.localeCompare(right.role)));
  const widthInches = category === "size1" ? 1 : 2;
  const heightInches = category === "size1" ? 1 : 2;
  const grid = [];
  for (let y = heightInches / 2 + 1; y <= battlefield.heightInches
    - heightInches / 2 - 1 + TOLERANCE; y += 1) {
    for (let x = widthInches / 2 + 1; x <= battlefield.widthInches
      - widthInches / 2 - 1 + TOLERANCE; x += 1) {
      grid.push({ xInches: fixed(x), yInches: fixed(y), widthInches,
        heightInches, role: "deterministic_free_space_compensation" });
    }
  }
  grid.sort((left, right) => (
    ((left.xInches - primary.xInches) ** 2
      + (left.yInches - primary.yInches) ** 2)
    - ((right.xInches - primary.xInches) ** 2
      + (right.yInches - primary.yInches) ** 2)
      || left.yInches - right.yInches || left.xInches - right.xInches));
  return [...ranked, ...grid];
}

function resolveCompensationFootprint(row, placed, battlefield, seedId) {
  for (const slot of compensationCandidateSlots(row, battlefield, seedId)) {
    const footprint = footprintFor(slot, battlefield);
    if (placementClear(row, footprint, placed)) return { footprint, slot };
  }
  fail("COMPETITIVE_MAP_COMPENSATION_GEOMETRY_UNAVAILABLE",
    `${seedId}:${row.profile.category}:${row.compensationOrdinal}`);
}

function accessPointFor(pieceId, footprint) {
  const y = fixed((footprint.yMin + footprint.yMax) / 2);
  const insideX = fixed(footprint.xMin + Math.min(0.25,
    (footprint.xMax - footprint.xMin) / 4));
  return { accessPointId: `${pieceId}:ground-high-access`, role: "ramp",
    footprint: { xMin: footprint.xMin, xMax: insideX,
      yMin: fixed(y - 0.25), yMax: fixed(y + 0.25) },
    connects: ["ground", "high"],
    groundApproachPath: [{ x: fixed(Math.max(0, footprint.xMin - 3)), y },
      { x: insideX, y }] };
}

function clippedSegmentToRectangle(start, end, rect) {
  const dx = end.xInches - start.xInches;
  const dy = end.yInches - start.yInches;
  let entry = 0;
  let exit = 1;
  for (const [direction, offset] of [
    [-dx, start.xInches - rect.xMin], [dx, rect.xMax - start.xInches],
    [-dy, start.yInches - rect.yMin], [dy, rect.yMax - start.yInches],
  ]) {
    if (Math.abs(direction) <= TOLERANCE) {
      if (offset < 0) return null;
      continue;
    }
    const ratio = offset / direction;
    if (direction < 0) entry = Math.max(entry, ratio);
    else exit = Math.min(exit, ratio);
    if (entry > exit) return null;
  }
  if (exit < 0 || entry > 1) return null;
  const pointAt = (ratio) => ({ x: fixed(start.xInches + dx * ratio),
    y: fixed(start.yInches + dy * ratio) });
  return { entry: pointAt(entry), exit: pointAt(exit), dx, dy };
}

function laneCrossings(lane, footprint) {
  const rows = [];
  const onBoundary = (point) => Math.abs(point.x - footprint.xMin) <= TOLERANCE
    || Math.abs(point.x - footprint.xMax) <= TOLERANCE
    || Math.abs(point.y - footprint.yMin) <= TOLERANCE
    || Math.abs(point.y - footprint.yMax) <= TOLERANCE;
  for (let index = 1; index < lane.centreline.length; index += 1) {
    const clipped = clippedSegmentToRectangle(lane.centreline[index - 1],
      lane.centreline[index], footprint);
    if (!clipped) continue;
    const length = Math.hypot(clipped.dx, clipped.dy) || 1;
    const direction = { x: clipped.dx / length, y: clipped.dy / length };
    if (onBoundary(clipped.entry)) {
      rows.push({ point: clipped.entry, inward: direction });
    }
    if (onBoundary(clipped.exit)) {
      rows.push({ point: clipped.exit,
        inward: { x: -direction.x, y: -direction.y } });
    }
  }
  return [...new Map(rows.map((entry) => (
    [`${entry.point.x}:${entry.point.y}`, entry]))).values()];
}

function accessPointsFor(row, terrainPieceId, footprint, adapter,
  passageByLane) {
  if (!row.profile.standableHorizontalSurface) return [];
  const recommendations = adapter.passageRecommendations.filter((entry) => (
    entry.terrainElementId === row.sourceElementId
      && entry.passageKind === "access_point"));
  const points = recommendations.flatMap((recommendation) => {
    const lane = adapter.lanes.find((entry) => entry.laneId
      === recommendation.laneId);
    if (!lane) return [];
    const selection = passageByLane.get(lane.laneId);
    const clearance = selection?.selectedPassageMode
      === "preserve_source_clearance" ? lane.sourceRequiredClearanceInches
      : lane.requiredClearanceInches;
    return laneCrossings(lane, footprint).map((crossing, index) => {
      const inside = { x: fixed(crossing.point.x + crossing.inward.x * 0.25),
        y: fixed(crossing.point.y + crossing.inward.y * 0.25) };
      const outside = {
        x: fixed(Math.max(0, Math.min(adapter.battlefield.widthInches,
          crossing.point.x - crossing.inward.x * 3))),
        y: fixed(Math.max(0, Math.min(adapter.battlefield.heightInches,
          crossing.point.y - crossing.inward.y * 3))),
      };
      const vertical = Math.abs(crossing.inward.y) >= Math.abs(crossing.inward.x);
      const ramp = vertical
        ? { xMin: fixed(crossing.point.x - clearance / 2),
          xMax: fixed(crossing.point.x + clearance / 2),
          yMin: fixed(crossing.point.y - 0.25),
          yMax: fixed(crossing.point.y + 0.25) }
        : { xMin: fixed(crossing.point.x - 0.25),
          xMax: fixed(crossing.point.x + 0.25),
          yMin: fixed(crossing.point.y - clearance / 2),
          yMax: fixed(crossing.point.y + clearance / 2) };
      return { accessPointId: `${terrainPieceId}:${lane.laneId}:ramp-${index + 1}`,
        laneId: lane.laneId, role: "ramp", footprint: {
          xMin: fixed(Math.max(0, ramp.xMin)),
          xMax: fixed(Math.min(adapter.battlefield.widthInches, ramp.xMax)),
          yMin: fixed(Math.max(0, ramp.yMin)),
          yMax: fixed(Math.min(adapter.battlefield.heightInches, ramp.yMax)),
        }, connects: ["ground", "high"],
        groundApproachPath: [outside, inside],
        selectedClearanceInches: clearance };
    });
  });
  return points.length > 0 ? points : [accessPointFor(terrainPieceId, footprint)];
}

function openingsFor(row, terrainPieceId, footprint, adapter, passageByLane) {
  if (row.selectedRulesMode !== "blocking") return [];
  return adapter.passageRecommendations.filter((entry) => (
    entry.terrainElementId === row.sourceElementId
      && entry.passageKind === "opening")).flatMap((recommendation) => {
    const lane = adapter.lanes.find((entry) => entry.laneId
      === recommendation.laneId);
    const crossings = lane ? laneCrossings(lane, footprint) : [];
    if (!lane || crossings.length < 2) return [];
    const selection = passageByLane.get(lane.laneId);
    const clearance = selection?.selectedPassageMode
      === "preserve_source_clearance" ? lane.sourceRequiredClearanceInches
      : lane.requiredClearanceInches;
    const start = crossings[0].point;
    const end = crossings.at(-1).point;
    const vertical = Math.abs(end.y - start.y) >= Math.abs(end.x - start.x);
    return [{ openingId: `${terrainPieceId}:${lane.laneId}:opening`,
      laneId: lane.laneId, footprint: vertical
        ? { xMin: fixed(Math.max(footprint.xMin, (start.x + end.x) / 2
          - clearance / 2)),
        xMax: fixed(Math.min(footprint.xMax, (start.x + end.x) / 2
          + clearance / 2)), yMin: footprint.yMin, yMax: footprint.yMax }
        : { xMin: footprint.xMin, xMax: footprint.xMax,
          yMin: fixed(Math.max(footprint.yMin, (start.y + end.y) / 2
            - clearance / 2)),
          yMax: fixed(Math.min(footprint.yMax, (start.y + end.y) / 2
            + clearance / 2)) },
      movementPassableAgreed: true, lineOfSightOpenAgreed: true,
      selectedClearanceInches: clearance }];
  });
}

function materializeTerrain(adapter, rows, passageSelections) {
  const seedId = adapter.seedId;
  const battlefield = adapter.battlefield;
  const passageByLane = new Map(passageSelections.map((entry) => (
    [entry.laneId, entry])));
  const sourceRows = rows.filter((entry) => entry.sourceRulesFootprint);
  const compensationRows = rows.filter((entry) => !entry.sourceRulesFootprint);
  const placed = [];
  const assignments = [];
  for (const row of sourceRows) {
    const resolved = resolveSourceFootprint(row, placed, battlefield);
    placed.push({ footprint: resolved.footprint, major: majorRow(row) });
    assignments.push({ row, footprint: resolved.footprint,
      slot: { role: "map_topology_geometry" }, adjustment: resolved.adjustment });
  }
  for (const row of compensationRows) {
    const resolved = resolveCompensationFootprint(row, placed, battlefield, seedId);
    placed.push({ footprint: resolved.footprint, major: majorRow(row) });
    assignments.push({ row, footprint: resolved.footprint, slot: resolved.slot,
      adjustment: { kind: "balanced_compensation_placement",
        translationInches: null } });
  }
  return assignments.map(({ row, slot, footprint, adjustment }, index) => {
    const sourceName = row.sourceElementId || `neutral-${row.profile.category}-${row.compensationOrdinal}`;
    const terrainPieceId = `${seedId}:${sourceName}`;
    const accessPoints = accessPointsFor(row, terrainPieceId, footprint,
      adapter, passageByLane);
    const openings = openingsFor(row, terrainPieceId, footprint,
      adapter, passageByLane);
    return { terrainPieceId, sourceType: row.sourceType,
      sourceElementId: row.sourceElementId, sourceGroupId: row.sourceGroupId,
      sourceFeature: row.sourceFeature, selectedRulesMode: row.selectedRulesMode,
      passabilityResolution: row.selectedRulesMode === "passable_difficult"
        ? "official_size_1_passable_cover_no_extra_movement_penalty"
        : row.selectedRulesMode === "blocking"
          ? openings.length > 0
            ? "official_size_2_impassable_with_compiled_openings"
            : "official_size_2_impassable_without_opening"
          : "official_mode_direct",
      placementRole: slot.role, sourceAnchor: row.sourceCentre,
      sourceRulesFootprint: clone(row.sourceRulesFootprint),
      rulesFootprintOrigin: row.sourceRulesFootprint
        ? "map_topology_candidate_rules_footprint"
        : "balanced_compensation_placement",
      geometryAdjustment: adjustment,
      size: row.profile.size, terrainKind: row.profile.terrainKind,
      originalFootprint: clone(footprint), footprint,
      heightTier: row.profile.heightTier,
      standableHorizontalSurface: row.profile.standableHorizontalSurface,
      blocksPlacement: row.profile.terrainKind === "impassable",
      openings,
      adjacentElevationPairs: row.profile.standableHorizontalSurface
        ? [["ground", "high"]] : [], accessPoints,
      compilationOrdinal: index + 1, rulesAuthorityBeforeRoomCertification: false };
  });
}

function countPieces(pieces) {
  return { total: pieces.length,
    size1: pieces.filter((entry) => entry.size === 1).length,
    size2: pieces.filter((entry) => entry.size === 2).length,
    size3Plus: pieces.filter((entry) => entry.size >= 3).length,
    grass: pieces.filter((entry) => entry.terrainKind === "grass").length };
}

function countDiagnostics(actual, targets) {
  return Object.keys(targets).filter((key) => actual[key] !== targets[key]).map((key) => ({
    severity: "error", code: "COMPETITIVE_MAP_OFFICIAL_COUNT_TARGET_MISMATCH",
    category: key, expected: targets[key], actual: actual[key],
    message: `${key} requires ${targets[key]} pieces but recipe produced ${actual[key]}`,
  }));
}

function rectanglesOverlap(left, right) {
  return left.xMin < right.xMax - TOLERANCE && left.xMax > right.xMin + TOLERANCE
    && left.yMin < right.yMax - TOLERANCE && left.yMax > right.yMin + TOLERANCE;
}

function verifyPreviewGeometry(pieces, battlefield) {
  for (const piece of pieces) {
    const rect = piece.footprint;
    if (rect.xMin < 0 || rect.yMin < 0 || rect.xMax > battlefield.widthInches
      || rect.yMax > battlefield.heightInches || rect.xMin >= rect.xMax
      || rect.yMin >= rect.yMax) {
      fail("COMPETITIVE_MAP_COMPILED_FOOTPRINT_INVALID", piece.terrainPieceId);
    }
  }
  for (let left = 0; left < pieces.length; left += 1) {
    for (let right = left + 1; right < pieces.length; right += 1) {
      if (rectanglesOverlap(pieces[left].footprint, pieces[right].footprint)) {
        fail("COMPETITIVE_MAP_COMPILED_PIECES_OVERLAP",
          `${pieces[left].terrainPieceId}:${pieces[right].terrainPieceId}`);
      }
    }
  }
}

function manoeuvreLaneCandidates(battlefield, pieces) {
  const widthInches = fixed(100 / 25.4);
  const clearance = widthInches / 2;
  const centreX = battlefield.widthInches / 2;
  const centreY = battlefield.heightInches / 2;
  const boundsByQuadrant = {
    south_west: { xMin: 0, xMax: centreX, yMin: 0, yMax: centreY },
    south_east: { xMin: centreX, xMax: battlefield.widthInches,
      yMin: 0, yMax: centreY },
    north_west: { xMin: 0, xMax: centreX, yMin: centreY,
      yMax: battlefield.heightInches },
    north_east: { xMin: centreX, xMax: battlefield.widthInches,
      yMin: centreY, yMax: battlefield.heightInches },
  };
  const clear = (start, end) => pieces.every((entry) => (
    segmentRectangleDistance(start, end, entry.footprint)
      >= clearance - TOLERANCE));
  return QUADRANTS.map((quadrant) => {
    const bounds = boundsByQuadrant[quadrant];
    const candidates = [];
    for (const length of [8, 7, 6, 5, 4]) {
      for (let y = bounds.yMin + clearance + 0.25;
        y <= bounds.yMax - clearance - 0.25 + TOLERANCE; y += 0.5) {
        for (let x = bounds.xMin + clearance + 0.25;
          x + length <= bounds.xMax - clearance - 0.25 + TOLERANCE; x += 0.5) {
          candidates.push({ start: { x: fixed(x), y: fixed(y) },
            end: { x: fixed(x + length), y: fixed(y) }, length });
        }
      }
      for (let x = bounds.xMin + clearance + 0.25;
        x <= bounds.xMax - clearance - 0.25 + TOLERANCE; x += 0.5) {
        for (let y = bounds.yMin + clearance + 0.25;
          y + length <= bounds.yMax - clearance - 0.25 + TOLERANCE; y += 0.5) {
          candidates.push({ start: { x: fixed(x), y: fixed(y) },
            end: { x: fixed(x), y: fixed(y + length) }, length });
        }
      }
      const available = candidates.filter((entry) => clear(entry.start, entry.end));
      if (available.length > 0) {
        available.sort((left, right) => right.length - left.length
          || Math.hypot(((left.start.x + left.end.x) / 2) - centreX,
            ((left.start.y + left.end.y) / 2) - centreY)
          - Math.hypot(((right.start.x + right.end.x) / 2) - centreX,
            ((right.start.y + right.end.y) / 2) - centreY)
          || left.start.y - right.start.y || left.start.x - right.start.x);
        const selected = available[0];
        return { quadrant, laneId: `compiled-manoeuvre-${quadrant}`,
          start: selected.start, end: selected.end, widthInches,
          derivation: "authoritative_terrain_free_space_search_v1" };
      }
    }
    fail("COMPETITIVE_MAP_QUADRANT_MANOEUVRE_LANE_UNAVAILABLE", quadrant);
  });
}

function setupPlanTemplate(seedId, pieces, battlefield) {
  return { schema: OFFICIAL_BALANCED_TERRAIN_SETUP_PLAN_SCHEMA,
    planId: `${seedId}:compiled-balanced-terrain-plan-v1`,
    placementMethod: "alternating", premadeMapId: null,
    physicalLayoutConfirmedByPlayerIds: [], placementHistory: [],
    terrainPieces: pieces.map((entry) => without(clone(entry), [
      "sourceType", "sourceElementId", "sourceGroupId", "sourceFeature",
      "selectedRulesMode", "passabilityResolution", "placementRole", "sourceAnchor",
      "compilationOrdinal", "rulesAuthorityBeforeRoomCertification",
    ])),
    size3PlusAvailable: pieces.some((entry) => entry.size >= 3),
    quadrantManoeuvreLanes: manoeuvreLaneCandidates(battlefield, pieces),
    fireLanes: [],
    fireLanesDerivedFromSelectedDeploymentAtRoomCreation: true,
    rulesTruth: "compiled_balanced_terrain_setup_plan_requires_room_certification",
    trainingTruth: false };
}

export function compileOfficialCompetitiveMapTwoLayerV1(input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    input.seedId);
  const targets = OFFICIAL_TARGETS[adapter.engagementScale];
  const selections = normalizeSelections(adapter, input.elementSelections || []);
  const passageSelections = normalizePassageSelections(adapter,
    input.passageSelections || []);
  const membership = compileRuleMembership(adapter, selections, targets);
  const pieces = materializeTerrain(adapter, membership.rows,
    passageSelections);
  verifyPreviewGeometry(pieces, adapter.battlefield);
  const actual = countPieces(pieces);
  const diagnostics = countDiagnostics(actual, targets);
  const warnings = [];
  if (pieces.some((entry) => entry.selectedRulesMode === "passable_difficult")) {
    warnings.push({ severity: "warning",
      code: "PASSABLE_DIFFICULT_HAS_NO_OFFICIAL_MOVEMENT_SURCHARGE",
      message: "Current official terrain has no difficult-movement surcharge; compiled as passable Size 1 cover." });
  }
  for (const lane of adapter.lanes.filter((entry) => (
    entry.defaultPassageMode === "widen_all_current_bases"))) {
    warnings.push({ severity: "warning",
      code: "CLASSIC_PASSAGE_WIDENED_FOR_CURRENT_BASES",
      laneId: lane.laneId,
      sourceClearanceInches: lane.sourceRequiredClearanceInches,
      displayClearanceInches: lane.requiredClearanceInches,
      message: "Classic restricted passage is widened in the default tabletop art; the source-clearance option remains available." });
  }
  for (const selection of passageSelections.filter((entry) => (
    entry.selectedPassageMode === "preserve_source_clearance"))) {
    const audit = adapter.laneClearanceAudits.find((entry) => (
      entry.laneId === selection.laneId));
    if (audit?.sourceStraightTransitBaseProfilesBlocked.length > 0) {
      warnings.push({ severity: "warning",
        code: "CLASSIC_PASSAGE_RESTRICTION_SELECTED",
        laneId: selection.laneId,
        blockedBaseProfiles: clone(
          audit.sourceStraightTransitBaseProfilesBlocked),
        message: "Selected classic display passage is narrower than some current bases; authoritative Rules geometry remains the certified tabletop recipe." });
    }
  }
  if (adapter.engagementScale === "Grand Offensive") {
    warnings.push({ severity: "warning",
      code: "GRAND_OFFENSIVE_TASK_GEOMETRY_NOT_IN_CURRENT_CARD_BUNDLE",
      message: "72x36 scale is exact, but current mission/deployment-card geometry cannot certify a room yet." });
  }
  const plan = setupPlanTemplate(adapter.seedId, pieces, adapter.battlefield);
  const planHash = hashStarcraftTmgContract(plan);
  const artElements = adapter.elements.map((element) => {
    const selection = selections.find((entry) => entry.elementId === element.elementId);
    return { elementId: element.elementId, sourceGroupId: element.sourceGroupId,
      sourceKind: element.sourceKind, sourceFeature: element.sourceFeature,
      disposition: selection.artDisposition, visible: selection.artDisposition === "retain",
      artFootprint: clone(element.artFootprint), displayOnly: true,
      rulesAuthority: false };
  });
  const receipt = selections.map((entry) => {
    const included = pieces.find((piece) => piece.sourceElementId === entry.elementId);
    return { ...entry, compiledRulesStatus: included ? "included" : "not_in_rules_layer",
      compiledTerrainPieceId: included?.terrainPieceId || null };
  });
  const auditByLane = new Map(adapter.laneClearanceAudits.map((entry) => (
    [entry.laneId, entry])));
  const passageByLane = new Map(passageSelections.map((entry) => (
    [entry.laneId, entry])));
  const routeTreatments = adapter.lanes.map((lane) => {
    const audit = auditByLane.get(lane.laneId);
    const passage = passageByLane.get(lane.laneId);
    const preserveSource = passage.selectedPassageMode
      === "preserve_source_clearance";
    return { laneId: lane.laneId, routeClass: lane.routeClass,
      centreline: clone(lane.centreline),
      defaultPassageMode: lane.defaultPassageMode,
      selectedPassageMode: passage.selectedPassageMode,
      selectionOrigin: passage.selectionOrigin,
      availablePassageModes: clone(lane.availablePassageModes),
      sourceClearanceInches: lane.sourceRequiredClearanceInches,
      displayClearanceInches: preserveSource
        ? lane.sourceRequiredClearanceInches : lane.requiredClearanceInches,
      sourceStraightTransitBaseProfilesCovered:
        clone(audit.sourceStraightTransitBaseProfilesCovered),
      sourceStraightTransitBaseProfilesBlocked:
        clone(audit.sourceStraightTransitBaseProfilesBlocked),
      defaultStraightTransitBaseProfilesCovered:
        clone(audit.straightTransitBaseProfilesCovered),
      defaultStraightTransitBaseProfilesBlocked:
        clone(audit.straightTransitBaseProfilesBlocked),
      selectedStraightTransitBaseProfilesCovered: clone(preserveSource
        ? audit.sourceStraightTransitBaseProfilesCovered
        : audit.straightTransitBaseProfilesCovered),
      selectedStraightTransitBaseProfilesBlocked: clone(preserveSource
        ? audit.sourceStraightTransitBaseProfilesBlocked
        : audit.straightTransitBaseProfilesBlocked),
      restrictionDisclosureRequired: preserveSource
        && audit.sourceStraightTransitBaseProfilesBlocked.length > 0,
      displayOnly: true, rulesAuthority: false };
  });
  const routeGeometryTreatments = routeTreatments.map((route) => ({
    laneId: route.laneId,
    centreline: clone(route.centreline),
    selectedPassageMode: route.selectedPassageMode,
    selectedClearanceInches: route.displayClearanceInches,
    selectedStraightTransitBaseProfilesCovered:
      clone(route.selectedStraightTransitBaseProfilesCovered),
    selectedStraightTransitBaseProfilesBlocked:
      clone(route.selectedStraightTransitBaseProfilesBlocked),
    rulesAuthorityAfterRoomCertification: true,
  }));
  const body = { schema: OFFICIAL_COMPETITIVE_MAP_TWO_LAYER_COMPILATION_V1_SCHEMA,
    version: "1.3.0", compilationId: `${adapter.seedId}:map-geometry-recipe-v3`,
    seedId: adapter.seedId, adapterHash: adapter.adapterHash,
    engagementScale: adapter.engagementScale,
    sourceMapDimensions: clone(adapter.sourceMapDimensions),
    battlefield: clone(adapter.battlefield),
    artLayer: { visualPresetId: `${adapter.seedId}:generated-original-art-v2`,
      elements: artElements, routeTreatments, backgroundRulesAuthority: false,
      pixelInferenceAllowed: false },
    rulesLayer: { terrainPieces: pieces, setupPlanTemplate: plan, planHash,
      routeGeometryTreatments,
      targetCounts: clone(targets), actualCounts: actual,
      compensatingTerrainPieceIds: pieces.filter((entry) => (
        entry.sourceType === "neutral_tmg_compensation")).map((entry) => (
        entry.terrainPieceId)),
      exactDeploymentFireLanesPendingRoomBinding: true,
      sourceRoutePixelsAreRulesAuthority: false,
      authoritativeTerrainLayerAfterRoomCertification: true,
      rulesAuthorityBeforeRoomCertification: false },
    selectionReceipt: receipt,
    passageSelectionReceipt: passageSelections,
    diagnostics, warnings,
    officialRecipeEligible: diagnostics.length === 0,
    roomCertificationEligible: diagnostics.length === 0
      && adapter.currentMissionDeploymentGeometryCoverage === "official_exact",
    currentMissionDeploymentGeometryCoverage:
      adapter.currentMissionDeploymentGeometryCoverage,
    everySourceElementIndependentlyConfigurable: true,
    everyPassageIndependentlyConfigurable: true,
    passageModeChangesRulesGeometry: true,
    artAndRulesLayersIndependent: true,
    deterministicCompilation: true,
    sourceRefreshPerformed: false,
    rulesTruth: "two_layer_map_compilation_requires_room_bound_certification",
    trainingTruth: false };
  const result = deepFreeze(seal(body, "compilationHash"));
  verifyOfficialCompetitiveMapTwoLayerCompilationV1(result, adapterCatalogue);
  return result;
}

export function verifyOfficialCompetitiveMapTwoLayerCompilationV1(compilation,
  adapterCatalogue = createOfficialCompetitiveMapTabletopAdapterCatalogueV1()) {
  verifyOfficialCompetitiveMapTabletopAdapterCatalogueV1(adapterCatalogue);
  if (!compilation
    || compilation.schema !== OFFICIAL_COMPETITIVE_MAP_TWO_LAYER_COMPILATION_V1_SCHEMA
    || compilation.version !== "1.3.0"
    || compilation.compilationHash !== hashStarcraftTmgContract(without(compilation,
      ["compilationHash"]))
    || compilation.artLayer?.backgroundRulesAuthority !== false
    || compilation.artLayer?.routeTreatments?.length < 3
    || compilation.rulesLayer?.rulesAuthorityBeforeRoomCertification !== false
    || compilation.rulesLayer?.sourceRoutePixelsAreRulesAuthority !== false
    || compilation.everySourceElementIndependentlyConfigurable !== true
    || compilation.everyPassageIndependentlyConfigurable !== true
    || compilation.passageModeChangesRulesGeometry !== true
    || compilation.artAndRulesLayersIndependent !== true
    || compilation.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_TWO_LAYER_COMPILATION_INVALID");
  }
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    compilation.seedId);
  if (compilation.adapterHash !== adapter.adapterHash
    || compilation.engagementScale !== adapter.engagementScale
    || compilation.artLayer.elements.length !== adapter.elements.length
    || compilation.selectionReceipt.length !== adapter.elements.length
    || compilation.passageSelectionReceipt?.length !== adapter.lanes.length
    || compilation.artLayer.routeTreatments.length !== adapter.lanes.length
    || compilation.rulesLayer.routeGeometryTreatments?.length
      !== adapter.lanes.length
    || compilation.rulesLayer.planHash !== hashStarcraftTmgContract(
      compilation.rulesLayer.setupPlanTemplate)) {
    fail("COMPETITIVE_MAP_TWO_LAYER_BINDING_INVALID", compilation.seedId);
  }
  verifyPreviewGeometry(compilation.rulesLayer.terrainPieces, adapter.battlefield);
  const actual = countPieces(compilation.rulesLayer.terrainPieces);
  if (JSON.stringify(actual) !== JSON.stringify(compilation.rulesLayer.actualCounts)
    || compilation.officialRecipeEligible !== (compilation.diagnostics.length === 0)
    || compilation.roomCertificationEligible !== (compilation.officialRecipeEligible
      && adapter.currentMissionDeploymentGeometryCoverage === "official_exact")) {
    fail("COMPETITIVE_MAP_TWO_LAYER_COUNTS_INVALID", compilation.seedId);
  }
  for (const route of compilation.artLayer.routeTreatments) {
    const lane = adapter.lanes.find((entry) => entry.laneId === route.laneId);
    if (!lane || !lane.availablePassageModes.includes(route.selectedPassageMode)
      || route.displayOnly !== true || route.rulesAuthority !== false) {
      fail("COMPETITIVE_MAP_TWO_LAYER_PASSAGE_INVALID", route?.laneId);
    }
  }
  for (const route of compilation.rulesLayer.routeGeometryTreatments) {
    const lane = adapter.lanes.find((entry) => entry.laneId === route.laneId);
    if (!lane || route.rulesAuthorityAfterRoomCertification !== true
      || !(route.selectedClearanceInches > 0)) {
      fail("COMPETITIVE_MAP_RULES_ROUTE_GEOMETRY_INVALID", route?.laneId);
    }
  }
  return true;
}

function edgePoints(entry, battlefield) {
  const points = [];
  for (const segment of entry.segments || []) {
    for (let position = segment.startInches; position <= segment.endInches + TOLERANCE;
      position += 0.5) {
      const value = fixed(Math.min(position, segment.endInches));
      if (segment.side === "bottom") points.push({ x: value, y: 0 });
      else if (segment.side === "top") points.push({ x: value,
        y: battlefield.heightInches });
      else if (segment.side === "left") points.push({ x: 0, y: value });
      else if (segment.side === "right") points.push({ x: battlefield.widthInches,
        y: value });
    }
  }
  return [...new Map(points.map((entry) => [`${entry.x}:${entry.y}`, entry])).values()];
}

function pointRectangleDistance(point, rect) {
  const x = Math.max(rect.xMin, Math.min(point.x, rect.xMax));
  const y = Math.max(rect.yMin, Math.min(point.y, rect.yMax));
  return Math.hypot(point.x - x, point.y - y);
}
function segmentIntersectsRectangle(start, end, rect) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  let minimum = 0; let maximum = 1;
  for (const [direction, offset] of [
    [-dx, start.x - rect.xMin], [dx, rect.xMax - start.x],
    [-dy, start.y - rect.yMin], [dy, rect.yMax - start.y],
  ]) {
    if (direction === 0) { if (offset < 0) return false; continue; }
    const ratio = offset / direction;
    if (direction < 0) minimum = Math.max(minimum, ratio);
    else maximum = Math.min(maximum, ratio);
    if (minimum > maximum) return false;
  }
  return maximum >= 0 && minimum <= 1;
}
function pointSegmentDistance(point, start, end) {
  const dx = end.x - start.x; const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx
    + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (start.x + ratio * dx),
    point.y - (start.y + ratio * dy));
}
function segmentRectangleDistance(start, end, rect) {
  if (segmentIntersectsRectangle(start, end, rect)) return 0;
  const corners = [{ x: rect.xMin, y: rect.yMin }, { x: rect.xMax, y: rect.yMin },
    { x: rect.xMax, y: rect.yMax }, { x: rect.xMin, y: rect.yMax }];
  return Math.min(pointRectangleDistance(start, rect),
    pointRectangleDistance(end, rect),
    ...corners.map((entry) => pointSegmentDistance(entry, start, end)));
}

function deriveRoomFireLanes(binding, pieces) {
  const participantIds = [...binding.participantIds];
  if (participantIds.length !== 2) fail("COMPETITIVE_MAP_ROOM_PARTICIPANTS_INVALID");
  const startPoints = edgePoints(binding.entryEdgesByPlayer[participantIds[0]],
    binding.battlefield);
  const endPoints = edgePoints(binding.entryEdgesByPlayer[participantIds[1]],
    binding.battlefield);
  const blockers = pieces.filter((entry) => entry.size >= 2);
  const candidates = [];
  for (const start of startPoints) {
    for (const end of endPoints) {
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      if (length <= 6) continue;
      const clearance = Math.min(...blockers.map((entry) => (
        segmentRectangleDistance(start, end, entry.footprint))));
      if (clearance < 3 - TOLERANCE) continue;
      candidates.push({ start, end, length, clearance,
        midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 } });
    }
  }
  candidates.sort((left, right) => right.clearance - left.clearance
    || right.length - left.length || left.start.x - right.start.x
    || left.start.y - right.start.y || left.end.x - right.end.x
    || left.end.y - right.end.y);
  const first = candidates[0];
  const second = candidates.find((entry) => first
    && Math.hypot(entry.midpoint.x - first.midpoint.x,
      entry.midpoint.y - first.midpoint.y) >= 6 - TOLERANCE);
  if (!first || !second) fail("COMPETITIVE_MAP_ROOM_FIRE_LANES_UNAVAILABLE");
  return [first, second].map((entry, index) => ({
    laneId: `room-fire-lane-${index + 1}`, start: entry.start, end: entry.end,
    widthInches: 6 }));
}

function missionQuarterTargets(battlefield) {
  return [["south_west", 0.25, 0.25], ["south_east", 0.75, 0.25],
    ["north_west", 0.25, 0.75], ["north_east", 0.75, 0.75]]
    .map(([quarter, x, y]) => ({ targetId: `mission-quarter-${quarter}`,
      targetKind: "mission_quarter", coordinate: {
        x: battlefield.widthInches * x, y: battlefield.heightInches * y },
      accessDistanceInches: 3 }));
}

function firstSpatialFailure(audit) {
  for (const base of audit.baseProfileAudits || []) {
    for (const side of base.sideAudits || []) {
      const segment = side.entrySegments?.find((entry) => !entry.usable);
      if (segment) return `${base.baseId}:${side.sideId}:${segment.segmentId}`;
      if (!side.opponentEntryReachable) {
        return `${base.baseId}:${side.sideId}:opposing_entry_unreachable`;
      }
      const target = side.targetAudits?.find((entry) => !entry.reachable);
      if (target) return `${base.baseId}:${side.sideId}:${target.targetId}:${target.failureCode}`;
    }
  }
  return "unknown";
}

export function certifyAndFreezeOfficialCompetitiveMapForRoomV1(input = {}) {
  const adapterCatalogue = input.adapterCatalogue
    || createOfficialCompetitiveMapTabletopAdapterCatalogueV1();
  const compilation = input.compilation;
  verifyOfficialCompetitiveMapTwoLayerCompilationV1(compilation, adapterCatalogue);
  if (!compilation.roomCertificationEligible) {
    fail("COMPETITIVE_MAP_ROOM_CERTIFICATION_INELIGIBLE", compilation.seedId);
  }
  const roomId = String(input.roomId || "").trim();
  if (!roomId) fail("COMPETITIVE_MAP_ROOM_ID_REQUIRED");
  const binding = input.deploymentGeometryBinding;
  verifyOfficialDeploymentGeometryBindingV1(binding, input.deploymentGeometryDataBundle);
  if (binding.engagementScale !== compilation.engagementScale
    || binding.battlefield.widthInches !== compilation.battlefield.widthInches
    || binding.battlefield.heightInches !== compilation.battlefield.heightInches) {
    fail("COMPETITIVE_MAP_ROOM_SCALE_MISMATCH");
  }
  const red = Object.entries(binding.colourByPlayer).find(([, value]) => value === "red")?.[0];
  const blue = Object.entries(binding.colourByPlayer).find(([, value]) => value === "blue")?.[0];
  if (!red || !blue) fail("COMPETITIVE_MAP_ROOM_COLOURS_INVALID");
  const adapter = getOfficialCompetitiveMapTabletopAdapterV1(adapterCatalogue,
    compilation.seedId);
  const spatialReachabilityAudit = auditOfficialCompetitiveMapSpatialReachabilityV1({
    seedId: compilation.seedId, auditAuthority: "official_task_geometry",
    battlefield: binding.battlefield,
    terrainPieces: compilation.rulesLayer.terrainPieces,
    baseProfiles: adapter.baseProfiles,
    entryEdgesBySide: binding.entryEdgesByPlayer,
    missionMarkers: binding.markerTargets,
    areaTargets: missionQuarterTargets(binding.battlefield),
  });
  if (!spatialReachabilityAudit.spatialReachabilityCertified) {
    fail("COMPETITIVE_MAP_ROOM_TASK_GEOMETRY_UNREACHABLE",
      firstSpatialFailure(spatialReachabilityAudit));
  }
  const template = clone(compilation.rulesLayer.setupPlanTemplate);
  const setupPlan = { ...template,
    physicalLayoutConfirmedByPlayerIds: [...binding.participantIds],
    placementHistory: template.terrainPieces.map((entry, index) => ({
      ordinal: index + 1, terrainPieceId: entry.terrainPieceId,
      placedByPlayerId: index % 2 === 0 ? red : blue })),
    fireLanes: deriveRoomFireLanes(binding, template.terrainPieces),
    fireLanesDerivedFromSelectedDeploymentAtRoomCreation: true };
  const setupPlanHash = hashStarcraftTmgContract(setupPlan);
  const artifacts = certifyOfficialBalancedTerrainSetupV1({
    deploymentGeometryBinding: binding,
    deploymentGeometryDataBundle: input.deploymentGeometryDataBundle,
    balancedTerrainRulesDataBundle: input.balancedTerrainRulesDataBundle,
    setupPlan,
  });
  const body = { schema: OFFICIAL_COMPETITIVE_MAP_ROOM_FREEZE_V1_SCHEMA,
    version: "1.1.0", roomId, seedId: compilation.seedId,
    engagementScale: compilation.engagementScale,
    compilationHash: compilation.compilationHash,
    adapterHash: compilation.adapterHash,
    deploymentGeometryBindingHash: binding.bindingHash,
    setupPlan, setupPlanHash,
    balancedTerrainCertificate: artifacts.certificate,
    balancedTerrainCertificateHash: artifacts.certificate.certificateHash,
    missionSpatialReachabilityAudit: spatialReachabilityAudit,
    missionSpatialReachabilityAuditHash: spatialReachabilityAudit.auditHash,
    everyEntrySegmentUsable: true,
    opposingSidesConnectedForEveryCurrentBase: true,
    everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase: true,
    artLayerVisibilityFrozen: true, rulesLayerFrozen: true,
    backgroundRulesAuthority: false, authoritativeTerrainLayer: true,
    mutationAfterRoomCreationAllowed: false,
    sourceRefreshPerformed: false,
    rulesTruth: "room_bound_official_balanced_terrain_certified",
    trainingTruth: false };
  return deepFreeze(seal(body, "roomFreezeHash"));
}

export function verifyOfficialCompetitiveMapRoomFreezeV1(freeze, input = {}) {
  if (!freeze || freeze.schema !== OFFICIAL_COMPETITIVE_MAP_ROOM_FREEZE_V1_SCHEMA
    || freeze.version !== "1.1.0"
    || freeze.roomFreezeHash !== hashStarcraftTmgContract(without(freeze,
      ["roomFreezeHash"]))
    || freeze.setupPlanHash !== hashStarcraftTmgContract(freeze.setupPlan)
    || freeze.backgroundRulesAuthority !== false
    || freeze.authoritativeTerrainLayer !== true
    || freeze.mutationAfterRoomCreationAllowed !== false
    || freeze.missionSpatialReachabilityAuditHash
      !== freeze.missionSpatialReachabilityAudit?.auditHash
    || freeze.missionSpatialReachabilityAudit?.spatialReachabilityCertified !== true
    || freeze.everyEntrySegmentUsable !== true
    || freeze.opposingSidesConnectedForEveryCurrentBase !== true
    || freeze.everyMissionMarkerAndQuarterReachableByAtLeastOneCurrentBase !== true
    || freeze.trainingTruth !== false) {
    fail("COMPETITIVE_MAP_ROOM_FREEZE_INVALID");
  }
  verifyOfficialBalancedTerrainSetupCertificateV1(
    freeze.balancedTerrainCertificate, input.deploymentGeometryBinding,
    input.balancedTerrainRulesDataBundle);
  verifyOfficialCompetitiveMapSpatialReachabilityV1(
    freeze.missionSpatialReachabilityAudit);
  if (freeze.deploymentGeometryBindingHash
      !== input.deploymentGeometryBinding?.bindingHash
    || freeze.balancedTerrainCertificateHash
      !== freeze.balancedTerrainCertificate.certificateHash) {
    fail("COMPETITIVE_MAP_ROOM_FREEZE_BINDING_INVALID");
  }
  return true;
}
