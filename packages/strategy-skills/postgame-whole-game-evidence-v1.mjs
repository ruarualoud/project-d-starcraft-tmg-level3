import {clone,hash,seal,verifySeal} from '../skill-production/common.mjs';
import {projectPostgameObservedDecisionV1} from './postgame-observed-decision-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v?.[k]!==undefined).map(k=>[k,clone(v[k])]));
// Host compiles Native facts and saved public explanations separately. A whole
// game is an observed sample, never a counterfactual or a strategy grade.
export function compilePostgameWholeGameEvidenceV1({id,source,segments,mission,rosters,factionBySeat,armyConfigurationsBySeat,knownEngineeringIssues=[],environmentFacts,toolEvidence=[]}) {
 need(id&&source?.ancestryGroup&&source.ref&&segments?.length,'WHOLE_GAME_SOURCE_REQUIRED');
 const timeline=[],planVersions={},rounds=new Map();let previous=null;
 for(const [si,s] of segments.entries()){
  need(s.receipts?.length&&s.actions,'WHOLE_GAME_SEGMENT_EMPTY');
  if(si){const f=s.continuation;
   need(f?.sourceStateHash===previous.postStateHash&&f.sourceStateRevision===previous.postStateRevision
    &&f.targetStateHash===s.receipts[0].preStateHash&&f.entireGameStateUnchanged===true
    &&f.targetReplayMatchesCurrent===true,'WHOLE_GAME_CONTINUATION_NOT_PROVEN');}
  const explanations=new Map(s.actions.map(a=>[a.receiptHash,a]));let prior=null;
  for(const r of s.receipts){
   need(r.journalHash&&r.preStateHash&&r.postStateHash&&r.action&&Array.isArray(r.events),'WHOLE_GAME_NATIVE_RECEIPT_REQUIRED');
   need(!prior||(prior.postStateHash===r.preStateHash&&prior.postStateRevision===r.preStateRevision),'WHOLE_GAME_NATIVE_GAP');
   const a=explanations.get(r.journalHash);
   need(!a||(a.postStateHash===r.postStateHash&&a.postStateRevision===r.postStateRevision),'WHOLE_GAME_EXPLANATION_BINDING');
   const handle=id+'/action-'+(timeline.length+1);let semantic=r.action;
   while(semantic.sourceAction&&typeof semantic.sourceAction==='object')semantic=semantic.sourceAction;
   const clock=r.preGameClock||{}, facts=projectPostgameObservedDecisionV1({actingSeat:semantic.sideKey,
    checkpoint:{stateHash:r.preStateHash},scenarioContext:{round:clock.round,phase:clock.phase,gameLengthRounds:mission?.gameLengthRounds??null},
    actualAction:{appliedAction:r.action},actualOutcome:{events:r.events,postStateHash:r.postStateHash}});
   let planRef=null;
   if(a?.plan){planRef=hash(a.plan);planVersions[planRef]=clone(a.plan);}
   const interpretation=a?{authority:'historical_model_explanation_not_native_fact',planRef,
    publicDecisionSummary:clone(a.publicDecisionSummary||null),
    intent:pick(a.intent,['currentGoal','purpose','decisionSummary','planContinuity','expectedOwnOutcome','expectedEffects','predictedOpponentResponses','tradeoffs','nextDecisionFocus','unitIds','skillsUsed']),
    assessment:pick(a.assessment,['verdict','health','continuitySummary','currentGoal']),planRevision:clone(a.planRevision||null)}:null;
   const spatial=semantic.spatialPlan||{};
   const entry={handle,source:{decisionId:handle,ref:source.ref,ancestryGroup:source.ancestryGroup,segment:si,
    journalHash:r.journalHash,preStateRevision:r.preStateRevision,postStateRevision:r.postStateRevision,preStateHash:r.preStateHash,postStateHash:r.postStateHash},
    observedFacts:facts,geometry:pick(spatial,['canonicalPath','finalModelPositions','entrySegmentId']),interpretation,
    ...(environmentFacts?{executedAction:clone(semantic),publicDecisionTrace:a?{
     queryReceipts:clone(a.decisionMaterialEvidence?.queryReceipts||a.intent?.queryReceipts||[]),
     candidateComparisons:clone(a.plannerResult?.candidateComparisons||[]),
     informationNeeds:clone(a.plannerResult?.informationNeeds||[]),
     selectedReason:clone(a.selectedReason||null),risk:clone(a.risk||null),
     rejectedAlternatives:clone(a.intent?.rejectedAlternatives||[]),
     queryResultAvailability:toolEvidence.length?'selected_recorded_queries_available_as_separate_research_pages':'receipt_references_only_not_full_query_outputs',
     authority:'saved_public_model_decision_not_native_fact',hiddenChainOfThoughtIncluded:false,
    }:null}:{}),originalOutcomeWasAvailableAtDecisionTime:false};
   timeline.push(entry);const round=clock.round;
   if(!rounds.has(round))rounds.set(round,{round,actionHandles:[],bySeat:{player1:[],player2:[]}});
   const ri=rounds.get(round);ri.actionHandles.push(handle);if(ri.bySeat[semantic.sideKey])ri.bySeat[semantic.sideKey].push(handle);
   previous=prior=r;
  }
 }
 need(new Set(timeline.map(t=>t.source.journalHash)).size===timeline.length,'WHOLE_GAME_DUPLICATE_RECEIPT');
 need(timeline[0].source.preStateRevision===0,'WHOLE_GAME_INITIAL_PREFIX_MISSING');
 need(segments.at(-1).terminal?.terminal===true&&segments.at(-1).terminal.replayMatchesCurrent===true
  &&segments.at(-1).terminal.finalStateHash===previous.postStateHash&&segments.at(-1).terminal.journalTailHash===previous.journalHash,'WHOLE_GAME_TERMINAL_REQUIRED');
 return seal({schemaVersion:'postgame_whole_game_evidence_v1',id,source:clone(source),purpose:'development_discovery',heldoutEvidence:false,
  lineageSources:segments.map(s=>({ref:source.ref,ancestryGroup:source.ancestryGroup,directory:s.directory,stateHash:s.receipts[0].preStateHash})),
  factionBySeat:clone(factionBySeat||{}),armyConfigurationsBySeat:clone(armyConfigurationsBySeat||{}),mission:clone(mission),rosters:clone(rosters),rounds:[...rounds.values()],timeline,planVersions,
  ...(environmentFacts?{environmentFacts:clone(environmentFacts),toolEvidence:clone(toolEvidence)}:{}),
  continuity:segments.map((s,i)=>({segment:i,actionCount:s.receipts.length,continuation:clone(s.continuation||null)})),
  terminal:clone(segments.at(-1).terminal),knownEngineeringIssues:clone(knownEngineeringIssues),
  evidenceScope:'observed_whole_game_not_counterfactual',strategySuperiorityProven:false,trainingTruth:false});
}
export function assertPostgameWholeGameEvidenceV1(value){
 verifySeal(value);need(value.schemaVersion==='postgame_whole_game_evidence_v1'&&value.purpose==='development_discovery'&&value.heldoutEvidence===false
  &&value.source?.ancestryGroup&&value.timeline?.length&&value.terminal?.terminal===true,'WHOLE_GAME_EVIDENCE_INVALID');return value;
}
export function postgameWholeGameSourcePagesV1(games=[]){return games.flatMap(g=>{
 assertPostgameWholeGameEvidenceV1(g);return g.timeline.map(t=>({...clone(t),
  source:{...clone(t.source),wholeGameId:g.id,wholeGameHash:g.hash},context:{...clone(t.observedFacts.context),mission:clone(g.mission),factionBySeat:clone(g.factionBySeat||{})},
  evidenceLimitations:clone(g.knownEngineeringIssues),authority:'saved_whole_game_native_observation_not_strategy_proof'}));});}
