#!/usr/bin/env node

// Concrete B r1 recovery regression: the persisted Planner predates the
// self-place formation contract and must not be silently run as "balanced".
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isStarcraftTmgFormationIntentReadyV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

const directory = path.resolve(process.argv[2] || "");
assert(directory !== path.parse(directory).root,
  "pass the exact retained V5 Room directory");
const action = JSON.parse(readFileSync(path.join(directory,
  "checkpoint.json"), "utf8")).lastAction;
assert.equal(action.actionType, "use_active_ability");
assert.equal(action.plannerResult.formationSearchRequest, null);
const selected = { kind: "parameterized", action: {
  actionType: "use_active_ability",
  effectContract: { targetKind: "self_place" },
  parameterSchema: { placements: { modelIds: ["player2-kerrigan-model-1"] } },
} };
assert.equal(isStarcraftTmgFormationIntentReadyV1(selected,
  action.plannerResult), false);
assert.equal(isStarcraftTmgFormationIntentReadyV1(selected, {
  formationSearchRequest: {
    tacticalPurpose: "Contest marker 2 after failed Charge",
    formationObjectives: [{ kind: "control_objective", weight: 5,
      targetIds: ["mission-marker-2"] }],
  },
}), true);
assert.equal(isStarcraftTmgFormationIntentReadyV1({ kind: "finite",
  action: { actionType: "finish_activation" } }, {}), true);
console.log(JSON.stringify({ ok: true, sourceRevision: 1,
  persistedPlannerIntentMissing: true, providerCalls: 0,
  roomMutations: 0 }));
