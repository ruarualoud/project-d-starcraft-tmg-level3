import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, verifyOfficialBattlefieldTokenV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1, resolveOfficialAbilityResourcePaymentFromCardsV1 }
  from '../rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { createOfficialModelBaseFootprintV1,
  evaluateOfficialPhysicalFootprintRelationV1, officialTerrainBlocksModelPlacementV1,
  createOfficialBattlefieldTokenPhysicalFootprintV1, createOfficialTerrainCellFootprintsV1,
  doOfficialPhysicalFootprintsOverlapV1, evaluateOfficialBaseMeasurementV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 }
  from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { assertOfficialSelectedRosterSpecialAbilityWindowV1, openOfficialSelectedRosterSpecialAbilityWindowV1 }
  from './official-selected-roster-ability-runtime-v1.mjs';

export const OFFICIAL_BOMBARD_DEFINITION_ID = 'unit:bile_launcher/bombard-movement-phase@1';
const runtimeId = 'official-bombard-runtime-v1';
const version = '1.0.0';
const atomId = 'rule-atom:bombard-source-bound-token-placement-v1';
const sourceText = `Set a Bile Bomb token on the battlefield Within 24" of this Unit. When this Unit resolves a Ranged Attack using the Bile Bomb weapon profile this Round, it may choose to ignore the weapon's standard Range characteristic. If it does, it may target an Enemy Unit that is Within 3" of that token (Line of Sight is not required), ignoring the HIDDEN Status. After the attack is fully resolved, remove the Bile Bomb token from the battlefield. When the Bile Bomb token is about to be removed, set a Creep Tumor token in base-to-base contact with it. The Bile Bomb token has DISPLACEMENT.`;
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const liveModels = piece => (piece.models || []).filter(model => model.isDestroyed !== true && model.isOnField !== false);
const active = piece => piece.isOnField === true && piece.isDestroyed !== true && liveModels(piece).length > 0;

export function inspectOfficialBombardBindingsV1(current) {
  const source = current.officialBombardSourceBundle;
  if (!source) throw Error('BOMBARD_SOURCE_BINDING_INVALID');
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(current.officialBattlefieldAssetComponentProfile, source.tokenKind);
  return (current.officialBombardBindings || []).filter(binding => !binding.consumed).map(binding => {
    const { bindingHash, ...body } = binding;
    const token = current.board.tokens.find(row => row.tokenId === binding.tokenId && !row.isRemoved);
    if (bindingHash !== hash(body) || binding.sourceBundleHash !== source.bundleHash
      || binding.sourceFeatureHash !== source.sourceFeatureHash || binding.definitionId !== source.definitionId
      || binding.displacement !== source.displacement || !current.bombardUseHistory?.some(row => row.bindingHash === bindingHash
        && row.pieceId === binding.sourcePieceId && row.sourcePlanHash === binding.sourcePlanHash && row.round === binding.round)
      || !token || token.createdByPieceId !== binding.sourcePieceId || token.createdRound !== binding.round
      || token.tokenKind !== source.tokenKind || token.baseDiameterMm !== profile.baseDiameterMm) throw Error('BOMBARD_TOKEN_BINDING_INVALID');
    verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
    return { ...structuredClone(binding), tokenHash: token.tokenHash, tokenCoordinate: structuredClone(token.coordinate),
      targetingAvailableThisRound: binding.round === Number(current.round) };
  });
}

export function createOfficialBombardSourceV1({ catalogue }) {
  verifyOfficialAbilityEffectIrCatalogueV1(catalogue);
  const definition = catalogue.definitions.find(row => row.definitionId === OFFICIAL_BOMBARD_DEFINITION_ID);
  if (!definition || definition.recordKey !== 'army_units:bile_launcher' || definition.definitionName !== 'Bombard'
    || definition.activationKind !== 'active' || definition.phase !== 'movement'
    || definition.activationText !== '<Active>\n(1 Biomass)' || definition.sourceText !== sourceText) {
    throw Error('BOMBARD_SOURCE_UNSUPPORTED');
  }
  return seal({ schema: 'starcraft_tmg_bombard_source_v1', version, definitionId: OFFICIAL_BOMBARD_DEFINITION_ID,
    sourceFeatureHash: definition.sourceFeatureHash, sourceCatalogueHash: catalogue.catalogueHash,
    sourceSnapshotHash: catalogue.sourceSnapshotHash, normalizedDatasetHash: catalogue.normalizedDatasetHash,
    recordKey: definition.recordKey, sourceText, activationText: definition.activationText,
    phase: definition.phase, resourceType: 'BM', resourceCost: 1, tokenKind: 'bile_bomb',
    rangeMilliInches: 24000, targetRangeMilliInches: 3000, weaponName: 'Bile Bomb', displacement: true,
    trainingTruth: false }, 'bundleHash');
}

