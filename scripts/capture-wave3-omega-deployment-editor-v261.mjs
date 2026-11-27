import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const dir = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261';
const ready = await read(dir + '/prepared.json');
const { roomId, scenario } = ready;
const recipe = await read(scenario.rosterRecipeRef);
const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: ready.version,
  releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes: recipe.recipes,
  missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
const bound = await bindWave3StandardActionRoom({ manifestRef: recipe.manifestRef, initial: state, dir,
  candidateVersion: ready.version, scenario, frozenRuntimeRef: scenario.frozenRuntimeRef });
const native = bound.open();
try {
  const initial = (await native.store.loadReplayBundle(roomId)).initialEnvelope;
  const before = await native.store.loadRoom(roomId);
  assert.equal(initial.stateHash, ready.stateHash);
  assert.equal(before.envelope.stateHash, initial.stateHash);
  const seats = await native.create(roomId, bound.authorityFor(initial.state, scenario));
  const credential = { roomId, seatToken: seats.player2.seatToken };
  const [menu, view] = await Promise.all([native.room.legalSpace(credential), native.room.readRoom(credential)]);
  assert(menu.ok && view.ok);
  assert.equal(menu.legalSpace.legalSpaceHash, ready.legalSpaceHash);
  const selected = [ready.hydralisk, ready.queen].map(witness => {
    const matches = menu.legalSpace.parameterDomains.filter(d => d.domainId === witness.domainId);
    assert.equal(matches.length, 1);
    return matches[0];
  });
  const after = await native.store.loadRoom(roomId);
  assert.equal(after.envelope.stateHash, ready.stateHash);
  assert.equal(after.stateRevision, before.stateRevision);
  const sourceNames = Object.fromEntries(view.projection.state.pieces.map(p => [p.id, p.name || p.unitName || p.id]));
  await save(dir + '/editor-input.json', { roomId, revision: after.stateRevision, stateHash: ready.stateHash,
    matchBindingHash: initial.matchBindingHash, legalSpaceHash: ready.legalSpaceHash,
    sourceNames, parameterDomains: selected, deploymentSubmitted: false });
} finally { native.close(); }
