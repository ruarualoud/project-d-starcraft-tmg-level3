// Candidate choice belongs to the strategic author; Builder supplies facts.
// A fact method may select technical search bounds, not silently change armies.
import {ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1,projectRosterWorkflowNativeUnitEditV1} from './roster-workflow-draft-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1,rosterBudgetBranchSearchScopeV1} from './roster-budget-branch-query-v1.mjs';
const clone=structuredClone,props=ROSTER_WORKFLOW_DRAFT_MUTATION_SCHEMA_V1.properties;
const strings={type:'array',minItems:0,items:{type:'string',minLength:1,maxLength:65536}};
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ROSTER_BUILDER_INQUIRY_QUERY_SCHEMA_V1={anyOf:[obj({
  operation:{type:'string',minLength:1,maxLength:65536,enum:['builder_audit','builder_branches']},
  baseEvidenceNumber:{type:'integer',minimum:0,maximum:1000000,
    description:'0 explicitly selects the current formal draft (possibly empty). Positive selects a saved builder_audit candidate by evidence number, not the most recent candidate.'},
  unitsToUpsert:clone(props.unitsToUpsert),unitIdsToRemove:clone(props.unitIdsToRemove),
  tacticalCardEdits:obj({add:strings,remove:strings}),
}),{type:'null'}]};
export const ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1='For candidate_audit, YOU own the exact candidateQuery: choose builder_audit or builder_branches, baseEvidenceNumber (0=current formal draft, positive=chosen saved builder_audit), explicit unitsToUpsert/unitIdsToRemove and tacticalCardEdits add/remove. Unmentioned choices remain unchanged. The fact method cannot choose replacements or fill a budget for you. Native supplies actual legal costs/capacity, including selected cards; bare faction slots are not a candidate verdict. Branch search returns alternatives, not an adopted strategy. A legal partial-budget army may be selected with rosterCandidateSelection and a preliminary Plan through revise; final exact budget remains required. Merely saying adopt does not mutate the draft. Candidate query is a private proposal, not a formal edit or approval. '
  +'builder_branches never searches '+rosterBudgetBranchSearchScopeV1().excludedOperations.join(', ')+'. For such an alternative, YOU must supply the concrete unit/card changes and audit the resulting candidate (or search around that changed legal baseline). Empty changes do not authorize a removal/replacement search. Technical bounds and prose cannot enable an unsupported mutation family; the fact method must return that limitation to you, not choose another army. An unchanged page reuses its saved result and is not another experiment.';
