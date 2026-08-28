import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
} from "./official-stimpack-close-combat-consumer-executor-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV1,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import {
  createOfficialMarineMultiModelCloseCombatPrecisionKernelV2,
} from "./official-marine-multi-model-close-combat-precision-kernel-v2.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS,
} from "./official-marine-multi-model-stimpack-active-executor-v3.mjs";
import {
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
} from "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID =
  "authority.marine-multi-model-stimpack-close-combat-v2";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION =
  "2.0.0";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE =
  "fight";
export const OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE =
  "resolve_multi_model_close_combat_precision";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_pending_v2";
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_NEW_ATOM_IDS =
  Object.freeze([]);
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS =
  Object.freeze([
    ...new Set([
      ...OFFICIAL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS,
      ...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ATOM_IDS,
    ]),
  ].sort((left, right) => left.localeCompare(right)));
export const OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const DENOMINATOR = createOfficialMarineMultiModelCloseCombatDenominatorV1();
const PRECISION = createOfficialMarineMultiModelCloseCombatPrecisionKernelV2();

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

function otherSide(sideKey) {
  if (sideKey === "player1") return "player2";
  if (sideKey === "player2") return "player1";
  fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_SIDE_REQUIRED");
}

function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}

function statusFor(piece, plan) {
  if (!plan.stimpacked) return null;
  const statuses = (piece?.statuses || []).filter((status) => (
    status?.schema === OFFICIAL_STIMPACK_STATUS_SCHEMA
      && status?.statusEffectHash === plan.statusEffectHash
  ));
  if (statuses.length !== 1) fail("MARINE_MULTI_MODEL_PRECISION_STATUS_STALE");
  return statuses[0];
}

function contextFor(state, sideKey, attackerPieceId, targetPieceId, matchBinding) {
  const plan = DENOMINATOR.plan({
    state,
    sideKey,
    attackerPieceId,
    targetPieceId,
    matchBinding,
  });
  const piece = state.pieces.find((entry) => entry.id === attackerPieceId);
  const target = state.pieces.find((entry) => entry.id === targetPieceId);
  const status = statusFor(piece, plan);
  const grant = plan.stimpacked
    ? PRECISION.createGrant({ plan, status })
    : null;
  return { plan, piece, target, status, grant };
}

