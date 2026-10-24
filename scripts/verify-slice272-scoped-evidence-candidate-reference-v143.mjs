// Reproduce the two v141/v142 integration defects using retained real receipts:
// static Native evidence disappears behind advisory labels, and a model cannot
// select an already-computed formation without retyping all its coordinates.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const actual = JSON.parse(await fs.readFile(base + '/common-v142-native-query-capability.private.json', 'utf8'));
const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
assert.equal(op.result.unknownReasonCode, 'SELECTED_SPATIAL_PLACEMENT_DENOMINATOR_INVALID');
const failure = structuredClone(op.result), request = structuredClone(op.request);
const helper = actual.receipts[0].receipt;
const candidate = helper.sourceReceipt.queryReceipt.result.formationOptions[0];
const selection = { receiptHash: helper.receiptHash, optionId: candidate.formationOptionId,
  requestPointer: failure.queryRepair.failureTargets[0].requestPointer };
const reply = { disposition: 'retry', kind: 'candidate_parameters', edits: [],
  toolRequestJson: JSON.stringify(selection), publicReason: 'Select the first retained diagnostic option; not a model strategy evaluation.' };
const inspections = [{ result: { queryReceipt: helper } }];
const checks = [];
async function check(name, fn) {
  try { await fn(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', reason: error.message }); }
}
await check('actual_static_evidence_survives_failed_query_projection', () => {
  const projected = framework.projectRosterTeachPromptEvidenceV1(failure);
  assert.equal(projected.status, 'unknown');
  const scoped = projected.scopedGeometryEvidence;
  assert(scoped?.length, 'Native static evidence is not exposed independently of arrival legality');
  const branch = scoped.find(s => s.branchStateHash === actual.branchStateHash);
  assert(branch); assert.equal(branch.units.length, 3);
  for (const unit of branch.units) {
    assert.equal(unit.nativeStaticGeometryStatus, 'passed');
    assert.equal(unit.coherencyStatus, 'in_coherency');
    assert.match(unit.nativeGeometryResultHash, /^[a-f0-9]{64}$/u);
  }
  assert.equal(branch.provenArrivalHistory, false);
  assert.equal(branch.provenFutureOpponentChoice, false);
  assert.equal(projected.originalQueryNotAnswered, true);
  assert.deepEqual(op.result, failure);
});
await check('actual_candidate_can_be_selected_without_coordinate_retyping', () => {
  const schema = framework.rosterTeachFrameworkContractV1('teach_framework_query_delta_recovery').providerSchema;
  assert(validate(schema, { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
    roundKind: 'teach_framework_query_delta_recovery', ...reply }).ok,
  'Recovery cannot express a reference to the already-computed Native candidate');
  assert.equal(typeof recovery.applyRosterTeachCandidateParametersV1, 'function');
  const repaired = recovery.applyRosterTeachCandidateParametersV1({ request, failure, selection, inspections });
  const args = JSON.parse(repaired.toolRequest.followUps[0].argumentsJson);
  assert.deepEqual(args.parameters, candidate.canonicalParameters);
  assert.equal(args.domainId, candidate.domainId);
  assert.equal(args.parameters.placements.length, 8);
  assert.deepEqual(repaired.toolRequest.spec, request.toolRequest.spec);
  assert.deepEqual(repaired.toolRequest.followUps[1], request.toolRequest.followUps[1]);
  assert(recovery.assessRosterTeachQueryCorrectionScopeV1(request, repaired).sameNamedScope);
  assert(recovery.assessRosterTeachQueryRepairPredicatesV1(failure, repaired).sameFailedPredicates);
  assert.deepEqual(op.request, request);
});
// Only run new negative checks once the concrete missing seam exists.
if (typeof recovery.applyRosterTeachCandidateParametersV1 === 'function') {
  await check('candidate_reference_cannot_cross_scene_or_edit_siblings', () => {
    const options = { request, failure, selection, inspections };
    assert.throws(() => recovery.applyRosterTeachCandidateParametersV1({ ...options,
      selection: { ...selection, requestPointer: '/toolRequest/followUps/1' } }), /CANDIDATE_TARGET/);
    assert.throws(() => recovery.applyRosterTeachCandidateParametersV1({ ...options,
      selection: { ...selection, optionId: 'missing' } }), /CANDIDATE_OPTION/);
    assert.throws(() => recovery.applyRosterTeachCandidateParametersV1({ ...options,
      selection: { ...selection, receiptHash: 'missing' } }), /CANDIDATE_RECEIPT/);
    const foreign = structuredClone(inspections);
    foreign[0].result.queryReceipt.sourceReceipt.baseStateHash = '0'.repeat(64);
    assert.throws(() => recovery.applyRosterTeachCandidateParametersV1({ ...options,
      inspections: foreign }), /CANDIDATE_SCENE/);
  });
  await check('recovery_dispatch_consumes_reference_and_revalidates_original_query', async () => {
    // Isolated copy; one explicit test choice, not an extension of the real run.
    const state = structuredClone(d.teachFramework.state);
    state.queryRecovery.selection = { queryIds: [op.originalQueryId] };
    const testOp = state.queryRecovery.operations.find(o => o.originalQueryId === op.originalQueryId);
    testOp.completed = false; testOp.maximumAttempts += 1;
    testOp.currentFailure = failure; testOp.inspections = inspections;
    const oldChoices = structuredClone(testOp.choices);
    let asks = 0, dispatches = 0;
    await recovery.recoverRosterTeachQueriesV1({ state, plan: {}, context: d.teachFramework.context,
      sourceHash: state.sourceHash, completedBeforeRun: true, checkpoint: async () => {},
      retainEvidence: () => ({ fixture: true }),
      ask: async (_kind, _nodes, _instruction, semantic) => { asks++; semantic(reply); return reply; },
      evidencePort: { descriptor: () => ({ descriptorHash: failure.evidencePortDescriptorHash }),
        query: async ({ request: dispatched }) => {
          dispatches++;
          assert.deepEqual(JSON.parse(dispatched.toolRequest.followUps[0].argumentsJson).parameters,
            candidate.canonicalParameters);
          // Replay an observed success only for transport assertion, not new Native proof.
          return { ...structuredClone(actual.receipts[1].receipt), replayedDiagnosticReceipt: true };
        } } });
    assert.equal(asks, 1); assert.equal(dispatches, 1);
    assert.deepEqual(testOp.choices.slice(0, oldChoices.length), oldChoices);
    assert.equal(testOp.candidateParameterSelections.at(-1).optionId, candidate.formationOptionId);
    assert.equal(testOp.result.replayedDiagnosticReceipt, true);
  });
}
const report = { status: checks.every(c => c.status === 'PASS') ? 'PASS' : 'FAIL', checks,
  providerCalls: 0, nativeExecutions: 0, roomActions: 0,
  actualSolverReceiptReused: helper.receiptHash, modelAutonomousRecoveryProven: false };
console.log(JSON.stringify(report));
process.exitCode = report.status === 'PASS' ? 0 : 1;
