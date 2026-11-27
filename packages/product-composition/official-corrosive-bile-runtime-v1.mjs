import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, verifyOfficialBattlefieldTokenV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1, resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { createOfficialPhysicalFootprintV1, createOfficialModelBaseFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1, evaluateOfficialWithinWhollyWithinV1,
  createOfficialBattlefieldTokenPhysicalFootprintV1, createOfficialTerrainCellFootprintsV1,
  doOfficialPhysicalFootprintsOverlapV1, evaluateOfficialBaseMeasurementV1,
  officialTerrainBlocksModelPlacementV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { inspectOfficialCorrosiveBileUpgradesV1 } from './official-corrosive-bile-upgrades-v1.mjs';

const definitionId = 'unit:ravager/corrosive-bile-movement-phase@1';
const runtimeId = 'official-corrosive-bile-runtime-v1';
const sourceText = `For each model in this Unit, set one Corrosive Bile token on the battlefield Within 14" of that model. These tokens are not removed if this Unit is Destroyed. At the End of the Assault Phase, each Unit suffers HITS 5 (1) effect for each of this Unit's Corrosive Bile tokens it is Within 1" of. Then, remove all of this Unit's Corrosive Bile tokens from the battlefield. If multiple effects trigger at the End of the Assault Phase, resolve them in the order specified in Part 8.9.4.`;
const atomIds = ['rule-atom:source-bound-delayed-area-ability-dispatch-v1'];
const seal = (value, field) => ({ ...value, [field]: hash(value) });
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const liveModels = piece => (piece.models || []).filter(model => model.isDestroyed !== true && model.isOnField !== false);
const activePiece = piece => piece.isOnField === true && piece.isDestroyed !== true && liveModels(piece).length > 0;

export function createOfficialCorrosiveBileSourceV1({ catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definition = catalogue.definitions.find(row => row.definitionId === definitionId);
  if (!definition || definition.recordKey !== 'army_units:ravager' || definition.definitionName !== 'Corrosive Bile'
    || definition.activationKind !== 'active' || definition.phase !== 'movement'
    || definition.activationText !== '<Active>\n(1 Biomass)' || definition.sourceText !== sourceText) {
    throw Error('CORROSIVE_BILE_SOURCE_UNSUPPORTED');
  }
  return seal({ schema: 'starcraft_tmg_corrosive_bile_source_v1', definitionId,
    sourceFeatureHash: definition.sourceFeatureHash, sourceCatalogueHash: catalogue.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    recordKey: definition.recordKey, sourceText, activationText: definition.activationText,
    phase: definition.phase, resourceType: 'BM', resourceCost: 1, rangeMilliInches: 14000,
    effectRangeMilliInches: 1000, hits: 5, damagePerHit: 1,
    trigger: 'end_of_assault_phase', survivesSourceDestruction: true,
    effectOrderingRule: '8.9.4', fullDamageConsumerReady: false, trainingTruth: false }, 'bundleHash');
}

export function createOfficialCorrosiveBileRuntimeV1({ context, source, state, damageConsumerReady = false, usePhysicalPlacement = false }) {
  const upgrades = state.officialCorrosiveBileUpgradeSourceBundle;
  const runtimeVersion = usePhysicalPlacement ? '1.2.0' : upgrades ? '1.1.0' : '1.0.0';
  const sourceFields = without(source, 'bundleHash');
  if (source.schema !== 'starcraft_tmg_corrosive_bile_source_v1' || source.bundleHash !== hash(sourceFields)) {
    throw Error('CORROSIVE_BILE_SOURCE_INVALID');
  }
  if (!isDeepStrictEqual(source, state.officialCorrosiveBileSourceBundle)) throw Error('CORROSIVE_BILE_SOURCE_BINDING_INVALID');
  if (!isDeepStrictEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(context), state.officialBattlefieldAssetComponentProfile)) {
    throw Error('CORROSIVE_BILE_COMPONENT_RELEASE_MISMATCH');
  }
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, 'corrosive_bile');
  const descriptor = { adapterId: runtimeId, adapterVersion: runtimeVersion, adapterKind: 'exact_runtime',
    ruleAtomIds: atomIds,
    coveredDefinitionCount: 1 + (upgrades?.routes.length || 0),
    coveredSourceFeatureHashes: [source.sourceFeatureHash, ...(upgrades?.routes || []).map(route => route.sourceFeatureHash)],
    sourceBundleHash: source.bundleHash,
    ...(upgrades ? { upgradeSourceBundleHash: upgrades.bundleHash } : {}),
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], damageConsumerReady,
    ...(usePhysicalPlacement ? { usesBoardTokenShapesAndTerrainCells: true } : {}),
    tokenFootprintEvidenceHash: profile.evidenceHash, rulesAuthority: true, trainingTruth: false };

  function payments(current, sideKey) {
    return enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
      cardInstances: current.cardResources[sideKey], resourceType: source.resourceType, resourceCost: source.resourceCost });
  }
  function enumerate(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    const domains = [];
    for (const actor of current.pieces.filter(piece => piece.sideKey === sideKey
      && piece.officialUnitRecordKey === source.recordKey && activePiece(piece))) {
      try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, sideKey, actor.id, source.phase); }
      catch { continue; }
      if ((current.corrosiveBileUseHistory || []).some(row => row.round === Number(current.round) && row.pieceId === actor.id)) continue;
      if ((actor.selectedUpgradeNames || []).some(name => ['Bloated Bile Ducts', 'Potent Bile'].includes(name)
        && !upgrades?.routes.some(route => route.abilityName === name))) continue;
      const choices = payments(current, sideKey);
      if (!choices.length) continue;
      domains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1', parameterKind: 'official_corrosive_bile_placements_v1',
        actionType: 'set_corrosive_bile', executorId: runtimeId, executorVersion: runtimeVersion,
        sideKey, phase: current.phase, pieceId: actor.id, definitionId, sourceFeatureHash: source.sourceFeatureHash,
        parameterSchema: { type: 'object', required: ['placements', 'paymentCardInstanceIds'],
          placements: { exactModelIds: liveModels(actor).map(model => model.id).sort(), coordinateUnit: 'milli-inch' },
          paymentCardInstanceIds: { choices } },
        constraints: { sourceBundleHash: source.bundleHash, stateHash: hash(current), rangePerModelMilliInches: source.rangeMilliInches,
          tokenProfile: profile, damageConsumerReady }, confirmationClass: 'rules_owned_direct_action',
        trainingTruth: false }, 'domainId'));
    }
    return { candidates: [], parameterDomains: domains };
  }
  function tokenFootprint(token) {
    return createOfficialPhysicalFootprintV1({ objectId: token.tokenId, kind: 'battlefield_token',
      shape: token.baseShape === 'square' ? 'rectangle' : 'round', center: {
        xMilliInches: Math.round(token.coordinate.x * 1000), yMilliInches: Math.round(token.coordinate.y * 1000) },
      widthMilliInches: Math.round((token.baseWidthInches ?? token.baseDiameterInches) * 1000),
      depthMilliInches: Math.round((token.baseDepthInches ?? token.baseDiameterInches) * 1000) });
  }
  function relation(left, right) { return evaluateOfficialPhysicalFootprintRelationV1({ left, right }); }
  function assertUnoccupied(current, footprint, previous, origin) {
    for (const actor of current.pieces.filter(activePiece)) for (const model of liveModels(actor)) {
      if (relation(footprint, createOfficialModelBaseFootprintV1({ piece: actor, model,
        dataBundle: current.officialModelBaseGeometryDataBundle })).overlappingInteriors) throw Error('CORROSIVE_BILE_MODEL_OVERLAP');
    }
    if (usePhysicalPlacement) {
      for (const token of [...(current.board.tokens || []), ...previous]) {
        if (token.isRemoved || token.isDestroyed) continue;
        let blocker;
        if (token.tokenId) {
          verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
          blocker = createOfficialBattlefieldTokenPhysicalFootprintV1(token);
        } else {
          blocker = evaluateOfficialBaseMeasurementV1({ state: current,
            dataBundle: current.officialModelBaseGeometryDataBundle,
            source: { kind: 'model', unitId: origin.unitId, modelId: origin.objectId },
            target: { kind: 'token', id: token.id } }).target.footprint;
        }
        if (doOfficialPhysicalFootprintsOverlapV1(footprint, blocker)) throw Error('CORROSIVE_BILE_TOKEN_OVERLAP');
      }
      for (const terrain of current.board.terrain) {
        if (terrain.isRemoved || terrain.isDestroyed || !officialTerrainBlocksModelPlacementV1(terrain)) continue;
        if (createOfficialTerrainCellFootprintsV1(terrain).some(cell => doOfficialPhysicalFootprintsOverlapV1(footprint, cell))) {
          throw Error('CORROSIVE_BILE_TERRAIN_OVERLAP');
        }
      }
      return;
    }
    for (const token of [...(current.board.tokens || []).filter(row => !row.isRemoved), ...previous]) {
      if (relation(footprint, tokenFootprint(token)).overlappingInteriors) throw Error('CORROSIVE_BILE_TOKEN_OVERLAP');
    }
    for (const terrain of current.board.terrain.filter(row => !row.isRemoved && officialTerrainBlocksModelPlacementV1(row))) {
      const rect = terrain.footprint;
      if (rect?.shape !== 'axis_aligned_rectangle') throw Error('CORROSIVE_BILE_TERRAIN_GEOMETRY_UNSUPPORTED');
      const blocker = createOfficialPhysicalFootprintV1({ objectId: terrain.id, kind: 'terrain', shape: 'rectangle',
        center: { xMilliInches: (rect.minXMilliInches + rect.maxXMilliInches) / 2,
          yMilliInches: (rect.minYMilliInches + rect.maxYMilliInches) / 2 },
        widthMilliInches: rect.maxXMilliInches - rect.minXMilliInches,
        depthMilliInches: rect.maxYMilliInches - rect.minYMilliInches });
      if (relation(footprint, blocker).overlappingInteriors) throw Error('CORROSIVE_BILE_TERRAIN_OVERLAP');
    }
  }
  function instantiate(current, domain, parameters) {
    if (!isDeepStrictEqual(enumerate(current, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId), domain)) {
      throw Error('CORROSIVE_BILE_DOMAIN_STALE');
    }
    if (!parameters || Object.keys(parameters).sort().join(',') !== 'paymentCardInstanceIds,placements'
      || !Array.isArray(parameters.placements) || !Array.isArray(parameters.paymentCardInstanceIds)) throw Error('CORROSIVE_BILE_PARAMETERS_INVALID');
    const actor = current.pieces.find(piece => piece.id === domain.pieceId);
    const models = liveModels(actor);
    const placements = parameters.placements.map(row => {
      if (Object.keys(row).sort().join(',') !== 'modelId,xMilliInches,yMilliInches'
        || typeof row.modelId !== 'string' || !Number.isSafeInteger(row.xMilliInches) || !Number.isSafeInteger(row.yMilliInches)) {
        throw Error('CORROSIVE_BILE_PLACEMENT_INVALID');
      }
      return { modelId: row.modelId, xMilliInches: row.xMilliInches, yMilliInches: row.yMilliInches };
    }).sort((left, right) => left.modelId.localeCompare(right.modelId));
    if (!isDeepStrictEqual(placements.map(row => row.modelId), models.map(model => model.id).sort())) throw Error('CORROSIVE_BILE_MODEL_DENOMINATOR_INVALID');
    if (!domain.parameterSchema.paymentCardInstanceIds.choices.some(choice => isDeepStrictEqual(choice, parameters.paymentCardInstanceIds))) {
      throw Error('CORROSIVE_BILE_PAYMENT_INVALID');
    }
    const tokens = [];
    for (const row of placements) {
      const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
        tokenId: 'corrosive-bile-' + hash({ domainId: domain.domainId, placement: row }).slice(0,24), tokenKind: 'corrosive_bile',
        coordinate: { x: row.xMilliInches / 1000, y: row.yMilliInches / 1000 },
        baseShape: profile.baseShape, baseDiameterMm: profile.baseDiameterMm,
        createdByPieceId: actor.id, createdRound: Number(current.round) });
      const footprint = tokenFootprint(token);
      const origin = createOfficialModelBaseFootprintV1({ piece: actor, model: models.find(model => model.id === row.modelId),
        dataBundle: current.officialModelBaseGeometryDataBundle });
      if (relation(origin, footprint).minimumSeparationMilliInches > source.rangeMilliInches) throw Error('CORROSIVE_BILE_MODEL_RANGE_EXCEEDED');
      assertUnoccupied(current, footprint, tokens, origin);
      tokens.push(token);
    }
    const canonicalParameters = { placements, paymentCardInstanceIds: [...parameters.paymentCardInstanceIds] };
    return { canonicalParameters, action: { actionType: domain.actionType, executorId: runtimeId, executorVersion: runtimeVersion,
      sideKey: actor.sideKey, phase: current.phase, pieceId: actor.id, definitionId,
      domainId: domain.domainId, sourceFeatureHash: source.sourceFeatureHash, tokens, canonicalParameters } };
  }
  function apply(current, action, options = {}) {
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)) throw Error('CORROSIVE_BILE_ACTION_STALE');
    if (options.chanceReveals?.length) throw Error('CORROSIVE_BILE_PLACEMENT_HAS_NO_DICE');
    const next = structuredClone(current);
    const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({ cardDataBundle: next.officialCardBuildPaymentDataBundle,
      resourceType: source.resourceType, resourceCost: source.resourceCost,
      cardInstances: action.canonicalParameters.paymentCardInstanceIds.map(id => next.cardResources[action.sideKey].find(card => card.cardInstanceId === id)) });
    for (const card of next.cardResources[action.sideKey]) if (payment.selectedCardsExhaustOnCommit.includes(card.cardInstanceId)) card.readiness = 'exhausted';
    next.board.tokens = [...(next.board.tokens || []), ...structuredClone(action.tokens)];
    const sourcePlanHash = hash(action);
    const effect = seal({ definitionId, sourceFeatureHash: source.sourceFeatureHash, sourceBundleHash: source.bundleHash,
      ...(upgrades ? { upgradeSourceBundleHash: upgrades.bundleHash } : {}),
      sourcePieceId: action.pieceId, sideKey: action.sideKey, sourcePlanHash, round: Number(next.round),
      tokenIds: action.tokens.map(token => token.tokenId), trigger: source.trigger,
      rangeMilliInches: source.effectRangeMilliInches, hits: source.hits, damagePerHit: source.damagePerHit,
      survivesSourceDestruction: true, consumed: false, trainingTruth: false }, 'effectHash');
    next.pendingCorrosiveBileEffects = [...(next.pendingCorrosiveBileEffects || []), effect];
    next.corrosiveBileUseHistory = [...(next.corrosiveBileUseHistory || []), {
      round: Number(next.round), pieceId: action.pieceId, sourcePlanHash, effectHash: effect.effectHash }];
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, next.phase);
    const events = [{ type: 'corrosive_bile_tokens_set', pieceId: action.pieceId, sourcePlanHash,
      effectHash: effect.effectHash, tokenIds: effect.tokenIds, resourceType: source.resourceType,
      resourceCost: source.resourceCost, paymentResultHash: payment.resultHash, damageResolved: false }];
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: structuredClone(action), events }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion, postRevision: Number(options.postRevision || 0), trainingTruth: false };
  }
  function projection(current) {
    const effects = (current.pendingCorrosiveBileEffects || []).filter(effect => !effect.consumed).map(effect => {
      if (effect.effectHash !== hash(without(effect, 'effectHash')) || effect.sourceBundleHash !== source.bundleHash
        || effect.upgradeSourceBundleHash !== upgrades?.bundleHash
        || effect.sourceFeatureHash !== source.sourceFeatureHash || effect.trigger !== source.trigger
        || effect.hits !== source.hits || effect.rangeMilliInches !== source.effectRangeMilliInches
        || effect.damagePerHit !== source.damagePerHit || !current.corrosiveBileUseHistory?.some(row => row.effectHash === effect.effectHash
          && row.sourcePlanHash === effect.sourcePlanHash && row.pieceId === effect.sourcePieceId)) throw Error('CORROSIVE_BILE_EFFECT_BINDING_INVALID');
      const modifier = upgrades ? inspectOfficialCorrosiveBileUpgradesV1(current, effect.sourcePieceId) : null;
      const tokens = effect.tokenIds.map(tokenId => {
        const token = current.board.tokens.find(row => row.tokenId === tokenId);
        if (!token || token.createdByPieceId !== effect.sourcePieceId) throw Error('CORROSIVE_BILE_TOKEN_MISSING');
        if (token.tokenKind !== 'corrosive_bile' || token.baseDiameterMm !== profile.baseDiameterMm
          || token.createdRound !== effect.round) throw Error('CORROSIVE_BILE_TOKEN_SOURCE_INVALID');
        verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
        return { tokenId, targets: current.pieces.filter(activePiece).map(piece => {
          const measured = evaluateOfficialWithinWhollyWithinV1({ state: current,
            dataBundle: current.officialModelBaseGeometryDataBundle, source: { kind: 'token', id: tokenId },
            targetUnitId: piece.id, rangeMilliInches: modifier?.effectRangeMilliInches ?? effect.rangeMilliInches });
          return { pieceId: piece.id, sideKey: piece.sideKey, unitWithin: measured.unitWithin, measurementHash: measured.resultHash };
        }).filter(target => target.unitWithin) };
      });
      return { effectHash: effect.effectHash, sourcePieceId: effect.sourcePieceId, sideKey: effect.sideKey,
        trigger: effect.trigger, hitsPerToken: effect.hits, damagePerHit: effect.damagePerHit, tokens,
        ...(modifier ? { upgradeModifiers: modifier } : {}) };
    });
    return seal({ schema: 'starcraft_tmg_corrosive_bile_projection_v1', effects,
      evaluationScope: 'conditional_current_geometry', damageResolved: false, damageConsumerReady,
      mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return Object.freeze({ descriptor, definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash,
    adapterId: runtimeId, adapterVersion: runtimeVersion, capability: 'authoritative_action' },
    ...(upgrades?.routes || []).map(route => ({ sourceFeatureHash: route.sourceFeatureHash,
      adapterId: runtimeId, adapterVersion: runtimeVersion, capability: route.runtimeRole }))],
    legalSpace: enumerate, instantiate, preview: (current, request) => instantiate(current, request.domain, request.parameters),
    apply: (current, request) => apply(current, request.action, request.options),
    query: current => projection(current) });
}
