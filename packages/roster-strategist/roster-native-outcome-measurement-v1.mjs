// Read exact Native transition events. This module does not calculate Rules,
// choose a position/die/casualty, replay an action, or infer a charge probability.
const metric=(valueType,unit,aggregation,endpoint)=>Object.freeze({valueType,unit,aggregation,endpoint,
  sourceOperations:['native_action'],supportedInference:'difference_of_conditional_native_outcomes',
  observationDomain:valueType==='boolean'
    ?{id:'single_target_charge_resolution',terminalBranches:['charge_succeeded','charge_failed'],
      description:'Resolve one declared charge; Native decides success or failure. No outcome is preselected.'}
    :{id:'single_native_impact_settlement',terminalBranches:['impact_settled'],
      description:'Settle one actually triggered IMPACT. Does not cover a charge that failed or triggered no IMPACT.'},
  availability:valueType==='boolean'
    ?{requires:'One resolved single-target charge event',covers:['charge_succeeded','charge_failed'],computedBy:'Native, not authored success/failure'}
    :{requires:'One settled impact_damage event for the selected target',
      absentWhen:['charge failed and did not trigger IMPACT','IMPACT not triggered','defender casualty choice still pending'],
      absentMeans:'unmeasured, never zero',coversFailedChargeAsZero:false}});
export const ROSTER_NATIVE_OUTCOME_METRICS_V1=Object.freeze({
  chargeSucceeded:metric('boolean','boolean','single_target_charge_resolution',
    'Explicit Native success/failure for a resolved charge with exactly one declared enemy unit. Not success against an individually selected member of a multi-target charge.'),
  resolvedImpactCasualties:metric('number','models','single_native_impact_settlement',
    'Removed model IDs in one settled IMPACT event for the selected target. Triggered IMPACT or pending defender casualty selection is not settlement.'),
  resolvedImpactSupplyLoss:metric('number','supply','single_native_impact_settlement',
    'Native currentSupplyBefore minus currentSupplyAfter in that settled IMPACT event; never derive Supply from model count.'),
  resolvedImpactSupplyAfter:metric('number','supply','single_native_impact_settlement',
    'Native currentSupplyAfter in that settled IMPACT event.'),
});
const text=value=>typeof value==='string'&&value.length>0;
const unresolved=(reason,status='source_unresolved')=>({status,reason});

