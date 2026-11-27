import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 }
  from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { synchronizeOfficialEffectiveHitPointWoundsV1 }
  from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialSelectedRosterAbilityRuntimeV1 }
  from '../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'shielded-lifecycle/';
const directory = path.join(root, output);
const ids = ['fresh', 'threshold', 'last-wound'];
const initialDamage = { fresh: 0, threshold: 6, 'last-wound': 13 };
const definitionIds = ['unit:immortal/for-the-ancients-assault-phase@1'];
const reactionDefinitionIds = ['unit:immortal/improved-barrier-any-phase@1', 'unit:immortal/shield-overcharge-any-phase@1'];
const roomId = id => 'wave3-shielded-lifecycle-' + id;
const releaseId = id => 'wave3-u83-c84-r50-shielded-lifecycle-' + id + '-v1';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
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
  const product = registry(path.join(root, parent, 'rapid-ingress-producer'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-rapid-ingress-producer-before-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
const options = { definitionIds, includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true,
  includeTargetReactions: true, includeArmourReactions: true };
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, ...options });
const target = state => state.pieces.find(piece => piece.id === 'immortals');
const shielded = piece => piece.statuses.some(row => String(typeof row === 'string' ? row : row.statusName || row.name).toLowerCase() === 'shielded');
const attacks = state => state.log.flatMap(row => row.events || []).filter(row => row.type === 'ranged_attack');
async function sceneFor(context, id) {
  const base = (await read(parent + 'point-defense-target-coexistence/remove-two/authority.json')).state;
  const candidatesBySide = (await read(parent + 'point-defense-target-coexistence/compile.json')).candidatesBySide;
  candidatesBySide.player2.units.push({ unitInstanceId: 'zealots', recordKey: 'army_units:zealot', compositionKind: 'small', upgrades: [] });
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    characteristicDefinitionIds: definitionIds, reactionDefinitionIds, includeShieldedLifecycle: true });
  const fields = ['round', 'phase', 'activeSideKey', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale',
    'board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'supplyLossLedger', 'phaseFirstActorByRound'];
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    log: [], officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  const factoryFirstWounds = target(state).models[0].remainingWounds;
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'immortals' ? 21 : piece.id === 'marauders' ? 10
        : piece.id === 'zealots' ? 17 + index * (model.baseWidthInches + 0.1) : 11 + index % 3 * (model.baseWidthInches + 0.1),
      yInches: piece.id === 'zealots' ? 8 : piece.id === 'marines'
        ? 5.5 + Math.floor(index / 3) * (model.baseDepthInches + 0.1) : 12 + index * (model.baseDepthInches + 0.1) }));
  }
  target(state).damageMarker = initialDamage[id];
  target(state).statuses = initialDamage[id] <= 6 ? ['Shielded'] : [];
  synchronizeOfficialEffectiveHitPointWoundsV1(state, target(state), { includeUnmodifiedProfiles: true });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
  return { state, candidatesBySide, factoryFirstWounds, audits: setup.state.armyCompositionUpgradeAuditsBySide };
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
async function checkpoint(native, id) {
  const current = await native.store.loadRoom(roomId(id));
  await save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
function choiceFor(runtime, state, targetId = 'immortals') {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const domain = menu.parameterDomains.find(row => row.actionType === 'pass_reaction_family_window');
    assert.ok(domain); return { domain, parameters: {} };
  }
  if (state.pendingOfficialAttackTargetReaction || state.pendingOfficialRangedPrecisionChoice || state.pendingCurrentProductRangedCasualtyChoice) {
    const domain = menu.parameterDomains[0];
    if (domain) {
      const field = domain.sourceDomain.parameterSchema.required[0];
      const value = domain.sourceDomain.parameterSchema[field];
      return { domain, parameters: { [field]: value.items ? value.items.enum.slice(0, value.maxItems) : value.enum[0] } };
    }
    assert.equal(menu.candidates.length, 1);
    return { candidate: menu.candidates[0] };
  }
  const domain = menu.parameterDomains.find(row => attacks(state).length
    ? ['finish_activation', OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE].includes(row.actionType)
    : row.pieceId === 'marines' && row.weaponName === 'C-14 rifle');
  assert.ok(domain, JSON.stringify(menu.parameterDomains.map(row => ({ type: row.actionType, piece: row.pieceId }))));
  return { domain, parameters: attacks(state).length ? {} : { targetUnitId: targetId } };
}
function attackFinished(state) {
  return attacks(state).length === 1 && !state.pendingOfficialAttackTargetReaction
    && !state.pendingOfficialReactionWindow && !state.pendingOfficialRangedPrecisionChoice && !state.pendingCurrentProductRangedCasualtyChoice;
}
async function nativeNext(branch, id, credentials) {
  const current = await checkpoint(branch.native, id);
  const choice = choiceFor(branch.runtime, current.envelope.state);
  const query = !attacks(current.envelope.state).length && !choice.candidate && choice.domain.weaponName
    ? branch.runtime.query(current.envelope.state, { queryKind: 'ranged_attack_preview', pieceId: 'marines',
      weaponName: 'C-14 rifle', parameters: choice.parameters }) : null;
  assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), current);
  const applied = await branch.native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey: 'step-' + current.stateRevision,
    ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
      : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
  if (query) assert.deepEqual(applied.preview.core.action, query.result.action);
  return checkpoint(branch.native, id);
}
function assertNativeResult(state, id) {
  const piece = target(state);
  const damage = attacks(state)[0].stages.damage.totalDamage;
  const total = initialDamage[id] + damage;
  const alive = total < 14;
  assert.equal(piece.currentModels, alive ? 1 : 0);
  assert.equal(shielded(piece), initialDamage[id] <= 6 && alive && total <= 6);
  assert.equal(piece.models[0].remainingWounds, alive ? 14 - total : 0);
  assert.equal(piece.firstModelShieldCapacityApplied, alive);
  assert.equal(state.officialShieldedLifecycleHistory?.length || 0, initialDamage[id] <= 6 && !shielded(piece) ? 1 : 0);
  return { incomingDamage: damage, totalDamage: total, shieldedAfter: shielded(piece), remainingWounds: piece.models[0].remainingWounds,
    targetDestroyed: !alive, actualShieldLossObserved: initialDamage[id] <= 6 && !shielded(piece) };
}
function fixedAttack(runtime, initial, hitCount, targetId = 'immortals') {
  let state = structuredClone(initial);
  const trace = [];
  for (let step = 0; step < 40; step++) {
    if (attackFinished(state)) return { state, trace, event: attacks(state)[0] };
    const choice = choiceFor(runtime, state, targetId);
    const action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
    const chanceReveals = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      chanceReveals.push(...Array.from({ length: action.chance.layout[kind] }, (_, index) => kind === 'hit' && index < hitCount ? 6 : 1));
    }
    state = runtime.apply(state, action, { chanceReveals }).state;
    trace.push({ actionType: action.actionType, chanceReveals });
  }
  assert.fail('single fixed attack exceeded its stages');
}

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'initial-wounds-red.json',
  contractVersion: 'T28-W3-07-shielded-source-lifecycle-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const red = await read(output + 'initial-wounds-red.json');
    assert.equal(red.actualFactoryInvoked, true); assert.equal(red.actualRemainingWounds, 8);
    const source = context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'].payload.items[0].subItems.find(row => row.title === 'SHIELDED');
    const ref = await save('read.json', { source, redRef: output + 'initial-wounds-red.json', modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const id of ids) {
      const scene = await sceneFor(context, id);
      assert.equal(scene.factoryFirstWounds, 14);
      const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.23.0');
      const product = registry();
      try {
        const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
          snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef, referenceSources: m.source.references,
          sourcePolicy: m.source.policy, components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.23.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
        await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
          scenario: { scale: 1000, round: 1, phase: 'assault', placementAndPhaseDeclared: true, fullMatch: false,
            declaredPriorDamage: initialDamage[id], originalFirstModelStillPresent: true, nativeDice: true } }));
        cases.push({ id, initialWounds: target(scene.state).models[0].remainingWounds, factoryInitialWounds: scene.factoryFirstWounds,
          candidatesBySide: scene.candidatesBySide, audits: scene.audits });
      } finally { product.close(); }
    }
    const ref = await save('compile.json', { cases }); return { evidenceRef: ref, checkpointRef: output + 'fresh/authority.json' };
  } },
  { name: 'consume', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        for (let step = 0; step < 30; step++) {
          const current = await checkpoint(branch.native, id);
          if (attackFinished(current.envelope.state)) break;
          await nativeNext(branch, id, credentials);
        }
        const current = await checkpoint(branch.native, id);
        assert.equal(attackFinished(current.envelope.state), true);
        const value = { id, revision: current.stateRevision, ...assertNativeResult(current.envelope.state, id) };
        await save(id + '/consume.json', value); cases.push(value);
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/successor.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        let current = await checkpoint(branch.native, id);
        if (current.envelope.state.activeSideKey !== 'player2') current = await nativeNext(branch, id, credentials);
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        assert.equal(current.envelope.state.pendingOfficialReactionWindow, undefined);
        assert.equal(current.envelope.state.selectedRosterActivationWindow, undefined);
        const menu = await branch.native.room.legalSpace({ roomId: roomId(id), seatToken: credentials.player2.seatToken });
        assert.equal(menu.ok, true, JSON.stringify(menu));
        const value = { id, revision: current.stateRevision, nextSide: 'player2', nextMenuCount:
          menu.legalSpace.parameterDomains.length + menu.legalSpace.finiteActions.length };
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
        await branch.native.restoreDependencies(roomId(id), branch.authority);
        const before = await branch.native.store.loadRoom(roomId(id));
        const bundle = await branch.native.store.loadReplayBundle(roomId(id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const file of checkpoints) {
          const expected = (await read(output + id + '/' + file)).envelope;
          const replay = branch.native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), before);
        cases.push({ id, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
if (result.status !== 'passed') process.exitCode = 1;

if (result.status === 'passed' && process.argv.includes('--facts-control')) {
  const facts = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
    contractVersion: 'T28-W3-07-shielded-fixed-threshold-and-dependency-v1',
  }, steps: [{ name: 'consume', openProduct, check: async product => {
    const branch = await product.branch('fresh');
    try {
      const { runtime, authority, native } = branch;
      const original = await native.store.loadRoom(roomId('fresh'));
      const results = [];
      for (const [name, hits, targetId] of [['equal', 6, 'immortals'], ['exceeds', 7, 'immortals'], ['next-model', 7, 'zealots']]) {
        const state = structuredClone(authority.state);
        const piece = state.pieces.find(row => row.id === targetId);
        piece.officialAbilityEffects = [{ id: 'dependent', requiresStatus: 'Shielded' }, { id: 'independent' }];
        piece.combatEffects = [{ id: 'combat-dependent', requiredStatus: 'shielded' }];
        state.board.effectMarkers = [{ id: 'dependent-marker', targetPieceId: piece.id, requiresStatus: 'Shielded' },
          { id: 'independent-marker', targetPieceId: piece.id }];
        const fixed = fixedAttack(runtime, state, hits, targetId);
        const after = fixed.state.pieces.find(row => row.id === targetId);
        assert.equal(fixed.event.stages.damage.totalDamage, hits);
        assert.equal(shielded(after), name === 'equal');
        assert.equal(after.currentModels, name === 'next-model' ? piece.currentModels - 1 : 1);
        assert.equal(after.models.find(model => !model.isDestroyed).remainingWounds, name === 'equal' ? 8 : name === 'exceeds' ? 7 : 4);
        assert.equal(after.officialAbilityEffects.some(row => row.id === 'dependent'), name === 'equal');
        assert.equal(after.officialAbilityEffects.some(row => row.id === 'independent'), true);
        assert.equal(fixed.state.board.effectMarkers.some(row => row.id === 'dependent-marker'), name === 'equal');
        assert.equal(fixed.state.board.effectMarkers.some(row => row.id === 'independent-marker'), true);
        const refreshed = createOfficialSelectedRosterAbilityRuntimeV1(fixed.state).cleanup(fixed.state);
        assert.equal(shielded(refreshed.pieces.find(row => row.id === targetId)), name === 'equal');
        const sourceState = structuredClone(fixed.state);
        delete sourceState.selectedRosterActivationWindow;
        sourceState.activeSideKey = 'player1';
        sourceState.pieces.find(row => row.id === 'marines').activatedPhases.assault = false;
        const query = runtime.query(sourceState, { queryKind: 'ranged_attack_preview', pieceId: 'marines',
          weaponName: 'C-14 rifle', parameters: { targetUnitId: targetId } });
        assert.equal(query.result.action.actionType === 'declare_ranged_attack_before_target_reaction', name === 'equal');
        const ref = await save('fixed-' + name + '.json', { ...fixed, diagnosticDependentAnnotations: true,
          actualAbilityProducingAnnotationsExecuted: false, queryAfter: query, cleanupCallbackOnly: true, nativeReceiptsCreated: false });
        results.push({ name, hits, shieldedAfter: shielded(after), currentModels: after.currentModels, evidenceRef: ref });
      }
      assert.deepEqual(await native.store.loadRoom(roomId('fresh')), original);
      const ref = await save('facts-control.json', { cases: results, roomUnchanged: true,
        healNativeCombination: 'pending_actual_legal_heal_source', otherDamageChannelNewPolicyNative: 'pending', modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { branch.close(); }
  } }] });
  console.log(JSON.stringify({ factsControl: facts.status, failures: facts.failures }));
  if (facts.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'rapid-ingress-producer/cold-recovery.json',
    contractVersion: 'T28-W3-07-shielded-legacy-shared-casualty-v1',
  }, steps: [{ name: 'coldRecovery', openProduct: sourceProduct, check: async () => {
    const cases = [];
    const specs = [
      { folder: 'rapid-ingress-producer', id: 'before', releaseId: 'wave3-u83-c84-r50-rapid-ingress-producer-before-v1',
        roomId: 'wave3-rapid-ingress-producer-before', options: { definitionIds, includeRanged: true,
          weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'],
          includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true } },
      { folder: 'hits-armour-reaction', id: 'last', releaseId: 'wave3-u83-c84-r50-hits-armour-reaction-last-v1',
        roomId: 'wave3-hits-armour-reaction-last', options: { definitionIds: ['unit:zeratul/shadow-strike-combat-phase@1'], includeMelee: true, includeHits: true, includeArmourReactions: true } },
      { folder: 'point-defense-target-coexistence', id: 'remove-two', releaseId: 'wave3-u83-c84-r50-point-defense-target-coexistence-remove-two-v1',
        roomId: 'wave3-point-defense-target-coexistence-remove-two', options: { ...options,
          weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'], includePointDefenseChoices: true } },
      { folder: 'template-target-reaction', id: 'spillover-first', releaseId: 'wave3-u83-c84-r50-template-target-reaction-spillover-first-v1',
        roomId: 'wave3-template-target-reaction-spillover-first', options: { ...options, definitionIds: null, includeTemplateAttacks: true, includeTemplateBatchOrder: true } },
      { folder: 'melee-target-reaction', id: 'shield', releaseId: 'wave3-u83-c84-r50-melee-target-reaction-shield-v1',
        roomId: 'wave3-melee-target-reaction-shield', options: { definitionIds: [], includeMelee: true, includeTargetReactions: true, includeArmourReactions: true } },
      { folder: 'impact-armour-reaction', id: 'use', releaseId: 'wave3-u83-c84-r50-impact-armour-reaction-use-v1',
        roomId: 'wave3-impact-armour-reaction-use', options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } },
    ];
    for (const spec of specs) {
      const cache = 'legacy/' + spec.folder + '-' + spec.id + '.json';
      const prior = await saved(cache); if (prior) { cases.push(prior); continue; }
      const prefix = parent + spec.folder + '/' + spec.id + '/';
      const product = registry(path.join(root, parent, spec.folder));
      try {
        if (spec.options.definitionIds === null) spec.options.definitionIds = (await read(prefix + 'authority.json')).state.officialCharacteristicStatusFamilySourceBundle.definitionIds;
        const context = await product.resolver.resolve({ releaseId: spec.releaseId, purpose: 'ability_component' });
        const authority = await read(prefix + 'authority.json');
        const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, ...spec.options });
        assert.deepEqual(runtime.descriptor, await read(prefix + 'runtime.json'));
        const native = openWave3EngineeringRoomV1({ directory: path.join(root, prefix), filename: 'room.sqlite',
          rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
        try {
          const before = await native.store.loadRoom(spec.roomId);
          await native.restoreDependencies(spec.roomId, authority);
          const bundle = await native.store.loadReplayBundle(spec.roomId);
          const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
          const checkpoints = (await fs.readdir(path.join(root, prefix))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
          for (const file of checkpoints) {
            const expected = (await read(prefix + file)).envelope;
            const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
            assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
          }
          assert.deepEqual(await native.store.loadRoom(spec.roomId), before);
          const value = { roomId: spec.roomId, receipts: receipts.length, checkpoints: checkpoints.length,
            descriptorExact: true, replayExact: true, currentUnchanged: true };
          await save(cache, value); cases.push(value);
        } finally { native.close(); }
      } finally { product.close(); }
    }
    const ref = await save('legacy-control.json', { cases, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
  if (legacy.status !== 'passed') process.exitCode = 1;
}
