#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  assertStarcraftTmgProviderBudgetPolicyV1,
  hashStarcraftTmgProviderAttemptValueV1,
} from "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import { isStarcraftTmgHistoricalResumeFindingV1 } from
  "../packages/online-agent-session/decision-recovery-policy-v1.mjs";

// Reproduces the live r3 failure: egress owns 300 s; its supervisor needs
// 15 s to settle the transport receipt without violating the budget contract.
function policy(timeoutMs) {
  const body = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 50_000_000,
    maxTurns: 1_024,
    maxInputUnitsPerTurn: 1_000_000,
    maxOutputUnitsPerTurn: 32_768,
    timeoutMs,
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
  };
  return { ...body,
    policyHash: hashStarcraftTmgProviderAttemptValueV1(body) };
}

assert.equal(assertStarcraftTmgProviderBudgetPolicyV1(policy(315_000))
  .timeoutMs, 315_000);
assert.throws(() => assertStarcraftTmgProviderBudgetPolicyV1(policy(315_001)),
  (error) => error?.code === "PROVIDER_ATTEMPT_INTEGER_INVALID");

const oldFinding = {
  code: "provider_attempt_integer_invalid",
  occurredAt: "2026-09-26T04:22:41.642Z",
};
const explicitResume = {
  allowExistingRetryableFinding: true,
  startedAt: "2026-09-26T04:36:00.000Z",
};
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(oldFinding,
  explicitResume), true);
assert.equal(isStarcraftTmgHistoricalResumeFindingV1(oldFinding,
  { ...explicitResume, allowExistingRetryableFinding: false }), false);
assert.equal(isStarcraftTmgHistoricalResumeFindingV1({ ...oldFinding,
  occurredAt: "2026-09-26T04:37:00.000Z" }, explicitResume), false);

process.stdout.write("provider_policy_grace_recovery_ok; providerCalls=0; roomMutations=0\n");
