import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { applyOfficialPhaseInitiativeV1 } from '../packages/rule-atoms/official-phase-initiative-executor-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1/nonlethal');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json'].map(name =>
  fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
recipes.player1 = { factionRecordKey: 'tactical_cards:raynor_s_raiders',
  tacticalCardRecordKeys: ['tactical_cards:barracks__proxy_', 'tactical_cards:factory'], units: [
    { unitInstanceId: 'test-raider', recordKey: 'army_units:raynor_s_raider__marine_', compositionKind: 'small', upgradeNames: [] },
    { unitInstanceId: 'test-marauder', recordKey: 'army_units:marauder', compositionKind: 'small', upgradeNames: [] },
  ] };
// A legal under-budget engineering roster, not a 2000-point battle experiment.
const source = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, recipes,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, setupId: 't28-nonlethal-conditional-source' });
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const baseRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(source.state) }) });

function condition(pieceId, priorDamage) {
  const state = structuredClone(source.state);
  state.phase = 'movement';
  state.firstPlayerSideKey = 'player1';
  state.activeSideKey = 'player1';
  const actor = state.pieces.find(piece => piece.id === pieceId);
  Object.assign(actor, { isOnField: true, isInReserves: false, damageMarker: priorDamage,
    xInches: 10, yInches: 10 });
  for (const [index, model] of actor.models.entries()) Object.assign(model, {
    isOnField: true, xInches: 10 + (index % 3) * 1.5, yInches: 10 + Math.floor(index / 3) * 1.5,
  });
  const initialized = applyOfficialPhaseInitiativeV1(state, { actionType: 'choose_first_actor',
    sideKey: 'player1', phase: 'movement', chosenFirstActorSideKey: 'player1' }).state;
  const body = { ...source, state: initialized };
  delete body.receiptHash;
  return { ...body, receiptHash: hashStarcraftTmgContract(body) };
}

async function submitStimpack(product, roomId, authority, pieceId) {
  const credentials = await product.create(roomId, authority);
  const applied = await product.commit({ roomId, credential: credentials.player1, operationKey: 'stimpack',
    select: domain => domain.abilityName === 'Stimpack' && domain.pieceId === pieceId,
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0] }) });
  const aggregate = await product.store.loadRoom(roomId);
  return { applied, aggregate, actor: aggregate.envelope.state.pieces.find(piece => piece.id === pieceId) };
}

