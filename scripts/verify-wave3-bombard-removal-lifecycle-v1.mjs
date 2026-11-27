import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct, sceneFor, runtimeFor } from './verify-wave3-bombard-targeting-v1.mjs';
import { openProduct as openReplacementProduct } from './verify-wave3-bombard-replacement-v1.mjs';
import { createOfficialReleaseManifestV2, createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { recordOfficialSupplyLossesV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { verifyOfficialBattlefieldTokenV1 } from '../packages/rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/removal-lifecycle/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const specs = [
  { id: 'cleanup-stay', x: 30, tokenX: 28, includeCreepCard: true },
  { id: 'cleanup-both', x: 30, tokenX: 16, includeCreepCard: true, opponentBile: true },
  { id: 'source-destroyed', x: 30, tokenX: 28, includeCreepCard: true, sourceDestroyed: true },
];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = (spec, phase) => 'wave3-bombard-removal-' + spec.id + '-' + phase;
const releaseId = spec => roomId(spec, 'release');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return prefix + name;
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
  return { ...product, async branch(spec, phase) {
    const authority = await read(prefix + spec.id + '/' + phase + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
    const initial = phase === 'movement' ? authority : await read(prefix + spec.id + '/movement/authority.json');
    const runtime = runtimeFor(context, initial.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + spec.id + '/runtime.json'));
    const branchDirectory = path.join(directory, spec.id, phase);
    const native = openWave3EngineeringRoomV1({ directory: branchDirectory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { authority, context, runtime, native, directory: branchDirectory,
      roomId: roomId(spec, phase), artifactPrefix: spec.id + '/' + phase + '/', close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.artifactPrefix + 'checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope });
  return room;
}
async function authorityFor(context, spec, phase, state, scenario) {
  const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context, state, scenario })));
  const name = spec.id + '/' + phase + '/authority.json';
  const existing = await cached(name);
  if (existing) assert.deepEqual(existing, authority); else await save(name, authority);
}
async function setBomb(branch, credentials, sideKey, pieceId, x) {
  await branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey], operationKey: 'place-' + pieceId,
    select: row => row.actionType === 'set_bile_bomb' && row.pieceId === pieceId,
    parameters: row => ({ coordinate: { xMilliInches: x * 1000, yMilliInches: 8000 },
      paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.choices[0] }) });
  await checkpoint(branch);
  await branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey], operationKey: 'finish-' + pieceId,
    select: row => row.actionType === 'finish_activation' && row.pieceId === pieceId, parameters: () => ({}) });
  await checkpoint(branch);
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Bombard-Removal-Lifecycle-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const cases = [];
      await assert.rejects(() => sceneFor(context, specs[0], { includeBombardReplacement: true,
        includeBombardRemovalLifecycle: true, includeCreepCard: false }), error =>
        error.message === 'RELEASE_ROSTER_CANDIDATE_ILLEGAL');
      await save('excluded-no-creep-card-scenario.json', { reason: 'Every legal Zerg faction requires exactly one Creep Card',
        allFrozenCreepCardsGrantStayInPlay: true, invalidRosterRejected: true,
        nativeNoStayScenarioClaimed: false, modelCalls: 0 });
      for (const spec of specs) {
        const scene = await sceneFor(context, spec, { ...spec, includeBombardReplacement: true, includeBombardRemovalLifecycle: true });
        const runtime = runtimeFor(context, scene.state);
        assert.equal(runtime.descriptor.runtimeVersion, '3.107.0');
        assert.equal(runtime.descriptor.bombardRemovalLifecycleReady, true);
        assert(runtime.descriptor.executableRuleAtomIds.includes('rule-atom:bombard-before-token-removal-creep-v1'));
        const corrupt = structuredClone(scene.state); corrupt.officialBombardRemovalLifecyclePolicy.cleanupPolicyHash = 'invalid';
        assert.throws(() => runtimeFor(context, corrupt), /BOMBARD_REMOVAL_POLICY_INVALID/);
        const runtimeRef = await save(spec.id + '/runtime.json', runtime.descriptor), product = registry();
        try {
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(spec), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
            snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
            sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
              version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(spec), purpose: 'area_ability_component' });
          await authorityFor(resolved, spec, 'movement', scene.state, scene.scenario);
        } finally { product.close(); }
        cases.push({ id: spec.id, sourcePolicy: scene.state.officialBombardRemovalLifecyclePolicy, runtimeVersion: '3.107.0' });
      }
      const ref = await save('compile.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const branch = await product.branch(spec, 'movement');
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          const room = await branch.native.store.loadRoom(branch.roomId); if (room.stateRevision === 0) await checkpoint(branch);
          await setBomb(branch, credentials, 'player2', 'bile', spec.tokenX);
          if (spec.opponentBile) await setBomb(branch, credentials, 'player1', 'target', 38);
          const actual = await branch.native.store.loadRoom(branch.roomId), state = structuredClone(actual.envelope.state);
          assert.equal(state.board.tokens.length, spec.opponentBile ? 2 : 1);
          const scenario = { derivedFrom: prefix + branch.artifactPrefix + 'checkpoint-r' + actual.stateRevision + '.json',
            retainedActualPaymentAndPlacement: true, fullRound: false, fullMatch: false, modelCalls: 0 };
          if (spec.sourceDestroyed) {
            const target = state.pieces.find(piece => piece.id === 'bile');
            applyOfficialSelectedRosterResolvedDamageV1(state, target, resolveOfficialEffectiveCombatProfileV1(state, target), {
              casualtyModelIds: target.models.map(model => model.id), remainingModelIds: [], postDamageMarker: 0,
              targetDestroyed: true, shieldedBefore: false, shieldedAfter: false });
            state.supplyLossLedger = recordOfficialSupplyLossesV1({ stateBefore: actual.envelope.state, stateAfter: state,
              action: { actionType: 'declared_engineering_source_loss' }, events: [],
              rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash }).ledger;
            scenario.declaredSourceDestructionUsingSharedCasualtyAndSupplyWriters = true;
            scenario.nativeCombatDeathClaim = false;
          } else {
            Object.assign(state, { phase: 'cleanup', activeSideKey: state.firstPlayerSideKey,
              currentProductMatchLifecycle: { schema: 'starcraft_tmg_current_product_match_lifecycle_v1', round: 1,
                step: 'cleanup_and_refresh', trainingTruth: false } });
            scenario.declaredCleanupEntry = true;
          }
          await authorityFor(branch.context, spec, 'removal', state, scenario);
          cases.push({ id: spec.id, actualPlacementReceipts: actual.stateRevision, forkAssumptions: scenario });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const saved = await cached(spec.id + '/successor.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(spec, 'removal');
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          const room = await branch.native.store.loadRoom(branch.roomId); if (room.stateRevision === 0) await checkpoint(branch);
          const before = (await read(prefix + branch.artifactPrefix + 'checkpoint-r0.json')).envelope.state;
          verifyOfficialBattlefieldTokenV1(before.board.tokens[0], before.officialBattlefieldTokenMarkerRegistry);
          const corruptToken = structuredClone(before.board.tokens[0]); corruptToken.baseDiameterMm += 1;
          assert.throws(() => verifyOfficialBattlefieldTokenV1(corruptToken, before.officialBattlefieldTokenMarkerRegistry),
            /BATTLEFIELD_TOKEN_INVALID/);
          assert(before.cardResources.player2.some(card => card.readiness === 'exhausted'));
          if (spec.sourceDestroyed) {
            const targetModelId = before.pieces.find(piece => piece.id === 'target').models[0].id;
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'opponent-move',
              select: row => row.actionType === 'move' && row.pieceId === 'target', parameters: () => ({
                leadingModelId: targetModelId, path: [{ xMilliInches: 30200, yMilliInches: 8000 }], placements: [] }) });
          } else {
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2, operationKey: 'cleanup',
              kind: 'finite', select: row => row.action.actionType === 'resolve_current_product_cleanup_refresh' });
          }
          await checkpoint(branch);
          const placementOrder = [];
          for (let index = 0; index < (spec.opponentBile ? 2 : 1); index++) {
            const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
            const status = branch.runtime.query(state, { queryKind: 'bombard_replacement_status' });
            const parent = status.pending;
            assert.equal(parent.stage, 'ready');
            assert.equal(parent.removalCause, spec.sourceDestroyed ? 'source_destroyed' : 'cleanup');
            assert.equal(parent.attackResolutionHash, null);
            assert.equal(state.officialBombardTokenCleanupHistory, undefined);
            assert.deepEqual(state.cardResources, before.cardResources);
            if (!spec.sourceDestroyed) assert.equal(state.currentProductMatchLifecycle.step, 'cleanup_reactions');
            const token = state.board.tokens.find(row => row.tokenId === parent.tokenId);
            const coordinate = { xMilliInches: Math.round(token.coordinate.x * 1000), yMilliInches: 9181 };
            const query = branch.runtime.query(state, { queryKind: 'bombard_creep_placement_preview', parameters: { coordinate } });
            const replacement = await branch.native.commit({ roomId: branch.roomId, credential: credentials[parent.sideKey],
              operationKey: 'replace-' + index, select: row => row.actionType === 'replace_bile_bomb_with_creep',
              parameters: () => ({ coordinate }) });
            assert.deepEqual(replacement.preview.core.action, query.result.action);
            placementOrder.push(parent.sideKey); await checkpoint(branch);
          }
          let after = await branch.native.store.loadRoom(branch.roomId), finalState = after.envelope.state;
          assert.equal(finalState.pendingOfficialBombardReplacement, undefined);
          assert(finalState.officialBombardBindings.every(binding => binding.consumed));
          assert.equal(finalState.officialBombardReplacementHistory.length, spec.opponentBile ? 2 : 1);
          assert(finalState.officialBombardReplacementHistory.every(row => row.attackResolutionHash === null));
          assert(finalState.board.tokens.every(token => token.tokenKind === 'creep_tumor' && token.baseDiameterMm === 28));
          assert.equal(finalState.board.tokens.length, spec.includeCreepCard ? (spec.opponentBile ? 2 : 1) : 0);
          if (spec.opponentBile) assert.deepEqual(placementOrder, ['player2', 'player1']);
          if (spec.sourceDestroyed) {
            assert.equal(finalState.activeSideKey, 'player1');
            assert.equal(finalState.selectedRosterActivationWindow.pieceId, 'target');
            assert.deepEqual(finalState.cardResources, before.cardResources);
            await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1, operationKey: 'opponent-finish',
              select: row => row.actionType === 'finish_activation' && row.pieceId === 'target', parameters: () => ({}) });
            after = await checkpoint(branch); finalState = after.envelope.state;
          } else {
            assert.equal(finalState.pendingOfficialCharacteristicCleanup, undefined);
            assert.equal(finalState.officialBombardTokenCleanupHistory.length, 1);
            assert.equal(finalState.currentProductMatchLifecycle.step, 'determine_initiative');
            assert.equal(finalState.activeSideKey, null);
            assert(Object.values(finalState.cardResources).flat().every(card => card.readiness === 'ready'));
            const menu = branch.runtime.enumerate(finalState, { sideKey: 'player2' });
            assert(menu.candidates.some(row => row.actionType === 'resolve_current_product_next_round_initiative'));
          }
          const value = { id: spec.id, finalRevision: after.stateRevision, placementOrder, queryEqualsNative: true,
            remainingTokenIds: finalState.board.tokens.map(token => token.tokenId),
            replacementsBeforeCleanupAndRefresh: !spec.sourceDestroyed, destructionIsDeclaredScenario: Boolean(spec.sourceDestroyed),
            actualOpponentMoveAndFinish: Boolean(spec.sourceDestroyed), modelCalls: 0 };
          await save(spec.id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) for (const phase of ['movement', 'removal']) {
        const branch = await product.branch(spec, phase);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const names = (await fs.readdir(branch.directory)).filter(name => /^checkpoint-r\d+\.json$/.test(name));
          for (const name of names) {
            const expected = JSON.parse(await fs.readFile(path.join(branch.directory, name), 'utf8')).envelope;
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
          }
          cases.push({ id: spec.id, phase, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true });
        } finally { branch.close(); }
      }
      const legacy = [], oldProduct = openReplacementProduct();
      try {
        for (const spec of [{ id: 'far-wall-hidden' }, { id: 'optional-standard' }]) {
          const branch = await oldProduct.branch(spec);
          try {
            await branch.native.restoreDependencies(branch.roomId, branch.authority);
            const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
            assert.equal(result.ok, true);
            const expected = await read('build/ticket-28-zerg-wave3-20261117-v1/bombard/replacement/' + spec.id + '/checkpoint-r3.json');
            assert.deepEqual(result.envelope, expected.envelope);
            legacy.push({ id: spec.id, runtimeVersion: branch.runtime.descriptor.runtimeVersion, receipts: receipts.length, exactReplay: true });
          } finally { branch.close(); }
        }
      } finally { oldProduct.close(); }
      const ref = await save('cold-recovery.json', { cases, legacy, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-removal-lifecycle', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
