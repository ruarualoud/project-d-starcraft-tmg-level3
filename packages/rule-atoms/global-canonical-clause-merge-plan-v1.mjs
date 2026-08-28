import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCoreSemanticClauseCoverageIndex } from "./core-semantic-clause-coverage-index-v1.mjs";
import { verifyPartSemanticClauseLedger } from "./part-semantic-clause-ledger-v1.mjs";

const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const EXPECTED_FAQ_SCHEMA = "starcraft_tmg_official_faq_supplemental_clause_reconciliation_v3";
const EXPECTED_FAQ_HASH = "6d1e52f52c47f002cc0dfcb0701041ebbbae7044c7c6aeb096a81073ba5d3b40";
const DISPOSITIONS = Object.freeze([
  "executable",
  "display_only",
  "review_required",
  "quarantined",
]);

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

function normalizeReviewTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function emptyDispositionCounts() {
  return {
    executable: 0,
    display_only: 0,
    review_required: 0,
    quarantined: 0,
  };
}

function countDispositions(rows) {
  const counts = emptyDispositionCounts();
  for (const row of rows) {
    if (!DISPOSITIONS.includes(row.disposition)) {
      fail("global_canonical_merge_disposition_invalid", row.disposition);
    }
    counts[row.disposition] += 1;
  }
  return counts;
}

function verifyFaqSupplemental(faqSupplemental) {
  if (!object(faqSupplemental) || faqSupplemental.schema !== EXPECTED_FAQ_SCHEMA) {
    fail("global_canonical_merge_faq_invalid");
  }
  if (hashStarcraftTmgContract(without(faqSupplemental, ["reconciliationHash"]))
    !== faqSupplemental.reconciliationHash) {
    fail("global_canonical_merge_faq_hash_mismatch");
  }
  if (faqSupplemental.reconciliationHash !== EXPECTED_FAQ_HASH
    || faqSupplemental.unresolvedSupplementalClaimCount !== 0
    || faqSupplemental.faqLocalClauseCount !== 3
    || faqSupplemental.globalCanonicalClauseCount !== null
    || faqSupplemental.rulesEligible !== false
    || faqSupplemental.trainingTruth !== false) {
    fail("global_canonical_merge_faq_dependency_mismatch");
  }
  if (!Array.isArray(faqSupplemental.supplementalClauses)
    || faqSupplemental.supplementalClauses.length !== faqSupplemental.faqLocalClauseCount) {
    fail("global_canonical_merge_faq_clause_denominator_invalid");
  }
}

function verifyCoreCorpus(denominator, coverageIndex, partLedgers) {
  const coverageAudit = verifyCoreSemanticClauseCoverageIndex({ denominator, index: coverageIndex });
  if (coverageIndex.uncoveredSourceParts.length > 0
    || coverageAudit.counts.remainingSourceCandidates !== 0
    || coverageIndex.coverageStatus !== "all_part_boundaries_reviewed_global_merge_pending"
    || coverageAudit.counts.reviewedPartCanonicalClauses !== 1090) {
    fail("global_canonical_merge_core_coverage_incomplete");
  }
  if (!Array.isArray(partLedgers)) fail("global_canonical_merge_part_ledgers_required");
  const expectedByPart = new Map(coverageIndex.partLedgers.map((summary) => [summary.sourcePart, summary]));
  const ledgerByPart = new Map();
  for (const ledger of partLedgers) {
    const audit = verifyPartSemanticClauseLedger({ denominator, ledger });
    if (ledgerByPart.has(ledger.sourcePart)) {
      fail("global_canonical_merge_duplicate_part_ledger", ledger.sourcePart);
    }
    const expected = expectedByPart.get(ledger.sourcePart);
    if (!expected
      || expected.ledgerHash !== ledger.ledgerHash
      || expected.sourceCandidateCount !== audit.counts.sourceCandidates
      || expected.canonicalClauseCount !== audit.counts.canonicalClauses) {
      fail("global_canonical_merge_part_ledger_mismatch", ledger.sourcePart);
    }
    ledgerByPart.set(ledger.sourcePart, ledger);
  }
  const actualParts = [...ledgerByPart.keys()].sort((left, right) => Number(left) - Number(right));
  if (!isDeepStrictEqual(actualParts, coverageIndex.coveredSourceParts)) {
    fail("global_canonical_merge_part_ledger_set_mismatch");
  }
  return actualParts.map((sourcePart) => ledgerByPart.get(sourcePart));
}

