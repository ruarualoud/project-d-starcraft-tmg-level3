// The joint owner selects the question; the fact role selects a bounded method.
// Do not send the owner's entire retain/revise argument as a proposed factual
// answer. Author and coverage reviewer must receive the SAME pending predicates.
const clone=value=>structuredClone(value);
import {isDeepStrictEqual} from 'node:util';
import {projectRosterInvestigationScopeLineageV1,rosterInvestigationScopeContinuityErrorV1} from './roster-investigation-scope-continuity-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterPendingQuestionWorkV1,rosterScopedInquiryPredicatesV1} from './roster-review-data-questions-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
import {ROSTER_BUILDER_INQUIRY_QUERY_SCHEMA_V1,ROSTER_BUILDER_INQUIRY_INSTRUCTION_V1,ROSTER_BUILDER_METHOD_INSTRUCTION_V1,rosterBuilderInquiryErrorV1} from './roster-builder-inquiry-v1.mjs';
import {projectRosterBuilderCandidateFactsV1} from './roster-builder-candidate-facts-v1.mjs';
const text={type:'string',minLength:1,maxLength:65536};
// Release necessity and explicit query authority are separate. An owner may
// investigate a selected optional probe without turning it into a mandatory
// release fact. Its local observation/proof remains required for THAT query.
const selectableFactQuestion=q=>['necessary_fact','optional_probe'].includes(q?.classification);
export const ROSTER_NEXT_INVESTIGATION_SCHEMA_V1={anyOf:[{
  type:'object',additionalProperties:false,
  description:'Explicit authorization of ONE bounded inquiry, not the whole pending-question ledger. Select 1-based necessary_fact or optional_probe entries. For a selected optional probe, a complete proofContract defines the local factual subquery; the parent remains optional and is not answered by that subquery. State the decision enabled, missing observation and stop point. This authorizes no whole-match simulation or automatic lifecycle. Null when no inquiry is authorized.',
  properties:{questionNumbers:{type:'array',minItems:1,items:{type:'integer',minimum:1,maximum:1000000}},
    decisionToEnable:text,whyExistingEvidenceInsufficient:text,expectedNewObservation:text,stopWhen:text},
  required:['questionNumbers','decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen']
},{type:'null'}]};

// One machine-readable obligation per selected ledger question. The author owns
// the claim/conditions/decision consequences; Host never chooses a strategy or
// upgrades an observation to a proof. V1 is retained for immutable paid replies.
const proofRequirements=Object.freeze({
  source_rule:['source_fact'],map_geometry:['source_fact'],current_legality:['state_verdict'],
  route_feasibility:['conditional_witness','proven_bound'],
  arrival_round:['conditional_witness','proven_bound'],
  earliest_arrival:['optimality_proof'],marker_control:['state_verdict'],
  contextual_supply:['state_verdict'],deployment_capacity:['state_verdict'],
  current_action_arrival:['conditional_witness'],
  combat_estimate:['quantitative_observation'],resource_arithmetic:['quantitative_observation'],
  candidate_audit:['state_verdict'],conditional_comparison:['paired_comparison'],
});
const strictObject=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V1=strictObject({
  version:{type:'integer',minimum:1,maximum:1,enum:[1]},
  obligations:{type:'array',minItems:1,items:strictObject({
    questionNumber:{type:'integer',minimum:1,maximum:1000000},
    planClaimPath:{...text,description:'The Plan claim/decision this inquiry supports, rooted at /plan/. Not a new question identity.'},
    observation:{...text,enum:Object.keys(proofRequirements)},
    proofRequirement:{...text,enum:[...new Set(Object.values(proofRequirements).flat())]},
    conditions:{type:'array',minItems:0,items:text,
      description:'Explicit fixed scene, participant/resource/interference premises. These are assumptions, not measured facts.'},
    roundScope:strictObject({kind:{...text,enum:['not_applicable','current_state','bounded_rounds']},
      throughRound:{anyOf:[{type:'integer',minimum:1,maximum:1000000},{type:'null'}]}}),
    ifSupported:{...text,description:'How a supported answer would influence the author decision; not a forced edit.'},
    ifRefuted:{...text,description:'How a genuinely refuted answer would influence the decision. Inconclusive is not refuted.'},
  })},
});
const inquiryV1=ROSTER_NEXT_INVESTIGATION_SCHEMA_V1.anyOf[0];
export const ROSTER_NEXT_INVESTIGATION_SCHEMA_V2={anyOf:[{
  ...clone(inquiryV1),properties:{...clone(inquiryV1.properties),proofContract:ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V1},
  required:[...inquiryV1.required,'proofContract'],
},{type:'null'}]};
export const ROSTER_NEXT_INVESTIGATION_SCHEMA_V3={anyOf:[{
  ...clone(ROSTER_NEXT_INVESTIGATION_SCHEMA_V2.anyOf[0]),
  properties:{...clone(ROSTER_NEXT_INVESTIGATION_SCHEMA_V2.anyOf[0].properties),candidateQuery:ROSTER_BUILDER_INQUIRY_QUERY_SCHEMA_V1},
  required:[...ROSTER_NEXT_INVESTIGATION_SCHEMA_V2.anyOf[0].required,'candidateQuery'],
},{type:'null'}]};
export const ROSTER_SPATIAL_PROOF_OBSERVATIONS_V2=['current_action_arrival','arrival_round','earliest_arrival','marker_control'];
// Normalize only an inactive protocol field. The selected observation/proof,
// original question and decision consequences stay authored and unchanged.
// Source geometry is never promoted to a route, arrival or control witness.
export function projectRosterInactiveSpatialScopeV1(output){
  if(!Array.isArray(output?.decisions))return {output,projection:[]};
  const next=clone(output),projection=[];
  for(const [i,decision]of next.decisions.entries()){
    const contract=decision.nextInvestigation?.proofContract;
    if(contract?.version!==2||!Array.isArray(contract.obligations))continue;
    for(const [j,obligation]of contract.obligations.entries()){
      if(!Object.hasOwn(proofRequirements,obligation.observation)
        ||ROSTER_SPATIAL_PROOF_OBSERVATIONS_V2.includes(obligation.observation)
        ||obligation.spatialScope===null||obligation.spatialScope===undefined)continue;
      projection.push({to:'/decisions/'+i+'/nextInvestigation/proofContract/obligations/'+j+'/spatialScope',
        original:clone(obligation.spatialScope),value:null,observation:obligation.observation,
        proofRequirement:obligation.proofRequirement,rule:'host_inactive_spatial_scope_v1',
        scopeUsedAsEvidence:false,claimAnswered:false,acceptanceGranted:false});
      obligation.spatialScope=null;
    }
  }
  return {output:projection.length?next:output,projection};
}

