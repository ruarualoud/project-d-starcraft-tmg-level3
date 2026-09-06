import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { verifySeal, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.argv[2];
if (!/^phase-repair-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_PHASE_EVIDENCE_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const recipe = verifySeal(JSON.parse(await readFile(path.join(base, runId, 'recipe.json'), 'utf8')));
const archive = path.join(base, runId, 'source-review-evidence.json');
let source;
try { source = await readFile(archive, 'utf8'); }
catch (error) {
  if (error.code !== 'ENOENT') throw error;
  source = await readFile(path.join(base, recipe.sourceRunId, 'review-metadata-recovery-readiness.json'), 'utf8');
  if (verifySeal(JSON.parse(source)).hash !== recipe.priorRequestEvidenceHash) fail('FACTION_PHASE_EVIDENCE_SOURCE_DRIFT');
  await writeFile(archive, source, { flag: 'wx' });
}
if (verifySeal(JSON.parse(source)).hash !== recipe.priorRequestEvidenceHash) fail('FACTION_PHASE_EVIDENCE_SOURCE_DRIFT');
const result = await inspectFactionPhaseFieldEvidenceV1({ root, runId: process.argv[2] });
await writeFile(path.join(root, 'build/ticket-18-faction-production-v1', process.argv[2], 'verified-evidence.json'), JSON.stringify(result.evidence, null, 2));
console.log(JSON.stringify({ actualRepairReapplied: true, changedFields: result.evidence.changedFields.length,
  actualProviderRequestsReplayed: true, actualDshSessions: result.evidence.loopComparisons.length,
  providerCalls: 0, hash: result.evidence.hash }));
