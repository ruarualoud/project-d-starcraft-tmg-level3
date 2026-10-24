#!/usr/bin/env node

import assert from "node:assert/strict";
import { inspectIterativeRosterNarrativeAlignmentV1 } from
  "../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs";

const strategy = { scoreRoute: "Score markers 1 and 3 from round 2.",
  mapRationale: "Both routes use the temple ramps.",
  rosterRationale: "Three Medics support Core.",
  openingSequence: ["Deploy Core to marker 1."],
  opponentHypotheses: ["Swarm may rush marker 5."],
  counterPlans: ["Screen the ramp."],
  revisionReason: "The Builder-certified roster now contains three Medics." };
const state = { mineralBudget: 2000,
  currentCandidate: { mineralSpent: 2000, candidateHash: "a".repeat(64) },
  plan: { candidateHash: "a".repeat(64),
    mapEvidenceHash: "b".repeat(64),
    victoryRoute: "Hold markers with two Medics.", strategy } };
const decision = { kind: "finish", assumptionDisposition: "retain",
  plan: { mapEvidenceHash: "b".repeat(64),
    victoryRoute: "Hold markers with three Medics.", strategy } };
const alignment = inspectIterativeRosterNarrativeAlignmentV1(decision, state);
assert.equal(alignment.allowed, true);
assert.equal(alignment.strategyUnchanged, true);
assert.equal(alignment.routeNarrativeChanged, true);
assert.equal(inspectIterativeRosterNarrativeAlignmentV1({ ...decision,
  plan: { ...decision.plan, strategy: { ...strategy,
    scoreRoute: "Abandon the markers and only chase kills." } } }, state).allowed,
false);
assert.equal(inspectIterativeRosterNarrativeAlignmentV1({ ...decision,
  plan: { ...decision.plan, mapEvidenceHash: "c".repeat(64) } }, state).allowed,
false);
assert.equal(inspectIterativeRosterNarrativeAlignmentV1({ ...decision,
  plan: { ...decision.plan, mapEvidenceHash: "c".repeat(64) },
  originalMapEvidenceHash: "b".repeat(64),
  evidenceBindingKind: "certified_current_candidate_route" }, state).allowed,
true, "certified map-freeze alias may rebind to its current-candidate route");
process.stdout.write(JSON.stringify({ ok: true, providerCalls: 0,
  priorRouteHash: alignment.priorRouteHash,
  nextRouteHash: alignment.nextRouteHash }) + "\n");
