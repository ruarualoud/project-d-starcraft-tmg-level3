import { isDeepStrictEqual } from 'node:util';
import { resolveOfficialNextControllerEffectGroupV1 } from '../rule-atoms/official-ability-timing-priority-rules-kernel-v1.mjs';
import { OFFICIAL_ACTIVATION_PASS_ATOM_IDS, applyOfficialActivationPassV1, completeOfficialDeferredActivationPhaseV1,
  enumerateOfficialActivationPassActionsV1 } from '../rule-atoms/official-activation-pass-executor-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialWave3StormCommunityFootprintV1 }
  from '../source-data/official-wave3-community-geometry-v1.mjs';
import { createOfficialTargetPointFootprintV1 } from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialTargetPointSurfacePlacementV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { resolveOfficialNonLethalDamageV1 } from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import { hasOfficialNonLethalDamagePolicyV1, hasOfficialNonLethalStandardDamagePolicyV1 }
  from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { hasOfficialShieldedLifecyclePolicyV1 } from '../source-data/official-shielded-lifecycle-policy-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1, projectOfficialCharacteristicStatusFamilyModifiersV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { resolveOfficialSelectedRosterAbilityModifiersV1 } from './official-selected-roster-ability-runtime-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from './official-ranged-terrain-projection-v1.mjs';
import { projectOfficialGroundedTemplateCoverageV1 } from './official-grounded-template-coverage-v1.mjs';

const runtimeId = 'official-psionic-storm-phase-end-v1';
const actionType = 'resolve_psionic_storm_movement_end';
const assaultAction = 'resolve_psionic_storm_assault_end';
const movementChoiceAction = 'choose_psionic_storm_movement_effect';
const assaultChoiceAction = 'choose_psionic_storm_assault_effect';
const advanceAction = 'complete_psionic_storm_assault_phase';
const orderKey = 'pendingOfficialPsionicStormAssaultOrder';
const movementEndKey = 'pendingOfficialPsionicStormMovementEnd';
const orderRecordKey = 'rules_sections:iuUyObNTQ2M8xK4IUqzC';
const advancedRulesRecordKey = 'rules_sections:H3Fn8YSvEvpJZpT57qw1';
const glossaryRecordKey = 'rules_sections:FuahgilWtc8nccVSp2Vv';
const queryKind = 'psionic_storm_phase_end_plan';
const anchorSchema = 'starcraft_tmg_psionic_storm_confirmed_center_v1';
const componentKind = 'psionic_storm_blast_template';
const atomIds = ['rule-atom:confirmed-area-movement-end-non-lethal-v1'];
const sideKeys = ['player1', 'player2'];
const supportedPhases = ['movement', 'assault'];
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const overlapKey = (definitionId, targetPieceId) => JSON.stringify([definitionId, targetPieceId]);
const liveModels = piece => piece.models.filter(model => !model.isDestroyed && model.isOnField !== false);

function evadeThresholdFor(current, target, anchor) {
  const context = { attackerPieceId: anchor.pieceId, targetPieceId: target.id, attackKind: 'special_ability',
    damageKind: target.sideKey === anchor.sideKey ? 'friendly_special_ability' : 'enemy_special_ability' };
  const selected = resolveOfficialSelectedRosterAbilityModifiersV1(current, target, context);
  const source = current.officialCharacteristicStatusFamilySourceBundle;
  const characteristic = source ? projectOfficialCharacteristicStatusFamilyModifiersV1(source, current,
    { pieceId: target.id, context }) : null;
  const profile = resolveOfficialEffectiveCombatProfileV1(current, target);
  const burrowed = target.statuses.some(status => String(typeof status === 'string'
    ? status : status.statusName || status.name || status.status).toLowerCase() === 'burrowed');
  return profile.evadeThreshold !== null && (selected.evadeEligible || characteristic?.eligibleEvadeAgainstAllAttacks || burrowed)
    ? profile.evadeThreshold - Number(selected.evadeModifier || 0) : null;
}

