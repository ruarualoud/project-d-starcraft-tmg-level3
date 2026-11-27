import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { sceneFor } from './verify-wave3-plague-cast-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-sidearm/';
const directory = path.join(root, prefix);
const clawsId = 'unit:defiler/claws-combat-phase@1', biteId = 'unit:defiler/cancerous-bite-combat-phase@1';
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const ids = ['claws-first', 'bite-first', 'stop'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-defiler-sidearm-' + id, releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [], includeMelee: true, includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
export async function makeScene(context, purchased = true, { automaticWeaponDefinitions = false } = {}) {
  const environment = (await sceneFor(context)).state;
  const unit = (unitInstanceId, key, upgrades = []) => ({ unitInstanceId, recordKey: 'army_units:' + key,
    compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
    ...(automaticWeaponDefinitions ? {} : { meleeWeaponDefinitionIds: [clawsId, ...(purchased ? [biteId] : [])] }),
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle, candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', purchased ? [{ upgradeName: 'Cancerous Bite' }] : []), unit('ally', 'defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [unit('goliath', 'goliath'), unit('marauders', 'marauder')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor',
    'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale',
    'officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    round: 1, phase: 'combat', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:combat': { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'defiler'), 20, 26); arrange(piece(state, 'ally'), 12, 18);
  arrange(piece(state, 'goliath'), 16, 26);
  const target = piece(state, 'marauders'); arrange(target, 23.35, 26);
  const step = target.models[0].baseWidthInches + 0.1;
  target.models.forEach((model, index) => Object.assign(model, { xInches: 23.35 + (index === 1 ? step : 0),
    yInches: 26 + (index === 2 ? step : 0) }));
  declareCoherency(state); state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state, scenario: { partialLegalRosters: true, declaredCombatEntryAndPositions: true,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
function parameters(weaponName, targetUnitId, closeRanksMode = 'decline') {
  return { closeRanksMode, allocations: [{ targetUnitId, dice: weaponName === 'Claws' ? 4 : 2 }],
    surgeTargetUnitId: null, criticalTargetUnitId: weaponName === 'Cancerous Bite' ? targetUnitId : null,
    ...(closeRanksMode === 'move' ? { leadingModelId: 'defiler-model-1', path: [
      { xMilliInches: 19900, yMilliInches: 26000 }], placements: [] } : {}) };
}
async function captureBaseline() {
  const prior = await cached('baseline.json'); if (prior) return prior;
  const context = await sourceProduct(), scene = await makeScene(context), runtime = runtimeFor(context, scene.state);
  const request = { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'defiler', weaponName: 'Claws',
    parameters: parameters('Claws', 'goliath') };
  const menu = runtime.enumerate(scene.state);
  assert(menu.parameterDomains.some(row => row.pieceId === 'defiler' && row.weaponName === 'Cancerous Bite'));
  const audit = scene.state.armyCompositionUpgradeAuditsBySide.player1.units.find(row => row.unitInstanceId === 'defiler');
  assert.equal(audit.mineralCost, 20);
  const initialQuery = runtime.query(scene.state, request);
  let state = structuredClone(scene.state), action = initialQuery.result.action, event;
  const trace = [];
  for (let index = 0; index < 8; index++) {
    const rolls = Array(action.chance?.count || 0).fill(1), result = runtime.apply(state, action, { chanceReveals: rolls });
    state = result.state; trace.push({ actionType: action.actionType, chanceReveals: rolls, events: result.events });
    event = result.events.find(row => row.type === 'close_combat_attack'); if (event) break;
    const next = runtime.enumerate(state), domain = next.parameterDomains[0];
    action = domain ? runtime.instantiate(state, domain, poolParameters(domain)).action : next.candidates[0];
    assert(action);
  }
  assert(event); assert.equal(event.stages.totalDamage, 0);
  const afterMenu = runtime.enumerate(state);
  const missing = !afterMenu.parameterDomains.some(row => row.pieceId === 'defiler' && row.weaponName === 'Cancerous Bite');
  assert(missing, 'the pre-change missing SIDEARM continuation must be reproduced, not inferred');
  const noUpgrade = await makeScene(context, false), oldRuntime = runtimeFor(context, noUpgrade.state);
  const ref = await save('no-upgrade-baseline.json', { ...noUpgrade, runtimeDescriptor: oldRuntime.descriptor,
    request, query: oldRuntime.query(noUpgrade.state, request) });
  const value = { missingSidearmContinuationReproduced: true, oldPhaseAlreadyActivated: piece(state, 'defiler').activatedPhases.combat,
    actualRosterUpgradeCost: audit.mineralCost, initialRuntimeVersion: runtime.descriptor.runtimeVersion,
    noUpgradeBaselineRef: ref, injectedChanceOnly: true, nativeReceipt: false, scene, trace, modelCalls: 0 };
  await save('baseline.json', value); return value;
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function registerScene(context, id, scene) {
  if (await cached(id + '/authority.json')) return;
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.123.0');
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
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state); assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, runtime, native, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, sideKey, operationKey, select, parameters, kind) {
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[sideKey], operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function settlePools(branch, credentials, label) {
  for (let step = 0; step < 32; step++) {
    const current = await checkpoint(branch), state = current.envelope.state;
    if (!branch.runtime.meleeChoices?.hasPending(state) && !state.pendingAction) return current;
    const menu = branch.runtime.enumerate(state), domain = menu.parameterDomains[0];
    if (domain) await invoke(branch, credentials, state.activeSideKey, label + '-pool-' + current.stateRevision,
      row => row.domainId === domain.domainId, row => row.parameterSchema.required.includes('casualtySelectionHash')
        ? { casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] } : poolParameters(row));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, state.activeSideKey, label + '-pool-' + current.stateRevision, () => true, undefined, 'finite');
    }
  }
  assert.fail('finite melee pools did not settle');
}
async function attack(branch, credentials, label, weaponName, targetId, moving = false) {
  const old = await cached(branch.id + '/' + label + '.json'); if (old) return old;
  let before = await cached(branch.id + '/' + label + '-before.json');
  if (!before) { before = { envelope: (await checkpoint(branch)).envelope }; await save(branch.id + '/' + label + '-before.json', before); }
  const state = before.envelope.state;
  const request = { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'defiler', weaponName,
    parameters: parameters(weaponName, targetId, moving ? 'move' : 'decline') };
  const stored = await branch.native.store.loadRoom(branch.roomId), query = branch.runtime.query(state, request);
  assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), stored);
  const applied = await invoke(branch, credentials, 'player1', label,
    row => row.pieceId === 'defiler' && row.actionType === 'fight' && row.weaponName === weaponName, () => request.parameters);
  assert.deepEqual(applied.preview.core.action, query.result.action);
  const current = await settlePools(branch, credentials, label);
  const events = current.envelope.state.log.flatMap(row => row.events || []);
  const actual = events.filter(row => row.type === 'close_combat_attack' && row.weaponName === weaponName).at(-1);
  assert(actual); assert.equal(actual.targetId, targetId); assert.equal(actual.stages.hitRolls.length, weaponName === 'Claws' ? 4 : 2);
  const result = { weaponName, targetId, nativeAttack: actual, queryEqualsPreview: true, queryNoWrite: true,
    checkpointRef: prefix + branch.id + '/checkpoint-r' + current.stateRevision + '.json', modelCalls: 0 };
  await save(branch.id + '/' + label + '.json', result); return result;
}
async function firstBatch(product, id) {
  const old = await cached(id + '/first-result.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const bite = id === 'bite-first', weaponName = bite ? 'Cancerous Bite' : 'Claws';
    const result = await attack(branch, credentials, 'first', weaponName, bite ? 'marauders' : 'goliath', !bite);
    const state = (await checkpoint(branch)).envelope.state, menu = branch.runtime.enumerate(state);
    assert.equal(state.activeSideKey, 'player1'); assert.notEqual(piece(state, 'defiler').activatedPhases.combat, true);
    assert.equal(state.pendingOfficialMeleeSidearmSequence.completedBatches.length, 1);
    assert(!menu.parameterDomains.some(row => row.weaponName === weaponName));
    assert(menu.parameterDomains.length > 0); assert(menu.parameterDomains.every(row => row.pieceId === 'defiler' && row.actionType === 'fight'));
    assert.equal(menu.candidates.length, 1); assert.equal(menu.candidates[0].actionType, 'finish_melee_attack_sequence');
    assert(menu.parameterDomains.every(row => row.sourceDomain.parameterSchema.closeRanksMode.join() === 'decline'));
    assert.throws(() => branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight',
      pieceId: 'defiler', weaponName: bite ? 'Claws' : 'Cancerous Bite',
      parameters: parameters(bite ? 'Claws' : 'Cancerous Bite', bite ? 'goliath' : 'marauders', 'move') }),
    /MELEE_SIDEARM_CLOSE_RANKS_ALREADY_RESOLVED/);
    const invalid = structuredClone(state); invalid.pendingOfficialMeleeSidearmSequence.sequenceHash = '0'.repeat(64);
    assert.throws(() => branch.runtime.enumerate(invalid), /MELEE_SIDEARM_SEQUENCE_INVALID/);
    if (!bite) assert.equal(piece(state, 'defiler').models[0].xInches, 19.9);
    await save(id + '/first-result.json', result); return result;
  } finally { branch.close(); }
}
async function finishBranch(product, id) {
  const old = await cached(id + '/result.json'); if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority);
    if (id === 'stop') await invoke(branch, credentials, 'player1', 'voluntary-stop',
      row => row.action.actionType === 'finish_melee_attack_sequence', undefined, 'finite');
    else await attack(branch, credentials, 'second', id === 'bite-first' ? 'Claws' : 'Cancerous Bite',
      id === 'bite-first' ? 'goliath' : 'marauders');
    const completed = await checkpoint(branch), state = completed.envelope.state;
    assert.equal(state.pendingOfficialMeleeSidearmSequence, undefined);
    assert.equal(piece(state, 'defiler').activatedPhases.combat, true);
    assert.equal(state.selectedRosterActivationWindow.stage, 'after_action');
    const attacks = state.log.flatMap(row => row.events || []).filter(row => row.type === 'close_combat_attack');
    assert.equal(attacks.length, id === 'stop' ? 1 : 2);
    assert.equal(new Set(attacks.map(row => row.weaponName)).size, attacks.length);
    await invoke(branch, credentials, 'player1', 'finish-activation',
      row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', () => ({}));
    const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
    const result = { id, attacks, voluntaryStop: id === 'stop', activationFinished: true, nextSide: 'player2',
      checkpointRef: prefix + id + '/checkpoint-r' + after.stateRevision + '.json', modelCalls: 0 };
    await save(id + '/result.json', result); return result;
  } finally { branch.close(); }
}
async function replay(product, id) {
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
    return { id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
  } finally { branch.close(); }
}
async function replayLegacy(product, id) {
  const base = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-melee/';
  const filename = path.join(root, base, id, 'room.sqlite'), oldHash = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
  const authority = await read(base + id + '/authority.json');
  const db = new DatabaseSync(path.join(root, base, 'releases.sqlite'), { readOnly: true });
  let manifest;
  try { manifest = JSON.parse(db.prepare('SELECT manifest_json FROM sc_official_releases WHERE release_id = ?').get(authority.releaseId).manifest_json); }
  finally { db.close(); }
  product.resolver.register(manifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: [], includeMelee: true });
  assert.deepEqual(runtime.descriptor, await read(base + id + '/runtime.json'));
  const local = path.join(directory, 'legacy-' + id); await fs.mkdir(local, { recursive: true });
  try { await fs.copyFile(filename, path.join(local, 'room.sqlite'), fs.constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const native = openWave3EngineeringRoomV1({ directory: local, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const rid = 'wave3-defiler-melee-' + id;
    await native.restoreDependencies(rid, authority);
    const bundle = await native.store.loadReplayBundle(rid);
    const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
    for (let index = 0; index <= receipts.length; index++) {
      const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, index) });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.deepEqual(result.envelope, (await read(base + id + '/checkpoint-r' + index + '.json')).envelope);
    }
    assert.equal(createHash('sha256').update(await fs.readFile(filename)).digest('hex'), oldHash);
    return { id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true, originalHashUnchanged: true };
  } finally { native.close(); }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  if (process.argv.includes('--saved-facts-only')) {
    assert.equal((await read(prefix + 'verification/boundary.json')).status, 'passed');
    const product = openProduct(), branch = await product.branch('claws-first');
    try {
      const definitions = branch.runtime.catalogue.definitions.filter(row => row.definitionId === biteId);
      assert.equal(definitions.length, 1); assert.equal(definitions[0].execution.status, 'executable_exact');
      // The authority seed was compiled before the isolated Room release was
      // registered. Compare factories under that same original source release.
      const context = await sourceProduct();
      const automatic = await makeScene(context, true, { automaticWeaponDefinitions: true });
      assert.deepEqual(JSON.parse(JSON.stringify(automatic.state)), branch.authority.state);
      const arithmetic = [];
      for (const id of ['claws-first', 'bite-first']) {
        const result = await read(prefix + id + '/result.json');
        const attack = result.attacks.find(row => row.weaponName === 'Cancerous Bite'), stages = attack.stages;
        assert.equal(stages.hitThreshold, 3); assert.equal(stages.damagePerDie, 2);
        assert.equal(stages.hits, stages.hitRolls.filter(value => value >= 3).length);
        assert.equal(stages.bypassedArmourDice, Math.min(stages.hits, 1));
        assert.equal(stages.armourDice, stages.hits - stages.bypassedArmourDice);
        assert.equal(stages.totalDamage, (stages.hits - stages.armourSaves - stages.evadeSaves) * 2);
        arithmetic.push({ id, hits: stages.hits, bypassedArmourDice: stages.bypassedArmourDice, totalDamage: stages.totalDamage });
      }
      await save('saved-facts.json', { definitions, automaticFactoryWithoutExplicitWeaponIdsExact: true, arithmetic,
        currentNativeActionsReplayed: 0, modelCalls: 0 });
      console.log(JSON.stringify({ savedFacts: 'passed', automaticFactoryExact: true, definitions: definitions.length, modelCalls: 0 }));
    } finally { branch.close(); product.close(); }
    return;
  }
  if (process.argv.includes('--baseline-only')) {
    const result = await captureBaseline();
    console.log(JSON.stringify({ baseline: 'captured', reproduced: result.missingSidearmContinuationReproduced,
      upgradeCost: result.actualRosterUpgradeCost, nativeReceipts: 0, modelCalls: 0 })); return;
  }
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Defiler-Sidearm-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      assert((await read(prefix + 'baseline.json')).missingSidearmContinuationReproduced);
      const scene = await makeScene(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.123.0');
      assert.equal(scene.state.officialMeleeWeaponSourceBundle.definitionIds.includes(biteId), true);
      assert.equal(scene.state.armyCompositionUpgradeAuditsBySide.player1.units.find(row => row.unitInstanceId === 'defiler').mineralCost, 20);
      assert.throws(() => runtime.query(scene.state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'defiler',
        parameters: parameters('Claws', 'goliath') }), /CHARACTERISTIC_MELEE_QUERY_WEAPON_REQUIRED/);
      const old = await read(prefix + 'no-upgrade-baseline.json'), fresh = await makeScene(context, false), oldRuntime = runtimeFor(context, fresh.state);
      // The saved baseline uses the same JSON boundary as Room persistence.
      assert.deepEqual(JSON.parse(JSON.stringify(fresh.state)), old.state); assert.deepEqual(oldRuntime.descriptor, old.runtimeDescriptor);
      assert.deepEqual(oldRuntime.query(fresh.state, old.request), old.query);
      assert(!oldRuntime.enumerate(fresh.state).parameterDomains.some(row => row.weaponName === 'Cancerous Bite'));
      for (const id of ids) await registerScene(context, id, scene);
      const ref = await save('compile.json', { purchaseCost: 20, runtimeVersion: '3.123.0', automaticSourceBinding: true,
        noUpgradeStateDescriptorQueryExact: true, ambiguousWeaponRejected: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'claws-first/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = []; for (const id of ids) cases.push(await firstBatch(product, id));
      const ref = await save('consume.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: cases.at(-1).checkpointRef };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = []; for (const id of ids) cases.push(await finishBranch(product, id));
      const ref = await save('successor.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: cases.at(-1).checkpointRef };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [], legacy = [];
      for (const id of ids) current.push(await replay(product, id));
      for (const id of ['charge', 'combat']) legacy.push(await replayLegacy(product, id));
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
