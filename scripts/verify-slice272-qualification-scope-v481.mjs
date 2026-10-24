import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as review from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const read=async file=>JSON.parse(gunzipSync(await fs.readFile(file)));
const request=await read(process.argv[2]);
const successfulSourceReview=await read(process.argv[3]);
const sourceAudit=successfulSourceReview.promptNodes.find(n=>n.kind==='source-fact-scope-audit');
const targets=request.promptNodes.find(n=>n.kind==='literal-claims-to-qualify').targets;
const focus=review.projectRosterQualificationFocusV1?.({
  sourceFacts:{supplyValueContexts:sourceAudit.rulesForSupplyContexts},targets});
const nodes=focus ? [...request.promptNodes,...focus] : request.promptNodes;
const audit=nodes.find(n=>n.kind==='source-fact-scope-audit');
assert.ok(audit,'Actual337 independent qualification omitted the source-audit scope protocol');
assert.deepEqual(audit,sourceAudit,'Primary audit and qualification must use the identical method and scope facts');
assert.equal(nodes.at(-1).kind,'literal-qualification-focus');
assert.deepEqual(nodes.at(-1).targets,targets.map(({findingIndex,claimPath,claimQuote,category})=>({findingIndex,claimPath,claimQuote,category})));
assert.ok(nodes.at(-1).targets.find(t=>t.findingIndex===2).claimQuote.includes('should never be counted as marker supply'));
assert.ok(audit.method.includes('marginal attack estimates'));
assert.ok(!nodes.at(-1).targets.some(t=>Object.hasOwn(t,'claimAssessment')),'Host must not supply a verdict');
console.log(JSON.stringify({pass:true,sourceMethodShared:true,literalTargetsPreserved:targets.length,
  hostSemanticJudgments:0,providerCalls:0,originalWrites:0}));
