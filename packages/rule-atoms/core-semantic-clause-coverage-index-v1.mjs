import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyPartSemanticClauseLedger } from "./part-semantic-clause-ledger-v1.mjs";

const INDEX_SCHEMA = "starcraft_tmg_core_semantic_clause_coverage_index_v1";
const DENOMINATOR_SCHEMA = "starcraft_tmg_core_clause_candidate_denominator_v1";
const EXPECTED_SOURCE_PARTS = Object.freeze([
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
    fail("core_semantic_denominator_invalid");
  }
  if (hashStarcraftTmgContract(without(denominator, ["denominatorHash"])) !== denominator.denominatorHash) {
    fail("core_semantic_denominator_hash_mismatch");
  }
  if (!Array.isArray(denominator.anchorRegions)
    || !Array.isArray(denominator.clauseCandidates)
    || denominator.canonicalClauseCount !== null
    || denominator.rulesEligible !== false) {
    fail("core_semantic_denominator_contract_invalid");
  }
}

function partNumber(sourcePart) {
  return Number.parseInt(sourcePart, 10);
}

function sortedParts(parts) {
  return [...parts].sort((left, right) => partNumber(left) - partNumber(right));
}

function emptyDispositions() {
  return {
    executable: 0,
    display_only: 0,
    review_required: 0,
    quarantined: 0,
  };
}

function indexBody(index) {
  return without(index, ["coverageIndexHash"]);
}

