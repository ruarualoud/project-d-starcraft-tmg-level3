import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { deriveOfficialEngagementGraphV2 } from "./official-engagement-graph-v2.mjs";

export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID =
  "authority.close-combat-lifecycle-v1";
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE =
  "resolve_close_combat_lifecycle_procedure";
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND =
  "official_close_combat_lifecycle_target_v1";
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PENDING_SCHEMA =
  "starcraft_tmg_official_close_combat_lifecycle_pending_v1";

export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-engagement-range-rule-uses:954f1b5a5411",
  "rule-atom:singleton:core-11-melee-engagement-range:c6f3423284fa",
  "rule-atom:singleton:core-8-8-1-close-combat-evade:000737dd199a",
  "rule-atom:singleton:core-8-8-1-freed-unit-pass-state:29975a0059c7",
  "rule-atom:singleton:core-8-8-1-freed-unit-reaction-exception:1e5563872d7d",
  "rule-atom:singleton:core-8-8-1-melee-surge-target:34851e16c463",
  "rule-atom:singleton:core-8-8-1-multiple-enemy-attack-eligibility:26d220ba9c55",
  "rule-atom:singleton:core-8-8-remove-combat-marker:4245666a4eb3",
].sort());
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS;
export const OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ATOM_IDS =
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
function integer(value, min, max, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) fail(code);
  return parsed;
}
function activePiece(piece) {
  return piece?.isOnField === true && piece?.isDestroyed !== true
    && Number(piece?.currentModels || 0) > 0;
}
function activeModels(piece) {
  return (piece?.models || []).filter((model) => (
    model?.isOnField !== false && model?.isDestroyed !== true
  ));
}
function verifySourceLock(state) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const bundle = state?.officialGameplayDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || bundle?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle?.repositoryFallbackAllowed !== false || bundle?.trainingTruth !== false) {
    fail("CLOSE_COMBAT_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
  }
}
function tags(piece) {
  return [...new Set([
    ...(piece?.combatTags || []), piece?.combatTag,
  ].filter(Boolean).map((value) => String(value).toLowerCase()))].sort();
}
function unitPairEdges(graph, leftId, rightId) {
  return graph.modelEdges.filter((edge) => (
    (edge.leftUnitId === leftId && edge.rightUnitId === rightId)
      || (edge.leftUnitId === rightId && edge.rightUnitId === leftId)
  ));
}
function actorModelId(edge, actorId) {
  return edge.leftUnitId === actorId ? edge.leftModelId : edge.rightModelId;
}
function milli(value, code) {
  const result = Math.round(Number(value) * 1000);
  if (!Number.isSafeInteger(result)) fail(code);
  return result;
}
function supportingModelIds(actor, fightingModelIds) {
  const models = activeModels(actor);
  const fighting = new Set(fightingModelIds);
  const rankModels = models.filter((model) => fighting.has(model.id));
  return models.filter((model) => !fighting.has(model.id) && rankModels.some((front) => {
    if (model.elevation !== front.elevation) return false;
    const distance = Math.hypot(
      milli(model.xInches, "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID")
        - milli(front.xInches, "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID"),
      milli(model.yInches, "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID")
        - milli(front.yInches, "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID"),
    );
    const radii = (milli(model.baseWidthInches,
      "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID")
      + milli(front.baseWidthInches,
        "CLOSE_COMBAT_LIFECYCLE_MODEL_GEOMETRY_INVALID")) / 2;
    return Math.abs(distance - radii) <= 1;
  })).map((model) => model.id).sort();
}
function targetOptions(state, actor, graph) {
  return state.pieces.filter((target) => (
    activePiece(target) && target.sideKey !== actor.sideKey
      && String(target.combatTag || "").toLowerCase() === "ground"
  )).map((target) => {
    const fightingModelIds = [...new Set(unitPairEdges(graph, actor.id, target.id)
      .map((edge) => actorModelId(edge, actor.id)))].sort();
    const supportingIds = supportingModelIds(actor, fightingModelIds);
    return { targetUnitId: target.id, fightingModelIds,
      supportingModelIds: supportingIds,
      eligibleAttackerModelIds: [...new Set([...fightingModelIds, ...supportingIds])].sort(),
      targetCombatTags: tags(target) };
  }).filter((entry) => entry.eligibleAttackerModelIds.length > 0)
    .sort((a, b) => a.targetUnitId.localeCompare(b.targetUnitId));
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => ({ id: piece.id, sideKey: piece.sideKey,
      currentModels: piece.currentModels, damageMarker: piece.damageMarker,
      isOnField: piece.isOnField, isDestroyed: piece.isDestroyed,
      activationMarker: piece.activationMarker,
      activatedPhases: piece.activatedPhases, effectivePassPhases: piece.effectivePassPhases,
      models: piece.models })).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    board: { widthInches: state.board?.widthInches,
      heightInches: state.board?.heightInches,
      terrain: state.board?.terrain || [], accessPoints: state.board?.accessPoints || [],
      engagementGeometry: state.board?.engagementGeometry },
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialCloseCombatLifecyclePendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput);
  verifySourceLock(state);
  if (state.rulesProcedureMode !== true || state.phase !== "combat" || state.pendingAction) {
    fail("CLOSE_COMBAT_LIFECYCLE_PROCEDURE_MODE_REQUIRED");
  }
  const actor = state.pieces?.find((piece) => piece.id === procedure.actorUnitId);
  if (!activePiece(actor) || actor.sideKey !== String(procedure.sideKey || state.activeSideKey)
    || String(actor.combatTag || "").toLowerCase() !== "ground"
    || actor.activationMarker !== "assault"
    || actor.activatedPhases?.combat === true
    || Number(actor.effectivePassPhases?.combat) === Number(state.round)) {
    fail("CLOSE_COMBAT_LIFECYCLE_ACTOR_INVALID");
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const options = targetOptions(state, actor, graph);
  if (options.length === 0) fail("CLOSE_COMBAT_LIFECYCLE_NO_ELIGIBLE_TARGET");
  for (const option of options) {
    const target = state.pieces.find((piece) => piece.id === option.targetUnitId);
    if (Number(target.currentModels) !== 1 || activeModels(target).length !== 1) {
      fail("CLOSE_COMBAT_LIFECYCLE_TARGET_SCOPE_UNSUPPORTED", target.id);
    }
  }
  const surgeTargetTags = [...new Set((procedure.surgeTargetTags || [])
    .map((value) => String(value).toLowerCase()))].sort();
  const closeCombatEvadeGranted = procedure.closeCombatEvadeGranted === true;
  const body = {
    schema: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PENDING_SCHEMA,
    stage: "choose_engaged_target_then_resolve_close_combat_lifecycle",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    actorUnitId: actor.id, eligibleTargets: options,
    profile: {
      meleeRange: "E", engagementRangeMilliInches: 1000,
      attackDicePerEligibleModel: integer(procedure.attackDicePerEligibleModel, 1, 100,
        "CLOSE_COMBAT_LIFECYCLE_ATTACK_DICE_INVALID"),
      hitThreshold: integer(procedure.hitThreshold, 2, 6,
        "CLOSE_COMBAT_LIFECYCLE_HIT_INVALID"),
      surgeResult: integer(procedure.surgeResult || 0, 0, 100,
        "CLOSE_COMBAT_LIFECYCLE_SURGE_INVALID"),
      surgeTargetTags,
      armourThreshold: integer(procedure.armourThreshold, 2, 6,
        "CLOSE_COMBAT_LIFECYCLE_ARMOUR_INVALID"),
      closeCombatEvadeGranted,
      evadeThreshold: closeCombatEvadeGranted
        ? integer(procedure.evadeThreshold, 2, 6,
          "CLOSE_COMBAT_LIFECYCLE_EVADE_INVALID") : null,
      damageCharacteristic: integer(procedure.damageCharacteristic, 1, 100,
        "CLOSE_COMBAT_LIFECYCLE_DAMAGE_INVALID"),
      hitPointsPerModel: integer(procedure.hitPointsPerModel, 1, 100,
        "CLOSE_COMBAT_LIFECYCLE_HP_INVALID"),
    },
    preEngagementGraphHash: graph.graphHash,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction), engagementGraph: graph };
}

