import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { recoverRosterTeachQueriesV1 } from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const formal = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const actual = formal.teachFramework.state;
const questionId = 'q-opponent-scenarios-creep-bonuses';
const question = actual.agenda.questions.find(q => q.questionId === questionId);
const evidence = actual.evidence.find(e => e.challengeId === questionId);
assert(evidence.queryRepair.correctable);
const makeState = () => ({ agenda: { questions: [structuredClone(question)] },
  evidence: [structuredClone(evidence)], investigation: { completed: true,
    rounds: structuredClone(actual.investigation.rounds), operations: [], evidence: [] } });
let calls = 0;
const run = state => recoverRosterTeachQueriesV1({ state, plan: {},
  context: formal.teachFramework.context, sourceHash: actual.sourceHash,
  evidencePort: { describeQueryContext: () => formal.teachFramework.context.queryContext,
    query: async () => structuredClone(evidence) },
  ask: async () => { calls++; throw Error('ALREADY_ANSWERED_QUESTION_WAS_REPAIRED'); },
  checkpoint: async () => {}, completedBeforeRun: false });
const state = makeState();
await run(state);
assert.equal(calls, 0, 'Completed factual handoff must not re-buy a fix for an obsolete request');
assert.equal(state.queryRecovery.investigationHandoffs[0].questionId, questionId);
assert.equal(state.queryRecovery.investigationHandoffs[0].planAccepted, false);
assert.deepEqual(state.evidence[0], evidence, 'Original failed query is not changed into success');
const unresolved = makeState();
const round = unresolved.investigation.rounds.findLast(r => r.output.questionProgress.some(p => p.questionId === questionId));
round.output.unresolved.push({ questionId, missingEvidence: 'A factual predicate still needs a query', whyNotCurrentlyQueryable: 'Pending prerequisite' });
await assert.rejects(run(unresolved), /ALREADY_ANSWERED_QUESTION_WAS_REPAIRED/);
assert.equal(calls, 1, 'A factual unresolved item still enters correction');
const explicit = makeState();
explicit.queryRecovery = { operations: [], selection: { queryIds: [questionId] } };
await assert.rejects(run(explicit), /ALREADY_ANSWERED_QUESTION_WAS_REPAIRED/);
assert.equal(calls, 2, 'An explicit recovery selection is preserved');
console.log(JSON.stringify({ pass: true, actualResolvedQuestionNotReopened: true,
  unresolvedAndExplicitRecoveryPreserved: true, originalErrorNotConvertedToSuccess: true,
  providerCalls: 0, nativeExecutions: 0, writes: 0 }));
