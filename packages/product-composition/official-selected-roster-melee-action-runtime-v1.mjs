import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS,
} from "../rule-atoms/official-close-combat-attack-executor-v8.mjs";
import { createOfficialCriticalHitResolutionKernelV2 } from
  "../rule-atoms/official-critical-hit-resolution-kernel-v2.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import {
  OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS,
} from "../rule-atoms/official-impact-executor-v1.mjs";
import { createOfficialInstantAttackEffectKernelV1 } from
  "../rule-atoms/official-instant-attack-effect-kernel-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
} from "../rule-atoms/official-marine-charge-executor-v2.mjs";
import { recordOfficialSupplyLossesV1, verifyOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
  verifyOfficialAttackProfileCatalogueV2,
} from "../source-data/official-attack-profile-catalogue-v2.mjs";
import {
  getOfficialCombatProfileV1,
  verifyOfficialCombatProfileBundleV1,
} from "../source-data/official-combat-profile-bundle-v1.mjs";
import {
  assertOfficialSelectedRosterCoreActionWindowV1,
  consumeOfficialSelectedRosterFirstWeaponModifierV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";
import {
  consumeOfficialCharacteristicStatusFirstWeaponEffectsV1,
  projectOfficialCharacteristicStatusFamilyModifiersV1,
} from "./official-characteristic-status-family-adapter-v1.mjs";
import { projectOfficialMeleeFamilyModifiersV1 } from
  "./official-melee-family-projection-v1.mjs";
import {
  consumeOfficialBattlefieldAssetFirstWeaponEffectsV1,
  projectOfficialBattlefieldAssetFamilyModifiersV1,
} from "./official-battlefield-asset-family-adapter-v1.mjs";
import {
  createOfficialCurrentProductCasualtyDomainV1,
  resolveOfficialCurrentProductCasualtyDomainV1,
} from "./official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  validateOfficialSelectedRosterRelocationGeometryV1,
} from "./official-selected-roster-spatial-action-runtime-v1.mjs";
import { verifyOfficialStandardActionRouteCatalogueV1 } from
  "./official-standard-action-route-catalogue-v1.mjs";
import { projectOfficialZergUniqueFamilyModifiersV1 } from
  "./official-zerg-unique-family-adapter-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-melee-action-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION = "2.2.0";
export const OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND =
  "official_selected_roster_charge_declaration_v1";
export const OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND =
  "official_selected_roster_charge_resolution_v1";
export const OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND =
  "official_selected_roster_impact_allocation_v1";
export const OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND =
  "official_selected_roster_fight_v1";
