import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { applyIssuePatch, inspectDraft, validateReview, reconcileReviews } from '../packages/skill-production-v3/contracts.mjs';
import { planAddressBoundCitationRepair } from '../packages/skill-production-v3/citation-repair.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createFirstFivePlan } from '../packages/skill-production/coverage-plan.mjs';
import { mkdtemp } from 'node:fs/promises';
import { hash, seal } from '../packages/skill-production/common.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogue = await loadFrozenSkillEvidence(root), reader = createEvidenceReader(catalogue), context = createGlobalProductionContext(catalogue);
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const get = suffix => JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(
  'rules-v3-fb7f372f592ee9b558c8', 'rules-reading-003.' + suffix).artifact).value;
const draft = get('imported-seed').draft, issue = get('issues.0').records[0].history[0].issue;
for (const id of ['editor.0', 'editor.0.schema']) assert.throws(() => applyIssuePatch(draft, get(id).output, [issue]), { code: 'V3_CITATION_PATCH_UNAUTHORIZED' });
const combined = seal({ contextHash: context.hash, issues: [issue] });
const fixed = planAddressBoundCitationRepair(draft, combined, { reader, context });
assert(fixed && fixed.reReviewRequired && !fixed.changedProse);
assert.deepEqual(fixed.patch.citationAdditions, [{ claimId: 'claims.1', evidence: [{ ref: issue.ref, spanId: 'p2' }] }]);
assert.deepEqual(fixed.draft.claims.map(c => c.text), draft.claims.map(c => c.text));
assert.equal(fixed.draft.claims[1].evidence.length, draft.claims[1].evidence.length + 1);
assert(fixed.evidence[0].source.quote.length > 0);
assert.throws(() => planAddressBoundCitationRepair(fixed.draft, combined, { reader, context }), { code: 'V3_CITATION_PLAN_STALE' });
assert.equal(planAddressBoundCitationRepair(draft, seal({ contextHash: context.hash, issues: [{ ...issue, claimId: null }] }), { reader, context }), null);
assert.equal(planAddressBoundCitationRepair(draft, seal({ contextHash: context.hash, issues: [{ ...issue, kind: 'claim_review_disagreement' }] }), { reader, context }), null);
assert.throws(() => planAddressBoundCitationRepair(draft, seal({ contextHash: hash('wrong'), issues: [issue] }), { reader, context }));
const temp = await mkdtemp(path.join(root, 'build/ticket-18-production-v3/address-repair-'));
const store = openProductionStore(path.join(temp, 'runtime.sqlite'), { runId: 'actual-draft-fixture', recipeHash: hash('citation-runtime') });
let calls = 0;
const dsh = { async run({ task }) {
  calls++;
  // Replay real reviews through an injected harness. No editor/diagnoser may
  // run for this already-addressed citation-only issue.
  const role = task.includes('Role: supportive_reviewer') ? 'supportive_reviewer' : task.includes('Role: adversarial_reviewer') ? 'adversarial_reviewer' : null;
  assert(role, 'citation metadata repair must not ask the model to retype an address');
  return { final: get(role + '.0').output, injected: true, actualProvider: false };
} };
const result = await createProductionRuntimeV3({ store, context, reader, dsh }).produce(createFirstFivePlan(catalogue).packets[2], get('imported-seed'));
assert(result.semanticPassed); assert.equal(calls, 4); assert.equal(result.revisions[0].kind, 'host_address_bound_citation_patch');
assert.deepEqual(result.draft, fixed.draft); assert.equal(result.issueJournal.openIssues, 0); assert.equal(result.diagnostics.length, 0);
store.close();
// Actual packet013 reached both source reviews, then copied four addresses to
// seven claims twice. Every affected claim exceeded the unchanged four-ref cap.
const get13 = suffix => JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(
  'overall-v3-993702fcad1780fb75d7', 'rules-reading-013.' + suffix).artifact).value;
const packet13 = createFirstFivePlan(catalogue).packets[12], draft13 = get13('generator').output;
const inventory13 = inspectDraft(draft13, { packet: packet13, context, reader });
const reviews13 = ['supportive_reviewer', 'adversarial_reviewer'].map(role => validateReview(get13(role + '.0').output,
  inventory13, { packet: packet13, context, reader, reviewId: 'saved-013.' + role, role }));
