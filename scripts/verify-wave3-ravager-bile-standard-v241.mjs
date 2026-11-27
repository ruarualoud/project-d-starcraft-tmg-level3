import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const previous = base + '/zagara-standard-admission-v239';
const dir = base + '/ravager-bile-standard-v241';
const manifestRef = base + '/tabletop-raven-m01-v1/manifest.json';
const version = '2.41.0';
const context = await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
const common = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot,
  releaseMatchVersion: version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY };
const bileId = 'unit:ravager/corrosive-bile-movement-phase@1';
if (!process.argv.includes('--resume-cocoon')) {
  const selected = await read(previous + '/mixed-ravager-v240/coverage.json');
  const mission = await read(previous + '/admission.json');
  const direct = { ...common, recipes: await read(previous + '/mixed-ravager-v240/recipes.json'),
    missionRecordKey: mission.mission, deploymentRecordKey: mission.deployment };
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(direct);
  const pending = coverage.definitions.filter(row => row.registrationStatus !== 'executable_exact').map(row => row.definitionId);
  assert.equal(coverage.definitions.length, selected.selected);
  assert(selected.pending.includes(bileId));
  assert.deepEqual(pending, selected.pending.filter(id => id !== bileId));
  assert.throws(() => prepareOfficialStandardReleaseOpeningV2(direct), error =>
    error.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
    && JSON.stringify(error.detail.pendingSelectedDefinitionIds) === JSON.stringify(pending));
  await save(dir + '/direct-admission.json', { version, selected: selected.selected, exact: selected.selected - pending.length,
    pending, previous: previous + '/mixed-ravager-v240/coverage.json', formalOpening: 'rejected_pending' });
} else {
  const passed = await read(dir + '/direct-admission.json');
  assert.equal(passed.version, version);
  assert.deepEqual(passed.pending, ['unit:ravager/deep-tunnel-movement-phase@1']);
}
const cocoon = base + '/wave3-artefact-cocoon-v223-v1';
const recipe = (await read(cocoon + '/factory-preflight.public.json')).find(r => r.status === 'compiled');
const authority = await read(cocoon + '/morph/authority.json');
const prepared = prepareOfficialStandardReleaseOpeningV2({ ...common, recipes: recipe.recipes,
  missionRecordKey: authority.state.officialMissionRuntimeState.missionRecordKey,
  deploymentRecordKey: authority.state.officialDeploymentGeometryBinding.deploymentRecordKey });
assert(!prepared.state.pieces.some(p => p.officialUnitRecordKey === 'army_units:ravager'));
assert.equal(prepared.state.officialCorrosiveBileSourceBundle.definitionId, bileId);
const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: prepared.state, candidateVersion: version });
assert.equal(typeof runtime.queryCorrosiveBilePlacement, 'function');
assert.equal(typeof runtime.queryCorrosiveBileProjection, 'function');
const actions = runtime.enumerate(prepared.state).candidates.map(row => row.actionType);
assert.deepEqual(actions, ['resolve_mission_start_of_round']);
await save(dir + '/cocoon-opening.json', { version, actions, source: cocoon + '/factory-preflight.public.json',
  runtimeHash: runtime.descriptor.runtimeHash, preloadedDefinition: bileId, rulesProfileHash: prepared.state.officialReleaseBileAssaultTiming });
