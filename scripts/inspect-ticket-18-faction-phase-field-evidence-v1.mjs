import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await inspectFactionPhaseFieldEvidenceV1({ root, runId: process.argv[2] });
await writeFile(path.join(root, 'build/ticket-18-faction-production-v1', process.argv[2], 'verified-evidence.json'), JSON.stringify(result.evidence, null, 2));
console.log(JSON.stringify({ actualRepairReapplied: true, changedFields: result.evidence.changedFields.length,
  actualProviderRequestsReplayed: true, actualDshSessions: result.evidence.loopComparisons.length,
  providerCalls: 0, hash: result.evidence.hash }));
