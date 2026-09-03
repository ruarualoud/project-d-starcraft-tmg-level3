import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_PROBABILITY_WORKBENCH_VERSION =
  "starcraft_tmg_probability_workbench_v1";

function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function number(value) {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const parsed = Number(String(value).replace(/[^0-9.+-]/gu, ""));
  return Number.isFinite(parsed) ? parsed : null;
}
function threshold(value) {
  const matched = String(value || "").match(/^(\d+)\+$/u);
  return matched ? Number(matched[1]) : null;
}
function probabilityAtLeast(target) { return target === null ? 1 : Math.max(0, Math.min(1, (7 - target) / 6)); }
function choose(n, k) {
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - index + 1)) / index;
  return result;
}
function binomial(n, k, p) { return choose(n, k) * (p ** k) * ((1 - p) ** (n - k)); }
function tags(unit) { return new Set([...(unit.tags || []), ...(unit.keywords || [])].map((entry) => String(entry).toLowerCase())); }

function surgePlan(weapon, target) {
  const printed = String(weapon.surge || "").trim();
  const matched = printed.match(/^([^()]+)\((D3)(?:\s*\+\s*(\d+))?\)$/iu);
  if (!matched) return { printed, applies: false, values: [{ bypass: 0, probability: 1 }], coverage: printed && printed !== "-" ? "unknown" : "exact" };
  const targetTags = tags(target);
  const requiredTags = matched[1].split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  const applies = requiredTags.some((entry) => targetTags.has(entry));
  const bonus = Number(matched[3] || 0);
  return {
    printed,
    applies,
    requiredTags,
    values: applies
      ? [1, 2, 3].map((value) => ({ bypass: value + bonus, probability: 1 / 3 }))
      : [{ bypass: 0, probability: 1 }],
    coverage: "exact",
  };
}

function distribution(attacker, target, weapon) {
  const roa = Math.max(0, Math.trunc(number(weapon.roa) || 0));
  const hitTarget = threshold(weapon.hit);
  const armourTarget = threshold(target.stats?.armor ?? target.stats?.armour);
  const hitProbability = probabilityAtLeast(hitTarget);
  const saveProbability = armourTarget === null ? 0 : probabilityAtLeast(armourTarget);
  const damagePerDie = Math.max(0, number(weapon.dmg) || 0);
  const surge = surgePlan(weapon, target);
  const outcomes = new Map();
  for (let hits = 0; hits <= roa; hits += 1) {
    const pHits = binomial(roa, hits, hitProbability);
    for (const surgeValue of surge.values) {
      const bypass = Math.min(hits, surgeValue.bypass);
      const armourDice = hits - bypass;
      for (let saves = 0; saves <= armourDice; saves += 1) {
        const p = pHits * surgeValue.probability * binomial(armourDice, saves, saveProbability);
        const damageDice = bypass + armourDice - saves;
        const damage = damageDice * damagePerDie;
        outcomes.set(damage, (outcomes.get(damage) || 0) + p);
      }
    }
  }
  const rows = [...outcomes.entries()].sort((left, right) => left[0] - right[0])
    .map(([damage, probability]) => ({ damage, probability }));
  const expectedDamage = rows.reduce((total, entry) => total + entry.damage * entry.probability, 0);
  const currentDamage = number(target.damage) || 0;
  const hp = number(target.hpPerModel);
  const targetSingleModel = Number(target.currentModels) === 1;
  const casualtyThreshold = targetSingleModel && hp !== null ? Math.max(0, hp - currentDamage) : null;
  const weaponKeywords = String(weapon.keywords || "").trim();
  const unresolved = [
    ...(weaponKeywords ? [`weapon_keywords:${weaponKeywords}`] : []),
    ...((target.statuses || []).length ? ["target_status_modifiers"] : []),
    ...((attacker.statuses || []).length ? ["attacker_status_modifiers"] : []),
    ...(targetSingleModel ? [] : ["multi_model_damage_allocation_and_casualty_choice"]),
    ...(surge.coverage === "exact" ? [] : ["surge_expression_not_supported"]),
  ];
  return {
    hit: { dice: roa, threshold: hitTarget, perDieProbability: hitProbability },
    surge,
    armour: { threshold: armourTarget, perDieSaveProbability: saveProbability },
    damagePerUnsavedDie: damagePerDie,
    outcomes: rows,
    expectedDamage,
    probabilityAtLeastOneDamage: rows.filter((entry) => entry.damage > 0).reduce((total, entry) => total + entry.probability, 0),
    casualtyThreshold,
    casualtyProbability: casualtyThreshold === null ? null
      : rows.filter((entry) => entry.damage >= casualtyThreshold).reduce((total, entry) => total + entry.probability, 0),
    chanceTicket: {
      faces: 6,
      hitDice: roa,
      surgeDice: 1,
      preallocatedArmourDice: roa,
      totalDice: (2 * roa) + 1,
      enumeration: "exact_dynamic_finite_d6_distribution",
    },
    mathematicalCoverage: hitTarget !== null && roa > 0 ? "exact" : "unknown",
    rulesCoverage: unresolved.length ? "partial" : "exact",
    unresolved,
  };
}