export function createOfficialPsionicStormPhaseEndV1({ sourceRules, geometry, state, includeDefence = false, includeAssault = false,
  orderSource = null, orderProviders = [], movementTimingSource = null, sameNameSource = null, controllingPlayerSource = null,
  includeAssaultSameName = false }) {
  const blast = sourceRules?.descriptor.geometryEvidence?.components.find(row => row.componentKind === componentKind);
  if (blast?.status !== 'community_candidate' || blast.communityProfileHash !== geometry?.profileHash
    || !hasOfficialNonLethalDamagePolicyV1(state) || !hasOfficialNonLethalStandardDamagePolicyV1(state)) {
    throw Error('PSIONIC_STORM_PHASE_END_SOURCE_REQUIRED');
  }
  if (includeAssault && !includeDefence) throw Error('PSIONIC_STORM_ASSAULT_DEFENCE_REQUIRED');
  const includeOrder = Boolean(orderSource);
  const includeMovementPass = Boolean(movementTimingSource);
  const movementPassRule = movementTimingSource?.payload?.items?.[4]?.subItems?.[1];
  if (includeMovementPass && (!includeDefence || movementTimingSource.recordKey !== orderRecordKey
    || movementPassRule?.title !== '8.4.2 Passing'
    || !movementPassRule.content[0]?.value.includes('First Player Marker')
    || sourceRules.descriptor.phaseEffects.movement.kind !== 'non_lethal_damage')) {
    throw Error('PSIONIC_STORM_MOVEMENT_PASS_SOURCE_REQUIRED');
  }
  const sameNameRule = sameNameSource?.payload?.items?.[1];
  if (sameNameSource && (!includeMovementPass || sameNameSource.recordKey !== advancedRulesRecordKey
    || sameNameRule?.title !== '10.1 Special Abilities'
    || !sameNameRule.content[0]?.value.includes('same name simultaneously, their effects do not stack')
    || !sameNameRule.content[0]?.value.includes('only one instance of that ability at any given time'))) {
    throw Error('PSIONIC_STORM_SAME_NAME_SOURCE_REQUIRED');
  }
  const controllerRule = controllingPlayerSource?.payload?.items?.[0]?.subItems?.find(row => row.title === 'CONTROLLING PLAYER');
  const controllerText = controllerRule?.content[0]?.value ?? '';
  if (controllingPlayerSource && (!sameNameSource || controllingPlayerSource.recordKey !== glossaryRecordKey
    || !controllerText.includes('commands a specific Unit, model, or Token') || !controllerText.includes('They make all decisions'))) {
    throw Error('PSIONIC_STORM_CONTROLLING_PLAYER_SOURCE_REQUIRED');
  }
  if (orderProviders.length && (!includeOrder || new Set(orderProviders.map(entry => entry.kind)).size !== orderProviders.length
    || orderProviders.some(({ kind, owner }) => !kind || typeof owner.listOrderedEffects !== 'function'
      || typeof owner.orderedCandidate !== 'function'))) throw Error('PSIONIC_STORM_ORDER_PROVIDERS_INVALID');
  const orderRule = orderSource?.payload?.items?.[9]?.subItems?.[5];
  const orderText = orderRule?.content[0]?.value || '';
  if (includeOrder && (!includeAssault || orderSource.recordKey !== orderRecordKey
    || orderRule?.title !== '8.9.4 Resolve End of the Round Effects'
    || !orderText.includes('Marker</b> resolves their first')
    || !orderText.includes('that player chooses the order')
    || !orderText.includes('Each effect is fully resolved before the next begins'))) {
    throw Error('PSIONIC_STORM_ASSAULT_ORDER_SOURCE_REQUIRED');
  }
  if (includeAssaultSameName && (!includeOrder || !controllingPlayerSource)) {
    throw Error('PSIONIC_STORM_ASSAULT_SAME_NAME_SOURCE_REQUIRED');
  }
  const ruleAtomIds = [...atomIds, ...(includeAssault ? ['rule-atom:confirmed-area-assault-end-standard-damage-v1'] : []),
    ...(includeOrder ? ['rule-atom:psionic-storm-assault-effect-controller-order-v1'] : []),
    ...(includeMovementPass ? ['rule-atom:psionic-storm-movement-pass-boundary-v1'] : []),
    ...(includeOrder || includeMovementPass ? OFFICIAL_ACTIVATION_PASS_ATOM_IDS : [])];
  const damagePhases = includeAssault ? supportedPhases : ['movement'];
  const descriptor = Object.freeze(seal({ runtimeId, version: includeAssaultSameName ? '1.8.0' : controllingPlayerSource ? '1.7.0' : sameNameSource ? '1.6.0' : includeMovementPass ? '1.5.0' : orderProviders.length ? '1.4.0' : includeOrder ? '1.3.0' : includeAssault ? '1.2.0' : includeDefence ? '1.1.0' : '1.0.0',
    actions: [actionType, ...(controllingPlayerSource ? [movementChoiceAction] : []), ...(includeAssaultSameName ? [assaultChoiceAction] : []), ...(includeAssault ? [assaultAction] : []), ...(includeOrder || includeMovementPass ? ['pass'] : []), ...(includeOrder ? [advanceAction] : [])],
    ...(includeMovementPass ? { movementPass: { sourceRule: movementPassRule.title, sourcePayloadHash: movementTimingSource.payloadHash,
      simultaneousNonLethalDamage: true, unresolvedSameNamedOverlapRejected: true,
      ...(sameNameSource ? { sameNameRule: sameNameRule.title, sameNameSourceHash: sameNameSource.payloadHash,
        equivalentOverlapResolvesOnce: true } : {}),
      ...(controllingPlayerSource ? { differentEffectChoice: 'affected_unit_controlling_player',
        controllerSourceHash: controllingPlayerSource.payloadHash } : {}) } } : {}),
    ...(includeOrder ? { phaseEndOrdering: { sourceRule: orderRule.title, sourceRecordHash: orderSource.sourceRecordHash,
      sourcePayloadHash: orderSource.payloadHash, scope: orderProviders.length ? 'shared_assault_effect_order' : 'storm_and_gale_only',
      ...(orderProviders.length ? { providerKinds: orderProviders.map(entry => entry.kind) } : {}) } } : {}), queryKind, ruleAtomIds, rulesProfileHash: sourceRules.descriptor.profileHash,
    ...(includeAssaultSameName ? { assaultSameName: { sourceHash: sameNameSource.payloadHash,
      selection: 'affected_unit_controlling_player', scope: 'one_effect_per_ability_and_target' } } : {}),
    blastProfileHash: geometry.profileHash, diameterMm: blast.diameterMm,
    sourceCenterScope: 'authority_confirmed_center', coveragePhases: supportedPhases,
    resolvedDamagePhases: damagePhases, ...(includeDefence ? { passiveEvadeScope: 'phase_end_special_ability' } : {}),
    productionRoomEligible: false, trainingTruth: false }, 'runtimeHash'));

  // The placement owner supplies a confirmed center. No client coordinate can start a phase-end action.
  function bindCenter(current, { id, pieceId, definitionId, center }) {
    const piece = current.pieces.find(row => row.id === pieceId && row.isOnField && !row.isDestroyed);
    const source = sourceRules.descriptor.definitions.find(row => row.definitionId === definitionId);
    if (current.phase !== 'movement' || !id || !piece || !sideKeys.includes(piece.sideKey)
      || piece.officialUnitRecordKey !== source?.recordKey
      || !Number.isInteger(center?.xMilliInches) || !Number.isInteger(center?.yMilliInches)
      || center.xMilliInches < 0 || center.xMilliInches > current.board.widthInches * 1000
      || center.yMilliInches < 0 || center.yMilliInches > current.board.heightInches * 1000) {
      throw Error('PSIONIC_STORM_CONFIRMED_CENTER_INVALID');
    }
    return seal({ schema: anchorSchema, id, pieceId, sideKey: piece.sideKey, definitionId,
      sourceFeatureHash: source.sourceFeatureHash, round: Number(current.round),
      center: { xMilliInches: center.xMilliInches, yMilliInches: center.yMilliInches },
      rulesProfileHash: descriptor.rulesProfileHash, trainingTruth: false }, 'anchorHash');
  }

  function anchors(current) {
    const all = current.officialPsionicStormCenters ?? [];
    const ids = new Set();
    for (const anchor of all) {
      const { anchorHash, ...body } = anchor;
      const source = sourceRules.descriptor.definitions.find(row => row.definitionId === body.definitionId);
      if (body.schema !== anchorSchema || !body.id || ids.has(body.id) || !sideKeys.includes(body.sideKey)
        || !source || source.sourceFeatureHash !== body.sourceFeatureHash
        || body.rulesProfileHash !== descriptor.rulesProfileHash || anchorHash !== hash(body)) {
        throw Error('PSIONIC_STORM_SAVED_CENTER_INVALID');
      }
      ids.add(body.id);
    }
    return all.filter(anchor => anchor.round === Number(current.round));
  }

  function plan(current, anchor) {
    const { phase } = current;
    if (!supportedPhases.includes(phase)) throw Error('PSIONIC_STORM_NO_DAMAGE_IN_PHASE');
    const source = sourceRules.descriptor.definitions.find(row => row.definitionId === anchor.definitionId);
    const caster = current.pieces.find(row => row.id === anchor.pieceId && row.sideKey === anchor.sideKey
      && row.officialUnitRecordKey === source.recordKey && row.isOnField && !row.isDestroyed);
    const rollModifier = caster ? sourceRules.query(current, { queryKind: sourceRules.descriptor.queryKind,
      sideKey: anchor.sideKey, pieceId: caster.id, definitionId: source.definitionId, resolutionPhase: phase }).result.rollModifier : 0;
    const hitThreshold = source.baseSuccessThreshold - rollModifier;
    const template = createOfficialWave3StormCommunityFootprintV1({ profile: geometry, componentKind, center: anchor.center });
    const point = createOfficialTargetPointFootprintV1({ objectId: anchor.id, center: anchor.center });
    const pointSurface = deriveOfficialTargetPointSurfacePlacementV2(current, point);
    const projected = projectOfficialRangedTerrainForLosV1(current).projected;
    projected.board = { ...projected.board, widthInches: current.board.widthInches, heightInches: current.board.heightInches };
    const assessments = projectOfficialGroundedTemplateCoverageV1({ current, template, point, pointSurface, projected });
    const affected = new Map();
    for (const row of assessments.filter(row => row.affected)) {
      if (!affected.has(row.pieceId)) affected.set(row.pieceId, []);
      affected.get(row.pieceId).push(row.modelId);
    }
    const dice = sourceRules.descriptor.dice;
    const damage = sourceRules.descriptor.phaseEffects[phase];
    const batches = [...affected.entries()].sort(([left], [right]) => left.localeCompare(right))
      .map(([targetPieceId, models]) => ({
        targetPieceId, coveredModelIds: models.sort(),
        dice: dice.baseDicePerAffectedUnit + dice.extraDicePerCoveredModel * models.length,
        hitThreshold, kind: damage.kind, damagePerSuccess: damage.damagePerSuccess,
        ...(includeDefence ? { evadeThreshold: evadeThresholdFor(current,
          current.pieces.find(piece => piece.id === targetPieceId), anchor) } : {}),
      }));
    return seal({ anchorHash: anchor.anchorHash, phase, sourcePieceId: anchor.pieceId, casterStillPresent: Boolean(caster),
      rollModifier, template, pointSurface, assessments, batches, trainingTruth: false }, 'planHash');
  }

  function remaining(current) {
    return anchors(current).filter(anchor => !current.officialPsionicStormPhaseEndHistory?.some(row =>
      row.anchorHash === anchor.anchorHash && row.phase === current.phase && row.round === current.round));
  }

  function orderEntries(current) {
    const winds = remaining(current).map(anchor => ({ anchor, kind: 'storm_phase_end', effectId: anchor.id, controllerSideKey: anchor.sideKey }));
    return [...winds, ...orderProviders.flatMap(provider => provider.owner.listOrderedEffects(current)
      .map(entry => ({ ...entry, kind: provider.kind, effectId: provider.kind + ':' + entry.effectId, externalEffectId: entry.effectId })))];
  }

  function hasOrderRuleTrigger(current) {
    return remaining(current).length > 0 || orderProviders.some(provider => provider.kind === 'bile_resolution'
      && provider.owner.listOrderedEffects(current).length > 0);
  }

  function order(current) {
    if (!includeOrder || !current[orderKey]) return null;
    const { orderHash, ...body } = current[orderKey];
    if (current.phase !== 'assault' || body.round !== current.round || !sideKeys.includes(body.prioritySideKey)
      || body.runtimeHash !== descriptor.runtimeHash || orderHash !== hash(body)
      || !isDeepStrictEqual(body.anchorHashes, anchors(current).map(anchor => anchor.anchorHash).sort())
      || (includeAssaultSameName && !Array.isArray(body.choices))
      || (orderProviders.length && orderEntries(current).some(row => !body.effectIds?.includes(row.effectId)))) {
      throw Error('PSIONIC_STORM_ASSAULT_ORDER_CHECKPOINT_INVALID');
    }
    return current[orderKey];
  }

  function nextGroup(current, ordered) {
    const ready = orderEntries(current);
    const group = resolveOfficialNextControllerEffectGroupV1({ playerSideKeys: sideKeys,
      prioritySideKey: ordered.prioritySideKey, pendingEffects: ready });
    const entries = ready.filter(entry => group.availableEffectIds.includes(entry.effectId));
    const decision = includeAssaultSameName && entries.some(entry => entry.anchor) ? assaultDecision(current, ordered) : null;
    return { controller: decision?.sideKey ?? group.controllerSideKey ?? ordered.prioritySideKey, entries, decision };
  }

  function movementEnd(current) {
    if (!includeMovementPass || !current[movementEndKey]) return null;
    const { boundaryHash, ...body } = current[movementEndKey];
    if (current.phase !== 'movement' || body.round !== current.round || body.prioritySideKey !== current.firstPlayerSideKey
      || !sideKeys.includes(body.prioritySideKey) || body.runtimeHash !== descriptor.runtimeHash || boundaryHash !== hash(body)
      || !isDeepStrictEqual(body.anchorHashes, remaining(current).map(anchor => anchor.anchorHash).sort())) {
      throw Error('PSIONIC_STORM_MOVEMENT_END_CHECKPOINT_INVALID');
    }
    return current[movementEndKey];
  }

  function canUsePass(current) {
    const ownsMovement = includeMovementPass && current.phase === 'movement' && !movementEnd(current) && remaining(current).length > 0;
    const ownsAssault = includeOrder && current.phase === 'assault' && !order(current) && hasOrderRuleTrigger(current);
    return (ownsMovement || ownsAssault)
      && !current.selectedRosterActivationWindow && !current.pendingAction && !current.pendingOfficialReactionWindow
      && !current.pendingOfficialAutomaticHits && !current.pendingOfficialHitsPoolChoice
      && !sideKeys.every(side => current.players[side]?.passedPhases?.[current.phase] === true);
  }

  function enumeratePass(current, options) {
    if (!canUsePass(current)) return [];
    return enumerateOfficialActivationPassActionsV1(current, options);
  }

  function applyPass(current, action, options) {
    const expected = enumeratePass(current, { sideKey: action.sideKey }).find(row => row.isEnabled);
    if (!expected || !isDeepStrictEqual(Object.fromEntries(Object.entries(expected).filter(([key]) =>
      !['isEnabled', 'disabledReason', 'score', 'details'].includes(key))), action)) throw Error('PSIONIC_STORM_PASS_STALE');
    const result = applyOfficialActivationPassV1(current, action, { ...options, deferPhaseCompletion: true });
    if (!result.events.some(event => event.type === 'phase_completion_deferred')) return result;
    const state = result.state;
    if (state.phase === 'movement') {
      state[movementEndKey] = seal({ round: state.round, runtimeHash: descriptor.runtimeHash,
        prioritySideKey: state.firstPlayerSideKey, anchorHashes: remaining(state).map(anchor => anchor.anchorHash).sort(),
        ...(controllingPlayerSource ? { choices: [] } : {}) }, 'boundaryHash');
      if (controllingPlayerSource) {
        const decision = movementDecision(state, state[movementEndKey], movementEntries(state));
        state.activeSideKey = decision?.sideKey ?? state.firstPlayerSideKey;
        result.events.at(-1).activeSideKey = state.activeSideKey;
        state.log.at(-1).events = structuredClone(result.events);
      }
      return result;
    }
    state[orderKey] = seal({ round: state.round, runtimeHash: descriptor.runtimeHash,
      prioritySideKey: state.firstPlayerSideKey, anchorHashes: anchors(state).map(anchor => anchor.anchorHash).sort(),
      ...(includeAssaultSameName ? { choices: [] } : {}),
      ...(orderProviders.length ? { effectIds: orderEntries(state).map(entry => entry.effectId).sort() } : {}) }, 'orderHash');
    state.activeSideKey = nextGroup(state, state[orderKey]).controller;
    result.events.at(-1).activeSideKey = state.activeSideKey;
    state.log.at(-1).events = structuredClone(result.events);
    return result;
  }

  function pending(current) {
    if (!damagePhases.includes(current.phase) || !sideKeys.every(side => current.players[side]?.passedPhases?.[current.phase] === true)
      || current.selectedRosterActivationWindow || current.pendingAction || current.pendingOfficialReactionWindow
      || (includeAssault && current.pendingOfficialAutomaticHits)) return null;
    const batch = movementEnd(current);
    if (batch) return batch;
    const ordered = order(current);
    if (ordered) return ordered;
    const ready = remaining(current);
    if (includeMovementPass && current.phase === 'movement' && ready.length) throw Error('PSIONIC_STORM_MOVEMENT_END_CHECKPOINT_REQUIRED');
    if (includeOrder && current.phase === 'assault' && hasOrderRuleTrigger(current)) throw Error('PSIONIC_STORM_ASSAULT_ORDER_CHECKPOINT_REQUIRED');
    if (ready.length > 1) throw Error(current.phase === 'assault'
      ? 'PSIONIC_STORM_MULTIPLE_ASSAULT_END_ORDER_REQUIRED' : 'PSIONIC_STORM_MULTIPLE_MOVEMENT_END_ORDER_REQUIRED');
    return ready[0] ?? null;
  }

  function chanceFor(batches) {
    const hit = batches.reduce((total, batch) => total + batch.dice, 0);
    const evade = includeDefence ? batches.reduce((total, batch) =>
      total + (batch.evadeThreshold === null ? 0 : batch.dice), 0) : 0;
    const layout = evade ? { hit, evade } : { hit };
    return hit ? { chance: { kind: 'fixed_roll_sequence', faces: 6, count: hit + evade,
      layout, revealOrder: Object.keys(layout) } } : {};
  }

  function prepared(current, anchor, ordered = order(current)) {
    const projection = includeAssaultSameName && ordered ? assaultProjection(current, ordered, anchor) : plan(current, anchor);
    const action = { actionType: current.phase === 'assault' ? assaultAction : actionType, sideKey: current.activeSideKey,
      ...(current.phase === 'assault' ? { pieceId: anchor.pieceId } : {}),
      ...(ordered ? { anchorId: anchor.id, abilityName: anchor.definitionId.includes('gale') ? 'Psionic Gale' : 'Psionic Storm' } : {}),
      phase: current.phase, executorId: runtimeId, executorVersion: descriptor.version, ruleAtomIds, planHash: projection.planHash,
      stateHash: hash(current), ...chanceFor(projection.batches) };
    return { action, projection };
  }

  function movementEntries(current) {
    return remaining(current).sort((a, b) => a.id.localeCompare(b.id))
      .map(anchor => ({ anchor, projection: plan(current, anchor) }));
  }

  function overlapGroups(entries) {
    const groups = new Map();
    for (const { anchor, projection } of entries) {
      for (const batch of projection.batches) {
        const key = overlapKey(anchor.definitionId, batch.targetPieceId);
        const group = groups.get(key) ?? [];
        group.push({ anchor, batch, planHash: projection.planHash });
        groups.set(key, group);
      }
    }
    return groups;
  }

  function movementDecision(current, checkpoint, entries) {
    if (!controllingPlayerSource) return null;
    const groups = overlapGroups(entries);
    const decisions = [];
    for (const [key, options] of groups) {
      if (options.every(option => isDeepStrictEqual(options[0].batch, option.batch))
        || checkpoint.choices.some(choice => choice.key === key)) continue;
      const targetId = options[0].batch.targetPieceId;
      const sideKey = current.pieces.find(piece => piece.id === targetId)?.sideKey;
      if (!sideKeys.includes(sideKey)) throw Error('PSIONIC_STORM_MOVEMENT_EFFECT_CONTROLLER_REQUIRED');
      decisions.push({ key, targetId, sideKey, options });
    }
    return decisions.find(row => row.sideKey === checkpoint.prioritySideKey) ?? decisions[0] ?? null;
  }

  function movementChoiceActions(current, checkpoint, decision) {
    if (current.activeSideKey !== decision.sideKey) throw Error('PSIONIC_STORM_MOVEMENT_EFFECT_OWNER_STALE');
    return decision.options.map(({ anchor, batch, planHash }) => ({
      actionType: movementChoiceAction, sideKey: decision.sideKey, phase: current.phase, pieceId: decision.targetId,
      abilityName: anchor.definitionId.includes('gale') ? 'Psionic Gale' : 'Psionic Storm',
      executorId: runtimeId, executorVersion: descriptor.version, ruleAtomIds, stateHash: hash(current),
      boundaryHash: checkpoint.boundaryHash, choiceKey: decision.key, anchorId: anchor.id, anchorHash: anchor.anchorHash,
      sourcePieceId: anchor.pieceId, planHash, effect: batch,
    }));
  }

  function applyMovementChoice(current, checkpoint, entries, decision, action, options) {
    if (options.chanceReveals?.length || !movementChoiceActions(current, checkpoint, decision)
      .some(candidate => isDeepStrictEqual(candidate, action))) throw Error('PSIONIC_STORM_MOVEMENT_EFFECT_CHOICE_INVALID');
    const state = structuredClone(current);
    const { boundaryHash, choices, ...binding } = checkpoint;
    state[movementEndKey] = seal({ ...binding, choices: [...choices, { key: action.choiceKey, anchorHash: action.anchorHash }] }, 'boundaryHash');
    const next = movementDecision(state, state[movementEndKey], entries);
    state.activeSideKey = next?.sideKey ?? checkpoint.prioritySideKey;
    return transition(current, state, action, [{ type: 'psionic_storm_movement_effect_chosen', targetPieceId: action.pieceId,
      chosenBySideKey: action.sideKey, chosenAnchorHash: action.anchorHash, previousBoundaryHash: boundaryHash,
      nextSideKey: state.activeSideKey, trainingTruth: false }]);
  }

  function movementBatch(current, checkpoint, entries) {
    const selectedByGroup = new Map();
    for (const [key, group] of overlapGroups(entries)) {
      const equivalent = group.every(item => isDeepStrictEqual(item.batch, group[0].batch));
      const choice = checkpoint.choices?.find(row => row.key === key);
      const selected = choice ? group.find(row => row.anchor.anchorHash === choice.anchorHash) : group[0];
      if (!selected || group.length > 1 && (!sameNameSource || !equivalent && !choice)) {
        throw Error('PSIONIC_STORM_MOVEMENT_SAME_NAMED_OVERLAP_ORDER_UNRESOLVED');
      }
      selectedByGroup.set(key, { selected, equivalent });
    }
    const batches = [];
    const overlappingEffects = [];
    for (const { anchor, projection } of entries) {
      for (const batch of projection.batches) {
        const key = overlapKey(anchor.definitionId, batch.targetPieceId);
        const { selected, equivalent } = selectedByGroup.get(key);
        if (selected.anchor === anchor) {
          batches.push({ ...batch, anchorHash: anchor.anchorHash, planHash: projection.planHash });
        } else {
          overlappingEffects.push({ targetPieceId: batch.targetPieceId, definitionId: anchor.definitionId,
            appliedAnchorHash: selected.anchor.anchorHash,
            ...(equivalent ? { sameEffectAnchorHash: anchor.anchorHash } : { declinedAnchorHash: anchor.anchorHash }) });
        }
      }
    }
    const action = { actionType, sideKey: checkpoint.prioritySideKey, phase: current.phase, executorId: runtimeId,
      executorVersion: descriptor.version, ruleAtomIds, boundaryHash: checkpoint.boundaryHash, stateHash: hash(current),
      planHash: hash(entries.map(entry => entry.projection.planHash)), ...chanceFor(batches) };
    return { action, batches, entries, overlappingEffects };
  }


  function assaultResolvedTargets(current) {
    return new Set((current.officialPsionicStormPhaseEndHistory ?? [])
      .filter(row => row.phase === current.phase && row.round === current.round)
      .flatMap(row => (row.batches ?? []).map(batch => overlapKey(row.definitionId, batch.targetPieceId))));
  }

  function assaultDecision(current, ordered) {
    const available = remaining(current);
    if (new Set(available.map(anchor => anchor.definitionId)).size === available.length) return null;
    const resolved = assaultResolvedTargets(current);
    const entries = available.map(anchor => ({ anchor, projection: plan(current, anchor) }));
    const decisions = [];
    for (const [key, options] of overlapGroups(entries)) {
      if (resolved.has(key) || options.every(option => isDeepStrictEqual(options[0].batch, option.batch))
        || options.some(option => ordered.choices.some(choice => choice.key === key && choice.anchorHash === option.anchor.anchorHash))) {
        continue;
      }
      const targetId = options[0].batch.targetPieceId;
      const sideKey = current.pieces.find(piece => piece.id === targetId)?.sideKey;
      if (!sideKeys.includes(sideKey)) throw Error('PSIONIC_STORM_ASSAULT_EFFECT_CONTROLLER_REQUIRED');
      decisions.push({ key, targetId, sideKey, options });
    }
    return decisions.find(row => row.sideKey === ordered.prioritySideKey) ?? decisions[0] ?? null;
  }

  function assaultProjection(current, ordered, anchor) {
    const projection = plan(current, anchor);
    const resolved = assaultResolvedTargets(current);
    const choices = new Map(ordered.choices.map(choice => [choice.key, choice.anchorHash]));
    const chosenAnchors = new Map(remaining(current).filter(candidate => candidate.definitionId === anchor.definitionId)
      .map(candidate => [candidate.anchorHash, candidate]));
    const chosenPlans = new Map();
    const excluded = [];
    const batches = projection.batches.filter(batch => {
      const key = overlapKey(anchor.definitionId, batch.targetPieceId);
      let reason = resolved.has(key) ? 'same_name_already_resolved' : null;
      const chosenHash = choices.get(key);
      if (!reason && chosenHash && chosenHash !== anchor.anchorHash && chosenAnchors.has(chosenHash)) {
        if (!chosenPlans.has(chosenHash)) chosenPlans.set(chosenHash, plan(current, chosenAnchors.get(chosenHash)));
        if (chosenPlans.get(chosenHash).batches.some(row => row.targetPieceId === batch.targetPieceId)) reason = 'same_name_other_instance_selected';
      }
      if (reason) excluded.push({ targetPieceId: batch.targetPieceId, reason });
      return !reason;
    });
    if (!excluded.length) return projection;
    const { planHash: unfilteredPlanHash, ...body } = projection;
    return seal({ ...body, batches, excludedSameNameTargets: excluded, unfilteredPlanHash }, 'planHash');
  }

  function assaultChoiceActions(current, ordered, decision) {
    return movementChoiceActions(current, { boundaryHash: ordered.orderHash }, decision).map(action => ({
      ...action, actionType: assaultChoiceAction,
    }));
  }

  function applyAssaultChoice(current, ordered, decision, action, options) {
    if (options.chanceReveals?.length || !assaultChoiceActions(current, ordered, decision)
      .some(candidate => isDeepStrictEqual(candidate, action))) throw Error('PSIONIC_STORM_ASSAULT_EFFECT_CHOICE_INVALID');
    const state = structuredClone(current);
    const { orderHash, choices, ...binding } = ordered;
    state[orderKey] = seal({ ...binding, choices: [
      ...choices.filter(choice => choice.key !== action.choiceKey), { key: action.choiceKey, anchorHash: action.anchorHash },
    ] }, 'orderHash');
    state.activeSideKey = nextGroup(state, state[orderKey]).controller;
    return transition(current, state, action, [{ type: 'psionic_storm_assault_effect_chosen', targetPieceId: action.pieceId,
      chosenBySideKey: action.sideKey, chosenAnchorHash: action.anchorHash, previousBoundaryHash: orderHash,
      nextSideKey: state.activeSideKey, trainingTruth: false }]);
  }

  function advance(current, ordered) {
    return { actionType: advanceAction, sideKey: ordered.prioritySideKey, phase: current.phase,
      executorId: runtimeId, executorVersion: descriptor.version, ruleAtomIds, stateHash: hash(current), orderHash: ordered.orderHash };
  }

  function enumerate(current, options = {}) {
    const active = pending(current);
    const ordered = order(current);
    const visible = active && (options.sideKey || current.activeSideKey) === current.activeSideKey;
    let candidates = [];
    const movement = movementEnd(current);
    if (visible && movement) {
      const entries = movementEntries(current);
      const decision = movementDecision(current, movement, entries);
      candidates = decision ? movementChoiceActions(current, movement, decision) : [movementBatch(current, movement, entries).action];
    } else if (visible && ordered) {
      const group = nextGroup(current, ordered);
      if (group.controller !== current.activeSideKey) throw Error('PSIONIC_STORM_ASSAULT_ORDER_OWNER_STALE');
      candidates = group.decision ? assaultChoiceActions(current, ordered, group.decision)
        : group.entries.length ? group.entries.map(entry => {
        if (entry.anchor) return prepared(current, entry.anchor, ordered).action;
        const provider = orderProviders.find(value => value.kind === entry.kind);
        const candidate = provider.owner.orderedCandidate(current, entry.externalEffectId);
        if (!candidate) throw Error('PSIONIC_STORM_ORDERED_EFFECT_CONSUMER_UNAVAILABLE:' + entry.kind);
        return { ...candidate, phaseEndSourceKind: entry.kind };
      }) : [advance(current, ordered)];
    } else if (visible) candidates = [prepared(current, active).action];
    return { candidates: candidates.map(candidate => ({ ...candidate, isEnabled: true })), parameterDomains: [] };
  }

  function query(current, request) {
    const anchor = typeof request?.anchorId === 'string' && anchors(current).find(row => row.id === request.anchorId);
    if (!anchor || Object.keys(request).some(key => !['anchorId', 'queryKind'].includes(key))) {
      throw Error('PSIONIC_STORM_PHASE_END_QUERY_INVALID');
    }
    const ordered = includeAssaultSameName ? order(current) : null;
    const projection = ordered ? assaultProjection(current, ordered, anchor) : plan(current, anchor);
    const decision = ordered ? nextGroup(current, ordered).decision : null;
    return seal({ result: projection, ...(decision ? { pendingOverlapChoice: { targetPieceId: decision.targetId,
      controllingSideKey: decision.sideKey } } : {}), stateHash: hash(current), mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }

  function apply(current, action, options = {}) {
    const active = pending(current);
    const ordered = order(current);
    const group = active && ordered ? nextGroup(current, ordered) : null;
    if (group?.decision) return applyAssaultChoice(current, ordered, group.decision, action, options);
    if (group && !group.entries.length && isDeepStrictEqual(advance(current, ordered), action)) {
      if (options.chanceReveals?.length || current.activeSideKey !== ordered.prioritySideKey) throw Error('PSIONIC_STORM_ADVANCE_INVALID');
      const { state, events } = completeOfficialDeferredActivationPhaseV1(current, 'assault');
      delete state[orderKey];
      state.log.push({ id: 'log-' + (state.log.length + 1), round: state.round, phase: current.phase,
        action: structuredClone(action), events: structuredClone(events) });
      return { ok: true, runtimeId, runtimeVersion: descriptor.version, state, action, events, trainingTruth: false };
    }
    const checkpoint = movementEnd(current);
    const entries = checkpoint && active ? movementEntries(current) : null;
    const decision = entries ? movementDecision(current, checkpoint, entries) : null;
    if (decision) return applyMovementChoice(current, checkpoint, entries, decision, action, options);
    const movement = entries ? movementBatch(current, checkpoint, entries) : null;
    const anchor = group ? group.entries.find(entry => entry.anchor?.id === action.anchorId
      && group.controller === current.activeSideKey)?.anchor : active;
    const expected = movement || (anchor && prepared(current, anchor, ordered));
    if (!expected || !isDeepStrictEqual(expected.action, action)) throw Error('PSIONIC_STORM_PHASE_END_ACTION_STALE');
    const rolls = (options.chanceReveals ?? []).map(row => typeof row === 'object' && row !== null ? row.outcome : row);
    if (rolls.length !== (action.chance?.count ?? 0) || rolls.some(value => !Number.isInteger(value) || value < 1 || value > 6)) {
      throw Error('PSIONIC_STORM_PHASE_END_DICE_INVALID');
    }
    const state = structuredClone(current);
    const events = [];
    const resolvedBatches = [];
    let offset = 0, evadeOffset = action.chance?.layout.hit ?? 0;
    for (const batch of movement ? movement.batches : expected.projection.batches) {
      const batchRolls = rolls.slice(offset, offset + batch.dice);
      offset += batch.dice;
      const target = state.pieces.find(row => row.id === batch.targetPieceId);
      const models = liveModels(target);
      const successes = batchRolls.filter(value => value >= batch.hitThreshold).length;
      const evadeEligible = includeDefence && batch.evadeThreshold !== null;
      const evadeRolls = evadeEligible ? rolls.slice(evadeOffset, evadeOffset + successes) : [];
      if (evadeEligible) evadeOffset += batch.dice;
      const evaded = evadeRolls.filter(value => value === 6 || (value !== 1 && value >= batch.evadeThreshold)).length;
      const amount = (successes - evaded) * batch.damagePerSuccess;
      if (state.phase === 'assault') {
        resolvedBatches.push({ targetPieceId: target.id, coveredModelIds: batch.coveredModelIds,
          rolls: batchRolls, hitThreshold: batch.hitThreshold, evadeThreshold: batch.evadeThreshold,
          successfulDamageDice: successes, evadeRolls, evaded, amount });
        continue;
      }
      const profile = resolveOfficialEffectiveCombatProfileV1(state, target);
      const resolution = resolveOfficialNonLethalDamageV1({ targetPieceId: target.id, targetModelId: models[0].id,
        abilityResolutionHash: batch.planHash ?? action.planHash, priorDamageMarker: Number(target.damageMarker || 0),
        amount, targetHitPoints: profile.hitPoints });
      if (amount > 0) {
        const shieldedBefore = target.statuses.some(status => String(typeof status === 'string'
          ? status : status.statusName || status.name).toLowerCase() === 'shielded');
        if (shieldedBefore && !hasOfficialShieldedLifecyclePolicyV1(state)) throw Error('PSIONIC_STORM_SHIELDED_CONSUMER_REQUIRED');
        applyOfficialSelectedRosterResolvedDamageV1(state, target, profile, { casualtyModelIds: [],
          remainingModelIds: models.map(row => row.id), targetDestroyed: false,
          postDamageMarker: resolution.postDamageMarker, shieldedBefore,
          shieldedAfter: shieldedBefore && resolution.postDamageMarker <= Number(profile.shield || 0) });
      }
      events.push({ type: 'psionic_storm_movement_damage_resolved', targetPieceId: target.id,
        ...(movement ? { anchorHash: batch.anchorHash, planHash: batch.planHash } : {}),
        coveredModelIds: batch.coveredModelIds, rolls: batchRolls, hitThreshold: batch.hitThreshold,
        ...(includeDefence ? { evadeThreshold: batch.evadeThreshold, evadeRolls, evaded,
          successfulDamageDice: successes } : {}),
        amount, resolution, trainingTruth: false });
    }
    if (movement) {
      const history = movement.entries.map(({ anchor, projection }) => ({ anchorHash: anchor.anchorHash, phase: state.phase,
        round: state.round, planHash: projection.planHash }));
      state.officialPsionicStormPhaseEndHistory = [...(state.officialPsionicStormPhaseEndHistory ?? []), ...history];
      delete state[movementEndKey];
      const advanced = completeOfficialDeferredActivationPhaseV1(state, 'movement');
      events.push({ type: 'psionic_storm_movement_end_batch_completed', boundaryHash: checkpoint.boundaryHash,
        anchorHashes: history.map(row => row.anchorHash), planHash: action.planHash,
        ...(movement.overlappingEffects.length ? { overlappingEffects: movement.overlappingEffects } : {}) }, ...advanced.events);
      return transition(current, advanced.state, action, events);
    }
    const entry = { anchorHash: anchor.anchorHash, phase: state.phase, round: state.round, planHash: action.planHash };
    if (state.phase === 'assault') {
      const rolled = seal({ ...entry, phaseDriverSideKey: action.sideKey, sourceSideKey: anchor.sideKey,
        pieceId: anchor.pieceId, definitionId: anchor.definitionId, sourceFeatureHash: anchor.sourceFeatureHash,
        batches: resolvedBatches, ...(expected.projection.excludedSameNameTargets
          ? { excludedSameNameTargets: expected.projection.excludedSameNameTargets } : {}) }, 'rollResultHash');
      Object.assign(entry, rolled);
      const batches = resolvedBatches.filter(batch => batch.amount > 0);
      if (batches.length) {
        state.pendingOfficialAutomaticHits = seal({ schema: 'starcraft_tmg_automatic_hits_source_checkpoint_v1',
          stage: 'ready', phase: state.phase, round: Number(state.round), sideKey: action.sideKey,
          sourceSideKey: anchor.sideKey, pieceId: anchor.pieceId, definitionId: anchor.definitionId,
          sourceFeatureHash: anchor.sourceFeatureHash, sourceRouteHash: descriptor.runtimeHash, sourcePlanHash: action.planHash,
          rollResultHash: rolled.rollResultHash, directDamage: { targetUnitIds: batches.map(batch => batch.targetPieceId), batches },
          trainingTruth: false }, 'parentHash');
      }
      events.push({ type: 'psionic_storm_assault_end_rolled', ...rolled });
    } else {
      events.push({ type: 'psionic_storm_movement_end_completed', anchorHash: anchor.anchorHash, planHash: action.planHash });
    }
    state.officialPsionicStormPhaseEndHistory = [...(state.officialPsionicStormPhaseEndHistory ?? []), entry];
    return transition(current, state, action, events);
  }

  function transition(before, state, action, events) {
    state.log = [...(state.log ?? []), { id: 'log-' + ((state.log?.length ?? 0) + 1), round: state.round,
      phase: before.phase, action: structuredClone(action), events: structuredClone(events) }];
    return { ok: true, runtimeId, runtimeVersion: descriptor.version, state, action: structuredClone(action), events, trainingTruth: false };
  }

  const sourceAuthority = includeAssault ? Object.freeze({
    schema: 'starcraft_tmg_automatic_hits_source_authority_v1', sourceBundleHash: descriptor.runtimeHash,
    resolvedDirectDamage: true, reactionTiming: 'outside_activation',
    owns: parent => typeof parent.rollResultHash === 'string' && parent.sourceRouteHash === descriptor.runtimeHash,
    validate(current, parent) {
      const rolled = current.officialPsionicStormPhaseEndHistory?.find(entry => entry.rollResultHash === parent.rollResultHash);
      if (!rolled) return false;
      const { rollResultHash, ...body } = rolled;
      const anchor = anchors(current).find(entry => entry.anchorHash === rolled.anchorHash);
      const batches = rolled.batches.filter(batch => batch.amount > 0);
      return Boolean(anchor && rollResultHash === hash(body) && rolled.planHash === parent.sourcePlanHash
        && rolled.round === parent.round && rolled.phase === parent.phase && rolled.phase === 'assault'
        && rolled.phaseDriverSideKey === parent.sideKey && anchor.sideKey === parent.sourceSideKey
        && anchor.definitionId === parent.definitionId && anchor.pieceId === parent.pieceId
        && anchor.sourceFeatureHash === parent.sourceFeatureHash
        && isDeepStrictEqual(parent.directDamage, { targetUnitIds: batches.map(batch => batch.targetPieceId), batches }));
    },
  }) : null;
  function afterTransition(result) {
    const state = result.state;
    if (!order(state) || state.pendingOfficialAutomaticHits || state.pendingOfficialReactionWindow || state.pendingOfficialHitsPoolChoice) return result;
    const sideKey = nextGroup(state, state[orderKey]).controller;
    if (state.activeSideKey === sideKey) return result;
    return { ...result, state: { ...state, activeSideKey: sideKey } };
  }

  return Object.freeze({ descriptor, bindCenter, pending, enumerate, query, apply, ...(sourceAuthority ? { sourceAuthority } : {}),
    ...(includeOrder || includeMovementPass ? { canUsePass, enumeratePass, applyPass, afterTransition } : {}) });
}
