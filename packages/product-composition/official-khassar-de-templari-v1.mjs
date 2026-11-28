import { OFFICIAL_MELEE_SIDEARM_FINISH_ACTION } from './official-melee-sidearm-sequence-v1.mjs';
import { OFFICIAL_RANGED_CHOICE_PARENT_KEY } from './official-ranged-choice-context-v1.mjs';
import { isDeepStrictEqual } from 'node:util';
import { hasOfficialNonLethalDamagePolicyV1, hasOfficialNonLethalStandardDamagePolicyV1 }
  from '../rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { resolveOfficialNonLethalDamageV1 } from '../rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from './official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { getOfficialCardBuildPaymentProfileV1 } from '../source-data/official-card-build-payment-data-bundle-v1.mjs';
import { listOfficialPhaseActivationUnitIdsV1, isOfficialMorphActivationLockedV1, alternateOfficialPhaseActivationV1 }
  from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { isOfficialUnitVisibleForActiveAbilityV1, resolveOfficialEffectiveCombatProfileV1 }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { openOfficialSelectedRosterSpecialAbilityWindowV1 } from './official-selected-roster-ability-runtime-v1.mjs';
import {hasOfficialKhassarBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';

export const OFFICIAL_KHASSAR_DE_TEMPLARI_ID = 'card:templar_caste/khassar-de-templari-any@1';
const definitionId = OFFICIAL_KHASSAR_DE_TEMPLARI_ID;
const recordKey = 'tactical_cards:templar_caste';
const sourceText = 'Khassar de Templari <Active> <Any Phase>: Instead of performing an action, select one other Friendly Biological Unit that has already been Activated this Phase. That Unit immediately performs one action available in the current Phase, then suffers NON-LETHAL DAMAGE (3).';
const phaseActions = {
  movement: new Set(['move', 'disengage']),
  assault: new Set(['run', 'charge', 'declare_ranged_attack', 'ranged_attack', 'blast_template_attack']),
  combat: new Set(['fight']),
};
const live = piece => piece?.isOnField === true && piece.isDestroyed !== true && piece.currentModels > 0;

function sourceCard(state, sideKey) {
  const cards = (state.cardResources?.[sideKey] || []).filter(card => card.cardKind === 'faction');
  if (!cards.some(card => card.officialCardRecordKey === recordKey)) return null;
  const [card] = cards;
  const profile = getOfficialCardBuildPaymentProfileV1(state.officialCardBuildPaymentDataBundle, recordKey);
  if (cards.length !== 1 || profile.cardKind !== 'faction' || card.sideKey !== sideKey
    || card.sourceRecordHash !== profile.sourceRecordHash || card.officialPayloadHash !== profile.payloadHash) {
    throw Error('KHASSAR_FACTION_CARD_BINDING_INVALID');
  }
  return card;
}

function canReplaceAction(state, actor) {
  const window = state.selectedRosterActivationWindow;
  if (!phaseActions[state.phase] || actor.sideKey !== state.activeSideKey || !live(actor)
    || state.pendingAction || state.pendingOfficialReactionWindow
    || !listOfficialPhaseActivationUnitIdsV1(state, actor.sideKey).includes(actor.id)) return false;
  return !window || (window.sideKey === actor.sideKey && window.pieceId === actor.id
    && window.phase === state.phase && window.round === Number(state.round) && window.stage === 'before_action');
}

function recipientAvailable(state, actor, candidate) {
  return candidate.id !== actor.id && candidate.sideKey === actor.sideKey && live(candidate)
    && candidate.combatTags?.includes('biological') === true && candidate.activatedPhases?.[state.phase] === true
    && !isOfficialMorphActivationLockedV1(state, candidate)
    && isOfficialUnitVisibleForActiveAbilityV1(state, actor, candidate);
}

function delegateView(state, candidate) {
  // This private projection loosens only the consumed activation slot.
  // Movement history, card uses, damage, restrictions and terrain remain signed facts.
  const projected = structuredClone(state);
  const proxy = projected.pieces.find(piece => piece.id === candidate.id);
  proxy.activatedPhases[state.phase] = false;
  delete projected.selectedRosterActivationWindow;
  openOfficialSelectedRosterSpecialAbilityWindowV1(projected, candidate.sideKey, candidate.id, state.phase);
  return projected;
}

export function sharesKhassarFactionSideV1(state, tacticalCardRecordKey) {
  return ['player1', 'player2'].some(side => sourceCard(state, side)
    && state.cardResources[side].some(card => card.officialCardRecordKey === tacticalCardRecordKey));
}

export function canOfficialKhassarDelegateUnitRecordV1(state, recordKey) {
  return state.pieces.some(piece => piece.officialUnitRecordKey === recordKey
    && piece.combatTags?.includes('biological') && sourceCard(state, piece.sideKey));
}

export function assertOfficialKhassarIndependentRangedRoutesV1(state, { templateRoutes, refreshRecordKey }) {
  const isPotentialRecipient = piece => piece.combatTags?.includes('biological') && sourceCard(state, piece.sideKey);
  for (const route of templateRoutes) {
    const piece = state.pieces.find(unit => unit.id === route.pieceId);
    if (!piece) throw Error('KHASSAR_TEMPLATE_ROUTE_PIECE_MISSING');
    if (isPotentialRecipient(piece)) {
      throw Error('KHASSAR_DELEGATED_TEMPLATE_CONSUMER_REQUIRED');
    }
  }
  if (refreshRecordKey && canOfficialKhassarDelegateUnitRecordV1(state, refreshRecordKey)) {
    throw Error('KHASSAR_DELEGATED_CARD_REFRESH_CONSUMER_REQUIRED');
  }
}

export function createOfficialKhassarAbilityAdapterV1({ eligibility, legalSpace, preview, apply, query }) {
  const adapterId = 'official-khassar-de-templari-adapter-v1';
  const adapterVersion = '1.0.0';
  const { sourceFeatureHash } = eligibility.descriptor;
  const descriptor = Object.freeze({ adapterId, adapterVersion, adapterKind: 'exact_runtime',
    coveredSourceFeatureHashes: [sourceFeatureHash], coveredDefinitionCount: 1,
    supportedOperations: ['legal_space', 'preview', 'apply', 'query'], trainingTruth: false });
  const definitionBindings = [{ definitionId, sourceFeatureHash, adapterId,
    adapterVersion, capability: 'source_bound_delegated_phase_action_and_continuation' }];
  return Object.freeze({ descriptor, definitionBindings, legalSpace, preview, apply, query });
}

export function createOfficialKhassarEligibilityV1({ catalogue, enumerate, includeLegalDomains = false }) {
  const source = catalogue.definitions.find(row => row.definitionId === definitionId);
  if (!source || source.recordKey !== recordKey || source.sourceKind !== 'card_feature'
    || source.activationKind !== 'active' || source.phase !== 'any' || source.sourceText !== sourceText) {
    throw Error('KHASSAR_FROZEN_SOURCE_REQUIRED');
  }
  const descriptor = Object.freeze({ definitionId, sourceFeatureHash: source.sourceFeatureHash,
    queryKind: 'khassar_eligibility',
    scope: includeLegalDomains ? 'public_delegation_domains' : 'recipient_and_native_action_domains',
    phases: ['movement', 'assault', 'combat'],
    nonLethalDamageAfterCompletedAction: 3, mutationAuthority: false, trainingTruth: false });

  function query(state, request) {
    if (Object.keys(request).some(key => !['queryKind', 'sideKey', 'pieceId'].includes(key))
      || !['player1', 'player2'].includes(request.sideKey) || typeof request.pieceId !== 'string') {
      throw Error('KHASSAR_QUERY_ARGUMENTS_INVALID');
    }
    const actor = state.pieces.find(piece => piece.id === request.pieceId && piece.sideKey === request.sideKey);
    if (!actor || !canReplaceAction(state, actor)) throw Error('KHASSAR_REPLACED_ACTION_WINDOW_UNAVAILABLE');
    if (sourceCard(state, actor.sideKey)?.readiness !== 'ready') throw Error('KHASSAR_FACTION_CARD_NOT_READY');

    if (includeLegalDomains) {
      const byRecipient = new Map();
      for (const domain of enumerate(state, { sideKey: actor.sideKey }).parameterDomains) {
        if (domain.definitionId !== definitionId || domain.pieceId !== actor.id) continue;
        const { recipientUnitId, authorizedActionType } = domain.constraints;
        const choices = byRecipient.get(recipientUnitId) || [];
        choices.push({ domainId: domain.domainId, actionType: domain.actionType, authorizedActionType,
          ...(domain.weaponName ? { weaponName: domain.weaponName } : {}) });
        byRecipient.set(recipientUnitId, choices);
      }
      const recipients = [...byRecipient].sort(([left], [right]) => left.localeCompare(right))
        .map(([unitId, legalDomains]) => ({
          unitId, hasAlreadyActivatedThisPhase: true,
          actionTypes: [...new Set(legalDomains.map(domain => domain.authorizedActionType))].sort(),
          legalDomains: legalDomains.sort((left, right) => left.domainId.localeCompare(right.domainId)),
        }));
      const body = { result: { sourcePieceId: actor.id, definitionId, phase: state.phase, recipients,
        speaksForNativeActionDomainsOnly: false }, stateHash: hash(state), mutationAuthority: false, trainingTruth: false };
      return { ...body, queryReceiptHash: hash(body) };
    }

    const availableTypes = phaseActions[state.phase];
    const recipients = state.pieces.filter(piece => recipientAvailable(state, actor, piece)).map(piece => {
      const native = enumerate(delegateView(state, piece), { sideKey: actor.sideKey });
      const choices = [...native.parameterDomains, ...native.candidates].filter(row =>
        row.sideKey === actor.sideKey && row.pieceId === piece.id && availableTypes.has(row.actionType));
      return { unitId: piece.id, hasAlreadyActivatedThisPhase: true,
        actionTypes: [...new Set(choices.map(row => row.actionType))].sort() };
    }).sort((left, right) => left.unitId.localeCompare(right.unitId));
    const body = { result: { sourcePieceId: actor.id, definitionId, phase: state.phase, recipients,
      speaksForNativeActionDomainsOnly: true }, stateHash: hash(state), mutationAuthority: false, trainingTruth: false };
    return { ...body, queryReceiptHash: hash(body) };
  }

  return Object.freeze({ descriptor, query });
}


function settleReplacement(next, actor, recipient, { phase, planHash, amount }) {
  const participantCompletion=hasOfficialKhassarBeforeCasualtyPolicyV1(next);
  actor.activatedPhases = { ...actor.activatedPhases, [phase]: true };
  if(!participantCompletion||live(actor)){
    if(participantCompletion)next.activeSideKey=actor.sideKey;
    openOfficialSelectedRosterSpecialAbilityWindowV1(next, actor.sideKey, actor.id, phase);
    next.selectedRosterActivationWindow.stage = 'after_action';
  }else{
    delete next.selectedRosterActivationWindow;
    alternateOfficialPhaseActivationV1(next,actor.sideKey,phase);
  }

  let damage;
  if(participantCompletion&&!live(recipient))damage={schema:'starcraft_tmg_khassar_post_action_damage_skipped_v1',
    targetPieceId:recipient.id,amount,effectiveDamage:0,reason:'recipient_destroyed',trainingTruth:false};
  else{
  const targetProfile = resolveOfficialEffectiveCombatProfileV1(next, recipient);
  const liveModels = recipient.models.filter(model => model.isDestroyed !== true);
  damage = resolveOfficialNonLethalDamageV1({ targetPieceId: recipient.id, targetModelId: liveModels[0].id,
    abilityResolutionHash: planHash, priorDamageMarker: Number(recipient.damageMarker || 0),
    targetHitPoints: targetProfile.hitPoints, amount });
  const shieldedBefore = (recipient.statuses || []).some(status =>
    String(typeof status === 'string' ? status : status.statusName || status.name).toLowerCase() === 'shielded');
  applyOfficialSelectedRosterResolvedDamageV1(next, recipient, targetProfile, { casualtyModelIds: [],
    remainingModelIds: liveModels.map(model => model.id), targetDestroyed: false,
    postDamageMarker: damage.postDamageMarker, shieldedBefore,
    shieldedAfter: shieldedBefore && damage.postDamageMarker <= Number(targetProfile.shield || 0) });
  }
  next.activeAbilityUseHistory = [...(next.activeAbilityUseHistory || []), {
    useKey: next.round + ':Khassar de Templari:' + actor.id, round: Number(next.round),
    phase: next.phase, sideKey: actor.sideKey, pieceId: actor.id, routeId: definitionId,
    abilityName: 'Khassar de Templari', planHash: planHash, trainingTruth: false,
  }];
  return damage;
}

function sealedKhassarCompletion(state,frame,parentKey,nativeActionType){
  const parent=state[parentKey];
  return Boolean(parent&&hasOfficialKhassarBeforeCasualtyPolicyV1(state)
    &&frame?.frameHash===hash(Object.fromEntries(Object.entries(frame).filter(([key])=>key!=='frameHash')))
    &&frame.round===Number(state.round)&&frame.phase===state.phase
    &&frame.sourceBundleHash===state.officialReactionFamilySourceBundle?.bundleHash
    &&isDeepStrictEqual(parent,frame.suspendedHostSlots?.[parentKey])
    &&frame.originalAction?.pieceId===parent.recipientUnitId&&frame.originalAction.sideKey===parent.sideKey
    &&frame.originalAction.actionType===nativeActionType&&frame.hostKind===(nativeActionType==='ranged_attack'?'ranged':'melee'));
}

const movementKind = 'khassar_movement';
const movementAction = 'resolve_khassar_movement';
const movementAtom = 'rule-atom:khassar-replaces-core-movement-action-v1';

export function createOfficialKhassarMovementV1({ eligibility, state: initial, enumerateNative, instantiateNative,
  applyNative, includeRun = false }) {
  if (!hasOfficialNonLethalDamagePolicyV1(initial) || !hasOfficialNonLethalStandardDamagePolicyV1(initial)) {
    throw Error('KHASSAR_NON_LETHAL_CONSUMER_REQUIRED');
  }
  const { sourceFeatureHash, nonLethalDamageAfterCompletedAction: amount } = eligibility.descriptor;
  const descriptor = Object.freeze({ definitionId, sourceFeatureHash, sourceRuntimeKind: movementKind,
    actionTypes: [movementAction], ruleAtomIds: [movementAtom],
    scope: includeRun ? 'movement_and_assault_run' : 'movement_only',
    ...(includeRun ? { assaultActions: ['run'] } : {}),
    nativeMovementCompletedBeforeDamage: true, trainingTruth: false });

  function movementDomains(state, options = {}) {
    const side = options.sideKey || state.activeSideKey;
    const movementPhase = state.phase === 'movement';
    const assaultRun = includeRun && state.phase === 'assault';
    if ((!movementPhase && !assaultRun) || side !== state.activeSideKey || sourceCard(state, side)?.readiness !== 'ready') return [];
    const actors = state.pieces.filter(actor => canReplaceAction(state, actor)
      && !(state.activeAbilityUseHistory || []).some(row => row.round === Number(state.round)
        && row.pieceId === actor.id && row.routeId === definitionId));
    return actors.flatMap(actor => state.pieces.filter(piece => recipientAvailable(state, actor, piece)).flatMap(piece => {
      const projected = delegateView(state, piece);
      return enumerateNative(projected, { sideKey: side }).parameterDomains.filter(domain =>
        domain.pieceId === piece.id && (movementPhase ? phaseActions.movement.has(domain.actionType)
          : domain.actionType === 'run')).map(nativeDomain => {
        const body = { schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
          parameterKind: nativeDomain.parameterKind, actionType: movementAction, definitionId,
          abilityName: 'Khassar de Templari', sideKey: side, phase: state.phase, pieceId: actor.id,
          recipientUnitId: piece.id, nativeDomain, sourceFeatureHash, ruleAtomIds: [movementAtom],
          parameterSchema: nativeDomain.parameterSchema,
          constraints: { ...nativeDomain.constraints, recipientUnitId: piece.id,
            authorizedActionType: nativeDomain.actionType, afterCompletionNonLethalDamage: amount },
          confirmationClass: nativeDomain.confirmationClass, trainingTruth: false };
        return { ...body, domainId: 'sc-domain-' + hash(body) };
      });
    }));
  }

  function instantiate(state, domain, parameters) {
    const current = movementDomains(state, { sideKey: domain.sideKey }).find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) throw Error('KHASSAR_MOVEMENT_DOMAIN_STALE');
    const recipient = state.pieces.find(piece => piece.id === domain.recipientUnitId);
    const native = instantiateNative(delegateView(state, recipient), domain.nativeDomain, parameters);
    const body = { domainId: domain.domainId, nativeAction: native.action, sourceFeatureHash,
      recipientUnitId: recipient.id, parameters: native.canonicalParameters };
    return { canonicalParameters: native.canonicalParameters,
      action: { actionType: movementAction, definitionId, abilityName: 'Khassar de Templari',
        sideKey: domain.sideKey, phase: state.phase, pieceId: domain.pieceId, ruleAtomIds: [movementAtom],
        movementPlan: { ...body, planHash: hash(body) } } };
  }

  function apply(state, action, options) {
    const plan = action.movementPlan;
    const previous = state.pieces.find(piece => piece.id === plan.recipientUnitId);
    const moved = applyNative(delegateView(state, previous), plan.nativeAction, options);
    const window = moved.state.selectedRosterActivationWindow;
    if (!moved.events.some(event => event.type === 'unit_' + plan.nativeAction.actionType + '_resolved'
      && event.pieceId === previous.id)
      || window?.pieceId !== previous.id || window.stage !== 'after_action'
      || moved.state.pendingOfficialReactionWindow || moved.state.pendingAction) {
      throw Error('KHASSAR_DELEGATED_MOVEMENT_NOT_COMPLETE');
    }

    const next = structuredClone(moved.state);
    const actor = next.pieces.find(piece => piece.id === action.pieceId);
    const recipient = next.pieces.find(piece => piece.id === previous.id);
    const card = sourceCard(next, actor.sideKey);
    if (card?.readiness !== 'ready' || !live(recipient) || next.activeSideKey !== actor.sideKey) {
      throw Error('KHASSAR_MOVEMENT_PARENT_DESYNC');
    }
    card.readiness = 'exhausted';
    const damage = settleReplacement(next, actor, recipient, { phase: action.phase, planHash: plan.planHash, amount });
    const events = [
      { type: 'khassar_faction_card_exhausted', cardInstanceId: card.cardInstanceId,
        actorUnitId: actor.id, recipientUnitId: recipient.id, definitionId, trainingTruth: false },
      ...moved.events,
      { type: 'khassar_non_lethal_damage_after_movement', pieceId: recipient.id, originalActorUnitId: actor.id,
        definitionId, damage, trainingTruth: false },
    ];
    const log = next.log.at(-1);
    log.action = structuredClone(action);
    log.events = structuredClone(events);
    return { ...moved, state: next, action, events };
  }

  return Object.freeze({ descriptor, movementDomains, instantiate, apply });
}


