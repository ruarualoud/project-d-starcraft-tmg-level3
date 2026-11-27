import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialCurrentProductMatchRuntimeV7 } from '../packages/product-composition/official-current-product-match-runtime-v7.mjs';
import { createOfficialRelocationFamilyAdapterV1 } from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import { createOfficialBattlefieldAssetFamilyAdapterV1 } from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 as faqReactionPolicy } from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { OFFICIAL_NON_LETHAL_DAMAGE_POLICY_V1 as nonLethalDamagePolicy } from '../packages/rule-atoms/official-non-lethal-damage-policy-v1.mjs';
import { OFFICIAL_STRUCTURE_TARGETING_POLICY_V13 as structureTargetingPolicy } from '../packages/rule-atoms/official-structure-targeting-policy-v13.mjs';
import { OFFICIAL_ABILITY_REFERENCE_POLICY_V13 as abilityReferencePolicy,
  officialAbilityReferenceConstraintsV13, projectOfficialAbilityReferenceStateV13 } from '../packages/rule-atoms/official-ability-reference-policy-v13.mjs';
import { evaluateOfficialBaseMeasurementV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { evaluateOfficialTerrainLineOfSightToMissionMarkerV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { prepareOfficialCurrentProductFirstRoundV1 } from '../packages/product-composition/official-first-round-setup-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-faq-runtime-20261112-v1/ability-references');
await fs.mkdir(directory, { recursive: true });
const sourceDirectory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const [dataset, snapshot] = await Promise.all(['legacy-dataset.json', 'legacy-snapshot.json']
  .map(name => fs.readFile(path.join(sourceDirectory, name), 'utf8').then(JSON.parse)));
const save = async (name, value) => {
  const file = path.join(directory, name);
  await atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
  return file;
};
const authorityFile = path.join(directory, 'authority.json');
let authority;
try { authority = JSON.parse(await fs.readFile(authorityFile, 'utf8')); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  const recipes = Object.fromEntries(['player1', 'player2'].map(sideKey => {
    const recipe = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2);
    for (const unit of recipe.units) unit.unitInstanceId = unit.unitInstanceId.replace('player2', sideKey);
    return [sideKey, recipe];
  }));
  const original = createOfficialStandardRoomInitialStateAuthorityV1({ dataset, snapshot, recipes });
  const { receiptHash: ignored, ...body } = original;
  const state = prepareOfficialCurrentProductFirstRoundV1(original.state);
  // Explicit engineering conditions derived from the actual legal armies.
  for (const [id, x, y] of [['player1-queen', 45, 32], ['player2-queen', 50, 2]]) {
    const piece = state.pieces.find(item => item.id === id);
    Object.assign(piece, { isOnField: true, isInReserves: false, xInches: x, yInches: y });
    for (const model of piece.models) Object.assign(model, { isOnField: true, xInches: x, yInches: y });
  }
  const prepared = { ...body, state, setupId: 't28-ability-reference-conditional' };
  authority = { ...prepared, receiptHash: hashStarcraftTmgContract(prepared) };
  await save('authority.json', authority);
}
const baseRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(authority.state) }) });
async function setup(product, roomId, initialAuthority = authority) {
  const credentials = await product.create(roomId, initialAuthority);
  await product.commit({ roomId, credential: credentials.player1, kind: 'finite', operationKey: 'round-start',
    select: item => item.action.actionType === 'resolve_mission_start_of_round' });
  await product.commit({ roomId, credential: credentials.player1, kind: 'finite', operationKey: 'first-actor',
    select: item => item.action.actionType === 'choose_first_actor' && item.action.chosenFirstActorSideKey === 'player1' });
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'summon-worm',
    select: domain => domain.abilityName === 'Omega Network' && domain.pieceId === 'player1-queen',
    parameters: domain => ({ activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIds.enum[0], xMilliInches: 26000, yMilliInches: 12000 }) });
  await product.commit({ roomId, credential: credentials.player1, operationKey: 'finish-queen',
    select: domain => domain.actionType === 'finish_activation' && domain.pieceId === 'player1-queen', parameters: () => ({}) });
  const aggregate = await product.store.loadRoom(roomId);
  const worm = aggregate.envelope.state.pieces.find(piece => piece.officialUnitRecordKey === 'army_units:omega_worm');
  assert(worm?.isOnField && worm.isStructure);
  assert.equal(aggregate.envelope.state.activeSideKey, 'player2');
  return { credentials, aggregate, worm };
}
function placement(domain, startX) {
  const ids = domain.parameterSchema.placements.exactModelIds;
  const offsets = [[0, 0], [2000, 0], [1000, 1732]];
  assert.equal(ids.length, offsets.length);
  return { leadingModelId: ids[0], entrySegmentId: domain.parameterSchema.entrySegmentId.enum[0],
    placements: ids.map((modelId, index) => ({ modelId, xMilliInches: startX + offsets[index][0],
      yMilliInches: 12000 + offsets[index][1], rotationDegrees: 0, elevation: 'ground', supportTerrainIds: [] })) };
}
async function inspect(product, roomId, credentials) {
  const legal = await product.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
  assert.equal(legal.ok, true, JSON.stringify(legal));
  const domain = legal.legalSpace.parameterDomains.find(item => item.abilityName === 'Burrow Ambush' && item.pieceId === 'player2-corpser');
  assert(domain);
  return { legal, domain };
}
if (process.argv.includes('--baseline')) {
  const product = openWave3EngineeringRoomV1({ directory, filename: 'baseline.sqlite', rulesRuntime: baseRuntime });
  try {
    const roomId = 'ability-reference-legacy';
    const { credentials, aggregate, worm } = await setup(product, roomId);
    const { domain } = await inspect(product, roomId, credentials);
    const preview = await product.room.previewAction({ roomId, seatToken: credentials.player2.seatToken,
      proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: placement(domain, 31000) } });
    assert.equal(preview.ok, true, JSON.stringify(preview));
    await product.commit({ roomId, credential: credentials.player2, operationKey: 'legacy-near-worm',
      select: item => item.abilityName === 'Burrow Ambush' && item.pieceId === 'player2-corpser',
      parameters: item => placement(item, 31000) });
    const after = await product.store.loadRoom(roomId);
    const evidenceRef = await save('red.json', { sourceEntries: ['faq-v1.3:66', 'faq-v1.3:67'],
      status: 'reproduced', wormId: worm.id, wormPosition: { x: worm.xInches, y: worm.yInches },
      invalidNearEnemyStructureAccepted: true, expectedMinimumBaseGapInchesExclusive: 10,
      actorStartXInches: 31, legacyStateHash: after.envelope.stateHash,
      legacyRevision: after.stateRevision, summonRevision: aggregate.stateRevision, providerCalls: 0 });
    console.log(JSON.stringify({ status: 'red_reproduced', evidenceRef, invalidNearEnemyStructureAccepted: true }));
  } finally { product.close(); }
} else {
  const candidateAuthorityFile = path.join(directory, 'candidate-authority.json');
  let candidateAuthority;
  try { candidateAuthority = JSON.parse(await fs.readFile(candidateAuthorityFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const { receiptHash: ignored, ...body } = authority;
    const state = structuredClone(authority.state);
    const hydralisk = state.pieces.find(piece => piece.id === 'player2-hydralisk');
    Object.assign(hydralisk, { isOnField: true, isInReserves: false, xInches: 50, yInches: 2 });
    for (const [index, model] of hydralisk.models.entries()) Object.assign(model, {
      isOnField: true, xInches: 50, yInches: 2 + index * 2 });
    const prepared = { ...body, state, setupId: 't28-reference-los-conditional' };
    candidateAuthority = { ...prepared, receiptHash: hashStarcraftTmgContract(prepared) };
    await save('candidate-authority.json', candidateAuthority);
  }
  const candidateBase = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
    createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(candidateAuthority.state) }) });
  const runtime = createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: candidateBase,
    faqReactionPolicy, nonLethalDamagePolicy, structureTargetingPolicy, abilityReferencePolicy });
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'candidate.sqlite', rulesRuntime: runtime });
  const roomId = 'ability-reference-faq13';
  async function parametersForCard(domain, coordinate) {
    return { activeUnitId: domain.parameterSchema.activeUnitId.const,
      paymentCardInstanceIds: domain.parameterSchema.paymentCardInstanceIdsByChoice.default[0], coordinate };
  }
  const record = await runProductBoundaryCheck({ directory: path.join(directory, 'verification'),
    identity: { factoryModule: 'packages/room-runtime/in-memory-room-v1.mjs', factoryExport: 'createStarcraftTmgRoomRuntime',
      sourceRef: 'build/ticket-28-wave3-faq-runtime-20261112-v1/ability-references/red.json', contractVersion: 'T28-W3-05-ability-references-v1' },
    steps: [
      { name: 'read', openProduct: () => openWave3EngineeringRoomV1({ directory,
        filename: 'baseline.sqlite', rulesRuntime: baseRuntime }), check: async product => {
        await product.restoreDependencies('ability-reference-legacy', authority);
        const replay = await product.room.replayRoom({ roomId: 'ability-reference-legacy' });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const old = JSON.parse(await fs.readFile(path.join(directory, 'red.json'), 'utf8'));
        const aggregate = await product.store.loadRoom('ability-reference-legacy');
        assert.equal(aggregate.envelope.stateHash, old.legacyStateHash);
        const state = aggregate.envelope.state;
        const actor = state.pieces.find(piece => piece.id === 'player2-corpser');
        const worm = state.pieces.find(piece => piece.id === old.wormId);
        const distance = evaluateOfficialBaseMeasurementV1({ state,
          source: { kind: 'model', unitId: actor.id, modelId: actor.models[0].id },
          target: { kind: 'model', unitId: worm.id, modelId: worm.models[0].id },
          dataBundle: state.officialModelBaseGeometryDataBundle });
        assert(distance.distanceMilliInches < 10000);
        const evidenceRef = await save('legacy.json', { legacyStateAndReceiptsPreserved: true,
          sourceFailureConfirmedByBaseMeasurement: distance, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'baseline.sqlite') };
      } },
      { name: 'compile', openProduct: open, check: async () => {
        const definitions = authority.state.officialAbilityEffectIrCatalogue.definitions.filter(definition => definition.sourceProductKind === 'tactical_card');
        const state = projectOfficialAbilityReferenceStateV13(authority.state, abilityReferencePolicy);
        assert(definitions.length > 0);
        for (const definition of definitions) {
          // All tactical texts in this frozen catalogue have no positive LOS
          // clause. The source exception is preserved by the projection below.
          assert(!/Line of Sight/iu.test(definition.sourceText)
            || /Line of Sight is not required/iu.test(definition.sourceText));
          const facts = officialAbilityReferenceConstraintsV13(state, definition).abilityReferences;
          assert.equal(facts.tacticalCard, true);
          assert.equal(facts.resolutionLineOfSightRequired, false);
        }
        assert.equal(officialAbilityReferenceConstraintsV13(state, { ...definitions[0], lineOfSightRequired: true })
          .abilityReferences.resolutionLineOfSightRequired, true);
        assert.throws(() => createOfficialCurrentProductMatchRuntimeV7({ legacyRuntime: candidateBase, faqReactionPolicy,
          abilityReferencePolicy: { ...abilityReferencePolicy, proximityIsTargeting: true } }), /REQUIRED/);
        assert.equal(runtime.descriptor.productionRoomEligible, false);
        const evidenceRef = await save('runtime.json', { descriptor: runtime.descriptor,
          tacticalDefinitionCount: definitions.length, tacticalDefinitions: definitions.map(definition => ({
            name: definition.definitionName, recordKey: definition.recordKey, sourceFeatureHash: definition.sourceFeatureHash })),
          explicitLosFlagPreservedInProjection: true });
        return { evidenceRef, checkpointRef: candidateAuthorityFile };
      } },
      { name: 'consume', openProduct: open, check: async product => {
        const { credentials, aggregate, worm } = await setup(product, roomId, candidateAuthority);
        const { domain } = await inspect(product, roomId, credentials);
        assert(domain.constraints.abilityReferences.references.some(reference => reference.role === 'enemy_proximity_restriction'
          && reference.selectsUnitTarget === false && reference.lineOfSightRequired === false));
        const result = await product.room.previewAction({ roomId, seatToken: credentials.player2.seatToken,
          proposal: { kind: 'parameterized', domainId: domain.domainId, parameters: placement(domain, 31000) } });
        assert.equal(result.ok, false);
        assert.match(result.message, /RELOCATION_ENEMY_GAP_REQUIRED/);
        const adapter = createOfficialRelocationFamilyAdapterV1(aggregate.envelope.state.officialRelocationFamilySourceBundle);
        assert.throws(() => adapter.query(aggregate.envelope.state, { queryKind: 'instantiate_parameterized_action',
          sideKey: 'player2', domainId: domain.sourceDomain.domainId, parameters: placement(domain, 31000) }), /RELOCATION_ENEMY_GAP_REQUIRED/);
        const after = await product.store.loadRoom(roomId);
        assert.equal(after.stateRevision, aggregate.stateRevision);
        assert.equal(after.envelope.stateHash, aggregate.envelope.stateHash);
        const evidenceRef = await save('consume.json', { wormId: worm.id, nearEnemyStructureRejected: result,
          queryAndPreviewAgree: true, revisionAndStateUnchanged: true,
          referenceFacts: domain.constraints.abilityReferences });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'successor', repairRef: 'fixture-native-private-journal-envelope-v2', openProduct: open, check: async product => {
        const credentials = await product.create(roomId, candidateAuthority);
        // setup used the candidate's factory-derived authority through create.
        await product.commit({ roomId, credential: credentials.player2, operationKey: 'legal-burrow',
          select: item => item.abilityName === 'Burrow Ambush' && item.pieceId === 'player2-corpser',
          parameters: item => placement(item, 41000) });
        let aggregate = await product.store.loadRoom(roomId);
        assert.equal(aggregate.envelope.state.pieces.find(piece => piece.id === 'player2-corpser').isOnField, true);
        const priorPass = await product.commit({ roomId, credential: credentials.player1, operationKey: 'pass-to-card', kind: 'finite',
          select: item => item.action.actionType === 'pass' });
        aggregate = await product.store.loadRoom(roomId);
        // Room responses expose a public summary. Recover the complete state
        // with Engine's verified journal replay, without submitting any action.
        const preCardFile = path.join(directory, 'pre-card-' + priorPass.result.envelope.stateHash + '.json');
        let preCardEnvelope;
        try { preCardEnvelope = JSON.parse(await fs.readFile(preCardFile, 'utf8')); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          const bundle = await product.store.loadReplayBundle(roomId);
          const journal = bundle.privateJournal.filter(entry => entry.payload.type === 'accepted_transition')
            .map(entry => entry.payload.payload.receipt)
            .filter(receipt => receipt.postStateRevision <= priorPass.result.receipt.postStateRevision);
          const replay = product.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
          assert.equal(replay.ok, true, JSON.stringify(replay));
          preCardEnvelope = replay.envelope;
          await atomicWrite(preCardFile, JSON.stringify(preCardEnvelope));
        }
        assert.equal(preCardEnvelope.stateHash, priorPass.result.envelope.stateHash);
        const state = preCardEnvelope.state;
        const hydralisk = state.pieces.find(piece => piece.id === 'player2-hydralisk');
        assert.equal(hydralisk.isOnField, true);
        const marker = state.board.missionMarkers.find(item => item.number === 3);
        const grassIds = state.board.terrain.filter(item => item.terrainKind === 'grass').map(item => item.id);
        const visibility = hydralisk.models.map(model => evaluateOfficialTerrainLineOfSightToMissionMarkerV1({ state,
          attacker: hydralisk, attackerModelId: model.id, attackerEffectiveSize: hydralisk.sizeCharacteristic,
          marker, dataBundle: state.officialTerrainLosDataBundle, excludedTerrainIds: grassIds }));
        assert(visibility.every(result => !result.visible && result.blockingTerrainIds.includes('std-ordinary-east')));
        const identity = hashStarcraftTmgContract({ roomId, grantId: credentials.player2.grantId,
          idempotencyKey: 'card-behind-wall' });
        const savedCard = aggregate.idempotency[identity];
        const legal = savedCard ? null : await product.room.legalSpace({ roomId, seatToken: credentials.player2.seatToken });
        const domain = savedCard ? JSON.parse(await fs.readFile(path.join(directory, 'operation-' + identity + '.json'), 'utf8')).domain
          : legal.legalSpace.parameterDomains.find(item => item.abilityName === 'Ventral Sacs' && item.pieceId === hydralisk.id);
        assert(domain);
        assert.equal(domain.constraints.abilityReferences.resolutionLineOfSightRequired, false);
        assert.equal(domain.constraints.geometry.lineOfSightRequired, false);
        const coordinate = { xMilliInches: marker.xInches * 1000, yMilliInches: marker.yInches * 1000 };
        const adapter = createOfficialBattlefieldAssetFamilyAdapterV1(state.officialBattlefieldAssetFamilySourceBundle);
        const parameters = await parametersForCard(domain, coordinate);
        const query = adapter.query(state, { queryKind: 'instantiate_parameterized_action', sideKey: 'player2',
          domainId: domain.sourceDomain.domainId, parameters });
        assert.throws(() => adapter.query(state, { queryKind: 'instantiate_parameterized_action', sideKey: 'player2',
          domainId: domain.sourceDomain.domainId, parameters: { ...parameters,
            coordinate: { xMilliInches: 26000, yMilliInches: 12000 } } }), /BATTLEFIELD_ASSET_BEACON_ENEMY_GAP_REQUIRED/);
        const afterQueries = await product.store.loadRoom(roomId);
        assert.equal(afterQueries.stateRevision, aggregate.stateRevision);
        assert.equal(afterQueries.envelope.stateHash, aggregate.envelope.stateHash);
        const committed = await product.commit({ roomId, credential: credentials.player2, operationKey: 'card-behind-wall',
          select: item => item.domainId === domain.domainId, parameters: () => parameters });
        const afterCard = await product.store.loadRoom(roomId);
        const originalPreview = committed.preview || Object.values(afterCard.previews).find(entry =>
          hashStarcraftTmgContract(entry.preview.core.action.sourceAction) === hashStarcraftTmgContract(query.result.action))?.preview;
        assert(originalPreview);
        assert.deepEqual(originalPreview.core.action.sourceAction, query.result.action);
        await save('card-commit-proof.json', { expectedPreStateHash: originalPreview.core.preStateHash,
          nativeAction: originalPreview.core.action, queryAction: query.result.action,
          coordinate, visibility, cardCommitRestoredFromNativeRecord: Boolean(savedCard) });
        await product.commit({ roomId, credential: credentials.player2, operationKey: 'pass-after-card', kind: 'finite',
          select: item => item.action.actionType === 'pass' });
        const final = await product.store.loadRoom(roomId);
        const beacon = final.envelope.state.officialBattlefieldAssetBindings.find(binding => binding.effectKind === 'reserve_deploy_indicator');
        assert(beacon);
        assert.equal(final.envelope.state.cardResources.player2.find(card => card.officialCardRecordKey === 'tactical_cards:overlord').readiness, 'exhausted');
        assert(!final.envelope.state.selectedRosterActivationWindow);
        assert.equal(final.envelope.state.phase, 'assault');
        const evidenceRef = await save('successor.json', { revision: final.stateRevision, stateHash: final.envelope.stateHash,
          validBurrowApplied: true, beacon, coordinate, ordinaryWallVisibilityWitness: visibility,
          visibilityWitnessExcludedOnlyGrass: grassIds, actualCardAppliedWithoutLos: true,
          cardQueryMatchesNativeAction: true, enemyProximityStillEnforced: true, successorPhase: final.envelope.state.phase, providerCalls: 0 });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
      { name: 'coldRecovery', openProduct: open, check: async product => {
        await product.restoreDependencies(roomId, candidateAuthority);
        const aggregate = await product.store.loadRoom(roomId);
        const saved = JSON.parse(await fs.readFile(path.join(directory, 'successor.json'), 'utf8'));
        assert.equal(aggregate.envelope.stateHash, saved.stateHash);
        assert.deepEqual(aggregate.envelope.state.officialAbilityReferencePolicy, abilityReferencePolicy);
        const replay = await product.room.replayRoom({ roomId });
        assert.equal(replay.matchesCurrent, true, JSON.stringify(replay));
        const evidenceRef = await save('cold.json', { stateAndPolicyPreserved: true, allNativeReceiptsReplay: true,
          providerCalls: 0, productionPublished: false });
        return { evidenceRef, checkpointRef: path.join(directory, 'candidate.sqlite') };
      } },
    ],
  });
  console.log(JSON.stringify({ status: record.status, passed: Object.keys(record.passed), providerCalls: 0 }));
}
