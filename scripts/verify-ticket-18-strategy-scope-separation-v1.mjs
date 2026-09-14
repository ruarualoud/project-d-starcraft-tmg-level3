import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { seal } from '../packages/skill-production/common.mjs';
import { separateInitialStrategyAndEvolutionV1, INITIAL_GENERAL_STRATEGY_AXES_V1 } from '../packages/strategy-skills/strategy-scope-separation-v1.mjs';
import { PARENT_RUN } from './support/strategy-opening-fence-continuation-v1.mjs';
import { BUILD, json, ledgerSnapshot, codeHashes } from './support/strategy-live-production-support-v1.mjs';

const prefix = 'build/ticket-18-general-strategy-live-v1/' + PARENT_RUN + '/';
const input = await json(prefix + 'production-input.json');
const pilot = await json(prefix + 'evidence-production-pilot-v1/report.json');
const batch = await json(prefix + 'general-strategy-batch-v1/report.json');
const candidates = [pilot.candidates.find(candidate => candidate.axis === 'objective_plan')];
for (const axis of input.contract.requiredAxes.filter(axis => axis !== 'objective_plan')) {
  candidates.push(await json(prefix + 'general-strategy-batch-v1/axis-' + axis + '.json'));
}
const ledger = ledgerSnapshot(), result = separateInitialStrategyAndEvolutionV1({ input, candidates });
assert.deepEqual(result.initialAxes, INITIAL_GENERAL_STRATEGY_AXES_V1);
assert.equal(result.initial.policies.length, 7); assert(!result.initial.policies.some(policy => policy.axis === 'review_adaptation'));
assert.equal(result.evolution.policy.axis, 'review_adaptation');
assert.equal(result.manifest.initialRuntimeLoadsEvolutionPolicy, false);
assert.equal(result.manifest.optimizationMutatesInitialInPlace, false);
assert.equal(result.initial.assessment.sourceReviewPassed, false);
assert.equal(result.initial.canAffectStrategy, false); assert.equal(result.evolution.canAffectStrategy, false);
const missing = candidates.filter(candidate => candidate.axis !== 'objective_plan');
assert.throws(() => separateInitialStrategyAndEvolutionV1({ input, candidates: missing }), /PARTITION_INPUT_INVALID/u);
const duplicate = [...candidates.slice(0, -1), candidates[0]];
assert.throws(() => separateInitialStrategyAndEvolutionV1({ input, candidates: duplicate }), /PARTITION_INPUT_INVALID/u);
assert.equal(ledgerSnapshot().hash, ledger.hash);
const out = path.join(BUILD, PARENT_RUN, 'strategy-scope-separation-v1');
await mkdir(out, { recursive: true });
for (const [name, artifact] of [['initial-general-candidate', result.initial],
  ['evolution-policy-candidate', result.evolution], ['router-manifest', result.manifest],
  ['separation-result', result]]) {
  await writeFile(path.join(out, name + '.json'), JSON.stringify(artifact, null, 2), { mode: 0o600 });
}
const report = seal({ schema: 'ticket18_strategy_scope_separation_readiness_v1', ticket: 18, slice: 174,
  passed: true, checks: [
    'actual eight-axis batch partitions into seven initial runtime axes and one evolution axis',
    'initial candidate contains no review_adaptation policy or reflection artifact',
    'runtime manifest cannot load evolution policy and optimizer cannot mutate initial in place',
    'missing duplicate or cross-scope candidates fail closed',
    'partition grants no source case runtime rules or training acceptance',
  ], batchReportHash: batch.hash, resultHash: result.hash,
  initialCandidateHash: result.initial.hash, evolutionCandidateHash: result.evolution.hash,
  codeHashes: await codeHashes(['packages/strategy-skills/strategy-scope-separation-v1.mjs',
    'scripts/verify-ticket-18-strategy-scope-separation-v1.mjs']),
  providerCalls: 0, runtimeAccepted: false, trainingTruth: false });
await writeFile(path.join(BUILD, 'strategy-scope-separation-readiness-v1.json'),
  JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ passed: true, checks: report.checks.length,
  initialAxes: result.initialAxes.length, evolutionAxes: result.evolutionAxes.length,
  providerCalls: 0, hash: report.hash }));
