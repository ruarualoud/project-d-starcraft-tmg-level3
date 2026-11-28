import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {hasOfficialConsumeBeforeCasualtyPolicyV1} from '../rule-atoms/official-before-casualty-batch-v1.mjs';
import {stageOfficialBeforeCasualtyContinuationV1} from './official-before-casualty-runtime-v1.mjs';
import {applyOfficialSealedConsumePaymentV1} from './official-consume-payment-runtime-v1.mjs';

const without=(x,k)=>Object.fromEntries(Object.entries(x).filter(([name])=>name!==k));
const seal=(x,k)=>({...x,[k]:hash(x)});
const clone=x=>structuredClone(x);
export function readOfficialConsumeCheckpointV1(state){
  const p=state.pendingOfficialConsumePayment;if(!p)return null;
  if(!hasOfficialConsumeBeforeCasualtyPolicyV1(state)||p.checkpointHash!==hash(without(p,'checkpointHash'))
    ||p.round!==Number(state.round)||p.phase!==state.phase||p.policyHash!==hash(state.officialBeforeCasualtyBatchPolicy))
    throw Error('CONSUME_PAYMENT_CHECKPOINT_INVALID');
  return p;
}

// The caller has validated the entire original ability/reaction. Reserve cards
// and reaction quota before giving either player an interrupting choice.
export function stageOfficialConsumePaymentV1({state:input,action,plan,owner,activationContext}){
  if(!hasOfficialConsumeBeforeCasualtyPolicyV1(input)||plan.stateHash!==hash(input)
    ||plan.paymentPlanHash!==hash(without(plan,'paymentPlanHash'))||input.pendingOfficialConsumePayment
    ||!['plague','dark_swarm_reaction'].includes(owner.kind))throw Error('CONSUME_PAYMENT_STAGE_INVALID');
  const state=clone(input),events=[],target=state.pieces.find(p=>p.id===plan.sacrifice.pieceId);
  const checkpoint=seal({schema:'starcraft_tmg_consume_payment_checkpoint_v1',round:Number(state.round),phase:state.phase,
    policyHash:hash(state.officialBeforeCasualtyBatchPolicy),sourceActionHash:hash(action),action:clone(action),plan:clone(plan),
    owner:clone(owner),...(owner.kind==='dark_swarm_reaction'?{reactionWindow:clone(state.pendingOfficialReactionWindow)}:{}),
    trainingTruth:false},'checkpointHash');
  for(const id of plan.cardPayment.selectedCardsExhaustOnCommit){
    const card=state.cardResources[plan.sideKey].find(c=>c.cardInstanceId===id);
    if(card?.readiness!=='ready')throw Error('CONSUME_RESERVED_CARD_UNAVAILABLE');card.readiness='exhausted';
  }
  if(owner.kind==='dark_swarm_reaction'){
    if(!checkpoint.reactionWindow||!isDeepStrictEqual(owner.historyReservation.planHash,action.reactionPlan.planHash))
      throw Error('CONSUME_REACTION_RESERVATION_INVALID');
    state.officialReactionHistory=[...(state.officialReactionHistory||[]),clone(owner.historyReservation)];
    delete state.pendingOfficialReactionWindow;
  }
  state.pendingOfficialConsumePayment=checkpoint;
  events.push({type:'consume_payment_committed',paymentPlanHash:plan.paymentPlanHash,checkpointHash:checkpoint.checkpointHash,
    exhaustedCardInstanceIds:clone(plan.cardPayment.selectedCardsExhaustOnCommit),generatedFromModel:0,
    reactionQuotaReserved:owner.kind==='dark_swarm_reaction',trainingTruth:false});
  const remainingModelIds=target.models.filter(m=>!m.isDestroyed&&m.isOnField!==false&&m.id!==plan.sacrificeModelId).map(m=>m.id);
  const casualty=seal({casualtyModelIds:[plan.sacrificeModelId],remainingModelIds,targetDestroyed:!remainingModelIds.length,
    postDamageMarker:remainingModelIds.length?Number(target.damageMarker||0):0,
    shieldedBefore:target.statuses.some(s=>String(typeof s==='string'?s:s.statusName||s.name).toLowerCase()==='shielded'),
    shieldedAfter:false,trainingTruth:false},'resolutionHash');
  const staged=stageOfficialBeforeCasualtyContinuationV1({state,action,hostKind:'consume_payment',
    rows:[{targetPieceId:target.id,casualty,attackResolutionHash:plan.paymentPlanHash}],
    hostData:{consumeCheckpointHash:checkpoint.checkpointHash},activationContext,
    causePieceId:plan.sourcePieceId,causeSideKey:plan.sideKey});
  if(staged){
    // Dark Swarm has already consumed this player's reaction quota. A second
    // reaction in its payment chain cannot be admitted under the frozen FAQ.
    if(owner.kind==='dark_swarm_reaction')throw Error('CONSUME_REACTION_QUOTA_BYPASS');
    staged.state.log.at(-1).events.unshift(...clone(events));return{...staged,events:[...events,...staged.events]};
  }
  const receipt=applyOfficialSealedConsumePaymentV1(state,action,events,checkpoint,casualty);
  delete state.pendingOfficialConsumePayment;
  if(checkpoint.reactionWindow)state.pendingOfficialReactionWindow=clone(checkpoint.reactionWindow);
  state.log||=[];state.log.push({id:'log-'+(state.log.length+1),round:Number(state.round),phase:state.phase,action:clone(action),events:clone(events)});
  return{ok:true,state,action,events,consumeCheckpoint:checkpoint,consumeReceipt:receipt,trainingTruth:false};
}

export function resumeOfficialConsumePaymentV1({state,frame,casualties}){
  const checkpoint=readOfficialConsumeCheckpointV1(state),events=[];
  if(frame.hostKind!=='consume_payment'||!checkpoint||frame.hostData.consumeCheckpointHash!==checkpoint.checkpointHash
    ||!isDeepStrictEqual(frame.originalAction,checkpoint.action)||frame.rows.length!==1||casualties.length!==1
    ||frame.rows[0].targetPieceId!==checkpoint.plan.sacrifice.pieceId
    ||!isDeepStrictEqual(frame.rows[0].casualty.casualtyModelIds,[checkpoint.plan.sacrificeModelId]))
    throw Error('CONSUME_PAYMENT_PARENT_MISMATCH');
  const receipt=applyOfficialSealedConsumePaymentV1(state,checkpoint.action,events,checkpoint,casualties[0]);
  delete state.pendingOfficialConsumePayment;
  if(checkpoint.reactionWindow){
    if(state.pendingOfficialReactionWindow)throw Error('CONSUME_PRIOR_REACTION_SLOT_OWNED');
    state.pendingOfficialReactionWindow=clone(checkpoint.reactionWindow);
  }
  state.log||=[];state.log.push({id:'log-'+(state.log.length+1),round:Number(state.round),phase:state.phase,action:clone(checkpoint.action),events:clone(events)});
  return{ok:true,state,action:checkpoint.action,events,consumeCheckpoint:checkpoint,consumeReceipt:receipt,trainingTruth:false};
}
