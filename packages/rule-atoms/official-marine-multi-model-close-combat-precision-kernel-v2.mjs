import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_SCHEMA,
} from "./official-marine-multi-model-close-combat-denominator-v1.mjs";
import { verifyOfficialStimpackStatusV1 } from
  "./official-marine-stimpack-kernel-v1.mjs";

export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_ID =
  "authority.marine-multi-model-close-combat-precision-kernel-v2";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION =
  "2.0.0";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_grant_v2";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_HIT_REVEAL_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_hit_reveal_v2";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_SELECTION_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_selection_v2";
export const OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_RESOLUTION_SCHEMA =
  "starcraft_tmg_official_marine_multi_model_close_combat_precision_resolution_v2";

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

function verifyPlan(plan) {
  const fighting = Array.isArray(plan?.fightingModelIds)
    ? plan.fightingModelIds
    : [];
  const supporting = Array.isArray(plan?.supportingModelIds)
    ? plan.supportingModelIds
    : [];
  const eligible = [...fighting, ...supporting];
  if (!object(plan)
    || plan.schema !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PLAN_SCHEMA
    || plan.planHash !== hashStarcraftTmgContract(without(plan, ["planHash"]))
    || plan.stimpacked !== true
    || plan.precisionValue !== 3
    || !HASH_PATTERN.test(String(plan.statusEffectHash || ""))
    || !HASH_PATTERN.test(String(plan.markerHash || ""))
    || !HASH_PATTERN.test(String(plan.abilityUseHash || ""))
    || !HASH_PATTERN.test(String(plan.engagementGraphHash || ""))
    || !object(plan.weapon)
    || !["Strike", "Bayonet"].includes(plan.weapon.weaponName)
    || ![1, 2].includes(plan.weapon.rateOfAttack)
    || plan.weapon.range !== "engagement"
    || plan.weapon.hitThreshold !== 5
    || plan.weapon.damage !== 1
    || !Array.isArray(plan.eligibleModelIds)
    || !isDeepStrictEqual(plan.eligibleModelIds, eligible)
    || new Set(eligible).size !== eligible.length
    || plan.eligibleModelCount !== eligible.length
    || plan.eligibleModelCount <= 0
    || plan.attackDice !== plan.eligibleModelCount * plan.weapon.rateOfAttack
    || !isDeepStrictEqual(plan.chance, {
      kind: "fixed_roll_sequence",
      faces: 6,
      count: plan.attackDice * 2,
      layout: {
        hit: plan.attackDice,
        armour: plan.attackDice,
        evade: 0,
        surge: 0,
      },
    })
    || plan.trainingTruth !== false) {
    fail("MARINE_MULTI_MODEL_PRECISION_PLAN_INVALID");
  }
  return plan;
}

