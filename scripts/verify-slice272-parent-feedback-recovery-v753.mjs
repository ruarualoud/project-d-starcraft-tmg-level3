// Real exhausted parent-address failure: normal product resume may offer one
// corrected-feedback attempt to the original chain, not to its duplicate handoff.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(process.argv[2]),id=path.basename(root);
const get=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8')),draft=await get(state.draftRef);
const fault=state.work.find(w=>w.resultRef==='cbfc03d7e36a95551663d5765b63e7de17509d6385e4094225190b97ca3a455c');
assert.equal(fault.repairGeneration,3);
const workspace=path.dirname(path.dirname(root));
const metadata=JSON.parse(await fs.readFile(path.join(workspace,'decision-product-journeys',id,'journey.json'),'utf8'));
const temporary=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-parent-recovery-v753-'));
await fs.mkdir(path.join(temporary,id));
await fs.writeFile(path.join(temporary,id,'journey.json'),JSON.stringify(metadata));
const restored=[];let enter,release,proceed;
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:get,
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>({mechanicalReady:true,mechanicalBlockers:[],mechanicalFacts:{},strategyQuestions:[],
    activeWork:state.work.filter(w=>['needs_model_choice','ready'].includes(w.status)).map(w=>({id:w.id,status:w.status}))}),
  resumeToolRepair:async input=>{restored.push(input);state.work.push({id:input.workId+':input-repair',
    role:'roster_workflow_experiment_planner',repairOf:input.workId,status:'ready',
    controlledRecovery:{engineeringChangeId:input.engineeringChangeId}});},
  requestTeach:async()=>{throw Error('NO_NEW_TEACH');},requestDecision:async()=>{throw Error('NO_NEW_DECISION');},
  requestFinalReviews:async()=>{throw Error('NO_PUBLISH');},
  advance:async()=>{enter();await proceed;return {state:structuredClone(state),ran:[]};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[],activeWork:[],semanticIssues:[]})};
const journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_GENERATION');},liveAvailable:()=>true});
async function once(){
  const boundary=new Promise(r=>{enter=r;});proceed=new Promise(r=>{release=r;});
  await journey.start(id);await boundary;await journey.pause(id);release();await journey.close();
}
await once();
assert.equal(restored.length,1,'one repaired-interface continuation, not zero or both competing branches');
assert.equal(restored[0].workId,fault.id);
assert.equal(restored[0].engineeringChangeId,'formation_parent_feedback_v752');
await once();assert.equal(restored.length,1,'cold resume does not grant another attempt');
assert.equal(fault.repairGeneration,3);
console.log(JSON.stringify({pass:true,oneOriginalChainRecovery:true,duplicateHandoffNotResumed:true,
  coldResumeIdempotent:true,providerCalls:0,nativeCalls:0,productionWrites:0,temporary}));
