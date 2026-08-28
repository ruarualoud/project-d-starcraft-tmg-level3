import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import { createOfficialAttackResolutionKernelV6 } from
  "./official-attack-resolution-kernel-v6.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialMarineStimpackKernelV1,
  OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
  OFFICIAL_STIMPACK_MARKER_SCHEMA,
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
  verifyOfficialStimpackMarkerV1,
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";
import { OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS } from
  "./official-ranged-attack-executor-v2.mjs";

export const OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID =
  "authority.stimpack-ranged-consumer-v1";
export const OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_STIMPACK_RANGED_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE = "ranged_attack";
export const OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE =
  "resolve_precision";
export const OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA =
  "starcraft_tmg_official_stimpack_precision_pending_v1";

export const OFFICIAL_STIMPACK_RANGED_NEW_ATOM_IDS = Object.freeze([]);
export const OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS,
    ...OFFICIAL_MARINE_STIMPACK_KERNEL_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_STIMPACK_RANGED_EXECUTOR_ATOM_IDS =
  OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS;

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
const MARINE_BASE_MILLI_INCHES = 1260;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const STIMPACK_KERNEL = createOfficialMarineStimpackKernelV1();
const BASE_ATTACK_KERNEL = createOfficialAttackResolutionKernelV5();
const PRECISION_ATTACK_KERNEL = createOfficialAttackResolutionKernelV6();
const MARINE_C14_PROFILE = Object.freeze({
  schema: "starcraft_tmg_official_attack_profile_v1",
  profileKey: "army_units:marine::assault::C-14 rifle",
  recordKey: MARINE_RECORD_KEY,
  unitId: "marine",
  unitName: "Marine",
  sourceRecordHash: MARINE_SOURCE_RECORD_HASH,
  payloadHash: MARINE_PAYLOAD_HASH,
  phase: "assault",
  weaponName: "C-14 rifle",
  linkedTo: "-",
  costSmall: 0,
  costLarge: 0,
  range: Object.freeze({ kind: "inches", normalRangeInches: 12 }),
  targetTags: Object.freeze(["all"]),
  rateOfAttack: 2,
  hitThreshold: 3,
  damage: 1,
  surge: Object.freeze({ targetTags: Object.freeze(["light"]), diceExpression: "D3" }),
  effects: Object.freeze([Object.freeze({
    effectAtomId: "attack-effect:surge-armour-bypass-v1",
    parameters: Object.freeze({
      targetTags: Object.freeze(["light"]),
      diceExpression: "D3",
    }),
    sourceKind: "surge",
  })]),
  sourceTextHash:
    "2c71545987dc26fcdc1ecdcc7665f2d8255d211b28f98d15914215c66b2c9d33",
  canAffectRules: false,
  trainingTruth: false,
  profileHash:
    "a58fc5f16efc1096b4db052ad6fe92206a251e8d38c1bff3a4b02cd37fd802ba",
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

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function actionFromCandidate(candidate) {
  return without(candidate, ["isEnabled", "disabledReason", "score", "details"]);
}

function activePiece(piece) {
  return piece?.isOnField === true
    && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("STIMPACK_RANGED_SIDE_REQUIRED");
}

function milli(value, code) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) fail(code);
  const result = Math.round(parsed * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}

function verifyBindings(state, matchBinding) {
  if (!object(state) || !object(state.players) || !object(state.board)
    || !Array.isArray(state.pieces)) {
    fail("STIMPACK_RANGED_STATE_INVALID");
  }
  const gameplayBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayBundle);
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayBundle) !== matchBinding.dataSnapshotHash
    || gameplayBundle.gameplayDataBundleHash !== CURRENT_GAMEPLAY_BUNDLE_HASH
    || gameplayBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayBundle.repositoryFallbackAllowed !== false
    || !isDeepStrictEqual(gameplayBundle.dataVersions, {
      cardsVersion: "69",
      rulesVersion: "48",
      unitsVersion: "71",
    })) {
    fail("STIMPACK_RANGED_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  const marine = getOfficialCombatProfileV1(
    gameplayBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (marine.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || marine.payloadHash !== MARINE_PAYLOAD_HASH
    || marine.unitName !== "Marine"
    || marine.hitPoints !== 2
    || marine.armourThreshold !== 5
    || marine.evadeThreshold !== 5
    || marine.shield !== 0
    || !isDeepStrictEqual(marine.combatTags, ["biological", "ground", "light"])) {
    fail("STIMPACK_RANGED_MARINE_PROFILE_DRIFT");
  }
  return { gameplayBundle, marine };
}

function exactMarine(piece, sideKey, role, stimpacked) {
  const models = activeModels(piece);
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || Number(piece.currentModels) !== 1
    || Number(piece.maxModels) !== 1
    || Number(piece.currentSupply) !== 0
    || models.length !== 1
    || !isDeepStrictEqual(piece.destroyedModelIds || [], [])
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], stimpacked ? ["Stimpack"] : [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "STIMPACK_RANGED_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || milli(models[0].baseDepthInches, "STIMPACK_RANGED_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds || [], [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds || [], [])) {
    fail("STIMPACK_RANGED_MARINE_SCOPE_UNSUPPORTED", role);
  }
  const marker = Number(piece.damageMarker || 0);
  if (!Number.isSafeInteger(marker)
    || (stimpacked ? marker < 2 : marker !== 0)) {
    fail("STIMPACK_RANGED_DAMAGE_MARKER_SCOPE_UNSUPPORTED", role);
  }
  const statuses = Array.isArray(piece.statuses) ? piece.statuses : [];
  if (stimpacked) {
    if (statuses.length !== 1 || statuses[0]?.schema !== OFFICIAL_STIMPACK_STATUS_SCHEMA) {
      fail("STIMPACK_RANGED_EXACT_STATUS_REQUIRED", role);
    }
    verifyOfficialStimpackStatusV1(statuses[0]);
    if (statuses[0].targetPieceId !== piece.id) {
      fail("STIMPACK_RANGED_STATUS_BINDING_INVALID", role);
    }
  } else if (statuses.length !== 0) {
    fail("STIMPACK_RANGED_UNEXPECTED_STATUS", role);
  }
  return { model: models[0], status: stimpacked ? statuses[0] : null };
}

