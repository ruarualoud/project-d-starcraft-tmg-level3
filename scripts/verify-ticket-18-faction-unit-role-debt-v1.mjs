import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionUnitRoleDebtV1 } from '../packages/skill-evaluation/faction-unit-role-debt-v1.mjs';
import { inspectFactionCandidateEvidenceV1 } from '../packages/skill-evaluation/faction-candidate-evidence-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let section;
try { section = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-c27e73d05132d0b01a17', 'faction.terran_armed_forces.unit_roles.1.result').artifact)).value); }
finally { db.close(); }
const debt = inspectFactionUnitRoleDebtV1({ input, draft: section.draft });
assert.equal(debt.findings.length, 3); assert.equal(debt.knownSemanticDebtBlocksIndependentQualification, true);
assert.deepEqual(debt.findings.map(f => [f.index, f.path]), [[1, 'alternatives.2'], [3, 'procedure.2'], [5, 'procedure.5']]);
assert.equal(debt.absenceProvesGeneralCorrectness, false); assert.equal(debt.sourceEvidence.length, 4);
const fixed = structuredClone(section.draft);
fixed.recommendations[1].alternatives[2] = '对空保留Hellfire；Haywire的目标为Ground，不是对空替换。';
fixed.recommendations[3].procedure[2] = 'Orders的忽略Disengage惩罚选项仍要求另一友方Biological单位，Goliath不合格。';
fixed.recommendations[5].procedure[5] = 'Life Support与Restoration分别受具名Reaction每轮一次限制；每玩家同一激活仍只可结算一个Reaction。';
const fixedDebt = inspectFactionUnitRoleDebtV1({ input, draft: fixed });
assert.equal(fixedDebt.findings.length, 0); assert.equal(fixedDebt.absenceProvesGeneralCorrectness, false);
const { hash: ignored, ...body } = input;
// Changed authoritative predicates fail closed, not a waived counterexample.
const wrongSource = structuredClone(body);
const goliath = wrongSource.frozenSources.prompt.sources.find(s => s.ref === 'source:army_units:goliath');
goliath.passages = [{ spanId: 'p1', text: JSON.stringify({ tags: 'Biological', upgrades: [] }) }];
assert.throws(() => inspectFactionUnitRoleDebtV1({ input: seal(wrongSource), draft: section.draft }), { code: 'FACTION_UNIT_DEBT_SOURCE_DRIFT' });
await assert.rejects(() => inspectFactionCandidateEvidenceV1({ root, runId: '../outside', input,
  knownRulePolicy: seal({ inputHash: input.hash }), catalogue: seal({}), context: seal({}) }), { code: 'FACTION_CANDIDATE_EVIDENCE_ARGUMENTS' });
const files = ['packages/skill-evaluation/faction-unit-role-debt-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-faction-unit-role-debt-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, codeHashes, inputHash: input.hash, actualSectionHash: section.hash, debtHash: debt.hash,
  actualKnownCounterexamples: 3, sourceReviewConsensusNotAuthority: true, providerCalls: 0, actualRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'unit-role-debt-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, knownDebt: 3, actualRepairPerformed: false, providerCalls: 0, hash: report.hash }));
