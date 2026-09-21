import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
  previewOfficialSelectedRosterRangedActionV1,
  resolveOfficialSelectedRosterRangedChanceV1,
} from "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "./tactical-relationship-graph-v1.mjs";

export const STARCRAFT_TMG_COMBAT_ESTIMATION_RUNTIME_VERSION =
  "starcraft_tmg_combat_estimation_runtime_v1";

const DEFAULT_SAMPLE_BUDGET = 216;
const MIN_SAMPLE_BUDGET = 36;
const MAX_SAMPLE_BUDGET = 1_296;
const MAX_EXHAUSTIVE_OUTCOMES = 1_296;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function sourceDomain(domain) {
  return object(domain?.sourceDomain) ? domain.sourceDomain : domain;
}

function boundedSampleBudget(value, fallback = DEFAULT_SAMPLE_BUDGET) {
  const requested = Number(value || fallback);
  if (!Number.isSafeInteger(requested)) return fallback;
  const bounded = Math.max(MIN_SAMPLE_BUDGET,
    Math.min(MAX_SAMPLE_BUDGET, requested));
  return bounded - (bounded % 6);
}

function seed32(value) {
  const parsed = Number.parseInt(hashStarcraftTmgContract(value).slice(0, 8), 16);
  return parsed || 0x9e3779b9;
}

function nextRandom(state) {
  let value = state.value >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.value = value >>> 0;
  return state.value;
}

function exhaustiveReveals(count) {
  const total = 6 ** count;
  return Array.from({ length: total }, (_, outcomeIndex) => {
    let cursor = outcomeIndex;
    return Array.from({ length: count }, () => {
      const roll = (cursor % 6) + 1;
      cursor = Math.floor(cursor / 6);
      return roll;
    });
  });
}

function sampledReveals(count, sampleCount, seedValue) {
  const random = { value: seed32(seedValue) };
  const offsets = Array.from({ length: count }, () => nextRandom(random) % 6);
  const strides = Array.from({ length: count }, () =>
    (nextRandom(random) & 1) === 0 ? 1 : 5);
  return Array.from({ length: sampleCount }, (_, sampleIndex) =>
    Array.from({ length: count }, (_, dieIndex) => {
      const block = Math.floor(sampleIndex / 6);
      const jitter = nextRandom(random) % 6;
      return ((sampleIndex * strides[dieIndex] + offsets[dieIndex]
        + block + jitter) % 6) + 1;
    }));
}

function wilson(successes, total) {
  if (total < 1) return { low: null, high: null };
  const z = 1.959963984540054;
  const p = successes / total;
  const denominator = 1 + (z ** 2 / total);
  const centre = (p + (z ** 2 / (2 * total))) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) / total)
    + (z ** 2 / (4 * total ** 2))) / denominator;
  return {
    low: Math.max(0, centre - margin),
    high: Math.min(1, centre + margin),
  };
}

function probability(successes, total, exact) {
  const value = total ? successes / total : 0;
  return {
    value,
    percent: Math.round(value * 10_000) / 100,
    successes,
    denominator: total,
    uncertainty95: exact ? { low: value, high: value } : wilson(successes, total),
  };
}

function normalizedParameters(domain, value = {}) {
  const targetUnitId = String(value.targetUnitId
    || domain.parameterSchema?.targetUnitId?.enum?.[0] || "");
  if (!targetUnitId) {
    throw new TypeError("ATTACK_PROBABILITY_TARGET_REQUIRED");
  }
  return {
    targetUnitId,
    pointDefenseSourcePieceIds: Array.isArray(value.pointDefenseSourcePieceIds)
      ? [...new Set(value.pointDefenseSourcePieceIds.map(String))].sort() : [],
    pointDefenseRemovedDieIds: Array.isArray(value.pointDefenseRemovedDieIds)
      ? [...new Set(value.pointDefenseRemovedDieIds.map(String))].sort() : [],
  };
}

function resolveWithOptimalPrecision(state, action, reveals) {
  let resolved = resolveOfficialSelectedRosterRangedChanceV1(state, action, {
    chanceReveals: reveals,
    precisionConvertedFailedHitDieIndices: [],
  });
  const choice = resolved.resolution.precisionChoiceDomain;
  const converted = (choice?.failedHitDieIndices || [])
    .slice(0, Number(choice?.maximumConvertedDice || 0));
  if (converted.length) {
    resolved = resolveOfficialSelectedRosterRangedChanceV1(state, action, {
      chanceReveals: reveals,
      precisionConvertedFailedHitDieIndices: converted,
    });
  }
  return resolved;
}

