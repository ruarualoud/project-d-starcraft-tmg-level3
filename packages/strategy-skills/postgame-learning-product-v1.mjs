import {normalizePostgameLearningContextV1} from './postgame-development-feedback-v1.mjs';
import {assertPostgameLearningSourcePartitionV1} from './postgame-learning-source-partition-v1.mjs';
import {clone, hash, seal, verifySeal} from '../skill-production/common.mjs';
import {normalizePostgameLearningScopeV1} from './postgame-learning-assets-v1.mjs';
import {assertPostgameEvaluationBundleV1} from './postgame-evaluation-bundle-v1.mjs';
import {createPostgameVersionSelectionV1} from './postgame-version-selection-v1.mjs';
import {recordPostgameWikiImpactV1} from './postgame-learning-impact-v1.mjs';

const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
export const POSTGAME_METHOD_STAGES_V1=Object.freeze({
  RW:['wiki'], RS:['skillopt'], RMV:['memento2','vista'],
  RH:['wiki','skillopt','memento2','vista'],
});
const other=seat=>seat==='player1'?'player2':'player1';
const unique=items=>[...new Map(items.map(x=>[hash(x),clone(x)])).values()];

// A method edits its own facet. It does not have to echo all preceding assets.
// The Host preserves those assets and freezes one indivisible evaluation bundle.
export function composePostgameJointBundleV1({scope,baselineBundle,previousBundle,stage,result}) {
  scope=normalizePostgameLearningScopeV1(scope);
  need(POSTGAME_METHOD_STAGES_V1[scope.route]?.includes(stage),'LEARNING_STAGE_OUTSIDE_ROUTE');
  need(result?.status==='complete'&&result.evidence?.id&&result.evidence?.method===stage,
    'LEARNING_METHOD_RESULT_REQUIRED');
  need(hash(result.scope)===hash(scope),'LEARNING_METHOD_RESULT_SCOPE');
  const previous=previousBundle||baselineBundle;
  if(previous.schemaVersion==='starcraft_postgame_evaluation_bundle_v1') {
    assertPostgameEvaluationBundleV1(previous,scope.ownerSeat);
    need(hash(previous.scope)===hash(scope),'LEARNING_PREVIOUS_SCOPE');
  }
  const next=result.bundle||previous;
  if(result.bundle&&hash(next)!==hash(previous)) {
    assertPostgameEvaluationBundleV1(next,scope.ownerSeat);
    need(hash(next.scope)===hash(scope),'LEARNING_METHOD_BUNDLE_SCOPE');
  }
  need(next.entries?.length,'LEARNING_EMPTY_SKILL_BUNDLE');
  for(const entry of next.entries)verifySeal(entry.skill);
  const body={...clone(previous),...clone(next),
    schemaVersion:'starcraft_postgame_evaluation_bundle_v1',scope,
    baselineBundleHash:hash(baselineBundle),
    sourceAssetId:result.evidence.id,
    sourceAssetHash:hash(result.evidence),
    sourceEpisodeRefs:unique([...(previous.sourceEpisodeRefs||[]),...(next.sourceEpisodeRefs||[])]),
    memoryCandidates:unique([...(previous.memoryCandidates||[]),...(next.memoryCandidates||[])]),
    wikiRef:result.wikiRef||next.wikiRef||previous.wikiRef||null,
    changes:unique([...(previous.changes||[]),...(next.changes||[])]),
    methodEvidence:[...(previous.methodEvidence||[]),clone(result.evidence)],
    purpose:'isolated_postgame_evaluation',runtimeAccepted:false,automaticPromotion:false,
    canAffectRules:false,trainingTruth:false,
  };
  delete body.hash;
  if(result.memento2Policy)body.memento2Policy=clone(result.memento2Policy);
  if(result.vistaProgram)body.vistaProgram=clone(result.vistaProgram);
  if(body.memento2Policy) {
    verifySeal(body.memento2Policy);
    need(hash(body.memento2Policy.scope)===hash(scope),'LEARNING_MEMENTO_POLICY_SCOPE');
  }
  const bundle=seal(body);
  assertPostgameEvaluationBundleV1(bundle,scope.ownerSeat);
  return bundle;
}

