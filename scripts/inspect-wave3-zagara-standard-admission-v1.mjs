import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { buildOfficialRoomArmyAuditV1, inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseMatchRuntimeV2 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const creep = process.argv.includes('--creep');
const combat = process.argv.includes('--combat');
const army = process.argv.includes('--army');
const reactions = process.argv.includes('--reactions');
const version = reactions ? '2.39.0' : army ? '2.38.0' : creep ? '2.37.0' : combat ? '2.36.0' : '2.35.0';
const output = base + '/zagara-standard-admission-v' + version.split('.').slice(0, 2).join('');
const manifest = await read(base + '/tabletop-raven-m01-v1/manifest.json');
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const opening = await read(base + '/nova-stealth-standard-v235/nova_stealth_mode/factory-state.json');
const nova = (await read(base + '/raven-seeker-standard-v229/nova-rosters.json')).find(r => r.mode === 'nova_stealth_mode');
const player2 = { factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
  units: ['zagara', 'defiler'].map(key => ({ unitInstanceId: key, recordKey: 'army_units:' + key, compositionKind: 'small', upgradeNames: [] })) };
const recipes = { player1: nova.player1, player2 };
const input = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, releaseMatchVersion: version,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, recipes,
  missionRecordKey: opening.officialMissionSetupBinding.missionRecordKey,
  deploymentRecordKey: opening.officialDeploymentGeometryBinding.deploymentRecordKey };
const resumeOpening = process.argv.includes('--resume-opening');
if (resumeOpening) assert.deepEqual(await read(output + '/recipes.json'), recipes);
else await save(output + '/recipes.json', recipes);
if (creep) {
  const audit = cards => buildOfficialRoomArmyAuditV1(opening.officialUnitCompositionUpgradeDataBundle, 'player2',
    { ...player2, tacticalCardRecordKeys: cards }, { dataset: context.dataset, releaseContext: context, armySpendPolicy: input.armySpendPolicy });
  const free = 'tactical_cards:accelerating_creep', paid = 'tactical_cards:reactive_creep';
  for (const cards of [[], [free, paid]]) {
    assert.throws(() => audit(cards), e => e.message === 'FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:tactical_cards:zagara_s_swarm:Creep:' + cards.length);
  }
  const freeGas = audit([free]).armyResourceBudgetResult.vespeneSpent;
  const paidGas = audit([paid]).armyResourceBudgetResult.vespeneSpent;
  assert.equal(paidGas - freeGas, context.dataset.recordsByKey[paid].payload.cost - context.dataset.recordsByKey[free].payload.cost);
  await save(output + '/creep-army-audit.json', { rejectedCounts: [0, 2], accepted: [[free, freeGas], [paid, paidGas]], source: player2.factionRecordKey });
}
function inspectCoverage() {
  const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(input);
  const pending = coverage.definitions.filter(d => d.registrationStatus !== 'executable_exact').map(d => d.definitionId);
  return { version, releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
    total: coverage.definitions.length, exact: coverage.definitions.length - pending.length, pending,
    mission: input.missionRecordKey, deployment: input.deploymentRecordKey };
}
const facts = resumeOpening ? await read(output + '/coverage.json') : inspectCoverage();
assert.equal(facts.version, version);
assert.equal(facts.manifestHash, manifest.manifestHash);
assert.equal(facts.mission, input.missionRecordKey);
assert.equal(facts.deployment, input.deploymentRecordKey);
if (!resumeOpening) await save(output + '/coverage.json', facts);
if (reactions || army || creep || combat) {
  const prior = await read(base + (reactions ? '/zagara-standard-admission-v238' : army ? '/zagara-standard-admission-v237' : creep ? '/zagara-standard-admission-v236' : '/zagara-standard-admission-v235') + '/admission.json');
  const added = reactions ? [
    'card:zagara_s_swarm/instinctive-reaction-any@1', 'unit:zagara/transfusion-any-phase@1',
    'unit:defiler/consume-any-phase@1', 'unit:defiler/dark-swarm-assault-phase@1', 'unit:defiler/gestate-dark-swarm-movement-phase@1',
  ] : army ? [
    'unit:zagara/infested-drop-movement-phase@1', 'unit:zagara/broodmother-movement-phase@1',
    'card:zagara_s_swarm/scourge-queen-any@1', 'unit:zagara/psionic-link-any-phase@1',
  ] : creep ? ['card:zagara_s_swarm/zerg-creep-any@1'] : [
    'unit:zagara/devastating-charge-assault-phase@1', 'unit:defiler/devastating-charge-assault-phase@1', 'unit:zagara/indomitable-assault-phase@1',
  ];
  assert(added.every(id => prior.pending.includes(id)));
  assert.equal(prior.total, facts.total);
  assert.deepEqual(facts.pending, prior.pending.filter(id => !added.includes(id)));
}
if (facts.pending.length) {
  assert.throws(() => prepareOfficialStandardReleaseOpeningV2(input), error =>
    error.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
    && JSON.stringify(error.detail.pendingSelectedDefinitionIds) === JSON.stringify(facts.pending));
  await save(output + '/admission.json', { ...facts, opening: 'rejected_pending_definitions' });
} else {
  const prepared = prepareOfficialStandardReleaseOpeningV2(input);
  await save(output + '/factory-state.json', prepared.state);
  const runtime = createOfficialReleaseMatchRuntimeV2({ context, state: prepared.state, candidateVersion: version });
  const actions = runtime.enumerate(prepared.state).candidates.map(c => c.actionType);
  assert.deepEqual(actions, ['resolve_mission_start_of_round']);
  await save(output + '/admission.json', { ...facts, opening: 'accepted', actions, runtimeHash: runtime.descriptor.runtimeHash });
}
