// Transport ownership only. This module never supplies a model's strategic
// answer, clears an unknown, changes Rules truth, or authorizes a retry.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const text=value=>typeof value==='string'&&value.trim().length>0;
export const ROSTER_REVIEW_OBLIGATION_DELIVERY_VERSION_V1=2;
const invalid=(reason,detail)=>{throw Object.assign(Error(reason),{code:reason,detail,dispatchOutcome:'not_dispatched'});};
const historyInstruction='Historical resolution obligation: determine whether the following original inquiry/availability assumption has an explicit, source-backed disposition in the current Plan and returned decisions. An old assumption refuted by current evidence can be successfully RESOLVED; supported here means the resolution is supported, not that the old statement became true. Still-open necessary facts remain needs_evidence; a false claim still asserted by the CURRENT Plan requires_revision. Do not force a Plan edit when the current Plan already corrected or rejected that premise. Original historical text (preserved verbatim): ';

// Rename only the identifier. Different producers own question, criterion,
// conditions and future extension fields; a short-ID view cannot whitelist away
// their semantics. The original record remains immutable.
export function projectRosterReviewObligationsV1(assignment){
  if(assignment.role!=='roster_workflow_final_review'||assignment.inputs.review?.value?.obligations===undefined)return null;
  const obligations=assignment.inputs.review.value.obligations;
  if(!Array.isArray(obligations))invalid('ROSTER_REVIEW_OBLIGATIONS_INVALID','Expected an array');
  const ids=new Set();
  for(const row of obligations){
    if(!row||!text(row.checkId)||ids.has(row.checkId)||!text(row.question)&&!text(row.criterion))
      invalid('ROSTER_REVIEW_OBLIGATIONS_INVALID',{checkId:row?.checkId??null,reason:'unique_id_and_nonempty_question_or_criterion_required'});
    ids.add(row.checkId);
  }
  const historical=obligations.some(row=>row.originQuestionIds?.length);
  const entries=obligations.map((row,index)=>({...structuredClone(row),handle:`q${index+1}`,
    ...(row.originQuestionIds?.length&&text(row.question)?{question:historyInstruction+row.question}:{})}));
  const byId=new Map(entries.map(row=>[row.checkId,row.handle])),byHandle=new Map(entries.map(row=>[row.handle,row.checkId]));
  return {byId,byHandle,entries,inputs:{...assignment.inputs,review:{...assignment.inputs.review,value:{
    ...assignment.inputs.review.value,...(historical?{historicalQuestionResolutionVersion:1}:{}),
    obligations:entries.map(({handle,checkId,...body})=>({...body,checkId:handle})),
    identityInstruction:'Return each supplied short checkId exactly once. All obligation content and constraints are preserved. The host restores immutable causal IDs from this request, never from a later obligation order. Missing answers remain unresolved, not approved.'}}}};
}

// Diagnose a retained request against ITS retained assignment, not today's
// changed strategy/rubric. Only actual missing fields justify this recovery.
export function missingRosterReviewObligationFieldsV1({assignment,request}){
  const sent=request?.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
  if(sent?.workId!==assignment?.workId||sent?.role!==assignment?.role)return [];
  const expected=projectRosterReviewObligationsV1(assignment)?.inputs.review.value.obligations;
  const actual=sent.inputs?.review?.value?.obligations;
  if(!expected||!Array.isArray(actual))return [];
  const missing=[];
  expected.forEach(row=>{
    const received=actual.find(other=>other.checkId===row.checkId);
    if(!received)return; // A different ledger is not this known field-loss bug.
    for(const [field,value]of Object.entries(row))if(field!=='checkId'&&value!==undefined&&!Object.hasOwn(received,field))
      missing.push({checkId:row.checkId,field});
  });
  return missing;
}

// Freeze decoding identities after all role-specific projections. Kept outside
// Provider input; the model need not reason about Host hashes or long causal IDs.
export function finalizeRosterRoleRequestV1(request,{assignment,handles,directory}){
  return {...request,roleCommunication:{version:1,workId:assignment.workId,role:assignment.role,
    reviewHandles:handles?.entries.map(({handle,checkId})=>({handle,checkId}))??[],
    evidenceNumbers:directory.map(({number,id,artifactRef})=>({number,id,artifactRef}))},
    contextHash:hash({workId:assignment.workId,role:assignment.role,promptNodes:request.promptNodes,
      contract:request.responseFormat.outputContractRef.hash})};
}

export function rosterRoleReplyCommunicationErrorsV1(request,reply){
  const errors=[],receipt=reply?.receipt;
  const add=(field,expected,actual)=>errors.push({field,expected,actual:actual??null});
  for(const field of ['contextHash','roundKind']){
    const expected=field==='roundKind'?request.roundKind:request.contextHash;
    if(receipt?.[field]!==expected)add(field,expected,receipt?.[field]);
  }
  for(const field of ['sessionId','roundIndex']){
    // Legacy immutable receipts did not include these fields. New requests use
    // the same Host-assigned identity in the production adapter and test adapter.
    if((request.roleCommunication&&!reply?.providerFailure||Object.hasOwn(receipt??{},field))
      &&receipt?.[field]!==request[field])add(field,request[field],receipt?.[field]);
  }
  // Completed malformed JSON has a preserved failure document, not an output
  // hash; it still belongs to one exact request and follows normal correction.
  if(!reply?.providerFailure&&receipt?.outputHash!==hash(reply?.output??null))
    add('outputHash',hash(reply?.output??null),receipt?.outputHash);
  if(receipt?.outputContractRef&&!isDeepStrictEqual(receipt.outputContractRef,request.responseFormat.outputContractRef))
    add('outputContractRef',request.responseFormat.outputContractRef,receipt.outputContractRef);
  return errors;
}

export function rosterToolReplyCommunicationErrorsV1({receipt,descriptor,args}){
  if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||!Object.keys(receipt).length)
    return [{field:'receipt',reason:'nonempty_tool_result_object_required'}];
  const errors=[],expected={sourceStateHash:descriptor.sourceStateHash,rulesRuntimeHash:descriptor.rulesRuntimeHash,
    baseStateHash:args.base?.kind==='branch'?args.base.branchStateHash:descriptor.sourceStateHash};
  // Validate identities declared by that native operation. Do not invent a
  // universal success schema for Builder/math/map results with different shapes.
  for(const [field,value]of Object.entries(expected))if(value!==undefined&&Object.hasOwn(receipt,field)&&receipt[field]!==value)
    errors.push({field,expected:value,actual:receipt[field]});
  return errors;
}

export async function quarantineRosterCommunicationV1({errors,operation,replyRef,requestRef,store,control,lane}){
  if(!errors.length)return;
  operation.communicationFailures=[...(operation.communicationFailures??[]),{
    lane,requestRef,replyRef,errors:structuredClone(errors),outcome:'unattributed',retryAuthorized:false}];
  await control.checkpointOperation(operation);
  throw Object.assign(Error('ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH'),{
    code:'ROSTER_WORKFLOW_REPLY_IDENTITY_MISMATCH',dispatchOutcome:'completed_unattributed',
    detail:{lane,requestRef,replyRef,errors,originalPendingPreserved:true,automaticRetry:false}});
}