const chargeKind = 'khassar_charge';
const chargeAction = 'delegate_khassar_charge';
const chargeAtom = 'rule-atom:khassar-delegated-charge-lifecycle-v1';
const chargeParentKey = 'pendingOfficialKhassarCharge';

const rangedDamageParentKey = 'pendingCurrentProductRangedDamageReaction';
const meleeDamageParentKey = 'pendingOfficialMeleeDamageReaction';

function nativeDamageReaction(state, childKey, recipientId, actionType) {
  const child = state[childKey];
  if (!child) return false;
  const window = state.pendingOfficialReactionWindow;
  if (child.attackAction?.pieceId !== recipientId || child.attackAction?.actionType !== actionType
    || window?.triggerKind !== 'damage_received' || window.triggerHash !== child.triggerHash) {
    throw Error('KHASSAR_NATIVE_DAMAGE_REACTION_PARENT_INVALID');
  }
  return true;
}

function isReactionResponse(state, row, sourceRuntimeKind) {
  return row.sourceRuntimeKind === sourceRuntimeKind && row.sideKey === state.activeSideKey
    && ['resolve_reaction_family_ability', 'pass_reaction_family_window'].includes(row.actionType);
}

function nativeChargePending(state, receiverId) {
  const pool = state.pendingOfficialMeleePoolChoice;
  if (pool) return pool.attackAction?.actionType === 'resolve_impact' && pool.attackAction.pieceId === receiverId;
  const current = state.pendingAction;
  if (current?.stage === 'defender_casualty_selection') {
    return current.attackerPieceId === receiverId && current.attackAction?.actionType === 'resolve_impact';
  }
  return current?.pieceId === receiverId
    && ['resolve_charge_after_roll', 'resolve_mandatory_impact'].includes(current.stage);
}

