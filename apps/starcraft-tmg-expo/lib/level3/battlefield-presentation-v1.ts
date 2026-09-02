export type BattlefieldBaseShape = "round" | "oval" | "rectangle";

export interface BattlefieldPointV1 {
  xMilliInches: number;
  yMilliInches: number;
}

export interface BattlefieldModelV1 extends BattlefieldPointV1 {
  kind: "model";
  id: string;
  pieceId: string;
  label: string;
  sideKey: string;
  baseShape: BattlefieldBaseShape | null;
  baseWidthMilliInches: number | null;
  baseDepthMilliInches: number | null;
  baseRotationDegrees: number;
  geometryRenderable: boolean;
  selected: boolean;
  destroyed: boolean;
  statuses: readonly string[];
}

export interface BattlefieldUnitAnchorV1 extends BattlefieldPointV1 {
  kind: "unit_anchor";
  id: string;
  pieceId: string;
  label: string;
  sideKey: string;
  currentModels: number | null;
  selected: boolean;
  geometryRenderable: false;
}

export interface BattlefieldAreaV1 extends BattlefieldPointV1 {
  id: string;
  kind: "terrain" | "marker" | "token";
  label: string;
  shape: BattlefieldBaseShape | null;
  widthMilliInches: number | null;
  depthMilliInches: number | null;
  rotationDegrees: number;
  geometryRenderable: boolean;
}

export interface BattlefieldPlacementV1 extends BattlefieldPointV1 {
  modelId: string;
  baseShape: BattlefieldBaseShape | null;
  baseWidthMilliInches: number | null;
  baseDepthMilliInches: number | null;
  baseRotationDegrees: number;
  geometryRenderable: boolean;
}

export interface BattlefieldActionV1 {
  actionKey: string;
  actionType: string;
  pieceId: string | null;
  label: string;
  confirmationClass: string | null;
}

export type BattlefieldParameterSupport =
  | "legacy_path_only"
  | "official_standard_move"
  | "unsupported";

export interface BattlefieldParameterDomainV1 {
  domainId: string;
  parameterKind: string | null;
  actionType: string;
  pieceId: string | null;
  label: string;
  support: BattlefieldParameterSupport;
  modelIds: readonly string[];
  modelStartPoints: Readonly<Record<string, BattlefieldPointV1>>;
  start: BattlefieldPointV1 | null;
  maxPathPoints: number | null;
  exactRemainingPlacementCount: number | null;
  raw: Record<string, unknown>;
}

export interface BattlefieldSceneV1 {
  schemaVersion: "starcraft_tmg_battlefield_presentation_v1";
  roomId: string | null;
  stateRevision: number | null;
  stateHash: string | null;
  board: {
    widthMilliInches: number;
    heightMilliInches: number;
  };
  widthMilliInches: number;
  heightMilliInches: number;
  models: readonly BattlefieldModelV1[];
  unitAnchors: readonly BattlefieldUnitAnchorV1[];
  terrain: readonly BattlefieldAreaV1[];
  markers: readonly BattlefieldAreaV1[];
  tokens: readonly BattlefieldAreaV1[];
  finiteActions: readonly BattlefieldActionV1[];
  parameterDomains: readonly BattlefieldParameterDomainV1[];
  previewPath: readonly BattlefieldPointV1[];
  previewPlacements: readonly BattlefieldPlacementV1[];
  previewId: string | null;
  preview: {
    previewId: string;
    path: readonly BattlefieldPointV1[];
    placements: readonly BattlefieldPlacementV1[];
  } | null;
  actions: {
    finite: readonly BattlefieldActionV1[];
    parameterDomains: readonly BattlefieldParameterDomainV1[];
  };
  diagnostics: readonly string[];
  trainingTruth: false;
}

type UnknownRecord = Record<string, unknown>;

