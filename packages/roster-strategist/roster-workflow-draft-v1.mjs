import {normalizeRosterPlanningEntryV1,projectRosterPlanningEntryV1} from './roster-planning-entry-v1.mjs';
import {projectRosterPlanSynchronizationV1,updateRosterPlanSynchronizationV1} from './roster-plan-synchronization-v1.mjs';
// P4 joint draft transition. Builder owns legality/cost; existing Plan
// constructors own the stored format. No game-state or source mutation here.
import {isDeepStrictEqual} from 'node:util';
import {ROSTER_LOSS_WINDOW_CONVENTION_SCHEMA_V1} from './roster-loss-budget-basis-v1.mjs';
import {projectRosterWorkflowNativeCandidateUnitsV1,rosterWorkflowPlanCandidateMatchesNativeV1} from './roster-workflow-native-candidate-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {createRosterPlanV1,createRosterCandidateV1,createRosterScoreRouteV1,
  createRosterLossResourceBudgetV1,createRosterComponentPurposeV1,createRosterDeploymentConceptV1,
  createOpponentArchetypeHypothesisV1,createRosterCounterResponseV1,
  createRosterInvalidationTriggerV1,createRosterPlanRevisionEventV1} from './roster-plan-contracts-v1.mjs';
const str={type:'string',minLength:1,maxLength:65536};
const arr=items=>({type:'array',minItems:0,items});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const optional=value=>({anyOf:[value,{type:'null'}]});
const en=values=>({...str,enum:values});
const integer={type:'integer',minimum:0,maximum:1000000};
const purposeIdentitySchema=obj({componentKind:en(['faction_card','tactical_card','unit','composition','upgrade']),
  recordKey:str,instanceId:str});
const purposeSchema=obj({...purposeIdentitySchema.properties,publicPurposeText:str,
  scoringRole:en(['primary_scorer','support','counter','flex','unknown'])});
const sectionSchemas={
  publicSummaryText:str,
  scoreRoute:obj({routeKind:en(['mission_marker_control','attrition','hybrid','unknown']),routeText:str,
    scheduleStatus:en(['declared','unknown']),targetVpSchedule:arr(obj({window:str,plannedCumulativeVp:integer})),fallbackRouteText:str}),
  lossResourceBudget:obj({lossBudgetStatus:en(['declared','unknown']),
    lossWindowConvention:ROSTER_LOSS_WINDOW_CONVENTION_SCHEMA_V1,
    plannedLossBudget:arr(obj({resourceKind:str,window:str,plannedMaximumLoss:integer}))}),
  componentPurposes:arr(purposeSchema),
  componentPurposeEdits:{...obj({upsert:arr(purposeSchema),remove:arr(purposeIdentitySchema)}),
    description:'LOCAL keyed edits of componentPurposes. Untouched records remain exact. Identity is componentKind+recordKey+instanceId. Set componentPurposes=null when using this field. The legacy componentPurposes array still REPLACES the whole collection.'},
  deploymentConcept:obj({deploymentConceptText:str,activationOrderStatus:en(['declared','unknown']),
    activationOrder:arr(obj({ordinal:{...integer,minimum:1},unitInstanceId:str,phase:str})),
    reinforcementPolicyText:str,threatTradeText:str,objectiveControlText:str}),
  opponentHypotheses:arr(obj({hypothesisId:str,archetypeLabel:str,hypothesisText:str,confidence:en(['unknown','low','medium','high']),
    expectedCounterTexts:arr(str),ownCounterResponseIds:arr(str),falsificationText:str})),
  counterResponses:arr(obj({responseId:str,triggerText:str,responseText:str,linkedHypothesisIds:arr(str)})),
  invalidationTriggers:arr(obj({triggerId:str,observationKind:en(['vp_deficit','opponent_composition','battlefield_event','loss_budget','unknown']),
    triggerText:str,revisionRequiredText:str})),
};
// Optional persisted author explanation; strict Provider schemas use null for
// no edit. Neither prose nor its presence grants rule truth.
sectionSchemas.lossResourceBudget.properties.lossConsequencesText=optional({...str,
  description:'Explain the conditional consequences of actual model/unit losses for weapons, movement, Supply and control, and how they inform this budget. Use current facts; do not invent exact future casualties or treat aggregate Supply as interchangeable. Omission or null retains existing text; a nonempty string replaces it. This is author reasoning, not a Native calculation or automatic approval.'});
