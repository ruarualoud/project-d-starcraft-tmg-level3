import { fail, seal, verifySeal } from '../skill-production/common.mjs';

const VERSION = 'directed_matchup_user_reset_budget_epoch_v1';
const AUTHORITY = 'user_2026_09_11_reset_directed_matchup_budget_at_zero';
const STEP = 100_000_000;
const invalid = suffix => fail('MATCHUP_BUDGET_EPOCH_' + suffix);

function validateLedger(ledger, { allowActiveIntents = false } = {}) {
  verifySeal(ledger);
  if (!Number.isSafeInteger(ledger.attempts) || ledger.attempts < 0
    || !Number.isSafeInteger(ledger.cumulativeTokens) || ledger.cumulativeTokens < 0
    || !Number.isSafeInteger(ledger.cumulativeEstimateMicros) || ledger.cumulativeEstimateMicros < 0
    || !Number.isSafeInteger(ledger.intentCount) || ledger.intentCount < 0
    || !Number.isSafeInteger(ledger.paymentRequiredCount) || ledger.paymentRequiredCount < 0) invalid('LEDGER');
  if (ledger.paymentRequiredCount) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  if (ledger.intentCount && !allowActiveIntents) fail('AMBIGUOUS_EGRESS_NO_RETRY');
  return ledger;
}

// Reset only the user's stage-cost display. The authoritative SQLite rows and
// historical totals remain untouched and continue to detect payment/egress.
export function createMatchupBudgetEpochV1({ ledger, now = new Date().toISOString() }) {
  validateLedger(ledger);
  if (!Number.isFinite(Date.parse(now))) invalid('CLOCK');
  return seal({
    version: VERSION,
    authority: AUTHORITY,
    startedAt: now,
    globalBaseline: {
      attempts: ledger.attempts,
      tokens: ledger.cumulativeTokens,
      estimateMicros: ledger.cumulativeEstimateMicros,
      ledgerHash: ledger.ledgerHash,
    },
    notificationStepMicros: STEP,
    nextNotificationThresholdMicros: STEP,
    epochStartsAtZero: true,
    historicalLedgerPreserved: true,
    accountingReset: false,
    invoice: false,
    paymentRequiredStopsAllWork: true,
    ambiguousEgressStopsNewCalls: true,
    trainingTruth: false,
  });
}

export function verifyMatchupBudgetEpochV1(epoch) {
  verifySeal(epoch);
  const baseline = epoch.globalBaseline;
  if (epoch.version !== VERSION || epoch.authority !== AUTHORITY
    || !Number.isFinite(Date.parse(epoch.startedAt))
    || epoch.notificationStepMicros !== STEP
    || epoch.nextNotificationThresholdMicros !== STEP
    || epoch.epochStartsAtZero !== true || epoch.historicalLedgerPreserved !== true
    || epoch.accountingReset !== false || epoch.invoice !== false
    || epoch.paymentRequiredStopsAllWork !== true
    || epoch.ambiguousEgressStopsNewCalls !== true || epoch.trainingTruth !== false
    || !Number.isSafeInteger(baseline?.attempts) || baseline.attempts < 0
    || !Number.isSafeInteger(baseline?.tokens) || baseline.tokens < 0
    || !Number.isSafeInteger(baseline?.estimateMicros) || baseline.estimateMicros < 0
    || !/^[a-f0-9]{64}$/u.test(baseline?.ledgerHash || '')) invalid('INVALID');
  return epoch;
}

export function matchupBudgetEpochProgressV1({ epoch, ledger, allowActiveIntents = false }) {
  verifyMatchupBudgetEpochV1(epoch); validateLedger(ledger, { allowActiveIntents });
  const attempts = ledger.attempts - epoch.globalBaseline.attempts;
  const tokens = ledger.cumulativeTokens - epoch.globalBaseline.tokens;
  const estimateMicros = ledger.cumulativeEstimateMicros - epoch.globalBaseline.estimateMicros;
  if ([attempts, tokens, estimateMicros].some(value => !Number.isSafeInteger(value) || value < 0)) {
    invalid('BASELINE_DRIFT');
  }
  return seal({
    version: 'directed_matchup_budget_epoch_progress_v1',
    epochHash: epoch.hash,
    attempts,
    tokens,
    estimateMicros,
    estimateCny: estimateMicros / 1_000_000,
    nextNotificationThresholdMicros: (Math.floor(estimateMicros / STEP) + 1) * STEP,
    historicalLedgerPreserved: true,
    invoice: false,
    trainingTruth: false,
  });
}
