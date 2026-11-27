import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1, openOfficialReactionFamilyWindowV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';

const key = 'pendingOfficialPostPlaceReaction';
const withoutHash = parent => Object.fromEntries(Object.entries(parent).filter(([field]) => field !== 'parentHash'));
const seal = parent => ({ ...parent, parentHash: hash(parent) });
const positionsHash = actor => hash(actor.models.map(model => ({ id: model.id, x: model.xInches, y: model.yInches,
  rotation: model.baseRotationDegrees, elevation: model.elevation, supportTerrainIds: model.supportTerrainIds,
  isOnField: model.isOnField, isDestroyed: model.isDestroyed })));

export function createOfficialPostPlaceReactionRuntimeV1({ reactionBundle, includeEntryEdgePlace = false,
  includeTokenLeadingPlace = false, includeOutsideActivationTiming = false }) {
  if (!reactionBundle.routes.some(route => route.triggerKind === 'after_place' && route.effectKind === 'post_place_heal')) {
    throw Error('POST_PLACE_REACTION_SOURCE_REQUIRED');
  }
  function pending(state) {
    const parent = state[key];
    if (!parent) {
      if (state.pendingOfficialReactionWindow?.triggerKind === 'after_place') throw Error('POST_PLACE_REACTION_PARENT_REQUIRED');
      return null;
    }
    const actor = state.pieces.find(piece => piece.id === parent.pieceId);
    const tokenLeading = parent.sourceKind === 'psionic_token_leading';
    const sourceValid = tokenLeading ? includeTokenLeadingPlace
      && state.pendingPsionicTransferRoundEnd?.parentHash === parent.roundEndParentHash
      && state.resolvedPsionicTransferRoundEnd?.some(row => row.sourcePieceId === parent.pieceId
        && row.effectHash === parent.effectHash && row.choice === 'place'
        && row.geometryHash === parent.geometryPlanHash && row.sourceActionHash === parent.sourceActionHash)
      : actor?.lastRelocationAbilityPlanHash === parent.sourcePlanHash;
    if (parent.schema !== 'starcraft_tmg_post_place_reaction_parent_v1'
      || parent.parentHash !== hash(withoutHash(parent)) || parent.phase !== state.phase
      || parent.round !== Number(state.round) || actor?.sideKey !== parent.sideKey
      || !sourceValid
      || positionsHash(actor) !== parent.positionsHash
      || parent.resumeSideKey !== undefined && !['player1', 'player2'].includes(parent.resumeSideKey)
      || state.pendingOfficialReactionWindow && state.pendingOfficialReactionWindow.triggerHash !== parent.triggerHash) {
      throw Error('POST_PLACE_REACTION_PARENT_INVALID');
    }
    return parent;
  }
  function open(transition, sourceAction) {
    const state = transition.state;
    if (state[key] || state.pendingOfficialReactionWindow) throw Error('POST_PLACE_REACTION_OWNER_ALREADY_PRESENT');
    const actor = state.pieces.find(piece => piece.id === sourceAction.pieceId);
    const source = resolvedPlaceSource(transition, sourceAction, actor);
    const sourceActionHash = hash(sourceAction);
    const input = { triggerKind: 'after_place', activeSideKey: sourceAction.sideKey, phase: state.phase,
      activationId: includeOutsideActivationTiming && !state.selectedRosterActivationWindow && !state.pendingCurrentProductRangedSequence
        ? null : resolveOfficialArmourRollActivationIdV1(state, actor.id), sourceActionHash,
      context: { placedPieceId: actor.id, targetPieceId: actor.id, actorPieceId: actor.id,
        sourceDefinitionId: source.definitionId, geometryPlanHash: source.geometryPlanHash } };
    const opportunities = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle }).projectWindow(input);
    if (![opportunities.activeLegal, opportunities.defenderLegal].some(menu => menu.parameterDomains.some(
      domain => domain.actionType === 'resolve_reaction_family_ability'))) return transition;
    const opened = openOfficialReactionFamilyWindowV1(reactionBundle, state, input);
    const next = structuredClone(opened.state);
    next[key] = seal({ schema: 'starcraft_tmg_post_place_reaction_parent_v1', round: Number(state.round), phase: state.phase,
      pieceId: actor.id, sideKey: actor.sideKey, sourceActionHash, sourcePlanHash: source.planHash,
      sourceDefinitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
      geometryPlanHash: source.geometryPlanHash, triggerHash: next.pendingOfficialReactionWindow.triggerHash,
      positionsHash: positionsHash(actor), activationId: input.activationId,
      ...source.parentBinding,
      ...(state.activeSideKey !== sourceAction.sideKey ? { resumeSideKey: state.activeSideKey } : {}), trainingTruth: false });
    next.activeSideKey = next.pendingOfficialReactionWindow.prioritySideKeys[0];
    return { ...transition, state: next, events: [...transition.events, ...opened.events] };
  }
  function resolvedPlaceSource(transition, applied, actor) {
    if (includeTokenLeadingPlace && applied.actionType === 'choose_psionic_transfer_round_end') {
      const state = transition.state;
      const effect = state.pendingPsionicTransferEffects?.find(row => row.effectHash === applied.effectHash);
      const resolved = state.resolvedPsionicTransferRoundEnd?.find(row => row.effectHash === applied.effectHash
        && row.sourcePieceId === actor?.id && row.choice === 'place' && row.geometryHash === applied.geometryHash
        && row.sourceActionHash === hash(applied));
      const event = transition.events.find(row => row.type === 'psionic_transfer_round_end_choice_resolved'
        && row.pieceId === actor?.id && row.choice === 'place' && row.geometryHash === applied.geometryHash);
      if (!effect || !resolved || !event || !state.pendingPsionicTransferRoundEnd) throw Error('POST_PLACE_NATIVE_SOURCE_REQUIRED');
      return { definitionId: effect.definitionId, sourceFeatureHash: effect.sourceFeatureHash,
        planHash: applied.geometryHash, geometryPlanHash: applied.geometryHash,
        parentBinding: { sourceKind: 'psionic_token_leading', effectHash: effect.effectHash,
          roundEndParentHash: state.pendingPsionicTransferRoundEnd.parentHash } };
    }
    const plan = applied.relocationPlan;
    const resolved = transition.events.find(event => event.type === 'relocation_ability_resolved'
      && (event.effectKind === 'direct_place' || includeEntryEdgePlace && event.effectKind === 'entry_edge_place')
      && event.geometryPlanHash === plan?.geometryPlan?.geometryPlanHash);
    if (!resolved || actor?.lastRelocationAbilityPlanHash !== plan?.planHash) throw Error('POST_PLACE_NATIVE_SOURCE_REQUIRED');
    return { definitionId: applied.definitionId, sourceFeatureHash: applied.sourceFeatureHash,
      planHash: plan.planHash, geometryPlanHash: plan.geometryPlan.geometryPlanHash, parentBinding: {} };
  }
  function complete(transition) {
    const parent = pending(transition.state);
    if (!parent) throw Error('POST_PLACE_REACTION_PARENT_REQUIRED');
    if (transition.state.pendingOfficialReactionWindow) return transition;
    const consumed = consumeOfficialReactionFamilyResolutionV1(transition.state, parent.triggerHash);
    const next = structuredClone(consumed.state);
    next.activeSideKey = parent.resumeSideKey || parent.sideKey;
    next.officialPostPlaceReactionHistory = [...(next.officialPostPlaceReactionHistory || []), {
      ...parent, resolutionHash: consumed.projection.resolutionHash, consumedByHost: true }];
    delete next[key];
    return { ...transition, state: next };
  }
  return Object.freeze({ pending, open, complete, descriptor: Object.freeze({
    runtimeId: 'starcraft-tmg-post-place-reaction-v1', runtimeVersion: includeOutsideActivationTiming ? '1.3.0'
      : includeTokenLeadingPlace ? '1.2.0' : includeEntryEdgePlace ? '1.1.0' : '1.0.0',
    sourceBundleHash: reactionBundle.bundleHash,
    sourceKind: includeTokenLeadingPlace ? 'resolved_place_including_token_leading' : includeEntryEdgePlace ? 'resolved_direct_and_entry_edge_place' : 'resolved_direct_place',
    triggerAndResumeBoundByHost: true, trainingTruth: false,
    ...(includeOutsideActivationTiming ? { outsideActivationUsesFirstPlayerPriorityAndPhaseLimit: true } : {}),
  }) });
}
