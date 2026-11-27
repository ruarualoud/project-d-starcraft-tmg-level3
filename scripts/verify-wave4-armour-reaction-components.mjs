import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4AbilityDiff, WAVE4_ABILITY_DIRECTORY } from './compile-wave4-ability-diff.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 }
  from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialReactionFamilySourceBundleV2, openOfficialReactionFamilyWindowV1,
  projectOfficialReactionFamilyResolutionV1 } from '../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { loadWave3HumanMatchSetupsV1, loadWave3MatchBoardFactoryV1, wave3HumanMapConfiguration }
  from '../packages/product-composition/wave3-human-match-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialStandardActionRouteCatalogueV1 }
  from '../packages/product-composition/official-standard-action-route-catalogue-v1.mjs';
import { createOfficialReleaseCardCatalogueV2 } from '../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const parent = path.join(root, 'build/wave4-web/armour-reaction-components');
await fs.mkdir(parent, { recursive: true });
const { inventory, identities, dataset, snapshot, manifest } = await compileWave4AbilityDiff(root);
const sourcePhasePolicy = createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true });
const context = { manifest, dataset, snapshot, resources: { abilityIdentities: identities } };
const source = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities,
  sourceDefinitionIds: inventory.timingReactionDefinitionIds, sourcePhasePolicy });
