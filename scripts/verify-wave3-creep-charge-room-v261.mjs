import assert from 'node:assert/strict';
import path from 'node:path';
import {createOfficialReleaseMatchRuntimeV2} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {root, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1, resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1, declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1} from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import {createStarcraftTmgSpatialActionQueryRuntimeV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parentId = 'creep-standard-entry-v261';
const parentDir = base + '/' + parentId;
const continueRoll = process.argv.includes('--resume-roll');
const originalRoomId = 'creep-charge-v261';
const originalDir = base + '/' + originalRoomId;
const roomId = continueRoll ? 'creep-charge-v262' : originalRoomId;
const dir = base + '/' + roomId;
const attacker = 'nova_stealth_mode';
const defender = 'queen';
const record = (name, value) => save(dir + '/' + name + '.json', value);
async function checkpoint(name) {
  try { return await read(dir + '/' + name + '.json'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
const piece = (state, id) => state.pieces.find(p => p.id === id);
const signed = bundle => bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);

async function parentEnvelope() {
  const source = await read(parentDir + '/handoff.json');
  const store = openWave3EngineeringStoreV1({directory: path.join(root, parentDir), filename: 'room.sqlite', readOnly: true});
  try {
    const {envelope} = await store.loadRoom(parentId);
    assert(source.coldExact && envelope.stateRevision === 2 && envelope.stateHash === source.stateHash);
    return envelope;
  } finally { store.close(); }
}

async function restoreRoll() {
  const store = openWave3EngineeringStoreV1({directory: path.join(root, originalDir), filename: 'room.sqlite', readOnly: true});
  try {
    const {envelope} = await store.loadRoom(originalRoomId);
    const prior = await read(originalDir + '/r4-roll_declared_charge.json');
    const failed = await read(originalDir + '/query.json');
    assert.equal(envelope.stateRevision, 5);
    assert.equal(prior.postStateHash, envelope.stateHash);
    assert.equal(failed.authority.stateHash, envelope.stateHash);
    assert.equal(failed.reason, 'BATTLEFIELD_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
    const receipts = signed(await store.loadReplayBundle(originalRoomId));
    const last = receipts.at(-1);
    assert.equal(last.action.actionType, 'roll_declared_charge');
    assert.equal(last.postStateHash, envelope.stateHash);
    const roll = last.events.find(e => e.type === 'charge_declared_and_rolled' && e.pieceId === attacker);
    assert(roll && envelope.state.pendingAction.stage === 'resolve_charge_after_roll');
    return {envelope, roll};
  } finally { store.close(); }
}

function conditionedState(parent) {
  const state = structuredClone(parent.state);
  const actor = piece(state, attacker);
  assert(actor.isInReserves && actor.models.length === 1);
  const position = {isOnField: true, xInches: 20, yInches: 2.425};
  Object.assign(actor.models[0], position);
  Object.assign(actor, position, {isInReserves: false, deploymentStatus: 'deployed', leadingModelId: actor.models[0].id});
  state.reserveManifestBySide.player1.find(row => row.pieceId === attacker).deploymentStatus = 'deployed';
  declareWave3EngineeringCoherencyV1(state, {planIdPrefix: roomId});
  state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state});
  assert(!deriveOfficialEngagementGraphV2(state).modelEdges.some(e => [e.leftUnitId, e.rightUnitId].includes(attacker)));
  return state;
}

async function verifyRetainedBinding() {
  const parent = await parentEnvelope();
  const recipe = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
  const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
  const expected = await read(parentDir + '/runtime.json');
  const runtime = createOfficialReleaseMatchRuntimeV2({context, state: parent.state, candidateVersion: '2.61.0'});
  assert.deepEqual(runtime.descriptor, expected);
  assert.equal(typeof runtime.queryCreepDisplacement, 'function');
  assert.equal(typeof runtime.queryBattlefieldTokenDisplacement, 'undefined');
  const signedRoll = await restoreRoll();
  await save(originalDir + '/retained-binding.json', {runtimeHash: expected.runtimeHash, version: expected.runtimeVersion,
    postRollStateHash: signedRoll.envelope.stateHash, revision: signedRoll.envelope.stateRevision,
    ordinaryQueryRetained: true, postRollOriginal: signedRoll.roll.chargeRolls, providerCalls: 0});
  console.log('retained original 2.61 descriptor and roll');
}

async function runRoom() {
  let room, stage = 'setup', revision;
  try {
    const restored = continueRoll ? await restoreRoll() : null;
    const parent = restored?.envelope ?? await parentEnvelope();
    const initial = restored ? structuredClone(parent.state) : conditionedState(parent);
    const tumor = initial.board.tokens.find(t => t.tokenKind === 'creep_tumor');
    assert.equal(initial.officialBattlefieldAssetBindings.find(b => b.assetId === tumor.tokenId).sourceDefinitionId,
      'card:hatchery/creep-spread-any@1');
    const scenario = {parentId: restored ? originalRoomId : parentId, parentRevision: parent.stateRevision, parentHash: parent.stateHash,
      positionedReserve: attacker, positionInches: [20, 2.425], sourceTokenId: tumor.tokenId};
    // This is the actual two-seat recipe consumed by creep-standard-entry-v261.
    const rosterRecipeRef = base + '/inherited-zerg-standard-2.53.0/malignant.json';
    const recipe = await read(rosterRecipeRef);
    let runtimeSeed = parent.state;
    if (restored) {
      const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
      runtimeSeed = prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion: '2.62.0',
        releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes: recipe.recipes,
        missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment,
        armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY}).state;
      const rosterIdentity = s => s.pieces.map(p => [p.id, p.sideKey, p.officialUnitRecordKey, p.officialRosterUnitResultHash]);
      assert.deepEqual(rosterIdentity(runtimeSeed), rosterIdentity(parent.state));
      for (const key of ['officialBattlefieldDisplacementSourceBundle', 'officialBattlefieldDisplacementQueryPolicy']) {
        assert.deepEqual(runtimeSeed[key], parent.state[key]);
      }
      assert.equal(parent.state.officialBattlefieldDisplacementPolicy.movementQueriesReady, undefined);
      initial.officialBattlefieldDisplacementPolicy = runtimeSeed.officialBattlefieldDisplacementPolicy;
      assert(initial.officialBattlefieldDisplacementPolicy.movementQueriesReady);
      assert(initial.officialBattlefieldDisplacementPolicy.closeRanksConsumerReady);
      assert.deepEqual(initial.pendingAction, parent.state.pendingAction);
    }
    const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial: runtimeSeed,
      dir, candidateVersion: restored ? '2.62.0' : '2.61.0',
      frozenRuntimeRef: restored ? undefined : parentDir + '/runtime.json', scenario});
    if (restored) {
      assert.equal(typeof bound.rulesRuntime.queryBattlefieldTokenDisplacement, 'function');
      assert.equal(bound.runtime.descriptor.releaseCreepMovementQueries, true);
      await record('source', {...scenario, version: '2.62.0', changedStateKeys: ['officialBattlefieldDisplacementPolicy'],
        rosterRecipeRef, sourceBundleHash: initial.officialBattlefieldDisplacementSourceBundle.bundleHash,
        oldPolicyHash: parent.state.officialBattlefieldDisplacementPolicy.policyHash,
        policyHash: initial.officialBattlefieldDisplacementPolicy.policyHash, roll: restored.roll.chargeRolls,
        pendingHash: initial.pendingAction.pendingHash, runtimeHash: bound.runtime.descriptor.runtimeHash});
    }
    const authority = bound.authorityFor(initial, scenario);
    room = bound.open();
    const seats = await room.create(roomId, authority);
    for (;;) {
      const {envelope, stateRevision} = await room.store.loadRoom(roomId);
      revision = stateRevision;
      const state = envelope.state, side = state.activeSideKey;
      const input = {roomId, seatToken: seats[side].seatToken};
      const entries = signed(await room.store.loadReplayBundle(roomId));
      const previous = entries.find(r => r.action.actionType === 'resolve_charge');
      stage = 'menu-r' + revision;
      const menu = await room.room.legalSpace(input);
      assert(menu.ok, menu.reason);
      const {finiteActions, parameterDomains} = menu.legalSpace;
      const finite = kind => finiteActions.find(row => row.action.actionType === kind);
      const domain = kind => parameterDomains.find(row => row.actionType === kind && row.pieceId === attacker);
      const actor = piece(state, attacker).models[0], enemy = piece(state, defender).models[0];
      if (previous) {
        stage = 'successor-r' + revision;
        assert.equal(previous.postStateHash, envelope.stateHash);
        const events = previous.events.filter(e => ['charge_succeeded','battlefield_token_displaced','creep_tumor_removed'].includes(e.type));
        assert.deepEqual(events.map(e => e.type), ['charge_succeeded','battlefield_token_displaced','creep_tumor_removed']);
        assert(events.slice(1).every(e => e.tokenId === tumor.tokenId));
        assert.deepEqual(events[0].declaredTargetUnitIds, [defender]);
        const geometry = await read(dir + '/choice.json');
        assert.equal(Math.round(actor.xInches * 1000), geometry.endpoint.xMilliInches);
        assert.equal(Math.round(actor.yInches * 1000), geometry.endpoint.yMilliInches);
        assert(!state.board.tokens.some(t => t.tokenId === tumor.tokenId));
        assert(deriveOfficialEngagementGraphV2(state).modelEdges.some(e => [e.leftUnitId,e.rightUnitId].includes(attacker)
          && [e.leftUnitId,e.rightUnitId].includes(defender)));
        const nextActions = [...new Set([...finiteActions.map(r => r.action), ...parameterDomains].map(r => r.actionType))];
        assert(nextActions.length && !nextActions.includes('resolve_charge'));
        const result = {roomId, revision, stateHash: envelope.stateHash, scenario, nextActions, nextSeat: side,
          events, position: [actor.xInches,actor.yInches], stage: state.phase, providerCalls: 0};
        await record('outcome', result);
        stage = 'cold-replay';
        const actions = await assertWave3StandardRoomColdReplayV1(bound, authority, roomId, envelope);
        await record('result', {...result, actions, coldExact: true});
        console.log('verified charge on creep', revision, nextActions);
        break;
      }
      assert(state.round === 2 && revision < 12, 'single charge exceeded its scoped phase');
      let action, args;
      if (restored && !previous) assert(domain('resolve_charge'), 'restored charge lost its post-roll resolution');
      if (state.phase === 'movement') {
        action = finite('pass');
      } else if (!state.phaseFirstActorByRound['2:assault']) {
        assert.equal(state.phase, 'assault');
        action = finiteActions.find(row => row.action.actionType === 'choose_first_actor' && row.action.chosenFirstActorSideKey === 'player1');
      } else if (state.pendingOfficialReactionWindow) {
        action = parameterDomains.find(row => row.actionType === 'pass_reaction_family_window') || finite('pass_reaction_family_window');
        args = {};
      } else if ((action = finite('roll_declared_charge'))) {
        // Native draws the actual roll for this room.
      } else if ((action = domain('resolve_charge'))) {
        stage = 'resolve-r' + revision;
        const roll = restored?.roll ?? entries.flatMap(r => r.events).find(e => e.type === 'charge_declared_and_rolled' && e.pieceId === attacker);
        assert(roll && actor.yInches === enemy.yInches && actor.xInches > enemy.xInches);
        const endpoint = {xMilliInches: Math.round(enemy.xInches * 1000) + Math.round(actor.baseWidthInches * 500)
          + Math.round(enemy.baseWidthInches * 500), yMilliInches: Math.round(enemy.yInches * 1000)};
        assert(Math.round(actor.xInches * 1000) - endpoint.xMilliInches <= roll.maxDistanceMilliInches);
        const parameters = {outcome: 'success', path: [{...endpoint, elevation: 'ground', supportTerrainIds: []}], placements: []};
        const identity = {domainId: action.domainId, stateHash: envelope.stateHash, tokenId: tumor.tokenId};
        if (!(await checkpoint('missing-choice'))) {
          const rejected = await room.room.previewAction({...input, expectedStateRevision: revision, expectedStateHash: envelope.stateHash,
            expectedMatchBindingHash: envelope.matchBindingHash, expectedLegalSpaceHash: menu.legalSpace.legalSpaceHash,
            proposal: {kind: 'parameterized', domainId: action.domainId, parameters}});
          const reason = rejected.rulesReason || rejected.message || rejected.reason;
          assert(!rejected.ok && reason === 'PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED', reason);
          assert.equal((await room.store.loadRoom(roomId)).stateRevision, revision);
          await record('missing-choice', {...identity, revision, reason, parameters, roll: roll.chargeRolls});
        }
        let choice = await checkpoint('choice');
        if (!choice) {
          stage = 'displacement-query-r' + revision;
          const {projection} = await room.room.readRoom(input);
          const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore: room.store, rulesRuntime: bound.rulesRuntime, seatKey: side});
          const queryTool = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery: q => adapter.query(q)});
          const query = await queryTool.query({roomProjection: projection, legalSpace: menu.legalSpace, request: {
            queryKind: 'battlefield_token_displacement', arguments: {domainId: action.domainId, parameters, tokenId: tumor.tokenId}}});
          await record('query', query);
          assert.equal(query.status, 'exact', query.reason);
          for (const [key, value] of Object.entries(identity)) assert.equal(query.result[key], value);
          assert.equal(query.result.solution.bestWitness.baseContact, true);
          choice = {...identity, endpoint, coordinate: query.result.solution.bestWitness.coordinate, queryReceiptHash: query.queryReceiptHash};
          await record('choice', choice);
        }
        for (const [key, value] of Object.entries(identity)) assert.equal(choice[key], value);
        args = {...parameters, tokenDisplacements: [{tokenId: tumor.tokenId, coordinate: choice.coordinate}]};
      } else if ((action = domain('charge'))) {
        assert.equal(side,'player1');
        args = {leadingModelId: actor.id, targets: [{unitId: defender, modelId: enemy.id}]};
      }
      const types = [...new Set([...finiteActions.map(r=>r.action), ...parameterDomains].map(r=>r.actionType))];
      assert(action, 'unhandled menu: ' + side + ', ' + state.phase + ', ' + types.join(', '));
      const kind = (action.action || action).actionType;
      stage = 'commit-r' + revision + '-' + kind;
      const choice = action.domainId ? {select: d => d.domainId === action.domainId, parameters: () => args}
        : {kind: 'finite', select: r => r.actionKey === action.actionKey};
      const op = 'r' + revision + '-' + kind;
      const tx = await room.commit({roomId, credential: seats[side], operationKey: op, ...choice});
      const head = await room.store.loadRoom(roomId);
      assert.equal(head.stateRevision, revision + 1);
      await record(op, {revision: head.stateRevision, side, action: kind, proposalHash: tx.preview.proposalHash ?? tx.preview.core.proposalHash,
        preStateHash: envelope.stateHash, postStateHash: head.envelope.stateHash, available: types});
      console.log(op, 'accepted');
    }
  } catch (error) {
    await record('stop-' + Date.now(), {stage, revision, reason: error.message});
    throw error;
  } finally { room?.close(); }
}

if (process.argv.includes('--check-old-binding')) await verifyRetainedBinding();
else await runRoom();
