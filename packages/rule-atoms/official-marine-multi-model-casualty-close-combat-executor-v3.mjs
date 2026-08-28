import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from
  "./official-engagement-graph-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatDenominatorV2,
} from "./official-marine-multi-model-close-combat-denominator-v2.mjs";
import {
  createOfficialMarineMultiModelCloseCombatPrecisionKernelV3,
} from "./official-marine-multi-model-close-combat-precision-kernel-v3.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS,
} from "./official-marine-multi-model-stimpack-close-combat-executor-v2.mjs";
import {
  OFFICIAL_STIMPACK_STATUS_SCHEMA,
} from "./official-marine-stimpack-kernel-v1.mjs";
import {
  createOfficialMultiModelCasualtyResolutionKernelV1,
} from "./official-multi-model-casualty-resolution-kernel-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID =
  "authority.marine-multi-model-casualty-close-combat-v3";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION =
  "3.0.0";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v3.receipt";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE =
  "fight";
export const OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE =
  "resolve_multi_model_close_combat_precision";
export const OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE =
  "resolve_multi_model_close_combat_casualties";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_pending_v3";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_casualty_pending_v1";
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_NEW_ATOM_IDS =
  Object.freeze([]);
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ACTION_ATOM_IDS =
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_CLOSE_COMBAT_ACTION_ATOM_IDS;
export const OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ATOM_IDS =
  OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ACTION_ATOM_IDS;

const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const DENOMINATOR = createOfficialMarineMultiModelCloseCombatDenominatorV2();
const PRECISION = createOfficialMarineMultiModelCloseCombatPrecisionKernelV3();
const CASUALTIES = createOfficialMultiModelCasualtyResolutionKernelV1();

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
  fail("MARINE_MULTI_MODEL_CASUALTY_SIDE_REQUIRED");
}

function runtimeHash(options) {
  const value = String(options.matchBinding?.rulesRuntimeBinding?.runtimeHash || "");
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_RUNTIME_HASH_REQUIRED");
  }
  return value;
}

function statusFor(piece, plan) {
  if (!plan.stimpacked) return null;
  const rows = (piece?.statuses || []).filter((status) => (
    status?.schema === OFFICIAL_STIMPACK_STATUS_SCHEMA
      && status?.statusEffectHash === plan.statusEffectHash
  ));
  if (rows.length !== 1) fail("MARINE_MULTI_MODEL_CASUALTY_PRECISION_STATUS_STALE");
  return rows[0];
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
  const grant = plan.stimpacked ? PRECISION.createGrant({ plan, status }) : null;
  return { plan, piece, target, status, grant };
}

function projectedAttackState(state, attackerSideKey) {
  const projected = clone(state);
  delete projected.pendingAction;
  projected.activeSideKey = attackerSideKey;
  return projected;
}

