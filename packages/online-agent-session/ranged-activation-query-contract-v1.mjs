// Shared JSON input vocabulary. The Host binds state and seat; callers choose
// an explicit conditional policy, never a forged state or precomputed damage.
export const RANGED_ACTIVATION_QUERY_ARGUMENTS_V1=Object.freeze({
  required:['pieceId','sampleCount','seed','precisionPolicy','reactionPolicy','casualtyPolicy','finishPolicy'],
  sequenceChoice:'Exactly one of weaponSequence or steps is required. weaponSequence is the compact form for weapons needing only targetUnitId; steps retains explicit per-weapon parameters for different targets or special choices.',
  weaponSequence:'{targetUnitId:"one explicitly selected actual target",profileKeys:["observed unique profileKey",...]}. Host expands the SAME chosen target into each ordered weapon step. It does not infer a target from casualtyPolicy, select weapons, or claim all models remain in range after casualties.',
  pieceId:'One actual current-seat unit ID. No movement or opponent turn is simulated.',
  steps:'Nonempty ordered [{profileKey,parameters:{targetUnitId,...}}]. EVERY step requires an explicit parameters.targetUnitId from that profile parameterSchema in the actual selected scene ranged menu. casualtyPolicy.byTarget does not select an attack target. Copy profileKey and any other exact attack parameters from that menu. Target choices remain fixed; Native recomputes each following domain after casualties. No repeated profile. A destroyed target skips its later shots, never auto-retargets.',
  sampleCount:'Explicit integer 1..1296. Reproducible sampled distribution, NOT exact enumeration; low sample count does not establish a threshold advantage. This is a bounded offline comparison, not a cheap distance query.',
  seed:'Explicit nonempty string. Keep equal across comparison arms; Native d6 outcomes are deterministic seeded samples, not live rolls.',
  precisionPolicy:['maximize_hits','decline'],
  reactionPolicy:['pass_all_optional'],
  casualtyPolicy:'{kind:"ordered_model_ids",byTarget:{targetUnitId:[modelId,...]}}. Explicit defender removal preference, covering all active target models; choose among Native legal selections. Not a best-defence assertion. Compact engaged removal is currently unsupported.',
  finishPolicy:['finish_after_list','finish_after_list_or_lost_target'],
  lostTargetPolicy:'finish_after_list_or_lost_target explicitly ends the activation through Native finish if a previously legal later shot loses its declared target after earlier batches. Native must confirm that exact target has no visible model in range. Initial illegal shots, unrecognized Native errors and unavailable finish remain failures. No retargeting, no fake shot, no missing observation filled with zero. finish_after_list keeps the strict legacy policy.',
  result:'status=complete with per-sample Native transitions and estimates, or unknown with partialResult preserved in repairContext. incomingDamageIncludingOverflow is raw incoming damage, not casualties or useful wounds. Read casualties and supplyLost separately. Optional reactions/after-action abilities excluded, no combined opponent activation or whole-game utility.',
  authority:'State, source hash and seat are supplied by the shared authoritative adapter only. Never provide state, sideKey, domain receipts or computed outcomes.',
});

export function normalizeRangedActivationQueryArgumentsV1(args){
  if(!args||!Object.hasOwn(args,'weaponSequence'))return args;
  const sequence=args.weaponSequence;
  if(Object.hasOwn(args,'steps')||!sequence||Array.isArray(sequence)||typeof sequence!=='object'
    ||Object.keys(sequence).some(k=>!['targetUnitId','profileKeys'].includes(k))
    ||typeof sequence.targetUnitId!=='string'||!sequence.targetUnitId.trim()
    ||!Array.isArray(sequence.profileKeys)||!sequence.profileKeys.length)
    throw Object.assign(new TypeError('RANGED_ACTIVATION_SEQUENCE_CHOICE_INVALID'),{code:'RANGED_ACTIVATION_SEQUENCE_CHOICE_INVALID',
      detail:{expected:'Exactly one of steps or weaponSequence:{targetUnitId,profileKeys}',targetInferred:false}});
  const {weaponSequence,...rest}=args;
  const steps=sequence.profileKeys.map(profileKey=>({profileKey,parameters:{targetUnitId:sequence.targetUnitId}}));
  assertRangedActivationSequenceV1(steps);
  return {...rest,steps};
}

