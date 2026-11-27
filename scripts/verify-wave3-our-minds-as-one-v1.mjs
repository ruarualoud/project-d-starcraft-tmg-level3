import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_OUR_MINDS_AS_ONE_DEFINITION_ID as definitionId, inspectOfficialOurMindsAsOneV1 } from '../packages/product-composition/official-our-minds-as-one-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = 'build/ticket-28-protoss-wave3-20261120-v1/our-minds-as-one/payment/';
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

export async function verifyWave3OurMindsAsOneV1() {
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
      includeMelee: true, includeCharacteristicConsumers: true,
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            { ...unit('large-templar', 'army_units:high_templar'), compositionKind: 'large', upgrades: [{ upgradeName: 'Farsight' }] },
            { ...unit('small-templar', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
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
      ['large-templar', 25, 24], ['small-templar', 16, 23], ['enemy', 32, 23],
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + 1.85 * (index % 2), yInches: yInches + 1.85 * Math.floor(index / 2) });
      }
    }
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-our-minds-as-one-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true,
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, '3.153.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'executable_exact');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-our-minds-as-one', status: 'candidate',
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
      const roomId = 'our-minds-as-one-' + name;
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


    const cost = row => row.constraints.resourceCostsByChoice.default;
    const before = inspectOfficialOurMindsAsOneV1(state, 'large-templar');
    assert.equal(before.currentSupply, 2);
    assert.equal(before.firstAbilityPeReduction, 1);
    assert.equal(before.psionicStormRollModifier, 1);
    const small = inspectOfficialOurMindsAsOneV1(state, 'small-templar');
    assert.equal(small.currentSupply, 1);
    assert.equal(small.firstAbilityPeReduction, 0);
    assert.equal(small.psionicStormRollModifier, 0);
    const matched = (domains, id, pieceId) => domains.find(row => row.definitionId === id && row.pieceId === pieceId);
    async function stageOnce(name, initial, scenario, expected, steps) {
      const file = name + '-checkpoint.json';
      const prior = await loadSaved(file);
      if (prior) return prior;
      const result = await stage(name, initial, scenario, expected, steps);
      await save(file, result);
      return result;
    }
    const payment = await stageOnce('payment', state, { activeAbilityPrivateDiscount: false,
      rosterIncludesSupplyOneControl: true }, 2, async ({ native, roomId, credentials }) => {
      const input = { roomId, seatToken: credentials.player1.seatToken };
      const readHead = async () => (await native.store.loadRoom(roomId)).envelope.state;
      const initial = await native.store.loadRoom(roomId);
      if (initial.stateRevision === 0) {
        const legal = await native.room.legalSpace(input);
        const menu = legal.legalSpace.parameterDomains;
        const discounted = matched(menu, farsightId, 'large-templar');
        const original = matched(menu, farsightId, 'small-templar');
        assert.equal(cost(discounted).effectiveResourceCost, 0);
        assert.equal(cost(original).effectiveResourceCost, 1);
        assert.equal(cost(discounted).ourMindsAsOne.sourceRouteHash, before.sourceRouteHash);
        assert.deepEqual(discounted.parameterSchema.paymentCardInstanceIds.enum, [[]]);
        const preview = await native.room.previewAction({ ...input, expectedStateRevision: 0,
          expectedStateHash: initial.envelope.stateHash, expectedMatchBindingHash: initial.envelope.matchBindingHash,
          expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
          proposal: { kind: 'parameterized', domainId: discounted.domainId, parameters: {
            activeUnitId: 'large-templar', targetUnitId: 'large-templar', paymentCardInstanceIds: [],
          } } });
        assert.equal(preview.ok, true, JSON.stringify(preview));
        assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, initial.envelope.stateHash);
      }
      const commit = (id, targetUnitId, paymentCardInstanceIds) => native.commit({
        roomId, credential: credentials.player1, operationKey: id, choice: active(id, 'large-templar'),
        parameters: () => ({ activeUnitId: 'large-templar', targetUnitId, paymentCardInstanceIds }),
      });
      await commit(farsightId, 'large-templar', []);
      const afterFirst = await readHead();
      const row = afterFirst.log.find(entry => entry.events.some(event => event.type === 'our_minds_as_one_first_ability_resolved'));
      assert.equal(row.events.find(event => event.type === 'ability_resource_paid').resourceCost, 0);
      assert.equal(row.events.find(event => event.type === 'our_minds_as_one_first_ability_resolved').definitionId, farsightId);
      if ((await native.store.loadRoom(roomId)).stateRevision === 1) {
        const next = matched((await native.room.legalSpace(input)).legalSpace.parameterDomains, feedbackId, 'large-templar');
        assert.equal(cost(next).effectiveResourceCost, 1);
        const paid = next.parameterSchema.paymentCardInstanceIds.enum[0];
        assert.equal(paid.length, 1);
        await commit(feedbackId, 'enemy', paid);
      }
      const head = await readHead();
      assert.equal(head.log.at(-1).events.find(event => event.type === 'ability_resource_paid').resourceCost, 1);
      assert.equal(head.log.flatMap(entry => entry.events.filter(event => event.type === 'our_minds_as_one_first_ability_resolved')).length, 1);
      assert.equal(inspectOfficialOurMindsAsOneV1(head, 'large-templar').psionicStormRollModifier, 1);
      return { previewRetainedFirstUse: true, supplyValues: [2, 1], paidPE: [0, 1] };
    });
    const cleanupState = structuredClone(payment.head.state);
    delete cleanupState.selectedRosterActivationWindow;
    cleanupState.phase = 'cleanup';
    cleanupState.currentProductMatchLifecycle = { schema: 'starcraft_tmg_current_product_match_lifecycle_v1',
      round: cleanupState.round, step: 'cleanup_and_refresh', trainingTruth: false };
    const cleanup = await stageOnce('cleanup', cleanupState, { signedPaymentParent: payment.head.stateHash }, 1,
      async ({ native, roomId, credentials }) => {
        await native.commit({ roomId, credential: credentials.player1, operationKey: 'clear-first-resolution',
          kind: 'finite', choice: { actionType: 'resolve_current_product_cleanup_refresh' } });
        const head = (await native.store.loadRoom(roomId)).envelope.state;
        assert.equal(head.officialOurMindsFirstAbilityByUnit, undefined);
        assert.equal(inspectOfficialOurMindsAsOneV1(head, 'large-templar').firstAbilityPeReduction, 1);
        return { firstUseResetsAtCleanup: true };
      });
    const result = { status: 'passed_payment_component', runtimeVersion: runtime.descriptor.runtimeVersion,
      payment: payment.evidence, cleanup: cleanup.evidence, stormRollConditionOwned: true, stormApplied: false,
      signedReceipts: payment.signedCount + cleanup.signedCount, exactColdReplay: true, modelCalls: 0 };
    await save('result.json', result);
    return result;
  } finally { store.close(); }
}

