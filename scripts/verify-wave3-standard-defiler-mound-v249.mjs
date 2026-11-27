import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/standard-defiler-mound-v249';
const tunnel = process.argv.includes('--tunnel');
const branch = tunnel ? 'tunnel' : 'mark';
const out = dir + '/' + branch;
const roomId = 'standard-defiler-mound-v249-' + branch;
const version = '2.49.0';
const poisonId = 'card:defiler_mound/poisonous-essence-any@1';
const tunnelId = 'card:defiler_mound/tunnel-network-any@1';
const cardKey = 'tactical_cards:defiler_mound';
const actor = 'defiler', unengaged = 'ally', enemy = 'spec_ops_marauder__marauder_';
const positions = { [actor]: [[19,8]], [unengaged]: [[14,8]], [enemy]: [[22.25,8],[24.35,8]] };

async function readOpening() {
  try { return await read(dir + '/opening.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const prior = await read(base + '/standard-defiler-bite-v248/opening.json');
  const context = await resolveWave3StandardContext(await read(prior.manifestRef), 'area_ability_inputs');
  const recipes = structuredClone(prior.recipes);
  recipes.player2.tacticalCardRecordKeys.push(cardKey);
  const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: version, releaseContext: context,
    snapshot: context.snapshot, dataset: context.dataset, recipes, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: prior.mission, deploymentRecordKey: prior.deployment });
  assert.equal(state.phase, 'start_of_round');
  assert.equal(state.officialReleaseMoundAssaultTiming, state.officialPoisonousEssencePolicy.policyHash);
  assert(state.officialUnitLifecycleFamilySourceBundle.definitionIds.includes(tunnelId));
  const opening = { version, recipes, mission: prior.mission, deployment: prior.deployment, manifestRef: prior.manifestRef, state };
  await save(dir + '/opening.json', opening);
  return opening;
}

const opening = await readOpening();
const initial = structuredClone(opening.state);
let scenario = { declaredStartingPositions: positions, phaseAtOpening: initial.phase, twoHumanSeats: true, fullMatch: false };
const runtimeRef = dir + '/mark/runtime.json';
const savedDescriptor = await read(runtimeRef).then(() => true, error => {
  if (error.code === 'ENOENT') return false;
  throw error;
});
const bound = await bindWave3StandardActionRoom({ manifestRef: opening.manifestRef, initial, dir: out,
  candidateVersion: version, scenario, ...(tunnel || savedDescriptor ? { frozenRuntimeRef: runtimeRef } : {}) });
