import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialAttackResolutionKernelV1 } from
  "./official-attack-resolution-kernel-v1.mjs";
import {
  createOfficialCharacteristicStatusKernelV1,
  OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS,
  OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA,
  verifyOfficialOpticalFlareStatusV1,
} from "./official-characteristic-status-kernel-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";
import { OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS } from
  "./official-ranged-attack-executor-v2.mjs";
import { createOfficialTotalDamageReactionKernelV1 } from
  "./official-total-damage-reaction-kernel-v1.mjs";

export const OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID =
  "authority.optical-flare-ranged-consumer-v1";
export const OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_OPTICAL_FLARE_RANGED_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE = "ranged_attack";
export const OFFICIAL_OPTICAL_FLARE_RANGED_NEW_ATOM_IDS = Object.freeze([]);
export const OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_RANGED_ATTACK_V2_ACTION_ATOM_IDS,
    ...OFFICIAL_CHARACTERISTIC_STATUS_NEW_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ATOM_IDS =
  OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS;

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
const STATUS_KERNEL = createOfficialCharacteristicStatusKernelV1();
const ATTACK_KERNEL = createOfficialAttackResolutionKernelV1();
const TOTAL_DAMAGE_KERNEL = createOfficialTotalDamageReactionKernelV1();
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
  fail("OPTICAL_FLARE_RANGED_SIDE_REQUIRED");
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
    fail("OPTICAL_FLARE_RANGED_STATE_INVALID");
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
    fail("OPTICAL_FLARE_RANGED_LATEST_OFFICIAL_DATA_REQUIRED");
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
    fail("OPTICAL_FLARE_RANGED_MARINE_PROFILE_DRIFT");
  }
  return { gameplayBundle, marine };
}

