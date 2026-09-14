import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

const version = 'faction_user_reset_budget_epoch_v4';
const authority = 'user_2026_09_09_restart_budget_at_zero_release_old_limits';
const invalid = suffix => fail('FACTION_BUDGET_EPOCH_' + suffix);
const allowance = Object.freeze({ calls: 1000, tokens: 360_000_000, costMicros: 100_000_000 });
const totals = rows => ({ calls: rows.length,
  costMicros: rows.reduce((n, r) => n + (r.settled ?? r.reserve), 0),
  tokens: rows.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits
    : r.state === 'not_sent' ? 0 : r.token_reserve), 0),
  knownTokens: rows.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : 0), 0) });

// A budget epoch is an authorization/accounting view, NOT a ledger rewrite.
// Unknown historical charges remain in their original rows and are disclosed.
export function createFactionBudgetEpochV1({ filename, parent, now = new Date().toISOString() }) {
  verifySeal(parent);
  if (!parent.budgetExtension || !Number.isFinite(Date.parse(now))) invalid('PARENT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    const runId = 'faction-v1-' + parent.hash.slice(0, 20);
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== parent.hash) invalid('OWNER');
    const rows = db.prepare('SELECT * FROM attempts ORDER BY run,id').all();
    if (rows.some(r => r.code === 'PROVIDER_PAYMENT_REQUIRED')) fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    if (rows.some(r => r.state === 'intent') || db.prepare("SELECT count(*) n FROM steps WHERE run=? AND state='running'").get(runId).n)
      invalid('ACTIVE_REQUEST');
    const local = totals(rows.filter(r => r.run === runId)), inherited = parent.continuation?.accounting || { calls: 0, tokens: 0, costMicros: 0 };
    const chainBaseline = Object.fromEntries(['calls', 'tokens', 'costMicros'].map(k => [k, local[k] + inherited[k]]));
    const nextLimits = { ...parent.limits, maxCalls: chainBaseline.calls + allowance.calls,
      maxTokens: chainBaseline.tokens + allowance.tokens, maxCostMicros: chainBaseline.costMicros + allowance.costMicros,
      maxWallMs: 7 * 24 * 60 * 60 * 1000 };
    return seal({ version, authority, parentRecipeHash: parent.hash, priorExtensionHash: parent.budgetExtension.hash,
      startedAt: now, chainBaseline, globalBaseline: totals(rows), historicalAttemptRowsHash: hash(rows),
      priorLimits: parent.limits, nextLimits, allowance, notificationStepMicros: 100_000_000,
      nextNotificationThresholdMicros: 100_000_000, historicalLedgerPreserved: true,
      historicalUnknownReservationsPreserved: true, oldLimitsReleased: true, epochStartsAtZero: true,
      refundClaimed: false, perRoleLimitsUnchanged: true, paymentRequiredStopsAllWork: true,
      trainingTruth: false });
  } finally { db.close(); }
}

export function isFactionBudgetEpochV1(extension) { return extension?.version === version; }

export function verifyFactionBudgetEpochV1({ parent, next }) {
  [parent, next, next.budgetExtension].forEach(verifySeal);
  const e = next.budgetExtension, same = isFactionBudgetEpochV1(parent.budgetExtension);
  if (!isFactionBudgetEpochV1(e) || e.authority !== authority || !Number.isFinite(Date.parse(e.startedAt))
    || hash(e.allowance) !== hash(allowance) || !e.epochStartsAtZero || !e.oldLimitsReleased
    || !e.historicalLedgerPreserved || !e.historicalUnknownReservationsPreserved || e.refundClaimed !== false
    || !e.paymentRequiredStopsAllWork || !e.perRoleLimitsUnchanged || e.trainingTruth !== false
    || e.nextNotificationThresholdMicros !== 100_000_000 || e.notificationStepMicros !== 100_000_000
    || !/^[a-f0-9]{64}$/u.test(e.historicalAttemptRowsHash || '')
    || ['calls', 'tokens', 'costMicros'].some(k => !Number.isSafeInteger(e.chainBaseline[k]) || e.chainBaseline[k] < 0)
    || ['calls', 'tokens', 'knownTokens', 'costMicros'].some(k => !Number.isSafeInteger(e.globalBaseline[k]) || e.globalBaseline[k] < 0)
    || same && parent.budgetExtension.hash !== e.hash
    || !same && (e.parentRecipeHash !== parent.hash || e.priorExtensionHash !== parent.budgetExtension?.hash
      || hash(e.priorLimits) !== hash(parent.limits))) invalid('AUTHORIZATION');
  const expected = { ...e.priorLimits, maxCalls: e.chainBaseline.calls + allowance.calls,
    maxTokens: e.chainBaseline.tokens + allowance.tokens, maxCostMicros: e.chainBaseline.costMicros + allowance.costMicros,
    maxWallMs: 7 * 24 * 60 * 60 * 1000 };
  if (hash(e.nextLimits) !== hash(expected) || hash(next.limits) !== hash(expected)) invalid('LIMIT_DRIFT');
  return seal({ extensionHash: e.hash, priorLimitsHash: hash(e.priorLimits), nextLimitsHash: hash(expected),
    authorization: 'user_budget_epoch_v4', historicalAccountingPreserved: true, epochStartsAtZero: true,
    perRoleLimitsUnchanged: true, trainingTruth: false });
}

export function factionBudgetEpochProgressV1({ extension, global }) {
  if (!isFactionBudgetEpochV1(extension)) return null;
  verifySeal(extension); verifySeal(global);
  const e = extension;
  const result = { epochHash: e.hash, startedAt: e.startedAt,
    calls: global.calls - e.globalBaseline.calls,
    knownTokens: global.knownTokens - e.globalBaseline.knownTokens,
    estimateOrReservedMicros: global.reservedOrSettledMicros - e.globalBaseline.costMicros,
    historicalLedgerPreserved: true, invoice: false };
  if ([result.calls, result.knownTokens, result.estimateOrReservedMicros].some(n => n < 0)) invalid('BASELINE_DRIFT');
  return seal({ ...result, nextNotificationThresholdMicros: (Math.floor(result.estimateOrReservedMicros / 100_000_000) + 1) * 100_000_000 });
}
