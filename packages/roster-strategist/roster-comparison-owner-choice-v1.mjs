// The owner chooses a real decision; Native supplies identity and costs.
// This is not an action permission, Builder result, utility function or winner.
import {resolveRosterComparisonAbilitySourceV1} from './roster-comparison-intervention-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
// Preference belongs to the strategic owner, not the measurement designer or
// reviewer. Declaration is not proof that the trade-off is a good strategy.
const nullable=value=>({anyOf:[value,{type:'null'}]});
const rulePremise=object({actorUnitId:text,definitionId:text,activationKind:text,phase:text,
  resourceType:nullable(text),resourceCost:nullable({type:'number',minimum:0})});
const legacyTradeoff=object({condition:text,acceptableCost:text,rationale:text});
const assertedTradeoff=object({...legacyTradeoff.properties,
  rulePremises:{type:'array',minItems:0,items:rulePremise,
    description:'Historical author assertions; new requests select source references instead.'}});
// The model owns hypothetical resource allocation and tactical priorities, not
// duplicate definitions of timing/type/cost. Native remains the only fact owner.
const resourceTradeoff=object({kind:{...text,enum:['native_resource_budget']},condition:text,
  availableBudget:{type:'number',minimum:0},maximumSpend:{type:'number',minimum:0},
  opportunities:{type:'array',minItems:0,items:object({actorUnitId:text,definitionId:text,
    assumedPhase:{...text,description:'Choose a source-permitted phase. For an Any-phase definition, any may represent a budget reservation across its allowed windows, not an executed event or a claim of timing exclusion. A concrete phase narrows that assumption. Actual trigger/payment still requires Native evidence.'},
    availabilityAssumption:text,valueIfReserved:text})},priorityRationale:text});
const otherTradeoff=object({kind:{...text,enum:['other_tradeoff']},...legacyTradeoff.properties});
const sourceFactsTradeoff=object({kind:{...text,enum:['source_fact_selection']},condition:text,
  factIds:{type:'array',minItems:1,items:text},priorityRationale:text});
export const ROSTER_COMPARISON_OWNER_TRADEOFF_SCHEMA_V1={anyOf:[resourceTradeoff,sourceFactsTradeoff]};
const tradeoffSchemaForChoice=kind=>kind==='native_ability_use'?resourceTradeoff:sourceFactsTradeoff;
export const rosterComparisonSourceOwnedTradeoffV1=request=>request?.tradeoff?.kind
  ===tradeoffSchemaForChoice(request?.choice?.kind).properties.kind.enum[0];
export function rosterComparisonSourceOwnedTradeoffErrorV1(request){
  const schema=tradeoffSchemaForChoice(request?.choice?.kind),actual=request?.tradeoff??{};
  const expectedKind=schema.properties.kind.enum[0];
  return {code:'comparison_source_owned_tradeoff_required',pointer:'/comparisonDesignRequest/tradeoff',
    choiceKind:request?.choice?.kind??null,actualKind:actual.kind??null,expectedKind,
    requiredFields:[...schema.required],missingFields:schema.required.filter(k=>!Object.hasOwn(actual,k)),
    unexpectedFields:Object.keys(actual).filter(k=>!Object.hasOwn(schema.properties,k)),
    expectedSchema:structuredClone(schema),
    instruction:expectedKind==='source_fact_selection'
      ?'当前选择是'+request?.choice?.kind+'，这条tradeoff必须使用source_fact_selection。只提交expectedSchema列出的kind、condition、factIds、priorityRationale；删除unexpectedFields。factIds从已交付authoritative_decision_facts或comparison_redesign_contract.factSlots.slots选择，缺少相关事实可读取，不能编造ID。Host填入购买成本、模型数、Supply和槽位；模型说明条件与取舍。现有预算数字不是此结构的字段，不得把购买成本写成战场能力支付。无需更换战略或证明最优，也可有依据结束比较。'
      :'当前选择是native_ability_use，tradeoff必须使用native_resource_budget，并按expectedSchema提交假设预算、支出上限、能力机会和优先理由。机会只选择真实actorUnitId/definitionId和来源允许的assumedPhase；Host填能力名称、支付类型和费用。预算和未来可用性保持条件假设，不是执行回执或互斥证明。无需更换战略或证明最优，也可有依据结束比较。'};
}
export function rosterComparisonOwnerTradeoffV1(request){
  const value=request?.tradeoff;
  // Historical prose remains readable, but the separate source-premise gate
  // prevents it authorizing a new experiment. Never backfill a paid response.
  const schema=value?.kind==='other_tradeoff'?otherTradeoff:value?.kind?ROSTER_COMPARISON_OWNER_TRADEOFF_SCHEMA_V1:
    value&&Object.hasOwn(value,'rulePremises')?assertedTradeoff:legacyTradeoff;
  const fields=['native_resource_budget','source_fact_selection'].includes(value?.kind)?['condition','priorityRationale']:['condition','acceptableCost','rationale'];
  if(!value||!validate(object({tradeoff:schema}),{tradeoff:value}).ok
    ||fields.some(k=>typeof value[k]!=='string'||!value[k].trim()))
    return {status:'missing',strategyApproved:false,instruction:'The strategic owner must declare the condition, acceptable cost/foregone option and why the measured outcome can change this actual choice. A cost amount alone is not a preference. Do not invent a utility weight or require global optimality.'};
  return {status:'declared',value:structuredClone(value),strategyApproved:false,
    instruction:'Authored conditional preference, not a rule or measured fact. Check that the proposed metric/tolerance and decision branches implement it; source-check factual premises. Zero tolerance is allowed when the owner justifies accepting any positive benefit in the declared resource/priority condition. Do not silently expand that condition or demand whole-game optimality.'};
}

