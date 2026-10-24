// The actual choice author read the exact immutable menu, then bound its whole
// stateRef. The compiler incorrectly accepted only mutable tool work IDs.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {compileRosterWorkflowExperimentV1}
  from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=path.resolve(process.argv[2]);
const text=await fs.readFile(path.join(root,'workflow.json'),'utf8'),state=JSON.parse(text);
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const result=await read('eeb643db3141aad30dd84566bde18e951621db51eb600076d01dec2a0e4cabd0');
const failed=result.value.failedWorkOrders[0],order=failed.order;
assert.equal(failed.error.code,'ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID');
const purposeNumber=order.experimentScope.comparisonBinding.purposeEvidenceNumber;
const purposeEntry=state.evidence[purposeNumber-1];
const purpose=(await read(purposeEntry.artifactRef)).proposals[0].comparisonPurpose;
const sourceNumber=order.steps[0].bindings[0].fromEvidenceNumber;
const sourceEntry=state.evidence[sourceNumber-1],source=await read(sourceEntry.artifactRef);
assert.match(sourceEntry.id,/^choice-source:/);
assert.equal(source.receipt.unknownReason,'CURRENT_ACTION_QUERY_DOMAIN_AMBIGUOUS');
const failures=[];
try{
  const jobs=compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'v737-compile-only',
    evidenceDirectory:state.evidence,comparisonPurpose:{status:'read',evidenceId:purposeEntry.id,
      evidenceNumber:purposeNumber,value:purpose}});
  const request=jobs[0].inputs.request.value,binding=request.bindings[0];
  assert.equal(binding.pointer,'/stateRef');
  assert.deepEqual(jobs[0].inputs[binding.name],{source:'evidence',id:sourceEntry.id,pointer:'/stateRef'});
  assert.deepEqual(source.stateRef,{
    schema:'roster_workflow_state_ref_v1',contextRef:null,
    sourceStateHash:source.receipt.sourceStateHash,stateHash:source.receipt.baseStateHash});
  assert.ok(source.receipt.availableRangedDomains.some(d=>d.domainId===request.args.domainId));
  assert.equal(source.receipt.estimate,null,'menu must stay unanswered, not rewritten into a result');
  const fake=state.evidence.map(e=>e.id===sourceEntry.id?{...e,kind:'proposal'}:e);
  assert.throws(()=>compileRosterWorkflowExperimentV1({order,scope:state.scope,namespace:'v737-invalid-source',
    evidenceDirectory:fake,comparisonPurpose:{status:'read',evidenceId:purposeEntry.id,
      evidenceNumber:purposeNumber,value:purpose}}),e=>e.code==='ROSTER_WORKFLOW_TOOL_EVIDENCE_BINDING_INVALID');
}catch(e){failures.push({case:'immutable-menu-source-binding',error:e.code??e.message});}
assert.equal(await fs.readFile(path.join(root,'workflow.json'),'utf8'),text);
console.log(JSON.stringify({passed:failures.length===0,failures,providerCalls:0,nativeCalls:0,productionWrites:0}));
if(failures.length)process.exitCode=1;
