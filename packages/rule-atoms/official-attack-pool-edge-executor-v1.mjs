import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID = "authority.attack-pool-edge-v1";
export const OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ATTACK_POOL_EDGE_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE = "resolve_attack_pool_edge_procedure";
export const OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND =
  "official_attack_pool_edge_resolution_v1";
export const OFFICIAL_ATTACK_POOL_EDGE_PENDING_SCHEMA =
  "starcraft_tmg_official_attack_pool_edge_pending_v1";

export const OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:hits-x-damage-characteristic",
  "rule-atom:hits-x-no-surge",
  "rule-atom:singleton:core-11-concentrated-fire-casualty-cap:3753f38b416e",
  "rule-atom:singleton:core-11-hits-x-automatic-armour-pool:c05706bd114c",
  "rule-atom:singleton:core-11-long-range-mixed-batch-rolls:b7a652cacfdb",
  "rule-atom:singleton:core-11-tough-failed-armour-conversion:0a2a2bc86577",
  "rule-atom:singleton:core-12-7-unengaged-excess-damage-discard:7bf5c3a95870",
  "rule-atom:singleton:core-12-7-unengaged-visible-casualty-cap:05c28fc58578",
  "rule-atom:singleton:core-8-7-3-reduced-dice-selection:3d21b6a6c10d",
  "rule-atom:singleton:core-8-7-4-armour-roll-bypass:08ccc34b18d4",
  "rule-atom:singleton:core-8-7-4-mixed-modifier-dice:9cdaaf5e3929",
  "rule-atom:singleton:core-8-7-4-surge-mismatch:b9aa5efd84ab",
  "rule-atom:singleton:core-8-7-4-three-pool-overview:31f2f1b34a9d",
].sort());

