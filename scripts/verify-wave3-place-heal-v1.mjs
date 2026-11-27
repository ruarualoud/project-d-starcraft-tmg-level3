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
import { createOfficialRelocationFamilyAdapterV1 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { evaluateOfficialAssaultPlaceCoherencyV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialEngagementGraphV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { projectOfficialRelocationGeometryStateV13, OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 }
  from '../packages/rule-atoms/official-relocation-geometry-policy-v13.mjs';
import { projectOfficialAbilityReferenceStateV13, OFFICIAL_ABILITY_REFERENCE_POLICY_V13 }
  from '../packages/rule-atoms/official-ability-reference-policy-v13.mjs';
import { enumerateOfficialAbilityResourcePaymentsV1 } from '../packages/rule-atoms/official-card-build-payment-rules-kernel-v1.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'place-heal/';
const directory = path.join(root, output);
const ids = ['blink-lost', 'blink-shielded', 'blink-pass', 'blink-spend-source', 'void-engage'];
const relocationDefinitionIds = ['unit:stalker/blink-movement-phase@1', 'unit:zeratul/void-blink-assault-phase@1'];
const reactionDefinitionIds = ['card:twilight_council/veil-of-shadows-any@1'];
const roomId = id => 'wave3-place-heal-' + id;
const releaseId = id => 'wave3-u83-c84-r50-place-heal-' + id + '-v1';
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
  const product = registry(path.join(root, parent, 'shielded-lifecycle'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-shielded-lifecycle-fresh-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state, definitionIds: [] });
const actorId = id => id === 'void-engage' ? 'zeratul' : 'stalkers';
const actor = (state, id) => state.pieces.find(piece => piece.id === actorId(id));
const status = piece => piece.statuses.some(value => String(typeof value === 'string' ? value : value.statusName || value.name).toLowerCase() === 'shielded');
const events = state => state.log.flatMap(row => row.events || []);
const useHeal = id => !['blink-pass', 'blink-spend-source'].includes(id);
function placeParameters(state, id) {
  const piece = actor(state, id);
  const source = id === 'blink-spend-source'
    ? state.cardResources.player1.find(card => card.officialCardRecordKey === 'tactical_cards:twilight_council')
    : state.cardResources.player1.find(card => card.cardKind === 'faction');
  const shift = id === 'void-engage' ? 6 : 3;
  return { leadingModelId: piece.models[0].id, paymentCardInstanceIds: [source.cardInstanceId],
    placements: piece.models.filter(model => !model.isDestroyed).map(model => ({ modelId: model.id,
      xMilliInches: Math.round((model.xInches + shift) * 1000), yMilliInches: Math.round(model.yInches * 1000),
      rotationDegrees: 0, elevation: 'ground', supportTerrainIds: [] })) };
}
function moveParameters(state, id) {
  const models = actor(state, id).models;
  const first = models[0];
  return { leadingModelId: first.id, path: [
    { xMilliInches: Math.round(first.xInches * 1000), yMilliInches: Math.round(first.yInches * 1000) },
    { xMilliInches: Math.round(first.xInches * 1000) + 1000, yMilliInches: Math.round(first.yInches * 1000) }],
  placements: models.slice(1).map(model => ({ modelId: model.id,
    xMilliInches: Math.round(model.xInches * 1000) + 1000, yMilliInches: Math.round(model.yInches * 1000),
    rotationDegrees: 0, elevationId: 'ground', supportSurfaceIds: [] })) };
}
async function sceneFor(context, id) {
  const base = (await read(parent + 'shielded-lifecycle/fresh/authority.json')).state;
  const candidatesBySide = {
    player1: { sideKey: 'player1', scaleId: 'Skirmish', mineralBudget: 1000,
      factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:twilight_council'], units: [
        { unitInstanceId: 'stalkers', recordKey: 'army_units:stalker', compositionKind: id === 'blink-large-after' ? 'large' : 'small', upgrades: [] },
        { unitInstanceId: 'zeratul', recordKey: 'army_units:zeratul', compositionKind: 'small', upgrades: [] },
      ] },
    player2: { sideKey: 'player2', scaleId: 'Skirmish', mineralBudget: 1000,
      factionRecordKey: 'tactical_cards:raynor_s_raiders', tacticalCardRecordKeys: [], units: [
        { unitInstanceId: 'marines', recordKey: 'army_units:marine', compositionKind: 'small', upgrades: [] },
      ] },
  };
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    reactionDefinitionIds, relocationDefinitionIds, includeShieldedLifecycle: true });
  const fields = ['round', 'firstPlayerSideKey', 'engagementScale', 'armyBuildingEngagementScale', 'board',
    'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle', 'officialMissionRuntimeDescriptor', 'supplyLossLedger'];
  const phase = id === 'void-engage' ? 'assault' : 'movement';
  let state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(base[key])])), ...setup.state,
    phase, activeSideKey: 'player1', phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } },
    log: [], officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false;
    piece.models.forEach((model, index) => Object.assign(model, { isOnField: true,
      xInches: piece.id === 'zeratul' ? 10 : piece.id === 'stalkers' ? 8 : 18 + index % 3 * (model.baseWidthInches + 0.1),
      yInches: piece.id === 'stalkers' ? 12 + index * (model.baseDepthInches + 0.1)
        : 22 + (piece.id === 'marines' ? Math.floor(index / 3) * (model.baseDepthInches + 0.1) : 0) }));
  }
  const piece = actor(state, id);
  piece.damageMarker = id === 'blink-shielded' ? 2 : 4;
  piece.statuses = id === 'blink-shielded' ? ['Shielded'] : [];
  synchronizeOfficialEffectiveHitPointWoundsV1(state, piece, { includeUnmodifiedProfiles: true });
  state = refreshOfficialReleaseRosterDerivedStateV2({ context, state });
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
    return { context, authority, runtime, native, close: () => native.close() };
  } };
}
async function checkpoint(native, id) {
  const current = await native.store.loadRoom(roomId(id));
  await save(id + '/checkpoint-r' + current.stateRevision + '.json', { envelope: current.envelope });
  return current;
}
async function commitChoice(branch, id, credentials, domain, parameters) {
  const current = await checkpoint(branch.native, id);
  await branch.native.commit({ roomId: roomId(id), credential: credentials[current.envelope.state.activeSideKey],
    operationKey: 'step-' + current.stateRevision, select: row => row.domainId === domain.domainId, parameters: () => parameters });
  return checkpoint(branch.native, id);
}

