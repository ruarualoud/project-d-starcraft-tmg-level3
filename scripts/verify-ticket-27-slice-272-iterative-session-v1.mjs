#!/usr/bin/env node

import assert from "node:assert/strict";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createIterativeRosterPlanSessionV1 } from
  "../packages/roster-strategist/iterative-roster-plan-session-v1.mjs";

// Actual fresh B: a Builder-legal 1000-point roster and four certified
// replacements existed, but the next Provider contract prohibited all scene
// queries. Exercise only this bug seam, not the old broad session gates.
if (process.argv[2] === "--budget-deliberation-only") {
  const { readFile, writeFile } = await import("node:fs/promises");
  const { createIterativeRosterFlashModelPortV1 } = await import(
    "../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs");
  const { createIterativeRosterToolPortV1 } = await import(
    "../packages/roster-strategist/iterative-roster-tool-port-v1.mjs");
  const { validateStarcraftTmgProviderJsonSchemaValueV1 } = await import(
    "../packages/structured-generation/output-contract-registry-v1.mjs");
  const capture = JSON.parse(await readFile(process.argv[3], "utf8"));
  const original = JSON.stringify(capture);
  assert.equal(capture.state.currentCandidate.mineralSpent, 1000);
  assert.equal(capture.state.iterations.at(-1).rulesVerdictStatus, "legal");
  const snapshots = new Map();
  const fresh = createIterativeRosterPlanSessionV1({
    store: { load: async id => snapshots.get(id) || null,
      save: async (id, value) => snapshots.set(id, structuredClone(value)) },
    model: { decide: async () => assert.fail("opening a session is not generation") },
    builder: { evaluate: async () => assert.fail("not auditing a new roster") },
    tools: { query: async () => assert.fail("opening cannot execute a tool") },
    review: { final: async () => assert.fail("not claiming match readiness") },
  });
  const opened = await fresh.start({ sessionId: "captured-budget-deliberation",
    mineralBudget: capture.state.mineralBudget,
    frozenContext: capture.state.frozenContext });
  const state = { ...structuredClone(capture.state),
    modelContextVersion: opened.modelContextVersion };
  const queryOutput = { ...structuredClone(capture.originalFirstProposal),
    kind: "query", question: "Inspect the current legal roster before choosing a replacement.",
    queries: [{ kind: "scene_context", candidateHash: state.currentCandidate.candidateHash,
      factionRecordKey: "", scaleId: "", startOffset: 0, maximumEvaluations: 0,
      maximumMutationDepth: 0, queryKind: "", argumentsJson: "{}", branchStateHash: "" }] };
  let stubbedDeliberations = 0;
  async function probe(current, output, expectQueries) {
    const replies = new Map();
    const requestKey = hashStarcraftTmgContract({ version: current.modelContextVersion,
      kind: output.kind, purpose: "isolated_contract_probe" });
    const port = createIterativeRosterFlashModelPortV1({
      skillGuidance: { source: "captured_contract_probe_not_strategy_evidence" },
      missionEvidence: current.frozenContext,
      replyStore: { loadRetainedReply: async key => replies.get(key) || null,
        retainReply: async (key, value) => replies.set(key, value) },
      deliberationFactory: { createForRun: async options => ({
        deliberate: async request => {
          stubbedDeliberations += 1;
          assert.equal(request.responseContract.queryKinds.includes("scene_context"),
            expectQueries, "a legal under-budget candidate must not lose tactical/map queries");
          assert.equal(request.responseFormat.schema.properties.kind.enum.includes("query"),
            expectQueries, "the Provider schema must agree with the advertised tools");
          const verdict = validateStarcraftTmgProviderJsonSchemaValueV1(
            request.responseFormat.schema, output);
          assert.equal(verdict.ok, true, "probe uses the real generated Provider schema");
          await options.onEvent({ type: "round_completed",
            receiptHash: hashStarcraftTmgContract({ requestKey, output }),
            sanitizedOutputRecord: { sanitizedOutput: output },
            usage: { inputUnits: 0, outputUnits: 0, totalUnits: 0 } });
        },
      }) },
    });
    return port.decide({ requestKey, state: current });
  }
  const queried = await probe(state, queryOutput, true);
  assert.equal(queried.decision.kind, "query");
  assert.equal(queried.decision.queries[0].candidateHash,
    capture.state.currentCandidate.candidateHash);
  let scenesOpened = 0;
  const tools = createIterativeRosterToolPortV1({
    armyBuilderPort: { evaluateRosterCandidate: () => assert.fail("not replacing a roster"),
      enumerateArmyBuildingChoices: () => assert.fail("not querying the menu") },
    mapEvidencePort: { summarizeMap: () => assert.fail("not querying map summary"),
      evaluateRosterRoute: () => assert.fail("not auditing a route") },
    createSceneLaboratory: ({ candidateInput }) => {
      scenesOpened += 1;
      assert.deepEqual(candidateInput, capture.state.currentCandidate.input);
      return { describeQueryContext: () => ({
        scope: "stubbed_context_query_not_geometric_certification" }) };
    },
  });
  const evidence = await tools.query(queried.decision.queries[0], state);
  assert.equal(evidence.candidateHash, capture.state.currentCandidate.candidateHash);
  assert.equal(evidence.mutationAuthority, false);
  assert.equal(scenesOpened, 1);
  await assert.rejects(tools.query({ ...queried.decision.queries[0],
    candidateHash: "0".repeat(64) }, state),
  error => error.code === "ITERATIVE_ROSTER_TOOL_STALE_CANDIDATE");
  assert.equal(scenesOpened, 1, "a stale query does not create a substituted scene");
  const finished = await probe(state, { ...queryOutput, kind: "finish", queries: [] }, true);
  assert.equal(finished.decision.kind, "repair_needed");
  assert.equal(finished.decision.failureCode,
    "ITERATIVE_ROSTER_FLASH_FINISH_BUDGET_SHORTFALL");
  // Saved v4 decisions retain their old context/schema, not silent migration.
  const legacy = await probe(capture.state, capture.originalFirstProposal, false);
  assert.equal(legacy.decision.kind, "repair_needed");
  assert.equal(legacy.decision.failureCode, "ITERATIVE_ROSTER_FLASH_UNCHANGED_UNDER_BUDGET");
  assert.equal(JSON.stringify(capture), original);
  const report = { passed: true, capturedLegalMinerals: 1000, requiredMinerals: 2000,
    newSessionVersion: opened.modelContextVersion,
    freshSessionTacticalQueriesReachCurrentCandidateScene: true,
    providerContractAndRuntimeAcceptSameQuery: true,
    underBudgetFinishStillRejected: true, staleCandidateStillRejected: true,
    legacyPaidContextUnchanged: true, originalCaptureUnchanged: true,
    stubbedDeliberations, realProviderCalls: 0, roomMutations: 0,
    scope: "actual_B_budget_query_contract_not_fresh_model_army_or_strategy_certification",
    trainingTruth: false };
  await writeFile(process.argv[4], JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  console.log(JSON.stringify(report));
  process.exit(0);
}

const saved = new Map();
// These scripted decisions exercise the original v1 query ordering. Newly
// opened production sessions use v2 deterministic budget/route preflights;
// preserve the legacy fixture as an explicit versioned compatibility case.
const useLegacyQueryOrder = (records, id) => {
  const state = records.get(id);
  records.set(id, { ...state, modelContextVersion: 1 });
};
const decisions = [
  { kind: "propose", candidateInput: { id: "first", minerals: 1870 },
    plan: { victoryRoute: "hold marker 1", mapEvidenceHash: null,
      arrivalScheduleStatus: "unknown" }, assumptionDisposition: "retain" },
  { kind: "propose", candidateInput: { id: "revised", minerals: 2000 },
    plan: { victoryRoute: "hold marker 1 and contest marker 5",
      mapEvidenceHash: null, arrivalScheduleStatus: "legal" },
    assumptionDisposition: "revise" },
  { kind: "query", queries: [{ kind: "map_route", targetId: "marker-1",
    candidateHash: hashStarcraftTmgContract({ id: "revised", minerals: 2000 }) }],
    question: "Can this exact 2000-point roster reach marker 1?" },
  { kind: "finish", plan: { victoryRoute: "hold marker 1 and contest marker 5",
    mapEvidenceHash: "route-evidence-v1", arrivalScheduleStatus: "legal" },
  assumptionDisposition: "retain" },
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
      return { legal: true, status: "legal",
        mineralSpent: candidateInput.minerals,
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
useLegacyQueryOrder(saved, "iterative-2000-fixture");
assert.equal(opened.status, "active");
const first = await session.resume("iterative-2000-fixture");
assert.equal(first.status, "active");
assert.equal(first.currentCandidate.mineralSpent, 1870);
assert.equal(branchQueries, 1);
const paused = await session.pause("iterative-2000-fixture");
assert.equal(paused.status, "paused");
assert.equal((await session.read("iterative-2000-fixture")).iterations.length, 1);
await session.resume("iterative-2000-fixture");
await session.resume("iterative-2000-fixture");
assert.equal(routeQueries, 1);
const ready = await session.resume("iterative-2000-fixture");
assert.equal(ready.status, "ready_for_match");
assert.equal(ready.currentCandidate.mineralSpent, 2000);
assert.equal(ready.plan.victoryRoute, "hold marker 1 and contest marker 5");
assert.equal(ready.iterations.length, 4);
assert.equal(modelCalls, 4);
assert.equal(builderCalls, 2);
assert.equal(branchQueries, 1);
assert.equal(routeQueries, 1);
const staleSaved = new Map();
let staleRound = 0;
const staleMap = createIterativeRosterPlanSessionV1({
  store: {
    load: async (id) => structuredClone(staleSaved.get(id) || null),
    save: async (id, value) => staleSaved.set(id, structuredClone(value)),
  },
  model: { decide: async () => ({ outcome: "completed",
    receiptHash: `stale-model-${++staleRound}`,
    decision: staleRound === 1
      ? { kind: "propose", candidateInput: { id: "final", minerals: 2000 },
        plan: { victoryRoute: "hold marker 1", mapEvidenceHash: null,
          arrivalScheduleStatus: "legal" }, assumptionDisposition: "retain" }
      : { kind: "query", question: "Reuse the old roster route?",
        queries: [{ kind: "map_route", targetId: "marker-1",
          candidateHash: hashStarcraftTmgContract({ id: "old", minerals: 1870 }) }] } }) },
  builder: { evaluate: async (candidateInput) => ({ legal: true,
    status: "legal", mineralSpent: 2000, mineralBudget: 2000,
    candidateHash: hashStarcraftTmgContract(candidateInput),
    verdictHash: "stale-rules-verdict" }) },
  tools: { query: async () => assert.fail("stale query must not reach tools") },
  review: { final: async () => assert.fail("stale evidence cannot finish") },
});
await staleMap.start({ sessionId: "iterative-stale-map-fixture",
  mineralBudget: 2000, frozenContext: { mapHash: "frozen-map-v1",
    taskHash: "frozen-task-v1", sourceHash: "frozen-source-v1" } });
useLegacyQueryOrder(staleSaved, "iterative-stale-map-fixture");
await staleMap.resume("iterative-stale-map-fixture");
await assert.rejects(staleMap.resume("iterative-stale-map-fixture"),
  (error) => error?.code === "ITERATIVE_ROSTER_MAP_QUERY_STALE_CANDIDATE");
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
        decision: { kind: "query", question: "Check frozen scenario",
          queries: [{ kind: "scenario", targetId: "marker-1" }] } };
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
useLegacyQueryOrder(ambiguousSaved, "iterative-recovery-fixture");
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
    status: "legal",
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
useLegacyQueryOrder(forgedSaved, "iterative-forgery-fixture");
await forged.resume("iterative-forgery-fixture");
await assert.rejects(forged.resume("iterative-forgery-fixture"),
  (error) => error?.code === "ITERATIVE_ROSTER_MAP_EVIDENCE_UNBOUND");
process.stdout.write("iterative_roster_session_ready; providerCalls=0; roomMutations=0\n");