// Web and CLI invoke this service. Definitions are Host-owned, frozen inputs;
// callers supply a registered name/route, not filesystem paths or tool receipts.
export function createPostgameLearningProductV1({store,definitions,methods,evaluationMatrix,developmentExperiments=null,publication=null,factReviews=null,evaluationOpportunities=null,hooks={},withRunOwner=async(_id,operation)=>operation()}) {
  need(store?.load&&store?.commit&&definitions?.read&&methods?.advance&&evaluationMatrix,
    'LEARNING_PRODUCT_PORTS_REQUIRED');
  const selection=createPostgameVersionSelectionV1({store}),active=new Map();
  async function persist(r,fields) {
    const next={...r,...(r.schemaVersion==='postgame_learning_product_v1'&&!Object.hasOwn(fields,'lastError')?{lastError:null}:{}),...clone(fields),revision:r.revision+1,updatedAt:new Date().toISOString()};
    const saved=await store.commit(r.reviewId,r.revision,next);need(saved.ok,saved.reason||'LEARNING_CAS_CONFLICT');return next;
  }
  async function read(id) {
    const r=await store.load(id);need(r?.schemaVersion==='postgame_learning_product_v1','LEARNING_RUN_NOT_FOUND');return r;
  }
  async function start({id,definitionId,route}) {
    need(typeof id==='string'&&id.trim()&&POSTGAME_METHOD_STAGES_V1[route],'LEARNING_START_INVALID');
    const definition=clone(await definitions.read(definitionId));
    need(definition?.id===definitionId&&definition.baselines?.player1?.entries?.length
      &&definition.baselines?.player2?.entries?.length&&['player1','player2'].includes(definition.firstLearner)
      &&Number.isSafeInteger(definition.learningRounds)&&definition.learningRounds>0,'LEARNING_DEFINITION_INVALID');
    need(definition.routes?.includes(route),'LEARNING_ROUTE_NOT_REGISTERED');
    if(definition.learningContext)normalizePostgameLearningContextV1(definition.learningContext);
    if(definition.developmentCycles){
      need(definition.learningContext&&developmentExperiments?.advance,'LEARNING_DEVELOPMENT_PORT_REQUIRED');
      for(const seat of ['player1','player2']){const c=definition.developmentCycles[seat];
        need(c&&Number.isSafeInteger(c.iterations)&&c.iterations>=2&&c.cases?.length&&c.seed,'LEARNING_DEVELOPMENT_CYCLE_INVALID');
      }
    }
    for(const seat of ['player1','player2']) {
      need(definition.training?.[seat]&&definition.evaluation?.[seat],'LEARNING_SEAT_DEFINITION_MISSING');
      for(const stage of POSTGAME_METHOD_STAGES_V1[route])
        need(definition.training[seat][stage],'LEARNING_METHOD_CONFIGURATION_MISSING:'+stage);
    }
    const inputHash=hash({definition,route});const old=await store.load(id);
    if(old){need(old.inputHash===inputHash,'LEARNING_INPUT_CHANGED');return read(id);}
    const sourcePartition=assertPostgameLearningSourcePartitionV1(definition,POSTGAME_METHOD_STAGES_V1[route]);
    const record={reviewId:id,revision:0,schemaVersion:'postgame_learning_product_v1',inputHash,sourcePartition,
      definition,route,status:'running',phase:'methods',round:0,stageIndex:0,
      learnerSeat:definition.firstLearner,currentBySeat:clone(definition.baselines),
      roundBaseline:clone(definition.baselines[definition.firstLearner]),
      frozenOpponent:clone(definition.baselines[other(definition.firstLearner)]),
      frozenOpponentSelectionId:null,selectionBySeat:{player1:null,player2:null},
      wikiBySeat:{player1:clone(definition.baselines.player1.wikiRef||null),player2:clone(definition.baselines.player2.wikiRef||null)},
      ...(definition.developmentCycles?{cycleIndex:0,cycleBaseline:clone(definition.baselines[definition.firstLearner]),developmentHistory:[],feedbackBySeat:{player1:[],player2:[]}}:{}),
      candidate:null,stages:[],history:[],pending:null,updatedAt:new Date().toISOString(),trainingTruth:false};
    need((await store.commit(id,null,record)).ok,'LEARNING_CREATE_CONFLICT');return record;
  }
  const scope=r=>({experimentId:r.reviewId,route:r.route,ownerSeat:r.learnerSeat});
  function configuration(r,stage){
    const cfg=clone(r.definition.training[r.learnerSeat][stage]);
    if(r.definition.learningContext)cfg.learningContext=normalizePostgameLearningContextV1({...r.definition.learningContext,
      developmentFeedback:[...(r.definition.learningContext.developmentFeedback||[]),...(r.feedbackBySeat?.[r.learnerSeat]||[])]});
    return cfg;
  }
  async function reviseWikiCandidateOwned({id,reviewId}) {
    need(factReviews?.read&&typeof reviewId==='string','LEARNING_FACT_REVIEW_NOT_REGISTERED');
    let r=await read(id);const review=clone(await factReviews.read(reviewId));
    need(review?.id===reviewId&&review.studyId===id&&review.candidateHash
      &&review.issues?.length&&review.evidence?.length,'LEARNING_FACT_REVIEW_INVALID');
    const childId=`${id}:round:${r.round}:${r.learnerSeat}:wiki:fact-revision:${hash(reviewId).slice(0,16)}`;
    const opId=childId+':handoff',old=await store.load(opId);
    if(old) {
      need(old.factReviewHash===hash(review),'LEARNING_FACT_REVIEW_CHANGED');
      if(r.factRevisions?.some(v=>v.id===childId)||r.pending?.id===childId)return r;
    }
    need(['RW','RH'].includes(r.route)&&r.phase==='methods'&&r.stageIndex===1
      &&!r.pending&&r.candidate?.wikiRef&&!r.evaluationId,'LEARNING_FACT_REVISION_REQUIRES_WIKI_BOUNDARY');
    need(hash(r.candidate)===review.candidateHash,'LEARNING_FACT_REVIEW_CANDIDATE_CHANGED');
    const request={id:childId,stage:'wiki',scope:scope(r),
      configuration:configuration(r,'wiki'),
      baselineBundle:clone(r.candidate),opponentBundle:clone(r.frozenOpponent),
      parentWikiId:r.candidate.wikiRef.wikiId,opponentSelectionId:r.frozenOpponentSelectionId,
      ...(r.sourcePartition?{sourceDomain:clone(r.definition.mapTaskDomain||null)}:{}),
      factReview:{...review,repairBasePolicy:'current_candidate_v2',baselinePolicy:'Repair the current unaccepted candidate incrementally. Preserve learned entries outside the supplied factual issue; revise or explicitly remove an affected entry rather than resetting to the round baseline. The previous Wiki remains revisable research, not factual authority. The round baseline stays unchanged for comparison.'}};
    if(!old)need((await store.commit(opId,null,{reviewId:opId,revision:0,
      schemaVersion:'postgame_method_handoff_v1',request,requestHash:hash(request),
      factReviewHash:hash(review),supersededCandidate:clone(r.candidate),status:'prepared',
      updatedAt:new Date().toISOString()})).ok,'LEARNING_HANDOFF_CREATE_CONFLICT');
    return persist(r,{phase:'wiki_fact_revision',status:'running',
      pending:{id:childId,stage:'wiki',status:'prepared',reviewId},
      candidateFactReview:{reviewId,status:'revision_pending'}});
  }
  async function step(id) {
    let r=await read(id);if(r.status!=='running')return r;
    // Only the last unpublished method can be reconsumed. Existing evaluations
    // and later roles must never silently adopt a changed candidate.
    if(r.phase==='methods'&&!r.pending&&!r.evaluationId&&r.stageIndex>0
      &&POSTGAME_METHOD_STAGES_V1[r.route][r.stageIndex-1]==='skillopt'&&methods.reconcileSavedReply){
      const last=r.stages.at(-1),op=await store.load(last.id+':handoff');
      need(op?.request?.stage==='skillopt','LEARNING_SAVED_REPLY_HANDOFF_REQUIRED');
      const recovery=await methods.reconcileSavedReply(clone(op.request));
      if(recovery&&op.savedReplyRecoveryId!==recovery.id){
        await persist(op,{status:'prepared',result:null,savedReplyRecoveryId:recovery.id,
          savedReplyHistory:[...(op.savedReplyHistory||[]),{recovery,result:clone(op.result)}]});
      }
      if(recovery&&!r.savedReplyRecoveries?.some(x=>x.id===recovery.id)){
        return persist(r,{stageIndex:r.stageIndex-1,candidate:clone(op.request.baselineBundle),
          stages:r.stages.slice(0,-1),pending:null,lastError:null,
          savedReplyRecoveries:[...(r.savedReplyRecoveries||[]),{...recovery,previousCandidate:clone(r.candidate),previousStage:clone(last)}]});
      }
    }
    if(r.phase==='wiki_fact_revision') {
      const childId=r.pending?.id;need(childId,'LEARNING_FACT_REVISION_PENDING_MISSING');
      let op=await store.load(childId+':handoff');
      need(op?.request?.factReview&&op.requestHash===hash(op.request),'LEARNING_FACT_REVISION_HANDOFF_INVALID');
      need(hash(r.candidate)===hash(op.supersededCandidate),'LEARNING_FACT_REVIEW_CANDIDATE_CHANGED');
      if(!op.result) {
        const result=await methods.advance(clone(op.request));
        if(result.status!=='complete') {
          need(['running','paused','needs_attention'].includes(result.status),'LEARNING_METHOD_STATUS_INVALID');
          return persist(r,{pending:{...r.pending,status:result.status,reason:result.reason||null},
            status:result.status==='running'?'running':'paused'});
        }
        composePostgameJointBundleV1({scope:scope(r),baselineBundle:r.roundBaseline,
          previousBundle:op.request.baselineBundle,stage:'wiki',result});
        op=await persist(op,{status:'complete',result});await hooks.afterMethodSaved?.(op);
      }
      const candidate=composePostgameJointBundleV1({scope:scope(r),baselineBundle:r.roundBaseline,
        previousBundle:op.request.baselineBundle,stage:'wiki',result:op.result});
      return persist(r,{candidate,phase:'methods',status:'paused',pending:null,
        wikiBySeat:{...r.wikiBySeat,[r.learnerSeat]:clone(candidate.wikiRef)},
        candidateFactReview:{reviewId:op.request.factReview.id,status:'candidate_fact_check_required'},
        factRevisions:[...(r.factRevisions||[]),{id:childId,reviewId:op.request.factReview.id,
          round:r.round,seat:r.learnerSeat,previousBundleHash:hash(op.supersededCandidate),
          bundleHash:hash(candidate),evidence:op.result.evidence}]});
    }
    if(r.phase==='methods') {
      const stage=POSTGAME_METHOD_STAGES_V1[r.route][r.stageIndex];
      if(!stage)return persist(r,{phase:r.definition.developmentCycles&&r.cycleIndex+1<r.definition.developmentCycles[r.learnerSeat].iterations?'development_experiment':'evaluation'});
      const childId=`${id}:round:${r.round}:${r.learnerSeat}:${stage}`+(r.definition.developmentCycles?`:cycle:${r.cycleIndex}`:'');
      const request={id:childId,stage,scope:scope(r),configuration:configuration(r,stage),
        baselineBundle:clone(r.candidate||r.roundBaseline),opponentBundle:clone(r.frozenOpponent),
        parentWikiId:r.wikiBySeat?.[r.learnerSeat]?.wikiId||null,
        opponentSelectionId:r.frozenOpponentSelectionId,...(r.sourcePartition?{sourceDomain:clone(r.definition.mapTaskDomain||null)}:{})};
      let op=await store.load(childId+':handoff');
      if(!op) {
        op={reviewId:childId+':handoff',revision:0,schemaVersion:'postgame_method_handoff_v1',
          request,requestHash:hash(request),status:'prepared',updatedAt:new Date().toISOString()};
        need((await store.commit(op.reviewId,null,op)).ok,'LEARNING_HANDOFF_CREATE_CONFLICT');
      }
      need(op.requestHash===hash(request),'LEARNING_HANDOFF_INPUT_CHANGED');
      if(!op.result) {
        // Child runtime owns in-flight requests, paid replies and Native receipts.
        // Re-enter its original identity; never allocate a replacement child.
        const result=await methods.advance(clone(request));
        if(result.status!=='complete') {
          need(['running','paused','needs_attention'].includes(result.status),'LEARNING_METHOD_STATUS_INVALID');
          return persist(r,{pending:{id:childId,stage,status:result.status,reason:result.reason||null},
            status:result.status==='running'?'running':'paused'});
        }
        composePostgameJointBundleV1({scope:scope(r),baselineBundle:r.roundBaseline,
          previousBundle:r.candidate||r.roundBaseline,stage,result});
        op=await persist(op,{status:'complete',result});
        await hooks.afterMethodSaved?.(op);
      }
      const candidate=composePostgameJointBundleV1({scope:scope(r),baselineBundle:r.roundBaseline,
        previousBundle:r.candidate||r.roundBaseline,stage,result:op.result});
      return persist(r,{candidate,pending:null,stageIndex:r.stageIndex+1,
        wikiBySeat:{...r.wikiBySeat,[r.learnerSeat]:clone(candidate.wikiRef||r.wikiBySeat?.[r.learnerSeat]||null)},
        stages:[...r.stages,{round:r.round,seat:r.learnerSeat,stage,id:childId,evidence:op.result.evidence,bundleHash:hash(candidate)}]});
    }
    if(r.phase==='development_experiment') {
      const cycle=r.definition.developmentCycles[r.learnerSeat];
      const childId=id+':round:'+r.round+':development:'+r.cycleIndex;
      let op=await store.load(childId+':handoff');
      if(!op){const request={id:childId,scope:scope(r),configuration:clone(cycle),
        baselineBundle:clone(r.cycleBaseline),candidateBundle:clone(r.candidate),opponentBundle:clone(r.frozenOpponent),
        controls:{...cycle.controls,learningScope:scope(r),...(r.sourcePartition?{sourceDomain:clone(r.definition.mapTaskDomain||null)}:{})}};
        op={reviewId:childId+':handoff',revision:0,schemaVersion:'postgame_development_handoff_v1',request,status:'prepared',updatedAt:new Date().toISOString()};
        need((await store.commit(op.reviewId,null,op)).ok,'LEARNING_DEVELOPMENT_HANDOFF_CONFLICT');
      }
      if(!op.result){const result=await developmentExperiments.advance(clone(op.request));
        if(result.status!=='complete')return persist(r,{pending:{id:childId,stage:'development',status:result.status}});
        normalizePostgameLearningContextV1({...r.definition.learningContext,developmentFeedback:result.feedback});
        op=await persist(op,{result,status:'complete'});await hooks.afterDevelopmentSaved?.(op);
      }
      const previous=r.feedbackBySeat[r.learnerSeat];
      const feedback=[...new Map([...previous,...op.result.feedback].map(f=>[f.executionRef,f])).values()];
      return persist(r,{phase:'methods',cycleIndex:r.cycleIndex+1,stageIndex:0,pending:null,cycleBaseline:clone(r.candidate),
        feedbackBySeat:{...r.feedbackBySeat,[r.learnerSeat]:feedback},
        developmentHistory:[...r.developmentHistory,{id:childId,round:r.round,seat:r.learnerSeat,cycle:r.cycleIndex,feedbackRefs:op.result.feedback.map(f=>f.executionRef)}]});
    }
    const matrixId=`${id}:round:${r.round}:evaluation`;
    if(r.phase==='evaluation') {
      need(r.candidate,'LEARNING_CANDIDATE_REQUIRED');
      const spec=clone(r.definition.evaluation[r.learnerSeat]);
      // The learned subject is known only after candidate creation. Host may
      // register its delivery/opportunity scope before any evaluation; cases,
      // seeds, metrics and opponents remain the frozen definition.
      const registered=await evaluationOpportunities?.read({studyId:id,round:r.round,seat:r.learnerSeat});
      if(registered){
        need(registered.candidateHash===hash(r.candidate),'LEARNING_EVALUATION_CANDIDATE_CHANGED');
        need(registered.studyId===id&&registered.round===r.round&&registered.seat===r.learnerSeat
          &&registered.opportunity,'LEARNING_EVALUATION_OPPORTUNITY_SCOPE');
        need(!spec.opportunity||hash(spec.opportunity)===hash(registered.opportunity),'LEARNING_EVALUATION_OPPORTUNITY_CONFLICT');
        spec.opportunity=clone(registered.opportunity);
      }
      delete spec.bundles;delete spec.id;delete spec.subjectSeat;
      spec.controls={...spec.controls,learningScope:scope(r),opponentSelectionRef:r.frozenOpponentSelectionId,...(r.sourcePartition?{sourceDomain:clone(r.definition.mapTaskDomain||null)}:{})};
      spec.discoveryGroups=[...new Set([...(spec.discoveryGroups||[]),...(r.sourcePartition?.discoveryGroups||[])])];
      await evaluationMatrix.create({...spec,id:matrixId,subjectSeat:r.learnerSeat,
        bundles:{baseline:r.roundBaseline,candidate:r.candidate,opponent:r.frozenOpponent}});
      const matrix=await evaluationMatrix.step(matrixId);
      if(matrix.status!=='complete')return persist(r,{pending:{id:matrixId,stage:'evaluation',status:matrix.status}});
      return persist(r,{phase:'selection',pending:null,evaluationId:matrix.evaluationId});
    }
    if(r.phase==='selection') {
      const selected=await selection.select({id:`${id}:round:${r.round}:selection`,scope:scope(r),
        evaluationId:r.evaluationId,baselineBundle:r.roundBaseline,candidateBundle:r.candidate});
      if(r.definition.learningContext?.discoveryMode==='autonomous_patterns_v1'&&r.candidate.wikiRef){
        await recordPostgameWikiImpactV1({store,wikiId:r.candidate.wikiRef.wikiId,scope:scope(r),selection:selected,
          baseline:r.roundBaseline,candidate:r.candidate,evaluation:await store.load(r.evaluationId)});
      }
      const currentBySeat={...r.currentBySeat,[r.learnerSeat]:clone(selected.bundle)};
      const selectionBySeat={...r.selectionBySeat,[r.learnerSeat]:selected.reviewId};
      const history=[...r.history,{round:r.round,seat:r.learnerSeat,selectionId:selected.reviewId,
        evaluationId:r.evaluationId,decision:selected.decision,bundleHash:hash(selected.bundle),
        opponentBundleHash:hash(r.frozenOpponent)}];
      const nextSeat=other(r.learnerSeat),done=r.round+1>=r.definition.learningRounds;
      return persist(r,{currentBySeat,selectionBySeat,history,round:r.round+1,learnerSeat:nextSeat,stageIndex:0,
        candidate:null,evaluationId:null,pending:null,phase:done?'complete':'methods',status:done?'complete':'running',
        ...(r.definition.developmentCycles?{cycleIndex:0,cycleBaseline:clone(currentBySeat[nextSeat])}:{}),
        roundBaseline:clone(currentBySeat[nextSeat]),frozenOpponent:clone(currentBySeat[other(nextSeat)]),
        frozenOpponentSelectionId:selectionBySeat[other(nextSeat)]});
    }
    need(false,'LEARNING_PHASE_INVALID');
  }
  async function advance(id) {
    if(active.has(id))return active.get(id);
    const job=withRunOwner(id,()=>step(id));active.set(id,job);try{return await job;}finally{active.delete(id);}
  }
  async function resumeOwned(id) {
    const r=await read(id);need(r.status==='paused','LEARNING_NOT_PAUSED');
    // This does not clear or authorize retries inside a child.
    return persist(r,{status:'running'});
  }
  async function recordError(id,error) {
    if(error.code==='LEARNING_RUN_ALREADY_ACTIVE')return read(id);
    const r=await read(id);
    const lastError={code:error.code||error.message,at:new Date().toISOString()};
    return persist(r,{lastError,errorHistory:[...(r.errorHistory||[]),lastError]});
  }
  async function rollbackOwned({id,round,reason}) {
    const r=await read(id);need(r.status==='complete','LEARNING_ROLLBACK_REQUIRES_BOUNDARY');
    const history=r.history.find(h=>h.round===round);need(history,'LEARNING_ROUND_NOT_FOUND');
    const rolled=await selection.rollback({id:`${id}:rollback:${r.revision}`,previousId:history.selectionId,
      scope:{experimentId:id,route:r.route,ownerSeat:history.seat},reason});
    return persist(r,{currentBySeat:{...r.currentBySeat,[history.seat]:clone(rolled.bundle)},
      selectionBySeat:{...r.selectionBySeat,[history.seat]:rolled.reviewId},
      history:[...r.history,{kind:'rollback',seat:history.seat,selectionId:rolled.reviewId,round,bundleHash:hash(rolled.bundle)}]});
  }
  async function selected({id,seat,route}) {
    const r=await read(id);need(route===r.route&&['player1','player2'].includes(seat),'LEARNING_SELECTION_SCOPE');
    need(r.status==='complete','LEARNING_SELECTION_NOT_READY');
    const selectionId=r.selectionBySeat[seat];
    if(publication&&selectionId){
      const scope={experimentId:id,route,ownerSeat:seat};
      const registered=await publication.registerLearningSelection({selectionId,scope});
      return publication.readLearningBundle({publicationId:registered.reviewId,scope,purpose:'isolated_next_match'});
    }
    return clone(r.currentBySeat[seat]);
  }
  function status(r) {return {id:r.reviewId,route:r.route,status:r.status,phase:r.phase,round:r.round,
    learningRounds:r.definition.learningRounds,learnerSeat:r.learnerSeat,stage:POSTGAME_METHOD_STAGES_V1[r.route][r.stageIndex]||null,
    ...(r.definition.developmentCycles?{cycleIndex:r.cycleIndex,developmentHistory:clone(r.developmentHistory)}:{}),
    pending:clone(r.pending),candidateFactReview:clone(r.candidateFactReview||null),factRevisions:clone(r.factRevisions||[]),lastError:clone(r.lastError||null),stages:clone(r.stages),history:clone(r.history),updatedAt:r.updatedAt};}
  const resume=id=>withRunOwner(id,()=>resumeOwned(id));
  const rollback=input=>withRunOwner(input.id,()=>rollbackOwned(input));
  const reviseWikiCandidate=input=>withRunOwner(input.id,()=>reviseWikiCandidateOwned(input));
  return Object.freeze({start,advance,resume,read,rollback,selected,status,recordError,reviseWikiCandidate});
}
