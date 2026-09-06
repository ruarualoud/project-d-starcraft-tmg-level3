import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recheckFactionDependencyContextV1, planFactionDependencyRecheckV1 } from '../packages/skill-production-v3/faction-dependency-recheck-v1.mjs';
import { compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { checkDependencyRecheckBudgetV1 } from '../packages/skill-production-v3/dependency-recheck-budget-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input');
const diagnosis = await json('faction-v1-182042133d7ba5b21c2a/phase-regression-diagnosis'), captured = diagnosis.captured[0];
const plan = planFactionDependencyRecheckV1({ input, captured });
const limits = { maxCalls: 8, maxCostMicros: 8_000_000, maxTokens: 4_000_000, maxInputBytes: 1_000_000 };
const budget = checkDependencyRecheckBudgetV1(limits);
assert.equal(budget.singleRequestMicros, 3_563_254); assert.equal(budget.plannedCeilingMicros, 7_126_508);
for (const changed of [{ maxCostMicros: 2_000_000 }, { maxCostMicros: 7_126_507 }, { maxTokens: 2_008_191 }, { maxCalls: 1 }])
  assert.throws(() => checkDependencyRecheckBudgetV1({ ...limits, ...changed }), { code: 'DEPENDENCY_RECHECK_PREFLIGHT_RESERVATION_TOO_SMALL' });
assert(checkDependencyRecheckBudgetV1({ ...limits, maxCostMicros: 7_126_508, maxTokens: 2_008_192, maxCalls: 2 }));
const saved = new Map(); let calls = 0, maxTaskBytes = 0;
const store = { acquire(id) { return { id, cached: false }; }, finish(lease, value) { return value; } };
async function exercise(negative, malformed = false) {
  const runtime = { async role(request) {
    const key = request.roleId + ':' + negative + ':' + malformed;
    if (saved.has(key)) return saved.get(key);
    calls++;
    const { sourceDependencyContextAtEnd, ...originalWorkspace } = request.workspace;
    assert.deepEqual(originalWorkspace, captured.request.workspace);
    assert.equal(sourceDependencyContextAtEnd.hash, plan.dependencyContext.hash);
    const task = compileGlobalTask(input.frozenSources, request.instruction, request.workspace);
    maxTaskBytes = Math.max(maxTaskBytes, Buffer.byteLength(task));
    assert(task.includes('Terran Tenacity <Active> <Movement Phase>'));
    assert(task.includes('any Special Abilities that are resolved using the standard rules described in Parts 10.1 through 10.4.'));
    assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
    assert(!Object.hasOwn(request.workspace, 'previousJudgments'));
    const targets = request.workspace.outputRequestAtEnd.targetContract.targets;
    const output = { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
      focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
      verdict: negative ? 'uncertain' : 'supported', reason: 'Injected review, not source truth.',
      sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })),
      coverage: request.workspace.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered',
        recommendationIndices: request.workspace.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []),
        reason: 'Injected coverage only.' })) };
    if (malformed) output.verdicts[0].targetId = 'invented';
    const result = seal({ output, roleId: request.packet.id + '.' + request.roleId, fixtureOnly: true }); saved.set(key, result); return result;
  } };
  return recheckFactionDependencyContextV1({ input, captured, runtime, store });
}
const positive = await exercise(false), before = calls;
assert(positive.allTargetVerdictsSupported); assert.equal(positive.inspectedTargets, 2);
assert.equal(positive.totalSectionRecommendations, 8); assert.equal(positive.reviews.length, 2);
for (const key of ['completeSectionSourceReviewPassed', 'actualRepairPerformed', 'productionRevisionBudgetReset',
  'actualRoomReplayPerformed', 'runtimeAccepted', 'trainingTruth']) assert.equal(positive[key], false);
assert.equal((await exercise(false)).hash, positive.hash); assert.equal(calls, before);
const negative = await exercise(true); assert(!negative.allTargetVerdictsSupported);
assert(negative.reviews.every(r => r.bound.review.verdicts.every(v => v.verdict === 'uncertain')));
await assert.rejects(exercise(false, true), { code: 'FACTION_REVIEW_TARGET_IDENTITY_MISMATCH' });
const files = ['packages/skill-production-v3/faction-dependency-recheck-v1.mjs',
  'packages/skill-production-v3/dependency-recheck-budget-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs', 'packages/skill-production-v3/faction-review-targets-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'scripts/verify-ticket-18-faction-dependency-recheck-v1.mjs'];
const report = seal({ passed: true, inputHash: input.hash, captureHash: captured.hash, planHash: plan.hash,
  fullSourcesAndDraftPreserved: true, negativeRetained: true, cachedRoleReuse: true, invalidTargetRejected: true,
  partialReviewNotSectionAcceptance: true, productionRevisionBudgetReset: false, maxTaskBytes,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  budgetPreflight: budget, insufficientReservationRejectedBeforeCredentials: true,
  injectedModelCalls: calls, newProviderCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'dependency-recheck-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, injectedModelCalls: calls, maxTaskBytes, newProviderCalls: 0, hash: report.hash }));
