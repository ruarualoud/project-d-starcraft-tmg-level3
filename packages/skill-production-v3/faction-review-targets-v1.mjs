import { seal, verifySeal, hash, exact, text, clone, fail } from '../skill-production/common.mjs';

const FIELDS = ['when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven'];
export function createFactionReviewTargetsV1({ input, section, draft, indices }) {
  verifySeal(input);
  const targets = indices.map(index => {
    const r = draft.recommendations[index]; if (!r) fail('FACTION_REVIEW_TARGET_MISSING');
    const fields = FIELDS.flatMap(name => Array.isArray(r[name])
      ? r[name].map((value, n) => ({ path: name + '.' + n, text: value })) : [{ path: name, text: r[name] }]);
    return { targetId: 'advice-' + index + '-' + hash(r).slice(0, 12), index,
      recommendationHash: hash(r), title: r.title, recommendation: clone(r), fields };
  });
  const focusRefs = new Set(targets.flatMap(t => t.recommendation.sourceRefs));
  return seal({ version: 'faction_review_targets_v1', inputHash: input.hash, sectionId: section.id, draftHash: hash(draft), targets,
    focusedSources: input.frozenSources.prompt.sources.filter(s => focusRefs.has(s.ref)),
    completeContextStillRequired: true, identityBindingNotSemanticProof: true, trainingTruth: false });
}

// The host owns index mapping. Providers identify the explicitly supplied
// target and quote a field of that target; they never count the whole array.
export function validateTargetedFactionReviewV1(output, targets) {
  verifySeal(targets); exact(output, ['verdicts', 'coverage']);
  if (!Array.isArray(output.verdicts) || output.verdicts.length !== targets.targets.length) fail('FACTION_REVIEW_TARGET_DENOMINATOR');
  const pending = new Map(targets.targets.map(t => [t.targetId, t])), bindings = [];
  const verdicts = output.verdicts.map(v => {
    exact(v, ['targetId', 'title', 'focus', 'verdict', 'reason', 'sourceRefs']);
    const target = pending.get(v.targetId);
    if (!target || target.title !== v.title) fail('FACTION_REVIEW_TARGET_IDENTITY_MISMATCH');
    pending.delete(v.targetId);
    if (!Array.isArray(v.focus) || !v.focus.length || v.focus.length > 16) fail('FACTION_REVIEW_TARGET_FOCUS_REQUIRED');
    const evidence = v.focus.map(f => {
      exact(f, ['path', 'quote']); text(f.quote, 240);
      const field = target.fields.find(field => field.path === f.path);
      if (!field || f.quote.length < Math.min(8, field.text.length)) fail('FACTION_REVIEW_TARGET_QUOTE_MISMATCH');
      if (field.text.includes(f.quote)) return { kind: 'target_field_quote', path: f.path, quote: f.quote, fieldHash: hash(field.text) };
      // The observed review copied the COMPLETE field and appended one Chinese
      // sentence stop. This is not an exact quote: preserve both strings and
      // mark the single addition. No substring/fuzzy/word normalization, and
      // the verdict still requires a separate strictly exact target quote.
      if (!/[。.!?！？]$/u.test(field.text) && f.quote === field.text + '。') {
        return { kind: 'target_field_quote_added_terminal_stop_v1', path: f.path, quote: f.quote,
          matchedText: field.text, fieldHash: hash(field.text), addedTerminalStop: '。', rawQuoteExact: false };
      }
      // Observed output mixed exact original source passages with its exact
      // target quotes. Preserve them as SOURCE evidence, never pretend that
      // the English source text appeared in the candidate's Chinese field.
      const sources = targets.focusedSources.filter(s => Array.isArray(v.sourceRefs) && v.sourceRefs.includes(s.ref))
        .flatMap(s => s.passages.filter(p => p.text.includes(f.quote)).map(p => ({ ref: s.ref, spanId: p.spanId, passageHash: hash(p.text) })));
      if (!sources.length) fail('FACTION_REVIEW_TARGET_QUOTE_MISMATCH');
      return { kind: 'source_quote_not_target_quote', claimedPath: f.path, quote: f.quote, sources };
    });
    if (!evidence.some(e => e.kind === 'target_field_quote')) fail('FACTION_REVIEW_TARGET_QUOTE_REQUIRED');
    bindings.push({ targetId: target.targetId, index: target.index, recommendationHash: target.recommendationHash, evidence });
    return { index: target.index, verdict: v.verdict, reason: v.reason, sourceRefs: v.sourceRefs };
  });
  return seal({ review: { verdicts, coverage: clone(output.coverage) }, targetContractHash: targets.hash, bindings,
    rawOutputHash: hash(output), targetIdentityChecked: true, semanticCorrectnessProven: false, trainingTruth: false });
}

