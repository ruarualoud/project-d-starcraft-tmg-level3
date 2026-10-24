// One choice-result contract for discovery, dispatch and completed-result
// resolution. A Native menu is not an answer and never chooses for the model.
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';
const clone=v=>structuredClone(v);
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
