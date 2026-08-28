#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createGlobalCanonicalClauseSemanticCandidateExpansionV1,
  verifyGlobalCanonicalClauseSemanticCandidateExpansionV1,
} from "../packages/rule-atoms/global-canonical-clause-semantic-candidate-expansion-v1.mjs";

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

const reviewCorpus = [];
for (const [sourcePart, ledgerName, ledgerPath] of partSources) {
  const ledger = at(await report(ledgerName), ledgerPath);
  const packet = await report(`part-${sourcePart}-semantic-review-packet.json`);
  const sourceCandidateById = new Map(packet.anchorPackets.flatMap((anchor) => (
    anchor.candidates.map((candidate) => [candidate.clauseCandidateId, candidate])
  )));
  for (const clause of ledger.canonicalClauses) {
    reviewCorpus.push({
      localClauseId: clause.clauseId,
      sourcePart: clause.sourcePart,
      sourceAnchorId: clause.anchorId,
      semanticClass: clause.semanticClass,
      disposition: clause.disposition,
      sourceCandidates: clause.candidateIds.map((candidateId) => sourceCandidateById.get(candidateId)),
    });
  }
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const previousBatch = (await report("global-canonical-clause-merge-batch-1-v1-report.json")).batch;
const input = { plan, previousBatch, reviewCorpus };
const expansion = createGlobalCanonicalClauseSemanticCandidateExpansionV1(input);
const audit = verifyGlobalCanonicalClauseSemanticCandidateExpansionV1({ ...input, expansion });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("expansion_binds_the_frozen_plan_previous_batch_and_full_core_review_corpus", () => {
  assert.equal(expansion.globalMergePlanHash, plan.planHash);
  assert.equal(expansion.previousBatchHash, previousBatch.batchHash);
  assert.equal(audit.counts.reviewCorpusClauses, 1090);
  assert.equal(audit.counts.missingPlanClauses, 0);
  assert.equal(audit.counts.unknownReviewCorpusClauses, 0);
  assert.equal(audit.counts.sourceHashMismatches, 0);
});

check("previously_reviewed_clauses_are_excluded_from_semantic_candidates", () => {
  assert.equal(audit.counts.previouslyReviewedLocalClauses, 28);
  assert.equal(audit.counts.remainingCoreLocalClauses, 1062);
  const reviewed = new Set(previousBatch.canonicalClauses.flatMap((clause) => clause.sourceLocalClauseIds));
  assert.ok(expansion.candidateGroups.every((group) => (
    group.localClauseIds.every((clauseId) => !reviewed.has(clauseId))
  )));
});

check("source_equivalence_heuristics_emit_a_bounded_non_authoritative_denominator", () => {
  assert.equal(audit.counts.candidatePairs, 27);
  assert.equal(audit.counts.candidateGroups, 27);
  assert.equal(audit.counts.candidateLocalClauseRefs, 54);
  assert.equal(audit.counts.uniqueCandidateLocalClauses, 54);
  assert.equal(audit.counts.overlappingCandidateGroups, 0);
  assert.ok(expansion.candidateGroups.every((group) => (
    group.autoMergeAllowed === false && group.requiresHumanSemanticReview === true
  )));
});

check("known_ocr_and_punctuation_variants_are_recovered", () => {
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:3.4:positive-modifier")
      && group.localClauseIds.includes("core:11:positive-modifier")
  )));
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:4.2:model-wholly-within")
      && group.localClauseIds.includes("core:11:wholly-within-model")
  )));
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:11:effective-size-ground-level-restatement")
      && group.localClauseIds.includes("core:11:ground-level-effective-size")
  )));
});

check("context_sensitive_near_matches_remain_review_candidates_not_merges", () => {
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:12.3:first-pass-priority")
      && group.localClauseIds.includes("core:12.4:first-pass-priority")
  )));
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:11:respawn-enemy-separation")
      && group.localClauseIds.includes("core:11:summon-enemy-separation")
  )));
});

check("candidate_output_contains_hash_evidence_but_no_copyright_rule_prose", () => {
  const serialized = JSON.stringify(expansion);
  for (const forbidden of ["\"text\"", "\"title\"", "\"excerpt\"", "\"question\"", "\"answer\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.ok(expansion.candidatePairs.every((pair) => (
    /^[a-f0-9]{64}$/u.test(pair.evidenceHash)
  )));
});

check("candidate_identity_is_input_order_independent", () => {
  assert.equal(createGlobalCanonicalClauseSemanticCandidateExpansionV1({
    ...input,
    reviewCorpus: [...reviewCorpus].reverse(),
  }).expansionHash, expansion.expansionHash);
});

check("missing_tampered_or_malformed_source_evidence_fails_closed", () => {
  assert.throws(() => createGlobalCanonicalClauseSemanticCandidateExpansionV1({
    ...input,
    reviewCorpus: reviewCorpus.slice(0, -1),
  }), /semantic_candidate_review_corpus_incomplete/);

  const tampered = structuredClone(reviewCorpus);
  tampered[0].sourceCandidates[0].text += " tampered";
  assert.throws(() => createGlobalCanonicalClauseSemanticCandidateExpansionV1({
    ...input,
    reviewCorpus: tampered,
  }), /semantic_candidate_source_text_hash_mismatch/);

  const emptyNormalized = structuredClone(reviewCorpus);
  emptyNormalized[0].sourceCandidates[0] = {
    ...emptyNormalized[0].sourceCandidates[0],
    text: "◆ ◆",
  };
  assert.throws(() => createGlobalCanonicalClauseSemanticCandidateExpansionV1({
    ...input,
    reviewCorpus: emptyNormalized,
  }), /semantic_candidate_source_text_hash_mismatch/);
});

check("candidate_expansion_grants_no_mapping_rules_skill_or_training_authority", () => {
  assert.equal(expansion.reviewedLocalClauseCount, 28);
  assert.equal(expansion.remainingLocalClauseCount, 1065);
  assert.equal(expansion.globalCanonicalClauseCount, null);
  assert.equal(expansion.rulesEligible, false);
  assert.equal(expansion.canAffectRules, false);
  assert.equal(expansion.ctx2skillPromotionEligible, false);
  assert.equal(expansion.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_semantic_candidate_expansion_verification_v1",
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
    crossTimeReplayResult: "pending_human_semantic_mapping_rule_atoms_and_replay",
    promotions: [],
    blocks: expansion.blocks,
    remainingRuleGaps: 1065,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-semantic-candidate-expansion-v1-report.json"),
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