async function oldRuntimeFor(geometry) {
  const prefix = 'build/ticket-28-wave3-geometry-20261112-v1/relocation/';
  const authority = await read(prefix + 'authority.json');
  const dataset = await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json');
  return { authority, runtime: createOfficialCurrentProductMatchRuntimeV7({
    legacyRuntime: createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
      createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(authority.state) }) }),
    faqReactionPolicy: OFFICIAL_FAQ_REACTION_POLICY_V13, abilityReferencePolicy: OFFICIAL_ABILITY_REFERENCE_POLICY_V13,
    ...(geometry ? { relocationGeometryPolicy: OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 } : {}) }) };
}
function reconstructOldPrefix(runtime, authority, count) {
  const native = openWave3EngineeringRoomV1({ directory, filename: ':memory:', rulesRuntime: runtime });
  try {
  let envelope = native.engine.createEnvelope({ roomId: 'relocation-corrected', dataVersion: authority.dataVersion,
    dependencies: authority.dependencies, rulesDisplay: authority.rulesDisplay, state: authority.state });
  let state = envelope.state;
  const trace = [];
  for (let index = 0; index < count; index++) {
    const menu = runtime.enumerate(state);
    let action;
    if (index < 2) {
      const candidate = menu.candidates.find(row => index === 0
        ? row.actionType === 'resolve_mission_start_of_round'
        : row.actionType === 'choose_first_actor' && row.chosenFirstActorSideKey === 'player2');
      assert.ok(candidate);
      action = Object.fromEntries(Object.entries(candidate).filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)));
    } else {
      const domain = menu.parameterDomains.find(row => index === 2
        ? row.abilityName === 'Omega Network' && row.pieceId === 'player2-queen'
        : index === 3 ? row.actionType === 'finish_activation' && row.pieceId === 'player2-queen'
          : row.abilityName === 'Go! Go! Go!' && row.pieceId === 'test-raynor');
      assert.ok(domain);
      const modelId = index === 4 ? domain.parameterSchema.leadingModelId.enum[0] : null;
      const parameters = index === 2 ? { activeUnitId: domain.parameterSchema.activeUnitId.const,
        paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 12000 }
        : index === 3 ? {} : { leadingModelId: modelId,
          placements: [{ modelId, xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }],
          path: [{ xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }] };
      action = runtime.instantiate(state, domain, parameters).action;
    }
    const applied = runtime.apply(state, action, { postRevision: index + 1 });
    envelope = native.engine.createEnvelope({ roomId: 'relocation-corrected', matchBinding: envelope.matchBinding,
      stateRevision: index + 1, state: applied.state });
    state = envelope.state;
    trace.push({ revision: index + 1, actionType: action.actionType, stateHash: hash(state) });
  }
  return { state, trace };
  } finally { native.close(); }
}

