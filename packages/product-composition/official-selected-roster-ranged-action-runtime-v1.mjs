import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "../rule-atoms/official-engagement-graph-v2.mjs";
import {
  OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS,
} from "../rule-atoms/official-elevation-effective-size-rules-executor-v1.mjs";
import {
  createOfficialTerrainElevationAgreementV1,
  evaluateOfficialElevatedLineOfSightV1,
} from "../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs";
import { createOfficialMultiModelCasualtyResolutionKernelV1 } from
  "../rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs";
import {
  OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS,
} from "../rule-atoms/official-ranged-attack-executor-v6.mjs";
import {
  OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
} from "../rule-atoms/official-weapon-replacement-loadout-v1.mjs";
import { recordOfficialSupplyLossesV1, verifyOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { getOfficialCombatProfileV1, verifyOfficialCombatProfileBundleV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
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
import { projectOfficialRangedFamilyModifiersV1 } from
  "./official-ranged-family-projection-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-ranged-action-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION = "1.3.0";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE = "ranged_attack";
export const OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE =
  "finish_ranged_attack_sequence";
export const OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND =
  "official_selected_roster_ranged_target_v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA =
  "starcraft_tmg_official_selected_roster_ranged_plan_v1";

const SIDE_KEYS = new Set(["player1", "player2"]);
const CASUALTY_KERNEL = createOfficialMultiModelCasualtyResolutionKernelV1();
const RULE_ATOM_IDS = Object.freeze([...new Set([
  ...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS,
  ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  ...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS,
])].sort((left, right) => left.localeCompare(right)));
const CONTEXTUAL_EFFECT_ATOM_IDS = new Set([
  "attack-effect:indirect-fire-v1", "attack-effect:instant-v1",
  "attack-effect:locked-in-v1", "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1", "attack-effect:specialist-v1",
]);

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
function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}
function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("SELECTED_RANGED_SIDE_INVALID", sideKey);
}
function phaseReady(state, sideKey) {
  if (state.phase !== "assault" || state.activeSideKey !== sideKey
    || state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("SELECTED_RANGED_PHASE_UNAVAILABLE", sideKey);
  }
  const choice = state.phaseFirstActorByRound?.[`${state.round}:assault`];
  if (!object(choice) || choice.round !== Number(state.round)
    || choice.phase !== "assault" || !SIDE_KEYS.has(choice.chosenFirstActorSideKey)) {
    fail("SELECTED_RANGED_PHASE_INITIATIVE_UNRESOLVED");
  }
}
function pendingSequence(state) {
  const pending = state.pendingCurrentProductRangedSequence;
  if (!pending) return null;
  if (!object(pending)
    || pending.schema !== "starcraft_tmg_official_current_product_ranged_sequence_v1"
    || pending.sequenceHash !== hashStarcraftTmgContract(without(pending, ["sequenceHash"]))) {
    fail("SELECTED_RANGED_PENDING_SEQUENCE_INVALID");
  }
  return pending;
}
function verifyRuntimeState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces) || state.pieces.length < 1) {
    fail("SELECTED_RANGED_STATE_SCOPE_INVALID");
  }
  verifyOfficialAttackProfileCatalogueV1(state.officialAttackProfileCatalogue);
  verifyOfficialCombatProfileBundleV1(state.officialCombatProfileBundle);
  verifyOfficialTerrainLosDataBundleV1(state.officialTerrainLosDataBundle);
  const runtimeHash = state.officialMissionRuntimeDescriptor?.runtimeHash;
  verifyOfficialSupplyLossLedgerV1(state.supplyLossLedger, {
    round: Number(state.round), rulesRuntimeHash: runtimeHash,
  });
  for (const piece of state.pieces) {
    if (!state.officialAttackProfileCatalogue.unitRecordKeys
      .includes(piece.officialUnitRecordKey)
      || !state.officialCombatProfileBundle.profilesByRecordKey?.[piece.officialUnitRecordKey]
      || !Array.isArray(piece.models)
      || (activePiece(piece) && activeModels(piece).length !== Number(piece.currentModels))) {
      fail("SELECTED_RANGED_MODEL_DENOMINATOR_INVALID", piece.id);
    }
  }
}
function replacementWeaponNames(state, piece, phase = "assault") {
  const catalogue = state.officialAttackProfileCatalogue;
  const replacementNames = new Set(catalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === phase
      && profile.linkedTo !== "-"
  )).map((profile) => profile.weaponName));
  return (piece.selectedUpgradeNames || []).filter((name) => replacementNames.has(name));
}
function normalizedName(value) {
  return String(value || "").normalize("NFC").trim().toLowerCase();
}
function effectById(profile, effectAtomId) {
  return profile.effects.find((entry) => entry.effectAtomId === effectAtomId) || null;
}
function selectedUpgradeFor(piece, profile) {
  return (piece.selectedUpgrades || []).find((entry) => normalizedName(
    entry.upgradeName || entry.name) === normalizedName(profile.weaponName)) || null;
}
function specialistModelIds(piece, profile) {
  if (!effectById(profile, "attack-effect:specialist-v1")) return [];
  const selected = selectedUpgradeFor(piece, profile);
  const nominated = String(selected?.nominatedModelId || "");
  if (nominated) return [nominated];
  return Object.entries(piece.assignedUpgradeByModelId || {}).filter(([, names]) => (
    (names || []).map(normalizedName).includes(normalizedName(profile.weaponName))
  )).map(([modelId]) => modelId).sort();
}
function profileFielded(piece, profile) {
  const selected = new Set((piece.selectedUpgradeNames || []).map(normalizedName));
  const free = Number(profile.costSmall || 0) === 0 && Number(profile.costLarge || 0) === 0;
  return free || selected.has(normalizedName(profile.weaponName));
}
function contributingModelIdsFor(state, piece, profile, { activeOnly = true } = {}) {
  const modelIds = (activeOnly ? activeModels(piece) : piece.models.filter((model) => (
    model.isDestroyed !== true
  ))).map((model) => model.id);
  const specialist = specialistModelIds(piece, profile).filter((id) => modelIds.includes(id));
  if (effectById(profile, "attack-effect:specialist-v1")) return specialist;
  const replacements = state.officialAttackProfileCatalogue.profiles.filter((entry) => (
    entry.recordKey === piece.officialUnitRecordKey && entry.phase === "assault"
      && profileFielded(piece, entry)
      && normalizedName(entry.linkedTo) === normalizedName(profile.weaponName)
  ));
  if (replacements.some((entry) => !effectById(entry, "attack-effect:specialist-v1"))) {
    return [];
  }
  const excluded = new Set(replacements.flatMap((entry) => specialistModelIds(piece, entry)));
  return modelIds.filter((id) => !excluded.has(id));
}
function loadoutFor(state, piece, { activeOnly = true } = {}) {
  const profiles = state.officialAttackProfileCatalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === "assault"
      && profileFielded(piece, profile)
      && contributingModelIdsFor(state, piece, profile, { activeOnly }).length > 0
  ));
  if (profiles.length === 0) return null;
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_loadout_v1",
    pieceId: piece.id,
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    selectedWeaponUpgradeNames: replacementWeaponNames(state, piece),
    profileGroups: profiles.map((profile) => ({
      profileKey: profile.profileKey,
      profileHash: profile.profileHash,
      contributingModelIds: contributingModelIdsFor(
        state, piece, profile, { activeOnly }).sort(),
      sidearm: Boolean(effectById(profile, "attack-effect:sidearm-v1")),
      specialist: Boolean(effectById(profile, "attack-effect:specialist-v1")),
    })).sort((left, right) => left.profileKey.localeCompare(right.profileKey)),
    rulesTruth: "official_current_product_model_weapon_loadout_projection",
    trainingTruth: false,
  }, "loadoutHash");
}
function activeProfilesFor(state, piece, options = {}) {
  const phaseProfiles = state.officialAttackProfileCatalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === "assault"
  ));
  if (phaseProfiles.length === 0) return { loadout: null, profiles: [] };
  const loadout = loadoutFor(state, piece, options);
  if (!loadout) return { loadout: null, profiles: [] };
  return { loadout, profiles: loadout.profileGroups.map((group) => (
    getOfficialAttackProfileV1(state.officialAttackProfileCatalogue, group.profileKey)
  )).filter((profile) => profile.range.kind === "inches") };
}
function profilesAllowedByPending(state, piece, profiles) {
  const pending = pendingSequence(state);
  if (!pending) return profiles;
  if (pending.pieceId !== piece.id) return [];
  const ordinaryUsed = new Set(pending.ordinaryModelIdsUsed);
  return profiles.filter((profile) => {
    if (pending.usedProfileKeys.includes(profile.profileKey)) return false;
    if (effectById(profile, "attack-effect:sidearm-v1")) return true;
    return contributingModelIdsFor(state, piece, profile).some((id) => (
      !ordinaryUsed.has(id)));
  });
}
function graphHasUnitPair(graph, leftUnitId, rightUnitId) {
  return graph.modelEdges.some((edge) => (
    edge.leftUnitId === leftUnitId && edge.rightUnitId === rightUnitId
      || edge.leftUnitId === rightUnitId && edge.rightUnitId === leftUnitId
  ));
}
function assertAssaultContext(state, sideKey, piece, target, graph, profile) {
  phaseReady(state, sideKey);
  const pending = pendingSequence(state);
  if (pending && (pending.sideKey !== sideKey || pending.pieceId !== piece?.id
    || pending.usedProfileKeys.includes(profile?.profileKey))) {
    fail("SELECTED_RANGED_PENDING_SEQUENCE_ROUTE_INVALID", String(piece?.id || ""));
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("SELECTED_RANGED_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("SELECTED_RANGED_TARGET_UNAVAILABLE", String(target?.id || ""));
  }
  const targetTags = new Set([target.combatTag, ...(target.combatTags || [])]
    .map(normalizedName).filter(Boolean));
  if (!profile?.targetTags?.some((tag) => targetTags.has(normalizedName(tag)))) {
    fail("SELECTED_RANGED_TARGET_TAG_PROHIBITED", target.id);
  }
  if (piece.activatedPhases?.assault === true) {
    fail("SELECTED_RANGED_UNIT_ALREADY_ACTIVATED", piece.id);
  }
  assertOfficialSelectedRosterCoreActionWindowV1(
    state, sideKey, piece.id, "assault");
  const restriction = piece.disengageAssaultRestriction;
  if (restriction?.rangedAttackProhibited === true) {
    fail("SELECTED_RANGED_POST_DISENGAGE_PROHIBITED", piece.id);
  }
  const attackerEngaged = graph.engagedUnitIds.includes(piece.id);
  const targetEngaged = graph.engagedUnitIds.includes(target.id);
  const mutuallyEngaged = graphHasUnitPair(graph, piece.id, target.id);
  const pinpoint = Boolean(effectById(profile, "attack-effect:pinpoint-v1"));
  if ((!attackerEngaged && targetEngaged && !pinpoint)
    || (attackerEngaged && !mutuallyEngaged)) {
    fail("SELECTED_RANGED_ENGAGEMENT_TARGET_PROHIBITED", target.id);
  }
  return { attackerEngaged, targetEngaged, mutuallyEngaged,
    pinpointTargetOverrideApplied: !attackerEngaged && targetEngaged && pinpoint };
}
function terrainAsOrdinaryForLos(state) {
  const projected = clone(state);
  const grassTerrainIds = [];
  projected.board.terrain = (state.board.terrain || []).map((terrain) => {
    if (terrain.isRemoved === true || terrain.terrainKind === "ordinary") {
      return clone(terrain);
    }
    if (terrain.terrainKind !== "grass") {
      fail("SELECTED_RANGED_SPECIAL_TERRAIN_SCOPE_UNSUPPORTED", terrain.id);
    }
    grassTerrainIds.push(terrain.id);
    const body = {
      schema: terrain.schema, id: terrain.id, terrainKind: "ordinary",
      size: terrain.size, footprint: clone(terrain.footprint),
      standableHorizontalSurface: terrain.standableHorizontalSurface === true,
      setupAgreement: clone(terrain.setupAgreement),
      rulesTruth: "official_core_terrain_setup_agreement", trainingTruth: false,
    };
    return { ...body, terrainHash: hashStarcraftTmgContract(body),
      terrainId: terrain.id, elevation: terrain.elevation,
      heightTier: terrain.heightTier, elevationSurface: terrain.elevationSurface,
      impassable: false, openings: clone(terrain.openings || []),
      accessPoints: clone(terrain.accessPoints || []), isRemoved: false };
  });
  projected.board.terrainElevationAgreement =
    state.board.terrainElevationAgreement
      || createOfficialTerrainElevationAgreementV1({ supportRelations: [] });
  return { projected, grassTerrainIds: grassTerrainIds.sort() };
}
function lineOfSightFor(state, attacker, attackerModel, target, targetModel,
  adapted = terrainAsOrdinaryForLos(state)) {
  const result = evaluateOfficialElevatedLineOfSightV1({
    state: adapted.projected, attacker, attackerModelId: attackerModel.id,
    target, targetModelId: targetModel.id,
    dataBundle: state.officialTerrainLosDataBundle,
  });
  return seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_los_v1",
    result, elevatedLineOfSightResultHash: result.resultHash,
    grassTerrainIds: adapted.grassTerrainIds,
    grassAdaptedToOrdinarySizeTwoCoverRules: adapted.grassTerrainIds.length > 0,
    visible: result.visible,
    highGroundEvadeEligible: result.highGroundEvadeEligible,
    blockingTerrainIds: result.blockingTerrainIds,
    sourceRefreshPerformed: false,
    rulesTruth: "official_elevated_los_with_grass_cover_adapter",
    trainingTruth: false,
  }, "lineOfSightHash");
}
function baseGapInches(left, right) {
  const leftRadius = Number(left.baseWidthInches) / 2;
  const rightRadius = Number(right.baseWidthInches) / 2;
  return Number(Math.max(0, Math.hypot(
    Number(right.xInches) - Number(left.xInches),
    Number(right.yInches) - Number(left.yInches),
  ) - leftRadius - rightRadius).toFixed(3));
}
function maximumRangeFor(profile, characteristicModifiers, rangedModifiers) {
  const printedNormal = Number(profile.range.normalRangeInches);
  const rangeModifier = Number(characteristicModifiers.rangeModifier || 0);
  const normalRangeInches = Math.max(0, printedNormal + rangeModifier);
  const printedLong = Number(effectById(
    profile, "attack-effect:long-range-v1")?.parameters?.maximumRangeInches || 0);
  const grantedLong = Number(rangedModifiers.longRangeMaximumInches || 0);
  const maximumRangeInches = characteristicModifiers.longRangeAllowed === false
    ? normalRangeInches
    : Math.max(normalRangeInches, printedLong, grantedLong);
  return { printedNormalRangeInches: printedNormal, normalRangeInches,
    maximumRangeInches, rangeModifier,
    longRangeSuppressed: characteristicModifiers.longRangeAllowed === false };
}
function candidateGeometry(state, piece, target, profile, characteristicModifiers,
  rangedModifiers) {
  const pairs = [];
  const adapted = terrainAsOrdinaryForLos(state);
  const ranges = maximumRangeFor(profile, characteristicModifiers, rangedModifiers);
  const indirectFire = Boolean(effectById(profile, "attack-effect:indirect-fire-v1"));
  const contributingModelIds = new Set(contributingModelIdsFor(state, piece, profile));
  for (const attackerModel of activeModels(piece).filter((entry) => (
    contributingModelIds.has(entry.id)))) {
    for (const targetModel of activeModels(target)) {
      const lineOfSight = lineOfSightFor(
        state, piece, attackerModel, target, targetModel, adapted,
      );
      const distanceInches = baseGapInches(attackerModel, targetModel);
      pairs.push({ attackerModelId: attackerModel.id, targetModelId: targetModel.id,
        distanceInches, withinMaximumRange: distanceInches
          <= ranges.maximumRangeInches,
        rangeBand: distanceInches <= ranges.normalRangeInches ? "normal" : "extended",
        visible: lineOfSight.visible, highGroundEvadeEligible:
          lineOfSight.highGroundEvadeEligible,
        lineOfSightHash: lineOfSight.lineOfSightHash,
        blockingTerrainIds: lineOfSight.blockingTerrainIds });
    }
  }
  const eligiblePairs = pairs.filter((pair) => (pair.visible || indirectFire)
    && pair.withinMaximumRange);
  const eligibleAttackerModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.attackerModelId
  )))].sort();
  const visibleTargetModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.targetModelId
  )))].sort();
  if (eligibleAttackerModelIds.length === 0 || visibleTargetModelIds.length === 0) {
    fail("SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE", target.id);
  }
  const modelAttackRows = eligibleAttackerModelIds.map((modelId) => {
    const row = eligiblePairs.filter((pair) => pair.attackerModelId === modelId)
      .sort((left, right) => left.distanceInches - right.distanceInches)[0];
    return { attackerModelId: modelId, targetModelId: row.targetModelId,
      distanceInches: row.distanceInches, rangeBand: row.rangeBand,
      targetVisible: row.visible, indirectLineOfSightIgnored: !row.visible && indirectFire };
  });
  const distanceInches = Math.max(...modelAttackRows.map((entry) => entry.distanceInches));
  return freezeDeep({ pairs, eligibleAttackerModelIds, visibleTargetModelIds,
    modelAttackRows, distanceInches, ...ranges,
    indirectFire, fullModelPairDenominatorAssessed: true });
}
function statusNamed(piece, expected) {
  return (piece?.statuses || []).some((entry) => normalizedName(
    typeof entry === "string" ? entry : entry?.statusName || entry?.name) === normalizedName(expected));
}
function diceValue(expression, outcome) {
  if (expression === "D3") return Math.ceil(outcome / 2);
  if (expression === "D3+1") return Math.ceil(outcome / 2) + 1;
  if (expression === "D6") return outcome;
  fail("SELECTED_RANGED_SURGE_DICE_UNSUPPORTED", String(expression || ""));
}
function batchProfile(profile, geometry, attackerModifiers, rangedModifiers,
  targetModifiers, target, pointDefenseRemovedDieIds = []) {
  const burst = effectById(profile, "attack-effect:burst-fire-v1");
  const locked = effectById(profile, "attack-effect:locked-in-v1");
  const instant = Boolean(effectById(profile, "attack-effect:instant-v1"));
  const targetStationary = statusNamed(target, "stationary");
  const printedRateOfAttack = Number(profile.rateOfAttack);
  const rateOfAttackModifier = Number(attackerModifiers.rateOfAttackModifier || 0);
  let hitDice = geometry.modelAttackRows.flatMap((row) => {
    const burstBonus = burst && row.distanceInches
      <= Number(burst.parameters.maximumDistanceInches)
      ? Number(burst.parameters.additionalRateOfAttack) : 0;
    const lockedBonus = locked && targetStationary
      ? Number(locked.parameters.additionalRateOfAttack) : 0;
    const dice = Math.max(0, printedRateOfAttack + rateOfAttackModifier
      + burstBonus + lockedBonus);
    return Array.from({ length: dice }, (_, ordinal) => ({
      dieId: `${row.attackerModelId}:attack:${ordinal + 1}`,
      attackerModelId: row.attackerModelId,
      targetModelId: row.targetModelId,
      distanceInches: row.distanceInches,
      rangeBand: row.rangeBand,
      hitThreshold: Math.max(2, Math.min(6,
        Number(profile.hitThreshold) + (row.rangeBand === "extended" ? 1 : 0))),
      burstFireApplied: burstBonus > 0,
      lockedInApplied: lockedBonus > 0,
    }));
  });
  const guardianReduction = Math.max(0, -Number(targetModifiers.attackPoolModifier || 0));
  hitDice = hitDice.sort((left, right) => left.hitThreshold - right.hitThreshold
    || left.dieId.localeCompare(right.dieId));
  const guardianRemovedDice = hitDice.slice(0, Math.min(hitDice.length,
    guardianReduction));
  hitDice = hitDice.slice(guardianRemovedDice.length);
  const selectedPointDefenseSourceIds = clone(
    rangedModifiers.pointDefense?.selectedSourcePieceIds || []);
  const pointDefenseCapacity = instant ? 0
    : Number(rangedModifiers.pointDefense?.maximumDiceRemovedPerSource || 0)
      * selectedPointDefenseSourceIds.length;
  const selectedPointDefenseDieIds = [...new Set(
    (pointDefenseRemovedDieIds || []).map(String))].sort();
  const availablePointDefenseDieIds = hitDice.map((entry) => entry.dieId);
  if ((instant && selectedPointDefenseSourceIds.length > 0)
    || selectedPointDefenseDieIds.length > pointDefenseCapacity
    || selectedPointDefenseDieIds.some((id) => !availablePointDefenseDieIds.includes(id))) {
    fail("SELECTED_RANGED_POINT_DEFENSE_SELECTION_INVALID");
  }
  const pointDefenseRemovedDice = hitDice.filter((entry) => (
    selectedPointDefenseDieIds.includes(entry.dieId)));
  hitDice = hitDice.filter((entry) => !selectedPointDefenseDieIds.includes(entry.dieId));
  const removedAttackDice = [...guardianRemovedDice, ...pointDefenseRemovedDice];
  const baseSurge = profile.surge ? clone(profile.surge) : null;
  const surge = targetModifiers.surgeDice && targetModifiers.surgeTypes?.length > 0
    ? { targetTags: clone(targetModifiers.surgeTypes),
      diceExpression: targetModifiers.surgeDice }
    : baseSurge ? { ...baseSurge,
      diceExpression: rangedModifiers.surgeDiceOverride || baseSurge.diceExpression }
      : null;
  const printedAntiEvade = Math.max(0, ...profile.effects.filter((entry) => (
    entry.effectAtomId === "attack-effect:anti-evade-v1"
  )).map((entry) => -Number(entry.parameters.evadeThresholdModifier || 0)));
  const antiEvade = Math.max(printedAntiEvade, Number(attackerModifiers.antiEvade || 0));
  const criticalHit = Math.max(0, Number(attackerModifiers.criticalHit || 0),
    ...profile.effects.filter((entry) => entry.effectAtomId === "attack-effect:critical-hit-v1")
      .map((entry) => Number(entry.parameters.bypassArmourDice
        ?? entry.parameters.additionalHits ?? 0)));
  const pierce = effectById(profile, "attack-effect:pierce-v1");
  const damagePerDie = pierce && target.combatTags?.includes(pierce.parameters.targetTag)
    ? Number(pierce.parameters.damage) : Number(profile.damage);
  const body = {
    schema: "starcraft_tmg_official_current_product_ranged_batch_profile_v1",
    sourceProfileKey: profile.profileKey,
    sourceProfileHash: profile.profileHash,
    weaponName: profile.weaponName,
    targetTags: clone(profile.targetTags),
    printedRateOfAttack,
    rateOfAttackModifier,
    hitDice,
    removedAttackDice,
    attackPoolDiceBeforeRemoval: hitDice.length + removedAttackDice.length,
    attackPoolDice: hitDice.length,
    attackPoolRemoval: {
      guardianShieldDice: guardianRemovedDice.length,
      pointDefenseDice: pointDefenseRemovedDice.length,
      pointDefenseSourcePieceIds: selectedPointDefenseSourceIds,
      pointDefenseRemovedDieIds: selectedPointDefenseDieIds,
      pointDefenseAvailableSourcePieceIds: instant ? [] : clone(
        rangedModifiers.pointDefense?.availableSourcePieceIds || []),
      pointDefenseChoiceCapacity: pointDefenseCapacity,
      controllerChoiceAuthority: "defender_explicit_die_selection",
    },
    targetStationary,
    surge,
    antiEvade,
    criticalHit,
    precision: Number(attackerModifiers.precision || 0),
    damagePerDie,
    pierceMatched: damagePerDie !== Number(profile.damage),
    instant,
    indirectFire: Boolean(effectById(profile, "attack-effect:indirect-fire-v1")),
    sidearm: Boolean(effectById(profile, "attack-effect:sidearm-v1")),
    pinpoint: Boolean(effectById(profile, "attack-effect:pinpoint-v1")),
    specialist: Boolean(effectById(profile, "attack-effect:specialist-v1")),
    sourceEffectAtomIds: profile.effects.map((entry) => entry.effectAtomId),
    contextualEffectsConsumedByBatchCompiler: profile.effects.filter((entry) => (
      CONTEXTUAL_EFFECT_ATOM_IDS.has(entry.effectAtomId))).map((entry) => entry.effectAtomId),
    rulesTruth: "official_current_product_same_profile_same_target_batch",
    trainingTruth: false,
  };
  return seal(body, "profileHash");
}
function createMechanicalPlan(profileForBatch, targetProfile, geometry,
  evadeEligible, authoritativeEvadeReason) {
  const effectiveEvadeThreshold = targetProfile.evadeThreshold === null ? null
    : Math.max(2, Math.min(6, Number(targetProfile.evadeThreshold)
      + Number(profileForBatch.antiEvade || 0)));
  const maximumHits = profileForBatch.hitDice.length;
  const layout = { hit: maximumHits, surge: profileForBatch.surge ? 1 : 0,
    armour: maximumHits, evade: evadeEligible ? maximumHits : 0 };
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_resolution_plan_v1",
    profileKey: profileForBatch.sourceProfileKey,
    profileHash: profileForBatch.profileHash,
    profile: clone(profileForBatch),
    target: { armourThreshold: targetProfile.armourThreshold,
      evadeThreshold: targetProfile.evadeThreshold,
      combatTags: clone(targetProfile.combatTags) },
    modelAttackRows: clone(geometry.modelAttackRows),
    distanceInches: geometry.distanceInches,
    normalRangeInches: geometry.normalRangeInches,
    maximumRangeInches: geometry.maximumRangeInches,
    rangeBand: geometry.modelAttackRows.some((entry) => entry.rangeBand === "extended")
      ? "mixed_or_extended" : "normal",
    effectiveHitThreshold: null,
    printedRateOfAttack: profileForBatch.printedRateOfAttack,
    effectiveRateOfAttack: profileForBatch.attackPoolDice,
    evade: { eligible: evadeEligible,
      eligibilityReason: authoritativeEvadeReason,
      baseThreshold: targetProfile.evadeThreshold,
      antiEvade: profileForBatch.antiEvade,
      effectiveThreshold: effectiveEvadeThreshold,
      naturalOneAlwaysFails: true, naturalSixAlwaysSucceeds: true },
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: layout.hit + layout.surge + layout.armour + layout.evade,
      layout, revealOrder: ["hit", "surge", "armour", "evade"] },
    reactionPolicy: profileForBatch.instant
      ? { enemyDeclarationAllowed: false, enemyResolutionAllowed: false }
      : { enemyDeclarationAllowed: true, enemyResolutionAllowed: true },
    trainingTruth: false,
  }, "planHash");
}
function resolveMechanicalPlan(plan, reveals) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_current_product_ranged_resolution_plan_v1"
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("SELECTED_RANGED_MECHANICAL_PLAN_INVALID");
  }
  if (!Array.isArray(reveals) || reveals.length !== plan.chance.count) {
    fail("SELECTED_RANGED_CHANCE_REVEALS_REQUIRED");
  }
  const rolls = reveals.map((value) => Number(object(value) ? value.outcome : value));
  if (rolls.some((value) => !Number.isSafeInteger(value) || value < 1 || value > 6)) {
    fail("SELECTED_RANGED_CHANCE_REVEAL_INVALID");
  }
  let offset = 0;
  const hitRolls = rolls.slice(offset, offset += plan.chance.layout.hit);
  const surgeRolls = rolls.slice(offset, offset += plan.chance.layout.surge);
  const armourRolls = rolls.slice(offset, offset += plan.chance.layout.armour);
  const evadeRolls = rolls.slice(offset, offset + plan.chance.layout.evade);
  const successfulHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll, index }) => rollSucceeds(
      roll, plan.profile.hitDice[index].hitThreshold)).map(({ index }) => index);
  const hits = successfulHitDieIndices.length;
  const surgeResults = surgeRolls.map((roll) => diceValue(
    plan.profile.surge.diceExpression, roll));
  const surgeMatched = Boolean(plan.profile.surge)
    && plan.profile.surge.targetTags.some((tag) => plan.target.combatTags.includes(tag));
  const surgeCapacity = surgeMatched
    ? surgeResults.reduce((sum, value) => sum + value, 0) : 0;
  const criticalHitCapacity = Number(plan.profile.criticalHit || 0);
  const bypassedArmourHits = Math.min(hits, surgeCapacity + criticalHitCapacity);
  const armourDice = hits - bypassedArmourHits;
  const resolvedArmourRolls = armourRolls.slice(0, armourDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => (
    rollSucceeds(roll, plan.target.armourThreshold))).length;
  const damagePoolBeforeEvade = bypassedArmourHits + armourDice - armourSaves;
  const evadeDice = plan.evade.eligible ? damagePoolBeforeEvade : 0;
  const resolvedEvadeRolls = evadeRolls.slice(0, evadeDice);
  const evadeSaves = resolvedEvadeRolls.filter((roll) => (
    rollSucceeds(roll, plan.evade.effectiveThreshold))).length;
  const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
  return seal({
    schema: "starcraft_tmg_official_current_product_ranged_resolution_v1",
    planHash: plan.planHash,
    reveals: rolls,
    stages: {
      declaration: { profileKey: plan.profileKey,
        profileHash: plan.profileHash, distanceInches: plan.distanceInches,
        rangeBand: plan.rangeBand },
      hit: { dice: hitRolls.length, rolls: hitRolls, threshold: null,
        thresholdByDieIndex: plan.profile.hitDice.map((entry) => entry.hitThreshold),
        successfulHitDieIndices, hits },
      effects: { appliedEffectAtomIds: clone(plan.profile.sourceEffectAtomIds),
        surgeRolls, surgeResults, surgeMatched, surgeCapacity,
        criticalHitCapacity, bypassedArmourHits,
        antiEvadeApplied: plan.profile.antiEvade > 0 && plan.evade.eligible,
        antiEvadeModifier: plan.profile.antiEvade,
        burstFireApplied: plan.profile.hitDice.some((entry) => entry.burstFireApplied),
        lockedInApplied: plan.profile.hitDice.some((entry) => entry.lockedInApplied),
        attackPoolRemoval: clone(plan.profile.attackPoolRemoval),
        printedRateOfAttack: plan.profile.printedRateOfAttack,
        effectiveRateOfAttack: plan.profile.attackPoolDice,
        pierceMatched: plan.profile.pierceMatched,
        pierceDamage: plan.profile.pierceMatched ? plan.profile.damagePerDie : null },
      armour: { dice: armourDice, rolls: resolvedArmourRolls,
        unusedPreallocatedRolls: armourRolls.slice(armourDice),
        threshold: plan.target.armourThreshold, saves: armourSaves },
      evade: { eligible: plan.evade.eligible,
        eligibilityReason: plan.evade.eligibilityReason,
        dice: evadeDice, rolls: resolvedEvadeRolls,
        unusedPreallocatedRolls: evadeRolls.slice(evadeDice),
        effectiveThreshold: plan.evade.effectiveThreshold,
        damagePoolBeforeEvade, saves: evadeSaves, confirmedDamageDice },
      damage: { damagePoolDice: confirmedDamageDice,
        damagePerDie: plan.profile.damagePerDie,
        totalDamage: confirmedDamageDice * plan.profile.damagePerDie },
    },
    trainingTruth: false,
  }, "resolutionHash");
}
function planAttackResolution(state, piece, target, profile, geometry, targetProfile,
  engagement, graph, choices = {}) {
  const highGroundEvadeEligible = geometry.pairs.some((pair) => (
    pair.visible && pair.withinMaximumRange && pair.highGroundEvadeEligible
  ));
  const selectedTargetModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, target, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  const characteristicTargetModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: target.id, context: { attackerPieceId: piece.id,
        weaponName: profile.weaponName, damageKind: "ranged_attack",
        attackKind: "ranged", targetPieceId: target.id } },
    ) : {};
  const evadeEligible = targetProfile.evadeThreshold !== null
    && (engagement.targetEngaged || highGroundEvadeEligible
      || selectedTargetModifiers.evadeEligible
      || characteristicTargetModifiers.eligibleEvadeAgainstAllAttacks);
  const authoritativeEvadeReason = !evadeEligible ? "none"
    : selectedTargetModifiers.evadeEligible
      || characteristicTargetModifiers.eligibleEvadeAgainstAllAttacks
      ? "active_or_passive_ability_evade_eligibility"
      : engagement.targetEngaged && highGroundEvadeEligible
      ? "target_engaged_or_all_high_ground"
      : engagement.targetEngaged
        ? "target_engaged_and_suffering_ranged_damage"
        : "target_all_high_ground_and_attack_originates_lower";
  const selectedAttackerModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  const characteristicAttackerModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { attackerPieceId: piece.id,
        targetPieceId: target.id, weaponName: profile.weaponName,
        damageKind: "ranged_attack", attackKind: "ranged" } },
    ) : {};
  const attackerAbilityModifiers = {
    precision: Math.max(Number(selectedAttackerModifiers.precision || 0),
      Number(characteristicAttackerModifiers.precision || 0)),
    antiEvade: Number(characteristicAttackerModifiers.antiEvade || 0),
    criticalHit: Number(characteristicAttackerModifiers.criticalHit || 0),
    rateOfAttackModifier: Number(characteristicAttackerModifiers.rateOfAttackModifier || 0),
  };
  const rangedModifiers = state.officialRangedFamilySourceBundle
    ? projectOfficialRangedFamilyModifiersV1(
      state.officialRangedFamilySourceBundle, state,
      { pieceId: piece.id, context: { targetPieceId: target.id,
        weaponName: profile.weaponName,
        pointDefenseSourcePieceIds: choices.pointDefenseSourcePieceIds || [],
        distanceInches: Math.min(...geometry.modelAttackRows.map((entry) => (
          entry.distanceInches))) } },
    ) : {};
  const targetModifiers = {
    attackPoolModifier: Number(characteristicTargetModifiers.attackPoolModifier || 0),
    surgeTypes: clone(characteristicAttackerModifiers.surgeTypes || []),
    surgeDice: characteristicAttackerModifiers.surgeDice || null,
  };
  const profileForBatch = batchProfile(profile, geometry, attackerAbilityModifiers,
    rangedModifiers, targetModifiers, target, choices.pointDefenseRemovedDieIds || []);
  const mechanicalPlan = createMechanicalPlan(profileForBatch, {
    ...targetProfile,
    evadeThreshold: targetProfile.evadeThreshold === null ? null
      : Math.max(2, Number(targetProfile.evadeThreshold)
        - Number(selectedTargetModifiers.evadeModifier || 0)),
  }, geometry, evadeEligible, authoritativeEvadeReason);
  return { mechanicalPlan, profileForBatch, evadeEligible,
    authoritativeEvadeReason, highGroundEvadeEligible,
    abilityModifiers: { ...selectedTargetModifiers,
      ...characteristicTargetModifiers }, attackerAbilityModifiers, rangedModifiers };
}
function contextFor(state, sideKey, piece, target, profileKey, shared = {}) {
  const graph = shared.graph || deriveOfficialEngagementGraphV2(state);
  const { loadout, profiles: allProfiles } = shared.loadoutAndProfiles
    || activeProfilesFor(state, piece);
  const profiles = profilesAllowedByPending(state, piece, allProfiles);
  const profile = profiles.find((entry) => entry.profileKey === profileKey);
  if (!profile) fail("SELECTED_RANGED_PROFILE_UNAVAILABLE", profileKey);
  const engagement = assertAssaultContext(state, sideKey, piece, target, graph, profile);
  if (effectById(profile, "attack-effect:bulky-v1") && engagement.attackerEngaged) {
    fail("ATTACK_BULKY_ENGAGED_PROHIBITION", piece.id);
  }
  const targetProfile = getOfficialCombatProfileV1(
    state.officialCombatProfileBundle, target.officialUnitRecordKey);
  const characteristicModifiers = state.officialCharacteristicStatusFamilySourceBundle
    ? projectOfficialCharacteristicStatusFamilyModifiersV1(
      state.officialCharacteristicStatusFamilySourceBundle, state,
      { pieceId: piece.id, context: { weaponName: profile.weaponName,
        targetPieceId: target.id, attackKind: "ranged" } },
    ) : {};
  const rangedModifiers = state.officialRangedFamilySourceBundle
    ? projectOfficialRangedFamilyModifiersV1(
      state.officialRangedFamilySourceBundle, state,
      { pieceId: piece.id, context: { weaponName: profile.weaponName,
        targetPieceId: target.id } },
    ) : {};
  const geometry = candidateGeometry(state, piece, target, profile,
    characteristicModifiers, rangedModifiers);
  const attack = planAttackResolution(
    state, piece, target, profile, geometry, targetProfile, engagement, graph,
    shared.pointDefenseChoices || {},
  );
  return { graph, engagement, loadout, profile, targetProfile, geometry, ...attack };
}
function domainFor(state, sideKey, piece, profile, targets) {
  const pointDefenseSourceIds = [...new Set(targets.flatMap((entry) => (
    entry.context.profileForBatch.attackPoolRemoval
      .pointDefenseAvailableSourcePieceIds || [])))].sort();
  const pointDefenseDieIds = [...new Set(targets.flatMap((entry) => (
    entry.context.profileForBatch.hitDice.map((die) => die.dieId))))].sort();
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    semanticVersion: "1.0.0",
    parameterKind: OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey, phase: "assault", pieceId: piece.id,
    profileKey: profile.profileKey, weaponName: profile.weaponName,
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    ruleAtomIds: [...RULE_ATOM_IDS],
    parameterSchema: { type: "object", required: ["targetUnitId"],
      targetUnitId: { enum: targets.map((entry) => entry.target.id).sort() },
      pointDefenseSourcePieceIds: { type: "array", uniqueItems: true,
        items: { enum: pointDefenseSourceIds }, default: [] },
      pointDefenseRemovedDieIds: { type: "array", uniqueItems: true,
        items: { enum: pointDefenseDieIds }, default: [] } },
    constraints: {
      targetPlans: targets.map((entry) => ({
        targetUnitId: entry.target.id,
        attackPlanHash: entry.context.mechanicalPlan.planHash,
        chance: clone(entry.context.mechanicalPlan.chance),
        eligibleAttackerModelIds: entry.context.geometry.eligibleAttackerModelIds,
        visibleTargetModelIds: entry.context.geometry.visibleTargetModelIds,
        targetEngaged: entry.context.engagement.targetEngaged,
        highGroundEvadeEligible: entry.context.highGroundEvadeEligible,
        pointDefenseChoice: {
          defenderSideKey: entry.target.sideKey,
          availableSourcePieceIds: clone(entry.context.profileForBatch
            .attackPoolRemoval.pointDefenseAvailableSourcePieceIds || []),
          removableDieIds: entry.context.profileForBatch.hitDice
            .map((die) => die.dieId).sort(),
          maximumDiceRemovedPerSelectedSource: 2,
          mayDecline: true,
        },
      })).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId)),
      attackProfileCatalogueHash: state.officialAttackProfileCatalogue.catalogueHash,
      combatProfileBundleHash: state.officialCombatProfileBundle.bundleHash,
      terrainLosDataBundleHash: state.officialTerrainLosDataBundle.bundleHash,
      engagementGraphHash: targets[0].context.graph.graphHash,
      fullModelPairVisibilityAndRangeDenominator: true,
    },
    confirmationClass: pointDefenseSourceIds.length > 0
      ? "defender_choice_then_agent_owned_auto_apply_or_human_direct_choice"
      : "agent_owned_legal_action_auto_apply_or_human_direct_choice",
    rulesTruth: "official_selected_roster_ranged_target_domain",
    trainingTruth: false,
  };
  return seal(body, "domainId");
}
function diagnostic(sideKey, piece, profile, error) {
  return freezeDeep({
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey, phase: "assault", pieceId: piece.id,
    profileKey: profile?.profileKey || null, weaponName: profile?.weaponName || null,
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
    score: 0, details: { trainingTruth: false },
  });
}

