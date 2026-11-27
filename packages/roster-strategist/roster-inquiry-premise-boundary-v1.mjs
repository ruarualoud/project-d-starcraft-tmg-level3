// A delegated question defines work, not the truth of its embedded premises.
// Preserve the immutable wording once. References replace exact duplicates,
// never different questions, Native observations or a model's final judgment.
import {isDeepStrictEqual} from 'node:util';
const assignmentOf=request=>request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
const inquiryRef={nodeKind:'workflow_role_assignment',pointer:'/inputs/question/value'};
const roles=new Set(['roster_workflow_experiment_planner','roster_workflow_strategy_decision',
  'roster_workflow_local_teach','roster_workflow_final_review']);

export function deliveredRosterAuthorizedInquiryV1(request,stage){
  if(stage?.authorizedInquiry)return stage.authorizedInquiry;
  const ref=stage?.authorizedInquiryRef;
  return ref?.nodeKind===inquiryRef.nodeKind&&ref.pointer===inquiryRef.pointer
    ?assignmentOf(request)?.inputs?.question?.value:undefined;
}

export function prepareRosterInquiryPremiseRequestV1(request){
  const assigned=assignmentOf(request),question=assigned?.inputs?.question?.value;
  if(!roles.has(assigned?.role)||question?.schema!=='roster_factual_inquiry_question_v1'
    ||!Array.isArray(question.necessaryQuestions)
    ||request.promptNodes.some(n=>n.kind==='inquiry_premise_boundary'))return request;
  const next=structuredClone(request),inputs=assignmentOf(next).inputs;
  inputs.question={...inputs.question,epistemicRole:'requested_predicates_with_unverified_premises',
    isObservation:false,rulesAuthority:false};
  for(const stage of next.promptNodes.filter(n=>n.kind==='acceptance_stage_contract')){
    if(!isDeepStrictEqual(stage.authorizedInquiry,question))continue;
    delete stage.authorizedInquiry;
    stage.authorizedInquiryRef={...inquiryRef};
  }
  for(const route of next.promptNodes.filter(n=>n.kind==='typed_question_route')){
    route.factualQuestions=(route.factualQuestions??[]).map(row=>{
      const indexes=question.necessaryQuestions.flatMap((q,i)=>q===row.question?[i]:[]);
      if(indexes.length!==1)return row;
      const {question:duplicate,...rest}=row;
      return {...rest,questionRef:{nodeKind:inquiryRef.nodeKind,
        pointer:inquiryRef.pointer+'/necessaryQuestions/'+indexes[0]}};
    });
  }
  const knownInputs=['measurementConditions','measurementConfigurations','measurementScenes','measurementRowDifferences'];
  const currentObservationRefs=knownInputs.filter(k=>inputs[k]).map(input=>({input,
    nodeKind:inquiryRef.nodeKind,pointer:'/inputs/'+input,
    role:'current_delivered_source_projection',isVerdict:false}));
  if(question.authorizationScope==='explicit_selected_predicates'&&question.authorization){
    next.promptNodes.push({kind:'authorized_inquiry_window',version:2,
      authorization:structuredClone(question.authorization),originalInquiryRef:{...inquiryRef},
      originalGoalResolved:false,permissionToExpand:false,
      instruction:'For THIS method window, expectedNewObservation and stopWhen define the explicitly authorized local observation and return boundary. When parentObligations is present, necessaryQuestions is that same local observation; parentObligations retains the original strategic questions, reasons and proofContract. For legacy inputs without that field, apply the local expectedNewObservation boundary to the preserved parent ledger. Neither the parent wording nor its proofContract authorizes extending this window to every unit, location or future round. A source/coverage judge classifies ONLY the local observation in predicateOwnership.questions, preserving parent remainder as context/conditions for the strategic owner, not local dataQuestions. Once the local observation has actually been answered, submit the scoped answer for source review, retaining the unresolved parent obligation. Do not start another unit/marker experiment solely because the broader parent remains unresolved. Genuine missing prerequisites for this authorized observation still block it. Do not label all tools unavailable or the whole goal answered. The strategic owner alone can authorize a different method or broader goal; no facts are approved by this boundary.'});
  }
  next.promptNodes.push({kind:'inquiry_premise_boundary',version:2,
    originalInquiryRef:{...inquiryRef},premisesApproved:false,obligationsRemoved:false,
    requestRole:'The original questions and authorization define the requested predicates and bounds, NOT observed facts.',
    rationaleRole:'decisionRelevance, whyExistingEvidenceInsufficient, quoted earlier answers and reviewer reasons are fallible model assertions, even when embedded in a required question. Their prior necessary_fact label is not proof of their premise.',
    currentObservationRefs,
    instruction:'First separate WHAT is being asked from WHAT the question alleges is already true. Check each relied-upon premise against the current delivered original sources, including present field values and actual changed conditions. Do not report an old allegation as a current tool field merely because it appears in the question or rejected reply. A source-backed refutation or correction of a false presupposition resolves that presupposition; it neither deletes the original question nor requires a new experiment to make the old wording true. Independently answer the remaining requested predicate, or state its concrete still-missing observation. A Host scope boundary, a request ID, or a prior verdict is not an empirical result. State the source-backed disposition in the existing public reason/conclusion; no new output schema, preferred strategy, automatic acceptance, or waiver of genuinely necessary evidence is implied.'});
  return next;
}
