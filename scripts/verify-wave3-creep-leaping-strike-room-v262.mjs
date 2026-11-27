import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const parent = 'creep-standard-entry-v261';
const versionRoom = 'creep-charge-v262';
const id = 'creep-leaping-strike-v262';
const dir = base + '/' + id;
const ability = 'unit:kerrigan/leaping-strike-assault-phase@1';
const actor = 'kerrigan';
const landing = {xMilliInches: 17980, yMilliInches: 3740, elevation: 'ground', supportTerrainIds: []};
const record = (name, data) => save(dir + '/' + name + '.json', data);
async function saved(name) {
  try { return await read(dir + '/' + name + '.json'); } catch(e) { if(e.code !== 'ENOENT') throw e; return null; }
}
async function roomSource(roomId, load) {
  const store = openWave3EngineeringStoreV1({directory: path.join(root, base, roomId), filename: 'room.sqlite', readOnly: true});
  try { return await load(store); } finally { store.close(); }
}
const tokenAt = (s, tokenId) => s.board.tokens.find(t => t.tokenId === tokenId);
const cardAt = (s, cardId) => s.cardResources.player2.find(c => c.cardInstanceId === cardId);
async function run() {
  let room, stage = 'source', revision;
  try {
    const original = await roomSource(parent, async s => (await s.loadRoom(parent)).envelope);
    const handoff = await read(base + '/' + parent + '/handoff.json');
    assert(handoff.coldExact && original.stateRevision === 2 && original.stateHash === handoff.stateHash);
    const release = await roomSource(versionRoom, async s => (await s.loadReplayBundle(versionRoom)).initialEnvelope);
    const source = await read(base + '/' + versionRoom + '/source.json');
    const recipe = await read(source.rosterRecipeRef);
    const initial = structuredClone(original.state);
    assert.deepEqual(initial.officialBattlefieldDisplacementSourceBundle, release.state.officialBattlefieldDisplacementSourceBundle);
    initial.officialBattlefieldDisplacementPolicy = release.state.officialBattlefieldDisplacementPolicy;
    const tokenId = source.sourceTokenId, startToken = tokenAt(initial, tokenId);
    assert(startToken && initial.officialBattlefieldAssetBindings.some(b => b.assetId === tokenId
      && b.sideKey === 'player2' && b.sourceDefinitionId === 'card:hatchery/creep-spread-any@1'));
    const route = initial.officialRelocationFamilySourceBundle.routes.find(r => r.definitionId === ability);
    assert(route && route.maxDistanceMilliInches === 6000 && route.resourceType === 'BM' && route.resourceCost === 1);
    const scene = {parentRoom: parent, revision: original.stateRevision, stateHash: original.stateHash,
      candidateRuntimeRef: base + '/' + versionRoom + '/runtime.json', changedStateKeys:['officialBattlefieldDisplacementPolicy'],
      tokenId, sourceDefinitionId: ability, landing};
    const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial, dir, candidateVersion: '2.62.0',
      frozenRuntimeRef: scene.candidateRuntimeRef, scenario: scene});
    room = bound.open();
    if (process.argv.includes('--legacy-finish-only')) {
      await room.restoreDependencies(id, bound.authority);
      const { verifyHistoricalFinishAfterLeap } = await import('./verify-wave3-explicit-pass-after-leap-v263.mjs');
      return await verifyHistoricalFinishAfterLeap({base, parentId:id, parentRoom:room});
    }
    if (process.argv.includes('--mandatory-pass')) {
      await room.restoreDependencies(id, bound.authority);
      const { verifyMandatoryPassAfterLeap } = await import('./verify-wave3-explicit-pass-after-leap-v263.mjs');
      return await verifyMandatoryPassAfterLeap({base, parentId: id, parentRoom: room, recipe});
    }
    const seats = await room.create(id, bound.authority);
    const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore: room.store, rulesRuntime: bound.rulesRuntime, seatKey:'player2'});
    const tool = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
    for (;;) {
      const head = await room.store.loadRoom(id);
      const state = head.envelope.state, side = state.activeSideKey;
      revision = head.stateRevision;
      assert.equal(state.round, 2);
      stage = 'menu-r' + revision;
      const input = {roomId:id, seatToken:seats[side].seatToken};
      const menu = await room.room.legalSpace(input);
      assert(menu.ok, menu.reason);
      const {finiteActions,parameterDomains} = menu.legalSpace;
      const actions = (await room.store.loadReplayBundle(id)).privateJournal
        .filter(e=>e.payload.type === 'accepted_transition').map(e=>e.payload.payload.receipt);
      const leap = actions.find(r => r.events.some(e=>e.type === 'battlefield_token_displaced' && e.tokenId === tokenId));
      let selected, parameters;
      if (leap) {
        stage = 'successor-r' + revision;
        const choice = await saved('choice');
        const events = leap.events.map(e=>e.type);
        const model = state.pieces.find(p=>p.id === actor).models[0];
        assert.equal(Math.round(model.xInches*1000),landing.xMilliInches);
        assert.equal(Math.round(model.yInches*1000),landing.yMilliInches);
        assert.equal(events.filter(t=>t==='battlefield_token_displaced').length,1);
        assert(!events.includes('creep_tumor_removed'));
        assert.deepEqual(tokenAt(state,tokenId).coordinate,{x:choice.coordinate.xMilliInches/1000,y:choice.coordinate.yMilliInches/1000});
        const paidEvents = leap.events.filter(e => e.type === 'relocation_resource_paid');
        assert.equal(paidEvents.length, 1);
        const payment = paidEvents[0];
        assert.equal(payment.resourceType, route.resourceType);
        assert.equal(payment.resourceCost, route.resourceCost);
        assert.deepEqual(payment.exhaustedCardInstanceIds, [choice.cardId]);
        assert.equal(cardAt(initial,choice.cardId).readiness, 'ready');
        assert.equal(cardAt(state,choice.cardId).readiness, 'exhausted');
        assert.equal(cardAt(initial,choice.cardId).resource, cardAt(state,choice.cardId).resource);
        if (actions.at(-1) !== leap) {
          assert.equal(actions.at(-1).action.actionType,'finish_activation');
          assert.equal(actions.at(-1).action.pieceId,actor);
          assert.equal(side,'player1');
          const journal = await assertWave3StandardRoomColdReplayV1(bound,bound.authority,id,head.envelope);
          await record('result',{revision,stateHash:head.envelope.stateHash,scene,round:state.round,phase:state.phase,
            actions:journal,events,tokenPosition:tokenAt(state,tokenId).coordinate,finalPosition:landing,
            payment: {cardId:choice.cardId, resourceType:payment.resourceType, cost:payment.resourceCost,
              readinessBefore:cardAt(initial,choice.cardId).readiness, readinessAfter:cardAt(state,choice.cardId).readiness},
            nextSeat:side,coldExact:true,providerCalls:0});
          return;
        }
        selected = parameterDomains.find(d=>d.actionType==='finish_activation' && d.pieceId===actor);
        parameters = {};
      } else if (state.phase === 'movement') {
        selected = finiteActions.find(r=>r.action.actionType==='pass');
      } else if (!state.phaseFirstActorByRound['2:assault']) {
        assert.equal(state.phase,'assault');
        selected = finiteActions.find(r=>r.action.actionType==='choose_first_actor' && r.action.chosenFirstActorSideKey==='player2');
      } else {
        stage = 'query-leap-r' + revision;
        assert.equal(side,'player2');
        selected = parameterDomains.find(d=>d.pieceId===actor && d.actionType==='resolve_relocation_ability'
          && d.constraints.sourceRouteHash===route.routeHash);
        assert(selected,'Leaping Strike missing from current legal space');
        const modelId = state.pieces.find(p=>p.id===actor).models[0].id;
        const payment = selected.parameterSchema.paymentCardInstanceIds.enum.find(ids=>ids.length===1 && cardAt(state,ids[0])?.readiness==='ready');
        assert(payment,'no current legal one-Biomass payment');
        parameters = {leadingModelId:modelId,placements:[{modelId,...landing}],paymentCardInstanceIds:payment};
        const identity = {stateHash:head.envelope.stateHash,domainId:selected.domainId,tokenId};
        let choice = await saved('choice');
        if (!choice) {
          const {projection} = await room.room.readRoom(input);
          const query = await tool.query({roomProjection:projection,legalSpace:menu.legalSpace,request:{queryKind:'battlefield_token_displacement',
            arguments:{domainId:selected.domainId,parameters,tokenId}}});
          await record('query-' + revision + '-' + Date.now(),query);
          assert.equal(query.status,'exact',query.reason);
          for(const [k,v] of Object.entries(identity)) assert.equal(query.result[k],v);
          choice = {...identity,coordinate:query.result.solution.bestWitness.coordinate,queryReceiptHash:query.queryReceiptHash,
            cardId:payment[0],readinessBefore:cardAt(state,payment[0]).readiness};
          await record('choice',choice);
        }
        for(const [k,v] of Object.entries(identity)) assert.equal(choice[k],v);
        assert.equal(choice.cardId,payment[0]);
        parameters.tokenDisplacements = [{tokenId,coordinate:choice.coordinate}];
      }
      assert(selected && revision < 7, 'unexpected legal menu at ' + [revision,state.phase,side].join('/'));
      const kind = (selected.action||selected).actionType;
      stage = 'commit-' + kind + '-r' + revision;
      const choice = selected.domainId ? {select:d=>d.domainId===selected.domainId,parameters:()=>parameters}
        : {kind:'finite',select:r=>r.actionKey===selected.actionKey};
      await room.commit({roomId:id,credential:seats[side],operationKey:'r'+revision+'-'+kind,...choice});
      const next=await room.store.loadRoom(id);
      assert.equal(next.stateRevision,revision+1);
      await record('r'+revision+'-'+kind,{side,kind,revision:next.stateRevision,preStateHash:head.envelope.stateHash,postStateHash:next.envelope.stateHash});
      console.log('signed',next.stateRevision,state.phase,kind);
    }
  } catch(e) {
    await record('stop-'+Date.now(),{stage,revision,reason:e.message});
    throw e;
  } finally {room?.close();}
}
await run();