export function createOfficialKhassarChargeV1({ eligibility, enumerateNative, instantiateNative, applyNative,
  includeDamageReactions, chargeDeclaration, supplyLossReaction, includeBeforeCasualtyCompletion=false }) {
  const { sourceFeatureHash, nonLethalDamageAfterCompletedAction: amount } = eligibility.descriptor;
  const descriptor = Object.freeze({ definitionId, sourceFeatureHash, sourceRuntimeKind: chargeKind,
    actionTypes: [chargeAction], ruleAtomIds: [chargeAtom], scope: 'charge_and_native_mandatory_impact',
    pendingParentKey: chargeParentKey, timing: 'after_complete_native_charge_and_impact',
    ...(includeBeforeCasualtyCompletion?{beforeCasualtyParticipantCompletion:true}:{}),trainingTruth: false });

  const hasDamageReaction = (state, recipientId) => includeDamageReactions
    && nativeDamageReaction(state, meleeDamageParentKey, recipientId, 'resolve_impact');

  function declarationFor(state, recipientId) {
    const declaration = chargeDeclaration?.pending(state);
    if (declaration && declaration.pieceId !== recipientId) throw Error('KHASSAR_CHARGE_DECLARATION_PARENT_MISMATCH');
    return declaration;
  }

  function projectDeclaredRoll(state, declaration) {
    const parent = pending(state);
    if (!parent) return state;
    if (declarationFor(state, parent.recipientUnitId)?.parentHash !== declaration.parentHash
      || declaration.stage !== 'ready') throw Error('KHASSAR_DECLARED_ROLL_PARENT_MISMATCH');
    const projected = structuredClone(state);
    projected.pieces.find(piece => piece.id === parent.recipientUnitId).activatedPhases.assault = false;
    return projected;
  }

  function pending(state, sealedFrame=null) {
    const parent = state[chargeParentKey];
    if (!parent) return null;
    const { parentHash, ...body } = parent;
    const actor = state.pieces.find(piece => piece.id === parent.actorUnitId);
    const recipient = state.pieces.find(piece => piece.id === parent.recipientUnitId);
    if (hash(body) !== parentHash || parent.sourceFeatureHash !== sourceFeatureHash
      || parent.phase !== state.phase || parent.round !== Number(state.round)
      || actor?.sideKey !== parent.sideKey || recipient?.sideKey !== parent.sideKey
      || sourceCard(state, parent.sideKey)?.readiness !== 'exhausted'
      || (!(sealedFrame&&includeBeforeCasualtyCompletion&&sealedKhassarCompletion(state,sealedFrame,chargeParentKey,'resolve_impact'))
        && !nativeChargePending(state, parent.recipientUnitId) && !hasDamageReaction(state, parent.recipientUnitId)
        && !declarationFor(state, parent.recipientUnitId) && !supplyLossReaction?.ownsWindow(state))) {
      throw Error('KHASSAR_CHARGE_PARENT_INVALID');
    }
    return parent;
  }

  function domains(state, options = {}) {
    const side = options.sideKey || state.activeSideKey;
    if (state.phase !== 'assault' || side !== state.activeSideKey
      || sourceCard(state, side)?.readiness !== 'ready') return [];
    const actors = state.pieces.filter(actor => canReplaceAction(state, actor)
      && !(state.activeAbilityUseHistory || []).some(row => row.round === Number(state.round)
        && row.pieceId === actor.id && row.routeId === definitionId));
    return actors.flatMap(actor => state.pieces.filter(piece => recipientAvailable(state, actor, piece)).flatMap(piece => {
      const projected = delegateView(state, piece);
      return enumerateNative(projected, { sideKey: side }).parameterDomains.filter(native =>
        native.actionType === 'charge' && native.pieceId === piece.id).map(nativeDomain => {
        const body = { schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
          parameterKind: nativeDomain.parameterKind, actionType: chargeAction, definitionId,
          abilityName: 'Khassar de Templari', sideKey: side, phase: state.phase, pieceId: actor.id,
          recipientUnitId: piece.id, nativeDomain, sourceFeatureHash, ruleAtomIds: [chargeAtom],
          parameterSchema: nativeDomain.parameterSchema,
          constraints: { ...nativeDomain.constraints, recipientUnitId: piece.id,
            authorizedActionType: 'charge', afterCompletionNonLethalDamage: amount },
          confirmationClass: nativeDomain.confirmationClass, trainingTruth: false };
        return { ...body, domainId: 'sc-domain-' + hash(body) };
      });
    }));
  }

  function instantiate(state, domain, parameters) {
    const current = domains(state, { sideKey: domain.sideKey }).find(row => row.domainId === domain.domainId);
    if (!current || !isDeepStrictEqual(current, domain)) throw Error('KHASSAR_CHARGE_DOMAIN_STALE');
    const recipient = state.pieces.find(piece => piece.id === domain.recipientUnitId);
    const native = instantiateNative(delegateView(state, recipient), current.nativeDomain, parameters);
    const body = { domainId: current.domainId, nativeAction: native.action, sourceFeatureHash,
      recipientUnitId: recipient.id, parameters: native.canonicalParameters };
    return { canonicalParameters: native.canonicalParameters,
      action: { actionType: chargeAction, definitionId, abilityName: 'Khassar de Templari',
        sideKey: current.sideKey, phase: state.phase, pieceId: current.pieceId, ruleAtomIds: [chargeAtom],
        ...(native.action.chance ? { chance: native.action.chance } : {}),
        chargeDelegationPlan: { ...body, planHash: hash(body) } } };
  }

  function open(state, action, options) {
    const plan = action.chargeDelegationPlan;
    const recipientBefore = state.pieces.find(piece => piece.id === plan.recipientUnitId);
    const native = applyNative(delegateView(state, recipientBefore), plan.nativeAction, options);
    const next = structuredClone(native.state);
    const declaration = declarationFor(next, recipientBefore.id);
    if (declaration ? Boolean(next.pendingAction)
      : next.pendingAction?.stage !== 'resolve_charge_after_roll'
        || !nativeChargePending(next, recipientBefore.id) || next.activeSideKey !== action.sideKey) {
      throw Error('KHASSAR_NATIVE_CHARGE_DECLARATION_REQUIRED');
    }
    const card = sourceCard(next, action.sideKey);
    if (card?.readiness !== 'ready') throw Error('KHASSAR_FACTION_CARD_NOT_READY');
    card.readiness = 'exhausted';
    next.pieces.find(piece => piece.id === action.pieceId).activatedPhases.assault = true;
    next.pieces.find(piece => piece.id === recipientBefore.id).activatedPhases.assault = true;
    const parent = { phase: state.phase, round: Number(state.round), sideKey: action.sideKey,
      actorUnitId: action.pieceId, recipientUnitId: recipientBefore.id, sourceFeatureHash,
      planHash: plan.planHash, trainingTruth: false };
    next[chargeParentKey] = { ...parent, parentHash: hash(parent) };
    const exhausted = { type: 'khassar_faction_card_exhausted', cardInstanceId: card.cardInstanceId,
      actorUnitId: parent.actorUnitId, recipientUnitId: parent.recipientUnitId, definitionId, trainingTruth: false };
    const events = [exhausted, ...native.events];
    const entry = declaration ? next.log[state.log.length] : next.log.at(-1);
    entry.action = structuredClone(action);
    entry.events = structuredClone(declaration ? [exhausted, ...entry.events] : events);
    return { ...native, state: next, action, events };
  }

  function assertNativeContinuation(state, action, parent) {
    if (supplyLossReaction?.ownsWindow(state)) {
      if (!isReactionResponse(state, action, 'reaction')) throw Error('KHASSAR_SUPPLY_LOSS_REACTION_REQUIRED');
      return;
    }
    const declaration = declarationFor(state, parent.recipientUnitId);
    if (declaration) {
      const valid = declaration.stage === 'reaction' ? isReactionResponse(state, action, 'reaction')
        : action.sourceRuntimeKind === 'charge_declaration' && action.actionType === 'roll_declared_charge'
          && action.pieceId === parent.recipientUnitId && action.sourceAction?.parentHash === declaration.parentHash;
      if (!valid) throw Error('KHASSAR_CHARGE_DECLARATION_CONTINUATION_REQUIRED');
      return;
    }
    const body = action.sourceAction;
    const native = state.pendingAction;
    const correctBasicAction = action.sourceRuntimeKind === 'melee'
      && (native?.stage === 'resolve_charge_after_roll' && action.actionType === 'resolve_charge'
        && action.pieceId === parent.recipientUnitId
        || native?.stage === 'defender_casualty_selection' && body?.resolutionStage === 'defender_casualty_selection'
        && body.attackerPieceId === parent.recipientUnitId);
    const correctImpactPool = action.sourceRuntimeKind === 'melee_choice'
      && (state.pendingOfficialMeleePoolChoice?.attackAction.pieceId === parent.recipientUnitId
        || native?.stage === 'resolve_mandatory_impact' && body?.attackAction?.actionType === 'resolve_impact'
        && body.attackAction.pieceId === parent.recipientUnitId);
    const correctImpactReaction = hasDamageReaction(state, parent.recipientUnitId) && isReactionResponse(state, action, 'reaction');
    if (!correctBasicAction && !correctImpactPool && !correctImpactReaction) throw Error('KHASSAR_CHARGE_CONTINUATION_REQUIRED');
  }

  function afterTransition(result, parent) {
    if(includeBeforeCasualtyCompletion&&result.state.officialBeforeCasualtyContinuations?.length)return result;
    const projectedRecipient = result.state.pieces.find(piece => piece.id === parent.recipientUnitId);
    if (result.state.pendingAction?.stage === 'resolve_charge_after_roll' && projectedRecipient.activatedPhases.assault === false) {
      const next = structuredClone(result.state);
      next.pieces.find(piece => piece.id === parent.recipientUnitId).activatedPhases.assault = true;
      result = { ...result, state: next };
    }
    if (supplyLossReaction?.ownsWindow(result.state) || result.state.pendingAction || result.state.pendingOfficialMeleePoolChoice
      || hasDamageReaction(result.state, parent.recipientUnitId) || declarationFor(result.state, parent.recipientUnitId)) {
      pending(result.state);
      return result;
    }
    const window = result.state.selectedRosterActivationWindow;
    const deadCompletion=includeBeforeCasualtyCompletion&&!live(projectedRecipient)
      &&result.events.some(e=>e.type==='impact_damage'&&e.pieceId===parent.recipientUnitId);
    if (!deadCompletion&&(window?.pieceId !== parent.recipientUnitId || window.stage !== 'after_action'
      || result.state.pendingOfficialReactionWindow || result.state.activeSideKey !== parent.sideKey)) {
      throw Error('KHASSAR_NATIVE_CHARGE_NOT_COMPLETE');
    }
    const next = structuredClone(result.state);
    const actor = next.pieces.find(piece => piece.id === parent.actorUnitId);
    const recipient = next.pieces.find(piece => piece.id === parent.recipientUnitId);
    delete next[chargeParentKey];
    const damage = settleReplacement(next, actor, recipient, { phase: parent.phase, planHash: parent.planHash, amount });
    const event = { type: 'khassar_non_lethal_damage_after_charge', pieceId: recipient.id,
      originalActorUnitId: actor.id, definitionId, damage, trainingTruth: false };
    next.log.at(-1).events = [...next.log.at(-1).events, structuredClone(event)];
    return { ...result, state: next, events: [...result.events, event] };
  }

  const sealedCompletionParent=(state,frame)=>{
    if(!frame.suspendedHostSlots?.[chargeParentKey])return null;
    if(!includeBeforeCasualtyCompletion||!sealedKhassarCompletion(state,frame,chargeParentKey,'resolve_impact'))throw Error('KHASSAR_SEALED_CHARGE_COMPLETION_INVALID');
    return pending(state,frame);
  };
  return Object.freeze({ descriptor, pending, domains, instantiate, open, projectDeclaredRoll, assertNativeContinuation, afterTransition,sealedCompletionParent });
}