export function rosterBuilderInquiryErrorV1(decision,{requiredVersion=0}={}){
  const next=decision.nextInvestigation;if(!next)return null;
  const needed=next.proofContract?.obligations?.some(o=>o.observation==='candidate_audit');
  const query=next.candidateQuery;
  if(needed&&!query&&(requiredVersion||Object.hasOwn(next,'candidateQuery')))
    return {code:'candidate_audit_requires_author_selection',instruction:ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1};
  if(query==null)return null;
  if(!needed||!validate(ROSTER_BUILDER_INQUIRY_QUERY_SCHEMA_V1.anyOf[0],query).ok)
    return {code:'candidate_query_contract_invalid',instruction:ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1};
  if(query.baseEvidenceNumber&&!decision.evidenceNumbers?.includes(query.baseEvidenceNumber))
    return {code:'candidate_query_source_not_cited',number:query.baseEvidenceNumber,
      instruction:'Cite and read the exact baseline candidate you selected. Do not infer it from a summary or select a different candidate silently.'};
  return null;
}
// An author-bound fact method selects only technical query bounds. Its public
// interface and compiler share this definition; candidate choices remain with
// the strategic author, even across queued jobs and cold recovery.
export const ROSTER_BUILDER_METHOD_INSTRUCTION_V1='The strategic author has already selected the exact candidate baseline and edits in builderCandidateAuthority.query. You are the fact-method role: execute only that operation, with empty arguments for builder_audit or technical builder_branches bounds. Do not supply candidateInput, candidateEdits or candidate bindings. Host binds the author choice. Empty legacy edit fields are accepted as no-ops, never as cancellation of author edits. Return measured results (including no matching branch) or strategy_required; you cannot choose another army. Generic candidate-edit documentation applies only to unbound queries.';
const boundFields=operation=>operation==='builder_branches'?Object.keys(ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1.properties):[];
function emptyCandidateEdits(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  return Object.entries(value).every(([key,v])=>['unitsToUpsert','unitIdsToRemove','unitUpgradeEdits'].includes(key)
    ?Array.isArray(v)&&v.length===0:key==='tacticalCardEdits'&&v&&typeof v==='object'&&!Array.isArray(v)
      &&Object.entries(v).every(([k,a])=>['add','remove'].includes(k)&&Array.isArray(a)&&a.length===0));
}
export function projectRosterBuilderMethodAssignmentV1(assignment){
  const binding=assignment.inputs?.builderCandidateAuthority,authority=binding?.value;
  if(assignment.role!=='roster_workflow_experiment_planner'||authority?.version!==1||!authority.query)return assignment;
  const operation=authority.query.operation,fields=boundFields(operation);
  const inputSchema={type:'object',additionalProperties:false,required:[],properties:Object.fromEntries(fields.map(k=>[k,clone(ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1.properties[k])]))};
  const inputs={...assignment.inputs,builderCandidateAuthority:{...binding,value:{...authority,instruction:ROSTER_BUILDER_METHOD_INSTRUCTION_V1}},
    builderMethodContract:{source:'literal',value:{version:1,operation,inputSchema,bindingsAllowed:false,
      hostOwned:['candidateInput','candidateEdits'],authorQuery:clone(authority.query),interfaceOnly:true,
      instruction:ROSTER_BUILDER_METHOD_INSTRUCTION_V1}}};
  if(inputs.selectedMethodContracts?.value?.contracts)inputs.selectedMethodContracts={...inputs.selectedMethodContracts,
    value:{...inputs.selectedMethodContracts.value,contracts:inputs.selectedMethodContracts.value.contracts.map(entry=>{
      if(entry.operation!==operation)return entry;
      const {candidateRevision,...contract}=entry.contract;
      return {...entry,scopeProjection:'author_bound_method_v1',contract:{...contract,inputSchema:clone(inputSchema),
        argumentsShape:Object.fromEntries(fields.map(k=>[k,contract.argumentsShape[k]])),
        candidateOwnership:ROSTER_BUILDER_METHOD_INSTRUCTION_V1}};
    })}};
  return {...assignment,inputs};
}
export function projectRosterBuilderInquiryStepV1(step,authority,{nativeUnits=true}={}){
  const query=authority?.version===1?authority.query:null;
  if(!query||!['builder_audit','builder_branches','candidate_context'].includes(step.operation))return step;
  const args=JSON.parse(step.argumentsJson),allowed=boundFields(step.operation);
  // Compatibility for semantically empty old model fields, not an override.
  if(Object.hasOwn(args,'candidateEdits')&&emptyCandidateEdits(args.candidateEdits))delete args.candidateEdits;
  if(step.operation!==query.operation||Object.keys(args).some(k=>!allowed.includes(k))||step.bindings?.length)
    throw Object.assign(Error('ROSTER_WORKFLOW_BUILDER_CANDIDATE_AUTHOR_OWNERSHIP'),{
      code:'ROSTER_WORKFLOW_BUILDER_CANDIDATE_AUTHOR_OWNERSHIP',dispatchOutcome:'not_dispatched',
      detail:{stepId:step.stepId,authorQuery:clone(query),
        instruction:'The strategic author already chose this exact baseline and changes. Use the authorized operation with empty arguments (or technical builder_branches bounds only), no candidate overrides or bindings. Host binds the saved baseline and explicit edits. If these choices cannot answer the question, return strategy_required with the actual issue; do not select a different army.'}});
  return {...step,argumentsJson:JSON.stringify({...args,candidateEdits:{
    unitsToUpsert:nativeUnits?query.unitsToUpsert.map(projectRosterWorkflowNativeUnitEditV1):clone(query.unitsToUpsert),
    unitIdsToRemove:clone(query.unitIdsToRemove),tacticalCardEdits:clone(query.tacticalCardEdits)}}),
    bindings:query.baseEvidenceNumber?[{argumentPointer:'/candidateInput',fromStepId:'',
      fromEvidenceNumber:query.baseEvidenceNumber,resultPointer:'/request/candidateInput'}]:[]};
}

const authorDeltaErrors=new Set(['ROSTER_WORKFLOW_CANDIDATE_UNIT_NOT_FOUND',
  'ROSTER_WORKFLOW_CANDIDATE_UNIT_EDIT_CONFLICT','ROSTER_WORKFLOW_CANDIDATE_CARD_REMOVE_INVALID']);
