import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { projectOfficialDarkSwarmReactionFactsV1 } from '../packages/product-composition/official-dark-swarm-reaction-facts-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-phase-scope/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const impactId = 'unit:defiler/devastating-charge-assault-phase@1';
const clawsId = 'unit:defiler/claws-combat-phase@1';
const darkId = 'unit:defiler/dark-swarm-assault-phase@1';
const repairRef = process.argv.find(x => x.startsWith('--repair-ref='))?.slice(13);
const ids = ['source', 'charge', 'combat'];
const roomId = id => 'wave3-dark-swarm-phase-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [], includeRanged: true, includeMelee: true, includeTargetReactions: true,
  includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n'); return prefix + name;
}
async function cached(name) {
  try { return await read(prefix + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function registry() {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sceneFor(context) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const unit = id => ({ unitInstanceId: id, recordKey: 'army_units:defiler', compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true, includeImpactAllocation: true,
    meleeModifierDefinitionIds: [impactId], meleeWeaponDefinitionIds: [clawsId], reactionDefinitionIds: [darkId],
    includeGestateDarkSwarm: true, includeDarkSwarmLifecycle: true, includeBattlefieldDisplacement: true,
    includeConsumePayment: true, canonicalResourceTypes: true,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'], units: [unit('attacker')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defender'), unit('caster')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' } } };
  arrange(piece(state, 'caster'), 12, 26); arrange(piece(state, 'defender'), 17, 26); arrange(piece(state, 'attacker'), 24, 26);
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { declaredPositionsAndMovementStart: true, partialLegalRosters: true,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state); assert.equal(runtime.descriptor.runtimeVersion, '3.119.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry(), m = context.manifest;
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const bound = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const authority = await read(prefix + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, authority, context, runtime, native, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json', old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[current.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind }); await checkpoint(branch); return result;
}
function assertNoDarkReaction(state) {
  assert.equal(state.pendingOfficialReactionWindow, undefined);
  assert.equal(state.pendingOfficialAttackTargetReaction, undefined);
  assert.equal((state.officialReactionHistory || []).filter(row => row.definitionId === darkId).length, 0);
  assert.equal((state.officialConsumePaymentHistory || []).length, 0);
}
async function completePools(branch, credentials, key) {
  for (let i = 0; i < 24; i++) {
    const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
    assertNoDarkReaction(state);
    if (!branch.runtime.meleeChoices.hasPending(state) && !state.pendingAction) return current;
    const menu = branch.runtime.enumerate(state), domain = menu.parameterDomains[0];
    const operation = key + '-r' + current.stateRevision;
    if (!domain) {
      assert.equal(menu.candidates.length, 1); await invoke(branch, credentials, operation, () => true, undefined, 'finite');
    } else {
      const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
      const field = schema.required[0], spec = schema[field] || schema.properties?.[field];
      const parameters = field === 'casualtySelectionHash' ? { [field]: spec.enum[0] }
        : field === 'casualtyModelIds' ? { [field]: spec.items.enum.slice(0, spec.minItems) }
          : poolParameters(domain, state);
      await invoke(branch, credentials, operation, row => row.domainId === domain.domainId, () => parameters);
    }
  }
  assert.fail('bounded existing melee pool flow did not settle');
}
async function replay(native, id, base) {
  const current = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(base + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), current);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Dark-Swarm-Phase-Scope-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      const source = context.dataset.recordsByKey['army_units:defiler'];
      assert.equal(source.payload.upgrades.find(row => row.name === 'Dark Swarm').phase, 'Assault Phase');
      assert.equal(scene.state.officialReactionFamilySourceBundle.routes.find(row => row.definitionId === darkId).phase, 'assault');
      assert.equal(scene.state.officialConsumePaymentPolicy.version, '1.3.0');
      assert.equal(scene.state.officialConsumePaymentPolicy.combatLifecycleCoexistence, true);
      const faq = await read('build/ticket-28-wave3-faq-delta-20261112-v1/current-index.json');
      const impact = faq.entries.find(row => row.entryId === 'faq-v1.3:73');
      assert(impact.answer.includes('does not target an Enemy Unit'));
      await registerScene(context, 'source', scene);
      const ref = await save('compile.json', { runtime: runtime.descriptor, sourceFeature: source.payload.upgrades.find(row => row.name === 'Dark Swarm'),
        impactFaq: impact, noMeleePhaseOverrideAdded: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'source/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch('source');
      try {
        const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
        await invoke(branch, credentials, 'place', row => row.actionType === 'set_dark_swarm' && row.pieceId === 'caster',
          () => ({ coordinate: { xMilliInches: 14000, yMilliInches: 28600 } }));
        await invoke(branch, credentials, 'finish-place', row => row.actionType === 'finish_activation' && row.pieceId === 'caster', () => ({}));
        const current = await checkpoint(branch), state = current.envelope.state;
        assert(projectOfficialDarkSwarmReactionFactsV1(state, piece(state, 'caster'), piece(state, 'defender')).length);
        if (!await cached('charge/authority.json')) {
          const next = structuredClone(state); Object.assign(next, { phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1' });
          next.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' };
          await registerScene(branch.context, 'charge', { state: next, scenario: { actualTokenPlacementRetained: true,
            derivedFrom: prefix + 'source/checkpoint-r' + current.stateRevision + '.json', declaredAssaultPhase: true,
            fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
        const ref = await save('consume.json', { actualTokenPlaced: true, sharedFriendlyTokenRangeValid: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'source/checkpoint-r' + current.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const charge = await product.branch('charge');
      try {
        const credentials = await charge.native.create(charge.roomId, charge.authority); await checkpoint(charge);
        const state = charge.authority.state, actor = piece(state, 'attacker'), target = piece(state, 'defender');
        const parameters = { leadingModelId: actor.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }] };
        const query = charge.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'charge', pieceId: actor.id, parameters });
        const declared = await invoke(charge, credentials, 'declare', row => row.actionType === 'charge' && row.pieceId === actor.id, () => parameters);
        assert.deepEqual(declared.preview.core.action, query.result.action);
        const contact = Math.round((target.models[0].xInches + target.models[0].baseWidthInches / 2 + actor.models[0].baseWidthInches / 2) * 1000);
        await invoke(charge, credentials, 'resolve', row => row.actionType === 'resolve_charge',
          () => ({ outcome: 'success', path: [{ xMilliInches: contact, yMilliInches: 26000, elevation: 'ground', supportTerrainIds: [] }], placements: [] }));
        const ready = await checkpoint(charge); assertNoDarkReaction(ready.envelope.state);
        const domain = charge.runtime.enumerate(ready.envelope.state).parameterDomains.find(row => row.actionType === 'resolve_impact');
        assert(domain);
        await invoke(charge, credentials, 'impact', row => row.domainId === domain.domainId,
          () => ({ allocations: domain.sourceDomain.parameterSchema.eligibleModels.map(row => ({ modelId: row.modelId, targetUnitId: target.id, dice: row.impactDice })) }));
        await completePools(charge, credentials, 'impact-pool');
        await invoke(charge, credentials, 'finish-charge', row => row.actionType === 'finish_activation' && row.pieceId === actor.id, () => ({}));
        const current = await checkpoint(charge), after = current.envelope.state;
        assertNoDarkReaction(after); assert.equal(piece(after, 'defender').isDestroyed, false);
        assert.deepEqual(after.cardResources, state.cardResources);
        const event = after.log.flatMap(row => row.events || []).find(row => row.type === 'impact_damage');
        assert(event); assert.equal(event.stages.hitRolls.length, 4);
        if (!await cached('combat/authority.json')) {
          const next = structuredClone(after); Object.assign(next, { phase: 'combat', activeSideKey: 'player1' });
          next.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' };
          next.pieces.forEach(row => { row.activatedPhases.combat = false; });
          next.players.player1.passedPhases.combat = false; delete next.selectedRosterActivationWindow;
          await registerScene(charge.context, 'combat', { state: refreshOfficialReleaseRosterDerivedStateV2({ context: charge.context, state: next }),
            scenario: { actualChargeAndImpactPositionsRetained: true, sourceCheckpointRef: prefix + 'charge/checkpoint-r' + current.stateRevision + '.json',
              declaredCombatPhase: true, fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
        await save('charge-result.json', { impactEvent: event, noAttackTargetReactionOpened: true, cardsUnchanged: true, modelCalls: 0 });
      } finally { charge.close(); }
      const branch = await product.branch('combat');
      try {
        const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
        const state = branch.authority.state;
        assert(projectOfficialDarkSwarmReactionFactsV1(state, piece(state, 'caster'), piece(state, 'defender')).length);
        const quote = branch.runtime.query(state, { queryKind: 'consume_payment_options', sourcePieceId: 'caster', abilityDefinitionId: darkId });
        assert(quote.cardOnlyPayments.length); assert.equal(quote.abilityTimingValidated, false);
        const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'defender', dice: 4 }], surgeTargetUnitId: null, criticalTargetUnitId: null };
        const query = branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'attacker', parameters });
        const applied = await invoke(branch, credentials, 'fight', row => row.actionType === 'fight' && row.pieceId === 'attacker', () => parameters);
        assert.deepEqual(applied.preview.core.action, query.result.action);
        assert.notEqual(applied.preview.core.action.sourceAction?.actionType, 'declare_melee_attack_before_target_reaction');
        await completePools(branch, credentials, 'fight-pool');
        await invoke(branch, credentials, 'finish-fight', row => row.actionType === 'finish_activation' && row.pieceId === 'attacker', () => ({}));
        const after = await checkpoint(branch); assertNoDarkReaction(after.envelope.state);
        assert.deepEqual(after.envelope.state.cardResources, state.cardResources);
        const event = after.envelope.state.log.slice(state.log.length).flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
        assert(event); assert.equal(event.stages.hitRolls.length, 4); assert.equal(event.weaponName, 'Claws');
        const ref = await save('successor.json', { nativeCombatEvent: event, reactionTimingNotInferredFromPaymentQuote: true,
          geometryAndResourcesValidButWrongPhase: true, noDarkReactionOrPayment: true, noSelectedActivationWindow: !after.envelope.state.selectedRosterActivationWindow,
          modelCalls: 0 }); return { evidenceRef: ref, checkpointRef: prefix + 'combat/checkpoint-r' + after.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ids) {
        const old = await cached('cold-' + id + '.json'); if (old) { current.push(old); continue; }
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const value = { id, ...await replay(branch.native, branch.roomId, prefix + id + '/checkpoint-r') };
          await save('cold-' + id + '.json', value); current.push(value);
        } finally { branch.close(); }
      }
      const legacy = [];
      for (const [label, prior, oldId, definitions, flags] of [
        ['numeric', 'build/ticket-28-zerg-wave3-20261118-v1/consume-payment/multi/', 'wave3-consume-payment-multi',
          ['unit:vileling__zergling_/squadron-any-phase@1'], { includeRanged: true, includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true }],
        ['melee', 'build/ticket-28-zerg-wave3-20261118-v1/defiler-melee/combat/', 'wave3-defiler-melee-combat', [], { includeMelee: true }],
      ]) {
        const old = await cached('cold-legacy-' + label + '.json'); if (old) { legacy.push(old); continue; }
        const authority = await read(prior + 'authority.json');
        product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
        const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: definitions, ...flags });
        assert.deepEqual(runtime.descriptor, await read(prior + 'runtime.json'));
        let sourcePath = path.join(root, prior, 'room.sqlite'), bytes;
        try { bytes = await fs.readFile(sourcePath); }
        catch (error) { if (error.code !== 'ENOENT') throw error; sourcePath += '.gz'; bytes = gunzipSync(await fs.readFile(sourcePath)); }
        const sourceHash = hash(await fs.readFile(sourcePath)), filename = 'legacy-' + label + '.sqlite';
        try { await fs.access(path.join(directory, filename)); }
        catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx' }); }
        const native = openWave3EngineeringRoomV1({ directory, filename, rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          await native.restoreDependencies(oldId, authority);
          const value = { label, ...await replay(native, oldId, prior + 'checkpoint-r') };
          assert.equal(hash(await fs.readFile(sourcePath)), sourceHash);
          await save('cold-legacy-' + label + '.json', value); legacy.push(value);
        } finally { native.close(); }
      }
      const ref = await save('cold-recovery.json', { current, legacy, originalArtifactsUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
