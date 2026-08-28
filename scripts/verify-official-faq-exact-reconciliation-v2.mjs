#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2 } from "../content/official-faq-exact-reconciliation-binding-v2.mjs";
import {
  createOfficialFaqExactReconciliationV2,
  verifyOfficialFaqExactReconciliationV2,
} from "../packages/rule-atoms/official-faq-exact-reconciliation-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const faqReceipt = (await report("official-gameplay-faq-report.json")).receipt;
const denominator = (await report("core-clause-candidate-denominator-report.json")).denominator;
const anchorLinkage = (await report("official-faq-core-linkage-report.json")).linkage;
const coverageIndex = (await report("core-semantic-clause-coverage-index-report.json")).index;
const partLedgers = [
  (await report("part-2-semantic-clause-ledger-report.json")).ledger,
  (await report("part-3-semantic-clause-ledger-report.json")).ledger,
  (await report("part-4-semantic-clause-ledger-report.json")).ledger,
  (await report("part-5-semantic-clause-ledger-report.json")).ledger,
  (await report("part-6-semantic-clause-ledger-report.json")).ledger,
  (await report("part-7-semantic-clause-ledger-report.json")).ledger,
  (await report("part-8f-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-9c-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-10-semantic-clause-ledger-report.json")).ledger,
  (await report("part-11f-semantic-clause-batch-ledger-report.json")).merge.fullPartLedger,
  (await report("part-12-semantic-clause-ledger-report.json")).ledger,
];

const input = {
  faqReceipt,
  denominator,
  anchorLinkage,
  coverageIndex,
  partLedgers,
  reviewedBinding: OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2,
};
const reconciliation = createOfficialFaqExactReconciliationV2(input);
const audit = verifyOfficialFaqExactReconciliationV2({
  faqReceipt,
  denominator,
  anchorLinkage,
  coverageIndex,
  partLedgers,
  reconciliation,
});

