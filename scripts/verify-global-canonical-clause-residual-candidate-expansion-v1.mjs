#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GLOBAL_CANONICAL_CLAUSE_RESIDUAL_CANDIDATE_SUPPLEMENT_V1 } from "../content/global-canonical-clause-residual-candidate-supplement-v1.mjs";
import {
  createGlobalCanonicalClauseResidualCandidateExpansionV1,
  verifyGlobalCanonicalClauseResidualCandidateExpansionV1,
} from "../packages/rule-atoms/global-canonical-clause-residual-candidate-expansion-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

function at(object, dottedPath) {
  return dottedPath.split(".").reduce((value, key) => value[key], object);
}

const partSources = [
  ["2", "part-2-semantic-clause-ledger-report.json", "ledger"],
  ["3", "part-3-semantic-clause-ledger-report.json", "ledger"],
  ["4", "part-4-semantic-clause-ledger-report.json", "ledger"],
  ["5", "part-5-semantic-clause-ledger-report.json", "ledger"],
  ["6", "part-6-semantic-clause-ledger-report.json", "ledger"],
  ["7", "part-7-semantic-clause-ledger-report.json", "ledger"],
  ["8", "part-8f-semantic-clause-batch-ledger-report.json", "merge.fullPartLedger"],
  ["9", "part-9c-semantic-clause-batch-ledger-report.json", "merge.fullPartLedger"],
  ["10", "part-10-semantic-clause-ledger-report.json", "ledger"],
  ["11", "part-11f-semantic-clause-batch-ledger-report.json", "merge.fullPartLedger"],
  ["12", "part-12-semantic-clause-ledger-report.json", "ledger"],
];

const coreReviewCorpus = [];
for (const [sourcePart, ledgerName, ledgerPath] of partSources) {
  const ledger = at(await report(ledgerName), ledgerPath);
  const packet = await report(`part-${sourcePart}-semantic-review-packet.json`);
  const sourceCandidateById = new Map(packet.anchorPackets.flatMap((anchor) => (
    anchor.candidates.map((candidate) => [candidate.clauseCandidateId, candidate])
  )));
  for (const clause of ledger.canonicalClauses) {
    coreReviewCorpus.push({
      localClauseId: clause.clauseId,
      sourcePart: clause.sourcePart,
      sourceAnchorId: clause.anchorId,
      semanticClass: clause.semanticClass,
      disposition: clause.disposition,
      title: clause.title,
      sourceCandidates: clause.candidateIds.map((candidateId) => sourceCandidateById.get(candidateId)),
    });
  }
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatches = await Promise.all([1, 2, 3].map(async (ordinal) => (
  (await report(`global-canonical-clause-merge-batch-${ordinal}-v1-report.json`)).batch
)));
const faqSupplemental = (await report(
  "official-faq-supplemental-clause-v3-report.json",
)).reconciliation;
const input = {
  plan,
  previousBatches,
  coreReviewCorpus,
  faqSupplemental,
  candidateSupplement: GLOBAL_CANONICAL_CLAUSE_RESIDUAL_CANDIDATE_SUPPLEMENT_V1,
};
const expansion = createGlobalCanonicalClauseResidualCandidateExpansionV1(input);
const audit = verifyGlobalCanonicalClauseResidualCandidateExpansionV1({ ...input, expansion });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("residual_expansion_binds_all_three_batches_and_the_complete_local_denominator", () => {
  assert.equal(expansion.globalMergePlanHash, plan.planHash);
  assert.deepEqual(expansion.previousBatchHashes, previousBatches.map((batch) => batch.batchHash));
  assert.equal(audit.counts.coreReviewCorpusClauses, 1090);
  assert.equal(audit.counts.faqStructuredEvidenceClauses, 3);
  assert.equal(audit.counts.localDenominatorClauses, 1093);
  assert.equal(audit.counts.previouslyReviewedLocalClauses, 151);
  assert.equal(audit.counts.remainingLocalClauses, 942);
  assert.equal(audit.counts.sourceHashMismatches, 0);
  assert.equal(audit.counts.semanticTitleHashMismatches, 0);
});

check("bounded_heuristic_and_explicit_supplement_freeze_one_non_authoritative_candidate_graph", () => {
  assert.equal(audit.counts.heuristicCandidatePairs, 85);
  assert.equal(audit.counts.supplementCandidatePairs, 5);
  assert.equal(audit.counts.candidatePairs, 90);
  assert.equal(audit.counts.candidateGroups, 56);
  assert.equal(audit.counts.uniqueCandidateLocalClauses, 137);
  assert.equal(audit.counts.candidateMappedLocalClauses, 26);
  assert.equal(audit.counts.candidateRemainingLocalClauses, 111);
  assert.equal(audit.counts.mixedMappingStatusGroups, 21);
  assert.equal(audit.counts.remainingOnlyGroups, 35);
  assert.equal(audit.counts.mappedOnlyGroups, 0);
  assert.ok(expansion.candidateGroups.every((group) => (
    group.autoMergeAllowed === false && group.requiresHumanSemanticReview === true
  )));
});

check("residual_graph_recovers_late_aliases_without_reopening_mapped_only_pairs", () => {
  const activeTiming = expansion.candidateGroups.find((group) => (
    group.localClauseIds.includes("core:11:active-ability-timing")
  ));
  assert.deepEqual(activeTiming.existingCanonicalClauseIds, [
    "canonical:active-ability-activation-and-window",
  ]);
  assert.deepEqual(activeTiming.remainingLocalClauseIds, ["core:11:active-ability-timing"]);
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:8.3.3:arrival-zone-of-influence")
      && group.localClauseIds.includes("core:11:zone-of-influence-arrival-restriction")
  )));
  assert.ok(expansion.candidateGroups.every((group) => group.remainingLocalClauseIds.length > 0));
});

