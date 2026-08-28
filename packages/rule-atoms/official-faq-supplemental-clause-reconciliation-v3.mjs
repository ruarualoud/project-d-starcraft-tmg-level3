import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialGameplayFaqReceipt } from "./official-gameplay-faq-source-v1.mjs";
import { isDeepStrictEqual } from "node:util";

const RECONCILIATION_SCHEMA = "starcraft_tmg_official_faq_supplemental_clause_reconciliation_v3";
const BINDING_SCHEMA = "starcraft_tmg_official_faq_supplemental_clause_binding_v3";
const EXPECTED_V2_SCHEMA = "starcraft_tmg_official_faq_exact_reconciliation_v2";
const EXPECTED_V2_HASH = "eb52639675901921422991dd9cb0d192a9436af5990af6c3b3891ca657e3432f";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DISPOSITIONS = Object.freeze(["review_required", "display_only"]);
const SEMANTIC_KINDS = Object.freeze(["setup_constraint", "display_reference"]);

const EXPECTED_CLAIMS = Object.freeze({
  small_engagement_dimensions_current_data_binding_pending: Object.freeze({
    clauseId: "faq:9.43:skirmish-battlefield-dimensions",
    sourceEntryId: "faq_9_43",
    sourceAnswerHash: "4baffdc5fea962bcb4a692ff26079c7f005f9320767b3cb42fda194766521224",
    semanticKind: "setup_constraint",
    semanticValue: Object.freeze({
      kind: "battlefield_dimensions",
      engagementScale: "skirmish",
      widthInches: 36,
      heightInches: 36,
    }),
    disposition: "review_required",
    reviewBasisCode: "official_faq_skirmish_dimensions_supplement",
    ruleAtomCandidate: true,
    ruleAtomEligible: false,
  }),
  metric_dimension_equivalents_current_data_binding_pending: Object.freeze({
    clauseId: "faq:9.43:metric-dimension-equivalents",
    sourceEntryId: "faq_9_43",
    sourceAnswerHash: "4baffdc5fea962bcb4a692ff26079c7f005f9320767b3cb42fda194766521224",
    semanticKind: "display_reference",
    semanticValue: Object.freeze({
      kind: "dimension_display_equivalents",
      mappings: Object.freeze([
        Object.freeze({ inches: Object.freeze([36, 36]), centimetres: Object.freeze([92, 92]) }),
        Object.freeze({ inches: Object.freeze([54, 36]), centimetres: Object.freeze([137, 92]) }),
      ]),
    }),
    disposition: "display_only",
    reviewBasisCode: "official_faq_metric_equivalents_display_only",
    ruleAtomCandidate: false,
    ruleAtomEligible: false,
  }),
  terrain_height_tier_setup_detail_not_exact_core_clause: Object.freeze({
    clauseId: "faq:9.46:terrain-height-tier-game-start",
    sourceEntryId: "faq_9_46",
    sourceAnswerHash: "127ba2bbd5d25e38e6efe1e8651a2f7ba91eda8a9677557ca58f8bea10a1c1cc",
    semanticKind: "setup_constraint",
    semanticValue: Object.freeze({
      kind: "terrain_height_tier_assignment_timing",
      timing: "game_start",
      scope: "each_terrain_piece",
    }),
    disposition: "review_required",
    reviewBasisCode: "official_faq_terrain_height_setup_supplement",
    ruleAtomCandidate: true,
    ruleAtomEligible: false,
  }),
});

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

function exactJson(left, right) {
  return isDeepStrictEqual(left, right);
}

function verifyFrozenV2(faqReceipt, exactReconciliationV2) {
  verifyOfficialGameplayFaqReceipt(faqReceipt);
  if (!object(exactReconciliationV2) || exactReconciliationV2.schema !== EXPECTED_V2_SCHEMA) {
    fail("official_faq_supplemental_exact_v2_invalid");
  }
  if (hashStarcraftTmgContract(without(exactReconciliationV2, ["reconciliationHash"]))
    !== exactReconciliationV2.reconciliationHash) {
    fail("official_faq_supplemental_exact_v2_hash_mismatch");
  }
  if (exactReconciliationV2.reconciliationHash !== EXPECTED_V2_HASH
    || exactReconciliationV2.faqReceiptHash !== faqReceipt.receiptHash
    || exactReconciliationV2.unmatchedSupplementalClaimCount !== 3) {
    fail("official_faq_supplemental_exact_v2_dependency_mismatch");
  }
  const claims = [];
  for (const entry of exactReconciliationV2.entries || []) {
    for (const sourceClaimCode of entry.unmatchedSupplementalClaimCodes || []) {
      claims.push({ sourceEntryId: entry.entryId, sourceClaimCode });
    }
  }
  claims.sort((left, right) => left.sourceClaimCode.localeCompare(right.sourceClaimCode));
  const expectedCodes = Object.keys(EXPECTED_CLAIMS).sort((left, right) => left.localeCompare(right));
  if (!exactJson(claims.map((claim) => claim.sourceClaimCode), expectedCodes)) {
    fail("official_faq_supplemental_exact_v2_claim_denominator_mismatch");
  }
  for (const claim of claims) {
    if (EXPECTED_CLAIMS[claim.sourceClaimCode].sourceEntryId !== claim.sourceEntryId) {
      fail("official_faq_supplemental_exact_v2_claim_entry_mismatch", claim.sourceClaimCode);
    }
  }
  return claims;
}

