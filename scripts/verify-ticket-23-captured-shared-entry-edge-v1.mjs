import assert from "node:assert/strict";
import { inspectStarcraftTmgSelectedActionIdentityClaimsV1 as inspect } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";

// Actual C/r7 paid Planner goal: Ventral Sacs and Omega Network share an
// entry-edge property; that property cannot identify the selected ability.
const candidateId = "sc-domain-64e6b78e978bc649c9c3620a821be679219c03658833a003932f3483ae1cadda";
const spatialActionSpace = { parameterDomains: [
  { domainId: candidateId, actionType: "use_ability", abilityName: "Ventral Sacs",
    effectKind: "reserve_deploy_indicator" },
  { domainId: "other-omega", actionType: "use_ability", abilityName: "Omega Network",
    effectKind: "omega_network" },
] };
const goal = "Use Kerrigan's Ventral Sacs to place a Faction Indicator more than 10 inches from every enemy model, establishing a forward reserve entry edge near mission-marker-5 so future Ground reserves can deploy toward the central objective.";
const result = inspect({ spatialActionSpace, candidateId, stage: "planning",
  value: { assessment: { currentGoal: goal }, plan: { currentGoal: goal } } });
assert.equal(result.status, "consistent", JSON.stringify(result.contradictions));
for (const stage of ["planning", "action"]) {
  const wrong = "Use Ventral Sacs to place an Omega Worm as a source of creep.";
  const value = stage === "planning" ? { plan: { currentGoal: wrong } }
    : { selectedReason: wrong };
  assert.equal(inspect({ spatialActionSpace, candidateId, stage, value }).status,
    "contradicted", "a genuinely different placed asset must still be rejected");
}
console.log("CAPTURED_SHARED_ENTRY_EDGE_OK; providerCalls=0; roomWrites=0");
