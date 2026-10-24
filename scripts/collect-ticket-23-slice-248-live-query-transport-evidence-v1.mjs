// Read-only, process-isolated extraction: do not retain whole live records in
// the interactive diagnostic session, and never write to the Room databases.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";

const [roomDirectory, evidenceDirectory] = process.argv.slice(2);
assert(roomDirectory && evidenceDirectory);
const database = new DatabaseSync(
  `${roomDirectory}/seats/player1/provider/live-decisions.sqlite`,
  { readOnly: true });
const record = decodeStarcraftTmgLiveDecisionRecordV1(database.prepare(
  "SELECT record_json FROM sc_live_decision_records LIMIT 1").get().record_json);
database.close();
const choice = Object.values(record.decisions).find(entry =>
  entry.authority.stateRevision === 102);
assert(choice);
const requests = Object.values(choice.attempts).flatMap(attempt =>
  attempt.safeOutput?.query_requests?.requests || []).filter(request =>
  request.queryKind === "action_specific_threat");
assert.equal(requests.length, 7);
const a = choice.authority;
const fixture = {
  schema: "captured-C-r102-threat-query-transport-v1",
  authority: a, requests,
  parameterDomains: choice.actionIndex.filter(entry =>
    entry.kind === "parameterized").map(entry => entry.action),
  // Adapter transport needs identity, not the game's large physical state.
  // Its Rules instantiate dependency is explicitly a spy in the regression.
  roomAggregate: { stateRevision: a.stateRevision, envelope: {
    matchBindingHash: a.matchBindingHash, stateHash: a.stateHash, state: {} } },
  fixtureRoomIdentityActualButRulesStateStubbed: true,
};
await writeFile(`${evidenceDirectory}/C-r102-threat-query-transport-fixture-20261009.json`,
  JSON.stringify(fixture, null, 2) + "\n", { mode: 0o600 });

const botDatabase = new DatabaseSync(
  `${roomDirectory}/seats/player1/bot-seat.sqlite`, { readOnly: true });
const bot = JSON.parse(botDatabase.prepare(
  "SELECT record_json FROM sc_hosted_bot_seat_records LIMIT 1").get().record_json);
botDatabase.close();
const trace = bot.traces.at(-1);
const proof = { schema: "C-r103-completed-goal-action-replay-v1",
  observedAt: new Date().toISOString(),
  authorityRevision: bot.lastAppliedStateRevision, inflight: bot.inflight,
  receiptHash: bot.lastReceiptHash, replayMatchesCurrent: bot.lastReplayMatchesCurrent,
  traceHash: trace.traceHash, providerCalls: trace.providerCalls,
  providerTotalUnits: trace.providerTotalUnits,
  actorEstimatedCostCnyMicros: trace.matchEstimatedCostCnyMicros,
  hiddenChainOfThoughtStored: false, trainingTruth: false };
await writeFile(`${evidenceDirectory}/C-r103-single-goal-final-replay-proof-20261009.json`,
  JSON.stringify(proof, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ actualThreatRequests: requests.length,
  capturedRevision: a.stateRevision, final: proof }));
