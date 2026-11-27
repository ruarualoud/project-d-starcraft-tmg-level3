import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { freezeArmyBuilderReleaseValueV2 as freeze } from '../packages/source-data/official-army-builder-release-bundle-v2.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'build/ticket-28-wave3-army-builder-20261112-v1');
const intake = 'build/ticket-28-wave3-source-candidate-20261112-v1';
const previous = 'build/ticket-28-wave3-release-context-20261112-v1';
const read = async ref => JSON.parse(await fs.readFile(path.resolve(root, ref), 'utf8'));
const save = async (name, value) => {
  const file = path.join(output, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const bundleRef = 'content/source-releases/wave3-20261112-army-builder-v2.json';
const manifestRef = 'content/source-releases/wave3-20261112-army-builder-release-v2.json';
const releaseId = 'wave3-u83-c84-r50-army-builder-v1';
function openRegistry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(output, 'releases.sqlite') });
  return { store, resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }),
    close: () => store.close() };
}
function unit(recordKey, compositionKind = 'small', upgrades = []) {
  return { unitInstanceId: `${recordKey.split(':')[1]}-1`, recordKey, compositionKind, upgrades };
}
function candidate(units, overrides = {}) {
  return { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
    factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units, ...overrides };
}
async function openBuilder() {
  const registry = openRegistry();
  try {
    const context = await registry.resolver.resolve({ releaseId, purpose: 'army_building' });
    const bundle = context.resources.armyBuilder;
    assert.equal(bundle.sourceBinding.releaseId, context.manifest.releaseId);
    assert.equal(bundle.normalizedDatasetHash, context.dataset.datasetHash);
    return { ...registry, context, bundle, port: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: bundle }) };
  } catch (error) { registry.close(); throw error; }
}

