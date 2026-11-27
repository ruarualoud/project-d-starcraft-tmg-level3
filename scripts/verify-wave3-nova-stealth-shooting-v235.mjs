import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { createOfficialMultiModelCasualtyResolutionKernelV1 } from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const out = base + '/nova-stealth-standard-v235';
const sourceRef = out + '/stealth-factory/factory-state.json';
const dir = out + '/paid-shot';
const roomId = 'standard-nova-stealth-paid-shot';
const hero = 'nova_stealth_mode', enemy = 'zergling', weapon = 'C-20A Canister Rifle';
const factoryCard = state => state.cardResources.player1.find(c => c.officialCardRecordKey === 'tactical_cards:factory');
const attack = state => state.log.flatMap(entry => entry.events ?? []).find(e =>
  e.type === 'ranged_attack' && e.pieceId === hero && e.weaponName === weapon && e.targetId === enemy);

// Start at a declared assault phase with one surviving target model. The actual attack uses Room dice.
const initial = await read(sourceRef);
initial.stage = 'activation_phases';
initial.phase = 'assault';
initial.firstPlayerSideKey = initial.activeSideKey = 'player1';
initial.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault',
  chosenFirstActorSideKey: 'player1', markerHolderSideKey: 'player1' };
for (const [id, x] of [[hero, 10], [enemy, 17]]) {
  const piece = initial.pieces.find(p => p.id === id);
  Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  initial.reserveManifestBySide[piece.sideKey].find(row => row.pieceId === id).deploymentStatus = 'deployed';
  for (const [index, model] of piece.models.entries()) {
    const angle = 2 * Math.PI * (index - 1) / Math.max(1, piece.models.length - 1);
    Object.assign(model, { isOnField: true, xInches: x + (index ? Math.round(2700 * Math.cos(angle)) / 1000 : 0),
      yInches: 10 + (index ? Math.round(2700 * Math.sin(angle)) / 1000 : 0) });
  }
}
initial.pieces.find(p => p.id === hero).statuses.push('stationary');
initial.cardResources.player1.find(c => c.cardKind === 'faction').readiness = 'exhausted';
assert.equal(factoryCard(initial).readiness, 'ready');
const target = initial.pieces.find(p => p.id === enemy);
const targetProfile = initial.officialCombatProfileBundle.profiles.find(p => p.recordKey === target.officialUnitRecordKey);
const casualties = createOfficialMultiModelCasualtyResolutionKernelV1();
const priorLoss = casualties.createDomain({ targetPiece: target, targetHitPoints: targetProfile.hitPoints,
  priorDamageMarker: 0, incomingDamage: (target.models.length - 1) * targetProfile.hitPoints,
  visibleModelIds: target.models.map(m => m.id), engagementGraph: deriveOfficialEngagementGraphV2(initial),
  attackResolutionHash: hash({ scenario: roomId, target: enemy }), rulesRuntimeHash: casualties.descriptor.kernelHash });
applyOfficialSelectedRosterResolvedDamageV1(initial, target, targetProfile,
  casualties.resolve({ domain: priorLoss, casualtyModelIds: target.models.slice(1).map(m => m.id) }));
assert.equal(target.currentModels, 1);
declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
initial.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state: initial,
  missionSupplyProfile: initial.officialMissionSupplyProfile, rulesRuntimeHash: initial.supplyLossLedger.rulesRuntimeHash });
for (const side of ['player1', 'player2']) initial.players[side].supply = initial.officialRoundSupplyState.supplyPoolBySide[side];

const { open, authority } = await bindWave3StandardActionRoom({
  manifestRef: base + '/tabletop-raven-m01-v1/manifest.json', initial, dir, candidateVersion: '2.35.0',
  scenario: { sourceRef, hero, enemy, declaredStartingPositions: true, priorLossDomainHash: priorLoss.domainHash,
    initialTargetModels: 1, factionCardExhausted: true, stationary: true } });
