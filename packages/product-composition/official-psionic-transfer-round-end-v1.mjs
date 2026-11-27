import { isDeepStrictEqual } from 'node:util';
import { usesWave3FaqClarifications } from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { prepareOfficialTokenLeadingUnitPlacementV1 } from './official-unit-lifecycle-family-adapter-v1.mjs';

const runtimeId = 'official-psionic-transfer-round-end-v1';
const version = '1.0.0';
const parentKey = 'pendingPsionicTransferRoundEnd';
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true
  && piece.models.some(model => model.isDestroyed !== true && model.isOnField !== false);

export function createOfficialPsionicTransferRoundEndPolicyV1({ context, source, includePostPlaceReactions = false,
  includeOutsideActivationReactions = false, sharedRoundEnd = false }) {
  if (includeOutsideActivationReactions && !includePostPlaceReactions) throw Error('PSIONIC_TRANSFER_POST_PLACE_REACTION_REQUIRED');
  const record = context.dataset.recordsByKey['rules_sections:iuUyObNTQ2M8xK4IUqzC'];
  const rule = record?.payload.items?.[9]?.subItems?.[5];
  if (rule?.title !== '8.9.4 Resolve End of the Round Effects'
    || !rule.content[0].value.includes('First Player Marker')
    || !rule.content[0].value.includes('Each effect is fully resolved before the next begins.')) {
    throw Error('PSIONIC_TRANSFER_ROUND_END_ORDER_SOURCE_REQUIRED');
  }
  return seal({ schema: 'starcraft_tmg_psionic_transfer_round_end_policy_v1',
    version: sharedRoundEnd ? '2.0.0' : includeOutsideActivationReactions ? '1.2.0' : includePostPlaceReactions ? '1.1.0' : version,
    sourceBundleHash: source.bundleHash, orderSourceRecordHash: record.sourceRecordHash,
    orderSourcePayloadHash: record.payloadHash, orderSourcePointer: '/payload/items/9/subItems/5',
    firstPlayerEffectsFirst: true, controllerChoosesOwnEffectOrder: true, optionalPlacement: true,
    cleanupAfterChoices: true, displacementConsumerReady: false,
    ...(sharedRoundEnd ? { sharedRoundEnd: true } : {}),
    ...(includePostPlaceReactions ? { postPlaceReactionsEnabled: true, parentWaitsForPlaceReaction: true } : {}),
    ...(includeOutsideActivationReactions ? { outsideActivationReactions: true } : {}),
    trainingTruth: false }, 'policyHash');
}

