#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import * as capacity from "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";
import { createStarcraftTmgProviderGatewaySupervisorV1,
  createStarcraftTmgProviderGatewayUsageReceiptV1 } from
  "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";
import { assertStarcraftTmgProviderBudgetPolicyV1,
  prepareStarcraftTmgProviderAttemptReservationV1,
  prepareStarcraftTmgProviderAttemptSettlementV1 } from
  "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";

const capture = JSON.parse(await readFile(process.argv[2], "utf8"));
const actual = capture.failedAttempts[0];
assert.equal(actual.promptByteLength, 998853);
assert.equal(actual.inputReservationUnits, 1002949);
assert.equal(actual.status, "provider_failed_not_sent");
const digest = hash("isolated-r24-capacity-reproduction");
const instant = "2026-10-08T17:00:00.000Z";
const inputLimit = capacity.STARCRAFT_TMG_PROVIDER_INPUT_RESERVATION_LIMIT_UNITS
  ?? 1_000_000;
const session = { sessionId: "isolated-r24-session", lifecycleState: "active",
  binding: { sessionBindingHash: digest, roomId: "isolated-r24-room",
    mode: "opponent", character: { id: "isolated-character" } },
  connection: { epoch: 1 } };
let localGatewayCalls = 0;
const supervisor = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: { async readSession() { return { ok: true, session }; } },
  budgetPolicy: { maxTotalUnits: 50_000_000, maxTurns: 1024,
    maxInputUnitsPerTurn: inputLimit, maxOutputUnitsPerTurn: 32768,
    timeoutMs: 300000 }, now: () => instant,
  providerGateway: { async complete(request) {
    localGatewayCalls += 1;
    return { output: { channel: "explain", content: "isolated fixture" },
      usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
        reservation: request.budgetReservation, status: "completed",
        inputUnits: actual.inputReservationUnits, outputUnits: 1,
        providerRequestIdHash: digest, finishedAt: instant }) };
  } },
});
const body = { schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
  intent: "take_turn", requestPayloadHash: digest,
  inputUnits: actual.inputReservationUnits, maxOutputUnits: actual.maxOutputUnits };
const ref = { id: "isolated-ref", version: "1", hash: digest };
const result = await supervisor.sendTurn({ sessionId: session.sessionId,
  roomId: session.binding.roomId, expectedConnectionEpoch: 1,
  providerProfileRef: ref, promptAssemblyRef: ref, responseContract: ref,
  boundedRequest: { ...body, requestHash: hash(body) } });
console.log(JSON.stringify({ sourceRevision: 24, promptBytes: actual.promptByteLength,
  reservedInputUnits: actual.inputReservationUnits, localGatewayCalls,
  ok: result.ok, reason: result.reason || null, realProviderCalls: 0,
  originalRoomWrites: 0 }));
assert.equal(result.ok, true, "R24_VALID_PROMPT_REJECTED_BEFORE_EGRESS");
assert.equal(localGatewayCalls, 1);
assert.equal(result.usageReceipt.inputUnits, actual.inputReservationUnits);

const policy = result.state.budget.policy;
assert.deepEqual(assertStarcraftTmgProviderBudgetPolicyV1(policy), policy);
const reservation = prepareStarcraftTmgProviderAttemptReservationV1({
  budgetId: "isolated-budget", principalScopeHash: digest,
  idempotencyKeyHash: digest, expectedBudgetRevision: 0,
  consentReceiptHash: digest, providerProfileHash: digest,
  egressPolicyHash: digest, promptAssemblyHash: digest,
  responseContractHash: digest, requestHash: digest, intent: "take_turn",
  inputUnits: actual.inputReservationUnits, maxOutputUnits: 32768,
  reservedAt: instant });
const settlement = prepareStarcraftTmgProviderAttemptSettlementV1({
  attemptId: reservation.attemptId, expectedAttemptRevision: 1,
  terminalStatus: "completed", usageKnown: true,
  inputUnits: actual.inputReservationUnits, outputUnits: 1, settledAt: instant,
  safeProviderReceiptHash: digest });
assert.equal(reservation.inputUnits, actual.inputReservationUnits);
assert.equal(settlement.inputUnits, actual.inputReservationUnits);
const legacyBody = { ...policy, maxInputUnitsPerTurn: 1_000_000 };
delete legacyBody.policyHash;
const legacy = { ...legacyBody, policyHash: hash(legacyBody) };
assert.deepEqual(assertStarcraftTmgProviderBudgetPolicyV1(legacy), legacy);
console.log(JSON.stringify({ status: "passed", exactReservationPreserved: true,
  supervisorAndDurableLedgerAligned: true, oldPolicyHashUnchanged: true,
  realProviderCalls: 0, originalRoomWrites: 0, trainingTruth: false }));
