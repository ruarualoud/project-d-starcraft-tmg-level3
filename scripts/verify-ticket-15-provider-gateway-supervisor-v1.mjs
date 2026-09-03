#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1 } from
  "../content/agent/ticket-15-provider-gateway-supervisor-contract-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import {
  createStarcraftTmgProviderGatewaySupervisorV1,
  createStarcraftTmgProviderGatewayUsageReceiptV1,
} from "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-15-slice-146-provider-gateway-supervisor-v1/report.json");
const packageBundle = createKerriganPrimalProductBundleV1();
const characterPackage = packageBundle.characterPackage;
const selectionHash = hashStarcraftTmgContract({
  characterId: characterPackage.characterId,
  persona: "queen-of-blades-primal",
  scope: "ticket-15-slice-146",
});

function verifyHash(value, hashField) {
  const { [hashField]: observed, ...unsigned } = value;
  assert.equal(hashStarcraftTmgContract(unsigned), observed);
}

function roomBinding() {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: "0.112.0-official-faq-v1-current",
    dataVersion: "official-onetime-snapshot-v1",
    matchBindingHash: "a".repeat(64),
    sourceSnapshotHash: "b".repeat(64),
    dataSnapshotHash: "c".repeat(64),
    rulesArtifactHash: "d".repeat(64),
    executorArtifactHash: "e".repeat(64),
    geometryArtifactHash: "f".repeat(64),
    actionSchemaHash: "1".repeat(64),
  };
}

function principalBinding(overrides = {}) {
  return createStarcraftTmgOnlinePrincipalBindingV1({
    roomId: "slice-146-room",
    principalScopeHash: "2".repeat(64),
    seatKey: "player1",
    principalType: "human",
    principalRoleMode: "player",
    bindingRevision: 1,
    allowedAgentModes: ["tutor", "companion"],
    characterId: characterPackage.characterId,
    characterPackageHash: characterPackage.integrity.hash,
    characterSelectionHash: selectionHash,
    roomBinding: roomBinding(),
    ...overrides,
  });
}

const principalBindings = new Map([
  ["principal-a", principalBinding()],
  ["principal-b", principalBinding({ principalScopeHash: "3".repeat(64) })],
]);
let lifecycleId = 0;
let lifecycleInstant = 0;
const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
  principalAuthority: {
    async resolve({ roomId, principalSessionRef }) {
      const binding = principalBindings.get(principalSessionRef);
      if (!binding || binding.roomId !== roomId) {
        return { ok: false, reason: "principal_not_authenticated" };
      }
      return { ok: true, binding };
    },
  },
  characterCatalog: {
    async resolve(input) {
      return input.characterId === characterPackage.characterId
        && input.characterPackageHash === characterPackage.integrity.hash
        ? { ok: true, characterPackage }
        : { ok: false, reason: "character_not_found" };
    },
  },
  createId() {
    lifecycleId += 1;
    return `slice-146-session-${String(lifecycleId).padStart(3, "0")}`;
  },
  now() {
    const value = new Date(Date.UTC(2026, 8, 4, 0, 0, lifecycleInstant));
    lifecycleInstant += 1;
    return value.toISOString();
  },
});

async function createSession(principalSessionRef = "principal-a", mode = "tutor") {
  const result = await lifecycle.createSession({
    roomId: "slice-146-room",
    mode,
    characterId: characterPackage.characterId,
  }, { principalSessionRef });
  assert.equal(result.ok, true);
  return result.session;
}