const spatialScopeSchema={anyOf:[strictObject({
  unitIds:{type:'array',minItems:1,items:text},markerIds:{type:'array',minItems:1,items:text},
  relation:{...text,enum:['single_unit_single_target','independent_legs','joint_state']},
}),{type:'null'}]};
export const ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V2=strictObject({
  version:{type:'integer',minimum:2,maximum:2,enum:[2]},
  obligations:{type:'array',minItems:1,items:strictObject({
    ...clone(ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V1.properties.obligations.items.properties),
    spatialScope:spatialScopeSchema,
  })},
});
export const ROSTER_NEXT_INVESTIGATION_SCHEMA_V4={anyOf:[{
  ...clone(ROSTER_NEXT_INVESTIGATION_SCHEMA_V3.anyOf[0]),properties:{
    ...clone(ROSTER_NEXT_INVESTIGATION_SCHEMA_V3.anyOf[0].properties),proofContract:ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V2},
},{type:'null'}]};
export const ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V2='Use proofContract version=2. For arrival/control identify the EXACT unitIds, markerIds and spatialScope.relation. A single unit means all its actual models; a multi-unit gunline is an explicit set of unit IDs. Independent legs, especially from different hypothetical states, do NOT prove one simultaneous joint state. An unresolved aggregate stays with its author. Do not silently narrow an original joint claim to fit a single-unit tool. For other observations spatialScope=null; Host discards a supplied inactive spatialScope as protocol metadata while preserving its raw value. map_geometry/source_fact reads map geometry only: it does not establish any route witness, arrival round or marker control. Those stronger claims remain unproved until separately supported; prose about a desired future route is not a measured result. The observation/proof/round/conditions and decision-consequence requirements below still apply; only the protocol version and explicit spatial scope are upgraded. ';
export const ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V1='Every new authorized inquiry has proofContract version=1 with exactly one obligation for each selected questionNumber. Bind the original ledger question to a /plan/ claim, observation kind, required proof, explicit conditions and roundScope; say how supported/refuted results affect YOUR choice. source_rule needs source_fact; current_legality/marker_control/contextual_supply/deployment_capacity/candidate_audit need state_verdict; route_feasibility/arrival_round need conditional_witness or proven_bound; current_action_arrival needs conditional_witness in current_state and only asks about the selected current action; earliest_arrival needs optimality_proof; combat_estimate/resource_arithmetic need quantitative_observation; conditional_comparison needs paired_comparison. contextual_supply names the unit and actual Native context; deployment_capacity means the current side deployment pool, not marker eligibility or control. Do not replace either with arithmetic on guessed values. arrival_round/earliest_arrival need bounded_rounds and an explicit throughRound; other horizons must honestly match the question. A legal witness does not prove earliest arrival, no candidate is not impossibility, and capability discovery is not current legality. An inconclusive/unsupported result returns the exact pending obligation to its owner, never converts it to refuted or approved. This contract requests evidence; it does not assert tool support, authorize a whole match, fabricate future VP, or approve a Plan.';

