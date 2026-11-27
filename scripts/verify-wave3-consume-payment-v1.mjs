import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { resolveOfficialCurrentSupplyValueV1 } from '../packages/rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { inspectOfficialSingleModelRemovalChoicesV1 } from '../packages/rule-atoms/official-single-model-removal-choice-v1.mjs';
import { projectOfficialDestroyedUnitConsequencesV1 } from '../packages/rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs';
import { applyOfficialUnitDestructionMutationV1 } from '../packages/rule-atoms/official-unit-destruction-lifecycle-rules-executor-v1.mjs';
import { readOfficialAttackTargetReactionParentV1 } from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/consume-payment/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const tokenSourceRef = 'build/ticket-28-zerg-wave3-20261117-v1/dark-swarm-reaction/source/checkpoint-r6.json';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const darkId = 'unit:defiler/dark-swarm-assault-phase@1';
const consumeId = 'unit:defiler/consume-any-phase@1';
const ids = ['multi', 'other-source', 'self-source', 'last-target'];
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds: [squadronId], includeRanged: true, includeTargetReactions: true,
  includePrecisionChoices: true, includeArmourChoices: true });
const query = (runtime, state) => runtime.query(state, { queryKind: 'consume_payment_options',
  sourcePieceId: 'defiler', abilityDefinitionId: darkId });
