import {isDeepStrictEqual} from 'node:util';
import {rosterControlledComparisonParticipantsV1} from './roster-comparison-observation-v1.mjs';
import {resolveRosterParticipantConfigurationsV1,rosterParticipantSelectionsEqualV1} from './roster-participant-configuration-v1.mjs';
const clone=structuredClone;
// Only an unissued METHOD with the exact union of the already-authored arms.
// This grants no change to the comparison design, selected units or measurements.
export function rosterMethodPartitionContextV1(request,order){
 const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 const error=assignment?.inputs?.task?.value?.error,purpose=assignment?.inputs?.comparisonPurpose;
 const binding=order?.experimentScope?.comparisonBinding;
 if(error?.dispatchOutcome!=='not_dispatched'||error.code!=='ROSTER_COMPARISON_BINDING_INVALID'
   ||error.detail?.reason!=='purpose_participant_configuration_mismatch'
   ||binding?.arm!=='shared'||purpose?.status!=='read'
   ||purpose.evidenceNumber!==binding.purposeEvidenceNumber
   ||request.promptNodes.some(n=>n.kind==='pending_operation_choice_contract'))return null;
 try{
  const current=rosterControlledComparisonParticipantsV1(purpose.value,'current');
  const alternative=rosterControlledComparisonParticipantsV1(purpose.value,'alternative');
  const union=new Map();
  for(const u of [...current,...alternative]){
   if(union.has(u.unitInstanceId)&&!rosterParticipantSelectionsEqualV1(union.get(u.unitInstanceId),u))return null;
   union.set(u.unitInstanceId,u);
  }
  const actual=resolveRosterParticipantConfigurationsV1(order.experimentScope);
  if(actual.length!==union.size||actual.some(u=>!union.has(u.unitInstanceId)||!rosterParticipantSelectionsEqualV1(u,union.get(u.unitInstanceId))))return null;
  if(!isDeepStrictEqual([...(order.experimentScope.participantUnitIds??[])].sort(),[...union.keys()].sort()))return null;
  return {purposeEvidenceNumber:binding.purposeEvidenceNumber,
    savedObservationPairOnly:order.steps.length>0&&order.steps.every(step=>step.operation==='compare_observations'),arms:{current,alternative,
    shared:rosterControlledComparisonParticipantsV1(purpose.value,'shared')}};
 }catch{return null;}
}
export function partitionRosterUnexecutedMethodV1({request,original,order,partitions}){
 const reject=reason=>{throw Object.assign(Error('WORK_ORDER_PARTITION_INVALID'),{code:'work_order_partition_invalid',detail:{reason}});};
 const context=rosterMethodPartitionContextV1(request,original);
 if(!context)reject('partition_permission_unavailable');
 if(!Array.isArray(partitions)||partitions.length<2||partitions.length>3)reject('two_arms_required');
 const arms=partitions.map(p=>p.arm);
 if(new Set(arms).size!==arms.length||!arms.includes('current')||!arms.includes('alternative')
   ||arms.some(a=>!['current','alternative','shared'].includes(a)))reject('two_arms_required');
 const ids=order.steps.map(s=>s.stepId),partitioned=partitions.flatMap(p=>p.stepIds);
 if(!isDeepStrictEqual(partitioned,ids)||new Set(partitioned).size!==ids.length)reject('all_retained_steps_once_in_declared_order');
 // Older repair prompts required current/alternative groups even when the only
 // work was shared arithmetic. Empty groups claim no work or observation. Keep
 // the author's one shared comparison and its original two-arm participants.
 const active=partitions.filter(p=>p.stepIds.length);
 if(context.savedObservationPairOnly&&order.steps.every(s=>s.operation==='compare_observations')
   &&active.length===1&&active[0].arm==='shared'
   &&partitions.filter(p=>!p.stepIds.length).every(p=>p.observationStepIds.length===0&&!p.completionStepId)){
   const p=active[0];
   if(!['prerequisite','baseline','effect_endpoint'].includes(p.stage)
     ||new Set(p.observationStepIds).size!==p.observationStepIds.length
     ||p.observationStepIds.some(id=>!ids.includes(id))||p.completionStepId&&!ids.includes(p.completionStepId))
     reject('partition_step_reference_invalid');
   const result=clone(order);result.completionStepId=p.completionStepId;
   result.experimentScope.comparisonBinding={...result.experimentScope.comparisonBinding,
     arm:'shared',stage:p.stage,observationStepIds:clone(p.observationStepIds)};
   return {orders:[result],projection:{rule:'empty_comparison_partition_placeholders_v1',
     sourceOrderId:original.orderId,partitions:clone(partitions),designChanged:false,
     allRetainedStepsAccountedFor:true,compilerValidationRequired:true,nativeExecuted:false}};
 }
 return {orders:partitions.map(p=>{
  if(!p.stepIds.length||!['prerequisite','baseline','effect_endpoint'].includes(p.stage)
    ||new Set(p.observationStepIds).size!==p.observationStepIds.length
    ||p.observationStepIds.some(id=>!p.stepIds.includes(id))
    ||p.completionStepId&&!p.stepIds.includes(p.completionStepId))reject('partition_step_reference_invalid');
  const result=clone(order),selected=new Set(p.stepIds);
  result.orderId=order.orderId+':arm:'+p.arm;
  result.steps=order.steps.filter(s=>selected.has(s.stepId));
  result.completionStepId=p.completionStepId;
  result.experimentScope.participantConfigurations=clone(context.arms[p.arm]);
  result.experimentScope.participantUnitIds=context.arms[p.arm].map(u=>u.unitInstanceId);
  result.experimentScope.comparisonBinding={...clone(order.experimentScope.comparisonBinding),
    arm:p.arm,stage:p.stage,observationStepIds:clone(p.observationStepIds)};
  return result;
 }),projection:{rule:'explicit_unexecuted_method_partition_v1',sourceOrderId:original.orderId,
   purposeEvidenceNumber:context.purposeEvidenceNumber,partitions:clone(partitions),
   participantSource:'same_read_design_by_selected_arm',allRetainedStepsAccountedFor:true,
   designChanged:false,compilerValidationRequired:true,nativeExecuted:false}};
}
