// Real diagnostic for the retained A formation failure. Same production
// factories, frozen army/map and exact hypothetical scene; no Provider or Room.
import fs from 'node:fs/promises';
import path from 'node:path';
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
const base = path.resolve(process.argv[2]);
const destination = base + '/common-v142-native-query-capability.private.json';
const report = { version: 142, pid: process.pid, status: 'running', stage: 'load_actual_source',
  startedAt: new Date().toISOString(), providerCalls: 0, roomActions: 0,
  modelMadeSelection: false, strategicClaimProven: false, receipts: [] };
async function save() {
  report.updatedAt = new Date().toISOString();
  await fs.writeFile(destination + '.tmp', JSON.stringify(report, null, 2), { mode: 0o600 });
  await fs.rename(destination + '.tmp', destination);
}
try {
  await save();
  const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
  const arm = cfg.rows.find(r => r.arm === 'A');
  const d = JSON.parse(await fs.readFile(arm.dataDirectory + '/drafts/' + arm.sessionId + '.json', 'utf8'));
  const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
  const selected = d.lockedRoster?.lock?.candidateInput || d.selectedCandidateInput || d.working?.candidateInput;
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
  const mapConfiguration = JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8'));
  const recipes = structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
  if (selected) recipes[selected.sideKey] = { factionRecordKey: selected.factionRecordKey,
    tacticalCardRecordKeys: structuredClone(selected.tacticalCardRecordKeys),
    units: selected.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
      compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
  // Ephemeral frozen source object, not a persisted Room or a match restart.
  const authority = createOfficialStandardRoomInitialStateAuthorityV1({
    dataset: source.dataset, snapshot: source.snapshot,
    serverSeatPlan: ['player1', 'player2'].map(seatKey => ({ label: seatKey, seatKey,
      roleMode: 'supervisor', principalType: 'human' })),
    roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', recipes,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey: d.setup.missionBinding.missionRecordKey,
    deploymentRecordKey: d.setup.missionBinding.deploymentRecordKey, mapConfiguration });
  const laboratory = createPregameSceneLaboratoryV1({
    laboratoryId: 'ticket27-s271-roster-workspace-lab', sourceState: authority.state,
    sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
    rulesRuntime: createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
      createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) }),
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
      createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) }),
    matchBinding: authority.matchBinding });
  report.sourceStateHash = laboratory.labDescriptor().sourceStateHash;
  assert.equal(report.sourceStateHash, op.result.queryRepair.sourceStateHash, 'Do not substitute another army/map/source');
  const port = createRosterTeachEvidencePortV1(laboratory, { retainedScenarios: [
    { challengeId: op.queryId, request: op.request, receipt: op.result } ] });
  const branchIdRef = op.result.queryRepair.scenarioContinuation.branchIdRef;
  const context = port.describeQueryContext(branchIdRef);
  assert.equal(context.baseStateHash, op.result.queryRepair.baseStateHash, 'Retain exact model positions, not a new packing');
  report.branchStateHash = context.baseStateHash;
  report.staticPlacementAssessment = op.result.sourceReceipt.hypotheticalPlacementAssessment;
  const failedArgs = JSON.parse(op.request.toolRequest.followUps[0].argumentsJson);
  const scope = { mutationAuthority: false, initialFoundationHash: hash(JSON.parse(d.planSerialized)),
    sourceHashes: [d.teachFramework.state.sourceHash] };
  report.stage = 'query_real_formation_solver'; await save();
  const started = performance.now();
  const solver = await port.query({ ...scope, challengeId: 'v142-A-original-domain-formation',
    request: { kind: 'spatial', toolRequest: { branchIdRef, queryKind: 'space.solve_formation',
      argumentsJson: JSON.stringify({ domainId: failedArgs.domainId,
        preferredAnchor: failedArgs.parameters.path.at(-1), maximumOptions: 2 }) } } });
  report.solverElapsedMs = Math.round(performance.now() - started);
  report.receipts.push({ operation: 'solver', receipt: solver });
  await save();
  const options = solver.sourceReceipt?.queryReceipt?.result?.formationOptions;
  assert(solver.status !== 'unknown' && options?.length, 'Native solver did not return an executable candidate');
  // Select first solely to test query/execute consistency, never as a strategy
  // decision or a replacement of the model's intended full arrival route.
  const candidate = options[0];
  report.optionCount = options.length;
  report.selectedDiagnosticOptionId = candidate.formationOptionId;
  report.stage = 'verify_original_query_with_native_candidate'; await save();
  const verified = await port.query({ ...scope, challengeId: 'v142-A-original-placement-query',
    request: { kind: 'spatial', toolRequest: { branchIdRef,
      queryKind: op.request.toolRequest.followUps[0].queryKind,
      argumentsJson: JSON.stringify({ domainId: failedArgs.domainId, parameters: candidate.canonicalParameters }) } } });
  report.receipts.push({ operation: 'original_predicate', receipt: verified });
  report.mutationZero = laboratory.proveMutationZero();
  report.originalQueryAccepted = verified.status !== 'unknown'
    && verified.sourceReceipt?.queryReceipt?.result?.proposalAccepted === true;
  report.status = report.originalQueryAccepted ? 'completed' : 'failed';
  report.stage = 'finished';
  report.geometryScope = 'one supplied native candidate in the retained hypothetical scene; not three-unit arrival history';
  await save();
  console.log(JSON.stringify({ status: report.status, solverElapsedMs: report.solverElapsedMs,
    optionCount: report.optionCount, originalQueryAccepted: report.originalQueryAccepted,
    sourceStateHash: report.sourceStateHash, branchStateHash: report.branchStateHash,
    providerCalls: 0, roomActions: 0, strategicClaimProven: false }));
} catch (error) {
  report.status = 'failed'; report.failure = { code: error.code || error.name,
    message: String(error.message), stack: String(error.stack).slice(0, 3000) };
  await save(); console.error(JSON.stringify(report.failure)); process.exitCode = 1;
}
