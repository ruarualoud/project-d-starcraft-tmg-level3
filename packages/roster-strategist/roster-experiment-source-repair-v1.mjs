// Source contradiction and missing measurement are different jobs. Preserve
// the reviewers' actual classifications; do not infer facts or choose tactics.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const ROSTER_SOURCE_REPAIR_STAGE_VERSION_V1=4;
export const ROSTER_SOURCE_REPAIR_ROUTING_CHANGE_V1='source-review-author-routing-v725';
// A current, actually delivered strategic return may answer an author CHOICE,
// never a factual predicate. Keep the immutable review and exact question;
// record the separate author's response instead of reclassifying old feedback.
function explicitReturnedChoices(inputs){
  const input=inputs.strategyResolution;
  if(input?.source!=='evidence'||input.status!=='read'||input.validity!=='current'
    ||input.kind!=='proposal'||typeof input.evidenceId!=='string'||!input.evidenceId.startsWith('role:'))return new Map();
  const body=input.value?.value??input.value;
  if(body?.decisions?.length!==1||body.decisions[0].disposition!=='retain')return new Map();
  const choice=body.decisions[0],resolved=new Map();
  for(const question of choice.dataQuestions??[]){
    if(!['decided_here','authored_choice'].includes(question.classification)
      ||!question.question?.trim()||!question.publicReason?.trim()||!question.evidenceNumbers?.length)continue;
    // Ambiguous duplicate claims are not a usable resolution.
    if(resolved.has(question.question)){resolved.set(question.question,null);continue;}
    resolved.set(question.question,{evidenceId:input.evidenceId,disposition:choice.disposition,
      classification:question.classification,publicReason:question.publicReason,
      evidenceNumbers:structuredClone(question.evidenceNumbers),factsApproved:false,planApproved:false});
  }
  return resolved;
}
export function rosterSourceReviewRepairStageV1(inputs={}){
  const necessary=new Map(),authors=new Map(),answered=[],conditional=[],claimCorrections=[];let found=false;
  for(const [key,input]of Object.entries(inputs)){
    if(key!=='sourceReview'&&!/^failedSourceClaim\d+$/.test(key))continue;
    const body=input?.value?.value??input?.value;if(!Array.isArray(body?.checks))continue;found=true;
    for(const check of body.checks){
      const origin={reviewEvidenceId:input.evidenceId??input.id??null,checkId:check.checkId};
      const questions=Array.isArray(check.dataQuestions)?check.dataQuestions:[
        ...(check.requiredData??[]).map(question=>({question,classification:'necessary_fact',publicReason:check.publicReason,evidenceNumbers:[]})),
        ...(check.requiredDecisions??[]).map(question=>({question,classification:'author_decision',publicReason:check.publicReason,evidenceNumbers:[]}))];
      for(const q of questions){
        if(q.classification==='necessary_fact'){
          const prior=necessary.get(q.question);if(prior){prior.origins.push(origin);continue;}
          necessary.set(q.question,{...structuredClone(q),origins:[origin]});
        }else if(q.classification==='author_decision'){
          const prior=authors.get(q.question);if(prior){prior.origins.push(origin);continue;}
          authors.set(q.question,{...structuredClone(q),origins:[origin]});
        }else if(q.classification==='answered_fact')answered.push({...structuredClone(q),...origin});
        else conditional.push({...structuredClone(q),...origin});
      }
      if(['requires_revision','needs_evidence'].includes(check.verdict))claimCorrections.push({...origin,
        verdict:check.verdict,publicReason:check.publicReason});
    }
  }
  if(!found)return inputs.sourceRepairStage?.value??null;
  const originalAuthorDecisions=[...authors.values()],returned=explicitReturnedChoices(inputs),resolvedAuthorDecisions=[];
  for(const question of originalAuthorDecisions){
    const resolution=returned.get(question.question);if(!resolution)continue;
    resolvedAuthorDecisions.push({...structuredClone(question),resolution});authors.delete(question.question);
  }
  const originalNecessaryQuestions=[...necessary.values()],reconciledNecessaryQuestions=[];
  const reconciliation=inputs.sourceReconciliation?.source==='literal'?inputs.sourceReconciliation.value:null;
  // Host-created only, after checking the exact authorized child AND its
  // independent source/coverage acceptance. Keep the original obligation;
  // remove only the demand for NEW material, not the parent's source review.
  if(reconciliation?.version===1&&reconciliation.factsApproved===false&&reconciliation.parentReviewStillRequired===true)
    for(const q of reconciliation.questions??[]){
      if(!necessary.has(q.question)||!q.conclusionResultRef||!q.sourceReviewResultRef)continue;
      const pending=necessary.get(q.question);
      // The same sentence in a LATER review is a different obligation. Never
      // inherit an old reconciliation merely by text equality.
      if(!pending.origins?.length||!pending.origins.every(origin=>(q.origins??[]).some(prior=>
        prior.reviewEvidenceId===origin.reviewEvidenceId&&prior.checkId===origin.checkId)))continue;
      reconciledNecessaryQuestions.push({...structuredClone(necessary.get(q.question)),reconciliation:structuredClone(q)});
      necessary.delete(q.question);
    }
  const recheck=inputs.sameSourceReviewRequest?.source==='literal'?inputs.sameSourceReviewRequest.value:null;
  const recheckNecessaryQuestions=[];
  if(recheck?.version===1&&recheck.origin==='scoped_frontier_response'&&recheck.factsApproved===false
    &&recheck.parentReviewStillRequired===true&&recheck.originalResultRef&&recheck.strategyResultRef)
    for(const q of necessary.values())if(q.origins?.length&&(recheck.questions??[]).some(request=>request.question===q.question
      &&q.origins.every(origin=>request.origins?.some(prior=>prior.reviewEvidenceId===origin.reviewEvidenceId&&prior.checkId===origin.checkId))))
      recheckNecessaryQuestions.push(structuredClone(q));
  const sameSourceRecheck=necessary.size>0&&recheckNecessaryQuestions.length===necessary.size;
  const phase=necessary.size&&!sameSourceRecheck?'missing_fact_investigation':authors.size?'author_decision_return':'source_claim_correction';
  const localScope=inputs.localObligation?.value?.kind==='local_obligation_contract'?inputs.localObligation.value:null;
  const ownershipInstruction=localScope
    ?'First compare the reviewer-declared prerequisite with localObligation and the exact original question/reviewIssues. Other global obligations remain pending with their original owners; feedback alone cannot transfer them into this local job. If a disputed prerequisite is outside this job, preserve its exact wording/origin and return strategy_required with the explicit scope conflict and source references; do not start an unrelated experiment, assert that unknown is answered, or silently erase it. The missing-fact instructions below apply to genuinely necessary LOCAL prerequisites, not every item copied by a reviewer. Valid original authorized measurements cannot be narrowed by the proposed answer. Local completion does not approve the Plan. ':'';
  return {kind:'source_review_repair_stage',version:ROSTER_SOURCE_REPAIR_STAGE_VERSION_V1,phase,
    necessaryQuestions:[...necessary.values()],authorDecisions:[...authors.values()],originalAuthorDecisions,resolvedAuthorDecisions,
    originalNecessaryQuestions,reconciledNecessaryQuestions,
    recheckNecessaryQuestions,sameSourceRecheck,
    answeredQuestions:answered,conditionalQuestions:conditional,
    pendingClaimCorrections:claimCorrections,reviewIsRulesTruth:false,hostChoosesStrategy:false,
    questionProjectionIsNotAFullSourceRead:true,addsOutputFields:false,
    unchangedConsideredMaterialCannotCloseNecessaryFact:necessary.size>0&&!sameSourceRecheck,
    reconciliationInstruction:reconciledNecessaryQuestions.length?reconciliation.instruction:null,
    instruction:ownershipInstruction+'Reviewer arithmetic and answered_fact classifications are fallible interpretations, not replacements for Native measurements. Match the named attacker/target/weapon and exact source operands, not row order or a reviewer\'s copied value. If feedback contradicts the originals, retain the feedback as history and explain the conflict; do not accept its numerical correction merely because it is a review. A genuine missing fact still requires evidence. Complete Native condition observations newly delivered with an existing measurement pair are additional material even when the cited measurement numbers are unchanged; the source_material_progress node identifies this against the actual reviewer requests. Use those actual conditions, not a fixed geometry proof-scope flag or hash inequality, to assess the comparison. This is not causal or strategy approval. When there is no additional material and the progress fence requires a challenge instead of an answered conclusion, use strategy_required with the exact source conflict; do not buy duplicate measurements or silently erase the obligation. '+(phase==='author_decision_return'
      ?'The reviewer explicitly classified these remaining obligations as author_decision. They remain unresolved, but a factual laboratory cannot choose them. Return to the strategic author without another query or source-prose correction. Preserve all questions, origins and public reasons. Do not fill Plan values, claim evidence approval, clear a missing fact, or approve release.'
      :phase==='missing_fact_investigation'
      ?'Your current job is the reviewer-declared NECESSARY FACT investigation, before prose correction. Keep answeredQuestions and valid saved facts; do not re-prove them merely to restate the answer. Read only missing existing evidence or select executable workOrders that can resolve necessaryQuestions through the normal Native tools. Rephrasing the rejected conclusion, calling the unmeasured value inconclusive, or moving it to conditions does not supply the missing measurement. An answered reply citing ONLY the same material originals already considered in this review/rejected answer is rejected; a new view/alias or model/review summary is not new material. You may use OTHER already-saved material, not necessarily buy a new query. This identity check does not prove any new material answers the question: independent source review still applies. A current-turn query being unable to predict a future opponent does not establish that a model-declared bounded counterfactual is unavailable: inspect the actual scenario/query contracts. Use only authorized fixed local scenarios, never a whole match or invented outcomes. If the reviewer must be challenged using the same originals, return strategy_required with exact reasons instead of falsely closing its missing measurement; a genuinely unavailable capability returns blocked. Once facts exist, give the scoped answer and address pendingClaimCorrections using the EXISTING output contract. No forced army edit, tactical preference or extra output fields.'
      :sameSourceRecheck?recheck.instruction
      :'Your current job is source-claim correction using the exact original facts and this specific review. No unresolved necessary fact was declared in this feedback. Preserve valid measurements and applicability limits; inspect the original before accepting a reviewer claim that an omitted display field is absent. Do not launch unrelated experiments or rewrite the whole strategy. Use the EXISTING output fields; source review is fallible, not Rules truth.'),
    returnedChoiceInstruction:resolvedAuthorDecisions.length
      ?'The strategic author explicitly answered these EXACT original choices in the current delivered strategyResolution. Consume that choice when correcting YOUR factual conclusion; do not return it to the same author again merely because the immutable review still says author_decision. The original review and questions are retained separately. This does NOT approve facts, waive a necessary measurement, change the original experiment obligation, or make a narrowed claim satisfy a broader promised comparison. State exactly what the evidence supports and what remains unproved; independent source/coverage review still applies.'
      :null,
    ...(localScope?{obligationOwnership:localScope}:{}),
    authorDecisionsAreFactQuestions:false,authorDecisionsBlockRelease:true};
}

