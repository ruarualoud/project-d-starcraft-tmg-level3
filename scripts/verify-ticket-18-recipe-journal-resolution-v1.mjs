import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { resolveFactionJournalRecipeV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';

const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const readManifest = runId => JSON.parse(readFileSync('build/ticket-18-faction-production-v1/' + runId + '/recipe.json', 'utf8'));
const firstId = 'faction-v1-27ef94cd6f32462ec36a';
let recipe = verifySeal(readManifest(firstId)), runId = firstId, checks = 0, fileOnly = 0;
const seen = new Set();
for (;;) {
  assert.ok(!seen.has(runId)); seen.add(runId);
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id='recipe' AND state='complete'").get(runId);
  if (!row) fileOnly++;
  const resolved = resolveFactionJournalRecipeV1({ db, runId, expectedHash: recipe.hash, readManifest });
  assert.deepEqual(resolved, recipe); checks++;
  assert.throws(() => resolveFactionJournalRecipeV1({ db, runId, expectedHash: hash('foreign'), readManifest })); checks++;
  if (!recipe.continuation) break;
  verifySeal(recipe.continuation); runId = recipe.continuation.parentRunId;
  const next = readManifest(runId); assert.equal(next.hash, recipe.continuation.parentRecipeHash); checks++;
  recipe = verifySeal(next);
}
assert.ok(fileOnly > 0, 'The actual production lineage must reproduce file manifests without recipe checkpoints'); checks++;
const isolated = new DatabaseSync(':memory:');
isolated.exec('CREATE TABLE runs(id TEXT, recipe TEXT); CREATE TABLE steps(run TEXT,id TEXT,state TEXT,artifact TEXT)');
const fixture = seal({ version: 'fixture_recipe', source: hash('frozen') });
const id = 'faction-v1-' + fixture.hash.slice(0, 20);
isolated.prepare('INSERT INTO runs VALUES(?,?)').run(id, fixture.hash);
let reads = 0;
const q = { db: isolated, runId: id, expectedHash: fixture.hash, readManifest: () => { reads++; return fixture; } };
assert.deepEqual(resolveFactionJournalRecipeV1(q), fixture); checks++;
assert.equal(reads, 1); checks++;
assert.throws(() => resolveFactionJournalRecipeV1({ ...q, readManifest: () => seal({ changed: true }) })); checks++;
isolated.prepare('INSERT INTO steps VALUES(?,?,?,?)').run(id, 'recipe', 'complete', JSON.stringify(seal({ value: fixture })));
assert.deepEqual(resolveFactionJournalRecipeV1({ ...q, readManifest: () => assert.fail('The explicit checkpoint is already present') }), fixture); checks++;
isolated.prepare('UPDATE steps SET artifact=?').run(JSON.stringify(seal({ value: seal({ changed: true }) })));
assert.throws(() => resolveFactionJournalRecipeV1(q)); checks++;
isolated.close(); db.close();
console.log(JSON.stringify({ passed: true, checks, actualAncestors: seen.size, actualFileOnlyManifests: fileOnly,
  providerCalls: 0, productionWrites: 0, scope: 'actual_recipe_storage_contract_not_skill_acceptance' }));
