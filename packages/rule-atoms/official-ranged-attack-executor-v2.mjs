import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import {
  getOfficialAttackProfileV1,
  verifyOfficialAttackProfileCatalogueV1,
} from "../source-data/official-attack-profile-catalogue-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV1 } from
  "./official-attack-resolution-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import {
  OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS,
  OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
} from "./official-ranged-attack-executor-v1.mjs";

export const OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID = "authority.ranged-attack-v2";
export const OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION = "2.0.0";
export const OFFICIAL_RANGED_ATTACK_V2_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE = "ranged_attack";

export const OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-long-range-maximum:c5fc24657625",
  "rule-atom:singleton:core-11-long-range-penalty:bfcf5fad2012",
  "rule-atom:singleton:core-11-long-range-profile-band:30550cff03b1",
  "rule-atom:singleton:core-5-1-weapon-keyword:7ec891919ba1",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS = Object.freeze([
  ...OFFICIAL_RANGED_ATTACK_DEPENDENCY_ATOM_IDS,
]);

export const OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_NEW_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V2_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V2_DEPENDENCY_ATOM_IDS,
    ...OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const KERNEL = createOfficialAttackResolutionKernelV1();
const MARINE_RECORD_KEY = "army_units:marine";
const SUPPORTED_ATTACKERS = Object.freeze({
  "army_units:marine": Object.freeze({
    weaponName: "C-14 rifle",
    currentModels: 1,
    currentSupply: 0,
    baseDiameterMilliInches: 1260,
    printedBaseDiameter: "Ø 32MM",
    sourceLocator:
      "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Marine:Ø32MM",
  }),
  "army_units:goliath": Object.freeze({
    weaponName: "Autocannon",
    currentModels: 1,
    currentSupply: 2,
    baseDiameterMilliInches: 3150,
    printedBaseDiameter: "Ø 80MM",
    sourceLocator:
      "official-p2p/StarCraft-Terran-P2P-Card-Sheets-A4_EN.txt#Goliath:Ø80MM",
  }),
});
const SUPPORTED_TARGETS = Object.freeze({
  "army_units:marine": SUPPORTED_ATTACKERS["army_units:marine"],
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
  fail("RANGED_ATTACK_V2_SIDE_REQUIRED");
}

function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function validateState(state) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("RANGED_ATTACK_V2_STATE_INVALID");
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
    fail("RANGED_ATTACK_V2_DATA_SNAPSHOT_MISMATCH");
  }
  return {
    gameplayBundle,
    catalogue,
    combatBundle: gameplayBundle.combatProfileBundle,
  };
}

function validateRestriction(state, piece) {
  const restriction = piece.disengageAssaultRestriction;
  if (restriction === undefined || restriction === null) return null;
  if (!object(restriction)) fail("RANGED_ATTACK_V2_POST_DISENGAGE_RESTRICTION_INVALID");
  const { restrictionHash, ...body } = restriction;
  if (restriction.schema !== "starcraft_tmg_official_post_disengage_assault_restriction_v1"
    || restriction.appliesToPhase !== "assault"
    || Number(restriction.declaredRound) !== Number(state.round)
    || restriction.trainingTruth !== false
    || hashStarcraftTmgContract(body) !== restrictionHash
    || restriction.rangedAttackProhibited !== !restriction.tacticalMass
    || restriction.chargeProhibited !== !restriction.tacticalMass) {
    fail("RANGED_ATTACK_V2_POST_DISENGAGE_RESTRICTION_INVALID");
  }
  if (restriction.rangedAttackProhibited) {
    fail("RANGED_ATTACK_V2_POST_DISENGAGE_PROHIBITED");
  }
  return restriction;
}

function exactScopedModel(piece, combatProfile, scope, role) {
  const models = activeModels(piece);
  if (!scope
    || piece.sourceRecordHash !== combatProfile.sourceRecordHash
    || Number(piece.currentModels) !== scope.currentModels
    || Number(piece.currentSupply) !== scope.currentSupply
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !combatProfile.combatTags.includes("ground")
    || (piece.statuses || []).length !== 0
    || (piece.selectedUpgradeNames || []).length !== 0
    || (piece.combatEffects || []).length !== 0
    || (piece.assaultEffects || []).length !== 0
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "RANGED_ATTACK_V2_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || milli(models[0].baseDepthInches, "RANGED_ATTACK_V2_BASE_SCOPE_UNSUPPORTED")
      !== scope.baseDiameterMilliInches
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("RANGED_ATTACK_V2_UNIT_SCOPE_UNSUPPORTED", role);
  }
  return models[0];
}

function baseGapMilliInches(left, leftScope, right, rightScope) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "RANGED_ATTACK_V2_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "RANGED_ATTACK_V2_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "RANGED_ATTACK_V2_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "RANGED_ATTACK_V2_MODEL_GEOMETRY_INVALID"),
  ) - (leftScope.baseDiameterMilliInches / 2) - (rightScope.baseDiameterMilliInches / 2)));
}