export function enumerateOfficialSelectedRosterRangedActionsV1(state, options = {}) {
  verifyRuntimeState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "");
  if (!SIDE_KEYS.has(sideKey)) fail("SELECTED_RANGED_SIDE_INVALID", sideKey);
  const parameterDomains = [];
  const candidates = [];
  const pending = pendingSequence(state);
  if (pending && pending.sideKey === sideKey) {
    candidates.push(freezeDeep({
      actionType: OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,
      sideKey, phase: "assault", pieceId: pending.pieceId,
      sequenceHash: pending.sequenceHash,
      executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
      isEnabled: true, disabledReason: null, score: 0,
      details: { completedBatchCount: pending.completedBatches.length,
        voluntaryStopAllowedBetweenBatches: true, trainingTruth: false },
    }));
  }
  let graph = null;
  try { graph = deriveOfficialEngagementGraphV2(state); } catch (error) {
    if (options.includeDisabled !== true) throw error;
  }
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry)
      && (!pending || pending.pieceId === entry.id)
  ))) {
    let profiles = [];
    let loadoutAndProfiles = null;
    try {
      loadoutAndProfiles = activeProfilesFor(
        state, piece, { activeOnly: activePiece(piece) },
      );
      profiles = profilesAllowedByPending(
        state, piece, loadoutAndProfiles.profiles);
      phaseReady(state, sideKey);
    } catch (error) {
      if (options.includeDisabled === true) candidates.push(diagnostic(sideKey, piece, null, error));
      continue;
    }
    for (const profile of profiles) {
      const targets = [];
      let firstError = null;
      for (const target of state.pieces.filter((entry) => (
        entry.sideKey === otherSide(sideKey) && activePiece(entry)
      ))) {
        try {
          targets.push({ target, context: contextFor(
            state, sideKey, piece, target, profile.profileKey,
            { graph, loadoutAndProfiles },
          ) });
        } catch (error) {
          firstError ||= error;
        }
      }
      if (targets.length > 0) {
        parameterDomains.push(domainFor(state, sideKey, piece, profile, targets));
      } else if (options.includeDisabled === true) {
        candidates.push(diagnostic(sideKey, piece, profile,
          firstError || new Error("SELECTED_RANGED_NO_TARGET")));
      }
    }
  }
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_executable_legal_enumeration_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    candidates: candidates.sort((left, right) => (
      `${left.pieceId}:${left.profileKey}`.localeCompare(`${right.pieceId}:${right.profileKey}`)
    )),
    parameterDomains: parameterDomains.sort((left, right) => (
      `${left.pieceId}:${left.profileKey}`.localeCompare(`${right.pieceId}:${right.profileKey}`)
    )),
    completeForSelectedRangedRoutes: true,
    searchAndStrategyExcludedFromAuthority: true,
    trainingTruth: false,
  });
}