function normalizeReveals(reveals, chance) {
  if (!Array.isArray(reveals) || reveals.length !== chance.count) {
    fail("MARINE_MULTI_MODEL_PRECISION_REVEALS_REQUIRED");
  }
  return reveals.map((reveal) => {
    const faces = object(reveal) ? Number(reveal.faces) : chance.faces;
    const outcome = object(reveal) ? Number(reveal.outcome) : Number(reveal);
    if (faces !== chance.faces
      || !Number.isSafeInteger(outcome)
      || outcome < 1
      || outcome > chance.faces) {
      fail("MARINE_MULTI_MODEL_PRECISION_REVEAL_INVALID");
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

function createGrant(input = {}) {
  const plan = verifyPlan(input.plan);
  const status = verifyOfficialStimpackStatusV1(input.status);
  if (status.targetPieceId !== plan.attackerPieceId
    || status.statusEffectHash !== plan.statusEffectHash
    || status.precision !== plan.precisionValue) {
    fail("MARINE_MULTI_MODEL_PRECISION_GRANT_BINDING_INVALID");
  }
  const body = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA,
    kernelId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
    kernelVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
    attackerPieceId: plan.attackerPieceId,
    targetPieceId: plan.targetPieceId,
    attackPlanHash: plan.planHash,
    modelLedgerHash: plan.attackerLedger.modelLedgerHash,
    unitWideLoadoutHash: plan.unitWideLoadout.unitWideLoadoutHash,
    engagementGraphHash: plan.engagementGraphHash,
    statusEffectHash: status.statusEffectHash,
    markerHash: plan.markerHash,
    abilityUseHash: plan.abilityUseHash,
    weaponName: plan.weapon.weaponName,
    weaponKind: "close_combat",
    fightingModelIds: [...plan.fightingModelIds],
    supportingModelIds: [...plan.supportingModelIds],
    eligibleModelIds: [...plan.eligibleModelIds],
    attackDice: plan.attackDice,
    precisionValue: 3,
    timing: "after_hit_roll_before_armour_pool",
    treatsConvertedDiceAsSuccessfulHitsForAllPurposes: true,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    precisionGrantHash: hashStarcraftTmgContract(body),
  });
}

function verifyGrant(input = {}) {
  const plan = verifyPlan(input.plan);
  const grant = input.grant;
  if (!object(grant)
    || grant.schema !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_GRANT_SCHEMA
    || grant.kernelId !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_ID
    || grant.kernelVersion
      !== OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION
    || grant.precisionGrantHash
      !== hashStarcraftTmgContract(without(grant, ["precisionGrantHash"]))) {
    fail("MARINE_MULTI_MODEL_PRECISION_GRANT_INVALID");
  }
  const expected = createGrant({ plan, status: input.status });
  if (!isDeepStrictEqual(grant, expected)) {
    fail("MARINE_MULTI_MODEL_PRECISION_GRANT_STALE");
  }
  return true;
}

function enumerateSelections(input = {}) {
  const plan = verifyPlan(input.plan);
  verifyGrant({ plan, grant: input.grant, status: input.status });
  const reveals = normalizeReveals(input.reveals, plan.chance);
  const hitRolls = reveals.slice(0, plan.attackDice).map((entry) => entry.outcome);
  const failedHitDieIndices = hitRolls.map((roll, index) => ({ roll, index }))
    .filter(({ roll }) => !rollSucceeds(roll, plan.weapon.hitThreshold))
    .map(({ index }) => index);
  const maximumConvertedDice = Math.min(3, failedHitDieIndices.length);
  const hitRevealBody = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_HIT_REVEAL_SCHEMA,
    attackPlanHash: plan.planHash,
    precisionGrantHash: input.grant.precisionGrantHash,
    committedChanceRevealHash: hashStarcraftTmgContract(reveals),
    hitRolls,
    failedHitDieIndices,
    maximumConvertedDice,
    fightingModelIds: [...plan.fightingModelIds],
    supportingModelIds: [...plan.supportingModelIds],
    attackDice: plan.attackDice,
    trainingTruth: false,
  };
  const hitReveal = freezeDeep({
    ...hitRevealBody,
    hitRevealHash: hashStarcraftTmgContract(hitRevealBody),
  });
  const selections = combinations(failedHitDieIndices, maximumConvertedDice)
    .map((convertedFailedDieIndices) => {
      const body = {
        schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_SELECTION_SCHEMA,
        attackPlanHash: plan.planHash,
        hitRevealHash: hitReveal.hitRevealHash,
        precisionGrantHash: input.grant.precisionGrantHash,
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

function resolve(input = {}) {
  const plan = verifyPlan(input.plan);
  const enumerated = enumerateSelections(input);
  const selection = enumerated.selections.find((entry) => (
    entry.precisionSelectionHash === input.selection?.precisionSelectionHash
  ));
  if (!selection || !isDeepStrictEqual(selection, input.selection)) {
    fail("MARINE_MULTI_MODEL_PRECISION_SELECTION_STALE");
  }
  const outcomes = enumerated.reveals.map((entry) => entry.outcome);
  const hitRolls = outcomes.slice(0, plan.attackDice);
  const preallocatedArmourRolls = outcomes.slice(plan.attackDice);
  const originalHits = hitRolls.filter((roll) => (
    rollSucceeds(roll, plan.weapon.hitThreshold)
  )).length;
  const hits = originalHits + selection.convertedCount;
  const armourRolls = preallocatedArmourRolls.slice(0, hits);
  const saves = armourRolls.filter((roll) => rollSucceeds(roll, 5)).length;
  const damagePoolDice = hits - saves;
  const body = {
    schema: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_RESOLUTION_SCHEMA,
    kernelId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
    kernelVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
    attackPlanHash: plan.planHash,
    hitRevealHash: enumerated.hitReveal.hitRevealHash,
    precisionGrantHash: input.grant.precisionGrantHash,
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
        precisionValue: 3,
        precisionStatusEffectHash: input.grant.statusEffectHash,
        precisionGrantHash: input.grant.precisionGrantHash,
        precisionSelectionHash: selection.precisionSelectionHash,
        convertedDiceCountAsHitsForAllPurposes: true,
        surgeDice: 0,
      },
      armour: {
        dice: hits,
        rolls: armourRolls,
        unusedPreallocatedRolls: preallocatedArmourRolls.slice(hits),
        threshold: 5,
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
  return freezeDeep({
    ...body,
    resolutionHash: hashStarcraftTmgContract(body),
  });
}

const descriptorBody = {
  schema:
    "starcraft_tmg_official_marine_multi_model_close_combat_precision_kernel_descriptor_v2",
  kernelId: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_ID,
  kernelVersion: OFFICIAL_MARINE_MULTI_MODEL_CLOSE_COMBAT_PRECISION_KERNEL_VERSION,
  planAuthority: "slice45_multi_model_close_combat_denominator",
  supportedWeapons: ["Bayonet", "Strike"],
  supportedRankKinds: ["fighting", "supporting"],
  precisionPolicy: {
    exactValue: 3,
    choiceTiming: "after_hit_roll_before_armour_pool",
    legalChoices: "all_subsets_of_failed_hit_dice_up_to_precision_value",
    convertedDiceAreHitsForAllPurposes: true,
  },
  chanceCommitmentPolicy: "full_roll_sequence_committed_before_hit_choice",
  staleDomainPolicy:
    "model_ledger_loadout_engagement_rank_status_marker_or_history_drift_fails_closed",
  trainingTruth: false,
};

export function createOfficialMarineMultiModelCloseCombatPrecisionKernelV2() {
  return freezeDeep({
    descriptor: {
      ...descriptorBody,
      kernelHash: hashStarcraftTmgContract(descriptorBody),
    },
    createGrant,
    verifyGrant,
    enumerateSelections,
    resolve,
    verifyPlan,
  });
}
