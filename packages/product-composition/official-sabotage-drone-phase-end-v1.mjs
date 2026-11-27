import { isFieldedOfficialSabotageDroneV1 } from '../rule-atoms/official-sabotage-drone-timing-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialCharacteristicStatusFamilySourceBundleV1 } from './official-characteristic-status-family-adapter-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { canOfficialUnitBeAbilityTargetV1 } from '../rule-atoms/official-decoy-rules-v1.mjs';
import { resolveOfficialNextControllerEffectGroupV1 } from '../rule-atoms/official-ability-timing-priority-rules-kernel-v1.mjs';

export const OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID = 'unit:sabotage_drone/have-a-nice-day-assault-phase@1';
const runtimeId = 'official-sabotage-drone-phase-end-v1';
const parentKey = 'pendingSabotageDronePhaseEnd';
const effectHistoryKey = 'officialSabotageDroneOrderedEffectHistory';
const orderedAction = 'resolve_ordered_sabotage_drone_effect';
const atomIds = ['rule-atom:source-bound-unit-phase-end-hits-v1'];
const sides = ['player1', 'player2'];
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const seal = value => ({ ...value, parentHash: hash(value) });
const liveModels = piece => piece?.models?.filter(model => model.isOnField !== false && !model.isDestroyed) || [];
const active = piece => piece?.isOnField === true && piece.isDestroyed !== true && liveModels(piece).length > 0;

function routeFor(source) {
  verifyOfficialCharacteristicStatusFamilySourceBundleV1(source);
  const route = source.routes.find(row => row.definitionId === OFFICIAL_SABOTAGE_DRONE_PHASE_END_DEFINITION_ID);
  if (route?.effectKind !== 'unit_phase_end_hits' || route.rangeMilliInches !== 3000 || route.hits !== 5
    || route.additionalStructureHits !== 5 || route.damagePerHit !== 1 || route.explicitStructureRecipients !== true) {
    throw Error('SABOTAGE_DRONE_PHASE_END_SOURCE_REQUIRED');
  }
  return route;
}
export function createOfficialSabotageDronePhaseEndPolicyV1({ context, source }) {
  const route = routeFor(source);
  const record = context.dataset.recordsByKey['rules_sections:H3Fn8YSvEvpJZpT57qw1'];
  const rule = record?.payload.items?.[3];
  const faq = context.manifest.source.references.faq;
  if (rule?.title !== '10.3 Passive Abilities (Full Rules)'
    || !rule.content[0].value.includes('Active Player') || !rule.content[0].value.includes('controlling player chooses')
    || faq?.byteHash !== '65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213') {
    throw Error('SABOTAGE_DRONE_PASSIVE_PRIORITY_SOURCE_REQUIRED');
  }
  const body = { schema: 'starcraft_tmg_sabotage_drone_phase_end_policy_v1', version: '1.0.0',
    sourceBundleHash: source.bundleHash, sourceFeatureHash: route.sourceFeatureHash,
    passiveOrderSourceRecordHash: record.sourceRecordHash, passiveOrderPayloadHash: record.payloadHash,
    passiveOrderPointer: '/payload/items/3', activePlayerEffectsFirst: true, controllerChoosesOwnSourceOrder: true,
    sourceMustBeFieldedWhenEffectStarts: true, startedEffectCompletesAfterSourceLoss: true,
    baseAndAdditionalHitsInstructionsSeparate: true, actualStructureAbilityRequired: true,
    faqSourceByteHash: faq.byteHash, selfRangeFaqEntry: 'faq-v1.3:41', bileLauncherFaqEntry: 'faq-v1.3:75', trainingTruth: false };
  return { ...body, policyHash: hash(body) };
}

