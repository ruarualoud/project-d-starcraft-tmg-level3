// Source judges audit what EACH receipt actually measured. A request-interning
// handle is not an execution/cache receipt, and Host non-approval is not a false
// scientific predicate. Keep those implementation details out of this view.
export const ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1=2;
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
  if(question?.schema==='roster_factual_inquiry_question_v1'&&question.authorization
    &&!inputs.claim&&!inputs.hypothesisAssessment&&obligations?.length===1
    &&obligationId==='question_coverage'){
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
  return projected;
}
