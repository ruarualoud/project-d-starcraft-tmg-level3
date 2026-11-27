import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';

const previous = 'build/ticket-28-wave3-human-lobby-v1';
const sources = {
  khassar: previous + '/standard-faction-openings/templar_caste-zerg_swarm.public.json',
  medic: previous + '/mission-actions/standard-artefact_hunt-withdrawal/setup.public.json',
};
const kind = process.argv[2];
assert(Object.hasOwn(sources, kind));
const dir = previous + '/mixed-reactions-285/' + kind;
const version = '2.85.0';
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(s => s.scale === 'Standard');
const manifest = await read(setup.releaseRef);
const source = await read(sources[kind]);
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const roomId = 'mixed-reactions-285-' + kind;
try {
  const opening = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, releaseMatchVersion: version,
    roomId, dataset: context.dataset, snapshot: context.snapshot, recipes: source.recipes,
    missionRecordKey: source.mission ?? setup.missionRecordKey, deploymentRecordKey: setup.deploymentRecordKey,
    mapConfiguration: wave3HumanMapConfiguration(setup), armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
  assert.deepEqual(opening.pendingNativeDefinitionIds, []);
  const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: opening.state, candidateVersion: version });
  const sideKey = opening.state.firstPlayerSideKey;
  const action = runtime.enumerate(opening.state,{sideKey}).candidates.find(a => a.isEnabled && a.actionType === 'resolve_mission_start_of_round');
  assert(action);
  const start = runtime.apply(opening.state, action, {sideKey}).state;
  assert.equal(start.phase, 'movement');
  await save(dir + '/opening.public.json', {version, roomId, sourceRef:sources[kind], manifestHash:manifest.manifestHash,
    phase:start.phase, runtimeHash:runtime.descriptor.runtimeHash, definitionCount:opening.openingRosterCoverage.definitions.length,
    supply:start.officialRoundSupplyState.supplyPoolBySide, paidCalls:0});
} catch (error) {
  await save(dir + '/failure-' + Date.now() + '.public.json',{reason:error.message, detail:error.detail, stack:error.stack.split('\n').slice(1,7)});
  throw error;
}
