import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_REVIEW_DISPATCH_RECOVERY_V1 =
  "starcraft_tmg_roster_review_dispatch_recovery_v1";

const MAX_POSSIBLY_SENT_ATTEMPTS = 3;

function blocked(reason) {
  return Object.freeze({ kind: "blocked", reason,
    providerCallAllowed: false, trainingTruth: false });
}

function ambiguousFailure(value, planHash, roundIndex) {
  return value?.code === "ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP"
    && value.planHash === planHash
    && value.roundIndex === roundIndex
    && value.providerTransport?.requestMayHaveBeenSent === true
    && value.providerTransport?.requestDefinitelyNotSent !== true
    && typeof value.providerTransport.receiptHash === "string"
    && value.usage == null;
}

// The Provider has no documented fetch-by-response-id recovery on this
// stateless lane. A lost response is an unknown-cost attempt, not a free
// failure. This decision only licenses one explicit new physical dispatch;
// the caller persists the returned intent before touching the Provider.
export function decideRosterReviewDispatchRecoveryV1({ failed,
  priorIntents = [], planHash, roundIndex, contextHash,
  explicitResume = false } = {}) {
  if (!ambiguousFailure(failed, planHash, roundIndex)
    || typeof contextHash !== "string" || !contextHash
    || !Array.isArray(priorIntents)
    || priorIntents.length >= MAX_POSSIBLY_SENT_ATTEMPTS - 1) {
    return blocked("REVIEW_DISPATCH_SOURCE_OR_CAP_INVALID");
  }
  let priorReceiptHash = null;
  for (const [index, intent] of priorIntents.entries()) {
    if (intent?.schema !== (index === 0
      ? "starcraft_tmg_agent_selected_teach_review_recovery_intent_v1"
      : "starcraft_tmg_agent_selected_teach_review_recovery_intent_v2")
      || intent.planHash !== planHash
      || intent.roundIndex !== roundIndex
      || intent.contextHash !== contextHash
      || intent.explicitOperatorResume !== true
      || !ambiguousFailure(intent.priorFailure, planHash, roundIndex)
      || (index > 0 && (intent.attemptNumber !== index + 2
        || intent.previousIntentHash
          !== hashStarcraftTmgContract(priorIntents[index - 1])))) {
      return blocked("REVIEW_DISPATCH_RECOVERY_LINEAGE_INVALID");
    }
    const receiptHash = intent.priorFailure.providerTransport.receiptHash;
    if (receiptHash === priorReceiptHash) {
      return blocked("REVIEW_DISPATCH_RECOVERY_FAILURE_REUSED");
    }
    priorReceiptHash = receiptHash;
  }
  if (failed.providerTransport.receiptHash === priorReceiptHash) {
    return blocked("REVIEW_DISPATCH_RECOVERY_NO_NEW_FAILURE");
  }
  if (!explicitResume) {
    return blocked("REVIEW_DISPATCH_EXPLICIT_RESUME_REQUIRED");
  }
  const attemptNumber = priorIntents.length + 2;
  const intent = {
    schema: priorIntents.length === 0
      ? "starcraft_tmg_agent_selected_teach_review_recovery_intent_v1"
      : "starcraft_tmg_agent_selected_teach_review_recovery_intent_v2",
    planHash, roundIndex, contextHash,
    priorFailure: structuredClone(failed),
    previousIntentHash: priorIntents.length
      ? hashStarcraftTmgContract(priorIntents.at(-1)) : null,
    explicitOperatorResume: true,
    attemptNumber,
    unresolvedPossibleCalls: attemptNumber - 1,
    trainingTruth: false,
  };
  return Object.freeze({ kind: "retry_allowed", attemptNumber,
    nextIntentVersion: priorIntents.length + 1,
    unresolvedPossibleCalls: attemptNumber - 1,
    intent: Object.freeze(intent), providerCallAllowed: true,
    trainingTruth: false });
}