export function instantiateOfficialSelectedRosterRangedActionV1(
  state, domain, parameters,
) {
  verifyRuntimeState(state);
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || domain.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || !object(parameters)
    || Object.keys(parameters).some((key) => !["targetUnitId",
      "pointDefenseSourcePieceIds", "pointDefenseRemovedDieIds"].includes(key))) {
    fail("SELECTED_RANGED_PARAMETER_DOMAIN_INVALID");
  }
  const current = enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: domain.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === domain.domainId);
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SELECTED_RANGED_PARAMETER_DOMAIN_STALE");
  }
  const targetUnitId = String(parameters.targetUnitId || "");
  if (!domain.parameterSchema.targetUnitId.enum.includes(targetUnitId)) {
    fail("SELECTED_RANGED_TARGET_PARAMETER_INVALID", targetUnitId);
  }
  const piece = state.pieces.find((entry) => entry.id === domain.pieceId);
  const target = state.pieces.find((entry) => entry.id === targetUnitId);
  const pointDefenseSourcePieceIds = [...new Set(
    (parameters.pointDefenseSourcePieceIds || []).map(String))].sort();
  const pointDefenseRemovedDieIds = [...new Set(
    (parameters.pointDefenseRemovedDieIds || []).map(String))].sort();
  const targetPlan = domain.constraints.targetPlans.find((entry) => (
    entry.targetUnitId === targetUnitId));
  const pointDefenseChoice = targetPlan.pointDefenseChoice;
  if (pointDefenseSourcePieceIds.some((id) => (
    !pointDefenseChoice.availableSourcePieceIds.includes(id)))
    || pointDefenseRemovedDieIds.some((id) => (
      !pointDefenseChoice.removableDieIds.includes(id)))
    || pointDefenseRemovedDieIds.length
      > pointDefenseSourcePieceIds.length
        * pointDefenseChoice.maximumDiceRemovedPerSelectedSource) {
    fail("SELECTED_RANGED_POINT_DEFENSE_PARAMETER_INVALID");
  }
  const canonicalParameters = { targetUnitId,
    pointDefenseSourcePieceIds, pointDefenseRemovedDieIds };
  const context = contextFor(state, domain.sideKey, piece, target, domain.profileKey, {
    pointDefenseChoices: canonicalParameters,
  });
  const planBody = {
    schemaVersion: OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA,
    semanticVersion: "1.0.0", sideKey: domain.sideKey,
    pieceId: piece.id, targetUnitId, profileKey: context.profile.profileKey,
    sourceProfileHash: context.profile.profileHash,
    batchProfileHash: context.profileForBatch.profileHash,
    weaponName: context.profile.weaponName, domainId: domain.domainId,
    canonicalParameters,
    weaponLoadoutHash: context.loadout.loadoutHash,
    attackPlanHash: context.mechanicalPlan.planHash,
    chance: clone(context.mechanicalPlan.chance),
    eligibleAttackerModelIds: context.geometry.eligibleAttackerModelIds,
    visibleTargetModelIds: context.geometry.visibleTargetModelIds,
    modelPairEvidence: clone(context.geometry.pairs),
    representativeMaximumContributingDistanceInches: context.geometry.distanceInches,
    engagementGraphHash: context.graph.graphHash,
    attackerEngaged: context.engagement.attackerEngaged,
    targetEngaged: context.engagement.targetEngaged,
    highGroundEvadeEligible: context.highGroundEvadeEligible,
    abilityEvadeModifier: context.abilityModifiers.evadeModifier,
    activePrecisionValue: context.attackerAbilityModifiers.precision,
    activeAntiEvadeValue: context.attackerAbilityModifiers.antiEvade,
    activeCriticalHitValue: context.attackerAbilityModifiers.criticalHit,
    attackPoolRemoval: clone(context.profileForBatch.attackPoolRemoval),
    reactionPolicy: clone(context.mechanicalPlan.reactionPolicy),
    evadeEligible: context.evadeEligible,
    evadeEligibilityReason: context.authoritativeEvadeReason,
    mechanicalEvadeAdapterUsed: context.evadeEligible
      && context.authoritativeEvadeReason
        !== "target_engaged_and_suffering_ranged_damage",
    fullModelPairVisibilityAndRangeDenominator: true,
    mixedStandardAndLongRangeHitGroupsExact: true,
    perModelBurstFireAndLockedInExact: true,
    sourceRefreshPerformed: false,
    rulesTruth: "official_selected_roster_ranged_action_instantiation",
    trainingTruth: false,
  };
  const rangedPlan = seal(planBody, "rangedPlanHash");
  const action = freezeDeep({
    actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    sideKey: domain.sideKey, phase: "assault", pieceId: piece.id,
    targetId: target.id, weaponName: context.profile.weaponName,
    rangedPlan, ruleAtomIds: [...RULE_ATOM_IDS],
    executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters, action,
    rulesTruth: "official_selected_roster_ranged_action_instantiation",
    trainingTruth: false,
  });
}

