#!/usr/bin/env node

// Concrete regression: the product workspace still routed a completed
// 44-component plan through the unbounded single-response final review.
// This isolated copy of the saved plan must use seven bounded review rounds.
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dataDirectory = await mkdtemp(path.join(root,
  "build/ticket-27-slice-272-workspace-sharded-review-"));
await mkdir(path.join(dataDirectory, "drafts"), { recursive: true });
const sessionId = "agent-selected-teach-standard-2000-fresh-c-v1";
await copyFile(path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1/drafts",
  `${sessionId}.json`), path.join(dataDirectory, "drafts",
  `${sessionId}.json`));
let calls = 0;
const deliberationFactory = {
  availability: () => ({ available: true, kind: "focused_mock",
    modelVersion: "no-provider", paidProvider: false }),
  async createForRun({ onEvent }) {
    return { async deliberate(request) {
      assert.equal(request.promptPack,
        "ticket27.roster_final_plan_review.sharded.v1");
      calls += 1;
      const sources = request.promptNodes.find((node) =>
        node.kind === "frozen-plan-claims")?.sources;
      assert.ok(sources.length > 0 && sources.length <= 8);
      const output = {
        schemaVersion: "starcraft_tmg_roster_final_plan_review_shard_v1",
        roundKind: "final_plan_review", findings: [],
        publicSummary: "Focused bounded workspace route check.",
        reviewedClaimPaths: sources.map((source) => source.path),
        hasUnreportedMaterialFindings: false,
      };
      const outputHash = hashStarcraftTmgContract(output);
      await onEvent({ type: "round_started", roundKind: request.roundKind,
        roundIndex: request.roundIndex });
      await onEvent({ type: "round_completed", roundKind: request.roundKind,
        roundIndex: request.roundIndex, paidProviderCall: false,
        sanitizedOutputRecord: { roundKind: request.roundKind,
          roundIndex: request.roundIndex, contextHash: request.contextHash,
          outputContractRef: request.responseFormat.outputContractRef,
          sanitizedOutput: output, outputHash } });
      return { output, receipt: { receiptHash: `no-provider-${calls}` } };
    } };
  },
};
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: path.resolve(root, "../.."), dataDirectory,
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  deliberationFactory });
await assert.rejects(product.preparePregamePlanForRoom({ sessionId,
  roomRuntime: { readRoom: async () => {
    throw new Error("generic handoff must not read a Room for an Agent-selected list");
  } }, roomId: "focused-never-created", seatToken: "focused-seat",
  scope: { gameId: "starcraft-tmg", roomId: "focused-never-created",
    matchBindingHash: "0".repeat(64), seatKey: "player1" },
}), /ROSTER_PLAN_ROOM_HANDOFF_AGENT_SELECTED_REQUIRES_PROMOTION/u);
await product.service.reviewFinalPlan(sessionId);
let session;
for (let attempt = 0; attempt < 100; attempt += 1) {
  session = product.service.readSession(sessionId);
  if (session.planReview?.status !== "running") break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
assert.equal(session.planReview?.status, "completed",
  session.planReview?.failure?.code);
assert.equal(session.planReview.review.shardCount, 7);
assert.equal(session.planReview.review.reviewedClaimCount, 51);
assert.equal(calls, 7);
assert.equal(session.trainingTruth, false);
process.stdout.write("WORKSPACE_SHARDED_REVIEW_V1_OK\n");
