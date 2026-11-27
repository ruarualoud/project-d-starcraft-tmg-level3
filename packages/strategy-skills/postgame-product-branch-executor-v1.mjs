import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {measurePostgameStateV1,classifyPostgameSourceV1} from './postgame-paired-product-runtime-v1.mjs';
const need=(v,c)=>{if(!v)throw Error(c);};
const RESOLUTION_BOUNDARY='postgame_native_resolution_boundary_v1';
// Current-product Native dispatch owns these in-flight action continuations.
// Deferred battlefield-asset opportunities and an activation's after-action
// ability window are not unfinished damage/charge resolution.
export function postgamePendingResolutionFieldsV1(state){return [
  'pendingAction','pendingOfficialReactionWindow',
  'pendingCurrentProductRangedDamageReaction',
  'pendingCurrentProductRangedCasualtyChoice','pendingCurrentProductRangedSequence',
].filter(key=>state[key]!=null);}
export function postgameBranchHorizonCompleteV1({horizon,state,initial,count}) {
  const terminal=state.terminal===true||state.gameOver===true;
  if(horizon.kind==='match_end')return terminal;
  if(horizon.kind==='round_end')return state.round>initial.round||terminal;
  if(horizon.kind==='action_window')return terminal||count>=horizon.maxActions&&!postgamePendingResolutionFieldsV1(state).length;
  throw Error('POSTGAME_HORIZON_REQUIRED');
}
const unfinishedActionWindow = r => r?.result?.windowComplete === false
  && r.input?.horizon?.kind === 'action_window';