function attackAction(context) {
  const plan = context.plan;
  return {
    actionType: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
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
      ? "multi_model_precision_then_casualty_choice"
      : "multi_model_ordinary_then_casualty_choice",
    attackPlanHash: plan.planHash,
    statusEffectHash: plan.statusEffectHash,
    markerHash: plan.markerHash,
    precisionGrantHash: context.grant?.precisionGrantHash || null,
    chance: clone(plan.chance),
    ruleAtomIds: [...OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function precisionAction(pending, selection) {
  return {
    actionType: OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE,
    sideKey: pending.ownerSideKey,
    phase: "combat",
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    weaponName: pending.weaponName,
    pendingHash: pending.pendingHash,
    attackPlanHash: pending.attackPlan.planHash,
    hitRevealHash: pending.hitReveal.hitRevealHash,
    precisionGrantHash: pending.precisionGrant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
    convertedCount: selection.convertedCount,
    ruleAtomIds: [...OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function casualtyAction(pending, selection) {
  return {
    actionType: OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
    sideKey: pending.ownerSideKey,
    phase: "combat",
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    weaponName: pending.weaponName,
    pendingHash: pending.pendingHash,
    attackPlanHash: pending.attackPlan.planHash,
    casualtyDomainHash: pending.casualtyDomain.domainHash,
    casualtySelectionHash: selection.selectionHash,
    casualtyModelIds: [...selection.casualtyModelIds],
    ruleAtomIds: [...OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
  };
}

function verifyPending(pending, schema) {
  if (!object(pending)
    || pending.schema !== schema
    || !SIDE_KEYS.includes(pending.ownerSideKey)
    || !SIDE_KEYS.includes(pending.attackerSideKey)
    || pending.phase !== "combat"
    || !object(pending.attackPlan)
    || pending.trainingTruth !== false
    || pending.pendingHash !== hashStarcraftTmgContract(without(pending, ["pendingHash"]))) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PENDING_INVALID");
  }
  return pending;
}

function currentContext(state, pending, options) {
  const context = contextFor(
    projectedAttackState(state, pending.attackerSideKey),
    pending.attackerSideKey,
    pending.attackerPieceId,
    pending.targetPieceId,
    options.matchBinding,
  );
  if (!isDeepStrictEqual(context.plan, pending.attackPlan)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PENDING_STATE_DRIFT");
  }
  return context;
}

function verifyPrecisionPending(state, options) {
  const pending = verifyPending(
    state.pendingAction,
    OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA,
  );
  if (!object(pending.precisionGrant)
    || !object(pending.hitReveal)
    || !Array.isArray(pending.chanceReveals)
    || !Array.isArray(pending.precisionSelections)
    || pending.precisionSelections.length < 1) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_INVALID");
  }
  const context = currentContext(state, pending, options);
  if (!context.plan.stimpacked || !isDeepStrictEqual(context.grant, pending.precisionGrant)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_STATE_DRIFT");
  }
  PRECISION.verifyGrant({
    plan: context.plan,
    grant: pending.precisionGrant,
    status: context.status,
  });
  return { pending, context };
}

function createCasualtyDomain(state, context, damage, attackResolutionHash, options) {
  return CASUALTIES.createDomain({
    targetPiece: context.target,
    targetHitPoints: context.plan.targetHitPoints,
    visibleModelIds: [...context.plan.targetLedger.activeModelIds],
    engagementGraph: deriveOfficialEngagementGraphV2(state),
    priorDamageMarker: context.plan.targetPriorDamageMarker,
    incomingDamage: damage,
    attackResolutionHash,
    rulesRuntimeHash: runtimeHash(options),
  });
}

function verifyCasualtyPending(state, options) {
  const pending = verifyPending(
    state.pendingAction,
    OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA,
  );
  if (!object(pending.attackResolution)
    || !object(pending.casualtyDomain)
    || !Array.isArray(pending.casualtyDomain.legalSelections)
    || pending.casualtyDomain.legalSelections.length < 2) {
    fail("MARINE_MULTI_MODEL_CASUALTY_CHOICE_PENDING_INVALID");
  }
  const projected = projectedAttackState(state, pending.attackerSideKey);
  const context = currentContext(state, pending, options);
  const domain = createCasualtyDomain(
    projected,
    context,
    pending.attackResolution.incomingDamage,
    pending.attackResolution.attackResolutionHash,
    options,
  );
  if (!isDeepStrictEqual(domain, pending.casualtyDomain)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_CHOICE_PENDING_STATE_DRIFT");
  }
  return { pending, context, domain };
}

export function isOfficialMarineMultiModelCasualtyCloseCombatPendingV3(state) {
  return [
    OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA,
    OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA,
  ].includes(state?.pendingAction?.schema);
}

export function enumerateOfficialMarineMultiModelCasualtyCloseCombatV3(
  state,
  options = {},
) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  if (!SIDE_KEYS.includes(sideKey)) {
    if (options.throwOnError === true) fail("MARINE_MULTI_MODEL_CASUALTY_SIDE_REQUIRED");
    return [];
  }
  try {
    if (state?.pendingAction?.schema
      === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA) {
      const { pending } = verifyPrecisionPending(state, options);
      if (state.phase !== "combat"
        || state.activeSideKey !== pending.ownerSideKey
        || sideKey !== pending.ownerSideKey) {
        fail("MARINE_MULTI_MODEL_CASUALTY_PENDING_WRONG_SEAT");
      }
      return pending.precisionSelections.map((selection) => ({
        ...precisionAction(pending, selection),
        isEnabled: true,
        disabledReason: "",
        score: 430 + selection.convertedCount,
        details: {
          choiceTiming: "after_hit_roll_before_armour_pool",
          failedHitDieIndices: [...pending.hitReveal.failedHitDieIndices],
          maximumConvertedDice: pending.hitReveal.maximumConvertedDice,
          rulesTruth: "official_multi_model_precision_exact_choice_domain_v3",
          trainingTruth: false,
        },
      }));
    }
    if (state?.pendingAction?.schema === OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA) {
      const { pending } = verifyCasualtyPending(state, options);
      if (state.phase !== "combat"
        || state.activeSideKey !== pending.ownerSideKey
        || sideKey !== pending.ownerSideKey) {
        fail("MARINE_MULTI_MODEL_CASUALTY_PENDING_WRONG_SEAT");
      }
      return pending.casualtyDomain.legalSelections.map((selection) => ({
        ...casualtyAction(pending, selection),
        isEnabled: true,
        disabledReason: "",
        score: 440,
        details: {
          choiceOwner: "defending_unit_controller",
          prioritySequence: [...selection.casualtyModelIds],
          remainingEngagedEnemyUnitIds: [...selection.remainingEngagedEnemyUnitIds],
          postDamageMarker: selection.postDamageMarker,
          rulesTruth: pending.casualtyDomain.rulesTruth,
          trainingTruth: false,
        },
      }));
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
            score: context.plan.stimpacked ? 425 : 420,
            details: {
              denominatorHash: DENOMINATOR.descriptor.denominatorHash,
              precisionKernelHash: context.plan.stimpacked
                ? PRECISION.descriptor.kernelHash
                : null,
              casualtyKernelHash: CASUALTIES.descriptor.kernelHash,
              attackerModelLedgerHash: context.plan.attackerLedger.modelLedgerHash,
              targetModelLedgerHash: context.plan.targetLedger.modelLedgerHash,
              fightingModelIds: [...context.plan.fightingModelIds],
              supportingModelIds: [...context.plan.supportingModelIds],
              attackDice: context.plan.attackDice,
              rulesTruth: "official_current_multi_model_close_combat_casualty_consumer",
              trainingTruth: false,
            },
          });
        } catch (error) {
          // The executor is intentionally a strict current-data denominator.
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
  } catch (error) {
    if (options.throwOnError === true) throw error;
    return [];
  }
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function normalizeReveals(reveals, chance) {
  if (!Array.isArray(reveals) || reveals.length !== chance.count) {
    fail("MARINE_MULTI_MODEL_CASUALTY_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : chance.faces;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== chance.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > chance.faces) {
      fail("MARINE_MULTI_MODEL_CASUALTY_REVEAL_INVALID");
    }
    return outcome;
  });
}

function ordinaryResolution(context, reveals) {
  const rolls = normalizeReveals(reveals, context.plan.chance);
  const hitRolls = rolls.slice(0, context.plan.attackDice);
  const preallocatedArmourRolls = rolls.slice(context.plan.attackDice);
  const hits = hitRolls.filter((roll) => (
    rollSucceeds(roll, context.plan.weapon.hitThreshold)
  )).length;
  const armourRolls = preallocatedArmourRolls.slice(0, hits);
  const saves = armourRolls.filter((roll) => rollSucceeds(roll, 5)).length;
  const damagePoolDice = hits - saves;
  const body = {
    schema: "starcraft_tmg_official_marine_multi_model_attack_resolution_v3",
    attackPlanHash: context.plan.planHash,
    hit: {
      dice: context.plan.attackDice,
      rolls: hitRolls,
      hitThreshold: context.plan.weapon.hitThreshold,
      hits,
    },
    precision: { available: false },
    armour: {
      dice: hits,
      rolls: armourRolls,
      unusedPreallocatedRolls: preallocatedArmourRolls.slice(hits),
      armourThreshold: 5,
      saves,
    },
    incomingDamage: damagePoolDice * context.plan.weapon.damage,
    trainingTruth: false,
  };
  return { ...body, attackResolutionHash: hashStarcraftTmgContract(body) };
}

function openPrecision(stateInput, expected, context, options) {
  const enumerated = PRECISION.enumerateSelections({
    plan: context.plan,
    grant: context.grant,
    status: context.status,
    reveals: options.chanceReveals,
  });
  const body = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PRECISION_PENDING_SCHEMA,
    round: Number(stateInput.round),
    phase: "combat",
    ownerSideKey: context.plan.sideKey,
    attackerSideKey: context.plan.sideKey,
    attackerPieceId: context.plan.attackerPieceId,
    targetPieceId: context.plan.targetPieceId,
    weaponName: context.plan.weapon.weaponName,
    triggerActionHash: hashStarcraftTmgContract(expected),
    attackPlan: clone(context.plan),
    precisionGrant: clone(context.grant),
    hitReveal: clone(enumerated.hitReveal),
    chanceReveals: clone(enumerated.reveals),
    precisionSelections: clone(enumerated.selections),
    trainingTruth: false,
  };
  const pending = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  const state = clone(stateInput);
  state.pendingAction = pending;
  const events = [{
    type: "marine_multi_model_close_combat_precision_choice_opened",
    sideKey: pending.ownerSideKey,
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    pendingHash: pending.pendingHash,
    legalSelectionCount: pending.precisionSelections.length,
    trainingTruth: false,
  }];
  appendLog(state, expected, events);
  return transition(state, expected, events, options, {
    pendingAction: pending,
    rulesTruth: "official_multi_model_close_combat_precision_choice_opened_v3",
  });
}

function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 1),
    phase: "combat",
    action: clone(action),
    events: clone(events),
  });
}

