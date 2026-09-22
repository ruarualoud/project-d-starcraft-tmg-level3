export const OFFICIAL_CURRENT_PRODUCT_STATE_FACTS_VERSION =
  "official_current_product_state_facts_v1";

function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}

function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function liveModels(piece) {
  return (piece?.models || []).filter((model) => model?.isDestroyed !== true
    && model?.isOnField !== false);
}

function tags(piece) {
  return new Set([piece?.combatTag, ...(piece?.combatTags || [])]
    .map(normalized).filter(Boolean));
}

function modelRadius(model) {
  return Math.max(Number(model?.baseWidthInches || 0),
    Number(model?.baseDepthInches || model?.baseWidthInches || 0)) / 2;
}

function pointForModel(model) {
  return { x: Number(model?.xInches), y: Number(model?.yInches) };
}

function baseGap(leftPoint, leftRadius, rightPoint, rightRadius) {
  return Math.max(0, Math.hypot(Number(leftPoint.x) - Number(rightPoint.x),
    Number(leftPoint.y) - Number(rightPoint.y)) - leftRadius - rightRadius);
}

function unitWithin(source, target, rangeInches) {
  const gaps = liveModels(source).flatMap((left) => liveModels(target).map(
    (right) => baseGap(pointForModel(left), modelRadius(left),
      pointForModel(right), modelRadius(right)),
  ));
  return gaps.length > 0 && Math.min(...gaps) <= Number(rangeInches) + 0.001;
}

function zergGround(state, piece) {
  const faction = normalized(state?.players?.[piece?.sideKey]?.faction || "");
  return tags(piece).has("ground") && (tags(piece).has("zerg")
    || faction.includes("zerg") || faction.includes("kerrigan"));
}

function structureSpecialAbilitiesAvailable(state, piece) {
  return Number(piece?.structureRules?.specialAbilitiesDisabledThroughRound
    ?? Number.NEGATIVE_INFINITY) < Number(state?.round);
}

function creepTumorRows(state) {
  const bindings = new Map((state?.officialBattlefieldAssetBindings || [])
    .filter((entry) => entry?.assetKind === "creep_tumor"
      && entry?.consumed !== true)
    .map((entry) => [entry.assetId, entry]));
  return (state?.board?.tokens || []).filter((token) => token?.isRemoved !== true
    && token?.isDestroyed !== true).flatMap((token) => {
    const tokenId = String(token?.tokenId || token?.id || "");
    const binding = bindings.get(tokenId);
    if (!binding) return [];
    const point = token.coordinate || {
      x: Number(token.xInches),
      y: Number(token.yInches),
    };
    const radius = Number(token.baseDiameterInches
      || token.baseWidthInches || 0) / 2;
    return [{ tokenId, point, radius, binding }];
  });
}

const CAPABILITY_EFFECT_KINDS = Object.freeze({
  creep_tumor_stay_in_play_and_displacement: new Set([
    "creep_stay_displacement",
    "living_glob_of_tissue",
  ]),
  creep_tumor_enemy_action_removal: new Set([
    "creep_removal",
  ]),
});

function sourceInstances(state, route) {
  if (route.sourceKind === "card_feature") {
    return (state?.cardResources?.[route.sideKey] || []).filter((card) =>
      card.cardInstanceId === route.sourceCardInstanceId
      && card.officialCardRecordKey === route.recordKey).map((card) => ({
      sideKey: route.sideKey,
      sourceInstanceId: card.cardInstanceId,
    }));
  }
  if (route.sourceKind === "unit_feature") {
    const pieces = route.pieceId
      ? (state?.pieces || []).filter((piece) => piece.id === route.pieceId)
      : (state?.pieces || []).filter((piece) =>
        piece.officialUnitRecordKey === route.recordKey);
    return pieces.filter(activePiece).map((piece) => ({
      sideKey: piece.sideKey,
      sourceInstanceId: piece.id,
    }));
  }
  return [];
}

