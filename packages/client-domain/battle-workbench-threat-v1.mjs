import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_THREAT_WORKBENCH_VERSION =
  "starcraft_tmg_threat_workbench_v1";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function number(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitSpeed(unit) {
  const printed = String(unit.stats?.speed || "").trim();
  const branches = printed.split("/").map(number).filter((entry) => entry !== null);
  if (branches.length === 2) {
    const singleModel = Number(unit.currentModels) === 1;
    return {
      printed,
      currentModels: Number(unit.currentModels),
      branch: singleModel ? "single_model" : "multi_model",
      speedInches: singleModel ? branches[1] : branches[0],
      exactForPrintedProfile: true,
      sourceRuleAtomIds: [
        "rule-atom:unit-current-model-count",
        "rule-atom:unit-current-model-count-selects-split-speed",
      ],
    };
  }
  return {
    printed,
    currentModels: Number(unit.currentModels),
    branch: "single_value",
    speedInches: branches[0] ?? null,
    exactForPrintedProfile: branches.length === 1,
    sourceRuleAtomIds: ["rule-atom:unit-speed-characteristic"],
  };
}

function weaponRange(weapon) {
  const base = number(weapon.range);
  const keywords = String(weapon.keywords || "");
  const longRange = keywords.match(/LONG\s+RANGE\s*\(\s*(\d+(?:\.\d+)?)\s*(?:"|IN)?\s*\)/iu);
  const extended = longRange ? Number(longRange[1]) : null;
  return {
    kind: base === null ? "engagement" : "ranged",
    printedRangeInches: base,
    maximumRangeInches: extended !== null ? Math.max(base ?? 0, extended) : base,
    longRangeChoice: extended !== null,
  };
}

function baseRadiusInches(unit) {
  const maximumMm = Math.max(number(unit.base?.widthMm) || 0, number(unit.base?.depthMm) || 0);
  return maximumMm > 0 ? maximumMm / 25.4 / 2 : 0;
}

function activeModels(unit) {
  return (Array.isArray(unit.models) ? unit.models : []).filter((model) => (
    model.isOnField === true && model.isDestroyed !== true
      && number(model.xInches) !== null && number(model.yInches) !== null
  ));
}

function circle(unit, model, radiusInches, mode, weaponId = null, coverage = "partial") {
  return {
    geometryType: "circle",
    unitId: unit.id,
    modelId: model.id,
    sideKey: unit.sideKey,
    mode,
    weaponId,
    centerXMilliInches: Math.round(Number(model.xInches) * 1000),
    centerYMilliInches: Math.round(Number(model.yInches) * 1000),
    radiusMilliInches: Math.max(0, Math.round(radiusInches * 1000)),
    measurement: "actor_base_edge_plus_nominal_distance",
    targetBaseRadiusIncluded: false,
    coverage,
  };
}

function unitThreat(unit) {
  const speed = splitSpeed(unit);
  const models = activeModels(unit);
  const baseRadius = baseRadiusInches(unit);
  const weapons = (Array.isArray(unit.weapons) ? unit.weapons : []).map((weapon) => {
    const range = weaponRange(weapon);
    const stationaryRadius = range.kind === "ranged"
      ? baseRadius + range.maximumRangeInches : baseRadius;
    const moveRadius = speed.speedInches === null ? null : stationaryRadius + speed.speedInches;
    return {
      weaponId: weapon.id,
      weaponName: weapon.name,
      target: weapon.target,
      ...range,
      stationaryRadiusInches: stationaryRadius,
      moveThenAttackRadiusInches: moveRadius,
      stationaryRegions: models.map((model) => circle(unit, model, stationaryRadius, "stationary_fire", weapon.id)),
      moveThenAttackRegions: moveRadius === null ? []
        : models.map((model) => circle(unit, model, moveRadius, "move_then_fire", weapon.id)),
      coverage: range.kind === "ranged" ? "partial" : "partial",
      unresolved: [
        "target_base_radius_varies_by_candidate",
        "line_of_sight_and_intervening_terrain_require_target_specific_query",
        ...(range.longRangeChoice ? ["long_range_is_a_declared_choice_with_accuracy_consequence"] : []),
      ],
    };
  });
  const chargeMinimum = speed.speedInches === null ? null : speed.speedInches + 1;
  const chargeMaximum = speed.speedInches === null ? null : speed.speedInches + 6;
  return {
    unitId: unit.id,
    sideKey: unit.sideKey,
    currentModels: unit.currentModels,
    speed,
    weapons,
    charge: {
      mode: "charge_engagement",
      minimumRadiusInches: chargeMinimum === null ? null : baseRadius + chargeMinimum,
      maximumRadiusInches: chargeMaximum === null ? null : baseRadius + chargeMaximum,
      regions: chargeMaximum === null ? [] : models.map((model) => (
        circle(unit, model, baseRadius + chargeMaximum, "charge_engagement", null, "partial")
      )),
      chance: "d6_charge_distance_not_rolled_by_read_query",
      coverage: chargeMaximum === null ? "unknown" : "partial",
      unresolved: [
        "charge_roll_not_resolved",
        "target_base_radius_varies_by_candidate",
        "terrain_collision_and_legal_path_require_target_specific_preview",
      ],
    },
    modelCountAffectsMovement: speed.branch !== "single_value",
    coverage: models.length && speed.speedInches !== null ? "partial" : "unknown",
  };
}

function candidatePairs(units) {
  const active = units.filter((unit) => activeModels(unit).length > 0);
  const rows = [];
  for (const attacker of active) {
    const attackerThreat = unitThreat(attacker);
    for (const target of active.filter((unit) => unit.sideKey !== attacker.sideKey)) {
      let distance = Infinity;
      for (const source of activeModels(attacker)) {
        for (const destination of activeModels(target)) {
          distance = Math.min(distance, Math.hypot(
            Number(source.xInches) - Number(destination.xInches),
            Number(source.yInches) - Number(destination.yInches),
          ) - baseRadiusInches(attacker) - baseRadiusInches(target));
        }
      }
      const stationary = attackerThreat.weapons.filter((weapon) => (
        weapon.maximumRangeInches !== null && distance <= weapon.maximumRangeInches
      )).map((weapon) => weapon.weaponId);
      const moveThenFire = attackerThreat.weapons.filter((weapon) => (
        weapon.moveThenAttackRadiusInches !== null
          && distance <= weapon.moveThenAttackRadiusInches - baseRadiusInches(attacker)
      )).map((weapon) => weapon.weaponId);
      rows.push({
        attackerUnitId: attacker.id,
        targetUnitId: target.id,
        baseEdgeDistanceMilliInches: Math.max(0, Math.round(distance * 1000)),
        stationaryWeaponIds: stationary,
        moveThenFireWeaponIds: moveThenFire,
        chargeCandidate: attackerThreat.charge.maximumRadiusInches !== null
          && distance <= attackerThreat.charge.maximumRadiusInches - baseRadiusInches(attacker),
        coverage: "partial",
        unresolved: ["line_of_sight", "terrain", "elevation", "declared_modifiers"],
      });
    }
  }
  return rows;
}

function aggregate(units, viewerSideKey, relationship) {
  const friendly = viewerSideKey
    ? units.filter((unit) => unit.sideKey === viewerSideKey) : [];
  const enemy = viewerSideKey
    ? units.filter((unit) => unit.sideKey !== viewerSideKey) : [];
  function regionRows(selected) {
    return selected.flatMap((unit) => {
      const threat = unitThreat(unit);
      return [
        ...threat.weapons.flatMap((weapon) => weapon.stationaryRegions),
        ...threat.weapons.flatMap((weapon) => weapon.moveThenAttackRegions),
        ...threat.charge.regions,
      ];
    });
  }
  return {
    viewerSideKey: viewerSideKey || null,
    friendly: { unitIds: friendly.map((unit) => unit.id), regions: regionRows(friendly), coverage: viewerSideKey ? "partial" : "unknown" },
    enemy: { unitIds: enemy.map((unit) => unit.id), regions: regionRows(enemy), coverage: viewerSideKey ? "partial" : "unknown" },
    oneToMany: Object.fromEntries(units.map((unit) => [unit.id, relationship.filter((row) => row.attackerUnitId === unit.id)])),
    manyToOne: Object.fromEntries(units.map((unit) => [unit.id, relationship.filter((row) => row.targetUnitId === unit.id)])),
  };
}

export function projectStarcraftTmgThreatWorkbenchV1(input = {}) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const state = object(projection.state) ? projection.state : {};
  const units = Array.isArray(input.units) ? input.units : [];
  const perUnit = units.map(unitThreat);
  const relationships = candidatePairs(units);
  const legalSpace = object(input.legalSpace) ? input.legalSpace : null;
  const sourceActionRefs = legalSpace ? [
    ...(legalSpace.finiteActions || []), ...(legalSpace.parameterDomains || []),
  ].filter((entry) => /attack|charge|move|assault|combat/iu.test(String(entry.actionType || entry.label || "")))
    .map((entry) => entry.actionKey || entry.domainId).filter(Boolean) : [];
  const core = {
    schemaVersion: STARCRAFT_TMG_THREAT_WORKBENCH_VERSION,
    roomId: projection.room?.roomId || null,
    matchBindingHash: projection.matchBinding?.bindingHash || null,
    stateRevision: projection.room?.stateRevision ?? null,
    stateHash: projection.room?.stateHash || null,
    modes: ["stationary_fire", "move_then_fire", "charge_engagement", "friendly_aggregate", "enemy_aggregate"],
    perUnit,
    relationships,
    aggregates: aggregate(units, projection.viewer?.seatKey || null, relationships),
    dependencies: {
      printedWeaponRange: "exact",
      currentModelCountSpeedBranch: perUnit.every((entry) => entry.speed.exactForPrintedProfile) ? "exact" : "partial",
      modelAndBaseGeometry: perUnit.every((entry) => entry.coverage !== "unknown") ? "exact" : "partial",
      lineOfSight: "partial_target_specific",
      terrain: Array.isArray(state.board?.terrain) ? "present_target_specific" : "unknown",
      elevation: Array.isArray(state.board?.terrain) ? "present_target_specific" : "unknown",
      statuses: "projected_but_modifier_resolution_target_specific",
      upgrades: "projected_but_optional_activation_not_assumed",
    },
    sourceActionRefs,
    coverage: perUnit.some((entry) => entry.coverage === "partial") ? "partial" : "unknown",
    coverageReason: "bounded_candidate_regions_only; exact legality remains Rules Preview authority",
    writesAuthority: false,
    rollsChance: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({ ...core, threatHash: hashStarcraftTmgClientContract(core) });
}

export function isStarcraftTmgThreatWorkbenchV1(value, expected = {}) {
  if (!object(value) || value.schemaVersion !== STARCRAFT_TMG_THREAT_WORKBENCH_VERSION
    || !/^[a-f0-9]{64}$/u.test(String(value.threatHash || ""))
    || !Array.isArray(value.perUnit) || !Array.isArray(value.relationships)
    || !object(value.aggregates) || value.writesAuthority !== false
    || value.rollsChance !== false || value.trainingTruth !== false) return false;
  const { threatHash, ...core } = value;
  if (hashStarcraftTmgClientContract(core) !== threatHash) return false;
  if (expected.roomId && value.roomId !== expected.roomId) return false;
  if (Number.isSafeInteger(expected.stateRevision) && value.stateRevision !== expected.stateRevision) return false;
  if (expected.stateHash && value.stateHash !== expected.stateHash) return false;
  if (expected.matchBindingHash && value.matchBindingHash !== expected.matchBindingHash) return false;
  return true;
}
