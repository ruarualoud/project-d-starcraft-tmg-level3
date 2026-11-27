import {normalizePostgameLearningContextV1,projectPostgameLearningModelContextV1} from './postgame-development-feedback-v1.mjs';
import {projectPostgameExecutionEvidenceV1} from './postgame-observed-decision-v1.mjs';
import { clone, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { compilePostgameEvaluationBundleV1 } from './postgame-evaluation-bundle-v1.mjs';
import { classifyPostgameSourceV1 } from './postgame-paired-product-runtime-v1.mjs';
const need=(v,code)=>{if(!v)throw Error(code)};
const metrics=['score','supply','livingModels','livingUnits'];
export function skillOptStrategyDocumentV1(skill,mode='procedure_v1') {
  verifySeal(skill);
  need(['procedure_v1','full_strategy_v2'].includes(mode),'SKILLOPT_DOCUMENT_MODE_INVALID');
  if(mode==='full_strategy_v2')return [
    '# Strategy document',
    'Advisory strategy only. The external Rules and selected roster remain authoritative. Edit this complete document; the Host preserves immutable identity and rule bindings.',
    '## Existing conditional knowledge',...(skill.knowledge||[]).map(entry=>JSON.stringify(entry,null,2)),
    '## Existing procedures',JSON.stringify(skill.procedure||[],null,2),
    '## Existing learned advisories',JSON.stringify(skill.skillOptAdvisories||[],null,2),
  ].join('\n\n');
  return JSON.stringify(skill.procedure || [],null,2);
}
// Original optimizer edits a text document. Only the already-supported procedure
// body is materialized; source facts, legality, identities and dependencies stay Host-owned.
export function compileSkillOptProductBundleV1({baselineBundle,scope,targetSkillId,skillContent,sourceEpisodeRefs=[],strategyDocumentMode='procedure_v1'}) {
  const target=baselineBundle.entries.find(e=>e.skill.skillId===targetSkillId)?.skill;
  need(target && typeof skillContent==='string' && skillContent.trim(),'SKILLOPT_STRATEGY_TARGET_REQUIRED');
  if(skillContent===skillOptStrategyDocumentV1(target,strategyDocumentMode))return clone(baselineBundle);
  const {hash:_hash,...body}=clone(target);
  const changed=seal({...body,...(strategyDocumentMode==='full_strategy_v2'?{knowledge:[],skillOptAdvisories:[],strategyDocumentMode}:{}),version:target.version+'+skillopt.'+hash(strategyDocumentMode==='procedure_v1'?skillContent:{skillContent,strategyDocumentMode}).slice(0,12),
    parentSkillHash:target.hash,procedure:[{axis:'skillopt_policy',title:'SkillOpt strategy document',
      when:clone(target.preconditions||[]),objective:'Apply the isolated learned strategy under the authoritative Rules.',
      steps:[skillContent],alternatives:[],risk:'Unvalidated research candidate.',reviseIf:[],requiredQueries:[]}],
    status:'quarantined_candidate',runtimeAccepted:false,published:false,canAffectRules:false,
    fullGameStrategyEffectivenessProven:false,trainingTruth:false});
  const asset={reviewId:'skillopt-asset:'+hash({scope,targetSkillId,skillContent}),scope:clone(scope),status:'quarantined_candidate',
    baselineSkillRefs:baselineBundle.entries.map(({skill})=>({id:skill.skillId,version:skill.version,hash:skill.hash})),
    materializedSkills:[changed],createdSkills:[],memoryCandidates:[],sourceEpisodeRefs:clone(sourceEpisodeRefs),wikiRef:null};
  asset.contentHash=hash(asset);
  return compilePostgameEvaluationBundleV1({asset,baselineBundle});
}

export function scoreSkillOptNativeResultV1(result,definition) {
  need(result?.status==='completed' && result.replayMatchesCurrent===true && result.sourceUnchanged===true
    && result.windowComplete===true && result.sourceEligibility?.maySupportStrategyEvaluation===true,
  'SKILLOPT_NATIVE_EVIDENCE_INCOMPLETE');
  const metric=definition.metric;
  if(metric.kind==='terminal_win') {
    need(definition.horizon.kind==='match_end','SKILLOPT_WIN_REQUIRES_NATIVE_TERMINAL');
    const winner=result.terminalOutcome?.winner;
    need(['player1','player2','draw'].includes(winner) && ['player1','player2'].includes(result.subjectSeat),'SKILLOPT_NATIVE_WINNER_MISSING');
    return {hard:winner===result.subjectSeat?1:0,soft:winner==='draw'?0.5:winner===result.subjectSeat?1:0};
  }
  need(metric.kind==='window_target' && metrics.includes(metric.field) && Number.isFinite(metric.threshold)
    && Number.isFinite(metric.softLower) && Number.isFinite(metric.softUpper) && metric.softUpper>metric.softLower,
  'SKILLOPT_PREDECLARED_METRIC_REQUIRED');
  const value=result.metrics[metric.field]-(metric.relativeToInitial?result.beforeMetrics[metric.field]:0);
  need(Number.isFinite(value),'SKILLOPT_NATIVE_METRIC_MISSING');
  const sign=metric.direction==='decrease'?-1:metric.direction==='increase'?1:0;
  need(sign,'SKILLOPT_METRIC_DIRECTION_REQUIRED');
  const soft=Math.max(0,Math.min(1,(value-metric.softLower)/(metric.softUpper-metric.softLower)));
  return {hard:sign*(value-metric.threshold)>=0?1:0,soft:sign===1?soft:1-soft};
}

// The pinned original analyst reads conversation.json, not arbitrary result fields.
// Keep deterministic facts inside that consumed channel; reasoning stays labelled.
export function projectSkillOptFeedbackConversationV1({record,definition,measured,learningContext}) {
  const native=record.result, evidence=projectPostgameExecutionEvidenceV1(record);
  const observed=record.observedActions||[];
  const delta=(before,after)=>before&&after?Object.fromEntries(metrics.map(k=>[k,after[k]-before[k]])):null;
  const verification={schemaVersion:'skillopt_native_feedback_v1',
    authority:'host_declared_goal_and_saved_native_results',availability:'post_execution_only',
    source:{executionRef:record.reviewId,sourceRef:record.input.source.ref,stateHash:native.sourceStateHash,
      subjectSeat:record.input.subjectSeat,opponentSeat:record.input.subjectSeat==='player1'?'player2':'player1'},
    taskDescription:definition.taskDescription,metricDefinition:clone(definition.metric),horizon:clone(definition.horizon),
    beforeMetrics:clone(native.beforeMetrics),metrics:clone(native.metrics),
    beforeOpponentMetrics:clone(native.beforeOpponentMetrics||null),opponentMetrics:clone(native.opponentMetrics||null),
    ownChange:delta(native.beforeMetrics,native.metrics),opponentChange:delta(native.beforeOpponentMetrics,native.opponentMetrics),
    opponentInitialAvailability:native.beforeOpponentMetrics?'recorded':'not_recorded_in_legacy_result',
    measuredTarget:clone(measured),actualActions:native.actualActions,windowComplete:native.windowComplete,
    terminalOutcome:clone(native.terminalOutcome||null),observationStatus:evidence.observationStatus,
    decisionExposures:clone(native.decisionExposures||[]),
    interpretation:'Observed finite execution, not expected value or proof of general strategy. Missing legacy facts are unavailable, not zero.'};
  const context=normalizePostgameLearningContextV1(learningContext);
  if(context)verification.learningContext=projectPostgameLearningModelContextV1(context,{role:'skillopt'});
  const conversation=[{role:'system',content:JSON.stringify(verification)}];
  // Forced Native transitions without a model explanation must not disappear.
  for(const t of evidence.transitions)conversation.push({type:'tool_call',
    cmd:{source:clone(t.source),action:clone(t.observedFacts.decision)},
    obs:{observedFacts:clone(t.observedFacts),interpretation:clone(t.interpretation),
      authority:'saved_native_observation',metricScope:definition.metric.kind}});
  if(!evidence.transitions.length)for(const t of observed)conversation.push({role:'assistant',
    content:JSON.stringify({authority:'historical_model_explanation_not_native_fact',publicTrace:t,
      observationStatus:evidence.observationStatus})});
  return conversation;
}

// caseRegistry is an immutable Host binding, never a model response. The executor
// is the same persisted Room/HostedOpponent/Native factory used by live products.
export function createSkillOptProductRolloutPortV1({store,executor,caseRegistry,baselineBundle,opponentBundle,scope,targetSkillId,controls,sourceEpisodeRefs=[],learningContext=null,strategyDocumentMode='procedure_v1'}) {
  const execute = async function rollout(request) {
    const bundle=compileSkillOptProductBundleV1({baselineBundle,scope,targetSkillId,skillContent:request.skillContent,sourceEpisodeRefs,strategyDocumentMode});
    const binding={caseRegistry,baselineBundleHash:hash(baselineBundle),opponentBundleHash:hash(opponentBundle),scope,targetSkillId,controls,...(strategyDocumentMode!=='procedure_v1'?{strategyDocumentMode}:{}),...(learningContext?{learningContext}:{})};
    const bindingId='skillopt-bindings:'+request.manifest.id;
    const prior=await store.load(bindingId);
    if(prior)need(prior.bindingHash===hash(binding),'SKILLOPT_PRODUCT_BINDINGS_CHANGED');
    else {const saved=await store.commit(bindingId,null,{reviewId:bindingId,revision:0,schemaVersion:'postgame_skillopt_product_bindings_v1',updatedAt:new Date().toISOString(),bindingHash:hash(binding),binding});need(saved.ok,saved.reason)}
    const results=[];
    for(const c of request.cases) {
      const registered=request.manifest.cases.find(x=>x.id===c.id);
      const definition=caseRegistry[c.id];
      need(registered && definition && c.split===registered.split && definition.split===c.split
        && registered.ancestorGroup===definition.source.ancestryGroup && registered.sourceRef===definition.source.ref,
      'SKILLOPT_PRODUCT_CASE_BINDING_INVALID');
      need(classifyPostgameSourceV1(definition.source).maySupportStrategyEvaluation,'SKILLOPT_SOURCE_NOT_AUDITED');
      const input={executionKey:'skillopt-product:'+hash({run:request.manifest.inputHash,caseId:c.id,seed:c.seed,
        strategy:hash(bundle),purpose:request.purpose,bindingHash:hash(binding)}),armName:'candidate',
        source:clone(definition.source),subjectSeat:scope.ownerSeat,strategyBundle:bundle,
        opponentBundle:clone(opponentBundle),controls:{...clone(controls),randomSeed:hash({seed:c.seed,caseId:c.id})},
        horizon:clone(definition.horizon)};
      let native=await executor.readExecution({executionKey:input.executionKey});
      if(native.status!=='completed')native=await executor.run(input);
      const measured=scoreSkillOptNativeResultV1(native,definition);
      const saved=await store.load(input.executionKey);
      need(saved,'SKILLOPT_NATIVE_EXECUTION_RECORD_MISSING');
      need(native.actualActions===0||(saved.nativeTransitions||[]).length>0||(saved.observedActions||[]).length>0,'SKILLOPT_NATIVE_PUBLIC_TRAJECTORY_MISSING');
      const conversation=projectSkillOptFeedbackConversationV1({record:saved,definition,measured,learningContext});
      results.push({id:c.id,...measured,n_turns:native.actualActions,task_type:registered.task_type,
        task_description:definition.taskDescription,fail_reason:measured.hard===1?'':'Predeclared measured target not met.',
        conversation,executionKey:input.executionKey,trajectoryRef:clone(native.trajectoryRef),
        metricDefinition:clone(definition.metric),metrics:clone(native.metrics),horizon:clone(definition.horizon),
        interpretation:native.interpretation,trainingTruth:false});
    }
    return {results};
  };
  // The Native executor already resumes the original execution identity.
  // This may continue unfinished actions, but cannot replay a committed one.
  execute.recover = async request => ({status:'completed',result:await execute(request)});
  return execute;
}
