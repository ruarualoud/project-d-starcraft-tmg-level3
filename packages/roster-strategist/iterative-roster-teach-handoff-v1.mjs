import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyArmyBuilderRosterVerdictV1 } from
  "./army-builder-query-port-v1.mjs";
import { verifyPlannedPresetRoundSupplyScheduleV1 } from
  "./planned-preset-roster-plan-v2.mjs";
import { createRosterCandidateV1, verifyRosterCandidateV1 } from
  "./roster-plan-contracts-v1.mjs";
import { createVerifiedBuilderLockedRosterForTeachV1,
  verifyVerifiedPresetRosterLockV1 } from
  "./verified-preset-roster-lock-v1.mjs";
import { collectIterativeRosterEvidenceV1 } from './iterative-roster-tool-port-v1.mjs';

export const ITERATIVE_ROSTER_TEACH_HANDOFF_V1 =
  "starcraft_tmg_iterative_roster_teach_handoff_v1";

function fail(code) { throw Object.assign(new Error(code), { code }); }
const copy = (value) => structuredClone(value);

export function verifyIterativeRosterSelectionEvidenceV1(selectionEvidence, { candidateHash, mapHash }) {
  const { evidenceHash, ...body } = selectionEvidence || {};
  if (body.schema !== 'starcraft_tmg_roster_selection_evidence_v1'
    || evidenceHash !== hashStarcraftTmgContract(body)
    || body.candidateHash !== candidateHash || body.mapHash !== mapHash)
    fail('ITERATIVE_ROSTER_TEACH_EVIDENCE_SOURCE_INVALID');
  return true;
}

export function verifyIterativeRosterTeachHandoffV1(handoff,
  armyBuilderPort, missionProfile) {
  const { handoffHash, lockedRoster, rosterCandidate,
    openingDeploymentSchedule, iterativePlanAdvisory,
    selectedMapRouteReceipt, selectionEvidence, ...body } = handoff || {};
  if (body.schema !== ITERATIVE_ROSTER_TEACH_HANDOFF_V1
    || body.selectedByAgentDeliberation !== true
    || body.planMayEnterRoomNow !== false
    || hashStarcraftTmgContract(body) !== handoffHash
    || !lockedRoster?.lock || !rosterCandidate
    || selectedMapRouteReceipt?.status !== "certified"
    || selectedMapRouteReceipt.receiptHash !== body.mapRouteReceiptHash
    || body.lockedRosterHash !== lockedRoster.lock.lockHash
    || body.lockedCandidateHash
      !== lockedRoster.lock.candidate.candidateHash
    || body.sharedRulesAuditResultHash
      !== lockedRoster.lock.verdict.auditResultHash
    || body.selectedCandidateId !== rosterCandidate.candidateId
    || body.arrivalScheduleHash !== openingDeploymentSchedule?.scheduleHash) {
    fail("ITERATIVE_ROSTER_TEACH_HANDOFF_INVALID");
  }
  verifyVerifiedPresetRosterLockV1(lockedRoster.lock, armyBuilderPort);
  verifyRosterCandidateV1(rosterCandidate);
  verifyPlannedPresetRoundSupplyScheduleV1(openingDeploymentSchedule,
    rosterCandidate, lockedRoster.lock.verdict.audit, missionProfile);
  if (iterativePlanAdvisory?.candidateHash !== body.iterativeCandidateHash
    || hashStarcraftTmgContract(iterativePlanAdvisory) !== body.iterativeRouteHash) {
    fail("ITERATIVE_ROSTER_TEACH_STRATEGY_SOURCE_INVALID");
  }
  if (selectionEvidence) {
    verifyIterativeRosterSelectionEvidenceV1(selectionEvidence, {
      candidateHash: body.iterativeCandidateHash,
      mapHash: selectedMapRouteReceipt.mapBinding.roomFreezeHash });
  }
  return true;
}

