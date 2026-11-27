// Bounded, explicit ranged-activation policy evaluation. This is not a planner,
// an optimal weapon/casualty selector, or an alternative combat rules engine.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {
  OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND,
  OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,
  createOfficialSelectedRosterRangedQueryBatchV1,
  enumerateOfficialSelectedRosterRangedActionsV1,
  applyOfficialSelectedRosterRangedCasualtyParametersV1,
  resumeOfficialSelectedRosterRangedDamageReactionV1,
  finishOfficialSelectedRosterRangedSequenceV1,
  resolveOfficialCurrentProductCasualtyDomainV1,
  currentOfficialSelectedRosterRangedSequenceV1,
} from '../product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {createOfficialReactionFamilyAdapterV1} from '../product-composition/official-reaction-family-adapter-v1.mjs';
import {assertRangedActivationSequenceV1,normalizeRangedActivationQueryArgumentsV1} from './ranged-activation-query-contract-v1.mjs';

export const RANGED_ACTIVATION_PROBABILITY_VERSION='1.1.0';
const fail=(code,detail)=>{throw Object.assign(new TypeError(code),{code,detail});};
const active=m=>m.isDestroyed!==true&&m.isOnField!==false;
const clone=v=>structuredClone(v);

function validate(input) {
  if(!input?.state||typeof input.pieceId!=='string'||!['player1','player2'].includes(input.sideKey))
    fail('RANGED_ACTIVATION_SOURCE_REQUIRED');
  if(!Number.isSafeInteger(input.sampleCount)||input.sampleCount<1||input.sampleCount>1296)
    fail('RANGED_ACTIVATION_SAMPLE_COUNT_INVALID',{minimum:1,maximum:1296,noSilentClamp:true});
  if(typeof input.seed!=='string'||!input.seed)fail('RANGED_ACTIVATION_SEED_REQUIRED');
  if(!['maximize_hits','decline'].includes(input.precisionPolicy)
    ||input.reactionPolicy!=='pass_all_optional'||!['finish_after_list','finish_after_list_or_lost_target'].includes(input.finishPolicy))
    fail('RANGED_ACTIVATION_EXPLICIT_POLICIES_REQUIRED');
  assertRangedActivationSequenceV1(input.steps);
  const state=input.state,attacker=state.pieces?.find(p=>p.id===input.pieceId);
  if(attacker?.sideKey!==input.sideKey||state.phase!=='assault'
    ||currentOfficialSelectedRosterRangedSequenceV1(state)||state.pendingCurrentProductRangedCasualtyChoice
    ||state.pendingCurrentProductRangedDamageReaction||state.pendingOfficialReactionWindow)
    fail('RANGED_ACTIVATION_FRESH_SINGLE_ACTIVATION_REQUIRED');
  if(input.casualtyPolicy?.kind!=='ordered_model_ids')fail('RANGED_ACTIVATION_CASUALTY_POLICY_REQUIRED');
  for(const id of new Set(input.steps.map(s=>s.parameters.targetUnitId))) {
    const target=state.pieces.find(p=>p.id===id),order=input.casualtyPolicy.byTarget?.[id];
    if(!target||target.sideKey===input.sideKey||!Array.isArray(order)
      ||new Set(order).size!==order.length||order.some(m=>!target.models.some(x=>x.id===m))
      ||target.models.filter(active).some(m=>!order.includes(m.id)))
      fail('RANGED_ACTIVATION_COMPLETE_TARGET_CASUALTY_ORDER_REQUIRED',id);
  }
}

// Counter-based, deterministic pseudorandom uniform dice. No live random draw,
// no selected lucky roll, no claim of exact distribution. Rejection removes the
// modulo bias of uint32 -> d6. Each sample/step has an independent stable stream.
function dice(seed,sample,step,count) {
  const rows=[];let block=0;
  while(rows.length<count) {
    const bytes=hash({kind:'ranged_activation_d6_v1',seed,sample,step,block:block++});
    for(let i=0;i<64&&rows.length<count;i+=8) {
      const value=Number.parseInt(bytes.slice(i,i+8),16);
      if(value<4294967292)rows.push(value%6+1);
    }
  }
  return rows;
}

function casualtyIds(domain,order) {
  const rank=new Map(order.map((id,index)=>[id,index]));
  // Honor the declared removal preference within the Native legal choices. This
  // is a conditional defender policy, never a tactical optimality assertion.
  if(domain.legalSelections.length) {
    const selections=[...domain.legalSelections].sort((a,b)=>{
      for(let i=0;i<a.casualtyModelIds.length;i++) {
        const difference=rank.get(a.casualtyModelIds[i])-rank.get(b.casualtyModelIds[i]);
        if(difference)return difference;
      }
      return 0;
    });
    return clone(selections[0].casualtyModelIds);
  }
  const contract=domain.selectionContract;
  if(contract?.orderedRemovalRequired)fail('RANGED_ACTIVATION_COMPACT_ENGAGED_CASUALTY_POLICY_UNSUPPORTED');
  const ids=order.filter(id=>contract?.candidateModelIds.includes(id)).slice(0,domain.casualtyCount);
  resolveOfficialCurrentProductCasualtyDomainV1(domain,'',ids); // exact Native validation
  return ids;
}

