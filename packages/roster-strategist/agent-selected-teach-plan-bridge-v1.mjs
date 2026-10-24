import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createAgentScheduledRosterPlanV1 } from
  "./agent-scheduled-roster-plan-v1.mjs";
import { verifyPlannedPresetRosterPlanV2 } from
  "./planned-preset-roster-plan-v2.mjs";
import { createRosterPlanV1 } from
  "./roster-plan-contracts-v1.mjs";
import { verifyIterativeRosterTeachHandoffV1 } from
  "./iterative-roster-teach-handoff-v1.mjs";

export const AGENT_SELECTED_TEACH_PLAN_BRIDGE_V1 =
  "starcraft_tmg_agent_selected_teach_plan_bridge_v1";
export const AGENT_SELECTED_TEACH_SESSION_RECEIPT_V1 =
  "starcraft_tmg_agent_selected_teach_session_receipt_v1";

function fail(code) { throw Object.assign(new Error(code), { code }); }

export function verifyAgentSelectedTeachSessionReceiptV1(receipt) {
  if (!receipt || receipt.schema !== AGENT_SELECTED_TEACH_SESSION_RECEIPT_V1
    || receipt.selectedByAgentDeliberation !== true
    || receipt.teachModelReSelectedRoster !== false
    || receipt.trainingTruth !== false
    || !receipt.planId || !receipt.planHash
    || !receipt.rosterCandidateHash || !receipt.finalAuditResultHash
    || !receipt.provenanceHash || !receipt.openingDeploymentScheduleHash
    || !receipt.skillRouteReceiptHash || !receipt.agentSelectionHandoffHash
    || !receipt.lockedTeachSessionReceiptHash || !receipt.bridgeHash
    || receipt.receiptHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(receipt).filter(([key]) =>
        key !== "receiptHash")))) {
    fail("AGENT_SELECTED_TEACH_SESSION_RECEIPT_INVALID");
  }
  return true;
}

export function createAgentSelectedTeachSessionReceiptV1({ bridge,
  handoff, taughtSessionReceipt, armyBuilderPort,
  missionProfile } = {}) {
  verifyIterativeRosterTeachHandoffV1(handoff, armyBuilderPort,
    missionProfile);
  const plan = bridge?.plan;
  if (!plan || bridge.bridgeHash !== hashStarcraftTmgContract(
    Object.fromEntries(Object.entries(bridge).filter(([key]) =>
      key !== "bridgeHash" && key !== "plan")) )
    || bridge.finalPlanHash !== plan.planHash
    || bridge.handoffHash !== handoff.handoffHash
    || taughtSessionReceipt?.planHash !== bridge.lockedTeachPlanHash
    || taughtSessionReceipt?.finalAuditResultHash
      !== bridge.sharedRulesAuditResultHash) {
    fail("AGENT_SELECTED_TEACH_SESSION_RECEIPT_SOURCE_DRIFT");
  }
  const body = {
    schema: AGENT_SELECTED_TEACH_SESSION_RECEIPT_V1,
    sessionId: `agent-selected-teach:${handoff.iterativeSessionId}`,
    planId: plan.planId,
    planHash: plan.planHash,
    planStatus: plan.planStatus,
    rosterCandidateHash: plan.rosterCandidate.candidateHash,
    finalAuditResultHash: bridge.sharedRulesAuditResultHash,
    provenanceHash: plan.provenance.provenanceHash,
    openingDeploymentScheduleHash:
      plan.openingDeploymentSchedule.scheduleHash,
    skillRouteReceiptHash: taughtSessionReceipt.skillRouteReceiptHash,
    agentSelectionHandoffHash: handoff.handoffHash,
    iterativeCandidateHash: handoff.iterativeCandidateHash,
    lockedTeachSessionReceiptHash: taughtSessionReceipt.receiptHash,
    bridgeHash: bridge.bridgeHash,
    selectedByAgentDeliberation: true,
    teachModelReSelectedRoster: false,
    trainingTruth: false,
  };
  const receipt = Object.freeze({ ...body,
    receiptHash: hashStarcraftTmgContract(body) });
  verifyAgentSelectedTeachSessionReceiptV1(receipt);
  return receipt;
}

