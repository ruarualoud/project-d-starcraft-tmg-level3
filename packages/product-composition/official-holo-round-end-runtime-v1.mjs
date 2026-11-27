import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialHoloRoundEndSourceV1 } from '../source-data/official-holo-round-end-source-v1.mjs';
import { prepareOfficialUnitRelativeCoherencyPlacementV1 } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { allowsOfficialAbilityUnitRecipientV13 } from '../rule-atoms/official-structure-targeting-policy-v13.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { resolveOfficialNextControllerEffectGroupV1 } from '../rule-atoms/official-ability-timing-priority-rules-kernel-v1.mjs';

const clone = value => structuredClone(value);
const without = (value, key) => Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
const seal = (body, key) => ({ ...body, [key]: hash(body) });
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true && Number(piece.currentModels) > 0;
const liveModels = piece => piece.models.filter(model => model.isOnField !== false && model.isDestroyed !== true);
const fail = code => { throw Error(code); };

export function createOfficialHoloRoundEndRuntimeV1({ source, refreshState, scheduledByMatch = false } = {}) {
  verifyOfficialHoloRoundEndSourceV1(source);
  const generalized = source.version === '1.1.0';
  const runtimeId = generalized ? 'official-unit-round-end-runtime-v1' : 'official-holo-round-end-runtime-v1';
  const version = generalized ? '1.1.0' : '1.0.0';
  const parentKey = generalized ? 'pendingOfficialUnitRoundEnd' : 'pendingOfficialHoloRoundEnd';
  const historyKey = generalized ? 'officialUnitRoundEndHistory' : 'officialHoloRoundEndHistory';
  const completeKey = generalized ? 'officialUnitRoundEndCompletedRound' : 'officialHoloRoundEndCompletedRound';
  const sourceField = generalized ? 'officialUnitRoundEndSourceBundle' : 'officialHoloRoundEndSourceBundle';
  const parentSchema = generalized ? 'starcraft_tmg_unit_round_end_parent_v1' : 'starcraft_tmg_holo_round_end_parent_v1';
  const eventPrefix = generalized ? 'unit' : 'holo';
  const actionNames = generalized ? {
    begin: 'begin_unit_round_end', remove: 'resolve_unit_timed_life',
    surprise: 'choose_holo_surprise', complete: 'complete_unit_round_end',
  } : {
    begin: 'begin_holo_round_end', remove: 'resolve_holo_timed_life',
    surprise: 'choose_holo_surprise', complete: 'complete_holo_round_end',
  };
  if (typeof refreshState !== 'function') fail('HOLO_ROUND_END_REFRESH_REQUIRED');
  const descriptor = { adapterId: runtimeId, adapterVersion: version, adapterKind: 'exact_runtime', runtimeId,
    runtimeVersion: version, sourceBundleHash: source.bundleHash, coveredDefinitionCount: source.definitions.length,
    coveredSourceFeatureHashes: source.definitions.map(row => row.sourceFeatureHash),
    supportedOperations: ['legal_space', 'query'], ruleAtomIds: source.ruleAtomIds,
    actions: [actionNames.begin, actionNames.remove, actionNames.surprise, actionNames.complete],
    rulesAuthority: true, trainingTruth: false };
  const definitionBindings = source.definitions.map(row => ({ sourceFeatureHash: row.sourceFeatureHash,
    adapterId: runtimeId, adapterVersion: version, capability: 'system_lifecycle' }));
  function assertSource(current) {
    if (!isDeepStrictEqual(current[sourceField], source)) fail('HOLO_ROUND_END_SOURCE_BINDING_INVALID');
  }
  function sourceUnit(current, effect) {
    const piece = current.pieces.find(row => row.id === effect.pieceId);
    if (!piece || piece.officialUnitRecordKey !== effect.recordKey || piece.sourceRecordHash !== effect.sourceRecordHash
      || piece.officialPayloadHash !== effect.payloadHash || piece.sideKey !== effect.sideKey) fail('HOLO_ROUND_END_UNIT_SOURCE_MISMATCH');
    return piece;
  }
  function queue(current) {
    return current.pieces.filter(piece => active(piece)).flatMap(piece => source.definitions
      .filter(definition => definition.recordKey === piece.officialUnitRecordKey).map(definition => {
        const effect = { round: Number(current.round), pieceId: piece.id, sideKey: piece.sideKey,
          definitionId: definition.definitionId, recordKey: definition.recordKey, effectKind: definition.effectKind,
          sourceRecordHash: definition.sourceRecordHash, payloadHash: definition.payloadHash,
          sourceFeatureHash: definition.sourceFeatureHash };
        sourceUnit(current, effect); return { ...effect, effectId: hash(effect) };
      })).sort((left, right) => left.effectId.localeCompare(right.effectId));
  }
  function pending(current) {
    assertSource(current); const parent = current[parentKey]; if (!parent) return null;
    if (parent.schema !== parentSchema || parent.parentHash !== hash(without(parent, 'parentHash'))
      || parent.sourceBundleHash !== source.bundleHash || parent.round !== Number(current.round) || current.phase !== 'cleanup'
      || current.currentProductMatchLifecycle?.step !== 'round_end_choices'
      || parent.ownerSideKey !== current.activeSideKey || !['choose', 'complete'].includes(parent.stage)
      || !Array.isArray(parent.effects)) fail('HOLO_ROUND_END_PARENT_INVALID');
    return parent;
  }
  function canStart(current) {
    // A shared Match menu already offers each eligible Holo effect to its owner.
    return !scheduledByMatch && !pending(current) && current.phase === 'cleanup' && !current.gameOver && !current.terminal
      && current.currentProductMatchLifecycle?.step === 'round_end_choices'
      && current.activeSideKey === current.firstPlayerSideKey && ['player1', 'player2'].includes(current.firstPlayerSideKey)
      && current[completeKey] !== Number(current.round) && !current.selectedRosterActivationWindow && !current.pendingAction
      && !current.pendingOfficialReactionWindow;
  }
  function unresolved(current, parent) {
    const done = new Set((current[historyKey] || []).filter(row => row.round === Number(current.round)).map(row => row.effectId));
    return parent.effects.filter(effect => !done.has(effect.effectId));
  }
  function nextGroup(parent, remaining) {
    return resolveOfficialNextControllerEffectGroupV1({
      playerSideKeys: ['player1', 'player2'], prioritySideKey: parent.firstPlayerSideKey,
      pendingEffects: remaining.map(effect => ({ effectId: effect.effectId, controllerSideKey: effect.sideKey })),
    });
  }
  function record(next, effect, outcome, extra = {}) {
    next[historyKey] = [...(next[historyKey] || []), { round: Number(next.round), effectId: effect.effectId,
      definitionId: effect.definitionId, pieceId: effect.pieceId, sideKey: effect.sideKey, outcome, ...extra,
      sourceBundleHash: source.bundleHash, trainingTruth: false }];
  }
  function removeTimedLifeSource(next, effect, events, matchOwned = false) {
    const actor = sourceUnit(next, effect);
    actor.isOnField = false; actor.isInReserves = false; actor.isDestroyed = true; actor.isRemoved = true;
    actor.currentModels = 0; actor.currentSupply = 0;
    if (generalized || matchOwned) actor.destroyedModelIds = actor.models.map(model => model.id).sort();
    actor.models.forEach(model => { model.isOnField = false; model.isDestroyed = true; model.remainingWounds = 0; });
    record(next, effect, 'timed_life_removed');
    events.push({ type: `${eventPrefix}_timed_life_removed`, pieceId: actor.id, definitionId: effect.definitionId,
      effectId: effect.effectId, cause: 'timed_life', opponentKillAttribution: false });
  }

  // The full Match owns controller order when assets and Timed Life share the window.
  function scheduledRemovals(current) {
    assertSource(current);
    if (!generalized || source.definitions.some(row => row.effectKind !== 'remove_source')) {
      fail('UNIT_ROUND_END_REMOVAL_ONLY_SOURCE_REQUIRED');
    }
    if (current[parentKey]) fail('UNIT_ROUND_END_CONTROLLER_ALREADY_BOUND');
    return queue(current);
  }
  function resolveScheduledRemoval(current, effectId) {
    const effect = scheduledRemovals(current).find(row => row.effectId === effectId);
    if (current.phase !== 'cleanup' || current.currentProductMatchLifecycle?.step !== 'round_end_choices'
      || current.gameOver || current.terminal || !effect || effect.sideKey !== current.activeSideKey) {
      fail('UNIT_ROUND_END_REMOVAL_UNAVAILABLE');
    }
    const next = clone(current), events = [];
    removeTimedLifeSource(next, effect, events);
    return {state: refreshState(next), events};
  }
  // The Match shares this queue with terrain and other end-of-round opportunities.
  // Re-evaluate live sources after each choice and consume each effect only once.
  function scheduledEffects(current) {
    assertSource(current);
    if (current[parentKey]) fail('UNIT_ROUND_END_CONTROLLER_ALREADY_BOUND');
    const resolved = new Set((current[historyKey] || []).filter(row => row.round === Number(current.round)).map(row => row.effectId));
    return queue(current).filter(effect => !resolved.has(effect.effectId));
  }
  function isScheduledWindow(current) {
    return current.phase === 'cleanup' && current.currentProductMatchLifecycle?.step === 'round_end_choices'
      && !current.gameOver && !current.terminal;
  }
  function scheduledSurpriseDomains(current) {
    if (!isScheduledWindow(current)) return [];
    return scheduledEffects(current).filter(effect => effect.effectKind === 'set_nova' && effect.sideKey === current.activeSideKey)
      .map(effect => surpriseDomain(current, effect, null));
  }
  function instantiateScheduledSurprise(current, domain, parameters) {
    const fresh = scheduledSurpriseDomains(current).find(row => row.domainId === domain?.domainId);
    return instantiateChoice(current, domain, fresh, parameters);
  }
  function applyScheduledSurprise(current, applied, options = {}) {
    const domain = scheduledSurpriseDomains(current).find(row => row.domainId === applied.domainId);
    if (!domain || options.chanceReveals?.length || !isDeepStrictEqual(applied,
      instantiateScheduledSurprise(current, domain, applied.canonicalParameters).action)) fail('HOLO_SURPRISE_ACTION_STALE');
    const effect = scheduledEffects(current).find(row => row.effectId === domain.effectId);
    const next = clone(current), events = [];
    resolveSurprise(next, effect, applied, events);
    return {state: refreshState(next), events};
  }
  function removeScheduledSource(current, effectId) {
    const effects = scheduledEffects(current);
    const effect = effects.find(row => row.effectId === effectId && row.effectKind === 'remove_source');
    if (!isScheduledWindow(current) || !effect || effect.sideKey !== current.activeSideKey) fail('UNIT_ROUND_END_REMOVAL_UNAVAILABLE');
    const next = clone(current), events = [];
    removeTimedLifeSource(next, effect, events, true);
    for (const other of effects.filter(row => row.pieceId === effect.pieceId && row.effectId !== effectId)) {
      record(next, other, 'source_not_on_battlefield');
      events.push({type: eventPrefix + '_round_end_effect_unavailable', effectId: other.effectId,
        pieceId: other.pieceId, definitionId: other.definitionId, reason: 'source_not_on_battlefield'});
    }
    return {state: refreshState(next), events};
  }
  function advance(next, parent, events) {
    for (const effect of unresolved(next, parent)) if (!active(sourceUnit(next, effect))) {
      record(next, effect, 'source_not_on_battlefield');
      events.push({ type: `${eventPrefix}_round_end_effect_unavailable`, effectId: effect.effectId,
        pieceId: effect.pieceId, definitionId: effect.definitionId, reason: 'source_not_on_battlefield' });
    }
    const { controllerSideKey: owner } = nextGroup(parent, unresolved(next, parent));
    next.activeSideKey = owner || parent.firstPlayerSideKey;
    next[parentKey] = seal({ ...without(parent, 'parentHash'), ownerSideKey: next.activeSideKey,
      stage: owner ? 'choose' : 'complete' }, 'parentHash');
  }
  function eligibleNovas(current, actor) {
    const { projected } = projectOfficialRangedTerrainForLosV1(current);
    return current.pieces.filter(target => active(target) && target.sideKey === actor.sideKey
      && source.novaRecordKeys.includes(target.officialUnitRecordKey) && allowsOfficialAbilityUnitRecipientV13(current, target))
      .filter(target => {
        const profile = source.novaProfiles.find(row => row.recordKey === target.officialUnitRecordKey);
        if (target.sourceRecordHash !== profile.sourceRecordHash || target.officialPayloadHash !== profile.payloadHash) {
          fail('HOLO_SURPRISE_NOVA_SOURCE_MISMATCH');
        }
        return liveModels(actor).some(model => liveModels(target).some(targetModel => evaluateOfficialElevatedLineOfSightV1({
          state: projected, attacker: actor, attackerModelId: model.id, target, targetModelId: targetModel.id,
          dataBundle: current.officialTerrainLosDataBundle }).visible));
      }).map(target => target.id).sort();
  }
  function action(current, actionType, extra = {}) {
    return { actionType, sideKey: current.activeSideKey, phase: current.phase, stateHash: hash(current),
      executorId: runtimeId, executorVersion: version, ruleAtomIds: source.ruleAtomIds,
      sourceBundleHash: source.bundleHash, ...extra };
  }
  function enumerate(current, options = {}) {
    if (options.sideKey && options.sideKey !== current.activeSideKey) return { candidates: [], parameterDomains: [] };
    const parent = pending(current);
    if (!parent) return { candidates: canStart(current) ? [{ ...action(current, actionNames.begin), isEnabled: true }] : [], parameterDomains: [] };
    if (parent.stage === 'complete') return { candidates: [{ ...action(current, actionNames.complete,
      { parentHash: parent.parentHash }), isEnabled: true }], parameterDomains: [] };
    const candidates = [], parameterDomains = [];
    const remaining = unresolved(current, parent);
    const group = nextGroup(parent, remaining);
    if (group.controllerSideKey !== parent.ownerSideKey) fail('HOLO_ROUND_END_OWNER_STALE');
    const availableIds = new Set(group.availableEffectIds);
    for (const effect of remaining.filter(row => availableIds.has(row.effectId))) {
      const actor = sourceUnit(current, effect);
      if (effect.effectKind === 'remove_source') candidates.push({ ...action(current, actionNames.remove, {
        pieceId: actor.id, definitionId: effect.definitionId, effectId: effect.effectId, parentHash: parent.parentHash }), isEnabled: true });
      else {
        parameterDomains.push(surpriseDomain(current, effect, parent.parentHash));
      }
    }
    return { candidates, parameterDomains };
  }
  function surpriseDomain(current, effect, parentHash) {
    const actor = sourceUnit(current, effect);
    const targets = eligibleNovas(current, actor);
    return seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_holo_surprise_v1', actionType: 'choose_holo_surprise', pieceId: actor.id,
      definitionId: effect.definitionId, sideKey: effect.sideKey, phase: current.phase,
      executorId: runtimeId, executorVersion: version, ruleAtomIds: source.ruleAtomIds,
      parentHash, effectId: effect.effectId, stateHash: hash(current),
      parameterSchema: { type: 'object', required: ['choice'], choice: { enum: targets.length ? ['place', 'skip'] : ['skip'] },
        targetUnitId: { enum: targets, requiredWhen: { choice: 'place' } },
        coordinate: { requiredWhen: { choice: 'place' }, coordinateUnit: 'milli-inch', required: ['xMilliInches', 'yMilliInches'] } },
      constraints: { fullBaseCoherencyRequired: true, sourceUnitIsExternalLeadingModel: true,
        targetMustBeOnField: true, lineOfSightRequired: true }, trainingTruth: false }, 'domainId');
  }
  function resolveSurprise(next, effect, applied, events) {
    const actor = sourceUnit(next, effect);
    const parameters = applied.canonicalParameters;
    if (parameters.choice === 'place') {
      const placement = prepare(next, actor, parameters);
      next.pieces = next.pieces.map(piece => piece.id === parameters.targetUnitId ? placement.piece : piece);
    }
    record(next, effect, parameters.choice, { targetUnitId: parameters.targetUnitId || null, geometryHash: applied.geometryHash });
    events.push({ type: 'holo_surprise_resolved', pieceId: actor.id, effectId: effect.effectId,
      targetUnitId: parameters.targetUnitId || null, choice: parameters.choice, geometryHash: applied.geometryHash });
  }
  function prepare(current, actor, parameters) {
    const target = current.pieces.find(row => row.id === parameters.targetUnitId);
    if (!target || liveModels(target).length !== 1) fail('HOLO_SURPRISE_SINGLE_MODEL_REQUIRED');
    return prepareOfficialUnitRelativeCoherencyPlacementV1({ state: current, pieceId: target.id, anchorPieceId: actor.id,
      placementPlan: { leadingModelId: liveModels(target)[0].id,
        placements: [{ modelId: liveModels(target)[0].id, ...parameters.coordinate, rotationDegrees: 0 }] } });
  }
  function instantiate(current, domain, parameters) {
    const fresh = enumerate(current).parameterDomains.find(row => row.domainId === domain?.domainId);
    return instantiateChoice(current, domain, fresh, parameters);
  }
  function instantiateChoice(current, domain, fresh, parameters) {
    if (!fresh || !isDeepStrictEqual(fresh, domain) || !parameters || !domain.parameterSchema.choice.enum.includes(parameters.choice)) {
      fail('HOLO_SURPRISE_DOMAIN_OR_CHOICE_INVALID');
    }
    let canonicalParameters, geometryHash = null;
    if (parameters.choice === 'skip') {
      if (Object.keys(parameters).join(',') !== 'choice') fail('HOLO_SURPRISE_PARAMETERS_INVALID');
      canonicalParameters = { choice: 'skip' };
    } else {
      if (Object.keys(parameters).sort().join(',') !== 'choice,coordinate,targetUnitId'
        || !domain.parameterSchema.targetUnitId.enum.includes(parameters.targetUnitId)
        || !parameters.coordinate || Object.keys(parameters.coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
        || !Object.values(parameters.coordinate).every(Number.isSafeInteger)) fail('HOLO_SURPRISE_PARAMETERS_INVALID');
      canonicalParameters = clone(parameters);
      geometryHash = prepare(current, current.pieces.find(row => row.id === domain.pieceId), canonicalParameters).geometryHash;
    }
    return { canonicalParameters, action: action(current, 'choose_holo_surprise', { pieceId: domain.pieceId,
      definitionId: domain.definitionId, effectId: domain.effectId, parentHash: domain.parentHash,
      domainId: domain.domainId, canonicalParameters, geometryHash }) };
  }
  function apply(current, applied, options = {}) {
    const menu = enumerate(current);
    const expected = applied.actionType === 'choose_holo_surprise'
      ? instantiate(current, menu.parameterDomains.find(row => row.domainId === applied.domainId), applied.canonicalParameters).action
      : menu.candidates.map(row => without(row, 'isEnabled')).find(row => row.actionType === applied.actionType && row.effectId === applied.effectId);
    if (!expected || !isDeepStrictEqual(expected, applied) || options.chanceReveals?.length) fail('HOLO_ROUND_END_ACTION_STALE');
    const next = clone(current), events = [];
    if (applied.actionType === actionNames.begin) {
      if (current.pendingPsionicTransferRoundEnd || (current.pendingPsionicTransferEffects || []).some(row => row.round === Number(current.round))
        || (current.pendingBattlefieldAssetOpportunities || []).some(row => row.optional && row.expiresAt === 'cleanup_and_refresh')) {
        fail('HOLO_ROUND_END_SHARED_ORDER_CONSUMER_REQUIRED');
      }
      const effects = queue(current);
      advance(next, { schema: parentSchema, round: Number(current.round),
        firstPlayerSideKey: current.firstPlayerSideKey, sourceBundleHash: source.bundleHash, effects }, events);
      events.push({ type: `${eventPrefix}_round_end_opened`, firstPlayerSideKey: current.firstPlayerSideKey,
        effects: effects.map(row => ({ effectId: row.effectId, pieceId: row.pieceId, definitionId: row.definitionId, sideKey: row.sideKey })) });
    } else if (applied.actionType === actionNames.complete) {
      if (unresolved(current, pending(current)).length) fail('HOLO_ROUND_END_EFFECTS_REMAINING');
      next[completeKey] = Number(next.round); delete next[parentKey];
      next.activeSideKey = next.firstPlayerSideKey;
      next.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
        round: Number(next.round), step: 'cleanup_and_refresh', trainingTruth: false };
      events.push({ type: `${eventPrefix}_round_end_complete`, round: Number(next.round), nextStep: 'cleanup_and_refresh' });
    } else {
      const parent = pending(current), effect = unresolved(current, parent).find(row => row.effectId === applied.effectId);
      if (applied.actionType === actionNames.remove) {
        removeTimedLifeSource(next, effect, events);
      } else {
        resolveSurprise(next, effect, applied, events);
      }
      advance(next, parent, events);
    }
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: clone(applied), events: clone(events) }];
    return { ok: true, state: refreshState(next), action: applied, events, runtimeId, runtimeVersion: version, trainingTruth: false };
  }
  function query(current, request = {}) {
    if (request.queryKind !== (generalized ? 'unit_round_end_status' : 'holo_round_end_status')
      || Object.keys(request).join(',') !== 'queryKind') fail('HOLO_ROUND_END_QUERY_INVALID');
    return seal({ schema: generalized ? 'starcraft_tmg_unit_round_end_query_v1' : 'starcraft_tmg_holo_round_end_query_v1', stateHash: hash(current),
      result: { pending: pending(current), canStart: canStart(current), completedRound: current[completeKey] || null,
        history: clone(current[historyKey] || []) }, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return { descriptor, definitionBindings, pending, canStart, enumerate, legalSpace: enumerate, instantiate, apply, query,
    scheduledEffects, scheduledSurpriseDomains, instantiateScheduledSurprise, applyScheduledSurprise, removeScheduledSource,
    ...(generalized ? {scheduledRemovals, resolveScheduledRemoval} : {}) };
}
