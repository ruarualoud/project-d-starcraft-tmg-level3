import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { resolveOfficialArmourRollActivationIdV1 } from '../rule-atoms/official-armour-roll-ordinal-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { consumeOfficialReactionFamilyResolutionV1, createOfficialReactionWindowOpportunityBatchV1,
  openOfficialReactionFamilyWindowV1 } from './official-reaction-family-adapter-v1.mjs';

const key = 'officialFriendlySupplyLossReactions';
const triggerKind = 'friendly_supply_reduced';
const atomId = 'rule-atom:twilight-templar-friendly-supply-loss-reaction-v1';

function activeUnit(piece) {
  return piece?.isOnField === true && piece.isDestroyed !== true && piece.currentModels > 0;
}

function activationContext(before, after, action) {
  const during = [before, after].find(state => state.selectedRosterActivationWindow
    || state.pendingCurrentProductRangedSequence);
  const window = during?.selectedRosterActivationWindow || during?.pendingCurrentProductRangedSequence;
  if (window) return { activeSideKey: window.sideKey,
    activationId: resolveOfficialArmourRollActivationIdV1(during, window.pieceId) };
  const source = action.sourceAction;
  const explicitActivationAction = ['ability', 'ranged', 'template', 'melee', 'relocation', 'activation', 'spatial']
    .includes(action.sourceRuntimeKind) && source?.pieceId;
  const actor = explicitActivationAction && before.pieces.find(piece => piece.id === source.pieceId);
  return actor ? { activeSideKey: actor.sideKey, activationId: resolveOfficialArmourRollActivationIdV1(before, actor.id) }
    : { activeSideKey: before.activeSideKey, activationId: null };
}

