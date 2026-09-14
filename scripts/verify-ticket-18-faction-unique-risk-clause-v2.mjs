import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_CARD_PACKAGE_COUNTEREXAMPLE_V1 as known, inspectFactionCardPackageSourceDebtV1 } from '../packages/skill-evaluation/faction-card-package-source-audit-v1.mjs';
import { FACTION_UNIQUE_RISK_CLAUSE_BINDING_V2 as binding, inspectFactionUniqueRiskClauseV2,
  proposeFactionUniqueRiskClauseCorrectionV2, assertNoFactionUniqueRiskClauseV2 } from '../packages/skill-evaluation/faction-unique-risk-clause-v2.mjs';
const base = 'build/ticket-18-faction-production-v1/', originRunId = 'faction-v1-c7ca14be3b96ade06b22';
const input = verifySeal(JSON.parse(await readFile(base + 'terran_armed_forces-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let section;
try { section = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=? AND state=?')
  .get(originRunId, 'faction.terran_armed_forces.card_packages.1.result', 'complete').artifact)).value; }
finally { db.close(); }
const draft = section.draft, originalHash = hash(draft), risk = draft.recommendations[0].risk;
assert.equal(section.semanticReviewPassed, true);
assert.notEqual(risk, known.observed);
assert.ok(risk.endsWith(known.badClause));
assert.equal(inspectFactionCardPackageSourceDebtV1({ input, draft }).findings.length, 0);
const audit = inspectFactionUniqueRiskClauseV2({ input, draft });
assert.equal(audit.findings.length, 1);
assert.equal(audit.findings[0].index, 0);
assert.throws(() => assertNoFactionUniqueRiskClauseV2({ input, candidate: { sections: [section] } }),
  { code: 'FACTION_CANDIDATE_UNIQUE_RISK_CLAUSE_DEBT' });
const proposal = proposeFactionUniqueRiskClauseCorrectionV2({ input, draft });
assert.equal(hash(draft), originalHash);
assert.equal(proposal.proposedDraft.recommendations[0].risk, risk.replace(known.badClause, known.correction));
assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft: proposal.proposedDraft }).findings.length, 0);
let checks = 10;
for (const [index, r] of draft.recommendations.entries()) for (const [field, value] of Object.entries(r)) {
  if (index === 0 && field === 'risk') continue;
  assert.deepEqual(proposal.proposedDraft.recommendations[index][field], value);
} checks++;
for (const prefix of ['另一处已修正的风险；', 'Revised unrelated sentence;', '']) {
  const changed = structuredClone(draft); changed.recommendations[0].risk = prefix + known.badClause;
  assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft: changed }).findings.length, 1); checks++;
}
for (const value of ['错误断言：' + known.badClause, '不得说“' + known.badClause + '”', known.correction]) {
  const changed = structuredClone(draft); changed.recommendations[0].risk = value;
  assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft: changed }).findings.length, 0); checks++;
}
const duplicate = structuredClone(draft); duplicate.recommendations[0].risk = known.badClause + '；' + known.badClause;
assert.throws(() => proposeFactionUniqueRiskClauseCorrectionV2({ input, draft: duplicate }),
  { code: 'FACTION_UNIQUE_RISK_CLAUSE_TARGET_NOT_UNIQUE' }); checks++;
assert.equal(proposal.productionApplied, false); checks++;
const files = ['packages/skill-evaluation/faction-unique-risk-clause-v2.mjs', 'scripts/verify-ticket-18-faction-unique-risk-clause-v2.mjs'];
const report = seal({ passed: true, checks, binding, originRunId, originalSectionHash: section.hash,
  originalDraftHash: originalHash, originalModelReviewPassed: true, oldWholeParagraphDetectorMissed: true,
  audit, proposal, productionApplied: false, actualFreshReviewExecuted: false, providerCalls: 0, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'unique-risk-clause-unit-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, oldWholeParagraphDetectorMissed: true,
  exactAssertionDetected: true, productionApplied: false, providerCalls: 0, hash: report.hash }));
