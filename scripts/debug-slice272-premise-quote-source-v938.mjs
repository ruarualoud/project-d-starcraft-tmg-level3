// Real negative review quoted the author's publicReason, omitted by the first
// quote-source compiler. The numeric rejection must not become a repair loop.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {compileRosterComparisonPremisesV1,assessRosterComparisonPremisesV1} from '../packages/roster-strategist/roster-comparison-premises-v1.mjs';
import {projectSchemaOwnedChildFieldsV1} from '../packages/structured-generation/schema-owned-field-projection-v1.mjs';
const [directory,output]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='b5115d4680c3ed463b0a0563528f39d9fbcae8648bae390257ddf56273672f3c');
const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const contract=await compileRosterComparisonPremisesV1({state,request:work.inputs.closureScope.value,readArtifact:get});
const projected=projectSchemaOwnedChildFieldsV1(reply.output,request.responseFormat.schema);
const report={providerCalls:0,nativeCalls:0,productionWrites:0,checks:[]};
try{
  const actual=assessRosterComparisonPremisesV1({contract,audit:projected.output.premiseAudit,checks:projected.output.checks});
  assert.equal(actual.errors.length,0,JSON.stringify(actual.errors));assert.equal(actual.accepted,false);
  assert(actual.rejectedPremises.some(p=>p.premiseId==='/request/whyNoFurtherEvidenceNeeded:2'));
  report.checks.push('real_author_public_reason_quote_is_valid_but_false_numeric_premise_still_rejected');
  const fabricated=structuredClone(projected.output.premiseAudit);fabricated.tradeoff.foregoneBenefitQuotes.push('NOT IN ANY AUTHOR SOURCE');
  assert(assessRosterComparisonPremisesV1({contract,audit:fabricated,checks:projected.output.checks}).errors.some(e=>e.code==='comparison_tradeoff_quote_not_authored'));
  report.checks.push('invented_quote_remains_a_protocol_error');report.pass=true;
}catch(e){report.pass=false;report.error=e.message;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
