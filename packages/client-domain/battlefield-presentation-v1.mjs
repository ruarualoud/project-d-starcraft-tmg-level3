const DEFAULT_WIDTH_MILLI_INCHES = 54_000;
const DEFAULT_HEIGHT_MILLI_INCHES = 36_000;
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : null;
}
function rows(value) {
    return Array.isArray(value)
        ? value.map(record).filter((entry) => Boolean(entry))
        : [];
}
function text(value) {
    return typeof value === "string" ? value.trim() : "";
}
function safeNumber(value) {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}
function safeInteger(value) {
    const numeric = safeNumber(value);
    return numeric !== null && Number.isSafeInteger(numeric) ? numeric : null;
}
function positiveInteger(value) {
    const numeric = safeInteger(value);
    return numeric !== null && numeric > 0 ? numeric : null;
}
function milliFrom(recordValue, milliKey, inchesKey, millimetresKey) {
    const direct = positiveInteger(recordValue[milliKey]);
    if (direct !== null)
        return direct;
    const inches = safeNumber(recordValue[inchesKey]);
    const millimetres = millimetresKey
        ? safeNumber(recordValue[millimetresKey])
        : null;
    if ((inches === null || inches <= 0)
        && (millimetres === null || millimetres <= 0))
        return null;
    const milli = inches !== null && inches > 0
        ? Math.round(inches * 1000)
        : Math.round((Number(millimetres) / 25.4) * 1000);
    return Number.isSafeInteger(milli) && milli > 0 ? milli : null;
}
function pointFrom(value) {
    const source = record(value);
    if (!source)
        return null;
    const nested = record(source.coordinate)
        || record(source.center)
        || record(source.centre);
    if (nested) {
        const nestedPoint = pointFrom(nested);
        if (nestedPoint)
            return nestedPoint;
    }
    const directX = safeInteger(source.xMilliInches);
    const directY = safeInteger(source.yMilliInches);
    if (directX !== null && directY !== null) {
        return { xMilliInches: directX, yMilliInches: directY };
    }
    const x = safeNumber(source.xInches ?? source.x);
    const y = safeNumber(source.yInches ?? source.y);
    if (x === null || y === null)
        return null;
    const xMilliInches = Math.round(x * 1000);
    const yMilliInches = Math.round(y * 1000);
    return Number.isSafeInteger(xMilliInches) && Number.isSafeInteger(yMilliInches)
        ? { xMilliInches, yMilliInches }
        : null;
}
function shapeFrom(value) {
    const shape = text(value).toLowerCase();
    if (shape === "round" || shape === "circle")
        return "round";
    if (shape === "oval" || shape === "ellipse")
        return "oval";
    if (shape === "rectangle" || shape === "rect"
        || shape === "axis_aligned_rectangle")
        return "rectangle";
    return null;
}
function dimensionsFrom(source) {
    const geometry = record(source.baseGeometry)
        || record(source.geometry)
        || record(source.rulesFootprint)
        || record(source.rulesFootprintMilliInches)
        || record(source.footprint)
        || {};
    const combined = { ...geometry, ...source };
    const diameter = milliFrom(combined, "baseDiameterMilliInches", "baseDiameterInches", "baseDiameterMm") ?? milliFrom(combined, "diameterMilliInches", "diameterInches", "diameterMm")
        ?? milliFrom(combined, "unusedDiameterMilliInches", "unusedDiameterInches", "diameterMillimeters")
        ?? milliFrom(combined, "unusedDiameterMilliInches", "unusedDiameterInches", "diameterMillimetres")
        ?? milliFrom(combined, "unusedBaseMilliInches", "unusedBaseInches", "baseMm");
    const radius = milliFrom(combined, "radiusMilliInches", "radiusInches", "radiusMm");
    const circleDiameter = diameter ?? (radius === null ? null : radius * 2);
    const width = milliFrom(combined, "baseWidthMilliInches", "baseWidthInches", "baseWidthMm") ?? circleDiameter;
    const depth = milliFrom(combined, "baseDepthMilliInches", "baseDepthInches", "baseDepthMm") ?? circleDiameter;
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
export function projectRotatedBaseBoundsV1(input) {
    const shape = shapeFrom(input?.baseShape);
    const width = positiveInteger(input?.baseWidthMilliInches);
    const depth = positiveInteger(input?.baseDepthMilliInches);
    const x = safeInteger(input?.xMilliInches);
    const y = safeInteger(input?.yMilliInches);
    const rotation = safeNumber(input?.baseRotationDegrees) ?? 0;
    if (!shape || !width || !depth || x === null || y === null)
        return null;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const extentX = shape === "rectangle"
        ? (Math.abs(halfWidth * cos) + Math.abs(halfDepth * sin))
        : Math.sqrt(((halfWidth * cos) ** 2) + ((halfDepth * sin) ** 2));
    const extentY = shape === "rectangle"
        ? (Math.abs(halfWidth * sin) + Math.abs(halfDepth * cos))
        : Math.sqrt(((halfWidth * sin) ** 2) + ((halfDepth * cos) ** 2));
    return Object.freeze({
        minXMilliInches: x - extentX,
        maxXMilliInches: x + extentX,
        minYMilliInches: y - extentY,
        maxYMilliInches: y + extentY,
        extentXMilliInches: extentX,
        extentYMilliInches: extentY,
    });
}
export function isBattlefieldBaseWithinBoardV1(input) {
    const bounds = projectRotatedBaseBoundsV1(input);
    const width = positiveInteger(input?.boardWidthMilliInches);
    const height = positiveInteger(input?.boardHeightMilliInches);
    return Boolean(bounds && width && height
        && bounds.minXMilliInches >= 0
        && bounds.maxXMilliInches <= width
        && bounds.minYMilliInches >= 0
        && bounds.maxYMilliInches <= height);
}
function projectedWeaponRangeReferences(piece) {
    return rows(piece.weapons).map((weapon) => {
        const rangeText = text(weapon.range);
        const numericRange = /^\d+(?:\.\d+)?$/u.test(rangeText)
            ? safeNumber(rangeText)
            : null;
        return {
            weaponName: text(weapon.name ?? weapon.weaponName) || "weapon",
            printedRange: rangeText || null,
            projectedRangeMilliInches: numericRange !== null && numericRange > 0
                ? Math.round(numericRange * 1000)
                : null,
        };
    });
}
function statusLabels(piece, model) {
    const values = [
        ...(Array.isArray(piece.statuses) ? piece.statuses : []),
        ...(Array.isArray(model.statuses) ? model.statuses : []),
    ];
    return values.map((value) => text(record(value)?.id ?? record(value)?.effect ?? value))
        .filter(Boolean);
}
function areaFrom(value, index, kind, diagnostics) {
    if (value.isRemoved === true || value.isDestroyed === true)
        return null;
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
        ?? shapeFrom(footprint?.shape ?? value.shape ?? value.footprint);
    const geometryRenderable = Boolean(point && shape && width && depth);
    if (!point)
        diagnostics.push(`${kind}:${id}:coordinate_missing`);
    if (!geometryRenderable)
        diagnostics.push(`${kind}:${id}:geometry_unknown_fail_closed`);
    if (!point)
        return null;
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
function actionLabel(action) {
    const actionType = text(action.actionType) || "action";
    const pieceId = text(action.pieceId);
    const target = text(action.targetId ?? record(action.target)?.id);
    return [actionType, pieceId, target].filter(Boolean).join(" · ");
}
function parameterSupport(domain) {
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
function normalizedPointMap(value) {
    const source = record(value) || {};
    return Object.fromEntries(Object.entries(source)
        .map(([key, point]) => [key, pointFrom(point)])
        .filter((entry) => Boolean(entry[1])));
}
function parameterDomainFrom(value) {
    const domainId = text(value.domainId);
    if (!domainId)
        return null;
    const constraints = record(value.constraints) || {};
    const parameterSchema = record(value.parameterSchema) || {};
    const modelIds = Array.isArray(constraints.modelIds)
        ? constraints.modelIds.map(text).filter(Boolean)
        : [];
    const modelStartPoints = normalizedPointMap(constraints.modelStartPoints);
    const maxPathPoints = positiveInteger(parameterSchema.maxCanonicalPathPoints ?? parameterSchema.maxCanonicalPoints);
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
function previewPathFrom(pendingPreview) {
    if (!pendingPreview)
        return [];
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
        .filter((point) => Boolean(point));
}
function previewPlacementsFrom(pendingPreview, models, diagnostics) {
    if (!pendingPreview)
        return [];
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
    }).filter((entry) => Boolean(entry));
}
export function projectStarcraftTmgBattlefieldPresentationV1(input) {
    const projection = record(input.roomProjection);
    const room = record(projection?.room);
    const state = record(projection?.state);
    const board = record(state?.board);
    const legalSpace = record(input.legalSpace);
    const pendingPreview = record(input.pendingPreview);
    const diagnostics = [];
    const widthMilliInches = milliFrom(board || {}, "widthMilliInches", "widthInches")
        ?? DEFAULT_WIDTH_MILLI_INCHES;
    const heightMilliInches = milliFrom(board || {}, "heightMilliInches", "heightInches")
        ?? DEFAULT_HEIGHT_MILLI_INCHES;
    if (!board)
        diagnostics.push("board:missing_using_display_default_54x36");
    const models = [];
    const unitAnchors = [];
    for (const [pieceIndex, piece] of rows(state?.pieces).entries()) {
        const pieceId = text(piece.id) || `piece-${pieceIndex + 1}`;
        const unitId = text(piece.unitId) || null;
        const label = text(piece.name) || text(piece.unitName) || pieceId;
        const sideKey = text(piece.sideKey) || "unknown_side";
        const weaponRangeReferences = projectedWeaponRangeReferences(piece);
        const maxProjectedWeaponRangeMilliInches = weaponRangeReferences.reduce((maximum, weapon) => (
            Math.max(maximum, weapon.projectedRangeMilliInches ?? 0)
        ), 0) || null;
        if (Array.isArray(piece.models)) {
            for (const [modelIndex, model] of rows(piece.models).entries()) {
                if (model.isRemoved === true || model.isOnField === false)
                    continue;
                const id = text(model.id) || `${pieceId}-model-${modelIndex + 1}`;
                const point = pointFrom(model);
                const geometry = dimensionsFrom({ ...piece, ...model });
                if (!point) {
                    diagnostics.push(`model:${id}:coordinate_missing`);
                    continue;
                }
                const geometryRenderable = Boolean(geometry.shape && geometry.width && geometry.depth);
                if (!geometryRenderable)
                    diagnostics.push(`model:${id}:geometry_unknown_fail_closed`);
                const baseBounds = geometryRenderable
                    ? projectRotatedBaseBoundsV1({
                        ...point,
                        baseShape: geometry.shape,
                        baseWidthMilliInches: geometry.width,
                        baseDepthMilliInches: geometry.depth,
                        baseRotationDegrees: geometry.rotation,
                    })
                    : null;
                const withinBoard = geometryRenderable
                    ? isBattlefieldBaseWithinBoardV1({
                        ...point,
                        baseShape: geometry.shape,
                        baseWidthMilliInches: geometry.width,
                        baseDepthMilliInches: geometry.depth,
                        baseRotationDegrees: geometry.rotation,
                        boardWidthMilliInches: widthMilliInches,
                        boardHeightMilliInches: heightMilliInches,
                    })
                    : false;
                if (geometryRenderable && !withinBoard)
                    diagnostics.push(`model:${id}:base_edge_outside_board`);
                models.push({
                    kind: "model",
                    id,
                    pieceId,
                    unitId,
                    label: piece.models.length > 1 ? `${label} ${modelIndex + 1}` : label,
                    sideKey,
                    ...point,
                    baseShape: geometry.shape,
                    baseWidthMilliInches: geometry.width,
                    baseDepthMilliInches: geometry.depth,
                    baseRotationDegrees: geometry.rotation,
                    baseBounds,
                    withinBoard,
                    geometryRenderable,
                    selected: input.selectedModelId === id,
                    destroyed: model.isDestroyed === true,
                    statuses: statusLabels(piece, model),
                    weaponRangeReferences: Object.freeze(weaponRangeReferences),
                    maxProjectedWeaponRangeMilliInches,
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
            unitId,
            label: `${label} · unit anchor`,
            sideKey,
            ...anchorPoint,
            currentModels: safeInteger(piece.currentModels),
            selected: input.selectedModelId === `${pieceId}:unit-anchor`,
            geometryRenderable: false,
        });
        diagnostics.push(`unit_anchor:${pieceId}:model_coordinates_unavailable`);
    }
    const areas = (value, kind) => rows(value)
        .map((entry, index) => areaFrom(entry, index, kind, diagnostics))
        .filter((entry) => Boolean(entry));
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
        .filter((entry) => Boolean(entry));
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
        board: Object.freeze({
            widthMilliInches,
            heightMilliInches,
            scenarioMapId: text(board?.scenarioMapId) || null,
            scenarioMapName: text(board?.scenarioMapName) || null,
            displayMapAssetKey: text(board?.scenarioMapId) ? "alien_temple_local_v1" : null,
        }),
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
        threatReference: Object.freeze({
            defaultVisible: false,
            authority: "projected_printed_weapon_range_reference_only",
            excludes: Object.freeze([
                "movement",
                "line_of_sight",
                "weapon_keyword_modifiers",
                "abilities",
                "legal_space",
            ]),
        }),
        trainingTruth: false,
    });
}
export function projectStarcraftTmgBattlefieldViewportV1(input) {
    const boardWidth = positiveInteger(input.boardWidthMilliInches);
    const boardHeight = positiveInteger(input.boardHeightMilliInches);
    const viewportWidth = safeNumber(input.viewportWidthPixels);
    const viewportHeight = safeNumber(input.viewportHeightPixels);
    if (!boardWidth || !boardHeight || !viewportWidth || !viewportHeight
        || viewportWidth <= 0 || viewportHeight <= 0) {
        throw new Error("BATTLEFIELD_VIEWPORT_DIMENSIONS_INVALID");
    }
    const zoom = Math.max(1, Math.min(6, safeNumber(input.zoom) ?? 1));
    const fitPixelsPerMilliInch = Math.min(viewportWidth / boardWidth, viewportHeight / boardHeight);
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
        worldToViewport(point) {
            return {
                xPixels: letterboxOffsetXPixels + (point.xMilliInches * pixelsPerMilliInch),
                yPixels: letterboxOffsetYPixels
                    + ((boardHeight - point.yMilliInches) * pixelsPerMilliInch),
            };
        },
        viewportToWorld(point) {
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
export const createBattlefieldPresentationV1 = projectStarcraftTmgBattlefieldPresentationV1;