export function rosterComparisonAuthoredTradeoffEntriesV1(request){
  const t=request.tradeoff;
  if(t?.kind==='source_fact_selection')return ['condition','priorityRationale'].map(k=>['/tradeoff/'+k,t[k]]);
  if(t?.kind!=='native_resource_budget')return ['condition','acceptableCost','rationale'].map(k=>['/tradeoff/'+k,t?.[k]]);
  return [['/tradeoff/condition',t.condition],['/tradeoff/priorityRationale',t.priorityRationale],
    ...t.opportunities.flatMap((o,i)=>['availabilityAssumption','valueIfReserved']
      .map(k=>['/tradeoff/opportunities/'+i+'/'+k,o[k]]))];
}

function sourceOwnedResourceFacts(request,source){
  const limits={sourceOwned:true,paymentCompetitionProven:false,currentActionEligibilityProven:false,strategyApproved:false};
  const fail=(code,detail={})=>({status:'unresolved',facts:[],errors:[{code,...detail}],...limits});
  const t=request.tradeoff;
  if(!validate(object({tradeoff:resourceTradeoff}),{tradeoff:t}).ok)return fail('comparison_resource_allocation_invalid');
  if(source?.schema!=='roster_comparison_choice_source_v1')return fail('comparison_owner_choice_source_missing');
  const refs=[request.choice,...t.opportunities],facts=[],opportunities=[],factIndices=new Map();
  const phases=new Set(source.definitions.map(d=>d.phase).filter(p=>p&&p!=='any'));
  for(const [i,ref] of refs.entries()){
    const matches=source.definitions.filter(d=>d.definitionId===ref.definitionId&&d.unitIds.includes(ref.actorUnitId));
    if(matches.length!==1)return fail('comparison_rule_premise_source_unresolved',{selected:ref});
    const d=matches[0],key=ref.actorUnitId+':'+d.definitionId;
    const f={actorUnitId:ref.actorUnitId,definitionId:d.definitionId,activationKind:d.activationKind,
      phase:d.phase,resourceType:d.activationResource,resourceCost:d.activationCost,
      abilityName:d.abilityName,sourceBundle:d.sourceBundle,routeHash:d.routeHash};
    if(typeof f.resourceCost!=='number'||!f.resourceType)return fail('comparison_activation_cost_source_missing',{fact:f});
    // One Native definition may occupy several authored roles: the selected
    // action is also a legitimate reservation/opportunity. Preserve every
    // authored opportunity and validate it, but share its source fact identity.
    let factIndex=factIndices.get(key);
    if(factIndex===undefined){factIndex=facts.length;factIndices.set(key,factIndex);facts.push(f);}
    if(i){
      if(!(phases.has(ref.assumedPhase)||ref.assumedPhase==='any'&&d.phase==='any')
        ||(d.phase!=='any'&&d.phase!==ref.assumedPhase))
        return fail('comparison_opportunity_phase_mismatch',{selected:ref,actualPhase:d.phase,
          instruction:'Choose a phase allowed by this definition. Any includes the selected phase; a different phase is not evidence of future availability or shared-payment exclusion.'});
      if(d.activationResource!==facts[0].resourceType)return fail('comparison_opportunity_resource_mismatch',{selected:ref});
      opportunities.push({...structuredClone(ref),factIndex,
        sameDefinitionPhase:facts[0].phase==='any'||ref.assumedPhase==='any'||facts[0].phase===ref.assumedPhase,
        actualEligibilityProven:false});
    }
  }
  const selected=facts[0];
  if(t.maximumSpend>t.availableBudget||selected.resourceCost>t.maximumSpend)
    return fail('comparison_resource_budget_inconsistent',{sourceCost:selected.resourceCost,
      availableBudget:t.availableBudget,maximumSpend:t.maximumSpend,
      instruction:'The hypothetical player budget must fund the selected source cost within the author commitment. This is not an actual payment receipt.'});
  return {status:'bound',facts,errors:[],...limits,sourceStateHash:source.sourceStateHash,rulesRuntimeHash:source.rulesRuntimeHash,
    resourceAllocation:{kind:'hypothetical_player_budget',resourceType:selected.resourceType,
      availableBudget:t.availableBudget,maximumSpend:t.maximumSpend,selectedSourceCost:selected.resourceCost,
      remainingAfterSelected:t.availableBudget-selected.resourceCost,opportunities,
      paymentCompetitionProven:false,temporalOrderProven:false},
    instruction:'Definition facts above are generated from Native identities, not authored text. Budget and opportunity availability are explicitly hypothetical. Same resource does not prove exclusion; Any includes concrete phases, and a different phase is not necessarily a future action. Review the author priority and alternate purpose against the actual Plan. Do not replace resource preference with a Host utility weight, infer actual payment, or treat a declared preference as sufficient justification.'};
}