function targetCompatible(weapon, target) {
  const targetType = String(weapon.target || "All").toLowerCase();
  if (!targetType || targetType === "all") return true;
  return tags(target).has(targetType);
}

export function projectStarcraftTmgProbabilityWorkbenchV1(input = {}) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const units = Array.isArray(input.units) ? input.units : [];
  const active = units.filter((unit) => unit.location === "battlefield" && Number(unit.currentModels) > 0);
  const rows = active.flatMap((attacker) => active
    .filter((target) => target.sideKey !== attacker.sideKey)
    .flatMap((target) => (attacker.weapons || []).filter((weapon) => targetCompatible(weapon, target))
      .map((weapon) => {
        const result = distribution(attacker, target, weapon);
        return {
          queryId: hashStarcraftTmgClientContract({ attackerUnitId: attacker.id, targetUnitId: target.id, weaponId: weapon.id }),
          mode: "one_to_one",
          attackerUnitId: attacker.id,
          targetUnitId: target.id,
          weaponId: weapon.id,
          weaponName: weapon.name,
          result,
          assumptions: [
            "current_viewer_visible_state_revision",
            "declared_weapon_profile",
            "independent_uniform_d6_chance_ticket_faces",
            "no_unlisted_modifier_is_assumed",
          ],
          coverage: result.mathematicalCoverage === "exact" && result.rulesCoverage === "exact" ? "exact"
            : result.mathematicalCoverage === "exact" ? "partial" : "unknown",
        };
      })));
  const oneToMany = Object.fromEntries(active.map((unit) => [unit.id, rows.filter((entry) => entry.attackerUnitId === unit.id)]));
  const manyToOne = Object.fromEntries(active.map((unit) => [unit.id, rows.filter((entry) => entry.targetUnitId === unit.id)]));
  const core = {
    schemaVersion: STARCRAFT_TMG_PROBABILITY_WORKBENCH_VERSION,
    roomId: projection.room?.roomId || null,
    matchBindingHash: projection.matchBinding?.bindingHash || null,
    stateRevision: projection.room?.stateRevision ?? null,
    stateHash: projection.room?.stateHash || null,
    modes: ["one_to_one", "one_to_many", "many_to_one", "matrix"],
    rows,
    oneToMany,
    manyToOne,
    matrix: rows.map((entry) => entry.queryId),
    legacyBetaCalculatorEnabled: false,
    executionAuthority: false,
    writesAuthority: false,
    rollsChance: false,
    coverage: rows.some((entry) => entry.coverage === "partial") ? "partial"
      : rows.length && rows.every((entry) => entry.coverage === "exact") ? "exact" : "unknown",
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({ ...core, probabilityHash: hashStarcraftTmgClientContract(core) });
}

export function isStarcraftTmgProbabilityWorkbenchV1(value, expected = {}) {
  if (!object(value) || value.schemaVersion !== STARCRAFT_TMG_PROBABILITY_WORKBENCH_VERSION
    || !/^[a-f0-9]{64}$/u.test(String(value.probabilityHash || ""))
    || !Array.isArray(value.rows) || !Array.isArray(value.matrix)
    || value.legacyBetaCalculatorEnabled !== false || value.executionAuthority !== false
    || value.writesAuthority !== false || value.rollsChance !== false || value.trainingTruth !== false) return false;
  const { probabilityHash, ...core } = value;
  if (hashStarcraftTmgClientContract(core) !== probabilityHash) return false;
  if (expected.roomId && value.roomId !== expected.roomId) return false;
  if (Number.isSafeInteger(expected.stateRevision) && value.stateRevision !== expected.stateRevision) return false;
  if (expected.stateHash && value.stateHash !== expected.stateHash) return false;
  if (expected.matchBindingHash && value.matchBindingHash !== expected.matchBindingHash) return false;
  return true;
}
