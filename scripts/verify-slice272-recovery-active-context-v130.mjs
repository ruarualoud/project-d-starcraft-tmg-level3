// A real recovery received both the empty source LegalSpace and the populated
// failed branch, plus the old strategy Plan. Observe the production prompt seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
import { projectRosterTeachPromptEvidenceV1, readRosterTeachRetainedEvidenceV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const base = process.argv[2];
const draft = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/plan-production-v31/A/workspace/drafts/rws-1b0a31ec-fd74-433b-8531-4a2ce7019535.json', 'utf8'));
const op = JSON.parse(await fs.readFile(base + '/common-v128-dropped-query-fixture.private.json', 'utf8')).operation;
const teach = draft.teachFramework;
const plan = draft.planVersionHistory.map(s => JSON.parse(s)).find(p => p.planHash === teach.planHash);
const question = teach.state.agenda.questions.find(q => q.questionId === op.questionId);
const state = { framework: teach.state.framework, agenda: { questions: [question] }, evidence: [],
  investigation: { operations: [{ queryId: op.originalQueryId, questionId: op.questionId, request: op.originalRequest }], evidence: [] },
  queryRecovery: { selection: { queryIds: [op.originalQueryId], reexecuteSavedQuery: true }, operations: [op] } };
const archive = new Map();
let nodes;
await assert.rejects(recoverRosterTeachQueriesV1({ state, plan, context: teach.context,
  sourceHash: teach.state.sourceHash, completedBeforeRun: true, checkpoint: async () => {},
  evidencePort: { descriptor: () => ({ descriptorHash: op.result.evidencePortDescriptorHash }),
    query() { throw Error('Prompt inspection must not execute a query'); } },
  retainEvidence: value => { const reference = hash(value); archive.set(reference, value);
    return { evidenceObjectHash: reference, contextOnlyNotStrategyProof: true,
      retrieval: { kind: 'retained_evidence', toolRequestJson: JSON.stringify({ receiptHash: reference, path: '' }) } }; },
  ask: async (_kind, input) => { nodes = projectRosterTeachPromptEvidenceV1(input, archive); throw Error('CAPTURED_WITHOUT_PROVIDER'); },
}), /CAPTURED_WITHOUT_PROVIDER/);
const actionContexts = [];
function walk(value) { if (!value || typeof value !== 'object') return;
  if (value.actionSpace?.parameterDomains) actionContexts.push(value);
  for (const child of Object.values(value)) walk(child); }
walk(nodes);
if (!process.argv.includes('--background-only')) {
  assert.equal(actionContexts.length, 1, 'Only the failed branch may supply inline executable action domains');
  assert.equal(actionContexts[0].baseStateHash, op.currentFailure.queryRepair.baseStateHash);
  assert.equal(actionContexts[0].actionSpace.parameterDomains.length, 21);
  assert.equal(nodes[0].kind, 'failed_query_to_correct');
  assert.equal(nodes[0].result.unknownReasonCode, 'ROSTER_TEACH_RECOVERY_QUERY_PREDICATE_DROPPED');
  assert.equal(nodes[0].executionContext.branchIdRef, op.currentFailure.queryRepair.scenarioContinuation.branchIdRef);
  assert.deepEqual(nodes.find(n => n.kind === 'strategic_question').question, question);
}
const background = nodes.find(n => n.kind === 'query_repair_background');
const lookup = JSON.parse(background.retained.retrieval.toolRequestJson);
let verifiedLeaves = 0;
function verifyRetained(expected, path = '') {
  const retrieved = readRosterTeachRetainedEvidenceV1([], { ...lookup, path }, archive);
  if (Object.hasOwn(retrieved, 'value')) { assert.deepEqual(retrieved.value, expected); verifiedLeaves++; return; }
  // Large bodies return an index, not a truncated value. Follow the advertised
  // child paths, exactly as the real read contract instructs the consumer.
  assert.equal(retrieved.fullBodyAvailable, true);
  assert.deepEqual(retrieved.children.map(c => c.path), Object.keys(expected).map(k => path ? path + '.' + k : k));
  for (const child of retrieved.children) verifyRetained(expected[child.path.split('.').at(-1)], child.path);
}
verifyRetained({ plan, framework: teach.state.framework, context: teach.context });
const newBytes = JSON.stringify(nodes).length;
const oldBytes = JSON.stringify(projectRosterTeachPromptEvidenceV1([
  { kind: 'frozen_plan_and_method', plan, framework: teach.state.framework, context: teach.context },
  { kind: 'strategic_question', question },
  { kind: 'failed_query_to_correct', originalQueryId: op.originalQueryId, request: op.originalRequest, result: op.currentFailure },
  { kind: 'previous_correction_result', choice: op.choices.at(-1), result: op.currentFailure, attemptsUsed: 4, maximumAttempts: 5 },
])).length;
assert(newBytes < oldBytes, 'Do not increase irrelevant inline context');
console.log(JSON.stringify({ status: 'PASS', activeActionContexts: actionContexts.length,
  priorPassedAssertionsRepeated: !process.argv.includes('--background-only'), verifiedLeaves,
  all21CurrentDomainsRetained: true, originalQuestionUnchanged: true,
  fullPlanFrameworkContextRetrievable: true, newBytes, oldBytes,
  providerCalls: 0, roomActions: 0, actualModelCorrectionProven: false }));
