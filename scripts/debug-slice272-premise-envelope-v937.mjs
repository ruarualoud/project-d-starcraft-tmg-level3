// Real completed reviewer output misplaced tradeoff one level above its owner.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowSavedSchemaRevalidationV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {projectSchemaOwnedChildFieldsV1} from '../packages/structured-generation/schema-owned-field-projection-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const [directory,output]=process.argv.slice(2);
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const work=state.work.find(w=>w.operationState?.correction?.originalReplyRef==='b5115d4680c3ed463b0a0563528f39d9fbcae8648bae390257ddf56273672f3c');
assert(work);const call=work.operationState.calls.at(-1),reply=await get(call.replyRef),request=await get(call.requestRef);
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
await check('actual_paid_rejection_has_lossless_schema_revalidation',async()=>{
  const proof=projectRosterWorkflowSavedSchemaRevalidationV1({work,reply,request});
  assert(proof,'Known unique schema owner must allow reuse of the paid rejection, not another model request');
  assert.equal(proof.providerReplayed,false);assert.equal(proof.finalApprovalGranted,false);
});
await check('actual_rejection_moved_without_any_verdict_or_value_change',async()=>{
  const before=JSON.stringify(reply),schema=request.responseFormat.schema;
  const projected=projectSchemaOwnedChildFieldsV1(reply.output,schema);
  assert.equal(validate(schema,projected.output).ok,true);
  assert.deepEqual(projected.output.premiseAudit.tradeoff,reply.output.tradeoff);
  assert.deepEqual(projected.output.premiseAudit.rows,reply.output.premiseAudit.rows);
  assert.deepEqual(projected.output.checks,reply.output.checks);
  assert.equal(projected.projection.length,1);assert.equal(projected.projection[0].semanticApprovalGranted,false);
  assert.equal(JSON.stringify(reply),before);
});
await check('conflicting_ambiguous_and_missing_parent_are_not_repaired',async()=>{
  const schema=request.responseFormat.schema;
  const occupied=structuredClone(reply.output);occupied.premiseAudit.tradeoff={conflict:true};
  assert.equal(projectSchemaOwnedChildFieldsV1(occupied,schema).projection.length,0);
  const missing=structuredClone(reply.output);delete missing.premiseAudit;
  assert.equal(projectSchemaOwnedChildFieldsV1(missing,schema).projection.length,0);
  const ambiguous=structuredClone(schema);ambiguous.properties.another=structuredClone(schema.properties.premiseAudit);
  assert.equal(projectSchemaOwnedChildFieldsV1(reply.output,ambiguous).projection.length,0);
});
const report={pass:checks.every(c=>c.pass),checks,providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
