import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionSourceDependencyContextV1 } from '../packages/skill-production-v3/faction-source-dependency-context-v1.mjs';
import { createFactionRepairRegressionGuardV1, inspectFactionRepairRegressionV1,
  assertNoFactionImportedRepairRegressionV1 } from '../packages/skill-production-v3/faction-repair-regression-guard-v1.mjs';
import { materializeFactionPhaseFieldSeedV1 } from '../packages/skill-production-v3/faction-phase-field-seed-v1.mjs';
import { createFactionWritingPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { factionConsumerContextV1 } from '../packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [input, knownRulePolicy, diagnosis] = await Promise.all([json('terran_armed_forces-input'),
  json('terran_armed_forces-known-rule-policy'), json('faction-v1-182042133d7ba5b21c2a/phase-regression-diagnosis')]);
const run = 'phase-repair-bd58d5270d852324f694';
const seed = { sourceSection: await json(run + '/source-section'), candidate: await json(run + '/candidate'),
  evidence: await json(run + '/verified-evidence'), capture: await json(run + '/source-capture') };
const { binding, draft: checkpoint, clarification } = materializeFactionPhaseFieldSeedV1({ input, seed });
const imported = seal({ version: 'verified_phase_field_import_v1', parentHash: binding.parentDraftHash,
  resultHash: binding.repairedDraftHash, binding, actualPatch: seed.candidate.patch, hostClarification: clarification,
  oldProviderOutputOverwritten: false, oldReviewAcceptanceInherited: false,
  priorPendingReviewPreservedInEvidence: true, freshWholeSectionReviewRequired: true, trainingTruth: false });
const guard = createFactionRepairRegressionGuardV1({ input, imported });
const actualDraft = diagnosis.captured.at(-1).request.workspace.draft;
let checks = 0; const check = (name, fn) => { fn(); checks++; };
const reseal = (v, update) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...update }); };
check('four exact paid requests support the captured regression, no new inference of delivery', () => {
  assert.equal(diagnosis.loops.length, 4); assert.equal(diagnosis.delivery.receiptHashes.length, 4);
  assert(diagnosis.delivery.completeRequestsMatchedByHash); assert(!diagnosis.activeMarkupLostInRequest);
});
check('all eleven actual repaired fields are checkpoints, not general correctness claims', () => {
  assert.equal(guard.protectedFields.length, 11); assert.equal(guard.entireDraftCorrectnessProven, false);
  assert(!inspectFactionRepairRegressionV1({ input, guard, draft: checkpoint }).requiresRevalidation);
});
check('actual edit touches four checkpoints, including three false Tenacity fields', () => {
  const audit = inspectFactionRepairRegressionV1({ input, guard, draft: actualDraft });
  assert.deepEqual(audit.changes.map(c => c.index + '.' + c.path), ['0.procedure.0', '0.alternatives.1', '0.risk', '1.risk']);
  assert(audit.requiresRevalidation); assert(!audit.sourceTruthInferredFromHash);
});
check('every protected field can independently invalidate the checkpoint', () => {
  for (const t of guard.protectedFields) {
    const draft = structuredClone(checkpoint), parts = t.path.split('.');
    if (parts.length === 1) draft.recommendations[t.index][parts[0]] += ' Modified claim.';
    else draft.recommendations[t.index][parts[0]][Number(parts[1])] += ' Modified claim.';
    assert.equal(inspectFactionRepairRegressionV1({ input, guard, draft }).changes.length, 1);
  }
});
check('deleted/reordered fields cannot evade a checkpoint', () => {
  const draft = structuredClone(checkpoint); draft.recommendations[0].procedure.shift();
  assert(inspectFactionRepairRegressionV1({ input, guard, draft }).requiresRevalidation);
  draft.recommendations.reverse(); assert(inspectFactionRepairRegressionV1({ input, guard, draft }).requiresRevalidation);
});
check('unrelated strategy wording can change without being declared correct', () => {
  const draft = structuredClone(checkpoint); draft.recommendations[0].reviseIf[0] += ' Unverified strategy change.';
  const result = inspectFactionRepairRegressionV1({ input, guard, draft });
  assert(!result.requiresRevalidation); assert(!result.candidateAccepted);
});
check('changed legitimate wording requires evidence too, not an automatic false verdict', () => {
  const draft = structuredClone(checkpoint); draft.recommendations[0].risk += '。';
  assert.equal(inspectFactionRepairRegressionV1({ input, guard, draft }).changes[0].disposition,
    'source_revalidation_required_not_automatically_false');
});
for (const update of [{ resultHash: hash('wrong') }, { oldReviewAcceptanceInherited: true }, { trainingTruth: true }])
  check('forged import rejected ' + Object.keys(update)[0], () => assert.throws(() =>
    createFactionRepairRegressionGuardV1({ input, imported: reseal(imported, update) }), { code: 'FACTION_REPAIR_GUARD_IMPORT_DRIFT' }));