function coreLocalRow(clause, ledgerHash) {
  const normalizedTitle = normalizeReviewTitle(clause.title);
  if (!normalizedTitle) fail("global_canonical_merge_core_review_title_missing", clause.clauseId);
  const sourceTextHashes = [...clause.sourceTextHashes].sort((left, right) => left.localeCompare(right));
  if (sourceTextHashes.length === 0) {
    fail("global_canonical_merge_core_source_identity_missing", clause.clauseId);
  }
  return {
    localClauseId: clause.clauseId,
    sourceKind: "core_pdf",
    sourceScope: `part-${clause.sourcePart}`,
    sourcePart: clause.sourcePart,
    sourceAnchorId: clause.anchorId,
    sourceLedgerHash: ledgerHash,
    sourceIdentitySetHash: hashStarcraftTmgContract({ sourceTextHashes }),
    semanticTitleHash: hashStarcraftTmgContract({ normalizedTitle }),
    semanticClass: clause.semanticClass,
    disposition: clause.disposition,
    eligibleForRuleAtomMapping: clause.eligibleForRuleAtomMapping,
    executable: false,
    trainingTruth: false,
  };
}

function faqLocalRow(clause, faqSupplemental) {
  return {
    localClauseId: clause.clauseId,
    sourceKind: "official_faq_supplement",
    sourceScope: clause.sourceEntryId,
    sourcePart: null,
    sourceAnchorId: clause.sourceEntryId,
    sourceLedgerHash: faqSupplemental.reconciliationHash,
    sourceIdentitySetHash: hashStarcraftTmgContract({
      sourceAnswerHash: clause.sourceAnswerHash,
      sourceClaimCode: clause.sourceClaimCode,
    }),
    semanticTitleHash: hashStarcraftTmgContract({
      semanticKind: clause.semanticKind,
      semanticValue: clause.semanticValue,
    }),
    semanticClass: clause.semanticKind,
    disposition: clause.disposition,
    eligibleForRuleAtomMapping: clause.ruleAtomCandidate,
    executable: false,
    trainingTruth: false,
  };
}

function groupDuplicates(coreRows, key, evidenceKind) {
  const rowsByEvidence = new Map();
  for (const row of coreRows) {
    const evidenceHash = row[key];
    if (!rowsByEvidence.has(evidenceHash)) rowsByEvidence.set(evidenceHash, []);
    rowsByEvidence.get(evidenceHash).push(row);
  }
  return [...rowsByEvidence.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([evidenceHash, rows]) => ({
      groupId: `merge-candidate:${evidenceKind}:${evidenceHash.slice(0, 16)}`,
      evidenceKind,
      evidenceHash,
      localClauseIds: rows.map((row) => row.localClauseId)
        .sort((left, right) => left.localeCompare(right)),
      dispositions: [...new Set(rows.map((row) => row.disposition))]
        .sort((left, right) => left.localeCompare(right)),
      autoMergeAllowed: false,
      requiresHumanSemanticReview: true,
    }))
    .sort((left, right) => left.groupId.localeCompare(right.groupId));
}

function batchRecord(batchId, batchKind, rows, extra = {}) {
  return {
    batchId,
    batchKind,
    ...extra,
    localClauseIds: rows.map((row) => row.localClauseId),
    localClauseCount: rows.length,
    byDisposition: countDispositions(rows),
  };
}

