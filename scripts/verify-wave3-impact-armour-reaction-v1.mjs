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
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_IMPACT_ALLOCATION_POLICY_V13 } from '../packages/rule-atoms/official-impact-allocation-policy-v13.mjs';
import { createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parent = 'build/ticket-28-wave2-capabilities-20261113-v1/';
const output = parent + 'impact-armour-reaction/';
const directory = path.join(root, output);
const impactId = 'unit:immortal/devastating-charge-assault-phase@1';
const ids = ['use', 'pass'];
const roomId = id => 'wave3-impact-armour-reaction-' + id;
const releaseId = id => 'wave3-u83-c84-r50-impact-armour-reaction-' + id + '-v1';
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
  const product = registry(path.join(root, parent, 'melee-armour-reaction'));
  try { return await product.resolver.resolve({ releaseId: 'wave3-u83-c84-r50-melee-armour-reaction-single-v1',
    purpose: 'ability_component' }); } finally { product.close(); }
}
const runtimeFor = (context, state) => createOfficialCharacteristicStatusComponentRuntimeV2({ context,
  spatialState: state, definitionIds: [], includeMelee: true, includeArmourReactions: true });
async function sceneFor(context) {
  const base = (await read(parent + 'melee-armour-reaction/single/authority.json')).state;
  const candidatesBySide = Object.fromEntries(['player1', 'player2'].map(sideKey => [sideKey, {
    sideKey, scaleId: 'Skirmish', mineralBudget: 500, factionRecordKey: 'tactical_cards:khalai', tacticalCardRecordKeys: [],
    units: [{ unitInstanceId: sideKey === 'player1' ? 'actor' : 'target', recordKey: 'army_units:immortal',
      compositionKind: 'small', upgrades: sideKey === 'player2' ? [{ upgradeName: 'Shield Overcharge' }] : [] }],
  }]));
  const setup = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeMelee: true,
    meleeModifierDefinitionIds: [impactId], reactionDefinitionIds: ['unit:immortal/shield-overcharge-any-phase@1'] });
  const state = { ...setup.state, round: 1, phase: 'assault', activeSideKey: 'player1', firstPlayerSideKey: 'player1',
    engagementScale: 'Skirmish', armyBuildingEngagementScale: 'Skirmish', log: [],
    ...Object.fromEntries(['board', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'supplyLossLedger'].map(key => [key, structuredClone(base[key])])),
    phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } },
    officialImpactAllocationPolicy: structuredClone(OFFICIAL_IMPACT_ALLOCATION_POLICY_V13),
    officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13) };
  const actor = state.pieces.find(piece => piece.id === 'actor');
  for (const piece of state.pieces) {
    piece.isOnField = true; piece.isInReserves = false; piece.statuses = ['Shielded'];
    const radiusSum = (actor.models[0].baseWidthInches + piece.models[0].baseWidthInches) / 2;
    piece.models.forEach(model => Object.assign(model, { isOnField: true, yInches: 12,
      xInches: piece.id === 'actor' ? 10 : 10 + radiusSum + 1.5 }));
  }
  return { state, candidatesBySide, audits: setup.state.armyCompositionUpgradeAuditsBySide };
}
function chargeParameters(state) {
  const actor = state.pieces.find(piece => piece.id === 'actor');
  const target = state.pieces.find(piece => piece.id === 'target');
  return { leadingModelId: actor.models[0].id, targets: [{ unitId: target.id, modelId: target.models[0].id }] };
}
function resolveChargeParameters(state) {
  const actor = state.pieces.find(piece => piece.id === 'actor');
  const target = state.pieces.find(piece => piece.id === 'target');
  const contactX = Math.round(target.models[0].xInches * 1000)
    - Math.round(target.models[0].baseWidthInches * 500) - Math.round(actor.models[0].baseWidthInches * 500);
  return { outcome: 'success', path: [{ xMilliInches: contactX, yMilliInches: 12000, elevation: 'ground', supportTerrainIds: [] }], placements: [] };
}
function impactParameters(domain) {
  return { allocations: domain.sourceDomain.parameterSchema.eligibleModels.map(model => ({
    modelId: model.modelId, targetUnitId: 'target', dice: model.impactDice })) };
}
function selected(runtime, state, id) {
  const menu = runtime.enumerate(state);
  if (state.pendingOfficialReactionWindow) {
    const use = id === 'use' && state.activeSideKey === 'player2';
    const domain = menu.parameterDomains.find(row => row.actionType === (use ? 'resolve_reaction_family_ability' : 'pass_reaction_family_window'));
    assert.ok(domain);
    return { domain, parameters: use ? { paymentCardInstanceIds: domain.sourceDomain.parameterSchema.paymentCardInstanceIds.const } : {} };
  }
  if (menu.parameterDomains.length) {
    const domain = menu.parameterDomains[0];
    const field = domain.sourceDomain.parameterSchema.required[0];
    const spec = domain.sourceDomain.parameterSchema[field];
    return { domain, parameters: { [field]: spec.items.enum.slice(0, spec.maxItems) } };
  }
  assert.equal(menu.candidates.length, 1);
  return { candidate: menu.candidates[0] };
}
function fixedWalk(runtime, initial, id, hitOutcome = 6) {
  let state = structuredClone(initial);
  const trace = [];
  for (const [type, parameters] of [['charge', chargeParameters(state)], ['resolve_charge', resolveChargeParameters(state)]]) {
    const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === type);
    const action = runtime.instantiate(state, domain, parameters).action;
    const applied = runtime.apply(state, action, { chanceReveals: Array(action.chance?.count || 0).fill(6) });
    state = applied.state;
    trace.push({ actionType: type, events: applied.events });
  }
  const domain = runtime.enumerate(state).parameterDomains.find(row => row.actionType === 'resolve_impact');
  let action = runtime.instantiate(state, domain, impactParameters(domain)).action;
  for (let step = 0; step < 20; step++) {
    const rolls = [];
    if (action.chance) for (const kind of action.chance.revealOrder) {
      rolls.push(...Array(action.chance.layout[kind]).fill(kind === 'hit' ? hitOutcome : 1));
    }
    const applied = runtime.apply(state, action, { chanceReveals: rolls });
    state = applied.state;
    trace.push({ actionType: action.actionType, rolls, events: applied.events });
    const impact = state.log.flatMap(row => row.events || []).find(row => row.type === 'impact_damage');
    if (impact) return { state, trace, impact };
    const choice = selected(runtime, state, id);
    action = choice.candidate ? Object.fromEntries(Object.entries(choice.candidate)
      .filter(([key]) => !['isEnabled', 'disabledReason', 'score', 'details'].includes(key)))
      : runtime.instantiate(state, choice.domain, choice.parameters).action;
  }
  assert.fail('IMPACT did not reach damage');
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

