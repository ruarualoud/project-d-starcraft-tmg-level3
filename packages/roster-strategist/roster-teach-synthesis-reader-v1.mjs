import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import {collectRosterTeachSourceFactsV1} from './roster-teach-source-facts-v1.mjs';
import {parseRosterTeachEvidencePathV1} from './roster-teach-typed-evidence-v1.mjs';

// A transport window, NOT a limit on strategy, evidence, reads or task duration.
// Every value remains addressable; large values are paginated without summaries.
const PAGE_BYTES = 32 * 1024;
const INLINE_BYTES = 192 * 1024;
const clone = value => structuredClone(value);
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const escape = key => String(key).replaceAll('~', '~0').replaceAll('/', '~1');
const type = value => Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
const fail = (code, detail = '') => { throw Object.assign(Error(`${code}:${detail}`), { code }); };

export function planRosterTeachSynthesisDeliveryV1(nodes) {
  const size = bytes(nodes);
  return { kind: size > INLINE_BYTES ? 'evidence_reader' : 'inline', bytes: size,
    version: 'readonly_synthesis_reader_v1', thresholdIsTransportOnly: true };
}

export function createRosterTeachSynthesisArchiveV1(nodes, { retainedEvidence = new Map(), historicalEvidence } = {}) {
  const documents = [{ id: 'source', value: clone(nodes), sourcePath: '' }];
  const questions = [];
  // Lossless pagination used to show only array indices and byte lengths.
  // That made the initial failed receipt easier to find than its later results.
  // Expose exact metadata as a directory, never a strategic/evidence verdict.
  function locate(value, original) {
    const seen = new Set();
    const resultViews = {};
    while (value && typeof value === 'object' && !seen.has(value)) {
      seen.add(value);
      // Keep the existing shared result projections before following their raw
      // receipt address. Large raw roots are directories, not delivered results.
      for (const key of ['scopedGeometryEvidence', 'nativeActionEvidence',
        'spatialRelationshipEvidence', 'fireExchangeEvidence', 'computedOutcomes', 'scopedQueryResults']) {
        if (!Object.hasOwn(resultViews, key) && Array.isArray(value[key]) && value[key].length) {
          resultViews[key] = clone(value[key]);
        }
      }
      if (value.kind === 'same_prompt_evidence_reference_v1') {
        const path = value.targetJsonPointer;
        if (typeof path !== 'string' || (path !== '' && !path.startsWith('/'))) break;
        let target = nodes;
        for (const key of path === '' ? [] : path.slice(1).split('/')) {
          target = target?.[key.replaceAll('~1', '/').replaceAll('~0', '~')];
        }
        if (!target || seen.has(target)) break;
        value = target; original = { documentId: 'source', path };
      } else if (value.retrieval?.kind === 'retained_evidence') {
        let reference;
        try { reference = JSON.parse(value.retrieval.toolRequestJson).receiptHash; } catch { break; }
        if (!retainedEvidence.has(reference) || seen.has(retainedEvidence.get(reference))) break;
        value = retainedEvidence.get(reference);
        original = { documentId: `evidence:${reference}`, path: '' };
      } else break;
    }
    return { value, original, resultViews };
  }
  function evidenceDirectory(question, id) {
    const collection = locate(question.evidence, { documentId: id, path: '/evidence' });
    const resultReadTargets = [];
    const entries = (Array.isArray(collection.value) ? collection.value : []).map((row, index) => {
      const found = locate(row, { documentId: collection.original.documentId,
        path: `${collection.original.path}/${index}` });
      if (Object.keys(found.resultViews).length) {
        const resultId = `${id}-result-${index}`;
        documents.push({id:resultId, value:{receiptHash:found.value?.receiptHash,
          original:found.original, ...found.resultViews,
          authority:'existing_shared_result_projection_not_new_execution',
          interpretationVerified:false}});
        resultReadTargets.push({documentId:resultId,path:'',offset:0});
      }
      const metadata = Object.fromEntries(['receiptHash', 'challengeId', 'questionId', 'queryId',
        'queryRecoveryOf', 'status', 'resultStatus', 'requestKind', 'queryKind',
        'unknownReasonCode', 'contextOnlyNotStrategyProof'].filter(key =>
        ['string', 'boolean', 'number'].includes(typeof found.value?.[key]))
        .map(key => [key, found.value[key]]));
      return { index, ...metadata, original: found.original };
    });
    const statusCounts = {};
    for (const entry of entries) {
      const status = entry.status || entry.resultStatus || 'not_declared';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const documentId = `${id}-receipts`;
    documents.push({ id: documentId, value: { questionId: question.questionId,
      navigationOnly: true, infersPredicateCoverage: false, entries,
      instruction: 'Exact saved receipt metadata, in original order. Read the addressed originals for scenario, result and limitations. A later success does not automatically replace an earlier failed predicate; an earlier failure does not erase later results. These are navigation entries, not new receipts or strategic answers.' } });
    return { documentId, count: entries.length, statusCounts,
      resultReadTargets,
      originals: entries.map(entry => ({ ...entry.original, offset: 0 })) };
  }
  for (const [index, node] of nodes.entries()) {
    const sourcePath = `/${index}`;
    if (node.kind === 'current_plan_and_context') {
      documents.push({ id: 'plan', value: clone(node.plan), sourcePath: `${sourcePath}/plan` },
        { id: 'context', value: clone(node.context), sourcePath: `${sourcePath}/context` });
    } else if (node.kind === 'question_evidence_reconciliation') {
      for (const [i, question] of (node.questions || []).entries()) {
        const id = `question-${i + 1}`;
        documents.push({ id, value: clone(question), sourcePath: `${sourcePath}/questions/${i}` });
        const original = question.originalQuestion;
        questions.push({ questionId: question.questionId, documentId: id,
          evidenceDirectory: evidenceDirectory(question, id),
          originalQuestion: bytes(original || {}) <= 4096 ? clone(original) : {
            documentId: id, path: '/originalQuestion', instruction: 'Read the complete original question here.' } });
      }
      const { questions: ignored, ...rest } = node;
      documents.push({ id: 'unassigned-and-reconciliation', value: clone(rest), sourcePath });
    } else documents.push({ id: `node-${index}`, value: clone(node), sourcePath });
  }
  // The old prompt projection also contains out-of-prompt retained_evidence
  // links. Make their ACTUAL original bodies queryable, not just the projection.
  const originals = new Map(), missing = new Set();
  function retainLinks(value) {
    if (!value || typeof value !== 'object') return;
    if (value.retrieval?.kind === 'retained_evidence') {
      let reference;
      try { reference = JSON.parse(value.retrieval.toolRequestJson).receiptHash; } catch { /* Report via normal path navigation. */ }
      if (reference && !originals.has(reference) && !missing.has(reference)) {
        if (retainedEvidence.has(reference)) {
          const original = retainedEvidence.get(reference);
          originals.set(reference, original); retainLinks(original);
        } else missing.add(reference);
      }
    }
    for (const child of Object.values(value)) retainLinks(child);
  }
  retainLinks(nodes);
  const originalBindings = [...originals].map(([reference, value]) => [reference, hash(value)]).sort(([a], [b]) => a.localeCompare(b));
  // A derived readonly directory, not part of the paid source/archive identity.
  // Historical bodies stay in their own persisted snapshots, not copied into
  // every new prompt or promoted into current question/scene conclusions.
  const historicalOriginals = historicalEvidence?.originals || new Map();
  if (historicalOriginals.size) documents.push({ id: 'historical-receipts', value: {
    navigationOnly: true, infersPredicateCoverage: false,
    entries: historicalEvidence.entries,
    instruction: 'Original receipts from completed Teach snapshots with the same army, opponent/source, map and task scope. Read evidence:<receiptHash> for original fields and scene limits. This directory does not import old answers, prove the current Plan or replace current Rules. An old scene result is only evidence for that scene.' } });
  return { version: 'readonly_synthesis_reader_v1', archiveHash: hash({ nodes, originalBindings }), questions,
    retainedOriginals: originals, historicalOriginals, missingOriginalRefs: [...missing].filter(ref => !historicalOriginals.has(ref)).sort(),
    documents: documents.map(document => ({ ...document, bytes: bytes(document.value), valueHash: hash(document.value) })) };
}

export function createRosterTeachSynthesisReaderStateV1(archive) {
  return { version: archive.version, archiveHash: archive.archiveHash, status: 'reading',
    answers: [], proposedPlanChanges: [], proposedRosterChanges: [], frameworkFeedback: [],
    completedSteps: [], readManifest: [], latestPages: [], queuedReads: [], noProgressSteps: 0 };
}

export function reconcileRosterTeachSynthesisReaderV1(archive, state, { readOnlyContinuation = false } = {}) {
  if (state.synthesisReader && state.synthesisReader.archiveHash !== archive.archiveHash) {
    state.synthesisReaderHistory ||= [];
    state.synthesisReaderHistory.push(clone(state.synthesisReader));
    state.synthesisReader = null;
  }
  if (!state.synthesisReader) {
    state.synthesisReader = createRosterTeachSynthesisReaderStateV1(archive);
    // A genuinely new inquiry/review is a boundary, not a display refresh.
    if (!readOnlyContinuation) state.synthesisReader.historyBoundary = state.synthesisReaderHistory?.length || 0;
  }
  const current = state.synthesisReader, history = state.synthesisReaderHistory || [];
  if (!readOnlyContinuation) return current;
  const questionIds = new Set(archive.questions.map(q => q.questionId));
  if (current.answers.some(a => !questionIds.has(a.questionId))) return current;
  const keyFor = (reader, index) => `${index}:${reader.archiveHash}:${reader.completedSteps.length}`;
  const covered = new Set(current.continuedHistoryEntries || []);
  function coverAncestors(reader) {
    for (const key of reader.continuedHistoryEntries || []) covered.add(key);
    // v299 recorded exact archive+step-count pairs, but not history positions.
    // Resolve those already-merged segments before recovering older ones.
    for (const record of reader.readSourceContinuations || []) {
      const index = history.findLastIndex(row => row.archiveHash === record.previousArchiveHash
        && row.completedSteps.length === record.recoveredPaidSteps);
      if (index >= 0) covered.add(keyFor(history[index], index));
    }
  }
  coverAncestors(current);
  let boundary = current.historyBoundary || 0;
  const segments = [];
  for (let index = history.length - 1; index >= boundary; index--) {
    const previous = history[index], key = keyFor(previous, index);
    if (covered.has(key) || previous.status !== 'reading' || previous.version !== archive.version
      || previous.answers.some(a => !questionIds.has(a.questionId))) continue;
    segments.push(previous); covered.add(key); coverAncestors(previous);
    boundary = Math.max(boundary, previous.historyBoundary || 0);
  }
  if (!segments.length) return current;
  segments.reverse();

  // The caller already verified the frozen source/Plan and that every query is
  // completed with no reopened investigation. A delivery archive is a VIEW,
  // not the identity of this logical Teach. Keep old answers as drafts and
  // rebind them against the current originals in the caller before next use.
  const premiseAudit=state.questionPremiseAudit;
  const invalidated=new Set(premiseAudit?.status==='completed'?premiseAudit.changedQuestionIds:[]);
  const answers = new Map(segments.flatMap(previous => previous.answers
    .filter(a=>!invalidated.has(a.questionId)||history.indexOf(previous)>=premiseAudit.readerHistoryBoundary)
    .map(a => [a.questionId, a])));
  for (const answer of current.answers) answers.set(answer.questionId, answer);
  const currentHasAnswers = current.completedSteps.some(step => step.action === 'answer');
  const latestPrevious = segments.at(-1);
  const queues = new Map([...segments.flatMap(previous => previous.queuedReads), ...current.queuedReads]
    .map(request => [hash(request), request]));
  const previousContinuations = [...segments.flatMap(previous => previous.readSourceContinuations || []),
    ...(current.readSourceContinuations || [])];
  const continuations = new Map(previousContinuations.map(record => [hash(record), record]));
  state.synthesisReader = { ...current, status: 'reading',
    answers: clone([...answers.values()]),
    proposalBatches:clone([...new Map([...segments.flatMap(previous=>previous.proposalBatches||[]),...(current.proposalBatches||[])]
      .map(batch=>[batch.commandHash,batch])).values()]),
    ...(current.proposalConsolidation||latestPrevious.proposalConsolidation
      ? {proposalConsolidation:clone(current.proposalConsolidation||latestPrevious.proposalConsolidation)}:{}),
    ...Object.fromEntries(['proposedPlanChanges', 'proposedRosterChanges', 'frameworkFeedback']
      .map(key => [key, clone(currentHasAnswers ? current[key] : latestPrevious[key])])),
    completedSteps: clone([...segments.flatMap(previous => previous.completedSteps), ...current.completedSteps]),
    readManifest: clone([...segments.flatMap(previous => previous.readManifest), ...current.readManifest]),
    latestPages: clone(current.latestPages.length ? current.latestPages : latestPrevious.latestPages),
    queuedReads: clone([...queues.values()]),
    pendingEvidenceReassessmentQuestionIds: clone(current.pendingEvidenceReassessmentQuestionIds
      || latestPrevious.pendingEvidenceReassessmentQuestionIds || []),
    unreadEvidenceDrafts: clone([...new Map([...segments.flatMap(previous => previous.unreadEvidenceDrafts || []),
      ...(current.unreadEvidenceDrafts || [])].map(draft => [draft.commandHash, draft])).values()]),
    noProgressSteps: Math.max(...segments.map(previous => previous.noProgressSteps), current.noProgressSteps),
    historyBoundary: boundary,
    continuedArchiveHashes: [...new Set([...segments.flatMap(previous => [previous.archiveHash, ...(previous.continuedArchiveHashes || [])]),
      ...(current.continuedArchiveHashes || [])])],
    continuedHistoryEntries: [...covered],
    readSourceContinuations: [...continuations.values(), ...segments.map(previous => ({
      previousArchiveHash: previous.archiveHash, currentArchiveHash: archive.archiveHash,
      recoveredPaidSteps: previous.completedSteps.length, currentPaidSteps: current.completedSteps.length,
      reason: 'same_readonly_teach_delivery_refresh', answersRemainDrafts: true,
      currentCitationRebindingRequired: true, nativeQueriesRepeated: 0,
    }))],
  };
  delete state.synthesisReader.citationFeedback;
  if(invalidated.size&&history.indexOf(latestPrevious)<premiseAudit.readerHistoryBoundary){
    state.synthesisReader.premiseReconciliation={changedQuestionIds:[...invalidated],
      publicReason:premiseAudit.output.publicReason,corrections:clone(premiseAudit.output.corrections),
      previousProposals:Object.fromEntries(['proposedPlanChanges','proposedRosterChanges','frameworkFeedback'].map(k=>[k,clone(latestPrevious[k])])),
      proposalsRevisedByModel:false};
    for(const key of ['proposedPlanChanges','proposedRosterChanges','frameworkFeedback'])state.synthesisReader[key]=[];
  }
  return state.synthesisReader;
}

function documentFor(archive, request, state) {
  if(request.documentId==='pending-answer-draft'&&state?.unreadEvidenceDrafts)
    return {id:request.documentId,value:state.unreadEvidenceDrafts};
  if(request.documentId==='premise-reconciliation'&&state?.premiseReconciliation)
    return {id:request.documentId,value:state.premiseReconciliation};
  if (request.documentId.startsWith('evidence:')) {
    const reference = request.documentId.slice('evidence:'.length);
    if (archive.retainedOriginals.has(reference)) return { id: request.documentId, value: archive.retainedOriginals.get(reference) };
    if (archive.historicalOriginals?.has(reference)) return { id: request.documentId, value: archive.historicalOriginals.get(reference) };
  }
  if (request.documentId === 'answer-ledger' && state) return { id: 'answer-ledger', value: {
    answers: state.answers, proposedPlanChanges: state.proposedPlanChanges,
    proposedRosterChanges: state.proposedRosterChanges, frameworkFeedback: state.frameworkFeedback } };
  return archive.documents.find(document => document.id === request.documentId);
}

// Compression belongs to transport, not to the model's evidence semantics.
// Resolve exact handles while reading without changing source/archive identity.
function originalForRead(archive, input) {
  let value = input;
  const seen = new Set();
  while (value && typeof value === 'object') {
    if (seen.has(value)) return { error: { reason: 'reference_cycle', originalUnavailable: true } };
    seen.add(value);
    if (value.kind === 'same_prompt_evidence_reference_v1') {
      const pointer = value.targetJsonPointer;
      if (typeof pointer !== 'string' || (pointer !== '' && !pointer.startsWith('/'))) {
        return { error: { reason: 'reference_pointer_invalid', originalUnavailable: true } };
      }
      let found = archive.documents.find(d => d.id === 'source').value;
      for (const encoded of pointer === '' ? [] : pointer.slice(1).split('/')) {
        const key = encoded.replaceAll('~1', '/').replaceAll('~0', '~');
        if (!found || typeof found !== 'object' || !Object.hasOwn(found, key)) {
          return { error: { reason: 'reference_pointer_missing', targetJsonPointer: pointer, originalUnavailable: true } };
        }
        found = found[key];
      }
      value = found;
    } else if (value.retrieval?.kind === 'retained_evidence') {
      let reference;
      try { reference = JSON.parse(value.retrieval.toolRequestJson).receiptHash; } catch { /* Explicit unreadable reference below. */ }
      if (!reference || (!archive.retainedOriginals.has(reference) && !archive.historicalOriginals?.has(reference))) {
        return { error: { reason: 'retained_original_missing', reference, originalUnavailable: true } };
      }
      value = archive.retainedOriginals.get(reference) ?? archive.historicalOriginals.get(reference);
    } else break;
  }
  return { value };
}

const READ_WINDOW_FULL = Symbol('read-window-full');
function originalReadView(archive, input, limit = PAGE_BYTES) {
  let remaining = limit;
  const ancestors = new Set();
  function consume(count) { remaining -= count; if (remaining < 0) throw READ_WINDOW_FULL; }
  function expand(input) {
    const resolved = originalForRead(archive, input);
    if (resolved.error) {
      const value = { navigationOnly: true, kind: 'reference_error', ...resolved.error };
      consume(bytes(value)); return value;
    }
    const value = resolved.value;
    if (!value || typeof value !== 'object') { consume(value === undefined ? 4 : bytes(value)); return value; }
    if (ancestors.has(value)) {
      const error = { navigationOnly: true, kind: 'reference_error', reason: 'reference_cycle' };
      consume(bytes(error)); return error;
    }
    ancestors.add(value); consume(2);
    try {
      const entries = [];
      for (const [key, child] of Object.entries(value)) {
        if (!Array.isArray(value) && child === undefined) continue;
        consume(Array.isArray(value) ? 1 : bytes(key) + 2);
        entries.push([key, expand(Array.isArray(value) && child === undefined ? null : child)]);
      }
      return Array.isArray(value) ? entries.map(([, child]) => child) : Object.fromEntries(entries);
    } finally { ancestors.delete(value); }
  }
  try { return { fits: true, value: expand(input) }; }
  catch (error) { if (error !== READ_WINDOW_FULL) throw error; return { fits: false }; }
}

function children(archive, value, path) {
  return value && typeof value === 'object' ? Object.entries(value).filter(([, child]) => child !== undefined).map(([key, child]) => {
    const resolved = originalForRead(archive, child);
    if (resolved.error) return { key, path: `${path}/${escape(key)}`, nodeType: 'reference_error', ...resolved.error };
    const small = originalReadView(archive, child, 192);
    return { key, path: `${path}/${escape(key)}`, nodeType: type(resolved.value), bytes: bytes(resolved.value),
      ...(small.fits ? { value: small.value } : {}) };
  }) : [];
}

export function readRosterTeachSynthesisDocumentV1(archive, request, state = null) {
  const document = documentFor(archive, request, state);
  const base = { documentId: request.documentId, path: request.path, archiveHash: archive.archiveHash };
  if (!document) return { ...base, kind: 'document_error', availableDocuments: archive.documents.map(d => d.id), complete: false };
  let value = document.value, resolvedPath = '';
  const path = String(request.path || '');
  const keys = path === '' ? [] : path.startsWith('/') ? path.slice(1).split('/').map(key => key.replaceAll('~1', '/').replaceAll('~0', '~')) : null;
  if (!keys) return { ...base, kind: 'path_error', resolvedPath, availableChildren: children(archive, value, resolvedPath), complete: false };
  for (const key of keys) {
    const resolved = originalForRead(archive, value);
    if (resolved.error) return { ...base, kind: 'reference_error', resolvedPath, ...resolved.error, complete: false };
    value = resolved.value;
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) {
      return { ...base, kind: 'path_error', resolvedPath, availableChildren: children(archive, value, resolvedPath), complete: false };
    }
    value = value[key]; resolvedPath += `/${escape(key)}`;
  }
  const resolved = originalForRead(archive, value);
  if (resolved.error) return { ...base, kind: 'reference_error', resolvedPath, ...resolved.error, complete: false };
  value = resolved.value;
  const offset = Number.isSafeInteger(request.offset) && request.offset >= 0 ? request.offset : 0;
  const view = originalReadView(archive, value);
  if (view.fits) return { ...base, kind: 'value', value: view.value, complete: true, nextOffset: null };
  if (typeof value === 'string') {
    let end = Math.min(value.length, offset + PAGE_BYTES / 4);
    // Do not split a surrogate pair. Repeated reads reconstruct the exact string.
    if (end < value.length && /[\uD800-\uDBFF]/u.test(value[end - 1])) end--;
    return { ...base, kind: 'string_page', text: value.slice(offset, end), offset,
      totalCharacters: value.length, complete: end === value.length,
      nextOffset: end < value.length ? end : null };
  }
  const entries = children(archive, value, path), page = [];
  let cursor = offset, size = 0;
  for (; cursor < entries.length; cursor++) {
    const entry = entries[cursor], length = bytes(entry);
    if (page.length && size + length > PAGE_BYTES) break;
    page.push(entry); size += length;
  }
  return { ...base, kind: 'children', nodeType: type(value), children: page, offset,
    totalChildren: entries.length, complete: false, nextOffset: cursor < entries.length ? cursor : null };
}

