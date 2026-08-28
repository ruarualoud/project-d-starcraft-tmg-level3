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
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialReplacementWeaponLoadoutV1,
  verifyOfficialReplacementWeaponLoadoutV1,
} from "./official-weapon-replacement-loadout-v1.mjs";
import {
  applyOfficialRangedAttackV5,
  enumerateOfficialRangedAttackActionsV5,
  OFFICIAL_RANGED_ATTACK_V5_ACTION_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE,
  OFFICIAL_RANGED_ATTACK_V5_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
  OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
} from "./official-ranged-attack-executor-v5.mjs";

export const OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID = "authority.ranged-attack-v6";
export const OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION = "6.0.0";
export const OFFICIAL_RANGED_ATTACK_V6_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE = OFFICIAL_RANGED_ATTACK_V5_ACTION_TYPE;

export const OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-bulky-engaged-ranged-prohibition:2efe88629073",
]);

export const OFFICIAL_RANGED_ATTACK_V6_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_RANGED_ATTACK_V5_DEPENDENCY_ATOM_IDS,
]);

export const OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V6_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V6_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialAttackResolutionKernelV5();
const RAYNOR_RECORD_KEY = "army_units:jim_raynor";
const MARINE_RECORD_KEY = "army_units:marine";
const COMMANDO_WEAPON_NAME = "Commando Rifle";
const ATTACKER_SCOPE = Object.freeze({
  recordKey: RAYNOR_RECORD_KEY,
  weaponName: COMMANDO_WEAPON_NAME,
  profileKey: "army_units:jim_raynor::assault::Commando Rifle",
  profileHash: "0fa6eb192876d3cda244d90850df04fea4c5c1875a1ae49bf04523713ee0550e",
  currentModels: 1,
  currentSupply: 1,
  baseDiameterMilliInches: 1575,
  printedBaseDiameter: "Ø 40MM",
  sourceLocator:
    "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Jim-Raynor:Ø40MM:Commando-Rifle",
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
  fail("RANGED_ATTACK_V6_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_V6_STATE_INVALID");
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
    fail("RANGED_ATTACK_V6_DATA_SNAPSHOT_MISMATCH");
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
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_V6_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_V6_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_V6_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_V6_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_V6_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_V6_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function requireExactPair(state, piece, target) {
  const active = state.pieces.filter(activePiece);
  if (active.length !== 2 || !active.includes(piece) || !active.includes(target)) {
    fail("RANGED_ATTACK_V6_EXACT_PAIR_REQUIRED");
  }
}

function commandoContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_V6_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_V6_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_V6_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_V6_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_V6_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_V6_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_V6_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (piece.disengageAssaultRestriction !== undefined
    && piece.disengageAssaultRestriction !== null) {
    fail("RANGED_ATTACK_V6_POST_DISENGAGE_SCOPE_UNSUPPORTED");
  }
  if (piece.officialUnitRecordKey !== RAYNOR_RECORD_KEY
    || target.officialUnitRecordKey !== MARINE_RECORD_KEY) {
    fail("RANGED_ATTACK_V6_UNIT_SCOPE_UNSUPPORTED");
  }
  if (!isDeepStrictEqual(piece.selectedUpgradeNames, [])
    || !isDeepStrictEqual(target.selectedUpgradeNames, [])) {
    fail("RANGED_ATTACK_V6_WEAPON_LOADOUT_SCOPE_UNSUPPORTED");
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
  requireExactPair(state, piece, target);
  const damageMarker = Number(target.damageMarker || 0);
  if (targetCombatProfile.shield !== 0
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetCombatProfile.hitPoints) {
    fail("RANGED_ATTACK_V6_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: RAYNOR_RECORD_KEY,
    phase: "assault",
    weaponName: ATTACKER_SCOPE.weaponName,
  });
  if (attackProfile.profileKey !== ATTACKER_SCOPE.profileKey
    || attackProfile.profileHash !== ATTACKER_SCOPE.profileHash
    || attackProfile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash
    || attackProfile.rateOfAttack !== 3
    || attackProfile.range.normalRangeInches !== 18
    || attackProfile.hitThreshold !== 3
    || attackProfile.damage !== 1
    || !isDeepStrictEqual(attackProfile.effects.map((effect) => effect.effectAtomId), [
      "attack-effect:surge-armour-bypass-v1",
      "attack-effect:bulky-v1",
      "attack-effect:pierce-v1",
    ])) {
    fail("RANGED_ATTACK_V6_PROFILE_SOURCE_MISMATCH");
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
    || !weaponLoadout.availableWeaponNames.includes(COMMANDO_WEAPON_NAME)
    || weaponLoadout.availableWeaponNames.includes("C-14 rifle")) {
    fail("RANGED_ATTACK_V6_DEFAULT_WEAPON_INACTIVE");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    ATTACKER_SCOPE,
    targetModel,
    TARGET_SCOPE,
  );
  const attackerEngaged = graph.engagedUnitIds.includes(piece.id);
  const plan = KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      evadeThreshold: targetCombatProfile.evadeThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligibility: { eligible: false, reason: "none" },
    attackerEngagement: {
      engaged: attackerEngaged,
      source: "official_engagement_graph_v2",
      graphHash: graph.graphHash,
    },
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
    weaponLoadout,
    plan,
    attackerEngaged,
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

function v6HistoricalAction(candidate) {
  return {
    ...candidate,
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
    details: {
      ...candidate.details,
      executorPath: "historical_v5_delegate",
      delegatedExecutorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
      delegatedExecutorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
      trainingTruth: false,
    },
  };
}

function canonicalCommandoAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: COMMANDO_WEAPON_NAME,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
  };
}

function disabledCommandoAction(sideKey, piece, target) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: COMMANDO_WEAPON_NAME,
    chance: null,
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V6_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
  };
}