async function reconstructOldNativePrefix(runtime, authority) {
  const branchDirectory = path.join(directory, 'legacy-reconstruction');
  await fs.mkdir(branchDirectory, { recursive: true });
  const native = openWave3EngineeringRoomV1({ directory: branchDirectory, filename: ':memory:', rulesRuntime: runtime });
  const id = 'relocation-corrected';
  try {
    const credentials = await native.create(id, authority);
    const trace = [];
    for (let index = 0; index < 5; index++) {
      const current = await native.store.loadRoom(id);
      if (index < 2) {
        await native.commit({ roomId: id, credential: credentials[current.envelope.state.activeSideKey], kind: 'finite',
          operationKey: 'legacy-prefix-' + index, select: row => index === 0 ? row.action.actionType === 'resolve_mission_start_of_round'
            : row.action.actionType === 'choose_first_actor' && row.action.chosenFirstActorSideKey === 'player2' });
      } else {
        await native.commit({ roomId: id, credential: credentials[current.envelope.state.activeSideKey],
          operationKey: 'legacy-prefix-' + index, select: domain => index === 2
            ? domain.abilityName === 'Omega Network' && domain.pieceId === 'player2-queen'
            : index === 3 ? domain.actionType === 'finish_activation' && domain.pieceId === 'player2-queen'
              : domain.abilityName === 'Go! Go! Go!' && domain.pieceId === 'test-raynor', parameters: domain => {
            if (index === 2) return { activeUnitId: domain.parameterSchema.activeUnitId.const,
              paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 12000 };
            if (index === 3) return {};
            const modelId = domain.parameterSchema.leadingModelId.enum[0];
            return { leadingModelId: modelId, placements: [{ modelId, xMilliInches: 41000, yMilliInches: 12000,
              elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }],
              path: [{ xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }] };
          } });
      }
      const next = await native.store.loadRoom(id);
      trace.push({ revision: next.stateRevision, stateHash: next.envelope.stateHash });
    }
    const current = await native.store.loadRoom(id);
    const bundle = await native.store.loadReplayBundle(id);
    await save('legacy-reconstruction/evidence.json', { originalRoomModified: false, scope: 'new_isolated_in_memory_engineering_branch',
      trace, bundle, finalEnvelope: current.envelope });
    return { state: current.envelope.state, trace };
  } finally { native.close(); }
}

