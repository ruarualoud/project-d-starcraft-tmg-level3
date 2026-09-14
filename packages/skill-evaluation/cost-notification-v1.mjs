import { fail, seal, verifySeal } from '../skill-production/common.mjs';

// A notification acknowledges a cost tier, not a budget reset or unlimited
// spend. Unknown usage must already be included conservatively by the ledger.
export function checkProductionCostNotificationV1({ cumulativeMicros, additionalMicros, notification = null }) {
  if (![cumulativeMicros, additionalMicros].every(v => Number.isSafeInteger(v) && v >= 0)) fail('PRODUCTION_COST_PROJECTION_INVALID');
  let nextThresholdMicros = 100000000;
  if (notification) {
    verifySeal(notification);
    if (notification.userNotified !== true || notification.cumulativeAccountingReset !== false
      || !Number.isSafeInteger(notification.thresholdMicros) || notification.thresholdMicros < 100000000
      || notification.thresholdMicros % 100000000 !== 0
      || notification.nextThresholdMicros !== notification.thresholdMicros + 100000000) fail('PRODUCTION_COST_NOTIFICATION_INVALID');
    nextThresholdMicros = notification.nextThresholdMicros;
  }
  const projectedMicros = cumulativeMicros + additionalMicros;
  if (projectedMicros >= nextThresholdMicros) fail('CNY_COST_NOTIFICATION_REQUIRED', { nextThresholdMicros, projectedMicros });
  return seal({ version: 'production_cost_notification_coverage_v1', cumulativeMicros,
    additionalMicros, projectedMicros, notificationHash: notification?.hash || null,
    nextThresholdMicros, invoice: false, trainingTruth: false });
}