function transition(state, action, events, options, extras = {}) {
  return {
    ok: true,
    schemaVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_TRANSITION_SCHEMA,
    executorId: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID,
    executorVersion: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action,
    rulesTruth: extras.rulesTruth || "official_multi_model_casualty_resolution_v3",
    trainingTruth: false,
    ...extras,
  };
}

function openCasualtyChoice(
  stateInput,
  expected,
  context,
  attackResolution,
  casualtyDomain,
  options,
) {
  const body = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_PENDING_SCHEMA,
    round: Number(stateInput.round),
    phase: "combat",
    ownerSideKey: otherSide(context.plan.sideKey),
    attackerSideKey: context.plan.sideKey,
    attackerPieceId: context.plan.attackerPieceId,
    targetPieceId: context.plan.targetPieceId,
    weaponName: context.plan.weapon.weaponName,
    triggerActionHash: hashStarcraftTmgContract(expected),
    attackPlan: clone(context.plan),
    attackResolution: clone(attackResolution),
    casualtyDomain: clone(casualtyDomain),
    trainingTruth: false,
  };
  const pending = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  const state = clone(stateInput);
  delete state.pendingAction;
  state.pendingAction = pending;
  state.activeSideKey = pending.ownerSideKey;
  const events = [{
    type: "marine_multi_model_casualty_choice_opened",
    sideKey: pending.ownerSideKey,
    attackerSideKey: pending.attackerSideKey,
    pieceId: pending.attackerPieceId,
    targetId: pending.targetPieceId,
    pendingHash: pending.pendingHash,
    casualtyDomainHash: casualtyDomain.domainHash,
    casualtyCount: casualtyDomain.casualtyCount,
    legalSelectionCount: casualtyDomain.legalSelections.length,
    trainingTruth: false,
  }];
  appendLog(state, expected, events);
  return transition(state, expected, events, options, {
    pendingAction: pending,
    attackResolution,
    casualtyDomain,
    rulesTruth: "official_defender_owned_multi_model_casualty_choice_opened",
  });
}