function exactMarine(piece, sideKey, role, statusRequired) {
  const models = activeModels(piece);
  if (!activePiece(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.officialPayloadHash !== MARINE_PAYLOAD_HASH
    || Number(piece.currentModels) !== 1
    || Number(piece.currentSupply) !== 0
    || models.length !== 1
    || piece.combatTag !== "ground"
    || !isDeepStrictEqual(piece.combatTags, ["biological", "ground", "light"])
    || !isDeepStrictEqual(piece.selectedUpgradeNames || [], [])
    || !isDeepStrictEqual(piece.combatEffects || [], [])
    || !isDeepStrictEqual(piece.assaultEffects || [], [])
    || models[0].baseShape !== "round"
    || milli(models[0].baseWidthInches, "OPTICAL_FLARE_RANGED_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || milli(models[0].baseDepthInches, "OPTICAL_FLARE_RANGED_BASE_UNSUPPORTED")
      !== MARINE_BASE_MILLI_INCHES
    || models[0].elevation !== "ground"
    || !isDeepStrictEqual(models[0].supportTerrainIds, [])
    || !isDeepStrictEqual(models[0].adjacentAccessPointIds, [])) {
    fail("OPTICAL_FLARE_RANGED_MARINE_SCOPE_UNSUPPORTED", role);
  }
  const statuses = Array.isArray(piece.statuses) ? piece.statuses : [];
  if (statusRequired) {
    if (statuses.length !== 1
      || statuses[0]?.schema !== OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA) {
      fail("OPTICAL_FLARE_RANGED_EXACT_STATUS_REQUIRED");
    }
    verifyOfficialOpticalFlareStatusV1(statuses[0]);
    if (statuses[0].targetPieceId !== piece.id) {
      fail("OPTICAL_FLARE_RANGED_STATUS_BINDING_INVALID");
    }
  } else if (statuses.length !== 0) {
    fail("OPTICAL_FLARE_RANGED_TARGET_STATUS_UNSUPPORTED");
  }
  return { model: models[0], status: statusRequired ? statuses[0] : null };
}

function baseGapMilliInches(left, right) {
  return Math.max(0, Math.round(Math.hypot(
    milli(right.xInches, "OPTICAL_FLARE_RANGED_MODEL_GEOMETRY_INVALID")
      - milli(left.xInches, "OPTICAL_FLARE_RANGED_MODEL_GEOMETRY_INVALID"),
    milli(right.yInches, "OPTICAL_FLARE_RANGED_MODEL_GEOMETRY_INVALID")
      - milli(left.yInches, "OPTICAL_FLARE_RANGED_MODEL_GEOMETRY_INVALID"),
  ) - MARINE_BASE_MILLI_INCHES));
}

function contextFor(state, sideKey, piece, target, bindings, graph) {
  if (state.phase !== "assault") fail("OPTICAL_FLARE_RANGED_WRONG_PHASE");
  if (state.activeSideKey !== sideKey) fail("OPTICAL_FLARE_RANGED_NOT_ACTIVE_SIDE");
  if (state.players?.[sideKey]?.passedPhases?.assault === true) {
    fail("OPTICAL_FLARE_RANGED_SIDE_PASSED");
  }
  if (piece.activatedPhases?.assault === true) {
    fail("OPTICAL_FLARE_RANGED_ALREADY_ACTIVATED");
  }
  if ((state.board.terrain || []).length !== 0
    || (state.board.accessPoints || []).length !== 0) {
    fail("OPTICAL_FLARE_RANGED_TERRAIN_SCOPE_UNSUPPORTED");
  }
  if (graph.engagedUnitIds.includes(piece.id) || graph.engagedUnitIds.includes(target.id)) {
    fail("OPTICAL_FLARE_RANGED_ENGAGEMENT_SCOPE_UNSUPPORTED");
  }
  const attacker = exactMarine(piece, sideKey, "attacker", true);
  const defender = exactMarine(target, otherSide(sideKey), "target", false);
  const damageMarker = Number(target.damageMarker || 0);
  if (!Number.isSafeInteger(damageMarker)
    || damageMarker < 0
    || damageMarker >= bindings.marine.hitPoints) {
    fail("OPTICAL_FLARE_RANGED_TARGET_DAMAGE_UNSUPPORTED");
  }
  const baseGap = baseGapMilliInches(attacker.model, defender.model);
  const range = STATUS_KERNEL.applyRangeDebuff({
    status: attacker.status,
    printedRangeInches: MARINE_C14_PROFILE.range.normalRangeInches,
    printedLongRangeInches: 18,
  });
  const distanceInches = Number((baseGap / 1000).toFixed(3));
  if (distanceInches > range.effectiveMaximumRangeInches) {
    fail("OPTICAL_FLARE_RANGED_TARGET_OUT_OF_EFFECTIVE_RANGE");
  }
  const plan = ATTACK_KERNEL.plan({
    profile: MARINE_C14_PROFILE,
    target: {
      armourThreshold: bindings.marine.armourThreshold,
      combatTags: bindings.marine.combatTags,
    },
    distanceInches,
    evadeEligible: false,
  });
  const lineOfSightBody = {
    schema: "starcraft_tmg_official_unobstructed_line_of_sight_receipt_v1",
    attackerModelId: attacker.model.id,
    targetModelId: defender.model.id,
    projection: "top_down",
    trace: "base_to_base",
    terrainCount: 0,
    mutual: true,
    visible: true,
    trainingTruth: false,
  };
  return {
    attacker,
    defender,
    distanceInches,
    range,
    plan,
    lineOfSightReceipt: {
      ...lineOfSightBody,
      receiptHash: hashStarcraftTmgContract(lineOfSightBody),
    },
  };
}

function canonicalAction(sideKey, piece, target, context) {
  return {
    actionType: OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE,
    sideKey,
    phase: "assault",
    pieceId: piece.id,
    targetId: target.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    attackProfileKey: MARINE_C14_PROFILE.profileKey,
    attackProfileHash: MARINE_C14_PROFILE.profileHash,
    printedRangeInches: context.range.printedRangeInches,
    printedLongRangeInches: context.range.printedLongRangeInches,
    effectiveRangeInches: context.range.effectiveRangeInches,
    effectiveMaximumRangeInches: context.range.effectiveMaximumRangeInches,
    longRangeAllowed: context.range.longRangeAllowed,
    statusEffectHash: context.attacker.status.statusEffectHash,
    rangeDebuffResolutionHash: context.range.rangeDebuffResolutionHash,
    chance: clone(context.plan.chance),
    ruleAtomIds: [...OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_ATOM_IDS],
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION,
  };
}

export function enumerateOfficialOpticalFlareRangedConsumerV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) fail("OPTICAL_FLARE_RANGED_SIDE_REQUIRED");
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
  for (const piece of state.pieces.filter((entry) => (
    entry.sideKey === sideKey
      && activePiece(entry)
      && entry.officialUnitRecordKey === MARINE_RECORD_KEY
      && (entry.statuses || []).some((status) => (
        status?.schema === OFFICIAL_OPTICAL_FLARE_STATUS_SCHEMA
      ))
  ))) {
    for (const target of state.pieces.filter((entry) => (
      entry.sideKey === otherSide(sideKey)
        && activePiece(entry)
        && entry.officialUnitRecordKey === MARINE_RECORD_KEY
    ))) {
      try {
        const context = contextFor(state, sideKey, piece, target, bindings, graph);
        rows.push({
          ...canonicalAction(sideKey, piece, target, context),
          isEnabled: true,
          disabledReason: "",
          score: 230,
          details: {
            sourceRule:
              "official_current_marine_c14_optical_flare_and_atomic_ranged_v2_rules",
            attackResolutionKernelHash: ATTACK_KERNEL.descriptor.kernelHash,
            characteristicStatusKernelHash: STATUS_KERNEL.descriptor.kernelHash,
            attackPlanHash: context.plan.planHash,
            engagementGraphHash: graph.graphHash,
            lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
            distanceInches: context.distanceInches,
            printedRangeInches: context.range.printedRangeInches,
            printedLongRangeInches: context.range.printedLongRangeInches,
            effectiveRangeInches: context.range.effectiveRangeInches,
            effectiveMaximumRangeInches: context.range.effectiveMaximumRangeInches,
            longRangeAllowed: context.range.longRangeAllowed,
            statusEffectHash: context.attacker.status.statusEffectHash,
            rangeDebuffResolutionHash: context.range.rangeDebuffResolutionHash,
            supportedScope:
              "one_debuffed_current_marine_c14_vs_one_unmodified_current_marine_no_terrain_no_engagement",
            rulesTruth: "official_current_optical_flare_ranged_consumer_exact_subset",
            trainingTruth: false,
          },
        });
      } catch (error) {
        diagnostics.push(error);
      }
    }
  }
  if (rows.length === 0 && options.throwOnError === true && diagnostics.length > 0) {
    throw diagnostics[0];
  }
  return rows.sort((left, right) => (
    `${left.pieceId}:${left.targetId}:${left.weaponName}`.localeCompare(
      `${right.pieceId}:${right.targetId}:${right.weaponName}`,
    )
  ));
}

