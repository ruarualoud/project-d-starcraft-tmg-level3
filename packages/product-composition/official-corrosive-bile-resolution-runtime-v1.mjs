import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13, hasOfficialFaqReactionPolicyV13 } from '../rule-atoms/official-faq-reaction-policy-v13.mjs';
import { applyOfficialPotentBileDebuffV1 } from './official-corrosive-bile-upgrades-v1.mjs';

const runtimeId = 'official-corrosive-bile-resolution-v1';
const parentKey = 'pendingCorrosiveBileResolution';
const definitionId = 'unit:ravager/corrosive-bile-movement-phase@1';
const atomIds = ['rule-atom:source-bound-delayed-automatic-hits-v1'];
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = value => ({ ...value, parentHash: hash(value) });
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true
  && piece.models.some(model => model.isOnField !== false && model.isDestroyed !== true);

export function createOfficialCorrosiveBileDamagePolicyV1({ context, source, outsideActivationReactions = false }) {
  const record = context.dataset.recordsByKey['rules_sections:iuUyObNTQ2M8xK4IUqzC'];
  const rule = record?.payload.items?.[9]?.subItems?.[5];
  if (rule?.title !== '8.9.4 Resolve End of the Round Effects'
    || !rule.content[0].value.includes('First Player Marker')
    || !rule.content[0].value.includes('Each effect is fully resolved before the next begins.')) {
    throw Error('CORROSIVE_BILE_EFFECT_ORDER_SOURCE_REQUIRED');
  }
  const body = { schema: 'starcraft_tmg_corrosive_bile_damage_policy_v1', version: outsideActivationReactions ? '2.0.0' : '1.0.0',
    sourceBundleHash: source.bundleHash, orderSourceRecordHash: record.sourceRecordHash,
    orderSourcePayloadHash: record.payloadHash, orderSourcePointer: '/payload/items/9/subItems/5',
    applicability: 'geometry_when_selected_source_effect_begins', perTokenIndependentHits: true,
    sourceControllerChoosesOwnEffectOrder: true, firstPlayerEffectsFirst: true,
    ...(outsideActivationReactions ? { outsideActivationReactions: true,
      faqSourceByteHash: OFFICIAL_FAQ_REACTION_POLICY_V13.sourceByteHash } : {}), trainingTruth: false };
  return { ...body, policyHash: hash(body) };
}

