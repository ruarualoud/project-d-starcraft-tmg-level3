import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { evaluateOfficialBaseMeasurementV1 } from
  "./official-model-base-geometry-rules-kernel-v1.mjs";
import { resolveOfficialCurrentProductPieceCapabilityV1 } from
  "../product-composition/official-current-product-state-facts-v1.mjs";
import { officialStructureDefinitionForPieceV1 } from './official-structure-rules-v1.mjs';

export const OFFICIAL_CONTEXTUAL_SUPPLY_PROJECTION_VERSION = "1.1.0";

const CONTEXTS = new Set([
  "supply_pool_calculation", "mission_marker_control",
  "objective_completion", "disengage_check",
]);

// Read-only batch facade over the SAME per-context atom used by deployment,
// marker control and other Native consumers. Never infer Supply from ability prose.
export function inspectOfficialContextualSupplyV1({state,arguments:args={}}={}) {
  const invalid = !args || typeof args!=='object' || Array.isArray(args)
    || Object.keys(args).some(key=>!['unitIds','contexts'].includes(key))
    || !Array.isArray(args.unitIds) || !args.unitIds.length
    || args.unitIds.some(id=>typeof id!=='string'||!id)
    || new Set(args.unitIds).size!==args.unitIds.length
    || (args.contexts!==undefined && (!Array.isArray(args.contexts)||!args.contexts.length
      || args.contexts.some(context=>!CONTEXTS.has(context))
      || new Set(args.contexts).size!==args.contexts.length));
  if(invalid)fail('CONTEXTUAL_SUPPLY_QUERY_ARGUMENTS_INVALID');
  const contexts=args.contexts??[...CONTEXTS];
  const units=args.unitIds.map(unitId=>{
    const piece=state?.pieces?.find(p=>p.id===unitId);
    if(!piece)fail('CONTEXTUAL_SUPPLY_UNIT_NOT_FOUND',unitId);
    return {unitId,recordKey:piece.officialUnitRecordKey,currentModels:piece.currentModels,
      onBattlefield:activePiece(piece),baseSupply:piece.currentSupply,
      contexts:Object.fromEntries(contexts.map(context=>[context,
        projectOfficialContextualSupplyValueV1({state,pieceId:unitId,context})]))};
  });
  return freezeDeep({schema:'starcraft_tmg_contextual_supply_inspection_v1',units,
    semanticVersion:OFFICIAL_CONTEXTUAL_SUPPLY_PROJECTION_VERSION,
    markerControlProven:false,mutationAuthority:false,trainingTruth:false,
    scope:'Exact supplied Native state only. Contextual Supply is not marker eligibility/control, future arrival, or a different casualty/aura state.'});
}

