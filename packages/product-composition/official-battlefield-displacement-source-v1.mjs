import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialBattlefieldTokenV1 } from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1, getOfficialDisplacementMovementGeometryV1 }
  from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1 } from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { verifyOfficialBattlefieldAssetFamilySourceBundleV1 } from './official-battlefield-asset-family-adapter-v1.mjs';
import { OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID, verifyOfficialUnitLifecycleFamilySourceBundleV1 }
  from './official-unit-lifecycle-family-adapter-v1.mjs';
import { inspectOfficialBombardBindingsV1 } from './official-bombard-runtime-v1.mjs';
import { inspectOfficialDarkSwarmPlacementBindingsV1 } from './official-dark-swarm-placement-v1.mjs';
import { resolveOfficialCurrentProductSideCapabilityV1 } from './official-current-product-state-facts-v1.mjs';

const seal = (body, field) => ({ ...body, [field]: hash(body) });
const withoutHash = (row, field) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== field));


function nativeCreepSources(state) {
  const assets = state.officialBattlefieldAssetFamilySourceBundle;
  const lifecycle = state.officialUnitLifecycleFamilySourceBundle;
  const cards = assets?.scope === 'explicit_source_definition_set'
    ? assets.routes.filter(route => route.sourceKind === 'card_feature' && route.effectKind === 'creep_token_place')
    : [];
  const queen = lifecycle?.routes.find(route => route.definitionId === OFFICIAL_QUEEN_SPAWN_CREEP_DEFINITION_ID
    && route.effectKind === 'spawn_creep_tumor');
  const passive = assets?.routes.find(route => ['creep_stay_displacement','stukov_creep'].includes(route.effectKind));
  if (!passive || (!cards.length && !queen)) return [];
  verifyOfficialBattlefieldAssetFamilySourceBundleV1(assets);
  const sources = [{ kind: 'creep_card', sourceBundleHash: assets.bundleHash, routes: cards }];
  if (queen) {
    verifyOfficialUnitLifecycleFamilySourceBundleV1(lifecycle);
    if (lifecycle.sourceSnapshotHash !== assets.sourceSnapshotHash
      || lifecycle.normalizedDatasetHash !== assets.normalizedDatasetHash) {
      throw Error('BATTLEFIELD_DISPLACEMENT_CREEP_SOURCE_MISMATCH');
    }
    sources.push({ kind: 'creep_queen', sourceBundleHash: lifecycle.bundleHash, routes: [queen] });
  }
  return sources;
}

function nativeCreepEffects(state, source) {
  const routes = new Map(source.sources.flatMap(row => (row.routes || []).map(route => [route.definitionId, route])));
  if (!routes.size) return [];
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, 'creep_tumor');
  const effects = [];
  for (const binding of state.officialBattlefieldAssetBindings || []) {
    const route = routes.get(binding.sourceDefinitionId);
    if (!route || binding.consumed) continue;
    const token = state.board.tokens.find(row => row.tokenId === binding.assetId);
    const actor = state.pieces.find(piece => piece.id === binding.sourcePieceId);
    const ownerMatches = route.sourceKind === 'card_feature'
      ? state.cardResources[binding.sideKey]?.some(card => card.cardInstanceId === binding.sourceInstanceId
        && card.officialCardRecordKey === route.recordKey)
      : actor?.id === binding.sourceInstanceId && actor?.officialUnitRecordKey === route.recordKey;
    if (binding.bindingHash !== hash(withoutHash(binding, 'bindingHash'))
      || binding.schema !== 'starcraft_tmg_official_battlefield_asset_binding_v1'
      || binding.assetKind !== 'creep_tumor' || binding.effectKind !== route.effectKind
      || binding.sourceFeatureHash !== route.sourceFeatureHash || !token
      || token.tokenKind !== 'creep_tumor' || token.schema !== binding.assetSchema
      || token.tokenHash !== binding.assetHash || token.createdByPieceId !== binding.sourcePieceId
      || token.createdRound !== binding.createdRound || token.baseDiameterMm !== profile.baseDiameterMm
      || actor?.sideKey !== binding.sideKey || !ownerMatches) {
      throw Error('BATTLEFIELD_DISPLACEMENT_CREEP_BINDING_INVALID');
    }
    verifyOfficialBattlefieldTokenV1(token, state.officialBattlefieldTokenMarkerRegistry);
    if (binding.displacement === true && token.stayInPlay === true && !token.isRemoved
      && resolveOfficialCurrentProductSideCapabilityV1(state, {
        sideKey: binding.sideKey, capability: 'creep_tumor_stay_in_play_and_displacement',
      }).enabled) {
      effects.push({ token, sourceEvidence: { sourceBindingHash: binding.bindingHash } });
    }
  }
  return effects;
}

