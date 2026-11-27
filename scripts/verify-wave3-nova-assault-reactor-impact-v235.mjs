import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const sourceRef = base + '/nova-holo-standard-v233/nova_assault_mode/factory-state.json';
const dir = base + '/nova-assault-reactor-impact-v235';
const roomId = 'standard-nova-assault-reactor-impact';
const hero = 'nova_assault_mode', target = 'zergling';
const suit = 'unit:nova_assault_mode/phase-reactor-suit-assault-phase@1';
const impact = 'unit:nova_assault_mode/devastating-charge-assault-phase@1';
const initial = await read(sourceRef);
initial.stage = 'activation_phases';
initial.phase = 'assault';
initial.activeSideKey = initial.firstPlayerSideKey = 'player1';
initial.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault',
  markerHolderSideKey: 'player1', chosenFirstActorSideKey: 'player1' };
for (const id of [hero, target]) {
  const piece = initial.pieces.find(p => p.id === id);
  Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  initial.reserveManifestBySide[piece.sideKey].find(m => m.pieceId === id).deploymentStatus = 'deployed';
  for (const [i, m] of piece.models.entries()) {
    const angle = Math.PI + 2 * Math.PI * (i - 1) / Math.max(1, piece.models.length - 1);
    Object.assign(m, { isOnField: true, xInches: (id === hero ? 10 : 18) + (i ? Math.round(2700 * Math.cos(angle)) / 1000 : 0),
      yInches: 10 + (i ? Math.round(2700 * Math.sin(angle)) / 1000 : 0) });
  }
}
declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
initial.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: initial,
  missionSupplyProfile: initial.officialMissionSupplyProfile, rulesRuntimeHash: initial.supplyLossLedger.rulesRuntimeHash });
for (const side of ['player1', 'player2']) initial.players[side].supply = initial.officialRoundSupplyState.supplyPoolBySide[side];
const { open, authority } = await bindWave3StandardActionRoom({ manifestRef: base + '/tabletop-raven-m01-v1/manifest.json',
  initial, dir, candidateVersion: '2.35.0', scenario: { sourceRef, declaredPositions: true, hero, target, phase: 'assault' } });
const native = open();
try {
  const seats = await native.create(roomId, authority);
  for (let i = 0; i < 24; i++) {
    const { stateRevision, envelope } = await native.store.loadRoom(roomId);
    const state = envelope.state, actor = state.pieces.find(p => p.id === hero), foe = state.pieces.find(p => p.id === target);
    const side = state.activeSideKey, events = state.log.flatMap(row => row.events ?? []);
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.reason ?? menu.code);
    const { finiteActions, parameterDomains } = menu.legalSpace;
    await save(dir + '/menu-r' + stateRevision + '.json', { side, stateHash: envelope.stateHash,
      finite: finiteActions.map(row => row.action.actionType),
      domains: parameterDomains.map(row => ({ type: row.actionType, pieceId: row.pieceId, definitionId: row.definitionId })) });
    const hit = events.find(e => e.type === 'impact_damage');
    if (hit) {
      assert.equal(hit.stages.hitRolls.length, 4);
      assert.equal(hit.stages.hitThreshold, 4);
      assert(!parameterDomains.some(row => row.actionType === 'resolve_impact'));
      await save(dir + '/result.json', { stateRevision, stateHash: envelope.stateHash, hitRolls: hit.stages.hitRolls,
        damage: hit.stages.totalDamage, source: impact, target, nextSide: side });
      break;
    }
    let domain, parameters, finite;
    if (!stateRevision) {
      domain = parameterDomains.find(row => row.definitionId === suit && row.pieceId === hero);
      assert(domain, 'Phase Reactor Suit missing from formal menu');
      const leading = actor.models[0].id;
      parameters = { leadingModelId: leading, placements: [{ modelId: leading, xMilliInches: 12000, yMilliInches: 10000 }],
        paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] };
    } else if (stateRevision === 1) {
      assert.equal(actor.models[0].xInches, 12);
      assert.equal(state.selectedRosterActivationWindow.stage, 'before_action');
      assert.equal(state.cardResources.player1.find(c => c.cardKind === 'faction').readiness, 'exhausted');
      domain = parameterDomains.find(d => d.actionType === 'charge' && d.pieceId === hero);
      assert(domain, 'paid relocation consumed the ordinary assault action');
      parameters = { leadingModelId: actor.models[0].id, targets: [{ unitId: target, modelId: foe.models[1].id }] };
    } else if ((domain = parameterDomains.find(d => d.actionType === 'resolve_charge'))) {
      const model = foe.models[1];
      const xMilliInches = Math.round(model.xInches * 1000) - Math.round(model.baseWidthInches * 500)
        - Math.round(actor.models[0].baseWidthInches * 500);
      parameters = { outcome: 'success', path: [{ xMilliInches, yMilliInches: 10000, elevation: 'ground', supportTerrainIds: [] }], placements: [] };
    } else if ((domain = parameterDomains.find(d => d.actionType === 'resolve_impact'
      && d.parameterSchema.required.includes('allocations')))) {
      assert.equal(state.pendingAction.sourceDefinitionId, impact);
      assert.equal(state.pendingAction.impactDice, 4);
      assert(!parameterDomains.some(d => d.actionType === 'finish_activation'));
      parameters = { allocations: domain.parameterSchema.eligibleModels.map(m => ({
        modelId: m.modelId, targetUnitId: target, dice: m.impactDice })) };
    } else if ((finite = finiteActions.find(row => row.action.actionType === 'roll_declared_charge'))) {
      // The player commits the charge roll before choosing a placement.
    } else if (parameterDomains.length === 1) {
      [domain] = parameterDomains;
      parameters = poolParameters(domain);
    } else {
      assert.equal(parameterDomains.length, 0);
      assert.equal(finiteActions.length, 1);
      [finite] = finiteActions;
    }
    const choice = domain ? { select: row => row.domainId === domain.domainId, parameters: () => parameters }
      : { kind: 'finite', select: row => row.actionKey === finite.actionKey };
    await native.commit({ roomId, credential: seats[side], operationKey: 'r' + stateRevision, ...choice });
  }
} finally { native.close(); }
const result = await read(dir + '/result.json');
const cold = open();
try {
  await cold.restoreDependencies(roomId, authority);
  const end = await cold.store.loadRoom(roomId), journal = await cold.store.loadReplayBundle(roomId);
  const receipts = journal.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
  const replay = cold.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts });
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.envelope, end.envelope);
  assert.equal(result.stateHash, end.envelope.stateHash);
  assert.equal(result.stateRevision, receipts.length);
  await save(dir + '/cold.json', { exact: true, receipts: receipts.length, stateHash: result.stateHash });
} finally { cold.close(); }
