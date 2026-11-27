// Observing a selected state's menu is a deterministic read. It must not be
// confused with a strategic action/formation choice, or sent as a false menu.
import {rosterWorkflowChoiceContractV1} from '../roster-strategist/roster-workflow-graph-v1.mjs';
import {projectRosterDelegatedNativeChoiceScopeV1} from '../roster-strategist/roster-comparison-observation-v1.mjs';
export function createRosterWorkflowChoiceObservationV1({work,choice}) {
  const id=`${work.id}:observed-choice`,observations=[];
  const choiceContract=rosterWorkflowChoiceContractV1({state:{work:[work,{id,choiceOf:work.id}]},workId:id});
  const rangedChoice=choice.reason==='native_domain_choice_required';
  const sourceReads=choice.sourceReads.map((source,index)=>{
    if(!source.requiresInspect)return source;
    const observationId=`${id}:source-menu${index}`;
    observations.push({id:observationId,role:'roster_workflow_tool',bindings:work.bindings,
      inputs:{request:{source:'literal',value:{operation:'inspect',args:{},
        purpose:'Observe the action menu of the exact model-selected state before a new model choice',
        publicReason:'Read-only observation; no action, target, position, dice or strategy selected by Host',
        scenarioAssumptions:choice.question.scenarioAssumptions??[],
        bindings:[{name:'selectedState',pointer:'/stateRef'}],guards:[],resultGuards:[]}},
        selectedState:{source:'work',id:source.sourceWorkId,pointer:'/value/stateRef'}}});
    return {...source,sourceWorkId:observationId,sourceOperation:'inspect',menuPointer:'/receipt/actionSpace',
      requiresInspect:false,observedFromWorkId:source.sourceWorkId};
  });
  const inputs={task:{source:'literal',value:{question:choice.question,unconfirmedProposal:choice.unconfirmedProposal,
    choiceContract,
    sourceReadContract:sourceReads,
    instruction:rangedChoice
      ?'This is a NORMAL weapon-choice point on the SAME saved state, not a geometry failure. The actual probability receipt already contains availableRangedDomains. Read that receipt, choose an exact domainId for the intended weapon and keep attackerUnitId, targetUnitId and the same stateRef in a probability request. You may explicitly compare multiple weapons with separate queries; Host never picks or adds their damage. No inspect, formation rebuild, action, phase change or dice is needed to resolve this missing choice. If the original comparison requires a different scene, return that explicit methodological change to its owner instead of silently moving participants. Set completionStepId only on the conditional estimate answering the original question; the menu itself is not a damage estimate.'
      :'This is a NORMAL choice point, not input-error repair. Host has only inspected the exact predecessor state; no proposed action/formation has executed. The supplied inspect receipt is the actual menu, including when it has zero matching actions. Read its real entries and select the intended action/formation by saved evidence number and exact match. A formation receipt is geometry, NOT an action menu or arrival history. If the intended action is absent, inspect the correct original parent or explain the unmet premise; do not reread geometry looking for a menu it cannot contain. A source with requiresFormationQuery=true still needs an explicit model-specified spatial query. Keep the assumptions, but follow choiceContract: completionStepId is the pending operation, NOT the parent purpose. Downstream queries already belong to that parent. Do not replay completed queries.'}}};
  // A needs_model_choice work can later be resolved by a different receipt.
  // Publish this immutable menu under its own identity, not the future result ID.
  const evidencePublications=rangedChoice?[{
    id:`choice-source:${work.id}:${work.resultRef}`,sourceWorkId:work.id,resultRef:work.resultRef,
    title:'Native ranged weapon alternatives; estimate still unanswered',
  }]:[];
  sourceReads.forEach((source,index)=>{inputs[`observedSource${index}`]={source:'evidence',
    id:rangedChoice?evidencePublications[0].id:`tool-view:${source.sourceWorkId}`,
    pointer:source.requiresFormationQuery?source.menuPointer:''};});
  const pending=work.inputs?.request?.value;
  if(choice.operation==='native_action'&&choice.unconfirmedProposal?.selection&&pending?.experimentScope
    &&!pending.guards?.length&&!pending.resultGuards?.length){
    inputs.nativeChoiceTemplate={source:'literal',value:{orderId:'observed-native-choice',purpose:pending.purpose,
      scenarioAssumptions:structuredClone(pending.scenarioAssumptions??[]),
      experimentScope:projectRosterDelegatedNativeChoiceScopeV1(pending.experimentScope,choiceContract.delegatedComparison),
      steps:[{stepId:'selected-native-action',operation:'native_action',argumentsJson:JSON.stringify(choice.unconfirmedProposal),
        bindings:[],guards:[],publicReason:pending.publicReason}],completionStepId:'selected-native-action',
      stopAndReturnToModelWhen:pending.stopAndReturnToModelWhen}};
  }
  return {id,observations,evidencePublications,inputs,observationContractVersion:rangedChoice?4:3};
}
