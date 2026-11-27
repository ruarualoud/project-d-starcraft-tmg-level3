import {rosterImportedExperienceHasFrozenOpponentV1} from "../roster-strategist/roster-opponent-knowledge-v1.mjs";
// Read saved experience without starting a Run or promoting strategic claims.
import {queryRosterConditionalExperienceObservationsV1} from '../roster-strategist/roster-conditional-experience-v1.mjs';
import {queryRosterConditionalConclusionsV1} from './roster-conditional-conclusion-v1.mjs';
import {queryRosterDeferredHypothesesV1} from '../roster-strategist/roster-deferred-hypothesis-v1.mjs';
import {rosterExperienceApplicabilityV1, rosterExperienceFactKeysV1} from '../roster-strategist/roster-conditional-experience-bindings-v1.mjs';
const copy=structuredClone;
const fail=()=>{throw Object.assign(Error('ROSTER_RETAINED_EXPERIENCE_SOURCE_MISMATCH'),{code:'ROSTER_RETAINED_EXPERIENCE_SOURCE_MISMATCH'});};

async function retainedDecision({state,goal,store}){
  const saved=goal.comparisonClosure,proof=await store.get(saved.reportRef);
  if(proof.kind!=='reviewed_optional_comparison_closure'||proof.goalId!==goal.id
    ||proof.authorWorkId!==saved.authorWorkId||proof.reviewId!==saved.reviewId
    ||proof.reviewResultRef!==saved.reviewResultRef)fail();
  // A deferred question already has its own category; a closure is never an
  // experimental conclusion, even when its author cites measured evidence.
  if(proof.comparisonResolutionKind!=='reviewed_optional_retention')return null;
  const source=proof.request,choice=source?.request;
  if(choice?.kind!=='retain_scoped'||source.authorWorkId!==proof.authorWorkId
    ||source.authorResultRef!==proof.authorResultRef)fail();
  // Resolve the original immutable sources. Missing/corrupt originals remain
  // explicit read errors, not an empty successful collection or a new verdict.
  await store.get(proof.authorResultRef);await store.get(proof.reviewResultRef);
  const sourceBindings=Object.fromEntries([...rosterExperienceFactKeysV1,'releaseManifest']
    .filter(key=>goal.bindings?.[key]).map(key=>[key,goal.bindings[key]]));
  const applicability=rosterExperienceApplicabilityV1(sourceBindings,state.scope,rosterExperienceFactKeysV1);
  const evidenceNumbers=copy(choice.evidenceNumbers??[]);
  const sourceReferences=evidenceNumbers.map(number=>{
    const entry=Number.isSafeInteger(number)&&number>0?state.evidence[number-1]:null;
    return entry?{evidenceNumber:number,evidenceId:entry.id,artifactRef:entry.artifactRef}
      :{evidenceNumber:number,unavailable:true};
  });
  const record={schema:'roster_reviewed_retention_experience_v1',version:1,gameId:'starcraft-tmg',
    recordKind:'reviewed_retention_decision',cycleId:source.cycleId,sourceBindings,
    questions:copy(source.questions??[]),decision:{selectedOption:choice.selectedOption,
      declinedAlternative:choice.declinedAlternative,basis:choice.decisionBasis,
      whyNoFurtherEvidenceNeeded:choice.whyNoFurtherEvidenceNeeded},
    conditions:copy(choice.conditions??[]),unverifiedClaims:copy(choice.unverifiedClaims??[]),
    reopenWhen:choice.reopenWhen,sourceReferences,
    proof:{closureReportRef:saved.reportRef,authorWorkId:proof.authorWorkId,
      authorResultRef:proof.authorResultRef,authorOutcomeRef:source.authorOutcomeRef,
      reviewId:proof.reviewId,reviewResultRef:proof.reviewResultRef,
      purposeWorkId:source.purposeWorkId,purposeResultRef:source.purposeResultRef},
    reviewStatus:'scheduling_closure_reviewed',knowledgeStatus:'not_established_by_closure',conclusion:null,
    advisorySkillEligible:false,strategyImprovementProven:false,canAffectRules:false,trainingTruth:false,
    realMatchHistory:false,mayWriteLiveRoomMemory:false,
    instruction:"This is the author's scoped decision to retain, not approval of every claim in its reasons. Read the original measurements and source review before reusing factual assertions. Preserve the conditions, unverified claims and reopen trigger. Matching source bindings does not prove scenario applicability or superiority. Do not reopen, replay, promote a Skill, approve an action or write live memory merely because this record was retrieved."};
  return {evidenceId:'retained-comparison:'+source.cycleId+':'+saved.reportRef,
    artifactRef:saved.reportRef,...applicability,
    usableAsEstablishedFact:false,usableWithoutApplicabilityReview:false,record};
}

export async function queryRosterConditionalExperienceSnapshotV1({state,store,query='',blindOpponent=false}){
  if(typeof query!=='string')throw Object.assign(Error('ROSTER_DECISION_EXPERIENCE_QUERY_INVALID'),{httpStatus:400});
  if(!state)throw Object.assign(Error('ROSTER_DECISION_EXPERIENCE_STATE_NOT_FOUND'),{httpStatus:404});
  const observations=await queryRosterConditionalExperienceObservationsV1({state,store,query});
  const conclusions=await queryRosterConditionalConclusionsV1({state,store,query});
  const deferred=await queryRosterDeferredHypothesesV1({state,store,query});
  const terms=query.toLocaleLowerCase().split(/\s+/u).filter(Boolean),retainedDecisions=[];
  for(const goal of state.work.filter(w=>w.comparisonClosure)){
    const entry=await retainedDecision({state,goal,store});if(!entry)continue;
    const searchable=[entry.evidenceId,...Object.values(entry.record.decision),...entry.record.conditions].join(' ').toLocaleLowerCase();
    if(terms.every(term=>searchable.includes(term)))retainedDecisions.push(entry);
  }
  const importedExperiences=[];
  for(const entry of state.evidence.filter(e=>e.id.startsWith('imported-experience:'))){
    if(blindOpponent&&!entry.artifactRef)continue;
    const record=await store.get(entry.artifactRef);
    if(record.schema!=='roster_imported_conditional_experience_v1'
      ||blindOpponent&&rosterImportedExperienceHasFrozenOpponentV1(record))continue;
    if(!terms.every(term=>JSON.stringify(record.record).toLocaleLowerCase().includes(term)))continue;
    const applicability=rosterExperienceApplicabilityV1(entry.bindings,state.scope,rosterExperienceFactKeysV1);
    importedExperiences.push({evidenceId:entry.id,artifactRef:entry.artifactRef,record,...applicability,
      usableAsEstablishedFact:false,usableWithoutApplicabilityReview:false});
  }
  return {...observations,conclusions:conclusions.entries,deferredHypotheses:deferred.entries,retainedDecisions,importedExperiences};
}
