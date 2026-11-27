import {clone,hash,seal,verifySeal} from '../skill-production/common.mjs';
import {projectMemento2NativeObservationV1,memento2FeatureContractV1} from './memento2-native-observation-v1.mjs';
import {memento2ParzenPriorV1,memento2RetrievalPolicyV1,memento2SamplePolicyV1} from './memento2-retrieval-policy-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
const fields=['score','supply','livingModels','livingUnits'];

export function compileFrozenMemento2PolicyV1({run,environment}) {
  need(run?.schemaVersion==='memento2_learning_run_v1'&&run.scope?.ownerSeat&&environment?.mapTaskIdentity,
    'MEMENTO2_FREEZE_INPUT_REQUIRED');
  const scales=environment.featureScales||Object.fromEntries(fields.map(k=>[k,1]));
  need(fields.every(k=>Number.isFinite(scales[k])&&scales[k]>0),'MEMENTO2_FEATURE_CONTRACT_INVALID');
  const {rulesVersion,modelProfile,promptVersion,contextPolicy,opponentBundleHash,mapTaskIdentity}=environment;
  const mode=environment.featureMode||'native_metrics_v1';
  const binding={rulesVersion,modelProfile,promptVersion,contextPolicy,opponentBundleHash,mapTaskIdentity};
  need(hash(binding)===run.environmentHash&&run.featureContract===memento2FeatureContractV1(scales,mode),
    'MEMENTO2_FREEZE_ENVIRONMENT_MISMATCH');
  return seal({schemaVersion:'memento2_frozen_policy_v1',scope:clone(run.scope),
    sourceRunId:run.reviewId,sourceRevision:run.revision,environmentHash:run.environmentHash,
    environment:{...binding,featureScales:clone(scales),...(mode!=='native_metrics_v1'?{featureMode:mode}:{})},featureContract:run.featureContract,
    cases:clone(run.cases),critic:clone(run.critic),config:clone(run.config),feedbackSteps:run.feedbackSteps,
    frozenForEvaluation:true,trainingTruth:false});
}

// Evaluation only reads this snapshot. It cannot update Q or write cases, even
// when the caller performs many queries or restarts an evaluation branch.
export function createFrozenMemento2MemoryPortV1({policy,scope,base,readState,environment}) {
  verifySeal(policy);
  need(policy.schemaVersion==='memento2_frozen_policy_v1'&&policy.frozenForEvaluation===true
    &&policy.scope.ownerSeat===scope.seatKey&&base?.query&&readState,'MEMENTO2_FROZEN_SCOPE');
  const binding={...policy.environment,...environment};delete binding.featureScales;delete binding.featureMode;
  const opponentChanged=binding.opponentBundleHash!==policy.environment.opponentBundleHash;
  const stable={...binding,opponentBundleHash:policy.environment.opponentBundleHash};
  need(hash(stable)===policy.environmentHash,'MEMENTO2_FROZEN_ENVIRONMENT_CHANGED');
  return {async query(input) {
    for(const k of ['roomId','matchBindingHash','seatKey'])need(input.scope?.[k]===scope[k],'MEMENTO2_FROZEN_QUERY_SCOPE');
    const before=await readState(),current=await base.query(input),after=await readState();
    need(before.stateHash===after.stateHash,'MEMENTO2_FROZEN_STATE_CHANGED');
    for(const k of ['roomId','matchBindingHash','seatKey'])need(current.scope?.[k]===scope[k],'MEMENTO2_FROZEN_RESULT_SCOPE');
    const observed=projectMemento2NativeObservationV1({state:before.state,stateHash:before.stateHash,seat:scope.seatKey,environmentHash:policy.environmentHash,scales:policy.environment.featureScales,mode:policy.environment.featureMode||'native_metrics_v1'});
    const features=observed.features;
    const context=hash({features,featureContract:policy.featureContract,environmentHash:policy.environmentHash});
    const prior=memento2ParzenPriorV1(features,policy.cases,policy.config);
    const distribution=memento2RetrievalPolicyV1(prior,policy.critic[context]||{},{alpha:policy.config.alpha});
    const draw=Number.parseInt(hash({policy:policy.hash,stateHash:before.stateHash,seed:policy.config.seed??1}).slice(0,13),16)/2**52;
    const selected=memento2SamplePolicyV1(distribution.rows,draw);
    const {queryResultHash:old,...body}=current;
    const result={...body,learnedRetrieval:{policyHash:policy.hash,stateHash:before.stateHash,
      case:clone(policy.cases.find(c=>c.id===selected)||null),source:'frozen_memento2_retrieval',
      opponentPolicyChangedSinceTraining:opponentChanged,
      convergenceGuaranteeForCurrentOpponent:false,
      currentMatchHistory:false,rulesAuthority:false,featureInterpretation:observed.featureInterpretation||'Finite aggregate Native features; not a geometric similarity proof.'}};
    return {...result,queryResultHash:hash(result)};
  }};
}
