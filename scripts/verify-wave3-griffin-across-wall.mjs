import assert from 'node:assert/strict';
import path from 'node:path';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from '../packages/product-composition/official-ranged-terrain-projection-v1.mjs';
import { createOfficialTargetPointFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedTargetPointLineOfSightV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';

const parentDir = 'build/ticket-28-wave3-griffin-holo-anchor/tactical-payment';
const parentId = 'wave3-griffin-holo-tactical-payment';
const dir = 'build/ticket-28-wave3-griffin-holo-anchor/across-west-wall';
const roomId = 'wave3-griffin-across-west-wall';
const manifestRef = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/tabletop-raven-m01-v1/manifest.json';
const snapshot = await read(parentDir + '/query.public.json');
const store = openWave3EngineeringStoreV1({ directory: path.resolve(parentDir), filename: 'room.sqlite', readOnly: true });
let replay;
try { replay = await store.loadReplayBundle(parentId); } finally { store.close(); }
const options = { manifestRef, initial: replay.initialEnvelope.state, candidateVersion: '2.33.0' };
const parent = await bindWave3StandardActionRoom({ ...options, dir: parentDir, frozenRuntimeRef: parentDir + '/runtime.json' });
const reader = parent.open({ readOnly: true });
let initial;
try {
  await reader.restoreDependencies(parentId, parent.authority);
  const journal = replay.privateJournal.filter(r => r.payload.type === 'accepted_transition').slice(0,2).map(r => r.payload.payload.receipt);
  const prior = reader.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
  assert(prior.ok, prior.reason);
  assert.equal(prior.envelope.stateHash, snapshot.castStateHash);
  initial = prior.envelope;
} finally { reader.close(); }
const scenario = { parentId, parentRevision: 2, parentStateHash: initial.stateHash };
const branch = await bindWave3StandardActionRoom({ ...options, dir, scenario });
const authority = branch.authorityFor(initial.state, scenario);
const app = branch.open();
let stage = 'range and terrain';
try {
  const state = initial.state;
  const caster = snapshot.parameters.activeUnitId;
  const coordinate = { xMilliInches: 16700, yMilliInches: 20100 };
  const parameters = { ...snapshot.parameters, coordinate };
  const result = branch.runtime.queryGriffinPlacement(state, caster, parameters);
  let native = result.result.action;
  while (!native.unitLifecyclePlan && native.sourceAction) native = native.sourceAction;
  const refs = native.unitLifecyclePlan.canonicalParameters.friendlyRangeProof.qualifyingFriendlyUnits;
  assert(refs.length > 0);
  const projected = projectOfficialRangedTerrainForLosV1(state).projected;
  Object.assign(projected.board, { widthInches:state.board.widthInches, heightInches:state.board.heightInches });
  const endpoint = createOfficialTargetPointFootprintV1({ objectId:'griffin-drop', center:coordinate });
  const sight = refs.flatMap(ref => {
    const unit = state.pieces.find(p => p.id === ref.pieceId);
    return unit.models.filter(m => m.isOnField && !m.isDestroyed).map(model => {
      const trace = evaluateOfficialElevatedTargetPointLineOfSightV1({ state:projected, attacker:unit, attackerModelId:model.id,
        targetPointFootprint:endpoint, dataBundle:state.officialTerrainLosDataBundle });
      assert(!trace.visible && trace.blockingTerrainIds.includes('std-ordinary-west'), model.id + ': ' + trace.lineOfSightStatus);
      return { modelId:model.id, distanceMilliInches:ref.minimumDistanceMilliInches, blockers:trace.blockingTerrainIds };
    });
  });
  assert(sight.length >= refs.length);
  stage = 'sign same choice';
  const seats = await app.create(roomId, authority);
  await app.commit({ roomId, credential:seats.player1, operationKey:'griffin-beyond-wall',
    select:d => d.definitionId === 'card:nova_covert_ops/griffin-support-any@1' && d.pieceId === caster,
    parameters:() => parameters });
  const head = (await app.store.loadRoom(roomId)).envelope;
  assert.equal(head.stateRevision,1);
  const drone = head.state.pieces.find(p => p.isOnField && p.officialUnitRecordKey === 'army_units:sabotage_drone');
  assert.deepEqual([drone.models[0].xInches,drone.models[0].yInches],[coordinate.xMilliInches/1000,coordinate.yMilliInches/1000]);
  const journal = await assertWave3StandardRoomColdReplayV1(branch,authority,roomId,head);
  await save(dir+'/result.public.json',{...scenario,coordinate,sight,queryHash:result.queryReceiptHash,
    drone:drone.id,revision:head.stateRevision,journal,cold:true,providerCalls:0});
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.public.json',{stage,message:error.message});
  throw error;
} finally { app.close(); }
