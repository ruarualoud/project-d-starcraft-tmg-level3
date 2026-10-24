// A changed factual contract belongs to the source judge, not a syntax repairer.
// Preserve the old judgment and all observations; retire only work delegated by
// that judgment. This never decides whether an experimental claim is true.
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
import {rosterComparisonValidityContractV1} from './roster-comparison-purpose-v1.mjs';
import {ROSTER_SOURCE_REVIEW_PRESENTATION_VERSION_V1 as presentationVersion} from './roster-source-review-presentation-v1.mjs';
import {ROSTER_REVIEW_OBLIGATION_DELIVERY_VERSION_V1 as obligationDeliveryVersion,
  missingRosterReviewObligationFieldsV1} from './roster-role-communication-v1.mjs';
import {ROSTER_REVIEW_PROOF_CITATION_VERSION_V1 as proofCitationVersion,rosterSavedReviewProofErrorsV1} from './roster-review-proof-context-v1.mjs';
import {ROSTER_INQUIRY_REVIEW_STAGE_VERSION_V1 as inquiryStageVersion,
  rosterInquiryReviewStageRequiredV1,rosterInquiryReviewStageMismatchV1} from './roster-inquiry-review-stage-v1.mjs';
import {ROSTER_MEASUREMENT_SCENE_DELIVERY_VERSION_V1 as sceneDeliveryVersion} from './roster-measurement-scenes-v1.mjs';
import {projectRosterMeasurementConfigurationInputsV1} from './roster-measurement-configuration-v1.mjs';
import {projectRosterEvidenceReferenceClosureV1} from './roster-workflow-evidence-lineage-v1.mjs';
import {rosterSourceConditionDeliveryGapV1} from './roster-experiment-source-repair-v1.mjs';
import {rosterSavedMeasurementScopeGapV1} from './roster-measurement-assessment-scope-v1.mjs';

export function rosterSourceReviewNeedsContractCheckV1(review){
  return review.experimentSourceReviewOf&&['ready','needs_model_choice','evidence_ready'].includes(review.status)
    &&review.sourceFidelityMode==='atomic_claims_v1'
    &&((review.comparisonValidityContractVersion??0)<4||(review.sourceReviewPresentationVersion??0)<presentationVersion
      ||(review.reviewObligationDeliveryVersion??0)<obligationDeliveryVersion
      ||(review.sourceProofCitationVersion??0)<proofCitationVersion
      ||(review.measurementSceneDeliveryVersion??0)<sceneDeliveryVersion
      ||rosterInquiryReviewStageRequiredV1(review)&&(review.sourceInquiryStageVersion??0)<inquiryStageVersion);
}

export function rosterSourceReviewRepairMembersV1({state,review,includeCoverageConsumers=false}){
  const graph=createRosterWorkflowGraphV1(state);
  const roots=state.work.filter(w=>w.status!=='superseded'&&(w.experimentReviewOf===review.experimentSourceReviewOf
    &&w.inputs?.sourceReview?.id===`role:${review.id}`||includeCoverageConsumers
    &&w.role==='roster_workflow_strategy_decision'&&Object.values(w.inputs??{}).some(input=>
      input.source==='evidence'&&input.id===`role:${review.id}`)));
  const members=[...new Map(roots.flatMap(w=>graph.descendants(w.id))
    .map(w=>[w.id,w])).values()];
  return {roots,members};
}

// A completed answer transfers review authority to that answer's own review.
// An old failed judgment remains evidence, not a perpetual migration owner.
// Use explicit delegation edges; neither ID suffixes nor array order are time.
export function rosterSourceReviewCompletedRevisionV1({state,review}){
  return rosterSourceReviewRepairMembersV1({state,review}).roots.find(work=>
    work.status==='evidence_ready'&&work.resultRef&&!work.operationState?.pending
    &&Object.entries(work.bindings??{}).every(([key,value])=>state.scope[key]===value))??null;
}