const roomId = id => 'wave3-consume-payment-' + id;
const releaseId = id => roomId(id) + '-source-v1';
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
async function sceneFor(context) {
  const saved = (await read(tokenSourceRef)).envelope.state;
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const unit = (id, key) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: [squadronId],
    reactionDefinitionIds: [darkId], includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    includeGestateDarkSwarm: true, includeDarkSwarmLifecycle: true, includeBattlefieldDisplacement: true,
    includeConsumePayment: true, legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler'), unit('defiler2', 'defiler'), unit('vileling', 'vileling__zergling_')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: [
          'tactical_cards:armory', 'tactical_cards:factory__tech_lab_'],
        units: [unit('shooter', 'goliath'), unit('shooter2', 'goliath')] },
    } });
  const state = structuredClone(saved);
  for (const key of ['officialConsumePaymentSourceBundle', 'officialConsumePaymentPolicy', 'officialFaqReactionPolicy']) {
    assert(setup.state[key], 'real roster factory did not produce ' + key);
    state[key] = structuredClone(setup.state[key]);
  }
  // A declared isolated casualty/position snapshot. The two tokens retain their
  // actual factory provenance and original placement receipts; no move is faked.
  const squad = piece(state, 'vileling'), step = squad.models[0].baseWidthInches + 0.1;
  squad.models.forEach((model, i) => {
    const angle = Math.max(0, i - 1) * Math.PI / 3;
    Object.assign(model, { isDestroyed: i >= 7, isOnField: i < 7,
      xInches: Math.round((17.7 + (i ? Math.cos(angle) * step : 0)) * 1000) / 1000,
      yInches: Math.round((26 + (i ? Math.sin(angle) * step : 0)) * 1000) / 1000 });
  });
  squad.destroyedModelIds = squad.models.filter(model => model.isDestroyed).map(model => model.id).sort();
  squad.currentModels = 7;
  squad.currentSupply = resolveOfficialCurrentSupplyValueV1({ unitCardSupplyDataBundle: state.officialUnitCardSupplyDataBundle,
    recordKey: squad.officialUnitRecordKey, currentModels: 7, isDestroyed: false,
    rulesOwnedCurrentModelCountRequested: true }).currentSupplyValue;
  arrange(piece(state, 'defiler2'), 14, 30);
  Object.assign(state, { phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
  state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  return { state: refreshOfficialReleaseRosterDerivedStateV2({ context, state }), scenario: {
    derivedFrom: tokenSourceRef, retainsActualTokenPlacement: true, declaredPositionsAndSevenModelCasualtySnapshot: true,
    partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  if (await cached(id + '/authority.json')) return;
  const runtime = runtimeFor(context, scene.state), runtimeRef = await save(id + '/runtime.json', runtime.descriptor);
  const m = context.manifest, product = registry();
  try {
    product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset, snapshot: context.snapshot,
      sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef,
      sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references, sourcePolicy: m.source.policy,
      components: { ...m.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
    const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'area_ability_component' });
    await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, ...scene }));
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
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const prior = await cached(name);
  if (prior) assert.deepEqual(prior.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function invoke(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const result = await branch.native.commit({ roomId: branch.roomId, credential: credentials[current.envelope.state.activeSideKey],
    operationKey: key, select, parameters, kind });
  await checkpoint(branch); return result;
}
async function completeCase(product, id) {
  const prior = await cached(id + '/result.json'); if (prior) return prior;
  const branch = await product.branch(id);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    const victimId = id === 'multi' ? 'vileling' : id === 'self-source' ? 'defiler' : 'defiler2';
    const targetId = id === 'last-target' ? 'defiler2' : 'vileling';
    const declared = await invoke(branch, credentials, 'declare', row => row.pieceId === 'shooter' && row.weaponName === 'Autocannon',
      () => ({ targetUnitId: targetId }));
    assert.equal(declared.preview.core.action.actionType, 'declare_ranged_attack_before_target_reaction');
    for (let step = 0; step < 32; step++) {
      const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
      const parent = readOfficialAttackTargetReactionParentV1(state), menu = branch.runtime.enumerate(state);
      if (!parent && !state.pendingCurrentProductRangedCasualtyChoice && !branch.runtime.precisionChoices?.hasPending(state)) break;
      if (state.pendingOfficialReactionWindow) {
        const using = state.activeSideKey === 'player1' && state.pendingOfficialReactionWindow.triggerKind === 'attack_target_selected';
        const domain = menu.parameterDomains.find(row => using ? row.sourceDomain?.sourceInstanceId === 'defiler'
          && row.sourceDomain.definitionId === darkId && row.sourceDomain.parameterSchema.sacrificePieceId?.const === victimId
          : row.actionType === 'pass_reaction_family_window');
        assert(domain, 'required actual Consume/use or pass domain missing');
        const sourceSchema = domain.sourceDomain?.parameterSchema;
        const parameters = using ? { paymentCardInstanceIds: sourceSchema.paymentCardInstanceIds.const,
          sacrificePieceId: victimId, sacrificeModelId: sourceSchema.sacrificeModelId.enum[0] } : {};
        if (using && !await cached(id + '/payment-before.json')) {
          await save(id + '/payment-before.json', { envelope: current.envelope, domain, parameters });
          assert.throws(() => branch.runtime.instantiate(state, domain, { ...parameters, resourceCost: 0 }), /CONSUME|PARAMETER/);
          assert.throws(() => branch.runtime.instantiate(state, domain, { ...parameters, sacrificePieceId: 'shooter' }), /CONSUME|PARAMETER/);
          assert.throws(() => branch.runtime.instantiate(state, domain, { ...parameters, sacrificeModelId: 'not-a-model' }), /CONSUME|PARAMETER/);
          const stale = structuredClone(state);
          piece(stale, victimId).damageMarker += 1;
          assert.throws(() => branch.runtime.instantiate(stale, domain, parameters), /PARENT|STALE|INVALID/);
        }
        const result = await invoke(branch, credentials, 'reaction-r' + current.stateRevision,
          row => row.domainId === domain.domainId, () => parameters);
        if (using) {
          const paidState = (await branch.native.store.loadRoom(branch.roomId)).envelope.state;
          const receipt = paidState.officialConsumePaymentHistory.at(-1);
          assert.equal(result.preview.core.chanceTicket, null);
          assert.equal(receipt.modelsAfter, receipt.modelsBefore - 1);
          assert.deepEqual(receipt.exhaustedCardInstanceIds, []);
          assert.deepEqual(paidState.cardResources, state.cardResources);
          assert.equal(paidState.officialConsumePaymentHistory.length, 1);
          assert.equal(receipt.generatedFromModel, 1); assert.equal(receipt.retainedAfterPayment, 0);
          assert.equal(receipt.supplyAfter, id === 'multi' ? 1 : 0);
          if (id === 'multi') { assert.equal(receipt.supplyBefore, 2); assert.equal(receipt.modelsAfter, 6); }
          const losses = paidState.supplyLossLedger.entries.filter(row => row.unitId === victimId);
          assert(losses.length > 0, 'Consume supply loss was not recorded');
          assert(losses.every(row => row.scoreable === false), 'Consume must not become opponent combat credit');
          if (id !== 'multi') {
            assert.equal(piece(paidState, victimId).destructionLifecycleSettled, true);
            assert(!paidState.board.tokens.some(token => token.createdByPieceId === victimId));
            assert(paidState.officialBattlefieldAssetBindings.filter(row => row.sourcePieceId === victimId).every(row => row.consumed));
          }
          await save(id + '/payment.json', { receipt, events: result.result, losses,
            chanceTicket: null, duplicateApplyHandledByRoom: true, modelCalls: 0 });
        }
      } else if (menu.parameterDomains.length) {
        const domain = menu.parameterDomains[0], schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
        const field = schema.required[0], spec = schema[field] || schema.properties?.[field];
        assert(spec, 'native choice field must exist in actual schema');
        const value = field === 'casualtyModelIds' ? spec.items.enum.slice(0, spec.minItems) : spec.items ? [] : spec.enum[0];
        await invoke(branch, credentials, 'pool-r' + current.stateRevision, row => row.domainId === domain.domainId, () => ({ [field]: value }));
      } else {
        assert.equal(menu.candidates.length, 1);
        await invoke(branch, credentials, 'continue-r' + current.stateRevision, () => true, undefined, 'finite');
      }
    }
    let after = await branch.native.store.loadRoom(branch.roomId), state = after.envelope.state;
    assert.equal(readOfficialAttackTargetReactionParentV1(state), null);
    const event = state.log.flatMap(row => row.events || []).find(row => row.pieceId === 'shooter' && row.targetId === targetId
      && row.type === (id === 'last-target' ? 'ranged_batch_skipped' : 'ranged_attack'));
    assert(event, 'attack or skipped batch must reach actual Native successor');
    if (id === 'last-target') assert.equal(event.diceRolled, false);
    else assert.equal(event.stages.evade.eligible, true, 'paid effect must survive source/token destruction');
    if (state.pendingCurrentProductRangedSequence) {
      await invoke(branch, credentials, 'finish-sequence', row => row.action.actionType === 'finish_ranged_attack_sequence', undefined, 'finite');
      after = await branch.native.store.loadRoom(branch.roomId); state = after.envelope.state;
    }
    assert.equal(piece(state, 'shooter').activatedPhases.assault, true);
    assert.equal(state.officialConsumePaymentHistory.length, 1);
    const result = { id, victimId, targetId, revision: after.stateRevision, actualEvent: event,
      singlePayment: true, duplicateApplyVerified: true, attackAndActivationSuccessor: true, modelCalls: 0 };
    await save(id + '/result.json', result); return result;
  } finally { branch.close(); }
}
async function replay(native, id, checkpointPrefix) {
  const before = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.envelope, (await read(checkpointPrefix + i + '.json')).envelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), before);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const gate = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Consume-Actual-Payment-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.116.0');
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === consumeId).execution.status, 'executable_exact');
      assert.equal(runtime.descriptor.consumePaymentQuery.sacrificeConsumerReady, true);
      const options = query(runtime, scene.state);
      assert.deepEqual(options.sacrifices.map(row => row.pieceId), ['defiler', 'defiler2', 'vileling']);
      const victim = options.sacrifices.find(row => row.pieceId === 'vileling');
      assert.equal(victim.currentSupply, 2); assert.equal(victim.remainingSupply, 1);
      // Same Native engagement inspector must preserve a contacting model when
      // non-contacting models are still available for any-source casualties.
      const engaged = structuredClone(scene.state), squad = piece(engaged, 'vileling');
      const model = squad.models[1], enemy = piece(engaged, 'shooter');
      arrange(enemy, model.xInches + model.baseWidthInches / 2 + enemy.models[0].baseWidthInches / 2, model.yInches);
      const selection = inspectOfficialSingleModelRemovalChoicesV1(engaged, squad);
      assert.equal(selection.selectionContract.orderedRemovalRequired, true);
      assert(!selection.modelIds.includes(model.id));
      // The legacy identity `id` remains supported by the same destruction kernel.
      const legacy = structuredClone(scene.state), dead = piece(legacy, 'defiler2');
      Object.assign(dead, { currentModels: 0, currentSupply: 0, isDestroyed: true, isOnField: false,
        destroyedModelIds: dead.models.map(row => row.id) });
      dead.models.forEach(row => Object.assign(row, { isDestroyed: true, isOnField: false }));
      legacy.board.tokens = legacy.board.tokens.map(row => ({ ...row, id: row.tokenId }));
      const projection = projectOfficialDestroyedUnitConsequencesV1({ state: legacy, pieceId: dead.id });
      applyOfficialUnitDestructionMutationV1(legacy, projection.mutation);
      assert.equal(piece(legacy, dead.id).destructionLifecycleSettled, true);
      assert(!legacy.board.tokens.some(row => row.createdByPieceId === dead.id));
      for (const id of ids) await registerScene(context, id, scene);
      const ref = await save('compile.json', { runtime: runtime.descriptor, options, engagedSelection: selection,
        legacyDefaultTokenIdentityPreserved: true, componentCompleteClaimed: false, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'multi/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const result = await completeCase(product, 'multi');
      const ref = await save('consume.json', result);
      return { evidenceRef: ref, checkpointRef: prefix + 'multi/checkpoint-r' + result.revision + '.json' };
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ids.slice(1)) cases.push(await completeCase(product, id));
      const ref = await save('successor.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const branch = await product.branch(id);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          cases.push({ id, ...await replay(branch.native, branch.roomId, prefix + id + '/checkpoint-r') });
        } finally { branch.close(); }
      }
      // Same changed ranged successor on an unchanged card-paid 3.114 room.
      const previous = 'build/ticket-28-zerg-wave3-20261117-v1/dark-swarm-reaction/size1-use-faq13/';
      const authority = await read(previous + 'authority.json');
      product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
      const context = await product.resolver.resolve({ releaseId: authority.releaseId, purpose: 'area_ability_component' });
      const runtime = runtimeFor(context, authority.state);
      assert.deepEqual(runtime.descriptor, await read(previous + 'runtime.json'));
      const native = openWave3EngineeringRoomV1({ directory: path.join(root, previous), filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      let old;
      try {
        await native.restoreDependencies('wave3-dark-swarm-reaction-size1-use-faq13', authority);
        old = await replay(native, 'wave3-dark-swarm-reaction-size1-use-faq13', previous + 'checkpoint-r');
      } finally { native.close(); }
      const quotes = 'build/ticket-28-zerg-wave3-20261117-v1/consume-payment-quotes/';
      const oldQuoteAuthority = await read(quotes + 'authority.json');
      const quoteRuntime = createOfficialCharacteristicStatusComponentRuntimeV2({ context,
        spatialState: oldQuoteAuthority.state, definitionIds: [squadronId] });
      assert.deepEqual(quoteRuntime.descriptor, await read(quotes + 'runtime.json'));
      const quoteState = (await read(quotes + 'checkpoint-r0.json')).envelope.state;
      assert.deepEqual(query(quoteRuntime, quoteState), (await read(quotes + 'consume.json')).result);
      const ref = await save('cold-recovery.json', { cases, oldCardPayment: old,
        oldQuoteDescriptorAndQueryExact: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: gate.status, passed: Object.keys(gate.passed), failures: gate.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
