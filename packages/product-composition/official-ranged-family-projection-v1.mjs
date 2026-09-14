import { evaluateOfficialWithinWhollyWithinV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

export const OFFICIAL_RANGED_FAMILY_PROJECTION_VERSION = "1.0.0";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function fieldedRoute(piece, route) {
  const selected = new Set((piece?.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece?.equipment || []).map((entry) => normalized(
    entry?.equipmentName || entry?.name)).filter(Boolean));
  const cost = piece?.compositionKind === "large"
    ? Number(route?.costByComposition?.large || 0)
    : Number(route?.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route?.abilityName))
    || equipment.has(normalized(route?.abilityName));
}
function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}
function unitWithin(state, sourcePiece, targetPiece, rangeMilliInches) {
  return liveModels(sourcePiece).some((model) => (
    evaluateOfficialWithinWhollyWithinV1({
      state,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: "model", unitId: sourcePiece.id, modelId: model.id },
      targetUnitId: targetPiece.id,
      rangeMilliInches,
    }).unitWithin
  ));
}
function routesFor(bundle, piece, effectKind) {
  if (!bundle || !Array.isArray(bundle.routes)) return [];
  return bundle.routes.filter((route) => route.recordKey === piece?.officialUnitRecordKey
    && route.effectKind === effectKind && fieldedRoute(piece, route));
}

/**
 * Pure consumer-side projection shared by the ranged Action Adapter and abilities
 * whose value is modified by a ranged-family upgrade. It never mutates state.
 */
export function projectOfficialRangedFamilyModifiersV1(bundle, state, request = {}) {
  const piece = (state?.pieces || []).find((entry) => entry.id === request.pieceId);
  if (!piece) fail("RANGED_FAMILY_PROJECTION_PIECE_UNKNOWN", String(request.pieceId || ""));
  const context = request.context && typeof request.context === "object"
    ? request.context : {};
  const weaponName = normalized(context.weaponName);
  const distanceInches = Number(context.distanceInches);
  const target = (state.pieces || []).find((entry) => entry.id === context.targetPieceId);

  const longRangeRoutes = routesFor(bundle, piece, "long_range_override")
    .filter((route) => normalized(route.weaponScope) === weaponName);
  const grenadeRoutes = routesFor(bundle, piece, "grenades_frag")
    .filter((route) => normalized(route.weaponScope) === weaponName
      && Number.isFinite(distanceInches)
      && distanceInches <= Number(route.maximumDistanceInches));
  const opticalRoutes = routesFor(bundle, piece, "optical_flare_range")
    .filter(() => normalized(context.abilityName) === "optical flare");
  const stabilizerRoutes = routesFor(bundle, piece, "medpack_model_bonus")
    .filter(() => ["life support", "medpack"].includes(normalized(context.abilityName)));
  const availablePointDefenseSources = target ? (state.pieces || []).filter((source) => (
    source.id !== target.id && source.sideKey === target.sideKey && activePiece(source)
      && routesFor(bundle, source, "point_defense_laser").length > 0
      && unitWithin(state, source, target, 4000)
  )).sort((left, right) => left.id.localeCompare(right.id)) : [];
  const requestedPointDefenseIds = context.pointDefenseSourcePieceIds === undefined
    ? [] : [...new Set((context.pointDefenseSourcePieceIds || []).map(String))].sort();
  const availablePointDefenseIds = availablePointDefenseSources.map((entry) => entry.id);
  if (requestedPointDefenseIds.some((id) => !availablePointDefenseIds.includes(id))) {
    fail("RANGED_FAMILY_POINT_DEFENSE_SOURCE_INVALID", requestedPointDefenseIds.join(","));
  }
  const selectedPointDefenseSources = availablePointDefenseSources.filter((source) => (
    requestedPointDefenseIds.includes(source.id)));

  const applicableRoutes = [...longRangeRoutes, ...grenadeRoutes,
    ...opticalRoutes, ...stabilizerRoutes,
    ...selectedPointDefenseSources.flatMap((source) => routesFor(
      bundle, source, "point_defense_laser"))];
  return Object.freeze({
    schema: "starcraft_tmg_official_ranged_family_projection_v1",
    semanticVersion: OFFICIAL_RANGED_FAMILY_PROJECTION_VERSION,
    pieceId: piece.id,
    targetPieceId: target?.id || null,
    applicableDefinitionIds: [...new Set(applicableRoutes.map((entry) => (
      entry.definitionId)))].sort(),
    longRangeMaximumInches: Math.max(0, ...longRangeRoutes.map((entry) => (
      Number(entry.maximumRangeInches || 0)))),
    surgeDiceOverride: grenadeRoutes.length > 0 ? "D6" : null,
    opticalFlareRangeMilliInches: opticalRoutes.length > 0
      ? Math.max(...opticalRoutes.map((entry) => entry.rangeMilliInches)) : null,
    medpackAdditionalModelsWithinRange: stabilizerRoutes.length > 0 ? 1 : 0,
    pointDefense: availablePointDefenseSources.length > 0 ? {
      availableSourcePieceIds: availablePointDefenseIds,
      selectedSourcePieceIds: selectedPointDefenseSources.map((entry) => entry.id),
      maximumDiceRemovedPerSource: 2,
      instantWeaponsExcluded: true,
      removeSourcesAfterResolution: true,
      defenderChoiceRequired: true,
    } : null,
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_ranged_family_consumer_projection",
    trainingTruth: false,
  });
}
