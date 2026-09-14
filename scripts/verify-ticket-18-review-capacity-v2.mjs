import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, seal } from '../packages/skill-production/common.mjs';
import { loadEvidenceReviewFixtureV1 } from './support/strategy-evidence-review-fixture-v1.mjs';
import { prepareReviewCapacityMigrationV2 } from './support/strategy-review-capacity-migration-v2.mjs';
import { materializeStrategyEvidenceReviewV2, createStrategyEvidenceReviewContractV2 } from '../packages/strategy-skills/strategy-evidence-review-v2.mjs';
import { materializeStrategyEvidenceReviewV1 } from '../packages/strategy-skills/strategy-evidence-review-v1.mjs';
import { BUILD, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';
const before = ledgerSnapshot(), fixture = await loadEvidenceReviewFixtureV1();
const { migration, recovered } = await prepareReviewCapacityMigrationV2(fixture);
const checks = [];
function check(name, fn) { fn(); checks.push(name); console.log('PASS ' + name); }
check('actual seven-source response fails frozen v1 and passes explicit v2 unchanged', () => {
  assert.throws(() => materializeStrategyEvidenceReviewV1(fixture.auditBatches[0], recovered.providerValue));
  assert.equal(materializeStrategyEvidenceReviewV2(fixture.auditBatches[0], recovered.providerValue).hash, recovered.evidence.hash);
  assert.equal(recovered.evidence.checks[3].sourceEvidence.length, 7);
  assert.equal(hash(recovered.providerValue), migration.originalProviderValueHash);
});
check('all fourteen actual calibration verdicts and evidence hashes preserved without rebilling', () => {
  assert.equal(migration.replayedCalibrationDecisions, 14);
  assert.equal(migration.additionalProviderCalls, 0);
});
check('invented anchors, wrong target field and extra check still rejected', () => {
  for (const mutate of [v => { v.checks[0].sourceSpanIds = ['invented']; },
    v => { v.checks[0].currentSpanIds = ['risk']; }, v => { v.checks.push(v.checks[0]); }]) {
    const bad = structuredClone(recovered.providerValue); mutate(bad);
    assert.throws(() => materializeStrategyEvidenceReviewV2(fixture.auditBatches[0], bad));
  }
});
check('limits remain bounded at schema subset ceiling with unchanged semantic validator', () => {
  const c = createStrategyEvidenceReviewContractV2();
  assert.equal(c.providerSchema.properties.checks.maxItems, 4);
  assert.equal(c.providerSchema.properties.checks.items.properties.sourceSpanIds.maxItems, 128);
  assert.equal(recovered.runtimeAccepted, false); assert.equal(recovered.semanticAcceptanceInherited, false);
});
check('shared original ledger untouched', () => assert.equal(ledgerSnapshot().hash, before.hash));
const report = seal({ schema: 'ticket18_review_capacity_readiness_v2', passed: true, checks,
  migrationHash: migration.hash, codeHashes: await codeHashes([
    'packages/strategy-skills/strategy-evidence-review-v2.mjs', 'packages/strategy-skills/strategy-evidence-review-runtime-v2.mjs',
    'scripts/support/strategy-review-capacity-migration-v2.mjs', 'scripts/verify-ticket-18-review-capacity-v2.mjs']),
  providerCalls: 0, trainingTruth: false });
await writeFile(path.join(BUILD, 'review-capacity-readiness-v2.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: checks.length, migrationHash: migration.hash, hash: report.hash }));