export function createOfficialCorrosiveBileResolutionRuntimeV1({ context, source, producer, state, includeSharedOrder = false }) {
  const outside = state.officialCorrosiveBileDamagePolicy?.outsideActivationReactions === true;
  const policy = createOfficialCorrosiveBileDamagePolicyV1({ context, source, outsideActivationReactions: outside });
  if (!isDeepStrictEqual(policy, state.officialCorrosiveBileDamagePolicy)) throw Error('CORROSIVE_BILE_DAMAGE_POLICY_MISMATCH');
  if (outside && !hasOfficialFaqReactionPolicyV13(state)) throw Error('CORROSIVE_BILE_OUTSIDE_REACTION_POLICY_REQUIRED');
  const runtimeVersion = includeSharedOrder ? '1.2.0' : outside ? '1.1.0' : '1.0.0';
  const descriptor = { runtimeId, runtimeVersion, ruleAtomIds: atomIds, policyHash: policy.policyHash,
    ...(outside ? { outsideActivationReactions: true, faqReactionRuleAtomId: OFFICIAL_FAQ_REACTION_POLICY_V13.ruleAtomId } : {}),
    sourceBundleHash: source.bundleHash, actions: ['begin_corrosive_bile_phase_end', 'choose_corrosive_bile_source', 'complete_corrosive_bile_phase_end',
      ...(includeSharedOrder ? ['resolve_ordered_corrosive_bile_effect'] : [])],
    sourceDestructionCancelsEffect: false, sourceUnitOrderOwnedByController: true, trainingTruth: false };
  const effects = current => (current.pendingCorrosiveBileEffects || []).filter(effect => !effect.consumed && effect.round === Number(current.round));
  function pending(current) {
    const parent = current[parentKey];
    if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_corrosive_bile_resolution_v1' || parent.parentHash !== hash(withoutHash(parent))
      || parent.policyHash !== policy.policyHash || parent.round !== Number(current.round) || parent.phase !== current.phase
      || !['choose', 'hits', 'complete'].includes(parent.stage)) throw Error('CORROSIVE_BILE_RESOLUTION_INVALID');
    if (parent.stage !== 'hits' && current.activeSideKey !== parent.ownerSideKey) throw Error('CORROSIVE_BILE_PRIORITY_INVALID');
    return parent;
  }
  function canStart(current) {
    return !current[parentKey] && current.phase === 'assault'
      && ['player1', 'player2'].every(side => current.players[side]?.passedPhases?.assault === true)
      && ['player1', 'player2'].includes(current.firstPlayerSideKey)
      && current.corrosiveBilePhaseEndCompletedRound !== Number(current.round) && effects(current).length > 0
      && !current.selectedRosterActivationWindow && !current.pendingOfficialReactionWindow
      && !current.pendingOfficialAutomaticHits && !current.pendingOfficialHitsPoolChoice;
  }
  function action(current, type, extra = {}) {
    return { actionType: type, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds,
      sideKey: current.activeSideKey, phase: current.phase, stateHash: hash(current), ...extra };
  }
  function enumerate(current, options = {}) {
    const parent = pending(current);
    if ((options.sideKey || current.activeSideKey) !== current.activeSideKey) return { candidates: [], parameterDomains: [] };
    if (!parent) return { parameterDomains: [], candidates: canStart(current)
      ? [{ ...action(current, 'begin_corrosive_bile_phase_end'), isEnabled: true }] : [] };
    if (parent.stage === 'hits') throw Error('CORROSIVE_BILE_HITS_CONTINUATION_REQUIRED');
    if (parent.stage === 'complete') return { parameterDomains: [], candidates: [
      { ...action(current, 'complete_corrosive_bile_phase_end', { parentHash: parent.parentHash }), isEnabled: true }] };
    const body = { schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_corrosive_bile_source_choice_v1', actionType: 'choose_corrosive_bile_source',
      executorId: runtimeId, executorVersion: runtimeVersion, sideKey: current.activeSideKey, phase: current.phase,
      parameterSchema: { type: 'object', required: ['sourcePieceId'],
        sourcePieceId: { enum: effects(current).filter(effect => effect.sideKey === parent.ownerSideKey).map(effect => effect.sourcePieceId).sort() } },
      constraints: { parentHash: parent.parentHash }, confirmationClass: 'rules_owned_effect_order', trainingTruth: false };
    return { candidates: [], parameterDomains: [{ ...body, domainId: 'bile-order-' + hash(body) }] };
  }
  function instantiate(current, domain, parameters) {
    if (!isDeepStrictEqual(enumerate(current).parameterDomains[0], domain) || !parameters
      || Object.keys(parameters).join(',') !== 'sourcePieceId'
      || !domain.parameterSchema.sourcePieceId.enum.includes(parameters.sourcePieceId)) throw Error('CORROSIVE_BILE_SOURCE_CHOICE_INVALID');
    return { canonicalParameters: { sourcePieceId: parameters.sourcePieceId }, action: action(current, domain.actionType,
      { parentHash: pending(current).parentHash, sourcePieceId: parameters.sourcePieceId }) };
  }
  function chooseNextOwner(current, parent) {
    const owner = [parent.firstPlayerSideKey, parent.firstPlayerSideKey === 'player1' ? 'player2' : 'player1']
      .find(side => effects(current).some(effect => effect.sideKey === side));
    current.activeSideKey = owner || parent.firstPlayerSideKey;
    current[parentKey] = seal({ ...withoutHash(parent), stage: owner ? 'choose' : 'complete',
      ownerSideKey: current.activeSideKey, currentEffectHash: null, work: [], workIndex: 0 });
  }
  function listOrderedEffects(current) {
    return effects(current).map(effect => ({ effectId: effect.effectHash, controllerSideKey: effect.sideKey }));
  }
  function orderedCandidate(current, effectId) {
    const effect = effects(current).find(row => row.effectHash === effectId);
    if (!effect || effect.sideKey !== current.activeSideKey || !canStart(current)) return null;
    return action(current, 'resolve_ordered_corrosive_bile_effect', { effectId, pieceId: effect.sourcePieceId, abilityName: 'Corrosive Bile' });
  }
  function beginSource(current, parent, effect, projected, events) {
    const work = projected.tokens.flatMap(token => token.targets.map(target => ({ tokenId: token.tokenId, targetUnitId: target.pieceId })));
    openNextHits(current, { ...parent, currentEffectHash: effect.effectHash, work, workIndex: 0, scopeHash: hash(projected) }, events);
  }
  function openNextHits(current, parent, events) {
    let index = parent.workIndex;
    while (index < parent.work.length && !active(current.pieces.find(piece => piece.id === parent.work[index].targetUnitId))) {
      events.push({ type: 'corrosive_bile_destroyed_target_skipped', ...parent.work[index] });
      index += 1;
    }
    if (index === parent.work.length) {
      const effect = effects(current).find(row => row.effectHash === parent.currentEffectHash);
      if (!effect) throw Error('CORROSIVE_BILE_EFFECT_MISSING');
      current.board.tokens = current.board.tokens.filter(token => !effect.tokenIds.includes(token.tokenId));
      current.pendingCorrosiveBileEffects = current.pendingCorrosiveBileEffects.filter(row => row.effectHash !== effect.effectHash);
      current.resolvedCorrosiveBileEffects = [...(current.resolvedCorrosiveBileEffects || []), { effect,
        scopeHash: parent.scopeHash, completedWork: parent.work, resolvedAtPhase: current.phase }];
      events.push({ type: 'corrosive_bile_effect_complete', sourcePieceId: effect.sourcePieceId,
        effectHash: effect.effectHash, removedTokenIds: effect.tokenIds });
      if (parent.sharedOrderOwned) delete current[parentKey];
      else chooseNextOwner(current, parent);
      return;
    }
    const row = parent.work[index];
    const effect = effects(current).find(value => value.effectHash === parent.currentEffectHash);
    if (current.officialCorrosiveBileUpgradeSourceBundle) {
      events.push(...applyOfficialPotentBileDebuffV1(current, effect.sourcePieceId, row.targetUnitId, effect.effectHash));
    }
    const nextParent = seal({ ...withoutHash(parent), stage: 'hits', workIndex: index });
    current[parentKey] = nextParent;
    current.activeSideKey = effect.sideKey;
    current.pendingOfficialAutomaticHits = seal({ schema: 'starcraft_tmg_automatic_hits_source_checkpoint_v1',
      round: Number(current.round), phase: current.phase, sideKey: effect.sideKey, pieceId: effect.sourcePieceId,
      definitionId, sourceFeatureHash: source.sourceFeatureHash, sourceRouteHash: source.bundleHash,
      abilityName: 'Corrosive Bile', sourcePlanHash: effect.sourcePlanHash, stage: 'ready',
      automaticHits: { targetUnitIds: [row.targetUnitId], hits: source.hits, damagePerHit: source.damagePerHit },
      delayedSource: { effectHash: effect.effectHash, tokenId: row.tokenId, queueHash: nextParent.parentHash,
        workIndex: index }, trainingTruth: false });
    events.push({ type: 'corrosive_bile_hits_declared', pieceId: effect.sourcePieceId, ...row,
      hits: source.hits, damagePerHit: source.damagePerHit, hitRollRequired: false, surgeAllowed: false });
  }
  function transition(current, applied, events) {
    current.log = [...(current.log || []), { id: 'log-' + ((current.log || []).length + 1),
      round: Number(current.round), phase: current.phase, action: structuredClone(applied), events: structuredClone(events) }];
    return { ok: true, runtimeId, runtimeVersion, state: current, action: applied, events, trainingTruth: false };
  }
  function apply(current, applied, options = {}) {
    if (applied.actionType === 'resolve_ordered_corrosive_bile_effect') {
      const expected = includeSharedOrder && orderedCandidate(current, applied.effectId);
      if (!isDeepStrictEqual(expected, applied) || options.chanceReveals?.length) throw Error('CORROSIVE_BILE_ORDERED_EFFECT_STALE');
      const effect = effects(current).find(row => row.effectHash === applied.effectId);
      const projected = producer.query(current).effects.find(row => row.effectHash === effect.effectHash);
      const next = structuredClone(current);
      const events = [];
      beginSource(next, { schema: 'starcraft_tmg_corrosive_bile_resolution_v1', policyHash: policy.policyHash,
        round: Number(next.round), phase: next.phase, sharedOrderOwned: true, ownerSideKey: effect.sideKey,
        firstPlayerSideKey: next.firstPlayerSideKey, trainingTruth: false }, effect, projected, events);
      return transition(next, applied, events);
    }
    const menu = enumerate(current);
    const expected = applied.actionType === 'choose_corrosive_bile_source'
      ? instantiate(current, menu.parameterDomains[0], { sourcePieceId: applied.sourcePieceId }).action
      : menu.candidates[0] && Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) => key !== 'isEnabled'));
    if (!isDeepStrictEqual(expected, applied) || options.chanceReveals?.length) throw Error('CORROSIVE_BILE_RESOLUTION_ACTION_STALE');
    const next = structuredClone(current);
    const events = [];
    if (applied.actionType === 'begin_corrosive_bile_phase_end') {
      producer.query(current);
      const parent = { schema: 'starcraft_tmg_corrosive_bile_resolution_v1', policyHash: policy.policyHash,
        round: Number(next.round), phase: next.phase, firstPlayerSideKey: next.firstPlayerSideKey,
        resumeSideKey: next.activeSideKey, work: [], workIndex: 0, trainingTruth: false };
      chooseNextOwner(next, parent);
      events.push({ type: 'corrosive_bile_phase_end_opened', firstPlayerSideKey: next.firstPlayerSideKey });
    } else if (applied.actionType === 'complete_corrosive_bile_phase_end') {
      const parent = pending(current);
      next.activeSideKey = parent.resumeSideKey;
      next.corrosiveBilePhaseEndCompletedRound = Number(next.round);
      delete next[parentKey];
      events.push({ type: 'corrosive_bile_phase_end_complete', completedRound: Number(next.round) });
    } else {
      const parent = pending(current);
      const effect = effects(current).find(row => row.sourcePieceId === applied.sourcePieceId && row.sideKey === parent.ownerSideKey);
      const projected = producer.query(current).effects.find(row => row.effectHash === effect.effectHash);
      beginSource(next, parent, effect, projected, events);
    }
    return transition(next, applied, events);
  }
  function afterHits(result) {
    const parent = pending(result.state);
    if (!parent || parent.stage !== 'hits' || result.state.pendingOfficialAutomaticHits) return result;
    if (!result.events.some(event => event.type === 'automatic_hits_complete')) throw Error('CORROSIVE_BILE_HITS_RECEIPT_REQUIRED');
    const next = structuredClone(result.state);
    const events = [...result.events];
    openNextHits(next, { ...parent, workIndex: parent.workIndex + 1 }, events);
    if (next.log?.length) next.log.at(-1).events = structuredClone(events);
    return { ...result, state: next, events };
  }
  const sourceAuthority = { schema: 'starcraft_tmg_automatic_hits_source_authority_v1', sourceBundleHash: source.bundleHash,
    ...(outside ? { reactionTiming: 'outside_activation' } : {}),
    owns: parent => parent.definitionId === definitionId,
    validate(current, hitsParent) {
      const parent = pending(current);
      const work = parent?.work[parent.workIndex];
      const effect = effects(current).find(row => row.effectHash === parent?.currentEffectHash);
      return Boolean(parent?.stage === 'hits' && effect && work
        && hitsParent.delayedSource?.queueHash === parent.parentHash && hitsParent.delayedSource.workIndex === parent.workIndex
        && hitsParent.delayedSource.effectHash === effect.effectHash && hitsParent.delayedSource.tokenId === work.tokenId
        && hitsParent.sourcePlanHash === effect.sourcePlanHash && hitsParent.sourceFeatureHash === source.sourceFeatureHash
        && hitsParent.sourceRouteHash === source.bundleHash && hitsParent.pieceId === effect.sourcePieceId
        && hitsParent.sideKey === effect.sideKey && hitsParent.automaticHits.hits === source.hits
        && hitsParent.automaticHits.damagePerHit === source.damagePerHit
        && isDeepStrictEqual(hitsParent.automaticHits.targetUnitIds, [work.targetUnitId]));
    } };
  return Object.freeze({ descriptor, sourceAuthority, canStart, pending, enumerate, instantiate, apply, afterHits,
    ...(includeSharedOrder ? { listOrderedEffects, orderedCandidate } : {}) });
}
