import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from '../source-data/official-release-context-v2.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialReserveReturnDataBundleV3 } from '../source-data/official-reserve-lifecycle-data-bundle-v1.mjs';
import { resolveOfficialReturnToReservesV1 } from '../rule-atoms/official-reserve-lifecycle-rules-kernel-v1.mjs';
import { applyOfficialReserveLifecyclePieceMutationV1 } from '../rule-atoms/official-reserve-lifecycle-rules-executor-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../rule-atoms/official-round-supply-state-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { resolveOfficialSiegeModeReserveRemovalV1 } from '../rule-atoms/official-status-stay-in-play-rules-kernel-v1.mjs';
import { assertOfficialSelectedRosterCoreActionWindowV1 } from './official-selected-roster-ability-runtime-v1.mjs';
import { removeOfficialCharacteristicAreasOnReserveReturnV1 } from './official-characteristic-area-effect-v1.mjs';

const definitionId = 'card:void_seeker/personal-transport-any@1';
const sourceText = 'Personal Transport <Active> <Movement Phase>: Instead of performing an action, the active, Unengaged Ground Unit is returned to Reserves. Then, it performs a Deploy action.';
const adapterId = 'official-personal-transport-v1';
const actionType = 'resolve_personal_transport';
const clone = value => structuredClone(value);
const seal = (value, field) => ({ ...value, [field]: hash(value) });
const fail = code => { throw Error(code); };

export function createOfficialPersonalTransportSourceV1({ context } = {}) {
  assertOfficialReleaseSourceV2(context, context || {});
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
    identityCatalogue: context.resources.abilityIdentities });
  const source = catalogue.definitions.find(row => row.definitionId === definitionId);
  if (source?.recordKey !== 'tactical_cards:void_seeker' || source.definitionName !== 'Personal Transport'
    || source.sourceText !== sourceText || source.phase !== 'movement' || source.activationKind !== 'active') {
    fail('PERSONAL_TRANSPORT_SOURCE_UNSUPPORTED');
  }
  return seal({ schema: 'starcraft_tmg_personal_transport_source_v1', version: '1.0.0',
    definitionId, sourceFeatureHash: source.sourceFeatureHash, recordKey: source.recordKey,
    sourceText, sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash,
    sourceSnapshotHash: context.snapshot.snapshotHash, normalizedDatasetHash: context.dataset.datasetHash,
    reserveRules: createOfficialReserveReturnDataBundleV3({ context }),
    phase: 'movement', replacesAction: true, requiresUnengagedGroundUnit: true,
    mandatoryDeployment: true, trainingTruth: false }, 'bundleHash');
}

