// Source judges audit what EACH receipt actually measured. A request-interning
// handle is not an execution/cache receipt, and Host non-approval is not a false
// scientific predicate. Keep those implementation details out of this view.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1} from '../structured-generation/output-contract-registry-v1.mjs';
import {rosterScopedInquiryPredicatesV1,rosterHasScopedInquiryV1} from './roster-review-data-questions-v1.mjs';
export const ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1=3;


// A source assertion is not a roster decision. Keep exact inspect subject
// states and source navigation; do not seed its verdict with another review.
export function rosterLinkedSourceReviewPresentationGapV1(request){
 const a=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
 return a?.role==='roster_workflow_final_review'&&a.inputs?.claim?.value
  &&a.inputs.sameSourceExecution?.value?.schema==='roster_source_linked_execution_v1'
  &&request.sourceLinkedReviewPresentationVersion!==1;
}
// Both a single assertion and a transport batch have source duties, never the
// author's whole-army planning duties. Explicit source bodies and reads stay.
function focusSourceAssertionRole(request){
 const a=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
 if(!a?.inputs?.claim?.value&&!a?.inputs?.claimBatch?.value)return request;
 delete a.inputs.authoritativeDecisionFacts;
 const omitted=new Set(['authoritative_decision_facts','builder_menu_source_coverage','draft_lifecycle_contract']);
 request.promptNodes=request.promptNodes.filter(n=>!omitted.has(n.kind));
 if(request.sourceAssertionRoleBoundaryVersion!==1)request.promptNodes.push({kind:'source_assertion_role_boundary',version:1,
  owns:'Verify each assigned exact assertion independently from its delivered sources and stated conditions.',
  may:['Read necessary saved source fields','State the exact supported fact, contradiction or missing premise for this assertion'],
  mayNot:['Choose an army or Plan','Add a question or experiment','Demand future match outcomes or global optimality'],
  stop:'Return each assigned verdict and evidence. A transport batch does not broaden any assertion or authorize another investigation.'});
 request.sourceAssertionRoleBoundaryVersion=1;
 return request;
}

function focusLinkedSourceReview(request){
 const a=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
 if(!a?.inputs?.claim?.value||a.inputs.sameSourceExecution?.value?.schema!=='roster_source_linked_execution_v1'
  ||request.sourceLinkedReviewPresentationVersion===1)return request;
 const snapshotIds=new Set();
 for(const [key,input]of Object.entries(a.inputs)){
  const v=input.value;
  if(!/^selectedSource\d+$/.test(key)||v?.schema!=='roster_experiment_source_facts_v1'||v.operation!=='inspect')continue;
  snapshotIds.add(v.sourceEvidenceId);
  const subjects=[],seen=new Set();
  for(const [index,row]of (v.actionEligibility?.actions??[]).entries()){
   if(!row.pieceId||!row.subjectState)continue;
   const identity=JSON.stringify([row.pieceId,row.subjectState]);if(seen.has(identity))continue;seen.add(identity);
   subjects.push({pieceId:row.pieceId,subjectState:structuredClone(row.subjectState),
    sourcePointer:'/actionEligibility/actions/'+index+'/subjectState'});
  }
  const {actionEligibility,experimentOrigin,...retained}=v;
  a.inputs[key]={...input,wholeBodyDelivered:false,value:{...retained,
   inspectSubjects:{sourceEvidenceId:input.evidenceId,evidenceNumber:input.evidenceNumber,
    subjects,round:actionEligibility?.round,phase:actionEligibility?.phase,sideKey:actionEligibility?.sideKey,
    completeMenu:actionEligibility?.completeMenu,
    instruction:'Exact subjectState values deduplicated from this registered source projection, with source pointers. These are STARTING states, not outcomes or proof that later actions cannot execute. The full action/capability menus remain readable at the same original source; request a specific field only if needed for this assertion.'},
   deferredFields:['/actionEligibility','/experimentOrigin']}};
 }
 const omitted=new Set(['authoritative_decision_facts','builder_menu_source_coverage','draft_lifecycle_contract']);
 request.promptNodes=request.promptNodes.flatMap(node=>{
  if(omitted.has(node.kind))return [];
  if(node.kind==='registered_native_measurement_supplements'){
   const sources=node.sources.filter(s=>!snapshotIds.has(s.sourceEvidenceId));return sources.length?[{...node,sources}]:[];
  }
  if(node.kind==='evidence_delivery_handoff')return [{kind:'previous_source_review_history',
   originalReplyRef:node.originalReplyRef,sourceRequestRef:node.sourceRequestRef,conclusionAccepted:false,
   instruction:'Prior unconfirmed judgment retained for audit only. Independently review the exact current assertion against the delivered source facts. Do not confirm a previous verdict merely because requested reads completed.'}];
  return [node];
 });
 request.sourceLinkedReviewPresentationVersion=1;
 request.promptNodes.push({kind:'atomic_source_role_boundary',version:1,
  currentTask:'Verify only the exact assertion and its stated causal inference against the supplied source states and recorded transitions.',
  allowed:['read specific saved source fields needed by this assertion','return supported/conditional/needs_evidence/requires_revision with public reason and sources'],
  disallowed:['design a new experiment','introduce another unit, map, objective or time horizon','prove the parent Plan or future match outcomes'],
  stopWhen:'The assertion is supported, contradicted, or its specifically missing source premise is identified. Return to the owner; do not manufacture a new investigation.',
  instruction:'A recorded successful action can coexist with an unresolved overall search. Distinguish the starting snapshot, recorded execution, and unproved joint goal. Scope wording is not factual proof. No verdict or strategic preference is prescribed. Missing facts must name the part of THIS assertion they affect; any new strategic hypothesis belongs to its owner, not this reviewer.'});
 return request;
}