function proofContractError(next,requiredVersion){
  const proofInstruction=requiredVersion>=2?ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V2+' '+ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V1.replace('version=1','version=2'):ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V1;
  if(!Object.hasOwn(next,'proofContract'))return requiredVersion?{
    code:'investigation_proof_contract_required',requiredVersion,
    instruction:proofInstruction}:null;
  const contract=next.proofContract;
  if(requiredVersion>=2&&contract?.version!==2)return {code:'investigation_proof_contract_required',requiredVersion,
    instruction:ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V2};
  const checked=validate(contract?.version===2?ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V2:ROSTER_INVESTIGATION_PROOF_CONTRACT_SCHEMA_V1,contract);
  if(!checked.ok)return {code:'investigation_proof_contract_invalid',issues:checked.issues,
    instruction:proofInstruction};
  const numbers=contract.obligations.map(o=>o.questionNumber);
  if(new Set(numbers).size!==numbers.length||numbers.length!==next.questionNumbers.length
    ||numbers.some(n=>!next.questionNumbers.includes(n)))return {
    code:'investigation_proof_question_coverage',selectedQuestionNumbers:clone(next.questionNumbers),
    obligationQuestionNumbers:numbers,instruction:'Exactly one obligation for EACH authorized original question, no extra/duplicate/replaced question. Keep unselected ledger entries unchanged.'};
  for(const obligation of contract.obligations){
    const detail={questionNumber:obligation.questionNumber,planClaimPath:obligation.planClaimPath};
    if(contract.version===2){
      const spatial=obligation.spatialScope,required=ROSTER_SPATIAL_PROOF_OBSERVATIONS_V2.includes(obligation.observation);
      if(required!==Boolean(spatial)||spatial&&(['unitIds','markerIds'].some(k=>new Set(spatial[k]).size!==spatial[k].length)
        ||spatial.relation==='single_unit_single_target'&&(spatial.unitIds.length!==1||spatial.markerIds.length!==1)))
        return {code:'investigation_spatial_scope_invalid',...detail,instruction:ROSTER_INVESTIGATION_PROOF_INSTRUCTION_V2};
    }
    if(!obligation.planClaimPath.startsWith('/plan/')||obligation.planClaimPath.length<=6)
      return {code:'investigation_proof_claim_path',...detail};
    if(!proofRequirements[obligation.observation].includes(obligation.proofRequirement))return {
      code:'investigation_proof_requirement_mismatch',...detail,
      allowedProofRequirements:clone(proofRequirements[obligation.observation]),
      instruction:'Do not relabel the question to suit a weaker tool. Select the proof actually required by the current claim.'};
    const horizon=obligation.roundScope;
    if((horizon.kind==='bounded_rounds')!==(horizon.throughRound!==null))
      return {code:'investigation_proof_round_scope_invalid',...detail};
    if(['arrival_round','earliest_arrival'].includes(obligation.observation)&&horizon.kind!=='bounded_rounds')
      return {code:'investigation_arrival_scope_required',...detail,
        instruction:'Declare a finite throughRound for an arrival inquiry. A single current-state menu cannot prove the arrival round or earliest arrival.'};
    if(obligation.observation!=='source_rule'&&!obligation.conditions.length)
      return {code:'investigation_proof_conditions_required',...detail};
  }
  return null;
}

