import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

// One original/reference classifier for binding AND historical navigation.
// Port rejections need not have a schema, but derived views are never originals.
export function visitRosterTeachOriginalReceiptsV1(value, visit, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (value.navigationOnly === true
    || (typeof value.receiptRef === 'string' && typeof value.path === 'string')
    || (typeof value.reference === 'string' && typeof value.receiptHash === 'string'
      && Object.keys(value).every(key => ['reference', 'receiptHash'].includes(key)))) return;
  if ([value.receiptHash, value.queryReceiptHash].some(ref => /^[a-f0-9]{64}$/u.test(String(ref || '')))) visit(value);
  for (const [key, child] of Object.entries(value)) {
    if (!['citationBindings', 'quantitativeEvidence', 'qualitativeEvidence', 'evidenceScopes'].includes(key)) {
      visitRosterTeachOriginalReceiptsV1(child, visit, seen);
    }
  }
}

function compatibleHistory(current, previous) {
  if (previous.status !== 'completed' || !current.context || !previous.context) return false;
  if (current.candidateHash && current.context.frozenContext && current.context.mission) {
    return previous.candidateHash === current.candidateHash
      && previous.context.frozenContext && previous.context.mission
      && hash(previous.context.frozenContext) === hash(current.context.frozenContext)
      && hash(previous.context.mission) === hash(current.context.mission);
  }
  const a = current.context, b = previous.context;
  if (!a.selectedCandidateInputHash || a.selectedCandidateInputHash !== b.selectedCandidateInputHash) return false;
  return ['sourceLockHash', 'sourceSnapshotHash', 'normalizedDatasetHash', 'mapTopologyHash',
    'missionRecordKey', 'deploymentRecordKey', 'laboratorySourceStateHash'].every(key =>
    a.fixture?.[key] && a.fixture[key] === b.fixture?.[key]);
}

export function createRosterTeachHistoryEvidenceV1(current, history = []) {
  const originals = new Map(), entries = new Map();
  for (const previous of history) {
    if (!compatibleHistory(current, previous)) continue;
    const state = previous.state;
    // No synthesis, coverage, ledger or agenda is imported. Native child
    // receipts remain at their original IDs and retain their original scenes.
    const roots = [state?.evidence, state?.investigation?.evidence,
      state?.queryRecovery?.operations?.map(op => op.result), state?.retainedHistoricalEvidence];
    visitRosterTeachOriginalReceiptsV1(roots, receipt => {
      if (!/^[a-f0-9]{64}$/u.test(String(receipt.receiptHash || ''))) return;
      originals.set(receipt.receiptHash, receipt);
      entries.set(receipt.receiptHash, {
        receiptHash: receipt.receiptHash,
        ...Object.fromEntries(['challengeId', 'questionId', 'queryId', 'status', 'resultStatus', 'requestKind', 'queryKind']
          .filter(key => ['string', 'number', 'boolean'].includes(typeof receipt[key])).map(key => [key, receipt[key]])),
        sourceSnapshotId: previous.snapshotId || null,
        sourceTeachPlanHash: previous.planHash || previous.sourcePlanHash || null,
        original: { documentId: `evidence:${receipt.receiptHash}`, path: '' },
        originalBodyUnchanged: true, historicalConclusionNotImported: true,
      });
    });
  }
  return { originals, entries: [...entries.values()] };
}

// The selecting Agent uses the same source-scoped originals as Teach. A
// completed inquiry must not erase the older receipts the next decision reads.
export function createIterativeRosterTeachHistoryEvidenceV1(state) {
  const candidateHash = state.currentCandidate?.candidateHash;
  const snapshots = state.draftTeachSnapshots || [];
  const current = snapshots.findLast(row => row.candidateHash === candidateHash
    && row.context?.frozenContext && hash(row.context.frozenContext) === hash(state.frozenContext));
  const historical = current ? createRosterTeachHistoryEvidenceV1(current, snapshots)
    : { originals: new Map(), entries: [] };
  const roots = [...historical.originals.values()];
  for (const feedback of [state.teachFeedback, state.draftTeachFeedback]) {
    if (feedback?.candidateHash === candidateHash) roots.push(feedback.evidence, feedback.retainedHistoricalEvidence);
  }
  visitRosterTeachOriginalReceiptsV1(roots, receipt => {
    for (const reference of [receipt.receiptHash, receipt.queryReceiptHash]) {
      if (/^[a-f0-9]{64}$/u.test(String(reference || ''))) historical.originals.set(reference, receipt);
    }
  });
  return historical;
}