function attackAction(context) {
  const plan = context.plan;
  return {
    actionType: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
    sideKey: plan.sideKey,
    phase: "combat",
    pieceId: plan.attackerPieceId,
    targetId: plan.targetPieceId,
    weaponName: plan.weapon.weaponName,
    replacedWeaponName: plan.unitWideLoadout.replacedWeaponName,
    selectedUpgradeNames: [...plan.unitWideLoadout.selectedUpgradeNames],
    combatWeaponLoadoutHash: plan.unitWideLoadout.unitWideLoadoutHash,
    closeRanksMode: "decline",
    resolutionMode: plan.stimpacked
      ? "multi_model_precision_pending_choice"
      : "multi_model_ordinary_no_precision",
    attackPlanHash: plan.planHash,
    statusEffectHash: plan.statusEffectHash,
    markerHash: plan.markerHash,
    precisionGrantHash: context.grant?.precisionGrantHash || null,
    chance: clone(plan.chance),
    ruleAtomIds: [
      ...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS,
    ],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function choiceAction(pending, selection) {
  return {
    actionType: OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
    sideKey: pending.ownerSideKey,
    phase: "combat",
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    weaponName: pending.weaponName,
    selectedUpgradeNames: [...pending.attackPlan.unitWideLoadout.selectedUpgradeNames],
    combatWeaponLoadoutHash:
      pending.attackPlan.unitWideLoadout.unitWideLoadoutHash,
    pendingHash: pending.pendingHash,
    attackPlanHash: pending.attackPlan.planHash,
    hitRevealHash: pending.hitReveal.hitRevealHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
    convertedCount: selection.convertedCount,
    ruleAtomIds: [
      ...OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS,
    ],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function verifyPending(pending) {
  if (!object(pending)
    || pending.schema
      !== OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA
    || !SIDE_KEYS.includes(pending.ownerSideKey)
    || pending.phase !== "combat"
    || !object(pending.attackPlan)
    || !object(pending.precisionGrant)
    || !object(pending.hitReveal)
    || !Array.isArray(pending.chanceReveals)
    || !Array.isArray(pending.precisionSelections)
    || pending.precisionSelections.length < 1
    || pending.trainingTruth !== false
    || pending.pendingHash
      !== hashStarcraftTmgContract(without(pending, ["pendingHash"]))) {
    fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_PENDING_INVALID");
  }
  return pending;
}

function currentPendingContext(state, pending, options) {
  const projectedState = clone(state);
  delete projectedState.pendingAction;
  const context = contextFor(
    projectedState,
    pending.ownerSideKey,
    pending.attackerPieceId,
    pending.targetPieceId,
    options.matchBinding,
  );
  if (!context.plan.stimpacked
    || context.plan.weapon.weaponName !== pending.weaponName
    || !isDeepStrictEqual(context.plan, pending.attackPlan)
    || !isDeepStrictEqual(context.grant, pending.precisionGrant)
    || context.plan.statusEffectHash !== pending.statusEffectHash
    || context.plan.markerHash !== pending.markerHash
    || context.plan.abilityUseHash !== pending.abilityUseHash) {
    fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_PENDING_STATE_DRIFT");
  }
  PRECISION.verifyGrant({
    plan: context.plan,
    grant: pending.precisionGrant,
    status: context.status,
  });
  return context;
}

export function isOfficialMarineMultiModelStimpackCloseCombatPendingV2(state) {
  return state?.pendingAction?.schema
    === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA;
}

export function enumerateOfficialMarineMultiModelStimpackCloseCombatV2(
  state,
  options = {},
) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) {
    if (options.throwOnError === true) fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_SIDE_REQUIRED");
    return [];
  }
  if (isOfficialMarineMultiModelStimpackCloseCombatPendingV2(state)) {
    try {
      const pending = verifyPending(state.pendingAction);
      if (state.phase !== "combat"
        || state.activeSideKey !== pending.ownerSideKey
        || sideKey !== pending.ownerSideKey) {
        fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_PENDING_WRONG_SEAT");
      }
      currentPendingContext(state, pending, options);
      return pending.precisionSelections.map((selection) => ({
        ...choiceAction(pending, selection),
        isEnabled: true,
        disabledReason: "",
        score: 410 + selection.convertedCount,
        details: {
          choiceTiming: "after_hit_roll_before_armour_pool",
          failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
          maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
          convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
          convertedDiceAreHitsForAllPurposes: true,
          modelLedgerHash: pending.attackPlan.attackerLedger.modelLedgerHash,
          rulesTruth:
            "official_multi_model_stimpack_close_combat_precision_exact_choice_domain",
          trainingTruth: false,
        },
      }));
    } catch (error) {
      if (options.throwOnError === true) throw error;
      return [];
    }
  }
  if (state?.pendingAction !== undefined && state?.pendingAction !== null) return [];
  const rows = [];
  const diagnostics = [];
  for (const piece of (state?.pieces || []).filter((entry) => entry.sideKey === sideKey)) {
    for (const target of (state?.pieces || []).filter((entry) => (
      entry.sideKey === otherSide(sideKey)
    ))) {
      try {
        const context = contextFor(
          state,
          sideKey,
          piece.id,
          target.id,
          options.matchBinding,
        );
        rows.push({
          ...attackAction(context),
          isEnabled: true,
          disabledReason: "",
          score: context.plan.stimpacked
            ? context.plan.weapon.weaponName === "Bayonet" ? 405 : 400
            : context.plan.weapon.weaponName === "Bayonet" ? 385 : 380,
          details: {
            denominatorHash: DENOMINATOR.descriptor.denominatorHash,
            precisionKernelHash: context.plan.stimpacked
              ? PRECISION.descriptor.kernelHash
              : null,
            modelLedgerHash: context.plan.attackerLedger.modelLedgerHash,
            unitWideLoadoutHash:
              context.plan.unitWideLoadout.unitWideLoadoutHash,
            engagementGraphHash: context.plan.engagementGraphHash,
            fightingModelIds: [...context.plan.fightingModelIds],
            supportingModelIds: [...context.plan.supportingModelIds],
            eligibleModelIds: [...context.plan.eligibleModelIds],
            attackDice: context.plan.attackDice,
            precisionAvailable: context.plan.stimpacked,
            rulesTruth: context.plan.stimpacked
              ? "official_current_multi_model_stimpack_close_combat_precision_consumer"
              : "official_current_multi_model_ordinary_close_combat_consumer",
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

function openChoice(stateInput, action, expected, options) {
  const context = contextFor(
    stateInput,
    action.sideKey,
    action.pieceId,
    action.targetId,
    options.matchBinding,
  );
  if (!context.plan.stimpacked || !context.grant || !context.status) {
    fail("MARINE_MULTI_MODEL_PRECISION_CONTEXT_REQUIRED");
  }
  const enumerated = PRECISION.enumerateSelections({
    plan: context.plan,
    grant: context.grant,
    status: context.status,
    reveals: options.chanceReveals,
  });
  const pendingBody = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_PENDING_SCHEMA,
    round: Number(stateInput.round),
    phase: "combat",
    ownerSideKey: action.sideKey,
    attackerPieceId: action.pieceId,
    targetPieceId: action.targetId,
    weaponName: context.plan.weapon.weaponName,
    triggerActionHash: hashStarcraftTmgContract(expected),
    attackPlan: clone(context.plan),
    precisionGrant: clone(context.grant),
    hitReveal: clone(enumerated.hitReveal),
    chanceReveals: clone(enumerated.reveals),
    precisionSelections: clone(enumerated.selections),
    statusEffectHash: context.plan.statusEffectHash,
    markerHash: context.plan.markerHash,
    abilityUseHash: context.plan.abilityUseHash,
    trainingTruth: false,
  };
  const pending = {
    ...pendingBody,
    pendingHash: hashStarcraftTmgContract(pendingBody),
  };
  const state = clone(stateInput);
  state.pendingAction = pending;
  const events = [{
    type: "marine_multi_model_close_combat_precision_choice_opened",
    sideKey: action.sideKey,
    pieceId: action.pieceId,
    targetId: action.targetId,
    weaponName: context.plan.weapon.weaponName,
    attackDice: context.plan.attackDice,
    fightingModelIds: [...context.plan.fightingModelIds],
    supportingModelIds: [...context.plan.supportingModelIds],
    pendingHash: pending.pendingHash,
    failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
    maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
    legalSelectionCount: pending.precisionSelections.length,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_marine_multi_model_close_combat_precision_pending_transition_v2",
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    pendingAction: pending,
    rulesTruth: "official_multi_model_close_combat_precision_choice_opened",
    trainingTruth: false,
  };
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function normalizeReveals(reveals, chance) {
  if (!Array.isArray(reveals) || reveals.length !== chance.count) {
    fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : chance.faces;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== chance.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > chance.faces) {
      fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_REVEAL_INVALID");
    }
    return outcome;
  });
}

function destroyRemainingTargetModel(target, targetModel) {
  targetModel.isDestroyed = true;
  targetModel.isOnField = false;
  target.currentModels = 0;
  target.currentSupply = 0;
  target.damageMarker = 0;
  target.isDestroyed = true;
  target.isOnField = false;
  target.destroyedModelIds = [...new Set([
    ...(target.destroyedModelIds || []),
    targetModel.id,
  ])].sort((left, right) => left.localeCompare(right));
}

function activateCombatAndPass(state, piece, sideKey) {
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    combat: true,
  };
  state.activeSideKey = otherSide(sideKey);
}

function applyDamage(state, context, damage, sideKey) {
  const piece = state.pieces.find((entry) => entry.id === context.plan.attackerPieceId);
  const target = state.pieces.find((entry) => entry.id === context.plan.targetPieceId);
  const targetModel = activeModels(target)[0];
  if (!targetModel) fail("MARINE_MULTI_MODEL_TARGET_MODEL_STALE");
  const priorDamageMarker = Number(target.damageMarker || 0);
  const totalDamage = priorDamageMarker + damage;
  const targetDestroyed = totalDamage >= 2;
  if (targetDestroyed) destroyRemainingTargetModel(target, targetModel);
  else target.damageMarker = totalDamage;
  activateCombatAndPass(state, piece, sideKey);
  return {
    piece,
    target,
    targetModel,
    priorDamageMarker,
    totalDamage,
    targetDestroyed,
  };
}

function resolveOrdinary(stateInput, action, expected, options) {
  const context = contextFor(
    stateInput,
    action.sideKey,
    action.pieceId,
    action.targetId,
    options.matchBinding,
  );
  if (context.plan.stimpacked
    || context.plan.precisionValue !== 0
    || action.statusEffectHash !== null
    || action.markerHash !== null
    || action.precisionGrantHash !== null) {
    fail("MARINE_MULTI_MODEL_ORDINARY_PRECISION_FORBIDDEN");
  }
  const rolls = normalizeReveals(options.chanceReveals, context.plan.chance);
  const hitRolls = rolls.slice(0, context.plan.attackDice);
  const preallocatedArmourRolls = rolls.slice(context.plan.attackDice);
  const hits = hitRolls.filter((roll) => (
    rollSucceeds(roll, context.plan.weapon.hitThreshold)
  )).length;
  const armourRolls = preallocatedArmourRolls.slice(0, hits);
  const saves = armourRolls.filter((roll) => rollSucceeds(roll, 5)).length;
  const damagePoolDice = hits - saves;
  const state = clone(stateInput);
  const damage = applyDamage(
    state,
    context,
    damagePoolDice * context.plan.weapon.damage,
    action.sideKey,
  );
  const event = {
    type: "close_combat_attack",
    subtype: "marine_multi_model_ordinary_close_combat",
    sideKey: action.sideKey,
    pieceId: damage.piece.id,
    targetId: damage.target.id,
    targetModelId: damage.targetModel.id,
    weaponName: context.plan.weapon.weaponName,
    replacedWeaponName: context.plan.unitWideLoadout.replacedWeaponName,
    attackPlanHash: context.plan.planHash,
    modelLedgerHash: context.plan.attackerLedger.modelLedgerHash,
    unitWideLoadoutHash: context.plan.unitWideLoadout.unitWideLoadoutHash,
    preEngagementGraphHash: context.plan.engagementGraphHash,
    fightingModelIds: [...context.plan.fightingModelIds],
    supportingModelIds: [...context.plan.supportingModelIds],
    attackPool: {
      dice: context.plan.attackDice,
      rolls: hitRolls,
      hitThreshold: context.plan.weapon.hitThreshold,
      naturalOneAlwaysFails: true,
      naturalSixAlwaysSucceeds: true,
      hits,
    },
    precision: { available: false },
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: {
      dice: hits,
      rolls: armourRolls,
      unusedPreallocatedRolls: preallocatedArmourRolls.slice(hits),
      armourThreshold: 5,
      saves,
    },
    evadePool: { dice: 0, rolls: [], reason: "no_close_combat_evade_grant" },
    damagePool: {
      dice: damagePoolDice,
      damagePerDie: context.plan.weapon.damage,
      priorDamageMarker: damage.priorDamageMarker,
      totalDamage: damage.totalDamage,
    },
    casualtyModelIds: damage.targetDestroyed ? [damage.targetModel.id] : [],
    postDamageMarker: Number(damage.target.damageMarker || 0),
    targetDestroyed: damage.targetDestroyed,
    trainingTruth: false,
  };
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_marine_multi_model_ordinary_close_combat_transition_v2",
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    rulesTruth: "official_current_marine_multi_model_ordinary_close_combat",
    trainingTruth: false,
  };
}

function resolveChoice(stateInput, action, expected, options) {
  const pending = verifyPending(stateInput.pendingAction);
  const context = currentPendingContext(stateInput, pending, options);
  const selection = pending.precisionSelections.find((entry) => (
    entry.precisionSelectionHash === action.precisionSelectionHash
  ));
  if (!selection || !isDeepStrictEqual(
    selection.convertedFailedDieIndices,
    action.convertedFailedDieIndices,
  )) {
    fail("MARINE_MULTI_MODEL_PRECISION_SELECTION_STALE");
  }
  const resolution = PRECISION.resolve({
    plan: pending.attackPlan,
    grant: pending.precisionGrant,
    status: context.status,
    reveals: pending.chanceReveals,
    selection,
  });
  const state = clone(stateInput);
  delete state.pendingAction;
  const damage = applyDamage(
    state,
    context,
    resolution.stages.damage.totalDamage,
    pending.ownerSideKey,
  );
  const event = {
    type: "close_combat_attack",
    subtype: "marine_multi_model_stimpack_precision_consumer",
    sideKey: pending.ownerSideKey,
    pieceId: damage.piece.id,
    targetId: damage.target.id,
    targetModelId: damage.targetModel.id,
    weaponName: pending.weaponName,
    replacedWeaponName: context.plan.unitWideLoadout.replacedWeaponName,
    precisionKernelHash: PRECISION.descriptor.kernelHash,
    attackPlanHash: pending.attackPlan.planHash,
    attackResolutionHash: resolution.resolutionHash,
    modelLedgerHash: context.plan.attackerLedger.modelLedgerHash,
    unitWideLoadoutHash: context.plan.unitWideLoadout.unitWideLoadoutHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    preEngagementGraphHash: context.plan.engagementGraphHash,
    fightingModelIds: [...context.plan.fightingModelIds],
    supportingModelIds: [...context.plan.supportingModelIds],
    attackPool: clone(resolution.stages.hit),
    precision: clone(resolution.stages.effects),
    surgePool: { dice: 0, rolls: [], matches: 0 },
    armourPool: clone(resolution.stages.armour),
    evadePool: clone(resolution.stages.evade),
    damagePool: {
      ...clone(resolution.stages.damage),
      priorDamageMarker: damage.priorDamageMarker,
      totalDamage: damage.totalDamage,
    },
    casualtyModelIds: damage.targetDestroyed ? [damage.targetModel.id] : [],
    postDamageMarker: Number(damage.target.damageMarker || 0),
    targetDestroyed: damage.targetDestroyed,
    trainingTruth: false,
  };
  const events = [event];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(expected),
    events: clone(events),
  });
  return {
    ok: true,
    schemaVersion:
      "starcraft_tmg_official_marine_multi_model_close_combat_precision_resolution_transition_v2",
    executorId: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: expected,
    attackResolution: resolution,
    rulesTruth:
      "official_current_marine_multi_model_stimpack_close_combat_precision",
    trainingTruth: false,
  };
}

export function applyOfficialMarineMultiModelStimpackCloseCombatV2(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || ![
      OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId
      !== OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_EXECUTOR_VERSION) {
    fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineMultiModelStimpackCloseCombatV2(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => (
    isDeepStrictEqual(candidate, actionInput)
  ));
  if (!expected) fail("MARINE_MULTI_MODEL_CLOSE_COMBAT_ACTION_STALE");
  if (actionInput.actionType
    === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_ACTION_TYPE) {
    return resolveChoice(stateInput, actionInput, expected, options);
  }
  if (actionInput.resolutionMode === "multi_model_ordinary_no_precision") {
    return resolveOrdinary(stateInput, actionInput, expected, options);
  }
  return openChoice(stateInput, actionInput, expected, options);
}
