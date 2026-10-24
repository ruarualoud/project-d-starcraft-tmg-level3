// Actual B source-fixed tool was skipped because its valid bindings omit Plan.
// Run the product start/close seam; no Provider, Native action or production write.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRosterDecisionProductJourneyV1} from '../packages/roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {projectRosterWorkflowToolRepairV1} from '../packages/roster-strategist/roster-workflow-laboratory-v1.mjs';
const [root,out]=process.argv.slice(2),clone=structuredClone;
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const draft=await get(state.draftRef),target=state.work.find(w=>w.resultRef==='2a379a667b7cf9547e7048bbb7bddb5f721e21e29285a6d2a7b13d1634bfd874');
assert.ok(target);assert.equal(target.bindings.plan,undefined);
const directory=await fs.mkdtemp(path.join(path.dirname(out),'slice272-recovery-v883-'));
const steps=[];
async function exercise(name,change=()=>{},priorRecoveries=[]){
  const snapshot=clone(state);change(snapshot.work.find(w=>w.id===target.id));
  const before=JSON.stringify(snapshot),id='fixture-'+name,folder=path.join(directory,id),calls=[];
  await fs.mkdir(folder);await fs.writeFile(path.join(folder,'journey.json'),JSON.stringify({
    workflowId:id,status:'blocked',hostToolRecoveries:priorRecoveries,
    seed:{mode:draft.mode,candidateInput:draft.candidateInput,provenance:draft.provenance,
      setup:{factionRecordKey:draft.candidateInput.factionRecordKey}}}));
  let releasePreparation;const preparation=new Promise(resolve=>{releasePreparation=resolve;});
  const run={inspect:async()=>clone(snapshot),currentDraft:async()=>clone(draft),readArtifact:get,
    initializeDraft:async()=>{},prepareStrategyResources:async()=>{},prepareContext:async()=>preparation,
    projectToolRepair:projectRosterWorkflowToolRepairV1,
    resumeToolRepair:async args=>calls.push(clone(args))};
  const journey=await createRosterDecisionProductJourneyV1({directory,openWorkflow:async()=>run,liveAvailable:()=>true});
  await journey.start(id);const closing=journey.close();releasePreparation();await closing;
  const saved=JSON.parse(await fs.readFile(path.join(folder,'journey.json'),'utf8'));
  assert.equal(JSON.stringify(snapshot),before);
  assert.ok(!saved.failure,JSON.stringify(saved.failure));
  steps.push({name,calls,recoveries:saved.hostToolRecoveries??[],status:saved.status});return {calls,saved};
}
let error=null;
try{
  const original=await exercise('actual');
  assert.equal(original.calls.length,1,'same current experiment without Plan binding must receive its source-fixed recovery');
  assert.equal(original.calls[0].workId,target.id);assert.equal(original.calls[0].expectedGeneration,3);
  assert.equal(original.saved.hostToolRecoveries[0].historyReset,false);
  for(const [name,change] of [['wrong-source',w=>w.bindings.source='f'.repeat(64)],
    ['stale-explicit-plan',w=>w.bindings.plan='e'.repeat(64)],
    ['returned',w=>w.branchReturnRef='d'.repeat(64)]])assert.equal((await exercise(name,change)).calls.length,0,name);
  assert.equal((await exercise('already-recovered',()=>{},original.saved.hostToolRecoveries)).calls.length,0);
}catch(e){error=e.message;}
const result={pass:!error,error,steps,actualProviderCalls:0,nativeCalls:0,productionWrites:0,
  originalStateUnchanged:true,formalPlans:0,directory};
await fs.writeFile(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({pass:result.pass,error,cases:steps.map(s=>({name:s.name,recovered:s.calls.length})),directory}));
process.exitCode=error?1:0;
