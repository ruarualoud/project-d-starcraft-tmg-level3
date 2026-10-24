// Actual v850 request: additional Native conditions accompany unchanged source
// numbers. The progress fence must compare delivered content, not aliases.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterSourceReviewRepairStageV1,rosterSourceRepairInformationErrorV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),before=hash(state);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const request=await get('ff6ee6930a30060784eba6f3b7a1e499c4f16ddf24c18342419b96b813d4daaf');
const inputs=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
const output=(await get('72bec25531c9db42dfacb411493575de9368e73fd128107970d8ddb3ce13b3da')).output;
const stage=rosterSourceReviewRepairStageV1(inputs);
const directory=state.evidence.map((e,i)=>({...e,number:i+1}));
const store={get,load:async()=>state};
const run=(input=inputs,overrides={})=>rosterSourceRepairInformationErrorV1({stage,output,inputs:input,directory,store,...overrides});
assert.equal(await run(),null,'new complete Native conditions are material progress despite unchanged measurement numbers');

const pairs=inputs.measurementConditions.value.comparisons;
for(const fault of ['missing','unavailable','incomplete','wrong_state','uncited']){
  const i=copy(inputs),o=copy(output);
  if(fault==='missing')delete i.measurementConditions;
  else if(fault==='uncited')o.conclusion.evidenceNumbers=[1410];
  else for(const p of i.measurementConditions.value.comparisons){
    if(fault==='unavailable')p.status='unavailable';
    if(fault==='incomplete')p.receipt.comparison.complete=false;
    if(fault==='wrong_state')p.targetStateRef.stateHash='f'.repeat(64);
  }
  assert.equal((await run(i,{output:o}))?.code,'necessary_fact_has_no_new_material_evidence',fault);
}

// Simulate the SAME current reviewer already having received these facts.
// Changing query IDs, receipt metadata or context handles is not new evidence.
const originIds=new Set(stage.necessaryQuestions.flatMap(q=>q.origins.map(o=>o.reviewEvidenceId)));
const reviewCalls=state.work.filter(w=>originIds.has('role:'+w.id)).flatMap(w=>w.operationState.calls);
assert.ok(reviewCalls.length);
const baselineRefs=new Set(reviewCalls.map(c=>c.requestRef));
const withDelivered=async ref=>{
  const v=await get(ref);if(!baselineRefs.has(ref))return v;
  v.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.measurementConditions=copy(inputs.measurementConditions);
  return v;
};
const deliveredStore={...store,get:withDelivered};
assert.equal((await run(inputs,{store:deliveredStore}))?.code,'necessary_fact_has_no_new_material_evidence','same observed conditions');
const alias=copy(inputs);
for(const p of alias.measurementConditions.value.comparisons){
  p.receipt.queryId='metadata-alias-only';const {receiptHash,...body}=p.receipt;p.receipt.receiptHash=hash(body);
}
assert.equal((await run(alias,{store:deliveredStore}))?.code,'necessary_fact_has_no_new_material_evidence','receipt alias');
assert.equal((await run(inputs,{store:{...store,load:async()=>({...state,work:[]})}}))?.code,
  'necessary_fact_has_no_new_material_evidence','no verifiable review baseline');
assert.equal(hash(state),before);
assert.deepEqual(output,(await get('72bec25531c9db42dfacb411493575de9368e73fd128107970d8ddb3ce13b3da')).output);
console.log(JSON.stringify({passed:true,actualReplyUnchanged:true,additionalNativeMaterialRecognized:true,
  negativeCases:8,semanticApproval:false,providerCalls:0,nativeQueries:0,productionWrites:0}));
