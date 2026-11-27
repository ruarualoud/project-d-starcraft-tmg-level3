import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialSelectedRosterAbilityModifiersV1 }
  from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import { projectOfficialChargeSpeedDebuffV1, OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID,
  OFFICIAL_CHARGE_DECLARATION_REACTION_ATOM_ID } from '../packages/rule-atoms/official-charge-speed-debuff-policy-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-suppression/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const foundation = 'build/ticket-28-terran-wave3-20261117-v1/spec-ops-foundation/';
const meleeId = 'unit:spec_ops_marauder__marauder_/strike-combat-phase@1';
const definitionId = OFFICIAL_SUPPRESSION_SHELLS_DEFINITION_ID;
const specs = ['use', 'decline'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const roomId = id => 'wave3-suppression-' + id;
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
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [], reactionDefinitionIds: [definitionId], includeMelee: true });
}
function arrangeMarine(piece) {
  arrange(piece, 10, 10);
  for (const [index, model] of piece.models.entries()) {
    model.xInches = 10 + index % 3 * (model.baseWidthInches + 0.02);
    model.yInches = 10 + Math.floor(index / 3) * (model.baseDepthInches + 0.02);
  }
}
async function sceneFor(context) {
  const base = (await read(foundation + 'quad-armoured/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeAbilitySourcePhases: true,
    reactionDefinitionIds: [definitionId], includeMelee: true, meleeWeaponDefinitionIds: [meleeId],
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'charger', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] }] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:nova_covert_ops', tacticalCardRecordKeys: [], units: [
          { unitInstanceId: 'specops', recordKey: 'army_units:spec_ops_marauder__marauder_', compositionKind: 'small', upgrades: [] },
          { unitInstanceId: 'nova', recordKey: 'army_units:nova_assault_mode', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  const state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined)
    .map(key => [key, structuredClone(base[key])])), ...setup.state, round: 1, phase: 'assault', activeSideKey: 'player1',
    firstPlayerSideKey: 'player1', log: [], phaseFirstActorByRound: {
      '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = [];
  state.board.markers = [];
  state.board.effectMarkers = [];
  arrangeMarine(pieceOf(state, 'charger'));
  arrange(pieceOf(state, 'specops'), 32, 10);
  arrange(pieceOf(state, 'nova'), 50, 30);
  const coherency = declareCoherency(state);
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    scale: 'Standard2000-budget partial legal rosters', phaseAndPositionsDeclared: true, coherency,
    intentionallyBeyondMaximumChargeDistance: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.88.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef), datasetRef: manifest.source.datasetRef,
      snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
      referenceSources: manifest.source.references, sourcePolicy: manifest.source.policy,
      components: { ...manifest.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority);
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
  const ref = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(ref);
  if (old) assert.deepEqual(old.envelope, current.envelope);
  else await save(ref, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized', sideKey = 'player1') {
  await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[sideKey], operationKey, select, parameters, kind });
  await checkpoint(branch);
  return result;
}
function chargeParameters(state, targetIds = ['specops']) {
  return { leadingModelId: pieceOf(state, 'charger').models[0].id,
    targets: targetIds.map(id => ({ unitId: id, modelId: pieceOf(state, id).models[0].id })) };
}
function privateDeclaration(runtime, state, targetIds) {
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'charge' && row.pieceId === 'charger');
  assert(domain);
  const value = runtime.instantiate(state, domain, chargeParameters(state, targetIds));
  return runtime.apply(state, value.action, {});
}
function addWall(state, x) {
  const wall = createOfficialTerrainPieceV1({ id: 'suppression-wall', size: 4,
    footprint: { shape: 'axis_aligned_rectangle', minXMilliInches: x * 1000,
      maxXMilliInches: x * 1000 + 500, minYMilliInches: 1000, maxYMilliInches: 25000 } });
  state.board.terrain.push({ ...wall, elevationSurface: false });
  state.board.specialTerrainAgreement = createOfficialSpecialTerrainAgreementV1({ terrainEntries: [
    ...state.board.specialTerrainAgreement.terrainEntries,
    { terrainId: wall.id, terrainKind: 'ordinary', adjacentElevationPairs: [], accessPoints: [] },
  ] });
}
function privateControls(runtime, state) {
  const original = JSON.stringify(state);
  const self = privateDeclaration(runtime, state);
  assert.equal(self.state.pendingOfficialChargeDeclaration.stage, 'reaction');
  assert.equal(self.state.activeSideKey, 'player2');
  assert.equal(self.state.pendingAction, undefined);
  assert.throws(() => runtime.lifecycle(self.state, { eventKind: 'cleanup_and_refresh' }), /CONTINUATION_REQUIRED/);
  const multiple = privateDeclaration(runtime, state, ['nova', 'specops']);
  assert.equal(multiple.state.pendingOfficialChargeDeclaration.stage, 'reaction');
  const far = privateDeclaration(runtime, state, ['nova']);
  assert.equal(far.state.pendingOfficialChargeDeclaration.stage, 'ready');
  const boundary = structuredClone(state);
  const source = pieceOf(boundary, 'specops').models[0];
  const target = pieceOf(boundary, 'nova').models[0];
  target.xInches = Math.round((source.xInches + source.baseWidthInches / 2 + target.baseWidthInches / 2 + 8) * 1000) / 1000;
  target.yInches = 10;
  assert.equal(privateDeclaration(runtime, boundary, ['nova']).state.pendingOfficialChargeDeclaration.stage, 'reaction');
  target.xInches += 0.02;
  assert.equal(privateDeclaration(runtime, boundary, ['nova']).state.pendingOfficialChargeDeclaration.stage, 'ready');
  const hiddenFriendly = structuredClone(state);
  pieceOf(hiddenFriendly, 'nova').models[0].xInches = 36;
  pieceOf(hiddenFriendly, 'nova').models[0].yInches = 10;
  assert.equal(privateDeclaration(runtime, hiddenFriendly, ['nova']).state.pendingOfficialChargeDeclaration.stage, 'reaction');
  addWall(hiddenFriendly, 34);
  assert.equal(privateDeclaration(runtime, hiddenFriendly, ['nova']).state.pendingOfficialChargeDeclaration.stage, 'ready');
  const hiddenEnemy = structuredClone(state);
  addWall(hiddenEnemy, 20);
  assert.equal(privateDeclaration(runtime, hiddenEnemy).state.pendingOfficialChargeDeclaration.stage, 'reaction');
  const noPayment = structuredClone(state);
  for (const card of noPayment.cardResources.player2) card.readiness = 'exhausted';
  assert.equal(privateDeclaration(runtime, noPayment).state.pendingOfficialChargeDeclaration.stage, 'ready');
  assert.equal(JSON.stringify(state), original);
  return { selfSubjectAllowed: true, secondDeclaredSubjectAllowed: true, outOfRangeExcluded: true,
    exactEightAllowed: true, beyondEightExcluded: true, friendlyLosRequired: true, enemyLosNotRequired: true,
    missingPaymentAutoPassesOnlyUnavailableReaction: true, cleanupBypassRejected: true,
    sourceStateUnchanged: true, privateDeclaredTerrainWall: true };
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
      weaponDefinitionIds: ['unit:spec_ops_marauder__marauder_/quad-k12-assault-phase@1'],
      includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const original = await fs.readFile(path.join(root, prefix, 'room.sqlite'));
    const copy = path.join(directory, 'legacy-room.sqlite');
    try { await fs.access(copy); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(copy, original, { flag: 'wx' }); }
    const native = openWave3EngineeringRoomV1({ directory, filename: 'legacy-room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    try {
      const id = 'wave3-specops-quad-armoured';
      await native.restoreDependencies(id, authority);
      const legacy = await replay(native, id, prefix + 'checkpoint-r');
      assert.equal(sha256(await fs.readFile(path.join(root, prefix, 'room.sqlite'))), sha256(original));
      const value = { ...legacy, runtimeVersion: '3.86.0', descriptorExact: true,
        originalDatabaseUnchanged: true, originalDatabaseSha256: sha256(original), status: 'passed', modelCalls: 0 };
      await save('legacy-cold-recovery.json', value);
      return value;
    } finally { native.close(); }
}

async function main() {
await fs.mkdir(directory, { recursive: true });
const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs', factoryExport: 'createOfficialReleaseRosterStateV2',
  sourceRef, contractVersion: 'T28-W3-08-Suppression-charge-reaction-before-dice-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
    for (const id of specs) await registerScene(context, id, await sceneFor(context));
    const authority = await read(output + 'use/authority.json');
    const runtime = runtimeFor(context, authority.state);
    const definition = runtime.catalogue.definitions.find(row => row.definitionId === definitionId);
    assert.equal(definition.execution.status, 'executable_exact');
    assert(runtime.descriptor.executableRuleAtomIds.includes(OFFICIAL_CHARGE_DECLARATION_REACTION_ATOM_ID));
    const controls = privateControls(runtime, authority.state);
    const ref = await save('compile.json', { definition, sourceRoute: runtime.reactionBundle.routes[0], controls,
      sourcePolicy: authority.state.officialFaqReactionPolicy, privateOnly: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of specs) {
      const prior = await cached(id + '/consumed.json');
      if (prior) { results.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        await checkpoint(branch);
        const initial = await read(output + id + '/checkpoint-r0.json');
        const beforeQuery = await branch.native.store.loadRoom(roomId(id));
        const query = branch.runtime.query(initial.envelope.state, { queryKind: 'melee_action_preview',
          actionType: 'charge', pieceId: 'charger', parameters: chargeParameters(initial.envelope.state) });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), beforeQuery);
        const declaration = await invoke(branch, credentials, 'declare', row => row.actionType === 'charge' && row.pieceId === 'charger',
          () => chargeParameters(initial.envelope.state));
        assert.deepEqual(declaration.preview.core.action, query.result.action);
        assert.equal(declaration.preview.core.chanceTicket, null);
        const declared = await read(output + id + '/checkpoint-r' + (declaration.preview.core.expectedStateRevision + 1) + '.json');
        assert.equal(declared.envelope.state.pendingAction, undefined);
        assert.equal(declared.envelope.state.activeSideKey, 'player2');
        const reaction = await invoke(branch, credentials, 'react', row => id === 'use'
          ? row.abilityName === 'Suppression Shells' : row.actionType === 'pass_reaction_family_window', domain => id === 'use'
          ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {}, 'parameterized', 'player2');
        assert.equal(reaction.preview.core.chanceTicket, null);
        const ready = await read(output + id + '/checkpoint-r' + (reaction.preview.core.expectedStateRevision + 1) + '.json');
        assert.equal(ready.envelope.state.pendingAction, undefined);
        assert.equal(ready.envelope.state.pendingOfficialChargeDeclaration.stage, 'ready');
        assert.deepEqual(ready.envelope.state.pendingOfficialChargeDeclaration.canonicalParameters, chargeParameters(initial.envelope.state));
        assert.equal(ready.envelope.state.cardResources.player2[0].readiness, id === 'use' ? 'exhausted' : 'ready');
        const debuff = projectOfficialChargeSpeedDebuffV1(ready.envelope.state, pieceOf(ready.envelope.state, 'charger'));
        assert.equal(debuff?.speedPenalty ?? 0, id === 'use' ? 3 : 0);
        const rolled = await invoke(branch, credentials, 'roll', row => row.action.actionType === 'roll_declared_charge', undefined, 'finite');
        assert(rolled.preview.core.chanceTicket);
        const current = await read(output + id + '/checkpoint-r' + (rolled.preview.core.expectedStateRevision + 1) + '.json');
        const pending = current.envelope.state.pendingAction;
        assert.equal(current.envelope.state.pendingOfficialChargeDeclaration, undefined);
        assert.equal(pending.stage, 'resolve_charge_after_roll');
        assert.equal(pending.chargePlan.speedInches, id === 'use' ? 1 : 4);
        assert.equal(pending.chargeRolls.length, 1);
        assert.equal(pending.maxDistanceMilliInches, (pending.chargePlan.speedInches + pending.chargeRoll) * 1000);
        const value = { id, queryEqualsNative: true, declaredWithoutDice: true, reactionWithoutDice: true,
          actualChargeRolls: pending.chargeRolls, speedInches: pending.chargePlan.speedInches,
          maxDistanceMilliInches: pending.maxDistanceMilliInches, actualPayment: id === 'use' ? 1 : 0,
          revision: current.envelope.stateRevision, modelCalls: 0 };
        await save(id + '/consumed.json', value);
        results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', results);
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const results = [];
    for (const id of specs) {
      const prior = await cached(id + '/completed.json');
      if (prior) { results.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        await invoke(branch, credentials, 'resolve', row => row.actionType === 'resolve_charge',
          () => ({ outcome: 'failure', failureProof: { kind: 'distance_shortfall' } }));
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'charger', () => ({}));
        const after = await checkpoint(branch);
        assert.equal(after.envelope.state.activeSideKey, 'player2');
        const clean = branch.runtime.lifecycle(after.envelope.state, { eventKind: 'cleanup_and_refresh' }).state;
        assert.equal(resolveOfficialSelectedRosterAbilityModifiersV1(clean, pieceOf(clean, 'charger')).speedPenalty, undefined);
        assert.equal(projectOfficialChargeSpeedDebuffV1(clean, pieceOf(clean, 'charger')), null);
        const value = { id, revision: after.stateRevision, parentChargeCompleted: true, nextSide: 'player2',
          privateActualCleanupRemovedDebuff: true, modelCalls: 0 };
        await save(id + '/completed.json', value);
        results.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', results);
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const current = [];
    for (const id of specs) {
      const branch = await product.branch(id);
      try {
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        current.push({ id, ...await replay(branch.native, roomId(id), output + id + '/checkpoint-r') });
      } finally { branch.close(); }
    }
    const legacy = await verifyLegacy(product);
    const ref = await save('cold-recovery.json', { current, legacy });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'spec-ops-suppression', status: gate.status, failures: gate.failures.length }));

}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
export { sourceProduct, runtimeFor, addWall, verifyLegacy, registry };