export function previewOfficialSelectedRosterRangedActionV1(state, domain, parameters) {
  const instantiated = instantiateOfficialSelectedRosterRangedActionV1(
    state, domain, parameters,
  );
  return seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_preview_v1",
    semanticVersion: "1.0.0", action: instantiated.action,
    actionHash: hashStarcraftTmgContract(instantiated.action),
    chance: clone(instantiated.action.rangedPlan.chance),
    eligibleAttackerModelIds:
      instantiated.action.rangedPlan.eligibleAttackerModelIds,
    visibleTargetModelIds: instantiated.action.rangedPlan.visibleTargetModelIds,
    mutationApplied: false, rulesAuthority: true,
    rulesTruth: "official_selected_roster_ranged_preview",
    trainingTruth: false,
  }, "previewHash");
}

export function resolveOfficialSelectedRosterRangedChanceV1(
  state, action, options = {},
) {
  const piece = state.pieces.find((entry) => entry.id === action.pieceId);
  const target = state.pieces.find((entry) => entry.id === action.targetId);
  const context = contextFor(
    state, action.sideKey, piece, target, action.rangedPlan.profileKey, {
      pointDefenseChoices: action.rangedPlan.canonicalParameters,
    },
  );
  const mechanicalResolution = resolveMechanicalPlan(
    context.mechanicalPlan, options.chanceReveals,
  );
  const stages = clone(mechanicalResolution.stages);
  const precisionValue = Number(context.attackerAbilityModifiers.precision || 0);
  const failedHitDieIndices = stages.hit.rolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll, index }) => !rollSucceeds(
      roll, stages.hit.thresholdByDieIndex[index]))
    .map(({ index }) => index);
  const convertedFailedHitDieIndices = [...new Set(
    (options.precisionConvertedFailedHitDieIndices || []).map(Number),
  )].sort((left, right) => left - right);
  if (convertedFailedHitDieIndices.length > precisionValue
    || convertedFailedHitDieIndices.some((index) => (
      !Number.isSafeInteger(index) || !failedHitDieIndices.includes(index)))) {
    fail("SELECTED_RANGED_PRECISION_SELECTION_INVALID");
  }
  if (convertedFailedHitDieIndices.length > 0) {
    const originalHits = stages.hit.hits;
    const hits = originalHits + convertedFailedHitDieIndices.length;
    const surgeCapacity = stages.effects.surgeMatched
      ? stages.effects.surgeResults.reduce((sum, value) => sum + value, 0) : 0;
    const bypassedArmourHits = Math.min(hits,
      surgeCapacity + Number(stages.effects.criticalHitCapacity || 0));
    const armourDice = hits - bypassedArmourHits;
    const armourRolls = [...stages.armour.rolls,
      ...stages.armour.unusedPreallocatedRolls];
    const resolvedArmourRolls = armourRolls.slice(0, armourDice);
    const armourSaves = resolvedArmourRolls.filter((roll) => (
      rollSucceeds(roll, stages.armour.threshold))).length;
    const damagePoolBeforeEvade = bypassedArmourHits + armourDice - armourSaves;
    const evadeDice = stages.evade.eligible ? damagePoolBeforeEvade : 0;
    const evadeRolls = [...stages.evade.rolls, ...stages.evade.unusedPreallocatedRolls];
    const resolvedEvadeRolls = evadeRolls.slice(0, evadeDice);
    const evadeSaves = resolvedEvadeRolls.filter((roll) => (
      rollSucceeds(roll, stages.evade.effectiveThreshold))).length;
    const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;
    stages.hit = { ...stages.hit, originalHits, hits,
      failedHitDieIndices, convertedFailedHitDieIndices,
      precisionConvertedHits: convertedFailedHitDieIndices.length };
    stages.effects = { ...stages.effects, bypassedArmourHits,
      precisionApplied: true, precisionValue,
      convertedDiceCountAsHitsForAllPurposes: true };
    stages.armour = { ...stages.armour, dice: armourDice,
      rolls: resolvedArmourRolls,
      unusedPreallocatedRolls: armourRolls.slice(armourDice), saves: armourSaves };
    stages.evade = { ...stages.evade, dice: evadeDice,
      rolls: resolvedEvadeRolls,
      unusedPreallocatedRolls: evadeRolls.slice(evadeDice),
      damagePoolBeforeEvade, saves: evadeSaves, confirmedDamageDice };
    stages.damage = { ...stages.damage, damagePoolDice: confirmedDamageDice,
      totalDamage: confirmedDamageDice * stages.damage.damagePerDie };
  } else {
    stages.hit.failedHitDieIndices = failedHitDieIndices;
    stages.hit.convertedFailedHitDieIndices = [];
    stages.effects.precisionApplied = false;
    stages.effects.precisionValue = precisionValue;
  }
  stages.evade.eligibilityReason = context.authoritativeEvadeReason;
  const resolution = seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_resolution_v1",
    mechanicalResolutionHash: mechanicalResolution.resolutionHash,
    attackPlanHash: context.mechanicalPlan.planHash,
    authoritativeEvadeReason: context.authoritativeEvadeReason,
    stages, reveals: clone(mechanicalResolution.reveals),
    precisionChoiceDomain: { failedHitDieIndices,
      maximumConvertedDice: Math.min(precisionValue, failedHitDieIndices.length),
      selectedFailedHitDieIndices: convertedFailedHitDieIndices,
      mayDecline: true },
    rulesTruth: "official_selected_roster_ranged_pool_resolution",
    trainingTruth: false,
  }, "resolutionHash");
  const casualtyDomain = createOfficialCurrentProductCasualtyDomainV1({
    targetPiece: target, targetProfile: context.targetProfile,
    incomingDamage: Number(stages.damage.totalDamage),
    visibleModelIds: context.geometry.visibleTargetModelIds,
    engagementGraph: context.graph, attackResolutionHash: resolution.resolutionHash,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  return freezeDeep({ context, resolution, casualtyDomain });
}

export function createOfficialCurrentProductCasualtyDomainV1(input) {
  const targetPiece = input.targetPiece;
  const hitPoints = Number(input.targetProfile.hitPoints);
  const shieldValue = Number(input.targetProfile.shield || 0);
  const priorDamageMarker = Number(targetPiece.damageMarker || 0);
  const incomingDamage = Number(input.incomingDamage);
  const shieldedBefore = shieldValue > 0 && statusNamed(targetPiece, "shielded");
  const shieldCapacityApplied = shieldValue > 0
    && targetPiece.firstModelShieldCapacityApplied !== false;
  const firstModelHitPoints = hitPoints + (shieldCapacityApplied ? shieldValue : 0);
  const totalDamage = priorDamageMarker + incomingDamage;
  const uncappedCasualtyCount = totalDamage < firstModelHitPoints ? 0
    : 1 + Math.floor((totalDamage - firstModelHitPoints) / hitPoints);
  const remainder = totalDamage < firstModelHitPoints
    ? totalDamage : (totalDamage - firstModelHitPoints) % hitPoints;
  const projected = clone(targetPiece);
  projected.damageMarker = 0;
  const equivalentDamage = uncappedCasualtyCount === 0
    ? 0 : uncappedCasualtyCount * hitPoints + remainder;
  const baseDomain = CASUALTY_KERNEL.createDomain({
    targetPiece: projected, targetHitPoints: hitPoints, priorDamageMarker: 0,
    incomingDamage: equivalentDamage, visibleModelIds: input.visibleModelIds,
    engagementGraph: input.engagementGraph,
    attackResolutionHash: input.attackResolutionHash,
    rulesRuntimeHash: input.rulesRuntimeHash,
  });
  const casualtyCount = baseDomain.casualtyCount;
  const discardRemainder = baseDomain.targetDestroyed
    || (baseDomain.casualtyCount < uncappedCasualtyCount);
  const postDamageMarker = discardRemainder ? 0 : remainder;
  const legalSelections = baseDomain.legalSelections.map((selection) => {
    const body = { ...clone(without(selection, ["selectionHash"])),
      postDamageMarker, discardedOverflowDamage: discardRemainder
        ? Math.max(0, totalDamage - (casualtyCount === 0 ? 0
          : firstModelHitPoints + ((casualtyCount - 1) * hitPoints))) : 0,
      shieldedAfter: shieldedBefore && casualtyCount === 0
        && postDamageMarker <= shieldValue };
    return { ...body, selectionHash: hashStarcraftTmgContract(body) };
  });
  return seal({
    schema: "starcraft_tmg_official_current_product_casualty_domain_v1",
    baseDomain,
    targetPieceId: targetPiece.id,
    targetHitPoints: hitPoints,
    shieldValue,
    shieldedBefore,
    shieldCapacityApplied,
    firstModelHitPoints,
    priorDamageMarker,
    incomingDamage,
    totalDamage,
    casualtyCount,
    postDamageMarker,
    targetDestroyed: baseDomain.targetDestroyed,
    visibleModelIds: clone(input.visibleModelIds),
    legalSelections,
    rulesTruth: "official_current_product_shielded_and_multi_model_casualty_domain",
    trainingTruth: false,
  }, "domainHash");
}
export function resolveOfficialCurrentProductCasualtyDomainV1(domain, selectionHash) {
  if (!object(domain)
    || domain.schema !== "starcraft_tmg_official_current_product_casualty_domain_v1"
    || domain.domainHash !== hashStarcraftTmgContract(without(domain, ["domainHash"]))) {
    fail("SELECTED_RANGED_CASUALTY_DOMAIN_INVALID");
  }
  const selection = domain.legalSelections.find((entry) => (
    entry.selectionHash === selectionHash));
  if (!selection) fail("SELECTED_RANGED_CASUALTY_SELECTION_STALE");
  return seal({
    schema: "starcraft_tmg_official_current_product_casualty_resolution_v1",
    domainHash: domain.domainHash,
    selectionHash,
    targetPieceId: domain.targetPieceId,
    casualtyModelIds: clone(selection.casualtyModelIds),
    remainingModelIds: clone(selection.remainingModelIds),
    remainingEngagedEnemyUnitIds: clone(selection.remainingEngagedEnemyUnitIds),
    postDamageMarker: selection.postDamageMarker,
    targetDestroyed: selection.targetDestroyed,
    discardedOverflowDamage: selection.discardedOverflowDamage,
    shieldedBefore: domain.shieldedBefore,
    shieldedAfter: selection.shieldedAfter,
    trainingTruth: false,
  }, "resolutionHash");
}

function exactCurrentSupply(profile, currentModels) {
  if (currentModels === 0) return 0;
  const tier = profile.squadProfile.find((entry) => (
    entry.minimumModels !== null && currentModels >= entry.minimumModels
      && currentModels <= entry.maximumModels
  ));
  if (!tier) fail("SELECTED_RANGED_SUPPLY_TIER_UNAVAILABLE", String(currentModels));
  return Number(tier.supply);
}
function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey && activePiece(piece)
      && piece.activatedPhases?.assault !== true
  ));
}
function consumeRestriction(piece, state, action) {
  const restriction = piece.disengageAssaultRestriction;
  if (!restriction) return null;
  const historyEntry = {
    schema: "starcraft_tmg_official_post_disengage_assault_restriction_consumption_v1",
    restrictionHash: restriction.restrictionHash,
    declaredRound: restriction.declaredRound,
    consumedRound: Number(state.round), consumedPhase: "assault",
    consumedByActionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
    consumedByActionHash: hashStarcraftTmgContract(action),
    tacticalMass: restriction.tacticalMass,
    rangedAttackWasProhibited: restriction.rangedAttackProhibited,
    trainingTruth: false,
  };
  piece.disengageAssaultRestrictionHistory = Array.isArray(
    piece.disengageAssaultRestrictionHistory,
  ) ? piece.disengageAssaultRestrictionHistory : [];
  piece.disengageAssaultRestrictionHistory.push(historyEntry);
  delete piece.disengageAssaultRestriction;
  return { type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id, restrictionHash: historyEntry.restrictionHash,
    consumedByActionType: historyEntry.consumedByActionType,
    consumedByActionHash: historyEntry.consumedByActionHash,
    tacticalMass: historyEntry.tacticalMass, trainingTruth: false };
}

