import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, makeScene } from './verify-wave3-nova-weapons-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialMultiModelCasualtyResolutionKernelV1 }
  from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { evaluateOfficialHypotheticalCoherencySnapshotV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const previous = 'build/ticket-28-terran-wave3-20261117-v1/nova-devastating-charge/base/';
const definitionId = 'unit:nova_stealth_mode/operational-efficiency-assault-phase@1';
const rifleId = 'unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1';
const actionType = 'resolve_ranged_card_refresh';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-nova-refresh-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(row => row.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const cases = ['use', 'decline', 'no-supply-loss'];
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
  const assault = pieceOf(state, 'nova').officialUnitRecordKey === 'army_units:nova_assault_mode';
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    weaponDefinitionIds: [assault ? 'unit:nova_assault_mode/hellfire-shotgun-assault-phase@1' : rifleId],
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function declareInitialCasualties(state) {
  const target = pieceOf(state, 'target');
  const profile = state.officialCombatProfileBundle.profiles.find(row => row.recordKey === target.officialUnitRecordKey);
  const kernel = createOfficialMultiModelCasualtyResolutionKernelV1();
  const domain = kernel.createDomain({ targetPiece: target, targetHitPoints: profile.hitPoints,
    priorDamageMarker: 0, incomingDamage: profile.hitPoints * 2, visibleModelIds: target.models.map(row => row.id),
    engagementGraph: deriveOfficialEngagementGraphV2(state),
    attackResolutionHash: hash({ declaredInitialCasualties: target.id }), rulesRuntimeHash: kernel.descriptor.kernelHash });
  const casualty = kernel.resolve({ domain, casualtyModelIds: target.models.slice(-2).map(model => model.id) });
  applyOfficialSelectedRosterResolvedDamageV1(state, target, profile, casualty);
  assert.equal(target.currentModels, 4); assert.equal(target.currentSupply, 1);
  const models = target.models.filter(model => !model.isDestroyed);
  const coherency = evaluateOfficialHypotheticalCoherencySnapshotV1({ state, actor: target,
    dataBundle: state.officialModelBaseGeometryDataBundle,
    plan: { planId: 'declared-damaged-target', leadingModelId: models[0].id,
      placements: models.map(model => ({ modelId: model.id, xMilliInches: Math.round(model.xInches * 1000),
        yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })), currentlyEngagedEnemyUnitIds: [] } });
  assert.equal(coherency.inCoherency, true);
  target.coherencyStatus.declaredSnapshotResultHash = coherency.resultHash;
  return { declaredInitialCondition: true, domainHash: domain.domainHash, casualty, coherencyResultHash: coherency.resultHash };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.84.0');
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
    return { id, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const current = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey, select, parameters, kind });
  await checkpoint(branch); return result;
}
function attackEvent(state) {
  return state.log.flatMap(row => row.events || []).find(event => event.type === 'ranged_attack');
}
async function fire(branch, credentials) {
  const before = await checkpoint(branch);
  const query = branch.runtime.query(before.envelope.state, { queryKind: 'ranged_attack_preview', pieceId: 'nova',
    weaponName: 'C-20A Canister Rifle', parameters: { targetUnitId: 'target' } });
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  const applied = await invoke(branch, credentials, 'rifle', row => row.pieceId === 'nova' && row.weaponName === 'C-20A Canister Rifle',
    () => ({ targetUnitId: 'target' }));
  assert.deepEqual(applied.preview.core.action, query.result.action);
  for (let step = 0; step < 20; step++) {
    const current = await checkpoint(branch); if (attackEvent(current.envelope.state)) return current;
    const menu = branch.runtime.enumerate(current.envelope.state), domain = menu.parameterDomains[0];
    if (domain) await invoke(branch, credentials, 'pool-' + current.stateRevision, row => row.domainId === domain.domainId,
      () => poolParameters(domain));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'pool-' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded ranged attack did not settle');
}
function fixedFire(runtime, initial, hitRoll = 6) {
  let state = structuredClone(initial);
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.pieceId === 'nova' && row.weaponName === 'C-20A Canister Rifle');
  let action = runtime.instantiate(state, domain, { targetUnitId: 'target' }).action;
  for (let step = 0; step < 20; step++) {
    const chance = action.chance, rolls = [];
    if (chance?.revealOrder) for (const kind of chance.revealOrder) rolls.push(...Array(chance.layout[kind]).fill(kind === 'hit' ? hitRoll : 1));
    else rolls.push(...Array(chance?.count || 0).fill(action.actionType === 'roll_ranged_attack_hit_pool' ? hitRoll : 1));
    const result = runtime.apply(state, action, { chanceReveals: rolls }); state = result.state;
    if (attackEvent(state)) return { ...result, state };
    const menu = runtime.enumerate(state), nextDomain = menu.parameterDomains[0];
    if (nextDomain) action = runtime.instantiate(state, nextDomain, poolParameters(nextDomain)).action;
    else {
      assert.equal(menu.candidates.length, 1);
      action = Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
    }
  }
  assert.fail('bounded private attack did not settle');
}
function controls(runtime, initial) {
  const fixed = fixedFire(runtime, initial), state = fixed.state;
  assert.equal(attackEvent(state).targetDestroyed, true);
  assert.equal(runtime.cardRefresh.ownsWindow(state), true);
  const domain = runtime.enumerate(state).parameterDomains[0];
  const card = state.cardResources.player1.find(row => row.officialCardRecordKey === 'tactical_cards:barracks');
  assert.deepEqual(domain.parameterSchema.cardInstanceId.enum, [null, card.cardInstanceId]);
  for (const invalid of state.cardResources.player1.filter(row => row !== card).map(row => row.cardInstanceId)
    .concat(state.cardResources.player2.map(row => row.cardInstanceId))) {
    assert.throws(() => runtime.instantiate(state, domain, { cardInstanceId: invalid }));
  }
  assert.throws(() => runtime.instantiate(state, domain, { cardInstanceId: card.cardInstanceId, parentHash: 'model-supplied' }));
  const prepared = runtime.instantiate(state, domain, { cardInstanceId: card.cardInstanceId });
  const refreshed = runtime.apply(state, prepared.action, {});
  assert.equal(refreshed.state.cardResources.player1.find(row => row.cardInstanceId === card.cardInstanceId).readiness, 'ready');
  assert.deepEqual(runtime.cardRefresh.afterTransition(fixed).state, state, 'same completed attack queued twice');
  assert.deepEqual(runtime.cardRefresh.afterTransition({ ...fixed, state: refreshed.state }).state, refreshed.state,
    'same completed attack reopened after choice');
  assert.throws(() => runtime.apply(refreshed.state, prepared.action, {}));
  assert.throws(() => runtime.instantiate(refreshed.state, domain, { cardInstanceId: null }));
  const blocked = structuredClone(state); blocked.pendingOfficialReactionWindow = { engineeringBlockedParent: true };
  assert.equal(runtime.cardRefresh.ownsWindow(blocked), false);
  assert.equal(runtime.cardRefresh.enumerate(blocked).parameterDomains.length, 0);
  const empty = structuredClone(initial); empty.cardResources.player1.forEach(row => { row.readiness = 'ready'; });
  const noCard = fixedFire(runtime, empty);
  assert.equal(runtime.cardRefresh.pending(noCard.state), null);
  assert.equal(noCard.state.officialRangedCardRefreshHistory.at(-1).decision, 'no_eligible_card');
  const missed = fixedFire(runtime, initial, 1);
  assert.equal(attackEvent(missed.state).currentSupplyAfter, attackEvent(missed.state).currentSupplyBefore);
  assert.equal(runtime.cardRefresh.pending(missed.state), null);
  return { fixedPrivateOnly: true, sourceBoundDestroyedTarget: true, uniqueFactionReadyEnemyRejected: true,
    noEligibleCardNoWindow: true, noSupplyChangeNoWindow: true, queuedOnce: true,
    mandatoryParentBlocksChoice: true, staleRejected: true, noNativeDiceChanged: true };
}
async function replay(native, id, prefix) {
  const current = await native.store.loadRoom(id), journal = await native.store.loadReplayBundle(id);
  const receipts = journal.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= current.stateRevision; revision++) {
    const actual = native.engine.replay({ initialEnvelope: journal.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(actual.ok, true, JSON.stringify(actual));
    assert.deepEqual(actual.envelope, (await read(prefix + revision + '.json')).envelope);
  }
  return { receipts: receipts.length, checkpoints: current.stateRevision + 1, exact: true };
}

async function main() {
await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-operational-efficiency-owned-ranged-outcome-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    const old = await makeScene(context, { id: 'rifle-normal', mode: 'stealth', phase: 'assault', targetX: 18,
      dice: 4, hit: 3, damage: 2 });
    assert.deepEqual(old.state, (await read('build/ticket-28-terran-wave3-20261117-v1/nova-weapons/rifle-normal/authority.json')).state);
    for (const id of cases) {
      const scene = await makeScene(context, { id, mode: 'stealth', phase: 'assault', targetX: 18,
        targetRecordKey: id === 'no-supply-loss' ? 'army_units:goliath' : 'army_units:marine',
        ...(id === 'no-supply-loss' ? { targetTacticalCardRecordKeys: ['tactical_cards:factory'] } : {}),
        tacticalCardRecordKeys: ['tactical_cards:barracks', 'tactical_cards:academy', 'tactical_cards:engineering_bay'],
        extraCharacteristicDefinitionIds: [definitionId] });
      const declaredCasualties = id === 'no-supply-loss' ? null : declareInitialCasualties(scene.state);
      scene.state.cardResources.player1.forEach(card => {
        if (card.officialCardRecordKey !== 'tactical_cards:engineering_bay') card.readiness = 'exhausted';
      });
      scene.state = refreshOfficialReleaseRosterDerivedStateV2({ context, state: scene.state });
      scene.scenario.declaredInitialCasualties = declaredCasualties;
      scene.scenario.declaredCardReadiness = true;
      await registerScene(context, id, scene);
    }
    const authority = await read(output + 'use/authority.json'), runtime = runtimeFor(context, authority.state);
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    assert.equal(runtime.cardRefresh.pending(authority.state), null);
    const bad = structuredClone(authority.state); bad.officialCardBuildPaymentDataBundle.cardProfiles[0].isUnique = false;
    assert.throws(() => runtimeFor(context, bad), /RANGED_CARD_REFRESH_CARD_SOURCE_MISMATCH/);
    const control = controls(runtime, authority.state); await save('controls.json', control);
    const ref = await save('compile.json', { sourceRoute: runtime.bundle.routes.find(row => row.definitionId === definitionId),
      factoryDefaultsExact: true, controls: control, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of cases) {
      const saved = await cached(id + '/consumed.json'); if (saved) { results.push(saved); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const after = await fire(branch, credentials), event = attackEvent(after.envelope.state);
        if (id === 'no-supply-loss') {
          assert.equal(event.targetDestroyed, false); assert.equal(event.currentSupplyAfter, event.currentSupplyBefore);
          assert.equal(branch.runtime.cardRefresh.pending(after.envelope.state), null);
        } else {
          assert(event.targetDestroyed || event.currentSupplyAfter < event.currentSupplyBefore,
            'Native dice gave no qualifying outcome; preserve sample, do not fabricate trigger');
          const domain = branch.runtime.enumerate(after.envelope.state).parameterDomains[0];
          assert.equal(domain.actionType, actionType);
          assert(!branch.runtime.enumerate(after.envelope.state).parameterDomains.some(row => row.actionType === 'finish_activation'));
          const query = branch.runtime.query(after.envelope.state, { queryKind: 'ranged_card_refresh_status' });
          assert.deepEqual(query.result.choices[0], domain.parameterSchema.cardInstanceId.enum);
          assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), after);
          const selected = id === 'use' ? domain.parameterSchema.cardInstanceId.enum.find(value => value !== null) : null;
          const beforeCards = structuredClone(after.envelope.state.cardResources);
          await invoke(branch, credentials, 'refresh-choice', row => row.actionType === actionType, () => ({ cardInstanceId: selected }));
          const consumed = await checkpoint(branch), state = consumed.envelope.state;
          if (selected !== null) beforeCards.player1.find(card => card.cardInstanceId === selected).readiness = 'ready';
          assert.deepEqual(state.cardResources, beforeCards);
          assert.deepEqual(state.pieces, after.envelope.state.pieces);
          assert.equal(branch.runtime.cardRefresh.pending(state), null);
          assert.equal(state.officialRangedCardRefreshHistory.length, 1);
          assert.equal(state.officialRangedCardRefreshHistory[0].decision, selected === null ? 'declined' : 'refreshed');
        }
        const current = await checkpoint(branch);
        const value = { id, revision: current.stateRevision, event, decision: current.envelope.state.officialRangedCardRefreshHistory?.at(-1) || null,
          cardResources: current.envelope.state.cardResources, modelCalls: 0 };
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
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
        const current = await checkpoint(branch); assert.equal(current.envelope.state.activeSideKey, 'player2');
        results.push({ id, revision: current.stateRevision, nextSide: 'player2' });
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of cases) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        results.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    const old = registry(); let native;
    try {
      const authority = await read(previous + 'authority.json'); old.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await old.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state); assert.equal(runtime.descriptor.runtimeVersion, '3.83.0');
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const file = path.join(root, previous, 'room.sqlite'), bytes = await fs.readFile(file), target = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(target); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
      native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite', rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      const id = 'wave3-nova-charge-base'; await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, previous + 'checkpoint-r'); assert.equal(sha256(await fs.readFile(file)), sha256(bytes));
      const ref = await save('cold-recovery.json', { current: results, legacy: { ...legacy, runtimeVersion: '3.83.0', descriptorExact: true,
        originalDatabaseSha256: sha256(bytes), originalDatabaseUnchanged: true } });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { native?.close(); old.close(); }
  } },
] });
console.log(JSON.stringify({ gate: 'nova-operational-efficiency', status: gate.status, failures: gate.failures.length }));
const lifecycleGate = await runProductBoundaryCheck({ directory: path.join(directory, 'lifecycle-binding'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-card-refresh-blocks-lifecycle-v1',
}, steps: [{ name: 'consume', repairRef, openProduct: sourceProduct, check: async context => {
  const scene = await makeScene(context, { id: 'refresh-and-stimpack', mode: 'stealth', phase: 'assault', targetX: 18,
    tacticalCardRecordKeys: ['tactical_cards:barracks'],
    extraCharacteristicDefinitionIds: [definitionId, 'unit:nova_stealth_mode/super-stimpack-movement-phase@1'] });
  scene.state.cardResources.player1.find(card => card.officialCardRecordKey === 'tactical_cards:barracks').readiness = 'exhausted';
  const runtime = runtimeFor(context, scene.state), fixed = fixedFire(runtime, scene.state);
  assert(runtime.cardRefresh.pending(fixed.state));
  assert.equal(typeof runtime.lifecycle, 'function');
  assert.throws(() => runtime.lifecycle(fixed.state, { eventKind: 'round_end' }), /RANGED_CARD_REFRESH_CHOICE_REQUIRED/);
  assert.throws(() => runtime.lifecycle(fixed.state, { eventKind: 'cleanup_and_refresh' }), /RANGED_CARD_REFRESH_CHOICE_REQUIRED/);
  const domain = runtime.enumerate(fixed.state).parameterDomains[0];
  const next = runtime.apply(fixed.state, runtime.instantiate(fixed.state, domain, { cardInstanceId: null }).action, {}).state;
  assert.equal(runtime.cardRefresh.pending(next), null);
  const completed = runtime.lifecycle(next, { eventKind: 'round_end' });
  assert.equal(runtime.cardRefresh.pending(completed.state), null);
  const ref = await save('lifecycle-binding.json', { sourceFactory: true, privateFixedAttack: true,
    pendingChoiceBlocksRoundAndCleanup: true, decliningRestoresLifecycle: true, modelCalls: 0 });
  return { evidenceRef: ref, checkpointRef: ref };
} }] });
console.log(JSON.stringify({ gate: 'nova-card-refresh-lifecycle', status: lifecycleGate.status, failures: lifecycleGate.failures.length }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { declareInitialCasualties };