function enumerateCommando(state, options = {}) {
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
      && isDeepStrictEqual(entry.selectedUpgradeNames, [])
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = commandoContext(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context && options.includeDisabled !== true) continue;
      rows.push({
        ...(context
          ? canonicalCommandoAction(sideKey, piece, target, context)
          : disabledCommandoAction(sideKey, piece, target)),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 205,
        details: {
          sourceRule: "official_core_5_2_8_7_3_8_7_4_11_bulky_and_quick_reference_12_4",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          weaponLoadoutHash: context?.weaponLoadout.loadoutHash || "",
          attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
          attackPlanHash: context?.plan.planHash || "",
          effectAtomIds: context ? [...context.plan.effectAtomIds] : [],
          engagementGraphHash: graph.graphHash,
          lineOfSightReceiptHash: context?.lineOfSightReceipt.receiptHash || "",
          distanceInches: context?.plan.distanceInches ?? null,
          rangeBand: context?.plan.rangeBand || "",
          printedRateOfAttack: context?.plan.printedRateOfAttack ?? 3,
          effectiveRateOfAttack: context?.plan.effectiveRateOfAttack ?? 3,
          attackerEngaged: graph.engagedUnitIds.includes(piece.id),
          bulkyEngagedProhibitionChecked: true,
          executorPath: "default_commando_bulky_v6",
          supportedScope:
            "single_model_raynor_empty_upgrade_default_commando_vs_single_model_unmodified_marine_no_terrain_no_shield",
          rulesTruth:
            "official_current_profile_bound_atomic_default_weapon_and_bulky_subset",
          trainingTruth: false,
        },
      });
    }
  }
  return rows;
}

export function enumerateOfficialRangedAttackActionsV6(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_V6_SIDE_REQUIRED");
  const historical = enumerateOfficialRangedAttackActionsV5(state, options)
    .map(v6HistoricalAction);
  return [...historical, ...enumerateCommando(state, options)].sort((left, right) => (
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

function delegateHistoricalV5(stateInput, expectedAction, options) {
  const legacyCandidate = enumerateOfficialRangedAttackActionsV5(stateInput, {
    sideKey: expectedAction.sideKey,
    matchBinding: options.matchBinding,
  }).find((candidate) => (
    candidate.pieceId === expectedAction.pieceId
      && candidate.targetId === expectedAction.targetId
      && candidate.weaponName === expectedAction.weaponName
  ));
  if (!legacyCandidate) fail("RANGED_ATTACK_V6_ACTION_STALE");
  const applied = applyOfficialRangedAttackV5(
    stateInput,
    actionFromCandidate(legacyCandidate),
    options,
  );
  const state = applied.state;
  const lastLog = state.log?.at(-1);
  if (lastLog) lastLog.action = clone(expectedAction);
  return {
    ...applied,
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v6",
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
    state,
    action: expectedAction,
    delegatedExecutor: {
      executorId: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_ID,
      executorVersion: OFFICIAL_RANGED_ATTACK_V5_EXECUTOR_VERSION,
    },
    rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset_v6",
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV6(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_V6_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV6(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_V6_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_V6_ACTION_MISMATCH");
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  if (actionInput.weaponName !== COMMANDO_WEAPON_NAME
    || !isDeepStrictEqual(pieceBefore?.selectedUpgradeNames, [])) {
    return delegateHistoricalV5(stateInput, expectedAction, options);
  }

  const bindings = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = commandoContext(
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
    type: OFFICIAL_RANGED_ATTACK_V6_ACTION_TYPE,
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
    bulky: {
      effectAtomId: "attack-effect:bulky-v1",
      attackerEngaged: context.plan.bulky.attackerEngaged,
      prohibitionCheckedBeforeChance: context.plan.bulky.prohibitionCheckedBeforeChance,
    },
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: context.plan.distanceInches,
    rangeBand: context.plan.rangeBand,
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
    pierce: {
      effectAtomId: "attack-effect:pierce-v1",
      matched: stages.effects.pierceMatched,
      targetTag: stages.effects.pierceTargetTag,
      baseDamagePerDie: stages.damage.baseDamagePerDie,
      effectiveDamagePerDie: stages.damage.damagePerDie,
    },
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
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v6",
    executorId: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V6_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth: "official_current_profile_bound_atomic_default_commando_and_bulky_subset",
    trainingTruth: false,
  };
}

export const OFFICIAL_RANGED_ATTACK_V6_HISTORICAL_ACTION_ATOM_IDS =
  OFFICIAL_RANGED_ATTACK_V5_ACTION_ATOM_IDS;
