export const OFFICIAL_MELEE_FAMILY_PROJECTION_VERSION = "1.0.0";

const LEGACY_EXACT_IMPACT = Object.freeze({
  "army_units:kerrigan": Object.freeze({
    abilityName: "Devastating Charge", impactDicePerEligibleModel: 4,
    hitThreshold: 4, definitionId: null, sourceFeatureHash: null,
  }),
  "army_units:kerrigan_swarm_raptor__zergling_": Object.freeze({
    abilityName: "Devastating Charge", impactDicePerEligibleModel: 2,
    hitThreshold: 5, definitionId: null, sourceFeatureHash: null,
  }),
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
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
function routesFor(bundle, piece, effectKind) {
  return (bundle?.routes || []).filter((route) => (
    route.recordKey === piece.officialUnitRecordKey
      && route.effectKind === effectKind && fieldedRoute(piece, route)
  ));
}

/** Pure source-bound modifiers consumed by Charge/Impact and Fight runtimes. */
export function projectOfficialMeleeFamilyModifiersV1(bundle, state, request = {}) {
  const piece = (state?.pieces || []).find((entry) => entry.id === request.pieceId);
  if (!piece) fail("MELEE_FAMILY_PROJECTION_PIECE_UNKNOWN", String(request.pieceId || ""));
  const impactRoute = routesFor(bundle, piece, "devastating_charge")[0] || null;
  const legacyImpact = LEGACY_EXACT_IMPACT[piece.officialUnitRecordKey] || null;
  const bonusRoute = routesFor(bundle, piece, "impact_model_bonus")[0] || null;
  const weaponRoutes = routesFor(bundle, piece, "weapon");
  const impact = impactRoute ? {
    abilityName: impactRoute.abilityName,
    impactDicePerEligibleModel: impactRoute.impactDicePerEligibleModel,
    hitThreshold: impactRoute.hitThreshold,
    definitionId: impactRoute.definitionId,
    sourceFeatureHash: impactRoute.sourceFeatureHash,
  } : legacyImpact;
  const applicable = [...weaponRoutes,
    ...(impactRoute ? [impactRoute] : []), ...(bonusRoute ? [bonusRoute] : [])];
  return Object.freeze({
    schema: "starcraft_tmg_official_melee_family_projection_v1",
    semanticVersion: OFFICIAL_MELEE_FAMILY_PROJECTION_VERSION,
    pieceId: piece.id,
    applicableDefinitionIds: [...new Set(applicable.map((entry) => (
      entry.definitionId)).filter(Boolean))].sort(),
    weaponDefinitionIds: weaponRoutes.map((entry) => entry.definitionId).sort(),
    devastatingCharge: impact ? Object.freeze({ ...impact }) : null,
    additionalImpactDicePerEligibleModel: Number(
      bonusRoute?.additionalImpactDicePerEligibleModel || 0),
    sourceRefreshPerformed: false,
    rulesTruth: "official_current_product_melee_family_consumer_projection",
    trainingTruth: false,
  });
}
