import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const branch = process.argv[2];
assert(['charge-on', 'charge-off', 'tumor'].includes(branch));
const version = '2.53.0';
const dir = base + '/standard-malignant-creep-v253/' + branch;
const roomId = 'standard-malignant-creep-' + branch + '-v253';
const placement = branch === 'tumor';
const on = branch === 'charge-on';
const actor = 'kerrigan';
const opponent = 'nova_stealth_mode';
const creepCard = 'tactical_cards:malignant_creep';
const markerRemoval = 'card:malignant_creep/creep-removal-any@1';
const placementAbility = 'card:hatchery/creep-spread-any@1';

function placeOne(state, id, xInches) {
  const piece = state.pieces.find(p => p.id === id);
  assert.equal(piece.models.length, 1);
  const position = { isOnField: true, xInches, yInches: 4 };
  Object.assign(piece, position, { isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
  Object.assign(piece.models[0], position);
  state.reserveManifestBySide[piece.sideKey].find(row => row.pieceId === id).deploymentStatus = 'deployed';
}

async function coldReplay(bound, authority, envelope, revision) {
  const cold = bound.open();
  try {
    await cold.restoreDependencies(roomId, authority);
    const bundle = await cold.store.loadReplayBundle(roomId);
    const receipts = bundle.privateJournal.filter(r => r.payload.type === 'accepted_transition').map(r => r.payload.payload.receipt);
    assert.equal(receipts.length, revision);
    const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
    assert(replay.ok, replay.reason);
    assert.deepEqual(replay.envelope, envelope);
  } finally { cold.close(); }
}

async function start() {
  const source = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(source.manifestRef), 'area_ability_inputs');
  const recipes = structuredClone(source.recipes);
  if (!placement) {
    const support = recipes.player2.units.find(unit => unit.recordKey === 'army_units:queen');
    Object.assign(support, { unitInstanceId: 'launcher', recordKey: 'army_units:bile_launcher' });
  }
  const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: version,
    releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes,
    missionRecordKey: source.mission, deploymentRecordKey: source.deployment,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
  const routes = state.officialBattlefieldAssetFamilySourceBundle.routes.filter(r => r.recordKey === creepCard);
  assert.equal(routes.length, 3);
  for (const route of routes) {
    assert.equal(route.sourceFeatureHash, source.rows.find(r => r.definitionId === route.definitionId).sourceFeatureHash);
  }
  const scenario = { branch, declaredPositions: true, phase: placement ? 'start_of_round' : 'assault',
    twoHumanSeats: true, actor, opponent };
  const bound = await bindWave3StandardActionRoom({ initial: state, manifestRef: source.manifestRef, dir, candidateVersion: version, scenario });
  const initial = structuredClone(state);
  placeOne(initial, actor, 12);
  placeOne(initial, opponent, placement ? 20.5 : 17.5);
  if (!placement) {
    placeOne(initial, 'launcher', on ? 5 : 37);
    Object.assign(initial, { stage: 'activation_phases', phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
    initial.phaseFirstActorByRound['1:assault'] = { phase: 'assault', round: 1, chosenFirstActorSideKey: 'player2', markerHolderSideKey: 'player2' };
    delete initial.selectedRosterActivationWindow;
  }
  declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: roomId });
  initial.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: initial });
  return { bound, authority: bound.authorityFor(initial, scenario), routes };
}

