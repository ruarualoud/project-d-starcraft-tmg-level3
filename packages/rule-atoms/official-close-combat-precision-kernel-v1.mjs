import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  verifyOfficialStimpackStatusV1,
} from "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_ID =
  "authority.close-combat-precision-kernel-v1";
export const OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA =
  "starcraft_tmg_official_stimpack_close_combat_precision_grant_v1";

const PLAN_SCHEMA = "starcraft_tmg_official_close_combat_precision_plan_v1";
const HIT_REVEAL_SCHEMA =
  "starcraft_tmg_official_close_combat_precision_hit_reveal_v1";
const SELECTION_SCHEMA =
  "starcraft_tmg_official_close_combat_precision_selection_v1";
const RESOLUTION_SCHEMA =
  "starcraft_tmg_official_close_combat_precision_resolution_v1";
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

function positiveInteger(value, code) {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) fail(code);
  return result;
}

function threshold(value, code) {
  const result = positiveInteger(value, code);
  if (result > 6) fail(code);
  return result;
}

function rollSucceeds(roll, target) {
  if (roll === 1) return false;
  if (roll === 6) return true;
  return roll >= target;
}

function verifyWeapon(weapon) {
  if (!object(weapon)
    || !String(weapon.weaponName || "")
    || !["-", "Strike"].includes(weapon.linkedTo)
    || weapon.range !== "engagement"
    || !isDeepStrictEqual(weapon.targetTags, ["ground"])
    || ![1, 2].includes(weapon.rateOfAttack)
    || weapon.hitThreshold !== 5
    || weapon.damage !== 1
    || weapon.surge !== null
    || weapon.behaviorText !== ""
    || !HASH_PATTERN.test(String(weapon.sourceTextHash || ""))) {
    fail("CLOSE_COMBAT_PRECISION_WEAPON_INVALID");
  }
  if ((weapon.weaponName === "Strike" && (
    weapon.linkedTo !== "-"
      || weapon.costSmall !== 0
      || weapon.costLarge !== 0
      || weapon.rateOfAttack !== 1
  )) || (weapon.weaponName === "Bayonet" && (
    weapon.linkedTo !== "Strike"
      || weapon.costSmall !== 20
      || weapon.costLarge !== 30
      || weapon.rateOfAttack !== 2
  ))) {
    fail("CLOSE_COMBAT_PRECISION_WEAPON_LOADOUT_INVALID");
  }
  return weapon;
}

function verifyTarget(target) {
  if (!object(target)
    || target.recordKey !== "army_units:marine"
    || target.armourThreshold !== 5
    || target.hitPoints !== 2
    || target.shield !== 0
    || !isDeepStrictEqual(target.combatTags, ["biological", "ground", "light"])) {
    fail("CLOSE_COMBAT_PRECISION_TARGET_INVALID");
  }
  return target;
}

function normalizeReveals(reveals, chance) {
  if (!Array.isArray(reveals) || reveals.length !== chance.count) {
    fail("CLOSE_COMBAT_PRECISION_CHANCE_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : chance.faces;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== chance.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > chance.faces) {
      fail("CLOSE_COMBAT_PRECISION_CHANCE_REVEAL_INVALID");
    }
    return { faces, outcome };
  });
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

