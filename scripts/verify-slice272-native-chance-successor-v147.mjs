// Reproduce missing conditional chance/casualty successor through the actual Teach port.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const base = process.argv[2];
const started = performance.now();
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const arm = cfg.rows.find(r => r.arm === 'A');
const d = JSON.parse(await fs.readFile(arm.dataDirectory + '/drafts/' + arm.sessionId + '.json', 'utf8'));
const actual = JSON.parse(await fs.readFile(base + '/common-v142-native-query-capability.private.json', 'utf8'));
const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
const selected = d.lockedRoster?.lock?.candidateInput || d.selectedCandidateInput || d.working?.candidateInput;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
recipes[selected.sideKey] = { factionRecordKey: selected.factionRecordKey,
  tacticalCardRecordKeys: structuredClone(selected.tacticalCardRecordKeys),
  units: selected.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
    compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const authority = createOfficialStandardRoomInitialStateAuthorityV1({ dataset: source.dataset,
  snapshot: source.snapshot, serverSeatPlan: ['player1','player2'].map(seatKey => ({ label: seatKey,
    seatKey, roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', recipes,
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  missionRecordKey: d.setup.missionBinding.missionRecordKey,
  deploymentRecordKey: d.setup.missionBinding.deploymentRecordKey,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) });
const core = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) });
let applied = 0, lastBefore, lastAfter;
const timings = {};
const runtime = { ...core, apply(...args) { const t = performance.now(); applied++; lastBefore = args[0]; const result = core.apply(...args); lastAfter = result.state; timings['nativeApply' + applied] = performance.now() - t; return result; } };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const makeLab = () => createPregameSceneLaboratoryV1({ laboratoryId: 'ticket27-s271-roster-workspace-lab',
  sourceState: authority.state, sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
  rulesRuntime: runtime, armyBuilderPort: builder, matchBinding: authority.matchBinding });

const report = { schema: 'slice272_native_chance_successor_v147', providerCalls: 0,
  roomActions: 0, trainingTruth: false, receipts: [], timings };