function projectSynthesisReadMemory(archive, state, latestPages, planInlined = false) {
  const key = row => JSON.stringify([row.documentId,row.path || '',row.offset || 0]);
  const visible = new Set(latestPages.filter(p=>p.kind!=='original_page_available').map(key));
  const answered = new Set(state.answers.map(answer=>answer.questionId));
  const owner = new Map(archive.questions.map(question=>[question.documentId,question.questionId]));
  const manifest = new Map((state.readManifest || []).map(row=>[key(row),row]));
  const pages = [], directory = [];
  let memoryBytes = 0;
  for (const record of manifest.values()) {
    const questionId = owner.get(record.documentId) || null;
    const entry = {...clone(record),questionId,inCurrentPages:visible.has(key(record)),inReadMemory:false};
    directory.push(entry);
    // Small Plans are already pinned below. A large Plan is only an address in
    // currentPlan: discarding its observed sections here loses actual strategy
    // context whenever a receipt becomes latestPages, forcing endless rereads.
    if (entry.inCurrentPages || questionId && answered.has(questionId)
      || record.documentId==='plan' && planInlined) continue;
    const page = readRosterTeachSynthesisDocumentV1(archive,record,state);
    // Directories and oversized-object indexes remain in the read directory;
    // pin observed values/text, not all prior navigation and branch catalogs.
    if (!['value','string_page'].includes(page.kind) || page.value?.navigationOnly) continue;
    if (memoryBytes + bytes(page) > INLINE_BYTES) {
      entry.pendingInlineWindow=true; continue;
    }
    pages.push(page); memoryBytes+=bytes(page); entry.inReadMemory=true;
  }
  return {version:'exact_pending_question_and_large_plan_reads_v2',pages,directory,
    bytes:memoryBytes,windowBytes:INLINE_BYTES,originalsDiscarded:false,
    instruction:'Requests are stateless. These are exact previously read originals for unanswered questions, not summaries or new evidence. Use them together with latestPages to save supported answer batches before gathering more pages. Once an answer is saved its old pages leave this inline working set but remain at the same directory addresses. pendingInlineWindow means available by exact read, never unknown or discarded. Do not repeat an identical read merely to remember a page already shown here.'};
}

