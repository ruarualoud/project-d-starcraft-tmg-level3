import assert from 'node:assert/strict';
import { completeFactionFieldRecoveryOrDelegateV1 }
  from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';

const request = Object.freeze({ packet: { id: 'faction.zerg_swarm' },
  roleId: 'review-target-batch-v1.adversarial.1.0' });
const prepared = Object.freeze({ fullRoleId: 'faction.zerg_swarm.' + request.roleId });
const lease = Object.freeze({ cached: false });
const repairScope = Object.freeze({ route: 'full_output', reason: 'incomplete_target_slot_set' });
let releaseCalls = 0;
let delegateCalls = 0;
let completionCalls = 0;

const result = await completeFactionFieldRecoveryOrDelegateV1({
  store: { finish: () => assert.fail('typed full-output handoff must not finish the field-recovery lease') },
  lease,
  prepared,
  request,
  runtime: { role: async delegatedRequest => {
    delegateCalls++;
    assert.equal(releaseCalls, 1, 'lease must be released before delegation');
    assert.equal(delegatedRequest, request, 'the exact request must be delegated');
    return 'native-structured-review';
  } },
  completeFieldValues: async value => {
    completionCalls++;
    assert.equal(value, prepared);
    const error = new Error('whole output required');
    error.code = 'FACTION_FIELD_VALUE_FULL_OUTPUT_REQUIRED';
    error.repairScope = repairScope;
    throw error;
  },
  release: () => { releaseCalls++; },
});

assert.equal(result, 'native-structured-review');
assert.equal(completionCalls, 1);
assert.equal(releaseCalls, 1);
assert.equal(delegateCalls, 1);
console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  route: repairScope.route, completionCalls, releaseCalls, delegateCalls,
  providerCalls: 0 }));
