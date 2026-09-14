import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "../rule-atoms/official-attack-resolution-kernel-v5.mjs";
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
  createOfficialReplacementWeaponLoadoutV1,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "../rule-atoms/official-weapon-replacement-loadout-v1.mjs";
import { recordOfficialSupplyLossesV1, verifyOfficialSupplyLossLedgerV1 } from
  "../rule-atoms/official-supply-loss-ledger-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { verifyOfficialCombatProfileBundleV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialTerrainLosDataBundleV1 } from
  "../source-data/official-terrain-los-data-bundle-v1.mjs";
import {
  assertOfficialSelectedRosterCoreActionWindowV1,
  consumeOfficialSelectedRosterFirstWeaponModifierV1,
  getOfficialSelectedRosterCombatProfileV1,
  openOfficialSelectedRosterAfterActionWindowV1,
  resolveOfficialSelectedRosterAbilityModifiersV1,
} from "./official-selected-roster-ability-runtime-v1.mjs";

export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_ID =
  "starcraft-tmg-official-selected-roster-ranged-action-runtime-v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_RUNTIME_VERSION = "1.1.0";
export const OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE = "ranged_attack";
export const OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND =
  "official_selected_roster_ranged_target_v1";
export const OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA =
  "starcraft_tmg_official_selected_roster_ranged_plan_v1";

