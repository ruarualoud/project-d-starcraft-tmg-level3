// Actual F r7 stopped during saved query-repair restoration. No live Provider.
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
import { createIterativeRosterDraftTeachV1 } from '../packages/roster-strategist/iterative-roster-draft-teach-v1.mjs';
const [base, mode = 'retained_source'] = process.argv.slice(2);
const dir = `${base}/roster-plan-matrix-v274/F/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(dir)).find(f => f.endsWith('.json'));
const bytes = await fs.readFile(`${dir}/${file}`, 'utf8');
const raw = JSON.parse(bytes), state = raw.value ?? raw;
const record = state.draftTeachSnapshots.at(-1);
if (mode === 'retained_source') assert.equal(record.failure?.code, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED');
const cfg = JSON.parse(await fs.readFile(`${base}/common-v79-plan-recovery-config.private.json`, 'utf8'));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
const candidate = record.candidateInput;
const recipe = { factionRecordKey: candidate.factionRecordKey,
  tacticalCardRecordKeys: candidate.tacticalCardRecordKeys,
  units: candidate.units.map(u => ({ unitInstanceId: u.unitInstanceId, recordKey: u.recordKey,
    compositionKind: u.compositionKind, upgradeNames: u.upgrades.map(x => x.upgradeName) })) };
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: ['player1', 'player2'].map(side => ({ label: side, seatKey: side, roleMode: 'supervisor', principalType: 'human' })),
  roomId: 'ticket27-slice-271-roster-workspace-isolated-lab',
  recipes: { ...rosterPlanExperimentGroupV274('F').referenceArmyRecipes, [candidate.sideKey]: recipe },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  mapConfiguration: JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8')),
});
const runtime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: structuredClone(authority.state) }) });
const builder = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }) });
let nativeActions = 0, nextModelRequests = 0;
const lab = createPregameSceneLaboratoryV1({ laboratoryId: 'ticket27-s271-roster-workspace-lab',
  sourceState: authority.state,
  sourceRoomRef: { roomId: 'ticket27-slice-271-roster-workspace-isolated-lab', stateRevision: 0 },
  rulesRuntime: { ...runtime, apply: (...args) => { nativeActions++; return runtime.apply(...args); } },
  armyBuilderPort: builder, matchBinding: authority.matchBinding });
const descriptor = lab.labDescriptor();
const before = hash(authority.state);
if (mode === 'math_contract') {
  const directory = `${base}/B/fresh-generation-v264/workspace/iterative-draft/sessions`;
  const name = (await fs.readdir(directory)).find(f => f.endsWith('.json'));
  const rawB = JSON.parse(await fs.readFile(`${directory}/${name}`, 'utf8'));
  const stateB = rawB.value ?? rawB;
  const inquiry = stateB.draftTeachSnapshots.findLast(row =>
    row.state.investigation?.operations.some(op => op.queryId === 'q-victory-route-kill-vp-supply-added'));
  const actual = inquiry.state.investigation.operations.find(op => op.queryId === 'q-victory-route-kill-vp-supply-added').request;
  let error;
  try { lab.queryMath({ ...actual.toolRequest, queryId: 'actual-b-missing-math-kind' }); }
  catch (caught) { error = caught; }
  assert.match(error?.code || error?.message || '', /PREGAME_LAB_MATH_KIND_REQUIRED/);
  assert.equal(error.queryRepair?.correctable, true, 'A real missing selector must return source-owned repair');
  assert(error.queryRepair.failureTargets.some(target => target.requestPointer === '/toolRequest/mathKind'));
  assert(error.queryRepair.availableContracts.integer_sum);
  const described = lab.describeQueryContext().capabilities.mathContracts;
  assert.deepEqual(described, error.queryRepair.availableContracts, 'Description and rejection use the same contract');
  const sum = lab.queryMath({ queryId: 'declared-arithmetic', mathKind: 'integer_sum', inputs: { values: [2, 1, -1] } });
  assert.equal(sum.result.total, 2);
  assert.equal(sum.scoringPremisesVerified, false, 'Arithmetic does not certify hypothetical kills');
  assert.equal(hash(authority.state), before);
  assert.equal(nativeActions, 0);
  console.log(JSON.stringify({ pass: true, case: 'actual_B_math_selector_repair', providerCalls: 0, nativeActions,
    sourceUnchanged: true, contractsShared: true, resultNotRulesProof: true }));
} else {
const teach = createIterativeRosterDraftTeachV1({
  createSceneLaboratory: input => { assert.equal(hash(input.candidateInput), hash(candidate)); return lab; },
  selectSkillGuidance: () => record.context.skillGuidance, missionEvidence: record.context.mission,
  deliberationFactory: { createForRun: async () => ({ deliberate: async () => {
    nextModelRequests++;
    throw Object.assign(Error('NEXT_MODEL_BOUNDARY'), { code: 'NEXT_MODEL_BOUNDARY' });
  } }) },
});
let failure;
try { await teach(state, async () => {}, { shouldPause: async () => false }); }
catch (error) { failure = error; }
console.log(JSON.stringify({ stage: 'actual_draft_teach_restore', sourceStateHash: descriptor.sourceStateHash,
  failure: failure?.code || failure?.message, stack: failure?.stack?.split('\n').slice(0,7),
  nativeActions, nextModelRequests }));
assert.notEqual(failure?.code || failure?.message, 'ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED',
  'The same source-bound retained F branch must restore through the real draft Teach caller');
assert(failure?.code === 'NEXT_MODEL_BOUNDARY' || !failure, 'No replacement engineering failure');
assert.equal(hash(authority.state), before);
assert.equal(nativeActions, 0, 'Restoration cannot reapply historical Native actions');
assert.equal(await fs.readFile(`${dir}/${file}`, 'utf8'), bytes, 'Original stopped session unchanged');
console.log(JSON.stringify({ pass: true, providerCalls: 0, nativeActions,
  originalSessionUnchanged: true, reachedNextModelBoundary: nextModelRequests === 1 }));
}
