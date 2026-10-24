// Parent comparison purpose is context, not delegated responsibility. Use the
// shared semantic asset index; do not accumulate every ancestor's copied test.
import {projectRosterWorkflowExperimentAssetsV1} from './roster-workflow-experiment-assets-v1.mjs';

export function rosterWorkflowNeedsSourceLineageV1(assignment){
  return ['roster_workflow_experiment_planner','roster_workflow_strategy_decision','roster_workflow_local_teach','roster_workflow_fact_summary'].includes(assignment.role)
    ||assignment.role==='roster_workflow_final_review'&&Boolean(assignment.inputs.review?.value?.domainId
      ||assignment.inputs.proposedConclusion||assignment.inputs.comparisonPurpose
      ||assignment.inputs.claim||assignment.inputs.hypothesisAssessment);
}

export async function projectRosterWorkflowHypothesisContextV1(args){
  const work=args.state.work.find(w=>w.id===args.workId);
  // Loading Native configuration provenance must not promote a sentence judge
  // into an owner of ancestor experiments it was never assigned.
  if(work?.role==='roster_workflow_final_review'&&(work.inputs.claim||work.inputs.hypothesisAssessment)
    &&!work.inputs.comparisonPurpose)return null;
  const assets=await projectRosterWorkflowExperimentAssetsV1(args);
  const {entries,purposeInput,purposeOrigin,taskScope}=assets;
  if(!entries.length&&!purposeInput)return null;
  const sourceInputs=purposeInput?{comparisonPurpose:purposeInput}:{};
  for(const [index,entry]of entries.entries())if(entry.assessmentSourceEvidenceNumber){
    sourceInputs['hypothesisDesignSource'+index]={source:'evidence',status:'read',
      evidenceId:entry.assessmentSourceEvidenceId,evidenceNumber:entry.assessmentSourceEvidenceNumber,
      pointer:entry.assessmentSourcePointer,value:structuredClone(entry.hypothesisTest)};
  }
  return {context:{schema:'roster_declared_hypothesis_context_v2',sourceIdentityVersion:1,taskScope,entries,
    sourceIdentityInstruction:'sourceEvidenceNumbers contains only immutable receipts whose actual hypothesisTest equals this declaration. relatedSourceEvidenceNumbers retains all order results for navigation, including factual prerequisites: those are NOT automatically design sources. No matching carrier means no inline hypothesis source; keep the original declaration and its unresolved assessment, never fabricate a source or verdict.',
    assetCatalogue:assets.catalogue,
    ...(purposeOrigin?{comparisonPurposeOrigin:purposeOrigin,comparisonPurposeStillNeedsResult:true}:{}),
    originalTestStillNeedsAssessment:entries.some(entry=>!entry.priorAssessments.length),
    acceptanceGranted:false,claimsAreRulesTruth:false,
    instruction:'taskScope is the assigned responsibility. A fact_method answers only its current question and returns actual facts or a capability/strategy gap; context_only parent designs are NOT additional assessments to complete. Use hypothesisTest=null for supporting menu/geometry/payment/measurement work. The comparison owner retains its owned design and required independent review. Child design proposals remain in assetCatalogue at their original sources; they neither replace the parent design nor create new authorization. Declarations and observations are separate: cite the design source as sourceEvidenceNumber, and actual observation sources as evidenceNumbers. The catalogue is navigation, not a read, a measured result or approval. Fetch necessary exact originals; never turn an operation or a static scene into proof of a different endpoint. New strategic questions return to the strategic owner. No full-match simulation, forced army edit, invented result or automatic Skill promotion.'},
    sourceInputs};
}