function createFakeScheduler() {
  let nextHandle = 0;
  const pending = new Map();
  return {
    schedule(handler, timeoutMs) {
      nextHandle += 1;
      pending.set(nextHandle, { handler, timeoutMs });
      return nextHandle;
    },
    cancel(handle) {
      pending.delete(handle);
    },
    triggerLatest() {
      const handle = [...pending.keys()].at(-1);
      assert(handle, "no scheduled timeout is pending");
      const task = pending.get(handle);
      pending.delete(handle);
      task.handler();
      return task.timeoutMs;
    },
    size() { return pending.size; },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail(message);
}

function sealedBoundedRequest(overrides = {}) {
  const body = {
    schemaVersion: "starcraft_tmg_bounded_provider_request_v1",
    intent: "chat",
    requestPayloadHash: hashStarcraftTmgContract({
      text: "Explain the current tactical position.",
      fixture: overrides.fixture || "default",
    }),
    inputUnits: 100,
    maxOutputUnits: 100,
    ...overrides,
  };
  delete body.fixture;
  return { ...body, requestHash: hashStarcraftTmgContract(body) };
}

const refs = Object.freeze({
  providerProfileRef: Object.freeze({
    id: packageBundle.providerProfile.providerProfileId,
    version: packageBundle.providerProfile.version,
    hash: packageBundle.providerProfile.integrity.hash,
  }),
  promptAssemblyRef: Object.freeze({
    id: "slice-146-prompt-assembly",
    version: "1.0.0",
    hash: "4".repeat(64),
  }),
  responseContract: Object.freeze({
    id: "slice-146-response-contract",
    version: "1.0.0",
    hash: "5".repeat(64),
  }),
});

function turnInput(session, request = sealedBoundedRequest()) {
  return {
    sessionId: session.sessionId,
    roomId: session.binding.roomId,
    expectedConnectionEpoch: session.connection.epoch,
    ...refs,
    boundedRequest: request,
  };
}

function context(principalSessionRef = "principal-a") {
  return { principalSessionRef };
}

function gatewayCompletion(gatewayInput, options = {}) {
  const output = options.output || {
    channels: { speech: { text: "Hold the center and preserve the flank." } },
  };
  const usageReceipt = options.usageReceipt
    || createStarcraftTmgProviderGatewayUsageReceiptV1({
      reservation: gatewayInput.budgetReservation,
      inputUnits: options.inputUnits ?? gatewayInput.boundedRequest.inputUnits,
      outputUnits: options.outputUnits ?? 40,
      providerRequestIdHash: hashStarcraftTmgContract({
        turnId: gatewayInput.budgetReservation.turnId,
        fixture: options.fixture || "success",
      }),
      finishedAt: "2026-09-04T00:20:00.000Z",
    });
  return { output, usageReceipt };
}

function createConfiguredHarness(options = {}) {
  const scheduler = options.scheduler || createFakeScheduler();
  const gatewayCalls = [];
  const controller = {
    handler: options.handler || (async (input) => gatewayCompletion(input)),
  };
  let turnIdSequence = 0;
  let supervisorInstant = 0;
  const supervisor = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: lifecycle,
    providerGateway: {
      async complete(input) {
        gatewayCalls.push(input);
        return controller.handler(input);
      },
    },
    gatewayEvidence: "injected_deterministic_gateway",
    budgetPolicy: options.budgetPolicy || {
      maxTotalUnits: 5_000,
      maxTurns: 20,
      maxInputUnitsPerTurn: 500,
      maxOutputUnitsPerTurn: 500,
      timeoutMs: 1_000,
    },
    scheduler,
    createId() {
      turnIdSequence += 1;
      return `${options.idPrefix || "slice-146-turn"}-${String(turnIdSequence).padStart(3, "0")}`;
    },
    now() {
      const value = new Date(Date.UTC(2026, 8, 4, 0, 10, supervisorInstant));
      supervisorInstant += 1;
      return value.toISOString();
    },
  });
  return { supervisor, scheduler, gatewayCalls, controller };
}

