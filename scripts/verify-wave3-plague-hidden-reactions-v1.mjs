import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sceneFor } from './verify-wave3-plague-cast-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { projectOfficialCharacteristicStatusFamilyModifiersV1 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/plague-hidden-reactions/';
const directory = path.join(root, prefix), sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const pathId = 'unit:nerazim_watchers__adept_/path-of-shadows-any-phase@1';
const mightId = 'card:nerazim/might-of-the-nerazim-any@1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const hasHidden = actor => actor.statuses.some(row => String(typeof row === 'string' ? row : row.statusName).toLowerCase() === 'hidden');
const roomId = id => 'wave3-plague-hidden-' + id, releaseId = id => roomId(id) + '-v1';
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [pathId], includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
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
async function makeScene(context) {
  const environment = (await sceneFor(context)).state;
  const unit = (unitInstanceId, key, upgrades = []) => ({ unitInstanceId, recordKey: 'army_units:' + key,
    compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context, includePlague: true, includeCharacteristicConsumers: true,
    includeActionPerformedStatusLifecycle: true, canonicalResourceTypes: true,
    characteristicDefinitionIds: [pathId], reactionDefinitionIds: [mightId],
    blastTemplateGeometryAsset: environment.officialBlastTemplateGeometryAsset,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', [{ upgradeName: 'Plague' }])] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'],
        units: [unit('watchers', 'nerazim_watchers__adept_')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
    'officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    round: 1, phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  arrange(piece(state, 'defiler'), 12, 26); arrange(piece(state, 'watchers'), 20, 26); declareCoherency(state);
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { conditionalEngineeringScene: true, partialLegalRosters: true, declaredPositionsAndMovementEntry: true,
    initialHiddenDeclared: false, actualHiddenAbilityRequired: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  if (await cached(id + '/authority.json')) return;
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.122.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry(), m = context.manifest;
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: bound, ...scene }));
  } finally { product.close(); }
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, roomId: roomId(id), close: () => native.close() };
  } };
}
async function invoke(branch, credentials, sideKey, operationKey, select, parameters) {
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey], operationKey, select, parameters });
  await checkpoint(branch); return result;
}
function modifiers(state) {
  return projectOfficialCharacteristicStatusFamilyModifiersV1(state.officialCharacteristicStatusFamilySourceBundle, state,
    { pieceId: 'watchers', context: { attackKind: 'ranged' } });
}
async function produceHidden(product) {
  const branch = await product.branch('hidden-source');
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const initial = (await read(prefix + 'hidden-source/checkpoint-r0.json')).envelope.state;
    const robotics = initial.cardResources.player2.find(row => row.officialCardRecordKey === 'tactical_cards:robotics_facility');
    assert(robotics); assert(!hasHidden(piece(initial, 'watchers')));
    await invoke(branch, credentials, 'player2', 'path-of-shadows', row => row.definitionId === pathId && row.pieceId === 'watchers',
      () => ({ activeUnitId: 'watchers', paymentCardInstanceIds: [robotics.cardInstanceId] }));
    const afterPath = (await read(prefix + 'hidden-source/checkpoint-r1.json')).envelope.state;
    assert(hasHidden(piece(afterPath, 'watchers'))); assert.equal(afterPath.pendingOfficialHiddenLossReaction, undefined);
    await invoke(branch, credentials, 'player2', 'finish-path', row => row.actionType === 'finish_activation' && row.pieceId === 'watchers', () => ({}));
    const after = await checkpoint(branch); assert(hasHidden(piece(after.envelope.state, 'watchers')));
    assert.equal(after.envelope.state.activeSideKey, 'player1');
    for (const id of ['use', 'pass']) {
      const state = structuredClone(after.envelope.state);
      state.phase = 'assault'; state.activeSideKey = 'player1';
      state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
      await registerScene(branch.context, id, { state: refreshOfficialReleaseRosterDerivedStateV2({ context: branch.context, state }),
        scenario: { sourceCheckpointRef: prefix + 'hidden-source/checkpoint-r' + after.stateRevision + '.json',
          retainedActualHiddenAndPayment: true, declaredSameRoundAssaultEntry: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
    }
    return { actualHiddenProduced: true, sourceCheckpointRef: prefix + 'hidden-source/checkpoint-r2.json', modelCalls: 0 };
  } finally { branch.close(); }
}
async function cast(product, id) {
  const old = await cached(id + '/cast.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const before = (await read(prefix + id + '/checkpoint-r0.json')).envelope.state;
    assert(hasHidden(piece(before, 'watchers')));
    const aggregate = await branch.native.store.loadRoom(branch.roomId);
    const coverage = branch.runtime.query(before, { queryKind: 'plague_template_coverage', sourcePieceId: 'defiler',
      coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: 3 });
    const parameters = { coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: 3,
      paymentCardInstanceIds: coverage.payment.cardOnlyPayments[0].cardInstanceIds };
    const query = branch.runtime.query(before, { queryKind: 'plague_cast_preview', pieceId: 'defiler', parameters });
    assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), aggregate);
    const applied = await invoke(branch, credentials, 'player1', 'plague', row => row.actionType === 'cast_plague' && row.pieceId === 'defiler', () => parameters);
    assert.deepEqual(applied.preview.core.action, query.result.action);
    const after = (await read(prefix + id + '/checkpoint-r1.json')).envelope.state;
    assert(!hasHidden(piece(after, 'watchers')));
    assert.equal(after.pendingOfficialHiddenLossReaction.stage, 'reaction');
    assert.equal(after.pendingOfficialHiddenLossReaction.losses.length, 1);
    assert.equal(after.pendingOfficialReactionWindow.triggerKind, 'hidden_lost');
    assert.equal(after.selectedRosterActivationWindow.pieceId, 'defiler');
    assert.equal(after.officialPlagueUseHistory.length, 1);
    const resolved = after.officialPlagueUseHistory[0].resolutions.find(row => row.targetPieceId === 'watchers');
    assert(resolved.hiddenLost); assert.deepEqual(resolved.nonLethal.casualtyModelIds, []);
    assert.equal(piece(after, 'watchers').currentModels, piece(before, 'watchers').currentModels);
    assert.throws(() => branch.runtime.lifecycle(after, { eventKind: 'cleanup_and_refresh' }), /HIDDEN_LOSS_REACTION_CONTINUATION_REQUIRED/);
    const corrupt = structuredClone(after); delete corrupt.pendingOfficialHiddenLossReaction;
    assert.throws(() => branch.runtime.enumerate(corrupt), /HIDDEN_LOSS_REACTION_PARENT/);
    const result = { id, actualPlagueHiddenLoss: true, queryEqualsPreview: true, resolved,
      wrongParentRejected: true, modelCalls: 0 };
    await save(id + '/cast.json', result); return result;
  } finally { branch.close(); }
}
async function settle(product, id) {
  const old = await cached(id + '/result.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority);
    for (let index = 0; index < 4; index++) {
      const current = await checkpoint(branch), state = current.envelope.state;
      if (!state.pendingOfficialHiddenLossReaction) break;
      const use = id === 'use' && state.activeSideKey === 'player2' && branch.runtime.enumerate(state).parameterDomains
        .some(row => row.actionType === 'resolve_reaction_family_ability');
      await invoke(branch, credentials, state.activeSideKey, 'reaction-' + current.stateRevision,
        row => row.actionType === (use ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window'),
        () => use ? { paymentCardInstanceIds: [] } : {});
    }
    const reacted = await checkpoint(branch), state = reacted.envelope.state;
    assert.equal(state.pendingOfficialHiddenLossReaction, undefined); assert.equal(state.pendingOfficialReactionWindow, undefined);
    assert.equal(state.officialHiddenLossReactionHistory.length, 1); assert.equal(state.activeSideKey, 'player1');
    const facts = modifiers(state);
    assert.equal(facts.speedModifier, id === 'use' ? 2 : 0); assert.equal(facts.criticalHit, id === 'use' ? 2 : 0);
    const faction = state.cardResources.player2.find(row => row.cardKind === 'faction');
    assert.equal(faction.readiness, id === 'use' ? 'exhausted' : 'ready');
    assert.equal(state.selectedRosterActivationWindow.pieceId, 'defiler');
    await save(id + '/after-reaction.json', { envelope: reacted.envelope, actualReactionFacts: facts });
    await invoke(branch, credentials, 'player1', 'finish-plague', row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', () => ({}));
    const after = await checkpoint(branch);
    assert.equal(after.envelope.state.activeSideKey, 'player2'); assert.equal(after.envelope.state.pendingOfficialHiddenLossReaction, undefined);
    assert.equal(after.envelope.state.officialHiddenLossReactionHistory.length, 1);
    const result = { id, actualReactionUsed: id === 'use', speedModifier: facts.speedModifier, criticalHit: facts.criticalHit,
      reactionReturnedToOriginalCaster: true, activationFinished: true, nextSide: 'player2', noRepeatedHiddenLoss: true,
      checkpointRef: prefix + id + '/checkpoint-r' + after.stateRevision + '.json', modelCalls: 0 };
    await save(id + '/result.json', result); return result;
  } finally { branch.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Plague-Hidden-Loss-Reaction-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await makeScene(context); assert(!hasHidden(piece(scene.state, 'watchers')));
      assert.equal(runtimeFor(context, scene.state).hiddenLossReactions.pending(scene.state), null);
      await registerScene(context, 'hidden-source', scene);
      const ref = await save('compile.json', { actualRosterFactory: true, pathId, mightId, sourceHiddenNotDeclared: true,
        runtimeVersion: '3.122.0', modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'hidden-source/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const source = await produceHidden(product), cases = [];
      for (const id of ['use', 'pass']) cases.push(await cast(product, id));
      const ref = await save('consume.json', { source, cases, actualPlagueCasts: 2, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'pass/checkpoint-r1.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['use', 'pass']) cases.push(await settle(product, id));
      const ref = await save('successor.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: cases.at(-1).checkpointRef };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ['hidden-source', 'use', 'pass']) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          for (let index = 0; index <= receipts.length; index++) {
            const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, index) });
            assert.equal(result.ok, true, JSON.stringify(result));
            assert.deepEqual(result.envelope, (await read(prefix + id + '/checkpoint-r' + index + '.json')).envelope);
          }
          cases.push({ id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases, originalMeleeR3NotResumed: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