const SELECTED_RECORD_KEYS = new Set([
  "army_units:marine",
  "army_units:kerrigan",
  "army_units:kerrigan_swarm_raptor__zergling_",
  "army_units:omega_worm",
]);
const SIDE_KEYS = new Set(["player1", "player2"]);
const ATTACK_KERNEL = createOfficialAttackResolutionKernelV5();
const CASUALTY_KERNEL = createOfficialMultiModelCasualtyResolutionKernelV1();
const RULE_ATOM_IDS = Object.freeze([...new Set([
  ...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS,
  ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  ...OFFICIAL_ELEVATION_EFFECTIVE_SIZE_RULES_ACTION_ATOM_IDS,
])].sort((left, right) => left.localeCompare(right)));
const DISTANCE_SENSITIVE_EFFECTS = new Set([
  "attack-effect:burst-fire-v1", "attack-effect:long-range-v1",
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
function verifyRuntimeState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces) || state.pieces.length < 5 || state.pieces.length > 6
    || state.pieces.some((piece) => !SELECTED_RECORD_KEYS.has(piece.officialUnitRecordKey))) {
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
    if (!Array.isArray(piece.models)
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
function loadoutFor(state, piece, { activeOnly = true } = {}) {
  const modelIds = (activeOnly ? activeModels(piece) : piece.models.filter((model) => (
    model.isDestroyed !== true
  ))).map((model) => model.id);
  if (modelIds.length === 0) fail("SELECTED_RANGED_LOADOUT_MODEL_REQUIRED", piece.id);
  const receipt = createOfficialReplacementWeaponLoadoutV1({
    catalogue: state.officialAttackProfileCatalogue,
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    selectedWeaponUpgradeNames: replacementWeaponNames(state, piece),
    modelIds,
  });
  verifyOfficialReplacementWeaponLoadoutV1({
    catalogue: state.officialAttackProfileCatalogue, receipt,
  });
  return receipt;
}
function activeProfilesFor(state, piece, options = {}) {
  const phaseProfiles = state.officialAttackProfileCatalogue.profiles.filter((profile) => (
    profile.recordKey === piece.officialUnitRecordKey && profile.phase === "assault"
  ));
  if (phaseProfiles.length === 0) return { loadout: null, profiles: [] };
  const loadout = loadoutFor(state, piece, options);
  const selectedNames = new Set(piece.selectedUpgradeNames || []);
  return { loadout, profiles: loadout.availableProfileKeys.map((profileKey) => (
    getOfficialAttackProfileV1(state.officialAttackProfileCatalogue, profileKey)
  )).filter((profile) => profile.range.kind === "inches"
    && (profile.costSmall === 0 && profile.costLarge === 0
      || selectedNames.has(profile.weaponName))) };
}
function graphHasUnitPair(graph, leftUnitId, rightUnitId) {
  return graph.modelEdges.some((edge) => (
    edge.leftUnitId === leftUnitId && edge.rightUnitId === rightUnitId
      || edge.leftUnitId === rightUnitId && edge.rightUnitId === leftUnitId
  ));
}
function assertAssaultContext(state, sideKey, piece, target, graph) {
  phaseReady(state, sideKey);
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("SELECTED_RANGED_UNIT_UNAVAILABLE", String(piece?.id || ""));
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("SELECTED_RANGED_TARGET_UNAVAILABLE", String(target?.id || ""));
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
  if ((!attackerEngaged && targetEngaged) || (attackerEngaged && !mutuallyEngaged)) {
    fail("SELECTED_RANGED_ENGAGEMENT_TARGET_PROHIBITED", target.id);
  }
  return { attackerEngaged, targetEngaged, mutuallyEngaged };
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
function candidateGeometry(state, piece, target, profile) {
  const pairs = [];
  const adapted = terrainAsOrdinaryForLos(state);
  for (const attackerModel of activeModels(piece)) {
    for (const targetModel of activeModels(target)) {
      const lineOfSight = lineOfSightFor(
        state, piece, attackerModel, target, targetModel, adapted,
      );
      const distanceInches = baseGapInches(attackerModel, targetModel);
      pairs.push({ attackerModelId: attackerModel.id, targetModelId: targetModel.id,
        distanceInches, withinMaximumRange: distanceInches
          <= Number(profile.range.normalRangeInches),
        visible: lineOfSight.visible, highGroundEvadeEligible:
          lineOfSight.highGroundEvadeEligible,
        lineOfSightHash: lineOfSight.lineOfSightHash,
        blockingTerrainIds: lineOfSight.blockingTerrainIds });
    }
  }
  const eligiblePairs = pairs.filter((pair) => pair.visible && pair.withinMaximumRange);
  const eligibleAttackerModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.attackerModelId
  )))].sort();
  const visibleTargetModelIds = [...new Set(eligiblePairs.map((pair) => (
    pair.targetModelId
  )))].sort();
  if (eligibleAttackerModelIds.length === 0 || visibleTargetModelIds.length === 0) {
    fail("SELECTED_RANGED_NO_VISIBLE_TARGET_IN_RANGE", target.id);
  }
  const distanceInches = Math.max(...eligibleAttackerModelIds.map((modelId) => (
    Math.min(...eligiblePairs.filter((pair) => pair.attackerModelId === modelId)
      .map((pair) => pair.distanceInches))
  )));
  return freezeDeep({ pairs, eligibleAttackerModelIds, visibleTargetModelIds,
    distanceInches, fullModelPairDenominatorAssessed: true });
}
function batchProfile(profile, eligibleModelCount) {
  if (profile.effects.some((effect) => DISTANCE_SENSITIVE_EFFECTS.has(effect.effectAtomId))) {
    fail("SELECTED_RANGED_MIXED_DISTANCE_EFFECT_SCOPE_UNSUPPORTED", profile.profileKey);
  }
  const body = { ...clone(without(profile, ["profileHash"])),
    profileKey: `${profile.profileKey}::batch-${eligibleModelCount}`,
    rateOfAttack: Number(profile.rateOfAttack) * eligibleModelCount };
  return freezeDeep({ ...body, profileHash: hashStarcraftTmgContract(body) });
}
function planAttackResolution(state, piece, target, profile, geometry, targetProfile,
  engagement, graph) {
  const highGroundEvadeEligible = geometry.pairs.some((pair) => (
    pair.visible && pair.withinMaximumRange && pair.highGroundEvadeEligible
  ));
  const abilityModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, target, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  const evadeEligible = targetProfile.evadeThreshold !== null
    && (engagement.targetEngaged || highGroundEvadeEligible
      || abilityModifiers.evadeEligible);
  const authoritativeEvadeReason = !evadeEligible ? "none"
    : abilityModifiers.evadeEligible ? "active_ability_evade_eligibility"
      : engagement.targetEngaged && highGroundEvadeEligible
      ? "target_engaged_or_all_high_ground"
      : engagement.targetEngaged
        ? "target_engaged_and_suffering_ranged_damage"
        : "target_all_high_ground_and_attack_originates_lower";
  const profileForBatch = batchProfile(profile, geometry.eligibleAttackerModelIds.length);
  const evadeThreshold = targetProfile.evadeThreshold === null ? null
    : Math.max(2, Number(targetProfile.evadeThreshold)
      - Number(abilityModifiers.evadeModifier || 0));
  const mechanicalPlan = ATTACK_KERNEL.plan({
    profile: profileForBatch,
    target: { armourThreshold: targetProfile.armourThreshold,
      evadeThreshold,
      combatTags: targetProfile.combatTags },
    distanceInches: geometry.distanceInches,
    evadeEligibility: { eligible: evadeEligible,
      reason: evadeEligible
        ? "target_engaged_and_suffering_ranged_damage" : "none" },
    attackerEngagement: profile.effects.some((effect) => (
      effect.effectAtomId === "attack-effect:bulky-v1"
    )) ? { engaged: engagement.attackerEngaged,
        source: "official_engagement_graph_v2", graphHash: graph.graphHash } : undefined,
  });
  const attackerAbilityModifiers = resolveOfficialSelectedRosterAbilityModifiersV1(
    state, piece, { attackerPieceId: piece.id, weaponName: profile.weaponName,
      damageKind: "ranged_attack" });
  return { mechanicalPlan, profileForBatch, evadeEligible,
    authoritativeEvadeReason, highGroundEvadeEligible, abilityModifiers,
    attackerAbilityModifiers };
}
function contextFor(state, sideKey, piece, target, profileKey, shared = {}) {
  const graph = shared.graph || deriveOfficialEngagementGraphV2(state);
  const engagement = assertAssaultContext(state, sideKey, piece, target, graph);
  const { loadout, profiles } = shared.loadoutAndProfiles
    || activeProfilesFor(state, piece);
  const profile = profiles.find((entry) => entry.profileKey === profileKey);
  if (!profile) fail("SELECTED_RANGED_PROFILE_UNAVAILABLE", profileKey);
  const targetProfile = getOfficialSelectedRosterCombatProfileV1(
    state, target.officialUnitRecordKey);
  if (targetProfile.shield !== 0) {
    fail("SELECTED_RANGED_SELECTED_TARGET_SHIELD_SCOPE_UNSUPPORTED", target.id);
  }
  const geometry = candidateGeometry(state, piece, target, profile);
  const attack = planAttackResolution(
    state, piece, target, profile, geometry, targetProfile, engagement, graph,
  );
  return { graph, engagement, loadout, profile, targetProfile, geometry, ...attack };
}
function domainFor(state, sideKey, piece, profile, targets) {
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
      targetUnitId: { enum: targets.map((entry) => entry.target.id).sort() } },
    constraints: {
      targetPlans: targets.map((entry) => ({
        targetUnitId: entry.target.id,
        attackPlanHash: entry.context.mechanicalPlan.planHash,
        chance: clone(entry.context.mechanicalPlan.chance),
        eligibleAttackerModelIds: entry.context.geometry.eligibleAttackerModelIds,
        visibleTargetModelIds: entry.context.geometry.visibleTargetModelIds,
        targetEngaged: entry.context.engagement.targetEngaged,
        highGroundEvadeEligible: entry.context.highGroundEvadeEligible,
      })).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId)),
      attackProfileCatalogueHash: state.officialAttackProfileCatalogue.catalogueHash,
      combatProfileBundleHash: state.officialCombatProfileBundle.bundleHash,
      terrainLosDataBundleHash: state.officialTerrainLosDataBundle.bundleHash,
      engagementGraphHash: targets[0].context.graph.graphHash,
      fullModelPairVisibilityAndRangeDenominator: true,
    },
    confirmationClass: "agent_owned_legal_action_auto_apply_or_human_direct_choice",
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
  let graph = null;
  try { graph = deriveOfficialEngagementGraphV2(state); } catch (error) {
    if (options.includeDisabled !== true) throw error;
  }
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey && livePiece(entry)
  ))) {
    let profiles = [];
    let loadoutAndProfiles = null;
    try {
      loadoutAndProfiles = activeProfilesFor(
        state, piece, { activeOnly: activePiece(piece) },
      );
      profiles = loadoutAndProfiles.profiles;
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
    || !object(parameters) || Object.keys(parameters).length !== 1) {
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
  const context = contextFor(state, domain.sideKey, piece, target, domain.profileKey);
  const planBody = {
    schemaVersion: OFFICIAL_SELECTED_ROSTER_RANGED_PLAN_SCHEMA,
    semanticVersion: "1.0.0", sideKey: domain.sideKey,
    pieceId: piece.id, targetUnitId, profileKey: context.profile.profileKey,
    sourceProfileHash: context.profile.profileHash,
    batchProfileHash: context.profileForBatch.profileHash,
    weaponName: context.profile.weaponName, domainId: domain.domainId,
    canonicalParameters: { targetUnitId },
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
    evadeEligible: context.evadeEligible,
    evadeEligibilityReason: context.authoritativeEvadeReason,
    mechanicalEvadeAdapterUsed: context.evadeEligible
      && context.authoritativeEvadeReason
        !== "target_engaged_and_suffering_ranged_damage",
    fullModelPairVisibilityAndRangeDenominator: true,
    currentSelectedProfilesHaveNoMixedDistanceSensitiveEffects: true,
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
    canonicalParameters: { targetUnitId }, action,
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
    state, action.sideKey, piece, target, action.rangedPlan.profileKey,
  );
  const mechanicalResolution = ATTACK_KERNEL.resolve(
    context.mechanicalPlan, options.chanceReveals,
  );
  const stages = clone(mechanicalResolution.stages);
  const precisionValue = Number(context.attackerAbilityModifiers.precision || 0);
  const failedHitDieIndices = stages.hit.rolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => !rollSucceeds(roll, stages.hit.threshold))
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
    const surgeCapacity = stages.effects.surgeResults
      .reduce((sum, value) => sum + value, 0);
    const bypassedArmourHits = stages.effects.surgeMatched
      ? Math.min(hits, surgeCapacity) : 0;
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
  const casualtyDomain = CASUALTY_KERNEL.createDomain({
    targetPiece: target,
    targetHitPoints: context.targetProfile.hitPoints,
    priorDamageMarker: Number(target.damageMarker || 0),
    incomingDamage: Number(stages.damage.totalDamage),
    visibleModelIds: context.geometry.visibleTargetModelIds,
    engagementGraph: context.graph,
    attackResolutionHash: resolution.resolutionHash,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  return freezeDeep({ context, resolution, casualtyDomain });
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
  const casualty = CASUALTY_KERNEL.resolve({
    domain: chance.casualtyDomain, selectionHash,
  });
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
  target.isDestroyed = casualty.targetDestroyed;
  target.isOnField = !casualty.targetDestroyed;
  if (casualty.targetDestroyed) target.isInReserves = false;
  piece.activatedPhases = { movement: false, assault: false, combat: false,
    ...(piece.activatedPhases || {}), assault: true };
  consumeOfficialSelectedRosterFirstWeaponModifierV1(state, piece.id);
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
    currentSupplyBefore: beforeSupply,
    currentSupplyAfter: Number(target.currentSupply),
    evadeEligibilityReason: actionInput.rangedPlan.evadeEligibilityReason,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    trainingTruth: false,
  };
  const events = [rangedEvent, ...(restrictionEvent ? [restrictionEvent] : [])];
  const supply = recordOfficialSupplyLossesV1({
    stateBefore: stateInput, stateAfter: state, action: actionInput, events,
    rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash,
  });
  state.supplyLossLedger = clone(supply.ledger);
  events.push(...supply.supplyLossEvents.map(clone));
  if (!openOfficialSelectedRosterAfterActionWindowV1(
    state, actionInput.sideKey, piece.id, "assault")) {
    const opponentSideKey = otherSide(actionInput.sideKey);
    if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
      state.activeSideKey = opponentSideKey;
    } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
      state.activeSideKey = actionInput.sideKey;
    }
  }
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
    routes, actions: [OFFICIAL_SELECTED_ROSTER_RANGED_ACTION_TYPE],
    geometryScope: "selected_500_skirmish_round_bases_certified_terrain_v1",
    arbitraryRosterClosureClaimed: false,
    fullModelPairVisibilityAndRangeDenominator: true,
    elevatedAndGrassLineOfSightExact: true,
    multiModelAttackPoolAndCasualtySelectionExact: true,
    paidUnselectedAdditionalWeaponsFilteredFromLoadout: true,
    supplyLossLedgerIntegrated: true,
    activeEvadeModifiersApplied: true,
    activePrecisionValueExposedToChoiceLifecycle: true,
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
    || descriptor.legalSpacePreviewApplyAndQueryShareInstantiation !== true
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.trainingTruth !== false) {
    fail("SELECTED_RANGED_RUNTIME_DESCRIPTOR_INVALID");
  }
  return true;
}
