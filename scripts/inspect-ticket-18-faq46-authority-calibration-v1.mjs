import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateOfficialFaqF4RuleV1 } from '../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
const source = input.frozenSources.prompt.sources.find(s => s.ref === 'faq-v1:46');
assert(source.passages[0].text.includes('Force Fields explicitly forbid Units of Size 2 or less from moving across them.'));
assert(source.passages[0].text.includes('Because Raptors are Size 1'));
const sourceHash = input.frozenSources.manifest.sourceHashes.find(s => s.ref === source.ref).hash;
const cases = [1, 2, 3].map(modelSize => {
  const request = { unitIsRaptor: true, modelSize, crossesForceField: true };
  const observed = evaluateOfficialFaqF4RuleV1('faq-v1:46', request);
  // Only the stated size restriction is graded. Size3 is a counterfactual
  // boundary control, not a claim that an official unmodified Raptor is Size3.
  const expectedWithinThisSizeRestriction = modelSize > 2;
  return { request, observed, expectedWithinThisSizeRestriction,
    passed: observed.legal === expectedWithinThisSizeRestriction,
    actualOfficialRaptorSize: modelSize === 1 };
});
const file = 'packages/rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
const report = seal({ version: 'faq46_source_authority_calibration_v1', inputHash: input.hash,
  sourceBinding: input.sourceBinding, source, sourceHash, kernel: { file, hash: sha256(await readFile(path.join(root, file))) },
  cases, passed: cases.every(c => c.passed),
  disposition: 'known_source_kernel_disagreement_blocks_faq46_grading_and_runtime_acceptance_until_versioned_fix',
  oldKernelChanged: false, sourceRefreshPerformed: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'faq46-authority-calibration.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.passed, matches: cases.filter(c => c.passed).length, cases: cases.length,
  hash: report.hash, sourceHash, kernelHash: report.kernel.hash, providerCalls: 0 }));
assert(report.passed, 'FAQ46 kernel size predicate contradicts the frozen source; do not use it to grade or accept play');
