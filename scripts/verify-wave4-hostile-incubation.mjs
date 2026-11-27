import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4HostileIncubation, HOSTILE_DIRECTORY } from './compile-wave4-hostile-incubation.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { bindOfficialSpawnRoundAbilityLockV1, allowsOfficialSpawnRoundSpecialAbilityV1,
  verifyOfficialSpawnRoundAbilityLockPolicyV1 } from '../packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs';
import { createOfficialStructureSourceV1 } from '../packages/source-data/official-structure-source-v1.mjs';
import { createOfficialStructureFamilyAdapterV1 } from '../packages/product-composition/official-structure-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusFamilySourceBundleV2, createOfficialCharacteristicStatusFamilyDefinitionBindingsV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialBattlefieldAssetFamilySourceBundleV2, createOfficialBattlefieldAssetFamilyDefinitionBindingsV1 } from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import { createOfficialUnitLifecycleFamilyDefinitionBindingsV1 } from '../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialGeneratedUnitDataBundleV2 } from '../packages/source-data/official-generated-unit-data-bundle-v2.mjs';
import { createOfficialAttackProfileCatalogueV3 } from '../packages/source-data/official-attack-profile-catalogue-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await compileWave4HostileIncubation(root);
const { context, dataset, catalogue, lifecycle, scope } = inputs;
const parent = path.join(root, 'build/wave4-web/hostile-incubation');
await fs.mkdir(parent, { recursive: true });
const run = await fs.mkdtemp(path.join(parent, 'run-'));
const runRef = path.relative(root, run);
const save = (ref, value) => atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
for (const [name, value] of Object.entries({ ...inputs.artifacts, lifecycle, 'release-manifest': context.manifest })) {
  await save(HOSTILE_DIRECTORY + '/' + name + '.json', value);
}
assert.equal(catalogue.definitions.length, 7);
assert.equal(catalogue.definitionSelection.sourceDefinitionCount, 556);
assert.equal(scope.sourceRecordKeys.length, 102);
assert.equal(inputs.inventory.definitions.filter(row => row.sourceHolds.length).length, 39);
assert.ok(inputs.inventory.definitions.filter(row => row.sourceHolds.length).every(row => !scope.sourceRecordKeys.includes(row.recordKey)));
const route = lifecycle.routes[0];
const policy = route.spawnRoundAbilityLockPolicy;
assert.equal(route.effectKind, 'set_special_unit');
assert.equal(route.minimumEnemyGapMilliInchesExclusive, 10000);
assert.equal(route.groundLevelRequired, true);
assert.equal(route.removeAtRoundEnd, false);
assert.equal(policy.summonKeywordGranted, false);
const key = 'army_units:infested_missile_turret';
const record = dataset.recordsByKey[key];
const sourceId = suffix => 'unit:infested_missile_turret/' + suffix;
const structure = createOfficialStructureSourceV1({ catalogue, definitionIds: [sourceId('structure-any-phase@1')] });
const detection = createOfficialCharacteristicStatusFamilySourceBundleV2({ catalogue,
  definitionIds: [sourceId('detection-any-phase@1')] });
assert.equal(detection.routes[0].rangeMilliInches, 8000);
const creep = createOfficialBattlefieldAssetFamilySourceBundleV2({ catalogue,
  definitionIds: [sourceId('source-of-creep-any-phase@1')] });
assert.equal(creep.routes[0].rangeInches, 6);
// Source-fact contract only: no dimensions or positions are assigned, and no
// Room/envelope is created from this non-spatial object.
const piece = { id: 'source-fact-turret', sideKey: 'player1', officialUnitRecordKey: key,
  sourceRecordHash: record.sourceRecordHash, officialPayloadHash: record.payloadHash,
  isStructure: true, currentSupply: 0, currentModels: 1 };
