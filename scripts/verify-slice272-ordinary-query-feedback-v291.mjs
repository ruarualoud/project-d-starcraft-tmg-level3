import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { reprojectRosterTeachNativeQueryRepairV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/F/fresh-generation-v274/workspace/iterative-draft/sessions`;
const filename = (await fs.readdir(directory)).find(name => name.endsWith('.json'));
const stored = JSON.parse(await fs.readFile(`${directory}/${filename}`, 'utf8'));
const original = (stored.value ?? stored).draftTeachSnapshots.at(-1).state;
const receipt = original.investigation.evidence.find(row => row.unknownReasonCode === 'SELECTED_MELEE_CHARGE_DECLARATION_PARAMETERS_INVALID'
  && row.queryRepair?.actionSpace?.parameterDomains?.some(domain => domain.actionType === 'charge'));
assert(receipt, 'Actual F contains the ordinary-recovery charge declaration failure');
const target = original.investigation.operations.find(row => hash(row.request) === receipt.requestHash);
assert(target);
const question = original.agenda.questions.find(row => row.questionId === target.questionId);
const state = { framework: original.framework, agenda: { questions: [question] }, evidence: [],
  investigation: { operations: [structuredClone(target)], evidence: [structuredClone(receipt)] } };
const preservedReceipt = hash(receipt), preservedRequest = hash(target.request);
let nodes, projections = 0, checkpoints = 0;
const capture = new Error('CAPTURE_FIRST_REAL_RECOVERY_PROMPT');
await assert.rejects(recoverRosterTeachQueriesV1({ state, plan: { planHash: hash('fixture-plan') },
  context: { rosterEditAuthority: 'agent_selected' }, sourceHash: original.sourceHash,
  completedBeforeRun: false, investigationProducedNewEvidence: true,
  evidencePort: {
    describeQueryContext: () => receipt.queryRepair,
    query: () => { throw Error('No Native execution permitted before repair choice'); },
    reprojectSavedNativeQueryFailure: input => {
      projections++;
      return reprojectRosterTeachNativeQueryRepairV1({ ...input, queryContext: receipt.queryRepair });
    },
  }, checkpoint: async () => { checkpoints++; },
  ask: async (_kind, input) => { nodes = input; throw capture; },
}), error => error === capture);
const failed = nodes.find(node => node.kind === 'failed_query_to_correct');
assert(failed, 'Capture the ordinary product query-recovery prompt');
assert(failed.result.queryRepair.failureTargets.some(row => row.currentParameterContractReview?.fieldIssues?.length),
  'Ordinary recovery must refresh source feedback before its first model choice, without an explicit legacy selection');
assert.equal(failed.result.nativeParameterContractProjection.nativeExecutions, 0);
assert.equal(projections, 1);
const operation = state.queryRecovery.operations[0];
assert.equal(operation.choices.length, 0);
assert.equal(operation.maximumAttempts, 3, 'Do not refill correction limits');
assert.equal(operation.previousResults[0].receiptHash, receipt.receiptHash);
assert.equal(hash(receipt), preservedReceipt);
assert.equal(hash(target.request), preservedRequest);
assert.deepEqual(failed.request, target.request, 'The model, not the refresh, must edit the request');
console.log(JSON.stringify({ pass: true, actualFOrdinaryRecovery: true, projections, checkpoints,
  originalRequestAndReceiptUnchanged: true, retriesAdded: 0, providerCalls: 0, nativeActions: 0 }));
