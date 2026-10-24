// Captured B14 failures: unused math inputs, missing geometry repair context,
// and duplicate-query feedback loss. No Provider, Room write or strategy gate.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { runRosterTeachFrameworkSessionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
const before = hash(state);
const freeze = v => { if (v && typeof v === 'object' && !Object.isFrozen(v)) {
  Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const lab = createPregameSceneLaboratoryV1({ sourceState: state,
  armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(state.officialUnitCompositionUpgradeDataBundle) }),
  rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) }, enumerate() { throw Error('no action enumeration'); },
    instantiate() { throw Error('no execution'); }, apply() { throw Error('no mutation'); } } });
const common = { mutationAuthority: false, initialFoundationHash: 'b'.repeat(64), sourceHashes: ['c'.repeat(64)] };
const failures = [];
const check = async (name, run) => { try { await run(); console.log(JSON.stringify({ name, status: 'PASS' })); }
  catch (e) { failures.push({ name, error: e.message }); console.log(JSON.stringify({ name, status: 'FAIL', error: e.message })); } };
const operations = draft.teachFramework.state.investigation.operations;
const math = operations.filter(o => o.request.toolRequest.mathKind === 'mission_marker_schedule').slice(0, 2);
assert.equal(math.length, 2, 'retain actual two failed scoring scenarios');
await check('captured-math-without-unused-inputs', async () => {
  for (const op of math) {
    assert.equal(op.request.toolRequest.inputs, undefined);
    const expected = lab.queryMath({ ...op.request.toolRequest, inputs: {}, queryId: 'explicit-legacy-shape' });
    const actual = await createRosterTeachEvidencePortV1(lab).query({ ...common, challengeId: op.queryId, request: op.request });
    assert.equal(actual.status, 'advisory', actual.unknownReasonCode);
    assert.deepEqual(actual.sourceReceipt.result, expected.result);
    assert.equal(actual.sourceReceipt.result.provesFeasibleControlOrActualScore, false);
  }
});
// Exercise the actual adapter boundary using its captured native failure; this
// does not claim a new geometry solution or re-run v80's passed geometry gate.
const originalFailure = draft.teachFramework.state.investigation.evidence.find(e =>
  e.unknownReasonCode === 'PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND' && e.queryErrorDetail);
assert(originalFailure);
const failedOp = operations.find(o => o.queryId === originalFailure.challengeId);
let calls = 0;
const repairContext = { availableUnits: [{ unitId: 'u-marauder-1' }], board: { allTerrainCellsPreserved: true },
  actionSpace: { parameterDomains: [] }, queryContracts: {}, scenarioConstruction: {} };
const boundaryLab = { ...lab, describeQueryContext: () => structuredClone(repairContext),
  runScenarioBranch() { calls++; throw Error(originalFailure.queryErrorDetail); } };
await check('captured-formation-error-reaches-repair-context', async () => {
  const receipt = await createRosterTeachEvidencePortV1(boundaryLab).query({ ...common,
    challengeId: 'formation-boundary', request: failedOp.request });
  assert.equal(receipt.status, 'unknown');
  assert.equal(receipt.queryErrorDetail, originalFailure.queryErrorDetail);
  assert.equal(receipt.queryRepair?.originalQueryNotAnswered, true);
  assert.deepEqual(receipt.queryRepair.availableUnits, repairContext.availableUnits);
  assert.equal(receipt.queryRepair.modelMustChooseCorrection, true);
});
await check('duplicate-failure-keeps-actionable-feedback', async () => {
  const earlier = { ...originalFailure, challengeId: 'original', questionId: 'question',
    evidencePortDescriptorHash: createRosterTeachEvidencePortV1(boundaryLab).descriptor().descriptorHash,
    queryRepair: { ...repairContext, correctable: true, modelMustChooseCorrection: true, originalQueryNotAnswered: true } };
  const staleMath = { challengeId: 'old-math', questionId: 'question', status: 'unknown',
    unknownReasonCode: 'PREGAME_LAB_MATH_INPUTS_INVALID', evidencePortDescriptorHash: '0'.repeat(64) };
  const inquiry = { framework: draft.teachFramework.state.framework,
    agenda: { coverage: [], questions: [{ questionId: 'question', axisIds: ['terrain_and_formation'],
      evidenceRequest: math[0].request }] }, evidence: [{ ...earlier, challengeId: 'question' }],
    investigation: { version: 1,
      rounds: [{ completed: true, output: { queries: [] } }, { completed: false, output: {
        queries: [{ queryId: 'duplicate', questionId: 'question', kind: failedOp.request.kind,
          toolRequestJson: JSON.stringify(failedOp.request.toolRequest) },
        { queryId: 'repaired-math', questionId: 'question', kind: 'math',
          toolRequestJson: JSON.stringify(math[0].request.toolRequest) }] } },
      { completed: false, output: { queries: [] } }],
      operations: [{ queryId: 'original', questionId: 'question', request: failedOp.request, completed: true },
        { queryId: 'old-math', questionId: 'question', request: math[0].request, completed: true }], evidence: [earlier, staleMath] } };
  const result = await runRosterTeachFrameworkSessionV1({ sessionId: 'captured-feedback-replay', plan: {}, context: {},
    laboratory: boundaryLab, state: inquiry, onCheckpoint: async () => {}, deliberation: { async deliberate() {
      return { output: { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1', roundKind: 'teach_framework_synthesis',
        answers: [{ questionId: 'question', disposition: 'unresolved', evidenceRefs: [], publicReason: 'No geometry witness.',
          tradeoff: 'Unknown is not impossibility.', replanTrigger: 'Correct the failed scenario.', quantitativeEvidence: [] }],
        proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [] } }; } } });
  const duplicate = result.investigation.evidence.find(e => e.challengeId === 'duplicate');
  assert.equal(duplicate.repeatedFailedRequest, true);
  assert.equal(duplicate.queryErrorDetail, earlier.queryErrorDetail);
  assert.deepEqual(duplicate.queryRepair, earlier.queryRepair);
  const repairedMath = result.investigation.evidence.find(e => e.challengeId === 'repaired-math');
  assert.equal(repairedMath.status, 'advisory', 'obsolete failure must not mask repaired tool');
  assert.notEqual(repairedMath.repeatedFailedRequest, true);
  assert.deepEqual(result.investigation.evidence.find(e => e.challengeId === 'old-math'), staleMath);
  assert.equal(result.synthesis.answers[0].disposition, 'unresolved');
});
assert.equal(hash(state), before);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({ status: failures.length ? 'FAIL' : 'PASS', failures, providerCalls: 0,
  roomActions: 0, sourcePreserved: true, geometrySolutionClaimed: false, boundaryCalls: calls }));
if (failures.length) process.exitCode = 1;
