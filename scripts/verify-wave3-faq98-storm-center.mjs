import assert from 'node:assert/strict';
import path from 'node:path';
import { root, read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';

const dir = 'build/ticket-28-wave3-storm-seeker-owner-order';
const {roomId, version, stateHash} = await read(dir + '/result.public.json');
const {manifestRef} = await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.76.0/coverage.json');
const store = openWave3EngineeringStoreV1({directory:path.join(root, dir), filename:'room.sqlite', readOnly:true});
let replay;
try {
  const saved = await store.loadRoom(roomId);
  assert.equal(saved.envelope.stateHash, stateHash);
  replay = await store.loadReplayBundle(roomId);
} finally { store.close(); }
const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
function native(action) {
  while (action.sourceAction) action = action.sourceAction;
  return action;
}
const cast = native(journal.find(receipt => receipt.action.actionType === 'cast_psionic_storm').action);
const effect = journal.find(receipt => receipt.action.actionType === 'resolve_psionic_storm_assault_end');
const bound = await bindWave3StandardActionRoom({manifestRef,initial:replay.initialEnvelope.state,dir,
  candidateVersion:version,frozenRuntimeRef:dir + '/runtime.json'});
const reader = bound.open({readOnly:true});
try {
  await reader.restoreDependencies(roomId,bound.authority);
  const prior = reader.engine.replay({initialEnvelope:replay.initialEnvelope,journal:journal.slice(0,effect.postStateRevision-1)});
  assert(prior.ok,prior.reason);
  assert.equal(prior.envelope.stateHash,journal[effect.postStateRevision-2].postStateHash);
  const state = prior.envelope.state;
  const action = native(effect.action);
  const query = bound.runtime.queryPsionicStormPhaseEnd(state,action.anchorId);
  const projection = query.result;
  assert.equal(action.planHash,projection.planHash);
  assert.equal(projection.anchorHash,cast.anchor.anchorHash);
  assert.equal(action.anchorId,cast.token.tokenId);
  const tokenCenter = {xMilliInches:cast.token.coordinate.x*1000,yMilliInches:cast.token.coordinate.y*1000};
  assert.deepEqual(projection.template.center,tokenCenter);
  assert.deepEqual(cast.canonicalParameters.coordinate,tokenCenter);
  assert.deepEqual(cast.anchor.center,tokenCenter);
  const offered = bound.runtime.enumerate(state,{sideKey:state.activeSideKey});
  assert(offered.candidates.some(row => row.isEnabled && native(row).planHash === action.planHash));
  assert(!offered.parameterDomains.some(domain => domain.actionType === action.actionType));
  await save(dir+'/faq98-center.public.json',{roomId,sourceRevision:prior.envelope.stateRevision,
    castRevision:journal.find(r=>r.action.actionType==='cast_psionic_storm').postStateRevision,
    appliedRevision:effect.postStateRevision,sourceStateHash:prior.envelope.stateHash,
    tokenCenter,templateCenter:projection.template.center,templateWidthMilliInches:projection.template.widthMilliInches,
    anchorHash:projection.anchorHash,queryReceiptHash:query.queryReceiptHash,signedPlanHash:action.planHash,
    playerSelectsNewCenter:false,providerCalls:0});
} finally { reader.close(); }