function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || state?.phase !== "combat" || !object(pending)
    || pending.schema !== OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("CLOSE_COMBAT_LIFECYCLE_PENDING_INVALID");
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  if (graph.graphHash !== pending.preEngagementGraphHash) {
    fail("CLOSE_COMBAT_LIFECYCLE_ENGAGEMENT_DRIFT");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const eligibleTargetUnitIds = pending.eligibleTargets.map((entry) => entry.targetUnitId);
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE,
    pieceId: pending.actorUnitId,
    executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["targetUnitId"],
      targetUnitId: { enum: eligibleTargetUnitIds },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      meleeRange: "E", engagementRangeMilliInches: 1000,
      eligibleTargetUnitIds, targetEligibilityByUnit: clone(pending.eligibleTargets),
      closeCombatEvadeRequiresExplicitGrant: true, productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_close_combat_lifecycle_procedure_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialCloseCombatLifecycleV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE,
      executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
      executorVersion: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
function targetId(parameters, domain) {
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.targetUnitId !== "string"
    || !domain.constraints.eligibleTargetUnitIds.includes(parameters.targetUnitId)) {
    fail("CLOSE_COMBAT_LIFECYCLE_TARGET_SELECTION_INVALID");
  }
  return parameters.targetUnitId;
}
export function instantiateOfficialCloseCombatLifecycleV1(
  state, domain, parameters, options = {},
) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("CLOSE_COMBAT_LIFECYCLE_PARAMETER_DOMAIN_STALE");
  }
  const selectedTargetId = targetId(parameters, domain);
  const pending = state.pendingAction;
  const target = pending.eligibleTargets.find((entry) => (
    entry.targetUnitId === selectedTargetId
  ));
  const attackDice = target.eligibleAttackerModelIds.length
    * pending.profile.attackDicePerEligibleModel;
  const surgeDice = pending.profile.surgeResult > 0 ? 1 : 0;
  const evadeDice = pending.profile.closeCombatEvadeGranted ? attackDice : 0;
  return { action: {
    actionType: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE,
    sideKey: pending.sideKey, phase: pending.phase, pieceId: pending.actorUnitId,
    targetUnitId: selectedTargetId,
    ruleAtomIds: [...OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
    pendingHash: pending.pendingHash, domainId: domain.domainId,
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: attackDice + surgeDice + attackDice + evadeDice,
      layout: { hit: attackDice, surge: surgeDice,
        armour: attackDice, evade: evadeDice },
      revealOrder: ["attack", "surge", "armour", "evade"] },
    isEnabled: true, disabledReason: "", score: 1,
    details: { productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { targetUnitId: selectedTargetId } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function reveals(input, count) {
  if (!Array.isArray(input) || input.length !== count) {
    fail("CLOSE_COMBAT_LIFECYCLE_REVEALS_REQUIRED");
  }
  return input.map((entry, index) => {
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    const faces = object(entry) ? Number(entry.faces) : 6;
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("CLOSE_COMBAT_LIFECYCLE_REVEAL_INVALID", String(index));
    }
    return outcome;
  });
}
function passes(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

export function applyOfficialCloseCombatLifecycleV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_CLOSE_COMBAT_LIFECYCLE_ACTION_ATOM_IDS])) {
    fail("CLOSE_COMBAT_LIFECYCLE_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const expected = instantiateOfficialCloseCombatLifecycleV1(stateInput, domain,
    { targetUnitId: actionInput.targetUnitId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("CLOSE_COMBAT_LIFECYCLE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  const targetEligibility = pending.eligibleTargets.find((entry) => (
    entry.targetUnitId === actionInput.targetUnitId
  ));
  const rolls = reveals(options.chanceReveals, actionInput.chance.count);
  const attackCount = actionInput.chance.layout.hit;
  const surgeCount = actionInput.chance.layout.surge;
  const attackRolls = rolls.slice(0, attackCount);
  const surgeRolls = rolls.slice(attackCount, attackCount + surgeCount);
  const hits = attackRolls.filter((roll) => passes(roll, pending.profile.hitThreshold)).length;
  const surgeMatched = pending.profile.surgeTargetTags.some((tag) => (
    targetEligibility.targetCombatTags.includes(tag)
  ));
  const bypass = surgeMatched && surgeCount > 0
    ? Math.min(hits, surgeRolls[0], pending.profile.surgeResult) : 0;
  const armourPool = hits - bypass;
  const armourStart = attackCount + surgeCount;
  const armourRolls = rolls.slice(armourStart, armourStart + armourPool);
  const armourSaves = armourRolls.filter((roll) => (
    passes(roll, pending.profile.armourThreshold)
  )).length;
  const damageBeforeEvade = bypass + armourPool - armourSaves;
  const evadeStart = armourStart + attackCount;
  const evadeRolls = pending.profile.closeCombatEvadeGranted
    ? rolls.slice(evadeStart, evadeStart + damageBeforeEvade) : [];
  const evadeSaves = evadeRolls.filter((roll) => (
    passes(roll, pending.profile.evadeThreshold)
  )).length;
  const damageDice = damageBeforeEvade - evadeSaves;
  const totalDamage = damageDice * pending.profile.damageCharacteristic;
  const state = clone(stateInput);
  state.pendingAction = null;
  const actor = state.pieces.find((piece) => piece.id === pending.actorUnitId);
  const target = state.pieces.find((piece) => piece.id === actionInput.targetUnitId);
  const priorDamage = Number(target.damageMarker || 0);
  const casualty = priorDamage + totalDamage >= pending.profile.hitPointsPerModel;
  if (casualty) {
    const model = activeModels(target)[0];
    model.isDestroyed = true; model.isOnField = false;
    target.currentModels = 0; target.currentSupply = 0; target.damageMarker = 0;
    target.isDestroyed = true; target.isOnField = false;
  } else {
    target.damageMarker = priorDamage + totalDamage;
  }
  actor.activatedPhases = { ...(actor.activatedPhases || {}), combat: true };
  actor.activationMarker = null;
  const preGraph = deriveOfficialEngagementGraphV2(stateInput);
  const postGraph = deriveOfficialEngagementGraphV2(state);
  const freedUnitIds = preGraph.engagedUnitIds.filter((unitId) => (
    !postGraph.engagedUnitIds.includes(unitId)
      && activePiece(state.pieces.find((piece) => piece.id === unitId))
  )).sort();
  const effectivelyPassedUnitIds = [];
  for (const unitId of freedUnitIds) {
    const unit = state.pieces.find((piece) => piece.id === unitId);
    unit.combatEngaged = false;
    if (unit.activatedPhases?.combat !== true) {
      unit.effectivePassPhases = { ...(unit.effectivePassPhases || {}),
        combat: Number(state.round) };
      unit.combatPassState = { round: Number(state.round), phase: "combat",
        reason: "freed_from_combat_before_activation", effectivePass: true,
        actsNormallyFromNextRound: true };
      unit.reactionEligibility = { ...(unit.reactionEligibility || {}),
        combat: "allowed_by_reaction_or_specific_trigger" };
      effectivelyPassedUnitIds.push(unitId);
    }
  }
  const result = {
    schema: "starcraft_tmg_official_close_combat_lifecycle_resolution_v1",
    actorUnitId: actor.id, targetUnitId: target.id,
    meleeRange: "E", engagementRangeMilliInches: 1000,
    eligibleTargetUnitIds: pending.eligibleTargets.map((entry) => entry.targetUnitId),
    fightingModelIds: targetEligibility.fightingModelIds,
    supportingModelIds: targetEligibility.supportingModelIds,
    eligibleAttackerModelIds: targetEligibility.eligibleAttackerModelIds,
    targetCombatTags: targetEligibility.targetCombatTags,
    attackRolls, hits, surgeRolls, surgeMatched, armourBypassDice: bypass,
    armourRolls, armourSaves,
    closeCombatEvadeGranted: pending.profile.closeCombatEvadeGranted,
    evadeRolls, evadeSaves, damageDice, totalDamage, targetDestroyed: casualty,
    combatActivationMarkerRemoved: actor.activationMarker === null,
    preEngagementGraphHash: preGraph.graphHash,
    postEngagementGraphHash: postGraph.graphHash,
    freedUnitIds, effectivelyPassedUnitIds,
    freedUnitReactionExceptionPreserved: effectivelyPassedUnitIds.every((unitId) => (
      state.pieces.find((piece) => piece.id === unitId)
        ?.reactionEligibility?.combat === "allowed_by_reaction_or_specific_trigger"
    )),
    productionQuarantined: true, trainingTruth: false,
  };
  state.lastCloseCombatLifecycleResolution = result;
  const event = { type: "close_combat_lifecycle_resolved", sideKey: actor.sideKey,
    actorUnitId: actor.id, targetUnitId: target.id, result: clone(result),
    trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "close_combat_lifecycle_resolution",
    round: Number(state.round), phase: state.phase, sideKey: actor.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_close_combat_lifecycle_transition_v1",
    executorId: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_ID,
    executorVersion: OFFICIAL_CLOSE_COMBAT_LIFECYCLE_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_close_combat_lifecycle_procedure_resolved",
    trainingTruth: false };
}
