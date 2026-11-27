import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4AbilityDiff, WAVE4_ABILITY_DIRECTORY } from './compile-wave4-ability-diff.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 }
  from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { resolveOfficialAbilityIdentityV2, compileOfficialAbilityIdentityCatalogueV2 }
  from '../packages/source-data/official-ability-identity-v2.mjs';
import { createOfficialReactionFamilySourceBundleV2, createOfficialReactionFamilyDefinitionBindingsV1,
  createOfficialReactionFamilyAdapterV1 } from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { createOfficialAbilityEffectRuntimeV1 } from '../packages/product-composition/official-ability-effect-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { WAVE4_CONSUMERS, WAVE4_REACTION_REVISIONS }
  from '../content/source-releases/wave4-20261127/ability-review-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialReleaseCardCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const compiled = await compileWave4AbilityDiff(root);
const { inventory, identities, registry, dataset } = compiled;
for (const [file, expected] of Object.entries({ 'feature-registry.json': registry,
  'identity-catalogue.json': identities, 'ability-diff.json': inventory })) {
  assert.deepEqual(await read(`${WAVE4_ABILITY_DIRECTORY}/${file}`), expected, 'RECOMPILE:' + file);
}
for (const ref of Object.values(WAVE4_CONSUMERS)) {
  const module = await fs.readFile(path.join(root, ref.file), 'utf8');
  assert.match(module, new RegExp('export (?:async )?function ' + ref.exportName + '\\('), ref.file + '#' + ref.exportName);
}
assert.equal(inventory.definitions.length, 156);
assert.equal(inventory.records.length, 38);
assert.equal(inventory.unchangedUnitReferences.length, 45);
assert.ok(inventory.unchangedUnitReferences.every(row => row.wave4PayloadUnchanged));
assert.ok(inventory.definitions.every(row => row.consumerRefs.length && row.trigger && row.choiceOwnerAndSelection
  && row.settlement && row.cleanupAndRemoval && row.wave4RuntimeVerified === false));
assert.equal(inventory.definitions.filter(row => row.recordKey === 'army_units:archon').length, 15);
assert.ok(inventory.definitions.filter(row => row.recordKey === 'army_units:archon')
  .every(row => row.sourceHolds.includes('ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION')));
assert.equal(inventory.newAtoms.filter(row => !row.withdrawnOnly).length, 18);
assert.equal(inventory.newAtoms.filter(row => row.withdrawnOnly).length, 3);
assert.ok(inventory.newAtoms.every(row => row.status === 'required_not_implemented'));
const changed = inventory.definitions.filter(row => row.changeKind === 'changed_existing_definition');
assert.equal(changed.length, 14);
assert.equal(new Set(changed.map(row => row.recordKey)).size, 13);
for (const row of changed) {
  assert.equal(row.semanticVersion, 2);
  assert.throws(() => resolveOfficialAbilityIdentityV2(identities, { definitionId: row.previousDefinitionId }),
    /OFFICIAL_ABILITY_ALIAS_UNRESOLVED/);
}
// A source-array permutation may change byte lineage, but never semantic IDs.
// This synthetic mutation is not claimed as another certified source capture.
const reordered = structuredClone(dataset);
for (const record of Object.values(reordered.recordsByKey)) {
  (record.payload.upgrades || record.payload.boosts)?.reverse();
}
const reorderIdentities = compileOfficialAbilityIdentityCatalogueV2({ dataset: reordered, registry });
assert.deepEqual(reorderIdentities.definitions.map(row => row.definitionId).sort(),
  identities.definitions.map(row => row.definitionId).sort());
const selectedIds = inventory.timingReactionDefinitionIds;
assert.equal(selectedIds.length, 11);
assert.deepEqual([...selectedIds].sort(), WAVE4_REACTION_REVISIONS.map(row => row.definitionId).sort());
const args = { dataset, identityCatalogue: identities, sourceDefinitionIds: selectedIds,
  sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true }) };
const source = createOfficialAbilityEffectIrCatalogueV1(args);
assert.equal(source.definitionSelection.sourceDefinitionCount, 556);
assert.equal(source.definitions.length, 11);
assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...args, sourceDefinitionIds: [] }), /SOURCE_SELECTION_INVALID/);
assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...args, sourceDefinitionIds: ['missing@1'] }), /SOURCE_SELECTION_INVALID/);
assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...args, sourceDefinitionIds: 5 }), /SOURCE_SELECTION_INVALID/);
assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...args, sourceDefinitionIds: [selectedIds[0], selectedIds[0]] }), /SOURCE_SELECTION_INVALID/);
assert.throws(() => createOfficialAbilityEffectIrCatalogueV1({ ...args, executionBindings: [{
  definitionId: identities.definitions.find(row => !selectedIds.includes(row.definitionId)).definitionId,
  adapterId: 'official-reaction-family-adapter-v1', adapterVersion: '1.0.0', capability: 'automatic_consumer',
}] }), /ABILITY_EFFECT_IR_EXECUTION_OUTSIDE_SOURCE_SELECTION/);
const bundle = createOfficialReactionFamilySourceBundleV2({ catalogue: source, definitionIds: selectedIds });
const catalogue = createOfficialAbilityEffectIrCatalogueV1({ ...args,
  executionBindings: createOfficialReactionFamilyDefinitionBindingsV1(bundle) });