export function resolveOfficialCurrentProductSideCapabilityV1(state, input = {}) {
  const sideKey = String(input.sideKey || "");
  const capability = String(input.capability || "");
  const effectKinds = CAPABILITY_EFFECT_KINDS[capability];
  if (!state?.players?.[sideKey] || !effectKinds) {
    throw new TypeError("CURRENT_PRODUCT_SIDE_CAPABILITY_QUERY_INVALID");
  }
  const rows = [];
  for (const binding of
    state.officialSelectedRosterAbilitySourceBundle?.passiveBindings || []) {
    if (binding.sideKey !== sideKey || !effectKinds.has(binding.effectKind)) continue;
    rows.push({
      sourceFeatureHash: binding.sourceFeatureHash,
      sourceInstanceId: binding.sourceCardInstanceId || binding.pieceId,
      recordKey: binding.recordKey,
      abilityName: binding.abilityName,
      effectKind: binding.effectKind,
      adapterKind: "selected_roster_ability",
    });
  }
  for (const route of
    state.officialBattlefieldAssetFamilySourceBundle?.routes || []) {
    if (!effectKinds.has(route.effectKind)) continue;
    for (const instance of sourceInstances(state, route)) {
      if (instance.sideKey !== sideKey) continue;
      rows.push({
        sourceFeatureHash: route.sourceFeatureHash,
        sourceInstanceId: instance.sourceInstanceId,
        recordKey: route.recordKey,
        abilityName: route.abilityName,
        effectKind: route.effectKind,
        adapterKind: "battlefield_asset_family",
      });
    }
  }
  const sources = [...new Map(rows.map((entry) => [
    `${entry.sourceFeatureHash}:${entry.sourceInstanceId}`,
    Object.freeze(entry),
  ])).values()].sort((left, right) => left.recordKey.localeCompare(right.recordKey)
    || left.sourceInstanceId.localeCompare(right.sourceInstanceId));
  return Object.freeze({
    schema: OFFICIAL_CURRENT_PRODUCT_STATE_FACTS_VERSION,
    sideKey,
    capability,
    enabled: sources.length > 0,
    sources: Object.freeze(sources),
    sourceDefinitionsRemainOneToOne: true,
    semanticAliasesResolvedAtCapabilityProjection: true,
    trainingTruth: false,
  });
}

export function resolveOfficialCurrentProductPieceCapabilityV1(state, input = {}) {
  const piece = (state?.pieces || []).find((entry) => entry.id === input.pieceId);
  const capability = String(input.capability || "");
  if (!piece || capability !== "commander_contextual_supply_bonus") {
    throw new TypeError("CURRENT_PRODUCT_PIECE_CAPABILITY_QUERY_INVALID");
  }
  const definitionByHash = new Map((
    state?.officialCurrentProductAbilityDenominator?.definitions || []
  ).map((entry) => [entry.sourceFeatureHash, entry]));
  const selectedSources = (
    state?.officialSelectedRosterAbilitySourceBundle?.passiveBindings || []
  ).filter((entry) => entry.effectKind === "commander"
    && entry.pieceId === piece.id
    && entry.recordKey === piece.officialUnitRecordKey);
  const familySources = (state?.officialContextualSupplyModifierRoutes || [])
    .filter((entry) => entry.effectKind === "commander_supply_bonus"
      && entry.recordKey === piece.officialUnitRecordKey);
  const rows = [...selectedSources, ...familySources].map((entry) => {
    const definition = definitionByHash.get(entry.sourceFeatureHash);
    return Object.freeze({
      sourceFeatureHash: entry.sourceFeatureHash,
      definitionId: entry.definitionId || definition?.definitionId || null,
      recordKey: entry.recordKey,
      abilityName: entry.abilityName,
      effectKind: entry.effectKind,
      adapterKind: entry.effectKind === "commander"
        ? "selected_roster_ability" : "faction_unique_family",
    });
  });
  const sources = [...new Map(rows.map((entry) => [
    entry.sourceFeatureHash, entry,
  ])).values()];
  return Object.freeze({
    schema: OFFICIAL_CURRENT_PRODUCT_STATE_FACTS_VERSION,
    pieceId: piece.id,
    capability,
    enabled: sources.length > 0,
    sources: Object.freeze(sources),
    semanticAliasesResolvedAtCapabilityProjection: true,
    trainingTruth: false,
  });
}

export function isOfficialCurrentProductUnitOnCreepV1(state, piece) {
  if (!activePiece(piece) || !zergGround(state, piece)) return false;
  const withinTumor = liveModels(piece).some((model) => creepTumorRows(state)
    .some((token) => baseGap(pointForModel(model), modelRadius(model),
      token.point, token.radius) <= 6.001));
  if (withinTumor) return true;
  return (state?.pieces || []).filter((entry) => activePiece(entry)
    && entry.officialUnitRecordKey === "army_units:omega_worm"
    && structureSpecialAbilitiesAvailable(state, entry))
    .some((source) => unitWithin(source, piece, 6));
}