// Factory returns the existing Room + HostedOpponent orchestrator, not an
// alternative game executor. It may inject external replies for engineering.
export function createPostgameProductBranchExecutorV1({store,openBranch}){
  const save=async(r,change)=>{const n={...r,...structuredClone(change),revision:r.revision+1,updatedAt:new Date().toISOString()};
    const c=await store.commit(r.reviewId,r.revision,n);need(c.ok,c.reason);return n;};
  async function reconcileLegacyCompletion(r){
    if(!r?.result||r.input.horizon.kind!=='action_window'||r.result.windowComplete!==true
      ||r.result.resolutionBoundary?.schemaVersion===RESOLUTION_BOUNDARY)return r;
    const branch=await openBranch(r.input);
    try{
      const current=await branch.read();
      need(current.stateHash===r.lastStateHash,'POSTGAME_COMPLETION_CHECKPOINT_CHANGED');
      const pendingFields=postgamePendingResolutionFieldsV1(current.state);
      const boundary={schemaVersion:RESOLUTION_BOUNDARY,stateHash:current.stateHash,pendingFields};
      const complete=postgameBranchHorizonCompleteV1({horizon:r.input.horizon,state:current.state,
        initial:branch.initialState,count:current.stateRevision});
      return save(r,{completionAudits:[...(r.completionAudits||[]),{
        previousResult:structuredClone(r.result),observedBoundary:boundary,windowComplete:complete}],
        result:{...r.result,windowComplete:complete,resolutionBoundary:boundary}});
    }finally{await branch.close();}
  }
  async function readExecution({executionKey}){const r=await reconcileLegacyCompletion(await store.load(executionKey));
    if(unfinishedActionWindow(r))return {status:'resumable',reason:'pending_native_resolution',executionKey};
    return r?.result?{...r.result,sourceEligibility:classifyPostgameSourceV1(r.input.source)}
      :{status:r?'resumable':'definitely_not_started'};}
  async function run(input){let r=await store.load(input.executionKey);
    const identity=hash(input);
    if(r){need(r.identity===identity,'POSTGAME_EXECUTION_CHANGED');r=await reconcileLegacyCompletion(r);
      if(r.result&&!unfinishedActionWindow(r))return readExecution(input);
      if(unfinishedActionWindow(r))r=await save(r,{status:'resuming_resolution',
        incompleteResults:[...(r.incompleteResults||[]),structuredClone(r.result)],result:null});}
    else {r={reviewId:input.executionKey,revision:0,identity,input:structuredClone(input),status:'preparing',updatedAt:new Date().toISOString()};
      const c=await store.commit(r.reviewId,null,r);need(c.ok,c.reason);}
    const branch=await openBranch(input);
    try{
      const initial=branch.initialState;
      if(!r.initialGameStateHash)r=await save(r,{status:'running',initialGameStateHash:hash(initial),
        sourceStateHash:branch.sourceStateHash,initialRandomStateHash:branch.randomIdentity,
        initialContextHash:branch.initialContextHash});
      need(r.initialGameStateHash===hash(initial),'POSTGAME_INITIAL_STATE_CHANGED');
      let state=(await branch.read()).state;
      let count=(await branch.read()).stateRevision;
      const complete=()=>postgameBranchHorizonCompleteV1({horizon:input.horizon,state,initial,count});
      if(input.evidencePolicy==='boundary_pair_v1'&&!r.boundaryFrames?.before){
        need(branch.captureBoundaryFrame,'POSTGAME_BOUNDARY_FRAME_PORT_REQUIRED');
        // A crash after Native with no saved initial frame cannot be repaired by
        // presenting today's position as yesterday's starting board.
        const before=count===0?await branch.captureBoundaryFrame(input.subjectSeat)
          :{status:'unavailable',reason:'initial_frame_not_saved_before_native'};
        r=await save(r,{boundaryFrames:{...r.boundaryFrames,before}});
      }
      while(!complete()&&(count<input.horizon.maxActions
        ||input.horizon.kind==='action_window'&&postgamePendingResolutionFieldsV1(state).length)){
        need(count<input.horizon.maxActions+64,'POSTGAME_PENDING_RESOLUTION_TAIL_EXCEEDED');
        const before=count;
        const outcome=await branch.driveOne();
        const current=await branch.read();state=current.state;count=current.stateRevision;
        if(count<=before){
          // Preserve the actual product stop before closing its seat runtimes;
          // close() changes their public status to closed_by_host.
          r=await save(r,{status:'paused',lastRevision:count,lastStateHash:current.stateHash,
            lastStop:{status:outcome?.status||'unknown',
              failureAccounting:outcome?.failureAccounting||null,
              pauseReceipts:outcome?.pauseReceipts||[],seats:outcome?.seats||null}});
          throw Error('POSTGAME_BRANCH_NO_PROGRESS:'+String(outcome?.status||'unknown'));
        }
        const actions=new Map((r.observedActions||[]).map(t=>[t.traceId,t]));
        for(const t of outcome.trajectory||[])actions.set(t.traceId,t);
        r=await save(r,{lastRevision:count,lastStateHash:current.stateHash,lastOutcome:outcome.status,
          observedActions:[...actions.values()]});
      }
      // Read accepted Native events after the completed window, including a cold
      // resume whose last transition was applied before the parent saved it.
      if(branch.readPublicTransitions)r=await save(r,{nativeTransitions:await branch.readPublicTransitions()});
      if(branch.readDecisionExposures){
        const accepted=new Set((r.nativeTransitions||[]).map(t=>t.preStateHash));
        r=await save(r,{decisionExposures:(await branch.readDecisionExposures()).filter(x=>accepted.has(x.stateHash))});
      }
      if(input.evidencePolicy==='boundary_pair_v1'&&!r.boundaryFrames?.after){
        need(branch.captureBoundaryFrame,'POSTGAME_BOUNDARY_FRAME_PORT_REQUIRED');
        r=await save(r,{boundaryFrames:{...r.boundaryFrames,after:await branch.captureBoundaryFrame(input.subjectSeat)}});
      }
      const replay=await branch.replay();need(replay.ok&&replay.matchesCurrent,'POSTGAME_BRANCH_REPLAY_MISMATCH');
      const sourceUnchanged=await branch.sourceUnchanged();need(sourceUnchanged,'POSTGAME_SOURCE_MUTATED');
      if(complete())await branch.finishLearningWindow?.();
      const result={status:'completed',executionKey:input.executionKey,sourceStateHash:r.sourceStateHash,
        initialGameStateHash:r.initialGameStateHash,initialRandomStateHash:r.initialRandomStateHash,
        initialContextHash:r.initialContextHash,
        strategyBundleHash:hash(input.strategyBundle),opponentBundleHash:hash(input.opponentBundle),controlsHash:hash(input.controls),
        subjectSeat:input.subjectSeat,...(r.decisionExposures?{decisionExposures:r.decisionExposures}:{}),terminalOutcome:state.terminal===true||state.gameOver===true
          ?{winner:state.winner||null,reason:state.terminalReason||null}:null,
        metrics:measurePostgameStateV1(state,input.subjectSeat),opponentMetrics:measurePostgameStateV1(state,input.subjectSeat==='player1'?'player2':'player1'),
        beforeMetrics:measurePostgameStateV1(initial,input.subjectSeat),
        beforeOpponentMetrics:measurePostgameStateV1(initial,input.subjectSeat==='player1'?'player2':'player1'),
        windowComplete:complete(),resolutionBoundary:{schemaVersion:RESOLUTION_BOUNDARY,
          stateHash:r.lastStateHash||r.initialGameStateHash,pendingFields:postgamePendingResolutionFieldsV1(state)},
        actualActions:count,replayMatchesCurrent:true,sourceUnchanged,
        sourceEligibility:classifyPostgameSourceV1(input.source),
        opponentResponseTrace:(r.observedActions||[]).filter(t=>t.seatKey!==input.subjectSeat),
        trajectoryRef:branch.trajectoryRef,...(r.boundaryFrames?{boundaryFrames:r.boundaryFrames}:{}),usage:await branch.usage(),
        interpretation:input.horizon.kind==='match_end'
          ?'Observed match with declared action cap; only Native terminal is complete; no population win-rate claim.'
          :'Finite observed window; random outcome is not expected value; no automatic Skill promotion.',trainingTruth:false};
      await save(r,{status:'completed',result});return result;
    }finally{await branch.close();}
  }
  return Object.freeze({run,readExecution});
}
