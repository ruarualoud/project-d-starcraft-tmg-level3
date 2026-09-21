import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
  previewOfficialSelectedRosterRangedActionV1,
  projectOfficialSelectedRosterCasualtyStrategyV1,
  projectOfficialSelectedRosterRangedContributionV1,
  resolveOfficialSelectedRosterRangedChanceV1,
} from "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  createOfficialReactionFamilyAdapterV1,
  openOfficialReactionFamilyWindowV1,
} from "../product-composition/official-reaction-family-adapter-v1.mjs";
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

function supplyAtModelCount(profile, currentModels) {
  if (currentModels <= 0) return 0;
  const tier = (profile?.squadProfile || []).find((entry) => (
    entry.minimumModels !== null
      && currentModels >= Number(entry.minimumModels)
      && currentModels <= Number(entry.maximumModels)
  ));
  return tier ? Number(tier.supply) : null;
}

function destroyedSupplyVictoryPointRate(state) {
  const recordKey = state?.mission?.recordKey
    || state?.selectedMission?.profile?.recordKey;
  const mission = (state?.officialMissionEffectCatalogue?.missions || [])
    .find((entry) => entry.missionRef?.recordKey === recordKey);
  const rule = (mission?.scoring?.commonRules || []).find((entry) =>
    entry.kind === "destroyed_enemy_supply_vp");
  return rule ? Number(rule.vpPerDestroyedEnemySupply || 0) : null;
}

