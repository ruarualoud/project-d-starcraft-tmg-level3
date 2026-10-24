// r14 cycle projection still selected an old fact owner after newer retirement;
// Plan changes also removed completed reviews from the three-round stop count.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {assessRosterProductHypothesisCycleV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const [directory,output]=process.argv.slice(2),copy=structuredClone;
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8'));
const readArtifact=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const draft=await readArtifact(state.draftRef),checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}
await check('cycle_does_not_present_historical_owner_as_current',async()=>{
  const cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact});
  assert.equal(cycle.comparisonExperimentOwnerWorkId,null);
  assert.equal(cycle.comparisonExperimentStatus,'awaiting_control_return');
});
await check('completed_reviews_survive_plan_retirement_in_three_round_limit',async()=>{
  const s=copy(state),review=s.work.findLast(w=>w.comparisonClosureCycleId&&w.status==='evidence_ready');
  assert(review);
  const older=s.work.find(w=>w.comparisonClosureCycleId===review.comparisonClosureCycleId&&w.status==='superseded'&&w.resultRef);
  assert(older,'Actual previous completed review was retired by a Plan change');
  s.work.push({...copy(older),id:older.id+':injected-third-completed-review'});
  const cycle=await assessRosterProductHypothesisCycleV1({state:s,draft,readArtifact});
  assert.equal(cycle.comparisonStopped,true,'Do not silently reset review rounds when Plan changes');
  assert.equal(cycle.comparisonResolved,false);
});
const report={pass:checks.every(c=>c.pass),checks,providerCalls:0,nativeCalls:0,productionWrites:0};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
