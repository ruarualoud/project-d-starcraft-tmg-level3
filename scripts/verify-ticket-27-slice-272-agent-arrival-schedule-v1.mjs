// Concrete saved bug: an exact-2000 Agent roster has 13 Supply but the
// frozen mission admits only 6 in round one. This checks the new artifact
// and handoff guard without a Provider call or Room mutation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { parseRosterPlanV1 } from
  "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
import { createPlannedPresetRoundSupplyScheduleV1 } from
  "../packages/roster-strategist/planned-preset-roster-plan-v2.mjs";
import { createAgentScheduledRosterPlanV1,
  verifyAgentScheduledRosterPlanRoundTripV1,
  verifyAgentScheduledRosterPlanV1 } from
  "../packages/roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { createStarcraftTmgRosterTurnPlanSeedV1 } from
  "../packages/online-agent-session/roster-plan-turn-plan-bridge-v1.mjs";

const draft = JSON.parse(readFileSync(new URL(
  "../build/ticket-27-slice-272-output-capacity-v2/drafts/"
    + "rws-58722117-8734-4e1e-bd2d-5d7cb98e5061.json",
  import.meta.url), "utf8"));
const sourcePlan = parseRosterPlanV1(draft.planSerialized);
const armyAudit = draft.working.verdict.audit;
const missionProfile = draft.toolReceipts.find((entry) => (
  entry.schema === "starcraft_tmg_pregame_lab_mission_scoring_authority_v1"
  && entry.resultStatus === "derivable"))?.missionScoringProfile;
assert.equal(sourcePlan.rosterCandidate.legalityStatus, "legal");
assert.equal(armyAudit.startingSupply, 13);
assert.equal(missionProfile.startingSupply, 6);
const paidAttempt = draft.publicOutputs.find((entry) => (
  entry.roundKind === "arrival_schedule" && entry.roundIndex === 7));
assert.ok(paidAttempt?.sanitizedOutput?.openingDeploymentSchedule);
let paidRejection;
try {
  createPlannedPresetRoundSupplyScheduleV1({
    proposedEntries: paidAttempt.sanitizedOutput.openingDeploymentSchedule,
    rosterCandidate: sourcePlan.rosterCandidate, armyAudit, missionProfile,
  });
} catch (error) { paidRejection = error; }
assert.equal(paidRejection?.message,
  "PLANNED_PRESET_ROUND_SUPPLY_EXCEEDED");
assert.deepEqual(paidRejection?.details, {
  round: 2, capacity: 8, committedSupply: 13, overflow: 5,
  capacityIsCumulativeOnTable: true,
});

assert.throws(() => createStarcraftTmgRosterTurnPlanSeedV1({
  rosterPlan: sourcePlan, sessionReceipt: draft.sessionReceipt,
}), /ROSTER_TURN_PLAN_ROUND_SUPPLY_SCHEDULE_REQUIRED/u);

const firstRoundByUnit = new Map([
  ["agent-unit-1", 1], ["agent-unit-2", 1],
  ["agent-unit-3", 2], ["agent-unit-4", 3],
  ["agent-unit-5", 1], ["agent-unit-6", 4],
  ["agent-unit-7", 1], ["agent-unit-8", 5],
]);
const proposedEntries = sourcePlan.rosterCandidate.units.map((unit) => ({
  unitInstanceId: unit.unitInstanceId,
  round: firstRoundByUnit.get(unit.unitInstanceId),
  publicReasonText: `Focused contract fixture for ${unit.unitInstanceId}`,
}));
const schedule = createPlannedPresetRoundSupplyScheduleV1({
  proposedEntries, rosterCandidate: sourcePlan.rosterCandidate,
  armyAudit, missionProfile,
});
assert.deepEqual(schedule.rounds.map((entry) => entry.committedSupply),
  [6, 8, 10, 12, 13]);
assert.deepEqual(schedule.rounds.map((entry) => entry.capacity),
  [6, 8, 10, 12, null]);

const plan = createAgentScheduledRosterPlanV1({
  sourcePlan, openingDeploymentSchedule: schedule,
  armyAudit, missionProfile,
});
assert.equal(plan.sourcePlanHash, sourcePlan.planHash);
assert.equal(plan.openingDeploymentSchedule.scheduleHash,
  schedule.scheduleHash);
assert.equal(verifyAgentScheduledRosterPlanRoundTripV1(plan), true);
assert.throws(() => verifyAgentScheduledRosterPlanV1({
  ...plan, openingDeploymentSchedule: { ...schedule, scheduleHash: "0".repeat(64) },
}), /AGENT_SCHEDULED_PLAN_INVALID|PLANNED_PRESET_ROUND_SUPPLY_SCHEDULE_INVALID/u);
assert.throws(() => createPlannedPresetRoundSupplyScheduleV1({
  proposedEntries: proposedEntries.map((entry) => ({ ...entry, round: 1 })),
  rosterCandidate: sourcePlan.rosterCandidate, armyAudit, missionProfile,
}), /PLANNED_PRESET_ROUND_SUPPLY_EXCEEDED/u);

const { receiptHash, ...oldReceiptBody } = draft.sessionReceipt;
const receiptBody = { ...oldReceiptBody, planHash: plan.planHash,
  openingDeploymentScheduleHash: schedule.scheduleHash };
const sessionReceipt = { ...receiptBody,
  receiptHash: hashStarcraftTmgContract(receiptBody) };
assert.throws(() => createStarcraftTmgRosterTurnPlanSeedV1({
  rosterPlan: plan, sessionReceipt,
}), /ROSTER_TURN_PLAN_ROOM_BINDING_MISMATCH/u);

process.stdout.write(JSON.stringify({
  result: "pass", savedRosterHash: sourcePlan.rosterCandidate.candidateHash,
  sourcePlanHash: sourcePlan.planHash, scheduledPlanHash: plan.planHash,
  scheduleHash: schedule.scheduleHash, roundSupply: schedule.rounds,
  paidAttemptRejection: paidRejection.details,
  providerCalls: 0, roomMutations: 0,
}) + "\n");
