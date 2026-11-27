import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {clone,hash} from '../../packages/skill-production/common.mjs';
import {measurePostgameStateV1,classifyPostgameSourceV1} from '../../packages/strategy-skills/postgame-paired-product-runtime-v1.mjs';
import {createMemento2LearningRuntimeV1} from '../../packages/strategy-skills/memento2-learning-runtime-v1.mjs';
import {createMemento2NativeExecutionSourcePortV1} from '../../packages/strategy-skills/memento2-native-source-port-v1.mjs';
import {createMemento2PlannerMemoryPortV1} from '../../packages/strategy-skills/memento2-planner-memory-port-v1.mjs';
import {compileFrozenMemento2PolicyV1} from '../../packages/strategy-skills/memento2-frozen-policy-v1.mjs';
import {createPostgameProductBranchExecutorV1} from '../../packages/strategy-skills/postgame-product-branch-executor-v1.mjs';
import {createSlice249ProductBranchFactoryV1} from './slice249-product-branch-factory-v1.mjs';
import {memento2FeatureContractV1} from '../../packages/strategy-skills/memento2-native-observation-v1.mjs';
import {createMemento2ContinuousMemoryPortV1,createMemento2IntervalSourcePortV1,memento2IntervalStoreKeyV1} from '../../packages/strategy-skills/memento2-continuous-memory-port-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
const fields=['score','supply','livingModels','livingUnits'];

