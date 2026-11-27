import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { consumeOfficialReactionFamilyResolutionV1, createOfficialReactionWindowOpportunityBatchV1,
  openOfficialReactionFamilyWindowV1 } from './official-reaction-family-adapter-v1.mjs';
import { OFFICIAL_INFESTATION_TRANSFER_DEFINITION_ID, officialInfestationStatusNameV1,
  isOfficialInfestationTransferLiveUnitV1 as live } from './official-infestation-transfer-facts-v1.mjs';

const key = 'pendingOfficialInfestationTransfer';
const triggerKind = 'infested_enemy_removed';
const seal = body => ({ ...body, parentHash: hash(body) });
const bodyOf = parent => Object.fromEntries(Object.entries(parent).filter(([key]) => key !== 'parentHash'));

export function createOfficialInfestationTransferRuntimeV1({ reactionBundle }) {
  const route = reactionBundle.routes.find(row => row.definitionId === OFFICIAL_INFESTATION_TRANSFER_DEFINITION_ID);
  if (!route || route.effectKind !== 'infestation_transfer') throw Error('INFESTATION_TRANSFER_SOURCE_REQUIRED');
  function pending(state) {
    const parent = state[key];
    if (!parent) return null;
    if (parent.parentHash !== hash(bodyOf(parent)) || parent.sourceRouteHash !== route.routeHash
      || parent.round !== Number(state.round) || parent.phase !== state.phase
      || !['waiting', 'transfer', 'restoration'].includes(parent.stage)
      || (parent.triggerHash && state.pendingOfficialReactionWindow
        && state.pendingOfficialReactionWindow.triggerHash !== parent.triggerHash)) {
      throw Error('INFESTATION_TRANSFER_PARENT_INVALID');
    }
    return parent;
  }
  function openIfUseful(result, input, parent, stage) {
    const { activeLegal, defenderLegal } = createOfficialReactionWindowOpportunityBatchV1({ state: result.state, bundle: reactionBundle }).projectWindow(input);
    if (![activeLegal, defenderLegal].some(menu => menu.parameterDomains.some(domain =>
      domain.actionType === 'resolve_reaction_family_ability'))) return null;
    const opened = openOfficialReactionFamilyWindowV1(reactionBundle, result.state, input);
    const state = structuredClone(opened.state);
    state[key] = seal({ ...bodyOf(parent), stage, triggerHash: state.pendingOfficialReactionWindow.triggerHash,
      activeContext: input });
    state.activeSideKey = state.pendingOfficialReactionWindow.prioritySideKeys[0];
    return { ...result, state, events: [...result.events, ...opened.events] };
  }
  function offer(result) {
    const parent = pending(result.state);
    if (!parent || parent.stage !== 'waiting' || result.state.pendingOfficialReactionWindow) return result;
    if (!parent.queued.length) {
      const state = structuredClone(result.state); delete state[key];
      return { ...result, state };
    }
    const [input, ...queued] = parent.queued;
    const state = structuredClone(result.state);
    const nextParent = seal({ ...bodyOf(parent), queued, triggerHash: null, resumeSideKey: state.activeSideKey });
    state[key] = nextParent;
    return openIfUseful({ ...result, state }, input, nextParent, 'transfer') || offer({ ...result, state });
  }
  function afterTransition(before, result, action) {
    if (before.round !== result.state.round || before.phase !== result.state.phase) return result;
    const previousEntries = before.supplyLossLedger?.entries.length || 0;
    const entries = (result.state.supplyLossLedger?.entries || []).slice(previousEntries);
    const witnesses = before.pieces.filter(piece => live(piece)
      && (piece.statuses || []).some(status => officialInfestationStatusNameV1(status) === 'infestation')).flatMap(fallen => {
      const after = result.state.pieces.find(piece => piece.id === fallen.id);
      const zeroEntry = entries.find(entry => entry.unitId === fallen.id && entry.currentSupplyBefore > 0 && entry.currentSupplyAfter === 0);
      const destroyed = !after || after.isDestroyed === true || Number(after.currentModels) === 0;
      if (!zeroEntry && !destroyed) return [];
      const body = { round: Number(before.round), phase: before.phase, fallenPiece: structuredClone(fallen),
        supplyLossEntryHash: zeroEntry?.entryHash || null, destroyed, sourceActionHash: action.sourceActionHash || hash(action), trainingTruth: false };
      return [{ ...body, witnessHash: hash(body) }];
    });
    if (!witnesses.length) return offer(result);
    const state = structuredClone(result.state);
    const existing = pending(state);
    const activeWindow = before.selectedRosterActivationWindow || before.pendingCurrentProductRangedSequence;
    const actor = activeWindow || before.pieces.find(piece => piece.id === action.sourceAction?.pieceId);
    const activeSideKey = actor?.sideKey || before.activeSideKey;
    const activationId = actor ? resolveOfficialArmourRollActivationIdV1(before, activeWindow?.pieceId || actor.id) : null;
    const queued = witnesses.map(infestationWitness => ({ triggerKind, activeSideKey, phase: state.phase, activationId,
      sourceActionHash: infestationWitness.sourceActionHash, context: { infestationWitness } }));
    state[key] = seal(existing ? { ...bodyOf(existing), queued: [...existing.queued, ...queued] }
      : { round: Number(state.round), phase: state.phase, stage: 'waiting', sourceRouteHash: route.routeHash,
        triggerHash: null, resumeSideKey: null, queued });
    return offer({ ...result, state });
  }
  function complete(result) {
    const parent = pending(result.state);
    if (!parent?.triggerHash) throw Error('INFESTATION_TRANSFER_PARENT_REQUIRED');
    if (result.state.pendingOfficialReactionWindow) {
      const state = structuredClone(result.state);
      state.activeSideKey = state.pendingOfficialReactionWindow.prioritySideKeys[state.pendingOfficialReactionWindow.priorityIndex];
      return { ...result, state };
    }
    const consumed = consumeOfficialReactionFamilyResolutionV1(result.state, parent.triggerHash);
    const state = structuredClone(consumed.state);
    state.activeSideKey = parent.resumeSideKey;
    const nextParent = seal({ ...bodyOf(parent), stage: 'waiting', triggerHash: null });
    state[key] = nextParent;
    const transition = { ...result, state };
    const resolution = state.officialReactionResolutionHistory.find(row => row.triggerHash === parent.triggerHash);
    const effect = parent.stage === 'transfer' && resolution.effects.find(row => row.effectKind === 'infestation_transfer');
    if (effect) {
      const input = { triggerKind: 'debuff_received', activeSideKey: parent.activeContext.activeSideKey, phase: state.phase,
        activationId: parent.activeContext.activationId, sourceActionHash: effect.effectHash,
        context: { targetPieceId: effect.targetPieceId, affectedPieceId: effect.targetPieceId,
          actorPieceId: effect.sourcePieceId, statusEffectHash: effect.statusEffectHash,
          sourceDefinitionId: route.definitionId } };
      const restored = openIfUseful(transition, input, nextParent, 'restoration');
      if (restored) return restored;
    }
    return offer(transition);
  }
  return { pending, afterTransition, complete, ownsWindow: state => Boolean(pending(state)?.triggerHash),
    descriptor: { runtimeId: 'official-infestation-transfer-runtime-v1', runtimeVersion: '1.0.0',
      definitionId: route.definitionId, sourceRouteHash: route.routeHash,
      triggerAuthority: 'committed_supply_loss_or_destroyed_unit_transition',
      reusedContracts: ['supply_loss_ledger', 'within_footprint', 'reaction_priority_payment_and_limits', 'debuff_status_and_restoration'],
      newGameAtoms: 0, trainingTruth: false } };
}
