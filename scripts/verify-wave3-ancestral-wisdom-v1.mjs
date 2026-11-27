import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_ANCESTRAL_WISDOM_DEFINITION_ID as definitionId } from '../packages/product-composition/official-ancestral-wisdom-payment-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/ancestral-wisdom/';
const directory = path.join(root, out);
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const feedbackId = 'unit:high_templar/feedback-movement-phase@1';
const definitions = [farsightId, feedbackId];
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);
const active = (id, pieceId) => ({ actionType: 'resolve_characteristic_status_ability', pieceId, definitionId: id });

export async function verifyWave3AncestralWisdomV1({ inspectRequested = false } = {}) {
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, reactionDefinitionIds: [definitionId],
      includeMelee: true, includeCharacteristicConsumers: true,
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            { ...unit('templar', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
          ] },
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
      ['templar', 25, 24], ['enemy', 30, 23],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + 1.85 * (index % 2), yInches: yInches + 1.85 * Math.floor(index / 2) });
      }
    }
    for (const card of state.cardResources.player1) {
      if (card.officialCardRecordKey !== 'tactical_cards:templar_archives') card.readiness = 'exhausted';
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-ancestral-wisdom-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.156.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-ancestral-wisdom', status: 'candidate',
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
      const roomId = 'ancestral-wisdom-' + name;
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


    const openChoice = 'request_ancestral_wisdom_payment';
    const costOf = row => row.constraints.resourceCostsByChoice.default;
    const archive = state => state.cardResources.player1.find(entry => entry.officialCardRecordKey === 'tactical_cards:templar_archives');
    const requestParams = { activeUnitId: 'templar', targetUnitId: 'templar', paymentCardInstanceIds: [] };
    async function stageOnce(name, initial, scenario, expected, steps) {
      const file = name + '-checkpoint.json';
      const prior = await loadSaved(file);
      if (prior) return prior;
      const result = await stage(name, initial, scenario, expected, steps);
      await save(file, result);
      return result;
    }
    function tools({ native, roomId, credentials }) {
      const input = side => ({ roomId, seatToken: credentials[side].seatToken });
      const menu = async side => {
        const result = await native.room.legalSpace(input(side));
        assert.equal(result.ok, true, JSON.stringify(result));
        return result.legalSpace;
      };
      const room = () => native.store.loadRoom(roomId);
      const commit = (side, operationKey, choice, parameters = () => ({})) => native.commit({
        roomId, credential: credentials[side], operationKey, choice, parameters,
      });
      const pass = side => commit(side, 'pass-' + side, { actionType: 'pass_reaction_family_window' });
      return { input, menu, room, commit, pass };
    }
    if (inspectRequested) {
      const product = open();
      const roomId = 'ancestral-wisdom-requested';
      try {
        const credentials = await product.create(roomId, createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
          scenario: { modelCalls: 0, onlyArchivesReadyAtStart: true } }));
        const current = await product.store.loadRoom(roomId);
        const { definitionId, title } = runtime.descriptor.ancestralWisdomPaymentRuntime || {};
        const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        return { stateRevision: current.stateRevision, definitionId, title,
          response: legal.ok ? { ok: true, domainCount: legal.legalSpace.parameterDomains.length } : legal };
      } finally { product.close(); }
    }
    const requested = await stageOnce('requested', state, { onlyArchivesReadyAtStart: true }, 1, async args => {
      const { menu, room, commit } = tools(args);
      const before = await room();
      if (before.stateRevision === 0) {
        const legal = await menu('player1');
        const plain = legal.parameterDomains.find(row => row.definitionId === farsightId && row.actionType !== openChoice);
        const request = legal.parameterDomains.find(row => row.definitionId === farsightId && row.actionType === openChoice);
        assert(plain && request, JSON.stringify(legal.parameterDomains.map(row => [row.actionType, row.definitionId])));
        assert.equal(costOf(plain).effectiveResourceCost, 1);
        assert.equal(costOf(request).effectiveResourceCost, 0);
        assert.deepEqual(request.parameterSchema.paymentCardInstanceIds.enum, [[]]);
        assert.equal(costOf(request).ancestralWisdom.cardInstanceId, archive(before.envelope.state).cardInstanceId);
      }
      await commit('player1', 'ask-for-wisdom', { actionType: openChoice, definitionId: farsightId, pieceId: 'templar' }, () => requestParams);
      const head = (await room()).envelope.state;
      assert.equal(head.pendingOfficialReactionWindow.triggerKind, 'ability_cost_payment');
      assert.equal(head.pendingOfficialReactionWindow.activationId, '1:movement:player1:templar');
      assert.equal(archive(head).readiness, 'ready');
      assert.equal(head.characteristicStatusAbilityHistory?.length || 0, 0);
      return { normalPrice: 1, discountedPrice: 0, noPaymentOrCastOnOpening: true };
    });
    const authorized = await stageOnce('authorized', requested.head.state, { signedIntentParent: requested.head.stateHash }, 2, async args => {
      const { menu, room, commit, pass } = tools(args);
      if ((await room()).stateRevision === 0) {
        const legal = await menu('player1');
        assert(legal.parameterDomains.some(row => row.definitionId === definitionId));
      }
      await commit('player1', 'use-wisdom', { actionType: 'resolve_reaction_family_ability', definitionId }, () => ({ paymentCardInstanceIds: [] }));
      if ((await room()).stateRevision === 1) {
        const legal = await menu('player2');
        assert.deepEqual(legal.parameterDomains.map(row => row.actionType), ['pass_reaction_family_window']);
      }
      await pass('player2');
      const head = (await room()).envelope.state;
      assert.equal(head.pendingOfficialAncestralWisdomPayment.stage, 'authorized');
      assert.equal(head.activeSideKey, 'player1');
      assert.equal(archive(head).readiness, 'ready');
      assert.equal(head.characteristicStatusAbilityHistory?.length || 0, 0);
      assert.equal(head.officialReactionHistory.filter(row => row.definitionId === definitionId).length, 1);
      return { acceptedInActivePriority: true, archiveStayedReady: true };
    });
    const paid = await stageOnce('paid', authorized.head.state, { signedReactionParent: authorized.head.stateHash }, 2, async args => {
      const { input, menu, room, commit } = tools(args);
      const before = await room();
      if (before.stateRevision === 0) {
        const legal = await menu('player1');
        assert.equal(legal.parameterDomains.length, 1);
        const domain = legal.parameterDomains[0];
        assert.equal(domain.definitionId, farsightId);
        assert.equal(costOf(domain).effectiveResourceCost, 0);
        const invalid = await args.native.room.previewAction({ ...input('player1'), expectedStateRevision: 0,
          expectedStateHash: before.envelope.stateHash, expectedMatchBindingHash: before.envelope.matchBindingHash,
          expectedLegalSpaceHash: legal.legalSpaceHash, proposal: { kind: 'parameterized', domainId: domain.domainId,
            parameters: { ...requestParams, paymentCardInstanceIds: [archive(authorized.head.state).cardInstanceId] } } });
        assert.equal(invalid.ok, false);
      }
      await commit('player1', 'cast-farsight', active(farsightId, 'templar'), () => requestParams);
      const current = (await room()).envelope.state;
      const row = current.log.find(log => log.events.some(event => event.type === 'ancestral_wisdom_payment_consumed'));
      assert.equal(row.events.find(event => event.type === 'ability_resource_paid').resourceCost, 0);
      assert.equal(current.pendingOfficialAncestralWisdomPayment, undefined);
      if ((await room()).stateRevision === 1) {
        assert.equal(archive(current).readiness, 'ready');
        const legal = await menu('player1');
        assert(!legal.parameterDomains.some(row => row.actionType === openChoice));
        const next = legal.parameterDomains.find(row => row.definitionId === feedbackId);
        assert.equal(costOf(next).effectiveResourceCost, 1);
        assert.deepEqual(next.parameterSchema.paymentCardInstanceIds.enum, [[archive(current).cardInstanceId]]);
        await commit('player1', 'cast-feedback', active(feedbackId, 'templar'), () => ({
          activeUnitId: 'templar', targetUnitId: 'enemy', paymentCardInstanceIds: [archive(current).cardInstanceId],
        }));
      }
      const head = (await room()).envelope.state;
      assert.equal(head.log.at(-1).events.find(event => event.type === 'ability_resource_paid').resourceCost, 1);
      assert.equal(archive(head).readiness, 'exhausted');
      return { sameCastSettledAtZero: true, secondAbilityPaidOne: true, priorReactionDidNotExhaustArchive: true };
    });
    const declined = await stageOnce('declined', requested.head.state, { signedIntentParent: requested.head.stateHash }, 2, async args => {
      const { menu, room, pass } = tools(args);
      await pass('player1');
      await pass('player2');
      const head = (await room()).envelope.state;
      assert.equal(head.pendingOfficialAncestralWisdomPayment, undefined);
      assert.equal(head.characteristicStatusAbilityHistory?.length || 0, 0);
      assert.equal(head.officialReactionHistory?.length || 0, 0);
      assert.equal(archive(head).readiness, 'ready');
      assert((await menu('player1')).parameterDomains.some(row => row.definitionId === farsightId && row.actionType !== openChoice));
      return { declinedWithoutChargingOrCasting: true, fullPriceAlternativePreserved: true };
    });
    const result = { status: 'passed', runtimeVersion: runtime.descriptor.runtimeVersion, requested: requested.evidence,
      authorized: authorized.evidence, paid: paid.evidence, declined: declined.evidence,
      signedReceipts: [requested, authorized, paid, declined].reduce((n, row) => n + row.signedCount, 0),
      exactColdReplay: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}
