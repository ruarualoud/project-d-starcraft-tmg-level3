import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { root, makeScene } from './verify-wave3-nova-weapons-v1.mjs';
import { declareInitialCasualties } from './verify-wave3-nova-operational-efficiency-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialSupplyLossLedgerV1 } from '../packages/rule-atoms/official-supply-loss-ledger-v1.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/nova-head-shot/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const definitionId = 'unit:nova_stealth_mode/head-shot-assault-phase@1';
const efficiencyId = 'unit:nova_stealth_mode/operational-efficiency-assault-phase@1';
const rifleId = 'unit:nova_stealth_mode/c-20a-canister-rifle-assault-phase@1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-nova-head-shot-' + id;
const releaseId = id => roomId(id) + '-v1';
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const cases = ['use', 'pass'];
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
    weaponDefinitionIds: [rifleId], includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
function cardOf(state) {
  return state.cardResources.player1.find(card => card.officialCardRecordKey === 'tactical_cards:barracks');
}
function declarationParameters(domain, choice) {
  const row = domain.constraints.choices.find(entry => entry.reactionAbilityName === choice);
  assert(row, 'requested reaction not in product choices');
  return { reactionAbilityName: row.reactionAbilityName, paymentCardInstanceIds: row.paymentCardInstanceIds };
}
async function createScene(context, id) {
  const scene = await makeScene(context, { id, mode: 'stealth', phase: 'assault', targetX: 18,
    tacticalCardRecordKeys: ['tactical_cards:barracks'], reactionDefinitionIds: [definitionId],
    extraCharacteristicDefinitionIds: [efficiencyId] });
  scene.scenario.declaredInitialCasualties = declareInitialCasualties(scene.state);
  scene.state.cardResources.player1.find(card => card.cardKind === 'faction').readiness = 'exhausted';
  pieceOf(scene.state, 'nova').statuses.push('stationary');
  scene.state = refreshOfficialReleaseRosterDerivedStateV2({ context, state: scene.state });
  scene.scenario.declaredStationaryAndFactionExhaustion = true;
  return scene;
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.85.0');
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
    if (domain) await invoke(branch, credentials, 'pool-' + current.stateRevision, row => row.domainId === domain.domainId, () => poolParameters(domain));
    else {
      assert.equal(menu.candidates.length, 1);
      await invoke(branch, credentials, 'pool-' + current.stateRevision, () => true, null, 'finite');
    }
  }
  assert.fail('bounded Head Shot attack did not settle');
}
function fixedFire(runtime, initial) {
  let state = structuredClone(initial);
  let domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'declare_ranged_attack');
  state = runtime.apply(state, runtime.instantiate(state, domain, declarationParameters(domain, 'Head Shot')).action, {}).state;
  domain = runtime.enumerate(state).parameterDomains.find(row => row.weaponName === 'C-20A Canister Rifle');
  let action = runtime.instantiate(state, domain, { targetUnitId: 'target' }).action;
  for (let step = 0; step < 20; step++) {
    const rolls = [];
    if (action.chance?.revealOrder) for (const kind of action.chance.revealOrder) rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? 6 : 1));
    else rolls.push(...Array(action.chance?.count || 0).fill(1));
    const result = runtime.apply(state, action, { chanceReveals: rolls }); state = result.state;
    if (attackEvent(state)) return { ...result, state };
    const menu = runtime.enumerate(state), next = menu.parameterDomains[0];
    if (next) action = runtime.instantiate(state, next, poolParameters(next)).action;
    else {
      assert.equal(menu.candidates.length, 1);
      action = Object.fromEntries(Object.entries(menu.candidates[0]).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
    }
  }
  assert.fail('bounded private Head Shot did not settle');
}
async function controls(context, initial) {
  const runtime = runtimeFor(context, initial), domain = runtime.enumerate(initial).parameterDomains.find(row => row.actionType === 'declare_ranged_attack');
  assert.deepEqual(JSON.parse(JSON.stringify(domain)), domain, 'declaration domain lost fields across product serialization');
  assert(domain.constraints.choices.some(row => row.reactionAbilityName === 'Head Shot'));
  assert(!runtime.enumerate(initial).parameterDomains.some(row => row.weaponName === 'C-20A Canister Rifle'));
  assert.throws(() => runtime.query(initial, { queryKind: 'ranged_attack_preview', pieceId: 'nova', weaponName: 'C-20A Canister Rifle',
    parameters: { targetUnitId: 'target' } }), /DOMAIN_UNAVAILABLE/);
  const withoutStationary = structuredClone(initial);
  pieceOf(withoutStationary, 'nova').statuses = [];
  const noStatus = runtime.enumerate(withoutStationary).parameterDomains.find(row => row.actionType === 'declare_ranged_attack');
  assert(!noStatus?.constraints.choices.some(row => row.reactionAbilityName === 'Head Shot'));
  const noCp = structuredClone(initial); noCp.cardResources.player1.forEach(card => { card.readiness = 'exhausted'; });
  const noPay = runtime.enumerate(noCp).parameterDomains.find(row => row.actionType === 'declare_ranged_attack');
  assert(!noPay?.constraints.choices.some(row => row.reactionAbilityName === 'Head Shot'));
  const close = structuredClone(initial), actor = pieceOf(close, 'nova'), target = pieceOf(close, 'target');
  const x = actor.models[0].xInches + (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5;
  target.models.forEach((model, index) => { model.xInches = x + index % 3 * 1.3; });
  const inEngagement = runtime.enumerate(close).parameterDomains.find(row => row.actionType === 'declare_ranged_attack');
  assert(!inEngagement?.constraints.choices.some(row => row.reactionAbilityName === 'Head Shot'));
  const wrongPhase = structuredClone(initial); wrongPhase.phase = 'movement';
  assert.equal(runtime.rangedDeclaration.enumerate(wrongPhase).parameterDomains.length, 0);
  const selected = runtime.instantiate(initial, domain, declarationParameters(domain, 'Head Shot'));
  const declared = runtime.apply(initial, selected.action, {}).state;
  assert.throws(() => runtime.instantiate(declared, domain, declarationParameters(domain, 'Head Shot')));
  const parent = runtime.rangedDeclaration.pending(declared);
  assert.equal(parent.profileKey, 'army_units:nova_stealth_mode::assault::C-20A Canister Rifle');
  assert.equal(parent.keywordEffects[0].weaponDamage, 3); assert.equal(parent.keywordEffects[0].concentratedFire, 1);
  const fixed = fixedFire(runtime, initial), event = attackEvent(fixed.state);
  assert.equal(event.stages.damage.damagePerDie, 3); assert.equal(event.stages.damage.totalDamage, 12);
  assert.equal(event.concentratedFire.maximumCasualties, 1); assert.equal(event.casualtyModelIds.length, 1);
  assert.equal(pieceOf(fixed.state, 'target').currentModels, 3);
  assert.equal(runtime.rangedDeclaration.pending(fixed.state), null);
  const refresh = runtime.enumerate(fixed.state).parameterDomains.find(row => row.actionType === 'resolve_ranged_card_refresh');
  assert(refresh);
  const card = cardOf(fixed.state), restored = runtime.apply(fixed.state,
    runtime.instantiate(fixed.state, refresh, { cardInstanceId: card.cardInstanceId }).action, {}).state;
  assert.equal(cardOf(restored).readiness, 'ready');
  assert.equal(restored.officialReactionHistory.filter(row => row.definitionId === definitionId).length, 1);
  await save('private-fixed-after-refresh.json', { state: restored, event,
    privateFixedProductBranchOnly: true, checkedDamageCapPaymentRefreshAndOncePerGameHistory: true, nativeDiceUnmodified: true });
  const nextRound = structuredClone(restored); nextRound.round = 2; nextRound.activeSideKey = 'player1';
  nextRound.supplyLossLedger = createOfficialSupplyLossLedgerV1({ round: 2,
    rulesRuntimeHash: restored.supplyLossLedger.rulesRuntimeHash });
  delete nextRound.selectedRosterActivationWindow; pieceOf(nextRound, 'nova').activatedPhases = {};
  nextRound.phaseFirstActorByRound['2:assault'] = { round: 2, phase: 'assault', chosenFirstActorSideKey: 'player1' };
  const nextMenu = runtime.rangedDeclaration.enumerate(nextRound);
  assert(!nextMenu.parameterDomains.some(row => row.constraints.choices.some(choice => choice.reactionAbilityName === 'Head Shot')));
  const missing = structuredClone(initial); delete missing.officialRangedDeclarationPolicy;
  assert.throws(() => runtimeFor(context, missing), /RANGED_DECLARATION_POLICY_SOURCE_REQUIRED/);
  return { fixedPrivateOnly: true, totalDamage12MaximumCasualties1: true, efficiencyReadyKeepsOncePerGame: true,
    declaredNextRoundOnly: true, missingStationaryRejected: true, gapHalfInchEngagedRejected: true,
    noPaymentAndWrongPhaseRejected: true, staleAndMissingOwnerRejected: true, nativeDiceUnmodified: true };
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
async function legacyProof(product, id, prefix, nativeId, tank = false) {
  const completed = await cached('legacy-' + id + '-replay.json');
  if (completed) return completed;
  const authority = await read(prefix + 'authority.json'); product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
  const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
  const runtime = tank ? createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
    definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
    includePrecisionChoices: true, includeArmourChoices: true }) : runtimeFor(context, authority.state);
  assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
  const file = path.join(root, prefix, 'room.sqlite'), target = path.join(directory, 'legacy-' + id + '.sqlite');
  let bytes, storedBytes, storedFile = file, archived = false;
  try { bytes = await fs.readFile(file); storedBytes = bytes; }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const manifest = await read('build/ticket-28-wave2-capabilities-20261113-v1/large-melee-and-groups/space-recovery-manifest.json');
    const entry = manifest.entries.find(row => row.path === prefix + 'room.sqlite' && row.restoredByteHashVerified === true);
    assert(entry, 'compressed original lacks verified recovery manifest');
    storedFile = path.join(root, entry.archivePath); storedBytes = await fs.readFile(storedFile);
    bytes = gunzipSync(storedBytes); archived = true;
    assert.equal(bytes.length, entry.bytes); assert.equal(sha256(bytes), entry.sha256);
  }
  try { await fs.access(target); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(target, bytes, { flag: 'wx' }); }
  const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-' + id + '.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    await native.restoreDependencies(nativeId, authority);
    const result = await replay(native, nativeId, prefix + 'checkpoint-r');
    assert.equal(sha256(await fs.readFile(storedFile)), sha256(storedBytes));
    const value = { id, ...result, runtimeVersion: runtime.descriptor.runtimeVersion,
      descriptorExact: true, originalDatabaseSha256: sha256(bytes),
      ...(archived ? { sourceStorage: 'verified_gzip_original', restoredOriginalBytesVerified: true,
        originalArchiveUnchanged: true, originalArchiveSha256: sha256(storedBytes) }
        : { sourceStorage: 'sqlite', originalDatabaseUnchanged: true }) };
    await save('legacy-' + id + '-replay.json', value); return value;
  } finally { native.close(); }
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--legacy-only')) {
  const legacyGate = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-08-head-shot-shared-owner-legacy-replay-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct: registry, check: async product => {
    const results = [];
    results.push(await legacyProof(product, 'nova-refresh', 'build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/use/', 'wave3-nova-refresh-use'));
    for (const id of ['shaped', 'smart', 'pass']) results.push(await legacyProof(product, 'tank-' + id,
      'build/ticket-28-wave2-capabilities-20261113-v1/tank-declaration-reactions/' + id + '/', 'wave2-tank-declaration-' + id, true));
    const ref = await save('legacy-cold-recovery.json', results); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'head-shot-legacy-only', status: legacyGate.status, failures: legacyGate.failures.length }));
} else {
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-head-shot-paid-ranged-declaration-and-efficiency-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    for (const id of cases) await registerScene(context, id, await createScene(context, id));
    const authority = await read(output + 'use/authority.json'), runtime = runtimeFor(context, authority.state);
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    assert.equal(authority.state.officialSiegeModeDataBundle, undefined);
    const control = await controls(context, authority.state); await save('controls.json', control);
    const ref = await save('compile.json', { sourceRoute: runtime.reactionBundle.routes.find(row => row.definitionId === definitionId),
      declarationRuntime: runtime.rangedDeclaration.descriptor, noTankModeDependency: true, controls: control, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of cases) {
      const saved = await cached(id + '/consumed.json'); if (saved) { results.push(saved); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority), before = await checkpoint(branch);
        const query = branch.runtime.query(before.envelope.state, { queryKind: 'ranged_declaration_options', pieceId: 'nova' });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
        assert.equal(query.result.length, 1);
        const declaration = await invoke(branch, credentials, 'declaration', row => row.actionType === 'declare_ranged_attack',
          domain => declarationParameters(domain.sourceDomain, id === 'use' ? 'Head Shot' : 'pass'));
        assert.equal(declaration.preview.core.chanceTicket, null);
        const ready = await checkpoint(branch);
        assert.equal(cardOf(ready.envelope.state).readiness, id === 'use' ? 'exhausted' : 'ready');
        assert.equal((ready.envelope.state.officialReactionHistory || []).filter(row => row.definitionId === definitionId).length, id === 'use' ? 1 : 0);
        const after = await fire(branch, credentials), event = attackEvent(after.envelope.state);
        assert.equal(event.stages.damage.damagePerDie, id === 'use' ? 3 : 2);
        assert.equal(branch.runtime.rangedDeclaration.pending(after.envelope.state), null);
        if (id === 'use') {
          assert.equal(event.concentratedFire.maximumCasualties, 1); assert(event.casualtyModelIds.length <= 1);
          if (branch.runtime.cardRefresh.pending(after.envelope.state)) {
            await invoke(branch, credentials, 'refresh', row => row.actionType === 'resolve_ranged_card_refresh',
              () => ({ cardInstanceId: cardOf(after.envelope.state).cardInstanceId }));
            assert.equal(cardOf((await checkpoint(branch)).envelope.state).readiness, 'ready');
          }
        } else assert.equal(event.concentratedFire, undefined);
        const current = await checkpoint(branch);
        assert.equal((current.envelope.state.officialReactionHistory || []).filter(row => row.definitionId === definitionId).length, id === 'use' ? 1 : 0);
        const value = { id, revision: current.stateRevision, event, reactionHistory: current.envelope.state.officialReactionHistory || [],
          cardResources: current.envelope.state.cardResources, efficiencyDecision: current.envelope.state.officialRangedCardRefreshHistory || [], modelCalls: 0 };
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
    const current = [];
    for (const id of cases) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        current.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
      } finally { branch.close(); }
    }
    let legacy = await cached('legacy-cold-recovery.json');
    if (legacy) assert.equal((await read(output + 'legacy-verification/boundary.json')).status, 'passed');
    else {
      legacy = [];
      legacy.push(await legacyProof(product, 'nova-refresh', 'build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/use/', 'wave3-nova-refresh-use'));
      for (const id of ['shaped', 'smart', 'pass']) legacy.push(await legacyProof(product, 'tank-' + id,
        'build/ticket-28-wave2-capabilities-20261113-v1/tank-declaration-reactions/' + id + '/', 'wave2-tank-declaration-' + id, true));
    }
    const ref = await save('cold-recovery.json', { current, legacy }); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'nova-head-shot', status: gate.status, failures: gate.failures.length }));
}
