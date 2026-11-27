import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 as nonLethalDamagePolicy } from '../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 as structureTargetingPolicy } from '../packages/rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_MISSION_ROUND_START_POLICY_V13 as missionRoundStartPolicy,
  OFFICIAL_MISSION_MARKER_ROLL_ACTION_V1 as markerRollAction,
  resolveOfficialMissionMarkerChanceV1 } from '../packages/rule-atoms/official-mission-round-start-policy-v13.mjs';
import { verifyOfficialMissionSetupBindingV2 } from '../packages/source-data/official-mission-setup-binding-v1.mjs';
import { verifyOfficialReserveLifecycleDataBundleV2 } from '../packages/source-data/official-reserve-lifecycle-data-bundle-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1/supply-drop');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot, oldAuthority] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json', 'native-authority.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
function beginAuthority(authority) {
  const { receiptHash: ignoredHash, releaseId: ignoredRelease, releaseManifestHash: ignoredManifest, ...body } = authority;
  const initialized = { ...body, state: prepareOfficialCurrentProductFirstRoundV1(authority.state) };
  return { ...initialized, receiptHash: hashStarcraftTmgContract(initialized) };
}
function native(state) {
  return createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(state) }) });
}
if (process.argv.includes('--baseline')) {
  let failure;
  try { createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot,
    missionRecordKey: 'faction_cards:mission_supply_drop' }); } catch (error) { failure = error.message; }
  assert.match(failure, /STANDARD_ROOM_GAMEPLAY_BUNDLE_MISSION_UNSUPPORTED/);
  const authority = beginAuthority(oldAuthority);
  const product = openWave3EngineeringRoomV1({ directory, filename: 'legacy.sqlite', rulesRuntime: native(authority.state) });
  try {
    const credentials = await product.create('hold-position-legacy', authority);
    await product.commit({ roomId: 'hold-position-legacy', credential: credentials.player1, operationKey: 'start-round',
      kind: 'finite', select: item => item.action.actionType === 'resolve_mission_start_of_round' });
    const aggregate = await product.store.loadRoom('hold-position-legacy');
    assert.equal(aggregate.envelope.state.phase, 'movement');
    await save('legacy-authority.json', authority);
    await save('red.json', { supplyDropFactoryFailure: failure,
      missingDispatcherBoundary: 'mission.enumerateLifecycle chanceRequests are not exposed by current Match dispatcher',
      legacyStateHash: aggregate.envelope.stateHash, legacyRevision: aggregate.stateRevision,
      legacyPhase: aggregate.envelope.state.phase, providerCalls: 0 });
    console.log(JSON.stringify({ status: 'red_reproduced', supplyDropFactoryFailure: failure, legacyPhase: 'movement' }));
  } finally { product.close(); }
} else {
  const authorityFile = path.join(directory, 'candidate-authority.json');
  let authority;
  try { authority = JSON.parse(await fs.readFile(authorityFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    authority = beginAuthority(createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot,
      missionRecordKey: 'faction_cards:mission_supply_drop', missionRoundStartPolicy }));
    await save('candidate-authority.json', authority);
  }
  const baseRuntime = native(authority.state);
  const runtime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: baseRuntime,
    faqReactionPolicy, nonLethalDamagePolicy, structureTargetingPolicy, missionRoundStartPolicy });
  const roomId = 'supply-drop-faq13';
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: runtime });
  const stateOf = async product => (await product.store.loadRoom(roomId)).envelope.state;
  const progress = state => state.officialMissionRuntimeState.roundProgressByRound[state.round];
  async function allMenus(product, credentials) {
    return Promise.all(['player1', 'player2'].map(async sideKey => {
      const legal = await product.room.legalSpace({ roomId, seatToken: credentials[sideKey].seatToken });
      assert.equal(legal.ok, true, JSON.stringify(legal));
      return { sideKey, legalSpace: legal.legalSpace };
    }));
  }
  async function take(product, credentials, actionType, extra = () => true) {
    const menus = await allMenus(product, credentials);
    const menu = menus.find(row => row.legalSpace.finiteActions.some(item => item.action.actionType === actionType && extra(item.action)));
    assert(menu, `actual Room has no finite ${actionType}: ${JSON.stringify(menus.map(row => ({ sideKey: row.sideKey,
      types: row.legalSpace.finiteActions.map(item => item.action.actionType) })))}`);
    const aggregate = await product.store.loadRoom(roomId);
    return product.commit({ roomId, credential: credentials[menu.sideKey], kind: 'finite',
      operationKey: `${aggregate.stateRevision}:${actionType}`, select: item => item.action.actionType === actionType && extra(item.action) });
  }
  async function activateMarker(product, credentials) {
    for (let count = 0; progress(await stateOf(product))?.startRoundApplied !== true; count++) {
      assert(count < 64, 'engineering random-roll observation budget exceeded; checkpoint retained');
      const menus = await allMenus(product, credentials);
      assert(menus.every(row => row.legalSpace.parameterDomains.length === 0));
      assert(menus.every(row => row.legalSpace.finiteActions.every(item => item.action.actionType === markerRollAction)));
      await take(product, credentials, markerRollAction);
    }
    const state = await stateOf(product);
    assert.equal(state.phase, 'start_of_round');
    assert.equal(state.currentProductMatchLifecycle.step, 'determine_initiative');
    const menus = await allMenus(product, credentials);
    assert(menus.every(row => row.legalSpace.parameterDomains.length === 0));
    assert(menus.flatMap(row => row.legalSpace.finiteActions).every(item => item.action.actionType === 'resolve_current_product_next_round_initiative'));
  }
  async function priority(product, credentials) {
    for (let count = 0; (await stateOf(product)).phase === 'start_of_round'; count++) {
      assert(count < 64, 'engineering priority-roll observation budget exceeded; checkpoint retained');
      await take(product, credentials, 'resolve_current_product_next_round_initiative');
    }
    assert.equal((await stateOf(product)).phase, 'movement');
  }
  const record = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-faq-runtime-20261112-v1/supply-drop/red.json', contractVersion: 'T28-W3-05-supply-drop-before-priority-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'legacy.sqlite', rulesRuntime: native(beginAuthority(oldAuthority).state) }), check: async product => {
        const old = JSON.parse(await fs.readFile(path.join(directory, 'legacy-authority.json'), 'utf8'));
        await product.restoreDependencies('hold-position-legacy', old);
        const prior = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        assert.equal((await product.store.loadRoom('hold-position-legacy')).envelope.stateHash, prior.legacyStateHash);
        const replay = await product.room.replayRoom({ roomId: 'hold-position-legacy' });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('legacy.json', { originalStateAndReceiptsPreserved: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'legacy.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        const state = authority.state;
        const key = 'faction_cards:mission_supply_drop';
        assert.equal(state.mission.recordKey, key);
        assert.equal(state.officialGameplayDataBundle.missionScoringProfile.recordKey, key);
        assert.equal(state.officialCurrentProductGameplayDataBundle.missionScoringProfile.recordKey, key);
        assert.equal(state.officialReserveLifecycleDataBundle.missionRecordKey, key);
        assert.equal(state.officialMissionRuntimeState.missionRecordKey, key);
        verifyOfficialMissionSetupBindingV2(state.officialMissionSetupBinding, state.officialGameplayDataBundle);
        verifyOfficialReserveLifecycleDataBundleV2(state.officialReserveLifecycleDataBundle);
        assert.equal(runtime.descriptor.productionRoomEligible, false);
        assert.equal(runtime.descriptor.missionRoundStartPolicy.entryId, 'faq-v1.3:22');
        assert.throws(() => createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: native(beginAuthority(oldAuthority).state),
          faqReactionPolicy, missionRoundStartPolicy }), /BASE_POLICY_MISMATCH/);
        // Enumerate all native D6 outcomes: selection is unbiased and rejects
        // only the remainder. This is a finite RNG mapping proof, not game play.
        for (const size of [1, 2, 3, 4, 5]) {
          const counts = Array(size).fill(0);
          let rejects = 0;
          for (let die = 1; die <= 6; die++) {
            const result = resolveOfficialMissionMarkerChanceV1(size, [{ outcome: die }]);
            if (result.accepted) counts[result.outcomeIndex]++; else rejects++;
          }
          assert(counts.every(value => value === Math.floor(6 / size)));
          assert.equal(rejects, 6 % size);
        }
        assert.throws(() => resolveOfficialMissionMarkerChanceV1(4, [{ outcome: 7 }]), /NATIVE_DICE_INVALID/);
        const evidenceRef = await save('runtime.json', { descriptor: runtime.descriptor,
          missionRecordKey: key, consistentMissionFacts: true, nativeD6UnbiasedMapping: true });
        return { evidenceRef, checkpointRef: authorityFile };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        await activateMarker(product, credentials);
        const aggregate = await product.store.loadRoom(roomId);
        const state = aggregate.envelope.state;
        assert.equal(state.round, 1);
        assert.equal(state.board.missionMarkers.filter(marker => marker.isActivated).length, 1);
        assert.equal(state.officialRoundSupplyState, undefined);
        const evidenceRef = await save('consume.json', { revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash,
          startRoundHistory: state.officialMissionRuntimeState.startRoundHistory, priorityBlockedUntilActivation: true });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, authority);
        let state = await stateOf(product);
        if (state.round === 1 && state.phase === 'start_of_round') await priority(product, credentials);
        state = await stateOf(product);
        if (state.round === 1) assert.deepEqual(state.officialRoundSupplyState.supplyPoolBySide, { player1: 6, player2: 6 });
        // Exercise the real phase/score/cleanup successors with legal passes.
        // No unit placement, synthetic transition, model or real game is used.
        for (let count = 0; (await stateOf(product)).round === 1; count++) {
          assert(count < 32, 'engineering phase-transition observation budget exceeded');
          state = await stateOf(product);
          const menus = await allMenus(product, credentials);
          const actions = menus.flatMap(row => row.legalSpace.finiteActions.map(item => item.action));
          const selected = actions.find(action => action.actionType === 'choose_first_actor'
            && action.chosenFirstActorSideKey === state.firstPlayerSideKey)
            || actions.find(action => action.actionType === 'pass')
            || actions.find(action => action.sourceRuntimeKind === 'combat_pass')
            || actions.find(action => ['mission_control', 'mission', 'product_lifecycle'].includes(action.sourceRuntimeKind));
          assert(selected, `missing real lifecycle successor in ${state.phase}`);
          await take(product, credentials, selected.actionType,
            action => selected.chosenFirstActorSideKey ? action.chosenFirstActorSideKey === selected.chosenFirstActorSideKey : true);
        }
        state = await stateOf(product);
        assert.equal(state.round, 2);
        assert.equal(state.phase, 'start_of_round');
        assert.equal(state.currentProductMatchLifecycle.step, 'mission_before_priority');
        await activateMarker(product, credentials);
        await priority(product, credentials);
        const aggregate = await product.store.loadRoom(roomId);
        state = aggregate.envelope.state;
        assert.equal(state.round, 2);
        assert.equal(state.phase, 'movement');
        assert.deepEqual(state.officialRoundSupplyState.supplyPoolBySide, { player1: 8, player2: 8 });
        assert.equal(state.board.missionMarkers.filter(marker => marker.isActivated).length, 2);
        const history = state.officialMissionRuntimeState.startRoundHistory;
        assert.deepEqual(history.map(entry => entry.round), [1, 2]);
        const trace = state.log.flatMap(entry => entry.events || []);
        for (const round of [1, 2]) {
          const activated = trace.findIndex(event => event.type === 'current_product_mission_activation_completed_before_priority' && event.round === round);
          const opened = trace.findIndex(event => event.type === 'current_product_round_activation_opened' && event.round === round);
          assert(activated >= 0 && opened > activated);
        }
        const evidenceRef = await save('successor.json', { revision: aggregate.stateRevision, stateHash: aggregate.envelope.stateHash,
          round: 2, phase: state.phase, startRoundHistory: history, supply: state.officialRoundSupplyState.supplyPoolBySide,
          eventTrace: trace, duplicateApplyVerifiedByRoomHelper: true, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, authority);
        const aggregate = await product.store.loadRoom(roomId);
        const saved = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, saved.stateHash);
        assert.deepEqual(aggregate.envelope.state.officialMissionRoundStartPolicy, missionRoundStartPolicy);
        const replay = await product.room.replayRoom({ roomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('cold.json', { originalDiceAndReceiptsReplay: true, round: 2,
          stateAndPolicyPreserved: true, providerCalls: 0, productionPublished: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ],
  });
  console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), providerCalls: 0 }));
}
