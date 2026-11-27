import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, makeScene } from './verify-wave3-nova-weapons-v1.mjs';
import { declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../packages/rule-atoms/official-impact-allocation-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/nova-devastating-charge/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const previous = 'build/ticket-28-terran-wave3-20261117-v1/nova-weapons/shotgun-burst/';
const impactId = 'unit:nova_assault_mode/devastating-charge-assault-phase@1';
const stimId = 'unit:nova_assault_mode/super-stimpack-movement-phase@1';
const weaponId = 'unit:nova_assault_mode/hellfire-shotgun-assault-phase@1';
const cases = ['base', 'stimpack'];
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-nova-charge-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return output + name;
}
async function cached(name) {
  try { return await read(output + name); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
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
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: [weaponId], includeRanged: true, includeMelee: true,
    includePrecisionChoices: true, includeArmourChoices: true });
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.83.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: descriptorRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state, scenario: scene.scenario });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
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
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized', sideKey) {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[sideKey || current.envelope.state.activeSideKey], operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
function chargePosition(state) {
  const actor = pieceOf(state, 'nova'), target = pieceOf(state, 'target');
  const targetX = actor.models[0].xInches + Math.round(actor.models[0].baseWidthInches * 500) / 1000
    + Math.round(target.models[0].baseWidthInches * 500) / 1000 + 1.1;
  target.models.forEach((model, index) => Object.assign(model, { xInches: targetX + index % 3 * 1.3,
    yInches: 10 + Math.floor(index / 3) * 1.3 }));
  state.phase = 'assault'; state.activeSideKey = 'player1'; state.firstPlayerSideKey = 'player1';
  delete state.selectedRosterActivationWindow;
  state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
  declareCoherency(state);
}
function impactParameters(domain) {
  const schema = domain.parameterSchema;
  return { allocations: schema.eligibleModels.map(model => ({ modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice })) };
}
function impactEvent(state) {
  return state.log.flatMap(row => row.events || []).find(event => event.type === 'impact_damage');
}
function fixedImpact(runtime, initial, hitRoll) {
  let state = structuredClone(initial); const trace = [];
  for (let step = 0; step < 32; step++) {
    const event = impactEvent(state); if (event) return { event, trace, state };
    const menu = runtime.enumerate(state), domain = menu.parameterDomains[0];
    let action;
    if (domain) action = runtime.instantiate(state, domain, domain.parameterSchema.required.includes('allocations')
      ? impactParameters(domain) : poolParameters(domain)).action;
    else {
      assert.equal(menu.candidates.length, 1);
      action = Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) =>
        !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
    }
    const rolls = [];
    if (action.chance?.revealOrder) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? hitRoll : 1));
    } else rolls.push(...Array(action.chance?.count || 0).fill(action.actionType === 'roll_melee_attack_hit_pool' ? hitRoll : 1));
    const result = runtime.apply(state, action, { chanceReveals: rolls }); state = result.state;
    trace.push({ actionType: action.actionType, rolls, events: result.events });
  }
  assert.fail('bounded fixed private IMPACT did not settle');
}
function fixedFailedCharge(runtime, initial) {
  let state = structuredClone(initial);
  const actor = pieceOf(state, 'nova'), target = pieceOf(state, 'target');
  const firstX = actor.models[0].xInches + Math.round(actor.models[0].baseWidthInches * 500) / 1000
    + Math.round(target.models[0].baseWidthInches * 500) / 1000 + 12.5;
  target.models.forEach((model, index) => Object.assign(model, { xInches: firstX + index % 3 * 1.3,
    yInches: 10 + Math.floor(index / 3) * 1.3 }));
  declareCoherency(state);
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'charge' && row.pieceId === 'nova');
  assert(domain);
  const declare = runtime.instantiate(state, domain, { leadingModelId: actor.models[0].id,
    targets: [{ unitId: target.id, modelId: target.models[0].id }] }).action;
  const rolls = Array(declare.chance.count).fill(1);
  state = runtime.apply(state, declare, { chanceReveals: rolls }).state;
  const resolve = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'resolve_charge');
  const failure = runtime.instantiate(state, resolve, { outcome: 'failure', failureProof: { kind: 'distance_shortfall' } }).action;
  const result = runtime.apply(state, failure, {});
  assert(result.events.some(event => event.type === 'charge_failed'));
  assert.equal(result.state.pendingAction, undefined); assert.equal(impactEvent(result.state), undefined);
  assert(!runtime.enumerate(result.state).parameterDomains.some(row => row.actionType === 'resolve_impact'));
  assert.deepEqual(pieceOf(result.state, 'nova').models, actor.models);
  return { declaredBaseGapMilliInches: 12500, rolls, failureAction: failure, events: result.events,
    noImpactTriggered: true, privateProductBranchOnly: true };
}
async function settleImpact(branch, credentials) {
  for (let step = 0; step < 24; step++) {
    const current = await checkpoint(branch); if (impactEvent(current.envelope.state)) return current;
    const menu = branch.runtime.enumerate(current.envelope.state), domain = menu.parameterDomains[0];
    if (domain) await invoke(branch, credentials, 'pool-' + current.stateRevision,
      row => row.domainId === domain.domainId, () => poolParameters(domain));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'pool-' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded native IMPACT did not settle');
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const result = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-nova-devastating-charge-factory-native-and-stimpack-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const oldAuthority = await read(previous + 'authority.json');
    const oldScene = await makeScene(context, { id: 'shotgun-burst', mode: 'assault', phase: 'assault', targetX: 14, dice: 6, hit: 4, damage: 2, burst: true });
    assert.deepEqual(oldScene.state, oldAuthority.state);
    const scene = await makeScene(context, { id: 'base', mode: 'assault', phase: 'assault', targetX: 20,
      meleeModifierDefinitionIds: [impactId], extraCharacteristicDefinitionIds: [stimId] });
    chargePosition(scene.state); scene.state = refreshOfficialReleaseRosterDerivedStateV2({ context, state: scene.state });
    const runtime = runtimeFor(context, scene.state);
    assert.deepEqual(scene.state.officialImpactAllocationPolicy, OFFICIAL_IMPACT_ALLOCATION_POLICY_V13);
    const query = runtime.query(scene.state, { queryKind: 'melee_modifiers', pieceId: 'nova' });
    assert.equal(query.result.devastatingCharge.definitionId, impactId);
    assert.equal(query.result.devastatingCharge.impactDicePerEligibleModel, 4); assert.equal(query.result.devastatingCharge.hitThreshold, 4);
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === impactId).execution.status, 'executable_exact');
    const missing = structuredClone(scene.state); delete missing.officialImpactAllocationPolicy;
    assert.throws(() => runtimeFor(context, missing), /NOVA_CHARGE_IMPACT_ALLOCATION_POLICY_REQUIRED/);
    const wrong = structuredClone(scene.state); wrong.officialMeleeFamilySourceBundle.routes[0].impactDicePerEligibleModel = 99;
    assert.throws(() => runtimeFor(context, wrong));
    assert(!runtime.enumerate(scene.state).parameterDomains.some(row => row.actionType === 'resolve_impact'));
    await registerScene(context, 'base', { ...scene, scenario: { ...scene.scenario, declaredBaseGapMilliInches: 1100 } });
    const movement = await makeScene(context, { id: 'movement', mode: 'assault', phase: 'movement', targetX: 20,
      meleeModifierDefinitionIds: [impactId], extraCharacteristicDefinitionIds: [stimId] });
    await registerScene(context, 'movement', movement);
    const product = openProduct(), branch = await product.branch('movement');
    try {
      const credentials = await branch.native.create(roomId('movement'), branch.authority);
      await invoke(branch, credentials, 'stimpack', row => row.pieceId === 'nova' && row.abilityName === 'Super Stimpack',
        domain => ({ activeUnitId: 'nova', paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }),
        'parameterized', 'player1');
      await invoke(branch, credentials, 'move', row => row.pieceId === 'nova' && row.actionType === 'move', () => ({
        leadingModelId: pieceOf(branch.authority.state, 'nova').models[0].id,
        path: [{ xMilliInches: 9000, yMilliInches: 10000 }], placements: [] }), 'parameterized', 'player1');
      await invoke(branch, credentials, 'finish', row => row.pieceId === 'nova' && row.actionType === 'finish_activation',
        () => ({}), 'parameterized', 'player1');
      const current = await checkpoint(branch), state = structuredClone(current.envelope.state);
      assert.equal(state.activeSideKey, 'player2'); assert.equal(state.cardResources.player1[0].readiness, 'exhausted');
      assert(pieceOf(state, 'nova').officialAbilityEffects.some(row => row.sourceDefinitionId === stimId));
      chargePosition(state);
      const derived = refreshOfficialReleaseRosterDerivedStateV2({ context: branch.context, state });
      await registerScene(branch.context, 'stimpack', { state: derived, scenario: { sourceCheckpoint: output + 'movement/checkpoint-r' + current.stateRevision + '.json',
        actualStimpackMoveAndFinish: true, declaredAssaultPhaseAndEnemyPosition: true, declaredBaseGapMilliInches: 1100,
        fullRound: false, fullMatch: false, modelCalls: 0 } });
    } finally { branch.close(); product.close(); }
    const ref = await save('compile.json', { sourceQuery: query, factoryOwnsPolicy: true, oldFactoryDefaultExact: true,
      missingPolicyAndForgedSourceRejected: true, actualPriorStimpackRoom: 'movement', modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of cases) {
      const old = await cached(id + '/consumed.json'); if (old) { results.push(old); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const actor = pieceOf(branch.authority.state, 'nova'), target = pieceOf(branch.authority.state, 'target');
        await invoke(branch, credentials, 'declare-charge', row => row.actionType === 'charge' && row.pieceId === 'nova',
          () => ({ leadingModelId: actor.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }] }), 'parameterized', 'player1');
        const contactX = Math.round(target.models[0].xInches * 1000) - Math.round(target.models[0].baseWidthInches * 500)
          - Math.round(actor.models[0].baseWidthInches * 500);
        await invoke(branch, credentials, 'resolve-charge', row => row.actionType === 'resolve_charge', () => ({ outcome: 'success',
          path: [{ xMilliInches: contactX, yMilliInches: 10000, elevation: 'ground', supportTerrainIds: [] }], placements: [] }), 'parameterized', 'player1');
        const ready = await checkpoint(branch); assert.equal(ready.envelope.state.pendingAction.sourceDefinitionId, impactId);
        assert.equal(ready.envelope.state.pendingAction.impactDice, 4); assert.equal(ready.envelope.state.pendingAction.baseHitThreshold, 4);
        const menu = branch.runtime.enumerate(ready.envelope.state);
        assert(!menu.parameterDomains.some(row => row.actionType === 'finish_activation'));
        const domain = menu.parameterDomains.find(row => row.actionType === 'resolve_impact'); assert(domain);
        const parameters = impactParameters(domain), bad = structuredClone(parameters); bad.allocations[0].dice = 5;
        assert.throws(() => branch.runtime.instantiate(ready.envelope.state, domain, bad));
        const positive = fixedImpact(branch.runtime, ready.envelope.state, 6), miss = fixedImpact(branch.runtime, ready.envelope.state, 1);
        const failedCharge = fixedFailedCharge(branch.runtime, branch.authority.state);
        assert.equal(positive.event.stages.hitRolls.length, 4); assert.equal(positive.event.stages.hitThreshold, 4);
        assert.equal(positive.event.stages.totalDamage, 4); assert.equal(miss.event.stages.totalDamage, 0);
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), ready, 'fixed private branches changed Native state');
        await save(id + '/fixed-private.json', { positive: { event: positive.event, trace: positive.trace },
          miss: { event: miss.event, trace: miss.trace }, failedCharge,
          privateProductBranchesOnly: true, nativeRandomnessUnmodified: true });
        const query = branch.runtime.query(ready.envelope.state, { queryKind: 'melee_action_preview', actionType: 'resolve_impact',
          pieceId: 'nova', parameters });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), ready);
        const applied = await invoke(branch, credentials, 'impact', row => row.domainId === domain.domainId, () => parameters, 'parameterized', 'player1');
        assert.deepEqual(applied.preview.core.action, query.result.action);
        const after = await settleImpact(branch, credentials), event = impactEvent(after.envelope.state);
        assert.equal(event.stages.hitRolls.length, 4); assert.equal(event.stages.hitThreshold, 4); assert.equal(event.stages.damagePerDie, 1);
        assert.deepEqual(after.envelope.state.cardResources, ready.envelope.state.cardResources);
        assert.equal(after.envelope.state.pendingAction, undefined);
        const value = { id, revision: after.stateRevision, query, event, queryEqualsNative: true,
          actualSourceDefinitionId: ready.envelope.state.pendingAction.sourceDefinitionId, fixedBranchesSeparate: true, modelCalls: 0 };
        await save(id + '/consumed.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of cases) {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova',
          () => ({}), 'parameterized', 'player1');
        const current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
        const value = { id, revision: current.stateRevision, nextSide: 'player2' }; await save(id + '/successor.json', value); results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of ['movement', ...cases]) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    const previousProduct = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json'); previousProduct.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await previousProduct.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state); assert.equal(runtime.descriptor.runtimeVersion, '3.82.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const sourcePath = path.join(root, previous, 'room.sqlite'), bytes = await fs.readFile(sourcePath), targetPath = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(targetPath); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(targetPath, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      const id = 'wave3-nova-weapons-shotgun-burst'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, previous + 'checkpoint-r'); assert.equal(sha256(await fs.readFile(sourcePath)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy, runtimeVersion: '3.82.0',
        descriptorExact: true, originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); previousProduct.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'nova-devastating-charge', status: gate.status, failures: gate.failures.length }));
