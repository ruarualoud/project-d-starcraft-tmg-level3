import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialUnitCardSupplyDataBundleV1, createOfficialUnitCardSupplyDataBundleV2,
  verifyOfficialUnitCardSupplyDataBundleV1 } from '../packages/source-data/official-unit-card-supply-data-bundle-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { freezeArmyBuilderReleaseValueV2 as freeze } from '../packages/source-data/official-army-builder-release-bundle-v2.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave2-capabilities-20261113-v1/unit-characteristics');
const bundleRef = 'content/source-releases/wave3-20261112-unit-characteristics-v2.json';
const manifestRef = 'content/source-releases/wave3-20261112-unit-characteristics-release-v2.json';
const releaseId = 'wave3-u83-c84-r50-unit-characteristics-v1';
const read = async ref => JSON.parse(await fs.readFile(path.resolve(root, ref), 'utf8'));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const stateRef = name => path.relative(root, path.join(directory, name));
const unitsOf = bundle => bundle.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.unitDataBundle;
const requestsFor = raw => [...new Set([0, ...raw.squadProfile.flatMap(tier =>
  tier.modelCount === '-' ? [] : tier.modelCount.split('-').map(Number))])]
  .map(currentModels => ({ recordKey: 'army_units:' + raw.id, currentModels }));

async function openProduct() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  try {
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
    const context = await resolver.resolve({ releaseId, purpose: 'unit_characteristics' });
    const port = createOfficialArmyBuilderQueryPortV1({
      unitCompositionUpgradeDataBundle: context.resources.armyBuilder, releaseContext: context });
    return { store, resolver, context, port, close: () => store.close() };
  } catch (error) { store.close(); throw error; }
}

