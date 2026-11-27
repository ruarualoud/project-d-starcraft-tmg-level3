import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_EXECUTORS_WILL_DEFINITION_ID as definitionId } from '../packages/product-composition/official-executors-will-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/executors-will/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const definitions = [definitionId];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);
const active = id => ({ actionType: 'resolve_characteristic_status_ability', pieceId: 'hero', definitionId: id });

export async function verifyWave3ExecutorsWillV1() {
  const [release, base, map] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
  ]);
  await fs.mkdir(directory, { recursive: true });
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const files = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => files.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeCleanupReactionContinuation: true,
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [unit('hero', 'army_units:tassadar'), unit('escort', 'army_units:immortal')] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:factory', 'tactical_cards:factory__tech_lab_', 'tactical_cards:armory'],
           units: ['marked-a', 'marked-b', 'unmarked'].map(id => unit(id, 'army_units:goliath')) },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };
    for (const [id, xInches, yInches] of [
      ['hero', 16, 23], ['escort', 12, 30], ['marked-a', 32, 25],
      ['marked-b', 45, 26], ['unmarked', 40, 31],
    ]) {
      const piece = find(state, id);
      assert.equal(piece.models.length, 1);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      Object.assign(piece.models[0], { isOnField: true, xInches, yInches });
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-executors-will-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.151.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-executors-will', status: 'candidate',
      snapshot: context.snapshot, dataset: context.dataset, sourceRevision: await read(release.source.sourceRevisionRef),
      snapshotRef: release.source.snapshotRef, datasetRef: release.source.datasetRef,
      sourceRevisionRef: release.source.sourceRevisionRef, sourcePolicy: release.source.policy, referenceSources: release.source.references,
      components: { ...release.components, rulesRuntime: { ref: runtimeRef, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } },
    });
    resolver.register(manifest);
    const bound = await resolver.resolve({ releaseId: manifest.releaseId, purpose: 'area_ability_component' });
    state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({ state,
      missionSupplyProfile: state.officialMissionSupplyProfile, rulesRuntimeHash: runtime.descriptor.runtimeHash });
    await save('runtime.json', runtime.descriptor);
    await save('candidate-release.json', manifest);
    const rulesRuntime = bindOfficialReleaseRulesRuntimeV2({ context: bound, runtime: compose(bound) });
    const open = () => openWave3EngineeringRoomV1({ directory, filename: 'scenarios.sqlite', rulesRuntime });
    async function stage(name, initial, scenario, expectedCount, steps) {
      const roomId = 'executors-will-' + name;
      const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state: initial, scenario: { modelCalls: 0, ...scenario } });
      const first = open(name);
      let head, evidence;
      try {
        const credentials = await first.create(roomId, authority);
        evidence = await steps({ native: first, roomId, credentials });
        head = (await first.store.loadRoom(roomId)).envelope;
      } finally { first.close(); }
      const cold = open(name);
      try {
        await cold.restoreDependencies(roomId, authority);
        const replay = await cold.store.loadReplayBundle(roomId);
        const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
        assert.equal(journal.length, expectedCount);
        const signed = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
        assert.equal(signed.ok, true, JSON.stringify(signed));
        assert.deepEqual(signed.envelope, head);
        return { evidence, signedCount: journal.length, head };
      } finally { cold.close(); }
    }
    const marked = state => (state.board.markers || []).filter(row => row.markerRole === 'executors_will_target');
    const choices = state => runtime.enumerate(state).candidates
      .filter(row => row.sourceRuntimeKind === 'executors_will').map(row => row.actionType).sort();
    const pendingChoices = ['decline_executors_will', 'use_executors_will'];
    const stageOnce = async (name, initial, scenario, expected, steps) => {
      const file = name + '-checkpoint.json';
      const prior = await loadSaved(file);
      if (prior) return prior;
      const result = await stage(name, initial, scenario, expected, steps);
      await save(file, result);
      return result;
    };
    function stepsFor({ native, roomId, credentials }) {
      const readHead = async () => (await native.store.loadRoom(roomId)).envelope.state;
      const commit = (side, operationKey, actionType, pieceId, parameters) =>
        native.commit({ roomId, credential: credentials[side], operationKey,
          choice: { actionType, pieceId }, ...(parameters ? { parameters } : { kind: 'finite' }) });
      async function run(side, id) {
        const model = find(await readHead(), id).models[0];
        await commit(side, id + '-run', 'run', id, () => ({ leadingModelId: model.id, placements: [],
          path: [{ xMilliInches: Math.round(model.xInches * 1000), yMilliInches: Math.round(model.yInches * 1000) + 800 }] }));
        return readHead();
      }
      const finish = async (side, id) => {
        await commit(side, id + '-finish', 'finish_activation', id, () => ({}));
        return readHead();
      };
      return { readHead, commit, run, finish };
    }
    const movement = await stageOnce('movement', state, { rangedRestrictionAbsent: true }, 2, async room => {
      const { native, roomId, credentials } = room;
      const { readHead, finish } = stepsFor(room);
      const domain = runtime.enumerate(state).parameterDomains.find(row => row.definitionId === definitionId);
      const payments = domain.parameterSchema.paymentCardInstanceIds.enum;
      assert.equal(domain.constraints.resourceCost, 1);
      assert.equal(domain.constraints.executorsWill.requiresLineOfSight, false);
      assert.deepEqual(domain.parameterSchema.targetUnitIds.items.enum, ['marked-a', 'marked-b', 'unmarked']);
      const parameters = { activeUnitId: 'hero', paymentCardInstanceIds: payments[0], targetUnitIds: ['marked-b', 'marked-a'] };
      const seat = { roomId, seatToken: credentials.player1.seatToken };
      const aggregate = await native.store.loadRoom(roomId);
      if (aggregate.stateRevision === 0) {
        const legal = await native.room.legalSpace(seat);
        const outer = legal.legalSpace.parameterDomains.find(row => row.definitionId === definitionId);
        for (const targetUnitIds of [['marked-a', 'marked-a'], ['marked-a', 'escort'], ['marked-a']]) {
          const denial = await native.room.previewAction({ ...seat, expectedStateRevision: 0,
            expectedStateHash: aggregate.envelope.stateHash, expectedMatchBindingHash: aggregate.envelope.matchBindingHash,
            expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
            proposal: { kind: 'parameterized', domainId: outer.domainId, parameters: { ...parameters, targetUnitIds } } });
          assert.equal(denial.ok, false);
        }
        assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, aggregate.envelope.stateHash);
      }
      await native.commit({ roomId, credential: credentials.player1, operationKey: 'mark-two',
        choice: active(definitionId), parameters: () => parameters });
      const cast = await readHead();
      const payment = cast.log.at(-1).events.find(row => row.type === 'ability_resource_paid');
      assert.equal(payment.resourceType, 'PE');
      assert.equal(payment.resourceCost, 1);
      assert.deepEqual(marked(cast).map(row => row.anchorId).sort(), ['marked-a', 'marked-b']);
      assert(marked(cast).every(row => row.physicalPresence === false && row.sideKey === 'player1'));
      await finish('player1', 'hero');
      return { paidPE: payment.resourceCost, targetAnchors: ['marked-a', 'marked-b'], rejectedChoices: 3 };
    });
    const assault = structuredClone(movement.head.state);
    assault.phase = 'assault';
    assault.activeSideKey = 'player2';
    assault.phaseFirstActorByRound['1:assault'] = { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player2' };
    const phaseEvidence = { signedMovementParent: movement.head.stateHash, authoredAssaultPhaseBoundary: true };
    // This isolated Assault boundary declares the surviving units have already
    // completed the Movement Phase, allowing authentic Assault Run actions.
    for (const piece of assault.pieces) piece.activatedPhases = { ...piece.activatedPhases, movement: true };
    const offered = await stageOnce('offered', assault, phaseEvidence, 2, async room => {
      const { readHead, run, finish } = stepsFor(room);
      const running = await run('player2', 'marked-a');
      assert.deepEqual(choices(running), []);
      assert.equal(marked(running).length, 2);
      const paused = await finish('player2', 'marked-a');
      assert.equal(marked(paused).length, 0);
      assert.deepEqual(choices(paused), pendingChoices);
      assert.equal(paused.activeSideKey, 'player1');
      assert.equal((await readHead()).officialExecutorsWillEffects[0].triggeredByUnitId, 'marked-a');
      return { triggeredAfterFinishOnly: true };
    });
    const taken = await stageOnce('accept', offered.head.state, { signedOfferParent: offered.head.stateHash }, 5, async room => {
      const { commit, run, finish } = stepsFor(room);
      await commit('player1', 'take', 'use_executors_will', 'hero');
      await run('player1', 'hero');
      const first = await finish('player1', 'hero');
      assert.equal(first.activeSideKey, 'player1');
      assert.deepEqual(first.officialExecutorsWillEffects[0].completedUnitIds, ['hero']);
      assert(!runtime.enumerate(first).parameterDomains.some(row => row.actionType === 'run' && row.pieceId === 'hero'));
      await run('player1', 'escort');
      const second = await finish('player1', 'escort');
      assert.equal(second.activeSideKey, 'player2');
      assert.deepEqual(second.officialExecutorsWillEffects, []);
      return { friendlyActivationOrder: ['hero', 'escort'], nextSide: second.activeSideKey };
    });
    const declined = await stageOnce('decline', offered.head.state, { signedOfferParent: offered.head.stateHash }, 3, async room => {
      const { commit, run, finish } = stepsFor(room);
      await commit('player1', 'decline', 'decline_executors_will', 'hero');
      await run('player1', 'hero');
      const finished = await finish('player1', 'hero');
      assert.equal(finished.activeSideKey, 'player2');
      assert.deepEqual(finished.officialExecutorsWillEffects, []);
      return { noAdditionalFriendlyActivation: true };
    });
    const unmarked = await stageOnce('unmarked-first', assault, phaseEvidence, 2, async room => {
      const { run, finish } = stepsFor(room);
      await run('player2', 'unmarked');
      const finished = await finish('player2', 'unmarked');
      assert.deepEqual(marked(finished), []);
      assert.deepEqual(choices(finished), []);
      assert.deepEqual(finished.officialExecutorsWillEffects, []);
      return { firstEnemyActivationAlwaysClearsBothMarkers: true };
    });
    const withoutFirstIndicator = structuredClone(assault);
    withoutFirstIndicator.board.markers = withoutFirstIndicator.board.markers
      .filter(marker => marker.markerRole !== 'executors_will_target' || marker.anchorId !== 'marked-a');
    const lostIndicator = await stageOnce('indicator-removed', withoutFirstIndicator,
      { ...phaseEvidence, declaredOneMissingIndicator: true }, 2, async room => {
        const { run, finish } = stepsFor(room);
        await run('player2', 'marked-a');
        const finished = await finish('player2', 'marked-a');
        assert.deepEqual(marked(finished), []);
        assert.deepEqual(choices(finished), []);
        assert.deepEqual(finished.officialExecutorsWillEffects, []);
        return { noOfferAfterTargetIndicatorRemoved: true };
      });
    const cleanupState = structuredClone(movement.head.state);
    cleanupState.phase = 'cleanup';
    cleanupState.activeSideKey = 'player1';
    cleanupState.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
      round: cleanupState.round, step: 'cleanup_and_refresh', trainingTruth: false };
    const cleanup = await stageOnce('cleanup', cleanupState,
      { ...phaseEvidence, declaredNoEnemyActivationBeforeCleanup: true }, 1, async room => {
        const { native, roomId, credentials } = room;
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'expire',
          kind: 'finite', choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
        const finished = await stepsFor(room).readHead();
        assert.deepEqual(marked(finished), []);
        assert.deepEqual(finished.officialExecutorsWillEffects, []);
        assert.equal(finished.currentProductMatchLifecycle.step, 'determine_initiative');
        return { expiredWithoutActivation: true };
      });
    const result = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion,
      movement: movement.evidence, offer: offered.evidence, accept: taken.evidence,
      decline: declined.evidence, unmarked: unmarked.evidence,
      indicatorRemoved: lostIndicator.evidence, cleanup: cleanup.evidence,
      signedReceipts: [movement, offered, taken, declined, unmarked, lostIndicator, cleanup]
        .reduce((total, item) => total + item.signedCount, 0),
      exactColdReplay: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
