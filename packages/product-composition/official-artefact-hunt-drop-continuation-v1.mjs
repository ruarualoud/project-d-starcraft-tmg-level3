import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialArtefactHuntKernelV1 } from '../rule-atoms/official-artefact-hunt-kernel-v1.mjs';

export const OFFICIAL_ARTEFACT_DROP_ACTION_TYPE = 'place_artefact_hunt_marker';
export const OFFICIAL_ARTEFACT_CLAIM_ACTION_TYPE = 'claim_artefact_hunt_marker';
export const OFFICIAL_ARTEFACT_FINISH_CLAIMS_ACTION_TYPE = 'finish_artefact_hunt_claims';
const ADAPTER_ID = 'official-artefact-hunt-drop-continuation-v1';
const VERSION = '1.0.0';
const CLAIM_WINDOW_SCHEMA = 'starcraft_tmg_artefact_hunt_claim_window_v1';
const SUSPENDED_PLACE_SCHEMA = 'starcraft_tmg_artefact_hunt_suspended_place_v1';

export function createOfficialArtefactHuntDropContinuationV1({ context, state, ruleAtomId, recordControlInvalidation = false, qualifyMorphRemoval = false, tokenLeadingPlace = false }) {
  const kernel = createOfficialArtefactHuntKernelV1({ context, missionRecordKey: state.mission?.recordKey });
  const ruleAtomIds = [ruleAtomId];
  const pending = current => {
    if (current.mission?.recordKey !== kernel.binding.missionRecordKey) throw Error('ARTEFACT_HUNT_ROOM_BINDING_INVALID');
    return kernel.pendingOpponentDrops(current, current.officialArtefactHuntCustody);
  };
  pending(state);

  function enumerate(current, sideKey) {
    const drops = pending(current);
    const stateHash = drops.length ? hash(current) : null;
    const parameterDomains = drops.filter(drop => drop.placingSideKey === sideKey
      && (!current.officialArtefactHuntSuspendedPlace || current.activeSideKey === sideKey)).map(drop => {
      const body = {
        schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
        semanticVersion: VERSION, parameterKind: 'official_artefact_hunt_drop_coordinate_v1',
        actionType: OFFICIAL_ARTEFACT_DROP_ACTION_TYPE, sideKey, phase: current.phase,
        executorId: ADAPTER_ID, executorVersion: VERSION, ruleAtomIds,
        confirmationClass: 'explicit_human',
        parameterSchema: {
          type: 'object', required: ['xMilliInches', 'yMilliInches'], additionalProperties: false,
          properties: { xMilliInches: { type: 'integer' }, yMilliInches: { type: 'integer' } },
        },
        constraints: { markerId: drop.markerId, carrierUnitId: drop.carrierUnitId,
          rangeMilliInches: drop.rangeMilliInches, referenceFootprints: drop.referenceFootprints,
          preStateHash: stateHash, custodyHash: current.officialArtefactHuntCustody.custodyHash },
        trainingTruth: false,
      };
      return { ...body, domainId: 'sc-domain-' + hash(body) };
    });
    return { blockedByPendingDrop: drops.length > 0, parameterDomains };
  }

  function instantiate(current, domain, parameters) {
    const fresh = enumerate(current, domain.sideKey).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!fresh || !isDeepStrictEqual(fresh, domain)) throw Error('ARTEFACT_HUNT_DROP_DOMAIN_STALE');
    const { xMilliInches, yMilliInches } = parameters || {};
    if (!Number.isSafeInteger(xMilliInches) || !Number.isSafeInteger(yMilliInches)
      || Object.keys(parameters).length !== 2) throw Error('ARTEFACT_HUNT_DROP_COORDINATE_INVALID');
    const canonicalParameters = { xMilliInches, yMilliInches };
    const plan = kernel.prepareOpponentDrop(current, current.officialArtefactHuntCustody, {
      sideKey: domain.sideKey, markerId: domain.constraints.markerId, coordinate: canonicalParameters,
    });
    return { action: { actionType: OFFICIAL_ARTEFACT_DROP_ACTION_TYPE, sideKey: domain.sideKey,
      phase: domain.phase, executorId: ADAPTER_ID, executorVersion: VERSION, ruleAtomIds,
      domainId: domain.domainId, dropPlan: plan }, canonicalParameters };
  }

  function apply(current, action) {
    const domain = enumerate(current, action?.sideKey).parameterDomains.find(row => row.domainId === action?.domainId);
    if (!domain || !isDeepStrictEqual(instantiate(current, domain, action.dropPlan?.coordinate).action, action)) {
      throw Error('ARTEFACT_HUNT_DROP_ACTION_STALE');
    }
    const priorControl = recordControlInvalidation && current.phase === 'cleanup'
      ? current.board.missionMarkers.find(marker => marker.id === action.dropPlan.markerId)?.controlDeterminedAt
      : null;
    const result = kernel.applyOpponentDrop(current, current.officialArtefactHuntCustody, action.dropPlan);
    const next = { ...result.state, officialArtefactHuntCustody: result.custody };
    const remaining = pending(next);
    if (next.officialArtefactHuntSuspendedPlace) {
      next.activeSideKey = remaining[0]?.placingSideKey ?? next.officialArtefactHuntSuspendedPlace.sideKey;
    }
    const event = { type: 'mission_artefact_marker_dropped', playerId: action.sideKey,
      markerId: action.dropPlan.markerId, coordinate: action.dropPlan.coordinate,
      placementProofHash: action.dropPlan.actionHash, remainingDrops: remaining.length,
      ...(priorControl?.round === current.round
        ? { invalidatedControlResolutionHash: priorControl.controlResolutionHash } : {}) };
    next.log.push({ id: 'log-' + (next.log.length + 1), round: next.round,
      phase: next.phase, action, events: [event] });
    return { state: next, events: [event] };
  }

  function claimWindow(current) {
    const window = current.officialArtefactHuntClaimWindow;
    if (!window) return null;
    const { windowHash, ...body } = window;
    if (window.schema !== CLAIM_WINDOW_SCHEMA || window.round !== current.round
      || hash(body) !== windowHash || window.remainingSeats[0] !== current.activeSideKey) {
      throw Error('ARTEFACT_HUNT_CLAIM_WINDOW_INVALID');
    }
    return window;
  }

  function advanceClaimWindow(state, { originalActor, remainingSeats, controlResolutionHash }) {
    const nextSeats = [...remainingSeats];
    while (nextSeats.length && !kernel.claimOptions(state, state.officialArtefactHuntCustody, nextSeats[0]).length) {
      nextSeats.shift();
    }
    if (!nextSeats.length) {
      delete state.officialArtefactHuntClaimWindow;
      state.activeSideKey = originalActor;
    } else {
      state.activeSideKey = nextSeats[0];
      const body = { schema: CLAIM_WINDOW_SCHEMA, round: state.round, originalActor,
        remainingSeats: nextSeats, controlResolutionHash };
      state.officialArtefactHuntClaimWindow = { ...body, windowHash: hash(body) };
    }
    return state;
  }

  function beginClaims(state, controlResolutionHash) {
    if (claimWindow(state)) throw Error('ARTEFACT_HUNT_CLAIM_WINDOW_ALREADY_OPEN');
    const first = state.firstPlayerSideKey;
    return advanceClaimWindow(state, { originalActor: state.activeSideKey,
      remainingSeats: [first, first === 'player1' ? 'player2' : 'player1'], controlResolutionHash });
  }

  function enumerateClaims(current, sideKey) {
    const window = claimWindow(current);
    if (!window || sideKey !== window.remainingSeats[0]) return [];
    const choices = kernel.claimOptions(current, current.officialArtefactHuntCustody, sideKey);
    const preStateHash = hash(current);
    const base = { sideKey, phase: current.phase, executorId: ADAPTER_ID, executorVersion: VERSION,
      ruleAtomIds, preStateHash, windowHash: window.windowHash };
    return [
      ...choices.map(claim => ({ ...base, actionType: OFFICIAL_ARTEFACT_CLAIM_ACTION_TYPE,
        pieceId: claim.carrierUnitId, claim })),
      { ...base, actionType: OFFICIAL_ARTEFACT_FINISH_CLAIMS_ACTION_TYPE },
    ];
  }

  function applyClaimChoice(current, action) {
    const window = claimWindow(current);
    const expected = enumerateClaims(current, action.sideKey).find(candidate => isDeepStrictEqual(candidate, action));
    if (!expected) throw Error('ARTEFACT_HUNT_CLAIM_ACTION_STALE');
    let state;
    const finishing = action.actionType === OFFICIAL_ARTEFACT_FINISH_CLAIMS_ACTION_TYPE;
    if (finishing) state = structuredClone(current);
    else {
      const claimed = kernel.applyClaimToBoard(current, current.officialArtefactHuntCustody, action.claim);
      state = { ...claimed.state, officialArtefactHuntCustody: claimed.custody };
    }
    advanceClaimWindow(state, { ...window,
      remainingSeats: finishing ? window.remainingSeats.slice(1) : window.remainingSeats });
    const event = { type: finishing ? 'mission_artefact_claims_finished' : 'mission_artefact_marker_claimed',
      sideKey: action.sideKey, ...(action.claim ? { markerId: action.claim.markerId, carrierUnitId: action.pieceId } : {}),
      custodyHash: state.officialArtefactHuntCustody.custodyHash };
    state.log.push({ id: 'log-' + (state.log.length + 1), round: state.round,
      phase: state.phase, action, events: [event] });
    return { state, events: [event] };
  }

  function requiresPrePlaceDrop(current, action) {
    return kernel.binding.engagementScale === 'Standard'
      && ((action.actionType === 'resolve_relocation_ability' && action.relocationPlan?.effectKind === 'direct_place')
        || (tokenLeadingPlace && action.actionType === 'choose_psionic_transfer_round_end'
          && action.canonicalParameters?.choice === 'place'))
      && Object.values(current.officialArtefactHuntCustody.byMarkerId)
        .some(row => row?.status === 'carried' && row.carrierUnitId === action.pieceId);
  }

  function suspendPlace(current, action) {
    if (!requiresPrePlaceDrop(current, action) || current.officialArtefactHuntSuspendedPlace) {
      throw Error('ARTEFACT_HUNT_PLACE_SUSPENSION_INVALID');
    }
    const state = structuredClone(current);
    const result = observeNativeTransition(current, state, [], {
      [action.pieceId]: 'before_resolving_place',
    });
    const plan = action.relocationPlan;
    const body = { schema: SUSPENDED_PLACE_SCHEMA, adapterId: action.executorId,
      round: current.round, sideKey: action.sideKey, phase: action.phase, pieceId: action.pieceId,
      ...(action.actionType === 'choose_psionic_transfer_round_end' ? {
        kind: 'token_leading_place', effectHash: action.effectHash, canonicalParameters: action.canonicalParameters,
      } : { definitionId: plan.definitionId, sourceInstanceId: plan.sourceInstanceId,
        sourceRouteHash: plan.sourceRouteHash, canonicalParameters: plan.canonicalParameters }) };
    const [response] = pending(result.state);
    if (!response) throw Error('ARTEFACT_HUNT_PLACE_DROP_REQUIRED');
    const continuationHash = hash(body);
    result.state.officialArtefactHuntSuspendedPlace = { ...body, continuationHash };
    result.state.activeSideKey = response.placingSideKey;
    const event = { type: 'mission_artefact_place_deferred', sideKey: action.sideKey,
      pieceId: action.pieceId, continuationHash };
    result.state.log.push({ id: 'log-' + (result.state.log.length + 1), round: state.round,
      phase: state.phase, action, events: [event] });
    return { state: result.state, events: [...result.events, event] };
  }

  function takeSuspendedPlace(current) {
    const suspension = current.officialArtefactHuntSuspendedPlace;
    if (!suspension || pending(current).length) return null;
    const { continuationHash, ...body } = suspension;
    if (body.schema !== SUSPENDED_PLACE_SCHEMA || continuationHash !== hash(body)
      || body.phase !== current.phase || body.round !== current.round
      || body.sideKey !== current.activeSideKey) throw Error('ARTEFACT_HUNT_PLACE_CONTINUATION_INVALID');
    const state = { ...current };
    delete state.officialArtefactHuntSuspendedPlace;
    return { state, suspension };
  }

  function observeNativeTransition(before, after, nativeEvents, placeTimingByUnitId = {}) {
    const custody = after.officialArtefactHuntCustody;
    if (!Object.values(custody.byMarkerId).some(row => row?.status === 'carried')) {
      return { state: after, events: [] };
    }
    const lastRemovedModelIdByUnitId = {};
    const fullyMorphedModelIdByUnitId = {};
    for (const event of nativeEvents) {
      if ((event.type === 'relocation_ability_resolved' && event.effectKind === 'direct_place')
        || (tokenLeadingPlace && event.type === 'psionic_transfer_round_end_choice_resolved' && event.choice === 'place')) {
        placeTimingByUnitId[event.pieceId] = 'on_resolving_place';
      }
      // These damage executors remove models in the same order they report
      // in casualtyModelIds. Do not infer a last casualty from unit state.
      if (['ranged_attack', 'close_combat_attack', 'impact_damage'].includes(event.type)
        && event.targetDestroyed === true && event.casualtyModelIds?.length) {
        lastRemovedModelIdByUnitId[event.targetId] = event.casualtyModelIds.at(-1);
      }
      if (qualifyMorphRemoval && event.type === 'model_morphed' && event.sourceRemovalCause === 'morph'
        && event.enemyKillCredit === 0 && after.pieces.some(piece => piece.id === event.pieceId
          && piece.isOnField === false && piece.isInReserves === false && piece.currentModels === 0
          && piece.morphedModelIds?.includes(event.sourceModelId))) {
        fullyMorphedModelIdByUnitId[event.pieceId] = event.sourceModelId;
      }
    }
    const updated = kernel.observeDropTriggers(before, after, custody, { placeTimingByUnitId, lastRemovedModelIdByUnitId, fullyMorphedModelIdByUnitId });
    if (updated.custodyHash === custody.custodyHash) return { state: after, events: [] };
    const next = { ...after, officialArtefactHuntCustody: updated };
    const events = kernel.pendingOpponentDrops(next, updated)
      .filter(row => custody.byMarkerId[row.markerId]?.status !== 'pending_opponent_drop')
      .map(row => ({ type: 'mission_artefact_drop_requested', markerId: row.markerId,
        carrierUnitId: row.carrierUnitId, placingSideKey: row.placingSideKey,
        triggers: [...row.triggers], rangeMilliInches: row.rangeMilliInches, custodyHash: updated.custodyHash }));
    next.log.push({ id: 'log-' + (next.log.length + 1), round: next.round,
      phase: next.phase, action: null, events });
    return { state: next, events };
  }

  return Object.freeze({ binding: kernel.binding, enumerate, instantiate, apply,
    claimWindow, beginClaims, enumerateClaims, applyClaimChoice, observeNativeTransition,
    requiresPrePlaceDrop, suspendPlace, takeSuspendedPlace });
}