const adapter = createOfficialReactionFamilyAdapterV1(bundle);
const router = createOfficialAbilityEffectRuntimeV1({ catalogue, adapters: [adapter] });
assert.equal(router.descriptor.productionRoomEligible, false);
assert.equal(catalogue.denominator.executableExact, 11);
const oldDataset = await read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json');
const oldRegistry = await read('content/source-releases/wave3-20261112-feature-registry-v2.json');
const oldIdentities = compileOfficialAbilityIdentityCatalogueV2({ dataset: oldDataset, registry: oldRegistry });
const oldSource = createOfficialAbilityEffectIrCatalogueV1({ dataset: oldDataset, identityCatalogue: oldIdentities,
  sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset: oldDataset, includeInlineCardPhases: true }) });
assert.equal(oldSource.denominator.totalDefinitions, 414);
assert.equal(oldSource.definitionSelection, undefined);
const oldArmy = await read('content/source-releases/wave3-20261112-army-builder-v2.json');
const oldCards = oldArmy.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.cardDataBundle;
const oldManifest = await read('content/source-releases/wave3-20261112-army-builder-release-v2.json');
const oldSnapshot = await read('content/source-releases/wave4-20261127/compatibility/wave3-snapshot.json');
assert.deepEqual(createOfficialReleaseCardCatalogueV2({ context: { manifest: oldManifest,
  dataset: oldDataset, snapshot: oldSnapshot }, legacyCardDataBundle: oldCards }), oldCards);
const newCards = createOfficialReleaseCardCatalogueV2({ context: compiled, legacyCardDataBundle: oldCards });
assert.equal(newCards.normalizedDatasetHash, dataset.datasetHash);
assert.equal(newCards.cardProfiles.length, 59);
const oldBundle = createOfficialReactionFamilySourceBundleV2({ catalogue: oldSource,
  definitionIds: WAVE4_REACTION_REVISIONS.map(row => row.previousDefinitionId) });
function effectSpec(route) {
  return Object.fromEntries(Object.entries(route).filter(([key]) =>
    !['definitionId', 'sourceFeatureHash', 'sourceText', 'routeHash', 'timingHooks'].includes(key)));
}
for (const revision of WAVE4_REACTION_REVISIONS) {
  const current = bundle.routes.find(row => row.definitionId === revision.definitionId);
  const old = oldBundle.routes.find(row => row.definitionId === revision.previousDefinitionId);
  assert.equal(current.sourceText, revision.sourceText);
  assert.deepEqual(effectSpec(current), effectSpec(old), revision.definitionId);
  const bad = structuredClone(source);
  const badRow = bad.definitions.find(row => row.definitionId === revision.definitionId);
  badRow.sourceText = old.sourceText;
  const { definitionHash, ...definitionBody } = badRow; badRow.definitionHash = hash(definitionBody);
  const { catalogueHash, ...catalogueBody } = bad; bad.catalogueHash = hash(catalogueBody);
  assert.throws(() => createOfficialReactionFamilySourceBundleV2({ catalogue: bad, definitionIds: [revision.definitionId] }),
    /REACTION_COMPONENT_SOURCE_UNRECOGNIZED/);
}
const report = { schema: 'starcraft_tmg_wave4_ability_diff_verification_v1', status: 'passed',
  inventoryRole: 'frozen_initial_analysis; current implementation is recorded separately in executionProgress',
  executionProgress: { ref: 'coordination/wave4/ability-wiring-progress.json',
    implementedNewGameAtoms: (await read('coordination/wave4/ability-wiring-progress.json')).analysis.implementedNewGameAtoms },
  inventoryHash: inventory.inventoryHash, denominator: inventory.denominator,
  fullIdentityCount: identities.definitions.length, stableUnderSourceArrayReordering: true,
  allConsumerExportsExist: true, previousChangedIdentitiesNotAliased: true,
  sourceBlocks: { fullCompilation: inventory.fullCompilationBlock, strictPhase: inventory.strictPhaseBlock,
    heldDefinitions: inventory.denominator.sourceHeldDefinitions },
  reactionSourceBindings: { compiled: 11, reusedSpecsEqual: true, wrongRevisionTextRejected: true,
    selectedSourceCount: 11, originalSourceCount: 556, fullProductionAdmission: false,
    bundleHash: bundle.bundleHash, catalogueHash: catalogue.catalogueHash },
  oldWave3: { definitionCount: 414, sourceSelectionUnchanged: true, oldReactionSpecsSupported: 11,
    cardBundleRecompiledExactly: true },
  nativeReactionReceiptProof: 'docs/development/wave4/evidence/armour-reaction-components.public.json',
  modelCalls: 0, trainingTruth: false };
await atomicWrite(path.join(root, 'build/wave4-web/ability-diff/result.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/ability-diff.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
