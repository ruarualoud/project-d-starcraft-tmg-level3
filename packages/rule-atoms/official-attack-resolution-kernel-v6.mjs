import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialAttackResolutionKernelV5 } from
  "./official-attack-resolution-kernel-v5.mjs";
import { verifyOfficialStimpackPrecisionGrantV1 } from
  "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_ID =
  "authority.attack-resolution-kernel-v6";
export const OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_VERSION = "6.0.0";

const BASE_KERNEL = createOfficialAttackResolutionKernelV5();
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

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

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function rollSucceeds(roll, threshold) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= threshold;
}

function planAttack(input = {}) {
  const attackerPieceId = String(input.attackerPieceId || "").trim();
  const precisionStatusEffectHash = String(
    input.precisionStatusEffectHash || "",
  ).trim();
  const precisionValue = Number(input.precisionValue);
  const weaponName = String(input.weaponName || "").trim();
  if (!attackerPieceId
    || !HASH_PATTERN.test(precisionStatusEffectHash)
    || precisionValue !== 3
    || weaponName !== "C-14 rifle") {
    fail("ATTACK_PRECISION_PLAN_BINDING_INVALID");
  }
  const basePlan = BASE_KERNEL.plan({
    profile: input.profile,
    target: input.target,
    distanceInches: input.distanceInches,
    evadeEligibility: input.evadeEligibility,
    attackerEngagement: input.attackerEngagement,
  });
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_plan_v6",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_VERSION,
    basePlan,
    profileKey: basePlan.profileKey,
    profileHash: basePlan.profileHash,
    profile: clone(basePlan.profile),
    target: clone(basePlan.target),
    distanceInches: basePlan.distanceInches,
    rangeBand: basePlan.rangeBand,
    effectiveHitThreshold: basePlan.effectiveHitThreshold,
    effectiveRateOfAttack: basePlan.effectiveRateOfAttack,
    chance: clone(basePlan.chance),
    attackerPieceId,
    weaponName,
    precisionStatusEffectHash,
    precisionValue,
    precisionChoiceTiming: "after_hit_roll_before_armour_pool",
    precisionChoiceRequired: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== "starcraft_tmg_official_attack_resolution_plan_v6"
    || plan.kernelId !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_ID
    || plan.kernelVersion !== OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))
    || !object(plan.basePlan)
    || plan.profileKey !== plan.basePlan.profileKey
    || plan.profileHash !== plan.basePlan.profileHash
    || !isDeepStrictEqual(plan.profile, plan.basePlan.profile)
    || !isDeepStrictEqual(plan.target, plan.basePlan.target)
    || plan.distanceInches !== plan.basePlan.distanceInches
    || plan.rangeBand !== plan.basePlan.rangeBand
    || plan.effectiveHitThreshold !== plan.basePlan.effectiveHitThreshold
    || plan.effectiveRateOfAttack !== plan.basePlan.effectiveRateOfAttack
    || !isDeepStrictEqual(plan.chance, plan.basePlan.chance)
    || !String(plan.attackerPieceId || "")
    || plan.weaponName !== "C-14 rifle"
    || !HASH_PATTERN.test(String(plan.precisionStatusEffectHash || ""))
    || plan.precisionValue !== 3
    || plan.precisionChoiceTiming !== "after_hit_roll_before_armour_pool"
    || plan.precisionChoiceRequired !== true
    || plan.trainingTruth !== false) {
    fail("ATTACK_PRECISION_PLAN_INVALID");
  }
  return plan;
}

function verifyGrant(plan, grantInput) {
  const grant = verifyOfficialStimpackPrecisionGrantV1(grantInput);
  if (grant.attackPlanHash !== plan.planHash
    || grant.attackerPieceId !== plan.attackerPieceId
    || grant.statusEffectHash !== plan.precisionStatusEffectHash
    || grant.weaponName !== plan.weaponName
    || grant.precisionValue !== plan.precisionValue) {
    fail("ATTACK_PRECISION_GRANT_MISMATCH");
  }
  return grant;
}

