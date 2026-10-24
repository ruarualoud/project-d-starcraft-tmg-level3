// Concrete liveness regression: closed optional study + later Plan edit must
// ask its current author, not wait forever on the already retired study.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
const [directory,output]=process.argv.slice(2);
const original=await fs.readFile(directory+'/workflow.json','utf8'),state=JSON.parse(original);
const readArtifact=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const purpose=state.work.findLast(w=>w.strategyComparisonDesignCycleId&&w.resultRef);
const goal=state.work.find(w=>w.id===purpose.id+':study');
goal.comparisonClosure={reportRef:'injected-prior-closure',reviewResultRef:'prior-review'};goal.status='superseded';
state.scope.plan='injected-later-plan';state.draftRevision+=1;
state.work=state.work.map(w=>({...w,status:w.status==='running'?'needs_repair':w.status,operationState:w.operationState?{...w.operationState,pending:null}:null}));
const cycle={id:purpose.strategyComparisonDesignCycleId,comparisonPurposeWorkId:purpose.id,comparisonPurposeResultRef:purpose.resultRef,
  comparisonPurposeReady:true,comparisonPreflightAccepted:true,comparisonResolved:false,comparisonExperimentAccepted:false,
  comparisonExperimentId:goal.id,comparisonDesignRevision:purpose.designRevision};
const scheduled=[],report={schema:'slice272_closure_plan_change_v928',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const run={readArtifact,requestDecision:async args=>{scheduled.push(args);}};
  const result=await progressRosterProductComparisonV1({run,state,draft:{revision:state.draftRevision},cycle,allowDecision:true});
  assert.equal(scheduled.length,1,'Closed study with changed Plan has no reassessment owner');
  assert.equal(scheduled[0].inputs.previousComparisonClosure.value.reportRef,goal.comparisonClosure.reportRef);
  assert.equal(result.scheduled[0],scheduled[0].id);
  state.work.push({id:scheduled[0].id,role:'roster_workflow_strategy_decision',bindings:state.scope,status:'ready',inputs:scheduled[0].inputs});
  assert.equal((await progressRosterProductComparisonV1({run,state,draft:{revision:state.draftRevision},cycle,allowDecision:true})).scheduled.length,0);
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),original);
  report.pass=true;report.checked=['Plan change reconsiders prior closure once','No automatic experiment resurrection or source approval','Original B unchanged'];
}catch(e){report.pass=false;report.error=e.message;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