// Only a former missing-body read becomes newly useful. An old Native
// unknown stays unknown, and ordinary already-returned queries stay cached.
export function isRestoredIterativeRosterTeachReadV1(state, query) {
  if (query.kind !== 'teach_evidence') return false;
  const queryHash = hash(query);
  const previous = (state.observations || []).findLast(row => hash(row.query) === queryHash);
  if (previous?.receipt?.status !== 'unknown'
    || previous.receipt.reason !== 'ROSTER_TEACH_RETAINED_EVIDENCE_UNKNOWN') return false;
  let request;
  try { request = JSON.parse(query.argumentsJson); } catch { return false; }
  return createIterativeRosterTeachHistoryEvidenceV1(state).originals.has(request.receiptHash);
}

// Carry only originals actually cited by the completed synthesis into the
// existing Plan/review/experience handoff. This is availability, not promotion.
export function retainRosterTeachCitedHistoryV1(state, historicalEvidence, synthesis) {
  if (!historicalEvidence?.originals.size) return;
  const cited = new Set(JSON.stringify(synthesis).match(/\b[a-f0-9]{64}\b/gu) || []);
  const retained = new Map((state.retainedHistoricalEvidence || []).map(row => [row.receiptHash, row]));
  const sources = new Map((state.retainedHistoricalEvidenceSources || []).map(row => [row.receiptHash, row]));
  for (const entry of historicalEvidence.entries) {
    if (!cited.has(entry.receiptHash)) continue;
    retained.set(entry.receiptHash, historicalEvidence.originals.get(entry.receiptHash));
    sources.set(entry.receiptHash, entry);
  }
  if (retained.size) {
    state.retainedHistoricalEvidence = [...retained.values()];
    state.retainedHistoricalEvidenceSources = [...sources.values()];
  }
}

// Read-only Plan consumer view. Starting a new Teach does not erase evidence
// still cited by the Plan. Never import an old synthesis, agenda or coverage.
export function withRosterTeachPlanHistoryV1(plan, state, history = []) {
  if (!state || !plan) return state;
  const cited = new Set(JSON.stringify(plan).match(/\b[a-f0-9]{64}\b/gu) || []);
  const receipts = value => [
    ...(value?.evidence || []), ...(value?.investigation?.evidence || []),
    ...(value?.queryRecovery?.operations || []).map(op => op.result).filter(Boolean),
    ...(value?.retainedHistoricalEvidence || []),
  ];
  const present = new Set(receipts(state).map(value => value.receiptHash).filter(Boolean));
  const retained = [...(state.retainedHistoricalEvidence || [])];
  const provenance = [...(state.retainedHistoricalEvidenceSources || [])];
  for (const previous of history) {
    for (const receipt of receipts(previous.state)) {
      if (!receipt?.receiptHash || !cited.has(receipt.receiptHash) || present.has(receipt.receiptHash)) continue;
      present.add(receipt.receiptHash);
      retained.push(receipt);
      provenance.push({ receiptHash: receipt.receiptHash, sourceTeachPlanHash: previous.planHash,
        originalBodyUnchanged: true, historicalConclusionNotImported: true });
    }
  }
  if (retained.length === (state.retainedHistoricalEvidence || []).length) return state;
  // Consumers still verify receipt body, Native children and frozen source.
  // Availability is not authority; all current synthesis/coverage stays intact.
  return { ...state, retainedHistoricalEvidence: retained,
    retainedHistoricalEvidenceSources: provenance };
}
