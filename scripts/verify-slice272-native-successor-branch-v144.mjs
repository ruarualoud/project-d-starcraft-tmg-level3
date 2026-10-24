// Concrete missing capability: an instantiated Native action cannot become
// a queryable pregame successor. Use A's retained scene and accepted parameters;
// do not rerun its successful solver or reinitialize a persisted Room.
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
let applied = 0;
const runtime = { ...core, apply(...args) { applied++; return core.apply(...args); } };
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const makeLab = () => createPregameSceneLaboratoryV1({ laboratoryId: 'ticket27-s271-roster-workspace-lab',
  sourceState: authority.state, sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
  rulesRuntime: runtime, armyBuilderPort: builder, matchBinding: authority.matchBinding });
const lab = makeLab();
const parent = { challengeId: op.queryId, request: op.request, receipt: op.result };
const port = createRosterTeachEvidencePortV1(lab, { retainedScenarios: [parent] });
const branchIdRef = op.result.queryRepair.scenarioContinuation.branchIdRef;
assert.equal(port.describeQueryContext(branchIdRef).baseStateHash, actual.branchStateHash);
const candidate = actual.receipts[0].receipt.sourceReceipt.queryReceipt.result.formationOptions[0];
const request = { kind: 'scenario', toolRequest: { branchIdRef, seatKey: 'player1',
  spec: { kind: 'native_action' },
  argumentsJson: JSON.stringify({ domainId: candidate.domainId, parameters: candidate.canonicalParameters }),
  followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] } };
const scope = { mutationAuthority: false, initialFoundationHash: hash(JSON.parse(d.planSerialized)),
  sourceHashes: [d.teachFramework.state.sourceHash] };
const receipt = await port.query({ ...scope, challengeId: 'v144-native-successor', request });
const report = { status: receipt.status === 'unknown' ? 'FAIL' : 'PASS',
  reason: receipt.unknownReasonCode, providerCalls: 0, roomActions: 0,
  nativeCloneActions: applied, solverExecutions: 0, receipt };
await fs.writeFile(base + '/common-v144-native-successor-branch-observation.private.json', JSON.stringify(report, null, 2));
assert.notEqual(receipt.status, 'unknown', 'Missing queryable native successor: ' + receipt.unknownReasonCode);
assert.equal(applied, 1);
const context = port.describeQueryContext('v144-native-successor');
const actor = context.availableUnits.find(u => u.unitId === candidate.pieceId);
for (const position of actual.receipts[1].receipt.sourceReceipt.queryReceipt.result.action.spatialPlan.finalModelPositions) {
  const model = actor.models.find(m => m.modelId === position.modelId);
  assert.equal(Math.round(model.xInches * 1000), position.xMilliInches);
  assert.equal(Math.round(model.yInches * 1000), position.yMilliInches);
}
assert.equal(receipt.followUpReceipts[0].receipt.queryReceipt.status, 'exact');
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged, true);
assert.equal(port.describeQueryContext(branchIdRef).baseStateHash, actual.branchStateHash);
const restoredLab = makeLab();
const restored = createRosterTeachEvidencePortV1(restoredLab, { retainedScenarios: [parent,
  { challengeId: 'v144-native-successor', request, receipt }] });
assert.equal(restored.describeQueryContext('v144-native-successor').baseStateHash, context.baseStateHash);
assert.deepEqual(restored.describeQueryContext('v144-native-successor').availableUnits, context.availableUnits);
assert.equal(applied, 1, 'Restoration must not replay the Native action');
assert.equal(restoredLab.proveMutationZero().sourceStateHashUnchanged, true);
console.log(JSON.stringify({ status: 'PASS', nativeCloneActions: applied, sourceAndParentUnchanged: true,
  followUpControlExact: true, restoredWithoutActionReplay: true,
  providerCalls: 0, roomActions: 0, solverExecutions: 0,
  assetCaseValidated: false, chanceOutcomeBranchValidated: false }));