// Query failures are not the source catalogue. Keep exact source addresses and
// completed investigator handoffs visible beside question-specific receipts.
// This is discovery only: it neither verifies old model prose nor picks tactics.
function projectSynthesisSourceNavigation(archive, state) {
  const context = archive.documents.find(d => d.id === 'context');
  const sourceFacts=context?collectRosterTeachSourceFactsV1(null,{readValue:path=>{
    let value=context.value;
    for(const key of path.slice(1).split('/')){
      const resolved=originalForRead(archive,value);
      if(resolved.error)return undefined;
      value=resolved.value?.[key];
    }
    return originalForRead(archive,value).value;
  }}).map(({value,referenceId,path,...fact})=>({...fact,original:{documentId:'context',path,offset:0}})):[];
  const ruleRecords = [];
  if (context) for (const field of ['selectionSupportRules', 'selectionUnitRules']) {
    const path = `/sourceFacts/${field}`;
    const page = readRosterTeachSynthesisDocumentV1(archive, {documentId:'context',path},state);
    const paths = Array.isArray(page.value) ? page.value.map((_,i)=>`${path}/${i}`)
      : page.children?.map(c=>c.path) || [];
    for (const recordPath of paths) {
      const original = {documentId:'context',path:recordPath,offset:0};
      const record = readRosterTeachSynthesisDocumentV1(archive,original,state).value;
      if (!record?.recordKey) continue;
      ruleRecords.push({recordKey:record.recordKey,referenceId:record.referenceId,
        sourceRecordHash:record.sourceRecordHash,
        ...(record.rule?.name ? {name:record.rule.name} : {}),
        ...(record.rule?.boosts ? {abilityNames:record.rule.boosts.map(b=>b.name)} : {}),
        original});
    }
  }
  const investigationHandoffs = archive.documents.flatMap(document =>
    document.value?.kind === 'historical_investigation_claims'
      ? (document.value.rounds || []).flatMap((round,roundIndex) =>
        (round.questionProgress || []).map((progress,index)=>({
          questionId:progress.questionId,disposition:progress.disposition,
          evidenceQueryIds:progress.evidenceQueryIds,
          authority:'past_model_claim_not_rules_fact',
          original:{documentId:document.id,path:`/rounds/${roundIndex}/questionProgress/${index}`,offset:0},
        }))) : []);
  return {navigationOnly:true,catalogueProvesSelectedEnemyLoadout:false,ruleRecords,sourceFacts,
    sourceFactCitationInstructions:'For these explicitly indexed frozen facts use citationRef in evidenceRefs/receiptRef and a field path relative to the exact original object. These are source facts, NOT Native action receipts. A chosen schedule does not prove earliest/actual arrival; a static partner constraint does not prove dynamic range/timing/cost eligibility. A shared routeHash identifies an ability route, not one partner row: use that row\'s citationRef. Read originals before interpreting them.',
    investigationHandoffs,
    contextSections:['/mission','/sourceFacts/roundSupplySchedule','/sourceFacts/selectionRosterUnits',
      '/abilityPartnerConstraints','/sourceFacts/availableReadOnlyQueryIndex']
      .map(path=>({documentId:'context',path,offset:0})),
    instruction:'Question receipt directories list executions, not all available Rules or roster facts. Check these exact source records and investigator handoffs before declaring a source unavailable. Read originals to confirm or refute earlier claims; handoffs are model opinions, never automatic proof. A focused-unit filter does not change a scene: compare the original query scope and all participating units before claiming a counterfactual result. Planned arrival choices may change, but mission/rules capacity is not a model choice.'};
}

