// Concrete616/619: a positive combined-result assertion was waived by a later
// per-attacker disclaimer. Require independently checked source assertions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1,
  createRosterExperimentReviewRevisionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
const base=process.cwd()+'/build/slice272-projection-owner-v565-inlKbk/workspace/decision-workflows/projection-owner';
const state=JSON.parse(await fs.readFile(base+'/workflow.json','utf8'));
const saved=new Map(),get=async ref=>saved.get(ref)??JSON.parse(await fs.readFile(base+'/artifacts/'+ref+'.json','utf8'));
const owner=state.work.filter(w=>w.experimentGoalId==='p5-current-obligations-v577:r2:component_choices').at(-1);
const result=await get(owner.resultRef),reviewId=owner.id+':source-recheck:atomic-fidelity-v598';
const review=await createRosterExperimentSourceReviewV1({state,owner,result,store:{get},reviewId});
assert.ok(review.claimReviews?.length,'positive assertions must have separate source checks, not one whole-answer verdict');
const {claimReviews,sourceProjections,...root}=review;
assert.equal(root.sourceFidelityMode,'atomic_claims_v1');
assert.equal(root.inputs.review.value.obligations.length,1,'global model checks coverage, not duplicate source fidelity');
assert.equal(root.inputs.review.value.obligations[0].checkId,'question_coverage');
const claims=root.materialClaims;
assert.equal(root.materialSegments.map(c=>c.text).join(''),result.value.experimentConclusion.answer,'every original character must remain covered');
const combined=claims.find(c=>c.text.includes('合计期望伤害10.056'));
assert.ok(combined);
assert.ok(!combined.text.includes('非合并齐射'),'later disclaimer cannot share the positive assertion check');
assert.ok(claims.some(c=>c.text.includes('非合并齐射')),'disclaimer must remain separately covered');
assert.equal(claims.length,root.materialClaimReviewIds.length);
assert.equal(new Set(root.materialClaimReviewIds).size,root.materialClaimReviewIds.length);
const all={...state,work:[...state.work,...claimReviews,root]};
const pending=await assessRosterExperimentConclusionV1({state:all,owner,store:{get}});
assert.equal(pending.acceptedForStrategy,false);
const ids=new Set(root.materialClaimReviewIds);
for(const [index,id]of root.materialClaimReviewIds.entries())saved.set('claim'+index,{value:{checks:[{checkId:'source_fidelity',
  verdict:id===combined.reviewId?'requires_revision':'supported',publicReason:id===combined.reviewId?'10.056 is Marauder_1 only, not combined':'source matches',
  requiredData:[],conditions:[],evidenceRefs:[]}]}});
saved.set('coverage',{value:{checks:[{checkId:'question_coverage',verdict:'supported',publicReason:'coverage complete',
  requiredData:[],conditions:[],evidenceRefs:[]}]}});
const evaluated={...all,work:all.work.map(w=>w.id===root.id?{...w,status:'evidence_ready',resultRef:'coverage'}:
  ids.has(w.id)?{...w,status:'evidence_ready',resultRef:'claim'+root.materialClaimReviewIds.indexOf(w.id)}:w)};
const rejected=await assessRosterExperimentConclusionV1({state:evaluated,owner,store:{get}});
assert.equal(rejected.status,'requires_revision');
assert.equal(rejected.acceptedForStrategy,false,'coverage pass cannot waive a false atomic source assertion');
assert.ok(rejected.failedClaimReviewIds.includes(combined.reviewId));
const revision=await createRosterExperimentReviewRevisionV1({state:evaluated,owner,store:{get}});
assert.ok(Object.values(revision.inputs).some(i=>i.source==='evidence'&&i.id==='role:'+combined.reviewId),
  'the author must receive the actual failed source check');
// A later answer must reuse unchanged verified assertions, not re-buy them.
const changed=structuredClone(result);changed.value.experimentConclusion.answer=changed.value.experimentConclusion.answer.replace('合计期望伤害10.056','单独期望伤害10.056');
const second=await createRosterExperimentSourceReviewV1({state:evaluated,owner:{...owner,id:owner.id+':next'},result:changed,
  store:{get},reviewId:owner.id+':next:source-recheck:atomic-fidelity-v598'});
assert.ok(second.claimReviews.length<claimReviews.length,'unchanged checks are reused');
assert.ok(!second.materialClaimReviewIds.includes(combined.reviewId),'changed assertion cannot reuse old rejected result');
assert.equal(JSON.stringify(state),JSON.stringify(JSON.parse(await fs.readFile(base+'/workflow.json','utf8'))),'production snapshot unchanged');
console.log(JSON.stringify({passed:true,concreteReplies:[616,619],atomicClaims:claims.length,allTextCovered:true,
  falsePositiveCannotBeWaived:true,failedClaimDeliveredToAuthor:true,unchangedChecksReused:true,
  providerCalls:0,productionWrites:0,proves:'Atomic review scheduling and release contract; real model repair/production still required'}));
