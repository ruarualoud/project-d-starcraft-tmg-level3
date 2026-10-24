// Resume an already opened match from its frozen pregame draft without
// rebuilding the isolated Rules/Skill planning laboratory. This is read-only;
// the live Room and turn-plan journal remain the authorities for play.

import { isDeepStrictEqual } from "node:util";

import { createRosterPlanningDraftStoreV1 } from
  "./roster-planning-draft-store-v1.mjs";
import { ROSTER_PLAN_SCHEMA, parseRosterPlanV1 } from
  "../roster-strategist/roster-plan-contracts-v1.mjs";
import {
  PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  parsePlannedPresetRosterPlanV2,
} from "../roster-strategist/planned-preset-roster-plan-v2.mjs";
import {
  AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  parseAgentScheduledRosterPlanV1,
} from "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { verifyRosterFinalPlanReviewAdjudicationV1 } from
  "../roster-strategist/roster-final-plan-review-v1.mjs";
import { collectRosterClaimRepairBacklogV1 } from
  "../roster-strategist/roster-claim-repair-backlog-v1.mjs";

function parsePlan(serialized) {
  let shape;
  try { shape = JSON.parse(serialized); }
  catch { throw new Error("SLICE272_RESUME_PLAN_SERIALIZATION_INVALID"); }
  const parse = shape?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA
    ? parsePlannedPresetRosterPlanV2
    : shape?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
      ? parseAgentScheduledRosterPlanV1
      : shape?.schema === ROSTER_PLAN_SCHEMA ? parseRosterPlanV1 : null;
  if (!parse) throw new Error("SLICE272_RESUME_PLAN_SCHEMA_UNSUPPORTED");
  return parse(serialized);
}

export async function loadPregameResumeDraftV1({
  dataDirectory, sessionId, expectedPlanHash,
}) {
  const draft = await createRosterPlanningDraftStoreV1({
    directory: dataDirectory,
  }).load(sessionId);
  if (!draft || draft.status !== "planned"
    || typeof draft.planSerialized !== "string") {
    throw new Error(`ROSTER_WORKSPACE_SESSION_NOT_FOUND:${sessionId}`);
  }
  // A later offline revision must not strand an already admitted Room, nor
  // silently replace its exact original Plan. The caller supplies its binding.
  const serialized = [draft.planSerialized, ...(draft.planVersionHistory || [])]
    .find(value => JSON.parse(value).planHash === expectedPlanHash);
  if (!serialized) throw new Error("SLICE272_PREGAME_PLAN_UNAVAILABLE_OR_DRIFTED");
  const plan = parsePlan(serialized);
  if (plan.planHash !== expectedPlanHash
    || !["active", "revised"].includes(plan.planStatus)) {
    throw new Error("SLICE272_PREGAME_PLAN_UNAVAILABLE_OR_DRIFTED");
  }
  const selectedIndex = (draft.candidates || []).findIndex((candidate) =>
    candidate.candidateId === plan.rosterCandidate?.candidateId);
  const candidateInput = draft.candidateInputs?.[selectedIndex] || null;
  if (selectedIndex < 0 || !candidateInput
    || draft.candidates[selectedIndex].candidateHash
      !== plan.rosterCandidate.candidateHash
    || !isDeepStrictEqual(candidateInput, draft.selectedCandidateInput)) {
    throw new Error("SLICE272_PREGAME_SELECTED_ROSTER_UNAVAILABLE");
  }
  return {
    status: draft.status,
    plan,
    candidates: [{ candidate: draft.candidates[selectedIndex],
      candidateInput }],
    source: "frozen_pregame_draft_resume",
    trainingTruth: false,
  };
}

// This only prepares an explicit reviewed descendant. The TurnPlan consumer
// still checks the real same-Room origin, receipt and frozen dependencies.
// It is not another pregame roster promotion and never changes the army.
export async function loadReviewedPregameRevisionV1({
  dataDirectory, sessionId, expectedPlanHash, requestedPlanHash,
}) {
  const draft = await createRosterPlanningDraftStoreV1({ directory: dataDirectory }).load(sessionId);
  if (!draft || draft.status !== "planned" || draft.planEvidenceStale === true) {
    throw new Error("ROSTER_PLAN_RESUME_REVISION_NOT_READY");
  }
  const plan = parsePlan(draft.planSerialized);
  const priorPlans = (draft.planVersionHistory || []).map(parsePlan);
  const previous = [plan, ...priorPlans].find(p => p.planHash === expectedPlanHash);
  if (plan.planHash !== requestedPlanHash || !previous
    || plan.planId !== previous.planId || plan.schema !== previous.schema
    || plan.sideKey !== previous.sideKey
    || !isDeepStrictEqual(plan.rosterCandidate, previous.rosterCandidate)
    || !isDeepStrictEqual(plan.openingDeploymentSchedule, previous.openingDeploymentSchedule)
    || !isDeepStrictEqual(plan.provenance, previous.provenance)
    || (plan.planHash !== expectedPlanHash && !plan.revisions.some(event =>
      event.previousPlanHash === expectedPlanHash && event.fromPlanVersion === previous.planVersion))) {
    throw new Error("ROSTER_PLAN_RESUME_REVISION_FROZEN_BINDING_CHANGED");
  }
  const wrapper = draft.planReview;
  if (wrapper?.status !== "completed" || wrapper.planHash !== plan.planHash
    || wrapper.review?.planHash !== plan.planHash || !draft.sessionReceipt) {
    throw new Error("ROSTER_PLAN_RESUME_REVISION_REVIEW_REQUIRED");
  }
  const resolution = verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: wrapper.review });
  const pending = collectRosterClaimRepairBacklogV1({ ...draft, plan, planVersionHistory: priorPlans });
  if (resolution.criticalCount || resolution.unresolvedHighCount || pending.length) {
    throw new Error("ROSTER_PLAN_RESUME_REVISION_UNRESOLVED_CLAIMS");
  }
  return { plan, priorPlans, sessionReceipt: draft.sessionReceipt,
    replacesRosterPlanHash: expectedPlanHash, finalReviewHash: wrapper.review.reviewHash,
    selectedCandidateInput: draft.selectedCandidateInput, trainingTruth: false };
}
