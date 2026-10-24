// Concrete regression: A's failed mission-marker follow-up repeatedly returned
// the same whole request or removed the query. Host-owned failure paths already
// exist, but only failures wrapped by Native received the field-edit contract.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { supportsRosterTeachQueryDeltaV1, applyRosterTeachQueryDeltaV1 } from '../packages/roster-strategist/roster-teach-query-delta-v1.mjs';
import { recoverRosterTeachQueriesV1, assessRosterTeachQueryRepairPredicatesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';

const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeCalls: 0, sourceDraftWrites: 0 };
try {
  const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
  const saved = draft.teachFramework.state;
  const id = 'query-r3-6ddcff8a535b64da03e9f55d';
  const original = saved.investigation.operations.find(o => o.queryId === id);
  const op = structuredClone(saved.queryRecovery.operations.find(o => o.originalQueryId === id));
  const request = op.request;
  const failure = op.currentFailure;
  assert.equal(failure.queryRepair.failureTargets[0].unknownReasonCode, 'ROSTER_TEACH_SCENARIO_FOLLOWUP_KIND_UNSUPPORTED');
  assert(supportsRosterTeachQueryDeltaV1(request, failure), 'The actual Host-bound adapter failure must expose causal field edits, not another whole-query echo');
  report.checks.push('actual_adapter_failure_exposes_field_edits');

  const child = request.toolRequest.followUps[0];
  const reply = { disposition: 'retry', kind: 'patch', toolRequestJson: '', edits: [
    { op: 'replace', path: '/toolRequest/followUps/0/kind', valueJson: '"spatial"' },
    { op: 'add', path: '/toolRequest/followUps/0/queryKind', valueJson: '"mission_marker_control"' },
    { op: 'add', path: '/toolRequest/followUps/0/argumentsJson', valueJson: JSON.stringify(JSON.stringify({ unitIds: child.unitIds, markerIds: child.markerIds })) },
    { op: 'remove', path: '/toolRequest/followUps/0/unitIds', valueJson: '' },
    { op: 'remove', path: '/toolRequest/followUps/0/markerIds', valueJson: '' },
  ], publicReason: 'Scripted transport correction retains the exact requested units and markers; it is not a control or strategic conclusion.' };
  const fixed = applyRosterTeachQueryDeltaV1({ request, failure, reply });
  assert.deepEqual(fixed.toolRequest.spec, request.toolRequest.spec);
  assert.deepEqual(JSON.parse(fixed.toolRequest.followUps[0].argumentsJson), { unitIds: child.unitIds, markerIds: child.markerIds });
  assert.throws(() => applyRosterTeachQueryDeltaV1({ request, failure, reply: { ...reply,
    edits: [{ op: 'replace', path: '/toolRequest/spec/clearTerrain', valueJson: 'true' }] } }), /OUTSIDE_FAILURE/);
  assert.equal(supportsRosterTeachQueryDeltaV1({ ...request, toolRequest: { ...request.toolRequest, followUps: [] } }, failure), false);
  assert.equal(supportsRosterTeachQueryDeltaV1(request, { ...failure, queryRepair: { ...failure.queryRepair, correctable: false } }), false);
  const deniedNative = structuredClone(failure);
  deniedNative.queryRepair.failureTargets[0].nativeQueryRepair = { mayRepairSameChoice: false };
  assert.equal(supportsRosterTeachQueryDeltaV1(request, deniedNative), false);
  assert.equal(assessRosterTeachQueryRepairPredicatesV1(failure, fixed).sameFailedPredicates, true);
  assert.equal(assessRosterTeachQueryRepairPredicatesV1(failure, { kind: 'scenario', toolRequest: { ...fixed.toolRequest, followUps: [] } }).sameFailedPredicates, false);
  report.checks.push('exact_selectors_predicate_and_scene_preserved_stale_path_and_native_denial_rejected');

  const oldChoices = structuredClone(op.choices);
  const oldMax = op.maximumAttempts;
  const state = { phase: 'completed', agenda: saved.agenda,
    investigation: { ...saved.investigation, operations: [original], evidence: saved.investigation.evidence.filter(e => e.challengeId === id) },
    evidence: saved.evidence, queryRecovery: { version: 1, operations: [op], selection: { queryIds: [id], reexecuteSavedQuery: true, completed: false } } };
  let asks = 0, executions = 0;
  const options = { state, plan: {}, context: draft.teachFramework.context, sourceHash: saved.sourceHash,
    completedBeforeRun: true, checkpoint: async () => {},
    retainEvidence: () => ({ fixture: 'preserved-outside-this-focused-repair' }),
    evidencePort: { descriptor: () => ({ descriptorHash: op.result.evidencePortDescriptorHash }),
      query: async input => { executions++; assert.deepEqual(input.request, fixed);
        return { status: 'advisory', receiptHash: hash({ input: input.request }), trainingTruth: false }; } },
    ask: async (kind, nodes, _instruction, semantic) => {
      asks++; assert.equal(kind, 'teach_framework_query_delta_recovery');
      assert.deepEqual(nodes.find(n => n.kind === 'failed_request_delta_base').semanticRequest, request);
      semantic(reply); return reply;
    } };
  await recoverRosterTeachQueriesV1(options);
  assert.equal(asks, 1); assert.equal(executions, 1);
  assert.deepEqual(op.choices.slice(0, oldChoices.length), oldChoices);
  assert.equal(op.completed, true); assert.equal(op.status, 'advisory');
  assert.equal(op.adapterDeltaRecovery.previousMaximumAttempts, oldMax);
  assert.equal(op.adapterDeltaRecovery.additionalAttempts, 1);
  assert.equal(op.adapterDeltaRecovery.historyReset, false);
  await recoverRosterTeachQueriesV1(options);
  assert.equal(asks, 1); assert.equal(executions, 1);
  report.checks.push('actual_recovery_loop_one_scripted_correction_no_reset_no_repeat');
  Object.assign(report, { ok: true, fakeAdapterExecutions: executions, actualModelRepairProven: false });
} catch (error) {
  Object.assign(report, { ok: false, failure: error.message });
  process.exitCode = 1;
}
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