const lock = bindOfficialSpawnRoundAbilityLockV1(piece, policy, 1);
assert.equal(bindOfficialSpawnRoundAbilityLockV1(piece, policy, 1).lockHash, lock.lockHash);
const state = { round: 1, pieces: [piece], officialStructureSourceBundle: structure };
const names = record.payload.upgrades.map(feature => feature.name);
const structureAdapter = createOfficialStructureFamilyAdapterV1(structure);
const boundCatalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: inputs.identities,
  sourceDefinitionIds: scope.definitionIds, sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true }),
  executionBindings: [...createOfficialUnitLifecycleFamilyDefinitionBindingsV1(lifecycle),
    ...createOfficialCharacteristicStatusFamilyDefinitionBindingsV1(detection),
    ...creep.routes.map(route => ({ sourceFeatureHash: route.sourceFeatureHash, adapterId: 'official-battlefield-asset-family-adapter-v1', adapterVersion: '1.0.0', capability: route.runtimeRole })), ...structureAdapter.definitionBindings] });
assert.equal(boundCatalogue.denominator.executableExact, 4);
const checks = [];
for (const round of [1, 2]) {
  state.round = round;
  const abilities = Object.fromEntries(names.map(name => [name, allowsOfficialSpawnRoundSpecialAbilityV1(state, piece, name)]));
  for (const name of names) assert.equal(abilities[name], name === 'Structure' || round === 2);
  const constraints = structureAdapter.query(state, { pieceId: piece.id });
  assert.equal(constraints.constraints.activationProhibited, true);
  assert.equal(constraints.constraints.ordinaryActionsProhibited, true);
  assert.equal(constraints.constraints.currentSupplyReplacement, 0);
  assert.equal(constraints.constraints.missionControlProhibited, true);
  assert.equal(constraints.constraints.missionContestProhibited, true);
  checks.push({ round, abilities, structureQueryReceiptHash: constraints.queryReceiptHash });
}
const cold = JSON.parse(JSON.stringify(state));
assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(cold, cold.pieces[0], 'Detection'), true);
cold.round = 1;
cold.pieces[0].specialAbilitiesSuppressedUntilRoundEnd = false;
delete cold.pieces[0].structureRules.specialAbilitiesDisabledThroughRound;
assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(cold, cold.pieces[0], 'Detection'), false);
assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(cold, cold.pieces[0], 'Ocular Overwatch'), false);
assert.equal(allowsOfficialSpawnRoundSpecialAbilityV1(cold, cold.pieces[0], 'Structure'), true);
cold.pieces[0].officialSpawnRoundAbilityLock.spawnRound = 2;
assert.throws(() => allowsOfficialSpawnRoundSpecialAbilityV1(cold, cold.pieces[0], 'Structure'), /SPAWN_ROUND_LOCK_STATE_INVALID/);
assert.throws(() => bindOfficialSpawnRoundAbilityLockV1(piece, policy, 2), /REBIND_FORBIDDEN/);
const wrongPolicy = { ...policy, summonKeywordGranted: true };
const { policyHash, ...wrongBody } = wrongPolicy;
assert.throws(() => verifyOfficialSpawnRoundAbilityLockPolicyV1({ ...wrongBody, policyHash: hash(wrongBody) }), /POLICY_INVALID/);
const port = createOfficialArmyBuilderQueryPortV1({ releaseContext: context,
  unitCompositionUpgradeDataBundle: inputs.artifacts.armyBuilder });
const menu = port.enumerateArmyBuildingChoices({ factionRecordKey: 'tactical_cards:stukov_s_forces',
  scaleId: 'Standard', mineralBudget: 2000 });
