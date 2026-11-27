import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261117-v1/consume-payment-quotes/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const releaseId = 'wave3-consume-payment-quotes-source-v1';
const roomId = 'wave3-consume-payment-quotes';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const darkId = 'unit:defiler/dark-swarm-assault-phase@1';
const plagueId = 'unit:defiler/plague-assault-phase@1';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({
  context, spatialState: state, definitionIds: [squadronId] });
const query = (runtime, state, extra = {}) => runtime.query(state, {
  queryKind: 'consume_payment_options', sourcePieceId: 'defiler', abilityDefinitionId: darkId, ...extra });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return prefix + name;
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
    return { context: await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' }),
      close: () => product.close() };
  } catch (error) { product.close(); throw error; }
}
async function sceneFor(context, { plague = false, quotes = true } = {}) {
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const environment = (await read('build/ticket-28-zerg-wave3-20261117-v1/defiler-burrow/authority.json')).state;
  const unit = (id, key, upgrades = []) => ({ unitInstanceId: id, recordKey: 'army_units:' + key,
    compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context,
    characteristicDefinitionIds: [squadronId], includeCharacteristicConsumers: true,
    canonicalResourceTypes: true, includeGestateDarkSwarm: true, includeConsumePaymentQuotes: quotes,
    legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler', plague ? [{ upgradeName: 'Plague' }] : []), unit('defiler2', 'defiler'),
          unit('vileling', 'vileling__zergling_')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [unit('enemy', 'goliath')] },
    } });
  const fields = ['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
    'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale', 'armyBuildingEngagementScale'];
  const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(environment[key])])), ...setup.state,
    ...Object.fromEntries(['officialDeploymentGeometryBinding', 'officialBattlefieldTokenMarkerRulesDataBundle',
      'officialBattlefieldTokenMarkerRegistry'].map(key => [key, structuredClone(original[key])])),
    round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
  arrange(piece(state, 'defiler'), 12, 26); arrange(piece(state, 'defiler2'), 14, 32);
  const squad = piece(state, 'vileling'), step = squad.models[0].baseWidthInches + 0.1;
  const points = [[28, 25]];
  for (const [count, radius, increment] of [[6, step, 60], [11, step * 2, 30]]) {
    for (let i = 0; i < count; i++) {
      const angle = i * increment * Math.PI / 180;
      points.push([Math.round((28 + Math.cos(angle) * radius) * 1000) / 1000,
        Math.round((25 + Math.sin(angle) * radius) * 1000) / 1000]);
    }
  }
  Object.assign(squad, { isOnField: true, isInReserves: false, deploymentStatus: 'hypothetical_snapshot' });
  squad.models.forEach((model, index) => Object.assign(model, {
    isOnField: true, xInches: points[index][0], yInches: points[index][1] }));
  arrange(piece(state, 'enemy'), 42, 4);
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    declaredPhaseAndPositions: true, partialLegalRosters: true, quoteOnly: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, scene) {
  const runtime = runtimeFor(context, scene.state);
  const runtimeRef = await save('runtime.json', runtime.descriptor);
  const m = context.manifest, product = registry();
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId, dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    await save('authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene }));
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  try {
    const authority = await read(prefix + 'authority.json');
    const context = await product.resolver.resolve({ releaseId, purpose: 'area_ability_component' });
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close() { native.close(); product.close(); } };
  } catch (error) { product.close(); throw error; }
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Consume-Payment-Quotes-v1' }, steps: [
    { name: 'read', repairRef, openProduct: sourceProduct, check: async ({ context }) => {
      const source = context.dataset.recordsByKey['army_units:defiler'];
      const feature = source.payload.upgrades.find(row => row.name === 'Consume');
      assert.equal(feature.activation, '<Passive>'); assert.equal(feature.phase, 'Any Phase');
      const ref = await save('read.json', { recordKey: source.recordKey, sourceRecordHash: source.sourceRecordHash,
        payloadHash: source.payloadHash, feature, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: sourceRef };
    } },
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async ({ context }) => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.113.0');
      assert.equal(runtime.descriptor.consumePaymentQuery.sacrificeConsumerReady, false);
      await registerScene(context, scene);
      const compatibility = [];
      for (const [folder, definitions, flags] of [
        ['gestate-dark-swarm', [], {}],
        ['dark-swarm-reaction/source', [squadronId], { includeRanged: true, includeTargetReactions: true,
          includePrecisionChoices: true, includeArmourChoices: true }],
      ]) {
        const base = 'build/ticket-28-zerg-wave3-20261117-v1/' + folder + '/';
        const authority = await read(base + 'authority.json');
        const descriptor = createOfficialCharacteristicStatusComponentRuntimeV2({ context,
          spatialState: authority.state, definitionIds: definitions, ...flags }).descriptor;
        assert.deepEqual(descriptor, await read(base + 'runtime.json'));
        compatibility.push({ folder, runtimeVersion: descriptor.runtimeVersion, exactDescriptor: true });
      }
      const disabled = await sceneFor(context, { quotes: false });
      assert.equal(disabled.state.officialConsumePaymentSourceBundle, undefined);
      assert.equal(runtimeFor(context, disabled.state).descriptor.consumePaymentQuery, undefined);
      const ref = await save('compile.json', { runtime: runtime.descriptor, source: scene.state.officialConsumePaymentSourceBundle,
        compatibility, defaultOptionUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      await product.native.create(roomId, product.authority);
      const current = await product.native.store.loadRoom(roomId), state = current.envelope.state;
      const result = query(product.runtime, state), snapshotHash = hash(state);
      assert(result.cardOnlyPayments.length > 0);
      assert.deepEqual(result.consumeCardPayments.map(row => row.cardInstanceIds), [[]]);
      assert.deepEqual(result.sacrifices.map(row => row.pieceId), ['defiler', 'defiler2']);
      const self = result.sacrifices.find(row => row.pieceId === 'defiler');
      assert.equal(self.removesSource, true); assert.equal(self.remainingSupply, 0);
      assert.equal(result.abilityTimingValidated, false); assert.equal(result.sacrificeCommitted, false);
      const controls = [];
      const edge = structuredClone(state);
      arrange(piece(edge, 'defiler2'), 19.15, 26);
      assert.equal(query(product.runtime, edge).sacrifices.find(row => row.pieceId === 'defiler2').distanceMilliInches, 4000);
      arrange(piece(edge, 'defiler2'), 19.152, 26);
      assert(!query(product.runtime, edge).sacrifices.some(row => row.pieceId === 'defiler2'));
      controls.push('full_base_four_inches_exact_and_outside');
      arrange(piece(edge, 'enemy'), 14, 26);
      assert(!query(product.runtime, edge).sacrifices.some(row => row.pieceId === 'enemy'));
      controls.push('enemy_excluded');
      let seven = structuredClone(state);
      const squad = piece(seven, 'vileling');
      squad.currentModels = 7;
      squad.models.forEach((model, index) => Object.assign(model, {
        isOnField: index < 7, isDestroyed: index >= 7,
        xInches: model.xInches - 11, yInches: model.yInches + 1 }));
      squad.currentSupply = resolveOfficialCurrentSupplyValueV1({
        unitCardSupplyDataBundle: seven.officialUnitCardSupplyDataBundle,
        recordKey: squad.officialUnitRecordKey, currentModels: 7, isDestroyed: false,
        rulesOwnedCurrentModelCountRequested: true }).currentSupplyValue;
      seven = refreshOfficialReleaseRosterDerivedStateV2({ context: product.context, state: seven });
      const sevenQuote = query(product.runtime, seven).sacrifices.find(row => row.pieceId === 'vileling');
      assert(sevenQuote); assert.equal(sevenQuote.modelIds.length, 7);
      assert(sevenQuote.modelIds.includes(squad.models[1].id));
      assert.equal(sevenQuote.currentSupply, 2); assert.equal(sevenQuote.remainingSupply, 1);
      controls.push('declared_seven_models_one_removal_changes_supply_two_to_one');
      const depleted = structuredClone(state);
      depleted.cardResources.player1.forEach(card => { card.readiness = 'exhausted'; });
      const depletedQuery = query(product.runtime, depleted);
      assert.deepEqual(depletedQuery.cardOnlyPayments, []);
      assert.deepEqual(depletedQuery.consumeCardPayments.map(row => row.cardInstanceIds), [[]]);
      controls.push('one_biomass_from_model_without_card');
      for (const [extra, code] of [
        [{ resourceCost: 0 }, /SEMANTIC_ONLY/], [{ stateHash: 'forged' }, /SEMANTIC_ONLY/],
        [{ abilityDefinitionId: plagueId, biomassToSpend: 2 }, /ABILITY_NOT_SELECTED/],
        [{ abilityDefinitionId: 'unit:defiler/gestate-dark-swarm-movement-phase@1' }, /ABILITY_NOT_SELECTED/],
        [{ biomassToSpend: 2 }, /COST_CHOICE_INVALID/],
      ]) assert.throws(() => query(product.runtime, state, extra), code);
      controls.push('forged_facts_unpurchased_ability_zero_cost_and_wrong_cost_rejected');
      const withPlague = await sceneFor(product.context, { plague: true });
      const plagueQuery = query(runtimeFor(product.context, withPlague.state), withPlague.state,
        { abilityDefinitionId: plagueId, biomassToSpend: 3 });
      assert.equal(plagueQuery.resourceCost, 3);
      assert(plagueQuery.consumeCardPayments.length > 0);
      assert(plagueQuery.consumeCardPayments.every(row => row.payment.resourceCost === 2
        && row.payment.fullCostPaid && row.payment.retainedAfterPayment === 0));
      assert.throws(() => query(product.runtime, withPlague.state, { abilityDefinitionId: plagueId }), /COST_CHOICE_INVALID/);
      controls.push('purchased_plague_three_biomass_requires_two_from_cards');
      assert.equal(hash(state), snapshotHash);
      const checkpointRef = await save('checkpoint-r0.json', { envelope: current.envelope });
      const ref = await save('consume.json', { result, controls, conditionalSevenModelQuote: sevenQuote,
        plagueQuery, originalStateUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const credentials = await product.native.create(roomId, product.authority);
      const before = await product.native.store.loadRoom(roomId);
      const options = query(product.runtime, before.envelope.state);
      const legal = await product.native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
      assert.equal(legal.ok, true, JSON.stringify(legal));
      assert(legal.legalSpace.parameterDomains.some(row => row.actionType === 'set_dark_swarm'));
      const after = await product.native.store.loadRoom(roomId);
      assert.deepEqual(after, before);
      assert.deepEqual(options, (await read(prefix + 'consume.json')).result);
      const ref = await save('successor.json', { actualRevision: after.stateRevision, unchangedRoomAggregate: true,
        currentLegalSpaceHash: legal.legalSpace.legalSpaceHash, actualPlacementStillAvailable: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r0.json' };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      await product.native.create(roomId, product.authority);
      const current = await product.native.store.loadRoom(roomId);
      assert.deepEqual(current.envelope, (await read(prefix + 'checkpoint-r0.json')).envelope);
      assert.deepEqual(query(product.runtime, current.envelope.state), (await read(prefix + 'consume.json')).result);
      const ref = await save('cold-recovery.json', { exactEnvelope: true, exactQueryAfterReopen: true,
        actualRevision: current.stateRevision, committedSacrifices: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'checkpoint-r0.json' };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