// The bound factory may freeze nested authority records. Place the scenario on a dedicated copy.
let root = structuredClone(initial);
if (tunnel) {
  const fork = await read(dir + '/choice.json');
  assert.equal(hash(fork.state), fork.hash);
  root = fork.state;
  scenario = { sourceRoom: 'standard-defiler-mound-v249-mark', sourceRevision: fork.revision, sourceHash: fork.hash };
} else {
  for (const [id, coords] of Object.entries(positions)) {
    const piece = root.pieces.find(p => p.id === id);
    assert.equal(piece.models.length, coords.length);
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed',
      leadingModelId: piece.models[0].id, xInches: coords[0][0], yInches: coords[0][1] });
    coords.forEach(([xInches,yInches], i) => Object.assign(piece.models[i], { isOnField: true, xInches, yInches }));
    root.reserveManifestBySide[piece.sideKey].find(entry => entry.pieceId === id).deploymentStatus = 'deployed';
  }
  declareWave3EngineeringCoherencyV1(root, { planIdPrefix: roomId });
  root.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: root });
}
const authority = bound.authorityFor(root, scenario);
const native = bound.open();
let revision;
try {
  const seats = await native.create(roomId, authority);
  for (;;) {
    const { envelope, stateRevision } = await native.store.loadRoom(roomId);
    revision = stateRevision;
    assert(revision < 28, 'expected a single movement and assault phase');
    const state = envelope.state, side = state.activeSideKey ?? state.firstPlayerSideKey;
    const { ok, legalSpace, message } = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(ok, message);
    const domains = legalSpace.parameterDomains, finite = legalSpace.finiteActions;
    const events = state.log.flatMap(row => row.events || []);
    const card = state.cardResources.player2.find(c => c.officialCardRecordKey === cardKey);
    const poisonDomains = domains.filter(d => d.definitionId === poisonId);
    const tunnelDomains = domains.filter(d => d.definitionId === tunnelId);
    const retreated = state.pieces.find(p => p.id === unengaged);
    const markHistory = state.poisonousEssencePhaseEndHistory || [];
    const marked = state.pieces.find(p => p.id === actor).statuses.some(s => s.sourceDefinitionId === poisonId);
    await save(out + '/menu-r' + revision + '.json', { revision, phase: state.phase, side,
      stateHash: envelope.stateHash, cardReadiness: card.readiness,
      domains: domains.map(d => ({ type:d.actionType, id:d.definitionId, piece:d.pieceId })),
      finite: finite.map(c => c.action.actionType) });
    const finished = tunnel ? retreated.isInReserves && side === 'player1' : markHistory.length === 1 && state.phase === 'combat';
    if (finished) {
      assert.equal(card.readiness, 'exhausted');
      let detail;
      if (tunnel) {
        assert.equal(retreated.isOnField, false);
        assert(retreated.models.every(m => !m.isOnField && m.xInches == null && m.yInches == null));
        assert.equal(state.reserveManifestBySide.player2.find(row => row.pieceId === unengaged).deploymentStatus, 'in_reserves');
        assert.equal(retreated.activatedPhases.movement, true);
        assert(events.some(e => e.type === 'unit_activation_finished' && e.pieceId === unengaged));
        assert.equal(markHistory.length, 0);
        detail = { returned: unengaged, reserveManifest: 'in_reserves', successorSide:side };
      } else {
        const [history] = markHistory;
        const hit = history.events.find(e => e.type === 'poisonous_essence_non_lethal_damage');
        assert.equal(hit.targetPieceId, enemy);
        assert.deepEqual(history.groups.map(row=>row.targetUnitIds), [[enemy]]);
        assert.equal(state.pieces.find(p => p.id === enemy).damageMarker, 2);
        assert.equal(state.pieces.find(p => p.id === enemy).currentModels, 2);
        assert(marked);
        assert.equal(state.officialDeferredMoundAssaultRound, undefined);
        assert.equal(bound.runtime.queryPoisonousEssencePhaseEnd(state).canStart, false);
        detail = { marked: actor, target:enemy, damage:2, targetModels:2, resolutionHash:history.resolutionHash };
      }
      assert(finite.length || domains.length);
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId, authority);
        const journal = await cold.store.loadReplayBundle(roomId);
        const receipts = journal.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
        const replay = cold.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts });
        assert(replay.ok, replay.reason);
        assert.deepEqual(replay.envelope, envelope);
        assert.equal(receipts.length, revision);
        await save(out + '/result.json', { roomId, scenario, revision, round:state.round, phase:state.phase,
          ...detail, receipts:receipts.length, coldExact:true, modelCalls:0, stateHash:envelope.stateHash });
      } finally { cold.close(); }
      break;
    }
    let domain, choice, tunnelPreview, parameters = {};
    if (card.readiness !== 'exhausted' && side === 'player2' && state.phase === 'movement' && (tunnelDomains.length || poisonDomains.length)) {
      assert(poisonDomains.some(d => d.pieceId === actor));
      assert(tunnelDomains.some(d => d.pieceId === unengaged));
      assert(!tunnelDomains.some(d => d.pieceId === actor));
      if (!tunnel) await save(dir + '/choice.json', { state, revision, hash:envelope.stateHash });
      const id = tunnel ? unengaged : actor;
      domain = (tunnel ? tunnelDomains : poisonDomains).find(d => d.pieceId === id);
      parameters = { activeUnitId:id, paymentCardInstanceIds:[] };
      if (tunnel) {
        assert.throws(() => bound.runtime.queryTunnelNetwork(state, actor), /TUNNEL_NETWORK_DOMAIN_UNAVAILABLE/);
        tunnelPreview = bound.runtime.queryTunnelNetwork(state, unengaged);
      }
    } else if (state.officialDeferredMoundAssaultRound === state.round) {
      const query = bound.runtime.queryPoisonousEssencePhaseEnd(state);
      assert(query.canStart);
      assert.deepEqual(query.scope.groups.map(g => g.targetUnitIds), [[enemy]]);
      choice = finite.find(c => c.action.actionType === 'resolve_ordered_poisonous_essence_effect');
      assert(choice);
      await save(out + '/phase-end-query.json', { revision, query });
    } else {
      if (marked) { assert.equal(card.readiness, 'exhausted'); assert(!poisonDomains.length && !tunnelDomains.length); }
      for (const type of ['pass_reaction_family_window','finish_activation','choose_first_actor','pass']) {
        domain = domains.find(d => d.actionType === type);
        choice = finite.find(c => c.action.actionType === type && (type !== 'choose_first_actor'
          || (c.action.chosenFirstActorSideKey ?? c.action.sourceAction?.chosenFirstActorSideKey) === 'player2'));
        if (domain || choice) break;
      }
      if (!domain && !choice && domains.length + finite.length === 1) { [domain] = domains; [choice] = finite; }
      assert(domain || choice, 'unexpected menu at r' + revision);
      if (domain) parameters = poolParameters(domain);
    }
    const select = domain ? { select:d => d.domainId === domain.domainId, parameters:() => parameters }
      : { kind:'finite', select:c => c.actionKey === choice.actionKey };
    const committed = await native.commit({ roomId, credential: seats[side], operationKey:'defiler-mound-r' + revision, ...select });
    if (tunnelPreview) assert.deepEqual(committed.preview.core.action.sourceAction, tunnelPreview.result.action);
  }
} catch (error) {
  await save(out + '/stop-' + Date.now() + '.json', { revision, code:error.code, message:error.message, stack:error.stack?.split('\n').slice(0,3) });
  throw error;
} finally { native.close(); }
