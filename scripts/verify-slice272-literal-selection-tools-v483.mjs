import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import * as review from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {rosterReviewPremiseIssuesV1} from '../packages/roster-strategist/roster-review-premises-v1.mjs';
const request=JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const targets=request.promptNodes[0].targets;
const oldSchema=request.responseFormat.schema.properties.judgments.items.properties.factChecks.items;
const compiled=review.compileRosterReviewLiteralToolsV1?.({targets,numericCheckSchema:oldSchema});
const schema=compiled?.schema || oldSchema;
assert.ok(!schema.properties.claimedValue,'Actual339 lets the model type the corrected source number instead of selecting the original claim');
assert.ok(schema.properties.claimLiteralId);
const literal=compiled.node.targets.find(t=>t.findingIndex===2).literals.find(l=>l.text==='0');
assert.ok(literal);
const proposed={judgments:[{findingIndex:2,factChecks:[{claimLiteralId:literal.claimLiteralId,
  factId:'n316',calculation:{operation:'identity',factIds:[]},comparisonMode:'exact',
  quantity:{kind:'source_value',scoringActorId:'',markerNumbers:[],opposingActorId:'',opposingMarkerNumbers:[]}}]}]};
const decoded=compiled.decodeOutput(proposed);
assert.equal(decoded.judgments[0].factChecks[0].claimedValue,'0');
assert.equal(decoded.judgments[0].factChecks[0].claimValueQuote,targets.find(t=>t.findingIndex===2).claimQuote);
assert.equal(decoded.judgments[0].factChecks[0].factId,'n316');
assert.equal(proposed.judgments[0].factChecks[0].claimedValue,undefined,'Original model selection is immutable');
const wrong=structuredClone(proposed);wrong.judgments[0].findingIndex=0;
assert.equal(compiled.decodeOutput(wrong).judgments[0].factChecks[0].claimedValue,'NaN','Cross-claim literal cannot bind');
const bound={...decoded.judgments[0],claimAssessment:'source_contradicted',evidenceScope:'settled_fact',sourceEvidence:[]};
assert.deepEqual(rosterReviewPremiseIssuesV1({output:{judgments:[bound]},targets,
  facts:{numbers:[{factId:'n316',value:1}],texts:[],geometryReceipts:[]}}),[]);
const approx=compiled.node.targets.find(t=>t.findingIndex===0).literals.find(l=>l.text==='12.2');
const approxWire={judgments:[{findingIndex:0,claimAssessment:'source_attribution_unsubstantiated',
  evidenceScope:'source_attribution',sourceEvidence:[{sourcePath:'receipt.scope',sourceQuote:'separate attacks'}],
  factChecks:[{...proposed.judgments[0].factChecks[0],claimLiteralId:approx.claimLiteralId,factId:'',
    comparisonMode:'rounded_to_printed_precision',calculation:{operation:'sum',factIds:['a','b','c']}}]}]};
const approxFacts={numbers:[{factId:'a',value:5.027777777777778},{factId:'b',value:3.9444444444444446},
  {factId:'c',value:3.2222222222222223}],texts:[{sourcePath:'receipt.scope',text:'separate attacks'}],geometryReceipts:[]};
assert.deepEqual(rosterReviewPremiseIssuesV1({output:compiled.decodeOutput(approxWire),targets,facts:approxFacts}),[],
  'Roughly12.2 is correct rounding, not a numeric contradiction or proof of a joint outcome');
console.log(JSON.stringify({pass:true,modelSelectsLiteral:true,hostBindsOriginalValue:true,
  sourceFactRemainsModelChoice:true,invalidLiteralDoesNotBind:true,providerCalls:0,originalWrites:0}));
