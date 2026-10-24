#!/usr/bin/env node

// Concrete retained incident: shard 5 failed twice with may-have-been-sent
// transport receipts. One more explicit, separately accounted recovery may be
// allowed; a fourth paid dispatch must be blocked before the Provider call.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { decideRosterReviewDispatchRecoveryV1 } from
  "../packages/roster-planning-workspace/review-dispatch-recovery-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "build/ticket-27-slice-272-iterative-live-v1");
const stem = "agent-selected-teach-5c6f47fe6a92c230-final-review-shard-5";
const failed = JSON.parse(await readFile(path.join(dir,
  `${stem}-failure-v1.json`), "utf8"));
const firstIntent = JSON.parse(await readFile(path.join(dir,
  `${stem}-recovery-intent-v1.json`), "utf8"));
const input = { failed, priorIntents: [firstIntent],
  planHash: failed.planHash, roundIndex: 5,
  contextHash: firstIntent.contextHash };
const second = decideRosterReviewDispatchRecoveryV1({
  ...input, failed: firstIntent.priorFailure,
  priorIntents: [], explicitResume: true });
assert.equal(second.kind, "retry_allowed");
assert.equal(second.nextIntentVersion, 1);
assert.equal(second.intent.schema,
  "starcraft_tmg_agent_selected_teach_review_recovery_intent_v1");
assert.equal(decideRosterReviewDispatchRecoveryV1({
  ...input, explicitResume: false }).kind, "blocked");
const third = decideRosterReviewDispatchRecoveryV1({
  ...input, explicitResume: true });
assert.equal(third.kind, "retry_allowed");
assert.equal(third.attemptNumber, 3);
assert.equal(third.unresolvedPossibleCalls, 2);
assert.equal(third.nextIntentVersion, 2);
assert.equal(decideRosterReviewDispatchRecoveryV1({
  ...input, priorIntents: [firstIntent, third.intent],
  explicitResume: true }).kind, "blocked");
assert.equal(decideRosterReviewDispatchRecoveryV1({
  ...input, planHash: "0".repeat(64),
  explicitResume: true }).kind, "blocked");
process.stdout.write("Review dispatch recovery cap and lineage: passed\n");