// Public field semantics shared by Plan generation/revision/review. This is
// not a new Supply calculation and does not assert future marker control.
export function describeOfficialContextualSupplySemanticsV1() {
  return freezeDeep({version:'official_contextual_supply_field_semantics_v1',
    supportedContexts:[...CONTEXTS],
    startingSupply:{meaning:'printed_supply_of_selected_starting_composition',
      afterCasualtiesMayDiffer:true,provesMarkerControl:false},
    poolSupply:{context:'supply_pool_calculation',
      meaning:'contextual_contribution_used_only_when_calculating_the_supply_pool',
      replacesCurrentSupply:false,provesMarkerControl:false},
    missionControl:{context:'mission_marker_control',requiresCurrentNativeState:true,
      meaning:'Native current Supply plus applicable contextual effects; actual marker control also requires current eligibility, footprint range and opponent comparison',
      inferFromPoolSupply:false},
    instruction:'A Supply-Pool-only replacement does not change Current Supply or automatically change marker-control, objective or disengage Supply. Do not call a unit generally Supply-0 from poolSupply=0. Use each rule in its stated context; arrival schedule entries are not live control evidence.',
    rulesAuthority:'existing_contextual_supply_projection_semantics',
    newRulesOrStrategyIntroduced:false});
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function normalized(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => model?.isOnField !== false
    && model?.isDestroyed !== true);
}
function fieldedFeature(piece, route) {
  const selected = new Set((piece?.selectedUpgradeNames || []).map(normalized));
  const equipment = new Set((piece?.equipment || []).map((entry) => normalized(
    entry.equipmentName || entry.name)).filter(Boolean));
  const cost = piece?.compositionKind === "large"
    ? Number(route.costByComposition?.large || 0)
    : Number(route.costByComposition?.small || 0);
  return cost === 0 || selected.has(normalized(route.abilityName))
    || equipment.has(normalized(route.abilityName));
}
function routeValid(route) {
  return route?.schema === "starcraft_tmg_official_contextual_supply_route_v1"
    && route.routeHash === hashStarcraftTmgContract(Object.fromEntries(
      Object.entries(route).filter(([key]) => key !== "routeHash")))
    && route.trainingTruth === false;
}
function effectValid(effect, piece) {
  if (effect?.effectKind !== "contextual_supply_bonus") return true;
  const body = Object.fromEntries(Object.entries(effect).filter(([key]) => (
    key !== "effectHash")));
  return effect.schema === "starcraft_tmg_official_contextual_supply_effect_v1"
    && effect.effectHash === hashStarcraftTmgContract(body)
    && effect.targetPieceId === piece.id
    && effect.expiresAt === "round_end"
    && Number.isSafeInteger(Number(effect.modifier))
    && Number(effect.modifier) > 0
    && Number.isSafeInteger(Number(effect.roundApplied))
    && Array.isArray(effect.contexts) && effect.contexts.length > 0
    && effect.contexts.every((entry) => (
      entry === "mission_marker_control" || entry === "objective_completion"))
    && effect.trainingTruth === false;
}
function within(state, source, target, rangeMilliInches) {
  if (!activePiece(source) || !activePiece(target)) return false;
  return activeModels(source).some((sourceModel) => activeModels(target).some((targetModel) => (
    evaluateOfficialBaseMeasurementV1({ state,
      dataBundle: state.officialModelBaseGeometryDataBundle,
      source: { kind: "model", unitId: source.id, modelId: sourceModel.id },
      target: { kind: "model", unitId: target.id, modelId: targetModel.id },
    }).distanceMilliInches <= Number(rangeMilliInches))));
}
export function projectOfficialContextualSupplyValueV1(input = {}) {
  const { state } = input;
  const piece = state?.pieces?.find((entry) => entry.id === input.pieceId);
  const context = String(input.context || "");
  if (!piece || !CONTEXTS.has(context)) {
    fail("CONTEXTUAL_SUPPLY_INPUT_INVALID", `${input.pieceId || ""}:${context}`);
  }
  const baseSupply = Number(piece.currentSupply);
  if (!Number.isSafeInteger(baseSupply) || baseSupply < 0) {
    fail("CONTEXTUAL_SUPPLY_BASE_INVALID", piece.id);
  }
  const routes = state.officialContextualSupplyModifierRoutes || [];
  if (!Array.isArray(routes) || routes.some((route) => !routeValid(route))) {
    fail("CONTEXTUAL_SUPPLY_ROUTE_BUNDLE_INVALID");
  }
  const applicableDefinitionIds = [];
  let modifier = 0;
  let replacement = null;
  let floor = 0;
  const structure = officialStructureDefinitionForPieceV1(state, piece);
  if (structure) {
    replacement = 0;
    applicableDefinitionIds.push(structure.definitionId);
  }
  const sourceRoutes = routes.filter((route) => route.recordKey === piece.officialUnitRecordKey
    && fieldedFeature(piece, route));
  if (!structure && context === "supply_pool_calculation") {
    const zero = sourceRoutes.find((route) => route.effectKind === "supply_pool_zero");
    if (zero && livePiece(piece)) {
      replacement = 0;
      applicableDefinitionIds.push(zero.definitionId);
    }
  }
  if (!structure && ["mission_marker_control", "objective_completion", "disengage_check"].includes(context)) {
    const commander = resolveOfficialCurrentProductPieceCapabilityV1(state, {
      pieceId: piece.id,
      capability: "commander_contextual_supply_bonus",
    });
    if (activePiece(piece) && commander.enabled) {
      modifier += 1;
      applicableDefinitionIds.push(...commander.sources.map((entry) => entry.definitionId));
    }
  }
  if (!structure && ["mission_marker_control", "objective_completion"].includes(context)) {
    const contextualEffects = (piece.officialAbilityEffects || []).filter((effect) => (
      effect.effectKind === "contextual_supply_bonus"));
    if (contextualEffects.some((effect) => !effectValid(effect, piece))) {
      fail("CONTEXTUAL_SUPPLY_EFFECT_INVALID", piece.id);
    }
    const activeEffects = contextualEffects.filter((effect) => (
      Number(effect.roundApplied) === Number(state.round)
        && effect.contexts.includes(context)));
    modifier += activeEffects.reduce((sum, effect) => sum + Number(effect.modifier || 0), 0);
    applicableDefinitionIds.push(...activeEffects.map((effect) => effect.sourceDefinitionId));
    const floorRoutes = routes.filter((route) => route.effectKind === "mission_supply_floor"
      && route.contexts.includes(context));
    for (const route of floorRoutes) {
      const source = state.pieces.find((candidate) => (
        candidate.sideKey === piece.sideKey && candidate.officialUnitRecordKey === route.recordKey
          && activePiece(candidate) && fieldedFeature(candidate, route)
          && within(state, candidate, piece, route.rangeMilliInches)));
      if (!source) continue;
      floor = Math.max(floor, Number(route.minimumSupply));
      applicableDefinitionIds.push(route.definitionId);
    }
    if(activePiece(piece)&&(piece.statuses||[]).some(s=>normalized(s?.statusName||s?.name||s)==='infestation')){
      const penalties=routes.filter(route=>route.effectKind==='infected_enemy_mission_supply_penalty'&&route.contexts.includes(context));
      for(const route of penalties){
        if(route.supplyModifier!==-1||route.minimumSupply!==0||route.rangeMilliInches!==6000)fail('PLAGUE_WARDEN_SUPPLY_ROUTE_INVALID');
        const source=state.pieces.find(candidate=>candidate.sideKey!==piece.sideKey&&candidate.officialUnitRecordKey===route.recordKey
          &&activePiece(candidate)&&fieldedFeature(candidate,route)&&within(state,candidate,piece,route.rangeMilliInches));
        if(source){modifier-=1;applicableDefinitionIds.push(route.definitionId);}
      }
    }
  }
  const afterReplacement = replacement === null ? baseSupply : replacement;
  const effectiveSupply = Math.max(floor, afterReplacement + modifier);
  const body = {
    schema: "starcraft_tmg_official_contextual_supply_projection_v1",
    semanticVersion: OFFICIAL_CONTEXTUAL_SUPPLY_PROJECTION_VERSION,
    pieceId: piece.id, context, baseSupply, replacement, modifier, floor,
    effectiveSupply,
    applicableDefinitionIds: [...new Set(applicableDefinitionIds.filter(Boolean))].sort(),
    currentSupplyStateNotMutated: true,
    rulesTruth: "official_contextual_supply_projection",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, projectionHash: hashStarcraftTmgContract(body) });
}