function normalizeSemanticValue(value, code) {
  if (!object(value)) fail(code);
  return structuredClone(value);
}

function normalizeBinding(input, sourceClaims) {
  const { faqReceipt, exactReconciliationV2, reviewedBinding } = input;
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("official_faq_supplemental_binding_invalid");
  }
  if (reviewedBinding.faqReceiptHash !== faqReceipt.receiptHash
    || reviewedBinding.exactReconciliationV2Hash !== exactReconciliationV2.reconciliationHash) {
    fail("official_faq_supplemental_binding_dependency_mismatch");
  }
  if (reviewedBinding.supersedesTreatment !== "v2_unmatched_claims_classified"
    || reviewedBinding.sourceAuthority !== "official_mutable_faq_supplement") {
    fail("official_faq_supplemental_binding_policy_invalid");
  }
  if (!Array.isArray(reviewedBinding.supplementalClauses)) {
    fail("official_faq_supplemental_clauses_required");
  }
  const sourceClaimByCode = new Map(sourceClaims.map((claim) => [claim.sourceClaimCode, claim]));
  const seenClaims = new Set();
  const seenClauseIds = new Set();
  const clauses = [];
  for (const raw of reviewedBinding.supplementalClauses) {
    if (!object(raw)) fail("official_faq_supplemental_clause_invalid");
    const sourceClaimCode = text(
      raw.sourceClaimCode,
      "official_faq_supplemental_source_claim_required",
    );
    if (!sourceClaimByCode.has(sourceClaimCode)) {
      fail("official_faq_supplemental_unknown_source_claim", sourceClaimCode);
    }
    if (seenClaims.has(sourceClaimCode)) {
      fail("official_faq_supplemental_duplicate_source_claim", sourceClaimCode);
    }
    seenClaims.add(sourceClaimCode);
    const clauseId = text(raw.clauseId, "official_faq_supplemental_clause_id_required");
    if (seenClauseIds.has(clauseId)) fail("official_faq_supplemental_duplicate_clause", clauseId);
    seenClauseIds.add(clauseId);
    const disposition = text(raw.disposition, "official_faq_supplemental_disposition_required");
    if (!DISPOSITIONS.includes(disposition)) {
      fail("official_faq_supplemental_disposition_invalid", disposition);
    }
    const semanticKind = text(raw.semanticKind, "official_faq_supplemental_semantic_kind_required");
    if (!SEMANTIC_KINDS.includes(semanticKind)) {
      fail("official_faq_supplemental_semantic_kind_invalid", semanticKind);
    }
    if (disposition === "display_only" && raw.ruleAtomCandidate !== false) {
      fail("official_faq_supplemental_display_rule_candidate_forbidden", clauseId);
    }
    if (raw.ruleAtomEligible !== false) {
      fail("official_faq_supplemental_premature_rule_atom_eligibility", clauseId);
    }
    const normalized = {
      clauseId,
      sourceEntryId: text(raw.sourceEntryId, "official_faq_supplemental_entry_required"),
      sourceAnswerHash: hash(raw.sourceAnswerHash, "official_faq_supplemental_answer_hash_required"),
      sourceClaimCode,
      semanticKind,
      semanticValue: normalizeSemanticValue(
        raw.semanticValue,
        "official_faq_supplemental_semantic_value_required",
      ),
      disposition,
      reviewBasisCode: text(raw.reviewBasisCode, "official_faq_supplemental_review_basis_required"),
      ruleAtomCandidate: raw.ruleAtomCandidate === true,
      ruleAtomEligible: false,
    };
    const expected = EXPECTED_CLAIMS[sourceClaimCode];
    if (!exactJson(normalized, { sourceClaimCode, ...expected })) {
      fail("official_faq_supplemental_reviewed_clause_mismatch", sourceClaimCode);
    }
    const faqEntry = faqReceipt.entryIndex.find((entry) => entry.entryId === normalized.sourceEntryId);
    if (!faqEntry || faqEntry.answerHash !== normalized.sourceAnswerHash) {
      fail("official_faq_supplemental_source_answer_mismatch", sourceClaimCode);
    }
    clauses.push(normalized);
  }
  if (seenClaims.size !== sourceClaimByCode.size) {
    fail("official_faq_supplemental_source_claim_coverage_incomplete");
  }
  clauses.sort((left, right) => left.sourceClaimCode.localeCompare(right.sourceClaimCode));
  const binding = {
    schema: BINDING_SCHEMA,
    faqReceiptHash: reviewedBinding.faqReceiptHash,
    exactReconciliationV2Hash: reviewedBinding.exactReconciliationV2Hash,
    supersedesTreatment: reviewedBinding.supersedesTreatment,
    sourceAuthority: reviewedBinding.sourceAuthority,
    supplementalClauses: clauses,
  };
  return { binding, clauses };
}

