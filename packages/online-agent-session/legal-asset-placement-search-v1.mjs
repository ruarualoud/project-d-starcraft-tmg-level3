import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_LEGAL_ASSET_PLACEMENT_SEARCH_VERSION =
  "starcraft_tmg_legal_asset_placement_search_v1";

const DEFAULT_MAX_ATTEMPTS = 1_024;
const DEFAULT_MAX_OPTIONS = 4;
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
  const diameter = milliInchesFromMillimeters(value.baseDiameterMm
    ?? value.baseWidthMm ?? value.widthMillimeters);
  const width = milliInchesFromMillimeters(value.baseWidthMm
    ?? value.widthMillimeters ?? value.baseDiameterMm);
  const depth = milliInchesFromMillimeters(value.baseDepthMm
    ?? value.depthMillimeters ?? value.baseDiameterMm);
  const round = String(value.baseShape || value.shape || "round") === "round";
  return {
    x: Math.max(1, Math.round((Number.isFinite(milliWidth) && milliWidth > 0
      ? milliWidth : round ? diameter || width : width) / 2)),
    y: Math.max(1, Math.round((Number.isFinite(milliDepth) && milliDepth > 0
      ? milliDepth : round ? diameter || depth : depth) / 2)),
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
  const radius = Math.round(Math.max(Number(model?.baseWidthInches || 0),
    Number(model?.baseDepthInches || model?.baseWidthInches || 0)) * 500);
  return point && radius > 0 ? roundFootprint(point, radius) : null;
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
  if (["creep_token_place", "force_field_place", "shade_token_place"]
    .includes(source.effectKind)) {
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

function placementContract(source) {
  if (source.actionType === "resolve_battlefield_asset_ability"
    && source.parameterSchema?.coordinate?.type
      === "world_point_milli_inches") {
    return { kind: "coordinate",
      physicalProfile: source.constraints?.physicalTokenProfile };
  }
  if (source.actionType === "use_active_ability"
    && source.effectKind === "omega_network"
    && object(source.parameterSchema?.groundPoint)
    && source.parameterSchema.required?.includes("xMilliInches")
    && source.parameterSchema.required?.includes("yMilliInches")) {
    return { kind: "ground_point",
      physicalProfile: source.parameterSchema.groundPoint };
  }
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
  const state = input.state;
  const instantiate = input.instantiate;
  const request = object(input.request) ? input.request : {};
  if (!object(state) || !object(domain) || !object(source?.parameterSchema)
    || typeof instantiate !== "function") {
    throw new TypeError("LEGAL_ASSET_PLACEMENT_SEARCH_INPUT_INVALID");
  }
  const contract = placementContract(source);
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
  const options = [];
  const failureCounts = new Map();
  let attemptedCandidateCount = 0;
  let prefilteredCandidateCount = 0;
  let instantiatedCandidateCount = 0;
  for (const candidate of generated.candidates) {
    if (attemptedCandidateCount >= maximumCandidateAttempts
      || options.length >= maximumOptions) break;
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
      options.push({ ...optionCore,
        placementOptionId: hashStarcraftTmgContract(optionCore) });
    } catch (error) {
      const code = String(error?.code || error?.message || error)
        .split(":")[0];
      failureCounts.set(code, Number(failureCounts.get(code) || 0) + 1);
    }
  }
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
      candidateGenerationDeterministic: true,
      cheapGeometryPrefilterOnlyRejects: true,
      everySurvivorStillRequiresExactRulesInstantiation: true,
      strategyRequestOrOptionBudgetReducedForPerformance: false,
      betterOptionMayExist:
        attemptedCandidateCount < generated.candidates.length,
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
    },
    rulesAuthority: options.length > 0,
    mutationAuthority: false,
    trainingTruth: false,
  });
}