function settleDeclaredPolicy(result,input) {
  let current=result.state;const events=[...result.events];
  if(current.pendingOfficialReactionWindow) {
    const adapter=createOfficialReactionFamilyAdapterV1(current.officialReactionFamilySourceBundle);
    // Actual finite priority window, not a guessed opponent response. Passing is
    // explicit in the requested baseline; other reaction policies are not exposed.
    const seen=new Set();
    while(current.pendingOfficialReactionWindow) {
      const window=current.pendingOfficialReactionWindow;
      const key=hash(window);if(seen.has(key))fail('RANGED_ACTIVATION_REACTION_NO_PROGRESS');seen.add(key);
      const sideKey=window.prioritySideKeys[window.priorityIndex];
      const domain=adapter.legalSpace(current,{sideKey}).parameterDomains.find(d=>d.actionType==='pass_reaction_family_window');
      if(!domain)fail('RANGED_ACTIVATION_REACTION_PASS_UNAVAILABLE');
      const next=adapter.apply(current,{action:adapter.preview(current,{domain,parameters:{}}).action});
      current=next.state;events.push(...next.events);
    }
  }
  if(current.pendingCurrentProductRangedDamageReaction) {
    const next=resumeOfficialSelectedRosterRangedDamageReactionV1(current);
    if(!next)fail('RANGED_ACTIVATION_DAMAGE_REACTION_NOT_RESUMED');
    current=next.state;events.push(...next.events);
  }
  if(current.pendingCurrentProductRangedCasualtyChoice) {
    const pending=current.pendingCurrentProductRangedCasualtyChoice;
    const ids=casualtyIds(pending.casualtyDomain,input.casualtyPolicy.byTarget[pending.targetPieceId]);
    const selection=pending.casualtyDomain.legalSelections.find(s=>JSON.stringify(s.casualtyModelIds)===JSON.stringify(ids));
    const parameters=pending.casualtyDomain.selectionMode==='explicit_model_ids'?{casualtyModelIds:ids}
      :{casualtySelectionHash:selection?.selectionHash};
    const next=applyOfficialSelectedRosterRangedCasualtyParametersV1(current,parameters);
    current=next.state;events.push(...next.events);
  }
  return {state:current,events};
}

function summarize(values) {
  const mean=values.reduce((s,v)=>s+v,0)/values.length;
  const variance=values.length>1?values.reduce((s,v)=>s+(v-mean)**2,0)/(values.length-1):null;
  return {mean,standardError:variance===null?null:Math.sqrt(variance/values.length),
    observedMinimum:Math.min(...values),observedMaximum:Math.max(...values)};
}

// Preserve facts from the exact failing state. This does not choose another
// target, skip a weapon, or convert an incomplete sample into an observation.
function unavailableProfileContext(state,input,index,sourceStateHash) {
  const selected=input.steps[index],target=state.pieces.find(p=>p.id===selected.parameters.targetUnitId);
  const context={version:1,sourceStateHash,stateHash:hash(state),index,
    round:state.round,phase:state.phase,activeSideKey:state.activeSideKey,
    pieceId:input.pieceId,profileKey:selected.profileKey,
    target:{unitId:target.id,currentModels:target.currentModels,currentSupply:target.currentSupply,
      remainingModelIds:target.models.filter(active).map(m=>m.id)},
    availableProfiles:[],nativeProfileDiagnostics:[],nativeUnitDiagnostics:[],
    diagnosticScope:'Native enumeration may report its first rejected target; a disabledReason alone does not identify the selected target or prove a cause for every target.',
    diagnosticFailure:null};
  try {
    const enumeration=enumerateOfficialSelectedRosterRangedActionsV1(state,{sideKey:input.sideKey,includeDisabled:true});
    context.availableProfiles=enumeration.parameterDomains
      .filter(d=>d.parameterKind===OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND&&d.pieceId===input.pieceId)
      .map(d=>({profileKey:d.profileKey,targetPlans:d.constraints.targetPlans.map(p=>({
        targetUnitId:p.targetUnitId,eligibleAttackerModelIds:clone(p.eligibleAttackerModelIds),
        visibleTargetModelIds:clone(p.visibleTargetModelIds)}))}));
    const diagnostics=enumeration.candidates.filter(c=>c.pieceId===input.pieceId&&c.isEnabled===false)
      .map(({actionType,pieceId,profileKey,isEnabled,disabledReason,executorId,executorVersion})=>
        ({actionType,pieceId,profileKey,isEnabled,disabledReason,executorId,executorVersion}));
    context.nativeProfileDiagnostics=diagnostics.filter(c=>c.profileKey===selected.profileKey);
    context.nativeUnitDiagnostics=diagnostics.filter(c=>c.profileKey===null);
  } catch(error) {
    // Diagnostics must not replace the original failure with a different error.
    context.diagnosticFailure={code:error.code??error.message,detail:error.detail??null};
  }
  return context;
}