const LONG_RANGE_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-long-range-maximum:c5fc24657625",
  "rule-atom:singleton:core-11-long-range-penalty:bfcf5fad2012",
  "rule-atom:singleton:core-11-long-range-profile-band:30550cff03b1",
].sort());
export const OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([...OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS,
    ...LONG_RANGE_DEPENDENCY_ATOM_IDS]),
].sort());
export const OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ATOM_IDS =
  OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS;

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }
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
    fail("ATTACK_POOL_EDGE_SOURCE_LOCK_BINDING_INVALID");
  }
}
function integer(value, min, max, code) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) fail(code);
  return parsed;
}
function tags(values, code) {
  const result = [...new Set((values || []).map((value) => String(value).toLowerCase()))].sort();
  if (result.length === 0) fail(code);
  return result;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase, activeSideKey: state.activeSideKey,
    pieces: (state.pieces || []).map((piece) => ({ id: piece.id, sideKey: piece.sideKey,
      currentModels: piece.currentModels, damageMarker: piece.damageMarker,
      isOnField: piece.isOnField, isDestroyed: piece.isDestroyed })).sort((a, b) => (
      String(a.id).localeCompare(String(b.id))
    )),
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialAttackPoolEdgePendingV1(stateInput, procedure = {}) {
  const state = clone(stateInput); verifySourceLock(state);
  if (state.rulesProcedureMode !== true || state.pendingAction) {
    fail("ATTACK_POOL_EDGE_PROCEDURE_MODE_REQUIRED");
  }
  const kind = String(procedure.kind || "");
  if (!["attack_batch", "hits_x"].includes(kind)) fail("ATTACK_POOL_EDGE_KIND_INVALID");
  const target = state.pieces?.find((piece) => piece.id === procedure.targetUnitId);
  if (!target || target.isOnField !== true || target.isDestroyed === true) {
    fail("ATTACK_POOL_EDGE_TARGET_INVALID");
  }
  const targetCombatTag = String(procedure.targetCombatTag || target.combatTag || "").toLowerCase();
  const common = {
    targetUnitId: target.id, targetCombatTag,
    armourThreshold: integer(procedure.armourThreshold, 2, 6,
      "ATTACK_POOL_EDGE_ARMOUR_INVALID"),
    hitPointsPerModel: integer(procedure.hitPointsPerModel, 1, 100,
      "ATTACK_POOL_EDGE_HP_INVALID"),
    visibleModelCount: integer(procedure.visibleModelCount, 0,
      Number(target.currentModels || 0), "ATTACK_POOL_EDGE_VISIBLE_COUNT_INVALID"),
    concentratedFireCap: procedure.concentratedFireCap === null
      || procedure.concentratedFireCap === undefined ? null
      : integer(procedure.concentratedFireCap, 0, 100,
        "ATTACK_POOL_EDGE_CONCENTRATED_FIRE_INVALID"),
    tough: integer(procedure.tough || 0, 0, 100, "ATTACK_POOL_EDGE_TOUGH_INVALID"),
  };
  let profile;
  if (kind === "hits_x") {
    profile = {
      automaticHits: integer(procedure.automaticHits, 1, 100,
        "ATTACK_POOL_EDGE_HITS_X_INVALID"),
      damageCharacteristic: integer(procedure.damageCharacteristic, 1, 100,
        "ATTACK_POOL_EDGE_DAMAGE_INVALID"),
      surgeGenerated: false,
    };
  } else {
    const dice = (procedure.attackDice || []).map((entry) => ({
      dieId: String(entry?.dieId || ""), modelId: String(entry?.modelId || ""),
      rangeBand: String(entry?.rangeBand || ""),
      hitTargetModifier: integer(entry?.hitTargetModifier || 0, -5, 5,
        "ATTACK_POOL_EDGE_HIT_MODIFIER_INVALID"),
    }));
    if (dice.length === 0 || dice.some((entry) => !entry.dieId || !entry.modelId
      || !["standard", "long"].includes(entry.rangeBand))
      || new Set(dice.map((entry) => entry.dieId)).size !== dice.length) {
      fail("ATTACK_POOL_EDGE_DICE_INVALID");
    }
    profile = {
      attackDice: dice.sort((a, b) => a.dieId.localeCompare(b.dieId)),
      hitThreshold: integer(procedure.hitThreshold, 2, 6,
        "ATTACK_POOL_EDGE_HIT_INVALID"),
      reductionCount: integer(procedure.reductionCount || 0, 0, dice.length,
        "ATTACK_POOL_EDGE_REDUCTION_INVALID"),
      reductionSelectionOwner: "controller_of_unit_resolving_reduction",
      surgeResult: integer(procedure.surgeResult || 0, 0, 100,
        "ATTACK_POOL_EDGE_SURGE_INVALID"),
      surgeTargetTags: tags(procedure.surgeTargetTags || ["none"],
        "ATTACK_POOL_EDGE_SURGE_TAG_INVALID"),
      damageCharacteristic: integer(procedure.damageCharacteristic, 1, 100,
        "ATTACK_POOL_EDGE_DAMAGE_INVALID"),
    };
  }
  const body = {
    schema: OFFICIAL_ATTACK_POOL_EDGE_PENDING_SCHEMA,
    stage: "select_reduced_dice_then_resolve_three_pools",
    kind, round: Number(state.round), phase: state.phase,
    sideKey: String(procedure.sideKey || state.activeSideKey),
    ...common, profile,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    stateProjectionHash: "", productionQuarantined: true, trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state) {
  verifySourceLock(state);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_ATTACK_POOL_EDGE_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.productionQuarantined !== true || pending.trainingTruth !== false) {
    fail("ATTACK_POOL_EDGE_PENDING_INVALID");
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state);
  const reductionCount = pending.kind === "attack_batch" ? pending.profile.reductionCount : 0;
  const eligibleDieIds = pending.kind === "attack_batch"
    ? pending.profile.attackDice.map((entry) => entry.dieId) : [];
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE, pieceId: pending.targetUnitId,
    executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["removedDieIds"],
      removedDieIds: { exactCount: reductionCount, eligibleDieIds },
      selectionOwner: pending.kind === "attack_batch"
        ? pending.profile.reductionSelectionOwner : "none" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash, kind: pending.kind,
      eligibleDieIds, reductionCount, threePoolOrder: ["attack", "armour", "damage"],
      longRangePenalty: 1, mixedBandsRollSeparately: true,
      visibleModelCount: pending.visibleModelCount,
      concentratedFireCap: pending.concentratedFireCap, tough: pending.tough,
      productionQuarantined: true },
    confirmationClass: "explicit_human",
    rulesTruth: "official_attack_pool_edge_procedure_conformance",
    trainingTruth: false,
  };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}
