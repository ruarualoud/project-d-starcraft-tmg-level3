import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { applyIssuePatch } from '../packages/skill-production-v3/contracts.mjs';
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
console.log(JSON.stringify({ passed: true, checks: 9, actualSavedFailedPatches: 2, correctedSpan: 'p2', injectedReviewReplay: true, providerCalls: 0 }));
db.close();
