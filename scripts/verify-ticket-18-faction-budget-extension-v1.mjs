import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionBudgetExtensionV1, projectFactionCumulativeCostV1,
  validateFactionBudgetExtensionV1 } from '../packages/skill-production-v3/faction-budget-extension-v1.mjs';
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withCheckpointContinuation } from '../packages/skill-production/continuation.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const parent = verifySeal(JSON.parse(await readFile(path.join(base, 'faction-v1-228b8989edaaba791753/recipe.json'), 'utf8')));
const reseal = (value, fields) => { const { hash: ignored, ...body } = value; return seal({ ...body, ...fields }); };
const extension = createFactionBudgetExtensionV1(parent), next = reseal(parent, { budgetExtension: extension, limits: extension.nextLimits });
assert.equal(validateFactionBudgetExtensionV1({ parent, next: parent }), null);
const proof = validateFactionBudgetExtensionV1({ parent, next }); assert.equal(proof.extensionHash, extension.hash);
assert.equal(validateFactionBudgetExtensionV1({ parent: next, next }).hash, proof.hash);
assert.throws(() => createFactionBudgetExtensionV1(next), { code: 'FACTION_BUDGET_EXTENSION_PARENT_INVALID' });
assert.throws(() => validateFactionBudgetExtensionV1({ parent, next: reseal(parent, { limits: extension.nextLimits }) }),
  { code: 'FACTION_BUDGET_EXTENSION_REQUIRED' });
assert.throws(() => validateFactionBudgetExtensionV1({ parent: next, next: parent }), { code: 'FACTION_BUDGET_EXTENSION_REQUIRED' });
for (const fields of [{ maxCalls: 801 }, { maxTokens: 181_000_000 }, { maxCostMicros: 36_000_000 },
  { maxWallMs: 25 * 60 * 60 * 1000 }, { maxInputBytes: 2_000_000 }, { maxRevisions: 4 }])
  assert.throws(() => validateFactionBudgetExtensionV1({ parent, next: reseal(next, { limits: { ...next.limits, ...fields } }) }),
    { code: 'FACTION_BUDGET_EXTENSION_LIMIT_DRIFT' });
for (const fields of [{ parentRecipeHash: hash('foreign') }, { originalClockPreserved: false }, { allPriorAccountingPreserved: false }])
  assert.throws(() => validateFactionBudgetExtensionV1({ parent, next: reseal(next, { budgetExtension: reseal(extension, fields) }) }),
    { code: 'FACTION_BUDGET_EXTENSION_INVALID' });
assert.throws(() => validateFactionBudgetExtensionV1({ parent: next, next: reseal(next, {
  budgetExtension: reseal(extension, { reason: 'renewed without inherited spending' }) }) }), { code: 'FACTION_BUDGET_EXTENSION_IMMUTABLE' });
const firstProjection = projectFactionCumulativeCostV1({ historyMicros: 34_013_743,
  globalSpentMicros: 33_172_152, inheritedCostMicros: 20_501_460,
  currentRunCostMicros: 0, chainLimitMicros: 35_000_000 });
assert.equal(firstProjection.currentCumulativeMicros, 67_185_895);
assert.equal(firstProjection.remainingChainMicros, 14_498_540);
assert.equal(firstProjection.projectedMaximumCumulativeMicros, 81_684_435);
const afterLocalSpend = projectFactionCumulativeCostV1({ historyMicros: 34_013_743,
  globalSpentMicros: 35_172_152, inheritedCostMicros: 20_501_460,
  currentRunCostMicros: 2_000_000, chainLimitMicros: 35_000_000 });
assert.equal(afterLocalSpend.projectedMaximumCumulativeMicros,
  firstProjection.projectedMaximumCumulativeMicros);