export function hasOfficialReleaseBombardPhysicalPlacementV1(state) {
  const binding = state.officialReleaseBombardPhysicalPlacement;
  if (binding === undefined) return false;
  if (!state.officialBombardSourceBundle || binding !== state.officialBombardSourceBundle.bundleHash) {
    throw Error('BOMBARD_PHYSICAL_PLACEMENT_BINDING_INVALID');
  }
  return true;
}

export function assertOfficialUnoccupiedTokenPlacementV1(current, footprint, errorPrefix = 'TOKEN_PLACEMENT', physicalPlacement = false) {
  for (const piece of current.pieces.filter(active)) for (const model of liveModels(piece)) {
    const base = createOfficialModelBaseFootprintV1({ piece, model, dataBundle: current.officialModelBaseGeometryDataBundle });
    if (evaluateOfficialPhysicalFootprintRelationV1({ left: footprint, right: base }).overlappingInteriors) {
      throw Error(errorPrefix + '_OVERLAPS_MODEL');
    }
  }
  if (physicalPlacement) {
    for (const token of current.board.tokens || []) {
      if (token.isRemoved || token.isDestroyed) continue;
      let obstacle;
      if (token.tokenId) {
        verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
        obstacle = createOfficialBattlefieldTokenPhysicalFootprintV1(token);
      } else {
        const ref = { kind: 'token', id: token.id };
        obstacle = evaluateOfficialBaseMeasurementV1({ state: current, dataBundle: current.officialModelBaseGeometryDataBundle,
          source: ref, target: ref }).target.footprint;
      }
      if (doOfficialPhysicalFootprintsOverlapV1(footprint, obstacle)) throw Error(errorPrefix + '_OVERLAPS_TOKEN');
    }
    for (const terrain of current.board.terrain) {
      if (terrain.isRemoved || terrain.isDestroyed || !officialTerrainBlocksModelPlacementV1(terrain)) continue;
      if (createOfficialTerrainCellFootprintsV1(terrain).some(cell => doOfficialPhysicalFootprintsOverlapV1(footprint, cell))) {
        throw Error(errorPrefix + '_OVERLAPS_TERRAIN');
      }
    }
    return;
  }
  for (const token of (current.board.tokens || []).filter(row => !row.isRemoved)) {
    verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
    if (evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
      right: createOfficialDisplacementTokenFootprintV1(token) }).overlappingInteriors) throw Error(errorPrefix + '_OVERLAPS_TOKEN');
  }
  for (const terrain of current.board.terrain.filter(row => !row.isRemoved && officialTerrainBlocksModelPlacementV1(row))) {
    const rect = terrain.footprint;
    if (rect?.shape !== 'axis_aligned_rectangle') throw Error(errorPrefix.replace(/_TOKEN$/u, '') + '_TERRAIN_GEOMETRY_UNSUPPORTED');
    // Use the same integer-grid rectangle as the placement and movement readers.
    // Odd-width or odd-depth map cells have a half-milli-inch arithmetic midpoint.
    const [blocker] = createOfficialTerrainCellFootprintsV1({ id: terrain.id, footprint: rect });
    if (evaluateOfficialPhysicalFootprintRelationV1({ left: footprint, right: blocker }).overlappingInteriors) {
      throw Error(errorPrefix + '_OVERLAPS_TERRAIN');
    }
  }
}

export function assertOfficialBombardTokenPlacementV1(current, footprint) {
  return assertOfficialUnoccupiedTokenPlacementV1(current, footprint, 'BOMBARD_TOKEN', hasOfficialReleaseBombardPhysicalPlacementV1(current));
}


