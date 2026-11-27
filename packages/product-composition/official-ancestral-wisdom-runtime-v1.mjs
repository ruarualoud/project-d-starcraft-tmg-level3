import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { consumeOfficialReactionFamilyResolutionV1, openOfficialReactionFamilyWindowV1 }
  from './official-reaction-family-adapter-v1.mjs';
import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID, OFFICIAL_ADVANCED_TRAINING_ID, ancestralWisdomParentKey as key,
  ancestralWisdomProbeKey as probeKey, readyAncestralWisdomCardV1 } from './official-ancestral-wisdom-payment-v1.mjs';

const kind = 'ancestral_wisdom_intent';
const type = 'request_ancestral_wisdom_payment';
const atomId = 'rule-atom:templar-archives-pre-payment-reaction-v1';
const triggerKind = 'ability_cost_payment';
const quoteFor = domain => domain.constraints?.resourceCostsByChoice?.default || domain.constraints?.resourceCost;

function identity(domain) {
  return { actionType: domain.actionType, sourceRuntimeKind: domain.sourceRuntimeKind || 'ability',
    definitionId: domain.definitionId || domain.sourceDomain?.routeId || domain.abilityName,
    pieceId: domain.pieceId, sideKey: domain.sideKey };
}

export function createOfficialAncestralWisdomRuntimeV1({ reactionBundle }) {
  const routes = reactionBundle.routes.filter(row => [OFFICIAL_ADVANCED_TRAINING_ID, OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID].includes(row.definitionId));
  const hasAcademy = routes.some(row => row.definitionId === OFFICIAL_ADVANCED_TRAINING_ID);
  const routeOf = source => routes.find(row => row.definitionId === source.definitionId && row.routeHash === source.sourceRouteHash);
  if (!routes.length || routes.some(row => row.triggerKind !== triggerKind || row.discountedResourceType !== (row.definitionId === OFFICIAL_ADVANCED_TRAINING_ID ? 'CP' : 'PE'))) {
    throw Error('ANCESTRAL_WISDOM_SOURCE_REQUIRED');
  }

  function pending(state) {
    const parent = state[key];
    if (!parent) return null;
    const { parentHash, ...body } = parent;
    const window = state.pendingOfficialReactionWindow;
    if (hash(body) !== parentHash || !routeOf(parent.source)
      || parent.round !== Number(state.round) || parent.phase !== state.phase
      || (window && (parent.stage !== 'reaction' || window.triggerHash !== parent.triggerHash))) {
      throw Error('ANCESTRAL_WISDOM_PAYMENT_PARENT_INVALID');
    }
    return parent;
  }

  function setParent(state, body) {
    state[key] = { ...body, parentHash: hash(body) };
  }

  function probe(state, options, enumerateNative) {
    const probing = { ...state, [probeKey]: true };
    return { probing, domains: enumerateNative(probing, options).parameterDomains.filter(domain => quoteFor(domain)?.ancestralWisdom) };
  }

  function intentDomain(domain) {
    const { domainId: quotedDomainId, ...body } = domain;
    const request = { ...body, actionType: type, sourceRuntimeKind: kind, quotedDomainId, ruleAtomIds: [atomId],
      constraints: { ...body.constraints, opensPaymentReactionBeforeSettlement: true } };
    return { ...request, domainId: 'sc-domain-' + hash(request) };
  }

  function extend(state, base, options, enumerateNative) {
    if (state[probeKey] || state[key] || state.pendingOfficialReactionWindow || !base.legalSpaceComplete
      || !state.pieces.some(piece => routes.some(route => readyAncestralWisdomCardV1(state, piece, route.discountedResourceType)))) return base;
    return { ...base, parameterDomains: [...base.parameterDomains,
      ...probe(state, options, enumerateNative).domains.map(intentDomain)] };
  }

  function prepare(state, domain, parameters, enumerateNative, instantiate) {
    if (pending(state) || state.pendingOfficialReactionWindow) throw Error('ANCESTRAL_WISDOM_PAYMENT_WINDOW_BUSY');
    const { probing, domains } = probe(state, { sideKey: domain.sideKey }, enumerateNative);
    const sourceDomain = domains.find(row => intentDomain(row).domainId === domain.domainId);
    if (!sourceDomain || !isDeepStrictEqual(intentDomain(sourceDomain), domain)) throw Error('ANCESTRAL_WISDOM_PAYMENT_DOMAIN_STALE');
    const prepared = instantiate(probing, sourceDomain, parameters);
    const source = quoteFor(sourceDomain).ancestralWisdom;
    return { canonicalParameters: prepared.canonicalParameters, action: {
      actionType: type, phase: state.phase, sideKey: domain.sideKey, pieceId: domain.pieceId,
      abilityName: routeOf(source).abilityName, ruleAtomIds: [atomId], quoteDomainId: domain.domainId,
      proposalParameters: structuredClone(parameters), canonicalParameters: prepared.canonicalParameters,
      ability: identity(sourceDomain), source,
    } };
  }

  function open(state, action, enumerate, enumerateNative, instantiate) {
    const domain = enumerate(state, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.quoteDomainId);
    if (!domain || !isDeepStrictEqual(action, prepare(state, domain, action.proposalParameters,
      enumerateNative, instantiate).action)) throw Error('ANCESTRAL_WISDOM_PAYMENT_INTENT_STALE');
    const sourceActionHash = hash(action);
    const opened = openOfficialReactionFamilyWindowV1(reactionBundle, state, {
      triggerKind, phase: state.phase, activeSideKey: action.sideKey, activationId: action.source.activationId,
      sourceActionHash, context: { actorPieceId: action.pieceId, targetPieceId: action.pieceId,
        resourceType: routeOf(action.source).discountedResourceType, resourceCost: action.source.costBeforeReaction,
        ancestralWisdomCardInstanceId: action.source.cardInstanceId },
    });
    const next = structuredClone(opened.state);
    setParent(next, { stage: 'reaction', round: Number(state.round), phase: state.phase, pieceId: action.pieceId,
      resumeSideKey: state.activeSideKey, source: action.source, ability: action.ability,
      proposalParameters: action.proposalParameters, canonicalParameters: action.canonicalParameters,
      triggerHash: next.pendingOfficialReactionWindow.triggerHash });
    next.activeSideKey = next.pendingOfficialReactionWindow.prioritySideKeys[0];
    return { ...opened, state: next, action };
  }

  function complete(transition) {
    const parent = pending(transition.state);
    if (!parent || parent.stage !== 'reaction') throw Error('ANCESTRAL_WISDOM_PAYMENT_PARENT_REQUIRED');
    const window = transition.state.pendingOfficialReactionWindow;
    if (window) {
      const state = structuredClone(transition.state);
      state.activeSideKey = window.prioritySideKeys[window.priorityIndex];
      return { ...transition, state };
    }
    const consumed = consumeOfficialReactionFamilyResolutionV1(transition.state, parent.triggerHash);
    const state = structuredClone(consumed.state);
    state.activeSideKey = parent.resumeSideKey;
    const effect = consumed.projection.effects.find(row => row.definitionId === parent.source.definitionId
      && row.sourceInstanceId === parent.source.cardInstanceId && row.targetPieceId === parent.pieceId);
    if (effect) {
      const { parentHash, ...body } = parent;
      setParent(state, { ...body, stage: 'authorized', reactionEffectHash: effect.effectHash });
    } else delete state[key];
    return { ...transition, state };
  }

  function authorizedMenu(state, base) {
    const parent = pending(state);
    if (parent?.stage !== 'authorized') return base;
    return { ...base, candidates: [], parameterDomains: base.parameterDomains.filter(domain =>
      isDeepStrictEqual(identity(domain), parent.ability) && isDeepStrictEqual(quoteFor(domain)?.ancestralWisdom, parent.source)) };
  }

  function assertAuthorizedCast(state, action, enumerate, instantiate) {
    const parent = pending(state);
    if (parent?.stage !== 'authorized') return;
    const domains = enumerate(state, { sideKey: parent.resumeSideKey }).parameterDomains;
    if (!domains.some(domain => {
      const prepared = instantiate(state, domain, parent.proposalParameters);
      return isDeepStrictEqual(prepared.canonicalParameters, parent.canonicalParameters)
        && isDeepStrictEqual(prepared.action, action);
    })) throw Error('ANCESTRAL_WISDOM_PAYMENT_CAST_MISMATCH');
  }

  function finishAuthorizedCast(before, transition) {
    const parent = pending(before);
    if (parent?.stage !== 'authorized') return transition;
    const state = structuredClone(transition.state);
    delete state[key];
    const academy = parent.source.definitionId === OFFICIAL_ADVANCED_TRAINING_ID;
    const event = { type: academy ? 'advanced_training_payment_consumed' : 'ancestral_wisdom_payment_consumed', pieceId: parent.pieceId, ability: parent.ability,
      sourceCardInstanceId: parent.source.cardInstanceId, reactionEffectHash: parent.reactionEffectHash,
      ...(academy ? {cpReduction: parent.source.reduction} : {peReduction: parent.source.reduction}), trainingTruth: false };
    if (state.log?.length) state.log.at(-1).events.push(event);
    return { ...transition, state, events: [...transition.events, event] };
  }

  return Object.freeze({ pending, extend, prepare, open, complete, authorizedMenu, assertAuthorizedCast, finishAuthorizedCast,
    descriptor: Object.freeze({ runtimeId: 'starcraft-tmg-ancestral-wisdom-payment-v1', runtimeVersion: '1.0.0',
      intentKind: kind, actions: [type], ...(hasAcademy ? {discounts:routes.map(({definitionId,routeHash,discountedResourceType})=>({definitionId,routeHash,discountedResourceType}))} : {definitionId:routes[0].definitionId,sourceRouteHash:routes[0].routeHash}), ruleAtomId: atomId,
      trainingTruth: false }) });
}
