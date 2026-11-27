import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/ravager-deep-tunnel-v242';
const version = '2.42.0';
const sourceManifest = base + '/tabletop-raven-m01-v1/manifest.json';
const recipesRef = base + '/zagara-standard-admission-v239/mixed-ravager-v240/recipes.json';
const previous = await read(base + '/ravager-bile-standard-v241/direct-admission.json');
const mission = await read(base + '/zagara-standard-admission-v239/admission.json');
const definitionId = 'unit:ravager/deep-tunnel-movement-phase@1';
assert.deepEqual(previous.pending, [definitionId]);
try {
  const context = await resolveWave3StandardContext(await read(sourceManifest), 'area_ability_inputs');
  const opening = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, dataset: context.dataset,
    snapshot: context.snapshot, releaseMatchVersion: version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: mission.mission, deploymentRecordKey: mission.deployment, recipes: await read(recipesRef) });
  const coverage = opening.openingRosterCoverage.definitions;
  assert.equal(coverage.length, previous.selected);
  assert(coverage.every(row => row.registrationStatus === 'executable_exact'));
  assert.deepEqual(opening.pendingNativeDefinitionIds, []);
  const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: opening.state, candidateVersion: version });
  assert.equal(runtime.descriptor.releaseTokenRoundEnd, true);
  const actions = runtime.enumerate(opening.state).candidates.map(row => row.actionType);
  assert.deepEqual(actions, ['resolve_mission_start_of_round']);
  const source = opening.state.officialPsionicTransferSourceBundle;
  const route = source.routes.find(row => row.definitionId === definitionId);
  assert.equal(route.tokenKind, 'ravager_burrow');
  assert.equal(route.resourceCost, 1);
  assert.equal(source.whollyWithinMilliInches, 12000);
  assert.equal(typeof runtime.queryDeepTunnelPlacement, 'function');
  const roundEnd = runtime.queryDeepTunnelRoundEnd(opening.state);
  assert.equal(roundEnd.mutationAuthority, false);
  assert.equal(roundEnd.result.canStart, false);
  await save(dir + '/opening.json', { version, recipesRef, sourceManifest, actions, exact: coverage.length,
    definitionId, route, rangeMilliInches: source.whollyWithinMilliInches, runtimeHash: runtime.descriptor.runtimeHash,
    roundEndPolicy: opening.state.officialPsionicTransferRoundEndPolicy.policyHash, modelCalls: 0 });
} catch (error) {
  await save(dir + '/opening-stop-' + Date.now() + '.json', { message: error.message, code: error.code,
    detail: error.detail, frames: error.stack?.split('\n').slice(0, 5) });
  throw error;
}
