import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createCoreSemanticClauseCoverageIndex,
  verifyCoreSemanticClauseCoverageIndex,
} from "./core-semantic-clause-coverage-index-v1.mjs";
import { verifyOfficialFaqCoreLinkage } from "./official-faq-core-linkage-v1.mjs";
import { verifyOfficialGameplayFaqReceipt } from "./official-gameplay-faq-source-v1.mjs";
import { verifyPartSemanticClauseLedger } from "./part-semantic-clause-ledger-v1.mjs";

const RECONCILIATION_SCHEMA = "starcraft_tmg_official_faq_exact_reconciliation_v2";
const BINDING_SCHEMA = "starcraft_tmg_official_faq_exact_reconciliation_binding_v2";
const RELATIONS = Object.freeze([
  "consistent_core_summary",
  "supplemental_product_fact_no_rule_override",
  "consistent_core_summary_with_unmatched_setup_detail",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function hash(value, code) {
  const normalized = text(value, code).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) fail(code);
  return normalized;
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sortedUniqueText(values, duplicateCode, requiredCode) {
  if (!Array.isArray(values)) fail(requiredCode);
  const normalized = values.map((value) => text(value, requiredCode));
  if (new Set(normalized).size !== normalized.length) fail(duplicateCode);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function assertCompleteCorpus(input) {
  const { faqReceipt, denominator, anchorLinkage, coverageIndex, partLedgers } = input;
  verifyOfficialGameplayFaqReceipt(faqReceipt);
  verifyOfficialFaqCoreLinkage({ faqReceipt, denominator, linkage: anchorLinkage });
  const coverageAudit = verifyCoreSemanticClauseCoverageIndex({ denominator, index: coverageIndex });
  if (coverageIndex.uncoveredSourceParts.length > 0
    || coverageAudit.counts.remainingSourceCandidates !== 0
    || coverageIndex.coverageStatus !== "all_part_boundaries_reviewed_global_merge_pending") {
    fail("official_faq_exact_core_coverage_incomplete");
  }
  if (!Array.isArray(partLedgers) || partLedgers.length !== coverageIndex.partLedgers.length) {
    fail("official_faq_exact_part_ledgers_incomplete");
  }
  const summaryByPart = new Map(coverageIndex.partLedgers
    .map((summary) => [summary.sourcePart, summary]));
  const ledgerByPart = new Map();
  const clauseById = new Map();
  for (const ledger of partLedgers) {
    const audit = verifyPartSemanticClauseLedger({ denominator, ledger });
    if (ledgerByPart.has(ledger.sourcePart)) {
      fail("official_faq_exact_duplicate_part_ledger", ledger.sourcePart);
    }
    const summary = summaryByPart.get(ledger.sourcePart);
    if (!summary
      || summary.ledgerHash !== ledger.ledgerHash
      || summary.sourceCandidateCount !== audit.counts.sourceCandidates
      || summary.canonicalClauseCount !== audit.counts.canonicalClauses) {
      fail("official_faq_exact_part_ledger_coverage_mismatch", ledger.sourcePart);
    }
    ledgerByPart.set(ledger.sourcePart, ledger);
    for (const clause of ledger.canonicalClauses) {
      if (clauseById.has(clause.clauseId)) {
        fail("official_faq_exact_duplicate_corpus_clause", clause.clauseId);
      }
      clauseById.set(clause.clauseId, { clause, partLedgerHash: ledger.ledgerHash });
    }
  }
  if (JSON.stringify([...ledgerByPart.keys()].sort((left, right) => Number(left) - Number(right)))
    !== JSON.stringify(coverageIndex.coveredSourceParts)) {
    fail("official_faq_exact_part_ledger_set_mismatch");
  }
  const rebuiltCoverage = createCoreSemanticClauseCoverageIndex({ denominator, ledgers: partLedgers });
  if (rebuiltCoverage.coverageIndexHash !== coverageIndex.coverageIndexHash) {
    fail("official_faq_exact_rebuilt_coverage_mismatch");
  }
  return {
    clauseById,
    sourceParts: [...coverageIndex.coveredSourceParts],
  };
}

function normalizeBinding(input, corpus) {
  const {
    faqReceipt,
    denominator,
    anchorLinkage,
    coverageIndex,
    reviewedBinding,
  } = input;
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("official_faq_exact_binding_invalid");
  }
  if (reviewedBinding.faqReceiptHash !== faqReceipt.receiptHash
    || reviewedBinding.anchorLinkageHash !== anchorLinkage.linkageHash
    || reviewedBinding.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || reviewedBinding.coreSemanticCoverageIndexHash !== coverageIndex.coverageIndexHash) {
    fail("official_faq_exact_binding_dependency_mismatch");
  }
  if (reviewedBinding.anchorLinkageTreatment !== "superseded_by_exact_clause_review"
    || reviewedBinding.precedence !== "pdf_primary_faq_supplemental_no_auto_override") {
    fail("official_faq_exact_binding_precedence_invalid");
  }
  if (!Array.isArray(reviewedBinding.reconciliations)) {
    fail("official_faq_exact_reconciliations_required");
  }
  const faqById = new Map(faqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  const byEntryId = new Map();
  for (const raw of reviewedBinding.reconciliations) {
    if (!object(raw)) fail("official_faq_exact_reconciliation_entry_invalid");
    const entryId = text(raw.entryId, "official_faq_exact_entry_id_required");
    if (byEntryId.has(entryId)) fail("official_faq_exact_duplicate_entry", entryId);
    if (!faqReceipt.normativeCandidateEntryIds.includes(entryId)
      || faqById.get(entryId)?.initialDisposition !== "review_required") {
      fail("official_faq_exact_normative_entry_invalid", entryId);
    }
    const relation = text(raw.relation, "official_faq_exact_relation_required");
    if (!RELATIONS.includes(relation)) fail("official_faq_exact_relation_invalid", relation);
    const localClauseIds = sortedUniqueText(
      raw.localClauseIds,
      "official_faq_exact_duplicate_local_clause",
      "official_faq_exact_local_clauses_required",
    );
    if (localClauseIds.length === 0) fail("official_faq_exact_local_clauses_required", entryId);
    const clauseLinks = localClauseIds.map((clauseId) => {
      const resolved = corpus.clauseById.get(clauseId);
      if (!resolved) fail("official_faq_exact_local_clause_missing", clauseId);
      if (resolved.clause.disposition !== "review_required") {
        fail("official_faq_exact_non_normative_clause_link", clauseId);
      }
      return {
        clauseId,
        sourcePart: resolved.clause.sourcePart,
        anchorId: resolved.clause.anchorId,
        partLedgerHash: resolved.partLedgerHash,
        candidateIds: [...resolved.clause.candidateIds],
        candidateSequenceHash: resolved.clause.candidateSequenceHash,
        disposition: resolved.clause.disposition,
      };
    });
    const unmatchedSupplementalClaimCodes = sortedUniqueText(
      raw.unmatchedSupplementalClaimCodes,
      "official_faq_exact_duplicate_supplemental_claim",
      "official_faq_exact_supplemental_claims_required",
    );
    byEntryId.set(entryId, {
      entryId,
      relation,
      reviewBasisCode: text(raw.reviewBasisCode, "official_faq_exact_review_basis_required"),
      localClauseIds,
      clauseLinks,
      unmatchedSupplementalClaimCodes,
    });
  }
  const expectedNormative = [...faqReceipt.normativeCandidateEntryIds]
    .sort((left, right) => left.localeCompare(right));
  if (JSON.stringify([...byEntryId.keys()].sort((left, right) => left.localeCompare(right)))
    !== JSON.stringify(expectedNormative)) {
    fail("official_faq_exact_normative_denominator_mismatch");
  }
  const displayOnlyEntryIds = sortedUniqueText(
    reviewedBinding.displayOnlyEntryIds,
    "official_faq_exact_duplicate_display_entry",
    "official_faq_exact_display_entries_required",
  );
  const expectedDisplay = [...faqReceipt.displayOnlyEntryIds]
    .sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(displayOnlyEntryIds) !== JSON.stringify(expectedDisplay)) {
    fail("official_faq_exact_display_denominator_mismatch");
  }
  return {
    binding: {
      schema: BINDING_SCHEMA,
      faqReceiptHash: reviewedBinding.faqReceiptHash,
      anchorLinkageHash: reviewedBinding.anchorLinkageHash,
      coreClauseCandidateDenominatorHash: reviewedBinding.coreClauseCandidateDenominatorHash,
      coreSemanticCoverageIndexHash: reviewedBinding.coreSemanticCoverageIndexHash,
      anchorLinkageTreatment: reviewedBinding.anchorLinkageTreatment,
      precedence: reviewedBinding.precedence,
      reconciliations: [...byEntryId.values()].map((entry) => ({
        entryId: entry.entryId,
        relation: entry.relation,
        reviewBasisCode: entry.reviewBasisCode,
        localClauseIds: entry.localClauseIds,
        unmatchedSupplementalClaimCodes: entry.unmatchedSupplementalClaimCodes,
      })).sort((left, right) => left.entryId.localeCompare(right.entryId)),
      displayOnlyEntryIds,
    },
    byEntryId,
  };
}

function reconciliationBody(reconciliation) {
  return without(reconciliation, ["reconciliationHash"]);
}

export function createOfficialFaqExactReconciliationV2(input = {}) {
  const corpus = assertCompleteCorpus(input);
  const normalized = normalizeBinding(input, corpus);
  const faqById = new Map(input.faqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  const entries = input.faqReceipt.entryIndex.map((faq) => {
    const reviewed = normalized.byEntryId.get(faq.entryId);
    if (!reviewed) {
      return {
        entryId: faq.entryId,
        ordinal: faq.ordinal,
        questionHash: faq.questionHash,
        answerHash: faq.answerHash,
        disposition: "display_only",
        relation: "non_normative_product_faq",
        reviewBasisCode: "non_normative_product_faq",
        clauseLinks: [],
        unmatchedSupplementalClaimCodes: [],
        executable: false,
        trainingTruth: false,
      };
    }
    return {
      entryId: faq.entryId,
      ordinal: faq.ordinal,
      questionHash: faq.questionHash,
      answerHash: faq.answerHash,
      disposition: "review_required",
      relation: reviewed.relation,
      reviewBasisCode: reviewed.reviewBasisCode,
      clauseLinks: reviewed.clauseLinks,
      unmatchedSupplementalClaimCodes: reviewed.unmatchedSupplementalClaimCodes,
      executable: false,
      trainingTruth: false,
    };
  });
  const exactLocalClauseLinkCount = entries
    .reduce((total, entry) => total + entry.clauseLinks.length, 0);
  const exactCandidateClauseLinkCount = entries.reduce((total, entry) => (
    total + entry.clauseLinks.reduce((subtotal, link) => subtotal + link.candidateIds.length, 0)
  ), 0);
  const unmatchedSupplementalClaimCount = entries
    .reduce((total, entry) => total + entry.unmatchedSupplementalClaimCodes.length, 0);
  const body = {
    schema: RECONCILIATION_SCHEMA,
    faqReceiptHash: input.faqReceipt.receiptHash,
    faqSemanticContentHash: input.faqReceipt.semanticContentHash,
    anchorLinkageHash: input.anchorLinkage.linkageHash,
    coreClauseCandidateDenominatorHash: input.denominator.denominatorHash,
    coreSemanticCoverageIndexHash: input.coverageIndex.coverageIndexHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalized.binding),
    sourceParts: corpus.sourceParts,
    entries,
    precedence: "pdf_primary_faq_supplemental_no_auto_override",
    autoOverrideAllowed: false,
    faqErrataStatus: "not_declared_by_source",
    exactLocalClauseLinkCount,
    exactCandidateClauseLinkCount,
    unmatchedSupplementalClaimCount,
    faqCanonicalClauseCount: 0,
    globalCanonicalClauseCount: null,
    linkageStatus: "exact_candidate_clause_reconciled_global_canonical_merge_pending",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "faq_source_declares_no_semantic_errata_version",
      "supplemental_claims_require_current_data_or_setup_review",
      "global_canonical_clause_merge_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, reconciliationHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqExactReconciliationV2(input = {}) {
  const {
    faqReceipt,
    denominator,
    anchorLinkage,
    coverageIndex,
    partLedgers,
    reconciliation,
  } = input;
  const corpus = assertCompleteCorpus({
    faqReceipt,
    denominator,
    anchorLinkage,
    coverageIndex,
    partLedgers,
  });
  if (!object(reconciliation) || reconciliation.schema !== RECONCILIATION_SCHEMA) {
    fail("official_faq_exact_reconciliation_schema_invalid");
  }
  if (hashStarcraftTmgContract(reconciliationBody(reconciliation))
    !== reconciliation.reconciliationHash) {
    fail("official_faq_exact_reconciliation_hash_mismatch");
  }
  if (reconciliation.faqReceiptHash !== faqReceipt.receiptHash
    || reconciliation.anchorLinkageHash !== anchorLinkage.linkageHash
    || reconciliation.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || reconciliation.coreSemanticCoverageIndexHash !== coverageIndex.coverageIndexHash) {
    fail("official_faq_exact_reconciliation_dependency_mismatch");
  }
  const faqById = new Map(faqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  const seen = new Set();
  let normativeReviewRequired = 0;
  let displayOnly = 0;
  let unclassified = 0;
  let exactLocalClauseLinks = 0;
  let exactCandidateClauseLinks = 0;
  let unmatchedSupplementalClaims = 0;
  let missingLocalClauses = 0;
  let missingCandidates = 0;
  const denominatorCandidateIds = new Set(denominator.clauseCandidates
    .map((candidate) => candidate.clauseCandidateId));
  for (const entry of reconciliation.entries || []) {
    const faq = faqById.get(entry.entryId);
    if (!faq || seen.has(entry.entryId)) fail("official_faq_exact_entry_coverage_invalid");
    seen.add(entry.entryId);
    if (entry.questionHash !== faq.questionHash || entry.answerHash !== faq.answerHash) {
      fail("official_faq_exact_entry_source_hash_mismatch", entry.entryId);
    }
    if (entry.disposition === "review_required") normativeReviewRequired += 1;
    else if (entry.disposition === "display_only") displayOnly += 1;
    else unclassified += 1;
    if (entry.disposition === "display_only"
      && (entry.clauseLinks.length > 0 || entry.unmatchedSupplementalClaimCodes.length > 0)) {
      fail("official_faq_exact_display_semantic_link_forbidden", entry.entryId);
    }
    for (const link of entry.clauseLinks) {
      exactLocalClauseLinks += 1;
      const resolved = corpus.clauseById.get(link.clauseId);
      if (!resolved) {
        missingLocalClauses += 1;
        continue;
      }
      if (link.sourcePart !== resolved.clause.sourcePart
        || link.anchorId !== resolved.clause.anchorId
        || link.partLedgerHash !== resolved.partLedgerHash
        || link.candidateSequenceHash !== resolved.clause.candidateSequenceHash
        || link.disposition !== resolved.clause.disposition
        || JSON.stringify(link.candidateIds) !== JSON.stringify(resolved.clause.candidateIds)) {
        fail("official_faq_exact_clause_link_mismatch", link.clauseId);
      }
      exactCandidateClauseLinks += link.candidateIds.length;
      missingCandidates += link.candidateIds
        .filter((candidateId) => !denominatorCandidateIds.has(candidateId)).length;
    }
    unmatchedSupplementalClaims += entry.unmatchedSupplementalClaimCodes.length;
    if (entry.executable !== false || entry.trainingTruth !== false) {
      fail("official_faq_exact_premature_entry_authority", entry.entryId);
    }
  }
  if (seen.size !== faqReceipt.entryIndex.length || unclassified > 0
    || missingLocalClauses > 0 || missingCandidates > 0) {
    fail("official_faq_exact_reconciliation_coverage_invalid");
  }
  const counts = {
    entries: reconciliation.entries.length,
    normativeReviewRequired,
    displayOnly,
    unclassified,
    exactLocalClauseLinks,
    exactCandidateClauseLinks,
    unmatchedSupplementalClaims,
    missingLocalClauses,
    missingCandidates,
  };
  if (reconciliation.exactLocalClauseLinkCount !== exactLocalClauseLinks
    || reconciliation.exactCandidateClauseLinkCount !== exactCandidateClauseLinks
    || reconciliation.unmatchedSupplementalClaimCount !== unmatchedSupplementalClaims
    || reconciliation.faqCanonicalClauseCount !== 0
    || reconciliation.globalCanonicalClauseCount !== null
    || reconciliation.linkageStatus
      !== "exact_candidate_clause_reconciled_global_canonical_merge_pending"
    || reconciliation.rulesEligible !== false
    || reconciliation.canAffectRules !== false
    || reconciliation.ctx2skillPromotionEligible !== false
    || reconciliation.trainingTruth !== false) {
    fail("official_faq_exact_reconciliation_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_faq_exact_reconciliation_audit_v2",
    reconciliationHash: reconciliation.reconciliationHash,
    counts,
    faqCanonicalClauseCount: 0,
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