assert.ok(!menu.unitCandidates.some(row => row.recordKey === key));
const supply = inputs.artifacts.unitCharacteristics.unitProfiles.find(row => row.recordKey === key);
assert.equal(supply.fieldableDuringArmyBuilding, false);
assert.equal(supply.factionTag, 'Zerg');
assert.equal(Number(record.payload.stats.size), 3);
assert.equal(supply.compositions[0].startingModels, 1);
assert.equal(supply.compositions[0].startingSupply, 0);
let geometryError;
try { createOfficialGeneratedUnitDataBundleV2({ context, recordKeys: [key] }); }
catch (error) { geometryError = error.message; }
assert.ok(geometryError?.includes(key) && geometryError.startsWith('MODEL_BASE_GEOMETRY_'), geometryError);
const candidate = sideKey => ({ sideKey, scaleId: 'Standard', mineralBudget: 2000,
  factionRecordKey: 'tactical_cards:stukov_s_forces', tacticalCardRecordKeys: ['tactical_cards:healing_pathogen'],
  units: [{ unitInstanceId: sideKey + '-goliath', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] });
assert.throws(() => createOfficialReleaseRosterStateV2({ context,
  candidatesBySide: { player1: candidate('player1'), player2: candidate('player2') }, sourceDefinitionIds: scope.definitionIds,
  unitLifecycleDefinitionIds: lifecycle.definitionIds, structureDefinitionIds: structure.definitionIds,
  includeAbilitySourcePhases: true }), error => error.message === geometryError);
let weaponError;
try { createOfficialAttackProfileCatalogueV3({ context, recordKeys: [key] }); }
catch (error) { weaponError = error.message; }
assert.match(weaponError, /OFFICIAL_ATTACK_SURGE_UNKNOWN:.*Light\. Armoured/u);
const consumerRefs = [
  ['packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs', 'createOfficialUnitLifecycleFamilySourceBundleV2'],
  ['packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs', 'createOfficialUnitLifecycleFamilyAdapterV1'],
  ['packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs', 'bindOfficialSpawnRoundAbilityLockV1'],
  ['packages/rule-atoms/official-spawn-round-ability-lock-v1.mjs', 'allowsOfficialSpawnRoundSpecialAbilityV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs', 'createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/product-composition/official-structure-family-adapter-v1.mjs', 'createOfficialStructureFamilyAdapterV1'],
  ['packages/product-composition/official-current-product-state-facts-v1.mjs', 'resolveOfficialCurrentProductSideCapabilityV1'],
  ['packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs', 'createOfficialBattlefieldAssetFamilySourceBundleV2'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs', 'createOfficialCharacteristicStatusFamilySourceBundleV2'],
  ['packages/product-composition/official-reaction-family-adapter-v1.mjs', 'createOfficialReactionFamilyAdapterV1'],
].map(([file, exportName]) => ({ file, exportName }));
for (const { file, exportName } of consumerRefs) assert.match(await fs.readFile(path.join(root, file), 'utf8'), new RegExp('export function ' + exportName + '\\('));
const result = { schema: 'starcraft_tmg_wave4_hostile_incubation_verification_v1', status: 'passed_with_admission_holds',
  runRef, candidateManifestHash: context.manifest.manifestHash, sourceDefinitionIds: scope.definitionIds,
  sourceSnapshotHash: dataset.sourceSnapshotHash, datasetHash: dataset.datasetHash, policyHash: policy.policyHash,
  atomId: policy.ruleAtomId, implementedNewGameAtoms: 3, nativeVerifiedNewGameAtoms: 2,
  selectedRecords: 102, sourceRecords: 119, sourceHeldDefinitions: 39, checks, consumerRefs,
  sourceBindings: { hostileIncubation: lifecycle.bundleHash, structure: structure.bundleHash,
    detection: detection.bundleHash, sourceOfCreep: creep.bundleHash },
  boundDefinitionCount: boundCatalogue.denominator.executableExact,
  unboundDefinitionIds: [sourceId('infestation-any-phase@1'), sourceId('firefly-missiles-assault-phase@1'), sourceId('ocular-overwatch-assault-phase@1')],
  coldLockReadVerified: true, cleanupCannotUnlockEarly: true, markerTamperRejected: true,
  generatedUnitArmyPurchaseRejected: true, geometryError, weaponError,
  nativePlacementVerified: false, turretFullGameplayVerified: false, fullMatchAdmission: false,
  webAcceptance: false, modelCalls: 0, trainingTruth: false };
await save(runRef + '/result.json', result);
await save('docs/development/wave4/evidence/hostile-incubation.public.json', result);
console.log(JSON.stringify({ status: result.status, implementedAtoms: 3, nativeVerifiedAtoms: 2,
  sourceDefinitions: 7, geometryError, weaponError, nativePlacementVerified: false }));