function projectCitationRepairOriginals(archive, state, navigation) {
  const failures = state.citationFeedback?.correctableFailures || [];
  if (!failures.length) return [];
  const affected = new Set(failures.map(row => row.questionId));
  // A patch replaces a question's citation arrays. Include its siblings too:
  // card records and unit facts may have different actual source structures.
  const refs = new Set([...failures.map(row => row.receiptRef),
    ...state.answers.filter(answer => affected.has(answer.questionId)).flatMap(answer => [
      ...(answer.evidenceRefs || []), ...(answer.quantitativeEvidence || []).map(e => e.receiptRef),
      ...(answer.qualitativeEvidence || []).map(e => e.receiptRef)])]);
  let inlineBytes = 0;
  return navigation.sourceFacts.filter(fact => refs.has(fact.citationRef)
    || fact.aliases?.some(alias => refs.has(alias))).map(fact => {
      const page = readRosterTeachSynthesisDocumentV1(archive, fact.original, state);
      const fits = inlineBytes + bytes(page) <= 96 * 1024;
      if (fits) inlineBytes += bytes(page);
      return { citationRef: fact.citationRef, scope: fact.scope,
        interpretationVerified: false, original: fact.original,
        page: fits ? page : { ...fact.original, kind: 'original_page_available', complete: false } };
    });
}

function exactCitationFieldCandidates(archive, original) {
  const parsed=parseRosterTeachEvidencePathV1(original.path);
  if (!parsed || parsed.keys.includes('*')) return [];
  const roots=[], seenRoots=new Set(), candidates=new Map();
  // Search only the SAME receipt and its already-delivered shared views. This
  // is field navigation, never a fuzzy receipt binding or a factual verdict.
  for (const document of archive.documents) {
    if (document.value?.receiptHash===original.receiptRef) {
      roots.push({value:document.value,documentId:document.id});
      seenRoots.add(document.value);
    }
  }
  for (const collection of [archive.retainedOriginals,archive.historicalOriginals]) {
    for (const [ref,value] of collection || []) {
      if ((ref===original.receiptRef || value?.receiptHash===original.receiptRef) && !seenRoots.has(value)) {
        roots.push({value,documentId:`evidence:${ref}`}); seenRoots.add(value);
      }
    }
  }
  for (const root of roots) {
    const visit=(value,keys)=>{
      if (keys.length>=parsed.keys.length && parsed.keys.every((key,index)=>
        keys[keys.length-parsed.keys.length+index]===key)) {
        const path='/'+keys.map(escape).join('/');
        if (!candidates.has(path)) candidates.set(path,{receiptRef:original.receiptRef,path,
          original:{documentId:root.documentId,path,offset:0},interpretationVerified:false,
          valueType:type(value),...(['number','boolean'].includes(typeof value) || value===null
            || (typeof value==='string' && bytes(value)<=4096) ? {value:clone(value)} : {})});
      }
      if (value && typeof value==='object') {
        for (const [key,child] of Object.entries(value)) visit(child,[...keys,key]);
      }
    };
    visit(root.value,[]);
  }
  return [...candidates.values()];
}

function citationRepairTargets(archive,state) {
  const slots=new Map();
  for (const failure of state.citationFeedback?.correctableFailures || []) {
    const answer=state.answers.find(row=>row.questionId===failure.questionId);
    if (!answer) continue;
    for (const field of ['evidenceRefs','quantitativeEvidence','qualitativeEvidence']) {
      for (const [index,original] of (answer[field] || []).entries()) {
        const matches=field==='evidenceRefs'
          ? failure.field===field && original===(failure.originalReceiptRef || failure.receiptRef)
          : failure.field!=='evidenceRefs' && original.receiptRef===(failure.originalReceiptRef || failure.receiptRef)
            && original.path===(failure.originalPath || failure.path);
        if (!matches) continue;
        const identity={questionId:answer.questionId,field,index,original:clone(original)};
        const repairSlotId=hash(identity);
        slots.set(repairSlotId,{repairSlotId,...identity,code:failure.code,
          operation:field==='evidenceRefs'?'replace_receipt_ref':'replace_receipt_ref_and_path',
          ...(field!=='evidenceRefs' ? {exactFieldCandidates:exactCitationFieldCandidates(archive,original)} : {}),
          interpretationAndOtherCitationsImmutable:true});
      }
    }
  }
  return [...slots.values()];
}

