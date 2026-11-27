import {clone,hash,fail} from '../skill-production/common.mjs';
// Only aggregate validation feedback crosses this boundary. No hidden task
// observations, opponent decisions or evaluation images are disclosed.
export function projectPostgameEvaluationFeedbackV1(evaluation){
 return {decision:evaluation.decision,aggregation:clone(evaluation.aggregation||null),
  measuredComparisons:(evaluation.outcomes||[]).map(o=>({windowComplete:o.windowComplete,
   deltas:clone(o.deltas||null),opponentDeltas:clone(o.opponentDeltas||null),
   comparisonScope:clone(o.comparisonScope||null),strategyCoverage:clone(o.strategyCoverage?.status||null)})),
  interpretation:evaluation.statisticalClaim||'observed_validation_not_population_effect',hiddenTaskContentsIncluded:false};
}
export function compilePostgameSkillChangesV1(baseline,candidate){
 const previous=new Map(baseline.entries.map(e=>[e.skill.skillId,e.skill]));
 return candidate.entries.flatMap(({skill})=>{
  const before=previous.get(skill.skillId),fields=['procedure','knowledge','skillOptAdvisories'];
  const edits=fields.filter(k=>hash(before?.[k]??null)!==hash(skill[k]??null)).map(field=>({field,before:clone(before?.[field]??null),after:clone(skill[field]??null)}));
  return edits.length?[{skillId:skill.skillId,beforeHash:before?.hash||null,afterHash:skill.hash,edits}]:[];
 });
}
export async function recordPostgameWikiImpactV1({store,wikiId,scope,selection,baseline,candidate,evaluation}){
 const id=wikiId+':impacts',old=await store.load(id);
 if(old&&(old.schemaVersion!=='postgame_wiki_impacts_v1'||hash(old.scope)!==hash(scope)))fail('POSTGAME_WIKI_IMPACT_SCOPE_MISMATCH');
 const entry={selectionId:selection.reviewId,decision:selection.decision,reason:selection.reason,
  selectedBundleHash:hash(selection.bundle),candidateBundleHash:hash(candidate),evaluationRef:clone(selection.evaluationRef),
  changes:compilePostgameSkillChangesV1(baseline,candidate),feedback:projectPostgameEvaluationFeedbackV1(evaluation),
  wholeGameImprovementProven:false,hiddenEvaluationContentsIncluded:false};
 const exists=old?.entries.find(e=>e.selectionId===entry.selectionId);
 if(exists){if(hash(exists)!==hash(entry))fail('POSTGAME_WIKI_IMPACT_CONFLICT');return;}
 const next={reviewId:id,revision:old?old.revision+1:0,schemaVersion:'postgame_wiki_impacts_v1',scope:clone(scope),entries:[...(old?.entries||[]),entry],updatedAt:new Date().toISOString()};
 const saved=await store.commit(id,old?.revision??null,next);if(!saved.ok)fail(saved.reason);
}
