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
  for (const candidate of generated.candidates) {
    if (attemptedCandidateCount >= maximumCandidateAttempts
      || options.length >= maximumOptions) break;
    attemptedCandidateCount += 1;
    const parameters = contract.kind === "coordinate"
      ? { ...clone(baseParameters), coordinate: clone(candidate.coordinate) }
      : { ...clone(baseParameters),
        xMilliInches: candidate.coordinate.xMilliInches,
        yMilliInches: candidate.coordinate.yMilliInches };
    try {
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
      hiddenChainOfThoughtRequested: false,
    },
    rulesAuthority: options.length > 0,
    mutationAuthority: false,
    trainingTruth: false,
  });
}
