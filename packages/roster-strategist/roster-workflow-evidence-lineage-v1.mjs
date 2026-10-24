// A decision's exact citations are the seam between Plan claims and source
// discovery. Follow saved references, never search prose or infer approval.
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {projectRosterExperimentSourceFactsV1,ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1 as sourceFactsVersion} from './roster-experiment-source-facts-v1.mjs';
import {projectRosterWorkflowReturnedMethodFactsV1} from './roster-workflow-tool-return-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {projectRosterComparisonObservationSourcesV1} from './roster-comparison-observation-sources-v1.mjs';
import {rosterComparisonStageOwnershipV1} from './roster-comparison-stage-ownership-v1.mjs';
import {projectRosterMeasurementConfigurationInputsV1} from './roster-measurement-configuration-v1.mjs';
import {projectRosterPriorInvestigationEvidenceV1} from './roster-workflow-investigation-evidence-v1.mjs';
import {projectRosterEvidenceReadNavigationV1} from './roster-evidence-path-navigation-v1.mjs';
import {projectRosterWorkflowReviewContextV1} from './roster-workflow-review-context-v1.mjs';
import {projectRosterLocalObligationInputsV1} from './roster-review-data-questions-v1.mjs';
import {projectRosterNativeChoiceSourcesV1} from './roster-native-choice-sources-v1.mjs';
export {rosterComparisonObservationCoverageErrorsV1} from './roster-comparison-observation-sources-v1.mjs';

// Publish once per draft. These are the existing deterministic source-fact
// projection, not another model summary, acceptance or a rewritten old Plan.
export async function publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store}){
  let state=await workflow.inspect();
  const id=`draft:r${state.draftRevision}:evidence-lineage:v${sourceFactsVersion}`;
  const saved=state.evidence.find(e=>e.id===id);if(saved)return store.get(saved.artifactRef);
  const directory=await projectRosterWorkflowDecisionEvidenceLineageV1({state,readArtifact:store.get});
  for(const row of directory.entries){
    const evidence=state.evidence[row.evidenceNumber-1];
    const artifact=await store.get(evidence.artifactRef),value=artifact.value??artifact;
    if(!value.operation||!value.receipt)continue;
    const factsId=`workflow-source-facts:${evidence.id}:v${sourceFactsVersion}`;
    if(!state.evidence.some(e=>e.id===factsId)){
      // Army revisions keep old citations as history. A new compact view must
      // not be published with an obsolete binding (nor rebound to the new
      // army). The exact original handle above remains readable for comparison.
      if(row.validity!=='current'){
        row.sourceFactsUnavailableReason='historical_original_remains_exact_readable';
        continue;
      }
      await workflow.dispatch({type:'publish_evidence',id:factsId,title:`Exact compact source facts: ${evidence.title}`,
        kind:'capability_result',bindings:evidence.bindings,
        conditions:['Source-labelled measurement projection only; no source approval, causal inference or Plan acceptance'],
        value:projectRosterExperimentSourceFactsV1({evidence,value})});
      state=await workflow.inspect();
    }
    row.sourceFactsRead={evidenceNumber:state.evidence.findIndex(e=>e.id===factsId)+1,pointer:''};
  }
  directory.projectionVersion=sourceFactsVersion;
  directory.instruction+=' When available, sourceFactsRead is a compact exact projection of this original source, including measured values, precision and optional-effect exclusions. Read it before loading a complete Native receipt; omitted details remain at the ORIGINAL source evidenceNumber and exact pointer. A projection handle is not already-read evidence and does not establish causal benefit.';
  await workflow.dispatch({type:'publish_evidence',id,title:'Applied joint decisions: source citations and exact compact fact handles',
    kind:'capability_result',bindings:state.scope,conditions:['Discovery metadata only; original cited sources remain immutable and require explicit reads'],value:directory});
  return directory;
}

