// Actual v849 request exposes two matched measurements but makes the caller
// rediscover their Native conditions. Exercise the shared role input seam.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const root=process.argv[2],fixture=process.argv[3],copy=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),unchanged=hash(state);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const old=await get('e2be814d490a9095c1657c68c1bd02140ce8718983f2ce2eec25d85defe480ed');
assert.equal(old.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs.measurementConditions,undefined);
const work=state.work.find(w=>w.resultRef==='92d7da61b3bb0503543e1971dae799097c85a3533d86ae15fd0dac45d754d1d3');
assert.ok(work);const assignment=await get(work.inputRef);
const observed=JSON.parse(await fs.readFile(fixture+'/workflow.json','utf8'));
const ref=observed.work.find(w=>w.id==='conditions-v849:comparison').resultRef;
const native=(JSON.parse(await fs.readFile(fixture+'/artifacts/'+ref+'.json','utf8'))).value.receipt;
let calls=[];
const compareSceneConditions=async pair=>{
  calls.push(pair);
  const c=native.comparison;
  if(pair.referenceStateRef.sourceStateHash!==c.left.sourceStateHash||pair.referenceStateRef.stateHash!==c.left.baseStateHash
    ||pair.targetStateRef.sourceStateHash!==c.right.sourceStateHash||pair.targetStateRef.stateHash!==c.right.baseStateHash)
    throw Object.assign(Error('fixture_has_no_other_native_states'),{code:'fixture_has_no_other_native_states'});
  return copy(native);
};
const project=(a=assignment,reader=compareSceneConditions)=>projectRosterWorkflowRoleSourceInputsV1({
  assignment:a,state,readArtifact:get,compareSceneConditions:reader});
const result=await project();
const paired=inputs=>inputs.measurementConditions?.value.comparisons.find(c=>c.referenceMeasurement===1429&&c.targetMeasurement===1410);
const actual=paired(result);
assert.equal(actual?.status,'observed','matched measurement must deliver Native conditions to its actual consuming role');
assert.deepEqual(actual.receipt,native,'raw Native facts must not be replaced by a model summary');
assert.equal(actual.receipt.comparison.causalAttribution,'not_assessed');
assert.equal(actual.receipt.comparison.complete,true);
assert(!result.measurementConditions.value.comparisons.some(c=>c.referenceMeasurement===c.targetMeasurement));
assert.equal(new Set(calls.map(c=>JSON.stringify(c))).size,calls.length,'duplicate projection links must not repeat reads');
for(const role of ['roster_workflow_strategy_decision','roster_workflow_fact_summary','roster_workflow_local_teach','roster_workflow_final_review']){
  const input={...assignment,role};
  assert.deepEqual(paired(await project(input)).receipt,native,role);
}
for(const fault of ['wrong_reference_state','wrong_target_source','incomplete','native_unknown','unavailable']){
  const read=async pair=>{
    const v=await compareSceneConditions(pair);
    if(fault==='wrong_reference_state')v.comparison.left.baseStateHash='f'.repeat(64);
    if(fault==='wrong_target_source')v.comparison.right.sourceStateHash='f'.repeat(64);
    if(fault==='incomplete')v.comparison.complete=false;
    if(fault==='native_unknown')v.resultStatus='unknown';
    if(fault==='unavailable')throw Object.assign(Error('PREGAME_LAB_BRANCH_UNKNOWN'),{code:'PREGAME_LAB_BRANCH_UNKNOWN'});
    return v;
  };
  const out=paired(await project(assignment,read));
  assert.equal(out.status,'unavailable',fault);assert.equal(out.receipt,undefined,fault);
  assert.equal(out.factProven,false);assert.ok(out.reasonCode);
}

// Actual executor Interface: pure observations are cached across role consumers,
// but invalid identities and unavailable states are not cached as success.
let captures=0,reads=0;
const source='a'.repeat(64),stateA='b'.repeat(64),stateB='c'.repeat(64);
const makeRef=stateHash=>({schema:'roster_workflow_state_ref_v1',contextRef:null,sourceStateHash:source,stateHash});
const lab={labDescriptor:()=>({sourceStateHash:source}),captureComparisonSnapshot:({base})=>{
  captures++;return {observedBase:base};},compareSceneConditions:({base,referenceSnapshot})=>{
  reads++;return {resultStatus:'ok',sourceStateHash:source,baseStateHash:base.branchStateHash,referenceSnapshot,comparison:{complete:true}};}};
const executor=createRosterWorkflowLaboratoryExecutorV1({laboratory:lab,store:{}});
const pair={referenceStateRef:makeRef(stateA),targetStateRef:makeRef(stateB)};
const [one,two]=await Promise.all([executor.compareSavedSceneConditions(pair),executor.compareSavedSceneConditions(pair)]);
assert.deepEqual(one,two);assert.equal(captures,1);assert.equal(reads,1);
one.resultStatus='changed-in-test';assert.equal((await executor.compareSavedSceneConditions(pair)).resultStatus,'ok');
await assert.rejects(()=>executor.compareSavedSceneConditions({...pair,targetStateRef:{...pair.targetStateRef,sourceStateHash:'f'.repeat(64)}}));
assert.equal(captures,1);assert.equal(reads,1);
assert.equal(hash(state),unchanged);
console.log(JSON.stringify({passed:true,actualInputGapReproduced:true,sharedConsumerRoles:5,
  nativeDifferenceCount:native.comparison.differences.length,abnormalCases:5,
  repeatedReadsCoalesced:true,immutableCache:true,providerCalls:0,nativeAttacks:0,productionWrites:0,
  strategyApproval:false}));
