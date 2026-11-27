import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_KHALAS_GIFT_DEFINITION_ID as definitionId } from '../packages/product-composition/official-khalas-gift-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/khalas-gift/canonical-payment/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const feedbackId = 'unit:high_templar/feedback-movement-phase@1';
const definitions = [definitionId, farsightId, feedbackId];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);
const active = (id, pieceId) => ({ actionType: 'resolve_characteristic_status_ability', pieceId, definitionId: id });

export async function verifyWave3KhalasGiftV1({ sourceOnly = false } = {}) {
  const [release, base, map, blockedMap] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/force-wall-traversal/checkpoint-r0.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/farsight/cast-los-v2/checkpoint.json'),
  ]);
  if (!sourceOnly) await fs.mkdir(directory, { recursive: true });
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const files = new Map();
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: ref => files.get(ref) ?? read(ref) });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeCleanupReactionContinuation: true,
      includeMelee: true, includeCharacteristicConsumers: true,
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:robotics_facility'], units: [unit('hero', 'army_units:tassadar'), unit('escort', 'army_units:immortal'), { ...unit('templar', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] }] },
        player2: { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
          tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', 'army_units:goliath')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'movement', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['hero', 16, 23], ['escort', 12, 29], ['templar', 25, 24], ['enemy', 29, 23],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches, yInches: yInches + 1.85 * index });
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khalas-gift-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.152.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    if (sourceOnly) {
      assert.equal(runtime.bundle.resourceTypeContract, 'card_payment_CP_BM_PE_v1');
      const actual = runtime.bundle.routes.map(row => ({ definitionId: row.definitionId, resourceType: row.resourceType }));
      assert(actual.every(row => row.resourceType === 'PE'));
      return { canonicalBundle: true, resourceTypes: actual, sourceOnly: true };
    }
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khalas-gift', status: 'candidate',
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
      const roomId = 'khalas-gift-' + name;
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

    const gift = state => state.officialKhalasGiftByUnit?.templar;
    const cost = row => row?.constraints?.resourceCostsByChoice?.default;
    const domain = (state, id, pieceId) => runtime.enumerate(state).parameterDomains
      .find(row => row.definitionId === id && row.pieceId === pieceId);
    assert.equal(domain(state, definitionId, 'hero').constraints.lineOfSightRequired, true);
    assert.deepEqual(domain(state, definitionId, 'hero').parameterSchema.targetUnitId.enum, ['templar']);
    const far = structuredClone(state);
    const distant = find(far, 'templar');
    distant.xInches = 40;
    for (const model of distant.models) model.xInches = 40;
    assert.equal(domain(far, definitionId, 'hero'), undefined);
    const blocked = structuredClone(state);
    blocked.board.terrain = structuredClone(blockedMap.envelope.state.board.terrain);
    assert.equal(domain(blocked, definitionId, 'hero'), undefined);

    async function stageOnce(name, initial, scenario, expected, steps) {
      const file = name + '-checkpoint.json';
      const prior = await loadSaved(file);
      if (prior) return prior;
      const result = await stage(name, initial, scenario, expected, steps);
      await save(file, result);
      return result;
    }
    function stepsFor({ native, roomId, credentials }) {
      const readHead = async () => (await native.store.loadRoom(roomId)).envelope.state;
      const commit = (id, pieceId, targetUnitId, paymentCardInstanceIds) => native.commit({
        roomId, credential: credentials.player1, operationKey: id, choice: active(id, pieceId),
        parameters: () => ({ activeUnitId: pieceId, targetUnitId, paymentCardInstanceIds }),
      });
      return { readHead, commit };
    }
    const cast = await stageOnce('cast', state, { castRangeAndLineOfSightValidation: true }, 1, async room => {
      const { readHead, commit } = stepsFor(room);
      await commit(definitionId, 'hero', 'templar', []);
      const head = await readHead();
      assert.equal(gift(head).sourcePieceId, 'hero');
      assert.equal(gift(head).targetPieceId, 'templar');
      assert.equal(head.log.at(-1).events.find(x => x.type === 'ability_resource_paid').resourceCost, 0);
      return { clearTargetAndTypeFilters: true, targetPieceId: 'templar' };
    });
    const acting = structuredClone(cast.head.state);
    delete acting.selectedRosterActivationWindow;
    find(acting, 'hero').activatedPhases = { movement: true };
    const paired = await stageOnce('purchased-recipient', acting, { signedGiftParent: cast.head.stateHash,
      declaredRecipientActivationBoundary: true }, 2, async room => {
      const { native, roomId, credentials } = room;
      const { readHead, commit } = stepsFor(room);
      const current = await readHead();
      if ((await native.store.loadRoom(roomId)).stateRevision === 0) {
        const input = { roomId, seatToken: credentials.player1.seatToken };
        const roomState = await native.store.loadRoom(roomId);
        const menu = await native.room.legalSpace(input);
        const firstAction = menu.legalSpace.parameterDomains.find(row => row.definitionId === farsightId);
        assert(firstAction, 'Farsight must be purchased by the recipient roster');
        assert.equal(cost(firstAction)?.printedResourceCost, 1);
        assert.equal(cost(firstAction).effectiveResourceCost, 0);
        assert.equal(cost(firstAction).khalasGift.effectHash, gift(current).effectHash);
        const preview = await native.room.previewAction({ ...input, expectedStateRevision: 0,
          expectedStateHash: roomState.envelope.stateHash, expectedMatchBindingHash: roomState.envelope.matchBindingHash,
          expectedLegalSpaceHash: menu.legalSpace.legalSpaceHash,
          proposal: { kind: 'parameterized', domainId: firstAction.domainId,
            parameters: { activeUnitId: 'templar', targetUnitId: 'templar', paymentCardInstanceIds: [] } } });
        assert.equal(preview.ok, true, JSON.stringify(preview));
        assert.equal(gift(await readHead()).effectHash, gift(current).effectHash);
      }
      await commit(farsightId, 'templar', 'templar', []);
      const afterFirst = await readHead();
      const first = afterFirst.log.find(row => row.events.some(evt => evt.type === 'khalas_gift_consumed'));
      assert.equal(first.events.find(evt => evt.type === 'ability_resource_paid').resourceCost, 0);
      assert.equal(first.events.find(evt => evt.type === 'khalas_gift_consumed').definitionId, farsightId);
      assert.equal(gift(afterFirst), undefined);
      const regular = domain(afterFirst, feedbackId, 'templar');
      const regularCost = cost(regular);
      assert.equal(regularCost.effectiveResourceCost, 1);
      const payment = regular.parameterSchema.paymentCardInstanceIds.enum[0];
      assert.equal(payment.length, 1);
      await commit(feedbackId, 'templar', 'enemy', payment);
      const head = await readHead();
      assert.equal(head.log.at(-1).events.find(evt => evt.type === 'ability_resource_paid').resourceCost, 1);
      assert.equal(head.log.flatMap(row => row.events).filter(evt => evt.type === 'khalas_gift_consumed').length, 1);
      return { previewRetainedGift: true, paidPE: [0, 1], secondAbilityPaysNormalCost: true };
    });
    const cleanupState = structuredClone(cast.head.state);
    delete cleanupState.selectedRosterActivationWindow;
    cleanupState.phase = 'cleanup';
    cleanupState.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
      round: cleanupState.round, step: 'cleanup_and_refresh', trainingTruth: false };
    const cleanup = await stageOnce('cleanup', cleanupState, { signedGiftParent: cast.head.stateHash }, 1,
      async ({ native, roomId, credentials }) => {
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'expire-gift',
          kind: 'finite', choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
        const head = (await native.store.loadRoom(roomId)).envelope.state;
        assert.equal(head.officialKhalasGiftByUnit, undefined);
        assert(head.log.flatMap(row => row.events).some(evt => evt.type === 'khalas_gift_expired'));
        return { unusedGiftRemoved: true };
      });
    const result = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion,
      cast: cast.evidence, payment: paired.evidence, cleanup: cleanup.evidence,
      targetRejections: ['self', 'mechanical', 'enemy', 'outside_range', 'no_line_of_sight'],
      signedReceipts: [cast, paired, cleanup].reduce((count, row) => count + row.signedCount, 0),
      coldReplayed: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