// Read exactly the observations delivered with a pair. Query IDs, context
// aliases and receipt metadata are not new facts. Compare complete content and
// its Native identities, never a model's assertion that something is new.
async function nativeConditionMaterials(inputs,directory,store){
  const observations=[];
  for(const pair of inputs.measurementConditions?.value?.comparisons??[]){
    const r=pair.receipt,c=r?.comparison;
    if(pair.status!=='observed'||r?.schema!=='pregame_lab_scene_conditions_receipt_v1'
      ||r.resultStatus!=='ok'||c?.schema!=='pregame_scene_conditions_v1'||c.complete!==true
      ||!Array.isArray(c.differences)||!Array.isArray(c.coverage)||c.ignoredStatePaths?.length!==0)continue;
    const {receiptHash,...body}=r;if(hash(body)!==receiptHash)continue;
    const matches=async(number,ref,identity)=>{
      const entry=directory.find(e=>e.number===number);if(!entry)return false;
      const saved=await store.get(entry.artifactRef),native=(saved.value??saved).receipt;
      return native?.resultStatus==='ok'&&ref?.sourceStateHash===identity?.sourceStateHash
        &&ref?.stateHash===identity?.baseStateHash&&native.sourceStateHash===identity.sourceStateHash
        &&native.baseStateHash===identity.baseStateHash&&native.rulesRuntimeHash===identity.rulesRuntimeHash
        &&native.builderBundleHash===identity.builderBundleHash;
    };
    if(!await matches(pair.referenceMeasurement,pair.referenceStateRef,c.left)
      ||!await matches(pair.targetMeasurement,pair.targetStateRef,c.right))continue;
    const reverse=JSON.stringify(c.left)>JSON.stringify(c.right);
    const material={left:reverse?c.right:c.left,right:reverse?c.left:c.right,
      differences:c.differences.map(d=>({pointer:d.pointer,reference:reverse?d.target:d.reference,target:reverse?d.reference:d.target})),
      coverage:c.coverage.map(v=>({pointer:v.pointer,equal:v.equal,
        referencePresent:reverse?v.targetPresent:v.referencePresent,targetPresent:reverse?v.referencePresent:v.targetPresent}))};
    observations.push({referenceMeasurement:pair.referenceMeasurement,targetMeasurement:pair.targetMeasurement,
      materialHash:hash(material),receiptHash});
  }
  return observations;
}

