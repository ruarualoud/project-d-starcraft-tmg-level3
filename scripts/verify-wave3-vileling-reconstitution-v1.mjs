import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createOfficialBattlefieldTokenV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { isOfficialCurrentProductUnitOnCreepV1 } from '../packages/product-composition/official-current-product-state-facts-v1.mjs';
import { getOfficialRespawnCarrierV1, OFFICIAL_VILELING_RECONSTITUTION_DEFINITION_ID as definitionId }
  from '../packages/source-data/official-respawn-morph-data-bundle-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-reconstitution/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const foundation = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const specs = [
  { id: 'ordinary', survivors: 7, returned: 2, onCreep: false },
  { id: 'creep', survivors: 7, returned: 3, onCreep: true },
  { id: 'supply-cap', survivors: 5, returned: 1, onCreep: true },
  { id: 'model-cap', survivors: 17, returned: 1, onCreep: false },
];
const roomId = id => 'wave3-vileling-reconstitution-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = state => state.pieces.find(piece => piece.id === 'vileling');
const live = state => pieceOf(state).models.filter(model => model.isOnField && !model.isDestroyed);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  const ref = output + name;
  await atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
  return ref;
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [squadronId] });
}
function setSurvivors(state, count) {
  const piece = pieceOf(state);
  piece.models.forEach((model, index) => Object.assign(model, {
    isDestroyed: index >= count, isOnField: index < count,
    damage: index >= count ? 1 : 0, remainingWounds: index >= count ? 0 : 1,
  }));
  piece.currentModels = count;
  piece.isDestroyed = count === 0;
  piece.isOnField = count > 0;
  piece.destroyedModelIds = piece.models.filter(model => model.isDestroyed).map(model => model.id);
  piece.currentSupply = resolveOfficialCurrentSupplyValueV1({
    unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle, recordKey: piece.officialUnitRecordKey,
    currentModels: count, isDestroyed: piece.isDestroyed, rulesOwnedCurrentModelCountRequested: true,
  }).currentSupplyValue;
}
async function sceneFor(context, spec) {
  const original = (await read(foundation + 'base/authority.json')).state;
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    characteristicDefinitionIds: [squadronId], includeCharacteristicConsumers: true,
    unitLifecycleDefinitionIds: [definitionId], legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: (await read(foundation + 'roster-preflight.json')).candidate,
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const keys = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  let state = { ...Object.fromEntries(keys.map(key => [key, structuredClone(original[key])])), ...setup.state,
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  const actor = pieceOf(state), prior = pieceOf(original);
  Object.assign(actor, { isOnField: true, isInReserves: false, deploymentStatus: 'hypothetical_snapshot' });
  actor.models.forEach((model, i) => Object.assign(model, { xInches: prior.models[i].xInches, yInches: prior.models[i].yInches }));
  arrange(state.pieces.find(piece => piece.id === 'target'), 42, 25);
  setSurvivors(state, spec.survivors);
  state.board.tokens = [];
  state.board.markers = [];
  state.board.effectMarkers = [];
  state.officialBattlefieldTokenMarkerRegistry = structuredClone(legacy.officialBattlefieldTokenMarkerRegistry);
  state.officialBattlefieldTokenMarkerRulesDataBundle = structuredClone(legacy.officialBattlefieldTokenMarkerRulesDataBundle);
  state.officialBattlefieldAssetBindings = [];
  if (spec.onCreep) {
    // A declared prior token condition. Token creation in a live match is covered
    // by its own producer gate, while this gate checks the real ON CREEP consumer.
    const token = createOfficialBattlefieldTokenV1({ registry: state.officialBattlefieldTokenMarkerRegistry,
      tokenId: 'declared-vileling-creep', tokenKind: 'creep_tumor', coordinate: { x: 14, y: 10 },
      baseShape: 'round', baseDiameterMm: 28, createdRound: 1 });
    state.board.tokens.push(token);
    state.officialBattlefieldAssetBindings.push({ assetId: token.tokenId, assetKind: 'creep_tumor',
      assetHash: token.tokenHash, consumed: false, sideKey: 'player1', trainingTruth: false });
  }
  const coherencyRangesByPieceId = Object.fromEntries(state.officialActionRouteCatalogue.units.map(unit => [
    unit.pieceId, Math.round(unit.movementProfile.horizontalCoherencyInches * 1000),
  ]));
  const coherency = declareCoherency(state, { coherencyRangesByPieceId });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  assert.equal(isOfficialCurrentProductUnitOnCreepV1(state, pieceOf(state)), spec.onCreep);
  return { state, scenario: { spec, declaredPhaseAndPriorCasualties: true, declaredPriorCreep: spec.onCreep,
    tokenGenerationProvenHere: false, coherency, partialLegalRosters: true, scale: 'Standard', budget: 2000,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, spec, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.96.0');
  const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec.id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(spec.id + '/authority.json');
    if (old) assert.deepEqual(authority, old); else await save(spec.id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const authority = await read(output + spec.id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec.id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + spec.id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, spec.id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id: spec.id, spec, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
function placement(state, count, paymentCardInstanceIds) {
  const actor = pieceOf(state), anchors = live(state).filter(model => model.xInches === live(state)[0].xInches);
  const returned = actor.models.filter(model => model.isDestroyed).slice(0, count);
  return { activeUnitId: actor.id, paymentCardInstanceIds, placementPlan: {
    leadingModelId: returned[0].id,
    placements: returned.map((model, i) => ({ modelId: model.id, contactModelId: anchors[i].id,
      xMilliInches: Math.round((anchors[i].xInches + model.baseWidthInches) * 1000),
      yMilliInches: Math.round(anchors[i].yInches * 1000), rotationDegrees: 0 })),
  } };
}
function respawnDomain(runtime, state) {
  return runtime.enumerate(state).parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'vileling');
}
function movement(state) {
  const models = live(state), leader = models[0];
  const point = model => ({ xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) });
  return { leadingModelId: leader.id, path: [point(leader), { ...point(leader), xMilliInches: point(leader).xMilliInches + 200 }],
    placements: models.slice(1).map(model => ({ modelId: model.id, ...point(model),
      xMilliInches: point(model).xMilliInches + 200, rotationDegrees: 0 })) };
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
async function legacyCocoon(product) {
  const old = await cached('legacy-cold-recovery.json');
  if (old) return old;
  const prefix = 'build/ticket-28-wave2-capabilities-20261113-v1/cocoon-spawn-larva/before/';
  const authority = await read(prefix + 'current-factory/authority.json');
  product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: [] });
  assert.deepEqual(runtime.descriptor, await read(prefix + 'current-factory/runtime.json'));
  const manifest = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
  const entry = manifest.entries.find(row => row.path === prefix + 'room.sqlite' && row.restoredByteHashVerified);
  assert(entry);
  const archive = await fs.readFile(path.join(root, entry.archivePath)), bytes = gunzipSync(archive);
  assert.equal(bytes.length, entry.bytes);
  assert.equal(sha256(bytes), entry.sha256);
  const copy = path.join(directory, 'legacy-room.sqlite');
  try { await fs.access(copy); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const id = 'wave2-cocoon-spawn-larva-before';
    await native.restoreDependencies(id, authority);
    const result = await replay(native, id, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(path.join(root, entry.archivePath))), sha256(archive));
    const value = { ...result, runtimeVersion: runtime.descriptor.runtimeVersion, descriptorExact: true,
      originalArchiveUnchanged: true, restoredOriginalBytesVerified: true, modelCalls: 0 };
    await save('legacy-cold-recovery.json', value);
    return value;
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Vileling-Reconstitution-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const spec of specs) await registerScene(context, spec, await sceneFor(context, spec));
      const state = (await read(output + 'ordinary/authority.json')).state, runtime = runtimeFor(context, state);
      const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
      assert.equal(definition.execution.status, 'executable_exact');
      const domain = respawnDomain(runtime, state);
      assert(domain);
      const parameters = placement(state, 2, domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0]);
      for (const [name, mutate, error] of [
        ['not_in_contact', p => { p.placementPlan.placements[0].xMilliInches += 3000; }, /CONTACT/],
        ['outside_board', p => { p.placementPlan.placements[0].xMilliInches = 0; }, /CANNOT_BE_SET_LEGALLY/],
        ['living_model', p => { p.placementPlan.placements[0].modelId = live(state)[0].id; }, /PLACEMENT_PLAN_INVALID/],
      ]) {
        const changed = structuredClone(parameters); mutate(changed);
        assert.throws(() => runtime.instantiate(state, domain, changed), error, name);
        assert.throws(() => runtime.query(state, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'vileling', parameters: changed }), error, name);
      }
      assert(state.officialRespawnMorphDataBundle.eligibleUnitProfiles.some(row => row.recordKey === 'army_units:swarmling__zergling_'));
      assert.throws(() => getOfficialRespawnCarrierV1(state.officialRespawnMorphDataBundle, 'army_units:swarmling__zergling_', definitionId), /CARRIER_REQUIRED/);
      const rejects = [];
      for (const [name, mutate] of [
        ['no_casualties', s => setSurvivors(s, 18)], ['destroyed_unit', s => setSurvivors(s, 0)],
        ['supply_bracket_increase', s => setSurvivors(s, 6)], ['wrong_phase', s => { s.phase = 'assault'; }],
        ['no_biomass', s => { s.cardResources.player1.forEach(card => { card.readiness = 'exhausted'; }); }],
      ]) { const changed = structuredClone(state); mutate(changed); assert.equal(!!respawnDomain(runtime, changed), false, name); rejects.push(name); }
      const creep = structuredClone((await read(output + 'creep/authority.json')).state);
      assert.equal(isOfficialCurrentProductUnitOnCreepV1(creep, pieceOf(creep)), true);
      creep.officialBattlefieldAssetBindings = [];
      assert.equal(isOfficialCurrentProductUnitOnCreepV1(creep, pieceOf(creep)), false);
      const ref = await save('compile.json', { definition, route: runtime.unitLifecycleBundle.routes[0],
        rejects, unboundCreepIgnored: true, runtime: runtime.descriptor, newSemanticAtomCount: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const spec of specs) {
        const old = await cached(spec.id + '/consumed.json');
        if (old) { results.push(old); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          await checkpoint(branch);
          const initial = (await read(output + spec.id + '/checkpoint-r0.json')).envelope.state;
          const domain = respawnDomain(branch.runtime, initial);
          const parameters = placement(initial, spec.returned, domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0]);
          const before = await branch.native.store.loadRoom(roomId(spec.id));
          const query = branch.runtime.query(initial, { queryKind: 'unit_lifecycle_placement_preview', pieceId: 'vileling', parameters });
          assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
          const result = await branch.native.commit({ roomId: roomId(spec.id), credential: credentials.player1,
            operationKey: 'respawn', select: row => row.definitionId === definitionId && row.pieceId === 'vileling', parameters: () => parameters });
          assert.deepEqual(result.preview.core.action, query.result.action);
          const after = await checkpoint(branch), actor = pieceOf(after.envelope.state);
          assert.equal(actor.currentModels, spec.survivors + spec.returned);
          assert.equal(actor.currentSupply, pieceOf(initial).currentSupply);
          const resolution = result.preview.core.action.sourceAction.unitLifecyclePlan.canonicalParameters.respawnResolution;
          assert.equal(resolution.onCreep, spec.onCreep);
          for (const id of resolution.returnedModelIds) {
            const model = actor.models.find(row => row.id === id);
            assert.equal(model.damage, 0); assert.equal(model.remainingWounds, 1); assert.equal(model.isDestroyed, false);
          }
          assert.equal(!!respawnDomain(branch.runtime, after.envelope.state), false);
          const value = { spec, revision: after.stateRevision, currentModels: actor.currentModels,
            currentSupply: actor.currentSupply, resolution, queryEqualsNative: true, queryNoMutation: true,
            duplicateIdempotence: result.idempotentReplayVerified, repeatedUseUnavailable: true, modelCalls: 0 };
          await save(spec.id + '/consumed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const results = [];
      for (const spec of specs) {
        const old = await cached(spec.id + '/completed.json');
        if (old) { results.push(old); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(roomId(spec.id), branch.authority);
          const afterRespawn = (await read(output + spec.id + '/checkpoint-r1.json')).envelope.state;
          await branch.native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'move',
            select: row => row.actionType === 'move' && row.pieceId === 'vileling', parameters: () => movement(afterRespawn) });
          await checkpoint(branch);
          await branch.native.commit({ roomId: roomId(spec.id), credential: credentials.player1, operationKey: 'finish',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'vileling', parameters: () => ({}) });
          const after = await checkpoint(branch);
          assert.equal(after.envelope.state.activeSideKey, 'player2');
          const value = { id: spec.id, revision: after.stateRevision, parentMoveAndFinish: true, nextSide: 'player2', modelCalls: 0 };
          await save(spec.id + '/completed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const spec of specs) {
        const branch = await product.branch(spec);
        try {
          await branch.native.restoreDependencies(roomId(spec.id), branch.authority);
          current.push({ id: spec.id, ...await replay(branch.native, roomId(spec.id), output + spec.id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      const legacy = await legacyCocoon(product);
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'vileling-reconstitution', status: gate.status, failures: gate.failures.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