let revision, native;
try {
  const { bound, authority, routes } = await start();
  native = bound.open();
  const seats = await native.create(roomId, authority);
  for (;;) {
    const aggregate = await native.store.loadRoom(roomId);
    revision = aggregate.stateRevision;
    assert(revision < 24, 'one action and its successor should fit the scenario');
    const { envelope } = aggregate;
    const state = envelope.state;
    const side = state.activeSideKey ?? state.firstPlayerSideKey;
    const menu = await native.room.legalSpace({ roomId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains: domains, finiteActions: finite } = menu.legalSpace;
    const events = state.log.flatMap(entry => entry.events || []);
    const hit = events.find(e => e.type === 'impact_damage' && e.pieceId === actor && e.targetId === opponent);
    const removed = events.find(e => e.type === 'creep_tumor_removed');
    const token = state.board.tokens.find(t => t.tokenKind === 'creep_tumor' && !t.isRemoved);
    const unit = state.pieces.find(p => p.id === actor);
    const foe = state.pieces.find(p => p.id === opponent);
    const query = (piece, action) => bound.runtime.queryBattlefieldModifiers(state, piece, action).result;
    await save(dir + '/menu-r' + revision + '.json', { revision, side, phase: state.phase, pending: state.pendingAction?.stage,
      domains: domains.map(d => [d.actionType,d.pieceId,d.definitionId]), finite: finite.map(c => c.action.actionType), stateHash: envelope.stateHash });
    if ((placement && removed) || (!placement && hit && side === 'player1' && !state.pendingAction && !state.pendingOfficialReactionWindow)) {
      let proof;
      if (placement) {
        assert(!token);
        assert.equal(removed.movingPieceId, opponent);
        assert.equal(removed.triggeringActionType, 'move');
        assert(removed.measurementResultHash);
        assert.equal(removed.sourceFeatureHash, routes.find(r => r.definitionId === markerRemoval).sourceFeatureHash);
        assert.equal(query(actor).onCreep, false);
        proof = { removed, postMoveOnCreep: false };
      } else {
        assert(events.some(e => e.type === 'charge_succeeded' && e.pieceId === actor));
        assert.equal(hit.stages.hitThreshold, on ? 3 : 4);
        assert.equal(hit.stages.hitRolls.length, 4);
        proof = { hitThreshold: hit.stages.hitThreshold, hitRolls: hit.stages.hitRolls, damage: hit.stages.totalDamage,
          finalX: unit.models[0].xInches, onCreepAtEnd: query(actor).onCreep };
      }
      assert(domains.length || finite.length);
      await coldReplay(bound, authority, envelope, revision);
      await save(dir + '/result.json', { branch, version, roomId, revision, stateHash: envelope.stateHash, nextSide: side, ...proof, coldExact: true, modelCalls: 0 });
      break;
    }

    let domain, choice, parameters;
    if (!placement && revision === 0) {
      const facts = query(actor, 'charge');
      assert.equal(facts.onCreep, on);
      assert.equal(facts.impactHitModifier, Number(on));
      assert.equal(query(actor).impactHitModifier, 0);
      assert.equal(query(opponent, 'charge').impactHitModifier, 0);
      domain = domains.find(d => d.actionType === 'charge' && d.pieceId === actor);
      assert(domain, 'Kerrigan needs a Charge domain');
      assert.equal(domain.constraints.impactHitModifier, Number(on));
      parameters = { leadingModelId: unit.models[0].id, targets: [{ unitId: opponent, modelId: foe.models[0].id }] };
      await save(dir + '/declaration.json', { onCreep: facts.onCreep, chargeModifier: facts.impactHitModifier,
        menuModifier: domain.constraints.impactHitModifier, stateHash: envelope.stateHash, actor, opponent });
    } else if (!placement && (domain = domains.find(d => d.actionType === 'resolve_charge'))) {
      const leading = unit.models[0], target = foe.models[0];
      const contactX = Math.round(target.xInches * 1000) - Math.round(leading.baseWidthInches * 500) - Math.round(target.baseWidthInches * 500);
      parameters = { outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 4000, elevation: 'ground', supportTerrainIds: [] }], placements: [] };
    } else if (!placement && (domain = domains.find(d => d.actionType === 'resolve_impact' && d.parameterSchema.required.includes('allocations')))) {
      assert.equal(state.pendingAction.impactDice, 4);
      assert.equal(state.pendingAction.baseHitThreshold, 4);
      assert.equal(state.pendingAction.hitRollModifier, Number(on));
      parameters = { allocations: domain.parameterSchema.eligibleModels.map(m => ({ modelId: m.modelId, targetUnitId: opponent, dice: m.impactDice })) };
    } else if (placement && token) {
      assert(token.stayInPlay);
      assert(state.officialBattlefieldAssetBindings.find(b => b.assetId === token.tokenId).displacement);
      assert.equal(query(actor).onCreep, true);
      assert.equal(query(actor, 'charge').impactHitModifier, 0);
      domain = domains.find(d => d.actionType === 'move' && d.pieceId === opponent);
      if (domain) {
        const lead = foe.models[0];
        const x = 16000 + Math.round((lead.baseWidthInches + token.baseDiameterInches) * 500) + 800;
        parameters = { leadingModelId: lead.id, path: [{ xMilliInches: x, yMilliInches: 4000, elevation: 'ground' }], placements: [] };
        await save(dir + '/before-removal.json', { tokenId: token.tokenId, stayInPlay: true, displacement: true, onCreep: true, gapMilliInches: 800 });
      }
    } else if (placement && (domain = domains.find(d => d.definitionId === placementAbility && d.pieceId === actor))) {
      parameters = { activeUnitId: actor, paymentCardInstanceIds: [], coordinate: { xMilliInches: 16000, yMilliInches: 4000 } };
    }
    if (!domain) {
      for (const type of ['pass_reaction_family_window', 'roll_declared_charge', 'finish_activation', 'choose_first_actor', 'pass']) {
        domain = domains.find(d => d.actionType === type);
        choice = finite.find(c => c.action.actionType === type && (type !== 'choose_first_actor'
          || (c.action.chosenFirstActorSideKey ?? c.action.sourceAction?.chosenFirstActorSideKey) === 'player2'));
        if (domain || choice) break;
      }
      if (!domain && !choice && domains.length + finite.length === 1) { [domain] = domains; [choice] = finite; }
      assert(domain || choice, 'unexpected product menu r' + revision);
      if (domain) parameters = poolParameters(domain);
    }
    const action = domain ? { select: d => d.domainId === domain.domainId, parameters: () => parameters }
      : { kind: 'finite', select: c => c.actionKey === choice.actionKey };
    await native.commit({ roomId, credential: seats[side], operationKey: branch + '-r' + revision, ...action });
  }
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { revision, message: error.message, frames: error.stack?.split('\n').slice(0,5) });
  throw error;
} finally { native?.close(); }
