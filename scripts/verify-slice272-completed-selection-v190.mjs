import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { rosterTeachRecoveryBranchSelectionV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base, output, mode] = process.argv.slice(2);
const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json'));
const report = { providerCalls: 0, sourceDraftWrites: 0 };
if (mode === '--branch-selector-only') {
  try {
    const state = structuredClone(d.teachFramework.state);
    state.phase = 'completed';
    assert.equal(state.queryRecovery.selection.completed, true);
    assert(!rosterTeachRecoveryBranchSelectionV1(state), 'Completed selection must not omit other retained branches from a new investigation');
    state.queryRecovery.selection.completed = false;
    assert.deepEqual(rosterTeachRecoveryBranchSelectionV1(state), state.queryRecovery.selection);
    report.ok = true;
  } catch (error) { report.ok = false; report.failure = error.message; }
  await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report)); process.exit(report.ok ? 0 : 1);
}
try {
  const original = d.teachFramework.state;
  assert.equal(original.queryRecovery.selection.completed, true);
  const failed = original.investigation.evidence.find(e => e.status === 'unknown' && e.queryRepair?.correctable);
  assert(failed, 'Use an actual retained correctable failure');
  const saved = original.investigation.operations.find(o => o.queryId === failed.challengeId);
  const state = { agenda: structuredClone(original.agenda), evidence: [],
    investigation: { operations: [{ ...structuredClone(saved), queryId: 'new-dependent-query' }],
      evidence: [{ ...structuredClone(failed), challengeId: 'new-dependent-query' }] },
    queryRecovery: { operations: [], selection: structuredClone(original.queryRecovery.selection) } };
  const oldSelection = JSON.stringify(state.queryRecovery.selection);
  let chosen = [];
  const port = { describeQueryContext: () => ({}), descriptor: () => ({ descriptorHash: 'test' }),
    query: async () => { throw Error('No redundant query expected before a correction choice'); } };
  await recoverRosterTeachQueriesV1({ state, plan: {}, context: {}, evidencePort: port, sourceHash: 'test',
    completedBeforeRun: true, investigationProducedNewEvidence: true,
    checkpoint: async () => {}, retainEvidence: () => ({}), readRetainedEvidence: () => ({}),
    ask: async (_kind, nodes) => { chosen.push(nodes.find(n => n.kind === 'failed_query_to_correct').originalQueryId);
      return { disposition: 'defer', publicReason: 'Retain the actual unresolved error.' }; } });
  assert.deepEqual(chosen, ['new-dependent-query'], 'Completed old selection must not suppress new dependent-query repair');
  assert.equal(JSON.stringify(state.queryRecovery.selection), oldSelection, 'Historical selection is preserved');
  assert.equal(state.queryRecovery.operations[0].status, 'model_deferred');
  const noNewEvidence = { ...state, queryRecovery: { operations: [], selection: state.queryRecovery.selection } };
  await recoverRosterTeachQueriesV1({ state: noNewEvidence, completedBeforeRun: true,
    ask: async () => { throw Error('Completed unchanged run must not restart recovery'); } });
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 }); console.log(JSON.stringify(report));
