import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { atomicWrite } from './lib/development-context.mjs';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1 }
  from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1, listOfficialPhaseActivationUnitIdsV1 }
  from '../packages/rule-atoms/official-phase-activation-availability-v1.mjs';

function receipts(bundle) {
  return bundle.privateJournal.filter(entry => entry.payload.type === 'accepted_transition')
    .map(entry => entry.payload.payload.receipt);
}

export async function verifyMandatoryPassAfterLeap({ base, parentId, parentRoom, recipe }) {
  const id = 'creep-leaping-strike-pass-v263', dir = base + '/' + id;
  const sourceDir = base + '/' + parentId;
  await mkdir(path.join(root, dir), {recursive: true});
  const bundle = await parentRoom.store.loadReplayBundle(parentId);
  const original = receipts(bundle);
  const oldHead = (await parentRoom.store.loadRoom(parentId)).envelope;
  assert.equal(oldHead.stateRevision, 5);
  assert.equal(original[3].action.actionType, 'resolve_relocation_ability');
  assert.equal(original[4].action.actionType, 'finish_activation');
  assert.equal(oldHead.stateHash, original[4].postStateHash);
  assert.equal(oldHead.state.activeSideKey, 'player2');
  assert(!oldHead.state.players.player1.passedPhases.assault);
  assert.deepEqual(listOfficialPhaseActivationUnitIdsV1(oldHead.state, 'player1', 'assault'), []);
  const checkpointFile = path.join(root, dir, 'original-r4.json.gz');
  let checkpoint;
  try {
    checkpoint = JSON.parse(gunzipSync(await readFile(checkpointFile)));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const restored = parentRoom.engine.replay({initialEnvelope: bundle.initialEnvelope, journal: original.slice(0, 4)});
    assert(restored.ok, restored.reason);
    checkpoint = restored.envelope;
    assert.equal(checkpoint.stateHash, original[3].postStateHash);
    await atomicWrite(checkpointFile, gzipSync(JSON.stringify(checkpoint)));
  }
  assert.equal(checkpoint.stateHash, original[4].preStateHash);
  assert.equal(checkpoint.journalHeadHash, original[3].journalHash);
  const choice = await read(sourceDir + '/choice.json');
  const tokenAt = state => state.board.tokens.find(t => t.tokenId === choice.tokenId);
  const cardAt = state => state.cardResources.player2.find(c => c.cardInstanceId === choice.cardId);
  const paid = original[3].events.filter(e => e.type === 'relocation_resource_paid');
  assert.equal(paid.length, 1);
  assert.deepEqual(paid[0].exhaustedCardInstanceIds, [choice.cardId]);
  assert.equal(cardAt(checkpoint.state).readiness, 'exhausted');
  await save(dir + '/source.json', {parentId, revision: 4, stateHash: checkpoint.stateHash,
    oldFinishHash: oldHead.stateHash, oldNextSeat: oldHead.state.activeSideKey, oldTerranPassed: false,
    terranEligible: [], oldZergRemaining: listOfficialPhaseActivationUnitIdsV1(oldHead.state,'player2','assault'),
    token: tokenAt(checkpoint.state), paid: paid[0], providerCalls: 0});
  const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
  const fresh = prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:'2.63.0', releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,recipes:recipe.recipes,missionRecordKey:recipe.mission,
    deploymentRecordKey:recipe.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY}).state;
  const roster = s => s.pieces.map(p => [p.id,p.sideKey,p.officialUnitRecordKey,p.officialRosterUnitResultHash]);
  assert.deepEqual(roster(fresh), roster(checkpoint.state));
  assert.equal(fresh.officialPhasePassHandoff, OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1);
  assert.equal(checkpoint.state.officialPhasePassHandoff, undefined);
  const initial = {...checkpoint.state, officialPhasePassHandoff: fresh.officialPhasePassHandoff};
  const scenario = {parentId, revision: 4, stateHash: checkpoint.stateHash,
    sourceRuntime: '2.62.0', changedStateKeys: ['officialPhasePassHandoff']};
  const bound = await bindWave3StandardActionRoom({manifestRef: recipe.manifestRef, initial: fresh, dir,
    candidateVersion:'2.63.0', scenario});
  const authority = bound.authorityFor(initial, scenario);
  const room = bound.open();
  const steps = [['player2','finish_activation'],['player1','pass'],['player2','pass']];
  try {
    const seats = await room.create(id, authority);
    for (;;) {
      const head = await room.store.loadRoom(id);
      const state = head.envelope.state, rev = head.stateRevision;
      assert.deepEqual(cardAt(state), cardAt(initial));
      assert.deepEqual(tokenAt(state), tokenAt(initial));
      if (rev === 3) {
        assert.equal(state.phase, 'combat');
        assert.equal(state.activeSideKey, 'player1');
        const data = receipts(await room.store.loadReplayBundle(id));
        const passEvents = data.flatMap(r=>r.events).filter(e=>e.type==='pass');
        assert.equal(passEvents.length, 2);
        assert.equal(passEvents[0].sideKey, 'player1');
        assert.equal(passEvents[0].passKind, 'mandatory');
        assert.equal(passEvents[0].firstPass, true);
        assert.equal(passEvents[1].passKind, 'optional');
        assert(!data.flatMap(r=>r.events).some(e=>e.type==='relocation_resource_paid' || e.type==='battlefield_token_displaced'));
        const offered = await room.room.legalSpace({roomId:id,seatToken:seats.player1.seatToken});
        assert(offered.ok,offered.reason);
        assert(offered.legalSpace.finiteActions.some(r=>r.action.actionType==='choose_first_actor'));
        const actions = await assertWave3StandardRoomColdReplayV1(bound,authority,id,head.envelope);
        await save(dir+'/result.json',{scenario,revision:rev,stateHash:head.envelope.stateHash,passEvents,
          actions,nextPhase:state.phase,initiativeChoiceSeat:state.activeSideKey,preservedCard:choice.cardId,
          preservedToken:choice.tokenId,duplicatePayment:false,coldExact:true,providerCalls:0});
        console.log('signed mandatory Pass, next Combat first-actor choice and exact cold replay');
        break;
      }
      const [side,kind] = steps[rev];
      assert.equal(state.activeSideKey,side);
      if(rev === 1) assert(!state.firstPassSideByPhase?.assault);
      if(rev === 2) {
        assert.equal(state.firstPassSideByPhase.assault,'player1');
        assert.equal(state.firstPlayerSideKey,'player1');
        assert(listOfficialPhaseActivationUnitIdsV1(state,side,'assault').includes('queen'));
      }
      await room.commit({roomId:id,credential:seats[side],operationKey:'r'+rev+'-'+kind,
        ...(kind==='finish_activation' ? {select:d=>d.actionType===kind && d.pieceId==='kerrigan',parameters:()=>({})}
          : {kind:'finite',select:r=>r.action.actionType===kind})});
      const next = await room.store.loadRoom(id);
      assert.equal(next.stateRevision,rev+1);
      await save(dir+'/r'+rev+'-'+kind+'.json',{side,kind,revision:next.stateRevision,
        preStateHash:head.envelope.stateHash,postStateHash:next.envelope.stateHash,nextSeat:next.envelope.state.activeSideKey});
      console.log('signed', next.stateRevision, kind, next.envelope.state.activeSideKey);
    }
  } catch(e) {
    await save(dir+'/stop-'+Date.now()+'.json',{revision:(await room.store.loadRoom(id))?.stateRevision,reason:e.message});
    throw e;
  } finally {room.close();}
}

