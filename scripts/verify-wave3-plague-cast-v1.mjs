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
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createOfficialMarineStimpackKernelV1 } from '../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/plague-cast/';
const directory = path.join(root, prefix), sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const cases = ['card-1', 'card-2', 'card-3', 'consume-target', 'consume-source'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const roomId = id => 'wave3-plague-cast-' + id, releaseId = id => roomId(id) + '-v1';
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [], includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
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
export async function sceneFor(context, movement = false, {
  additionalGeneratedUnitRecordKeys = [], includeNonLethalStandardDamage = false,
} = {}) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const template = (await read('build/ticket-28-wave2-capabilities-20261113-v1/tank-template-attack/authority.json')).state.officialBlastTemplateGeometryAsset;
  const unit = (id, key, upgrades = []) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context, includePlague: true, includeNonLethalStandardDamage,
    additionalGeneratedUnitRecordKeys,
    blastTemplateGeometryAsset: template,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', [{ upgradeName: 'Plague' }]), unit('ally', 'defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [unit('enemy', 'goliath'), unit('marines', 'marine', [{ upgradeName: 'Combat Shield' }])] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: movement ? 'movement' : 'assault', activeSideKey: movement ? 'player2' : 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + (movement ? 'movement' : 'assault')]: {
      round: 1, phase: movement ? 'movement' : 'assault', chosenFirstActorSideKey: movement ? 'player2' : 'player1' } } };
  arrange(piece(state, 'defiler'), 12, 26); arrange(piece(state, 'ally'), 16.75, 26); arrange(piece(state, 'enemy'), 32, 26);
  const marines = piece(state, 'marines'); arrange(marines, 20, 26);
  const step = marines.models[0].baseWidthInches + 0.1;
  marines.models.forEach((model, i) => Object.assign(model, {
    xInches: Math.round((20 + (i ? Math.cos((i - 1) * 2 * Math.PI / 5) * step : 0)) * 1000) / 1000,
    yInches: Math.round((26 + (i ? Math.sin((i - 1) * 2 * Math.PI / 5) * step : 0)) * 1000) / 1000 }));
  // Explicit prior non-lethal/Hidden snapshot. Never claim that an unplayed
  // attack generated it. Apply the existing damage writer to keep projections
  // consistent while retaining every model.
  const profile = resolveOfficialEffectiveCombatProfileV1(state, marines);
  applyOfficialSelectedRosterResolvedDamageV1(state, marines, profile, { casualtyModelIds: [],
    remainingModelIds: marines.models.map(row => row.id), targetDestroyed: false,
    postDamageMarker: profile.hitPoints + 1, shieldedBefore: false, shieldedAfter: false });
  marines.statuses.push('HIDDEN');
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    declaredPositionsAndPhase: true, declaredPriorNonLethalAndHiddenSnapshot: true,
    partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  if (await cached(id + '/authority.json')) return;
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.121.0');
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
export function openProduct() {
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
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name); if (old) assert.deepEqual(current.envelope, old.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[current.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind }); await checkpoint(branch); return result;
}
async function cast(branch, credentials, bm, sacrifice = null) {
  const old = await cached(branch.id + '/cast.json'); if (old) return old;
  const initial = (await read(prefix + branch.id + '/checkpoint-r0.json')).envelope.state;
  const quote = branch.runtime.query(initial, { queryKind: 'plague_template_coverage', sourcePieceId: 'defiler',
    coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: bm });
  const parameters = { coordinate: { xMilliInches: 20000, yMilliInches: 26000 }, biomassToSpend: bm,
    paymentCardInstanceIds: sacrifice ? quote.payment.consumeCardPayments[0].cardInstanceIds : quote.payment.cardOnlyPayments[0].cardInstanceIds,
    ...(sacrifice ? { sacrificePieceId: sacrifice, sacrificeModelId: quote.payment.sacrifices.find(row => row.pieceId === sacrifice).modelIds[0] } : {}) };
  const preview = branch.runtime.query(initial, { queryKind: 'plague_cast_preview', pieceId: 'defiler', parameters });
  assert.deepEqual(JSON.parse(JSON.stringify(preview.result.action)), preview.result.action,
    'Native JSON transport must preserve every compiled fact');
  const domain = branch.runtime.enumerate(initial).parameterDomains.find(row => row.actionType === 'cast_plague');
  assert.throws(() => branch.runtime.instantiate(initial, domain, { ...parameters, stateHash: 'forged' }), /SEMANTIC/);
  assert.throws(() => branch.runtime.instantiate(initial, domain, { ...parameters, biomassToSpend: 4 }), /BIOMASS_CHOICE/);
  assert.throws(() => branch.runtime.instantiate(initial, domain, { ...parameters, paymentCardInstanceIds: ['not-a-card'] }), /PAYMENT|SELECTION/);
  const before = await branch.native.store.loadRoom(branch.roomId);
  assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), before);
  const applied = await invoke(branch, credentials, 'cast', row => row.actionType === 'cast_plague' && row.pieceId === 'defiler', () => parameters);
  assert.deepEqual(applied.preview.core.action, preview.result.action);
  const after = (await read(prefix + branch.id + '/checkpoint-r1.json')).envelope.state;
  const result = after.officialPlagueUseHistory.at(-1);
  assert.equal(after.officialPlagueUseHistory.length, 1); assert.equal(result.biomassToSpend, bm);
  const marineResult = result.resolutions.find(row => row.targetPieceId === 'marines');
  assert.equal(marineResult.coveredModelIds.length, 6); assert.equal(marineResult.dice, 8);
  assert.equal(marineResult.hitThreshold, 6 - bm);
  assert.equal(marineResult.nonLethal.postDamageMarker, marineResult.nonLethal.priorDamageMarker + marineResult.hits - marineResult.evaded);
  assert.equal(piece(after, 'marines').currentModels, 6);
  assert.equal(piece(after, 'marines').currentSupply, piece(initial, 'marines').currentSupply);
  assert(!piece(after, 'marines').statuses.some(row => String(typeof row === 'string' ? row : row.statusName).toLowerCase() === 'hidden'));
  const abilityOnly = result.resolutions.flatMap(row => row.nonLethal.casualtyModelIds); assert.deepEqual(abilityOnly, []);
  if (sacrifice) {
    assert.equal(piece(after, sacrifice).isDestroyed, true);
    assert.equal(piece(after, sacrifice).currentSupply, 0);
    assert.equal(after.officialConsumePaymentHistory.length, 1);
    assert(!result.resolutions.some(row => row.targetPieceId === sacrifice));
    assert(after.supplyLossLedger.entries.filter(row => row.unitId === sacrifice).every(row => row.scoreable === false));
    if (sacrifice === 'defiler') {
      assert.equal(after.selectedRosterActivationWindow, undefined); assert.equal(after.activeSideKey, 'player2');
    }
  } else assert.equal(after.officialConsumePaymentHistory, undefined);
  assert(!branch.runtime.enumerate(after).parameterDomains.some(row => row.actionType === 'cast_plague' && row.pieceId === 'defiler'));
  const value = { parameters, plan: preview.result.action.sourceAction.plaguePlan, result,
    actualNativeCast: true, idempotentApply: applied.idempotentReplayVerified, noModelsRemovedByPlague: true, modelCalls: 0 };
  await save(branch.id + '/cast.json', value); return value;
}
async function finish(branch, credentials) {
  const state = (await branch.native.store.loadRoom(branch.roomId)).envelope.state;
  if (state.selectedRosterActivationWindow) await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation', () => ({}));
  const current = await branch.native.store.loadRoom(branch.roomId);
  assert.equal(current.envelope.state.activeSideKey, 'player2'); return current;
}
async function replay(native, id, base) {
  const bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, (await read(base + i + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Plague-Native-Cast-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.plagueConsumerReady, true);
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === 'unit:defiler/plague-assault-phase@1').execution.status, 'executable_exact');
      for (const id of cases) await registerScene(context, id, scene);
      await registerScene(context, 'shield-source', await sceneFor(context, true));
      const legacyPath = path.resolve(root, '../../packages/rule-atoms/official-marine-stimpack-kernel-v1.mjs');
      const legacy = (await import(pathToFileURL(legacyPath).href)).createOfficialMarineStimpackKernelV1();
      const current = createOfficialMarineStimpackKernelV1();
      for (const priorDamageMarker of [0, 1, 7, 19]) {
        const input = { targetPieceId: 'frozen-target', targetModelId: 'frozen-model', abilityResolutionHash: hash({ priorDamageMarker }),
          priorDamageMarker, amount: 2, targetHitPoints: 8 };
        assert.deepEqual(current.resolveNonLethalDamage(input), legacy.resolveNonLethalDamage(input));
      }
      const movement = await sceneFor(context, true);
      assert(!runtimeFor(context, movement.state).enumerate(movement.state).parameterDomains.some(row => row.actionType === 'cast_plague'));
      const ref = await save('compile.json', { runtime: runtime.descriptor, fullRosterFactory: true,
        source: scene.state.officialPlagueCoverageSourceBundle, policy: scene.state.officialPlagueResolutionPolicy,
        oldStimpackCompleteResultAndHashExact: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'card-1/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of cases) {
        const old = await cached(id + '/completed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
          const bm = id.startsWith('card-') ? Number(id.at(-1)) : id === 'consume-target' ? 3 : 1;
          const sacrifice = id === 'consume-target' ? 'ally' : id === 'consume-source' ? 'defiler' : null;
          const value = await cast(branch, credentials, bm, sacrifice);
          await finish(branch, credentials);
          const complete = { id, resultRef: prefix + id + '/cast.json', sourceDestroyed: value.result.sourceDestroyedByPayment };
          await save(id + '/completed.json', complete); results.push(complete);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { results, actualPlagueCasts: results.length, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'consume-source/checkpoint-r1.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const source = await product.branch('shield-source'); let state, context;
      try {
        const credentials = await source.native.create(source.roomId, source.authority); await checkpoint(source);
        await invoke(source, credentials, 'shield', row => row.actionType === 'use_active_ability' && row.abilityName === 'Combat Shield',
          row => ({ activeUnitId: 'marines', paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.enum[0] }));
        await invoke(source, credentials, 'shield-finish', row => row.actionType === 'finish_activation', () => ({}));
        state = (await source.native.store.loadRoom(source.roomId)).envelope.state; context = source.context;
        assert(piece(state, 'marines').officialAbilityEffects.some(row => row.effectKind === 'combat_shield'));
      } finally { source.close(); }
      if (!await cached('shield-cast/authority.json')) {
        state = structuredClone(state); state.phase = 'assault'; state.activeSideKey = 'player1';
        state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
        state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
        await registerScene(context, 'shield-cast', { state, scenario: { derivedFrom: prefix + 'shield-source/checkpoint-r2.json',
          actualCombatShieldPaymentRetained: true, declaredAssaultEntry: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
      }
      const branch = await product.branch('shield-cast');
      try {
        const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
        const value = await cast(branch, credentials, 3);
        const marine = value.result.resolutions.find(row => row.targetPieceId === 'marines');
        assert.equal(marine.evadeEligible, true);
        assert.equal(marine.evadeRolls.length, marine.hits);
        assert.equal(marine.evaded, marine.evadeRolls.filter(die => die === 6 || die !== 1 && die >= marine.evadeThreshold).length);
        await finish(branch, credentials);
        const ref = await save('successor.json', { actualCombatShieldAndPlague: true, nativeShieldSource: prefix + 'shield-source/checkpoint-r2.json',
          actualPlagueRef: prefix + 'shield-cast/cast.json', marine,
          laterStandardDamageNativePending: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'shield-cast/checkpoint-r2.json' };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of [...cases, 'shield-source', 'shield-cast']) {
        const old = await cached('cold-' + id + '.json'); if (old) { current.push(old); continue; }
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const value = { id, ...await replay(branch.native, branch.roomId, prefix + id + '/checkpoint-r') };
          await save('cold-' + id + '.json', value); current.push(value);
        } finally { branch.close(); }
      }
      const legacy = [];
      for (const [label, base, id, definitions, flags] of [
        ['coverage', 'build/ticket-28-zerg-wave3-20261118-v1/plague-coverage/', 'wave3-plague-coverage', [], {}],
        ['consume', 'build/ticket-28-zerg-wave3-20261118-v1/consume-payment/multi/', 'wave3-consume-payment-multi',
          ['unit:vileling__zergling_/squadron-any-phase@1'], { includeRanged: true, includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true }],
      ]) {
        const old = await cached('cold-legacy-' + label + '.json'); if (old) { legacy.push(old); continue; }
        const authority = await read(base + 'authority.json'); product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
        const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: definitions, ...flags });
        assert.deepEqual(runtime.descriptor, await read(base + 'runtime.json'));
        const sourcePath = path.join(root, base, 'room.sqlite'), sourceHash = hash(await fs.readFile(sourcePath));
        const file = path.join(directory, 'legacy-' + label + '.sqlite');
        try { await fs.access(file); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.copyFile(sourcePath, file, fs.constants.COPYFILE_EXCL); }
        const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-' + label + '.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          await native.restoreDependencies(id, authority); const value = { label, ...await replay(native, id, base + 'checkpoint-r') };
          assert.equal(hash(await fs.readFile(sourcePath)), sourceHash);
          await save('cold-legacy-' + label + '.json', value); legacy.push(value);
        } finally { native.close(); }
      }
      const ref = await save('cold-recovery.json', { current, legacy, oldFilesUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