export function createOfficialPersonalTransportRuntimeV1({ context, source, spatialRuntime, refreshState }) {
  if (!isDeepStrictEqual(source, createOfficialPersonalTransportSourceV1({ context }))
    || typeof spatialRuntime !== 'function' || typeof refreshState !== 'function') fail('PERSONAL_TRANSPORT_BINDING_INVALID');
  const ruleAtomIds = source.reserveRules.ruleClauses.map(row => row.atomId).sort();
  const descriptor = { adapterId, adapterVersion: '1.0.0', adapterKind: 'exact_runtime',
    coveredDefinitionCount: 1, coveredSourceFeatureHashes: [source.sourceFeatureHash],
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], sourceBundleHash: source.bundleHash,
    ruleAtomIds, standardDeployGeometryReused: true, atomicReturnAndDeploy: true, rulesAuthority: true, trainingTruth: false };
  const definitionBindings = [{ sourceFeatureHash: source.sourceFeatureHash, adapterId, adapterVersion: '1.0.0',
    capability: 'authoritative_action' }];
  function eligible(state, pieceId, cardInstanceId) {
    const unit = state.pieces.find(row => row.id === pieceId);
    const card = state.cardResources[state.activeSideKey]?.find(row => row.cardInstanceId === cardInstanceId);
    if (state.phase !== 'movement' || !unit || unit.sideKey !== state.activeSideKey || !unit.isOnField
      || unit.isDestroyed || unit.isStructure || Number(unit.currentModels) < 1
      || !unit.combatTags.includes('ground') || unit.activatedPhases?.movement === true
      || state.players[unit.sideKey]?.passedPhases?.movement === true
      || card?.officialCardRecordKey !== source.recordKey || card.readiness !== 'ready') {
      fail('PERSONAL_TRANSPORT_ACTOR_OR_SOURCE_UNAVAILABLE');
    }
    assertOfficialSelectedRosterCoreActionWindowV1(state, unit.sideKey, unit.id, 'movement');
    if (deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes(unit.id)) fail('PERSONAL_TRANSPORT_REQUIRES_UNENGAGED');
    return { unit, card };
  }
  function returnedState(state, pieceId, cardInstanceId) {
    const { unit, card } = eligible(state, pieceId, cardInstanceId);
    const result = resolveOfficialReturnToReservesV1({ state, pieceId,
      reserveLifecycleDataBundle: source.reserveRules, unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
      rulesOwnedStateRequested: true, triggerAuthority: 'rule_effect_resolution',
      triggerReceiptHash: hash({ definitionId, sourceFeatureHash: source.sourceFeatureHash,
        sourceCardInstanceId: cardInstanceId, pieceId, stateHash: hash(state) }) });
    let next = clone(state);
    const areaEvents = next.officialCharacteristicStatusFamilySourceBundle
      ? removeOfficialCharacteristicAreasOnReserveReturnV1(next.officialCharacteristicStatusFamilySourceBundle, next, pieceId) : [];
    applyOfficialReserveLifecyclePieceMutationV1(next, result.mutation, { boardTokenIdField: 'tokenId' });
    const removedTokens = new Set(result.removeBoardTokenIds);
    if (next.pendingPsionicTransferEffects) {
      next.pendingPsionicTransferEffects = next.pendingPsionicTransferEffects.filter(effect => !removedTokens.has(effect.tokenId));
    }
    const returned = next.pieces.find(row => row.id === pieceId);
    if (returned.statuses.some(status => status?.statusName === 'siege_mode' || status === 'siege_mode')) {
      const removal = resolveOfficialSiegeModeReserveRemovalV1({ state: next, pieceId,
        statusStayInPlayDataBundle: next.officialSiegeModeDataBundle || next.officialStatusStayInPlayDataBundle,
        procedureKind: 'remove_siege_mode_on_reserve', rulesOwnedStateRequested: true });
      applyOfficialReserveLifecyclePieceMutationV1(next, removal.mutation, { boardTokenIdField: 'tokenId' });
    }
    next.cardResources[unit.sideKey].find(row => row.cardInstanceId === card.cardInstanceId).readiness = 'exhausted';
    next.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: next });
    next = refreshState(next);
    const domain = spatialRuntime().enumerate(next).parameterDomains.find(row => row.actionType === 'deploy' && row.pieceId === pieceId);
    if (!domain) fail('PERSONAL_TRANSPORT_STANDARD_DEPLOY_UNAVAILABLE');
    return { state: next, result, domain, areaEvents };
  }
  function domainFor(state, pieceId, cardInstanceId) {
    const prepared = returnedState(state, pieceId, cardInstanceId);
    return seal({ actionType, sideKey: state.activeSideKey, phase: 'movement', pieceId,
      sourceInstanceId: cardInstanceId, definitionId, abilityName: 'Personal Transport',
      parameterKind: 'official_personal_transport_deploy_v1', executorId: adapterId, executorVersion: '1.0.0', ruleAtomIds,
      sourceFeatureHash: source.sourceFeatureHash, sourceBundleHash: source.bundleHash,
      parameterSchema: { type: 'object', required: ['deployment'], additionalProperties: false,
        properties: { deployment: clone(prepared.domain.parameterSchema) } },
      deploymentDomain: prepared.domain,
      supplyBefore: clone(state.officialRoundSupplyState), supplyAfterReturn: clone(prepared.state.officialRoundSupplyState),
      confirmationClass: 'agent_owned_legal_action_auto_apply_or_human_direct_choice', trainingTruth: false }, 'domainId');
  }
  function enumerate(state, options = {}) {
    const parameterDomains = [];
    if (options.sideKey && options.sideKey !== state.activeSideKey) return { parameterDomains, candidates: [] };
    for (const card of state.cardResources[state.activeSideKey] || []) {
      if (card.officialCardRecordKey !== source.recordKey || card.readiness !== 'ready') continue;
      for (const unit of state.pieces.filter(row => row.sideKey === state.activeSideKey)) {
        try { parameterDomains.push(domainFor(state, unit.id, card.cardInstanceId)); }
        catch (error) {
          if (!/PERSONAL_TRANSPORT_|SELECTED_ABILITY_CORE_ACTION_WINDOW_INVALID|SELECTED_SPATIAL_/.test(error.message)) throw error;
        }
      }
    }
    return { parameterDomains, candidates: [] };
  }
  function instantiate(state, domain, parameters) {
    const current = domainFor(state, domain.pieceId, domain.sourceInstanceId);
    if (!isDeepStrictEqual(domain, current) || !parameters || Object.keys(parameters).join(',') !== 'deployment') {
      fail('PERSONAL_TRANSPORT_PARAMETERS_OR_DOMAIN_INVALID');
    }
    const returned = returnedState(state, domain.pieceId, domain.sourceInstanceId);
    const deployed = spatialRuntime().instantiate(returned.state, returned.domain, parameters.deployment);
    const action = { actionType, sideKey: domain.sideKey, phase: 'movement', pieceId: domain.pieceId,
      executorId: adapterId, executorVersion: '1.0.0', ruleAtomIds,
      transportPlan: seal({ sourceBundleHash: source.bundleHash, sourceInstanceId: domain.sourceInstanceId,
        domainId: domain.domainId, parameters: clone(parameters), returnResolution: returned.result,
        deploymentAction: deployed.action }, 'planHash') };
    return { action, canonicalParameters: clone(parameters) };
  }
  function preview(state, request) {
    return instantiate(state, request.domain, request.parameters);
  }
  function apply(state, request) {
    const action = request.action;
    const domain = domainFor(state, action.pieceId, action.transportPlan?.sourceInstanceId);
    const expected = instantiate(state, domain, action.transportPlan.parameters).action;
    if (!isDeepStrictEqual(action, expected)) fail('PERSONAL_TRANSPORT_ACTION_STALE');
    const returned = returnedState(state, action.pieceId, domain.sourceInstanceId);
    const deployed = spatialRuntime().apply(returned.state, action.transportPlan.deploymentAction, request.options);
    const next = clone(deployed.state);
    next.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: next });
    const event = { type: 'personal_transport_resolved', pieceId: action.pieceId, sideKey: action.sideKey,
      sourceDefinitionId: definitionId, sourceInstanceId: domain.sourceInstanceId,
      returnResultHash: returned.result.resultHash, releasedSupply: returned.result.currentSupplyReleasedImmediately,
      removeBoardTokenIds: returned.result.removeBoardTokenIds,
      deploymentPlanHash: action.transportPlan.deploymentAction.spatialPlan.spatialPlanHash, trainingTruth: false };
    next.personalTransportHistory = [...(next.personalTransportHistory || []), {
      round: next.round, phase: next.phase, ...event, returnResolution: returned.result,
      supplyAfterReturn: returned.state.officialRoundSupplyState,
      supplyAfterDeploy: next.officialRoundSupplyState }];
    const events = [...returned.areaEvents, ...deployed.events, event];
    next.log.at(-1).events = [...next.log.at(-1).events, ...returned.areaEvents, event];
    return { ...deployed, state: refreshState(next), action, events };
  }
  function query(state, request) {
    if (Object.keys(request).some(key => !['queryKind', 'pieceId', 'parameters'].includes(key))
      || request.queryKind === 'personal_transport_options' && request.parameters !== undefined) {
      fail('PERSONAL_TRANSPORT_QUERY_SEMANTIC_ONLY');
    }
    if (request.queryKind === 'personal_transport_options') {
      return seal({ schemaVersion: 'starcraft_tmg_personal_transport_query_v1', queryKind: request.queryKind, stateHash: hash(state),
        result: { parameterDomains: enumerate(state).parameterDomains.filter(row => row.pieceId === request.pieceId) },
        mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
    }
    if (request.queryKind !== 'personal_transport_preview') fail('PERSONAL_TRANSPORT_QUERY_UNSUPPORTED');
    const domain = enumerate(state).parameterDomains.find(row => row.pieceId === request.pieceId);
    if (!domain) fail('PERSONAL_TRANSPORT_DOMAIN_UNAVAILABLE');
    return seal({ schemaVersion: 'starcraft_tmg_personal_transport_query_v1', queryKind: request.queryKind, stateHash: hash(state),
      result: preview(state, { domain, parameters: request.parameters }), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  return { descriptor, definitionBindings, legalSpace: enumerate, enumerate, instantiate, preview, apply, query };
}
