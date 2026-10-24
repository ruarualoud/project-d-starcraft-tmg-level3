import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const saved = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const plan = JSON.parse(saved.planSerialized);
const code = await fs.readFile(new URL('../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs', import.meta.url), 'utf8');
const start = code.indexOf('    if (request.scope !== undefined', code.indexOf('  async function reviewFinalPlan('));
const end = code.indexOf('    let retryDispatch = null;', start);
assert(start > 0 && end > start);
// Execute the actual production scope-selection block with the saved v2 Plan
// and its completed v1 source review. No provider or write is involved.
const select = new Function('session', 'plan', 'request', 'parseWorkspacePlan', 'clone', 'wsFail',
  `${code.slice(start, end)}\nreturn {incrementalFrom, request};`);
const run = (session, request = {}) => select(session, plan, request, JSON.parse,
  structuredClone, (code, detail) => {throw Object.assign(new Error(detail), {code});});
const result = run(saved);
assert(result.incrementalFrom, 'Actual automatic Journey omitted scope and repurchased a full 10-shard review after a prose-only repair');
assert.equal(result.request.scope, 'changed_claims');
assert.notEqual(result.incrementalFrom.plan.planHash, plan.planHash);
assert.equal(result.incrementalFrom.review.planHash, result.incrementalFrom.plan.planHash);
assert.equal(run(saved, {scope:'full'}).incrementalFrom, null, 'Explicit full review remains supported');
assert.equal(run({...saved, planVersionHistory:[], planReviewHistory:[]}).incrementalFrom, null,
  'No baseline still means a full first review');
assert.throws(()=>run(saved,{scope:'changed_claims',baselinePlanHash:'missing'}),
  e=>e.code==='ROSTER_WORKSPACE_INCREMENTAL_REVIEW_BASELINE_MISSING');
console.log(JSON.stringify({passed:true,actualPlanVersion:plan.planVersion,
  automaticScope:'changed_claims',explicitFullPreserved:true,providerCalls:0}));