export function createOfficialBattlefieldDisplacementSourceV1({ state,
  includeNativeCreep = state.officialBattlefieldDisplacementSourceBundle?.version === '1.1.0' }) {
  const sources = [];
  for (const [kind, bundle] of [['bombard', state.officialBombardSourceBundle],
    ['dark_swarm', state.officialDarkSwarmPlacementSourceBundle],
    ['token_leading', state.officialPsionicTransferSourceBundle]]) {
    if (!bundle) continue;
    if (bundle.bundleHash !== hash(withoutHash(bundle, 'bundleHash')) || bundle.displacement !== true) {
      throw Error('BATTLEFIELD_DISPLACEMENT_SOURCE_INVALID');
    }
    sources.push({ kind, sourceBundleHash: bundle.bundleHash });
  }
  const nativeSources = includeNativeCreep ? nativeCreepSources(state) : [];
  sources.push(...nativeSources);
  if (!sources.length) throw Error('BATTLEFIELD_DISPLACEMENT_SOURCE_REQUIRED');
  const roster = state.officialSelectedRosterAbilitySourceBundle;
  if (!roster || roster.bundleHash !== hash(withoutHash(roster, 'bundleHash'))) {
    throw Error('BATTLEFIELD_DISPLACEMENT_ROSTER_SOURCE_INVALID');
  }
  return seal({ schema: 'starcraft_tmg_battlefield_displacement_source_v1', version: nativeSources.length ? '1.1.0' : '1.0.0', sources,
    sourceSnapshotHash: roster.sourceSnapshotHash, normalizedDatasetHash: roster.normalizedDatasetHash,
    creepPassiveSources: roster.passiveBindings.filter(row => ['living_glob_of_tissue', 'creep_stay_displacement',
      'creep_removal','stukov_creep'].includes(row.effectKind)).map(row => structuredClone(row)),
    creepScope: nativeSources.length ? 'source_bound_creep_tumor_tokens' : 'bombard_created_source_bound_tokens',
    trainingTruth: false }, 'bundleHash');
}

