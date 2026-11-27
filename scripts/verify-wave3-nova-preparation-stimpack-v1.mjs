import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialAbilityEffectIrCatalogueV1 } from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = 'build/ticket-28-terran-wave3-20261116-v1/nova-preparation-stimpack/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const modes = ['assault', 'stealth'];
const physicalId = id => modes.includes(id) ? id + '-consumer-bound' : id;
const recordKey = mode => 'army_units:nova_' + mode + '_mode';
const abilityId = mode => 'unit:nova_' + mode + '_mode/super-stimpack-movement-phase@1';
const roomId = id => 'wave3-nova-stimpack-' + id;
const releaseId = id => roomId(id) + '-v1';
const actorOf = state => state.pieces.find(row => row.id === 'nova');
const weaponName = (mode, phase) => phase === 'combat'
  ? mode === 'assault' ? 'Monomolecular Blade' : 'Combat Knife'
  : mode === 'assault' ? 'Hellfire Shotgun' : 'C-20A Canister Rifle';
const meleeId = mode => 'unit:nova_' + mode + '_mode/'
  + (mode === 'assault' ? 'monomolecular-blade' : 'combat-knife') + '-combat-phase@1';

async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
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
    const context = await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    return { context, port: createOfficialArmyBuilderQueryPortV1({
      unitCompositionUpgradeDataBundle: context.resources.armyBuilder, releaseContext: context }) };
  } finally { product.close(); }
}
function candidate(mode, sideKey = 'player1') {
  return { sideKey, scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: sideKey === 'player1' ? 'tactical_cards:nova_covert_ops' : 'tactical_cards:terran_armed_forces',
    tacticalCardRecordKeys: [], units: [{ unitInstanceId: sideKey === 'player1' ? 'nova' : 'target',
      recordKey: sideKey === 'player1' ? recordKey(mode) : 'army_units:marine', compositionKind: 'small', upgrades: [] }] };
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    includeRanged: true, includeMelee: true, includePrecisionChoices: true, includeArmourChoices: true });
}
async function makeScene(context, mode) {
  const base = (await read(parent + 'tank-coordinated-strike/source-projection/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context,
    candidatesBySide: { player1: candidate(mode), player2: candidate(mode, 'player2') },
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: [abilityId(mode)], canonicalResourceTypes: true,
    includeCharacteristicConsumers: true,
    includeMelee: true, meleeWeaponDefinitionIds: [meleeId(mode)] });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'officialDeploymentGeometryDataBundle',
    'engagementScale', 'armyBuildingEngagementScale', 'officialMissionRuntimeDescriptor', 'supplyLossLedger',
    'officialModelGapTransitPolicy', 'officialBattlefieldTokenMarkerRulesDataBundle',
    'officialBattlefieldTokenMarkerRegistry', 'officialStatusStayInPlayDataBundle'];
  let state = { ...Object.fromEntries(fields.filter(key => base[key] !== undefined)
    .map(key => [key, structuredClone(base[key])])), ...setup.state,
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } },
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'nova' ? 10 : 32 + index % 3 * 1.3,
      yInches: piece.id === 'nova' ? 10 : 24 + Math.floor(index / 3) * 1.3 }));
  }
  const actor = actorOf(state);
  actor.damageMarker = 2; actor.models[0].damage = 2; actor.models[0].remainingWounds = 6;
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { mode, budget: 2000, fullRosterSpend: false, fullMatch: false,
    phaseAndPositionsDeclared: true, priorDamageMarkerDeclared: 2, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.71.0');
  const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const m = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id),
      dataset: context.dataset, snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
      datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
      referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved,
      state: scene.state, scenario: scene.scenario }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(requestedId) {
    const id = physicalId(requestedId);
    const authority = await read(output + id + '/authority.json');
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { id, context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const aggregate = await branch.native.store.loadRoom(roomId(branch.id));
  await save(branch.id + '/checkpoint-r' + aggregate.stateRevision + '.json', { envelope: aggregate.envelope });
  return aggregate;
}
async function invoke(branch, credentials, operationKey, select, parameters, kind = 'parameterized') {
  const aggregate = await checkpoint(branch);
  const result = await branch.native.commit({ roomId: roomId(branch.id),
    credential: credentials[aggregate.envelope.state.activeSideKey], operationKey, select, parameters, kind });
  await checkpoint(branch);
  return result;
}
function projection(runtime, state, mode, phase) {
  return runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: 'nova',
    weaponName: weaponName(mode, phase), attackKind: phase === 'combat' ? 'close_combat' : 'ranged' }).result;
}
function assertBuff(runtime, state, mode, value) {
  for (const phase of ['assault', 'combat']) {
    const modifiers = projection(runtime, state, mode, phase);
    assert.equal(modifiers.speedModifier, value); assert.equal(modifiers.precision, value);
  }
}
function semanticParameters(domain) {
  const schema = domain.sourceDomain.parameterSchema;
  return { activeUnitId: schema.activeUnitId.const,
    paymentCardInstanceIds: schema.paymentCardInstanceIds.const || schema.paymentCardInstanceIds.enum[0] };
}
function domainFor(runtime, state, predicate) {
  const domain = runtime.enumerate(state).parameterDomains.find(predicate);
  assert(domain, 'semantic choice missing from real product menu');
  return domain;
}
async function replay(branch) {
  const before = await branch.native.store.loadRoom(roomId(branch.id));
  await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
    .map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= before.stateRevision; revision++) {
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope,
      journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: before.stateRevision + 1, exact: true };
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--bind-consumers')) {
  const repair = await runProductBoundaryCheck({ directory: path.join(directory, 'consumer-binding'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-08-Super-Stimpack-current-movement-consumer-binding-v1',
  }, steps: [{ name: 'compile', repairRef, openProduct: sourceProduct, check: async ({ context }) => {
    const cases = [];
    for (const mode of modes) {
      const scene = await makeScene(context, mode);
      const missing = structuredClone(scene.state); delete missing.officialCharacteristicConsumerPolicy;
      assert.throws(() => runtimeFor(context, missing), /SUPER_STIMPACK_ALL_WEAPONS_CONSUMER_REQUIRED/);
      await registerScene(context, physicalId(mode), scene);
      cases.push({ mode, sourceConsumerPolicy: scene.state.officialCharacteristicConsumerPolicy,
        incompleteConsumerRejected: true, originalFailedRoomRetained: mode === 'assault' });
    }
    const ref = await save('consumer-binding.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'nova-consumer-binding', status: repair.status }));
}
const main = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
  factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
  contractVersion: 'T28-W3-08-Nova-Battle-Preparation-and-Super-Stimpack-v1',
}, steps: [
  { name: 'compile', repairRef, openProduct: sourceProduct, check: async ({ context, port }) => {
    const disclosure = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle;
    const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset: context.dataset,
      identityCatalogue: context.resources.abilityIdentities });
    const constraints = context.resources.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.armyBuildingConstraints;
    const exclusive = constraints.find(row => row.kind === 'mutually_exclusive_units'
      && row.recordKeys.includes(recordKey('assault')));
    assert.deepEqual(exclusive.recordKeys, modes.map(recordKey).sort());
    const cases = [];
    for (const mode of modes) {
      const input = candidate(mode); const verdict = port.evaluateRosterCandidate(input);
      assert.equal(verdict.status, 'legal');
      const double = structuredClone(input);
      double.units.push({ ...candidate(mode === 'assault' ? 'stealth' : 'assault').units[0], unitInstanceId: 'other-nova' });
      const rejected = port.evaluateRosterCandidate(double);
      assert.equal(rejected.status, 'illegal'); assert.equal(rejected.rulesErrorCode, 'ARMY_MUTUALLY_EXCLUSIVE_UNITS');
      const duplicate = structuredClone(input); duplicate.units.push({ ...input.units[0], unitInstanceId: 'duplicate' });
      const unique = port.evaluateRosterCandidate(duplicate);
      assert.equal(unique.status, 'illegal'); assert.equal(unique.rulesErrorCode, 'UNIQUE_UNIT_COPY_LIMIT_EXCEEDED');
      assert.throws(() => createOfficialReleaseRosterStateV2({ context,
        candidatesBySide: { player1: double, player2: candidate(mode, 'player2') },
        legacyDisclosurePolicy: disclosure,
        canonicalResourceTypes: true }), /RELEASE_ROSTER/);
      const scene = await makeScene(context, mode); const runtime = runtimeFor(context, scene.state);
      const route = runtime.bundle.routes.find(row => row.definitionId === abilityId(mode));
      assert.equal(route.resourceCost, 1); assert.equal(route.resourceType, 'CP');
      assert.equal(route.nonLethalDamage, 0); assert.equal(route.speedModifier, 2); assert.equal(route.precision, 2);
      assert.equal(route.rangedWeaponScope, 'all'); assert.equal(route.closeCombatWeaponScope, 'all');
      assertBuff(runtime, scene.state, mode, 0);
      const move = domainFor(runtime, scene.state, row => row.actionType === 'move' && row.pieceId === 'nova');
      assert.equal(move.sourceDomain.constraints.speedAllowanceInches, 7);
      assert.throws(() => runtime.instantiate(scene.state, move, { leadingModelId: actorOf(scene.state).models[0].id,
        path: [{ xMilliInches: 19000, yMilliInches: 10000 }], placements: [] }), /PATH_EXCEEDS_SPEED/);
      const domain = domainFor(runtime, scene.state, row => row.definitionId === abilityId(mode));
      const parameters = semanticParameters(domain);
      const query = runtime.query(scene.state, { queryKind: 'instantiate_parameterized_action',
        domainId: domain.sourceDomain.domainId, parameters });
      assert.deepEqual(query.result.action, runtime.instantiate(scene.state, domain, parameters).action.sourceAction);
      for (const reason of ['phase', 'off_field', 'no_payment']) {
        const invalid = structuredClone(scene.state);
        if (reason === 'phase') invalid.phase = 'assault';
        if (reason === 'off_field') {
          const actor = actorOf(invalid);
          actor.isOnField = false; actor.isInReserves = true;
          for (const model of actor.models) model.isOnField = false;
        }
        if (reason === 'no_payment') for (const card of invalid.cardResources.player1) card.readiness = 'exhausted';
        assert(!runtime.enumerate(invalid).parameterDomains.some(row => row.definitionId === abilityId(mode)), reason);
      }
      const definitions = catalogue.definitions.filter(row => row.recordKey === recordKey(mode)
        && ['Battle Preparation', 'Super Stimpack'].includes(row.definitionName));
      assert.equal(definitions.length, 2);
      await registerScene(context, physicalId(mode), scene);
      cases.push({ mode, input, verdict, rejected, unique, definitions, route, query,
        battlePreparationOwner: 'createOfficialArmyBuilderCatalogueV2 / resolveOfficialArmySlotAuditV1' });
    }
    const ref = await save('compile.json', { cases, exclusive, newSemanticAtoms: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'consume', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const mode of modes) {
      const saved = await cached(mode + '/consumed.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(mode);
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        await invoke(branch, credentials, 'super-stimpack', row => row.definitionId === abilityId(mode), semanticParameters);
        const after = await checkpoint(branch); const state = after.envelope.state;
        assert.equal(actorOf(state).damageMarker, 2); assert.equal(actorOf(state).models[0].remainingWounds, 6);
        assertBuff(branch.runtime, state, mode, 2);
        assert.equal(state.activeAbilityUseHistory.filter(row => row.abilityName === 'Super Stimpack').length, 1);
        assert(!branch.runtime.enumerate(state).parameterDomains.some(row => row.definitionId === abilityId(mode)));
        const move = domainFor(branch.runtime, state, row => row.actionType === 'move' && row.pieceId === 'nova');
        assert.equal(move.sourceDomain.constraints.speedAllowanceInches, 9);
        const beforeQuery = await branch.native.store.loadRoom(roomId(branch.id));
        branch.runtime.query(state, { queryKind: 'characteristic_status_projection', pieceId: 'nova' });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), beforeQuery);
        const value = { mode, revision: after.stateRevision, damage: actorOf(state).damageMarker,
          ranged: projection(branch.runtime, state, mode, 'assault'), melee: projection(branch.runtime, state, mode, 'combat'),
          movementAllowance: move.sourceDomain.constraints.speedAllowanceInches, actualCardResources: state.cardResources.player1 };
        await save(mode + '/consumed.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const mode of modes) {
      const saved = await cached(mode + '/successor.json'); if (saved) { cases.push(saved); continue; }
      const branch = await product.branch(mode);
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        await invoke(branch, credentials, 'move-nine', row => row.actionType === 'move' && row.pieceId === 'nova',
          () => ({ leadingModelId: actorOf(branch.authority.state).models[0].id,
            path: [{ xMilliInches: 19000, yMilliInches: 10000 }], placements: [] }));
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
        const after = await checkpoint(branch);
        assert.equal(after.envelope.state.activeSideKey, 'player2');
        assert.equal(actorOf(after.envelope.state).models[0].xInches, 19);
        assertBuff(branch.runtime, after.envelope.state, mode, 2);
        const cleaned = branch.runtime.lifecycle(after.envelope.state, { eventKind: 'cleanup_and_refresh' }).state;
        assertBuff(branch.runtime, cleaned, mode, 0);
        assert.equal(actorOf(cleaned).damageMarker, 2);
        const value = { mode, revision: after.stateRevision, nextPlayer: 'player2', actualMovementInches: 9,
          cleanupScope: 'product lifecycle callback', cleanupNativeTransitions: 0, damageUnchanged: true };
        await save(mode + '/successor.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'coldRecovery', repairRef, openProduct, check: async product => {
    const cases = [];
    for (const mode of modes) { const branch = await product.branch(mode); try { cases.push(await replay(branch)); } finally { branch.close(); } }
    const ref = await save('cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ gate: 'nova-preparation-stimpack', status: main.status, failures: main.failures.length }));

if (process.argv.includes('--weapons')) {
  const specs = modes.flatMap(mode => ['assault', 'combat'].map(phase => ({ mode, phase, id: mode + '-' + phase })));
  async function settleAttack(branch, credentials) {
    for (let index = 0; index < 30; index++) {
      const current = await checkpoint(branch); const state = current.envelope.state;
      const pending = state.pendingOfficialRangedPrecisionChoice || state.pendingOfficialMeleePoolChoice
        || state.pendingCurrentProductRangedCasualtyChoice || state.pendingAction;
      if (!pending) return current;
      const menu = branch.runtime.enumerate(state);
      if (menu.parameterDomains.length) {
        const domain = menu.parameterDomains[0];
        const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
        const field = schema.required[0]; const parameter = schema[field] || schema.properties?.[field];
        const value = parameter.items ? (parameter.items.enum || []).slice(0, parameter.maxItems ?? parameter.minItems ?? 0)
          : parameter.enum[0];
        await invoke(branch, credentials, 'settle-r' + current.stateRevision,
          row => row.domainId === domain.domainId, () => ({ [field]: value }));
      } else {
        assert.equal(menu.candidates.length, 1);
        await invoke(branch, credentials, 'settle-r' + current.stateRevision, () => true, null, 'finite');
      }
    }
    assert.fail('bounded actual Nova attack continuation did not settle');
  }
  const weapons = await runProductBoundaryCheck({ directory: path.join(directory, 'weapon-consumers'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'successor.json',
    contractVersion: 'T28-W3-08-Nova-Super-Stimpack-ranged-and-melee-native-consumers-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const source = await product.branch(spec.mode);
        try {
          const original = await source.native.store.loadRoom(roomId(source.id));
          let state = structuredClone(original.envelope.state);
          state.phase = spec.phase; state.activeSideKey = 'player1'; state.log = [];
          state.phaseFirstActorByRound['1:' + spec.phase] = {
            round: 1, phase: spec.phase, chosenFirstActorSideKey: 'player1' };
          const actor = actorOf(state); const target = state.pieces.find(row => row.id === 'target');
          const targetX = spec.phase === 'combat'
            ? 19 + (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2 + 0.5 : 24;
          target.models.forEach((model, index) => Object.assign(model, {
            xInches: targetX + index % 3 * 1.3, yInches: 10 + Math.floor(index / 3) * 1.3 }));
          state = refreshOfficialReleaseRosterDerivedStateV2({ context: source.context, state });
          assertBuff(source.runtime, state, spec.mode, 2);
          await registerScene(source.context, spec.id, { state, scenario: {
            sourceRoom: roomId(source.id), sourceRevision: original.stateRevision,
            sourceCheckpoint: output + source.id + '/checkpoint-r' + original.stateRevision + '.json',
            actualPriorSuperStimpackAndMove: true, declaredNewPhaseAndEnemyPositions: spec.phase,
            fullMatch: false, budget: 2000, fullRosterSpend: false, modelCalls: 0 } });
          assert.deepEqual(await source.native.store.loadRoom(roomId(source.id)), original);
          cases.push({ ...spec, sourceRevision: original.stateRevision,
            derivedPhaseScenario: true, originalRoomUnchanged: true });
        } finally { source.close(); }
      }
      const ref = await save('weapon-consumers-compile.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const saved = await cached(spec.id + '/attack-consumed.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(spec.id);
        try {
          const credentials = await branch.native.create(roomId(branch.id), branch.authority);
          await checkpoint(branch);
          const state = branch.authority.state;
          const actionType = spec.phase === 'combat' ? 'fight' : 'ranged_attack';
          const domain = domainFor(branch.runtime, state, row => row.actionType === actionType && row.pieceId === 'nova');
          const rawWeapon = branch.context.dataset.recordsByKey[recordKey(spec.mode)].payload.upgrades
            .find(row => row.name === weaponName(spec.mode, spec.phase));
          const parameters = spec.phase === 'combat'
            ? { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target',
              dice: Number(rawWeapon.description.match(/RoA: (\d+)/u)[1]) }],
              ...(domain.sourceDomain.parameterSchema.required.includes('surgeTargetUnitId') ? { surgeTargetUnitId: 'target' } : {}) }
            : { targetUnitId: 'target' };
          const beforeQuery = await branch.native.store.loadRoom(roomId(branch.id));
          const query = branch.runtime.query(state, { queryKind: spec.phase === 'combat' ? 'melee_action_preview' : 'ranged_attack_preview',
            ...(spec.phase === 'combat' ? { actionType } : {}), pieceId: 'nova', weaponName: rawWeapon.name, parameters });
          assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), beforeQuery);
          await invoke(branch, credentials, 'attack', row => row.domainId === domain.domainId, () => parameters);
          const after = await settleAttack(branch, credentials);
          const events = after.envelope.state.log.flatMap(row => row.events || []);
          const event = events.find(row => row.type === (spec.phase === 'combat' ? 'close_combat_attack' : 'ranged_attack'));
          assert(event, 'Native attack result missing');
          assert.equal(spec.phase === 'combat' ? event.stages.activePrecisionValue : event.stages.effects.precisionValue, 2);
          assertBuff(branch.runtime, after.envelope.state, spec.mode, 2);
          const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
          const first = bundle.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
          assert.deepEqual(query.result.action, first.action);
          const value = { ...spec, revision: after.stateRevision, query, event,
            allWeaponBuffRetainedAfterAttack: true, queryEqualsNativeAction: true, modelCalls: 0 };
          await save(spec.id + '/attack-consumed.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('weapon-consumers-consume.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) {
        const saved = await cached(spec.id + '/successor.json'); if (saved) { cases.push(saved); continue; }
        const branch = await product.branch(spec.id);
        try {
          const credentials = await branch.native.create(roomId(branch.id), branch.authority);
          const current = await checkpoint(branch);
          if (current.envelope.state.pendingCurrentProductRangedSequence) {
            await invoke(branch, credentials, 'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', null, 'finite');
          }
          await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'nova', () => ({}));
          const after = await checkpoint(branch); assert.equal(after.envelope.state.activeSideKey, 'player2');
          const value = { ...spec, revision: after.stateRevision, nextPlayer: 'player2' };
          await save(spec.id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('weapon-consumers-successor.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const spec of specs) { const branch = await product.branch(spec.id); try { cases.push(await replay(branch)); } finally { branch.close(); } }
      const ref = await save('weapon-consumers-cold-recovery.json', cases); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ gate: 'nova-weapon-consumers', status: weapons.status, failures: weapons.failures.length }));
}

if (process.argv.includes('--legacy')) {
  const legacy = 'build/ticket-28-wave3-faq-runtime-20261112-v1/nonlethal/';
  const { createOfficialCurrentProductMatchRuntimeV1 } = await import('../packages/product-composition/official-current-product-match-runtime-v1.mjs');
  const { createOfficialCurrentProductMatchRuntimeV6 } = await import('../packages/product-composition/official-current-product-match-runtime-v6.mjs');
  const { createOfficialCurrentProductMatchRuntimeV7 } = await import('../packages/product-composition/official-current-product-match-runtime-v7.mjs');
  const { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 } = await import('../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs');
  const compatibility = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-verification'), identity: {
    factoryModule: 'packages/product-composition/official-current-product-match-runtime-v7.mjs',
    factoryExport: 'createOfficialCurrentProductMatchRuntimeV7', sourceRef: legacy + 'consume.json',
    contractVersion: 'T28-W3-08-Super-Stimpack-preserves-existing-positive-self-damage-v1',
  }, steps: [{ name: 'coldRecovery', repairRef, openProduct: async () => ({
    dataset: await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json'),
    consumed: await read(legacy + 'consume.json'), successor: await read(legacy + 'successor.json'),
  }), check: async product => {
    const cases = [];
    for (const pieceId of ['test-raider', 'test-marauder']) {
      const resultRef = 'legacy/' + pieceId + '/result.json';
      const saved = await cached(resultRef); if (saved) { cases.push(saved); continue; }
      const authority = await read(legacy + pieceId + '-authority.json');
      const runtime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime:
        createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
          createOfficialCurrentProductMatchRuntimeV1({ dataset: product.dataset, state: structuredClone(authority.state) }) }),
        faqReactionPolicy: OFFICIAL_FAQ_REACTION_POLICY_V13, nonLethalDamagePolicy: OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 });
      assert.deepEqual(runtime.descriptor, await read(legacy + 'runtime.json'));
      const folder = path.join(directory, 'legacy', pieceId); await fs.mkdir(folder, { recursive: true });
      const native = openWave3EngineeringRoomV1({ directory: folder, filename: 'room.sqlite', rulesRuntime: runtime });
      const id = 'nova-stimpack-compat-' + pieceId;
      try {
        const credentials = await native.create(id, authority);
        async function capture() {
          const current = await native.store.loadRoom(id);
          await save('legacy/' + pieceId + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
          return current;
        }
        await capture();
        await native.commit({ roomId: id, credential: credentials.player1, operationKey: 'stimpack',
          select: row => row.abilityName === 'Stimpack' && row.pieceId === pieceId,
          parameters: row => ({ activeUnitId: row.parameterSchema.activeUnitId.const,
            paymentCardInstanceIds: row.parameterSchema.paymentCardInstanceIds.enum[0] }) });
        const afterAbility = await capture();
        const original = product.consumed.rows.find(row => row.pieceId === pieceId);
        assert.equal(afterAbility.envelope.stateHash, original.stateHash);
        assert.deepEqual(afterAbility.envelope.state.log.at(-1).events.find(row => row.type === 'stimpack_resolved'), original.event);
        await native.commit({ roomId: id, credential: credentials.player1, operationKey: 'finish-activation',
          select: row => row.actionType === 'finish_activation' && row.pieceId === pieceId, parameters: () => ({}) });
        const afterFinish = await capture();
        assert.equal(afterFinish.envelope.stateHash, product.successor.rows.find(row => row.pieceId === pieceId).stateHash);
        await native.restoreDependencies(id, authority);
        const bundle = await native.store.loadReplayBundle(id);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (let revision = 0; revision <= afterFinish.stateRevision; revision++) {
          const actual = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
          assert.equal(actual.ok, true, JSON.stringify(actual));
          assert.deepEqual(actual.envelope, (await read(output + 'legacy/' + pieceId + '/checkpoint-r' + revision + '.json')).envelope);
        }
        assert.deepEqual(await native.store.loadRoom(id), afterFinish);
        const value = { pieceId, receipts: receipts.length, checkpoints: afterFinish.stateRevision + 1,
          originalSavedPostStateHashesExact: 2, nativeReconstructionReplayExact: true,
          originalRoomModified: false, originalRawDatabaseRequired: false, modelCalls: 0 };
        await save(resultRef, value); cases.push(value);
      } finally { native.close(); }
    }
    const ref = await save('legacy-control.json', { cases,
      scope: 'Original frozen authorities through the actual Match V7 factory; four saved post-state hashes and events compared. New isolated Native receipts, not original deleted database journals.' });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ gate: 'nova-legacy-stimpack', status: compatibility.status, failures: compatibility.failures.length }));
}