const shotKind = 'khassar_shot';
const shotAction = 'delegate_khassar_shot';
const shotAtom = 'rule-atom:khassar-delegated-ranged-action-lifecycle-v1';
const shotParentKey = 'pendingOfficialKhassarShot';

function rangedFrontier(state, recipientUnitId) {
  const choice = state[OFFICIAL_RANGED_CHOICE_PARENT_KEY];
  if (choice) return choice.attackAction?.pieceId === recipientUnitId && choice.attackAction.actionType === 'ranged_attack'
    ? { kind: 'precision', pieceId: null } : null;
  const casualty = state.pendingCurrentProductRangedCasualtyChoice;
  if (casualty) return casualty.attackerPieceId === recipientUnitId
    ? { kind: 'ranged', pieceId: casualty.targetPieceId, actionTypes: ['ranged_attack'] } : null;
  const sequence = state.pendingCurrentProductRangedSequence;
  return sequence?.pieceId === recipientUnitId
    ? { kind: 'ranged', pieceId: recipientUnitId, actionTypes: ['ranged_attack', 'finish_ranged_attack_sequence'] } : null;
}

function fightFrontier(state, recipientUnitId) {
  const pool = state.pendingOfficialMeleePoolChoice;
  if (pool) return pool.attackAction?.pieceId === recipientUnitId && pool.attackAction.actionType === 'fight'
    ? { kind: 'melee_choice', pieceId: null } : null;
  const casualty = state.pendingAction;
  if (casualty?.stage === 'defender_casualty_selection') {
    return casualty.attackerPieceId === recipientUnitId && casualty.attackAction?.actionType === 'fight'
      ? { kind: 'melee', pieceId: casualty.targetPieceId, actionTypes: ['fight'] } : null;
  }
  const sequence = state.pendingOfficialMeleeSidearmSequence;
  return sequence?.pieceId === recipientUnitId
    ? { kind: 'melee', pieceId: recipientUnitId, actionTypes: ['fight', OFFICIAL_MELEE_SIDEARM_FINISH_ACTION],
      interceptKind: 'melee_choice' } : null;
}

