import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createProductionRuntimeV3 } from '../skill-production-v3/runtime.mjs';
import { produceFactionStrategyV1 } from '../skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createEvidenceReader } from '../skill-production/evidence.mjs';
import { openFactionProductionReplayV1 } from './faction-production-replay-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from './faction-field-repair-evidence-v1.mjs';
import { validateFactionFieldRepairSeedV1 } from '../skill-production-v3/faction-field-repair-seed-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from './faction-phase-field-evidence-v1.mjs';
import { validateFactionPhaseFieldSeedV1 } from '../skill-production-v3/faction-phase-field-seed-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { factionConsumerContextV1 } from './faction-roster-use-evaluation-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from './faction-unit-role-debt-v1.mjs';
import { assertNoFactionCrossFieldSourceDebtV1 } from './faction-cross-field-source-audit-v1.mjs';
import { assertNoFactionPhaseSourceDebtV1 } from './faction-phase-source-debt-v1.mjs';
import { seal, verifySeal, sha256, fail } from '../skill-production/common.mjs';

export async function inspectFactionCandidateEvidenceV1({ root, runId, input, knownRulePolicy, catalogue, context }) {
  [input, knownRulePolicy, catalogue, context].forEach(verifySeal);
  if (!/^faction-v1-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_CANDIDATE_EVIDENCE_ARGUMENTS');
  const base = path.join(root, 'build/ticket-18-faction-production-v1');
  const json = async (run, name) => verifySeal(JSON.parse(await readFile(path.join(base, run, name + '.json'), 'utf8')));
  const [recipe, report] = await Promise.all([json(runId, 'recipe'), json(runId, 'report')]);
  const name = input.factionRecordKey.split(':')[1];
  if (!['terran_armed_forces', 'zerg_swarm'].includes(name)) fail('FACTION_CANDIDATE_EVIDENCE_SCOPE');
  const candidate = await json(runId, name + '-candidate');
  if (runId !== 'faction-v1-' + recipe.hash.slice(0, 20) || report.runId !== runId || report.recipeHash !== recipe.hash
    || !recipe.inputHashes.includes(input.hash) || !recipe.knownRulePolicyHashes.includes(knownRulePolicy.hash)
    || recipe.contextHash !== context.hash || recipe.catalogueHash !== catalogue.hash
    || !report.candidateHashes.includes(candidate.hash) || !candidate.semanticReviewPassed)
    fail('FACTION_CANDIDATE_EVIDENCE_BINDING_DRIFT');
  assertNoFactionCrossFieldSourceDebtV1({ input, candidate });
  assertNoFactionPhaseSourceDebtV1({ input, candidate });
  for (const section of candidate.sections) {
    const debt = inspectFactionUnitRoleDebtV1({ input, draft: section.draft });
    if (debt.knownSemanticDebtBlocksIndependentQualification) fail('FACTION_CANDIDATE_KNOWN_UNIT_ROLE_DEBT', { debtHash: debt.hash });
  }
  // This inspector re-executes the current producing program. Older code is
  // not silently interpreted as compatible; preserve/quarantine its release.
  for (const row of recipe.codeHashes) if (sha256(await readFile(path.join(root, row.file))) !== row.hash)
    fail('FACTION_CANDIDATE_EVIDENCE_PRODUCER_DRIFT');
  const ancestors = [], seen = new Set([runId]); let parentId = recipe.continuation?.parentRunId;
  while (parentId) {
    if (!/^faction-v1-[a-f0-9]{20}$/.test(parentId) || seen.has(parentId)) fail('FACTION_CANDIDATE_EVIDENCE_LINEAGE');
    seen.add(parentId); const parent = await json(parentId, 'recipe'); ancestors.push(parent);
    parentId = parent.continuation?.parentRunId;
  }
  const replay = openFactionProductionReplayV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), runId, recipe, ancestors });
  let rebuilt, delivery, fieldRepairSeed = null, phaseFieldSeed = null;
  try {
    if (recipe.fieldRepairBinding?.inputHash === input.hash) {
      fieldRepairSeed = await inspectFactionFieldRepairEvidenceV1({ root, runId: recipe.fieldRepairBinding.runId });
      if (validateFactionFieldRepairSeedV1({ input, knownRulePolicy, seed: fieldRepairSeed }).hash !== recipe.fieldRepairBinding.hash)
        fail('FACTION_CANDIDATE_EVIDENCE_FIELD_REPAIR_DRIFT');
    }
    if (recipe.phaseFieldBinding?.inputHash === input.hash) {
      phaseFieldSeed = await inspectFactionPhaseFieldEvidenceV1({ root, runId: recipe.phaseFieldBinding.runId });
      if (validateFactionPhaseFieldSeedV1({ input, seed: phaseFieldSeed }).hash !== recipe.phaseFieldBinding.hash)
        fail('FACTION_CANDIDATE_EVIDENCE_PHASE_REPAIR_DRIFT');
    }
    const runtime = createProductionRuntimeV3({ store: replay.store, reader: createEvidenceReader(catalogue), context,
      verifier: {}, model: () => fail('FACTION_CANDIDATE_EVIDENCE_EGRESS_FORBIDDEN'),
      dsh: { run: () => fail('FACTION_CANDIDATE_EVIDENCE_UNSAVED_ROLE') } });
    const wrapped = recipe.reviewTransactionBindings ? createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed, runtime, store: replay.store }) : runtime;
    if (recipe.reviewTransactionBindings && wrapped.binding.hash !== recipe.reviewTransactionBindings.find(b => b.inputHash === input.hash)?.hash)
      fail('FACTION_CANDIDATE_EVIDENCE_REVIEW_TRANSACTION_DRIFT');
    rebuilt = await produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed, runtime: wrapped, store: replay.store,
      registeredSourceFieldRepair: recipe.registeredSourceFieldRepair === true });
    if (rebuilt.hash !== candidate.hash) fail('FACTION_CANDIDATE_EVIDENCE_REBUILD_DRIFT');
    factionConsumerContextV1({ input, candidate: rebuilt, knownRulePolicy });
    delivery = replay.evidence();
  } finally { replay.close(); }
  const evidence = seal({ version: 'faction_candidate_production_evidence_v1', runId, recipeHash: recipe.hash,
    inputHash: input.hash, candidateHash: candidate.hash, knownRulePolicyHash: knownRulePolicy.hash,
    fieldRepairEvidenceHash: fieldRepairSeed?.evidence.hash || null, delivery, sourceReviewWorkflowRebuilt: true,
    ...(phaseFieldSeed ? { phaseFieldEvidenceHash: phaseFieldSeed.evidence.hash } : {}),
    independentSemanticReviewPerformed: false, independentConsumerEvaluationPerformed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
  return { candidate: rebuilt, evidence };
}
