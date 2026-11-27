import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, poolParameters, arrange } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { inspectOfficialMultiModelCasualtySelectionV1 }
  from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1,
  commitWave3RangedBatchV1, completeWave3MeleePoolsV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/plague-standard-damage/';
const directory = path.join(root, prefix);
const parentRef = 'build/ticket-28-zerg-wave3-20261118-v1/plague-cast/card-3/checkpoint-r2.json';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const roomId = id => 'wave3-plague-standard-damage-' + id;
const releaseId = id => roomId(id) + '-v1';
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [], includeRanged: true, includeMelee: Boolean(state.officialMeleeWeaponSourceBundle),
  includePrecisionChoices: true, includeArmourChoices: true });
function selectMeleeParameters(domain) {
  const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
  if (!schema.required.includes('casualtyModelIds')) return poolParameters(domain);
  const constraints = domain.sourceDomain?.constraints || domain.constraints;
  const casualtyModelIds = [];
  for (let index = 0; index < constraints.selectionContract.casualtyCount; index++) {
    const prefix = inspectOfficialMultiModelCasualtySelectionV1({ targetPieceId: constraints.targetPieceId,
      selectionContract: constraints.selectionContract, casualtyModelIds, complete: false });
    assert(prefix.valid); assert(prefix.legalNextModelIds.length);
    casualtyModelIds.push(prefix.legalNextModelIds[0]);
  }
  return { casualtyModelIds };
}
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
async function sceneFor(context, id) {
  const original = (await read(parentRef)).envelope.state;
  let state = structuredClone(original);
  if (id === 'ranged-disengaged') {
    // The saved target was engaged with Marines. Autocannon may not fire into
    // that engagement from outside. Declare this isolated positional change;
    // retain the actual Plague damage, models, cards, histories and source room.
    arrange(piece(state, 'ally'), 14, 20);
    state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
    const query = runtimeFor(context, state).query(state, { queryKind: 'ranged_attack_preview',
      pieceId: 'enemy', weaponName: 'Autocannon', parameters: { targetUnitId: 'ally' } });
    assert(query.result.action);
  }
  if (id === 'melee') {
    const legacyDisclosure = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle;
    const unit = (unitInstanceId, key, upgrades = []) => ({ unitInstanceId,
      recordKey: 'army_units:' + key, compositionKind: 'small', upgrades });
    const fresh = createOfficialReleaseRosterStateV2({ context, includePlague: true, includeMelee: true,
      meleeWeaponDefinitionIds: ['unit:defiler/claws-combat-phase@1'],
      blastTemplateGeometryAsset: state.officialBlastTemplateGeometryAsset,
      legacyDisclosurePolicy: legacyDisclosure, candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
            'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
          units: [unit('defiler', 'defiler', [{ upgradeName: 'Plague' }]), unit('ally', 'defiler')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
          factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
          units: [unit('enemy', 'goliath'), unit('marines', 'marine', [{ upgradeName: 'Combat Shield' }])] },
      } });
    for (const field of ['officialAttackProfileCatalogueV2', 'officialMeleeWeaponSourceBundle', 'officialConsumePaymentPolicy']) {
      assert(fresh.state[field], 'same-roster product factory must provide ' + field);
      state[field] = structuredClone(fresh.state[field]);
    }
    state.phase = 'combat'; state.activeSideKey = 'player1';
    for (const player of Object.values(state.players)) player.passedPhases.combat = false;
    state.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' };
    state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
    assert.deepEqual(state.pieces, original.pieces, 'Melee source injection must preserve the actual Plague post-state pieces');
  }
  return { state, scenario: { sourceCheckpointRef: parentRef, retainedActualPlagueDamage: true,
    declaredDisengagedTargetPosition: id === 'ranged-disengaged' ? { pieceId: 'ally', xInches: 14, yInches: 20 } : null,
    declaredCombatEntry: id === 'melee', sameRosterFactoryMeleeSources: id === 'melee',
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id) {
  if (await cached(id + '/authority.json')) return;
  const scene = await sceneFor(context, id), runtime = runtimeFor(context, scene.state);
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
  const current = await branch.native.store.loadRoom(branch.roomId);
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(name);
  if (old) assert.deepEqual(current.envelope, old.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
export function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    const branch = { id, authority, context, runtime, native, roomId: roomId(id), close: () => native.close() };
    const commit = native.commit;
    native.commit = async args => { const result = await commit(args); await checkpoint(branch); return result; };
    return branch;
  } };
}
async function invoke(branch, credentials, sideKey, operationKey, select, parameters, kind = 'parameterized') {
  await checkpoint(branch);
  // A resumed operation belongs to its original actor, not the current actor
  // (which may already be the defender choosing casualties or the next side).
  return branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey],
    operationKey, select, parameters, kind });
}
function verifyDamage(before, after, targetId, event, incomingDamage) {
  const targetBefore = piece(before, targetId), targetAfter = piece(after, targetId);
  const hitPoints = resolveOfficialEffectiveCombatProfileV1(before, targetBefore).hitPoints;
  assert(Number.isSafeInteger(incomingDamage) && incomingDamage >= 0);
  // Both chosen targets have no shields; the engaged Marine allows all models
  // as casualties. This independent expectation is not copied from a kernel.
  assert.equal(resolveOfficialEffectiveCombatProfileV1(before, targetBefore).shield || 0, 0);
  const total = targetBefore.damageMarker + incomingDamage;
  const casualties = incomingDamage === 0 ? 0 : Math.min(targetBefore.currentModels, Math.floor(total / hitPoints));
  const remaining = casualties === targetBefore.currentModels ? 0 : incomingDamage === 0
    ? targetBefore.damageMarker : total - casualties * hitPoints;
  assert.equal(event.casualtyModelIds.length, casualties);
  assert.equal(targetAfter.currentModels, targetBefore.currentModels - casualties);
  assert.equal(targetAfter.damageMarker, remaining);
  assert.equal(event.postDamageMarker, remaining);
  assert.equal(targetAfter.currentSupply, event.currentSupplyAfter);
  if (!targetAfter.currentModels) assert.equal(targetAfter.currentSupply, 0);
  assert.equal(after.officialPlagueUseHistory.length, before.officialPlagueUseHistory.length);
  return { targetId, targetHitPoints: hitPoints, priorDamageMarker: targetBefore.damageMarker,
    incomingDamage, casualties, remainingDamageMarker: remaining, currentModels: targetAfter.currentModels,
    currentSupply: targetAfter.currentSupply, actualNativeEvent: event };
}
async function ranged(product) {
  const id = 'ranged-disengaged', old = await cached(id + '/result.json'); if (old) return old;
  if (!await cached(id + '/authority.json')) await registerScene(await sourceProduct(), id);
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const value = await commitWave3RangedBatchV1({ directory: path.join(directory, id), native: branch.native,
      runtime: branch.runtime, roomId: branch.roomId, credentials, attackerSideKey: 'player2', attackerPieceId: 'enemy',
      targetPieceId: 'ally', weaponName: 'Autocannon', operationKey: 'post-plague-shot', selectPoolParameters: poolParameters });
    const result = verifyDamage(value.before.envelope.state, value.after.envelope.state, 'ally', value.event, value.event.stages.damage.totalDamage);
    const current = await checkpoint(branch);
    if (current.envelope.state.pendingCurrentProductRangedSequence) await invoke(branch, credentials, 'player2', 'finish-shot',
      row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
    await invoke(branch, credentials, 'player2', 'finish-activation', row => row.actionType === 'finish_activation' && row.pieceId === 'enemy', () => ({}));
    const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player1');
    await save(id + '/result.json', { ...result, queryEqualsPreview: true, activationFinished: true,
      checkpointRef: prefix + id + '/checkpoint-r' + after.stateRevision + '.json', modelCalls: 0 });
    return cached(id + '/result.json');
  } finally { branch.close(); }
}
async function melee(product) {
  const old = await cached('melee/result.json'); if (old) return old;
  const branch = await product.branch('melee');
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const before = (await read(prefix + 'melee/checkpoint-r0.json')).envelope.state;
    const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'marines', dice: 4 }], surgeTargetUnitId: null, criticalTargetUnitId: null };
    const aggregate = await branch.native.store.loadRoom(branch.roomId);
    const query = branch.runtime.query(before, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'ally', parameters });
    assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), aggregate);
    const applied = await invoke(branch, credentials, 'player1', 'claws', row => row.actionType === 'fight' && row.pieceId === 'ally', () => parameters);
    assert.deepEqual(applied.preview.core.action, query.result.action);
    await completeWave3MeleePoolsV1({ directory: path.join(directory, 'melee'), native: branch.native, runtime: branch.runtime,
      roomId: branch.roomId, credentials, operationPrefix: 'claws-pool', selectPoolParameters: selectMeleeParameters });
    const current = await checkpoint(branch);
    const event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack' && row.pieceId === 'ally');
    assert(event); assert.equal(event.weaponName, 'Claws'); assert.equal(event.stages.hitRolls.length, 4);
    const result = verifyDamage(before, current.envelope.state, 'marines', event, event.stages.totalDamage);
    await invoke(branch, credentials, 'player1', 'finish-combat', row => row.actionType === 'finish_activation' && row.pieceId === 'ally', () => ({}));
    const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
    await save('melee/result.json', { ...result, queryEqualsPreview: true, activationFinished: true,
      checkpointRef: prefix + 'melee/checkpoint-r' + after.stateRevision + '.json', modelCalls: 0 });
    return cached('melee/result.json');
  } finally { branch.close(); }
}
async function replay(branch) {
  await branch.native.restoreDependencies(branch.roomId, branch.authority);
  const bundle = await branch.native.store.loadReplayBundle(branch.roomId);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + branch.id + '/checkpoint-r' + i + '.json')).envelope);
  }
  return { id: branch.id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Plague-Standard-Damage-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const id of ['ranged', 'melee']) await registerScene(context, id);
      const ref = await save('compile.json', { sourceCheckpointRef: parentRef, actualPlaguePreserved: true,
        ranged: { attacker: 'enemy', target: 'ally', weapon: 'Autocannon' },
        melee: { attacker: 'ally', target: 'marines', weapon: 'Claws', declaredCombatEntry: true }, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'melee/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const result = await ranged(product), ref = await save('consume.json', result);
      return { evidenceRef: ref, checkpointRef: result.checkpointRef };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const result = await melee(product), ref = await save('successor.json', result);
      return { evidenceRef: ref, checkpointRef: result.checkpointRef };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of ['ranged-disengaged', 'melee']) {
        const branch = await product.branch(id);
        try { results.push(await replay(branch)); } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { results, originalPlagueRoomUntouched: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
