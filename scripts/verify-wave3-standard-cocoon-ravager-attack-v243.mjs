import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/cocoon-ravager-attack-v243';
const history = base + '/wave3-artefact-cocoon-cleanup-v223-v1/chronological-room';
const sourceRef = history + '/final-checkpoint.json';
const manifestRef = base + '/wave3-artefact-cocoon-v223-v1/morph/manifest.json';
const prior = await read(history + '/result.public.json');
const { envelope } = await read(sourceRef);
const historical = envelope.state;
assert(prior.coldExact);
assert.equal(envelope.stateRevision, prior.receipts);
assert.equal(hashStarcraftTmgContract(historical), envelope.stateHash);
assert.equal(historical.round, 4);
const actorId = prior.newRavager;
const targetId = 'enemy';
const roomId = 'standard-cocoon-ravager-attack-v243';
const weapon = 'Plasma Discharge';
const context = await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
const roster = (await read(base + '/wave3-artefact-cocoon-v223-v1/factory-preflight.public.json')).find(r => r.status === 'compiled');
const opening = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, dataset: context.dataset,
  snapshot: context.snapshot, releaseMatchVersion: '2.43.0', armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  recipes: roster.recipes, missionRecordKey: historical.officialMissionRuntimeState.missionRecordKey,
  deploymentRecordKey: historical.officialDeploymentGeometryBinding.deploymentRecordKey });
assert(!opening.state.pieces.some(p => p.officialUnitRecordKey === 'army_units:ravager'));
assert.deepEqual(opening.state.officialArtefactHuntCustody.binding, historical.officialArtefactHuntCustody.binding);
const priorGeometry = historical.officialDeploymentGeometryBinding;
const currentGeometry = opening.state.officialDeploymentGeometryBinding;
// A fresh source bundle signs the same deployment card with its own bundle and draft hashes.
function deploymentFacts({ bindingHash, draftBindingHash, deploymentGeometryDataBundleHash, ...facts }) {
  for (const digest of [bindingHash, draftBindingHash, deploymentGeometryDataBundleHash]) assert.match(digest, /^[a-f0-9]{64}$/);
  return facts;
}
assert.deepEqual(deploymentFacts(currentGeometry), deploymentFacts(priorGeometry));
await save(dir + '/deployment-lineage.json', { sourceRef, previousBinding: priorGeometry.bindingHash,
  currentBinding: currentGeometry.bindingHash, previousBundle: priorGeometry.deploymentGeometryDataBundleHash,
  currentBundle: currentGeometry.deploymentGeometryDataBundleHash,
  deploymentGeometryProfileHash: currentGeometry.deploymentGeometryProfileHash, card: currentGeometry.deploymentRecordKey,
  allDeploymentFactsEqual: true });
assert.equal(historical.supplyLossLedger.entries.length, 0);
assert(Object.values(historical.officialArtefactHuntCustody.byMarkerId).every(owner => owner === null));
assert.deepEqual(historical.officialMissionRuntimeState.startRoundHistory.at(-1).effects, []);
const scenario = { sourceRef, sourceStateHash: envelope.stateHash, revision: envelope.stateRevision,
  round: historical.round, generatedId: actorId, conditionalFourthRound: true, modelCalls: 0 };