export function extractRosterNativeOutcomeMeasurementV1({receipt,selector,metric}){
  const definition=ROSTER_NATIVE_OUTCOME_METRICS_V1[metric];
  if(!definition||receipt?.branchKind!=='native_action'||receipt.nativeTransitionsApplied!==1
    ||!Array.isArray(receipt.nativeEvents)||!Array.isArray(receipt.stateChanges)
    ||!text(receipt.parentStateHash)||receipt.parentStateHash!==receipt.baseStateHash
    ||!text(receipt.branchStateHash))return unresolved('not_a_saved_native_transition');
  const action=receipt.nativeAction,inner=action?.sourceAction??action;
  if(!inner||inner.actionType!==action.actionType)return unresolved('native_action_identity_mismatch','invalid_input');
  const rows=receipt.nativeEvents.map((event,index)=>({event,index}));
  let value,pointer,fields,extra={},selected;
  if(metric==='chargeSucceeded'){
    if(action.actionType!=='resolve_charge'||inner.pieceId!==selector.attackerUnitId
      ||action.pieceId!==inner.pieceId||selector.weaponName)
      return unresolved('charge_resolution_identity_mismatch','invalid_input');
    const candidates=rows.filter(({event})=>['charge_succeeded','charge_failed'].includes(event.type)
      &&event.pieceId===selector.attackerUnitId);
    if(candidates.length!==1)return unresolved(candidates.length?'ambiguous_native_charge_event':'charge_not_resolved');
    selected=candidates[0];const event=selected.event,plan=inner.chargeResolutionPlan;
    if(event.declaredTargetUnitIds?.length!==1||event.declaredTargetUnitIds[0]!==selector.targetUnitId
      ||plan?.declaredTargetUnitIds?.length!==1||plan.declaredTargetUnitIds[0]!==selector.targetUnitId)
      return unresolved('single_target_charge_required','invalid_input');
    value=event.type==='charge_succeeded';
    if(plan.outcome!==(value?'success':'failure')||event.modelPositionsChanged!==value
      ||!text(event.chargeResolutionPlanHash)||event.chargeResolutionPlanHash!==plan.chargeResolutionPlanHash)
      return unresolved('native_charge_event_plan_mismatch','invalid_input');
    pointer=`/receipt/nativeEvents/${selected.index}/type`;
    fields=[pointer,`/receipt/nativeEvents/${selected.index}/declaredTargetUnitIds`];
    extra={declaredTargetUnitIds:structuredClone(event.declaredTargetUnitIds),
      impactSettlementIncluded:false};
  }else{
    // A defender-owned casualty choice retains the original actionType while
    // pieceId names the defender; attackerPieceId identifies the attacking unit.
    const actor=inner.resolutionStage==='defender_casualty_selection'?inner.attackerPieceId:inner.pieceId;
    if(action.actionType!=='resolve_impact'||actor!==selector.attackerUnitId
      ||selector.weaponName&&selector.weaponName!=='IMPACT')
      return unresolved('impact_settlement_identity_mismatch','invalid_input');
    const candidates=rows.filter(({event})=>event.type==='impact_damage'
      &&event.pieceId===selector.attackerUnitId&&event.targetId===selector.targetUnitId);
    if(candidates.length!==1)return unresolved(candidates.length?'ambiguous_native_impact_event':'impact_not_settled');
    selected=candidates[0];const event=selected.event,ids=event.casualtyModelIds;
    if(!Array.isArray(ids)||ids.some(id=>!text(id))||new Set(ids).size!==ids.length
      ||![event.currentSupplyBefore,event.currentSupplyAfter].every(n=>Number.isFinite(n)&&n>=0)
      ||event.weaponName!=='IMPACT')return unresolved('native_impact_event_incomplete','invalid_input');
    const changes=receipt.stateChanges.filter(change=>change.key==='pieces');
    if(changes.length>1)return unresolved('ambiguous_native_piece_change','invalid_input');
    if(changes.length){
      const change=changes[0],targets=Array.isArray(change.value)?change.value.filter(p=>p.id===selector.targetUnitId):[];
      if(change.operation!=='set'||targets.length!==1||targets[0].currentSupply!==event.currentSupplyAfter
        ||ids.some(id=>!targets[0].destroyedModelIds?.includes(id)))
        return unresolved('native_impact_poststate_mismatch','invalid_input');
    }else if(ids.length||event.currentSupplyBefore!==event.currentSupplyAfter)
      return unresolved('native_impact_poststate_missing','invalid_input');
    const root=`/receipt/nativeEvents/${selected.index}`;
    if(metric==='resolvedImpactCasualties'){value=ids.length;pointer=root+'/casualtyModelIds';fields=[pointer];}
    else if(metric==='resolvedImpactSupplyLoss'){
      value=event.currentSupplyBefore-event.currentSupplyAfter;pointer=root;
      fields=[root+'/currentSupplyBefore',root+'/currentSupplyAfter'];
    }else{value=event.currentSupplyAfter;pointer=root+'/currentSupplyAfter';fields=[pointer];}
    extra={casualtyModelIds:structuredClone(ids),currentSupplyBefore:event.currentSupplyBefore,
      currentSupplyAfter:event.currentSupplyAfter,weaponName:'IMPACT'};
  }
  return {status:'observed',value,unit:definition.unit,valueType:definition.valueType,
    aggregation:definition.aggregation,endpoint:definition.endpoint,pointer,sourceFields:fields,
    attackerUnitId:selector.attackerUnitId,targetUnitId:selector.targetUnitId,weaponName:null,...extra,
    nativeEventType:selected.event.type,parentStateHash:receipt.parentStateHash,
    branchStateHash:receipt.branchStateHash,conditionalOnParent:true,
    conditionalOnOutcome:receipt.conditionalOnOutcome===true,
    nativeOutcomeAssumption:structuredClone(receipt.nativeOutcomeAssumption??null),
    outcomeProbability:null,probabilityClaimed:false,sampleCount:null,
    observationScope:'conditional_native_transition_not_expected_value_or_full_charge_sequence',
    trainingTruth:false,realMatchHistory:false};
}
