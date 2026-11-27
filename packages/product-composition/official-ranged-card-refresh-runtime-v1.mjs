import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { compileOfficialCardBuildPaymentProfilesV2 }
  from '../source-data/official-card-build-payment-data-bundle-v1.mjs';

const runtimeId = 'starcraft-tmg-ranged-card-refresh-v1';
const actionType = 'resolve_ranged_card_refresh';
const pendingKey = 'pendingOfficialRangedCardRefresh';
const historyKey = 'officialRangedCardRefreshHistory';
const atomId = 'rule-atom:source-ranged-outcome-optional-card-refresh-v1';
const seal = (body, field) => ({ ...body, [field]: hash(body) });

export function listOfficialNonUniqueExhaustedTacticalCardIdsV1(state, sideKey, profileForRecordKey,
  bindingError = 'RANGED_CARD_REFRESH_CARD_BINDING_INVALID') {
  return listOfficialExhaustedTacticalCardIdsV1(state, sideKey, profileForRecordKey, { bindingError, includeUnique: false });
}

export function listOfficialExhaustedTacticalCardIdsV1(state, sideKey, profileForRecordKey,
  { bindingError = 'TACTICAL_CARD_REFRESH_CARD_BINDING_INVALID', includeUnique = true } = {}) {
  return (state.cardResources?.[sideKey] || []).filter(card => {
    const profile = profileForRecordKey(card.officialCardRecordKey);
    if (!profile || profile.sourceRecordHash !== card.sourceRecordHash
      || profile.payloadHash !== card.officialPayloadHash || card.sideKey !== sideKey) {
      throw Error(bindingError);
    }
    return profile.cardKind === 'tactical' && (includeUnique || profile.isUnique === false) && card.readiness === 'exhausted';
  }).map(card => card.cardInstanceId).sort();
}

