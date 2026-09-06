import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeFactionPhaseFieldSeedV1 } from '../packages/skill-production-v3/faction-phase-field-seed-v1.mjs';
import { validateFactionPhaseSeedMigrationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const run = 'phase-repair-bd58d5270d852324f694';
const input = await json('terran_armed_forces-input'), readiness = await json('phase-field-seed-readiness');
const seed = { sourceSection: await json(run + '/source-section'), candidate: await json(run + '/candidate'),
  evidence: await json(run + '/verified-evidence'), capture: await json(run + '/source-capture') };
const { binding } = materializeFactionPhaseFieldSeedV1({ input, seed });
const parent = await json(seed.evidence.sourceRunId + '/recipe');
const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
const next = reseal(parent, { phaseFieldBinding: binding, phaseFieldReadinessHash: readiness.hash,
  codeHashes: [...new Map([...parent.codeHashes, ...readiness.codeHashes].map(row => [row.file, row])).values()] });
const migration = { binding, readiness }, args = { parent, next, migration };
assert.equal(validateFactionPhaseSeedMigrationV1({ parent, next: parent }), null);
const proof = validateFactionPhaseSeedMigrationV1(args); assert.equal(proof.bindingHash, binding.hash);
assert.throws(() => validateFactionPhaseSeedMigrationV1({ parent, next }), { code: 'FACTION_PHASE_SEED_MIGRATION_PROOF_MISSING' });
for (const fields of [{ actualRepairReapplied: false }, { freshNegativeRetained: false }, { freshRequestNamespace: false },
  { previousRawRolesRetained: false }, { injectedReviews: 8 }, { evidenceHash: hash('foreign') }, { providerCalls: 1 }]) {
  const changed = reseal(readiness, fields);
  assert.throws(() => validateFactionPhaseSeedMigrationV1({ ...args, next: reseal(next, { phaseFieldReadinessHash: changed.hash }),
    migration: { binding, readiness: changed } }), { code: 'FACTION_PHASE_SEED_MIGRATION_PROOF_INVALID' });
}
assert.throws(() => validateFactionPhaseSeedMigrationV1({ ...args, parent: next, next: parent }), { code: 'FACTION_PHASE_SEED_BINDING_DRIFT' });
assert.throws(() => validateFactionPhaseSeedMigrationV1({ ...args, parent: reseal(parent, { other: 'different-parent' }) }),
  { code: 'FACTION_PHASE_SEED_MIGRATION_PROOF_INVALID' });
assert.throws(() => validateFactionPhaseSeedMigrationV1({ ...args, next: reseal(next, {
  codeHashes: next.codeHashes.map(row => row.file.endsWith('faction-phase-field-seed-v1.mjs') ? { ...row, hash: hash('foreign') } : row) }) }),
  { code: 'FACTION_PHASE_SEED_MIGRATION_PROOF_INVALID' });
const files = ['packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/verify-ticket-18-faction-phase-seed-migration-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 13, codeHashes, bindingHash: binding.hash, readinessHash: readiness.hash,
  sourceRecipeHash: parent.hash, proof, providerCalls: 0, realContinuationPreflightPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'phase-seed-migration-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 13, providerCalls: 0, hash: report.hash }));