export async function projectRosterSourceConditionProgressV1({stage,inputs,directory,store}){
  if(stage?.phase!=='missing_fact_investigation'||!inputs.measurementConditions)return null;
  const current=await nativeConditionMaterials(inputs,directory,store);if(!current.length)return null;
  const originIds=[...new Set((stage.necessaryQuestions??[]).flatMap(q=>(q.origins??[]).map(o=>o.reviewEvidenceId)))];
  if(!originIds.length||originIds.some(id=>!id?.startsWith('role:'))||!store.load)return null;
  const state=await store.load(),baseline=new Set(),baselineRequestRefs=[];
  for(const id of originIds){
    const review=state.work.find(w=>'role:'+w.id===id),calls=review?.operationState?.calls;
    if(!calls?.length||calls.some(c=>!c.requestRef))return null;
    for(const call of calls){
      const request=await store.get(call.requestRef),assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
      if(!assigned?.inputs)return null;
      for(const fact of await nativeConditionMaterials(assigned.inputs,directory,store))baseline.add(fact.materialHash);
      baselineRequestRefs.push(call.requestRef);
    }
  }
  const observations=current.filter(f=>!baseline.has(f.materialHash));
  return {kind:'source_material_progress',version:1,observations,baselineRequestRefs,
    additionalMaterial:observations.length>0,factsApproved:false,acceptanceGranted:false,
    instruction:'These exact Native condition contents were not delivered in the cited prior reviewer requests. Unchanged measurement numbers do not make the new condition observations an alias. Cite both measurements and explain what their actual conditions establish or fail to establish; original queries, samples and reaction limits still apply. Additional material only permits independent source/coverage review, not automatic factual, causal, strategic or Plan approval.'};
}

