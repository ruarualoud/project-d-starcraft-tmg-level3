import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { isRosterTeachReaderContinuationV1 } from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import * as recovery from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const actual = JSON.parse(await fs.readFile(process.argv[2], 'utf8')).teachFramework.state;
assert(actual.synthesisReader);
assert(actual.queryRecovery.operations.some(op => op.scopeAuditVersion === 2
  && op.originalRequest?.toolRequest?.branchIdRef !== op.request?.toolRequest?.branchIdRef
  && op.result?.status === 'advisory'));
assert.equal(isRosterTeachReaderContinuationV1(actual), false,
  'Saved reader must not bypass newly required validation of a changed scene');
const reader = structuredClone(actual.synthesisReader);
const state = { synthesisReader: reader, unrelated: 'preserved' };
recovery.invalidateRosterTeachSynthesisV1(state);
assert.equal(state.synthesisReader, undefined);
assert.deepEqual(state.synthesisReaderHistory, [reader]);
assert.equal(state.unrelated, 'preserved');
recovery.invalidateRosterTeachSynthesisV1(state);
assert.equal(state.synthesisReaderHistory.length, 1);
console.log(JSON.stringify({ pass: true, staleReaderCannotSkipScopeAudit: true,
  paidReaderHistoryPreserved: true, providerCalls: 0, nativeExecutions: 0 }));
