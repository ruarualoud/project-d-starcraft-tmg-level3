// Actual fresh B: valid-shaped joint edit + unresolved fact was rejected;
// local repair could authorize only a standalone inquiry, not its continuation.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {prepareRosterStrategyRepairRequestV1,projectRosterStrategyRepairOutputV1} from '../packages/roster-strategist/roster-workflow-semantic-repair-v1.mjs';
import {rosterDecisionInvestigationErrorV1} from '../packages/roster-strategist/roster-workflow-fact-inquiry-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
const [root,output,previous]=process.argv.slice(2),get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const request=await get('8d4928131f3a5d163a735bbee4eed806bdc3884e6670a586ea3d7b434c0d64a5');
const paid=await get('ccad4214169cebb348c56ead3d8ae63d7a45fa573e526f66dcbaf292e67ef3a1');
const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
const original=structuredClone(feedback.originalOutput),originalBytes=JSON.stringify(original);
const base={...request,responseFormat:request.promptNodes.find(n=>n.kind==='strategy_semantic_repair').originalResponseFormat,
  promptNodes:request.promptNodes.filter(n=>n.kind!=='strategy_semantic_repair')};
const prepared=prepareRosterStrategyRepairRequestV1(base);
const wire={...structuredClone(paid.output),action:'authorize_revision_followup',
  publicReason:'Fixture: keep the exact proposed joint revision, authorize only the missing bounded map inquiry after its normal commit.',
  questionRepairs:null,decisionPublicReason:null};
const project=w=>projectRosterStrategyRepairOutputV1({request:prepared,output:w});
const tests=[
  ['local-revision-followup-command',()=>{
    assert.ok(prepared.responseFormat.schema.properties.action.enum.includes('authorize_revision_followup'));
    const result=project(wire);assert.deepEqual(result.errors,[]);
    const decision=result.output.decisions[0],before=original.decisions[0];
    assert.equal(decision.disposition,'revise');
    for(const key of ['mutation','strategicChanges','dataQuestions','publicReason','alternatives','evidenceNumbers'])
      assert.deepEqual(decision[key],before[key],key+' must not be rewritten');
    assert.deepEqual(decision.nextInvestigation,wire.inquiryAuthorization);
    assert.equal(rosterDecisionInvestigationErrorV1(decision),null);
    assert.equal(decision.dataQuestions[2].classification,'necessary_fact');
    assert.equal(JSON.stringify(original),originalBytes);
    assert.ok(result.projection.some(p=>p.rule==='model_authored_revision_followup_v3'));
  }],
  ['standalone-inquiry-cannot-discard-existing-revision',()=>{
    const bad={...wire,action:'authorize_inquiry',questionRepairs:[],decisionPublicReason:'fixture standalone'};
    assert.equal(project(bad).errors[0]?.code,'semantic_patch_inquiry_cannot_discard_mutation');
  }],
  ['missing-or-wrong-question-authorization-not-approved',()=>{
    assert.ok(project({...wire,inquiryAuthorization:null}).errors.length);
    const result=project({...wire,inquiryAuthorization:{...wire.inquiryAuthorization,questionNumbers:[1]}});
    assert.deepEqual(result.errors,[]);
    assert.equal(rosterDecisionInvestigationErrorV1(result.output.decisions[0])?.code,'bounded_investigation_authorization_invalid');
  }],
  ['no-patch-and-malformed-patch-distinct',()=>{
    const empty=project({...wire,questionRepairs:[]});assert.deepEqual(empty.errors,[]);
    assert.deepEqual(empty.output,project(wire).output);
    assert.equal(project({...wire,questionRepairs:{}}).errors[0]?.code,'semantic_patch_schema');
  }],
  ['real-role-dispatch-preserves-edit-and-pending-fact',async()=>{
    let state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
    const work=state.work.find(w=>w.id==='product:initial-army-and-plan');
    // Reconstruct precisely the saved pre-final-call boundary in memory. Raw
    // production state/replies are never edited and no real retry is issued.
    work.operationState.calls=work.operationState.calls.slice(0,-1);
    work.operationState.turn=5;work.operationState.pending=null;
    work.operationState.consecutiveCorrections=2;
    work.operationState.correction={errors:feedback.errors,originalReplyRef:feedback.originalReplyRef,
      instruction:feedback.instruction};work.status='needs_model_choice';work.failure=null;
    const startDraft=state.draftRef,memory=new Map();let captured,calls=0;
    const store={load:async()=>structuredClone(state),save:async v=>{state=structuredClone(v);},
      get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):get(ref),
      put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
    const executor=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'v866-injected-revision-followup',
      deliberation:{deliberate:async q=>{captured=q;calls++;return {output:structuredClone(wire),receipt:{fixture:true,
        contextHash:q.contextHash,roundKind:q.roundKind,sessionId:q.sessionId,roundIndex:q.roundIndex,outputHash:hash(wire)}};}}});
    const delivered=request.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
    const workflow=await createRosterDecisionWorkflowV1({store,execute:(assignment,control)=>executor({
      ...assignment,inputs:structuredClone(delivered)},control)});
    await workflow.dispatch({type:'continue_work',workId:work.id});
    await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
    assert.equal(calls,1);
    assert.ok(captured.responseFormat.schema.properties.action.enum.includes('authorize_revision_followup'));
    const after=state.work.find(w=>w.id===work.id),result=await store.get(after.resultRef);
    assert.equal(after.status,'evidence_ready',JSON.stringify({failure:after.failure,
      resultStatus:result?.value?.status,errors:after.operationState?.correction?.errors}));
    assert.equal(result.value.decisions[0].disposition,'revise');
    assert.deepEqual(result.value.decisions[0].mutation,original.decisions[0].mutation);
    assert.deepEqual(result.value.decisions[0].nextInvestigation.questionNumbers,[3]);
    assert.equal(result.value.decisions[0].dataQuestions[2].classification,'necessary_fact');
    assert.equal(state.draftRef,startDraft,'normal Builder/commit has not run and is not bypassed');
    assert.equal(state.acceptanceGranted,false);
    return {capturedRequest:captured,injectedOutput:wire,result,resultStatus:after.status,
      sourceContract:prepared.responseFormat.outputContractRef};
  }],
];
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
for(const [name,fn] of tests){
  const passed=prior?.checks.find(c=>c.name===name&&c.pass);
  if(passed){checks.push({...passed,inheritedFrom:previous});continue;}
  try{checks.push({name,pass:true,evidence:await fn()});}
  catch(e){checks.push({name,pass:false,error:{code:e.code??null,message:e.message}});}
}
const report={schema:'slice272_revision_inquiry_debug_v866',pass:checks.every(c=>c.pass),checks,
  actualProviderCalls:0,nativeCalls:0,productionWrites:0,trainingTruth:false};
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,pass:report.pass,checks:checks.map(({name,pass,inheritedFrom,error})=>({name,pass,inheritedFrom,error}))}));
process.exitCode=report.pass?0:1;
