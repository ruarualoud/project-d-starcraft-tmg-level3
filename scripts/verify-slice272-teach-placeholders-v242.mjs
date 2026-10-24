// Actual v240 A corrective replies include mandatory neutral union fields.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeRosterTeachQueryDispatchV1 as normalize} from '../packages/roster-strategist/roster-teach-query-dispatch-v1.mjs';
const base=process.argv[2],dir=base+'/A/fresh-generation-v240/workspace/drafts';
const draft=JSON.parse(await fs.readFile(dir+'/'+(await fs.readdir(dir))[0],'utf8'));
const replies=draft.publicOutputs.filter(o=>o.roundKind==='teach_challenge');
const requests=replies[3].sanitizedOutput.challenges.map(c=>c.evidenceRequest);
for(const request of requests){
  const original=structuredClone(request);const result=normalize(request);
  assert.deepEqual(request,original);
  assert.deepEqual(result.request.toolRequest.argumentsJson,request.toolRequest.argumentsJson);
  assert.equal(result.request.toolRequest.branchIdRef,request.toolRequest.branchIdRef);
  for(const key of ['sampleBudget','inputs','spec'])assert.equal(Object.hasOwn(result.request.toolRequest,key),false,`inactive ${key} must not reach native query`);
  assert.deepEqual(result.normalization.omittedWirePlaceholderFields,['sampleBudget','inputs','spec']);
  for(const [key,value] of [['sampleBudget',36],['inputs',{values:[0]}],['spec',{kind:'hypothetical_geometry',placements:[]}],['unexpectedZero',0]]){
    const changed=structuredClone(request);changed.toolRequest[key]=value;
    assert.deepEqual(normalize(changed).request.toolRequest[key],value,'non-placeholder fields must remain visible to native rejection');
  }
}
console.log(JSON.stringify({status:'pass',actualCorrectiveRequests:requests.length,providerCalls:0,argumentsUnchanged:true,nonemptyFieldsNotDiscarded:true}));
