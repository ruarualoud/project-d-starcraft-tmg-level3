// Recompute only calculations from an unavailable laboratory root. Their old
// receipts stay immutable in the journal; they never become current by relabeling.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

function nativeRoot(receipt) {
  return receipt?.sourceReceipt?.sourceStateHash
    || receipt?.queryContext?.sourceStateHash
    || receipt?.branchQueryContext?.sourceStateHash || null;
}

function rows(state) {
  return [
    ...(state.agenda?.questions || []).map(question => ({ lane: 'initial',
      queryId: question.questionId, questionId: question.questionId,
      request: question.evidenceRequest,
      receipt: state.evidence?.find(row => row.challengeId === question.questionId) })),
    ...(state.investigation?.operations || []).map(operation => ({ lane: 'investigation',
      queryId: operation.queryId, questionId: operation.questionId, request: operation.request,
      receipt: state.investigation.evidence?.find(row => row.challengeId === operation.queryId) })),
    ...(state.queryRecovery?.operations || []).map(operation => ({ lane: 'recovery',
      queryId: operation.queryId, questionId: operation.questionId,
      request: operation.request, receipt: operation.result })),
  ].filter(row => row.request && row.receipt);
}

function replaceResult(state, item, result) {
  const list = item.lane === 'initial' ? state.evidence
    : item.lane === 'investigation' ? state.investigation.evidence : null;
  if (list) list[list.findIndex(row => row.challengeId === item.queryId)] = result;
  for (const operation of state.queryRecovery?.operations || []) {
    let changed = false;
    for (const field of ['currentFailure', 'result']) {
      if (operation[field]?.receiptHash !== item.originalReceipt.receiptHash) continue;
      operation[field] = structuredClone(result);
      changed = true;
    }
    if (!changed) continue;
    if (operation.pendingChoice) {
      operation.sourceInvalidatedChoices ||= [];
      operation.sourceInvalidatedChoices.push({ choice: operation.choice,
        originalReceiptHash: item.originalReceipt.receiptHash,
        reason: 'paid_choice_was_bound_to_unavailable_source' });
      operation.pendingChoice = false;
    }
    // Keep attempts/choices/fees. Reconciliation is not another model allowance.
    operation.currentFailure = structuredClone(result);
    operation.completed = result.status !== 'unknown' || result.queryRepair?.correctable !== true;
    operation.status = operation.completed ? 'source_reconciled' : 'source_reconciled_needs_query_repair';
  }
}

export async function reconcileRosterTeachSourceEvidenceV1({ state, sourceStateHash,
  evidencePort, initialFoundationHash, sourceHash, checkpoint }) {
  const currentRows = rows(state);
  const previousRoots = new Set(currentRows.map(row => nativeRoot(row.receipt))
    .filter(root => root && root !== sourceStateHash));
  let journal = state.sourceReconciliations?.findLast(row => row.status === 'pending'
    && row.currentSourceStateHash === sourceStateHash);
  if (!journal && !previousRoots.size) return false;
  if (!journal) {
    // A source-less failure from the same port is also scoped to that old root.
    // Do not guess identity from unit names, Plan prose or a similar board.
    const stalePorts = new Set(currentRows.filter(row => previousRoots.has(nativeRoot(row.receipt)))
      .map(row => row.receipt.evidencePortDescriptorHash).filter(Boolean));
    const affected = currentRows.filter(row => previousRoots.has(nativeRoot(row.receipt))
      || stalePorts.has(row.receipt.evidencePortDescriptorHash));
    journal = { version: 1, status: 'pending', currentSourceStateHash: sourceStateHash,
      previousSourceStateHashes: [...previousRoots],
      reason: 'unavailable_old_root_requires_new_calculation_not_hash_rebinding',
      oldRootsProvenEquivalent: false, originalReceiptsPreserved: true,
      modelCallsReset: false, correctionAllowanceReset: false,
      items: affected.map(row => ({ lane: row.lane, queryId: row.queryId,
        questionId: row.questionId, request: structuredClone(row.request),
        originalReceipt: structuredClone(row.receipt), status: 'pending' })) };
    (state.sourceReconciliations ||= []).push(journal);
    if (state.synthesis || state.synthesisReader) {
      (state.sourceInvalidatedSyntheses ||= []).push({ synthesis: state.synthesis,
        raw: state.synthesisRaw, reader: state.synthesisReader,
        reason: journal.reason, currentSourceStateHash: sourceStateHash });
      delete state.synthesis; delete state.synthesisRaw; delete state.synthesisReader;
      delete state.synthesisReview;
    }
    await checkpoint();
  }
  for (const item of journal.items) {
    if (item.status === 'completed') continue;
    let result;
    const spec = item.request.toolRequest?.spec;
    // Never replay actions, random outcomes or unnamed lifecycle steps while
    // repairing metadata. Those need a newly chosen, explicit investigation.
    const unsafeReplay = item.request.kind === 'scenario'
      && (spec?.kind === 'native_action' || item.originalReceipt.sourceReceipt?.branchKind === 'native_action'
        || Number(spec?.lifecycleSteps || 0) !== 0);
    if (unsafeReplay || ['inspect', 'retained_evidence'].includes(item.request.kind)) {
      const body = { challengeId: item.queryId, questionId: item.questionId,
        status: 'unknown', unknownReasonCode: 'ROSTER_TEACH_SOURCE_REINVESTIGATION_REQUIRED',
        queryNotExecuted: true, originalQueryNotAnswered: true, recoveryOwner: 'investigation',
        previousReceiptHash: item.originalReceipt.receiptHash,
        correctionInstruction: 'The saved execution belongs to an unavailable source. Its original record is preserved but is not current evidence. Explicitly choose a new investigation using the pinned source; no action or random outcome was replayed.',
        canAffectRules: false, trainingTruth: false };
      result = { ...body, receiptHash: hash(body) };
    } else {
      result = { ...await evidencePort.query({ mutationAuthority: false,
        initialFoundationHash, sourceHashes: [sourceHash], challengeId: item.queryId,
        request: item.request }), questionId: item.questionId };
      if (item.request.kind === 'scenario' && result.sourceReceipt?.branchStateHash) {
        result.branchQueryContext = evidencePort.describeQueryContext(item.queryId);
      }
    }
    replaceResult(state, item, result);
    item.currentReceiptHash = result.receiptHash || null;
    item.currentStatus = result.status;
    item.status = 'completed';
    await checkpoint();
  }
  journal.status = 'completed';
  await checkpoint();
  return true;
}
