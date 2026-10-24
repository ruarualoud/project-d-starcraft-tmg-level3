// Independent factual verdicts, batched by shared source for transport.
// A global coverage verdict cannot waive any individual assertion.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {rosterReviewCheckPassedV1 as pass} from './roster-review-data-questions-v1.mjs';
import {rosterSavedReviewProofErrorsV1} from './roster-review-proof-context-v1.mjs';
import {rosterInquiryReviewStageMismatchV1} from './roster-inquiry-review-stage-v1.mjs';
import {rosterSourceConditionDeliveryGapV1} from './roster-experiment-source-repair-v1.mjs';
import {rosterSavedMeasurementScopeGapV1} from './roster-measurement-assessment-scope-v1.mjs';
import {batchRosterSourceChecksV1,rosterSourceCheckBindingV1} from './roster-source-check-batches-v1.mjs';
export const ROSTER_MATERIAL_SOURCE_CLAIM_CONTRACT_VERSION_V1=9;
const contractVersion=ROSTER_MATERIAL_SOURCE_CLAIM_CONTRACT_VERSION_V1;
const clone=value=>structuredClone(value);
const verdicts=new Set(['supported','conditional','needs_evidence','requires_revision']);
async function sameAuthorScope({state,previous,conditions,store}){
  if(conditions===undefined)return true; // Structured hypotheses bind their own conditions.
  const delivered=previous.inputs?.claimScope?.value?.conditions;
  if(delivered!==undefined)return hash(delivered)===hash(conditions);
  // Older passes remain usable only for the exact original author's scope.
  // A version bump alone must not rebuy a passed judgement.
  const author=state.work.find(w=>w.id===previous.materialClaimReviewOf);
  if(!author?.resultRef)return false;
  const original=(await store.get(author.resultRef)).value?.experimentConclusion;
  return !!original&&hash(original.conditions??[])===hash(conditions);
}
async function findCachedClaim({state,owner,sourceHash,sourceHashForVersion=()=>sourceHash,hashFor,store,sourceNumbers,conditions,excludedIds=new Set()}){
  for(const previous of [...state.work].reverse()){
    if(excludedIds.has(previous.id))continue;
    const binding=rosterSourceCheckBindingV1(previous,hashFor(previous.materialClaimContractVersion));
    if(![1,2,3,4,5,6,7,8,contractVersion].includes(previous.materialClaimContractVersion)
      ||binding?.hash!==hashFor(previous.materialClaimContractVersion)
      ||binding?.sourceHash!==sourceHashForVersion(previous.materialClaimContractVersion)||previous.role!=='roster_workflow_final_review'
      ||previous.status!=='evidence_ready'||!previous.resultRef
      ||!rosterWorkflowBindingsMatchV1(previous.bindings,owner.bindings))continue;
    if(!await sameAuthorScope({state,previous,conditions,store}))continue;
    const checks=(await store.get(previous.resultRef)).value.checks;
    if(await rosterSavedMeasurementScopeGapV1({work:previous,readArtifact:store.get}))continue;
    if(await rosterSourceConditionDeliveryGapV1({state,producer:owner,consumer:previous,readArtifact:store.get,sourceNumbers}))continue;
    // Reuse actual passes only. A supported label with unresolved questions
    // is not a pass. Failed judgements cannot cross independent author-review
    // nodes: their delivered view may be repaired without changing the frozen
    // source. Same-node enqueue remains idempotent; the existing three-round
    // review bound still prevents unbounded unchanged retries.
    const selected=checks?.filter(check=>check.checkId===binding.checkId)??[];
    if(selected.length===1&&verdicts.has(selected[0].verdict)&&pass(selected[0])
      &&!(await rosterSavedReviewProofErrorsV1({state,work:previous,checks:selected,readArtifact:store.get})).length)
      return {...previous,materialClaimHash:binding.hash,materialClaimSourceHash:binding.sourceHash,
        materialClaimCheckId:binding.checkId};
  }
  return null;
}

