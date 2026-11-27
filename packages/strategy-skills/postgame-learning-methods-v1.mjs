import fs from 'node:fs/promises';
import path from 'node:path';
import {clone,hash} from '../skill-production/common.mjs';
import {createStarcraftTmgPostgameScenarioReviewRuntimeV2} from './postgame-scenario-review-runtime-v2.mjs';
import {createPostgameLearningAssetServiceV1} from './postgame-learning-assets-v1.mjs';
import {createPostgameEvaluationBundleServiceV1} from './postgame-evaluation-bundle-v1.mjs';
import {createSkillOptOriginalRuntimeV1,reconcileSkillOptSavedRepliesV1} from './postgame-skillopt-original-runtime-v1.mjs';
import {skillOptStrategyDocumentV1,compileSkillOptProductBundleV1,createSkillOptProductRolloutPortV1} from './postgame-skillopt-product-adapter-v1.mjs';
import {createVistaEvolutionRuntimeV1} from './vista-evolution-runtime-v1.mjs';
import {compileVistaPolicyProgramV1} from './vista-planner-policy-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};

// Actual F2–F5 entry points. Provider factories own credentials and journal
// scope; none of those values is taken from model-generated content.
export function createPostgameLearningMethodsV1({store,directory,wikiReviewerFactory,wikiExperimentPort,
  optimizerFactory,executor,mementoTrainer,vistaMetaFactory,vistaDevelopmentFactory,evaluationMatrix}) {
  const assets=createPostgameLearningAssetServiceV1({store});
  const bundles=createPostgameEvaluationBundleServiceV1({store,assets});
  async function advance(request) {
    const {id,stage,scope,configuration:cfg,baselineBundle,opponentBundle}=request;
    const controls={...cfg.controls,learningScope:scope,opponentSelectionRef:request.opponentSelectionId||null,...(request.sourceDomain?{sourceDomain:request.sourceDomain}:{})};
    const evidence={id,method:stage,inputHash:hash(request)};
    if(stage==='wiki') {
      need(wikiReviewerFactory&&wikiExperimentPort,'LEARNING_WIKI_PORTS_MISSING');
      const reviewer=await wikiReviewerFactory(request);
      try {
        const runtime=createStarcraftTmgPostgameScenarioReviewRuntimeV2({store,reviewer,experimentPort:wikiExperimentPort,assetService:assets});
        await runtime.start({reviewId:id,assetScope:scope,episodes:cfg.episodes,
          ...(cfg.learningContext?{learningContext:cfg.learningContext}:{}),
          opponentPolicies:cfg.opponentPolicies,budgets:cfg.budgets,
          targetSkills:baselineBundle.entries.map(e=>e.skill),parentWikiId:request.parentWikiId||baselineBundle.wikiRef?.wikiId||null,
          wikiProposerMode:'wiki_react_navigation_v2',wikiMaintenanceMode:'wiki_maintenance_v2',
          ...(request.factReview?{factReview:request.factReview}:{})});
        const state=await runtime.advance(id);
        if(state.status!=='completed_review_ready')return {status:state.status==='running'?'running':'paused',reason:state.status};
        const record=await store.load(id);
        const prepared=await bundles.prepare({assetId:record.learningAssetRef.assetId,scope,baselineBundle});
        return {status:'complete',scope,evidence:{...evidence,sourceRecordId:id},bundle:prepared.bundle};
      } finally {await reviewer.close?.();}
    }
    if(stage==='skillopt') {
      need(optimizerFactory&&executor&&cfg.caseRegistry&&cfg.targetSkillId,'LEARNING_SKILLOPT_PORTS_MISSING');
      const target=baselineBundle.entries.find(e=>e.skill.skillId===cfg.targetSkillId)?.skill;
      need(target,'LEARNING_SKILLOPT_TARGET_MISSING');
      const dir=path.join(directory,hash(id));
      const optimizer=await optimizerFactory({...request,directory:path.join(dir,'provider')});
      try {
        const rollout=createSkillOptProductRolloutPortV1({store,executor,caseRegistry:cfg.caseRegistry,
          baselineBundle,opponentBundle,scope,targetSkillId:cfg.targetSkillId,controls,
          sourceEpisodeRefs:baselineBundle.sourceEpisodeRefs||[],learningContext:cfg.learningContext,strategyDocumentMode:cfg.strategyDocumentMode});
        const runtime=createSkillOptOriginalRuntimeV1({directory:dir,optimizer,rollout});
        const result=await runtime.run({id,scope,skillContent:skillOptStrategyDocumentV1(target,cfg.strategyDocumentMode),
          cases:cfg.cases,config:cfg.config});
        const skillContent=await fs.readFile(path.join(dir,result.attempt,'best_skill.md'),'utf8');
        const bundle=compileSkillOptProductBundleV1({baselineBundle,scope,targetSkillId:cfg.targetSkillId,
          skillContent,sourceEpisodeRefs:baselineBundle.sourceEpisodeRefs||[],strategyDocumentMode:cfg.strategyDocumentMode});
        return {status:'complete',scope,evidence:{...evidence,sourceCommit:result.sourceCommit,
          summary:result.outcome.result},bundle};
      } finally {await optimizer.close?.();}
    }
    if(stage==='memento2') {
      need(mementoTrainer?.advance,'LEARNING_MEMENTO_TRAINER_MISSING');
      const result=await mementoTrainer.advance(request);
      if(result.status!=='complete')return result;
      need(result.policy?.scope?.ownerSeat===scope.ownerSeat,'LEARNING_MEMENTO_SCOPE');
      return {status:'complete',scope,evidence:{...evidence,sourceRunId:result.policy.sourceRunId,
        feedbackSteps:result.policy.feedbackSteps},memento2Policy:result.policy};
    }
    if(stage==='vista') {
      need(vistaMetaFactory&&vistaDevelopmentFactory&&evaluationMatrix,'LEARNING_VISTA_PORTS_MISSING');
      const meta=await vistaMetaFactory(request),development=await vistaDevelopmentFactory(request);
      try {
        const runtime=createVistaEvolutionRuntimeV1({store,metaPort:meta,developmentPort:development,evaluationMatrix});
        await runtime.start({id,ownerSeat:scope.ownerSeat,baselineBundle,
          ...(cfg.learningContext?{learningContext:cfg.learningContext}:{}),
          baselineProgram:baselineBundle.vistaProgram||compileVistaPolicyProgramV1({instructions:'',memory:'',skillOrder:[],beforePlanning:[]}),
          development:cfg.development,evaluation:{...cfg.evaluation,subjectSeat:scope.ownerSeat,opponentBundle,
            controls:{...cfg.evaluation.controls,learningScope:scope,opponentSelectionRef:request.opponentSelectionId||null,...(request.sourceDomain?{sourceDomain:request.sourceDomain}:{})}},roundLimit:cfg.roundLimit});
        const state=await runtime.advance(id);
        if(!['complete','budget_boundary'].includes(state.status))
          return {status:state.status==='needs_attention'?'paused':'running',reason:state.lastStop?.code||null};
        const incumbent=state.versions.find(v=>v.id===state.incumbentId);
        return {status:'complete',scope,evidence:{...evidence,sourceRecordId:id,incumbentId:incumbent.id,
          finishReason:state.status},bundle:incumbent.bundle,vistaProgram:incumbent.program};
      } finally {await meta.close?.();await development.close?.();}
    }
    need(false,'LEARNING_UNKNOWN_METHOD');
  }
  async function reconcileSavedReply(request){
    if(request.stage!=='skillopt')return null;
    const dir=path.join(directory,hash(request.id));
    const optimizer=await optimizerFactory({...request,directory:path.join(dir,'provider')});
    try{return await reconcileSkillOptSavedRepliesV1({directory:dir,optimizer});}
    finally{await optimizer.close?.();}
  }
  return {advance,reconcileSavedReply};
}