const output = base + '/common-v147-native-chance-successor-' + process.argv[3] + '.private.json';
try {
  timings.fixtureMs = performance.now() - started;
  const lab = makeLab();
  const port = createRosterTeachEvidencePortV1(lab);
  const scope = { mutationAuthority: false, initialFoundationHash: hash(JSON.parse(d.planSerialized)),
    sourceHashes: [d.teachFramework.state.sourceHash] };
  const attacker = authority.state.pieces.find(p => p.id === 'player1-marine-1');
  const defender = authority.state.pieces.find(p => p.sideKey === 'player2' && /raptor/.test(p.id));
  assert(attacker && defender);
  const query = async (name, request) => {
    const t = performance.now();
    const receipt = await port.query({ ...scope, challengeId: name, request });
    timings[name] = performance.now() - t;
    report.receipts.push({ name, request, receipt });
    return receipt;
  };
  report.stage = 'geometry';
  const parentRequest = { kind: 'scenario', toolRequest: { spec: {
    kind: 'hypothetical_geometry', phase: 'assault', activeSideKey: 'player1',
    clearTerrain: true, isolateToPlacedPieces: true,
    placements: [{ pieceId: attacker.id, xInches: 12, yInches: 12 },
      { pieceId: defender.id, xInches: 18, yInches: 12 }] } } };
  const parent = await query('v147-combat-parent', parentRequest);
  assert.notEqual(parent.status, 'unknown', parent.unknownReasonCode);
  const context = port.describeQueryContext('v147-combat-parent');
  const domain = context.actionSpace.parameterDomains.find(row =>
    row.pieceId === attacker.id && /c-14 rifle/i.test(row.weaponName || ''));
  assert(domain, 'same-parent Native ranged domain required');
  const parameters = { targetUnitId: defender.id };
  const probability = await query('v147-attack-read', { kind: 'spatial', toolRequest: {
    branchIdRef: 'v147-combat-parent', seatKey: 'player1', queryKind: 'attack_probability',
    argumentsJson: JSON.stringify({ domainId: domain.domainId, parameters, sampleBudget: 6 }) } });
  assert.notEqual(probability.status, 'unknown', probability.unknownReasonCode);
  const chance = probability.sourceReceipt.queryReceipt.result.chance;
  assert(chance.layout.hit >= 2);
  // A named two-hit conditional roll, not expected damage or the actual match dice.
  const reveals = Array.from({ length: chance.count }, (_, i) => i < 2 ? 6 : 1);
  const request = { kind: 'scenario', toolRequest: {
    branchIdRef: 'v147-combat-parent', seatKey: 'player1', spec: { kind: 'native_action' },
    argumentsJson: JSON.stringify({ domainId: domain.domainId, parameters,
      outcome: { chanceReveals: reveals } }) } };
  report.stage = 'chance_successor';
  const opened = await query('v147-open-loss-choice', request);
  assert.notEqual(opened.status, 'unknown', 'Named Native chance successor missing: ' + opened.unknownReasonCode);
  assert.equal(applied, 1);
  assert.equal(opened.sourceReceipt.conditionalOnOutcome, true);
  assert.equal(opened.sourceReceipt.provenArrivalHistory, false);
  assert.deepEqual(opened.sourceReceipt.nativeOutcomeAssumption.chanceReveals, reveals);
  const pendingContext = port.describeQueryContext('v147-open-loss-choice');
  const removal = pendingContext.actionSpace.parameterDomains.find(row =>
    /casualty_selection/.test(row.parameterKind || ''));
  assert(removal, 'Defender choice must remain a queryable Native action, never host-selected');
  assert.equal(removal.sideKey, 'player2');
  const rawRemoval = runtime.enumerate(lastAfter, { sideKey: 'player2' }).parameterDomains.find(row =>
    row.domainId === removal.domainId);
  const constraints = rawRemoval.sourceDomain?.constraints || rawRemoval.constraints;
  const selection = constraints.legalSelections[0];
  assert(selection && selection.casualtyModelIds.length > 0);
  const resolveRequest = { kind: 'scenario', toolRequest: {
    branchIdRef: 'v147-open-loss-choice', seatKey: 'player2', spec: { kind: 'native_action' },
    argumentsJson: JSON.stringify({ domainId: removal.domainId,
      parameters: { casualtySelectionHash: selection.selectionHash } }),
    followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] } };
  report.stage = 'casualty_selection';
  const settled = await query('v147-settled-loss', resolveRequest);
  assert.notEqual(settled.status, 'unknown', settled.unknownReasonCode);
  assert.equal(applied, 2);
  const after = lastAfter.pieces.find(p => p.id === defender.id);
  const before = lastBefore.pieces.find(p => p.id === defender.id);
  const survivors = port.describeQueryContext('v147-settled-loss').availableUnits
    .find(row => row.unitId === defender.id);
  assert.equal(after.currentModels, before.currentModels - selection.casualtyModelIds.length);
  assert.deepEqual(survivors.models.map(m => m.modelId).sort(),
    after.models.filter(m => !m.isDestroyed).map(m => m.id).sort());
  assert.equal(settled.followUpReceipts[0].receipt.queryReceipt.status, 'exact');
  const restored = createRosterTeachEvidencePortV1(makeLab(), { retainedScenarios:
    report.receipts.filter(row => row.request.kind === 'scenario')
      .map(row => ({ challengeId: row.name, request: row.request, receipt: row.receipt })) });
  assert.equal(restored.describeQueryContext('v147-settled-loss').baseStateHash,
    settled.sourceReceipt.branchStateHash);
  assert.deepEqual(restored.describeQueryContext('v147-settled-loss').availableUnits,
    port.describeQueryContext('v147-settled-loss').availableUnits);
  assert.equal(applied, 2, 'Restoration may not re-roll or replay actions');
  assert.equal(lab.proveMutationZero().sourceStateHashUnchanged, true);
  // Only this new input boundary: no duplicated old movement/asset gate.
  const missing = await query('v147-no-rolls', { ...request, toolRequest: {
    ...request.toolRequest, argumentsJson: JSON.stringify({ domainId: domain.domainId, parameters }) } });
  assert.equal(missing.status, 'unknown');
  assert.equal(missing.unknownReasonCode, 'PREGAME_LAB_NATIVE_ACTION_CHANCE_OUTCOME_REQUIRED');
  assert.equal(applied, 2);
  Object.assign(report, { status: 'PASS', stage: 'finished',
    conditionalDiceNotProbability: true, defenderOwnsCasualties: true,
    originalModelCount: before.currentModels, remainingModelCount: after.currentModels,
    supplyBefore: before.currentSupply, supplyAfter: after.currentSupply,
    casualtyModelIds: selection.casualtyModelIds,
    sourceUnchanged: true, restoreWithoutReplay: true });
} catch(error) {
  Object.assign(report, { status: 'FAIL', failure: { message: error.message, stack: error.stack } });
  process.exitCode = 1;
}
report.nativeCloneActions = applied;
report.elapsedMs = performance.now() - started;
await fs.writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ ...report, receipts: report.receipts.map(row => ({
  name: row.name, status: row.receipt.status, reason: row.receipt.unknownReasonCode })) }));
