import {hash} from '../skill-production/common.mjs';
import {createMemento2PlannerMemoryPortV1} from './memento2-planner-memory-port-v1.mjs';
import {projectMemento2NativeObservationV1} from './memento2-native-observation-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
export const memento2IntervalStoreKeyV1=(executionKey)=>'memento2-intervals:'+hash(executionKey);
export function createMemento2IntervalSourcePortV1({store}){return {
 async readObservation(ref){const r=await store.load(ref.recordId);need(r?.observations?.[ref.stateHash],'MEMENTO2_INTERVAL_OBSERVATION_MISSING');return r.observations[ref.stateHash].observation;},
 async readOutcome(ref){const r=await store.load(ref.recordId);need(r?.outcomes?.[ref.queryId],'MEMENTO2_INTERVAL_OUTCOME_MISSING');return r.outcomes[ref.queryId];}
};}
// One query identity per actual decision state. A delivery is credited only for
// the Native interval until the next own decision (or explicit window boundary).
export function createMemento2ContinuousMemoryPortV1({store,runtime,id,executionKey,scope,base,readState,readPublicTransitions,replay,sourceUnchanged,environmentHash,scales,hooks={}}){
 const key=memento2IntervalStoreKeyV1(executionKey),controllers=new Map();
 const identity=hash({id,executionKey,scope,environmentHash,scales});
 async function load(){let r=await store.load(key);if(!r){r={reviewId:key,revision:0,schemaVersion:'memento2_decision_intervals_v1',updatedAt:new Date().toISOString(),identity,observations:{},pending:[],outcomes:{},completed:[],trainingTruth:false};need((await store.commit(key,null,r)).ok,'MEMENTO2_INTERVAL_CREATE_CONFLICT');}need(r.identity===identity,'MEMENTO2_INTERVAL_IDENTITY_CHANGED');return r;}
 async function save(r,change){const n={...r,...change,revision:r.revision+1,updatedAt:new Date().toISOString()};need((await store.commit(key,r.revision,n)).ok,'MEMENTO2_INTERVAL_WRITE_CONFLICT');return n;}
 function project(current){return projectMemento2NativeObservationV1({state:current.state,stateHash:current.stateHash,seat:scope.seatKey,environmentHash,scales,mode:'native_spatial_phase_v1',sourceRef:{executionKey,stateRevision:current.stateRevision}});}
 async function settle(current,windowEnd=false){
  let r=await load();
  for(const pending of r.pending){
   const op=await store.load('memento2-run:'+id+':query:'+hash(pending.queryId));
   if(!op?.delivered){if(windowEnd||pending.stateHash!==current.stateHash)r=await save(r,{pending:r.pending.filter(p=>p.queryId!==pending.queryId),completed:[...r.completed,{queryId:pending.queryId,status:'not_delivered_no_credit'}]});continue;}
   if(pending.stateHash===current.stateHash)continue;
   if(!r.outcomes[pending.queryId]){
    const verified=await replay();need(verified.ok&&verified.matchesCurrent&&await sourceUnchanged(),'MEMENTO2_INTERVAL_NATIVE_UNVERIFIED');
    const transitions=await readPublicTransitions(),start=transitions.findIndex(t=>t.preStateHash===pending.stateHash);
    need(start>=0,'MEMENTO2_INTERVAL_START_MISSING');const actions=[];let cursor=pending.stateHash;
    for(const t of transitions.slice(start)){need(t.preStateHash===cursor,'MEMENTO2_INTERVAL_GAP');actions.push(t);cursor=t.postStateHash;if(cursor===current.stateHash)break;}
    need(cursor===current.stateHash&&actions.length,'MEMENTO2_INTERVAL_END_MISSING');
    const before=r.observations[pending.stateHash].observation,after=project(current);
    const outcome={status:'completed',replayMatchesCurrent:true,sourceUnchanged:true,audited:true,seat:scope.seatKey,environmentHash,beforeStateHash:before.stateHash,afterObservation:after,beforeScore:before.metrics.score,afterScore:after.metrics.score,terminal:current.state.terminal===true||current.state.gameOver===true,winner:current.state.winner||null,nativeReceiptRef:key+':'+hash(actions),publicActions:actions,
     boundary:windowEnd?'training_window_end':'next_own_decision',interpretation:'Observed interval, including opponent and forced resolutions; score change is not a causal proof of memory quality.'};
    r=await save(r,{outcomes:{...r.outcomes,[pending.queryId]:outcome}});
   }
   const feedback=await runtime.feedback({id,queryId:pending.queryId,executionRef:{recordId:key,queryId:pending.queryId}});
   await hooks.afterIntervalFeedback?.(feedback);
   r=await save(r,{pending:r.pending.filter(p=>p.queryId!==pending.queryId),completed:[...r.completed,{queryId:pending.queryId,status:'feedback_completed',feedback:feedback.feedback}]});
  }
  return r;
 }
 async function binding(current){let r=await load(),row=r.observations[current.stateHash];
  if(!row){const observation=project(current),queryId=executionKey+':decision:'+current.stateHash;
   row={queryId,observation};r=await save(r,{observations:{...r.observations,[current.stateHash]:row},pending:[...r.pending,{queryId,stateHash:current.stateHash}]});}
  if(!controllers.has(current.stateHash))controllers.set(current.stateHash,createMemento2PlannerMemoryPortV1({runtime,id,queryId:row.queryId,scope,base,stateHash:current.stateHash,observationRef:{recordId:key,stateHash:current.stateHash}}));
  return controllers.get(current.stateHash);
 }
 return {
  // The seat's decide() entry also runs deterministic Host continuations.
  // They are not a new LLM decision: retain the interval through resolution
  // and scoring. The next actual retrieval settles before sampling, or finish
  // settles the tail at the explicit training boundary.
  async beforeDecision(){return load();},
  async query(input){const current=await readState();await settle(current);const result=await (await binding(current)).query(input);need((await readState()).stateHash===current.stateHash,'MEMENTO2_INTERVAL_STATE_CHANGED');return result;},
  async confirmPrompt(artifact){const current=await readState(),r=await load();if(!r.observations[current.stateHash])return {delivered:false};return (await binding(current)).confirmPrompt(artifact);},
  async finish(){return settle(await readState(),true);},
  read:load
 };
}