function supplyAt(count) {
  if (count <= 3) return 0;
  if (count <= 6) return 1;
  return 2;
}

function finishCasualties(
  stateInput,
  expected,
  context,
  attackResolution,
  casualtyDomain,
  selection,
  options,
) {
  const resolution = CASUALTIES.resolve({
    domain: casualtyDomain,
    selectionHash: selection.selectionHash,
  });
  const state = clone(stateInput);
  delete state.pendingAction;
  const piece = state.pieces.find((entry) => entry.id === context.plan.attackerPieceId);
  const target = state.pieces.find((entry) => entry.id === context.plan.targetPieceId);
  for (const model of target.models) {
    if (resolution.casualtyModelIds.includes(model.id)) {
      model.isDestroyed = true;
      model.isOnField = false;
    }
  }
  target.destroyedModelIds = [...new Set([
    ...(target.destroyedModelIds || []),
    ...resolution.casualtyModelIds,
  ])].sort((left, right) => left.localeCompare(right));
  target.currentModels = resolution.remainingModelIds.length;
  target.currentSupply = supplyAt(target.currentModels);
  target.damageMarker = resolution.postDamageMarker;
  target.isDestroyed = resolution.targetDestroyed;
  target.isOnField = !resolution.targetDestroyed;
  piece.activatedPhases = {
    movement: false,
    assault: false,
    combat: false,
    ...(piece.activatedPhases || {}),
    combat: true,
  };
  state.activeSideKey = otherSide(context.plan.sideKey);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const event = {
    type: "close_combat_attack",
    subtype: context.plan.stimpacked
      ? "marine_multi_model_stimpack_precision_casualty_consumer"
      : "marine_multi_model_ordinary_casualty_consumer",
    sideKey: context.plan.sideKey,
    pieceId: piece.id,
    targetId: target.id,
    weaponName: context.plan.weapon.weaponName,
    attackPlanHash: context.plan.planHash,
    attackResolutionHash: attackResolution.attackResolutionHash,
    casualtyKernelHash: CASUALTIES.descriptor.kernelHash,
    casualtyDomainHash: casualtyDomain.domainHash,
    casualtySelectionHash: selection.selectionHash,
    casualtyResolutionHash: resolution.resolutionHash,
    preEngagementGraphHash: context.plan.engagementGraphHash,
    postEngagementGraphHash: postGraph.graphHash,
    attackPool: clone(attackResolution.hit),
    precision: clone(attackResolution.precision),
    armourPool: clone(attackResolution.armour),
    damagePool: {
      incomingDamage: attackResolution.incomingDamage,
      priorDamageMarker: casualtyDomain.priorDamageMarker,
      totalDamage: casualtyDomain.totalDamage,
      discardedOverflowDamage: resolution.discardedOverflowDamage,
    },
    casualtyModelIds: [...resolution.casualtyModelIds],
    remainingModelIds: [...resolution.remainingModelIds],
    remainingEngagedEnemyUnitIds: [...resolution.remainingEngagedEnemyUnitIds],
    postDamageMarker: resolution.postDamageMarker,
    targetCurrentModels: target.currentModels,
    targetCurrentSupply: target.currentSupply,
    targetDestroyed: resolution.targetDestroyed,
    trainingTruth: false,
  };
  const events = [event];
  appendLog(state, expected, events);
  return transition(state, expected, events, options, {
    attackResolution,
    casualtyDomain,
    casualtyResolution: resolution,
    engagementGraph: postGraph,
    rulesTruth: "official_current_multi_model_close_combat_casualty_settlement",
  });
}

