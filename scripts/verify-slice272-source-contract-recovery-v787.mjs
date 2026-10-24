// Actual e5252 stopped after the model consumed an obsolete repair contract.
// Product resume must offer one source-version upgrade, never reset attempts.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {createRosterWorkflowLaboratoryExecutorV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const root=process.argv[2],id=path.basename(root);
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8')),draft=await get(state.draftRef);
const fault=state.work.find(w=>w.resultRef==='8a5c0df5ba622a36437ad762b126ec038aae135c1c779b1f1beaaa6c98609d2a');
assert.equal(fault.repairGeneration,3);
const temporary=await fs.mkdtemp(path.join(process.cwd(),'build/slice272-contract-recovery-v787-'));
const metadata=JSON.parse(await fs.readFile(path.join(path.dirname(path.dirname(root)),'decision-product-journeys',id,'journey.json'),'utf8'));
await fs.mkdir(path.join(temporary,id));await fs.writeFile(path.join(temporary,id,'journey.json'),JSON.stringify(metadata));
const tool=createRosterWorkflowLaboratoryExecutorV1({laboratory:{labDescriptor:()=>({sourceStateHash:state.scope.source})},store:{load:async()=>state}});
const restored=[];let enter,release,proceed;
const run={inspect:async()=>structuredClone(state),currentDraft:async()=>structuredClone(draft),readArtifact:get,
  projectToolRepair:value=>tool.projectRepair(value),initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>{},
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
async function once(){const boundary=new Promise(r=>{enter=r;});proceed=new Promise(r=>{release=r;});
  await journey.start(id);await boundary;await journey.pause(id);release();await journey.close();}
await once();assert.equal(restored.length,1,'one source-upgrade correction for actual stale paid contract');
assert.equal(restored[0].workId,fault.id);
assert.equal(restored[0].engineeringChangeId,'source_repair_contract:pregame_static_formation_selection_v1:v2');
await once();assert.equal(restored.length,1,'restart does not grant another correction');
assert.equal(fault.repairGeneration,3);
console.log(JSON.stringify({pass:true,oneSourceUpgrade:true,coldResumeIdempotent:true,historyReset:false,
  providerCalls:0,nativeCalls:0,productionWrites:0,temporary}));