// The resolution table is not an optional list of remaining questions. Its
// required identities come from the same authority as the semantic validator;
// only the model supplies classifications, reasons and actually read sources.
function prepareScopedCoverageForm(request,question){
  if(!rosterHasScopedInquiryV1(question))return request;
  const questions=rosterScopedInquiryPredicatesV1(question);
  const schema=request.responseFormat.schema,props=schema.properties;
  const check=props.checks?.items??props.checkPatches?.items?.properties?.replacement;
  if(!questions.length||!check?.properties?.dataQuestions?.items)return request;
  check.properties.dataQuestions={...check.properties.dataQuestions,minItems:questions.length,maxItems:questions.length,
    description:'Required resolution table, including ANSWERED observations. Populate every assigned observation once; publicReason alone is not its classification. Put other scope limitations in conditions, not new blocking questions.',
    items:{...check.properties.dataQuestions.items,properties:{...check.properties.dataQuestions.items.properties,
      question:{...check.properties.dataQuestions.items.properties.question,enum:questions,
        description:'Select the exact assigned observation from this enum. Do not translate or paraphrase its identity.'}}}};
  const hostIdentity=Boolean(props.checks?.items===check);
  if(hostIdentity){
    delete check.properties.checkId;
    check.required=check.required.filter(key=>key!=='checkId');
    props.checks.maxItems=1;
    request.scopedCoverageCheckIdentity={version:1,checkId:'question_coverage',obligationCount:1};
  }
  const version=hostIdentity?'1.1.0':'1.0.0';
  const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_scoped_coverage_form',version,
    schemaName:'roster_workflow_scoped_coverage_form_v1',providerSchema:schema,
    modelOwnedFields:Object.keys(props),hostOwnedFields:['artifactRef','acceptanceGranted',...(hostIdentity?['checkId']:[])],
    mapperRef:{id:'roster.scoped_coverage_form',version,hash:hash('roster.scoped_coverage_form.'+version)},
    semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
    description:'Exact authorized observations must be explicitly classified; no automatic answers or source approval.'});
  request.responseFormat={kind:'provider_strict_json_schema',schemaName:contract.schemaName,
    outputContractRef:outputContractRefStarcraftTmgV1(contract),schema};
  request.scopedCoverageFormVersion=hostIdentity?2:1;
  request.promptNodes.push({kind:'scoped_coverage_resolution_form',version:1,questions,
    instruction:'Fill dataQuestions for EVERY listed observation even when it is answered. Choose its classification, answer/reason and evidenceNumbers explicitly. The check publicReason does not replace this table. Other parent questions stay with their owner. No answer, evidence or approval is supplied by this form.'
      +(hostIdentity?' There is one assigned check; Host binds its identity. Return no checkId. Keep your verdict, reasons, sources and classifications explicit.':'')});
  return request;
}