// Every consuming role crosses the same seam. In particular, do not compute
// these inputs and then accidentally pass the original assignment to non-planners.
export async function projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact,projectToolRepair,compareSceneConditions}){
  if(!state)return assignment.inputs;
  assignment={...assignment,inputs:{...assignment.inputs,...projectRosterLocalObligationInputsV1({assignment,state})}};
  assignment={...assignment,inputs:{...assignment.inputs,...await projectRosterNativeChoiceSourcesV1({assignment,state,readArtifact})}};
  assignment={...assignment,inputs:{...assignment.inputs,...await projectRosterMeasurementConfigurationInputsV1({
    assignment,state,readArtifact,compareSceneConditions,resolveReferences:projectRosterEvidenceReferenceClosureV1})}};
  const eligible=['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_fact_summary'].includes(assignment.role)
    ||assignment.role==='roster_workflow_final_review'&&assignment.inputs.review?.value?.domainId;
  if(!eligible||!state)return assignment.inputs;
  assignment={...assignment,inputs:{...assignment.inputs,
    ...await projectRosterWorkflowReviewContextV1({assignment,state,readArtifact})}};
  const readNavigation=await projectRosterEvidenceReadNavigationV1({assignment,state,readArtifact});
  if(readNavigation)assignment={...assignment,inputs:{...assignment.inputs,
    evidenceReadNavigation:{source:'literal',value:readNavigation}}};
  const returnedFacts=await projectRosterWorkflowReturnedMethodFactsV1({assignment,state,readArtifact});
  // Sharing a source seam does not delegate strategy ownership. A local fact
  // summary needs this order's completed facts, not the global army/Plan or
  // the whole applied-decision lineage that strategic consumers receive.
  if(assignment.role==='roster_workflow_fact_summary')return returnedFacts
    ?{...assignment.inputs,returnedMethodFacts:{source:'literal',value:returnedFacts}}:assignment.inputs;
  const prefix=`draft:r${state.draftRevision}:evidence-lineage:`;
  const entry=state.evidence.find(e=>e.id===prefix+'v'+sourceFactsVersion)
    ??state.evidence.find(e=>e.id===prefix+'v2')??state.evidence.find(e=>e.id===prefix+'v1');
  const inputs=entry?{...assignment.inputs,decisionEvidenceDirectory:{source:'literal',value:await readArtifact(entry.artifactRef)}}:{...assignment.inputs};
  if(['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach'].includes(assignment.role)){
    const prior=projectRosterPriorInvestigationEvidenceV1({state,
      work:state.work.find(w=>w.id===(assignment.workId??assignment.id))});
    if(prior){
      inputs.priorInvestigationEvidence={source:'literal',value:prior};
      // Deliver the exact returned conclusion/checks, not just hundreds of
      // historical directory handles. They remain fallible interpretations,
      // not Native facts or silently rebound current-Plan approvals.
      for(const [index,returned] of prior.controlReturns.entries()){
        const deliver=async(number,resultRef,pointer,key)=>{
          const entry=state.evidence[number-1];if(!entry)return;
          const [body,result]=await Promise.all([readArtifact(entry.artifactRef),readArtifact(resultRef)]);
          const field=pointer.slice(1);
          if(!isDeepStrictEqual(body,result.value)||!Object.hasOwn(body,field))return;
          inputs[key]={source:'evidence',evidenceId:entry.id,evidenceNumber:number,
            artifactRef:entry.artifactRef,pointer,status:'read',validity:'historical',
            scopeUsage:'historical_reference',value:structuredClone(body[field])};
        };
        await deliver(returned.sourceEvidenceNumber,returned.resultRef,'/experimentConclusion',`priorInvestigationConclusion${index}`);
        const dispute=returned.sourceControlDispute;
        if(dispute)await deliver(dispute.reviewEvidenceNumber,dispute.reviewResultRef,'/checks',`priorInvestigationReview${index}`);
      }
    }
  }
  if(returnedFacts)inputs.returnedMethodFacts={source:'literal',value:returnedFacts};
  // Scheduled work retains the original failure. Its repair interface must come
  // from the same current source adapter used by new failures, not a copied old
  // instruction. This changes neither the rejected request nor its diagnosis
  // record, and never executes a tool or edits a model proposal.
  const task=inputs.task?.value,failure=task?.failure;
  if(failure?.operation&&typeof projectToolRepair==='function'){
    const queryRepair=projectToolRepair(failure);
    if(queryRepair)inputs.task={...inputs.task,value:{...task,
      failure:{...failure,queryRepair},
      currentRepairContract:{originalFailureUnchanged:true,source:'current_executable_tool_adapter',
        instruction:'failure.detail records the original execution; failure.queryRepair is the current source-owned repair interface for those same inputs. Follow its precise inputProblem when present. No request was modified or retried; strategic choices and facts are unchanged.'}}};
  }
  // Current committed identity is not the last candidate the model discussed.
  // Deliver the ALREADY saved Native summary; do not recalculate, select an army
  // or overwrite a historical assigned draft. This is shared by all consumers.
  if(state.draftRef){
    const draft=await readArtifact(state.draftRef);
    const auditEntry=state.evidence.find(e=>e.id===`draft:r${state.draftRevision}:builder`
      &&e.artifactRef===draft.builderVerdictRef);
    if(auditEntry){
      const audit=await readArtifact(auditEntry.artifactRef);
      if(audit.schema==='starcraft_tmg_army_builder_roster_verdict_v1'
        &&audit.candidateHash===state.scope.army&&audit.summary){
        inputs.currentArmyAuthority={source:'evidence',evidenceId:auditEntry.id,
          evidenceNumber:state.evidence.indexOf(auditEntry)+1,artifactRef:auditEntry.artifactRef,
          pointer:'/summary',status:'read',value:structuredClone(audit.summary)};
        inputs.currentArmyIdentity={source:'literal',value:{
          schema:'roster_current_formal_army_identity_v1',draftRevision:state.draftRevision,
          rosterRevision:draft.rosterRevision,candidateHash:audit.candidateHash,
          builderVerdictRef:auditEntry.artifactRef,
          instruction:'This Native summary belongs to the CURRENT submitted army, not an audited alternative. A candidate audit with another candidateHash is not adopted by citing it. Exact candidate adoption still requires structured mutation and Native recheck. Current legality and target spending are different; this grants no strategy acceptance.',
        }};
        // Keep Plan prose as historical intent where requested, but never make
        // the committed unit/upgrade configuration historical along with it.
        const configurationEntry=state.evidence.find(e=>e.id===`draft:r${state.draftRevision}:summary`);
        if(configurationEntry?.bindings?.army===audit.candidateHash){
          const configuration=await readArtifact(configurationEntry.artifactRef);
          if(isDeepStrictEqual(configuration.candidateInput,draft.candidateInput)){
            inputs.currentArmyConfiguration={source:'evidence',evidenceId:configurationEntry.id,
              evidenceNumber:state.evidence.indexOf(configurationEntry)+1,artifactRef:configurationEntry.artifactRef,
              pointer:'/candidateInput',status:'read',validity:'current',scopeUsage:'current_dependency',
              value:structuredClone(configuration.candidateInput)};
            inputs.currentArmyIdentity.value.configurationContractVersion=1;
            inputs.currentArmyIdentity.value.instruction+=' currentArmyConfiguration is the exact adopted configuration, including ALL unit upgrades and cards. It takes precedence over old Plan purposes and historical experiment arms for what is currently selected. Historical arms may still be valid counterfactuals, but must be labelled and related to this configuration explicitly; they are not the current army merely because a unit ID matches. This supplies identity, not a preferred strategy or approval of the comparison.';
          }
        }
      }
    }
  }
  if(inputs.proposedDesign||inputs.comparisonPurpose||inputs.previousDesign)
    inputs.comparisonObservationSources={source:'literal',value:await projectRosterComparisonObservationSourcesV1({
      inputs,state,readArtifact})};
  if(inputs.proposedDesign||inputs.comparisonPurpose||inputs.comparisonDesignGoal)
    inputs.comparisonStageOwnership={source:'literal',value:rosterComparisonStageOwnershipV1()};
  return inputs;
}

