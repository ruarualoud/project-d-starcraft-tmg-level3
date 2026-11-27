import {clone,hash,verifySeal} from '../skill-production/common.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
const stableFields=['rulesVersion','modelProfile','promptVersion','contextPolicy','mapTaskIdentity'];
const numericFields=['alpha','gamma','bandwidth','voidKernel','etaExponent','rhoExponent'];
const pick=(v,fields)=>Object.fromEntries(fields.map(k=>[k,v?.[k]]));
// Host-owned initialization of a NEW learning run. Saved runs still use their
// original setup identity. Historic observations are never current-match facts.
export function prepareMemento2ContinuationV1({policy,sourceRun,scope,environment,environmentHash,featureContract,cases,config,reward}){
 if(!policy)return null;
 verifySeal(policy);
 need(policy.schemaVersion==='memento2_frozen_policy_v1'&&policy.frozenForEvaluation===true&&policy.scope?.ownerSeat===scope.ownerSeat,'MEMENTO2_CONTINUATION_SCOPE');
 need(policy.featureContract===featureContract&&hash(pick(policy.environment,stableFields))===hash(pick(environment,stableFields)),'MEMENTO2_CONTINUATION_DOMAIN_CHANGED');
 need(Array.isArray(policy.cases)&&policy.cases.every(c=>c.id&&c.sourceRef&&Array.isArray(c.features)&&c.features.every(Number.isFinite)&&(c.lesson||c.observation))&&Number.isSafeInteger(policy.feedbackSteps)&&policy.feedbackSteps>=0,'MEMENTO2_CONTINUATION_STATE_INVALID');
 const merged=new Map(policy.cases.map(c=>[c.id,clone(c)]));
 for(const c of cases){need(!merged.has(c.id)||hash(merged.get(c.id))===hash(c),'MEMENTO2_INITIAL_CASE_CONFLICT');merged.set(c.id,clone(c));}
 const sameEnvironment=policy.environmentHash===environmentHash;
 const numericConfigMatches=hash(pick(policy.config,numericFields))===hash(pick(config,numericFields));
 const sourceRewardKnown=sourceRun?.schemaVersion==='memento2_learning_run_v1'&&sourceRun.reviewId===policy.sourceRunId&&sourceRun.environmentHash===policy.environmentHash&&sourceRun.featureContract===policy.featureContract;
 const rewardMatches=sourceRewardKnown&&hash(sourceRun.reward)===hash(reward);
 const criticReused=sameEnvironment&&numericConfigMatches&&rewardMatches;
 need(policy.critic&&Object.values(policy.critic).every(q=>q&&typeof q==='object'&&Object.values(q).every(Number.isFinite)),'MEMENTO2_CONTINUATION_CRITIC_INVALID');
 return {cases:[...merged.values()],critic:criticReused?clone(policy.critic):{},feedbackSteps:policy.feedbackSteps,
  provenance:{sourcePolicyHash:policy.hash,sourceRunId:policy.sourceRunId,sourceRevision:policy.sourceRevision,
   inheritedCases:policy.cases.length,inheritedFeedbackSteps:policy.feedbackSteps,criticReused,
   opponentPolicyChanged:policy.environment?.opponentBundleHash!==environment?.opponentBundleHash,
   numericConfigMatches,sourceRewardKnown:Boolean(sourceRewardKnown),rewardMatches:Boolean(rewardMatches),
   criticResetReason:criticReused?null:!sameEnvironment?'opponent_policy_changed':!numericConfigMatches?'numerical_configuration_changed':!sourceRewardKnown?'source_reward_not_recorded':'reward_changed',
   currentMatchHistory:false,trainingTruth:false}};
}