function failedHitIndices(baseResolution, plan) {
  return baseResolution.stages.hit.rolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => !rollSucceeds(roll, plan.effectiveHitThreshold))
    .map(({ index }) => index);
}

function combinations(values, maximumSize) {
  const rows = [[]];
  function visit(start, current) {
    if (current.length >= maximumSize) return;
    for (let index = start; index < values.length; index += 1) {
      const next = [...current, values[index]];
      rows.push(next);
      visit(index + 1, next);
    }
  }
  visit(0, []);
  return rows.sort((left, right) => (
    left.length - right.length
      || left.join(",").localeCompare(right.join(","))
  ));
}

function normalizedReveals(baseResolution) {
  return baseResolution.reveals.map((entry) => ({
    faces: entry.faces,
    outcome: entry.outcome,
  }));
}

function enumeratePrecisionSelections(planInput, reveals, grantInput) {
  const plan = verifyPlan(planInput);
  const grant = verifyGrant(plan, grantInput);
  const baseResolution = BASE_KERNEL.resolve(plan.basePlan, reveals);
  const failedIndices = failedHitIndices(baseResolution, plan);
  const selections = combinations(
    failedIndices,
    Math.min(grant.precisionValue, failedIndices.length),
  );
  const revealBody = {
    schema: "starcraft_tmg_official_precision_hit_reveal_v1",
    planHash: plan.planHash,
    precisionGrantHash: grant.precisionGrantHash,
    reveals: normalizedReveals(baseResolution),
    failedHitDieIndices: failedIndices,
    maximumConvertedDice: Math.min(grant.precisionValue, failedIndices.length),
    trainingTruth: false,
  };
  const hitReveal = freezeDeep({
    ...revealBody,
    hitRevealHash: hashStarcraftTmgContract(revealBody),
  });
  return freezeDeep({
    hitReveal,
    selections: selections.map((convertedFailedDieIndices) => {
      const body = {
        schema: "starcraft_tmg_official_precision_selection_v1",
        planHash: plan.planHash,
        hitRevealHash: hitReveal.hitRevealHash,
        precisionGrantHash: grant.precisionGrantHash,
        convertedFailedDieIndices,
        convertedCount: convertedFailedDieIndices.length,
        declinedAvailableConversions:
          hitReveal.maximumConvertedDice - convertedFailedDieIndices.length,
        trainingTruth: false,
      };
      return {
        ...body,
        precisionSelectionHash: hashStarcraftTmgContract(body),
      };
    }),
  });
}

function verifySelection(plan, grant, selection, hitReveal, validSelections) {
  if (!object(selection)
    || selection.schema !== "starcraft_tmg_official_precision_selection_v1"
    || selection.planHash !== plan.planHash
    || selection.hitRevealHash !== hitReveal.hitRevealHash
    || selection.precisionGrantHash !== grant.precisionGrantHash
    || selection.trainingTruth !== false
    || selection.precisionSelectionHash
      !== hashStarcraftTmgContract(without(selection, ["precisionSelectionHash"]))) {
    fail("ATTACK_PRECISION_SELECTION_INVALID");
  }
  const exact = validSelections.find((row) => (
    row.precisionSelectionHash === selection.precisionSelectionHash
  ));
  if (!exact || !isDeepStrictEqual(exact, selection)) {
    fail("ATTACK_PRECISION_SELECTION_STALE");
  }
  return selection;
}