function contextFor(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("RANGED_ATTACK_V2_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("RANGED_ATTACK_V2_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("RANGED_ATTACK_V2_SIDE_PASSED");
  }
  if (!activePiece(piece) || piece.sideKey !== sideKey) {
    fail("RANGED_ATTACK_V2_UNIT_UNAVAILABLE");
  }
  if (!activePiece(target) || target.sideKey !== otherSide(sideKey)) {
    fail("RANGED_ATTACK_V2_TARGET_UNAVAILABLE");
  }
  if (piece.activatedPhases?.assault === true) fail("RANGED_ATTACK_V2_ALREADY_ACTIVATED");
  if ((state.board.terrain || []).length !== 0 || (state.board.accessPoints || []).length !== 0) {
    fail("RANGED_ATTACK_V2_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("RANGED_ATTACK_V2_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const attackerScope = SUPPORTED_ATTACKERS[piece.officialUnitRecordKey];
  const targetScope = SUPPORTED_TARGETS[target.officialUnitRecordKey];
  const attackerCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    piece.officialUnitRecordKey,
  );
  const targetCombatProfile = getOfficialCombatProfileV1(
    bindings.combatBundle,
    target.officialUnitRecordKey,
  );
  const attackerModel = exactScopedModel(piece, attackerCombatProfile, attackerScope, "attacker");
  const targetModel = exactScopedModel(target, targetCombatProfile, targetScope, "target");
  const damageMarker = Number(target.damageMarker || 0);
  if (targetCombatProfile.shield !== 0
    || !Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= targetCombatProfile.hitPoints) {
    fail("RANGED_ATTACK_V2_TARGET_DAMAGE_SCOPE_UNSUPPORTED");
  }
  const restriction = validateRestriction(state, piece);
  const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
    recordKey: piece.officialUnitRecordKey,
    phase: "assault",
    weaponName: attackerScope.weaponName,
  });
  if (attackProfile.sourceRecordHash !== attackerCombatProfile.sourceRecordHash) {
    fail("RANGED_ATTACK_V2_PROFILE_SOURCE_MISMATCH");
  }
  const baseGap = baseGapMilliInches(
    attackerModel,
    attackerScope,
    targetModel,
    targetScope,
  );
  const plan = KERNEL.plan({
    profile: attackProfile,
    target: {
      armourThreshold: targetCombatProfile.armourThreshold,
      combatTags: targetCombatProfile.combatTags,
    },
    distanceInches: Number((baseGap / 1000).toFixed(3)),
    evadeEligible: false,
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
    attackerScope,
    targetScope,
    attackerCombatProfile,
    targetCombatProfile,
    attackerModel,
    targetModel,
    attackProfile,
    plan,
    restriction,
    baseGapMilliInches: baseGap,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.attackProfile.weaponName,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS],
    executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialRangedAttackActionsV2(state, options = {}) {
  validateState(state);
  const sideKey = String(options.sideKey || state.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("RANGED_ATTACK_V2_SIDE_REQUIRED");
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
      && Object.hasOwn(SUPPORTED_ATTACKERS, entry.officialUnitRecordKey)
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && Object.hasOwn(SUPPORTED_TARGETS, entry.officialUnitRecordKey)
    ))) {
      let context;
      let disabledReason = "";
      try {
        context = contextFor(state, sideKey, piece, target, bindings, graph);
      } catch (error) {
        disabledReason = String(error?.message || error).split(":")[0];
      }
      if (!context) {
        if (options.includeDisabled !== true) continue;
        try {
          const attackProfile = getOfficialAttackProfileV1(bindings.catalogue, {
            recordKey: piece.officialUnitRecordKey,
            phase: "assault",
            weaponName: SUPPORTED_ATTACKERS[piece.officialUnitRecordKey].weaponName,
          });
          const targetProfile = getOfficialCombatProfileV1(
            bindings.combatBundle,
            target.officialUnitRecordKey,
          );
          context = {
            attackProfile,
            plan: KERNEL.plan({
              profile: attackProfile,
              target: {
                armourThreshold: targetProfile.armourThreshold,
                combatTags: targetProfile.combatTags,
              },
              distanceInches: 0,
              evadeEligible: false,
            }),
          };
        } catch {
          continue;
        }
      }
      const row = {
        ...canonicalAction(sideKey, piece, target, context),
        isEnabled: !disabledReason,
        disabledReason,
        score: disabledReason ? 0 : 190,
        details: {
          sourceRule:
            "official_core_3_1_5_1_7_1_8_6_1_8_7_3_8_7_4_11_long_range_and_quick_reference_12_4",
          officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
          attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
          attackPlanHash: context.plan.planHash,
          effectAtomIds: [...context.plan.effectAtomIds],
          engagementGraphHash: graph.graphHash,
          lineOfSightReceiptHash: context.lineOfSightReceipt?.receiptHash || "",
          normalRangeInches: context.plan.normalRangeInches,
          maximumRangeInches: context.plan.maximumRangeInches,
          rangeBand: context.plan.rangeBand,
          distanceInches: context.plan.distanceInches,
          effectiveHitThreshold: context.plan.effectiveHitThreshold,
          visible: Boolean(context.lineOfSightReceipt?.visible),
          engaged: graph.engagedUnitIds.includes(piece.id),
          supportedScope:
            "single_model_unmodified_marine_or_goliath_base_weapon_vs_ground_marine_no_terrain_no_shield",
          rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset",
          trainingTruth: false,
        },
      };
      rows.push(row);
    }
  }
  return rows.sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
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

