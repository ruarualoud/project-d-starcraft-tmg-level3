// Concrete A/B regression: caller-supplied 4/8/12/16 became rule-number evidence.
// Uses saved production contexts and a saved frozen Room; no Provider or Room writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { rosterReviewPremiseFactsV1, rosterReviewPremiseIssuesV1 } from '../packages/roster-strategist/roster-review-premises-v1.mjs';
import * as scoring from '../packages/roster-strategist/mission-marker-scoring-arithmetic-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';

const base = process.argv[2];
const paths = {
  A: '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json',
  B: '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json',
};
const drafts = {};
for (const [arm, path] of Object.entries(paths)) {
  const d = drafts[arm] = JSON.parse(await fs.readFile(base + path, 'utf8'));
  const facts = rosterReviewPremiseFactsV1(d.teachFramework.context);
  const index = d.teachFramework.context.sourceFacts.citedReadOnlyQueryEvidence
    .findIndex(r => r.mathKind === 'vp_schedule_delta');
  assert(index >= 0, `${arm}: actual captured receipt required`);
  const prefix = `citedReadOnlyQueryEvidence.${index}.`;
  const leaked = facts.numbers.filter(f => f.factId.startsWith(prefix));
  console.log(JSON.stringify({ arm, capturedMathNumbersPromotedToRuleFacts: leaked.length }));
  assert.equal(leaked.length, 0, `${arm}: arithmetic over model inputs must not prove scoring premises`);
  assert(facts.texts.some(f => f.sourcePath.startsWith(prefix)), 'paid evidence remains readable');
  assert(facts.numbers.some(f => f.factId === 'marker-group:player2:player2:2,4' && f.value === 2));
  const claim = '4 VP per scoring round';
  const issues = rosterReviewPremiseIssuesV1({ facts,
    targets: [{ findingIndex: 0, category: 'scoring', claimQuote: claim, claimText: claim }],
    output: { judgments: [{ findingIndex: 0, evidenceScope: 'settled_fact',
      claimAssessment: 'source_supported', sourceEvidence: [], factChecks: [{
        factId: `${prefix}result.deltas.0.projectedCumulativeVp`,
        claimValueQuote: '4 VP', claimedValue: '4' }] }] } });
  assert(issues.some(i => i.code === 'FACT_PREMISE_NOT_BOUND'));
}
const authority = drafts.A.toolReceipts[0];
const windows = [1, 2, 3, 4, 5].map(round => ({ round,
  controlledMarkersBySide: { player1: [1, 3, 5], player2: [2, 4] } }));
const input = { sideKey: 'player1', windows };
const score = scoring.projectMissionMarkerControlScheduleV1({ receipt: authority, ...input });
assert.equal(score.status, 'conditional_rules_arithmetic');
assert.deepEqual(score.rows.map(r => r.markerVpByActor), [
  { player1: 0, player2: 0 }, ...Array.from({ length: 4 }, () => ({ player1: 3, player2: 2 }))]);
assert.deepEqual(score.rows.map(r => r.ownMinusOpponentCumulativeMarkerVp), [0, 1, 2, 3, 4]);
assert.equal(score.provesFeasibleControlOrActualScore, false);
assert.equal(score.destroyedEnemySupplyVpExcluded, true);
const swapped = scoring.projectMissionMarkerControlScheduleV1({ receipt: authority, ...input, sideKey: 'player2' });
assert.deepEqual(swapped.rows.map(r => r.ownMinusOpponentCumulativeMarkerVp), [0, -1, -2, -3, -4]);
const missing = scoring.projectMissionMarkerControlScheduleV1({ receipt: authority,
  ...input, windows: windows.filter(w => w.round !== 2) });
assert.equal(missing.rows[2].cumulativeMarkerVpByActor.player1, null, 'missing window is not zero income');
const bad = structuredClone(input);
bad.windows[1].controlledMarkersBySide.player2.push(1);
assert.equal(scoring.projectMissionMarkerControlScheduleV1({ receipt: authority, ...bad }).status, 'unknown');
const nonexistent = structuredClone(input);
nonexistent.windows[0].controlledMarkersBySide.player1.push(99);
assert.equal(scoring.projectMissionMarkerControlScheduleV1({ receipt: authority, ...nonexistent }).status, 'unknown');

const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
function freeze(value) { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; }
let enumerationCalls = 0;
const runtime = { descriptor: { runtimeHash: 'a'.repeat(64) },
  enumerate() { enumerationCalls++; throw Error('arithmetic does not enumerate moves'); },
  instantiate() { throw Error('no action'); }, apply() { throw Error('no mutation'); } };
const lab = createPregameSceneLaboratoryV1({ sourceState: state, rulesRuntime: runtime,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) }) });
const request = { mathKind: 'mission_marker_schedule', inputs: {}, argumentsJson: JSON.stringify(input) };
const direct = lab.queryMath({ queryId: 'v77-roster-query', ...request });
assert.deepEqual(direct.result.rows.map(r => r.ownMinusOpponentCumulativeMarkerVp), [0, 1, 2, 3, 4]);
const evidence = await createRosterTeachEvidencePortV1(lab).query({ challengeId: 'v77-score-control',
  initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)], mutationAuthority: false,
  request: { kind: 'math', toolRequest: request } });
assert.equal(evidence.status, 'advisory');
assert.equal(evidence.calculationPolicy, direct.calculationPolicy);
assert.deepEqual(evidence.sourceReceipt.result, direct.result, 'Teach and direct roster query share scoring semantics');
const wrong = lab.queryMath({ queryId: 'v77-duplicate-control', ...request, argumentsJson: JSON.stringify(bad) });
assert.equal(wrong.resultStatus, 'unknown');
const legacy = lab.queryMath({ queryId: 'v77-old-math-kept', mathKind: 'vp_schedule_delta',
  inputs: { planned: [{ window: 'R2', plannedCumulativeVp: 3 }], projected: [{ window: 'R2', cumulativeVp: 4 }] } });
assert.equal(legacy.result.deltas[0].deltaVp, 1, 'old numeric arithmetic not rewritten into a tactic');
assert.equal(legacy.scoringPremisesVerified, false);
assert.equal(enumerationCalls, 0);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ status: 'PASS', checks: ['captured-AB-authority-boundary',
  'same-frozen-mission-actor-control-arithmetic', 'side-perspective', 'missing-window-unknown',
  'conflicting-and-unknown-marker-rejected', 'shared-lab-and-teach', 'legacy-math-preserved'],
  providerCalls: 0, roomMutations: 0, planChanges: 0 }));