export function projectRosterTeachSynthesisReaderV1(archive, state) {
  if (state.archiveHash !== archive.archiveHash) fail('ROSTER_TEACH_SYNTHESIS_ARCHIVE_CHANGED');
  const missingQuestionIds = archive.questions.filter(question =>
    !state.answers.some(answer => answer.questionId === question.questionId)
    || state.pendingEvidenceReassessmentQuestionIds?.includes(question.questionId)).map(question => question.questionId);
  const citationRepairCount = state.citationFeedback?.correctableFailures?.length || 0;
  const nextAction = state.queuedReads.length ? 'read' : citationRepairCount ? 'repair_citations'
    : missingQuestionIds.length ? 'answer_pending' : 'finish';
  const workflow = { version: 'saved_ledger_handoff_v1', nextAction, finalAdmission: false,
    missingQuestionIds, citationRepairCount,
    pendingEvidenceReassessmentQuestionIds: clone(state.pendingEvidenceReassessmentQuestionIds || []),
    unresolvedQuestionIds: state.answers.filter(answer => answer.disposition === 'unresolved').map(answer => answer.questionId),
    instruction: nextAction === 'finish'
      ? 'Every question already has a saved answer and there are no correctable citation errors. Submit action=finish with all arrays empty to hand off this saved synthesis. finish ends only this readonly stage: unresolved questions and proposed Plan/roster changes are preserved for downstream investigation/revision; it does NOT approve the Plan or army. Do not rewrite all saved answers merely to repeat the task. You may still read or amend a specific answer if you identify a new factual/reference defect or substantive cross-question correction; otherwise finish now.'
      : nextAction === 'read'
        ? 'Drain the queued reads with action=read and reads=[]. Then save only missing or substantively corrected answers.'
        : nextAction === 'repair_citations'
          ? 'Read the exact citationFeedback and citationRepairTargets. Use action=repair_citations with citationEdits: copy the exact repairSlotId and choose only its replacement receiptRef/path. For an evidenceRefs slot use path="". The host preserves all other citations and the original interpretation, argument and proposals. Do not substitute generic status/readiness for the specific claimed value. If the claim or interpretation itself needs changing, use action=answer for that substantive revision instead. A missing binding with no existing slot also needs answer. No failed slot may be silently dropped; a material unknown is not a citation typo.'
          : 'Read originals and save answers for the missing question IDs. pendingEvidenceReassessmentQuestionIds identifies earlier drafts that did not see actual result content: reassess those against the now-delivered results, keeping their scope. Previously saved answers remain in answer-ledger; do not regenerate unrelated answers. Completing readonly synthesis may preserve unresolved factual gaps for the next workflow stage.' };
  let pageBytes = 0;
  const latestPages = state.latestPages.map(saved => {
    const page = readRosterTeachSynthesisDocumentV1(archive, saved, state);
    if (pageBytes + bytes(page) > 96 * 1024) return { documentId: saved.documentId, path: saved.path,
      offset: saved.offset || 0, kind: 'original_page_available', complete: false,
      instruction: 'The expanded original remains readable at this exact address. Request this page separately; no evidence was discarded.' };
    pageBytes += bytes(page); return page;
  });
  // Requests are stateless. Reading receipts replaces latestPages, so merely
  // having read the Plan in a previous request does not keep it model-visible.
  // Pin the exact current Plan, never an old question's description of it.
  const planDocument = archive.documents.find(document => document.id === 'plan');
  const planView = planDocument ? originalReadView(archive, planDocument.value, 96 * 1024) : null;
  const currentPlan = planDocument ? { documentId: 'plan',
    authority: 'model_plan_not_rules_evidence', complete: planView.fits,
    ...(planView.fits ? { value: planView.value } : { path: '',
      instruction: 'The current Plan exceeds the inline transport window. Read its relevant original fields; a previous read is not retained in the next request unless shown here or in latestPages.' }),
    instruction: 'Review THIS current Plan. Questions and previous critiques may describe an older claim: verify whether the current text has already changed it. Plan intentions are not executed Rules evidence. Do not repeat a missing-plan-content claim without checking the actual current text.' } : null;
  const contextDocument = archive.documents.find(document => document.id === 'context');
  const qualifiedFindings = contextDocument?.value?.sourceReview?.qualifiedFindings || [];
  const sourceReviewAdjudication = {
    authority: 'saved_source_review_with_its_evidence_not_a_strategy_veto',
    verdictTarget: 'plan_claim',
    findings: qualifiedFindings.map((judgment, index) => ({
      findingIndex: judgment.findingIndex,
      assessedPlanClaim: { path: judgment.originalFinding?.claimPath,
        quote: judgment.originalFinding?.claimQuote },
      claimAssessment: judgment.claimAssessment,
      reviewerAllegationDisposition: judgment.claimAssessment === 'source_supported'
        ? 'refuted_by_source_qualification' : 'not_refuted_by_this_label',
      publicReason: judgment.publicReason, evidenceScope: judgment.evidenceScope,
      sourceEvidence: clone(judgment.sourceEvidence || []),
      counterEvidence: clone(judgment.counterEvidence || []),
      factChecks: clone(judgment.factChecks || []),
      reviewerAllegation: { authority: 'historical_reviewer_opinion_not_rules_fact',
        original: {documentId:'context',path:`/sourceReview/qualifiedFindings/${index}/originalFinding`,offset:0} },
      original: {documentId:'context',path:`/sourceReview/qualifiedFindings/${index}`,offset:0},
    })),
    instruction: 'claimAssessment assesses the quoted PLAN CLAIM, never the reviewer allegation. source_supported means the Plan claim is supported within evidenceScope and the opposing reviewer rationale was refuted. Do not carry that rejected rationale into a proposed correction merely because an old question repeats it. A conditional forecast remains conditional, not an observed future event. The immutable full adjudication and old allegation remain readable at original addresses; new contrary evidence can justify reconsideration, but this display supplies no new strategic verdict.' };
  const sourceNavigation = projectSynthesisSourceNavigation(archive,state);
  const citationRepairOriginals = projectCitationRepairOriginals(archive,state,sourceNavigation);
  const pendingIds = new Set(state.pendingEvidenceReassessmentQuestionIds || []);
  const pendingDrafts = new Map();
  for (let index=(state.unreadEvidenceDrafts?.length || 0)-1; index>=0 && pendingIds.size; index--) {
    const draft=state.unreadEvidenceDrafts[index];
    if (draft.command.action!=='answer') continue;
    const ids=draft.command.answers.map(answer=>answer.questionId).filter(id=>pendingIds.has(id));
    if (!ids.length) continue;
    ids.forEach(id=>pendingIds.delete(id));
    const original={documentId:'pending-answer-draft',path:`/${index}`,offset:0};
    pendingDrafts.set(draft.commandHash,{questionIds:ids,original,
      authority:'unaccepted_model_draft_not_rule_evidence',
      instruction:'Continue from your actual paid public draft and reassess it against newly delivered originals. It has NOT been accepted and may contain unsupported reasoning. The older answer ledger is not a replacement for this newer draft. Only your next answer can revise/save the argument; no strategic conclusion was changed by the host.',
      page:readRosterTeachSynthesisDocumentV1(archive,original,state)});
  }
  // These are small control contracts, not evidence to discover by pagination.
  // Omitting them made the reader treat a frozen candidate as immutable policy
  // and accept a coverage gap instead of proposing its permitted revision.
  const sourceNodes = archive.documents.find(document => document.id === 'source')?.value || [];
  const planningDecisionScope = sourceNodes.find(node => node.kind === 'planning_decision_scope');
  const evidencePrecedence = sourceNodes.find(node => node.kind === 'evidence_precedence');
  return [{ kind: 'readonly_synthesis_workspace', version: archive.version, archiveHash: archive.archiveHash,
    workflow, currentPlan, sourceReviewAdjudication, sourceNavigation,
    ...(planningDecisionScope ? {planningDecisionScope: clone(planningDecisionScope)} : {}),
    ...(evidencePrecedence ? {evidencePrecedence: clone(evidencePrecedence)} : {}),
    ...(pendingDrafts.size ? {pendingAnswerDrafts:[...pendingDrafts.values()]} : {}),
    ...(citationRepairOriginals.length ? { citationRepairOriginals,
      citationRepairOriginalsInstruction: 'Exact originals for affected source-fact citations, including sibling references replaced by the same patch. Inspect each actual object; do not copy one record type\'s field structure onto another. Cite the ability/tag/rule text supporting the claim, not merely a record name or ID. A name identifies a source but does not itself prove an ability effect. Oversized originals remain readable at the supplied address. No answer or interpretation has been corrected by the host.' } : {}),
    readMemory:projectSynthesisReadMemory(archive,state,latestPages,currentPlan?.complete===true),
    readProjectionVersion: 'transparent_originals_v2',
    readSemantics: 'Reads transparently follow exact compression references to their originals. Missing originals return reference_error. evidenceObjectHash/contentHash are transport addresses, not automatically Rules receipt identities; cite the receiptHash inside the actual receipt. A model-authored question remains a hypothesis, not observed evidence.',
    instruction: 'This is a read-only synthesis of existing evidence, NOT a new investigation. Read originals by documentId + JSON Pointer + offset. Large objects list child paths; strings have nextOffset. No Rules/tool queries are re-executed. All documents are retained verbatim. same_prompt_evidence_reference_v1 pointers resolve in document source. Read the Plan, context and relevant question receipts before answering. Maintain the whole strategy across questions; you may revise any saved answer. Submit one manageable answer batch per step. read fetches originals (empty reads drains queued reads); answer upserts answers and replaces the three global proposal/feedback lists with your complete intended lists; finish returns the SAVED ledger, so first save any final changes using answer. Original questions, factual unknowns, and roster edit authority do not change. Receipt evidence paths in answers use the ORIGINAL receipt-relative contract, not archive JSON Pointers. To inspect prior complete answers/proposals use document answer-ledger.',
    documents: archive.documents.map(({ id, bytes, sourcePath }) => ({ documentId: id, bytes, sourcePath })),
    questions: archive.questions.map(question => {
      const page = readRosterTeachSynthesisDocumentV1(archive,
        { documentId: question.documentId, path: '/originalQuestion' }, state);
      return { ...question, claimAuthority: 'unverified_question_to_examine_not_a_fact',
        originalQuestion: page.kind === 'value' && bytes(page.value) <= 4096 ? page.value : {
        documentId: question.documentId, path: '/originalQuestion', instruction: 'Read the complete original question here; this address is not Rules evidence.' } };
    }),
    evidenceNavigation: 'Each question has an evidenceDirectory listing original receipts and resultReadTargets for existing shared result views. Read the actual result content, not just the root directory, before concluding a query has no result. These views preserve the original result scope and are not new receipts or executions; cite the supporting original receipt fields. Distinguish later successes and matching predicates yourself. Directory metadata is not proof.',
    ...(archive.historicalOriginals?.size ? { historicalEvidenceLookup: {
      directory: { documentId: 'historical-receipts', path: '' }, availableOriginals: archive.historicalOriginals.size,
      instruction: 'Earlier Teach originals are still readable by exact evidence:<receiptHash>. Search this readonly directory for a prior citation missing from current question receipts. Same frozen army/map/task/source does not make a different historical scene current; cite its explicit assumptions and limits. No Rules query is rerun.' } } : {}),
    citationPathContract: 'Use the original Native receipt identity OR an explicit sourceNavigation.sourceFacts citationRef; field paths are relative to that original receipt/fact object. Exact dot/bracket paths, JSON Pointers and slash-separated paths are accepted. Archive document IDs and absolute document paths are not citation IDs. Source facts preserve their declared limited scope and never become Native action proof. Exact array/object references belong in qualitativeEvidence, without supplying an aggregate or validating an interpretation. Quantitative claims need a scalar or canonical probability estimate. Original unknowns stay unknown; no guessed value or substitution. Previous bindings/directories are references, not new facts.',
    retainedEvidenceLookup: { documentId: 'evidence:<receiptHash>', path: 'JSON Pointer within the original receipt (empty path lists the root)',
      availableOriginals: archive.retainedOriginals.size, missingOriginalRefs: archive.missingOriginalRefs,
      instruction: 'Follow any retained_evidence retrieval by using its receiptHash in evidence:<receiptHash>. This also accepts evidenceObjectHash handles when the original is retained. These documents contain the original saved fields, not a new Rules query. A missing original is explicitly unavailable, never proof.' },
    answerLedger: { documentId: 'answer-ledger', path: '', answers: state.answers.map((answer, index) => ({
      questionId: answer.questionId, disposition: answer.disposition, path: `/answers/${index}` })),
      proposedPlanChanges: state.proposedPlanChanges.length, proposedRosterChanges: state.proposedRosterChanges.length,
      frameworkFeedback: state.frameworkFeedback.length },
    completedSteps: state.completedSteps.length, queuedReads: state.queuedReads.length,
    ...(state.readSourceContinuations?.length ? { continuation: state.readSourceContinuations.at(-1) } : {}),
    ...(state.citationFeedback ? { citationFeedback: clone(state.citationFeedback) } : {}),
    citationRepairTargets: citationRepairTargets(archive,state),
    ...(state.evidenceReadFeedback ? { evidenceReadFeedback: clone(state.evidenceReadFeedback) } : {}),
    ...(state.premiseReconciliation ? {premiseReconciliation:{
      changedQuestionIds:state.premiseReconciliation.changedQuestionIds,
      publicReason:state.premiseReconciliation.publicReason,
      original:{documentId:'premise-reconciliation',path:'',offset:0},
      instruction:'These question premises were corrected by the source-qualified premise role. Earlier answers to them are retained in history, not carried as current conclusions. Answer the corrected questions, not their rejected old premises. Rebuild the COMPLETE intended proposals from the still-valid answers and the original previousProposals available here; those old proposals may include the refuted premise. No Plan or roster has been changed.'}} : {}),
    latestPages }];
}

