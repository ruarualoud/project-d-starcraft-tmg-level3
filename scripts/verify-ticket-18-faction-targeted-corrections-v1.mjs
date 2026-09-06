import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyFactionStrategyPatchV1, createFactionWritingPlanV1, createFactionRepairIssuesV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { createFactionKnownRulePolicyV1, correctKnownFactionRuleFailuresV1, assertNoKnownFactionRuleFailureV1, mergeFactionKnownSourceIssuesV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { adjudicateFactionSourceScopesV1 } from '../packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs';
import { loadFrozenSkillEvidence } from '../packages/skill-production/evidence.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const input = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-input.json'), 'utf8')));
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let draft, emptyPatch, localIssues, shifted, scopeIssues;
try {
  const run = 'faction-v1-c6b855593093fd3f6ecb', sectionId = 'faction.terran_armed_forces.army_resources.1';
  const artifact = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id).artifact)).value;
  const prefix = 'faction.terran_armed_forces.' + sectionId + '.';
  draft = { recommendations: [0, 2, '4.target-reconstruction.v1', '6.target-reconstruction.v1']
    .flatMap(n => artifact(prefix + 'generator-items.' + n).output.items.map(r => r.value)) };
  emptyPatch = artifact(prefix + 'editor.0.1').output;
  const issues = artifact(sectionId + '.issue-journal.0').issues;
  assert.equal(hash(draft), issues.parentHash);
  const { hash: ignored, ...body } = issues;
  localIssues = seal({ ...body, issues: [issues.issues.find(i => i.index === 3)], openIssues: 1 });
  shifted = artifact(prefix + 'review-batch.supportive.0.4').output;
  scopeIssues = verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(
    'faction-v1-dede855c43844b970012', sectionId + '.issue-journal.0').artifact)).value.issues;
} finally { db.close(); }
// Red on the actual call-site failure before the classifier fix.
assert.throws(() => applyFactionStrategyPatchV1(emptyPatch, { input, draft, issues: localIssues }), { code: 'FACTION_PATCH_NO_PROGRESS' });
const section = createFactionWritingPlanV1(input).sections[0];
const targets = createFactionReviewTargetsV1({ input, section, draft, indices: [4, 5] });
assert.equal(targets.draftHash, hash(draft)); assert.equal(targets.targets[0].recommendationHash, hash(draft.recommendations[4]));
assert.throws(() => validateTargetedFactionReviewV1(shifted, targets), { code: 'OUTPUT_SCHEMA_INVALID' });
const shaped = { verdicts: targets.targets.map((t, n) => ({ targetId: t.targetId, title: t.title,
  focus: [{ path: 'procedure.0', quote: draft.recommendations[t.index - 1].procedure[0].slice(0, 180) }],
  verdict: shifted.verdicts[n].verdict, reason: shifted.verdicts[n].reason, sourceRefs: shifted.verdicts[n].sourceRefs })), coverage: [] };
assert.throws(() => validateTargetedFactionReviewV1(shaped, targets), { code: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH' });
const valid = structuredClone(shaped);
valid.verdicts.forEach((v, n) => { v.focus[0].quote = targets.targets[n].recommendation.procedure[0].slice(0, 180); v.verdict = 'unsupported'; v.reason = 'Injected identity test only, not a source verdict'; });
const bound = validateTargetedFactionReviewV1(valid, targets);
assert.deepEqual(bound.review.verdicts.map(v => v.index), [4, 5]); assert(bound.review.verdicts.every(v => v.verdict === 'unsupported'));
const wrongTitle = structuredClone(valid); wrongTitle.verdicts[0].title = draft.recommendations[3].title;
assert.throws(() => validateTargetedFactionReviewV1(wrongTitle, targets), { code: 'FACTION_REVIEW_TARGET_IDENTITY_MISMATCH' });
const unknown = structuredClone(valid); unknown.verdicts[0].targetId = 'invented';
assert.throws(() => validateTargetedFactionReviewV1(unknown, targets), { code: 'FACTION_REVIEW_TARGET_IDENTITY_MISMATCH' });
const duplicate = structuredClone(valid); duplicate.verdicts[1] = duplicate.verdicts[0];
assert.throws(() => validateTargetedFactionReviewV1(duplicate, targets), { code: 'FACTION_REVIEW_TARGET_IDENTITY_MISMATCH' });
assert.equal(bound.semanticCorrectnessProven, false);
const [catalogue, { dataset }] = await Promise.all([loadFrozenSkillEvidence(root), loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root })]);
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const policy = createFactionKnownRulePolicyV1({ input, drills });
assert.throws(() => assertNoKnownFactionRuleFailureV1({ input, policy, draft }), { code: 'FACTION_KNOWN_RULE_FAILURE' });
const correction = correctKnownFactionRuleFailuresV1({ input, policy, draft });
assert.equal(correction.patches.length, 1); assert.equal(correction.patches[0].index, 2); assert.equal(correction.patches[0].path, 'procedure.1');
assert.throws(() => assertNoKnownFactionRuleFailureV1({ input, policy, draft: correction.draft }), { code: 'FACTION_KNOWN_RULE_FAILURE' });
const sourceIssues = mergeFactionKnownSourceIssuesV1({ input, policy, draft: correction.draft,
  issues: createFactionRepairIssuesV1(section, correction.draft, []) });
