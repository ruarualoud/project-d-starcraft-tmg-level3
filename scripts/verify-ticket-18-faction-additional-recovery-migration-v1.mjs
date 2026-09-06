import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAdditionalFactionCommandRecoveryV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const parentRunId = 'faction-v1-228b8989edaaba791753';
const [parent, gate] = await Promise.all([json(parentRunId + '/recipe'), json(parentRunId + '/review-metadata-recovery-readiness')]);
const reseal = (value, changes) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...changes }); };
const codeHashes = parent.codeHashes.map(row => gate.codeHashes.find(current => current.file === row.file) || row);
const next = reseal(parent, { codeHashes, additionalCommandRecoveryBindings: [gate.recoveryManifest],
  additionalCommandRecoveryReadinessHashes: [gate.hash] });
const args = { parent, next, gates: [gate] }, proof = validateAdditionalFactionCommandRecoveryV1(args);
let checks = 0;
function check(name, run) { run(); checks++; }
check('new source-bound recovery appends without replacing original paid origin', () => {
  assert.equal(proof.bindings[0], gate.recoveryManifest.hash);
  assert.deepEqual(proof.priorBindings, []);
  assert.equal(next.commandRecoveryBinding.hash, parent.commandRecoveryBinding.hash);
  assert.equal(hash(next.limits), hash(parent.limits));
});
check('existing appended recovery survives a later continuation unchanged', () => {
  assert.deepEqual(validateAdditionalFactionCommandRecoveryV1({ parent: next, next, gates: [gate] }).priorBindings, proof.bindings);
});
check('old recipes do not acquire any implicit additional recovery', () => assert.equal(validateAdditionalFactionCommandRecoveryV1({ parent, next: parent }), null));
check('readiness proof required', () => assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ parent, next }), { code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_MISSING' }));
check('appended lineage cannot be removed', () => assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ parent: next, next: parent }), { code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_SCOPE' }));
check('unrelated terminal origin cannot be appended', () => {
  const altered = reseal(gate.recoveryManifest, { parentRecipeHash: hash('foreign') });
  const badGate = reseal(gate, { recoveryManifest: altered });
  assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ parent,
    next: reseal(next, { additionalCommandRecoveryBindings: [altered], additionalCommandRecoveryReadinessHashes: [badGate.hash] }), gates: [badGate] }),
  { code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_INVALID' });
});
for (const fields of [{ exactPriorProviderRequestsMatched: false }, { rawOutputPreserved: false },
  { originalNegativeJudgmentsPreserved: 0 }, { nonemptyMetadataRejected: false }, { attemptsCopied: 2 }, { providerCalls: 1 }]) {
  check('weakened replay/preservation evidence rejected', () => {
    const altered = reseal(gate, fields);
    assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ ...args,
      next: reseal(next, { additionalCommandRecoveryReadinessHashes: [altered.hash] }), gates: [altered] }),
    { code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_INVALID' });
  });
}
check('producer code must match replayed adapter and target normalization', () => assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ ...args,
  next: reseal(next, { codeHashes: next.codeHashes.map(row => row.file.endsWith('faction-review-targets-v1.mjs') ? { ...row, hash: hash('other') } : row) }) }),
{ code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_PROOF_INVALID' }));
check('old additional origin cannot be overwritten', () => {
  const altered = reseal(gate.recoveryManifest, { parentRecipeHash: hash('changed') });
  assert.throws(() => validateAdditionalFactionCommandRecoveryV1({ parent: next,
    next: reseal(next, { additionalCommandRecoveryBindings: [altered] }), gates: [gate] }), { code: 'FACTION_ADDITIONAL_COMMAND_RECOVERY_PREFIX_DRIFT' });
});
const files = ['packages/skill-production-v3/faction-continuation-v1.mjs', 'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs', 'scripts/verify-ticket-18-faction-additional-recovery-migration-v1.mjs'];
const report = seal({ passed: true, checks, proof, inputHash: gate.inputHash,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  actualReadinessHash: gate.hash, originalPrimaryBindingPreserved: true, budgetAndClockNotReset: true,
  providerCalls: 0, semanticAcceptanceInherited: false, trainingTruth: false });
await writeFile(path.join(base, 'additional-recovery-migration-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, providerCalls: 0, hash: report.hash }));