if (process.argv.includes('--cold-read')) {
  const product = await openProduct();
  try {
    const { binding } = await product.resolver.resolveSubject({
      subjectKind: 'engineering_unit_facts', subjectId: 'tank-purchase-and-casualty' });
    const saved = await read(stateRef('successor.json'));
    assert.equal(binding.releaseId, releaseId);
    assert.deepEqual(product.port.evaluateRosterCandidate(saved.candidate), saved.verdict);
    assert.deepEqual(product.port.inspectUnitCardSupply(saved.request), saved.receipt);
    console.log(JSON.stringify({ restoredBinding: binding,
      verdictHash: saved.verdict.verdictHash, receiptHash: saved.receipt.receiptHash,
      currentSupply: saved.receipt.currentSupply.currentSupplyValue }));
  } finally { product.close(); }
} else {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/roster-strategist/army-builder-query-port-v1.mjs',
      factoryExport: 'createOfficialArmyBuilderQueryPortV1',
      sourceRef: 'content/source-releases/wave3-20261112-geometry-release-v2.json',
      contractVersion: 'T28-W3-07-unit-characteristics-v2' }, steps: [
      { name: 'read', openProduct: async () => ({
        dataset: await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json'),
        authority: await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
      }), check: async ({ dataset, authority }) => {
        const baseline = authority.state.officialUnitCardSupplyDataBundle;
        const actual = createOfficialUnitCardSupplyDataBundleV1({ dataset });
        assert.deepEqual(actual, baseline);
        const current = await read('build/ticket-28-wave3-source-candidate-20261112-v1/compiled/dataset.json');
        assert.throws(() => createOfficialUnitCardSupplyDataBundleV1({ dataset: current }), /UNIT_CARD_SUPPLY_DATASET_INVALID/);
        const oldPolicy = freeze(await read('build/ticket-28-wave3-army-builder-20261112-v1/legacy-policy.json'));
        const oldPort = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: oldPolicy });
        assert.equal(Object.hasOwn(oldPort, 'inspectUnitCardSupply'), false);
        const evidenceRef = await save('read.json', { legacyBundleByteEquivalent: true,
          legacyBundleHash: actual.bundleHash, legacyPortSurfaceUnchanged: true,
          legacyRejectsNewDataset: true, currentVersions: current.dataVersions });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'compile', openProduct: async () => ({
        manifest: await read('content/source-releases/wave3-20261112-geometry-release-v2.json'),
        geometry: await read('content/source-releases/wave3-20261112-geometry-v2.json'),
        builder: await read('content/source-releases/wave3-20261112-army-builder-v2.json'),
      }), check: async ({ manifest, geometry, builder }) => {
        const [dataset, snapshot, sourceRevision] = await Promise.all([
          read(manifest.source.datasetRef), read(manifest.source.snapshotRef), read(manifest.source.sourceRevisionRef) ]);
        const units = unitsOf(builder);
        const args = { dataset, snapshot, releaseContext: { manifest },
          modelBaseGeometryDataBundle: geometry, armyBuilderUnitDataBundle: units };
        const facts = createOfficialUnitCardSupplyDataBundleV2(args);
        assert.deepEqual(facts.audit, { unitCount: 45, geometryBoundCount: 44, geometryMissingCount: 1 });
        assert.throws(() => createOfficialUnitCardSupplyDataBundleV2({ ...args,
          modelBaseGeometryDataBundle: { ...geometry, normalizedDatasetHash: '0'.repeat(64) } }),
        /MODEL_BASE_GEOMETRY_DATA_BUNDLE_V2_INVALID/);
        const badFacts = structuredClone(facts);
        badFacts.unitProfiles[0].supplyProfile[0].supply += 1;
        assert.throws(() => verifyOfficialUnitCardSupplyDataBundleV1(badFacts), /UNIT_CARD_SUPPLY_DATA_BUNDLE_V2_INVALID/);
        const oldFacts = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
          .state.officialUnitCardSupplyDataBundle;
        assert.throws(() => createOfficialArmyBuilderQueryPortV1({
          unitCompositionUpgradeDataBundle: freeze(builder), unitCardSupplyDataBundle: oldFacts }),
        /ARMY_BUILDER_UNIT_FACTS_SOURCE_MISMATCH/);
        await atomicWrite(path.join(root, bundleRef), JSON.stringify(facts, null, 2) + '\n');
        const next = createOfficialReleaseManifestV2({ releaseId, status: 'candidate', dataset, snapshot, sourceRevision,
          snapshotRef: manifest.source.snapshotRef, datasetRef: manifest.source.datasetRef,
          sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
          sourcePolicy: manifest.source.policy, components: { ...manifest.components,
            unitCharacteristics: { ref: bundleRef, version: facts.version,
              integrity: { field: 'bundleHash', value: facts.bundleHash } } } });
        await atomicWrite(path.join(root, manifestRef), JSON.stringify(next, null, 2) + '\n');
        const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
        try { store.registerRelease(next); } finally { store.close(); }
        const evidenceRef = await save('compile.json', { bundleHash: facts.bundleHash,
          manifestHash: next.manifestHash, audit: facts.audit, tamperingRejected: true,
          mixedReleaseRejected: true, published: false });
        return { evidenceRef, checkpointRef: bundleRef };
      } },
      { name: 'consume', openProduct, check: async ({ context, port }) => {
        const startedAt = performance.now();
        const beforeHash = hash(context.resources);
        const cases = [];
        for (const row of context.dataset.recordIndex.filter(row => row.recordType === 'unit')) {
          const raw = context.dataset.recordsByKey[row.recordKey].payload;
          for (const request of requestsFor(raw)) {
            // The normalized recordKey is authoritative, including any API name aliases.
            request.recordKey = row.recordKey;
            const receipt = port.inspectUnitCardSupply(request);
            const tier = raw.squadProfile.find(tier => tier.modelCount !== '-'
              && request.currentModels >= Number(tier.modelCount.split('-')[0])
              && request.currentModels <= Number(tier.modelCount.split('-')[1]));
            assert.equal(receipt.currentSupply.currentSupplyValue, request.currentModels === 0 ? 0 : tier.supply);
            assert.equal(receipt.layout.speed.printedValue, raw.stats.speed);
            for (const composition of receipt.startingCompositions) {
              const expected = raw[composition.composition.kind];
              assert.equal(composition.startingSupplyValue, expected.supply);
              assert.equal(composition.composition.startingModels, expected.models);
              assert.equal(composition.composition.pointsCost, expected.cost);
            }
            cases.push({ request, supply: receipt.currentSupply.currentSupplyValue,
              selectedTier: receipt.currentSupply.selectedTier, receiptHash: receipt.receiptHash });
          }
        }
        assert.equal(new Set(cases.map(row => row.request.recordKey)).size, 45);
        const tank = port.inspectUnitCardSupply({ recordKey: 'army_units:siege_tank', currentModels: 1 });
        assert.equal(tank.currentSupply.currentSupplyValue, 2);
        assert.equal(tank.layout.base.widthMillimetres, 150);
        const raven = port.inspectUnitCardSupply({ recordKey: 'army_units:raven', currentModels: 1 });
        assert.equal(raven.layout.base, null);
        assert.equal(raven.layout.geometryStatus.status, 'source_missing');
        assert.throws(() => port.inspectUnitCardSupply({ recordKey: 'army_units:siege_tank',
          currentModels: 1, currentSupply: 0 }), /ARMY_BUILDER_UNIT_FACTS_REQUEST_INVALID/);
        assert.throws(() => port.inspectUnitCardSupply({ recordKey: 'army_units:siege_tank', currentModels: 2 }),
          /CURRENT_SUPPLY_MODEL_COUNT_UNMAPPED/);
        assert.throws(() => port.inspectUnitCardSupply({ recordKey: 'army_units:missing', currentModels: 1 }),
          /UNIT_CARD_SUPPLY_PROFILE_REQUIRED/);
        assert.equal(hash(context.resources), beforeHash);
        const evidenceRef = await save('consume.json', { cases, unitCount: 45,
          tank, raven, readOnlyConfirmed: true, durationMs: performance.now() - startedAt });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'successor', repairRef: 'T28-W3-07-fixture-tank-requires-two-elite-slots',
        openProduct, check: async ({ resolver, port }) => {
        const candidate = { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 500,
          factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:factory__tech_lab_'],
          units: [{ unitInstanceId: 'tank-1', recordKey: 'army_units:siege_tank', compositionKind: 'small', upgrades: [] }] };
        const missingSlotCard = port.evaluateRosterCandidate({ ...candidate, tacticalCardRecordKeys: [] });
        assert.equal(missingSlotCard.rulesErrorCode, 'ARMY_SLOT_CAPACITY_EXCEEDED');
        const verdict = port.evaluateRosterCandidate(candidate);
        assert.equal(verdict.status, 'legal', JSON.stringify(verdict));
        assert.equal(verdict.summary.startingSupply, 2);
        const request = { recordKey: candidate.units[0].recordKey, currentModels: 0 };
        const receipt = port.inspectUnitCardSupply(request);
        assert.equal(receipt.currentSupply.currentSupplyValue, 0);
        const binding = await resolver.bind({ subjectKind: 'engineering_unit_facts',
          subjectId: 'tank-purchase-and-casualty', releaseId, purpose: 'unit_characteristics' });
        const evidenceRef = await save('successor.json', { candidate, verdict, request, receipt, binding,
          rejectedMissingSlotCard: missingSlotCard,
          scope: 'legal_purchase_then_declared_casualty_supply_query',
          battlefieldActionExecuted: false, wave2AbilitiesExecuted: false });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'coldRecovery', openProduct: async () => ({}), check: async () => {
        const { stdout } = await promisify(execFile)(process.execPath, [fileURLToPath(import.meta.url), '--cold-read'],
          { cwd: root, maxBuffer: 1000000 });
        const restored = JSON.parse(stdout);
        assert.equal(restored.currentSupply, 0);
        const evidenceRef = await save('cold-recovery.json', { freshProcess: true, ...restored });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
    ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
}
