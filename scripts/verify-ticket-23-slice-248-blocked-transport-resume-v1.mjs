import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStarcraftTmgAgentAgentExperimentOrchestratorV1 } from
  "../packages/online-agent-session/agent-agent-experiment-orchestrator-v1.mjs";

// Concrete r16 regression: an explicitly authorized retry returned blocked
// without reaching the retained Action stage. No Provider or durable Room here.
const manifestArgument = process.argv.find((value) =>
  value.startsWith("--captured-manifest="));
assert.ok(manifestArgument, "the actual blocked manifest is required");
const captured = JSON.parse(await readFile(
  manifestArgument.slice("--captured-manifest=".length), "utf8"));
assert.equal(captured.orchestrator.status, "blocked");
assert.ok(captured.orchestrator.failureAccounting.findings.some((finding) =>
  finding.code === "provider_transport_failed"
    && finding.integrationBlocking === true));

function fixture(failureCode = "provider_transport_failed") {
  const roomId = "captured-r16-transport-recovery";
  const matchBindingHash = "captured-binding";
  let revision = 16;
  let calls = 0;
  const projection = () => ({
    room: { roomId, stateRevision: revision, stateHash: `state-${revision}` },
    matchBinding: { bindingHash: matchBindingHash },
    state: { round: 1, phase: "movement", activeSideKey: "player1",
      terminal: false, scores: { player1: 0, player2: 0 } },
  });
  const seats = ["player1", "player2"].map((seatKey) => {
    const scope = { roomId, matchBindingHash, seatKey };
    return { seatKey, scope, seatToken: `fixture-${seatKey}`,
      automationConsent: {}, strategySkillSetHash: "retained-skills",
      runtime: {
        async attach() { return { projection: { scope } }; },
        async read() { return { projection: { scope } }; },
        async close() { return { ok: true }; },
        async drive(input) {
          if (seatKey !== "player1") {
            return { ok: true, outcome: "waiting_for_other_seat" };
          }
          calls += 1;
          if (calls === 1) return { ok: false, reason: failureCode,
            findingSeverity: "High" };
          assert.equal(input.retry, true);
          revision += 1;
          return { ok: true, outcome: "bot_action_applied", trace: {
            traceId: "retained-action-stage", seatKey,
            postStateRevision: revision, replayMatchesCurrent: true,
          } };
        },
      },
    };
  });
  const orchestrator = createStarcraftTmgAgentAgentExperimentOrchestratorV1({
    roomPort: {
      async readRoom() { return { ok: true, projection: projection() }; },
      async replayRoom() { return { ok: true, matchesCurrent: true }; },
    },
    experimentCell: {
      experimentId: "r16-transport-recovery", cellId: "same-room",
      denominator: { index: 1, total: 1 }, roomId, matchBindingHash,
      versions: { source: "frozen", rules: "v5", strategy: "retained" },
      scenario: { mapId: "daybreak", missionId: "hold-position",
        rosterIdsBySeat: { player1: "fixed-2000", player2: "fixed-2000" } },
      rng: { scheme: "recorded", seed: "unchanged" },
      budgets: { maxAppliedActions: 100, maxRecoverableFailuresPerState: 3 },
      seats: Object.fromEntries(seats.map(({ seatKey }) => [seatKey, {
        agentId: seatKey, factionRecordKey: seatKey, providerId: "fixture",
        skillRefs: [{ id: "existing", hash: "unchanged" }],
      }])),
    }, seats,
  });
  return { orchestrator, calls: () => calls,
    moveAuthority: () => { revision += 1; } };
}

const transport = fixture();
await transport.orchestrator.run({ maxAdditionalActions: 1 });
assert.equal((await transport.orchestrator.resume()).status, "blocked");
assert.equal(transport.calls(), 1, "no unapproved retry");
const recovered = await transport.orchestrator.resume({ retryProvider: true,
  maxAdditionalActions: 1, pauseAfterAppliedActions: 1 });
assert.equal(recovered.status, "paused", "explicit transport retry must progress");
assert.equal(recovered.state.stateRevision, 17);
assert.equal(transport.calls(), 2);
assert.equal(recovered.failureAccounting.total, 1, "history is retained");
assert.equal(recovered.failureAccounting.blocking, 0);
assert.equal(recovered.failureAccounting.findings[0].severity, "High");
assert.equal(recovered.recoveryReceipts[0].unknownUsagePreserved, true);

const rulesFailure = fixture("A2A_REPLAY_MISMATCH");
await rulesFailure.orchestrator.run({ maxAdditionalActions: 1 });
assert.equal((await rulesFailure.orchestrator.resume({ retryProvider: true }))
  .status, "blocked", "retry must not waive Rules/replay failures");
assert.equal(rulesFailure.calls(), 1);

const drift = fixture();
await drift.orchestrator.run({ maxAdditionalActions: 1 });
drift.moveAuthority();
await assert.rejects(() => drift.orchestrator.resume({ retryProvider: true }),
  (error) => error.code === "A2A_PROVIDER_RETRY_AUTHORITY_CHANGED");
assert.equal(drift.calls(), 1);
console.log(JSON.stringify({ status: "passed", providerCalls: 0,
  roomWrites: 0, explicitRetryOnly: true, historicalFindingPreserved: true,
  nonTransportHighStillBlocked: true, changedAuthorityRejected: true }));