const plan = createFactionWritingPlanV1(input);
const candidate = seal({ schema: 'starcraft_faction_strategy_candidate_v1', inputHash: input.hash, planHash: plan.hash,
  factionRecordKey: input.factionRecordKey, sourceBinding: input.sourceBinding, overallDependencyHash: input.overallDependencyHash,
  knownRulePolicyHash: knownRulePolicy.hash, semanticReviewPassed: true, runtimeAccepted: false, trainingTruth: false,
  phaseFieldBinding: binding, fixtureOnly: true, sections: plan.sections.map(section => ({ section, semanticReviewPassed: true,
    edits: section.id === binding.sectionId ? [imported] : [],
    draft: section.id === binding.sectionId ? actualDraft : { recommendations: [{ title: 'Engineering fixture',
      when: ['Fixture'], procedure: ['Fixture'], alternatives: ['Fixture'], risk: 'Fixture', reviseIf: ['Fixture'],
      unproven: ['Quality unknown'], sourceRefs: section.requiredSourceRefs }] } })) });
check('supported flags cannot waive actual regression', () => assert.throws(() =>
  assertNoFactionImportedRepairRegressionV1({ input, candidate }), { code: 'FACTION_REPAIRED_FIELDS_REQUIRE_REVALIDATION' }));
check('removing import while keeping its bound seed fails', () => assert.throws(() => assertNoFactionImportedRepairRegressionV1({ input,
  candidate: reseal(candidate, { sections: candidate.sections.map(s => ({ ...s, edits: [] })) }) }), { code: 'FACTION_REPAIR_GUARD_IMPORT_MISSING' }));
check('removing seed while keeping import fails', () => assert.throws(() => assertNoFactionImportedRepairRegressionV1({ input,
  candidate: reseal(candidate, { phaseFieldBinding: null }) }), { code: 'FACTION_REPAIR_GUARD_IMPORT_MISSING' }));
// This is the actual consumer seam: it failed before the guard was wired in.
check('consumer blocks actual new bad draft before model calls', () => assert.throws(() =>
  factionConsumerContextV1({ input, candidate, knownRulePolicy }), { code: 'FACTION_REPAIRED_FIELDS_REQUIRE_REVALIDATION' }));
const closure = createFactionSourceDependencyContextV1({ input, sourceRefs: ['source:tactical_cards:terran_armed_forces'] });
check('printed Tenacity labels and all three previously missing dependencies reach the tail context', () => {
  for (const ref of diagnosis.focusDependencyRefsAbsent) assert(closure.sources.some(s => s.ref === ref));
  assert.deepEqual(closure.productAbilities[0].abilities.find(a => a.name === 'Terran Tenacity').printedLabels, ['Active', 'Movement Phase']);
});
check('the graph copies whole original sources and states its limits', () => {
  for (const s of closure.sources) assert.equal(hash(s), hash(input.frozenSources.prompt.sources.find(r => r.ref === s.ref)));
  assert(closure.completeContextStillRequired); assert(!closure.dependencyCatalogueComplete);
  assert(!closure.authoritativeTextRewritten && !closure.reviewerWaiverGranted);
});
check('Barracks movement gets per-Move context without inventing a numeric outcome', () => {
  const c = createFactionSourceDependencyContextV1({ input, sourceRefs: ['source:tactical_cards:barracks'] });
  assert(c.edges.some(e => e.reason === 'rule_instructed_movement_context')); assert(!Object.hasOwn(c, 'legalDistance'));
});
check('other faction uses the same source graph compiler', () => {
  const c = createFactionSourceDependencyContextV1({ input, sourceRefs: ['source:tactical_cards:zerg_swarm'] });
  assert(c.sources.some(s => s.ref === 'core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.1'));
});
check('unknown and duplicate roots fail without source refresh', () => {
  for (const sourceRefs of [[], ['not-a-source'], [closure.roots[0], closure.roots[0]]])
    assert.throws(() => createFactionSourceDependencyContextV1({ input, sourceRefs }), { code: 'FACTION_SOURCE_DEPENDENCY_ROOTS_INVALID' });
});
const files = ['packages/skill-production-v3/faction-repair-regression-guard-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs', 'packages/skill-evaluation/faction-roster-use-evaluation-v1.mjs',
  'scripts/verify-ticket-18-faction-repair-regression-guard-v1.mjs'];
const report = seal({ passed: true, checks, inputHash: input.hash, diagnosisHash: diagnosis.hash, guard, closure,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))),
  actualSemanticRepairPerformed: false, producerGuardWired: false, consumerGuardWired: true,
  sourceDependencyContextWiredToPaidProduction: false, newProviderCalls: 0, trainingTruth: false });
await writeFile(path.join(base, 'repair-regression-guard-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualChangedCheckpointFields: 4, protectedFields: 11, newProviderCalls: 0, hash: report.hash }));