// The source-review cache has the same dependency as the progress fence:
// immutable source numbers can acquire newly delivered Native observations.
export async function rosterSourceConditionDeliveryGapV1({state,producer,consumer,readArtifact,sourceNumbers}){
  const currentRef=producer?.operationState?.calls?.at(-1)?.requestRef;
  const previousRef=consumer?.operationState?.calls?.at(-1)?.requestRef;
  if(!currentRef||!previousRef)return null;
  const current=await readArtifact(currentRef),previous=await readArtifact(previousRef);
  const currentInputs=current.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  const previousInputs=previous.promptNodes?.find(n=>n.kind==='workflow_role_assignment')?.inputs;
  if(!currentInputs||!previousInputs)return null;
  const directory=state.evidence.map((e,i)=>({...e,number:i+1})),store={get:readArtifact};
  const facts=await nativeConditionMaterials(currentInputs,directory,store);
  const prior=new Set((await nativeConditionMaterials(previousInputs,directory,store)).map(f=>f.materialHash));
  const missing=facts.filter(f=>!prior.has(f.materialHash)
    &&(!sourceNumbers||sourceNumbers.has(f.referenceMeasurement)&&sourceNumbers.has(f.targetMeasurement)));
  return missing.length?{currentRequestRef:currentRef,previousRequestRef:previousRef,missing}:null;
}