export function finishOfficialSelectedRosterRangedSequenceV1(
  stateInput, actionInput, options = {},
) {
  const pending = pendingSequence(stateInput);
  if (!pending || !object(actionInput)
    || actionInput.actionType !== OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || actionInput.sideKey !== pending.sideKey || actionInput.pieceId !== pending.pieceId
    || actionInput.sequenceHash !== pending.sequenceHash) {
    fail("SELECTED_RANGED_FINISH_ACTION_INVALID");
  }
  const current = enumerateOfficialSelectedRosterRangedActionsV1(stateInput, {
    sideKey: pending.sideKey, includeDisabled: true,
  }).candidates.find((entry) => entry.isEnabled === true
    && entry.actionType === OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE);
  if (!current || !isDeepStrictEqual(current, actionInput)) {
    fail("SELECTED_RANGED_FINISH_ACTION_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pending.pieceId);
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: true };
  delete state.pendingCurrentProductRangedSequence;
  const events = [{ type: "ranged_attack_sequence_finished",
    sideKey: pending.sideKey, pieceId: pending.pieceId,
    completedBatchCount: pending.completedBatches.length,
    voluntaryStop: true, trainingTruth: false }];
  if (!openOfficialSelectedRosterAfterActionWindowV1(
    state, pending.sideKey, pending.pieceId, "assault")) {
    const opponent = otherSide(pending.sideKey);
    state.activeSideKey = sideHasAvailableAssaultActivation(state, opponent)
      ? opponent : pending.sideKey;
  }
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  return freezeDeep({ ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_ranged_finish_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
    rulesTruth: "official_current_product_ranged_sequence_finish",
    trainingTruth: false });
}

export function applyOfficialSelectedRosterRangedActionV1(
  stateInput, actionInput, options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || actionInput.executorVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || actionInput.rangedPlan?.schemaVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA) {
    fail("SELECTED_RANGED_ACTION_INVALID");
  }
  const domain = enumerateOfficialSelectedRosterRangedActionsV1(stateInput, {
    sideKey: actionInput.sideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === actionInput.rangedPlan.domainId);
  if (!domain) fail("SELECTED_RANGED_PARAMETER_DOMAIN_STALE");
  const current = instantiateOfficialSelectedRosterRangedActionV1(
    stateInput, domain, actionInput.rangedPlan.canonicalParameters,
  );
  if (!isDeepStrictEqual(current.action, actionInput)) {
    fail("SELECTED_RANGED_ACTION_STALE");
  }
  const chance = resolveOfficialSelectedRosterRangedChanceV1(
    stateInput, actionInput, options,
  );
  const selectionHash = String(options.casualtySelectionHash
    || (chance.casualtyDomain.legalSelections.length === 1
      ? chance.casualtyDomain.legalSelections[0].selectionHash : ""));
  if (!selectionHash) fail("SELECTED_RANGED_CASUALTY_SELECTION_REQUIRED");
  const casualty = resolveOfficialCurrentProductCasualtyDomainV1(
    chance.casualtyDomain, selectionHash);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const beforeSupply = Number(target.currentSupply);
  for (const modelId of casualty.casualtyModelIds) {
    const model = target.models.find((entry) => entry.id === modelId);
    model.isDestroyed = true;
    model.isOnField = false;
    model.damage = chance.context.targetProfile.hitPoints;
    model.remainingWounds = 0;
  }
  target.destroyedModelIds = target.models.filter((model) => model.isDestroyed === true)
    .map((model) => model.id).sort();
  target.currentModels = casualty.remainingModelIds.length;
  target.currentSupply = exactCurrentSupply(
    chance.context.targetProfile, target.currentModels,
  );
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
    const remainingCapacity = Number(chance.context.targetProfile.hitPoints)
      + (target.firstModelShieldCapacityApplied
        ? Number(chance.context.targetProfile.shield || 0) : 0);
    firstRemainingModel.damage = casualty.postDamageMarker;
    firstRemainingModel.remainingWounds = Math.max(0,
      remainingCapacity - casualty.postDamageMarker);
  }
  const priorSequence = pendingSequence(stateInput);
  if (!priorSequence) consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id);
  const consumedCharacteristicEffects = !priorSequence
    && state.officialCharacteristicStatusFamilySourceBundle
    ? consumeOfficialCharacteristicStatusFirstWeaponEffectsV1(
      state, piece.id, "ranged") : [];
  const pointDefenseSourcePieceIds = chance.context.profileForBatch.instant
    ? [] : clone(chance.context.profileForBatch.attackPoolRemoval
      .pointDefenseSourcePieceIds || []);
  const pointDefenseEvents = [];
  let remainingPointDefenseDice = Number(
    chance.context.profileForBatch.attackPoolRemoval.pointDefenseDice || 0);
  for (const sourceId of pointDefenseSourcePieceIds) {
    const source = state.pieces.find((entry) => entry.id === sourceId);
    if (!source || !activePiece(source)) continue;
    source.currentModels = 0;
    source.currentSupply = 0;
    source.isDestroyed = true;
    source.isOnField = false;
    source.isInReserves = false;
    source.destroyedModelIds = source.models.map((model) => model.id).sort();
    for (const model of source.models) {
      model.isDestroyed = true;
      model.isOnField = false;
      model.remainingWounds = 0;
    }
    const removedBySource = Math.min(2, remainingPointDefenseDice);
    remainingPointDefenseDice -= removedBySource;
    pointDefenseEvents.push({ type: "point_defense_drone_removed",
      pieceId: source.id, protectedTargetId: target.id,
      attackPoolDiceRemoved: removedBySource,
      trainingTruth: false });
  }
  const restrictionEvent = consumeRestriction(piece, state, actionInput);
  const rangedEvent = {
    type: "ranged_attack", sideKey: actionInput.sideKey,
    pieceId: piece.id, targetId: target.id,
    weaponName: actionInput.weaponName,
    sourceProfileHash: actionInput.rangedPlan.sourceProfileHash,
    batchProfileHash: actionInput.rangedPlan.batchProfileHash,
    attackPlanHash: actionInput.rangedPlan.attackPlanHash,
    attackResolutionHash: chance.resolution.resolutionHash,
    casualtyDomainHash: chance.casualtyDomain.domainHash,
    casualtyResolutionHash: casualty.resolutionHash,
    eligibleAttackerModelIds: actionInput.rangedPlan.eligibleAttackerModelIds,
    visibleTargetModelIds: actionInput.rangedPlan.visibleTargetModelIds,
    chanceReveals: chance.resolution.reveals,
    stages: chance.resolution.stages,
    casualtyModelIds: casualty.casualtyModelIds,
    postDamageMarker: casualty.postDamageMarker,
    targetDestroyed: casualty.targetDestroyed,
    shieldedBefore: casualty.shieldedBefore,
    shieldedAfter: casualty.shieldedAfter,
    pointDefenseSourcePieceIds,
    consumedCharacteristicFirstWeaponEffects: consumedCharacteristicEffects,
    currentSupplyBefore: beforeSupply,
    currentSupplyAfter: Number(target.currentSupply),
    evadeEligibilityReason: actionInput.rangedPlan.evadeEligibilityReason,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    trainingTruth: false,
  };
  const events = [rangedEvent, ...pointDefenseEvents,
    ...(restrictionEvent ? [restrictionEvent] : [])];
  const sourceProfile = chance.context.profile;
  const priorUsedProfileKeys = clone(priorSequence?.usedProfileKeys || []);
  const priorOrdinaryModelIds = clone(priorSequence?.ordinaryModelIdsUsed || []);
  const sidearm = Boolean(effectById(sourceProfile, "attack-effect:sidearm-v1"));
  const sequenceBody = {
    schema: "starcraft_tmg_official_current_product_ranged_sequence_v1",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    round: Number(state.round),
    phase: state.phase,
    usedProfileKeys: [...new Set([...priorUsedProfileKeys,
      sourceProfile.profileKey])].sort(),
    ordinaryModelIdsUsed: sidearm ? priorOrdinaryModelIds
      : [...new Set([...priorOrdinaryModelIds,
        ...chance.context.geometry.eligibleAttackerModelIds])].sort(),
    sidearmProfileKeysUsed: [...new Set([
      ...(priorSequence?.sidearmProfileKeysUsed || []),
      ...(sidearm ? [sourceProfile.profileKey] : []),
    ])].sort(),
    completedBatches: [...(priorSequence?.completedBatches || []), {
      profileKey: sourceProfile.profileKey,
      targetId: target.id,
      attackResolutionHash: chance.resolution.resolutionHash,
      casualtyResolutionHash: casualty.resolutionHash,
    }],
    rulesTruth: "official_current_product_sequential_ranged_batches",
    trainingTruth: false,
  };
  const sequence = seal(sequenceBody, "sequenceHash");
  state.pendingCurrentProductRangedSequence = clone(sequence);
  const remainingProfiles = profilesAllowedByPending(
    state, piece, activeProfilesFor(state, piece).profiles);
  const sequenceContinues = remainingProfiles.length > 0;
  if (sequenceContinues) {
    piece.activatedPhases = { movement: false, assault: false, combat: false,
      ...(piece.activatedPhases || {}), assault: false };
    state.activeSideKey = actionInput.sideKey;
  } else {
    delete state.pendingCurrentProductRangedSequence;
    piece.activatedPhases = { movement: false, assault: false, combat: false,
      ...(piece.activatedPhases || {}), assault: true };
    if (!openOfficialSelectedRosterAfterActionWindowV1(
      state, actionInput.sideKey, piece.id, "assault")) {
      const opponentSideKey = otherSide(actionInput.sideKey);
      if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
        state.activeSideKey = opponentSideKey;
      } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
        state.activeSideKey = actionInput.sideKey;
      }
    }
  }
  rangedEvent.sequenceHash = sequence.sequenceHash;
  rangedEvent.sequenceContinues = sequenceContinues;
  rangedEvent.remainingProfileKeys = remainingProfiles.map((entry) => entry.profileKey).sort();
  const supply = recordOfficialSupplyLossesV1({
    stateBefore: stateInput, stateAfter: state, action: actionInput, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  state.supplyLossLedger = clone(supply.ledger);
  events.push(...supply.supplyLossEvents.map(clone));
  state.rangedActionHistory = Array.isArray(state.rangedActionHistory)
    ? state.rangedActionHistory : [];
  state.rangedActionHistory.push({
    round: Number(state.round), phase: state.phase, pieceId: piece.id,
    targetId: target.id, rangedPlanHash: actionInput.rangedPlan.rangedPlanHash,
    resolutionHash: chance.resolution.resolutionHash,
    casualtyResolutionHash: casualty.resolutionHash, trainingTruth: false,
  });
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ id: `log-${state.log.length + 1}`, round: Number(state.round),
    phase: state.phase, action: clone(actionInput), events: clone(events) });
  return freezeDeep({
    ok: true,
    schemaVersion: "starcraft_tmg_selected_roster_ranged_transition_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    postRevision: Number(options.postRevision || 0), state,
    action: clone(actionInput), events,
    rulesTruth: "official_selected_roster_ranged_transition",
    trainingTruth: false,
  });
}