export async function estimateStarcraftTmgRangedActivationV1(input,options={}) {
  input=normalizeRangedActivationQueryArgumentsV1(input);
  validate(input);
  const source=clone(input.state),sourceHash=hash(source);
  const targetIds=[...new Set(input.steps.map(s=>s.parameters.targetUnitId))];
  const sourceTargets=targetIds.map(id=>source.pieces.find(p=>p.id===id));
  const samples=[],failures=[];
  const observe=event=>{try{options.observeProgress?.(event);}catch{/* diagnostics have no authority */}};
  const firstBatch=createOfficialSelectedRosterRangedQueryBatchV1(source,{sideKey:input.sideKey});
  if(input.finishPolicy==='finish_after_list_or_lost_target')for(const selected of input.steps){
    const domain=firstBatch.enumeration.parameterDomains.find(d=>d.parameterKind===OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND
      &&d.pieceId===input.pieceId&&d.profileKey===selected.profileKey);
    if(!domain)fail('RANGED_ACTIVATION_INITIAL_SHOT_UNAVAILABLE',{profileKey:selected.profileKey,targetUnitId:selected.parameters.targetUnitId});
    // Validate all initial target/weapon parameters before sampling, through Native.
    firstBatch.previewWork(domain,selected.parameters);
  }
  for(let sample=0;sample<input.sampleCount;sample++) {
    if(await options.shouldStop?.()) {failures.push({sample,code:'RANGED_ACTIVATION_INTERRUPTED'});break;}
    let current=source;const row={sample,status:'running',steps:[],incomingDamage:0};
    samples.push(row);
    try {
      for(let index=0;index<input.steps.length;index++) {
        if(await options.shouldStop?.())fail('RANGED_ACTIVATION_INTERRUPTED');
        const startedAtMs=Date.now();
        observe({stage:'native_batch_started',sample,index});
        const selected=input.steps[index],target=current.pieces.find(p=>p.id===selected.parameters.targetUnitId);
        if(target.isDestroyed||target.currentModels===0) {
          row.steps.push({index,profileKey:selected.profileKey,targetUnitId:target.id,status:'target_destroyed'});continue;
        }
        const batch=index===0?firstBatch:createOfficialSelectedRosterRangedQueryBatchV1(current,{sideKey:input.sideKey});
        const domain=batch.enumeration.parameterDomains.find(d=>d.parameterKind===OFFICIAL_SELECTED_ROSTER_RANGED_PARAMETER_KIND
          &&d.pieceId===input.pieceId&&d.profileKey===selected.profileKey);
        const missingTarget=!domain||!domain.constraints.targetPlans.some(p=>p.targetUnitId===selected.parameters.targetUnitId);
        if(missingTarget&&input.finishPolicy==='finish_after_list_or_lost_target'&&row.steps.some(s=>s.status==='resolved')){
          const availability=batch.targetAvailability({pieceId:input.pieceId,profileKey:selected.profileKey,targetUnitId:selected.parameters.targetUnitId});
          if(availability.available===false){
            row.steps.push({index,profileKey:selected.profileKey,targetUnitId:target.id,status:'activation_ended_target_unavailable',
              stateHash:hash(current),nativeTargetAvailability:availability,remainingShotsNotAttempted:input.steps.length-index});
            break; // The unchanged Native finish below must still succeed.
          }
        }
        if(!domain)fail('RANGED_ACTIVATION_PROFILE_UNAVAILABLE',{index,profileKey:selected.profileKey,
          nativeStepContext:unavailableProfileContext(batch.snapshot,input,index,sourceHash)});
        const work=batch.previewWork(domain,selected.parameters),resolver=work.createChanceResolver();
        const chanceReveals=dice(input.seed,sample,index,work.preview.chance.count);
        const pool=resolver.resolvePool({chanceReveals,precisionConvertedFailedHitDieIndices:[]});
        const precisionConvertedFailedHitDieIndices=input.precisionPolicy==='maximize_hits'
          ?pool.resolution.precisionChoiceDomain.failedHitDieIndices.slice(0,pool.resolution.precisionChoiceDomain.maximumConvertedDice):[];
        const beforeHash=hash(current);
        const settled=settleDeclaredPolicy(work.applyChance({chanceReveals,precisionConvertedFailedHitDieIndices}),input);
        const attack=settled.events.find(e=>e.type==='ranged_attack');
        if(!attack)fail('RANGED_ACTIVATION_NATIVE_ATTACK_NOT_SETTLED');
        current=settled.state;
        row.incomingDamage+=Number(attack.stages.damage.totalDamage);
        row.steps.push({index,status:'resolved',profileKey:selected.profileKey,targetUnitId:target.id,
          eligibleAttackerModelIds:clone(attack.eligibleAttackerModelIds),chanceReveals,
          precisionConvertedFailedHitDieIndices,beforeStateHash:beforeHash,afterStateHash:hash(current),
          attackResolutionHash:attack.attackResolutionHash,casualtyResolutionHash:attack.casualtyResolutionHash,
          incomingDamage:Number(attack.stages.damage.totalDamage),casualtyModelIds:clone(attack.casualtyModelIds),
          postDamageMarker:attack.postDamageMarker,currentSupplyBefore:attack.currentSupplyBefore,
          currentSupplyAfter:attack.currentSupplyAfter,sequenceContinues:attack.sequenceContinues});
        observe({stage:'native_batch_completed',sample,index,elapsedMs:Date.now()-startedAtMs});
      }
      if(currentOfficialSelectedRosterRangedSequenceV1(current)) {
        const candidate=enumerateOfficialSelectedRosterRangedActionsV1(current,{sideKey:input.sideKey})
          .candidates.find(c=>c.isEnabled&&c.actionType===OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE);
        if(!candidate)fail('RANGED_ACTIVATION_FINISH_UNAVAILABLE');
        const action=Object.fromEntries(Object.entries(candidate).filter(([k])=>!['isEnabled','disabledReason','score','details'].includes(k)));
        current=finishOfficialSelectedRosterRangedSequenceV1(current,action).state;
      }
      if(currentOfficialSelectedRosterRangedSequenceV1(current)||current.pendingCurrentProductRangedCasualtyChoice
        ||current.pendingCurrentProductRangedDamageReaction)fail('RANGED_ACTIVATION_UNFINISHED_NATIVE_WINDOW');
      row.targets=sourceTargets.map(before=>{
        const after=current.pieces.find(p=>p.id===before.id);
        return {targetUnitId:before.id,casualties:before.currentModels-after.currentModels,
          supplyLost:before.currentSupply-after.currentSupply,remainingModels:after.currentModels,
          remainingSupply:after.currentSupply,damageMarker:after.damageMarker,
          removedModelIds:before.models.filter(active).filter(m=>after.models.find(n=>n.id===m.id)?.isDestroyed).map(m=>m.id)};
      });
      row.status='complete';row.finalStateHash=hash(current);
    } catch(error) {
      row.status='incomplete';row.error={code:error.code??error.message,detail:error.detail??null};
      failures.push({sample,...row.error});
      // A Native/contract failure is not another zero-damage observation. Stop
      // promptly and preserve this prefix, without paying for the same failure N times.
      break;
    }
    await new Promise(resolve=>setImmediate(resolve));
  }
  const complete=failures.length===0&&samples.length===input.sampleCount&&samples.every(s=>s.status==='complete');
  const result={schema:'starcraft_tmg_ranged_activation_probability_v1',version:RANGED_ACTIVATION_PROBABILITY_VERSION,
    status:complete?'complete':'incomplete',sourceStateHash:sourceHash,pieceId:input.pieceId,sideKey:input.sideKey,
    policy:clone({steps:input.steps,precisionPolicy:input.precisionPolicy,reactionPolicy:input.reactionPolicy,
      casualtyPolicy:input.casualtyPolicy,finishPolicy:input.finishPolicy}),
    distribution:{method:'deterministic_seeded_uniform_d6_trajectories',exact:false,seed:input.seed,
      requestedSamples:input.sampleCount,completedSamples:samples.filter(s=>s.status==='complete').length},
    estimates:complete?{incomingDamageIncludingOverflow:summarize(samples.map(s=>s.incomingDamage)),
      casualties:summarize(samples.map(s=>s.targets.reduce((n,t)=>n+t.casualties,0))),
      supplyLost:summarize(samples.map(s=>s.targets.reduce((n,t)=>n+t.supplyLost,0)))}:null,
    failures,samples,scope:{singleUnit:true,singleActivation:true,chosenRangedSequenceOnly:true,
      allOptionalReactionsPassed:true,afterActionAbilitiesExcluded:true,wholeBattleSimulated:false,
      optimalPolicyClaim:false,incompleteIsNotZero:true,mutatesSourceState:false,trainingTruth:false}};
  return result;
}