// Repair only a proven erroneous migration whose parent has not yet issued.
// The immutable retirement receipt supplies status/ref/attempt; no model
// answer, cost, checkpoint counter, army or Plan is rewritten or replayed.
export async function projectRosterSourceReviewLineageRestorationV1({state,review,readArtifact}){
  if(!review.sourceReviewRepairHandoff||review.status==='superseded'||review.resultRef
    ||review.operationState?.pending||review.operationState?.calls?.length)return null;
  const event=state.events.findLast(e=>e.type==='source_review_repair_returned'&&e.replacementReviewId===review.id);
  if(!event?.reportRef)return null;
  const report=await readArtifact(event.reportRef);
  if(report.kind!=='source_review_repair_handoff'||report.replacementReviewId!==review.id
    ||report.reviewId!==review.sourceReviewRecheckOf||report.ownerId!==review.experimentSourceReviewOf
    ||!Array.isArray(report.originalWork)||!report.originalWork.length
    ||new Set(report.originalWork.map(w=>w.id)).size!==report.originalWork.length)return null;
  const originals=report.originalWork.map(saved=>({saved,work:state.work.find(w=>w.id===saved.id)}));
  if(originals.some(({saved,work})=>!work||work.status!=='superseded'
    ||work.reviewRepairSupersession?.replacementReviewId!==review.id
    ||work.reviewRepairSupersession?.reportRef!==event.reportRef
    ||(work.resultRef??null)!==saved.resultRef||(work.attempt??0)!==saved.attempt
    ||work.operationState?.pending||['running','superseded'].includes(saved.status)
    ||!Object.entries(work.bindings??{}).every(([key,value])=>state.scope[key]===value)))return null;
  const completed=originals.find(({saved,work})=>saved.status==='evidence_ready'&&saved.resultRef
    &&report.retiredRootIds.includes(work.id)&&work.experimentReviewOf===report.ownerId
    &&work.inputs?.sourceReview?.id===`role:${report.reviewId}`);
  if(!completed)return null;
  // materialClaimReviewIds includes reused old passes. The enqueue receipt,
  // not that dependency list, identifies exactly which new jobs to retire.
  const enqueue=state.events.find(e=>e.type==='work_enqueued'&&e.workIds.includes(review.id));
  if(!enqueue)return null;
  const graph=createRosterWorkflowGraphV1(state);
  const retired=[...new Map(enqueue.workIds.flatMap(id=>graph.descendants(id)).map(w=>[w.id,w])).values()];
  if(retired.some(w=>w.status==='running'||w.operationState?.pending
    ||originals.some(row=>row.work.id===w.id)))return null;
  return {reportRef:event.reportRef,reviewId:review.id,completedRevisionId:completed.work.id,
    originals:originals.map(({saved})=>saved),retiredIds:retired.map(w=>w.id)};
}