const native = open();
try {
  const seats = await native.create(roomId, authority);
  for (let step = 0; step < 20; step++) {
    const { envelope, stateRevision } = await native.store.loadRoom(roomId);
    const state = envelope.state, side = state.activeSideKey, card = factoryCard(state), event = attack(state);
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.reason ?? menu.code);
    const { finiteActions, parameterDomains } = menu.legalSpace;
    await save(dir + '/menu-r' + stateRevision + '.json', { side, stateHash: envelope.stateHash,
      finite: finiteActions.map(row => row.action.actionType),
      domains: parameterDomains.map(row => ({ type: row.actionType, pieceId: row.pieceId, fields: row.parameterSchema.required })) });
    let domain, parameters;
    if (!stateRevision) {
      domain = parameterDomains.find(row => row.actionType === 'declare_ranged_attack' && row.pieceId === hero);
      assert(domain?.parameterSchema.reactionAbilityName.enum.includes('Head Shot'));
      assert(!parameterDomains.some(row => row.actionType === 'ranged_attack' && row.pieceId === hero));
      parameters = { reactionAbilityName: 'Head Shot', paymentCardInstanceIds: [card.cardInstanceId] };
    } else if (stateRevision === 1) {
      const parent = state.pendingOfficialRangedAttackDeclaration;
      assert.equal(parent.pieceId, hero);
      assert.equal(parent.keywordEffects[0].weaponDamage, 3);
      assert.equal(parent.keywordEffects[0].concentratedFire, 1);
      assert.equal(card.readiness, 'exhausted');
      assert.equal(finiteActions.length, 0, 'declaration must be followed by its target selection');
      assert(parameterDomains.length && parameterDomains.every(row => row.pieceId === hero && row.actionType === 'ranged_attack'));
      [domain] = parameterDomains;
      parameters = { targetUnitId: enemy };
    } else if (event) {
      assert.equal(event.stages.damage.damagePerDie, 3);
      assert.equal(event.concentratedFire.maximumCasualties, 1);
      const qualified = event.targetDestroyed || event.currentSupplyAfter < event.currentSupplyBefore;
      domain = parameterDomains.find(row => row.actionType === 'resolve_ranged_card_refresh');
      if (!qualified || card.readiness === 'ready') {
        assert.equal(domain, undefined);
        assert.equal(card.readiness, qualified ? 'ready' : 'exhausted');
        await save(dir + '/result.json', { stateRevision, stateHash: envelope.stateHash, weapon,
          hitDice: event.stages.hit.dice, targetDestroyed: event.targetDestroyed, qualified,
          card: card.officialCardRecordKey, readiness: card.readiness });
        break;
      }
      assert.equal(finiteActions.length, 0);
      assert.equal(parameterDomains.length, 1);
      assert(domain.parameterSchema.cardInstanceId.enum.includes(null));
      assert(domain.parameterSchema.cardInstanceId.enum.includes(card.cardInstanceId));
      parameters = { cardInstanceId: card.cardInstanceId };
    } else if (parameterDomains.length === 1) {
      [domain] = parameterDomains;
      parameters = poolParameters(domain);
    } else {
      assert.equal(parameterDomains.length, 0);
      assert.equal(finiteActions.length, 1);
    }
    const choice = domain ? { select: row => row.domainId === domain.domainId, parameters: () => parameters }
      : { kind: 'finite', select: row => row.actionKey === finiteActions[0].actionKey };
    await native.commit({ roomId, credential: seats[side], operationKey: 'r' + stateRevision, ...choice });
  }
} finally { native.close(); }

const result = await read(dir + '/result.json');
const cold = open();
try {
  await cold.restoreDependencies(roomId, authority);
  const end = await cold.store.loadRoom(roomId);
  const replay = await cold.store.loadReplayBundle(roomId);
  const receipts = replay.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
  assert.equal(receipts.length, result.stateRevision);
  const restored = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: receipts });
  assert.equal(restored.ok, true);
  assert.deepEqual(restored.envelope, end.envelope);
  assert.equal(result.stateHash, restored.envelope.stateHash);
  await save(dir + '/cold.json', { exact: true, receipts: receipts.length, stateHash: result.stateHash });
} finally { cold.close(); }
