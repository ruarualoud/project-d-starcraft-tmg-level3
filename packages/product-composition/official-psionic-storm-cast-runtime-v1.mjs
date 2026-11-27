import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialBattlefieldTokenV1, resolveOfficialTokenMarkerCleanupV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { evaluateOfficialElevatedTokenLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1, resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { assertOfficialUnoccupiedTokenPlacementV1 } from './official-bombard-runtime-v1.mjs';

import { consumeOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';

const runtimeId = 'official-psionic-storm-cast-v1';
const actionType = 'cast_psionic_storm';
const queryKind = 'psionic_storm_cast_preview';
const ruleAtomIds = ['rule-atom:source-bound-psionic-storm-cast-v1'];
const seal = (body, field) => ({ ...body, [field]: hash(body) });

export function cleanupOfficialPsionicStormTokensV1(current) {
  const tokens = (current.board.tokens ?? []).filter(token => token.tokenKind === 'psionic_storm');
  if (!tokens.length) return current;
  const anchors = current.officialPsionicStormCenters ?? [];
  for (const token of tokens) {
    const anchor = anchors.find(row => row.id === token.tokenId);
    if (!anchor) throw Error('PSIONIC_STORM_CLEANUP_TOKEN_BINDING_REQUIRED');
    const { anchorHash, ...body } = anchor;
    if (anchorHash !== hash(body) || anchor.pieceId !== token.createdByPieceId || anchor.round !== token.createdRound
      || anchor.center.xMilliInches / 1000 !== token.coordinate.x || anchor.center.yMilliInches / 1000 !== token.coordinate.y) {
      throw Error('PSIONIC_STORM_CLEANUP_TOKEN_BINDING_INVALID');
    }
  }
  const cleanup = resolveOfficialTokenMarkerCleanupV1({ registry: current.officialBattlefieldTokenMarkerRegistry, tokens });
  if (cleanup.removedTokenIds.length === 0) return current;
  const removed = new Set(cleanup.removedTokenIds);
  const next = structuredClone(current);
  next.board.tokens = next.board.tokens.filter(token => !removed.has(token.tokenId));
  next.officialPsionicStormCenters = next.officialPsionicStormCenters.filter(anchor => !removed.has(anchor.id));
  next.officialPsionicStormCleanupHistory = [...(next.officialPsionicStormCleanupHistory ?? []), {
    round: Number(next.round), removedTokenIds: cleanup.removedTokenIds, cleanupHash: cleanup.cleanupHash, trainingTruth: false,
  }];
  return next;
}

export function createOfficialRegisteredStormCastAdapterV1({ sourceRules, castRuntime, legalSpace, preview, apply, query }) {
  if (!sourceRules?.quoteCast || castRuntime?.descriptor.awaitingCenterMeasurement !== false) {
    throw Error('PSIONIC_STORM_REGISTERED_CAST_REQUIRED');
  }
  const adapterId = castRuntime.descriptor.runtimeId;
  const adapterVersion = castRuntime.descriptor.version;
  const definitionBindings = sourceRules.descriptor.definitions.map(({definitionId, sourceFeatureHash}) => ({
    definitionId, sourceFeatureHash, adapterId, adapterVersion, capability: 'authoritative_action' }));
  return Object.freeze({ descriptor: Object.freeze({ adapterId, adapterVersion, adapterKind: 'exact_runtime',
    coveredDefinitionCount: definitionBindings.length, coveredSourceFeatureHashes: definitionBindings.map(row => row.sourceFeatureHash),
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], trainingTruth: false }),
    definitionBindings, legalSpace, preview, apply, query });
}

export function createOfficialPsionicStormCastRuntimeV1({ sourceRules, phaseEnd }) {
  if (!sourceRules || !phaseEnd || sourceRules.descriptor.profileHash !== phaseEnd.descriptor.rulesProfileHash) {
    throw Error('PSIONIC_STORM_CAST_SOURCE_REQUIRED');
  }
  const marker = sourceRules.descriptor.geometryEvidence?.components.find(row => row.componentKind === 'psionic_storm');
  const cast = sourceRules.descriptor.cast;
  const version = sourceRules.quoteCast ? '1.1.0' : '1.0.0';
  const definitions = sourceRules.descriptor.definitions;
  const geometryReady = Number.isFinite(marker?.diameterMm) && marker.diameterMm > 0;
  const descriptor = Object.freeze(seal({ runtimeId, version, actionType, queryKind, ruleAtomIds,
    definitionIds: definitions.map(row => row.definitionId), rulesProfileHash: sourceRules.descriptor.profileHash,
    centerTokenDiameterMm: geometryReady ? marker.diameterMm : null,
    awaitingCenterMeasurement: !geometryReady, trainingTruth: false }, 'runtimeHash'));

  function paymentOptions(current, sideKey, resourceCost) {
    return enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
      resourceType: cast.resourceType, resourceCost, cardInstances: current.cardResources[sideKey] });
  }

  function legalSpace(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    const parameterDomains = [];
    if (!geometryReady || current.phase !== cast.phase || current.activeSideKey !== sideKey || current.pendingAction
      || current.pendingOfficialReactionWindow || current.pendingOfficialPsionicStormMovementEnd) return { parameterDomains };
    const printedPayments = sourceRules.quoteCast ? null : paymentOptions(current, sideKey, cast.resourceCost);
    if (printedPayments?.length === 0) return { parameterDomains };
    for (const actor of current.pieces.filter(piece => piece.sideKey === sideKey && piece.isOnField && !piece.isDestroyed)) {
      const source = definitions.find(row => row.recordKey === actor.officialUnitRecordKey);
      const selected = current.officialActionRouteCatalogue?.units.find(row => row.pieceId === actor.id);
      if (!source || !selected?.routes.some(row => row.sourceFeatureHash === source.sourceFeatureHash
        && row.activationKind === 'active' && row.phase === cast.phase)
        || Number(actor.structureRules?.specialAbilitiesDisabledThroughRound ?? -Infinity) >= Number(current.round)
        || (current.officialPsionicStormCenters ?? []).some(anchor => anchor.pieceId === actor.id
          && anchor.definitionId === source.definitionId && anchor.round === Number(current.round))) continue;
      try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, sideKey, actor.id, cast.phase); }
      catch (error) {
        if (!/^SELECTED_ABILITY_(TIMING_UNAVAILABLE|ACTIVATION_WINDOW_LOCKED)(:|$)/u.test(error.message)) throw error;
        continue;
      }
      const resourceCost = sourceRules.quoteCast?.(current, actor.id, source.definitionId);
      const payments = printedPayments ?? paymentOptions(current, sideKey, resourceCost.effectiveResourceCost);
      if (!payments.length) continue;
      parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_psionic_storm_cast_v1', actionType, executorId: runtimeId, executorVersion: version,
        sideKey, phase: cast.phase, pieceId: actor.id, definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
        stateHash: hash(current), rulesProfileHash: descriptor.rulesProfileHash,
        parameterSchema: { type: 'object', required: ['coordinate', 'paymentCardInstanceIds'],
          coordinate: { coordinateUnit: 'milli-inch' }, paymentCardInstanceIds: { type: 'array', items: { type: 'string' } } },
        constraints: { payments, ...(resourceCost ? { resourceCost } : {}), maximumDistanceMilliInches: cast.maximumDistanceMilliInches, lineOfSightRequired: true },
        trainingTruth: false }, 'domainId'));
    }
    return { parameterDomains };
  }

  function instantiate(current, domain, parameters) {
    if (!domain || !isDeepStrictEqual(legalSpace(current, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId), domain)) throw Error('PSIONIC_STORM_CAST_DOMAIN_STALE');
    const { coordinate, paymentCardInstanceIds } = parameters || {};
    if (!coordinate || Object.keys(parameters).some(key => !['coordinate', 'paymentCardInstanceIds'].includes(key))
      || Object.keys(coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(coordinate.xMilliInches) || !Number.isSafeInteger(coordinate.yMilliInches)
      || !Array.isArray(paymentCardInstanceIds) || paymentCardInstanceIds.some(id => typeof id !== 'string')) {
      throw Error('PSIONIC_STORM_CAST_SEMANTIC_PARAMETERS_REQUIRED');
    }
    const paymentIds = [...paymentCardInstanceIds].sort();
    if (!domain.constraints.payments.some(ids => isDeepStrictEqual(ids, paymentIds))) throw Error('PSIONIC_STORM_CAST_PAYMENT_INVALID');
    const canonicalParameters = { coordinate: structuredClone(coordinate), paymentCardInstanceIds: paymentIds };
    const actor = current.pieces.find(row => row.id === domain.pieceId);
    const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokenId: 'psionic-storm-' + hash({ domainId: domain.domainId, coordinate }).slice(0, 24), tokenKind: 'psionic_storm',
      coordinate: { x: coordinate.xMilliInches / 1000, y: coordinate.yMilliInches / 1000 }, baseShape: 'round',
      baseDiameterMm: marker.diameterMm, createdByPieceId: actor.id, createdRound: Number(current.round) });
    const footprint = createOfficialDisplacementTokenFootprintV1(token);
    assertOfficialUnoccupiedTokenPlacementV1(current, footprint, 'PSIONIC_STORM_TOKEN');
    const projected = projectOfficialRangedTerrainForLosV1(current).projected;
    Object.assign(projected.board, { widthInches: current.board.widthInches, heightInches: current.board.heightInches });
    projected.officialBattlefieldTokenMarkerRegistry = current.officialBattlefieldTokenMarkerRegistry;
    const measurements = actor.models.filter(model => !model.isDestroyed && model.isOnField !== false).map(model => {
      const base = createOfficialModelBaseFootprintV1({ piece: actor, model, dataBundle: current.officialModelBaseGeometryDataBundle });
      const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: base, right: footprint });
      const sight = evaluateOfficialElevatedTokenLineOfSightV1({ state: projected, attacker: actor,
        attackerModelId: model.id, token, dataBundle: current.officialTerrainLosDataBundle });
      return { modelId: model.id, rangeMilliInches: relation.minimumSeparationMilliInches, visible: sight.visible,
        relationHash: relation.relationHash, sight };
    });
    if (!measurements.some(row => row.rangeMilliInches <= cast.maximumDistanceMilliInches)) throw Error('PSIONIC_STORM_CAST_OUT_OF_RANGE');
    if (!measurements.some(row => row.visible)) throw Error('PSIONIC_STORM_CAST_NO_LINE_OF_SIGHT');
    const anchor = phaseEnd.bindCenter(current, { id: token.tokenId, pieceId: actor.id, definitionId: domain.definitionId, center: coordinate });
    return { canonicalParameters, action: { actionType, executorId: runtimeId, executorVersion: version, ruleAtomIds,
      pieceId: actor.id, sideKey: actor.sideKey, phase: cast.phase, definitionId: domain.definitionId,
      sourceFeatureHash: domain.sourceFeatureHash, domainId: domain.domainId, canonicalParameters, token, anchor, measurements } };
  }

  function apply(current, action, options = {}) {
    const domain = legalSpace(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)) throw Error('PSIONIC_STORM_CAST_STALE');
    if (options.chanceReveals?.length) throw Error('PSIONIC_STORM_CAST_HAS_NO_DICE');
    const next = structuredClone(current);
    const cards = next.cardResources[action.sideKey];
    const quote = domain.constraints.resourceCost;
    const resourceCost = quote?.effectiveResourceCost ?? cast.resourceCost;
    const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
      resourceType: cast.resourceType, resourceCost,
      cardInstances: cards.filter(card => action.canonicalParameters.paymentCardInstanceIds.includes(card.cardInstanceId)) });
    for (const card of cards) if (payment.selectedCardsExhaustOnCommit.includes(card.cardInstanceId)) card.readiness = 'exhausted';
    next.board.tokens = [...(next.board.tokens ?? []), structuredClone(action.token)];
    next.officialPsionicStormCenters = [...(next.officialPsionicStormCenters ?? []), structuredClone(action.anchor)];
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, cast.phase);
    const events = [{ type: 'ability_resource_paid', pieceId: action.pieceId, resourceType: cast.resourceType,
      resourceCost, ...(quote ? { printedResourceCost: quote.printedResourceCost } : {}), exhaustedCardInstanceIds: payment.selectedCardsExhaustOnCommit, paymentResultHash: payment.resultHash },
    { type: 'psionic_storm_token_set', pieceId: action.pieceId, definitionId: action.definitionId,
      tokenId: action.token.tokenId, anchorHash: action.anchor.anchorHash, trainingTruth: false }];
    if (quote) consumeOfficialUnitAbilityModifiersV1(next, quote, { definitionId: action.definitionId, planHash: hash(action) }, events);
    next.log = [...(next.log ?? []), { id: 'log-' + ((next.log ?? []).length + 1), round: Number(next.round), phase: next.phase,
      action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion: version, trainingTruth: false };
  }

  return Object.freeze({ descriptor, legalSpace, instantiate, apply });
}
