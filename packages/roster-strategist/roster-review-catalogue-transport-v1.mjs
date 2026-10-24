// Lossless presentation, not evidence selection. The authoritative flat
// catalogue stays unchanged; local short handles avoid asking an LLM to copy
// thousands of opaque hashes and repeated full paths. Never bind by similarity.
export const ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1 = 'hierarchical_catalogue_v1';
export const ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2 = 'hierarchical_catalogue_v2';
export const ROSTER_REVIEW_CATALOGUE_CONTRACT_VERSION = '4.4.0';

// Recovery feedback is not normalization: keep the rejected check rejected.
// In v2 only, eN/nN identify the SAME source. Explain a known text-only
// reference with its exact original value instead of returning null and asking
// the model to rediscover it in the complete catalogue on every retry.
export function projectRosterReviewBindingIssuesV1({ issues, transport }) {
  if (transport.node.catalogueEncoding !== ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2) return issues;
  const aliases = new Map(transport.entries.map(entry => [entry.alias, entry]));
  return issues.map(issue => {
    if (issue.code !== 'FACT_PREMISE_NOT_BOUND' || !/^n\d+$/u.test(issue.factId || '')
      || aliases.has(issue.factId)) return issue;
    const source = aliases.get(issue.factId.replace(/^n/u, 'e'));
    if (source?.kind !== 'text') return issue;
    return { ...issue, referenceRecovery: {
      status: 'not_applied', reason: 'same_catalogue_source_is_text_only',
      availableTextSource: { evidenceId: source.alias,
        sourcePath: source.original.sourcePath, text: source.original.text },
      numericAuthority: false, semanticJudgmentChanged: false,
      instruction: 'This exact source exists as text evidence, NOT as a numeric fact. '
        + 'To interpret its Rules prose, cite availableTextSource.evidenceId in sourceEvidence '
        + 'and omit this invalid numeric check (factChecks may be empty). '
        + 'If an actual arithmetic comparison is required, select an existing numeric fact '
        + 'with the correct scope instead; do not invent a numeric alias or extract a number '
        + 'from prose as Rules authority. Reassess the literal claim against the exact text; '
        + 'this feedback does not decide supported/contradicted or alter the Plan.',
    } };
  });
}

export function isUndispatchedCurrentRosterReviewV1(session) {
  const recovery=session?.reviewReconciliation, checkpoint=recovery?.recoveryCheckpoint;
  const review=session?.planReview;
  return session?.status==='planned' && recovery?.status==='failed'
    && review?.status==='completed' && checkpoint?.status==='interrupted'
    && Boolean(checkpoint.contextHash) && checkpoint.planHash===review.planHash
    && checkpoint.sourceReviewHash===review.review?.reviewHash
    && recovery.sourceReviewHash===review.review?.reviewHash
    && (checkpoint.attempts||[]).some(a=>a.contextHash===checkpoint.contextHash && a.status==='dispatching')
    // This ledger is persisted before any physical send. Absence is checked
    // against the CURRENT request, never the latest request of another round.
    && !(session.providerDispatches||[]).some(d=>d.contextHash===checkpoint.contextHash
      || ['reserved','sending','sent','ambiguous'].includes(d.status)
        && !(session.publicOutputs||[]).some(o=>o.contextHash===d.contextHash))
    && !(session.publicOutputs||[]).some(o=>o.contextHash===checkpoint.contextHash);
}

// A completed HTTP capacity rejection is not an in-flight/unknown dispatch.
// Permit a NEW, bounded request only after this format upgrade. Never resend
// the rejected body, erase its unknown fee, reset attempt counts or reuse it
// as evidence. A rejection of the current format needs a new investigation.
export function canReencodeRejectedRosterReviewV1(session) {
  const failed = session?.providerDispatches?.at(-1);
  const recovery = session?.reviewReconciliation, checkpoint = recovery?.recoveryCheckpoint;
  const review = session?.planReview;
  if (session?.status !== 'planned' || review?.status !== 'completed'
    || recovery?.status !== 'failed' || recovery.failure?.code !== 'ROSTER_WORKSPACE_PROVIDER_RESPONSE_REJECTED'
    || failed?.status !== 'response_rejected' || failed.rejection?.httpStatus !== 400
    || failed.rejection?.contextLengthExceeded !== true
    || failed.roundKind !== 'final_review_reconciliation' || failed.sessionId !== session.sessionId
    || failed.outputContractRef?.id !== 'ticket27.roster_review_reconciliation.v1'
    || failed.outputContractRef?.version !== '4.1.0'
    || checkpoint?.status !== 'interrupted' || checkpoint.contextHash !== failed.contextHash
    || checkpoint.planHash !== failed.planHash || review.planHash !== failed.planHash
    || checkpoint.sourceReviewHash !== review.review?.reviewHash
    || recovery.sourceReviewHash !== review.review?.reviewHash
    || !(checkpoint.attempts || []).some(a => a.contextHash === failed.contextHash)
    || (session.publicOutputs || []).some(o => o.contextHash === failed.contextHash)
    || (session.providerDispatches || []).some(d => ['reserved','sending','sent','ambiguous'].includes(d.status)
      && !(session.publicOutputs || []).some(o => o.contextHash === d.contextHash))) return false;
  return true;
}

