import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { consumeOfficialCharacteristicStatusFirstGameWeaponV1, OFFICIAL_FIRST_GAME_WEAPON_USE_ATOM_ID }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { enumerateOfficialSelectedRosterRangedActionsV1, instantiateOfficialSelectedRosterRangedActionV1,
  inspectOfficialSelectedRosterRangedActionContextV1, applyOfficialSelectedRosterRangedActionV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1,
  commitWave3RangedBatchV1, completeWave3MeleePoolsV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-magrail/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const foundation = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/';
const unitKey = 'army_units:spec_ops_marauder__marauder_';
const stem = 'unit:spec_ops_marauder__marauder_/';
const magrailId = stem + 'magrail-munitions-assault-phase@1';
const rangedId = stem + 'quad-k12-assault-phase@1';
const meleeId = stem + 'strike-combat-phase@1';
const firstCases = ['first-armoured', 'first-light', 'first-melee'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-magrail-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
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
function runtimeFor(context, state, definitionIds = [rangedId]) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [magrailId], weaponDefinitionIds: definitionIds,
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function setPhase(state, phase, round) {
  state.phase = phase;
  state.round = round;
  state.activeSideKey = 'player1';
  state.firstPlayerSideKey = 'player1';
  state.phaseFirstActorByRound[round + ':' + phase] = { round, phase, chosenFirstActorSideKey: 'player1' };
  delete state.selectedRosterActivationWindow;
}
function arrangeMarine(piece, x, y) {
  arrange(piece, x, y);
  for (const [index, model] of piece.models.entries()) {
    model.xInches = x + index % 3 * (model.baseWidthInches + 0.02);
    model.yInches = y + Math.floor(index / 3) * (model.baseDepthInches + 0.02);
  }
}
function repositionSurvivors(piece, x, y) {
  const models = piece.models.filter(model => model.isOnField && !model.isDestroyed);
  for (const [index, model] of models.entries()) {
    model.xInches = x + index % 3 * (model.baseWidthInches + 0.02);
    model.yInches = y + Math.floor(index / 3) * (model.baseDepthInches + 0.02);
  }
}
function declareSurvivorCoherency(state) {
  for (const actor of state.pieces.filter(piece => piece.isOnField && !piece.isDestroyed)) {
    const models = actor.models.filter(model => model.isOnField && !model.isDestroyed);
    const result = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor,
      dataBundle: state.officialModelBaseGeometryDataBundle, plan: {
        planId: 'magrail-survivors-' + actor.id, leadingModelId: models[0].id,
        placements: models.map(model => ({ modelId: model.id,
          xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })),
        currentlyEngagedEnemyUnitIds: [],
      } });
    assert.equal(result.inCoherency, true);
    actor.coherencyStatus.declaredSnapshotResultHash = result.resultHash;
  }
}
async function sceneFor(context, id) {
  const base = (await read(foundation + 'quad-armoured/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    characteristicDefinitionIds: [magrailId], includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    includeMelee: true, meleeWeaponDefinitionIds: [meleeId],
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'specops', recordKey: unitKey, compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces',
        tacticalCardRecordKeys: ['tactical_cards:factory', 'tactical_cards:factory'], units: [
          { unitInstanceId: 'target', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'armoured-target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'later-target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined)
    .map(key => [key, structuredClone(base[key])])), ...setup.state, log: [], phaseFirstActorByRound: {} };
  setPhase(state, id === 'first-melee' ? 'combat' : 'assault', 1);
  state.board.tokens = [];
  state.board.markers = [];
  state.board.effectMarkers = [];
  arrange(pieceOf(state, 'specops'), 17, 10);
  arrangeMarine(pieceOf(state, 'target'), 44, 20);
  arrange(pieceOf(state, 'armoured-target'), 45, 28);
  arrange(pieceOf(state, 'later-target'), 38, 28);
  if (id === 'first-armoured') arrange(pieceOf(state, 'armoured-target'), 24, 10);
  if (id === 'first-light') arrangeMarine(pieceOf(state, 'target'), 24, 10);
  if (id === 'first-melee') arrangeMarine(pieceOf(state, 'target'), 14.931, 12.115);
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    id, scale: 'Standard2000-budget partial rosters', declaredPhaseAndPositions: true,
    coherency, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.87.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) {
      // Resume the signed scene. The later survivor fixture uses a new plan ID
      // for the same positions, so only that diagnostic result hash differs.
      const sceneFacts = value => {
        const facts = structuredClone(value);
        delete facts.receiptHash;
        for (const piece of facts.state.pieces) delete piece.coherencyStatus?.declaredSnapshotResultHash;
        return facts;
      };
      assert.deepEqual(sceneFacts(authority), sceneFacts(old));
    }
    else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope);
  else await save(name, { envelope: current.envelope });
  return current;
}
async function capture(branch) {
  for (const name of await fs.readdir(path.join(directory, branch.id))) {
    if (!name.startsWith('attack-') || !name.endsWith('.json')) continue;
    const value = await read(output + branch.id + '/' + name);
    if (!value.envelope) continue;
    const ref = branch.id + '/checkpoint-r' + value.envelope.stateRevision + '.json';
    const old = await cached(ref);
    if (old) assert.deepEqual(old.envelope, value.envelope);
    else await save(ref, { envelope: value.envelope });
  }
}
function projection(runtime, state, weaponName = 'Quad K12', attackKind = 'ranged') {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: 'specops',
    context: { weaponName, attackKind } }).result;
}
function rawRangedAction(state, targetUnitId) {
  const domain = enumerateOfficialSelectedRosterRangedActionsV1(state).parameterDomains.find(row =>
    row.pieceId === 'specops' && row.weaponName === 'Quad K12');
  assert(domain);
  return instantiateOfficialSelectedRosterRangedActionV1(state, domain, { targetUnitId }).action;
}
async function attackAndFinish(product, id) {
  const old = await cached(id + '/completed.json');
  if (old) return old;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(roomId(id), branch.authority);
    await checkpoint(branch);
    let event;
    if (id === 'first-melee') {
      const domain = branch.runtime.enumerate(branch.authority.state).parameterDomains.find(row =>
        row.actionType === 'fight' && row.pieceId === 'specops');
      assert(domain);
      const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: 6 }] };
      await branch.native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'fight',
        select: row => row.domainId === domain.domainId, parameters: () => parameters });
      await checkpoint(branch);
      await completeWave3MeleePoolsV1({ directory: path.join(directory, id), native: branch.native,
        runtime: branch.runtime, roomId: roomId(id), credentials, operationPrefix: 'attack', selectPoolParameters: poolParameters });
      const after = await checkpoint(branch);
      event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
      assert.equal(event.stages.hitRolls.length, 6);
      assert.equal(projection(branch.runtime, after.envelope.state).firstGameWeaponPierce.remainingUses, 1);
      assert.equal(pieceOf(after.envelope.state, 'specops').officialFirstGameWeaponUses, undefined);
    } else {
      const targetPieceId = id.startsWith('later-') || id === 'quad-after-melee'
        ? 'later-target' : id === 'first-light' ? 'target' : 'armoured-target';
      const shot = await commitWave3RangedBatchV1({ directory: path.join(directory, id), native: branch.native,
        runtime: branch.runtime, roomId: roomId(id), credentials, attackerSideKey: 'player1', attackerPieceId: 'specops',
        targetPieceId, weaponName: 'Quad K12', operationKey: 'attack', selectPoolParameters: poolParameters });
      event = shot.event;
      const expectedDamage = id === 'first-light' ? 1 : id.startsWith('later-') ? 2 : 3;
      assert.equal(event.stages.hit.dice, 6);
      assert.equal(event.stages.damage.damagePerDie, expectedDamage);
      const uses = pieceOf(shot.after.envelope.state, 'specops').officialFirstGameWeaponUses;
      assert.equal(uses.length, 1);
      assert.equal(projection(branch.runtime, shot.after.envelope.state).firstGameWeaponPierce.remainingUses, 0);
      if (!id.startsWith('later-')) assert.equal(uses[0].attackResolutionHash, event.attackResolutionHash);
    }
    await capture(branch);
    await checkpoint(branch);
    const current = await branch.native.store.loadRoom(roomId(id));
    await branch.native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
      operationKey: 'finish', select: row => row.actionType === 'finish_activation' && row.pieceId === 'specops', parameters: () => ({}) });
    const after = await checkpoint(branch);
    assert.equal(after.envelope.state.activeSideKey, 'player2');
    const value = { id, event, finalRevision: after.stateRevision, nextSide: 'player2', queryEqualsNative: id !== 'first-melee', modelCalls: 0 };
    await save(id + '/completed.json', value);
    return value;
  } finally { branch.close(); }
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id);
  const bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}

