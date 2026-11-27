import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialTargetReactionAttackContextV1 }
  from '../packages/product-composition/official-attack-target-reaction-context-v1.mjs';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13 }
  from '../packages/rule-atoms/official-template-batch-order-policy-v13.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { readOfficialRangedChoiceParentV1 } from '../packages/product-composition/official-ranged-choice-context-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const currentDefense = process.argv.includes('--current-defense');
const targetReactions = currentDefense || process.argv.includes('--target-reactions');
const scope = currentDefense ? 'immortal-defense-current/template' : targetReactions ? 'template-target-reaction' : 'template-armour-reaction';
const repairRef = process.argv.find(arg => arg.startsWith('--repair-ref='))?.slice(13);
const output = parent + scope + '/';
const directory = path.join(root, output);
const ids = ['main-first', 'spillover-first'];
const reactionId = 'unit:immortal/shield-overcharge-any-phase@1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const definitionIds = (await read(parent + 'tank-spatial/selection.json')).definitionIds;
const roomId = id => 'wave3-' + scope.replaceAll('/', '-') + '-' + id;
const releaseId = id => 'wave3-u83-c84-r50-' + scope.replaceAll('/', '-') + '-' + id + '-v1';
const parametersFor = id => ({ primaryTargetUnitId: 'target', primaryTargetModelId: 'target-model-1',
  templateCenter: { xInches: 19.47, yInches: 10 },
  batchOrderUnitIds: id === 'main-first' ? ['target', 'friendly-marines'] : ['friendly-marines', 'target'] });
