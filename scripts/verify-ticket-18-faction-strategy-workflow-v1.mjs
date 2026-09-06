import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { runDirectLoop } from '../packages/skill-production/loops.mjs';
import { createFactionReviewTargetsV1, validateTargetedFactionReviewV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { FACTION_AXES_V1, createFactionWritingPlanV1, validateFactionDraftV1, applyFactionStrategyPatchV1, validateFactionDraftBatchV1, inspectFactionBatchScopeV1, validateFactionReviewV1, createFactionRepairIssuesV1,
  produceFactionStrategyV1, inspectFactionCoverageLinksV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), reader = createEvidenceReader(catalogue);
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '-input.json'), 'utf8')))));
const policies = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '-known-rule-policy.json'), 'utf8')))));
const knownPolicy = input => policies.find(p => p.inputHash === input.hash);
const evidenceDb = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
try {
  const row = evidenceDb.prepare("SELECT response,usage FROM attempts WHERE run=? AND code='PROVIDER_RESPONSE_OUTPUT_TRUNCATED'").get('faction-v1-c05262b66b5603afecbb');
  const receipt = verifySeal(JSON.parse(row.response)).value.responseOutcome;
  assert.equal(receipt.finishReason, 'length'); assert.equal(receipt.syntaxIssue, 'incomplete');
  assert.equal(verifySeal(JSON.parse(row.usage)).value.outputUnits, 4096);
  const artifact = suffix => verifySeal(JSON.parse(evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(
    'faction-v1-66102d1817842a896f0b', 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.' + suffix).artifact)).value;
  const outline = artifact('generator-outline').output.outline;
  const completedRecommendations = [0, 2].flatMap(n => artifact('generator-items.' + n).output.items.map(item => item.value));
  const rejected = artifact('generator-items.4').output, params = { input: inputs[0], outline, indices: [4, 5], completedRecommendations };
  assert.equal(hash(rejected), hash(artifact('generator-items.4.schema').output));
  assert.throws(() => validateFactionDraftBatchV1(rejected, params), { code: 'FACTION_BATCH_DUPLICATE_RECOMMENDATION' });
  const issues = inspectFactionBatchScopeV1(rejected, params);
  assert.deepEqual(issues.targets.map(t => t.duplicatesCompletedIndices), [[0], [1]]);
  assert(issues.targets.some(t => t.missingSourceRefs.length));
  const relabelled = structuredClone(rejected);
  relabelled.items.forEach(item => { item.value.sourceRefs = outline[item.index].sourceRefs; });
  assert.throws(() => validateFactionDraftBatchV1(relabelled, params), { code: 'FACTION_BATCH_DUPLICATE_RECOMMENDATION' });
  const currentArtifact = suffix => verifySeal(JSON.parse(evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(
    'faction-v1-f93c0c1ba85b7c32f4b3', 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.' + suffix).artifact)).value;
  const actualDraft = { recommendations: [0, 2, '4.target-reconstruction.v1', '6.target-reconstruction.v1']
    .flatMap(n => currentArtifact('generator-items.' + n).output.items.map(item => item.value)) };
  const section = createFactionWritingPlanV1(inputs[0]).sections[0], review = currentArtifact('review.supportive.0').output;
  assert.equal(hash(review), hash(currentArtifact('review.supportive.0.schema').output));
  assert.equal(review.coverage.length, 26); assert.equal(section.requiredSourceRefs.length, 1);
  assert.equal(hash(validateFactionReviewV1(review, { input: inputs[0], section, draft: actualDraft })), hash(review));
  assert.equal(createFactionRepairIssuesV1(section, actualDraft, [review]).issues[0].index, 3);
  const additionalNegative = structuredClone(review); additionalNegative.coverage.find(c => c.sourceRef === 'source:tactical_cards:factory').verdict = 'uncertain';
  validateFactionReviewV1(additionalNegative, { input: inputs[0], section, draft: actualDraft });
  const negativeIssues = createFactionRepairIssuesV1(section, actualDraft, [additionalNegative]);
  assert(negativeIssues.issues.some(i => i.index === 0 && i.findings.some(f => f.kind === 'additional_cited_source_coverage')));
  assert(negativeIssues.issues.some(i => i.index === 2 && i.findings.some(f => f.kind === 'additional_cited_source_coverage')));
  const missing = structuredClone(review); missing.coverage.shift();
  assert.throws(() => validateFactionReviewV1(missing, { input: inputs[0], section, draft: actualDraft }), { code: 'FACTION_REVIEW_DENOMINATOR' });
  const uncited = structuredClone(review); uncited.coverage[1].sourceRef = 'source:army_units:zergling';
  assert.throws(() => validateFactionReviewV1(uncited, { input: inputs[0], section, draft: actualDraft }), { code: 'FACTION_REVIEW_COVERAGE_INVALID' });
  const truncated = verifySeal(JSON.parse(evidenceDb.prepare("SELECT response FROM attempts WHERE run=? AND code='PROVIDER_RESPONSE_OUTPUT_TRUNCATED'")
    .get('faction-v1-ed39f02a84aaff066af0').response)).value.responseOutcome;
  assert.equal(truncated.finishReason, 'length'); assert.equal(truncated.usage.outputUnits, 4096);
  const part = { verdicts: review.verdicts.slice(2, 4), coverage: [] };
  validateFactionReviewV1(part, { input: inputs[0], section, draft: actualDraft, reviewIndices: [2, 3], requiredSourceRefs: [] });
  assert.throws(() => validateFactionReviewV1(part, { input: inputs[0], section, draft: actualDraft, reviewIndices: [4, 5], requiredSourceRefs: [] }), { code: 'FACTION_REVIEW_SCOPE_INVALID' });
  const aliasedArtifact = suffix => verifySeal(JSON.parse(evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(
    'faction-v1-f8c57661dd395f069591', 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.review-batch.supportive.0.0' + suffix).artifact)).value;
  const aliased = aliasedArtifact('').output;
  assert.equal(hash(aliased), hash(aliasedArtifact('.schema').output));
  assert.deepEqual(aliased.coverage[0].sourceRefs, [aliased.coverage[0].sourceRef]);
  const aliasParams = { input: inputs[0], section, draft: actualDraft, reviewIndices: [0, 1] };
  assert.equal(hash(validateFactionReviewV1(aliased, aliasParams)), hash(aliased));
  assert.equal(aliased.verdicts[0].verdict, 'unsupported');
  const conflict = structuredClone(aliased); conflict.coverage[0].sourceRefs = ['source:army_units:marine'];
  assert.throws(() => validateFactionReviewV1(conflict, aliasParams), { code: 'FACTION_REVIEW_COVERAGE_ALIAS_CONFLICT' });
  const extraField = structuredClone(aliased); extraField.coverage[0].verdictOverride = 'supported';
  assert.throws(() => validateFactionReviewV1(extraField, aliasParams), { code: 'OUTPUT_SCHEMA_INVALID' });
  const indirectArtifact = suffix => verifySeal(JSON.parse(evidenceDb.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(
    'faction-v1-c89720ec563c3f2ecc1f', 'faction.terran_armed_forces.faction.terran_armed_forces.army_resources.1.review-target-batch-v1.adversarial.0.0' + suffix).artifact)).value.output;
  const indirect = indirectArtifact(''); assert.equal(hash(indirect), hash(indirectArtifact('.schema')));
  const correctedDraft = verifySeal(JSON.parse(await readFile(path.join(base, 'targeted-corrections-readiness.json'), 'utf8'))).knownRuleCorrection.draft;
  const binding = validateTargetedFactionReviewV1(indirect, createFactionReviewTargetsV1({ input: inputs[0], section, draft: correctedDraft, indices: [0, 1] }));
  const indirectParams = { input: inputs[0], section, draft: correctedDraft, reviewIndices: [0, 1] };
  // RED: a valid direct citation to item0 coexists with an explicitly indirect
  // claimed relation to item1. Never relabel item1 as a direct citation.
  assert.equal(hash(validateFactionReviewV1(binding.review, indirectParams)), hash(binding.review));
  const links = inspectFactionCoverageLinksV1(binding.review, correctedDraft);
  assert.deepEqual(links.links[0].directCitationIndices, [0]); assert.deepEqual(links.links[0].indirectClaimedIndices, [1]);
  assert.equal(links.links[0].indirectClaimVerified, false);
  const onlyIndirect = structuredClone(binding.review); onlyIndirect.coverage[0].recommendationIndices = [1];
  assert.throws(() => validateFactionReviewV1(onlyIndirect, indirectParams), { code: 'FACTION_REVIEW_COVERAGE_INVALID' });
  const unknownIndex = structuredClone(binding.review); unknownIndex.coverage[0].recommendationIndices.push(8);
  assert.throws(() => validateFactionReviewV1(unknownIndex, indirectParams), { code: 'FACTION_REVIEW_COVERAGE_INVALID' });
  const indirectNegative = structuredClone(onlyIndirect); indirectNegative.coverage[0].verdict = 'uncertain';
  validateFactionReviewV1(indirectNegative, indirectParams);
  const keptNegative = createFactionRepairIssuesV1(section, correctedDraft, [indirectNegative]);
  assert(keptNegative.issues.some(i => i.index === 1 && i.findings.some(f => f.verdict === 'uncertain')));
  assert(!keptNegative.issues.some(i => i.kind === 'assigned_source_omission'), 'Edit already represented sources, do not demand a ninth advice item');
} finally { evidenceDb.close(); }
const temp = await mkdtemp(path.join(base, 'workflow-test-'));
const stores = [], makeStore = name => { const s = openProductionStore(path.join(temp, name + '.sqlite'), { runId: name, recipeHash: hash(name) }); stores.push(s); return s; };
const recommendation = ref => ({ title: 'Injected conditional strategy fixture ' + ref, when: ['Only in the stated legal scope'],
  procedure: ['Compare enabled legal alternatives before preview'], alternatives: ['Conserve resources if the condition changes'],
  risk: 'Fixture only, not a measured battle strategy', reviseIf: ['The stated condition changes'], sourceRefs: [ref], unproven: ['Real match strength is not evaluated here'] });
const resultHashes = []; let calls = 0, maxTaskBytes = 0;
function modelFor(input, mode = 'positive') {
  return async ({ stageId, observed }) => {
    calls++;
    if (mode === 'payment') fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
    const task = observed.messages[0].content, w = JSON.parse(task.slice(task.indexOf('\nLOCAL WORKSPACE\n') + 17));
    assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n' + JSON.stringify(context.prompt)));
    assert.equal(w.overallSkill.sections.flatMap(s => s.claims).length, 522);
    assert.equal(w.operationalGuide.hash, input.operationalGuide.hash);
    assert.equal(w.factionEvidence.hash, input.factionEvidence.hash);
    assert(!task.includes('production-heldout.') && !task.includes('independent-condition.'));
    maxTaskBytes = Math.max(maxTaskBytes, Buffer.byteLength(task));
    let out;
    if (stageId.endsWith('.tutor') || stageId.includes('.proposer')) out = { lesson: ['Injected lesson for engineering only'], uncertainties: [] };
    else if (stageId.endsWith('.question-tree') || stageId.endsWith('.challenger')) {
      const field = stageId.endsWith('.challenger') ? 'probes' : 'questions';
      out = { branches: FACTION_AXES_V1.map(axis => ({ axis, [field]: [0, 1].map(n => ({ question: 'Injected question ' + n,
        sourceRefs: [input.factionEvidence.primarySource.ref] })) })) };
    } else if (stageId.includes('.reasoner')) out = { answers: w.questions.map(q => ({ index: q.index, answer: 'Injected answer, no quality claim', sourceRefs: q.sourceRefs })), uncertainties: [] };
    else if (stageId.includes('.judge')) out = { judgments: w.questions.map(q => ({ index: q.index, verdict: 'supported', reason: 'Injected judge', sourceRefs: q.sourceRefs })) };
    else if (stageId.includes('.generator-outline')) out = { outline: w.section.requiredSourceRefs.map(ref => ({ focus: 'Injected decision outline', sourceRefs: [ref] })) };
    else if (stageId.includes('.generator-items.')) {
      assert(w.indices.length <= 2); assert.equal(w.completedRecommendations.length, w.indices[0]);
      out = { items: w.indices.map(index => ({ index, value: recommendation(w.outline[index].sourceRefs[0]) })) };
      if (mode === 'wrong_target' && w.indices[0] > 0 && !stageId.includes('.target-reconstruction.')) {
        out = { items: w.indices.map((index, n) => ({ index, value: structuredClone(w.completedRecommendations[n]) })) };
      }
      if (stageId.includes('.target-reconstruction.')) {
        assert.equal(Object.keys(w).at(-1), 'outputRequestAtEnd');
        assert.equal(w.outputRequestAtEnd.action, 'write_only_these_new_outline_items');
        assert.deepEqual(w.outputRequestAtEnd.targets.map(t => t.index), w.indices);
        assert(w.targetIssue.targets.every(t => t.duplicatesCompletedIndices.length));
        assert(!w.rejectedOutput);
      }
    }
    else if (stageId.includes('.review-target-batch-v1.')) {
      assert(w.reviewIndices.length <= 2); assert.equal(w.draft.recommendations.length, w.section.requiredSourceRefs.length);
      assert.deepEqual(w.outputRequestAtEnd.targetContract.targets.map(t => t.index), w.reviewIndices);
      const negative = mode === 'blocked' || ['repair', 'no_progress', 'empty_patch'].includes(mode) && w.section.id.endsWith('army_resources.1') && /\.(supportive|adversarial)\.0\./.test(stageId);
      out = { verdicts: w.outputRequestAtEnd.targetContract.targets.map(t => ({ targetId: t.targetId, title: t.title,
        focus: [{ path: t.fields[0].path, quote: t.fields[0].text }], verdict: negative && t.index === 0 ? 'unsupported' : 'supported',
        reason: negative ? 'Injected missing condition requiring local repair' : 'Injected review only', sourceRefs: t.recommendation.sourceRefs })),
      coverage: w.coverageRequiredSourceRefs.map(sourceRef => ({ sourceRef, verdict: 'covered', reason: 'Injected coverage only',
        recommendationIndices: w.draft.recommendations.flatMap((r, i) => r.sourceRefs.includes(sourceRef) ? [i] : []) })) };
    } else if (stageId.includes('.editor.')) {
      const edited = structuredClone(w.draft.recommendations[0]);
      if (mode !== 'no_progress') edited.when.push('Injected missing condition now made explicit');
      out = { parentHash: w.parentHash, replacements: [{ index: 0, value: edited }], additions: [] };
      if (mode === 'empty_patch') out.replacements = [];
    } else if (stageId.includes('.source-reconstruction.')) {
      assert(!w.draft && w.repairScopes.length === 1);
      assert(w.preservedRecommendations.every(r => r.index !== w.repairScopes[0].index));
      const rebuilt = recommendation(w.repairScopes[0].sourceRefs[0]); rebuilt.when.push('Injected source-first corrected condition');
      out = { parentHash: w.parentHash, replacements: [{ index: w.repairScopes[0].index, value: rebuilt }], additions: [] };
    } else fail('UNEXPECTED_INJECTED_ROLE');
    return { command: { action: 'finish', content: out }, receiptHash: hash({ fixture: true, stageId, out }) };
  };
}
try {
  for (const [i, input] of inputs.entries()) {
    const plan = createFactionWritingPlanV1(input); assert.equal(plan.sections.length, i ? 8 : 7);
    const assigned = plan.sections.filter(s => ['unit_roles', 'card_packages'].includes(s.axis)).flatMap(s => s.requiredSourceRefs);
    assert.deepEqual(assigned.sort(), input.factionEvidence.armyPool.map(p => p.source.ref).sort());
    const store = makeStore('positive-' + i), runtime = createProductionRuntimeV3({ store, reader, context, verifier: {},
      model: modelFor(input, i ? 'positive' : 'repair'), dsh: { run: runDirectLoop } });
    const candidate = await produceFactionStrategyV1({ input, runtime, store, knownRulePolicy: knownPolicy(input) });
    assert(candidate.semanticReviewPassed); assert.equal(candidate.sections.length, plan.sections.length);
    assert.equal(candidate.skillId, 'skill.starcraft-tmg.faction.tactical-cards-' + input.factionRecordKey.split(':')[1].replaceAll('_', '-'));
    assert(!candidate.independentEvaluationPassed && !candidate.runtimeAccepted && !candidate.trainingTruth);
    for (const s of candidate.sections) for (const round of s.rounds) for (const route of ['supportive', 'adversarial']) {
      assert.deepEqual(round.reviewPartition.filter(p => p.route === route).flatMap(p => p.reviewIndices), s.draft.recommendations.map((_, n) => n));
      assert.deepEqual(round.reviewPartition.filter(p => p.route === route).flatMap(p => p.requiredSourceRefs), s.section.requiredSourceRefs);
    }
    if (!i) { assert.equal(candidate.sections[0].edits.length, 1); assert.equal(candidate.sections[0].rounds.length, 2); }
    const before = calls;
    assert.equal((await produceFactionStrategyV1({ input, runtime, store, knownRulePolicy: knownPolicy(input) })).hash, candidate.hash); assert.equal(calls, before);
    resultHashes.push(candidate.hash);
  }
  const input = inputs[0], draft = { recommendations: [recommendation(input.factionEvidence.primarySource.ref), recommendation(input.factionEvidence.armyPool[0].source.ref)] };
  for (const mode of ['blocked', 'no_progress', 'empty_patch', 'wrong_target']) {
    const store = makeStore(mode), runtime = createProductionRuntimeV3({ store, reader, context, verifier: {}, model: modelFor(input, mode), dsh: { run: runDirectLoop } });
    const r = await produceFactionStrategyV1({ input, runtime, store, knownRulePolicy: knownPolicy(input) });
    if (mode === 'blocked') { assert(!r.semanticReviewPassed); assert.equal(r.sections.length, 1); assert.equal(r.sections[0].rounds.length, 4); }
    else { assert(r.semanticReviewPassed); assert(r.roleArtifacts.some(a => a.id.includes(mode === 'wrong_target' ? '.target-reconstruction.' : '.source-reconstruction.'))); }
  }
  const issues = seal({ parentHash: hash(draft), issues: [{ kind: 'recommendation_source_or_condition', index: 0, oldHash: hash(draft.recommendations[0]) }] });
  assert.throws(() => applyFactionStrategyPatchV1({ parentHash: hash(draft), replacements: [{ index: 1, value: draft.recommendations[1] }], additions: [] }, { input, draft, issues }), { code: 'FACTION_PATCH_SCOPE_INVALID' });
  assert.throws(() => applyFactionStrategyPatchV1({ parentHash: hash(draft), replacements: [{ index: 0, value: draft.recommendations[0] }], additions: [] }, { input, draft, issues }), { code: 'FACTION_PATCH_NO_PROGRESS' });
  const unknown = structuredClone(draft); unknown.recommendations[0].sourceRefs = ['source:invented'];
  assert.throws(() => validateFactionDraftV1(unknown, input), { code: 'FACTION_SOURCE_REFERENCE_INVALID' });
  const payStore = makeStore('payment'), payRuntime = createProductionRuntimeV3({ store: payStore, reader, context, verifier: {}, model: modelFor(input, 'payment'), dsh: { run: runDirectLoop } });
  await assert.rejects(() => produceFactionStrategyV1({ input, runtime: payRuntime, store: payStore, knownRulePolicy: knownPolicy(input) }), { code: 'API_BALANCE_EXHAUSTED_STOP_ALL_WORK' });
} finally { for (const store of stores) store.close(); }
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-production-input-v1.mjs',
  'packages/skill-production-v3/runtime.mjs', 'packages/skill-production-v3/faction-review-targets-v1.mjs',
  'packages/skill-production-v3/faction-known-rule-findings-v1.mjs', 'scripts/verify-ticket-18-faction-strategy-workflow-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 41, inputHashes: inputs.map(i => i.hash), policyHashes: policies.map(p => p.hash), codeHashes, maxTaskBytes,
  injectedCandidateHashes: resultHashes, providerCalls: 0, dshSessions: 0, injectedRoleResultsOnly: true,
  actualStrategyQualityProven: false, trainingTruth: false });
await writeFile(path.join(base, 'workflow-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 41, maxTaskBytes, injectedModelCalls: calls, providerCalls: 0, hash: report.hash }));