function stageCasualties(stateInput, expected, context, attackResolution, options) {
  const projected = clone(stateInput);
  delete projected.pendingAction;
  projected.activeSideKey = context.plan.sideKey;
  const domain = createCasualtyDomain(
    projected,
    context,
    attackResolution.incomingDamage,
    attackResolution.attackResolutionHash,
    options,
  );
  if (domain.legalSelections.length > 1) {
    return openCasualtyChoice(
      stateInput,
      expected,
      context,
      attackResolution,
      domain,
      options,
    );
  }
  return finishCasualties(
    stateInput,
    expected,
    context,
    attackResolution,
    domain,
    domain.legalSelections[0],
    options,
  );
}

function resolvePrecision(stateInput, action, expected, options) {
  const { pending, context } = verifyPrecisionPending(stateInput, options);
  const selection = pending.precisionSelections.find((entry) => (
    entry.precisionSelectionHash === action.precisionSelectionHash
  ));
  if (!selection || !isDeepStrictEqual(
    selection.convertedFailedDieIndices,
    action.convertedFailedDieIndices,
  )) {
    fail("MARINE_MULTI_MODEL_CASUALTY_PRECISION_SELECTION_STALE");
  }
  const resolution = PRECISION.resolve({
    plan: pending.attackPlan,
    grant: pending.precisionGrant,
    status: context.status,
    reveals: pending.chanceReveals,
    selection,
  });
  const attackResolution = {
    schema: "starcraft_tmg_official_marine_multi_model_precision_attack_resolution_v3",
    attackPlanHash: context.plan.planHash,
    hit: clone(resolution.stages.hit),
    precision: clone(resolution.stages.effects),
    armour: clone(resolution.stages.armour),
    incomingDamage: resolution.stages.damage.totalDamage,
    precisionResolutionHash: resolution.resolutionHash,
    attackResolutionHash: resolution.resolutionHash,
    trainingTruth: false,
  };
  return stageCasualties(stateInput, expected, context, attackResolution, options);
}

