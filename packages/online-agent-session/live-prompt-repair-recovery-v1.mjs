// A changed prompt contract may repair an exhausted choice only after an
// explicit retry. The old paid attempts and failure history remain durable.
export function planStarcraftTmgPromptRepairRecoveryV1(choice, options = {}) {
  const lastAttemptKey = choice?.attemptKeys?.at(-1);
  const lastAttempt = choice?.attempts?.[lastAttemptKey];
  const turn = lastAttempt?.safeOutput?.providerTurn;
  const truncated = lastAttempt?.status === "completed"
    && (turn?.issue === "output_truncated" || turn?.finishReason === "length");
  // The runtime also stops on two identical semantic failures before the total
  // round limit. A repaired contract may resume that stop, once, with explicit
  // approval; it must not silently reset the already-used correction budget.
  const repeatedSemanticFailure = Number(choice?.repeatedSemanticFailureCount || 0) >= 2;
  if (options.retryApproved !== true
    || choice?.status !== "provider_output_invalid"
    || choice.completedDecision
    || !truncated && !repeatedSemanticFailure && Number(options.effectiveSemanticCorrectionRounds
      ?? choice.semanticCorrectionRounds ?? 0)
      < Number(options.maxSemanticCorrectionRounds || 3)
    || (choice.promptRepairHistory || []).length > 0) return null;
  const previousPromptPolicyVersion = lastAttempt?.promptPolicyVersion;
  const nextPromptPolicyVersion = String(options.promptPolicyVersion || "");
  if (!lastAttemptKey || lastAttempt?.status !== "completed"
    || !previousPromptPolicyVersion || !nextPromptPolicyVersion
    || previousPromptPolicyVersion === nextPromptPolicyVersion) return null;
  return Object.freeze({
    previousPromptPolicyVersion,
    nextPromptPolicyVersion,
    lastAttemptKey,
    ...(truncated ? { reason: "typed_truncation_after_output_contract_change" } : {}),
    ...(!truncated && repeatedSemanticFailure
      ? { reason: "repeated_semantic_failure_after_contract_change" } : {}),
    priorSemanticCorrectionRounds: Number(choice.semanticCorrectionRounds || 0),
    previousContinuationMessageCount:
      (choice.providerContinuationMessages || []).length,
    previousWarningCount: (choice.warnings || []).length,
  });
}

export function applyStarcraftTmgPromptRepairRecoveryV1(choice, plan, recordedAt) {
  if (!plan || !choice || choice.status !== "provider_output_invalid") {
    throw new Error("Prompt repair requires an exhausted invalid choice");
  }
  choice.promptRepairHistory ||= [];
  choice.promptRepairHistory.push({ ...plan, recordedAt,
    paidHistoryRewritten: false, fullQueryReceiptsRetained: true });
  choice.status = "generating";
  // Capacity repair or early repeated-failure recovery does not grant extra
  // semantic/query rounds. Paid history and remaining budget survive restart.
  if (!["typed_truncation_after_output_contract_change",
    "repeated_semantic_failure_after_contract_change",
    "missing_planner_selection_after_contract_change"].includes(plan.reason)) {
    choice.semanticCorrectionRounds = 0;
    choice.stageCorrectionRounds = 0;
    choice.stageQueryRounds = 0;
  }
  choice.terminalFormatRepairPending = false;
  choice.lastSemanticFailureSignature = null;
  choice.repeatedSemanticFailureCount = 0;
  choice.proposalValidationRounds = 0;
  choice.providerContinuationMessages = [];
  choice.activeWarningStartIndex = (choice.warnings || []).length;
  choice.retryCycle = Number(choice.retryCycle || 0) + 1;
  choice.warnings.push(`EXPLICIT_PROMPT_REPAIR_CYCLE:${choice.retryCycle}:${
    plan.previousPromptPolicyVersion}->${plan.nextPromptPolicyVersion}`);
}