await fs.mkdir(directory, { recursive: true });
const result = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'), identity: {
  factoryModule: 'packages/product-composition/official-characteristic-status-component-runtime-v2.mjs',
  factoryExport: 'createOfficialCharacteristicStatusComponentRuntimeV2', sourceRef: parent + 'immortal-impact/read.json',
  contractVersion: 'T28-W3-07-native-charge-impact-armour-reaction-v1',
}, steps: [
  { name: 'read', openProduct: sourceProduct, check: async context => {
    const source = context.dataset.recordsByKey['army_units:immortal'].payload.upgrades.filter(row =>
      ['Devastating Charge', 'Shield Overcharge'].includes(row.name));
    assert.equal(source.length, 2);
    assert.match(source.find(row => row.name === 'Devastating Charge').description, /IMPACT \(4\) 3\+/);
    const ref = await save('read.json', { source, priorImplementationRef: parent + 'melee-armour-reaction/REPORT.zh-CN.md',
      modelCalls: 0, scope: 'declared_skirmish_500_R1_assault' });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'compile', repairRef: output + 'fixture-disclosure-repair.json', openProduct: sourceProduct, check: async context => {
    const scene = await sceneFor(context);
    const runtime = runtimeFor(context, scene.state);
    assert.equal(runtime.descriptor.runtimeVersion, '3.18.0');
    const fixed = Object.fromEntries(ids.map(id => [id, fixedWalk(runtime, scene.state, id)]));
    assert.equal(fixed.use.impact.stages.convertedFailedArmourDieIndices.length, 2);
    assert.equal(fixed.pass.impact.stages.totalDamage - fixed.use.impact.stages.totalDamage, 2);
    const zero = fixedWalk(runtime, scene.state, 'use', 1);
    assert.equal(zero.state.officialReactionHistory?.length || 0, 0);
    assert.equal(zero.impact.stages.armourDice, 0);
    await save('fixed-comparison.json', { counterfactualOnly: true, nativeReceiptsCreated: false, fixed, zero });
    const product = registry();
    try {
      for (const id of ids) {
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
          scenario: { scale: 500, round: 1, phase: 'assault', placementAndPhaseDeclared: true,
            initialBaseGapInches: 1.5, fullMatch: false } }));
      }
    } finally { product.close(); }
    const ref = await save('compile.json', { candidatesBySide: scene.candidatesBySide, audits: scene.audits,
      fixedDamageDifference: 2, zeroHitReactionSkipped: true, existingConsumerReused: true });
    return { evidenceRef: ref, checkpointRef: output + 'use/authority.json' };
  } },
  { name: 'consume', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/consume.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const { native, runtime, authority } = branch;
        const credentials = await native.create(roomId(id), authority);
        const initial = (await native.store.loadReplayBundle(roomId(id))).initialEnvelope.state;
        await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'declare-charge',
          select: row => row.actionType === 'charge', parameters: () => chargeParameters(initial) });
        await checkpoint(native, id);
        await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'resolve-charge',
          select: row => row.actionType === 'resolve_charge', parameters: () => resolveChargeParameters(initial) });
        const ready = await checkpoint(native, id);
        assert.equal(ready.envelope.state.pendingAction.impactDice, 4);
        const domain = runtime.enumerate(ready.envelope.state).parameterDomains.find(row => row.actionType === 'resolve_impact');
        const parameters = impactParameters(domain);
        const beforeQuery = await native.store.loadRoom(roomId(id));
        const query = runtime.query(ready.envelope.state, { queryKind: 'melee_action_preview', actionType: 'resolve_impact', pieceId: 'actor', parameters });
        assert.deepEqual(await native.store.loadRoom(roomId(id)), beforeQuery);
        const applied = await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'declare-impact',
          select: row => row.domainId === domain.domainId, parameters: () => parameters });
        assert.deepEqual(applied.preview.core.action, query.result.action);
        const current = await checkpoint(native, id);
        const ref = await save(id + '/consume.json', { id, revision: current.stateRevision,
          queryEqualsNativePreview: true, queryRoomUnchanged: true, nativeChargeResolved: true });
        cases.push({ id, evidenceRef: ref });
      } finally { branch.close(); }
    }
    const ref = await save('consume.json', { cases }); return { evidenceRef: ref, checkpointRef: ref };
  } },
  { name: 'successor', repairRef: output + 'fixture-phase-handoff-repair.json', openProduct, check: async product => {
    const cases = [];
    for (const id of ids) {
      const prior = await saved(id + '/successor.json'); if (prior) { cases.push(prior); continue; }
      const branch = await product.branch(id);
      try {
        const { native, runtime, authority } = branch;
        const credentials = await native.create(roomId(id), authority);
        let current;
        let impact;
        for (let step = 0; step < 20; step++) {
          current = await checkpoint(native, id);
          const state = current.envelope.state;
          impact = state.log.flatMap(row => row.events || []).find(row => row.type === 'impact_damage');
          if (impact) break;
          const choice = selected(runtime, state, id);
          await native.commit({ roomId: roomId(id), credential: credentials[state.activeSideKey], operationKey: 'continuation-' + current.stateRevision,
            ...(choice.candidate ? { kind: 'finite', select: row => row.action.sourceActionHash === choice.candidate.sourceActionHash }
              : { select: row => row.domainId === choice.domain.domainId, parameters: () => choice.parameters }) });
        }
        assert.ok(impact);
        assert.equal(impact.stages.hitThreshold, 3);
        assert.equal(current.envelope.state.pendingAction, undefined);
        assert.equal(current.envelope.state.pendingOfficialMeleePoolChoice, undefined);
        assert.equal(current.envelope.state.pendingOfficialReactionWindow, undefined);
        const history = current.envelope.state.officialReactionHistory || [];
        assert.equal(history.length, id === 'use' && impact.stages.armourDice > 0 ? 1 : 0);
        assert.ok((current.envelope.state.officialReactionResolutionHistory || []).every(row => row.consumedByHost));
        if (current.envelope.state.activeSideKey === 'player1') {
          await native.commit({ roomId: roomId(id), credential: credentials.player1, operationKey: 'finish-activation',
            select: row => row.actionType === 'finish_activation', parameters: () => ({}) });
          current = await checkpoint(native, id);
        }
        assert.equal(current.envelope.state.activeSideKey, 'player2');
        const menu = await native.room.legalSpace({ roomId: roomId(id), seatToken: credentials.player2.seatToken });
        assert.equal(menu.ok, true, JSON.stringify(menu));
        // This component scene contains only the two now-engaged Immortals.
        // Match-owned phase passing is outside this component's registered actions.
        assert.equal(menu.legalSpace.finiteActions.length, 0);
        assert.equal(menu.legalSpace.parameterDomains.length, 0);
        assert.equal(current.envelope.state.phase, 'assault');
        const [actor, target] = ['actor', 'target'].map(pieceId => current.envelope.state.pieces.find(piece => piece.id === pieceId));
        assert.equal(actor.currentModels, 1); assert.equal(target.currentModels, 1);
        const gap = Math.hypot(actor.models[0].xInches - target.models[0].xInches,
          actor.models[0].yInches - target.models[0].yInches)
          - (actor.models[0].baseWidthInches + target.models[0].baseWidthInches) / 2;
        assert.ok(gap >= -0.001 && gap <= 1);
        const value = { id, revision: current.stateRevision, impact, reactions: history, nextSide: 'player2',
          nextMenuAvailable: false, componentActionSetExhausted: true, finalBaseGapInches: gap,
          phaseContinuationUncovered: 'Match-owned phase passing and full capability composition remain pending' };
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
        const { native, authority } = branch; await native.restoreDependencies(roomId(id), authority);
        const before = await native.store.loadRoom(roomId(id));
        const bundle = await native.store.loadReplayBundle(roomId(id));
        const receipts = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        const checkpoints = (await fs.readdir(path.join(directory, id))).filter(name => /^checkpoint-r\d+\.json$/u.test(name));
        for (const name of checkpoints) {
          const expected = (await read(output + id + '/' + name)).envelope;
          const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts.slice(0, expected.stateRevision) });
          assert.equal(replay.ok, true, JSON.stringify(replay)); assert.deepEqual(replay.envelope, expected);
        }
        assert.deepEqual(await native.store.loadRoom(roomId(id)), before);
        cases.push({ id, receipts: receipts.length, checkpoints: checkpoints.length, replayExact: true, currentUnchanged: true });
      } finally { branch.close(); }
    }
    const ref = await save('cold-recovery.json', { cases, unchangedRuntimeLegacyEvidenceRef: parent + 'melee-target-reaction/legacy-control.json' });
    return { evidenceRef: ref, checkpointRef: ref };
  } },
] });
console.log(JSON.stringify({ status: result.status, passed: Object.keys(result.passed), failures: result.failures }));
if (result.status !== 'passed') process.exitCode = 1;