function sideHasAvailableAssaultActivation(state, sideKey) {
  if (state.players?.[sideKey]?.passedPhases?.assault === true) return false;
  return state.pieces.some((piece) => (
    piece.sideKey === sideKey
      && activePiece(piece)
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
    consumedRound: Number(state.round),
    consumedPhase: "assault",
    consumedByActionType: OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE,
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
  return {
    type: "post_disengage_assault_restriction_consumed",
    pieceId: piece.id,
    restrictionHash: historyEntry.restrictionHash,
    consumedByActionType: historyEntry.consumedByActionType,
    consumedByActionHash: historyEntry.consumedByActionHash,
    tacticalMass: historyEntry.tacticalMass,
    trainingTruth: false,
  };
}

export function applyOfficialRangedAttackV2(stateInput, actionInput, options = {}) {
  validateState(stateInput);
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION) {
    fail("RANGED_ATTACK_V2_ACTION_INVALID");
  }
  const candidates = enumerateOfficialRangedAttackActionsV2(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
  });
  const expectedCandidate = candidates.find((candidate) => (
    candidate.pieceId === actionInput.pieceId
      && candidate.targetId === actionInput.targetId
      && candidate.weaponName === actionInput.weaponName
  ));
  if (!expectedCandidate) fail("RANGED_ATTACK_V2_ACTION_STALE");
  const expectedAction = actionFromCandidate(expectedCandidate);
  if (!isDeepStrictEqual(actionInput, expectedAction)) fail("RANGED_ATTACK_V2_ACTION_MISMATCH");

  const bindings = verifyProfileBinding(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  const pieceBefore = stateInput.pieces.find((piece) => piece.id === actionInput.pieceId);
  const targetBefore = stateInput.pieces.find((piece) => piece.id === actionInput.targetId);
  const context = contextFor(
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
  const restrictionEvent = consumeRestriction(piece, state, expectedAction);
  const opponentSideKey = otherSide(actionInput.sideKey);
  if (sideHasAvailableAssaultActivation(state, opponentSideKey)) {
    state.activeSideKey = opponentSideKey;
  } else if (sideHasAvailableAssaultActivation(state, actionInput.sideKey)) {
    state.activeSideKey = actionInput.sideKey;
  }
  const stages = resolution.stages;
  const rangedEvent = {
    type: OFFICIAL_RANGED_ATTACK_V2_ACTION_TYPE,
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attackerModel.id,
    targetModelId: context.targetModel.id,
    weaponName: context.attackProfile.weaponName,
    attackProfileKey: context.attackProfile.profileKey,
    attackProfileHash: context.attackProfile.profileHash,
    officialAttackProfileCatalogueHash: bindings.catalogue.catalogueHash,
    attackResolutionKernelHash: KERNEL.descriptor.kernelHash,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    effectAtomIds: [...context.plan.effectAtomIds],
    baseSourceBindings: {
      attacker: {
        printedBaseDiameter: context.attackerScope.printedBaseDiameter,
        sourceLocator: context.attackerScope.sourceLocator,
      },
      target: {
        printedBaseDiameter: context.targetScope.printedBaseDiameter,
        sourceLocator: context.targetScope.sourceLocator,
      },
    },
    engagementGraphHash: graph.graphHash,
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
    evadePool: clone(stages.evade),
    armourPool: clone(stages.armour),
    damagePool: {
      dice: stages.damage.damagePoolDice,
      damagePerDie: stages.damage.damagePerDie,
      priorDamageMarker,
      totalDamage,
    },
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    postDisengageRestrictionConsumed: Boolean(restrictionEvent),
    trainingTruth: false,
  };
  const events = restrictionEvent ? [rangedEvent, restrictionEvent] : [rangedEvent];
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
    schemaVersion: "starcraft_tmg_official_ranged_attack_transition_v2",
    executorId: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_ID,
    executorVersion: OFFICIAL_RANGED_ATTACK_V2_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expectedAction,
    rulesTruth: "official_current_profile_bound_atomic_ranged_attack_subset",
    trainingTruth: false,
  };
}
