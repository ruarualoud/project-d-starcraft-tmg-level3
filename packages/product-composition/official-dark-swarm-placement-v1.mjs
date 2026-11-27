import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, verifyOfficialBattlefieldTokenV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { evaluateOfficialElevatedTokenLineOfSightV1 }
  from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { assertOfficialUnoccupiedTokenPlacementV1 } from './official-bombard-runtime-v1.mjs';

export const OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID = 'unit:defiler/gestate-dark-swarm-movement-phase@1';
const runtimeId = 'official-dark-swarm-placement-v1';
const version = '1.0.0';
const atomId = 'rule-atom:source-bound-dark-swarm-placement-v1';
const sourceText = 'Set a Dark Swarm token in an unoccupied space Within 4" and Line of Sight of this Unit. The Dark Swarm token has DISPLACEMENT.';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const without = (body, field) => Object.fromEntries(Object.entries(body).filter(([key]) => key !== field));
const liveModels = piece => (piece.models || []).filter(model => model.isDestroyed !== true && model.isOnField !== false);
const active = piece => piece.isOnField === true && piece.isDestroyed !== true && liveModels(piece).length > 0;

export function createOfficialDarkSwarmPlacementSourceV1({ catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definition = catalogue.definitions.find(row => row.definitionId === OFFICIAL_GESTATE_DARK_SWARM_DEFINITION_ID);
  if (!definition || definition.recordKey !== 'army_units:defiler' || definition.definitionName !== 'Gestate Dark Swarm'
    || definition.sourceText !== sourceText || definition.phase !== 'movement'
    || definition.activationKind !== 'active' || definition.activationText !== '<Active>\n(0 Biomass)') {
    throw Error('DARK_SWARM_PLACEMENT_SOURCE_UNSUPPORTED');
  }
  return seal({ schema: 'starcraft_tmg_dark_swarm_placement_source_v1', version,
    definitionId: definition.definitionId, sourceFeatureHash: definition.sourceFeatureHash,
    sourceCatalogueHash: catalogue.catalogueHash, sourceSnapshotHash: catalogue.sourceSnapshotHash,
    normalizedDatasetHash: catalogue.normalizedDatasetHash, recordKey: definition.recordKey,
    sourceText, activationText: definition.activationText, phase: 'movement', resourceType: 'BM', resourceCost: 0,
    tokenKind: 'dark_swarm', rangeMilliInches: 4000, requiresLineOfSight: true,
    unoccupiedSpaceRequired: true, displacement: true, trainingTruth: false }, 'bundleHash');
}

export function inspectOfficialDarkSwarmPlacementBindingsV1(current) {
  const source = current.officialDarkSwarmPlacementSourceBundle;
  if (!source || source.bundleHash !== hash(without(source, 'bundleHash'))) throw Error('DARK_SWARM_SOURCE_BINDING_INVALID');
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(current.officialBattlefieldAssetComponentProfile, source.tokenKind);
  return (current.officialBattlefieldAssetBindings || []).filter(binding => !binding.consumed
    && binding.sourceDefinitionId === source.definitionId).map(binding => {
    const token = current.board.tokens.find(row => row.tokenId === binding.assetId && !row.isRemoved);
    const actor = current.pieces.find(row => row.id === binding.sourcePieceId);
    if (binding.bindingHash !== hash(without(binding, 'bindingHash')) || !token
      || binding.sourceFeatureHash !== source.sourceFeatureHash || binding.assetHash !== token.tokenHash
      || binding.assetKind !== source.tokenKind || binding.assetSchema !== token.schema
      || binding.displacement !== true || actor?.sideKey !== binding.sideKey
      || token.createdByPieceId !== binding.sourcePieceId || token.createdRound !== binding.createdRound
      || token.tokenKind !== source.tokenKind || token.baseDiameterMm !== profile.baseDiameterMm
      || token.stayInPlay !== false || token.cleanupDisposition !== 'remove'
      || !current.gestateDarkSwarmUseHistory?.some(row => row.tokenId === token.tokenId
        && row.pieceId === binding.sourcePieceId && row.round === binding.createdRound
        && row.sourcePlanHash === binding.sourcePlanHash)) throw Error('DARK_SWARM_TOKEN_BINDING_INVALID');
    verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
    return { token, binding, sourceEvidence: { sourceBindingHash: binding.bindingHash } };
  });
}

export function createOfficialDarkSwarmPlacementRuntimeV1({ context, source, state }) {
  if (!isDeepStrictEqual(source, state.officialDarkSwarmPlacementSourceBundle)
    || !isDeepStrictEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(context), state.officialBattlefieldAssetComponentProfile)) {
    throw Error('DARK_SWARM_PLACEMENT_RELEASE_MISMATCH');
  }
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, source.tokenKind);
  const descriptor = { adapterId: runtimeId, adapterVersion: version, adapterKind: 'exact_runtime',
    coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash], sourceBundleHash: source.bundleHash,
    ruleAtomIds: [atomId], supportedOperations: ['legal_space', 'preview', 'apply', 'query'],
    physicalTokenEvidenceHash: profile.evidenceHash, placementConsumerReady: true,
    zeroCostPaymentHostOwned: true, fullMatchCoverage: false, trainingTruth: false };
  function enumerate(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    const parameterDomains = [];
    for (const actor of current.pieces.filter(piece => piece.sideKey === sideKey
      && piece.officialUnitRecordKey === source.recordKey && active(piece)
      && Number(piece.structureRules?.specialAbilitiesDisabledThroughRound ?? -Infinity) < Number(current.round))) {
      try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, sideKey, actor.id, source.phase); }
      catch (error) {
        if (!['SELECTED_ABILITY_TIMING_UNAVAILABLE', 'SELECTED_ABILITY_ACTIVATION_WINDOW_LOCKED']
          .includes(error.message.split(':')[0])) throw error;
        continue;
      }
      if ((current.gestateDarkSwarmUseHistory || []).some(row => row.pieceId === actor.id && row.round === Number(current.round))) continue;
      parameterDomains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        parameterKind: 'official_dark_swarm_coordinate_v1', actionType: 'set_dark_swarm', executorId: runtimeId,
        executorVersion: version, pieceId: actor.id, sideKey, phase: current.phase,
        definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
        parameterSchema: { type: 'object', required: ['coordinate'], coordinate: { coordinateUnit: 'milli-inch' } },
        stateHash: hash(current), sourceBundleHash: source.bundleHash, trainingTruth: false }, 'domainId'));
    }
    return { candidates: [], parameterDomains };
  }
  function instantiate(current, domain, parameters) {
    if (!domain || !isDeepStrictEqual(enumerate(current, { sideKey: domain.sideKey }).parameterDomains
      .find(row => row.domainId === domain.domainId), domain)) throw Error('DARK_SWARM_DOMAIN_STALE');
    if (!parameters || Object.keys(parameters).join(',') !== 'coordinate' || !parameters.coordinate
      || Object.keys(parameters.coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(parameters.coordinate.xMilliInches) || !Number.isSafeInteger(parameters.coordinate.yMilliInches)) {
      throw Error('DARK_SWARM_SEMANTIC_COORDINATE_REQUIRED');
    }
    const actor = current.pieces.find(piece => piece.id === domain.pieceId), canonicalParameters = structuredClone(parameters);
    const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokenId: 'dark-swarm-' + hash({ domainId: domain.domainId, canonicalParameters }).slice(0, 24), tokenKind: source.tokenKind,
      coordinate: { x: parameters.coordinate.xMilliInches / 1000, y: parameters.coordinate.yMilliInches / 1000 },
      baseShape: profile.baseShape, baseDiameterMm: profile.baseDiameterMm, createdByPieceId: actor.id, createdRound: Number(current.round) });
    const footprint = createOfficialDisplacementTokenFootprintV1(token);
    assertOfficialUnoccupiedTokenPlacementV1(current, footprint, 'DARK_SWARM_TOKEN');
    const projected = projectOfficialRangedTerrainForLosV1(current).projected;
    Object.assign(projected.board, { widthInches: current.board.widthInches, heightInches: current.board.heightInches });
    projected.officialBattlefieldTokenMarkerRegistry = current.officialBattlefieldTokenMarkerRegistry;
    const measurements = liveModels(actor).map(model => {
      const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
        right: createOfficialModelBaseFootprintV1({ piece: actor, model, dataBundle: current.officialModelBaseGeometryDataBundle }) });
      const sight = evaluateOfficialElevatedTokenLineOfSightV1({ state: projected, attacker: actor,
        attackerModelId: model.id, token, dataBundle: current.officialTerrainLosDataBundle });
      return { modelId: model.id, distanceMilliInches: relation.minimumSeparationMilliInches,
        relationHash: relation.relationHash, visible: sight.visible, sight };
    });
    if (!measurements.some(row => row.distanceMilliInches <= source.rangeMilliInches)) throw Error('DARK_SWARM_PLACEMENT_RANGE_EXCEEDED');
    if (!measurements.some(row => row.visible)) throw Error('DARK_SWARM_PLACEMENT_LINE_OF_SIGHT_REQUIRED');
    return { canonicalParameters, action: { actionType: domain.actionType, executorId: runtimeId, executorVersion: version,
      pieceId: actor.id, sideKey: actor.sideKey, phase: current.phase, definitionId: source.definitionId,
      sourceFeatureHash: source.sourceFeatureHash, domainId: domain.domainId, canonicalParameters, token, measurements } };
  }
  function apply(current, request) {
    const action = request.action, options = request.options || {};
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)) throw Error('DARK_SWARM_ACTION_STALE');
    if (options.chanceReveals?.length) throw Error('DARK_SWARM_PLACEMENT_HAS_NO_DICE');
    const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
      resourceType: source.resourceType, resourceCost: source.resourceCost, cardInstances: [] });
    const next = structuredClone(current), sourcePlanHash = hash(action);
    const binding = seal({ schema: 'starcraft_tmg_official_battlefield_asset_binding_v1',
      assetId: action.token.tokenId, assetKind: source.tokenKind, assetSchema: action.token.schema, assetHash: action.token.tokenHash,
      sideKey: action.sideKey, sourcePieceId: action.pieceId, sourceInstanceId: action.pieceId,
      sourceDefinitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash, sourcePlanHash,
      effectKind: 'dark_swarm_place', createdRound: Number(next.round), displacement: true,
      lifecycleEvent: null, consumed: false, trainingTruth: false }, 'bindingHash');
    next.board.tokens = [...(next.board.tokens || []), structuredClone(action.token)];
    next.officialBattlefieldAssetBindings = [...(next.officialBattlefieldAssetBindings || []), binding];
    next.gestateDarkSwarmUseHistory = [...(next.gestateDarkSwarmUseHistory || []), {
      round: Number(next.round), pieceId: action.pieceId, tokenId: action.token.tokenId, sourcePlanHash,
      bindingHash: binding.bindingHash, paymentResultHash: payment.resultHash }];
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, source.phase);
    const events = [{ type: 'dark_swarm_token_set', pieceId: action.pieceId, tokenId: action.token.tokenId,
      bindingHash: binding.bindingHash, resourceType: source.resourceType, resourceCost: source.resourceCost,
      paymentResultHash: payment.resultHash, trainingTruth: false }];
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round), phase: next.phase,
      action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion: version, trainingTruth: false };
  }
  return Object.freeze({ descriptor, definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash,
    adapterId: runtimeId, adapterVersion: version, capability: 'authoritative_action' }], legalSpace: enumerate,
    instantiate, preview: (current, request) => instantiate(current, request.domain, request.parameters), apply,
    query: current => seal({ schema: 'starcraft_tmg_dark_swarm_placement_projection_v1', sourceBundleHash: source.bundleHash,
      bindings: structuredClone(inspectOfficialDarkSwarmPlacementBindingsV1(current)), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash') });
}
