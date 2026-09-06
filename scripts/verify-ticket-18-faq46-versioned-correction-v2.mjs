import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialFaq46SizeCorrectionV2 } from '../packages/rule-atoms/official-faq46-force-field-size-correction-v2.mjs';
import { evaluateOfficialFaqF4RuleV1 } from '../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
const old = verifySeal(JSON.parse(await readFile(path.join(base, 'faq46-authority-calibration.json'), 'utf8')));
const source = input.frozenSources.prompt.sources.find(s => s.ref === 'faq-v1:46');
const args = { sourceLockHash: input.sourceBinding.faq, source }, correction = createOfficialFaq46SizeCorrectionV2(args);
verifySeal(correction.manifest);
assert.equal(old.passed, false); assert.equal(old.kernel.hash, correction.manifest.legacyKernelHash);
assert.equal(sha256(await readFile(path.join(root, old.kernel.file))), old.kernel.hash, 'Do not rewrite the frozen legacy kernel');
const cases = old.cases.map(c => {
  assert.deepEqual(evaluateOfficialFaqF4RuleV1('faq-v1:46', c.request), c.observed);
  const current = correction.evaluate(c.request); verifySeal(current);
  assert.equal(current.allowedWithinThisSizeRestriction, c.expectedWithinThisSizeRestriction);
  assert(!current.completeMoveLegalityProven && !current.forceFieldDestructionResolved && !current.roomMutationPerformed);
  return { request: c.request, old: c.observed, current, sourceExpected: c.expectedWithinThisSizeRestriction };
});
const noCross = { unitIsRaptor: true, modelSize: 1, crossesForceField: false }, noCrossHash = hash(noCross);
assert.equal(correction.evaluate(noCross).blockedBySizeRestriction, false); assert.equal(hash(noCross), noCrossHash);
for (const request of [{ modelSize: 1, crossesForceField: true }, { unitIsRaptor: false, modelSize: 1, crossesForceField: true },
  { unitIsRaptor: true, modelSize: 1.5, crossesForceField: true }, { unitIsRaptor: true, modelSize: 1, crossesForceField: 'yes' },
  { unitIsRaptor: true, modelSize: 1, crossesForceField: true, allow: true }]) {
  assert.throws(() => correction.evaluate(request), { code: 'FAQ46_V2_INPUT_OUTSIDE_DECLARED_SCOPE' });
}
assert.throws(() => createOfficialFaq46SizeCorrectionV2({ ...args, sourceLockHash: hash('unfrozen') }), { code: 'FAQ46_V2_FROZEN_SOURCE_DRIFT' });
const altered = structuredClone(source); altered.passages[0].text += ' changed';
assert.throws(() => createOfficialFaq46SizeCorrectionV2({ ...args, source: altered }), { code: 'FAQ46_V2_FROZEN_SOURCE_DRIFT' });
assert(!correction.manifest.defaultRouterChanged && !correction.manifest.currentReleaseAdopted && !correction.manifest.runtimeAccepted);
const files = [old.kernel.file, 'packages/rule-atoms/official-faq46-force-field-size-correction-v2.mjs', 'scripts/verify-ticket-18-faq46-versioned-correction-v2.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 12, originalFailureHash: old.hash, correctionManifest: correction.manifest, cases, codeHashes,
  sourceRefreshPerformed: false, providerCalls: 0, currentRouterAdoptionPending: true, runtimeAcceptanceBlocked: true, trainingTruth: false });
await writeFile(path.join(base, 'faq46-versioned-correction-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 12, correctedBoundaryCases: 3, legacyKernelUnchanged: true,
  runtimeAdoptionPending: true, providerCalls: 0, hash: report.hash }));