const rangedAttack = {
  kind: shotKind, actionType: shotAction, atomId: shotAtom, parentKey: shotParentKey,
  phase: 'assault', nativeKind: 'ranged', nativeActionType: 'ranged_attack', planKey: 'shotDelegationPlan',
  damageParentKey: rangedDamageParentKey, scope: 'numeric_ranged_attack_and_native_continuations', timing: 'after_complete_native_ranged_action',
  errorPrefix: 'KHASSAR_SHOT', endEvent: 'khassar_non_lethal_damage_after_shot', frontier: rangedFrontier,
  hasPending: state => Boolean(state[OFFICIAL_RANGED_CHOICE_PARENT_KEY] || state.pendingCurrentProductRangedCasualtyChoice
    || state.pendingCurrentProductRangedSequence),
};
const fightAttack = {
  kind: 'khassar_fight', actionType: 'delegate_khassar_fight', atomId: 'rule-atom:khassar-delegated-fight-lifecycle-v1',
  parentKey: 'pendingOfficialKhassarFight', phase: 'combat', nativeKind: 'melee', nativeActionType: 'fight',
  planKey: 'fightDelegationPlan', damageParentKey: meleeDamageParentKey, scope: 'fight_and_native_melee_continuations', timing: 'after_complete_native_fight',
  errorPrefix: 'KHASSAR_FIGHT', endEvent: 'khassar_non_lethal_damage_after_fight', frontier: fightFrontier,
  hasPending: state => Boolean(state.pendingAction || state.pendingOfficialMeleePoolChoice || state.pendingOfficialMeleeSidearmSequence),
};