// Re-evaluate the exact old paid reply once after the identity fix. This never
// buys another rewrite, changes an opportunity, or approves the experiment.
export function projectRosterComparisonResourceRevalidationV1({state,work,reply,request}){
  const errors=work?.operationState?.correction?.errors;
  if(work?.role!=='roster_workflow_strategy_decision'||work.status!=='needs_repair'
    ||work.operationState?.pending||work.failure?.dispatchOutcome!=='completed_invalid'
    ||!errors?.length||!errors.every(e=>e.code==='comparison_rule_premise_duplicate')
    ||Object.entries(work.bindings??{}).some(([key,value])=>state.scope[key]!==value)
    ||reply?.output?.decisions?.length!==1)return null;
  const selected=reply.output.decisions[0].comparisonDesignRequest;
  const source=request?.promptNodes?.find(n=>n.kind==='comparison_redesign_contract')?.choiceSource;
  if(selected?.tradeoff?.kind!=='native_resource_budget'
    ||resolveRosterComparisonTradeoffFactsV1({request:selected,source}).status!=='bound')return null;
  const ref=work.operationState.correction.originalReplyRef;
  return {workId:work.id,originalReplyRef:ref,repairKind:'comparison_resource_fact_identity',
    revalidationKey:hash({workId:work.id,ref,repair:'comparison_resource_fact_identity',version:1}),
    newProviderCall:false,nativeReplayed:false,historyReset:false,finalApprovalGranted:false,
    instruction:'C24 source-identity repair: one Native ability can be both the selected action and an authored reservation opportunity. Preserve every authored opportunity, validate its own phase/resource/budget, and share only its exact Native fact index. Revalidate the unchanged paid reply once through all original role/source/semantic checks. This does not prove legality, tactical value, the proposed comparison or Plan quality. No Provider/Native replay, reply edits or history/fee reset.'};
}