function planAttack(input = {}) {
  const weapon = verifyWeapon(input.weapon);
  const target = verifyTarget(input.target);
  const attackerPieceId = String(input.attackerPieceId || "").trim();
  const targetPieceId = String(input.targetPieceId || "").trim();
  const statusEffectHash = String(input.statusEffectHash || "").trim();
  const engagementGraphHash = String(input.engagementGraphHash || "").trim();
  const eligibleModelCount = positiveInteger(
    input.eligibleModelCount,
    "CLOSE_COMBAT_PRECISION_ELIGIBLE_MODEL_COUNT_INVALID",
  );
  const attackDice = positiveInteger(
    input.attackDice,
    "CLOSE_COMBAT_PRECISION_ATTACK_DICE_INVALID",
  );
  if (!attackerPieceId
    || !targetPieceId
    || attackerPieceId === targetPieceId
    || !HASH_PATTERN.test(statusEffectHash)
    || !HASH_PATTERN.test(engagementGraphHash)
    || input.precisionValue !== 3
    || attackDice !== eligibleModelCount * weapon.rateOfAttack
    || !Array.isArray(input.fightingModelIds)
    || input.fightingModelIds.length !== eligibleModelCount
    || !Array.isArray(input.supportingModelIds)
    || input.supportingModelIds.length !== 0) {
    fail("CLOSE_COMBAT_PRECISION_PLAN_BINDING_INVALID");
  }
  const chance = {
    kind: "fixed_roll_sequence",
    faces: 6,
    count: attackDice * 2,
    layout: { hit: attackDice, armour: attackDice, evade: 0, surge: 0 },
  };
  const body = {
    schema: PLAN_SCHEMA,
    kernelId: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
    kernelVersion: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
    attackerPieceId,
    targetPieceId,
    weapon: clone(weapon),
    target: clone(target),
    eligibleModelCount,
    attackDice,
    fightingModelIds: [...input.fightingModelIds],
    supportingModelIds: [],
    engagementGraphHash,
    statusEffectHash,
    precisionValue: 3,
    precisionChoiceTiming: "after_hit_roll_before_armour_pool",
    chance,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verifyPlan(plan) {
  if (!object(plan)
    || plan.schema !== PLAN_SCHEMA
    || plan.kernelId !== OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_ID
    || plan.kernelVersion !== OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))) {
    fail("CLOSE_COMBAT_PRECISION_PLAN_INVALID");
  }
  const expected = planAttack({
    attackerPieceId: plan.attackerPieceId,
    targetPieceId: plan.targetPieceId,
    weapon: plan.weapon,
    target: plan.target,
    eligibleModelCount: plan.eligibleModelCount,
    attackDice: plan.attackDice,
    fightingModelIds: plan.fightingModelIds,
    supportingModelIds: plan.supportingModelIds,
    engagementGraphHash: plan.engagementGraphHash,
    statusEffectHash: plan.statusEffectHash,
    precisionValue: plan.precisionValue,
  });
  if (!isDeepStrictEqual(plan, expected)) fail("CLOSE_COMBAT_PRECISION_PLAN_STALE");
  return plan;
}

function createGrant(input = {}) {
  const status = verifyOfficialStimpackStatusV1(input.status);
  const plan = verifyPlan(input.plan);
  if (status.targetPieceId !== plan.attackerPieceId
    || status.statusEffectHash !== plan.statusEffectHash
    || status.precision !== plan.precisionValue) {
    fail("CLOSE_COMBAT_PRECISION_GRANT_BINDING_INVALID");
  }
  const body = {
    schema: OFFICIAL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA,
    statusEffectHash: status.statusEffectHash,
    attackerPieceId: plan.attackerPieceId,
    attackPlanHash: plan.planHash,
    weaponName: plan.weapon.weaponName,
    weaponKind: "close_combat",
    precisionValue: status.precision,
    timing: "after_hit_roll_before_armour_pool",
    treatsConvertedDiceAsSuccessfulHitsForAllPurposes: true,
    rangedPrecisionConsumed: false,
    speedValueConsumed: false,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    precisionGrantHash: hashStarcraftTmgContract(body),
  });
}

function verifyGrant(planInput, grant) {
  const plan = verifyPlan(planInput);
  if (!object(grant)
    || grant.schema !== OFFICIAL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA
    || grant.precisionGrantHash
      !== hashStarcraftTmgContract(without(grant, ["precisionGrantHash"]))
    || grant.statusEffectHash !== plan.statusEffectHash
    || grant.attackerPieceId !== plan.attackerPieceId
    || grant.attackPlanHash !== plan.planHash
    || grant.weaponName !== plan.weapon.weaponName
    || grant.weaponKind !== "close_combat"
    || grant.precisionValue !== 3
    || grant.timing !== "after_hit_roll_before_armour_pool"
    || grant.treatsConvertedDiceAsSuccessfulHitsForAllPurposes !== true
    || grant.rangedPrecisionConsumed !== false
    || grant.speedValueConsumed !== false
    || grant.trainingTruth !== false) {
    fail("CLOSE_COMBAT_PRECISION_GRANT_INVALID");
  }
  return grant;
}

function enumerateSelections(planInput, revealInput, grantInput) {
  const plan = verifyPlan(planInput);
  const grant = verifyGrant(plan, grantInput);
  const reveals = normalizeReveals(revealInput, plan.chance);
  const hitRolls = reveals.slice(0, plan.attackDice).map((entry) => entry.outcome);
  const failedHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => !rollSucceeds(roll, plan.weapon.hitThreshold))
    .map(({ index }) => index);
  const maximumConvertedDice = Math.min(grant.precisionValue, failedHitDieIndices.length);
  const hitRevealBody = {
    schema: HIT_REVEAL_SCHEMA,
    planHash: plan.planHash,
    precisionGrantHash: grant.precisionGrantHash,
    hitRolls,
    failedHitDieIndices,
    maximumConvertedDice,
    committedChanceRevealHash: hashStarcraftTmgContract(reveals),
    trainingTruth: false,
  };
  const hitReveal = freezeDeep({
    ...hitRevealBody,
    hitRevealHash: hashStarcraftTmgContract(hitRevealBody),
  });
  const selections = combinations(failedHitDieIndices, maximumConvertedDice)
    .map((convertedFailedDieIndices) => {
      const body = {
        schema: SELECTION_SCHEMA,
        planHash: plan.planHash,
        hitRevealHash: hitReveal.hitRevealHash,
        precisionGrantHash: grant.precisionGrantHash,
        convertedFailedDieIndices,
        convertedCount: convertedFailedDieIndices.length,
        declinedAvailableConversions:
          maximumConvertedDice - convertedFailedDieIndices.length,
        trainingTruth: false,
      };
      return freezeDeep({
        ...body,
        precisionSelectionHash: hashStarcraftTmgContract(body),
      });
    });
  return freezeDeep({ reveals, hitReveal, selections });
}