await fs.mkdir(directory, { recursive: true });
if (process.argv.includes('--inspect-legacy-origin')) {
  const product = await oldRuntimeFor(false);
  const actual = reconstructOldPrefix(product.runtime, product.authority, 4);
  const expected = await read('build/ticket-28-wave3-geometry-20261112-v1/relocation/source-state.json');
  const differences = [];
  function diff(a, b, path = '') {
    if (hash(a ?? null) === hash(b ?? null)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], path + '/' + key);
    } else differences.push({ path, actual: a ?? null, expected: b ?? null });
  }
  diff(actual.state, expected);
  await save('legacy-origin-actual.json', actual);
  await save('legacy-origin-differences.json', { differences, count: differences.length, nativeActions: 0, modelCalls: 0 });
  console.log(JSON.stringify({ count: differences.length, differences: differences.slice(0, 18) }));
  process.exit(0);
}
if (process.argv.includes('--inspect-compile')) {
  const context = await sourceProduct();
  const cases = [];
  for (const id of ids) {
    const scene = await sceneFor(context, id);
    const runtime = runtimeFor(context, scene.state);
    cases.push({ id, cards: scene.state.cardResources.player1,
      relocation: runtime.relocationAdapter.legalSpace(scene.state, { includeDisabled: true }) });
  }
  await save('compile-diagnostic.json', { cases, nativeActions: 0, modelCalls: 0 });
  console.log(JSON.stringify(cases.map(row => ({ id: row.id, disabled: row.relocation.candidates,
    domains: row.relocation.parameterDomains.map(domain => domain.definitionId) }))));
  process.exit(0);
}
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2',
  sourceRef: parent + 'shielded-lifecycle/read.json', contractVersion: 'T28-W3-07-paid-place-native-heal-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const ref = await save('read.json', { sources: [
      context.dataset.recordsByKey['army_units:stalker'].payload.upgrades.find(row => row.name === 'Blink'),
      context.dataset.recordsByKey['army_units:zeratul'].payload.upgrades.find(row => row.name === 'Void Blink'),
      context.dataset.recordsByKey['tactical_cards:twilight_council'].payload.boosts.find(row => row.name === 'Veil of Shadows') ],
    modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', repairRef: output + 'coherency-source-repair.json', openProduct: sourceProduct, check: async context => {
    const cases = [];
    for (const id of ids) {
      const scene = await sceneFor(context, id);
      const runtime = runtimeFor(context, scene.state);
      assert.equal(runtime.descriptor.runtimeVersion, '3.24.0');
      assert.deepEqual(runtime.relocationBundle.definitionIds, [...relocationDefinitionIds].sort());
      assert.ok(runtime.enumerate(scene.state).parameterDomains.some(row => row.sourceRuntimeKind === 'relocation' && row.pieceId === actorId(id)));
      const product = registry();
      try {
        const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
          snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
          referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.24.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
        await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
          scenario: { scale: 1000, round: 1, phase: scene.state.phase, placementAndPhaseDeclared: true, fullMatch: false,
            declaredPriorDamage: actor(scene.state, id).damageMarker, abilityTiming: id, placementNativeProducer: true } }));
        cases.push({ id, candidatesBySide: scene.candidatesBySide, audits: scene.audits });
      } finally { product.close(); }
    }
    const ref = await save('compile.json', { cases }); return { evidenceRef: ref, checkpointRef: output + ids[0] + '/authority.json' };
  } },
  { name: 'consume', repairRef: output + 'assault-place-geometry-repair.json', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        const current = await checkpoint(branch.native, id);
        const domain = branch.runtime.enumerate(current.envelope.state).parameterDomains.find(row =>
          row.sourceRuntimeKind === 'relocation' && row.pieceId === actorId(id));
        const parameters = placeParameters(current.envelope.state, id);
        const query = branch.runtime.query(current.envelope.state, { queryKind: 'relocation_preview', pieceId: actorId(id),
          definitionId: domain.definitionId, parameters });
        assert.deepEqual(await branch.native.store.loadRoom(roomId(id)), current);
        const applied = await branch.native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'step-0',
          select: row => row.domainId === domain.domainId, parameters: () => parameters });
        assert.deepEqual(applied.preview.core.action, query.result.action);
        const next = await checkpoint(branch.native, id);
        const state = next.envelope.state;
        assert.equal(actor(state, id).models[0].xInches, id === 'void-engage' ? 16 : 11);
        assert.equal(events(state).filter(row => row.type === 'relocation_resource_paid').length, 1);
        assert.equal(!!state.pendingOfficialPostPlaceReaction, id !== 'blink-spend-source');
        assert.equal(!!state.pendingOfficialReactionWindow, id !== 'blink-spend-source');
        if (id === 'void-engage') assert.ok(deriveOfficialEngagementGraphV2(state).engagedUnitIds.includes('zeratul'));
        const value = { id, revision: next.stateRevision, queryEqualsNativePreview: true,
          resourcePaid: events(state).find(row => row.type === 'relocation_resource_paid'),
          postPlaceWindowOpened: !!state.pendingOfficialPostPlaceReaction };
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
        for (let step = 0; step < 4; step++) {
          const current = await checkpoint(branch.native, id);
          if (!current.envelope.state.pendingOfficialReactionWindow) break;
          const state = current.envelope.state;
          const use = state.activeSideKey === 'player1' && useHeal(id);
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType ===
            (use ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window'));
          assert.ok(domain);
          await commitChoice(branch, id, credentials, domain, use ? { paymentCardInstanceIds: [] } : {});
        }
        let current = await checkpoint(branch.native, id);
        const state = current.envelope.state;
        assert.equal(state.pendingOfficialReactionWindow, undefined);
        assert.equal(state.pendingOfficialPostPlaceReaction, undefined);
        assert.equal(state.activeSideKey, 'player1');
        assert.equal(actor(state, id).damageMarker, useHeal(id) ? id === 'blink-shielded' ? 0 : 2 : 4);
        assert.equal(status(actor(state, id)), id === 'blink-shielded');
        const capacity = id === 'void-engage' ? 8 : 9;
        assert.equal(actor(state, id).models[0].remainingWounds, capacity - actor(state, id).damageMarker);
        assert.equal(state.officialReactionHistory?.length || 0, useHeal(id) ? 1 : 0);
        if (id !== 'blink-spend-source') {
          assert.equal(state.officialPostPlaceReactionHistory.length, 1);
          assert.equal(state.officialReactionResolutionHistory.filter(row => row.consumedByHost).length, 1);
        }
        await save(id + '/healed.json', { envelope: current.envelope, actualHeal: useHeal(id) });
        if (id !== 'void-engage') {
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'move' && row.pieceId === actorId(id));
          assert.ok(domain);
          current = await commitChoice(branch, id, credentials, domain, moveParameters(state, id));
        }
        const finish = branch.runtime.enumerate(current.envelope.state).parameterDomains.find(row =>
          row.actionType === 'finish_activation' && row.pieceId === actorId(id));
        assert.ok(finish);
        current = await commitChoice(branch, id, credentials, finish, {});
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        assert.equal(current.envelope.state.selectedRosterActivationWindow, undefined);
        const value = { id, revision: current.stateRevision, priorDamage: id === 'blink-shielded' ? 2 : 4,
          finalDamage: actor(current.envelope.state, id).damageMarker, shieldedAfter: status(actor(current.envelope.state, id)),
          remainingWounds: actor(current.envelope.state, id).models[0].remainingWounds,
          healUsed: useHeal(id), coreAction: id === 'void-engage' ? 'hold_before_action_finish' : 'move',
          nextSide: 'player2', historyConsumedOnce: id !== 'blink-spend-source' };
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

