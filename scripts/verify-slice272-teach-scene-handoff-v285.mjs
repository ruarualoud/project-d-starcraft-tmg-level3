// Concrete gap: the selector can read a Teach receipt but cannot query its branch.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { rosterPlanExperimentGroupV274 } from '../content/roster-plan-experiment-matrix-v274.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createIterativeRosterToolPortV1 } from '../packages/roster-strategist/iterative-roster-tool-port-v1.mjs';
import { collectRosterTeachScenarioRecordsV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/D/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const bytes = await fs.readFile(`${directory}/${file}`, 'utf8');
const raw = JSON.parse(bytes), state = raw.value ?? raw;
state.modelContextVersion = 16;
const rows = state.draftTeachSnapshots.filter(row => row.status === 'completed')
  .flatMap(row => collectRosterTeachScenarioRecordsV1(row.state));
const saved = rows.find(row => row.receipt.sourceReceipt.resultStatus === 'ok');
assert(saved, 'Actual D has a successfully saved Teach scenario');
const branch = saved.receipt.sourceReceipt;
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const candidate = state.currentCandidate.input;
const authority = createOfficialStandardRoomInitialStateAuthorityV1({ dataset: source.dataset, snapshot: source.snapshot,
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab',
  recipes: { ...rosterPlanExperimentGroupV274('D').referenceArmyRecipes, [candidate.sideKey]: {
    factionRecordKey: candidate.factionRecordKey, tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
    units: candidate.units.map(unit => ({ unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
      compositionKind: unit.compositionKind, upgradeNames: unit.upgrades.map(upgrade => upgrade.upgradeName) })) } },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')) });
assert.equal(hash(authority.state), branch.sourceStateHash);
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) });
let nativeActions = 0, newScenarios = 0;
const lab = createPregameSceneLaboratoryV1({ laboratoryId: 'ticket27-s271-roster-workspace-lab',
  sourceState: authority.state, armyBuilderPort: builder, matchBinding: authority.matchBinding,
  sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
  rulesRuntime: { ...runtime, apply: (...args) => { nativeActions++; return runtime.apply(...args); } } });
const port = createIterativeRosterToolPortV1({ armyBuilderPort: builder,
  mapEvidencePort: { summarizeMap() { throw Error('NOT_USED'); }, evaluateRosterRoute() { throw Error('NOT_USED'); } },
  createSceneLaboratory: () => ({ ...lab, runScenarioBranch: (...args) => {
    newScenarios++; return lab.runScenarioBranch(...args); } }) });
const receipt = await port.query({ kind: 'scene_query', candidateHash: state.currentCandidate.candidateHash,
  branchStateHash: branch.branchStateHash, queryKind: 'mission_marker_control', argumentsJson: '{}' }, state);
// This real receipt says the branch was constructed, but six formations are
// unresolved. Restoration must expose the actual geometry issue, NOT certify
// control or lose the branch. The outer transport status alone is insufficient.
const placementFailures = branch.hypotheticalPlacementAssessment.units.filter(unit => unit.resultStatus === 'unknown');
assert(placementFailures.length > 0);
assert.equal(receipt.resultStatus, 'unknown');
assert.equal(receipt.unknownReason, placementFailures[0].unknownReason);
assert.equal(receipt.baseStateHash, branch.branchStateHash);
assert.equal(nativeActions, 0, 'No historical actions replayed');
assert.equal(newScenarios, 0, 'No scenario regenerated');
const advertised = port.describeCapabilities(state).retainedTeachScenes;
assert(advertised.some(row => row.branchStateHash === branch.branchStateHash));
assert.deepEqual(advertised.find(row => row.branchStateHash === branch.branchStateHash).unresolvedPlacementUnits,
  placementFailures.map(unit => ({ pieceId: unit.pieceId, reason: unit.unknownReason })));
const oldProjection = structuredClone(state); oldProjection.modelContextVersion = 15;
assert.equal(port.describeCapabilities(oldProjection).retainedTeachScenes, undefined, 'Paid v15 projection unchanged');
const changed = structuredClone(state); changed.currentCandidate.candidateHash = '0'.repeat(64);
assert.equal(port.describeCapabilities(changed).retainedTeachScenes.length, 0, 'Changed army must not advertise old scenes');
assert.equal(hash(authority.state), branch.sourceStateHash);
assert.equal(await fs.readFile(`${directory}/${file}`, 'utf8'), bytes);
console.log(JSON.stringify({ pass: true, case: 'actual_D_teach_branch_to_selector', providerCalls: 0,
  nativeActions, newScenarios, originalSessionUnchanged: true, receiptStatus: receipt.status || receipt.resultStatus }));
