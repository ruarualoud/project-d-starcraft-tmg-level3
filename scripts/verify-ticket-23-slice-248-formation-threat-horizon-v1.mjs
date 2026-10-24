#!/usr/bin/env node

// Repro from the saved r43 Corpser Run decision: Raynor can shoot in a
// future round, but his Assault activation has ended this round.
import assert from "node:assert/strict";
import { inspectStarcraftTmgFormationThreatClaimsV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const option = { relationshipComparison: { relationships: [{
  targetId: "agent-unit-7", enemyUnitId: "agent-unit-7",
  relation: "opposed",
  minimumBaseEdgeDistanceMilliInches: 15524,
  enemyStationaryThreatProfileKeys:
    ["army_units:jim_raynor::assault::Commando Rifle"],
  enemyStationaryThreatProfileCount: 1,
  enemyCurrentRoundStationaryThreatProfileKeys: [],
  enemyCurrentRoundStationaryThreatProfileCount: 0,
  enemyCurrentRoundStationaryThreatUnknownProfileKeys: [],
  enemyThreatActionWindow: { earliestStationaryAttackHorizon: "next_round",
    assaultCurrentRoundAvailable: false },
}] } };
const spatialObservation = { units: [
  { unitId: "player2-corpser", sideRelation: "own",
    unitName: "Corpser" },
  { unitId: "agent-unit-7", sideRelation: "enemy",
    unitName: "Jim Raynor" },
] };
const input = { option, spatialObservation, queryReceipts: [] };
const currentOnly = inspectStarcraftTmgFormationThreatClaimsV1({ ...input,
  raw: { risk: "No current-round Terran fire band covers the Corpser." },
});
assert.equal(currentOnly.contradicted, false,
  "future-round Raynor fire must not contradict a current-round claim");
const allRounds = inspectStarcraftTmgFormationThreatClaimsV1({ ...input,
  raw: { risk: "No stationary fire band can cover the Corpser." },
});
assert.equal(allRounds.contradicted, true,
  "unqualified denial must still be challenged by future-round fire");
process.stdout.write("FORMATION_THREAT_HORIZON_OK\n");
