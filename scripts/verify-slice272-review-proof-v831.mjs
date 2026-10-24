// Reproduce the saved judge approving a statement by citing the statement
// itself. All replies are scripted, all writes isolated; no Provider/Native.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createRosterDecisionWorkflowV1} from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {createRosterWorkflowReadRoleExecutorV1} from '../packages/roster-strategist/roster-workflow-read-role-v1.mjs';
import {assessRosterSourceClaimReviewV1} from '../packages/roster-strategist/roster-workflow-source-claims-v1.mjs';
import {createRosterExperimentSourceReviewV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {projectRosterWorkflowDecisionEvidenceLineageV1} from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {rosterSourceReviewNeedsContractCheckV1} from '../packages/roster-strategist/roster-source-review-repair-handoff-v1.mjs';
const base=process.argv[2],priorFile=process.argv[3],copy=x=>structuredClone(x);
const originalBytes=await fs.readFile(base+'/workflow.json','utf8'),original=JSON.parse(originalBytes);
const read=async ref=>JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const ownerId='product:after-teach:r4:subject-v1:investigation:method:08115cd45c8cbac0';
const owner=original.work.find(w=>w.id===ownerId),root=original.work.find(w=>w.id===ownerId+':source-review:v2');
const work=original.work.find(w=>w.id===root.id+':claim:5'),assignment=await read(work.inputRef);
const oldReply=await read(work.operationState.calls.at(-1).replyRef);
const prior=priorFile?JSON.parse(await fs.readFile(priorFile,'utf8')):null,results=[];
async function check(name,fn){const done=prior?.results.find(r=>r.name===name&&r.pass);
  if(done){results.push({...done,inheritedFrom:priorFile});return;}
  try{results.push({name,pass:true,...await fn()});}catch(e){results.push({name,pass:false,error:e.message,stack:e.stack?.split('\n').slice(0,4)});}
  console.log(JSON.stringify(results.at(-1)));}
async function harness(output){
  let state=copy(original),observed,operation;const memory=new Map();
  const store={load:async()=>copy(state),save:async s=>{state=copy(s);},get:async r=>memory.has(r)?copy(memory.get(r)):read(r),
    put:async value=>{const r=hash(value);memory.set(r,copy(value));return r;}};
  const w=state.work.find(w=>w.id===work.id);w.status='ready';w.failure=null;w.operationState.pending=null;
  const execute=createRosterWorkflowReadRoleExecutorV1({store,sessionId:'synthetic-v831',deliberation:{deliberate:async request=>{
    observed=request;const out=copy(output);
    return {output:out,receipt:{contextHash:request.contextHash,roundKind:request.roundKind,sessionId:request.sessionId,
      roundIndex:request.roundIndex,outputHash:hash(out),outputContractRef:copy(request.responseFormat.outputContractRef),paidProviderCall:false,trainingTruth:false}};
  }}});
  const workflow=await createRosterDecisionWorkflowV1({store,execute});
  await workflow.dispatch({type:'run_ready',workIds:[work.id],concurrency:1});
  operation=state.work.find(w=>w.id===work.id);
  return {state,operation,observed,store,workflow};
}
await check('真实自证回复在产品调度接缝被退回局部纠错',async()=>{
  const h=await harness(oldReply.output);
  assert.equal(h.operation.status,'needs_model_choice');
  assert(h.operation.operationState.correction.errors.some(e=>e.code==='review_subject_is_not_evidence'));
  assert.equal(h.state.draftRef,original.draftRef);assert.equal(h.state.acceptanceGranted,false);
});
await check('最终请求可查询到摘要的原始Native依据且不自动批准',async()=>{
  const h=await harness(oldReply.output),inputs=h.observed.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const proof=inputs.reviewProofContext?.value;assert(proof,'missing source proof directory');
  for(const number of [1213,1233,1242])assert(proof.entries.some(e=>e.evidenceNumber===number));
  assert.equal(proof.directoryIsNotARead,true);assert.equal(proof.acceptanceGranted,false);
  assert(proof.subjectEvidenceNumbers.includes(1297));
  assert(!proof.entries.some(e=>e.evidenceNumber===1297));
});
await check('混合合法来源不能夹带被审对象作为证明',async()=>{
  const out=copy(oldReply.output);out.checks[0].evidenceNumbers=[1297,1100];const h=await harness(out);
  assert(h.operation.operationState.correction?.errors.some(e=>e.code==='review_subject_is_not_evidence'));
});
await check('既有伪通过不被父审核继续接受',async()=>{
  const a=await assessRosterSourceClaimReviewV1({state:original,review:root,store:{get:read}});
  assert(a.failedClaimReviewIds?.includes(work.id));assert.equal(a.acceptedForStrategy,false);
});
await check('正常产品重审只替换自证项，复用其他有效通过',async()=>{
  const revised=await createRosterExperimentSourceReviewV1({state:original,owner,result:await read(owner.resultRef),store:{get:read}});
  assert(revised?.sourceReviewRepairHandoff,'current proof fault must use the normal review repair handoff');
  assert(revised.sourceReviewRepairHandoff.staleRequests.some(r=>r.workId===work.id&&r.invalidProofCitations));
  assert(!revised.materialClaimReviewIds.includes(work.id));
  assert(revised.materialClaimReviewIds.includes(root.id+':claim:7'),'valid owner-choice record is reusable');
  assert.equal(revised.controlledRecovery.historyReset,false);
});
let proofModule;try{proofModule=await import('../packages/roster-strategist/roster-review-proof-context-v1.mjs');}catch{}
async function synthetic(kind){
  assert(proofModule,'source proof module required');
  const scope={army:'a',map:'m',rules:'r',source:'s',plan:'p'},memory=new Map();
  const put=v=>{const r=hash(v);memory.set(r,copy(v));return r;};
  const subject={id:'candidate',kind:'proposal',bindings:scope,artifactRef:put({answer:'claim'})};
  const native={id:'native',kind:'tool_receipt',bindings:scope,artifactRef:put({operation:'measure',receipt:{quantity:7}})};
  const summary={id:'summary',kind:'proposal',bindings:scope,artifactRef:put({findings:[{evidenceRefs:[{id:native.id,artifactRef:native.artifactRef}]}]})};
  const alias={id:'alias',kind:'capability_result',bindings:scope,artifactRef:put({schema:'roster_experiment_source_facts_v1',sourceEvidenceId:'candidate',sourceArtifactRef:subject.artifactRef})};
  const evidence=[subject,native,summary,alias],state={scope,evidence,work:[],events:[],draftRevision:1};
  const inputs={claim:{value:{originalAnswerEvidence:{sourceEvidenceId:'candidate'}}},sourceDirectory:{value:{entries:[{sourceEvidenceId:'summary'}]}}};
  if(kind==='mismatch')summary.artifactRef=put({evidenceRefs:[{id:'native',artifactRef:'wrong'}]});
  if(kind==='cycle'){summary.artifactRef=put({evidenceRefs:[{id:'summary'}]});}
  const get=async r=>{assert(memory.has(r));return copy(memory.get(r));};
  return {state,inputs,get,evidence};
}
await check('导航别名不能绕过自证拦截',async()=>{
  const h=await synthetic();const errors=await proofModule.rosterReviewProofCitationErrorsV1({inputs:h.inputs,directory:h.evidence,readArtifact:h.get,
    checks:[{checkId:'source_fidelity',verdict:'supported',evidenceNumbers:[4]}]});
  assert(errors.some(e=>e.code==='review_subject_is_not_evidence'));
});
await check('引用错原件保留缺口，不跟随到同名新内容',async()=>{
  const h=await synthetic('mismatch');const p=await proofModule.projectRosterReviewProofContextV1({state:h.state,inputs:h.inputs,readArtifact:h.get});
  assert(p.unresolvedReferences.some(e=>e.reason==='reference_artifact_mismatch'));
  assert(!p.entries.some(e=>e.sourceEvidenceId==='native'));
});
await check('循环引用有限终止，导航不是规则证明',async()=>{
  const h=await synthetic('cycle');const p=await proofModule.projectRosterReviewProofContextV1({state:h.state,inputs:h.inputs,readArtifact:h.get});
  assert.equal(p.entries.length,1);assert.equal(p.acceptanceGranted,false);
});
await check('独立作者选择记录可核对，不禁用所有模型记录',async()=>{
  assert(proofModule);const errors=await proofModule.rosterReviewProofCitationErrorsV1({inputs:assignment.inputs,directory:assignment.evidenceDirectory,readArtifact:read,
    checks:[{checkId:'source_fidelity',verdict:'supported',evidenceNumbers:[1289]}]});assert.deepEqual(errors,[]);
});
await check('保留未知可以返回缺证据，不强迫伪造引用',async()=>{
  assert(proofModule);const errors=await proofModule.rosterReviewProofCitationErrorsV1({inputs:assignment.inputs,directory:assignment.evidenceDirectory,readArtifact:read,
    checks:[{checkId:'source_fidelity',verdict:'needs_evidence',evidenceNumbers:[]}]});assert.deepEqual(errors,[]);
});
let lineageHash;
await check('共享遍历提取后旧决策图与红灯基线逐值等价',async()=>{
  assert(prior?.lineageHash,'requires saved pre-change lineage');
  assert.equal(hash(await projectRosterWorkflowDecisionEvidenceLineageV1({state:original,readArtifact:read})),prior.lineageHash);
});
await check('全历史启动扫描只选两个当前依赖的实际自证缺陷',async()=>{
  const selected=[];
  for(const old of original.work.filter(rosterSourceReviewNeedsContractCheckV1)){
    const o=original.work.find(w=>w.id===old.experimentSourceReviewOf);
    if(o?.status!=='evidence_ready'||!Object.entries(o.bindings).every(([k,v])=>original.scope[k]===v))continue;
    const next=await createRosterExperimentSourceReviewV1({state:original,owner:o,result:await read(o.resultRef),store:{get:read}});
    if(next?.sourceReviewRepairHandoff)selected.push(next);
  }
  // The first scan found an additional REAL defect: the still-cited current
  // comparison's claim6 mixes independent Native facts with itself (1275).
  // It has no completed source-revision child. Do not waive it to force the
  // mistaken one-owner fixture expectation; recheck only that single clause.
  const comparisonOwner='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v3:study:method:c8748d16f139bf05:source-revision:review-v7:presentation-v2';
  assert.deepEqual([...new Set(selected.map(n=>n.experimentSourceReviewOf))],[comparisonOwner,ownerId]);
  const comparison=selected.find(n=>n.experimentSourceReviewOf===comparisonOwner);
  assert.equal(comparison.claimReviews.length,1);assert.equal(comparison.materialClaims.filter(c=>c.reusedResultRef).length,7);
  assert.equal(comparison.sourceReviewRepairHandoff.retiredRootIds.length,0);
});
await check('正常原子入队与冷恢复保留旧回复和费用',async()=>{
  let state=copy(original);const memory=new Map(),store={load:async()=>copy(state),save:async s=>{state=copy(s);},
    get:async r=>memory.has(r)?copy(memory.get(r)):read(r),put:async v=>{const r=hash(v);memory.set(r,copy(v));return r;}};
  const next=await createRosterExperimentSourceReviewV1({state,owner,result:await read(owner.resultRef),store});
  const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_PROVIDER_OR_NATIVE');}});
  const {sourceProjections,claimReviews=[],ruleFieldReviews=[],...job}=next;
  for(const p of sourceProjections)if(!state.evidence.some(e=>e.id===p.id))await workflow.dispatch({type:'publish_evidence',...p});
  await workflow.dispatch({type:'enqueue',work:[...claimReviews,...ruleFieldReviews,job]});
  assert(state.work.some(w=>w.id===job.id));assert.equal(state.work.find(w=>w.id===root.id).status,'superseded');
  for(const old of original.work){const after=state.work.find(w=>w.id===old.id);
    assert.equal(after.resultRef,old.resultRef);assert.deepEqual(after.operationState,old.operationState);assert.equal(after.attempt,old.attempt);}
  const cold=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_PROVIDER_OR_NATIVE');}});
  assert.equal(await createRosterExperimentSourceReviewV1({state:await cold.inspect(),owner,result:await read(owner.resultRef),store}),null);
  assert.equal(state.draftRef,original.draftRef);
});
await check('在途请求不被来源修复覆盖',async()=>{
  const state=copy(original);state.work.find(w=>w.id===root.id).operationState.pending={requestRef:'still-in-flight'};
  assert.equal(await createRosterExperimentSourceReviewV1({state,owner,result:await read(owner.resultRef),store:{get:read}}),null);
});
await check('已有决策来源图语义不变且原状态不改写',async()=>{
  lineageHash=hash(await projectRosterWorkflowDecisionEvidenceLineageV1({state:original,readArtifact:read}));
  if(prior?.lineageHash)assert.equal(lineageHash,prior.lineageHash);
  assert.equal(await fs.readFile(base+'/workflow.json','utf8'),originalBytes);
});
const output={schema:'slice272_review_proof_faults_v831',status:results.every(x=>x.pass)?'passed':'failed',
  event:original.events.at(-1).sequence,results,lineageHash:lineageHash??prior?.lineageHash,providerCalls:0,nativeCalls:0,productionWrites:0};
const file=`build/slice272-v831-review-proof-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(output,null,2));
console.log(JSON.stringify({file,status:output.status,passed:results.filter(x=>x.pass).length,total:results.length}));
if(output.status==='failed')process.exitCode=1;
