import { seal, integer, fail } from '../skill-production/common.mjs';

// Same conservative no-cache reservation units as the existing accounted
// model. This is not an invoice or an assumed cache discount. Use the complete
// configured request ceiling, not only the unescaped task string length.
export function checkDependencyRecheckBudgetV1(limits, plannedCalls = 2) {
  integer(limits.maxInputBytes, 8192, 1_000_000); integer(plannedCalls, 1, 8);
  const outputUnits = 4096;
  const singleRequestMicros = Math.ceil((limits.maxInputBytes * 440 + outputUnits * 1320) * 8 / 1000);
  const singleRequestTokens = limits.maxInputBytes + outputUnits;
  if (limits.maxCostMicros < singleRequestMicros * plannedCalls || limits.maxTokens < singleRequestTokens * plannedCalls
    || limits.maxCalls < plannedCalls) fail('DEPENDENCY_RECHECK_PREFLIGHT_RESERVATION_TOO_SMALL');
  return seal({ version: 'dependency_recheck_budget_preflight_v1', plannedCalls, singleRequestMicros, singleRequestTokens,
    plannedCeilingMicros: singleRequestMicros * plannedCalls, plannedCeilingTokens: singleRequestTokens * plannedCalls,
    reservationNotInvoice: true, cacheDiscountAssumed: false, trainingTruth: false });
}