export function applyOfficialOpticalFlareRangedConsumerV1(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION) {
    fail("OPTICAL_FLARE_RANGED_ACTION_INVALID");
  }
  const expected = enumerateOfficialOpticalFlareRangedConsumerV1(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("OPTICAL_FLARE_RANGED_ACTION_STALE");
  const bindings = verifyBindings(stateInput, options.matchBinding);
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
  const resolution = ATTACK_KERNEL.resolve(context.plan, options.chanceReveals);
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const target = state.pieces.find((entry) => entry.id === actionInput.targetId);
  const targetModel = activeModels(target)[0];
  const priorDamageMarker = Number(target.damageMarker || 0);
  const incomingDamage = resolution.stages.damage.totalDamage;
  const totalDamage = priorDamageMarker + incomingDamage;
  const damageAllocationDeferred = options.deferDamageAllocation === true;
  const totalDamageReactionPlan = damageAllocationDeferred
    ? TOTAL_DAMAGE_KERNEL.plan({
        targetPieceId: target.id,
        targetModelId: targetModel.id,
        attackResolutionHash: resolution.resolutionHash,
        priorDamageMarker,
        incomingDamage,
        targetHitPoints: bindings.marine.hitPoints,
      })
    : null;
  const casualty = !damageAllocationDeferred && totalDamage >= bindings.marine.hitPoints;
  if (!damageAllocationDeferred) {
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
  }
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    assault: true,
  };
  const stages = resolution.stages;
  const rangedEvent = {
    type: OFFICIAL_OPTICAL_FLARE_RANGED_ACTION_TYPE,
    subtype: "optical_flare_range_consumer",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    attackerModelId: context.attacker.model.id,
    targetModelId: context.defender.model.id,
    weaponName: MARINE_C14_PROFILE.weaponName,
    attackProfileKey: MARINE_C14_PROFILE.profileKey,
    attackProfileHash: MARINE_C14_PROFILE.profileHash,
    attackResolutionKernelHash: ATTACK_KERNEL.descriptor.kernelHash,
    characteristicStatusKernelHash: STATUS_KERNEL.descriptor.kernelHash,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    engagementGraphHash: graph.graphHash,
    lineOfSightReceiptHash: context.lineOfSightReceipt.receiptHash,
    distanceInches: context.distanceInches,
    printedRangeInches: context.range.printedRangeInches,
    printedLongRangeInches: context.range.printedLongRangeInches,
    effectiveRangeInches: context.range.effectiveRangeInches,
    effectiveMaximumRangeInches: context.range.effectiveMaximumRangeInches,
    longRangeAllowed: context.range.longRangeAllowed,
    opticalFlareStatusConsumedByLegalSpace: true,
    statusEffectHash: context.attacker.status.statusEffectHash,
    rangeDebuffResolutionHash: context.range.rangeDebuffResolutionHash,
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
      incomingDamage,
      totalDamage,
    },
    damageAllocationDeferred,
    totalDamageReactionPlanHash: totalDamageReactionPlan?.planHash || null,
    unreducedTargetWouldBeDestroyed: totalDamage >= bindings.marine.hitPoints,
    casualtyModelIds: casualty ? [targetModel.id] : [],
    postDamageMarker: Number(target.damageMarker || 0),
    targetDestroyed: casualty,
    trainingTruth: false,
  };
  const events = [rangedEvent];
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
    schemaVersion: "starcraft_tmg_official_optical_flare_ranged_consumer_transition_v1",
    executorId: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_ID,
    executorVersion: OFFICIAL_OPTICAL_FLARE_RANGED_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    totalDamageReactionPlan,
    damageAllocationDeferred,
    rulesTruth: "official_current_optical_flare_ranged_consumer_exact_subset",
    trainingTruth: false,
  };
}