async function verifyLegacy(product) {
  const old = await cached('legacy-cold-recovery.json');
  if (old) return old;
    const prefix = foundation + 'quad-armoured/';
    const authority = await read(prefix + 'authority.json');
    product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
    const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
    const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
      definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
      weaponDefinitionIds: [rangedId], includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const original = await fs.readFile(path.join(root, prefix, 'room.sqlite'));
    const copy = path.join(directory, 'legacy-room.sqlite');
    try { await fs.access(copy); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, original, { flag: 'wx' }); }
    const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      const legacyId = 'wave3-specops-quad-armoured';
      await native.restoreDependencies(legacyId, authority);
      const legacy = await replay(native, legacyId, prefix + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(path.join(root, prefix, 'room.sqlite'))), sha256(original));
      const result = { ...legacy, runtimeVersion: '3.86.0', descriptorExact: true, originalDatabaseUnchanged: true,
        originalDatabaseSha256: sha256(original), status: 'passed', modelCalls: 0 };
      await save('legacy-cold-recovery.json', result);
      return result;
    } finally { native.close(); }
}

async function main() {
await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Magrail-first-Quad-attack-per-game-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    for (const id of firstCases) await registerScene(context, id, await sceneFor(context, id));
    const { state } = await read(output + 'first-armoured/authority.json');
    const runtime = runtimeFor(context, state);
    const definition = runtime.catalogue.definitions.find(row => row.definitionId === magrailId);
    assert.equal(definition.execution.status, 'executable_exact');
    assert(runtime.descriptor.executableRuleAtomIds.includes(OFFICIAL_FIRST_GAME_WEAPON_USE_ATOM_ID));
    assert.throws(() => runtimeFor(context, state, []), /MAGRAIL_MUNITIONS_QUAD_CONSUMER_REQUIRED/);
    const initialBytes = JSON.stringify(state);
    const action = rawRangedAction(state, 'armoured-target');
    const mechanics = inspectOfficialSelectedRosterRangedActionContextV1(state, action);
    assert.equal(mechanics.profileForBatch.damagePerDie, 3);
    const miss = applyOfficialSelectedRosterRangedActionV1(state, action, {
      chanceReveals: Array(action.rangedPlan.chance.count).fill(1),
    });
    assert.equal(miss.events.find(row => row.type === 'ranged_attack').stages.hit.hits, 0);
    assert.equal(pieceOf(miss.state, 'specops').officialFirstGameWeaponUses.length, 1);
    const cleaned = runtime.router.dispatch({ operation: 'lifecycle', state: miss.state,
      request: { eventKind: 'cleanup_and_refresh' } }).state;
    assert.deepEqual(pieceOf(cleaned, 'specops').officialFirstGameWeaponUses,
      pieceOf(miss.state, 'specops').officialFirstGameWeaponUses);
    const other = structuredClone(state);
    assert.deepEqual(consumeOfficialCharacteristicStatusFirstGameWeaponV1(other, { pieceId: 'specops', weaponName: 'Strike' }), []);
    assert.equal(pieceOf(other, 'specops').officialFirstGameWeaponUses, undefined);
    const corrupt = structuredClone(miss.state);
    pieceOf(corrupt, 'specops').officialFirstGameWeaponUses[0].weaponName = 'Strike';
    assert.throws(() => projection(runtime, corrupt), /FIRST_GAME_WEAPON_USE_HISTORY_INVALID/);
    assert.equal(JSON.stringify(state), initialBytes);
    const ref = await save('compile.json', { definition, sourceRoute: runtime.bundle.routes[0],
      sourceRuntime: runtime.descriptor, fixedAllMiss: miss.events, privateCleanupPreserved: true,
      otherWeaponPreserved: true, corruptUseRejected: true, missingConsumerRejected: true, originalStateUnchanged: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of firstCases) results.push(await attackAndFinish(product, id));
    const ref = await save('consume.json', results);
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const firstId of firstCases) {
      const first = await product.branch(firstId);
      let state;
      try {
        await first.native.restoreDependencies(roomId(firstId), first.authority);
        const prior = await first.native.store.loadRoom(roomId(firstId));
        state = structuredClone(first.runtime.router.dispatch({ operation: 'lifecycle', state: prior.envelope.state,
          request: { eventKind: 'cleanup_and_refresh' } }).state);
        const afterMelee = firstId === 'first-melee';
        const id = afterMelee ? 'quad-after-melee' : 'later-' + firstId.slice(6);
        setPhase(state, 'assault', 2);
        state.supplyLossLedger = createOfficialSupplyLossLedgerV1({ round: 2,
          rulesRuntimeHash: state.officialMissionRuntimeDescriptor.runtimeHash });
        for (const piece of state.pieces) piece.activatedPhases = { movement: false, assault: false, combat: false };
        if (!pieceOf(state, 'target').isDestroyed) repositionSurvivors(pieceOf(state, 'target'), 44, 20);
        if (!pieceOf(state, 'armoured-target').isDestroyed) repositionSurvivors(pieceOf(state, 'armoured-target'), 45, 28);
        repositionSurvivors(pieceOf(state, 'later-target'), 24, 10);
        declareSurvivorCoherency(state);
        state = refreshOfficialReleaseRosterDerivedStateV2({ context: first.context, state });
        assert.equal(projection(first.runtime, state).firstGameWeaponPierce.remainingUses, afterMelee ? 1 : 0);
        await registerScene(first.context, id, { state, scenario: {
          sourceCheckpoint: output + firstId + '/checkpoint-r' + prior.stateRevision + '.json',
          actualPriorAttackHistory: true, privateCleanupThenDeclaredRoundTwo: true,
          declaredTargetPositionsAndActivationReset: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
        results.push(await attackAndFinish(product, id));
      } finally { first.close(); }
    }
    const ref = await save('successor.json', results);
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of [...firstCases, 'later-armoured', 'later-light', 'quad-after-melee']) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
      } finally { branch.close(); }
    }
    const legacy = await verifyLegacy(product);
    const ref = await save('cold-recovery.json', { current: results, legacy });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'spec-ops-magrail', status: gate.status, failures: gate.failures.length }));

}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { verifyLegacy, registry };
