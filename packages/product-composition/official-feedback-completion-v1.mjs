import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialNonLethalDamageV1 } from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import { hasOfficialNonLethalDamagePolicyV1, hasOfficialNonLethalStandardDamagePolicyV1 }
  from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { hasOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';

export const OFFICIAL_FEEDBACK_COMPLETION_ATOM_ID = 'rule-atom:source-bound-feedback-after-unit-ability-v1';
export const OFFICIAL_FEEDBACK_REACTION_TIMING_POLICY_V1 = Object.freeze({
  schema: 'starcraft_tmg_feedback_reaction_timing_policy_v1', version: '1.0.0',
  consumeAfterReactionResolution: true, consumeBeforeParentCheckpoint: true, trainingTruth: false,
});

const immediateDelegates = new Set([
  'corrosive_bile', 'dark_swarm_placement', 'psionic_transfer', 'relocation', 'unit_lifecycle', 'bombard',
]);
const live = piece => piece && !piece.isDestroyed && piece.currentModels > 0;
const sourceProof = (definition, pieceId, resolutionHash) => ({
  pieceId, sourceFeatureHash: definition.sourceFeatureHash,
  abilityKind: definition.activationKind, abilityName: definition.definitionName || definition.abilityName,
  abilitySourceKey: definition.recordKey, resolutionHash,
});
const effectBody = effect => Object.fromEntries(Object.entries(effect).filter(([key]) => key !== 'effectHash'));

export function createOfficialFeedbackCompletionV1({ context, bundle, catalogue, state }) {
  if (!hasOfficialNonLethalDamagePolicyV1(state) || !hasOfficialNonLethalStandardDamagePolicyV1(state)
    || !hasOfficialShieldedLifecyclePolicyV1(state)
    || context.manifest.source.references.core.byteHash !== state.officialNonLethalDamagePolicy.sourceCoreByteHash) {
    throw Error('FEEDBACK_NON_LETHAL_CONSUMER_REQUIRED');
  }
  const feedbackRoutes = new Map(bundle.routes.filter(route => route.effectKind === 'feedback')
    .map(route => [route.definitionId, route]));
  const definitions = new Map(catalogue.definitions.map(definition => [definition.definitionId, definition]));
  function unitDefinition(identity, featureHash, kind) {
    const definition = definitions.get(identity);
    return definition?.sourceKind === 'unit_feature' && definition.activationKind === kind
      && definition.sourceFeatureHash === featureHash ? definition : null;
  }
  function reactionCompletion(use, events) {
    const plan = use.reactionPlan;
    if (!plan) return null;
    const definition = unitDefinition(plan.definitionId, plan.sourceFeatureHash, 'reaction');
    const settled = definition && events.find(event => event.type === 'reaction_ability_resolved'
      && event.definitionId === plan.definitionId && event.sourceInstanceId === plan.sourceInstanceId);
    return settled ? sourceProof(definition, plan.sourceInstanceId, plan.planHash) : null;
  }
  function immediateCompletion(before, action, events) {
    const { sourceAction: use, sourceRuntimeKind } = action;
    if (use.abilityPlan) {
      const plan = use.abilityPlan;
      const route = before.officialSelectedRosterAbilitySourceBundle.routes.find(row =>
        row.routeId === plan.routeId && row.sourceKind === 'unit_feature' && row.sourceFeatureHash === plan.sourceFeatureHash);
      return route ? sourceProof({ ...route, activationKind: 'active' }, use.pieceId, plan.planHash) : null;
    }
    if (use.characteristicStatusPlan) {
      const plan = use.characteristicStatusPlan;
      const definition = unitDefinition(plan.definitionId, plan.sourceFeatureHash, 'active');
      // The HITS parent owns completion. Payment and declaration alone are insufficient.
      const directComplete = !plan.lightningCoverage || events.some(event => event.type === 'direct_ability_damage_complete'
        && event.sourcePlanHash === plan.planHash);
      return definition && !plan.automaticHits && directComplete ? sourceProof(definition, use.pieceId, plan.planHash) : null;
    }
    if (immediateDelegates.has(sourceRuntimeKind)
      || sourceRuntimeKind === 'plague' && events.some(event => event.type === 'plague_complete')) {
      const plan = use.relocationPlan || use.unitLifecyclePlan || use;
      const definition = unitDefinition(plan.definitionId || use.definitionId, plan.sourceFeatureHash, 'active');
      return definition ? sourceProof(definition, use.pieceId, plan.planHash || hash(use)) : null;
    }
    return null;
  }
  function hitsCompletion(before, events) {
    const parent = before.pendingOfficialAutomaticHits;
    if (!parent || !bundle.routes.some(route => route.definitionId === parent.definitionId
      && route.sourceFeatureHash === parent.sourceFeatureHash
      && ['automatic_hits_engaged', 'force_wall_lightning'].includes(route.effectKind))) return null;
    const completed = events.find(event => event.type === (parent.directDamage ? 'direct_ability_damage_complete' : 'automatic_hits_complete')
      && event.pieceId === parent.pieceId && event.sourcePlanHash === parent.sourcePlanHash);
    const definition = completed && unitDefinition(parent.definitionId, parent.sourceFeatureHash, 'active');
    return definition ? sourceProof(definition, parent.pieceId, parent.sourcePlanHash) : null;
  }
  function pendingMarks(current, actor) {
    return (actor.officialAbilityEffects || []).filter(effect => effect.effectKind === 'feedback'
      && effect.roundApplied === Number(current.round)).map(effect => {
      const route = feedbackRoutes.get(effect.sourceDefinitionId);
      if (!route || effect.effectHash !== hash(effectBody(effect)) || effect.targetPieceId !== actor.id
        || effect.sourceSideKey === actor.sideKey || effect.sourceFeatureHash !== route.sourceFeatureHash
        || route.nonLethalDamage !== 3 || effect.expiresAt !== route.expiresAt) throw Error('FEEDBACK_MARK_INVALID');
      return effect;
    }).sort((a, b) => a.effectHash.localeCompare(b.effectHash));
  }
  function consumeCompletions(before, transition, completions) {
    const eligible = completions.filter(Boolean).flatMap(completion => {
      const actor = transition.state.pieces.find(piece => piece.id === completion.pieceId);
      const marks = live(actor) ? pendingMarks(transition.state, actor) : [];
      return marks.length ? [{ completion, marks }] : [];
    });
    if (!eligible.length) return transition;
    const next = structuredClone(transition.state);
    const events = eligible.map(({ completion, marks }) => {
      const actor = next.pieces.find(piece => piece.id === completion.pieceId);
      const profile = resolveOfficialEffectiveCombatProfileV1(next, actor);
      const existingModels = actor.models.filter(model => !model.isDestroyed);
      const resolution = resolveOfficialNonLethalDamageV1({ targetPieceId: actor.id,
        targetModelId: existingModels[0].id, abilityResolutionHash: completion.resolutionHash,
        amount: 3, priorDamageMarker: Number(actor.damageMarker || 0), targetHitPoints: profile.hitPoints });
      const shieldedBefore = (actor.statuses || []).some(status => String(typeof status === 'string'
        ? status : status.statusName || status.name).toLowerCase() === 'shielded');
      applyOfficialSelectedRosterResolvedDamageV1(next, actor, profile, { casualtyModelIds: [],
        remainingModelIds: existingModels.map(model => model.id), targetDestroyed: false,
        postDamageMarker: resolution.postDamageMarker, shieldedBefore,
        shieldedAfter: shieldedBefore && resolution.postDamageMarker <= Number(profile.shield || 0) });
      return { type: 'feedback_non_lethal_damage', targetPieceId: actor.id, completedAbility: completion,
        feedbackSourceDefinitionId: marks[0].sourceDefinitionId, feedbackEffectHashes: marks.map(mark => mark.effectHash),
        resolution, trainingTruth: false };
    });
    const last = next.log.at(-1);
    if (next.log.length <= (before.log || []).length || !last) throw Error('FEEDBACK_COMPLETION_LOG_REQUIRED');
    last.events.push(...structuredClone(events));
    return { ...transition, state: next, events: [...transition.events, ...events] };
  }
  const afterReaction = (before, result, action) => consumeCompletions(before, result,
    [reactionCompletion(action, result.events)]);
  const afterTransition = (before, result, action) => consumeCompletions(before, result, [
    before.officialFeedbackReactionTimingPolicy ? null : reactionCompletion(action.sourceAction, result.events),
    immediateCompletion(before, action, result.events), hitsCompletion(before, result.events),
  ]);
  return Object.freeze({ afterReaction, afterTransition, sourceDefinitionIds: [...feedbackRoutes.keys()].sort() });
}