const acceptance = [];
async function accept(name, operation) {
  await operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

const noProviderSession = await createSession();
const noProvider = createStarcraftTmgProviderGatewaySupervisorV1({
  sessionLifecycle: lifecycle,
  budgetPolicy: {
    maxTotalUnits: 1_000,
    maxTurns: 4,
    maxInputUnitsPerTurn: 200,
    maxOutputUnitsPerTurn: 100,
    timeoutMs: 1_000,
  },
});

await accept("contract_and_metadata_define_a_credential_free_non_live_gateway", async () => {
  const contract = STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1;
  verifyHash(contract, "supervisorContractHash");
  assert.deepEqual(contract.providerGatewayPort.credentialInputs, []);
  assert.equal(contract.providerGatewayPort.liveProviderClaimAllowed, false);
  assert.equal(contract.supervision.concurrentTurnsPerSession, 1);
  assert.equal(contract.supervision.automaticRetryAllowed, false);
  assert.equal(noProvider.metadata().gatewayState, "provider_not_configured");
});

await accept("missing_gateway_is_an_honest_state_and_reserves_no_budget", async () => {
  const before = await noProvider.readState(
    turnInput(noProviderSession), context());
  assert.equal(before.ok, false);
  assert.equal(before.reason, "forbidden_supervisor_field");
  const read = await noProvider.readState({
    sessionId: noProviderSession.sessionId,
    roomId: noProviderSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(read.ok, true);
  assert.equal(read.state.provider.state, "provider_not_configured");
  const sent = await noProvider.sendTurn(turnInput(noProviderSession), context());
  assert.equal(sent.reason, "provider_not_configured");
  assert.equal(sent.state.budget.turnCount, 0);
  assert.equal(sent.state.budget.consumedUnits, 0);
  assert.equal(sent.state.budget.activeReservationUnits, 0);
});

await accept("credential_shaped_nested_fields_are_rejected_even_without_a_gateway", async () => {
  const rejected = await noProvider.sendTurn({
    ...turnInput(noProviderSession),
    providerProfileRef: { ...refs.providerProfileRef, apiKey: "must-not-enter" },
  }, context());
  assert.equal(rejected.reason, "forbidden_supervisor_field");
  assert.deepEqual(rejected.forbiddenFields, ["apiKey"]);
});

const successSession = await createSession();
const configured = createConfiguredHarness();
let successfulTurn;

await accept("successful_turn_dispatches_one_exact_credential_free_gateway_call", async () => {
  const result = await configured.supervisor.sendTurn(turnInput(successSession), context());
  assert.equal(result.ok, true);
  assert.equal(configured.gatewayCalls.length, 1);
  const call = configured.gatewayCalls[0];
  assert.deepEqual(Object.keys(call).sort(), [
    "boundedRequest",
    "budgetReservation",
    "promptAssemblyRef",
    "providerProfileRef",
    "responseContract",
    "schemaVersion",
    "signal",
  ]);
  assert.equal(call.signal instanceof AbortSignal, true);
  assert.equal(call.signal.aborted, false);
  assert(!JSON.stringify(call).includes("principal-a"));
  assert(!JSON.stringify(call).includes("apiKey"));
  assert(!JSON.stringify(call).includes("seatToken"));
  successfulTurn = result;
});

await accept("successful_usage_settles_actual_units_and_releases_the_reservation", async () => {
  assert.equal(successfulTurn.turn.state, "completed");
  assert.equal(successfulTurn.turn.chargedUnits, 140);
  assert.equal(successfulTurn.state.budget.consumedUnits, 140);
  assert.equal(successfulTurn.state.budget.activeReservationUnits, 0);
  assert.equal(successfulTurn.state.budget.remainingUnits, 4_860);
  assert.equal(successfulTurn.state.budget.completedTurns, 1);
  verifyHash(successfulTurn.turn.reservation, "reservationHash");
  verifyHash(successfulTurn.usageReceipt, "receiptHash");
  verifyHash(successfulTurn.turn, "turnHash");
  verifyHash(successfulTurn.receipt, "receiptHash");
  verifyHash(successfulTurn.state.budget, "budgetHash");
  verifyHash(successfulTurn.state, "stateHash");
});

await accept("only_an_accepted_current_completion_exposes_provider_output", async () => {
  assert.equal(successfulTurn.output.channels.speech.text,
    "Hold the center and preserve the flank.");
  const read = await configured.supervisor.readState({
    sessionId: successSession.sessionId,
    roomId: successSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(read.ok, true);
  assert.equal(read.state.currentTurn.outputHash,
    hashStarcraftTmgContract(successfulTurn.output));
  assert.equal("output" in read.state.currentTurn, false);
});

const cancelSession = await createSession();
const cancelHarness = createConfiguredHarness({ idPrefix: "cancel-turn" });
const cancelDeferred = deferred();
cancelHarness.controller.handler = async () => cancelDeferred.promise;
let cancelPending;
let cancelLoading;

await accept("one_in_flight_turn_is_visible_and_a_second_dispatch_is_rejected", async () => {
  cancelPending = cancelHarness.supervisor.sendTurn(turnInput(cancelSession), context());
  await waitFor(() => cancelHarness.gatewayCalls.length === 1,
    "deferred Provider Gateway call did not begin");
  cancelLoading = await cancelHarness.supervisor.readState({
    sessionId: cancelSession.sessionId,
    roomId: cancelSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(cancelLoading.state.currentTurn.state, "waiting_provider");
  assert.equal(cancelLoading.state.budget.activeReservationUnits, 200);
  const duplicate = await cancelHarness.supervisor.sendTurn(
    turnInput(cancelSession, sealedBoundedRequest({ fixture: "duplicate" })),
    context());
  assert.equal(duplicate.reason, "turn_already_in_flight");
  assert.equal(cancelHarness.gatewayCalls.length, 1);
});

const parallelSessionA = await createSession();
const parallelSessionB = await createSession();
const parallelHarness = createConfiguredHarness({ idPrefix: "parallel-turn" });
const parallelDeferredA = deferred();
const parallelDeferredB = deferred();
parallelHarness.controller.handler = async () => (
  parallelHarness.gatewayCalls.length === 1
    ? parallelDeferredA.promise
    : parallelDeferredB.promise
);

await accept("single_flight_is_per_session_not_a_global_service_lock", async () => {
  const pendingA = parallelHarness.supervisor.sendTurn(
    turnInput(parallelSessionA), context());
  const pendingB = parallelHarness.supervisor.sendTurn(
    turnInput(parallelSessionB, sealedBoundedRequest({ fixture: "parallel-b" })),
    context());
  await waitFor(() => parallelHarness.gatewayCalls.length === 2,
    "two session-scoped Provider calls did not begin in parallel");
  const stateA = await parallelHarness.supervisor.readState({
    sessionId: parallelSessionA.sessionId,
    roomId: parallelSessionA.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  const stateB = await parallelHarness.supervisor.readState({
    sessionId: parallelSessionB.sessionId,
    roomId: parallelSessionB.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(stateA.state.currentTurn.state, "waiting_provider");
  assert.equal(stateB.state.currentTurn.state, "waiting_provider");
  assert.notEqual(stateA.state.currentTurn.turnId, stateB.state.currentTurn.turnId);
  const cancelA = await parallelHarness.supervisor.cancelTurn({
    sessionId: parallelSessionA.sessionId,
    roomId: parallelSessionA.binding.roomId,
    expectedConnectionEpoch: 1,
    turnId: stateA.state.currentTurn.turnId,
  }, context());
  const cancelB = await parallelHarness.supervisor.cancelTurn({
    sessionId: parallelSessionB.sessionId,
    roomId: parallelSessionB.binding.roomId,
    expectedConnectionEpoch: 1,
    turnId: stateB.state.currentTurn.turnId,
  }, context());
  assert.equal(cancelA.reason, "cancelled");
  assert.equal(cancelB.reason, "cancelled");
  assert.equal((await pendingA).reason, "cancelled");
  assert.equal((await pendingB).reason, "cancelled");
});

await accept("another_principal_cannot_cancel_an_in_flight_turn", async () => {
  const denied = await cancelHarness.supervisor.cancelTurn({
    sessionId: cancelSession.sessionId,
    roomId: cancelSession.binding.roomId,
    expectedConnectionEpoch: 1,
    turnId: cancelLoading.state.currentTurn.turnId,
  }, context("principal-b"));
  assert.equal(denied.reason, "principal_scope_mismatch");
  assert.equal(cancelHarness.gatewayCalls[0].signal.aborted, false);
});

await accept("owner_cancel_aborts_and_conservatively_consumes_unknown_reservation", async () => {
  const cancelled = await cancelHarness.supervisor.cancelTurn({
    sessionId: cancelSession.sessionId,
    roomId: cancelSession.binding.roomId,
    expectedConnectionEpoch: 1,
    turnId: cancelLoading.state.currentTurn.turnId,
  }, context());
  assert.equal(cancelled.reason, "cancelled");
  assert.equal(cancelled.idempotentReplay, false);
  assert.equal(cancelHarness.gatewayCalls[0].signal.aborted, true);
  assert.equal(cancelled.turn.chargedUnits, 200);
  assert.equal(cancelled.state.budget.cancelledTurns, 1);
  assert.equal(cancelled.state.budget.activeReservationUnits, 0);
  const pendingResult = await cancelPending;
  assert.equal(pendingResult.reason, "cancelled");
});

await accept("late_completion_is_hash_quarantined_and_cannot_reenter_terminal_state", async () => {
  cancelDeferred.resolve(gatewayCompletion(cancelHarness.gatewayCalls[0], {
    fixture: "late-after-cancel",
  }));
  await waitFor(async () => true, "microtask checkpoint");
  await Promise.resolve();
  await Promise.resolve();
  const read = await cancelHarness.supervisor.readState({
    sessionId: cancelSession.sessionId,
    roomId: cancelSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(read.state.currentTurn.state, "cancelled");
  assert.equal(read.state.currentTurn.lateResultCount, 1);
  assert.equal(read.state.currentTurn.lateResultStatus,
    "quarantined_after_terminal_state");
  assert.match(read.state.currentTurn.lateOutputHash, /^[a-f0-9]{64}$/u);
  assert.equal(read.state.budget.consumedUnits, 200);
  const replay = await cancelHarness.supervisor.cancelTurn({
    sessionId: cancelSession.sessionId,
    roomId: cancelSession.binding.roomId,
    expectedConnectionEpoch: 1,
    turnId: read.state.currentTurn.turnId,
  }, context());
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotentReplay, true);
});

const timeoutSession = await createSession();
const timeoutHarness = createConfiguredHarness({ idPrefix: "timeout-turn" });
const timeoutDeferred = deferred();
timeoutHarness.controller.handler = async () => timeoutDeferred.promise;

await accept("server_timeout_aborts_without_waiting_for_an_ignoring_gateway", async () => {
  const pending = timeoutHarness.supervisor.sendTurn(turnInput(timeoutSession), context());
  await waitFor(() => timeoutHarness.gatewayCalls.length === 1,
    "timeout Provider Gateway call did not begin");
  assert.equal(timeoutHarness.scheduler.triggerLatest(), 1_000);
  const timedOut = await pending;
  assert.equal(timedOut.reason, "timed_out");
  assert.equal(timedOut.turn.state, "timed_out");
  assert.equal(timedOut.turn.chargedUnits, 200);
  assert.equal(timedOut.state.budget.timedOutTurns, 1);
  assert.equal(timeoutHarness.gatewayCalls[0].signal.aborted, true);
  timeoutDeferred.reject(Object.assign(new Error("ignored abort then failed"), {
    code: "LATE_PROVIDER_FAILURE",
  }));
  await Promise.resolve();
  await Promise.resolve();
});

const failureSession = await createSession();
const failureHarness = createConfiguredHarness({ idPrefix: "failure-turn" });

await accept("gateway_failure_is_redacted_never_retried_and_charges_unknown_usage_reservation", async () => {
  failureHarness.controller.handler = async () => {
    throw Object.assign(new Error("secret upstream diagnostic must not escape"), {
      code: "UPSTREAM_UNAVAILABLE",
    });
  };
  const beforeCalls = failureHarness.gatewayCalls.length;
  const failed = await failureHarness.supervisor.sendTurn(
    turnInput(failureSession), context());
  assert.equal(failed.reason, "upstream_unavailable");
  assert.equal(failed.turn.failure.messageExposed, false);
  assert.equal(failed.turn.automaticallyRetried, false);
  assert.equal(failureHarness.gatewayCalls.length - beforeCalls, 1);
  assert.equal(failed.turn.chargedUnits, 200);
  assert(!JSON.stringify(failed).includes("secret upstream diagnostic"));
});

const unsafeSession = await createSession();
const unsafeHarness = createConfiguredHarness({ idPrefix: "unsafe-turn" });

await accept("credential_shaped_gateway_output_is_rejected_and_never_exposed", async () => {
  unsafeHarness.controller.handler = async (input) => gatewayCompletion(input, {
    output: { channels: {}, apiKey: "leaked-provider-key" },
  });
  const failed = await unsafeHarness.supervisor.sendTurn(
    turnInput(unsafeSession), context());
  assert.equal(failed.reason, "unsafe_provider_result");
  assert.equal(failed.turn.outputHash, null);
  assert.equal(failed.turn.chargedUnits, 200);
  assert(!JSON.stringify(failed).includes("leaked-provider-key"));
});

const receiptSession = await createSession();
const receiptHarness = createConfiguredHarness({ idPrefix: "receipt-turn" });

await accept("unbound_or_tampered_usage_receipts_fail_closed", async () => {
  receiptHarness.controller.handler = async (input) => {
    const valid = gatewayCompletion(input);
    return {
      ...valid,
      usageReceipt: { ...valid.usageReceipt, reservationId: "wrong-reservation" },
    };
  };
  const failed = await receiptHarness.supervisor.sendTurn(
    turnInput(receiptSession), context());
  assert.equal(failed.reason, "unsafe_provider_result");
  assert.equal(failed.state.budget.failedTurns, 1);
  assert.equal(failed.turn.chargedUnits, 200);
});

const limitSession = await createSession();
const limitHarness = createConfiguredHarness({
  idPrefix: "limit-turn",
  budgetPolicy: {
    maxTotalUnits: 300,
    maxTurns: 5,
    maxInputUnitsPerTurn: 200,
    maxOutputUnitsPerTurn: 100,
    timeoutMs: 1_000,
  },
});

await accept("per_turn_input_and_output_limits_reject_before_gateway_dispatch", async () => {
  const inputDenied = await limitHarness.supervisor.sendTurn(
    turnInput(limitSession, sealedBoundedRequest({ inputUnits: 201 })), context());
  assert.equal(inputDenied.reason, "provider_input_budget_exceeded");
  const outputDenied = await limitHarness.supervisor.sendTurn(
    turnInput(limitSession, sealedBoundedRequest({ maxOutputUnits: 101 })), context());
  assert.equal(outputDenied.reason, "provider_output_budget_exceeded");
  assert.equal(limitHarness.gatewayCalls.length, 0);
  assert.equal(inputDenied.state.budget.turnCount, 0);
});

await accept("session_total_limit_accounts_for_actual_usage_plus_next_reservation", async () => {
  limitHarness.controller.handler = async (input) => gatewayCompletion(input, {
    inputUnits: 100,
    outputUnits: 10,
  });
  const first = await limitHarness.supervisor.sendTurn(
    turnInput(limitSession), context());
  assert.equal(first.ok, true);
  assert.equal(first.state.budget.consumedUnits, 110);
  const denied = await limitHarness.supervisor.sendTurn(
    turnInput(limitSession, sealedBoundedRequest({ fixture: "second" })), context());
  assert.equal(denied.reason, "provider_total_budget_exceeded");
  assert.equal(limitHarness.gatewayCalls.length, 1);
});

const turnLimitSession = await createSession();
const turnLimitHarness = createConfiguredHarness({
  idPrefix: "turn-count-limit",
  budgetPolicy: {
    maxTotalUnits: 1_000,
    maxTurns: 1,
    maxInputUnitsPerTurn: 200,
    maxOutputUnitsPerTurn: 100,
    timeoutMs: 1_000,
  },
});

await accept("session_turn_count_limit_rejects_before_a_second_dispatch", async () => {
  const first = await turnLimitHarness.supervisor.sendTurn(
    turnInput(turnLimitSession), context());
  assert.equal(first.ok, true);
  const second = await turnLimitHarness.supervisor.sendTurn(
    turnInput(turnLimitSession, sealedBoundedRequest({ fixture: "turn-two" })),
    context());
  assert.equal(second.reason, "provider_turn_budget_exhausted");
  assert.equal(turnLimitHarness.gatewayCalls.length, 1);
});

await accept("budget_ledgers_are_isolated_per_online_session", async () => {
  const otherSession = await createSession();
  const firstState = await configured.supervisor.readState({
    sessionId: successSession.sessionId,
    roomId: successSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  const otherState = await configured.supervisor.readState({
    sessionId: otherSession.sessionId,
    roomId: otherSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(firstState.state.budget.consumedUnits, 140);
  assert.equal(otherState.state.budget.consumedUnits, 0);
  assert.notEqual(firstState.state.budget.budgetHash,
    otherState.state.budget.budgetHash);
});

const fenceSession = await createSession();
const fenceHarness = createConfiguredHarness({ idPrefix: "fence-turn" });
const fenceDeferred = deferred();
fenceHarness.controller.handler = async () => fenceDeferred.promise;

await accept("reconnect_during_provider_wait_fences_and_quarantines_the_old_completion", async () => {
  const pending = fenceHarness.supervisor.sendTurn(turnInput(fenceSession), context());
  await waitFor(() => fenceHarness.gatewayCalls.length === 1,
    "fenced Provider Gateway call did not begin");
  const reconnected = await lifecycle.reconnectSession({
    sessionId: fenceSession.sessionId,
    roomId: fenceSession.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(reconnected.ok, true);
  assert.equal(reconnected.session.connection.epoch, 2);
  fenceDeferred.resolve(gatewayCompletion(fenceHarness.gatewayCalls[0], {
    fixture: "old-connection",
  }));
  const fenced = await pending;
  assert.equal(fenced.reason, "session_fence_changed");
  assert.equal(fenced.turn.state, "failed");
  assert.match(fenced.turn.outputHash, /^[a-f0-9]{64}$/u);
  assert.equal("output" in fenced, false);
  assert.equal(fenced.turn.chargedUnits, 140);
});

await accept("post_provider_authority_failure_settles_and_fails_closed", async () => {
  const session = await createSession();
  let lifecycleReads = 0;
  const gatewayCalls = [];
  const supervisor = createStarcraftTmgProviderGatewaySupervisorV1({
    sessionLifecycle: {
      async readSession(input, serverContext) {
        lifecycleReads += 1;
        if (lifecycleReads > 1) throw new Error("authority adapter unavailable");
        return lifecycle.readSession(input, serverContext);
      },
    },
    providerGateway: {
      async complete(input) {
        gatewayCalls.push(input);
        return gatewayCompletion(input, { fixture: "authority-failed-after-provider" });
      },
    },
    gatewayEvidence: "injected_deterministic_gateway",
    budgetPolicy: {
      maxTotalUnits: 1_000,
      maxTurns: 2,
      maxInputUnitsPerTurn: 200,
      maxOutputUnitsPerTurn: 100,
      timeoutMs: 1_000,
    },
    scheduler: createFakeScheduler(),
    createId: () => "post-provider-authority-failure-turn",
    now: () => "2026-09-04T00:25:00.000Z",
  });
  const failed = await supervisor.sendTurn(turnInput(session), context());
  assert.equal(failed.reason, "session_fence_changed");
  assert.equal(failed.turn.state, "failed");
  assert.equal(failed.turn.chargedUnits, 140);
  assert.equal(failed.state.budget.activeReservationUnits, 0);
  assert.equal(gatewayCalls.length, 1);
  assert.equal("output" in failed, false);
});

await accept("ended_sessions_cannot_dispatch_even_when_a_gateway_is_configured", async () => {
  const session = await createSession();
  const ended = await lifecycle.endSession({
    sessionId: session.sessionId,
    roomId: session.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(ended.ok, true);
  const harness = createConfiguredHarness({ idPrefix: "ended-session-turn" });
  const sent = await harness.supervisor.sendTurn({
    ...turnInput(session),
    expectedConnectionEpoch: ended.session.connection.epoch,
  }, context());
  assert.equal(sent.reason, "session_ended");
  assert.equal(harness.gatewayCalls.length, 0);
});

await accept("tampered_refs_and_request_hashes_fail_before_budget_or_gateway_use", async () => {
  const session = await createSession();
  const harness = createConfiguredHarness({ idPrefix: "tamper-turn" });
  const badRef = await harness.supervisor.sendTurn({
    ...turnInput(session),
    promptAssemblyRef: { ...refs.promptAssemblyRef, hash: "not-a-hash" },
  }, context());
  assert.equal(badRef.reason, "invalid_provider_supervisor_request");
  const request = sealedBoundedRequest();
  request.inputUnits += 1;
  const badRequest = await harness.supervisor.sendTurn(
    turnInput(session, request), context());
  assert.equal(badRequest.reason, "invalid_provider_supervisor_request");
  assert.equal(harness.gatewayCalls.length, 0);
  const state = await harness.supervisor.readState({
    sessionId: session.sessionId,
    roomId: session.binding.roomId,
    expectedConnectionEpoch: 1,
  }, context());
  assert.equal(state.state.budget.turnCount, 0);
});

await accept("supervisor_state_and_receipts_contain_no_auth_provider_or_training_secrets", async () => {
  const serialized = JSON.stringify({
    metadata: configured.supervisor.metadata(),
    successfulTurn,
    contract: STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1,
  });
  assert(!serialized.includes("principal-a"));
  assert(!serialized.includes("seatToken"));
  assert(!serialized.includes("apiKey"));
  assert(!serialized.includes("Authorization"));
  assert(!serialized.includes("Bearer"));
  assert.equal(successfulTurn.turn.eligibleForTraining, false);
  assert.equal(successfulTurn.receipt.trainingTruth, false);
  assert.equal(successfulTurn.state.productionReady, false);
});

assert.equal(acceptance.length, 24);

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_15_slice_146_report_v1",
  ticket: 15,
  slice: 146,
  generatedAt: "2026-09-04T00:30:00.000Z",
  supervisorContractHash:
    STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1
      .supervisorContractHash,
  acceptanceChecks: acceptance,
  acceptanceCount: acceptance.length,
  gatewayEvidence: "injected_deterministic_gateway_only_not_live_provider",
  gatewayInvocationCount: configured.gatewayCalls.length
    + cancelHarness.gatewayCalls.length
    + parallelHarness.gatewayCalls.length
    + timeoutHarness.gatewayCalls.length
    + failureHarness.gatewayCalls.length
    + unsafeHarness.gatewayCalls.length
    + receiptHarness.gatewayCalls.length
    + limitHarness.gatewayCalls.length
    + turnLimitHarness.gatewayCalls.length
    + fenceHarness.gatewayCalls.length,
  ticketProgress: "3/9",
  projectProgress: "13/22",
  nativeDeviceEvidence: "deferred_by_user_until_full_development_completion",
  runTruth:
    STARCRAFT_TMG_TICKET_15_PROVIDER_GATEWAY_SUPERVISOR_CONTRACT_V1.runTruth,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: ["provider_gateway.complete", "provider_gateway.abort"],
    uiTraceEvidence: "deferred_to_slices_150_152_web_mount_and_browser_trace",
    agentDecisionEvidence: null,
    memoryTraceEvidence: {
      refs: [],
      writes: 0,
      crossSessionBudgetIsolationChecked: true,
    },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "disable a gateway whose output or usage receipt fails validation",
      "quarantine every completion arriving after cancel timeout reconnect or end",
      "never automatically retry a potentially billable Provider request",
    ],
    userVisibleChecks: [
      "provider_not_configured_is_explicit",
      "waiting_provider_is_observable",
      "cancel_and_timeout_are_terminal",
      "accepted_current_completion_is_the_only_output_reveal_path",
    ],
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Ticket 15 Slice 146 Provider Gateway supervisor: ${acceptance.length}/${acceptance.length}`);
console.log(`Supervisor contract: ${report.supervisorContractHash}`);
console.log(`Report: ${report.reportHash}`);
console.log(`Ticket 15 progress: ${report.ticketProgress}`);
console.log(`Project progress: ${report.projectProgress}`);
