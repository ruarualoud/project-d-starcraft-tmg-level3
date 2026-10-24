#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveStarcraftTmgDeterministicSingletonActionV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

// Reduced from B's accepted r63 mandatory Impact: one target, five fighting
// models, two dice each. This is a Rules continuation, not a model choice.
const eligibleModels = Array.from({ length: 5 }, (_, index) => ({
  modelId: `player2-kerrigan-raptor-model-${index + 1}`,
  eligibleTargetUnitIds: ["goliath-1"],
  impactDice: 2,
}));
function candidate(schema) {
  return { kind: "parameterized", id: "saved-r63-impact-domain",
    action: { actionType: "resolve_impact", parameterSchema: schema } };
}
const forcedSchema = { type: "object", required: ["allocations"],
  allocationUnit: "impact_die_per_eligible_model",
  targetUnitIds: ["goliath-1"], eligibleModels,
  exactTotal: 10, singleTargetForcedAllocation: true };
const selected = resolveStarcraftTmgDeterministicSingletonActionV1([
  candidate(forcedSchema),
]);
assert.ok(selected, "single-target mandatory Impact must not ask the model");
assert.equal(selected.parameterBinding, "single_target_forced_impact");
assert.deepEqual(selected.proposal, { kind: "parameterized",
  domainId: "saved-r63-impact-domain", parameters: {
    allocations: eligibleModels.map((entry) => ({
      modelId: entry.modelId, targetUnitId: "goliath-1", dice: 2,
    })),
  } });
assert.equal(resolveStarcraftTmgDeterministicSingletonActionV1([
  candidate({ ...forcedSchema, exactTotal: 11 }),
]), null, "inconsistent Rules totals must fail closed");
assert.equal(resolveStarcraftTmgDeterministicSingletonActionV1([
  candidate({ ...forcedSchema, targetUnitIds: ["goliath-1", "marine-1"],
    singleTargetForcedAllocation: false }),
]), null, "multiple targets remain a strategic allocation choice");

process.stdout.write("forced-impact-continuation: passed\n");
