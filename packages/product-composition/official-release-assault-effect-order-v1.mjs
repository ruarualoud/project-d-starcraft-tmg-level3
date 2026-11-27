import { isDeepStrictEqual } from 'node:util';
import { resolveOfficialNextControllerEffectGroupV1 } from '../rule-atoms/official-ability-timing-priority-rules-kernel-v1.mjs';

// Each provider retains its native legality, dice and child continuation.
export function createOfficialReleaseAssaultEffectOrderV1(providers) {
  const sides = ['player1', 'player2'];
  function pending(state) {
    return state.phase === 'assault' && (state.officialDeferredBileAssaultRound === Number(state.round)
      || state.officialDeferredMoundAssaultRound === Number(state.round));
  }
  function resolvingChild(state) {
    return Boolean(state.pendingOfficialReactionWindow || state.pendingOfficialAutomaticHits
      || state.pendingOfficialHitsPoolChoice || providers.some(({ owner }) => owner.pending?.(state)));
  }
  function group(state) {
    const effects = providers.flatMap(({ kind, owner }) => owner.listOrderedEffects(state).map(entry => ({
      ...entry, kind, owner, localId: entry.effectId, effectId: kind + ':' + entry.effectId,
    })));
    const { controllerSideKey, availableEffectIds } = resolveOfficialNextControllerEffectGroupV1({
      playerSideKeys: sides, prioritySideKey: state.firstPlayerSideKey, pendingEffects: effects,
    });
    return { controllerSideKey, choices: effects.filter(row => availableEffectIds.includes(row.effectId)) };
  }
  function candidates(state, sideKey) {
    if (!pending(state) || resolvingChild(state) || sideKey !== state.activeSideKey) return [];
    const current = group(state);
    if (current.controllerSideKey !== sideKey) throw Error('RELEASE_ASSAULT_EFFECT_PRIORITY_STALE');
    return current.choices.map(({ kind, owner, localId }) => {
      const action = owner.orderedCandidate(state, localId);
      if (!action) throw Error('RELEASE_ASSAULT_EFFECT_UNAVAILABLE:' + kind);
      return { kind, action, owner };
    });
  }
  function apply(state, kind, action, options) {
    const choice = candidates(state, state.activeSideKey)
      .find(row => row.kind === kind && isDeepStrictEqual(row.action, action));
    if (!choice) throw Error('RELEASE_ASSAULT_EFFECT_ORDER_CHOICE_REQUIRED');
    return choice.owner.apply(state, action, options);
  }
  return Object.freeze({ pending, resolvingChild, group, candidates, apply });
}
