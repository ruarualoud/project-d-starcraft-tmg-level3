import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectFactionCrossFieldSourceAuditV1, assertNoFactionCrossFieldSourceDebtV1 } from '../packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs';
import { seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let section;
try { section = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-c27e73d05132d0b01a17', 'faction.terran_armed_forces.unit_roles.1.result').artifact)).value); }
finally { db.close(); }
const audit = inspectFactionCrossFieldSourceAuditV1({ input, draft: section.draft });
assert.equal(audit.findings.length, 4);
assert.deepEqual(audit.findings.map(f => [f.index, f.path]), [[0, 'alternatives.1'], [2, 'alternatives.1'], [4, 'alternatives.0'], [5, 'alternatives.0']]);
assert.equal(audit.sourceEvidence.length, 4);
assert.equal(audit.absenceProvesGeneralCorrectness, false);
assert.throws(() => assertNoFactionCrossFieldSourceDebtV1({ input, candidate: { sections: [section] } }), { code: 'FACTION_CANDIDATE_CROSS_FIELD_SOURCE_DEBT' });
const fixed = structuredClone(section.draft);
fixed.recommendations[0].alternatives[1] = 'AGG-12替换C-14增加Armoured Surge；Rocket Launcher无Surge，作为SIDEARM保留C-14并另行攻击。';
fixed.recommendations[4].alternatives[0] = 'Rocket Launcher花费40矿物，保留C-14并新增SIDEARM输出；此购买本身不减少Light Surge。';
for (const [index, n] of [[2, 1], [5, 0]]) fixed.recommendations[index].alternatives[n] = '非INSTANT攻击时可权衡Infantry Armor与Life Support；INSTANT禁止敌方Reaction，两者均不能响应。';
const after = inspectFactionCrossFieldSourceAuditV1({ input, draft: fixed });
assert.equal(after.findings.length, 0); assert.equal(after.absenceProvesGeneralCorrectness, false);
assert.doesNotThrow(() => assertNoFactionCrossFieldSourceDebtV1({ input, candidate: { sections: [{ draft: fixed }] } }));
const { hash: ignored, ...body } = input;
const wrong = structuredClone(body), instant = wrong.frozenSources.prompt.sources.find(s => s.ref === 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.38');
instant.passages = [{ spanId: 'p1', text: 'Reactions are allowed.' }];
assert.throws(() => inspectFactionCrossFieldSourceAuditV1({ input: seal(wrong), draft: section.draft }), { code: 'FACTION_CROSS_FIELD_SOURCE_DRIFT' });
// Resolve the separately investigated Evade concern without creating a false
// debt: the explicit null-characteristic prohibition overrides a granted roll.
const profile = input.frozenSources.prompt.sources.find(s => s.ref === 'core.u3zNStKpd5XegMjmJfMS.items.1');
assert.ok(profile.passages.map(p => p.text).join('').includes('An ability that explicitly grants an Evade Roll does not override this.'));
assert.equal(audit.findings.some(f => f.index === 1), false);
const files = ['packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-faction-cross-field-source-audit-v1.mjs', 'scripts/run-ticket-18-faction-consumer-evaluation-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 11, inputHash: input.hash, actualSectionHash: section.hash, audit,
  codeHashes, actualKnownCounterexamples: 4, duplicateOccurrencesRetained: true, evasionNullConcernClearedBySource: true,
  actualRepairPerformed: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'cross-field-source-audit-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 11, knownDebt: 4, actualRepairPerformed: false, providerCalls: 0, hash: report.hash }));