// Check what the strategic author claims, not what a second model remembers.
// These are definition facts only; actual payment uses the Native card ledger.
export function resolveRosterComparisonTradeoffFactsV1({request,source}){
  const limits={paymentCompetitionProven:false,currentActionEligibilityProven:false,strategyApproved:false};
  if(request?.choice?.kind!=='native_ability_use')return {status:'not_applicable',facts:[],errors:[],...limits};
  if(request.tradeoff?.kind==='native_resource_budget')return sourceOwnedResourceFacts(request,source);
  const assertions=request.tradeoff?.rulePremises;
  const fail=(code,detail={})=>({status:'unresolved',facts:[],errors:[{code,...detail}],...limits});
  const instruction='Declare source-checked rulePremises for the selected ability and every named alternative used in the cost rationale. Copy its exact Native phase/activationKind/resourceType/resourceCost from choiceSource. Correct the strategic rationale as well as the fields when a premise was wrong. The same CP label is not a personal balance or proof of contention: card ownership/readiness/selected payment and remaining timing require actual source evidence or explicit hypothetical conditions. Earlier-phase abilities are not future actions merely because they share a resource. No silent author rewrite, invented payment or whole-game proof is required.';
  if(!Array.isArray(assertions)||!assertions.length)return fail('comparison_cost_rule_premises_required',{instruction});
  if(source?.schema!=='roster_comparison_choice_source_v1')return fail('comparison_owner_choice_source_missing',{instruction});
  const facts=[],errors=[],seen=new Set();
  for(const asserted of assertions){
    if(!validate(object({premise:rulePremise}),{premise:asserted}).ok){errors.push({code:'comparison_rule_premise_invalid',instruction});continue;}
    const matches=source.definitions.filter(d=>d.definitionId===asserted.definitionId&&d.unitIds.includes(asserted.actorUnitId));
    if(matches.length!==1){errors.push({code:'comparison_rule_premise_source_unresolved',asserted, instruction});continue;}
    const d=matches[0],key=asserted.actorUnitId+':'+d.definitionId;
    if(seen.has(key)){errors.push({code:'comparison_rule_premise_duplicate',definitionId:d.definitionId});continue;}
    seen.add(key);
    const actual={actorUnitId:asserted.actorUnitId,definitionId:d.definitionId,activationKind:d.activationKind,
      phase:d.phase,resourceType:d.activationResource,resourceCost:d.activationCost};
    if(!isDeepStrictEqual(asserted,actual)){errors.push({code:'comparison_rule_premise_mismatch',asserted,actual,instruction});continue;}
    facts.push({...actual,abilityName:d.abilityName,sourceBundle:d.sourceBundle,routeHash:d.routeHash});
  }
  if(!facts.some(f=>f.actorUnitId===request.choice.actorUnitId&&f.definitionId===request.choice.definitionId))
    errors.push({code:'comparison_selected_ability_premise_required',instruction});
  return {status:errors.length?'unresolved':'bound',facts,errors,sourceStateHash:source.sourceStateHash,
    rulesRuntimeHash:source.rulesRuntimeHash,instruction,...limits};
}
const selected=kind=>object({kind:{...text,enum:[kind]},actorUnitId:text,
  ...(kind==='purchase_upgrade'?{purchasableUpgradeProfileId:text}:{definitionId:text}),
  current:{...text,enum:kind==='native_ability_use'?['use','omit']:['selected','not_selected']},
  alternative:{...text,enum:kind==='native_ability_use'?['use','omit']:['selected','not_selected']}});
export const ROSTER_COMPARISON_OWNER_CHOICE_SCHEMA_V1={anyOf:[selected('native_ability_use'),selected('purchase_upgrade'),
  ...['placement_or_action','participant_configuration'].map(kind=>object({kind:{...text,enum:[kind]},
    actorUnitIds:{type:'array',minItems:1,items:text}}))]};