export function createOfficialSabotageDronePhaseEndRuntimeV1({ context, source, state, includeSharedOrder = false }) {
  const route = routeFor(source);
  const policy = createOfficialSabotageDronePhaseEndPolicyV1({ context, source });
  if (!isDeepStrictEqual(policy, state.officialSabotageDronePhaseEndPolicy)) throw Error('SABOTAGE_DRONE_PHASE_END_POLICY_MISMATCH');
  const runtimeVersion = includeSharedOrder ? '1.1.0' : '1.0.0';
  const descriptor = { runtimeId, runtimeVersion, ruleAtomIds: atomIds, policyHash: policy.policyHash,
    sourceBundleHash: source.bundleHash, actions: ['begin_sabotage_drone_phase_end', 'choose_sabotage_drone_source',
      'complete_sabotage_drone_phase_end', ...(includeSharedOrder ? [orderedAction] : [])], trainingTruth: false };
  function sourcePiece(current, pieceId) {
    const piece = current.pieces.find(row => row.id === pieceId);
    if (!piece || piece.officialUnitRecordKey !== route.recordKey) return null;
    if (piece.sourceRecordHash !== route.sourceRecordHash || piece.officialPayloadHash !== route.payloadHash) {
      throw Error('SABOTAGE_DRONE_UNIT_SOURCE_MISMATCH');
    }
    return piece;
  }
  function sourcePieces(current) {
    return current.pieces.filter(piece => piece.officialUnitRecordKey === route.recordKey)
      .map(piece => sourcePiece(current, piece.id)).filter(isFieldedOfficialSabotageDroneV1);
  }
  function projectSource(current, sourcePieceId) {
    const piece = sourcePiece(current, sourcePieceId);
    if (!active(piece)) throw Error('SABOTAGE_DRONE_SOURCE_NOT_FIELDED');
    const projected = projectOfficialRangedTerrainForLosV1(current).projected;
    const origin = projected.pieces.find(row => row.id === piece.id);
    const targets = current.pieces.filter(target => active(target)
      && (target.isStructure === true || canOfficialUnitBeAbilityTargetV1(current, target))).map(target => {
      const ranges = liveModels(piece).map(model => evaluateOfficialWithinWhollyWithinV1({ state: current,
        dataBundle: current.officialModelBaseGeometryDataBundle,
        source: { kind: 'model', unitId: piece.id, modelId: model.id }, targetUnitId: target.id,
        rangeMilliInches: route.rangeMilliInches }));
      if (!ranges.some(result => result.unitWithin)) return null;
      const projectedTarget = projected.pieces.find(row => row.id === target.id);
      const sight = liveModels(origin).flatMap(model => liveModels(projectedTarget).map(targetModel =>
        evaluateOfficialElevatedLineOfSightV1({ state: projected, attacker: origin, attackerModelId: model.id,
          target: projectedTarget, targetModelId: targetModel.id, dataBundle: current.officialTerrainLosDataBundle })));
      if (!sight.some(result => result.visible)) return null;
      return { targetUnitId: target.id, sideKey: target.sideKey, isStructure: target.isStructure === true,
        baseHits: route.hits, additionalHits: target.isStructure === true ? route.additionalStructureHits : 0,
        damagePerHit: route.damagePerHit, rangeProofHashes: ranges.map(hash), losProofHashes: sight.map(hash) };
    }).filter(Boolean).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId));
    const body = { sourcePieceId: piece.id, sideKey: piece.sideKey, sourceDefinitionId: route.definitionId,
      sourceFeatureHash: route.sourceFeatureHash, stateHash: hash(current), rangeMilliInches: route.rangeMilliInches,
      targets, explicitStructureRecipients: true, trainingTruth: false };
    return { ...body, scopeHash: hash(body) };
  }
  function pending(current) {
    const parent = current[parentKey]; if (!parent) return null;
    if (parent.schema !== 'starcraft_tmg_sabotage_drone_phase_end_v1'
      || parent.parentHash !== hash(withoutHash(parent)) || parent.policyHash !== policy.policyHash
      || parent.round !== Number(current.round) || parent.phase !== current.phase
      || !['choose', 'hits', 'complete'].includes(parent.stage)
      || parent.stage !== 'hits' && current.activeSideKey !== parent.ownerSideKey) throw Error('SABOTAGE_DRONE_PHASE_END_PARENT_INVALID');
    return parent;
  }
  function listOrderedEffects(current) {
    const completed = new Set((current[effectHistoryKey] || []).filter(row => row.round === Number(current.round))
      .map(row => row.sourcePieceId));
    return sourcePieces(current).filter(piece => !completed.has(piece.id))
      .map(piece => ({ effectId: piece.id, controllerSideKey: piece.sideKey }));
  }
  function orderedCandidate(current, effectId) {
    if (!canStart(current) || !listOrderedEffects(current).some(row => row.effectId === effectId
      && row.controllerSideKey === current.activeSideKey)) return null;
    return action(current, orderedAction, { pieceId: effectId, abilityName: 'Have a Nice Day' });
  }
  function canStart(current) {
    return current.phase === 'assault' && !current[parentKey]
      && current.sabotageDronePhaseEndCompletedRound !== Number(current.round)
      && sides.every(side => current.players[side]?.passedPhases?.assault === true)
      && sides.includes(current.activeSideKey)
      && (includeSharedOrder ? listOrderedEffects(current) : sourcePieces(current)).length > 0
      && !current.selectedRosterActivationWindow && !current.pendingAction && !current.pendingOfficialReactionWindow
      && !current.pendingOfficialAutomaticHits && !current.pendingOfficialHitsPoolChoice
      && !current.pendingCorrosiveBileResolution;
  }
  function action(current, actionType, extra = {}) {
    return { actionType, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: atomIds,
      sideKey: current.activeSideKey, phase: current.phase, stateHash: hash(current), ...extra };
  }
  function remaining(current, parent, sideKey) {
    return parent.sourceIdsAtStart.filter(row => row.sideKey === sideKey && !parent.processedSourceIds.includes(row.pieceId)
      && active(sourcePiece(current, row.pieceId))).map(row => row.pieceId).sort();
  }
  function nextGroup(current, parent) {
    return resolveOfficialNextControllerEffectGroupV1({
      playerSideKeys: sides, prioritySideKey: parent.activePlayerSideKey,
      pendingEffects: sides.flatMap(side => remaining(current, parent, side).map(effectId => ({
        effectId, controllerSideKey: side,
      }))),
    });
  }
  function enumerate(current, options = {}) {
    const parent = pending(current);
    if ((options.sideKey || current.activeSideKey) !== current.activeSideKey) return { candidates: [], parameterDomains: [] };
    if (!parent) return { parameterDomains: [], candidates: canStart(current)
      ? [{ ...action(current, 'begin_sabotage_drone_phase_end'), isEnabled: true }] : [] };
    if (parent.stage === 'hits') throw Error('SABOTAGE_DRONE_HITS_CONTINUATION_REQUIRED');
    if (parent.stage === 'complete') return { parameterDomains: [], candidates: [
      { ...action(current, 'complete_sabotage_drone_phase_end', { parentHash: parent.parentHash }), isEnabled: true }] };
    const group = nextGroup(current, parent);
    if (group.controllerSideKey !== parent.ownerSideKey) throw Error('SABOTAGE_DRONE_EFFECT_ORDER_OWNER_STALE');
    const body = { schemaVersion: 'starcraft_tmg_official_parameter_domain_v1', parameterKind: 'sabotage_drone_source_order_v1',
      actionType: 'choose_sabotage_drone_source', executorId: runtimeId, executorVersion: runtimeVersion,
      sideKey: parent.ownerSideKey, phase: current.phase, parameterSchema: { type: 'object', required: ['sourcePieceId'],
        sourcePieceId: { enum: group.availableEffectIds } }, constraints: { parentHash: parent.parentHash },
      confirmationClass: 'rules_owned_effect_order', trainingTruth: false };
    return { candidates: [], parameterDomains: [{ ...body, domainId: 'sabotage-order-' + hash(body) }] };
  }
  function instantiate(current, domain, parameters) {
    if (!isDeepStrictEqual(enumerate(current).parameterDomains[0], domain) || !parameters
      || Object.keys(parameters).join(',') !== 'sourcePieceId'
      || !domain.parameterSchema.sourcePieceId.enum.includes(parameters.sourcePieceId)) throw Error('SABOTAGE_DRONE_SOURCE_CHOICE_INVALID');
    const scope = projectSource(current, parameters.sourcePieceId);
    return { canonicalParameters: { sourcePieceId: parameters.sourcePieceId },
      action: action(current, domain.actionType, { parentHash: pending(current).parentHash,
        sourcePieceId: parameters.sourcePieceId, scopeHash: scope.scopeHash }) };
  }
  function chooseNext(current, parent) {
    const { controllerSideKey: owner } = nextGroup(current, parent);
    current.activeSideKey = owner || parent.activePlayerSideKey;
    current[parentKey] = seal({ ...withoutHash(parent), stage: owner ? 'choose' : 'complete',
      ownerSideKey: current.activeSideKey, currentScope: null, work: [], workIndex: 0, currentTargetUnitIds: [] });
  }
  function openNextHits(current, parent, events) {
    let index = parent.workIndex;
    while (index < parent.work.length) {
      const work = parent.work[index];
      const targetUnitIds = work.targetUnitIds.filter(id => active(current.pieces.find(piece => piece.id === id)));
      if (targetUnitIds.length) {
        current[parentKey] = seal({ ...withoutHash(parent), stage: 'hits', workIndex: index, currentTargetUnitIds: targetUnitIds });
        const sourceSideKey = parent.currentScope.sideKey;
        current.activeSideKey = sourceSideKey;
        current.pendingOfficialAutomaticHits = seal({ schema: 'starcraft_tmg_automatic_hits_source_checkpoint_v1',
          round: Number(current.round), phase: current.phase, sideKey: sourceSideKey, pieceId: parent.currentScope.sourcePieceId,
          definitionId: route.definitionId, sourceFeatureHash: route.sourceFeatureHash, sourceRouteHash: source.bundleHash,
          abilityName: route.abilityName, sourcePlanHash: parent.currentScope.scopeHash, stage: 'ready',
          automaticHits: { targetUnitIds, hits: work.hits, damagePerHit: route.damagePerHit },
          sabotageSource: { queueHash: current[parentKey].parentHash, workIndex: index }, trainingTruth: false });
        events.push({ type: 'sabotage_drone_hits_declared', pieceId: parent.currentScope.sourcePieceId,
          batchKind: work.kind, targetUnitIds, hitsPerUnit: work.hits, damagePerHit: route.damagePerHit,
          hitRollRequired: false, surgeAllowed: false, scopeHash: parent.currentScope.scopeHash });
        return;
      }
      events.push({ type: 'sabotage_drone_destroyed_targets_skipped', batchKind: work.kind, targetUnitIds: work.targetUnitIds });
      index++;
    }
    events.push({ type: 'sabotage_drone_source_effect_completed', sourcePieceId: parent.currentScope.sourcePieceId,
      scopeHash: parent.currentScope.scopeHash });
    if (parent.sharedOrderOwned) {
      current[effectHistoryKey] = [...(current[effectHistoryKey] || []), { round: Number(current.round),
        sourcePieceId: parent.currentScope.sourcePieceId, scopeHash: parent.currentScope.scopeHash }];
      delete current[parentKey];
    } else chooseNext(current, { ...parent, processedSourceIds: [...parent.processedSourceIds, parent.currentScope.sourcePieceId] });
  }
  function beginSource(next, parent, scope, events) {
    openNextHits(next, { ...parent, currentScope: scope, workIndex: 0, work: [
      { kind: 'base', targetUnitIds: scope.targets.map(row => row.targetUnitId), hits: route.hits },
      { kind: 'structure_bonus', targetUnitIds: scope.targets.filter(row => row.isStructure).map(row => row.targetUnitId),
        hits: route.additionalStructureHits }] }, events);
  }
  function apply(current, applied, options = {}) {
    const ordered = includeSharedOrder && applied.actionType === orderedAction;
    const menu = ordered ? null : enumerate(current);
    const expected = ordered ? orderedCandidate(current, applied.pieceId) : applied.actionType === 'choose_sabotage_drone_source'
      ? instantiate(current, menu.parameterDomains[0], { sourcePieceId: applied.sourcePieceId }).action
      : menu.candidates[0] && Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) => key !== 'isEnabled'));
    if (!isDeepStrictEqual(expected, applied) || options.chanceReveals?.length) throw Error('SABOTAGE_DRONE_PHASE_END_ACTION_STALE');
    const next = structuredClone(current); const events = [];
    if (ordered) {
      beginSource(next, { schema: 'starcraft_tmg_sabotage_drone_phase_end_v1', policyHash: policy.policyHash,
        round: Number(next.round), phase: next.phase, sharedOrderOwned: true, trainingTruth: false },
        projectSource(current, applied.pieceId), events);
    } else if (applied.actionType === 'begin_sabotage_drone_phase_end') {
      chooseNext(next, { schema: 'starcraft_tmg_sabotage_drone_phase_end_v1', policyHash: policy.policyHash,
        round: Number(next.round), phase: next.phase, activePlayerSideKey: next.activeSideKey, resumeSideKey: next.activeSideKey,
        sourceIdsAtStart: sourcePieces(next).map(piece => ({ pieceId: piece.id, sideKey: piece.sideKey })), processedSourceIds: [],
        work: [], workIndex: 0, trainingTruth: false });
      events.push({ type: 'sabotage_drone_phase_end_opened', activePlayerSideKey: current.activeSideKey });
    } else if (applied.actionType === 'complete_sabotage_drone_phase_end') {
      next.activeSideKey = pending(current).resumeSideKey;
      next.sabotageDronePhaseEndCompletedRound = Number(next.round); delete next[parentKey];
      events.push({ type: 'sabotage_drone_phase_end_completed', round: Number(next.round) });
    } else {
      const scope = projectSource(current, applied.sourcePieceId); const parent = pending(current);
      beginSource(next, parent, scope, events);
    }
    next.log = [...(next.log || []), { id: 'log-' + ((next.log || []).length + 1), round: Number(next.round),
      phase: next.phase, action: structuredClone(applied), events: structuredClone(events) }];
    return { ok: true, runtimeId, runtimeVersion, state: next, action: applied, events, trainingTruth: false };
  }
  function afterHits(result) {
    const parent = pending(result.state);
    if (!parent || parent.stage !== 'hits' || result.state.pendingOfficialAutomaticHits) return result;
    if (!result.events.some(event => event.type === 'automatic_hits_complete')) throw Error('SABOTAGE_DRONE_HITS_RECEIPT_REQUIRED');
    const next = structuredClone(result.state); const events = [...result.events];
    openNextHits(next, { ...parent, workIndex: parent.workIndex + 1 }, events);
    if (next.log?.length) next.log.at(-1).events = structuredClone(events);
    return { ...result, state: next, events };
  }
  const sourceAuthority = { schema: 'starcraft_tmg_automatic_hits_source_authority_v1', sourceBundleHash: source.bundleHash,
    reactionTiming: 'outside_activation', owns: parent => parent.definitionId === route.definitionId,
    validate(current, hitsParent) {
      const parent = pending(current); const work = parent?.work[parent.workIndex];
      return Boolean(parent?.stage === 'hits' && work
        && hitsParent.sabotageSource?.queueHash === parent.parentHash && hitsParent.sabotageSource.workIndex === parent.workIndex
        && hitsParent.sourcePlanHash === parent.currentScope.scopeHash && hitsParent.sourceFeatureHash === route.sourceFeatureHash
        && hitsParent.sourceRouteHash === source.bundleHash && hitsParent.pieceId === parent.currentScope.sourcePieceId
        && hitsParent.sideKey === parent.currentScope.sideKey && hitsParent.automaticHits.hits === work.hits
        && hitsParent.automaticHits.damagePerHit === route.damagePerHit
        && isDeepStrictEqual(hitsParent.automaticHits.targetUnitIds, parent.currentTargetUnitIds));
    } };
  function query(current, request = {}) {
    if (Object.keys(request).some(key => key !== 'sourcePieceId')) throw Error('SABOTAGE_DRONE_QUERY_PARAMETERS_INVALID');
    const body = { schema: 'starcraft_tmg_sabotage_drone_phase_end_inspection_v1', stateHash: hash(current),
      pending: pending(current), canStart: canStart(current), sourcePieceIds: sourcePieces(current).map(piece => piece.id).sort(),
      ...(request.sourcePieceId ? { scope: projectSource(current, request.sourcePieceId) } : {}),
      mutationAuthority: false, trainingTruth: false };
    return { ...body, queryReceiptHash: hash(body) };
  }
  return Object.freeze({ descriptor, sourceAuthority, canStart, pending, enumerate, instantiate, apply, afterHits, query,
    ...(includeSharedOrder ? { listOrderedEffects, orderedCandidate } : {}) });
}
