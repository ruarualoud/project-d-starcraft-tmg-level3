import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { compileWave4CreepBuilder, WAVE4_CREEP_BUILDER_DIRECTORY, WAVE4_CREEP_BUILDER_SCOPE_REF }
  from './compile-wave4-creep-builder.mjs';
import { officialAbilitySourceFeatureHashV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialArmyBuilderCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { freezeArmyBuilderReleaseValueV2 } from '../packages/source-data/official-army-builder-release-bundle-v2.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { buildOfficialRoomArmyAuditV1, createOfficialRoomCardResourcesV1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { resolveOfficialRosterRegistryAuditV1 } from '../packages/rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const parent = path.join(root, 'build/wave4-web/creep-builder');
await fs.mkdir(parent, { recursive: true });
const directory = await fs.mkdtemp(path.join(parent, 'run-'));
const runRef = path.relative(root, directory);
const save = (ref, value) => atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
const compiled = await compileWave4CreepBuilder(root);
const { dataset, snapshot, inventory, context, builder, builderRef, scope, legacyPolicyBundle: old } = compiled;
const manifest = context.manifest;
const oldFactions = old.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle;
const sourceRecordKeys = [...oldFactions.cardDataBundle.cardProfiles, ...oldFactions.unitDataBundle.unitProfiles]
  .map(row => row.recordKey).sort();
assert.deepEqual(scope.sourceRecordKeys, sourceRecordKeys);
const sourceHashBefore = hash(dataset);
const args = { dataset, snapshot, releaseContext: context, legacyPolicyBundle: old, sourceRecordKeys };
assert.deepEqual(createOfficialArmyBuilderCatalogueV2(args), builder);
assert.equal(builder.catalogueSelection.sourceRecordCount, 119);
assert.equal(builder.catalogueSelection.selectedRecordKeys.length, 94);
assert.equal(builder.catalogueSelection.excludedRecordKeys.length, 25);
assert.equal(builder.catalogueSelection.fullReleaseAdmission, false);
assert.equal(builder.productionRoomEligible, false);
assert.equal(hash(dataset), sourceHashBefore, 'SOURCE_DATASET_MUST_NOT_BE_FILTERED_OR_MUTATED');
for (const sourceRecordKeys of [[], 4, ['missing'], [args.sourceRecordKeys[0], args.sourceRecordKeys[0]]]) {
  assert.throws(() => createOfficialArmyBuilderCatalogueV2({ ...args, sourceRecordKeys }), /source_record_selection/);
}
assert.throws(() => createOfficialArmyBuilderCatalogueV2({ ...args, sourceRecordKeys: undefined }),
  /uncompiled_purchase_rule:tactical_cards:stukov_s_forces:Ashes of the UED/);
const oldDataset = await read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json');
const oldSnapshot = await read('content/source-releases/wave4-20261127/compatibility/wave3-snapshot.json');
const oldManifest = await read('content/source-releases/wave3-20261112-army-builder-release-v2.json');
const compatibilityArgs = { dataset: oldDataset, snapshot: oldSnapshot,
  releaseContext: { dataset: oldDataset, snapshot: oldSnapshot, manifest: oldManifest }, legacyPolicyBundle: old };
const baselineCommit = '97bc694a1dde3eb6d96335391dc507f3d7b4b54d';
const moduleRef = 'packages/source-data/official-army-builder-catalogue-v2.mjs';
const baselineSource = execFileSync('git', ['show', baselineCommit + ':' + moduleRef], { cwd: root, encoding: 'utf8' })
  .replace(/from\s+(["'])(\.[^"']+)\1/gu, (_, quote, ref) => 'from '
    + JSON.stringify(pathToFileURL(path.resolve(root, path.dirname(moduleRef), ref)).href));
await atomicWrite(path.join(directory, 'baseline-catalogue.mjs'), baselineSource);
const baseline = await import(pathToFileURL(path.join(directory, 'baseline-catalogue.mjs')).href);
assert.equal(JSON.stringify(createOfficialArmyBuilderCatalogueV2(compatibilityArgs)),
  JSON.stringify(baseline.createOfficialArmyBuilderCatalogueV2(compatibilityArgs)));
assert.throws(() => createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: old,
  releaseContext: context }), /ARMY_BUILDER_RELEASE_SOURCE_MISMATCH/);

const portFor = context => createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: context.resources.armyBuilder, releaseContext: context });
const port = portFor(context);
const factoryAudit = (context, candidate) => buildOfficialRoomArmyAuditV1(context.resources.armyBuilder,
  candidate.sideKey, { ...candidate, nativeCandidateInput: candidate }, { dataset: context.dataset,
    releaseContext: context, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
const registryFor = (context, candidatesBySide) => {
  const audits = Object.fromEntries(Object.entries(candidatesBySide).map(([side, candidate]) => [side, factoryAudit(context, candidate)]));
  const disclosure = createOfficialRoomRosterDisclosureDataBundleV1({ dataset: context.dataset,
    snapshot: context.snapshot, releaseContext: context });
  const registry = resolveOfficialRosterRegistryAuditV1({ state: { players: { player1: {}, player2: {} } },
    rosterDisclosureDataBundle: disclosure, procedureKind: 'roster_registry_audit', rosterSetComplete: true,
    rulesOwnedRosterProjectionRequested: true, teamGame: false, armyCompositionUpgradeAuditsBySide: audits });
  return { audits, registry, cards: Object.fromEntries(['player1', 'player2'].map(side =>
    [side, createOfficialRoomCardResourcesV1(context.dataset, registry, side)])) };
};
const definitions = inventory.definitions.filter(row => /\/zerg-creep-any@2$/u.test(row.definitionId));
assert.equal(definitions.length, 3);
assert.deepEqual(definitions.map(row => row.definitionId), scope.definitionIds);
const sourceHeldDefinitions = inventory.definitions.filter(row => row.sourceHolds.length > 0);
assert.equal(sourceHeldDefinitions.length, 39);
assert.ok(sourceHeldDefinitions.every(row => !scope.sourceRecordKeys.includes(row.recordKey)));
const consumerRefs = [
  ['packages/source-data/official-army-builder-catalogue-v2.mjs', 'createOfficialArmyBuilderCatalogueV2'],
  ['packages/roster-strategist/army-builder-query-port-v1.mjs', 'createOfficialArmyBuilderQueryPortV1'],
  ['packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs', 'resolveOfficialArmySlotAuditV1'],
  ['packages/product-composition/official-faction-army-building-card-requirements-v1.mjs', 'validateOfficialFactionRequiredTacticalCardGroupsV1'],
  ['packages/product-composition/official-standard-room-factory-v1.mjs', 'buildOfficialRoomArmyAuditV1'],
  ['packages/source-data/official-roster-disclosure-data-bundle-v1.mjs', 'createOfficialRoomRosterDisclosureDataBundleV1'],
  ['packages/rule-atoms/official-roster-disclosure-rules-kernel-v1.mjs', 'resolveOfficialRosterRegistryAuditV1'],
  ['packages/product-composition/official-standard-room-factory-v1.mjs', 'createOfficialRoomCardResourcesV1'],
].map(([file, exportName]) => ({ file, exportName }));
for (const { file, exportName } of consumerRefs) {
  assert.match(await fs.readFile(path.join(root, file), 'utf8'), new RegExp('export function ' + exportName + '\\('));
}
const creepKeys = ['accelerating_creep', 'malignant_creep', 'reactive_creep'].map(id => 'tactical_cards:' + id);
const results = [];
const savedCases = [];
for (const definition of definitions) {
  const factionRecordKey = definition.recordKey;
  const menu = port.enumerateArmyBuildingChoices({ factionRecordKey, scaleId: 'Standard', mineralBudget: 2000 });
  assert.deepEqual(menu.catalogueSelection, builder.catalogueSelection);
  assert.equal(menu.releaseBinding.manifestHash, manifest.manifestHash);
  const constraint = menu.armyBuildingConstraints.find(row => row.kind === 'exactly_one_tactical_group'
    && row.factionRecordKey === factionRecordKey);
  const feature = dataset.recordsByKey[factionRecordKey].payload.boosts.find(row => row.name === 'Zerg Creep');
  assert.equal(constraint.sourceDefinitionHash, hash(feature));
  assert.equal(officialAbilitySourceFeatureHashV1(dataset.recordsByKey[factionRecordKey], definition.sourceRef.index, feature),
    definition.sourceRef.sourceFeatureHash);
  assert.equal(compiled.identities.definitions.find(row => row.definitionId === definition.definitionId).sourceFeatureHash,
    definition.sourceRef.sourceFeatureHash);
  assert.deepEqual(constraint.recordKeys, creepKeys);
  const unit = menu.unitCandidates.find(row => row.recordKey === 'army_units:zergling');
  assert.ok(unit, 'EXISTING_ZERGLING_MUST_BE_ELIGIBLE:' + factionRecordKey);
  const candidate = (sideKey, cards) => ({ sideKey, scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey, tacticalCardRecordKeys: cards,
    units: [{ unitInstanceId: sideKey + '-unit', recordKey: unit.recordKey, compositionKind: 'small', upgrades: [] }] });
  const eligible = creepKeys.filter(key => menu.tacticalCandidates.some(row => row.recordKey === key));
  assert.ok(eligible.length >= 1);
  const legal = eligible.map(recordKey => {
    const player1 = candidate('player1', [recordKey]);
    const player2 = candidate('player2', [eligible[0]]);
    const verdict = port.evaluateRosterCandidate(player1);
    assert.equal(verdict.status, 'legal');
    const cost = dataset.recordsByKey[recordKey].payload.cost;
    assert.equal(menu.tacticalCandidates.find(row => row.recordKey === recordKey).vespeneGasCost, cost);
    assert.equal(verdict.summary.vespeneSpent, cost);
    const result = registryFor(context, { player1, player2 });
    assert.deepEqual(result.audits.player1, verdict.audit, 'FACTORY_MUST_REEVALUATE_THE_SAME_NATIVE_CANDIDATE');
    const opposingVerdict = port.evaluateRosterCandidate(player2);
    assert.equal(opposingVerdict.status, 'legal');
    assert.equal(opposingVerdict.summary.vespeneSpent, dataset.recordsByKey[eligible[0]].payload.cost);
    assert.deepEqual(result.audits.player2, opposingVerdict.audit);
    for (const [side, sourceKey] of [['player1', recordKey], ['player2', eligible[0]]]) {
      const selected = result.cards[side].filter(row => creepKeys.includes(row.officialCardRecordKey));
      assert.equal(selected.length, 1);
      assert.equal(selected[0].officialCardRecordKey, sourceKey);
      assert.equal(selected[0].sourceRecordHash, dataset.recordsByKey[sourceKey].sourceRecordHash);
      assert.equal(selected[0].officialPayloadHash, dataset.recordsByKey[sourceKey].payloadHash);
    }
    savedCases.push({ candidatesBySide: { player1, player2 }, expected: result });
    return { recordKey, vespeneSpent: cost, menuReceiptHash: menu.receiptHash,
      auditHash: verdict.auditResultHash, registryHash: hash(result.registry) };
  });
  const illegal = [[], [eligible[0], creepKeys.find(key => key !== eligible[0])], [eligible[0], eligible[0]]].map(cards => {
    const own = candidate('player1', cards);
    const verdict = port.evaluateRosterCandidate(own);
    assert.equal(verdict.status, new Set(cards).size === cards.length ? 'illegal' : 'unknown');
    assert.throws(() => factoryAudit(context, own), /FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID/);
    assert.throws(() => registryFor(context, { player1: own, player2: candidate('player2', [eligible[0]]) }),
      /FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID/);
    return { cards, builderStatus: verdict.status, rejectionKind: verdict.rejectionKind, rulesErrorCode: verdict.rulesErrorCode,
      otherOwnerCardCannotSatisfyOwnRequirement: true };
  });
  const ineligible = creepKeys.filter(key => !eligible.includes(key)).map(recordKey => {
    const own = candidate('player1', [recordKey]);
    const verdict = port.evaluateRosterCandidate(own);
    assert.equal(verdict.status, 'illegal');
    assert.equal(verdict.rulesErrorCode, 'FACTION_TAG_MISMATCH');
    assert.throws(() => factoryAudit(context, own), /STANDARD_ROOM_NATIVE_CANDIDATE_REJECTED/);
    return { recordKey, rulesErrorCode: verdict.rulesErrorCode };
  });
  assert.throws(() => registryFor(context, { player1: candidate('player1', [eligible[0]]),
    player2: candidate('player2', []) }), /FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID/);
  results.push({ definitionId: definition.definitionId, sourceFeatureHash: definition.sourceRef.sourceFeatureHash,
    constraintSourceDefinitionHash: constraint.sourceDefinitionHash,
    newAtoms: 0, classification: definition.classification, legal, illegal, ineligible,
    opposingOwnerMissingRejected: true });
}
await save(builderRef, builder);
await save(WAVE4_CREEP_BUILDER_DIRECTORY + '/release-manifest.json', manifest);
await save(runRef + '/army-builder.json', builder);
await save(runRef + '/release-manifest.json', manifest);
await save(runRef + '/rosters.json', savedCases);
// A fresh release resolver reloads the original complete source and verifies the
// persisted component hash. No cached compiler object survives this boundary.
const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
try {
  const resolver = createOfficialReleaseResolverV2({ store,
    loadArtifact: async ref => freezeArmyBuilderReleaseValueV2(await read(ref)) });
  resolver.register(await read(runRef + '/release-manifest.json'));
  const reopened = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'army_building' });
  await assert.rejects(() => resolver.resolve({ releaseId: manifest.releaseId, purpose: 'battle' }),
    /OFFICIAL_RELEASE_COMPONENTS_MISSING/);
  assert.deepEqual(reopened.resources.armyBuilder, builder);
  for (const saved of await read(runRef + '/rosters.json')) {
    assert.deepEqual(registryFor(reopened, saved.candidatesBySide), saved.expected);
  }
  assert.deepEqual(portFor(reopened).portDescriptor(), port.portDescriptor());
} finally { store.close(); }
const evidence = { schema: 'starcraft_tmg_wave4_creep_builder_evidence_v1', status: 'passed',
  runRef, releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
  datasetHash: dataset.datasetHash, sourceSnapshotHash: snapshot.snapshotHash,
  builderHash: builder.bundleHash, catalogueSelection: builder.catalogueSelection,
  scopeRef: WAVE4_CREEP_BUILDER_SCOPE_REF, scopeHash: scope.scopeHash,
  definitions: results, consumerRefs, legalRosters: savedCases.length, coldImportedRosters: savedCases.length,
  negativeCases: results.reduce((sum, row) => sum + row.illegal.length + row.ineligible.length + 1, 0),
  nativeFactoryArmyAudits: true, rosterRegistryAndRoomCardResources: true,
  battlePurposeAdmissionRejected: true,
  fullRoomOpening: false, webUiAcceptance: false, fullWave4Admission: false,
  newGameAtoms: 0, sourceHeldDefinitions: sourceHeldDefinitions.length, wave3BuilderByteEquivalent: true, baselineCommit,
  wave3PlayerRoomsTouched: false, modelCalls: 0, trainingTruth: false };
await save(runRef + '/result.json', evidence);
await save('docs/development/wave4/evidence/creep-builder.public.json', evidence);
console.log(JSON.stringify({ status: evidence.status, definitions: results.length,
  legalRosters: evidence.legalRosters, coldImportedRosters: evidence.coldImportedRosters,
  selectedRecords: 94, sourceRecords: 119, fullRoomOpening: false, runRef }));
