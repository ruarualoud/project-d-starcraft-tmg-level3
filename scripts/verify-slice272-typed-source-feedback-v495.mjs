import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as transport from '../packages/roster-strategist/roster-review-catalogue-transport-v1.mjs';
const request = JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const catalogue = request.promptNodes.find(n => n.kind === 'shared-rules-fact-catalogue');
const feedback = request.promptNodes.find(n => n.kind === 'failed-item-feedback');
const texts = [], numbers = [];
function walk(node, parts = []) {
  for (const [alias, text, extra] of node.$facts?.texts || []) texts.push({
    serial: Number(alias.slice(1)), sourcePath: parts.join('.'), text,
    evidenceId: `test-source:${parts.join('.')}`, ...extra });
  for (const [alias, value, extra] of node.$facts?.numbers || []) numbers.push({
    factId: parts.join('.'), value, ...extra });
  for (const [key, value] of Object.entries(node)) if (key !== '$facts')
    walk(value, [...parts, key.replaceAll('$$', '$')]);
}
walk(catalogue.sourceTree);
texts.sort((a, b) => a.serial - b.serial);
const compiled = transport.compileRosterReviewCatalogueV1({
  texts: texts.map(({serial, ...row}) => row), numbers });
const originalIssues = feedback.items.flatMap(item => item.bindingIssues);
const original = structuredClone(originalIssues);
const project = transport.projectRosterReviewBindingIssuesV1 || (({issues}) => issues);
const output = project({issues: originalIssues, transport: compiled});
for (const [i, issue] of output.entries()) {
  const repair = issue.referenceRecovery;
  assert.ok(repair, `Actual365 ${issue.factId} repeats failure with no exact text source or legal repair route`);
  const alias = issue.factId.replace(/^n/u, 'e');
  const row = compiled.entries.find(e => e.alias === alias);
  assert.equal(repair.availableTextSource.evidenceId, alias);
  assert.equal(repair.availableTextSource.sourcePath, row.original.sourcePath);
  assert.equal(repair.availableTextSource.text, row.original.text);
  assert.equal(repair.numericAuthority, false);
  assert.equal(repair.semanticJudgmentChanged, false);
  assert.equal(repair.status, 'not_applied');
  const {referenceRecovery, ...unchanged} = issue;
  assert.deepEqual(unchanged, original[i]);
}
assert.deepEqual(originalIssues, original, 'do not mutate saved failures');
assert.equal(output.find(i => i.factId === 'n19903').referenceRecovery.availableTextSource.text, '25');
assert.ok(output.find(i => i.factId === 'n19741').referenceRecovery.availableTextSource.text.includes('Advanced Training'));
const absent = [{code:'FACT_PREMISE_NOT_BOUND', factId:'n999999999'}];
assert.deepEqual(project({issues:absent, transport:compiled}), absent, 'no guessed source');
const legacy = transport.compileRosterReviewCatalogueV1({texts: [{evidenceId:'x',sourcePath:'rule',text:'25'}], numbers:[]},
  {version:transport.ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1});
const legacyIssue = [{code:'FACT_PREMISE_NOT_BOUND',factId:'n0'}];
assert.deepEqual(project({issues:legacyIssue,transport:legacy}), legacyIssue, 'v1 ordinals do not share identity');
const other = [{code:'SCORING_QUANTITY_REQUIRED',factId:'n19903'}];
assert.deepEqual(project({issues:other,transport:compiled}), other, 'do not bypass scoring semantics');
console.log(JSON.stringify({pass:true,actual365:true,failedReferences:output.length,
  exactSourcesPreserved:true,noAuthorityPromotion:true,noSemanticRewrite:true,providerCalls:0}));
