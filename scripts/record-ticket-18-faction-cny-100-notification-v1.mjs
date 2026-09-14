import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { seal } from '../packages/skill-production/common.mjs';
import { ledgerSnapshot, ROOT } from './support/strategy-live-production-support-v1.mjs';

const ledger = ledgerSnapshot();
const inheritedFactionCostMicros = 30_105_905;
const reauthorizedFactionLimitMicros = 70_000_000;
const projectedMaximumMicros = ledger.cumulativeEstimateMicros
  + reauthorizedFactionLimitMicros - inheritedFactionCostMicros;
const receipt = seal({ schema: 'ticket18_faction_cost_notification_receipt_v1',
  ticket: 18, slice: 174, thresholdMicros: 100_000_000,
  nextThresholdMicros: 200_000_000,
  observedCumulativeMicros: ledger.cumulativeEstimateMicros,
  observedCumulativeTokens: ledger.cumulativeTokens,
  projectedMaximumMicros, inheritedFactionCostMicros,
  reauthorizedFactionLimitMicros,
  userNotified: true,
  notificationChannel: 'ticket_progress_commentary',
  authorization: 'user_explicit_rebilling_authorization_2026-09-07',
  cumulativeAccountingReset: false, invoice: false, trainingTruth: false });
const out = path.join(ROOT, 'build/ticket-18-faction-production-v1');
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'cny-100-notification-receipt.json'),
  JSON.stringify(receipt, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ recorded: true,
  observedCumulativeCny: receipt.observedCumulativeMicros / 1e6,
  projectedMaximumCny: receipt.projectedMaximumMicros / 1e6,
  nextThresholdCny: receipt.nextThresholdMicros / 1e6,
  receiptHash: receipt.hash }));