// Both the model-return validator and factual-input projection use this exact
// authorization. Unresolved obligations are inventory, not automatic dispatch.
export function projectRosterInvestigationSelectionV1(decision){
  const ledger=decision.dataQuestions??[];
  const selected=Array.isArray(decision.nextInvestigation?.questionNumbers)?decision.nextInvestigation.questionNumbers:[];
  return {version:1,selectedQuestions:selected.map(questionNumber=>({questionNumber,
    question:Number.isSafeInteger(questionNumber)?ledger[questionNumber-1]?.question??null:null,
    classification:Number.isSafeInteger(questionNumber)?ledger[questionNumber-1]?.classification??null:null})),
    eligibleQuestionNumbers:ledger.flatMap((q,i)=>selectableFactQuestion(q)?[i+1]:[]),
    nextAppendedQuestionNumber:ledger.length+1,
    instruction:'These are exact current ledger addresses, not strategic recommendations. Select a necessary_fact or an optional_probe you deliberately want to investigate. A selected optional probe MUST have a complete proofContract, concrete expectedNewObservation and stopWhen; these own its local factual subquery, while the parent stays optional/unproven. Do not relabel the parent as mandatory merely to use a tool. An answered_fact cannot authorize the same query. A genuinely different question may be appended with its own classification and selected in BOTH nextInvestigation and proofContract; preserve old answers. Author choices and future conditions are not tool results. Do not invent a fact, force a strategy or waive a release requirement.'};
}
export function rosterDecisionInvestigationErrorV1(decision,{continuation=null,requiredProofContractVersion=0,requiredCandidateQueryVersion=0}={}){
  if(!Object.hasOwn(decision,'nextInvestigation'))return null; // immutable legacy contract
  const next=decision.nextInvestigation;
  if(next===null){
    if(decision.disposition==='investigate')return {
      code:'pending_questions_are_not_investigation_authorization',
      instruction:'investigate requires an explicit bounded nextInvestigation: selected necessary_fact or optional_probe questionNumbers, decision enabled, new observation and stopWhen; selected optional probes require a complete proofContract. Alternatively retain the current draft or genuinely revise it with nextInvestigation=null and preserve unresolved facts with concrete reasons. This returns unresolved work, not a completed Plan; it dispatches no implicit inquiry and grants no approval. Do not fabricate answers, force edits, or repeat an unavailable method.'};
    return null;
  }
  const numbers=next?.questionNumbers;
  if(!['investigate','revise'].includes(decision.disposition)||!Array.isArray(numbers)||!numbers.length
    ||new Set(numbers).size!==numbers.length
    ||numbers.some(n=>!Number.isSafeInteger(n)||!selectableFactQuestion(decision.dataQuestions?.[n-1]))
    ||['decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen'].some(k=>!next[k]?.trim()))
    return {code:'bounded_investigation_authorization_invalid',
      selection:projectRosterInvestigationSelectionV1(decision),
      pendingQuestionNumbers:Array.isArray(numbers)?numbers.filter(n=>Number.isSafeInteger(n)&&decision.dataQuestions?.[n-1]):[],
      instruction:'An authorized inquiry belongs to investigate or a genuine revise decision. Select distinct 1-based necessary_fact or explicitly chosen optional_probe entries from THIS dataQuestions array, not answered facts, author choices or future conditions. Optional parents stay optional; their proofContract and expectedNewObservation define the required local subquery. Do not use retain for an authorized inquiry or erase the remaining fact. Explain decision relevance, missing observation and finite local return point; other unresolved questions stay pending, not dispatched.'};
  const selectedOptional=numbers.some(n=>decision.dataQuestions[n-1].classification==='optional_probe');
  const proofError=proofContractError(next,selectedOptional?Math.max(1,requiredProofContractVersion):requiredProofContractVersion);
  if(proofError)return proofError;
  const scopeError=rosterInvestigationScopeContinuityErrorV1(decision,continuation?.proofScopeLineage??[]);
  if(scopeError)return scopeError;
  const candidateError=rosterBuilderInquiryErrorV1(decision,{requiredVersion:requiredCandidateQueryVersion});
  if(candidateError)return candidateError;
  const answeredQuery=next.candidateQuery?.operation==='builder_audit'
    ?continuation?.answeredCandidateQueries?.find(row=>row.queryKey===hash(next.candidateQuery)):null;
  const repeatedAudit=answeredQuery?.audit??(continuation?.previousCandidateAudit
    &&next.candidateQuery?.operation==='builder_audit'
    &&isDeepStrictEqual(next.candidateQuery,continuation.previousAuthorization?.candidateQuery)
      ?continuation.previousCandidateAudit:null);
  if(repeatedAudit)return {
    code:'repeated_answered_candidate_query',previousWorkId:continuation.previousWorkId,
    previousCandidateAudit:clone(repeatedAudit),
    instruction:'The exact same selected baseline and unit/card edits already have this current Native audit verdict. Changing the prose does not change the candidate. Consume/read the saved result instead of authorizing another identical audit. If the army must change, explicitly choose a genuinely different candidateQuery; if you need legal alternatives, request builder_branches on an explicit legal baseline. You may also adopt a legal partial candidate with a preliminary Plan. Host does not pick an army, waive the final target, or approve strategy. Failed/unexecuted queries are not treated as answered by this guard.'};
  const normalized=value=>String(value??'').replace(/\s+/gu,' ').trim();
  const signature=(authorization,questions)=>JSON.stringify([
    ...questions.map(normalized),
    ...['decisionToEnable','whyExistingEvidenceInsufficient','expectedNewObservation','stopWhen']
      .map(key=>normalized(authorization[key])),
  ]);
  if(continuation?.previousAuthorization&&Array.isArray(continuation.previousQuestions)
    &&signature(next,numbers.map(n=>decision.dataQuestions[n-1].question))
      ===signature(continuation.previousAuthorization,continuation.previousQuestions))return {
    code:'unchanged_investigation_authorization',
    previousWorkId:continuation.previousWorkId??null,
    previousResultRef:continuation.previousResultRef??null,
    instruction:'This is the SAME selected question, reason, expected observation and stop condition as your prior authorization on this explicit continuation. Read the actual method return and reconcile its failure/results before authorizing again. If continuing is necessary, explain the concrete changed method, prerequisite or new evidence in whyExistingEvidenceInsufficient and why it can now answer the remaining predicate; keep the same question if appropriate. Merely renaming/rewording the old request is not progress. Alternatively revise/retain only with honest supported reasons and unresolved facts preserved. No forced strategy edit, fabricated answer, whole-match expansion or automatic repeat is authorized.'};
  return null;
}