const boundary = await runProductBoundaryCheck({
  directory: path.join(output, 'verification'),
  identity: { factoryModule: 'packages/roster-strategist/army-builder-query-port-v1.mjs',
    factoryExport: 'createOfficialArmyBuilderQueryPortV1',
    sourceRef: intake + '/source-index.json', contractVersion: 'T28-W3-03-catalogue-native-v1' },
  steps: [
    { name: 'read', openProduct: async () => ({
      old: await read(previous + '/legacy-dataset.json'),
      current: await read(intake + '/compiled/dataset.json'),
    }), check: async ({ old, current }) => {
      assert.throws(() => createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: current }),
        /UNIT_COMPOSITION_UPGRADE_DATASET_INVALID/);
      // Capture the prior implementations through Git without changing the worktree.
      const names = ['official-unit-composition-upgrade-data-bundle-v1.mjs',
        'official-army-resource-budget-data-bundle-v1.mjs', 'official-faction-army-eligibility-data-bundle-v1.mjs',
        'official-card-build-payment-data-bundle-v1.mjs', 'official-unit-card-supply-data-bundle-v1.mjs'];
      const baselineDir = path.join(output, 'legacy-baseline');
      await fs.mkdir(baselineDir, { recursive: true });
      for (const name of names) {
        const relative = 'packages/source-data/' + name;
        const code = execFileSync('git', ['show', 'HEAD:' + relative], { cwd: root, encoding: 'utf8' });
        const rewritten = code.replace(/from\s+(["'])(\.[^"']+)\1/gu, (match, quote, ref) => {
          const target = names.includes(path.basename(ref)) ? path.join(baselineDir, path.basename(ref))
            : path.resolve(root, 'packages/source-data', ref);
          return 'from ' + JSON.stringify(pathToFileURL(target).href);
        });
        await atomicWrite(path.join(baselineDir, name), rewritten);
      }
      const baseline = await import(pathToFileURL(path.join(baselineDir, names[0])).href);
      const expected = baseline.createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: old });
      const actual = createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: old });
      assert.equal(JSON.stringify(actual), JSON.stringify(expected));
      await save('legacy-policy.json', actual);
      const evidenceRef = await save('read.json', { legacyByteEquivalent: true,
        legacyBundleHash: actual.bundleHash, newDatasetRejectedByLegacy: true,
        legacyVersion: old.dataVersions, currentVersion: current.dataVersions });
      return { evidenceRef, checkpointRef: evidenceRef };
    } },
    { name: 'compile', repairRef: 'T28-W3-03-source-vileling-two-tiers', openProduct: async () => ({
      dataset: await read(intake + '/compiled/dataset.json'),
      snapshot: await read(intake + '/compiled/snapshot.json'),
      legacyPolicyBundle: freeze(await read(path.relative(root, path.join(output, 'legacy-policy.json')))),
    }), check: async input => {
      const oldManifest = await read('content/source-releases/wave3-20261112-catalogue-release-v2.json');
      const sourceRevision = await read(oldManifest.source.sourceRevisionRef);
      const options = { releaseId, snapshot: input.snapshot, dataset: input.dataset, sourceRevision,
        snapshotRef: oldManifest.source.snapshotRef, datasetRef: oldManifest.source.datasetRef,
        sourceRevisionRef: oldManifest.source.sourceRevisionRef,
        sourcePolicy: oldManifest.source.policy, referenceSources: oldManifest.source.references };
      const releaseContext = { manifest: createOfficialReleaseManifestV2(options) };
      const bundle = createOfficialArmyBuilderCatalogueV2({ ...input, releaseContext });
      assert.deepEqual(bundle.audit, { unitReferenceCount: 38, compositionOptionCount: 46,
        purchasableUpgradeCount: bundle.purchasableUpgradeProfiles.length,
        sourceUnitCount: 45, cardCount: 49, factionCount: 10 });
      for (const profile of bundle.unitCompositionProfiles) {
        const raw = input.dataset.recordsByKey[profile.recordKey].payload;
        for (const option of profile.compositionOptions) {
          assert.equal(option.mineralCost, raw[option.compositionKind].cost);
          assert.equal(option.startingModels, raw[option.compositionKind].models);
          assert.equal(option.startingSupply, raw[option.compositionKind].supply);
        }
      }
      for (const profile of bundle.purchasableUpgradeProfiles) {
        const raw = input.dataset.recordsByKey[profile.recordKey].payload.upgrades[profile.upgradeIndex];
        for (const [kind, value] of Object.entries(profile.mineralCostByComposition))
          assert.equal(value, kind === 'small' ? raw.costS : raw.costL);
      }
      await atomicWrite(path.join(root, bundleRef), JSON.stringify(bundle, null, 2) + '\n');
      const manifest = createOfficialReleaseManifestV2({ ...options,
        components: { ...oldManifest.components, armyBuilder: { ref: bundleRef, version: '2.0.0',
          integrity: { field: 'bundleHash', value: bundle.bundleHash } } } });
      await atomicWrite(path.join(root, manifestRef), JSON.stringify(manifest, null, 2) + '\n');
      const registry = openRegistry();
      try { registry.resolver.register(manifest); } finally { registry.close(); }
      const evidenceRef = await save('compile.json', { audit: bundle.audit,
        bundleHash: bundle.bundleHash, manifestHash: manifest.manifestHash,
        referenceDiscrepancies: bundle.referenceDiscrepancies,
        constraints: bundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.armyBuildingConstraints,
        scope: bundle.usageScope });
      return { evidenceRef, checkpointRef: bundleRef };
    } },
    { name: 'consume', openProduct: openBuilder, check: async ({ port, bundle }) => {
      const menus = port.listFactionChoices();
      assert.equal(menus.factionCount, 10);
      const menu = port.enumerateArmyBuildingChoices({ factionRecordKey: 'tactical_cards:nova_covert_ops',
        scaleId: 'Skirmish', mineralBudget: 500 });
      assert.ok(menu.unitCandidates.some(row => row.recordKey === 'army_units:spec_ops_marauder__marauder_'));
      assert.equal(menu.unitCandidates.find(row => row.recordKey === 'army_units:marine').compositionOptions[0].mineralCost, 170);
      const legal = candidate([unit('army_units:nova_assault_mode'), unit('army_units:spec_ops_marauder__marauder_')],
        { factionRecordKey: 'tactical_cards:nova_covert_ops' });
      const verdict = port.evaluateRosterCandidate(legal);
      assert.equal(verdict.status, 'legal', JSON.stringify(verdict));
      assert.equal(verdict.summary.mineralSpent, 490);
      const oldBundle = freeze(await read(path.relative(root, path.join(output, 'legacy-policy.json'))));
      const oldPort = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: oldBundle });
      const oldPrice = candidate([unit('army_units:marine')], { mineralBudget: 160 });
      assert.equal(oldPort.evaluateRosterCandidate(oldPrice).status, 'legal');
      const overBudget = port.evaluateRosterCandidate(oldPrice);
      assert.equal(overBudget.rejectionKind, 'resource_budget', JSON.stringify(overBudget));
      const wrongFaction = port.evaluateRosterCandidate(candidate([unit('army_units:spec_ops_marauder__marauder_')]));
      assert.equal(wrongFaction.rejectionKind, 'faction_eligibility', JSON.stringify(wrongFaction));
      const duplicate = port.evaluateRosterCandidate(candidate([
        unit('army_units:nova_assault_mode'), { ...unit('army_units:nova_assault_mode'), unitInstanceId: 'nova-2' }],
      { factionRecordKey: 'tactical_cards:nova_covert_ops', mineralBudget: 1000 }));
      assert.equal(duplicate.rejectionKind, 'unique_unit', JSON.stringify(duplicate));
      const variants = port.evaluateRosterCandidate(candidate([
        unit('army_units:nova_assault_mode'), unit('army_units:nova_stealth_mode')],
      { factionRecordKey: 'tactical_cards:nova_covert_ops', mineralBudget: 1000 }));
      assert.equal(variants.rejectionKind, 'unit_variant', JSON.stringify(variants));
      const replacement = port.evaluateRosterCandidate(candidate([unit('army_units:marine', 'small', [{ upgradeName: 'AGG-12' }])]));
      assert.equal(replacement.status, 'legal', JSON.stringify(replacement));
      assert.equal(replacement.summary.mineralSpent, 180);
      const invalidReplacement = port.evaluateRosterCandidate(candidate([unit('army_units:marine', 'small', [{ upgradeName: 'nonexistent' }])]));
      assert.notEqual(invalidReplacement.status, 'legal');
      const zergMenu = port.enumerateArmyBuildingChoices({ factionRecordKey: 'tactical_cards:zagara_s_swarm', scaleId: 'Skirmish', mineralBudget: 500 });
      assert.ok(zergMenu.tacticalCandidates.some(row => row.recordKey === 'tactical_cards:accelerating_creep' && row.vespeneGasCost === 0));
      const zerg = candidate([unit('army_units:vileling__zergling_')], { factionRecordKey: 'tactical_cards:zagara_s_swarm' });
      assert.equal(port.evaluateRosterCandidate(zerg).rejectionKind, 'tactical_group');
      zerg.tacticalCardRecordKeys = ['tactical_cards:accelerating_creep'];
      assert.equal(port.evaluateRosterCandidate(zerg).status, 'legal');
      assert.equal(bundle.purchasableUpgradeProfiles.filter(row => row.recordKey === 'army_units:queen').length > 0, true);
      await save('candidate.json', legal);
      await save('verdict.json', verdict);
      const evidenceRef = await save('consume.json', { legal, verdict, oldPrice, overBudget,
        wrongFaction, duplicate, variants, replacement, invalidReplacement,
        zergFreeCard: zerg, catalogueBinding: port.portDescriptor().sourceBinding });
      return { evidenceRef, checkpointRef: path.join(output, 'candidate.json') };
    } },
    { name: 'coldRecovery', openProduct: openBuilder, check: async ({ port, context }) => {
      const saved = await read(path.relative(root, path.join(output, 'candidate.json')));
      const before = await read(path.relative(root, path.join(output, 'verdict.json')));
      const after = port.evaluateRosterCandidate(saved);
      assert.deepEqual(after, before);
      assert.equal(after.sourceBinding.normalizedDatasetHash, context.dataset.datasetHash);
      const evidenceRef = await save('cold.json', { candidateRetained: true, nativeVerdictByteEquivalent: true,
        binding: after.sourceBinding, verdictHash: after.verdictHash,
        fullPlanningJourney: 'pending_new_geometry_runtime_missions_and_strategy_components' });
      return { evidenceRef, checkpointRef: evidenceRef };
    } },
  ],
});
console.log(JSON.stringify({ status: boundary.status, passed: Object.keys(boundary.passed), failures: boundary.failures }));
