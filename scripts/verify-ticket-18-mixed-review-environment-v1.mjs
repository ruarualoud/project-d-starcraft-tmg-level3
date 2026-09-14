import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1 } from '../packages/skill-production-v3/faction-mixed-review-assembly-v1.mjs';
import { FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1 } from '../packages/skill-production-v3/faction-ambiguous-replacement-v1.mjs';
import { openFactionMixedReviewEnvironmentV1 } from '../packages/skill-production-v3/faction-mixed-review-environment-v1.mjs';
import { factionReviewDecompositionArgsV1 } from '../packages/skill-production-v3/faction-review-decomposition-continuation-v1.mjs';
import { loadFactionOpeningFenceRecipeEnvironmentV1 } from '../packages/skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { createFactionReviewFragmentCapsuleV1 } from '../packages/skill-production-v3/faction-review-decomposition-v1.mjs';
import { verifyFactionReviewFragmentRuntimeV1 } from '../packages/skill-production-v3/faction-review-decomposition-runtime-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const parentRunId = 'faction-v1-5fdab77171f213a6e7c9', parentRecipe = await json(parentRunId + '/recipe');
const diagnosis = await json('terran-wire-context-diagnosis-v2');
const input = await json(diagnosis.originRunId + '/terran_armed_forces-input');
const args = factionReviewDecompositionArgsV1({ filename, input, diagnosis });
const { hash: ignored, ...body } = parentRecipe;
const recipe = seal({ ...body, mixedReviewBinding: FACTION_MIXED_REVIEW_ASSEMBLY_BINDING_V1,
  ambiguousReplacementBinding: FACTION_AMBIGUOUS_REPLACEMENT_BINDING_V1,
  mixedReviewReadinessHash: hash('explicit read-only fixture, not production readiness'),
  mixedReviewLegacyRoleIds: [parentRecipe.continuation.reviewDecompositionMigration.childContinuation.quarantinedTasks[0].fullRoleId],
  continuation: seal({ parentRunId, parentRecipeHash: parentRecipe.hash }) });
const openingFenceRecovery = await loadFactionOpeningFenceRecipeEnvironmentV1({ root: process.cwd(), recipe: parentRecipe, input });
const envArgs = { filename, recipe, parentRunId, parentRecipe, args, openingFenceRecovery };
const env = openFactionMixedReviewEnvironmentV1(envArgs);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
try {
  const jobs = env.resolveJobs();
  eq(jobs.map(j => [j.jobId, j.kind]), [['target.0', 'inherited'], ['target.1', 'replacement'], ['coverage.0', 'fresh']]);
  const part = env.readFragment(jobs[0].ref);
  const prepared = createFactionReviewFragmentCapsuleV1({ ...args, plan: env.plan, jobId: 'target.0' });
  const execution = env.resolveExecution({ part, prepared, plan: env.plan });
  eq(execution.egressBinding.model, 'deepseek-v4-flash');
  eq(Boolean(verifyFactionReviewFragmentRuntimeV1({ ...args, ...execution, part, prepared, plan: env.plan,
    dshBindingHash: recipe.dshBindingHash }).providerReceiptHash), true);
  const caps = await json(parentRunId + '/active-capabilities');
  const r = env.prepareReplacement({ capability: caps.reviewFragments.target });
  eq(r.replacement.prepared.job.id, 'target.1');
  eq(r.replacement.egressBinding.model, 'deepseek-v4.1-flash-expires-on-0910');
  eq(r.replacement.grant.originalReserveMicros, 800000);
  eq(r.replacement.request.input, r.replacement.prepared.capsule.compiledInput);
  eq(r.replacement.request.requestId !== env.authenticated.proof.originAttemptId, true);
  assert.throws(() => env.readFragment({ ...jobs[0].ref, runId: parentRunId })); checks++;
  assert.throws(() => env.readCapabilityReceipt(hash('not a paid capability'))); checks++;
  assert.throws(() => openFactionMixedReviewEnvironmentV1({ ...envArgs, parentRunId: 'faction-v1-' + '0'.repeat(20) })); checks++;
  eq(env.allowedRunIds.includes('faction-v1-27ef94cd6f32462ec36a'), true);
} finally { env.close(); }
const files = ['packages/skill-production-v3/faction-mixed-review-environment-v1.mjs', 'scripts/verify-ticket-18-mixed-review-environment-v1.mjs'];
const report = seal({ version: 'faction_mixed_review_environment_component_v1', passed: true, checks,
  actualParentRunId: parentRunId, exactOriginalRequestAuthenticated: true, oldPartActualModelRetained: true,
  sourceJournalReadOnly: true, providerCalls: 0, actualDshSessions: 0,
  productionMainWired: false, semanticAcceptance: false, runtimeAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'mixed-review-environment-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, productionMainWired: false }));
