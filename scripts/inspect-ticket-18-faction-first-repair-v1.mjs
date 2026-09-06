import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyFactionStrategyPatchV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { assertNoKnownFactionRuleFailureV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const runId = process.argv[2]; assert(/^faction-v1-[a-f0-9]{20}$/.test(runId || ''));
const json = async file => verifySeal(JSON.parse(await readFile(path.join(base, file), 'utf8')));
const [input, policy, recipe] = await Promise.all([json('terran_armed_forces-input.json'), json('terran_armed_forces-known-rule-policy.json'), json(runId + '/recipe.json')]);
assert(recipe.inputHashes.includes(input.hash)); assert(recipe.knownRulePolicyHashes.includes(policy.hash));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let report;
try {
  assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId).recipe, recipe.hash);
  assert.equal(db.prepare('SELECT count(*) n FROM attempts WHERE code=?').get('PROVIDER_PAYMENT_REQUIRED').n, 0);
  const section = 'faction.terran_armed_forces.army_resources.1';
  const artifact = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, id).artifact)).value;
  const correction = artifact(section + '.known-rule-correction'), round = artifact(section + '.issue-journal.0');
  const before = correction.draft; assert.equal(round.issues.parentHash, hash(before));
  assert.equal(round.issues.openIssues, 4); assert.equal(round.adjudication.resolutions.length, 1);
  const outputs = round.issues.issues.map((_, n) => artifact('faction.terran_armed_forces.' + section + '.editor.0.' + n));
  const responses = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(runId)
    .map(r => verifySeal(JSON.parse(r.response)).value);
  const receiptHashes = outputs.map(a => {
    assert.equal(a.loop.transcript.length, 1);
    const receiptHash = a.loop.transcript[0].receiptHash;
    const response = responses.find(r => r.usageReceipt?.receiptHash === receiptHash); assert(response);
    const { receiptHash: ignored, ...body } = response.usageReceipt;
    assert.equal(hash(body), receiptHash); assert.equal(body.status, 200); assert.equal(body.physicalAttempts, 1); assert.equal(body.automaticRetries, 0);
    assert.equal(body.providerProfileRef.hash, recipe.modelHash); assert.equal(body.responseFingerprint, sha256(JSON.stringify(response.output)));
    assert.equal(response.output.channels.skill.action, 'finish'); assert.equal(hash(response.output.channels.skill.content), hash(a.output));
    return receiptHash;
  });
  const patch = { parentHash: hash(before), replacements: outputs.flatMap(a => a.output.replacements), additions: outputs.flatMap(a => a.output.additions) };
  const after = applyFactionStrategyPatchV1(patch, { input, draft: before, issues: round.issues });
  assertNoKnownFactionRuleFailureV1({ input, policy, draft: after });
  const changedIndices = before.recommendations.flatMap((r, index) => hash(r) !== hash(after.recommendations[index]) ? [index] : []);
  assert.deepEqual(changedIndices, [2, 4, 6, 7]); assert.equal(after.recommendations.length, 8);
  const unchangedIndices = [0, 1, 3, 5]; unchangedIndices.forEach(i => assert.equal(hash(before.recommendations[i]), hash(after.recommendations[i])));
  report = seal({ version: 'actual_faction_first_repair_inspection_v1', runId, recipeHash: recipe.hash, inputHash: input.hash,
    correctionHash: correction.hash, issueRoundHash: round.hash, patchArtifactHashes: outputs.map(a => a.hash), receiptHashes,
    beforeHash: hash(before), afterHash: hash(after), changedIndices, unchangedIndices, patch, after,
    actualProviderReceiptsVerified: true, exactUnflaggedRecommendationsPreserved: true, unchangedKnownFailuresAbsent: true,
    fullConsumerPromptReplayVerified: false, semanticReviewComplete: false, independentEvaluationPerformed: false,
    runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
} finally { db.close(); }
await writeFile(path.join(base, runId, 'first-repair-inspection.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ runId, actualReplacements: report.changedIndices.length, unchanged: report.unchangedIndices.length,
  providerReceipts: report.receiptHashes.length, newProviderCalls: 0, afterHash: report.afterHash, hash: report.hash }));