// An informational progress fence, NOT a semantic judge or strategy score.
// Collapse registered aliases to their exact originals so merely renaming the
// same receipt cannot make an unresolved measurement look newly answered.
export async function rosterSourceRepairInformationErrorV1({stage,output,inputs,directory,store,conditionProgress}){
  if(stage?.phase!=='missing_fact_investigation'||output?.action!=='conclude'
    ||output.conclusion?.status!=='answered')return null;
  const rejected=inputs.rejectedConclusion?.value?.value??inputs.rejectedConclusion?.value;
  const consideredNumbers=[...new Set([...(stage.necessaryQuestions??[]).flatMap(q=>q.evidenceNumbers??[]),
    ...(rejected?.experimentConclusion?.evidenceNumbers??[])])];
  if(!consideredNumbers.length)return null; // Legacy feedback without a baseline cannot support this assertion.
  const material=async number=>{
    let entry=directory.find(e=>e.number===number);const seen=new Set();
    while(entry&&!seen.has(entry.id)){
      seen.add(entry.id);const saved=await store.get(entry.artifactRef),body=saved?.value??saved;
      const originalId=body?.schema==='roster_workflow_receipt_view_v1'?body.evidenceId:
        body?.schema==='roster_experiment_source_facts_v1'?body.sourceEvidenceId:null;
      if(originalId){entry=directory.find(e=>e.id===originalId);continue;}
      if(typeof body?.operation==='string'&&body.receipt||entry.kind==='official_source')return entry.artifactRef;
      return null; // A model interpretation/review/Skill is not a new measurement or official fact.
    }
    return null;
  };
  const considered=new Set((await Promise.all(consideredNumbers.map(material))).filter(Boolean));
  if(!considered.size)return null;
  const selected=[...new Set(output.conclusion.evidenceNumbers??[])];
  const actual=(await Promise.all(selected.map(material))).filter(Boolean);
  if(actual.some(ref=>!considered.has(ref)))return null;
  const conditions=conditionProgress??await projectRosterSourceConditionProgressV1({stage,inputs,directory,store});
  if(conditions?.observations.some(p=>selected.includes(p.referenceMeasurement)&&selected.includes(p.targetMeasurement)))return null;
  return {code:'necessary_fact_has_no_new_material_evidence',
    questions:stage.necessaryQuestions.map(q=>q.question),consideredEvidenceNumbers:consideredNumbers,selectedEvidenceNumbers:selected,
    instruction:'This answered reply only cites material originals already considered insufficient by the current review/rejected answer, or model/review summaries. It supplies no additional material evidence for the missing measurement. Keep the valid saved facts; choose a necessary executable workOrder, read OTHER already-saved material that can answer the missing fact, or return concrete blocked/strategy_required. A new alias or rephrased inconclusive answer does not close it. Do not fabricate facts, delete necessary questions or simulate a whole match. This is an identity/progress check; independent source review still decides whether additional material actually supports the answer.'};
}

// The material-identity check cannot decide whether an interpretation or its
// reviewer is right. It can only prevent unsupported closure. Return both
// positions to the owner instead of asking for a paid format retry or demanding
// a new measurement simply because the cited source identity did not change.
export function createRosterSourceInterpretationReturnV1({assignment,output,diagnostic,directory,replyRef}){
  const publicReason='The proposed answer uses the same material disputed by its source review. This is an unresolved interpretation/evidence dispute, not a JSON error or proof that either party is correct. The strategic owner must choose a scoped source reconciliation, a necessary measurement, or revise the dependent claim; no new experiment or acceptance is authorized by this return.';
  const evidenceRefs=output.conclusion.evidenceNumbers.map(n=>{
    const source=directory.find(e=>e.number===n);return {id:source.id,artifactRef:source.artifactRef};});
  return {kind:'proposal',value:{publicReason,workOrders:[],failedWorkOrders:[],
    unresolvedQuestions:[...new Set([...output.unresolvedQuestions,...diagnostic.questions])],
    experimentConclusion:{status:'strategy_required',answer:publicReason,
      evidenceNumbers:structuredClone(output.conclusion.evidenceNumbers),evidenceRefs,
      conditions:['Original necessary facts remain unresolved. Original model/reviewer claims are not approved.'],
      hypothesisAssessments:[],acceptanceGranted:false},
    coordination:{kind:'source_interpretation_challenge',version:1,origin:'deterministic_material_router',
      originalAssignmentWorkId:assignment.workId,originalReplyRef:replyRef,
      proposedConclusion:structuredClone(output.conclusion),diagnostic:structuredClone(diagnostic),
      ownerRole:'roster_workflow_strategy_decision',newMeasurementRequiredByHost:false,
      factApprovalGranted:false,planApprovalGranted:false,nativeRetryAuthorized:false},
    originalReplyRef:replyRef,modelInterpretationNotRulesTruth:false,acceptanceGranted:false},
    conditions:['Control transfer only; the raw model reply and rejected/source-review records remain unchanged.']};
}