export function queryOfficialSelectedRosterRangedActionV1(input = {}) {
  const state = input.state;
  const request = input.request;
  const queryKind = String(request?.queryKind || request?.kind || "");
  if (!["instantiate_parameterized_action", "line_of_sight_and_attack_pool",
    "resolve_chance_and_casualty_domain"].includes(queryKind)) {
    fail("SELECTED_RANGED_QUERY_KIND_UNSUPPORTED", queryKind);
  }
  const domain = enumerateOfficialSelectedRosterRangedActionsV1(state, {
    sideKey: request.sideKey || state.activeSideKey, includeDisabled: true,
  }).parameterDomains.find((entry) => entry.domainId === request.domainId);
  if (!domain) fail("SELECTED_RANGED_QUERY_DOMAIN_STALE");
  const preview = previewOfficialSelectedRosterRangedActionV1(
    state, domain, request.parameters || {},
  );
  const chance = queryKind === "resolve_chance_and_casualty_domain"
    ? resolveOfficialSelectedRosterRangedChanceV1(state, preview.action, {
      chanceReveals: request.chanceReveals,
      precisionConvertedFailedHitDieIndices:
        request.precisionConvertedFailedHitDieIndices,
    }) : null;
  return seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_query_v1",
    semanticVersion: "1.0.0", ok: true, precision: "exact",
    queryKind, domainId: domain.domainId,
    result: { preview, action: preview.action,
      resolution: chance?.resolution || null,
      casualtyDomain: chance?.casualtyDomain || null },
    source: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    rulesAuthority: true, mutationAuthority: false,
    sourceRefreshPerformed: false, trainingTruth: false,
  }, "queryReceiptHash");
}