export function compileRosterReviewCatalogueV1(catalogue, {version=ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2}={}) {
  if (![ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1, ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2].includes(version)) {
    throw Error('ROSTER_REVIEW_CATALOGUE_VERSION_UNSUPPORTED');
  }
  const { numbers, texts, ...metadata } = catalogue;
  const tree = Object.create(null), entries = [], aliases = new Map();
  const textIndexes = new Map(texts.map((row,index)=>[row.sourcePath,index]));
  const key = value => value.replaceAll('$', '$$');
  const leaf = path => {
    let node = tree;
    for (const part of path.split('.')) node = node[key(part)] ||= Object.create(null);
    return node.$facts ||= {};
  };
  texts.forEach((row, index) => {
    const alias = `e${index}`;
    const { evidenceId, sourcePath, text, ...extra } = row;
    (leaf(sourcePath).texts ||= []).push([alias, text, extra]);
    const entry = { alias, kind:'text', original:structuredClone(row) };
    entries.push(entry); aliases.set(alias, entry);
  });
  numbers.forEach((row, index) => {
    const serial = version===ROSTER_REVIEW_CATALOGUE_TRANSPORT_V1 ? index : textIndexes.get(row.factId);
    if (serial===undefined) throw Error('ROSTER_REVIEW_NUMERIC_SOURCE_TEXT_MISSING');
    const alias = `n${serial}`;
    if (aliases.has(alias)) throw Error('ROSTER_REVIEW_DUPLICATE_NUMERIC_SOURCE');
    const { factId, value, ...extra } = row;
    (leaf(factId).numbers ||= []).push([alias, value, extra]);
    const entry = { alias, kind:'number', index, original:structuredClone(row) };
    entries.push(entry); aliases.set(alias, entry);
  });
  const node = { ...metadata, catalogueEncoding:version,
    instructions:'All original facts are present in sourceTree. Nested keys joined with dots are the original source path (a doubled $ in a key represents a literal $). At each $facts leaf, texts rows are [evidenceId, exact source text, extra metadata]; numbers rows are [factId, exact number, extra metadata]. Use the supplied e-prefixed evidenceId in sourceEvidence and n-prefixed factId in factChecks/calculation.factIds. These handles are local to this exact catalogue, not quantities or rule authority. Ancestor/sibling fields retain actor, receipt, scene and assumption scope; do not merge different paths or infer scope from equal values. The host resolves each handle to its exact original record. Claim catalogue IDs are unchanged.',
    sourceTree:tree,
    ...(version===ROSTER_REVIEW_CATALOGUE_TRANSPORT_V2 ? {typedHandleIdentity:
      'eN and nN share one source path/value: eN is its exact text evidence, nN exists only when that SAME source has numerical authority. Never invent nN for a text-only field. Use sourceEvidence for rule text, including printed numbers stored as text. A numeric check claimedValue is the amount in claimValueQuote, NOT the correct value from the source.'} : {}) };
  function decodeOutput(wire) {
    const output = structuredClone(wire);
    const numberId = id => {
      const row = aliases.get(id);
      return row?.kind === 'number' ? row.original.factId
        : row?.kind === 'text' ? row.original.evidenceId : id;
    };
    for (const judgment of output?.judgments || []) {
      for (const evidence of judgment.sourceEvidence || []) {
        const row = aliases.get(evidence.evidenceId);
        if (row?.kind === 'text') evidence.evidenceId = row.original.evidenceId;
      }
      for (const check of judgment.factChecks || []) {
        check.factId = numberId(check.factId);
        if (Array.isArray(check.calculation?.factIds)) check.calculation.factIds = check.calculation.factIds.map(numberId);
      }
    }
    return output;
  }
  // Independent reconstruction used by the concrete capacity regression.
  // IDs resolve through the exact map, while paths and values come from the
  // transmitted tree, so dropping or moving a leaf cannot pass this check.
  function restore() {
    const restoredTexts = [], restoredNumbers = [];
    const walk = (value, parts) => {
      for (const [alias, text, extra] of value.$facts?.texts || []) {
        restoredTexts.push([Number(alias.slice(1)), {evidenceId:aliases.get(alias).original.evidenceId,
          sourcePath:parts.join('.'), text, ...extra}]);
      }
      for (const [alias, number, extra] of value.$facts?.numbers || []) {
        restoredNumbers.push([aliases.get(alias).index, {factId:parts.join('.'), value:number, ...extra}]);
      }
      for (const [childKey, child] of Object.entries(value)) if (childKey !== '$facts') {
        walk(child, [...parts,childKey.replaceAll('$$','$')]);
      }
    };
    walk(node.sourceTree, []);
    return {...metadata, numbers:restoredNumbers.sort((a,b)=>a[0]-b[0]).map(r=>r[1]),
      texts:restoredTexts.sort((a,b)=>a[0]-b[0]).map(r=>r[1])};
  }
  return { node, entries, decodeOutput, restore };
}
