import {createPostgameDevelopmentCyclePortV1} from '../../packages/strategy-skills/postgame-development-feedback-v1.mjs';
import {readSlice249ExecutionEvidenceV1} from './slice249-execution-evidence-v1.mjs';
import {createStarcraftTmgOnlineStrategySkillRegistryV1} from '../../packages/strategy-skills/online-strategy-skill-registry-v1.mjs';
import {acquirePostgameRunLeaseV1} from '../../packages/strategy-skills/postgame-skillopt-original-runtime-v1.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {hash} from '../../packages/skill-production/common.mjs';
import {createSqliteStarcraftTmgPostgameReviewStoreV2} from '../../packages/strategy-skills/sqlite-postgame-review-store-v2.mjs';
import {createPostgameLearningProductV1} from '../../packages/strategy-skills/postgame-learning-product-v1.mjs';
import {createPostgameLearningMethodsV1} from '../../packages/strategy-skills/postgame-learning-methods-v1.mjs';
import {createPostgameLearningProviderV1} from '../../packages/strategy-skills/postgame-learning-provider-v1.mjs';
import {createPostgameLearningHttpV1} from '../../packages/strategy-skills/postgame-learning-http-v1.mjs';
import {createSkillOptOptimizerProviderPortV1} from '../../packages/strategy-skills/postgame-skillopt-provider-port-v1.mjs';
import {createPostgameProductBranchExecutorV1} from '../../packages/strategy-skills/postgame-product-branch-executor-v1.mjs';
import {createPostgameEvaluationMatrixV1} from '../../packages/strategy-skills/postgame-evaluation-matrix-v1.mjs';
import {createVistaProductDevelopmentPortV1} from '../../packages/strategy-skills/vista-product-development-port-v1.mjs';
import {createSlice249ProductBranchFactoryV1} from './slice249-product-branch-factory-v1.mjs';
import {createSlice249MementoProductTrainerV1} from './slice249-memento-product-trainer-v1.mjs';
const need=(v,c)=>{if(!v)throw Error(c);};