function formationEnvelope(models) {
  const positioned = (models || []).filter((model) =>
    Number.isFinite(Number(model.position?.xMilliInches))
      && Number.isFinite(Number(model.position?.yMilliInches)));
  if (positioned.length === 0) return null;
  const x = positioned.map((model) => Number(model.position.xMilliInches));
  const y = positioned.map((model) => Number(model.position.yMilliInches));
  return {
    modelCount: positioned.length,
    minXMilliInches: Math.min(...x),
    maxXMilliInches: Math.max(...x),
    minYMilliInches: Math.min(...y),
    maxYMilliInches: Math.max(...y),
    widthMilliInches: Math.max(...x) - Math.min(...x),
    heightMilliInches: Math.max(...y) - Math.min(...y),
    modelBaseFootprintsExcludedFromEnvelope: true,
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

const RANGED_REACTION_TRIGGERS = Object.freeze([
  "ranged_attack_declared",
  "before_armour_roll",
  "before_evade_roll",
  "damage_received",
  "after_ranged_attack_resolved",
]);

function compactReactionChoice(domain, route) {
  if (domain.actionType === "pass_reaction_family_window") return {
    choiceKind: "pass",
    domainId: domain.domainId,
    sideKey: domain.sideKey,
    voluntaryPass: true,
  };
  const cost = domain.constraints?.resourceCostsByChoice?.default || {};
  return {
    choiceKind: "reaction",
    domainId: domain.domainId,
    sideKey: domain.sideKey,
    definitionId: domain.definitionId,
    sourceInstanceId: domain.sourceInstanceId,
    abilityName: domain.abilityName,
    effectKind: domain.effectKind,
    triggerKind: domain.constraints?.triggerKind || null,
    paymentCardInstanceIds:
      clone(domain.parameterSchema?.paymentCardInstanceIds?.const || []),
    printedResourceCost: Number(cost.printedResourceCost || 0),
    effectiveResourceCost: Number(cost.effectiveResourceCost || 0),
    resourceType: cost.resourceType || route?.resourceType || null,
    resourceCostReduction: Number(cost.resourceCostReduction || 0),
    discountSourcePieceId: cost.discountSourcePieceId || null,
    exhaustsSourceCard: route?.sourceKind === "card_feature"
      && route?.exhaustSourceCard !== false,
    effectParameters: route ? Object.fromEntries(Object.entries(route)
      .filter(([key]) => new Set([
        "tough", "dodge", "evadeModifier", "evadeEligible",
        "hitModifier", "damageReduction", "minimumDamage",
        "redirectedTargetEvadeEligible", "rangeInches", "automaticHits",
        "damagePerHit", "requiredTargetTag", "effectDuration",
      ]).has(key))) : {},
  };
}

function projectReactionOpportunitySet(state, domain, preview, parameters) {
  const bundle = state.officialReactionFamilySourceBundle;
  if (!bundle) return {
    status: "unavailable",
    reason: "reaction_family_source_bundle_missing",
    windows: [],
  };
  const enemyReactionAllowed = preview.action.rangedPlan
    ?.reactionPolicy?.enemyDeclarationAllowed
    ?? true;
  const adapter = createOfficialReactionFamilyAdapterV1(bundle);
  const validTargetUnitIds = clone(
    domain.parameterSchema?.targetUnitId?.enum || [parameters.targetUnitId]);
  const activationId = state.selectedRosterActivationWindow
    ? `${Number(state.round)}:${state.phase}:${state
      .selectedRosterActivationWindow.sideKey}:${state
      .selectedRosterActivationWindow.pieceId}`
    : `${Number(state.round)}:${state.phase}:${preview.action.sideKey}:${preview
      .action.pieceId}:counterfactual`;
  const windows = [];
  for (const triggerKind of RANGED_REACTION_TRIGGERS) {
    try {
      const opened = openOfficialReactionFamilyWindowV1(bundle, state, {
        triggerKind,
        activeSideKey: preview.action.sideKey,
        phase: state.phase,
        activationId,
        sourceActionHash: preview.actionHash,
        resumeActionHash: preview.actionHash,
        context: {
          attackerPieceId: preview.action.pieceId,
          actorPieceId: preview.action.pieceId,
          targetPieceId: parameters.targetUnitId,
          affectedPieceId: parameters.targetUnitId,
          validTargetUnitIds,
          enemyReactionAllowed,
        },
      });
      const activeLegal = adapter.legalSpace(opened.state, {
        sideKey: preview.action.sideKey,
      });
      const passDomain = activeLegal.parameterDomains.find((domain) =>
        domain.actionType === "pass_reaction_family_window");
      let defenderLegal = { parameterDomains: [], prioritySideKey: null };
      if (passDomain) {
        const passPreview = adapter.preview(opened.state, {
          domain: passDomain, parameters: {},
        });
        const advanced = adapter.apply(opened.state, {
          action: passPreview.action,
        });
        defenderLegal = adapter.legalSpace(advanced.state, {
          sideKey: advanced.state.pendingOfficialReactionWindow
            ?.prioritySideKeys?.[advanced.state.pendingOfficialReactionWindow
              ?.priorityIndex],
        });
      }
      const routeById = new Map(bundle.routes.map((route) => [
        route.definitionId, route,
      ]));
      const choiceSet = (legal) => legal.parameterDomains.map((domain) =>
        compactReactionChoice(domain, routeById.get(domain.definitionId)));
      windows.push({
        triggerKind,
        activeSideKey: preview.action.sideKey,
        enemyReactionAllowed,
        prioritySequence: [
          {
            sideKey: activeLegal.prioritySideKey,
            choices: choiceSet(activeLegal),
          },
          {
            sideKey: defenderLegal.prioritySideKey,
            choices: choiceSet(defenderLegal),
            conditionalOnEarlierPriorityResolution: true,
          },
        ],
        choicesMutuallyExclusivePerSidePerActivation: true,
        oneReactionPerPlayerPerActivation: true,
      });
    } catch (error) {
      windows.push({
        triggerKind,
        status: "unknown",
        reason: String(error?.message || error).split(":")[0],
      });
    }
  }
  const unknownWindowCount = windows.filter((window) =>
    window.status === "unknown").length;
  return {
    status: unknownWindowCount === 0
      ? "exact_current_reaction_choice_sets"
      : "partial_with_typed_unknown_reaction_windows",
    enemyReactionAllowed,
    windows,
    unknownWindowCount,
    baselineOutcomeDistributionExcludesOptionalReactionEffects: true,
    optionalReactionEffectsMustBeComparedBeforeActionSelection: true,
    mutationAuthority: false,
    trainingTruth: false,
  };
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
  let totalSupplyAfter = 0;
  let supplyReduced = 0;
  let supplyZero = 0;
  const supplyAfterCounts = new Map();
  const lossStateCounts = new Map();
  let minimumDamage = Number.POSITIVE_INFINITY;
  let maximumDamage = 0;
  const target = (state.pieces || []).find((entry) =>
    entry.id === parameters.targetUnitId);
  const currentSupplyBefore = Number(target?.currentSupply ?? 0);
  const destroyedSupplyVpRate = destroyedSupplyVictoryPointRate(state);
  const targetRangedContribution = target
    ? projectOfficialSelectedRosterRangedContributionV1(state, target.id)
    : { profiles: [] };
  const reactionOpportunitySet = projectReactionOpportunitySet(
    state, domain, preview, parameters);
  for (const reveals of revealRows) {
    const resolved = resolveWithOptimalPrecision(state, preview.action, reveals);
    const damage = Number(resolved.resolution.stages.damage.totalDamage || 0);
    const casualties = Number(resolved.casualtyDomain.casualtyCount || 0);
    const remainingModels = Math.max(0,
      Number(target?.currentModels || 0) - casualties);
    const supplyAfter = supplyAtModelCount(
      resolved.context.targetProfile, remainingModels);
    totalDamage += damage;
    totalCasualties += casualties;
    if (supplyAfter !== null) {
      totalSupplyAfter += supplyAfter;
      if (supplyAfter < currentSupplyBefore) supplyReduced += 1;
      if (supplyAfter === 0) supplyZero += 1;
      supplyAfterCounts.set(supplyAfter,
        Number(supplyAfterCounts.get(supplyAfter) || 0) + 1);
    }
    const lossKey = `${casualties}:${supplyAfter ?? "unknown"}`;
    if (!lossStateCounts.has(lossKey)) lossStateCounts.set(lossKey, {
      casualtyCount: casualties,
      currentModelsAfter: remainingModels,
      currentSupplyAfter: supplyAfter,
      count: 0,
      possibleCasualtyModelIds: new Set(),
      forcedCasualtyModelIds: null,
      selectionExamples: new Map(),
    });
    const lossState = lossStateCounts.get(lossKey);
    lossState.count += 1;
    const legalSelections = resolved.casualtyDomain.legalSelections || [];
    if (legalSelections.length > 0) {
      for (const selection of legalSelections) {
        const casualtyIds = [...new Set(selection.casualtyModelIds || [])].sort();
        for (const modelId of casualtyIds) {
          lossState.possibleCasualtyModelIds.add(modelId);
        }
        const selected = new Set(casualtyIds);
        lossState.forcedCasualtyModelIds = lossState.forcedCasualtyModelIds
          === null ? selected : new Set([...lossState.forcedCasualtyModelIds]
            .filter((modelId) => selected.has(modelId)));
        const selectionKey = casualtyIds.join("|");
        if (lossState.selectionExamples.size < 12
          && !lossState.selectionExamples.has(selectionKey)) {
          const exactStrategic = projectOfficialSelectedRosterCasualtyStrategyV1(
            state, target.id, casualtyIds);
          const lost = new Set(casualtyIds);
          const lostModels = (targetRangedContribution.models || []).filter(
            (model) => lost.has(model.modelId));
          const remainingModels = (targetRangedContribution.models || []).filter(
            (model) => !lost.has(model.modelId));
          const movement = targetRangedContribution.movementProfile;
          const movementBefore = movement?.currentPrintedInches ?? null;
          const movementAfter = remainingModels.length === 0
            ? 0 : remainingModels.length === 1
              ? movement?.singleModelInches ?? null
              : movement?.multiModelInches ?? null;
          const supplyLost = supplyAfter === null
            ? null : currentSupplyBefore - supplyAfter;
          lossState.selectionExamples.set(selectionKey, {
            currentMeleeContributionLosses:
              clone(exactStrategic.currentMeleeContributionLosses || []),
            missionMarkerControlConsequences:
              clone(exactStrategic.missionMarkerControlConsequences || null),
            tacticalMassConsequences:
              clone(exactStrategic.tacticalMassConsequences || null),
            casualtyModelIds: casualtyIds,
            lostModels: clone(lostModels),
            remainingModelIds: clone(selection.remainingModelIds || []),
            formationEnvelopeBefore: clone(
              targetRangedContribution.formationEnvelopeBefore || null),
            formationEnvelopeAfter: formationEnvelope(remainingModels),
            formationReachChanged: JSON.stringify(
              targetRangedContribution.formationEnvelopeBefore || null)
                !== JSON.stringify(formationEnvelope(remainingModels)),
            printedMovementCharacteristicBeforeInches: movementBefore,
            printedMovementCharacteristicAfterInches: movementAfter,
            printedMovementCharacteristicDeltaInches:
              movementBefore === null || movementAfter === null
                ? null : movementAfter - movementBefore,
            movementModifiersRequireFreshLegalSpace: true,
            currentSupplyBefore,
            currentSupplyAfter: supplyAfter,
            supplyLost,
            availableSupplyFreed: supplyLost,
            missionMarkerControlSupplyContributionBefore:
              currentSupplyBefore,
            missionMarkerControlSupplyContributionAfter: supplyAfter,
            missionMarkerControlSupplyContributionLost: supplyLost,
            mayStillControlUncontestedMarkerAtSupplyZero:
              remainingModels.length > 0 && supplyAfter === 0,
            attackerVictoryPointsFromSupplyLoss:
              destroyedSupplyVpRate === null || supplyLost === null
                ? null : destroyedSupplyVpRate * supplyLost,
            supplyControlStrengthChanged:
              supplyLost === null ? null : supplyLost !== 0,
            rangedContributionLosses:
              targetRangedContribution.profiles.map((profile) => {
                const lostContributorModelIds =
                  profile.contributingModelIds.filter((modelId) =>
                    lost.has(modelId));
                return {
                  profileKey: profile.profileKey,
                  weaponName: profile.weaponName,
                  lostContributorModelIds,
                  contributingModelCountBefore:
                    profile.contributingModelIds.length,
                  contributingModelCountAfter:
                    profile.contributingModelIds.length
                      - lostContributorModelIds.length,
                  printedHitDiceBefore: profile.contributingModelIds.length
                    * profile.printedRateOfAttackPerContributor,
                  printedHitDiceAfter: (profile.contributingModelIds.length
                    - lostContributorModelIds.length)
                      * profile.printedRateOfAttackPerContributor,
                  printedHitDiceLost: lostContributorModelIds.length
                    * profile.printedRateOfAttackPerContributor,
                  printedHitThreshold: profile.printedHitThreshold,
                  printedDamagePerConfirmedDie:
                    profile.printedDamagePerConfirmedDie,
                  contributionCompletelyLost: lostContributorModelIds.length
                    === profile.contributingModelIds.length,
                  exactFutureDiceRequireFreshLegalSpace: true,
                };
              }),
            meleePotentialContributionLosses:
              (targetRangedContribution.meleePotentialProfiles || [])
                .map((profile) => {
                  const lostPotentialContributorModelIds =
                    profile.potentialContributingModelIds.filter((modelId) =>
                      lost.has(modelId));
                  return {
                    profileKey: profile.profileKey,
                    weaponName: profile.weaponName,
                    lostPotentialContributorModelIds,
                    potentialContributingModelCountBefore:
                      profile.potentialContributingModelIds.length,
                    potentialContributingModelCountAfter:
                      profile.potentialContributingModelIds.length
                        - lostPotentialContributorModelIds.length,
                    printedPotentialHitDiceLost:
                      lostPotentialContributorModelIds.length
                        * profile.printedRateOfAttackPerContributor,
                    printedHitThreshold: profile.printedHitThreshold,
                    printedDamagePerConfirmedDie:
                      profile.printedDamagePerConfirmedDie,
                    exactFutureDiceRequireEngagementAndFreshLegalSpace: true,
                  };
                }),
          });
        }
      }
    } else {
      for (const modelId of resolved.casualtyDomain.selectionContract
        ?.candidateModelIds || []) {
        lossState.possibleCasualtyModelIds.add(modelId);
      }
    }
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
    reactionOpportunitySet,
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
      currentSupplyBefore,
      expectedSupplyAfter: sampleCount ? totalSupplyAfter / sampleCount : null,
      expectedSupplyLoss: sampleCount
        ? currentSupplyBefore - (totalSupplyAfter / sampleCount) : null,
      expectedVictoryPointsAwardedToAttackerFromSupplyLoss:
        sampleCount && destroyedSupplyVpRate !== null
          ? (currentSupplyBefore - (totalSupplyAfter / sampleCount))
            * destroyedSupplyVpRate : null,
      expectedAvailableSupplyFreedForDefender: sampleCount
        ? currentSupplyBefore - (totalSupplyAfter / sampleCount) : null,
      destroyedSupplyVictoryPointRate: destroyedSupplyVpRate,
      probabilitySupplyReduced: probability(supplyReduced, sampleCount,
        exactDistribution),
      probabilitySupplyZero: probability(supplyZero, sampleCount,
        exactDistribution),
      supplyAfterDistribution: [...supplyAfterCounts.entries()]
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([supply, count]) => ({
          currentSupplyAfter: Number(supply),
          probability: probability(count, sampleCount, exactDistribution),
        })),
      lossStateDistribution: [...lossStateCounts.values()]
        .sort((left, right) => left.casualtyCount - right.casualtyCount
          || Number(left.currentSupplyAfter) - Number(right.currentSupplyAfter))
        .map((entry) => {
          const possibleCasualtyModelIds = [
            ...entry.possibleCasualtyModelIds,
          ].sort();
          const forcedCasualtyModelIds = entry.forcedCasualtyModelIds
            ? [...entry.forcedCasualtyModelIds].sort() : [];
          const positionFor = (modelId) => {
            const model = (target?.models || []).find((candidate) =>
              candidate.id === modelId);
            const xMilliInches = Number.isFinite(Number(model?.xInches))
              ? Math.round(Number(model.xInches) * 1000)
              : Number.isFinite(Number(model?.xMilliInches))
                ? Number(model.xMilliInches) : null;
            const yMilliInches = Number.isFinite(Number(model?.yInches))
              ? Math.round(Number(model.yInches) * 1000)
              : Number.isFinite(Number(model?.yMilliInches))
                ? Number(model.yMilliInches) : null;
            return model && xMilliInches !== null && yMilliInches !== null ? {
              modelId,
              xMilliInches,
              yMilliInches,
              baseRotationDegrees: Number(model.baseRotationDegrees || 0),
            } : { modelId, position: "unknown" };
          };
          return {
            casualtyCount: entry.casualtyCount,
            probability: probability(entry.count, sampleCount,
              exactDistribution),
            currentModelsAfter: entry.currentModelsAfter,
            currentSupplyAfter: entry.currentSupplyAfter,
            supplyControlStrengthChanged:
              entry.currentSupplyAfter !== currentSupplyBefore,
            missionMarkerControlSupplyContributionBefore:
              currentSupplyBefore,
            missionMarkerControlSupplyContributionAfter:
              entry.currentSupplyAfter,
            missionMarkerControlSupplyContributionLost:
              entry.currentSupplyAfter === null
                ? null : currentSupplyBefore - entry.currentSupplyAfter,
            mayStillControlUncontestedMarkerAtSupplyZero:
              entry.currentModelsAfter > 0 && entry.currentSupplyAfter === 0,
            possibleCasualtyModelIds,
            forcedCasualtyModelIds,
            possibleLostOccupiedPositions:
              possibleCasualtyModelIds.map(positionFor),
            forcedLostOccupiedPositions:
              forcedCasualtyModelIds.map(positionFor),
            casualtySelectionExamples: [...entry.selectionExamples.values()],
            casualtyChoiceMaterializationCapped:
              entry.selectionExamples.size >= 12,
            strategicConsequences: {
              lostPotentialModelContributors: entry.casualtyCount,
              potentialModelContributorsAfterUpperBound:
                entry.currentModelsAfter,
              futureAttackDiceRequireFreshLegalSpace: true,
              printedMovementCharacteristicMayChangeAtSingleModelThreshold:
                targetRangedContribution.movementProfile
                  ?.multiModelInches !== targetRangedContribution
                    .movementProfile?.singleModelInches,
              formationReachAndContactCoverageMustBeRecomputed: true,
              objectiveInteractionMustBeRecomputed: true,
              exactRemovedModelsKnownAfterDefenderSelection: true,
            },
          };
        }),
    },
    assumptions: [
      "The current authoritative ranged domain, target and point-defence choices stay frozen.",
      "Every sampled outcome is resolved by the exact Rules hit, surge, armour, evade, damage and casualty runtime.",
      "Available Precision converts the maximum legal failed hit dice for this estimate.",
      "Supply-after outcomes use the target's frozen official squad-profile tiers after the exact casualty count.",
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