const all = createOfficialReactionFamilySourceBundleV2({ catalogue: source, definitionIds: inventory.timingReactionDefinitionIds });
const specs = all.routes.filter(row => row.triggerKind === 'before_armour_roll');
assert.equal(specs.length, 7);
const setups = await loadWave3HumanMatchSetupsV1(root);
const seeds = {};
for (const scale of ['Skirmish', 'Standard']) {
  const seedFile = path.join(parent, 'factory-' + scale + '.json');
  try { seeds[scale] = JSON.parse(await fs.readFile(seedFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const setup = { ...setups.find(row => row.scale === scale), version: '2.99.12' };
    const factory = await loadWave3MatchBoardFactoryV1({ root, setup });
    const recipes = scale === 'Standard'
      ? (await read('build/ticket-28-wave3-mixed-support-opening/sentry/opening.json')).recipes
      : Object.fromEntries(setup.presets.map((preset, i) => ['player' + (i + 1), preset.recipe]));
    const prepared = factory.prepare({ roomId: 'wave4-component-source-' + scale, recipes,
      mapConfiguration: wave3HumanMapConfiguration(setup) });
    seeds[scale] = { factory: 'loadWave3MatchBoardFactoryV1.prepare', setup,
      sourceDatasetHash: factory.datasetHash, state: prepared.state };
    await atomicWrite(seedFile, JSON.stringify(seeds[scale]));
  }
}
const run = await fs.mkdtemp(path.join(parent, 'run-'));
const results = [];
for (const spec of specs) {
  const scale = spec.requiredTargetTag === 'mechanical' || spec.requiredTargetTags ? 'Standard' : 'Skirmish';
  const seed = seeds[scale];
  const prototype = seed.state.pieces.find(piece => {
    const tags = new Set(piece.combatTags || []);
    return (!spec.requiredTargetTag || tags.has(spec.requiredTargetTag))
      && (!spec.requiredTargetTags || spec.requiredTargetTags.every(tag => tags.has(tag)));
  });
  assert.ok(prototype, 'SOURCE_FACTORY_TARGET_REQUIRED:' + spec.definitionId);
  const oldDataset = await read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json');
  assert.equal(dataset.recordsByKey[prototype.officialUnitRecordKey].payloadHash,
    oldDataset.recordsByKey[prototype.officialUnitRecordKey].payloadHash);
  const target = structuredClone(prototype);
  target.id = 'target'; target.sideKey = 'player2'; target.isOnField = true;
  target.isInReserves = false; target.isDestroyed = false;
  target.statuses = [...(target.statuses || []), 'shielded'];
  target.models.forEach(model => { model.isOnField = true; model.isDestroyed = false; });
  const cardRecord = dataset.recordsByKey[spec.recordKey];
  const card = { cardInstanceId: 'source-card', officialCardRecordKey: spec.recordKey,
    sourceRecordHash: cardRecord.sourceRecordHash, officialPayloadHash: cardRecord.payloadHash, readiness: 'ready' };
  const caseSource = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities,
    sourceDefinitionIds: [spec.definitionId], sourcePhasePolicy });
  const bundle = createOfficialReactionFamilySourceBundleV2({ catalogue: caseSource, definitionIds: [spec.definitionId] });
  const declared = { round: 1, phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1',
    engagementScale: seed.state.engagementScale, board: structuredClone(seed.state.board),
    officialModelBaseGeometryDataBundle: seed.state.officialModelBaseGeometryDataBundle,
    officialModelGapTransitPolicy: seed.state.officialModelGapTransitPolicy,
    officialTerrainLosDataBundle: seed.state.officialTerrainLosDataBundle,
    officialCardBuildPaymentDataBundle: createOfficialReleaseCardCatalogueV2({ context,
      legacyCardDataBundle: seed.state.officialCardBuildPaymentDataBundle }),
    pieces: [target], cardResources: { player1: [], player2: [card] }, log: [],
    officialReactionFamilySourceBundle: bundle, officialAbilitySourcePhasePolicy: sourcePhasePolicy };
  declared.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset, state: declared });
  const input = { triggerKind: 'before_armour_roll', activeSideKey: 'player1', phase: declared.phase,
    activationId: '1:assault:declared-attacker', sourceActionHash: hash({ scenario: spec.definitionId, source: 'declared_armour_roll' }),
    context: { targetPieceId: target.id, affectedPieceId: target.id } };
  const opened = openOfficialReactionFamilyWindowV1(bundle, declared, input);
  const state = refreshOfficialReleaseRosterDerivedStateV2({ context, state: opened.state });
  const triggerHash = state.pendingOfficialReactionWindow.triggerHash;
  const runtimeFor = () => createOfficialCharacteristicStatusComponentRuntimeV2({ context,
    spatialState: state, definitionIds: [], sourceDefinitionIds: [spec.definitionId] });
  const runtime = runtimeFor();
  assert.equal(runtime.catalogue.denominator.totalDefinitions, 1);
  assert.equal(runtime.catalogue.denominator.executableExact, 1);
  assert.equal(runtime.descriptor.productionRoomEligible, false);
  const release = createOfficialReleaseManifestV2({ releaseId: 'wave4-armour-component-' + spec.recordKey.split(':')[1] + '-v1',
    dataset, snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
    datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
    sourceRevisionRef: manifest.source.sourceRevisionRef, sourcePolicy: manifest.source.policy,
    components: { abilityIdentities: { ref: `${WAVE4_ABILITY_DIRECTORY}/identity-catalogue.json`, version: '2',
      integrity: { field: 'identityCatalogueHash', value: identities.identityCatalogueHash } },
      rulesRuntime: { ref: 'component-runtime/' + runtime.descriptor.runtimeHash,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
  const boundContext = { ...context, manifest: release };
  const authority = createWave3ComponentEngineeringAuthorityV1({ context: boundContext, state,
    scenario: { kind: 'declared_reaction_trigger_component', sourceFactory: seed.factory,
      sourceSetupId: seed.setup.id, unchangedUnitRecordKey: prototype.officialUnitRecordKey,
      factScope: 'factory unit facts and explicit armour trigger; no claim of legal mixed-faction roster or attack-owner integration' } });
  const directory = path.join(run, spec.recordKey.split(':')[1]);
  await fs.mkdir(directory, { recursive: true });
  await atomicWrite(path.join(directory, 'authority.json'), JSON.stringify(authority));
  const roomId = 'wave4-reaction-' + spec.recordKey.split(':')[1];
  let native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: boundContext, runtime }) });
  let credentials;
  let expected;
  try {
    credentials = await native.create(roomId, authority);
    const initialMenu = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
    assert.equal(initialMenu.ok, true);
    const finitePass = initialMenu.legalSpace.finiteActions.find(row => row.action.actionType === 'pass_reaction_family_window');
    await native.commit({ roomId, credential: credentials.player1, operationKey: 'active-player-pass',
      kind: finitePass ? 'finite' : 'parameterized',
      select: row => (row.action?.actionType || row.actionType) === 'pass_reaction_family_window',
      parameters: () => ({}) });
    const legal = await native.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
    assert.equal(legal.ok, true);
    const domain = legal.legalSpace.parameterDomains.find(row => row.definitionId === spec.definitionId
      || row.sourceDomain?.definitionId === spec.definitionId);
    assert.ok(domain, 'NEW_REVISION_MENU_REQUIRED:' + spec.definitionId);
    const committed = await native.commit({ roomId, credential: credentials.player2, operationKey: 'use-new-revision',
      select: row => row.domainId === domain.domainId, parameters: row => {
        const schema = row.sourceDomain?.parameterSchema || row.parameterSchema;
        return Object.fromEntries(schema.required.map(key => {
          const property = schema.properties?.[key] || schema[key];
          if (property && Object.hasOwn(property, 'const')) return [key, structuredClone(property.const)];
          assert.ok(property?.enum?.length, 'SOURCE_PARAMETER_ENUM_REQUIRED:' + key);
          return [key, property.enum[0]];
        }));
      } });
    assert.equal(committed.idempotentReplayVerified, true);
    expected = await native.store.loadRoom(roomId);
    const projection = projectOfficialReactionFamilyResolutionV1(expected.envelope.state, triggerHash);
    assert.ok(projection);
    assert.equal(projection.tough, spec.tough || 0); assert.equal(projection.dodge, spec.dodge || 0);
    assert.equal(expected.envelope.state.cardResources.player2[0].readiness, 'exhausted');
    assert.equal(expected.envelope.state.activeSideKey, 'player1');
    const replay = await native.room.replayRoom({ roomId, seatToken: credentials.player1.seatToken });
    assert.equal(replay.ok, true); assert.equal(replay.matchesCurrent, true);
    results.push({ definitionId: spec.definitionId, scale, sourceSetupId: seed.setup.id,
      triggerScope: 'declared_armour_roll_component', nativeRevisions: expected.stateRevision,
      tough: projection.tough, dodge: projection.dodge, cardExhausted: true,
      parentActiveSideRestored: true, idempotentReplay: true, stateHash: expected.envelope.stateHash,
      fullAttackOwnerVerified: false, fullMatchAdmission: false });
  } finally { native.close(); }
  native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: boundContext, runtime: runtimeFor() }) });
  try {
    await native.restoreDependencies(roomId, authority);
    const restored = await native.store.loadRoom(roomId);
    assert.equal(restored.envelope.stateHash, expected.envelope.stateHash);
    const replay = await native.room.replayRoom({ roomId, seatToken: credentials.player2.seatToken });
    assert.equal(replay.ok, true); assert.equal(replay.matchesCurrent, true);
    results.at(-1).coldReplayMatched = true;
  } finally { native.close(); }
  console.log('passed component ' + spec.definitionId);
}
const report = { schema: 'starcraft_tmg_wave4_armour_reaction_components_v1', status: 'passed',
  inventoryHash: inventory.inventoryHash, definitionsVerified: results.length,
  scales: [...new Set(results.map(row => row.scale))], results,
  scope: 'exact-source reaction components from declared triggers; full native attack producers, other four timing revisions and Web remain separate gates',
  implementedNewAtoms: 0, modelCalls: 0, trainingTruth: false, productionPromoted: false };
await atomicWrite(path.join(parent, 'result.public.json'), JSON.stringify(report, null, 2) + '\n');
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/armour-reaction-components.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
