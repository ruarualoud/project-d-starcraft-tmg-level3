import {prepareMemento2ContinuationV1} from './memento2-continuation-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {MEMENTO2_VOID_CASE_V1 as VOID,memento2ParzenPriorV1,memento2RetrievalPolicyV1,memento2TdUpdateV1,memento2SamplePolicyV1,memento2LearningRatesV1} from './memento2-retrieval-policy-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c})};const copy=v=>structuredClone(v);
const draw=(key)=>Number.parseInt(hash(key).slice(0,13),16)/2**52;
export function createMemento2LearningRuntimeV1({store,sourcePort,hooks={}}){
 need(store?.load&&store?.commit&&sourcePort?.readObservation&&sourcePort?.readOutcome,'MEMENTO2_PORTS_REQUIRED');
 const load=async id=>{const r=await store.load(id);need(r,'MEMENTO2_RECORD_MISSING');return r};
 async function write(old,change){const next={...old,...change,revision:old.revision+1,updatedAt:new Date().toISOString()};const r=await store.commit(old.reviewId,old.revision,next);need(r.ok,r.reason||'MEMENTO2_WRITE_CONFLICT');return next}
 async function create(id,body){const r={...body,reviewId:id,revision:0,updatedAt:new Date().toISOString()};const result=await store.commit(id,null,r);need(result.ok,result.reason||'MEMENTO2_CREATE_CONFLICT');return r}
 const runId=id=>'memento2-run:'+id;
 function observation(run,value){need(value?.seat===run.scope.ownerSeat&&value.featureContract===run.featureContract&&value.environmentHash===run.environmentHash&&typeof value.stateHash==='string'&&Array.isArray(value.features)&&value.features.every(Number.isFinite),'MEMENTO2_OBSERVATION_BINDING_INVALID');return copy(value)}
 function contextKey(o){return hash({features:o.features,featureContract:o.featureContract,environmentHash:o.environmentHash})}
 function prior(run,o){return memento2ParzenPriorV1(o.features,run.cases,{bandwidth:run.config.bandwidth,voidKernel:run.config.voidKernel})}
 async function start(input){
  need(input?.id&&['player1','player2'].includes(input.scope?.ownerSeat)&&input.environmentHash&&input.featureContract&&Array.isArray(input.cases),'MEMENTO2_SETUP_REQUIRED');
  need(input.cases.every(c=>c.id&&c.sourceRef&&Array.isArray(c.features)&&c.features.length>0&&c.features.every(Number.isFinite)&&(c.lesson||c.observation)),'MEMENTO2_CASE_SOURCE_REQUIRED');
  const config={alpha:1,gamma:.9,bandwidth:1,voidKernel:1,etaExponent:.6,rhoExponent:.9,...input.config};memento2LearningRatesV1(0,config);need(config.alpha>0&&config.gamma>=0&&config.gamma<1&&config.bandwidth>0&&config.voidKernel>0,'MEMENTO2_CONFIG_INVALID');
  need(['score_delta','terminal_win'].includes(input.reward?.kind)&&(input.reward.kind!=='score_delta'||Number.isFinite(input.reward.scale)&&input.reward.scale>0),'MEMENTO2_REWARD_CONTRACT_REQUIRED');
  const seed=prepareMemento2ContinuationV1({policy:input.parentPolicy,sourceRun:input.parentLearningRun,scope:input.scope,environment:input.environment,environmentHash:input.environmentHash,featureContract:input.featureContract,cases:input.cases,config,reward:input.reward});
  const initialLearningState=seed?{critic:seed.critic,feedbackSteps:seed.feedbackSteps,provenance:seed.provenance}:null;
  const setup={scope:copy(input.scope),environmentHash:input.environmentHash,featureContract:input.featureContract,cases:copy(seed?.cases||input.cases),config,reward:copy(input.reward),...(initialLearningState?{initialLearningState}: {})},setupHash=hash(setup);const old=await store.load(runId(input.id));if(old){need(old.setupHash===setupHash,'MEMENTO2_SETUP_CHANGED');return old}
  return create(runId(input.id),{schemaVersion:'memento2_learning_run_v1',id:input.id,...setup,setupHash,critic:copy(seed?.critic||{}),feedbackSteps:seed?.feedbackSteps||0,appliedFeedback:{},appliedOutcomes:{},memoryWrites:[],trainingTruth:false});
 }
 async function retrieve({id,queryId,observationRef}){
  const run=await load(runId(id)),key=runId(id)+':query:'+hash(queryId),inputHash=hash({queryId,observationRef});let op=await store.load(key);
  if(op){need(op.inputHash===inputHash,'MEMENTO2_QUERY_CHANGED');return op}
  const observed=observation(run,await sourcePort.readObservation(observationRef));const p=prior(run,observed),context=contextKey(observed),q=run.critic[context]||{},policy=memento2RetrievalPolicyV1(p,q,{alpha:run.config.alpha}),sample=draw({id,queryId,seed:run.config.seed??1}),selectedId=memento2SamplePolicyV1(policy.rows,sample),selected=run.cases.find(c=>c.id===selectedId)||null;
  return create(key,{schemaVersion:'memento2_retrieval_v1',runId:run.reviewId,inputHash,queryId,observationRef:copy(observationRef),observation:observed,contextKey:context,memoryRevision:run.memoryWrites.length,prior:p,policy,selectedId,sample,status:'selected',modelContext:{source:'conditional_research_memory',currentMatchHistory:false,rulesAuthority:false,...(run.initialLearningState?{learningContinuation:{opponentPolicyChanged:run.initialLearningState.provenance.opponentPolicyChanged,criticReused:run.initialLearningState.provenance.criticReused}}:{}),case:selected?copy(selected):null},delivered:null,feedback:null,trainingTruth:false});
 }
 async function delivered({id,queryId,consumerRef,stateHash}){let op=await load(runId(id)+':query:'+hash(queryId));need(typeof consumerRef==='string'&&consumerRef&&stateHash===op.observation.stateHash,'MEMENTO2_DELIVERY_BINDING_INVALID');if(op.delivered){need(op.delivered.consumerRef===consumerRef,'MEMENTO2_DELIVERY_CHANGED');return op}return write(op,{status:'delivered',delivered:{consumerRef,stateHash,at:new Date().toISOString()}})}
 async function feedback({id,queryId,executionRef}){
  let run=await load(runId(id)),op=await load(runId(id)+':query:'+hash(queryId));need(op.delivered,'MEMENTO2_UNDELIVERED_RETRIEVAL');const feedbackId=hash({queryId,executionRef});
  if(op.feedback){need(op.feedback.feedbackId===feedbackId,'MEMENTO2_FEEDBACK_CHANGED');return op}
  if(!op.preparedFeedback){
   const native=await sourcePort.readOutcome(executionRef);need(native?.status==='completed'&&native.replayMatchesCurrent===true&&native.sourceUnchanged===true&&native.audited===true&&native.seat===run.scope.ownerSeat&&native.environmentHash===run.environmentHash&&native.beforeStateHash===op.observation.stateHash&&native.nativeReceiptRef,'MEMENTO2_NATIVE_FEEDBACK_INVALID');
   const after=observation(run,native.afterObservation);let reward;
   if(run.reward.kind==='score_delta'){need(Number.isFinite(native.beforeScore)&&Number.isFinite(native.afterScore),'MEMENTO2_NATIVE_SCORE_MISSING');reward=(native.afterScore-native.beforeScore)/run.reward.scale;need(Math.abs(reward)<=1,'MEMENTO2_REWARD_SCALE_OUTSIDE_CONTRACT')}
   else{need(native.terminal===true&&['player1','player2','draw'].includes(native.winner),'MEMENTO2_NATIVE_TERMINAL_MISSING');reward=native.winner==='draw'?0:native.winner===run.scope.ownerSeat?1:-1}
   op=await write(op,{status:'feedback_prepared',preparedFeedback:{feedbackId,executionRef:copy(executionRef),native:copy(native),after,reward}});
  }else need(op.preparedFeedback.feedbackId===feedbackId,'MEMENTO2_FEEDBACK_CHANGED');
  const prepared=op.preparedFeedback;run=await load(run.reviewId);
  if(!run.appliedFeedback[feedbackId]){
   const outcomeKey=hash({receipt:prepared.native.nativeReceiptRef,seat:run.scope.ownerSeat});need(!run.appliedOutcomes[outcomeKey]||run.appliedOutcomes[outcomeKey]===feedbackId,'MEMENTO2_NATIVE_OUTCOME_ALREADY_USED');
   const rates=memento2LearningRatesV1(run.feedbackSteps,run.config),q=run.critic[op.contextKey]||{},nextContext=contextKey(prepared.after);
   const admit=draw({feedbackId,kind:'slow_write',seed:run.config.seed??1})<rates.rho,newCase={id:'native-'+feedbackId,features:op.observation.features,sourceRef:prepared.native.nativeReceiptRef,observation:{beforeStateHash:op.observation.stateHash,afterStateHash:prepared.after.stateHash,reward:prepared.reward,definition:run.reward,nativeReceipts:prepared.native.publicActions||[],...(op.observation.spatialFacts&&prepared.after.spatialFacts?{spatialContext:{before:copy(op.observation.spatialFacts),after:copy(prepared.after.spatialFacts),beforeMetrics:copy(op.observation.metrics),afterMetrics:copy(prepared.after.metrics),environmentHash:run.environmentHash,featureContract:run.featureContract,interpretation:'Observed conditions and actions only; not a rule, expected value or proof of strategic superiority.'}}:{})},lesson:null,knowledgeStatus:'observed_transition_not_proven_strategy'};
   const nextCases=admit?[...run.cases,newCase]:run.cases,nextPrior=prior({...run,cases:nextCases},prepared.after);
   const update=memento2TdUpdateV1({prior:op.prior,q,selectedId:op.selectedId,reward:prepared.reward,gamma:run.config.gamma,alpha:run.config.alpha,eta:rates.eta,terminal:prepared.native.terminal===true,nextPrior,nextQ:run.critic[nextContext]||{}});
   const receipt={feedbackId,queryId,executionRef:copy(executionRef),update,rates,admitted:admit,nativeReceiptRef:prepared.native.nativeReceiptRef};
   run=await write(run,{critic:{...run.critic,[op.contextKey]:update.q},feedbackSteps:run.feedbackSteps+1,appliedFeedback:{...run.appliedFeedback,[feedbackId]:receipt},appliedOutcomes:{...run.appliedOutcomes,[outcomeKey]:feedbackId},cases:nextCases,memoryWrites:admit?[...run.memoryWrites,{feedbackId,caseId:newCase.id}]:run.memoryWrites});
   await hooks.afterFeedbackCommitted?.(copy(receipt));
  }
  op=await write(op,{status:'completed',feedback:copy(run.appliedFeedback[feedbackId])});return op;
 }
 return {start,retrieve,delivered,feedback,read:id=>load(runId(id))};
}
