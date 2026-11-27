import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, prepareOfficialStandardReleaseOpeningV2 }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const gateDir = base + '/ravager-bile-standard-v241';
const dir = gateDir + '/native-round-start';
const roomId = 'standard-cocoon-ravager-bile';
const original = base + '/wave3-artefact-cocoon-cleanup-v223-v1/chronological-room';
const manifestRef = base + '/wave3-artefact-cocoon-v223-v1/morph/manifest.json';
const gate = await read(gateDir + '/cocoon-opening.json');
const previous = (await read(original + '/final-checkpoint.json')).envelope;
const historical = (await read(original + '/result.public.json'));
assert.equal(hash(previous.state), previous.stateHash);
assert.equal(previous.stateRevision, historical.receipts);
assert(historical.coldExact);
assert.equal(previous.state.phase, 'movement');
const actor = historical.newRavager;
const current = previous.state;
const manifest = await read(manifestRef);
assert.equal(manifest.components.missionSource.integrity.value, current.officialArtefactHuntCustody.binding.sourceBundleHash);
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const roster = (await read(gate.source)).find(row => row.status === 'compiled');
const opening = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, dataset: context.dataset,
  snapshot: context.snapshot, releaseMatchVersion: gate.version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  recipes: roster.recipes, missionRecordKey: current.officialMissionRuntimeState.missionRecordKey,
  deploymentRecordKey: current.officialDeploymentGeometryBinding.deploymentRecordKey });
assert.deepEqual(opening.state.officialArtefactHuntCustody.binding, current.officialArtefactHuntCustody.binding);
assert.deepEqual(opening.state.board.missionMarkers.map(m => m.id), current.board.missionMarkers.map(m => m.id));
const scenario = { sourceManifest: manifestRef, previous: original + '/final-checkpoint.json', revision: previous.stateRevision,
  stateHash: previous.stateHash, actor, version: gate.version };
const bound = await bindWave3StandardActionRoom({ manifestRef, initial: opening.state, dir,
  candidateVersion: gate.version, scenario });
