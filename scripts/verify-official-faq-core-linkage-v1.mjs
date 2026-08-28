#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_CORE_LINK_BINDING_V1 } from "../content/official-faq-core-link-binding-v1.mjs";
import {
  createOfficialFaqCoreLinkage,
  verifyOfficialFaqCoreLinkage,
} from "../packages/rule-atoms/official-faq-core-linkage-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const faqReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "official-gameplay-faq-report.json"), "utf8"));
const clauseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR, "core-clause-candidate-denominator-report.json"), "utf8"));
const faqReceipt = faqReport.receipt;
const denominator = clauseReport.denominator;

const acceptance = [];
function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

const linkage = createOfficialFaqCoreLinkage({
  faqReceipt,
  denominator,
  reviewedBinding: OFFICIAL_FAQ_CORE_LINK_BINDING_V1,
});
const audit = verifyOfficialFaqCoreLinkage({ faqReceipt, denominator, linkage });

check("all_seven_faq_entries_have_exact_dispositions", () => {
  assert.equal(audit.counts.entries, 7);
  assert.equal(audit.counts.normativeReviewRequired, 3);
  assert.equal(audit.counts.displayOnly, 4);
  assert.equal(audit.counts.unclassified, 0);
});

check("three_normative_candidates_link_nine_core_anchors", () => {
  assert.equal(audit.counts.anchorLinks, 9);
  assert.equal(audit.counts.missingAnchors, 0);
  assert.deepEqual(linkage.entries.filter((entry) => entry.disposition === "review_required")
    .map((entry) => entry.entryId), ["faq_9_42", "faq_9_43", "faq_9_46"]);
});

check("display_only_entries_have_no_rule_links", () => {
  assert.ok(linkage.entries.filter((entry) => entry.disposition === "display_only")
    .every((entry) => entry.anchorLinks.length === 0));
});

check("pdf_remains_primary_and_faq_cannot_auto_override", () => {
  assert.equal(linkage.precedence, "pdf_primary_faq_supplemental_review_only");
  assert.equal(linkage.autoOverrideAllowed, false);
  assert.equal(linkage.faqErrataStatus, "not_declared_by_source");
});

check("anchor_linkage_does_not_claim_exact_clause_reconciliation", () => {
  assert.equal(linkage.exactCandidateClauseLinkCount, 0);
  assert.equal(linkage.canonicalClauseCount, null);
  assert.equal(linkage.linkageStatus, "anchor_linked_exact_clause_reconciliation_pending");
});

check("linkage_contains_hashes_and_locators_but_no_faq_or_rule_text", () => {
  const serialized = JSON.stringify(linkage);
  assert.equal(serialized.includes('"question"'), false);
  assert.equal(serialized.includes('"answer"'), false);
  assert.equal(serialized.includes('"text"'), false);
  assert.ok(linkage.entries.every((entry) => /^[a-f0-9]{64}$/u.test(entry.answerHash)));
});

check("binding_or_source_drift_fails_closed", () => {
  assert.throws(() => createOfficialFaqCoreLinkage({
    faqReceipt,
    denominator,
    reviewedBinding: {
      ...OFFICIAL_FAQ_CORE_LINK_BINDING_V1,
      faqReceiptHash: "0".repeat(64),
    },
  }), /official_faq_core_link_binding_dependency_mismatch/);
});

check("duplicate_or_unknown_links_fail_closed", () => {
  assert.throws(() => createOfficialFaqCoreLinkage({
    faqReceipt,
    denominator,
    reviewedBinding: {
      ...OFFICIAL_FAQ_CORE_LINK_BINDING_V1,
      normativeLinks: [
        ...OFFICIAL_FAQ_CORE_LINK_BINDING_V1.normativeLinks,
        OFFICIAL_FAQ_CORE_LINK_BINDING_V1.normativeLinks[0],
      ],
    },
  }), /duplicate_official_faq_core_link/);
});

check("semantic_linkage_is_order_independent", () => {
  assert.equal(createOfficialFaqCoreLinkage({
    faqReceipt,
    denominator,
    reviewedBinding: {
      ...OFFICIAL_FAQ_CORE_LINK_BINDING_V1,
      normativeLinks: [...OFFICIAL_FAQ_CORE_LINK_BINDING_V1.normativeLinks].reverse(),
      displayOnlyEntryIds: [...OFFICIAL_FAQ_CORE_LINK_BINDING_V1.displayOnlyEntryIds].reverse(),
    },
  }).linkageHash, linkage.linkageHash);
});

check("faq_linkage_grants_no_rules_or_training_authority", () => {
  assert.equal(linkage.rulesEligible, false);
  assert.equal(linkage.canAffectRules, false);
  assert.equal(linkage.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_faq_core_linkage_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  linkage,
  audit,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "official-faq-core-linkage-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  linkageHash: linkage.linkageHash,
  counts: audit.counts,
  linkageStatus: linkage.linkageStatus,
  canonicalClauseCount: null,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