export const OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA =
  "starcraft_tmg_official_selected_roster_melee_pending_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const CHARGE_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_MARINE_CHARGE_V2_ACTION_ATOM_IDS,
])].sort());
const IMPACT_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_IMPACT_EXECUTOR_ATOM_IDS,
])].sort());
const FIGHT_ATOMS = Object.freeze([...new Set([
  ...OFFICIAL_CLOSE_COMBAT_ATTACK_V8_EXECUTOR_ATOM_IDS,
])].sort());
const CRITICAL_HIT = createOfficialCriticalHitResolutionKernelV2();
const INSTANT = createOfficialInstantAttackEffectKernelV1();
const TOLERANCE = 1;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function seal(body, field) {
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function livePiece(piece) {
  return piece?.isDestroyed !== true && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("SELECTED_MELEE_SIDE_INVALID", sideKey);
}
function milli(value, code = "SELECTED_MELEE_GEOMETRY_INVALID") {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}
function inches(value) { return Number((Number(value) / 1000).toFixed(3)); }
function modelPoint(model) {
  return { xMilliInches: milli(model?.xInches), yMilliInches: milli(model?.yInches) };
}
function modelRadius(model) {
  const width = milli(model?.baseWidthInches);
  const depth = milli(model?.baseDepthInches);
  if (model?.baseShape !== "round" || width <= 0 || Math.abs(width - depth) > TOLERANCE) {
    fail("SELECTED_MELEE_BASE_SCOPE_UNSUPPORTED", String(model?.id || ""));
  }
  return Math.round(width / 2);
}
function centreDistance(left, right) {
  return Math.hypot(right.xMilliInches - left.xMilliInches,
    right.yMilliInches - left.yMilliInches);
}
function baseGap(left, right) {
  return Math.round(centreDistance(modelPoint(left), modelPoint(right))
    - modelRadius(left) - modelRadius(right));
}
function edgeForModel(graph, unitId, modelId) {
  return graph.modelEdges.filter((edge) => (
    edge.leftUnitId === unitId && edge.leftModelId === modelId
      || edge.rightUnitId === unitId && edge.rightModelId === modelId
  ));
}
function enemyUnitId(edge, ownUnitId) {
  return edge.leftUnitId === ownUnitId ? edge.rightUnitId : edge.leftUnitId;
}
function graphEnemyUnitIds(graph, unitId) {
  return [...new Set(graph.modelEdges.filter((edge) => (
    edge.leftUnitId === unitId || edge.rightUnitId === unitId
  )).map((edge) => enemyUnitId(edge, unitId)))].sort();
}
function graphHasUnitPair(graph, left, right) {
  return graph.modelEdges.some((edge) => (
    edge.leftUnitId === left && edge.rightUnitId === right
      || edge.leftUnitId === right && edge.rightUnitId === left
  ));
}
function statusNamed(piece, names) {
  const targets = new Set(names.map(normalizedName));
  return (piece.statuses || []).some((status) => targets.has(normalizedName(
    typeof status === "string" ? status : String(status.statusName || status.name
      || status.statusId || status.effectId || status.kind || status.schema || ""),
  )));
}
function verifyRuntimeState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces) || state.pieces.length < 1) {
    fail("SELECTED_MELEE_STATE_SCOPE_INVALID");
  }
  verifyOfficialStandardActionRouteCatalogueV1(state.officialActionRouteCatalogue);
  verifyOfficialCombatProfileBundleV1(state.officialCombatProfileBundle);
  const catalogueV2 = state.officialAttackProfileCatalogueV2
    || createOfficialAttackProfileCatalogueV2({
      previousCatalogue: state.officialAttackProfileCatalogue,
    });
  verifyOfficialAttackProfileCatalogueV2(catalogueV2);
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round),
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor?.runtimeHash,
  });
  for (const piece of state.pieces) {
    if (!state.officialCombatProfileBundle.profilesByRecordKey
      ?.[piece.officialUnitRecordKey]
      || !catalogueV2.unitRecordKeys.includes(piece.officialUnitRecordKey)
      || !Array.isArray(piece.models)
      || (activePiece(piece) && activeModels(piece).length !== Number(piece.currentModels))) {
      fail("SELECTED_MELEE_MODEL_DENOMINATOR_INVALID", piece.id);
    }
    for (const model of piece.models) modelRadius(model);
  }
  return catalogueV2;
}
function phaseReady(state, sideKey, phase) {
  if (state.phase !== phase || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.[phase] === true) {
    fail("SELECTED_MELEE_PHASE_UNAVAILABLE", `${sideKey}:${phase}`);
  }
  const choice = state.phaseFirstActorByRound?.[`${state.round}:${phase}`];
  if (!object(choice) || choice.round !== Number(state.round)
    || choice.phase !== phase || !SIDE_KEYS.has(choice.chosenFirstActorSideKey)) {
    fail("SELECTED_MELEE_PHASE_INITIATIVE_UNRESOLVED", phase);
  }
}
function routeUnit(state, piece) {
  const unit = state.officialActionRouteCatalogue.units.find((entry) => (
    entry.pieceId === piece.id
  ));
  if (!unit || unit.recordKey !== piece.officialUnitRecordKey) {
    fail("SELECTED_MELEE_ROUTE_PROFILE_STALE", piece.id);
  }
  return unit;
}
function currentSpeed(state, piece) {
  const movement = routeUnit(state, piece).movementProfile;
  const printed = Number(piece.currentModels) === 1
    ? Number(movement.singleModelSpeedInches)
    : Number(movement.multiModelSpeedInches);
  const selected = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { actionType: state.phase });
  const current = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  return printed + Math.max(Number(selected.speedModifier || 0),
    Number(current.speedModifier || 0), Number(battlefield.speedModifier || 0));
}
function coherencyRange(state, piece) {
  const current = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: state.phase } },
    ) : {};
  return Math.max(
    milli(routeUnit(state, piece).movementProfile.horizontalCoherencyInches),
    Number(current.horizontalCoherencyMilliInches || 0),
  );
}
function normalizedName(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function profileFielded(piece, profile) {
  const selected = new Set((piece.selectedUpgradeNames || []).map(normalizedName));
  const free = Number(profile.costSmall || 0) === 0
    && Number(profile.costLarge || 0) === 0;
  return free || selected.has(normalizedName(profile.weaponName));
}
function combatProfiles(state, piece, catalogueV2 = verifyRuntimeState(state)) {
  const all = catalogueV2.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey
      && profile.phase === "combat"
      && profile.range.kind === "engagement"
      && profileFielded(piece, profile)
  ));
  const replaced = new Set(all.filter((profile) => profile.linkedTo !== "-")
    .map((profile) => normalizedName(profile.linkedTo)));
  return all.filter((profile) => !replaced.has(normalizedName(profile.weaponName)))
    .sort((left, right) => left.profileKey.localeCompare(right.profileKey));
}
function pending(state, stage) {
  const value = state.pendingAction;
  if (!object(value)
    || value.schema !== OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA
    || value.stage !== stage
    || value.pendingHash !== hashStarcraftTmgContract(without(value, ["pendingHash"]))
    || value.round !== Number(state.round)
    || value.phase !== state.phase
    || value.sideKey !== state.activeSideKey) {
    fail("SELECTED_MELEE_PENDING_INVALID", stage);
  }
  return value;
}
function diagnostic(sideKey, phase, pieceId, actionType, error) {
  return freezeDeep({ actionType, sideKey, phase, pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { rulesTruth: "official_selected_melee_fail_closed",
      trainingTruth: false } });
}
function chargeContext(state, sideKey, piece) {
  phaseReady(state, sideKey, "assault");
  if (!activePiece(piece) || piece.sideKey !== sideKey
    || piece.isStructure === true || piece.combatTag !== "ground"
    || piece.combatTags?.includes("flying")) {
    fail("SELECTED_MELEE_CHARGE_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (piece.activatedPhases?.assault === true) {
    fail("SELECTED_MELEE_CHARGE_ALREADY_ACTIVATED", piece.id);
  }
  assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "assault");
  if (piece.disengageAssaultRestriction?.chargeProhibited === true) {
    fail("SELECTED_MELEE_POST_DISENGAGE_CHARGE_PROHIBITED", piece.id);
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  if (graph.engagedUnitIds.includes(piece.id)) {
    fail("SELECTED_MELEE_CHARGE_REQUIRES_UNENGAGED", piece.id);
  }
  const targets = state.pieces.filter((target) => (
    target.sideKey === otherSide(sideKey) && activePiece(target)
      && target.combatTag === "ground" && !target.combatTags?.includes("flying")
  ));
  if (targets.length === 0) fail("SELECTED_MELEE_CHARGE_TARGET_UNAVAILABLE");
  return { graph, targets };
}
function chargeDeclarationDomain(state, sideKey, piece) {
  const context = chargeContext(state, sideKey, piece);
  const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { actionType: "charge" });
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: "charge" } },
    ) : {};
  const battlefield = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: piece.id, context: { actionType: "charge" } },
    ) : {};
  const chargeRoll = characteristic.chargeDistanceRoll
    || { diceCount: 1, keepHighest: 1, addTo: "speed" };
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND,
    actionType: "charge", sideKey, phase: "assault", pieceId: piece.id,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...CHARGE_ATOMS],
    parameterSchema: { type: "object", required: ["leadingModelId", "targets"],
      targetUnitCount: { minimum: 1, maximum: null },
      oneTargetModelPerTargetUnit: true },
    constraints: {
      leadingModelIds: activeModels(piece).map((model) => model.id).sort(),
      eligibleTargetModelIdsByUnitId: Object.fromEntries(context.targets.map((target) => (
        [target.id, activeModels(target).map((model) => model.id).sort()]
      ))),
      speedInches: currentSpeed(state, piece),
      chargeDistanceModifier: modifiers.chargeDistanceModifier,
      impactHitModifier: Number(modifiers.impactHitModifier || 0)
        + Number(characteristic.impactHitModifier || 0)
        + Number(battlefield.impactHitModifier || 0),
      chargeDistanceRoll: clone(chargeRoll),
      lineOfSightRequired: false, groundOnly: true,
      targetsDeclaredBeforeChance: true,
      activeChargeModifiersApplied: true,
      engagementGraphHash: context.graph.graphHash,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_charge_declaration_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function canonicalTargets(domain, value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("SELECTED_MELEE_CHARGE_TARGETS_REQUIRED");
  }
  const seen = new Set();
  return value.map((entry) => {
    const unitId = String(entry?.unitId || "");
    const modelId = String(entry?.modelId || "");
    if (seen.has(unitId)
      || !domain.constraints.eligibleTargetModelIdsByUnitId?.[unitId]?.includes(modelId)
      || Object.keys(entry || {}).some((key) => !["unitId", "modelId"].includes(key))) {
      fail("SELECTED_MELEE_CHARGE_TARGET_INVALID", `${unitId}:${modelId}`);
    }
    seen.add(unitId);
    return { unitId, modelId };
  }).sort((left, right) => left.unitId.localeCompare(right.unitId));
}
function instantiateChargeDeclaration(state, domain, parameters) {
  if (!object(parameters)
    || Object.keys(parameters).some((key) => !["leadingModelId", "targets"].includes(key))) {
    fail("SELECTED_MELEE_CHARGE_DECLARATION_PARAMETERS_INVALID");
  }
  const leadingModelId = String(parameters.leadingModelId || "");
  if (!domain.constraints.leadingModelIds.includes(leadingModelId)) {
    fail("SELECTED_MELEE_CHARGE_LEADING_MODEL_INVALID", leadingModelId);
  }
  const targets = canonicalTargets(domain, parameters.targets);
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_declaration_plan_v1",
    semanticVersion: "1.0.0", sideKey: domain.sideKey,
    pieceId: domain.pieceId, leadingModelId, targets,
    speedInches: domain.constraints.speedInches,
    chargeDistanceModifier: domain.constraints.chargeDistanceModifier,
    impactHitModifier: domain.constraints.impactHitModifier,
    chargeDistanceRoll: clone(domain.constraints.chargeDistanceRoll),
    activeChargeModifiersApplied: true,
    domainId: domain.domainId,
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: Number(domain.constraints.chargeDistanceRoll.diceCount),
      layout: { chargeDistance: Number(domain.constraints.chargeDistanceRoll.diceCount) },
      revealOrder: ["chargeDistance"] },
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_charge_declaration",
    trainingTruth: false,
  }, "chargePlanHash");
  const action = freezeDeep({ actionType: "charge", sideKey: domain.sideKey,
    phase: "assault", pieceId: domain.pieceId, chargePlan: plan,
    chance: clone(plan.chance), ruleAtomIds: [...CHARGE_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { leadingModelId, targets }, action,
    rulesTruth: "official_selected_roster_charge_declaration", trainingTruth: false });
}
function revealDice(value, count, code) {
  if (!Array.isArray(value) || value.length !== count) fail(code);
  return value.map((entry) => {
    const faces = object(entry) ? Number(entry.faces) : 6;
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail(code);
    }
    return outcome;
  });
}
function chargeResolutionDomain(state) {
  const current = pending(state, "resolve_charge_after_roll");
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND,
    actionType: "resolve_charge", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...CHARGE_ATOMS],
    parameterSchema: { type: "object", required: ["outcome"],
      outcome: ["success", "failure"],
      successRequires: ["path", "placements"],
      failureRequires: ["failureProof"] },
    constraints: {
      pendingHash: current.pendingHash,
      leadingModelId: current.chargePlan.leadingModelId,
      declaredTargets: clone(current.chargePlan.targets),
      chargeRoll: current.chargeRoll,
      speedInches: current.chargePlan.speedInches,
      chargeDistanceModifier: current.chargePlan.chargeDistanceModifier,
      maxDistanceMilliInches: current.maxDistanceMilliInches,
      exactRemainingPlacementCount: activeModels(piece).length - 1,
      coherencyRangeMilliInches: coherencyRange(state, piece),
      acceptedFailureProofs: ["distance_shortfall", "declared_target_spread"],
      allDeclaredTargetsMustBeEngaged: true,
      undeclaredEnemyEngagementProhibited: true,
      remainingPlacementPriority: ["base_to_base", "engagement", "coherency"],
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_charge_post_roll_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function relocationParameters(parameters) {
  return { leadingModelId: parameters.leadingModelId,
    path: parameters.path, placements: parameters.placements,
    elevationTransitions: parameters.elevationTransitions || [],
    gapMouths: parameters.gapMouths || [],
    coherencyGapMouths: parameters.coherencyGapMouths || [] };
}
function applyGeometry(stateInput, pieceId, geometry) {
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pieceId);
  for (const placement of geometry.finalModelPositions) {
    const model = piece.models.find((entry) => entry.id === placement.modelId);
    model.xInches = inches(placement.xMilliInches);
    model.yInches = inches(placement.yMilliInches);
    model.elevation = placement.elevation;
    model.supportTerrainIds = clone(placement.supportTerrainIds || []);
    model.baseRotationDegrees = placement.rotationDegrees || 0;
    model.adjacentAccessPointIds = (state.board.accessPoints || []).filter((access) => {
      const raw = access.footprint || {};
      const rectangle = { minX: Number(raw.minXMilliInches),
        maxX: Number(raw.maxXMilliInches), minY: Number(raw.minYMilliInches),
        maxY: Number(raw.maxYMilliInches) };
      if (!Object.values(rectangle).every(Number.isSafeInteger)) return false;
      const x = Math.max(rectangle.minX,
        Math.min(placement.xMilliInches, rectangle.maxX));
      const y = Math.max(rectangle.minY,
        Math.min(placement.yMilliInches, rectangle.maxY));
      return Math.hypot(placement.xMilliInches - x, placement.yMilliInches - y)
        <= modelRadius(model) + TOLERANCE;
    }).map((entry) => entry.accessPointId || entry.id).sort();
  }
  const leading = geometry.finalModelPositions.find((entry) => (
    entry.modelId === geometry.leadingModelId
  ));
  piece.xInches = inches(leading.xMilliInches);
  piece.yInches = inches(leading.yMilliInches);
  piece.lastLeadingModelId = geometry.leadingModelId;
  for (const terrainId of geometry.grassRemovedTerrainIds || []) {
    const terrain = state.board.terrain.find((entry) => entry.id === terrainId);
    if (terrain) terrain.isRemoved = true;
  }
  return state;
}
function assertNoOverlap(state, piece) {
  for (const own of activeModels(piece)) {
    for (const otherPiece of state.pieces.filter((entry) => (
      entry.id !== piece.id && activePiece(entry)
    ))) {
      for (const other of activeModels(otherPiece)) {
        if (baseGap(own, other) < -TOLERANCE) {
          fail("SELECTED_MELEE_CHARGE_BASE_OVERLAP", `${own.id}:${other.id}`);
        }
      }
    }
  }
}
function validateChargeSuccess(state, current, parameters) {
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const geometry = validateOfficialSelectedRosterRelocationGeometryV1({
    state, actionType: "charge", pieceId: piece.id,
    maxDistanceMilliInches: current.maxDistanceMilliInches,
    coherencyRangeMilliInches: coherencyRange(state, piece),
    currentlyEngagedEnemyUnitIds: [],
    parameters: relocationParameters({ ...parameters,
      leadingModelId: current.chargePlan.leadingModelId }),
  });
  const projected = applyGeometry(state, piece.id, geometry);
  const projectedPiece = projected.pieces.find((entry) => entry.id === piece.id);
  assertNoOverlap(projected, projectedPiece);
  const graph = deriveOfficialEngagementGraphV2(projected);
  const declaredUnitIds = current.chargePlan.targets.map((entry) => entry.unitId).sort();
  const actualUnitIds = graphEnemyUnitIds(graph, piece.id);
  if (!declaredUnitIds.every((unitId) => actualUnitIds.includes(unitId))) {
    fail("SELECTED_MELEE_CHARGE_ALL_TARGETS_NOT_ENGAGED");
  }
  const undeclared = actualUnitIds.filter((unitId) => !declaredUnitIds.includes(unitId));
  if (undeclared.length > 0) {
    fail("SELECTED_MELEE_CHARGE_UNDECLARED_ENEMY_ENGAGEMENT", undeclared.join(","));
  }
  const leadingEdges = edgeForModel(graph, piece.id, current.chargePlan.leadingModelId);
  if (!declaredUnitIds.every((unitId) => leadingEdges.some((edge) => (
    enemyUnitId(edge, piece.id) === unitId
  )))) {
    fail("SELECTED_MELEE_CHARGE_LEADING_MODEL_TARGET_ENGAGEMENT_REQUIRED");
  }
  const allLeadingBaseToBase = declaredUnitIds.every((unitId) => leadingEdges.some((edge) => (
    enemyUnitId(edge, piece.id) === unitId
      && Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
  )));
  if (!allLeadingBaseToBase
    && geometry.distanceTravelledMilliInches < current.maxDistanceMilliInches - TOLERANCE) {
    fail("SELECTED_MELEE_CHARGE_CLOSEST_POSITION_REQUIRED");
  }
  const priorities = activeModels(projectedPiece).filter((model) => (
    model.id !== current.chargePlan.leadingModelId
  )).map((model) => {
    const edges = edgeForModel(graph, piece.id, model.id).filter((edge) => (
      declaredUnitIds.includes(enemyUnitId(edge, piece.id))
    ));
    return { modelId: model.id,
      priority: edges.some((edge) => Number(edge.horizontalBaseGapMilliInches)
        <= TOLERANCE) ? "base_to_base"
        : edges.length > 0 ? "engagement" : "coherency" };
  });
  return { geometry, projected, graph, declaredUnitIds,
    allLeadingBaseToBase, priorities };
}
function failureProof(state, current, proof) {
  const piece = state.pieces.find((entry) => entry.id === current.pieceId);
  const leading = activeModels(piece).find((entry) => (
    entry.id === current.chargePlan.leadingModelId
  ));
  const targets = current.chargePlan.targets.map((entry) => {
    const target = state.pieces.find((row) => row.id === entry.unitId);
    const model = activeModels(target).find((row) => row.id === entry.modelId);
    return { ...entry, model, minimumMoveToEngageMilliInches:
      Math.max(0, baseGap(leading, model) - 1000) };
  });
  const kind = String(proof?.kind || "");
  if (kind === "distance_shortfall") {
    const impossible = targets.filter((entry) => (
      entry.minimumMoveToEngageMilliInches > current.maxDistanceMilliInches + TOLERANCE
    ));
    if (impossible.length === 0) fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID");
    return { kind, impossibleTargetUnitIds: impossible.map((entry) => entry.unitId).sort(),
      maximumChargeDistanceMilliInches: current.maxDistanceMilliInches };
  }
  if (kind === "declared_target_spread" && targets.length > 1) {
    const incompatiblePairs = [];
    for (let left = 0; left < targets.length; left += 1) {
      for (let right = left + 1; right < targets.length; right += 1) {
        const a = targets[left]; const b = targets[right];
        const aReach = modelRadius(leading) + modelRadius(a.model) + 1000;
        const bReach = modelRadius(leading) + modelRadius(b.model) + 1000;
        if (centreDistance(modelPoint(a.model), modelPoint(b.model))
          > aReach + bReach + TOLERANCE) {
          incompatiblePairs.push([a.unitId, b.unitId].sort());
        }
      }
    }
    if (incompatiblePairs.length === 0) {
      fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID");
    }
    return { kind, incompatibleTargetUnitPairs: incompatiblePairs.sort() };
  }
  fail("SELECTED_MELEE_CHARGE_FAILURE_PROOF_INVALID", kind);
}
function instantiateChargeResolution(state, domain, parameters) {
  const current = pending(state, "resolve_charge_after_roll");
  const outcome = String(parameters?.outcome || "");
  const allowed = new Set(["outcome", "path", "placements", "failureProof",
    "elevationTransitions", "gapMouths", "coherencyGapMouths"]);
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.has(key))
    || !["success", "failure"].includes(outcome)) {
    fail("SELECTED_MELEE_CHARGE_RESOLUTION_PARAMETERS_INVALID");
  }
  const success = outcome === "success"
    ? validateChargeSuccess(state, current, parameters) : null;
  const proof = outcome === "failure"
    ? failureProof(state, current, parameters.failureProof) : null;
  const plan = seal({
    schemaVersion: "starcraft_tmg_selected_roster_charge_resolution_plan_v1",
    semanticVersion: "1.0.0", sideKey: current.sideKey,
    pieceId: current.pieceId, outcome, pendingHash: current.pendingHash,
    declarationChargePlanHash: current.chargePlan.chargePlanHash,
    chargeRoll: current.chargeRoll,
    maxDistanceMilliInches: current.maxDistanceMilliInches,
    domainId: domain.domainId,
    canonicalParameters: { outcome,
      ...(outcome === "success" ? {
        path: clone(parameters.path), placements: clone(parameters.placements),
        elevationTransitions: clone(parameters.elevationTransitions || []),
        gapMouths: clone(parameters.gapMouths || []),
        coherencyGapMouths: clone(parameters.coherencyGapMouths || []),
      } : { failureProof: clone(parameters.failureProof) }) },
    geometry: success?.geometry || null,
    postEngagementGraphHash: success?.graph.graphHash || null,
    declaredTargetUnitIds: current.chargePlan.targets.map((entry) => entry.unitId).sort(),
    allLeadingBaseToBase: success?.allLeadingBaseToBase ?? false,
    remainingPlacementPriorities: success?.priorities || [],
    failureProof: proof,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_charge_resolution",
    trainingTruth: false,
  }, "chargeResolutionPlanHash");
  const action = freezeDeep({ actionType: "resolve_charge", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId, chargeResolutionPlan: plan,
    chance: null, ruleAtomIds: [...CHARGE_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: clone(plan.canonicalParameters),
    action, rulesTruth: "official_selected_roster_charge_resolution",
    trainingTruth: false });
}
function impactDomain(state) {
  const current = pending(state, "resolve_mandatory_impact");
  const targetUnitIds = current.targetUnitIds;
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND,
    actionType: "resolve_impact", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...IMPACT_ATOMS],
    parameterSchema: { type: "object", required: ["allocations"],
      allocationUnit: "impact_die_per_eligible_model", targetUnitIds,
      eligibleModels: clone(current.eligibleImpactModels),
      exactTotal: current.impactDice,
      singleTargetForcedAllocation: targetUnitIds.length === 1 },
    constraints: { pendingHash: current.pendingHash,
      impactDice: current.impactDice,
      baseHitThreshold: current.baseHitThreshold,
      hitRollModifier: current.hitRollModifier,
      effectiveHitThreshold: current.effectiveHitThreshold,
      targetUnitIds, damage: 1, surge: null,
      rollTargetsSeparately: true },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_impact_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function canonicalImpactAllocations(value, eligibleModels) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("SELECTED_MELEE_IMPACT_ALLOCATION_INVALID");
  }
  const models = new Map(eligibleModels.map((entry) => [entry.modelId, entry]));
  const seen = new Set();
  const rows = value.map((entry) => {
    const modelId = String(entry?.modelId || "");
    const targetUnitId = String(entry?.targetUnitId || "");
    const dice = Number(entry?.dice);
    const eligible = models.get(modelId);
    const key = `${modelId}:${targetUnitId}`;
    if (!eligible || !eligible.eligibleTargetUnitIds.includes(targetUnitId)
      || seen.has(key) || !Number.isSafeInteger(dice) || dice <= 0
      || Object.keys(entry || {}).some((name) => (
        !["modelId", "targetUnitId", "dice"].includes(name)))) {
      fail("SELECTED_MELEE_IMPACT_ALLOCATION_INVALID", key);
    }
    seen.add(key);
    return { modelId, targetUnitId, dice };
  }).sort((left, right) => `${left.modelId}:${left.targetUnitId}`.localeCompare(
    `${right.modelId}:${right.targetUnitId}`));
  for (const eligible of eligibleModels) {
    const allocated = rows.filter((entry) => entry.modelId === eligible.modelId)
      .reduce((sum, entry) => sum + entry.dice, 0);
    if (allocated !== eligible.impactDice
      || (eligible.eligibleTargetUnitIds.length === 1
        && rows.filter((entry) => entry.modelId === eligible.modelId).length !== 1)) {
      fail("SELECTED_MELEE_IMPACT_MODEL_ALLOCATION_TOTAL_INVALID", eligible.modelId);
    }
  }
  return rows;
}
function canonicalAllocations(value, targetUnitIds, total, code) {
  if (!Array.isArray(value) || value.length === 0) fail(code);
  const seen = new Set();
  const rows = value.map((entry) => {
    const targetUnitId = String(entry?.targetUnitId || "");
    const dice = Number(entry?.dice);
    if (!targetUnitIds.includes(targetUnitId) || seen.has(targetUnitId)
      || !Number.isSafeInteger(dice) || dice <= 0
      || Object.keys(entry || {}).some((key) => !["targetUnitId", "dice"].includes(key))) {
      fail(code, targetUnitId);
    }
    seen.add(targetUnitId);
    return { targetUnitId, dice };
  }).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId));
  if (rows.reduce((sum, entry) => sum + entry.dice, 0) !== total) fail(code);
  return rows;
}
function impactChancePlan(state, current, allocations) {
  const targets = allocations.map((allocation) => {
    const target = state.pieces.find((entry) => entry.id === allocation.targetUnitId);
    const profile = getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, target.officialUnitRecordKey);
    const modifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, target, { attackerPieceId: current.pieceId,
        damageKind: "enemy_special_ability", weaponName: "IMPACT" });
    const characteristic = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: current.pieceId,
          targetPieceId: target.id, damageKind: "enemy_special_ability",
          attackKind: "impact", weaponName: "IMPACT" } },
      ) : {};
    const battlefield = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: current.pieceId,
          targetPieceId: target.id, damageKind: "enemy_special_ability",
          attackKind: "impact", weaponName: "IMPACT" } },
      ) : {};
    const evadeEligible = profile.evadeThreshold !== null
      && (modifiers.evadeEligible
        || characteristic.eligibleEvadeAgainstAllAttacks);
    const evadeThreshold = profile.evadeThreshold === null ? null
      : Math.max(2, Number(profile.evadeThreshold) - modifiers.evadeModifier);
    return { targetUnitId: target.id, dice: allocation.dice,
      targetProfileHash: profile.profileHash,
      armourThreshold: Math.max(2, Number(profile.armourThreshold)
        - Number(battlefield.armourModifier || 0)), evadeThreshold,
      evadeEligible,
      evadeModifier: modifiers.evadeModifier,
      layout: { hit: allocation.dice, armour: allocation.dice,
        evade: evadeEligible ? allocation.dice : 0 } };
  });
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_impact_chance_plan_v1",
    semanticVersion: "1.0.0", impactDice: current.impactDice,
    baseHitThreshold: current.baseHitThreshold,
    hitRollModifier: current.hitRollModifier,
    effectiveHitThreshold: current.effectiveHitThreshold,
    targets, chance: { kind: "fixed_roll_sequence", faces: 6,
      count: targets.reduce((sum, target) => (
        sum + target.layout.hit + target.layout.armour + target.layout.evade
      ), 0), revealOrder: ["target_order", "hit", "armour", "evade"] },
    rulesTruth: "official_selected_roster_impact_chance_plan",
    trainingTruth: false }, "impactPlanHash");
}
function instantiateImpact(state, domain, parameters) {
  const current = pending(state, "resolve_mandatory_impact");
  if (!object(parameters) || Object.keys(parameters).some((key) => key !== "allocations")) {
    fail("SELECTED_MELEE_IMPACT_PARAMETERS_INVALID");
  }
  const modelAllocations = canonicalImpactAllocations(
    parameters.allocations, current.eligibleImpactModels);
  const allocations = current.targetUnitIds.map((targetUnitId) => ({
    targetUnitId,
    dice: modelAllocations.filter((entry) => entry.targetUnitId === targetUnitId)
      .reduce((sum, entry) => sum + entry.dice, 0),
  })).filter((entry) => entry.dice > 0);
  const impactPlan = impactChancePlan(state, current, allocations);
  const action = freezeDeep({ actionType: "resolve_impact", sideKey: current.sideKey,
    phase: "assault", pieceId: current.pieceId, allocations,
    modelAllocations,
    pendingHash: current.pendingHash, impactPlan,
    chance: clone(impactPlan.chance), ruleAtomIds: [...IMPACT_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { allocations: modelAllocations }, action,
    rulesTruth: "official_selected_roster_impact_instantiation",
    trainingTruth: false });
}
function fightingRanks(state, piece, graph) {
  const fightingModelIds = activeModels(piece).filter((model) => (
    edgeForModel(graph, piece.id, model.id).length > 0
  )).map((model) => model.id).sort();
  const fighting = new Set(fightingModelIds);
  const supportingModelIds = activeModels(piece).filter((model) => (
    !fighting.has(model.id) && activeModels(piece).some((friend) => (
      fighting.has(friend.id) && baseGap(model, friend) <= TOLERANCE
    ))
  )).map((model) => model.id).sort();
  return { fightingModelIds, supportingModelIds,
    contributingModelIds: [...fightingModelIds, ...supportingModelIds].sort() };
}
function closeRanksProjection(state, piece, graph, parameters) {
  const mode = String(parameters.closeRanksMode || "decline");
  if (mode === "decline") return { state, graph, geometry: null };
  if (mode !== "move") fail("SELECTED_MELEE_CLOSE_RANKS_MODE_INVALID", mode);
  const startEnemyUnitIds = graphEnemyUnitIds(graph, piece.id);
  const leadingModelId = String(parameters.leadingModelId || "");
  const leading = activeModels(piece).find((model) => model.id === leadingModelId);
  if (!leading || edgeForModel(graph, piece.id, leading.id).some((edge) => (
    Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
  ))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_LEADER_PINNED", leadingModelId);
  }
  const pinned = new Set(activeModels(piece).filter((model) => (
    edgeForModel(graph, piece.id, model.id).some((edge) => (
      Number(edge.horizontalBaseGapMilliInches) <= TOLERANCE
    ))
  )).map((model) => model.id));
  const geometry = validateOfficialSelectedRosterRelocationGeometryV1({
    state, actionType: "close_ranks", pieceId: piece.id,
    maxDistanceMilliInches: 3000,
    coherencyRangeMilliInches: coherencyRange(state, piece),
    currentlyEngagedEnemyUnitIds: startEnemyUnitIds,
    parameters: relocationParameters(parameters),
  });
  const projected = applyGeometry(state, piece.id, geometry);
  const projectedPiece = projected.pieces.find((entry) => entry.id === piece.id);
  assertNoOverlap(projected, projectedPiece);
  for (const modelId of pinned) {
    const before = activeModels(piece).find((model) => model.id === modelId);
    const after = activeModels(projectedPiece).find((model) => model.id === modelId);
    if (centreDistance(modelPoint(before), modelPoint(after)) > TOLERANCE) {
      fail("SELECTED_MELEE_CLOSE_RANKS_PINNED_MODEL_MOVED", modelId);
    }
  }
  const postGraph = deriveOfficialEngagementGraphV2(projected);
  const postEnemyUnitIds = graphEnemyUnitIds(postGraph, piece.id);
  if (!startEnemyUnitIds.every((id) => postEnemyUnitIds.includes(id))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_EXISTING_ENGAGEMENT_LOST");
  }
  if (postEnemyUnitIds.some((id) => !startEnemyUnitIds.includes(id))) {
    fail("SELECTED_MELEE_CLOSE_RANKS_NEW_ENGAGEMENT_PROHIBITED");
  }
  const enemies = state.pieces.filter((entry) => startEnemyUnitIds.includes(entry.id))
    .flatMap((entry) => activeModels(entry));
  const beforeGap = Math.min(...enemies.map((model) => baseGap(leading, model)));
  const afterLeading = activeModels(projectedPiece).find((model) => model.id === leading.id);
  const afterGap = Math.min(...enemies.map((model) => baseGap(afterLeading, model)));
  if (afterGap >= beforeGap - TOLERANCE) {
    fail("SELECTED_MELEE_CLOSE_RANKS_MUST_END_CLOSER");
  }
  return { state: projected, graph: postGraph, geometry };
}
function fightContext(state, sideKey, piece, catalogueV2, profileKey) {
  phaseReady(state, sideKey, "combat");
  if (!activePiece(piece) || piece.sideKey !== sideKey
    || piece.isStructure === true || piece.combatTag !== "ground"
    || piece.combatTags?.includes("flying")) {
    fail("SELECTED_MELEE_FIGHT_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (piece.activatedPhases?.combat === true) {
    fail("SELECTED_MELEE_FIGHT_ALREADY_ACTIVATED", piece.id);
  }
  assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "combat");
  const graph = deriveOfficialEngagementGraphV2(state);
  const targetUnitIds = graphEnemyUnitIds(graph, piece.id);
  if (targetUnitIds.length === 0) fail("SELECTED_MELEE_FIGHT_REQUIRES_ENGAGEMENT");
  const profile = combatProfiles(state, piece, catalogueV2).find((entry) => (
    entry.profileKey === profileKey));
  if (!profile) fail("SELECTED_MELEE_COMBAT_PROFILE_UNAVAILABLE", String(profileKey || ""));
  const eligibleTargetUnitIds = targetUnitIds.filter((unitId) => {
    const target = state.pieces.find((entry) => entry.id === unitId);
    const tags = new Set([target.combatTag, ...(target.combatTags || [])]
      .map(normalizedName).filter(Boolean));
    return profile.targetTags.some((tag) => tags.has(normalizedName(tag)));
  });
  if (eligibleTargetUnitIds.length === 0) {
    fail("SELECTED_MELEE_FIGHT_TARGET_TAG_PROHIBITED", piece.id);
  }
  return { graph, targetUnitIds: eligibleTargetUnitIds, profile };
}
function fightDomain(state, sideKey, piece, catalogueV2, profileKey) {
  const context = fightContext(state, sideKey, piece, catalogueV2, profileKey);
  const zerg = state.officialZergUniqueFamilySourceBundle
    ? projectOfficialZergUniqueFamilyModifiersV1(
      state.officialZergUniqueFamilySourceBundle, state,
      { pieceId: piece.id, attackKind: "close_combat", weaponPhase: "combat",
        weaponName: context.profile.weaponName })
    : { closeCombatInstant: false };
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND,
    actionType: "fight", sideKey, phase: "combat", pieceId: piece.id,
    profileKey: context.profile.profileKey, weaponName: context.profile.weaponName,
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...FIGHT_ATOMS],
    parameterSchema: { type: "object", required: ["closeRanksMode", "allocations"],
      closeRanksMode: ["decline", "move"],
      allocationUnit: "attack_die", targetUnitIds: context.targetUnitIds,
      moveRequires: ["leadingModelId", "path", "placements"] },
    constraints: { engagementGraphHash: context.graph.graphHash,
      targetUnitIds: context.targetUnitIds,
      printedRateOfAttack: context.profile.rateOfAttack,
      sourceProfileHash: context.profile.profileHash,
      optionalCloseRanksDistanceMilliInches: 3000,
      fightingAndSupportingRanksDerivedAfterCloseRanks: true,
      allocationDeclaredBeforeHitRoll: true,
      surgeDieCannotBeSplit: true,
      criticalHitTransfersExistingDiceOnly: true,
      enemyReactionAllowed: !(context.profile.effects.some((effect) => (
        effect.effectAtomId === "attack-effect:instant-v1"))
        || zerg.closeCombatInstant),
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_fight_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function fightChancePlan(state, attacker, profile, allocations, surgeTargetUnitId,
  criticalTargetUnitId) {
  const surge = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:surge-armour-bypass-v1"
  ));
  const printedCritical = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:critical-hit-v1"
  ));
  const battlefieldAttacker = state.officialBattlefieldAssetFamilySourceBundle
    ? projectOfficialBattlefieldAssetFamilyModifiersV1(
      state.officialBattlefieldAssetFamilySourceBundle, state,
      { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
        weaponName: profile.weaponName, damageKind: "close_combat",
        attackKind: "close_combat" } },
    ) : {};
  const grantedCritical = Number(battlefieldAttacker.criticalHit || 0);
  const critical = printedCritical || (grantedCritical > 0 ? {
    effectAtomId: "attack-effect:critical-hit-v1", sourceKind: "weapon_keyword",
    parameters: { bypassArmourDice: grantedCritical },
  } : null);
  const printedInstant = profile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:instant-v1"
  ));
  const zerg = state.officialZergUniqueFamilySourceBundle
    ? projectOfficialZergUniqueFamilyModifiersV1(
      state.officialZergUniqueFamilySourceBundle, state,
      { pieceId: attacker.id, attackKind: "close_combat", weaponPhase: "combat",
        weaponName: profile.weaponName })
    : { closeCombatInstant: false, sourceDefinitionIds: [] };
  const instant = printedInstant || (zerg.closeCombatInstant ? {
    effectAtomId: "attack-effect:instant-v1", sourceKind: "weapon_keyword", parameters: {},
  } : null);
  if (Boolean(surge) !== Boolean(surgeTargetUnitId)
    || Boolean(critical) !== Boolean(criticalTargetUnitId)) {
    fail("SELECTED_MELEE_EFFECT_TARGET_REQUIRED");
  }
  const targets = allocations.map((allocation) => {
    const target = state.pieces.find((entry) => entry.id === allocation.targetUnitId);
    const targetProfile = getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, target.officialUnitRecordKey);
    const targetModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, target, { attackerPieceId: attacker.id,
        damageKind: "close_combat", weaponName: profile.weaponName });
    const characteristicTarget = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const characteristicAttacker = state.officialCharacteristicStatusFamilySourceBundle
      ? projectOfficialCharacteristicStatusFamilyModifiersV1(
        state.officialCharacteristicStatusFamilySourceBundle, state,
        { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const selectedAttacker = resolveOfficialSelectedRosterAbilityModifiersV1(
      state, attacker, { attackerPieceId: attacker.id, targetPieceId: target.id,
        damageKind: "close_combat", weaponName: profile.weaponName });
    const battlefieldTarget = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const battlefieldAttackerForTarget = state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: attacker.id, context: { attackerPieceId: attacker.id,
          targetPieceId: target.id, damageKind: "close_combat",
          attackKind: "close_combat", weaponName: profile.weaponName } },
      ) : {};
    const evadeEligible = targetProfile.evadeThreshold !== null
      && (targetModifiers.evadeEligible
        || characteristicTarget.eligibleEvadeAgainstAllAttacks);
    const evadeThreshold = targetProfile.evadeThreshold === null ? null
      : Math.max(2, Math.min(6, Number(targetProfile.evadeThreshold)
        - Number(targetModifiers.evadeModifier || 0)
        + Number(characteristicAttacker.antiEvade || 0)));
    const pierce = profile.effects.find((effect) => (
      effect.effectAtomId === "attack-effect:pierce-v1"));
    const pierceMatched = Boolean(pierce?.parameters?.targetTag
      && targetProfile.combatTags.includes(pierce.parameters.targetTag));
    const damagePerDie = Number(characteristicAttacker.damageSetTo
      || (pierceMatched ? pierce.parameters.damage : profile.damage));
    return { targetUnitId: target.id, dice: allocation.dice,
      targetProfileHash: targetProfile.profileHash,
      armourThreshold: Math.max(2, Number(targetProfile.armourThreshold)
        - Number(battlefieldTarget.armourModifier || 0)),
      evadeEligible,
      evadeModifier: Number(targetModifiers.evadeModifier || 0),
      antiEvade: Number(characteristicAttacker.antiEvade || 0),
      evadeThreshold,
      precision: Math.max(Number(selectedAttacker.precision || 0),
        Number(characteristicAttacker.precision || 0),
        Number(battlefieldAttackerForTarget.precision || 0)),
      damagePerDie,
      damageSetToApplied: characteristicAttacker.damageSetTo || null,
      pierceMatched,
      surge: surgeTargetUnitId === target.id,
      criticalHit: criticalTargetUnitId === target.id,
      layout: { hit: allocation.dice,
        surge: surgeTargetUnitId === target.id ? 1 : 0,
        armour: allocation.dice,
        evade: evadeEligible ? allocation.dice : 0 } };
  });
  const criticalProfile = critical && !printedCritical ? (() => {
    const body = { ...without(profile, ["profileHash"]),
      profileKey: `${profile.profileKey}:orders-critical`, effects: [critical] };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  })() : profile;
  const criticalPlan = critical ? CRITICAL_HIT.plan({ profile: criticalProfile,
    attackPoolDice: allocations.find((entry) => (
      entry.targetUnitId === criticalTargetUnitId
    )).dice,
    targetDodge: { present: false, reduction: 0,
      source: "target_official_profile_and_effect_state" } }) : null;
  const instantProfile = instant && !printedInstant ? (() => {
    const body = { ...without(profile, ["profileHash"]),
      profileKey: `${profile.profileKey}:predation-instant`,
      effects: [...profile.effects, instant],
      runtimeGrantedEffectDefinitionIds: [...zerg.sourceDefinitionIds] };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  })() : profile;
  const instantPlan = instant ? INSTANT.plan({ profile: instantProfile }) : null;
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_fight_chance_plan_v1",
    semanticVersion: "1.0.0", profileKey: profile.profileKey,
    profileHash: profile.profileHash, targets,
    surgeTargetUnitId: surgeTargetUnitId || null,
    criticalTargetUnitId: criticalTargetUnitId || null,
    criticalHitPlan: criticalPlan,
    instantPlan,
    instantSourceDefinitionIds: printedInstant ? [] : [...zerg.sourceDefinitionIds],
    enemyReactionDeclarationAllowed: !instant,
    enemyReactionResolutionAllowed: !instant,
    activePrecisionValue: Math.max(0, ...targets.map((entry) => entry.precision)),
    precisionChoicePolicy: "failed_hit_die_indices_up_to_active_precision_value",
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: targets.reduce((sum, target) => sum + target.layout.hit
        + target.layout.surge + target.layout.armour + target.layout.evade, 0),
      revealOrder: ["target_order", "hit", "surge", "armour", "evade"] },
    rulesTruth: "official_selected_roster_fight_chance_plan",
    trainingTruth: false }, "fightChancePlanHash");
}
function instantiateFight(state, domain, parameters, catalogueV2) {
  const allowed = new Set(["closeRanksMode", "allocations", "surgeTargetUnitId",
    "criticalTargetUnitId", "leadingModelId", "path", "placements",
    "elevationTransitions", "gapMouths", "coherencyGapMouths"]);
  if (!object(parameters) || Object.keys(parameters).some((key) => !allowed.has(key))) {
    fail("SELECTED_MELEE_FIGHT_PARAMETERS_INVALID");
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const initial = fightContext(
    state, domain.sideKey, piece, catalogueV2, domain.profileKey);
  const projection = closeRanksProjection(state, piece, initial.graph, parameters);
  const ranks = fightingRanks(projection.state,
    projection.state.pieces.find((entry) => entry.id === piece.id), projection.graph);
  if (ranks.contributingModelIds.length === 0) {
    fail("SELECTED_MELEE_FIGHT_RANK_EMPTY");
  }
  const targetUnitIds = graphEnemyUnitIds(projection.graph, piece.id)
    .filter((unitId) => initial.targetUnitIds.includes(unitId));
  const characteristic = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, projection.state,
      { pieceId: piece.id, context: { weaponName: initial.profile.weaponName,
        attackKind: "close_combat", damageKind: "close_combat" } },
    ) : {};
  const effectiveRateOfAttack = Math.max(0, Number(initial.profile.rateOfAttack)
    + Number(characteristic.rateOfAttackModifier || 0));
  const attackDice = ranks.contributingModelIds.length * effectiveRateOfAttack;
  const allocations = canonicalAllocations(parameters.allocations,
    targetUnitIds, attackDice, "SELECTED_MELEE_FIGHT_ALLOCATION_INVALID");
  const surgeTargetUnitId = String(parameters.surgeTargetUnitId || "");
  const criticalTargetUnitId = String(parameters.criticalTargetUnitId || "");
  if ((surgeTargetUnitId && !allocations.some((entry) => (
    entry.targetUnitId === surgeTargetUnitId
  ))) || (criticalTargetUnitId && !allocations.some((entry) => (
    entry.targetUnitId === criticalTargetUnitId
  )))) {
    fail("SELECTED_MELEE_EFFECT_TARGET_INVALID");
  }
  const chancePlan = fightChancePlan(state, piece, initial.profile, allocations,
    surgeTargetUnitId, criticalTargetUnitId);
  const canonicalParameters = { closeRanksMode: String(parameters.closeRanksMode),
    allocations, surgeTargetUnitId: surgeTargetUnitId || null,
    criticalTargetUnitId: criticalTargetUnitId || null,
    ...(projection.geometry ? { leadingModelId: String(parameters.leadingModelId),
      path: clone(parameters.path), placements: clone(parameters.placements),
      elevationTransitions: clone(parameters.elevationTransitions || []),
      gapMouths: clone(parameters.gapMouths || []),
      coherencyGapMouths: clone(parameters.coherencyGapMouths || []) } : {}) };
  const plan = seal({ schemaVersion: "starcraft_tmg_selected_roster_fight_plan_v1",
    semanticVersion: "1.0.0", sideKey: domain.sideKey, pieceId: piece.id,
    domainId: domain.domainId, canonicalParameters,
    profileKey: initial.profile.profileKey,
    sourceProfileHash: initial.profile.profileHash,
    weaponName: initial.profile.weaponName,
    closeRanksMode: canonicalParameters.closeRanksMode,
    closeRanksGeometry: projection.geometry,
    preEngagementGraphHash: initial.graph.graphHash,
    attackEngagementGraphHash: projection.graph.graphHash,
    fightingModelIds: ranks.fightingModelIds,
    supportingModelIds: ranks.supportingModelIds,
    contributingModelIds: ranks.contributingModelIds,
    printedRateOfAttack: initial.profile.rateOfAttack,
    effectiveRateOfAttack,
    attackDice, allocations,
    fightChancePlan: chancePlan,
    fullFightingAndSupportingRankDenominator: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_fight_plan",
    trainingTruth: false }, "fightPlanHash");
  const action = freezeDeep({ actionType: "fight", sideKey: domain.sideKey,
    phase: "combat", pieceId: piece.id, weaponName: initial.profile.weaponName,
    meleePlan: plan, chance: clone(chancePlan.chance), ruleAtomIds: [...FIGHT_ATOMS],
    executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION });
  return freezeDeep({ schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_selected_roster_fight_instantiation",
    trainingTruth: false });
}