export function enumerateOfficialAttackPoolEdgeV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema !== OFFICIAL_ATTACK_POOL_EDGE_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try { parameterDomains.push(domainFor(state, options)); } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE,
      executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
      executorVersion: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS],
      isEnabled: false, disabledReason: String(error?.message || error).split(':')[0],
      score: 0, details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}
function removedIds(domain, parameters) {
  if (!object(parameters) || !Array.isArray(parameters.removedDieIds)
    || Object.keys(parameters).some((key) => key !== "removedDieIds")) {
    fail("ATTACK_POOL_EDGE_PARAMETERS_INVALID");
  }
  const ids = parameters.removedDieIds.map(String).sort();
  if (ids.length !== domain.constraints.reductionCount
    || new Set(ids).size !== ids.length
    || ids.some((id) => !domain.constraints.eligibleDieIds.includes(id))) {
    fail("ATTACK_POOL_EDGE_REDUCED_DICE_SELECTION_INVALID");
  }
  return ids;
}
export function instantiateOfficialAttackPoolEdgeV1(state, domain, parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ATTACK_POOL_EDGE_PARAMETER_DOMAIN_STALE");
  const removedDieIds = removedIds(domain, parameters);
  const pending = state.pendingAction;
  const attackRollCount = pending.kind === "attack_batch"
    ? pending.profile.attackDice.length - removedDieIds.length : 0;
  const maximumArmourRollCount = pending.kind === "hits_x"
    ? pending.profile.automaticHits : attackRollCount;
  return { action: {
    actionType: OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE,
    sideKey: pending.sideKey, phase: pending.phase, pieceId: pending.targetUnitId,
    ruleAtomIds: [...OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
    pendingHash: pending.pendingHash, domainId: domain.domainId, removedDieIds,
    chance: { kind: "fixed_roll_sequence", faces: 6,
      count: attackRollCount + maximumArmourRollCount,
      layout: { hit: attackRollCount, armour: maximumArmourRollCount,
        evade: 0, surge: 0 } },
    isEnabled: true, disabledReason: "", score: 1,
    details: { productionQuarantined: true, trainingTruth: false },
  }, canonicalParameters: { removedDieIds } };
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function reveals(input, count) {
  if (!Array.isArray(input) || input.length !== count) fail("ATTACK_POOL_EDGE_REVEALS_REQUIRED");
  return input.map((entry, index) => {
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    const faces = object(entry) ? Number(entry.faces) : 6;
    if (faces !== 6 || !Number.isSafeInteger(outcome) || outcome < 1 || outcome > 6) {
      fail("ATTACK_POOL_EDGE_REVEAL_INVALID", String(index));
    }
    return outcome;
  });
}
function casualtyResolution(pending, totalDamage) {
  const naturalKills = Math.floor(totalDamage / pending.hitPointsPerModel);
  const cap = Math.min(pending.visibleModelCount,
    pending.concentratedFireCap === null ? Infinity : pending.concentratedFireCap);
  const casualties = Math.min(naturalKills, cap);
  let remaining = totalDamage - casualties * pending.hitPointsPerModel;
  const capped = casualties >= cap && totalDamage > casualties * pending.hitPointsPerModel;
  const excessDamageDiscarded = capped ? remaining : 0;
  if (capped) remaining = 0;
  return { casualties, cap, concentratedFireApplied: pending.concentratedFireCap !== null,
    visibleCasualtyCapApplied: true, excessDamageDiscarded,
    damageMarkerRecorded: remaining };
}
export function applyOfficialAttackPoolEdgeV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput) || actionInput.actionType !== OFFICIAL_ATTACK_POOL_EDGE_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ATTACK_POOL_EDGE_ACTION_ATOM_IDS])) fail("ATTACK_POOL_EDGE_ACTION_INVALID");
  const domain = domainFor(stateInput, options);
  const expected = instantiateOfficialAttackPoolEdgeV1(stateInput, domain,
    { removedDieIds: actionInput.removedDieIds }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ATTACK_POOL_EDGE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput);
  const dice = reveals(options.chanceReveals, actionInput.chance.count);
  let attackDice = []; let attackRolls = []; let hitSuccesses = 0;
  let armourPoolBeforeBypass;
  let surgeMatched = false; let armourBypassDice = 0; let hitGroups = [];
  if (pending.kind === "hits_x") {
    armourPoolBeforeBypass = pending.profile.automaticHits;
  } else {
    const removed = new Set(actionInput.removedDieIds);
    attackDice = pending.profile.attackDice.filter((entry) => !removed.has(entry.dieId));
    attackRolls = dice.slice(0, attackDice.length);
    const outcomes = attackDice.map((entry, index) => {
      const longRangePenalty = entry.rangeBand === "long" ? 1 : 0;
      const targetNumber = Math.max(2, Math.min(6,
        pending.profile.hitThreshold + longRangePenalty + entry.hitTargetModifier));
      return { ...entry, roll: attackRolls[index], targetNumber,
        success: attackRolls[index] >= targetNumber };
    });
    hitSuccesses = outcomes.filter((entry) => entry.success).length;
    hitGroups = ["standard", "long"].map((rangeBand) => ({ rangeBand,
      results: outcomes.filter((entry) => entry.rangeBand === rangeBand) }))
      .filter((entry) => entry.results.length > 0);
    armourPoolBeforeBypass = hitSuccesses;
    surgeMatched = pending.profile.surgeTargetTags.includes(pending.targetCombatTag);
    armourBypassDice = surgeMatched
      ? Math.min(pending.profile.surgeResult, armourPoolBeforeBypass) : 0;
  }
  const armourPoolRolled = armourPoolBeforeBypass - armourBypassDice;
  const armourOffset = attackDice.length;
  const armourRolls = dice.slice(armourOffset, armourOffset + armourPoolRolled);
  const naturalSaves = armourRolls.filter((roll) => roll >= pending.armourThreshold).length;
  const failedArmour = armourRolls.length - naturalSaves;
  const toughConverted = Math.min(pending.tough, failedArmour);
  const armourSuccesses = naturalSaves + toughConverted;
  const damagePoolDice = armourBypassDice + (failedArmour - toughConverted);
  const totalDamage = damagePoolDice * pending.profile.damageCharacteristic;
  const casualties = casualtyResolution(pending, totalDamage);
  const result = {
    schema: "starcraft_tmg_official_attack_pool_edge_resolution_v1",
    kind: pending.kind, removedDieIds: [...actionInput.removedDieIds],
    reductionSelectionOwner: pending.kind === "attack_batch"
      ? pending.profile.reductionSelectionOwner : "none",
    hitGroups, rolledMixedRangeBandsSeparately: hitGroups.length > 1,
    hitSuccesses, automaticHits: pending.kind === "hits_x"
      ? pending.profile.automaticHits : 0,
    armourPoolBeforeBypass, surgeGenerated: pending.kind !== "hits_x",
    surgeMatched, surgeIgnoredForMismatch: pending.kind === "attack_batch"
      && pending.profile.surgeResult > 0 && !surgeMatched,
    armourBypassDice, armourRolls, naturalSaves, toughConverted,
    armourSuccesses, damagePoolDice, damageCharacteristic: pending.profile.damageCharacteristic,
    totalDamage, ...casualties, poolOrder: ["attack", "armour", "damage"],
    productionQuarantined: true, trainingTruth: false,
  };
  const state = clone(stateInput); state.pendingAction = null;
  state.lastAttackPoolEdgeResolution = result;
  const event = { type: "attack_pool_edge_procedure_resolved", sideKey: pending.sideKey,
    targetUnitId: pending.targetUnitId, result: clone(result), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "attack_pool_edge_resolution", round: Number(state.round),
    phase: state.phase, sideKey: pending.sideKey, action: clone(actionInput),
    events: [clone(event)], trainingTruth: false });
  return { ok: true, schemaVersion: "starcraft_tmg_official_attack_pool_edge_transition_v1",
    executorId: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
    executorVersion: OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_attack_pool_edge_procedure_resolved",
    trainingTruth: false };
}
