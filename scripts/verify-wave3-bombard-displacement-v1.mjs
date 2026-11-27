import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, sceneFor, runtimeFor } from './verify-wave3-bombard-targeting-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/movement/';
const originalPrefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/removal-lifecycle/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const specs = [{ id: 'bile-bomb' }, { id: 'creep-tumor', creep: true }, { id: 'plain-move', plain: true }];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = spec => 'wave3-bombard-displacement-' + spec.id;
const releaseId = spec => roomId(spec) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const authority = await read(prefix + spec.id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + spec.id + '/runtime.json'));
    const folder = path.join(directory, spec.id);
    const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, folder, roomId: roomId(spec), close: () => native.close() };
  } };
}
async function checkpoint(branch, spec) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(spec.id + '/checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope }); return room;
}
function selection(runtime, state, spec) {
  const actor = state.pieces.find(piece => piece.id === 'target');
  const token = state.board.tokens[0];
  const core = { leadingModelId: actor.models[0].id,
    path: [{ xMilliInches: spec.plain ? 31000 : Math.round(token.coordinate.x * 1000),
      yMilliInches: spec.plain ? 8000 : Math.round(token.coordinate.y * 1000) }], placements: [] };
  const request = { queryKind: 'battlefield_token_displacement', pieceId: actor.id, actionType: 'move',
    parameters: core, tokenId: token.tokenId };
  const proof = spec.plain ? null : runtime.query(state, request);
  if (proof) {
    assert.equal(proof.controllerSideKey, 'player1'); assert.equal(typeof proof.sourceBindingHash, 'string');
    assert.equal(proof.sourceEffectHash, undefined); assert.equal(proof.solution.baseContactPossible, true);
  }
  const parameters = { ...core, ...(proof ? { tokenDisplacements: [{ tokenId: token.tokenId,
    coordinate: proof.solution.bestWitness.coordinate }] } : {}) };
  return { core, proof, parameters };
}
async function legacyReplay({ folder, id, release, runtimeBuilder, expected }) {
  const product = registry(path.join(root, folder));
  try {
    const authority = await read(folder + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: release, purpose: 'area_ability_component' });
    const runtime = runtimeBuilder(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(folder + id + '/runtime.json'));
    const archive = await fs.readFile(path.join(root, folder, id, 'room.sqlite.gz'));
    const restored = gunzipSync(archive);
    const isolated = path.join(directory, 'legacy-control', id);
    await fs.mkdir(isolated, { recursive: true });
    const database = path.join(isolated, 'room.sqlite');
    try { await fs.access(database); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(database, restored, { flag: 'wx' }); }
    await save('legacy-control/' + id + '/archive-source.json', {
      originalArchive: folder + id + '/room.sqlite.gz',
      archiveSha256: createHash('sha256').update(archive).digest('hex'),
      restoredByteLength: restored.length, restoredSha256: createHash('sha256').update(restored).digest('hex'),
      originalArchivePreserved: true, modelCalls: 0 });
    const native = openWave3EngineeringRoomV1({ directory: isolated, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      const rid = folder.includes('displacement-movement') ? 'wave2-displacement-movement-' + id
        : 'wave3-bombard-removal-' + id + '-removal';
      await native.restoreDependencies(rid, authority);
      const bundle = await native.store.loadReplayBundle(rid);
      const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, (await read(expected)).envelope);
      return { folder, id, runtimeVersion: runtime.descriptor.runtimeVersion, receipts: receipts.length,
        restoredFromOriginalArchive: true, finalExact: true };
    } finally { native.close(); }
  } finally { product.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Displacement-Movement-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const fresh = await sceneFor(context, { x: 30, tokenX: 28 }, {
        includeBombardReplacement: true, includeBombardRemovalLifecycle: true, includeBattlefieldDisplacement: true });
      const cases = [];
      for (const spec of specs) {
        const original = originalPrefix + 'cleanup-stay/' + (spec.creep ? 'removal' : 'movement') + '/checkpoint-r2.json';
        const state = structuredClone((await read(original)).envelope.state);
        for (const field of ['officialBattlefieldDisplacementSourceBundle', 'officialBattlefieldDisplacementQueryPolicy',
          'officialBattlefieldDisplacementPolicy']) state[field] = structuredClone(fresh.state[field]);
        assert.deepEqual(state.officialBombardSourceBundle, fresh.state.officialBombardSourceBundle);
        Object.assign(state, { phase: 'movement', activeSideKey: 'player1' });
        delete state.currentProductMatchLifecycle;
        const runtime = runtimeFor(context, state);
        assert.equal(runtime.descriptor.runtimeVersion, '3.108.0');
        const selected = selection(runtime, state, spec);
        const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'move' && row.pieceId === 'target');
        assert(domain.parameterSchema.tokenDisplacements.optional);
        const candidate = runtime.instantiate(state, domain, selected.parameters);
        assert.equal(candidate.action.sourceRuntimeKind, spec.plain ? 'spatial' : 'battlefield_displacement');
        if (!spec.plain) {
          assert.throws(() => runtime.instantiate(state, domain, selected.core), /PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED/);
          const bad = structuredClone(selected.parameters); bad.tokenDisplacements[0].sourceBindingHash = 'caller-authored';
          assert.throws(() => runtime.instantiate(state, domain, bad), /PSIONIC_DISPLACEMENT_CHOICES_INVALID/);
          const far = structuredClone(selected.parameters);
          far.tokenDisplacements[0].coordinate = { xMilliInches: 1000, yMilliInches: 1000 };
          assert.throws(() => runtime.instantiate(state, domain, far), /PSIONIC_DISPLACEMENT_COORDINATE_NOT_RULE_LEGAL/);
          const corrupt = structuredClone(state);
          if (spec.creep) corrupt.officialBattlefieldAssetBindings[0].assetHash = 'invalid';
          else corrupt.officialBombardBindings[0].sourcePieceId = 'target';
          assert.throws(() => selection(runtime, corrupt, spec), /BINDING_INVALID/);
        }
        const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor), product = registry();
        try {
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset, snapshot: context.snapshot,
            sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
            sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: '3.108.0',
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
          const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, state, scenario: {
            derivedFrom: original, newPoliciesFromProductFactory: true, declaredMovementPhase: Boolean(spec.creep),
            retainedActualTokenAndPayment: true, fullRound: false, fullMatch: false, modelCalls: 0 } })));
          const prior = await cached(spec.id + '/authority.json');
          if (prior) assert.deepEqual(prior, authority); else await save(spec.id + '/authority.json', authority);
        } finally { product.close(); }
        cases.push({ id: spec.id, expectedKind: spec.plain ? 'spatial' : 'battlefield_displacement', source: original });
      }
      const ref = await save('compile.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const prior = await cached(spec.id + '/native.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          const room = await branch.native.store.loadRoom(branch.roomId); if (room.stateRevision === 0) await checkpoint(branch, spec);
          const before = (await read(prefix + spec.id + '/checkpoint-r0.json')).envelope.state;
          const selected = selection(branch.runtime, before, spec);
          const query = branch.runtime.query(before, { queryKind: 'battlefield_displacement_preview', pieceId: 'target',
            actionType: 'move', parameters: selected.parameters });
          assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), room);
          const committed = await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'move',
            select: row => row.actionType === 'move' && row.pieceId === 'target', parameters: () => selected.parameters });
          assert.deepEqual(committed.preview.core.action, query.result.action);
          const after = await checkpoint(branch, spec), state = after.envelope.state;
          assert.deepEqual(state.cardResources, before.cardResources);
          if (spec.plain) {
            assert.deepEqual(state.board.tokens, before.board.tokens); assert.equal(state.battlefieldTokenDisplacementHistory, undefined);
          } else {
            assert.equal(state.battlefieldTokenDisplacementHistory.length, 1);
            assert.equal(state.battlefieldTokenDisplacementHistory[0].evidence[0].sourceEffectHash, undefined);
            assert.equal(typeof state.battlefieldTokenDisplacementHistory[0].evidence[0].sourceBindingHash, 'string');
            const event = state.log.flatMap(row => row.events || []).find(row => row.type === 'battlefield_token_displaced');
            assert(event); assert.equal(event.controllerSideKey, 'player1');
            if (spec.creep) {
              assert.equal(state.board.tokens.length, 0);
              assert(state.officialBattlefieldAssetBindings.every(binding => binding.consumed));
              assert(state.log.flatMap(row => row.events || []).some(row => row.type === 'creep_tumor_removed'));
            } else {
              const token = state.board.tokens[0]; assert.notEqual(token.tokenHash, before.board.tokens[0].tokenHash);
              assert.deepEqual(token.coordinate, { x: selected.parameters.tokenDisplacements[0].coordinate.xMilliInches / 1000,
                y: selected.parameters.tokenDisplacements[0].coordinate.yMilliInches / 1000 });
              assert.equal(branch.runtime.query(state, { queryKind: 'bombard_status' }).bindings[0].tokenHash, token.tokenHash);
            }
          }
          const value = { id: spec.id, revision: after.stateRevision, queryEqualsNative: true,
            movedToken: !spec.plain, creepRemovedAfterEnemyMovement: Boolean(spec.creep),
            idempotence: committed.idempotentReplayVerified, modelCalls: 0 };
          await save(spec.id + '/native.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'finish',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
          const after = await checkpoint(branch, spec);
          assert.equal(after.envelope.state.selectedRosterActivationWindow, undefined);
          assert.equal((after.envelope.state.battlefieldTokenDisplacementHistory || []).length, spec.plain ? 0 : 1);
          cases.push({ id: spec.id, revision: after.stateRevision, originalActivationFinished: true });
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const prior = await cached(spec.id + '/cold-recovery.json');
        if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(spec);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(branch.folder)).filter(name => /^checkpoint-r\d+\.json$/.test(name));
          for (const name of names) {
            const expected = JSON.parse(await fs.readFile(path.join(branch.folder, name), 'utf8')).envelope;
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
          }
          const value = { id: spec.id, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true };
          await save(spec.id + '/cold-recovery.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const old = 'build/ticket-28-wave2-capabilities-20261113-v1/displacement-movement/';
      const legacy = [await legacyReplay({ folder: old, id: 'enemy', release: 'wave3-displacement-movement-enemy-v1',
        runtimeBuilder: (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
          definitionIds: ['unit:nerazim_watchers__adept_/path-of-shadows-any-phase@1'] }), expected: old + 'enemy/checkpoint-r2.json' })];
      const oldProduct = registry(path.join(root, originalPrefix));
      try {
        const spec = { id: 'cleanup-stay' }, authority = await read(originalPrefix + spec.id + '/removal/authority.json');
        const context = await oldProduct.resolver.resolve({ releaseId: 'wave3-bombard-removal-cleanup-stay-release', purpose: 'area_ability_component' });
        const runtime = runtimeFor(context, authority.state);
        assert.deepEqual(runtime.descriptor, await read(originalPrefix + spec.id + '/runtime.json'));
        const native = openWave3EngineeringRoomV1({ directory: path.join(root, originalPrefix, spec.id, 'removal'), filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          const rid = 'wave3-bombard-removal-cleanup-stay-removal';
          await native.restoreDependencies(rid, authority);
          const bundle = await native.store.loadReplayBundle(rid);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
          assert.equal(result.ok, true); assert.deepEqual(result.envelope, (await read(originalPrefix + spec.id + '/removal/checkpoint-r2.json')).envelope);
          legacy.push({ id: 'bombard-cleanup', runtimeVersion: runtime.descriptor.runtimeVersion, receipts: receipts.length, finalExact: true });
        } finally { native.close(); }
      } finally { oldProduct.close(); }
      const ref = await save('cold-recovery.json', { cases, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-displacement-movement', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