// One dispatch policy for the outcome ledger AND both product scheduling paths.
// Pending obligations survive a return but cannot authorize a tool or new role.
// Legacy replies keep the already-delivered contract; do not silently migrate them.
export function rosterDecisionInquiryDispatchV1(decision){
  const error=rosterDecisionInvestigationErrorV1(decision);
  if(error)throw Object.assign(Error(error.code),error);
  const pending=rosterPendingQuestionWorkV1(decision);
  const explicit=Object.hasOwn(decision,'nextInvestigation');
  const dispatch=explicit?decision.nextInvestigation!==null:
    decision.disposition==='investigate'||pending.facts.length>0||pending.authorDecisions.length>0;
  return {version:2,kind:dispatch?'investigation':pending.facts.length||pending.authorDecisions.length?'unresolved_return':'none',
    dispatch,authorizationScope:explicit?'explicit_selected_predicates':'legacy_already_assigned',
    authorizedQuestionNumbers:explicit?clone(decision.nextInvestigation?.questionNumbers??[]):null,
    pendingFacts:clone(pending.facts),pendingAuthorDecisions:clone(pending.authorDecisions),
    acceptanceGranted:false,sourceApprovalGranted:false};
}

import {armyBuilderConstraintDiagnosticEvidenceIdV1} from './army-builder-query-port-v1.mjs';
// Find the nearest prior authorization along explicit control ancestry.
// The reference is an old decision, not an accepted fact or a new query budget.
export function rosterInvestigationContinuationFromRequestV1(request){
  return request?.promptNodes?.find(n=>n.kind==='investigation_continuation_contract'
    &&[1,2].includes(n.version))??null;
}
export async function projectRosterInvestigationContinuationV1({state,workId,readArtifact}){
  const graph=createRosterWorkflowGraphV1(state),current=graph.get(workId);
  if(current?.role!=='roster_workflow_strategy_decision')return null;
  const ancestry=graph.ancestors(workId,{includeSelf:false});
  const owners=new Set(ancestry.filter(w=>w.role==='roster_workflow_strategy_decision'
    &&rosterWorkflowBindingsMatchV1(w.bindings,current.bindings)).map(w=>w.id));
  const proofScopeLineage=await projectRosterInvestigationScopeLineageV1({state,workId,readArtifact});
  const answeredCandidateQueries=[];
  for(const tool of state.work){
    const authority=tool.inputs?.request?.value?.builderCandidateAuthority;
    if(tool.role!=='roster_workflow_tool'||tool.status!=='evidence_ready'||!tool.resultRef
      ||!graph.isCurrent(tool.id)||!owners.has(authority?.sourceDecision?.workId)
      ||authority.query?.operation!=='builder_audit')continue;
    const queryKey=hash(authority.query);
    if(answeredCandidateQueries.some(row=>row.queryKey===queryKey))continue;
    const saved=await readArtifact(tool.resultRef),value=saved?.value,receipt=value?.receipt;
    if(saved?.kind!=='tool_receipt'||value.operation!=='builder_audit'||value.status!=='completed'
      ||!['legal','illegal'].includes(receipt?.status)||!receipt.rulesAuthority)continue;
    const evidenceIndex=state.evidence.findIndex(e=>e.id===`tool:${tool.id}`);
    if(evidenceIndex<0)continue;
    const originalArtifactRef=state.evidence[evidenceIndex].artifactRef;
    const supplementIndex=state.evidence.findIndex(e=>e.id===armyBuilderConstraintDiagnosticEvidenceIdV1(originalArtifactRef)
      &&e.kind==='tool_receipt'&&rosterWorkflowBindingsMatchV1(e.bindings,current.bindings));
    const supplement=supplementIndex<0?null:await readArtifact(state.evidence[supplementIndex].artifactRef);
    const supplementalReceipt=supplement?.diagnosticFor?.originalArtifactRef===originalArtifactRef
      &&supplement.operation==='builder_audit'&&supplement.status==='completed'
      &&supplement.receipt?.candidateHash===receipt.candidateHash&&supplement.receipt.status===receipt.status
      &&supplement.receipt.rulesErrorCode===receipt.rulesErrorCode
      &&supplement.receipt.unitCompositionUpgradeDataBundleHash===receipt.unitCompositionUpgradeDataBundleHash
      ?supplement.receipt:null;
    const constraintDiagnostics=receipt.constraintDiagnostics??supplementalReceipt?.constraintDiagnostics??null;
    const diagnosticSource=constraintDiagnostics?{evidenceNumber:receipt.constraintDiagnostics?evidenceIndex+1:supplementIndex+1,
      artifactRef:receipt.constraintDiagnostics?originalArtifactRef:state.evidence[supplementIndex].artifactRef,
      pointer:'/receipt/constraintDiagnostics'}:null;
    answeredCandidateQueries.push({queryKey,ownerWorkId:authority.sourceDecision.workId,
      audit:{evidenceNumber:evidenceIndex+1,evidenceId:state.evidence[evidenceIndex].id,
        artifactRef:state.evidence[evidenceIndex].artifactRef,status:receipt.status,
        rulesErrorCode:receipt.rulesErrorCode??null,rulesErrorDetail:receipt.rulesErrorDetail??null,
        constraintDiagnostics:clone(constraintDiagnostics),
        diagnosticSource,
        candidateFacts:projectRosterBuilderCandidateFactsV1({value,evidenceNumber:evidenceIndex+1,artifactRef:originalArtifactRef,
          constraintDiagnostics,diagnosticSource}),
        summary:clone(receipt.summary??null),alreadyAnswered:true,strategyApproved:false}});
  }
  for(const previous of ancestry){
    if(previous.role!=='roster_workflow_strategy_decision'||!previous.resultRef
      ||!rosterWorkflowBindingsMatchV1(previous.bindings,current.bindings))continue;
    const result=await readArtifact(previous.resultRef),decision=result?.value?.decisions?.[0];
    if(!decision?.nextInvestigation||rosterDecisionInvestigationErrorV1(decision))continue;
    const index=state.evidence.findIndex(e=>e.id===`role:${previous.id}`);
    const previousCandidateAudit=answeredCandidateQueries.find(row=>row.ownerWorkId===previous.id)?.audit??null;
    return {version:2,previousWorkId:previous.id,previousResultRef:previous.resultRef,
      previousEvidenceNumber:index<0?null:index+1,
      previousAuthorization:clone(decision.nextInvestigation),
      previousQuestions:decision.nextInvestigation.questionNumbers.map(n=>decision.dataQuestions[n-1].question),
      previousCandidateAudit,
      answeredCandidateQueries,proofScopeContinuityVersion:1,proofScopeLineage,
      semanticEquivalenceClaimed:false,acceptanceGranted:false,
      instruction:'This is your prior authorization on the SAME explicit investigation lineage and source bindings. It is not a new task or source fact. Reconcile the current returned method/results with it. A further investigation needs an explicit reason why a changed method/prerequisite/new observation can resolve the remaining predicate; repeating this unchanged authorization cannot reset the experiment. Necessary facts remain pending, and genuinely useful follow-up is allowed. Do not invent a winner or run a whole match to force completion.'};
  }
  return null;
}