export function estimateStarcraftTmgAttackProbabilityV1(input = {}) {
  const state = input.state;
  const domain = sourceDomain(input.domain);
  if (!object(state) || !object(domain)
    || domain.parameterKind !== OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND) {
    throw new TypeError("ATTACK_PROBABILITY_CURRENT_RANGED_DOMAIN_REQUIRED");
  }
  const parameters = normalizedParameters(domain, input.parameters);
  const preview = previewOfficialSelectedRosterRangedActionV1(
    state, domain, parameters);
  const chanceCount = Number(preview.chance?.count || 0);
  if (!Number.isSafeInteger(chanceCount) || chanceCount < 1) {
    throw new TypeError("ATTACK_PROBABILITY_CHANCE_LAYOUT_REQUIRED");
  }
  const exhaustiveOutcomeCount = 6 ** chanceCount;
  const exactDistribution = exhaustiveOutcomeCount <= MAX_EXHAUSTIVE_OUTCOMES;
  const requestedBudget = boundedSampleBudget(input.sampleBudget);
  const revealRows = exactDistribution
    ? exhaustiveReveals(chanceCount)
    : sampledReveals(chanceCount, requestedBudget, {
      domainId: input.domain?.domainId || domain.domainId,
      parameters,
      chance: preview.chance,
      sampleBudget: requestedBudget,
    });
  let totalDamage = 0;
  let totalCasualties = 0;
  let anyDamage = 0;
  let anyCasualty = 0;
  let destroyed = 0;
  let minimumDamage = Number.POSITIVE_INFINITY;
  let maximumDamage = 0;
  for (const reveals of revealRows) {
    const resolved = resolveWithOptimalPrecision(state, preview.action, reveals);
    const damage = Number(resolved.resolution.stages.damage.totalDamage || 0);
    const casualties = Number(resolved.casualtyDomain.casualtyCount || 0);
    totalDamage += damage;
    totalCasualties += casualties;
    if (damage > 0) anyDamage += 1;
    if (casualties > 0) anyCasualty += 1;
    if (resolved.casualtyDomain.targetDestroyed === true) destroyed += 1;
    minimumDamage = Math.min(minimumDamage, damage);
    maximumDamage = Math.max(maximumDamage, damage);
  }
  const sampleCount = revealRows.length;
  const resultBody = {
    schemaVersion: STARCRAFT_TMG_COMBAT_ESTIMATION_RUNTIME_VERSION,
    queryKind: "attack_probability",
    domainId: input.domain?.domainId || domain.domainId,
    sourceDomainId: domain.domainId,
    sideKey: domain.sideKey,
    attackerUnitId: domain.pieceId,
    targetUnitId: parameters.targetUnitId,
    weaponName: domain.weaponName || preview.action.weaponName || null,
    profileKey: domain.profileKey || preview.action.rangedPlan?.profileKey || null,
    canonicalParameters: clone(parameters),
    actionHash: preview.actionHash,
    attackPlanHash: preview.action.rangedPlan?.attackPlanHash || null,
    chance: clone(preview.chance),
    contributingModelIds: clone(preview.eligibleAttackerModelIds || []),
    visibleTargetModelIds: clone(preview.visibleTargetModelIds || []),
    outcomes: {
      distribution: exactDistribution
        ? "exact_full_enumeration" : "deterministic_stratified_sample",
      sampleCount,
      exhaustiveOutcomeCount,
      expectedDamage: sampleCount ? totalDamage / sampleCount : 0,
      expectedCasualties: sampleCount ? totalCasualties / sampleCount : 0,
      minimumDamage: Number.isFinite(minimumDamage) ? minimumDamage : 0,
      maximumDamage,
      probabilityAnyDamage: probability(anyDamage, sampleCount,
        exactDistribution),
      probabilityAnyCasualty: probability(anyCasualty, sampleCount,
        exactDistribution),
      probabilityTargetDestroyed: probability(destroyed, sampleCount,
        exactDistribution),
    },
    assumptions: [
      "The current authoritative ranged domain, target and point-defence choices stay frozen.",
      "Every sampled outcome is resolved by the exact Rules hit, surge, armour, evade, damage and casualty runtime.",
      "Available Precision converts the maximum legal failed hit dice for this estimate.",
      "The estimate cannot select, Preview, confirm or Apply an action.",
    ],
    uncertainty: exactDistribution ? {
      kind: "none_full_d6_distribution_enumerated",
    } : {
      kind: "sampling_interval",
      confidenceLevel: 0.95,
      intervalMethod: "wilson_for_bernoulli_outcomes",
      deterministicReproducibleSample: true,
    },
    precision: "advisory_estimate",
    rulesMechanicsPerOutcome: "exact",
    rulesAuthority: false,
    mayMutateRoom: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({
    ...resultBody,
    estimateHash: hashStarcraftTmgContract(resultBody),
  });
}

function relationshipExchangeSummary(graph) {
  const relations = (graph.relationships || []).filter((entry) =>
    entry.edgeKind === "unit_relationship");
  return {
    relationshipGraphHash: graph.relationshipGraphHash,
    ownStationaryProfileCount: relations.reduce((sum, entry) => sum
      + Number(entry.fireZoneExchange?.fromStationaryProfileCount || 0), 0),
    enemyStationaryProfileCount: relations.reduce((sum, entry) => sum
      + Number(entry.fireZoneExchange?.toStationaryProfileCount || 0), 0),
    ownMoveThenFireProfileCount: relations.reduce((sum, entry) => sum
      + Number(entry.fireZoneExchange?.fromMoveThenFireProfileCount || 0), 0),
    enemyMoveThenFireProfileCount: relations.reduce((sum, entry) => sum
      + Number(entry.fireZoneExchange?.toMoveThenFireProfileCount || 0), 0),
    classes: [...new Set(relations.map((entry) =>
      entry.fireZoneExchange?.class).filter(Boolean))].sort(),
    friendlyThreatEdges: clone(graph.aggregates?.friendlyThreat || []),
    enemyThreatEdges: clone(graph.aggregates?.enemyThreat || []),
  };
}

function currentAttackEstimates(state, domains, request) {
  const estimates = [];
  const failures = [];
  const requestedDomainIds = new Set((request.domainIds || []).map(String));
  const requestedSubjectIds = new Set((request.subjectUnitIds || []).map(String));
  for (const domain of domains) {
    if (requestedDomainIds.size && !requestedDomainIds.has(domain.domainId)) {
      continue;
    }
    const source = sourceDomain(domain);
    if (requestedSubjectIds.size && !requestedSubjectIds.has(source.pieceId)) {
      continue;
    }
    if (source.parameterKind !== OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND) {
      continue;
    }
    const targets = request.targetIds?.length
      ? source.parameterSchema.targetUnitId.enum.filter((id) =>
        request.targetIds.map(String).includes(id))
      : source.parameterSchema.targetUnitId.enum;
    for (const targetUnitId of targets) {
      try {
        estimates.push(estimateStarcraftTmgAttackProbabilityV1({
          state,
          domain,
          parameters: { targetUnitId },
          sampleBudget: request.sampleBudgetPerAttack,
        }));
      } catch (error) {
        failures.push({
          domainId: domain.domainId,
          targetUnitId,
          reason: String(error?.message || error).split(":")[0],
        });
      }
    }
  }
  estimates.sort((left, right) =>
    right.outcomes.expectedDamage - left.outcomes.expectedDamage
      || left.domainId.localeCompare(right.domainId)
      || left.targetUnitId.localeCompare(right.targetUnitId));
  return { estimates, failures };
}

function unavailableAlternative(kind, graphSummary) {
  return {
    kind,
    status: "requires_exact_legal_formation_preview",
    currentGeometry: clone(graphSummary),
    expectedDamageDealt: null,
    expectedDamageReceived: null,
    expectedCasualtiesDealt: null,
    expectedCasualtiesReceived: null,
    objectiveScoreOrSupplySwing: null,
    reason: "No current Rules-instantiated hypothetical formation was supplied.",
    mayBeRankedAsKnownValue: false,
  };
}

function hypotheticalAlternative(kind, option) {
  const comparison = option.relationshipComparison || {};
  const tactical = option.tacticalMetrics || {};
  return {
    kind,
    status: "legal_formation_advisory_projection",
    formationOptionId: option.formationOptionId,
    formationReceiptHash: option.formationReceiptHash || null,
    exactRulesInstantiationHash: option.instantiationReceiptHash
      || option.actionHash || null,
    fireZoneExchangeClass: comparison.fireZoneExchangeClass || null,
    ownStationaryProfileCount:
      Number(comparison.friendlyStationaryThreatProfileCount || 0),
    enemyStationaryProfileCount:
      Number(comparison.enemyStationaryThreatProfileCount || 0),
    expectedDamageDealt: null,
    expectedDamageReceived: null,
    expectedCasualtiesDealt: null,
    expectedCasualtiesReceived: null,
    objectiveScoreOrSupplySwing: tactical.objectiveScoreOrSupplySwing ?? null,
    weightedScore: option.weightedScore ?? null,
    probabilityRequiredForDamageRanking: true,
    mayBeRankedAsKnownValue: false,
  };
}

export function estimateStarcraftTmgFireZoneExchangeV1(input = {}) {
  if (!object(input.state) || !String(input.seatKey || "")) {
    throw new TypeError("FIRE_ZONE_EXCHANGE_STATE_AND_SEAT_REQUIRED");
  }
  const request = object(input.request) ? input.request : {};
  const graph = buildStarcraftTmgTacticalRelationshipGraphV1({
    state: input.state,
    seatKey: input.seatKey,
    authority: input.authority,
    request: {
      ...clone(request),
      intent: "fire_zone_exchange",
      maximumRelations: Number(request.maximumRelations || 128),
    },
  });
  const graphSummary = relationshipExchangeSummary(graph);
  const attacks = currentAttackEstimates(input.state,
    input.currentLegalSpaceDomains || [], request);
  const bestAttack = attacks.estimates[0] || null;
  const hold = {
    kind: "hold",
    status: "current_geometry_advisory",
    currentGeometry: clone(graphSummary),
    expectedDamageDealt: bestAttack?.outcomes.expectedDamage ?? null,
    expectedDamageReceived: null,
    expectedCasualtiesDealt: bestAttack?.outcomes.expectedCasualties ?? null,
    expectedCasualtiesReceived: null,
    objectiveScoreOrSupplySwing: null,
    receivedOutcomeUnknownReason:
      "opponent_next_legal_space_not_currently_authoritative",
    mayBeRankedAsKnownValue: false,
  };
  const attack = {
    kind: "attack",
    status: bestAttack ? "current_attack_estimated" : "no_current_attack_domain",
    bestCurrentAttackEstimateHash: bestAttack?.estimateHash || null,
    domainId: bestAttack?.domainId || null,
    targetUnitId: bestAttack?.targetUnitId || null,
    expectedDamageDealt: bestAttack?.outcomes.expectedDamage ?? null,
    expectedDamageReceived: null,
    expectedCasualtiesDealt: bestAttack?.outcomes.expectedCasualties ?? null,
    expectedCasualtiesReceived: null,
    objectiveScoreOrSupplySwing: null,
    receivedOutcomeUnknownReason:
      "opponent_next_legal_space_not_currently_authoritative",
    mayBeRankedAsKnownValue: Boolean(bestAttack),
  };
  const formationOptions = input.formationQueryReceipt?.result
    ?.formationOptions || request.formationOptions || [];
  const alternatives = [hold, attack];
  for (const kind of ["retreat", "disperse"]) {
    const option = formationOptions.find((entry) =>
      entry.intent === kind || entry.tacticalPurpose === kind
        || entry.tags?.includes(kind));
    alternatives.push(option
      ? hypotheticalAlternative(kind, option)
      : unavailableAlternative(kind, graphSummary));
  }
  const resultBody = {
    schemaVersion: STARCRAFT_TMG_COMBAT_ESTIMATION_RUNTIME_VERSION,
    queryKind: "fire_zone_exchange",
    seatKey: input.seatKey,
    authority: clone(input.authority || null),
    currentRelationshipGraphHash: graph.relationshipGraphHash,
    currentGeometry: graphSummary,
    attackEstimates: attacks.estimates,
    attackEstimateFailures: attacks.failures,
    alternatives,
    comparisonPolicy: {
      currentAttackOutcomes: "exact_rules_per_outcome_advisory_distribution",
      currentGeometry: "exact_fields_with_advisory_tactical_interpretation",
      opponentReturnFire:
        "unknown_until_opponent_next_legal_space_or_bound_counterfactual",
      hypotheticalFormation:
        "requires_current_exact_rules_instantiation_before_comparison",
      unknownValuesNeverPromotedToZero: true,
    },
    precision: "advisory_estimate",
    rulesAuthority: false,
    mayMutateRoom: false,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  return freeze({
    ...resultBody,
    estimateHash: hashStarcraftTmgContract(resultBody),
  });
}
