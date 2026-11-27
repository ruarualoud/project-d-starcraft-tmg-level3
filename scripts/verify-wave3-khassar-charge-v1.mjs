import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { applyOfficialSelectedRosterResolvedDamageV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { resolveOfficialEffectiveCombatProfileV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialRoundSupplyStateV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseManifestV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createWave3ComponentEngineeringAuthorityV1, declareWave3EngineeringCoherencyV1, openWave3EngineeringRoomV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = 'build/ticket-28-protoss-wave3-20261120-v1/khassar-charge/';
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const farsightId = 'unit:high_templar/farsight-movement-phase@1';
const definitionId = 'card:templar_caste/khassar-de-templari-any@1';
const definitions = [farsightId];
const suppressionId = 'unit:spec_ops_marauder__marauder_/suppression-shells-assault-phase@1';
const unit = (unitInstanceId, recordKey) => ({ unitInstanceId, recordKey, compositionKind: 'small', upgrades: [] });
const find = (state, id) => state.pieces.find(row => row.id === id);

export async function verifyWave3KhassarChargeV1({ withImpact = false, distanceShortfall = false, suppression = null } = {}) {
  assert(!(withImpact && distanceShortfall));
  assert(suppression === null || ['use', 'pass'].includes(suppression) && !withImpact && !distanceShortfall);
  const out = suppression ? output + 'suppression-' + suppression + '/'
    : withImpact ? output + 'impact/' : distanceShortfall ? output + 'distance-shortfall/' : output;
  const directory = path.join(root, out);
  const save = (file, value) => atomicWrite(path.join(directory, file), JSON.stringify(value, null, 2) + '\n');
  const loadSaved = async file => read(out + file).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
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
    const roster = createOfficialReleaseRosterStateV2({ context, characteristicDefinitionIds: definitions, includeKhassarMovement: true,
      ...(withImpact ? { meleeModifierDefinitionIds: ['unit:zealot/devastating-charge-assault-phase@1'] } : {}),
      includeMelee: true, includeCharacteristicConsumers: true,
      ...(suppression ? { reactionDefinitionIds: [suppressionId], includeAbilitySourcePhases: true } : {}),
      legacyDisclosurePolicy: base.state.officialRosterDisclosureDataBundle,
      candidatesBySide: {
        player1: { sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:templar_caste',
          tacticalCardRecordKeys: ['tactical_cards:templar_archives'], units: [
            { ...unit('actor', 'army_units:high_templar'), upgrades: [{ upgradeName: 'Farsight' }] },
            unit('recipient', withImpact ? 'army_units:zealot' : 'army_units:tassadar'),
            unit('mechanical', 'army_units:sentry'),
            ...(withImpact ? [] : [unit('not-yet', 'army_units:zealot')]),
          ] },
        player2: suppression
          ? { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:nova_covert_ops',
            tacticalCardRecordKeys: [], units: [unit('enemy', 'army_units:spec_ops_marauder__marauder_'),
              unit('nova', 'army_units:nova_assault_mode')] }
          : { sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: 'tactical_cards:terran_armed_forces',
            tacticalCardRecordKeys: ['tactical_cards:armory'], units: [unit('enemy', 'army_units:goliath')] },
      } });
    const fields = ['board', 'officialDeploymentGeometryBinding', 'officialModelGapTransitPolicy', 'officialStatusStayInPlayDataBundle',
      'officialMissionRuntimeDescriptor', 'officialMissionSupplyProfile', 'supplyLossLedger', 'engagementScale',
      'armyBuildingEngagementScale', 'officialBattlefieldTokenMarkerRulesDataBundle', 'officialBattlefieldTokenMarkerRegistry'];
    const state = { ...Object.fromEntries(fields.map(key => [key, structuredClone(map.state[key])])), ...roster.state,
      phase: 'assault', round: 1, activeSideKey: 'player1', firstPlayerSideKey: 'player1', log: [],
      phaseFirstActorByRound: { '1:assault': { round: 1, phase: 'assault', chosenFirstActorSideKey: 'player1' } } };

    for (const [id, xInches, yInches] of [
      ['actor', 17, 23], ['recipient', 20.8, 23], ['enemy', distanceShortfall ? 35.7 : 28.5, 23], ['mechanical', 20.8, 27.5],
      ...(withImpact ? [] : [['not-yet', 16.5, 28]]),
      ...(suppression ? [['nova', 47, 30]] : []),
    ]) {
      const piece = find(state, id);
      Object.assign(piece, { isOnField: true, isInReserves: false, xInches, yInches });
      const modelSpacing = Math.max(...piece.models.map(model => Math.max(model.baseWidthInches, model.baseDepthInches))) + 0.275;
      for (const [index, model] of piece.models.entries()) {
        Object.assign(model, { isOnField: true, xInches: xInches + modelSpacing * (index % 2),
          yInches: yInches + modelSpacing * Math.floor(index / 2) });
      }
    }
    const recipient = find(state, 'recipient');
    recipient.activatedPhases = { movement: true, assault: true, combat: false };
    const unitProfile = resolveOfficialEffectiveCombatProfileV1(state, recipient);
    const [leading, ...reserveCasualties] = recipient.models;
    const priorDamage = unitProfile.hitPoints - 1;
    applyOfficialSelectedRosterResolvedDamageV1(state, recipient, unitProfile, {
      casualtyModelIds: reserveCasualties.map(model => model.id), remainingModelIds: [leading.id],
      postDamageMarker: priorDamage, targetDestroyed: false, shieldedBefore: false, shieldedAfter: false,
    });
    declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave3-khassar-charge-' });
    const compose = bound => createOfficialCharacteristicStatusComponentRuntimeV2({
      context: bound, spatialState: state, definitionIds: definitions, includeMelee: true, includeRanged: true, includeKhassarCharge: true,
      ...(suppression ? { includeKhassarChargeDeclaration: true } : {}),
    });
    const runtime = compose(context);
    assert.equal(runtime.descriptor.runtimeVersion, suppression ? '3.167.0' : '3.161.0');
    assert.equal(runtime.catalogue.definitions.find(row => row.definitionId === definitionId).execution.status, 'pending_family_adapter');
    const runtimeRef = out + 'runtime.json';
    files.set(runtimeRef, runtime.descriptor);
    const manifest = createOfficialReleaseManifestV2({ releaseId: 'wave3-khassar-charge', status: 'candidate',
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

    const roomId = 'khassar-charge' + (withImpact ? '-impact' : '');
    const authority = createWave3ComponentEngineeringAuthorityV1({ context: bound, state,
      scenario: { modelCalls: 0, priorDamage, withImpact, remainingRecipientModels: 1,
        ...(distanceShortfall ? { distanceShortfall } : {}), ...(suppression ? { suppression } : {}) } });
    const originX = leading.xInches;
    const opponent = find(state, 'enemy');
    const contact = Math.round(opponent.models[0].xInches * 1000)
      - Math.round(opponent.models[0].baseWidthInches * 500) - Math.round(leading.baseWidthInches * 500);
    const declaration = { leadingModelId: leading.id,
      targets: [{ unitId: opponent.id, modelId: opponent.models[0].id }] };
    const chargeResolution = distanceShortfall ? { outcome: 'failure', failureProof: { kind: 'distance_shortfall' } }
      : { outcome: 'success', placements: [],
      path: [{ xMilliInches: contact, yMilliInches: Math.round(leading.yInches * 1000),
        elevation: 'ground', supportTerrainIds: [] }] };
    const card = current => current.cardResources.player1.find(row => row.cardKind === 'faction');
    const openedFile = 'opened.json';
    let opened = await loadSaved(openedFile);
    if (!opened) {
      const native = open();
      try {
        const credentials = await native.create(roomId, authority);
        const seat = { roomId, seatToken: credentials.player1.seatToken };
        const before = await native.store.loadRoom(roomId);
        if (before.stateRevision === 0) {
          const legal = await native.room.legalSpace(seat);
          assert.equal(legal.ok, true, JSON.stringify(legal));
          assert(!legal.legalSpace.parameterDomains.some(row => row.actionType === 'charge' && row.pieceId === recipient.id));
        }
        const committed = await native.commit({ roomId, credential: credentials.player1, operationKey: 'delegate-charge',
          select: row => row.actionType === 'delegate_khassar_charge' && row.pieceId === 'actor'
            && row.constraints.recipientUnitId === recipient.id, parameters: () => declaration });
        const current = await native.store.loadRoom(roomId);
        const envelope = current.envelope;
        if (suppression) {
          assert.equal(envelope.state.pendingOfficialChargeDeclaration?.stage, 'reaction');
          assert.equal(envelope.state.activeSideKey, 'player2');
          assert.equal(envelope.state.pendingAction, undefined);
          assert.equal(committed.preview.core.chanceTicket, null);
          assert.equal(find(envelope.state, 'recipient').activatedPhases.assault, true);
        } else {
          assert.equal(envelope.state.pendingAction.stage, 'resolve_charge_after_roll');
          assert.equal(committed.preview.core.action.chance.kind, 'fixed_roll_sequence');
        }
        assert(envelope.state.pendingOfficialKhassarCharge);
        assert.equal(find(envelope.state, 'recipient').damageMarker, priorDamage);
        assert.equal(find(envelope.state, 'recipient').xInches, originX);
        assert.equal(card(envelope.state).readiness, 'exhausted');
        assert.equal(committed.idempotentReplayVerified, true);
        opened = { head: envelope, chanceCount: committed.preview.core.action.chance?.count ?? null,
          nativeChargeRoll: envelope.state.pendingAction?.chargeRoll ?? null };
        await save(openedFile, opened);
      } finally { native.close(); }
    }

    const next = open();
    let expected;
    let proof;
    try {
      const credentials = await next.create(roomId, authority);
      await next.restoreDependencies(roomId, authority);
      const currentState = async () => (await next.store.loadRoom(roomId)).envelope.state;
      let roll = await loadSaved('declaration-roll.json');
      if (suppression && !roll) {
        const use = suppression === 'use';
        const reacted = await next.commit({ roomId, credential: credentials.player2, operationKey: 'declaration-reaction',
          select: row => use ? row.abilityName === 'Suppression Shells' : row.actionType === 'pass_reaction_family_window',
          parameters: domain => use ? { paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.const } : {} });
        assert.equal(reacted.preview.core.chanceTicket, null);
        const beforeRoll = await currentState();
        assert.equal(beforeRoll.pendingOfficialChargeDeclaration?.stage, 'ready');
        assert.equal(beforeRoll.pendingAction, undefined);
        assert.equal(find(beforeRoll, 'recipient').damageMarker, priorDamage);
        assert.equal(find(beforeRoll, 'recipient').activatedPhases.assault, true);
        assert.deepEqual(beforeRoll.pendingOfficialChargeDeclaration.canonicalParameters, declaration);
        assert.equal(beforeRoll.cardResources.player2.find(row => row.cardKind === 'faction').readiness, use ? 'exhausted' : 'ready');
        const rolled = await next.commit({ roomId, credential: credentials.player1, operationKey: 'roll-declaration',
          kind: 'finite', choice: { actionType: 'roll_declared_charge', pieceId: 'recipient' } });
        assert(rolled.preview.core.chanceTicket);
        const afterRoll = (await next.store.loadRoom(roomId)).envelope;
        assert.equal(afterRoll.state.pendingOfficialChargeDeclaration, undefined);
        assert.equal(find(afterRoll.state, 'recipient').activatedPhases.assault, true);
        const pending = afterRoll.state.pendingAction;
        assert.equal(pending.stage, 'resolve_charge_after_roll');
        assert.equal(pending.chargePlan.speedInches, use ? 4 : 7);
        roll = { head: afterRoll, nativeChargeRoll: pending.chargeRoll, diceCount: pending.chargeRolls.length,
          speedInches: pending.chargePlan.speedInches, maxDistanceMilliInches: pending.maxDistanceMilliInches };
        await save('declaration-roll.json', roll);
      }
      if (!suppression && (await next.store.loadRoom(roomId)).stateRevision === 1) {
        const legal = await next.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        assert.equal(legal.ok, true, JSON.stringify(legal));
        assert(legal.legalSpace.parameterDomains.length > 0);
        assert(legal.legalSpace.parameterDomains.every(row => row.actionType === 'resolve_charge' && row.pieceId === recipient.id));
        assert.equal(legal.legalSpace.finiteActions.length, 0);
      }
      const failedCharge = suppression ? contact - Math.round(originX * 1000) > roll.maxDistanceMilliInches : distanceShortfall;
      await next.commit({ roomId, credential: credentials.player1, operationKey: 'resolve-delegated-charge',
        choice: { actionType: 'resolve_charge', pieceId: recipient.id }, parameters: () => failedCharge
          ? { outcome: 'failure', failureProof: { kind: 'distance_shortfall' } } : chargeResolution });
      let pathCheckpoint = await loadSaved('charge-path.json');
      const afterPath = await next.store.loadRoom(roomId);
      if (!pathCheckpoint && afterPath.stateRevision === (suppression ? roll.head.stateRevision + 1 : 2)) {
        pathCheckpoint = { head: afterPath.envelope };
        await save('charge-path.json', pathCheckpoint);
      }
      assert(pathCheckpoint);
      if (withImpact) {
        assert.equal(pathCheckpoint.head.state.pendingAction.stage, 'resolve_mandatory_impact');
        assert.equal(find(pathCheckpoint.head.state, 'recipient').damageMarker, priorDamage);
        await next.commit({ roomId, credential: credentials.player1, operationKey: 'open-impact',
          choice: { actionType: 'resolve_impact', pieceId: recipient.id }, parameters: domain => ({
            allocations: domain.parameterSchema.eligibleModels.map(model => ({
              modelId: model.modelId, targetUnitId: opponent.id, dice: model.impactDice,
            })),
          }) });
        for (let step = 0; step < 14; step++) {
          const current = await next.store.loadRoom(roomId);
          if (!current.envelope.state.pendingOfficialKhassarCharge) break;
          assert.equal(find(current.envelope.state, 'recipient').damageMarker, priorDamage);
          const side = current.envelope.state.activeSideKey;
          const legal = await next.room.legalSpace({ roomId, seatToken: credentials[side].seatToken });
          assert.equal(legal.ok, true, JSON.stringify(legal));
          const domain = legal.legalSpace.parameterDomains[0];
          if (domain) {
            const key = domain.parameterSchema.required[0];
            const spec = domain.parameterSchema[key];
            const value = spec?.items?.enum ? spec.items.enum.slice(0, spec.minItems ?? 0) : spec?.const;
            assert.notEqual(value, undefined, JSON.stringify(domain.parameterSchema));
            await next.commit({ roomId, credential: credentials[side], operationKey: 'finish-impact-r' + current.stateRevision,
              select: row => row.domainId === domain.domainId, parameters: () => ({ [key]: value }) });
          } else {
            assert.equal(legal.legalSpace.finiteActions.length, 1, JSON.stringify(legal.legalSpace));
            const first = legal.legalSpace.finiteActions[0];
            await next.commit({ roomId, credential: credentials[side], operationKey: 'finish-impact-r' + current.stateRevision,
              kind: 'finite', select: row => row.actionKey === first.actionKey });
          }
        }
      }
      const completionFile = 'completed.json';
      let concluded = await loadSaved(completionFile);
      if (!concluded) {
        concluded = { head: (await next.store.loadRoom(roomId)).envelope };
        await save(completionFile, concluded);
      }
      const completed = concluded.head.state;
      assert.equal(completed.pendingOfficialKhassarCharge, undefined);
      assert.equal(completed.pendingAction, undefined);
      assert.equal(completed.pendingOfficialMeleePoolChoice, undefined);
      assert.equal(completed.selectedRosterActivationWindow.pieceId, 'actor');
      assert.equal(completed.selectedRosterActivationWindow.stage, 'after_action');
      assert.equal(find(completed, 'recipient').models[0].xInches, failedCharge ? originX : contact / 1000);
      assert.equal(find(completed, 'recipient').damageMarker, priorDamage + 3);
      assert.equal(find(completed, 'recipient').currentModels, 1);
      assert.equal(find(completed, 'recipient').currentSupply, recipient.currentSupply);
      assert.equal(find(completed, 'actor').activatedPhases.assault, true);
      const allEvents = completed.log.flatMap(row => row.events);
      const damageIndices = allEvents.flatMap((event, index) => event.type === 'khassar_non_lethal_damage_after_charge' ? [index] : []);
      assert.equal(damageIndices.length, 1);
      const nativeEvent = withImpact ? 'impact_damage' : failedCharge ? 'charge_failed' : 'charge_succeeded';
      const nativeCompleteIndex = allEvents.findLastIndex(event => event.type === nativeEvent);
      if (failedCharge) assert.equal(allEvents[nativeCompleteIndex]?.failureProof.kind, 'distance_shortfall');
      assert(nativeCompleteIndex >= 0 && nativeCompleteIndex < damageIndices[0], JSON.stringify(allEvents.map(e => e.type)));
      await next.commit({ roomId, credential: credentials.player1, operationKey: 'finish-original-activation',
        choice: { actionType: 'finish_activation', pieceId: 'actor' }, parameters: () => ({}) });
      expected = (await next.store.loadRoom(roomId)).envelope;
      assert.equal(expected.state.activeSideKey, 'player2');
      if (suppression) {
        const reactionClose = allEvents.findIndex(event => event.type === 'charge_declaration_reactions_completed');
        const chargeRoll = allEvents.findIndex(event => event.type === 'charge_declared_and_rolled');
        assert(reactionClose >= 0 && reactionClose < chargeRoll && chargeRoll < damageIndices[0]);
      }
      proof = { withImpact, ...(distanceShortfall ? { distanceShortfall } : {}),
        nativeChargeRoll: roll?.nativeChargeRoll ?? opened.nativeChargeRoll, authorityDiceCount: roll?.diceCount ?? opened.chanceCount,
        ...(roll ? { suppression, speedInches: roll.speedInches, maxDistanceMilliInches: roll.maxDistanceMilliInches,
          contactDistanceMilliInches: contact - Math.round(originX * 1000), failedCharge, noDiceBeforeReaction: true } : {}),
        noDamageOnDeclaration: true, boundContinuationOnColdResume: true, noDamageAtMandatoryImpactBoundary: withImpact || undefined,
        damageAppliedExactlyOnce: true, before: priorDamage, after: priorDamage + 3, originalActivationClosed: true };
    } finally { next.close(); }
    const cold = open();
    try {
      await cold.restoreDependencies(roomId, authority);
      const replay = await cold.store.loadReplayBundle(roomId);
      const journal = replay.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
      const result = cold.engine.replay({ initialEnvelope: replay.initialEnvelope, journal });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.deepEqual(result.envelope, expected);
      const summary = { status: 'passed_charge_component', runtimeVersion: runtime.descriptor.runtimeVersion,
        ...proof, signedReceipts: journal.length, exactColdReplay: true, modelCalls: 0 };
      await save('result.json', summary);
      return summary;
    } finally { cold.close(); }
  } finally { store.close(); }
}
