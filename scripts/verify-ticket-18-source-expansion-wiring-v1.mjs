import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_REVIEW_SOURCE_EXPANSION_BINDING_V1 as binding }
  from '../packages/skill-production-v3/faction-review-source-expansion-v1.mjs';
import { FACTION_REVIEW_SOURCE_EXPANSION_FILES_V1 as files,
  factionReviewSourceExpansionRecipeV1, validateFactionReviewSourceExpansionMigrationV1,
  createFactionPriorReviewAttemptReaderV1 } from '../packages/skill-production-v3/faction-review-source-expansion-scope-v1.mjs';

assert.equal(process.argv.length, 2);
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const parentRunId = 'faction-v1-e35baf291d46af687809';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const component = await json('review-source-expansion-component-v1');
const runtime = await json('source-expansion-dsh-runtime-v1');
assert.equal(component.passed, true); assert.equal(component.providerCalls, 0);
assert.equal(runtime.passed, true); assert.equal(runtime.providerCalls, 0);
assert.equal(runtime.dshInjectionUsed, false); assert(runtime.actualDshSessions >= 16);
assert.equal(runtime.results.find(r => r.mode === 'prior_e35').originalPaidResponsesReused, 2);
assert.equal(runtime.results.find(r => r.mode === 'schema_both_phases_restart').noRepeatSendAfterInterruptedSchemaRepair, true);
assert.equal(runtime.results.filter(r => r.coldConsumerPassed).length, 2);
assert.equal(runtime.results.filter(r => r.rejected).length, 3);
for (const row of [...component.codeHashes, ...runtime.codeHashes])
  assert.equal(sha256(await readFile(row.file)), row.hash, 'Dependency changed after runtime proof: ' + row.file);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const db = new DatabaseSync(filename, { readOnly: true });
const ledger = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const before = ledger();
eq(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
const recipes = [];
let id = parentRunId, expected = null;
while (id) {
  assert(!recipes.some(r => r.runId === id)); assert(recipes.length < 256);
  const recipe = await json(id + '/recipe');
  eq(id, 'faction-v1-' + recipe.hash.slice(0, 20));
  if (expected) eq(recipe.hash, expected);
  recipes.push({ runId: id, recipeHash: recipe.hash });
  expected = recipe.continuation?.parentRecipeHash;
  id = recipe.continuation?.parentRunId;
}
const lineage = seal({ parentRunId, recipes, providerCalls: 0, trainingTruth: false });
const reader = await createFactionPriorReviewAttemptReaderV1({ root, filename, lineage });
const read = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(parentRunId, id).artifact)).value;
const rejected = read('structured-67644acbf8b1391d43179cf89cae2bd7a23ee30ee2248748.rejected-candidate');
const candidate = read('structured-6b514c78ccc815d4224adb4add808188556301ad932efdcc.candidate');
const evidence = [rejected, candidate].map(value => reader({ invocationHash: value.invocationHash,
  attemptId: 'structured-' + value.invocationHash.slice(0, 48) }));
eq(evidence[0].rejected.hash, rejected.hash); eq(evidence[1].candidate.hash, candidate.hash);
eq(evidence.map(e => e.attempt.run), [parentRunId, parentRunId]);
eq(evidence[0].capability.receiptHash, evidence[1].capability.receiptHash);
eq(reader({ invocationHash: hash('unpaid review'), attemptId: 'structured-' + hash('unpaid review').slice(0, 48) }), null);
assert.throws(() => reader({ invocationHash: rejected.invocationHash, attemptId: 'structured-' + hash('wrong').slice(0, 48) }),
  { code: 'FACTION_REVIEW_SOURCE_EXPANSION_ATTEMPT_ID_INVALID' }); checks++;
await assert.rejects(() => createFactionPriorReviewAttemptReaderV1({ root, filename,
  lineage: seal({ parentRunId, recipes: recipes.slice(0, 1) }) }), { code: 'FACTION_REVIEW_SOURCE_EXPANSION_LINEAGE_DRIFT' }); checks++;

const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['...sourceExpansionRecipeFields,', 'sourceExpansion: sourceExpansionReadiness,',
  'lineage: slotReviewEnvironment.lineage', 'reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding, readPriorReviewAttempt,'])
  eq(main.includes(text), true);
const continuation = await readFile('packages/skill-production-v3/faction-continuation-v1.mjs', 'utf8');
for (const text of ['reviewSourceExpansionBinding, reviewSourceExpansionReadinessHash,',
  'readiness: capacityMigration?.sourceExpansion', 'sourceExpansionMigration: sourceExpansionProof'])
  eq(continuation.includes(text), true);
const checker = await readFile('scripts/check-ticket-18-faction-launch-readiness-v1.mjs', 'utf8');
for (const name of ['review-source-expansion-component-v1', 'source-expansion-dsh-runtime-v1', 'source-expansion-readiness-v1'])
  eq(checker.includes(name), true);
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const readinessBody = { version: 'faction_review_source_expansion_wiring_readiness_v1', passed: true,
  providerCalls: 0, bindingHash: binding.hash, componentProofHash: component.hash,
  runtimeDshProofHash: runtime.hash, coldConsumerPassed: true, ancestorPaidResponsesReused: true,
  negativeBindingsPassed: true, mainParametersBound: true, codeHashes };
const example = seal(readinessBody), parent = await json(parentRunId + '/recipe');
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
const next = reseal(parent, { ...factionReviewSourceExpansionRecipeV1(example), codeHashes });
eq(validateFactionReviewSourceExpansionMigrationV1({ parent, next, readiness: example }).accountingReset, false);
for (const patch of [{ limits: { ...parent.limits, maxCalls: parent.limits.maxCalls + 1 } },
  { sourceBinding: { invalid: true } }, { reviewSourceExpansionBinding: null },
  { codeHashes: codeHashes.slice(1) }, { executionModelBinding: null }]) {
  assert.throws(() => validateFactionReviewSourceExpansionMigrationV1({ parent, next: reseal(next, patch), readiness: example })); checks++;
}
for (const field of ['coldConsumerPassed', 'ancestorPaidResponsesReused', 'negativeBindingsPassed', 'mainParametersBound']) {
  assert.throws(() => factionReviewSourceExpansionRecipeV1(reseal(example, { [field]: false })),
    { code: 'FACTION_REVIEW_SOURCE_EXPANSION_READINESS_REQUIRED' }); checks++;
}
for (const patch of [{ bindingHash: hash('foreign binding') }, { runtimeDshProofHash: 'missing' }]) {
  assert.throws(() => factionReviewSourceExpansionRecipeV1(reseal(example, patch)),
    { code: 'FACTION_REVIEW_SOURCE_EXPANSION_READINESS_REQUIRED' }); checks++;
}
eq(ledger(), before); db.close();
const report = seal({ ...readinessBody, checks, lineageHash: lineage.hash, originalLedgerHash: before,
  originalAttemptIds: evidence.map(e => e.attempt.id), originalPaidAttemptsCopied: 0,
  liveProductionResumed: false, freshProductionReviewPerformed: false,
  originalReviewAccepted: false, runtimeAccepted: false, trainingTruth: false });
await writeFile(base + 'source-expansion-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, originalPaidResponsesReused: 2, hash: report.hash }));
