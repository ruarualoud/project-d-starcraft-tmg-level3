import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionUnitRoleDebtV1 } from '../packages/skill-evaluation/faction-unit-role-debt-v1.mjs';
import { seal, verifySeal, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), runId = process.argv[2];
if (!/^faction-v1-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_UNIT_DEBT_ARGUMENTS');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let section;
try {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, 'faction.terran_armed_forces.unit_roles.1.result');
  if (!row) fail('FACTION_UNIT_DEBT_SECTION_MISSING'); section = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
} finally { db.close(); }
const debt = inspectFactionUnitRoleDebtV1({ input, draft: section.draft });
const report = seal({ runId, sectionResultHash: section.hash, modelSourceReviewPassed: section.semanticReviewPassed, debt,
  independentQualificationBlocked: debt.knownSemanticDebtBlocksIndependentQualification,
  actualRepairPerformed: false, newProviderCalls: 0, trainingTruth: false });
await writeFile(path.join(base, runId, 'unit-role-semantic-debt.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, modelSourceReviewPassed: section.semanticReviewPassed, knownDebt: debt.findings.length,
  findings: debt.findings.map(f => ({ id: f.id, index: f.index, path: f.path })), newProviderCalls: 0, hash: report.hash }));
