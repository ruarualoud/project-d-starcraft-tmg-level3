import {assertPostgameWholeGameEvidenceV1,projectWholeGameLearningOverviewV1,POSTGAME_WHOLE_GAME_REFLECTION_V1} from './postgame-whole-game-evidence-v1.mjs';
import {clone,hash,seal,verifySeal} from '../skill-production/common.mjs';
import {projectPostgameExecutionEvidenceV1} from './postgame-observed-decision-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};

// Host-owned development evidence. Neither model prose nor evaluator summaries
// can be substituted for an executed Native journal.
export function compilePostgameDevelopmentFeedbackV1(record) {
 const r=record?.result;
 need(record?.status==='completed'&&r?.windowComplete===true&&r.replayMatchesCurrent===true&&r.sourceUnchanged===true,
  'LEARNING_DEVELOPMENT_EXECUTION_INCOMPLETE');
 need(record.input?.source?.ancestryGroup&&record.input.source.ref&&r.sourceEligibility?.maySupportStrategyEvaluation===true,
  'LEARNING_DEVELOPMENT_SOURCE_REQUIRED');
 need(Array.isArray(record.nativeTransitions)&&record.nativeTransitions.length===r.actualActions&&r.actualActions>0,
  'LEARNING_DEVELOPMENT_NATIVE_JOURNAL_REQUIRED');
 const evidence=projectPostgameExecutionEvidenceV1(record);
 return seal({schemaVersion:'postgame_development_feedback_v1',executionRef:record.reviewId,
  source:clone(record.input.source),subjectSeat:record.input.subjectSeat,
  strategyBundleHash:hash(record.input.strategyBundle),opponentBundleHash:hash(record.input.opponentBundle),
  horizon:clone(record.input.horizon),randomSeed:record.input.controls.randomSeed,
  evidence,actualActions:r.actualActions,beforeOpponentMetrics:clone(r.beforeOpponentMetrics||null),
  terminalOutcome:clone(r.terminalOutcome||null),purpose:'development_feedback',
  heldoutEvidence:false,trainingTruth:false,interpretation:'Executed finite sample; not an expected value, general counter relation or proof of superiority.'});
}
export function normalizePostgameLearningContextV1(value) {
 if(value==null)return null;
 const autonomous=value.discoveryMode==='autonomous_patterns_v1';
 need(value.discoveryMode==null||autonomous,'LEARNING_DISCOVERY_MODE_INVALID');
 need(value.schemaVersion==='postgame_learning_context_v1'&&(autonomous||Array.isArray(value.objectives)&&value.objectives.length>0),
  'LEARNING_CONTEXT_REQUIRED');
 const objectives=autonomous?[]:value.objectives;
 need(new Set(objectives.map(g=>g.id)).size===objectives.length&&objectives.every(g=>
  typeof g.id==='string'&&g.id&&typeof g.question==='string'&&g.question&&typeof g.successEvidence==='string'&&g.successEvidence),
  'LEARNING_OBJECTIVE_INVALID');
 const developmentFeedback=clone(value.developmentFeedback||[]);
 for(const f of developmentFeedback){verifySeal(f);need(f.schemaVersion==='postgame_development_feedback_v1'&&f.purpose==='development_feedback'&&f.heldoutEvidence===false,
  'LEARNING_FEEDBACK_NOT_DEVELOPMENT');}
 need(new Set(developmentFeedback.map(f=>f.executionRef)).size===developmentFeedback.length,'LEARNING_FEEDBACK_DUPLICATE');
 const wholeGames=clone(value.wholeGames||[]);for(const g of wholeGames)assertPostgameWholeGameEvidenceV1(g);
 need(new Set(wholeGames.map(g=>g.id)).size===wholeGames.length,'LEARNING_WHOLE_GAME_DUPLICATE');
 return {schemaVersion:'postgame_learning_context_v1',objectives:clone(objectives),developmentFeedback,
  ...(autonomous?{discoveryMode:value.discoveryMode}:{}),
  ...(wholeGames.length?{wholeGames,wholeGameReflection:clone(POSTGAME_WHOLE_GAME_REFLECTION_V1)}:{}),
  instruction:autonomous?'Independently identify useful behavioural patterns from the available tasks and outcomes. Select the questions and comparisons yourself; no required topic, tactic or improvement quota. Separate measured facts from causal hypotheses; retain when evidence does not warrant a change. Historical feedback can revise a hypothesis, not make it a rule. Final held-out contents are unavailable.':'For each objective, distinguish observed conditions and outcomes, a proposed comparison, and unsupported hypotheses. Explain benefit versus cost. A finite sample need not select a winner. Do not invent unit matchups, routes or expected values. New development feedback may revise earlier conclusions; final held-out contents are unavailable.'};
}
export function postgameDevelopmentSourcePagesV1(context) {
 const c=normalizePostgameLearningContextV1(context);if(!c)return [];
 return c.developmentFeedback.flatMap((f,i)=>f.evidence.transitions.map((t,j)=>({
  handle:'experiment-'+(i+1)+'/action-'+(j+1),
  source:{developmentFeedbackId:f.executionRef,developmentFeedbackHash:f.hash,decisionId:f.executionRef+':native:'+j,...clone(t.source)},
  context:{...clone(t.observedFacts.context),subjectSeat:f.subjectSeat,sourceRef:f.source.ref,ancestryGroup:f.source.ancestryGroup,horizon:f.horizon},
  observedFacts:clone(t.observedFacts),interpretation:clone(t.interpretation),
  windowOutcome:{beforeMetrics:f.evidence.beforeMetrics,metrics:f.evidence.metrics,beforeOpponentMetrics:f.beforeOpponentMetrics,opponentMetrics:f.evidence.opponentMetrics,terminalOutcome:f.terminalOutcome},
  originalOutcomeWasAvailableAtDecisionTime:false,authority:'saved_development_native_observation_not_general_strategy_proof'})));
}

