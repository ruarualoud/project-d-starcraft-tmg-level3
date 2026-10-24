import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async name => JSON.parse(gunzipSync(await fs.readFile(`${directory}/${name}`)));
const captured = (await read('call-047.product-request.json.gz')).promptNodes[0].content.decisionState;
const route = (await read('call-043.product-request.json.gz')).promptNodes[0].content.latestToolTurn.results[1];
const original = { schema: 'starcraft_tmg_iterative_roster_plan_session_v1',
  sessionId: captured.sessionId, revision: captured.revision, modelDecisionReceiptCount: 0,
  modelContextVersion: 19, mineralBudget: captured.mineralBudget,
  frozenContext: captured.frozenContext, contextHash: hash(captured.frozenContext),
  currentCandidate: captured.currentCandidate, plan: captured.plan, iterations: [],
  observations: [{ query: route.query, receipt: route.receipt }],
  teachFeedbackPolicy: 'skill_teach_roster_coevolution_v1' };
const reply = JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-047.reply.json.gz`)));
const action = { kind: 'revise_plan', plan: reply.output.plan,
  assumptionDisposition: reply.output.assumptionDisposition || reply.output.plan.assumptionDisposition };
const withoutReason = strategy => { const { revisionReason, ...rest } = strategy; return rest; };
assert.deepEqual(withoutReason(action.plan.strategy), withoutReason(original.plan.strategy));
assert.notEqual(action.plan.strategy.revisionReason, original.plan.strategy.revisionReason);
async function run(decision) {
  let saved = { ...structuredClone(original), status: 'active', pendingDecision: null,
    pauseRequested: false, blockingFinding: null };
  const before = hash({ plan: saved.plan, army: saved.currentCandidate });
  const session = createIterativeRosterPlanSessionV1({
    store: { load: async () => saved, save: async (_, next) => { saved = next; } },
    model: { decide: async () => ({ outcome: 'completed', receiptHash: reply.receipt.receiptHash, decision }) },
    builder: { evaluate: async () => { throw Error('NO_BUILDER_NEEDED'); } },
    tools: { query: async () => { throw Error('NO_NEW_RULE_QUERY'); } },
    review: { draft: async value => value, final: async () => { throw Error('NO_FINAL_ADMISSION'); } },
  });
  return { result: await session.resume(saved.sessionId), before };
}
const noChange = await run(action);
assert.equal(noChange.result.iterations.at(-1).decisionKind, 'repair_needed',
  'Editing revisionReason alone must not claim that an operational strategy changed');
assert.equal(noChange.result.observations.at(-1).receipt.failureCode, 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED');
assert.equal(hash({ plan: noChange.result.plan, army: noChange.result.currentCandidate }), noChange.before);
assert.equal(noChange.result.observations.at(-1).receipt.diagnostics.revisionExplanationChanged, true);
const actualChange = structuredClone(action);
actualChange.plan.strategy.openingSequence = [...actualChange.plan.strategy.openingSequence,
  'Conditional alternative deployment chosen by the model for this regression fixture.'];
assert.equal((await run(actualChange)).result.iterations.at(-1).decisionKind, 'revise_plan');
console.log(JSON.stringify({ pass: true, checks: 2, actualReply47: true,
  explanationOnlyIsNotStrategicProgress: true, actualStrategyChangeStillAllowed: true,
  providerCalls: 0, nativeCalls: 0 }));
