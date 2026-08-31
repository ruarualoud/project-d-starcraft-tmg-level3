import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAbilityTimingPriorityDataBundleV1 } from
  "../source-data/official-ability-timing-priority-data-bundle-v1.mjs";
import { verifyOfficialKeywordSpecialAbilityDataBundleV1 } from
  "../source-data/official-keyword-special-ability-data-bundle-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "ability_type_comparison", "end_of_round_order", "passive_priority",
  "reaction_default_duration", "reaction_priority",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}
function exactTwoSides(value, code) {
  if (!Array.isArray(value) || value.length !== 2) fail(code);
  const sides = value.map((entry) => nonEmpty(entry, code));
  if (new Set(sides).size !== 2) fail(code);
  return sides;
}
function exactPermutation(expected, actual, code) {
  if (!Array.isArray(actual) || !isDeepStrictEqual([...actual].sort(), [...expected].sort())) {
    fail(code);
  }
  return [...actual];
}
function abilityById(bundle, abilityId, category) {
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  const ability = bundle.specialAbilities.find((entry) => entry.abilityId === abilityId);
  if (!ability || ability.category !== category) {
    fail("ABILITY_TIMING_PRIORITY_CATEGORY_INVALID", String(abilityId || ""));
  }
  return ability;
}
function verifyBundles(timingBundle, abilityBundle) {
  verifyOfficialAbilityTimingPriorityDataBundleV1(timingBundle, abilityBundle);
  verifyOfficialKeywordSpecialAbilityDataBundleV1(abilityBundle);
}
function commonEntry(raw, category, abilityBundle, sideSet, triggerId) {
  const effectId = nonEmpty(raw?.effectId, "ABILITY_TIMING_PRIORITY_EFFECT_INVALID");
  const controllerSideKey = nonEmpty(raw?.controllerSideKey,
    "ABILITY_TIMING_PRIORITY_SIDE_INVALID");
  if (!sideSet.has(controllerSideKey) || raw.triggerId !== triggerId) {
    fail("ABILITY_TIMING_PRIORITY_TRIGGER_SET_INVALID", effectId);
  }
  const ability = abilityById(abilityBundle, raw.abilityId, category);
  if (raw.sourceEffectHash !== ability.definitionHash) {
    fail("ABILITY_TIMING_PRIORITY_SOURCE_EFFECT_INVALID", effectId);
  }
  return { effectId, controllerSideKey, triggerId, abilityId: ability.abilityId,
    abilityName: ability.name, category, sourceEffectHash: ability.definitionHash };
}

