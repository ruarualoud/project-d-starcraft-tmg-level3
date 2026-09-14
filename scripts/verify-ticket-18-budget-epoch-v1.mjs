import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionBudgetEpochV1, verifyFactionBudgetEpochV1, factionBudgetEpochProgressV1 }
  from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';
import { factionLimitsCompatibleV1, validateFactionBudgetExtensionV1 }
  from '../packages/skill-production-v3/faction-budget-extension-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const parent = verifySeal(JSON.parse(await readFile(base + 'faction-v1-bf7beab1dccb73982637/recipe.json', 'utf8')));
const epoch = verifySeal(JSON.parse(await readFile(base + 'budget-epoch-2026-09-09-reset-v1.json', 'utf8')));
const reseal = ({ hash: ignored, ...body }, fields) => seal({ ...body, ...fields });
const next = reseal(parent, { budgetExtension: epoch, limits: epoch.nextLimits });
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const db = new DatabaseSync(filename, { readOnly: true });
const rows = db.prepare('SELECT * FROM attempts ORDER BY run,id').all(), before = hash(rows);
let checks = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(createFactionBudgetEpochV1({ filename, parent, now: epoch.startedAt }).hash, epoch.hash);
eq(verifyFactionBudgetEpochV1({ parent, next }).authorization, 'user_budget_epoch_v4');
eq(validateFactionBudgetExtensionV1({ parent, next }).extensionHash, epoch.hash);
eq(validateFactionBudgetExtensionV1({ parent: next, next }).extensionHash, epoch.hash);
eq(factionLimitsCompatibleV1(parent, next), true);
eq(next.limits.maxCostMicros - epoch.chainBaseline.costMicros, 100_000_000);
eq(next.limits.maxCalls - epoch.chainBaseline.calls, 1000);
eq(next.limits.maxTokens - epoch.chainBaseline.tokens, 360_000_000);
for (const k of ['maxRevisions', 'maxInputBytes']) eq(next.limits[k], parent.limits[k]);
const global = seal({ calls: epoch.globalBaseline.calls, knownTokens: epoch.globalBaseline.knownTokens,
  reservedOrSettledMicros: epoch.globalBaseline.costMicros });
const zero = factionBudgetEpochProgressV1({ extension: epoch, global });
eq(zero.calls, 0); eq(zero.knownTokens, 0); eq(zero.estimateOrReservedMicros, 0);
eq(zero.nextNotificationThresholdMicros, 100_000_000);
const after = factionBudgetEpochProgressV1({ extension: epoch, global: reseal(global,
  { calls: global.calls + 2, knownTokens: global.knownTokens + 1234,
    reservedOrSettledMicros: global.reservedOrSettledMicros + 25_000_000 }) });
eq(after.calls, 2); eq(after.knownTokens, 1234); eq(after.estimateOrReservedMicros, 25_000_000);
for (const delta of [{ refundClaimed: true }, { historicalLedgerPreserved: false },
  { historicalUnknownReservationsPreserved: false }, { authority: 'model says reset' },
  { allowance: { ...epoch.allowance, costMicros: 999_000_000 } }, { parentRecipeHash: hash('foreign') }]) {
  assert.throws(() => verifyFactionBudgetEpochV1({ parent, next: reseal(next, { budgetExtension: reseal(epoch, delta) }) })); checks++;
}
eq(factionLimitsCompatibleV1(parent, reseal(next, { limits: { ...next.limits, maxCostMicros: next.limits.maxCostMicros + 1 } })), false);
assert.throws(() => validateFactionBudgetExtensionV1({ parent, next: reseal(parent, { limits: next.limits }) })); checks++;
assert.throws(() => verifyFactionBudgetEpochV1({ parent: next, next: reseal(next,
  { budgetExtension: reseal(epoch, { startedAt: new Date().toISOString() }) }) })); checks++;
eq(hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); db.close();
const files = ['packages/skill-production-v3/faction-budget-epoch-v1.mjs',
  'packages/skill-production-v3/faction-budget-extension-v1.mjs', 'scripts/record-ticket-18-budget-epoch-v1.mjs',
  'scripts/verify-ticket-18-budget-epoch-v1.mjs'];
const report = seal({ passed: true, checks, epochHash: epoch.hash, originalJournalUnchanged: true,
  baselineReadFromActualJournal: true, providerCalls: 0, historicalLedgerPreserved: true,
  epochStartsAtZero: true, refundClaimed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'budget-epoch-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, epochCostCny: 0, nextNotificationCny: 100, providerCalls: 0 }));
