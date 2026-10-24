import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {compileRosterReviewCatalogueV1} from '../packages/roster-strategist/roster-review-catalogue-transport-v1.mjs';
import {rosterReviewPremiseIssuesV1} from '../packages/roster-strategist/roster-review-premises-v1.mjs';
const read=async file=>JSON.parse(gunzipSync(await fs.readFile(file)));
const request=await read(process.argv[2]), reply=await read(process.argv[3]);
const catalogue=request.promptNodes.find(n=>n.kind==='shared-rules-fact-catalogue');
const packed=compileRosterReviewCatalogueV1(catalogue);
const texts=new Map(packed.entries.filter(r=>r.kind==='text').map(r=>[r.original.sourcePath,r]));
for(const row of packed.entries.filter(r=>r.kind==='number')) {
  assert.equal(row.alias.slice(1),texts.get(row.original.factId).alias.slice(1),
    '338 conflated n/e serials: the same source must use one serial in both typed handles');
}
assert.deepEqual(packed.restore(),catalogue);
const legacy=compileRosterReviewCatalogueV1(catalogue,{version:'hierarchical_catalogue_v1'});
assert.equal(legacy.decodeOutput({judgments:[{factChecks:[{factId:'n808'}]}]}).judgments[0].factChecks[0].factId,
  catalogue.numbers[808].factId,'Original paid numeric handles must never be rebound under a new version');
const target=request.promptNodes[0].targets.find(t=>t.findingIndex===2);
const judgment=structuredClone(reply.output.judgments.find(j=>j.findingIndex===2));
const pool=catalogue.numbers[85];
assert.equal(pool.value,0);
// Minimise338 to its true pool-value premise and actual scope judgment.
// No production reply is modified. Pool=0 does not imply markerSupply=0.
judgment.factChecks=[{...judgment.factChecks[0],factId:pool.factId}];
judgment.sourceEvidence=[{sourcePath:pool.factId,sourceQuote:'0'}];
const issues=rosterReviewPremiseIssuesV1({output:{judgments:[judgment]},targets:[target],
  facts:{numbers:catalogue.numbers,texts:catalogue.texts,geometryReceipts:catalogue.geometryReceipts}});
assert.deepEqual(issues,[],'A true constituent must not force an unsupported compound assertion to source_supported');
judgment.claimAssessment='source_supported';
judgment.factChecks[0].claimedValue='1';judgment.factChecks[0].claimValueQuote='Supply-1 healers';
const wrongTarget={...target,claimQuote:target.claimQuote.replace('Supply-0','Supply-1')};
const bad=rosterReviewPremiseIssuesV1({output:{judgments:[judgment]},targets:[wrongTarget],
  facts:{numbers:catalogue.numbers,texts:catalogue.texts,geometryReceipts:catalogue.geometryReceipts}});
assert.ok(bad.some(i=>i.code==='FACT_ASSESSMENT_CONFLICT'),'An actual false bound number must still block');
console.log(JSON.stringify({pass:true,typedHandlesShareOneSource:true,allFactsRoundTrip:true,
  legacyPaidBindingsPreserved:true,compoundClaimNotInferredFromTruePart:true,providerCalls:0,originalWrites:0}));