function exactStatusMarker(state, status) {
  if (!Array.isArray(state.board.effectMarkers)
    || state.board.effectMarkers.length !== 1
    || state.board.effectMarkers[0]?.schema !== OFFICIAL_STIMPACK_MARKER_SCHEMA) {
    fail("STIMPACK_RANGED_EXACT_MARKER_REQUIRED");
  }
  verifyOfficialStimpackMarkerV1(state.board.effectMarkers[0], status);
  return state.board.effectMarkers[0];
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "STIMPACK_RANGED_GEOMETRY_INVALID")
      - milli(left.xInches, "STIMPACK_RANGED_GEOMETRY_INVALID"),
    milli(right.yInches, "STIMPACK_RANGED_GEOMETRY_INVALID")
      - milli(left.yInches, "STIMPACK_RANGED_GEOMETRY_INVALID"),
  ) - MARINE_BASE_MILLI_INCHES));
}

function commonContext(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("STIMPACK_RANGED_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("STIMPACK_RANGED_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("STIMPACK_RANGED_SIDE_PASSED");
  }
  if (piece.activatedPhases?.assault === true) {
    fail("STIMPACK_RANGED_ALREADY_ACTIVATED");
  }
  if (state.pieces.length !== 2
    || state.pieces.some((entry) => entry.officialUnitRecordKey !== MARINE_RECORD_KEY)) {
    fail("STIMPACK_RANGED_UNHANDLED_REACTION_CARRIER_SCOPE");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0) {
    fail("STIMPACK_RANGED_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("STIMPACK_RANGED_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const distanceMilliInches = baseGapMilliInches(
    activeModels(piece)[0],
    activeModels(target)[0],
  );
  const distanceInches = Number((distanceMilliInches / 1000).toFixed(3));
  if (distanceInches > MARINE_C14_PROFILE.range.normalRangeInches) {
    fail("STIMPACK_RANGED_TARGET_OUT_OF_RANGE");
  }
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_unobstructed_line_of_sight_receipt_v1",
    attackerModelId: activeModels(piece)[0].id,
    targetModelId: activeModels(target)[0].id,
    projection: "top_down",
    trace: "base_to_base",
    terrainCount: 0,
    mutual: true,
    visible: true,
    trainingTruth: false,
  };
  return {
    distanceInches,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
    targetProfile: {
      armourThreshold: bindings.marine.armourThreshold,
      evadeThreshold: bindings.marine.evadeThreshold,
      combatTags: bindings.marine.combatTags,
    },
  };
}

function precisionContext(state, sideKey, piece, target, bindings, graph) {
  const common = commonContext(state, sideKey, piece, target, bindings, graph);
  const attacker = exactMarine(piece, sideKey, "precision_attacker", true);
  const defender = exactMarine(target, otherSide(sideKey), "precision_target", false);
  const marker = exactStatusMarker(state, attacker.status);
  const plan = PRECISION_ATTACK_KERNEL.plan({
    profile: MARINE_C14_PROFILE,
    target: common.targetProfile,
    distanceInches: common.distanceInches,
    evadeEligibility: { eligible: false, reason: "none" },
    attackerPieceId: piece.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    precisionStatusEffectHash: attacker.status.statusEffectHash,
    precisionValue: attacker.status.precision,
  });
  const grant = STIMPACK_KERNEL.createPrecisionGrant({
    status: attacker.status,
    attackerPieceId: piece.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    attackPlanHash: plan.planHash,
  });
  return { ...common, attacker, defender, marker, plan, grant };
}

function standardDamageContext(state, sideKey, piece, target, bindings, graph) {
  const common = commonContext(state, sideKey, piece, target, bindings, graph);
  const attacker = exactMarine(piece, sideKey, "standard_attacker", false);
  const defender = exactMarine(target, otherSide(sideKey), "non_lethal_target", true);
  const marker = exactStatusMarker(state, defender.status);
  const plan = BASE_ATTACK_KERNEL.plan({
    profile: MARINE_C14_PROFILE,
    target: common.targetProfile,
    distanceInches: common.distanceInches,
    evadeEligibility: { eligible: false, reason: "none" },
  });
  return { ...common, attacker, defender, marker, plan };
}

function precisionAttackAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    resolutionMode: "precision_pending_choice",
    attackProfileKey: MARINE_C14_PROFILE.profileKey,
    attackProfileHash: MARINE_C14_PROFILE.profileHash,
    attackPlanHash: context.plan.planHash,
    statusEffectHash: context.attacker.status.statusEffectHash,
    markerHash: context.marker.markerHash,
    precisionGrantHash: context.grant.precisionGrantHash,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
  };
}

function standardDamageAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    resolutionMode: "later_standard_damage",
    attackProfileKey: MARINE_C14_PROFILE.profileKey,
    attackProfileHash: MARINE_C14_PROFILE.profileHash,
    attackPlanHash: context.plan.planHash,
    statusEffectHash: context.defender.status.statusEffectHash,
    markerHash: context.marker.markerHash,
    precisionGrantHash: null,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
  };
}

function verifyPending(pending) {
  if (!object(pending)
    || pending.schema !== OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA
    || !SIDE_KEYS.includes(pending.ownerSideKey)
    || !object(pending.attackPlan)
    || !object(pending.precisionGrant)
    || !object(pending.hitReveal)
    || !Array.isArray(pending.chanceReveals)
    || !Array.isArray(pending.precisionSelections)
    || pending.precisionSelections.length < 1
    || pending.trainingTruth !== false
    || pending.pendingHash !== hashStarcraftTmgContract(without(pending, ["pendingHash"]))) {
    fail("STIMPACK_PRECISION_PENDING_INVALID");
  }
  return pending;
}

function precisionChoiceAction(pending, selection) {
  return {
    actionType: OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
    sideKey: pending.ownerSideKey,
    phase: "assault",
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    pendingHash: pending.pendingHash,
    attackPlanHash: pending.attackPlan.planHash,
    hitRevealHash: pending.hitReveal.hitRevealHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
    convertedCount: selection.convertedCount,
    ruleAtomIds: [...OFFICIAL_STIMPACK_RANGED_ACTION_ATOM_IDS],
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialStimpackRangedConsumerV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("STIMPACK_RANGED_SIDE_REQUIRED");
  if (state?.pendingAction?.schema === OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA) {
    try {
      const pending = verifyPending(state.pendingAction);
      if (sideKey !== pending.ownerSideKey
        || state.activeSideKey !== pending.ownerSideKey
        || state.phase !== "assault") {
        fail("STIMPACK_PRECISION_PENDING_WRONG_SEAT");
      }
      return pending.precisionSelections.map((selection) => ({
        ...precisionChoiceAction(pending, selection),
        isEnabled: true,
        disabledReason: "",
        score: 250 + selection.convertedCount,
        details: {
          choiceTiming: "after_hit_roll_before_armour_pool",
          failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
          maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
          convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
          convertedDiceAreHitsForAllPurposesIncludingSurge: true,
          rulesTruth: "official_precision_post_hit_choice_exact_subset",
          trainingTruth: false,
        },
      }));
    } catch (error) {
      if (options.throwOnError === true) throw error;
      return [];
    }
  }
  if (state?.pendingAction !== undefined && state?.pendingAction !== null) return [];
  let bindings;
  let graph;
  try {
    bindings = verifyBindings(state, options.matchBinding);
    graph = deriveOfficialEngagementGraphV2(state);
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
  const rows = [];
  const diagnostics = [];
  for (const piece of state.pieces.filter((entry) => entry.sideKey === sideKey)) {
    for (const target of state.pieces.filter((entry) => entry.sideKey === otherSide(sideKey))) {
      try {
        if (isDeepStrictEqual(piece.selectedUpgradeNames || [], ["Stimpack"])) {
          const context = precisionContext(state, sideKey, piece, target, bindings, graph);
          rows.push({
            ...precisionAttackAction(sideKey, piece, target, context),
            isEnabled: true,
            disabledReason: "",
            score: 240,
            details: {
              attackResolutionKernelHash: PRECISION_ATTACK_KERNEL.descriptor.kernelHash,
              stimpackKernelHash: STIMPACK_KERNEL.descriptor.kernelHash,
              engagementGraphHash: graph.graphHash,
              lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
              choiceTiming: "after_hit_roll_before_armour_pool",
              rulesTruth: "official_current_stimpack_c14_precision_consumer_exact_subset",
              trainingTruth: false,
            },
          });
        } else {
          const context = standardDamageContext(
            state,
            sideKey,
            piece,
            target,
            bindings,
            graph,
          );
          rows.push({
            ...standardDamageAction(sideKey, piece, target, context),
            isEnabled: true,
            disabledReason: "",
            score: 235,
            details: {
              attackResolutionKernelHash: BASE_ATTACK_KERNEL.descriptor.kernelHash,
              stimpackKernelHash: STIMPACK_KERNEL.descriptor.kernelHash,
              engagementGraphHash: graph.graphHash,
              lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
              combinesPriorNonLethalDamageOnPositiveStandardDamage: true,
              rulesTruth: "official_non_lethal_then_standard_damage_consumer_exact_subset",
              trainingTruth: false,
            },
          });
        }
      } catch (error) {
        diagnostics.push(error);
      }
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.resolutionMode}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.resolutionMode}`,
    )
  ));
}

function destroyOneModelPiece(piece, model) {
  model.isDestroyed = true;
  model.isOnField = false;
  piece.currentModels = 0;
  piece.currentSupply = 0;
  piece.damageMarker = 0;
  piece.isDestroyed = true;
  piece.isOnField = false;
  piece.destroyedModelIds = [...new Set([...(piece.destroyedModelIds || []), model.id])];
}

function settleAttacker(piece) {
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
}

function attackEvent(input) {
  const stages = input.resolution.stages;
  return {
    type: OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
    subtype: input.subtype,
    sideKey: input.sideKey,
    pieceId: input.piece.id,
    targetId: input.target.id,
    attackerModelId: input.attackerModel.id,
    targetModelId: input.targetModel.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    attackProfileKey: MARINE_C14_PROFILE.profileKey,
    attackProfileHash: MARINE_C14_PROFILE.profileHash,
    attackResolutionKernelHash: input.kernelHash,
    stimpackKernelHash: STIMPACK_KERNEL.descriptor.kernelHash,
    attackPlanHash: input.planHash,
    attackResolutionHash: input.resolution.resolutionHash,
    precisionGrantHash: input.precisionGrantHash || null,
    precisionSelectionHash: input.precisionSelectionHash || null,
    attackPool: clone(stages.hit),
    surgePool: {
      dice: input.resolution.reveals.length > 0 ? 1 : 0,
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
      priorDamageMarker: input.priorDamageMarker,
      incomingDamage: stages.damage.totalDamage,
      totalDamage: input.priorDamageMarker + stages.damage.totalDamage,
    },
    standardDamageResolution: input.standardDamageResolution
      ? clone(input.standardDamageResolution)
      : null,
    casualtyModelIds: input.targetDestroyed ? [input.targetModel.id] : [],
    postDamageMarker: Number(input.target.damageMarker || 0),
    targetDestroyed: input.targetDestroyed,
    unhandledReactionCarrierCount: 0,
    trainingTruth: false,
  };
}

function applyPrecisionStart(stateInput, actionInput, expected, options, bindings, graph) {
  const piece = stateInput.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = stateInput.pieces.find((entry) => entry.id === actionInput.targetId);
  const context = precisionContext(
    stateInput,
    actionInput.sideKey,
    piece,
    target,
    bindings,
    graph,
  );
  const enumerated = PRECISION_ATTACK_KERNEL.enumeratePrecisionSelections(
    context.plan,
    options.chanceReveals,
    context.grant,
  );
  const normalizedReveals = enumerated.hitReveal.reveals;
  const pendingBody = {
    schema: OFFICIAL_STIMPACK_PRECISION_PENDING_SCHEMA,
    round: Number(stateInput.round),
    phase: "assault",
    ownerSideKey: actionInput.sideKey,
    attackerPieceId: piece.id,
    targetPieceId: target.id,
    triggerActionHash: hashStarcraftTmgContract(expected),
    attackPlan: clone(context.plan),
    precisionGrant: clone(context.grant),
    hitReveal: clone(enumerated.hitReveal),
    chanceReveals: clone(normalizedReveals),
    precisionSelections: clone(enumerated.selections),
    statusEffectHash: context.attacker.status.statusEffectHash,
    markerHash: context.marker.markerHash,
    trainingTruth: false,
  };
  const pending = {
    ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody),
  };
  const state = clone(stateInput);
  state.pendingAction = pending;
  const events = [{
    type: "stimpack_precision_choice_opened",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    pendingHash: pending.pendingHash,
    attackPlanHash: context.plan.planHash,
    hitRevealHash: pending.hitReveal.hitRevealHash,
    failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
    maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
    legalSelectionCount: pending.precisionSelections.length,
    choiceTiming: "after_hit_roll_before_armour_pool",
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_stimpack_precision_pending_transition_v1",
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    pendingAction: pending,
    rulesTruth: "official_precision_post_hit_choice_opened_exact_subset",
    trainingTruth: false,
  };
}

function applyPrecisionChoice(stateInput, actionInput, expected, options, bindings, graph) {
  const pending = verifyPending(stateInput.pendingAction);
  const selection = pending.precisionSelections.find((row) => (
    row.precisionSelectionHash === actionInput.precisionSelectionHash
  ));
  if (!selection) fail("STIMPACK_PRECISION_SELECTION_STALE");
  const pieceBefore = stateInput.pieces.find((entry) => entry.id === pending.attackerPieceId);
  const targetBefore = stateInput.pieces.find((entry) => entry.id === pending.targetPieceId);
  const context = precisionContext(
    stateInput,
    pending.ownerSideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  if (!isDeepStrictEqual(context.plan, pending.attackPlan)
    || !isDeepStrictEqual(context.grant, pending.precisionGrant)) {
    fail("STIMPACK_PRECISION_PENDING_STATE_DRIFT");
  }
  const resolution = PRECISION_ATTACK_KERNEL.resolve(
    pending.attackPlan,
    pending.chanceReveals,
    { precisionGrant: pending.precisionGrant, precisionSelection: selection },
  );
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pieceBefore.id);
  const target = state.pieces.find((entry) => entry.id === targetBefore.id);
  const targetModel = activeModels(target)[0];
  const incomingDamage = resolution.stages.damage.totalDamage;
  const targetDestroyed = incomingDamage >= bindings.marine.hitPoints;
  if (targetDestroyed) destroyOneModelPiece(target, targetModel);
  else target.damageMarker = incomingDamage;
  settleAttacker(piece);
  delete state.pendingAction;
  const event = attackEvent({
    subtype: "stimpack_precision_ranged_consumer",
    sideKey: pending.ownerSideKey,
    piece,
    target,
    attackerModel: context.attacker.model,
    targetModel: context.defender.model,
    resolution,
    kernelHash: PRECISION_ATTACK_KERNEL.descriptor.kernelHash,
    planHash: pending.attackPlan.planHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    priorDamageMarker: 0,
    targetDestroyed,
    standardDamageResolution: null,
  });
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_stimpack_precision_resolution_transition_v1",
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    attackResolution: resolution,
    rulesTruth: "official_current_stimpack_c14_precision_consumer_exact_subset",
    trainingTruth: false,
  };
}

function applyLaterStandardDamage(stateInput, actionInput, expected, options, bindings, graph) {
  const pieceBefore = stateInput.pieces.find((entry) => entry.id === actionInput.pieceId);
  const targetBefore = stateInput.pieces.find((entry) => entry.id === actionInput.targetId);
  const context = standardDamageContext(
    stateInput,
    actionInput.sideKey,
    pieceBefore,
    targetBefore,
    bindings,
    graph,
  );
  const resolution = BASE_ATTACK_KERNEL.resolve(context.plan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === pieceBefore.id);
  const target = state.pieces.find((entry) => entry.id === targetBefore.id);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const incomingDamage = resolution.stages.damage.totalDamage;
  const standardDamageResolution = incomingDamage > 0
    ? STIMPACK_KERNEL.resolveLaterStandardDamage({
        targetPieceId: target.id,
        targetModelId: targetModel.id,
        attackResolutionHash: resolution.resolutionHash,
        priorDamageMarker,
        incomingDamage,
        targetHitPoints: bindings.marine.hitPoints,
      })
    : null;
  const targetDestroyed = standardDamageResolution?.targetDestroyed === true;
  if (targetDestroyed) destroyOneModelPiece(target, targetModel);
  else if (standardDamageResolution) {
    target.damageMarker = standardDamageResolution.postDamageMarker;
  }
  settleAttacker(piece);
  const event = attackEvent({
    subtype: "non_lethal_then_standard_damage_consumer",
    sideKey: actionInput.sideKey,
    piece,
    target,
    attackerModel: context.attacker.model,
    targetModel: context.defender.model,
    resolution,
    kernelHash: BASE_ATTACK_KERNEL.descriptor.kernelHash,
    planHash: context.plan.planHash,
    priorDamageMarker,
    targetDestroyed,
    standardDamageResolution,
  });
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "assault",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion: "starcraft_tmg_official_stimpack_standard_damage_transition_v1",
    executorId: OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    attackResolution: resolution,
    standardDamageResolution,
    rulesTruth: "official_non_lethal_then_standard_damage_consumer_exact_subset",
    trainingTruth: false,
  };
}

export function applyOfficialStimpackRangedConsumerV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || ![
      OFFICIAL_STIMPACK_RANGED_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId !== OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_STIMPACK_RANGED_EXECUTOR_VERSION) {
    fail("STIMPACK_RANGED_ACTION_INVALID");
  }
  const expected = enumerateOfficialStimpackRangedConsumerV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("STIMPACK_RANGED_ACTION_STALE");
  const bindings = verifyBindings(stateInput, options.matchBinding);
  const graph = deriveOfficialEngagementGraphV2(stateInput);
  if (actionInput.actionType === OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE) {
    return applyPrecisionChoice(
      stateInput,
      actionInput,
      expected,
      options,
      bindings,
      graph,
    );
  }
  if (actionInput.resolutionMode === "precision_pending_choice") {
    return applyPrecisionStart(
      stateInput,
      actionInput,
      expected,
      options,
      bindings,
      graph,
    );
  }
  if (actionInput.resolutionMode === "later_standard_damage") {
    return applyLaterStandardDamage(
      stateInput,
      actionInput,
      expected,
      options,
      bindings,
      graph,
    );
  }
  fail("STIMPACK_RANGED_RESOLUTION_MODE_INVALID");
}
