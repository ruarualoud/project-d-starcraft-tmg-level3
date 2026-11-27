import {compileMeleeProbabilityQueryParametersV1} from './melee-probability-query-parameters-v1.mjs';
import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
  createOfficialSelectedRosterRangedChanceResolverV1,
  createOfficialSelectedRosterRangedWorkChanceResolverV1,
  createOfficialSelectedRosterRangedPreviewBatchV1,
  createOfficialSelectedRosterCasualtyStrategyBatchV1,
  createOfficialSelectedRosterRangedQueryBatchV1,
  previewOfficialSelectedRosterRangedActionV1,
  projectOfficialSelectedRosterCasualtyStrategyV1,
  projectOfficialSelectedRosterRangedContributionV1,
  validateOfficialRangedDamageReactionChoicesV1,
  resolveOfficialSelectedRosterRangedDamageReactionPolicyV1,
} from "../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs";
import {
  createOfficialReactionFamilyAdapterV1,
  createOfficialReactionWindowOpportunityBatchV1,
  openOfficialReactionFamilyWindowV1,
} from "../product-composition/official-reaction-family-adapter-v1.mjs";
import { buildStarcraftTmgTacticalRelationshipGraphV1 } from
  "./tactical-relationship-graph-v1.mjs";
import { OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND,
  createOfficialSelectedRosterMeleeChanceResolverV1 } from
  "../product-composition/official-selected-roster-melee-action-runtime-v1.mjs";

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
  // Formal rooms can compose Match → release component → native weapon.
  // A delegated action with a different contract remains its own action.
  const current = object(domain?.sourceDomain) ? domain.sourceDomain : domain;
  const native = current?.sourceDomain;
  if ((current?.sourceRuntimeKind === "melee" || current?.sourceRuntimeKind === "ranged")
    && object(native) && native.actionType === current.actionType
    && native.parameterKind === current.parameterKind) return native;
  return current;
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

