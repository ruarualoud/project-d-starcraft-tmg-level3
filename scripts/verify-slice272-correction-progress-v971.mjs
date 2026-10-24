// Actual r22 paid replies repeated the same stale Native claim. Exercise the
// product role executor, with immutable disk inputs and in-memory checkpoints.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {verifyRosterNativeFactsV1} from '../packages/roster-strategist/roster-native-fact-claims-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1,projectRosterWorkflowFeedbackRecoveryV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [directory,only]=process.argv.slice(2),copy=structuredClone,memory=new Map(),cache=new Map();
const disk=async ref=>JSON.parse(await fs.readFile(directory+'/artifacts/'+ref+'.json','utf8'));
const get=async ref=>{if(memory.has(ref))return copy(memory.get(ref));if(!cache.has(ref))cache.set(ref,await disk(ref));return copy(cache.get(ref));};
const put=async value=>{const ref=hash(value);memory.set(ref,copy(value));return ref;};
const state=JSON.parse(await fs.readFile(directory+'/workflow.json','utf8')),before=hash(state);
const work=state.work.find(w=>w.id==='product:after-teach:r22:subject-v1:investigation');
const first=await get('7f6bbc93ea550d7390af527405d0214281d06c6509f8a8c34d97abeb476a64f1');
const second=await get('6d202314e8195ec573edf1fd17677cc2547f0dce9854db059cd7710f3134dcce');
assert.deepEqual(second.output,first.output,'Actual duplicate, not a synthetic failure');
const request=await get('997037e616958bdbaf2a6224e657d449d28a8db3fdf8c4c5faa9cd343f3c907c');
const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
const evidence=state.evidence.map((e,i)=>({...copy(e),number:i+1,validity:Object.entries(e.bindings??{}).every(([k,v])=>state.scope[k]===v)?'current':'stale'}));
const verify=(conclusion,entries=evidence)=>verifyRosterNativeFactsV1({conclusion,currentScope:state.scope,
  lookup:n=>entries[n-1],lookupById:id=>entries.find(e=>e.id===id),readArtifact:get,isRead:()=>true});
const checks=[];
async function check(name,fn){if(only&&only!==name)return;try{await fn();checks.push({name,pass:true});}
  catch(e){checks.push({name,pass:false,message:e.message});}console.log(JSON.stringify(checks.at(-1)));}
