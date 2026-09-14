import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createProductionRuntimeV3 } from '../skill-production-v3/runtime.mjs';
import { produceFactionStrategyV1 } from '../skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createEvidenceReader } from '../skill-production/evidence.mjs';
import { openFactionProductionReplayV1 } from './faction-production-replay-v1.mjs';
import { loadFactionOpeningFenceRecipeEnvironmentV1 } from '../skill-production-v3/faction-wire-address-recovery-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from './faction-replay-runtime-stack-v1.mjs';
import { inspectFactionFieldRepairEvidenceV1 } from './faction-field-repair-evidence-v1.mjs';
import { validateFactionFieldRepairSeedV1 } from '../skill-production-v3/faction-field-repair-seed-v1.mjs';
import { inspectFactionPhaseFieldEvidenceV1 } from './faction-phase-field-evidence-v1.mjs';
import { validateFactionPhaseFieldSeedV1 } from '../skill-production-v3/faction-phase-field-seed-v1.mjs';
import { createFactionReviewTransactionRuntimeV1 } from '../skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { factionConsumerContextV1 } from './faction-roster-use-evaluation-v1.mjs';
import { inspectFactionUnitRoleDebtV1 } from './faction-unit-role-debt-v1.mjs';
import { assertNoFactionCrossFieldSourceDebtV1 } from './faction-cross-field-source-audit-v1.mjs';
import { assertNoFactionPhaseSourceDebtV1 } from './faction-phase-source-debt-v1.mjs';
import { assertNoFactionCardPackageSourceDebtV1 } from './faction-card-package-source-audit-v1.mjs';
import { assertNoFactionUniqueRiskClauseV2 } from './faction-unique-risk-clause-v2.mjs';
import { assertNoFactionUniqueCrossFieldDebtV1 } from './faction-unique-cross-field-audit-v1.mjs';
import { assertNoFactionZergCardEconomyDebtV1 } from './faction-zerg-card-economy-audit-v1.mjs';
import { assertNoFactionZergUnitTimingDebtV1 } from './faction-zerg-unit-timing-audit-v1.mjs';
import { createFactionObservedRosterFactsV1 } from './faction-observed-roster-facts-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from '../../scripts/support/official-development-tranche-source-lock-fixture-v1.mjs';
import { FACTION_PRODUCTION_RELEASE_V1, adaptExistingFactionProductionSkillV1 }
  from '../skill-production-v3/faction-production-release-v1.mjs';
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
  assertNoFactionCardPackageSourceDebtV1({ input, candidate });
  assertNoFactionUniqueRiskClauseV2({ input, candidate });
  assertNoFactionUniqueCrossFieldDebtV1({ input, candidate });
  assertNoFactionZergCardEconomyDebtV1({ input, candidate });
  assertNoFactionZergUnitTimingDebtV1({ input, candidate });
  for (const section of candidate.sections) {
    const debt = inspectFactionUnitRoleDebtV1({ input, draft: section.draft });
    if (debt.knownSemanticDebtBlocksIndependentQualification) fail('FACTION_CANDIDATE_KNOWN_UNIT_ROLE_DEBT', { debtHash: debt.hash });
  }
  // Producer implementation hashes are release/audit evidence, not candidate
  // identity. The sealed recipe, inputs, sources, candidate and exact saved
  // replay below remain strict. This lets a newer compatible reader consume an
  // already-produced Skill without pretending that it was produced by the new
  // implementation.
  const producerReleaseEvidenceDrift = [];
  for (const row of recipe.codeHashes) {
    const currentHash = sha256(await readFile(path.join(root, row.file)));
    if (currentHash !== row.hash) producerReleaseEvidenceDrift.push({ file: row.file, producedHash: row.hash, currentHash });
  }
  // A completed semantic release is the direct consumption boundary. It was
  // created only after the sealed candidate, recipe, sources and production
  // report passed their strict contracts. Replaying every historical model
  // response here adds latency and implementation coupling but no new content
  // assurance, so retain that replay only as the legacy fallback below.
  let semanticRelease = null;
  try {
    semanticRelease = verifySeal(JSON.parse(await readFile(path.join(base, runId, 'production-release-v1.json'), 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (semanticRelease) {
    const adapted = adaptExistingFactionProductionSkillV1({ artifact: candidate, recipe });
    const released = semanticRelease.existingSkills?.find(row => row.factionRecordKey === candidate.factionRecordKey);
    if (semanticRelease.version !== 'faction_production_release_manifest_v1'
      || semanticRelease.releaseBindingHash !== FACTION_PRODUCTION_RELEASE_V1.hash
      || semanticRelease.release !== FACTION_PRODUCTION_RELEASE_V1.release
      || semanticRelease.skillContract !== FACTION_PRODUCTION_RELEASE_V1.skillContract
      || semanticRelease.runId !== runId || semanticRelease.recipeHash !== recipe.hash
      || semanticRelease.compatibility !== 'compatible_patch'
      || semanticRelease.blockingFindings?.length !== 0
      || semanticRelease.sourceRefreshPerformed !== false
      || semanticRelease.trainingTruth !== false
      || released?.hash !== adapted.hash) {
      fail('FACTION_CANDIDATE_SEMANTIC_RELEASE_DRIFT');
    }
    const delivery = seal({ version: 'faction_candidate_semantic_release_delivery_v1',
      releaseManifestHash: semanticRelease.hash, candidateHash: candidate.hash,
      historicalProviderReplayPerformed: false, newProviderCalls: 0, trainingTruth: false });
    const releaseEvidence = seal({ version: 'faction_candidate_producer_release_evidence_v1',
      runId, recipeHash: recipe.hash, candidateHash: candidate.hash,
      producerReleaseEvidenceDrift, startupBlocking: false,
      semanticIdentityAffecting: false, newProviderCalls: 0, trainingTruth: false });
    const evidence = seal({ version: 'faction_candidate_production_evidence_v1', runId,
      recipeHash: recipe.hash, inputHash: input.hash, candidateHash: candidate.hash,
      knownRulePolicyHash: knownRulePolicy.hash, fieldRepairEvidenceHash: null, delivery,
      sourceReviewWorkflowRebuilt: false, semanticProductionReleaseVerified: true,
      semanticProductionReleaseHash: semanticRelease.hash,
      producerImplementationIdentityExcluded: true,
      independentSemanticReviewPerformed: false, independentConsumerEvaluationPerformed: false,
      strategyEffectivenessProven: false, runtimeAccepted: false, newProviderCalls: 0,
      trainingTruth: false });
    return { candidate, evidence, releaseEvidence };
  }
  const ancestors = [], seen = new Set([runId]); let parentId = recipe.continuation?.parentRunId;
  while (parentId) {
    if (!/^faction-v1-[a-f0-9]{20}$/.test(parentId) || seen.has(parentId)) fail('FACTION_CANDIDATE_EVIDENCE_LINEAGE');
    seen.add(parentId); const parent = await json(parentId, 'recipe'); ancestors.push(parent);
    parentId = parent.continuation?.parentRunId;
  }
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const openingFenceRecovery = await loadFactionOpeningFenceRecipeEnvironmentV1({ root, recipe, input });
  const replay = openFactionProductionReplayV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), runId, recipe, ancestors,
    input, editorImport: dependencies?.editorImport || null, openingFenceRecovery });
  let rebuilt, delivery, fieldRepairSeed = null, phaseFieldSeed = null;
  try {
    let observedSourceRepair = null;
    if (recipe.observedSourceRepairBinding) {
      const { dataset } = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
      const facts = createFactionObservedRosterFactsV1({ input, dataset });
      if (recipe.observedRosterFactsHashes?.[recipe.inputHashes.indexOf(input.hash)] !== facts.hash)
        fail('FACTION_CANDIDATE_OBSERVED_ROSTER_FACTS_DRIFT');
      observedSourceRepair = { binding: recipe.observedSourceRepairBinding, facts };
    } else if (recipe.observedRosterFactsHashes || candidate.observedSourceRepairBindingHash)
      fail('FACTION_CANDIDATE_OBSERVED_SOURCE_REPAIR_UNBOUND');
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
    const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime, dependencies });
    const wrapped = recipe.reviewTransactionBindings ? createFactionReviewTransactionRuntimeV1({ input, phaseFieldSeed, runtime: stack.runtime, store: replay.store,
      draftEnvelopeBinding: recipe.draftEnvelopeBinding || null }) : stack.runtime;
    if (recipe.reviewTransactionBindings && wrapped.binding.hash !== recipe.reviewTransactionBindings.find(b => b.inputHash === input.hash)?.hash)
      fail('FACTION_CANDIDATE_EVIDENCE_REVIEW_TRANSACTION_DRIFT');
    rebuilt = await produceFactionStrategyV1({ input, knownRulePolicy, fieldRepairSeed, phaseFieldSeed, runtime: wrapped, store: replay.store,
      legacyPromptRoleIds: stack.legacyPromptRoleIds, structuredReviewValidationBinding: stack.structuredReviewValidationBinding,
      catalogueReviewBinding: recipe.catalogueReviewBinding || null, observedSourceRepair,
      reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding || null,
      proposerBatches: recipe.proposerBatchBinding ? { binding: recipe.proposerBatchBinding,
        frozenRoleIds: recipe.proposerBatchFrozenRoleIds,
        auxiliaryCapacityBinding: recipe.proposerAuxiliaryCapacityBinding || null } : null,
      uniqueRiskClauseBinding: recipe.uniqueRiskClauseBinding || null,
      draftEnvelopeBinding: recipe.draftEnvelopeBinding || null,
      initialSourceCorrectionBinding: recipe.initialSourceCorrectionBinding || null,
      zergUnitTimingBinding: recipe.zergUnitTimingBinding || null,
      tutorRecovery: recipe.teachRecoveryBindings?.find(row => row.inputHash === input.hash) || null,
      registeredSourceFieldRepair: recipe.registeredSourceFieldRepair === true });
    if (rebuilt.hash !== candidate.hash) fail('FACTION_CANDIDATE_EVIDENCE_REBUILD_DRIFT');
    factionConsumerContextV1({ input, candidate: rebuilt, knownRulePolicy });
    delivery = replay.evidence();
  } finally { replay.close(); }
  const evidence = seal({ version: 'faction_candidate_production_evidence_v1', runId, recipeHash: recipe.hash,
    inputHash: input.hash, candidateHash: candidate.hash, knownRulePolicyHash: knownRulePolicy.hash,
    fieldRepairEvidenceHash: fieldRepairSeed?.evidence.hash || null, delivery, sourceReviewWorkflowRebuilt: true,
    producerReleaseEvidenceDrift,
    ...(phaseFieldSeed ? { phaseFieldEvidenceHash: phaseFieldSeed.evidence.hash } : {}),
    independentSemanticReviewPerformed: false, independentConsumerEvaluationPerformed: false,
    strategyEffectivenessProven: false, runtimeAccepted: false, newProviderCalls: 0, trainingTruth: false });
  return { candidate: rebuilt, evidence };
}