const combined13 = reconcileReviews(inventory13, packet13, reviews13);
assert.equal(combined13.issues.length, 4);
assert(combined13.issues.every(i => i.kind === 'citation_missing' && !i.claimId));
for (const id of ['editor.0', 'editor.0.schema']) assert.throws(() => inspectDraft(
  applyIssuePatch(draft13, get13(id).output, combined13.issues).draft,
  { packet: packet13, context, reader }), { code: 'V3_EVIDENCE_COUNT_INVALID' });
const fixed13 = planAddressBoundCitationRepair(draft13, combined13, { reader, context, reviews: reviews13 });
assert(fixed13, 'multi-claim citation coverage must use bound reviewers without a paid editor');
assert.equal(fixed13.evidence.length, 4);
assert.deepEqual(fixed13.draft.claims.map(c => c.text), draft13.claims.map(c => c.text));
assert(fixed13.draft.claims.every(c => c.evidence.length <= 4));
const nextInventory13 = inspectDraft(fixed13.draft, { packet: packet13, context, reader });
for (const issue of combined13.issues) assert(!nextInventory13.unlinkedPassages.some(p => p.ref === issue.ref && p.spanId === issue.spanId));
assert.equal(planAddressBoundCitationRepair(draft13, combined13, { reader, context }), null);
assert.throws(() => planAddressBoundCitationRepair(draft13, combined13,
  { reader, context, reviews: [reviews13[0], reviews13[0]] }), { code: 'V3_CITATION_PLAN_REVIEW_DRIFT' });
assert.equal(hash(planAddressBoundCitationRepair(draft13, combined13,
  { reader, context, reviews: reviews13 })), hash(fixed13));
const fullDraft = structuredClone(draft13);
const extraAddresses = context.prompt.sources.flatMap(s => s.passages.map(p => ({ ref: s.ref, spanId: p.spanId })))
  .filter(a => !combined13.issues.some(i => i.ref === a.ref && i.spanId === a.spanId));
for (const claim of fullDraft.claims) for (const a of extraAddresses) {
  if (claim.evidence.length === 4) break;
  if (!claim.evidence.some(e => e.ref === a.ref && e.spanId === a.spanId)) claim.evidence.push(a);
}
const fullInventory = inspectDraft(fullDraft, { packet: packet13, context, reader });
const fullReviews = ['supportive_reviewer', 'adversarial_reviewer'].map(role => validateReview(get13(role + '.0').output,
  fullInventory, { packet: packet13, context, reader, reviewId: 'injected-full-cap.' + role, role }));
assert.equal(planAddressBoundCitationRepair(fullDraft, reconcileReviews(fullInventory, packet13, fullReviews),
  { reader, context, reviews: fullReviews }), null, 'capacity exhaustion must not erase evidence or widen the cap');
const store13 = openProductionStore(path.join(temp, 'runtime13.sqlite'), { runId: 'actual-013-fixture', recipeHash: hash('citation-runtime13') });
let calls13 = 0;
const result13 = await createProductionRuntimeV3({ store: store13, context, reader, dsh: { async run({ task }) {
  calls13++;
  const role = task.includes('Role: supportive_reviewer') ? 'supportive_reviewer' : task.includes('Role: adversarial_reviewer') ? 'adversarial_reviewer' : null;
  assert(role, 'multi-claim citation metadata needs no model editor or diagnosis');
  return { final: get13(role + '.0').output, injected: true, actualProvider: false };
} } }).produce(packet13, seal({ packetHash: packet13.hash, catalogueHash: catalogue.hash,
  draft: draft13, draftHash: hash(draft13), semanticAcceptanceInherited: false, fixtureOnly: true }));
assert(result13.semanticPassed);
assert.equal(calls13, 4, 'both fresh source reviews must run after the metadata patch');
assert.equal(result13.rounds.length, 2); assert.equal(result13.diagnostics.length, 0);
assert.equal(result13.issueJournal.openIssues, 0); assert.equal(result13.revisions.length, 1);
assert.deepEqual(result13.draft, fixed13.draft);
store13.close();
console.log(JSON.stringify({ passed: true, checks: 18, actualSavedFailedPatches: 4,
  correctedSpan: 'p2', multiClaimAddresses: 4, proseUnchanged: true, maxClaimEvidence: 4,
  injectedReviewReplay: true, providerCalls: 0 }));
db.close();
