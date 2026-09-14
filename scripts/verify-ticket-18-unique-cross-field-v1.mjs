import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { inspectFactionUniqueRiskClauseV2 } from '../packages/skill-evaluation/faction-unique-risk-clause-v2.mjs';
import { inspectFactionUniqueCrossFieldDebtV1, assertNoFactionUniqueCrossFieldDebtV1,
  proposeFactionUniqueCrossFieldCorrectionV1, FACTION_UNIQUE_CROSS_FIELD_AUDIT_BINDING_V1 as binding } from '../packages/skill-evaluation/faction-unique-cross-field-audit-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', run = 'faction-v1-9200d037cfa6a1c4a388';
const input = verifySeal(JSON.parse(await readFile(base + run + '/terran_armed_forces-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let artifact;
try { artifact = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(run,
  'faction.terran_armed_forces.faction.terran_armed_forces.card_packages.2.generator-items.0.planning-v1.acc624c68b3783d1fd1e').artifact)).value); }
finally { db.close(); }
const draft = { recommendations: artifact.output.items.map(row => row.value) }, candidate = { sections: [{ draft }] };
assert.equal(inspectFactionUniqueRiskClauseV2({ input, draft }).findings.length, 0);
const audit = inspectFactionUniqueCrossFieldDebtV1({ input, draft });
assert.equal(audit.findings.length, 1); assert.equal(audit.findings[0].path, 'procedure.0');
assert.throws(() => assertNoFactionUniqueCrossFieldDebtV1({ input, candidate }), { code: 'FACTION_CANDIDATE_UNIQUE_CROSS_FIELD_DEBT' });
const proposal = proposeFactionUniqueCrossFieldCorrectionV1({ input, draft });
assert.equal(inspectFactionUniqueCrossFieldDebtV1({ input, draft: proposal.proposedDraft }).findings.length, 0);
assert.equal(proposal.productionApplied, false);
assert.deepEqual(proposal.proposedDraft.recommendations[1], draft.recommendations[1]);
const expected = structuredClone(draft); expected.recommendations[0].procedure[0] = proposal.proposedDraft.recommendations[0].procedure[0];
assert.deepEqual(expected, proposal.proposedDraft);
let checks = 8;
for (const key of ['when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
  const moved = structuredClone(proposal.proposedDraft);
  if (key === 'risk') moved.recommendations[0][key] = '两者均为 Unique，不可同时购买。';
  else moved.recommendations[0][key][0] = '两者均为 Unique，不可同时购买。';
  assert.equal(inspectFactionUniqueCrossFieldDebtV1({ input, draft: moved }).findings.length, 1); checks++;
}
for (const value of ['错误观点：“两者均为 Unique，不可同时购买。”', '不能认为两者均为 Unique，不可同时购买。',
  '反例：两者均为 Unique，不可同时购买。']) {
  const quoted = structuredClone(proposal.proposedDraft); quoted.recommendations[0].procedure[0] = value;
  assert.equal(inspectFactionUniqueCrossFieldDebtV1({ input, draft: quoted }).findings.length, 0); checks++;
}
const files = ['packages/skill-evaluation/faction-unique-cross-field-audit-v1.mjs', 'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-unique-cross-field-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: run, originalArtifactHash: artifact.hash,
  inputHash: input.hash, actualMissReproduced: true, audit, proposal, providerCalls: 0,
  productionApplied: false, independentFactionAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'unique-cross-field-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, originalArtifactHash: artifact.hash, sourceBackedProposalHash: proposal.hash,
  productionApplied: false, providerCalls: 0, hash: report.hash }));
