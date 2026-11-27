import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {bindPostgameOpportunityV1,assessPostgameStrategyCoverageV1} from './postgame-strategy-coverage-v1.mjs';
const copy=v=>structuredClone(v);
const need=(v,c)=>{if(!v)throw Error(c);};
const seats=['player1','player2'];
const metricNames=['score','supply','livingModels','livingUnits'];
export function assertPostgameCriterionV1(criterion){
  need(metricNames.includes(criterion?.primary)&&['increase','decrease'].includes(criterion.direction)
    &&Number.isFinite(criterion.minDelta)&&criterion.minDelta>=0
    &&(criterion.perspective===undefined||['subject','opponent'].includes(criterion.perspective))
    &&(criterion.guards||[]).every(g=>metricNames.includes(g.metric)&&Number.isFinite(g.maxLoss)&&g.maxLoss>=0),
  'POSTGAME_CRITERION_INVALID');
}
export function postgameMetricDeltasV1(baseline,candidate){
  need(metricNames.every(k=>Number.isFinite(baseline?.[k])&&Number.isFinite(candidate?.[k])),
    'POSTGAME_OPPONENT_METRICS_REQUIRED');
  return Object.fromEntries(metricNames.map(k=>[k,candidate[k]-baseline[k]]));
}

// Audit records are Host facts, not model judgements about strategy. Causal
// successors remain affected even when the particular invalid action is omitted.
export function classifyPostgameSourceV1(source) {
  const relevant=(source.engineeringFindings||[]).filter(f=>f.confirmed===true
    &&f.firstAffectedRevision<=source.stateRevision);
  return {status:relevant.length?'invalid_engineering':source.auditComplete===true?'audited':'unreviewed',
    findings:copy(relevant),maySupportStrategyEvaluation:!relevant.length&&source.auditComplete===true};
}
export function measurePostgameStateV1(state,seat) {
  need(seats.includes(seat),'POSTGAME_SEAT_INVALID');
  const living=(state.pieces||[]).filter(p=>p.sideKey===seat&&!p.isDestroyed&&!p.isRemoved
    &&p.isOnField===true&&!p.isInReserves&&p.models?.some(m=>!m.isDestroyed&&!m.isRemoved));
  need(Number.isFinite(state.scores?.[seat]),'POSTGAME_NATIVE_SCORE_MISSING');
  need(living.every(p=>Number.isFinite(p.currentSupply)),'POSTGAME_NATIVE_SUPPLY_MISSING');
  return {score:state.scores[seat],
    supply:living.reduce((sum,p)=>sum+Number(p.currentSupply||0),0),
    livingModels:living.reduce((sum,p)=>sum+p.models.filter(m=>!m.isDestroyed&&!m.isRemoved).length,0),
    livingUnits:living.length};
}