export function enumerateOfficialSelectedRosterMeleeActionsV1(state, options = {}) {
  const catalogueV2 = verifyRuntimeState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_MELEE_SIDE_INVALID", sideKey);
  const candidates = [];
  const parameterDomains = [];
  if (state.pendingAction?.schema === OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA) {
    if (state.pendingAction.sideKey !== sideKey) return freezeDeep({ candidates,
      parameterDomains, pendingOwnedBySideKey: state.pendingAction.sideKey,
      trainingTruth: false });
    try {
      parameterDomains.push(state.pendingAction.stage === "resolve_charge_after_roll"
        ? chargeResolutionDomain(state) : impactDomain(state));
    } catch (error) {
      if (options.includeDisabled === true) candidates.push(diagnostic(sideKey,
        state.phase, state.pendingAction.pieceId, state.pendingAction.stage, error));
      else throw error;
    }
    return freezeDeep({ schemaVersion:
      "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    candidates, parameterDomains, pendingActionOnly: true,
    searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
  }
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry)
  ))) {
    if (state.phase === "assault") {
      try {
        parameterDomains.push(chargeDeclarationDomain(state, sideKey, piece));
      } catch (error) {
        if (options.includeDisabled === true) candidates.push(diagnostic(sideKey,
          state.phase, piece.id, "charge", error));
      }
    } else if (state.phase === "combat") {
      const profiles = combatProfiles(state, piece, catalogueV2);
      for (const profile of profiles) {
        try {
          parameterDomains.push(fightDomain(
            state, sideKey, piece, catalogueV2, profile.profileKey));
        } catch (error) {
          if (options.includeDisabled === true) candidates.push(diagnostic(sideKey,
            state.phase, piece.id, `fight:${profile.profileKey}`, error));
        }
      }
    }
  }
  return freezeDeep({ schemaVersion:
    "starcraft_tmg_official_executable_legal_enumeration_v1",
  runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
  runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
  candidates: candidates.sort((left, right) => left.pieceId.localeCompare(right.pieceId)),
  parameterDomains: parameterDomains.sort((left, right) => (
    `${left.pieceId}:${left.parameterKind}`.localeCompare(
      `${right.pieceId}:${right.parameterKind}`)
  )), completeForSelectedChargeImpactAndFightRoutes: true,
  searchAndStrategyExcludedFromAuthority: true, trainingTruth: false });
}