check("candidate_output_exposes_hash_metrics_and_mapping_context_without_rule_prose", () => {
  const serialized = JSON.stringify(expansion);
  for (const forbidden of ["\"text\"", "\"title\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.ok(expansion.candidatePairs.every((pair) => /^[a-f0-9]{64}$/u.test(pair.evidenceHash)));
  assert.ok(expansion.candidateGroups.every((group) => (
    group.localClauseIds.length
      === group.mappedLocalClauseIds.length + group.remainingLocalClauseIds.length
  )));
});

check("candidate_identity_is_input_and_supplement_order_independent", () => {
  const reversedSupplement = structuredClone(
    GLOBAL_CANONICAL_CLAUSE_RESIDUAL_CANDIDATE_SUPPLEMENT_V1,
  );
  reversedSupplement.pairSpecs.reverse();
  assert.equal(createGlobalCanonicalClauseResidualCandidateExpansionV1({
    ...input,
    coreReviewCorpus: [...coreReviewCorpus].reverse(),
    candidateSupplement: reversedSupplement,
  }).expansionHash, expansion.expansionHash);
});

check("source_faq_batch_or_supplement_drift_fails_closed", () => {
  const sourceDrift = structuredClone(coreReviewCorpus);
  sourceDrift[0].sourceCandidates[0].text += " tampered";
  assert.throws(() => createGlobalCanonicalClauseResidualCandidateExpansionV1({
    ...input,
    coreReviewCorpus: sourceDrift,
  }), /residual_candidate_source_text_hash_mismatch/);

  const faqDrift = structuredClone(faqSupplemental);
  faqDrift.supplementalClauses[0].sourceClaimCode += "_changed";
  assert.throws(() => createGlobalCanonicalClauseResidualCandidateExpansionV1({
    ...input,
    faqSupplemental: faqDrift,
  }), /residual_candidate_faq_dependency_mismatch/);

  assert.throws(() => createGlobalCanonicalClauseResidualCandidateExpansionV1({
    ...input,
    previousBatches: [...previousBatches].reverse(),
  }), /residual_candidate_previous_batch_chain_invalid/);

  const supplementDrift = structuredClone(
    GLOBAL_CANONICAL_CLAUSE_RESIDUAL_CANDIDATE_SUPPLEMENT_V1,
  );
  supplementDrift.pairSpecs[0].localClauseIds[0] = "core:unknown";
  assert.throws(() => createGlobalCanonicalClauseResidualCandidateExpansionV1({
    ...input,
    candidateSupplement: supplementDrift,
  }), /residual_candidate_supplement_clause_unknown/);
});

check("residual_candidates_grant_no_mapping_rules_skill_replay_or_training_authority", () => {
  assert.equal(expansion.globalCanonicalClauseCount, null);
  assert.equal(expansion.rulesEligible, false);
  assert.equal(expansion.canAffectRules, false);
  assert.equal(expansion.ctx2skillPromotionEligible, false);
  assert.equal(expansion.replayEligible, false);
  assert.equal(expansion.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_residual_candidate_expansion_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  expansion,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_human_residual_review_rule_atoms_and_replay",
    promotions: [],
    blocks: expansion.blocks,
    remainingRuleGaps: 942,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-residual-candidate-expansion-v1-report.json"),
  `${JSON.stringify(reportBody, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: reportBody.schema,
  acceptancePassed: reportBody.acceptancePassed,
  acceptanceTotal: reportBody.acceptanceTotal,
  failures,
  expansionHash: expansion.expansionHash,
  counts: audit.counts,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
