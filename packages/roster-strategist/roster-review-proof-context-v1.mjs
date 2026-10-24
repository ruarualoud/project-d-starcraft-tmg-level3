// The subject of a source check is readable context, never its own proof.
// Model records still prove what was proposed/decided; Native claims require
// the actual cited source and a judge's scoped interpretation, not Host inference.
import {projectRosterEvidenceReferenceClosureV1,rosterEvidenceOriginalReferenceV1} from './roster-workflow-evidence-lineage-v1.mjs';

export const ROSTER_REVIEW_PROOF_CITATION_VERSION_V1=1;
const subjectId=inputs=>inputs.claim?.value?.originalAnswerEvidence?.sourceEvidenceId
  ??inputs.reviewSubject?.value?.sourceEvidenceId
  ??inputs.proposedConclusion?.evidenceId??inputs.proposedConclusion?.id;

function proofIdentity({inputs,directory,readArtifact}){
  const rows=directory.map((e,i)=>({...e,number:e.number??i+1}));
  const byId=new Map(rows.map(e=>[e.id,e])),subject=byId.get(subjectId(inputs));
  const subjectIds=new Set(subject?rows.filter(e=>e.id===subject.id||e.artifactRef===subject.artifactRef).map(e=>e.id):[]);
  const bodies=new Map();
  const read=async ref=>{if(!bodies.has(ref))bodies.set(ref,await readArtifact(ref));return bodies.get(ref);};
  const isSubject=async id=>{
    const seen=new Set();
    while(id&&!seen.has(id)){
      if(subjectIds.has(id))return true;
      seen.add(id);const row=byId.get(id);if(!row)return false;
      const alias=rosterEvidenceOriginalReferenceV1(await read(row.artifactRef),true);
      if(!alias)return false;
      const target=byId.get(alias.id);
      if(!target||alias.artifactRef&&alias.artifactRef!==target.artifactRef)return false;
      id=alias.id;
    }
    return false;
  };
  return {rows,subjectIds,read,isSubject};
}

export async function projectRosterReviewProofContextV1({state,inputs,readArtifact}){
  const identity=proofIdentity({inputs,directory:state.evidence,readArtifact});
  const roots=(inputs.sourceDirectory?.value?.entries??[]).map(e=>e.sourceEvidenceId).filter(Boolean);
  const graph=await projectRosterEvidenceReferenceClosureV1({state,readArtifact:identity.read,rootIds:roots,
    excludedIds:[...identity.subjectIds],includeSourceFacts:true});
  const entries=[];
  for(const row of graph.entries)if(!await identity.isSubject(row.sourceEvidenceId))entries.push(row);
  return {schema:'roster_review_proof_context_v1',version:ROSTER_REVIEW_PROOF_CITATION_VERSION_V1,
    subjectEvidenceNumbers:identity.rows.filter(e=>identity.subjectIds.has(e.id)).map(e=>e.number),
    entries,unresolvedReferences:graph.unresolvedReferences,directoryIsNotARead:true,acceptanceGranted:false,
    instruction:'The subject and its navigation aliases are only the assertion being judged: never cite them as proof of source_fidelity. These handles follow explicit saved citations to originals; discovery is not a read or approval. Read actual Native/rule facts for empirical assertions. Independent model records can establish what that author chose or stated, not validate their own mechanics. If a required premise lacks evidence, return needs_evidence; do not invent support, demand a whole match, or use a historical judge label instead of the cited source.'};
}

export async function rosterReviewProofCitationErrorsV1({inputs,directory,checks,readArtifact}){
  if(!subjectId(inputs))return [];
  const identity=proofIdentity({inputs,directory,readArtifact}),errors=[];
  const fidelityChecks=new Set(['source_fidelity',...(inputs.claimBatch?.value?.assertions??[]).map(row=>row.checkId)]);
  for(const check of checks??[]){
    if(!fidelityChecks.has(check.checkId))continue;
    for(const number of new Set(check.evidenceNumbers??[])){
      const row=identity.rows.find(e=>e.number===number);
      if(row&&await identity.isSubject(row.id))errors.push({code:'review_subject_is_not_evidence',checkId:check.checkId,evidenceNumber:number,
        instruction:'This reference is the proposal being audited (or its alias), not independent support. Keep it as context, read the actual cited source via reviewProofContext, then revise this check using those sources or return needs_evidence. No author claim has been approved or disproved by this citation error.'});
    }
  }
  return errors;
}

// Saved checks use the very same guard as fresh replies. Historical jobs may
// predate the explicit subject input, but their owner edge still identifies it.
export function rosterSavedReviewProofErrorsV1({state,work,checks,readArtifact}){
  const owner=work.materialClaimReviewOf??work.experimentSourceReviewOf;
  const inputs={...work.inputs,...(owner?{reviewSubject:{source:'literal',value:{sourceEvidenceId:'role:'+owner}}}:{})};
  return rosterReviewProofCitationErrorsV1({inputs,directory:state.evidence,checks,readArtifact});
}
