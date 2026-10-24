// Reproduce A's v137 overlapping formation: recovery must be able to read a
// solver result without replacing the failed predicate or spending its final
// correction choice. No Provider, Native geometry or Room is mocked as proven.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { rosterTeachFrameworkContractV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
const base = process.argv[2];
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const state = d.teachFramework.state;
const op = state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r4-b4c5d6e7f8091a2b3c4d5e6f');
assert.equal(op.result.unknownReasonCode, 'MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP');
const originalRequest = structuredClone(op.request), originalFailure = structuredClone(op.result);
const oldChoices = structuredClone(op.choices), oldMaximum = op.maximumAttempts;
const branch = op.result.queryRepair.scenarioContinuation.branchIdRef;
const args = JSON.parse(op.request.toolRequest.followUps[0].argumentsJson);
const auxiliary = { kind: 'spatial', toolRequest: { branchIdRef: branch,
  queryKind: 'space.solve_formation', argumentsJson: JSON.stringify({ domainId: args.domainId }) } };
const readChoice = { disposition: 'retry', kind: 'prerequisite_query', edits: [],
  toolRequestJson: JSON.stringify(auxiliary), publicReason: 'Obtain a legal candidate before repairing the original placement query.' };
const contract = rosterTeachFrameworkContractV1('teach_framework_query_delta_recovery');
assert(validate(contract.providerSchema, { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1',
  roundKind: 'teach_framework_query_delta_recovery', ...readChoice }).ok,
  'Concrete defect: the recovery role cannot express a prerequisite solver query');
assert(validate(rosterTeachFrameworkContractV1('teach_framework_query_recovery').providerSchema,
  { schemaVersion: 'starcraft_tmg_teach_framework_generation_v1', roundKind: 'teach_framework_query_recovery',
    ...Object.fromEntries(Object.entries(readChoice).filter(([key]) => key !== 'edits')) }).ok);
state.queryRecovery.selection = { queryIds: [op.originalQueryId], reexecuteSavedQuery: true };
let asks = 0, queries = 0, saved;
const candidateValue = args.parameters.placements[0].xMilliInches + 100;
const patch = { disposition: 'retry', kind: 'patch', toolRequestJson: '',
  edits: [{ op: 'replace', path: '/toolRequest/followUps/0/argumentsJson/parameters/placements/0/xMilliInches',
    valueJson: JSON.stringify(candidateValue) }], publicReason: 'Fixture field transport only; this is not a geometry certification.' };
const options = { state, plan: {}, context: d.teachFramework.context, sourceHash: state.sourceHash,
  completedBeforeRun: true, checkpoint: async () => { saved = structuredClone(op); },
  retainEvidence: () => ({ reference: 'fixture' }),
  evidencePort: { descriptor: () => ({ descriptorHash: op.result.evidencePortDescriptorHash }),
    query: async ({ request, mutationAuthority }) => {
      assert.equal(mutationAuthority, false); queries++;
      if (request.toolRequest.queryKind === 'space.solve_formation') {
        assert.deepEqual(request, auxiliary);
        assert.deepEqual(op.result, originalFailure);
        return { status: 'advisory', receiptHash: 'b'.repeat(64), candidateValue,
          trainingTruth: false, fixtureNotNativeLegality: true };
      }
      assert.deepEqual(request.toolRequest.spec, originalRequest.toolRequest.spec);
      assert.deepEqual(request.toolRequest.followUps[1], originalRequest.toolRequest.followUps[1]);
      assert.equal(JSON.parse(request.toolRequest.followUps[0].argumentsJson).parameters.placements[0].xMilliInches, candidateValue);
      return { status: 'advisory', receiptHash: 'c'.repeat(64), trainingTruth: false };
    } },
  ask: async (kind, nodes, _instruction, semantic) => {
    asks++; assert.equal(kind, 'teach_framework_query_delta_recovery');
    if (asks > 1) {
      assert.deepEqual(op.result, originalFailure);
      assert.deepEqual(op.currentFailure, originalFailure);
      assert.equal(op.completed, false);
      const inspections = nodes.find(n => n.kind === 'query_inspection_results').inspections;
      assert.equal(inspections.at(-1).result.originalQueryNotAnswered, true);
      assert.equal(inspections.at(-1).result.queryReceipt.candidateValue, candidateValue);
      assert.equal(saved.pendingChoice, false);
    }
    // Repeated read is recovered from its stored receipt, not re-executed.
    const choice = asks <= 2 ? readChoice : patch;
    semantic(choice); return choice;
  },
};
await recovery.recoverRosterTeachQueriesV1(options);
assert.equal(asks, 3); assert.equal(queries, 2);
assert.equal(op.maximumAttempts, oldMaximum + 1);
assert.deepEqual(op.choices.slice(0, oldChoices.length), oldChoices);
assert.equal(op.inspections.at(-1).reusedFromChoiceIndex, oldChoices.length);
assert.equal(op.prerequisiteQueryRecovery.historyReset, false);
assert.equal(op.result.receiptHash, 'c'.repeat(64));
await recovery.recoverRosterTeachQueriesV1(options);
assert.equal(asks, 3); assert.equal(queries, 2);
assert.throws(() => recovery.validateRosterTeachPrerequisiteQueryV1(originalFailure,
  { ...auxiliary, toolRequest: { ...auxiliary.toolRequest, branchIdRef: 'wrong-branch' } }), /ROSTER_TEACH_PREREQUISITE_BRANCH/);
assert.throws(() => recovery.validateRosterTeachPrerequisiteQueryV1(originalFailure,
  { kind: 'scenario', toolRequest: auxiliary.toolRequest }), /ROSTER_TEACH_PREREQUISITE_KIND/);
assert.throws(() => recovery.validateRosterTeachPrerequisiteQueryV1(originalFailure,
  { ...auxiliary, toolRequest: { ...auxiliary.toolRequest, base: { kind: 'source' } } }), /ROSTER_TEACH_PREREQUISITE_BASE/);
console.log(JSON.stringify({ status: 'PASS', actualFailure: originalFailure.unknownReasonCode,
  solverReadThenPatch: true, readDoesNotAnswerOriginal: true, readDoesNotSpendFinalCorrection: true,
  duplicateReadReused: true, oldChoicesRetained: oldChoices.length, noRepeatGrant: true,
  wrongBranchAndMutationRejected: true, providerCalls: 0, nativeExecutions: 0,
  fakeAdapterExecutions: queries, roomActions: 0, geometryLegalityProven: false }));