export function createOfficialFriendlySupplyLossReactionRuntimeV1({ reactionBundle }) {
  const sources = reactionBundle.routes.filter(route => route.triggerKind === triggerKind);
  if (sources.length !== 1) throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_SOURCE_REQUIRED');
  const [route] = sources;

  function pending(state) {
    const saved = state[key];
    const window = state.pendingOfficialReactionWindow;
    if (!saved) {
      if (window?.triggerKind === triggerKind) throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_PARENT_REQUIRED');
      return null;
    }
    const { parentHash, ...body } = saved;
    if (saved.round !== Number(state.round) || saved.phase !== state.phase
      || saved.sourceRouteHash !== route.routeHash || hash(body) !== parentHash
      || (window?.triggerKind === triggerKind && saved.triggerHash !== window.triggerHash)) {
      throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_PARENT_INVALID');
    }
    return saved;
  }

  function collectWitnesses(before, after, entries) {
    const byId = new Map(before.pieces.map(piece => [piece.id, piece]));
    const settled = new Map(after.pieces.map(piece => [piece.id, piece]));
    const responders = after.pieces.filter(piece => activeUnit(piece) && piece.officialUnitRecordKey === route.recordKey);
    return responders.flatMap(source => {
      const losses = entries.flatMap(entry => {
        if (entry.ownerSideKey !== source.sideKey || entry.unitId === source.id) return [];
        const was = byId.get(entry.unitId);
        const now = settled.get(entry.unitId);
        if (!activeUnit(was) || !now || now.sideKey !== source.sideKey || now.currentSupply !== entry.currentSupplyAfter) return [];
        // For a completely removed unit, measure the last on-field bases.
        const measurementState = activeUnit(now) ? after : {
          ...after, pieces: after.pieces.map(piece => piece.id === now.id ? was : piece),
        };
        const inRange = (source.models || []).filter(model => model.isOnField !== false && model.isDestroyed !== true)
          .some(model => evaluateOfficialWithinWhollyWithinV1({ state: measurementState,
            dataBundle: after.officialModelBaseGeometryDataBundle,
            source: { kind: 'model', unitId: source.id, modelId: model.id }, targetUnitId: now.id,
            rangeMilliInches: route.friendlySupplyLossRangeMilliInches }).unitWithin);
        return inRange ? [{ unitId: now.id, currentSupplyBefore: entry.currentSupplyBefore,
          currentSupplyAfter: entry.currentSupplyAfter, entryHash: entry.entryHash }] : [];
      });
      return losses.length ? [{ sourcePieceId: source.id, losses }] : [];
    });
  }

  function storeParent(state, body) {
    state[key] = { ...body, parentHash: hash(body) };
  }

  function offerQueued(result) {
    const saved = pending(result.state);
    if (!saved || saved.triggerHash || result.state.pendingOfficialReactionWindow) return result;
    const state = structuredClone(result.state);
    const [input, ...rest] = saved.queued;
    const restParent = { round: saved.round, phase: saved.phase, sourceRouteHash: route.routeHash,
      triggerHash: null, resumeSideKey: null, queued: rest };
    if (rest.length) storeParent(state, restParent);
    else delete state[key];
    const { activeLegal, defenderLegal } = createOfficialReactionWindowOpportunityBatchV1({ state, bundle: reactionBundle }).projectWindow(input);
    if (![activeLegal, defenderLegal].some(menu => menu.parameterDomains.some(domain => domain.definitionId === route.definitionId))) {
      return offerQueued({ ...result, state });
    }
    const opened = openOfficialReactionFamilyWindowV1(reactionBundle, state, input);
    const next = structuredClone(opened.state);
    const window = next.pendingOfficialReactionWindow;
    storeParent(next, { ...restParent, triggerHash: window.triggerHash, resumeSideKey: state.activeSideKey });
    next.activeSideKey = window.prioritySideKeys[0];
    return { ...result, state: next, events: [...result.events, ...opened.events] };
  }

  function afterTransition(before, result, action) {
    const after = result.state;
    const saved = pending(after);
    if (before.round !== after.round || before.phase !== after.phase) return result;
    const previousLength = before.supplyLossLedger?.entries.length || 0;
    const entries = (after.supplyLossLedger?.entries || []).slice(previousLength).filter(entry =>
      entry.round === Number(before.round) && entry.phase === before.phase && entry.supplyDelta > 0);
    const eligibleSources = entries.length ? collectWitnesses(before, after, entries) : [];
    if (!eligibleSources.length) return saved ? offerQueued(result) : result;
    const state = structuredClone(after);
    const input = { triggerKind, ...activationContext(before, after, action), phase: state.phase,
      sourceActionHash: action.sourceActionHash, context: { eligibleSources } };
    storeParent(state, { round: Number(state.round), phase: state.phase, sourceRouteHash: route.routeHash,
      triggerHash: saved?.triggerHash || null, resumeSideKey: saved?.resumeSideKey || null,
      queued: [...(saved?.queued || []), input] });
    return offerQueued({ ...result, state });
  }

  function complete(result) {
    const saved = pending(result.state);
    if (!saved?.triggerHash) throw Error('FRIENDLY_SUPPLY_LOSS_REACTION_PARENT_REQUIRED');
    if (result.state.pendingOfficialReactionWindow) {
      const state = structuredClone(result.state);
      const window = state.pendingOfficialReactionWindow;
      state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
      return { ...result, state };
    }
    const consumed = consumeOfficialReactionFamilyResolutionV1(result.state, saved.triggerHash);
    const state = structuredClone(consumed.state);
    state.activeSideKey = saved.resumeSideKey;
    if (!saved.queued.length) delete state[key];
    else storeParent(state, { round: saved.round, phase: saved.phase, sourceRouteHash: route.routeHash,
      triggerHash: null, resumeSideKey: null, queued: saved.queued });
    return offerQueued({ ...result, state });
  }

  return Object.freeze({ pending, afterTransition, complete,
    ownsWindow: state => Boolean(pending(state)?.triggerHash),
    descriptor: Object.freeze({ runtimeId: 'starcraft-tmg-friendly-supply-loss-reaction-v1', runtimeVersion: '1.0.0',
      ruleAtomId: atomId, definitionId: route.definitionId, sourceRouteHash: route.routeHash,
      triggerKind, triggerAuthority: 'committed_current_supply_loss_ledger',
      trainingTruth: false }) });
}
