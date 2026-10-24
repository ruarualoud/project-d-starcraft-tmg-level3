// Read-only evidence check for arithmetic receipts cited by a roster plan.
// A valid receipt proves its original inputs, not a later revised VP target.
import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PLAN_SOURCE_AUDIT_SCHEMA =
  "starcraft_tmg_roster_plan_source_audit_v1";
export const ROSTER_PLAN_SOURCE_AUDIT_VERSION = "1.2.0";

function scheduleRows(values) {
  return Array.isArray(values) ? values.map((entry) => ({
    window: entry?.window ?? null,
    plannedCumulativeVp: entry?.plannedCumulativeVp ?? null,
  })) : [];
}

function claimsCurrentValidation(routeText, receiptHash) {
  const sentence = routeText.split(/(?<=[.!?])\s+/u).find((entry) => (
    entry.includes(receiptHash))) || "";
  return /\b(?:confirms?|validates?|verifies?|proves?|supports?)\b|证实|验证|证明/iu
    .test(sentence)
    && !/\b(?:stale|obsolete|does not|cannot|no longer|not valid|not applicable)\b|过期|不适用|不能验证/iu
      .test(sentence);
}

export function auditRosterPlanVpReceiptsV1({ plan,
  toolReceipts = [] } = {}) {
  const target = scheduleRows(plan?.scoreRoute?.targetVpSchedule);
  const routeText = String(plan?.scoreRoute?.routeText || "");
  const seen = new Set();
  const citedMathReceipts = [];
  for (const receipt of toolReceipts) {
    if (receipt?.schema !== "starcraft_tmg_pregame_lab_math_receipt_v1"
      || receipt.mathKind !== "vp_schedule_delta"
      || !/^[a-f0-9]{64}$/u.test(String(receipt.receiptHash || ""))
      || seen.has(receipt.receiptHash)
      || !routeText.includes(receipt.receiptHash)) continue;
    seen.add(receipt.receiptHash);
    const inputRows = scheduleRows(receipt.result?.deltas);
    const projectedRows = (receipt.result?.deltas || []).map((entry) => ({
      window: entry.window,
      projectedCumulativeVp: entry.projectedCumulativeVp ?? null,
      projectionStatus: entry.projectionStatus ?? null,
    }));
    const targetByWindow = new Map(target.map((entry) => (
      [entry.window, entry.plannedCumulativeVp])));
    const inputWindows = new Set(inputRows.map((entry) => entry.window));
    const missingTargetRows = target.filter((entry) => (
      !inputWindows.has(entry.window)));
    const inputScheduleMatchesCurrentTarget = receipt.resultStatus === "ok"
      && target.length > 0 && inputRows.length > 0
      && inputRows.every((entry) => targetByWindow.has(entry.window)
        && targetByWindow.get(entry.window) === entry.plannedCumulativeVp)
      && missingTargetRows.every((entry) => entry.plannedCumulativeVp === 0);
    citedMathReceipts.push({ receiptHash: receipt.receiptHash,
      resultStatus: receipt.resultStatus,
      inputRows, projectedRows,
      inputScheduleMatchesCurrentTarget,
      missingZeroTargetWindows: missingTargetRows.filter((entry) =>
        entry.plannedCumulativeVp === 0).map((entry) => entry.window),
      missingScoringTargetWindows: missingTargetRows.filter((entry) =>
        entry.plannedCumulativeVp !== 0).map((entry) => entry.window),
      projectionIsNotObservedScore: true,
      claimsCurrentValidation: claimsCurrentValidation(routeText,
        receipt.receiptHash) });
  }
  const body = { schema: ROSTER_PLAN_SOURCE_AUDIT_SCHEMA,
    version: ROSTER_PLAN_SOURCE_AUDIT_VERSION,
    planHash: plan?.planHash ?? null,
    targetVpSchedule: target,
    citedMathReceipts,
    staleCitationHashes: citedMathReceipts.filter((entry) => (
      !entry.inputScheduleMatchesCurrentTarget)).map((entry) =>
      entry.receiptHash),
    misappliedCitationHashes: citedMathReceipts.filter((entry) => (
      !entry.inputScheduleMatchesCurrentTarget
        && entry.claimsCurrentValidation))
      .map((entry) => entry.receiptHash),
    arithmeticDoesNotProveMarkerControl: true,
    planMutation: false,
    trainingTruth: false };
  return Object.freeze({ ...body,
    auditHash: hashStarcraftTmgContract(body) });
}
