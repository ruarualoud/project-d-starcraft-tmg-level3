import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1, planFactionReviewFieldBindingV1,
  applyFactionReviewFieldBindingV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionWritingPlanV1, validateFactionReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const actual = verifySeal(JSON.parse(await readFile(path.join(base, 'targeted-corrections-readiness.json'), 'utf8')));
const draft = actual.knownRuleCorrection.draft, section = createFactionWritingPlanV1(input).sections[0];
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: [4, 5] });
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let output, retry, repairedReview, repairedRetry, sourceOnlyReview, sourceOnlyRetry, actualSelection, unitReview, unitSelection, unitDraft;
try {
  const id = 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.review-target-batch-v1.supportive.0.4';
  const get = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get('faction-v1-bcba77c39b85d99b5dbd', id + suffix).artifact)).value.output;
  output = get(''); retry = get('.schema');
  const repairedId = 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.review-target-batch-v1.supportive.1.2';
  const repaired = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get('faction-v1-9d47758f9f7f7625a1af', repairedId + suffix).artifact)).value.output;
  repairedReview = repaired(''); repairedRetry = repaired('.schema');
  const sourceOnly = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get('faction-v1-79a14e9ce23ff5deb7d0', repairedId.replace('supportive.1.2', 'supportive.1.4') + suffix).artifact)).value.output;
  sourceOnlyReview = sourceOnly(''); sourceOnlyRetry = sourceOnly('.schema');
  actualSelection = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get('faction-v1-de32d27f150eb1349dea', repairedId.replace('supportive.1.2', 'supportive.1.4') + '.field-binding.v1').artifact)).value.output;
  const unitPrefix = 'faction.terran_armed_forces.faction.terran_armed_forces.unit_roles.1.';
  const unit = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
    .get('faction-v1-1c95d67afe4e20b85ef0', unitPrefix + suffix).artifact)).value.output;
  unitReview = unit('review-target-batch-v1.supportive.0.6'); unitSelection = unit('review-target-batch-v1.supportive.0.6.field-binding.v1');
  unitDraft = { recommendations: ['0', '2', '4.target-reconstruction.v1', '6.target-reconstruction.v1']
    .flatMap(n => unit('generator-items.' + n).items.map(i => i.value)) };
} finally { db.close(); }
assert.equal(hash(output), hash(retry));
// RED on the actual four-focus response before the typed evidence recovery.
const bound = validateTargetedFactionReviewV1(output, targets);
validateFactionReviewV1(bound.review, { input, section, draft, reviewIndices: [4, 5], requiredSourceRefs: [] });
assert.deepEqual(bound.review.verdicts.map(v => v.index), [4, 5]);
assert.equal(bound.rawOutputHash, hash(output)); assert.equal(bound.semanticCorrectnessProven, false);
assert.equal(bound.bindings.flatMap(b => b.evidence).filter(e => e.kind === 'source_quote_not_target_quote').length, 2);
assert(bound.bindings.every(b => b.evidence.some(e => e.kind === 'target_field_quote')));
const noTargetQuote = structuredClone(output); noTargetQuote.verdicts[0].focus = [noTargetQuote.verdicts[0].focus[0]];
assert.throws(() => validateTargetedFactionReviewV1(noTargetQuote, targets), { code: 'FACTION_REVIEW_TARGET_QUOTE_REQUIRED' });
const unrelated = structuredClone(output); unrelated.verdicts[0].focus[0].quote = draft.recommendations[3].procedure[0];
assert.throws(() => validateTargetedFactionReviewV1(unrelated, targets), { code: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH' });
const undeclared = structuredClone(output); undeclared.verdicts[0].sourceRefs = ['source:army_units:medic'];
assert.throws(() => validateTargetedFactionReviewV1(undeclared, targets), { code: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH' });
const invented = structuredClone(output); invented.verdicts[0].focus[0].quote += ' invented';
assert.throws(() => validateTargetedFactionReviewV1(invented, targets), { code: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH' });
const negative = structuredClone(output); negative.verdicts[0].verdict = 'unsupported'; negative.verdicts[0].reason = 'Injected negative must remain negative';
assert.equal(validateTargetedFactionReviewV1(negative, targets).review.verdicts[0].verdict, 'unsupported');
const overflow = structuredClone(output); overflow.verdicts[0].focus = Array(Math.max(16, targets.targets[0].fields.length) + 1).fill(overflow.verdicts[0].focus[0]);
assert.throws(() => validateTargetedFactionReviewV1(overflow, targets), { code: 'FACTION_REVIEW_TARGET_FOCUS_REQUIRED' });
// Actual post-repair review appended exactly one Chinese full stop to the
// complete risk field. Keep the original quote and disclose the non-exact
// punctuation; never fuzzy-match words, amounts, negation or another field.
const inspection = verifySeal(JSON.parse(await readFile(path.join(base, 'faction-v1-9d47758f9f7f7625a1af/first-repair-inspection.json'), 'utf8')));
const repairedDraft = inspection.after;
assert.equal(hash(repairedReview), hash(repairedRetry));
const repairedTargets = createFactionReviewTargetsV1({ input, section, draft: repairedDraft, indices: [2, 3] });
const punctuationBound = validateTargetedFactionReviewV1(repairedReview, repairedTargets);
validateFactionReviewV1(punctuationBound.review, { input, section, draft: repairedDraft, reviewIndices: [2, 3], requiredSourceRefs: [] });
const punctuation = punctuationBound.bindings[0].evidence.find(e => e.kind === 'target_field_quote_added_terminal_stop_v1');
assert(punctuation); assert.equal(punctuation.quote, repairedDraft.recommendations[2].risk + '。');
assert.equal(punctuation.matchedText, repairedDraft.recommendations[2].risk);
assert.equal(punctuation.addedTerminalStop, '。'); assert.equal(punctuation.rawQuoteExact, false);
assert.equal(punctuation.fieldHash, hash(repairedDraft.recommendations[2].risk));
assert.equal(punctuationBound.rawOutputHash, hash(repairedReview));
assert.deepEqual(punctuationBound.review.verdicts.map(v => v.verdict), repairedReview.verdicts.map(v => v.verdict));
assert.equal(punctuationBound.semanticCorrectnessProven, false);
for (const quote of [punctuation.quote + '。', punctuation.matchedText + '！', punctuation.matchedText + '?',
  punctuation.matchedText.replace('10瓦斯', '20瓦斯') + '。', punctuation.matchedText.replace('不能', '能') + '。',
  punctuation.matchedText.slice(5) + '。']) {
  const bad = structuredClone(repairedReview); bad.verdicts[0].focus[2].quote = quote;
  assert.throws(() => validateTargetedFactionReviewV1(bad, repairedTargets), { code: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH' });
}
const punctuationOnly = structuredClone(repairedReview); punctuationOnly.verdicts[0].focus = [punctuationOnly.verdicts[0].focus[2]];
assert.throws(() => validateTargetedFactionReviewV1(punctuationOnly, repairedTargets), { code: 'FACTION_REVIEW_TARGET_QUOTE_REQUIRED' });
const punctuationNegative = structuredClone(repairedReview); punctuationNegative.verdicts[0].verdict = 'unsupported';
assert.equal(validateTargetedFactionReviewV1(punctuationNegative, repairedTargets).review.verdicts[0].verdict, 'unsupported');
assert.equal(hash(sourceOnlyReview), hash(sourceOnlyRetry));
const sourceOnlyTargets = createFactionReviewTargetsV1({ input, section, draft: repairedDraft, indices: [4, 5] });
assert.throws(() => validateTargetedFactionReviewV1(sourceOnlyReview, sourceOnlyTargets), { code: 'FACTION_REVIEW_TARGET_QUOTE_REQUIRED' });
const plan = planFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets);
const selection = { planHash: plan.hash, selections: plan.targetChoices.map(t => ({ targetId: t.targetId, fieldPaths: ['procedure.0', 'reviseIf.1'] })) };
const rebound = applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, selection);
const selectedBound = validateTargetedFactionReviewV1(rebound.output, sourceOnlyTargets);
validateFactionReviewV1(selectedBound.review, { input, section, draft: repairedDraft, reviewIndices: [4, 5], requiredSourceRefs: [] });
const judgments = out => out.verdicts.map(({ focus, ...v }) => v);
assert.deepEqual(judgments(rebound.output), judgments(sourceOnlyReview));
assert.deepEqual(rebound.output.coverage, sourceOnlyReview.coverage);
assert.equal(rebound.receipt.originalOutputHash, hash(sourceOnlyReview));
assert.deepEqual(rebound.receipt.originalFocus, sourceOnlyReview.verdicts.map(v => ({ targetId: v.targetId, focus: v.focus })));
assert.equal(rebound.receipt.originalFocusVerified, false); assert.equal(rebound.receipt.semanticCorrectnessProven, false);
for (const mutation of [s => { s.planHash = hash('stale'); }, s => { s.selections.pop(); },
  s => { s.selections[0].targetId = 'neighbor'; }, s => { s.selections[0].fieldPaths = ['made.up']; },
  s => { s.selections[0].fieldPaths = []; }, s => { s.selections[0].fieldPaths = ['risk', 'risk']; },
  s => { s.selections[0].verdict = 'supported'; }, s => { s.selections[1].targetId = s.selections[0].targetId; }]) {
  const bad = structuredClone(selection); mutation(bad);
  assert.throws(() => applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, bad));
}
const changedReview = structuredClone(sourceOnlyReview); changedReview.verdicts[0].verdict = 'unsupported';
assert.throws(() => applyFactionReviewFieldBindingV1(changedReview, sourceOnlyTargets, plan, selection), { code: 'FACTION_REVIEW_BINDING_PLAN_DRIFT' });
const negativePlan = planFactionReviewFieldBindingV1(changedReview, sourceOnlyTargets);
assert.equal(applyFactionReviewFieldBindingV1(changedReview, sourceOnlyTargets, negativePlan,
  { ...selection, planHash: negativePlan.hash }).output.verdicts[0].verdict, 'unsupported');
const actualSelected = applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, actualSelection);
assert.equal(actualSelection.planHash, 'reviewBindingRepair.planHash');
assert.equal(actualSelected.receipt.planHashBinding, 'host_verified_plan_not_model_echo');
assert.equal(actualSelected.receipt.modelPlanHashEchoExact, false);
assert.equal(actualSelected.receipt.modelPlanHashValue, actualSelection.planHash);
assert.deepEqual(actualSelected.receipt.selections.map(s => s.fieldPaths.length), [4, 4]);
assert.deepEqual(judgments(actualSelected.output), judgments(sourceOnlyReview));
const { planHash: omitted, ...noEcho } = actualSelection;
assert.deepEqual(applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, noEcho).output, actualSelected.output);
const otherAlias = structuredClone(actualSelection); otherAlias.planHash = 'another.planHash';
assert.throws(() => applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, otherAlias), { code: 'FACTION_REVIEW_BINDING_PLAN_DRIFT' });
const tooManyFields = structuredClone(actualSelection); tooManyFields.selections[0].fieldPaths = [...sourceOnlyTargets.targets[0].fields.map(f => f.path), 'outside.bound'];
assert.equal(tooManyFields.selections[0].fieldPaths.length, 17);
assert.throws(() => applyFactionReviewFieldBindingV1(sourceOnlyReview, sourceOnlyTargets, plan, tooManyFields), { code: 'FACTION_REVIEW_BINDING_SELECTION_INVALID' });
const unitSection = createFactionWritingPlanV1(input).sections[1];
const unitTargets = createFactionReviewTargetsV1({ input, section: unitSection, draft: unitDraft, indices: [6] });
const unitPlan = planFactionReviewFieldBindingV1(unitReview, unitTargets);
assert.equal(unitSelection.selections[0].fieldPaths.length, 21); assert.equal(unitTargets.targets[0].fields.length, 21);
const unitRebound = applyFactionReviewFieldBindingV1(unitReview, unitTargets, unitPlan, unitSelection);
assert.equal(unitRebound.output.verdicts[0].focus.length, 21);
assert.deepEqual(judgments(unitRebound.output), judgments(unitReview));
validateFactionReviewV1(validateTargetedFactionReviewV1(unitRebound.output, unitTargets).review,
  { input, section: unitSection, draft: unitDraft, reviewIndices: [6], requiredSourceRefs: [] });
const unitOverflow = structuredClone(unitSelection); unitOverflow.selections[0].fieldPaths.push('outside.bound');
assert.throws(() => applyFactionReviewFieldBindingV1(unitReview, unitTargets, unitPlan, unitOverflow), { code: 'FACTION_REVIEW_BINDING_SELECTION_INVALID' });
const files = ['packages/skill-production-v3/faction-review-targets-v1.mjs', 'scripts/verify-ticket-18-faction-review-evidence-binding-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 38, codeHashes, actualOutputHash: hash(output), bindingReceipt: bound,
  actualPostRepairOutputHash: hash(repairedReview), punctuationBindingReceipt: punctuationBound,
  sourceOnlyReviewHash: hash(sourceOnlyReview), fieldSelectionRecovery: rebound.receipt,
  actualFieldSelectionRecovery: actualSelected.receipt,
  actualCompleteFieldSelectionRecovery: unitRebound.receipt,
  policy: 'typed_original_source_quotes_require_independent_exact_target_quote', providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'review-evidence-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 38, providerCalls: 0, hash: report.hash }));
