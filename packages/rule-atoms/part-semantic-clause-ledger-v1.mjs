import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const LEDGER_SCHEMA = "starcraft_tmg_part_semantic_clause_ledger_v1";
const BINDING_SCHEMA = "starcraft_tmg_part_semantic_clause_review_binding_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const NON_EXECUTABLE_DISPOSITIONS = Object.freeze([
  "display_only",
  "review_required",
  "quarantined",
]);
const SEMANTIC_CLASSES = Object.freeze([
  "classification",
  "constraint",
  "cross_reference",
  "definition",
  "example",
  "permission",
  "priority",
  "rationale",
  "rule_summary",
  "terminology_note",
  "timing",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function requiredHash(value, code) {
  const normalized = requiredText(value, code).toLowerCase();
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

function assertDenominator(denominator) {
  if (!object(denominator) || denominator.schema !== DENOMINATOR_SCHEMA) {
    fail("part_semantic_denominator_invalid");
  }
  if (hashStarcraftTmgContract(without(denominator, ["denominatorHash"])) !== denominator.denominatorHash) {
    fail("part_semantic_denominator_hash_mismatch");
  }
  if (!Array.isArray(denominator.anchorRegions)
    || !Array.isArray(denominator.clauseCandidates)
    || denominator.canonicalClauseCount !== null
    || denominator.rulesEligible !== false) {
    fail("part_semantic_denominator_premature_or_incomplete_contract");
  }
}

function ledgerBody(ledger) {
  return without(ledger, ["ledgerHash"]);
}

function normalizeReviewedBinding(reviewedBinding, denominator) {
  if (!object(reviewedBinding) || reviewedBinding.schema !== BINDING_SCHEMA) {
    fail("part_semantic_reviewed_binding_invalid");
  }
  const sourcePart = requiredText(reviewedBinding.sourcePart, "part_semantic_source_part_required");
  if (reviewedBinding.coreClauseCandidateDenominatorHash !== denominator.denominatorHash) {
    fail("part_semantic_binding_dependency_mismatch");
  }
  const reviewPacketHash = requiredHash(
    reviewedBinding.reviewPacketHash,
    "part_semantic_review_packet_hash_invalid",
  );
  const reviewMethod = requiredText(reviewedBinding.reviewMethod, "part_semantic_review_method_required");
  const reviewAuthority = requiredText(reviewedBinding.reviewAuthority, "part_semantic_review_authority_required");
  if (reviewAuthority !== "development_evidence_only") {
    fail("part_semantic_review_authority_invalid");
  }
  if (!Array.isArray(reviewedBinding.clauses) || reviewedBinding.clauses.length === 0) {
    fail("part_semantic_reviewed_clauses_required");
  }
  const clauses = reviewedBinding.clauses.map((raw) => {
    if (!object(raw)) fail("part_semantic_reviewed_clause_invalid");
    if (Object.hasOwn(raw, "text") || Object.hasOwn(raw, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    const disposition = requiredText(raw.disposition, "part_semantic_disposition_required");
    if (!NON_EXECUTABLE_DISPOSITIONS.includes(disposition)) {
      fail("part_semantic_executable_disposition_forbidden", disposition);
    }
    const semanticClass = requiredText(raw.semanticClass, "part_semantic_class_required");
    if (!SEMANTIC_CLASSES.includes(semanticClass)) {
      fail("part_semantic_class_invalid", semanticClass);
    }
    const candidateOrdinalStart = Number(raw.candidateOrdinalStart);
    const candidateOrdinalEnd = Number(raw.candidateOrdinalEnd);
    if (!Number.isInteger(candidateOrdinalStart)
      || !Number.isInteger(candidateOrdinalEnd)
      || candidateOrdinalStart < 1
      || candidateOrdinalEnd < candidateOrdinalStart) {
      fail("part_semantic_candidate_range_invalid", String(raw.clauseId || ""));
    }
    return {
      clauseId: requiredText(raw.clauseId, "part_semantic_clause_id_required"),
      anchorId: requiredText(raw.anchorId, "part_semantic_anchor_id_required"),
      candidateOrdinalStart,
      candidateOrdinalEnd,
      semanticClass,
      title: requiredText(raw.title, "part_semantic_clause_title_required"),
      disposition,
      reasonCode: requiredText(raw.reasonCode, "part_semantic_reason_code_required"),
    };
  });
  const clauseIds = clauses.map((clause) => clause.clauseId);
  if (new Set(clauseIds).size !== clauseIds.length) fail("part_semantic_duplicate_clause_id");
  return {
    schema: BINDING_SCHEMA,
    sourcePart,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash,
    reviewMethod,
    reviewAuthority,
    clauses,
  };
}

export function createPartSemanticClauseLedger(input = {}) {
  const { denominator, reviewedBinding } = input;
  assertDenominator(denominator);
  const binding = normalizeReviewedBinding(reviewedBinding, denominator);
  const partRegions = denominator.anchorRegions
    .filter((region) => region.sourcePart === binding.sourcePart);
  if (partRegions.length === 0) fail("part_semantic_source_part_missing", binding.sourcePart);
  const partRegionIds = new Set(partRegions.map((region) => region.anchorId));
  const regionById = new Map(partRegions.map((region) => [region.anchorId, region]));
  const regionOrder = new Map(partRegions.map((region, index) => [region.anchorId, index]));
  const candidateById = new Map(denominator.clauseCandidates
    .map((candidate) => [candidate.clauseCandidateId, candidate]));
  const expectedCandidateIds = partRegions.flatMap((region) => region.candidateClauseIds);
  const orderedBindingClauses = [...binding.clauses].sort((left, right) => (
    regionOrder.get(left.anchorId) - regionOrder.get(right.anchorId)
      || left.candidateOrdinalStart - right.candidateOrdinalStart
      || left.clauseId.localeCompare(right.clauseId)
  ));
  const canonicalClauses = orderedBindingClauses.map((reviewedClause) => {
    if (!partRegionIds.has(reviewedClause.anchorId)) {
      fail("part_semantic_clause_anchor_out_of_part", reviewedClause.anchorId);
    }
    const region = regionById.get(reviewedClause.anchorId);
    if (reviewedClause.candidateOrdinalEnd > region.candidateClauseCount) {
      fail("part_semantic_candidate_range_out_of_bounds", reviewedClause.clauseId);
    }
    const candidateIds = region.candidateClauseIds.slice(
      reviewedClause.candidateOrdinalStart - 1,
      reviewedClause.candidateOrdinalEnd,
    );
    const candidates = candidateIds.map((candidateId) => candidateById.get(candidateId));
    if (candidates.some((candidate) => !candidate)) {
      fail("part_semantic_candidate_missing", reviewedClause.clauseId);
    }
    const candidateOrdinals = candidates.map((candidate) => candidate.locator.anchorClauseOrdinal);
    const sourceTextHashes = candidates.map((candidate) => candidate.sourceTextHash);
    return {
      clauseId: reviewedClause.clauseId,
      sourcePart: binding.sourcePart,
      anchorId: region.anchorId,
      sourceAnchorId: region.sourceAnchorId,
      sourceSnapshotId: candidates[0].sourceSnapshotId,
      sourceContentHash: candidates[0].sourceContentHash,
      authority: "official_primary",
      locator: {
        pdfPage: candidates[0].locator.anchorPdfPage,
        anchorLineOrdinal: candidates[0].locator.anchorLineOrdinal,
        candidateOrdinalStart: reviewedClause.candidateOrdinalStart,
        candidateOrdinalEnd: reviewedClause.candidateOrdinalEnd,
      },
      candidateIds,
      candidateOrdinals,
      sourceTextHashes,
      candidateSequenceHash: hashStarcraftTmgContract({ candidateIds, sourceTextHashes }),
      semanticClass: reviewedClause.semanticClass,
      title: reviewedClause.title,
      disposition: reviewedClause.disposition,
      reasonCode: reviewedClause.reasonCode,
      boundaryStatus: "reviewed_part_semantic_boundary",
      eligibleForRuleAtomMapping: reviewedClause.disposition === "review_required",
      executable: false,
      trainingTruth: false,
    };
  });
  const classifiedCandidateIds = canonicalClauses.flatMap((clause) => clause.candidateIds);
  if (JSON.stringify(classifiedCandidateIds) !== JSON.stringify(expectedCandidateIds)) {
    fail("part_semantic_candidate_coverage_invalid");
  }
  const structuralContainerAnchorIds = partRegions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  const clauseBearingAnchorIds = [...new Set(canonicalClauses.map((clause) => clause.anchorId))];
  const body = {
    schema: LEDGER_SCHEMA,
    sourcePart: binding.sourcePart,
    sourceSnapshotId: denominator.sourceSnapshot.sourceSnapshotId,
    sourceContentHash: denominator.sourceSnapshot.contentHash,
    anchorIndexHash: denominator.anchorIndexHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    reviewPacketHash: binding.reviewPacketHash,
    reviewedBindingHash: hashStarcraftTmgContract(binding),
    reviewMethod: binding.reviewMethod,
    reviewAuthority: binding.reviewAuthority,
    canonicalClauses,
    structuralContainerAnchorIds,
    sourceAnchorCount: partRegions.length,
    clauseBearingAnchorCount: clauseBearingAnchorIds.length,
    sourceCandidateCount: expectedCandidateIds.length,
    partCanonicalClauseCount: canonicalClauses.length,
    globalCanonicalClauseCount: null,
    globalDenominatorStatus: "incomplete_other_parts_pending",
    boundaryStatus: "part_semantic_boundaries_reviewed",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
      "other_core_parts_semantic_review_pending",
      "faq_exact_candidate_clause_reconciliation_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, ledgerHash: hashStarcraftTmgContract(body) });
}

export function verifyPartSemanticClauseLedger(input = {}) {
  const { denominator, ledger } = input;
  assertDenominator(denominator);
  if (!object(ledger) || ledger.schema !== LEDGER_SCHEMA) {
    fail("part_semantic_ledger_schema_invalid");
  }
  if (hashStarcraftTmgContract(ledgerBody(ledger)) !== ledger.ledgerHash) {
    fail("part_semantic_ledger_hash_mismatch");
  }
  if (ledger.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || ledger.anchorIndexHash !== denominator.anchorIndexHash
    || ledger.sourceSnapshotId !== denominator.sourceSnapshot.sourceSnapshotId
    || ledger.sourceContentHash !== denominator.sourceSnapshot.contentHash) {
    fail("part_semantic_ledger_dependency_mismatch");
  }
  if (!Array.isArray(ledger.canonicalClauses)
    || !Array.isArray(ledger.structuralContainerAnchorIds)) {
    fail("part_semantic_ledger_collections_invalid");
  }
  const partRegions = denominator.anchorRegions
    .filter((region) => region.sourcePart === ledger.sourcePart);
  const expectedCandidateIds = partRegions.flatMap((region) => region.candidateClauseIds);
  const expectedCandidateIdSet = new Set(expectedCandidateIds);
  const classifiedCandidateIds = ledger.canonicalClauses.flatMap((clause) => clause.candidateIds || []);
  const classifiedCandidateIdSet = new Set(classifiedCandidateIds);
  const duplicateCandidateAssignments = classifiedCandidateIds.length - classifiedCandidateIdSet.size;
  const unclassifiedCandidates = expectedCandidateIds
    .filter((candidateId) => !classifiedCandidateIdSet.has(candidateId)).length;
  const outOfPartCandidateAssignments = classifiedCandidateIds
    .filter((candidateId) => !expectedCandidateIdSet.has(candidateId)).length;
  const clauseIds = ledger.canonicalClauses.map((clause) => clause.clauseId);
  if (new Set(clauseIds).size !== clauseIds.length) fail("part_semantic_ledger_duplicate_clause_id");
  const byDisposition = {
    executable: 0,
    display_only: 0,
    review_required: 0,
    quarantined: 0,
  };
  for (const clause of ledger.canonicalClauses) {
    if (Object.hasOwn(clause, "text") || Object.hasOwn(clause, "excerpt")) {
      fail("copyrighted_rule_text_embedded");
    }
    if (!Object.hasOwn(byDisposition, clause.disposition)) {
      fail("part_semantic_ledger_disposition_invalid", String(clause.disposition || ""));
    }
    byDisposition[clause.disposition] += 1;
    if (clause.disposition === "executable"
      || clause.executable !== false
      || clause.trainingTruth !== false
      || Object.hasOwn(clause, "legalSpace")
      || Object.hasOwn(clause, "effect")) {
      fail("part_semantic_ledger_premature_authority", clause.clauseId);
    }
  }
  if (duplicateCandidateAssignments || unclassifiedCandidates || outOfPartCandidateAssignments) {
    fail("part_semantic_ledger_candidate_coverage_invalid");
  }
  const expectedStructuralContainers = partRegions
    .filter((region) => region.regionStatus === "structural_container_only")
    .map((region) => region.anchorId);
  if (JSON.stringify(ledger.structuralContainerAnchorIds) !== JSON.stringify(expectedStructuralContainers)) {
    fail("part_semantic_ledger_structural_container_mismatch");
  }
  if (ledger.partCanonicalClauseCount !== ledger.canonicalClauses.length
    || ledger.globalCanonicalClauseCount !== null
    || ledger.rulesEligible !== false
    || ledger.canAffectRules !== false
    || ledger.ctx2skillPromotionEligible !== false
    || ledger.trainingTruth !== false) {
    fail("part_semantic_ledger_global_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_part_semantic_clause_ledger_audit_v1",
    ledgerHash: ledger.ledgerHash,
    counts: {
      sourceAnchors: partRegions.length,
      clauseBearingAnchors: new Set(ledger.canonicalClauses.map((clause) => clause.anchorId)).size,
      structuralContainers: ledger.structuralContainerAnchorIds.length,
      sourceCandidates: expectedCandidateIds.length,
      classifiedCandidates: classifiedCandidateIds.length,
      unclassifiedCandidates,
      duplicateCandidateAssignments,
      outOfPartCandidateAssignments,
      canonicalClauses: ledger.canonicalClauses.length,
      byDisposition,
    },
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