export function resolveOfficialAbilityTypeComparisonV1(input = {}) {
  const timingBundle = input.timingDataBundle;
  const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  if (input.rulesOwnedComparisonRequested !== true
    || input.clientSuppliedComparison !== undefined) {
    fail("ABILITY_TYPE_COMPARISON_REQUEST_INVALID");
  }
  const body = {
    schema: "starcraft_tmg_official_ability_type_comparison_v1",
    comparison: structuredClone(timingBundle.abilityTypeComparison),
    comparisonHash: timingBundle.abilityTypeComparisonHash,
    categories: ["active", "passive", "reaction"],
    officialAbilityIndexHash: abilityBundle.specialAbilityIndexHash,
    rulesOwnedComparison: true, clientSuppliedComparisonAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialPassivePriorityV1(input = {}) {
  const timingBundle = input.timingDataBundle;
  const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  const sides = exactTwoSides(input.playerSideKeys, "PASSIVE_PRIORITY_TWO_PLAYERS_REQUIRED");
  const sideSet = new Set(sides);
  const activeSideKey = nonEmpty(input.activeSideKey, "PASSIVE_PRIORITY_ACTIVE_PLAYER_REQUIRED");
  const triggerId = nonEmpty(input.triggerId, "PASSIVE_PRIORITY_TRIGGER_REQUIRED");
  if (!sideSet.has(activeSideKey) || input.simultaneousSetComplete !== true
    || !Array.isArray(input.effects) || input.effects.length < 2 || input.effects.length > 128
    || !object(input.orderBySide)) fail("PASSIVE_PRIORITY_COMPLETE_SET_REQUIRED");
  const ids = new Set();
  const effects = input.effects.map((raw) => {
    const entry = commonEntry(raw, "passive", abilityBundle, sideSet, triggerId);
    if (ids.has(entry.effectId)) fail("ABILITY_TIMING_PRIORITY_EFFECT_DUPLICATE", entry.effectId);
    ids.add(entry.effectId); return entry;
  });
  const opponentSideKey = sides.find((entry) => entry !== activeSideKey);
  const sideSequence = [activeSideKey, opponentSideKey];
  const ordered = sideSequence.flatMap((sideKey) => {
    const owned = effects.filter((entry) => entry.controllerSideKey === sideKey);
    if (owned.length === 0) return [];
    const order = exactPermutation(owned.map((entry) => entry.effectId),
      input.orderBySide[sideKey], "PASSIVE_PRIORITY_CONTROLLER_ORDER_INVALID");
    return order.map((effectId, withinControllerOrdinal) => ({
      ...owned.find((entry) => entry.effectId === effectId),
      withinControllerOrdinal, activePlayerGroup: sideKey === activeSideKey,
    }));
  }).map((entry, resolutionOrdinal) => ({ ...entry, resolutionOrdinal }));
  if (ordered.length !== effects.length) fail("PASSIVE_PRIORITY_COMPLETE_SET_REQUIRED");
  const body = {
    schema: "starcraft_tmg_official_passive_priority_resolution_v1",
    triggerId, activeSideKey, opponentSideKey, simultaneousEffectCount: effects.length,
    sequence: ordered, controllingPlayerChoosesOwnOrder: true,
    activePlayerPassivesResolveBeforeOpponentPassives: true,
    arbitraryEffectExecutionPerformed: false,
    consumerMustFullyResolveEachEffectBeforeNext: true,
    clientSuppliedFinalPriorityAccepted: false, trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialReactionPriorityV1(input = {}) {
  const timingBundle = input.timingDataBundle;
  const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  const sides = exactTwoSides(input.playerSideKeys, "REACTION_PRIORITY_TWO_PLAYERS_REQUIRED");
  const sideSet = new Set(sides);
  const activeSideKey = nonEmpty(input.activeSideKey, "REACTION_PRIORITY_ACTIVE_PLAYER_REQUIRED");
  const triggerId = nonEmpty(input.triggerId, "REACTION_PRIORITY_TRIGGER_REQUIRED");
  if (!sideSet.has(activeSideKey) || input.simultaneousSetComplete !== true
    || !Array.isArray(input.reactions) || input.reactions.length !== 2) {
    fail("REACTION_PRIORITY_COMPLETE_SET_REQUIRED");
  }
  const ids = new Set(); const controllers = new Set();
  const reactions = input.reactions.map((raw) => {
    const entry = commonEntry(raw, "reaction", abilityBundle, sideSet, triggerId);
    if (ids.has(entry.effectId) || controllers.has(entry.controllerSideKey)) {
      fail("REACTION_PRIORITY_ONE_PER_PLAYER_PER_ACTIVATION_REQUIRED");
    }
    ids.add(entry.effectId); controllers.add(entry.controllerSideKey); return entry;
  });
  if (controllers.size !== 2) fail("REACTION_PRIORITY_COMPLETE_SET_REQUIRED");
  const opponentSideKey = sides.find((entry) => entry !== activeSideKey);
  const sequence = [activeSideKey, opponentSideKey].map((sideKey, resolutionOrdinal) => ({
    ...reactions.find((entry) => entry.controllerSideKey === sideKey), resolutionOrdinal,
  }));
  const body = {
    schema: "starcraft_tmg_official_reaction_priority_resolution_v1",
    triggerId, activeSideKey, opponentSideKey, sequence,
    activePlayerReactionResolvesFirst: true,
    opponentReactionResolvesSecond: true,
    arbitraryReactionEffectExecutionPerformed: false,
    consumerMustFullyResolveEachReactionBeforeNext: true,
    oneReactionPerPlayerPerActivationDependencyRequired: true,
    clientSuppliedFinalPriorityAccepted: false, trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialReactionDefaultDurationV1(input = {}) {
  const timingBundle = input.timingDataBundle;
  const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  const ability = abilityById(abilityBundle, input.abilityId, "reaction");
  const effectInstanceId = nonEmpty(input.effectInstanceId,
    "REACTION_DURATION_EFFECT_INSTANCE_REQUIRED");
  if (input.subjectKind !== "reaction_modifier_or_effect_without_explicit_duration"
    || input.rulesOwnedSpecificDurationAuditComplete !== true) {
    fail("REACTION_SPECIFIC_DURATION_AUDIT_REQUIRED");
  }
  if (input.specificDurationOverrideApplies !== false) {
    fail("REACTION_SPECIFIC_DURATION_EXECUTOR_REQUIRED", ability.abilityId);
  }
  if (input.clientSuppliedExpiry !== undefined) fail("REACTION_CLIENT_EXPIRY_FORBIDDEN");
  const body = {
    schema: "starcraft_tmg_official_reaction_default_duration_resolution_v1",
    effectInstanceId, subjectKind: input.subjectKind,
    abilityId: ability.abilityId, abilityName: ability.name,
    definitionHash: ability.definitionHash, category: "reaction",
    specificDurationOverrideApplies: false,
    effectiveThroughAllEndOfRoundEffects: true,
    removalBoundary: "cleanup_and_refresh_after_end_of_round_effects",
    defaultExpiresAtEndOfCurrentRound: true,
    permanentOrImmediateRulesChangesReinterpretedAsDurationEffects: false,
    individualEffectMutationPerformed: false,
    clientSuppliedExpiryAccepted: false, trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialEndOfRoundEffectOrderV1(input = {}) {
  const timingBundle = input.timingDataBundle;
  const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  const sides = exactTwoSides(input.playerSideKeys,
    "END_OF_ROUND_ORDER_TWO_PLAYERS_REQUIRED");
  const sideSet = new Set(sides);
  const firstPlayerSideKey = nonEmpty(input.firstPlayerSideKey,
    "END_OF_ROUND_ORDER_FIRST_PLAYER_REQUIRED");
  if (!sideSet.has(firstPlayerSideKey) || input.effectSetComplete !== true
    || !Array.isArray(input.effects) || input.effects.length < 1 || input.effects.length > 256
    || !object(input.orderBySide)) fail("END_OF_ROUND_ORDER_COMPLETE_SET_REQUIRED");
  const ids = new Set();
  const effects = input.effects.map((raw) => {
    const effectId = nonEmpty(raw?.effectId, "END_OF_ROUND_EFFECT_INVALID");
    const controllerSideKey = nonEmpty(raw?.controllerSideKey,
      "END_OF_ROUND_EFFECT_INVALID");
    const sourceEffectHash = nonEmpty(raw?.sourceEffectHash, "END_OF_ROUND_EFFECT_INVALID");
    if (ids.has(effectId) || !sideSet.has(controllerSideKey)
      || !/^[a-f0-9]{64}$/u.test(sourceEffectHash)) {
      fail("END_OF_ROUND_EFFECT_INVALID", effectId);
    }
    ids.add(effectId); return { effectId, controllerSideKey, sourceEffectHash };
  });
  const opponentSideKey = sides.find((entry) => entry !== firstPlayerSideKey);
  const sequence = [firstPlayerSideKey, opponentSideKey].flatMap((sideKey) => {
    const owned = effects.filter((entry) => entry.controllerSideKey === sideKey);
    if (owned.length === 0) return [];
    const order = exactPermutation(owned.map((entry) => entry.effectId),
      input.orderBySide[sideKey], "END_OF_ROUND_CONTROLLER_ORDER_INVALID");
    return order.map((effectId, withinControllerOrdinal) => ({
      ...owned.find((entry) => entry.effectId === effectId), withinControllerOrdinal,
      firstPlayerGroup: sideKey === firstPlayerSideKey,
    }));
  }).map((entry, resolutionOrdinal) => ({ ...entry, resolutionOrdinal,
    requiresPreviousResolutionReceipt: resolutionOrdinal > 0 }));
  if (sequence.length !== effects.length) fail("END_OF_ROUND_ORDER_COMPLETE_SET_REQUIRED");
  const body = {
    schema: "starcraft_tmg_official_end_of_round_effect_order_resolution_v1",
    firstPlayerSideKey, opponentSideKey, effectCount: effects.length, sequence,
    firstPlayerResolvesAllEffectsFirst: true,
    controllingPlayerChoosesOwnOrder: true,
    eachEffectMustFullyResolveBeforeNext: true,
    arbitraryEffectExecutionPerformed: false,
    existingEndOfRoundExecutorsFrozen: true,
    clientSuppliedFinalOrderAccepted: false, trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialAbilityTimingPriorityPlanV1(input = {}) {
  const plan = input.plan; const procedureKind = String(input.procedureKind || "");
  const timingBundle = input.timingDataBundle; const abilityBundle = input.abilityDataBundle;
  verifyBundles(timingBundle, abilityBundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("ABILITY_TIMING_PRIORITY_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "ABILITY_TIMING_PRIORITY_PLAN_INVALID");
  const shared = { ...plan.input, timingDataBundle: timingBundle,
    abilityDataBundle: abilityBundle };
  let result;
  if (procedureKind === "ability_type_comparison") {
    result = resolveOfficialAbilityTypeComparisonV1(shared);
  } else if (procedureKind === "passive_priority") {
    result = resolveOfficialPassivePriorityV1(shared);
  } else if (procedureKind === "reaction_priority") {
    result = resolveOfficialReactionPriorityV1(shared);
  } else if (procedureKind === "reaction_default_duration") {
    result = resolveOfficialReactionDefaultDurationV1(shared);
  } else {
    result = resolveOfficialEndOfRoundEffectOrderV1(shared);
  }
  const body = {
    schema: "starcraft_tmg_official_ability_timing_priority_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    timingDataBundleHash: timingBundle.bundleHash,
    abilityDataBundleHash: abilityBundle.bundleHash,
    result, rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialAbilityTimingPriorityPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialAbilityTimingPriorityPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("ABILITY_TIMING_PRIORITY_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialAbilityTimingPriorityProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