const acceptance = [];
function check(id, fn) {
  try { fn(); acceptance.push({ id, passed: true }); } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("exact_reconciliation_binds_every_upstream_identity", () => {
  assert.equal(reconciliation.faqReceiptHash, faqReceipt.receiptHash);
  assert.equal(reconciliation.anchorLinkageHash, anchorLinkage.linkageHash);
  assert.equal(reconciliation.coreClauseCandidateDenominatorHash, denominator.denominatorHash);
  assert.equal(reconciliation.coreSemanticCoverageIndexHash, coverageIndex.coverageIndexHash);
});

check("exact_reconciliation_requires_the_complete_core_corpus", () => {
  assert.deepEqual(coverageIndex.uncoveredSourceParts, []);
  assert.equal(coverageIndex.counts.remainingSourceCandidates, 0);
  assert.deepEqual(reconciliation.sourceParts, [
    "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
  ]);
});

check("all_faq_entries_keep_an_exact_final_disposition", () => {
  assert.equal(audit.counts.entries, 7);
  assert.equal(audit.counts.normativeReviewRequired, 3);
  assert.equal(audit.counts.displayOnly, 4);
  assert.equal(audit.counts.unclassified, 0);
});

check("three_normative_entries_have_explicit_reconciliation_relations", () => {
  const relations = Object.fromEntries(reconciliation.entries
    .filter((entry) => entry.disposition === "review_required")
    .map((entry) => [entry.entryId, entry.relation]));
  assert.deepEqual(relations, {
    faq_9_42: "consistent_core_summary",
    faq_9_43: "supplemental_product_fact_no_rule_override",
    faq_9_46: "consistent_core_summary_with_unmatched_setup_detail",
  });
});

check("normative_entries_link_exact_local_clauses_and_candidates", () => {
  assert.equal(audit.counts.exactLocalClauseLinks, 15);
  assert.equal(audit.counts.exactCandidateClauseLinks, 18);
  assert.equal(audit.counts.missingLocalClauses, 0);
  assert.equal(audit.counts.missingCandidates, 0);
});

check("supplemental_claims_are_accounted_without_becoming_rules", () => {
  assert.equal(audit.counts.unmatchedSupplementalClaims, 3);
  const byId = new Map(reconciliation.entries.map((entry) => [entry.entryId, entry]));
  assert.deepEqual(byId.get("faq_9_42").unmatchedSupplementalClaimCodes, []);
  assert.deepEqual(byId.get("faq_9_43").unmatchedSupplementalClaimCodes, [
    "metric_dimension_equivalents_current_data_binding_pending",
    "small_engagement_dimensions_current_data_binding_pending",
  ]);
  assert.deepEqual(byId.get("faq_9_46").unmatchedSupplementalClaimCodes, [
    "terrain_height_tier_setup_detail_not_exact_core_clause",
  ]);
  assert.equal(reconciliation.faqCanonicalClauseCount, 0);
});

check("display_only_entries_have_no_semantic_links", () => {
  assert.ok(reconciliation.entries
    .filter((entry) => entry.disposition === "display_only")
    .every((entry) => entry.clauseLinks.length === 0
      && entry.unmatchedSupplementalClaimCodes.length === 0));
});

check("each_exact_link_retains_ledger_and_candidate_identity", () => {
  for (const entry of reconciliation.entries.filter((item) => item.disposition === "review_required")) {
    for (const link of entry.clauseLinks) {
      assert.match(link.partLedgerHash, /^[a-f0-9]{64}$/u);
      assert.match(link.candidateSequenceHash, /^[a-f0-9]{64}$/u);
      assert.ok(link.candidateIds.length > 0);
      assert.equal(link.disposition, "review_required");
    }
  }
});

check("exact_reconciliation_contains_no_faq_or_rule_prose", () => {
  const serialized = JSON.stringify(reconciliation);
  assert.equal(serialized.includes('"question"'), false);
  assert.equal(serialized.includes('"answer"'), false);
  assert.equal(serialized.includes('"text"'), false);
  assert.equal(serialized.includes('"excerpt"'), false);
});

check("unknown_duplicate_or_drifted_exact_links_fail_closed", () => {
  const unknown = structuredClone(OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2);
  unknown.reconciliations[0].localClauseIds[0] = "core:unknown:clause";
  assert.throws(() => createOfficialFaqExactReconciliationV2({
    ...input,
    reviewedBinding: unknown,
  }), /official_faq_exact_local_clause_missing/);
  const duplicate = structuredClone(OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2);
  duplicate.reconciliations[0].localClauseIds.push(
    duplicate.reconciliations[0].localClauseIds[0],
  );
  assert.throws(() => createOfficialFaqExactReconciliationV2({
    ...input,
    reviewedBinding: duplicate,
  }), /official_faq_exact_duplicate_local_clause/);
  const drift = structuredClone(OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2);
  drift.coreSemanticCoverageIndexHash = "0".repeat(64);
  assert.throws(() => createOfficialFaqExactReconciliationV2({
    ...input,
    reviewedBinding: drift,
  }), /official_faq_exact_binding_dependency_mismatch/);
});

check("exact_reconciliation_is_order_independent", () => {
  const reversed = structuredClone(OFFICIAL_FAQ_EXACT_RECONCILIATION_BINDING_V2);
  reversed.reconciliations.reverse();
  for (const item of reversed.reconciliations) item.localClauseIds.reverse();
  assert.equal(createOfficialFaqExactReconciliationV2({
    ...input,
    reviewedBinding: reversed,
  }).reconciliationHash, reconciliation.reconciliationHash);
});

check("faq_reconciliation_grants_no_rules_skill_or_training_authority", () => {
  assert.equal(reconciliation.precedence, "pdf_primary_faq_supplemental_no_auto_override");
  assert.equal(reconciliation.rulesEligible, false);
  assert.equal(reconciliation.canAffectRules, false);
  assert.equal(reconciliation.ctx2skillPromotionEligible, false);
  assert.equal(reconciliation.trainingTruth, false);
  assert.equal(reconciliation.globalCanonicalClauseCount, null);
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_official_faq_exact_reconciliation_verification_v2",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  reconciliation,
  audit,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "pending_global_canonical_merge_and_rule_atom_execution",
    promotions: [],
    blocks: reconciliation.blocks,
    remainingRuleGaps: 1090,
  },
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-faq-exact-reconciliation-v2-report.json"),
  `${JSON.stringify(reportBody, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: reportBody.schema,
  acceptancePassed: reportBody.acceptancePassed,
  acceptanceTotal: reportBody.acceptanceTotal,
  failures,
  reconciliationHash: reconciliation.reconciliationHash,
  counts: audit.counts,
  linkageStatus: reconciliation.linkageStatus,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
