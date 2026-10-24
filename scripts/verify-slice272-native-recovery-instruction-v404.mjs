import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { reprojectRosterTeachNativeQueryRepairV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const draft = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const state = structuredClone(draft.teachFramework.state);
const op = state.queryRecovery.operations.find(row => row.originalQueryId === 'teach-native-move-marine1-toward-marker2');
const context = state.investigation.evidence.find(row => row.challengeId === op.request.toolRequest.branchIdRef).branchQueryContext;
// Actual saved 188 operation, isolated from other paid operations. No query runs.
state.queryRecovery.operations = [op];
// Keep the real pending owner, so unrelated earlier fire repairs cannot preempt it.
op.completed = false; op.pendingChoice = false;
let checked = false;
const error = await recoverRosterTeachQueriesV1({ state, plan: JSON.parse(draft.planSerialized),
  context: draft.teachFramework.context, sourceHash: state.sourceHash,
  completedBeforeRun: false, investigationProducedNewEvidence: true,
  evidencePort: { descriptor: () => ({ descriptorHash: 'a'.repeat(64) }), describeQueryContext: () => context,
    reprojectSavedNativeQueryFailure: input => input.request?.kind === 'scenario'
      && input.request.toolRequest?.spec?.kind === 'native_action'
      ? reprojectRosterTeachNativeQueryRepairV1({ ...input, queryContext: context }) : input.receipt }, checkpoint: async () => {},
  retainEvidence: value => value, ask: async (_kind, nodes, instruction) => {
    const workflow = nodes.find(row => row.kind === 'geometry_repair_workflow');
    if (workflow?.layoutOwner !== 'native_current_action_formation_tool') throw Error('WRONG_FIXTURE_OPERATION');
    assert.doesNotMatch(instruction, /obtain Native static formation options|static solver needs no action domain/i,
      'actual movement repair is incorrectly instructed to use static layout');
    assert.match(instruction, /space\.solve_formation/);
    assert.match(instruction, /domainId/);
    checked = true; throw Error('EXPECTED_INSTRUCTION_INSPECTED');
  } }).then(() => null, e => e);
assert.equal(error?.message, 'EXPECTED_INSTRUCTION_INSPECTED', error?.stack);
assert.equal(checked, true);
console.log(JSON.stringify({ passed: true, actualRequest: 188, providerCalls: 0, nativeExecutions: 0 }));
