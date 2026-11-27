import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { root, arrange, declareCoherency } from './verify-wave3-lethal-hologram-v1.mjs';
import { sourceProduct } from './verify-wave3-gestate-dark-swarm-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { readOfficialAttackTargetReactionParentV1 } from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const prefix = 'build/ticket-28-zerg-wave3-20261118-v1/dark-swarm-template/';
const directory = path.join(root, prefix);
const sourceRef = 'content/source-releases/wave3-20261116-deep-tunnel-geometry-release-v2.json';
const baseRef = 'build/ticket-28-zerg-wave3-20261118-v1/consume-payment/multi/authority.json';
const squadronId = 'unit:vileling__zergling_/squadron-any-phase@1';
const modeId = 'unit:siege_tank/mode-transformation-movement-phase@1';
const darkId = 'unit:defiler/dark-swarm-assault-phase@1';
const definitionIds = [squadronId, modeId];
const cases = ['card', 'pass', 'consume-model', 'consume-self', 'consume-last'];
const survivorRepair = process.argv.includes('--survivor-repair');
const branchIdFor = id => survivorRepair && id.startsWith('consume-') ? id + '-survivors' : id;
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const piece = (state, id) => state.pieces.find(row => row.id === id);
const roomId = id => 'wave3-dark-swarm-template-' + id;
const releaseId = id => roomId(id) + '-source-v1';
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
  definitionIds, includeRanged: true, includeTargetReactions: true, includeTemplateAttacks: true,
  includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true });
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
  const prior = (await read(baseRef)).state;
  const original = (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state;
  const template = (await read('build/ticket-28-wave2-capabilities-20261113-v1/tank-template-attack/authority.json'))
    .state.officialBlastTemplateGeometryAsset;
  const unit = (id, key, upgrades = []) => ({ unitInstanceId: id, recordKey: 'army_units:' + key,
    compositionKind: 'small', upgrades });
  const setup = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitionIds,
    reactionDefinitionIds: [darkId], includeCharacteristicConsumers: true, canonicalResourceTypes: true,
    includeGestateDarkSwarm: true, includeDarkSwarmLifecycle: true, includeBattlefieldDisplacement: true,
    includeConsumePayment: true, consumePaymentScope: 'numeric_and_template_attack_target_reaction',
    blastTemplateGeometryAsset: template, legacyDisclosurePolicy: original.officialRosterDisclosureDataBundle,
    candidatesBySide: {
      player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:zagara_s_swarm', tacticalCardRecordKeys: [
          'tactical_cards:accelerating_creep', 'tactical_cards:spawning_pool', 'tactical_cards:defiler_mound'],
        units: [unit('defiler', 'defiler'), unit('defiler2', 'defiler'), unit('vileling', 'vileling__zergling_')] },
      player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
        factionRecordKey: 'tactical_cards:terran_armed_forces', tacticalCardRecordKeys: ['tactical_cards:factory__tech_lab_'],
        units: [unit('tank-1', 'siege_tank', [{ upgradeName: 'Mode Transformation' }])] },
    } });
  let state = { ...structuredClone(prior), ...setup.state,
    board: structuredClone(prior.board), officialBattlefieldAssetBindings: structuredClone(prior.officialBattlefieldAssetBindings) };
  state.pieces = state.pieces.map(row => row.sideKey === 'player1' ? structuredClone(piece(prior, row.id)) : row);
  arrange(piece(state, 'tank-1'), 30, 20);
  const squad = piece(state, 'vileling'), secondary = piece(state, 'defiler2');
  const rightEdge = Math.max(...squad.models.filter(row => row.isOnField && !row.isDestroyed)
    .map(row => row.xInches + row.baseWidthInches / 2));
  arrange(secondary, Math.round((rightEdge + secondary.models[0].baseWidthInches / 2 + 0.1) * 1000) / 1000, 26);
  Object.assign(state, { phase: 'movement', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
  state.phaseFirstActorByRound['1:movement'] = { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player2' };
  declareCoherency(state);
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
    missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtimeFor(context, state).descriptor.runtimeHash });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, scenario: { derivedFrom: baseRef, retainsActualDarkSwarmPlacements: true,
    declaredRosterSubstitutionAndPositions: true, actualTankModeNotYetApplied: true,
    partialLegalRosters: true, fullRound: false, fullMatch: false, modelCalls: 0 } };
}
async function registerScene(context, id, scene) {
  const runtime = runtimeFor(context, scene.state);
  assert.equal(runtime.descriptor.runtimeVersion,
    scene.state.officialConsumePaymentPolicy.templateAffectedModelsPolicy ? '3.118.0' : '3.117.0');
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
    return { authority, context, runtime, native, id, roomId: roomId(id), close: () => native.close() };
  } };
}
async function checkpoint(branch) {
  const current = await branch.native.store.loadRoom(branch.roomId), name = branch.id + '/checkpoint-r' + current.stateRevision + '.json';
  const old = await cached(name);
  if (old) assert.deepEqual(old.envelope, current.envelope); else await save(name, { envelope: current.envelope });
  return current;
}
async function commit(branch, credentials, key, select, parameters, kind = 'parameterized') {
  const current = await branch.native.store.loadRoom(branch.roomId);
  const result = await branch.native.commit({ roomId: branch.roomId,
    credential: credentials[current.envelope.state.activeSideKey], operationKey: key, select, parameters, kind });
  await checkpoint(branch); return result;
}
function attackParameters(state, id) {
  const targetId = id === 'consume-last' ? 'defiler2' : 'vileling';
  return { primaryTargetUnitId: targetId, primaryTargetModelId: piece(state, targetId).models[0].id };
}
async function runCase(product, id) {
  const branchId = branchIdFor(id), prior = await cached(branchId + '/result.json');
  const branch = await product.branch(branchId);
  try {
    const credentials = await branch.native.create(branch.roomId, branch.authority); await checkpoint(branch);
    if (prior) return await finishActivation(branch, credentials, prior);
    const parameters = attackParameters(branch.authority.state, id);
    const before = await read(prefix + branchId + '/checkpoint-r0.json');
    const currentBeforeQuery = await branch.native.store.loadRoom(branch.roomId);
    const query = branch.runtime.query(before.envelope.state, { queryKind: 'blast_template_attack_preview', pieceId: 'tank-1', parameters });
    assert.deepEqual(await branch.native.store.loadRoom(branch.roomId), currentBeforeQuery);
    const declared = await commit(branch, credentials, 'declare', row => row.pieceId === 'tank-1' && row.actionType === 'blast_template_attack',
      () => parameters);
    assert.deepEqual(declared.preview.core.action, query.result.action);
    await save(branchId + '/declaration-query.json', query);
    for (let step = 0; step < 40; step++) {
      const current = await branch.native.store.loadRoom(branch.roomId), state = current.envelope.state;
      if (!readOfficialAttackTargetReactionParentV1(state) && !branch.runtime.templateAttack.hasPending(state)
        && !branch.runtime.precisionChoices.hasPending(state)) break;
      const menu = branch.runtime.enumerate(state);
      if (state.pendingOfficialReactionWindow) {
        const using = state.activeSideKey === 'player1' && state.pendingOfficialReactionWindow.triggerKind === 'attack_target_selected'
          && id !== 'pass';
        const sacrifice = id === 'consume-model' ? 'vileling' : id === 'consume-self' ? 'defiler' : 'defiler2';
        const domain = menu.parameterDomains.find(row => {
          if (!using) return row.actionType === 'pass_reaction_family_window';
          const d = row.sourceDomain;
          if (d?.definitionId !== darkId || d.sourceInstanceId !== 'defiler') return false;
          return id === 'card' ? !d.parameterSchema.sacrificePieceId
            : d.parameterSchema.sacrificePieceId?.const === sacrifice;
        });
        assert(domain, 'required template reaction selection missing');
        const schema = domain.sourceDomain?.parameterSchema;
        const selected = using ? { paymentCardInstanceIds: schema.paymentCardInstanceIds.const,
          ...(id === 'card' ? {} : { sacrificePieceId: sacrifice,
            sacrificeModelId: id === 'consume-model' ? parameters.primaryTargetModelId : schema.sacrificeModelId.enum[0] }) } : {};
        const value = await commit(branch, credentials, 'reaction-r' + current.stateRevision,
          row => row.domainId === domain.domainId, () => selected);
        assert.equal(value.preview.core.chanceTicket, null);
      } else if (menu.parameterDomains.length) {
        const domain = menu.parameterDomains[0], schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
        const key = schema.required[0], spec = schema[key] || schema.properties?.[key];
        assert(spec, 'required native field absent from schema');
        const val = key === 'casualtyModelIds' ? spec.items.enum.slice(0, spec.minItems) : spec.items ? [] : spec.enum[0];
        await commit(branch, credentials, 'choice-r' + current.stateRevision,
          row => row.domainId === domain.domainId, () => ({ [key]: val }));
      } else {
        assert.equal(menu.candidates.length, 1, 'native template successor must be unambiguous');
        await commit(branch, credentials, 'continue-r' + current.stateRevision, () => true, undefined, 'finite');
      }
    }
    const after = await branch.native.store.loadRoom(branch.roomId), state = after.envelope.state;
    assert.equal(readOfficialAttackTargetReactionParentV1(state), null);
    assert.equal(branch.runtime.templateAttack.hasPending(state), false);
    assert.equal(branch.runtime.precisionChoices.hasPending(state), false);
    const events = state.log.slice(branch.authority.state.log.length).flatMap(row => row.events || []);
    const attacks = events.filter(row => row.type === 'ranged_attack' && row.pieceId === 'tank-1');
    const skipped = events.filter(row => row.type === 'blast_template_batch_skipped');
    assert(attacks.some(row => row.targetId !== parameters.primaryTargetUnitId), 'spillover must resolve even after primary model removal');
    if (id === 'consume-last') {
      assert(skipped.some(row => row.targetId === 'defiler2'));
      assert(!attacks.some(row => row.targetId === 'defiler2'));
    } else {
      const main = attacks.find(row => row.targetId === 'vileling');
      assert(main); assert.equal(main.stages.evade.eligible, id !== 'pass');
      // Seven original bases fit wholly in the five-inch template. Consume
      // removes the declared model: six remaining + the frozen BT+4 modifier.
      assert.equal(main.stages.hit.dice, id === 'consume-model' ? 10 : 11);
    }
    const payments = state.officialConsumePaymentHistory || [];
    assert.equal(payments.length, id.startsWith('consume-') ? 1 : 0);
    if (id === 'consume-self') {
      assert.equal(piece(state, 'defiler').isDestroyed, true);
      assert(!state.board.tokens.some(token => token.createdByPieceId === 'defiler'));
    }
    assert.equal(piece(state, 'tank-1').activatedPhases.assault, true);
    const result = { id, revision: after.stateRevision, parameters, attacks, skipped,
      preservedTemplateDeclaration: true, paymentCount: payments.length, modelCalls: 0 };
    await save(branchId + '/result-before-activation-finish.json', result);
    return await finishActivation(branch, credentials, result);
  } finally { branch.close(); }
}
async function finishActivation(branch, credentials, result) {
  let current = await branch.native.store.loadRoom(branch.roomId);
  const menu = branch.runtime.enumerate(current.envelope.state);
  const finish = menu.parameterDomains.find(row => row.actionType === 'finish_activation' && row.pieceId === 'tank-1');
  if (finish) {
    await commit(branch, credentials, 'finish-attack-activation', row => row.domainId === finish.domainId, () => ({}));
    current = await branch.native.store.loadRoom(branch.roomId);
  }
  assert.equal(current.envelope.state.activeSideKey, 'player1');
  assert.equal(current.envelope.state.selectedRosterActivationWindow, undefined);
  const value = { ...result, branchId: branch.id, revision: current.stateRevision, nextPlayerCanActivate: true };
  await save(branch.id + '/result.json', value); return value;
}
async function replay(native, id, base) {
  const current = await native.store.loadRoom(id), bundle = await native.store.loadReplayBundle(id);
  const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
  for (let i = 0; i <= receipts.length; i++) {
    const result = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, i) });
    assert.equal(result.ok, true, JSON.stringify(result));
    let saved;
    try { saved = await read(base + i + '.json'); }
    catch (error) { if (error.code !== 'ENOENT' || i !== 0) throw error; }
    assert.deepEqual(result.envelope, saved?.envelope || bundle.initialEnvelope);
  }
  assert.deepEqual(await native.store.loadRoom(id), current);
  return { receipts: receipts.length, checkpoints: receipts.length + 1, exact: true };
}
async function main() {
  await fs.mkdir(directory, { recursive: true });
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport: 'createOfficialReleaseRosterStateV2', sourceRef, contractVersion: 'T28-W3-09-Dark-Swarm-Template-Consume-v1' }, steps: [
    { name: 'compile', repairRef, openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context), runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.118.0');
      assert.equal(scene.state.officialConsumePaymentPolicy.version, '1.2.0');
      assert.equal(runtime.templateAttack.descriptor.coveragePreservedAcrossTargetReaction, true);
      await registerScene(context, 'source', scene);
      const ref = await save('compile.json', { runtime: runtime.descriptor,
        template: scene.state.officialBlastTemplateGeometryAsset, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: prefix + 'source/authority.json' };
    } },
    { name: 'consume', repairRef, openProduct, check: async product => {
      const source = await product.branch('source');
      try {
        const credentials = await source.native.create(source.roomId, source.authority); await checkpoint(source);
        await commit(source, credentials, 'mode', row => row.abilityName === 'Mode Transformation', row => ({
          activeUnitId: 'tank-1', paymentCardInstanceIds: row.sourceDomain.parameterSchema.paymentCardInstanceIds.enum[0] }));
        await commit(source, credentials, 'finish-mode', row => row.actionType === 'finish_activation'
          && row.pieceId === 'tank-1', () => ({}));
        const current = await source.native.store.loadRoom(source.roomId);
        assert(piece(current.envelope.state, 'tank-1').statuses.some(row => row.statusName === 'siege_mode'));
        for (const id of cases) {
          if (await cached(id + '/authority.json')) continue;
          const state = structuredClone(current.envelope.state);
          Object.assign(state, { phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
          state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
          if (id === 'consume-last') {
            arrange(piece(state, 'defiler2'), 18.5, 26);
            const squad = piece(state, 'vileling');
            const leftEdge = Math.min(...squad.models.filter(row => row.isOnField && !row.isDestroyed)
              .map(row => row.xInches - row.baseWidthInches / 2));
            const delta = 18.5 + piece(state, 'defiler2').models[0].baseWidthInches / 2 + 0.1 - leftEdge;
            squad.models.forEach(model => { model.xInches = Math.round((model.xInches + delta) * 1000) / 1000; });
            declareCoherency(state);
          }
          await registerScene(source.context, id, { state, scenario: { derivedFrom: prefix + 'source/checkpoint-r' + current.stateRevision + '.json',
            actualModeAndTokenReceiptsRetained: true, declaredAssaultEntry: true, declaredLastTargetPositions: id === 'consume-last',
            fullRound: false, fullMatch: false, modelCalls: 0 } });
        }
        const ref = await save('consume.json', { sourceRevision: current.stateRevision, actualModePaid: true,
          cases, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: prefix + 'source/checkpoint-r' + current.stateRevision + '.json' };
      } finally { source.close(); }
    } },
    { name: 'successor', repairRef, openProduct, check: async product => {
      if (survivorRepair) {
        const source = await product.branch('source');
        try {
          const factory = await sceneFor(source.context);
          for (const id of cases.filter(row => row.startsWith('consume-'))) {
            const branchId = branchIdFor(id); if (await cached(branchId + '/authority.json')) continue;
            const state = structuredClone((await read(prefix + 'source/checkpoint-r2.json')).envelope.state);
            state.officialConsumePaymentPolicy = structuredClone(factory.state.officialConsumePaymentPolicy);
            Object.assign(state, { phase: 'assault', activeSideKey: 'player2', firstPlayerSideKey: 'player2' });
            state.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
            if (id === 'consume-last') {
              arrange(piece(state, 'defiler2'), 18.5, 26);
              const squad = piece(state, 'vileling');
              const leftEdge = Math.min(...squad.models.filter(row => row.isOnField && !row.isDestroyed)
                .map(row => row.xInches - row.baseWidthInches / 2));
              const delta = 18.5 + piece(state, 'defiler2').models[0].baseWidthInches / 2 + 0.1 - leftEdge;
              squad.models.forEach(model => { model.xInches = Math.round((model.xInches + delta) * 1000) / 1000; });
              declareCoherency(state);
            }
            await registerScene(source.context, branchId, { state, scenario: { derivedFrom: prefix + 'source/checkpoint-r2.json',
              actualModeAndTokenPrefixRetained: true, originalWrongPoolBranchPreserved: true,
              correctedPolicyFromRosterFactory: true, declaredAssaultEntryAndPositions: true,
              fullRound: false, fullMatch: false, modelCalls: 0 } });
          }
        } finally { source.close(); }
      }
      const results = [];
      for (const id of cases) results.push(await runCase(product, id));
      const ref = await save('successor.json', { cases: results, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', repairRef, openProduct, check: async product => {
      const results = [];
      for (const id of ['source', ...cases]) {
        const branchId = id === 'source' ? id : branchIdFor(id);
        const saved = await cached('cold-' + branchId + '.json');
        if (saved) { results.push(saved); continue; }
        const branch = await product.branch(branchId);
        try {
          await branch.native.restoreDependencies(branch.roomId, branch.authority);
          const result = { id, branchId, ...await replay(branch.native, branch.roomId, prefix + branchId + '/checkpoint-r') };
          await save('cold-' + branchId + '.json', result); results.push(result);
        } finally { branch.close(); }
      }
      // Changed shared target parent, template runtime and payment policy: retain
      // numeric3.116 and the previous primary-template3.18 bindings/results.
      const legacy = [];
      for (const [prior, definitions, flags, priorRoom] of [
        ['build/ticket-28-zerg-wave3-20261118-v1/consume-payment/multi/', [squadronId],
          { includeRanged: true, includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true }, 'wave3-consume-payment-multi'],
        ['build/ticket-28-wave2-capabilities-20261113-v1/template-target-reaction/main-first/',
          (await read('build/ticket-28-wave2-capabilities-20261113-v1/tank-spatial/selection.json')).definitionIds,
          { includeRanged: true, includeTargetReactions: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
            includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true }, 'wave3-template-target-reaction-main-first'],
      ]) {
        const label = priorRoom.includes('template-target-reaction') ? 'template' : 'numeric';
        const saved = await cached('cold-legacy-' + label + '.json');
        if (saved) { legacy.push(saved); continue; }
        const authority = await read(prior + 'authority.json');
        product.resolver.register(authority.dependencies.dataSnapshot.content.releaseManifest);
        const context = await product.resolver.resolve({ releaseId: authority.releaseId,
          purpose: label === 'template' ? 'ability_component' : 'area_ability_component' });
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: definitions, ...flags });
        assert.deepEqual(runtime.descriptor, await read(prior + 'runtime.json'));
        let sourcePath = path.join(root, prior, 'room.sqlite'), bytes;
        try { bytes = await fs.readFile(sourcePath); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          sourcePath += '.gz'; bytes = gunzipSync(await fs.readFile(sourcePath));
        }
        const originalHash = hash(await fs.readFile(sourcePath));
        const filename = 'legacy-' + (priorRoom.includes('consume-payment') ? 'consume' : 'template') + '.sqlite';
        try { await fs.access(path.join(directory, filename)); }
        catch (error) { if (error.code !== 'ENOENT') throw error; await fs.writeFile(path.join(directory, filename), bytes, { flag: 'wx' }); }
        const native = openWave3EngineeringRoomV1({ directory, filename,
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          await native.restoreDependencies(priorRoom, authority);
          const result = await replay(native, priorRoom, prior + 'checkpoint-r');
          assert.equal(hash(await fs.readFile(sourcePath)), originalHash);
          const record = { prior, ...result, zeroPrefixFromNativeInitialEnvelope: label === 'template', originalFileUnchanged: true };
          await save('cold-legacy-' + label + '.json', record); legacy.push(record);
        } finally { native.close(); }
      }
      const ref = await save('cold-recovery.json', { cases: results, legacy, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures.length, modelCalls: 0 }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
