import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../packages/rule-atoms/official-unit-restrictions-v1.mjs';
import { projectOfficialContextualSupplyValueV1 } from '../packages/rule-atoms/official-contextual-supply-projection-v1.mjs';
import { projectOfficialDeploymentSupplyV1 } from '../packages/rule-atoms/official-deployment-supply-projection-v1.mjs';
import { createOfficialReserveReturnDataBundleV3 } from '../packages/source-data/official-reserve-lifecycle-data-bundle-v1.mjs';
import { resolveOfficialReturnToReservesV1 } from '../packages/rule-atoms/official-reserve-lifecycle-rules-kernel-v1.mjs';
import { createOfficialHiddenBurrowedDataBundleV1 } from '../packages/source-data/official-hidden-burrowed-data-bundle-v1.mjs';
import { resolveOfficialBurrowedHiddenLifecycleV1 } from '../packages/rule-atoms/official-hidden-burrowed-rules-kernel-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/biological-structure/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const biologicalId = 'unit:bile_launcher/biological-structure-any-phase@1';
const tunnelId = 'card:defiler_mound/tunnel-network-any@1';
const lieId = 'card:hatchery/lie-in-wait-any@1';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const impactId = 'unit:nova_assault_mode/devastating-charge-assault-phase@1';
const specs = ['burrow', 'return', 'impact'];
const roomId = id => 'wave3-biological-structure-' + id;
const releaseId = id => roomId(id) + '-v1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const hasStatus = (piece, name) => piece.statuses.some(status =>
  String(typeof status === 'string' ? status : status.statusName || status.name).toLowerCase() === name);
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
async function sourceProduct() {
  const product = registry();
  try {
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds, includeMelee: true });
}
function candidate(sideKey, factionRecordKey, cards, units) {
  return { sideKey, scaleId: 'Standard', mineralBudget: 2000, factionRecordKey, tacticalCardRecordKeys: cards,
    units: units.map(([unitInstanceId, recordKey]) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] })) };
}
async function sceneFor(context, id) {
  const base = (await read('build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/base/authority.json')).state;
  const legacy = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const impact = id === 'impact';
  const zerg = candidate(impact ? 'player2' : 'player1', 'tactical_cards:zagara_s_swarm',
    impact ? ['tactical_cards:accelerating_creep']
      : ['tactical_cards:hatchery', 'tactical_cards:defiler_mound', 'tactical_cards:accelerating_creep'],
    [['bile', 'army_units:bile_launcher'], ...(!impact ? [['vileling', 'army_units:vileling__zergling_']] : [])]);
  const terran = candidate(impact ? 'player1' : 'player2', impact ? 'tactical_cards:nova_covert_ops' : 'tactical_cards:terran_armed_forces',
    impact ? [] : ['tactical_cards:armory'], [[impact ? 'nova' : 'target', impact ? 'army_units:nova_assault_mode' : 'army_units:goliath']]);
  const setup = createOfficialReleaseRosterStateV2({ context, canonicalResourceTypes: true,
    legacyDisclosurePolicy: legacy.officialRosterDisclosureDataBundle,
    candidatesBySide: impact ? { player1: terran, player2: zerg } : { player1: zerg, player2: terran },
    characteristicDefinitionIds: impact ? [biologicalId] : [biologicalId, lieId, squadronId],
    includeMelee: true, includeCharacteristicConsumers: true,
    ...(impact ? { meleeModifierDefinitionIds: [impactId], includeImpactAllocation: true }
      : { unitLifecycleDefinitionIds: [tunnelId] }),
  });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const phase = impact ? 'assault' : 'movement';
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    round: 1, phase, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  if (impact) {
    arrange(pieceOf(state, 'nova'), 10, 10);
    const nova = pieceOf(state, 'nova').models[0], bile = pieceOf(state, 'bile').models[0];
    arrange(pieceOf(state, 'bile'), 10 + (nova.baseWidthInches + bile.baseWidthInches) / 2 + 1.1, 10);
  } else {
    arrange(pieceOf(state, 'bile'), 10, 10); arrange(pieceOf(state, 'target'), 44, 26);
    const actor = pieceOf(state, 'vileling'), source = pieceOf(base, 'vileling');
    Object.assign(actor, { isOnField: true, isInReserves: false, deploymentStatus: 'hypothetical_snapshot' });
    actor.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: source.models[index].xInches + 18, yInches: source.models[index].yInches }));
  }
  const ranges = Object.fromEntries(state.officialActionRouteCatalogue.units.filter(unit => unit.movementProfile)
    .map(unit => [unit.pieceId, Math.round(unit.movementProfile.horizontalCoherencyInches * 1000)]));
  const coherency = declareCoherency(state, { coherencyRangesByPieceId: ranges });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { id, declaredPhaseAndPositions: true, partialLegalRosters: true,
    fullRound: false, fullMatch: false, coherency, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.101.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor), product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
      snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
      sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: runtimeRef,
        version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(authority, old); else await save(id + '/authority.json', authority);
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
  const current = await branch.native.store.loadRoom(roomId(branch.id)), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters) {
  const before = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[before.envelope.state.activeSideKey],
    operationKey, select, parameters });
  await checkpoint(branch); return result;
}
async function replay(native, id, prefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(prefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
    sourceRef, contractVersion: 'T28-W3-09-Biological-Structure-Tunnel-Network-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      for (const id of specs) await registerScene(context, id, await sceneFor(context, id));
      const state = (await read(prefix + 'burrow/authority.json')).state, runtime = runtimeFor(context, state);
      const restrictions = runtime.query(state, { queryKind: 'unit_restrictions', pieceId: 'bile' }).result;
      assert.equal(restrictions.cannotGainBurrowed, true); assert.equal(restrictions.cannotReturnToReserves, true);
      assert.equal(restrictions.impactImmune, true); assert.equal(pieceOf(state, 'bile').isStructure, false);
      assert.equal(pieceOf(state, 'bile').currentSupply, 1);
      const menu = runtime.enumerate(state);
      for (const definitionId of [lieId, tunnelId]) {
        assert(!menu.parameterDomains.some(row => row.definitionId === definitionId && row.pieceId === 'bile'));
        assert(menu.parameterDomains.some(row => row.definitionId === definitionId && row.pieceId === 'vileling'));
      }
      for (const definitionId of [biologicalId, tunnelId]) assert.equal(
        runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
      const tampered = structuredClone(state);
      tampered.officialCharacteristicStatusFamilySourceBundle.routes.find(row => row.definitionId === biologicalId).impactImmune = false;
      assert.throws(() => runtimeFor(context, tampered));
      const before = hash(state);
      assert.throws(() => resolveOfficialReturnToReservesV1({ state, pieceId: 'bile',
        reserveLifecycleDataBundle: createOfficialReserveReturnDataBundleV3({ context }),
        unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle, rulesOwnedStateRequested: true,
        triggerAuthority: 'rule_effect_resolution', triggerReceiptHash: hash({ fixture: 'declared-return-attempt' }) }),
      /UNIT_RESTRICTION_RESERVE_RETURN_PROHIBITED/);
      const low = structuredClone(state), event = { type: 'burrowed_gained', pieceId: 'bile' };
      low.log.push({ events: [event] });
      const oldDataset = await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json');
      assert.throws(() => resolveOfficialBurrowedHiddenLifecycleV1({ state: low, pieceId: 'bile',
        hiddenBurrowedDataBundle: createOfficialHiddenBurrowedDataBundleV1({ dataset: oldDataset }),
        rulesOwnedStateRequested: true, procedureKind: 'reconcile_burrowed_hidden_lifecycle',
        triggerKind: 'gain_burrowed', triggerEventHash: hash(event) }), /UNIT_RESTRICTION_BURROWED_PROHIBITED/);
      assert.equal(hash(state), before);
      const ref = await save('compile.json', { restrictions, definitions: runtime.catalogue.definitions.filter(row =>
        [biologicalId, tunnelId].includes(row.definitionId)), negativeMenusAndLowConsumersVerified: true,
        injectedLowLevelTriggersAreNotNativeReceipts: true, queryNoMutation: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of specs) {
        const old = await cached(id + '/consumed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          const initial = (await checkpoint(branch)).envelope.state;
          if (id === 'impact') {
            const nova = pieceOf(initial, 'nova').models[0], target = pieceOf(initial, 'bile').models[0];
            await invoke(branch, credentials, 'charge', row => row.actionType === 'charge' && row.pieceId === 'nova',
              () => ({ leadingModelId: nova.id, targets: [{ unitId: 'bile', modelId: target.id }] }));
            const contactX = Math.round(target.xInches * 1000) - Math.round(target.baseWidthInches * 500)
              - Math.round(nova.baseWidthInches * 500);
            await invoke(branch, credentials, 'resolve-charge', row => row.actionType === 'resolve_charge', () => ({ outcome: 'success',
              path: [{ xMilliInches: contactX, yMilliInches: 10000, elevation: 'ground', supportTerrainIds: [] }], placements: [] }));
            const after = await checkpoint(branch), state = after.envelope.state;
            assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.actionType === 'resolve_impact'));
            assert(!state.pendingAction || state.pendingAction.type !== 'resolve_mandatory_impact');
            assert.equal(pieceOf(state, 'bile').damageMarker, 0);
            const value = { id, revision: after.stateRevision, actualSuccessfulCharge: true,
              impactSuppressed: true, targetDamage: 0, restrictions: projectOfficialUnitRestrictionsV1(state, 'bile'), modelCalls: 0 };
            await save(id + '/consumed.json', value); results.push(value);
          } else {
            const definitionId = id === 'burrow' ? lieId : tunnelId;
            const result = await invoke(branch, credentials, id, row => row.definitionId === definitionId && row.pieceId === 'vileling',
              domain => ({ activeUnitId: 'vileling', ...((domain.sourceDomain.parameterSchema.required || []).includes('paymentCardInstanceIds')
                ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] } : {}) }));
            const after = await checkpoint(branch), state = after.envelope.state, actor = pieceOf(state, 'vileling');
            if (id === 'burrow') assert.equal(hasStatus(actor, 'burrowed'), true);
            else {
              assert.equal(actor.isInReserves, true); assert.equal(actor.isOnField, false);
              assert.equal(state.activeSideKey, 'player2'); assert.equal(state.selectedRosterActivationWindow, undefined);
              assert.equal(actor.activatedPhases.movement, true);
            }
            assert.equal(hasStatus(pieceOf(state, 'bile'), 'burrowed'), false);
            assert.equal(pieceOf(state, 'bile').isOnField, true);
            const value = { id, revision: after.stateRevision, ordinaryUnitSucceeded: true,
              bileStayedOnFieldWithoutBurrowed: true, duplicateIdempotence: result.idempotentReplayVerified, modelCalls: 0 };
            await save(id + '/consumed.json', value); results.push(value);
          }
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of specs) {
        const old = await cached(id + '/completed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          if (id !== 'return') {
            await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation'
              && row.pieceId === (id === 'burrow' ? 'vileling' : 'nova'), () => ({}));
          } else {
            const model = pieceOf(branch.authority.state, 'target').models[0];
            await invoke(branch, credentials, 'enemy-move', row => row.actionType === 'move' && row.pieceId === 'target',
              () => ({ leadingModelId: model.id, path: [{ xMilliInches: 44200, yMilliInches: 26000 }], placements: [] }));
            await invoke(branch, credentials, 'enemy-finish', row => row.actionType === 'finish_activation' && row.pieceId === 'target', () => ({}));
          }
          const after = await checkpoint(branch);
          const value = { id, revision: after.stateRevision, successorAvailable: true, modelCalls: 0 };
          await save(id + '/completed.json', value); results.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of specs) {
        const branch = await product.branch(id);
        try { await branch.native.restoreDependencies(roomId(id), branch.authority);
          current.push({ id, ...await replay(branch.native, roomId(id), prefix + id + '/checkpoint-r') }); }
        finally { branch.close(); }
      }
      const oldPrefix = 'build/ticket-28-terran-wave3-20261117-v1/nova-devastating-charge/base/';
      const authority = await read(oldPrefix + 'authority.json');
      product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state,
        definitionIds: authority.state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
        weaponDefinitionIds: ['unit:nova_assault_mode/hellfire-shotgun-assault-phase@1'],
        includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
      assert.deepEqual(runtime.descriptor, await read(oldPrefix + 'runtime.json'));
      const originalFile = path.join(root, oldPrefix, 'room.sqlite'), bytes = await fs.readFile(originalFile);
      const copy = path.join(directory, 'legacy-room.sqlite');
      try { await fs.access(copy); } catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, bytes, { flag: 'wx' }); }
      const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let legacy;
      try { await native.restoreDependencies('wave3-nova-charge-base', authority);
        legacy = await replay(native, 'wave3-nova-charge-base', oldPrefix + 'checkpoint-r'); }
      finally { native.close(); }
      assert.equal(createHash('sha256').update(await fs.readFile(originalFile)).digest('hex'), createHash('sha256').update(bytes).digest('hex'));
      const ref = await save('cold-recovery.json', { current, legacy: { ...legacy,
        runtimeVersion: runtime.descriptor.runtimeVersion, originalDatabaseUnchanged: true }, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'biological-structure', status: gate.status, failures: gate.failures.length }));
}
async function negativePreviewAndSupply() {
  const old = await cached('negative-preview-and-supply.json');
  if (old) { console.log(JSON.stringify({ gate: 'biological-negative-preview', savedResultReused: true })); return; }
  const product = openProduct(), branch = await product.branch('burrow');
  const folder = path.join(directory, 'negative-preview');
  await fs.mkdir(folder, { recursive: true });
  const native = openWave3EngineeringRoomV1({ directory: folder, filename: ':memory:',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: branch.context, runtime: branch.runtime }) });
  try {
    const id = 'wave3-biological-structure-negative';
    const credentials = await native.create(id, branch.authority), input = { roomId: id, seatToken: credentials.player1.seatToken };
    const legal = await native.room.legalSpace(input); assert.equal(legal.ok, true);
    const before = await native.store.loadRoom(id), rejects = [];
    for (const definitionId of [lieId, tunnelId]) {
      const domain = legal.legalSpace.parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'vileling');
      assert(domain);
      const parameters = { activeUnitId: 'bile' };
      if ((domain.sourceDomain.parameterSchema.required || []).includes('paymentCardInstanceIds')) {
        parameters.paymentCardInstanceIds = domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0];
      }
      const rejected = await native.room.previewAction({ ...input, proposal: { kind: 'parameterized', domainId: domain.domainId, parameters },
        expectedStateRevision: before.stateRevision, expectedStateHash: before.envelope.stateHash,
        expectedMatchBindingHash: before.envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash });
      assert.equal(rejected.ok, false);
      const after = await native.store.loadRoom(id);
      assert.equal(hash(after.envelope), hash(before.envelope));
      assert.equal(after.stateRevision, before.stateRevision);
      assert.equal(after.acceptedReceiptCount, before.acceptedReceiptCount);
      rejects.push({ definitionId, rejected, authoritativeStateUnchanged: true,
        privateAuditSequence: after.privateJournalSequence });
    }
    const supply = projectOfficialContextualSupplyValueV1({ state: branch.authority.state, pieceId: 'bile', context: 'mission_marker_control' });
    assert.equal(supply.effectiveSupply, 1);
    const beforeReturn = (await read(prefix + 'return/checkpoint-r0.json')).envelope.state;
    const afterReturn = (await read(prefix + 'return/checkpoint-r1.json')).envelope.state;
    const beforePool = projectOfficialDeploymentSupplyV1(beforeReturn, 'player1');
    const afterPool = projectOfficialDeploymentSupplyV1(afterReturn, 'player1');
    assert.equal(beforePool.committed - afterPool.committed, 2);
    await save('negative-preview-and-supply.json', { rejects, markerControlSupply: supply, actualMarkerControlMeasured: false,
      supplyOccupancy: { beforeCommitted: beforePool.committed, afterCommitted: afterPool.committed, released: 2 },
      acceptedActionsInNegativeRoom: 0, priorFailureRef: prefix + 'negative-preview-fixture-repair.json', modelCalls: 0 });
    console.log(JSON.stringify({ gate: 'biological-negative-preview', rejected: 2, markerControlSupply: 1, supplyReleased: 2, modelCalls: 0 }));
  } finally { native.close(); branch.close(); product.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (process.argv.includes('--negative-preview-only')) await negativePreviewAndSupply();
  else await main();
}
export { openProduct, sourceProduct, runtimeFor };
