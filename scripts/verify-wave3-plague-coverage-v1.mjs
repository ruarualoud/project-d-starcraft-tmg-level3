import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/plague-coverage/';
const directory = path.join(root, prefix), roomId = 'wave3-plague-coverage', releaseId = roomId + '-v1';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const oldRef = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-phase-scope/combat/';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [] });
const query = (runtime, state, extra = {}) => runtime.query(state, { queryKind: 'plague_template_coverage',
  sourcePieceId: 'defiler', coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: 1, ...extra });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sceneFor(context, { purchased = true, enabled = true, withMarine = false } = {}) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const template = (await read('build/ticket-28-wave2-capabilities-20261113-v1/tank-template-attack/authority.json')).state.officialBlastTemplateGeometryAsset;
  const unit = (id, key, upgrades = []) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context, includePlagueCoverage: enabled, includeGestateDarkSwarm: true,
    blastTemplateGeometryAsset: template, legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', purchased ? [{ upgradeName: 'Plague' }] : []), unit('ally', 'defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory', 'tactical_cards:factory__tech_lab_'],
        units: [unit('enemy', 'goliath'), unit('secondary', 'goliath'), ...(withMarine ? [unit('marines', 'marine')] : [])] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'defiler'), 12, 26);
  const actorRadius = piece(state, 'ally').models[0].baseWidthInches / 2;
  const enemyRadius = piece(state, 'enemy').models[0].baseWidthInches / 2;
  arrange(piece(state, 'ally'), 20 - actorRadius - enemyRadius - 0.1, 26);
  arrange(piece(state, 'enemy'), 20, 26); arrange(piece(state, 'secondary'), 22.5, 28.5);
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { declaredPositionsAndMovementStart: true, conditionalPlagueQueryOnly: true,
    partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state), runtimeRef = await save('runtime.json', runtime.descriptor);
  const product = registry(), m = context.manifest;
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    await save('authority.json', createWave3ComponentEngineeringAuthorityV1({ context: bound, ...scene }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  try {
    const authority = await read(prefix + 'authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { ...product, authority, context, runtime, native, close() { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
function terrain(state, id, size, bounds, surface = false) {
  const value = createOfficialTerrainPieceV1({ id, terrainKind: 'ordinary', size,
    footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: bounds[0], maxXMilliInches: bounds[1],
      minYMilliInches: bounds[2], maxYMilliInches: bounds[3] }, standableHorizontalSurface: surface });
  state.board.terrain = [{ ...value, terrainId: id, elevationSurface: surface, isRemoved: false,
    accessPoints: [], openings: [], blocksPlacement: false }];
  state.board.terrainElevationAgreement = createOfficialTerrainElevationAgreementV1({ supportRelations: [] });
  state.board.accessPoints = [];
}
async function checkpoint(native) {
  const current = await native.store.loadRoom(roomId);
  await save('checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope }); return current;
}
async function verifySupplementaryFacts(product) {
      const before = await product.native.store.loadRoom(roomId), state = before.envelope.state;
      const high = structuredClone(state);
      terrain(high, 'declared-high', 3, [15000, 18400, 24000, 28000], true);
      Object.assign(piece(high, 'ally').models[0], { elevation: 'high', supportTerrainIds: ['declared-high'] });
      arrange(piece(high, 'defiler'), 25, 26);
      const elevated = query(product.runtime, high, { coordinate: { xMilliInches: 16750, yMilliInches: 26000 } });
      assert.equal(elevated.pointSurface.elevation, 'high');
      assert(elevated.batches.some(row => row.targetPieceId === 'ally'));
      assert(!elevated.batches.some(row => row.targetPieceId === 'enemy'));
      await save('supplementary-high.json', { elevated, highTargetPointPositiveAndGroundExclusion: true });
      const scene = await sceneFor(product.context, { withMarine: true });
      arrange(piece(scene.state, 'ally'), 6, 30); arrange(piece(scene.state, 'enemy'), 30, 30);
      arrange(piece(scene.state, 'secondary'), 36, 30);
      const marine = piece(scene.state, 'marines');
      assert.equal(marine.models.length, 6, 'small Marine composition must come from the frozen roster');
      const step = marine.models[0].baseWidthInches + 0.1;
      arrange(marine, 20, 26);
      marine.models.forEach((model, i) => Object.assign(model, {
        xInches: Math.round((20 + (i ? Math.cos((i - 1) * 2 * Math.PI / 5) * step : 0)) * 1000) / 1000,
        yInches: Math.round((26 + (i ? Math.sin((i - 1) * 2 * Math.PI / 5) * step : 0)) * 1000) / 1000 }));
      declareCoherency(scene.state);
      const many = query(runtimeFor(product.context, scene.state), scene.state);
      const batch = many.batches.find(row => row.targetPieceId === 'marines');
      assert.equal(batch.coveredModelIds.length, 6); assert.equal(batch.dice, 8);
      assert.deepEqual(await product.native.store.loadRoom(roomId), before);
      const ref = await save('supplementary-facts.json', { elevated, many,
        sixActualModelsEightDice: true, highTargetPointPositiveAndGroundExclusion: true,
        originalAggregateUnchanged: true, flyingStillMissingPhysicalFootprint: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r2.json' };
}

async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Plague-Conditional-Coverage-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.120.0');
      assert.equal(runtime.descriptor.plagueCoverageQuery.executableAbilityRegistered, false);
      const faq = await read('build/ticket-28-wave3-faq-delta-20261112-v1/current-index.json');
      assert.equal(hash(faq.entries.find(row => row.ordinal === 94).answer), scene.state.officialPlagueCoverageSourceBundle.faqSource.templateClauseTextHash);
      assert.equal(faq.entries.find(row => row.ordinal === 60).answer, 'Yes.');
      const old = await read(oldRef + 'authority.json');
      const descriptor = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: old.state,
        definitionIds: [], includeRanged: true, includeMelee: true, includeTargetReactions: true,
        includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true }).descriptor;
      assert.deepEqual(descriptor, await read(oldRef + 'runtime.json'));
      const disabled = await sceneFor(context, { enabled: false });
      assert.equal(disabled.state.officialPlagueCoverageSourceBundle, undefined);
      assert.equal(runtimeFor(context, disabled.state).descriptor.plagueCoverageQuery, undefined);
      await registerScene(context, scene);
      const ref = await save('compile.json', { runtime: runtime.descriptor, source: scene.state.officialPlagueCoverageSourceBundle,
        oldRuntimeVersion: descriptor.runtimeVersion, exactOldDescriptor: true, explicitOptIn: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      await product.native.create(roomId, product.authority); const before = await checkpoint(product.native), state = before.envelope.state;
      const result = query(product.runtime, state);
      assert.deepEqual(result.batches.map(row => row.targetPieceId), ['ally', 'enemy', 'secondary']);
      assert(result.batches.every(row => row.dice === 3 && row.hitThreshold === 5 && row.casualtiesFromThisAbility === 0));
      assert.equal(result.targetPointFootprint.radiusMilliInches, 0);
      assert.equal(result.abilityTimingValidated, false); assert.equal(result.paymentCommitted, false);
      assert.equal(result.finalDamageAfterEvadeEvaluated, false);
      for (const biomass of [1, 2, 3]) {
        const value = query(product.runtime, state, { biomassToSpend: biomass });
        assert(value.batches.every(row => row.hitThreshold === 6 - biomass));
        assert.equal(value.payment.resourceCost, biomass);
        assert(value.payment.consumeCardPayments.every(row => row.payment.resourceCost === biomass - 1));
      }
      const edge = structuredClone(state), radius = piece(edge, 'defiler').models[0].baseWidthInches * 500;
      const x = 12000 + radius + 10000 - result.templateFootprint.radiusMilliInches;
      query(product.runtime, edge, { coordinate: { xMilliInches: x, yMilliInches: 26000 } });
      assert.throws(() => query(product.runtime, edge, { coordinate: { xMilliInches: x + 2, yMilliInches: 26000 } }), /NOT_WHOLLY_WITHIN_RANGE/);
      assert.throws(() => query(product.runtime, edge, { coordinate: { xMilliInches: 12000, yMilliInches: 1000 } }), /OUTSIDE_BOARD/);
      for (const extra of [{ biomassToSpend: 0 }, { biomassToSpend: 4 }, { stateHash: 'invented' },
        { coordinate: { xMilliInches: 20000, yMilliInches: 26000, elevation: 'high' } }]) assert.throws(() => query(product.runtime, state, extra), /PLAGUE_QUERY/);
      const absent = await sceneFor(product.context, { purchased: false });
      assert.throws(() => query(runtimeFor(product.context, absent.state), absent.state), /ABILITY_NOT_SELECTED/);
      const high = structuredClone(state);
      terrain(high, 'declared-high', 3, [15000, 18400, 24000, 28000], true);
      Object.assign(piece(high, 'ally').models[0], { elevation: 'high', supportTerrainIds: ['declared-high'] });
      arrange(piece(high, 'defiler'), 25, 26);
      const elevated = query(product.runtime, high);
      assert(!elevated.batches.some(row => row.targetPieceId === 'ally'));
      assert(elevated.assessments.find(row => row.pieceId === 'ally').reasons.includes('different_elevation'));
      const wall = structuredClone(state);
      terrain(wall, 'declared-wall', 2, [18500, 18800, 21500, 30500]);
      assert.throws(() => query(product.runtime, wall), /LINE_OF_SIGHT_REQUIRED/);
      const split = structuredClone(state);
      terrain(split, 'coverage-wall', 2, [20900, 21100, 25000, 30500]);
      const occluded = query(product.runtime, split);
      assert(!occluded.batches.some(row => row.targetPieceId === 'secondary'));
      assert(occluded.assessments.find(row => row.pieceId === 'secondary').reasons.includes('size_two_plus_terrain'));
      assert.deepEqual(await product.native.store.loadRoom(roomId), before);
      const ref = await save('consume.json', { result, elevated, occluded, exactWholeTemplateRangeBoundary: true,
        oneToThreeBiomass: true, missingUpgradeAndForgedFieldsRejected: true, originalAggregateUnchanged: true,
        notAnActualPlagueCast: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r0.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'actual-dark-token',
        select: row => row.actionType === 'set_dark_swarm' && row.pieceId === 'defiler',
        parameters: () => ({ coordinate: { xMilliInches: 14000, yMilliInches: 28600 } }) }); await checkpoint(product.native);
      await product.native.commit({ roomId, credential: credentials.player1, operationKey: 'actual-finish',
        select: row => row.actionType === 'finish_activation', parameters: () => ({}) });
      const current = await checkpoint(product.native);
      assert.equal(current.envelope.state.pieces.find(row => row.id === 'defiler').activatedPhases.movement, true);
      assert.equal(current.envelope.state.activeSideKey, 'player2');
      const result = query(product.runtime, current.envelope.state);
      assert.deepEqual(result.batches, (await read(prefix + 'consume.json')).result.batches);
      assert(!product.runtime.enumerate(current.envelope.state).parameterDomains.some(row => /plague/i.test(row.actionType)));
      const ref = await save('successor.json', { actualRevision: current.stateRevision, result,
        actualTokenThenFinish: true, plagueActionNotFalselyPublished: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r2.json' };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.create(roomId, product.authority);
      const current = await product.native.store.loadRoom(roomId), bundle = await product.native.store.loadReplayBundle(roomId);
      assert.deepEqual(current.envelope, (await read(prefix + 'checkpoint-r2.json')).envelope);
      assert.deepEqual(query(product.runtime, current.envelope.state), (await read(prefix + 'successor.json')).result);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      for (let i = 0; i <= receipts.length; i++) {
        const replayed = product.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
        assert.equal(replayed.ok, true, JSON.stringify(replayed));
        assert.deepEqual(replayed.envelope, (await read(prefix + 'checkpoint-r' + i + '.json')).envelope);
      }
      const old = await read(oldRef + 'authority.json');
      product.resolver.register(old.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: old.releaseId, purpose: 'area_ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: old.state, definitionIds: [],
        includeRanged: true, includeMelee: true, includeTargetReactions: true, includePrecisionChoices: true,
        includeArmourChoices: true, includeArmourReactions: true });
      const sourcePath = path.join(root, oldRef, 'room.sqlite'), originalHash = hash(await fs.readFile(sourcePath));
      const copy = path.join(directory, 'old-combat.sqlite');
      if (!await cached('old-copy.json')) { await fs.copyFile(sourcePath, copy, fs.constants.COPYFILE_EXCL); await save('old-copy.json', { originalHash }); }
      const native = openWave3EngineeringRoomV1({ directory, filename: 'old-combat.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let oldReceipts;
      try {
        const id = 'wave3-dark-swarm-phase-combat'; await native.restoreDependencies(id, old);
        const replay = await native.store.loadReplayBundle(id);
        oldReceipts = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let i = 0; i <= oldReceipts.length; i++) {
          const result = native.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: oldReceipts.slice(0, i) });
          assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, (await read(oldRef + 'checkpoint-r' + i + '.json')).envelope);
        }
      } finally { native.close(); }
      assert.equal(hash(await fs.readFile(sourcePath)), originalHash);
      const ref = await save('cold-recovery.json', { currentReceipts: receipts.length, currentCheckpoints: receipts.length + 1,
        oldReceipts: oldReceipts.length, oldCheckpoints: oldReceipts.length + 1,
        exactQueryAfterReopen: true, exactAllPrefixes: true, originalArtifactsUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },

  ] });
  if (!await cached('supplementary-facts.json')) {
    const product = await openProduct();
    try { await verifySupplementaryFacts(product); } finally { product.close(); }
  }
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, supplementaryFacts: 'passed', modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
