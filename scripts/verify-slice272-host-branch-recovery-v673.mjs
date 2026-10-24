// The actual source-fixed Host queryId fault exhausted the third tool repair.
// Normal product resume must grant ONE scoped continuation, not strand it or
// reset all previous attempts. Test only that actual product control seam.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),id='decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34';
const source=path.join(root,'build/slice272-product-generation-v645-I7zekC/workspace'),base=path.join(source,'decision-workflows',id);
const original=JSON.parse(await fs.readFile(path.join(base,'workflow.json'),'utf8')),state=structuredClone(original);
const get=async ref=>JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8'));
const draft=await get(state.draftRef),metadata=JSON.parse(await fs.readFile(path.join(source,'decision-product-journeys',id,'journey.json'),'utf8'));
const fault=state.work.find(w=>w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'&&w.repairGeneration===3);
assert(fault);const failure=await get(fault.resultRef);assert.equal(failure.value.request.queryId,fault.id);assert(failure.value.request.base);
const temporary=await fs.mkdtemp(path.join(root,'build/slice272-host-branch-recovery-v673-'));
await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),JSON.stringify(metadata));
const restored=[];let boundary,enter,release,proceed;
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:get,
  initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
  readiness:async()=>({mechanicalReady:true,mechanicalBlockers:[],mechanicalFacts:{},strategyQuestions:[],
    activeWork:state.work.filter(w=>['needs_model_choice','ready'].includes(w.status)).map(w=>({id:w.id,status:w.status}))}),
  resumeToolRepair:async input=>{restored.push(input);state.work.push({id:input.workId+':input-repair',role:'roster_workflow_experiment_planner',status:'ready',
    controlledRecovery:{engineeringChangeId:input.engineeringChangeId}});},
  requestTeach:async()=>{throw Error('NO_NEW_TEACH');},requestDecision:async()=>{throw Error('NO_CONCURRENT_WRITER');},
  requestFinalReviews:async()=>{throw Error('UNRESOLVED_TOOL_CANNOT_PUBLISH');},
  advance:async()=>{enter();await proceed;return {state:structuredClone(state),ran:[]};},
  finalAssessment:async()=>({readyForRelease:false,stoppedReviewDomains:[],activeWork:[],semanticIssues:[]})};
const journey=await createRosterDecisionProductJourneyV1({directory:temporary,openWorkflow:async()=>run,
  prepareSeed:async()=>{throw Error('NO_NEW_GENERATION');},liveAvailable:()=>true});
async function once(){boundary=new Promise(r=>{enter=r;});proceed=new Promise(r=>{release=r;});
  await journey.start(id);await boundary;await journey.pause(id);release();await journey.close();}
await once();assert.equal(restored.length,1,'normal product resume must recover the exact source-fixed exhausted Host fault');
assert.equal(restored[0].workId,fault.id);assert.equal(restored[0].expectedGeneration,3);
assert.equal(restored[0].engineeringChangeId,'private_branch_host_identity_v672');
await once();assert.equal(restored.length,1,'the same engineering change may never replenish that recovery twice');
const saved=JSON.parse(await fs.readFile(path.join(temporary,id,'journey.json'),'utf8'));
assert.equal(saved.hostToolRecoveries.length,1);assert.equal(saved.hostToolRecoveries[0].originalResultRef,fault.resultRef);
assert.equal(saved.hostToolRecoveries[0].historyReset,false);
assert.equal(original.work.find(w=>w.id===fault.id).repairGeneration,3);
console.log(JSON.stringify({status:'passed',workId:fault.id,oneScopedRecoveryScheduled:true,oldGenerationPreserved:true,
  coldResumeDoesNotRepeatRecovery:true,providerCalls:0,nativeCalls:0,productionWrites:0,runControlled:true,
  actualNativeRecoveryStillPending:true,temporary}));