export function instantiateOfficialSelectedRosterMeleeActionV1(
  state, domain, parameters,
) {
  const catalogueV2 = verifyRuntimeState(state);
  if (!object(domain)
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || domain.executorVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION) {
    fail("SELECTED_MELEE_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialSelectedRosterMeleeActionsV1(state, {
    sideKey: domain.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_MELEE_PARAMETER_DOMAIN_STALE");
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_CHARGE_DECLARATION_PARAMETER_KIND) {
    return instantiateChargeDeclaration(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_CHARGE_RESOLUTION_PARAMETER_KIND) {
    return instantiateChargeResolution(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_IMPACT_PARAMETER_KIND) {
    return instantiateImpact(state, domain, parameters);
  }
  if (domain.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND) {
    return instantiateFight(state, domain, parameters, catalogueV2);
  }
  fail("SELECTED_MELEE_PARAMETER_KIND_UNSUPPORTED", domain.parameterKind);
}

export function previewOfficialSelectedRosterMeleeActionV1(state, domain, parameters) {
  const instantiated = instantiateOfficialSelectedRosterMeleeActionV1(
    state, domain, parameters,
  );
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_melee_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    chance: clone(instantiated.action.chance), mutationApplied: false,
    rulesAuthority: true,
    rulesTruth: "official_selected_roster_melee_preview",
    trainingTruth: false }, "previewHash");
}
function sideHasActivation(state, sideKey, phase) {
  if (state.players?.[sideKey]?.passedPhases?.[phase] === true) return false;
  return state.pieces.some((piece) => piece.sideKey === sideKey && activePiece(piece)
    && piece.activatedPhases?.[phase] !== true);
}
function alternate(state, sideKey, phase) {
  const opponent = otherSide(sideKey);
  if (sideHasActivation(state, opponent, phase)) state.activeSideKey = opponent;
  else if (sideHasActivation(state, sideKey, phase)) state.activeSideKey = sideKey;
}
function exactCurrentSupply(profile, currentModels) {
  if (currentModels === 0) return 0;
  const tier = profile.squadProfile.find((entry) => entry.minimumModels !== null
    && currentModels >= entry.minimumModels && currentModels <= entry.maximumModels);
  if (!tier) fail("SELECTED_MELEE_SUPPLY_TIER_UNAVAILABLE", String(currentModels));
  return Number(tier.supply);
}
function applyCasualty(state, target, targetProfile, casualty) {
  for (const modelId of casualty.casualtyModelIds) {
    const model = target.models.find((entry) => entry.id === modelId);
    model.isDestroyed = true; model.isOnField = false;
    model.damage = targetProfile.hitPoints; model.remainingWounds = 0;
  }
  target.destroyedModelIds = target.models.filter((model) => model.isDestroyed === true)
    .map((model) => model.id).sort();
  target.currentModels = casualty.remainingModelIds.length;
  target.currentSupply = exactCurrentSupply(targetProfile, target.currentModels);
  target.damageMarker = casualty.postDamageMarker;
  if (casualty.casualtyModelIds.length > 0) {
    target.firstModelShieldCapacityApplied = false;
  }
  if (casualty.shieldedBefore && !casualty.shieldedAfter) {
    target.statuses = (target.statuses || []).filter((entry) => normalizedName(
      typeof entry === "string" ? entry : entry?.statusName || entry?.name) !== "shielded");
  }
  target.isDestroyed = casualty.targetDestroyed;
  target.isOnField = !casualty.targetDestroyed;
  if (casualty.targetDestroyed) target.isInReserves = false;
  const firstRemainingModel = target.models.find((model) => (
    casualty.remainingModelIds.includes(model.id)));
  if (firstRemainingModel) {
    const remainingCapacity = Number(targetProfile.hitPoints)
      + (target.firstModelShieldCapacityApplied
        ? Number(targetProfile.shield || 0) : 0);
    firstRemainingModel.damage = casualty.postDamageMarker;
    firstRemainingModel.remainingWounds = Math.max(0,
      remainingCapacity - casualty.postDamageMarker);
  }
}
function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}
function surgeValue(expression, roll) {
  if (expression === "D3") return Math.ceil(roll / 2);
  if (expression === "D3+1") return Math.ceil(roll / 2) + 1;
  if (expression === "D6") return roll;
  fail("SELECTED_MELEE_SURGE_EXPRESSION_UNSUPPORTED", expression);
}
function resolvePools(state, action, plan, options, kind) {
  const profile = kind === "fight"
    ? getOfficialAttackProfileV2(state.officialAttackProfileCatalogueV2,
      action.meleePlan.profileKey) : null;
  const rolls = revealDice(options.chanceReveals, plan.chance.count,
    "SELECTED_MELEE_CHANCE_REVEALS_INVALID");
  let offset = 0;
  const graph = deriveOfficialEngagementGraphV2(state);
  const rows = [];
  let precisionRemaining = kind === "fight" ? Number(plan.activePrecisionValue || 0) : 0;
  for (const targetPlan of plan.targets) {
    const target = state.pieces.find((entry) => entry.id === targetPlan.targetUnitId);
    const targetProfile = getOfficialCombatProfileV1(
      state.officialCombatProfileBundle, target.officialUnitRecordKey);
    const hitRolls = rolls.slice(offset, offset += targetPlan.layout.hit);
    const surgeRolls = rolls.slice(offset, offset += targetPlan.layout.surge);
    const armourRolls = rolls.slice(offset, offset += targetPlan.layout.armour);
    const evadeRolls = rolls.slice(offset, offset += targetPlan.layout.evade);
    const hitThreshold = kind === "impact"
      ? plan.effectiveHitThreshold : Number(profile.hitThreshold);
    const failedHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
      .filter(({ roll }) => !rollSucceeds(roll, hitThreshold))
      .map(({ index }) => index);
    const convertedFailedHitDieIndices = kind === "fight"
      ? [...new Set((options.precisionConvertedFailedDieIndicesByTarget
        ?.[target.id] || []).map(Number))].sort((left, right) => left - right) : [];
    if (convertedFailedHitDieIndices.length > precisionRemaining
      || convertedFailedHitDieIndices.length > Number(targetPlan.precision || 0)
      || convertedFailedHitDieIndices.some((index) => (
        !Number.isSafeInteger(index) || !failedHitDieIndices.includes(index)))) {
      fail("SELECTED_MELEE_PRECISION_SELECTION_INVALID", target.id);
    }
    precisionRemaining -= convertedFailedHitDieIndices.length;
    const hits = hitRolls.filter((roll) => rollSucceeds(roll, hitThreshold)).length
      + convertedFailedHitDieIndices.length;
    let bypassedArmourDice = 0;
    let criticalReceipt = null;
    if (targetPlan.criticalHit) {
      criticalReceipt = CRITICAL_HIT.resolve(plan.criticalHitPlan, {
        attackPoolHits: hits,
      });
      bypassedArmourDice += criticalReceipt.bypassedArmourDice;
    }
    let surgeResult = 0;
    if (targetPlan.surge) {
      const surge = profile.effects.find((effect) => (
        effect.effectAtomId === "attack-effect:surge-armour-bypass-v1"
      ));
      const matched = surge.parameters.targetTags.some((tag) => (
        targetProfile.combatTags.includes(tag)
      ));
      surgeResult = matched ? surgeValue(surge.parameters.diceExpression,
        surgeRolls[0]) : 0;
      bypassedArmourDice += Math.min(hits - bypassedArmourDice, surgeResult);
    }
    const armourDice = hits - bypassedArmourDice;
    const usedArmourRolls = armourRolls.slice(0, armourDice);
    const armourSaves = usedArmourRolls.filter((roll) => (
      rollSucceeds(roll, targetProfile.armourThreshold)
    )).length;
    const damageBeforeEvade = bypassedArmourDice + armourDice - armourSaves;
    const usedEvadeRolls = evadeRolls.slice(0, damageBeforeEvade);
    const evadeSaves = usedEvadeRolls.filter((roll) => (
      rollSucceeds(roll, targetPlan.evadeThreshold)
    )).length;
    const damagePerDie = kind === "impact" ? 1 : Number(targetPlan.damagePerDie);
    const totalDamage = (damageBeforeEvade - evadeSaves) * damagePerDie;
    const resolution = seal({ schemaVersion:
      `starcraft_tmg_selected_roster_${kind}_target_resolution_v1`,
    targetUnitId: target.id, hitRolls, hitThreshold, hits,
    activePrecisionValue: kind === "fight" ? Number(plan.activePrecisionValue || 0) : 0,
    failedHitDieIndices, convertedFailedHitDieIndices,
    hitRollModifier: kind === "impact" ? plan.hitRollModifier : 0,
    surgeRolls, surgeResult,
    criticalHitResolutionHash: criticalReceipt?.resolutionHash || null,
    bypassedArmourDice, armourDice, armourRolls: usedArmourRolls,
    unusedPreallocatedArmourRolls: armourRolls.slice(armourDice),
    armourThreshold: targetProfile.armourThreshold, armourSaves,
    evadeDice: usedEvadeRolls.length, evadeRolls: usedEvadeRolls,
    evadeEligible: targetPlan.evadeEligible,
    evadeModifier: targetPlan.evadeModifier,
    evadeThreshold: targetPlan.evadeThreshold, evadeSaves,
    damagePerDie, totalDamage,
    rulesTruth: `official_selected_roster_${kind}_pool_resolution`,
    trainingTruth: false }, "resolutionHash");
    const casualtyDomain = createOfficialCurrentProductCasualtyDomainV1({
      targetPiece: target, targetProfile, incomingDamage: totalDamage,
      visibleModelIds: activeModels(target).map((model) => model.id),
      engagementGraph: graph, attackResolutionHash: resolution.resolutionHash,
      rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
    rows.push({ target, targetProfile, resolution, casualtyDomain });
  }
  return { rolls, rows };
}
function selectionFor(row, options) {
  const requested = options.casualtySelectionHashesByTarget?.[row.target.id];
  const hash = String(requested || (row.casualtyDomain.legalSelections.length === 1
    ? row.casualtyDomain.legalSelections[0].selectionHash : ""));
  if (!hash) fail("SELECTED_MELEE_CASUALTY_SELECTION_REQUIRED", row.target.id);
  return resolveOfficialCurrentProductCasualtyDomainV1(
    row.casualtyDomain, hash);
}
function consumeRestriction(piece, state, action) {
  if (!piece.disengageAssaultRestriction) return null;
  const restriction = piece.disengageAssaultRestriction;
  const event = { type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id, restrictionHash: restriction.restrictionHash,
    consumedByActionType: action.actionType,
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass, trainingTruth: false };
  delete piece.disengageAssaultRestriction;
  return event;
}
function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`,
    round: Number(state.round), phase: state.phase,
    action: clone(action), events: clone(events) });
}
function applyChargeDeclaration(stateInput, action, options) {
  const rolls = revealDice(options.chanceReveals, action.chance.count,
    "SELECTED_MELEE_CHARGE_ROLL_REQUIRED");
  const roll = action.chargePlan.chargeDistanceRoll.keepHighest
    ? Math.max(...rolls) : rolls.reduce((sum, value) => sum + value, 0);
  const state = clone(stateInput);
  const pendingBody = { schema: OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA,
    stage: "resolve_charge_after_roll", round: Number(state.round),
    phase: "assault", sideKey: action.sideKey, pieceId: action.pieceId,
    chargePlan: clone(action.chargePlan), chargeRoll: roll,
    chargeRolls: clone(rolls),
    maxDistanceMilliInches: milli(action.chargePlan.speedInches
      + action.chargePlan.chargeDistanceModifier + roll),
    openedAtRevision: Number(options.postRevision || 0),
    sourceRefreshPerformed: false, trainingTruth: false };
  const value = { ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody) };
  state.pendingAction = value;
  const event = { type: "charge_declared_and_rolled", sideKey: action.sideKey,
    pieceId: action.pieceId, chargePlanHash: action.chargePlan.chargePlanHash,
    chargeRoll: roll, chargeRolls: clone(rolls),
    maxDistanceMilliInches: value.maxDistanceMilliInches,
    pendingHash: value.pendingHash, trainingTruth: false };
  appendLog(state, action, [event]);
  return { state, events: [event] };
}
function impactEligibility(state, piece, declaredTargetUnitIds) {
  const modifiers = projectOfficialMeleeFamilyModifiersV1(
    state.officialMeleeFamilySourceBundle, state, { pieceId: piece.id });
  if (!modifiers.devastatingCharge) return null;
  const allowedTargets = new Set(declaredTargetUnitIds.filter((unitId) => {
    const target = state.pieces.find((entry) => entry.id === unitId);
    const battlefield = target && state.officialBattlefieldAssetFamilySourceBundle
      ? projectOfficialBattlefieldAssetFamilyModifiersV1(
        state.officialBattlefieldAssetFamilySourceBundle, state,
        { pieceId: target.id, context: { attackerPieceId: piece.id,
          targetPieceId: target.id, attackKind: "impact" } },
      ) : {};
    return activePiece(target) && (!statusNamed(target, ["hidden"])
      || battlefield.hiddenSuppressedByDetection === true);
  }));
  const graph = deriveOfficialEngagementGraphV2(state);
  const fighting = new Map();
  for (const model of activeModels(piece)) {
    const targets = [...new Set(edgeForModel(graph, piece.id, model.id)
      .map((edge) => enemyUnitId(edge, piece.id))
      .filter((unitId) => allowedTargets.has(unitId)))].sort();
    if (targets.length > 0) fighting.set(model.id, targets);
  }
  const eligibleImpactModels = activeModels(piece).flatMap((model) => {
    let eligibleTargetUnitIds = fighting.get(model.id) || [];
    let rank = "fighting";
    if (eligibleTargetUnitIds.length === 0) {
      rank = "supporting";
      eligibleTargetUnitIds = [...new Set(activeModels(piece).filter((friend) => (
        friend.id !== model.id && fighting.has(friend.id)
          && baseGap(model, friend) <= TOLERANCE
      )).flatMap((friend) => fighting.get(friend.id)))].sort();
    }
    if (eligibleTargetUnitIds.length === 0) return [];
    return [{ modelId: model.id, rank, eligibleTargetUnitIds,
      baseImpactDice: modifiers.devastatingCharge.impactDicePerEligibleModel,
      additionalImpactDice: modifiers.additionalImpactDicePerEligibleModel,
      impactDice: modifiers.devastatingCharge.impactDicePerEligibleModel
        + modifiers.additionalImpactDicePerEligibleModel }];
  }).sort((left, right) => left.modelId.localeCompare(right.modelId));
  return { modifiers, graphHash: graph.graphHash, eligibleImpactModels,
    targetUnitIds: [...new Set(eligibleImpactModels.flatMap((entry) => (
      entry.eligibleTargetUnitIds)))].sort() };
}
function applyChargeResolution(stateInput, action) {
  const current = pending(stateInput, "resolve_charge_after_roll");
  const plan = action.chargeResolutionPlan;
  let state = plan.outcome === "success"
    ? applyGeometry(stateInput, action.pieceId, plan.geometry) : clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: true };
  const restrictionEvent = consumeRestriction(piece, state, action);
  const events = [{ type: plan.outcome === "success"
    ? "charge_succeeded" : "charge_failed", sideKey: action.sideKey,
  pieceId: action.pieceId, chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
  chargeRoll: plan.chargeRoll, declaredTargetUnitIds: plan.declaredTargetUnitIds,
  modelPositionsChanged: plan.outcome === "success",
  failureProof: plan.failureProof, trainingTruth: false }];
  if (restrictionEvent) events.push(restrictionEvent);
  const impact = plan.outcome === "success"
    ? impactEligibility(state, piece, plan.declaredTargetUnitIds) : null;
  if (impact?.eligibleImpactModels.length > 0) {
    const profile = impact.modifiers.devastatingCharge;
    const impactDice = impact.eligibleImpactModels.reduce((sum, entry) => (
      sum + entry.impactDice), 0);
    const pendingBody = { schema: OFFICIAL_SELECTED_ROSTER_MELEE_PENDING_SCHEMA,
      stage: "resolve_mandatory_impact", round: Number(state.round),
      phase: "assault", sideKey: action.sideKey, pieceId: action.pieceId,
      targetUnitIds: impact.targetUnitIds,
      eligibleImpactModels: clone(impact.eligibleImpactModels),
      impactEligibilityGraphHash: impact.graphHash,
      abilityName: profile.abilityName, impactDice,
      impactDicePerEligibleModel: profile.impactDicePerEligibleModel,
      additionalImpactDicePerEligibleModel:
        impact.modifiers.additionalImpactDicePerEligibleModel,
      sourceDefinitionId: profile.definitionId,
      sourceFeatureHash: profile.sourceFeatureHash,
      baseHitThreshold: profile.hitThreshold,
      hitRollModifier: Number(action.chargePlan.impactHitModifier || 0),
      effectiveHitThreshold: Math.max(2, profile.hitThreshold
        - Number(action.chargePlan.impactHitModifier || 0)),
      chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
      activeChargeModifiersApplied: true,
      sourceRefreshPerformed: false, trainingTruth: false };
    state.pendingAction = { ...pendingBody,
      pendingHash: hashStarcraftTmgContract(pendingBody) };
    events.push({ type: "impact_triggered_after_successful_charge",
      sideKey: action.sideKey, pieceId: action.pieceId,
      targetUnitIds: impact.targetUnitIds, impactDice,
      eligibleImpactModels: clone(impact.eligibleImpactModels),
      hitThreshold: profile.hitThreshold,
      pendingHash: state.pendingAction.pendingHash, trainingTruth: false });
  } else {
    delete state.pendingAction;
    if (!openOfficialSelectedRosterAfterActionWindowV1(
      state, action.sideKey, piece.id, "assault")) {
      alternate(state, action.sideKey, "assault");
    }
  }
  state.chargeActionHistory = Array.isArray(state.chargeActionHistory)
    ? state.chargeActionHistory : [];
  state.chargeActionHistory.push({ round: Number(state.round),
    pieceId: piece.id, outcome: plan.outcome,
    chargeResolutionPlanHash: plan.chargeResolutionPlanHash,
    trainingTruth: false });
  appendLog(state, action, events);
  return { state, events };
}
function applyDamageAction(stateInput, action, options, kind) {
  const plan = kind === "impact" ? action.impactPlan : action.meleePlan.fightChancePlan;
  let baseState = clone(stateInput);
  if (kind === "fight" && action.meleePlan.closeRanksGeometry) {
    baseState = applyGeometry(stateInput, action.pieceId,
      action.meleePlan.closeRanksGeometry);
  }
  const resolved = resolvePools(baseState, action, plan, options, kind);
  const state = clone(baseState);
  const events = [];
  for (const row of resolved.rows) {
    const casualty = selectionFor(row, options);
    const target = state.pieces.find((entry) => entry.id === row.target.id);
    const beforeSupply = Number(target.currentSupply);
    applyCasualty(state, target, row.targetProfile, casualty);
    events.push({ type: kind === "fight" ? "close_combat_attack" : "impact_damage",
      sideKey: action.sideKey, pieceId: action.pieceId, targetId: target.id,
      weaponName: kind === "fight" ? action.weaponName : "IMPACT",
      resolutionHash: row.resolution.resolutionHash,
      casualtyDomainHash: row.casualtyDomain.domainHash,
      casualtyResolutionHash: casualty.resolutionHash,
      stages: clone(row.resolution), casualtyModelIds: casualty.casualtyModelIds,
      postDamageMarker: casualty.postDamageMarker,
      currentSupplyBefore: beforeSupply,
      currentSupplyAfter: Number(target.currentSupply),
      targetDestroyed: casualty.targetDestroyed,
      enemyReactionAllowed: kind === "fight"
        ? plan.enemyReactionDeclarationAllowed : true,
      trainingTruth: false });
  }
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  if (kind === "fight") {
    piece.activatedPhases = { movement: false, assault: false, combat: false,
      ...(piece.activatedPhases || {}), combat: true };
    consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id);
    if (state.officialCharacteristicStatusFamilySourceBundle) {
      consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(
        state, piece.id, "close_combat");
    }
    if (state.officialBattlefieldAssetFamilySourceBundle) {
      consumeOfficialBattlefieldAssetFirstWeaponEffectsV1(state, piece.id);
    }
  } else {
    delete state.pendingAction;
  }
  const recorded = recordOfficialSupplyLossesV1({ stateBefore: stateInput,
    stateAfter: state, action, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
  state.supplyLossLedger = clone(recorded.ledger);
  events.push(...recorded.supplyLossEvents.map(clone));
  const activationPhase = kind === "fight" ? "combat" : "assault";
  if (!openOfficialSelectedRosterAfterActionWindowV1(
    state, action.sideKey, piece.id, activationPhase)) {
    alternate(state, action.sideKey, activationPhase);
  }
  const historyKey = kind === "fight" ? "fightActionHistory" : "impactActionHistory";
  state[historyKey] = Array.isArray(state[historyKey]) ? state[historyKey] : [];
  state[historyKey].push({ round: Number(state.round), phase: state.phase,
    pieceId: action.pieceId,
    planHash: kind === "fight" ? action.meleePlan.fightPlanHash
      : action.impactPlan.impactPlanHash,
    targetResolutionHashes: resolved.rows.map((row) => row.resolution.resolutionHash),
    trainingTruth: false });
  appendLog(state, action, events);
  return { state, events };
}

export function applyOfficialSelectedRosterMeleeActionV1(
  stateInput, actionInput, options = {},
) {
  if (!object(actionInput)
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION) {
    fail("SELECTED_MELEE_ACTION_INVALID");
  }
  const domain = enumerateOfficialSelectedRosterMeleeActionsV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => (
    entry.domainId === (actionInput.chargePlan?.domainId
      || actionInput.chargeResolutionPlan?.domainId
      || actionInput.meleePlan?.domainId)
      || entry.constraints?.pendingHash === actionInput.pendingHash
      || entry.constraints?.pendingHash === actionInput.chargeResolutionPlan?.pendingHash
  ));
  if (!domain) fail("SELECTED_MELEE_PARAMETER_DOMAIN_STALE");
  const parameters = actionInput.chargePlan
    ? { leadingModelId: actionInput.chargePlan.leadingModelId,
      targets: actionInput.chargePlan.targets }
    : actionInput.chargeResolutionPlan
      ? actionInput.chargeResolutionPlan.canonicalParameters
      : actionInput.actionType === "resolve_impact"
        ? { allocations: actionInput.modelAllocations }
        : actionInput.meleePlan.canonicalParameters;
  const expected = instantiateOfficialSelectedRosterMeleeActionV1(
    stateInput, domain, parameters,
  );
  if (!isDeepStrictEqual(expected.action, actionInput)) {
    fail("SELECTED_MELEE_ACTION_STALE");
  }
  let result;
  if (actionInput.actionType === "charge") {
    result = applyChargeDeclaration(stateInput, actionInput, options);
  } else if (actionInput.actionType === "resolve_charge") {
    result = applyChargeResolution(stateInput, actionInput);
  } else if (actionInput.actionType === "resolve_impact") {
    result = applyDamageAction(stateInput, actionInput, options, "impact");
  } else if (actionInput.actionType === "fight") {
    result = applyDamageAction(stateInput, actionInput, options, "fight");
  } else fail("SELECTED_MELEE_ACTION_TYPE_UNSUPPORTED", actionInput.actionType);
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_melee_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0),
    state: result.state, action: clone(actionInput), events: result.events,
    rulesTruth: "official_selected_roster_melee_transition",
    trainingTruth: false });
}

export function queryOfficialSelectedRosterMeleeActionV1(input = {}) {
  const state = input.state; const request = input.request;
  const queryKind = String(request?.queryKind || request?.kind || "");
  if (!new Set(["instantiate_parameterized_action", "charge_geometry",
    "fight_ranks_and_attack_pool", "resolve_chance_and_casualty_domains"])
    .has(queryKind)) fail("SELECTED_MELEE_QUERY_KIND_UNSUPPORTED", queryKind);
  const domain = enumerateOfficialSelectedRosterMeleeActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_MELEE_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterMeleeActionV1(
    state, domain, request.parameters || {},
  );
  let chance = null;
  if (queryKind === "resolve_chance_and_casualty_domains"
    && ["fight", "resolve_impact"].includes(preview.action.actionType)) {
    const action = preview.action;
    let chanceState = state;
    if (action.actionType === "fight" && action.meleePlan.closeRanksGeometry) {
      chanceState = applyGeometry(state, action.pieceId,
        action.meleePlan.closeRanksGeometry);
    }
    chance = resolvePools(chanceState, action,
      action.actionType === "fight" ? action.meleePlan.fightChancePlan
        : action.impactPlan,
      { chanceReveals: request.chanceReveals },
      action.actionType === "fight" ? "fight" : "impact");
  }
  return seal({ schemaVersion: "starcraft_tmg_selected_roster_melee_query_v1",
    semanticVersion: "1.0.0", ok: true, precision: "exact",
    queryKind, domainId: domain.domainId,
    result: { preview, action: preview.action,
      resolutions: chance?.rows.map((entry) => entry.resolution) || null,
      casualtyDomains: chance?.rows.map((entry) => entry.casualtyDomain) || null },
    source: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false }, "queryReceiptHash");
}

export function createOfficialSelectedRosterMeleeActionRuntimeV1(state) {
  const catalogueV2 = verifyRuntimeState(state);
  const routes = state.pieces.flatMap((piece) => {
    const profiles = combatProfiles(state, piece, catalogueV2);
    const tags = new Set([piece.combatTag, ...(piece.combatTags || [])]
      .map(normalizedName).filter(Boolean));
    const ground = tags.has("ground") && !tags.has("flying");
    const impact = projectOfficialMeleeFamilyModifiersV1(
      state.officialMeleeFamilySourceBundle, state, { pieceId: piece.id })
      .devastatingCharge;
    return [
      ...(ground ? [{ routeId: `${piece.id}:charge`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "charge", phase: "assault", routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: [...CHARGE_ATOMS] }] : []),
      ...profiles.map((profile) => ({
        routeId: `${piece.id}:fight:${profile.profileKey}`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "fight", phase: "combat", profileKey: profile.profileKey,
        profileHash: profile.profileHash, weaponName: profile.weaponName,
        routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: [...FIGHT_ATOMS] })),
      ...(impact ? [{
        routeId: `${piece.id}:impact:devastating-charge`, pieceId: piece.id,
        officialUnitRecordKey: piece.officialUnitRecordKey,
        actionType: "resolve_impact", phase: "assault",
        profile: clone(impact),
        routeStatus: "executable_exact",
        executorId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
        executorVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
        ruleAtomIds: [...IMPACT_ATOMS],
      }] : []),
    ];
  }).sort((left, right) => left.routeId.localeCompare(right.routeId));
  const descriptor = seal({
    schemaVersion: "starcraft_tmg_selected_roster_melee_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION,
    selectedUnitCount: state.pieces.length,
    selectedChargeRouteCount: routes.filter((route) => route.actionType === "charge").length,
    selectedFightRouteCount: routes.filter((route) => route.actionType === "fight").length,
    selectedImpactRouteCount: routes.filter((route) => (
      route.actionType === "resolve_impact"
    )).length,
    unsupportedSelectedChargeImpactFightRouteCount: 0,
    routes, actions: ["charge", "resolve_charge", "resolve_impact", "fight"],
    stagedChargeChoicePointsExact: true,
    fullBaseChargeAndCloseRanksGeometryExact: true,
    fightingAndSupportingRankDenominatorExact: true,
    multiEnemyAllocationAndCasualtySelectionExact: true,
    criticalHitExistingDiceTransferExact: true,
    instantReactionProhibitionExact: true,
    surgeArmourBypassExact: true,
    supplyLossLedgerIntegrated: true,
    activeCardModifiersApplied: ["Stimpack", "Combat Shield",
      "Leap", "Adrenal Overload", "Wild Mutation"],
    precisionChoiceUsesFailedHitDieIndices: true,
    afterActionAbilityWindowIntegrated: true,
    legalSpacePreviewApplyAndQueryShareInstantiation: true,
    arbitraryRosterClosureClaimed: true,
    sourceRefreshPerformed: false, productionRoomEligible: true,
    rulesTruth: "official_current_product_charge_impact_fight_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  return freezeDeep({ descriptor,
    enumerate: enumerateOfficialSelectedRosterMeleeActionsV1,
    instantiate: instantiateOfficialSelectedRosterMeleeActionV1,
    preview: previewOfficialSelectedRosterMeleeActionV1,
    apply: applyOfficialSelectedRosterMeleeActionV1,
    query: queryOfficialSelectedRosterMeleeActionV1 });
}

export function verifyOfficialSelectedRosterMeleeRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_MELEE_ACTION_RUNTIME_VERSION
    || descriptor.runtimeHash !== hashStarcraftTmgContract(
      without(descriptor, ["runtimeHash"]))
    || !Number.isSafeInteger(descriptor.selectedUnitCount)
    || descriptor.selectedUnitCount < 1
    || descriptor.selectedChargeRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "charge")).length
    || descriptor.selectedFightRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "fight")).length
    || descriptor.selectedImpactRouteCount !== descriptor.routes.filter((entry) => (
      entry.actionType === "resolve_impact")).length
    || descriptor.unsupportedSelectedChargeImpactFightRouteCount !== 0
    || descriptor.routes?.length !== descriptor.selectedChargeRouteCount
      + descriptor.selectedFightRouteCount + descriptor.selectedImpactRouteCount
    || descriptor.stagedChargeChoicePointsExact !== true
    || descriptor.fullBaseChargeAndCloseRanksGeometryExact !== true
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.arbitraryRosterClosureClaimed !== true
    || descriptor.productionRoomEligible !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_MELEE_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