// Product step/run, checkpoint storage and actual Provider remain downstream.
// This module owns scheduling, same-condition pairing and evaluator isolation.
export function createPostgamePairedProductRuntimeV1({store,executor}) {
  async function save(r,change){const next={...r,...copy(change),revision:r.revision+1,updatedAt:new Date().toISOString()};
    const c=await store.commit(r.reviewId,r.revision,next);need(c.ok,c.reason);return next;}
  async function read(id){const r=await store.load(id);need(r?.schemaVersion==='postgame_paired_product_v1','POSTGAME_PAIR_NOT_FOUND');return r;}
  async function create({id,source,subjectSeat,bundles,controls,horizon,criterion,purpose,split='development',discoveryGroups=[],opportunity}) {
    need(source?.ref&&source.ancestryGroup&&Number.isSafeInteger(source.stateRevision),'POSTGAME_SOURCE_REQUIRED');
    need(seats.includes(subjectSeat)&&bundles?.baseline&&bundles?.candidate&&bundles?.opponent,'POSTGAME_FROZEN_BUNDLES_REQUIRED');
    need(controls?.rulesVersion&&controls?.modelProfile&&controls?.promptVersion,'POSTGAME_CONTROLS_REQUIRED');
    need(Number.isSafeInteger(horizon?.maxActions)&&horizon.maxActions>0&&['action_window','round_end','match_end'].includes(horizon.kind),'POSTGAME_HORIZON_REQUIRED');
    assertPostgameCriterionV1(criterion);
    need(typeof purpose==='string'&&purpose.trim(),'POSTGAME_PURPOSE_REQUIRED');
    need(['development','held_out'].includes(split),'POSTGAME_SPLIT_INVALID');
    if(split==='held_out')need(discoveryGroups.length>0&&!discoveryGroups.includes(source.ancestryGroup),'POSTGAME_HOLDOUT_ANCESTRY_LEAK');
    opportunity=bindPostgameOpportunityV1(opportunity,bundles);
    const body={...(opportunity?{opportunity:copy(opportunity)}:{}),source:copy(source),subjectSeat,bundles:copy(bundles),controls:copy(controls),horizon:copy(horizon),criterion:copy(criterion),purpose,split,discoveryGroups:copy(discoveryGroups)};
    const prior=await store.load(id);if(prior){need(prior.inputHash===hash(body),'POSTGAME_PAIR_INPUT_CHANGED');return prior;}
    const record={...body,schemaVersion:'postgame_paired_product_v1',reviewId:id,revision:0,inputHash:hash(body),
      sourceEligibility:classifyPostgameSourceV1(source),status:'ready',arms:{},candidateFrozenHash:hash(bundles.candidate),
      automaticPromotion:false,trainingTruth:false,updatedAt:new Date().toISOString()};
    const c=await store.commit(id,null,record);need(c.ok,c.reason);return copy(record);
  }
  function armInput(r,name){return {executionKey:r.reviewId+':'+name,armName:name,source:copy(r.source),subjectSeat:r.subjectSeat,
    strategyBundle:copy(r.bundles[name]),opponentBundle:copy(r.bundles.opponent),controls:copy(r.controls),horizon:copy(r.horizon),
    // Deliberately no other arm, reviewer feedback or hidden evaluation fields.
    trainingTruth:false};}
  function checkResult(result,r,name){need(result?.status==='completed'&&result.replayMatchesCurrent===true
      &&result.executionKey===r.reviewId+':'+name&&result.sourceStateHash===r.source.stateHash&&result.initialGameStateHash
      &&result.initialRandomStateHash&&result.initialContextHash
    &&result.sourceUnchanged===true&&result.strategyBundleHash===hash(r.bundles[name])
    &&result.opponentBundleHash===hash(r.bundles.opponent)&&result.controlsHash===hash(r.controls)
    &&result.metrics&&metricNames.every(k=>Number.isFinite(result.metrics[k])),'POSTGAME_ARM_RESULT_INVALID');
    if(r.criterion.perspective==='opponent')need(metricNames.every(k=>Number.isFinite(result.opponentMetrics?.[k])),
      'POSTGAME_OPPONENT_METRICS_REQUIRED');}
  function compare(r){const a=r.arms.baseline.result,b=r.arms.candidate.result;
    need(a.sourceStateHash===b.sourceStateHash&&a.initialGameStateHash===b.initialGameStateHash
      &&a.initialRandomStateHash===b.initialRandomStateHash&&a.initialContextHash===b.initialContextHash,
      'POSTGAME_PAIR_BASELINE_MISMATCH');
    const deltas=Object.fromEntries(metricNames.map(k=>[k,b.metrics[k]-a.metrics[k]]));
    const opponentDeltas=r.criterion.perspective==='opponent'
      ?postgameMetricDeltasV1(a.opponentMetrics,b.opponentMetrics):null;
    const objectiveDeltas=opponentDeltas||deltas;
    const gain=objectiveDeltas[r.criterion.primary]*(r.criterion.direction==='increase'?1:-1);
    const guards=(r.criterion.guards||[]).map(g=>({...g,delta:deltas[g.metric],passed:deltas[g.metric]>=-g.maxLoss}));
    const sufficient=a.windowComplete===true&&b.windowComplete===true;
    const strategyCoverage=assessPostgameStrategyCoverageV1(r.opportunity,a,b);
    const verdict=!r.sourceEligibility.maySupportStrategyEvaluation?'invalid_engineering_or_unreviewed'
      :!sufficient?'inconclusive_window_incomplete':strategyCoverage.status!=='covered'?'inconclusive_strategy_not_covered':guards.some(g=>!g.passed)?'tradeoff_guard_exceeded'
      :gain>r.criterion.minDelta?'local_candidate_supported':gain< -r.criterion.minDelta?'local_baseline_supported':'no_measured_advantage';
    return {verdict,deltas,guards,strategyCoverage,windowComplete:sufficient,sourceEligibility:r.sourceEligibility,
      ...(r.criterion.perspective?{objectivePerspective:r.criterion.perspective,objectiveDeltas,
        ...(opponentDeltas?{opponentDeltas}:{}),guardPerspective:'subject'}:{}),
      opponentMetrics:{baseline:copy(a.opponentMetrics||null),candidate:copy(b.opponentMetrics||null)},
      comparisonScope:copy(r.horizon),split:r.split,
      statisticalClaim:r.horizon.kind==='match_end'?'one_paired_match_not_population_win_rate':'one_paired_window_not_win_rate',
      acceptedForLiveStrategy:false,automaticPromotion:false,trainingTruth:false};}
  async function step(id){let r=await read(id);if(r.status==='complete')return r;
    if(['baseline','candidate'].every(n=>r.arms[n]?.status==='completed'))
      return save(r,{status:'complete',comparison:compare(r)});
    const name=['baseline','candidate'].find(n=>r.arms[n]?.status!=='completed');
    let arm=r.arms[name];const input=armInput(r,name);
    if(!arm){arm={status:'running',executionKey:input.executionKey};r=await save(r,{status:'running',arms:{...r.arms,[name]:arm}});}
    // A crashed caller may have missed a fully persisted Native result. Asking
    // the executor to read/resume does not buy the same model answer again.
    let result=await executor.readExecution({executionKey:input.executionKey});
    if(result?.status!=='completed'){
      need(result?.status!=='commit_unknown','POSTGAME_EXECUTION_UNKNOWN');
      result=await executor.run(input);
    }
    checkResult(result,r,name);
    r=await save(r,{arms:{...r.arms,[name]:{status:'completed',result:copy(result)}}});
    if(['baseline','candidate'].every(n=>r.arms[n]?.status==='completed'))r=await save(r,{status:'complete',comparison:compare(r)});
    return r;
  }
  async function evaluate({id,candidateHash,pairIds,discoveryGroups}) {
    need(pairIds?.length>0&&new Set(pairIds).size===pairIds.length,'POSTGAME_EVALUATION_PAIRS_REQUIRED');
    const pairs=await Promise.all(pairIds.map(read));
    need(pairs.every(p=>p.status==='complete'&&p.split==='held_out'&&p.candidateFrozenHash===candidateHash
      &&!discoveryGroups.includes(p.source.ancestryGroup)),'POSTGAME_EVALUATION_SCOPE_INVALID');
    const groups=[...new Set(pairs.map(p=>p.source.ancestryGroup))];
    const outcomes=pairs.map(p=>({pairId:p.reviewId,group:p.source.ancestryGroup,...copy(p.comparison)}));
    const valid=outcomes.every(o=>!['invalid_engineering_or_unreviewed','inconclusive_window_incomplete','inconclusive_strategy_not_covered'].includes(o.verdict));
    const supported=valid&&outcomes.some(o=>o.verdict==='local_candidate_supported')
      &&outcomes.every(o=>['local_candidate_supported','no_measured_advantage'].includes(o.verdict));
    const body={schemaVersion:'postgame_independent_evaluation_v1',candidateHash,pairIds,groups,outcomes,
      decision:!valid?'inconclusive_invalid_evidence':supported?'supported_in_tested_windows':'retain_baseline',
      automaticPromotion:false,acceptedForLiveStrategy:false,wholeGameImprovementProven:false,trainingTruth:false};
    const old=await store.load(id);if(old){need(old.evaluationHash===hash(body),'POSTGAME_EVALUATION_CHANGED');return old;}
    const record={...body,reviewId:id,revision:0,evaluationHash:hash(body),updatedAt:new Date().toISOString()};
    const c=await store.commit(id,null,record);need(c.ok,c.reason);return record;
  }
  async function publicView(id){const r=await read(id);return r.split==='held_out'
    ?{reviewId:id,status:r.status,split:r.split,candidateFrozenHash:r.candidateFrozenHash,details:'evaluator_only'}:copy(r);}
  return Object.freeze({create,step,read,publicView,evaluate});
}
