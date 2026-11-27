import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, sceneFor, runtimeFor, openProduct as openTargetingProduct } from './verify-wave3-bombard-targeting-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialBombardReplacementRuntimeV1 } from '../packages/product-composition/official-bombard-replacement-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1 } from '../packages/rule-atoms/official-token-displacement-geometry-v1.mjs';
import { evaluateOfficialPhysicalFootprintRelationV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { isOfficialCurrentProductUnitOnCreepV1 } from '../packages/product-composition/official-current-product-state-facts-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, commitWave3RangedBatchV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/replacement/';
const targetingPrefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/targeting/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const specs = [{ id: 'far-wall-hidden', x: 30, tokenX: 28, hidden: true, wall: true, attackMode: 'bombard' },
  { id: 'optional-standard', x: 15, tokenX: 18, hidden: false, wall: false }];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = spec => 'wave3-bombard-replacement-' + spec.id;
const releaseId = spec => roomId(spec) + '-v1';
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(spec) {
    const authority = await read(prefix + spec.id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + spec.id + '/runtime.json'));
    const branchDirectory = path.join(directory, spec.id);
    const native = openWave3EngineeringRoomV1({ directory: branchDirectory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, directory: branchDirectory, roomId: roomId(spec),
      artifactPrefix: spec.id + '/', close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.artifactPrefix + 'checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope }); return room;
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Replacement-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const cases = [];
      for (const spec of specs) {
        const factoryScene = await sceneFor(context, spec, { includeBombardReplacement: true });
        const original = (await read(targetingPrefix + spec.id + '/assault/checkpoint-r0.json')).envelope;
        assert.deepEqual(original.state.officialBombardSourceBundle, factoryScene.state.officialBombardSourceBundle);
        assert.deepEqual(original.state.officialBombardTargetingPolicy, factoryScene.state.officialBombardTargetingPolicy);
        const state = { ...structuredClone(original.state),
          officialBombardReplacementPolicy: factoryScene.state.officialBombardReplacementPolicy };
        const runtime = runtimeFor(context, state);
        assert.equal(runtime.descriptor.runtimeVersion, '3.106.0');
        assert.equal(runtime.query(state, { queryKind: 'bombard_replacement_status' }).pending, null);
        assert.throws(() => runtime.query(state, { queryKind: 'bombard_creep_placement_preview', parameters: { coordinate: {
          xMilliInches: spec.tokenX * 1000, yMilliInches: 9181 } } }), /BOMBARD_REPLACEMENT_UNAVAILABLE/);
        const corrupt = structuredClone(state); corrupt.officialBombardReplacementPolicy.sourceBundleHash = 'invalid';
        assert.throws(() => runtimeFor(context, corrupt), /BOMBARD_REPLACEMENT_POLICY_INVALID/);
        const completed = (await read(targetingPrefix + spec.id + '/assault/shot-checkpoint.json')).envelope.state;
        const priorEvent = (await read(targetingPrefix + spec.id + '/native.json')).event;
        let unsettled = true;
        const handoff = createOfficialBombardReplacementRuntimeV1({ context, state,
          hasUnsettledAttack: () => unsettled });
        const injected = { ...structuredClone(completed), officialBombardReplacementPolicy: state.officialBombardReplacementPolicy };
        const waiting = handoff.afterTransition({ ok: true, state: injected, events: [priorEvent] });
        assert.equal(handoff.pending(waiting.state).stage, 'waiting'); assert.equal(handoff.enumerate(waiting.state).parameterDomains.length, 0);
        unsettled = false;
        const ready = handoff.afterTransition({ ...waiting, events: [] });
        assert.equal(handoff.pending(ready.state).stage, 'ready'); assert.equal(handoff.enumerate(ready.state).parameterDomains.length, 1);
        await save(spec.id + '/injected-handoff.json', { sourceShot: targetingPrefix + spec.id + '/assault/shot-checkpoint.json',
          consumerStillUnsettledThenSettled: true, waitingThenReady: true, acceptedNativeTransitions: 0, modelCalls: 0 });
        const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor), product = registry();
        try {
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
            snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
            sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
              version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
          const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, state, scenario: {
            derivedFrom: targetingPrefix + spec.id + '/assault/checkpoint-r0.json', factoryProducedNewPolicy: true,
            retainedActualPlacementPaymentAndPositions: true, declaredNewRuntimeComposition: true, fullMatch: false, modelCalls: 0 } });
          const existing = await cached(spec.id + '/authority.json');
          if (existing) assert.deepEqual(existing, authority); else await save(spec.id + '/authority.json', authority);
        } finally { product.close(); }
        cases.push({ id: spec.id, runtimeVersion: runtime.descriptor.runtimeVersion, handoffInjected: true });
      }
      const ref = await save('compile.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const existing = await cached(spec.id + '/native.json'); if (existing) { cases.push(existing); continue; }
        const branch = await product.branch(spec);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          const current = await branch.native.store.loadRoom(branch.roomId); if (current.stateRevision === 0) await checkpoint(branch);
          const shot = await commitWave3RangedBatchV1({ directory: branch.directory, native: branch.native, runtime: branch.runtime,
            roomId: branch.roomId, credentials, attackerSideKey: 'player2', attackerPieceId: 'bile', targetPieceId: 'target',
            weaponName: 'Bile Bomb', attackMode: spec.attackMode, operationKey: 'shot' });
          await checkpoint(branch);
          const state = shot.after.envelope.state;
          const status = branch.runtime.query(state, { queryKind: 'bombard_replacement_status' });
          assert.equal(status.pending.stage, 'ready'); assert.equal(state.board.tokens.length, 1);
          const menu = branch.runtime.enumerate(state);
          assert.equal(menu.parameterDomains.length, 1); assert.equal(menu.parameterDomains[0].actionType, 'replace_bile_bomb_with_creep');
          const coordinate = { xMilliInches: spec.tokenX * 1000, yMilliInches: 9181 };
          const query = branch.runtime.query(state, { queryKind: 'bombard_creep_placement_preview', parameters: { coordinate } });
          assert.equal(query.result.action.sourceAction.token.baseDiameterMm, 28);
          assert.throws(() => branch.runtime.query(state, { queryKind: 'bombard_creep_placement_preview', parameters: {
            coordinate: { xMilliInches: spec.tokenX * 1000, yMilliInches: 8000 } } }), /BOMBARD_REPLACEMENT_BASE_TO_BASE_REQUIRED/);
          assert.throws(() => branch.runtime.query(state, { queryKind: 'bombard_creep_placement_preview', parameters: {
            coordinate: { xMilliInches: spec.tokenX * 1000, yMilliInches: 12000 } } }), /BOMBARD_REPLACEMENT_BASE_TO_BASE_REQUIRED/);
          assert.throws(() => branch.runtime.instantiate(state, menu.parameterDomains[0], { coordinate, parentHash: status.pending.parentHash }),
            /BOMBARD_REPLACEMENT_SEMANTIC_PARAMETERS_REQUIRED/);
          const replacement = await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2,
            operationKey: 'replace-token', select: row => row.actionType === 'replace_bile_bomb_with_creep', parameters: () => ({ coordinate }) });
          assert.deepEqual(replacement.preview.core.action, query.result.action);
          const after = await checkpoint(branch), finalState = after.envelope.state;
          assert.equal(finalState.board.tokens.length, 1); assert.equal(finalState.board.tokens[0].tokenKind, 'creep_tumor');
          assert.equal(finalState.pendingOfficialBombardReplacement, undefined);
          assert.equal(finalState.officialBombardReplacementHistory.length, 1);
          assert.equal(finalState.officialBombardBindings[0].consumed, true);
          assert.equal(branch.runtime.query(finalState, { queryKind: 'bombard_status' }).bindings.length, 0);
          assert.deepEqual(finalState.cardResources, shot.before.envelope.state.cardResources);
          const contact = evaluateOfficialPhysicalFootprintRelationV1({ left: createOfficialDisplacementTokenFootprintV1(state.board.tokens[0]),
            right: createOfficialDisplacementTokenFootprintV1(finalState.board.tokens[0]) });
          assert.equal(contact.overlappingInteriors, false); assert(contact.minimumSeparationMilliInches <= 1);
          const conditional = structuredClone(finalState);
          const source = conditional.pieces.find(row => row.id === 'bile');
          source.models[0].xInches = spec.tokenX; source.models[0].yInches = 14;
          assert.equal(isOfficialCurrentProductUnitOnCreepV1(conditional, source), true);
          const value = { id: spec.id, revision: after.stateRevision, attackMode: spec.attackMode || 'standard', event: shot.event,
            replacementToken: finalState.board.tokens[0], contact, noAdditionalPayment: true, queryEqualsNative: true,
            idempotence: replacement.idempotentReplayVerified, conditionalOnCreepProjection: true,
            onCreepProjectionIsDeclaredGeometry: true, modelCalls: 0 };
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
          await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'finish',
            select: row => row.actionType === 'finish_activation' && row.pieceId === 'bile', parameters: () => ({}) });
          const after = await checkpoint(branch);
          assert.equal(after.envelope.state.selectedRosterActivationWindow, undefined);
          assert.equal(after.envelope.state.officialBombardReplacementHistory.length, 1);
          cases.push({ id: spec.id, revision: after.stateRevision, parentActivationFinished: true });
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const branch = await product.branch(spec);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(branch.directory)).filter(name => name.endsWith('checkpoint.json') || /^checkpoint-r\d+\.json$/.test(name));
          for (const name of names) {
            const expected = JSON.parse(await fs.readFile(path.join(branch.directory, name), 'utf8')).envelope;
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
          }
          cases.push({ id: spec.id, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true });
        } finally { branch.close(); }
      }
      const oldProduct = openTargetingProduct(); const legacy = [];
      try {
        for (const spec of specs) {
          const branch = await oldProduct.branch(spec, 'assault');
          try {
            await branch.native.restoreDependencies(branch.roomId, branch.authority);
            const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
            assert.equal(result.ok, true); assert.deepEqual(result.envelope,
              (await read(targetingPrefix + spec.id + '/assault/checkpoint-r2.json')).envelope);
            legacy.push({ id: spec.id, runtimeVersion: branch.runtime.descriptor.runtimeVersion, receipts: receipts.length, exactReplay: true });
          } finally { branch.close(); }
        }
      } finally { oldProduct.close(); }
      const ref = await save('cold-recovery.json', { cases, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-replacement', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export { openProduct };