// The fixed-list Teach route is reused only after the Agent has selected its
// list. This receipt retains who selected it; the temporary preset lock is a
// mutation guard, not a claim that the human supplied the roster.
export function prepareIterativeRosterTeachHandoffV1({ state,
  armyBuilderPort, missionProfile } = {}) {
  const current = state?.currentCandidate;
  const selected = current?.input;
  if (state?.status !== "paused" || !selected
    || selected.sideKey !== state.frozenContext?.sideKey
    || selected.factionRecordKey !== state.frozenContext?.factionRecordKey
    || selected.scaleId !== state.frozenContext?.scaleId
    || selected.mineralBudget !== state.mineralBudget
    || current.mineralSpent !== state.mineralBudget
    || state.arrivalPublicRevision?.publicAudit?.status
      !== "unit_references_verified"
    || !state.openingDeploymentSchedule
    || typeof armyBuilderPort?.evaluateRosterCandidate !== "function") {
    fail("ITERATIVE_ROSTER_TEACH_SOURCE_NOT_READY");
  }
  const { candidateId, ...candidateInput } = selected;
  if (typeof candidateId !== "string" || !candidateId
    || !Array.isArray(candidateInput.units) || !candidateInput.units.length) {
    fail("ITERATIVE_ROSTER_TEACH_CANDIDATE_INVALID");
  }
  const originalVerdict = armyBuilderPort.evaluateRosterCandidate(
    copy(selected));
  verifyArmyBuilderRosterVerdictV1(originalVerdict);
  if (originalVerdict.candidateHash !== current.candidateHash
    || originalVerdict.verdictHash !== current.verdictHash) {
    fail("ITERATIVE_ROSTER_TEACH_SOURCE_VERDICT_DRIFT");
  }
  const mapRoute = state.observations?.filter((entry) =>
    entry.query?.kind === "map_route"
      && entry.query.candidateHash === current.candidateHash
      && entry.receipt?.receiptHash === state.plan?.mapEvidenceHash
      && entry.receipt?.candidateHash === current.candidateHash
      && entry.receipt?.mapBinding?.roomFreezeHash === state.frozenContext.mapHash
      && entry.receipt?.status === "certified") || [];
  if (mapRoute.length === 0) fail("ITERATIVE_ROSTER_TEACH_MAP_ROUTE_UNBOUND");
  // Re-reading an immutable receipt creates another journal event, not another
  // authority. Require one distinct complete body, rather than one read event.
  // A reused ID with conflicting contents must not be silently deduplicated.
  if (new Set(mapRoute.map(entry => hashStarcraftTmgContract(entry.receipt))).size !== 1)
    fail('ITERATIVE_ROSTER_TEACH_MAP_ROUTE_CONFLICT');
  const lockedRoster = createVerifiedBuilderLockedRosterForTeachV1({
    candidateInput: copy(candidateInput), armyBuilderPort,
    planId: `agent-selected-${state.sessionId}`,
    presetSource: "iterative_agent_selection_locked_for_teach_only",
  });
  const verdict = lockedRoster.lock.verdict;
  verifyArmyBuilderRosterVerdictV1(verdict);
  if (verdict.auditResultHash !== originalVerdict.auditResultHash
    || verdict.summary?.mineralSpent !== state.mineralBudget) {
    fail("ITERATIVE_ROSTER_TEACH_BUILDER_DRIFT");
  }
  const rosterCandidate = createRosterCandidateV1({
    candidateId, sideKey: candidateInput.sideKey,
    factionRecordKey: candidateInput.factionRecordKey,
    scaleId: candidateInput.scaleId,
    mineralBudget: candidateInput.mineralBudget,
    tacticalCardRecordKeys: candidateInput.tacticalCardRecordKeys,
    units: candidateInput.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeSelections: unit.upgrades,
    })),
    legalityStatus: "legal",
    legalityReceipt: { auditResultHash: verdict.auditResultHash },
  });
  verifyPlannedPresetRoundSupplyScheduleV1(
    state.openingDeploymentSchedule, rosterCandidate,
    verdict.audit, missionProfile);
  // Acceptance is a new event, not a new taught army/strategy snapshot. Bind
  // promotion to that accepted source revision while rebuilding every actual
  // army, route and arrival field from current Rules-checked state. Any real
  // source change still produces a different handoff and fails old promotion.
  const feedback = state.teachFeedback;
  const acceptedSource = feedback?.sourceStrategy;
  const acceptedRevision = feedback?.disposition === "accepted"
    && feedback.candidateHash === current.candidateHash
    && acceptedSource?.iterativeSessionId === state.sessionId
    && acceptedSource.candidateHash === current.candidateHash
    && acceptedSource.planHash === hashStarcraftTmgContract(state.plan)
    && Number.isSafeInteger(acceptedSource.iterativeRevision)
    && acceptedSource.iterativeRevision >= 0
    && acceptedSource.iterativeRevision <= state.revision
      ? acceptedSource.iterativeRevision : state.revision;
  const body = {
    schema: ITERATIVE_ROSTER_TEACH_HANDOFF_V1,
    iterativeSessionId: state.sessionId,
    iterativeRevision: acceptedRevision,
    iterativeCandidateHash: current.candidateHash,
    selectedCandidateId: candidateId,
    selectedByAgentDeliberation: true,
    modelSelectionLockedAfterAgentSelection: true,
    ...(state.teachFeedbackPolicy ? {
      teachFeedbackPolicy: state.teachFeedbackPolicy } : {}),
    ...(state.selectionJustificationPolicyVersion ? {
      selectionJustificationPolicyVersion: state.selectionJustificationPolicyVersion } : {}),
    lockedRosterHash: lockedRoster.lock.lockHash,
    lockedCandidateHash: lockedRoster.lock.candidate.candidateHash,
    agentSelectedVerdictHash: originalVerdict.verdictHash,
    lockedVerdictHash: verdict.verdictHash,
    sharedRulesAuditResultHash: verdict.auditResultHash,
    arrivalScheduleHash: state.openingDeploymentSchedule.scheduleHash,
    mapRouteReceiptHash: mapRoute[0].receipt.receiptHash,
    iterativeRouteHash: hashStarcraftTmgContract(state.plan),
    publicRevisionOutputHash: state.arrivalPublicRevision.outputHash,
    nextStatus: "awaiting_locked_roster_teach_and_formal_review",
    planMayEnterRoomNow: false,
    trainingTruth: false,
  };
  const handoff = Object.freeze({
    ...body, handoffHash: hashStarcraftTmgContract(body),
    lockedRoster, rosterCandidate,
    openingDeploymentSchedule: copy(state.openingDeploymentSchedule),
    iterativePlanAdvisory: copy(state.plan),
    selectedMapRouteReceipt: copy(mapRoute[0].receipt),
    // Additive evidence attachment does not change the existing army/Plan
    // identity; its contents and candidate/map binding are verified separately.
    selectionEvidence: collectIterativeRosterEvidenceV1(state),
  });
  verifyIterativeRosterTeachHandoffV1(handoff, armyBuilderPort,
    missionProfile);
  return handoff;
}
