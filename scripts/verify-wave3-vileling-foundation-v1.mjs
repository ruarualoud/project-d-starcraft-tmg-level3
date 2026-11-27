import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { openProduct as openMarkProduct } from './verify-wave3-mark-for-death-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1, completeWave3MeleePoolsV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const output = 'build/ticket-28-zerg-wave3-20261117-v1/vileling-foundation/';
const directory = path.join(root, output);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const recordKey = 'army_units:vileling__zergling_';
const prefix = 'unit:vileling__zergling_/';
const squadronId = prefix + 'squadron-any-phase@1';
const boostId = prefix + 'metabolic-boost-assault-phase@1';
const impactId = prefix + 'devastating-charge-assault-phase@1';
const clawsId = prefix + 'claws-combat-phase@1';
const definitions = [squadronId, boostId, impactId, clawsId];
const ids = ['base', 'boost', 'combat'];
const roomId = id => 'wave3-vileling-foundation-' + id;
const releaseId = id => roomId(id) + '-v1';
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const pieceOf = (state, id) => state.pieces.find(piece => piece.id === id);
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
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
    const manifest = await read(sourceRef); product.resolver.register(manifest);
    return await product.resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
  } finally { product.close(); }
}
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: [squadronId, boostId], includeMelee: true });
}
async function makeScene(context) {
  const original = (await read('build/ticket-28-terran-wave3-20261117-v1/mark-for-death/source/authority.json')).state;
  const setup = createOfficialReleaseRosterStateV2({ context, includeMelee: true,
    characteristicDefinitionIds: [squadronId, boostId], meleeModifierDefinitionIds: [impactId],
    meleeWeaponDefinitionIds: [clawsId], includeImpactAllocation: true,
    includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'))
      .state.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: (await read(output + 'roster-preflight.json')).candidate,
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:armory'],
        units: [{ unitInstanceId: 'target', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] }] },
    } });
  const fields = ['board', 'officialDeploymentGeometryBinding', 'engagementScale', 'armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'officialModelGapTransitPolicy', 'officialMissionSupplyProfile'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(original[key])])), ...setup.state,
    round: 1, phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };
  state.board.tokens = []; state.board.markers = []; state.board.effectMarkers = [];
  const actor = pieceOf(state, 'vileling');
  actor.isOnField = true; actor.isInReserves = false; actor.deploymentStatus = 'hypothetical_snapshot';
  const slots = [{ column: 0, row: 0 }];
  for (let column = 0; column < 4; column++) for (let row = -2; row <= 2; row++) {
    if (column === 0 && row === 0 || column === 3 && Math.abs(row) === 2) continue;
    slots.push({ column, row });
  }
  assert.equal(slots.length, actor.models.length);
  actor.models.forEach((model, index) => Object.assign(model, {
    isOnField: true,
    xInches: 10 - slots[index].column * (model.baseWidthInches + 0.001),
    yInches: 10 + slots[index].row * (model.baseDepthInches + 0.001) }));
  const target = pieceOf(state, 'target');
  const targetX = 10 + Math.round(actor.models[0].baseWidthInches * 500) / 1000
    + Math.round(target.models[0].baseWidthInches * 500) / 1000 + 1.1;
  arrange(target, targetX, 10);
  const coherencyRangesByPieceId = Object.fromEntries(state.officialActionRouteCatalogue.units.map(unit => [
    unit.pieceId, Math.round(unit.movementProfile.horizontalCoherencyInches * 1000) ]));
  const assessments = [];
  let coherency;
  try {
    coherency = declareCoherency(state, { coherencyRangesByPieceId, onAssessment: value => assessments.push(value) });
  } finally {
    await save('coherency-last-probe.json', { coherencyRangesByPieceId, assessments,
      models: state.pieces.map(piece => ({ pieceId: piece.id, models: piece.models.map(model => ({
        id: model.id, x: model.xInches, y: model.yInches, width: model.baseWidthInches, depth: model.baseDepthInches })) })) });
  }
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { scale: 'Standard', mineralBudget: 2000, partialLegalRosters: true,
    phaseAndPositionsDeclared: true, declaredLeadingBaseGapMilliInches: 1100, coherency,
    fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion, '3.95.0');
  const runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const product = registry();
  try {
    const manifest = context.manifest;
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
      snapshot: context.snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
      datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef,
      sourceRevisionRef: manifest.source.sourceRevisionRef, referenceSources: manifest.source.references,
      sourcePolicy: manifest.source.policy, components: { ...manifest.components, rulesRuntime: {
        ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state, scenario: scene.scenario });
    const old = await cached(id + '/authority.json');
    if (old) assert.deepEqual(old, authority); else await save(id + '/authority.json', authority);
  } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
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
  const current = await branch.native.store.loadRoom(roomId(branch.id));
  const file = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(file);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(file, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized', side = 'player1') {
  const result = await branch.native.commit({ roomId: roomId(branch.id), credential: credentials[side],
    operationKey: key, select, parameters, kind });
  await checkpoint(branch);
  return result;
}
async function savePrefixes(branch) {
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= receipts.length; revision++) {
    if (await cached(branch.id + '/checkpoint-r' + revision + '.json')) continue;
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result));
    await save(branch.id + '/checkpoint-r' + revision + '.json', { envelope: result.envelope });
  }
}
function boostParameters(domain) {
  const schema = domain.sourceDomain.parameterSchema;
  return { activeUnitId: 'vileling', paymentCardInstanceIds: schema.paymentCardInstanceIds.enum[0] };
}
function chargeParameters(state) {
  return { leadingModelId: pieceOf(state, 'vileling').models[0].id,
    targets: [{ unitId: 'target', modelId: pieceOf(state, 'target').models[0].id }] };
}
function contactParameters(state) {
  const actor = pieceOf(state, 'vileling'); const target = pieceOf(state, 'target');
  const first = actor.models[0];
  const contactX = Math.round(target.models[0].xInches * 1000)
    - Math.round(target.models[0].baseWidthInches * 500) - Math.round(first.baseWidthInches * 500);
  const delta = contactX - Math.round(first.xInches * 1000);
  return { outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: Math.round(first.yInches * 1000),
    elevation: 'ground', supportTerrainIds: [] }], placements: actor.models.slice(1).map(model => ({
      modelId: model.id, xMilliInches: Math.round(model.xInches * 1000) + delta,
      yMilliInches: Math.round(model.yInches * 1000), elevation: 'ground', supportTerrainIds: [] })) };
}
function impactParameters(domain) {
  return { allocations: domain.sourceDomain.parameterSchema.eligibleModels.map(model => ({
    modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice })) };
}
async function replay(branch) {
  await branch.native.restoreDependencies(roomId(branch.id), branch.authority);
  const before = await branch.native.store.loadRoom(roomId(branch.id));
  const bundle = await branch.native.store.loadReplayBundle(roomId(branch.id));
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let revision = 0; revision <= receipts.length; revision++) {
    const expected = (await read(output + branch.id + '/checkpoint-r' + revision + '.json')).envelope;
    const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
    assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected);
  }
  assert.deepEqual(await branch.native.store.loadRoom(roomId(branch.id)), before);
  return { id: branch.id, receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef,
    contractVersion: 'T28-W3-09-vileling-squadron-metabolic-impact-claws-v1',
  }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await makeScene(context); const runtime = runtimeFor(context, scene.state);
      const actor = pieceOf(scene.state, 'vileling');
      assert.equal(actor.currentModels, 18); assert.equal(actor.currentSupply, 2);
      assert.equal(actor.models.filter(model => !model.isDestroyed).length, 18);
      const projection = runtime.query(scene.state, { queryKind: 'characteristic_status_projection', pieceId: actor.id });
      assert.equal(projection.result.horizontalCoherencyMilliInches, 4000);
      const movement = scene.state.officialActionRouteCatalogue.units.find(unit => unit.pieceId === actor.id).movementProfile;
      assert.equal(movement.currentDeploySpeedInches, 4); assert.equal(movement.singleModelSpeedInches, 8);
      assert.equal(movement.horizontalCoherencyInches, 4);
      const sourceDefinitions = runtime.catalogue.definitions.filter(definition => definitions.includes(definition.definitionId));
      assert.equal(sourceDefinitions.length, 4);
      assert(sourceDefinitions.every(definition => definition.execution.status === 'executable_exact'));
      const impact = runtime.query(scene.state, { queryKind: 'melee_modifiers', pieceId: actor.id }).result.devastatingCharge;
      assert.equal(impact.impactDicePerEligibleModel, 1); assert.equal(impact.hitThreshold, 5);
      const supplyCases = [18, 7, 6, 1, 0].map(currentModels => resolveOfficialCurrentSupplyValueV1({
        unitCardSupplyDataBundle: scene.state.officialUnitCardSupplyDataBundle, recordKey,
        currentModels, isDestroyed: currentModels === 0, rulesOwnedCurrentModelCountRequested: true }));
      assert.deepEqual(supplyCases.map(row => row.currentSupplyValue), [2, 2, 1, 1, 0]);
      const domain = runtime.enumerate(scene.state).parameterDomains.find(row => row.definitionId === boostId);
      assert(domain); assert(domain.sourceDomain.parameterSchema.paymentCardInstanceIds.enum.every(row => row.length > 0));
      const exhausted = structuredClone(scene.state);
      for (const card of exhausted.cardResources.player1) card.readiness = 'exhausted';
      assert(!runtime.enumerate(exhausted).parameterDomains.some(row => row.definitionId === boostId));
      assert.deepEqual(domain.sourceDomain.constraints.useTiming, ['before_action']);
      const invalid = structuredClone(scene.state); delete invalid.officialImpactAllocationPolicy;
      assert.throws(() => runtimeFor(context, invalid), /VILELING_IMPACT_ALLOCATION_POLICY_REQUIRED/);
      await registerScene(context, 'base', scene); await registerScene(context, 'boost', scene);
      const ref = await save('compile.json', { definitions: sourceDefinitions, projection, movement, impact, supplyCases,
        sourceRecord: context.dataset.recordsByKey[recordKey], invalidPaymentAndTimingRejected: true,
        newSemanticAtomCount: 0, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of ['base', 'boost']) {
        const old = await cached(id + '/consumed.json'); if (old) { results.push(old); continue; }
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          await checkpoint(branch);
          if (id === 'boost') await invoke(branch, credentials, 'boost', row => row.definitionId === boostId, boostParameters);
          const beforeRef = id + '/charge-before.json';
          let before = await cached(beforeRef);
          if (!before) { before = { envelope: (await checkpoint(branch)).envelope }; await save(beforeRef, before); }
          const sourceState = before.envelope.state;
          const expectedDice = id === 'boost' ? 2 : 1;
          const domain = branch.runtime.enumerate(sourceState).parameterDomains.find(row => row.actionType === 'charge' && row.pieceId === 'vileling');
          assert(domain); assert.equal(domain.sourceDomain.constraints.chargeDistanceRoll.diceCount, expectedDice);
          const query = branch.runtime.query(sourceState, { queryKind: 'melee_action_preview', actionType: 'charge',
            pieceId: 'vileling', parameters: chargeParameters(sourceState) });
          const roll = await invoke(branch, credentials, 'declare-charge', row => row.domainId === domain.domainId,
            () => chargeParameters(sourceState));
          assert.deepEqual(roll.preview.core.action, query.result.action);
          const rolledRef = id + '/charge-rolled.json';
          let rolled = await cached(rolledRef);
          if (!rolled) { rolled = { envelope: (await checkpoint(branch)).envelope }; await save(rolledRef, rolled); }
          const pending = rolled.envelope.state.pendingAction;
          assert.equal(pending.chargeRolls.length, expectedDice);
          assert.equal(pending.chargeRoll, Math.max(...pending.chargeRolls));
          assert.equal(pending.maxDistanceMilliInches, Math.round((pending.chargePlan.speedInches
            + pending.chargePlan.chargeDistanceModifier + pending.chargeRoll) * 1000));
          if (id === 'boost') {
            const privateAction = branch.runtime.instantiate(sourceState, domain, chargeParameters(sourceState)).action;
            const privateResult = branch.runtime.apply(sourceState, privateAction, { chanceReveals: [1, 6] });
            assert.equal(privateResult.state.pendingAction.chargeRoll, 6);
            await save(id + '/fixed-private-max.json', { chargeRolls: [1, 6],
              pending: privateResult.state.pendingAction, privateDeclaredControl: true, nativeRngUnmodified: true });
            assert(!branch.runtime.enumerate(sourceState).parameterDomains.some(row => row.definitionId === boostId));
          }
          const parameters = contactParameters(sourceState);
          await invoke(branch, credentials, 'resolve-charge', row => row.actionType === 'resolve_charge', () => parameters);
          const impactRef = id + '/impact-ready.json';
          let ready = await cached(impactRef);
          if (!ready) { ready = { envelope: (await checkpoint(branch)).envelope }; await save(impactRef, ready); }
          assert.equal(ready.envelope.state.pendingAction.sourceDefinitionId, impactId);
          assert.equal(ready.envelope.state.pendingAction.baseHitThreshold, 5);
          const impactDomain = branch.runtime.enumerate(ready.envelope.state).parameterDomains.find(row => row.actionType === 'resolve_impact');
          assert(impactDomain);
          const allocations = impactParameters(impactDomain);
          const impactQuery = branch.runtime.query(ready.envelope.state, { queryKind: 'melee_action_preview',
            actionType: 'resolve_impact', pieceId: 'vileling', parameters: allocations });
          const impactCommit = await invoke(branch, credentials, 'impact', row => row.domainId === impactDomain.domainId, () => allocations);
          assert.deepEqual(impactCommit.preview.core.action, impactQuery.result.action);
          await completeWave3MeleePoolsV1({ directory: path.join(directory, id), native: branch.native,
            runtime: branch.runtime, roomId: roomId(id), credentials, operationPrefix: 'impact-pool', selectPoolParameters: poolParameters });
          const current = await checkpoint(branch);
          const event = current.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'impact_damage');
          assert(event); assert.equal(event.stages.hitThreshold, 5); assert.equal(event.stages.damagePerDie, 1);
          assert.equal(pieceOf(current.envelope.state, 'vileling').currentModels, 18);
          assert.equal(pieceOf(current.envelope.state, 'vileling').currentSupply, 2);
          assert(!branch.runtime.enumerate(current.envelope.state).parameterDomains.some(row => row.definitionId === boostId));
          const result = { id, revision: current.stateRevision, chargeRolls: pending.chargeRolls,
            chargeRoll: pending.chargeRoll, speed: pending.chargePlan.speedInches,
            impactEligible: allocations.allocations, event, queryEqualsNative: true, modelCalls: 0 };
          await save(id + '/consumed.json', result); results.push(result);
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', results); return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      for (const id of ['base', 'boost']) {
        const branch = await product.branch(id);
        try {
          const credentials = await branch.native.create(roomId(id), branch.authority);
          await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'vileling', () => ({}));
          const after = await checkpoint(branch);
          assert.equal(after.envelope.state.activeSideKey, 'player2');
          assert(!after.envelope.state.pendingAction);
          if (id === 'boost') {
            const state = structuredClone(after.envelope.state); state.phase = 'combat'; state.activeSideKey = 'player1';
            state.phaseFirstActorByRound['1:combat'] = { round: 1, phase: 'combat', chosenFirstActorSideKey: 'player1' };
            state.players.player1.passedPhases.combat = false;
            for (const piece of state.pieces) piece.activatedPhases.combat = false;
            delete state.selectedRosterActivationWindow;
            const scene = { state: refreshOfficialReleaseRosterDerivedStateV2({ context: branch.context, state }),
              scenario: { sourceCheckpointRef: output + id + '/checkpoint-r' + after.stateRevision + '.json',
                actualChargeAndImpactPositionsPreserved: true, declaredCombatPhase: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
            await registerScene(branch.context, 'combat', scene);
          }
          await savePrefixes(branch);
        } finally { branch.close(); }
      }
      const branch = await product.branch('combat');
      try {
        const credentials = await branch.native.create(roomId(branch.id), branch.authority);
        await checkpoint(branch);
        const sourceState = branch.authority.state;
        const domain = branch.runtime.enumerate(sourceState).parameterDomains.find(row => row.actionType === 'fight' && row.pieceId === 'vileling');
        assert(domain);
        const dice = domain.sourceDomain.constraints.declineCloseRanksAttackDice;
        assert(dice > 0);
        const parameters = { closeRanksMode: 'decline', allocations: [{ targetUnitId: 'target', dice }],
          surgeTargetUnitId: null, criticalTargetUnitId: null };
        const query = branch.runtime.query(sourceState, { queryKind: 'melee_action_preview', actionType: 'fight',
          pieceId: 'vileling', parameters });
        const committed = await invoke(branch, credentials, 'claws', row => row.domainId === domain.domainId, () => parameters);
        assert.deepEqual(committed.preview.core.action, query.result.action);
        await completeWave3MeleePoolsV1({ directory: path.join(directory, 'combat'), native: branch.native,
          runtime: branch.runtime, roomId: roomId('combat'), credentials, operationPrefix: 'claws-pool', selectPoolParameters: poolParameters });
        await invoke(branch, credentials, 'finish', row => row.actionType === 'finish_activation' && row.pieceId === 'vileling', () => ({}));
        const after = await checkpoint(branch);
        const event = after.envelope.state.log.flatMap(row => row.events || []).find(row => row.type === 'close_combat_attack');
        assert(event); assert.equal(event.weaponName, 'Claws');
        const cleanup = branch.runtime.lifecycle(after.envelope.state, { eventKind: 'cleanup_and_refresh' });
        assert(!pieceOf(cleanup.state, 'vileling').officialAbilityEffects.some(effect => effect.sourceDefinitionId === boostId));
        await save('combat/cleanup-product-callback.json', cleanup);
        await savePrefixes(branch);
        const ref = await save('successor.json', { combatRevision: after.stateRevision, event,
          clawsDice: dice, boostExpiryCheckedViaProductCallback: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const current = [];
      for (const id of ids) { const branch = await product.branch(id); try { current.push(await replay(branch)); } finally { branch.close(); } }
      const legacy = [];
      const oldProduct = await openMarkProduct();
      try {
        for (const id of ['source', 'melee']) {
          const file = path.join(root, 'build/ticket-28-terran-wave3-20261117-v1/mark-for-death', id, 'room.sqlite');
          const hash = async () => createHash('sha256').update(await fs.readFile(file)).digest('hex');
          const beforeHash = await hash(); const branch = await oldProduct.branch(id);
          try {
            const oldRoomId = 'wave3-mark-for-death-' + id;
            await branch.native.restoreDependencies(oldRoomId, branch.authority);
            const bundle = await branch.native.store.loadReplayBundle(oldRoomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
            for (let revision = 0; revision <= receipts.length; revision++) {
              const expected = await read('build/ticket-28-terran-wave3-20261117-v1/mark-for-death/' + id + '/checkpoint-r' + revision + '.json');
              const result = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, revision) });
              assert.equal(result.ok, true, JSON.stringify(result)); assert.deepEqual(result.envelope, expected.envelope);
            }
            legacy.push({ id, runtimeVersion: branch.runtime.descriptor.runtimeVersion,
              receipts: receipts.length, checkpoints: receipts.length + 1, exact: true, originalArtifactUnchanged: true });
          } finally { branch.close(); }
          assert.equal(await hash(), beforeHash);
        }
      } finally { oldProduct.close(); }
      const ref = await save('cold-recovery.json', { current, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify(gate));
}
export { openProduct, sourceProduct, runtimeFor, makeScene };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