export function createOfficialKhassarShotV1(options) {
  return createKhassarAttack(options, rangedAttack);
}
export function createOfficialKhassarFightV1(options) {
  return createKhassarAttack(options, fightAttack);
}

function createKhassarAttack({ eligibility, enumerateNative, instantiateNative, applyNative, targetReactions, includeDamageReactions, supplyLossReaction, rangedLunge, includeBeforeCasualtyCompletion=false }, attack) {
  const { sourceFeatureHash, nonLethalDamageAfterCompletedAction: amount } = eligibility.descriptor;
  const descriptor = Object.freeze({ definitionId, sourceFeatureHash, sourceRuntimeKind: attack.kind,
    actionTypes: [attack.actionType], ruleAtomIds: [attack.atomId], scope: attack.scope,
    pendingParentKey: attack.parentKey, timing: attack.timing,
    ...(includeBeforeCasualtyCompletion?{beforeCasualtyParticipantCompletion:true}:{}),trainingTruth: false });
  const planFor = action => action[attack.planKey];
  const openingProjections = new WeakSet();
  const isOpeningProjection = state => openingProjections.has(state);

  function openingView(state, actor, recipient) {
    const projected = delegateView(state, recipient);
    const card = sourceCard(projected, actor.sideKey);
    if (card?.readiness !== 'ready') throw Error('KHASSAR_FACTION_CARD_NOT_READY');
    card.readiness = 'exhausted';
    projected.pieces.find(piece => piece.id === actor.id).activatedPhases[attack.phase] = true;
    const body = { phase: state.phase, round: Number(state.round), sideKey: actor.sideKey,
      sourceStateHash: hash(state), actorUnitId: actor.id, recipientUnitId: recipient.id,
      sourceFeatureHash, cardInstanceId: card.cardInstanceId, trainingTruth: false };
    projected[attack.parentKey] = { ...body, parentHash: hash(body) };
    // The real child roll/casualty seal is built with this parent already in its state.
    openingProjections.add(projected);
    return projected;
  }

  function pending(state, sealedFrame=null) {
    const parent = state[attack.parentKey];
    if (!parent || isOpeningProjection(state)) return null;
    const { parentHash, ...body } = parent;
    const actor = state.pieces.find(piece => piece.id === parent.actorUnitId);
    const recipient = state.pieces.find(piece => piece.id === parent.recipientUnitId);
    const card = sourceCard(state, parent.sideKey);
    if (hash(body) !== parentHash || parent.sourceFeatureHash !== sourceFeatureHash
      || parent.phase !== state.phase || parent.round !== Number(state.round)
      || actor?.sideKey !== parent.sideKey || recipient?.sideKey !== parent.sideKey
      || card?.cardInstanceId !== parent.cardInstanceId || card.readiness !== 'exhausted'
      || !(sealedFrame&&includeBeforeCasualtyCompletion&&sealedKhassarCompletion(state,sealedFrame,attack.parentKey,attack.nativeActionType))
        && !frontierFor(state, recipient.id)) throw Error(attack.errorPrefix + '_PARENT_INVALID');
    return parent;
  }

  function domains(state, options = {}) {
    const side = options.sideKey || state.activeSideKey;
    if (state.phase !== attack.phase || side !== state.activeSideKey || sourceCard(state, side)?.readiness !== 'ready') return [];
    const actors = state.pieces.filter(actor => canReplaceAction(state, actor)
      && !(state.activeAbilityUseHistory || []).some(row => row.round === Number(state.round)
        && row.pieceId === actor.id && row.routeId === definitionId));
    return actors.flatMap(actor => state.pieces.filter(piece => recipientAvailable(state, actor, piece)).flatMap(piece => {
      const projected = openingView(state, actor, piece);
      return enumerateNative(projected, { sideKey: side }).parameterDomains.filter(native =>
        native.actionType === attack.nativeActionType && native.pieceId === piece.id
        && native.sourceRuntimeKind === attack.nativeKind).map(nativeDomain => {
        const body = { schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
          parameterKind: nativeDomain.parameterKind, actionType: attack.actionType, definitionId,
          abilityName: 'Khassar de Templari', sideKey: side, phase: state.phase, pieceId: actor.id,
          weaponName: nativeDomain.weaponName, recipientUnitId: piece.id, nativeDomain, sourceFeatureHash,
          ruleAtomIds: [attack.atomId], parameterSchema: nativeDomain.parameterSchema,
          constraints: { ...nativeDomain.constraints, recipientUnitId: piece.id,
            authorizedActionType: attack.nativeActionType, afterCompletionNonLethalDamage: amount },
          confirmationClass: nativeDomain.confirmationClass, trainingTruth: false };
        return { ...body, domainId: 'sc-domain-' + hash(body) };
      });
    }));
  }

  function instantiate(state, domain, parameters) {
    const actor = state.pieces.find(piece => piece.id === domain.pieceId);
    const recipient = state.pieces.find(piece => piece.id === domain.recipientUnitId);
    const projected = openingView(state, actor, recipient);
    const native = instantiateNative(projected, domain.nativeDomain, parameters);
    const body = { domainId: domain.domainId, nativeAction: native.action, parentHash: projected[attack.parentKey].parentHash,
      recipientUnitId: recipient.id, parameters: native.canonicalParameters };
    return { canonicalParameters: native.canonicalParameters,
      action: { actionType: attack.actionType, definitionId, abilityName: 'Khassar de Templari', sideKey: domain.sideKey,
        phase: state.phase, pieceId: actor.id, ruleAtomIds: [attack.atomId],
        ...(native.action.chance ? { chance: native.action.chance } : {}),
        [attack.planKey]: { ...body, planHash: hash(body) } } };
  }

  function targetParentFor(state, recipientId) {
    const target = targetReactions?.pending(state);
    if (!target) return null;
    if (target.pieceId !== recipientId || target.sourceAction.actionType !== attack.nativeActionType) {
      throw Error(attack.errorPrefix + '_TARGET_REACTION_PARENT_MISMATCH');
    }
    return target;
  }

  const hasDamageReaction = (state, recipientId) => includeDamageReactions
    && nativeDamageReaction(state, attack.damageParentKey, recipientId, attack.nativeActionType);

  function frontierFor(state, recipientId) {
    if (attack === rangedAttack && rangedLunge?.pending(state)) {
      const designation = state.pendingOfficialReactionWindow.context.rangedTargetDesignation;
      if (designation.attackerPieceId !== recipientId) throw Error('KHASSAR_LUNGE_ATTACKER_MISMATCH');
      return { kind: 'ranged_lunge_continuation', pieceId: null };
    }
    if (supplyLossReaction?.ownsWindow(state)) return { kind: 'reaction', pieceId: null };
    if (hasDamageReaction(state, recipientId)) return { kind: 'reaction', pieceId: null };
    const target = targetParentFor(state, recipientId);
    if (target?.stage === 'reaction') return { kind: 'target_reaction', pieceId: null };
    const native = attack.frontier(state, recipientId);
    if (native || !target) return native;
    return { kind: attack.nativeKind, pieceId: recipientId, actionTypes: [attack.nativeActionType],
      interceptKind: attack.nativeKind === 'melee' ? 'melee_choice' : 'precision' };
  }

  function continuationAllows(state, row, parent) {
    const frontier = frontierFor(state, parent.recipientUnitId);
    if (!frontier) return false;
    if (frontier.kind === 'target_reaction' || frontier.kind === 'reaction') {
      return isReactionResponse(state, row, frontier.kind);
    }
    if (frontier.interceptKind && row.sourceRuntimeKind === frontier.interceptKind) {
      const nativeAction = row.sourceAction?.attackAction;
      return nativeAction?.pieceId === parent.recipientUnitId && nativeAction.actionType === attack.nativeActionType;
    }
    return row.sourceRuntimeKind === frontier.kind && (frontier.pieceId === null
      || (row.pieceId === frontier.pieceId && frontier.actionTypes.includes(row.actionType)));
  }

  function continuationMenu(state, menu, parent) {
    const allowed = row => continuationAllows(state, row, parent);
    return { ...menu, candidates: menu.candidates.filter(allowed), parameterDomains: menu.parameterDomains.filter(allowed) };
  }

  function assertNativeContinuation(state, action, parent) {
    if (!continuationAllows(state, action, parent)) throw Error(attack.errorPrefix + '_CONTINUATION_REQUIRED');
  }

  function afterTransition(result, parent) {
    if(includeBeforeCasualtyCompletion&&result.state.officialBeforeCasualtyContinuations?.length)return result;
    if ((attack === rangedAttack && rangedLunge?.pending(result.state)) || supplyLossReaction?.ownsWindow(result.state) || attack.hasPending(result.state) || hasDamageReaction(result.state, parent.recipientUnitId)
      || targetParentFor(result.state, parent.recipientUnitId)) {
      pending(result.state);
      return result;
    }
    const window = result.state.selectedRosterActivationWindow;
    const deadCompletion=includeBeforeCasualtyCompletion&&!live(result.state.pieces.find(p=>p.id===parent.recipientUnitId))
      &&result.events.some(e=>e.type===(attack===rangedAttack?'ranged_attack':'close_combat_attack')&&e.pieceId===parent.recipientUnitId);
    if (!deadCompletion&&(window?.pieceId !== parent.recipientUnitId || window.stage !== 'after_action'
      || result.state.pendingOfficialReactionWindow || result.state.activeSideKey !== parent.sideKey)) {
      throw Error(attack.errorPrefix + '_NATIVE_ACTION_NOT_COMPLETE');
    }
    const next = structuredClone(result.state);
    const actor = next.pieces.find(piece => piece.id === parent.actorUnitId);
    const recipient = next.pieces.find(piece => piece.id === parent.recipientUnitId);
    delete next[attack.parentKey];
    const damage = settleReplacement(next, actor, recipient, { phase: parent.phase, planHash: parent.parentHash, amount });
    const event = { type: attack.endEvent, pieceId: recipient.id,
      originalActorUnitId: actor.id, definitionId, damage, trainingTruth: false };
    next.log.at(-1).events = [...next.log.at(-1).events, structuredClone(event)];
    return { ...result, state: next, events: [...result.events, event] };
  }

  function open(state, action, options) {
    const plan = planFor(action);
    const actor = state.pieces.find(piece => piece.id === action.pieceId);
    const recipient = state.pieces.find(piece => piece.id === plan.recipientUnitId);
    const projected = openingView(state, actor, recipient);
    const parent = projected[attack.parentKey];
    if (parent.parentHash !== plan.parentHash) throw Error(attack.errorPrefix + '_PLAN_PARENT_MISMATCH');
    const native = applyNative(projected, plan.nativeAction, options);
    const next = structuredClone(native.state);
    const events = [{ type: 'khassar_faction_card_exhausted', cardInstanceId: parent.cardInstanceId,
      actorUnitId: parent.actorUnitId, recipientUnitId: parent.recipientUnitId, definitionId, trainingTruth: false },
    ...native.events];
    next.log.at(-1).action = structuredClone(action);
    next.log.at(-1).events = structuredClone(events);
    return afterTransition({ ...native, state: next, action, events }, parent);
  }

  const sealedCompletionParent=(state,frame)=>{
    if(!frame.suspendedHostSlots?.[attack.parentKey])return null;
    if(!includeBeforeCasualtyCompletion||!sealedKhassarCompletion(state,frame,attack.parentKey,attack.nativeActionType))throw Error('KHASSAR_SEALED_ATTACK_COMPLETION_INVALID');
    return pending(state,frame);
  };
  return Object.freeze({ descriptor, isOpeningProjection, pending, domains, instantiate, open, planFor,
    continuationMenu, assertNativeContinuation, afterTransition,sealedCompletionParent });
}
