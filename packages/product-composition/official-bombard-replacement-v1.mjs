import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { getOfficialBattlefieldAssetComponentFootprintV1, getOfficialReleaseBattlefieldAssetComponentProfileV2 }
  from '../source-data/official-battlefield-asset-component-profile-v1.mjs';
import { createOfficialBattlefieldTokenV1, resolveOfficialTokenMarkerCleanupV1 }
  from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { projectOfficialDestroyedSourceTokenIdsV1 } from '../rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { evaluateOfficialPhysicalFootprintRelationV1, OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { resolveOfficialCurrentProductSideCapabilityV1 } from './official-current-product-state-facts-v1.mjs';
import { assertOfficialBombardTokenPlacementV1, hasOfficialReleaseBombardPhysicalPlacementV1, inspectOfficialBombardBindingsV1 }
  from './official-bombard-runtime-v1.mjs';
import { createOfficialBombardTargetingPolicyV1 } from './official-bombard-targeting-v1.mjs';
import { createOfficialBombardRemovalLifecyclePolicyV1 } from './official-bombard-removal-lifecycle-v1.mjs';

const runtimeId = 'official-bombard-replacement-v1';
const version = '1.0.0';
const parentKey = 'pendingOfficialBombardReplacement';
const atomId = 'rule-atom:bombard-post-attack-creep-replacement-v1';
const seal = (body, field) => ({ ...body, [field]: hash(body) });

export function createOfficialBombardReplacementPolicyV1({ source }) {
  createOfficialBombardTargetingPolicyV1({ source });
  return { schema: 'starcraft_tmg_bombard_replacement_policy_v1', version, ruleAtomId: atomId,
    sourceBundleHash: source.bundleHash, afterFullyResolvedWeaponAttack: source.weaponName,
    replacementTokenKind: 'creep_tumor', replacementRequiresBaseToBase: true, trainingTruth: false };
}

