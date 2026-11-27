import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4StukovArmy, STUKOV_DIRECTORY } from './compile-wave4-stukov-army.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { buildOfficialRoomArmyAuditV1, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialReleaseRosterStateV2 } from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2, createOfficialReleaseResolverV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { freezeArmyBuilderReleaseValueV2 as freeze } from '../packages/source-data/official-army-builder-release-bundle-v2.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../packages/rule-atoms/official-unit-restrictions-v1.mjs';
import { readOfficialFactionUnitConversionV1 } from '../packages/rule-atoms/official-faction-unit-conversion-v1.mjs';
import { quoteOfficialUnitAbilityModifiersV1 } from '../packages/product-composition/official-unit-ability-payment-modifiers-v1.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 } from '../packages/rule-atoms/official-movement-clearance-contract-v13.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await compileWave4StukovArmy(root);
const { context, dataset, scope, inventory, artifacts } = inputs;
const sourceBytesBefore = hash(dataset);
const parent = path.join(root, 'build/wave4-web/stukov-army');
await fs.mkdir(parent, { recursive: true });
const directory = await fs.mkdtemp(path.join(parent, 'run-'));
const runRef = path.relative(root, directory);
const save = (ref, value) => atomicWrite(path.join(root, ref), JSON.stringify(value, null, 2) + '\n');
for (const [name, value] of Object.entries({ ...artifacts, 'release-manifest': context.manifest })) {
  await save(STUKOV_DIRECTORY + '/' + name + '.json', value);
}
const factionKey = 'tactical_cards:stukov_s_forces';
const policy = artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.foreignArmyPolicy;
assert.equal(artifacts.armyBuilder.catalogueSelection.sourceRecordCount, 119);
assert.equal(scope.sourceRecordKeys.length, 101);
const held = inventory.definitions.filter(row => row.sourceHolds.length);
assert.equal(held.length, 39);
assert.ok(held.every(row => !scope.sourceRecordKeys.includes(row.recordKey)));
assert.deepEqual(policy.importedUnits.map(row => row.recordKey), ['army_units:goliath', 'army_units:siege_tank']);
const portFor = current => createOfficialArmyBuilderQueryPortV1({ releaseContext: current,
  unitCompositionUpgradeDataBundle: current.resources.armyBuilder });
const port = portFor(context);
const menu = port.enumerateArmyBuildingChoices({ factionRecordKey: factionKey, scaleId: 'Standard', mineralBudget: 2000 });
for (const recordKey of ['army_units:goliath', 'army_units:siege_tank']) {
  const row = menu.unitCandidates.find(row => row.recordKey === recordKey);
  assert.equal(row.factionTag, 'Terran');
  assert.equal(row.factionUnitConversion.policyHash, policy.policyHash);
  assert.deepEqual(row.factionUnitConversion.specialAbilityResourceType, { from: 'CP', to: 'BM' });
}
for (const key of ['marine', 'raven', 'auto_turret', 'sabotage_drone', 'sentry']) {
  assert.ok(!menu.unitCandidates.some(row => row.recordKey === 'army_units:' + key));
}
const unit = (id, key, names = []) => ({ unitInstanceId: id, recordKey: 'army_units:' + key, compositionKind: 'small',
  upgrades: names.map(upgradeName => ({ upgradeName })) });
const candidate = (sideKey, unitChoice, { faction = factionKey, cards = ['tactical_cards:healing_pathogen'] } = {}) => ({
  sideKey, scaleId: 'Standard', mineralBudget: 2000, factionRecordKey: faction,
  tacticalCardRecordKeys: cards, units: [unitChoice] });
