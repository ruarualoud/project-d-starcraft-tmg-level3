// A revision consumes current Teach knowledge, not its complete execution log.
// Keep public reasoning verbatim, index large tool bodies, and expose the SAME
// retained-evidence reader used by Teach. No new simulation or Rules authority.
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { readRosterTeachRetainedEvidenceV1,
  deriveRosterTeachSavedEvidenceBindingV1 }
  from './roster-teach-framework-v1.mjs';

export const ROSTER_REVISION_TEACH_EVIDENCE_VERSION = 'current_teach_with_retained_reads_v4';

export function createRosterRevisionTeachEvidenceV1(state, sourceEvidence = [], sourceBinding = null) {
  const binding = deriveRosterTeachSavedEvidenceBindingV1(state, sourceEvidence);
  const archive = new Map();
  const rootRef = hash(state);
  archive.set(rootRef, state);
  const reference = (value, path = '') => {
    const receiptHash = hash(value);
    archive.set(receiptHash, value);
    return { evidenceObjectHash: receiptHash, fullBodyAvailable: true,
      retrieval: { kind: 'retained_evidence', toolRequestJson: JSON.stringify({ receiptHash, path }) },
      fields: Object.keys(value), contextOnlyNotStrategyProof: true };
  };
  const recoveries = (state.queryRecovery?.operations || []).filter(op => op.result);
  const rawEvidence = [...(state.evidence || []), ...(state.investigation?.evidence || []),
    ...recoveries.map(op => op.result), ...(state.retainedHistoricalEvidence || [])];
  // Unlike a one-shot synthesis, revision already has a retained-evidence
  // dialogue. Keep its complete current question/strategy/typed bindings below,
  // but index all historical bodies rather than replay their nested repair and
  // inspection payloads on every turn. No receipt is filtered by success or
  // by agreement with the current strategy. Every index reads the exact raw body.
  const metadataKeys = ['schema', 'schemaVersion', 'receiptHash', 'queryReceiptHash',
    'challengeId', 'queryId', 'questionId', 'requestKind', 'queryKind', 'status',
    'resultStatus', 'evidenceReadiness', 'originalQueryNotAnswered',
    'contextOnlyNotStrategyProof', 'canAffectRules', 'trainingTruth', 'queryRecoveryOf'];
  const evidence = rawEvidence.map(receipt => {
    const statusIndex = [];
    const visit = (node, path = '') => {
      if (!node || typeof node !== 'object') return;
      if (path && (node.status !== undefined || node.resultStatus !== undefined)) {
        statusIndex.push({ path, status: node.status, resultStatus: node.resultStatus,
          receiptHash: node.receiptHash || node.queryReceiptHash,
          unknownReasonCode: node.unknownReasonCode ?? node.unknownReason });
      }
      for (const [key, child] of Object.entries(node)) visit(child, path ? path + '.' + key : key);
    };
    visit(receipt);
    return { ...reference(receipt),
      ...Object.fromEntries(metadataKeys.filter(key => Object.hasOwn(receipt, key)).map(key => [key, structuredClone(receipt[key])])),
      unknownReasonCode: receipt.unknownReasonCode ?? receipt.unknownReason,
      statusIndex, evidenceBodyIndexed: true,
    };
  });
  const experience = {
    version: ROSTER_REVISION_TEACH_EVIDENCE_VERSION,
    sourceHash: state.sourceHash,
    sourcePlanBinding: structuredClone(sourceBinding),
    framework: structuredClone(state.framework),
    agenda: structuredClone(state.agenda),
    synthesis: structuredClone(binding.synthesis),
    coverage: structuredClone(binding.coverage),
    applicationStatus: state.applicationStatus,
    evidenceBindingVersion: binding.evidenceBindingVersion,
    ...(binding.refreshed ? { evidenceBindingRefresh: structuredClone(binding.derivation) } : {}),
    authority: structuredClone(state.authority),
    retainedHistoricalEvidenceSources: structuredClone(state.retainedHistoricalEvidenceSources || []),
    evidence,
    evidenceDelivery: { mode: 'retained_index_v1', originalReceiptCount: rawEvidence.length,
      allStatusesPreserved: true, currentSynthesisVerbatim: true,
      instruction: 'Each evidence entry indexes its unchanged original body. Use its retrieval request and exact child paths for details. Current typed bindings remain inline with their conditions and public interpretations; interpretations are not certified facts. Both original and delivered-projection citation paths are readable from the same receipt. Read evidence needed to challenge a conclusion; an indexed body is not missing or negative evidence.' },
    queryOperations: structuredClone(state.investigation?.operations || []),
    queryRecoveryOperations: recoveries.map(op => ({ originalQueryId: op.originalQueryId,
      queryId: op.queryId, questionId: op.questionId, status: op.status,
      completed: op.completed, request: structuredClone(op.request),
      resultReceiptHash: op.result.receiptHash, priorFailuresRetainedInArchive: true })),
    residualInvestigationLimits: structuredClone(state.investigation?.rounds?.at(-1)?.output?.unresolved || []),
    archiveReference: { receiptHash: rootRef, path: '',
      fields: Object.keys(state), fullBodyAvailable: true,
      instruction: 'Read any original field by receiptHash and dot path. Past synthesis/repair attempts are history, not current conclusions.' },
  };
  const lookupResults = [];
  return {
    experience,
    read(request) {
      const old = lookupResults.find(row => row.request.receiptHash === request.receiptHash
        && row.request.path === request.path);
      if (old) return structuredClone(old);
      let row;
      try {
        row = { request: structuredClone(request), status: 'read',
          result: readRosterTeachRetainedEvidenceV1([...rawEvidence, ...sourceEvidence], request, archive) };
      } catch (error) {
        const code = String(error.code || error.message).split(':')[0];
        if (!/^ROSTER_TEACH_(RETAINED_EVIDENCE|EVIDENCE_PATH)_/u.test(code)) throw error;
        row = { request: structuredClone(request), status: 'unknown', code,
          originalQueryNotAnswered: true,
          ...(error.queryRepair ? { queryRepair: structuredClone(error.queryRepair) } : {}),
          instruction: 'Use an actually delivered reference/path, or keep the claim conditional. Missing evidence is not false or zero.' };
      }
      lookupResults.push(row);
      return structuredClone(row);
    },
    receipt() {
      return { version: ROSTER_REVISION_TEACH_EVIDENCE_VERSION, archiveReference: rootRef,
        sourcePlanBinding: structuredClone(sourceBinding),
        recoveryResultReceiptHashes: recoveries.map(op => op.result.receiptHash),
        sourceBytes: Buffer.byteLength(JSON.stringify(state)),
        projectedBytes: Buffer.byteLength(JSON.stringify(experience)),
        currentSynthesisPreserved: !binding.refreshed, rawSynthesisPreserved: true,
        ...(binding.refreshed ? { evidenceBindingRefresh: structuredClone(binding.derivation) } : {}),
        currentAgendaPreserved: true, evidenceDeliveryMode: 'retained_index_v1',
        originalReceiptCount: rawEvidence.length,
        lookupResults: structuredClone(lookupResults),
        semanticApplicationStillRequiresReview: true, trainingTruth: false };
    },
  };
}