export function createOfficialBombardReplacementRuntimeV1({ context, state, hasUnsettledAttack }) {
  const source = state.officialBombardSourceBundle;
  const policy = createOfficialBombardReplacementPolicyV1({ source });
  if (!isDeepStrictEqual(policy, state.officialBombardReplacementPolicy)) throw Error('BOMBARD_REPLACEMENT_POLICY_INVALID');
  const removal = state.officialBombardRemovalLifecyclePolicy
    ? createOfficialBombardRemovalLifecyclePolicyV1({ context, source }) : null;
  if (removal && !isDeepStrictEqual(removal, state.officialBombardRemovalLifecyclePolicy)) throw Error('BOMBARD_REMOVAL_POLICY_INVALID');
  const runtimeVersion = hasOfficialReleaseBombardPhysicalPlacementV1(state) ? '1.2.0' : removal ? '1.1.0' : version;
  if (typeof hasUnsettledAttack !== 'function') throw Error('BOMBARD_REPLACEMENT_CONTINUATION_READER_REQUIRED');
  if (!isDeepStrictEqual(getOfficialReleaseBattlefieldAssetComponentProfileV2(context), state.officialBattlefieldAssetComponentProfile)) {
    throw Error('BOMBARD_REPLACEMENT_COMPONENT_RELEASE_MISMATCH');
  }
  const profile = getOfficialBattlefieldAssetComponentFootprintV1(state.officialBattlefieldAssetComponentProfile, policy.replacementTokenKind);
  const descriptor = { runtimeId, runtimeVersion, ruleAtomIds: [atomId, ...(removal?.ruleAtomIds || [])], sourceBundleHash: source.bundleHash,
    policy, replacementFootprintEvidenceHash: profile.evidenceHash, actions: ['replace_bile_bomb_with_creep'],
    ...(removal ? { removalLifecyclePolicy: removal, cleanupBeforeRefresh: true, sourceDestructionConsumerReady: true } : {}),
    waitsForDefenderAndCasualtyContinuations: true, freeCoordinateChoice: true, trainingTruth: false };

  function pending(current) {
    const parent = current[parentKey];
    if (!parent) return null;
    const { parentHash, ...body } = parent;
    const binding = inspectOfficialBombardBindingsV1(current).find(row => row.bindingHash === parent.sourceBindingHash);
    if (parentHash !== hash(body) || parent.schema !== 'starcraft_tmg_bombard_replacement_parent_v1'
      || parent.sourceBundleHash !== source.bundleHash || !['waiting', 'ready'].includes(parent.stage)
      || parent.round !== Number(current.round) || !binding || parent.tokenId !== binding.tokenId
      || parent.sideKey !== binding.sideKey || parent.pieceId !== binding.sourcePieceId
      || !validTrigger(current, parent)
      || !current.players[parent.resumeSideKey] && !(removal && parent.removalCause === 'cleanup' && parent.resumeSideKey === null)) {
      throw Error('BOMBARD_REPLACEMENT_PARENT_INVALID');
    }
    if (parent.stage === 'ready' && hasUnsettledAttack(current)) throw Error('BOMBARD_REPLACEMENT_CONTINUATION_CONFLICT');
    return parent;
  }
  function validTrigger(current, parent) {
    if (!parent.removalCause || parent.removalCause === 'attack') return Boolean(parent.attackResolutionHash);
    if (!removal || !Array.isArray(parent.remainingTokenIds)) return false;
    if (parent.removalCause === 'cleanup') return current.phase === 'cleanup'
      && /^[a-f0-9]{64}$/.test(parent.removalTriggerHash);
    const actor = current.pieces.find(piece => piece.id === parent.pieceId);
    return parent.removalCause === 'source_destroyed' && actor?.isDestroyed === true && Number(actor.currentModels) === 0
      && /^[a-f0-9]{64}$/.test(parent.removalTriggerHash);
  }
  function removalParent(current, binding, cause, remainingTokenIds, triggerHash, resumeSideKey = current.activeSideKey) {
    return seal({ schema: 'starcraft_tmg_bombard_replacement_parent_v1', stage: 'waiting',
      sourceBundleHash: source.bundleHash, sourceBindingHash: binding.bindingHash, tokenId: binding.tokenId,
      round: Number(current.round), sideKey: binding.sideKey, pieceId: binding.sourcePieceId,
      attackResolutionHash: null, removalCause: cause, remainingTokenIds, removalTriggerHash: triggerHash,
      resumeSideKey, trainingTruth: false }, 'parentHash');
  }
  function prepareCleanup(result) {
    if (!removal) throw Error('BOMBARD_REMOVAL_LIFECYCLE_REQUIRED');
    if (result.state[parentKey]) throw Error('BOMBARD_PRIOR_REPLACEMENT_REQUIRED');
    const bindings = inspectOfficialBombardBindingsV1(result.state).sort((left, right) =>
      Number(right.sideKey === result.state.firstPlayerSideKey) - Number(left.sideKey === result.state.firstPlayerSideKey)
      || left.tokenId.localeCompare(right.tokenId));
    if (!bindings.length) return result;
    const next = structuredClone(result.state);
    next[parentKey] = removalParent(next, bindings[0], 'cleanup', bindings.slice(1).map(row => row.tokenId), hash(result.state));
    return { ...result, state: next };
  }
  function cleanupTokens(current) {
    if (!removal) throw Error('BOMBARD_REMOVAL_LIFECYCLE_REQUIRED');
    if (current[parentKey] || inspectOfficialBombardBindingsV1(current).length) throw Error('BOMBARD_CLEANUP_REPLACEMENT_REQUIRED');
    const cleanup = resolveOfficialTokenMarkerCleanupV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokens: current.board.tokens || [], markers: current.board.markers || [] });
    const next = structuredClone(current), retained = new Set([...cleanup.retainedTokenIds, ...cleanup.retainedMarkerIds]);
    next.board.tokens = structuredClone(cleanup.tokens); next.board.markers = structuredClone(cleanup.markers);
    next.officialBattlefieldAssetBindings = (next.officialBattlefieldAssetBindings || []).filter(binding => retained.has(binding.assetId));
    next.officialBombardTokenCleanupHistory = [...(next.officialBombardTokenCleanupHistory || []), {
      round: Number(next.round), cleanupHash: cleanup.cleanupHash, removedTokenIds: cleanup.removedTokenIds,
      retainedTokenIds: cleanup.retainedTokenIds, trainingTruth: false }];
    return next;
  }
  function ownsWindow(current) { return pending(current)?.stage === 'ready'; }
  function enumerate(current, options = {}) {
    const parent = pending(current);
    if (parent?.stage !== 'ready' || (options.sideKey || current.activeSideKey) !== parent.sideKey) {
      return { candidates: [], parameterDomains: [] };
    }
    return { candidates: [], parameterDomains: [seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_bombard_creep_replacement_v1', actionType: 'replace_bile_bomb_with_creep',
      executorId: runtimeId, executorVersion: runtimeVersion, sideKey: parent.sideKey, phase: current.phase, pieceId: parent.pieceId,
      ruleAtomIds: [atomId], parameterSchema: { type: 'object', required: ['coordinate'],
        coordinate: { coordinateUnit: 'milli-inch', required: ['xMilliInches', 'yMilliInches'] } },
      constraints: { stateHash: hash(current), parentHash: parent.parentHash, sourceTokenId: parent.tokenId,
        baseToBaseRequired: true, physicalTokenProfile: profile }, confirmationClass: 'rules_owned_direct_action',
      trainingTruth: false }, 'domainId')] };
  }
  function instantiate(current, domain, parameters) {
    const live = enumerate(current, { sideKey: domain.sideKey }).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!live || !isDeepStrictEqual(live, domain)) throw Error('BOMBARD_REPLACEMENT_DOMAIN_STALE');
    if (!parameters || Object.keys(parameters).join(',') !== 'coordinate' || !parameters.coordinate
      || Object.keys(parameters.coordinate).sort().join(',') !== 'xMilliInches,yMilliInches'
      || !Number.isSafeInteger(parameters.coordinate.xMilliInches) || !Number.isSafeInteger(parameters.coordinate.yMilliInches)) {
      throw Error('BOMBARD_REPLACEMENT_SEMANTIC_PARAMETERS_REQUIRED');
    }
    const parent = pending(current);
    const stay = resolveOfficialCurrentProductSideCapabilityV1(current, {
      sideKey: parent.sideKey, capability: 'creep_tumor_stay_in_play_and_displacement' }).enabled;
    const token = createOfficialBattlefieldTokenV1({ registry: current.officialBattlefieldTokenMarkerRegistry,
      tokenId: 'bombard-creep-' + hash({ parentHash: parent.parentHash, coordinate: parameters.coordinate }).slice(0, 24),
      tokenKind: policy.replacementTokenKind, coordinate: { x: parameters.coordinate.xMilliInches / 1000,
        y: parameters.coordinate.yMilliInches / 1000 }, baseShape: profile.baseShape, baseDiameterMm: profile.baseDiameterMm,
      stayInPlay: stay, createdByPieceId: parent.pieceId, createdRound: Number(current.round) });
    const original = current.board.tokens.find(row => row.tokenId === parent.tokenId);
    const footprint = createOfficialDisplacementTokenFootprintV1(token);
    const contact = evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
      right: createOfficialDisplacementTokenFootprintV1(original) });
    if (contact.overlappingInteriors || contact.minimumSeparationMilliInches > OFFICIAL_PHYSICAL_GEOMETRY_TOLERANCE_MILLI_INCHES_V1) {
      throw Error('BOMBARD_REPLACEMENT_BASE_TO_BASE_REQUIRED');
    }
    assertOfficialBombardTokenPlacementV1(current, footprint);
    return { canonicalParameters: structuredClone(parameters), action: { actionType: domain.actionType, executorId: runtimeId,
      executorVersion: runtimeVersion, sideKey: parent.sideKey, phase: current.phase, pieceId: parent.pieceId,
      ruleAtomIds: [atomId],
      domainId: domain.domainId, parentHash: parent.parentHash, token, displacement: stay,
      canonicalParameters: structuredClone(parameters) } };
  }
  function apply(current, action, options = {}) {
    const domain = enumerate(current, { sideKey: action.sideKey }).parameterDomains.find(row => row.domainId === action.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.canonicalParameters).action, action)) {
      throw Error('BOMBARD_REPLACEMENT_ACTION_STALE');
    }
    if (options.chanceReveals?.length) throw Error('BOMBARD_REPLACEMENT_HAS_NO_DICE');
    const parent = pending(current), next = structuredClone(current);
    next.board.tokens.push(structuredClone(action.token));
    next.board.tokens = next.board.tokens.filter(row => row.tokenId !== parent.tokenId);
    next.officialBattlefieldAssetBindings = [...(next.officialBattlefieldAssetBindings || []), seal({
      schema: 'starcraft_tmg_official_battlefield_asset_binding_v1', assetId: action.token.tokenId,
      assetKind: policy.replacementTokenKind, assetSchema: action.token.schema, assetHash: action.token.tokenHash,
      sideKey: parent.sideKey, sourcePieceId: parent.pieceId, sourceInstanceId: parent.pieceId,
      sourceDefinitionId: source.definitionId, sourceFeatureHash: source.sourceFeatureHash,
      effectKind: 'creep_token_place', createdRound: Number(next.round), displacement: action.displacement,
      lifecycleEvent: null, consumed: false, trainingTruth: false }, 'bindingHash')];
    next.officialBombardBindings = next.officialBombardBindings.map(binding => {
      if (binding.bindingHash !== parent.sourceBindingHash) return binding;
      const { bindingHash, ...body } = binding;
      return seal({ ...body, consumed: true, previousBindingHash: bindingHash, replacementTokenId: action.token.tokenId,
        attackResolutionHash: parent.attackResolutionHash }, 'bindingHash');
    });
    next.officialBombardReplacementHistory = [...(next.officialBombardReplacementHistory || []), {
      round: Number(next.round), pieceId: parent.pieceId, parentHash: parent.parentHash,
      attackResolutionHash: parent.attackResolutionHash, removedTokenId: parent.tokenId, replacementTokenId: action.token.tokenId,
      ...(removal ? { removalCause: parent.removalCause || 'attack' } : {}) }];
    delete next[parentKey];
    next.activeSideKey = parent.resumeSideKey;
    if (removal && parent.remainingTokenIds?.length) {
      const [id, ...rest] = parent.remainingTokenIds;
      const binding = inspectOfficialBombardBindingsV1(next).find(row => row.tokenId === id);
      if (!binding) throw Error('BOMBARD_QUEUED_REMOVAL_BINDING_INVALID');
      next[parentKey] = removalParent(next, binding, parent.removalCause, rest, parent.removalTriggerHash, parent.resumeSideKey);
    }
    const events = [{ type: 'bombard_creep_tumor_set', pieceId: parent.pieceId, tokenId: action.token.tokenId,
      baseToBaseWithTokenId: parent.tokenId, tokenHash: action.token.tokenHash, trainingTruth: false },
    { type: 'bile_bomb_token_removed', pieceId: parent.pieceId, tokenId: parent.tokenId,
      attackResolutionHash: parent.attackResolutionHash, ...(removal ? { removalCause: parent.removalCause || 'attack' } : {}), trainingTruth: false }];
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, state: next, action, events, runtimeId, runtimeVersion,
      postRevision: Number(options.postRevision || 0), trainingTruth: false };
  }
  function afterTransition(result, before) {
    if (!result?.state) return result;
    if (removal) {
      const removed = new Set((result.state.officialBattlefieldAssetBindings || []).filter(binding =>
        !binding.consumed && binding.sourceDefinitionId === source.definitionId && binding.assetKind === 'creep_tumor')
        .flatMap(binding => {
          const actor = result.state.pieces.find(piece => piece.id === binding.sourcePieceId);
          if (!actor?.isDestroyed || Number(actor.currentModels) !== 0) return [];
          return projectOfficialDestroyedSourceTokenIdsV1(result.state.board.tokens, actor.id, 'tokenId').removeBoardTokenIds
            .filter(id => id === binding.assetId);
        }));
      if (removed.size) {
        const next = structuredClone(result.state);
        next.board.tokens = next.board.tokens.filter(token => !removed.has(token.tokenId));
        next.officialBattlefieldAssetBindings = next.officialBattlefieldAssetBindings.map(binding => {
          if (!removed.has(binding.assetId)) return binding;
          const { bindingHash, ...body } = binding;
          return seal({ ...body, consumed: true }, 'bindingHash');
        });
        const event = { type: 'bombard_destroyed_source_creep_removed', tokenIds: [...removed].sort(), trainingTruth: false };
        if (next.log?.length) next.log.at(-1).events = [...(next.log.at(-1).events || []), event];
        result = { ...result, state: next, events: [...(result.events || []), event] };
      }
    }
    let parent = pending(result.state);
    if (parent?.stage === 'ready') return result;
    const attack = (result.events || []).find(row => row.type === 'ranged_attack' && row.weaponName === source.weaponName
      && result.state.officialBombardBindings?.some(binding => !binding.consumed
        && binding.round === Number(result.state.round) && binding.sourcePieceId === row.pieceId));
    if (!parent && !attack && removal) {
      const missing = (result.state.officialBombardBindings || []).filter(binding => !binding.consumed
        && !result.state.board.tokens.some(token => token.tokenId === binding.tokenId));
      if (missing.length) {
        const restored = structuredClone(result.state);
        for (const binding of missing) {
          const actor = restored.pieces.find(piece => piece.id === binding.sourcePieceId);
          const token = before?.board.tokens.find(row => row.tokenId === binding.tokenId);
          if (!actor?.isDestroyed || Number(actor.currentModels) !== 0 || !token
            || result.events?.some(event => event.tokenId === binding.tokenId && /displaced/.test(event.type))) {
            throw Error('BOMBARD_TOKEN_REMOVED_WITHOUT_PRE_REMOVAL_CONTINUATION');
          }
          restored.board.tokens.push(structuredClone(token));
        }
        const event = { type: 'bombard_token_removal_deferred', tokenIds: missing.map(binding => binding.tokenId),
          removalCause: 'source_destroyed', trainingTruth: false };
        if (restored.log?.length) restored.log.at(-1).events = [...(restored.log.at(-1).events || []), event];
        result = { ...result, state: restored, events: [...(result.events || []), event] };
      }
      const destroyed = inspectOfficialBombardBindingsV1(result.state).filter(binding => {
        const actor = result.state.pieces.find(piece => piece.id === binding.sourcePieceId);
        return actor?.isDestroyed === true && Number(actor.currentModels) === 0;
      });
      if (destroyed.length) {
        const current = result.state;
        const selected = destroyed.filter(binding => projectOfficialDestroyedSourceTokenIdsV1(current.board.tokens,
          binding.sourcePieceId, 'tokenId').removeBoardTokenIds.includes(binding.tokenId));
        if (selected.length) parent = removalParent(current, selected[0], 'source_destroyed',
          selected.slice(1).map(row => row.tokenId), hash(current));
      }
    }
    if (!parent && !attack) return result;
    const next = structuredClone(result.state);
    if (!parent) {
      const binding = inspectOfficialBombardBindingsV1(next).find(row => row.sourcePieceId === attack.pieceId
        && row.round === Number(next.round));
      parent = seal({ schema: 'starcraft_tmg_bombard_replacement_parent_v1', stage: 'waiting',
        sourceBundleHash: source.bundleHash, sourceBindingHash: binding.bindingHash, tokenId: binding.tokenId,
        round: Number(next.round), sideKey: binding.sideKey, pieceId: binding.sourcePieceId,
        attackResolutionHash: attack.attackResolutionHash, resumeSideKey: next.activeSideKey,
        ...(removal ? { removalCause: 'attack', remainingTokenIds: [] } : {}), trainingTruth: false }, 'parentHash');
    }
    const events = structuredClone(result.events || []);
    if (!hasUnsettledAttack(next)) {
      const { parentHash, ...body } = parent;
      parent = seal({ ...body, stage: 'ready', resumeSideKey: next.activeSideKey }, 'parentHash');
      next.activeSideKey = parent.sideKey;
      const event = { type: 'bombard_creep_placement_required', pieceId: parent.pieceId, tokenId: parent.tokenId,
        attackResolutionHash: parent.attackResolutionHash,
        ...(removal ? { removalCause: parent.removalCause || 'attack' } : {}), trainingTruth: false };
      events.push(event);
      if (next.log?.length) next.log.at(-1).events = [...(next.log.at(-1).events || []), structuredClone(event)];
    }
    next[parentKey] = parent;
    return { ...result, state: next, events };
  }
  return Object.freeze({ descriptor, pending, ownsWindow, enumerate, instantiate, apply, afterTransition,
    ...(removal ? { prepareCleanup, cleanupTokens } : {}) });
}
