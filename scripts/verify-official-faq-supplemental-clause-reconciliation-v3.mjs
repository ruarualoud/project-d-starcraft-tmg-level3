#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3 } from "../content/official-faq-supplemental-clause-binding-v3.mjs";
import {
  createOfficialFaqSupplementalClauseReconciliationV3,
  verifyOfficialFaqSupplementalClauseReconciliationV3,
} from "../packages/rule-atoms/official-faq-supplemental-clause-reconciliation-v3.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");

async function report(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const faqReceipt = (await report("official-gameplay-faq-report.json")).receipt;
const exactReconciliationV2 = (await report(
  "official-faq-exact-reconciliation-v2-report.json",
)).reconciliation;
const input = {
  faqReceipt,
  exactReconciliationV2,
  reviewedBinding: OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3,
};
const reconciliation = createOfficialFaqSupplementalClauseReconciliationV3(input);
const audit = verifyOfficialFaqSupplementalClauseReconciliationV3({
  ...input,
  reconciliation,
});

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("v3_binds_the_frozen_faq_and_exact_v2_receipts", () => {
  assert.equal(reconciliation.faqReceiptHash, faqReceipt.receiptHash);
  assert.equal(
    reconciliation.exactReconciliationV2Hash,
    exactReconciliationV2.reconciliationHash,
  );
  assert.equal(reconciliation.supersedesTreatment, "v2_unmatched_claims_classified");
});

check("v2_history_remains_immutable_with_three_explicit_unmatched_claims", () => {
  assert.equal(exactReconciliationV2.schema, "starcraft_tmg_official_faq_exact_reconciliation_v2");
  assert.equal(exactReconciliationV2.unmatchedSupplementalClaimCount, 3);
  assert.equal(
    exactReconciliationV2.reconciliationHash,
    "eb52639675901921422991dd9cb0d192a9436af5990af6c3b3891ca657e3432f",
  );
});

check("every_v2_supplemental_claim_has_one_stable_v3_clause", () => {
  assert.equal(audit.counts.sourceClaims, 3);
  assert.equal(audit.counts.supplementalClauses, 3);
  assert.equal(audit.counts.unresolvedSourceClaims, 0);
  assert.equal(audit.counts.duplicateSourceClaims, 0);
});

check("supplemental_clauses_separate_rules_candidates_from_display_facts", () => {
  assert.equal(audit.counts.reviewRequired, 2);
  assert.equal(audit.counts.displayOnly, 1);
  assert.equal(audit.counts.unclassified, 0);
  assert.equal(reconciliation.faqLocalClauseCount, 3);
  assert.equal(reconciliation.faqNormativeClauseCount, 2);
  assert.equal(reconciliation.faqDisplayOnlyClauseCount, 1);
});

check("skirmish_dimensions_are_a_typed_setup_constraint_candidate", () => {
  const clause = reconciliation.supplementalClauses.find((item) => (
    item.clauseId === "faq:9.43:skirmish-battlefield-dimensions"
  ));
  assert.deepEqual(clause.semanticValue, {
    kind: "battlefield_dimensions",
    engagementScale: "skirmish",
    widthInches: 36,
    heightInches: 36,
  });
  assert.equal(clause.disposition, "review_required");
  assert.equal(clause.ruleAtomCandidate, true);
  assert.equal(clause.ruleAtomEligible, false);
});

check("metric_dimensions_are_kept_as_display_equivalents_only", () => {
  const clause = reconciliation.supplementalClauses.find((item) => (
    item.clauseId === "faq:9.43:metric-dimension-equivalents"
  ));
  assert.deepEqual(clause.semanticValue, {
    kind: "dimension_display_equivalents",
    mappings: [
      { inches: [36, 36], centimetres: [92, 92] },
      { inches: [54, 36], centimetres: [137, 92] },
    ],
  });
  assert.equal(clause.disposition, "display_only");
  assert.equal(clause.ruleAtomCandidate, false);
  assert.equal(clause.ruleAtomEligible, false);
});

check("terrain_height_timing_is_a_typed_setup_constraint_candidate", () => {
  const clause = reconciliation.supplementalClauses.find((item) => (
    item.clauseId === "faq:9.46:terrain-height-tier-game-start"
  ));
  assert.deepEqual(clause.semanticValue, {
    kind: "terrain_height_tier_assignment_timing",
    timing: "game_start",
    scope: "each_terrain_piece",
  });
  assert.equal(clause.disposition, "review_required");
  assert.equal(clause.ruleAtomCandidate, true);
  assert.equal(clause.ruleAtomEligible, false);
});

check("supplemental_clause_artifact_contains_no_source_prose", () => {
  const serialized = JSON.stringify(reconciliation);
  for (const forbidden of ["\"question\"", "\"answer\"", "\"text\"", "\"excerpt\""]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

check("unknown_duplicate_or_misclassified_claims_fail_closed", () => {
  const unknown = structuredClone(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3);
  unknown.supplementalClauses[0].sourceClaimCode = "unknown_claim";
  assert.throws(() => createOfficialFaqSupplementalClauseReconciliationV3({
    ...input,
    reviewedBinding: unknown,
  }), /official_faq_supplemental_unknown_source_claim/);

  const duplicate = structuredClone(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3);
  duplicate.supplementalClauses[1].sourceClaimCode = duplicate.supplementalClauses[0].sourceClaimCode;
  assert.throws(() => createOfficialFaqSupplementalClauseReconciliationV3({
    ...input,
    reviewedBinding: duplicate,
  }), /official_faq_supplemental_duplicate_source_claim/);

  const displayRule = structuredClone(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3);
  displayRule.supplementalClauses.find((item) => (
    item.disposition === "display_only"
  )).ruleAtomCandidate = true;
  assert.throws(() => createOfficialFaqSupplementalClauseReconciliationV3({
    ...input,
    reviewedBinding: displayRule,
  }), /official_faq_supplemental_display_rule_candidate_forbidden/);
});

check("supplemental_reconciliation_is_order_independent", () => {
  const reversed = structuredClone(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3);
  reversed.supplementalClauses.reverse();
  assert.equal(
    createOfficialFaqSupplementalClauseReconciliationV3({
      ...input,
      reviewedBinding: reversed,
    }).reconciliationHash,
    reconciliation.reconciliationHash,
  );
});

check("dependency_or_semantic_drift_fails_closed", () => {
  const dependencyDrift = structuredClone(OFFICIAL_FAQ_SUPPLEMENTAL_CLAUSE_BINDING_V3);
  dependencyDrift.exactReconciliationV2Hash = "0".repeat(64);
  assert.throws(() => createOfficialFaqSupplementalClauseReconciliationV3({
    ...input,
    reviewedBinding: dependencyDrift,
  }), /official_faq_supplemental_binding_dependency_mismatch/);

  const semanticDrift = structuredClone(reconciliation);
  semanticDrift.supplementalClauses[0].semanticValue.widthInches = 37;
  assert.throws(() => verifyOfficialFaqSupplementalClauseReconciliationV3({
    ...input,
    reconciliation: semanticDrift,
  }), /official_faq_supplemental_reconciliation_hash_mismatch/);
});

check("classification_grants_no_rules_skill_or_training_authority", () => {
  assert.equal(reconciliation.unresolvedSupplementalClaimCount, 0);
  assert.equal(reconciliation.globalCanonicalClauseCount, null);
  assert.equal(reconciliation.rulesEligible, false);
  assert.equal(reconciliation.canAffectRules, false);
  assert.equal(reconciliation.ctx2skillPromotionEligible, false);
  assert.equal(reconciliation.trainingTruth, false);
  assert.equal(
    reconciliation.reconciliationStatus,
    "supplemental_claims_classified_global_canonical_merge_pending",
  );
});

const failures = acceptance.filter((item) => !item.passed);
const reportBody = {
  schema: "starcraft_tmg_official_faq_supplemental_clause_verification_v3",
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
    remainingRuleGaps: 1093,
  },
  rulesTruth: false,
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-faq-supplemental-clause-v3-report.json"),
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
  reconciliationStatus: reconciliation.reconciliationStatus,
  globalCanonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