// Shared shape check only. Actual menu membership, state, targets, policies and
// combat remain Native-owned. Never infer attack targets from casualty order.
export function assertRangedActivationSequenceV1(steps,{boundArgumentPointers=[]}={}){
  const deferred=pointer=>boundArgumentPointers.some(bound=>bound===pointer||pointer.startsWith(bound+'/'));
  if(deferred('/steps'))return;
  const issues=[];
  if(!Array.isArray(steps)||!steps.length)issues.push({pointer:'/steps',problem:'nonempty_ordered_sequence_required'});
  else {
    const profiles=new Map();
    for(const [index,step]of steps.entries()){
      const keyPointer=`/steps/${index}/profileKey`,targetPointer=`/steps/${index}/parameters/targetUnitId`;
      if(!deferred(keyPointer)){
        if(typeof step?.profileKey!=='string'||!step.profileKey)issues.push({pointer:keyPointer,problem:'nonempty_profile_key_required'});
        else if(profiles.has(step.profileKey))issues.push({pointer:keyPointer,problem:'duplicate_profile_key',profileKey:step.profileKey,firstIndex:profiles.get(step.profileKey)});
        else profiles.set(step.profileKey,index);
      }
      if(!deferred(targetPointer)&&typeof step?.parameters?.targetUnitId!=='string')
        issues.push({pointer:targetPointer,problem:'target_unit_id_required',profileKey:typeof step?.profileKey==='string'?step.profileKey:null});
    }
  }
  if(!issues.length)return;
  const code='RANGED_ACTIVATION_EXPLICIT_UNIQUE_PROFILE_SEQUENCE_REQUIRED';
  const detail={version:1,sourceContract:'ranged_activation_sequence_v1',issues,
    expectedStep:{profileKey:'Exact unique profileKey from the selected scene ranged menu',parameters:{targetUnitId:'Explicit targetUnitId selected from that profile parameterSchema'}},
    instruction:'Correct the exact issue pointers for this same sequence. Every step needs its own parameters.targetUnitId. casualtyPolicy.byTarget is a removal policy, not an attack-target binding. Select from the actual intended scene menu; capability routes or an empty initial-state menu are not that menu. Keep the intended scene, weapon order, sample count, seed and policies. The Host does not infer a target or execute a measurement.'};
  throw Object.assign(new TypeError(code),{code,detail,queryRepair:{correctable:true,...detail,originalQueryNotAnswered:true}});
}

export function inspectRangedActivationQueryArgumentsV1(args) {
  const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(args))return {invalid:'arguments must be an object'};
  const required=RANGED_ACTIVATION_QUERY_ARGUMENTS_V1.required;
  const allowed=[...required,'steps','weaponSequence'];
  const unrecognized=Object.keys(args).filter(k=>!allowed.includes(k));
  const missing=required.filter(k=>!Object.hasOwn(args,k));
  if(Object.hasOwn(args,'steps')===Object.hasOwn(args,'weaponSequence'))missing.push('exactly_one_of_steps_or_weaponSequence');
  if(Object.hasOwn(args,'weaponSequence'))try{normalizeRangedActivationQueryArgumentsV1(args);}catch(error){unrecognized.push(error.code??error.message);}
  if(Array.isArray(args.steps))args.steps.forEach((s,i)=>{
    if(!object(s)){unrecognized.push(`steps[${i}]`);return;}
    unrecognized.push(...Object.keys(s).filter(k=>!['profileKey','parameters'].includes(k)).map(k=>`steps[${i}].${k}`));
  });
  if(object(args.casualtyPolicy))unrecognized.push(...Object.keys(args.casualtyPolicy)
    .filter(k=>!['kind','byTarget'].includes(k)).map(k=>`casualtyPolicy.${k}`));
  return unrecognized.length||missing.length?{unrecognized,missing}:null;
}

// Semantic values for explicit target-only weapon steps. The function is also the
// compiler: transport clients cannot invent a separate parameter vocabulary.
export function rangedActivationSemanticParametersV1(){
 const text={type:'string',minLength:1};
 return {type:'object',additionalProperties:false,required:['pieceId','shots','sampleCount','seed','precisionPolicy','reactionPolicy','finishPolicy','casualtyPreferences'],properties:{
  pieceId:text,shots:{type:'array',minItems:1,items:{type:'object',additionalProperties:false,required:['profileKey','targetUnitId'],properties:{profileKey:text,targetUnitId:text}}},
  sampleCount:{type:'integer',minimum:1,maximum:1296},seed:text,
  ...Object.fromEntries(['precisionPolicy','reactionPolicy','finishPolicy'].map(key=>[key,{type:'string',enum:[...RANGED_ACTIVATION_QUERY_ARGUMENTS_V1[key]]}])),
  casualtyPreferences:{type:'array',minItems:1,items:{type:'object',additionalProperties:false,required:['targetUnitId','modelIds'],properties:{targetUnitId:text,modelIds:{type:'array',minItems:0,items:text}}}}
 }};
}
export function compileRangedActivationSemanticParametersV1(values){
 const {shots,casualtyPreferences,...rest}=values;
 if(new Set(casualtyPreferences.map(p=>p.targetUnitId)).size!==casualtyPreferences.length)
  throw Object.assign(new TypeError('RANGED_ACTIVATION_DUPLICATE_CASUALTY_TARGET'),{code:'RANGED_ACTIVATION_DUPLICATE_CASUALTY_TARGET'});
 const args={...rest,steps:shots.map(({profileKey,targetUnitId})=>({profileKey,parameters:{targetUnitId}})),casualtyPolicy:{kind:'ordered_model_ids',byTarget:Object.fromEntries(casualtyPreferences.map(p=>[p.targetUnitId,[...p.modelIds]]))}};
 const issues=inspectRangedActivationQueryArgumentsV1(args);
 if(issues)throw Object.assign(new TypeError('RANGED_ACTIVATION_SEMANTIC_ARGUMENTS_INVALID'),{code:'RANGED_ACTIVATION_SEMANTIC_ARGUMENTS_INVALID',detail:issues});
 return args;
}