// Recovery changes only the reference representation. The model selects
// host-owned fields, never rewrites judgments or supplies replacement quotes.
// Original invalid/source-only focus remains explicit UNVERIFIED evidence.
export function planFactionReviewFieldBindingV1(output, targets) {
  verifySeal(targets); exact(output, ['verdicts', 'coverage']);
  if (!Array.isArray(output.verdicts) || output.verdicts.length !== targets.targets.length) fail('FACTION_REVIEW_TARGET_DENOMINATOR');
  const pending = new Map(targets.targets.map(t => [t.targetId, t]));
  const preservedJudgments = output.verdicts.map(v => {
    exact(v, ['targetId', 'title', 'focus', 'verdict', 'reason', 'sourceRefs']);
    const target = pending.get(v.targetId);
    if (!target || target.title !== v.title) fail('FACTION_REVIEW_TARGET_IDENTITY_MISMATCH');
    pending.delete(v.targetId);
    const { focus, ...judgment } = v; return clone(judgment);
  });
  return seal({ version: 'faction_review_field_binding_plan_v1', originalOutputHash: hash(output),
    targetContractHash: targets.hash, preservedJudgments,
    targetChoices: targets.targets.map(t => ({ targetId: t.targetId, title: t.title, fieldPaths: t.fields.map(f => f.path) })),
    operation: 'select_candidate_fields_only_no_verdict_reason_source_or_coverage_edit', trainingTruth: false });
}

export function applyFactionReviewFieldBindingV1(original, targets, plan, selection) {
  verifySeal(plan);
  if (plan.hash !== planFactionReviewFieldBindingV1(original, targets).hash) fail('FACTION_REVIEW_BINDING_PLAN_DRIFT');
  exact(selection, ['planHash', 'selections']);
  if (selection.planHash !== plan.hash) fail('FACTION_REVIEW_BINDING_PLAN_DRIFT');
  if (!Array.isArray(selection.selections) || selection.selections.length !== targets.targets.length) fail('FACTION_REVIEW_BINDING_SELECTION_INVALID');
  const pending = new Map(targets.targets.map(t => [t.targetId, t])), byId = new Map();
  for (const row of selection.selections) {
    exact(row, ['targetId', 'fieldPaths']);
    const target = pending.get(row.targetId);
    if (!target || !Array.isArray(row.fieldPaths) || !row.fieldPaths.length || row.fieldPaths.length > 3
      || new Set(row.fieldPaths).size !== row.fieldPaths.length) fail('FACTION_REVIEW_BINDING_SELECTION_INVALID');
    pending.delete(row.targetId);
    byId.set(row.targetId, row.fieldPaths.map(path => {
      const field = target.fields.find(f => f.path === path);
      if (!field) fail('FACTION_REVIEW_BINDING_SELECTION_INVALID');
      return { path, quote: field.text.slice(0, 240) };
    }));
  }
  const output = { verdicts: original.verdicts.map(v => ({ ...clone(v), focus: byId.get(v.targetId) })), coverage: clone(original.coverage) };
  validateTargetedFactionReviewV1(output, targets);
  return { output, receipt: seal({ version: 'faction_review_field_binding_receipt_v1', planHash: plan.hash,
    originalOutputHash: hash(original), selectionOutputHash: hash(selection), materializedOutputHash: hash(output),
    targetContractHash: targets.hash, selections: clone(selection.selections),
    originalFocus: original.verdicts.map(v => ({ targetId: v.targetId, focus: clone(v.focus) })),
    originalFocusVerified: false, quoteOrigin: 'host_materialized_from_model_selected_exact_candidate_field',
    verdictReasonSourceRefsAndCoverageUnchanged: true, semanticCorrectnessProven: false, trainingTruth: false }) };
}