export function createCoreSemanticClauseCoverageIndex(input = {}) {
  const { denominator, ledgers } = input;
  assertDenominator(denominator);
  if (!Array.isArray(ledgers) || ledgers.length === 0) {
    fail("core_semantic_part_ledgers_required");
  }
  const partAudits = new Map();
  const ledgerByPart = new Map();
  for (const ledger of ledgers) {
    const audit = verifyPartSemanticClauseLedger({ denominator, ledger });
    if (!EXPECTED_SOURCE_PARTS.includes(ledger.sourcePart)) {
      fail("core_semantic_part_ledger_out_of_scope", String(ledger.sourcePart || ""));
    }
    if (ledgerByPart.has(ledger.sourcePart)) {
      fail("core_semantic_duplicate_part_ledger", ledger.sourcePart);
    }
    ledgerByPart.set(ledger.sourcePart, ledger);
    partAudits.set(ledger.sourcePart, audit);
  }
  const coveredSourceParts = sortedParts(ledgerByPart.keys());
  const uncoveredSourceParts = EXPECTED_SOURCE_PARTS
    .filter((sourcePart) => !ledgerByPart.has(sourcePart));
  const allCandidateIds = new Set(denominator.clauseCandidates
    .map((candidate) => candidate.clauseCandidateId));
  const classifiedCandidateIds = coveredSourceParts.flatMap((sourcePart) => (
    ledgerByPart.get(sourcePart).canonicalClauses.flatMap((clause) => clause.candidateIds)
  ));
  const duplicateCandidateAssignments = classifiedCandidateIds.length
    - new Set(classifiedCandidateIds).size;
  const outOfDenominatorAssignments = classifiedCandidateIds
    .filter((candidateId) => !allCandidateIds.has(candidateId)).length;
  if (duplicateCandidateAssignments || outOfDenominatorAssignments) {
    fail("core_semantic_candidate_assignment_invalid");
  }
  const allClauseIds = coveredSourceParts.flatMap((sourcePart) => (
    ledgerByPart.get(sourcePart).canonicalClauses.map((clause) => clause.clauseId)
  ));
  if (new Set(allClauseIds).size !== allClauseIds.length) {
    fail("core_semantic_duplicate_clause_id");
  }
  const byDisposition = emptyDispositions();
  const partLedgers = coveredSourceParts.map((sourcePart) => {
    const ledger = ledgerByPart.get(sourcePart);
    const audit = partAudits.get(sourcePart);
    for (const [disposition, count] of Object.entries(audit.counts.byDisposition)) {
      byDisposition[disposition] += count;
    }
    return {
      sourcePart,
      ledgerHash: ledger.ledgerHash,
      reviewPacketHash: ledger.reviewPacketHash,
      sourceAnchorCount: audit.counts.sourceAnchors,
      sourceCandidateCount: audit.counts.sourceCandidates,
      canonicalClauseCount: audit.counts.canonicalClauses,
      structuralContainerCount: audit.counts.structuralContainers,
      byDisposition: { ...audit.counts.byDisposition },
    };
  });
  const coveredSourceAnchors = partLedgers
    .reduce((total, entry) => total + entry.sourceAnchorCount, 0);
  const coveredStructuralContainers = partLedgers
    .reduce((total, entry) => total + entry.structuralContainerCount, 0);
  const reviewedPartCanonicalClauses = partLedgers
    .reduce((total, entry) => total + entry.canonicalClauseCount, 0);
  const body = {
    schema: INDEX_SCHEMA,
    sourceSnapshotId: denominator.sourceSnapshot.sourceSnapshotId,
    sourceContentHash: denominator.sourceSnapshot.contentHash,
    anchorIndexHash: denominator.anchorIndexHash,
    coreClauseCandidateDenominatorHash: denominator.denominatorHash,
    coveredSourceParts,
    uncoveredSourceParts,
    partLedgers,
    counts: {
      totalSourceAnchors: denominator.anchorRegions.length,
      coveredSourceAnchors,
      remainingSourceAnchors: denominator.anchorRegions.length - coveredSourceAnchors,
      coveredStructuralContainers,
      totalSourceCandidates: denominator.clauseCandidates.length,
      classifiedSourceCandidates: classifiedCandidateIds.length,
      remainingSourceCandidates: denominator.clauseCandidates.length - classifiedCandidateIds.length,
      duplicateCandidateAssignments,
      outOfDenominatorAssignments,
      reviewedPartCanonicalClauses,
      byDisposition,
    },
    globalCanonicalClauseCount: null,
    coverageStatus: uncoveredSourceParts.length > 0
      ? "partial_part_semantic_review"
      : "all_part_boundaries_reviewed_global_merge_pending",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      ...(uncoveredSourceParts.length > 0 ? ["uncovered_core_source_parts"] : []),
      "faq_exact_candidate_clause_reconciliation_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, coverageIndexHash: hashStarcraftTmgContract(body) });
}

export function verifyCoreSemanticClauseCoverageIndex(input = {}) {
  const { denominator, index } = input;
  assertDenominator(denominator);
  if (!object(index) || index.schema !== INDEX_SCHEMA) {
    fail("core_semantic_coverage_index_schema_invalid");
  }
  if (hashStarcraftTmgContract(indexBody(index)) !== index.coverageIndexHash) {
    fail("core_semantic_coverage_index_hash_mismatch");
  }
  if (index.coreClauseCandidateDenominatorHash !== denominator.denominatorHash
    || index.anchorIndexHash !== denominator.anchorIndexHash
    || index.sourceSnapshotId !== denominator.sourceSnapshot.sourceSnapshotId
    || index.sourceContentHash !== denominator.sourceSnapshot.contentHash) {
    fail("core_semantic_coverage_index_dependency_mismatch");
  }
  if (!Array.isArray(index.coveredSourceParts)
    || !Array.isArray(index.uncoveredSourceParts)
    || !Array.isArray(index.partLedgers)
    || !object(index.counts)) {
    fail("core_semantic_coverage_index_collections_invalid");
  }
  if (JSON.stringify(index.coveredSourceParts) !== JSON.stringify(sortedParts(index.coveredSourceParts))
    || new Set(index.coveredSourceParts).size !== index.coveredSourceParts.length) {
    fail("core_semantic_covered_part_order_invalid");
  }
  const expectedUncovered = EXPECTED_SOURCE_PARTS
    .filter((sourcePart) => !index.coveredSourceParts.includes(sourcePart));
  if (JSON.stringify(index.uncoveredSourceParts) !== JSON.stringify(expectedUncovered)) {
    fail("core_semantic_uncovered_part_denominator_mismatch");
  }
  if (index.partLedgers.length !== index.coveredSourceParts.length) {
    fail("core_semantic_part_ledger_summary_count_mismatch");
  }
  const byDisposition = emptyDispositions();
  let coveredSourceAnchors = 0;
  let classifiedSourceCandidates = 0;
  let reviewedPartCanonicalClauses = 0;
  let coveredStructuralContainers = 0;
  for (let indexOrdinal = 0; indexOrdinal < index.partLedgers.length; indexOrdinal += 1) {
    const summary = index.partLedgers[indexOrdinal];
    const sourcePart = index.coveredSourceParts[indexOrdinal];
    if (!object(summary)
      || summary.sourcePart !== sourcePart
      || !HASH_PATTERN.test(String(summary.ledgerHash || ""))
      || !HASH_PATTERN.test(String(summary.reviewPacketHash || ""))) {
      fail("core_semantic_part_ledger_summary_invalid", sourcePart);
    }
    const regions = denominator.anchorRegions.filter((region) => region.sourcePart === sourcePart);
    const candidateCount = regions.reduce((total, region) => total + region.candidateClauseCount, 0);
    const structuralContainerCount = regions
      .filter((region) => region.regionStatus === "structural_container_only").length;
    if (summary.sourceAnchorCount !== regions.length
      || summary.sourceCandidateCount !== candidateCount
      || summary.structuralContainerCount !== structuralContainerCount) {
      fail("core_semantic_part_ledger_source_count_mismatch", sourcePart);
    }
    if (!object(summary.byDisposition)
      || Object.values(summary.byDisposition).some((count) => !Number.isInteger(count) || count < 0)
      || Object.values(summary.byDisposition).reduce((total, count) => total + count, 0)
        !== summary.canonicalClauseCount) {
      fail("core_semantic_part_ledger_disposition_count_invalid", sourcePart);
    }
    for (const disposition of Object.keys(byDisposition)) {
      byDisposition[disposition] += Number(summary.byDisposition[disposition] || 0);
    }
    coveredSourceAnchors += summary.sourceAnchorCount;
    classifiedSourceCandidates += summary.sourceCandidateCount;
    reviewedPartCanonicalClauses += summary.canonicalClauseCount;
    coveredStructuralContainers += summary.structuralContainerCount;
  }
  const expectedCounts = {
    totalSourceAnchors: denominator.anchorRegions.length,
    coveredSourceAnchors,
    remainingSourceAnchors: denominator.anchorRegions.length - coveredSourceAnchors,
    coveredStructuralContainers,
    totalSourceCandidates: denominator.clauseCandidates.length,
    classifiedSourceCandidates,
    remainingSourceCandidates: denominator.clauseCandidates.length - classifiedSourceCandidates,
    duplicateCandidateAssignments: 0,
    outOfDenominatorAssignments: 0,
    reviewedPartCanonicalClauses,
    byDisposition,
  };
  if (JSON.stringify(index.counts) !== JSON.stringify(expectedCounts)) {
    fail("core_semantic_coverage_index_count_mismatch");
  }
  const expectedStatus = expectedUncovered.length > 0
    ? "partial_part_semantic_review"
    : "all_part_boundaries_reviewed_global_merge_pending";
  if (index.coverageStatus !== expectedStatus
    || index.globalCanonicalClauseCount !== null
    || index.rulesEligible !== false
    || index.canAffectRules !== false
    || index.ctx2skillPromotionEligible !== false
    || index.trainingTruth !== false) {
    fail("core_semantic_coverage_index_global_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_core_semantic_clause_coverage_index_audit_v1",
    coverageIndexHash: index.coverageIndexHash,
    coveredSourceParts: [...index.coveredSourceParts],
    uncoveredSourceParts: [...index.uncoveredSourceParts],
    counts: { ...expectedCounts, byDisposition: { ...byDisposition } },
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
