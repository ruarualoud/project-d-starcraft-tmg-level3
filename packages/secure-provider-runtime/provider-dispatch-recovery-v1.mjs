import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { isDeepStrictEqual } from 'node:util';

// Historical Kimi ACP timeouts were recorded before a response as shadow_failed.
// Interpret that exact transport fact without rewriting old receipts or treating
// parse/schema/permission failures as network failures.
function legacyKimiPromptTimeout(record) {
  return record?.providerKind === 'kimi_code_cli_acp_shadow'
    && record.status === 'shadow_failed' && record.costStatus === 'unknown'
    && record.failure === 'KIMI_ACP_TIMEOUT:session/prompt'
    && typeof record.kimiSessionId === 'string' && record.kimiSessionId.length > 0;
}

// A terminal Kimi API failure is eligible only for an explicitly authorized
// retry after the user resolves quota/service availability. It is never an
// automatic resend and never classifies parse/schema/tool failures as transport.
function legacyKimiApiFailure(record) {
  return record?.providerKind === 'kimi_code_cli_acp_shadow'
    && record.status === 'shadow_failed' && record.costStatus === 'unknown'
    && record.failure === 'ROSTER_WORKSPACE_KIMI_TURN_FAILED:provider.api_error'
    && typeof record.kimiSessionId === 'string' && record.kimiSessionId.length > 0;
}

// ACP can finish a turn with a typed transport failure, including failure to
// reach its OAuth service. This is not an expired/denied credential. Require
// the terminal identity and zero public reply; generic internal errors cannot
// acquire a retry merely by sharing the outer TURN_FAILED code.
function typedKimiConnectionFailure(record) {
  const terminal=record?.providerTerminal;
  return record?.providerKind==='kimi_code_cli_acp_shadow'
    &&record.status==='shadow_failed'&&record.costStatus==='unknown'
    &&terminal?.version==='kimi_code_terminal_v1'&&terminal.failed===true
    &&terminal.sessionId===record.kimiSessionId&&terminal.contextHash===record.contextHash
    &&terminal.publicCharacters===0
    &&((terminal.errorName==='APIConnectionError'&&terminal.errorCode==='provider.connection_error')
      ||(terminal.errorName==='OAuthConnectionError'&&terminal.errorCode==='internal'))
    &&record.failure==='ROSTER_WORKSPACE_KIMI_TURN_FAILED:'+terminal.errorCode;
}

export function isExplicitlyRecoverableProviderDispatchV1(record) {
  return (record?.status === 'definitely_not_sent'
    && record.transportFailure?.requestDefinitelyNotSent === true)
    || legacyKimiPromptTimeout(record) || legacyKimiApiFailure(record) || typedKimiConnectionFailure(record)
    || record?.status === 'ambiguous' || (record?.status === 'response_rejected'
    && [500, 502, 503, 504].includes(record.rejection?.httpStatus)
    && record.rejection?.contextLengthExceeded !== true);
}

// A new explicit authorization may target the latest failed physical attempt.
// Never revive an ancestor or consume one authorization twice; automatic
// recovery remains separate and retains its existing one-attempt policy.
export function isExplicitLatestProviderRetryV1({dispatch,currentDispatch,retainedRetry=null,
  authorizationId,expectedRequestId,authorizeOneAdditionalDispatchRetry=false,history=[]}={}) {
  if(authorizeOneAdditionalDispatchRetry!==true||typeof authorizationId!=='string'
    ||!authorizationId.trim()||!dispatch?.requestId||!currentDispatch
    ||expectedRequestId!==dispatch.requestId
    ||!(dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)
    ||!isExplicitlyRecoverableProviderDispatchV1(dispatch)
    ||hashStarcraftTmgContract(dispatch)!==hashStarcraftTmgContract(currentDispatch)
    ||authorizationId===dispatch.retryAuthorizationId
    ||history.some(row=>row.authorizationId===authorizationId
      ||row.dispatch?.requestId===dispatch.requestId))return false;
  if(retainedRetry&&(
    (dispatch.retryOfRequestId||dispatch.retryOfNotSentRequestId)!==retainedRetry.requestId
    ||dispatch.retryOfRequestId&&dispatch.retryAuthorizationId!==retainedRetry.retryAuthorizationId))return false;
  return true;
}

// Workflow recovery and product HTTP must classify the same failure as the
// Secure Provider. A returned 5xx is distinct from a content/permission error.
export function isExplicitlyRecoverableProviderFailureV1(failure) {
  return ['ROSTER_WORKSPACE_PROVIDER_SEND_FAILED',
    'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'].includes(failure?.code)
    || (failure?.code === 'ROSTER_WORKSPACE_KIMI_TURN_FAILED'
      && (legacyKimiApiFailure(failure.providerDispatch)||typedKimiConnectionFailure(failure.providerDispatch)))
    || (failure?.code === 'KIMI_ACP_TIMEOUT:session/prompt'
      && legacyKimiPromptTimeout(failure.providerDispatch))
    || (failure?.code === 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
      && failure.providerDispatch?.status === 'response_rejected'
      && isExplicitlyRecoverableProviderDispatchV1(failure.providerDispatch));
}

