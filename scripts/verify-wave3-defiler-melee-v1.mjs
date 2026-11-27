import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { openProduct as openVilelingProduct } from './verify-wave3-vileling-foundation-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, completeWave3MeleePoolsV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/defiler-melee/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const impactId = 'unit:defiler/devastating-charge-assault-phase@1';
const clawsId = 'unit:defiler/claws-combat-phase@1';
const ids = ['charge', 'combat'];
const roomId = id => 'wave3-defiler-melee-' + id;
const releaseId = id => roomId(id) + '-source-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, definitionIds: [], includeMelee: true });
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
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return { context: await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' }),
      close: () => product.close() };
  } catch (error) { product.close(); throw error; }
}
async function sceneFor(context) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const unit = (id, key) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
    meleeModifierDefinitionIds: [impactId], meleeWeaponDefinitionIds: [clawsId],
    includeImpactAllocation: true,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: ['tactical_cards:accelerating_creep'],
        units: [unit('defiler', 'defiler')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [unit('target', 'goliath')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'defiler'), 12, 26); arrange(piece(state, 'target'), 22, 26);
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    declaredPhaseAndPositions: true, partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.115.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = JSON.parse(JSON.stringify(createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene })));
    const prior = await cached(id + '/authority.json');
    if (prior) assert.deepEqual(prior, authority); else await save(id + '/authority.json', authority);
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
    return { id, context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const name = branch.id + '/checkpoint-r' + current.stateRevision + '.json', prior = await cached(name);
  if (prior) assert.deepEqual(prior.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters) {
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const result = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[current.envelope.state.activeSideKey], operationKey: key, select, parameters });
  await checkpoint(branch); return result;
}
async function replay(branch, { sourcePrefix = prefix, originalId = branch.id, fillMissing = false } = {}) {
  const actualRoomId = sourcePrefix === prefix ? roomId(branch.id) : 'wave3-vileling-foundation-' + originalId;
  await branch.native.restoreDependencies(actualRoomId, branch.authority);
  const before = await branch.native.store.loadRoom(actualRoomId), bundle = await branch.native.store.loadReplayBundle(actualRoomId);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= receipts.length; revision++) {
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    const ref = sourcePrefix + originalId + '/checkpoint-r' + revision + '.json';
    let saved;
    try { saved = await read(ref); }
    catch (error) { if (error.code !== 'ENOENT' || !fillMissing) throw error; }
    if (saved) assert.deepEqual(result.envelope, saved.envelope);
    else await save(originalId + '/checkpoint-r' + revision + '.json', { envelope: result.envelope });
  }
  assert.deepEqual(await branch.native.store.loadRoom(actualRoomId), before);
  return { id: originalId, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Defiler-Charge-Claws-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async ({ context }) => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state), actor = piece(scene.state, 'defiler');
      const definitions = runtime.catalogue.definitions.filter(row => [impactId, clawsId].includes(row.definitionId));
      assert.equal(definitions.length, 2); assert(definitions.every(row => row.execution.status === 'executable_exact'));
      assert.equal(actor.currentModels, 1); assert.equal(actor.currentSupply, 1);
      assert.equal(context.dataset.recordsByKey['army_units:defiler'].payload.small.cost, 130);
      assert.equal(actor.models[0].baseWidthInches, 3.15);
      const impact = runtime.query(scene.state, { queryKind: 'melee_modifiers', pieceId: 'defiler' }).result.devastatingCharge;
      assert.equal(impact.impactDicePerEligibleModel, 4); assert.equal(impact.hitThreshold, 4);
      const invalid = structuredClone(scene.state); delete invalid.officialImpactAllocationPolicy;
      assert.throws(() => runtimeFor(context, invalid), /DEFILER_IMPACT_ALLOCATION_POLICY_REQUIRED/);
      assert(!actor.equipment.some(row => row.equipmentName === 'Cancerous Bite'));
      await registerScene(context, 'charge', scene);
      const ref = await save('compile.json', { definitions, impact, actorModels: 1, actorSupply: 1,
        unpurchasedBiteAbsent: true, missingImpactPolicyRejected: true, newSemanticAtoms: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'charge/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const branch = await product.branch('charge');
      try {
        const credentials = await branch.native.create(roomId('charge'), branch.authority); await checkpoint(branch);
        const state = branch.authority.state, actor = piece(state, 'defiler'), target = piece(state, 'target');
        const parameters = { leadingModelId: actor.models[0].id, targets: [{ unitId: 'target', modelId: target.models[0].id }] };
        const query = branch.runtime.query(state, { queryKind: 'melee_action_preview', actionType: 'charge', pieceId: 'defiler', parameters });
        const declared = await invoke(branch, credentials, 'declare-charge', row => row.actionType === 'charge' && row.pieceId === 'defiler', () => parameters);
        assert.deepEqual(declared.preview.core.action, query.result.action);
        let rolled = await cached('charge/rolled.json');
        if (!rolled) { rolled = { envelope: (await checkpoint(branch)).envelope }; await save('charge/rolled.json', rolled); }
        const pending = rolled.envelope.state.pendingAction;
        assert.equal(pending.chargeRolls.length, 1);
        assert.equal(pending.maxDistanceMilliInches, (7 + pending.chargeRoll) * 1000);
        const contactX = Math.round(target.models[0].xInches * 1000)
          - Math.round(target.models[0].baseWidthInches * 500) - Math.round(actor.models[0].baseWidthInches * 500);
        await invoke(branch, credentials, 'resolve-charge', row => row.actionType === 'resolve_charge',
          () => ({ outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 26000,
            elevation: 'ground', supportTerrainIds: [] }], placements: [] }));
        let ready = await cached('charge/impact-ready.json');
        if (!ready) { ready = { envelope: (await checkpoint(branch)).envelope }; await save('charge/impact-ready.json', ready); }
        assert.equal(ready.envelope.state.pendingAction.sourceDefinitionId, impactId);
        assert.equal(ready.envelope.state.pendingAction.baseHitThreshold, 4);
        const domain = branch.runtime.enumerate(ready.envelope.state).parameterDomains.find(row => row.actionType === 'resolve_impact');
        assert(domain);
        const allocations = { allocations: domain.sourceDomain.parameterSchema.eligibleModels.map(model => ({
          modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice })) };
        assert.equal(allocations.allocations.reduce((sum, row) => sum + row.dice, 0), 4);
        await invoke(branch, credentials, 'impact', row => row.domainId === domain.domainId, () => allocations);
        await completeWave3MeleePoolsV1({ directory: path.join(directory, 'charge'), native: branch.native, runtime: branch.runtime,
          roomId: roomId('charge'), credentials, operationPrefix: 'impact-pool', selectPoolParameters: poolParameters });
        const current = await checkpoint(branch), event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'impact_damage');
        assert(event); assert.equal(event.stages.hitRolls.length, 4); assert.equal(event.stages.hitThreshold, 4);
        assert.equal(piece(current.envelope.state, 'defiler').currentSupply, 1);
        const ref = await save('consume.json', { chargeRolls: pending.chargeRolls, nativeImpactEvent: event, queryEqualsNative: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'charge/checkpoint-r' + current.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const charge = await product.branch('charge');
      try {
        const credentials = await charge.native.create(roomId('charge'), charge.authority);
        await invoke(charge, credentials, 'finish-charge', row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', () => ({}));
        const after = await checkpoint(charge); assert.equal(after.envelope.state.activeSideKey, 'player2');
        if (!await cached('combat/authority.json')) {
          const state = structuredClone(after.envelope.state);
          Object.assign(state, { phase: 'combat', activeSideKey: 'player1' });
          state.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' };
          for (const unit of state.pieces) unit.activatedPhases.combat = false;
          state.players.player1.passedPhases.combat = false; delete state.selectedRosterActivationWindow;
          await registerScene(charge.context, 'combat', { state: refreshOfficialReleaseRosterDerivedStateV2({ context: charge.context, state }),
            scenario: { actualChargeAndImpactPositionsPreserved: true, declaredCombatPhase: true,
              sourceCheckpointRef: prefix + 'charge/checkpoint-r' + after.stateRevision + '.json', fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
      } finally { charge.close(); }
      const branch = await product.branch('combat');
      try {
        const credentials = await branch.native.create(roomId('combat'), branch.authority); await checkpoint(branch);
        const domain = branch.runtime.enumerate(branch.authority.state).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'defiler');
        assert(domain); assert.equal(domain.sourceDomain.constraints.declineCloseRanksAttackDice, 4);
        const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice: 4 }], surgeTargetUnitId: null, criticalTargetUnitId: null };
        const query = branch.runtime.query(branch.authority.state, { queryKind: 'melee_action_preview', actionType: 'fight', pieceId: 'defiler', parameters });
        const applied = await invoke(branch, credentials, 'claws', row => row.domainId === domain.domainId, () => parameters);
        assert.deepEqual(applied.preview.core.action, query.result.action);
        await completeWave3MeleePoolsV1({ directory: path.join(directory, 'combat'), native: branch.native, runtime: branch.runtime,
          roomId: roomId('combat'), credentials, operationPrefix: 'claws-pool', selectPoolParameters: poolParameters });
        await invoke(branch, credentials, 'finish-combat', row => row.actionType === 'finish_activation' && row.pieceId === 'defiler', () => ({}));
        const current = await checkpoint(branch), event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
        assert(event); assert.equal(event.weaponName, 'Claws'); assert.equal(event.stages.hitRolls.length, 4);
        assert.equal(event.stages.hitThreshold, 3); assert.equal(event.stages.damagePerDie, 1);
        const ref = await save('successor.json', { nativeClawsEvent: event, originalActivationFinished: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'combat/checkpoint-r' + current.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ids) { const branch = await product.branch(id); try { current.push(await replay(branch, { fillMissing: true })); } finally { branch.close(); } }
      const old = await openVilelingProduct(), legacy = [];
      try {
        const sourcePrefix = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
        for (const id of ['base', 'combat']) {
          const filename = path.join(root, sourcePrefix, id, 'room.sqlite');
          const beforeHash = createHash('sha256').update(await fs.readFile(filename)).digest('hex');
          const branch = await old.branch(id);
          try { legacy.push(await replay(branch, { sourcePrefix, originalId: id })); } finally { branch.close(); }
          assert.equal(createHash('sha256').update(await fs.readFile(filename)).digest('hex'), beforeHash);
        }
      } finally { old.close(); }
      const ref = await save('cold-recovery.json', { current, legacy, originalArtifactsUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
