import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionWritingPlanV1, validateFactionReviewV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const actual = verifySeal(JSON.parse(await readFile(path.join(base, 'targeted-corrections-readiness.json'), 'utf8')));
const draft = actual.knownRuleCorrection.draft, section = createFactionWritingPlanV1(input).sections[0];
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: [4, 5] });
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let output, retry;
try {
  const id = 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.review-target-batch-v1.supportive.0.4';
  const get = suffix => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get('faction-v1-bcba77c39b85d99b5dbd', id + suffix).artifact)).value.output;
  output = get(''); retry = get('.schema');
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
const overflow = structuredClone(output); overflow.verdicts[0].focus = Array(17).fill(overflow.verdicts[0].focus[0]);
assert.throws(() => validateTargetedFactionReviewV1(overflow, targets), { code: 'FACTION_REVIEW_TARGET_FOCUS_REQUIRED' });
const files = ['packages/skill-production-v3/faction-review-targets-v1.mjs', 'scripts/verify-ticket-18-faction-review-evidence-binding-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 10, codeHashes, actualOutputHash: hash(output), bindingReceipt: bound,
  policy: 'typed_original_source_quotes_require_independent_exact_target_quote', providerCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'review-evidence-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 10, providerCalls: 0, hash: report.hash }));
