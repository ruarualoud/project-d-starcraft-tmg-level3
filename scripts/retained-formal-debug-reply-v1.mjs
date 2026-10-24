import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';

// This observer guard permits re-entering the product's existing retained-reply
// path. It never supplies a replacement output or authorizes a repeated send.
export function verifyRetainedFormalDebugReplyV1({request,reply,session,expectedSessionId,expectedReceiptHash}) {
  const shard = request?.roundKind === 'final_plan_review'
    ? request.promptNodes?.find(node => node.kind === 'review-boundary') : null;
  const shardedSessionId = Number.isSafeInteger(shard?.shardIndex)
    && Number.isSafeInteger(shard?.shardCount) && shard.shardIndex > 0
    && shard.shardIndex <= shard.shardCount
    ? `${expectedSessionId}-shard-${shard.shardIndex}-of-${shard.shardCount}` : null;
  if (!expectedSessionId || (request?.sessionId !== expectedSessionId
      && (!shardedSessionId || request?.sessionId !== shardedSessionId))
    || session?.sessionId !== expectedSessionId
    || request.roundKind === 'iterative_roster_decision'
    || reply?.receipt?.paidProviderCall !== true
    || reply.receipt.receiptHash !== expectedReceiptHash
    || reply.receipt.contextHash !== request.contextHash
    || reply.receipt.outputHash !== hash(reply.output)) return false;
  return (session.publicOutputs || []).some(row => row.roundKind === request.roundKind
    && row.roundIndex === request.roundIndex && row.contextHash === request.contextHash
    && row.outputHash === reply.receipt.outputHash
    && hash(row.sanitizedOutput) === row.outputHash
    && row.outputContractRef?.hash === reply.receipt.outputContractRef?.hash);
}
