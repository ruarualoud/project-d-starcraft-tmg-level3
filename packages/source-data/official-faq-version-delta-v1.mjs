import { createHash } from 'node:crypto';

const sections = [
  ['units_characteristics', /^Units & Characteristics$/iu],
  ['measuring_movement', /^Measuring & Movement$/iu],
  ['battlefield', /^The Battlefield$/iu],
  ['deployment_entry_edges_zoi', /^Deployment, Entry Edges,/iu],
  ['attack_sequence', /^Attack Sequence$/iu],
  ['abilities_tactics_cards', /^Abilities & Tactics Cards$/iu],
  ['keywords', /^Keywords$/iu],
  ['templates_spillover', /^Templates & Spillover$/iu],
];
const normalize = value => value.replace(/\s+/gu, ' ').trim();
export const officialFaqTextHashV1 = value => createHash('sha256').update(value).digest('hex');
export const officialFaqComparisonTextV1 = value => value.normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '');

export function parseOfficialFaqDocumentV1({ rawText, version }) {
  const entries = [];
  let section = null;
  let current = null;
  let mode = null;
  let ended = false;
  function finish() {
    if (!current) return;
    const question = normalize(current.question.join(' '));
    const answer = normalize(current.answer.join(' '));
    if (!question || !answer) throw Error('FAQ_DOCUMENT_INCOMPLETE_ENTRY');
    entries.push({ entryId: `faq-v${version}:${String(entries.length + 1).padStart(2, '0')}`,
      ordinal: entries.length + 1, section: current.section, page: current.page,
      endPage: current.endPage, question, answer,
      questionHash: officialFaqTextHashV1(question), answerHash: officialFaqTextHashV1(answer) });
    current = null;
    mode = null;
  }
  for (const [pageIndex, pageText] of rawText.split('\f').entries()) {
    if (ended) break;
    for (const rawLine of pageText.split(/\r?\n/u)) {
      const line = normalize(rawLine);
      if (!line || line === '' || /^BACK\s*TO\s*TABLE OF CONTENTS$/iu.test(line)
        || line === String(pageIndex + 1)) continue;
      if (/^A Special Thank You$/iu.test(line)) {
        finish(); ended = true; break;
      }
      const nextSection = sections.find(([, pattern]) => pattern.test(line));
      if (nextSection) {
        finish(); section = nextSection[0]; continue;
      }
      if (!section || /^& Zone of Influence$/iu.test(line)) continue;
      if (/^Q:/u.test(line)) {
        finish();
        current = { question: [line.slice(2)], answer: [], section,
          page: pageIndex + 1, endPage: pageIndex + 1 };
        mode = 'question'; continue;
      }
      if (/^A:/u.test(line) && current) {
        mode = 'answer'; current.answer.push(line.slice(2)); continue;
      }
      if (current) {
        current.endPage = pageIndex + 1;
        current[mode === 'answer' ? 'answer' : 'question'].push(line);
      }
    }
  }
  finish();
  if (!entries.length) throw Error('FAQ_DOCUMENT_ENTRIES_MISSING');
  return { schema: 'starcraft_tmg_official_faq_document_index_v1', version,
    rawTextHash: officialFaqTextHashV1(rawText), entries };
}

export function alignOfficialFaqQuestionsV1({ previous, current, reviewedMatches = [] }) {
  const manual = new Map(reviewedMatches.map(row => [row.currentEntryId, row]));
  const consumed = new Set();
  const rows = current.entries.map(entry => {
    const review = manual.get(entry.entryId);
    const matches = review ? previous.entries.filter(old => old.entryId === review.previousEntryId)
      : previous.entries.filter(old => officialFaqComparisonTextV1(old.question)
        === officialFaqComparisonTextV1(entry.question));
    if (matches.length > 1 || (review && matches.length !== 1)) throw Error(`FAQ_QUESTION_MATCH_AMBIGUOUS:${entry.entryId}`);
    const old = matches[0] || null;
    if (old && consumed.has(old.entryId)) throw Error(`FAQ_PREVIOUS_ENTRY_REUSED:${old.entryId}`);
    if (old) consumed.add(old.entryId);
    return { currentEntryId: entry.entryId, previousEntryId: old?.entryId || null,
      matchMethod: review ? 'reviewed_question_semantics' : old ? 'normalized_question_exact' : 'unmatched_new_question',
      questionChanged: old ? officialFaqComparisonTextV1(old.question) !== officialFaqComparisonTextV1(entry.question) : true,
      rawAnswerChanged: old ? officialFaqComparisonTextV1(old.answer) !== officialFaqComparisonTextV1(entry.answer) : true };
  });
  return { rows, unmatchedPreviousEntryIds: previous.entries.filter(entry => !consumed.has(entry.entryId)).map(entry => entry.entryId) };
}