// The scope is assigned by the actual request, not selected by a model label.
// Older paid forms also had one assigned check but asked for its ID as text.
// Binding that identity must not alter verdicts, questions, evidence or prose.
export function projectRosterScopedCoverageCheckIdentityV1({request,output,schema}){
  const unchanged=()=>({output,projection:[],validationSchema:schema});
  if(output?.action!=='finish'||!Array.isArray(output.checks)||output.checks.length!==1)return unchanged();
  const assignment=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  const inputs=assignment?.inputs,obligations=inputs?.review?.value?.obligations;
  const handles=request?.roleCommunication?.reviewHandles??[];
  const identity=handles.find(row=>row.handle===obligations?.[0]?.checkId)?.checkId??obligations?.[0]?.checkId;
  if(assignment?.role!=='roster_workflow_final_review'||!inputs?.review?.value?.experimentalSourceReviewVersion
    ||!rosterHasScopedInquiryV1(inputs?.question?.value)||inputs.claim||inputs.hypothesisAssessment
    ||obligations?.length!==1||identity!=='question_coverage'||!schema?.properties?.checks?.items)return unchanged();
  const projected=structuredClone(output),check=projected.checks[0],original=check.checkId;
  check.checkId=identity;
  const validationSchema=structuredClone(schema),item=validationSchema.properties.checks.items;
  item.properties.checkId={type:'string',minLength:0,maxLength:65536};
  item.required=[...new Set([...item.required,'checkId'])];
  return {output:projected,validationSchema,projection:original===identity?[]:[{
    from:'/checks/0/checkId',original,value:identity,rule:'host_single_scoped_coverage_identity_v1',
    verdictChanged:false,questionCoverageApproved:false}]};
}

