import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createRosterReviewNumericCheckSchemaV1,compileRosterReviewLiteralToolsV1} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import {normalizeRosterReviewEvidenceReferencesV1} from '../packages/roster-strategist/roster-review-premises-v1.mjs';
import {assertStarcraftTmgProviderJsonSchemaSubsetV1,validateStarcraftTmgProviderJsonSchemaValueV1} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const read=async p=>JSON.parse(gunzipSync(await fs.readFile(p)));
const request=await read(process.argv[2]),reply=await read(process.argv[3]);
const schema=createRosterReviewNumericCheckSchemaV1(request.responseFormat.schema.properties.judgments.items.properties.factChecks.items.properties.quantity);
assertStarcraftTmgProviderJsonSchemaSubsetV1(schema);
const normalized=normalizeRosterReviewEvidenceReferencesV1({output:reply.output,facts:{numbers:[],texts:[]}}).output;
for(const j of normalized.judgments)for(const check of j.factChecks){
  assert.equal(validateStarcraftTmgProviderJsonSchemaValueV1(schema,check).ok,true);
  assert.deepEqual(check.literalBinding,{start:-1,end:-1});
  assert.equal(check.comparisonMode,'legacy_auto');
}
const tools=compileRosterReviewLiteralToolsV1({targets:request.promptNodes[0].targets,numericCheckSchema:schema});
const whole=structuredClone(request.responseFormat.schema);
whole.properties.judgments.items.properties.factChecks.items=tools.schema;
assertStarcraftTmgProviderJsonSchemaSubsetV1(whole);
assert.equal(Object.hasOwn(reply.output.judgments[0].factChecks[0],'literalBinding'),false);
console.log(JSON.stringify({pass:true,actualPaidReplyUnchanged:true,strictCanonicalCompatible:true,
  entireNewProviderSchemaAccepted:true,providerCalls:0,originalWrites:0}));
