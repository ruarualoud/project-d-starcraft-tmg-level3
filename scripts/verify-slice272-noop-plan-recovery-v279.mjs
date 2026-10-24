// Actual E r8->r9 submitted the exact same Plan and was counted as progress.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createIterativeRosterPlanSessionV1 } from '../packages/roster-strategist/iterative-roster-plan-session-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/E/fresh-generation-v274/workspace/iterative-draft/sessions`;
const file = (await fs.readdir(directory)).find(f => f.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/${file}`, 'utf8'));
const original = raw.value || raw;
const prior = original.iterations.find(i => i.revision === 8);
const repeated = original.iterations.find(i => i.revision === 9);
assert.deepEqual(prior.planSnapshot, repeated.planSnapshot);
let saved = { ...structuredClone(original), revision: 8, status: 'active', pendingDecision: null,
  pauseRequested: false, blockingFinding: null, draftTeachSnapshots: [],
  plan: structuredClone(prior.planSnapshot), currentCandidate: structuredClone(prior.candidateSnapshot),
  iterations: structuredClone(original.iterations.filter(i => i.revision <= 8)) };
const before = hash({ plan: saved.plan, candidate: saved.currentCandidate });
const paidDecisionHash = hash(repeated.publicDecision);
let selections = 0;
const session = createIterativeRosterPlanSessionV1({
  store: { load: async () => saved, save: async (_, state) => { saved = state; } },
  model: { decide: async () => { selections++; return { outcome: 'completed',
    receiptHash: repeated.modelReceiptHash, decision: structuredClone(repeated.publicDecision) }; } },
  builder: { evaluate: async () => { throw Error('UNEXPECTED_BUILDER'); } },
  tools: { query: async () => { throw Error('UNEXPECTED_RULE_QUERY'); } },
  review: { draft: async state => state, final: async () => { throw Error('UNEXPECTED_FINAL_REVIEW'); } },
});
const result = await session.resume(saved.sessionId);
assert.equal(result.iterations.at(-1).decisionKind, 'repair_needed',
  'An identical canonical Plan must use existing output correction, not become a successful revision');
assert.equal(result.observations.at(-1).receipt.failureCode, 'ITERATIVE_ROSTER_PLAN_REVISION_UNCHANGED');
assert.equal(result.observations.at(-1).receipt.diagnostics.hostChoosesNextDecision, false);
assert.equal(result.status, 'active', 'First no-op should be recoverable without manual field editing');
assert.equal(result.blockingFinding, null);
assert.equal(hash({ plan: result.plan, candidate: result.currentCandidate }), before);
assert.equal(hash(repeated.publicDecision), paidDecisionHash);
assert.equal(selections, 1);
console.log(JSON.stringify({ pass: true, capturedTransition: 'E-r8-to-r9', originalPlanAndArmyUnchanged: true,
  outcome: 'automatic_output_repair', providerCalls: 0, roomActions: 0 }));
