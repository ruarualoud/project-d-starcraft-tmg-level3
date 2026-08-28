import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV4 } from
  "./official-attack-resolution-kernel-v4.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialReplacementWeaponLoadoutV1,
  OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "./official-weapon-replacement-loadout-v1.mjs";
import {
  applyOfficialRangedAttackV4,
  enumerateOfficialRangedAttackActionsV4,
  OFFICIAL_RANGED_ATTACK_V4_ACTION_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v4.mjs";

export const OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID = "authority.ranged-attack-v5";
export const OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION = "5.0.0";
export const OFFICIAL_RANGED_ATTACK_V5_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE = OFFICIAL_RANGED_ATTACK_V4_ACTION_TYPE;

export const OFFICIAL_RANGED_ATTACK_V5_NEW_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_REPLACEMENT_WEAPON_LOADOUT_ATOM_IDS,
    "rule-atom:singleton:core-11-burst-fire-close-range-roa:88c07e30f0f9",
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V5_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_RANGED_ATTACK_V4_DEPENDENCY_ATOM_IDS,
]);

export const OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V5_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V5_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V5_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialAttackResolutionKernelV4();
const RAYNOR_RECORD_KEY = "army_units:jim_raynor";
const MARINE_RECORD_KEY = "army_units:marine";
const C14_WEAPON_NAME = "C-14 rifle";
const ATTACKER_SCOPE = Object.freeze({
  recordKey: RAYNOR_RECORD_KEY,
  weaponName: C14_WEAPON_NAME,
  profileKey: "army_units:jim_raynor::assault::C-14 rifle",
  profileHash: "a5f5beda031eacdbaeba5949b4dd03cff662432a1acfb35b908bab56165e3ac3",
  currentModels: 1,
  currentSupply: 1,
  baseDiameterMilliInches: 1575,
  printedBaseDiameter: "Ø 40MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Jim-Raynor:Ø40MM:C-14-Rifle",
});
const TARGET_SCOPE = Object.freeze({
  recordKey: MARINE_RECORD_KEY,
  currentModels: 1,
  currentSupply: 0,
  baseDiameterMilliInches: 1260,
  printedBaseDiameter: "Ø 32MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marine:Ø32MM",
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isDestroyed !== true && model?.isOnField !== false
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("RANGED_ATTACK_V5_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_V5_STATE_INVALID");
  }
}

function verifyProfileBinding(state, matchBinding) {
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  const catalogue = gameplayBundle.attackProfileCatalogue;
  verifyOfficialAttackProfileCatalogueV1(catalogue);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || catalogue.sourceSnapshotHash !== gameplayBundle.sourceSnapshotHash
    || catalogue.normalizedDatasetHash !== gameplayBundle.normalizedDatasetHash) {
    fail("RANGED_ATTACK_V5_DATA_SNAPSHOT_MISMATCH");
  }
  return { catalogue, combatBundle: gameplayBundle.combatProfileBundle };
}