sectionSchemas.lossResourceBudget.required.push('lossConsequencesText');
const recordCollections={
  componentPurposes:{editKey:'componentPurposeEdits',identity:['componentKind','recordKey','instanceId'],create:createRosterComponentPurposeV1},
  opponentHypotheses:{editKey:'opponentHypothesisEdits',identity:['hypothesisId'],create:createOpponentArchetypeHypothesisV1},
  counterResponses:{editKey:'counterResponseEdits',identity:['responseId'],create:createRosterCounterResponseV1},
  invalidationTriggers:{editKey:'invalidationTriggerEdits',identity:['triggerId'],create:createRosterInvalidationTriggerV1},
};
for(const [section,spec] of Object.entries(recordCollections))if(!sectionSchemas[spec.editKey]){
  sectionSchemas[spec.editKey]={...obj({upsert:arr(sectionSchemas[section].items),
    remove:arr(obj(Object.fromEntries(spec.identity.map(key=>[key,sectionSchemas[section].items.properties[key]]))))}),
    description:`LOCAL edits of ${section} by ${spec.identity.join('+')}. Untouched records remain exact. Set ${section}=null. Removing a record requires its explicit identity in remove; omission is not deletion.`};
}
const editKeys=new Set(Object.values(recordCollections).map(s=>s.editKey));
export const ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1=obj({
  unitsToUpsert:arr(obj({unitInstanceId:str,recordKey:str,compositionKind:str,
    upgradeSelections:arr(obj({upgradeName:str,nominatedModelId:optional(str)}))})),
  unitIdsToRemove:arr(str),tacticalCardRecordKeys:optional(arr(str)),
  rosterBranchSelection:optional({...obj({sourceEvidenceNumber:{...integer,minimum:1},branchId:str}),
    description:'Select the exact read Builder candidate by source number and branchId; no unit/card edits in the same mutation. Host copies it and Builder rechecks. For a newly added unit, an explicitly authored unit purpose with the same recordKey may use a local alias only when that record has exactly one new selected unit; Host binds it and matching activationOrder references. Otherwise use exact selected unit identities. null keeps explicit edits.'}),
  rosterCandidateSelection:optional({...obj({sourceEvidenceNumber:{...integer,minimum:1}}),
    description:'Select the exact read candidate from a saved builder_audit or candidate_context. Host copies its full army and rechecks with current Builder; historical audit is not current approval. No branch selection or explicit unit/card edits together. null retains the other edit modes.'}),
  plan:obj(Object.fromEntries(Object.entries(sectionSchemas).map(([k,v])=>[k,optional(v)]))),
  retainedSectionReasons:arr(obj({section:en(Object.keys(sectionSchemas).filter(k=>!editKeys.has(k))),publicReason:str})),
});
const fail=(code,detail)=>{throw Object.assign(Error(code),{code,detail,dispatchOutcome:'not_dispatched'});};
const clone=structuredClone;
// Shared author-command -> Native unit projection for both private audits and
// formal draft edits. This changes field representation, never purchases.
export function projectRosterWorkflowNativeUnitEditV1(row){
  return {unitInstanceId:row.unitInstanceId,recordKey:row.recordKey,
    compositionKind:row.compositionKind,upgrades:row.upgradeSelections.map(u=>
      ({upgradeName:u.upgradeName,...(u.nominatedModelId?{nominatedModelId:u.nominatedModelId}:{})}))};
}
// A selected immutable candidate may be echoed as explicit edits by a model.
// Normalize ONLY edits that are already exact in that candidate. Differing
// purchases remain an author conflict; no source/legality/read approval here.
// Bind only an explicitly authored purpose for a uniquely added unit in an
// already selected candidate. Existing identities and ambiguous choices are
// never guessed; the selected roster and all strategic prose remain exact.
function projectSelectedRosterPlanBindings({plan,candidateInput,baseline}){
  const projected=clone(plan),bindings=[],aliases=new Map();
  const current=new Map(candidateInput.units.map(u=>[u.unitInstanceId,u]));
  const before=new Set(baseline.units.map(u=>u.unitInstanceId));
  const added=candidateInput.units.filter(u=>!before.has(u.unitInstanceId));
  const purposes=[...(projected.componentPurposes??[]),...(projected.componentPurposeEdits?.upsert??[])];
  const occupied=new Set(purposes.filter(p=>p.componentKind==='unit'&&current.has(p.instanceId)).map(p=>p.instanceId));
  for(const p of purposes){
    if(p.componentKind!=='unit'||current.has(p.instanceId))continue;
    if(before.has(p.instanceId))continue; // An actual removed unit is not an alias.
    const matches=added.filter(u=>u.recordKey===p.recordKey);
    if(matches.length!==1||occupied.has(matches[0]?.unitInstanceId)||aliases.has(p.instanceId))
      fail('ROSTER_WORKFLOW_SELECTED_UNIT_BINDING_AMBIGUOUS',{
        suppliedIdentity:p.instanceId,recordKey:p.recordKey,
        candidates:matches.map(u=>({unitInstanceId:u.unitInstanceId,recordKey:u.recordKey,compositionKind:u.compositionKind})),
        instruction:'Use the exact identity of the intended selected unit. Host cannot choose between multiple or conflicting unit purposes. The selected candidate and original reply are preserved.'});
    const target=matches[0].unitInstanceId;aliases.set(p.instanceId,target);occupied.add(target);
    bindings.push({suppliedIdentity:p.instanceId,unitInstanceId:target,recordKey:p.recordKey,rule:'unique_added_selected_unit_by_explicit_record_v1'});
    p.instanceId=target;
  }
  for(const step of projected.deploymentConcept?.activationOrder??[])
    if(aliases.has(step.unitInstanceId))step.unitInstanceId=aliases.get(step.unitInstanceId);
  return {plan:projected,bindings};
}
export function projectRosterWorkflowSelectionEchoV1({mutation,candidateInput,baseline}){
  const fields=[],seen=new Set(),units=new Map(candidateInput.units.map(u=>[u.unitInstanceId,u]));
  const conflict=(field)=>fail('ROSTER_WORKFLOW_SELECTED_CANDIDATE_ECHO_CONFLICT',{
    field,instruction:'Selected candidate and explicit edit differ. Choose the saved candidate alone or author explicit edits alone; Host will not choose between them.'});
  for(const row of mutation.unitsToUpsert){
    if(seen.has(row.unitInstanceId)||!isDeepStrictEqual(units.get(row.unitInstanceId),projectRosterWorkflowNativeUnitEditV1(row)))conflict('unitsToUpsert:'+row.unitInstanceId);
    seen.add(row.unitInstanceId);fields.push('unitsToUpsert:'+row.unitInstanceId);
  }
  for(const id of mutation.unitIdsToRemove){
    if(seen.has(id)||units.has(id)||!baseline.units.some(u=>u.unitInstanceId===id))conflict('unitIdsToRemove:'+id);
    seen.add(id);fields.push('unitIdsToRemove:'+id);
  }
  if(mutation.tacticalCardRecordKeys!==null){
    if(!isDeepStrictEqual(mutation.tacticalCardRecordKeys,candidateInput.tacticalCardRecordKeys))conflict('tacticalCardRecordKeys');
    fields.push('tacticalCardRecordKeys');
  }
  const planBinding=projectSelectedRosterPlanBindings({plan:mutation.plan,candidateInput,baseline});
  return {mutation:{...clone(mutation),unitsToUpsert:[],unitIdsToRemove:[],tacticalCardRecordKeys:null,plan:planBinding.plan},
    planUnitBindings:planBinding.bindings,
    proof:fields.length?{version:1,rule:'exact_selected_candidate_echo_v1',fields,
      originalEditHash:hash({unitsToUpsert:mutation.unitsToUpsert,unitIdsToRemove:mutation.unitIdsToRemove,tacticalCardRecordKeys:mutation.tacticalCardRecordKeys}),
      candidateHash:hash(candidateInput),purchasesChanged:false,planChanged:false,legalityApproved:false}:null};
}
// Writable arguments are a view of the stored Plan, not the stored object.
// These well-known fields are recomputed by constructors/Builder. Preserve
// every strategic field; reject other unknown fields through the normal schema.
export function projectRosterWorkflowDraftArgumentsV1(input,{planRecordEdits=true,identityRecordEdits=true,branchSelection=true,candidateSelection=true}={}){
  const mutation=clone(input),ignored=[];
  if(mutation?.plan?.lossResourceBudget&&!Object.hasOwn(mutation.plan.lossResourceBudget,'lossWindowConvention')){
    mutation.plan.lossResourceBudget.lossWindowConvention=null;
    ignored.push({path:'/plan/lossResourceBudget/lossWindowConvention',value:null,
      reason:'absent_author_convention_remains_unspecified_not_inferred'});
  }
  if(mutation?.plan?.lossResourceBudget&&!Object.hasOwn(mutation.plan.lossResourceBudget,'lossConsequencesText')){
    mutation.plan.lossResourceBudget.lossConsequencesText=null;
    ignored.push({path:'/plan/lossResourceBudget/lossConsequencesText',value:null,reason:'legacy_nullable_loss_explanation_no_edit'});
  }
  if(branchSelection&&mutation&&!Object.hasOwn(mutation,'rosterBranchSelection')){
    mutation.rosterBranchSelection=null;
    ignored.push({path:'/rosterBranchSelection',value:null,reason:'legacy_nullable_branch_selection_absent'});
  }
  if(candidateSelection&&mutation&&!Object.hasOwn(mutation,'rosterCandidateSelection')){
    mutation.rosterCandidateSelection=null;
    ignored.push({path:'/rosterCandidateSelection',value:null,reason:'legacy_nullable_candidate_selection_absent'});
  }
  if(planRecordEdits&&mutation?.plan&&!Object.hasOwn(mutation.plan,'componentPurposeEdits')){
    mutation.plan.componentPurposeEdits=null;
    ignored.push({path:'/plan/componentPurposeEdits',value:null,reason:'legacy_nullable_record_edit_absent'});
  }
  if(identityRecordEdits&&mutation?.plan)for(const key of editKeys){
    if(key==='componentPurposeEdits'||Object.hasOwn(mutation.plan,key))continue;
    mutation.plan[key]=null;
    ignored.push({path:`/plan/${key}`,value:null,reason:'legacy_nullable_identity_edit_absent'});
  }
  const derived={publicSummaryText:[],scoreRoute:['schema','scoreRouteHash','trainingTruth'],
    lossResourceBudget:['schema','lossResourceBudgetHash','trainingTruth','mineralSpendIntent','unspentResourceDisposition'],
    componentPurposes:['schema','purposeHash','trainingTruth'],
    deploymentConcept:['schema','deploymentConceptHash','trainingTruth'],
    opponentHypotheses:['schema','hypothesisHash','trainingTruth'],
    counterResponses:['schema','responseHash','trainingTruth'],
    invalidationTriggers:['schema','triggerHash','trainingTruth']};
  const writableSections=[...Object.entries(derived),...Object.entries(recordCollections).map(([section,spec])=>[spec.editKey,derived[section]])];
  for(const [section,keys] of writableSections){
    const value=editKeys.has(section)?mutation?.plan?.[section]?.upsert:mutation?.plan?.[section];
    for(const [index,row] of (Array.isArray(value)?value:[value]).entries()){
      if(!row||typeof row!=='object')continue;
      for(const key of keys)if(Object.hasOwn(row,key)){
        ignored.push({path:`/plan/${section}${editKeys.has(section)?'/upsert':''}${Array.isArray(value)?`/${index}`:''}/${key}`,value:clone(row[key]),reason:'host_recomputed_not_writable'});
        delete row[key];
      }
    }
  }
  return {mutation,ignored};
}
export function createRosterWorkflowDraftV1({candidateInput,plan=null,provenance=plan?.provenance,mode='editable',planId='workflow-plan',planningEntry='balanced'}){
  if(!['editable','fixed'].includes(mode)||!candidateInput||!provenance)fail('ROSTER_WORKFLOW_DRAFT_INITIAL_INVALID');
  if(mode==='fixed'&&!candidateInput.units?.length)fail('ROSTER_WORKFLOW_FIXED_ARMY_REQUIRED');
  return {schema:'roster_workflow_draft_v1',revision:0,rosterRevision:0,mode,planId:plan?.planId||planId,
    candidateInput:clone(candidateInput),provenance:clone(provenance),plan:clone(plan),planningEntry:normalizeRosterPlanningEntryV1(planningEntry),
    openingDeploymentSchedule:clone(plan?.openingDeploymentSchedule??null),
    pendingReviewSections:[],history:[],accepted:false};
}
// Strategic authors need the actual current Plan, not only planVersion in the
// catalogue summary. Public entry and investigation return share this shape.
export function projectRosterWorkflowAuthorDraftInputV1(draft){
  return {source:'literal',value:{revision:draft.revision,mode:draft.mode,
    rosterEditAuthority:draft.mode==='fixed'?'preset_immutable':'agent_may_reselect_after_evidence',
    candidateInput:clone(draft.candidateInput),plan:clone(draft.plan),
    planSynchronization:projectRosterPlanSynchronizationV1(draft),planningOptions:projectRosterPlanningEntryV1(draft)}};
}
export function projectRosterWorkflowDraftV1(draft){
  return {revision:draft.revision,rosterRevision:draft.rosterRevision,rosterEditAuthority:draft.mode==='fixed'?'preset_immutable':'agent_may_reselect_after_evidence',
    candidateInput:clone(draft.candidateInput),planVersion:draft.plan?.planVersion??null,
    requestedEndState:{targetMineralSpend:draft.candidateInput.mineralBudget,
      currentMineralSpend:draft.plan?.lossResourceBudget?.mineralSpendIntent?.plannedMineralSpend??0,
      requirementOwner:'user_generation_target_not_rules_legality',
      incompleteDraftAllowed:true,finalUnderTargetAllowed:false},
    pendingReviewSections:clone(draft.pendingReviewSections),planningOptions:projectRosterPlanningEntryV1(draft),accepted:false,
    instructions:'Submit only structured arguments. Null Plan fields mean retain exact existing content. Arrays replace a complete section, but cannot silently omit existing keyed records. For local edits use componentPurposeEdits, opponentHypothesisEdits, counterResponseEdits or invalidationTriggerEdits={upsert:[complete changed records],remove:[explicit identities]}, with the corresponding full array=null. Untouched records remain exact; intentional removal is allowed through remove. A draft is not a completed strategy. Army changes keep Plan versions synchronized and require affected review. Do not change the army just to demonstrate editing; retain it only for a strategic reason or preset_immutable.'};
}
// A changed Plan is not evidence that its rationale is correct. Review the
// exact latest commit, not only the resulting (possibly weaker) target values.
// Keep historical evidence references as references; this does not rebind or
// approve them against the current draft, nor choose a strategic target.
export function projectRosterWorkflowRevisionReviewV1({draft,draftRef}){
  const index=draft?.history?.findLastIndex(receipt=>receipt.applied===true
    &&receipt.afterRevision===draft.revision)??-1;
  if(index<0)return null;
  return {schema:'roster_workflow_revision_review_context_v1',version:1,
    draftRevision:draft.revision,sourceDraftRef:draftRef,sourcePointer:`/history/${index}`,
    receipt:clone(draft.history[index]),commitIsFactualApproval:false,
    commitIsStrategyImprovement:false,plannedTargetsAreObservations:false,
    instruction:'Review the exact reason and evidence for this latest committed change as well as its resulting current Plan sections. The receipt proves only that a structured edit was applied; its publicReason is the author\'s proposal, not a Native observation or an approved conclusion. Check any factual premise against the cited original measurements, with their original scope. Missing measurement is not a measured negative result or proof of unavailable capability. Declared targets, contingencies and risk preferences are authored intentions, not observed future outcomes; do not demand a played-out future match merely to declare a target. Equally, changing a target does not supply missing evidence for the claimed feasibility or benefit. Identify which assertions are supported, conditional, contradicted or still need a specific fact; do not automatically approve the change, force another change, or reduce targets to make an audit pass. Preserve necessary unknowns and return concrete feedback through the existing Teach/review protocol.'};
}
export function rosterWorkflowPlanRecordLossesV1({plan,mutation}){
  const losses=[];
  for(const [section,spec] of Object.entries(recordCollections)){
    const replacement=mutation?.plan?.[section];
    if(!Array.isArray(replacement))continue;
    const identity=row=>JSON.stringify(spec.identity.map(key=>row[key]));
    const present=new Set(replacement.map(identity));
    const removedRecords=(plan?.[section]??[]).filter(row=>!present.has(identity(row)));
    if(removedRecords.length)losses.push({section,editKey:spec.editKey,
      removedIdentities:removedRecords.map(row=>Object.fromEntries(spec.identity.map(key=>[key,row[key]]))),removedRecords:clone(removedRecords)});
  }
  return losses;
}
function editPlanRecords(current,patch,spec,section){
  const identity=row=>JSON.stringify(spec.identity.map(key=>row[key]));
  if(Array.isArray(patch)){
    if(new Set(patch.map(identity)).size!==patch.length)fail('ROSTER_WORKFLOW_PLAN_RECORD_DUPLICATE_EDIT',{section});
    return patch.map(spec.create);
  }
  const records=new Map(current.map(row=>[identity(row),clone(row)])),touched=new Set();
  for(const row of patch.remove){
    const key=identity(row);
    if(touched.has(key)||!records.has(key))fail('ROSTER_WORKFLOW_PLAN_RECORD_REMOVE_INVALID',{section,identity:row});
    touched.add(key);records.delete(key);
  }
  for(const row of patch.upsert){
    const key=identity(row);
    if(touched.has(key))fail('ROSTER_WORKFLOW_PLAN_RECORD_DUPLICATE_EDIT',{section,identity:row});
    touched.add(key);records.set(key,spec.create(row));
  }
  return [...records.values()];
}
export function rosterWorkflowDeclaredPlanChangeErrorsV1({beforePlan,afterPlan,beforeCandidate,afterCandidate,strategicChanges=[]}){
  const readPointer=(value,parts)=>{for(const key of parts){
    if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=value[key];
  }return value;};
  const unchangedClaims=[];
  for(const claim of strategicChanges){
    const pointer=claim.intentPath;
    if(typeof pointer!=='string'||!pointer.startsWith('/')||/~(?:[^01]|$)/u.test(pointer))continue;
    const parts=pointer.slice(1).split('/').map(k=>k.replace(/~1/gu,'/').replace(/~0/gu,'~'));
    // Strategic declarations may address either the army input or a Plan
    // section. Check the same submitted values in both domains; a changed
    // summary cannot turn an already selected upgrade into a new purchase.
    const candidatePath=parts[0]==='candidateInput';
    if(candidatePath||parts[0]==='plan')parts.shift();
    if(candidatePath){if(!beforeCandidate||!afterCandidate)continue;}
    else if(!Object.hasOwn(sectionSchemas,parts[0])||editKeys.has(parts[0]))continue;
    const before=readPointer(candidatePath?beforeCandidate:beforePlan,parts),
      after=readPointer(candidatePath?afterCandidate:afterPlan,parts);
    if(before!==undefined&&isDeepStrictEqual(before,after))unchangedClaims.push({intentPath:pointer,
      currentValue:clone(before),proposedValue:clone(after),declaredChange:clone(claim)});
  }
  return unchangedClaims;
}
export function applyRosterWorkflowDraftV1({draft,expectedRevision,mutation,publicReason,evidenceRefs=[],strategicChanges=[],builderPort,resolvedRosterBranch=null}){
  if(expectedRevision!==draft.revision)fail('ROSTER_WORKFLOW_DRAFT_STALE_REVISION',{expectedRevision,actual:draft.revision});
  mutation=projectRosterWorkflowDraftArgumentsV1(mutation).mutation;
  const checked=validate(ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1,mutation);
  if(!checked.ok)fail('ROSTER_WORKFLOW_DRAFT_ARGUMENT_INVALID',checked.issues);
  const losses=rosterWorkflowPlanRecordLossesV1({plan:draft.plan,mutation});
  if(losses.length)fail('ROSTER_WORKFLOW_IMPLICIT_PLAN_RECORD_REMOVAL',{losses,
    instruction:'The full replacement omits existing Plan records. Include unchanged records or use the named local edit field with the full array=null. Specify intentional removals by identity in remove; otherwise use upsert and remove=[]. The draft was not changed. Do not rewrite unrelated strategy or rerun evidence.'});
  if(!publicReason?.trim())fail('ROSTER_WORKFLOW_DRAFT_REASON_REQUIRED');
  if((mutation.rosterBranchSelection||mutation.rosterCandidateSelection)&&!resolvedRosterBranch)fail('ROSTER_WORKFLOW_RESOLVED_BRANCH_REQUIRED');
  if(mutation.rosterBranchSelection&&mutation.rosterCandidateSelection)fail('ROSTER_WORKFLOW_BRANCH_SELECTION_EDIT_CONFLICT');
  if(resolvedRosterBranch)mutation=projectRosterWorkflowSelectionEchoV1({mutation,candidateInput:resolvedRosterBranch.candidateInput,baseline:draft.candidateInput}).mutation;
  const candidate=clone(resolvedRosterBranch?.candidateInput??draft.candidateInput),byId=new Map(candidate.units.map(u=>[u.unitInstanceId,u]));
  const touched=new Set();
  for(const id of mutation.unitIdsToRemove){
    if(touched.has(id)||!byId.has(id))fail('ROSTER_WORKFLOW_DRAFT_UNIT_REMOVE_INVALID',id);
    touched.add(id);byId.delete(id);
  }
  for(const row of mutation.unitsToUpsert){
    if(touched.has(row.unitInstanceId))fail('ROSTER_WORKFLOW_DRAFT_DUPLICATE_UNIT_EDIT',row.unitInstanceId);
    touched.add(row.unitInstanceId);byId.set(row.unitInstanceId,projectRosterWorkflowNativeUnitEditV1(row));
  }
  candidate.units=[...byId.values()];
  if(mutation.tacticalCardRecordKeys!==null)candidate.tacticalCardRecordKeys=clone(mutation.tacticalCardRecordKeys);
  const armyChanged=!isDeepStrictEqual(candidate,draft.candidateInput);
  if(draft.mode==='fixed'&&armyChanged)fail('ROSTER_WORKFLOW_FIXED_ARMY_MUTATION_FORBIDDEN');
  const verdict=builderPort.evaluateRosterCandidate(candidate);
  if(verdict.status!=='legal'){
    // These fields are guaranteed by the model schema + this Adapter. Asking
    // the model to repair a missing Host-owned container cannot make progress.
    const adapterFault=verdict.portErrorCode==='ARMY_BUILDER_CANDIDATE_UPGRADE_LIST_INVALID';
    return {applied:false,status:adapterFault?'adapter_contract_error':'builder_rejected',verdict,
      correctionOwner:adapterFault?'engineering':'strategic_decision',draftUnchanged:true};
  }
  // Both profile-ID and name/kind inputs are valid Native Builder addresses.
  // A Plan consumes the CURRENT audit's canonical selection, not a second
  // interpretation of those inputs or a model-authored translation between them.
  let planUnits;
  try{planUnits=projectRosterWorkflowNativeCandidateUnitsV1({candidate,verdict});}
  catch(error){return {applied:false,status:'adapter_contract_error',code:error.code,verdict,
    correctionOwner:'engineering',draftUnchanged:true};}
  const patch=clone(mutation.plan);
  for(const [section,spec] of Object.entries(recordCollections)){
    if(patch[spec.editKey]!==null){
      if(patch[section]!==null)fail('ROSTER_WORKFLOW_PLAN_RECORD_WRITE_MODE_CONFLICT',{section,
        instruction:`Choose ${spec.editKey} with ${section}=null, or a complete replacement array with ${spec.editKey}=null.`});
      patch[section]=patch[spec.editKey];
    }
    delete patch[spec.editKey];
  }
  const requestedSections=Object.keys(patch).filter(k=>patch[k]!==null);
  const unchanged=()=>({applied:false,status:'draft_unchanged',beforeRevision:draft.revision,afterRevision:draft.revision,
    armyChanged:false,armyBeforeHash:hash(draft.candidateInput),armyAfterHash:hash(draft.candidateInput),
    planBeforeHash:draft.plan?.planHash??null,planAfterHash:draft.plan?.planHash??null,
    revisedSectionKeys:[],requestedSectionKeys:requestedSections,publicReason,evidenceRefs:clone(evidenceRefs),
    draftUnchanged:true,acceptanceGranted:false,strategyImprovementProven:false});
  const rosterCandidate=createRosterCandidateV1({...candidate,units:planUnits,
    candidateId:(!armyChanged&&draft.plan?.rosterCandidate?.candidateId)||`${draft.planId}:army-${draft.rosterRevision+(armyChanged?1:0)}`,
    legalityStatus:'legal',legalityReceipt:{auditResultHash:verdict.auditResultHash}});
  const canonicalCandidateChanged=!rosterWorkflowPlanCandidateMatchesNativeV1({actual:draft.plan?.rosterCandidate,expected:rosterCandidate});
  if(!armyChanged&&!canonicalCandidateChanged&&!requestedSections.length)return unchanged();
  const sections=clone(draft.plan||{});
  if(patch.publicSummaryText!==null)sections.publicSummaryText=patch.publicSummaryText;
  if(!sections.publicSummaryText)fail('ROSTER_WORKFLOW_INITIAL_PLAN_INTENT_REQUIRED');
  const factories={scoreRoute:createRosterScoreRouteV1,deploymentConcept:createRosterDeploymentConceptV1,
    ...Object.fromEntries(Object.entries(recordCollections).map(([section,spec])=>[section,v=>editPlanRecords(sections[section]??[],v,spec,section)]))};
  for(const [key,factory] of Object.entries(factories))if(patch[key]!==null)sections[key]=factory(patch[key]);
  const loss=patch.lossResourceBudget??sections.lossResourceBudget;
  const retainedLossExplanation=loss&&loss.lossConsequencesText==null
    &&Object.hasOwn(sections.lossResourceBudget??{},'lossConsequencesText')
    ?{lossConsequencesText:sections.lossResourceBudget.lossConsequencesText}:{};
  if(loss)sections.lossResourceBudget=createRosterLossResourceBudgetV1({...loss,...retainedLossExplanation,mineralSpendIntent:{status:'declared',
    mineralBudget:candidate.mineralBudget,plannedMineralSpend:verdict.summary.mineralSpent}});
  // Supplied does not mean changed. Constructors normalize writable arguments
  // before comparing; metadata/version churn is not evidence of progress.
  // Compare EVERY strategic section, including Host-derived budget effects.
  const changed=Object.keys(sectionSchemas).filter(k=>!editKeys.has(k)&&!isDeepStrictEqual(sections[k],draft.plan?.[k]));
  // Compare declared changes with the SAME normalized sections that will be
  // committed. A fluent before/after story cannot make an unchanged record a
  // new strategic repair. This checks factual deltas, not tactical merit.
  if(draft.plan){
    const unchangedClaims=rosterWorkflowDeclaredPlanChangeErrorsV1({beforePlan:draft.plan,afterPlan:sections,
      beforeCandidate:draft.candidateInput,afterCandidate:candidate,strategicChanges});
    if(unchangedClaims.length)fail('ROSTER_WORKFLOW_DECLARED_PLAN_CHANGE_UNCHANGED',{
      unchangedClaims,actualChangedSections:changed,actualArmyChanged:armyChanged,
      actualResourceSpend:{minerals:verdict.summary.mineralSpent,vespene:verdict.summary.vespeneSpent},acceptanceGranted:false,
      instruction:'The claimed change is already present in the actual current army or Plan. Its submitted value is unchanged; the exact selected inventory and Native resource spend below are authoritative. Do not repeat this before/after story or rewrite a synonym to imply strategic progress. Correct the claim and decide the remaining assigned issue: explicitly redesign an unsuitable experiment/use mapping, justify retention/closure, or make a genuinely needed Plan change. No comparison was measured or approved; preserve unresolved facts. The original reply is retained and this draft was not committed.'});
  }
  if(!armyChanged&&!canonicalCandidateChanged&&!changed.length)return unchanged();
  const unitIds=new Set(candidate.units.map(u=>u.unitInstanceId));
  // References are explicit. The host never silently removes an old unit's plan.
  for(const purpose of sections.componentPurposes||[])if(purpose.componentKind==='unit'&&!unitIds.has(purpose.instanceId))
    fail('ROSTER_WORKFLOW_PLAN_REFERENCES_REMOVED_UNIT',purpose.instanceId);
  for(const step of sections.deploymentConcept?.activationOrder||[])if(!unitIds.has(step.unitInstanceId))
    fail('ROSTER_WORKFLOW_PLAN_REFERENCES_REMOVED_UNIT',step.unitInstanceId);
  const nextVersion=(draft.plan?.planVersion||0)+1;
  const revisedSectionKeys=[...(armyChanged||canonicalCandidateChanged?['rosterCandidate']:[]),...changed];
  const revisions=[...(draft.plan?.revisions||[])];
  if(draft.plan){
    // A seeded Plan can already have revisions before this workflow starts.
    const versionId=`workflow-revision-${nextVersion}`;
    const revisionId=revisions.some(revision=>revision.revisionId===versionId)
      ?`${versionId}-${draft.plan.planHash}`:versionId;
    revisions.push(createRosterPlanRevisionEventV1({revisionId,planId:draft.planId,
      fromPlanVersion:draft.plan.planVersion,toPlanVersion:nextVersion,previousPlanHash:draft.plan.planHash,
      reasonText:publicReason,triggerIds:[],revisedSectionKeys}));
  }
  const plan=createRosterPlanV1({...sections,planId:draft.planId,planVersion:nextVersion,planStatus:'draft',sideKey:candidate.sideKey,
    provenance:draft.provenance,rosterCandidate,revisions,budgetAcceptance:null});
  const pending=new Set(draft.pendingReviewSections);
  changed.forEach(k=>pending.add(k));
  if(armyChanged||canonicalCandidateChanged)for(const k of ['scoreRoute','componentPurposes','deploymentConcept','lossResourceBudget','counterResponses','openingDeploymentSchedule'])pending.add(k);
  const receipt={applied:true,status:'draft_committed',beforeRevision:draft.revision,afterRevision:draft.revision+1,
    armyChanged,canonicalCandidateChanged,armyBeforeHash:hash(draft.candidateInput),armyAfterHash:hash(candidate),planBeforeHash:draft.plan?.planHash??null,
    planAfterHash:plan.planHash,revisedSectionKeys,publicReason,evidenceRefs:clone(evidenceRefs),
    retainedSectionReasons:clone(mutation.retainedSectionReasons),builderVerdictHash:verdict.verdictHash,
    rosterSelectionSource:{kind:'current_native_builder_audit',auditResultHash:verdict.auditResultHash,
      candidateInputPreserved:true,hostSelectedNewUnits:false},
    ...(resolvedRosterBranch?{rosterBranchSelection:clone(resolvedRosterBranch.receipt)}:{}),
    mineralSpent:verdict.summary.mineralSpent,vespeneSpent:verdict.summary.vespeneSpent,
    semanticReviewStillRequired:true,acceptanceGranted:false};
  return {applied:true,receipt,verdict,draft:{...clone(draft),revision:draft.revision+1,
    rosterRevision:draft.rosterRevision+(armyChanged?1:0),candidateInput:candidate,plan,
    planSynchronization:updateRosterPlanSynchronizationV1({draft,candidate,verdict,revision:draft.revision+1,armyChanged,changedSections:changed}),
    openingDeploymentSchedule:armyChanged?null:clone(draft.openingDeploymentSchedule),
    pendingReviewSections:[...pending],history:[...draft.history,receipt],accepted:false}};
}