function unreadAnswerEvidence(archive, state, answers) {
  const missing = [];
  const sourceFacts = projectSynthesisSourceNavigation(archive,state).sourceFacts;
  // Indexes identify evidence; they do not deliver its meaning. Resolve only
  // exact shared source identities, then deliver the cited original before the
  // model's argument can enter the saved ledger. The Host edits no argument.
  const observedSourceValue = original => {
    const stringPages=[];
    for(const read of state.readManifest){
      if(read.documentId!==original.documentId)continue;
      const page=readRosterTeachSynthesisDocumentV1(archive,read,state);
      const covers=path=>path===original.path||original.path.startsWith((path||'')+'/');
      if(page.kind==='value'&&covers(read.path))return true;
      if(page.kind==='children'&&page.children.some(child=>Object.hasOwn(child,'value')&&covers(child.path)))return true;
      if(page.kind==='string_page'&&read.path===original.path)stringPages.push(page);
    }
    let end=0;
    for(const page of stringPages.sort((a,b)=>a.offset-b.offset)){
      if(page.offset>end)return false;
      end=Math.max(end,page.offset+page.text.length);
      if(end>=page.totalCharacters)return true;
    }
    return false;
  };
  const unreadResultValues = original => {
    if (observedSourceValue(original)) return [];
    const page = readRosterTeachSynthesisDocumentV1(archive, original, state);
    if (page.kind !== 'children') return [original];
    const pending = page.children.flatMap(child => unreadResultValues({
      documentId:original.documentId,path:child.path,offset:0}));
    if (page.nextOffset !== null) pending.push(...unreadResultValues({...original,offset:page.nextOffset}));
    return pending;
  };
  for (const answer of answers) {
    const question = archive.questions.find(row => row.questionId === answer.questionId);
    for (const original of question?.evidenceDirectory?.originals || []) {
      const observed = state.readManifest.some(read => read.documentId === original.documentId
        && (read.path === original.path || original.path.startsWith((read.path || '') + '/')
          && readRosterTeachSynthesisDocumentV1(archive, read, state).kind === 'value'));
      if (!observed) missing.push({ questionId: answer.questionId, original });
    }
    for (const target of question?.evidenceDirectory?.resultReadTargets || []) {
      for (const original of unreadResultValues(target)) missing.push({questionId:answer.questionId,original});
    }
    const citations=[...(answer.quantitativeEvidence||[]),...(answer.qualitativeEvidence||[])];
    const refs=new Set([...(answer.evidenceRefs||[]),...citations.map(c=>c.receiptRef)]);
    for(const ref of refs){
      const matches=sourceFacts.filter(f=>f.citationRef===ref||f.citationRef===`source-fact:${ref}`||f.aliases.includes(ref));
      if(matches.length!==1)continue; // Existing citation binder owns missing/ambiguous references.
      const fact=matches[0];
      const sameRef=c=>c.receiptRef===ref||c.receiptRef===fact.citationRef||fact.aliases.includes(c.receiptRef);
      const paths=citations.filter(sameRef).map(c=>c.path);
      if(!paths.length)paths.push('');
      for(const path of paths){
        const parsed=['','/','$'].includes(path)?{keys:[]}:parseRosterTeachEvidencePathV1(path);
        // A malformed/wildcard citation gets its original record for correction,
        // not a fabricated value or a guessed alternative source.
        const keys=parsed&&!parsed.keys.includes('*')?parsed.keys:[];
        const original={...fact.original,path:fact.original.path+keys.map(k=>'/'+escape(k)).join('')};
        if(!observedSourceValue(original))missing.push({questionId:answer.questionId,original});
      }
    }
  }
  return missing;
}