export function createOfficialBombardRuntimeV1({ context, source, state }) {
  if (!isDeepStrictEqual(source, state.officialBombardSourceBundle)) throw Error('BOMBARD_SOURCE_BINDING_INVALID');
  if (!isDeepStrictEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(context), state.officialBattlefieldAssetComponentProfile)) {
    throw Error('BOMBARD_COMPONENT_RELEASE_MISMATCH');
  }
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, source.tokenKind);
  const physical = hasOfficialReleaseBombardPhysicalPlacementV1(state);
  const runtimeVersion = physical ? '1.1.0' : version;
  const descriptor = { adapterId: runtimeId, adapterVersion: runtimeVersion,
    ...(physical ? { usesBoardTokenShapesAndTerrainCells: true } : {}), adapterKind: 'exact_runtime',
    coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash], sourceBundleHash: source.bundleHash,
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], ruleAtomIds: [atomId],
    tokenFootprintEvidenceHash: profile.evidenceHash, placementConsumerReady: true,
    rangedTargetingConsumerReady: false, postAttackReplacementConsumerReady: false,
    movementDisplacementConsumerReady: false, fullDefinitionCoverage: false, rulesAuthority: true, trainingTruth: false };

  function enumerate(current, options = {}) {
    const sideKey = options.sideKey || current.activeSideKey;
    const domains = [];
    for (const piece of current.pieces.filter(row => row.sideKey === sideKey && active(row)
      && row.officialUnitRecordKey === source.recordKey
      && Number(row.structureRules?.specialAbilitiesDisabledThroughRound ?? -Infinity) < Number(current.round))) {
      try { assertOfficialSelectedRosterSpecialAbilityWindowV1(current, sideKey, piece.id, source.phase); }
      catch (error) {
        if (!['SELECTED_ABILITY_TIMING_UNAVAILABLE', 'SELECTED_ABILITY_ACTIVATION_WINDOW_LOCKED']
          .includes(String(error.message).split(':')[0])) throw error;
        continue;
      }
      if ((current.bombardUseHistory || []).some(row => row.round === Number(current.round) && row.pieceId === piece.id)) continue;
      const choices = enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: current.officialCardBuildPaymentDataBundle,
        cardInstances: current.cardResources[sideKey], resourceType: source.resourceType, resourceCost: source.resourceCost });
      if (!choices.length) continue;
      domains.push(seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1', parameterKind: 'official_bombard_placement_v1',
        actionType: 'set_bile_bomb', executorId: runtimeId, executorVersion: runtimeVersion,
        sideKey, phase: current.phase, pieceId: piece.id, definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
        ruleAtomIds: [atomId], parameterSchema: { type: 'object', required: ['coordinate', 'paymentCardInstanceIds'],
          coordinate: { coordinateUnit: 'milli-inch', required: ['xMilliInches', 'yMilliInches'] },
          paymentCardInstanceIds: { choices } },
        constraints: { sourceBundleHash: source.bundleHash, stateHash: hash(current), rangeMilliInches: source.rangeMilliInches,
          measurement: 'closest_base_edge', physicalTokenProfile: profile, continuousCoordinates: true },
        confirmationClass: 'rules_owned_direct_action', trainingTruth: false }, 'domainId'));
    }
    return { candidates: [], parameterDomains: domains };
  }


  function instantiate(current, domain, parameters) {
    if (!isDeepStrictEqual(enumerate(current, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId), domain)) {
      throw Error('BOMBARD_DOMAIN_STALE');
    }
    if (!parameters || Object.keys(parameters).sort().join(',') !== 'coordinate,paymentCardInstanceIds'
      || !parameters.coordinate || Object.keys(parameters.coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(parameters.coordinate.xMilliInches) || !Number.isSafeInteger(parameters.coordinate.yMilliInches)
      || !Array.isArray(parameters.paymentCardInstanceIds)) throw Error('BOMBARD_SEMANTIC_PARAMETERS_REQUIRED');
    if (!domain.parameterSchema.paymentCardInstanceIds.choices.some(choice => isDeepStrictEqual(choice, parameters.paymentCardInstanceIds))) {
      throw Error('BOMBARD_PAYMENT_INVALID');
    }
    const actor = current.pieces.find(piece => piece.id === domain.pieceId);
    const canonicalParameters = structuredClone(parameters);
    const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokenId: 'bile-bomb-' + hash({ domainId: domain.domainId, canonicalParameters }).slice(0, 24), tokenKind: source.tokenKind,
      coordinate: { x: parameters.coordinate.xMilliInches / 1000, y: parameters.coordinate.yMilliInches / 1000 },
      baseShape: profile.baseShape, baseDiameterMm: profile.baseDiameterMm,
      createdByPieceId: actor.id, createdRound: Number(current.round) });
    const footprint = createOfficialDisplacementTokenFootprintV1(token);
    const gaps = liveModels(actor).map(model => evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
      right: createOfficialModelBaseFootprintV1({ piece: actor, model, dataBundle: current.officialModelBaseGeometryDataBundle }) })
      .minimumSeparationMilliInches);
    if (Math.min(...gaps) > source.rangeMilliInches) throw Error('BOMBARD_PLACEMENT_RANGE_EXCEEDED');
    assertOfficialBombardTokenPlacementV1(current, footprint);
    return { canonicalParameters, action: { actionType: domain.actionType, executorId: runtimeId, executorVersion: runtimeVersion,
      sideKey: actor.sideKey, phase: current.phase, pieceId: actor.id, definitionId: source.definitionId,
      domainId: domain.domainId, sourceFeatureHash: source.sourceFeatureHash, token, canonicalParameters } };
  }

  function apply(current, request) {
    const action = request.action, options = request.options || {};
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)) throw Error('BOMBARD_ACTION_STALE');
    if (options.chanceReveals?.length) throw Error('BOMBARD_PLACEMENT_HAS_NO_DICE');
    const next = structuredClone(current);
    const payment = resolveOfficialAbilityResourcePaymentFromCardsV1({ cardDataBundle: next.officialCardBuildPaymentDataBundle,
      resourceType: source.resourceType, resourceCost: source.resourceCost,
      cardInstances: action.canonicalParameters.paymentCardInstanceIds.map(id => next.cardResources[action.sideKey].find(card => card.cardInstanceId === id)) });
    for (const card of next.cardResources[action.sideKey]) if (payment.selectedCardsExhaustOnCommit.includes(card.cardInstanceId)) card.readiness = 'exhausted';
    next.board.tokens = [...(next.board.tokens || []), structuredClone(action.token)];
    const sourcePlanHash = hash(action);
    const binding = seal({ definitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
      sourceBundleHash: source.bundleHash, sourcePieceId: action.pieceId, sideKey: action.sideKey, sourcePlanHash,
      round: Number(next.round), tokenId: action.token.tokenId, displacement: source.displacement,
      consumed: false, trainingTruth: false }, 'bindingHash');
    next.officialBombardBindings = [...(next.officialBombardBindings || []), binding];
    next.bombardUseHistory = [...(next.bombardUseHistory || []), { round: Number(next.round), pieceId: action.pieceId,
      sourcePlanHash, bindingHash: binding.bindingHash }];
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, action.sideKey, action.pieceId, source.phase);
    const events = [{ type: 'bile_bomb_token_set', pieceId: action.pieceId, tokenId: action.token.tokenId,
      bindingHash: binding.bindingHash, resourceType: source.resourceType, resourceCost: source.resourceCost,
      paymentResultHash: payment.resultHash, trainingTruth: false }];
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round), phase: next.phase,
      action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion,
      postRevision: Number(options.postRevision || 0), trainingTruth: false };
  }

  function query(current) {
    const bindings = inspectOfficialBombardBindingsV1(current);
    return seal({ schema: 'starcraft_tmg_bombard_projection_v1', sourceBundleHash: source.bundleHash, bindings,
      consumerCoverage: descriptor, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return Object.freeze({ descriptor, definitionBindings: [{ sourceFeatureHash: source.sourceFeatureHash, adapterId: runtimeId,
    adapterVersion: runtimeVersion, capability: 'authoritative_action' }], legalSpace: enumerate, instantiate,
    preview: (current, request) => instantiate(current, request.domain, request.parameters), apply, query });
}