if (result.status === 'passed' && process.argv.includes('--formation-control')) {
  const id = 'blink-large-after';
  const formation = await runProductBoundaryCheck({ directory: path.join(directory, 'formation-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
    contractVersion: 'T28-W3-07-large-formation-after-core-action-place-v1',
  }, steps: [
    { name: 'read', openProduct: sourceProduct, check: async context => {
      const ref = await save('formation-read.json', { record: context.dataset.recordsByKey['army_units:stalker'],
        order: ['move', 'blink', 'heal', 'finish'], modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } },
    { name: 'compile', openProduct: sourceProduct, check: async context => {
      const scene = await sceneFor(context, id);
      assert.ok(actor(scene.state, id).models.length > 1);
      const runtime = runtimeFor(context, scene.state);
      const product = registry();
      try {
        const descriptorRef = await save(id + '/runtime.json', runtime.descriptor);
        const m = context.manifest;
        product.resolver.register(createOfficialReleaseManifestV2({ releaseId: releaseId(id), dataset: context.dataset,
          snapshot: context.snapshot, sourceRevision: await read(m.source.sourceRevisionRef), datasetRef: m.source.datasetRef,
          snapshotRef: m.source.snapshotRef, sourceRevisionRef: m.source.sourceRevisionRef,
          referenceSources: m.source.references, sourcePolicy: m.source.policy,
          components: { ...m.components, rulesRuntime: { ref: descriptorRef, version: '3.24.0',
            integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } }));
        const resolved = await product.resolver.resolve({ releaseId: releaseId(id), purpose: 'ability_component' });
        const ref = await save(id + '/authority.json', createWave3ComponentEngineeringAuthorityV1({ context: resolved, state: scene.state,
          scenario: { scale: 1000, round: 1, phase: 'movement', placementAndPhaseDeclared: true, fullMatch: false,
            declaredPriorDamage: 4, multiModelFormation: true, afterCoreAction: true } }));
        await save('formation-compile.json', { models: actor(scene.state, id).models.length, audits: scene.audits });
        return { evidenceRef: output + 'formation-compile.json', checkpointRef: ref };
      } finally { product.close(); }
    } },
    { name: 'consume', openProduct, check: async product => {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        let current = await checkpoint(branch.native, id);
        if (current.stateRevision === 0) {
          const domain = branch.runtime.enumerate(current.envelope.state).parameterDomains.find(row => row.actionType === 'move' && row.pieceId === 'stalkers');
          assert.ok(domain);
          current = await commitChoice(branch, id, credentials, domain, moveParameters(current.envelope.state, id));
        }
        if (current.stateRevision === 1) {
          const state = current.envelope.state;
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.sourceRuntimeKind === 'relocation' && row.pieceId === 'stalkers');
          assert.ok(domain);
          const parameters = placeParameters(state, id);
          assert.throws(() => branch.runtime.instantiate(state, domain, { ...parameters, placements: parameters.placements.slice(1) }), /DENOMINATOR_INVALID/);
          assert.throws(() => branch.runtime.instantiate(state, domain, { ...parameters,
            placements: [parameters.placements[0], parameters.placements[0]] }), /PLACEMENT_MODEL_INVALID/);
          const query = branch.runtime.query(state, { queryKind: 'relocation_preview', pieceId: 'stalkers', parameters });
          const applied = await branch.native.commit({ roomId: roomId(id), credential: credentials.player1,
            operationKey: 'step-1', select: row => row.domainId === domain.domainId, parameters: () => parameters });
          assert.deepEqual(applied.preview.core.action, query.result.action);
          current = await checkpoint(branch.native, id);
        }
        assert.equal(current.envelope.state.selectedRosterActivationWindow.stage, 'after_action');
        assert.equal(actor(current.envelope.state, id).models.every(model => model.xInches === 12), true);
        assert.ok(current.envelope.state.pendingOfficialPostPlaceReaction);
        const ref = await save('formation-consume.json', { revision: current.stateRevision, ordinaryMovePreserved: true,
          afterActionWindowPreserved: true, allModelsPlaced: actor(current.envelope.state, id).models.length,
          incompleteAndDuplicateModelsRejected: true, queryEqualsNativePreview: true });
        return { evidenceRef: ref, checkpointRef: output + id + '/checkpoint-r2.json' };
      } finally { branch.close(); }
    } },
    { name: 'successor', openProduct, check: async product => {
      const branch = await product.branch(id);
      try {
        const credentials = await branch.native.create(roomId(id), branch.authority);
        let current = await checkpoint(branch.native, id);
        while (current.envelope.state.pendingOfficialReactionWindow) {
          const state = current.envelope.state;
          const use = state.activeSideKey === 'player1';
          const domain = branch.runtime.enumerate(state).parameterDomains.find(row => row.actionType ===
            (use ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window'));
          assert.ok(domain);
          current = await commitChoice(branch, id, credentials, domain, use ? { paymentCardInstanceIds: [] } : {});
        }
        const state = current.envelope.state;
        assert.equal(actor(state, id).damageMarker, 2);
        assert.equal(status(actor(state, id)), false);
        assert.equal(actor(state, id).models[0].remainingWounds, 7);
        assert.equal(actor(state, id).models[1].remainingWounds, 6);
        const menu = branch.runtime.enumerate(state);
        assert.equal(menu.parameterDomains.some(row => row.actionType === 'move' && row.pieceId === 'stalkers'), false);
        const finish = menu.parameterDomains.find(row => row.actionType === 'finish_activation' && row.pieceId === 'stalkers');
        assert.ok(finish);
        current = await commitChoice(branch, id, credentials, finish, {});
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        const ref = await save('formation-successor.json', { revision: current.stateRevision, ordinaryMoveConsumedOnce: true,
          shieldedAfterHeal: false, firstRemainingWounds: 7, otherRemainingWounds: 6, nextSide: 'player2' });
        return { evidenceRef: ref, checkpointRef: output + id + '/checkpoint-r' + current.stateRevision + '.json' };
      } finally { branch.close(); }
    } },
    { name: 'coldRecovery', openProduct, check: async product => {
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
        const ref = await save('formation-cold-recovery.json', { receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true });
        return { evidenceRef: ref, checkpointRef: ref };
      } finally { branch.close(); }
    } },
  ] });
  console.log(JSON.stringify({ formationControl: formation.status, passed: Object.keys(formation.passed), failures: formation.failures }));
  if (formation.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--facts-control')) {
  const facts = await runProductBoundaryCheck({ directory: path.join(directory, 'facts-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'cold-recovery.json',
    contractVersion: 'T28-W3-07-place-owner-payment-geometry-v1',
  }, steps: [{ name: 'consume', openProduct, check: async product => {
    const branch = await product.branch('blink-lost');
    try {
      const { runtime, authority, native } = branch;
      const before = await native.store.loadRoom(roomId('blink-lost'));
      const initial = authority.state;
      const domain = runtime.enumerate(initial).parameterDomains.find(row => row.sourceRuntimeKind === 'relocation' && row.pieceId === 'stalkers');
      const parameters = placeParameters(initial, 'blink-lost');
      for (const invalid of [{ ...parameters, paymentCardInstanceIds: [] }, { ...parameters, stateRef: 'caller' },
        { ...parameters, placements: parameters.placements.slice(1) }, { ...parameters, triggerHash: 'caller' },
        { ...parameters, placements: parameters.placements.map(row => ({ ...row, xMilliInches: 15000 })) },
        { ...parameters, placements: parameters.placements.map(row => ({ ...row, xMilliInches: 0 })) }]) {
        assert.throws(() => runtime.instantiate(initial, domain, invalid));
      }
      const both = enumerateOfficialAbilityResourcePaymentsV1({ cardDataBundle: initial.officialCardBuildPaymentDataBundle,
        resourceType: 'PE', resourceCost: 1, cardInstances: initial.cardResources.player1 });
      assert.ok(both.some(ids => ids.length === 2));
      const changed = structuredClone(initial);
      changed.phaseFirstActorByRound = {};
      assert.equal(runtime.enumerate(changed).parameterDomains.some(row => row.sourceRuntimeKind === 'relocation'), false);
      const pending = (await read(output + 'blink-lost/checkpoint-r1.json')).envelope.state;
      assert.equal(runtime.enumerate(pending).parameterDomains.some(row => row.actionType === 'move'), false);
      assert.throws(() => runtime.query(pending, { queryKind: 'relocation_preview', pieceId: 'stalkers', parameters }), /DOMAIN_UNAVAILABLE/);
      for (const alter of [state => { delete state.pendingOfficialPostPlaceReaction; },
        state => { state.pendingOfficialPostPlaceReaction.triggerHash = 'bad'; },
        state => { actor(state, 'blink-lost').models[0].xInches += 0.1; }]) {
        const corrupt = structuredClone(pending); alter(corrupt);
        assert.throws(() => runtime.enumerate(corrupt), /POST_PLACE_REACTION_PARENT/);
      }
      const voidBranch = await product.branch('void-engage');
      try {
        const engaged = structuredClone(voidBranch.authority.state);
        engaged.pieces.find(piece => piece.id === 'zeratul').models[0].xInches = 16;
        assert.ok(deriveOfficialEngagementGraphV2(engaged).engagedUnitIds.includes('zeratul'));
        assert.equal(voidBranch.runtime.enumerate(engaged).parameterDomains.some(row => row.sourceRuntimeKind === 'relocation' && row.pieceId === 'zeratul'), false);
      } finally { voidBranch.close(); }
      assert.deepEqual(await native.store.loadRoom(roomId('blink-lost')), before);
      const ref = await save('facts-control.json', { insufficientPaymentRejected: true, fullPaymentMenuIncludesOverpayment: true,
        callerMetadataRejected: true, incompleteFormationRejected: true, overRangeAndBaseOutsideRejected: true,
        unresolvedInitiativeRejected: true, reactionOwnsMenu: true, missingParentWrongHashOrMovedSourceRejected: true,
        voidBlinkEngagedStartRejected: true, nativeVoidEngagedEndpointEvidence: output + 'void-engage/consume.json',
        originalRoomUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { branch.close(); }
  } }] });
  console.log(JSON.stringify({ factsControl: facts.status, failures: facts.failures }));
  if (facts.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--legacy-control')) {
  const legacy = await runProductBoundaryCheck({ directory: path.join(directory, 'legacy-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'shielded-lifecycle/cold-recovery.json',
    contractVersion: 'T28-W3-07-place-heal-legacy-v1',
  }, steps: [{ name: 'coldRecovery', repairRef: output + 'legacy-normalization-isolation-repair.json', openProduct: sourceProduct, check: async () => {
    const cases = [];
    const specs = [
      ...['fresh', 'threshold'].map(id => ({ folder: 'shielded-lifecycle', id,
        releaseId: 'wave3-u83-c84-r50-shielded-lifecycle-' + id + '-v1', roomId: 'wave3-shielded-lifecycle-' + id,
        options: { definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'], includeRanged: true,
          includePrecisionChoices: true, includeArmourChoices: true, includeTargetReactions: true, includeArmourReactions: true } })),
      { folder: 'rapid-ingress-producer', id: 'before', releaseId: 'wave3-u83-c84-r50-rapid-ingress-producer-before-v1',
        roomId: 'wave3-rapid-ingress-producer-before', options: { definitionIds: ['unit:immortal/for-the-ancients-assault-phase@1'],
          weaponDefinitionIds: ['unit:immortal/left-photon-disruptor-assault-phase@1', 'unit:immortal/right-photon-disruptor-assault-phase@1'],
          includeRanged: true, includePrecisionChoices: true, includeArmourChoices: true, includePointDefenseChoices: true } },
      { folder: 'melee-target-reaction', id: 'shield', releaseId: 'wave3-u83-c84-r50-melee-target-reaction-shield-v1',
        roomId: 'wave3-melee-target-reaction-shield', options: { definitionIds: [], includeMelee: true, includeTargetReactions: true, includeArmourReactions: true } },
      { folder: 'impact-armour-reaction', id: 'use', releaseId: 'wave3-u83-c84-r50-impact-armour-reaction-use-v1',
        roomId: 'wave3-impact-armour-reaction-use', options: { definitionIds: [], includeMelee: true, includeArmourReactions: true } },
      { folder: 'hits-armour-reaction', id: 'last', releaseId: 'wave3-u83-c84-r50-hits-armour-reaction-last-v1',
        roomId: 'wave3-hits-armour-reaction-last', options: { definitionIds: ['unit:zeratul/shadow-strike-combat-phase@1'], includeMelee: true, includeHits: true, includeArmourReactions: true } },
    ];
    for (const spec of specs) {
      const cache = 'legacy/' + spec.folder + '-' + spec.id + '.json';
      const prior = await saved(cache); if (prior) { cases.push(prior); continue; }
      const prefix = parent + spec.folder + '/' + spec.id + '/';
      const product = registry(path.join(root, parent, spec.folder));
      try {
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
    const oldPrefix = 'build/ticket-28-wave3-geometry-20261112-v1/relocation/';
    const oldState = projectOfficialRelocationGeometryStateV13(projectOfficialAbilityReferenceStateV13(
      await read(oldPrefix + 'source-state.json'), OFFICIAL_ABILITY_REFERENCE_POLICY_V13), OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13);
    const oldAdapter = createOfficialRelocationFamilyAdapterV1(oldState.officialRelocationFamilySourceBundle);
    const oldDomain = oldAdapter.legalSpace(oldState, { sideKey: 'player1' }).parameterDomains.find(row => row.abilityName === 'Go! Go! Go!' && row.pieceId === 'test-raynor');
    assert.ok(oldDomain);
    const oldModel = oldDomain.parameterSchema.leadingModelId.enum[0];
    const oldPreview = oldAdapter.preview(oldState, { domain: oldDomain, parameters: { leadingModelId: oldModel,
      placements: [{ modelId: oldModel, xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [], rotationDegrees: 0 }],
      path: [{ xMilliInches: 41000, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }] } });
    let oldExpectedDomain;
    for (const file of (await fs.readdir(path.join(root, oldPrefix))).filter(name => name.startsWith('operation-'))) {
      const operation = await read(oldPrefix + file);
      if (operation.domain?.abilityName === 'Go! Go! Go!' && operation.domain.pieceId === 'test-raynor') {
        oldExpectedDomain = operation.domain;
      }
    }
    assert.ok(oldExpectedDomain);
    assert.deepEqual(oldDomain, oldExpectedDomain.sourceDomain);
    const legacyDataset = await read('build/ticket-28-wave3-release-context-20261112-v1/legacy-dataset.json');
    const legacyAuthority = await read(oldPrefix + 'authority.json');
    const fullRuntime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: createOfficialCurrentProductMatchRuntimeV6({
      legacyRuntime: createOfficialCurrentProductMatchRuntimeV1({ dataset: legacyDataset, state: structuredClone(legacyAuthority.state) }) }),
    faqReactionPolicy: OFFICIAL_FAQ_REACTION_POLICY_V13, abilityReferencePolicy: OFFICIAL_ABILITY_REFERENCE_POLICY_V13,
    relocationGeometryPolicy: OFFICIAL_RELOCATION_GEOMETRY_POLICY_V13 });
    assert.deepEqual(fullRuntime.descriptor, (await read(oldPrefix + 'compile.json')).runtime);
    const reconstructed = await reconstructOldNativePrefix(fullRuntime, legacyAuthority);
    const prefixTrace = reconstructed.trace;
    assert.equal(hash(reconstructed.state), (await read(oldPrefix + 'consume.json')).stateHash);
    const oldRef = await save('legacy-relocation-prefix.json', { actualOldAdapterAndFullProductUsed: true,
      expectedSavedNativeDomainExact: true, expectedSavedNativeR5StateHashExact: true,
      sourceRef: oldPrefix + 'authority.json', prefixTrace, initialAuthorityIsolatedFromRuntimeConstruction: true, oldDatabasePresent: false, reconstructedNativePrefix: true, fullOldNativeReplay: false });
    const ref = await save('legacy-control.json', { cases, legacyRelocationPrefixRef: oldRef,
      oldRelocationFullDatabaseUnavailable: true, modelCalls: 0 });
    return { evidenceRef: ref, checkpointRef: ref };
  } }] });
  console.log(JSON.stringify({ legacyControl: legacy.status, failures: legacy.failures }));
  if (legacy.status !== 'passed') process.exitCode = 1;
}

if (result.status === 'passed' && process.argv.includes('--assault-source-control')) {
  const guard = await runProductBoundaryCheck({ directory: path.join(directory, 'assault-source-control'), identity: {
    factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
    factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: output + 'void-engage/consume.json',
    contractVersion: 'T28-W3-07-assault-place-source-actor-v1',
  }, steps: [{ name: 'consume', openProduct, check: async product => {
    const branch = await product.branch('void-engage');
    try {
      await branch.native.restoreDependencies(roomId('void-engage'), branch.authority);
      const before = await branch.native.store.loadRoom(roomId('void-engage'));
      const checkpoint = (await read(output + 'void-engage/checkpoint-r1.json')).envelope;
      const state = checkpoint.state;
      const piece = actor(state, 'void-engage');
      const input = { state, actor: piece, dataBundle: state.officialModelBaseGeometryDataBundle,
        assaultPlaceSourceDefinitionId: relocationDefinitionIds[1], coherencyRangeMilliInches: 3000,
        plan: { planId: 'native-assault-place-source-control', leadingModelId: piece.models[0].id,
          placements: piece.models.map(model => ({ modelId: model.id, outcome: 'placed',
            xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000), rotationDegrees: 0 })),
          currentlyEngagedEnemyUnitIds: [], closestLegalPlacementDenominatorComplete: false } };
      assert.equal(evaluateOfficialAssaultPlaceCoherencyV1(input).assaultPlaceEngagementPermitted, true);
      assert.throws(() => evaluateOfficialAssaultPlaceCoherencyV1({ ...input, state: { ...state, phase: 'movement' } }), /ASSAULT_PLACE_SOURCE_REQUIRED/);
      assert.throws(() => evaluateOfficialAssaultPlaceCoherencyV1({ ...input, assaultPlaceSourceDefinitionId: relocationDefinitionIds[0] }), /ASSAULT_PLACE_SOURCE_REQUIRED/);
      assert.throws(() => evaluateOfficialAssaultPlaceCoherencyV1({ ...input,
        actor: { ...piece, officialUnitRecordKey: 'army_units:stalker' } }), /ASSAULT_PLACE_SOURCE_REQUIRED/);
      const replay = await branch.native.store.loadReplayBundle(roomId('void-engage'));
      const first = replay.privateJournal.find(row => row.payload.type === 'accepted_transition').payload.payload.receipt;
      const restored = branch.native.engine.replay({ initialEnvelope: replay.initialEnvelope, journal: [first] });
      assert.equal(restored.ok, true, JSON.stringify(restored)); assert.deepEqual(restored.envelope, checkpoint);
      assert.deepEqual(await branch.native.store.loadRoom(roomId('void-engage')), before);
      const ref = await save('assault-source-control.json', { validNativeEndpoint: true, wrongPhaseRouteAndActorRejected: true,
        originalNativeR1Exact: true, roomUnchanged: true, modelCalls: 0 });
      return { evidenceRef: ref, checkpointRef: ref };
    } finally { branch.close(); }
  } }] });
  console.log(JSON.stringify({ assaultSourceControl: guard.status, failures: guard.failures }));
  if (guard.status !== 'passed') process.exitCode = 1;
}
