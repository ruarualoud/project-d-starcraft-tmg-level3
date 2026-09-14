import { readFile, writeFile } from 'node:fs/promises';
import { verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionBudgetEpochV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';

const runId = process.argv[2];
if (process.argv.length !== 3 || !/^faction-v1-[a-f0-9]{20}$/u.test(runId || '')) throw new Error('Budget epoch requires exact parent');
const base = 'build/ticket-18-faction-production-v1/';
const parent = verifySeal(JSON.parse(await readFile(base + runId + '/recipe.json', 'utf8')));
const file = base + 'budget-epoch-2026-09-09-reset-v1.json';
let epoch;
try { epoch = verifySeal(JSON.parse(await readFile(file, 'utf8')));
  if (epoch.parentRecipeHash !== parent.hash) throw new Error('Existing epoch belongs to a different parent');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  epoch = createFactionBudgetEpochV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite', parent });
  await writeFile(file, JSON.stringify(epoch, null, 2), { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ recorded: true, hash: epoch.hash, currentEpochCostCny: 0,
  nextNotificationCny: 100, allowanceCny: epoch.allowance.costMicros / 1e6,
  historicalLedgerPreserved: true, historicalChainBaseline: epoch.chainBaseline }));
