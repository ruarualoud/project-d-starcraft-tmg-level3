#!/usr/bin/env node

import assert from "node:assert/strict";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createIterativeRosterPlanSessionV1 } from
  "../packages/roster-strategist/iterative-roster-plan-session-v1.mjs";

const saved = new Map();
const decisions = [
  { kind: "propose", candidateInput: { id: "first", minerals: 1870 },
    plan: { victoryRoute: "hold marker 1", mapEvidenceHash: null,
      arrivalScheduleStatus: "unknown" }, assumptionDisposition: "retain" },
  { kind: "query", queries: [{ kind: "map_route", targetId: "marker-1" }],
    question: "Can the selected base reach marker 1?" },
  { kind: "propose", candidateInput: { id: "revised", minerals: 2000 },
    plan: { victoryRoute: "hold marker 1 and contest marker 5",
      mapEvidenceHash: "route-evidence-v1", arrivalScheduleStatus: "legal" },
    assumptionDisposition: "revise" },
  { kind: "finish" },
];
let modelCalls = 0;
let builderCalls = 0;
let branchQueries = 0;
let routeQueries = 0;
const session = createIterativeRosterPlanSessionV1({
  store: {
    load: async (id) => structuredClone(saved.get(id) || null),
    save: async (id, value) => { saved.set(id, structuredClone(value)); },
  },
  model: {
    decide: async () => {
      modelCalls += 1;
      return { decision: decisions.shift(), outcome: "completed",
        receiptHash: `model-receipt-${modelCalls}` };
    },
  },
  builder: {
    evaluate: async (candidateInput) => {
      builderCalls += 1;
      return { legal: true, mineralSpent: candidateInput.minerals,
        mineralBudget: 2000,
        candidateHash: hashStarcraftTmgContract(candidateInput),
        verdictHash: `rules-verdict-${builderCalls}` };
    },
  },
  tools: {
    query: async (query) => {
      if (query.kind === "budget_branches") {
        branchQueries += 1;
        return { status: "exact", receiptHash: "budget-evidence-v1",
          exactBudgetImpossibilityClaimed: false };
      }
      routeQueries += 1;
      return { status: "exact", receiptHash: "route-evidence-v1" };
    },
  },
  review: {
    final: async () => ({ blockingFindings: [],
      reviewHash: "review-zero-high-v1" }),
  },
});

const opened = await session.start({ sessionId: "iterative-2000-fixture",
  mineralBudget: 2000, frozenContext: { mapHash: "frozen-map-v1",
    taskHash: "frozen-task-v1", sourceHash: "frozen-source-v1" } });
assert.equal(opened.status, "active");
const first = await session.resume("iterative-2000-fixture");
assert.equal(first.status, "active");
assert.equal(first.currentCandidate.mineralSpent, 1870);
assert.equal(branchQueries, 1);
const paused = await session.pause("iterative-2000-fixture");
assert.equal(paused.status, "paused");
assert.equal((await session.read("iterative-2000-fixture")).iterations.length, 1);
await session.resume("iterative-2000-fixture");
assert.equal(routeQueries, 1);
await session.resume("iterative-2000-fixture");
const ready = await session.resume("iterative-2000-fixture");
assert.equal(ready.status, "ready_for_match");
assert.equal(ready.currentCandidate.mineralSpent, 2000);
assert.equal(ready.plan.victoryRoute, "hold marker 1 and contest marker 5");
assert.equal(ready.iterations.length, 4);
assert.equal(modelCalls, 4);
assert.equal(builderCalls, 2);
assert.equal(branchQueries, 1);
assert.equal(routeQueries, 1);
const ambiguousSaved = new Map();
let ambiguousDispatches = 0;
let exactRecoveries = 0;
const recoverable = createIterativeRosterPlanSessionV1({
  store: {
    load: async (id) => structuredClone(ambiguousSaved.get(id) || null),
    save: async (id, value) => {
      ambiguousSaved.set(id, structuredClone(value));
    },
  },
  model: {
    decide: async () => {
      ambiguousDispatches += 1;
      throw new Error("ambiguous_after_dispatch");
    },
    recover: async ({ requestKey }) => {
      exactRecoveries += 1;
      assert.equal(typeof requestKey, "string");
      return { outcome: "completed", receiptHash: "retained-model-receipt",
        decision: { kind: "query", question: "Check frozen route",
          queries: [{ kind: "map_route", targetId: "marker-1" }] } };
    },
  },
  builder: { evaluate: async () => assert.fail("builder not requested") },
  tools: { query: async () => ({ status: "exact",
    receiptHash: "recovered-route-receipt" }) },
  review: { final: async () => assert.fail("review not requested") },
});
await recoverable.start({ sessionId: "iterative-recovery-fixture",
  mineralBudget: 2000, frozenContext: { mapHash: "frozen-map-v1",
    taskHash: "frozen-task-v1", sourceHash: "frozen-source-v1" } });
await assert.rejects(recoverable.resume("iterative-recovery-fixture"),
  /ambiguous_after_dispatch/u);
const recovered = await recoverable.resume("iterative-recovery-fixture");
assert.equal(recovered.status, "active");
assert.equal(recovered.iterations.length, 1);
assert.equal(ambiguousDispatches, 1);
assert.equal(exactRecoveries, 1);
const forgedSaved = new Map();
let forgedRound = 0;
const forged = createIterativeRosterPlanSessionV1({
  store: {
    load: async (id) => structuredClone(forgedSaved.get(id) || null),
    save: async (id, value) => { forgedSaved.set(id, structuredClone(value)); },
  },
  model: { decide: async () => {
    forgedRound += 1;
    return { outcome: "completed", receiptHash: `forged-model-${forgedRound}`,
      decision: forgedRound === 1
        ? { kind: "propose", candidateInput: { id: "under", minerals: 1870 },
          plan: { victoryRoute: "hold marker 1", mapEvidenceHash: null,
            arrivalScheduleStatus: "unknown" },
          assumptionDisposition: "retain" }
        : { kind: "propose", candidateInput: { id: "full", minerals: 2000 },
          plan: { victoryRoute: "hold marker 1",
            mapEvidenceHash: "budget-only-receipt",
            arrivalScheduleStatus: "legal" },
          assumptionDisposition: "retain" } };
  } },
  builder: { evaluate: async (candidateInput) => ({ legal: true,
    mineralSpent: candidateInput.minerals, mineralBudget: 2000,
    candidateHash: hashStarcraftTmgContract(candidateInput),
    verdictHash: "forged-rules-verdict" }) },
  tools: { query: async () => ({ status: "exact",
    receiptHash: "budget-only-receipt",
    exactBudgetImpossibilityClaimed: false }) },
  review: { final: async () => assert.fail("forged map cannot reach review") },
});
await forged.start({ sessionId: "iterative-forgery-fixture",
  mineralBudget: 2000, frozenContext: { mapHash: "frozen-map-v1",
    taskHash: "frozen-task-v1", sourceHash: "frozen-source-v1" } });
await forged.resume("iterative-forgery-fixture");
await assert.rejects(forged.resume("iterative-forgery-fixture"),
  (error) => error?.code === "ITERATIVE_ROSTER_MAP_EVIDENCE_UNBOUND");
process.stdout.write("iterative_roster_session_ready; providerCalls=0; roomMutations=0\n");
