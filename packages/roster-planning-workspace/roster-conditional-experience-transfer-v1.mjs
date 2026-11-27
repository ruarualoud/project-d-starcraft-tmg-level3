// Explicit, source-owned transfer of conditional records. No strategic verdict,
// Native execution, Provider reply or live-match memory is created here.
import {createHash} from 'node:crypto';
import {queryRosterConditionalExperienceSnapshotV1} from './roster-conditional-experience-reader-v1.mjs';
const categories=['entries','conclusions','deferredHypotheses','retainedDecisions'];
const fail=code=>{throw Object.assign(Error(code),{code,httpStatus:404});};
export function listRosterConditionalExperienceEntriesV1(snapshot){
  return categories.flatMap(category=>(snapshot[category]??[]).map(entry=>({category,...entry})));
}
export async function prepareRosterConditionalExperienceImportV1({sourceWorkflowId,evidenceId,state,store}){
  const entries=listRosterConditionalExperienceEntriesV1(await queryRosterConditionalExperienceSnapshotV1({state,store}));
  const entry=entries.find(row=>row.evidenceId===evidenceId);
  if(!entry)fail('ROSTER_CONDITIONAL_EXPERIENCE_NOT_FOUND');
  const record=entry.record,refs=new Map(),unavailableReferences=[];
  const add=(ref,purpose)=>{if(ref)refs.set(ref,[...(refs.get(ref)??[]),purpose]);};
  add(entry.artifactRef,'original experience or closure');
  for(const row of record.sourceReferences??[])if(row.artifactRef)add(row.artifactRef,'cited evidence '+row.evidenceNumber);
  for(const number of record.evidenceNumbers??[]){
    const source=Number.isSafeInteger(number)&&number>0?state.evidence[number-1]:null;
    if(source)add(source.artifactRef,'cited evidence '+number);else unavailableReferences.push({evidenceNumber:number,reason:'not_registered_in_source'});
  }
  const proof=record.proof??{};
  for(const key of ['closureReportRef','authorResultRef','authorOutcomeRef','reviewResultRef','purposeResultRef'])add(proof[key],key);
  for(const key of ['purpose','experiment','sourceReview','owner','comparisonReview']){
    add(proof[key]?.resultRef,key);add(proof[key]?.outcomeRef,key+' outcome');
  }
  add(record.actualObservation?.source?.resultRef,'original tool result');
  const sourceArtifacts=[];
  for(const [artifactRef,purposes] of refs)sourceArtifacts.push({artifactRef,purposes,value:await store.get(artifactRef)});
  const sourceBindings=record.sourceBindings??record.actualObservation?.bindings
    ??state.evidence.find(row=>row.id===evidenceId)?.bindings??{};
  const origin={workflowId:sourceWorkflowId,evidenceId,artifactRef:entry.artifactRef};
  const id='imported-experience:'+createHash('sha256').update(JSON.stringify(origin)).digest('hex');
  const label=record.decision?.selectedOption??record.provisionalDecision?.selectedOption
    ??record.purpose?.decisionQuestion??record.declaredConditions?.origin?.question??evidenceId;
  return {id,kind:'hypothesis',title:'历史条件经验: '+label+' ['+record.recordKind+']',
    bindings:Object.fromEntries(Object.entries(sourceBindings).filter(([key])=>key!=='plan')),
    conditions:['Historical conditional experience; not current opponent intelligence, new measurement, approved Skill or live-match event.',
      'Read original conditions, unresolved claims and source evidence; matching dependencies alone does not establish applicability.'],
    value:{schema:'roster_imported_conditional_experience_v1',version:1,origin,sourceCategory:entry.category,
      record:structuredClone(record),sourceBindings:structuredClone(sourceBindings),sourceArtifacts,unavailableReferences,
      sourceClosure:'Only the original record and explicitly cited/proof artifacts are copied. Nested artifact references remain source-workflow references; no recursive historical closure is claimed.',
      localEvidenceNumbers:'All evidenceNumbers inside record and sourceArtifacts belong to origin.workflowId. They are NOT handles in this workflow. Read copied sourceArtifacts by JSON Pointer or retrieve the original registered workflow.',
      usableAsEstablishedFact:false,usableWithoutApplicabilityReview:false,advisorySkillEligible:false,
      strategyApprovalGranted:false,canAffectRules:false,trainingTruth:false,realMatchHistory:false,mayWriteLiveRoomMemory:false}};
}
