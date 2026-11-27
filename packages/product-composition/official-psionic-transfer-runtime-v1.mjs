import { quoteOfficialUnitAbilityModifiersV1, consumeOfficialUnitAbilityModifiersV1 } from './official-unit-ability-payment-modifiers-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, verifyOfficialBattlefieldTokenV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1, resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1, createOfficialModelBaseFootprintV1,
  createOfficialPhysicalFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { prepareOfficialShadeTokenPlacementV1, prepareOfficialTokenLeadingOriginPlacementV1 }
  from './official-battlefield-asset-family-adapter-v1.mjs';
import { getOfficialDisplacementMovementGeometryV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { projectOfficialDestroyedSourceTokenIdsV1 }
  from '../rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { createOfficialPsionicSourceLifecyclePolicyV1 } from '../source-data/official-psionic-source-lifecycle-policy-v1.mjs';

const runtimeId = 'official-psionic-transfer-runtime-v1';
const version = '1.0.0';
const recordKey = 'army_units:nerazim_watchers__adept_';
const transferId = 'unit:nerazim_watchers__adept_/psionic-transfer-movement-phase@1';
const farsightId = 'unit:nerazim_watchers__adept_/nerazim-farsight-any-phase@1';
const transferText = 'Set a Shade token Wholly Within 12" of any model in this Unit. At the End of the Round, the controlling player may set all models of this Unit in Coherency, treating the Shade token as the Leading Model. The Shade token has DISPLACEMENT.';
const farsightText = `While Enemy Units are Within 6" of this Unit's Shade token, they lose HIDDEN Status.`;
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true
  && piece.models.some(model => model.isOnField !== false && model.isDestroyed !== true);
const hidden = status => String(typeof status === 'string' ? status
  : status.statusName || status.name || status.status || '').trim().toLowerCase() === 'hidden';

export function createOfficialPsionicTransferSourceV1({ catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definitions = [transferId, farsightId].map(id => catalogue.definitions.find(row => row.definitionId === id));
  const [transfer, farsight] = definitions;
  if (!transfer || !farsight || definitions.some(row => row.recordKey !== recordKey)
    || transfer.sourceText !== transferText || transfer.phase !== 'movement' || transfer.activationKind !== 'active'
    || transfer.activationText !== '<Active>\n(1 Psionic Energy)'
    || farsight.sourceText !== farsightText || farsight.phase !== 'any' || farsight.activationKind !== 'passive') {
    throw Error('PSIONIC_TRANSFER_SOURCE_UNSUPPORTED');
  }
  return seal({ schema: 'starcraft_tmg_psionic_transfer_source_v1', version,
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, recordKey,
    definitions: definitions.map(row => ({ definitionId: row.definitionId, sourceFeatureHash: row.sourceFeatureHash,
      sourceText: row.sourceText, runtimeRole: row.runtimeRole })),
    resourceType: 'PE', resourceCost: 1, tokenKind: 'shade', whollyWithinMilliInches: 12000,
    farsightRangeMilliInches: 6000, displacement: true, roundEndChoice: true,
    displacementConsumerReady: false, roundEndConsumerReady: false, trainingTruth: false }, 'bundleHash');
}

export function createOfficialTokenLeadingTransferSourceV2({ catalogue, includePsionicTransfer = false,
  includeAdept = false, includeDeepTunnel = true }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const watchers = includePsionicTransfer ? createOfficialPsionicTransferSourceV1({ catalogue }) : null;
  const definitions = [...(watchers?.definitions || [])];
  const routes = watchers ? [{ recordKey, definitionId: transferId, tokenKind: 'shade',
    actionType: 'set_psionic_transfer_shade', resourceType: 'PE', resourceCost: 1,
    farsightDefinitionId: farsightId, farsightRangeMilliInches: 6000 }] : [];
  if (includeAdept) {
    const id = 'unit:adept/psionic-transfer-movement-phase@1';
    const row = catalogue.definitions.find(entry => entry.definitionId === id);
    if (!row || row.recordKey !== 'army_units:adept' || row.sourceText !== transferText.replace('in Coherency', 'In Coherency')
      || row.phase !== 'movement' || row.activationKind !== 'active' || row.activationText !== '<Active>\n(1 Psionic Energy)') {
      throw Error('ADEPT_PSIONIC_TRANSFER_SOURCE_UNSUPPORTED');
    }
    definitions.push({ definitionId: id, sourceFeatureHash: row.sourceFeatureHash, sourceText: row.sourceText,
      sourceKind: row.sourceKind, runtimeRole: row.runtimeRole });
    routes.push({ recordKey: row.recordKey, definitionId: id, tokenKind: 'shade', actionType: 'set_psionic_transfer_shade',
      resourceType: 'PE', resourceCost: 1 });
  }
  if (includeDeepTunnel) {
    const id = 'unit:ravager/deep-tunnel-movement-phase@1';
    const row = catalogue.definitions.find(entry => entry.definitionId === id);
    const text = 'Set a Ravager Burrow token Wholly Within 12" of any model in this Unit. At the End of the Round, the controlling player may set all models of this Unit in Coherency, treating the Ravager Burrow token as the Leading Model. The Ravager Burrow token has DISPLACEMENT.';
    if (!row || row.recordKey !== 'army_units:ravager' || row.sourceText !== text
      || row.phase !== 'movement' || row.activationKind !== 'active'
      || row.activationText !== '<Active>\n(1 Biomass)') throw Error('DEEP_TUNNEL_SOURCE_UNSUPPORTED');
    definitions.push({ definitionId: id, sourceFeatureHash: row.sourceFeatureHash, sourceText: row.sourceText, runtimeRole: row.runtimeRole });
    routes.push({ recordKey: row.recordKey, definitionId: id, tokenKind: 'ravager_burrow',
      actionType: 'set_deep_tunnel_burrow', resourceType: 'BM', resourceCost: 1 });
  }
  if (!routes.length) throw Error('TOKEN_LEADING_TRANSFER_SOURCE_REQUIRED');
  return seal({ schema: 'starcraft_tmg_token_leading_transfer_source_v2', version: includeAdept ? '2.1.0' : '2.0.0',
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, definitions, routes,
    whollyWithinMilliInches: 12000, displacement: true, roundEndChoice: true,
    trainingTruth: false }, 'bundleHash');
}

export function createOfficialPsionicTransferRuntimeV1({ context, source, state, roundEndConsumerReady = false,
  displacementConsumerReady = false, closeRanksConsumerReady = false }) {
  const routed = source?.schema === 'starcraft_tmg_token_leading_transfer_source_v2';
  if (!routed && source?.schema !== 'starcraft_tmg_psionic_transfer_source_v1' || source.bundleHash !== hash(without(source, 'bundleHash'))
    || !isDeepStrictEqual(source, state.officialPsionicTransferSourceBundle)) throw Error('PSIONIC_TRANSFER_SOURCE_BINDING_INVALID');
  if (!isDeepStrictEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(context), state.officialBattlefieldAssetComponentProfile)) {
    throw Error('PSIONIC_TRANSFER_PHYSICAL_RELEASE_MISMATCH');
  }
  const routes = routed ? source.routes : [{ recordKey, definitionId: transferId, tokenKind: source.tokenKind,
    actionType: 'set_psionic_transfer_shade', resourceType: source.resourceType, resourceCost: source.resourceCost,
    farsightDefinitionId: farsightId, farsightRangeMilliInches: source.farsightRangeMilliInches }];
  if (routed) for (const route of routes) {
    getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, route.tokenKind);
  }
  const farsight = source.definitions.find(row => row.definitionId === farsightId);
  const sourceLifecycle = state.officialPsionicSourceLifecyclePolicy
    ? createOfficialPsionicSourceLifecyclePolicyV1({ context, includeDeepTunnel: routes.some(route => route.tokenKind === 'ravager_burrow') }) : null;
  if (sourceLifecycle && !isDeepStrictEqual(sourceLifecycle, state.officialPsionicSourceLifecyclePolicy)) {
    throw Error('PSIONIC_SOURCE_LIFECYCLE_POLICY_MISMATCH');
  }
  const runtimeVersion = routed ? source.version : sourceLifecycle ? '1.1.0' : version;
  const descriptor = { adapterId: runtimeId, adapterVersion: runtimeVersion, adapterKind: 'exact_runtime',
    ruleAtomIds: ['rule-atom:source-bound-shade-producer-and-farsight-v1', ...(sourceLifecycle?.ruleAtomIds || [])],
    coveredDefinitionCount: source.definitions.length, coveredSourceFeatureHashes: source.definitions.map(row => row.sourceFeatureHash).sort(),
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], sourceBundleHash: source.bundleHash,
    displacementConsumerReady, roundEndConsumerReady,
    ...(sourceLifecycle ? { sourceLifecyclePolicyHash: sourceLifecycle.policyHash } : {}),
    rulesAuthority: true, trainingTruth: false };
  function resourceCost(current, route, definition, pieceId) {
    return quoteOfficialUnitAbilityModifiersV1(current, pieceId, definition.sourceKind, {
      resourceType: route.resourceType, printedResourceCost: route.resourceCost,
      resourceCostReduction: 0, effectiveResourceCost: route.resourceCost,
    });
  }

  function enumerate(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    const parameterDomains = [];
    for (const actor of current.pieces.filter(piece => piece.sideKey === sideKey
      && routes.some(route => route.recordKey === piece.officialUnitRecordKey) && active(piece))) {
      const route = routes.find(row => row.recordKey === actor.officialUnitRecordKey);
      const transfer = source.definitions.find(row => row.definitionId === route.definitionId);
      const cost = resourceCost(current, route, transfer, actor.id);
      const payment = enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
        cardInstances: current.cardResources[sideKey], resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost });
      if (Number(actor.structureRules?.specialAbilitiesDisabledThroughRound ?? -1) >= Number(current.round)) continue;
      try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, sideKey, actor.id, 'movement'); }
      catch { continue; }
      if (!payment.length || (current.psionicTransferUseHistory || []).some(row => row.pieceId === actor.id
        && row.round === Number(current.round))) continue;
      parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_psionic_transfer_token_placement_v1', actionType: route.actionType,
        executorId: runtimeId, executorVersion: runtimeVersion, sideKey, phase: current.phase, pieceId: actor.id,
        definitionId: route.definitionId, sourceFeatureHash: transfer.sourceFeatureHash,
        parameterSchema: { type: 'object', required: ['coordinate', 'paymentCardInstanceIds'],
          coordinate: { coordinateUnit: 'milli-inch' }, paymentCardInstanceIds: { choices: payment } },
        constraints: { stateHash: hash(current), sourceBundleHash: source.bundleHash,
          ...((cost.khalasGift || cost.ancestralWisdom) ? { resourceCostsByChoice: { default: cost } } : {}),
          tokenProfile: state.officialBattlefieldAssetComponentProfile.componentEvidence[route.tokenKind],
          whollyWithinMilliInches: source.whollyWithinMilliInches,
          displacementConsumerReady, roundEndConsumerReady },
        confirmationClass: 'rules_owned_direct_action', trainingTruth: false }, 'domainId'));
    }
    return { candidates: [], parameterDomains };
  }
  function instantiate(current, domain, parameters) {
    if (!isDeepStrictEqual(enumerate(current, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId), domain)) {
      throw Error('PSIONIC_TRANSFER_DOMAIN_STALE');
    }
    if (!parameters || Object.keys(parameters).sort().join(',') !== 'coordinate,paymentCardInstanceIds'
      || Object.keys(parameters.coordinate || {}).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(parameters.coordinate.xMilliInches) || !Number.isSafeInteger(parameters.coordinate.yMilliInches)
      || !domain.parameterSchema.paymentCardInstanceIds.choices.some(choice => isDeepStrictEqual(choice, parameters.paymentCardInstanceIds))) {
      throw Error('PSIONIC_TRANSFER_PARAMETERS_INVALID');
    }
    const route = routes.find(row => row.definitionId === domain.definitionId);
    const transfer = source.definitions.find(row => row.definitionId === route.definitionId);
    const prepared = routed ? prepareOfficialTokenLeadingOriginPlacementV1(current, domain.pieceId, parameters.coordinate, route.tokenKind, true)
      : prepareOfficialShadeTokenPlacementV1(current, domain.pieceId, parameters.coordinate);
    const canonicalParameters = structuredClone(parameters);
    const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokenId: (route.tokenKind === 'shade' ? 'psionic-shade-' : 'ravager-burrow-') + hash({ domainId: domain.domainId, canonicalParameters }).slice(0,24),
      tokenKind: route.tokenKind, coordinate: prepared.coordinate, baseShape: prepared.profile.baseShape,
      baseDiameterMm: prepared.profile.baseDiameterMm, createdByPieceId: domain.pieceId, createdRound: Number(current.round) });
    return { canonicalParameters, action: { actionType: domain.actionType, executorId: runtimeId, executorVersion: runtimeVersion,
      sideKey: domain.sideKey, phase: current.phase, pieceId: domain.pieceId, definitionId: route.definitionId,
      sourceFeatureHash: transfer.sourceFeatureHash, domainId: domain.domainId, token, canonicalParameters } };
  }
  function apply(current, action, options = {}) {
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)
      || options.chanceReveals?.length) throw Error('PSIONIC_TRANSFER_ACTION_STALE');
    const next = structuredClone(current);
    const route = routes.find(row => row.definitionId === action.definitionId);
    const transfer = source.definitions.find(row => row.definitionId === route.definitionId);
    const cost = resourceCost(next, route, transfer, action.pieceId);
    const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({ cardDataBundle: next.officialCardBuildPaymentDataBundle,
      resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost,
      cardInstances: action.canonicalParameters.paymentCardInstanceIds.map(id => next.cardResources[action.sideKey].find(card => card.cardInstanceId === id)) });
    for (const card of next.cardResources[action.sideKey]) if (payment.selectedCardsExhaustOnCommit.includes(card.cardInstanceId)) card.readiness = 'exhausted';
    next.board.tokens = [...(next.board.tokens || []), structuredClone(action.token)];
    const effect = seal({ sourcePieceId: action.pieceId, sideKey: action.sideKey, round: Number(next.round),
      tokenId: action.token.tokenId, sourceBundleHash: source.bundleHash, sourcePlanHash: hash(action),
      definitionId: route.definitionId, sourceFeatureHash: transfer.sourceFeatureHash,
      displacement: true, roundEndChoice: true, consumed: false, trainingTruth: false }, 'effectHash');
    next.pendingPsionicTransferEffects = [...(next.pendingPsionicTransferEffects || []), effect];
    next.psionicTransferUseHistory = [...(next.psionicTransferUseHistory || []), {
      round: Number(next.round), pieceId: action.pieceId, sourcePlanHash: effect.sourcePlanHash, effectHash: effect.effectHash }];
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, next.phase);
    const events = [{ type: route.tokenKind === 'shade' ? 'psionic_transfer_shade_set' : 'deep_tunnel_burrow_set',
      pieceId: action.pieceId, tokenId: action.token.tokenId,
      effectHash: effect.effectHash, resourceType: route.resourceType, resourceCost: cost.effectiveResourceCost, paymentResultHash: payment.resultHash,
      displacementConsumerReady, roundEndConsumerReady }];
    consumeOfficialUnitAbilityModifiersV1(next, cost, { definitionId: route.definitionId, planHash: hash(action) }, events);
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round), phase: next.phase,
      action: structuredClone(action), events }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion, trainingTruth: false };
  }
  function effects(current) {
    if (!isDeepStrictEqual(current.officialPsionicSourceLifecyclePolicy ?? null, sourceLifecycle)) {
      throw Error('PSIONIC_SOURCE_LIFECYCLE_POLICY_MISMATCH');
    }
    return (current.pendingPsionicTransferEffects || []).filter(row => !row.consumed).map(effect => {
      const route = routes.find(row => row.definitionId === effect.definitionId);
      const transfer = source.definitions.find(row => row.definitionId === effect.definitionId);
      const token = current.board.tokens.find(row => row.tokenId === effect.tokenId);
      const actor = current.pieces.find(piece => piece.id === effect.sourcePieceId);
      if (effect.effectHash !== hash(without(effect, 'effectHash')) || effect.sourceBundleHash !== source.bundleHash
        || !route || !transfer || effect.sourceFeatureHash !== transfer.sourceFeatureHash
        || effect.displacement !== true || effect.roundEndChoice !== true
        || actor?.officialUnitRecordKey !== route.recordKey || actor.sideKey !== effect.sideKey
        || !current.psionicTransferUseHistory?.some(row => row.pieceId === effect.sourcePieceId
          && row.round === effect.round && row.effectHash === effect.effectHash && row.sourcePlanHash === effect.sourcePlanHash)
        || !token || token.createdByPieceId !== effect.sourcePieceId || token.tokenKind !== route.tokenKind
        || token.createdRound !== effect.round
        || token.baseDiameterMm !== state.officialBattlefieldAssetComponentProfile.componentEvidence[route.tokenKind]?.baseDiameterMm) {
        throw Error('PSIONIC_TRANSFER_EFFECT_BINDING_INVALID');
      }
      verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
      return { effect, token };
    });
  }
  function projection(current) {
    return effects(current).map(({ effect, token }) => {
      const route = routes.find(row => row.definitionId === effect.definitionId);
      const actor = current.pieces.find(piece => piece.id === effect.sourcePieceId);
      const available = active(actor) && Number(actor.structureRules?.specialAbilitiesDisabledThroughRound ?? -1) < Number(current.round);
      const targets = current.pieces.filter(piece => route.farsightDefinitionId && active(piece) && piece.sideKey !== effect.sideKey).map(piece => {
        const measured = evaluateOfficialWithinWhollyWithinV1({ state: current,
          dataBundle: current.officialModelBaseGeometryDataBundle, source: { kind: 'token', id: token.tokenId },
          targetUnitId: piece.id, rangeMilliInches: route.farsightRangeMilliInches });
        return { pieceId: piece.id, unitWithin: measured.unitWithin, applies: available && measured.unitWithin,
          hidden: (piece.statuses || []).some(hidden), measurementHash: measured.resultHash };
      });
      return { tokenId: token.tokenId, ...(routed ? { tokenKind: token.tokenKind } : {}), sourcePieceId: effect.sourcePieceId, sourceActive: available,
        effectHash: effect.effectHash, targets };
    });
  }
  function removeDestroyedSourceTokens(result) {
    if (!sourceLifecycle) return result;
    const rows = effects(result.state);
    const sourceIds = [...new Set(rows.map(row => row.effect.sourcePieceId))].filter(id => {
      const actor = result.state.pieces.find(piece => piece.id === id);
      return actor.isDestroyed === true && actor.currentModels === 0;
    });
    if (!sourceIds.length) return result;
    const next = structuredClone(result.state);
    const events = [...result.events];
    for (const sourcePieceId of sourceIds) {
      const sourceRows = rows.filter(row => row.effect.sourcePieceId === sourcePieceId);
      const selected = projectOfficialDestroyedSourceTokenIdsV1(sourceRows.map(row => row.token), sourcePieceId, 'tokenId');
      const removed = new Set(selected.removeBoardTokenIds);
      if (!removed.size) continue;
      next.board.tokens = next.board.tokens.filter(token => !removed.has(token.tokenId));
      next.pendingPsionicTransferEffects = next.pendingPsionicTransferEffects.filter(effect => !removed.has(effect.tokenId));
      const entry = { round: Number(next.round), sourcePieceId, tokenIds: [...removed].sort(),
        effectHashes: sourceRows.filter(row => removed.has(row.token.tokenId)).map(row => row.effect.effectHash).sort(),
        policyHash: sourceLifecycle.policyHash, trainingTruth: false };
      next.psionicTransferDestructionHistory = [...(next.psionicTransferDestructionHistory || []), entry];
      events.push({ type: 'psionic_transfer_source_destroyed_tokens_removed', ...entry });
    }
    if (next.log?.length) next.log.at(-1).events = structuredClone(events);
    return { ...result, state: next, events };
  }
  function afterTransition(result) {
    const settled = removeDestroyedSourceTokens(result);
    const projected = projection(settled.state);
    const removals = projected.flatMap(row => row.targets.filter(target => target.applies && target.hidden)
      .map(target => ({ sourcePieceId: row.sourcePieceId, tokenId: row.tokenId, ...target })));
    if (!removals.length) return settled;
    const next = structuredClone(settled.state);
    const events = [...settled.events];
    for (const row of removals) {
      const target = next.pieces.find(piece => piece.id === row.pieceId);
      const removed = target.statuses.filter(hidden);
      if (!removed.length) continue;
      target.statuses = target.statuses.filter(status => !hidden(status));
      const hashes = new Set(removed.map(status => status.statusEffectHash).filter(Boolean));
      next.board.effectMarkers = (next.board.effectMarkers || []).filter(marker => !hashes.has(marker.statusEffectHash));
      events.push({ type: 'nerazim_farsight_hidden_lost', sourceDefinitionId: farsightId,
        sourcePieceId: row.sourcePieceId, targetPieceId: target.id, tokenId: row.tokenId,
        sourceFeatureHash: farsight.sourceFeatureHash, removedStatusEffectHashes: [...hashes], measurementHash: row.measurementHash });
    }
    if (next.log?.length) next.log.at(-1).events = structuredClone(events);
    return { ...settled, state: next, events };
  }
  function assertEndpoint(current, action) {
    const plan = closeRanksConsumerReady ? getOfficialDisplacementMovementGeometryV1(action) : action.spatialPlan;
    if (!plan) return;
    const actor = current.pieces.find(piece => piece.id === action.pieceId);
    const tracked = new Set(effects(current).map(row => row.token.tokenId));
    for (const placed of plan.finalModelPositions) {
      const model = actor.models.find(row => row.id === placed.modelId);
      const modelFootprint = createOfficialModelBaseFootprintV1({ piece: actor, model,
        dataBundle: current.officialModelBaseGeometryDataBundle, position: placed });
      for (const token of current.board.tokens.filter(row => !row.isRemoved)) {
        verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
        const tokenFootprint = createOfficialPhysicalFootprintV1({ objectId: token.tokenId, kind: 'battlefield_token',
          shape: token.baseShape === 'square' ? 'rectangle' : 'round',
          center: { xMilliInches: Math.round(token.coordinate.x * 1000), yMilliInches: Math.round(token.coordinate.y * 1000) },
          widthMilliInches: Math.round((token.baseWidthInches ?? token.baseDiameterInches) * 1000),
          depthMilliInches: Math.round((token.baseDepthInches ?? token.baseDiameterInches) * 1000) });
        if (!evaluateOfficialPhysicalFootprintRelationV1({ left: modelFootprint, right: tokenFootprint }).overlappingInteriors) continue;
        if (placed.modelId === plan.leadingModelId && tracked.has(token.tokenId)) {
          throw Error('PSIONIC_TRANSFER_DISPLACEMENT_CONSUMER_REQUIRED');
        }
        throw Error('TOKEN_MODEL_END_OVERLAP_PROHIBITED');
      }
    }
  }
  return Object.freeze({ descriptor,
    definitionBindings: source.definitions.map(row => ({ sourceFeatureHash: row.sourceFeatureHash, adapterId: runtimeId,
      adapterVersion: runtimeVersion, capability: routes.some(route => route.definitionId === row.definitionId) ? 'authoritative_action' : row.runtimeRole })),
    legalSpace: enumerate, instantiate, preview: (current, request) => instantiate(current, request.domain, request.parameters),
    apply: (current, request) => apply(current, request.action, request.options),
    query: current => seal({ schema: 'starcraft_tmg_psionic_transfer_projection_v1', result: projection(current),
      displacementConsumerReady, roundEndConsumerReady, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash'),
    validatedEffects: effects, afterTransition, assertEndpoint });
}