export function projectMemento2TrainingHorizonV1(cfg){
 const continuous=cfg.trajectory?.kind==='decision_intervals_v1';
 need(!cfg.trajectory||continuous&&Number.isSafeInteger(cfg.trajectory.maxActions)&&cfg.trajectory.maxActions>1,'MEMENTO2_TRAJECTORY_CONTRACT_INVALID');
 const kind=cfg.trajectory?.horizon||'action_window';
 need(['action_window','round_end','match_end'].includes(kind),'MEMENTO2_TRAJECTORY_HORIZON_INVALID');
 return {kind,maxActions:continuous?cfg.trajectory.maxActions:1};
}
// Existing single-action requests retain their identities. New bounded windows
// explicitly opt into decision_intervals_v1; reward attaches to each delivered
// decision until the next own decision, never an invented future game result.
export function createSlice249MementoProductTrainerV1({store,directory,fixtureRoot,decisionPortFactory,credentialIngress,experimentQuotaStopFile,spawnProcess,hooks={}}) {
  async function advance(request) {
    const {id,configuration:cfg,scope,baselineBundle,opponentBundle}=request;
    need(cfg.mapTaskIdentity&&cfg.cases?.length&&cfg.cases.every(c=>c.id&&c.source
      &&classifyPostgameSourceV1(c.source).maySupportStrategyEvaluation),'MEMENTO2_TRAINING_AUDITED_CASES_REQUIRED');
    need(cfg.reward?.kind==='score_delta','MEMENTO2_ONE_ACTION_REWARD_CONTRACT');
    const scales=cfg.featureScales||Object.fromEntries(fields.map(k=>[k,1]));
    const environment={rulesVersion:cfg.controls.rulesVersion,modelProfile:cfg.controls.modelProfile,
      promptVersion:cfg.controls.promptVersion,contextPolicy:cfg.controls.contextPolicy,
      opponentBundleHash:hash(opponentBundle),mapTaskIdentity:cfg.mapTaskIdentity};
    const continuous=cfg.trajectory?.kind==='decision_intervals_v1';
    const horizon=projectMemento2TrainingHorizonV1(cfg);
    const featureMode=continuous?'native_spatial_phase_v1':'native_metrics_v1';
    const featureContract=memento2FeatureContractV1(scales,featureMode);
    const frozenEnvironment={...environment,featureScales:scales,...(continuous?{featureMode}:{})};
    const key=id+':training';let record=await store.load(key);
    if(!record) {
      record={reviewId:key,revision:0,schemaVersion:'postgame_memento_product_training_v1',
        inputHash:hash(request),status:'running',completed:[],updatedAt:new Date().toISOString()};
      need((await store.commit(key,null,record)).ok,'MEMENTO2_TRAINING_CREATE_CONFLICT');
    }
    need(record.inputHash===hash(request),'MEMENTO2_TRAINING_INPUT_CHANGED');
    const observations=new Map();
    const native=createMemento2NativeExecutionSourcePortV1({executionStore:store,mapTaskIdentity:cfg.mapTaskIdentity,featureScales:scales});
    const sourcePort={readOutcome:native.readOutcome,async readObservation(ref) {
      need(observations.has(ref.caseId),'MEMENTO2_TRAINING_OBSERVATION_NOT_BOUND');return observations.get(ref.caseId);
    }};
    const runtime=createMemento2LearningRuntimeV1({store,sourcePort:continuous?createMemento2IntervalSourcePortV1({store}):sourcePort,hooks:hooks.learning});
    await runtime.start({id,scope,environmentHash:hash(environment),featureContract,
      cases:cfg.initialCases||[],reward:cfg.reward,config:cfg.config,
      ...(baselineBundle.memento2Policy?{parentPolicy:baselineBundle.memento2Policy,
        parentLearningRun:await store.load(baselineBundle.memento2Policy.sourceRunId),environment}:{})});
    await hooks.afterLearningInitialized?.(await runtime.read(id));
    if(record.status==='complete')return {status:'complete',policy:compileFrozenMemento2PolicyV1({
      run:await runtime.read(id),environment:frozenEnvironment})};
    const c=cfg.cases.find(c=>!record.completed.some(x=>x.caseId===c.id));
    need(c,'MEMENTO2_TRAINING_CURSOR_INVALID');
    const bytes=await fs.readFile(c.source.stateFile);
    const parsed=JSON.parse(c.source.stateFile.endsWith('.gz')?zlib.gunzipSync(bytes):bytes.toString());
    const state=parsed.state||parsed;need(hash(state)===c.source.stateHash,'MEMENTO2_TRAINING_SOURCE_CHANGED');
    const metrics=measurePostgameStateV1(state,scope.ownerSeat);
    observations.set(c.id,{seat:scope.ownerSeat,stateHash:c.source.stateHash,environmentHash:hash(environment),
      featureContract,features:fields.map(k=>metrics[k]/scales[k])});
    const queryId=c.id,executionKey=id+':native:'+hash(c.id),observationRef={caseId:c.id};
    const openBranch=createSlice249ProductBranchFactoryV1({outputRoot:path.join(directory,hash(id),'branches'),fixtureRoot,selectionStore:store,
      decisionPortFactory,credentialIngress,experimentQuotaStopFile,spawnProcess,onBoundary:hooks.afterNative,memoryTrainingFactory:async ctx=>{
        const roomScope={gameId:'starcraft-tmg',roomId:ctx.fixture.player1Scope.roomId,
          seatKey:ctx.seat,matchBindingHash:ctx.fixture.createdRoom.matchBinding.bindingHash};
        if(continuous){
          const controller=createMemento2ContinuousMemoryPortV1({store,runtime,id,executionKey,scope:roomScope,base:ctx.memoryQueryPort,
            readState:ctx.readState,readPublicTransitions:ctx.readPublicTransitions,replay:ctx.replay,sourceUnchanged:ctx.sourceUnchanged,environmentHash:hash(environment),scales,hooks:hooks.interval});
          return {memoryQueryPort:controller,beforeDecision:controller.beforeDecision,onPromptArtifact:controller.confirmPrompt,finish:controller.finish};
        }
        const controller=createMemento2PlannerMemoryPortV1({runtime,id,queryId,scope:roomScope,
          observationRef,stateHash:c.source.stateHash,base:ctx.memoryQueryPort});
        return {memoryQueryPort:controller,onPromptArtifact:artifact=>controller.confirmPrompt(artifact)};
      }});
    const executor=createPostgameProductBranchExecutorV1({store,openBranch});
    // Training starts from the current Skill/hook candidate but does not also
    // query a second frozen numerical policy. The learning runtime owns it.
    const trainingBundle=clone(baselineBundle);delete trainingBundle.memento2Policy;
    if(trainingBundle.hash){delete trainingBundle.hash;trainingBundle.hash=hash(trainingBundle);}
    const result=await executor.run({executionKey,armName:'development',source:c.source,subjectSeat:scope.ownerSeat,
      strategyBundle:trainingBundle,opponentBundle,controls:{...cfg.controls,mapTaskIdentity:cfg.mapTaskIdentity,
        learningScope:scope,opponentSelectionRef:request.opponentSelectionId||null,
        ...(request.sourceDomain?{sourceDomain:request.sourceDomain}:{}),
        randomSeed:hash({id,caseId:c.id,seed:cfg.seed??1})},horizon});
    need(result.windowComplete,'MEMENTO2_TRAINING_ACTION_NOT_COMPLETE');
    const selected=continuous?null:await store.load('memento2-run:'+id+':query:'+hash(queryId));
    let feedback=null;
    if(selected?.delivered)feedback=(await runtime.feedback({id,queryId,executionRef:executionKey})).feedback;
    const intervals=continuous?await store.load(memento2IntervalStoreKeyV1(executionKey)):null;
    if(continuous)need(intervals&&intervals.pending.length===0,'MEMENTO2_INTERVALS_NOT_SETTLED');
    const completed=[...record.completed,{caseId:c.id,executionKey,feedback,...(continuous?{intervals:intervals.completed,featureContract}:{}) ,
      reason:continuous?'bounded_decision_intervals_native_feedback':feedback?'actual_delivered_retrieval_and_native_feedback':'no_delivered_retrieval_no_learning_claim'}];
    const next={...record,completed,status:completed.length===cfg.cases.length?'complete':'running',
      revision:record.revision+1,updatedAt:new Date().toISOString()};
    need((await store.commit(key,record.revision,next)).ok,'MEMENTO2_TRAINING_COMMIT_CONFLICT');
    return next.status==='complete'?{status:'complete',policy:compileFrozenMemento2PolicyV1({
      run:await runtime.read(id),environment:frozenEnvironment})}:{status:'running'};
  }
  return {advance};
}