export async function createRosterSourceClaimReviewV1({state,owner,conclusion,sources,root,store}){
  const excludedIds=new Set([...state.work,root].flatMap(w=>
    (w.sourceReviewRepairHandoff?.staleRequests??[]).map(r=>r.workId)));
  const text=conclusion.answer;
  if(typeof text!=='string'||!text.trim())throw Error('ROSTER_SOURCE_CLAIM_TEXT_REQUIRED');
  const conditions=clone(conclusion.conditions??[]);
  if(!Array.isArray(conditions)||conditions.some(c=>typeof c!=='string'))throw Error('ROSTER_SOURCE_CLAIM_CONDITIONS_INVALID');
  const claimScope={source:'literal',value:{version:1,originalAnswerRef:owner.resultRef,
    sourcePointer:'/experimentConclusion/conditions',conditions,independentEvidence:false,
    instruction:'These are the author-declared conditions applying to each assertion, copied unchanged, NOT independent evidence. Use them to resolve scoped terms such as measured arm and to delimit the claimed result; verify the conditions against the cited sources. Do not require every sentence to repeat them. They cannot erase an explicitly false quantity, subject, group result, mechanism or contradiction. Mere repetition/style preferences are not missing factual proof. Do not expand this local assertion into proof of an expressly unmeasured alternative.'}};
  const headers=[...text.matchAll(/^\s*\d+\)[^：\n]*：/gmu)].map(m=>({index:m.index,text:m[0]}));
  const sourceHash=hash(sources.map(s=>({id:s.projection.value.sourceEvidenceId,ref:s.projection.value.sourceArtifactRef})));
  const question=root.inputs.question;
  const criterion=root.inputs.review.value.obligations.find(c=>c.checkId==='source_fidelity').criterion;
  const sourceInput=s=>({source:'evidence',id:s.projection.id,pointer:'',
    ...(!rosterWorkflowBindingsMatchV1(s.projection.bindings,owner.bindings)?{scopeUsage:'historical_reference'}:{})});
  const sourceDirectory=sources.map(s=>({sourceEvidenceId:s.projection.value.sourceEvidenceId,
    originalSourceNumber:s.originalNumber,citedNumbers:s.citedNumbers,kind:s.kind,title:s.title,
    sourceBindings:clone(s.projection.bindings),currentApplicability:rosterWorkflowBindingsMatchV1(s.projection.bindings,owner.bindings)?'current':'historical_reference_only'}));
  const segments=Array.from(new Intl.Segmenter('zh',{granularity:'sentence'}).segment(text),part=>({
    text:part.segment,start:part.index,end:part.index+part.segment.length,
    kind:part.segment.trim()?'assertion':'formatting'}));
  const claims=[],jobs=[],ruleFields=[],ruleJobs=[];
  for(const segment of segments){
    if(segment.kind==='formatting')continue;
    const part={segment:segment.text,index:segment.start};
    const first=part.index+Math.max(0,part.segment.search(/\S/u));
    const heading=headers.filter(h=>h.index<=first).at(-1)?.text??'';
    const numericRefs=new Set(part.segment.match(/\d+/gu)??[]);
    const selected=sources.filter(s=>s.citedNumbers.some(n=>numericRefs.has(String(n)))||numericRefs.has(String(s.originalNumber)));
    // New claims depend on their actual selected sources; an unrelated added
    // citation must not rebuy every already-passed assertion. Unnumbered claims
    // retain the whole source context. Older hashes remain explicitly readable.
    const localSourceHash=hash((selected.length?selected:sources).map(s=>({id:s.projection.value.sourceEvidenceId,ref:s.projection.value.sourceArtifactRef})));
    const sourceHashForVersion=version=>version>=4?localSourceHash:sourceHash;
    const hashFor=version=>hash({version,text:part.segment,heading,sourceHash:sourceHashForVersion(version),question,
      ...(version>=9?{conditions}:{})}),claimHash=hashFor(contractVersion);
    const sourceNumbers=new Set((selected.length?selected:sources).flatMap(s=>[s.originalNumber,...s.citedNumbers]));
    const cached=await findCachedClaim({state,owner,sourceHash,sourceHashForVersion,hashFor,store,sourceNumbers,conditions,excludedIds});
    const id=cached?.id??`${root.id}:claim:${claims.length}`;
    claims.push({text:part.segment,start:part.index,end:part.index+part.segment.length,heading,hash:claimHash,reviewId:id,
      checkBinding:{hash:cached?.materialClaimHash??claimHash,sourceHash:cached?.materialClaimSourceHash??localSourceHash,
        checkId:cached?.materialClaimCheckId??'source_fidelity',
        contractVersion:cached?.materialClaimContractVersion??contractVersion},
      ...(cached?{reusedResultRef:cached.resultRef}:{})});
    // A prose-wide verdict can acknowledge an Active field yet still approve a
    // sentence calling all effects Reactions. Keep the original atomic check,
    // but independently align EACH structured ability with the exact assertion.
    // This is source-derived, not a game/unit-specific rule implementation.
    for(const source of selected){
      const originalRef=source.projection.value.sourceArtifactRef;
      const original=await store.get(originalRef);
      if(!Array.isArray(original.abilities)||!original.abilities.length)continue;
      const oldFieldHash=hash({version:1,assertion:part.segment,source:originalRef,abilities:original.abilities});
      const fieldHash=hash({version:2,assertion:part.segment,source:originalRef,abilities:original.abilities,conditions});
      let prior=state.work.findLast(w=>[fieldHash,oldFieldHash].includes(w.sourceFieldMatrixHash)&&w.status==='evidence_ready'
        &&w.resultRef&&rosterWorkflowBindingsMatchV1(w.bindings,owner.bindings));
      if(prior&&!await sameAuthorScope({state,previous:prior,conditions,store}))prior=null;
      const matrixId=prior?.id??`${root.id}:rule-fields:${ruleFields.length}`;
      const checkIds=original.abilities.map((_,index)=>`ability_${index}`);
      ruleFields.push({reviewId:matrixId,hash:prior?.sourceFieldMatrixHash??fieldHash,checkIds,sourceArtifactRef:originalRef,
        ...(prior?{reusedResultRef:prior.resultRef}:{})});
      if(prior)continue;
      ruleJobs.push({id:matrixId,role:'roster_workflow_final_review',bindings:owner.bindings,
        sourceFieldMatrixHash:fieldHash,sourceFieldMatrixVersion:1,materialClaimReviewOf:owner.id,
        inputs:{claimScope:clone(claimScope),...(root.inputs.comparisonPurpose?{comparisonPurpose:clone(root.inputs.comparisonPurpose)}:{}),
          question:{source:'literal',value:{scope:'structured_ability_field_alignment',
          instruction:'Compare ONLY this exact assertion to each source ability. A shared qualifier attached to a list of effects applies to EACH named effect. Explicitly check phase, Active/Reaction/Passive, trigger, target restrictions, range and payment. A generally correct conclusion about unmeasured benefits does not excuse a wrong mechanism. Never rewrite the assertion into what the source says before judging it.'}},
          claim:{source:'literal',value:{exactText:part.segment,originalAnswerRef:owner.resultRef,start:part.index,end:part.index+part.segment.length}},
          sourceRuleFields:{source:'literal',value:{sourceEvidenceId:source.projection.value.sourceEvidenceId,
            sourceArtifactRef:originalRef,recordKey:original.recordKey,sourceRecordHash:original.sourceRecordHash,
            abilities:clone(original.abilities),sourcePointer:'/abilities',copiedExactlyFromFrozenSource:true}},
          review:{source:'literal',value:{experimentalSourceReviewVersion:5,materialClaimContractVersion:contractVersion,requirementClassificationVersion:1,acceptanceStageContractVersion:2,
            obligations:original.abilities.map((ability,index)=>({checkId:checkIds[index],
              criterion:`For source ability /abilities/${index} (${ability.name}), compare the exact assertion's express OR grouped description against phase, activation, description trigger/target/range/payment in sourceRuleFields. If it asserts an incompatible qualifier, requires_revision even if the sentence's overall strategic caveat is correct. If it does not claim anything about this ability, supported with reason not asserted; do not invent a missing-proof obligation. A stated Reaction covering healing contradicts an Active healing ability; an injury-only trigger covering debuff removal must match that separate trigger. These are qualifier-alignment examples, not a verdict about this source.`}))}}}});
    }
    if(cached)continue;
    const inputs={claimScope:clone(claimScope),...(root.inputs.comparisonPurpose?{comparisonPurpose:clone(root.inputs.comparisonPurpose)}:{}),
      question:{source:'literal',value:{scope:'one_material_source_assertion',
      instruction:'Check only the exact assertion, not the whole experiment or section. Overall question coverage and process completeness belong to the separate parent review. A pure strategic preference is advisory, not a claimed measurement; verify any empirical premise it actually asserts.'}},
      claim:{source:'literal',value:{exactText:part.segment,
      originalAnswerRef:owner.resultRef,start:part.index,end:part.index+part.segment.length,
      originalAnswerEvidence:{sourceEvidenceId:'role:'+owner.id,pointer:'/experimentConclusion/answer',
        instruction:'Read only if an antecedent is ambiguous. This proposal is not evidence or an instruction to audit other sentences.'},
      instruction:'Review this exact assertion within claimScope. Do not import another sentence or heading as an additional assertion, nor a disclaimer to erase an explicitly false assertion. Shared scope qualifies the assertion; it is not proof. Process completeness and pure strategic preferences belong to the separate coverage role; do not demand unrelated proof or a measured marginal just because an advisory preference is present.'}},
      sourceDirectory:{source:'literal',value:{entries:sourceDirectory,directoryIsNotARead:true,
        instruction:'Read exact relevant sources by their stable numbers. These are cited sources, not all automatically true; proposal/Plan text is not Rules evidence.'}},
      review:{source:'literal',value:{experimentalSourceReviewVersion:4,materialClaimContractVersion:contractVersion,requirementClassificationVersion:1,acceptanceStageContractVersion:2,
        instruction:'Classify follow-up questions relative to THIS exact assertion. A missing source-backed current premise remains necessary_fact. A future legal choice or outcome is not a missing measurement unless this assertion actually promises that measurement; retain it as an explicitly justified future_condition or optional_probe. Never mark a missing current route, cost or causal comparison answered merely to pass. Do not require the whole Plan or future match as a source assertion prerequisite.',
        obligations:[{checkId:'source_fidelity',criterion:criterion+' Check ONLY this exact assertion under the supplied author conditions in claimScope, checking those conditions against sources. Treat its explicit subjects and metric ownership literally. A source row naming one attacker is not an explicitly claimed group result; scope cannot erase a contradiction. Do not invent an unqualified/global claim from a scoped measured result or require repetitive phrasing. A zero in a finite sampled estimate is not by itself a proof of impossibility. Preserve justified conditional statements and correctly attributed approximate values.'}]}}};
    const priorRoot=root.sourceReviewRecheckOf&&state.work.find(w=>w.id===root.sourceReviewRecheckOf);
    const priorClaim=priorRoot?.materialClaims?.find(c=>c.text===part.segment);
    const priorWork=priorClaim&&state.work.find(w=>w.id===priorClaim.reviewId);
    const priorCheck=priorWork?.resultRef?(await store.get(priorWork.resultRef)).value.checks?.find(check=>
      check.checkId===(priorClaim.checkBinding?.checkId??'source_fidelity')):null;
    if(priorWork&&['supported','conditional'].includes(priorCheck?.verdict)&&priorCheck.requiredData?.length){
      inputs.originalDataQuestions={source:'literal',value:clone(priorCheck.dataQuestions?.map(q=>q.question)??priorCheck.requiredData)};
      inputs.priorQuestionJudgement={source:'evidence',id:'role:'+priorWork.id,pointer:''};
    }
    selected.forEach((s,i)=>{inputs['selectedSource'+i]=sourceInput(s);});
    const historical=selected.filter(s=>!rosterWorkflowBindingsMatchV1(s.projection.bindings,owner.bindings));
    if(historical.length){
      inputs.claimContext={source:'literal',value:{version:1,currentDraftRevision:state.draftRevision,
        currentTargetBindings:clone(owner.bindings),
        instruction:'Historical sources may be READ to audit this assertion, but are not proof of the current draft. Judge the assertion as actually written: an unqualified current Plan claim cannot inherit an older revision\'s values. Compare supplied current counterparts when present; otherwise require a current source or an explicitly historical claim. A matching old sentence does not resolve current applicability.'}};
      for(const [i,s]of historical.entries()){
        const originalId=s.projection.value.sourceEvidenceId;
        const currentId=originalId.replace(/^draft:r\d+(?=:)/u,`draft:r${state.draftRevision}`);
        const current=currentId!==originalId&&state.evidence.find(e=>e.id===currentId&&rosterWorkflowBindingsMatchV1(e.bindings,owner.bindings));
        if(current)inputs[`currentCounterpart${i}`]={source:'evidence',id:current.id,pointer:''};
      }
    }
    jobs.push({id,role:'roster_workflow_final_review',bindings:owner.bindings,materialClaimReviewOf:owner.id,
      ...(inputs.originalDataQuestions?{priorQuestionReviewId:priorWork.id}:{}),
      materialClaimContractVersion:contractVersion,materialClaimHash:claimHash,materialClaimSourceHash:localSourceHash,inputs});
  }
  if(segments.map(c=>c.text).join('')!==text)throw Error('ROSTER_SOURCE_CLAIM_COVERAGE_LOST');
  // Structured verdicts are material assertions too. Do not let an accurate
  // prose answer hide an unsupported hypothesis label in an unchecked field.
  for(const [index,assessment]of (conclusion.hypothesisAssessments??[]).entries()){
    const hashFor=version=>hash({version,hypothesisAssessment:assessment,sourceHash,question}),claimHash=hashFor(contractVersion);
    const cached=await findCachedClaim({state,owner,sourceHash,hashFor,store,excludedIds});
    const id=cached?.id??`${root.id}:hypothesis:${index}`;
    claims.push({kind:'structured_hypothesis_assessment',
      sourcePointer:`/experimentConclusion/hypothesisAssessments/${index}`,text:JSON.stringify(assessment),
      hash:claimHash,reviewId:id,checkBinding:{hash:cached?.materialClaimHash??claimHash,
        checkId:cached?.materialClaimCheckId??'source_fidelity',
        sourceHash:cached?.materialClaimSourceHash??sourceHash,contractVersion:cached?.materialClaimContractVersion??contractVersion},
      ...(cached?{reusedResultRef:cached.resultRef}:{})});
    if(cached)continue;
    const inputs={...(root.inputs.comparisonPurpose?{comparisonPurpose:clone(root.inputs.comparisonPurpose)}:{}),
      question:{source:'literal',value:{scope:'one_local_hypothesis_verdict',
      instruction:'Check this proposed verdict against the actual declared design and measured sources. This is not final army/Plan selection or global optimality.'}},
      hypothesisAssessment:{source:'literal',value:clone(assessment)},
      sourceDirectory:{source:'literal',value:{entries:sourceDirectory,directoryIsNotARead:true}},
      review:{source:'literal',value:{experimentalSourceReviewVersion:6,materialClaimContractVersion:contractVersion,requirementClassificationVersion:1,acceptanceStageContractVersion:2,
        obligations:[{checkId:'source_fidelity',criterion:'Read the actual hypothesisTest in the named source experimentOrigin. Compare its support/refutation criteria, changed factors, controlled conditions, prior evidence and promised decision impact to the actual measured observations. Check whether alternatives were really compared and whether geometry, resources, timing, optional effects or sampled uncertainty invalidate causal attribution. A correct inconclusive verdict can pass as an honest finding; it is NOT a positive strategy result. A missing comparison cannot be relabelled supported merely because a query completed. Preserve conditional scope, not universal superiority, future VP or played-match history. Source-check the structured observation, publicReason and strategicConsequence too; a verdict alone is not evidence. '+criterion}]}}};
    const selectedIds=new Set([assessment.sourceRef?.id,...(assessment.evidenceRefs??[]).map(r=>r.id)]);
    sources.filter(s=>selectedIds.has(s.projection.value.sourceEvidenceId)
      ||s.citedNumbers.some(n=>n===assessment.sourceEvidenceNumber||assessment.evidenceNumbers.includes(n)))
      .forEach((s,i)=>{inputs[`selectedSource${i}`]=sourceInput(s);});
    jobs.push({id,role:'roster_workflow_final_review',bindings:owner.bindings,materialClaimReviewOf:owner.id,
      materialClaimContractVersion:contractVersion,materialClaimHash:claimHash,materialClaimSourceHash:sourceHash,inputs});
  }
  const batchedJobs=batchRosterSourceChecksV1({jobs,claims,rootId:root.id});
  const inputs=Object.fromEntries(Object.entries(root.inputs).filter(([key])=>!/^citedSource\d+$/u.test(key)));
  inputs.sourceDirectory={source:'literal',value:{entries:sourceDirectory,directoryIsNotARead:true}};
  inputs.review={source:'literal',value:{...root.inputs.review.value,experimentalSourceReviewVersion:4,requirementClassificationVersion:1,
    purpose:'Question coverage ONLY after atomic source checks. Host composes source fidelity; do not re-audit or waive a failed claim.',
    obligations:root.inputs.review.value.obligations.filter(c=>c.checkId==='question_coverage')}};
  [...new Set(claims.map(c=>c.reviewId))].forEach((id,i)=>{inputs['claimCheck'+i]={source:'work',id,pointer:'/value'};});
  ruleFields.forEach((c,i)=>{inputs['ruleFieldCheck'+i]={source:'work',id:c.reviewId,pointer:'/value'};});
  for(const job of [...batchedJobs,...ruleJobs])job.inputs.reviewSubject={source:'literal',value:{sourceEvidenceId:'role:'+owner.id}};
  return {...root,inputs,sourceFidelityMode:'atomic_claims_v1',materialClaimContractVersion:contractVersion,
    materialClaimSourceHash:sourceHash,materialSegments:segments,materialClaims:claims,materialClaimReviewIds:claims.map(c=>c.reviewId),claimReviews:batchedJobs,
    sourceFieldMatrixVersion:1,materialRuleFields:ruleFields,ruleFieldReviews:ruleJobs};
}

