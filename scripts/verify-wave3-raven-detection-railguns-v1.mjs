import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { runtimeFor as previousRuntimeFor } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialModelBaseFootprintV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const previous = 'build/ticket-28-terran-wave3-20261116-v1/holo-round-end/injured-place/';
const detectionId = 'unit:raven/detection-any-phase@1';
const weaponId = 'unit:raven/railguns-assault-phase@1';
const shadowsId = 'unit:zeratul/one-with-the-shadows-any-phase@1';
const mightId = 'card:nerazim/might-of-the-nerazim-any@1';
const specs = [{ id: 'flying-detection-use', useMight: true, gainInside: false },
  { id: 'gain-suppressed-pass', useMight: false, gainInside: true }];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-raven-basic-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const hidden = piece => (piece.statuses || []).some(row => String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'hidden');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: [weaponId], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true });
}
function projection(runtime, state, id) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: id }).result;
}
function radius(state, id) {
  const piece = pieceOf(state, id);
  return createOfficialModelBaseFootprintV1({ piece, model: piece.models[0],
    dataBundle: state.officialModelBaseGeometryDataBundle }).radiusMilliInches;
}
function moveParameters(state, id, x) {
  return { leadingModelId: pieceOf(state, id).models[0].id,
    path: [{ xMilliInches: x, yMilliInches: 10000 }], placements: [] };
}
async function makeScene(context, spec) {
  const base = (await read(previous + 'authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'raven', recordKey: 'army_units:raven', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'marine', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [
          { unitInstanceId: 'zeratul', recordKey: 'army_units:zeratul', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'stalker', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] }] },
    }, legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: [detectionId, shadowsId], canonicalResourceTypes: true,
    reactionDefinitionIds: [mightId], includeCharacteristicConsumers: true, includeMelee: true,
    includeHiddenRangedAndEvade: true, includeDetectionHiddenLoss: true, includeActionPerformedStatusLifecycle: true });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: 'movement', round: 1, activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  state.board = { widthInches: base.board.widthInches, heightInches: base.board.heightInches,
    tokens: [], effectMarkers: [], markers: [], accessPoints: [],
    terrain: [createOfficialTerrainPieceV1({ id: 'raven-flying-wall', size: 5, terrainKind: 'ordinary',
      footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: 12000, maxXMilliInches: 13000,
        minYMilliInches: 8000, maxYMilliInches: 12000 } })],
    engagementGeometry: structuredClone(base.board.engagementGeometry),
    terrainElevationAgreement: createOfficialTerrainElevationAgreementV1({ supportRelations: [] }),
    specialTerrainAgreement: createOfficialSpecialTerrainAgreementV1({ terrainEntries: [{
      terrainId: 'raven-flying-wall', terrainKind: 'ordinary', adjacentElevationPairs: [], accessPoints: [] }] }),
    scenarioMapId: 'raven-engineering-flight-wall', trainingTruth: false };
  arrange(pieceOf(state, 'raven'), 10, 10); arrange(pieceOf(state, 'marine'), 44, 5);
  arrange(pieceOf(state, 'zeratul'), spec.gainInside ? 20 : 24, 10); arrange(pieceOf(state, 'stalker'), 44, 26);
  const coherencyProofs = declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { spec, declaredPhaseAndPositionsAndTerrain: true, coherencyProofs,
    scale: 'Standard2000-budget partial rosters', fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.81.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor); const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: descriptorRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const prior = await cached(name);
  if (prior) assert.deepEqual(prior.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function settleReactions(branch, credentials, use) {
  for (let count = 0; count < 12; count++) {
    const current = await checkpoint(branch);
    if (!current.envelope.state.pendingOfficialReactionWindow) return current;
    await invoke(branch, credentials, 'reaction-r' + current.stateRevision,
      row => use ? row.definitionId === mightId : row.actionType === 'pass_reaction_family_window',
      domain => use ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {});
  }
  assert.fail('bounded native hidden-loss reaction did not settle');
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-raven-native-detection-flight-and-railguns-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const results = [];
    for (const spec of specs) {
      const scene = await makeScene(context, spec); const runtime = runtimeFor(context, scene.state);
      const raven = pieceOf(scene.state, 'raven'); assert(raven.combatTags.includes('flying'));
      const route = runtime.bundle.routes.find(row => row.definitionId === detectionId);
      assert.equal(route.effectKind, 'detection_aura'); assert.equal(route.rangeMilliInches, 6000);
      const weapon = scene.state.officialAttackProfileCatalogue.profilesByProfileKey['army_units:raven::assault::Railguns'];
      assert.deepEqual(weapon.targetTags, ['ground']); assert.equal(weapon.range.normalRangeInches, 12);
      assert.equal(weapon.rateOfAttack, 4); assert.equal(weapon.hitThreshold, 3); assert.equal(weapon.damage, 1);
      const missing = structuredClone(scene.state); delete missing.officialDetectionHiddenLossPolicy;
      assert.throws(() => runtimeFor(context, missing), /RAVEN_DETECTION_HIDDEN_LOSS_CONSUMERS_REQUIRED/);
      const targetX = Math.round(pieceOf(scene.state, 'zeratul').models[0].xInches * 1000);
      const boundaryX = targetX - radius(scene.state, 'raven') - radius(scene.state, 'zeratul') - 6000;
      const original = structuredClone(scene.state);
      for (const delta of [-3, 0]) {
        const condition = structuredClone(scene.state); pieceOf(condition, 'raven').models[0].xInches = (boundaryX + delta) / 1000;
        assert.equal(projection(runtime, condition, 'zeratul').hiddenSuppressedByDetection, delta === 0);
        assert.equal(projection(runtime, condition, 'raven').hiddenSuppressedByDetection, false);
        pieceOf(condition, 'raven').isOnField = false;
        assert.equal(projection(runtime, condition, 'zeratul').hiddenSuppressedByDetection, false);
      }
      assert.deepEqual(scene.state, original);
      await registerScene(context, spec.id, scene); results.push({ spec, route, weapon, boundaryX,
        baseRadiiMilliInches: [radius(scene.state, 'raven'), radius(scene.state, 'zeratul')] });
    }
    const ref = await save('compile.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/consumed.json'); if (saved) { results.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        await invoke(branch, credentials, 'zeratul-move', row => row.actionType === 'move' && row.pieceId === 'zeratul',
          () => moveParameters(branch.authority.state, 'zeratul', spec.gainInside ? 17000 : 23000));
        if (!spec.gainInside) {
          assert(hidden(pieceOf((await checkpoint(branch)).envelope.state, 'zeratul')));
          await invoke(branch, credentials, 'zeratul-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'zeratul', () => ({}));
          const before = await checkpoint(branch);
          const boundaryX = 23000 - radius(before.envelope.state, 'raven') - radius(before.envelope.state, 'zeratul') - 6000;
          await invoke(branch, credentials, 'raven-move-over-wall', row => row.actionType === 'move' && row.pieceId === 'raven',
            () => moveParameters(before.envelope.state, 'raven', boundaryX));
        }
        const current = await settleReactions(branch, credentials, spec.useMight), state = current.envelope.state;
        assert.equal(hidden(pieceOf(state, 'zeratul')), false); assert.equal(state.officialDetectionHiddenLossHistory.length, 1);
        assert(state.officialDetectionHiddenLossHistory[0].detectingSources.some(row => row.definitionId === detectionId));
        assert.equal((state.officialReactionHistory || []).filter(row => row.definitionId === mightId).length, spec.useMight ? 1 : 0);
        assert(!state.board.effectMarkers.some(row => row.targetPieceId === 'zeratul' && row.label === 'hidden'));
        const value = { id: spec.id, revision: current.stateRevision, actualHiddenRemoved: true,
          mightUsed: spec.useMight, flyingMovementOverTerrain: !spec.gainInside,
          gainedAndLostInSameTransition: spec.gainInside, actualLossEvent: state.officialDetectionHiddenLossHistory[0],
          reactionHistory: state.officialHiddenLossReactionHistory, sourceUpgradeNames: pieceOf(state, 'raven').selectedUpgradeNames };
        await save(spec.id + '/consumed.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/successor.json'); if (saved) { results.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const id = spec.gainInside ? 'zeratul' : 'raven';
        await invoke(branch, credentials, 'finish-parent', row => row.actionType === 'finish_activation' && row.pieceId === id, () => ({}));
        const current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, spec.gainInside ? 'player1' : 'player2');
        const value = { id: spec.id, revision: current.stateRevision, nextSide: current.envelope.state.activeSideKey,
          hiddenRemainsLost: !hidden(pieceOf(current.envelope.state, 'zeratul')) };
        if (!spec.gainInside) {
          const state = structuredClone(current.envelope.state); state.phase = 'assault'; state.activeSideKey = 'player1';
          state.firstPlayerSideKey = 'player1'; delete state.selectedRosterActivationWindow;
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
          await registerScene(branch.context, 'railguns', { state: refreshOfficialReleaseRosterDerivedStateV2({ context: branch.context, state }),
            scenario: { sourceCheckpoint: output + spec.id + '/checkpoint-r' + current.stateRevision + '.json',
              actualPriorRavenMove: true, declaredAssaultPhase: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
        await save(spec.id + '/successor.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const branch = await product.branch('railguns');
    try {
      const credentials = await branch.native.create(roomId(branch.id), branch.authority); await checkpoint(branch);
      const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, 'railguns'), native: branch.native,
        runtime: branch.runtime, roomId: roomId(branch.id), credentials, attackerSideKey: 'player1', attackerPieceId: 'raven',
        targetPieceId: 'zeratul', weaponName: 'Railguns', operationKey: 'shot', selectPoolParameters: poolParameters });
      for (const name of await fs.readdir(path.join(directory, 'railguns'))) {
        if (!name.startsWith('shot-') || !name.endsWith('.json')) continue;
        const value = await read(output + 'railguns/' + name); if (!value.envelope) continue;
        await save('railguns/checkpoint-r' + value.envelope.stateRevision + '.json', { envelope: value.envelope });
      }
      await checkpoint(branch);
      assert.equal(shot.event.stages.hit.dice, 4); assert.equal(shot.event.stages.effects.printedRateOfAttack, 4);
      assert.equal(shot.event.stages.damage.damagePerDie, 1);
      let current = await checkpoint(branch);
      if (current.envelope.state.pendingCurrentProductRangedSequence) {
        await invoke(branch, credentials, 'finish-shot', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
      }
      await invoke(branch, credentials, 'raven-assault-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'raven', () => ({}));
      current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
      await save('railguns/consume.json', { event: shot.event, query: shot.query, queryEqualsNative: true, revision: current.stateRevision });
      results.push({ id: 'railguns', revision: current.stateRevision, nextSide: 'player2' });
    } finally { branch.close(); }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of [...specs.map(spec => spec.id), 'railguns']) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    const previousProduct = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json');
      previousProduct.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await previousProduct.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = previousRuntimeFor(context, authority.state); assert.equal(runtime.descriptor.runtimeVersion, '3.80.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const sourcePath = path.join(root, previous, 'room.sqlite'), bytes = await fs.readFile(sourcePath);
      const target = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(target); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      const id = 'wave3-holo-round-end-injured-place'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, previous + 'checkpoint-r'); assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy, runtimeVersion: '3.80.0',
        descriptorExact: true, originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); previousProduct.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'raven-detection-and-railguns', status: gate.status, failures: gate.failures.length }));
