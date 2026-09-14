import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fail } from '../packages/skill-production/common.mjs';
import { createMatchupBudgetEpochV1, matchupBudgetEpochProgressV1 }
  from '../packages/strategy-skills/matchup-budget-epoch-v1.mjs';
import { ROOT, ledgerSnapshot } from './support/strategy-live-production-support-v1.mjs';

const output = path.join(ROOT, 'build/ticket-18-directed-matchup-v1/budget-epoch-v1.json');
const ledger = ledgerSnapshot();
const epoch = createMatchupBudgetEpochV1({ ledger });
await mkdir(path.dirname(output), { recursive: true });
const encoded = JSON.stringify(epoch, null, 2);
try { await writeFile(output, encoded, { flag: 'wx', mode: 0o600 }); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  if (await readFile(output, 'utf8') !== encoded) fail('MATCHUP_BUDGET_EPOCH_ALREADY_STARTED');
}
const progress = matchupBudgetEpochProgressV1({ epoch, ledger });
console.log(JSON.stringify({ started: true, epochHash: epoch.hash,
  stageCostCny: progress.estimateCny, historicalTokens: ledger.cumulativeTokens,
  historicalCny: ledger.cumulativeEstimateMicros / 1_000_000,
  nextNotificationCny: progress.nextNotificationThresholdMicros / 1_000_000,
  providerCalls: 0 }));
