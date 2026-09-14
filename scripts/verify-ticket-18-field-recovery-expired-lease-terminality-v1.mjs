#!/usr/bin/env node

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { classifyFactionFieldRecoveryOwnerActivityV1 }
  from '../packages/skill-production-v3/faction-field-recovery-scope-v1.mjs';

const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-6fb3850f59642566130f';
const db = new DatabaseSync(filename, { readOnly: true });
const attempts = db.prepare('SELECT id,state FROM attempts WHERE run=?').all(runId);
const steps = db.prepare('SELECT id,state,expires FROM steps WHERE run=?').all(runId);
db.close();
const now = Date.now();
const actual = classifyFactionFieldRecoveryOwnerActivityV1({ attempts, steps, now });
assert.equal(actual.intentAttemptIds.length, 0);
assert.equal(actual.liveRunningStepIds.length, 0);
assert(actual.expiredRunningStepIds.includes(
  'faction.zerg_swarm.faction.zerg_swarm.card_packages.1.review-target-batch-v1.supportive.0.2.source-evidence-v1.3cd990702ff2ba8b4acc'));
assert.equal(actual.terminal, true);

const live = classifyFactionFieldRecoveryOwnerActivityV1({ attempts: [],
  steps: [{ id: 'live-local-work', state: 'running', expires: now + 1_000 }], now });
assert.equal(live.terminal, false);
assert.deepEqual(live.liveRunningStepIds, ['live-local-work']);
const intent = classifyFactionFieldRecoveryOwnerActivityV1({
  attempts: [{ id: 'provider-intent', state: 'intent' }], steps: [], now });
assert.equal(intent.terminal, false);
assert.deepEqual(intent.intentAttemptIds, ['provider-intent']);
const unknownExpiry = classifyFactionFieldRecoveryOwnerActivityV1({ attempts: [],
  steps: [{ id: 'unknown-expiry', state: 'running', expires: null }], now });
assert.equal(unknownExpiry.terminal, false);

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  actualExpiredRunningSteps: actual.expiredRunningStepIds.length,
  actualLiveRunningSteps: actual.liveRunningStepIds.length,
  providerIntentStillBlocks: true, unknownExpiryStillBlocks: true }));