function buildReviewBatches(sortedLedgers, coreRows, faqRows, potentialClauseIds, targetBatchSize) {
  const rowById = new Map([...coreRows, ...faqRows].map((row) => [row.localClauseId, row]));
  const batches = [];
  let ordinal = 1;
  const nextId = (suffix) => `global-review-${String(ordinal++).padStart(3, "0")}-${suffix}`;
  const potentialRows = [...potentialClauseIds]
    .sort((left, right) => left.localeCompare(right))
    .map((clauseId) => rowById.get(clauseId));
  batches.push(batchRecord(
    nextId("potential-merges"),
    "potential_merge_groups",
    potentialRows,
    { sourceScopes: [...new Set(potentialRows.map((row) => row.sourceScope))].sort() },
  ));

  for (const ledger of sortedLedgers) {
    const anchorGroups = [];
    const anchorGroupById = new Map();
    for (const clause of ledger.canonicalClauses) {
      if (potentialClauseIds.has(clause.clauseId)) continue;
      if (!anchorGroupById.has(clause.anchorId)) {
        const group = { anchorId: clause.anchorId, rows: [] };
        anchorGroupById.set(clause.anchorId, group);
        anchorGroups.push(group);
      }
      anchorGroupById.get(clause.anchorId).rows.push(rowById.get(clause.clauseId));
    }
    let chunk = [];
    let anchorIds = [];
    let partBatchOrdinal = 1;
    const flush = () => {
      if (chunk.length === 0) return;
      batches.push(batchRecord(
        nextId(`part-${ledger.sourcePart}-${String(partBatchOrdinal++).padStart(2, "0")}`),
        "core_source_part",
        chunk,
        { sourceScopes: [`part-${ledger.sourcePart}`], sourceAnchorIds: anchorIds },
      ));
      chunk = [];
      anchorIds = [];
    };
    for (const group of anchorGroups) {
      if (chunk.length > 0 && chunk.length + group.rows.length > targetBatchSize) flush();
      chunk.push(...group.rows);
      anchorIds.push(group.anchorId);
    }
    flush();
  }
  batches.push(batchRecord(
    nextId("faq-supplement"),
    "faq_supplement",
    [...faqRows].sort((left, right) => left.localClauseId.localeCompare(right.localClauseId)),
    { sourceScopes: [...new Set(faqRows.map((row) => row.sourceScope))].sort() },
  ));
  return batches;
}

function planBody(plan) {
  return without(plan, ["planHash"]);
}