const audit = (current, c) => buildOfficialRoomArmyAuditV1(current.resources.armyBuilder, c.sideKey,
  { ...c, nativeCandidateInput: c }, { dataset: current.dataset, releaseContext: current,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
const legal = [];
for (const recordKey of policy.virusGroup.recordKeys) {
  const c = candidate('player1', unit('import', 'goliath'), { cards: [recordKey] });
  const verdict = port.evaluateRosterCandidate(c);
  assert.equal(verdict.status, 'legal');
  assert.equal(verdict.summary.vespeneSpent, dataset.recordsByKey[recordKey].payload.cost);
  assert.equal(verdict.summary.mineralSpent, 180);
  assert.deepEqual(audit(context, c), verdict.audit);
  legal.push({ candidate: c, audit: verdict.audit, receiptHash: verdict.receiptHash,
    vespeneSpent: verdict.summary.vespeneSpent });
}
for (const id of ['stukov', 'infested_marine', 'infested_trooper']) {
  const c = candidate('player1', unit('new-' + id, id));
  const verdict = port.evaluateRosterCandidate(c);
  assert.equal(verdict.status, 'legal');
  assert.equal(verdict.summary.mineralSpent, dataset.recordsByKey['army_units:' + id].payload.small.cost);
  assert.deepEqual(audit(context, c), verdict.audit);
  legal.push({ candidate: c, audit: verdict.audit, receiptHash: verdict.receiptHash,
    newUnitScope: 'army_building_only_geometry_and_gameplay_not_admitted' });
}
const negatives = [];
for (const c of [
  candidate('player1', unit('wrong', 'marine')),
  candidate('player1', unit('wrong', 'raven')),
  candidate('player1', unit('wrong', 'sentry')),
  candidate('player1', unit('wrong', 'goliath'), { faction: 'tactical_cards:zerg_swarm', cards: ['tactical_cards:accelerating_creep'] }),
  candidate('player1', unit('missing-virus', 'goliath'), { cards: [] }),
  candidate('player1', unit('two-virus', 'goliath'), { cards: policy.virusGroup.recordKeys.slice(0, 2) }),
  { ...candidate('player1', unit('a', 'goliath')), units: [unit('a', 'goliath'), unit('b', 'goliath')] },
  { ...candidate('player1', unit('a', 'stukov')), units: [unit('a', 'stukov'), unit('b', 'stukov')] },
]) {
  const verdict = port.evaluateRosterCandidate(c);
  assert.notEqual(verdict.status, 'legal');
  assert.throws(() => audit(context, c));
  negatives.push({ candidate: c, status: verdict.status, rulesErrorCode: verdict.rulesErrorCode });
}
const sourceDefinitionIds = ['unit:goliath/target-lock-movement-phase@1',
  'unit:siege_tank/mode-transformation-movement-phase@1',
  'card:hatchery/lie-in-wait-any@1'];
function createScene(kind) {
  const imported = kind !== 'terran-control' && kind !== 'zerg-burrow-control';
  const tank = kind === 'imported-tank';
  const ownFaction = kind === 'terran-control' ? 'tactical_cards:terran_armed_forces' : factionKey;
  const own = candidate('player1', unit('actor', tank ? 'siege_tank' : kind === 'zerg-burrow-control' ? 'hydralisk' : 'goliath',
    tank ? ['Mode Transformation'] : []), { faction: ownFaction,
    cards: ownFaction === factionKey ? ['tactical_cards:healing_pathogen', 'tactical_cards:hatchery'] : ['tactical_cards:armory'] });
  const opponent = candidate('player2', unit('target', 'goliath'), {
    faction: 'tactical_cards:terran_armed_forces', cards: ['tactical_cards:armory'] });
  const built = createOfficialReleaseRosterStateV2({ context, candidatesBySide: { player1: own, player2: opponent },
    canonicalResourceTypes: true, sourceDefinitionIds, characteristicDefinitionIds: sourceDefinitionIds, includeAbilitySourcePhases: true });
  const state = { ...built.state, round: 1, phase: 'movement', activeSideKey: 'player1', firstPlayerSideKey: 'player1',
    engagementScale: 'Standard', armyBuildingEngagementScale: 'Standard',
    phaseFirstActorByRound: { '1:movement': { round: 1, phase: 'movement', chosenFirstActorSideKey: 'player1' } },
    board: structuredClone(inputs.seed.state.board), log: [] };
  state.officialModelGapTransitPolicy = structuredClone(OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13);
  state.board.terrain = state.board.terrain.slice(0, 1);
  state.board.accessPoints = [];
  for (const piece of state.pieces) {
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
    piece.models.forEach((model, i) => Object.assign(model, { isOnField: true,
      xInches: (piece.sideKey === 'player1' ? 10 : 17) + (i % 4) * (model.baseWidthInches + 0.05),
      yInches: 10 + Math.floor(i / 4) * (model.baseDepthInches + 0.05), elevation: 'ground_level' }));
  }
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'stukov-' + kind });
  const actor = state.pieces.find(piece => piece.id === 'actor');
  assert.equal(Boolean(readOfficialFactionUnitConversionV1(actor)), imported);
  assert.equal(actor.combatTags.includes('infested'), imported);
  assert.equal(projectOfficialUnitRestrictionsV1(state, actor.id).cannotGainBurrowed, imported);
  if (imported) {
    const zeroQuote = quoteOfficialUnitAbilityModifiersV1(state, actor.id, 'unit_feature', {
      resourceType: 'CP', printedResourceCost: 0, effectiveResourceCost: 0, resourceCostReduction: 0 });
    assert.equal(zeroQuote.resourceType, 'BM');
    assert.equal(zeroQuote.effectiveResourceCost, 0);
    const cardQuote = quoteOfficialUnitAbilityModifiersV1(state, actor.id, 'card_feature', {
      resourceType: 'CP', printedResourceCost: 1, effectiveResourceCost: 1, resourceCostReduction: 0 });
    assert.equal(cardQuote.resourceType, 'CP');
  }
  return state;
}
const nativeResults = [];
for (const kind of ['imported-goliath', 'imported-tank', 'terran-control', 'zerg-burrow-control']) {
  const state = createScene(kind);
  const runtimeFor = () => createOfficialCharacteristicStatusComponentRuntimeV2({ context,
    spatialState: state, definitionIds: sourceDefinitionIds, sourceDefinitionIds });
  const runtime = runtimeFor();
  const declaredNewAtoms = policy.atomIds.filter(id => runtime.descriptor.executableRuleAtomIds.includes(id));
  assert.equal(declaredNewAtoms.length, kind.startsWith('imported') ? 2 : 0);
  const bindingManifest = createOfficialReleaseManifestV2({ releaseId: context.manifest.releaseId,
    dataset, snapshot: inputs.snapshot, sourceRevision: await inputs.read(context.manifest.source.sourceRevisionRef),
    ...{ datasetRef: context.manifest.source.datasetRef, snapshotRef: context.manifest.source.snapshotRef,
      sourceRevisionRef: context.manifest.source.sourceRevisionRef, sourcePolicy: context.manifest.source.policy,
      referenceSources: context.manifest.source.references },
    components: { ...context.manifest.components, rulesRuntime: { ref: 'component-runtime/' + runtime.descriptor.runtimeHash,
      version: runtime.descriptor.runtimeVersion, integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
  const boundContext = { ...context, manifest: bindingManifest };
  const authority = createWave3ComponentEngineeringAuthorityV1({ context: boundContext, state,
    scenario: { kind: 'stukov_source_roster_ability_component', positions: 'declared conditional positions',
      sourceFactory: 'createOfficialReleaseRosterStateV2', fullMatchAdmission: false } });
  const caseDir = path.join(directory, kind);
  await fs.mkdir(caseDir, { recursive: true });
  await atomicWrite(path.join(caseDir, 'authority.json'), JSON.stringify(authority));
  const open = () => openWave3EngineeringRoomV1({ directory: caseDir, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context: boundContext, runtime: runtimeFor() }) });
  const roomId = 'wave4-stukov-' + kind;
  let native = open();
  let expected;
  try {
    const credentials = await native.create(roomId, authority);
    const ids = [kind === 'imported-tank' ? sourceDefinitionIds[1]
      : kind === 'zerg-burrow-control' ? sourceDefinitionIds[2] : sourceDefinitionIds[0]];
    const paymentProofs = [];
    for (const definitionId of ids) {
      const before = await native.store.loadRoom(roomId);
      const menu = runtime.enumerate(before.envelope.state);
      const domain = menu.parameterDomains.find(row => row.definitionId === definitionId && row.pieceId === 'actor');
      assert.ok(domain, kind + ':MISSING_ABILITY:' + definitionId + ':' + JSON.stringify(menu.parameterDomains.map(row => ({ type: row.actionType, id: row.definitionId, piece: row.pieceId }))));
      const cost = domain.constraints.resourceCostsByChoice.default;
      if (kind.startsWith('imported')) assert.equal(cost.resourceType, 'BM');
      if (kind === 'terran-control') assert.equal(cost.resourceType, 'CP');
      const parameters = Object.fromEntries(domain.parameterSchema.required.map(key => {
        const property = domain.parameterSchema.properties?.[key] || domain.parameterSchema[key];
        if (Object.hasOwn(property || {}, 'const')) return [key, property.const];
        if (property?.enum?.length) return [key, property.enum[0]];
        throw Error('STUKOV_PARAMETER_CHOICE_REQUIRED:' + key);
      }));
      if (kind.startsWith('imported')) {
        assert.equal(cost.effectiveResourceCost, 1);
        const signedMenu = await native.room.legalSpace({ roomId, seatToken: credentials.player1.seatToken });
        assert.equal(signedMenu.ok, true);
        const rejected = await native.room.previewAction({ roomId, seatToken: credentials.player1.seatToken,
          proposal: { kind: 'parameterized', domainId: domain.domainId,
            parameters: { ...parameters, paymentCardInstanceIds: ['player2-faction'] } },
          expectedStateRevision: before.stateRevision, expectedStateHash: before.envelope.stateHash,
          expectedMatchBindingHash: before.envelope.matchBindingHash,
          expectedLegalSpaceHash: signedMenu.legalSpace.legalSpaceHash });
        assert.equal(rejected.ok, false, 'OPPONENT_CARD_PAYMENT_MUST_BE_REJECTED');
        assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash, before.envelope.stateHash);
      }
      const committed = await native.commit({ roomId, credential: credentials.player1, operationKey: definitionId,
        select: row => row.domainId === domain.domainId, parameters: () => parameters });
      assert.equal(committed.idempotentReplayVerified, true);
      const after = await native.store.loadRoom(roomId);
      const events = after.envelope.state.log.flatMap(row => row.events || []);
      assert.deepEqual(after.envelope.state.cardResources.player2, before.envelope.state.cardResources.player2);
      if (cost.effectiveResourceCost > 0) assert.ok(parameters.paymentCardInstanceIds.every(id =>
        after.envelope.state.cardResources.player1.find(card => card.cardInstanceId === id)?.readiness === 'exhausted'));
      const paid = events.filter(row => row.type === 'ability_resource_paid').at(-1);
      if (kind !== 'zerg-burrow-control') {
        assert.equal(paid.resourceType, kind.startsWith('imported') ? 'BM' : 'CP');
        assert.equal(paid.resourceCost, cost.effectiveResourceCost);
      }
      if (kind.startsWith('imported')) assert.ok(events.some(row => row.type === 'faction_unit_resource_conversion_applied'));
      paymentProofs.push({ definitionId, resourceType: cost.resourceType, effectiveResourceCost: cost.effectiveResourceCost,
        stateRevision: after.stateRevision, stateHash: after.envelope.stateHash });
    }
    expected = await native.store.loadRoom(roomId);
    const actor = expected.envelope.state.pieces.find(piece => piece.id === 'actor');
    if (kind === 'imported-tank') assert.ok(actor.statuses.some(status => /siege.mode/iu.test(typeof status === 'string' ? status : status.statusName)));
    if (kind === 'zerg-burrow-control') assert.ok(actor.statuses.some(status => /burrowed/iu.test(typeof status === 'string' ? status : status.statusName)));
    if (kind.startsWith('imported')) {
      assert.ok(!runtime.enumerate(state).parameterDomains.some(row => row.definitionId === sourceDefinitionIds[2] && row.pieceId === 'actor'));
      const forged = structuredClone(actor); forged.officialFactionUnitConversion.sideKey = 'player2';
      assert.throws(() => readOfficialFactionUnitConversionV1(forged), /CONVERSION_BINDING_INVALID/);
    }
    nativeResults.push({ kind, paymentProofs, signedActions: expected.stateRevision,
      declaredNewAtoms, runtimeHash: runtime.descriptor.runtimeHash,
      stateHash: expected.envelope.stateHash, idempotencyVerified: true, coldReplay: false });
  } finally { native.close(); }
  native = open();
  try {
    await native.restoreDependencies(roomId, authority);
    const bundle = await native.store.loadReplayBundle(roomId);
    const journal = bundle.privateJournal.filter(row => row.payload.type === 'accepted_transition').map(row => row.payload.payload.receipt);
    const replay = native.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal });
    assert.equal(replay.ok, true);
    assert.deepEqual(replay.envelope, expected.envelope);
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope, expected.envelope);
    nativeResults.at(-1).coldReplay = true;
  } finally { native.close(); }
}
const store = createSqliteOfficialReleaseStoreV1({ filename: ':memory:' });
try {
  const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: async ref => freeze(await inputs.read(ref)) });
  resolver.register(await inputs.read(STUKOV_DIRECTORY + '/release-manifest.json'));
  const fresh = await resolver.resolve({ releaseId: context.manifest.releaseId, purpose: 'unit_characteristics' });
  for (const row of legal) assert.deepEqual(audit(fresh, row.candidate), row.audit);
  await assert.rejects(() => resolver.resolve({ releaseId: context.manifest.releaseId, purpose: 'battle' }), /COMPONENTS_MISSING/);
} finally { store.close(); }
const result = { schema: 'starcraft_tmg_wave4_stukov_army_verification_v1', status: 'passed', runRef,
  sourceManifestHash: scope.sourceManifestHash, datasetHash: dataset.datasetHash, candidateManifestHash: context.manifest.manifestHash,
  definitionIds: scope.definitionIds, newAtomIds: policy.atomIds, implementedNewGameAtoms: 2,
  legal, negatives, nativeResults, coldImportedRosters: legal.length,
  sourceRecordCount: 119, selectedRecords: scope.sourceRecordKeys.length, heldDefinitions: held.length,
  sourceUnitsNotRewritten: true, fullMatchAdmission: false, webAcceptance: false,
  wave3PlayerRoomsTouched: false, modelCalls: 0, trainingTruth: false };
assert.equal(hash(dataset), sourceBytesBefore);
await save(runRef + '/result.json', result);
await save('docs/development/wave4/evidence/stukov-army.public.json', result);
console.log(JSON.stringify({ status: 'passed', runRef, newAtoms: 2, legalRosters: legal.length,
  negativeRosters: negatives.length, signedActions: nativeResults.reduce((sum, row) => sum + row.signedActions, 0), fullMatchAdmission: false }));