function resolveAttack(planInput, revealInput, input = {}) {
  const plan = verifyPlan(planInput);
  const grant = verifyGrant(plan, input.precisionGrant);
  const enumerated = enumerateSelections(plan, revealInput, grant);
  const selection = enumerated.selections.find((entry) => (
    entry.precisionSelectionHash === input.precisionSelection?.precisionSelectionHash
  ));
  if (!selection || !isDeepStrictEqual(selection, input.precisionSelection)) {
    fail("CLOSE_COMBAT_PRECISION_SELECTION_STALE");
  }
  const outcomes = enumerated.reveals.map((entry) => entry.outcome);
  const hitRolls = outcomes.slice(0, plan.attackDice);
  const preallocatedArmourRolls = outcomes.slice(plan.attackDice);
  const originalHits = hitRolls.filter((roll) => (
    rollSucceeds(roll, plan.weapon.hitThreshold)
  )).length;
  const hits = originalHits + selection.convertedCount;
  const armourRolls = preallocatedArmourRolls.slice(0, hits);
  const saves = armourRolls.filter((roll) => (
    rollSucceeds(roll, threshold(plan.target.armourThreshold, "CLOSE_COMBAT_PRECISION_ARMOUR_INVALID"))
  )).length;
  const damagePoolDice = hits - saves;
  const body = {
    schema: RESOLUTION_SCHEMA,
    kernelId: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
    kernelVersion: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
    planHash: plan.planHash,
    hitRevealHash: enumerated.hitReveal.hitRevealHash,
    precisionGrantHash: grant.precisionGrantHash,
    precisionSelectionHash: selection.precisionSelectionHash,
    reveals: clone(enumerated.reveals),
    stages: {
      hit: {
        dice: plan.attackDice,
        rolls: hitRolls,
        threshold: plan.weapon.hitThreshold,
        naturalOneAlwaysFails: true,
        naturalSixAlwaysSucceeds: true,
        originalHits,
        failedHitDieIndices: [...enumerated.hitReveal.failedHitDieIndices],
        convertedFailedDieIndices: [...selection.convertedFailedDieIndices],
        precisionConvertedHits: selection.convertedCount,
        hits,
      },
      effects: {
        precisionApplied: selection.convertedCount > 0,
        precisionValue: grant.precisionValue,
        precisionStatusEffectHash: grant.statusEffectHash,
        precisionGrantHash: grant.precisionGrantHash,
        precisionSelectionHash: selection.precisionSelectionHash,
        convertedDiceCountAsHitsForAllPurposes: true,
        surgeDice: 0,
      },
      armour: {
        dice: hits,
        rolls: armourRolls,
        unusedPreallocatedRolls: preallocatedArmourRolls.slice(hits),
        threshold: plan.target.armourThreshold,
        naturalOneAlwaysFails: true,
        naturalSixAlwaysSucceeds: true,
        saves,
      },
      evade: { dice: 0, rolls: [], reason: "no_close_combat_evade_grant" },
      damage: {
        damagePoolDice,
        damagePerDie: plan.weapon.damage,
        totalDamage: damagePoolDice * plan.weapon.damage,
      },
    },
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resolutionHash: hashStarcraftTmgContract(body) });
}

const descriptorBody = {
  schema: "starcraft_tmg_official_close_combat_precision_kernel_descriptor_v1",
  kernelId: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
  kernelVersion: OFFICIAL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
  supportedWeapons: ["Bayonet", "Strike"],
  precisionPolicy: {
    exactValue: 3,
    choiceTiming: "after_hit_roll_before_armour_pool",
    legalChoices: "all_subsets_of_failed_hit_dice_up_to_precision_value",
    convertedDiceAreHitsForAllPurposes: true,
  },
  chanceCommitmentPolicy: "full_roll_sequence_committed_before_hit_choice",
  unknownWeaponStatusSelectionOrHistoryPolicy: "fail_closed",
  trainingTruth: false,
};

export function createOfficialCloseCombatPrecisionKernelV1() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    plan: planAttack,
    createGrant,
    enumerateSelections,
    resolve: resolveAttack,
    verifyPlan,
    verifyGrant,
  });
}