function exactScopedModel(piece, combatProfile, scope, role) {
  const models = activeModels(piece);
  if (piece.sourceRecordHash !== combatProfile.sourceRecordHash
    || Number(piece.currentModels) !== scope.currentModels
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !combatProfile.combatTags.includes("ground")
    || (piece.statuses || []).length !== 0
    || (piece.combatEffects || []).length !== 0
    || (piece.assaultEffects || []).length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_V5_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_V5_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_V5_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_V5_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_V5_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_V5_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_V5_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function requireExactUnengagedPair(state, graph, piece, target) {
  const active = state.pieces.filter(activePiece);
  if (active.length !== 2
    || graph.modelEdges.length !== 0
    || graph.engagedUnitIds.includes(piece.id)
    || graph.engagedUnitIds.includes(target.id)) {
    fail("RANGED_ATTACK_V5_UNENGAGED_PAIR_REQUIRED");
  }
}

function burstFireContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_V5_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_V5_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_V5_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_V5_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_V5_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_V5_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_V5_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (piece.disengageAssaultRestriction !== undefined
    && piece.disengageAssaultRestriction !== null) {
    fail("RANGED_ATTACK_V5_POST_DISENGAGE_SCOPE_UNSUPPORTED");
  }
  if (piece.officialUnitRecordKey !== RAYNOR_RECORD_KEY
    || target.officialUnitRecordKey !== MARINE_RECORD_KEY) {
    fail("RANGED_ATTACK_V5_UNIT_SCOPE_UNSUPPORTED");
  }
  if (!isDeepStrictEqual(piece.selectedUpgradeNames, [C14_WEAPON_NAME])
    || !isDeepStrictEqual(target.selectedUpgradeNames, [])) {
    fail("RANGED_ATTACK_V5_WEAPON_LOADOUT_SCOPE_UNSUPPORTED");
  }
  const attackerCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    piece.officialUnitRecordKey,
  );
  const targetCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    target.officialUnitRecordKey,
  );
  const attackerModel = exactScopedModel(
    piece,
    attackerCombatProfile,
    ATTACKER_SCOPE,
    "attacker",
  );
  const targetModel = exactScopedModel(
    target,
    targetCombatProfile,
    TARGET_SCOPE,
    "target",
  );
  requireExactUnengagedPair(state, graph, piece, target);
  const damageMarker = Number(target.damageMarker || 0);
  if (targetCombatProfile.shield !== 0
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetCombatProfile.hitPoints) {
    fail("RANGED_ATTACK_V5_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: RAYNOR_RECORD_KEY,
    phase: "assault",
    weaponName: ATTACKER_SCOPE.weaponName,
  });
  if (attackProfile.profileKey !== ATTACKER_SCOPE.profileKey
    || attackProfile.profileHash !== ATTACKER_SCOPE.profileHash
    || attackProfile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash
    || attackProfile.rateOfAttack !== 6
    || attackProfile.range.normalRangeInches !== 12
    || attackProfile.hitThreshold !== 3
    || attackProfile.damage !== 1) {
    fail("RANGED_ATTACK_V5_PROFILE_SOURCE_MISMATCH");
  }
  const burstFire = attackProfile.effects.find((effect) => (
    effect.effectAtomId === "attack-effect:burst-fire-v1"
  ));
  if (!burstFire
    || burstFire.parameters?.maximumDistanceInches !== 8
    || burstFire.parameters?.additionalRateOfAttack !== 3) {
    fail("RANGED_ATTACK_V5_BURST_FIRE_PROFILE_MISMATCH");
  }
  const weaponLoadout = createOfficialReplacementWeaponLoadoutV1({
    catalogue: bindings.catalogue,
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    selectedWeaponUpgradeNames: piece.selectedUpgradeNames,
    modelIds: [attackerModel.id],
  });
  verifyOfficialReplacementWeaponLoadoutV1({
    catalogue: bindings.catalogue,
    receipt: weaponLoadout,
  });
  if (!weaponLoadout.availableProfileKeys.includes(attackProfile.profileKey)
    || weaponLoadout.availableWeaponNames.includes("Commando Rifle")) {
    fail("RANGED_ATTACK_V5_REPLACEMENT_WEAPON_INACTIVE");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    ATTACKER_SCOPE,
    targetModel,
    TARGET_SCOPE,
  );
  const plan = KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      evadeThreshold: targetCombatProfile.evadeThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligibility: { eligible: false, reason: "none" },
  });
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_unobstructed_line_of_sight_receipt_v1",
    attackerModelId: attackerModel.id,
    targetModelId: targetModel.id,
    projection: "top_down",
    trace: "base_to_base",
    terrainCount: 0,
    mutual: true,
    visible: true,
    trainingTruth: false,
  };
  return {
    attackerCombatProfile,
    targetCombatProfile,
    attackerModel,
    targetModel,
    attackProfile,
    burstFire,
    weaponLoadout,
    plan,
    baseGapMilliInches: baseGap,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function actionFromCandidate(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...action
  } = candidate;
  return action;
}

