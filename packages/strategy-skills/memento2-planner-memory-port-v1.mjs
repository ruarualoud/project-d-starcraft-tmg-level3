import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c})};
// Explicit isolated-research adapter. Existing same-match records remain intact.
// Host binds observation/seat; the model only asks the ordinary memory tool.
export function createMemento2PlannerMemoryPortV1({runtime,id,queryId,scope,observationRef,stateHash,base}){
 need(runtime?.retrieve&&base?.query&&stateHash,'MEMENTO2_PLANNER_PORT_REQUIRED');
 const read=()=>runtime.retrieve({id,queryId,observationRef});
 async function query(input){
  for(const k of ['roomId','seatKey','matchBindingHash'])need(input.scope?.[k]===scope[k],'MEMENTO2_PLANNER_SCOPE_INVALID');
  const current=await base.query(input);
  for(const k of ['roomId','seatKey','matchBindingHash'])need(current.scope?.[k]===scope[k],'MEMENTO2_MATCH_MEMORY_SCOPE_INVALID');
  const op=await read();need(op.observation.stateHash===stateHash&&op.observation.seat===scope.seatKey,'MEMENTO2_PLANNER_STATE_CHANGED');
  const {queryResultHash:old,...body}=current;
  const conditionalExperiences={source:'memento2_isolated_research',currentMatchHistory:false,rulesAuthority:false,
   memento2Receipt:op.reviewId,modelContext:structuredClone(op.modelContext),cases:op.modelContext.case?[structuredClone(op.modelContext.case)]:[]};
  const result={...body,conditionalExperiences};return {...result,queryResultHash:hash(result)};
 }
 async function confirmPrompt(artifact){
  // Read the actual serialized tool result reaching the Planner; do not treat
  // a query having run or a matching ID alone as delivered case content.
  const op=await read();let delivered=false;
  function inspect(value){
   if(typeof value==='string'){if(value.startsWith('{')||value.startsWith('['))try{inspect(JSON.parse(value))}catch{};return}
   if(!value||typeof value!=='object')return;
   if(value.memento2Receipt===op.reviewId&&hash(value.modelContext)===hash(op.modelContext))delivered=true;
   for(const child of Object.values(value))inspect(child);
  }
  inspect(artifact);
  if(!delivered)return {delivered:false};
  const room=artifact.nodes?.find(n=>n.nodeId==='player-room-projection')?.content;
  need(room?.room?.stateHash===stateHash&&room.viewer?.seatKey===scope.seatKey&&room.room.roomId===scope.roomId,'MEMENTO2_PROMPT_STATE_CHANGED');
  if(op.delivered)return {delivered:true,receipt:op.delivered};
  const result=await runtime.delivered({id,queryId,stateHash,consumerRef:artifact.promptArtifactHash||hash(artifact)});
  return {delivered:true,receipt:result.delivered};
 }
 return {query,confirmPrompt,feedback:executionRef=>runtime.feedback({id,queryId,executionRef})};
}