const imported = { ...opening.state };
// Only the game in progress is imported. Release bundles and native descriptors come from the new roster factory.
for (const key of ['round', 'activeSideKey', 'firstPlayerSideKey', 'firstPassSideByPhase',
  'players', 'scores', 'pieces', 'board', 'cardResources', 'reserveManifestBySide',
  'reserveLifecycleHistory', 'supplyDestroyedThisRound', 'activeAbilityUseHistory',
  'battlefieldAssetLifecycleHistory', 'officialBattlefieldAssetBindings', 'pendingBattlefieldAssetOpportunities',
  'lastReserveLifecycleResolution', 'unitLifecycleUseHistory', 'officialReactionResolutionHistory',
  'gameClock']) {
  if (Object.hasOwn(current, key)) imported[key] = current[key];
  else delete imported[key];
}
// This is an isolated fourth-round board. The new product must issue its own mission and supply receipts.
assert.equal(opening.state.phase, 'start_of_round');
assert.equal(current.supplyLossLedger.entries.length, 0);
assert(Object.values(current.officialArtefactHuntCustody.byMarkerId).every(owner => owner === null));
assert.deepEqual(current.officialMissionRuntimeState.startRoundHistory.at(-1).effects, []);
const initial = refreshOfficialReleaseRosterDerivedStateV2({ context, state: imported });
const routeForActor = state => state.officialActionRouteCatalogue.units.find(unit => unit.pieceId === actor);
assert(routeForActor(initial));
assert.deepEqual(routeForActor(initial), routeForActor(current));
assert.equal(initial.pieces.find(p => p.id === actor).officialUnitRecordKey, 'army_units:ravager');
const authority = bound.authorityFor(initial, scenario);
const native = bound.open();
let rev;
try {
  const seats = await native.create(roomId, authority);
  for (;;) {
    const { stateRevision, envelope } = await native.store.loadRoom(roomId);
    rev = stateRevision;
    const state = envelope.state, side = state.activeSideKey;
    const events = state.log.slice(initial.log.length).flatMap(row => row.events || []);
    if (state.phase === 'combat') {
      const projected = await read(dir + '/placement.json');
      const effect = state.resolvedCorrosiveBileEffects.find(row => row.effect.sourcePieceId === actor);
      assert.deepEqual(effect.completedWork.map(row => row.targetUnitId).sort(), projected.targets.toSorted());
      assert(!state.board.tokens.some(row => effect.effect.tokenIds.includes(row.tokenId)));
      assert(!state.pendingCorrosiveBileEffects?.length && !state.pendingOfficialAutomaticHits);
      assert(events.some(e => e.type === 'phase_completion_deferred' && e.reason === 'corrosive_bile_assault_end'));
      assert(events.some(e => e.type === 'corrosive_bile_hits_declared' && e.hits === 5 && e.damagePerHit === 1));
      assert(events.some(e => e.type === 'corrosive_bile_effect_complete'));
      const next = await native.room.legalSpace({roomId, seatToken: seats[side].seatToken});
      assert(next.ok && next.legalSpace.finiteActions.length + next.legalSpace.parameterDomains.length > 0);
      await save(dir + '/successor.json', { revision: rev, stateHash: envelope.stateHash, round: state.round,
        phase: state.phase, side, tasksResolved: effect.completedWork, tokenIdsRemoved: effect.effect.tokenIds, modelCalls: 0 });
      break;
    }
    assert(rev < 30, 'unexpected number of continuations');
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, [menu.reason, menu.message].filter(Boolean).join(' — '));
    const { legalSpace } = menu;
    const finite = legalSpace.finiteActions, domains = legalSpace.parameterDomains;
    let choice, parameters, kind = 'parameterized';
    if (state.phase === 'movement' && side === current.activeSideKey && !state.corrosiveBileUseHistory?.length
      && domains.some(d => d.pieceId === actor && d.actionType === 'set_corrosive_bile')) {
      assert.equal(state.supplyLossLedger.rulesRuntimeHash, state.officialMissionRuntimeDescriptor.runtimeHash);
      assert.deepEqual(state.officialRoundSupplyState.supplyPoolBySide, current.officialRoundSupplyState.supplyPoolBySide);
      choice = domains.find(d => d.pieceId === actor && d.actionType === 'set_corrosive_bile');
      assert(choice, 'generated Ravager must have a legal bile action');
      const modelId = state.pieces.find(p => p.id === actor).models.find(m => m.isOnField).id;
      parameters = { paymentCardInstanceIds: choice.parameterSchema.paymentCardInstanceIds.choices[0],
        placements: [{ modelId, xMilliInches: 42400, yMilliInches: 12212 }] };
      const invalid = { ...parameters, placements: [{ modelId, xMilliInches: 44560, yMilliInches: 14400 }] };
      assert.throws(() => bound.runtime.queryCorrosiveBilePlacement(state, actor, invalid), /CORROSIVE_BILE_MODEL_OVERLAP/);
      const query = bound.runtime.queryCorrosiveBilePlacement(state, actor, parameters);
      assert.equal(query.mutationAuthority, false);
      assert.deepEqual(query.result.canonicalParameters, parameters);
      assert.equal(query.stateHash, envelope.stateHash);
      await save(dir + '/preview.json', { revision: rev, queryHash: query.queryReceiptHash, stateHash: query.stateHash,
        paymentCardInstanceIds: parameters.paymentCardInstanceIds, tokenIds: query.result.action.sourceAction.tokens.map(token => token.tokenId) });
    } else {
      if (state.phase === 'movement' && state.pendingCorrosiveBileEffects?.length && !existsSync(dir + '/placement.json')) {
        const effect = bound.runtime.queryCorrosiveBileProjection(state).effects[0];
        const targets = effect.tokens.flatMap(t => t.targets.map(r => r.pieceId));
        assert(targets.includes('swarm'));
        const preview = await read(dir + '/preview.json');
        assert.deepEqual(effect.tokens.map(row => row.tokenId), preview.tokenIds);
        assert(preview.paymentCardInstanceIds.every(id => state.cardResources.player1.some(card =>
          card.cardInstanceId === id && card.readiness === 'exhausted')));
        assert.equal(effect.sourcePieceId, actor);
        await save(dir + '/placement.json', { revision: rev, stateHash: envelope.stateHash, actor, targets,
          hits: effect.hitsPerToken, damagePerHit: effect.damagePerHit, tokens: effect.tokens.map(t => t.tokenId) });
      }
      const offered = finite.map(row => row.action.actionType);
      if (offered.includes('resolve_ordered_corrosive_bile_effect')) {
        assert.equal(domains.length, 0);
        assert(!offered.includes('pass') && !offered.includes('finish_activation'));
        await save(dir + '/order.json', { revision: rev, phase: state.phase, side,
          bothPassed: ['player1','player2'].every(key => state.players[key].passedPhases.assault === true), choices: offered });
      }
      const prior = ['resolve_ordered_corrosive_bile_effect','finish_activation','pass_reaction_family_window',
        'finish_artefact_hunt_claims','resolve_mission_start_of_round','resolve_current_product_next_round_initiative','choose_first_actor','pass'];
      for (const name of prior) {
        choice = finite.find(row => row.action.actionType === name
          && (name !== 'choose_first_actor' || (row.action.sourceAction?.chosenFirstActorSideKey ?? row.action.chosenFirstActorSideKey) === 'player1'));
        if (choice) { kind = 'finite'; break; }
        choice = domains.find(row => row.actionType === name);
        if (choice) { parameters = choice.parameterSchema.required.length ? poolParameters(choice) : {}; break; }
      }
      if (!choice && finite.length === 1 && !domains.length) { [choice] = finite; kind = 'finite'; }
      if (!choice && domains.length === 1 && !finite.length) { [choice] = domains; parameters = poolParameters(choice); }
      assert(choice, 'successor selection: ' + JSON.stringify({ side, phase: state.phase, offered,
        domains: domains.map(row => row.actionType) }));
    }
    await native.commit({ roomId, credential: seats[side], operationKey: 'step-' + rev, kind,
      select: row => kind === 'finite' ? row.actionKey === choice.actionKey : row.domainId === choice.domainId,
      parameters: () => parameters });
  }
} catch (error) {
  const stop = dir + '/stop-r' + String(rev ?? 'opening');
  const ref = existsSync(stop + '.json') ? stop + '-' + Date.now() + '.json' : stop + '.json';
  await save(ref, { revision: rev, message: error.message });
  throw error;
} finally { native.close(); }
const cold = bound.open();
try {
  await cold.restoreDependencies(roomId, authority);
  const bundle = await cold.store.loadReplayBundle(roomId);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  const recovered = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
  const end = await cold.store.loadRoom(roomId);
  assert(recovered.ok, recovered.reason);
  assert.deepEqual(recovered.envelope, end.envelope);
  await save(dir + '/cold.json', { receipts: receipts.length, revision: end.stateRevision,
    stateHash: end.envelope.stateHash, exact: true, source: scenario });
} finally { cold.close(); }