if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: baseRuntime });
  try {
    const rows = [];
    for (const [pieceId, priorDamage, expected] of [['test-raider', 0, 2], ['test-marauder', 4, 6]]) {
      const authority = condition(pieceId, priorDamage);
      const result = await submitStimpack(product, 'baseline-' + pieceId, authority, pieceId);
      rows.push({ pieceId, priorDamage, expected, actual: result.actor.damageMarker,
        currentModels: result.actor.currentModels, stateHash: result.aggregate.envelope.stateHash,
        events: result.aggregate.envelope.state.log.at(-1).events });
      await save(pieceId + '-authority.json', authority);
    }
    assert.deepEqual(rows.map(row => row.actual), [1, 4]);
    assert(rows.every(row => row.actual !== row.expected));
    await save('red.json', { status: 'reproduced', rows, sourceRule: 'NON-LETHAL DAMAGE (X)',
      sourceRecordKey: 'rules_sections:FuahgilWtc8nccVSp2Vv', providerCalls: 0 });
    console.log(JSON.stringify({ status: 'red_reproduced', results: rows.map(({ pieceId, actual, expected }) =>
      ({ pieceId, actual, expected })) }));
  } finally { product.close(); }
} else {
  const { createOfficialCurrentProductMatchRuntimeV7 } =
    await import('../packages/product-composition/official-current-product-match-runtime-v7.mjs');
  const { OFFICIAL_FAQ_REACTION_POLICY_V13: faqReactionPolicy } =
    await import('../packages/rule-atoms/official-faq-reaction-policy-v13.mjs');
  const { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1: nonLethalDamagePolicy } =
    await import('../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs');
  const candidate = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime,
    faqReactionPolicy, nonLethalDamagePolicy });
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: candidate });
  const cases = [['test-raider', 0, 2], ['test-marauder', 4, 6]];
  const verification = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-faq-runtime-20261112-v1/nonlethal/red.json',
      contractVersion: 'T28-W3-05-nonlethal-native-family-v1' },
    steps: [
      { name: 'read', repairRef: 'fixture-native-dependency-rehydration-from-frozen-authority', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'baseline.sqlite', rulesRuntime: baseRuntime }), check: async product => {
        const red = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        for (const [pieceId] of cases) {
          const authority = JSON.parse(await fs.readFile(path.join(directory, pieceId + '-authority.json'), 'utf8'));
          await product.restoreDependencies('baseline-' + pieceId, authority);
          const replay = await product.room.replayRoom({ roomId: 'baseline-' + pieceId });
          assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
          const aggregate = await product.store.loadRoom('baseline-' + pieceId);
          const before = red.rows.find(row => row.pieceId === pieceId);
          assert.equal(aggregate.envelope.stateHash, before.stateHash);
          assert.equal(aggregate.envelope.state.pieces.find(piece => piece.id === pieceId).damageMarker, before.actual);
        }
        const evidenceRef = await save('legacy-replay.json', { oldReceiptsReplayWithoutChanges: true,
          sourceAuthority: source.receiptHash, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        const previousAuthority = JSON.parse(await fs.readFile(path.join(sourceDirectory, 'native-authority.json'), 'utf8'));
        const previousDescriptor = JSON.parse(await fs.readFile(path.join(directory, '../runtime.json'), 'utf8'));
        const sameBase = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
          createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(previousAuthority.state) }) });
        const unchanged = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: sameBase, faqReactionPolicy });
        assert.equal(unchanged.descriptor.runtimeHash, previousDescriptor.runtimeHash,
          'adding an optional component must preserve the already-accepted reaction-only binding');
        assert.equal(candidate.descriptor.productionRoomEligible, false);
        assert.equal(candidate.descriptor.nonLethalDamagePolicy.resolution, 'accumulate_full_damage_defer_casualties');
        assert.throws(() => createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime,
          faqReactionPolicy, nonLethalDamagePolicy: { ...nonLethalDamagePolicy, resolution: 'cap_at_hp_minus_1' } }), /REQUIRED/);
        const evidenceRef = await save('runtime.json', candidate.descriptor);
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const rows = [];
        for (const [pieceId, priorDamage, expected] of cases) {
          const authority = JSON.parse(await fs.readFile(path.join(directory, pieceId + '-authority.json'), 'utf8'));
          const before = authority.state.pieces.find(piece => piece.id === pieceId);
          const result = await submitStimpack(product, 'candidate-' + pieceId, authority, pieceId);
          assert.equal(result.actor.damageMarker, expected);
          assert.equal(result.actor.currentModels, before.currentModels);
          assert.deepEqual(result.actor.models.map(model => model.isDestroyed), before.models.map(model => model.isDestroyed));
          assert.deepEqual(result.applied.domain.constraints.nonLethalDamage, { amount: 2,
            damageMarkerBefore: priorDamage, damageMarkerAfter: expected, immediateCasualtyRemoval: false });
          assert.equal(result.aggregate.envelope.state.activeAbilityUseHistory.filter(entry => entry.pieceId === pieceId
            && entry.abilityName === 'Stimpack').length, 1);
          const event = result.aggregate.envelope.state.log.at(-1).events.find(entry => entry.type === 'stimpack_resolved');
          assert.equal(event.damageKind, 'self_special_ability');
          assert.equal(event.casualtyRemovalDeferred, true);
          assert.equal(event.damageMarkerAfter, expected);
          rows.push({ pieceId, damageMarkerBefore: priorDamage, damageMarkerAfter: result.actor.damageMarker,
            currentModels: result.actor.currentModels, stateHash: result.aggregate.envelope.stateHash,
            nativePrediction: result.applied.domain.constraints.nonLethalDamage, event });
        }
        const evidenceRef = await save('consume.json', { rows, queryAndApplyAgree: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const rows = [];
        for (const [pieceId, , expected] of cases) {
          const authority = JSON.parse(await fs.readFile(path.join(directory, pieceId + '-authority.json'), 'utf8'));
          const roomId = 'candidate-' + pieceId;
          const credentials = await product.create(roomId, authority);
          await product.commit({ roomId, credential: credentials.player1, operationKey: 'finish-activation',
            select: domain => domain.actionType === 'finish_activation' && domain.pieceId === pieceId, parameters: () => ({}) });
          const aggregate = await product.store.loadRoom(roomId);
          const actor = aggregate.envelope.state.pieces.find(piece => piece.id === pieceId);
          assert.equal(actor.damageMarker, expected);
          assert.equal(actor.activatedPhases.movement, true);
          assert(!aggregate.envelope.state.selectedRosterActivationWindow);
          assert.notEqual(aggregate.envelope.state.activeSideKey, 'player1');
          rows.push({ pieceId, revision: aggregate.stateRevision, activeSideKey: aggregate.envelope.state.activeSideKey,
            stateHash: aggregate.envelope.stateHash, damageMarker: actor.damageMarker });
        }
        const evidenceRef = await save('successor.json', { rows, activationFinished: true });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        const saved = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        for (const row of saved.rows) {
          const roomId = 'candidate-' + row.pieceId;
          const authority = JSON.parse(await fs.readFile(path.join(directory, row.pieceId + '-authority.json'), 'utf8'));
          await product.restoreDependencies(roomId, authority);
          const aggregate = await product.store.loadRoom(roomId);
          assert.equal(aggregate.envelope.stateHash, row.stateHash);
          assert.deepEqual(aggregate.envelope.state.officialNonLethalDamagePolicy, nonLethalDamagePolicy);
          const replay = await product.room.replayRoom({ roomId });
          assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        }
        const evidenceRef = await save('cold.json', { sqliteReopened: true, nativeReceiptsReplay: true,
          policyAndDamagePreserved: true, providerCalls: 0, productionPublished: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ],
  });
  console.log(JSON.stringify({ status: verification.status, passed: Object.keys(verification.passed), providerCalls: 0 }));
}
