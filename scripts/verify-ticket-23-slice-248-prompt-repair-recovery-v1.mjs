import assert from "node:assert/strict";
import {
  planStarcraftTmgPromptRepairRecoveryV1,
  applyStarcraftTmgPromptRepairRecoveryV1,
} from "../packages/online-agent-session/live-prompt-repair-recovery-v1.mjs";

const oldVersion = "starcraft_tmg_planner_action_spatial_intent_solver_v26_json_channels";
const newVersion = "starcraft_tmg_planner_action_spatial_intent_solver_v27_json_channels";
const lastKey = "paid-last-attempt";
const failed = {
  status: "provider_output_invalid",
  semanticCorrectionRounds: 3,
  stageCorrectionRounds: 3,
  attemptKeys: [lastKey],
  attempts: { [lastKey]: { status: "completed", promptPolicyVersion: oldVersion,
    safeOutput: { planning: { recommendedCandidateId: "unreachable-charge" } } } },
  processedAttemptKeys: [lastKey],
  providerContinuationMessages: [{ role: "user", content: "old correction" }],
  queryReceipts: [{ queryReceiptHash: "retained-exact-distance" }],
  warnings: ["SEMANTIC_CORRECTION_REQUIRED:distance_shortfall"],
  completedDecision: null,
};
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(failed, {
  retryApproved: false, promptPolicyVersion: newVersion,
  maxSemanticCorrectionRounds: 3,
}), null);
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(failed, {
  retryApproved: true, promptPolicyVersion: oldVersion,
  maxSemanticCorrectionRounds: 3,
}), null);
const plan = planStarcraftTmgPromptRepairRecoveryV1(failed, {
  retryApproved: true, promptPolicyVersion: newVersion,
  maxSemanticCorrectionRounds: 3,
});
assert.ok(plan);
const recovered = structuredClone(failed);
applyStarcraftTmgPromptRepairRecoveryV1(recovered, plan, "2026-09-27T00:00:00.000Z");
assert.equal(recovered.semanticCorrectionRounds, 0);
assert.equal(recovered.status, "generating");
assert.equal(recovered.providerContinuationMessages.length, 0);
assert.deepEqual(recovered.queryReceipts, failed.queryReceipts);
assert.deepEqual(recovered.attempts, failed.attempts);
assert.equal(recovered.promptRepairHistory[0].priorSemanticCorrectionRounds, 3);
assert.equal(recovered.promptRepairHistory[0].previousPromptPolicyVersion, oldVersion);
assert.equal(recovered.promptRepairHistory[0].nextPromptPolicyVersion, newVersion);
assert.equal(recovered.activeWarningStartIndex, failed.warnings.length);
assert.equal(planStarcraftTmgPromptRepairRecoveryV1(recovered, {
  retryApproved: true, promptPolicyVersion: newVersion,
  maxSemanticCorrectionRounds: 3,
}), null);
console.log("PROMPT_REPAIR_RECOVERY_OK");