function drainSynthesisReadWindow(archive, state) {
  state.latestPages = [];
  let size = 0, newReads = 0;
  while (state.queuedReads.length) {
    const page = readRosterTeachSynthesisDocumentV1(archive, state.queuedReads[0], state);
    if (state.latestPages.length && size + bytes(page) > 96 * 1024) break;
    const request = state.queuedReads.shift(), pageHash = hash(page);
    state.latestPages.push(page); size += bytes(page);
    if (!state.readManifest.some(record => record.pageHash === pageHash)) {
      state.readManifest.push({ ...request, pageHash }); newReads++;
    }
  }
  return newReads;
}

export function validateRosterTeachSynthesisReaderCommandV1(archive, state, command) {
  const ids = new Set(archive.questions.map(question => question.questionId));
  if (new Set(command.answers.map(answer => answer.questionId)).size !== command.answers.length
    || command.answers.some(answer => !ids.has(answer.questionId))) fail('ROSTER_TEACH_SYNTHESIS_READER_QUESTION_INVALID');
  if (command.action !== 'answer' && (command.answers.length || command.proposedPlanChanges.length
    || command.proposedRosterChanges.length || command.frameworkFeedback.length)) fail('ROSTER_TEACH_SYNTHESIS_READER_ACTION_MISMATCH', 'Use answer to save changes, then finish.');
  if (command.action !== 'read' && command.reads.length) fail('ROSTER_TEACH_SYNTHESIS_READER_ACTION_MISMATCH', 'Only read may request pages.');
  const patches = command.citationPatches || [];
  const edits = command.citationEdits || [];
  if (command.action === 'repair_citations') {
    if (edits.length) {
      const slots=new Map(citationRepairTargets(archive,state).map(slot=>[slot.repairSlotId,slot]));
      if (patches.length || new Set(edits.map(edit=>edit.repairSlotId)).size!==edits.length
        || edits.some(edit=>!slots.has(edit.repairSlotId)
          || (slots.get(edit.repairSlotId).field==='evidenceRefs' && edit.path!==''))) {
        fail('ROSTER_TEACH_CITATION_REPAIR_SLOT_INVALID','Replace only the exact current failed slots; use answer for changed claims.');
      }
      for (const edit of edits) {
        const slot=slots.get(edit.repairSlotId),keys=parseRosterTeachEvidencePathV1(edit.path)?.keys;
        if (slot.exactFieldCandidates?.length && !slot.exactFieldCandidates.some(candidate=>
          edit.receiptRef===candidate.receiptRef && keys
          && JSON.stringify(keys)===JSON.stringify(parseRosterTeachEvidencePathV1(candidate.path).keys))) {
          fail('ROSTER_TEACH_CITATION_REPAIR_FIELD_SUBSTITUTION',JSON.stringify({
            repairSlotId:edit.repairSlotId,exactFieldCandidates:slot.exactFieldCandidates,
            instruction:'The originally named field exists in this same receipt/view. A path-only repair must select its exact address. Generic metadata is not a substitute. To change the claimed fact or interpretation use answer, preserving all other evidence.'}));
        }
      }
    } else if (!patches.length || new Set(patches.map(p => p.questionId)).size !== patches.length
      || patches.some(p => !ids.has(p.questionId) || !state.answers.some(a => a.questionId === p.questionId))) {
      fail('ROSTER_TEACH_CITATION_PATCH_QUESTION_INVALID', 'Patch each existing saved question at most once.');
    }
  } else if (patches.length || edits.length) fail('ROSTER_TEACH_SYNTHESIS_READER_ACTION_MISMATCH', 'Only repair_citations may carry citation edits.');
  if (command.action === 'finish' && [...ids].some(id => !state.answers.some(answer => answer.questionId === id)
    || state.pendingEvidenceReassessmentQuestionIds?.includes(id))) {
    fail('ROSTER_TEACH_SYNTHESIS_READER_COVERAGE_MISSING', [...ids].filter(id => !state.answers.some(answer => answer.questionId === id)
      || state.pendingEvidenceReassessmentQuestionIds?.includes(id)).join(','));
  }
  if (command.action === 'finish' && state.citationFeedback?.correctableFailures?.length) {
    fail('ROSTER_TEACH_SYNTHESIS_CITATIONS_NEED_REPAIR',
      'Use the delivered citationFeedback: read originals and patch their citations before finish. Use a full answer only when revising the substantive conclusion. Do not re-investigate or invent proof.');
  }
}

export function rosterTeachSynthesisStepKindV1(workspace, pendingKind) {
  return workspace.workflow.nextAction === 'repair_citations'
    ? pendingKind==='teach_framework_citation_patch' ? pendingKind : 'teach_framework_citation_delta'
    : 'teach_framework_synthesis_step';
}

