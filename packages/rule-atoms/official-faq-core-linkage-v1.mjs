import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayFaqReceipt } from "./official-gameplay-faq-source-v1.mjs";

const LINKAGE_SCHEMA = "starcraft_tmg_official_faq_core_linkage_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function assertDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA) {
    fail("official_faq_core_denominator_invalid");
  }
  if (hashStarcraftTmgContract(without(denominator, ["denominatorHash"])) !== denominator.denominatorHash) {
    fail("official_faq_core_denominator_hash_mismatch");
  }
  if (denominator.canonicalClauseCount !== null || denominator.rulesEligible !== false) {
    fail("official_faq_core_denominator_premature_authority");
  }
}

function linkageBody(linkage) {
  return without(linkage, ["linkageHash"]);
}

export function createOfficialFaqCoreLinkage(input = {}) {
  const { faqReceipt, denominator, reviewedBinding } = input;
  verifyOfficialGameplayFaqReceipt(faqReceipt);
  assertDenominator(denominator);
  if (!object(reviewedBinding)
    || reviewedBinding.schema !== "starcraft_tmg_official_faq_core_reviewed_link_binding_v1") {
    fail("official_faq_core_reviewed_binding_invalid");
  }
  if (reviewedBinding.faqReceiptHash !== faqReceipt.receiptHash
    || reviewedBinding.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || reviewedBinding.anchorIndexHash !== denominator.anchorIndexHash) {
    fail("official_faq_core_link_binding_dependency_mismatch");
  }
  if (reviewedBinding.precedence !== "pdf_primary_faq_supplemental_review_only") {
    fail("official_faq_core_precedence_invalid");
  }
  const faqById = new Map(faqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  const regionByAnchorId = new Map(denominator.anchorRegions.map((region) => [region.anchorId, region]));
  const normativeById = new Map();
  for (const link of reviewedBinding.normativeLinks || []) {
    const entryId = String(link?.entryId || "");
    if (normativeById.has(entryId)) fail("duplicate_official_faq_core_link", entryId);
    const faq = faqById.get(entryId);
    if (!faq || faq.initialDisposition !== "review_required") {
      fail("official_faq_normative_link_disposition_invalid", entryId);
    }
    if (!Array.isArray(link.anchorIds) || link.anchorIds.length === 0) {
      fail("official_faq_core_anchor_link_required", entryId);
    }
    const anchorIds = [...link.anchorIds].map(String).sort((left, right) => left.localeCompare(right));
    if (new Set(anchorIds).size !== anchorIds.length) fail("duplicate_official_faq_core_anchor", entryId);
    for (const anchorId of anchorIds) {
      if (!regionByAnchorId.has(anchorId)) fail("official_faq_core_anchor_missing", `${entryId}:${anchorId}`);
    }
    normativeById.set(entryId, {
      entryId,
      anchorIds,
      reviewBasis: String(link.reviewBasis || ""),
    });
  }
  const expectedNormative = [...faqReceipt.normativeCandidateEntryIds].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify([...normativeById.keys()].sort((left, right) => left.localeCompare(right))) !== JSON.stringify(expectedNormative)) {
    fail("official_faq_normative_link_denominator_mismatch");
  }
  const displayOnlyEntryIds = [...(reviewedBinding.displayOnlyEntryIds || [])]
    .map(String).sort((left, right) => left.localeCompare(right));
  const expectedDisplay = [...faqReceipt.displayOnlyEntryIds].sort((left, right) => left.localeCompare(right));
  if (new Set(displayOnlyEntryIds).size !== displayOnlyEntryIds.length
    || JSON.stringify(displayOnlyEntryIds) !== JSON.stringify(expectedDisplay)) {
    fail("official_faq_display_only_denominator_mismatch");
  }
  const normalizedBinding = {
    schema: reviewedBinding.schema,
    faqReceiptHash: reviewedBinding.faqReceiptHash,
    coreClauseCandidateDenominatorHash: reviewedBinding.coreClauseCandidateDenominatorHash,
    anchorIndexHash: reviewedBinding.anchorIndexHash,
    normativeLinks: [...normativeById.values()].sort((left, right) => left.entryId.localeCompare(right.entryId)),
    displayOnlyEntryIds,
    precedence: reviewedBinding.precedence,
  };
  const entries = faqReceipt.entryIndex.map((faq) => {
    const normative = normativeById.get(faq.entryId);
    return {
      entryId: faq.entryId,
      ordinal: faq.ordinal,
      questionHash: faq.questionHash,
      answerHash: faq.answerHash,
      disposition: normative ? "review_required" : "display_only",
      reviewBasis: normative?.reviewBasis || "non_normative_product_faq",
      anchorLinks: (normative?.anchorIds || []).map((anchorId) => {
        const region = regionByAnchorId.get(anchorId);
        return {
          anchorId,
          sourceAnchorId: region.sourceAnchorId,
          anchorKind: region.anchorKind,
          normalizedRegionHash: region.normalizedRegionHash,
          candidateClauseCount: region.candidateClauseCount,
        };
      }),
      exactCandidateClauseIds: [],
      executable: false,
      trainingTruth: false,
    };
  });
  const body = {
    schema: LINKAGE_SCHEMA,
    faqReceiptHash: faqReceipt.receiptHash,
    faqSemanticContentHash: faqReceipt.semanticContentHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    anchorIndexHash: denominator.anchorIndexHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalizedBinding),
    entries,
    precedence: "pdf_primary_faq_supplemental_review_only",
    autoOverrideAllowed: false,
    faqErrataStatus: "not_declared_by_source",
    exactCandidateClauseLinkCount: 0,
    canonicalClauseCount: null,
    linkageStatus: "anchor_linked_exact_clause_reconciliation_pending",
    rulesEligible: false,
    canAffectRules: false,
    blocks: [
      "faq_exact_candidate_clause_reconciliation_pending",
      "faq_source_declares_no_semantic_errata_version",
      "faq_normative_candidates_not_mapped_to_rule_atoms",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, linkageHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqCoreLinkage(input = {}) {
  const { faqReceipt, denominator, linkage } = input;
  verifyOfficialGameplayFaqReceipt(faqReceipt);
  assertDenominator(denominator);
  if (!object(linkage) || linkage.schema !== LINKAGE_SCHEMA) fail("official_faq_core_linkage_schema_invalid");
  if (hashStarcraftTmgContract(linkageBody(linkage)) !== linkage.linkageHash) {
    fail("official_faq_core_linkage_hash_mismatch");
  }
  if (linkage.faqReceiptHash !== faqReceipt.receiptHash
    || linkage.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || linkage.anchorIndexHash !== denominator.anchorIndexHash) {
    fail("official_faq_core_linkage_dependency_mismatch");
  }
  const anchorIds = new Set(denominator.anchorRegions.map((region) => region.anchorId));
  const seen = new Set();
  let normativeReviewRequired = 0;
  let displayOnly = 0;
  let anchorLinks = 0;
  let missingAnchors = 0;
  let unclassified = 0;
  for (const entry of linkage.entries) {
    if (seen.has(entry.entryId)) fail("duplicate_official_faq_core_linkage_entry", entry.entryId);
    seen.add(entry.entryId);
    if (entry.disposition === "review_required") normativeReviewRequired += 1;
    else if (entry.disposition === "display_only") displayOnly += 1;
    else unclassified += 1;
    for (const link of entry.anchorLinks) {
      anchorLinks += 1;
      if (!anchorIds.has(link.anchorId)) missingAnchors += 1;
    }
    if (entry.disposition === "display_only" && entry.anchorLinks.length > 0) {
      fail("official_faq_display_only_rule_link_forbidden", entry.entryId);
    }
    if (entry.executable !== false || entry.trainingTruth !== false) {
      fail("official_faq_linkage_premature_authority", entry.entryId);
    }
  }
  if (seen.size !== faqReceipt.entryIndex.length || missingAnchors || unclassified) {
    fail("official_faq_core_linkage_coverage_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_faq_core_linkage_audit_v1",
    linkageHash: linkage.linkageHash,
    counts: {
      entries: linkage.entries.length,
      normativeReviewRequired,
      displayOnly,
      anchorLinks,
      missingAnchors,
      unclassified,
      exactCandidateClauseLinks: linkage.exactCandidateClauseLinkCount,
    },
    linkageStatus: linkage.linkageStatus,
    canonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}
