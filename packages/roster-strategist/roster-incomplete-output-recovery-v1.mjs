// A received truncated response is an accounting record, never a decision.
import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export function projectRosterIncompleteOutputRecoveryV1({work,request,event,engineeringChangeId,targetContract}){
 const pending=work?.operationState?.pending,dispatch=work?.failure?.providerDispatch,record=event?.failedOutputRecord;
 if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKSPACE_PROVIDER_OUTPUT_INCOMPLETE'
  ||!pending||work.operationState.retryProviderDispatch||!engineeringChangeId?.trim()
  ||dispatch?.status!=='response_received'||dispatch.costStatus!=='known'
  ||event?.type!=='round_failed'||event.code!==work.failure.code||event.paidProviderCall!==true
  ||event.dispatchRequestId!==dispatch.requestId||event.receiptHash!==dispatch.providerReceiptHash
  ||!isDeepStrictEqual(event.usage,dispatch.usage)||!Number.isSafeInteger(event.usage?.totalUnits)
  ||record?.schema!=='starcraft_tmg_roster_incomplete_provider_output_v1'||record.providerStatus!=='incomplete'
  ||record.providerIncompleteReason!=='max_output_tokens'||record.eligibleForCompletedReplyRecovery!==false
  ||typeof record.rawText!=='string'||record.rawTextHash!==hash(record.rawText)
  ||record.contextHash!==pending.contextHash||request.contextHash!==pending.contextHash
  ||record.roundKind!==request.roundKind||record.roundIndex!==request.roundIndex
  ||dispatch.contextHash!==request.contextHash||dispatch.roundKind!==request.roundKind||dispatch.roundIndex!==request.roundIndex
  ||dispatch.sessionId!==request.sessionId||request.roundIndex!==work.operationState.turn+1
  ||!isDeepStrictEqual(record.outputContractRef,request.responseFormat.outputContractRef)
  ||!isDeepStrictEqual(dispatch.outputContractRef,request.responseFormat.outputContractRef)
  ||targetContract?.id!==request.responseFormat.outputContractRef.id||!targetContract.version
  ||targetContract.version===request.responseFormat.outputContractRef.version)return null;
 return {version:1,engineeringChangeId,originalRequestRef:pending.requestRef,originalContextHash:pending.contextHash,
  dispatch:structuredClone(dispatch),targetContract:structuredClone(targetContract),
  rawOutputAccepted:false,semanticCountersReset:false,nativeReplay:false};
}