// The locked-preset runtime supplies Teach's strategy but must not become the
// source of the selected list. Rebind the reviewed text to the original Agent
// candidate and its independently Rules-checked arrival schedule.
export function createAgentSelectedTeachPlanBridgeV1({ handoff,
  taughtLockedPlan, armyBuilderPort, armyAudit, missionProfile } = {}) {
  verifyIterativeRosterTeachHandoffV1(handoff, armyBuilderPort,
    missionProfile);
  const { handoffHash, lockedRoster, rosterCandidate,
    openingDeploymentSchedule, selectedMapRouteReceipt } = handoff;
  verifyPlannedPresetRosterPlanV2(taughtLockedPlan);
  const binding = taughtLockedPlan.presetBinding;
  if (!["active", "revised"].includes(taughtLockedPlan.planStatus)
    || binding.presetSource
      !== "iterative_agent_selection_locked_for_teach_only"
    || binding.baselinePlanHash
      !== lockedRoster.baselinePlan.planHash
    || binding.candidateHash
      !== lockedRoster.lock.candidate.candidateHash
    || binding.armyAuditResultHash
      !== handoff.sharedRulesAuditResultHash
    || armyAudit?.resultHash !== handoff.sharedRulesAuditResultHash
    || !isDeepStrictEqual(taughtLockedPlan.rosterCandidate.units,
      rosterCandidate.units)
    || !isDeepStrictEqual(
      taughtLockedPlan.rosterCandidate.tacticalCardRecordKeys,
      rosterCandidate.tacticalCardRecordKeys)
    || selectedMapRouteReceipt.receiptHash
      !== handoff.mapRouteReceiptHash
    || selectedMapRouteReceipt.status !== "certified"
    || taughtLockedPlan.provenance?.missionBinding?.missionRecordKey
      !== selectedMapRouteReceipt.mapBinding?.missionRecordKey
    || taughtLockedPlan.provenance?.missionBinding?.deploymentRecordKey
      !== selectedMapRouteReceipt.mapBinding?.deploymentRecordKey) {
    fail("AGENT_SELECTED_TEACH_PLAN_SOURCE_DRIFT");
  }
  const basePlan = createRosterPlanV1({
    ...taughtLockedPlan,
    planId: `agent-selected-${handoff.iterativeSessionId}-plan`,
    planVersion: 1,
    presetRoster: false,
    presetBinding: null,
    rosterCandidate,
    revisions: [],
  });
  const plan = createAgentScheduledRosterPlanV1({
    sourcePlan: basePlan, openingDeploymentSchedule,
    armyAudit, missionProfile,
  });
  const body = {
    schema: AGENT_SELECTED_TEACH_PLAN_BRIDGE_V1,
    handoffHash,
    iterativeSessionId: handoff.iterativeSessionId,
    iterativeCandidateHash: handoff.iterativeCandidateHash,
    selectedByAgentDeliberation: true,
    lockedTeachPlanHash: taughtLockedPlan.planHash,
    lockedTeachCandidateHash: binding.candidateHash,
    originalAgentCandidateHash: rosterCandidate.candidateHash,
    sharedRulesAuditResultHash: handoff.sharedRulesAuditResultHash,
    originalArrivalScheduleHash: openingDeploymentSchedule.scheduleHash,
    originalMapRouteReceiptHash: handoff.mapRouteReceiptHash,
    finalPlanHash: plan.planHash,
    sourceAuditRequiredBeforeRoom: true,
    trainingTruth: false,
  };
  return Object.freeze({
    ...body, bridgeHash: hashStarcraftTmgContract(body), plan,
  });
}
