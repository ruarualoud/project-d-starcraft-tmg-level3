#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { classifyFactionFieldRecoveryOwnerActivityV1 }
  from '../packages/skill-production-v3/faction-field-recovery-scope-v1.mjs';

const runner = await readFile(
  new URL('./run-ticket-18-faction-strategy-production-v2.mjs', import.meta.url), 'utf8');
assert.match(runner, /const releaseActivity = classifyFactionFieldRecoveryOwnerActivityV1\(\{/u);
assert.match(runner, /if \(!releaseActivity\.terminal\)\s+fail\('FACTION_PRODUCTION_RELEASE_CHECKPOINT_RUNNING'\)/u);
assert.doesNotMatch(runner, /rows\.some\(row => row\.state === 'running'\)/u);

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6fb3850f59642566130f';
const db = new DatabaseSync(filename, { readOnly: true });
const actual = classifyFactionFieldRecoveryOwnerActivityV1({
  attempts: db.prepare('SELECT id,state FROM attempts WHERE run=?').all(runId),
  steps: db.prepare('SELECT id,state,expires FROM steps WHERE run=?').all(runId),
});
db.close();

assert.equal(actual.terminal, true);
assert.equal(actual.intentAttemptIds.length, 0);
assert.equal(actual.liveRunningStepIds.length, 0);
assert(actual.expiredRunningStepIds.length > 0);

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  stableReleaseUsesSharedLeaseClassifier: true,
  expiredRunningSteps: actual.expiredRunningStepIds.length,
  liveRunningSteps: actual.liveRunningStepIds.length }));
