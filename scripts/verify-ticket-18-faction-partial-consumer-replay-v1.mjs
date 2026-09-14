import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionKnownRulePolicyV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { createFactionRosterChoiceDrillsV1 } from '../packages/skill-evaluation/faction-roster-choice-drills-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from '../packages/skill-evaluation/faction-field-repair-evidence-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from '../packages/skill-evaluation/faction-phase-field-evidence-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { verifySeal, seal, sha256 } from '../packages/skill-production/common.mjs';
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const runId = 'faction-v1-49e1f39e41163c6b0590';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const recipe = await json(base + runId + '/recipe.json');
const input = await json(base + 'terran_armed_forces-input.json');
const ancestors = []; let parent = recipe.continuation?.parentRunId;
while (parent) { const r = await json(base + parent + '/recipe.json'); ancestors.push(r); parent = r.continuation?.parentRunId; }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const drills = await createFactionRosterChoiceDrillsV1({ catalogue, dataset });
const knownRulePolicy = createFactionKnownRulePolicyV1({ input, drills });
const fieldRepairSeed = await inspectFactionFieldRepairEvidenceV1({ root, runId: recipe.fieldRepairBinding.runId });
const phaseFieldSeed = await inspectFactionPhaseFieldEvidenceV1({ root, runId: recipe.phaseFieldBinding.runId });
const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
const replay = openFactionProductionReplayV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId, recipe, ancestors, input, editorImport: dependencies.editorImport });
const progress = [];
let proof, failure;
try {
  const forbidden = () => { throw new Error('partial test forbids DSH/Provider calls'); };
  const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
    verifier: {}, model: forbidden, dsh: { run: forbidden } });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
  const wrapped = createFactionReviewTransactionRuntimeV1({ input, runtime: stack.runtime, store: replay.store, phaseFieldSeed });
  try {
    await produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed, runtime: wrapped,
      store: replay.store, registeredSourceFieldRepair: true, legacyPromptRoleIds: stack.legacyPromptRoleIds,
      structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
      reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding || null,
      onProgress: row => { if (row.stage === 'section_complete') progress.push(row); } });
  } catch (error) { failure = { code: error.code, stepId: error.stepId }; }
  proof = replay.evidence();
} finally { replay.close(); }
assert.equal(progress.length, 4, JSON.stringify({ failure, progress }));
assert.equal(failure.code, 'FACTION_REPLAY_STEP_INPUT_DRIFT');
assert(failure.stepId.includes('threat_tradeoffs.1.review-target-batch-v1.supportive.0.2'), JSON.stringify(failure));
const files = ['packages/skill-evaluation/faction-production-replay-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs',
  'packages/skill-evaluation/faction-candidate-evidence-v1.mjs',
  'scripts/verify-ticket-18-faction-partial-consumer-replay-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const report = seal({ passed: true, actualRunId: runId, sourceReviewedChaptersRebuilt: 4,
  expectedUnfinishedRole: failure.stepId, evidence: proof,
  historicalProducerCodeMatchNotClaimed: true, completeFactionNotYetInspected: true,
  newProviderCalls: 0, codeHashes, trainingTruth: false });
await writeFile(base + 'partial-consumer-replay-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, chapters: 4, newProviderCalls: 0, hash: report.hash }));
