import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { createOfficialReactionWindowOpportunityBatchV1, openOfficialReactionFamilyWindowV1,
  consumeOfficialReactionFamilyResolutionV1 } from './official-reaction-family-adapter-v1.mjs';

const key = 'pendingOfficialHiddenLossReaction';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([field]) => field !== 'parentHash'));
const seal = value => ({ ...value, parentHash: hash(value) });
const hidden = piece => (piece?.statuses || []).some(status => String(typeof status === 'string'
  ? status : status.statusName || status.name || status.status || '').trim().toLowerCase() === 'hidden');

export function createOfficialHiddenLossReactionRuntimeV1({ reactionBundle, hasUnsettledAction, bindCloseRanksParent = false,
  observeActionPerformedHiddenLoss = false, bindCleanupParent = false }) {
  if (typeof hasUnsettledAction !== 'function') throw Error('HIDDEN_LOSS_ACTION_OWNER_REQUIRED');
  const route = reactionBundle.routes.find(row => row.effectKind === 'hidden_loss_might');
  if (!route) throw Error('HIDDEN_LOSS_REACTION_SOURCE_REQUIRED');
  function pending(state) {
    const parent = state[key];
    if (!parent) {
      if (state.pendingOfficialReactionWindow?.triggerKind === 'hidden_lost') throw Error('HIDDEN_LOSS_REACTION_PARENT_REQUIRED');
      return null;
    }
    if (parent.schema !== 'starcraft_tmg_hidden_loss_reaction_parent_v1'
      || parent.parentHash !== hash(withoutHash(parent)) || parent.sourceBundleHash !== reactionBundle.bundleHash
      || parent.round !== Number(state.round) || parent.phase !== state.phase
      || !['queued', 'reaction'].includes(parent.stage) || !parent.losses.length
      || parent.losses.some(row => !state.pieces.some(piece => piece.id === row.pieceId && piece.sideKey === row.sideKey))
      || parent.stage === 'reaction' && state.pendingOfficialReactionWindow
        && state.pendingOfficialReactionWindow.triggerHash !== parent.triggerHash
      || parent.roundEndParentHash && state.pendingPsionicTransferRoundEnd?.parentHash !== parent.roundEndParentHash
      || parent.cleanupParentHash && (!bindCleanupParent
        || state.pendingOfficialCharacteristicCleanup?.parentHash !== parent.cleanupParentHash)
      || parent.closeRanksParentHash && (!bindCloseRanksParent
        || state.pendingOfficialDisplacedCloseRanksFight?.parentHash !== parent.closeRanksParentHash)) {
      throw Error('HIDDEN_LOSS_REACTION_PARENT_INVALID');
    }
    return parent;
  }
  function ownsWindow(state) {
    return pending(state)?.stage === 'reaction';
  }
  function record(state, loss, reason, resolutionHash = null) {
    state.officialHiddenLossReactionHistory = [...(state.officialHiddenLossReactionHistory || []),
      { ...loss, reason, resolutionHash, trainingTruth: false }];
  }
  function advance(result) {
    const saved = pending(result.state);
    if (!saved || saved.stage === 'reaction' || result.state.pendingOfficialReactionWindow || hasUnsettledAction(result.state)) return result;
    let state = structuredClone(result.state);
    const losses = [...saved.losses];
    const events = [...result.events];
    while (losses.length) {
      const loss = losses[0];
      const input = { triggerKind: 'hidden_lost', activeSideKey: loss.activeSideKey, phase: state.phase,
        activationId: loss.activationId, sourceActionHash: loss.sourceActionHash,
        context: { targetPieceId: loss.pieceId, lostHiddenPieceId: loss.pieceId,
          hiddenLossEvidenceHash: loss.lossHash, sourceDefinitionId: route.definitionId } };
      const menus = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle }).projectWindow(input);
      const available = [menus.activeLegal, menus.defenderLegal].some(menu => menu.parameterDomains.some(
        domain => domain.actionType === 'resolve_reaction_family_ability'));
      if (!available) {
        record(state, loss, 'no_legal_reaction_opportunity'); losses.shift(); continue;
      }
      const opened = openOfficialReactionFamilyWindowV1(reactionBundle, state, input);
      const resumeSideKey = state.activeSideKey;
      state = structuredClone(opened.state);
      state[key] = seal({ ...withoutHash(saved), losses, stage: 'reaction', resumeSideKey,
        sourceKind: 'hidden_loss', triggerHash: state.pendingOfficialReactionWindow.triggerHash });
      state.activeSideKey = state.pendingOfficialReactionWindow.prioritySideKeys[0];
      return { ...result, state, events: [...events, ...opened.events] };
    }
    delete state[key];
    return { ...result, state, events };
  }
  function afterTransition(before, transition, appliedAction) {
    const existing = pending(transition.state);
    let state = transition.state;
    if (existing?.stage === 'reaction' && !state.pendingOfficialReactionWindow) {
      const consumed = consumeOfficialReactionFamilyResolutionV1(state, existing.triggerHash);
      state = structuredClone(consumed.state);
      record(state, existing.losses[0], 'resolved_or_passed', consumed.projection.resolutionHash);
      state.activeSideKey = existing.resumeSideKey;
      const rest = existing.losses.slice(1);
      if (rest.length) state[key] = seal({ ...withoutHash(existing), losses: rest, stage: 'queued', triggerHash: null });
      else delete state[key];
    }
    const lostIds = new Set(before.pieces.filter(piece => hidden(piece)
      && !hidden(state.pieces.find(row => row.id === piece.id))).map(piece => piece.id));
    for (const event of transition.events) {
      if (event.type === 'nerazim_farsight_hidden_lost') lostIds.add(event.targetPieceId);
      if (event.type === 'detection_hidden_lost') lostIds.add(event.targetPieceId);
    }
    if (observeActionPerformedHiddenLoss) {
      const history = state.actionPerformedStatusHistory || [];
      const previous = before.actionPerformedStatusHistory || [];
      if (history.length < previous.length || previous.some((entry, index) => hash(entry) !== hash(history[index]))) {
        throw Error('HIDDEN_LOSS_ACTION_HISTORY_PREFIX_CHANGED');
      }
      for (const entry of history.slice(previous.length)) {
        if (entry.hiddenStatusLost === true) lostIds.add(entry.pieceId);
      }
    }
    if (lostIds.size) {
      state = structuredClone(state);
      const sourceActionHash = hash(appliedAction);
      const actorId = before.selectedRosterActivationWindow?.pieceId || appliedAction.pieceId;
      const cleanup = appliedAction.actionType === 'characteristic_status_lifecycle'
        && appliedAction.eventKind === 'cleanup_and_refresh'
        || bindCleanupParent && appliedAction.actionType === 'resolve_current_product_cleanup_refresh';
      const activationId = !cleanup && (before.selectedRosterActivationWindow || state.selectedRosterActivationWindow)
        ? resolveOfficialArmourRollActivationIdV1(before.selectedRosterActivationWindow ? before : state, actorId) : null;
      const prior = pending(state);
      const losses = [...(prior?.losses || [])];
      for (const pieceId of [...lostIds].sort()) {
        const actor = state.pieces.find(piece => piece.id === pieceId);
        if (!actor) continue;
        const body = { pieceId, sideKey: actor.sideKey, activeSideKey: appliedAction.sideKey,
          activationId, sourceActionHash, round: Number(state.round), phase: state.phase };
        const loss = { ...body, lossHash: hash(body) };
        if (losses.some(row => row.lossHash === loss.lossHash)
          || state.officialHiddenLossReactionHistory?.some(row => row.lossHash === loss.lossHash)) continue;
        losses.push(loss);
      }
      if (losses.length) state[key] = seal(prior ? { ...withoutHash(prior), losses } : {
        schema: 'starcraft_tmg_hidden_loss_reaction_parent_v1', sourceKind: 'hidden_loss',
        sourceBundleHash: reactionBundle.bundleHash, round: Number(state.round), phase: state.phase,
        stage: 'queued', triggerHash: null, losses, resumeSideKey: state.activeSideKey,
        ...(state.pendingPsionicTransferRoundEnd ? { roundEndParentHash: state.pendingPsionicTransferRoundEnd.parentHash } : {}),
        ...(bindCleanupParent && state.pendingOfficialCharacteristicCleanup
          ? { cleanupParentHash: state.pendingOfficialCharacteristicCleanup.parentHash } : {}),
        ...(bindCloseRanksParent && state.pendingOfficialDisplacedCloseRanksFight
          ? { closeRanksParentHash: state.pendingOfficialDisplacedCloseRanksFight.parentHash } : {}),
        trainingTruth: false });
    }
    return advance({ ...transition, state });
  }
  function roundEndParent(state) {
    const parent = pending(state);
    return parent?.stage === 'reaction' && parent.roundEndParentHash ? parent : null;
  }
  function closeRanksParent(state) {
    const parent = pending(state);
    return parent?.stage === 'reaction' && parent.closeRanksParentHash ? parent : null;
  }
  return Object.freeze({ pending, ownsWindow, afterTransition, roundEndParent, closeRanksParent, descriptor: Object.freeze({
    runtimeId: 'official-hidden-loss-reaction-v1', runtimeVersion: bindCleanupParent ? '1.3.0' : observeActionPerformedHiddenLoss ? '1.2.0'
      : bindCloseRanksParent ? '1.1.0' : '1.0.0', sourceBundleHash: reactionBundle.bundleHash,
    triggerKind: 'hidden_lost', observedTransitionsOnly: true, queuedOncePerObservedLoss: true,
    ...(bindCloseRanksParent ? { suspendedCloseRanksParentBound: true } : {}),
    ...(bindCleanupParent ? { suspendedCleanupParentBound: true } : {}),
    ...(observeActionPerformedHiddenLoss ? { observesActionPerformedHiddenLoss: true } : {}),
    firstWeaponKinds: ['ranged', 'close_combat'], trainingTruth: false,
  }) });
}