function resolveCasualtyChoice(stateInput, action, expected, options) {
  const { pending, context, domain } = verifyCasualtyPending(stateInput, options);
  const selection = domain.legalSelections.find((entry) => (
    entry.selectionHash === action.casualtySelectionHash
  ));
  if (!selection || !isDeepStrictEqual(selection.casualtyModelIds, action.casualtyModelIds)) {
    fail("MARINE_MULTI_MODEL_CASUALTY_SELECTION_STALE");
  }
  return finishCasualties(
    stateInput,
    expected,
    context,
    pending.attackResolution,
    domain,
    selection,
    options,
  );
}

export function applyOfficialMarineMultiModelCasualtyCloseCombatV3(
  stateInput,
  actionInput,
  options = {},
) {
  if (!object(actionInput)
    || ![
      OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_ATTACK_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE,
      OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE,
    ].includes(actionInput.actionType)
    || actionInput.executorId
      !== OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_ID
    || actionInput.executorVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_CASUALTY_CLOSE_COMBAT_EXECUTOR_VERSION) {
    fail("MARINE_MULTI_MODEL_CASUALTY_ACTION_INVALID");
  }
  const expected = enumerateOfficialMarineMultiModelCasualtyCloseCombatV3(stateInput, {
    sideKey: actionInput.sideKey,
    matchBinding: options.matchBinding,
    throwOnError: true,
  }).map(actionFromCandidate).find((candidate) => isDeepStrictEqual(candidate, actionInput));
  if (!expected) fail("MARINE_MULTI_MODEL_CASUALTY_ACTION_STALE");
  if (actionInput.actionType === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTIES_ACTION_TYPE) {
    return resolveCasualtyChoice(stateInput, actionInput, expected, options);
  }
  if (actionInput.actionType
    === OFFICIAL_RESOLVE_MARINE_MULTI_MODEL_CASUALTY_PRECISION_ACTION_TYPE) {
    return resolvePrecision(stateInput, actionInput, expected, options);
  }
  const context = contextFor(
    stateInput,
    actionInput.sideKey,
    actionInput.pieceId,
    actionInput.targetId,
    options.matchBinding,
  );
  if (context.plan.stimpacked) return openPrecision(stateInput, expected, context, options);
  if (actionInput.statusEffectHash !== null
    || actionInput.markerHash !== null
    || actionInput.precisionGrantHash !== null) {
    fail("MARINE_MULTI_MODEL_CASUALTY_ORDINARY_PRECISION_FORBIDDEN");
  }
  return stageCasualties(
    stateInput,
    expected,
    context,
    ordinaryResolution(context, options.chanceReveals),
    options,
  );
}
