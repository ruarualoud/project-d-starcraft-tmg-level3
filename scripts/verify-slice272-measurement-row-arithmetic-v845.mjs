// Actual author c5f48e… copied an incorrect reviewer delta despite reading
// the correct weapon rows. Match semantic row identity and calculate in Host;
// neither a reviewer nor this arithmetic projection approves a causal claim.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterWorkflowRoleSourceInputsV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {rosterSourceReviewRepairStageV1} from '../packages/roster-strategist/roster-experiment-source-repair-v1.mjs';
const root=process.argv[2],copy=structuredClone,cache=new Map();
const get=async ref=>{if(!cache.has(ref))cache.set(ref,JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8')));return copy(cache.get(ref));};
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const work=state.work.find(w=>w.id.endsWith('method:d27292cc6165af44:source-recheck:measurement-scenes-v1:claim:3'));
const assignment=await get(work.inputRef),project=(readArtifact=get)=>projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact});
const rows=inputs=>inputs.measurementRowDifferences?.value.comparisons.find(p=>p.referenceMeasurement===1372&&p.targetMeasurement===1383)?.rows;
const out=await project(),actual=rows(out);
assert(actual?.length===4,'actual swapped weapon order needs explicit source-bound arithmetic');
const under=actual.find(r=>r.identity.weaponName==='Underbelly Machine Gun');
const loss=under.metrics.find(m=>m.metric==='expectedCasualties');
assert.equal(loss.reference,1.7777777777777777);assert.equal(loss.target,1.4722222222222223);
assert(Math.abs(loss.referenceMinusTarget-0.3055555555555554)<1e-12);
assert.equal(under.reference.pointer,'/receipt/exchange/attackEstimates/1');
assert.equal(under.target.pointer,'/receipt/exchange/attackEstimates/0');
assert.equal(out.measurementRowDifferences.value.causalBenefitProven,false);
console.log(JSON.stringify({case:'actual Underbelly vs Underbelly, not row-index or reviewer value',pass:true}));
const source=state.evidence[1382],original=await get(source.artifactRef);
for(const fault of ['reordered','missing_weapon','duplicate_identity','missing_metric']){
  const bad=copy(original),estimates=bad.receipt.exchange.attackEstimates;
  const index=estimates.findIndex(r=>r.weaponName==='Underbelly Machine Gun');
  if(fault==='reordered')estimates.reverse();
  if(fault==='missing_weapon')estimates.splice(index,1);
  if(fault==='duplicate_identity')estimates.push(copy(estimates[index]));
  if(fault==='missing_metric')delete estimates[index].outcomes.expectedCasualties;
  const result=rows(await project(async ref=>ref===source.artifactRef?bad:get(ref)));
  const found=result.find(r=>r.identity.weaponName==='Underbelly Machine Gun');
  if(fault==='reordered')assert.equal(found.metrics.find(m=>m.metric==='expectedCasualties').referenceMinusTarget,loss.referenceMinusTarget);
  if(fault==='missing_weapon'||fault==='duplicate_identity')assert(!found,fault);
  if(fault==='missing_metric')assert(!found.metrics.some(m=>m.metric==='expectedCasualties'));
}
const stage=rosterSourceReviewRepairStageV1({sourceReview:{source:'evidence',id:'role:actual-review',value:{checks:[{
  verdict:'requires_revision',dataQuestions:[{question:'same scene?',classification:'necessary_fact',evidenceNumbers:[1372,1383]},
    {question:'Underbelly delta?',classification:'answered_fact',publicReason:'reviewer says 0.1667',evidenceNumbers:[1372,1383]}]}]}}});
assert.equal(stage.phase,'missing_fact_investigation');
assert(stage.instruction.includes('Reviewer arithmetic and answered_fact classifications are fallible'));
assert(stage.instruction.includes('strategy_required'));
assert.equal(stage.answeredQuestions[0].publicReason,'reviewer says 0.1667','original feedback is retained, not rewritten');
assert.deepEqual(await get(source.artifactRef),original);
console.log(JSON.stringify({pass:true,identityFaults:4,reviewFeedbackPreserved:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
