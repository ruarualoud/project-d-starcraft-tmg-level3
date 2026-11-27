// Batch transport, never merge verdicts. Every original assertion/check keeps
// its own identity, exact text, source binding and pass/fail obligation.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const copy=structuredClone;
const batchLimits=Object.freeze({checks:12,characters:12000});
export function batchRosterSourceChecksV1({jobs,claims,rootId}){
  const groups=new Map(),output=[];
  for(const job of jobs){
    // Structured hypothesis verdicts and ongoing local repairs retain their
    // specialised context. Do not combine unrelated obligations for throughput.
    if(!job.inputs.claim||job.inputs.originalDataQuestions){output.push(job);continue;}
    const key=hash({bindings:job.bindings,source:job.materialClaimSourceHash,
      question:job.inputs.question,claimScope:job.inputs.claimScope??null,
      comparisonPurpose:job.inputs.comparisonPurpose??null,comparisonDecisionContract:job.inputs.comparisonDecisionContract??null});
    const chunks=groups.get(key)??[];let chunk=chunks.at(-1);
    const chars=JSON.stringify(job.inputs.claim.value).length;
    if(!chunk||chunk.jobs.length>=batchLimits.checks||chunk.characters+chars>batchLimits.characters){
      chunk={jobs:[],characters:0};chunks.push(chunk);groups.set(key,chunks);
    }
    chunk.jobs.push(job);chunk.characters+=chars;
  }
  for(const chunks of groups.values())for(const {jobs:members}of chunks){
    if(members.length===1){output.push(members[0]);continue;}
    const id=`${rootId}:source-batch:${output.length}`,inputs=copy(members[0].inputs);
    delete inputs.claim;
    for(const key of Object.keys(inputs))if(/^selectedSource\d+$/u.test(key))delete inputs[key];
    const bindings=members.map((job,index)=>({checkId:`source_fidelity_${index+1}`,
      hash:job.materialClaimHash,sourceHash:job.materialClaimSourceHash,
      contractVersion:job.materialClaimContractVersion}));
    const sources=new Map();
    for(const job of members)for(const [key,value]of Object.entries(job.inputs))
      if(/^selectedSource\d+$/u.test(key))sources.set(hash(value),value);
    [...sources.values()].forEach((value,index)=>{inputs[`selectedSource${index}`]=copy(value);});
    inputs.claimBatch={source:'literal',value:{version:1,transportOnly:true,
      instruction:'Judge EACH listed exact assertion independently against its sources under the shared claimScope author conditions; verify these conditions, which are not independent evidence. Return exactly one check for each declared checkId; no overall pass can waive a failed assertion. Do not demand repeated conditions in every sentence. Process statements are not measured strategy claims. Do not import another sentence or a caveat to erase an explicitly incompatible factual claim or invent new proof requirements outside the scoped assertion.',
      assertions:members.map((job,index)=>({checkId:bindings[index].checkId,...copy(job.inputs.claim.value)}))}};
    inputs.review.value.obligations=members.map((job,index)=>({
      ...copy(job.inputs.review.value.obligations[0]),checkId:bindings[index].checkId,
      criterion:`For claimBatch.assertions[${index}] ONLY: ${job.inputs.review.value.obligations[0].criterion}`}));
    inputs.question.value={...inputs.question.value,scope:'independent_source_assertions_batch',
      instruction:'One transport batch of same-source assertions; every assertion retains its own source-fidelity obligation. This is not a combined truth or strategy verdict.'};
    for(const [index,job]of members.entries()){
      const claim=claims.find(row=>row.reviewId===job.id);
      if(!claim)throw Error('ROSTER_SOURCE_CHECK_BATCH_CLAIM_MISSING');
      claim.reviewId=id;claim.checkBinding={...claim.checkBinding,checkId:bindings[index].checkId};
    }
    output.push({...members[0],id,inputs,materialClaimHash:hash(bindings),
      materialClaimBatch:bindings,sourceCheckBatchVersion:1});
  }
  return output;
}
export function rosterSourceCheckBindingV1(work,claimHash){
  const binding=work.materialClaimBatch?.find(row=>row.hash===claimHash);
  return binding??(!work.materialClaimBatch?{checkId:'source_fidelity',hash:work.materialClaimHash,
    sourceHash:work.materialClaimSourceHash,contractVersion:work.materialClaimContractVersion}:null);
}
