import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seal, verifySeal, hash } from '../packages/skill-production/common.mjs';
import { inspectFactionSemanticDebtV1 } from '../packages/skill-evaluation/faction-semantic-debt-v1.mjs';

// Independent, read-only follow-up to an actual completed production section.
// Known exact-text debt only; absence is NOT a universal semantic pass.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1'), runId = process.argv[2];
assert.equal(process.argv.length, 3); assert(/^faction-v1-[a-f0-9]{20}$/.test(runId || ''));
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file), 'utf8')));
const [input, recipe] = await Promise.all([json('terran_armed_forces-input.json'), json(runId + '/recipe.json')]);
assert(recipe.inputHashes.includes(input.hash));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let result;
try {
  assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId).recipe, recipe.hash);
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, 'faction.terran_armed_forces.army_resources.1.result');
  assert(row, 'The production section is not yet complete');
  result = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
} finally { db.close(); }
const debt = inspectFactionSemanticDebtV1({ input, draft: result.draft }), findings = debt.findings;
const report = seal({ version: 'faction_section_semantic_debt_v1', runId, recipeHash: recipe.hash, inputHash: input.hash,
  sectionResultHash: result.hash, draftHash: hash(result.draft), sourceBinding: input.sourceBinding,
  modelSourceReviewPassed: result.semanticReviewPassed, debt, findings,
  knownSemanticDebtBlocksIndependentQualification: findings.length > 0,
  absenceProvesGeneralCorrectness: false, productionReviewFlagsRewritten: false,
  newProviderCalls: 0, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'section-semantic-debt.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, modelSourceReviewPassed: report.modelSourceReviewPassed,
  knownSemanticDebt: findings.length, independentQualificationBlocked: report.knownSemanticDebtBlocksIndependentQualification,
  providerCalls: 0, hash: report.hash }));