export async function projectRosterWorkflowDecisionEvidenceLineageV1({state,readArtifact}){
  const evidence=new Map(state.evidence.map((entry,index)=>[entry.id,{entry,number:index+1}]));
  const roots=[],queue=[];
  for(const event of state.events.filter(e=>e.type==='draft_committed'&&e.workId&&e.revision<=state.draftRevision)){
    const work=state.work.find(w=>w.id===event.workId),id=`role:${event.workId}`;
    if(work?.role!=='roster_workflow_strategy_decision')continue;
    roots.push({revision:event.revision,workId:work.id,evidenceNumber:evidence.get(id)?.number??null});queue.push(id);
  }
  const {entries,edges,unresolvedReferences}=await projectRosterEvidenceReferenceClosureV1({state,readArtifact,rootIds:queue});
  return {schema:'roster_workflow_decision_evidence_lineage_v1',draftRevision:state.draftRevision,roots,entries,edges,unresolvedReferences,
    directoryIsNotARead:true,acceptanceGranted:false,
    instruction:'These are exact saved citations reachable from ACTUALLY COMMITTED joint decisions, including source-view aliases to their originals. They are discovery metadata, not read bodies, source approval or measured conclusions. Read a necessary stable evidenceNumber and its actual conditions. Historical proposals differ from current Native facts. A blank Plan toolReceiptReferences array does not mean these sources are missing. Do not buy another experiment merely to recover a saved source.'};
}

