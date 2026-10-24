import assert from "node:assert/strict";
import { createStarcraftTmgAgentAgentExperimentOrchestratorV1 } from
  "../packages/online-agent-session/agent-agent-experiment-orchestrator-v1.mjs";

const roomId = "a2a-preexecution-deferral-repro";
const matchBindingHash = "binding-repro";
let stateRevision = 12;
let seat2DriveCount = 0;

const projection = () => ({
  room: { roomId, stateRevision,
    stateHash: `state-${stateRevision}` },
  matchBinding: { bindingHash: matchBindingHash },
  state: { round: 1, phase: "movement", activeSideKey: "player2",
    terminal: false, gameOver: false, scores: { player1: 0, player2: 0 } },
});

const cell = {
  experimentId: "preexecution-deferral-repro",
  cellId: "one-state",
  denominator: { index: 1, total: 1 },
  roomId,
  matchBindingHash,
  versions: { source: "source", rules: "rules", strategy: "strategy" },
  scenario: { mapId: "map", missionId: "mission",
    rosterIdsBySeat: { player1: "roster-1", player2: "roster-2" } },
  rng: { scheme: "recorded", seed: "seed" },
  budgets: { maxAppliedActions: 3, maxRecoverableFailuresPerState: 3 },
  seats: Object.fromEntries(["player1", "player2"].map((seatKey) => [
    seatKey, { agentId: seatKey, factionRecordKey: seatKey,
      providerId: "provider", skillRefs: [{ id: "skill", hash: "hash" }] },
  ])),
};

function seat(seatKey) {
  const scope = { roomId, matchBindingHash, seatKey };
  const runtime = {
    async attach() { return { projection: { scope, connectionEpoch: 1 } }; },
    async read() { return { projection: { scope, connectionEpoch: 1 } }; },
    async close() { return { ok: true }; },
    async drive() {
      if (seatKey === "player1") {
        return { ok: true, outcome: "waiting_for_other_seat" };
      }
      seat2DriveCount += 1;
      if (seat2DriveCount === 1) {
        return { ok: true, outcome: "preexecution_search_started" };
      }
      if (seat2DriveCount === 2) {
        return { ok: true, outcome: "preexecution_search_running" };
      }
      stateRevision += 1;
      return { ok: true, outcome: "bot_action_applied", trace: {
        traceId: "applied-after-deferral", seatKey,
        postStateRevision: stateRevision, replayMatchesCurrent: true,
      } };
    },
  };
  return { seatKey, scope, runtime, seatToken: `token-${seatKey}`,
    automationConsent: {}, strategySkillSetHash: "skills" };
}

const orchestrator = createStarcraftTmgAgentAgentExperimentOrchestratorV1({
  roomPort: {
    async readRoom() { return { ok: true, projection: projection() }; },
    async replayRoom() { return { ok: true, matchesCurrent: true }; },
  },
  experimentCell: cell,
  seats: [seat("player1"), seat("player2")],
});
const result = await orchestrator.run({ pauseAfterAppliedActions: 1 });
assert.equal(result.appliedActionCount, 1,
  "one intentional preexecution defer must not stop before the next action");
assert.equal(stateRevision, 13);
assert.equal(seat2DriveCount, 3);
assert.equal(result.failureAccounting.findings.some((finding) =>
  finding.code === "A2A_NO_PROGRESS_AT_CURRENT_STATE"), false);
console.log("A2A_PREEXECUTION_DEFERRAL_OK");