export function createOfficialPsionicTransferRoundEndRuntimeV1({ context, source, producer, state, readPostPlaceParent = null, readHiddenLossParent = null }) {
  const placeReactions = state.officialPsionicTransferRoundEndPolicy?.postPlaceReactionsEnabled === true;
  const outsideActivationReactions = state.officialPsionicTransferRoundEndPolicy?.outsideActivationReactions === true;
  const sharedRoundEnd = state.officialPsionicTransferRoundEndPolicy?.sharedRoundEnd === true;
  const policy = createOfficialPsionicTransferRoundEndPolicyV1({ context, source, includePostPlaceReactions: placeReactions,
    includeOutsideActivationReactions: outsideActivationReactions, sharedRoundEnd });
  if (!isDeepStrictEqual(policy, state.officialPsionicTransferRoundEndPolicy)) {
    throw Error('PSIONIC_TRANSFER_ROUND_END_POLICY_MISMATCH');
  }
  if (placeReactions && typeof readPostPlaceParent !== 'function') throw Error('PSIONIC_TRANSFER_ROUND_END_REACTION_OWNER_REQUIRED');
  const runtimeVersion = policy.version;
  const descriptor = { runtimeId, runtimeVersion, policyHash: policy.policyHash,
    actions: ['begin_psionic_transfer_round_end', 'choose_psionic_transfer_round_end', 'complete_psionic_transfer_round_end'],
    ruleAtomIds: ['rule-atom:source-bound-token-leading-round-end-place-v1'],
    roundEndConsumerReady: true, displacementConsumerReady: false,
    ...(placeReactions ? { postPlaceReactionsEnabled: true } : {}), trainingTruth: false };
  function remaining(current) {
    return producer.validatedEffects(current).filter(row => row.effect.round === Number(current.round)
      && !(current.resolvedPsionicTransferRoundEnd || []).some(done => done.effectHash === row.effect.effectHash));
  }
  function pending(current) {
    const parent = current[parentKey];
    if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_psionic_transfer_round_end_v1'
      || parent.parentHash !== hash(without(parent, 'parentHash')) || parent.policyHash !== policy.policyHash
      || parent.round !== Number(current.round) || parent.phase !== current.phase
      || !['choose', 'complete'].includes(parent.stage)) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_PARENT_INVALID');
    }
    const child = reactionChild(current, parent);
    if (parent.ownerSideKey !== current.activeSideKey && !child) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_PARENT_INVALID');
    }
    return parent;
  }
  function reactionChild(current, parent) {
    const placeChild = placeReactions ? readPostPlaceParent(current) : null;
    const hiddenChild = readHiddenLossParent?.(current);
    const child = placeChild || hiddenChild;
    if (!child) return null;
    if ((child === hiddenChild ? child.sourceKind !== 'hidden_loss' : child.sourceKind !== 'psionic_token_leading')
      || child.roundEndParentHash !== parent.parentHash
      || (child.resumeSideKey || child.sideKey) !== parent.ownerSideKey) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_REACTION_PARENT_INVALID');
    }
    return child;
  }
  function canStart(current) {
    const windowOpen = sharedRoundEnd ? current.phase === 'cleanup'
      && current.currentProductMatchLifecycle?.step === 'round_end_choices'
      && remaining(current).some(row => row.effect.sideKey === current.activeSideKey)
      : current.phase === 'combat' && ['player1', 'player2'].every(side => current.players[side]?.passedPhases?.combat === true);
    return !pending(current) && windowOpen
      && ['player1', 'player2'].includes(current.firstPlayerSideKey)
      && current.psionicTransferRoundEndCompletedRound !== Number(current.round) && remaining(current).length > 0
      && !current.selectedRosterActivationWindow && !current.pendingOfficialReactionWindow && !current.pendingAction
      && !current.pendingOfficialAutomaticHits && !current.pendingOfficialHitsPoolChoice;
  }
  function action(current, actionType, extra = {}) {
    return { actionType, executorId: runtimeId, executorVersion: runtimeVersion,
      sideKey: current.activeSideKey, phase: current.phase, stateHash: hash(current), ...extra };
  }
  function enumerate(current, options = {}) {
    if ((options.sideKey || current.activeSideKey) !== current.activeSideKey) return { candidates: [], parameterDomains: [] };
    const parent = pending(current);
    if (parent && reactionChild(current, parent)) return { candidates: [], parameterDomains: [], suspendedByPostPlaceReaction: true };
    if (!parent) {
      if (!canStart(current)) return { candidates: [], parameterDomains: [] };
      const entries = sharedRoundEnd ? remaining(current).filter(row => row.effect.sideKey === current.activeSideKey)
        .map(({ effect }) => ({ effectHash: effect.effectHash, pieceId: effect.sourcePieceId })) : [{}];
      return { candidates: entries.map(entry => ({ ...action(current, 'begin_psionic_transfer_round_end', entry),
        isEnabled: true })), parameterDomains: [] };
    }
    if (parent.stage === 'complete') return { candidates: [{ ...action(current, 'complete_psionic_transfer_round_end',
      { parentHash: parent.parentHash }), isEnabled: true }], parameterDomains: [] };
    const parameterDomains = remaining(current).filter(row => row.effect.sideKey === parent.ownerSideKey
      && (!sharedRoundEnd || row.effect.effectHash === parent.selectedEffectHash)).map(({ effect }) => {
      const actor = current.pieces.find(piece => piece.id === effect.sourcePieceId);
      return seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_psionic_transfer_round_end_choice_v1', actionType: 'choose_psionic_transfer_round_end',
        executorId: runtimeId, executorVersion: runtimeVersion, sideKey: parent.ownerSideKey, phase: current.phase,
        pieceId: actor.id, definitionId: effect.definitionId,
        parameterSchema: { type: 'object', required: ['choice'],
          choice: { enum: active(actor) ? ['place', 'skip'] : ['skip'] },
          placementPlan: { type: 'complete_model_placement_plan', requiredWhen: { choice: 'place' },
            exactModelIds: actor.models.filter(model => model.isDestroyed !== true && model.isOnField !== false).map(model => model.id).sort(),
            coordinateUnit: 'milli-inch', leadingReference: source.routes ? 'source_owned_token' : 'source_owned_shade' } },
        constraints: { parentHash: parent.parentHash, effectHash: effect.effectHash,
          tokenId: effect.tokenId, sourceBundleHash: source.bundleHash },
        confirmationClass: 'rules_owned_optional_lifecycle', trainingTruth: false }, 'domainId');
    });
    return { candidates: [], parameterDomains };
  }
  function canonicalPlan(value) {
    if (!value || Object.keys(value).sort().join(',') !== 'leadingModelId,placements'
      || typeof value.leadingModelId !== 'string' || !Array.isArray(value.placements)
      || value.placements.some(row => !row || Object.keys(row).sort().join(',') !== 'modelId,xMilliInches,yMilliInches'
        || typeof row.modelId !== 'string' || !Number.isSafeInteger(row.xMilliInches) || !Number.isSafeInteger(row.yMilliInches))) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_PLACEMENT_PARAMETERS_INVALID');
    }
    return structuredClone(value);
  }
  function shadeEffect(current,effectHash) {
    if (!usesWave3FaqClarifications(state)) return undefined;
    return remaining(current).find(row=>row.effect.effectHash===effectHash
      && row.effect.definitionId==='unit:adept/psionic-transfer-movement-phase@1')?.effect.effectHash;
  }
  function instantiate(current, domain, parameters) {
    if (!domain || !isDeepStrictEqual(enumerate(current).parameterDomains.find(row => row.domainId === domain.domainId), domain)
      || !parameters || !domain.parameterSchema.choice.enum.includes(parameters.choice)
      || Object.keys(parameters).sort().join(',') !== (parameters.choice === 'place' ? 'choice,placementPlan' : 'choice')) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_CHOICE_INVALID');
    }
    const canonicalParameters = parameters.choice === 'skip' ? { choice: 'skip' }
      : { choice: 'place', placementPlan: canonicalPlan(parameters.placementPlan) };
    let geometryHash = null;
    if (parameters.choice === 'place') {
      const placement = prepareOfficialTokenLeadingUnitPlacementV1({ state: current, pieceId: domain.pieceId,
        tokenId: domain.constraints.tokenId, shadeEffectHash: shadeEffect(current,domain.constraints.effectHash), placementPlan: canonicalParameters.placementPlan });
      producer.assertEndpoint(current, { pieceId: domain.pieceId, spatialPlan: {
        leadingModelId: null, finalModelPositions: canonicalParameters.placementPlan.placements } });
      geometryHash = placement.geometryHash;
    }
    return { canonicalParameters, action: action(current, domain.actionType, { pieceId: domain.pieceId,
      parentHash: pending(current).parentHash, domainId: domain.domainId,
      effectHash: domain.constraints.effectHash, geometryHash, canonicalParameters }) };
  }
  function nextOwner(current, parent) {
    const other = parent.firstPlayerSideKey === 'player1' ? 'player2' : 'player1';
    const remainingEffects = remaining(current);
    const owner = sharedRoundEnd ? remainingEffects.find(row => row.effect.effectHash === parent.selectedEffectHash)?.effect.sideKey
      : [parent.firstPlayerSideKey, other].find(side => remainingEffects.some(row => row.effect.sideKey === side));
    current.activeSideKey = owner || (sharedRoundEnd ? parent.resumeSideKey : parent.firstPlayerSideKey);
    current[parentKey] = seal({ ...without(parent, 'parentHash'), stage: owner ? 'choose' : 'complete',
      ownerSideKey: current.activeSideKey }, 'parentHash');
  }
  function apply(current, applied, options = {}) {
    const menu = enumerate(current);
    const expected = applied.actionType === 'choose_psionic_transfer_round_end'
      ? instantiate(current, menu.parameterDomains.find(row => row.domainId === applied.domainId), applied.canonicalParameters).action
      : menu.candidates.map(candidate => without(candidate, 'isEnabled')).find(candidate => isDeepStrictEqual(candidate, applied));
    if (!isDeepStrictEqual(expected, applied) || options.chanceReveals?.length) {
      throw Error('PSIONIC_TRANSFER_ROUND_END_ACTION_STALE');
    }
    const next = structuredClone(current);
    const events = [];
    if (applied.actionType === 'begin_psionic_transfer_round_end') {
      nextOwner(next, { schema: 'starcraft_tmg_psionic_transfer_round_end_v1', policyHash: policy.policyHash,
        round: Number(next.round), phase: next.phase, firstPlayerSideKey: next.firstPlayerSideKey,
        resumeSideKey: next.activeSideKey, ...(sharedRoundEnd ? { selectedEffectHash: applied.effectHash } : {}), trainingTruth: false });
      events.push({ type: 'psionic_transfer_round_end_opened', firstPlayerSideKey: next.firstPlayerSideKey });
    } else if (applied.actionType === 'complete_psionic_transfer_round_end') {
      const parent = pending(current);
      next.activeSideKey = parent.resumeSideKey;
      if (!sharedRoundEnd || !remaining(next).length) next.psionicTransferRoundEndCompletedRound = Number(next.round);
      delete next[parentKey];
      events.push({ type: 'psionic_transfer_round_end_complete', completedRound: Number(next.round) });
    } else {
      const effect = remaining(current).find(row => row.effect.effectHash === applied.effectHash).effect;
      if (applied.canonicalParameters.choice === 'place') {
        const placed = prepareOfficialTokenLeadingUnitPlacementV1({ state: next, pieceId: applied.pieceId,
          tokenId: effect.tokenId, shadeEffectHash: shadeEffect(current,effect.effectHash), placementPlan: applied.canonicalParameters.placementPlan });
        next.pieces = next.pieces.map(piece => piece.id === applied.pieceId ? placed.piece : piece);
      }
      next.resolvedPsionicTransferRoundEnd = [...(next.resolvedPsionicTransferRoundEnd || []), {
        round: Number(next.round), sourcePieceId: effect.sourcePieceId, effectHash: effect.effectHash,
        tokenId: effect.tokenId, choice: applied.canonicalParameters.choice, geometryHash: applied.geometryHash,
        ...(placeReactions ? { sourceActionHash: hash(applied) } : {}),
        sourceBundleHash: source.bundleHash, trainingTruth: false }];
      events.push({ type: 'psionic_transfer_round_end_choice_resolved', pieceId: applied.pieceId,
        tokenId: effect.tokenId, choice: applied.canonicalParameters.choice, geometryHash: applied.geometryHash });
      nextOwner(next, pending(current));
    }
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1),
      round: Number(next.round), phase: next.phase, action: structuredClone(applied), events: structuredClone(events) }];
    return { ok: true, state: next, action: applied, events, runtimeId, runtimeVersion, trainingTruth: false };
  }
  function cleanup(current) {
    const effects = producer.validatedEffects(current);
    if (pending(current) || effects.some(row => !(current.resolvedPsionicTransferRoundEnd || [])
      .some(done => done.effectHash === row.effect.effectHash))) throw Error('PSIONIC_TRANSFER_ROUND_END_CHOICES_REQUIRED');
    const tokenIds = new Set(effects.map(row => row.token.tokenId));
    if (!tokenIds.size) return current;
    const next = structuredClone(current);
    next.board.tokens = next.board.tokens.filter(token => !tokenIds.has(token.tokenId));
    next.pendingPsionicTransferEffects = next.pendingPsionicTransferEffects.filter(effect => !tokenIds.has(effect.tokenId));
    next.psionicTransferCleanupHistory = [...(next.psionicTransferCleanupHistory || []), {
      round: Number(next.round), tokenIds: [...tokenIds].sort(), sourceBundleHash: source.bundleHash, trainingTruth: false }];
    return next;
  }
  return Object.freeze({ descriptor, canStart, pending, enumerate, instantiate, apply, cleanup,
    ...(sharedRoundEnd ? { scheduledEffects: current => remaining(current).map(({ effect }) => ({
      sideKey: effect.sideKey, pieceId: effect.sourcePieceId, effectId: effect.effectHash })) } : {}),
    hasOutstanding: current => remaining(current).length > 0 });
}