const bound = await bindWave3StandardActionRoom({ manifestRef, initial: opening.state, dir, candidateVersion: '2.43.0', scenario });
// Restore the prior board and units into a new opening. This release issues its own round/supply bindings.
const state = { ...opening.state };
for (const key of ['round', 'activeSideKey', 'firstPlayerSideKey', 'firstPassSideByPhase', 'players',
  'scores', 'pieces', 'board', 'cardResources', 'reserveManifestBySide', 'reserveLifecycleHistory',
  'supplyDestroyedThisRound', 'activeAbilityUseHistory', 'battlefieldAssetLifecycleHistory',
  'officialBattlefieldAssetBindings', 'pendingBattlefieldAssetOpportunities', 'lastReserveLifecycleResolution',
  'unitLifecycleUseHistory', 'officialReactionResolutionHistory', 'gameClock']) {
  if (Object.hasOwn(historical, key)) state[key] = historical[key];
  else delete state[key];
}
const initial = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
const actor = initial.pieces.find(p => p.id === actorId);
const enemy = initial.pieces.find(p => p.id === targetId);
assert.deepEqual(actor, historical.pieces.find(p => p.id === actorId));
assert.equal(actor.officialUnitRecordKey, 'army_units:ravager');
assert.equal(enemy.isOnField, false);
assert.equal(enemy.models.length, 6);
assert.notEqual(actor.sideKey, enemy.sideKey);
const authority = bound.authorityFor(initial, scenario);
const native = bound.open();
let revision;
try {
  const seats = await native.create(roomId, authority);
  for (;;) {
    const head = await native.store.loadRoom(roomId);
    const board = head.envelope.state;
    revision = head.stateRevision;
    assert(revision < 24 && board.round === historical.round, 'fourth-round firing window exhausted');
    const side = board.activeSideKey;
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains: domains, finiteActions: finite } = menu.legalSpace;
    const nowEnemy = board.pieces.find(p => p.id === targetId);
    const shot = board.log.flatMap(r => r.events || []).find(e =>
      e.type === 'ranged_attack' && e.pieceId === actorId && e.targetId === targetId && e.weaponName === weapon);
    const types = [...finite.map(r => r.action.actionType), ...domains.map(d => d.actionType)];
    await save(dir + '/menu-r' + revision + '.json', { revision, stateHash: head.envelope.stateHash,
      phase: board.phase, side, enemyOnField: nowEnemy.isOnField, types,
      weapons: domains.filter(d => d.weaponName).map(d => ({ pieceId: d.pieceId, type: d.actionType, weapon: d.weaponName })) });
    if (shot && side === enemy.sideKey && !board.pendingOfficialReactionWindow && !board.pendingCurrentProductRangedCasualtyChoice
      && !board.pendingCurrentProductRangedDamageReaction && !board.pendingOfficialRangedPrecisionChoice) {
      assert(types.length > 0);
      assert.equal(shot.stages.hit.dice, 4);
      assert.deepEqual(shot.stages.hit.thresholdByDieIndex, [3, 3, 3, 3]);
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId, authority);
        const replay = await cold.store.loadReplayBundle(roomId);
        const receipts = replay.privateJournal.filter(entry => entry.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
        const recovered = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts });
        assert(recovered.ok, recovered.reason);
        assert.deepEqual(recovered.envelope, head.envelope);
        assert.equal(receipts.length, revision);
        await save(dir + '/result.json', { ...scenario, roomId, version: '2.43.0', stateHash: head.envelope.stateHash,
          revision, phase: board.phase, targetId, weapon, dice: shot.stages.hit.dice, hits: shot.stages.hit.hits,
          damage: shot.stages.damage.totalDamage, surge: shot.stages.effects.surgeMatched,
          casualties: shot.casualtyModelIds, nextSide: side, coldExact: true, receipts: receipts.length });
      } finally { cold.close(); }
      break;
    }
    let domain, candidate, parameters;
    const deploy = domains.find(d => d.actionType === 'deploy' && d.pieceId === targetId);
    const ranged = domains.find(d => d.actionType === 'ranged_attack' && d.pieceId === actorId && d.weaponName === weapon);
    if (deploy && !nowEnemy.isOnField) {
      domain = deploy;
      const bottom = domain.constraints.entrySegments.find(s => s.side === 'bottom');
      assert(bottom, 'Marine uses the blue deployment edge');
      const [leader, ...others] = domain.constraints.modelProfiles;
      const x = Math.round(actor.models[0].xInches * 1000);
      const spacing = 1800;
      const baseRadius = Math.ceil(leader.baseDepthMilliInches / 2);
      const y = domain.constraints.maxDistanceMilliInches - baseRadius - 100;
      assert(y - spacing >= baseRadius, 'both Marine ranks must fit onto the table');
      const slots = [[-1,0],[1,0],[-1,-1],[0,-1],[1,-1]];
      parameters = { leadingModelId: leader.modelId, entrySegmentId: bottom.segmentId, entryAlongEdgeMilliInches: x,
        path: [{ xMilliInches: x, yMilliInches: y, elevation: 'ground' }], placements: others.map((m, i) => ({
          modelId: m.modelId, xMilliInches: x + slots[i][0]*spacing, yMilliInches: y + slots[i][1]*spacing, elevation: 'ground' })) };
    } else if (ranged && !shot) {
      assert.equal(board.phase, 'assault');
      assert(nowEnemy.isOnField);
      domain = ranged;
      parameters = { targetUnitId: targetId };
      await save(dir + '/firing-window.json', { roomId, revision, stateHash: head.envelope.stateHash,
        phase: board.phase, attacker: actorId, target: targetId, weapon,
        alsoOffered: domains.filter(d => d.pieceId === actorId).map(d => d.actionType) });
    } else {
      if (board.phase === 'assault' && side === actor.sideKey && !types.includes('choose_first_actor')
        && !shot && !board.pendingOfficialReactionWindow
        && !board.pendingAction && !board.pendingCurrentProductRangedCasualtyChoice && !board.pendingOfficialRangedPrecisionChoice) {
        assert(ranged, 'generated Ravager cannot use Plasma Discharge against deployed Marine');
      }
      for (const type of ['pass_reaction_family_window', OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,
        'finish_activation', 'resolve_mission_start_of_round', 'choose_first_actor', 'pass']) {
        domain = domains.find(d => d.actionType === type);
        candidate = finite.find(c => c.action.actionType === type && (type !== 'choose_first_actor'
          || (c.action.sourceAction?.chosenFirstActorSideKey ?? c.action.chosenFirstActorSideKey) ===
             (board.phase === 'movement' ? enemy.sideKey : actor.sideKey)));
        if (domain || candidate) break;
      }
      if (!domain && !candidate && domains.length + finite.length === 1) {
        [domain] = domains;
        [candidate] = finite;
      }
      assert(domain || candidate, JSON.stringify({ phase: board.phase, side, types }));
      if (domain) parameters = poolParameters(domain);
    }
    const committed = await native.commit({ roomId, credential: seats[side], operationKey: 'generated-r' + revision,
      ...(domain ? { select: d => d.domainId === domain.domainId, parameters: () => parameters }
        : { kind: 'finite', select: c => c.actionKey === candidate.actionKey }) });
    if (domain === deploy && deploy) {
      const after = (await native.store.loadRoom(roomId)).envelope.state;
      const unit = after.pieces.find(p => p.id === targetId);
      assert(unit.isOnField && !unit.isInReserves);
      assert(unit.models.every(m => m.isOnField));
      await save(dir + '/enemy-deployment.json', { revision: revision+1, actorId: targetId,
        entrySegmentId: parameters.entrySegmentId, models: unit.models.map(m => [m.id, m.xInches, m.yInches]),
        sourceStateHash: committed.preview.core.preStateHash });
    }
  }
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { revision, reason: error.message, frame: error.stack?.split('\n')[1] });
  throw error;
} finally { native.close(); }
