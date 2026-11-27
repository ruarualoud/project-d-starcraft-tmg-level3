// Keep a necessary question's typed proof identity across its explicit lineage.
// This checks author-to-method ownership, not the truth/value of the strategy.
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
const copy=structuredClone,normalize=value=>String(value??'').replace(/\s+/gu,' ').trim();
const key=(question,proof)=>JSON.stringify([normalize(question),proof.planClaimPath]);
const proofIdentity=proof=>({observation:proof.observation,proofRequirement:proof.proofRequirement,roundScope:proof.roundScope,
 spatialScope:proof.spatialScope?{unitIds:[...proof.spatialScope.unitIds].sort(),markerIds:[...proof.spatialScope.markerIds].sort(),relation:proof.spatialScope.relation}:null});
export async function projectRosterInvestigationScopeLineageV1({state,workId,readArtifact}){
 const graph=createRosterWorkflowGraphV1(state),current=graph.get(workId);
 if(current?.role!=='roster_workflow_strategy_decision'||!rosterWorkflowBindingsMatchV1(current.bindings,state.scope))return [];
 const anchors=new Map();
 // The earliest complete typed scope owns this SAME unresolved question. Later
 // drift cannot replace it; changed draft/source bindings start their own scope.
 for(const prior of graph.ancestors(workId,{includeSelf:false}).reverse()){
  if(prior.role!=='roster_workflow_strategy_decision'||!prior.resultRef||!rosterWorkflowBindingsMatchV1(prior.bindings,current.bindings))continue;
  const body=await readArtifact(prior.resultRef),decision=body?.value?.decisions?.[0];
  const contract=decision?.nextInvestigation?.proofContract;if(contract?.version!==2)continue;
  for(const proof of contract.obligations){
   const q=decision.dataQuestions?.[proof.questionNumber-1];if(q?.classification!=='necessary_fact')continue;
   const id=key(q.question,proof);if(anchors.has(id))continue;
   anchors.set(id,{question:q.question,proof:copy(proof),sourceWorkId:prior.id,sourceResultRef:prior.resultRef});
  }
 }
 return [...anchors.values()];
}
export function rosterInvestigationScopeContinuityErrorV1(decision,lineage=[]){
 const next=decision.nextInvestigation;if(!next?.proofContract?.obligations)return null;
 const changes=[];
 for(const proposed of next.proofContract.obligations){
  const q=decision.dataQuestions?.[proposed.questionNumber-1];if(q?.classification!=='necessary_fact')continue;
  const anchor=lineage.find(row=>key(row.question,row.proof)===key(q.question,proposed));if(!anchor)continue;
  const original=proofIdentity(anchor.proof),received=proofIdentity(proposed);
  const changedFields=Object.keys(original).filter(field=>!isDeepStrictEqual(original[field],received[field]));
  if(changedFields.length)changes.push({question:q.question,questionNumber:proposed.questionNumber,planClaimPath:proposed.planClaimPath,changedFields,original,received,sourceWorkId:anchor.sourceWorkId,sourceResultRef:anchor.sourceResultRef});
 }
 if(!changes.length)return null;
 return {code:'investigation_same_question_scope_changed',version:1,changes,methodDispatchAuthorized:false,factsApproved:false,acceptanceGranted:false,
 instruction:'The SAME necessary question and Plan claim have a different typed proof scope from their original authorization. This is an author scope decision, not a tool-parameter repair or a failed experiment. Do not substitute a current-state/single-unit/independent observation for a future/joint obligation. If a local observation is useful, append and select a separately stated bounded subquestion (optional_probe is allowed) while preserving the original unresolved parent and explaining how that limited observation affects the choice; its answer cannot discharge the parent. Alternatively make an actual evidence-backed Plan/claim revision or a justified decision with the unresolved premise honestly classified. Do not merely relabel the same question optional to bypass its necessity, invent facts, guarantee a future score or use no bounded witness as global impossibility. This control neither approves the old requirement nor selects a strategy.'};
}
export async function projectRosterUnissuedScopeReturnV1({state,work,readArtifact}){
 if(work?.role!=='roster_workflow_experiment_planner'||!work.investigationFor||work.operationState?.pending||work.operationState?.calls?.length||work.resultRef)return null;
 const author=state.work.find(w=>w.id===work.investigationFor);
 if(author?.role!=='roster_workflow_strategy_decision'||author.status!=='evidence_ready'||!author.resultRef||!rosterWorkflowBindingsMatchV1(author.bindings,state.scope))return null;
 const input=work.inputs?.decision,entry=state.evidence.find(e=>e.id===(input?.id??input?.evidenceId));
 if(input?.source!=='evidence'||entry?.id!=='role:'+author.id||(input.pointer??'')!==''||!rosterWorkflowBindingsMatchV1(entry.bindings,state.scope))return null;
 const [result,published]=await Promise.all([readArtifact(author.resultRef),readArtifact(entry.artifactRef)]);
 // Workflow results wrap {kind,value,conditions}; published evidence is the
 // exact value body. Verify those actual bodies instead of equating two hashes.
 if(!isDeepStrictEqual(published,result.value))return null;
 const decision=result?.value?.decisions?.[0];
 const lineage=await projectRosterInvestigationScopeLineageV1({state,workId:author.id,readArtifact});
 const diagnostic=decision?rosterInvestigationScopeContinuityErrorV1(decision,lineage):null;if(!diagnostic)return null;
 const ids=new Set(['role:'+author.id,...diagnostic.changes.map(x=>'role:'+x.sourceWorkId)]);
 const refs=state.evidence.filter(e=>ids.has(e.id)).map(e=>({id:e.id,artifactRef:e.artifactRef}));
 const returned={...diagnostic,origin:'host_proof_scope_contract',authorWorkId:author.id,authorResultRef:author.resultRef};
 return {kind:'interpretation',value:{publicReason:diagnostic.instruction,workOrders:[],failedWorkOrders:[],
 unresolvedQuestions:diagnostic.changes.map(x=>x.question),scopeContinuityReturn:returned,
 experimentConclusion:{status:'strategy_required',answer:diagnostic.instruction,nativeFacts:[],evidenceRefs:refs,
 evidenceNumbers:refs.map(ref=>state.evidence.findIndex(e=>e.id===ref.id)+1),conditions:['Typed authorization mismatch only; original factual obligations remain unanswered.'],scopeContinuityReturn:copy(returned),acceptanceGranted:false},
 hostControlOnly:true,acceptanceGranted:false},conditions:['Deterministic author/method control return; no model, Native observation or Plan approval']};
}