export async function projectRosterSourceReviewRepairHandoffV1({state,owner,review,failedClaimReviewIds,readArtifact}){
  const inquiryMismatch=await rosterInquiryReviewStageMismatchV1({review,readArtifact});
  if(inquiryMismatch){
    if(rosterSourceReviewCompletedRevisionV1({state,review}))return null;
    const {roots,members}=rosterSourceReviewRepairMembersV1({state,review,includeCoverageConsumers:true});
    // Never undo a committed strategic decision or replace an in-flight call.
    if(roots.some(w=>w.role==='roster_workflow_strategy_decision'&&w.status==='evidence_ready')
      ||[owner,review,...members].some(w=>w.status==='running'||w.operationState?.pending))return null;
    return {version:1,reviewId:review.id,ownerId:owner.id,retiredRootIds:roots.map(w=>w.id),
      staleRequests:[inquiryMismatch],currentInquiryStageVersion:inquiryStageVersion,
      reason:inquiryMismatch.missingIndependentCoverage
        ?'The saved comparative coverage request mixed the author answer and passed sentence-review prose into its question-alignment input. Reassess original question versus actual configurations/measurements independently; retain all valid source checks and retire only uncommitted consumers of this judgment. No verdict is preselected.'
        :'The saved coverage request used a different acceptance stage than its explicit authorized inquiry. Reassess coverage only; retain valid atomic checks and retire uncommitted consumers of that judgment.',
      nativeReplay:false,factsApproved:false,historyReset:false};
  }
  const contract=rosterComparisonValidityContractV1(owner);
  const oldProofContract=(review?.sourceProofCitationVersion??0)<proofCitationVersion;
  const oldSceneDelivery=(review?.measurementSceneDeliveryVersion??0)<sceneDeliveryVersion;
  if(!['ready','needs_model_choice','evidence_ready'].includes(review?.status)
    ||review.sourceFidelityMode!=='atomic_claims_v1'||!oldSceneDelivery&&!failedClaimReviewIds?.length
    ||!oldSceneDelivery&&!oldProofContract&&(!contract||contract.version<3
      ||review.comparisonValidityContractVersion>=contract.version
      &&(review.sourceReviewPresentationVersion??0)>=presentationVersion
      &&(review.reviewObligationDeliveryVersion??0)>=obligationDeliveryVersion))return null;
  if(rosterSourceReviewCompletedRevisionV1({state,review}))return null;
  const staleRequests=[];
  // A missing source arm can cause a false positive as well as a rejection.
  // Version only opens inspection: the actual request must prove omission of
  // a source relation used by that judgment before any verdict is invalidated.
  const inspectedIds=oldSceneDelivery?[...new Set([...(failedClaimReviewIds??[]),...(review.materialClaimReviewIds??[])])]
    :failedClaimReviewIds;
  for(const id of inspectedIds){
    const failed=state.work.find(w=>w.id===id),call=failed?.operationState?.calls?.at(-1);
    if(!call?.requestRef||failed.status!=='evidence_ready')continue;
    const request=await readArtifact(call.requestRef);
    if(failed.operationState?.pending)return null;
    const originalAssignment=failed.inputRef?await readArtifact(failed.inputRef)
      :{workId:failed.id,role:failed.role,inputs:failed.inputs};
    const missingObligationFields=missingRosterReviewObligationFieldsV1({assignment:originalAssignment,request});
    const missingObligationDelivery=missingObligationFields.length>0;
    const delivered=request.promptNodes?.find(n=>n.kind==='current_comparison_validity_contract');
    const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    // Version alone never invalidates a judgment. Prove the actual failed
    // request omitted an assigned Native scene link for measurements it used.
    const cited=new Set((failed.resultRef?(await readArtifact(failed.resultRef)).value.checks:[])
      ?.flatMap(check=>check.evidenceNumbers??[])??[]);
    let missingSceneRelations=[];
    if(oldSceneDelivery&&assigned?.inputs){
      const projected=await projectRosterMeasurementConfigurationInputsV1({assignment:originalAssignment,state,readArtifact,
        resolveReferences:projectRosterEvidenceReferenceClosureV1});
      const deliveredScenes=assigned.inputs.measurementScenes?.value?.relations??[];
      missingSceneRelations=(projected.measurementScenes?.value.relations??[]).filter(r=>
        cited.has(r.referenceMeasurement)&&cited.has(r.targetMeasurement)
        &&!deliveredScenes.some(old=>old.referenceMeasurement===r.referenceMeasurement&&old.targetMeasurement===r.targetMeasurement
          &&old.source?.artifactRef===r.source.artifactRef&&old.source?.pointer===r.source.pointer));
    }
    const missingMeasurementSceneDelivery=missingSceneRelations.length>0;
    const conditionGap=oldSceneDelivery?await rosterSourceConditionDeliveryGapV1({state,producer:owner,
      consumer:failed,readArtifact,sourceNumbers:cited}):null;
    const missingNativeConditionDelivery=Boolean(conditionGap);
    const scopeGap=oldSceneDelivery?await rosterSavedMeasurementScopeGapV1({work:failed,readArtifact}):null;
    const ambiguousMeasurementScope=Boolean(scopeGap);
    const missingSceneFacts=Boolean(assigned?.inputs.comparisonPurpose
      &&!assigned.inputs.activeHypothesisTests?.value?.assetCatalogue?.controlledSceneComparisons);
    const missingSourcePresentation=Boolean(assigned?.inputs.comparisonPurpose
      &&assigned.inputs.review?.value?.experimentalSourceReviewVersion
      &&assigned.inputs.activeHypothesisTests?.value?.assetCatalogue?.controlledSceneComparisons
      &&(request.sourceReviewPresentationVersion??0)<presentationVersion);
    const proofErrors=oldProofContract&&failed.resultRef?await rosterSavedReviewProofErrorsV1({state,work:failed,
      checks:(await readArtifact(failed.resultRef)).value.checks,readArtifact}):[];
    const invalidProofCitations=proofErrors.length>0;
    if(ambiguousMeasurementScope||missingNativeConditionDelivery||missingMeasurementSceneDelivery||invalidProofCitations||contract?.version>=3&&(delivered?.version<3
      ||delivered?.version<contract.version&&missingSceneFacts||missingSourcePresentation||missingObligationDelivery))
      staleRequests.push({workId:id,requestRef:call.requestRef,originalInputRef:failed.inputRef??null,
        version:delivered?.version,missingSceneFacts,missingSourcePresentation,missingObligationDelivery,missingObligationFields,
        missingMeasurementSceneDelivery,missingSceneRelations,
         missingNativeConditionDelivery,missingNativeConditions:conditionGap?.missing??[],
         conditionSourceRequestRef:conditionGap?.currentRequestRef??null,
        ambiguousMeasurementScope,measurementScopeMarkers:scopeGap?.markers??[],
        invalidProofCitations,proofErrors});
  }
  if(!staleRequests.length)return null;
  const {roots,members}=rosterSourceReviewRepairMembersV1({state,review});
  if(rosterSourceReviewCompletedRevisionV1({state,review}))return null;
  if([owner,review,...members].some(w=>w.status==='running'||w.operationState?.pending))return null;
  return {version:1,reviewId:review.id,ownerId:owner.id,retiredRootIds:roots.map(w=>w.id),
    staleRequests,currentValidityContractVersion:contract?.version??0,currentSourcePresentationVersion:presentationVersion,
    currentObligationDeliveryVersion:obligationDeliveryVersion,
    currentProofCitationVersion:proofCitationVersion,
    currentMeasurementSceneDeliveryVersion:sceneDeliveryVersion,
    reason:'Affected judgments used changed Host scope markers, lost assigned obligations or Native scene linkage, or cited the reviewed subject as proof. Reassess only affected judgments against original sources before correcting delegated methods. A projection not assessing causality neither establishes nor refutes it; evaluate the supplied condition/configuration observations and uncertainty together. No author claim is approved by this handoff.',
    nativeReplay:false,factsApproved:false,historyReset:false};
}

export function rosterOrderRepairContextV1(work){
  return Object.fromEntries(Object.entries(work.inputs??{}).filter(([key])=>
    ['question','comparisonPurpose','sourceReview','sourceRepairStage','rejectedConclusion','strategyResolution','nativeChoiceTemplate','choiceContext'].includes(key)
    ||/^(?:failedSourceClaim|observedSource)\d+$/.test(key)).map(([key,value])=>[key,structuredClone(value)]));
}
