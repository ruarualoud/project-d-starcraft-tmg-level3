import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID =
  "authority.marine-multi-model-close-combat-denominator-v2";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION =
  "2.0.0";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_V2_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_plan_v2";

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const CURRENT_GAMEPLAY_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const BAYONET_SOURCE_TEXT_HASH =
  "9b0f85969b11da20c6d837f23a06335f8572bfd798460de3083ed124cef9205a";
const STRIKE_SOURCE_TEXT_HASH =
  "b0156a37c3e3890968e8fe1f14932d8ebcc9dd9920d00c1cc7a6e27dc50a039a";
const MARINE_BASE_MILLI_INCHES = 1260;
const EXACT_LOADOUTS = Object.freeze([
  Object.freeze([]),
  Object.freeze(["Bayonet"]),
  Object.freeze(["Stimpack"]),
  Object.freeze(["Bayonet", "Stimpack"]),
]);
const MODEL_WEAPON_OVERRIDE_FIELDS = Object.freeze([
  "closeCombatWeaponName",
  "closeCombatWeaponNames",
  "combatWeaponName",
  "combatWeaponNames",
]);
const PIECE_WEAPON_OVERRIDE_FIELDS = Object.freeze([
  "closeCombatWeaponAssignments",
  "combatWeaponAssignments",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function uniqueSortedStrings(values, code) {
  if (!Array.isArray(values)) fail(code);
  const result = values.map((value) => String(value || "").trim());
  if (result.some((value) => !value) || new Set(result).size !== result.length) fail(code);
  return result.sort((left, right) => left.localeCompare(right));
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function supplyAt(modelCount) {
  if (!Number.isSafeInteger(modelCount) || modelCount < 0 || modelCount > 9) {
    fail("MARINE_MULTI_MODEL_V2_COUNT_INVALID");
  }
  if (modelCount <= 3) return 0;
  if (modelCount <= 6) return 1;
  return 2;
}

function basesTouch(left, right) {
  const leftRadius = milli(left.baseWidthInches, "MARINE_MULTI_MODEL_V2_BASE_INVALID") / 2;
  const rightRadius = milli(right.baseWidthInches, "MARINE_MULTI_MODEL_V2_BASE_INVALID") / 2;
  const distance = Math.hypot(
    milli(right.xInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID")
      - milli(left.xInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID"),
    milli(right.yInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID")
      - milli(left.yInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID"),
  );
  return Math.abs(distance - leftRadius - rightRadius) <= 1;
}

function modelIdsEngagedWithUnit(graph, unitId, enemyUnitId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === unitId && edge.rightUnitId === enemyUnitId) {
      return [edge.leftModelId];
    }
    if (edge.rightUnitId === unitId && edge.leftUnitId === enemyUnitId) {
      return [edge.rightModelId];
    }
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function enemyUnitIdsFor(graph, unitId) {
  return [...new Set(graph.modelEdges.flatMap((edge) => {
    if (edge.leftUnitId === unitId) return [edge.rightUnitId];
    if (edge.rightUnitId === unitId) return [edge.leftUnitId];
    return [];
  }))].sort((left, right) => left.localeCompare(right));
}

function verifyOfficialBindings(state, matchBinding) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("MARINE_MULTI_MODEL_V2_STATE_INVALID");
  }
  const gameplay = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplay);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplay) !== matchBinding.dataSnapshotHash
    || gameplay.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplay.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplay.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplay.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(
      gameplay.dataVersions,
      OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.dataVersions,
    )) {
    fail("MARINE_MULTI_MODEL_V2_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const marine = getOfficialCombatProfileV1(gameplay.combatProfileBundle, MARINE_RECORD_KEY);
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || marine.armourThreshold !== 5
    || marine.evadeThreshold !== 5
    || marine.shield !== 0
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(marine.squadProfile, [
      { tier: 1, minimumModels: 1, maximumModels: 3, supply: 0 },
      { tier: 2, minimumModels: 4, maximumModels: 6, supply: 1 },
      { tier: 3, minimumModels: 7, maximumModels: 9, supply: 2 },
    ])) {
    fail("MARINE_MULTI_MODEL_V2_PROFILE_DRIFT");
  }
  const strike = marine.combatWeapons.find((weapon) => weapon.weaponName === "Strike");
  const bayonet = marine.combatWeapons.find((weapon) => weapon.weaponName === "Bayonet");
  if (marine.combatWeapons.length !== 2
    || strike?.linkedTo !== "-"
    || strike?.rateOfAttack !== 1
    || strike?.hitThreshold !== 5
    || strike?.damage !== 1
    || strike?.sourceTextHash !== STRIKE_SOURCE_TEXT_HASH
    || bayonet?.linkedTo !== "Strike"
    || bayonet?.rateOfAttack !== 2
    || bayonet?.hitThreshold !== 5
    || bayonet?.damage !== 1
    || bayonet?.sourceTextHash !== BAYONET_SOURCE_TEXT_HASH) {
    fail("MARINE_MULTI_MODEL_V2_WEAPON_PROFILE_DRIFT");
  }
  return { gameplay, marine, strike, bayonet };
}

function exactLoadout(piece, role) {
  const selectedUpgradeNames = uniqueSortedStrings(
    piece?.selectedUpgradeNames,
    "MARINE_MULTI_MODEL_V2_SELECTED_UPGRADES_INVALID",
  );
  if (!EXACT_LOADOUTS.some((loadout) => isDeepStrictEqual(loadout, selectedUpgradeNames))
    || PIECE_WEAPON_OVERRIDE_FIELDS.some((field) => piece[field] !== undefined)
    || (piece.models || []).some((model) => (
      MODEL_WEAPON_OVERRIDE_FIELDS.some((field) => model?.[field] !== undefined
    )))
    || piece.specialistLoadout !== undefined
    || piece.specialistLoadoutHash !== undefined) {
    fail("MARINE_MULTI_MODEL_V2_LOADOUT_UNSUPPORTED", role);
  }
  return selectedUpgradeNames;
}

function exactMarineLedger(piece, sideKey, role) {
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || ![6, 9].includes(Number(piece.maxModels))
    || !Number.isSafeInteger(Number(piece.currentModels))
    || Number(piece.currentModels) < 1
    || Number(piece.currentModels) > Number(piece.maxModels)
    || Number(piece.currentSupply) !== supplyAt(Number(piece.currentModels))
    || piece.isOnField !== true
    || piece.isDestroyed === true
    || piece.isInReserves === true
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !Array.isArray(piece.models)
    || piece.models.length !== Number(piece.maxModels)
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])) {
    fail("MARINE_MULTI_MODEL_V2_UNIT_SCOPE_UNSUPPORTED", role);
  }
  const rosterModelIds = uniqueSortedStrings(
    piece.models.map((model) => model?.id),
    "MARINE_MULTI_MODEL_V2_LEDGER_INVALID",
  );
  const activeModelIds = uniqueSortedStrings(
    activeModels(piece).map((model) => model.id),
    "MARINE_MULTI_MODEL_V2_LEDGER_INVALID",
  );
  const destroyedModelIds = uniqueSortedStrings(
    piece.destroyedModelIds || [],
    "MARINE_MULTI_MODEL_V2_LEDGER_INVALID",
  );
  const derivedDestroyedModelIds = piece.models.filter((model) => (
    model?.isDestroyed === true && model?.isOnField === false
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  if (activeModelIds.length !== Number(piece.currentModels)
    || destroyedModelIds.length !== Number(piece.maxModels) - Number(piece.currentModels)
    || !isDeepStrictEqual(destroyedModelIds, derivedDestroyedModelIds)
    || piece.models.some((model) => {
      const active = activeModelIds.includes(model.id);
      const destroyed = destroyedModelIds.includes(model.id);
      return active === destroyed
        || model.baseShape !== "round"
        || milli(model.baseWidthInches, "MARINE_MULTI_MODEL_V2_BASE_INVALID")
          !== MARINE_BASE_MILLI_INCHES
        || milli(model.baseDepthInches, "MARINE_MULTI_MODEL_V2_BASE_INVALID")
          !== MARINE_BASE_MILLI_INCHES
        || model.elevation !== "ground"
        || !isDeepStrictEqual(model.supportTerrainIds || [], [])
        || !isDeepStrictEqual(model.adjacentAccessPointIds || [], []);
    })) {
    fail("MARINE_MULTI_MODEL_V2_LEDGER_INVALID", role);
  }
  for (const model of activeModels(piece)) {
    milli(model.xInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID");
    milli(model.yInches, "MARINE_MULTI_MODEL_V2_GEOMETRY_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_marine_model_ledger_v2",
    pieceId: piece.id,
    maxModels: Number(piece.maxModels),
    currentModels: Number(piece.currentModels),
    currentSupply: Number(piece.currentSupply),
    rosterModelIds,
    activeModelIds,
    destroyedModelIds,
  };
  return { ...body, modelLedgerHash: hashStarcraftTmgContract(body) };
}

function exactStimpackMaterial(state, piece, selectedUpgradeNames) {
  const stimpacked = selectedUpgradeNames.includes("Stimpack");
  const statuses = Array.isArray(piece.statuses) ? piece.statuses : [];
  const markers = Array.isArray(state.board.effectMarkers) ? state.board.effectMarkers : [];
  if (!stimpacked) {
    if (statuses.length !== 0 || markers.length !== 0 || Number(piece.damageMarker || 0) !== 0) {
      fail("MARINE_MULTI_MODEL_V2_ORDINARY_STATUS_INVALID");
    }
    return { stimpacked: false, status: null, marker: null, historyEntry: null };
  }
  if (statuses.length !== 1
    || statuses[0]?.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA
    || markers.length !== 1
    || markers[0]?.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA
    || Number(piece.damageMarker || 0) !== 2) {
    fail("MARINE_MULTI_MODEL_V2_STIMPACK_STATUS_REQUIRED");
  }
  const status = verifyOfficialStimpackStatusV1(statuses[0]);
  verifyOfficialStimpackMarkerV1(markers[0], status);
  const matches = (state.activeAbilityUseHistory || []).filter((entry) => (
    entry?.pieceId === piece.id
      && entry?.abilityId === "stimpack"
      && Number(entry?.round) === Number(state.round)
  ));
  if (status.targetPieceId !== piece.id
    || matches.length !== 1
    || matches[0].statusEffectHash !== status.statusEffectHash
    || matches[0].markerHash !== markers[0].markerHash
    || matches[0].abilityUseHash !== hashStarcraftTmgContract(
      without(matches[0], ["abilityUseHash"]),
    )) {
    fail("MARINE_MULTI_MODEL_V2_STIMPACK_BINDING_INVALID");
  }
  return { stimpacked: true, status, marker: markers[0], historyEntry: matches[0] };
}

function deriveRanks(attacker, target, graph, attackerLedger) {
  if (!isDeepStrictEqual(enemyUnitIdsFor(graph, attacker.id), [target.id])) {
    fail("MARINE_MULTI_MODEL_V2_SINGLE_ATTACK_TARGET_REQUIRED");
  }
  const fightingModelIds = modelIdsEngagedWithUnit(graph, attacker.id, target.id);
  const fighting = new Set(fightingModelIds);
  const active = activeModels(attacker);
  const supportingModelIds = active.filter((model) => (
    !fighting.has(model.id)
      && active.some((friend) => fighting.has(friend.id) && basesTouch(model, friend))
  )).map((model) => model.id).sort((left, right) => left.localeCompare(right));
  if (fightingModelIds.length === 0
    || fightingModelIds.some((id) => !attackerLedger.activeModelIds.includes(id))
    || supportingModelIds.some((id) => !attackerLedger.activeModelIds.includes(id))) {
    fail("MARINE_MULTI_MODEL_V2_RANKS_INVALID");
  }
  return { fightingModelIds, supportingModelIds };
}

function plan(input = {}) {
  const state = input.state;
  const sideKey = String(input.sideKey || state?.activeSideKey || "").trim();
  if (!object(state)
    || state.phase !== "combat"
    || state.activeSideKey !== sideKey
    || !["player1", "player2"].includes(sideKey)
    || state.pendingAction !== undefined && state.pendingAction !== null
    || (state.board?.terrain || []).length !== 0
    || (state.board?.accessPoints || []).length !== 0
    || state.pieces?.length !== 2) {
    fail("MARINE_MULTI_MODEL_V2_COMBAT_SCOPE_UNSUPPORTED");
  }
  const bindings = verifyOfficialBindings(state, input.matchBinding);
  const attacker = state.pieces.find((piece) => piece.id === input.attackerPieceId);
  const target = state.pieces.find((piece) => piece.id === input.targetPieceId);
  const defenderSideKey = sideKey === "player1" ? "player2" : "player1";
  if (!attacker || !target || attacker.id === target.id
    || attacker.activatedPhases?.combat === true
    || state.players?.[sideKey]?.passedPhases?.combat === true) {
    fail("MARINE_MULTI_MODEL_V2_ATTACKER_OR_TARGET_INVALID");
  }
  const attackerLedger = exactMarineLedger(attacker, sideKey, "attacker");
  const targetLedger = exactMarineLedger(target, defenderSideKey, "target");
  const selectedUpgradeNames = exactLoadout(attacker, "attacker");
  if (!isDeepStrictEqual(exactLoadout(target, "target"), [])
    || !isDeepStrictEqual(target.statuses || [], [])
    || Number(target.damageMarker || 0) < 0
    || Number(target.damageMarker || 0) >= bindings.marine.hitPoints) {
    fail("MARINE_MULTI_MODEL_V2_TARGET_EFFECTS_UNSUPPORTED");
  }
  const stimpack = exactStimpackMaterial(state, attacker, selectedUpgradeNames);
  const graph = deriveOfficialEngagementGraphV2(state);
  if (!isDeepStrictEqual(enemyUnitIdsFor(graph, target.id), [attacker.id])) {
    fail("MARINE_MULTI_MODEL_V2_EXACT_PAIR_ENGAGEMENT_REQUIRED");
  }
  const ranks = deriveRanks(attacker, target, graph, attackerLedger);
  const bayonetSelected = selectedUpgradeNames.includes("Bayonet");
  const weapon = bayonetSelected ? bindings.bayonet : bindings.strike;
  const eligibleModelIds = [...ranks.fightingModelIds, ...ranks.supportingModelIds];
  const attackDice = eligibleModelIds.length * weapon.rateOfAttack;
  if (!Number.isSafeInteger(attackDice) || attackDice < 1) {
    fail("MARINE_MULTI_MODEL_V2_ATTACK_POOL_INVALID");
  }
  const loadoutBody = {
    schema: "starcraft_tmg_official_marine_unit_wide_close_combat_loadout_v2",
    pieceId: attacker.id,
    selectedUpgradeNames,
    weaponName: weapon.weaponName,
    replacedWeaponName: bayonetSelected ? "Strike" : null,
    appliesToRosterModelIds: [...attackerLedger.rosterModelIds],
    activeCarrierModelIds: [...attackerLedger.activeModelIds],
    perModelCarrierSelectionAllowed: false,
    specialistSemanticsAppliedToBayonet: false,
    part9DocumentHash:
      OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING.part9DocumentHash,
  };
  const unitWideLoadout = {
    ...loadoutBody,
    unitWideLoadoutHash: hashStarcraftTmgContract(loadoutBody),
  };
  const body = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_V2_SCHEMA,
    denominatorId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID,
    denominatorVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION,
    sourceBinding: clone(OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING),
    sideKey,
    attackerPieceId: attacker.id,
    targetPieceId: target.id,
    attackerLedger,
    targetLedger,
    targetHitPoints: bindings.marine.hitPoints,
    targetPriorDamageMarker: Number(target.damageMarker || 0),
    unitWideLoadout,
    weapon: clone(weapon),
    fightingModelIds: [...ranks.fightingModelIds],
    supportingModelIds: [...ranks.supportingModelIds],
    eligibleModelIds,
    eligibleModelCount: eligibleModelIds.length,
    rateOfAttack: weapon.rateOfAttack,
    attackDice,
    engagementGraphHash: graph.graphHash,
    stimpacked: stimpack.stimpacked,
    statusEffectHash: stimpack.status?.statusEffectHash || null,
    markerHash: stimpack.marker?.markerHash || null,
    abilityUseHash: stimpack.historyEntry?.abilityUseHash || null,
    precisionValue: stimpack.stimpacked ? 3 : 0,
    chance: {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: attackDice * 2,
      layout: { hit: attackDice, armour: attackDice, evade: 0, surge: 0 },
    },
    casualtyPolicy: "full_multi_model_target_choice_domain",
    targetInteractionScope: "exact_two_marine_units_single_enemy_unit_engagement",
    staleDomainPolicy:
      "any_attacker_or_target_ledger_geometry_rank_loadout_status_marker_history_or_damage_change_rederive",
    rulesTruth:
      "official_current_marine_multi_model_attacker_and_target_close_combat_denominator",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(input = {}) {
  const observed = input.plan;
  if (!object(observed)
    || observed.schema !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_V2_SCHEMA
    || observed.denominatorId !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID
    || observed.denominatorVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION
    || observed.planHash !== hashStarcraftTmgContract(without(observed, ["planHash"]))) {
    fail("MARINE_MULTI_MODEL_V2_PLAN_INVALID");
  }
  const expected = plan({
    state: input.state,
    sideKey: observed.sideKey,
    attackerPieceId: observed.attackerPieceId,
    targetPieceId: observed.targetPieceId,
    matchBinding: input.matchBinding,
  });
  if (!isDeepStrictEqual(observed, expected)) fail("MARINE_MULTI_MODEL_V2_PLAN_STALE");
  return true;
}

const descriptorBody = {
  schema: "starcraft_tmg_official_marine_multi_model_close_combat_denominator_descriptor_v2",
  denominatorId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_ID,
  denominatorVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_DENOMINATOR_V2_VERSION,
  initialCompositionOptions: [6, 9],
  supportedCurrentModelCounts: "1..chosen_initial_composition_for_both_sides",
  supplyProfile: [
    { minimumModels: 1, maximumModels: 3, supply: 0 },
    { minimumModels: 4, maximumModels: 6, supply: 1 },
    { minimumModels: 7, maximumModels: 9, supply: 2 },
  ],
  unitWideCloseCombatLoadouts: ["Strike", "Bayonet_replaces_Strike"],
  mixedStrikeBayonetCarriersAllowed: false,
  attackPoolFormula: "(fighting_rank_count + supporting_rank_count) * unit_wide_weapon_roa",
  supportedTargetScope: "full_current_six_or_nine_roster_live_subset",
  targetInteractionScope: "exact_two_marine_units_single_enemy_unit_engagement",
  sourceBinding: clone(OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_SOURCE_BINDING),
  repositoryFallbackAllowed: false,
  rulesTruth: "official_current_multi_model_close_combat_target_denominator",
  trainingTruth: false,
};

export function createOfficialMarineMultiModelCloseCombatDenominatorV2() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      denominatorHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan,
    verifyPlan,
  });
}