await check('actual-stale-source-diagnostic',async()=>{
  const result=await verify(first.output.conclusion);
  assert.deepEqual(result.errors.map(e=>e.code),['native_fact_source_not_current','native_fact_source_not_current']);
  for(const e of result.errors){assert.deepEqual(e.sourceNavigation.bindingDifferences.map(d=>d.key).sort(),['army','rules','source']);
    assert.equal(e.sourceNavigation.nativeFactEligible,false);assert.equal(e.sourceNavigation.reReadingRepairsValidity,false);}
  assert.equal(result.facts.some(f=>[466,472].includes(f.evidenceNumber)),false,'Old measurements remain ineligible');
});
await check('actual-role-stops-identical-invalid-reply',async()=>{
  // Minimise to the two ACTUAL rejected claims. Original refs/values/bindings
  // stay intact; only local directory numbers are remapped from 466/472 to 1/2.
  const output=copy(second.output);output.conclusion.nativeFacts=output.conclusion.nativeFacts.filter(f=>[466,472].includes(f.evidenceNumber));
  output.conclusion.nativeFacts.forEach((f,i)=>f.evidenceNumber=i+1);output.conclusion.evidenceNumbers=[1,2];
  const baselineRef=await put({output:copy(output)}),sources=[evidence[465],evidence[471]].map((e,i)=>({...copy(e),number:i+1}));
  const initialErrors=(await verifyRosterNativeFactsV1({conclusion:output.conclusion,currentScope:state.scope,
    lookup:n=>sources[n-1],lookupById:id=>evidence.find(e=>e.id===id),readArtifact:get,isRead:()=>true})).errors;
  const assignment={kind:'workflow_role_assignment',workId:'offline-v971-repeat',role:work.role,scope:copy(state.scope),
    inputs:{},evidenceDirectory:sources};
  let operation={version:1,turn:1,reads:[],calls:[{turn:1,requestRef:await put({promptNodes:[]}),replyRef:baselineRef}],
    correction:{errors:initialErrors,originalReplyRef:baselineRef,instruction:feedback.instruction},consecutiveCorrections:1,pending:null},calls=0,captured;
  for(const e of sources)operation.reads.push({evidenceId:e.id,pointer:'',resultRef:await put({status:'read',
    evidenceId:e.id,evidenceNumber:e.number,pointer:'',artifactRef:e.artifactRef,value:await get(e.artifactRef)})});
  const initialOperation=copy(operation);let injected=output;
  const store={load:async()=>({scope:state.scope,work:[],evidence:sources,events:[]}),get,put};
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'offline-v971',
    deliberation:{deliberate:async q=>{calls++;captured=q;return {output:copy(injected),receipt:{
      contextHash:q.contextHash,roundKind:q.roundKind,sessionId:q.sessionId,roundIndex:q.roundIndex,
      outputHash:hash(injected)}};}}});
  const control={get operationState(){return copy(operation);},checkpointOperation:async op=>{operation=copy(op);},
    readEvidence:async()=>assert.fail('No new read was requested by the actual duplicate'),
    publishContext:async(value,metadata={})=>{const ref=await put(value),id='offline-v971:'+ref;
      let index=assignment.evidenceDirectory.findIndex(e=>e.id===id);
      if(index<0){index=assignment.evidenceDirectory.length;assignment.evidenceDirectory.push({id,artifactRef:ref,
        title:metadata.title??'Test context',kind:metadata.kind??'interpretation',validity:'current',
        bindings:copy(state.scope),conditions:metadata.conditions??[],availability:'available',readPaths:[]});}
      return {...assignment.evidenceDirectory[index],evidenceNumber:index+1,
        ...(metadata.includeDirectory?{evidenceDirectory:copy(assignment.evidenceDirectory)}:{})};}};
  await assert.rejects(execute(assignment,control),e=>e.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
  assert.equal(calls,1);assert.equal(operation.calls.length,2);assert.equal(operation.noProgressStop.previousReplyRef,baselineRef);
  assert.equal(operation.noProgressStop.acceptanceGranted,false);assert.equal(operation.noProgressStop.historyReset,false);
  const sent=captured.promptNodes.find(n=>n.kind==='local_contract_feedback');
  assert(sent.errors.every(e=>e.code==='native_fact_source_not_current'),'Saved generic errors are reclassified at the same source seam');
  // Cold continuation may not make a fifth request merely because a process
  // was restarted. Neither original fees nor reads are cleared.
  const saved=copy(operation);await assert.rejects(execute(assignment,control),e=>e.message==='ROSTER_WORKFLOW_ROLE_NO_PROGRESS');
  assert.equal(calls,1);assert.deepEqual(operation,saved);
  // A genuinely corrected CONTROL return is still allowed. Historical sources
  // remain cited, all unresolved questions remain, and no fact/Plan is approved.
  operation=copy(initialOperation);injected=copy(output);injected.conclusion.nativeFacts=[];
  const corrected=await execute(assignment,control);
  assert.equal(corrected.continuation,undefined);assert.equal(operation.noProgressStop,undefined);
  assert.equal(corrected.value.experimentConclusion.status,'blocked');
  assert.deepEqual(corrected.value.experimentConclusion.evidenceNumbers,[1,2]);
  assert.deepEqual(corrected.value.unresolvedQuestions,output.unresolvedQuestions);
});
await check('old-currency-feedback-recovery-only',async()=>{
  const call=work.operationState.calls.at(-1),lastRequest=await get(call.requestRef),reply=await get(call.replyRef);
  const proposal=projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:lastRequest});
  assert.equal(proposal?.repairKind,'native_source_currency_feedback');assert.equal(proposal.additionalInvalidResultLimit,1);
  const delivered=copy(lastRequest);
  for(const e of delivered.promptNodes.find(n=>n.kind==='local_contract_feedback').errors){
    e.code='native_fact_source_not_current';e.sourceNavigation={version:2,kind:'native_fact_source_scope_mismatch'};}
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work,reply,request:delivered}),null,'New feedback cannot renew its own allowance');
  assert.equal(projectRosterWorkflowFeedbackRecoveryV1({work:{...work,operationState:{...work.operationState,pending:{requestRef:'in-flight'}}},reply,request:lastRequest}),null);
});
await check('repair-resume-retains-stop-history',async()=>{
  const stop={version:1,reason:'identical_invalid_reply_and_diagnostics',workId:work.id,
    previousReplyRef:feedback.originalReplyRef,repeatedReplyRef:work.operationState.correction.originalReplyRef,
    acceptanceGranted:false,historyReset:false,automaticRetry:false};
  const stopped={...copy(work),status:'needs_repair',failure:{code:'ROSTER_WORKFLOW_ROLE_NO_PROGRESS',
    dispatchOutcome:'completed_no_progress',detail:stop},operationState:{...copy(work.operationState),noProgressStop:stop}};
  let local={...state,work:[stopped],events:copy(state.events)};
  const store={load:async()=>copy(local),save:async v=>{local=copy(v);},get,put};
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>assert.fail('Control only; do not execute')});
  await workflow.dispatch({type:'resume_role_correction',workId:work.id,reason:'Verified source diagnostic fix; one explicit controlled continuation'});
  const resumed=local.work[0];assert.equal(resumed.status,'ready');assert.equal(resumed.operationState.noProgressStop,undefined);
  assert.deepEqual(resumed.operationState.noProgressRecoveryHistory.at(-1).stop,stop);
  assert.deepEqual(resumed.failureHistory.at(-1).operationState.noProgressStop,stop);
  assert.deepEqual(resumed.operationState.calls,work.operationState.calls);
  assert.deepEqual(resumed.operationState.reads,work.operationState.reads);
  assert.equal(resumed.operationState.correctionLimit,1);assert.equal(local.acceptanceGranted,false);
});
assert.equal(hash(state),before);
console.log(JSON.stringify({pass:checks.every(c=>c.pass),checks,providerCalls:0,nativeCalls:0,productionWrites:0,
  originalRepliesChanged:false,planApproved:false}));
if(checks.some(c=>!c.pass))process.exitCode=1;