function resolveWithOptimalPrecision(resolveChance, reveals) {
  let resolved = resolveChance.resolvePool({
    chanceReveals: reveals,
    precisionConvertedFailedHitDieIndices: [],
  });
  const choice = resolved.resolution.precisionChoiceDomain;
  const converted = (choice?.failedHitDieIndices || [])
    .slice(0, Number(choice?.maximumConvertedDice || 0));
  if (converted.length) {
    resolved = resolveChance.resolvePool({
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

function projectReactionOpportunitySet(state, domain, preview, parameters,
  windowBatch = null) {
  const bundle = state.officialReactionFamilySourceBundle;
  if (!bundle) return {
    status: "unavailable",
    reason: "reaction_family_source_bundle_missing",
    windows: [],
  };
  const enemyReactionAllowed = preview.action.rangedPlan
    ?.reactionPolicy?.enemyDeclarationAllowed
    ?? true;
  const adapter = windowBatch ? null : createOfficialReactionFamilyAdapterV1(bundle);
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
      const windowInput = {
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
      };
      let activeLegal;
      let defenderLegal;
      if (windowBatch) {
        ({ activeLegal, defenderLegal } = windowBatch.projectWindow(windowInput));
      } else {
        const opened = openOfficialReactionFamilyWindowV1(bundle, state, windowInput);
        activeLegal = adapter.legalSpace(opened.state, {
          sideKey: preview.action.sideKey,
        });
        const passDomain = activeLegal.parameterDomains.find((domain) =>
          domain.actionType === "pass_reaction_family_window");
        defenderLegal = { parameterDomains: [], prioritySideKey: null };
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
  return estimateAttackProbability(input, previewOfficialSelectedRosterRangedActionV1);
}

// A batch owns its fixed query state; it cannot follow subsequent caller/Room
// mutations. All domains, disabled diagnostics and target plans remain complete.
export function createStarcraftTmgAttackProbabilityBatchV1({ state, sideKey,
  observePreparation } = {}) {
  const observe = typeof observePreparation === "function"
    ? event => { try { observePreparation(event); } catch {} } : null;
  const clock = () => {
    let cpu;
    try { cpu = process.threadCpuUsage?.(); } catch {}
    return { wall: performance.now(), cpu };
  };
  const elapsed = start => {
    let threadCpuMs = null;
    try { if (start.cpu) {
      const cpu = process.threadCpuUsage(start.cpu);
      threadCpuMs = (cpu.user + cpu.system) / 1000;
    } } catch {}
    return { wallMs: performance.now() - start.wall, threadCpuMs };
  };
  const preparationStart = observe ? clock() : null;
  const prepared = createOfficialSelectedRosterRangedQueryBatchV1(state, {
    sideKey, includeDisabled: true, observeContext: observe,
  });
  if (observe) observe({ stage: "ranged_probability_batch_prepared", sideKey,
    ...elapsed(preparationStart) });
  const snapshot = prepared.snapshot;
  let reactionWindows;
  return Object.freeze({
    enumeration: prepared.enumeration,
    estimate(input = {}) {
      if (sourceDomain(input.domain)?.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND) {
        return estimateStarcraftTmgAttackProbabilityV1({ ...input, state: snapshot });
      }
      // The native preview derives and validates this context on the batch's
      // private fixed state. Keep it local to this estimate; neither the caller
      // nor another domain/target may supply or replace prepared chance facts.
      let work;
      // Diagnostics stay outside Rules results and model inputs. Aggregate each
      // category once per estimate rather than emitting every sampled outcome.
      const timings = observe ? new Map() : null;
      const measured = (category, run) => {
        if (!timings) return run();
        const start = clock();
        try { return run(); }
        finally {
          const duration = elapsed(start);
          const total = timings.get(category) || {
            callCount: 0, wallMs: 0, threadCpuMs: 0, cpuAvailable: true,
          };
          total.callCount += 1;
          total.wallMs += duration.wallMs;
          total.cpuAvailable &&= duration.threadCpuMs !== null;
          if (duration.threadCpuMs !== null) total.threadCpuMs += duration.threadCpuMs;
          timings.set(category, total);
        }
      };
      const estimateStart = observe ? clock() : null;
      try { return estimateAttackProbability({ ...input, state: snapshot },
        (_state, domain, parameters) => {
          work = measured("preview", () => prepared.previewWork(domain, parameters));
          return work.preview;
        },
        (_state, pieceId, casualtyIds) => measured("strategic_casualty_control",
          () => prepared.projectCasualty(pieceId, casualtyIds)),
        (_state, _action, options) => {
          const resolver = measured("chance_preparation",
            () => work.createChanceResolver(options));
          if (!timings) return resolver;
          return {
            resolvePool: (...args) => measured("dice_pool",
              () => resolver.resolvePool(...args)),
            casualtyDomainForResolution: (...args) => measured("casualty_domain",
              () => resolver.casualtyDomainForResolution(...args)),
          };
        },
        (_state, domain, preview, parameters) => measured("reaction_opportunities", () => {
          if (snapshot.officialReactionFamilySourceBundle) {
            reactionWindows ||= createOfficialReactionWindowOpportunityBatchV1({
              state: snapshot, bundle: snapshot.officialReactionFamilySourceBundle,
            });
          }
          return projectReactionOpportunitySet(snapshot, domain, preview,
            parameters, reactionWindows);
        })); }
      finally { if (observe) {
        observe({ stage: "ranged_probability_estimate_measured", sideKey,
          pieceId: input.domain?.pieceId || input.domain?.sourceDomain?.pieceId || null,
          targetUnitId: input.parameters?.targetUnitId || null,
          ...elapsed(estimateStart), categories: [...timings].map(([category, total]) => ({
            category, callCount: total.callCount, wallMs: total.wallMs,
            threadCpuMs: total.cpuAvailable ? total.threadCpuMs : null,
          })) });
      } }
    },
  });
}

function attackProbabilityPreview(input, previewAction) {
  const state = input.state;
  const domain = sourceDomain(input.domain);
  if (object(state) && domain?.parameterKind === OFFICIAL_SELECTED_ROSTER_FIGHT_PARAMETER_KIND) {
    const { targetUnitId, ...parameters } =
      compileMeleeProbabilityQueryParametersV1(domain, input.parameters) || {};
    // Allocation, weapon, Close Ranks and effects remain explicit Agent choices.
    // Multi-target Precision allocation needs a separately declared policy.
    if (!targetUnitId || parameters.allocations?.length !== 1
      || parameters.allocations[0].targetUnitId !== targetUnitId) {
      throw new TypeError("MELEE_PROBABILITY_TARGET_ALLOCATION_REQUIRED");
    }
    if (input.damageReactionChoices !== undefined) {
      throw new TypeError("MELEE_PROBABILITY_REACTION_POLICY_NOT_SUPPORTED");
    }
    const meleeWork = createOfficialSelectedRosterMeleeChanceResolverV1(state, domain, parameters);
    return { domain, parameters: { ...clone(meleeWork.preview.action.meleePlan.canonicalParameters),
      targetUnitId }, preview: meleeWork.preview, meleeWork };
  }
  if (!object(state) || !object(domain)
    || domain.parameterKind !== OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND) {
    throw new TypeError("ATTACK_PROBABILITY_CURRENT_RANGED_DOMAIN_REQUIRED");
  }
  const parameters = normalizedParameters(domain, input.parameters);
  const preview = previewAction(
    state, domain, parameters);
  return { domain, parameters, preview };
}

function meleeProbabilityChanceAdapter(work, targetUnitId) {
  const casualtyByResolution = new Map();
  return {
    resolvePool({ chanceReveals, precisionConvertedFailedHitDieIndices = [] }) {
      const row = work.resolve({ chanceReveals,
        precisionConvertedFailedDieIndicesByTarget: {
          [targetUnitId]: precisionConvertedFailedHitDieIndices,
        } }).rows.find(entry => entry.targetUnitId === targetUnitId);
      if (!row) throw new TypeError("MELEE_PROBABILITY_NATIVE_TARGET_MISSING");
      const targetPlan = work.preview.action.meleePlan.fightChancePlan.targets
        .find(entry => entry.targetUnitId === targetUnitId);
      // Only a transport projection of Native results; no hit/damage formula.
      const resolution = { ...row.resolution,
        stages: { damage: { totalDamage: row.resolution.totalDamage } },
        precisionChoiceDomain: {
          failedHitDieIndices: row.resolution.failedHitDieIndices,
          maximumConvertedDice: Math.min(row.resolution.activePrecisionValue,
            Number(targetPlan.precision || 0)),
        } };
      casualtyByResolution.set(resolution.resolutionHash, row.casualtyDomain);
      return { resolution, context: { targetProfile: row.targetProfile } };
    },
    casualtyDomainForResolution(resolution) {
      const domain = casualtyByResolution.get(resolution.resolutionHash);
      if (!domain) throw new TypeError("MELEE_PROBABILITY_NATIVE_CASUALTY_MISSING");
      return domain;
    },
  };
}

function estimateAttackProbability(
  input, previewAction, projectCasualty = projectOfficialSelectedRosterCasualtyStrategyV1,
  createChanceResolver = createOfficialSelectedRosterRangedChanceResolverV1,
  projectReactions = projectReactionOpportunitySet,
) {
  const { domain, parameters, preview, meleeWork } = attackProbabilityPreview(input, previewAction);
  const state = meleeWork?.snapshot || input.state;
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
  const reactionOpportunitySet = meleeWork ? {
    status: "baseline_excludes_optional_melee_reactions", windows: [],
    baselineOutcomeDistributionExcludesOptionalReactionEffects: true,
    optionalReactionEffectsMustBeComparedBeforeActionSelection: true,
    mutationAuthority: false, trainingTruth: false,
  } : projectReactions(state, domain, preview, parameters);
  const damageReactionChoices=input.damageReactionChoices===undefined?null
    :validateOfficialRangedDamageReactionChoicesV1(input.damageReactionChoices);
  if (damageReactionChoices) {
    const opportunities=reactionOpportunitySet.windows.find(w=>w.triggerKind==='damage_received');
    for (const choice of damageReactionChoices) {
      const available=opportunities?.prioritySequence?.find(p=>p.sideKey===choice.sideKey)?.choices||[];
      const matched=available.some(c=>choice.choiceKind==='pass'?c.choiceKind==='pass'
        :c.choiceKind==='reaction'&&c.definitionId===choice.definitionId
          &&c.sourceInstanceId===choice.sourceInstanceId
          &&JSON.stringify([...(c.paymentCardInstanceIds||[])].sort())===JSON.stringify([...choice.paymentCardInstanceIds].sort()));
      if (!matched) throw new TypeError('ATTACK_PROBABILITY_DAMAGE_REACTION_CHOICE_NOT_IN_CURRENT_OPPORTUNITIES');
    }
  }
  const resolveChance = meleeWork ? meleeProbabilityChanceAdapter(meleeWork, parameters.targetUnitId)
    : createChanceResolver(state, preview.action, { observeContext: input.observeChanceContext });
  // Dice and Precision remain exact for EVERY row. Only physical casualties
  // are shared: with the same immutable target/visibility/engagement and damage,
  // their legal model choices, markers and Supply are identical. Per-roll receipt
  // hashes are not probability output; ordinary Rules resolution still binds
  // each full casualty domain to its own resolution hash.
  const casualtyByDamage = new Map();
  const reactionByDamage=new Map();
  const resourcePayments=new Map();
  const cardExhaustions=new Map();
  let totalFinalDamagePool=0;
  for (const reveals of revealRows) {
    const pool = resolveWithOptimalPrecision(resolveChance, reveals);
    const rawDamage = Number(pool.resolution.stages.damage.totalDamage || 0);
    let reaction=null;
    if (damageReactionChoices) {
      if (!reactionByDamage.has(rawDamage)) reactionByDamage.set(rawDamage,{
        ...resolveOfficialSelectedRosterRangedDamageReactionPolicyV1({
          state,action:preview.action,chance:pool,choices:damageReactionChoices}),sampleCount:0});
      reaction=reactionByDamage.get(rawDamage);
      reaction.sampleCount+=1;
      for (const payment of reaction.payments) {
        const key=`${payment.sideKey}:${payment.resourceType}`;
        const current=resourcePayments.get(key)||{sideKey:payment.sideKey,resourceType:payment.resourceType,totalCost:0};
        current.totalCost+=payment.cost;resourcePayments.set(key,current);
      }
      for (const card of reaction.cardExhaustions) {
        const current=cardExhaustions.get(card.cardInstanceId)||{...card,count:0};
        current.count+=1;cardExhaustions.set(card.cardInstanceId,current);
      }
    }
    const reduction=reaction?.chance.resolution.stages.damage.reactionDamagePool;
    const finalDamagePool=reduction?.totalDamageAfterReduction
      ??Number(target?.damageMarker||0)+rawDamage;
    const damage=reduction?Math.max(0,finalDamagePool-Number(target?.damageMarker||0)):rawDamage;
    totalFinalDamagePool+=finalDamagePool;
    if (!casualtyByDamage.has(rawDamage)) {
      casualtyByDamage.set(rawDamage,reaction?.chance.casualtyDomain
        ||resolveChance.casualtyDomainForResolution(pool.resolution));
    }
    const resolved = { ...pool, casualtyDomain: casualtyByDamage.get(rawDamage) };
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
          const exactStrategic = projectCasualty(
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
    ...(meleeWork ? { attackKind: "melee" } : {}),
    domainId: input.domain?.domainId || domain.domainId,
    sourceDomainId: domain.domainId,
    sideKey: domain.sideKey,
    attackerUnitId: domain.pieceId,
    targetUnitId: parameters.targetUnitId,
    weaponName: domain.weaponName || preview.action.weaponName || null,
    profileKey: domain.profileKey || preview.action.rangedPlan?.profileKey
      || preview.action.meleePlan?.profileKey || null,
    canonicalParameters: clone(parameters),
    actionHash: preview.actionHash,
    attackPlanHash: preview.action.rangedPlan?.attackPlanHash
      || preview.action.meleePlan?.fightPlanHash || null,
    chance: clone(preview.chance),
    outcomeSampleHash:hashStarcraftTmgContract(revealRows),
    contributingModelIds: clone(preview.eligibleAttackerModelIds
      || preview.action.meleePlan?.contributingModelIds || []),
    visibleTargetModelIds: clone(preview.visibleTargetModelIds
      || (meleeWork ? (target?.models || []).filter(m => !m.isDestroyed).map(m => m.id) : [])),
    reactionOpportunitySet,
    damageReactionPolicy:damageReactionChoices?{
      status:'native_explicit_policy_applied',choices:clone(damageReactionChoices),
      trigger:'positive_damage_received',nativePaymentAndEffectResolution:true,
      otherOptionalReactionStagesExcluded:true,
      expectedResourcePayments:[...resourcePayments.values()].map(({totalCost,...row})=>
        ({...row,expectedCost:sampleCount?totalCost/sampleCount:null})),
      expectedCardExhaustions:[...cardExhaustions.values()].map(({count,...row})=>
        ({...row,probability:probability(count,sampleCount,exactDistribution)})),
      effectCases:[...reactionByDamage].map(([rawDamage,r])=>({rawDamage,sampleCount:r.sampleCount,
        probability:probability(r.sampleCount,sampleCount,exactDistribution),
        damagePool:clone(r.chance.resolution.stages.damage.reactionDamagePool||null),
        nativeReactionResolutionHash:r.nativeReactionResolutionHash,
        effects:clone(r.effects),payments:clone(r.payments),positiveDamageTriggered:r.positiveDamageTriggered})),
      mutatesSourceState:false,trainingTruth:false,
    }:null,
    outcomes: {
      distribution: exactDistribution
        ? "exact_full_enumeration" : "deterministic_stratified_sample",
      sampleCount,
      exhaustiveOutcomeCount,
      expectedDamage: sampleCount ? totalDamage / sampleCount : 0,
      expectedTotalDamagePoolAfterReactions:sampleCount?totalFinalDamagePool/sampleCount:null,
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
      ...(meleeWork ? [
        "The current Native melee domain, one target, allocation and Close Ranks choices stay frozen.",
        "Optional reactions are excluded; this is a conditional single-attack baseline, not an automatic exchange or predicted opponent response.",
        "Charge reach, arrival history and sequential multi-attacker damage are not measured.",
      ] : ["The current authoritative ranged domain, target and point-defence choices stay frozen."]),
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
    entry.edgeKind === "unit_spatial_relationship"
      || entry.edgeKind === "unit_relationship");
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

function currentAttackQueries(domains, request) {
  const queries = [];
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
      queries.push({ domain, parameters: { targetUnitId },
        sampleBudget: request.sampleBudgetPerAttack });
    }
  }
  return queries;
}

function sortAttackEstimates(estimates) {
  return estimates.sort((left, right) =>
    right.outcomes.expectedDamage - left.outcomes.expectedDamage
      || left.domainId.localeCompare(right.domainId)
      || left.targetUnitId.localeCompare(right.targetUnitId));
}

function attackFailure(query, error) {
  return { domainId: query.domain.domainId,
    targetUnitId: query.parameters.targetUnitId,
    reason: String(error?.message || error).split(":")[0] };
}

function currentAttackEstimates(state, domains, request) {
  const estimates = [];
  const failures = [];
  // All targets for one side share this immutable query snapshot. Reuse the
  // ordinary Rules enumeration and casualty projections, not sampled outcomes
  // or strategic rankings. A later query owns a fresh batch.
  const probabilityBatchesBySide = new Map();
  for (const query of currentAttackQueries(domains, request)) {
    const source = sourceDomain(query.domain);
    try {
      if (!source.sideKey) {
        // Preserve the standalone validation/error contract for malformed
        // legacy domains instead of substituting the requesting seat.
        estimates.push(estimateStarcraftTmgAttackProbabilityV1({ state, ...query }));
        continue;
      }
      if (!probabilityBatchesBySide.has(source.sideKey)) {
        probabilityBatchesBySide.set(source.sideKey,
          createStarcraftTmgAttackProbabilityBatchV1({ state, sideKey: source.sideKey }));
      }
      estimates.push(probabilityBatchesBySide.get(source.sideKey).estimate(query));
    } catch (error) {
      failures.push(attackFailure(query, error));
    }
  }
  sortAttackEstimates(estimates);
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
  return fireZoneExchangeResult(input, request, graph, graphSummary, attacks);
}

// Explain the same domain/subject/target selection used by estimation. A missing
// current attack is not zero damage, a missing tool, or proof about another turn.
// This is factual query feedback; it never changes side, phase or strategy.
export function describeStarcraftTmgFireAttackSelectionV1(input, request, attacks) {
  const domains = input.currentLegalSpaceDomains || [];
  const ranged = domains.filter(domain => sourceDomain(domain).parameterKind
    === OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND);
  const selected = currentAttackQueries(domains, request);
  const subjects = [...new Set(request.subjectUnitIds?.length
    ? request.subjectUnitIds.map(String) : ranged.map(domain => sourceDomain(domain).pieceId))];
  const subjectDetails = subjects.map(unitId => {
    const piece = input.state?.pieces?.find(entry => entry.id === unitId);
    const current = ranged.filter(domain => sourceDomain(domain).pieceId === unitId);
    return { unitId, ownerSideKey: piece?.sideKey ?? null,
      sameSideAsQuerySeat: piece?.sideKey ? piece.sideKey === input.seatKey : null,
      currentRangedDomainIds: current.map(domain => domain.domainId),
      selectedPairs: selected.filter(query => sourceDomain(query.domain).pieceId === unitId)
        .map(query => ({ domainId: query.domain.domainId, targetUnitId: query.parameters.targetUnitId })) };
  });
  let emptyReason = null;
  if (!attacks.estimates.length) {
    emptyReason = !ranged.length ? 'no_current_ranged_domains'
      : subjectDetails.length && subjectDetails.every(subject => !subject.currentRangedDomainIds.length)
        ? 'requested_subject_has_no_current_ranged_domain'
        : !selected.length ? 'requested_filters_match_no_current_attack_pair'
          : attacks.failures.length ? 'selected_attack_estimation_failed'
            : 'selected_attack_result_missing';
  }
  return { phase: input.state?.phase ?? null, querySeatKey: input.seatKey,
    availableRangedDomainCount: ranged.length, selectedPairCount: selected.length,
    requestedDomainIds: clone(request.domainIds || []), requestedTargetIds: clone(request.targetIds || []),
    subjects: subjectDetails, emptyReason,
    scope: 'current_native_ranged_domain_selection_only',
    instruction: 'Only selected current ranged domains are estimated. A unit owned by another side may have no domain in this branch. Choose and verify explicit scenario prerequisites if needed; this diagnostic does not choose a phase, authorize an action, predict return fire or prove zero damage.' };
}

function fireZoneExchangeResult(input, request, graph, graphSummary, attacks) {
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
    attackSelection: describeStarcraftTmgFireAttackSelectionV1(input, request, attacks),
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

// Internal CPU work protocol. The Room adapter owns/validates the snapshot;
// no public query accepts these prepared previews as authority or an action.
// Shared native preview enumeration is performed once per side before ATTACK
// jobs fan out. The independent graph can start while previews are prepared.
// Each attack still executes its entire original deterministic sample
// stream and all casualty consequences, so no sample/first-example merge occurs.
export function createStarcraftTmgFireExchangeWorkV1(input = {}) {
  return createFireExchangeWork(input, new Map());
}

// One private fixed-state owner for all fire queries in a readonly batch. The
// caller can provide requests, never an enumeration or prepared Chance context.
export function createStarcraftTmgFireExchangeWorkPlannerV1({ state } = {}) {
  const snapshot = freeze(clone(state));
  const previewBatchesBySide = new Map();
  return input => createFireExchangeWork({ ...input, state: snapshot },
    previewBatchesBySide);
}

function createFireExchangeWork(input, previewBatchesBySide) {
  if (!object(input.state) || !String(input.seatKey || "")) {
    throw new TypeError("FIRE_ZONE_EXCHANGE_STATE_AND_SEAT_REQUIRED");
  }
  const request = object(input.request) ? input.request : {};
  const jobs = [{ kind: "fire_relationships", seatKey: input.seatKey,
    authority: clone(input.authority), request: { ...clone(request),
      intent: "fire_zone_exchange",
      maximumRelations: Number(request.maximumRelations || 128) } }];
  // Only the internally owned scheduler receives this job. It needs no ranged
  // preview, and must use the same complete snapshot as all later attack jobs.
  input.onIndependentWork?.(jobs[0]);
  for (const query of currentAttackQueries(input.currentLegalSpaceDomains || [], request)) {
    try {
      const source = sourceDomain(query.domain);
      let previewAction = previewOfficialSelectedRosterRangedActionV1;
      let chanceContext;
      if (source.sideKey) {
        if (!previewBatchesBySide.has(source.sideKey)) {
          previewBatchesBySide.set(source.sideKey,
            createOfficialSelectedRosterRangedPreviewBatchV1(input.state, {
              sideKey: source.sideKey, includeDisabled: true,
              observeContext: input.observePreparation,
            }));
        }
        const batch = previewBatchesBySide.get(source.sideKey);
        previewAction = (_state, domain, parameters) => {
          const work = batch.previewWork(domain, parameters);
          chanceContext = work.chanceContext;
          return work.preview;
        };
      }
      const { preview } = attackProbabilityPreview({ state: input.state, ...query }, previewAction);
      jobs.push({ kind: "fire_attack", query: clone(query), preview,
        ...(chanceContext ? { chanceContext } : {}) });
    } catch (error) {
      jobs.push({ kind: "fire_attack_failure", failure: attackFailure(query, error) });
    }
  }
  return freeze(jobs);
}

export function createStarcraftTmgFireExchangeWorkEvaluatorV1({ state, observeChanceContext } = {}) {
  let casualtyStrategies = null;
  return function evaluate(job) {
    if (job?.kind === "fire_relationships") {
      try {
        return { graph: buildStarcraftTmgTacticalRelationshipGraphV1({ state,
          seatKey: job.seatKey, authority: job.authority, request: job.request }) };
      } catch (error) {
        // Preserve a Rules/domain failure, not a worker-transport retry signal.
        return { error: { name: error?.name, message: String(error?.message || error),
          ...(error?.code ? { code: error.code } : {}) } };
      }
    }
    if (job?.kind === "fire_attack_failure") return { failure: clone(job.failure) };
    if (job?.kind !== "fire_attack") throw new TypeError("FIRE_EXCHANGE_WORK_KIND_INVALID");
    try {
      if (!casualtyStrategies) {
        casualtyStrategies = createOfficialSelectedRosterCasualtyStrategyBatchV1(state);
      }
      return { estimate: estimateAttackProbability({ state, ...job.query, observeChanceContext },
        () => job.preview,
        (_state, pieceId, casualtyIds) => casualtyStrategies.project(pieceId, casualtyIds),
        job.chanceContext ? (_state, action, options) =>
          createOfficialSelectedRosterRangedWorkChanceResolverV1(
            _state, action, job.chanceContext, options)
          : createOfficialSelectedRosterRangedChanceResolverV1) };
    } catch (error) { return { failure: attackFailure(job.query, error) }; }
  };
}

export function finishStarcraftTmgFireExchangeWorkV1(input, parts) {
  if (parts[0]?.error) {
    const error = new Error(parts[0].error.message);
    error.name = parts[0].error.name || "Error";
    if (parts[0].error.code) error.code = parts[0].error.code;
    throw error;
  }
  const graph = parts[0]?.graph;
  if (!graph) throw new TypeError("FIRE_EXCHANGE_GRAPH_RESULT_REQUIRED");
  const estimates = [];
  const failures = [];
  for (const part of parts.slice(1)) {
    if (part?.estimate) estimates.push(part.estimate);
    else if (part?.failure) failures.push(part.failure);
    else throw new TypeError("FIRE_EXCHANGE_ATTACK_RESULT_REQUIRED");
  }
  return fireZoneExchangeResult(input, object(input.request) ? input.request : {},
    graph, relationshipExchangeSummary(graph),
    { estimates: sortAttackEstimates(estimates), failures });
}