assert.equal(sourceIssues.knownSourceFindings, 6); assert.equal(sourceIssues.openIssues, 4);
assert.deepEqual(sourceIssues.issues.map(i => i.index), [2, 4, 6, 7]);
assert(sourceIssues.issues.every(i => i.findings.every(f => f.verdict === 'unsupported' && f.sourceEvidence.length > 0)));
const supportedModel = { verdicts: correction.draft.recommendations.map((r, index) => ({ index, verdict: 'supported' })), coverage: [] };
assert.equal(mergeFactionKnownSourceIssuesV1({ input, policy, draft: correction.draft,
  issues: createFactionRepairIssuesV1(section, correction.draft, [supportedModel]) }).hash, sourceIssues.hash,
  'Model consensus cannot erase independently found source errors');
const adjudication = adjudicateFactionSourceScopesV1({ input, draft: correction.draft, issues: scopeIssues });
assert.equal(adjudication.resolutions.length, 1); assert.equal(adjudication.openIssues.openIssues, 4);
assert.deepEqual(adjudication.openIssues.issues.map(i => i.index), [2, 4, 6, 7]);
assert.equal(adjudication.resolutions[0].issueHash, hash(scopeIssues.issues[0]));
assert.equal(adjudication.resolutions[0].actualRulesExecution, false);
const { hash: ignoredScope, ...scopeBody } = scopeIssues;
const changedVerdict = structuredClone(scopeBody); changedVerdict.issues[0].findings[0].verdict = 'unsupported';
assert.equal(adjudicateFactionSourceScopesV1({ input, draft: correction.draft, issues: seal(changedVerdict) }).resolutions.length, 0);
const extraFinding = structuredClone(scopeBody); extraFinding.issues[0].findings.push({ kind: 'independent_source_counterexample', verdict: 'unsupported' });
assert.equal(adjudicateFactionSourceScopesV1({ input, draft: correction.draft, issues: seal(extraFinding) }).resolutions.length, 0);
const changedAdvice = structuredClone(correction.draft); changedAdvice.recommendations[3].procedure.push('Injected different advice');
assert.equal(adjudicateFactionSourceScopesV1({ input, draft: changedAdvice, issues: seal({ ...scopeBody, parentHash: hash(changedAdvice) }) }).resolutions.length, 0);
const changedInput = structuredClone(input); delete changedInput.hash;
changedInput.factionEvidence.armyPool.find(p => p.source.recordKey === 'army_units:medic').source.content.upgrades.find(a => a.name === 'Advanced Medic Facilities').description += ' changed';
assert.throws(() => adjudicateFactionSourceScopesV1({ input: seal(changedInput), draft: correction.draft, issues: scopeIssues }), { code: 'FACTION_SCOPE_ADJUDICATION_SOURCE_DRIFT' });
assert(correction.draft.recommendations[2].procedure[1].includes('Armory（30瓦斯'));
assert(correction.draft.recommendations[2].procedure[1].includes('不证明更便宜的选择实战更强'));
assert.equal(correction.draft.recommendations[2].sourceRefs.at(-1), 'source:tactical_cards:armory');
const restored = structuredClone(correction.draft); restored.recommendations[2].procedure[1] = correction.patches[0].oldText;
restored.recommendations[2].sourceRefs.pop(); assert.equal(hash(restored), hash(draft), 'Every unflagged field must remain identical');
assert.throws(() => assertNoKnownFactionRuleFailureV1({ input, policy, draft: restored }), { code: 'FACTION_KNOWN_RULE_FAILURE' });
const wrapped = structuredClone(draft); wrapped.recommendations[2].procedure[1] = '前缀：' + wrapped.recommendations[2].procedure[1] + '。';
assert.throws(() => assertNoKnownFactionRuleFailureV1({ input, policy, draft: wrapped }), { code: 'FACTION_KNOWN_RULE_FAILURE' });
assert.equal(correctKnownFactionRuleFailuresV1({ input, policy, draft: correction.draft }).patches.length, 0);
const { hash: ignoredPolicy, ...policyBody } = policy;
assert.throws(() => correctKnownFactionRuleFailuresV1({ input, policy: seal({ ...policyBody, inputHash: hash('other') }), draft }), { code: 'FACTION_KNOWN_RULE_POLICY_DRIFT' });
const policies = [policy];
const zergInput = verifySeal(JSON.parse(await readFile(path.join(base, 'zerg_swarm-input.json'), 'utf8')));
policies.push(createFactionKnownRulePolicyV1({ input: zergInput, drills })); assert.equal(policies[1].findings.length, 0);
for (const [n, p] of policies.entries()) await writeFile(path.join(base, (n ? 'zerg_swarm' : 'terran_armed_forces') + '-known-rule-policy.json'), JSON.stringify(p, null, 2));
const files = ['packages/skill-production-v3/faction-review-targets-v1.mjs', 'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'packages/skill-production-v3/faction-source-scope-adjudication-v1.mjs',
  'packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-evaluation/faction-roster-choice-drills-v1.mjs', 'scripts/verify-ticket-18-faction-targeted-corrections-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 28, codeHashes, inputHashes: [input.hash, zergInput.hash], policyHashes: policies.map(p => p.hash),
  actualScopeAdjudication: adjudication,
  actualEmptyPatchHash: hash(emptyPatch), actualShiftedReviewHash: hash(shifted), actualDraftHash: hash(draft), knownRuleCorrection: correction,
  actualShiftedQuotesRejected: true, rawHistoricalFailurePreserved: true, actualProviderCalls: 0, semanticEffectivenessProven: false, trainingTruth: false });
await writeFile(path.join(base, 'targeted-corrections-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 28, hash: report.hash, providerCalls: 0, policyHashes: policies.map(p => p.hash) }));
