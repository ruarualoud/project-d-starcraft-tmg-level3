import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13, OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 }
  from '../packages/rule-atoms/official-template-batch-order-policy-v13.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const adaptive = process.argv.includes('--adaptive');
const output = parent + (adaptive ? 'template-adaptive-order/' : 'template-batch-order/');
const directory = path.join(root, output);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const definitionIds = (await read(parent + 'tank-spatial/selection.json')).definitionIds;
const ids = ['main-first', 'spillover-first'];
const roomId = id => 'wave3-template-' + (adaptive ? 'adaptive-order-' : 'batch-order-') + id;
const releaseId = id => 'wave3-u83-c84-r50-template-' + (adaptive ? 'adaptive-order-' : 'batch-order-') + id + '-v1';
const parameters = { primaryTargetUnitId: 'opponent-marines', primaryTargetModelId: 'opponent-marines-model-1' };
const orderFor = id => [...(id === 'main-first' ? ['opponent-marines', 'friendly-marines'] : ['friendly-marines', 'opponent-marines']),
  ...(adaptive ? ['opponent-goliath'] : [])];
const resolvedOrderFor = id => adaptive ? [orderFor(id)[0], 'opponent-goliath', orderFor(id)[1]] : orderFor(id);
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function saved(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
}
function runtimeFor(context, state, ordered = true) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds,
    includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: ordered });
}
function registry(folder = directory) {
  const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(folder, 'releases.sqlite') });
  return { resolver: createOfficialReleaseResolverV2({ store, loadArtifact: read }), close: () => store.close() };
}
async function sourceProduct() {
  const product = registry(path.join(root, parent, 'tank-template-attack'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-tank-template-attack-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
async function openProduct() {
  const product = registry();
  return { ...product, async branch(id) {
    const context = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
    const authority = await read(output + id + '/authority.json');
    const runtime = runtimeFor(context, authority.state);
    assert.deepEqual(runtime.descriptor, await read(output + id + '/runtime.json'));
    const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
      rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(id, current) {
  return save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
}

async function createAdaptiveScene(context, policy) {
  const original = await read(parent + 'tank-template-attack/authority.json');
  const candidates = structuredClone((await read(parent + 'tank-spatial/compile.json')).candidatesBySide);
  candidates.player2.tacticalCardRecordKeys = ['tactical_cards:factory__tech_lab_'];
  candidates.player2.units.push({ unitInstanceId: 'opponent-goliath', recordKey: 'army_units:goliath', compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide: candidates,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    blastTemplateGeometryAsset: original.state.officialBlastTemplateGeometryAsset,
    includeTemplateBatchOrder: true, templateBatchOrderPolicy: policy });
  const state = { ...structuredClone(original.state), ...setup.state, log: [] };
  state.pieces = state.pieces.map(piece => structuredClone(original.state.pieces.find(row => row.id === piece.id) || piece));
  const goliath = state.pieces.find(piece => piece.id === 'opponent-goliath');
  goliath.isOnField = true; goliath.isInReserves = false;
  const model = goliath.models[0];
  model.isOnField = true; model.xInches = 20; model.yInches = 7.2;
  const footprint = createOfficialModelBaseFootprintV1({ piece: goliath, model, dataBundle: state.officialModelBaseGeometryDataBundle });
  for (const piece of state.pieces.filter(piece => piece.id !== goliath.id)) {
    for (const other of piece.models) {
      const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: footprint,
        right: createOfficialModelBaseFootprintV1({ piece, model: other, dataBundle: state.officialModelBaseGeometryDataBundle }) });
      assert.ok(relation.minimumSeparationMilliInches > 0, 'new source-bound Goliath overlaps another model');
    }
  }
  const runtime = runtimeFor(context, state);
  const coverage = runtime.query(state, { queryKind: 'blast_template_coverage', pieceId: 'tank-1', weaponName: 'Shock Cannon', ...parameters });
  assert.deepEqual(coverage.result.batches.map(row => row.unitId).sort(), ['friendly-marines', 'opponent-goliath', 'opponent-marines']);
  return { state, candidates, setup, coverage, modeSource: original.conditionalEngineeringScenario.modeImportedFromAcceptedNativeCheckpoint };
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--capture-red')) {
  const context = await sourceProduct();
  if (adaptive) {
    const scene = await createAdaptiveScene(context, OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13);
    const runtime = runtimeFor(context, scene.state);
    const domain = runtime.enumerate(scene.state).parameterDomains.find(row => row.actionType === 'blast_template_attack');
    const action = runtime.instantiate(scene.state, domain, { ...parameters, batchOrderUnitIds: orderFor('main-first') }).action;
    const after = runtime.apply(scene.state, action, { chanceReveals: Array(action.chance.count).fill(1) }).state;
    assert.equal(after.pendingOfficialBlastTemplateAttack.stage, 'next_batch');
    const targets = runtime.enumerate(after).candidates.map(row => row.sourceAction.targetId);
    assert.deepEqual(targets, ['friendly-marines']);
    await save('red.json', { missingNextBatchReselection: true, actualTargets: targets,
      requiredTargets: ['friendly-marines', 'opponent-goliath'], coverage: scene.coverage,
      candidatesBySide: scene.candidates, audits: scene.setup.state.armyCompositionUpgradeAuditsBySide,
      counterfactualRollsAllOne: true, nativeActions: 0, modelCalls: 0 });
    console.log(JSON.stringify({ reproduced: true, missingNextBatchReselection: true }));
  } else {
  const authority = await read(parent + 'tank-template-attack/authority.json');
  const runtime = runtimeFor(context, authority.state, false);
  const domain = runtime.enumerate(authority.state).parameterDomains.find(row => row.actionType === 'blast_template_attack');
  let rejection;
  try { runtime.instantiate(authority.state, domain, { ...parameters, batchOrderUnitIds: orderFor('spillover-first') }); }
  catch (error) { rejection = error.message; }
  assert.equal(rejection, 'BLAST_TEMPLATE_DECLARATION_PARAMETERS_INVALID');
  await save('red.json', { requiredBy: 'faq-v1.3:39', source: parent + 'tank-template-attack/authority.json',
    missingControllerOrderChoice: true, rejection, modelCalls: 0, nativeActions: 0 });
  console.log(JSON.stringify({ reproduced: true, rejection }));
  }
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: parent + 'tank-template-attack/authority.json', contractVersion: adaptive
      ? 'T28-W3-05-07-template-adaptive-order-v13' : 'T28-W3-05-07-template-controller-order-v13',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      const ledger = await read('content/source-releases/wave3-20261112-faq-delta-v1.json');
      const source = ledger.rows.find(row => row.currentEntryId === 'faq-v1.3:39');
      assert.equal(source.effectiveAnswerHash, OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13.effectiveAnswerHash);
      assert.equal(ledger.sourceBinding.current.byteHash, OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13.sourceByteHash);
      const ref = await save('read.json', { source, faqByteHash: ledger.sourceBinding.current.byteHash,
        sourceDatasetHash: context.dataset.datasetHash, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', repairRef: 'scripts/verify-wave3-template-batch-order-v13.mjs#registered-atom-field', openProduct: sourceProduct, check: async context => {
      const original = await read(parent + 'tank-template-attack/authority.json');
      let state;
      if (adaptive) {
        const scene = await createAdaptiveScene(context, OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13);
        state = scene.state;
        await save('scene.json', { state, candidatesBySide: scene.candidates,
          audits: scene.setup.state.armyCompositionUpgradeAuditsBySide, coverage: scene.coverage });
        assert.deepEqual(state.officialTemplateBatchOrderPolicy, OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13);
      } else {
        const candidates = (await read(parent + 'tank-spatial/compile.json')).candidatesBySide;
        const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide: candidates,
          legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
          blastTemplateGeometryAsset: original.state.officialBlastTemplateGeometryAsset, includeTemplateBatchOrder: true });
        assert.deepEqual(setup.state.officialTemplateBatchOrderPolicy, OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13);
        state = { ...structuredClone(original.state),
          officialTemplateBatchOrderPolicy: structuredClone(setup.state.officialTemplateBatchOrderPolicy) };
      }
      const runtime = runtimeFor(context, state);
      assert.equal(runtime.descriptor.runtimeVersion, adaptive ? '3.15.0' : '3.14.0');
      assert.ok(runtime.descriptor.executableRuleAtomIds.includes(OFFICIAL_TEMPLATE_BATCH_ORDER_POLICY_V13.ruleAtomId));
      const legacy = runtimeFor(context, original.state, false);
      assert.deepEqual(legacy.descriptor, await read(parent + 'tank-template-attack/runtime.json'));
      const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'blast_template_attack');
      assert.ok(domain.sourceDomain.parameterSchema.batchOrderUnitIds);
      for (const invalid of [[], ['opponent-marines'], ['friendly-marines', 'friendly-marines'], ['other', 'opponent-marines'], null]) {
        assert.throws(() => runtime.instantiate(state, domain, { ...parameters, batchOrderUnitIds: invalid }), /TEMPLATE_BATCH_ORDER_PERMUTATION_REQUIRED/);
      }
      const badPolicy = structuredClone(state);
      badPolicy.officialTemplateBatchOrderPolicy.sourceEntryId = 'other';
      assert.throws(() => runtimeFor(context, badPolicy), /TEMPLATE_BATCH_ORDER_POLICY_MISMATCH/);
      assert.throws(() => runtime.instantiate(state, domain, { ...parameters, batchOrderUnitIds: orderFor('main-first'), mainTarget: false }),
        /BLAST_TEMPLATE_DECLARATION_PARAMETERS_INVALID/);
      const projections = [];
      for (const id of ids) {
        const query = runtime.query(state, { queryKind: 'blast_template_attack_preview', pieceId: 'tank-1',
          parameters: { ...parameters, batchOrderUnitIds: orderFor(id) } });
        const action = query.result.action.sourceAction;
        assert.equal(action.targetId, orderFor(id)[0]);
        assert.deepEqual(action.canonicalParameters.batchOrderUnitIds, orderFor(id));
        const work = runtime.templateAttack.inspectContext(state, action);
        const main = id === 'main-first';
        assert.equal(work.geometry.templateBatch.mainTarget, main);
        assert.equal(work.profileForBatch.attackPoolDice, work.geometry.templateBatch.affectedModelIds.length
          + (main ? work.profile.templateWeapon.mainTargetRateModifier : 0));
        assert.equal(work.mechanicalPlan.chance.layout.surge, 0);
        if (!main) assert.equal(work.profileForBatch.surge, null);
        projections.push({ id, query, pool: work.profileForBatch, batch: work.geometry.templateBatch });
        if (adaptive) {
          const after = runtime.apply(state, query.result.action, { chanceReveals: Array(query.result.action.chance.count).fill(1) }).state;
          const choices = runtime.enumerate(after).candidates;
          assert.deepEqual(choices.map(row => row.sourceAction.targetId).sort(), orderFor(id).slice(1).sort());
          const next = runtime.query(after, { queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId: 'opponent-goliath' });
          assert.equal(next.result.action.sourceAction.selectedBatchUnitId, 'opponent-goliath');
          assert.throws(() => runtime.query(after, { queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId: orderFor(id)[0] }),
            /BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE/);
          assert.throws(() => runtime.query(after, { queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId: 'other' }),
            /BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE/);
        }
        const product = registry();
        try {
          const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
          const m = context.manifest;
          const manifest = createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
            datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: adaptive ? '3.15.0' : '3.14.0',
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
          product.resolver.register(manifest);
          const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
          await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state,
            scenario: { scale: 500, fullMatch: false, placementAndPhaseDeclared: true,
              modeSource: original.conditionalEngineeringScenario.modeImportedFromAcceptedNativeCheckpoint,
              controllerBatchOrder: orderFor(id) } }));
        } finally { product.close(); }
      }
      const ref = await save('compile.json', { projections, oldDescriptorExact: true,
        invalidOrdersRejected: true, policyMismatchRejected: true, rosterFactoryPolicyBound: true });
      return { evidenceRef: ref, checkpointRef: output + 'main-first/authority.json' };
    } },
    { name: 'consume', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const prior = await saved(id + '/consume.json');
        if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          const { native, authority, runtime } = branch;
          const credentials = await native.create(roomId(id), authority);
          const before = await native.store.loadRoom(roomId(id));
          const query = runtime.query(before.envelope.state, { queryKind: 'blast_template_attack_preview', pieceId: 'tank-1',
            parameters: { ...parameters, batchOrderUnitIds: orderFor(id) } });
          const result = await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'first-batch',
            select: row => row.actionType === 'blast_template_attack',
            parameters: () => ({ ...parameters, batchOrderUnitIds: orderFor(id) }) });
          assert.deepEqual(result.preview.core.action, query.result.action);
          let current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
          if (adaptive) {
            for (let step = 0; current.envelope.state.pendingOfficialBlastTemplateAttack.stage === 'casualty' && step < 3; step++) {
              assert.throws(() => runtime.query(current.envelope.state, { queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId: 'opponent-goliath' }),
                /BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE/);
              await native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
                operationKey: 'first-casualty-' + current.stateRevision,
                select: row => row.actionType === 'choose_blast_template_casualties',
                parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
              current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
            }
            assert.equal(current.envelope.state.pendingOfficialBlastTemplateAttack.stage, 'next_batch');
            assert.equal(runtime.enumerate(current.envelope.state).candidates.length, 2);
          }
          assert.deepEqual(current.envelope.state.pendingOfficialBlastTemplateAttack.batches.map(row => row.unitId), orderFor(id));
          const ref = await save(id + '/consume.json', { id, revision: current.stateRevision,
            firstTarget: result.preview.core.action.sourceAction.targetId, queryEqualsNativePreview: true,
            nativeRng: true });
          cases.push({ id, evidenceRef: ref });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'successor', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const prior = await saved(id + '/successor.json');
        if (prior) { cases.push(prior); continue; }
        const branch = await product.branch(id);
        try {
          const { native, authority, runtime } = branch;
          const credentials = await native.create(roomId(id), authority);
          for (let step = 0; step < 12; step++) {
            const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
            const parent = current.envelope.state.pendingOfficialBlastTemplateAttack;
            if (!parent) break;
            const base = { roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
              operationKey: 'continuation-' + current.stateRevision };
            if (parent.stage === 'casualty') await native.commit({ ...base,
              select: row => row.actionType === 'choose_blast_template_casualties',
              parameters: row => ({ casualtySelectionHash: row.parameterSchema.casualtySelectionHash.enum[0] }) });
            else {
              const targetUnitId = resolvedOrderFor(id)[parent.batchIndex];
              const query = adaptive ? runtime.query(current.envelope.state, {
                queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId }) : null;
              const chosen = await native.commit({ ...base, kind: 'finite', select: row => row.action.actionType === 'resolve_blast_template_batch'
                && (!adaptive || row.action.sourceAction.targetId === targetUnitId) });
              if (query) assert.deepEqual(chosen.preview.core.action, query.result.action);
            }
          }
          let current = await native.store.loadRoom(roomId(id));
          assert.equal(current.envelope.state.pendingOfficialBlastTemplateAttack, undefined);
          const finish = runtime.enumerate(current.envelope.state).parameterDomains.find(row => row.actionType === 'finish_activation');
          if (finish) {
            await native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
              operationKey: 'finish-activation', select: row => row.actionType === 'finish_activation', parameters: () => ({}) });
            current = await native.store.loadRoom(roomId(id));
          }
          await checkpoint(id, current);
          const events = current.envelope.state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack');
          assert.deepEqual(events.map(row => row.targetId), resolvedOrderFor(id));
          assert.equal(events.find(row => row.targetId === 'opponent-marines').templateBatch.mainTarget, true);
          const spillover = events.find(row => row.targetId === 'friendly-marines');
          assert.equal(spillover.templateBatch.mainTarget, false);
          assert.equal(spillover.stages.effects.surgeMatched, false);
          assert.equal(spillover.stages.hit.dice, spillover.templateBatch.affectedModelIds.length);
          for (const event of events.filter(row => !row.templateBatch.mainTarget)) {
            assert.equal(event.stages.effects.surgeMatched, false);
            assert.equal(event.stages.hit.dice, event.templateBatch.affectedModelIds.length);
          }
          const legal = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials[current.envelope.state.activeSideKey].seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert.ok(legal.legalSpace.parameterDomains.length || legal.legalSpace.finiteActions.length);
          await save(id + '/checkpoint.json', { envelope: current.envelope });
          const value = { id, revision: current.stateRevision, events, nextSide: current.envelope.state.activeSideKey,
            initialOrder: orderFor(id), resolvedOrder: events.map(row => row.targetId),
            initialPreferenceChanged: adaptive, orderPreserved: true, mainIdentityPreserved: true, nextMenuAvailable: true };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
      const cases = [];
      for (const id of ids) {
        const branch = await product.branch(id);
        try {
          const { native, authority } = branch;
          await native.restoreDependencies(roomId(id), authority);
          const before = await native.store.loadRoom(roomId(id));
          const bundle = await native.store.loadReplayBundle(roomId(id));
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
          for (const file of checkpoints) {
            const expected = (await read(output + id + '/' + file)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay));
            assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(roomId(id)), before);
          cases.push({ id, revision: before.stateRevision, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
  if (result.status !== 'passed') process.exitCode = 1;
  if (result.status === 'passed' && adaptive && process.argv.includes('--previous-order-control')) {
    const control = await runProductBoundaryCheck({ directory: path.join(directory, 'previous-order-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
      sourceRef: parent + 'template-batch-order/cold-recovery.json',
      contractVersion: 'T28-W3-05-07-template-adaptive-order-previous-policy-control-v1',
    }, steps: [{ name: 'coldRecovery', openProduct: async () => registry(path.join(root, parent, 'template-batch-order')),
      check: async product => {
        const cases = [];
        for (const id of ids) {
          const prefix = parent + 'template-batch-order/' + id + '/';
          const context = await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-template-batch-order-' + id + '-v1',
            purpose: 'ability_component' });
          const authority = await read(prefix + 'authority.json');
          const runtime = runtimeFor(context, authority.state);
          assert.equal(runtime.descriptor.runtimeVersion, '3.14.0');
          assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
          const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
          try {
            const oldRoomId = 'wave3-template-batch-order-' + id;
            const before = await native.store.loadRoom(oldRoomId);
            await native.restoreDependencies(oldRoomId, authority);
            const bundle = await native.store.loadReplayBundle(oldRoomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
              .map(row => row.payload.payload.receipt);
            const checkpoints = (await fs.readdir(path.join(root, prefix))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
            for (const file of checkpoints) {
              const expected = (await read(prefix + file)).envelope;
              const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope,
                journal: receipts.slice(0, expected.stateRevision) });
              assert.equal(replay.ok, true, JSON.stringify(replay));
              assert.deepEqual(replay.envelope, expected);
            }
            assert.deepEqual(await native.store.loadRoom(oldRoomId), before);
            cases.push({ id, revision: before.stateRevision, receipts: receipts.length,
              checkpoints: checkpoints.length, descriptorExact: true, replayExact: true, currentUnchanged: true });
          } finally { native.close(); }
        }
        const ref = await save('previous-order-control.json', { cases, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } }] });
    console.log(JSON.stringify({ previousOrderControl: control.status, failures: control.failures }));
    if (control.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
      sourceRef: parent + 'tank-template-attack/authority.json', contractVersion: 'T28-W3-05-07-template-order-legacy-control-v1',
    }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async context => {
      const prefix = parent + 'tank-template-attack/';
      const authority = await read(prefix + 'authority.json');
      const runtime = runtimeFor(context, authority.state, false);
      assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
      const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
        rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
      try {
        const id = 'wave2-tank-template-attack';
        const before = await native.store.loadRoom(id);
        await native.restoreDependencies(id, authority);
        const bundle = await native.store.loadReplayBundle(id);
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        for (const name of ['main-checkpoint.json', 'checkpoint.json']) {
          const expected = (await read(prefix + name)).envelope;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await native.store.loadRoom(id), before);
        const ref = await save('legacy-control.json', { roomId: id, receipts: receipts.length,
          descriptorExact: true, checkpointsExact: true, currentUnchanged: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { native.close(); }
    } }] });
    console.log(JSON.stringify({ legacyControl: legacy.status, passed: Object.keys(legacy.passed), failures: legacy.failures }));
    if (legacy.status !== 'passed') process.exitCode = 1;
  }
}