export async function assessRosterSourceClaimReviewV1({state,review,store}){
  const ids=review.materialClaimReviewIds,claims=review.materialClaims;
  if(!Array.isArray(ids)||!ids.length||!Array.isArray(claims)||ids.length!==claims.length)
    return {status:'requires_revision',acceptedForStrategy:false,checks:[],failedClaimReviewIds:[]};
  const checks=[],failed=[];
  for(const [i,id]of ids.entries()){
    const work=state.work.find(w=>w.id===id);
    if(work?.status!=='evidence_ready'||!work.resultRef)return {status:'awaiting_source_review',acceptedForStrategy:false};
    const binding=claims[i].checkBinding??{hash:claims[i].hash,sourceHash:review.materialClaimSourceHash,
      contractVersion:review.materialClaimContractVersion};
    const actualBinding=rosterSourceCheckBindingV1(work,binding.hash);
    if(actualBinding?.hash!==binding.hash||actualBinding?.sourceHash!==binding.sourceHash
      ||actualBinding?.contractVersion!==binding.contractVersion
      ||actualBinding?.checkId!==(binding.checkId??'source_fidelity')
      ||!rosterWorkflowBindingsMatchV1(work.bindings,review.bindings))
      return {status:'requires_revision',acceptedForStrategy:false,checks:[],failedClaimReviewIds:[id]};
    const all=(await store.get(work.resultRef)).value.checks??[];
    const expected=work.materialClaimBatch?.map(row=>row.checkId)??['source_fidelity'];
    const actual=all.filter(check=>check.checkId===(binding.checkId??'source_fidelity'));
    if(all.length!==expected.length||new Set(all.map(c=>c.checkId)).size!==expected.length
      ||all.some(c=>!expected.includes(c.checkId))||actual.length!==1||!pass(actual[0])
      ||(await rosterSavedReviewProofErrorsV1({state,work,checks:actual,readArtifact:store.get})).length)failed.push(id);
    checks.push(...actual);
  }
  for(const field of review.materialRuleFields??[]){
    const work=state.work.find(w=>w.id===field.reviewId);
    if(work?.status!=='evidence_ready'||!work.resultRef)return {status:'awaiting_source_review',acceptedForStrategy:false};
    const actual=(await store.get(work.resultRef)).value.checks??[];
    if(work.sourceFieldMatrixHash!==field.hash||work.sourceFieldMatrixVersion!==1
      ||!rosterWorkflowBindingsMatchV1(work.bindings,review.bindings)
      ||actual.length!==field.checkIds.length||new Set(actual.map(c=>c.checkId)).size!==field.checkIds.length
      ||!field.checkIds.every(id=>actual.some(c=>c.checkId===id&&pass(c))))failed.push(field.reviewId);
    checks.push(...actual);
  }
  // Completed atomic failures are actionable before a redundant parent summary.
  // No parent result still means no coverage/final acceptance.
  const rootChecks=review.resultRef?(await store.get(review.resultRef)).value.checks??[]:[];
  const coverage=rootChecks.find(c=>c.checkId==='question_coverage');
  const source={checkId:'source_fidelity',verdict:failed.length?'requires_revision':'supported',
    publicReason:`Independent atomic source checks: ${ids.length}; failed: ${failed.length}. Each actual result remains at its claim review ID.`,
    requiredData:checks.flatMap(c=>c.requiredData??[]),requiredDecisions:checks.flatMap(c=>c.requiredDecisions??[]),
    conditions:checks.flatMap(c=>c.conditions??[]),
    claimReviewIds:clone(ids),failedClaimReviewIds:clone(failed)};
  const coverageStageMismatch=await rosterInquiryReviewStageMismatchV1({review,readArtifact:store.get});
  const accepted=!failed.length&&rootChecks.length===1&&pass(coverage)&&!coverageStageMismatch;
  return {status:accepted?'answered':'requires_revision',acceptedForStrategy:accepted,
    checks:[source,...(coverage?[coverage]:[])],failedClaimReviewIds:failed,coverageStageMismatch};
}