export function compileOfficialFaqVersionDeltaV1({ previous, current, review,
  previousAtoms, previousReconciliation, featureRegistry, consumers, sourceBinding }) {
  if (sourceBinding.previous.byteHash !== review.previousPdfHash
    || sourceBinding.current.byteHash !== review.currentPdfHash) throw Error('FAQ_REVIEW_SOURCE_MISMATCH');
  const alignment = alignOfficialFaqQuestionsV1({ previous, current, reviewedMatches: review.reviewedMatches });
  if (alignment.unmatchedPreviousEntryIds.length) throw Error('FAQ_PREVIOUS_DISPOSITION_MISSING');
  const impacts = new Map(review.impacts.map(row => [row.current, row]));
  if (impacts.size !== review.impacts.length) throw Error('FAQ_REVIEW_IMPACT_DUPLICATE');
  const revisions = new Map(review.revisions.map(row => [row.current, row]));
  const knownAtoms = new Set(previousAtoms.map(row => row.atomId));
  for (const row of review.revisions) {
    if (!knownAtoms.has(row.existingAtomId)) throw Error(`FAQ_REVISION_ATOM_MISSING:${row.existingAtomId}`);
  }
  const rows = alignment.rows.map(link => {
    const entry = current.entries.find(row => row.entryId === link.currentEntryId);
    const old = previous.entries.find(row => row.entryId === link.previousEntryId);
    const correction = review.answerCorrections.find(row => row.currentEntryId === entry.entryId);
    if (correction && (!review.visualPages.some(row => row.page === entry.page && row.reviewed)
      || correction.page !== entry.page
      || !officialFaqComparisonTextV1(entry.answer).includes(officialFaqComparisonTextV1(correction.retainedText))
      || !entry.answer.includes(correction.observedDeletedText))) throw Error('FAQ_ANSWER_CORRECTION_UNPROVEN');
    const effectiveAnswer = correction?.effectiveAnswer || entry.answer;
    const disposition = !old ? 'added' : officialFaqComparisonTextV1(old.answer)
      === officialFaqComparisonTextV1(effectiveAnswer) ? 'retained' : 'revised';
    const impact = impacts.get(entry.ordinal);
    if (disposition !== 'retained' && !impact) throw Error(`FAQ_IMPACT_REQUIRED:${entry.entryId}`);
    if (disposition === 'revised' && !revisions.has(entry.ordinal)) throw Error('FAQ_REVISION_PLAN_REQUIRED');
    const reuseEntries = new Set([old?.entryId, ...(impact?.reuseFaq || []).map(ordinal =>
      `faq-v1:${String(ordinal).padStart(2, '0')}`)].filter(Boolean));
    const inherited = previousAtoms.filter(row => reuseEntries.has(row.entryId));
    const core = previousReconciliation.filter(row => reuseEntries.has(row.entryId)).flatMap(row => row.atomIds);
    const featureRefs = (impact?.features || []).flatMap(ref => {
      const matches = featureRegistry.entries.filter(row => row.recordKey === ref.recordKey
        && row.sourceName.toLowerCase() === ref.name.toLowerCase());
      if (!matches.length) throw Error(`FAQ_FEATURE_SOURCE_MISSING:${ref.recordKey}:${ref.name}`);
      return matches.map(row => ({ semanticId: row.semanticId, semanticVersion: row.semanticVersion,
        recordKey: row.recordKey, name: row.sourceName, phase: row.sourcePhase }));
    });
    const plannedAtoms = review.proposedAtoms.filter(row => row.entries.includes(entry.ordinal));
    const revision = revisions.get(entry.ordinal) || null;
    if (impact?.action === 'new_binding' && !plannedAtoms.length) throw Error('FAQ_NEW_BINDING_ATOM_MISSING');
    return { ...link, disposition, page: entry.page, endPage: entry.endPage, section: entry.section,
      question: entry.question, questionHash: entry.questionHash, rawAnswer: entry.answer,
      rawAnswerHash: entry.answerHash, effectiveAnswer, effectiveAnswerHash: officialFaqTextHashV1(effectiveAnswer),
      previousQuestion: old?.question || null, previousAnswer: old?.answer || null,
      visualReview: { reviewed: review.visualPages.some(row => row.page === entry.page && row.reviewed),
        page: entry.page, correction: correction || null },
      existingAtomIds: [...new Set([...inherited.map(row => row.atomId), ...core, ...(impact?.reuseAtoms || [])])].sort(),
      retainedFaqBindings: inherited.map(row => ({ atomId: row.atomId, primitive: row.primitive,
        reads: row.reads, writes: row.writes })),
      featureRefs, proposedAtomIds: plannedAtoms.map(row => row.id), revision,
      impact: impact ? { ...impact, fieldContractStatus: 'semantic_requirements_to_bind_to_native_state_in_owner_item',
        consumers: consumers.families[impact.family], sharedConsumers: consumers.shared,
        validationStatus: 'planned_not_executed' } : null,
      executionStatus: disposition === 'retained' ? 'reuse_legacy_evidence_then_release_binding'
        : 'pending_versioned_implementation_and_product_gate' };
  });
  const used = new Set(rows.filter(row => row.impact).map(row => Number(row.currentEntryId.split(':')[1])));
  if ([...impacts.keys()].some(ordinal => !used.has(ordinal))) throw Error('FAQ_REVIEW_ORPHAN_IMPACT');
  const modifiedIds = new Set(review.revisions.map(row => row.existingAtomId));
  const inheritedAtoms = previousAtoms.map(row => ({ ...row,
    change: modifiedIds.has(row.atomId) ? 'revise_in_new_release' : 'retain',
    currentEntryIds: rows.filter(entry => entry.retainedFaqBindings.some(binding => binding.atomId === row.atomId))
      .map(entry => entry.currentEntryId) }));
  return { schema: 'starcraft_tmg_official_faq_version_delta_v1', sourceBinding,
    summary: { previousEntries: previous.entries.length, currentEntries: current.entries.length,
      retainedQuestions: rows.filter(row => row.disposition === 'retained').length,
      revisedQuestions: rows.filter(row => row.disposition === 'revised').length,
      addedQuestions: rows.filter(row => row.disposition === 'added').length, removedQuestions: 0,
      existingFaqAtoms: previousAtoms.length, retainedFaqAtoms: inheritedAtoms.filter(row => row.change === 'retain').length,
      revisedFaqAtoms: modifiedIds.size, proposedAdditionalAtoms: review.proposedAtoms.length,
      newRuntimeAtomsImplementedByThisItem: 0 },
    rows, previousEntryMap: previous.entries.map(old => ({ previousEntryId: old.entryId,
      currentEntryId: rows.find(row => row.previousEntryId === old.entryId)?.currentEntryId })),
    inheritedAtoms, proposedAtoms: review.proposedAtoms.map(row => ({ ...row,
      status: 'proposed_not_registered_or_executed' })),
    dependentRetainedEntries: [
      { currentEntryId: 'faq-v1.3:86', dependency: 'faq-v1.3:55', reason: '每trigger与每phase限制同时满足，Repeatable不自动取消通用phase上限。' },
      { currentEntryId: 'faq-v1.3:94', dependency: 'faq-v1.3:70', reason: '模板的同高度明文条件覆盖Token跨高度默认。' },
    ],
    sourceScopeQuestions: rows.filter(row => row.impact?.scopeNote).map(row => ({
      currentEntryId: row.currentEntryId, note: row.impact.scopeNote,
      disposition: 'explicit_self_damage_subcase_needs_source_clarification', owner: 'T28-W3-05' })),
    productionRoomEligible: false, trainingTruth: false };
}
