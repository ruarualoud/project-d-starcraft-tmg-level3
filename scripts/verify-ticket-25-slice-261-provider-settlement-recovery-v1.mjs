#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createInMemoryStarcraftTmgLiveDecisionStoreV1,
  createStarcraftTmgLiveFlashDecisionPortV1,
} from "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import { hashStarcraftTmgProviderAttemptValueV1 } from
  "../packages/secure-provider-runtime/provider-attempt-store-contract-v1.mjs";
import { createSqliteStarcraftTmgProviderAttemptStoreV1 } from
  "../packages/secure-provider-runtime/sqlite-provider-attempt-store-v1.mjs";

const NOW = "2026-09-17T03:00:00.000Z";

function H(label) {
  return hashStarcraftTmgContract({ fixture: label });
}

function policy() {
  const body = {
    schemaVersion: "starcraft_tmg_provider_budget_policy_v1",
    maxTotalUnits: 10_000,
    maxTurns: 10,
    maxInputUnitsPerTurn: 2_000,
    maxOutputUnitsPerTurn: 1_000,
    timeoutMs: 30_000,
    cancellationSettlement: "consume_full_reservation_when_usage_is_unknown",
    timeoutSettlement: "consume_full_reservation_when_usage_is_unknown",
    automaticRetryAllowed: false,
    currency: "provider_units",
    trainingTruth: false,
  };
  return Object.freeze({
    ...body,
    policyHash: hashStarcraftTmgProviderAttemptValueV1(body),
  });
}

function decisionFixture({ store, providerSupervisor, providerAttemptObserver }) {
  return createStarcraftTmgLiveFlashDecisionPortV1({
    providerSupervisor,
    providerAttemptObserver,
    promptArtifactStore: createInMemoryStarcraftTmgPromptArtifactStoreV1({
      createId: () => "sc-prompt-artifact-settlement-recovery",
    }),
    profileAvailabilityPort: {
      async check() { return { ok: true, available: true }; },
    },
    strategySkillPort: {
      async resolve() {
        return {
          ok: true,
          snapshot: {
            gameId: "starcraft-tmg",
            ownFaction: "kerrigan-swarm",
            opponentFaction: "dalam-protoss",
            skillRefs: [],
            skills: [],
            skillSetHash: H("skill-set"),
            trainingTruth: false,
          },
        };
      },
    },
    spatialQueryPort: {
      async query() { throw new Error("query_not_expected"); },
    },
    store,
    profileCandidates: [{
      providerId: "deepseek-openai-compatible-direct",
      model: "deepseek-v4-flash",
      profileRef: {
        id: "ticket25-settlement-recovery",
        version: "1",
        hash: H("profile"),
      },
      maxOutputUnits: 256,
    }],
    now: () => NOW,
  });
}

function decisionInput(scope, retryApproved = false) {
  const stateHash = H("state");
  const legalSpaceHash = H("legal-space");
  return {
    scope,
    roomProjection: {
      room: { roomId: scope.roomId, stateRevision: 1, stateHash },
      matchBinding: { bindingHash: scope.matchBindingHash },
      viewer: { seatKey: scope.seatKey },
      state: { round: 1, phase: "movement", pieces: [] },
    },
    legalSpace: {
      roomId: scope.roomId,
      matchBindingHash: scope.matchBindingHash,
      stateRevision: 1,
      stateHash,
      legalSpaceHash,
      finiteActions: [],
      parameterDomains: [],
    },
    spatialObservation: {
      observationHash: H("spatial-observation"),
      units: [],
      offTableUnits: [],
    },
    spatialActionSpace: {
      authority: { stateRevision: 1, stateHash, legalSpaceHash },
      actionSpaceHash: H("action-space"),
      finiteActions: [{
        candidateId: "move-alpha",
        action: { actionType: "move", sideKey: "player2", phase: "movement" },
      }, {
        candidateId: "pass-movement",
        action: { actionType: "pass", sideKey: "player2", phase: "movement" },
      }],
      parameterDomains: [],
    },
    retryApproved,
    promptPack: "opponent_prompt",
  };
}

const checks = [];
const failures = [];
async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({ id, passed: false, code: error?.code || error?.message });
    failures.push({ id, code: error?.code || error?.message });
  }
}

