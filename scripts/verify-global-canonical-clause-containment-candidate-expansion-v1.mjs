#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createGlobalCanonicalClauseContainmentCandidateExpansionV1,
  verifyGlobalCanonicalClauseContainmentCandidateExpansionV1,
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
      title: clause.title,
      sourceCandidates: clause.candidateIds.map((candidateId) => sourceCandidateById.get(candidateId)),
    });
  }
}

const plan = (await report("global-canonical-clause-merge-plan-v1-report.json")).plan;
const batch1 = (await report("global-canonical-clause-merge-batch-1-v1-report.json")).batch;
const batch2 = (await report("global-canonical-clause-merge-batch-2-v1-report.json")).batch;
const input = { plan, previousBatches: [batch1, batch2], reviewCorpus };
const expansion = createGlobalCanonicalClauseContainmentCandidateExpansionV1(input);
const audit = verifyGlobalCanonicalClauseContainmentCandidateExpansionV1({ ...input, expansion });

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("containment_expansion_binds_plan_both_reviewed_batches_and_complete_source_corpus", () => {
  assert.equal(expansion.globalMergePlanHash, plan.planHash);
  assert.deepEqual(expansion.previousBatchHashes, [batch1.batchHash, batch2.batchHash]);
  assert.equal(audit.counts.reviewCorpusClauses, 1090);
  assert.equal(audit.counts.previouslyReviewedLocalClauses, 82);
  assert.equal(audit.counts.remainingCoreLocalClauses, 1008);
  assert.equal(audit.counts.sourceHashMismatches, 0);
  assert.equal(audit.counts.semanticTitleHashMismatches, 0);
});

check("bounded_containment_and_title_heuristics_emit_a_complete_review_denominator", () => {
  assert.equal(audit.counts.candidatePairs, 40);
  assert.equal(audit.counts.candidateGroups, 31);
  assert.equal(audit.counts.candidateLocalClauseRefs, 69);
  assert.equal(audit.counts.uniqueCandidateLocalClauses, 69);
  assert.equal(audit.counts.overlappingCandidateGroups, 0);
  assert.ok(expansion.candidateGroups.every((group) => (
    group.autoMergeAllowed === false && group.requiresHumanSemanticReview === true
  )));
});

check("known_full_containment_and_semantic_title_pairs_are_recovered", () => {
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:9.1.6:unused-army-slots-lost")
      && group.localClauseIds.includes("core:11:unused-army-slots-lost")
  )));
  assert.ok(expansion.candidateGroups.some((group) => (
    group.localClauseIds.includes("core:6.2:supply-zero-control")
      && group.localClauseIds.includes("core:8.9.1:zero-supply-control")
  )));
});

check("connected_groups_expose_partial_overlap_instead_of_forcing_pairwise_merges", () => {
  const control = expansion.candidateGroups.find((group) => (
    group.localClauseIds.includes("core:2.5:controlling-player-definition")
  ));
  assert.deepEqual(control.localClauseIds, [
    "core:11:controlling-player-decision-authority",
    "core:11:controlling-player-definition",
    "core:2.5:controlling-player-definition",
  ]);
  const missionRestrictions = expansion.candidateGroups.find((group) => (
    group.localClauseIds.includes("core:11:reserves-mission-marker-restriction")
  ));
  assert.equal(missionRestrictions.localClauseIds.length, 6);
});

check("both_previous_batches_are_excluded_from_new_candidates", () => {
  const reviewed = new Set([...batch1.canonicalClauses, ...batch2.canonicalClauses]
    .flatMap((clause) => clause.sourceLocalClauseIds));
  assert.ok(expansion.candidateGroups.every((group) => (
    group.localClauseIds.every((clauseId) => !reviewed.has(clauseId))
  )));
});

check("candidate_output_retains_hash_metrics_without_source_or_title_prose", () => {
  const serialized = JSON.stringify(expansion);
  for (const forbidden of ["\"text\"", "\"title\"", "\"excerpt\"", "\"answer\"", "\"question\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.ok(expansion.candidatePairs.every((pair) => /^[a-f0-9]{64}$/u.test(pair.evidenceHash)));
});

check("containment_candidate_identity_is_input_order_independent", () => {
  assert.equal(createGlobalCanonicalClauseContainmentCandidateExpansionV1({
    ...input,
    reviewCorpus: [...reviewCorpus].reverse(),
  }).expansionHash, expansion.expansionHash);
});

check("source_title_or_previous_batch_drift_fails_closed", () => {
  const sourceDrift = structuredClone(reviewCorpus);
  sourceDrift[0].sourceCandidates[0].text += " tampered";
  assert.throws(() => createGlobalCanonicalClauseContainmentCandidateExpansionV1({
    ...input,
    reviewCorpus: sourceDrift,
  }), /semantic_candidate_source_text_hash_mismatch/);

  const titleDrift = structuredClone(reviewCorpus);
  titleDrift[0].title += " changed";
  assert.throws(() => createGlobalCanonicalClauseContainmentCandidateExpansionV1({
    ...input,
    reviewCorpus: titleDrift,
  }), /containment_candidate_semantic_title_hash_mismatch/);

  assert.throws(() => createGlobalCanonicalClauseContainmentCandidateExpansionV1({
    ...input,
    previousBatches: [batch2, batch1],
  }), /containment_candidate_previous_batch_chain_invalid/);
});

check("containment_candidates_grant_no_mapping_rules_skill_or_training_authority", () => {
  assert.equal(expansion.reviewedLocalClauseCount, 82);
  assert.equal(expansion.remainingLocalClauseCount, 1011);
  assert.equal(expansion.globalCanonicalClauseCount, null);
  assert.equal(expansion.rulesEligible, false);
  assert.equal(expansion.canAffectRules, false);
  assert.equal(expansion.ctx2skillPromotionEligible, false);
  assert.equal(expansion.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_global_canonical_clause_containment_candidate_expansion_verification_v1",
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
    crossTimeReplayResult: "pending_human_containment_review_rule_atoms_and_replay",
    promotions: [],
    blocks: expansion.blocks,
    remainingRuleGaps: 1011,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "global-canonical-clause-containment-candidate-expansion-v1-report.json"),
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
