import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createIterativeRosterFlashModelPortV1 } from
  "../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const [stateFile, replyFile] = process.argv.slice(2);
const state = JSON.parse(await fs.readFile(stateFile, "utf8")).value;
const paid = JSON.parse(await fs.readFile(replyFile, "utf8")).value;
assert.equal(paid.paidProviderCall, true);
assert.equal(paid.output.kind, "finish");
const originalOutput = structuredClone(paid.output);
async function evaluate(inputState) {
  const replies = new Map();
  const port = createIterativeRosterFlashModelPortV1({
    skillGuidance: {}, missionEvidence: {},
    replyStore: {
      loadRetainedReply: async (key) => replies.get(key),
      retainReply: async (key, value) => replies.set(key, value),
    },
    deliberationFactory: {
      createForRun: async ({ onEvent }) => ({
        deliberate: async (request) => {
          await onEvent({ type: "round_completed",
            receiptHash: paid.receiptHash, usage: paid.usage,
            sanitizedOutputRecord: { sanitizedOutput: paid.output } });
          return { output: paid.output };
        },
      }),
    },
  });
  return port.decide({ requestKey: "captured-paid-finish-bug", state: inputState });
}
const result = await evaluate(state);
assert.equal(result.decision.kind, "finish",
  `Current authoritative route must not depend on an LLM copying its hash: ${result.decision.failureCode}`);
const route = state.observations.findLast((entry) =>
  entry.query.kind === "map_route"
  && entry.query.candidateHash === state.currentCandidate.candidateHash);
assert.equal(result.decision.plan.mapEvidenceHash, route.receipt.receiptHash);
assert.equal(result.decision.originalMapEvidenceHash, paid.output.plan.mapEvidenceHash);
assert.equal(result.decision.plan.victoryRoute, paid.output.plan.victoryRoute);
assert.deepEqual(result.decision.plan.strategy, paid.output.plan.strategy);
assert.deepEqual(paid.output, originalOutput);
for (const mutation of ["no_route", "wrong_candidate", "wrong_map", "under_budget"]) {
  const invalid = structuredClone(state);
  if (mutation === "no_route") invalid.observations = invalid.observations.filter(
    (entry) => entry.query.kind !== "map_route");
  else if (mutation === "under_budget") invalid.currentCandidate.mineralSpent = 1999;
  else for (const entry of invalid.observations) {
    if (entry.query.kind !== "map_route") continue;
    if (mutation === "wrong_candidate") entry.receipt.candidateHash = "f".repeat(64);
    else entry.receipt.mapBinding.roomFreezeHash = "e".repeat(64);
  }
  assert.equal((await evaluate(invalid)).decision.kind, "repair_needed", mutation);
}
process.stdout.write(JSON.stringify({ status: "passed", providerCalls: 0,
  sourcePaidOutputHash: hashStarcraftTmgContract(paid.output),
  authoritativeRouteHash: route.receipt.receiptHash,
  strategyUnchanged: true, negativeGuards: 4 }) + "\n");
