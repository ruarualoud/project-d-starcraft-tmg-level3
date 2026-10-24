// Concrete regression: accepting Teach advances the event revision without
// changing its army/route/arrival, then promotion rejects the rebuilt handoff.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { createOfficialArmyBuilderQueryPortV1 } from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import { prepareIterativeRosterTeachHandoffV1 } from "../packages/roster-strategist/iterative-roster-teach-handoff-v1.mjs";
import { createAgentSelectedTeachPlanBridgeV1, createAgentSelectedTeachSessionReceiptV1 } from "../packages/roster-strategist/agent-selected-teach-plan-bridge-v1.mjs";

const option = key => process.argv.find(x => x.startsWith(`--${key}=`))?.slice(key.length + 3);
const state = JSON.parse(await readFile(option("state"), "utf8")).value;
const teach = JSON.parse(await readFile(option("teach"), "utf8"));
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: option("fixture") });
const armyBuilderPort = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset }),
});
const missionProfile = teach.toolReceipts.find(x => x.queryId === "mission-scoring-authority").missionScoringProfile;
const handoff = prepareIterativeRosterTeachHandoffV1({ state, armyBuilderPort, missionProfile });
console.log(JSON.stringify({ stage: "handoff_prepared", currentEventRevision: state.revision,
  teachSourceRevision: teach.agentSelectedStrategySource.iterativeRevision,
  handoffRevision: handoff.iterativeRevision, matchesPaidTeach: handoff.handoffHash === teach.agentSelectionHandoffHash }));
assert.equal(handoff.handoffHash, teach.agentSelectionHandoffHash,
  "accepted unchanged Teach must retain the source handoff identity");
const bridge = createAgentSelectedTeachPlanBridgeV1({ handoff,
  taughtLockedPlan: JSON.parse(teach.planSerialized), armyBuilderPort,
  armyAudit: handoff.lockedRoster.lock.verdict.audit, missionProfile });
const receipt = createAgentSelectedTeachSessionReceiptV1({ bridge, handoff,
  taughtSessionReceipt: teach.sessionReceipt, armyBuilderPort, missionProfile });
assert.equal(receipt.agentSelectionHandoffHash, teach.agentSelectionHandoffHash);
assert.deepEqual(bridge.plan.rosterCandidate.units, JSON.parse(teach.planSerialized).rosterCandidate.units);
assert.deepEqual(bridge.plan.openingDeploymentSchedule.entries, state.openingDeploymentSchedule.entries);
const changedRoute = structuredClone(state);
changedRoute.plan.victoryRoute += " A genuinely different route invalidates the old Teach.";
const changed = prepareIterativeRosterTeachHandoffV1({ state: changedRoute, armyBuilderPort, missionProfile });
assert.notEqual(changed.handoffHash, teach.agentSelectionHandoffHash,
  "changed strategy must not inherit accepted Teach identity");
assert.equal(changed.iterativeRevision, changedRoute.revision);
const notAccepted = structuredClone(state);
notAccepted.teachFeedback.disposition = "pending";
assert.equal(prepareIterativeRosterTeachHandoffV1({ state: notAccepted, armyBuilderPort, missionProfile }).iterativeRevision,
  notAccepted.revision, "pending Teach must not reuse an accepted source revision");
assert.equal(hashStarcraftTmgContract(state.plan), teach.agentSelectedStrategySource.planHash);
console.log(JSON.stringify({ status: "passed", armyMinerals: handoff.lockedRoster.lock.verdict.summary.mineralSpent,
  sourceRevisionRetained: handoff.iterativeRevision, eventRevisionRetained: state.revision,
  changedRouteNotReused: true, pendingFeedbackNotReused: true,
  promotedPlanHash: bridge.plan.planHash, sourceReviewRequired: true,
  realProviderCalls: 0, roomWrites: 0, historicalFilesModified: false }));