// Only typed immutable references are graph edges. Shared by decision discovery
// and source review; neither prose numbers nor a model's verdict creates a fact.
export function rosterEvidenceOriginalReferenceV1(body,includeSourceFacts=false){
  if(body?.schema==='roster_workflow_receipt_view_v1')return {id:body.evidenceId,kind:'receipt_view_original'};
  if(includeSourceFacts&&body?.schema==='roster_experiment_source_facts_v1')return {
    id:body.sourceEvidenceId,artifactRef:body.sourceArtifactRef,kind:'source_facts_original'};
  return null;
}

export async function projectRosterEvidenceReferenceClosureV1({state,readArtifact,rootIds,excludedIds=[],includeSourceFacts=false}){
  const evidence=new Map(state.evidence.map((entry,index)=>[entry.id,{entry,number:index+1}]));
  const queue=[...rootIds],entries=[],edges=[],unresolvedReferences=[],seen=new Set(),excluded=new Set(excludedIds);
  const connect=(from,id,kind,ref)=>{
    const target=evidence.get(id);
    if(!target||ref?.artifactRef&&ref.artifactRef!==target.entry.artifactRef){
      unresolvedReferences.push({fromEvidenceNumber:from,sourceEvidenceId:id,reason:target?'reference_artifact_mismatch':'reference_not_published'});return;
    }
    if(excluded.has(id))return;
    edges.push({fromEvidenceNumber:from,toEvidenceNumber:target.number,kind});queue.push(id);
  };
  for(let cursor=0;cursor<queue.length;cursor++){
    const id=queue[cursor];if(seen.has(id)||excluded.has(id))continue;seen.add(id);
    const found=evidence.get(id);if(!found){unresolvedReferences.push({sourceEvidenceId:id,reason:'applied_decision_not_published'});continue;}
    const {entry,number}=found,body=await readArtifact(entry.artifactRef),value=body.value??body,receipt=value.receipt;
    entries.push({sourceEvidenceId:id,evidenceNumber:number,kind:entry.kind,
      validity:rosterWorkflowBindingsMatchV1(entry.bindings,state.scope)?'current':'historical',
      ...(value.operation?{operation:value.operation}:{}),...(value.status?{status:value.status}:{}),
      ...(receipt?.queryReceipt?.queryKind?{queryKind:receipt.queryReceipt.queryKind}:{}),
      ...(receipt?.nativeAction?{nativeActionType:receipt.nativeAction.actionType,pieceId:receipt.nativeAction.pieceId??null}:{}),
      ...(receipt?.queryReceipt?.result&&typeof receipt.queryReceipt.result==='object'
        ?{resultFields:Object.keys(receipt.queryReceipt.result)}:{}),
      read:{evidenceNumber:number,pointer:''}});
    const alias=rosterEvidenceOriginalReferenceV1(body,includeSourceFacts);
    if(alias)connect(number,alias.id,alias.kind,alias);
    // A tool's actual bound input is an immutable provenance edge too. The
    // wrapper result hash differs from the published raw receipt hash: verify
    // their bodies, not their opaque identifiers or a guessed branch name.
    if(id.startsWith('tool:')&&value.operation&&value.receipt)for(const binding of value.inputBindings??[]){
      if(typeof binding.sourceWorkId!=='string'||typeof binding.sourceResultRef!=='string')continue;
      const targetId='tool:'+binding.sourceWorkId,target=evidence.get(targetId);
      const reject=reason=>unresolvedReferences.push({fromEvidenceNumber:number,sourceEvidenceId:targetId,
        sourceResultRef:binding.sourceResultRef,reason});
      if(!target){reject('tool_input_source_not_published');continue;}
      let result;
      try{result=await readArtifact(binding.sourceResultRef);}catch(error){
        if(error.code==='ENOENT'){reject('tool_input_result_missing');continue;}throw error;
      }
      const published=await readArtifact(target.entry.artifactRef),actual=published?.kind&&published.value?published.value:published;
      if(result?.kind!=='tool_receipt'||!isDeepStrictEqual(result.value,actual)){
        reject('tool_input_result_mismatch');continue;
      }
      connect(number,targetId,'tool_input_binding');
    }
    const walk=node=>{
      if(!node||typeof node!=='object')return;
      for(const [key,child]of Object.entries(node)){
        if(key==='evidenceRefs'&&Array.isArray(child)){
          for(const ref of child)if(typeof ref?.id==='string')connect(number,ref.id,'saved_citation',ref);
        }else if(child&&typeof child==='object')walk(child);
      }
    };
    walk(value);
  }
  entries.sort((a,b)=>a.evidenceNumber-b.evidenceNumber);
  return {entries,edges,unresolvedReferences};
}
