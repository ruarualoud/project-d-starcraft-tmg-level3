#!/usr/bin/env node

// Saved paid A r60 choice: a former search miss must be eligible for one
// local, same-authority replay after the formation solver improves.
import assert from "node:assert/strict";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { decodeStarcraftTmgLiveDecisionRecordV1 } from
  "../packages/online-agent-session/sqlite-live-decision-store-v1.mjs";
import { planStarcraftTmgUnavailableFormationRecoveryV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";

const argument = process.argv.find((entry) =>
  entry.startsWith("--run-directory="));
assert(argument);
const directory = path.resolve(argument.slice("--run-directory=".length));
const db = new DatabaseSync(path.join(directory,
  "seats/player2/provider/live-decisions.sqlite"), { readOnly: true });
const row = db.prepare(`
  SELECT record_json FROM sc_live_decision_records
   ORDER BY revision DESC LIMIT 1
`).get();
db.close();
const record = decodeStarcraftTmgLiveDecisionRecordV1(row.record_json);
const choice = Object.values(record.decisions).find((entry) =>
  entry.authority.stateRevision === 60);
assert(choice);
const before = JSON.stringify(choice);
const plan = planStarcraftTmgUnavailableFormationRecoveryV1(choice);
assert.equal(plan?.candidateId, choice.actionIndex[0].id);
assert.equal(plan?.attemptKey, choice.attemptKeys.at(-1));
assert.equal(plan?.solverVersion,
  STARCRAFT_TMG_LEGAL_FORMATION_SEARCH_VERSION);
assert.equal(plan?.oldReceiptReason,
  "RULES_QUERY_NO_LEGAL_FORMATION_OPTION");
assert.equal(plan?.providerRetryAllowed, false);
const alreadyRecovered = structuredClone(choice);
alreadyRecovered.warnings.push(plan.warning);
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1(alreadyRecovered),
  null, "same solver version may recover a failed search only once");
const differentState = structuredClone(choice);
differentState.queryReceipts.find((entry) =>
  entry.queryKind === "space.solve_formation").authority.stateHash =
    "0".repeat(64);
assert.equal(planStarcraftTmgUnavailableFormationRecoveryV1(differentState),
  null, "a search receipt from another Room state cannot be replayed");
assert.equal(JSON.stringify(choice), before,
  "paid attempts and search-failure evidence must remain unchanged");
console.log(JSON.stringify({ ok: true, stateRevision: 60,
  oneLocalSolverReplay: true, alteredAuthorityRejected: true,
  providerCalls: 0, roomMutations: 0 }));