function v5HistoricalAction(candidate) {
  return {
    ...candidate,
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V5_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
    details: {
      ...candidate.details,
      executorPath: "historical_v4_delegate",
      delegatedExecutorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function canonicalBurstFireAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.attackProfile.weaponName,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V5_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
  };
}

function disabledContext(bindings) {
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: RAYNOR_RECORD_KEY,
    phase: "assault",
    weaponName: ATTACKER_SCOPE.weaponName,
  });
  const targetProfile = getOfficialCombatProfileV1(bindings.combatBundle, MARINE_RECORD_KEY);
  return {
    attackProfile,
    weaponLoadout: null,
    plan: KERNEL.plan({
      profile: attackProfile,
      target: {
        armourThreshold: targetProfile.armourThreshold,
        evadeThreshold: targetProfile.evadeThreshold,
        combatTags: targetProfile.combatTags,
      },
      distanceInches: 0,
      evadeEligibility: { eligible: false, reason: "none" },
    }),
  };
}

function enumerateBurstFire(state, options = {}) {
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  let bindings;
  let graph;
  try {
    bindings = verifyProfileBinding(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch {
    return [];
  }
  const rows = [];
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && activePiece(entry)
      && entry.officialUnitRecordKey === RAYNOR_RECORD_KEY
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = burstFireContext(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context) {
        if (options.includeDisabled !== true) continue;
        try {
          context = disabledContext(bindings);
        } catch {
          continue;
        }
      }
      rows.push({
        ...canonicalBurstFireAction(sideKey, piece, target, context),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 210,
        details: {
          sourceRule:
            "official_core_5_2_8_7_3_8_7_4_9_1_7_11_burst_fire_and_quick_reference_12_4",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          weaponLoadoutHash: context.weaponLoadout?.loadoutHash || "",
          attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
          attackPlanHash: context.plan.planHash,
          effectAtomIds: [...context.plan.effectAtomIds],
          engagementGraphHash: graph.graphHash,
          lineOfSightReceiptHash: context.lineOfSightReceipt?.receiptHash || "",
          distanceInches: context.plan.distanceInches,
          rangeBand: context.plan.rangeBand,
          printedRateOfAttack: context.plan.printedRateOfAttack,
          effectiveRateOfAttack: context.plan.effectiveRateOfAttack,
          burstFireApplied: context.plan.burstFire?.applied === true,
          burstFireMaximumDistanceInches:
            context.plan.burstFire?.maximumDistanceInches || null,
          burstFireAdditionalRateOfAttack:
            context.plan.burstFire?.additionalRateOfAttack || 0,
          executorPath: "burst_fire_v5",
          supportedScope:
            "single_model_raynor_selected_c14_replacement_vs_single_model_unmodified_marine_unengaged_no_terrain_no_shield_within_normal_range",
          rulesTruth:
            "official_current_profile_bound_atomic_weapon_replacement_and_burst_fire_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows;
}

export function enumerateOfficialRangedAttackActionsV5(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_V5_SIDE_REQUIRED");
  const historical = enumerateOfficialRangedAttackActionsV4(state, options)
    .map(v5HistoricalAction);
  return [...historical, ...enumerateBurstFire(state, options)].sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
}

function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey
      && activePiece(piece)
      && piece.activatedPhases?.assault !== true
  ));
}

function delegateHistoricalV4(stateInput, expectedAction, options) {
  const legacyCandidate = enumerateOfficialRangedAttackActionsV4(stateInput, {
    sideKey: expectedAction.sideKey,
    matchBinding: options.matchBinding,
  }).find((candidate) => (
    candidate.pieceId === expectedAction.pieceId
      && candidate.targetId === expectedAction.targetId
      && candidate.weaponName === expectedAction.weaponName
  ));
  if (!legacyCandidate) fail("RANGED_ATTACK_V5_ACTION_STALE");
  const applied = applyOfficialRangedAttackV4(
    stateInput,
    actionFromCandidate(legacyCandidate),
    options,
  );
  const state = applied.state;
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v5",
    executorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
    state,
    action: expectedAction,
    delegatedExecutor: {
      executorId: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_ID,
      executorVersion: OFFICIAL_RANGED_ATTACK_V4_EXECUTOR_VERSION,
    },
    rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset_v5",
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV5(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_V5_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV5(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_V5_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_V5_ACTION_MISMATCH");
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  if (pieceBefore?.officialUnitRecordKey !== RAYNOR_RECORD_KEY) {
    return delegateHistoricalV4(stateInput, expectedAction, options);
  }

  const bindings = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = burstFireContext(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const resolution = KERNEL.resolve(context.plan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + resolution.stages.damage.totalDamage;
  const casualty = totalDamage >= context.targetCombatProfile.hitPoints;
  if (casualty) {
    targetModel.isDestroyed = true;
    targetModel.isOnField = false;
    target.currentModels = 0;
    target.currentSupply = 0;
    target.damageMarker = 0;
    target.isDestroyed = true;
    target.isOnField = false;
  } else {
    target.damageMarker = totalDamage;
  }
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
  const opponentSideKey = otherSide(actionInput.sideKey);
  if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
    state.activeSideKey = opponentSideKey;
  } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
    state.activeSideKey = actionInput.sideKey;
  }
  const stages = resolution.stages;
  const rangedEvent = {
    type: OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE,
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.attackProfile.weaponName,
    attackProfileKey: context.attackProfile.profileKey,
    attackProfileHash: context.attackProfile.profileHash,
    officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
    weaponLoadout: clone(context.weaponLoadout),
    attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    effectAtomIds: [...context.plan.effectAtomIds],
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: ATTACKER_SCOPE.printedBaseDiameter,
        sourceLocator: ATTACKER_SCOPE.sourceLocator,
      },
      target: {
        printedBaseDiameter: TARGET_SCOPE.printedBaseDiameter,
        sourceLocator: TARGET_SCOPE.sourceLocator,
      },
    },
    engagementGraphHash: graph.graphHash,
    engagedTargeting: {
      required: false,
      attackerEngaged: false,
      targetEngaged: false,
    },
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: context.plan.distanceInches,
    rangeBand: context.plan.rangeBand,
    burstFire: {
      effectAtomId: "attack-effect:burst-fire-v1",
      applied: stages.effects.burstFireApplied,
      maximumDistanceInches: stages.effects.burstFireMaximumDistanceInches,
      additionalRateOfAttack: stages.effects.burstFireAdditionalRateOfAttack,
      printedRateOfAttack: stages.effects.printedRateOfAttack,
      effectiveRateOfAttack: stages.effects.effectiveRateOfAttack,
    },
    attackPool: clone(stages.hit),
    surgePool: {
      dice: context.plan.chance.layout.surge,
      rolls: [...stages.effects.surgeRolls],
      results: [...stages.effects.surgeResults],
      matched: stages.effects.surgeMatched,
      bypassedArmourHits: stages.effects.bypassedArmourHits,
    },
    armourPool: clone(stages.armour),
    evadePool: clone(stages.evade),
    damagePool: {
      dice: stages.damage.damagePoolDice,
      damagePerDie: stages.damage.damagePerDie,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    stageOrder: ["declaration", "hit", "effects", "armour", "evade", "damage"],
    trainingTruth: false,
  };
  const events = [rangedEvent];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expectedAction),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v5",
    executorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth:
      "official_current_profile_bound_atomic_weapon_replacement_and_burst_fire_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_RANGED_ATTACK_V5_HISTORICAL_ACTION_ATOM_IDS =
  OFFICIAL_RANGED_ATTACK_V4_ACTION_ATOM_IDS;
