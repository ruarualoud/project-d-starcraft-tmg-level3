import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { inspectOfficialStandardReleaseOpeningCoverageV2, prepareOfficialStandardReleaseOpeningV2,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const versions = [
  { version: '2.43.0' },
  { version: '2.44.0', flag: '--support-ambush', additions: [
    'unit:bile_launcher/burrow-ambush-movement-phase@1', 'unit:defiler/burrow-ambush-movement-phase@1'] },
  { version: '2.45.0', flag: '--bile-launcher', additions: [
    'unit:bile_launcher/biological-structure-any-phase@1', 'unit:bile_launcher/detection-any-phase@1',
    'unit:bile_launcher/indomitable-assault-phase@1', 'unit:bile_launcher/source-of-creep-any-phase@1'] },
  { version: '2.46.0', flag: '--bombard', additions: ['unit:bile_launcher/bombard-movement-phase@1'] },
  { version: '2.48.0', flag: '--defiler-bite', additions: ['unit:defiler/cancerous-bite-combat-phase@1'] },
  { version: '2.49.0', flag: '--defiler-mound', additions: ['card:defiler_mound/poisonous-essence-any@1', 'card:defiler_mound/tunnel-network-any@1'] },
  { version: '2.50.0', flag: '--reactive-creep', additions: [
    'card:reactive_creep/creep-removal-any@1',
    'card:reactive_creep/living-glob-of-tissue-any@1',
    'card:reactive_creep/reactive-tissue-any@1'] },
  { version: '2.51.0', flag: '--plague', additions: ['unit:defiler/plague-assault-phase@1'] },
];
const variant = versions.find(row => row.flag && process.argv.includes(row.flag)) ?? versions[0];
const evidenceDir = version => base + '/zerg-forty-formal-admission-v2' + version.split('.')[1];
const dir = evidenceDir(variant.version);
const reference = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const manifest = await read(reference.sourceManifest);
const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
const referenceArmies = await read(reference.recipesRef);
const scenario = await read(base + '/zagara-standard-admission-v239/admission.json');
const inventory = await read('coordination/wave3/new-definition-inventory.json');
const entries = inventory.entries.filter(row => row.plannedItemId === 'T28-W3-09');
assert.equal(entries.length, 40);
const units = ['zagara', 'defiler', 'vileling__zergling_', 'bile_launcher'].map(id => ({
  unitInstanceId: id, recordKey: 'army_units:' + id, compositionKind: 'small',
  upgradeNames: id === 'defiler' ? ['Burrow Ambush', 'Plague', 'Cancerous Bite'] : [],
}));
const recipes = { player1: referenceArmies.player1, player2: { units, factionRecordKey: 'tactical_cards:zagara_s_swarm',
  tacticalCardRecordKeys: ['tactical_cards:reactive_creep', 'tactical_cards:defiler_mound'] } };
const input = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot,
  releaseMatchVersion: variant.version, recipes, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: scenario.mission, deploymentRecordKey: scenario.deployment };
async function verifyStrictFactory(result) {
  const pendingSelected = result.pendingSelected;
  if (pendingSelected.length) {
    assert.throws(() => prepareOfficialStandardReleaseOpeningV2(input), e =>
      e.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
      && JSON.stringify(e.detail.pendingSelectedDefinitionIds) === JSON.stringify(pendingSelected));
  } else {
    const prepared = prepareOfficialStandardReleaseOpeningV2(input);
    assert.equal(prepared.state.phase, 'start_of_round');
  }
  await save(dir + '/factory.json', { total: result.allSelected, wave3Exact: result.exactWave3Zerg, pendingSelected,
    accepted: !pendingSelected.length, strictProductEntryVerified: true, modelCalls: 0 });
}

try {
  if (process.argv.includes('--strict-only')) {
    const saved = await read(dir + '/coverage.json');
    assert.equal(saved.version, variant.version);
    assert.equal(saved.manifestHash, manifest.manifestHash);
    assert.deepEqual(await read(dir + '/recipes.json'), recipes);
    await verifyStrictFactory(saved);
  } else {
    await save(dir + '/recipes.json', recipes);
    const coverage = inspectOfficialStandardReleaseOpeningCoverageV2(input);
    const rows = entries.map(entry => {
      const definitionId = entry.semanticId + '@' + entry.semanticVersion;
      const route = coverage.definitions.find(row => row.definitionId === definitionId);
      return { definitionId, record: entry.recordId, name: entry.featureName, status: route?.registrationStatus ?? 'absent_from_selection',
        sourceFeatureHash: route?.sourceFeatureHash ?? null };
    });
    const pendingSelected = coverage.definitions.filter(d => d.registrationStatus !== 'executable_exact').map(d => d.definitionId);
    const summary = { version: input.releaseMatchVersion, manifestHash: manifest.manifestHash, allSelected: coverage.definitions.length,
      wave3ZergDefinitions: rows.length, selectedWave3Zerg: rows.filter(r => r.status !== 'absent_from_selection').length,
      exactWave3Zerg: rows.filter(r => r.status === 'executable_exact').length, pendingSelected, rows };
    await save(dir + '/coverage.json', summary);
    if (variant.additions) {
      const previousDir = evidenceDir(versions[versions.indexOf(variant) - 1].version);
      const old = await read(previousDir + '/coverage.json');
      assert.deepEqual(await read(previousDir + '/recipes.json'), recipes);
      assert.equal(summary.allSelected, old.allSelected);
      const changes = old.rows.filter((r, i) => r.status !== rows[i].status);
      const expected = variant.additions;
      assert.deepEqual(changes.map(r => r.definitionId).sort(), expected);
      assert.equal(summary.exactWave3Zerg, old.exactWave3Zerg + expected.length);
      assert.deepEqual(rows.map(r => [r.definitionId, r.sourceFeatureHash]), old.rows.map(r => [r.definitionId, r.sourceFeatureHash]));
    }
    await verifyStrictFactory(summary);
  }
} catch (error) {
  await save(dir + '/stop-' + Date.now() + '.json', { code: error.code, message: error.message, detail:error.actual?.detail ?? error.detail });
  throw error;
}
