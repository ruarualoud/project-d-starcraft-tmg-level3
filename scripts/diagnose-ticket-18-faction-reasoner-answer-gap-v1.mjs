import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { prepareFactionNativeProductionRoleV1, usesFactionNativeProductionInputV1 } from '../packages/skill-production-v3/faction-native-production-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { planFactionReasonerAnswerGapsV1 } from '../packages/skill-production-v3/faction-reasoner-answer-gap-v1.mjs';
const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-e85faeb7af610d098c8c', attemptId = 'structured-3bb2a992ad6a2e8cd6f527c580723d6e021962b4d1e05607';
const input = verifySeal(JSON.parse(await readFile(base + 'zerg_swarm-input.json', 'utf8')));
const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId });
const receipt = verifySeal(JSON.parse(evidence.attempt.response)).value;
assert.equal(receipt.status, 200); assert.equal(receipt.incompleteReason, null); assert.equal(receipt.usage.outputUnits, 1320);
const db = new DatabaseSync(filename, { readOnly: true });
let tree, challenger;
try {
  const read = id => verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id).artifact)).value);
  tree = read('faction.zerg_swarm.question-tree'); challenger = read('faction.zerg_swarm.challenger');
} finally { db.close(); }
const axis = 'army_resources';
const questions = [...tree.output.branches.find(b => b.axis === axis).questions,
  ...challenger.output.branches.find(b => b.axis === axis).probes].map((q, index) => ({ index, ...q }));
const rejectedOutput = evidence.rejected.providerValue;
assert.equal(usesFactionNativeProductionInputV1(tree), true);
assert.equal(usesFactionNativeProductionInputV1(challenger), true);
assert.equal(usesFactionNativeProductionInputV1({ protocol: 'unknown', structuredDecodePassed: true }), false);
const plan = planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput });
assert.deepEqual(plan.retainedAnswers.map(r => r.index), [0, 1]);
assert.deepEqual(plan.unansweredIndices, [2, 3, 4, 5]);
assert.deepEqual(plan.batches, [[2, 3], [4, 5]]);
assert.deepEqual(plan.retainedAnswers, rejectedOutput.answers.slice(0, 2));
assert.deepEqual(plan.retainedUncertainties, rejectedOutput.uncertainties);
assert.equal(plan.productionApplied, false);
assert.equal(plan.retainedAnswersSemanticallyAccepted, false);
const edited = structuredClone(rejectedOutput); edited.answers[2].question += ' changed';
assert.throws(() => planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput: edited }),
  { code: 'FACTION_ANSWER_GAP_NOT_EXACT_QUESTION_COPY' });
const duplicate = structuredClone(rejectedOutput); duplicate.answers[2].index = 1;
assert.throws(() => planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput: duplicate }),
  { code: 'FACTION_ANSWER_GAP_SCOPE_INVALID' });
const alias = structuredClone(rejectedOutput); alias.answers[2].answer = alias.answers[2].question; delete alias.answers[2].question;
assert.throws(() => planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput: alias }),
  { code: 'FACTION_ANSWER_GAP_RETAINED_INVALID' });
const unknown = structuredClone(rejectedOutput); unknown.answers[0].sourceRefs[0] = 'invented-source';
assert.throws(() => planFactionReasonerAnswerGapsV1({ input, questions, rejectedOutput: unknown }),
  { code: 'FACTION_ANSWER_GAP_SOURCE_UNKNOWN' });
// Reconstruct the actual request, not a hand-written lookalike capsule. This
// requires a terminal run and refuses any Provider or DSH operation.
const root = process.cwd(), read = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const recipe = await read(base + runId + '/recipe.json'), ancestors = [];
let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await read(base + parent + '/recipe.json'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
assert.equal(knownRulePolicy.hash, recipe.knownRulePolicyHashes[1]);
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
let request, replayProof;
try {
  const forbidden = () => fail('FIXTURE_NO_PROVIDER_OR_DSH');
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, store: replay.store,
    registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
    catalogueReviewBinding: recipe.catalogueReviewBinding, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
    tutorRecovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
    runtime: { role(r) { if (r.roleId === 'faction.zerg_swarm.army_resources.1.reasoner') { request = r; fail('FIXTURE_REQUEST_CAPTURED'); }
      return stack.runtime.role(r); } } }), { code: 'FIXTURE_REQUEST_CAPTURED' });
  replayProof = replay.evidence();
} finally { replay.close(); }
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
const prepared = prepareFactionNativeProductionRoleV1({ input, request, executionPolicy });
assert.equal(prepared.contextManifestRef.hash, evidence.rejected.contextManifestRef.hash);
assert.deepEqual(request.workspace.questions, questions);
const files = ['packages/skill-production-v3/faction-reasoner-answer-gap-v1.mjs',
  'packages/skill-production-v3/faction-native-production-runtime-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/diagnose-ticket-18-faction-reasoner-answer-gap-v1.mjs'];
const report = seal({ passed: true, checks: 21, runId, attemptId, plan, request, replayProof,
  originalFailureReceiptHash: receipt.receiptHash, originalRejectedCandidateHash: evidence.rejected.hash,
  inputQuestionArtifacts: [tree.hash, challenger.hash], originalQuestions: questions,
  hypotheses: [
    { hypothesis: 'partial_answer_plus_input_question_copy', outcome: 'confirmed_four_exact_question_and_reference_copies' },
    { hypothesis: 'answer_text_in_wrong_alias_field', outcome: 'rejected_copied_values_are_unanswered_original_questions' },
    { hypothesis: 'output_token_truncation', outcome: 'rejected_http200_complete_1320_tokens' },
  ],
  actualFullNativeRequestRebuilt: true, productionWiringChanged: true,
  nativeInputRoutingAligned: true, semanticCompletionWired: false,
  providerCalls: 0, sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'reasoner-answer-gap-diagnosis.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 21, retained: 2, missing: 4, plannedBatches: 2,
  productionApplied: false, providerCalls: 0, hash: report.hash }));