export function createOfficialBattlefieldDisplacementProducerV1({ source, state, tokenLeadingProducer }) {
  if (!isDeepStrictEqual(source, createOfficialBattlefieldDisplacementSourceV1({ state, includeNativeCreep: source?.version === '1.1.0' }))) {
    throw Error('BATTLEFIELD_DISPLACEMENT_SOURCE_MISMATCH');
  }
  if (source.sources.some(row => row.kind === 'token_leading') && !tokenLeadingProducer) {
    throw Error('BATTLEFIELD_DISPLACEMENT_TOKEN_LEADING_CONSUMER_REQUIRED');
  }
  function validatedEffects(current) {
    if (!isDeepStrictEqual(current.officialBattlefieldDisplacementSourceBundle, source)
      || !isDeepStrictEqual(createOfficialBattlefieldDisplacementSourceV1({ state: current }), source)) {
      throw Error('BATTLEFIELD_DISPLACEMENT_CURRENT_SOURCE_MISMATCH');
    }
    const rows = (tokenLeadingProducer?.validatedEffects(current) || []).map(row => ({ ...row,
      sourceEvidence: { sourceEffectHash: row.effect.effectHash } }));
    if (source.sources.some(row => row.kind === 'bombard')) {
      for (const binding of inspectOfficialBombardBindingsV1(current)) {
        rows.push({ token: current.board.tokens.find(token => token.tokenId === binding.tokenId),
          sourceEvidence: { sourceBindingHash: binding.bindingHash } });
      }
      const bombard = current.officialBombardSourceBundle;
      const profile = getOfficialBattlefieldAssetComponentFootprintV1(current.officialBattlefieldAssetComponentProfile, 'creep_tumor');
      for (const binding of (current.officialBattlefieldAssetBindings || []).filter(row => !row.consumed
        && row.sourceDefinitionId === bombard.definitionId && row.assetKind === 'creep_tumor')) {
        const token = current.board.tokens.find(row => row.tokenId === binding.assetId);
        const actor = current.pieces.find(piece => piece.id === binding.sourcePieceId);
        const capability = resolveOfficialCurrentProductSideCapabilityV1(current, {
          sideKey: binding.sideKey, capability: 'creep_tumor_stay_in_play_and_displacement' });
        if (binding.bindingHash !== hash(withoutHash(binding, 'bindingHash')) || !token
          || binding.sourceFeatureHash !== bombard.sourceFeatureHash || binding.assetHash !== token.tokenHash
          || binding.assetSchema !== token.schema || token.tokenKind !== 'creep_tumor'
          || token.createdByPieceId !== binding.sourcePieceId || token.createdRound !== binding.createdRound
          || token.baseDiameterMm !== profile.baseDiameterMm || actor?.sideKey !== binding.sideKey
          || !current.officialBombardReplacementHistory?.some(row => row.replacementTokenId === token.tokenId
            && row.pieceId === binding.sourcePieceId)) throw Error('BATTLEFIELD_DISPLACEMENT_CREEP_BINDING_INVALID');
        verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
        if (binding.displacement === true && capability.enabled) {
          rows.push({ token, sourceEvidence: { sourceBindingHash: binding.bindingHash } });
        }
      }
    }
    if (source.sources.some(row => row.kind === 'dark_swarm')) {
      rows.push(...inspectOfficialDarkSwarmPlacementBindingsV1(current));
    }
    rows.push(...nativeCreepEffects(current, source));
    if (new Set(rows.map(row => row.token.tokenId)).size !== rows.length) {
      throw Error('BATTLEFIELD_DISPLACEMENT_DUPLICATE_SOURCE_TOKEN');
    }
    return rows;
  }
  function assertEndpoint(current, action) {
    const geometry = getOfficialDisplacementMovementGeometryV1(action);
    if (!geometry?.finalModelPositions) return;
    const actor = current.pieces.find(piece => piece.id === action.pieceId);
    const tracked = new Set(validatedEffects(current).map(row => row.token.tokenId));
    for (const placed of geometry.finalModelPositions) {
      const model = actor.models.find(row => row.id === placed.modelId);
      const footprint = createOfficialModelBaseFootprintV1({ piece: actor, model, position: placed,
        dataBundle: current.officialModelBaseGeometryDataBundle });
      for (const token of current.board.tokens.filter(row => !row.isRemoved)) {
        verifyOfficialBattlefieldTokenV1(token, current.officialBattlefieldTokenMarkerRegistry);
        if (!evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
          right: createOfficialDisplacementTokenFootprintV1(token) }).overlappingInteriors) continue;
        if (placed.modelId === geometry.leadingModelId && tracked.has(token.tokenId)) {
          throw Error('BATTLEFIELD_TOKEN_DISPLACEMENT_REQUIRED');
        }
        throw Error('TOKEN_MODEL_END_OVERLAP_PROHIBITED');
      }
    }
  }
  function recordTokenDisplacement(current, previous, replacement) {
    if (!current.officialBattlefieldAssetBindings) return;
    current.officialBattlefieldAssetBindings = current.officialBattlefieldAssetBindings.map(binding => {
      if (binding.consumed || binding.assetId !== previous.tokenId) return binding;
      if (binding.assetHash !== previous.tokenHash) throw Error('BATTLEFIELD_DISPLACEMENT_ASSET_HASH_MISMATCH');
      const { bindingHash, ...body } = binding;
      return seal({ ...body, assetHash: replacement.tokenHash, previousBindingHash: bindingHash }, 'bindingHash');
    });
  }
  return Object.freeze({ validatedEffects, assertEndpoint, recordTokenDisplacement });
}