export function projectRosterComparisonChoiceSourceV1(catalogue){
  const native=catalogue?.nativeInterventions;
  if(native?.schema!=='roster_native_interventions_v1')return null;
  return {schema:'roster_comparison_choice_source_v1',sourceStateHash:native.sourceStateHash,rulesRuntimeHash:native.rulesRuntimeHash,
    units:(native.unitFacts??[]).map(u=>({unitId:u.unitId,recordKey:u.recordKey,compositionKind:u.compositionKind})),
    definitions:native.definitions.map(d=>({definitionId:d.definitionId,abilityName:d.abilityName,unitIds:[...d.unitIds],
      recordKey:d.recordKey,sourceBundle:d.sourceBundle,routeHash:d.routeHash,activationKind:d.activationKind,phase:d.phase,
      selectionCostsByComposition:d.costByComposition?structuredClone(d.costByComposition):null,
      activationResource:d.resourceType??null,activationCost:d.resourceCost??null,
      useOmitChoice:['active','reaction'].includes(d.activationKind)})),
    purchasableUpgrades:structuredClone(native.purchasableUpgrades??[]),
    purchaseSourceBundleHash:native.purchaseSourceBundleHash??null,
    purchaseSourceAvailability:native.purchaseSourceAvailability??'source_not_present_no_inferred_purchases',
    instruction:'Source-bound alternatives, not recommendations. Purchases select ONLY a purchasableUpgradeProfileId from the Builder list; Native ability IDs are not purchase IDs. Eligibility is NOT inferred from price: a real listed purchase can cost zero. Selection costs and activation resource costs are DIFFERENT. A use/omit comparison does not rank a purchase or unchanged unit investments. Builder/Native must still validate exact configurations/actions. Do not invent omitted costs or substitute another upgrade price.'};
}
export function resolveRosterComparisonOwnerChoiceV1({choice,source}){
  const fail=(code,detail={})=>({status:'unresolved',errors:[{code,...detail}]});
  if(!choice)return fail('comparison_owner_source_choice_required');
  // The shared validator validates Provider roots (closed objects). The choice
  // is a nested tagged union in the real response, not a Provider root itself.
  if(!validate(object({choice:ROSTER_COMPARISON_OWNER_CHOICE_SCHEMA_V1}),{choice}).ok)
    return fail('comparison_owner_source_choice_invalid');
  if(source?.schema!=='roster_comparison_choice_source_v1')return fail('comparison_owner_choice_source_missing');
  const unitIds=new Set(source.units.map(u=>u.unitId));
  if(choice.actorUnitIds){
    if(new Set(choice.actorUnitIds).size!==choice.actorUnitIds.length||choice.actorUnitIds.some(id=>!unitIds.has(id)))
      return fail('comparison_owner_actor_unresolved');
    return {status:'bound',choice:structuredClone(choice),sourceStateHash:source.sourceStateHash,rulesRuntimeHash:source.rulesRuntimeHash,
      requiredNextProof:choice.kind==='participant_configuration'?'actual_builder_configurations':'actual_native_scene_actions',
      costsProven:false,legalityProven:false,strategyApproved:false};
  }
  if(choice.current===choice.alternative)return fail('comparison_owner_no_changed_choice');
  if(choice.kind==='purchase_upgrade'){
    if(source.purchaseSourceAvailability!=='same_native_builder_source')return fail('comparison_owner_purchase_source_missing');
    const matches=source.purchasableUpgrades.filter(p=>p.purchasableUpgradeProfileId===choice.purchasableUpgradeProfileId);
    if(matches.length!==1)return fail('comparison_owner_not_purchasable',{
      instruction:'Select an actual Builder purchase profile, not an innate ability or an invented price. Reconsider the actual strategic choice; changing ability use is a different question.'});
    const p=matches[0],unit=source.units.find(u=>u.unitId===choice.actorUnitId);
    if(!unit||unit.recordKey!==p.recordKey||!p.unitIds.includes(unit.unitId))return fail('comparison_owner_purchase_actor_mismatch');
    const mineralCost=p.mineralCostByComposition?.[unit.compositionKind];
    if(typeof mineralCost!=='number')return fail('comparison_owner_purchase_composition_unresolved');
    return {status:'bound',choice:structuredClone(choice),profile:structuredClone(p),
      sourceStateHash:source.sourceStateHash,rulesRuntimeHash:source.rulesRuntimeHash,
      purchaseSourceBundleHash:source.purchaseSourceBundleHash,compositionKind:unit.compositionKind,mineralCost,
      permittedDecision:'upgrade_selection',requiredNextProof:'actual_builder_configurations',
      legalityProven:false,strategyApproved:false};
  }
  const native={schema:'roster_native_interventions_v1',sourceStateHash:source.sourceStateHash,rulesRuntimeHash:source.rulesRuntimeHash,
    definitions:source.definitions.map(d=>({...d,costByComposition:d.selectionCostsByComposition}))};
  const resolved=resolveRosterComparisonAbilitySourceV1({intervention:choice,catalogue:{nativeInterventions:native}});
  if(resolved.status!=='resolved')return fail(resolved.code);
  const d=resolved.definition;
  if(choice.kind==='native_ability_use'&&!d.useOmitChoice)return fail('comparison_owner_ability_not_use_omit');
  return {status:'bound',choice:structuredClone(choice),resolvedDefinitionId:d.definitionId,
    sourceStateHash:source.sourceStateHash,rulesRuntimeHash:source.rulesRuntimeHash,routeHash:d.routeHash,
    selectionCostsByComposition:structuredClone(d.selectionCostsByComposition),
    activationResource:d.activationResource,activationCost:d.activationCost,
    permittedDecision:choice.kind==='native_ability_use'?'conditional_ability_use':'upgrade_selection',
    instruction:'These costs and decision kind are source-bound. Author prose cannot turn use into purchase or substitute another price. A measured benefit still needs an explicit opportunity-cost judgment. This does not prove current availability, legal configuration/action, effect or strategic superiority.',
    legalityProven:false,strategyApproved:false};
}