async function save(name, value) {
  await atomicWrite(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
  return output + name;
}
async function saved(name) {
  try { return await read(output + name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
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
function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds,
    includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
    includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true,
    includeTargetReactions: targetReactions });
}
async function sceneFor(context) {
  const base = (await read(parent + 'tank-template-attack/authority.json')).state;
  const candidatesBySide = structuredClone((await read(parent + 'tank-spatial/compile.json')).candidatesBySide);
  candidatesBySide.player2 = { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 500,
    factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
    units: [{ unitInstanceId: 'target', recordKey: 'army_units:immortal', compositionKind: 'small',
      upgrades: [{ upgradeName: 'Shield Overcharge' }] }] };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    blastTemplateGeometryAsset: base.officialBlastTemplateGeometryAsset,
    includeTemplateBatchOrder: true, templateBatchOrderPolicy: OFFICIAL_TEMPLATE_ADAPTIVE_BATCH_ORDER_POLICY_V13,
    characteristicDefinitionIds: definitionIds, ...(currentDefense ? { includeShieldedLifecycle: true } : {}), reactionDefinitionIds: [reactionId,
      ...(targetReactions ? ['unit:immortal/improved-barrier-any-phase@1'] : [])] });
  const state = { ...structuredClone(base), ...setup.state, log: [],
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  state.pieces = state.pieces.map(piece => currentDefense && piece.id === 'target'
    ? piece : structuredClone(base.pieces.find(row => row.id === piece.id) || piece));
  for (const model of state.pieces.find(piece => piece.id === 'friendly-marines').models) model.xInches -= 0.84;
  if (currentDefense) {
    const marines = state.pieces.find(piece => piece.id === 'friendly-marines');
    for (const model of marines.models) { model.xInches += 0.09; model.yInches -= 0.65; }
    marines.damageMarker = 1;
  }
  const target = state.pieces.find(piece => piece.id === 'target');
  target.isOnField = true; target.isInReserves = false; target.statuses = ['Shielded'];
  target.models.forEach((model, index) => Object.assign(model, { isOnField: true,
    xInches: 20 + index * (model.baseWidthInches + 0.1), yInches: 10 }));
  const targetBase = createOfficialModelBaseFootprintV1({ piece: target, model: target.models[0],
    dataBundle: state.officialModelBaseGeometryDataBundle });
  for (const piece of state.pieces.filter(piece => piece.sideKey === 'player1')) {
    for (const model of piece.models) {
      const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: targetBase,
        right: createOfficialModelBaseFootprintV1({ piece, model, dataBundle: state.officialModelBaseGeometryDataBundle }) });
      assert.ok(relation.minimumSeparationMilliInches > 1000, 'declared ranged target is already engaged');
    }
  }
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide };
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
    return { context, runtime, native, authority, close: () => native.close() };
  } };
}
async function checkpoint(id, current) {
  return save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
}
function chosenOperation(runtime, state, useShield, useBarrier = false) {
  const menu = runtime.enumerate(state);
  const child = readOfficialRangedChoiceParentV1(state);
  if (state.pendingOfficialReactionWindow) {
    const targetWindow = state.pendingOfficialReactionWindow.triggerKind === 'attack_target_selected';
    assert.ok(targetWindow && targetReactions || state.pendingOfficialReactionWindow.triggerKind === 'before_armour_roll');
    assert.equal(targetWindow ? state.pendingOfficialAttackTargetReaction.targetId : child.attackAction.targetId, 'target');
    const name = targetWindow ? 'Improved Barrier' : 'Shield Overcharge';
    const use = (targetWindow ? useBarrier : useShield) && state.activeSideKey === 'player2';
    const domain = menu.parameterDomains.find(row => use
      ? row.actionType === 'resolve_reaction_family_ability' && row.sourceDomain.abilityName === name
      : row.actionType === 'pass_reaction_family_window');
    assert.ok(domain, 'expected actual reaction menu missing');
    return { domain, parameters: use
      ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {} };
  }
  if (child?.stage === 'choice' || child?.stage === 'armour_choice') {
    const key = child.stage === 'choice' ? 'convertedFailedHitDieIndices' : 'convertedFailedArmourDieIndices';
    const domain = menu.parameterDomains[0];
    const field = domain.sourceDomain.parameterSchema[key];
    return { domain, parameters: { [key]: field.items.enum.slice(0, field.maxItems) } };
  }
  const casualty = menu.parameterDomains.find(row => row.actionType === 'choose_blast_template_casualties');
  if (casualty) return { domain: casualty,
    parameters: { casualtySelectionHash: casualty.parameterSchema.casualtySelectionHash.enum[0] } };
  assert.equal(menu.candidates.length, 1, 'expected one current attack continuation');
  return { candidate: menu.candidates[0] };
}
function fixedWalk(runtime, initial, id, useShield, noHits = false, useBarrier = false) {
  let state = structuredClone(initial);
  const trace = [];
  const first = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'blast_template_attack');
  let action = runtime.instantiate(state, first, parametersFor(id)).action;
  for (let step = 0; step < 24; step++) {
    const rolls = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' && !noHits ? 6 : 1));
    }
    const raw = action.sourceRuntimeKind === 'template' ? action.sourceAction
      : action.sourceAction.attackAction;
    const profile = raw?.rangedPlan && !state.pendingOfficialRangedPrecisionChoice
      ? runtime.templateAttack.inspectContext(state, raw)?.profileForBatch : null;
    const ownerBefore = state.pendingOfficialAttackTargetReaction;
    const result = runtime.apply(state, action, { chanceReveals: rolls });
    state = result.state;
    trace.push({ actionType: action.actionType, sideKey: action.sideKey, rolls, events: result.events,
      targetOwner: ownerBefore ? { targetId: ownerBefore.targetId, stage: ownerBefore.stage } : null,
      batch: profile ? { targetId: raw.targetId, mainTarget: raw.rangedPlan.templateBatch.mainTarget,
        damagePerDie: profile.damagePerDie, weaponDamageCap: profile.weaponDamageCap || null } : null });
    if (!state.pendingOfficialBlastTemplateAttack && !state.pendingOfficialRangedPrecisionChoice
      && !state.pendingOfficialAttackTargetReaction) {
      return { state, trace, events: state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack') };
    }
    const selected = chosenOperation(runtime, state, useShield, useBarrier);
    action = selected.candidate ? Object.fromEntries(Object.entries(selected.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, selected.domain, selected.parameters).action;
  }
  assert.fail('fixed template reaction exceeded bounded continuation');
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--capture-red')) {
  const context = await sourceProduct();
  const scene = await sceneFor(context);
  const rejection = targetReactions ? 'CHARACTERISTIC_TARGET_REACTION_NUMERIC_CONSUMER_REQUIRED'
    : 'CHARACTERISTIC_NUMERIC_ARMOUR_REACTION_CONSUMERS_REQUIRED';
  assert.throws(() => runtimeFor(context, scene.state), new RegExp(rejection));
  const ref = await save('red.json', { componentCompositionRejected: true,
    rejection,
    ...(targetReactions ? { missingPrimaryTargetConsumer: true }
      : { missingTemplateConsumerMethods: ['inspectArmourDemand', 'saved_before_armour_reaction_projection'] }),
    candidatesBySide: scene.candidatesBySide, modelCalls: 0, nativeActions: 0 });
  console.log(JSON.stringify({ reproduced: true, evidenceRef: ref }));
} else if (process.argv.includes('--capture-busy-query-red')) {
  const product = await openProduct();
  try {
    const branch = await product.branch('spillover-first');
    try {
      const observations = [];
      for (const revision of [2, 4]) {
        const state = (await read(output + 'spillover-first/checkpoint-r' + revision + '.json')).envelope.state;
        const child = readOfficialRangedChoiceParentV1(state);
        assert.ok(child);
        const menu = branch.runtime.enumerate(state);
        try {
          const preview = branch.runtime.query(state, { queryKind: 'blast_template_next_batch_preview',
            pieceId: 'tank-1', targetUnitId: 'target' });
          assert.ok(!menu.candidates.some(row => row.sourceActionHash === preview.result.action.sourceActionHash));
          observations.push({ revision, ownedStage: child.stage, preview, queryActionAbsentFromLegalMenu: true });
        } catch (error) {
          assert.equal(error.message, 'REACTION_WINDOW_ALREADY_OPEN');
          observations.push({ revision, ownedStage: child.stage, error: error.message });
        }
      }
      const ref = await save('busy-query-red.json', { observations,
        activeOwner: 'precision_before_armour', nativeActionPerformed: false, modelCalls: 0 });
      console.log(JSON.stringify({ reproduced: true, evidenceRef: ref }));
    } finally { branch.close(); }
  } finally { product.close(); }
} else {
  const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
    sourceRef: parent + 'immortal-reaction-composition/read.json',
    contractVersion: currentDefense ? 'T28-W3-07-current-immortal-template-defense-v1' : targetReactions ? 'T28-W3-07-template-target-and-armour-reaction-v1'
      : 'T28-W3-07-template-before-armour-reaction-v1',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      const source = context.dataset.recordsByKey['army_units:immortal'].payload.upgrades.find(row => row.name === 'Shield Overcharge');
      assert.equal(source.costS, 20);
      const ref = await save('read.json', { source, scope: 'template_current_batch_before_armour', modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', repairRef: repairRef || 'scripts/verify-wave3-template-armour-reaction-v1.mjs#actual-100mm-target-clearance', openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context);
      const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, currentDefense ? '3.23.0' : targetReactions ? '3.17.0' : '3.16.0');
      const { batchOrderUnitIds, ...coverageParameters } = parametersFor('main-first');
      const coverage = runtime.query(scene.state, { queryKind: 'blast_template_coverage', pieceId: 'tank-1',
        weaponName: 'Shock Cannon', ...coverageParameters });
      assert.deepEqual(coverage.result.batches.map(row => row.unitId).sort(), ['friendly-marines', 'target']);
      const comparisons = [];
      for (const id of ids) {
        const use = fixedWalk(runtime, scene.state, id, true);
        const decline = fixedWalk(runtime, scene.state, id, false);
        const used = use.events.find(row => row.targetId === 'target');
        const plain = decline.events.find(row => row.targetId === 'target');
        assert.equal(used.stages.armour.convertedFailedDieIndices.length, 2);
        assert.equal(plain.stages.armour.convertedFailedDieIndices.length, 0);
        assert.equal(plain.stages.damage.totalDamage - used.stages.damage.totalDamage, 2);
        assert.deepEqual(use.events.map(row => row.targetId), parametersFor(id).batchOrderUnitIds);
        assert.deepEqual(use.state.officialReactionHistory.map(row => row.abilityName), ['Shield Overcharge']);
        assert.ok(use.state.officialReactionResolutionHistory.every(row => row.consumedByHost));
        const zero = fixedWalk(runtime, scene.state, id, true, true);
        assert.equal(zero.state.officialReactionHistory?.length || 0, 0);
        assert.ok(zero.trace.every(row => !row.events.some(event => event.triggerKind === 'before_armour_roll')));
        let barrier;
        if (targetReactions) {
          barrier = fixedWalk(runtime, scene.state, id, false, false, true);
          assert.deepEqual(barrier.state.officialReactionHistory.map(row => row.abilityName), ['Improved Barrier']);
          const capped = barrier.trace.filter(row => row.batch?.targetId === 'target');
          assert.ok(capped.length);
          assert.ok(capped.every(row => row.batch.weaponDamageCap?.maximumWeaponDamage === 1));
          assert.ok(barrier.trace.filter(row => row.batch?.targetId === 'friendly-marines')
            .every(row => row.batch.weaponDamageCap === null));
          assert.equal(barrier.state.pendingOfficialAttackTargetReaction, undefined);
        }
        const ref = await save(id + '/fixed-walk.json', { counterfactualOnly: true, nativeReceiptsCreated: false, use, decline, zero,
          ...(barrier ? { barrier } : {}) });
        comparisons.push({ id, evidenceRef: ref, toughConversions: 2, damageDifference: 2 });
        const product = registry();
        try {
          const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
          const m = context.manifest;
          product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
            snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef),
            datasetRef: m.source.datasetRef, snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
            referenceSources: m.source.references, sourcePolicy: m.source.policy,
            components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: runtime.descriptor.runtimeVersion,
              integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
          const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
          await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
            scenario: { scale: 500, fullMatch: false, placementAndPhaseDeclared: true,
              templateBatchOrder: parametersFor(id).batchOrderUnitIds, nativeArmourReactionTriggerRequired: true } }));
        } finally { product.close(); }
      }
      const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits, coverage, comparisons });
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
            parameters: parametersFor(id) });
          const result = await native.commit({ roomId: roomId(id), credential: credentials.player1,
            operationKey: 'declare-template', select: row => row.actionType === 'blast_template_attack', parameters: () => parametersFor(id) });
          assert.deepEqual(result.preview.core.action, query.result.action);
          const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
          const ref = await save(id + '/consume.json', { id, revision: current.stateRevision,
            queryEqualsNativePreview: true, firstTarget: result.preview.core.action.sourceAction.targetId ||
              result.preview.core.action.sourceAction.attackAction?.targetId });
          cases.push({ id, evidenceRef: ref });
        } finally { branch.close(); }
      }
      const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
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
          for (let step = 0; step < 24; step++) {
            const current = await native.store.loadRoom(roomId(id)); await checkpoint(id, current);
            const state = current.envelope.state;
            if (!state.pendingOfficialBlastTemplateAttack && !state.pendingOfficialRangedPrecisionChoice
              && !state.pendingOfficialAttackTargetReaction) break;
            const selected = chosenOperation(runtime, state, !targetReactions || id !== 'main-first', targetReactions && id === 'main-first');
            await native.commit({ roomId: roomId(id), credential: credentials[state.activeSideKey],
              operationKey: 'continuation-' + current.stateRevision,
              ...(selected.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === selected.candidate.sourceActionHash }
                : { select: row => row.domainId === selected.domain.domainId, parameters: () => selected.parameters }) });
          }
          let current = await native.store.loadRoom(roomId(id));
          assert.equal(current.envelope.state.pendingOfficialRangedPrecisionChoice, undefined);
          assert.equal(current.envelope.state.pendingOfficialBlastTemplateAttack, undefined);
          assert.equal(current.envelope.state.pendingOfficialReactionWindow, undefined);
          assert.equal(current.envelope.state.pendingOfficialAttackTargetReaction, undefined);
          const finish = runtime.enumerate(current.envelope.state).parameterDomains.find(row => row.actionType === 'finish_activation');
          if (finish) {
            await native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
              operationKey: 'finish-activation', select: row => row.actionType === 'finish_activation', parameters: () => ({}) });
            current = await native.store.loadRoom(roomId(id));
          }
          await checkpoint(id, current);
          const events = current.envelope.state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack');
          assert.deepEqual(events.map(row => row.targetId), parametersFor(id).batchOrderUnitIds);
          const reactions = current.envelope.state.officialReactionHistory || [];
          assert.ok(reactions.every(row => ['Shield Overcharge', ...(targetReactions ? ['Improved Barrier'] : [])].includes(row.abilityName)));
          assert.ok((current.envelope.state.officialReactionResolutionHistory || []).every(row => row.consumedByHost));
          const legal = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials[current.envelope.state.activeSideKey].seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert.ok(legal.legalSpace.parameterDomains.length || legal.legalSpace.finiteActions.length);
          await save(id + '/checkpoint.json', { envelope: current.envelope });
          const value = { id, revision: current.stateRevision, events, reactions,
            toughConversions: events.find(row => row.targetId === 'target').stages.armour.convertedFailedDieIndices,
            nextMenuAvailable: true };
          await save(id + '/successor.json', value); cases.push(value);
        } finally { branch.close(); }
      }
      const ref = await save('successor.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
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
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(roomId(id)), before);
          cases.push({ id, revision: before.stateRevision, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        } finally { branch.close(); }
      }
      const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
    } },
  ] });
  console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
  if (result.status !== 'passed') process.exitCode = 1;
  if (result.status === 'passed' && targetReactions && process.argv.includes('--target-integrity-control')) {
    const integrity = await runProductBoundaryCheck({ directory: path.join(directory, 'target-integrity'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
      sourceRef: output + 'spillover-first/checkpoint-r4.json',
      contractVersion: 'T28-W3-07-template-target-owner-integrity-v1',
    }, steps: [{ name: 'consume', openProduct, check: async product => {
      const branch = await product.branch('spillover-first');
      try {
        const before = await branch.native.store.loadRoom(roomId('spillover-first'));
        const checkpoints = [];
        const files = (await fs.readdir(path.join(directory, 'spillover-first'))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        let retainedOwnerState;
        let nestedState;
        for (const file of files) {
          const expected = (await read(output + 'spillover-first/' + file)).envelope;
          const state = expected.state;
          const owner = state.pendingOfficialAttackTargetReaction;
          if (!owner) continue;
          assert.equal(owner.targetId, 'target');
          assert.equal(owner.sourceAction.targetId, 'friendly-marines');
          const child = readOfficialRangedChoiceParentV1(state);
          if (owner.stage === 'reaction' || child) {
            assert.throws(() => branch.runtime.query(state, { queryKind: 'blast_template_next_batch_preview',
              pieceId: 'tank-1', targetUnitId: 'target' }), /BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE/);
          }
          if (state.pendingOfficialBlastTemplateAttack && !child) retainedOwnerState = state;
          if (child) {
            assert.equal(owner.childParentHash, child.parentHash);
            nestedState = state;
            const view = JSON.parse(JSON.stringify(createOfficialTargetReactionAttackContextV1(state)));
            assert.ok(branch.runtime.templateAttack.inspectContext(view, child.attackAction));
            assert.throws(() => branch.runtime.enumerate(view), /ATTACK_TARGET_REACTION_PARENT_INVALID/);
          }
          checkpoints.push({ revision: expected.stateRevision, stage: owner.stage, currentBatchId: child?.attackAction.targetId || null });
        }
        assert.ok(retainedOwnerState, 'saved spillover result must retain the main-target owner');
        assert.ok(nestedState, 'saved state must include the actual defender child');
        const removedTemplate = structuredClone(retainedOwnerState);
        delete removedTemplate.pendingOfficialBlastTemplateAttack;
        assert.throws(() => branch.runtime.enumerate(removedTemplate), /ATTACK_TARGET_REACTION_PARENT_INVALID/);
        for (const [state, field, wrong] of [[retainedOwnerState, 'targetId', 'friendly-marines'],
          [nestedState, 'childParentHash', '0'.repeat(64)]]) {
          const bad = structuredClone(state);
          const parent = bad.pendingOfficialAttackTargetReaction;
          parent[field] = wrong;
          parent.parentHash = hash(Object.fromEntries(Object.entries(parent).filter(([key]) => key !== 'parentHash')));
          assert.throws(() => branch.runtime.enumerate(bad), /ATTACK_TARGET_REACTION_PARENT_INVALID/);
        }
        const scene = await sceneFor(branch.context);
        const marines = scene.state.pieces.find(piece => piece.id === 'friendly-marines');
        for (const model of marines.models) { model.xInches += 0.09; model.yInches -= 0.65; }
        marines.damageMarker = 1;
        const runtime = runtimeFor(branch.context, scene.state);
        const casualty = fixedWalk(runtime, scene.state, 'spillover-first', false, false, true);
        assert.ok(casualty.trace.some(row => row.actionType === 'choose_blast_template_casualties'));
        assert.equal(casualty.events.find(row => row.targetId === 'friendly-marines').casualtyModelIds.length, 1);
        assert.equal(casualty.state.pendingOfficialAttackTargetReaction, undefined);
        assert.deepEqual(await branch.native.store.loadRoom(roomId('spillover-first')), before);
        const ref = await save('target-integrity.json', { checkpoints, missingTemplateOwnerRejected: true,
          rehashedWrongPrimaryRejected: true, rehashedWrongChildRejected: true, serializedContextAcceptedAsReadonlyOnly: true,
          declaredDamagedMarineScenario: { xShiftInches: 0.09, yShiftInches: -0.65, damageMarker: 1,
            counterfactualOnly: true, nativeReceiptsCreated: false, ...casualty },
          currentRoomUnchanged: true, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ targetIntegrity: integrity.status, failures: integrity.failures }));
    if (integrity.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--query-owner-control')) {
    const owner = await runProductBoundaryCheck({ directory: path.join(directory, 'query-owner'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
      sourceRef: output + 'spillover-first/checkpoint-r2.json',
      contractVersion: 'T28-W3-07-template-batch-query-owner-v1',
    }, steps: [{ name: 'consume', openProduct, check: async product => {
      const branch = await product.branch('spillover-first');
      try {
        const before = await branch.native.store.loadRoom(roomId('spillover-first'));
        const checkpoints = [];
        for (const revision of [2, 3, 4, 5, 6]) {
          const state = (await read(output + 'spillover-first/checkpoint-r' + revision + '.json')).envelope.state;
          const pending = readOfficialRangedChoiceParentV1(state);
          assert.ok(pending);
          assert.throws(() => branch.runtime.query(state, { queryKind: 'blast_template_next_batch_preview',
            pieceId: 'tank-1', targetUnitId: 'target' }), /BLAST_TEMPLATE_NEXT_BATCH_UNAVAILABLE/);
          checkpoints.push({ revision, ownedStage: pending.stage, rejected: true });
        }
        const idle = (await read(output + 'spillover-first/checkpoint-r1.json')).envelope.state;
        const preview = branch.runtime.query(idle, { queryKind: 'blast_template_next_batch_preview', pieceId: 'tank-1', targetUnitId: 'target' });
        const candidates = branch.runtime.enumerate(idle).candidates;
        assert.equal(candidates.length, 1);
        const expected = Object.fromEntries(Object.entries(candidates[0])
          .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
        assert.deepEqual(preview.result.action, expected);
        assert.deepEqual(await branch.native.store.loadRoom(roomId('spillover-first')), before);
        const ref = await save('query-owner.json', { checkpoints, idleQueryEqualsLegalCandidate: true,
          currentRoomUnchanged: true, nativeActions: 0, modelCalls: 0 });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } }] });
    console.log(JSON.stringify({ queryOwner: owner.status, failures: owner.failures }));
    if (owner.status !== 'passed') process.exitCode = 1;
  }
  if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
    const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-compatibility'), identity: {
      factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
      factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
      sourceRef: parent + 'immortal-reaction-composition/cold-recovery.json',
      contractVersion: 'T28-W3-07-template-armour-legacy-native-control-v1',
    }, steps: [{ name: 'coldRecovery', openProduct: async () => ({ close() {} }), check: async () => {
      const cases = [];
      const specs = [
        ...['barrier', 'shield'].map(id => ({ id, folder: 'immortal-reaction-composition', version: '3.13.0',
          oldReleaseId: 'wave3-u83-c84-r50-immortal-reaction-composition-' + id + '-v1',
          oldRoomId: 'wave2-immortal-reaction-composition-' + id,
          options: { definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'], includeRanged: true,
            includeTargetReactions: true, includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } })),
        ...ids.map(id => ({ id, folder: 'template-adaptive-order', version: '3.15.0',
          oldReleaseId: 'wave3-u83-c84-r50-template-adaptive-order-' + id + '-v1',
          oldRoomId: 'wave3-template-adaptive-order-' + id,
          options: { definitionIds, includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true } })),
        ...(targetReactions ? ids.map(id => ({ id, folder: 'template-armour-reaction', version: '3.16.0',
          oldReleaseId: 'wave3-u83-c84-r50-template-armour-reaction-' + id + '-v1',
          oldRoomId: 'wave3-template-armour-reaction-' + id,
          options: { definitionIds, includeRanged: true, includeTemplateAttacks: true, includeTemplateBatchOrder: true,
            includePrecisionChoices: true, includeArmourChoices: true, includeArmourReactions: true } })) : []),
      ];
      for (const spec of specs) {
        const prefix = parent + spec.folder + '/' + spec.id + '/';
        const product = registry(path.join(root, parent, spec.folder));
        try {
          const context = await product.resolver.resolve({ releaseId: spec.oldReleaseId, purpose: 'ability_component' });
          const authority = await read(prefix + 'authority.json');
          const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
          assert.equal(runtime.descriptor.runtimeVersion, spec.version);
          assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
          const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
            rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
          try {
            const before = await native.store.loadRoom(spec.oldRoomId);
            await native.restoreDependencies(spec.oldRoomId, authority);
            const bundle = await native.store.loadReplayBundle(spec.oldRoomId);
            const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition')
              .map(row => row.payload.payload.receipt);
            const checkpoints = (await fs.readdir(path.join(root, prefix))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
            for (const file of checkpoints) {
              const expected = (await read(prefix + file)).envelope;
              const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
              assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
            }
            assert.deepEqual(await native.store.loadRoom(spec.oldRoomId), before);
            cases.push({ roomId: spec.oldRoomId, version: spec.version, receipts: receipts.length,
              checkpoints: checkpoints.length, replayExact: true, descriptorExact: true, currentUnchanged: true });
          } finally { native.close(); }
        } finally { product.close(); }
      }
      const ref = await save('legacy-control.json', { cases, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } }] });
    console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
    if (legacy.status !== 'passed') process.exitCode = 1;
  }
}
