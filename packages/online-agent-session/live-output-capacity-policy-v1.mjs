// Request capacity is an operational policy, not a replacement model/Skill.
// Keep the original paid records and frozen profile; journal each new limit.
export const STARCRAFT_TMG_LIVE_OUTPUT_CAPACITY_POLICY_VERSION =
  "starcraft_tmg_live_output_capacity_v1";
export const STARCRAFT_TMG_LIVE_REQUEST_OUTPUT_LIMIT = 32_768;

export function effectiveStarcraftTmgSemanticCorrectionsV1(choice) {
  const excluded = new Set((choice.outputCapacityRecoveries || [])
    .flatMap((entry) => entry.excludedSemanticAttemptKeys || []));
  return Math.max(0, Number(choice.semanticCorrectionRounds || 0) - excluded.size);
}

export function planStarcraftTmgOutputCapacityRecoveryV1(choice, options = {}) {
  const limit = Number(options.requestOutputLimit);
  if (options.retryApproved !== true || choice.status !== "provider_output_invalid"
    || !Number.isSafeInteger(limit) || limit < 1
    || (choice.outputCapacityRecoveries || []).some((entry) =>
      entry.requestOutputLimit >= limit)) return null;
  const failures = (choice.attemptKeys || []).flatMap((key) => {
    const attempt = choice.attempts?.[key];
    if (attempt?.status !== "completed") return [];
    const turn = attempt.safeOutput?.providerTurn;
    const declared = turn?.finishReason === "length"
      || turn?.issue === "output_truncated"
      || turn?.toolCalls?.some((call) => call.argumentIssue === "output_truncated");
    const oldLimit = Number(attempt.requestedMaxOutputUnits
      ?? options.baselineOutputUnits);
    const saturatedMalformed = turn?.kind === "tool_calls"
      && turn.toolCalls.length === 1
      && ["submit_planning", "submit_decision"].includes(turn.toolCalls[0].name)
      && turn.toolCalls[0].argumentIssue === "arguments_invalid_json"
      && Number(attempt.usage?.outputUnits) === oldLimit;
    if (!(oldLimit > 0 && limit > oldLimit) || !declared && !saturatedMalformed) return [];
    return [{ attemptKey: key, oldLimit, declared,
      // New typed truncations never enter the semantic counter. Legacy
      // saturated malformed calls did; exclude only those processed calls.
      wasCountedAsSemantic: !declared && saturatedMalformed
        && choice.processedAttemptKeys?.includes(key) }];
  });
  if (!failures.length || !failures.some((entry) =>
    entry.attemptKey === choice.attemptKeys.at(-1))) return null;
  return {
    policyVersion: STARCRAFT_TMG_LIVE_OUTPUT_CAPACITY_POLICY_VERSION,
    requestOutputLimit: limit,
    previousRequestLimits: [...new Set(failures.map((entry) => entry.oldLimit))],
    capacityAttemptKeys: failures.map((entry) => entry.attemptKey),
    excludedSemanticAttemptKeys: failures.filter((entry) => entry.wasCountedAsSemantic)
      .map((entry) => entry.attemptKey),
    evidenceKind: failures.every((entry) => entry.declared)
      ? "provider_declared_truncation" : "legacy_cap_saturation_inference",
    paidHistoryRewritten: false,
    automaticRetryAllowed: false,
  };
}