export function createPostgameDevelopmentCyclePortV1({store,executor}) {
 return {async advance({id,scope,configuration,baselineBundle,candidateBundle,opponentBundle,controls}) {
  const completed=[];
  for(const c of configuration.cases)for(const armName of ['baseline','candidate']) {
   const executionKey=id+':'+hash({caseId:c.id,armName});
   const input={executionKey,armName,source:clone(c.source),subjectSeat:scope.ownerSeat,
    strategyBundle:armName==='baseline'?baselineBundle:candidateBundle,opponentBundle,
    controls:{...controls,randomSeed:hash({seed:configuration.seed,caseId:c.id})},horizon:clone(c.horizon||configuration.horizon)};
   await executor.run(input);
   const record=await store.load(executionKey);
   need(record?.identity===hash(input),'LEARNING_DEVELOPMENT_EXECUTION_BINDING');
   completed.push(compilePostgameDevelopmentFeedbackV1(record));
  }
  return {status:'complete',feedback:completed};
 }};
}

export function projectPostgameLearningModelContextV1(value,{includeWholeGameTimeline=true,role=null,indexOnly=false}={}){
 const c=normalizePostgameLearningContextV1(value);if(!c)return null;
 const boundary=role==='wiki'?{role,canRunExperiments:false,task:'Consolidate observed action sequences and their outcomes; diagnose possible causes and consult existing patterns. The proposer reads evidence and proposes one change; evaluation is performed by the outer host.'}
  :role==='skillopt'?{role,canRunExperiments:false,task:'Reflect on the original Trainer rollouts and their measured feedback. Propose document edits; the original Trainer owns aggregation, execution and validation.'}
  :role==='vista'?{role,canRunExperiments:true,task:'Choose development evidence and programme interventions; inspect their actual outcomes before revising. The host freezes evaluation and game rules.'}:null;
 return {...c,...(boundary?{methodBoundary:boundary,wholeGameReflection:{purpose:c.instruction,procedure:[boundary.task],trainingTruth:false}}:{}),...(c.wholeGames?.length?{wholeGames:c.wholeGames.map(g=>{const v=projectWholeGameLearningOverviewV1(g);if(!includeWholeGameTimeline)delete v.timeline;if(indexOnly){delete v.environmentFacts;delete v.planVersions;v.availableEvidence={environment:'environment:'+g.id,trajectories:g.rounds.map(r=>'trajectory:'+g.id+':round:'+r.round),plans:Object.keys(g.planVersions||{}).map(id=>'plan:'+g.id+':'+id)};}return v;})}:{})};
}
