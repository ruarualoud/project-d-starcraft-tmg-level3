import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1 }
  from './support/wave3-standard-action-room-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialModelBaseFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const base = 'build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action';
const out = 'build/ticket-28-wave3-human-lobby-v1/khassar-grid-leader-287';
const fork = await read(base + '/fork-state.json');
const decision = await read(base + '/decision.public.json');
const oldQuery = await read(base + '/spatial-query.public.json');
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(row => row.scale === 'Standard');
const id = 'unit:hydralisk/lunge-assault-phase@1';

function positions(state) {
  const footprints = pieceId => {
    const piece = state.pieces.find(unit => unit.id === pieceId);
    return piece.models.filter(model => !model.isDestroyed).map(model => ({
      id: model.id, footprint: createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle }),
    }));
  };
  const actors = footprints('hydralisk');
  const targets = footprints('adept');
  // The west lane touches a wall on rotation. In this original map position
  // the eastern model can demonstrate shortest-leader eligibility. Only the
  // separate player-selected, straight move should appear in the new state.
  const [west, east] = actors;
  const f = east.footprint;
  const target = targets.map(t => t.footprint)
    .filter(t => t.center.xMilliInches === f.center.xMilliInches && t.center.yMilliInches < f.center.yMilliInches)
    .sort((a, b) => b.center.yMilliInches - a.center.yMilliInches)[0];
  assert(f.shape === 'rectangle' && target?.shape === 'round');
  const radius = Math.hypot(f.widthMilliInches, f.depthMilliInches) / 2;
  const ground = {elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0};
  const witnessEnd = { ...ground, xMilliInches: f.center.xMilliInches,
    yMilliInches: target.center.yMilliInches + Math.round(radius + target.radiusMilliInches + 1001),
    rotationDegrees: Number((360 - Math.atan2(f.widthMilliInches, f.depthMilliInches) * 180 / Math.PI).toFixed(6)) };
  return {leadingModelId: east.id, path: [{...ground, ...f.center, yMilliInches: f.center.yMilliInches - 300}],
    placements: [{...ground, modelId: west.id, ...west.footprint.center, yMilliInches: 7482}],
    leaderRouteWitness: {leadingModelId: east.id, path: [witnessEnd], placements: [
      {...ground, modelId: west.id, xMilliInches: 21800, yMilliInches: 8500, rotationDegrees: 340},
    ]}};
}

async function signSavedUse() {
  const step = await read(out + '/product-step.public.json');
  assert.equal(step.sourceHash, decision.hash);
  assert.equal(step.sourceRevision, decision.revision);
  assert.equal(step.version, '2.87.0');
  const roomId = 'khassar-r6-grid-leader-use-287';
  const binding = await bindWave3StandardActionRoom({manifestRef: setup.releaseRef, initial: fork,
    candidateVersion: step.version, dir: out, scenario: {sourceRevision: decision.revision, sourceHash: decision.hash}});
  const native = binding.open();
  try {
    const seats = await native.create(roomId, binding.authority);
    const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope;
    assert.equal(initial.stateHash, decision.hash);
    const head = await native.store.loadRoom(roomId);
    if (head.stateRevision === 0) {
      await native.commit({roomId, credential: seats[fork.activeSideKey], operationKey: 'qualified-r6-use-lunge',
        select: domain => domain.definitionId === id, parameters: () => step.certifiedParameters});
    }
    const result = (await native.store.loadRoom(roomId)).envelope;
    assert.equal(result.stateRevision, 1);
    assert.equal(result.state.activeSideKey, step.nextSeat);
    const moved = result.state.pieces.find(p => p.id === 'hydralisk').models.map(m => [m.id, m.xInches, m.yInches]);
    assert.deepEqual(moved, step.relocated);
    const event = result.state.log.flatMap(e => e.events ?? []).findLast(e => e.type === 'khassar_non_lethal_damage_after_shot');
    assert.equal(event?.originalActorUnitId, step.originalActor);
    assert.equal(event?.pieceId, step.recipient);
    assert.equal(event?.damage.nonLethalDamage, step.nonLethalDamage);
    assert(!result.state.pendingOfficialReactionWindow && !result.state.pendingOfficialKhassarShot);
    const actions = await assertWave3StandardRoomColdReplayV1(binding, binding.authority, roomId, result);
    await save(out + '/signed-use.public.json', {version: step.version, sourceRevision: decision.revision,
      sourceHash: initial.stateHash, branchRevision: result.stateRevision, stateHash: result.stateHash, actions,
      relocated: moved, nextSeat: result.state.activeSideKey, settlement: event, cold: true, providerCalls: 0});
  } finally {
    native.close();
  }
}

let stage = 'load release';
try {
  if (process.argv.includes('--sign-saved-use')) {
    stage = 'sign and cold-replay saved use';
    await signSavedUse();
  } else {
    await verifyRuntime();
  }
} catch(error) {
  await save(out + '/stop-' + Date.now() + '.public.json', {stage, reason:error.message});
  throw error;
}

async function verifyRuntime() {
  const context = await resolveWave3StandardContext(await read(setup.releaseRef), 'area_ability_inputs');
  assert.equal(oldQuery.stateHash, decision.hash);
  const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: fork, candidateVersion: '2.87.0' });
  const seat = { sideKey: fork.activeSideKey };
  const domain = runtime.enumerate(fork, seat).parameterDomains.find(d => d.definitionId === id);
  assert(domain);
  stage = 'certify measured movement';
  const move = positions(fork);
  const parameters = { ...oldQuery.request, move };
  await save(out + '/planned-query.public.json', { sourceHash: decision.hash, parameters });
  const completion = runtime.completeLungeMove(fork, domain, parameters, seat);
  assert(completion, 'No certified route for measured formation');
  const canonical = completion.canonicalParameters;
  const native = runtime.instantiate(fork, domain, canonical, seat);
  stage = 'validate original shot successor';
  const resolved = runtime.apply(fork, native.action, seat);
  const event = resolved.events.find(e => e.type === 'khassar_non_lethal_damage_after_shot');
  assert.equal(event?.originalActorUnitId, 'high_templar');
  assert.equal(event?.pieceId, 'adept');
  assert.equal(event.damage.nonLethalDamage, 3);
  assert.equal(resolved.state.activeSideKey, 'player1');
  assert(!resolved.state.pendingOfficialReactionWindow && !resolved.state.pendingOfficialKhassarShot);
  const relocated = resolved.state.pieces.find(p => p.id === 'hydralisk').models.map(m => [m.id, m.xInches, m.yInches]);
  assert.deepEqual(relocated, [...move.placements, {modelId: move.leadingModelId, ...move.path.at(-1)}]
    .map(p => [p.modelId, p.xMilliInches / 1000, p.yMilliInches / 1000]));
  stage = 'exclude longer candidate';
  const longer = runtime.completeLungeMove(fork, domain, oldQuery.request, seat);
  assert.equal(longer, null, 'A longer route must still lack a valid shortest-leader certificate');
  await save(out + '/product-step.public.json', { version: '2.87.0', sourceRevision: decision.revision,
    sourceHash: decision.hash, certifiedParameters: canonical, relocated, originalActor: event.originalActorUnitId,
    recipient: event.pieceId, nonLethalDamage: event.damage.nonLethalDamage, nextSeat: resolved.state.activeSideKey,
    longerProposalRefused: true, restoredSignedRoom: false, providerCalls: 0 });
}
