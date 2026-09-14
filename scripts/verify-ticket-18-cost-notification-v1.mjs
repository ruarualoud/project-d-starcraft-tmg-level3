import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, sha256 } from '../packages/skill-production/common.mjs';
import { checkProductionCostNotificationV1 as check } from '../packages/skill-evaluation/cost-notification-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/';
const notification = JSON.parse(await readFile(base + 'cny-100-notification-receipt.json', 'utf8'));
assert.equal(check({ cumulativeMicros: 101762083, additionalMicros: 8000000, notification }).nextThresholdMicros, 200000000);
assert.throws(() => check({ cumulativeMicros: 101762083, additionalMicros: 0 }), { code: 'CNY_COST_NOTIFICATION_REQUIRED' });
assert.throws(() => check({ cumulativeMicros: 199000000, additionalMicros: 1000000, notification }), { code: 'CNY_COST_NOTIFICATION_REQUIRED' });
const { hash: ignored, ...body } = notification;
assert.throws(() => check({ cumulativeMicros: 101762083, additionalMicros: 0,
  notification: seal({ ...body, userNotified: false }) }), { code: 'PRODUCTION_COST_NOTIFICATION_INVALID' });
assert.throws(() => check({ cumulativeMicros: -1, additionalMicros: 0 }), { code: 'PRODUCTION_COST_PROJECTION_INVALID' });
const files = ['packages/skill-evaluation/cost-notification-v1.mjs', 'scripts/verify-ticket-18-cost-notification-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, checks: 5, actualNotificationHash: notification.hash, providerCalls: 0, codeHashes, trainingTruth: false });
await writeFile(base + 'cost-notification-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 5, providerCalls: 0 }));