export function createOfficialRangedCardRefreshRuntimeV1({ context, bundle, state: initial, hasUnsettledAction }) {
  const routes = bundle.routes.filter(route => route.effectKind === 'ranged_card_refresh');
  if (routes.length !== 1 || typeof hasUnsettledAction !== 'function') {
    throw Error('RANGED_CARD_REFRESH_SOURCE_OR_CONSUMERS_REQUIRED');
  }
  const route = routes[0];
  const compiled = compileOfficialCardBuildPaymentProfilesV2(context.dataset, null);
  if (!isDeepStrictEqual(compiled.profiles, initial.officialCardBuildPaymentDataBundle?.cardProfiles)) {
    throw Error('RANGED_CARD_REFRESH_CARD_SOURCE_MISMATCH');
  }
  const profiles = new Map(compiled.profiles.map(profile => [profile.recordKey, profile]));
  const descriptor = seal({ runtimeId, runtimeVersion: '1.0.0', actions: [actionType], ruleAtomIds: [atomId],
    definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
    sourceBundleHash: bundle.bundleHash, cardProfileIndexHash: initial.officialCardBuildPaymentDataBundle.cardProfileIndexHash,
    optionalControllerChoice: true, deduplicatedBy: 'attackResolutionHash', trainingTruth: false }, 'runtimeHash');

  function pending(state) {
    const value = state[pendingKey];
    if (value === undefined) return null;
    const { parentHash, ...body } = value;
    if (parentHash !== hash(body) || value.definitionId !== route.definitionId
      || value.sourceFeatureHash !== route.sourceFeatureHash || value.round !== Number(state.round)
      || value.phase !== state.phase || !Array.isArray(value.eligibleCardInstanceIds)
      || state[historyKey]?.some(entry => entry.attackResolutionHash === value.attackResolutionHash)) {
      throw Error('RANGED_CARD_REFRESH_PARENT_INVALID');
    }
    return value;
  }
  function eligibleCards(state, sideKey) {
    return listOfficialNonUniqueExhaustedTacticalCardIdsV1(state, sideKey, key => profiles.get(key));
  }
  function observe(result) {
    let next = result.state;
    const events = [...result.events];
    for (const event of result.events) {
      if (event.type !== 'ranged_attack' || event.weaponName !== route.weaponName) continue;
      const actor = next.pieces.find(piece => piece.id === event.pieceId);
      if (actor?.officialUnitRecordKey !== route.recordKey || !actor.isOnField || actor.isDestroyed
        || next.phase !== route.phase) continue;
      const target = next.pieces.find(piece => piece.id === event.targetId);
      const profileKey = actor.officialUnitRecordKey + '::assault::' + route.weaponName;
      const profile = next.officialAttackProfileCatalogue.profilesByProfileKey[profileKey];
      if (!target || target.sideKey === actor.sideKey || event.sideKey !== actor.sideKey
        || event.stages?.declaration?.profileKey !== profileKey || event.sourceProfileHash !== profile?.profileHash
        || !/^[a-f0-9]{64}$/.test(event.attackResolutionHash)
        || !Number.isFinite(event.currentSupplyBefore) || !Number.isFinite(event.currentSupplyAfter)) {
        throw Error('RANGED_CARD_REFRESH_ATTACK_BINDING_INVALID');
      }
      if (!event.targetDestroyed && event.currentSupplyAfter >= event.currentSupplyBefore) continue;
      if (pending(next)?.attackResolutionHash === event.attackResolutionHash
        || next[historyKey]?.some(entry => entry.attackResolutionHash === event.attackResolutionHash)) continue;
      if (pending(next)) throw Error('RANGED_CARD_REFRESH_PREVIOUS_CHOICE_REQUIRED');
      next = structuredClone(next);
      const eligibleCardInstanceIds = eligibleCards(next, actor.sideKey);
      const body = { definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash,
        attackResolutionHash: event.attackResolutionHash, pieceId: actor.id, sideKey: actor.sideKey,
        round: Number(next.round), phase: next.phase, resumeSideKey: next.activeSideKey,
        eligibleCardInstanceIds, trainingTruth: false };
      if (eligibleCardInstanceIds.length) {
        next[pendingKey] = seal(body, 'parentHash');
        events.push({ type: 'ranged_card_refresh_offered', ...body });
      } else {
        next[historyKey] = [...(next[historyKey] || []), { ...body, decision: 'no_eligible_card', cardInstanceId: null }];
      }
    }
    const parent = pending(next);
    if (parent && !hasUnsettledAction(next) && next.activeSideKey !== parent.sideKey) {
      next = structuredClone(next); next.activeSideKey = parent.sideKey;
    }
    return { ...result, state: next, events };
  }
  function enumerate(state, options = {}) {
    const parent = pending(state);
    if (!parent || hasUnsettledAction(state) || (options.sideKey || state.activeSideKey) !== parent.sideKey) {
      return { candidates: [], parameterDomains: [] };
    }
    const available = eligibleCards(state, parent.sideKey).filter(id => parent.eligibleCardInstanceIds.includes(id));
    const domain = seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_ranged_card_refresh_v1', actionType, sideKey: parent.sideKey, phase: state.phase,
      pieceId: parent.pieceId, abilityName: route.abilityName, executorId: runtimeId, executorVersion: '1.0.0',
      ruleAtomIds: [atomId], parameterSchema: { type: 'object', required: ['cardInstanceId'],
        cardInstanceId: { enum: [null, ...available] } },
      constraints: { parentHash: parent.parentHash, stateHash: hash(state), nullMeansDecline: true,
        sourceDefinitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash }, trainingTruth: false }, 'domainId');
    return { candidates: [], parameterDomains: [domain] };
  }
  function instantiate(state, domain, parameters) {
    const current = enumerate(state, { sideKey: domain.sideKey }).parameterDomains[0];
    if (!current || !isDeepStrictEqual(current, domain) || !parameters || Array.isArray(parameters)
      || Object.keys(parameters).length !== 1 || !Object.hasOwn(parameters, 'cardInstanceId')
      || !current.parameterSchema.cardInstanceId.enum.includes(parameters.cardInstanceId)) {
      throw Error('RANGED_CARD_REFRESH_CHOICE_STALE_OR_INVALID');
    }
    const canonicalParameters = structuredClone(parameters);
    return { canonicalParameters, action: { actionType, sideKey: domain.sideKey, pieceId: domain.pieceId,
      phase: state.phase, abilityName: route.abilityName, executorId: runtimeId, executorVersion: '1.0.0',
      ruleAtomIds: [atomId], refreshPlan: { domainId: domain.domainId, stateHash: hash(state), canonicalParameters } } };
  }
  function apply(state, action) {
    const domain = enumerate(state, { sideKey: action.sideKey }).parameterDomains[0];
    if (!domain || !isDeepStrictEqual(instantiate(state, domain, action.refreshPlan?.canonicalParameters).action, action)) {
      throw Error('RANGED_CARD_REFRESH_ACTION_STALE');
    }
    const parent = pending(state), next = structuredClone(state);
    const cardInstanceId = action.refreshPlan.canonicalParameters.cardInstanceId;
    if (cardInstanceId !== null) next.cardResources[parent.sideKey].find(card => card.cardInstanceId === cardInstanceId).readiness = 'ready';
    const record = { ...parent, decision: cardInstanceId === null ? 'declined' : 'refreshed', cardInstanceId };
    next[historyKey] = [...(next[historyKey] || []), record];
    delete next[pendingKey]; next.activeSideKey = parent.resumeSideKey;
    const events = [{ type: 'ranged_card_refresh_resolved', ...record }];
    next.log = [...(next.log || []), { round: Number(next.round), phase: next.phase, action, events }];
    return { ok: true, state: next, action, events, trainingTruth: false };
  }
  return Object.freeze({ descriptor, pending, eligibleCards, afterTransition: observe, enumerate, instantiate, apply,
    ownsWindow: state => Boolean(pending(state) && !hasUnsettledAction(state)) });
}