// A saved continuation owns its persisted local predicate, not generic task prose.
// Verify its exact producer; never infer a new scope from the proposed answer.
async function projectSavedContinuationInquiry({work,state,readArtifact}){
  const owner=work.id?work:state.work.find(w=>w.id===work.workId);
  const questions=owner?.inputs.originalNecessaryQuestions;
  if(owner?.role!=='roster_workflow_experiment_planner'||!owner.methodContinuationOf
    ||questions?.source!=='literal'||!Array.isArray(questions.value)||!questions.value.length
    ||questions.value.some(q=>typeof q!=='string'||!q.trim())
    ||!rosterWorkflowBindingsMatchV1(owner.bindings,state.scope))return null;
  const previous=state.work.find(w=>w.id===owner.methodContinuationOf),root=state.work.find(w=>w.id===owner.experimentGoalId);
  if(previous?.role!=='roster_workflow_experiment_planner'||previous.status!=='evidence_ready'||!previous.resultRef||!root
    ||owner.inputs.previousMethod?.source!=='evidence'||owner.inputs.previousMethod.id!=='role:'+previous.id
    ||!rosterWorkflowBindingsMatchV1(previous.bindings,owner.bindings)
    ||!rosterWorkflowBindingsMatchV1(root.bindings,owner.bindings))return null;
  const result=await readArtifact(previous.resultRef);
  const assigned=previous.inputs.originalNecessaryQuestions?.value
    ??previous.inputs.question?.value?.necessaryQuestions??result.value?.unresolvedQuestions??[];
  if(!isDeepStrictEqual(questions.value,assigned))return null;
  const parentQuestions=[...new Set((root.inputs.reviewIssues?.value??[])
    .flatMap(issue=>rosterPendingQuestionWorkV1(issue).facts.map(q=>q.question)))];
  return {question:{source:'literal',value:{schema:'roster_factual_inquiry_question_v1',
    authorizationScope:'saved_continuation_predicates',necessaryQuestions:clone(assigned),
    continuationSource:{workId:previous.id,resultRef:previous.resultRef,continuationWorkId:owner.id,
      origin:'persisted_product_method_continuation',notNewStrategicAuthorization:true},
    parentObligations:{ownerWorkId:root.id,necessaryQuestions:parentQuestions,resolvedByLocalAnswer:false},
    instruction:'Resolve exactly these persisted local continuation predicates. They come from the saved producer, not the proposed answer. The parent question is preserved separately and stays pending with its owner. This is not a new strategic authorization, proof of future control, or permission to enlarge the experiment. Missing prerequisites for a local predicate stay in that predicate; other parent issues belong in conditions, not new local blockers.'}}};
}
// Input repair and observed-choice roles parameterize an existing method. Reuse
// its exact author question through recorded ownership, never from reply prose
// or a different recent inquiry. This also covers retained cold checkpoints.
async function projectDelegatedInquiry({work,state,readArtifact}){
  const byId=new Map(state.work.map(row=>[row.id,row]));
  const assigned=byId.get(work.id??work.workId);
  if(!assigned||!['repairOf','orderRepairOf','choiceOf'].some(key=>assigned[key]))return null;
  const seen=new Set();let current=assigned;
  while(current&&!seen.has(current.id)){
    seen.add(current.id);
    const parentId=current.orderRepairOf??current.repairOf??current.choiceOf??current.experimentOwnerId;
    const parent=byId.get(parentId);
    if(!parent||!rosterWorkflowBindingsMatchV1(parent.bindings,assigned.bindings)
      ||!rosterWorkflowBindingsMatchV1(assigned.bindings,parent.bindings)
      ||!['roster_workflow_tool','roster_workflow_experiment_planner'].includes(parent.role))return null;
    if(parent.role==='roster_workflow_experiment_planner'){
      const inquiry=parent.inputs?.decision
        ?await projectRosterWorkflowFactInquiryV1({work:parent,state,readArtifact})
        :parent.inputs?.question?.source==='literal'?{question:parent.inputs.question}
        :await projectSavedContinuationInquiry({work:parent,state,readArtifact});
      if(inquiry?.question)return {question:{...clone(inquiry.question),
        delegatedFrom:{workId:parent.id,assignedWorkId:assigned.id,
          originalAuthorizationUnchanged:true,notNewStrategicAuthorization:true}}};
      // A new explicit inquiry with no authority does not inherit an older one.
      if(parent.inputs?.decision||parent.inputs?.question||parent.methodContinuationOf)return null;
    }
    current=parent;
  }
  return null;
}