assert.throws(() => projectFactionCumulativeCostV1({ historyMicros: 0,
  globalSpentMicros: 0, inheritedCostMicros: 35_000_001,
  currentRunCostMicros: 0, chainLimitMicros: 35_000_000 }),
{ code: 'FACTION_COST_PROJECTION_INVALID' });
const files = ['packages/skill-production-v3/faction-budget-extension-v1.mjs', 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/verify-ticket-18-faction-budget-extension-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const temp = await mkdtemp(path.join(base, 'budget-extension-test-')), filename = path.join(temp, 'fixture.sqlite');
const fixtureParent = seal({ version: 'faction_strategy_production_v1', limits: extension.priorLimits,
  inputHashes: [hash('fixture-complete-input')], codeHashes: [], sourceBinding: hash('frozen'),
  continuation: seal({ accounting: { calls: 17, tokens: 500, costMicros: 200 } }) });
const fixtureRun = 'faction-v1-' + fixtureParent.hash.slice(0, 20);
const sourceStore = openProductionStore(filename, { runId: fixtureRun, recipeHash: fixtureParent.hash });
let local;
try {
  const start = sourceStore.acquire('production-start', { recipeHash: fixtureParent.hash }); sourceStore.finish(start, { began: 1000 });
  const rawRole = seal({ roleId: 'faction.fixture.tutor', output: { lesson: ['fixture'] }, loop: { transcript: [] } });
  sourceStore.finish(sourceStore.acquire(rawRole.roleId, { fullInput: true }), rawRole);
  sourceStore.reserve('paid', { request: 1 }, 100, 30);
  sourceStore.settle('paid', { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 10, response: { fixture: true } });
  sourceStore.reserve('unknown-failure', { request: 2 }, 50, 30);
  sourceStore.settle('unknown-failure', { code: 'INJECTED_TRANSPORT_FAILURE' });
  const fixtureExtension = createFactionBudgetExtensionV1(fixtureParent);
  const fixtureReadiness = seal({ passed: true, providerCalls: 0, codeHashes });
  const fixtureNext = reseal(fixtureParent, { limits: fixtureExtension.nextLimits, budgetExtension: fixtureExtension,
    budgetExtensionReadinessHash: fixtureReadiness.hash, codeHashes: codeHashes.filter(r => r.file.includes('/packages/') || r.file.startsWith('packages/')) });
  const deps = { filename, parentRunId: fixtureRun, parent: fixtureParent,
    parentReport: seal({ runId: fixtureRun, recipeHash: fixtureParent.hash, failure: { code: 'INJECTED_TRANSPORT_FAILURE' } }),
    next: fixtureNext, budgetExtensionReadiness: fixtureReadiness };
  const result = inspectFactionContinuationV1(deps);
  assert.deepEqual(result.manifest.accounting, { calls: 19, tokens: 542, costMicros: 260 });
  assert.equal(result.manifest.parentStart, 1000); assert.equal(result.manifest.reusable.length, 1);
  assert.equal(result.manifest.budgetExtensionProof.extensionHash, fixtureExtension.hash);
  local = openProductionStore(filename, { runId: 'budget-fixture-child', recipeHash: fixtureNext.hash,
    maxCalls: fixtureNext.limits.maxCalls - 19, maxTokens: fixtureNext.limits.maxTokens - 542,
    maxCostMicros: fixtureNext.limits.maxCostMicros - 260 });
  const wrapped = withCheckpointContinuation(local, result);
  assert.equal(wrapped.acquire(rawRole.roleId, { fullInput: true }).artifact.hash, rawRole.hash);
  assert.equal(local.summary().calls, 0); assert.equal(local.globalSummary().calls, 2);
  assert.throws(() => inspectFactionContinuationV1({ ...deps, budgetExtensionReadiness: null }), { code: 'FACTION_BUDGET_READINESS_REQUIRED' });
  assert.throws(() => inspectFactionContinuationV1({ ...deps, next: reseal(fixtureNext, { inputHashes: [hash('changed source')] }) }),
    { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' });
} finally { local?.close(); sourceStore.close(); }
const report = seal({ passed: true, checks: 29, codeHashes, originalParentRecipeHash: parent.hash,
  sqliteAncestorUsageAndUnknownReservePreserved: true, originalClockPreserved: true, copiedProviderAttempts: 0,
  extension, proof, productionJournalMutationPerformed: false, fixtureJournalMutated: true,
  actualContinuationPreflightPerformed: false, providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'budget-extension-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 29, limits: extension.nextLimits, providerCalls: 0, hash: report.hash }));
