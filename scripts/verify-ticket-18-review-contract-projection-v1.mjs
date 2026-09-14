import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { projectFactionReviewContractValueV1, materializeFactionReviewContractProjectionV1,
  isAdministrativeOwnershipMarkerV1, FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 as binding }
  from '../packages/skill-production-v3/faction-review-contract-projection-v1.mjs';
import { loadFactionContractProjectionActualFixturesV1 } from './support/faction-contract-projection-actual-fixture-v1.mjs';

assert.equal(process.argv.length, 2);
const fixtures = await loadFactionContractProjectionActualFixturesV1();
const db = new DatabaseSync(fixtures[0].filename, { readOnly: true });
const before = hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
let checks = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const results = fixtures.map(f => {
  const m = materializeFactionReviewContractProjectionV1(f);
  eq(m.newProviderCalls, 0); eq(m.originalProviderSchemaPassed, false); eq(m.semanticAcceptance, false);
  eq(hash(m.projection.projectedValue.verdicts), hash(f.originalEvidence.rejected.providerValue.verdicts));
  eq(materializeFactionReviewContractProjectionV1(f).hash, m.hash);
  assert.throws(() => materializeFactionReviewContractProjectionV1({ ...f,
    originalEvidence: { ...f.originalEvidence, attempt: { ...f.originalEvidence.attempt, request_hash: hash('wrong request') } } })); checks++;
  return { name: f.name, actualAttemptId: f.originalEvidence.attempt.id,
    actualContextHash: f.prepared.capsule.hash, materializationHash: m.hash,
    originalValidationIssues: f.originalEvidence.rejected.validation.issues,
    requiredCoverageCount: f.prepared.mapping.requiredSourceRefs.length,
    changedPointers: m.projection.changes.map(c => c.pointer), sidecar: m.projection.sidecar,
    emptyCoverageSupplied: m.projection.emptyCoverageSupplied };
});
eq(results[0].requiredCoverageCount, 0); eq(results[0].changedPointers, ['/coverage']);
eq(results[1].sidecar[0].value, 'host-owned'); eq(results[1].emptyCoverageSupplied, false);
const zerg = fixtures[0].originalEvidence.rejected.providerValue;
assert.throws(() => projectFactionReviewContractValueV1({ providerValue: zerg, requiredSourceRefs: ['source:required'] })); checks++;
for (const value of ['unsupported', 'host-owned; this rule is wrong', true, 0, { verdict: 'unsupported' }, '']) {
  eq(isAdministrativeOwnershipMarkerV1(value), false);
  assert.throws(() => projectFactionReviewContractValueV1({ providerValue: { ...zerg, extra: value }, requiredSourceRefs: [] })); checks++;
}
for (const key of ['note', 'anotherSpelling', 'random_new_field']) {
  const p = projectFactionReviewContractValueV1({ providerValue: { ...zerg, [key]: 'host-owned' }, requiredSourceRefs: [] });
  eq(p.sidecar[0].value, 'host-owned'); eq(p.sidecar[0].usedAsEvidence, false);
}
for (const key of ['runtimeAccepted', 'trainingTruth', 'hash', 'recommendationIndices']) {
  assert.throws(() => projectFactionReviewContractValueV1({ providerValue: { ...zerg, [key]: 'host-owned' }, requiredSourceRefs: [] })); checks++;
}
eq(hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); db.close();
const files = ['packages/skill-production-v3/faction-review-contract-projection-v1.mjs',
  'scripts/support/faction-contract-projection-actual-fixture-v1.mjs', 'scripts/verify-ticket-18-review-contract-projection-v1.mjs'];
const report = seal({ version: 'faction_review_contract_projection_component_v1', passed: true, checks,
  bindingHash: binding.hash, actualOriginalResponses: results, originalJournalUnchanged: true,
  providerCalls: 0, dshCalls: 0, productionMainWired: false, semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile('build/ticket-18-faction-production-v1/review-contract-projection-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, results, providerCalls: 0, productionMainWired: false }));
