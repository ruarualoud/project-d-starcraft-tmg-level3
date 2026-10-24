// Regression for the actual v860 capability-return trace: completed inquiry
// came back with the OLD active blocker and no author authorization lineage.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {projectRosterInvestigationContinuationV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
const [checkpointFile,reportFile]=process.argv.slice(2);
const saved=JSON.parse(await fs.readFile(checkpointFile,'utf8')),artifacts=new Map(saved.artifacts);
const work=saved.state.work.find(w=>w.role==='roster_workflow_strategy_decision'&&w.inputs.investigation);
const investigator=saved.state.work.find(w=>'role:'+w.id===work.inputs.investigation.id);
const results=[];
async function check(id,fn){try{await fn();results.push({id,passed:true});}catch(e){results.push({id,passed:false,error:e.message});}}
await check('completed_return_has_exact_author_lineage',async()=>{
  assert.equal(work.strategyContinuationOf,investigator.investigationFor);
  const continuation=await projectRosterInvestigationContinuationV1({state:saved.state,workId:work.id,readArtifact:async ref=>artifacts.get(ref)});
  assert.equal(continuation?.previousWorkId,investigator.investigationFor);
});
await check('old_capability_is_history_not_current_blocker',()=>{
  assert.equal(work.inputs.unavailableCapabilities,undefined);
  assert.equal(work.inputs.investigationFrontier,undefined);
  assert.ok(work.inputs.priorInvestigationContext.value.inputs.unavailableCapabilities);
  assert.ok(work.inputs.investigationReturn.value.acceptedConclusionWorkId);
  assert.equal(work.inputs.investigationReturn.value.originalQuestionsResolvedByHost,false);
});
await fs.writeFile(reportFile,JSON.stringify({source:checkpointFile,workId:work.id,results,
  actualProviderCalls:0,productionWrites:0},null,2)+'\n');
console.log(JSON.stringify(results));if(results.some(r=>!r.passed))process.exitCode=1;