// Host setup is trusted configuration. The Web API exposes registered names
// and public progress, never paths, private bindings or credential callbacks.
export async function createSlice249LearningProductHostV1({directory,fixtureRoot,registeredDefinitions,
  bindingsBySeat,credentialIngress,authorize,experimentQuotaStopFile,decisionPortFactory,spawnProcess,registeredFactReviews=[],registeredEvaluationOpportunities=[],hooks={}}) {
  need(directory&&fixtureRoot&&registeredDefinitions?.length&&credentialIngress&&authorize,'LEARNING_HOST_SETUP_REQUIRED');
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const store=createSqliteStarcraftTmgPostgameReviewStoreV2({filename:path.join(directory,'learning.sqlite')});
  const entries=new Map(registeredDefinitions.map(d=>[d.id,structuredClone(d)]));
  need(entries.size===registeredDefinitions.length,'LEARNING_DEFINITION_ID_DUPLICATE');
  const definitions={async read(id){need(entries.has(id),'LEARNING_DEFINITION_NOT_FOUND');return structuredClone(entries.get(id));},
    async list(){return [...entries.values()].map(d=>({id:d.id,label:d.label||d.id,routes:d.routes,learningRounds:d.learningRounds}));}};
  const openBranch=createSlice249ProductBranchFactoryV1({outputRoot:path.join(directory,'evaluation-branches'),
    fixtureRoot,selectionStore:store,decisionPortFactory,credentialIngress,experimentQuotaStopFile,spawnProcess});
  const executor=createPostgameProductBranchExecutorV1({store,openBranch});
  const matrix=createPostgameEvaluationMatrixV1({store,executor});
  const sessionOptions=request=>{
    const binding=bindingsBySeat[request.scope.ownerSeat];need(binding?.roomId&&binding.matchBinding,'LEARNING_PROVIDER_BINDING_MISSING');
    return {...binding,seatKey:request.scope.ownerSeat,dataDirectory:path.join(directory,'providers',hash(request.id)),
      credentialIngress:()=>credentialIngress({scope:request.scope,roomId:binding.roomId,seatKey:request.scope.ownerSeat}),
      experimentQuotaStopFile,spawnProcess};
  };
  const provider=request=>createPostgameLearningProviderV1({store,id:request.id,sessionOptions:sessionOptions(request)});
  const methods=createPostgameLearningMethodsV1({store,directory:path.join(directory,'methods'),
    wikiReviewerFactory:provider,
    wikiExperimentPort:{cloneCheckpoint(){throw Error('WIKI_NAVIGATION_HAS_NO_LEGACY_EXPERIMENT');},executeArm(){throw Error('WIKI_NAVIGATION_HAS_NO_LEGACY_EXPERIMENT');}},
    optimizerFactory:async request=>createSkillOptOptimizerProviderPortV1({...sessionOptions(request),directory:request.directory}),
    executor,evaluationMatrix:matrix,
    mementoTrainer:createSlice249MementoProductTrainerV1({store,directory,fixtureRoot,decisionPortFactory,credentialIngress,experimentQuotaStopFile,spawnProcess}),
    vistaMetaFactory:provider,
    vistaDevelopmentFactory:async request=>{
      const sources=Object.fromEntries(Object.entries(request.configuration.sources).map(([key,value])=>[key,
        {...value,ownerSeat:request.scope.ownerSeat,...(value.experiment?{experiment:{...value.experiment,subjectSeat:request.scope.ownerSeat,
          strategyBundle:request.baselineBundle,opponentBundle:request.opponentBundle,
          controls:{...value.experiment.controls,learningScope:request.scope,opponentSelectionRef:request.opponentSelectionId||null,...(request.sourceDomain?{sourceDomain:request.sourceDomain}:{})}}}:{})}]));
      return createVistaProductDevelopmentPortV1({sources,executor,
        async readHistory(source) {
          const asset=source.history;need(asset?.file&&asset.sha256,'VISTA_HOST_HISTORY_BINDING_REQUIRED');
          const bytes=await fs.readFile(asset.file);need(createHash('sha256').update(bytes).digest('hex')===asset.sha256,'VISTA_HISTORY_BYTES_CHANGED');
          const record=JSON.parse(bytes.toString());let image;
          if(asset.image){const pixels=await fs.readFile(asset.image.file);
            need(createHash('sha256').update(pixels).digest('hex')===asset.image.sha256,'VISTA_HISTORY_IMAGE_CHANGED');
            image={mimeType:asset.image.mimeType,data:pixels.toString('base64')};}
          return {record,...(image?{image}:{}),sourceNote:'Frozen registered development history; not hidden evaluation.'};
        },readExecutionEvidence:result=>readSlice249ExecutionEvidenceV1({store,result})});
    }});
  const publication=createStarcraftTmgOnlineStrategySkillRegistryV1({sourceBinding:registeredDefinitions[0].baselines.player1.entries[0].skill.sourceBinding,learningStore:store});
  const factReviewEntries=new Map(registeredFactReviews.map(r=>[r.id,structuredClone(r)]));
  need(factReviewEntries.size===registeredFactReviews.length,'LEARNING_FACT_REVIEW_ID_DUPLICATE');
  const factReviews={async read(id){need(factReviewEntries.has(id),'LEARNING_FACT_REVIEW_NOT_REGISTERED');return structuredClone(factReviewEntries.get(id));}};
  const opportunityKey=r=>r.studyId+':'+r.round+':'+r.seat;
  const opportunityEntries=new Map(registeredEvaluationOpportunities.map(r=>[opportunityKey(r),structuredClone(r)]));
  need(opportunityEntries.size===registeredEvaluationOpportunities.length,'LEARNING_EVALUATION_OPPORTUNITY_DUPLICATE');
  const evaluationOpportunities={async read(input){return structuredClone(opportunityEntries.get(opportunityKey(input))||null);}};
  const product=createPostgameLearningProductV1({store,definitions,methods,evaluationMatrix:matrix,developmentExperiments:createPostgameDevelopmentCyclePortV1({store,executor}),publication,factReviews,evaluationOpportunities,hooks,
    withRunOwner:async(id,operation)=>{
      const ownerDirectory=path.join(directory,'owners',hash(id));await fs.mkdir(ownerDirectory,{recursive:true});
      const release=await acquirePostgameRunLeaseV1(ownerDirectory,'LEARNING');
      try{return await operation();}finally{await release();}
    }});
  const http=createPostgameLearningHttpV1({product,definitions,authorize,
    onError:async event=>fs.appendFile(path.join(directory,'stops.jsonl'),JSON.stringify({...event,at:new Date().toISOString()})+'\n')});
  return {product,http,definitions,store,async close(){await http.close();store.close();}};
}