// A fact-method child cannot alter a candidate explicitly locked by its
// strategic author. Return the exact rejected selection, not another attempt
// at serializing it. No replacement baseline, deletion or roster is inferred.
export function projectRosterBuilderAuthorFailureV1({request,failure}){
  const authority=request?.builderCandidateAuthority,query=authority?.query;
  // A search's Native audit can reject the AUTHOR'S baseline before branch
  // enumeration. A method cannot fix this by reserializing or changing cards.
  // Keep the real audit; it is a negative result, not an unexecuted audit.
  const sourceId=authority?.sourceDecision?.workId
    ??(authority?.sourceDecision?.evidenceId?.startsWith('role:')?authority.sourceDecision.evidenceId.slice(5):null);
  if(authority?.version===1&&sourceId&&query?.operation==='builder_branches'
    &&request.operation===query.operation&&failure?.operation===query.operation
    &&failure.code==='ROSTER_BUDGET_BRANCH_BASELINE_NOT_RULES_LEGAL'
    &&failure.queryRepair?.sourceContract==='native_builder_branch_legal_baseline_v1'
    &&failure.queryRepair.baselineAudit?.status==='illegal'
    &&failure.queryRepair.baselineAudit?.rulesAuthority){
    let expected;
    try{expected=JSON.parse(projectRosterBuilderInquiryStepV1({operation:query.operation,
      argumentsJson:'{}',bindings:[]},authority).argumentsJson).candidateEdits;}catch{return null;}
    if(!isDeepStrictEqual(expected,request.args?.candidateEdits)
      ||!isDeepStrictEqual(expected,failure.submittedArguments?.candidateEdits)
      ||!isDeepStrictEqual(failure.request?.candidateInput,failure.queryRepair.candidateInput)
      ||!isDeepStrictEqual(failure.detail?.baselineAudit,failure.queryRepair.baselineAudit))return null;
    return {correctable:false,controlReturn:true,sourceContract:'roster_builder_author_candidate_v2',
      failureClass:'author_candidate_baseline_illegal',resolutionRequired:'author_candidate_decision',
      nativeAuditExecuted:true,branchSearchExecuted:false,originalQueryNotAnswered:true,originalCode:failure.code,
      sourceDecision:{...clone(authority.sourceDecision),workId:sourceId},authorQuery:clone(query),
      nativeRejection:clone(failure.queryRepair.baselineAudit),
      instruction:'Native actually audited the author-selected baseline and rejected it. The requested branch search therefore did not run. Its chosen card/unit edits belong to the strategic author, not the parameter-repair role. Return the exact negative audit and original question to that author through strategy_required. Do not repeat this baseline, change the selected cards/units as technical repair, infer that all armies are impossible, or clear the remaining construction goal. The author must explicitly choose a different candidate for Native audit. The formal army/Plan is unchanged; no legality, branch result or strategy approval is granted.'};
  }
  if(authority?.version!==1||!authority.sourceDecision?.workId
    ||!['builder_audit','builder_branches'].includes(query?.operation)
    ||request.operation!==query.operation||failure?.operation!==query.operation
    ||failure.executed!==false||failure.nativeSuccess!==false
    ||failure.queryRepair?.sourceContract!=='builder_candidate_delta_v1'
    ||!authorDeltaErrors.has(failure.code))return null;
  let expected;
  try{expected=JSON.parse(projectRosterBuilderInquiryStepV1({operation:query.operation,
    argumentsJson:'{}',bindings:[]},authority).argumentsJson).candidateEdits;}catch{return null;}
  if(!isDeepStrictEqual(expected,request.args?.candidateEdits)
    ||!isDeepStrictEqual(expected,failure.request?.candidateEdits))return null;
  return {correctable:false,controlReturn:true,sourceContract:'roster_builder_author_candidate_v1',
    failureClass:'author_candidate_input_invalid',resolutionRequired:'author_candidate_decision',
    nativeExecuted:false,originalQueryNotAnswered:true,originalCode:failure.code,
    sourceDecision:clone(authority.sourceDecision),authorQuery:clone(query),
    instruction:'The author-selected candidate delta failed BEFORE Native audit. Its baseline and unit/card edits belong to the strategic author; the fact-method repair role cannot change them. Return the unchanged query, exact diagnostic and original question to that author. The author must explicitly correct the selected baseline/delta or choose a justified different action. Do not retry the identical query, silently remove edits, assume legality/costs, or reset local attempts. The original candidate and Plan are unchanged; this control return approves neither.'};
}
export function isRosterBuilderAuthorFailureReturnV1(failure){
  const repair=failure?.error?.queryRepair,request=failure?.originalRequest;
  if(repair?.sourceContract==='roster_builder_author_candidate_v2'){
    const expected=projectRosterBuilderAuthorFailureV1({request,failure:failure.observedToolFailure});
    return failure.error.dispatchOutcome==='completed_illegal_baseline'
      &&expected!==null&&isDeepStrictEqual(repair,expected);
  }
  if(failure?.error?.dispatchOutcome!=='not_dispatched'
    ||repair?.sourceContract!=='roster_builder_author_candidate_v1')return false;
  const expected=projectRosterBuilderAuthorFailureV1({request,failure:{operation:request?.operation,
    executed:false,nativeSuccess:false,code:failure.error.code,request:request?.args,
    queryRepair:{sourceContract:'builder_candidate_delta_v1'}}});
  return expected!==null&&isDeepStrictEqual(repair,expected);
}
