import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { verifyOfficialRelocationFamilySourceBundleV1 }
  from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = 'build/ticket-28-terran-wave3-20261116-v1/nova-phase-reactor/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'unit:nova_assault_mode/phase-reactor-suit-assault-phase@1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-nova-phase-reactor-' + id;
const releaseId = id => roomId(id) + '-v1';
const actorOf = state => state.pieces.find(row => row.id === 'nova');
const specs = [{ id: 'attack-after-place', enemyX: 23 }, { id: 'land-engaged', enemyX: 17.4 }];
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [],
    includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
}
async function sceneFor(context, spec) {
  const base = (await read(parent + 'tank-coordinated-strike/source-projection/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [
          { unitInstanceId: 'target', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'rear', recordKey: 'army_units:stalker', compositionKind: 'small', upgrades: [] }] },
    },
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    relocationDefinitionIds: [definitionId], canonicalResourceTypes: true });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'officialDeploymentGeometryDataBundle',
    'engagementScale', 'armyBuildingEngagementScale', 'officialMissionRuntimeDescriptor', 'supplyLossLedger',
    'officialModelGapTransitPolicy', 'officialBattlefieldTokenMarkerRulesDataBundle',
    'officialBattlefieldTokenMarkerRegistry', 'officialStatusStayInPlayDataBundle'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined).map(key => [key, structuredClone(base[key])])),
    ...setup.state, phase: 'assault', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach(model => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'nova' ? 10 : piece.id === 'target' ? spec.enemyX : 44,
      yInches: piece.id === 'rear' ? 26 : 10 }));
  }
  if (spec.id === 'land-engaged') {
    const target = state.pieces.find(row => row.id === 'target');
    target.models[0].xInches = 16 + (actorOf(state).models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5;
  }
  actorOf(state).damageMarker = 2; actorOf(state).models[0].damage = 2; actorOf(state).models[0].remainingWounds = 6;
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { spec, budget: 2000, fullRosterSpend: false, fullMatch: false,
    phasePositionsAndPriorDamageDeclared: true, modelCalls: 0 } };
}
function domainFor(runtime, state) {
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.definitionId === definitionId);
  assert(domain, 'real Phase Reactor Suit menu entry missing'); return domain;
}
function parametersFor(domain, x = 16000) {
  const schema = domain.sourceDomain.parameterSchema; const modelId = schema.leadingModelId.enum[0];
  return { leadingModelId: modelId, placements: [{ modelId, xMilliInches: x, yMilliInches: 10000 }],
    paymentCardInstanceIds: schema.paymentCardInstanceIds.enum[0] };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.73.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor); const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
      referenceSources: m.source.references, sourcePolicy: m.source.policy, components: { ...m.components,
        rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
          integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  await save(branch.id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope }); return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind }); await checkpoint(branch); return result;
}
async function replay(branch) {
  const before = await branch.native.store.loadRoom(roomId(branch.id)); await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const actual = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(actual.ok, true, JSON.stringify(actual));
    assert.deepEqual(actual.envelope, (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const main = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Nova-Phase-Reactor-Suit-CP-PLACE-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const spec of specs) {
      const scene = await sceneFor(context, spec); const runtime = runtimeFor(context, scene.state);
      const route = runtime.relocationBundle.routes.find(row => row.definitionId === definitionId);
      assert.equal(route.resourceType, 'CP'); assert.equal(route.resourceCost, 1);
      assert.equal(route.requiresUnengaged, true); assert.equal(route.maxDistanceMilliInches, 6000);
      const domain = domainFor(runtime, scene.state); const parameters = parametersFor(domain);
      const query = runtime.query(scene.state, { queryKind: 'relocation_preview', pieceId: 'nova', definitionId, parameters });
      assert.deepEqual(query.result.action, runtime.instantiate(scene.state, domain, parameters).action);
      assert.throws(() => runtime.instantiate(scene.state, domain, { ...parameters, paymentCardInstanceIds: [] }), /PAYMENT_SELECTION_INVALID/);
      assert.throws(() => runtime.instantiate(scene.state, domain, parametersFor(domain, 16004)), /DISTANCE|WITHIN|RANGE/);
      for (const reason of ['engaged', 'phase', 'no_payment']) {
        const invalid = structuredClone(scene.state);
        if (reason === 'engaged') {
          const target = invalid.pieces.find(row => row.id === 'target');
          target.models[0].xInches = 10 + (actorOf(invalid).models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5;
        }
        if (reason === 'phase') { invalid.phase = 'movement'; invalid.phaseFirstActorByRound['1:movement'] = {
          round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' }; }
        if (reason === 'no_payment') for (const card of invalid.cardResources.player1) card.readiness = 'exhausted';
        assert(!runtime.enumerate(invalid).parameterDomains.some(row => row.definitionId === definitionId), reason);
      }
      const nearEdge = structuredClone(scene.state); actorOf(nearEdge).models[0].xInches = 6;
      const edgeDomain = domainFor(runtime, nearEdge);
      assert.throws(() => runtime.instantiate(nearEdge, edgeDomain, parametersFor(edgeDomain, 0)), /BOUNDARY|BATTLEFIELD|OUTSIDE/);
      const overlap = structuredClone(scene.state); overlap.pieces.find(row => row.id === 'target').models[0].xInches = 16;
      const overlapDomain = domainFor(runtime, overlap);
      assert.throws(() => runtime.instantiate(overlap, overlapDomain, parametersFor(overlapDomain)), /OVERLAP|COLLISION/);
      const forged = structuredClone(runtime.relocationBundle); forged.routes[0].requiresUnengaged = false;
      forged.routes[0].routeHash = hash(Object.fromEntries(Object.entries(forged.routes[0]).filter(([key]) => key !== 'routeHash')));
      forged.bundleHash = hash(Object.fromEntries(Object.entries(forged).filter(([key]) => key !== 'bundleHash')));
      assert.throws(() => verifyOfficialRelocationFamilySourceBundleV1(forged), /SOURCE_BUNDLE_INVALID/);
      await registerScene(context, spec.id, scene); cases.push({ spec, route, query, parameters });
    }
    const ref = await save('compile.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/consumed.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        const before = await checkpoint(branch); const domain = domainFor(branch.runtime, before.envelope.state);
        const query = branch.runtime.query(before.envelope.state, { queryKind: 'relocation_preview',
          pieceId: 'nova', definitionId, parameters: parametersFor(domain) });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(spec.id)), before);
        await invoke(branch, credentials, 'phase-reactor', row => row.definitionId === definitionId, parametersFor);
        const after = await checkpoint(branch); const state = after.envelope.state;
        assert.equal(actorOf(state).models[0].xInches, 16); assert.equal(actorOf(state).damageMarker, 2);
        assert.equal(actorOf(state).activatedPhases.assault, false); assert.equal(actorOf(state).activatedPhases.movement, false);
        assert.equal(state.selectedRosterActivationWindow.stage, 'before_action');
        const paid = state.log.flatMap(row => row.events || []).filter(row => row.type === 'relocation_resource_paid');
        assert.equal(paid.length, 1); assert.equal(paid[0].resourceType, 'CP'); assert.equal(paid[0].resourceCost, 1);
        assert.equal(paid[0].exhaustedCardInstanceIds.length, 1);
        assert(state.cardResources.player1.filter(row => paid[0].exhaustedCardInstanceIds.includes(row.cardInstanceId)).every(row => row.readiness === 'exhausted'));
        const readyAgain = structuredClone(state); for (const card of readyAgain.cardResources.player1) card.readiness = 'ready';
        assert(!branch.runtime.enumerate(readyAgain).parameterDomains.some(row => row.definitionId === definitionId));
        const engaged = deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes('nova');
        assert.equal(engaged, spec.id === 'land-engaged');
        const bundle = await branch.native.store.loadReplayBundle(roomId(spec.id));
        const first = bundle.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
        assert.deepEqual(first.action, query.result.action);
        const value = { id: spec.id, revision: after.stateRevision, paid, engaged, queryEqualsNativeAction: true,
          actualResourceExhaustion: true, ordinaryActionUnconsumed: true, models: 0 };
        await save(spec.id + '/consumed.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) {
      const saved = await cached(spec.id + '/successor.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(spec.id);
      try {
        const credentials = await branch.native.create(roomId(spec.id), branch.authority);
        if (spec.id === 'attack-after-place') {
          await invoke(branch, credentials, 'ordinary-shot', row => row.actionType === 'ranged_attack' && row.pieceId === 'nova',
            () => ({ targetUnitId: 'target' }));
          for (let count = 0; count < 30; count++) {
            const current = await checkpoint(branch); const state = current.envelope.state;
            if (!state.pendingOfficialRangedPrecisionChoice && !state.pendingCurrentProductRangedCasualtyChoice && !state.pendingAction) break;
            const menu = branch.runtime.enumerate(state);
            if (menu.parameterDomains.length) {
              const domain = menu.parameterDomains[0]; const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
              const field = schema.required[0]; const parameter = schema[field] || schema.properties?.[field];
              const value = parameter.items ? (parameter.items.enum || []).slice(0, parameter.maxItems ?? parameter.minItems ?? 0) : parameter.enum[0];
              await invoke(branch, credentials, 'pool-r' + current.stateRevision, row => row.domainId === domain.domainId, () => ({ [field]: value }));
            } else {
              assert.equal(menu.candidates.length, 1);
              await invoke(branch, credentials, 'pool-r' + current.stateRevision, () => true, null, 'finite');
            }
          }
          const current = await checkpoint(branch);
          if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials,
            'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
          assert(current.envelope.state.log.flatMap(row => row.events || []).some(row => row.type === 'ranged_attack'));
        }
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
        const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
        const value = { id: spec.id, revision: after.stateRevision, nextPlayer: 'player2',
          ordinaryRangedAfterPlace: spec.id === 'attack-after-place' };
        await save(spec.id + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const spec of specs) { const branch = await product.branch(spec.id); try { cases.push(await replay(branch)); } finally { branch.close(); } }
    const ref = await save('cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'nova-phase-reactor', status: main.status, failures: main.failures.length }));

if (process.argv.includes('--legacy')) {
  const legacyRef = parent + 'place-heal/';
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
    factoryModule: 'scripts/support/wave3-room-boundary-fixture-v1.mjs', factoryExport: 'openWave3EngineeringRoomV1',
    sourceRef: legacyRef + 'verification/boundary.json', contractVersion: 'T28-W3-08-Nova-CP-place-preserves-existing-PE-place-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => registry(path.join(root, legacyRef)), check: async product => {
    const archive = await read(parent + 'large-melee-and-groups/space-recovery-manifest.json');
    const cases = [];
    for (const id of ['void-engage', 'blink-shielded']) {
      const saved = await cached('legacy/' + id + '/replay.json'); if (saved) { cases.push(saved); continue; }
      const entry = archive.entries.find(row => row.path === legacyRef + id + '/room.sqlite');
      assert(entry?.restoredByteHashVerified && entry.originalRemoved);
      const bytes = gunzipSync(await fs.readFile(path.join(root, entry.archivePath)));
      assert.equal(bytes.length, entry.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
      const folder = path.join(directory, 'legacy', id); await fs.mkdir(folder, { recursive: true });
      const file = path.join(folder, 'room.sqlite');
      try { assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'), entry.sha256); }
      catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(file, bytes, { flag: 'wx' }); }
      const authority = await read(legacyRef + id + '/authority.json');
      const context = await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-place-heal-' + id + '-v1', purpose: 'ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: [] });
      assert.deepEqual(runtime.descriptor, await read(legacyRef + id + '/runtime.json'));
      const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      try {
        const idOfRoom = 'wave3-place-heal-' + id;
        const before = await native.store.loadRoom(idOfRoom); await native.restoreDependencies(idOfRoom, authority);
        const bundle = await native.store.loadReplayBundle(idOfRoom);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= before.stateRevision; revision++) {
          const replayed = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(replayed.ok, true, JSON.stringify(replayed));
          assert.deepEqual(replayed.envelope, (await read(legacyRef + id + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await native.store.loadRoom(idOfRoom), before);
        const value = { id, sourceArchiveRef: entry.archivePath, restoredSha256: entry.sha256,
          receipts: receipts.length, checkpoints: before.stateRevision + 1, allEnvelopesExact: true,
          descriptorExact: true, originalArchiveUntouched: true };
        await save('legacy/' + id + '/replay.json', value); cases.push(value);
      } finally { native.close(); }
    }
    const ref = await save('legacy-replay.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'nova-phase-reactor-legacy', status: legacy.status, failures: legacy.failures.length }));
}
