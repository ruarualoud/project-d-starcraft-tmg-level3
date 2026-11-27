// Distinct from single-attack metrics: never relabel one weapon or sum several
// independent attack estimates into a complete declared activation observation.
const metric=(field,unit,rawMeaning)=>Object.freeze({field,unit,rawMeaning,valueType:'number',
  aggregation:'single_unit_declared_ranged_sequence',sourceOperations:['spatial'],
  sourceQueryKinds:{spatial:['ranged_activation_probability']},
  observationDomain:{id:'declared_ranged_activation_estimate',terminalBranches:['complete_sequence_distribution'],
    description:'One explicit ranged sequence/policy, conditional on source state; no optional reactions or after-action abilities.'},
  supportedInference:'difference_of_observed_point_estimates'});
export const ROSTER_RANGED_ACTIVATION_METRICS_V1=Object.freeze({
  expectedActivationIncomingDamage:metric('incomingDamageIncludingOverflow','damage','incoming damage, including overflow, to the selected target across the declared ranged sequence'),
  expectedActivationCasualties:metric('casualties','models','models removed from the selected target across the declared ranged sequence'),
  expectedActivationSupplyLoss:metric('supplyLost','supply','Supply lost by the selected target across the declared ranged sequence'),
});

function readCompletedRangedActivation(body) {
  const query=body.receipt?.queryReceipt,result=query?.result;
  if(body.operation!=='spatial'||body.receipt?.queryKind!=='ranged_activation_probability'
    ||query?.queryKind!=='ranged_activation_probability'||query.status!=='advisory_estimate'
    ||result?.schema!=='starcraft_tmg_ranged_activation_probability_v1')
    return {status:'unsupported',reason:'not_a_declared_ranged_activation_observation'};
  if(result.status!=='complete'||!result.estimates||result.failures?.length!==0
    ||!Array.isArray(result.samples)||!result.samples.length
    ||result.samples.length!==result.distribution?.requestedSamples
    ||result.distribution.completedSamples!==result.samples.length
    ||result.samples.some(s=>s.status!=='complete'))
    return {status:'source_unresolved',reason:'ranged_activation_distribution_incomplete'};
  return {status:'observed',result};
}

function matchesSingleTarget(result,{attackerUnitId,targetUnitId,weaponName}){
  const steps=result.policy?.steps;
  return typeof attackerUnitId==='string'&&Boolean(attackerUnitId.trim())&&result.pieceId===attackerUnitId
    &&typeof targetUnitId==='string'&&Boolean(targetUnitId.trim())&&!weaponName
    &&Array.isArray(steps)&&steps.length>0&&steps.every(s=>s?.parameters?.targetUnitId===targetUnitId);
}

function readEstimate(result,definition){
  const estimate=result.estimates[definition.field];
  if(!estimate||!Number.isFinite(estimate.mean)
    ||(estimate.standardError!==null&&(!Number.isFinite(estimate.standardError)||estimate.standardError<0)))return null;
  return estimate;
}

export function projectRosterRangedActivationPolicyV1(policy){
  const steps=policy?.steps;
  if(!Array.isArray(steps)||!steps.length
    ||!steps.every(step=>typeof step?.profileKey==='string'&&step.profileKey.trim()))return null;
  return {orderedProfileKeys:steps.map(step=>step.profileKey),precisionPolicy:policy.precisionPolicy??null,
    reactionPolicy:policy.reactionPolicy??null,casualtyPolicyKind:policy.casualtyPolicy?.kind??null,
    finishPolicy:policy.finishPolicy??null};
}

export function projectRosterRangedActivationExperienceV1(body){
  if(body.receipt?.resultStatus!=='ok')return null;
  const observation=readCompletedRangedActivation(body);
  if(observation.status!=='observed')return null;
  const {result}=observation,participants={attackerUnitId:result.pieceId,
    targetUnitId:result.policy?.steps?.[0]?.parameters?.targetUnitId};
  const policy=projectRosterRangedActivationPolicyV1(result.policy);
  if(!policy||!matchesSingleTarget(result,participants))return null;
  const metricValues={};
  for(const [id,definition] of Object.entries(ROSTER_RANGED_ACTIVATION_METRICS_V1)){
    const estimate=readEstimate(result,definition);
    if(estimate)metricValues[id]=estimate.mean;
  }
  return {participants,metricValues,metricSourcePointer:'/value/receipt/queryReceipt/result/estimates',
    rangedActivation:{...policy,sampleCount:result.samples.length,scope:structuredClone(result.scope)}};
}

export function extractRosterRangedActivationMeasurementV1({body,selector,metric:id}) {
  const definition=ROSTER_RANGED_ACTIVATION_METRICS_V1[id],observation=readCompletedRangedActivation(body);
  if(observation.status!=='observed')return observation;
  const {result}=observation;
  if(!matchesSingleTarget(result,selector))
    return {status:'invalid_input',reason:'activation_subject_or_single_target_scope_mismatch'};
  const estimate=readEstimate(result,definition);
  if(!estimate)return {status:'source_unresolved',reason:'activation_metric_not_measured'};
  return {status:'observed',value:estimate.mean,unit:definition.unit,
    standardError:estimate.standardError,sampleCount:result.samples.length,
    distribution:structuredClone(result.distribution),declaredPolicy:structuredClone(result.policy),
    scope:structuredClone(result.scope),sourceStateHash:result.sourceStateHash,
    attackerUnitId:result.pieceId,targetUnitId:selector.targetUnitId,weaponName:null,
    pointer:`/receipt/queryReceipt/result/estimates/${definition.field}/mean`};
}