function resolveAttack(planInput, reveals, input = {}) {
  const plan = verifyPlan(planInput);
  const grant = verifyGrant(plan, input.precisionGrant);
  const enumerated = enumeratePrecisionSelections(plan, reveals, grant);
  const selection = verifySelection(
    plan,
    grant,
    input.precisionSelection,
    enumerated.hitReveal,
    enumerated.selections,
  );
  const baseResolution = BASE_KERNEL.resolve(plan.basePlan, reveals);
  const stages = clone(baseResolution.stages);
  const converted = new Set(selection.convertedFailedDieIndices);
  const originalHits = stages.hit.hits;
  const hits = originalHits + converted.size;
  const surgeCapacity = stages.effects.surgeResults
    .reduce((total, value) => total + value, 0);
  const bypassedArmourHits = stages.effects.surgeMatched
    ? Math.min(hits, surgeCapacity)
    : 0;
  const armourDice = hits - bypassedArmourHits;
  const preallocatedArmourRolls = [
    ...stages.armour.rolls,
    ...stages.armour.unusedPreallocatedRolls,
  ];
  const resolvedArmourRolls = preallocatedArmourRolls.slice(0, armourDice);
  const armourSaves = resolvedArmourRolls.filter((roll) => rollSucceeds(
    roll,
    stages.armour.threshold,
  )).length;
  const damagePoolBeforeEvade = bypassedArmourHits + armourDice - armourSaves;
  const evadeDice = stages.evade.eligible ? damagePoolBeforeEvade : 0;
  const preallocatedEvadeRolls = [
    ...stages.evade.rolls,
    ...stages.evade.unusedPreallocatedRolls,
  ];
  const resolvedEvadeRolls = preallocatedEvadeRolls.slice(0, evadeDice);
  const evadeSaves = resolvedEvadeRolls.filter((roll) => rollSucceeds(
    roll,
    stages.evade.effectiveThreshold,
  )).length;
  const confirmedDamageDice = damagePoolBeforeEvade - evadeSaves;

  stages.hit = {
    ...stages.hit,
    originalHits,
    failedHitDieIndices: [...enumerated.hitReveal.failedHitDieIndices],
    convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
    precisionConvertedHits: selection.convertedCount,
    hits,
  };
  stages.effects = {
    ...stages.effects,
    bypassedArmourHits,
    precisionApplied: selection.convertedCount > 0,
    precisionValue: grant.precisionValue,
    precisionStatusEffectHash: grant.statusEffectHash,
    precisionGrantHash: grant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    convertedDiceCountAsHitsForSurge: true,
  };
  stages.armour = {
    ...stages.armour,
    dice: armourDice,
    rolls: resolvedArmourRolls,
    unusedPreallocatedRolls: preallocatedArmourRolls.slice(armourDice),
    saves: armourSaves,
  };
  stages.evade = {
    ...stages.evade,
    dice: evadeDice,
    rolls: resolvedEvadeRolls,
    unusedPreallocatedRolls: preallocatedEvadeRolls.slice(evadeDice),
    damagePoolBeforeEvade,
    saves: evadeSaves,
    confirmedDamageDice,
  };
  stages.damage = {
    ...stages.damage,
    damagePoolDice: confirmedDamageDice,
    totalDamage: confirmedDamageDice * stages.damage.damagePerDie,
  };
  const body = {
    schema: "starcraft_tmg_official_attack_resolution_receipt_v6",
    kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_ID,
    kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_VERSION,
    planHash: plan.planHash,
    baseResolutionHash: baseResolution.resolutionHash,
    hitRevealHash: enumerated.hitReveal.hitRevealHash,
    precisionGrantHash: grant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    reveals: normalizedReveals(baseResolution),
    stages,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_attack_resolution_kernel_descriptor_v6",
  kernelId: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_ID,
  kernelVersion: OFFICIAL_ATTACK_RESOLUTION_KERNEL_V6_VERSION,
  baseKernel: {
    kernelId: BASE_KERNEL.descriptor.kernelId,
    kernelVersion: BASE_KERNEL.descriptor.kernelVersion,
    kernelHash: BASE_KERNEL.descriptor.kernelHash,
  },
  stages: ["declaration", "hit", "precision_choice", "effects", "armour", "evade", "damage"],
  precisionPolicy: {
    exactValue: 3,
    choiceTiming: "after_hit_roll_before_armour_pool",
    legalChoices: "all_subsets_of_failed_hit_dice_up_to_precision_value",
    convertedDiceAreHitsForAllPurposesIncludingSurge: true,
  },
  historicalBaseKernelFrozen: true,
  unknownPrecisionGrantPolicy: "fail_closed",
  trainingTruth: false,
};

export function createOfficialAttackResolutionKernelV6() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan: planAttack,
    enumeratePrecisionSelections,
    resolve: resolveAttack,
    verifyPlan,
  });
}