export function createOfficialSelectedRosterRangedActionRuntimeV1(state) {
  verifyRuntimeState(state);
  const noRangedUnitIds = [];
  const routes = [];
  for (const piece of state.pieces) {
    const { loadout, profiles } = activeProfilesFor(state, piece, { activeOnly: false });
    if (profiles.length === 0) noRangedUnitIds.push(piece.id);
    for (const profile of profiles) routes.push({
      routeId: `${piece.id}:${profile.profileKey}`,
      pieceId: piece.id, officialUnitRecordKey: piece.officialUnitRecordKey,
      actionType: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE, phase: "assault",
      profileKey: profile.profileKey, profileHash: profile.profileHash,
      weaponName: profile.weaponName, loadoutHash: loadout.loadoutHash,
      routeStatus: "executable_exact",
      executorId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
      executorVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
      ruleAtomIds: [...RULE_ATOM_IDS],
    });
  }
  routes.sort((left, right) => left.routeId.localeCompare(right.routeId));
  noRangedUnitIds.sort();
  const descriptor = seal({
    schemaVersion: "starcraft_tmg_selected_roster_ranged_runtime_descriptor_v1",
    runtimeId: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID,
    runtimeVersion: OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION,
    selectedUnitCount: state.pieces.length,
    selectedRangedUnitCount: new Set(routes.map((route) => route.pieceId)).size,
    selectedRangedRouteCount: routes.length,
    selectedNoRangedUnitCount: noRangedUnitIds.length,
    noRangedUnitIds, unsupportedSelectedRangedRouteCount: 0,
    routes, actions: [OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE,
      OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE],
    geometryScope: "selected_500_skirmish_round_bases_certified_terrain_v1",
    arbitraryRosterClosureClaimed: false,
    fullModelPairVisibilityAndRangeDenominator: true,
    elevatedAndGrassLineOfSightExact: true,
    multiModelAttackPoolAndCasualtySelectionExact: true,
    paidUnselectedAdditionalWeaponsFilteredFromLoadout: true,
    supplyLossLedgerIntegrated: true,
    activeEvadeModifiersApplied: true,
    activePrecisionValueExposedToChoiceLifecycle: true,
    defenderPointDefenseChoiceBoundIntoActionPlan: true,
    sequentialWeaponBatchesAndVoluntaryFinishExact: true,
    afterActionAbilityWindowIntegrated: true,
    legalSpacePreviewApplyAndQueryShareInstantiation: true,
    sourceRefreshPerformed: false, productionRoomEligible: false,
    rulesTruth: "official_selected_roster_ranged_runtime",
    trainingTruth: false,
  }, "runtimeHash");
  return freezeDeep({ descriptor,
    enumerate: enumerateOfficialSelectedRosterRangedActionsV1,
    instantiate: instantiateOfficialSelectedRosterRangedActionV1,
    preview: previewOfficialSelectedRosterRangedActionV1,
    resolveChance: resolveOfficialSelectedRosterRangedChanceV1,
    apply: applyOfficialSelectedRosterRangedActionV1,
    query: queryOfficialSelectedRosterRangedActionV1 });
}

export function verifyOfficialSelectedRosterRangedRuntimeDescriptorV1(descriptor) {
  if (!object(descriptor)
    || descriptor.runtimeId !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID
    || descriptor.runtimeVersion !== OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION
    || descriptor.runtimeHash !== hashStarcraftTmgContract(
      without(descriptor, ["runtimeHash"]))
    || descriptor.selectedUnitCount !== 5
    || descriptor.selectedRangedUnitCount !== 4
    || descriptor.selectedRangedRouteCount !== 4
    || descriptor.selectedNoRangedUnitCount !== 1
    || descriptor.unsupportedSelectedRangedRouteCount !== 0
    || descriptor.routes?.length !== 4
    || descriptor.noRangedUnitIds?.length !== 1
    || descriptor.fullModelPairVisibilityAndRangeDenominator !== true
    || descriptor.defenderPointDefenseChoiceBoundIntoActionPlan !== true
    || descriptor.sequentialWeaponBatchesAndVoluntaryFinishExact !== true
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_RANGED_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
