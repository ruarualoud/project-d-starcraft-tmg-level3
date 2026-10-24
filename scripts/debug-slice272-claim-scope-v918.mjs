// Reproduce the actual B conditional-conclusion transport gap. No live calls,
// Native execution, production writes, or claims about model quality.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterSourceClaimReviewV1,assessRosterSourceClaimReviewV1} from '../packages/roster-strategist/roster-workflow-source-claims-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
const [artifactDirectory,output]=process.argv.slice(2),copy=structuredClone;
const originalRef='f4ca45149956689154c5f2041b46cc8623dc3d323fb54bdd9dc3bb99fbd5dbfa';
const original=JSON.parse(await fs.readFile(`${artifactDirectory}/${originalRef}.json`,'utf8'));
const originalConclusion=original.value.experimentConclusion;
const conditions=originalConclusion.conditions;
const scope={source:'injected-source',rules:'injected-rules',map:'injected-map',army:'injected-army',plan:'injected-plan'};
function memoryStore(){let saved;const artifacts=new Map();return {
  load:async()=>copy(saved),save:async s=>{saved=copy(s);},
  put:async v=>{const ref=hash(v);artifacts.set(ref,copy(v));return ref;},
  get:async ref=>{assert.ok(artifacts.has(ref),'Missing artifact '+ref);return copy(artifacts.get(ref));},
  state:()=>copy(saved),
};}
async function fixture(answer=originalConclusion.answer){
  const store=memoryStore();
  const source=JSON.parse(await fs.readFile(`${artifactDirectory}/32bda8990bfd1c53e68d3d094f517453af0f259792919a0bb3d84db53ee2e843.json`,'utf8'));
  const sourceRef=await store.put(source),conclusion={answer,conditions:copy(conditions)};
  const owner={id:'author',bindings:scope,resultRef:await store.put({value:{experimentConclusion:conclusion}})};
  const sources=[{projection:{id:'view:fact',bindings:scope,value:{sourceEvidenceId:'fact',sourceArtifactRef:sourceRef}},originalNumber:1,citedNumbers:[1],kind:'tool_receipt',title:'Saved B comparison'}];
  const state={scope,draftRevision:7,work:[owner],evidence:[{id:'fact',artifactRef:sourceRef,bindings:scope},{id:'role:author',artifactRef:owner.resultRef,bindings:scope}]};
  const root={id:'review',role:'roster_workflow_final_review',bindings:scope,inputs:{
    question:{source:'literal',value:{question:'Check the measured comparison; do not approve the unmeasured alternative.'}},
    review:{source:'literal',value:{obligations:[{checkId:'source_fidelity',criterion:'Verify exact subjects and quantities against the source.'},{checkId:'question_coverage',criterion:'Local comparison only.'}]}}}};
  const compile=(overrides={})=>createRosterSourceClaimReviewV1({state,owner,conclusion,sources,root,store,...overrides});
  return {store,state,owner,conclusion,sources,root,compile,source};
}
const report={schema:'slice272_claim_scope_v918',originalRef,actualProviderCalls:0,nativeCalls:0,productionWrites:0,steps:[]};
try{
  const f=await fixture(),compiled=await f.compile();
  assert.ok(compiled.claimReviews.some(j=>j.inputs.claimBatch),'Exercise actual batched transport');
  for(const job of compiled.claimReviews){
    assert.deepEqual(job.inputs.claimScope?.value.conditions,conditions,'Author-declared scope lost between conclusion and source reviewer');
    assert.equal(job.inputs.claimScope.value.sourcePointer,'/experimentConclusion/conditions');
    assert.equal(job.inputs.claimScope.value.independentEvidence,false);
  }
  assert.equal(compiled.materialSegments.map(s=>s.text).join(''),originalConclusion.answer,'Do not rewrite paid author output');
  report.steps.push('Actual B conditions reach every batch; exact assertions preserved');
  const single=await fixture('The measured arm exceeds the reference by more than 0.5.');
  const one=await single.compile();
  assert.ok(one.claimReviews[0].inputs.claim);
  assert.deepEqual(one.claimReviews[0].inputs.claimScope.value.conditions,conditions);
  // A captured request from the real role/core seam, with an injected reviewer.
  const store=memoryStore(),requests=[];
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'scope-v918',deliberation:{deliberate:async request=>{
    requests.push(copy(request));
    const result={action:'finish',publicReason:'Injected source verdict, not a strategy proof',reads:[],checks:[{checkId:'q1',verdict:'supported',publicReason:'Injected',evidenceNumbers:[1],conditions:[],dataQuestions:[]}]};
    return {output:result,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,roundIndex:request.roundIndex,outputHash:hash(result),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'initialize',scope});
  await workflow.dispatch({type:'publish_evidence',id:'fact',title:'Frozen B source',kind:'tool_receipt',bindings:scope,conditions:['injected test context'],value:f.source});
  await workflow.dispatch({type:'publish_evidence',id:'role:author',title:'Proposed answer',kind:'proposal',bindings:scope,conditions:[],value:{experimentConclusion:single.conclusion}});
  const job=one.claimReviews[0];
  await workflow.dispatch({type:'enqueue',work:[job]});
  await workflow.dispatch({type:'run_ready',workIds:[job.id],concurrency:1});
  assert.equal(requests.length,1);
  const assignment=requests[0].promptNodes.find(n=>n.kind==='workflow_role_assignment');
  assert.ok(JSON.stringify(assignment).includes(conditions[2]),'Scope must reach the actual model request');
  report.steps.push('Single-claim scope reaches actual role prompt; one injected request, no paid call');
  // Inject immutable independent verdicts at the compiler/cache seam.
  for(const j of compiled.claimReviews){
    j.status='evidence_ready';
    j.resultRef=await f.store.put({value:{checks:j.inputs.review.value.obligations.map(o=>({checkId:o.checkId,verdict:'supported',publicReason:'Injected pass',evidenceNumbers:[1],conditions:[],dataQuestions:[]}))}});
    f.state.work.push(j);
  }
  const same=await f.compile({root:{...f.root,id:'same-scope'}});
  assert.equal(same.claimReviews.length,0,'Unchanged passed checks must not rerun');
  const changed=await f.compile({conclusion:{...f.conclusion,conditions:['Now claimed for the unmeasured large formation.']},root:{...f.root,id:'different-scope'}});
  assert.equal(changed.materialClaims.some(c=>c.reusedResultRef),false,'Changed scope cannot inherit approval');
  // Historical v8 actual-pass compatibility is scope-aware, not version-only.
  const historical=copy(compiled.claimReviews[0]);
  delete historical.inputs.claimScope;
  historical.materialClaimContractVersion=8;
  if(historical.materialClaimBatch)for(const b of historical.materialClaimBatch){
    const c=compiled.materialClaims.find(c=>c.checkBinding.hash===b.hash);
    b.hash=hash({version:8,text:c.text,heading:c.heading,sourceHash:b.sourceHash,question:f.root.inputs.question});b.contractVersion=8;
  }
  else historical.materialClaimHash=hash({version:8,text:compiled.materialClaims[0].text,heading:compiled.materialClaims[0].heading,sourceHash:historical.materialClaimSourceHash,question:f.root.inputs.question});
  f.state.work=[f.owner,historical];
  const legacy=await f.compile({root:{...f.root,id:'legacy-same'}});
  assert.ok(legacy.materialClaims.some(c=>c.reusedResultRef),'Keep real legacy pass when original author scope is identical');
  const stale=await f.compile({conclusion:{...f.conclusion,conditions:['Changed scope']},root:{...f.root,id:'legacy-changed'}});
  assert.equal(stale.materialClaims.some(c=>c.reusedResultRef),false);
  report.steps.push('Same-scope passes reused; changed scope rejected, including saved v8 passes');
  f.state.work=[f.owner,...compiled.claimReviews];
  const failed=compiled.claimReviews[0],payload=await f.store.get(failed.resultRef);
  payload.value.checks[0].verdict='requires_revision';
  payload.value.checks[0].publicReason='Injected contradictory number/subject, scope cannot erase it';
  failed.resultRef=await f.store.put(payload);
  compiled.resultRef=await f.store.put({value:{checks:[{checkId:'question_coverage',verdict:'supported',publicReason:'Injected',evidenceNumbers:[1],conditions:[],dataQuestions:[]}]}});
  const assessed=await assessRosterSourceClaimReviewV1({state:f.state,review:compiled,store:f.store});
  assert.equal(assessed.acceptedForStrategy,false);
  assert.ok(assessed.failedClaimReviewIds.includes(failed.id));
  report.steps.push('Explicit false claim still blocks despite contextual conditions and parent pass');
  report.pass=true;
}catch(error){report.pass=false;report.error=error.message;report.stack=error.stack.split('\n').slice(0,5);process.exitCode=1;}
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
