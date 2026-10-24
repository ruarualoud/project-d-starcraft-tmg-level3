import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json'));
  const id = 'Q3-opportunity-cost-slot-saturation-and-upgrade-swaps';
  const old = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === id);
  assert.equal(old.status, 'model_deferred');
  assert.equal(old.currentFailure.queryRepair.capabilities.builderCandidateComparison, undefined);
  const original = structuredClone(d.selectedCandidateInput);
  const alternative = structuredClone(original);
  alternative.units[0].upgrades.pop(); // Probe input only; never a chosen production alternative.
  const source = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json')).state;
  const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({ sourceState: source,
    armyBuilderPort: createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: freeze(source.officialUnitCompositionUpgradeDataBundle) }),
    rulesRuntime: { descriptor: { runtimeHash: 'a'.repeat(64) },
      enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_ACTION'); }, apply: () => { throw Error('NO_APPLY'); } } });
  const port = createRosterTeachEvidencePortV1(lab);
  const state = { agenda: { questions: [d.teachFramework.state.agenda.questions.find(q => q.questionId === id)] },
    evidence: [old.originalResult], investigation: { completed: true, operations: [], evidence: [] },
    queryRecovery: { operations: [structuredClone(old)], selection: { queryIds: [id], reexecuteSavedQuery: true } } };
  let asks = 0;
  const args = { state, plan: JSON.parse(d.planSerialized), sourceHash: d.teachFramework.state.sourceHash,
    context: { selectedRosterReference: { candidateInput: original, mutationAuthority: false } },
    evidencePort: port, completedBeforeRun: true, checkpoint: async () => {},
    ask: async (kind, nodes, instruction, validate) => {
      asks++;
      assert.deepEqual(nodes.find(n => n.kind === 'current_query_capability_guide').selectedRosterReference.candidateInput, original);
      assert(nodes.find(n => n.kind === 'current_query_capability_guide').builderComparison);
      assert.equal(kind, 'teach_framework_query_recovery', 'Replacement tool is not an old-arguments delta');
      const choice = { disposition: 'retry', kind: 'math', publicReason: 'Probe current Builder capability.',
        toolRequestJson: JSON.stringify({ mathKind: 'builder_candidate_comparison',
          argumentsJson: JSON.stringify({ candidates: [{ candidateRef: 'unchanged', candidateInput: original },
            { candidateRef: 'probe-alternative', candidateInput: alternative }] }) }) };
      validate(choice);
      return choice;
    } };
  const results = await recoverRosterTeachQueriesV1(args);
  assert.equal(asks, 1, 'A real model_deferred query must reopen once when its missing tool is now explicitly available');
  assert.equal(results[0].status, 'advisory');
  assert.equal(results[0].sourceReceipt.candidates[0].mineralSpent, 2000);
  const op = state.queryRecovery.operations[0];
  assert.deepEqual(op.choices[0], old.choices[0]);
  assert.equal(op.maximumAttempts, old.maximumAttempts, 'Unused correction budget is retained, not reset or expanded');
  assert.equal(op.deferredCapabilityRecovery.historyReset, false);
  await recoverRosterTeachQueriesV1(args);
  assert.equal(asks, 1, 'Same capability cannot repeatedly reopen the completed correction');
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  assert.deepEqual(d.selectedCandidateInput, original);
  report.checks.push('actual_deferred_A_reopened_once_with_current_contract_and_exact_roster_native_comparison_no_history_reset');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
