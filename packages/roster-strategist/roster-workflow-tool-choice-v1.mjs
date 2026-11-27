// One choice-result contract for discovery, dispatch and completed-result
// resolution. A Native menu is not an answer and never chooses for the model.
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const clone=v=>structuredClone(v);
// Zero selectable options is a tool prerequisite failure, not a strategic
// choice requiring the model to restate/cite an empty menu. Return the saved
// experiment to its owner; do not choose new anchors or claim infeasibility.
export async function projectRosterEmptyFormationChoiceV1({state,workId,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),work=graph.get(workId);
  if(work?.role!=='roster_workflow_tool'||work.status!=='needs_model_choice'
    ||work.branchReturnRef||!graph.isFresh(workId)||!work.resultRef
    ||work.inputs?.request?.value?.operation!=='formation_scene'
    ||graph.descendants(workId).some(w=>w.status==='running'||w.operationState?.pending))return null;
  const pending=await readArtifact(work.resultRef),choice=projectRosterWorkflowToolChoiceV1(pending?.value);
  if(choice?.operation!=='formation_scene'||choice.executed!==false)return null;
  for(const ref of choice.sourceReads??[]){
    const source=graph.get(ref.sourceWorkId);
    if(ref.sourceOperation!=='spatial'||ref.requiresFormationQuery||source?.status!=='evidence_ready'
      ||source.operationState?.pending||!graph.isFresh(source.id)||source.resultRef!==ref.sourceResultRef)continue;
    const result=await readArtifact(source.resultRef),value=result?.value,receipt=value?.receipt;
    const entry=state.evidence.find(e=>e.id===`tool:${source.id}`&&e.availability==='available'
      &&Object.entries(e.bindings??{}).every(([key,v])=>state.scope[key]===v));
    if(!entry||result.kind!=='tool_receipt'||result.continuation===true||value?.status!=='completed'
      ||value.operation!=='spatial'||receipt?.resultStatus!=='ok'
      ||receipt.queryKind!=='space.solve_static_formation'
      ||!ref.stateRef||receipt.baseStateHash!==ref.stateRef.stateHash
      ||!isDeepStrictEqual(projectRosterWorkflowStateReferenceV1(value),ref.stateRef))continue;
    const registered=await readArtifact(entry.artifactRef);
    if(!isDeepStrictEqual(registered,value))continue;
    const native=receipt.queryReceipt?.result;
    if(native?.optionCount!==0||!Array.isArray(native.formationOptions)||native.formationOptions.length!==0)continue;
    return {kind:'empty_static_formation_options',workId,sourceWorkId:source.id,
      sourceResultRef:source.resultRef,sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,
      sourcePointer:'/receipt/queryReceipt/result',optionCount:0,
      noLegalFormationProven:native.noLegalFormationProven,search:clone(native.search??null),
      stateRef:clone(ref.stateRef),originalQuestion:clone(choice.question),
      instruction:'The exact saved static solver returned no selectable option. Return this method to its author with the original question, query parameters and search diagnostics. No new placement, query, strategic choice or impossibility claim is authorized. Static geometry never proves deployment, arrival, threat exposure with absent participants, or future scoring. The author must choose a supported revised method; zero candidates is not zero strategic benefit.'};
  }
  return null;
}
export function projectRosterWorkflowToolChoiceV1(value){
  if(value?.operation==='probability'&&value.receipt?.unknownReason==='CURRENT_ACTION_QUERY_DOMAIN_AMBIGUOUS'
    &&value.receipt.availableRangedDomains?.length>1&&value.request?.queryId){
    return {operation:'probability',status:'awaiting_model_choice',reason:'native_domain_choice_required',
      question:{purpose:value.experimentOrigin?.question??'Complete the requested conditional ranged estimate.',
        scenarioAssumptions:value.experimentOrigin?.scenarioAssumptions??[]},
      unconfirmedProposal:clone(value.submittedArguments??value.request),
      availableChoices:clone(value.receipt.availableRangedDomains),
      sourceReads:[{sourceWorkId:value.request.queryId,sourceOperation:'probability',
        choiceKind:'ranged_domain',menuPointer:'/receipt/availableRangedDomains',
        stateRef:projectRosterWorkflowStateReferenceV1(value),requiresInspect:false}],
      choiceIsCombatResult:false,hostSelectsWeapon:false};
  }
  if(value?.status!=='awaiting_model_choice'||value.reason!=='unobserved_choice_result')return null;
  return {...clone(value),sourceReads:value.sourceReads.map(source=>{
    if(source.choiceKind==='native_formation'&&source.sourceOperation!=='spatial')
      return {...source,menuPointer:source.stateRef?'/stateRef':'',requiresFormationQuery:true};
    if((value.operation==='native_action'&&source.choiceKind!=='native_formation'||source.choiceKind==='action_domain')&&source.sourceOperation!=='inspect')
      return {...source,menuPointer:'/stateRef',requiresInspect:true};
    if(value.operation==='formation_scene'&&source.sourceOperation!=='spatial')
      return {...source,menuPointer:source.stateRef?'/stateRef':'',requiresFormationQuery:true};
    return clone(source);
  })};
}
