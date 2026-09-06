import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFactionSourceCorrectionMigrationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const parent = await json('faction-v1-907961cf3b449dd64c64/recipe');
const gates = await Promise.all(['source-field-repair-v2-readiness', 'source-field-dsh-v2-readiness', 'source-repair-workflow-v2-readiness', 'command-envelope-readiness'].map(json));
const body = value => { const { hash: ignored, ...b } = value; return b; };
const code = new Map(parent.codeHashes.map(r => [r.file, r]));
for (const gate of gates) for (const row of gate.codeHashes) code.set(row.file, row);
const next = seal({ ...body(parent), codeHashes: [...code.values()], registeredSourceFieldRepair: true,
  commandRecoveryBinding: gates[3].recoveryManifest, sourceCorrectionReadinessHashes: gates.map(g => g.hash) });
const proof = validateFactionSourceCorrectionMigrationV1({ parent, next, sourceCorrectionMigration: gates });
assert.equal(proof.files.length, 3); assert.equal(proof.commandRecoveryBindingHash, gates[3].recoveryManifest.hash);
assert.equal(validateFactionSourceCorrectionMigrationV1({ parent, next: parent }), null);
assert.throws(() => validateFactionSourceCorrectionMigrationV1({ parent, next }), { code: 'FACTION_SOURCE_CORRECTION_PROOF_MISSING' });
for (const [index, fields] of [[0, { atomicApplicationAcrossBatches: false }], [0, { completedBatchReused: false }],
  [1, { fullSourceDeliveryVerified: false }], [2, { freshNegativeRetained: false }],
  [3, { exactPriorProviderRequestsMatched: false }], [3, { originalNegativeJudgmentsPreserved: 0 }]]) {
  const changed = gates.map((g, n) => n === index ? seal({ ...body(g), ...fields }) : g);
  const changedNext = seal({ ...body(next), sourceCorrectionReadinessHashes: changed.map(g => g.hash) });
  assert.throws(() => validateFactionSourceCorrectionMigrationV1({ parent, next: changedNext, sourceCorrectionMigration: changed }),
    { code: 'FACTION_SOURCE_CORRECTION_PROOF_INVALID' });
}
assert.throws(() => validateFactionSourceCorrectionMigrationV1({ parent: next, next: parent, sourceCorrectionMigration: gates }),
  { code: 'FACTION_SOURCE_CORRECTION_REMOVED' });
const alteredBinding = seal({ ...body(next.commandRecoveryBinding), modelHash: hash('wrong') });
assert.throws(() => validateFactionSourceCorrectionMigrationV1({ parent: next,
  next: seal({ ...body(next), commandRecoveryBinding: alteredBinding }), sourceCorrectionMigration: gates }),
  { code: 'FACTION_COMMAND_RECOVERY_BINDING_DRIFT' });
assert.throws(() => validateFactionSourceCorrectionMigrationV1({ parent, next: seal({ ...body(next),
  codeHashes: next.codeHashes.map(r => r.file.endsWith('faction-command-envelope-v1.mjs') ? { ...r, hash: hash('wrong') } : r) }), sourceCorrectionMigration: gates }),
  { code: 'FACTION_SOURCE_CORRECTION_PROOF_INVALID' });
const files = ['packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/verify-ticket-18-faction-source-correction-migration-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 12, codeHashes, proof, inputHash: parent.inputHashes[0], providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'source-correction-migration-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, providerCalls: 0, hash: report.hash }));