export async function verifyHistoricalFinishAfterLeap({base, parentId, parentRoom}) {
  const dir = base + '/creep-leaping-strike-pass-v263';
  const envelope = JSON.parse(gunzipSync(await readFile(path.join(root,dir,'original-r4.json.gz'))));
  const signed = parentRoom.engine.createCheckpoint(envelope);
  assert(signed.ok, signed.reason);
  const checkpoint = signed.checkpoint;
  const bundle = await parentRoom.store.loadReplayBundle(parentId);
  const journal = receipts(bundle);
  const [paid, finish] = journal.slice(-2);
  assert.equal(checkpoint.stateHash, paid.postStateHash);
  assert.equal(checkpoint.journalHeadHash, paid.journalHash);
  assert.equal(finish.action.actionType, 'finish_activation');
  const proof = parentRoom.engine.replay({initialEnvelope:bundle.initialEnvelope, checkpoint, journal:[finish]});
  assert(proof.ok,proof.reason);
  const head = (await parentRoom.store.loadRoom(parentId)).envelope;
  assert.deepEqual(proof.envelope,head);
  assert.equal(head.state.activeSideKey, 'player2');
  assert.equal(head.state.officialPhasePassHandoff, undefined);
  await save(dir+'/legacy-finish.json',{parentId,version:'2.62.0',from:checkpoint.stateRevision,to:head.stateRevision,
    stateHash:head.stateHash,checkpointHash:checkpoint.checkpointHash,journalHash:finish.journalHash,actionsReplayed:['finish_activation'],
    activeSide:head.state.activeSideKey,oldEnvelopeExact:true,providerCalls:0});
  console.log('2.62 original signed finish preserved at r5');
}
