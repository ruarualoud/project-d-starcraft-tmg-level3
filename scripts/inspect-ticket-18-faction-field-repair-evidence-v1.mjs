import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runId = process.argv[2];
const { evidence } = await inspectFactionFieldRepairEvidenceV1({ root, runId });
await writeFile(path.join(root, 'build/ticket-18-faction-production-v1', runId, 'verified-evidence.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ evidenceVerified: true, runId, exactActualRequests: evidence.delivery.receiptHashes.length,
  changedFields: evidence.changedFields.length, newProviderCalls: 0, sourceReviewPassed: false, hash: evidence.hash }));