// Historical ambiguous fees stay unknown even after a successful retry. They
// are accounting history, not a second pending logical request. Only an exact
// completed retry lineage settles the execution obligation; no record is edited.
export function unresolvedStarcraftTmgProviderDispatchesV1(records = []) {
  const completed = (record, seen = new Set()) => {
    if (seen.has(record.requestId)) return false;
    seen.add(record.requestId);
    return records.some(retry => retry.retryOfRequestId === record.requestId
      && retry.contextHash === record.contextHash
      && retry.requestBodyHash === record.requestBodyHash
      && retry.sessionId === record.sessionId && retry.planHash === record.planHash
      && retry.roundKind === record.roundKind && retry.roundIndex === record.roundIndex
      && (retry.status === 'completed' || completed(retry, new Set(seen))));
  };
  return records.filter(record => (['ambiguous', 'reserved', 'sent', 'sending'].includes(record.status)
    || legacyKimiPromptTimeout(record) || legacyKimiApiFailure(record) || typedKimiConnectionFailure(record))
    && !completed(record));
}

// Pure shared reconciliation policy. A returned public reply can be replayed;
// definitely-not-sent can be retried under the caller's existing budget. No
// request is ever resent solely because a connection failed or a timer fired.
export function reconcileStarcraftTmgProviderDispatchV1({ dispatchRecord,
  retainedOutputs = [], processInterrupted = false, resumeAuthorization = null,
  retryAuthorizations = [] } = {}) {
  const record = dispatchRecord;
  const base = { schemaVersion: "starcraft_tmg_provider_dispatch_recovery_v1",
    kind: "provider_dispatch", scope: "current_request",
    requestId: record?.requestId || null, contextHash: record?.contextHash || null,
    costStatus: record?.costStatus || "unknown",
    automaticResendAllowed: false, mayApply: false, trainingTruth: false };
  if (!record?.requestId || !record?.requestBodyHash || !record.contextHash) {
    return { ...base, action: "needs_attention", reason: "legacy_request_identity_missing" };
  }
  const output = retainedOutputs.find(item => item.dispatchRequestId === record.requestId
    && item.roundKind === record.roundKind
    && Number(item.roundIndex) === Number(record.roundIndex)
    && item.contextHash === record.contextHash
    && item.outputContractRef?.hash === record.outputContractRef?.hash
    && item.outputHash === hashStarcraftTmgContract(item.sanitizedOutput));
  if (output) return { ...base, action: "replay_local", reason: "durable_public_reply_available",
    outputHash: output.outputHash, costStatus: record.costStatus || "known" };
  // Fresh, explicit consent targets one terminal physical attempt, including a
  // failed retry leaf. Never revive its ancestor's consumed authorization.
  if (processInterrupted === true && isExplicitlyRecoverableProviderDispatchV1(record)
    && resumeAuthorization?.explicitSingleRetry === true
    && resumeAuthorization.requestId === record.requestId
    && resumeAuthorization.contextHash === record.contextHash
    && resumeAuthorization.requestBodyHash === record.requestBodyHash
    && !retryAuthorizations.some(a => a.requestId === record.requestId && a.status === 'consumed')) {
    return { ...base, action: 'retry_explicit_once', reason: 'explicit_terminal_attempt_consent',
      maximumPhysicalRetries: 1, originalAttemptPreserved: true };
  }
  if (record.status === "reserved" || record.status === "definitely_not_sent") {
    return { ...base, action: "retry_not_sent", reason: "no_egress_proven",
      costStatus: "not_sent", automaticResendAllowed: true };
  }
  // An interrupted owner is distinct from a slow live request. Standing user
  // consent authorizes one new physical attempt for this exact durable request,
  // preserving the unknown original fee/result and preventing consent reuse.
  if (processInterrupted === true && ["sending", "ambiguous"].includes(record.status)
    && resumeAuthorization?.standingNetworkResumeConsent === true
    && resumeAuthorization.requestId === record.requestId
    && resumeAuthorization.contextHash === record.contextHash
    && resumeAuthorization.requestBodyHash === record.requestBodyHash
    && !retryAuthorizations.some(a => a.requestId === record.requestId && a.status === "consumed")) {
    return { ...base, action: "retry_authorized_unknown", reason: "owner_interrupted_standing_resume_consent",
      costStatus: "unknown", automaticResendAllowed: true, maximumPhysicalRetries: 1,
      originalAttemptPreserved: true };
  }
  return { ...base, action: "needs_attention", reason:
    record.status === "completed" || record.status === "response_received"
      ? "returned_reply_not_durably_available" : "egress_unknown_and_no_result_lookup",
    // A true Provider lookup adapter can later settle this state. Merely
    // clearing the failure/counter or replacing the request ID cannot.
    automaticResendAllowed: false };
}

// Reattach a locally retained successful response only to its original
// physical dispatch, initial request and paid receipt.
export function matchesReturnedRosterProviderReplyV1({request,reply,dispatch}) {
  const receipt=reply?.receipt;
  if(!request||!receipt||!reply.output||typeof reply.output!=='object'||reply.providerFailure
    ||receipt.paidProviderCall!==true||receipt.providerSchemaValid!==true
    ||!dispatch?.requestId||!['response_received','completed'].includes(dispatch.status)
    ||dispatch.costStatus!=='known'||!dispatch.providerReceiptHash
    ||receipt.providerReceiptHash!==dispatch.providerReceiptHash
    ||receipt.dispatchRequestId!=null&&receipt.dispatchRequestId!==dispatch.requestId
    ||!['sessionId','roundKind','roundIndex','contextHash'].every(key=>request[key]!=null
      &&request[key]===receipt[key]&&request[key]===dispatch[key])
    ||!isDeepStrictEqual(receipt.outputContractRef,request.responseFormat?.outputContractRef)
    ||!isDeepStrictEqual(receipt.outputContractRef,dispatch.outputContractRef)
    ||!isDeepStrictEqual(receipt.usage,dispatch.usage))return false;
  const {receiptHash,...body}=receipt;
  return receipt.outputHash===hashStarcraftTmgContract(reply.output)
    &&receiptHash===hashStarcraftTmgContract(body);
}
