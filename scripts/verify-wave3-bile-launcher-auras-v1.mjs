import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialModelBaseFootprintV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { isOfficialCurrentProductUnitOnCreepV1 }
  from '../packages/product-composition/official-current-product-state-facts-v1.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-zerg-wave3-20261117-v1/bile-launcher-auras/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const foundation = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
const creepId = 'unit:bile_launcher/source-of-creep-any-phase@1';
const detectionId = 'unit:bile_launcher/detection-any-phase@1';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const respawnId = 'unit:vileling__zergling_/zergling-reconstitution-movement-phase@1';
const shadowsId = 'unit:zeratul/one-with-the-shadows-any-phase@1';
const specs = ['friendly', 'enemy', 'detection'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-bile-launcher-auras-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const living = piece => piece.models.filter(model => model.isOnField && !model.isDestroyed);
const hidden = piece => (piece.statuses || []).some(row =>
  String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'hidden');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function cached(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef);
    product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  const detection = state.officialCharacteristicStatusFamilySourceBundle.definitionIds.includes(detectionId);
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    includeRanged: detection, includeMelee: detection, includePrecisionChoices: detection, includeArmourChoices: detection });
}
function candidate(sideKey, factionRecordKey, cards, units) {
  return { sideKey, scaleId: 'Standard', mineralBudget: 2000, factionRecordKey,
    tacticalCardRecordKeys: cards, units: units.map(([unitInstanceId, recordKey]) =>
      ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] })) };
}
async function sceneFor(context, id) {
  const base = (await read(foundation + 'base/authority.json')).state;
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const detection = id === 'detection';
  const player1 = candidate('player1', 'tactical_cards:zagara_s_swarm', ['tactical_cards:accelerating_creep'],
    [['bile', 'army_units:bile_launcher'], ...(!detection && id === 'friendly'
      ? [['vileling', 'army_units:vileling__zergling_']] : [])]);
  const player2 = detection
    ? candidate('player2', 'tactical_cards:nerazim', ['tactical_cards:robotics_facility'],
      [['zeratul', 'army_units:zeratul'], ['stalker', 'army_units:stalker']])
    : candidate('player2', 'tactical_cards:zagara_s_swarm', ['tactical_cards:accelerating_creep'],
      [[id === 'enemy' ? 'vileling' : 'other', 'army_units:vileling__zergling_']]);
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle, candidatesBySide: { player1, player2 },
    characteristicDefinitionIds: detection ? [detectionId, shadowsId] : [squadronId],
    ...(detection ? { includeMelee: true, includeCharacteristicConsumers: true,
      includeHiddenRangedAndEvade: true, includeDetectionHiddenLoss: true,
      includeActionPerformedStatusLifecycle: true }
      : { includeCharacteristicConsumers: true, battlefieldModifierDefinitionIds: [creepId],
        unitLifecycleDefinitionIds: [respawnId] }),
  });
  const keys = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const side = detection || id === 'enemy' ? 'player2' : 'player1';
  let state = { ...Object.fromEntries(keys.map(key => [key, structuredClone(base[key])])), ...setup.state,
    phase: 'movement', round: 1, activeSideKey: side, firstPlayerSideKey: side, log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: side } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  if (detection) {
    state.officialStatusStayInPlayDataBundle = structuredClone(legacy.officialStatusStayInPlayDataBundle);
    state.officialBattlefieldTokenMarkerRegistry = structuredClone(legacy.officialBattlefieldTokenMarkerRegistry);
    state.officialBattlefieldTokenMarkerRulesDataBundle = structuredClone(legacy.officialBattlefieldTokenMarkerRulesDataBundle);
    arrange(pieceOf(state, 'bile'), 10, 10);
    arrange(pieceOf(state, 'zeratul'), 18, 10);
    arrange(pieceOf(state, 'stalker'), 44, 26);
  } else {
    arrange(pieceOf(state, 'bile'), 18, 10);
    for (const piece of state.pieces.filter(row => row.id === 'vileling')) {
      const source = pieceOf(base, 'vileling');
      Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'hypothetical_snapshot' });
      piece.models.forEach((model, index) => Object.assign(model, {
        xInches: source.models[index].xInches + (piece.id === 'vileling' ? 0 : 30),
        yInches: source.models[index].yInches + (piece.id === 'vileling' ? 0 : 12),
        isDestroyed: index >= 7, isOnField: index < 7,
        damage: index >= 7 ? 1 : 0, remainingWounds: index >= 7 ? 0 : 1,
      }));
      piece.currentModels = 7;
      piece.destroyedModelIds = piece.models.slice(7).map(model => model.id);
      piece.currentSupply = resolveOfficialCurrentSupplyValueV1({
        unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle, recordKey: piece.officialUnitRecordKey,
        currentModels: 7, isDestroyed: false, rulesOwnedCurrentModelCountRequested: true }).currentSupplyValue;
    }
  }
  const ranges = Object.fromEntries(state.officialActionRouteCatalogue.units.filter(unit => unit.movementProfile).map(unit =>
    [unit.pieceId, Math.round(unit.movementProfile.horizontalCoherencyInches * 1000)]));
  const coherency = declareCoherency(state, { coherencyRangesByPieceId: ranges });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { id, declaredPhaseAndPositions: true, declaredPriorCasualties: !detection,
    preexistingHidden: false, partialLegalRosters: true, fullRound: false, fullMatch: false, coherency, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.99.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(authority, old); else await save(id + '/authority.json', authority);
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
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters) {
  await checkpoint(branch);
  const state = (await branch.native.store.loadRoom(roomId(branch.id))).envelope.state;
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[state.activeSideKey],
    operationKey: key, select, parameters });
  await checkpoint(branch);
  return result;
}
function respawnParameters(state, domain) {
  const piece = pieceOf(state, 'vileling'), models = living(piece);
  const anchors = models.filter(model => model.xInches === models[0].xInches);
  return { activeUnitId: piece.id, paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0],
    placementPlan: { leadingModelId: piece.models[7].id, placements: piece.models.slice(7, 10).map((model, index) => ({
      modelId: model.id, contactModelId: anchors[index].id,
      xMilliInches: Math.round((anchors[index].xInches + model.baseWidthInches) * 1000),
      yMilliInches: Math.round(anchors[index].yInches * 1000), rotationDegrees: 0 })) } };
}
function radius(state, id) {
  const piece = pieceOf(state, id);
  return createOfficialModelBaseFootprintV1({ piece, model: piece.models[0],
    dataBundle: state.officialModelBaseGeometryDataBundle }).radiusMilliInches;
}
function modifier(runtime, state, id) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: id }).result;
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bile-Launcher-Auras-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const id of specs) await registerScene(context, id, await sceneFor(context, id));
      const state = (await read(output + 'friendly/authority.json')).state, runtime = runtimeFor(context, state);
      assert.equal(isOfficialCurrentProductUnitOnCreepV1(state, pieceOf(state, 'vileling')), true);
      assert.equal(runtime.query(state, { queryKind: 'battlefield_modifiers', pieceId: 'vileling' }).result.onCreep, true);
      const boundary = 18000 + radius(state, 'bile') + radius(state, 'vileling') + 6000;
      const conditions = [];
      for (const delta of [0, 3]) {
        const altered = structuredClone(state), actor = pieceOf(altered, 'vileling');
        for (const model of living(actor)) Object.assign(model, { xInches: (boundary + delta) / 1000, yInches: 10 });
        const value = isOfficialCurrentProductUnitOnCreepV1(altered, actor);
        assert.equal(value, delta === 0); conditions.push({ deltaMilliInches: delta, onCreep: value });
      }
      for (const [name, change] of [
        ['source_removed', s => { pieceOf(s, 'bile').isOnField = false; }],
        ['source_destroyed', s => { pieceOf(s, 'bile').isDestroyed = true; }],
        ['source_disabled', s => { pieceOf(s, 'bile').structureRules = { specialAbilitiesDisabledThroughRound: 1 }; }],
        ['flying', s => { pieceOf(s, 'vileling').combatTags = ['Zerg', 'Flying']; pieceOf(s, 'vileling').combatTag = 'Flying'; }],
        ['not_zerg', s => { s.players.player1.faction = 'Terran'; pieceOf(s, 'vileling').combatTags = ['Ground']; pieceOf(s, 'vileling').combatTag = 'Ground'; }],
      ]) {
        const altered = structuredClone(state); change(altered);
        assert.equal(isOfficialCurrentProductUnitOnCreepV1(altered, pieceOf(altered, 'vileling')), false, name);
        conditions.push({ name, onCreep: false });
      }
      const detectState = (await read(output + 'detection/authority.json')).state;
      const detectRuntime = runtimeFor(context, detectState);
      assert.equal(modifier(detectRuntime, detectState, 'zeratul').hiddenSuppressedByDetection, true);
      const outside = structuredClone(detectState);
      pieceOf(outside, 'zeratul').models[0].xInches = (10000 + radius(outside, 'bile') + radius(outside, 'zeratul') + 6003) / 1000;
      assert.equal(modifier(detectRuntime, outside, 'zeratul').hiddenSuppressedByDetection, false);
      const missing = structuredClone(detectState); delete missing.officialDetectionHiddenLossPolicy;
      assert.throws(() => runtimeFor(context, missing), /BILE_LAUNCHER_DETECTION_CONSUMER_REQUIRED/);
      const ref = await save('compile.json', { conditions, boundary, geometry: { bileDiameterMm: 100 },
        creepRoute: runtime.battlefieldModifierBundle.routes[0],
        detectionRoute: detectRuntime.bundle.routes.find(row => row.definitionId === detectionId),
        sourceDefinitions: detectRuntime.catalogue.definitions.filter(row => [detectionId, creepId].includes(row.definitionId)),
        newSemanticAtomCount: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of specs) {
        const old = await cached(id + '/consumed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          const initial = (await checkpoint(branch)).envelope.state;
          if (id === 'detection') {
            assert.equal(hidden(pieceOf(initial, 'zeratul')), false);
            await invoke(branch, credentials, 'zeratul-move', row => row.actionType === 'move' && row.pieceId === 'zeratul',
              () => ({ leadingModelId: pieceOf(initial, 'zeratul').models[0].id,
                path: [{ xMilliInches: 17000, yMilliInches: 10000 }], placements: [] }));
            const after = await checkpoint(branch), state = after.envelope.state;
            assert.equal(hidden(pieceOf(state, 'zeratul')), false);
            assert.equal(state.officialDetectionHiddenLossHistory.length, 1);
            const event = state.officialDetectionHiddenLossHistory[0];
            assert(event.detectingSources.some(row => row.definitionId === detectionId && row.pieceId === 'bile'));
            const value = { id, revision: after.stateRevision, hiddenActuallyGainedAndRemoved: true, event, modelCalls: 0 };
            await save(id + '/consumed.json', value); results.push(value);
          } else {
            const domain = branch.runtime.enumerate(initial).parameterDomains.find(row => row.definitionId === respawnId && row.pieceId === 'vileling');
            assert(domain);
            const parameters = respawnParameters(initial, domain), before = await branch.native.store.loadRoom(roomId(id));
            const query = branch.runtime.query(initial, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'vileling', parameters });
            assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
            const result = await invoke(branch, credentials, 'respawn', row => row.definitionId === respawnId && row.pieceId === 'vileling', () => parameters);
            assert.deepEqual(result.preview.core.action, query.result.action);
            const after = await checkpoint(branch), actor = pieceOf(after.envelope.state, 'vileling');
            assert.equal(actor.currentModels, 10); assert.equal(actor.currentSupply, 2);
            const resolution = result.preview.core.action.sourceAction.unitLifecyclePlan.canonicalParameters.respawnResolution;
            assert.equal(resolution.onCreep, true);
            const value = { id, revision: after.stateRevision, currentModels: actor.currentModels, currentSupply: actor.currentSupply,
              resolution, enemyBenefits: id === 'enemy', queryEqualsNative: true, queryNoMutation: true,
              duplicateIdempotence: result.idempotentReplayVerified, modelCalls: 0 };
            await save(id + '/consumed.json', value); results.push(value);
          }
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of specs) {
        const old = await cached(id + '/completed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          const actor = id === 'detection' ? 'zeratul' : 'vileling';
          await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === actor, () => ({}));
          const after = await checkpoint(branch);
          assert.equal(after.envelope.state.activeSideKey, id === 'friendly' ? 'player2' : 'player1');
          const value = { id, revision: after.stateRevision, nextSide: after.envelope.state.activeSideKey,
            originalActivationCompleted: true, modelCalls: 0 };
          await save(id + '/completed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(roomId(id), branch.authority);
          current.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const oldPrefix = 'build/ticket-28-terran-wave3-20261116-v1/nova-vision-hidden/gain-suppressed/';
      const authority = await read(oldPrefix + 'authority.json');
      product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
        includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
      assert.deepEqual(runtime.descriptor, await read(oldPrefix + 'runtime.json'));
      const originalFile = path.join(root, oldPrefix, 'room.sqlite');
      const hash = async () => createHash('sha256').update(await fs.readFile(originalFile)).digest('hex');
      const beforeHash = await hash();
      const native = openWave3EngineeringRoomV1({ directory: path.join(root, oldPrefix), filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let legacy;
      try {
        await native.restoreDependencies('wave3-nova-vision-gain-suppressed', authority);
        legacy = await replay(native, 'wave3-nova-vision-gain-suppressed', oldPrefix + 'checkpoint-r');
      } finally { native.close(); }
      assert.equal(await hash(), beforeHash);
      const ref = await save('cold-recovery.json', { current, legacy: { ...legacy,
        runtimeVersion: runtime.descriptor.runtimeVersion, originalDatabaseUnchanged: true }, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bile-launcher-auras', status: gate.status, failures: gate.failures.length }));
}
async function sourceCompatibility() {
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'source-compatibility'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef,
    contractVersion: 'T28-W3-09-Bile-Auras-Explicit-Source-Compatibility-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try {
          assert.deepEqual(branch.runtime.descriptor, await read(output + id + '/runtime.json'));
          if (id !== 'detection') {
            const tampered = structuredClone(branch.authority.state);
            tampered.officialBattlefieldAssetFamilySourceBundle.routes[0].rangeInches = 60;
            assert.throws(() => runtimeFor(branch.context, tampered), /BATTLEFIELD_MODIFIER_SOURCE_MISMATCH/);
            assert.equal(branch.runtime.query(branch.authority.state, { queryKind: 'battlefield_modifiers', pieceId: 'vileling' }).result.onCreep, true);
          }
          results.push({ id, exactOriginalDescriptor: true, sourceBindingVerified: true });
        } finally { branch.close(); }
      }
      const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
      const withoutRoutes = structuredClone(legacy);
      delete withoutRoutes.officialBattlefieldAssetFamilySourceBundle;
      const oldCreep = legacy.pieces.map(piece => ({ pieceId: piece.id,
        before: isOfficialCurrentProductUnitOnCreepV1(withoutRoutes, piece),
        after: isOfficialCurrentProductUnitOnCreepV1(legacy, piece) }));
      assert(oldCreep.every(row => row.before === row.after));
      const ref = await save('source-compatibility/compile.json', { current: results, oldCreep,
        legacyV1UsesOriginalCreepBranch: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const prefix = 'build/ticket-28-wave2-capabilities-20261113-v1/armour-threshold/melee-near/';
      const authority = await read(prefix + 'authority.json');
      product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: [], includeMelee: true, includeHits: false, includeRanged: false });
      assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
      let bytes;
      try { bytes = await fs.readFile(path.join(root, prefix, 'room.sqlite')); }
      catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const manifest = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
        const entry = manifest.entries.find(row => row.path === prefix + 'room.sqlite' && row.restoredByteHashVerified);
        assert(entry);
        bytes = gunzipSync(await fs.readFile(path.join(root, entry.archivePath)));
        assert.equal(bytes.length, entry.bytes);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      }
      const filename = 'legacy-marker-armour.sqlite';
      const copy = path.join(directory, filename);
      try { await fs.access(copy); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
      const native = openWave3EngineeringRoomV1({ directory, filename,
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let legacy;
      try {
        const id = 'wave3-armour-threshold-melee-near';
        await native.restoreDependencies(id, authority);
        const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
          .map(row => row.payload.payload.receipt);
        for (const name of ['first-checkpoint.json', 'checkpoint.json']) {
          const expected = (await read(prefix + name)).envelope;
          const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope,
            journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(result.ok, true, JSON.stringify(result));
          assert.deepEqual(result.envelope, expected);
        }
        assert.deepEqual(before.envelope, (await read(prefix + 'checkpoint.json')).envelope);
        assert.deepEqual(await native.store.loadRoom(id), before);
        legacy = { receipts: receipts.length, checkpoints: 2, exact: true };
      } finally { native.close(); }
      const ref = await save('source-compatibility/cold-recovery.json', { ...legacy,
        runtimeVersion: runtime.descriptor.runtimeVersion, originalSourceCopiedWithoutMutation: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bile-auras-source-compatibility', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--source-compatibility-only')) await sourceCompatibility();
  else await main();
}
export { openProduct, sourceProduct, runtimeFor };