export const POSTGAME_WHOLE_GAME_REFLECTION_V1={
 purpose:'Discover conditional improvements or justified retention from the complete observed game. No prescribed tactical answer.',
 procedure:['Read both seats, mission deadline, initial rosters, changing plans and outcomes across rounds.',
 'Choose an observed decision or sequence; cite its handles. State its recorded goal and expected outcome, then compare with actual Native results.',
 'Separate an unavailable/incorrect engineering option from a strategic choice. An affected trace is diagnostic, not proof that a legal alternative is better.',
 'Form a conditional comparison: objective, conditions, earlier actionable decision, alternative or retention, expected benefit and cost, and what observation would refute it.',
 'Use only registered experiments and legal tools. Observe the result before revising the hypothesis. A single trajectory is not an expected value.',
 'Keep unsupported causal claims unresolved; edit a skill or memory only within the evidence scope. Independent evaluation decides promotion.'],
 forbiddenInferences:['No attacks does not itself prove bad play.','Survival does not itself prove good play.','A claimed future benefit after the mission deadline is not an available future round.'],
 trainingTruth:false};
// Compact all actions, not a hand-picked favourable window. Detailed Native
// events remain citation pages. Repeated plan versions are stored once.
export function projectWholeGameLearningOverviewV1(g){assertPostgameWholeGameEvidenceV1(g);return {
 schemaVersion:g.schemaVersion,id:g.id,hash:g.hash,source:g.source,mission:g.mission,rosters:g.rosters,
 factionBySeat:g.factionBySeat,armyConfigurationsBySeat:g.armyConfigurationsBySeat,terminal:g.terminal,knownEngineeringIssues:g.knownEngineeringIssues,planVersions:g.planVersions,
 ...(g.environmentFacts?{environmentFacts:g.environmentFacts}:{}),
 rounds:g.rounds,actionCount:g.timeline.length,
 timeline:g.timeline.map(t=>({handle:t.handle,round:t.observedFacts.context.round,phase:t.observedFacts.context.phase,
  decision:t.observedFacts.decision,events:t.observedFacts.events.map(e=>e.type==='mission_victory_points_scored'?clone(e):Object.fromEntries(Object.entries(e).filter(([k,v])=>!/(?:Hash|trainingTruth|rulesTruth)$/.test(k)&&(v===null||['string','number','boolean'].includes(typeof v))))),
  interpretation:t.interpretation?{authority:t.interpretation.authority,planRef:t.interpretation.planRef,
   intent:pick(t.interpretation.intent,['currentGoal','expectedOwnOutcome']),
   planRevision:t.interpretation.planRevision?pick(t.interpretation.planRevision,['reason','changeSummary','revisionReason']):null}:null})),
 outcomeAvailability:'retrospective_only_not_original_agent_knowledge'};}
