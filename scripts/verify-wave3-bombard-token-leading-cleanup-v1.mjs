import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-bombard-targeting-v1.mjs';
import { mixedScene, runtimeFor } from './verify-wave3-bombard-displacement-combinations-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/token-leading-cleanup/';
const directory = path.join(root, prefix);
const seedRef = 'build/ticket-28-zerg-wave3-20261117-v1/bombard/displacement/combinations/foundation-mixed-qualified/checkpoint-r2.json';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const choices = ['place', 'skip'];
const ids = [...choices, ...choices.map(id => id + '-cleanup')];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const roomId = id => 'wave3-bombard-token-leading-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
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
async function register(context, id, state, scenario) {
  const runtime = runtimeFor(context, state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.108.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: '3.108.0',
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
      scenario: { ...scenario, partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } })));
    const previous = await cached(id + '/authority.json');
    if (previous) assert.deepEqual(authority, previous); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const folder = path.join(directory, id);
    const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, folder, authority, context, runtime, native, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const room = await branch.native.store.loadRoom(branch.roomId);
  await save(branch.id + '/checkpoint-r' + room.stateRevision + '.json', { envelope: room.envelope });
  return room;
}
function placeParameters(state) {
  const actor = state.pieces.find(piece => piece.id === 'watchers');
  const points = [[27600, 9600], [29500, 9600], [27600, 6400], [29500, 6400]];
  assert.equal(actor.models.length, points.length);
  return { choice: 'place', placementPlan: { leadingModelId: actor.models[0].id,
    placements: actor.models.map((model, index) => ({ modelId: model.id,
      xMilliInches: points[index][0], yMilliInches: points[index][1] })) } };
}
function finiteAction(runtime, state, actionType) {
  const candidate = runtime.enumerate(state).candidates.find(row => row.actionType === actionType);
  assert(candidate, 'finite product action missing: ' + actionType);
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => !['isEnabled', 'disabledReason'].includes(key)));
}
async function scene(context) {
  const seed = (await read(seedRef)).envelope.state;
  assert.deepEqual(seed.board.tokens.map(token => token.tokenKind).sort(), ['bile_bomb', 'shade']);
  const fresh = await mixedScene(context, seed, { includeRoundEnd: true });
  assert.deepEqual(seed.officialPsionicTransferSourceBundle, fresh.officialPsionicTransferSourceBundle);
  assert.deepEqual(seed.officialBattlefieldDisplacementSourceBundle, fresh.officialBattlefieldDisplacementSourceBundle);
  const state = structuredClone(seed);
  state.officialPsionicTransferRoundEndPolicy = fresh.officialPsionicTransferRoundEndPolicy;
  state.phase = 'combat'; state.activeSideKey = 'player1';
  state.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' };
  delete state.selectedRosterActivationWindow;
  delete state.currentProductMatchLifecycle;
  for (const side of ['player1', 'player2']) state.players[side].passedPhases.combat = true;
  return state;
}
async function commitFinite(branch, credentials, actionType, operationKey) {
  const state = (await branch.native.store.loadRoom(branch.roomId)).envelope.state;
  await branch.native.commit({ roomId: branch.roomId, credential: credentials[state.activeSideKey], operationKey,
    kind: 'finite', select: row => row.action.actionType === actionType });
  return checkpoint(branch);
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-09-Bombard-Token-Leading-Cleanup-v1' }, steps: [
    { name: 'read', repairRef, openProduct: sourceProduct, check: async context => {
      const state = await scene(context), runtime = runtimeFor(context, state);
      const started = runtime.apply(state, finiteAction(runtime, state, 'begin_psionic_transfer_round_end'), {}).state;
      const domain = runtime.enumerate(started).parameterDomains.find(row => row.actionType === 'choose_psionic_transfer_round_end');
      assert(domain);
      const parameters = placeParameters(started);
      const query = runtime.query(started, { queryKind: 'psionic_transfer_round_end_preview', pieceId: 'watchers', parameters });
      assert.deepEqual(query.result.action, runtime.instantiate(started, domain, parameters).action);
      const invalid = structuredClone(parameters);
      Object.assign(invalid.placementPlan.placements[2], { xMilliInches: 27600, yMilliInches: 7800 });
      assert.throws(() => runtime.instantiate(started, domain, invalid), /TOKEN_MODEL_END_OVERLAP_PROHIBITED/);
      runtime.instantiate(started, domain, { choice: 'skip' });
      const ref = await save('read.json', { retainedActualTokenProduction: true, seedRef,
        roundEndPolicyFromFactory: true, fullFormationPreflightPassed: true,
        bombardOverlapRejected: true, skipPreflightPassed: true, nativeTransitions: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const state = await scene(context);
      for (const id of choices) await register(context, id, state, { derivedFrom: seedRef,
        retainedActualTokenProductionAndPayment: true, declaredCombatEnded: true, choice: id,
        roundEndPolicyFromFactory: true });
      const ref = await save('compile.json', { choices, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of choices) {
        const previous = await cached(id + '/successor.json'); if (previous) { cases.push(previous); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          if ((await branch.native.store.loadRoom(branch.roomId)).stateRevision === 0) await checkpoint(branch);
          const before = (await read(prefix + id + '/checkpoint-r0.json')).envelope.state;
          await commitFinite(branch, credentials, 'begin_psionic_transfer_round_end', 'begin');
          const atChoice = (await read(prefix + id + '/checkpoint-r1.json')).envelope.state;
          const parameters = id === 'place' ? placeParameters(atChoice) : { choice: 'skip' };
          const query = branch.runtime.query(atChoice, { queryKind: 'psionic_transfer_round_end_preview', pieceId: 'watchers', parameters });
          const committed = await branch.native.commit({ roomId: branch.roomId, credential: credentials.player1,
            operationKey: 'choose', select: row => row.actionType === 'choose_psionic_transfer_round_end', parameters: () => parameters });
          assert.deepEqual(committed.preview.core.action, query.result.action); await checkpoint(branch);
          const completed = await commitFinite(branch, credentials, 'complete_psionic_transfer_round_end', 'complete');
          const state = completed.envelope.state;
          assert.equal(state.pendingPsionicTransferRoundEnd, undefined);
          assert.equal(state.psionicTransferRoundEndCompletedRound, 1);
          assert.equal(state.resolvedPsionicTransferRoundEnd.length, 1);
          assert.equal(state.resolvedPsionicTransferRoundEnd[0].choice, id);
          assert.deepEqual(state.board.tokens, before.board.tokens);
          assert.deepEqual(state.pendingPsionicTransferEffects, before.pendingPsionicTransferEffects);
          assert.deepEqual(state.cardResources, before.cardResources);
          const positions = value => value.pieces.find(piece => piece.id === 'watchers').models.map(model => [model.xInches, model.yInches]);
          if (id === 'place') assert.deepEqual(positions(state), parameters.placementPlan.placements.map(row => [row.xMilliInches / 1000, row.yMilliInches / 1000]));
          else assert.deepEqual(positions(state), positions(before));
          const cleanupState = structuredClone(state);
          Object.assign(cleanupState, { phase: 'cleanup', activeSideKey: state.firstPlayerSideKey,
            currentProductMatchLifecycle: { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
              round: 1, step: 'cleanup_and_refresh', trainingTruth: false } });
          await register(branch.context, id + '-cleanup', cleanupState, {
            derivedFrom: prefix + id + '/checkpoint-r3.json', retainedActualRoundEndChoices: true, declaredCleanupEntry: true });
          const value = { id, receipts: completed.stateRevision, choice: id, queryEqualsNative: true,
            tokensAndPaymentPreservedUntilCleanup: true, actualFormationPlaced: id === 'place', modelCalls: 0 };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const choice of choices) {
        const id = choice + '-cleanup', previous = await cached(id + '/successor.json');
        if (previous) { cases.push(previous); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority);
          if ((await branch.native.store.loadRoom(branch.roomId)).stateRevision === 0) await checkpoint(branch);
          const before = (await read(prefix + id + '/checkpoint-r0.json')).envelope.state;
          const pending = await commitFinite(branch, credentials, 'resolve_current_product_cleanup_refresh', 'cleanup');
          const waiting = pending.envelope.state;
          assert.equal(waiting.pendingPsionicTransferEffects.length, 0);
          assert.deepEqual(waiting.board.tokens.map(token => token.tokenKind), ['bile_bomb']);
          assert.equal(waiting.currentProductMatchLifecycle.step, 'cleanup_reactions');
          assert.deepEqual(waiting.cardResources, before.cardResources);
          const parent = branch.runtime.query(waiting, { queryKind: 'bombard_replacement_status' }).pending;
          assert.equal(parent.removalCause, 'cleanup'); assert.equal(parent.sideKey, 'player2');
          const parameters = { coordinate: { xMilliInches: 26819, yMilliInches: 8000 } };
          const query = branch.runtime.query(waiting, { queryKind: 'bombard_creep_placement_preview', parameters });
          const applied = await branch.native.commit({ roomId: branch.roomId, credential: credentials.player2,
            operationKey: 'replace', select: row => row.actionType === 'replace_bile_bomb_with_creep', parameters: () => parameters });
          assert.deepEqual(applied.preview.core.action, query.result.action);
          const completed = await checkpoint(branch), state = completed.envelope.state;
          assert.equal(state.pendingOfficialBombardReplacement, undefined);
          assert.equal(state.pendingOfficialCharacteristicCleanup, undefined);
          assert.equal(state.officialBombardReplacementHistory.length, 1);
          assert.equal(state.officialBombardTokenCleanupHistory.length, 1);
          assert.equal(state.psionicTransferCleanupHistory.length, 1);
          assert.deepEqual(state.board.tokens.map(token => [token.tokenKind, token.baseDiameterMm]), [['creep_tumor', 28]]);
          assert.equal(state.currentProductMatchLifecycle.step, 'determine_initiative');
          assert.equal(state.activeSideKey, null);
          assert(Object.values(state.cardResources).flat().every(card => card.readiness === 'ready'));
          assert(branch.runtime.enumerate(state, { sideKey: 'player2' }).candidates.some(row => row.actionType === 'resolve_current_product_next_round_initiative'));
          const value = { id, receipts: completed.stateRevision, shadeCleanupBeforeBombardReplacement: true,
            creepRetainedAfterRefresh: true, queryEqualsNative: true, nativeInitiativeSuccessor: true, modelCalls: 0 };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const prior = await cached(id + '/cold-recovery.json'); if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
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
          const value = { id, receipts: receipts.length, namedCheckpoints: names.length, exactReplay: true };
          await save(id + '/cold-recovery.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases, modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'bombard-token-leading-cleanup', status: gate.status, failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
