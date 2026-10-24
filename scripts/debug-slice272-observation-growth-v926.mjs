import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterGenerationObserverV1} from './lib/roster-generation-observation-v1.mjs';
const [directory,output]=process.argv.slice(2);
const report={schema:'slice272_observation_growth_v926',providerCalls:0,nativeCalls:0,productionWrites:0};
try{
  const bytes=await fs.readFile(directory+'/workflow.json','utf8'),state=JSON.parse(bytes);
  const original={workflowId:state.workflowId??'actual-A',status:'running',running:true,draftRevision:state.draftRevision,
    draft:{candidateInput:{units:[]},plan:{}},readyForRelease:false,evidenceCount:state.evidence.length,failure:null,
    work:state.work.map(w=>({id:w.id,role:w.role,status:w.status,failure:w.failure}))};
  const observer=createRosterGenerationObserverV1(),first=observer(original);
  assert.equal(observer(original),null,'Unchanged polling must not write');
  const next=structuredClone(original),target=next.work.find(w=>w.status==='running');
  assert.ok(target);target.status='needs_repair';target.failure={code:'INJECTED_DIAGNOSTIC',dispatchOutcome:'not_dispatched'};
  const row=observer(next),oldFullBytes=Buffer.byteLength(JSON.stringify({...next,work:next.work})),newBytes=Buffer.byteLength(JSON.stringify(row));
  report.size={actualWorkCount:state.work.length,oldFullBytes,newBytes};
  assert.ok(newBytes<oldFullBytes/5,'One work transition must not repeat the full historical work catalogue');
  assert.equal(row.workLogMode,'changed_only');assert.equal(row.changedWork.length,1);
  assert.equal(row.changedWork[0].id,target.id);assert.equal(row.changedWork[0].status,'needs_repair');
  assert.deepEqual(row.changedWork[0].failure,target.failure);assert.equal(row.changedWork[0].previousStatus,'running');
  assert.equal(row.workCount,state.work.length);assert.ok(!Object.hasOwn(row,'work'));
  assert.equal(first.workLogMode,'initial_active');assert.equal(first.workCount,state.work.length);
  assert.ok(first.changedWork.every(w=>!['evidence_ready','superseded','returned_to_owner'].includes(w.status)));
  const statusOnly=structuredClone(next);statusOnly.failure={code:'ENOSPC'};statusOnly.status='blocked';statusOnly.running=false;
  const terminal=observer(statusOnly);assert.deepEqual(terminal.failure,{code:'ENOSPC'});assert.equal(terminal.changedWork.length,0);
  assert.equal(observer(statusOnly),null);
  const added=structuredClone(statusOnly);added.work.push({id:'injected-new',role:'roster_workflow_tool',status:'ready',failure:null});
  assert.equal(observer(added).changedWork[0].id,'injected-new');
  const removed=structuredClone(added);removed.work.pop();assert.deepEqual(observer(removed).removedWorkIds,['injected-new']);
  assert.equal(await fs.readFile(directory+'/workflow.json','utf8'),bytes);
  report.pass=true;report.checked=['real historical catalogue plus one transition','unchanged poll silence',
    'complete changed failure/status','terminal state without work change','new/removal visibility','original source untouched'];
}catch(e){report.pass=false;report.error=e.message;process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
