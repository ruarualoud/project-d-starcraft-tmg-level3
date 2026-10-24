import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { ROSTER_PLAN_SCHEMA, verifyRosterPlanV1 } from
  "./roster-plan-contracts-v1.mjs";
import { verifyPlannedPresetRoundSupplyScheduleV1 } from
  "./planned-preset-roster-plan-v2.mjs";

export const AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA =
  "starcraft_tmg_agent_scheduled_roster_plan_v1";

function fail(code) { throw new Error(code); }
function frozen(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) frozen(child);
  return Object.freeze(value);
}
function withoutHash(plan) {
  const { planHash, ...body } = plan;
  return body;
}

// A scheduled Agent list is a new artifact, not an in-place rewrite of the
// previously paid v1 plan. The schedule is the Agent's choice; its numeric
// Supply and complete Unit coverage come only from the Rules audit.
export function createAgentScheduledRosterPlanV1(input = {}) {
  const sourcePlan = input.sourcePlan;
  verifyRosterPlanV1(sourcePlan);
  if (sourcePlan.presetRoster !== false
    || !["active", "revised"].includes(sourcePlan.planStatus)) {
    fail("AGENT_SCHEDULED_SOURCE_PLAN_INVALID");
  }
  verifyPlannedPresetRoundSupplyScheduleV1(
    input.openingDeploymentSchedule, sourcePlan.rosterCandidate,
    input.armyAudit, input.missionProfile);
  const body = {
    ...withoutHash(sourcePlan),
    schema: AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
    sourcePlanHash: sourcePlan.planHash,
    openingDeploymentSchedule: input.openingDeploymentSchedule,
  };
  const plan = { ...body, planHash: hashStarcraftTmgContract(body) };
  verifyAgentScheduledRosterPlanV1(plan);
  return frozen(plan);
}

export function verifyAgentScheduledRosterPlanV1(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)
    || plan.schema !== AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
    || plan.presetRoster !== false
    || !["active", "revised"].includes(plan.planStatus)
    || hashStarcraftTmgContract(withoutHash(plan)) !== plan.planHash) {
    fail("AGENT_SCHEDULED_PLAN_INVALID");
  }
  verifyPlannedPresetRoundSupplyScheduleV1(
    plan.openingDeploymentSchedule, plan.rosterCandidate);
  const { sourcePlanHash, openingDeploymentSchedule, ...baseBody } =
    withoutHash(plan);
  const sourceBody = { ...baseBody, schema: ROSTER_PLAN_SCHEMA };
  const sourcePlan = {
    ...sourceBody, planHash: hashStarcraftTmgContract(sourceBody),
  };
  verifyRosterPlanV1(sourcePlan);
  if (sourcePlanHash !== sourcePlan.planHash) {
    fail("AGENT_SCHEDULED_SOURCE_HASH_DRIFT");
  }
  return true;
}

// Room admission verifies every intervening version, not an arbitrary
// lifetime count. A three-round review convergence limit is not a limit on
// how many source-bound plan revisions may exist across recovery cycles.
export function verifyAgentScheduledRosterPlanRevisionLineageV1({
  initialPlanHash, initialPlanVersion, intermediatePlans = [], finalPlan,
} = {}) {
  const invalid = () => fail("AGENT_SCHEDULED_REVISION_LINEAGE_INVALID");
  if (typeof initialPlanHash !== "string"
    || !/^[a-f0-9]{64}$/u.test(initialPlanHash)
    || !Number.isSafeInteger(initialPlanVersion)
    || initialPlanVersion < 1
    || !Array.isArray(intermediatePlans)
    || !finalPlan) invalid();
  // A first-pass plan with a clean final review has no revision event. It is
  // still a valid lineage, but only when it is byte-identical to the promoted
  // initial plan; a changed plan cannot use the empty chain to skip review.
  if (intermediatePlans.length === 0
    && finalPlan.revisions?.length === 0) {
    verifyAgentScheduledRosterPlanV1(finalPlan);
    if (finalPlan.planHash !== initialPlanHash
      || finalPlan.planVersion !== initialPlanVersion) invalid();
    return Object.freeze({ revisionCount: 0,
      initialPlanHash, finalPlanHash: finalPlan.planHash });
  }
  const chain = [...intermediatePlans, finalPlan];
  if (chain.length !== finalPlan.revisions?.length) invalid();
  for (const [index, current] of chain.entries()) {
    verifyAgentScheduledRosterPlanV1(current);
    const previous = index === 0 ? null : chain[index - 1];
    const expectedPreviousHash = previous?.planHash || initialPlanHash;
    const revision = current.revisions?.[index];
    if (current.planVersion !== initialPlanVersion + index + 1
      || current.revisions.length !== index + 1
      || revision?.previousPlanHash !== expectedPreviousHash
      || revision.toPlanVersion !== current.planVersion
      || previous && (!isDeepStrictEqual(
        current.revisions.slice(0, -1), previous.revisions)
        || current.planId !== previous.planId
        || current.sideKey !== previous.sideKey
        || current.rosterCandidate.candidateHash
          !== previous.rosterCandidate.candidateHash
        || current.openingDeploymentSchedule.scheduleHash
          !== previous.openingDeploymentSchedule.scheduleHash
        || current.provenance?.provenanceHash
          !== previous.provenance?.provenanceHash)) invalid();
  }
  return Object.freeze({ revisionCount: chain.length,
    initialPlanHash, finalPlanHash: finalPlan.planHash });
}

export function serializeAgentScheduledRosterPlanV1(plan) {
  verifyAgentScheduledRosterPlanV1(plan);
  return JSON.stringify(plan);
}

export function parseAgentScheduledRosterPlanV1(serialized) {
  let plan;
  try { plan = JSON.parse(String(serialized)); }
  catch { fail("AGENT_SCHEDULED_PLAN_SERIALIZATION_INVALID"); }
  verifyAgentScheduledRosterPlanV1(plan);
  return frozen(plan);
}

export function verifyAgentScheduledRosterPlanRoundTripV1(plan) {
  const restored = parseAgentScheduledRosterPlanV1(
    serializeAgentScheduledRosterPlanV1(plan));
  if (!isDeepStrictEqual(restored, plan)) {
    fail("AGENT_SCHEDULED_PLAN_ROUND_TRIP_DRIFT");
  }
  return true;
}