export function createGlobalCanonicalClauseMergePlanV1(input = {}) {
  const targetBatchSize = Number(input.targetBatchSize);
  if (!Number.isInteger(targetBatchSize) || targetBatchSize < 1 || targetBatchSize > 512) {
    fail("global_canonical_merge_target_batch_size_invalid");
  }
  const sortedLedgers = verifyCoreCorpus(input.denominator, input.coverageIndex, input.partLedgers);
  verifyFaqSupplemental(input.faqSupplemental);
  const coreRows = sortedLedgers.flatMap((ledger) => (
    ledger.canonicalClauses.map((clause) => coreLocalRow(clause, ledger.ledgerHash))
  ));
  const faqRows = input.faqSupplemental.supplementalClauses
    .map((clause) => faqLocalRow(clause, input.faqSupplemental))
    .sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
  const localClauseIndex = [...coreRows, ...faqRows]
    .sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
  if (new Set(localClauseIndex.map((row) => row.localClauseId)).size !== localClauseIndex.length) {
    fail("global_canonical_merge_duplicate_local_clause_id");
  }
  const potentialMergeGroups = [
    ...groupDuplicates(coreRows, "sourceIdentitySetHash", "exact_source_hash_set"),
    ...groupDuplicates(coreRows, "semanticTitleHash", "normalized_review_title"),
  ].sort((left, right) => left.groupId.localeCompare(right.groupId));
  const potentialClauseIds = new Set(potentialMergeGroups.flatMap((group) => group.localClauseIds));
  const reviewBatches = buildReviewBatches(
    sortedLedgers,
    coreRows,
    faqRows,
    potentialClauseIds,
    targetBatchSize,
  );
  const body = {
    schema: PLAN_SCHEMA,
    coreClauseCandidateDenominatorHash: input.denominator.denominatorHash,
    coreSemanticCoverageIndexHash: input.coverageIndex.coverageIndexHash,
    partLedgerHashes: sortedLedgers.map((ledger) => ({
      sourcePart: ledger.sourcePart,
      ledgerHash: ledger.ledgerHash,
    })),
    faqSupplementalReconciliationHash: input.faqSupplemental.reconciliationHash,
    targetBatchSize,
    targetBatchSizeRole: "operational_review_target_not_gameplay_limit",
    localClauseIndex,
    potentialMergeGroups,
    reviewBatches,
    counts: {
      localClauses: localClauseIndex.length,
      coreLocalClauses: coreRows.length,
      faqLocalClauses: faqRows.length,
      byDisposition: countDispositions(localClauseIndex),
      potentialMergeGroups: potentialMergeGroups.length,
      uniquePotentialMergeClauses: potentialClauseIds.size,
      reviewBatches: reviewBatches.length,
    },
    autoMergeAllowed: false,
    globalCanonicalClauseCount: null,
    reviewStatus: "global_canonical_mapping_review_pending",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    blocks: [
      "reviewed_local_to_global_mapping_pending",
      "semantic_duplicate_review_pending",
      "rule_atom_mapping_pending",
      "judge_and_replay_evidence_pending",
    ],
    trainingTruth: false,
  };
  return deepFreeze({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseMergePlanV1(input = {}) {
  if (!object(input.plan) || input.plan.schema !== PLAN_SCHEMA) {
    fail("global_canonical_merge_plan_schema_invalid");
  }
  if (hashStarcraftTmgContract(planBody(input.plan)) !== input.plan.planHash) {
    fail("global_canonical_merge_plan_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseMergePlanV1(input);
  if (expected.planHash !== input.plan.planHash || !isDeepStrictEqual(expected, input.plan)) {
    fail("global_canonical_merge_plan_content_mismatch");
  }
  const clauseIds = input.plan.localClauseIndex.map((row) => row.localClauseId);
  const duplicateLocalClauseIds = clauseIds.length - new Set(clauseIds).size;
  const batchAssignments = input.plan.reviewBatches.flatMap((batch) => batch.localClauseIds);
  const assignmentCounts = new Map();
  for (const clauseId of batchAssignments) {
    assignmentCounts.set(clauseId, (assignmentCounts.get(clauseId) || 0) + 1);
  }
  const duplicateBatchAssignments = [...assignmentCounts.values()].filter((count) => count > 1).length;
  const unassignedLocalClauses = clauseIds.filter((clauseId) => !assignmentCounts.has(clauseId)).length;
  const potentialMergeClauseRefs = input.plan.potentialMergeGroups
    .reduce((total, group) => total + group.localClauseIds.length, 0);
  const uniquePotentialMergeClauses = new Set(input.plan.potentialMergeGroups
    .flatMap((group) => group.localClauseIds)).size;
  const groupsByEvidenceKind = Object.fromEntries([
    "exact_source_hash_set",
    "normalized_review_title",
  ].map((kind) => [
    kind,
    input.plan.potentialMergeGroups.filter((group) => group.evidenceKind === kind).length,
  ]));
  const counts = {
    localClauses: clauseIds.length,
    coreLocalClauses: input.plan.localClauseIndex.filter((row) => row.sourceKind === "core_pdf").length,
    faqLocalClauses: input.plan.localClauseIndex
      .filter((row) => row.sourceKind === "official_faq_supplement").length,
    duplicateLocalClauseIds,
    byDisposition: countDispositions(input.plan.localClauseIndex),
    potentialMergeGroups: input.plan.potentialMergeGroups.length,
    potentialMergeClauseRefs,
    uniquePotentialMergeClauses,
    groupsByEvidenceKind,
    reviewBatches: input.plan.reviewBatches.length,
    unassignedLocalClauses,
    duplicateBatchAssignments,
  };
  if (duplicateLocalClauseIds > 0 || unassignedLocalClauses > 0
    || duplicateBatchAssignments > 0 || batchAssignments.length !== clauseIds.length
    || input.plan.globalCanonicalClauseCount !== null
    || input.plan.autoMergeAllowed !== false
    || input.plan.rulesEligible !== false
    || input.plan.canAffectRules !== false
    || input.plan.ctx2skillPromotionEligible !== false
    || input.plan.trainingTruth !== false) {
    fail("global_canonical_merge_plan_status_invalid");
  }
  return deepFreeze({
    schema: "starcraft_tmg_global_canonical_clause_merge_plan_audit_v1",
    planHash: input.plan.planHash,
    counts,
    globalCanonicalClauseCount: null,
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
  });
}
