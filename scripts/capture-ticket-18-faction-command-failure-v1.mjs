import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const runId = 'faction-v1-907961cf3b449dd64c64';
const [input, knownRulePolicy, sourceSection, candidate, evidence, recipe] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'),
  json('field-repair-d393a7c3884ae5104f96/source-section'), json('field-repair-d393a7c3884ae5104f96/candidate'),
  json('field-repair-d393a7c3884ae5104f96/verified-evidence'), json(runId + '/recipe')]);
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let roles;
try { roles = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(runId)
  .map(r => [r.id, verifySeal(JSON.parse(r.artifact)).value])); } finally { db.close(); }
const temp = await mkdtemp(path.join(base, 'command-capture-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'command-capture', recipeHash: hash(runId) });
const stageId = 'faction.terran_armed_forces.faction.terran_armed_forces.phase_tempo.1.review-target-batch-v1.adversarial.0.0';
let request;
const runtime = { async role(r) { const id = r.packet.id + '.' + r.roleId;
  if (id === stageId) { request = r; fail('CAPTURED_TARGET_REQUEST'); }
  const saved = roles.get(id); assert.equal(saved?.roleId, id); return saved;
} };
try { await assert.rejects(() => produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed: { sourceSection, candidate, evidence }, runtime, store }),
  { code: 'CAPTURED_TARGET_REQUEST' }); } finally { store.close(); }
assert(request);
const captured = seal({ version: 'faction_failed_review_role_capture_v1', runId, recipeHash: recipe.hash,
  stageId, request, providerCalls: 0, qualificationClaimed: false, trainingTruth: false });
await writeFile(path.join(base, runId, 'failed-review-role-input.json'), JSON.stringify(captured, null, 2));
console.log(JSON.stringify({ captured: true, stageId, hash: captured.hash, providerCalls: 0 }));