export function projectRosterScopedCoverageFormRecoveryV1({work,request}){
  const op=work?.operationState,errors=op?.correction?.errors??[];
  if(work?.role!=='roster_workflow_final_review'||work.status!=='needs_repair'||op?.pending
    ||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
    ||!errors.length||!errors.every(e=>e.code==='inquiry_review_predicate_coverage')
    ||request?.scopedCoverageFormVersion>=1)return null;
  const projected=prepareRosterSourceReviewRequestV1(request);
  if(!(projected.scopedCoverageFormVersion>=1))return null;
  return {workId:work.id,originalReplyRef:op.correction.originalReplyRef,
    repairKind:'scoped_coverage_form',feedbackVersion:'c12-coverage-form-v1',
    recoveryKey:hash({workId:work.id,repairKind:'scoped_coverage_form',version:1}),
    additionalInvalidResultLimit:1,historyReset:false,originalPaidReplyPreserved:true,
    newCorrectiveProviderRequest:true,nativeReplayed:false,finalApprovalGranted:false};
}
export function prepareRosterSourceReviewRequestV1(request,{directory=request.roleCommunication?.evidenceNumbers??[],
  reviewHandles=request.roleCommunication?.reviewHandles??[]}={}){
  const assignment=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(assignment?.role!=='roster_workflow_final_review'
    ||!assignment.inputs?.review?.value?.experimentalSourceReviewVersion)return request;
  const projected=structuredClone(request);
  projected.providerInputEncodingVersion='verbatim_v1';
  projected.sourceReviewPresentationVersion=ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1;
  const inputs=projected.promptNodes.find(n=>n.kind==='workflow_role_assignment').inputs;
  const question=inputs.question?.value,obligations=inputs.review?.value?.obligations;
  const obligationId=reviewHandles.find(row=>row.handle===obligations?.[0]?.checkId)?.checkId??obligations?.[0]?.checkId;
  if(rosterHasScopedInquiryV1(question)
    &&!inputs.claim&&!inputs.hypothesisAssessment&&obligations?.length===1
    &&obligationId==='question_coverage'){
    prepareScopedCoverageForm(projected,question);
    // Source fidelity is composed by Host. Its positive prose is not proof that
    // the original question was answered. Keep those immutable bodies readable,
    // but ask this separate role to align the question with measurements FIRST.
    const deferredInterpretations=[];
    for(const key of Object.keys(inputs).filter(k=>k==='proposedConclusion'||/^claimCheck\d+$/u.test(k))){
      const input=inputs[key],evidenceId=input.evidenceId??input.id
        ??(input.workId?'role:'+input.workId:null);
      const entry=directory.find(e=>e.id===evidenceId);
      if(!entry)continue; // Never silently discard a body without a readable address.
      deferredInterpretations.push({input:key,evidenceId,
        read:{evidenceNumber:entry.number,pointer:''},isMeasurement:false});
      delete inputs[key];
    }
    projected.promptNodes.push({kind:'inquiry_independent_coverage_contract',version:1,
      deferredInterpretations,sourceChecksRemainHostPrerequisites:true,
      instruction:'Independently match the ORIGINAL authorized question to the actual measurement/configuration sources before consulting an author answer or previous reviewer opinion. In your existing check publicReason, state (1) the requested contrast/observation, (2) which actual factors changed and which stayed common across the relevant valid arms, and (3) whether these observations distinguish the requested alternatives. A factor held common across all tested arms has no isolated measured contribution; changing a different factor does not answer its replacement comparison. Row presence/count is not a measurement of the unchanged factor. Do not infer the requested alternatives from experiment labels. A positive source check means its sentence is backed, NOT that the original question is covered. Preserve unavailable observations as necessary_fact or concrete blockers; the owner may explicitly change an objective later, but this judge cannot silently narrow it. For a non-comparative fact query, assess its actual predicate without inventing experimental arms. Optional joint-volley/global-optimum questions must not distract from a missing originally requested local contrast. No preferred strategy, forced winner, extra Native experiment or final approval is authorized. Deferred interpretations remain available through the listed ordinary reads, but cannot substitute for measurements.'});
  }
  // Preserve questions and the immutable audit address, not the previous
  // judge's answer as an automatically supplied "current" factual premise.
  // Explicit source reads and Host coverage validation remain unchanged.
  if(inputs.priorQuestionJudgement){
    const prior=inputs.priorQuestionJudgement;
    inputs.priorReviewHistory={source:'literal',value:{evidenceId:prior.evidenceId??prior.id,
      pointer:prior.pointer??'',isSourceEvidence:false,originalQuestionsPreserved:true,
      instruction:'An earlier model judgment is retained at this address for audit history, not supplied as your answer template or as Rules/Native evidence. Independently evaluate the exact current assertion using the original receipts and current scene facts. Address every originalDataQuestions entry with a source-backed classification; do not inherit its earlier verdict, factual premises or question framing as truth. A prior question may combine an established condition with an unmeasured one: distinguish them rather than copying the combined premise. This separation grants no approval and does not waive missing necessary evidence.'}};
    delete inputs.priorQuestionJudgement;
  }
  const catalogue=inputs.activeHypothesisTests?.value?.assetCatalogue;
  if(catalogue?.controlledSceneComparisons)catalogue.controlledSceneComparisons=catalogue.controlledSceneComparisons.map(row=>{
    const {wholeStateIdentityEqual,runtimeCompositionIdentityEqual,allControlledConditionsApproved,
      combinedAttackOutcomeProven,strategyImprovementProven,...facts}=row;
    return {...facts,proofScope:{compared:'The exact saved model-position fields described above.',
      compatibility:'projectionCompatibility records the Native projection checks; original source locations are retained.',
      notMeasured:['footprint_equivalence','target_status_equivalence','combined_attack_losses','arrival_history','strategy_improvement'],
      interpretation:'Not measured is a scope boundary, not a failed condition. Judge only the assertion actually made, using the relevant source values.'}};
  });
  projected.promptNodes.push({kind:'source_review_evidence_presentation',version:ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1,
    instruction:'These source values are delivered verbatim, with each receipt’s own identity and execution status. Equal values in two completed receipts do not mean one was unexecuted. Transport aliases appearing in OLD quoted replies are old serialization, not a Native result. Inspect original source locations for provenance. Whole-state/configuration IDs intentionally differ between changed-army alternatives; establish a specific changed relevant predicate rather than demanding equal opaque IDs. Host has not pre-approved your judgment. A proof-scope exclusion means unmeasured, not a measured failure. Combined attacks, optional reactions and final strategy still require their own appropriate evidence; no fact or choice is approved by this presentation.'});
  if(inputs.claim?.value||inputs.claimBatch?.value){
    const batched=Boolean(inputs.claimBatch?.value);
    // The atomic judge reports a defect in THIS assertion. It cannot create a
    // new question ledger; missing premises belong in its scoped verdict/reason.
    // Coverage has its own assigned predicate form, and author authorization is
    // a separate product step. No verdict or missing fact is supplied by Host.
    const schema=projected.responseFormat.schema;
    const check=schema.properties.checks?.items??schema.properties.checkPatches?.items?.properties?.replacement;
    if(check?.properties?.dataQuestions){
      const carried=Array.isArray(inputs.originalDataQuestions?.value)?structuredClone(inputs.originalDataQuestions.value):[];
      const questions=check.properties.dataQuestions;
      check.properties.dataQuestions={...questions,minItems:batched?0:carried.length,maxItems:carried.length,
        ...(carried.length?{items:{...questions.items,properties:{...questions.items.properties,
          question:{...questions.items.properties.question,enum:carried}}}}:{}),
        description:carried.length?'Across assigned checks, classify exactly the existing question list without adding or dropping one. Attach only relevant questions to each check. Old wording is provenance, not authority for another experiment.':'Always empty for source-assertion checks. Report the precise missing premise or contradiction in this check publicReason and verdict; no new investigation is authorized.'};
      const scopeName=batched?'batch_source_scope':'atomic_source_scope';
      const contract=createStarcraftTmgOutputContractV1({id:'roster.workflow_'+scopeName,version:'1.0.0',
        schemaName:'roster_workflow_'+scopeName+'_v1',providerSchema:schema,
        modelOwnedFields:Object.keys(schema.properties),hostOwnedFields:['artifactRef','acceptanceGranted'],
        mapperRef:{id:'roster.'+scopeName,version:'1.0.0',hash:hash('roster.'+scopeName+'.1.0.0')},
        semanticValidatorRef:{id:'roster.workflow_read_role_semantics',version:'1.0.0',hash:hash('roster.workflow_read_role_semantics.v1')},
        description:'Assigned source assertion verdicts only; transport batching grants no additional investigation authority.'});
      projected.responseFormat={kind:'provider_strict_json_schema',schemaName:contract.schemaName,
        outputContractRef:outputContractRefStarcraftTmgV1(contract),schema};
      projected.sourceQuestionAuthorityVersion=1;
      if(!batched)projected.atomicQuestionAuthorityVersion=1;
      projected.userMessage='Check only the supplied assertion against actually delivered source facts. Read a specific saved field if needed, or finish with the assigned check: supported, conditional, needs_evidence or requires_revision. State its exact missing premise or contradiction in publicReason, keep sources and limitations, and return dataQuestions=[]. Do not introduce another objective, experiment, unit, map, time horizon, whole Plan proof or future match. The owner decides any new inquiry; no verdict is prescribed. A finite search without a witness is inconclusive, not impossibility; its successful intermediate actions remain real evidence. Public reasons only.';
      if(batched)projected.userMessage=projected.userMessage.replace('the supplied assertion','each supplied assertion independently').replace('finish with the assigned check:', 'finish with exactly the assigned checkIds, one check per assertion:');
      if(carried.length)projected.userMessage=projected.userMessage.replace('return dataQuestions=[].','classify exactly the existing originalDataQuestions in dataQuestions with reasons and sources. Do not add or delete a question.');
    }
  }
  return focusLinkedSourceReview(focusSourceAssertionRole(projected));
}
