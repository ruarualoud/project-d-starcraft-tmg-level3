import { resolveStarcraftTmgBattlefieldMapMediaV2 } from
    "./battlefield-media-catalog-v1.mjs";
import { getOfficialDelegatedRosterSpatialDomainV1 } from
    "../product-composition/official-selected-roster-spatial-parameter-contract-v1.mjs";
import { readMeasuredFootprintContourV1 } from "../rule-atoms/measured-footprint-contour-v1.mjs";

import { getOfficialDisplacementMovementGeometryV1 } from "../rule-atoms/official-displacement-movement-geometry-v1.mjs";

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
    if (usesBattlefieldBaseOutlineV1(shape))
        return shape;
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
    const shape = shapeFrom(combined.baseShape ?? combined.shape)
        ?? (circleDiameter !== null ? "round" : null);
    return { shape, width, depth, rotation, ...outlineFields(shape, combined) };
}
function outlineFields(shape, source) {
    if (shape === "measured_contour") {
        return { localVerticesMilliInches: source.baseLocalVerticesMilliInches
            ?? source.localVerticesMilliInches ?? null };
    }
    return shape === "orthogonal_cross" ? {
        horizontalArmDepthMilliInches: milliFrom(source, "horizontalArmDepthMilliInches", "baseHorizontalArmDepthInches"),
        verticalArmWidthMilliInches: milliFrom(source, "verticalArmWidthMilliInches", "baseVerticalArmWidthInches"),
    } : {};
}
export function projectCrossBaseOutlineV1(input) {
    if (input?.baseShape !== "orthogonal_cross") return null;
    const width = positiveInteger(input.baseWidthMilliInches);
    const depth = positiveInteger(input.baseDepthMilliInches);
    const horizontal = positiveInteger(input.horizontalArmDepthMilliInches);
    const vertical = positiveInteger(input.verticalArmWidthMilliInches);
    const x = safeInteger(input.xMilliInches);
    const y = safeInteger(input.yMilliInches);
    if (!width || !depth || !horizontal || !vertical || horizontal >= depth || vertical >= width || x === null || y === null) {
        return null;
    }
    const angle = (safeNumber(input.baseRotationDegrees) ?? 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const w = width / 2, d = depth / 2, h = horizontal / 2, v = vertical / 2;
    return [[-v, -d], [v, -d], [v, -h], [w, -h], [w, h], [v, h],
        [v, d], [-v, d], [-v, h], [-w, h], [-w, -h], [-v, -h]]
        .map(([dx, dy]) => ({
            xMilliInches: x + Number((dx * cos - dy * sin).toFixed(6)),
            yMilliInches: y + Number((dx * sin + dy * cos).toFixed(6)),
        }));
}
export function usesBattlefieldBaseOutlineV1(shape) {
    return shape === "orthogonal_cross" || shape === "measured_contour";
}
export function projectModelBaseOutlineV1(input) {
    if (input?.baseShape !== "measured_contour") return projectCrossBaseOutlineV1(input);
    const x = safeInteger(input.xMilliInches);
    const y = safeInteger(input.yMilliInches);
    if (x === null || y === null) return null;
    const rawRotation = safeNumber(input.baseRotationDegrees) ?? 0;
    const rotation = Number((((rawRotation % 360) + 360) % 360).toFixed(6));
    const angle = rotation * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    try {
        return readMeasuredFootprintContourV1(input.localVerticesMilliInches,
            input.baseWidthMilliInches, input.baseDepthMilliInches)
            .map(({ xMilliInches: dx, yMilliInches: dy }) => ({
                xMilliInches: Number((x + dx * cos - dy * sin).toFixed(6)),
                yMilliInches: Number((y + dx * sin + dy * cos).toFixed(6)),
            }));
    } catch {
        return null;
    }
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
    if (usesBattlefieldBaseOutlineV1(shape)) {
        const outline = projectModelBaseOutlineV1(input);
        if (!outline) return null;
        const xs = outline.map(point => point.xMilliInches);
        const ys = outline.map(point => point.yMilliInches);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        return Object.freeze({ minXMilliInches: minX, maxXMilliInches: maxX,
            minYMilliInches: minY, maxYMilliInches: maxY,
            extentXMilliInches: shape === "measured_contour" ? Math.max(x - minX, maxX - x) : maxX - x,
            extentYMilliInches: shape === "measured_contour" ? Math.max(y - minY, maxY - y) : maxY - y });
    }
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
    // A room-bound rules footprint is the authoritative occupied geometry.
    // Historical x/y display fields may remain at zero after a map compiler
    // writes the exact min/max footprint, so they must never move the rendered
    // object away from the geometry used by collision and movement Rules.
    const point = boundedRectangle?.point ?? pointFrom(footprint) ?? pointFrom(value) ?? null;
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
    let footprintCells;
    if (kind === "terrain" && value.footprintCells !== undefined) {
        const cells = value.footprintCells;
        const valid = Array.isArray(cells) && cells.length > 0 && cells.every(cell =>
            cell?.shape === "axis_aligned_rectangle" &&
            [cell.minXMilliInches, cell.maxXMilliInches, cell.minYMilliInches, cell.maxYMilliInches].every(Number.isSafeInteger) &&
            cell.minXMilliInches < cell.maxXMilliInches && cell.minYMilliInches < cell.maxYMilliInches);
        footprintCells = valid ? cells.map(({minXMilliInches, maxXMilliInches, minYMilliInches, maxYMilliInches}) =>
            ({minXMilliInches, maxXMilliInches, minYMilliInches, maxYMilliInches})) : [];
    }
    const geometryRenderable = Boolean(point && shape && width && depth &&
        (footprintCells === undefined || footprintCells.length));
    if (!point)
        diagnostics.push(`${kind}:${id}:coordinate_missing`);
    if (!geometryRenderable)
        diagnostics.push(`${kind}:${id}:geometry_unknown_fail_closed`);
    if (!point)
        return null;
    return {
        id,
        kind,
        ...(kind === "token" && text(value.tokenId) ? { sourceTokenId: text(value.tokenId) } : {}),
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
        ...(footprintCells ? { footprintCells } : {}),
        terrainKind: kind === "terrain"
            ? text(value.terrainKind ?? value.category) || "ordinary"
            : null,
        terrainSize: kind === "terrain" ? safeInteger(value.size) : null,
        elevation: kind === "terrain"
            ? text(value.elevation ?? value.heightTier) || "ground_level"
            : null,
        elevationSurface: kind === "terrain"
            ? value.elevationSurface === true || value.standableHorizontalSurface === true
            : false,
    };
}
function actionLabel(action) {
    const actionType = text(action.actionType) || "action";
    const pieceId = text(action.pieceId);
    const target = text(action.targetId ?? record(action.target)?.id);
    const explicitChoice = text(action.chosenFirstActorSideKey
        ?? action.choiceId
        ?? action.cardName
        ?? action.abilityName);
    return [actionType==='resolve_paid_plague'?'结算瘟疫':actionType, pieceId, target, explicitChoice]
        .filter(Boolean).join(" · ");
}
function parameterSupport(domain) {
    if (getOfficialDelegatedRosterSpatialDomainV1(domain)) return "official_standard_move";
    const kind = text(domain.parameterKind);
    if (kind === "official_selected_roster_spatial_path_v1") {
        // The gesture editor places every model. NativeActionForm owns the
        // explicit outcomes whose removal still requires a Native proof.
        if (domain.actionType === "disengage"
            && domain.parameterSchema?.casualtyRequiresNativeEndpointAbsenceProof === true) return "unsupported";
        if (domain.actionType === "deploy") return "official_standard_deploy";
        if (["move", "run", "disengage"].includes(domain.actionType)) {
            return "official_standard_move";
        }
    }
    if (kind === "official_standard_reserve_deploy_path_v1") {
        return "official_standard_deploy";
    }
    if (kind === "official_standard_move"
        || /^official_standard_move_path_v\d+$/u.test(kind)) {
        return "official_standard_move";
    }
    const schema = record(domain.parameterSchema);
    const required = Array.isArray(schema?.required) ? schema.required.map(text) : [];
    const parameterFields = Object.keys(schema || {})
        .filter((key) => !["type", "required"].includes(key));
    if (schema?.type === "object" && required.length === 0
        && parameterFields.length === 0) {
        return "parameterless";
    }
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
function battlefieldEntrySegment(segment) {
    const segmentId = text(segment.segmentId);
    if (!segmentId) return null;
    if (segment.kind === "unit_base_perimeter") {
        const sourcePieceId = text(segment.sourcePieceId);
        const sourceModelId = text(segment.sourceModelId);
        const center = segment.center;
        const radius = segment.radiusMilliInches;
        const maximum = segment.maximumAlongEdgeMilliInches;
        if (!sourcePieceId || !sourceModelId || !Number.isSafeInteger(center?.xMilliInches)
            || !Number.isSafeInteger(center?.yMilliInches) || !Number.isSafeInteger(radius) || radius <= 0
            || !Number.isSafeInteger(maximum) || maximum <= 0) return null;
        return { segmentId, kind: "unit_base_perimeter", sourcePieceId, sourceModelId,
            center: { xMilliInches: center.xMilliInches, yMilliInches: center.yMilliInches },
            radiusMilliInches: radius, maximumAlongEdgeMilliInches: maximum,
            supplyLimit: Number.isSafeInteger(segment.supplyLimit) ? segment.supplyLimit : null,
            remainingSupply: Number.isSafeInteger(segment.remainingSupply) ? segment.remainingSupply : null };
    }
    const side = text(segment.side);
    const startInches = safeNumber(segment.startInches);
    const endInches = safeNumber(segment.endInches);
    if (!["top", "bottom", "left", "right"].includes(side)
        || startInches === null || endInches === null || endInches <= startInches) return null;
    return { segmentId, side, startInches, endInches };
}

function parameterDomainFrom(value) {
    const domainId = text(value.domainId);
    if (!domainId)
        return null;
    const delegatedMovement = getOfficialDelegatedRosterSpatialDomainV1(value);
    const constraints = record((delegatedMovement ?? value).constraints) || {};
    const parameterSchema = record(value.parameterSchema) || {};
    const modelProfiles = rows(constraints.modelProfiles).map((profile) => ({
        modelId: text(profile.modelId),
        baseShape: shapeFrom(profile.shape ?? profile.baseShape),
        baseWidthMilliInches: positiveInteger(profile.widthMilliInches
            ?? profile.baseWidthMilliInches),
        baseDepthMilliInches: positiveInteger(profile.depthMilliInches
            ?? profile.baseDepthMilliInches),
        baseRotationDegrees: safeNumber(profile.rotationDegrees
            ?? profile.baseRotationDegrees) ?? 0,
        ...outlineFields(shapeFrom(profile.shape ?? profile.baseShape), profile),
    })).filter((profile) => Boolean(profile.modelId));
    const modelIds = Array.isArray(constraints.modelIds)
        ? constraints.modelIds.map(text).filter(Boolean)
        : modelProfiles.map((profile) => profile.modelId);
    const entrySegments = rows(constraints.entrySegments).map(battlefieldEntrySegment).filter(Boolean);
    const modelStartPoints = normalizedPointMap(constraints.modelStartPoints);
    const maxPathPoints = positiveInteger(parameterSchema.maxCanonicalPathPoints ?? parameterSchema.maxCanonicalPoints);
    return {
        domainId,
        parameterKind: text(value.parameterKind) || null,
        actionType: text(value.actionType) || "parameterized_action",
        pieceId: text(value.pieceId) || null,
        label: delegatedMovement
            ? `${text(value.abilityName) || text(value.actionType)} · ${text(value.pieceId)} → ${delegatedMovement.pieceId}`
            : [text(value.actionType) || "parameterized", text(value.pieceId),
                text(value.abilityName) || text(record(value.sourceDomain)?.abilityName)
                  || text(value.weaponName) || text(record(value.sourceDomain)?.weaponName)].filter(Boolean).join(" · "),
        support: parameterSupport(value),
        modelIds,
        modelStartPoints,
        supportsTokenDisplacements: parameterSchema.tokenDisplacements?.type === "array"
            && parameterSchema.tokenDisplacements.items?.tokenId?.type === "current_source_token_handle"
            && parameterSchema.tokenDisplacements.items?.coordinate?.coordinateUnit === "milli-inch",
        modelProfiles,
        entrySegments,
        deploymentSupply: value.actionType === "deploy" && Number.isSafeInteger(constraints.supply?.requestedSupply)
            ? { requested: constraints.supply.requestedSupply, mode: constraints.supply.mode,
                available: Number.isSafeInteger(constraints.supply.available) ? constraints.supply.available : null }
            : null,
        start: pointFrom(constraints.start),
        maxDistanceMilliInches: positiveInteger(constraints.maxDistanceMilliInches),
        maxPathPoints,
        exactRemainingPlacementCount: safeInteger(parameterSchema.exactRemainingPlacementCount),
        raw: value,
    };
}
function delegatedMovementSpatialPlan(action) {
    if (action?.actionType !== "resolve_khassar_movement") return null;
    const delegated = record(action.sourceAction) ?? action;
    const movement = record(delegated.movementPlan);
    const native = record(movement?.nativeAction);
    if (!native || native.pieceId !== movement.recipientUnitId) return null;
    return record((record(native.sourceAction) ?? native).spatialPlan);
}
function previewSpatialPlan(action) {
    const seen = new Set();
    let current = action;
    while (current && !seen.has(current)) {
        seen.add(current);
        const plan = record(getOfficialDisplacementMovementGeometryV1(current));
        if (plan) return !plan.pieceId || plan.pieceId === current.pieceId ? plan : null;
        const delegated = delegatedMovementSpatialPlan(current);
        if (delegated) return delegated;
        const inner = record(current.sourceAction) ?? record(current.originalAction);
        if (!inner || !action.pieceId || inner.pieceId !== action.pieceId || inner.actionType !== action.actionType) return null;
        current = inner;
    }
    return null;
}
function previewDisengageRestriction(action, spatialPlan) {
    const restriction = record(spatialPlan?.postDisengageAssaultRestriction);
    if (action?.actionType !== "disengage" || restriction?.appliesToPhase !== "assault"
        || !Number.isSafeInteger(restriction.declaredRound)
        || !Number.isSafeInteger(restriction.ownEffectiveSupply) || !Number.isSafeInteger(restriction.combinedEnemyEffectiveSupply)
        || typeof restriction.rangedAttackProhibited !== "boolean" || typeof restriction.chargeProhibited !== "boolean") return null;
    return Object.freeze({ round: restriction.declaredRound, ownSupply: restriction.ownEffectiveSupply,
        opposingSupply: restriction.combinedEnemyEffectiveSupply, rangedAttackProhibited: restriction.rangedAttackProhibited,
        chargeProhibited: restriction.chargeProhibited });
}
function previewPathFrom(pendingPreview, spatialPlan) {
    if (!pendingPreview)
        return [];
    const core = record(pendingPreview.core);
    const action = record(core?.action);
    const movePlan = record(action?.movePlan);
    const deployPlan = record(action?.deployPlan);
    const canonicalPath = movePlan?.canonicalPath
        ?? deployPlan?.canonicalPath
        ?? spatialPlan?.canonicalPath
        ?? action?.canonicalPath;
    const pathContainer = record(canonicalPath);
    const proposal = record(core?.proposal);
    const parameters = record(proposal?.parameters);
    // Charge, Close Ranks and relocation confirm only geometry returned by Rules.
    // Blink can have a final formation without traversing a path.
    const sealedMovement = ["resolve_charge", "fight", "resolve_relocation_ability"].includes(action?.actionType);
    const candidates = Array.isArray(canonicalPath)
        ? canonicalPath
        : Array.isArray(pathContainer?.points)
            ? pathContainer.points
            : !sealedMovement && Array.isArray(parameters?.path)
                ? parameters.path
                : [];
    return candidates.map(pointFrom)
        .filter((point) => Boolean(point));
}
function previewPlacementsFrom(pendingPreview, spatialPlan, models, baseGeometryById, diagnostics) {
    if (!pendingPreview)
        return [];
    const core = record(pendingPreview.core);
    const action = record(core?.action);
    const movePlan = record(action?.movePlan);
    const deployPlan = record(action?.deployPlan);
    const candidates = rows(movePlan?.finalModelPositions
        ?? deployPlan?.finalModelPositions
        ?? spatialPlan?.finalModelPositions);
    const modelsById = new Map(models.map((model) => [model.id, model]));
    return candidates.map((candidate, index) => {
        const modelId = text(candidate.modelId) || `preview-model-${index + 1}`;
        const point = pointFrom(candidate);
        if (!point) {
            diagnostics.push(`preview_placement:${modelId}:coordinate_missing`);
            return null;
        }
        const model = modelsById.get(modelId) ?? baseGeometryById.get(modelId);
        const baseRotationDegrees = safeNumber(candidate.rotationDegrees ?? candidate.baseRotationDegrees)
            ?? model?.baseRotationDegrees ?? 0;
        const geometryRenderable = Boolean(projectRotatedBaseBoundsV1({ ...model, ...point, baseRotationDegrees }));
        if (!geometryRenderable) {
            diagnostics.push(`preview_placement:${modelId}:model_geometry_unknown_fail_closed`);
        }
        return {
            modelId,
            ...point,
            baseShape: model?.baseShape ?? null,
            baseWidthMilliInches: model?.baseWidthMilliInches ?? null,
            baseDepthMilliInches: model?.baseDepthMilliInches ?? null,
            baseRotationDegrees,
            ...outlineFields(model?.baseShape, model),
            geometryRenderable,
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
    const baseGeometryById = new Map();
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
                if (model.isRemoved === true) continue;
                const id = text(model.id) || `${pieceId}-model-${modelIndex + 1}`;
                const geometry = dimensionsFrom({ ...piece, ...model });
                const base = {
                    baseShape: geometry.shape,
                    baseWidthMilliInches: geometry.width,
                    baseDepthMilliInches: geometry.depth,
                    baseRotationDegrees: geometry.rotation,
                    ...outlineFields(geometry.shape, geometry),
                };
                baseGeometryById.set(id, base);
                if (model.isOnField === false) continue;
                const point = pointFrom(model);
                if (!point) {
                    diagnostics.push(`model:${id}:coordinate_missing`);
                    continue;
                }
                const baseBounds = projectRotatedBaseBoundsV1({ ...point, ...base });
                const geometryRenderable = baseBounds !== null;
                if (!geometryRenderable)
                    diagnostics.push("model:" + id + ":geometry_unknown_fail_closed");
                const withinBoard = geometryRenderable && baseBounds.minXMilliInches >= 0
                    && baseBounds.maxXMilliInches <= widthMilliInches && baseBounds.minYMilliInches >= 0
                    && baseBounds.maxYMilliInches <= heightMilliInches;
                if (geometryRenderable && !withinBoard)
                    diagnostics.push(`model:${id}:base_edge_outside_board`);
                models.push({
                    kind: "model",
                    id,
                    pieceId,
                    unitId,
                    officialUnitRecordKey: text(piece.officialUnitRecordKey) || null,
                    label: piece.models.length > 1 ? `${label} ${modelIndex + 1}` : label,
                    sideKey,
                    ...point,
                    ...base,
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
            officialUnitRecordKey: text(piece.officialUnitRecordKey) || null,
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
    const action = record(record(pendingPreview?.core)?.action);
    const spatialPlan = previewSpatialPlan(action);
    const restriction = previewDisengageRestriction(action, spatialPlan);
    const previewPath = previewPathFrom(pendingPreview, spatialPlan);
    const previewPlacements = previewPlacementsFrom(pendingPreview, spatialPlan, models, baseGeometryById, diagnostics);
    const previewId = text(pendingPreview?.previewId) || null;
    const mapManifest = record(board?.battlefieldMapManifest);
    const mapSeedId = text(mapManifest?.mapSeedId);
    const visualPresetId = text(mapManifest?.visualPresetId)
        || mapSeedId || "lost_temple_inspired_v1";
    const mapMedia = resolveStarcraftTmgBattlefieldMapMediaV2(mapSeedId
        || visualPresetId)
        || resolveStarcraftTmgBattlefieldMapMediaV2("lost_temple_inspired_v1");
    const terrain = areas(board?.terrain, "terrain");
    // Prefer current Rules markers to frozen setup snapshots and demo circles.
    const missionMarkers = rows(board?.missionMarkers).length
        ? rows(board.missionMarkers)
        : rows(record(state?.officialMissionMarkerPlacement)?.missionMarkers);
    const markers = areas([
        ...(missionMarkers.length ? [] : rows(board?.centerMarkers)),
        ...rows(board?.markers),
        ...missionMarkers,
        ...rows(board?.effectMarkers),
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
            mapSeedId: mapSeedId || mapMedia?.seedId || null,
            mapDisplayName: text(mapManifest?.mapDisplayName)
                || mapMedia?.displayName || null,
            mapGameEra: text(mapManifest?.mapGameEra) || mapMedia?.era || null,
            mapArtAssetPath: text(mapManifest?.mapArtAssetPath)
                || mapMedia?.path || null,
            mapArtOverlays: Object.freeze(rows(mapManifest?.mapArtOverlays)
                .filter((entry) => typeof entry?.assetPath === "string")
                .map((entry) => ({ overlayId: text(entry.overlayId),
                    assetPath: entry.assetPath, sha256: text(entry.sha256),
                    rectangleNormalized: { ...entry.rectangleNormalized },
                    ...(entry.flipX === true ? { flipX: true } : {}) }))),
            engagementScale: text(mapManifest?.engagementScale)
                || mapMedia?.engagementScale || null,
            visualPresetId: mapMedia?.visualPresetId || null,
            visualPresetName: mapMedia?.displayName || null,
            displayMapAssetKey: mapMedia?.assetKey || null,
            terrainPresetId: text(mapManifest?.terrainPresetId) || null,
            terrainSeed: text(mapManifest?.terrainSeed) || null,
            rulesTerrainPlanHash: text(mapManifest?.rulesTerrainPlanHash) || null,
            mapManifestHash: text(mapManifest?.manifestHash) || null,
            mapCompilationHash: text(mapManifest?.mapCompilationHash) || null,
            mapRoomFreezeHash: text(mapManifest?.mapRoomFreezeHash) || null,
            missionSpatialReachabilityAuditHash:
                text(mapManifest?.missionSpatialReachabilityAuditHash) || null,
            mapMutationAfterRoomCreationAllowed:
                record(board?.competitiveMapRoomFreezeSummary)
                    ?.mutationAfterRoomCreationAllowed === true,
            backgroundVisibleByDefault: mapManifest?.backgroundVisibleByDefault !== false,
            terrainVisibleByDefault: mapManifest?.terrainVisibleByDefault !== false,
            backgroundRulesAuthority: false,
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
                ...(restriction ? { disengageAssaultRestriction: restriction } : {}),
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