await check("store_finds_the_exact_settled_request_binding", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "sc-t25-s261-settlement-"));
  const providerStore = createSqliteStarcraftTmgProviderAttemptStoreV1({
    filename: path.join(directory, "attempts.sqlite"),
  });
  try {
    const principalScopeHash = H("principal");
    const opened = await providerStore.openBudget({
      principalScopeHash,
      sessionBindingHash: H("session"),
      policy: policy(),
      idempotencyKeyHash: H("open"),
      openedAt: NOW,
    });
    const requestHash = H("request");
    const promptAssemblyHash = H("prompt");
    const reserved = await providerStore.reserveAttempt({
      budgetId: opened.budget.budgetId,
      principalScopeHash,
      expectedBudgetRevision: opened.budget.revision,
      idempotencyKeyHash: H("reserve"),
      consentReceiptHash: H("consent"),
      providerProfileHash: H("profile"),
      egressPolicyHash: H("egress"),
      promptAssemblyHash,
      responseContractHash: H("response-contract"),
      requestHash,
      intent: "take_turn",
      inputUnits: 120,
      maxOutputUnits: 40,
      reservedAt: NOW,
      retryOfAttemptId: null,
      retryApprovalReceiptHash: null,
      reattachmentReceiptHash: null,
    });
    const dispatched = await providerStore.markAttemptDispatched({
      attemptId: reserved.attempt.attemptId,
      expectedAttemptRevision: reserved.attempt.revision,
      dispatchBindingHash: H("dispatch"),
      dispatchedAt: "2026-09-17T03:00:01.000Z",
    });
    await providerStore.settleAttempt({
      attemptId: dispatched.attempt.attemptId,
      expectedAttemptRevision: dispatched.attempt.revision,
      terminalStatus: "completed",
      usageKnown: true,
      inputUnits: 100,
      outputUnits: 20,
      safeProviderReceiptHash: H("safe-receipt"),
      settledAt: "2026-09-17T03:00:02.000Z",
    });
    const observed = await providerStore.findAttemptByRequestBinding({
      requestHash,
      promptAssemblyHash,
    });
    assert.equal(observed?.attemptId, reserved.attempt.attemptId);
    assert.equal(observed?.status, "completed");
    assert.equal(observed?.reportedTotalUnits, 120);
  } finally {
    await providerStore.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

await check("decision_reconciles_paid_response_loss_before_retry", async () => {
  const store = createInMemoryStarcraftTmgLiveDecisionStoreV1();
  const scope = {
    gameId: "starcraft-tmg",
    roomId: "ticket25-s261-provider-settlement-recovery",
    matchBindingHash: H("match-binding"),
    seatKey: "player2",
  };
  let durableAttempt = null;
  const interruptedPort = decisionFixture({
    store,
    providerSupervisor: {
      async readState() { return { ok: true }; },
      async sendTurn(input) {
        durableAttempt = {
          attemptId: "sc-provider-attempt-focused-recovery",
          requestHash: input.boundedRequest.requestHash,
          promptAssemblyHash: input.promptAssemblyRef.hash,
          status: "completed",
          usageKnown: true,
          reportedInputUnits: 100,
          reportedOutputUnits: 20,
          reportedTotalUnits: 120,
          chargedUnits: 120,
          settledAt: "2026-09-17T03:00:02.000Z",
          safeProviderReceiptHash: H("safe-provider-receipt"),
          attemptHash: H("durable-attempt"),
          rawProviderOutputRetained: false,
          trainingTruth: false,
        };
        throw Object.assign(new Error("simulated process loss after settlement"), {
          code: "SIMULATED_POST_SETTLEMENT_PROCESS_LOSS",
        });
      },
    },
    providerAttemptObserver: {
      async observe() { return { ok: true, attempt: durableAttempt }; },
    },
  });
  const preflight = await interruptedPort.preflight({ scope,
    matchMode: "user_vs_agent" });
  assert.equal(preflight.ok, true);
  const opened = await interruptedPort.openMatch({
    scope,
    preflightReceipt: preflight,
    providerSession: {
      sessionId: "ticket25-focused-session",
      connectionEpoch: 1,
      sessionBindingHash: H("provider-session"),
    },
    promptPack: "opponent_prompt",
  });
  assert.equal(opened.ok, true);
  const first = await interruptedPort.decide(decisionInput(scope));
  assert.equal(first.reason, "SIMULATED_POST_SETTLEMENT_PROCESS_LOSS");

  let retryCalls = 0;
  const resumedPort = decisionFixture({
    store,
    providerSupervisor: {
      async readState() { return { ok: true }; },
      async sendTurn() { retryCalls += 1; throw new Error("retry_not_expected"); },
    },
    providerAttemptObserver: {
      async observe(input) {
        assert.equal(input.requestHash, durableAttempt.requestHash);
        assert.equal(input.promptAssemblyHash, durableAttempt.promptAssemblyHash);
        return { ok: true, attempt: durableAttempt };
      },
    },
  });
  const recovered = await resumedPort.decide(decisionInput(scope));
  assert.equal(recovered.reason, "LIVE_DECISION_EXPLICIT_RETRY_REQUIRED");
  assert.equal(retryCalls, 0);
  assert.equal(recovered.projection.unresolvedCommitUnknownCount, 0);
  assert.equal(recovered.projection.usage.totalUnits, 120);
  const record = await store.load(recovered.projection.scope.scopeKey);
  const decision = Object.values(record.decisions)[0];
  const attempt = decision.attempts[decision.attemptKeys.at(-1)];
  assert.equal(attempt.status, "provider_completed_response_lost");
  assert.equal(decision.status,
    "provider_response_lost_requires_explicit_retry");
  assert.equal(attempt.durableProviderAttemptId, durableAttempt.attemptId);
});

const report = {
  schema: "ticket25_slice261_provider_settlement_recovery_focused_v1",
  ok: failures.length === 0,
  checks,
  failures,
  providerCalls: 0,
  trainingTruth: false,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
assert.equal(report.ok, true, JSON.stringify(failures));