export function applyRosterTeachSynthesisReaderCommandV1(archive, state, command) {
  validateRosterTeachSynthesisReaderCommandV1(archive, state, command);
  if(command.action==='repair_citations' && command.citationPatches?.length){
    // A paid legacy whole-array patch can discard valid evidence while keeping
    // the old argument. Preserve it verbatim; the next operation uses exact
    // source-owned failed slots instead of applying that destructive rewrite.
    (state.legacyCitationPatchDrafts ||= []).push({command:clone(command),commandHash:hash(command),
      applied:false,reason:'whole_array_repair_superseded_by_failed_slot_edits'});
    state.completedSteps.push({step:state.completedSteps.length+1,action:'legacy_citation_patch_handoff',
      commandHash:hash(command),newReadPages:0,answersChanged:false});
    state.noProgressSteps=0;
    return state;
  }
  // A schema-valid answer can simply echo the old allegation without seeing
  // newer successful results. Preserve that paid draft, deliver the originals,
  // and ask for reassessment; do not turn this into another format-error loop,
  // rerun Rules, or fabricate the strategic conclusion in the Host.
  const unread = ['answer','finish'].includes(command.action)
    ? unreadAnswerEvidence(archive, state, command.action === 'answer' ? command.answers : state.answers) : [];
  if (unread.length) {
    state.unreadEvidenceDrafts ||= [];
    state.unreadEvidenceDrafts.push({ command: clone(command), commandHash: hash(command),
      questionIds: [...new Set(unread.map(row => row.questionId))], acceptance: 'not_saved_as_conclusions' });
    state.pendingEvidenceReassessmentQuestionIds = [...new Set([
      ...(state.pendingEvidenceReassessmentQuestionIds || []), ...unread.map(row => row.questionId)])];
    const queue = new Map(state.queuedReads.map(read => [hash(read), read]));
    for (const { original } of unread) queue.set(hash(original), clone(original));
    state.queuedReads = [...queue.values()];
    const newReads = drainSynthesisReadWindow(archive, state);
    state.evidenceReadFeedback = { version: 1, questionIds: [...new Set(unread.map(row => row.questionId))],
      paidDraftPreserved: true, nativeQueriesRepeated: 0, hostStrategicCorrections: 0,
      instruction: 'Your paid draft was retained, not accepted: these questions cite saved results or indexed source facts whose actual content you had not read. Review the original pages, including newer successes and exact rule wording and their limits, before resubmitting supported answer batches and complete intended proposals. Reassess the question premises as claims too, not facts. Do not repeat an old failure or rule claim solely from question text. Root indexes require further field reads for substantive claims; cite the specific supporting fields if a whole record is too large. Unread evidence is not unavailable evidence. No strategic conclusion was supplied or changed by the Host.' };
    state.noProgressSteps = newReads ? 0 : state.noProgressSteps + 1;
    state.completedSteps.push({ step: state.completedSteps.length + 1,
      action: `${command.action}_deferred_for_unread_evidence`, commandHash: hash(command), newReadPages: newReads, answersChanged: false });
    return state;
  }
  const beforePages = hash(state.latestPages);
  const before = hash({ answers: state.answers, proposedPlanChanges: state.proposedPlanChanges,
    proposedRosterChanges: state.proposedRosterChanges, frameworkFeedback: state.frameworkFeedback });
  let newReads = 0;
  if (command.action === 'read') {
    state.queuedReads.push(...clone(command.reads));
    newReads = drainSynthesisReadWindow(archive, state);
  } else if (command.action === 'answer') {
    state.pendingEvidenceReassessmentQuestionIds = (state.pendingEvidenceReassessmentQuestionIds || [])
      .filter(id => !command.answers.some(answer => answer.questionId === id));
    state.proposalBatches ||= [];
    state.proposalBatches.push({commandHash:hash(command),questionIds:command.answers.map(a=>a.questionId),
      ...Object.fromEntries(['proposedPlanChanges','proposedRosterChanges','frameworkFeedback'].map(key=>[key,clone(command[key])]))});
    for (const answer of command.answers) {
      const index = state.answers.findIndex(previous => previous.questionId === answer.questionId);
      if (index < 0) state.answers.push(clone(answer)); else state.answers[index] = clone(answer);
    }
    for (const key of ['proposedPlanChanges', 'proposedRosterChanges', 'frameworkFeedback']) state[key] = clone(command[key]);
    if(state.premiseReconciliation)state.premiseReconciliation.proposalsRevisedByModel=true;
  } else if (command.action === 'repair_citations') {
    const slots=new Map(citationRepairTargets(archive,state).map(slot=>[slot.repairSlotId,slot]));
    for (const edit of command.citationEdits) {
      const slot=slots.get(edit.repairSlotId),answer=state.answers.find(a=>a.questionId===slot.questionId);
      if(slot.field==='evidenceRefs')answer.evidenceRefs[slot.index]=edit.receiptRef;
      else answer[slot.field][slot.index]={...answer[slot.field][slot.index],receiptRef:edit.receiptRef,path:edit.path};
    }
  } else if (command.action === 'finish') state.status = 'completed';
  const after = hash({ answers: state.answers, proposedPlanChanges: state.proposedPlanChanges,
    proposedRosterChanges: state.proposedRosterChanges, frameworkFeedback: state.frameworkFeedback });
  // Re-reading DIFFERENT saved pages is valid context recovery, not a loop.
  // Only an unchanged delivered window AND unchanged ledger count as no progress.
  state.noProgressSteps = newReads || beforePages !== hash(state.latestPages)
    || before !== after || state.status === 'completed' ? 0 : state.noProgressSteps + 1;
  state.completedSteps.push({ step: state.completedSteps.length + 1, action: command.action,
    commandHash: hash(command), newReadPages: newReads, answersChanged: before !== after });
  return state;
}

export function assembleRosterTeachSynthesisReaderV1(state) {
  if (state.status !== 'completed') fail('ROSTER_TEACH_SYNTHESIS_READER_NOT_FINISHED');
  return clone({ answers: state.answers, proposedPlanChanges: state.proposedPlanChanges,
    proposedRosterChanges: state.proposedRosterChanges, frameworkFeedback: state.frameworkFeedback });
}

// Real partial answers contain batch-local proposals. Their last list is not
// the complete cross-question handoff. Only the model may reconcile that list;
// this operation changes no answer, rule, receipt, roster or Plan.
export function prepareRosterTeachProposalConsolidationV1(state) {
  const answers=clone(state.answers);
  const inputHash=hash({version:1,answers,premiseCorrections:state.premiseReconciliation?.corrections||[]});
  if(state.proposalConsolidation?.status==='completed'&&state.proposalConsolidation.inputHash===inputHash)return null;
  if(state.proposalConsolidation?.status==='running'&&state.proposalConsolidation.inputHash===inputHash)
    return clone(state.proposalConsolidation.request);
  return {version:1,inputHash,answers,
    existingProposals:Object.fromEntries(['proposedPlanChanges','proposedRosterChanges','frameworkFeedback'].map(k=>[k,clone(state[k])])),
    batchProposals:clone(state.proposalBatches||[]),
    priorPremiseProposals:clone(state.premiseReconciliation||null),
    instruction:'Consolidate ALL current saved answers into the complete proposed Plan/roster changes and methodology feedback. Each questionActions row links one existing question to its proposed changes, using zero-based indices. Cover every question exactly once; every revise answer needs an actionable proposal or a shared proposal that addresses it. Retained answers may have no proposal. The system derives unresolvedQuestionIds from saved answer dispositions; the legacy output field is advisory bookkeeping only and cannot change that set. This operation cannot clear a missing fact, revise an answer or certify execution. Earlier batch proposals and pre-premise-correction proposals are historical suggestions, not facts; discard or replace ones contradicted by current answers. Explain the cross-question reconciliation without inventing evidence. These remain proposed_not_applied, not final acceptance.'};
}

export function validateRosterTeachProposalConsolidationV1(state,request,output) {
  if(request.inputHash!==hash({version:1,answers:state.answers,premiseCorrections:state.premiseReconciliation?.corrections||[]}))
    fail('ROSTER_TEACH_PROPOSAL_INPUT_CHANGED');
  const expected=new Map(state.answers.map(a=>[a.questionId,a]));
  if(output.questionActions.length!==expected.size||new Set(output.questionActions.map(q=>q.questionId)).size!==expected.size
    ||output.questionActions.some(q=>!expected.has(q.questionId)))fail('ROSTER_TEACH_PROPOSAL_COVERAGE');
  const omittedRevisionQuestionIds=[];
  for(const row of output.questionActions){
    for(const [key,list] of [['planChangeIndices',output.proposedPlanChanges],['rosterChangeIndices',output.proposedRosterChanges]])
      if(row[key].some(index=>!Number.isInteger(index)||index<0||index>=list.length))fail('ROSTER_TEACH_PROPOSAL_INDEX',row.questionId);
    if(expected.get(row.questionId).disposition==='revise'&&!row.planChangeIndices.length&&!row.rosterChangeIndices.length)
      omittedRevisionQuestionIds.push(row.questionId);
  }
  // One reply may omit several current revisions. Return every known omission
  // together, rather than paying once per item while preserving another defect.
  if(omittedRevisionQuestionIds.length)fail('ROSTER_TEACH_PROPOSAL_REVISION_OMITTED',JSON.stringify({omittedRevisionQuestionIds}));
}

export function applyRosterTeachProposalConsolidationV1(state,request,output) {
  validateRosterTeachProposalConsolidationV1(state,request,output);
  if(state.proposalConsolidation?.status==='completed'){
    state.proposalConsolidationHistory||=[];
    state.proposalConsolidationHistory.push(clone(state.proposalConsolidation));
  }
  const unresolvedQuestionIds=state.answers.filter(a=>a.disposition==='unresolved').map(a=>a.questionId).sort();
  const metadataWarnings=JSON.stringify([...(output.unresolvedQuestionIds||[])].sort())===JSON.stringify(unresolvedQuestionIds)?[]
    :[{code:'MODEL_UNRESOLVED_ECHO_IGNORED',expected:clone(unresolvedQuestionIds),reported:clone(output.unresolvedQuestionIds||[]),
      authority:'saved_answer_dispositions',answersChanged:false,finalAcceptanceGranted:false}];
  state.proposalConsolidation={status:'completed',inputHash:request.inputHash,request:clone(request),output:clone(output),
    unresolvedQuestionIds,metadataWarnings,authority:'proposed_not_applied'};
  for(const key of ['proposedPlanChanges','proposedRosterChanges','frameworkFeedback'])state[key]=clone(output[key]);
  return state;
}
