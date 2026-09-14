import assert from 'node:assert/strict';
import { projectFactionCumulativeCostV1, projectFactionCumulativeCostV2,
  FACTION_COST_PROJECTION_SOFT_LIMIT_BINDING_V2 }
  from '../packages/skill-production-v3/faction-budget-extension-v1.mjs';

const actual = { historyMicros: 34_013_743,
  globalSpentMicros: 251_222_178,
  inheritedCostMicros: 22_064_190,
  currentRunCostMicros: 67_545_714,
  chainLimitMicros: 67_545_714 };

assert.throws(() => projectFactionCumulativeCostV1(actual), {
  code: 'FACTION_COST_PROJECTION_INVALID' });
const projected = projectFactionCumulativeCostV2(actual);
assert.equal(projected.version,
  FACTION_COST_PROJECTION_SOFT_LIMIT_BINDING_V2.version);
assert.equal(projected.remainingChainMicros, 0);
assert.equal(projected.overrunMicros, actual.inheritedCostMicros);
assert.equal(projected.currentCumulativeMicros,
  actual.historyMicros + actual.globalSpentMicros);
assert.equal(projected.projectedMaximumCumulativeMicros,
  projected.currentCumulativeMicros);
assert.deepEqual(projected.softAlerts, [{ kind: 'cost_allocation_exceeded',
  observed: actual.inheritedCostMicros + actual.currentRunCostMicros,
  configuredThreshold: actual.chainLimitMicros,
  overrunMicros: actual.inheritedCostMicros, action: 'continue' }]);
assert.equal(projected.accountingReset, false);
assert.equal(projected.paymentRequiredStillBlocks, true);

console.log(JSON.stringify({ passed: true, checks: 10,
  oldFailureReproduced: 'FACTION_COST_PROJECTION_INVALID',
  remainingChainMicros: projected.remainingChainMicros,
  overrunMicros: projected.overrunMicros,
  action: projected.softAlerts[0].action,
  accountingReset: projected.accountingReset }));
