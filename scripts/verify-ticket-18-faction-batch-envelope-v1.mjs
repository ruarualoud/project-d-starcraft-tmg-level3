import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeFactionBatchEnvelopeV1, validateFactionDraftBatchV1, inspectFactionBatchScopeV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let original, retried, outline;
try {
  const artifact = suffix => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get('faction-v1-c27e73d05132d0b01a17', 'faction.terran_armed_forces.faction.terran_armed_forces.phase_tempo.1.' + suffix).artifact)).value;
  original = artifact('generator-items.0'); retried = artifact('generator-items.0.schema'); outline = artifact('generator-outline').output.outline;
} finally { db.close(); }
const args = { input, outline, indices: [0, 1] }, normalized = normalizeFactionBatchEnvelopeV1(original.output);
assert.deepEqual(normalized.receipt.moved.map(r => r.index), [0, 1]); assert.equal(normalized.receipt.fieldValuesChanged, false);
const reverse = { items: normalized.output.items.map(({ index, value }) => ({ index, ...value })) };
assert.equal(hash(reverse), hash(original.output)); assert.equal(normalized.receipt.rawOutputHash, hash(original.output));
assert.equal(validateFactionDraftBatchV1(original.output, args).length, 2);
assert.equal(validateFactionDraftBatchV1(retried.output, args).length, 2);
assert.equal(hash(validateFactionDraftBatchV1(original.output, args)), hash(normalized.output.items));
assert.equal(normalizeFactionBatchEnvelopeV1(normalized.output).receipt.moved.length, 0);
for (const change of [item => ({ ...item, invented: 'unknown' }), item => ({ ...item, value: normalized.output.items[0].value }),
  item => { const { risk, ...missing } = item; return missing; }]) {
  const bad = structuredClone(original.output); bad.items[0] = change(bad.items[0]);
  assert.throws(() => normalizeFactionBatchEnvelopeV1(bad), { code: 'OUTPUT_SCHEMA_INVALID' });
}
const repeated = structuredClone(original.output); repeated.items[1].index = 0;
assert.throws(() => validateFactionDraftBatchV1(repeated, args), { code: 'FACTION_BATCH_SCOPE_INVALID' });
const omitted = structuredClone(original.output); omitted.items[0].sourceRefs = omitted.items[0].sourceRefs.slice(1);
assert.throws(() => validateFactionDraftBatchV1(omitted, args), { code: 'FACTION_BATCH_SOURCE_OMISSION' });
assert.equal(inspectFactionBatchScopeV1(omitted, args).targets[0].missingSourceRefs.length, 1);
assert.throws(() => validateFactionDraftBatchV1(original.output, { ...args, completedRecommendations: [normalized.output.items[0].value] }),
  { code: 'FACTION_BATCH_DUPLICATE_RECOMMENDATION' });
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'scripts/verify-ticket-18-faction-batch-envelope-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 13, codeHashes, actualOriginalArtifactHash: original.hash, rejectedRetryHash: retried.hash,
  normalization: normalized.receipt, providerCalls: 0, semanticAcceptance: false, trainingTruth: false });
await writeFile(path.join(base, 'batch-envelope-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 13, providerCalls: 0, rawTextPreserved: true, hash: report.hash }));