function reconciliationBody(reconciliation) {
  return without(reconciliation, ["reconciliationHash"]);
}

export function createOfficialFaqSupplementalClauseReconciliationV3(input = {}) {
  const sourceClaims = verifyFrozenV2(input.faqReceipt, input.exactReconciliationV2);
  const normalized = normalizeBinding(input, sourceClaims);
  const supplementalClauses = normalized.clauses.map((clause) => ({
    ...clause,
    sourceAuthority: "official_mutable_faq_supplement",
    sourceFaqReceiptHash: input.faqReceipt.receiptHash,
    sourceExactReconciliationV2Hash: input.exactReconciliationV2.reconciliationHash,
    executable: false,
    trainingTruth: false,
  }));
  const faqNormativeClauseCount = supplementalClauses
    .filter((clause) => clause.disposition === "review_required").length;
  const faqDisplayOnlyClauseCount = supplementalClauses
    .filter((clause) => clause.disposition === "display_only").length;
  const body = {
    schema: RECONCILIATION_SCHEMA,
    faqReceiptHash: input.faqReceipt.receiptHash,
    faqSemanticContentHash: input.faqReceipt.semanticContentHash,
    exactReconciliationV2Hash: input.exactReconciliationV2.reconciliationHash,
    reviewedBindingHash: hashStarcraftTmgContract(normalized.binding),
    supersedesTreatment: "v2_unmatched_claims_classified",
    sourceAuthority: "official_mutable_faq_supplement",
    supplementalClauses,
    sourceSupplementalClaimCount: sourceClaims.length,
    unresolvedSupplementalClaimCount: 0,
    faqLocalClauseCount: supplementalClauses.length,
    faqNormativeClauseCount,
    faqDisplayOnlyClauseCount,
    globalCanonicalClauseCount: null,
    reconciliationStatus: "supplemental_claims_classified_global_canonical_merge_pending",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "faq_source_declares_no_semantic_errata_version",
      "global_canonical_clause_merge_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, reconciliationHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFaqSupplementalClauseReconciliationV3(input = {}) {
  const sourceClaims = verifyFrozenV2(input.faqReceipt, input.exactReconciliationV2);
  if (!object(input.reconciliation) || input.reconciliation.schema !== RECONCILIATION_SCHEMA) {
    fail("official_faq_supplemental_reconciliation_schema_invalid");
  }
  if (hashStarcraftTmgContract(reconciliationBody(input.reconciliation))
    !== input.reconciliation.reconciliationHash) {
    fail("official_faq_supplemental_reconciliation_hash_mismatch");
  }
  const expected = createOfficialFaqSupplementalClauseReconciliationV3(input);
  if (expected.reconciliationHash !== input.reconciliation.reconciliationHash
    || !exactJson(expected, input.reconciliation)) {
    fail("official_faq_supplemental_reconciliation_content_mismatch");
  }
  const sourceClaimCounts = new Map();
  let reviewRequired = 0;
  let displayOnly = 0;
  let unclassified = 0;
  for (const clause of input.reconciliation.supplementalClauses) {
    sourceClaimCounts.set(
      clause.sourceClaimCode,
      (sourceClaimCounts.get(clause.sourceClaimCode) || 0) + 1,
    );
    if (clause.disposition === "review_required") reviewRequired += 1;
    else if (clause.disposition === "display_only") displayOnly += 1;
    else unclassified += 1;
    if (clause.executable !== false || clause.ruleAtomEligible !== false
      || clause.trainingTruth !== false) {
      fail("official_faq_supplemental_premature_clause_authority", clause.clauseId);
    }
  }
  const duplicateSourceClaims = [...sourceClaimCounts.values()].filter((count) => count !== 1).length;
  const unresolvedSourceClaims = sourceClaims
    .filter((claim) => !sourceClaimCounts.has(claim.sourceClaimCode)).length;
  const counts = {
    sourceClaims: sourceClaims.length,
    supplementalClauses: input.reconciliation.supplementalClauses.length,
    reviewRequired,
    displayOnly,
    unclassified,
    unresolvedSourceClaims,
    duplicateSourceClaims,
  };
  if (unclassified > 0 || unresolvedSourceClaims > 0 || duplicateSourceClaims > 0
    || input.reconciliation.sourceSupplementalClaimCount !== sourceClaims.length
    || input.reconciliation.unresolvedSupplementalClaimCount !== 0
    || input.reconciliation.faqLocalClauseCount !== counts.supplementalClauses
    || input.reconciliation.faqNormativeClauseCount !== reviewRequired
    || input.reconciliation.faqDisplayOnlyClauseCount !== displayOnly
    || input.reconciliation.globalCanonicalClauseCount !== null
    || input.reconciliation.rulesEligible !== false
    || input.reconciliation.canAffectRules !== false
    || input.reconciliation.ctx2skillPromotionEligible !== false
    || input.reconciliation.trainingTruth !== false) {
    fail("official_faq_supplemental_reconciliation_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_official_faq_supplemental_clause_audit_v3",
    reconciliationHash: input.reconciliation.reconciliationHash,
    counts,
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