export async function verifyWave3PsionicStormSourceRulesV1() {
  const [release, payment, gale, legacyRuntime, savedSourceRules] = await Promise.all([
    read('content/source-releases/wave3-20261121-force-wall-geometry-release-v1.json'),
    read(out + 'payment-checkpoint.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/feedback/cast-twilight/checkpoint.json'),
    read(out + 'runtime.json'),
    read('build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/source-rules.json'),
  ]);
  const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
  try {
    const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
    resolver.register(release);
    const context = await resolver.resolve({ releaseId: release.releaseId, purpose: 'area_ability_component' });
    const old = payment.head.state;
    const twilight = gale.envelope.state;
    const build = (state, includePsionicStormSourceRules, includePsionicStormGeometryEvidence = false) => createOfficialCharacteristicStatusComponentRuntimeV2({
      context, spatialState: state, includeMelee: true, includeRanged: true, includePsionicStormSourceRules,
      includePsionicStormGeometryEvidence,
      ...(state === twilight ? { includeTargetReactions: true, includeArmourReactions: true,
        includePrecisionChoices: true, includeArmourChoices: true, includeHits: true } : {}),
      definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds,
    });
    assert.deepEqual(build(old, false).descriptor, legacyRuntime);
    assert.throws(() => build(old, false, true), /PSIONIC_STORM_SOURCE_RULES_REQUIRED/);
    const source = 'unit:high_templar/psionic-storm-movement-phase@1';
    const galeSource = 'unit:twilight_templar__high_templar_/psionic-gale-movement-phase@1';
    const cases = [
      { state: old, envelopeHash: payment.head.stateHash, pieceId: 'large-templar', sideKey: 'player1',
        definitionId: source, resolutionPhase: 'movement', threshold: 4, rollModifier: 1, damageKind: 'non_lethal_damage' },
      { state: old, envelopeHash: payment.head.stateHash, pieceId: 'small-templar', sideKey: 'player1',
        definitionId: source, resolutionPhase: 'assault', threshold: 5, rollModifier: 0, damageKind: 'standard_damage' },
      { state: twilight, envelopeHash: gale.envelope.stateHash, pieceId: 'templar', sideKey: 'player1',
        definitionId: galeSource, resolutionPhase: 'assault', threshold: 4, rollModifier: 0, damageKind: 'standard_damage' },
    ];
    const facts = cases.map(({ state, envelopeHash, threshold, rollModifier, damageKind, ...selection }, index) => {
      const before = structuredClone(state);
      const query = { queryKind: 'psionic_storm_source_rules', ...selection };
      const previous = build(state, true);
      assert.equal(previous.descriptor.runtimeVersion, '3.170.0');
      assert.deepEqual({ envelopeHash, ...previous.query(state, query) }, savedSourceRules.facts[index]);
      const runtime = build(state, true, true);
      assert.equal(runtime.descriptor.runtimeVersion, '3.171.0');
      assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === selection.definitionId).execution.status, 'pending_family_adapter');
      const response = runtime.query(state, query);
      assert.equal(response.result.geometryEvidence.profileHash, release.components.battlefieldAssets.integrity.value);
      assert.deepEqual(response.result.geometryEvidence.components.map(row => [row.componentKind, row.status, row.reason]), [
        ['psionic_storm', 'unresolved', 'STORM_TOKEN_FOOTPRINT_UNSPECIFIED'],
        ['psionic_storm_blast_template', 'unresolved', 'STORM_TEMPLATE_FOOTPRINT_UNSPECIFIED'],
      ]);
      assert.equal(response.result.rawDieSuccessThreshold, threshold);
      assert.equal(response.result.rollModifier, rollModifier);
      assert.equal(response.result.dice.baseDicePerAffectedUnit, 3);
      assert.equal(response.result.dice.extraDicePerCoveredModel, 1);
      assert.equal(response.result.damage.kind, damageKind);
      assert.equal(response.result.coverageResolved, false);
      assert.equal(response.result.damageApplied, false);
      assert.throws(() => runtime.query(state, { ...query, sideKey: 'player2' }), /PSIONIC_STORM_RULES_CASTER_MISMATCH/);
      assert.throws(() => runtime.query(state, { ...query, resolutionPhase: 'combat' }), /PSIONIC_STORM_RULES_QUERY_INVALID/);
      assert.deepEqual(state, before);
      return { envelopeHash, ...response };
    });
    return { status: 'source_rules_passed', runtimeVersion: '3.171.0', exactLegacyDescriptor: true, exactPreviousQueryReceipts: true,
      facts, pendingTemplateGeometry: true, roomApplyInvoked: false, modelCalls: 0 };
  } finally { store.close(); }
}
