import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPresetRosterJourneyV1 } from '../packages/roster-planning-workspace/preset-roster-journey-v1.mjs';
const raw = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const saved = raw.value || raw;
const records = structuredClone(saved.providerDispatches);
const old = records.find(d => d.status === 'ambiguous');
const retry = records.find(d => d.status === 'completed' && d.retryOfRequestId === old.requestId);
assert.ok(old && retry);
assert.equal(old.requestBodyHash, retry.requestBodyHash);
let state;
const view = { lockedRoster: {}, status: 'planned', plan: { planHash: 'current-plan', openingDeploymentSchedule: {} },
  planReview: { status: 'completed', planHash: 'current-plan', review: { findings: [] } },
  teachFramework: { status: 'completed', planHash: 'current-plan', appliedToPlanHash: 'current-plan', investigationCompleted: true },
  providerDispatches: records };
const journey = createPresetRosterJourneyV1({ service: { readSession: () => view },
  readState: () => state, saveState: async (_id, s) => { state = structuredClone(s); } });
if (!process.argv.includes('--mismatched-only')) {
await journey.run(saved.sessionId);
for (let i = 0; state.status === 'running' && i < 100; i++) await new Promise(r => setImmediate(r));
assert.equal(state.status, 'completed');
assert.equal(old.status, 'ambiguous');
assert.equal(old.costStatus, 'unknown');
assert.deepEqual(records, saved.providerDispatches);
}
// A same-link/different-body record must NOT clear an unresolved old send.
retry.requestBodyHash = 'different'; state = null;
// Use a separate coordinator, not the previous completed job's microtask tail.
const nextJourney = createPresetRosterJourneyV1({ service: { readSession: () => view },
  readState: () => null, saveState: async () => {} });
await assert.rejects(() => nextJourney.run(saved.sessionId), /DISPATCH_RECOVERY_REQUIRED/);
console.log(JSON.stringify({ pass: true, oldUnknownFeePreserved: true,
  exactCompletedRetryUnblocks: process.argv.includes('--mismatched-only') ? 'prior_pass_reused' : true,
  mismatchedRetryStillBlocks: true, providerCalls: 0 }));