export async function projectRosterWorkflowFactInquiryV1({work,state,readArtifact}){
  const input=work.inputs?.decision;
  if(work.role!=='roster_workflow_experiment_planner')return null;
  if(!input)return await projectSavedContinuationInquiry({work,state,readArtifact})
    ??await projectDelegatedInquiry({work,state,readArtifact});
  let value=input.value,source=null;
  if(input.source==='evidence'){
    source=state.evidence.find(e=>e.id===(input.id??input.evidenceId));
    if(!source)return null;
    if(value===undefined){
      value=await readArtifact(source.artifactRef);
      for(const key of (input.pointer??'').split('/').slice(1).map(k=>k.replaceAll('~1','/').replaceAll('~0','~'))){
        if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return null;
        value=value[key];
      }
    }
  }
  const body=value?.kind&&value.value?value.value:value;
  const decision=body?.decisions?.[0];
  if(!decision)return null;
  const authorizationError=rosterDecisionInvestigationErrorV1(decision);
  if(authorizationError)throw Object.assign(Error(authorizationError.code),authorizationError);
  const pending=rosterPendingQuestionWorkV1(decision);
  const explicit=Object.hasOwn(decision,'nextInvestigation'),authorization=decision.nextInvestigation??null;
  if(explicit?!authorization:!pending.facts.length&&!pending.authorDecisions.length)return null;
  const selectedQuestions=explicit
    ?(authorization?.questionNumbers??[]).map(n=>decision.dataQuestions[n-1]):pending.facts;
  // A revise may leave ONLY an author choice. Preserve that typed return for
  // the deterministic author router; no fact investigation is authorized.
  const authorDecisions=explicit&&authorization?[]:pending.authorDecisions;
  const authorizationScope=explicit?'explicit_selected_predicates':'legacy_already_assigned';
  const requiredData=rosterScopedInquiryPredicatesV1({authorization,authorizationScope,
    necessaryQuestions:selectedQuestions.map(q=>q.question)});
  // The author ledger is an obligation, not this prerequisite's execution scope.
  // Use the same predicate projection as source coverage; keep the full parent
  // contract for the strategic owner without delegating it to the fact method.
  const parentObligations=explicit&&authorization?{
    necessaryQuestions:selectedQuestions.map(q=>q.question),decisionRelevance:clone(selectedQuestions),
    proofContract:clone(authorization.proofContract??null),resolvedByLocalAnswer:false,
  }:null;
  const dataQuestions=parentObligations?requiredData.map(question=>({question,
    classification:'necessary_fact',reason:authorization.decisionToEnable})):selectedQuestions;
  const selected=new Set(selectedQuestions.map(q=>q.question));
  const pendingNotAuthorized={facts:pending.facts.filter(q=>!selected.has(q.question)),
    authorDecisions:explicit&&authorization?pending.authorDecisions:[]};
  const sourceDecision={workId:work.investigationFor??null,
    ...(source?{evidenceId:source.id,evidenceNumber:state.evidence.indexOf(source)+1,
      artifactRef:source.artifactRef,pointer:input.pointer??''}:{}),
    ...(body.originalResultRef?{originalResultRef:body.originalResultRef}:{})};
  return {
    ...(parentObligations?{originalNecessaryQuestions:{source:'literal',value:clone(requiredData)}}:{}),
    ...(authorization?.candidateQuery?{builderCandidateAuthority:{source:'literal',value:{version:1,
      sourceDecision,query:clone(authorization.candidateQuery),formalMutation:false,
      instruction:ROSTER_BUILDER_METHOD_INSTRUCTION_V1}}}:{}),
    decision:{source:'literal',value:{schema:'roster_factual_inquiry_v1',sourceDecision,
      requiredData,dataQuestions,authorDecisions,pendingNotAuthorized,modelInstructionNotFact:true,
      ...(parentObligations?{parentObligations:clone(parentObligations)}:{}),
      instruction:'Only requiredData/dataQuestions are assigned to this fact role. pendingNotAuthorized remains owned by the strategic author and is NOT another experiment obligation. The full strategic proposal remains readable at sourceDecision, but is not an accepted answer or this fact role\'s output template.'}},
    question:{source:'literal',value:{schema:'roster_factual_inquiry_question_v1',
      necessaryQuestions:requiredData,decisionRelevance:dataQuestions,authorDecisions,
      ...(parentObligations?{parentObligations:clone(parentObligations)}:{}),
      authorization:clone(authorization),authorizationScope,
      instruction:'Resolve ONLY THESE predicates using actual saved evidence or an explicitly designed bounded local experiment, then return at authorization.stopWhen. Other pending facts/author choices are NOT assigned. A successful prerequisite (legal action/payment/setup) does not answer a comparative benefit question. Separate the original comparison from its subtests. Unknown future opponent choices do not prevent testing a stated conditional scene with declared alternatives and counterplay; report only that scene\'s supported/refuted/inconclusive result and conditions, not future realized victory. Do not rank or retain the whole roster/Plan here. Return a concrete capability blocker or genuinely new strategic choice only when it prevents the next meaningful measurement. No full-match rehearsal, forced army edit or invented measurement.'}}
  };
}

// Follow only explicit method/repair ownership, not a broad graph search or
// the most recent candidate. A new decision terminates this ancestry lookup.
export async function projectRosterWorkflowBuilderAuthorityV1({work,state,readArtifact}){
  if(work?.role!=='roster_workflow_experiment_planner')return null;
  const visited=new Set();let current=work.id?work:state.work.find(w=>w.id===work.workId);
  while(current&&!visited.has(current.id)){
    visited.add(current.id);
    if(current.inputs?.builderCandidateAuthority)return clone(current.inputs.builderCandidateAuthority);
    if(current.inputs?.request?.value?.builderCandidateAuthority)
      return {source:'literal',value:clone(current.inputs.request.value.builderCandidateAuthority)};
    if(current.inputs?.decision){
      const inquiry=await projectRosterWorkflowFactInquiryV1({work:current,state,readArtifact});
      return inquiry?.builderCandidateAuthority??null;
    }
    const parent=current.orderRepairOf??current.repairOf??current.choiceOf??current.experimentOwnerId;
    current=parent?state.work.find(w=>w.id===parent):null;
  }
  return null;
}