const DEFAULT_WIDTH_MILLI_INCHES = 54_000;
const DEFAULT_HEIGHT_MILLI_INCHES = 36_000;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function rows(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.map(record).filter((entry): entry is UnknownRecord => Boolean(entry))
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function safeInteger(value: unknown): number | null {
  const numeric = safeNumber(value);
  return numeric !== null && Number.isSafeInteger(numeric) ? numeric : null;
}

function positiveInteger(value: unknown): number | null {
  const numeric = safeInteger(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

function milliFrom(
  recordValue: UnknownRecord,
  milliKey: string,
  inchesKey: string,
  millimetresKey?: string,
): number | null {
  const direct = positiveInteger(recordValue[milliKey]);
  if (direct !== null) return direct;
  const inches = safeNumber(recordValue[inchesKey]);
  const millimetres = millimetresKey
    ? safeNumber(recordValue[millimetresKey])
    : null;
  if ((inches === null || inches <= 0)
    && (millimetres === null || millimetres <= 0)) return null;
  const milli = inches !== null && inches > 0
    ? Math.round(inches * 1000)
    : Math.round((Number(millimetres) / 25.4) * 1000);
  return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
}

function pointFrom(value: unknown): BattlefieldPointV1 | null {
  const source = record(value);
  if (!source) return null;
  const nested = record(source.coordinate)
    || record(source.center)
    || record(source.centre);
  if (nested) {
    const nestedPoint = pointFrom(nested);
    if (nestedPoint) return nestedPoint;
  }
  const directX = safeInteger(source.xMilliInches);
  const directY = safeInteger(source.yMilliInches);
  if (directX !== null && directY !== null) {
    return { xMilliInches: directX, yMilliInches: directY };
  }
  const x = safeNumber(source.xInches ?? source.x);
  const y = safeNumber(source.yInches ?? source.y);
  if (x === null || y === null) return null;
  const xMilliInches = Math.round(x * 1000);
  const yMilliInches = Math.round(y * 1000);
  return Number.isSafeInteger(xMilliInches) && Number.isSafeInteger(yMilliInches)
    ? { xMilliInches, yMilliInches }
    : null;
}

function shapeFrom(value: unknown): BattlefieldBaseShape | null {
  const shape = text(value).toLowerCase();
  if (shape === "round" || shape === "circle") return "round";
  if (shape === "oval" || shape === "ellipse") return "oval";
  if (shape === "rectangle" || shape === "rect"
    || shape === "axis_aligned_rectangle") return "rectangle";
  return null;
}

function dimensionsFrom(source: UnknownRecord): {
  shape: BattlefieldBaseShape | null;
  width: number | null;
  depth: number | null;
  rotation: number;
} {
  const geometry = record(source.baseGeometry)
    || record(source.geometry)
    || record(source.rulesFootprint)
    || record(source.rulesFootprintMilliInches)
    || record(source.footprint)
    || {};
  const combined = { ...geometry, ...source };
  const diameter = milliFrom(
    combined,
    "baseDiameterMilliInches",
    "baseDiameterInches",
    "baseDiameterMm",
  ) ?? milliFrom(combined, "diameterMilliInches", "diameterInches", "diameterMm")
    ?? milliFrom(combined, "unusedDiameterMilliInches", "unusedDiameterInches", "diameterMillimeters")
    ?? milliFrom(combined, "unusedDiameterMilliInches", "unusedDiameterInches", "diameterMillimetres")
    ?? milliFrom(combined, "unusedBaseMilliInches", "unusedBaseInches", "baseMm");
  const radius = milliFrom(
    combined,
    "radiusMilliInches",
    "radiusInches",
    "radiusMm",
  );
  const circleDiameter = diameter ?? (radius === null ? null : radius * 2);
  const width = milliFrom(
    combined,
    "baseWidthMilliInches",
    "baseWidthInches",
    "baseWidthMm",
  ) ?? circleDiameter;
  const depth = milliFrom(
    combined,
    "baseDepthMilliInches",
    "baseDepthInches",
    "baseDepthMm",
  ) ?? circleDiameter;
  const rotation = safeNumber(combined.baseRotationDegrees)
    ?? safeNumber(combined.rotationDegrees)
    ?? 0;
  return {
    shape: shapeFrom(combined.baseShape ?? combined.shape)
      ?? (circleDiameter !== null ? "round" : null),
    width,
    depth,
    rotation,
  };
}

function statusLabels(piece: UnknownRecord, model: UnknownRecord): string[] {
  const values = [
    ...(Array.isArray(piece.statuses) ? piece.statuses : []),
    ...(Array.isArray(model.statuses) ? model.statuses : []),
  ];
  return values.map((value) => text(record(value)?.id ?? record(value)?.effect ?? value))
    .filter(Boolean);
}

function areaFrom(
  value: UnknownRecord,
  index: number,
  kind: BattlefieldAreaV1["kind"],
  diagnostics: string[],
): BattlefieldAreaV1 | null {
  if (value.isRemoved === true || value.isDestroyed === true) return null;
  const id = text(value.id)
    || text(value.tokenId)
    || text(value.markerId)
    || `${kind}-${index + 1}`;
  const footprint = record(value.footprint)
    || record(value.rulesFootprint)
    || record(value.rulesFootprintMilliInches);
  const minX = safeInteger(footprint?.minXMilliInches);
  const maxX = safeInteger(footprint?.maxXMilliInches);
  const minY = safeInteger(footprint?.minYMilliInches);
  const maxY = safeInteger(footprint?.maxYMilliInches);
  const boundedRectangle = minX !== null && maxX !== null
    && minY !== null && maxY !== null
    && maxX > minX && maxY > minY
    ? {
        point: {
          xMilliInches: Math.round((minX + maxX) / 2),
          yMilliInches: Math.round((minY + maxY) / 2),
        },
        width: maxX - minX,
        depth: maxY - minY,
      }
    : null;
  const point = pointFrom(value) ?? pointFrom(footprint) ?? boundedRectangle?.point ?? null;
  const geometry = dimensionsFrom(value);
  const width = geometry.width
    ?? boundedRectangle?.width
    ?? milliFrom(value, "widthMilliInches", "widthInches")
    ?? milliFrom(value, "diameterMilliInches", "diameterInches", "diameterMillimeters");
  const depth = geometry.depth
    ?? boundedRectangle?.depth
    ?? milliFrom(value, "heightMilliInches", "heightInches")
    ?? milliFrom(value, "diameterMilliInches", "diameterInches", "diameterMillimeters");
  const shape = geometry.shape
    ?? shapeFrom(record(value.rulesFootprint)?.shape)
    ?? shapeFrom(footprint?.shape ?? value.shape);
  const geometryRenderable = Boolean(point && shape && width && depth);
  if (!point) diagnostics.push(`${kind}:${id}:coordinate_missing`);
  if (!geometryRenderable) diagnostics.push(`${kind}:${id}:geometry_unknown_fail_closed`);
  if (!point) return null;
  return {
    id,
    kind,
    label: text(value.name)
      || text(value.label)
      || text(value.tokenKind)
      || text(value.markerRole)
      || text(value.markerKind)
      || id,
    ...point,
    shape,
    widthMilliInches: width,
    depthMilliInches: depth,
    rotationDegrees: geometry.rotation,
    geometryRenderable,
  };
}

function actionLabel(action: UnknownRecord): string {
  const actionType = text(action.actionType) || "action";
  const pieceId = text(action.pieceId);
  const target = text(action.targetId ?? record(action.target)?.id);
  return [actionType, pieceId, target].filter(Boolean).join(" · ");
}

function parameterSupport(domain: UnknownRecord): BattlefieldParameterSupport {
  const kind = text(domain.parameterKind);
  if (kind === "official_standard_move"
    || /^official_standard_move_path_v\d+$/u.test(kind)) {
    return "official_standard_move";
  }
  const schema = record(domain.parameterSchema);
  const required = Array.isArray(schema?.required) ? schema.required.map(text) : [];
  if (!kind && required.length === 1 && required[0] === "path") {
    return "legacy_path_only";
  }
  return "unsupported";
}

function normalizedPointMap(value: unknown): Record<string, BattlefieldPointV1> {
  const source = record(value) || {};
  return Object.fromEntries(Object.entries(source)
    .map(([key, point]) => [key, pointFrom(point)] as const)
    .filter((entry): entry is readonly [string, BattlefieldPointV1] => Boolean(entry[1])));
}

function parameterDomainFrom(value: UnknownRecord): BattlefieldParameterDomainV1 | null {
  const domainId = text(value.domainId);
  if (!domainId) return null;
  const constraints = record(value.constraints) || {};
  const parameterSchema = record(value.parameterSchema) || {};
  const modelIds = Array.isArray(constraints.modelIds)
    ? constraints.modelIds.map(text).filter(Boolean)
    : [];
  const modelStartPoints = normalizedPointMap(constraints.modelStartPoints);
  const maxPathPoints = positiveInteger(
    parameterSchema.maxCanonicalPathPoints ?? parameterSchema.maxCanonicalPoints,
  );
  return {
    domainId,
    parameterKind: text(value.parameterKind) || null,
    actionType: text(value.actionType) || "parameterized_action",
    pieceId: text(value.pieceId) || null,
    label: [text(value.actionType) || "parameterized", text(value.pieceId)].filter(Boolean).join(" · "),
    support: parameterSupport(value),
    modelIds,
    modelStartPoints,
    start: pointFrom(constraints.start),
    maxPathPoints,
    exactRemainingPlacementCount: safeInteger(parameterSchema.exactRemainingPlacementCount),
    raw: value,
  };
}

function previewPathFrom(pendingPreview: UnknownRecord | null): BattlefieldPointV1[] {
  if (!pendingPreview) return [];
  const core = record(pendingPreview.core);
  const action = record(core?.action);
  const movePlan = record(action?.movePlan);
  const canonicalPath = movePlan?.canonicalPath ?? action?.canonicalPath;
  const pathContainer = record(canonicalPath);
  const proposal = record(core?.proposal);
  const parameters = record(proposal?.parameters);
  const candidates = Array.isArray(canonicalPath)
    ? canonicalPath
    : Array.isArray(pathContainer?.points)
      ? pathContainer.points
      : Array.isArray(parameters?.path)
        ? parameters.path
        : [];
  return candidates.map(pointFrom)
    .filter((point): point is BattlefieldPointV1 => Boolean(point));
}

function previewPlacementsFrom(
  pendingPreview: UnknownRecord | null,
  models: readonly BattlefieldModelV1[],
  diagnostics: string[],
): BattlefieldPlacementV1[] {
  if (!pendingPreview) return [];
  const core = record(pendingPreview.core);
  const action = record(core?.action);
  const movePlan = record(action?.movePlan);
  const candidates = rows(movePlan?.finalModelPositions);
  const modelsById = new Map(models.map((model) => [model.id, model]));
  return candidates.map((candidate, index) => {
    const modelId = text(candidate.modelId) || `preview-model-${index + 1}`;
    const point = pointFrom(candidate);
    if (!point) {
      diagnostics.push(`preview_placement:${modelId}:coordinate_missing`);
      return null;
    }
    const model = modelsById.get(modelId);
    if (!model?.geometryRenderable) {
      diagnostics.push(`preview_placement:${modelId}:model_geometry_unknown_fail_closed`);
    }
    return {
      modelId,
      ...point,
      baseShape: model?.baseShape ?? null,
      baseWidthMilliInches: model?.baseWidthMilliInches ?? null,
      baseDepthMilliInches: model?.baseDepthMilliInches ?? null,
      baseRotationDegrees: model?.baseRotationDegrees ?? 0,
      geometryRenderable: model?.geometryRenderable === true,
    };
  }).filter((entry): entry is BattlefieldPlacementV1 => Boolean(entry));
}

export function projectStarcraftTmgBattlefieldPresentationV1(input: {
  roomProjection?: unknown;
  legalSpace?: unknown;
  pendingPreview?: unknown;
  selectedModelId?: string | null;
}): BattlefieldSceneV1 {
  const projection = record(input.roomProjection);
  const room = record(projection?.room);
  const state = record(projection?.state);
  const board = record(state?.board);
  const legalSpace = record(input.legalSpace);
  const pendingPreview = record(input.pendingPreview);
  const diagnostics: string[] = [];
  const widthMilliInches = milliFrom(board || {}, "widthMilliInches", "widthInches")
    ?? DEFAULT_WIDTH_MILLI_INCHES;
  const heightMilliInches = milliFrom(board || {}, "heightMilliInches", "heightInches")
    ?? DEFAULT_HEIGHT_MILLI_INCHES;
  if (!board) diagnostics.push("board:missing_using_display_default_54x36");

  const models: BattlefieldModelV1[] = [];
  const unitAnchors: BattlefieldUnitAnchorV1[] = [];
  for (const [pieceIndex, piece] of rows(state?.pieces).entries()) {
    const pieceId = text(piece.id) || `piece-${pieceIndex + 1}`;
    const label = text(piece.name) || text(piece.unitName) || pieceId;
    const sideKey = text(piece.sideKey) || "unknown_side";
    if (Array.isArray(piece.models)) {
      for (const [modelIndex, model] of rows(piece.models).entries()) {
        if (model.isRemoved === true || model.isOnField === false) continue;
        const id = text(model.id) || `${pieceId}-model-${modelIndex + 1}`;
        const point = pointFrom(model);
        const geometry = dimensionsFrom({ ...piece, ...model });
        if (!point) {
          diagnostics.push(`model:${id}:coordinate_missing`);
          continue;
        }
        const geometryRenderable = Boolean(geometry.shape && geometry.width && geometry.depth);
        if (!geometryRenderable) diagnostics.push(`model:${id}:geometry_unknown_fail_closed`);
        models.push({
          kind: "model",
          id,
          pieceId,
          label: piece.models.length > 1 ? `${label} ${modelIndex + 1}` : label,
          sideKey,
          ...point,
          baseShape: geometry.shape,
          baseWidthMilliInches: geometry.width,
          baseDepthMilliInches: geometry.depth,
          baseRotationDegrees: geometry.rotation,
          geometryRenderable,
          selected: input.selectedModelId === id,
          destroyed: model.isDestroyed === true,
          statuses: statusLabels(piece, model),
        });
      }
      continue;
    }
    const anchorPoint = pointFrom(piece);
    if (!anchorPoint) {
      diagnostics.push(`unit_anchor:${pieceId}:coordinate_missing`);
      continue;
    }
    unitAnchors.push({
      kind: "unit_anchor",
      id: `${pieceId}:unit-anchor`,
      pieceId,
      label: `${label} · unit anchor`,
      sideKey,
      ...anchorPoint,
      currentModels: safeInteger(piece.currentModels),
      selected: input.selectedModelId === `${pieceId}:unit-anchor`,
      geometryRenderable: false,
    });
    diagnostics.push(`unit_anchor:${pieceId}:model_coordinates_unavailable`);
  }

  const areas = (value: unknown, kind: BattlefieldAreaV1["kind"]) => rows(value)
    .map((entry, index) => areaFrom(entry, index, kind, diagnostics))
    .filter((entry): entry is BattlefieldAreaV1 => Boolean(entry));

  const finiteActions = rows(legalSpace?.finiteActions).map((entry) => {
    const action = record(entry.action) || {};
    return {
      actionKey: text(entry.actionKey),
      actionType: text(action.actionType) || "action",
      pieceId: text(action.pieceId) || null,
      label: actionLabel(action),
      confirmationClass: text(entry.confirmationClass) || null,
    };
  }).filter((entry) => Boolean(entry.actionKey));

  const parameterDomains = rows(legalSpace?.parameterDomains)
    .map(parameterDomainFrom)
    .filter((entry): entry is BattlefieldParameterDomainV1 => Boolean(entry));
  const previewPath = previewPathFrom(pendingPreview);
  const previewPlacements = previewPlacementsFrom(pendingPreview, models, diagnostics);
  const previewId = text(pendingPreview?.previewId) || null;
  const terrain = areas(board?.terrain, "terrain");
  const markers = areas([
    ...rows(board?.centerMarkers),
    ...rows(board?.markers),
    ...rows(board?.missionMarkers),
    ...rows(board?.effectMarkers),
    ...rows(record(state?.officialMissionMarkerPlacement)?.missionMarkers),
    ...rows(state?.officialBattlefieldMarkers),
  ], "marker");
  const tokens = areas([
    ...rows(board?.tokens),
    ...rows(state?.officialBattlefieldTokens),
  ], "token");

  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_presentation_v1",
    roomId: text(room?.roomId) || null,
    stateRevision: safeInteger(room?.stateRevision),
    stateHash: text(room?.stateHash) || null,
    board: Object.freeze({ widthMilliInches, heightMilliInches }),
    widthMilliInches,
    heightMilliInches,
    models: Object.freeze(models),
    unitAnchors: Object.freeze(unitAnchors),
    terrain: Object.freeze(terrain),
    markers: Object.freeze(markers),
    tokens: Object.freeze(tokens),
    finiteActions: Object.freeze(finiteActions),
    parameterDomains: Object.freeze(parameterDomains),
    previewPath: Object.freeze(previewPath),
    previewPlacements: Object.freeze(previewPlacements),
    previewId,
    preview: previewId
      ? Object.freeze({
          previewId,
          path: Object.freeze(previewPath),
          placements: Object.freeze(previewPlacements),
        })
      : null,
    actions: Object.freeze({
      finite: Object.freeze(finiteActions),
      parameterDomains: Object.freeze(parameterDomains),
    }),
    diagnostics: Object.freeze(diagnostics),
    trainingTruth: false,
  });
}

export interface BattlefieldViewportV1 {
  schemaVersion: "starcraft_tmg_battlefield_viewport_v1";
  pixelsPerMilliInch: number;
  fitPixelsPerMilliInch: number;
  letterboxOffsetXPixels: number;
  letterboxOffsetYPixels: number;
  boardPixelWidth: number;
  boardPixelHeight: number;
  zoom: number;
  worldToViewport(point: BattlefieldPointV1): { xPixels: number; yPixels: number };
  viewportToWorld(point: { xPixels: number; yPixels: number }): BattlefieldPointV1;
}

export function projectStarcraftTmgBattlefieldViewportV1(input: {
  boardWidthMilliInches: number;
  boardHeightMilliInches: number;
  viewportWidthPixels: number;
  viewportHeightPixels: number;
  zoom?: number;
  panXPixels?: number;
  panYPixels?: number;
}): BattlefieldViewportV1 {
  const boardWidth = positiveInteger(input.boardWidthMilliInches);
  const boardHeight = positiveInteger(input.boardHeightMilliInches);
  const viewportWidth = safeNumber(input.viewportWidthPixels);
  const viewportHeight = safeNumber(input.viewportHeightPixels);
  if (!boardWidth || !boardHeight || !viewportWidth || !viewportHeight
    || viewportWidth <= 0 || viewportHeight <= 0) {
    throw new Error("BATTLEFIELD_VIEWPORT_DIMENSIONS_INVALID");
  }
  const zoom = Math.max(1, Math.min(6, safeNumber(input.zoom) ?? 1));
  const fitPixelsPerMilliInch = Math.min(
    viewportWidth / boardWidth,
    viewportHeight / boardHeight,
  );
  const pixelsPerMilliInch = fitPixelsPerMilliInch * zoom;
  const boardPixelWidth = boardWidth * pixelsPerMilliInch;
  const boardPixelHeight = boardHeight * pixelsPerMilliInch;
  const letterboxOffsetXPixels = ((viewportWidth - boardPixelWidth) / 2)
    + (safeNumber(input.panXPixels) ?? 0);
  const letterboxOffsetYPixels = ((viewportHeight - boardPixelHeight) / 2)
    + (safeNumber(input.panYPixels) ?? 0);
  return Object.freeze({
    schemaVersion: "starcraft_tmg_battlefield_viewport_v1",
    pixelsPerMilliInch,
    fitPixelsPerMilliInch,
    letterboxOffsetXPixels,
    letterboxOffsetYPixels,
    boardPixelWidth,
    boardPixelHeight,
    zoom,
    worldToViewport(point: BattlefieldPointV1) {
      return {
        xPixels: letterboxOffsetXPixels + (point.xMilliInches * pixelsPerMilliInch),
        yPixels: letterboxOffsetYPixels
          + ((boardHeight - point.yMilliInches) * pixelsPerMilliInch),
      };
    },
    viewportToWorld(point: { xPixels: number; yPixels: number }) {
      return {
        xMilliInches: Math.round((point.xPixels - letterboxOffsetXPixels) / pixelsPerMilliInch),
        yMilliInches: Math.round(boardHeight
          - ((point.yPixels - letterboxOffsetYPixels) / pixelsPerMilliInch)),
      };
    },
  });
}

// Compatibility alias for the first internal draft; callers should use the
// explicit Project D projection name above.
export const createBattlefieldPresentationV1 =
  projectStarcraftTmgBattlefieldPresentationV1;
